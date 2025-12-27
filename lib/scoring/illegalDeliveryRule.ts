export interface IllegalDeliveryLike {
  isWide: boolean;
  isNoBall: boolean;
}

export function getIllegalStreak(balls: IllegalDeliveryLike[]): number {
  // Count consecutive illegal deliveries from the most recent ball backwards
  // Balls array should be in chronological order (oldest to newest)
  // We iterate backwards to find the most recent consecutive illegal deliveries
  if (balls.length === 0) {
    console.log("[DEBUG] getIllegalStreak: No balls, returning 0");
    return 0;
  }

  let streak = 0;
  const ballStatuses: string[] = [];
  // Start from the last ball (most recent) and count backwards
  for (let i = balls.length - 1; i >= 0; i -= 1) {
    const b = balls[i];
    const isIllegal = b.isWide || b.isNoBall;
    const status = isIllegal ? (b.isWide ? "Wide" : "NoBall") : "Legal";
    ballStatuses.push(status);
    console.log(
      `[DEBUG] getIllegalStreak: Checking ball ${i} (${
        balls.length - 1 - i
      } from end): ${status}`
    );
    // Check if this ball is illegal (wide or no-ball)
    if (isIllegal) {
      streak += 1;
    } else {
      // Stop counting when we hit a legal delivery - streak is broken
      console.log(
        `[DEBUG] getIllegalStreak: Hit legal delivery, breaking streak at ${streak}`
      );
      break;
    }
  }
  console.log(
    `[DEBUG] getIllegalStreak: ${balls.length} balls checked, last ${
      ballStatuses.length
    } balls: [${ballStatuses.reverse().join(", ")}], streak: ${streak}`
  );
  return streak;
}

export function extraRunForIllegalPair(newStreak: number): number {
  // Box cricket rule: After the first illegal delivery, every subsequent illegal delivery
  // in the streak gets 1 bonus run. So:
  // - 1st consecutive illegal: 0 runs (no bonus)
  // - 2nd consecutive illegal: 1 run (bonus)
  // - 3rd consecutive illegal: 1 run (bonus)
  // - 4th consecutive illegal: 1 run (bonus)
  // - And so on, until the streak breaks
  const bonus = newStreak >= 2 ? 1 : 0;
  console.log(
    `[DEBUG] extraRunForIllegalPair: newStreak=${newStreak}, bonus=${bonus} (${
      newStreak >= 2 ? "streak >= 2, bonus awarded" : "streak < 2, no bonus"
    })`
  );
  return bonus;
}
