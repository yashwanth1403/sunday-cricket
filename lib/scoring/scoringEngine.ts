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

  // Ensure balls are sorted by overNumber and ballNumber for correct streak calculation
  const sortedBalls = [...existingBalls].sort((a, b) => {
    if (a.overNumber !== b.overNumber) {
      return a.overNumber - b.overNumber;
    }
    return a.ballNumber - b.ballNumber;
  });

  console.log(
    `[DEBUG] recordBall (server): Sorted ${sortedBalls.length} existing balls:`,
    sortedBalls
      .map(
        (b) =>
          `${b.overNumber}.${b.ballNumber}(${
            b.isWide ? "W" : b.isNoBall ? "N" : b.runs
          })`
      )
      .join(", ")
  );

  const illegalStreakBefore = getIllegalStreak(
    sortedBalls.map((b) => ({ isWide: b.isWide, isNoBall: b.isNoBall }))
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

  const isNewBallIllegal = input.isWide || input.isNoBall;
  const newIllegalStreak = illegalStreakBefore + (isNewBallIllegal ? 1 : 0);
  // Only award bonus if the new ball is illegal (streak continues)
  // If the new ball is legal, the streak is broken and no bonus is awarded
  const bonusIllegalRun = isNewBallIllegal
    ? extraRunForIllegalPair(newIllegalStreak)
    : 0;

  console.log(
    `[DEBUG] recordBall (server): existingBalls=${
      existingBalls.length
    }, illegalStreakBefore=${illegalStreakBefore}, isNewBallIllegal=${isNewBallIllegal}, newIllegalStreak=${newIllegalStreak}, bonusIllegalRun=${bonusIllegalRun}, input.runs=${
      input.runs
    }, final ball.runs=${input.runs + bonusIllegalRun}`
  );

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

  // Pre-calculate stats before transaction
  // Create a temporary ball object with all required fields for calculateStats
  const tempBall: Ball = {
    id: "temp",
    createdAt: new Date(),
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
  };
  const allBalls = [...existingBalls, tempBall];
  const { totalRuns, wickets, statsByPlayer } = calculateStats(allBalls);
  const overProgress = updateOverProgress(input.innings, isLegal);

  // Use transaction for atomicity and better performance
  const matchId = input.match.id;
  const [createdBall, updatedInnings] = await prisma.$transaction([
    // Create the ball
    prisma.ball.create({
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
    }),
    // Update innings
    prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns,
        wickets,
        overs: overProgress.overs,
        ballsInOver: overProgress.ballsInOver,
      },
    }),
    // Batch upsert player stats (executed in parallel within transaction)
    ...Object.entries(statsByPlayer).map(([playerId, s]) =>
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
    ),
  ]);

  return { innings: updatedInnings, ball: createdBall };
}

export async function undoLastBall(inningsId: string): Promise<{
  innings: Innings;
  deletedBall: Ball | null;
}> {
  // Get all balls and find the last one manually to handle same overNumber/ballNumber case
  const allBalls = await prisma.ball.findMany({
    where: { inningsId },
    orderBy: [{ createdAt: "asc" }], // Get in creation order
  });

  if (allBalls.length === 0) {
    return {
      innings: await prisma.innings.findUniqueOrThrow({
        where: { id: inningsId },
      }),
      deletedBall: null,
    };
  }

  // Sort by overNumber, ballNumber, then by creation time (last created = last ball)
  const sortedBalls = [...allBalls].sort((a, b) => {
    if (a.overNumber !== b.overNumber) {
      return b.overNumber - a.overNumber;
    }
    if (a.ballNumber !== b.ballNumber) {
      return b.ballNumber - a.ballNumber;
    }
    // If same over and ball number, use creation time (last created = last ball)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const lastBall = sortedBalls[0];

  if (!lastBall) {
    return {
      innings: await prisma.innings.findUniqueOrThrow({
        where: { id: inningsId },
      }),
      deletedBall: null,
    };
  }

  // Get innings and match in parallel
  const [innings, remainingBalls] = await Promise.all([
    prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
    }),
    prisma.ball.findMany({
      where: { inningsId },
      orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
    }),
  ]);

  // Filter out the last ball from remaining balls
  const filteredRemainingBalls = remainingBalls.filter(
    (b) => b.id !== lastBall.id
  );

  const { totalRuns, wickets, statsByPlayer } = calculateStats(
    filteredRemainingBalls
  );

  // recompute overs/ballsInOver from remaining balls
  let overs = 0;
  let ballsInOver = 0;
  for (const b of filteredRemainingBalls) {
    const isLegal = !b.isWide && !b.isNoBall;
    if (!isLegal) continue;
    ballsInOver += 1;
    if (ballsInOver >= 6) {
      overs += 1;
      ballsInOver = 0;
    }
  }

  const matchId = innings.matchId;

  // Use transaction for atomicity and better performance
  // Replace delete+recreate with upserts (more efficient)
  const [deletedBall, updatedInnings] = await prisma.$transaction([
    // Delete the ball
    prisma.ball.delete({ where: { id: lastBall.id } }),
    // Update innings
    prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns,
        wickets,
        overs,
        ballsInOver,
      },
    }),
    // Upsert player stats instead of delete+recreate (more efficient)
    ...Object.entries(statsByPlayer).map(([playerId, s]) =>
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
    ),
  ]);

  return { innings: updatedInnings, deletedBall };
}

/**
 * Background database sync for recording a ball
 * This function performs all database operations asynchronously
 * and should not block the API response
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
  try {
    const matchId = input.match.id;

    // Use transaction for atomicity and better performance
    // All operations execute in a single database round trip
    const [createdBall, updatedInnings] = await prisma.$transaction([
      // Create the ball
      prisma.ball.create({
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
      }),
      // Update innings
      prisma.innings.update({
        where: { id: inningsId },
        data: {
          totalRuns: calculationResult.updatedInnings.totalRuns,
          wickets: calculationResult.updatedInnings.wickets,
          overs: calculationResult.updatedInnings.overs,
          ballsInOver: calculationResult.updatedInnings.ballsInOver,
        },
      }),
      // Batch upsert player stats (executed in parallel within transaction)
      ...Object.entries(calculationResult.statsByPlayer).map(([playerId, s]) =>
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
      ),
    ]);

    // Extract the results (first two are ball and innings, rest are stats)
    const ball = createdBall;
    const innings = updatedInnings;

    return { innings, ball };
  } catch (error) {
    console.error("Error syncing ball to database:", error);
    throw error;
  }
}

/**
 * Background database sync for undoing a ball
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
  try {
    if (!calculationResult.deletedBall || !calculationResult.deletedBall.id) {
      // No ball to delete, just return current innings
      const innings = await prisma.innings.findUniqueOrThrow({
        where: { id: inningsId },
      });
      return { innings, deletedBall: null };
    }

    // Get innings once to get matchId (avoid redundant query)
    const innings = await prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
      select: { matchId: true },
    });
    const matchId = innings.matchId;

    // Fetch remaining balls from database to get full Ball objects for calculateStats
    // We need to do this before deleting the ball to get accurate remaining balls
    const allBallsBeforeDelete = await prisma.ball.findMany({
      where: { inningsId },
      orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
    });

    // Filter out the ball we're about to delete
    const deletedBallId = calculationResult.deletedBall?.id;
    const remainingBalls = deletedBallId
      ? allBallsBeforeDelete.filter((b) => b.id !== deletedBallId)
      : allBallsBeforeDelete;

    // Recalculate stats from remaining balls
    const { statsByPlayer } = calculateStats(remainingBalls);

    // Use transaction for atomicity and better performance
    // Replace delete+recreate pattern with upserts (more efficient)
    const [deletedBall, updatedInnings] = await prisma.$transaction([
      // Delete the ball
      prisma.ball.delete({
        where: { id: calculationResult.deletedBall.id },
      }),
      // Update innings
      prisma.innings.update({
        where: { id: inningsId },
        data: {
          totalRuns: calculationResult.updatedInnings.totalRuns,
          wickets: calculationResult.updatedInnings.wickets,
          overs: calculationResult.updatedInnings.overs,
          ballsInOver: calculationResult.updatedInnings.ballsInOver,
        },
      }),
      // Upsert player stats instead of delete+recreate (more efficient)
      ...Object.entries(statsByPlayer).map(([playerId, s]) =>
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
      ),
    ]);

    return { innings: updatedInnings, deletedBall };
  } catch (error) {
    console.error("Error syncing undo to database:", error);
    throw error;
  }
}
