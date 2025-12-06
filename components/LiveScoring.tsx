"use client";

import { useMemo, useState } from "react";
import { BallInputButtons } from "./BallInputButtons";
import { PreviousBallsDisplay } from "./PreviousBallsDisplay";
import { OverTimeline } from "./OverTimeline";
import { LiveStatsPanel } from "./LiveStatsPanel";
import { MatchScorecard } from "./MatchScorecard";
import { InningsCompleteModal } from "./InningsCompleteModal";

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

interface LiveScoringProps {
  matchId: string;
  inningsId: string;
  battingTeamName: string;
  bowlingTeamName: string;
  battingSide: "A" | "B";
  bowlingSide: "A" | "B";
  players: Player[];
  initialBalls: BallLike[];
  totalOvers: number;
  inningsNumber: number;
  targetRuns: number | null;
  initialScore: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
}

export function LiveScoring({
  matchId,
  inningsId,
  battingTeamName,
  bowlingTeamName,
  battingSide,
  bowlingSide,
  players,
  initialBalls,
  totalOvers,
  inningsNumber,
  targetRuns,
  initialScore,
}: LiveScoringProps) {
  const [balls, setBalls] = useState<BallLike[]>(initialBalls);
  const [score, setScore] = useState(initialScore);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showInningsCompleteModal, setShowInningsCompleteModal] =
    useState(false);
  const [completingInnings, setCompletingInnings] = useState(false);
  const [inningsCompleteData, setInningsCompleteData] = useState<{
    isAllOut: boolean;
    isOversComplete: boolean;
    isTargetReached?: boolean;
    inningsNumber: number;
  } | null>(null);

  const battingPlayers = useMemo(() => {
    const teamPlayers = players.filter((p) => p.team === battingSide);
    const dualPlayers = players.filter(
      (p) => p.isDualPlayer && p.team !== battingSide
    );
    return [...teamPlayers, ...dualPlayers];
  }, [players, battingSide]);

  const bowlingPlayers = useMemo(() => {
    const teamPlayers = players.filter((p) => p.team === bowlingSide);
    const dualPlayers = players.filter(
      (p) => p.isDualPlayer && p.team !== bowlingSide
    );
    return [...teamPlayers, ...dualPlayers];
  }, [players, bowlingSide]);

  const [strikerId, setStrikerId] = useState<string | undefined>(
    battingPlayers[0]?.id
  );
  const [nonStrikerId, setNonStrikerId] = useState<string | undefined>(
    battingPlayers[1]?.id ?? battingPlayers[0]?.id
  );
  const [bowlerId, setBowlerId] = useState<string | undefined>(
    bowlingPlayers[0]?.id
  );

  const striker = battingPlayers.find((p) => p.id === strikerId);
  const nonStriker = battingPlayers.find((p) => p.id === nonStrikerId);
  const bowler = bowlingPlayers.find((p) => p.id === bowlerId);

  async function sendBall(payload: {
    runs: number;
    isWide?: boolean;
    isNoBall?: boolean;
    isWicket?: boolean;
    wicketType?: string;
    fielderId?: string;
    dismissedBatsmanId?: string;
  }) {
    if (!striker || !nonStriker || !bowler) {
      setError("Select striker, non-striker, and bowler before scoring");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prevScore = score;
      const res = await fetch(
        `/api/matches/${matchId}/innings/${inningsId}/ball`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batsmanId: striker.id,
            nonStrikerId: nonStriker.id,
            bowlerId: bowler.id,
            runs: payload.runs ?? 0,
            isWide: payload.isWide ?? false,
            isNoBall: payload.isNoBall ?? false,
            isWicket: payload.isWicket ?? false,
            wicketType: payload.wicketType,
            fielderId: payload.fielderId,
            dismissedBatsmanId: payload.dismissedBatsmanId,
          }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to record ball");
      }
      const data = await res.json();
      const ball = data.ball as BallLike & { strikerChanged?: boolean };
      console.log("ball", ball);
      setBalls((prev) => [...prev, ball]);

      // Check if innings can be completed (user must confirm)
      if (data.canCompleteInnings) {
        setInningsCompleteData({
          isAllOut: data.isAllOut,
          isOversComplete: data.isOversComplete,
          isTargetReached: data.isTargetReached,
          inningsNumber: data.inningsNumber,
        });
        setShowInningsCompleteModal(true);
        setLoading(false);
        return;
      }

      // Handle wicket dismissal - reset the dismissed batsman
      if (ball.isWicket) {
        const dismissedId = ball.dismissedBatsmanId || ball.batsmanId; // Use ball's dismissedBatsmanId or default to striker
        const nextBatsman = battingPlayers.find(
          (p) => p.id !== strikerId && p.id !== nonStrikerId
        );

        if (dismissedId === strikerId) {
          // Striker was dismissed
          if (nextBatsman) {
            // Move non-striker to striker, new batsman to non-striker
            setStrikerId(nonStrikerId);
            setNonStrikerId(nextBatsman.id);
          } else {
            // No more batsmen, just swap positions
            setStrikerId(nonStrikerId);
          }
        } else if (dismissedId === nonStrikerId) {
          // Non-striker was dismissed, replace with next batsman
          if (nextBatsman) {
            setNonStrikerId(nextBatsman.id);
          }
        } else {
          // Fallback: striker is dismissed (shouldn't happen, but just in case)
          if (nextBatsman) {
            setStrikerId(nonStrikerId);
            setNonStrikerId(nextBatsman.id);
          } else {
            setStrikerId(nonStrikerId);
          }
        }
      }

      // Per-ball strike rotation: odd runs (1, 3) and extras (wide, no-ball) change strike
      // The backend calculates strikerChanged based on runs and extras
      if (ball.strikerChanged && striker && nonStriker && !ball.isWicket) {
        // Swap striker and non-striker for odd runs or extras (but not after wicket)
        setStrikerId(nonStriker.id);
        setNonStrikerId(striker.id);
      }

      const overCompleted =
        data.innings.overs > prevScore.overs ||
        (prevScore.ballsInOver === 5 &&
          data.innings.ballsInOver === 0 &&
          data.innings.overs === prevScore.overs + 1);

      // End-of-over rotation: swap striker and non-striker after 6 legal balls
      if (overCompleted) {
        setBowlerId(undefined);
      }

      setScore({
        totalRuns: data.innings.totalRuns,
        wickets: data.innings.wickets,
        overs: data.innings.overs,
        ballsInOver: data.innings.ballsInOver,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record ball");
    } finally {
      setLoading(false);
    }
  }

  async function undo() {
    setLoading(true);
    setError(null);
    try {
      const prevScore = score;
      const res = await fetch(
        `/api/matches/${matchId}/innings/${inningsId}/ball`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to undo ball");
      }
      const data = await res.json();
      if (data.deletedBall) {
        const deletedBall = data.deletedBall as BallLike & {
          strikerChanged?: boolean;
        };

        // Check if an over was undone (over completion was reversed)
        const overWasUndone =
          data.innings.overs < prevScore.overs ||
          (prevScore.ballsInOver === 0 &&
            data.innings.ballsInOver === 5 &&
            data.innings.overs === prevScore.overs - 1);

        // If the deleted ball changed strike, undo the strike change
        if (deletedBall.strikerChanged && striker && nonStriker) {
          // Swap back: if we swapped striker/non-striker, swap them back
          setStrikerId(nonStriker.id);
          setNonStrikerId(striker.id);
        }

        // If an over was undone, undo the over completion strike swap
        if (overWasUndone && striker && nonStriker) {
          // Swap back the over completion swap
          setStrikerId(nonStriker.id);
          setNonStrikerId(striker.id);
        }

        // Remove the ball from the list
        setBalls((prev) => prev.filter((b) => b.id !== deletedBall.id));
      }
      setScore({
        totalRuns: data.innings.totalRuns,
        wickets: data.innings.wickets,
        overs: data.innings.overs,
        ballsInOver: data.innings.ballsInOver,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to undo ball");
    } finally {
      setLoading(false);
    }
  }

  async function exitMatch() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete match");
      }
      // Redirect to home page after successful deletion
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete match");
      setDeleting(false);
    }
  }

  async function handleInningsComplete() {
    if (!inningsCompleteData) return;

    setCompletingInnings(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/matches/${matchId}/innings/${inningsId}/complete`,
        {
          method: "POST",
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to complete innings");
      }
      const data = await res.json();

      // Handle transitions
      if (data.secondInningsStarted) {
        // Second innings started - reload page to show new innings
        window.location.reload();
        return;
      }

      if (data.matchCompleted) {
        // Match completed - redirect to match complete page
        window.location.href = `/matches/${matchId}/complete`;
        return;
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to complete innings"
      );
      setCompletingInnings(false);
    }
  }

  function handleCancelInningsComplete() {
    setShowInningsCompleteModal(false);
    setInningsCompleteData(null);
  }

  const displayOvers = `${score.overs}.${score.ballsInOver}`;

  // For now, approximate current batter/bowler stats from local balls only
  type BatterAgg = {
    id: string;
    name: string;
    runs: number;
    ballsFaced: number;
    fours: number;
    sixes: number;
  };
  type BowlerAgg = {
    id: string;
    name: string;
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
  };

  const batterStats = new Map<string, BatterAgg>();
  const bowlerStats = new Map<string, BowlerAgg>();

  for (const b of balls) {
    const bat = battingPlayers.find(
      (p: Player): boolean => p.id === b.batsmanId
    );
    if (bat) {
      if (!batterStats.has(bat.id)) {
        batterStats.set(bat.id, {
          id: bat.id,
          name: bat.name,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
        });
      }
      const s = batterStats.get(bat.id)!;
      if (!b.isWide) {
        s.ballsFaced += 1;
      }
      s.runs += b.runs;
      if (b.runs === 4) s.fours += 1;
      if (b.runs === 6) s.sixes += 1;
    }

    const bowlPlayer = players.find(
      (p: Player): boolean => p.id === b.bowlerId
    );
    if (bowlPlayer) {
      if (!bowlerStats.has(bowlPlayer.id)) {
        bowlerStats.set(bowlPlayer.id, {
          id: bowlPlayer.id,
          name: bowlPlayer.name,
          ballsBowled: 0,
          runsConceded: 0,
          wickets: 0,
        });
      }
      const bs = bowlerStats.get(bowlPlayer.id)!;
      if (!b.isWide && !b.isNoBall) bs.ballsBowled += 1;
      let runsThisBall = b.runs;
      if (b.isWide || b.isNoBall) {
        runsThisBall += 1;
      }
      bs.runsConceded += runsThisBall;
      if (b.isWicket) bs.wickets += 1;
    }
  }

  const strikerStats = striker ? batterStats.get(striker.id) : undefined;
  const nonStrikerStats = nonStriker
    ? batterStats.get(nonStriker.id)
    : undefined;
  const bowlerStatsEntry = bowler ? bowlerStats.get(bowler.id) : undefined;

  return (
    <div className="relative">
      {/* Main Score Card - Cricbuzz Style */}
      <div className="space-y-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-xl">
        <header className="space-y-3">
          {/* Match Info Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-100">
            <span className="flex items-center gap-1">
              <span>🎾</span>
              <span>{battingTeamName}</span>
            </span>
            <span>•</span>
            <span>{inningsNumber === 1 ? "1st" : "2nd"} Innings</span>
            <span>•</span>
            <span>{totalOvers} overs</span>
          </div>

          {/* Main Score Display */}
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-4xl font-black tracking-tight">
                {score.totalRuns}
                <span className="text-2xl text-blue-200">/{score.wickets}</span>
              </div>
              {targetRuns !== null && (
                <div className="mt-1.5 text-sm font-bold text-orange-200">
                  🎯 Target: {targetRuns} • Need{" "}
                  {Math.max(0, targetRuns - score.totalRuns)} runs
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">
                {displayOvers}
                <span className="text-lg text-blue-200">/{totalOvers}</span>
              </div>
              <div className="mt-1.5 rounded-full bg-red-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                🔴 Live
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowScorecard(!showScorecard)}
              className="flex-1 rounded-xl border-2 border-white/30 bg-white/10 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-95"
            >
              {showScorecard ? "📊 Hide" : "📊 Scorecard"}
            </button>
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              disabled={deleting}
              className="rounded-xl border-2 border-red-300/50 bg-red-500/20 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-red-500/30 active:scale-95 disabled:opacity-50"
            >
              🚪 Exit
            </button>
          </div>
        </header>

        {/* Player Selection */}
        <div className="grid gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm md:grid-cols-3">
          <div>
            <div className="mb-2 flex items-center gap-1 text-xs font-bold text-blue-100">
              <span>👤</span>
              <span>Striker</span>
            </div>
            <select
              className="w-full rounded-lg border-2 border-white/20 bg-white/20 px-3 py-2 text-sm font-semibold text-white outline-none backdrop-blur-sm transition-all focus:border-white/40 focus:bg-white/30"
              value={strikerId ?? ""}
              onChange={(e) => setStrikerId(e.target.value || undefined)}
            >
              <option value="" className="bg-slate-800 text-white">
                Select striker
              </option>
              {battingPlayers.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-slate-800 text-white"
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1 text-xs font-bold text-blue-100">
              <span>👤</span>
              <span>Non-Striker</span>
            </div>
            <select
              className="w-full rounded-lg border-2 border-white/20 bg-white/20 px-3 py-2 text-sm font-semibold text-white outline-none backdrop-blur-sm transition-all focus:border-white/40 focus:bg-white/30"
              value={nonStrikerId ?? ""}
              onChange={(e) => setNonStrikerId(e.target.value || undefined)}
            >
              <option value="" className="bg-slate-800 text-white">
                Select non-striker
              </option>
              {battingPlayers.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-slate-800 text-white"
                >
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1 text-xs font-bold text-blue-100">
              <span>🎾</span>
              <span>Bowler</span>
            </div>
            <select
              className="w-full rounded-lg border-2 border-white/20 bg-white/20 px-3 py-2 text-sm font-semibold text-white outline-none backdrop-blur-sm transition-all focus:border-white/40 focus:bg-white/30"
              value={bowlerId ?? ""}
              onChange={(e) => setBowlerId(e.target.value || undefined)}
            >
              <option value="" className="bg-slate-800 text-white">
                Select bowler
              </option>
              {bowlingPlayers.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-slate-800 text-white"
                >
                  {p.name}
                </option>
              ))}
            </select>
            {!bowlerId && (
              <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-orange-200">
                <span>⚠️</span>
                <span>Over complete – choose next bowler</span>
              </p>
            )}
          </div>
        </div>

        <BallInputButtons
          onBall={sendBall}
          onUndo={undo}
          striker={striker}
          nonStriker={nonStriker}
          bowler={bowler}
          bowlingTeamPlayers={bowlingPlayers}
        />

        {/* Status Messages */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 p-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm font-semibold text-blue-700">
              Updating score...
            </p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-semibold text-red-700">{error}</p>
          </div>
        )}

        {/* Exit Confirmation */}
        {showExitConfirm && (
          <div className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-red-100 p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <p className="text-base font-bold text-red-800">Delete Match?</p>
            </div>
            <p className="mb-4 text-sm text-red-700">
              This action cannot be undone. All match data will be permanently
              deleted.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={exitMatch}
                disabled={deleting}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-red-600 hover:to-red-700 active:scale-95 disabled:opacity-50"
              >
                {deleting ? "🗑️ Deleting..." : "🗑️ Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  setError(null);
                }}
                disabled={deleting}
                className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <LiveStatsPanel
          striker={strikerStats}
          nonStriker={nonStrikerStats}
          bowler={bowlerStatsEntry}
        />
        <PreviousBallsDisplay balls={balls} />
        <OverTimeline balls={balls} />
      </div>

      {/* Sliding Scorecard Section */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          showScorecard ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Scorecard</h2>
          <button
            type="button"
            onClick={() => setShowScorecard(false)}
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close scorecard"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <MatchScorecard
            battingTeamName={battingTeamName}
            bowlingTeamName={bowlingTeamName}
            score={score}
            totalOvers={totalOvers}
            targetRuns={targetRuns}
            inningsNumber={inningsNumber}
            striker={strikerStats}
            nonStriker={nonStrikerStats}
            bowler={bowlerStatsEntry}
            balls={balls}
            players={players}
          />
        </div>
      </div>

      {/* Overlay when scorecard is open */}
      {showScorecard && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowScorecard(false)}
          aria-hidden="true"
        />
      )}

      {/* Innings Complete Confirmation Modal */}
      {inningsCompleteData && (
        <InningsCompleteModal
          isOpen={showInningsCompleteModal}
          onConfirm={handleInningsComplete}
          onCancel={handleCancelInningsComplete}
          isAllOut={inningsCompleteData.isAllOut}
          isOversComplete={inningsCompleteData.isOversComplete}
          isTargetReached={inningsCompleteData.isTargetReached}
          inningsNumber={inningsCompleteData.inningsNumber}
          battingTeamName={battingTeamName}
          loading={completingInnings}
        />
      )}
    </div>
  );
}
