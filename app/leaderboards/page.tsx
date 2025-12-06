import { Leaderboard } from "@/components/Leaderboard";
import { prisma } from "@/lib/prisma";

export const revalidate = 30; // Revalidate every 30 seconds

async function getLeaderboards() {
  try {
    const stats = await prisma.playerMatchStats.findMany({
      include: {
        player: true,
      },
    });

    const byPlayer = new Map<
      string,
      {
        id: string;
        name: string;
        runs: number;
        ballsFaced: number;
        wickets: number;
        ballsBowled: number;
      }
    >();

    for (const s of stats) {
      if (!byPlayer.has(s.playerId)) {
        byPlayer.set(s.playerId, {
          id: s.playerId,
          name: s.player.name,
          runs: 0,
          ballsFaced: 0,
          wickets: 0,
          ballsBowled: 0,
        });
      }
      const agg = byPlayer.get(s.playerId)!;
      agg.runs += s.runs;
      agg.ballsFaced += s.ballsFaced;
      agg.wickets += s.wickets;
      agg.ballsBowled += s.ballsBowled;
    }

    const players = Array.from(byPlayer.values());

    const topRuns = [...players]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, runs: p.runs }));

    const topWickets = [...players]
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, wickets: p.wickets }));

    const topStrikeRate = [...players]
      .filter((p) => p.ballsFaced >= 20)
      .map((p) => ({
        id: p.id,
        name: p.name,
        strikeRate: p.ballsFaced ? (p.runs / p.ballsFaced) * 100 : 0,
      }))
      .sort((a, b) => b.strikeRate - a.strikeRate)
      .slice(0, 10);

    return { topRuns, topWickets, topStrikeRate };
  } catch (error) {
    console.error("Failed to load leaderboards:", error);
    return { topRuns: [], topWickets: [], topStrikeRate: [] };
  }
}

export default async function LeaderboardsPage() {
  const { topRuns, topWickets, topStrikeRate } = await getLeaderboards();

  return (
    <div className="min-h-screen bg-emerald-950/95 py-6 text-zinc-950">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
        <header>
          <h1 className="text-xl font-semibold text-emerald-50">
            Leaderboards
          </h1>
          <p className="text-sm text-emerald-200">
            Runs, wickets, and strike rate across all Sunday Cricket games.
          </p>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          <Leaderboard
            title="Top Runs"
            rows={topRuns.map((p) => ({
              playerId: p.id,
              name: p.name,
              value: p.runs,
            }))}
          />
          <Leaderboard
            title="Most Wickets"
            rows={topWickets.map((p) => ({
              playerId: p.id,
              name: p.name,
              value: p.wickets,
            }))}
          />
        </div>
        <Leaderboard
          title="Best Strike Rate (min 20 balls)"
          rows={topStrikeRate.map((p) => ({
            playerId: p.id,
            name: p.name,
            value: Number(p.strikeRate.toFixed(1)),
          }))}
        />
      </main>
    </div>
  );
}
