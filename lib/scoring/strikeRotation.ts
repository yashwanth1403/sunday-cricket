import type { Ball } from "@prisma/client";

export function shouldChangeStrike(
  ball: Pick<Ball, "runs" | "isWide" | "isNoBall" | "ballNumber">
): boolean {
  // Extras (wide, no-ball) do not change strike
  if (ball.ballNumber === 6 && ball.runs % 2 === 1) {
    return false;
  } else if (ball.ballNumber === 6 && ball.runs % 2 === 1) {
    return true;
  } else if (ball.isWide || ball.isNoBall) {
    return false;
  } else {
    return ball.runs % 2 === 1;
  }
}
