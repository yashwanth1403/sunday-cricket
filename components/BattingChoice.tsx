"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BattingChoiceProps {
  matchId: string;
  teamA: string;
  teamB: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  dualPlayers: string[];
}

export function BattingChoice({
  matchId,
  teamA,
  teamB,
  teamAPlayers,
  teamBPlayers,
  dualPlayers,
}: BattingChoiceProps) {
  const router = useRouter();
  const [battingTeam, setBattingTeam] = useState<"A" | "B" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    if (!battingTeam) {
      setError("Please select which team will bat first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/matches/${matchId}/batting-choice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battingTeam }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to start match");
      }

      router.push(`/matches/${matchId}/live`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start match");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white/95 p-4 text-center shadow-sm ring-1 ring-emerald-200/70 sm:p-6">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setBattingTeam("A")}
          disabled={loading}
          className={`w-full rounded-xl border-2 px-4 py-4 text-left transition-all sm:px-6 ${
            battingTeam === "A"
              ? "border-emerald-500 bg-emerald-50 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-emerald-300 hover:bg-emerald-50/50"
          }`}
        >
          <div className="mb-2 font-semibold">{teamA}</div>
          <div className="mb-2 text-xs text-zinc-600 sm:text-sm">
            Team A bats first
          </div>
          {teamAPlayers.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-emerald-200/50 pt-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                Players ({teamAPlayers.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {teamAPlayers.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 sm:text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setBattingTeam("B")}
          disabled={loading}
          className={`w-full rounded-xl border-2 px-4 py-4 text-left transition-all sm:px-6 ${
            battingTeam === "B"
              ? "border-blue-500 bg-blue-50 text-blue-900"
              : "border-zinc-200 bg-white text-zinc-800 hover:border-blue-300 hover:bg-blue-50/50"
          }`}
        >
          <div className="mb-2 font-semibold">{teamB}</div>
          <div className="mb-2 text-xs text-zinc-600 sm:text-sm">
            Team B bats first
          </div>
          {teamBPlayers.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-blue-200/50 pt-2">
              <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                Players ({teamBPlayers.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {teamBPlayers.map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 sm:text-xs"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </button>
      </div>

      {dualPlayers.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50/50 px-4 py-3 text-left">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-purple-600 sm:text-xs">
            Dual Players ({dualPlayers.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dualPlayers.map((name, idx) => (
              <span
                key={idx}
                className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700 sm:text-xs"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        onClick={handleStart}
        disabled={!battingTeam || loading}
        className="w-full rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Starting match..." : "Start Match"}
      </button>
    </div>
  );
}

