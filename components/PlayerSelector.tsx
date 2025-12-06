"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  name: string;
};

type Assignment = "A" | "B" | "BENCH" | "DUAL";

interface PlayerSelectorProps {
  matchId: string;
}

export function PlayerSelector({ matchId }: PlayerSelectorProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(
    {}
  );
  const [newPlayerName, setNewPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLastMatch, setLoadingLastMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error("Failed to load players");
        const data = await res.json();
        setPlayers(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load players");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlayerName }),
      });
      if (!res.ok) throw new Error("Failed to add player");
      const player = await res.json();
      setPlayers((prev) => [...prev, player]);
      setNewPlayerName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add player");
    }
  }

  function setAssignment(id: string, assignment: Assignment) {
    setAssignments((prev) => {
      return { ...prev, [id]: assignment };
    });
  }

  const counts = Object.values(assignments).reduce(
    (acc, a) => {
      if (a === "A") acc.A += 1;
      if (a === "B") acc.B += 1;
      if (a === "DUAL") acc.DUAL += 1;
      return acc;
    },
    { A: 0, B: 0, DUAL: 0 }
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = Object.entries(assignments)
        .filter(([, team]) => team !== "BENCH")
        .map(([playerId, team]) => ({
          playerId,
          team: team === "A" || team === "B" ? team : "A",
          isDualPlayer: team === "DUAL",
        }));

      const res = await fetch(`/api/matches/${matchId}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: payload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save teams");
      }
      router.push(`/matches/${matchId}/batting-choice`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save teams");
    } finally {
      setSaving(false);
    }
  }

  function shuffleTeams() {
    setAssignments(() => {
      const ids = players.map((p) => p.id);
      // simple Fisher–Yates shuffle
      for (let i = ids.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const next: Record<string, Assignment> = {};
      ids.forEach((id, index) => {
        // alternate A/B, leave others on bench initially
        next[id] = index % 2 === 0 ? "A" : "B";
      });
      return next;
    });
  }

  async function repeatLastMatchTeams() {
    setLoadingLastMatch(true);
    setError(null);
    try {
      // Fetch the most recent matches
      const matchesRes = await fetch("/api/matches");
      if (!matchesRes.ok) throw new Error("Failed to load matches");
      const matches = await matchesRes.json();

      // Filter out the current match and find matches with team assignments
      const otherMatches = matches.filter(
        (m: { id: string }) => m.id !== matchId
      );

      if (otherMatches.length === 0) {
        setError("No previous match found");
        setLoadingLastMatch(false);
        return;
      }

      // Iterate through matches to find one with team assignments
      let match = null;
      for (const candidateMatch of otherMatches) {
        const matchRes = await fetch(`/api/matches/${candidateMatch.id}`);
        if (!matchRes.ok) continue;
        
        const matchData = await matchRes.json();
        
        // Check if this match has player assignments
        if (matchData.players && Array.isArray(matchData.players) && matchData.players.length > 0) {
          match = matchData;
          break;
        }
      }

      if (!match) {
        setError("No previous match with team assignments found");
        setLoadingLastMatch(false);
        return;
      }

      // Map the last match's player assignments to current state
      const newAssignments: Record<string, Assignment> = {};
      
      // First, set all current players to BENCH
      players.forEach((p) => {
        newAssignments[p.id] = "BENCH";
      });

      // Then, apply assignments from the last match
      if (match.players && Array.isArray(match.players)) {
        match.players.forEach((mp: { playerId: string; team: "A" | "B"; isDualPlayer: boolean }) => {
          // Only apply if the player exists in the current players list
          if (players.some((p) => p.id === mp.playerId)) {
            if (mp.isDualPlayer) {
              newAssignments[mp.playerId] = "DUAL";
            } else {
              newAssignments[mp.playerId] = mp.team;
            }
          }
        });
      }

      setAssignments(newAssignments);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load last match teams");
    } finally {
      setLoadingLastMatch(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-800">Players & teams</h2>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>
            A: {counts.A} • B: {counts.B} • Dual: {counts.DUAL}
          </span>
          <button
            type="button"
            onClick={repeatLastMatchTeams}
            disabled={loadingLastMatch}
            className="rounded-full border border-blue-500 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-60"
          >
            {loadingLastMatch ? "Loading..." : "Repeat Last"}
          </button>
          <button
            type="button"
            onClick={shuffleTeams}
            className="rounded-full border border-emerald-500 px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50"
          >
            Shuffle
          </button>
        </div>
      </div>

      <form onSubmit={handleAddPlayer} className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none ring-emerald-500 focus:ring-2"
          placeholder="Add new player"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-50 hover:bg-zinc-800"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-xs text-zinc-500">Loading players...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Team A */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Team A ({counts.A})
              </h3>
            </div>
            <ul className="space-y-1.5">
              {players
                .filter((p) => (assignments[p.id] ?? "BENCH") === "A")
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-zinc-800">{p.name}</span>
                    <select
                      value={assignments[p.id] ?? "BENCH"}
                      onChange={(e) =>
                        setAssignment(p.id, e.target.value as Assignment)
                      }
                      className="rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="A">Team A</option>
                      <option value="B">Team B</option>
                      <option value="DUAL">Dual</option>
                      <option value="BENCH">Bench</option>
                    </select>
                  </li>
                ))}
              {players.filter((p) => (assignments[p.id] ?? "BENCH") === "A")
                .length === 0 && (
                <li className="px-3 py-2 text-xs text-zinc-400">
                  No players assigned
                </li>
              )}
            </ul>
          </div>

          {/* Team B */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Team B ({counts.B})
              </h3>
            </div>
            <ul className="space-y-1.5">
              {players
                .filter((p) => (assignments[p.id] ?? "BENCH") === "B")
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-zinc-800">{p.name}</span>
                    <select
                      value={assignments[p.id] ?? "BENCH"}
                      onChange={(e) =>
                        setAssignment(p.id, e.target.value as Assignment)
                      }
                      className="rounded-md border border-blue-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="A">Team A</option>
                      <option value="B">Team B</option>
                      <option value="DUAL">Dual</option>
                      <option value="BENCH">Bench</option>
                    </select>
                  </li>
                ))}
              {players.filter((p) => (assignments[p.id] ?? "BENCH") === "B")
                .length === 0 && (
                <li className="px-3 py-2 text-xs text-zinc-400">
                  No players assigned
                </li>
              )}
            </ul>
          </div>

          {/* Dual Players */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                Dual Players ({counts.DUAL})
              </h3>
            </div>
            <ul className="space-y-1.5">
              {players
                .filter((p) => (assignments[p.id] ?? "BENCH") === "DUAL")
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50/50 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-zinc-800">{p.name}</span>
                    <select
                      value={assignments[p.id] ?? "BENCH"}
                      onChange={(e) =>
                        setAssignment(p.id, e.target.value as Assignment)
                      }
                      className="rounded-md border border-purple-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-purple-700 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="A">Team A</option>
                      <option value="B">Team B</option>
                      <option value="DUAL">Dual</option>
                      <option value="BENCH">Bench</option>
                    </select>
                  </li>
                ))}
              {players.filter((p) => (assignments[p.id] ?? "BENCH") === "DUAL")
                .length === 0 && (
                <li className="px-3 py-2 text-xs text-zinc-400">
                  No dual players
                </li>
              )}
            </ul>
          </div>

          {/* Bench */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Bench ({players.length - counts.A - counts.B - counts.DUAL})
              </h3>
            </div>
            <ul className="space-y-1.5">
              {players
                .filter((p) => {
                  const team = assignments[p.id] ?? "BENCH";
                  return team === "BENCH";
                })
                .map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-zinc-600">{p.name}</span>
                    <select
                      value={assignments[p.id] ?? "BENCH"}
                      onChange={(e) =>
                        setAssignment(p.id, e.target.value as Assignment)
                      }
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-700 outline-none focus:ring-2 focus:ring-zinc-500"
                    >
                      <option value="A">Team A</option>
                      <option value="B">Team B</option>
                      <option value="DUAL">Dual</option>
                      <option value="BENCH">Bench</option>
                    </select>
                  </li>
                ))}
              {players.filter((p) => {
                const team = assignments[p.id] ?? "BENCH";
                return team === "BENCH";
              }).length === 0 && (
                <li className="px-3 py-2 text-xs text-zinc-400">
                  No players on bench
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="mt-2 w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-400 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Next: Choose Batting Team"}
      </button>
    </div>
  );
}
