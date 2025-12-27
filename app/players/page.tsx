import Link from "next/link";
import { DeletePlayerButton } from "@/components/DeletePlayerButton";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";

export default async function PlayersPage() {
  const players = await prisma.player.findMany({
    include: {
      playerStats: true,
      badges: true,
      manOfMatchFor: {
        where: {
          status: "COMPLETED",
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Calculate aggregated stats for each player
  const playersWithStats = players.map((player) => {
    const totalRuns = player.playerStats.reduce((sum, s) => sum + s.runs, 0);
    const totalBallsFaced = player.playerStats.reduce(
      (sum, s) => sum + s.ballsFaced,
      0
    );
    const totalWickets = player.playerStats.reduce(
      (sum, s) => sum + s.wickets,
      0
    );
    const totalBallsBowled = player.playerStats.reduce(
      (sum, s) => sum + s.ballsBowled,
      0
    );
    const totalRunsConceded = player.playerStats.reduce(
      (sum, s) => sum + s.runsConceded,
      0
    );
    const totalWides = player.playerStats.reduce(
      (sum, s) => sum + s.wides,
      0
    );
    const totalNoBalls = player.playerStats.reduce(
      (sum, s) => sum + s.noBalls,
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
    const totalInnings = player.playerStats.length;

    // Calculate averages
    const battingAvg =
      totalInnings > 0 ? (totalRuns / totalInnings).toFixed(1) : "-";
    const strikeRate =
      totalBallsFaced > 0
        ? ((totalRuns / totalBallsFaced) * 100).toFixed(1)
        : "-";
    const economy =
      totalBallsBowled > 0
        ? (totalRunsConceded / (totalBallsBowled / 6)).toFixed(2)
        : "-";

    return {
      id: player.id,
      name: player.name,
      totalRuns,
      totalBallsFaced,
      totalWickets,
      totalBallsBowled,
      totalRunsConceded,
      totalWides,
      totalNoBalls,
      totalCatches,
      totalRunOuts,
      totalStumpings,
      totalMatches,
      totalInnings,
      battingAvg,
      strikeRate,
      economy,
      momCount: player.manOfMatchFor.length,
      badgeCount: player.badges.length,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
          <div className="mb-3">
            <BackButton href="/" label="Home" />
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <span>👥</span>
            <span>Players</span>
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            All players with career statistics
          </p>
        </header>

        <div className="space-y-3">
          {playersWithStats.map((player) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="block rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800">
                      {player.name}
                    </h2>
                    {player.momCount > 0 && (
                      <span className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                        ⭐ {player.momCount} MOM
                      </span>
                    )}
                    {player.badgeCount > 0 && (
                      <span className="rounded-full bg-gradient-to-r from-purple-500 to-purple-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                        🏆 {player.badgeCount}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-blue-50 p-2">
                      <div className="text-slate-600">🏏 Batting</div>
                      <div className="mt-0.5 font-bold text-slate-800">
                        {player.totalRuns} runs
                      </div>
                      {player.totalBallsFaced > 0 && (
                        <div className="text-[10px] text-slate-500">
                          SR: {player.strikeRate}
                        </div>
                      )}
                    </div>
                    {(player.totalWickets > 0 ||
                      player.totalBallsBowled > 0 ||
                      player.totalWides > 0 ||
                      player.totalNoBalls > 0) && (
                      <div className="rounded-lg bg-orange-50 p-2">
                        <div className="text-slate-600">🎾 Bowling</div>
                        {player.totalWickets > 0 ? (
                          <div className="mt-0.5 font-bold text-slate-800">
                            {player.totalWickets} wickets
                          </div>
                        ) : (
                          <div className="mt-0.5 font-bold text-slate-800">
                            {player.totalBallsBowled > 0
                              ? `${Math.floor(player.totalBallsBowled / 6)}.${player.totalBallsBowled % 6} overs`
                              : "0 overs"}
                          </div>
                        )}
                        {player.totalBallsBowled > 0 && (
                          <div className="text-[10px] text-slate-500">
                            Econ: {player.economy}
                          </div>
                        )}
                        {(player.totalWides > 0 || player.totalNoBalls > 0) && (
                          <div className="mt-1 text-[10px] text-slate-500">
                            W: {player.totalWides} | NB: {player.totalNoBalls}
                          </div>
                        )}
                      </div>
                    )}
                    {(player.totalCatches > 0 ||
                      player.totalRunOuts > 0 ||
                      player.totalStumpings > 0) && (
                      <div className="rounded-lg bg-green-50 p-2">
                        <div className="text-slate-600">✋ Fielding</div>
                        <div className="mt-0.5 font-bold text-slate-800">
                          {player.totalCatches +
                            player.totalRunOuts +
                            player.totalStumpings}{" "}
                          dismissals
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="text-slate-600">📊 Matches</div>
                      <div className="mt-0.5 font-bold text-slate-800">
                        {player.totalMatches}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <DeletePlayerButton
                    playerId={player.id}
                    playerName={player.name}
                  />
                  <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {playersWithStats.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-md">
            <p className="text-slate-500">No players found. 🏏</p>
          </div>
        )}
      </main>
    </div>
  );
}
