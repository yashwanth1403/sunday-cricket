import { Leaderboard } from "@/components/Leaderboard";

async function getLeaderboards() {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(
    new URL("/api/leaderboards", base).toString(),
    { next: { revalidate: 30 } },
  );
  if (!res.ok) {
    return { topRuns: [], topWickets: [], topStrikeRate: [] };
  }
  return res.json();
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
            rows={topRuns.map((p: any) => ({
              playerId: p.id,
              name: p.name,
              value: p.runs,
            }))}
          />
          <Leaderboard
            title="Most Wickets"
            rows={topWickets.map((p: any) => ({
              playerId: p.id,
              name: p.name,
              value: p.wickets,
            }))}
          />
        </div>
        <Leaderboard
          title="Best Strike Rate (min 20 balls)"
          rows={topStrikeRate.map((p: any) => ({
            playerId: p.id,
            name: p.name,
            value: Number(p.strikeRate.toFixed(1)),
          }))}
        />
      </main>
    </div>
  );
}


