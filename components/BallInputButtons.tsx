"use client";

import { useState } from "react";
import { WicketDismissalModal } from "./WicketDismissalModal";

type Player = {
  id: string;
  name: string;
  team: "A" | "B";
  isDualPlayer?: boolean;
};

interface BallInputButtonsProps {
  onBall: (payload: {
    runs: number;
    isWide?: boolean;
    isNoBall?: boolean;
    isWicket?: boolean;
    wicketType?: string;
    fielderId?: string;
    dismissedBatsmanId?: string;
  }) => void;
  onUndo: () => void;
  striker?: Player;
  nonStriker?: Player;
  bowler?: Player;
  bowlingTeamPlayers?: Player[];
}

export function BallInputButtons({
  onBall,
  onUndo,
  striker,
  nonStriker,
  bowler,
  bowlingTeamPlayers = [],
}: BallInputButtonsProps) {
  const [showWicketModal, setShowWicketModal] = useState(false);

  const mainRuns = [0, 1, 2, 3, 4, 6];

  const handleWicketConfirm = (dismissal: {
    wicketType: string;
    fielderId?: string;
    dismissedBatsmanId?: string;
  }) => {
    onBall({
      runs: 0,
      isWicket: true,
      wicketType: dismissal.wicketType,
      fielderId: dismissal.fielderId,
      dismissedBatsmanId: dismissal.dismissedBatsmanId,
    });
    setShowWicketModal(false);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Main Runs Grid */}
        <div className="grid grid-cols-6 gap-2.5">
          {mainRuns.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onBall({ runs: r })}
              className="h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-lg font-black text-white shadow-lg transition-all active:scale-95 active:shadow-md hover:from-blue-600 hover:to-blue-700"
            >
              {r}
            </button>
          ))}
        </div>

        {/* Special Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onBall({ runs: 0, isWide: true })}
            className="h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow-md transition-all active:scale-95 active:shadow-lg hover:from-amber-500 hover:to-orange-600"
          >
            ⚠️ Wide
          </button>
          <button
            type="button"
            onClick={() => onBall({ runs: 0, isNoBall: true })}
            className="h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white shadow-md transition-all active:scale-95 active:shadow-lg hover:from-purple-600 hover:to-purple-700"
          >
            ⚡ No-ball
          </button>
          <button
            type="button"
            onClick={() => setShowWicketModal(true)}
            className="h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-sm font-bold text-white shadow-md transition-all active:scale-95 active:shadow-lg hover:from-red-600 hover:to-red-700"
          >
            ❌ Wicket
          </button>
          <button
            type="button"
            onClick={onUndo}
            className="h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-bold text-white shadow-md transition-all active:scale-95 active:shadow-lg hover:from-slate-700 hover:to-slate-800"
          >
            ⬅️ Undo
          </button>
        </div>
      </div>

      <WicketDismissalModal
        isOpen={showWicketModal}
        onClose={() => setShowWicketModal(false)}
        onConfirm={handleWicketConfirm}
        striker={striker}
        nonStriker={nonStriker}
        bowler={bowler}
        bowlingTeamPlayers={bowlingTeamPlayers}
      />
    </>
  );
}
