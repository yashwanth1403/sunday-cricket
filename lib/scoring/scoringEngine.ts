import type { Ball, Innings, Match, PlayerMatchStats } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shouldChangeStrike } from "./strikeRotation";
import {
  getIllegalStreak,
  extraRunForIllegalPair,
} from "./illegalDeliveryRule";
import { updateOverProgress } from "./bowlingRules";
import { calculateStats } from "./statsCalculator";

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
