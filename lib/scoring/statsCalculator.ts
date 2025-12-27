import type { Ball, PlayerMatchStats } from "@prisma/client";

type MutableStats = Omit<
  PlayerMatchStats,
  "id" | "matchId" | "inningsId" | "playerId"
>;

export interface CalculatedStats {
  totalRuns: number;
  wickets: number;
  statsByPlayer: Record<string, MutableStats>;
}

export function calculateStats(balls: Ball[]): CalculatedStats {
  // Note: We process all balls because stats are cumulative (total runs, wickets, player stats)
  // This is necessary for accuracy, but we minimize logging for performance
  const statsByPlayer: Record<string, MutableStats> = {};
  let totalRuns = 0;
  let wickets = 0;

  const ensure = (playerId: string): MutableStats => {
    if (!statsByPlayer[playerId]) {
      statsByPlayer[playerId] = {
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        ballsBowled: 0,
        runsConceded: 0,
        wickets: 0,
        maidens: 0,
        noBalls: 0,
        wides: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
      };
    }
    return statsByPlayer[playerId];
  };

  // Simple maiden detection: track runs conceded per over per bowler
  const bowlerOverRuns = new Map<string, Map<number, number>>();

  for (const ball of balls) {
    const isLegal = !ball.isWide && !ball.isNoBall;

    // Batting stats
    const batStats = ensure(ball.batsmanId);
    if (!ball.isWide) {
      // wides do not count as ball faced
      batStats.ballsFaced += isLegal ? 1 : 0;
    }
    batStats.runs += ball.runs;
    if (ball.runs === 4) batStats.fours += 1;
    if (ball.runs === 6) batStats.sixes += 1;

    // Bowling stats
    const bowlStats = ensure(ball.bowlerId);
    if (isLegal) bowlStats.ballsBowled += 1;

    let runsThisBall = ball.runs;
    if (ball.isWide || ball.isNoBall) {
      // Box cricket rule: No base extra for illegal deliveries
      // Only bonus run (in ball.runs) counts, which is awarded on 2nd, 4th, 6th consecutive illegal
      // So runsThisBall = ball.runs (0 for 1st/3rd/5th, 1 for 2nd/4th/6th)
      if (ball.isWide) bowlStats.wides += 1;
      if (ball.isNoBall) bowlStats.noBalls += 1;
      // Debug logging removed for performance - only log if needed for debugging
    }

    bowlStats.runsConceded += runsThisBall;
    totalRuns += runsThisBall;

    // Wickets - only credit bowler for certain dismissal types
    if (ball.isWicket) {
      wickets += 1;

      // Bowler gets credit for: BOWLED, CAUGHT, CAUGHT_AND_BOWLED, STUMPED, HIT_WICKET
      // Bowler does NOT get credit for: RUN_OUT
      const bowlerGetsWicket =
        ball.wicketType === "BOWLED" ||
        ball.wicketType === "CAUGHT" ||
        ball.wicketType === "CAUGHT_AND_BOWLED" ||
        ball.wicketType === "STUMPED" ||
        ball.wicketType === "HIT_WICKET";

      if (bowlerGetsWicket) {
        bowlStats.wickets += 1;
      }

      // Fielding stats
      if (ball.fielderId) {
        const fielderStats = ensure(ball.fielderId);

        // Catch for CAUGHT and CAUGHT_AND_BOWLED
        if (
          ball.wicketType === "CAUGHT" ||
          ball.wicketType === "CAUGHT_AND_BOWLED"
        ) {
          fielderStats.catches += 1;
        }
      }

      // Run out - credit the fielder who effected the run out
      if (ball.wicketType === "RUN_OUT" && ball.fielderId) {
        const fielderStats = ensure(ball.fielderId);
        fielderStats.runOuts += 1;
      }

      // Stumping - credit the wicketkeeper (fielder)
      if (ball.wicketType === "STUMPED" && ball.fielderId) {
        const fielderStats = ensure(ball.fielderId);
        fielderStats.stumpings += 1;
      }
    }

    if (!bowlerOverRuns.has(ball.bowlerId)) {
      bowlerOverRuns.set(ball.bowlerId, new Map());
    }
    const overMap = bowlerOverRuns.get(ball.bowlerId)!;
    overMap.set(
      ball.overNumber,
      (overMap.get(ball.overNumber) ?? 0) + runsThisBall
    );
  }

  // Maidens: overs with 0 runs conceded
  for (const [bowlerId, overs] of bowlerOverRuns.entries()) {
    for (const runs of overs.values()) {
      if (runs === 0) {
        ensure(bowlerId).maidens += 1;
      }
    }
  }

  return { totalRuns, wickets, statsByPlayer };
}
