import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BadgeDisplay } from "@/components/BadgeDisplay";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      playerStats: {
        include: {
          match: {
            select: {
              id: true,
              teamA: true,
              teamB: true,
              date: true,
            },
          },
          innings: {
            select: {
              inningsNumber: true,
              battingTeam: true,
            },
          },
        },
        orderBy: {
          match: {
            date: "desc",
          },
        },
      },
      badges: {
        orderBy: {
          unlockedAt: "desc",
        },
      },
      manOfMatchFor: {
        where: {
          status: "COMPLETED",
        },
        select: {
          id: true,
          teamA: true,
          teamB: true,
          date: true,
        },
        orderBy: {
          date: "desc",
        },
      },
    },
  });

  if (!player) {
    notFound();
  }

  const totalInnings = player.playerStats.length || 1;
  const totalRuns = player.playerStats.reduce((sum, s) => sum + s.runs, 0);
  const totalBalls = player.playerStats.reduce(
    (sum, s) => sum + s.ballsFaced,
    0
  );
  const totalFours = player.playerStats.reduce((sum, s) => sum + s.fours, 0);
  const totalSixes = player.playerStats.reduce((sum, s) => sum + s.sixes, 0);
  const totalWickets = player.playerStats.reduce(
    (sum, s) => sum + s.wickets,
    0
  );
  const ballsBowled = player.playerStats.reduce(
    (sum, s) => sum + s.ballsBowled,
    0
  );
  const runsConceded = player.playerStats.reduce(
    (sum, s) => sum + s.runsConceded,
    0
  );
  const totalMaidens = player.playerStats.reduce(
    (sum, s) => sum + s.maidens,
    0
  );
  const totalCatches = player.playerStats.reduce(
    (sum, s) => sum + s.catches,
    0
  );
  const totalRunOuts = player.playerStats.reduce(
    (sum, s) => sum + s.runOuts,
    0
  );
  const totalStumpings = player.playerStats.reduce(
    (sum, s) => sum + s.stumpings,
    0
  );
  const totalMatches = new Set(player.playerStats.map((s) => s.matchId)).size;

  // Calculate averages
  const battingAvg =
    totalInnings > 0 ? (totalRuns / totalInnings).toFixed(2) : "-";
  const battingSr =
    totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : "-";
  const bowlingEcon =
    ballsBowled > 0 ? (runsConceded / (ballsBowled / 6)).toFixed(2) : "-";
  const bowlingAvg =
    totalWickets > 0 ? (runsConceded / totalWickets).toFixed(2) : "-";
  const bowlingSr =
    totalWickets > 0 ? (ballsBowled / totalWickets).toFixed(1) : "-";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <header className="mb-6">
          <Link
            href="/players"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Players
          </Link>
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                  <span>👤</span>
                  <span>{player.name}</span>
                </h1>
                <p className="mt-1 text-sm text-blue-100">
                  {totalMatches} matches • {totalInnings} innings
                </p>
              </div>
              {player.manOfMatchFor.length > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-center shadow-md">
                  <div className="text-xs font-bold text-white">
                    Man of the Match
                  </div>
                  <div className="text-2xl font-black text-white">
                    {player.manOfMatchFor.length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span>🏏</span>
              <span>Batting</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg bg-blue-50 p-2">
                <span className="text-slate-600">Runs:</span>
                <span className="font-bold text-slate-800">{totalRuns}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Innings:</span>
                <span className="font-bold text-slate-800">{totalInnings}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Average:</span>
                <span className="font-bold text-slate-800">{battingAvg}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Strike Rate:</span>
                <span className="font-bold text-slate-800">{battingSr}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-green-50 p-2">
                <span className="text-slate-600">Boundaries:</span>
                <span className="font-bold text-slate-800">
                  {totalFours}×4, {totalSixes}×6
                </span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span>🎾</span>
              <span>Bowling</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg bg-orange-50 p-2">
                <span className="text-slate-600">Wickets:</span>
                <span className="font-bold text-slate-800">{totalWickets}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Overs:</span>
                <span className="font-bold text-slate-800">
                  {Math.floor(ballsBowled / 6)}.{ballsBowled % 6}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Runs Conceded:</span>
                <span className="font-bold text-slate-800">{runsConceded}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Average:</span>
                <span className="font-bold text-slate-800">{bowlingAvg}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Economy:</span>
                <span className="font-bold text-slate-800">{bowlingEcon}</span>
              </div>
              {totalMaidens > 0 && (
                <div className="flex justify-between rounded-lg bg-blue-50 p-2">
                  <span className="text-slate-600">Maidens:</span>
                  <span className="font-bold text-slate-800">
                    {totalMaidens}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <span>✋</span>
              <span>Fielding</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between rounded-lg bg-green-50 p-2">
                <span className="text-slate-600">Catches:</span>
                <span className="font-bold text-slate-800">{totalCatches}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Run-outs:</span>
                <span className="font-bold text-slate-800">{totalRunOuts}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-50 p-2">
                <span className="text-slate-600">Stumpings:</span>
                <span className="font-bold text-slate-800">
                  {totalStumpings}
                </span>
              </div>
              <div className="mt-3 flex justify-between rounded-lg bg-blue-50 border-2 border-blue-200 p-2">
                <span className="font-semibold text-slate-700">Total:</span>
                <span className="font-bold text-blue-700">
                  {totalCatches + totalRunOuts + totalStumpings}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Match Performance */}
        {player.playerStats.length > 0 && (
          <section className="rounded-2xl bg-emerald-900/70 p-4 text-xs text-emerald-50">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
              Recent Match Performance
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {player.playerStats.slice(0, 10).map((stat) => {
                const matchDate = new Date(
                  stat.match.date
                ).toLocaleDateString();
                return (
                  <div
                    key={stat.id}
                    className="rounded-lg bg-emerald-950/50 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold">
                        {stat.match.teamA} vs {stat.match.teamB}
                      </span>
                      <span className="text-emerald-400">{matchDate}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      {stat.runs > 0 || stat.ballsFaced > 0 ? (
                        <div>
                          <span className="text-emerald-300">Batting:</span>{" "}
                          <span className="font-semibold">
                            {stat.runs} ({stat.ballsFaced})
                          </span>
                        </div>
                      ) : null}
                      {stat.ballsBowled > 0 ? (
                        <div>
                          <span className="text-emerald-300">Bowling:</span>{" "}
                          <span className="font-semibold">
                            {stat.wickets}/{stat.runsConceded} (
                            {Math.floor(stat.ballsBowled / 6)}.
                            {stat.ballsBowled % 6})
                          </span>
                        </div>
                      ) : null}
                      {stat.catches > 0 ||
                      stat.runOuts > 0 ||
                      stat.stumpings > 0 ? (
                        <div>
                          <span className="text-emerald-300">Fielding:</span>{" "}
                          <span className="font-semibold">
                            {stat.catches + stat.runOuts + stat.stumpings}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-emerald-900/70 p-3 text-xs text-emerald-50">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
            Badges
          </div>
          <BadgeDisplay
            badges={player.badges.map((b) => ({
              id: b.id,
              type: b.type,
              unlockedAt: b.unlockedAt.toISOString(),
            }))}
          />
        </section>
      </main>
    </div>
  );
}
