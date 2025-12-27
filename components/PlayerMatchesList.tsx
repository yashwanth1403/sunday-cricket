"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

// Helper function to format date consistently (avoiding hydration mismatch)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

interface MatchData {
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

interface PlayerMatchesListProps {
  matches: MatchData[];
  playerId: string;
  currentFilters: {
    date?: string;
    minRuns?: string;
    maxRuns?: string;
  };
}

export function PlayerMatchesList({
  matches,
  playerId,
  currentFilters,
}: PlayerMatchesListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dateValue, setDateValue] = useState(currentFilters.date || "");
  const [minRuns, setMinRuns] = useState(currentFilters.minRuns || "");
  const [maxRuns, setMaxRuns] = useState(currentFilters.maxRuns || "");

  useEffect(() => {
    setDateValue(currentFilters.date || "");
    setMinRuns(currentFilters.minRuns || "");
    setMaxRuns(currentFilters.maxRuns || "");
  }, [currentFilters]);

  function updateFilters() {
    const params = new URLSearchParams(searchParams.toString());
    
    if (dateValue) {
      params.set("date", dateValue);
    } else {
      params.delete("date");
    }

    if (minRuns) {
      params.set("minRuns", minRuns);
    } else {
      params.delete("minRuns");
    }

    if (maxRuns) {
      params.set("maxRuns", maxRuns);
    } else {
      params.delete("maxRuns");
    }

    router.push(`/players/${playerId}/matches?${params.toString()}`);
  }

  function clearFilters() {
    setDateValue("");
    setMinRuns("");
    setMaxRuns("");
    router.push(`/players/${playerId}/matches`);
  }

  function getMatchRoute(matchId: string, status: string) {
    const statusStr = String(status).toUpperCase();
    return statusStr === "COMPLETED"
      ? `/matches/${matchId}/complete`
      : `/matches/${matchId}/live`;
  }

  const hasActiveFilters = dateValue || minRuns || maxRuns;

  return (
    <>
      {/* Filters */}
      <div className="mb-6 rounded-xl bg-white p-4 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Filters</h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="date-filter"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Date
            </label>
            <input
              id="date-filter"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              onBlur={updateFilters}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateFilters();
              }}
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label
              htmlFor="min-runs"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Min Runs
            </label>
            <input
              id="min-runs"
              type="number"
              min="0"
              value={minRuns}
              onChange={(e) => setMinRuns(e.target.value)}
              onBlur={updateFilters}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateFilters();
              }}
              placeholder="0"
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label
              htmlFor="max-runs"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Max Runs
            </label>
            <input
              id="max-runs"
              type="number"
              min="0"
              value={maxRuns}
              onChange={(e) => setMaxRuns(e.target.value)}
              onBlur={updateFilters}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateFilters();
              }}
              placeholder="∞"
              className="w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Matches List */}
      {matches.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-slate-500">
            No matches found {hasActiveFilters ? "with current filters" : ""}. 🏏
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((matchData) => {
            const matchDate = formatDate(matchData.match.date);
            const winnerName =
              matchData.match.winner === "A"
                ? matchData.match.teamA
                : matchData.match.winner === "B"
                ? matchData.match.teamB
                : null;
            const matchRoute = getMatchRoute(
              matchData.match.id,
              matchData.match.status
            );

            // Calculate totals across both innings
            const totalRuns = matchData.innings.reduce(
              (sum, i) => sum + i.runs,
              0
            );
            const totalBallsFaced = matchData.innings.reduce(
              (sum, i) => sum + i.ballsFaced,
              0
            );
            const totalWickets = matchData.innings.reduce(
              (sum, i) => sum + i.wickets,
              0
            );
            const totalBallsBowled = matchData.innings.reduce(
              (sum, i) => sum + i.ballsBowled,
              0
            );
            const totalRunsConceded = matchData.innings.reduce(
              (sum, i) => sum + i.runsConceded,
              0
            );
            const totalWides = matchData.innings.reduce(
              (sum, i) => sum + i.wides,
              0
            );
            const totalNoBalls = matchData.innings.reduce(
              (sum, i) => sum + i.noBalls,
              0
            );
            const totalCatches = matchData.innings.reduce(
              (sum, i) => sum + i.catches,
              0
            );
            const totalRunOuts = matchData.innings.reduce(
              (sum, i) => sum + i.runOuts,
              0
            );
            const totalStumpings = matchData.innings.reduce(
              (sum, i) => sum + i.stumpings,
              0
            );
            const totalFours = matchData.innings.reduce(
              (sum, i) => sum + i.fours,
              0
            );
            const totalSixes = matchData.innings.reduce(
              (sum, i) => sum + i.sixes,
              0
            );

            return (
              <div
                key={matchData.match.id}
                className="rounded-2xl bg-white p-5 shadow-md transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <Link
                      href={matchRoute}
                      className="block hover:opacity-80"
                    >
                      <h3 className="text-lg font-bold text-slate-800">
                        {matchData.match.teamA} vs {matchData.match.teamB}
                      </h3>
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>📆 {matchDate}</span>
                      {winnerName && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-700">
                          🏆 {winnerName}
                        </span>
                      )}
                      {matchData.match.status !== "COMPLETED" && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700">
                          🔴 Live
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">
                      {totalRuns} runs
                    </div>
                    {totalBallsFaced > 0 && (
                      <div className="text-xs text-slate-500">
                        {totalBallsFaced} balls
                      </div>
                    )}
                  </div>
                </div>

                {/* Innings Breakdown */}
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  {matchData.innings.map((innings, idx) => {
                    const battingTeamName =
                      innings.battingTeam === "A"
                        ? matchData.match.teamA
                        : matchData.match.teamB;
                    const bowlingTeamName =
                      innings.bowlingTeam === "A"
                        ? matchData.match.teamA
                        : matchData.match.teamB;

                    return (
                      <div
                        key={idx}
                        className="rounded-lg bg-slate-50 p-3 text-xs"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="font-semibold text-slate-700">
                            Innings {innings.inningsNumber}: {battingTeamName} vs{" "}
                            {bowlingTeamName}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {innings.runs > 0 || innings.ballsFaced > 0 ? (
                            <div>
                              <span className="text-slate-600">🏏 Batting:</span>
                              <div className="font-semibold text-slate-800">
                                {innings.runs} ({innings.ballsFaced})
                              </div>
                              {(innings.fours > 0 || innings.sixes > 0) && (
                                <div className="text-[10px] text-slate-500">
                                  {innings.fours}×4, {innings.sixes}×6
                                </div>
                              )}
                            </div>
                          ) : null}
                          {innings.wickets > 0 || innings.ballsBowled > 0 ? (
                            <div>
                              <span className="text-slate-600">🎾 Bowling:</span>
                              <div className="font-semibold text-slate-800">
                                {innings.wickets}/{innings.runsConceded} (
                                {Math.floor(innings.ballsBowled / 6)}.
                                {innings.ballsBowled % 6})
                              </div>
                              {(innings.wides > 0 || innings.noBalls > 0) && (
                                <div className="text-[10px] text-slate-500">
                                  W:{innings.wides} NB:{innings.noBalls}
                                </div>
                              )}
                            </div>
                          ) : null}
                          {innings.catches > 0 ||
                          innings.runOuts > 0 ||
                          innings.stumpings > 0 ? (
                            <div>
                              <span className="text-slate-600">✋ Fielding:</span>
                              <div className="font-semibold text-slate-800">
                                {innings.catches + innings.runOuts + innings.stumpings}{" "}
                                dismissals
                              </div>
                              <div className="text-[10px] text-slate-500">
                                C:{innings.catches} RO:{innings.runOuts} S:
                                {innings.stumpings}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Match Totals */}
                <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs">
                  <div className="mb-1 font-semibold text-slate-700">
                    Match Totals:
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <span className="text-slate-600">Runs:</span>{" "}
                      <span className="font-semibold text-slate-800">
                        {totalRuns}
                      </span>
                    </div>
                    {totalWickets > 0 && (
                      <div>
                        <span className="text-slate-600">Wickets:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {totalWickets}
                        </span>
                      </div>
                    )}
                    {(totalWides > 0 || totalNoBalls > 0) && (
                      <div>
                        <span className="text-slate-600">Wides/NB:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {totalWides}/{totalNoBalls}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

