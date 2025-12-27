import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { PlayerMatchesList } from "@/components/PlayerMatchesList";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ date?: string; minRuns?: string; maxRuns?: string }>;
}

export default async function PlayerMatchesPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const params_search = await searchParams;

  const player = await prisma.player.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });

  if (!player) {
    notFound();
  }

  // Build filter conditions
  const whereClause: Prisma.PlayerMatchStatsWhereInput = {
    playerId: id,
  };

  // Date filter
  if (params_search.date) {
    const filterDate = new Date(params_search.date);
    const startOfDay = new Date(filterDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(filterDate);
    endOfDay.setHours(23, 59, 59, 999);

    whereClause.match = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    };
  }

  // Runs filter
  if (params_search.minRuns || params_search.maxRuns) {
    whereClause.runs = {};
    if (params_search.minRuns) {
      whereClause.runs.gte = parseInt(params_search.minRuns);
    }
    if (params_search.maxRuns) {
      whereClause.runs.lte = parseInt(params_search.maxRuns);
    }
  }

  // Fetch player stats with match and innings data
  const playerStats = await prisma.playerMatchStats.findMany({
    where: whereClause,
    include: {
      match: {
        select: {
          id: true,
          name: true,
          date: true,
          teamA: true,
          teamB: true,
          status: true,
          winner: true,
        },
      },
      innings: {
        select: {
          id: true,
          inningsNumber: true,
          battingTeam: true,
          bowlingTeam: true,
        },
      },
    },
    orderBy: {
      match: {
        date: "desc",
      },
    },
  });

  // Group stats by match (since a player can have stats in both innings)
  const matchesMap = new Map<
    string,
    {
      match: {
        id: string;
        name: string;
        date: string;
        teamA: string;
        teamB: string;
        status: string;
        winner: string | null;
      };
      innings: Array<{
        inningsNumber: number;
        battingTeam: string;
        bowlingTeam: string;
        runs: number;
        ballsFaced: number;
        wickets: number;
        ballsBowled: number;
        runsConceded: number;
        wides: number;
        noBalls: number;
        catches: number;
        runOuts: number;
        stumpings: number;
        fours: number;
        sixes: number;
      }>;
    }
  >();

  for (const stat of playerStats) {
    const matchId = stat.matchId;
    if (!matchesMap.has(matchId)) {
      matchesMap.set(matchId, {
        match: {
          ...stat.match,
          date: stat.match.date.toISOString(),
        },
        innings: [],
      });
    }

    const matchData = matchesMap.get(matchId)!;
    matchData.innings.push({
      inningsNumber: stat.innings.inningsNumber,
      battingTeam: stat.innings.battingTeam,
      bowlingTeam: stat.innings.bowlingTeam,
      runs: stat.runs,
      ballsFaced: stat.ballsFaced,
      wickets: stat.wickets,
      ballsBowled: stat.ballsBowled,
      runsConceded: stat.runsConceded,
      wides: stat.wides,
      noBalls: stat.noBalls,
      catches: stat.catches,
      runOuts: stat.runOuts,
      stumpings: stat.stumpings,
      fours: stat.fours,
      sixes: stat.sixes,
    });
  }

  // Sort innings within each match
  for (const matchData of matchesMap.values()) {
    matchData.innings.sort((a, b) => a.inningsNumber - b.inningsNumber);
  }

  const matches = Array.from(matchesMap.values());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-4 sm:py-6">
        <header className="mb-6">
          <Link
            href={`/players/${id}`}
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
            Back to {player.name}
          </Link>
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              <span>📊</span>
              <span>{player.name}'s Matches</span>
            </h1>
            <p className="mt-1 text-sm text-blue-100">
              All matches with detailed innings statistics
            </p>
          </div>
        </header>

        <PlayerMatchesList
          matches={matches}
          playerId={id}
          currentFilters={params_search}
        />
      </main>
    </div>
  );
}

