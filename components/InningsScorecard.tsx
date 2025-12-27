"use client";

import { useMemo } from "react";

type Player = {
  id: string;
  name: string;
  team: "A" | "B";
  isDualPlayer?: boolean;
};

type BallLike = {
  id: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  batsmanId: string;
  nonStrikerId?: string;
  bowlerId: string;
  strikerChanged?: boolean;
  wicketType?: string | null;
  fielderId?: string | null;
  dismissedBatsmanId?: string | null;
};

type BatterAgg = {
  id: string;
  name: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  isOut?: boolean;
  wicketType?: string;
  dismissedBy?: string;
  scoreAtWicket?: number;
  overAtWicket?: number;
};

type BowlerAgg = {
  id: string;
  name: string;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  wides: number;
  noBalls: number;
};

interface InningsScorecardProps {
  inningsNumber: number;
  battingTeamName: string;
  bowlingTeamName: string;
  score: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  totalOvers: number;
  targetRuns?: number | null;
  balls: BallLike[];
  players: Player[];
  isCompleted?: boolean;
}

function calculateStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return "0.00";
  return ((runs / balls) * 100).toFixed(2);
}

function calculateEconomy(runs: number, balls: number): string {
  if (balls === 0) return "0.00";
  return ((runs / balls) * 6).toFixed(2);
}

function formatOvers(overs: number, ballsInOver: number): string {
  return `${overs}.${ballsInOver}`;
}

function formatBowlerOvers(ballsBowled: number): string {
  return `${Math.floor(ballsBowled / 6)}.${ballsBowled % 6}`;
}

export function InningsScorecard({
  inningsNumber,
  battingTeamName,
  bowlingTeamName,
  score,
  totalOvers,
  targetRuns,
  balls,
  players,
  isCompleted = false,
}: InningsScorecardProps) {
  // Calculate batting card
  const battingCard = useMemo(() => {
    const card = new Map<string, BatterAgg>();

    for (const ball of balls) {
      const player = players.find((p) => p.id === ball.batsmanId);
      if (!player) continue;

      if (!card.has(player.id)) {
        card.set(player.id, {
          id: player.id,
          name: player.name,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
        });
      }

      const stats = card.get(player.id)!;
      if (!ball.isWide) stats.ballsFaced++;
      stats.runs += ball.runs;
      if (ball.runs === 4) stats.fours++;
      if (ball.runs === 6) stats.sixes++;

      if (ball.isWicket) {
        const dismissedId = ball.dismissedBatsmanId || ball.batsmanId;
        if (dismissedId === player.id) {
          stats.isOut = true;
          stats.wicketType = ball.wicketType || "OUT";
          stats.scoreAtWicket = stats.runs;
          stats.overAtWicket = ball.overNumber;
          
          // Find who dismissed them
          if (ball.wicketType === "RUN_OUT" && ball.fielderId) {
            const fielder = players.find((p) => p.id === ball.fielderId);
            if (fielder) stats.dismissedBy = fielder.name;
          } else if (ball.bowlerId) {
            const bowler = players.find((p) => p.id === ball.bowlerId);
            if (bowler) stats.dismissedBy = bowler.name;
          }
        }
      }
    }

    return Array.from(card.values()).sort((a, b) => {
      // Sort by batting order (who batted first) - approximate by first appearance
      return 0; // Keep original order for now
    });
  }, [balls, players]);

  // Calculate bowling card
  const bowlingCard = useMemo(() => {
    const card = new Map<string, BowlerAgg>();
    const bowlerOverRuns = new Map<string, Map<number, number>>();

    for (const ball of balls) {
      const player = players.find((p) => p.id === ball.bowlerId);
      if (!player) continue;

      if (!card.has(player.id)) {
        card.set(player.id, {
          id: player.id,
          name: player.name,
          ballsBowled: 0,
          runsConceded: 0,
          wickets: 0,
          maidens: 0,
          wides: 0,
          noBalls: 0,
        });
        bowlerOverRuns.set(player.id, new Map());
      }

      const stats = card.get(player.id)!;
      const isLegal = !ball.isWide && !ball.isNoBall;
      if (isLegal) stats.ballsBowled++;

      let ballRuns = ball.runs;
      if (ball.isWide) {
        ballRuns += 1;
        stats.wides++;
      }
      if (ball.isNoBall) {
        ballRuns += 1;
        stats.noBalls++;
      }

      stats.runsConceded += ballRuns;
      if (ball.isWicket) stats.wickets++;

      // Track runs per over for maidens
      const overMap = bowlerOverRuns.get(player.id)!;
      overMap.set(
        ball.overNumber,
        (overMap.get(ball.overNumber) ?? 0) + ballRuns
      );
    }

    // Calculate maidens
    for (const [playerId, overMap] of bowlerOverRuns.entries()) {
      const stats = card.get(playerId);
      if (stats) {
        for (const runs of overMap.values()) {
          if (runs === 0) stats.maidens++;
        }
      }
    }

    return Array.from(card.values()).sort((a, b) => {
      // Sort by wickets (desc), then economy (asc)
      if (b.wickets !== a.wickets) return b.wickets - a.wickets;
      const aEcon = parseFloat(calculateEconomy(a.runsConceded, a.ballsBowled));
      const bEcon = parseFloat(calculateEconomy(b.runsConceded, b.ballsBowled));
      return aEcon - bEcon;
    });
  }, [balls, players]);

  // Calculate extras
  const extras = useMemo(() => {
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;

    for (const ball of balls) {
      if (ball.isWide) wides++;
      if (ball.isNoBall) noBalls++;
      // Note: byes and leg byes would need additional fields in Ball model
    }

    return { wides, noBalls, byes, legByes, total: wides + noBalls + byes + legByes };
  }, [balls]);

  const displayOvers = formatOvers(score.overs, score.ballsInOver);
  const runRate = score.overs * 6 + score.ballsInOver > 0
    ? ((score.totalRuns / (score.overs * 6 + score.ballsInOver)) * 6).toFixed(2)
    : "0.00";

  return (
    <div className="w-full space-y-4 rounded-xl bg-white shadow-md overflow-hidden">
      {/* Header */}
      <div className="border-b-2 border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-3 sm:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 whitespace-nowrap">
                {inningsNumber === 1 ? "1st" : "2nd"} Innings
              </span>
              {!isCompleted && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                  LIVE
                </span>
              )}
            </div>
            <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900 truncate">
              {battingTeamName}
            </h3>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {score.totalRuns}
              <span className="text-base sm:text-lg text-slate-600">/{score.wickets}</span>
            </div>
            <div className="text-xs font-semibold text-slate-600">
              ({displayOvers} / {totalOvers} ov)
            </div>
            {targetRuns && inningsNumber === 2 && (
              <div className="mt-1 text-xs font-bold text-orange-600">
                Target: {targetRuns}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 sm:gap-4 text-xs text-slate-600 flex-wrap">
          <span className="whitespace-nowrap">RR: {runRate}</span>
          {extras.total > 0 && <span className="whitespace-nowrap">Extras: {extras.total}</span>}
        </div>
      </div>

      {/* Batting Card */}
      <div className="px-3 py-3 sm:px-4">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
          <span className="text-sm font-bold text-slate-700">Batting</span>
          <span className="text-xs text-slate-500">({battingCard.length})</span>
        </div>
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-white z-10 min-w-[120px]">Batter</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">R</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">B</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">4s</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">6s</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">SR</th>
                </tr>
              </thead>
              <tbody>
                {battingCard.map((batter) => {
                  const strikeRate = calculateStrikeRate(batter.runs, batter.ballsFaced);
                  return (
                    <tr
                      key={batter.id}
                      className={`border-b border-slate-100 ${
                        batter.isOut ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-2 py-2 sticky left-0 bg-white z-10 min-w-[120px]">
                        <div className="font-semibold text-slate-900">
                          {batter.name}
                          {batter.isOut && (
                            <span className="ml-1 text-red-600">✗</span>
                          )}
                        </div>
                        {batter.isOut && batter.dismissedBy && (
                          <div className="text-[10px] text-slate-500">
                            {batter.wicketType} b {batter.dismissedBy}
                            {batter.scoreAtWicket !== undefined && (
                              <span> ({batter.scoreAtWicket})</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {batter.runs}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap">
                        {batter.ballsFaced}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap">
                        {batter.fours}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap">
                        {batter.sixes}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {strikeRate}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bowling Card */}
      <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
          <span className="text-sm font-bold text-slate-700">Bowling</span>
          <span className="text-xs text-slate-500 truncate">({bowlingTeamName})</span>
        </div>
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-2 py-2 text-left font-semibold sticky left-0 bg-white z-10 min-w-[120px]">Bowler</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">O</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">M</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">R</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">W</th>
                  <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">ECON</th>
                </tr>
              </thead>
              <tbody>
                {bowlingCard.map((bowler) => {
                  const economy = calculateEconomy(bowler.runsConceded, bowler.ballsBowled);
                  const overs = formatBowlerOvers(bowler.ballsBowled);
                  return (
                    <tr key={bowler.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-900 sticky left-0 bg-white z-10 min-w-[120px]">
                        {bowler.name}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap">{overs}</td>
                      <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap">
                        {bowler.maidens}
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600 whitespace-nowrap">
                        {bowler.runsConceded}
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {bowler.wickets}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                        {economy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Extras Summary */}
      {extras.total > 0 && (
        <div className="border-t border-slate-200 px-3 py-2 sm:px-4 text-xs text-slate-600">
          <span className="font-semibold">Extras:</span>{" "}
          {extras.wides > 0 && <span className="whitespace-nowrap">w {extras.wides},</span>}
          {extras.noBalls > 0 && <span className="whitespace-nowrap">nb {extras.noBalls},</span>}
          {extras.byes > 0 && <span className="whitespace-nowrap">b {extras.byes},</span>}
          {extras.legByes > 0 && <span className="whitespace-nowrap">lb {extras.legByes}</span>}
          <span className="ml-1 font-bold whitespace-nowrap">({extras.total})</span>
        </div>
      )}
    </div>
  );
}

