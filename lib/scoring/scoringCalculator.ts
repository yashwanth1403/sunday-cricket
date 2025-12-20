import type { Ball, Innings } from "@prisma/client";
import { shouldChangeStrike } from "./strikeRotation";
import {
  getIllegalStreak,
  extraRunForIllegalPair,
} from "./illegalDeliveryRule";
import { updateOverProgress } from "./bowlingRules";
import { calculateStats } from "./statsCalculator";

export interface BallLike {
  id?: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  batsmanId: string;
  nonStrikerId: string;
  bowlerId: string;
  strikerChanged?: boolean;
  wicketType?: Ball["wicketType"] | null;
  fielderId?: string | null;
  dismissedBatsmanId?: string | null;
}

export interface RecordBallCalculationInput {
  existingBalls: BallLike[];
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

export interface RecordBallCalculationResult {
  ball: BallLike;
  updatedInnings: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  overCompleted: boolean;
  statsByPlayer: Record<string, any>;
}

/**
 * Pure calculation function - no database access
 * Calculates the result of recording a ball without touching the database
 */
export function calculateRecordBall(
  input: RecordBallCalculationInput
): RecordBallCalculationResult {
  const { existingBalls, innings, batsmanId, nonStrikerId, bowlerId, runs, isWide, isNoBall, isWicket, wicketType, fielderId, dismissedBatsmanId } = input;

  const illegalStreakBefore = getIllegalStreak(
    existingBalls.map((b) => ({ isWide: b.isWide, isNoBall: b.isNoBall }))
  );
  const isLegal = !isWide && !isNoBall;

  const legalBallsInCurrentOver = existingBalls.filter(
    (b) => b.overNumber === innings.overs && !b.isWide && !b.isNoBall
  ).length;

  const overNumber = innings.overs;
  const ballNumber = isLegal
    ? legalBallsInCurrentOver + 1
    : legalBallsInCurrentOver;

  const changeStrike = shouldChangeStrike({
    ballNumber: ballNumber,
    runs: runs,
    isWide: isWide,
    isNoBall: isNoBall,
  });

  const newIllegalStreak =
    illegalStreakBefore + (isWide || isNoBall ? 1 : 0);
  const bonusIllegalRun = extraRunForIllegalPair(newIllegalStreak);

  // Determine which batsman was dismissed
  let dismissedBatsmanIdResult: string | null = null;
  if (isWicket) {
    if (dismissedBatsmanId) {
      // Run out - use the specified dismissed batsman
      dismissedBatsmanIdResult = dismissedBatsmanId;
    } else {
      // Regular dismissal - striker is dismissed
      dismissedBatsmanIdResult = batsmanId;
    }
  }

  // Create the new ball (without database ID for now)
  const newBall: BallLike = {
    overNumber,
    ballNumber,
    batsmanId,
    nonStrikerId,
    bowlerId,
    runs: runs + bonusIllegalRun,
    isWide,
    isNoBall,
    isWicket,
    wicketType: wicketType ?? null,
    fielderId: fielderId ?? null,
    dismissedBatsmanId: dismissedBatsmanIdResult,
    strikerChanged: changeStrike,
  };

  const allBalls = [...existingBalls, newBall];
  
  // Convert BallLike to Ball format for calculateStats
  const ballsForStats: Ball[] = allBalls.map((b, idx) => ({
    id: b.id || `temp-${idx}`,
    inningsId: innings.id,
    overNumber: b.overNumber,
    ballNumber: b.ballNumber,
    batsmanId: b.batsmanId,
    nonStrikerId: b.nonStrikerId,
    bowlerId: b.bowlerId,
    runs: b.runs,
    isWide: b.isWide,
    isNoBall: b.isNoBall,
    isWicket: b.isWicket,
    wicketType: b.wicketType,
    fielderId: b.fielderId,
    dismissedBatsmanId: b.dismissedBatsmanId,
    strikerChanged: b.strikerChanged || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const { totalRuns, wickets, statsByPlayer } = calculateStats(ballsForStats);

  const overProgress = updateOverProgress(innings, isLegal);

  return {
    ball: newBall,
    updatedInnings: {
      totalRuns,
      wickets,
      overs: overProgress.overs,
      ballsInOver: overProgress.ballsInOver,
    },
    overCompleted: overProgress.overCompleted,
    statsByPlayer,
  };
}

export interface UndoBallCalculationInput {
  existingBalls: BallLike[];
  innings: Innings;
}

export interface UndoBallCalculationResult {
  remainingBalls: BallLike[];
  updatedInnings: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  deletedBall: BallLike | null;
}

/**
 * Pure calculation function for undoing the last ball
 */
export function calculateUndoBall(
  input: UndoBallCalculationInput
): UndoBallCalculationResult {
  const { existingBalls, innings } = input;

  if (existingBalls.length === 0) {
    return {
      remainingBalls: [],
      updatedInnings: {
        totalRuns: innings.totalRuns,
        wickets: innings.wickets,
        overs: innings.overs,
        ballsInOver: innings.ballsInOver,
      },
      deletedBall: null,
    };
  }

  // Find the last ball (highest overNumber, then highest ballNumber)
  const sortedBalls = [...existingBalls].sort((a, b) => {
    if (a.overNumber !== b.overNumber) {
      return b.overNumber - a.overNumber;
    }
    return b.ballNumber - a.ballNumber;
  });

  const lastBall = sortedBalls[0];
  const remainingBalls = existingBalls.filter((b) => {
    if (b.id) {
      return b.id !== lastBall.id;
    }
    // Fallback: compare by position if no ID
    return !(
      b.overNumber === lastBall.overNumber &&
      b.ballNumber === lastBall.ballNumber &&
      b.batsmanId === lastBall.batsmanId &&
      b.bowlerId === lastBall.bowlerId
    );
  });

  // Convert to Ball format for calculateStats
  const ballsForStats: Ball[] = remainingBalls.map((b, idx) => ({
    id: b.id || `temp-${idx}`,
    inningsId: innings.id,
    overNumber: b.overNumber,
    ballNumber: b.ballNumber,
    batsmanId: b.batsmanId,
    nonStrikerId: b.nonStrikerId,
    bowlerId: b.bowlerId,
    runs: b.runs,
    isWide: b.isWide,
    isNoBall: b.isNoBall,
    isWicket: b.isWicket,
    wicketType: b.wicketType,
    fielderId: b.fielderId,
    dismissedBatsmanId: b.dismissedBatsmanId,
    strikerChanged: b.strikerChanged || false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const { totalRuns, wickets, statsByPlayer } = calculateStats(ballsForStats);

  // Recompute overs/ballsInOver from remaining balls
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

  return {
    remainingBalls,
    updatedInnings: {
      totalRuns,
      wickets,
      overs,
      ballsInOver,
    },
    deletedBall: lastBall,
  };
}

