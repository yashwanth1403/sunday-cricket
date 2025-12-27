"use client";

import { useMemo, useState } from "react";
import { BallInputButtons } from "./BallInputButtons";
import { PreviousBallsDisplay } from "./PreviousBallsDisplay";
import { OverTimeline } from "./OverTimeline";
import { LiveStatsPanel } from "./LiveStatsPanel";
import { MatchScorecard } from "./MatchScorecard";
import { InningsCompleteModal } from "./InningsCompleteModal";
import { InningsScorecard } from "./InningsScorecard";
import {
  calculateRecordBallClient,
  calculateUndoBallClient,
} from "@/lib/scoring/clientCalculator";

type Player = {
  id: string;
  name: string;
  team: "A" | "B";
  isDualPlayer?: boolean;
};

type BallLike = {
  id?: string;
  overNumber: number;
  ballNumber: number;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  batsmanId: string;
  nonStrikerId: string;
  bowlerId: string;
  strikerChanged?: boolean;
  wicketType?: string | null;
  fielderId?: string | null;
  dismissedBatsmanId?: string | null;
};

interface FirstInningsData {
  inningsNumber: number;
  battingTeamName: string;
  bowlingTeamName: string;
  score: {
    totalRuns: number;
    wickets: number;
    overs: number;
    ballsInOver: number;
  };
  balls: BallLike[];
  isCompleted: boolean;
}

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
  firstInningsData?: FirstInningsData | null;
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
  firstInningsData,
}: LiveScoringProps) {
  const [balls, setBalls] = useState<BallLike[]>(initialBalls);
  const [score, setScore] = useState(initialScore);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showScorecard, setShowScorecard] = useState(false);
  const [showFirstInnings, setShowFirstInnings] = useState(false);
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

  // Box cricket rule: Single bat when team.length - 1 wickets have fallen
  const isSingleBatMode = score.wickets >= battingPlayers.length - 1;

  async function sendBall(payload: {
    runs: number;
    isWide?: boolean;
    isNoBall?: boolean;
    isWicket?: boolean;
    wicketType?: string;
    fielderId?: string;
    dismissedBatsmanId?: string;
  }) {
    // Box cricket: In single bat mode, only striker and bowler are required
    if (isSingleBatMode) {
      if (!striker || !bowler) {
        setError("Select striker and bowler before scoring");
        return;
      }
    } else {
      if (!striker || !nonStriker || !bowler) {
        setError("Select striker, non-striker, and bowler before scoring");
        return;
      }
    }

    // Ensure nonStriker is defined for normal mode (TypeScript guard)
    if (!isSingleBatMode && !nonStriker) {
      setError("Select non-striker before scoring");
      return;
    }
    setError(null);
    setSyncError(null);

    // Store previous state for rollback if needed
    const prevBalls = [...balls];
    const prevScore = { ...score };
    const prevStrikerId = strikerId;
    const prevNonStrikerId = nonStrikerId;
    const prevBowlerId = bowlerId;

    try {
      // Calculate immediately on client side (optimistic update)
      // Type assertion needed due to wicketType enum vs string difference
      // Box cricket: In single bat mode, use striker as non-striker (required by API but not used)
      const nonStrikerIdForCalc = isSingleBatMode
        ? striker.id
        : nonStriker?.id ?? striker.id;
      const calculation = calculateRecordBallClient(
        balls as Parameters<typeof calculateRecordBallClient>[0],
        score,
        striker.id,
        nonStrikerIdForCalc,
        bowler.id,
        {
          runs: payload.runs ?? 0,
          isWide: payload.isWide ?? false,
          isNoBall: payload.isNoBall ?? false,
          isWicket: payload.isWicket ?? false,
          wicketType: payload.wicketType ?? null,
          fielderId: payload.fielderId ?? null,
          dismissedBatsmanId: payload.dismissedBatsmanId ?? null,
        }
      );

      // Generate temporary ID for the ball
      const tempBallId = `temp-${Date.now()}-${Math.random()}`;
      const ballWithId: BallLike = {
        ...calculation.ball,
        id: tempBallId,
      };

      // Update state IMMEDIATELY (optimistic update)
      setBalls((prev) => [...prev, ballWithId]);
      setScore(calculation.updatedScore);

      // Handle all edge cases for strike rotation and wickets
      let newStrikerId = prevStrikerId;
      let newNonStrikerId = prevNonStrikerId;
      let newBowlerId = prevBowlerId;

      // Check if we're entering single bat mode after this ball
      const willBeSingleBatMode =
        calculation.updatedScore.wickets >= battingPlayers.length - 1;

      // Handle wicket dismissal first (before strike rotation)
      if (calculation.ball.isWicket) {
        const dismissedId =
          calculation.ball.dismissedBatsmanId || calculation.ball.batsmanId;

        // Get all available batsmen (not currently at crease and not dismissed)
        const dismissedBatsmen = new Set(
          balls
            .filter((b) => b.isWicket && b.dismissedBatsmanId)
            .map((b) => b.dismissedBatsmanId!)
        );
        dismissedBatsmen.add(dismissedId);

        const availableBatsmen = battingPlayers.filter(
          (p) =>
            p.id !== prevStrikerId &&
            (!prevNonStrikerId || p.id !== prevNonStrikerId) &&
            !dismissedBatsmen.has(p.id)
        );
        const nextBatsman = availableBatsmen[0];

        if (willBeSingleBatMode) {
          // Single bat mode: only striker, no non-striker
          if (dismissedId === prevStrikerId) {
            // Striker was dismissed
            if (nextBatsman) {
              newStrikerId = nextBatsman.id;
            } else {
              // No more batsmen - all out
              newStrikerId = undefined;
            }
          }
          // In single bat mode, non-striker is always undefined
          newNonStrikerId = undefined;
        } else {
          // Normal mode: striker and non-striker
          if (dismissedId === prevStrikerId) {
            // Striker was dismissed
            if (nextBatsman) {
              // Non-striker moves to striker, new batsman to non-striker
              newStrikerId = prevNonStrikerId;
              newNonStrikerId = nextBatsman.id;
            } else {
              // No more batsmen - just swap positions
              newStrikerId = prevNonStrikerId;
              newNonStrikerId = undefined;
            }
          } else if (dismissedId === prevNonStrikerId) {
            // Non-striker was dismissed
            if (nextBatsman) {
              // Striker stays, new batsman to non-striker
              newNonStrikerId = nextBatsman.id;
            } else {
              // No more batsmen
              newNonStrikerId = undefined;
            }
          }
        }
      } else {
        // No wicket - handle strike rotation
        if (willBeSingleBatMode || isSingleBatMode) {
          // Single bat mode: no strike rotation
          // End of over - require new bowler selection
          if (calculation.overCompleted) {
            newBowlerId = undefined;
          }
        } else {
          // Normal mode: handle strike rotation
          // Per-ball strike rotation: odd runs change strike (but not on 6th ball)
          if (
            calculation.strikerChanged &&
            prevStrikerId &&
            prevNonStrikerId &&
            calculation.ball.ballNumber !== 6
          ) {
            // Swap striker and non-striker for odd runs
            newStrikerId = prevNonStrikerId;
            newNonStrikerId = prevStrikerId;
          }

          // End-of-over rotation: swap striker and non-striker after 6 legal balls
          if (calculation.overCompleted && prevStrikerId && prevNonStrikerId) {
            // Special case: If 6th ball had odd runs, we need to account for both rotations
            // Odd run on 6th ball would normally swap, but over completion also swaps
            // Net effect: if 6th ball had odd runs, don't swap (two swaps cancel out)
            const is6thBallWithOddRuns =
              calculation.ball.ballNumber === 6 &&
              calculation.ball.runs % 2 === 1 &&
              !calculation.ball.isWide &&
              !calculation.ball.isNoBall;

            if (is6thBallWithOddRuns) {
              // Odd run on 6th ball: one swap for odd run + one swap for over = no net change
              // So don't swap - strike stays with same player
              // newStrikerId and newNonStrikerId remain unchanged
            } else {
              // Normal over completion - swap positions
              newStrikerId = prevNonStrikerId;
              newNonStrikerId = prevStrikerId;
            }
            newBowlerId = undefined; // Require new bowler selection
          }
        }
      }

      // Apply all state changes
      setStrikerId(newStrikerId);
      setNonStrikerId(newNonStrikerId);
      if (newBowlerId !== prevBowlerId) {
        setBowlerId(newBowlerId);
      }

      // Check if innings can be completed
      // Box cricket: All wickets must fall (all players dismissed)
      const maxWickets = battingPlayers.length;
      const isAllOut = calculation.updatedScore.wickets >= maxWickets;
      const isOversComplete = calculation.updatedScore.overs >= totalOvers;
      let isTargetReached = false;
      if (inningsNumber === 2 && targetRuns !== null) {
        isTargetReached = calculation.updatedScore.totalRuns >= targetRuns;
      }
      const isInningsComplete = isOversComplete || isAllOut || isTargetReached;

      if (isInningsComplete) {
        setInningsCompleteData({
          isAllOut,
          isOversComplete,
          isTargetReached,
          inningsNumber,
        });
        setShowInningsCompleteModal(true);
      }

      // Start background database sync (don't block UI)
      setSyncing(true);
      const res = await fetch(
        `/api/matches/${matchId}/innings/${inningsId}/ball`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            batsmanId: striker.id,
            nonStrikerId: isSingleBatMode
              ? striker.id
              : nonStriker?.id ?? striker.id,
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
      const serverBall = data.ball as BallLike;

      // Replace temporary ball with server ball (update ID)
      setBalls((prev) => {
        const updated = [...prev];
        const tempIndex = updated.findIndex((b) => b.id === tempBallId);
        if (tempIndex !== -1) {
          updated[tempIndex] = {
            ...serverBall,
            id: serverBall.id || tempBallId,
          };
        }
        return updated;
      });

      // Update score with server response (in case of any discrepancies)
      setScore({
        totalRuns: data.innings.totalRuns,
        wickets: data.innings.wickets,
        overs: data.innings.overs,
        ballsInOver: data.innings.ballsInOver,
      });

      // Clear syncing after a short delay
      setTimeout(() => {
        setSyncing(false);
      }, 1000);
    } catch (err: unknown) {
      // Rollback on error
      setBalls(prevBalls);
      setScore(prevScore);
      setStrikerId(prevStrikerId);
      setNonStrikerId(prevNonStrikerId);
      setBowlerId(prevBowlerId);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to record ball";
      setError(errorMessage);
      setSyncError(errorMessage);
      setSyncing(false);
    }
  }

  async function undo() {
    if (balls.length === 0) {
      setError("No balls to undo");
      return;
    }

    setError(null);
    setSyncError(null);

    // Store previous state for rollback if needed
    const prevBalls = [...balls];
    const prevScore = { ...score };
    const prevStrikerId = strikerId;
    const prevNonStrikerId = nonStrikerId;
    const prevBowlerId = bowlerId;

    try {
      // Calculate immediately on client side (optimistic update)
      // Type assertion needed due to wicketType enum vs string difference
      const calculation = calculateUndoBallClient(
        balls as Parameters<typeof calculateUndoBallClient>[0],
        score
      );

      if (!calculation.deletedBall) {
        setError("No ball to undo");
        return;
      }

      const lastBall = calculation.deletedBall;

      // Update state IMMEDIATELY (optimistic update)
      // Map remaining balls back to our local format, preserving IDs
      // Use a Set to track used IDs to prevent duplicates
      const usedIds = new Set<string>();
      let tempIdCounter = 0;

      const remainingBallsWithIds: Array<BallLike & { id: string }> =
        calculation.remainingBalls.map((b) => {
          // First, try to use the ID from the calculation result if it exists
          if (b.id && !usedIds.has(b.id)) {
            usedIds.add(b.id);
            return {
              ...b,
              id: b.id,
              wicketType:
                (b.wicketType as string | null | undefined) ?? undefined,
            } as BallLike & { id: string };
          }

          // Find the original ball to preserve its ID
          const originalBall = prevBalls.find(
            (orig) =>
              orig.id &&
              !usedIds.has(orig.id) &&
              orig.overNumber === b.overNumber &&
              orig.ballNumber === b.ballNumber &&
              orig.batsmanId === b.batsmanId &&
              orig.bowlerId === b.bowlerId
          );

          if (originalBall?.id) {
            usedIds.add(originalBall.id);
            return {
              ...b,
              id: originalBall.id,
              wicketType:
                (b.wicketType as string | null | undefined) ?? undefined,
            } as BallLike & { id: string };
          }

          // Generate a unique temp ID as last resort
          let ballId: string;
          do {
            tempIdCounter += 1;
            ballId = `temp-${Date.now()}-${tempIdCounter}-${Math.random()}`;
          } while (usedIds.has(ballId));

          usedIds.add(ballId);
          return {
            ...b,
            id: ballId,
            wicketType:
              (b.wicketType as string | null | undefined) ?? undefined,
          } as BallLike & { id: string };
        });
      console.log(
        `[DEBUG] LiveScoring undo: Setting ${remainingBallsWithIds.length} remaining balls, new score: ${calculation.updatedScore.totalRuns} runs, ${calculation.updatedScore.wickets} wickets`
      );
      setBalls(remainingBallsWithIds as BallLike[]);
      setScore(calculation.updatedScore);

      // Handle undo of strike rotation and over completion
      let newStrikerId = prevStrikerId;
      let newNonStrikerId = prevNonStrikerId;
      const newBowlerId = prevBowlerId;

      // Check if an over was undone (over completion was reversed)
      const overWasUndone =
        calculation.updatedScore.overs < prevScore.overs ||
        (prevScore.ballsInOver === 0 &&
          calculation.updatedScore.ballsInOver === 5 &&
          calculation.updatedScore.overs === prevScore.overs - 1);

      // Check if the last ball was the 6th ball with odd runs
      const was6thBallWithOddRuns =
        lastBall.ballNumber === 6 &&
        lastBall.runs % 2 === 1 &&
        !lastBall.isWide &&
        !lastBall.isNoBall;

      // If the deleted ball changed strike, undo the strike change
      // But skip if it was the 6th ball with odd runs (we didn't swap for that)
      if (
        lastBall.strikerChanged &&
        prevStrikerId &&
        prevNonStrikerId &&
        !was6thBallWithOddRuns
      ) {
        // Swap back: if we swapped striker/non-striker, swap them back
        newStrikerId = prevNonStrikerId;
        newNonStrikerId = prevStrikerId;
      }

      // If an over was undone, undo the over completion strike swap
      if (overWasUndone && prevStrikerId && prevNonStrikerId) {
        // Special case: If 6th ball had odd runs, we didn't swap on over completion
        // (because the two rotations canceled out), so don't swap back
        if (was6thBallWithOddRuns) {
          // Don't swap - we didn't swap originally, so no need to swap back
          // newStrikerId and newNonStrikerId remain unchanged
        } else {
          // Normal case: swap back the over completion swap
          newStrikerId = prevNonStrikerId;
          newNonStrikerId = prevStrikerId;
        }
      }

      // Handle wicket undo - restore dismissed batsman if needed
      if (lastBall.isWicket) {
        const dismissedId = lastBall.dismissedBatsmanId || lastBall.batsmanId;

        if (dismissedId === prevStrikerId) {
          // Striker was dismissed - restore them
          newStrikerId = dismissedId;
          // If non-striker was moved to striker, restore previous non-striker
          if (prevNonStrikerId && prevNonStrikerId !== dismissedId) {
            newNonStrikerId = prevNonStrikerId;
          }
        } else if (dismissedId === prevNonStrikerId) {
          // Non-striker was dismissed - restore them
          newNonStrikerId = dismissedId;
        }
      }

      setStrikerId(newStrikerId);
      setNonStrikerId(newNonStrikerId);
      if (newBowlerId !== prevBowlerId) {
        setBowlerId(newBowlerId);
      }

      // Start background database sync (don't block UI)
      setSyncing(true);
      const res = await fetch(
        `/api/matches/${matchId}/innings/${inningsId}/ball`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to undo ball");
      }

      const data = await res.json();

      // Update score with server response (in case of any discrepancies)
      setScore({
        totalRuns: data.innings.totalRuns,
        wickets: data.innings.wickets,
        overs: data.innings.overs,
        ballsInOver: data.innings.ballsInOver,
      });

      // Clear syncing after a short delay
      setTimeout(() => {
        setSyncing(false);
      }, 1000);
    } catch (err: unknown) {
      // Rollback on error
      setBalls(prevBalls);
      setScore(prevScore);
      setStrikerId(prevStrikerId);
      setNonStrikerId(prevNonStrikerId);
      setBowlerId(prevBowlerId);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to undo ball";
      setError(errorMessage);
      setSyncError(errorMessage);
      setSyncing(false);
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
          <div className="flex flex-wrap gap-2">
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
        <div
          className={`grid gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm ${
            isSingleBatMode ? "md:grid-cols-2" : "md:grid-cols-3"
          }`}
        >
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
          {!isSingleBatMode && (
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
          )}
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
        {syncing && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-50 p-3 border-2 border-amber-200">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent"></div>
            <p className="text-sm font-semibold text-amber-700">
              Syncing to database...
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
        <PreviousBallsDisplay
          balls={balls as Array<BallLike & { id: string }>}
        />
        <OverTimeline balls={balls as Array<BallLike & { id: string }>} />
      </div>

      {/* Sliding Scorecard Section */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          showScorecard ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
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
          {/* Innings Toggle (only show in 2nd innings) */}
          {firstInningsData && inningsNumber === 2 && (
            <div className="flex border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowFirstInnings(false)}
                className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                  !showFirstInnings
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                2nd Innings
              </button>
              <button
                type="button"
                onClick={() => setShowFirstInnings(true)}
                className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                  showFirstInnings
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                1st Innings
              </button>
            </div>
          )}
        </div>
        <div className="p-4">
          {firstInningsData && inningsNumber === 2 && showFirstInnings ? (
            <InningsScorecard
              inningsNumber={firstInningsData.inningsNumber}
              battingTeamName={firstInningsData.battingTeamName}
              bowlingTeamName={firstInningsData.bowlingTeamName}
              score={firstInningsData.score}
              totalOvers={totalOvers}
              balls={firstInningsData.balls as Array<BallLike & { id: string }>}
              players={players}
              isCompleted={firstInningsData.isCompleted}
            />
          ) : (
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
              balls={balls as Parameters<typeof MatchScorecard>[0]["balls"]}
              players={players}
            />
          )}
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
