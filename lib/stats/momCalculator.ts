import type { Match, PlayerMatchStats } from "@prisma/client";

export function calculateManOfTheMatch(match: Match & { playerStats: PlayerMatchStats[] }) {
  if (!match.playerStats.length) return null;

  let bestId: string | null = null;
  let bestScore = -Infinity;

  for (const s of match.playerStats) {
    const battingRunsScore = s.runs * 1.0;
    const battingSrScore =
      s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100 - 100) * 0.3 : 0;

    const bowlingWicketsScore = s.wickets * 20;
    const bowlingEconomyScore =
      s.ballsBowled > 0
        ? (24 - s.runsConceded / (s.ballsBowled / 6)) * 0.8
        : 0;

    const fieldingScore = (s.catches + s.stumpings + s.runOuts) * 8;

    const total =
      battingRunsScore +
      battingSrScore +
      bowlingWicketsScore +
      bowlingEconomyScore +
      fieldingScore;

    if (total > bestScore) {
      bestScore = total;
      bestId = s.playerId;
    }
  }

  return bestId;
}


