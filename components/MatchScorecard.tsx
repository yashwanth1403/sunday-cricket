"use client";

import { useMemo, useState } from "react";

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
  bowlerId: string;
  strikerChanged?: boolean;
  wicketType?: string;
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

interface MatchScorecardProps {
  battingTeamName: string;
  bowlingTeamName: string;
  score: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  totalOvers: number;
  targetRuns: number | null;
  inningsNumber: number;
  striker?: BatterAgg;
  nonStriker?: BatterAgg;
  bowler?: BowlerAgg;
  balls: BallLike[];
  players: Player[];
}

function oversFromBalls(overs: number, ballsInOver: number): string {
  return `${overs}.${ballsInOver}`;
}

function calculateRunRate(
  runs: number,
  overs: number,
  ballsInOver: number
): number {
  const totalBalls = overs * 6 + ballsInOver;
  if (totalBalls === 0) return 0;
  return (runs / totalBalls) * 6;
}

function calculatePartnership(
  striker: BatterAgg | undefined,
  nonStriker: BatterAgg | undefined,
  balls: BallLike[]
): {
  runs: number;
  balls: number;
  strikerRuns: number;
  nonStrikerRuns: number;
} {
  if (!striker || !nonStriker)
    return { runs: 0, balls: 0, strikerRuns: 0, nonStrikerRuns: 0 };

  // Find when both batsmen started batting together
  const recentBalls = [...balls].reverse();
  let partnershipBalls = 0;
  let partnershipRuns = 0;
  let strikerRuns = 0;
  let nonStrikerRuns = 0;

  // Track runs for each batsman in partnership
  for (const ball of recentBalls) {
    if (ball.batsmanId === striker.id || ball.batsmanId === nonStriker.id) {
      if (!ball.isWide) partnershipBalls++;
      let ballRuns = ball.runs;
      if (ball.isWide || ball.isNoBall) ballRuns += 1;
      partnershipRuns += ballRuns;

      if (ball.batsmanId === striker.id) {
        strikerRuns += ballRuns;
      } else {
        nonStrikerRuns += ballRuns;
      }
    }
  }

  return {
    runs: partnershipRuns,
    balls: partnershipBalls,
    strikerRuns,
    nonStrikerRuns,
  };
}

function getExtras(balls: BallLike[]): {
  total: number;
  wides: number;
  noBalls: number;
  bonus: number;
} {
  let wides = 0;
  let noBalls = 0;
  let bonus = 0;
  let illegalStreak = 0;

  for (const ball of balls) {
    if (ball.isWide) {
      wides++;
      illegalStreak++;
    } else if (ball.isNoBall) {
      noBalls++;
      illegalStreak++;
    } else {
      illegalStreak = 0;
    }

    // Bonus run for 2 consecutive illegal balls
    if (illegalStreak >= 2) {
      bonus++;
    }
  }

  return {
    total: wides + noBalls + bonus,
    wides,
    noBalls,
    bonus,
  };
}

function getFallOfWickets(
  balls: BallLike[],
  players: Player[]
): Array<{
  wicket: number;
  score: number;
  batsman: string;
  over: string;
  dismissal: string;
  bowler?: string;
}> {
  const fow: Array<{
    wicket: number;
    score: number;
    batsman: string;
    over: string;
    dismissal: string;
    bowler?: string;
  }> = [];

  let currentScore = 0;
  let wicketCount = 0;

  for (const ball of balls) {
    let ballRuns = ball.runs;
    if (ball.isWide || ball.isNoBall) ballRuns += 1;
    currentScore += ballRuns;

    if (ball.isWicket) {
      wicketCount++;
      const batsman = players.find((p) => p.id === ball.batsmanId);
      const bowler = players.find((p) => p.id === ball.bowlerId);
      const dismissal = ball.wicketType || "OUT";

      fow.push({
        wicket: wicketCount,
        score: currentScore,
        batsman: batsman?.name || "Unknown",
        over: `${ball.overNumber}.${ball.ballNumber}`,
        dismissal,
        bowler: bowler?.name,
      });
    }
  }

  return fow;
}

function getOverStats(balls: BallLike[], players: Player[]) {
  const overMap = new Map<
    number,
    {
      overNumber: number;
      bowler: string;
      runs: number;
      wickets: number;
      balls: BallLike[];
      extras: number;
    }
  >();

  for (const ball of balls) {
    if (!overMap.has(ball.overNumber)) {
      const bowler = players.find((p) => p.id === ball.bowlerId);
      overMap.set(ball.overNumber, {
        overNumber: ball.overNumber,
        bowler: bowler?.name || "Unknown",
        runs: 0,
        wickets: 0,
        balls: [],
        extras: 0,
      });
    }

    const over = overMap.get(ball.overNumber)!;
    over.balls.push(ball);
    let ballRuns = ball.runs;
    if (ball.isWide || ball.isNoBall) {
      ballRuns += 1;
      over.extras++;
    }
    over.runs += ballRuns;
    if (ball.isWicket) over.wickets++;
  }

  return Array.from(overMap.values()).sort(
    (a, b) => b.overNumber - a.overNumber
  );
}

function renderBallSymbol(ball: BallLike): string {
  if (ball.isWicket) return "W";
  if (ball.isWide) return "Wd";
  if (ball.isNoBall) return "Nb";
  return String(ball.runs);
}

function getCurrentOver(balls: BallLike[], currentOver: number): BallLike[] {
  return balls.filter((b) => b.overNumber === currentOver);
}

export function MatchScorecard({
  battingTeamName,
  bowlingTeamName,
  score,
  totalOvers,
  targetRuns,
  inningsNumber,
  striker,
  nonStriker,
  bowler,
  balls,
  players,
}: MatchScorecardProps) {
  const [showPerOverStats, setShowPerOverStats] = useState(false);

  const displayOvers = oversFromBalls(score.overs, score.ballsInOver);
  const runRate = calculateRunRate(
    score.totalRuns,
    score.overs,
    score.ballsInOver
  );
  const requiredRunRate =
    targetRuns !== null && score.overs < totalOvers
      ? calculateRunRate(
          targetRuns - score.totalRuns,
          totalOvers - score.overs,
          score.ballsInOver === 0 ? 6 : 6 - score.ballsInOver
        )
      : null;

  const partnership = calculatePartnership(striker, nonStriker, balls);
  const extras = getExtras(balls);
  const fallOfWickets = getFallOfWickets(balls, players);
  const overStats = getOverStats(balls, players);
  const currentOverBalls = getCurrentOver(balls, score.overs);

  // Calculate full batting card
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

      if (ball.isWicket && ball.batsmanId === player.id) {
        stats.isOut = true;
        stats.wicketType = ball.wicketType || "OUT";
        stats.scoreAtWicket = stats.runs;
        stats.overAtWicket = ball.overNumber;
      }
    }

    return Array.from(card.values());
  }, [balls, players]);

  // Calculate full bowling card
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
      if (!bowlerOverRuns.has(player.id)) {
        bowlerOverRuns.set(player.id, new Map());
      }
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

    return Array.from(card.values());
  }, [balls, players]);

  const strikerSr =
    striker && striker.ballsFaced > 0
      ? ((striker.runs / striker.ballsFaced) * 100).toFixed(1)
      : "0.0";
  const nonStrikerSr =
    nonStriker && nonStriker.ballsFaced > 0
      ? ((nonStriker.runs / nonStriker.ballsFaced) * 100).toFixed(1)
      : "0.0";
  const bowlerEconomy =
    bowler && bowler.ballsBowled > 0
      ? (bowler.runsConceded / (bowler.ballsBowled / 6)).toFixed(2)
      : "0.00";
  const bowlerOvers = bowler
    ? `${Math.floor(bowler.ballsBowled / 6)}.${bowler.ballsBowled % 6}`
    : "0.0";

  const ballsRemaining = totalOvers * 6 - (score.overs * 6 + score.ballsInOver);
  const runsNeeded =
    targetRuns !== null ? Math.max(0, targetRuns - score.totalRuns) : null;

  // Match status
  const matchStatus =
    inningsNumber === 1
      ? "LIVE 🔴"
      : targetRuns !== null
      ? "LIVE 🔴"
      : "COMPLETED 🏁";

  return (
    <div className="space-y-4">
      {/* 1. Top Header */}
      <div className="sticky top-0 z-10 border-b-2 border-zinc-300 bg-white pb-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">
                {battingTeamName}
              </h2>
              <span className="text-sm font-semibold text-red-600">
                {matchStatus}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-zinc-900">
                {score.totalRuns}/{score.wickets}
              </span>
              <span className="text-sm text-zinc-600">
                ({displayOvers} / {totalOvers})
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-zinc-500">
              Run Rate (CRR)
            </div>
            <div className="text-xl font-bold text-zinc-900">
              {runRate.toFixed(2)}
            </div>
            {requiredRunRate !== null && requiredRunRate > 0 && (
              <>
                <div className="mt-1 text-xs font-medium text-zinc-500">
                  Required (RRR)
                </div>
                <div className="text-lg font-semibold text-emerald-600">
                  {requiredRunRate.toFixed(2)}
                </div>
              </>
            )}
            {targetRuns !== null && (
              <div className="mt-1 text-xs text-zinc-600">
                Target: {targetRuns}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Current Batsmen */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Current Batsmen
        </div>
        {striker ? (
          <div className="flex items-center justify-between rounded-md bg-emerald-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">
                {striker.name}
              </span>
              <span className="text-emerald-600">●</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-bold text-zinc-900">{striker.runs}</span>
              <span className="text-zinc-600">({striker.ballsFaced})</span>
              <span className="text-zinc-500">{striker.fours}×4</span>
              <span className="text-zinc-500">{striker.sixes}×6</span>
              <span className="text-zinc-500">SR: {strikerSr}</span>
            </div>
          </div>
        ) : null}
        {nonStriker ? (
          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
            <span className="font-medium text-zinc-800">{nonStriker.name}</span>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-zinc-800">
                {nonStriker.runs}
              </span>
              <span className="text-zinc-600">({nonStriker.ballsFaced})</span>
              <span className="text-zinc-500">{nonStriker.fours}×4</span>
              <span className="text-zinc-500">{nonStriker.sixes}×6</span>
              <span className="text-zinc-500">SR: {nonStrikerSr}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Current Bowler */}
      {bowler && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Current Bowler
          </div>
          <div className="flex items-center justify-between rounded-md bg-white px-3 py-2">
            <div>
              <span className="font-semibold text-zinc-900">{bowler.name}</span>
              <span className="ml-2 text-xs text-zinc-600">
                ({bowlingTeamName})
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-zinc-600">{bowlerOvers}</span>
              <span className="font-semibold text-zinc-900">
                {bowler.runsConceded}/{bowler.wickets}
              </span>
              <span className="text-zinc-500">Econ: {bowlerEconomy}</span>
              {bowler.maidens > 0 && (
                <span className="text-zinc-500">M: {bowler.maidens}</span>
              )}
              {bowler.wides > 0 && (
                <span className="text-zinc-500">Wd: {bowler.wides}</span>
              )}
              {bowler.noBalls > 0 && (
                <span className="text-zinc-500">Nb: {bowler.noBalls}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Ball-by-Ball Timeline */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Ball-by-Ball Timeline
        </div>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {balls
            .slice(-20)
            .reverse()
            .map((ball) => {
              const batsman = players.find((p) => p.id === ball.batsmanId);
              const bowler = players.find((p) => p.id === ball.bowlerId);

              return (
                <div
                  key={ball.id}
                  className="flex items-center gap-2 rounded bg-white px-2 py-1 text-xs"
                >
                  <span className="font-mono font-semibold text-zinc-600">
                    {ball.overNumber}.{ball.ballNumber}
                  </span>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
                      ball.isWicket
                        ? "bg-red-100 text-red-700"
                        : ball.isWide || ball.isNoBall
                        ? "bg-amber-100 text-amber-700"
                        : ball.runs === 4 || ball.runs === 6
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {renderBallSymbol(ball)}
                  </span>
                  <span className="text-zinc-700">
                    {batsman?.name} {ball.runs > 0 && `scored ${ball.runs}`}
                    {ball.isWicket && ` out (${ball.wicketType || "OUT"})`}
                    {ball.isWide && " wide"}
                    {ball.isNoBall && " no-ball"}
                  </span>
                  {ball.isWicket && bowler && (
                    <span className="text-zinc-500">b {bowler.name}</span>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* 5. Recent Over Summary */}
      {overStats.length > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Recent Overs
          </div>
          <div className="space-y-2">
            {overStats.slice(0, 5).map((over) => (
              <div
                key={over.overNumber}
                className="flex items-center justify-between rounded-md bg-white px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-600">
                    Over {over.overNumber}:
                  </span>
                  <div className="flex gap-1">
                    {over.balls.map((ball) => (
                      <span
                        key={ball.id}
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
                          ball.isWicket
                            ? "bg-red-100 text-red-700"
                            : ball.isWide || ball.isNoBall
                            ? "bg-amber-100 text-amber-700"
                            : ball.runs === 4 || ball.runs === 6
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {renderBallSymbol(ball)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm font-medium text-zinc-900">
                  {over.runs} runs
                  {over.wickets > 0 && (
                    <span className="ml-1 text-red-600">({over.wickets}W)</span>
                  )}
                  {over.extras > 0 && (
                    <span className="ml-1 text-amber-600">
                      ({over.extras}E)
                    </span>
                  )}
                  <span className="ml-2 text-xs text-zinc-500">
                    b {over.bowler}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Live Over (Current Over) */}
      {currentOverBalls.length > 0 && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            This Over ({score.overs})
          </div>
          <div className="flex gap-1">
            {currentOverBalls.map((ball) => (
              <span
                key={ball.id}
                className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                  ball.isWicket
                    ? "bg-red-200 text-red-800"
                    : ball.isWide || ball.isNoBall
                    ? "bg-amber-200 text-amber-800"
                    : ball.runs === 4 || ball.runs === 6
                    ? "bg-emerald-200 text-emerald-800"
                    : ball.runs === 0
                    ? "bg-zinc-300 text-zinc-700"
                    : "bg-blue-200 text-blue-800"
                }`}
              >
                {renderBallSymbol(ball)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 7. Extras Breakdown */}
      {extras.total > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Extras: {extras.total}
          </div>
          <div className="flex gap-4 text-sm text-zinc-700">
            <span>Wides: {extras.wides}</span>
            <span>No-balls: {extras.noBalls}</span>
            {extras.bonus > 0 && (
              <span className="text-amber-600">Bonus: {extras.bonus}</span>
            )}
          </div>
        </div>
      )}

      {/* 8. Partnership Info */}
      {partnership.runs > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Partnership: {partnership.runs} runs ({partnership.balls} balls)
          </div>
          <div className="text-sm text-zinc-700">
            {striker?.name}: {partnership.strikerRuns} (
            {striker?.ballsFaced || 0}) • {nonStriker?.name}:{" "}
            {partnership.nonStrikerRuns} ({nonStriker?.ballsFaced || 0})
          </div>
        </div>
      )}

      {/* 9. Innings Summary */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Innings Summary
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-zinc-600">Total:</span>{" "}
            <span className="font-semibold">
              {score.totalRuns}/{score.wickets}
            </span>
          </div>
          <div>
            <span className="text-zinc-600">Overs:</span>{" "}
            <span className="font-semibold">{displayOvers}</span>
          </div>
          <div>
            <span className="text-zinc-600">Run Rate:</span>{" "}
            <span className="font-semibold">{runRate.toFixed(2)}</span>
          </div>
          {runsNeeded !== null && (
            <div>
              <span className="text-zinc-600">Need:</span>{" "}
              <span className="font-semibold text-emerald-600">
                {runsNeeded} runs
              </span>
            </div>
          )}
          {ballsRemaining > 0 && (
            <div>
              <span className="text-zinc-600">Balls left:</span>{" "}
              <span className="font-semibold">{ballsRemaining}</span>
            </div>
          )}
        </div>
      </div>

      {/* 10. Fall of Wickets */}
      {fallOfWickets.length > 0 && (
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Fall of Wickets
          </div>
          <div className="space-y-1">
            {fallOfWickets.map((fow) => (
              <div key={fow.wicket} className="text-sm text-zinc-700">
                {fow.wicket}-{fow.score} ({fow.batsman}, {fow.over} ov)
                {fow.bowler && ` b {fow.bowler}`}
                {fow.dismissal && ` - {fow.dismissal}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 11. Full Batting Card */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Batting Card
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="px-2 py-1 text-left">Batsman</th>
                <th className="px-2 py-1 text-right">R</th>
                <th className="px-2 py-1 text-right">B</th>
                <th className="px-2 py-1 text-right">4s</th>
                <th className="px-2 py-1 text-right">6s</th>
                <th className="px-2 py-1 text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              {battingCard.map((player) => {
                const sr =
                  player.ballsFaced > 0
                    ? ((player.runs / player.ballsFaced) * 100).toFixed(1)
                    : "0.0";
                return (
                  <tr
                    key={player.id}
                    className={`border-b border-zinc-200 ${
                      player.id === striker?.id ? "bg-emerald-50" : ""
                    }`}
                  >
                    <td className="px-2 py-1">
                      {player.name}
                      {player.id === striker?.id && (
                        <span className="ml-1 text-emerald-600">●</span>
                      )}
                      {player.isOut && (
                        <span className="ml-1 text-xs text-red-600">
                          ({player.wicketType})
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold">
                      {player.runs}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {player.ballsFaced}
                    </td>
                    <td className="px-2 py-1 text-right">{player.fours}</td>
                    <td className="px-2 py-1 text-right">{player.sixes}</td>
                    <td className="px-2 py-1 text-right">{sr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 12. Full Bowling Card */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Bowling Card
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-300">
                <th className="px-2 py-1 text-left">Bowler</th>
                <th className="px-2 py-1 text-right">O</th>
                <th className="px-2 py-1 text-right">M</th>
                <th className="px-2 py-1 text-right">R</th>
                <th className="px-2 py-1 text-right">W</th>
                <th className="px-2 py-1 text-right">Econ</th>
                <th className="px-2 py-1 text-right">Wd</th>
                <th className="px-2 py-1 text-right">Nb</th>
              </tr>
            </thead>
            <tbody>
              {bowlingCard.map((player) => {
                const overs = `${Math.floor(player.ballsBowled / 6)}.${
                  player.ballsBowled % 6
                }`;
                const economy =
                  player.ballsBowled > 0
                    ? (player.runsConceded / (player.ballsBowled / 6)).toFixed(
                        2
                      )
                    : "0.00";
                return (
                  <tr
                    key={player.id}
                    className={`border-b border-zinc-200 ${
                      player.id === bowler?.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-2 py-1">
                      {player.name}
                      {player.id === bowler?.id && (
                        <span className="ml-1 text-blue-600">●</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right">{overs}</td>
                    <td className="px-2 py-1 text-right">{player.maidens}</td>
                    <td className="px-2 py-1 text-right">
                      {player.runsConceded}
                    </td>
                    <td className="px-2 py-1 text-right font-semibold">
                      {player.wickets}
                    </td>
                    <td className="px-2 py-1 text-right">{economy}</td>
                    <td className="px-2 py-1 text-right">{player.wides}</td>
                    <td className="px-2 py-1 text-right">{player.noBalls}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 13. Per-Over Stats Table */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <button
          type="button"
          onClick={() => setShowPerOverStats(!showPerOverStats)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-600"
        >
          <span>Per-Over Stats</span>
          <span>{showPerOverStats ? "▼" : "▶"}</span>
        </button>
        {showPerOverStats && (
          <div className="mt-2 space-y-2">
            {overStats.map((over) => (
              <div
                key={over.overNumber}
                className="rounded-md bg-white px-3 py-2 text-xs"
              >
                <div className="mb-1 font-semibold">
                  Over {over.overNumber} - {over.bowler}
                </div>
                <div className="flex gap-1">
                  {over.balls.map((ball) => (
                    <span
                      key={ball.id}
                      className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold ${
                        ball.isWicket
                          ? "bg-red-100 text-red-700"
                          : ball.isWide || ball.isNoBall
                          ? "bg-amber-100 text-amber-700"
                          : ball.runs === 4 || ball.runs === 6
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {renderBallSymbol(ball)}
                    </span>
                  ))}
                </div>
                <div className="mt-1 text-zinc-600">
                  {over.runs} runs, {over.wickets} wickets, {over.extras} extras
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 14. Match Situation */}
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Match Situation
        </div>
        <div className="space-y-1 text-sm text-zinc-700">
          {runsNeeded !== null && (
            <div>
              <span className="font-semibold">Required:</span> {runsNeeded} runs
              from {ballsRemaining} balls
            </div>
          )}
          {requiredRunRate !== null && requiredRunRate > 0 && (
            <div>
              <span className="font-semibold">Required Run Rate:</span>{" "}
              {requiredRunRate.toFixed(2)}
            </div>
          )}
          <div>
            <span className="font-semibold">Current Run Rate:</span>{" "}
            {runRate.toFixed(2)}
          </div>
          {runsNeeded !== null && requiredRunRate !== null && (
            <div
              className={`font-semibold ${
                requiredRunRate <= runRate ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {requiredRunRate <= runRate
                ? "Ahead of required rate"
                : "Behind required rate"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
