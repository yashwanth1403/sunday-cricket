import type { Ball } from "@prisma/client";

export function shouldChangeStrike(
  ball: Pick<Ball, "runs" | "isWide" | "isNoBall" | "ballNumber">
): boolean {
  // Extras (wide, no-ball) do not change strike
  if (ball.isWide || ball.isNoBall) {
    return false;
  }
  
  // On the 6th ball, odd runs don't change strike (over ends, positions swap anyway)
  if (ball.ballNumber === 6) {
    return false;
  }
  
  // For other balls, odd runs (1, 3, 5) change strike
  return ball.runs % 2 === 1;
}
