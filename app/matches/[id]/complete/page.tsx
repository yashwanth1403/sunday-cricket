import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchCompletePage({ params }: PageProps) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      innings: {
        orderBy: { inningsNumber: "asc" },
      },
      playerStats: {
        include: { player: true },
      },
      manOfMatch: true,
    },
  });

  if (!match) notFound();

  const [firstInnings, secondInnings] = match.innings;

  // Aggregate player stats across both innings
  const aggregatedStats = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      runs: number;
      ballsFaced: number;
      wickets: number;
      runsConceded: number;
      ballsBowled: number;
    }
  >();

  for (const stat of match.playerStats) {
    const existing = aggregatedStats.get(stat.playerId);
    if (existing) {
      existing.runs += stat.runs;
      existing.ballsFaced += stat.ballsFaced;
      existing.wickets += stat.wickets;
      existing.runsConceded += stat.runsConceded;
      existing.ballsBowled += stat.ballsBowled;
    } else {
      aggregatedStats.set(stat.playerId, {
        playerId: stat.playerId,
        playerName: stat.player.name,
        runs: stat.runs,
        ballsFaced: stat.ballsFaced,
        wickets: stat.wickets,
        runsConceded: stat.runsConceded,
        ballsBowled: stat.ballsBowled,
      });
    }
  }

  const topBatting = Array.from(aggregatedStats.values())
    .filter((s) => s.runs > 0 || s.ballsFaced > 0) // Only players who batted
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 3);

  const topBowling = Array.from(aggregatedStats.values())
    .filter((s) => {
      // Only include players who actually bowled (have ballsBowled > 0)
      // AND have bowling stats (either wickets or runsConceded > 0)
      // Exclude players who only batted (runsConceded should be 0 if they didn't bowl)
      return s.ballsBowled > 0 && (s.wickets > 0 || s.runsConceded > 0);
    })
    .sort((a, b) => {
      // Sort by wickets first (descending), then by runs conceded (ascending - lower is better)
      if (b.wickets !== a.wickets) {
        return b.wickets - a.wickets;
      }
      return a.runsConceded - b.runsConceded;
    })
    .slice(0, 3);

  const winnerName =
    match.winner === "A"
      ? match.teamA
      : match.winner === "B"
      ? match.teamB
      : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <span>🏆</span>
            <span>Match Result</span>
          </h1>
          <p className="mt-1 text-lg font-semibold">
            {match.teamA} vs {match.teamB}
          </p>
          {winnerName ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-500/20 px-4 py-2 backdrop-blur-sm">
              <span className="text-2xl">🏆</span>
              <div>
                <div className="text-xs text-green-100">Winner</div>
                <div className="text-lg font-bold">{winnerName}</div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-blue-100">Result pending.</p>
          )}
          {match.manOfMatch && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 shadow-md">
              <span className="text-2xl">⭐</span>
              <div>
                <div className="text-xs font-bold text-white">
                  Man of the Match
                </div>
                <div className="text-lg font-black text-white">
                  {match.manOfMatch.name}
                </div>
              </div>
            </div>
          )}
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2">
          {firstInnings && (
            <div className="rounded-2xl bg-white p-4 shadow-md">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                <span>1️⃣</span>
                <span>1st Innings</span>
              </div>
              <p className="text-lg font-bold text-slate-800">
                {firstInnings.totalRuns}/{firstInnings.wickets} in{" "}
                {firstInnings.overs} overs
              </p>
            </div>
          )}
          {secondInnings && (
            <div className="rounded-2xl bg-white p-4 shadow-md">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                <span>2️⃣</span>
                <span>2nd Innings</span>
              </div>
              <p className="text-lg font-bold text-slate-800">
                {secondInnings.totalRuns}/{secondInnings.wickets} in{" "}
                {secondInnings.overs} overs
              </p>
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span>🏏</span>
              <span>Top Batting</span>
            </div>
            <ul className="space-y-2">
              {topBatting.map((s, idx) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <li
                    key={s.playerId}
                    className="flex items-center justify-between rounded-lg bg-blue-50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {medals[idx] || `${idx + 1}.`}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {s.playerName}
                      </span>
                    </div>
                    <span className="font-bold text-slate-800">
                      {s.runs} ({s.ballsFaced})
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span>🎾</span>
              <span>Top Bowling</span>
            </div>
            <ul className="space-y-2">
              {topBowling.length > 0 ? (
                topBowling.map((s, idx) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <li
                      key={s.playerId}
                      className="flex items-center justify-between rounded-lg bg-orange-50 p-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {medals[idx] || `${idx + 1}.`}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {s.playerName}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {Math.floor(s.ballsBowled / 6)}.{s.ballsBowled % 6} •{" "}
                        {s.runsConceded}/{s.wickets}
                      </span>
                    </li>
                  );
                })
              ) : (
                <li className="rounded-lg bg-slate-50 p-2 text-sm text-slate-500">
                  No bowling stats available
                </li>
              )}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
