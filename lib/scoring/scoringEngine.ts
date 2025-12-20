import type { Ball, Innings, Match, PlayerMatchStats } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shouldChangeStrike } from "./strikeRotation";
import {
  getIllegalStreak,
  extraRunForIllegalPair,
} from "./illegalDeliveryRule";
import { updateOverProgress } from "./bowlingRules";
import { calculateStats } from "./statsCalculator";
import type { BallLike } from "./scoringCalculator";

export interface RecordBallInput {
  match: Match;
  innings: Innings;
  batsmanId: string;
  nonStrikerId: string;
  bowlerId: string;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: Ball["wicketType"];
  fielderId?: string;
  dismissedBatsmanId?: string;
}

export async function recordBall(
  inningsId: string,
  input: RecordBallInput
): Promise<{ innings: Innings; ball: Ball }> {
  const existingBalls = await prisma.ball.findMany({
    where: { inningsId },
    orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
  });

  const illegalStreakBefore = getIllegalStreak(
    existingBalls.map((b) => ({ isWide: b.isWide, isNoBall: b.isNoBall }))
  );
  const isLegal = !input.isWide && !input.isNoBall;

  const legalBallsInCurrentOver = existingBalls.filter(
    (b) => b.overNumber === input.innings.overs && !b.isWide && !b.isNoBall
  ).length;

  const overNumber = input.innings.overs;
  const ballNumber = isLegal
    ? legalBallsInCurrentOver + 1
    : legalBallsInCurrentOver;

  const changeStrike = shouldChangeStrike({
    ballNumber: ballNumber,
    runs: input.runs,
    isWide: input.isWide,
    isNoBall: input.isNoBall,
  });

  const newIllegalStreak =
    illegalStreakBefore + (input.isWide || input.isNoBall ? 1 : 0);
  const bonusIllegalRun = extraRunForIllegalPair(newIllegalStreak);

  // Determine which batsman was dismissed
  let dismissedBatsmanId: string | null = null;
  if (input.isWicket) {
    if (input.dismissedBatsmanId) {
      // Run out - use the specified dismissed batsman
      dismissedBatsmanId = input.dismissedBatsmanId;
    } else {
      // Regular dismissal - striker is dismissed
      dismissedBatsmanId = input.batsmanId;
    }
  }

  const createdBall = await prisma.ball.create({
    data: {
      inningsId,
      overNumber,
      ballNumber,
      batsmanId: input.batsmanId,
      nonStrikerId: input.nonStrikerId,
      bowlerId: input.bowlerId,
      runs: input.runs + bonusIllegalRun,
      isWide: input.isWide,
      isNoBall: input.isNoBall,
      isWicket: input.isWicket,
      wicketType: input.wicketType ?? null,
      fielderId: input.fielderId ?? null,
      dismissedBatsmanId: dismissedBatsmanId,
      strikerChanged: changeStrike,
    },
  });

  const allBalls = [...existingBalls, createdBall];
  const { totalRuns, wickets, statsByPlayer } = calculateStats(allBalls);

  const overProgress = updateOverProgress(input.innings, isLegal);

  const updatedInnings = await prisma.innings.update({
    where: { id: inningsId },
    data: {
      totalRuns,
      wickets,
      overs: overProgress.overs,
      ballsInOver: overProgress.ballsInOver,
    },
  });

  // Upsert player stats for this match+innings
  const matchId = input.match.id;
  await Promise.all(
    Object.entries(statsByPlayer).map(([playerId, s]) =>
      prisma.playerMatchStats.upsert({
        where: {
          matchId_inningsId_playerId: {
            matchId,
            inningsId,
            playerId,
          },
        },
        update: s,
        create: {
          matchId,
          inningsId,
          playerId,
          ...s,
        },
      })
    )
  );

  return { innings: updatedInnings, ball: createdBall };
}

export async function undoLastBall(inningsId: string): Promise<{
  innings: Innings;
  deletedBall: Ball | null;
}> {
  const lastBall = await prisma.ball.findFirst({
    where: { inningsId },
    orderBy: [{ overNumber: "desc" }, { ballNumber: "desc" }],
  });

  if (!lastBall) {
    return {
      innings: await prisma.innings.findUniqueOrThrow({
        where: { id: inningsId },
      }),
      deletedBall: null,
    };
  }

  await prisma.ball.delete({ where: { id: lastBall.id } });

  const innings = await prisma.innings.findUniqueOrThrow({
    where: { id: inningsId },
  });
  const match = await prisma.match.findUniqueOrThrow({
    where: { id: innings.matchId },
  });

  const remainingBalls = await prisma.ball.findMany({
    where: { inningsId },
    orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
  });

  const { totalRuns, wickets, statsByPlayer } = calculateStats(remainingBalls);

  // recompute overs/ballsInOver from remaining balls
  let overs = 0;
  let ballsInOver = 0;
  for (const b of remainingBalls) {
    const isLegal = !b.isWide && !b.isNoBall;
    if (!isLegal) continue;
    ballsInOver += 1;
    if (ballsInOver >= 6) {
      overs += 1;
      ballsInOver = 0;
    }
  }

  const updatedInnings = await prisma.innings.update({
    where: { id: inningsId },
    data: {
      totalRuns,
      wickets,
      overs,
      ballsInOver,
    },
  });

  const matchId = match.id;
  await prisma.playerMatchStats.deleteMany({
    where: { matchId, inningsId },
  });

  await Promise.all(
    Object.entries(statsByPlayer).map(([playerId, s]) =>
      prisma.playerMatchStats.create({
        data: {
          matchId,
          inningsId,
          playerId,
          ...s,
        },
      })
    )
  );

  return { innings: updatedInnings, deletedBall: lastBall };
}

/**
 * Retry helper function
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Exponential backoff
        const waitTime = delay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }
  throw lastError;
}

/**
 * Background database sync for recording a ball
 * This function performs all database operations asynchronously
 * and should not block the API response
 * Includes retry logic for better reliability on slow connections
 */
export async function syncRecordBallToDatabase(
  inningsId: string,
  input: RecordBallInput,
  calculationResult: {
    ball: BallLike;
    updatedInnings: {
      totalRuns: number;
      wickets: number;
      overs: number;
      ballsInOver: number;
    };
    statsByPlayer: Record<
      string,
      Omit<PlayerMatchStats, "id" | "matchId" | "inningsId" | "playerId">
    >;
  }
): Promise<{ innings: Innings; ball: Ball }> {
  return retryOperation(async () => {
    // Create the ball in database
    const createdBall = await prisma.ball.create({
      data: {
        inningsId,
        overNumber: calculationResult.ball.overNumber,
        ballNumber: calculationResult.ball.ballNumber,
        batsmanId: calculationResult.ball.batsmanId,
        nonStrikerId: calculationResult.ball.nonStrikerId,
        bowlerId: calculationResult.ball.bowlerId,
        runs: calculationResult.ball.runs,
        isWide: calculationResult.ball.isWide,
        isNoBall: calculationResult.ball.isNoBall,
        isWicket: calculationResult.ball.isWicket,
        wicketType: calculationResult.ball.wicketType ?? null,
        fielderId: calculationResult.ball.fielderId ?? null,
        dismissedBatsmanId: calculationResult.ball.dismissedBatsmanId,
        strikerChanged: calculationResult.ball.strikerChanged ?? false,
      },
    });

    // Update innings
    const updatedInnings = await prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns: calculationResult.updatedInnings.totalRuns,
        wickets: calculationResult.updatedInnings.wickets,
        overs: calculationResult.updatedInnings.overs,
        ballsInOver: calculationResult.updatedInnings.ballsInOver,
      },
    });

    // Upsert player stats (batch operation for better performance)
    const matchId = input.match.id;
    await Promise.all(
      Object.entries(calculationResult.statsByPlayer).map(([playerId, s]) =>
        prisma.playerMatchStats.upsert({
          where: {
            matchId_inningsId_playerId: {
              matchId,
              inningsId,
              playerId,
            },
          },
          update: s,
          create: {
            matchId,
            inningsId,
            playerId,
            ...s,
          },
        })
      )
    );

    return { innings: updatedInnings, ball: createdBall };
  }, 3, 1000).catch((error) => {
    console.error("Error syncing ball to database after retries:", error);
    // Log to error tracking service in production
    throw error;
  });
}

/**
 * Background database sync for undoing a ball
 * Includes retry logic for better reliability
 */
export async function syncUndoBallToDatabase(
  inningsId: string,
  calculationResult: {
    remainingBalls: BallLike[];
    updatedInnings: {
      totalRuns: number;
      wickets: number;
      overs: number;
      ballsInOver: number;
    };
    deletedBall: BallLike | null;
  }
): Promise<{ innings: Innings; deletedBall: Ball | null }> {
  return retryOperation(async () => {
    if (!calculationResult.deletedBall || !calculationResult.deletedBall.id) {
      // No ball to delete, just return current innings
      const innings = await prisma.innings.findUniqueOrThrow({
        where: { id: inningsId },
      });
      return { innings, deletedBall: null };
    }

    // Delete the ball
    const deletedBall = await prisma.ball.delete({
      where: { id: calculationResult.deletedBall.id },
    });

    // Update innings
    const updatedInnings = await prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns: calculationResult.updatedInnings.totalRuns,
        wickets: calculationResult.updatedInnings.wickets,
        overs: calculationResult.updatedInnings.overs,
        ballsInOver: calculationResult.updatedInnings.ballsInOver,
      },
    });

    // Get match for player stats update
    const innings = await prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
    });
    const matchId = innings.matchId;

    // Delete all player stats for this innings and recreate from remaining balls
    await prisma.playerMatchStats.deleteMany({
      where: { matchId, inningsId },
    });

    // Recalculate stats from remaining balls
    const remainingBalls = await prisma.ball.findMany({
      where: { inningsId },
      orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
    });

    const { statsByPlayer } = calculateStats(remainingBalls);

    // Create player stats from remaining balls (batch operation)
    await Promise.all(
      Object.entries(statsByPlayer).map(([playerId, s]) =>
        prisma.playerMatchStats.create({
          data: {
            matchId,
            inningsId,
            playerId,
            ...s,
          },
        })
      )
    );

    return { innings: updatedInnings, deletedBall };
  }, 3, 1000).catch((error) => {
    console.error("Error syncing undo to database after retries:", error);
    // Log to error tracking service in production
    throw error;
  });
}
