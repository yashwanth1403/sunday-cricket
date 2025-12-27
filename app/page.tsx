import Link from "next/link";
import { MatchHistory } from "@/components/MatchHistory";
import { Leaderboard } from "@/components/Leaderboard";
import { prisma } from "@/lib/prisma";

export const revalidate = 10; // Revalidate every 10 seconds

// Helper function to format date consistently (avoiding hydration mismatch)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

async function getHomeData() {
  try {
    const matchesData = await prisma.match.findMany({
      orderBy: { date: "desc" },
      take: 20,
      include: {
        manOfMatch: true,
        innings: true,
      },
    });

    const matches = matchesData.map((m) => ({
      id: m.id,
      name: m.name,
      date: m.date.toISOString(),
      teamA: m.teamA,
      teamB: m.teamB,
      winner: m.winner,
      status: m.status,
      manOfMatchName: m.manOfMatch?.name ?? null,
    }));

    // Get top run scorers by aggregating player stats across all matches
    const playersWithStats = await prisma.player.findMany({
      include: {
        playerStats: true,
      },
    });

    const topRuns = playersWithStats
      .map((player) => {
        const totalRuns = player.playerStats.reduce(
          (sum, stat) => sum + stat.runs,
          0
        );
        const totalMatches = new Set(
          player.playerStats.map((stat) => stat.matchId)
        ).size;

        return {
          playerId: player.id,
          name: player.name,
          value: totalRuns,
          secondary:
            totalMatches > 0
              ? `${totalMatches} match${totalMatches !== 1 ? "es" : ""}`
              : undefined,
        };
      })
      .filter((p) => p.value > 0) // Only include players with runs
      .sort((a, b) => b.value - a.value) // Sort by runs descending
      .slice(0, 10); // Top 10

    return { matches, topRuns };
  } catch (error) {
    console.error("Failed to load home data:", error);
    return {
      matches: [],
      topRuns: [],
    };
  }
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
                href="/matches"
                className="rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2.5 text-center text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
              >
                📅 Matches
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
                <div className="mt-1 text-xl font-bold">
                  {latestMom.manOfMatchName}
                </div>
                <div className="text-sm text-white/90">
                  {latestMom.teamA} vs {latestMom.teamB} •{" "}
                  {formatDate(latestMom.date)}
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
