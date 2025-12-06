export interface IllegalDeliveryLike {
  isWide: boolean;
  isNoBall: boolean;
}

export function getIllegalStreak(balls: IllegalDeliveryLike[]): number {
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

export function extraRunForIllegalPair(newStreak: number): number {
  // Every second illegal delivery in a row gives +1 run (total), so for
  // streaks 2,4,6,... award 1 run each pair.
  if (newStreak > 0 && newStreak % 2 === 0) {
    return 1;
  }
  return 0;
}
