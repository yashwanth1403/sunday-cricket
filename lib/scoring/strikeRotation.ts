import type { Ball } from "@prisma/client";

export function shouldChangeStrike(
  ball: Pick<Ball, "runs" | "isWide" | "isNoBall">
): boolean {
  // Extras (wide, no-ball) do not change strike
  if (ball.isWide || ball.isNoBall) {
    return false;
  }

  // Odd runs from the bat (1, 3) -> change strike
  // Even runs (2, 4, 6) -> no change
  return ball.runs % 2 === 1;
}
