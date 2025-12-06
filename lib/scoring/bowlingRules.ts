export function updateOverProgress(
  innings: { overs: number; ballsInOver: number },
  isLegalDelivery: boolean
): { overs: number; ballsInOver: number; overCompleted: boolean } {
  if (!isLegalDelivery) {
    return {
      overs: innings.overs,
      ballsInOver: innings.ballsInOver,
      overCompleted: false,
    };
  }

  const newBalls = innings.ballsInOver + 1;
  if (newBalls >= 6) {
    return {
      overs: innings.overs + 1,
      ballsInOver: 0,
      overCompleted: true,
    };
  }

  return {
    overs: innings.overs,
    ballsInOver: newBalls,
    overCompleted: false,
  };
}
