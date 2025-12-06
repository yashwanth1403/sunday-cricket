import Link from "next/link";
import { MatchHistory } from "@/components/MatchHistory";
import { Leaderboard } from "@/components/Leaderboard";

async function getHomeData() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(new URL("/api/matches", base).toString(), {
    next: { revalidate: 10 },
  });

  if (!res.ok) {
    return {
      matches: [],
      topRuns: [],
    };
  }

  type MatchApi = {
    id: string;
    name: string;
    date: string;
    teamA: string;
    teamB: string;
    winner: "A" | "B" | null;
    manOfMatch?: { name: string } | null;
  };

  const data: MatchApi[] = await res.json();

  const matches = data.map((m) => ({
    id: m.id,
    name: m.name,
    date: m.date,
    teamA: m.teamA,
    teamB: m.teamB,
    winner: m.winner,
    manOfMatchName: m.manOfMatch?.name ?? null,
  }));

  // Placeholder leaderboard derived from recent matches' player stats (can be
  // replaced with dedicated /api/leaderboards later).
  const topRuns: { playerId: string; name: string; value: number }[] = [];

  return { matches, topRuns };
}

export default async function Home() {
  const { matches, topRuns } = await getHomeData();

  const latestMom = matches.find((m) => m.manOfMatchName);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        {/* Header */}
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                <span>🏏</span>
                <span>Sunday Cricket</span>
              </h1>
              <p className="mt-1 text-sm text-blue-100 sm:text-base">
                Fast, friendly scoring for your box-cricket Sundays
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/players"
                className="rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              >
                👥 Players
              </Link>
              <Link
                href="/matches/new"
                className="rounded-xl bg-orange-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-md transition-all hover:bg-orange-600 active:scale-95"
              >
                ➕ New Match
              </Link>
            </div>
          </div>
        </header>

        {/* Man of the Match Card */}
        {latestMom && (
          <section className="mb-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-5 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl">
                ⭐
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-white/90">
                  Previous Man of the Match
                </div>
                <div className="mt-1 text-xl font-bold">{latestMom.manOfMatchName}</div>
                <div className="text-sm text-white/90">
                  {latestMom.teamA} vs {latestMom.teamB} •{" "}
                  {new Date(latestMom.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Main Content Grid */}
        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <MatchHistory matches={matches} />
          <div className="space-y-4">
            <Leaderboard title="🏆 Top Runs" rows={topRuns} />
          </div>
        </section>
      </main>
    </div>
  );
}
