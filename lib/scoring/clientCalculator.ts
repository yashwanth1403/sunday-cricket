/**
 * Client-side calculation utilities for optimistic updates
 * These functions mirror the server-side logic but run in the browser
 */

import type { BallLike } from "./scoringCalculator";

export interface ClientBallInput {
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: string | null;
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
 * Counts consecutive illegal deliveries from the most recent ball backwards
 * Balls array should be in chronological order (oldest to newest)
 */
function getIllegalStreak(
  balls: Array<{ isWide: boolean; isNoBall: boolean }>
): number {
  if (balls.length === 0) return 0;

  let streak = 0;
  // Start from the last ball (most recent) and count backwards
  for (let i = balls.length - 1; i >= 0; i -= 1) {
    const b = balls[i];
    // Check if this ball is illegal (wide or no-ball)
    if (b.isWide || b.isNoBall) {
      streak += 1;
    } else {
      // Stop counting when we hit a legal delivery - streak is broken
      break;
    }
  }
  return streak;
}

/**
 * Calculate bonus run for illegal delivery pairs (Box Cricket Rule)
 * If there are 2 consecutive illegal deliveries (wide or no-ball),
 * award 1 bonus run on the 2nd consecutive illegal delivery.
 * This applies to every pair: 2nd, 4th, 6th, etc. consecutive illegal delivery.
 */
function extraRunForIllegalPair(newStreak: number): number {
  // Box cricket rule: After the first illegal delivery, every subsequent illegal delivery
  // in the streak gets 1 bonus run. So:
  // - 1st consecutive illegal: 0 runs (no bonus)
  // - 2nd consecutive illegal: 1 run (bonus)
  // - 3rd consecutive illegal: 1 run (bonus)
  // - 4th consecutive illegal: 1 run (bonus)
  // - And so on, until the streak breaks
  if (newStreak >= 2) {
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
    const runsThisBall = ball.runs;
    // Box cricket rule: No base extra for illegal deliveries
    // Only bonus run (in ball.runs) counts, which is awarded on 2nd, 3rd, 4th, etc. consecutive illegal
    // So runsThisBall = ball.runs (0 for 1st, 1 for 2nd/3rd/4th/etc.)
    // Debug logging removed for performance - only log if needed for debugging
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
  // Ensure balls are sorted by overNumber and ballNumber for correct streak calculation
  const sortedBalls = [...existingBalls].sort((a, b) => {
    if (a.overNumber !== b.overNumber) {
      return a.overNumber - b.overNumber;
    }
    return a.ballNumber - b.ballNumber;
  });

  console.log(
    `[DEBUG] calculateRecordBallClient: Sorted ${sortedBalls.length} existing balls:`,
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
  const isNewBallIllegal = input.isWide || input.isNoBall;
  const newIllegalStreak = illegalStreakBefore + (isNewBallIllegal ? 1 : 0);
  // Only award bonus if the new ball is illegal (streak continues)
  // If the new ball is legal, the streak is broken and no bonus is awarded
  const bonusIllegalRun = isNewBallIllegal
    ? extraRunForIllegalPair(newIllegalStreak)
    : 0;

  console.log(`[DEBUG] ===== calculateRecordBallClient SUMMARY =====`);
  console.log(
    `[DEBUG] Existing balls: ${existingBalls.length}, Illegal streak before: ${illegalStreakBefore}`
  );
  console.log(
    `[DEBUG] New ball: isWide=${input.isWide}, isNoBall=${input.isNoBall}, isIllegal=${isNewBallIllegal}`
  );
  console.log(
    `[DEBUG] New illegal streak: ${newIllegalStreak} (${illegalStreakBefore} + ${
      isNewBallIllegal ? 1 : 0
    })`
  );
  console.log(
    `[DEBUG] Bonus run awarded: ${bonusIllegalRun} (should be 0 for 1st illegal, 1 for 2nd/4th/6th)`
  );
  console.log(
    `[DEBUG] Input runs: ${
      input.runs
    }, Bonus: ${bonusIllegalRun}, Final ball.runs: ${
      input.runs + bonusIllegalRun
    }`
  );
  console.log(`[DEBUG] ==============================================`);

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
  const finalRuns = input.runs + bonusIllegalRun;
  const newBall: BallLike = {
    overNumber,
    ballNumber,
    batsmanId,
    nonStrikerId,
    bowlerId,
    runs: finalRuns,
    isWide: input.isWide,
    isNoBall: input.isNoBall,
    isWicket: input.isWicket,
    wicketType:
      (input.wicketType as
        | "BOWLED"
        | "CAUGHT"
        | "CAUGHT_AND_BOWLED"
        | "RUN_OUT"
        | "STUMPED"
        | "LBW"
        | "HIT_WICKET"
        | "RETIRED"
        | "OTHER"
        | null
        | undefined) ?? null,
    fielderId: input.fielderId ?? null,
    dismissedBatsmanId: dismissedBatsmanId,
    strikerChanged,
  };

  console.log(
    `[DEBUG] calculateRecordBallClient: Created ball - overNumber=${overNumber}, ballNumber=${ballNumber}, runs=${finalRuns}, isWide=${input.isWide}, isNoBall=${input.isNoBall}`
  );

  // Calculate updated stats
  const allBalls = [...existingBalls, newBall];
  console.log(
    `[DEBUG] calculateRecordBallClient: Calculating stats for ${allBalls.length} balls (${existingBalls.length} existing + 1 new)`
  );
  const { totalRuns, wickets } = calculateStatsFromBalls(allBalls);
  console.log(
    `[DEBUG] calculateRecordBallClient: Final stats - totalRuns=${totalRuns}, wickets=${wickets}`
  );

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
  console.log(`[DEBUG] ===== calculateUndoBallClient START =====`);
  console.log(`[DEBUG] Existing balls: ${existingBalls.length}`);

  if (existingBalls.length === 0) {
    console.log(`[DEBUG] No balls to undo`);
    return {
      remainingBalls: [],
      updatedScore: currentScore,
      deletedBall: null,
    };
  }

  // Find the last ball (highest overNumber, then highest ballNumber)
  // For balls with same over/ball number, use array index as tiebreaker (last added = last in array)
  const sortedBalls = [...existingBalls]
    .map((b, idx) => ({ ball: b, originalIndex: idx }))
    .sort((a, b) => {
      if (a.ball.overNumber !== b.ball.overNumber) {
        return b.ball.overNumber - a.ball.overNumber;
      }
      if (a.ball.ballNumber !== b.ball.ballNumber) {
        return b.ball.ballNumber - a.ball.ballNumber;
      }
      // If same over and ball number (e.g., multiple wides), use original index
      // Last added ball (higher index) should be removed first
      return b.originalIndex - a.originalIndex;
    });

  const lastBall = sortedBalls[0].ball;
  console.log(
    `[DEBUG] Last ball to delete: ${lastBall.overNumber}.${lastBall.ballNumber}, isWide=${lastBall.isWide}, isNoBall=${lastBall.isNoBall}, runs=${lastBall.runs}`
  );

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

  console.log(
    `[DEBUG] Remaining balls after delete: ${remainingBalls.length}`,
    remainingBalls
      .map(
        (b) =>
          `${b.overNumber}.${b.ballNumber}(${
            b.isWide ? "W" : b.isNoBall ? "N" : b.runs
          })`
      )
      .join(", ")
  );

  // Calculate stats from remaining balls
  const { totalRuns, wickets } = calculateStatsFromBalls(remainingBalls);
  console.log(
    `[DEBUG] After undo - totalRuns: ${totalRuns}, wickets: ${wickets} (was ${currentScore.totalRuns}, ${currentScore.wickets})`
  );

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
