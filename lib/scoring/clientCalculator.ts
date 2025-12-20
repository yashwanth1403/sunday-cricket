/**
 * Client-side calculation utilities for optimistic updates
 * These functions mirror the server-side logic but run in the browser
 */

import type { BallLike } from "./scoringCalculator";
import type { Ball } from "@prisma/client";

export interface ClientBallInput {
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: Ball["wicketType"] | null;
  fielderId?: string | null;
  dismissedBatsmanId?: string | null;
}

export interface ClientCalculationResult {
  ball: BallLike;
  updatedScore: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  overCompleted: boolean;
  strikerChanged: boolean;
}

/**
 * Calculate illegal streak for bonus runs
 */
function getIllegalStreak(balls: Array<{ isWide: boolean; isNoBall: boolean }>): number {
  let streak = 0;
  for (let i = balls.length - 1; i >= 0; i -= 1) {
    const b = balls[i];
    if (b.isWide || b.isNoBall) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Calculate bonus run for illegal delivery pairs
 */
function extraRunForIllegalPair(newStreak: number): number {
  if (newStreak > 0 && newStreak % 2 === 0) {
    return 1;
  }
  return 0;
}

/**
 * Determine if strike should change based on runs and ball type
 */
function shouldChangeStrike(
  ballNumber: number,
  runs: number,
  isWide: boolean,
  isNoBall: boolean
): boolean {
  // Extras (wide, no-ball) do not change strike
  if (isWide || isNoBall) {
    return false;
  }
  
  // On the 6th ball, odd runs don't change strike (over ends, positions swap anyway)
  if (ballNumber === 6) {
    return false;
  }
  
  // For other balls, odd runs (1, 3, 5) change strike
  return runs % 2 === 1;
}

/**
 * Update over progress
 */
function updateOverProgress(
  currentOvers: number,
  currentBallsInOver: number,
  isLegalDelivery: boolean
): { overs: number; ballsInOver: number; overCompleted: boolean } {
  if (!isLegalDelivery) {
    return {
      overs: currentOvers,
      ballsInOver: currentBallsInOver,
      overCompleted: false,
    };
  }

  const newBalls = currentBallsInOver + 1;
  if (newBalls >= 6) {
    return {
      overs: currentOvers + 1,
      ballsInOver: 0,
      overCompleted: true,
    };
  }

  return {
    overs: currentOvers,
    ballsInOver: newBalls,
    overCompleted: false,
  };
}

/**
 * Calculate stats from balls (simplified version for client)
 */
function calculateStatsFromBalls(balls: BallLike[]): {
  totalRuns: number;
  wickets: number;
} {
  let totalRuns = 0;
  let wickets = 0;

  for (const ball of balls) {
    let runsThisBall = ball.runs;
    if (ball.isWide || ball.isNoBall) {
      runsThisBall += 1; // base extra
    }
    totalRuns += runsThisBall;
    if (ball.isWicket) {
      wickets += 1;
    }
  }

  return { totalRuns, wickets };
}

/**
 * Calculate the result of recording a ball on the client side
 */
export function calculateRecordBallClient(
  existingBalls: BallLike[],
  currentScore: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  },
  batsmanId: string,
  nonStrikerId: string,
  bowlerId: string,
  input: ClientBallInput
): ClientCalculationResult {
  const isLegal = !input.isWide && !input.isNoBall;

  // Calculate legal balls in current over
  const legalBallsInCurrentOver = existingBalls.filter(
    (b) => b.overNumber === currentScore.overs && !b.isWide && !b.isNoBall
  ).length;

  const overNumber = currentScore.overs;
  const ballNumber = isLegal
    ? legalBallsInCurrentOver + 1
    : legalBallsInCurrentOver;

  // Calculate illegal streak and bonus runs
  const illegalStreakBefore = getIllegalStreak(
    existingBalls.map((b) => ({ isWide: b.isWide, isNoBall: b.isNoBall }))
  );
  const newIllegalStreak =
    illegalStreakBefore + (input.isWide || input.isNoBall ? 1 : 0);
  const bonusIllegalRun = extraRunForIllegalPair(newIllegalStreak);

  // Determine strike change
  const strikerChanged = shouldChangeStrike(
    ballNumber,
    input.runs,
    input.isWide,
    input.isNoBall
  );

  // Determine dismissed batsman
  let dismissedBatsmanId: string | null = null;
  if (input.isWicket) {
    if (input.dismissedBatsmanId) {
      dismissedBatsmanId = input.dismissedBatsmanId;
    } else {
      dismissedBatsmanId = batsmanId;
    }
  }

  // Create new ball
  const newBall: BallLike = {
    overNumber,
    ballNumber,
    batsmanId,
    nonStrikerId,
    bowlerId,
    runs: input.runs + bonusIllegalRun,
    isWide: input.isWide,
    isNoBall: input.isNoBall,
    isWicket: input.isWicket,
    wicketType: input.wicketType ?? null,
    fielderId: input.fielderId ?? null,
    dismissedBatsmanId: dismissedBatsmanId,
    strikerChanged,
  };

  // Calculate updated stats
  const allBalls = [...existingBalls, newBall];
  const { totalRuns, wickets } = calculateStatsFromBalls(allBalls);

  // Update over progress
  const overProgress = updateOverProgress(
    currentScore.overs,
    currentScore.ballsInOver,
    isLegal
  );

  return {
    ball: newBall,
    updatedScore: {
      totalRuns,
      wickets,
      overs: overProgress.overs,
      ballsInOver: overProgress.ballsInOver,
    },
    overCompleted: overProgress.overCompleted,
    strikerChanged,
  };
}

/**
 * Calculate the result of undoing the last ball on the client side
 */
export function calculateUndoBallClient(
  existingBalls: BallLike[],
  currentScore: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  }
): {
  remainingBalls: BallLike[];
  updatedScore: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  deletedBall: BallLike | null;
} {
  if (existingBalls.length === 0) {
    return {
      remainingBalls: [],
      updatedScore: currentScore,
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
    if (b.id && lastBall.id) {
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

  // Calculate stats from remaining balls
  const { totalRuns, wickets } = calculateStatsFromBalls(remainingBalls);

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
    updatedScore: {
      totalRuns,
      wickets,
      overs,
      ballsInOver,
    },
    deletedBall: lastBall,
  };
}

