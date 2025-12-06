"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MatchSetupFormProps {
  defaultName?: string;
}

export function MatchSetupForm({ defaultName }: MatchSetupFormProps) {
  const router = useRouter();
  const [name, setName] = useState(
    defaultName ??
      `Sunday Match - ${new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date())}`
  );
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [totalOvers, setTotalOvers] = useState(10);
  const [maxOversPerBowler, setMaxOversPerBowler] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          teamA,
          teamB,
          totalOvers,
          maxOversPerBowler,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create match");
      }

      const match = await res.json();
      router.push(`/matches/${match.id}/setup`);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl bg-white p-6 shadow-lg"
    >
      {/* Header */}
      <div className="mb-4 text-center">
        <div className="mb-2 text-3xl">🏏</div>
        <h2 className="text-xl font-black text-slate-800">Create New Match</h2>
        <p className="mt-1 text-sm text-slate-600">
          Set up your match details
        </p>
      </div>

      {/* Match Name */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
          <span>📝</span>
          <span>Match Name</span>
        </label>
        <input
          className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter match name"
        />
      </div>

      {/* Team Names */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>👥</span>
            <span>Team A</span>
          </label>
          <input
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            placeholder="Team A"
          />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>👥</span>
            <span>Team B</span>
          </label>
          <input
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            placeholder="Team B"
          />
        </div>
      </div>

      {/* Overs Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>⏱️</span>
            <span>Total Overs</span>
          </label>
          <input
            type="number"
            min={1}
            max={30}
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={totalOvers}
            onChange={(e) => setTotalOvers(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
            <span>🎾</span>
            <span>Max Overs/Bowler</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
            value={maxOversPerBowler}
            onChange={(e) => setMaxOversPerBowler(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3">
          <span className="text-lg">⚠️</span>
          <p className="text-sm font-semibold text-red-700">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-base font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 active:scale-95 disabled:opacity-60 disabled:active:scale-100"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span>Creating Match...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span>✅</span>
            <span>Next: Add Players</span>
          </span>
        )}
      </button>
    </form>
  );
}
