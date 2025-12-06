"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface TossCoinProps {
  matchId: string;
  teamA: string;
  teamB: string;
}

type Side = "A" | "B";

export function TossCoin({ matchId, teamA, teamB }: TossCoinProps) {
  const router = useRouter();
  const [flipping, setFlipping] = useState(false);
  const [winner, setWinner] = useState<Side | null>(null);
  const [decision, setDecision] = useState<"BAT" | "BOWL" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFlip() {
    setError(null);
    setDecision(null);
    setWinner(null);
    setFlipping(true);

    setTimeout(() => {
      const result: Side = Math.random() < 0.5 ? "A" : "B";
      setWinner(result);
      setFlipping(false);
    }, 1600);
  }

  async function confirm(decide: "BAT" | "BOWL") {
    if (!winner) return;
    setDecision(decide);
    setError(null);

    try {
      const res = await fetch(`/api/matches/${matchId}/toss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tossWinner: winner,
          decision: decide,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to record toss");
      }

      router.push(`/matches/${matchId}/live`);
    } catch (err: any) {
      setError(err.message ?? "Failed to record toss");
    }
  }

  const labelForSide = (side: Side) => (side === "A" ? teamA : teamB);

  return (
    <div className="space-y-4 rounded-2xl bg-white/95 p-4 text-center shadow-sm ring-1 ring-emerald-200/70">
      <h2 className="text-sm font-semibold text-zinc-900">Toss</h2>
      <p className="text-xs text-zinc-500">
        Tap the coin to flip. Winner chooses to bat or bowl first.
      </p>

      <div className="flex flex-col items-center gap-4">
        <motion.button
          type="button"
          onClick={handleFlip}
          disabled={flipping}
          className="relative h-24 w-24 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 shadow-lg shadow-amber-700/40 ring-2 ring-amber-200"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={flipping ? "flip" : winner ?? "idle"}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: flipping ? 720 : 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: flipping ? 1.5 : 0.4, ease: "easeInOut" }}
              className="flex h-full w-full items-center justify-center text-center text-xs font-semibold text-amber-950"
            >
              {winner ? labelForSide(winner) : "Flip"}
            </motion.div>
          </AnimatePresence>
        </motion.button>

        {winner && (
          <div className="space-y-2 text-xs">
            <p className="font-medium text-emerald-700">
              {labelForSide(winner)} won the toss!
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => confirm("BAT")}
                className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-emerald-950 hover:bg-emerald-400"
              >
                Bat first
              </button>
              <button
                type="button"
                onClick={() => confirm("BOWL")}
                className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold text-zinc-50 hover:bg-zinc-800"
              >
                Bowl first
              </button>
            </div>
          </div>
        )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  </div>
  );
}


