"use client";

import { useState } from "react";

type Player = {
  id: string;
  name: string;
  team: "A" | "B";
  isDualPlayer?: boolean;
};

type WicketType =
  | "BOWLED"
  | "CAUGHT"
  | "CAUGHT_AND_BOWLED"
  | "RUN_OUT"
  | "STUMPED"
  | "HIT_WICKET";

interface WicketDismissalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dismissal: {
    wicketType: WicketType;
    fielderId?: string;
    dismissedBatsmanId?: string;
  }) => void;
  striker: Player | undefined;
  nonStriker: Player | undefined;
  bowler: Player | undefined;
  bowlingTeamPlayers: Player[];
}

export function WicketDismissalModal({
  isOpen,
  onClose,
  onConfirm,
  striker,
  nonStriker,
  bowler,
  bowlingTeamPlayers,
}: WicketDismissalModalProps) {
  const [selectedType, setSelectedType] = useState<WicketType | null>(null);
  const [selectedFielderId, setSelectedFielderId] = useState<string>("");
  const [selectedDismissedBatsman, setSelectedDismissedBatsman] = useState<
    "striker" | "nonStriker" | null
  >(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedType) return;

    let fielderId: string | undefined;
    let dismissedBatsmanId: string | undefined;

    if (selectedType === "CAUGHT") {
      if (!selectedFielderId) {
        alert("Please select a fielder");
        return;
      }
      fielderId = selectedFielderId;
    } else if (selectedType === "CAUGHT_AND_BOWLED") {
      // Bowler caught it, so fielder is the bowler
      if (!bowler) {
        alert("Bowler not selected");
        return;
      }
      fielderId = bowler.id;
    } else if (selectedType === "STUMPED") {
      // Wicketkeeper effected the stumping - need to select fielder
      if (!selectedFielderId) {
        alert("Please select the wicketkeeper");
        return;
      }
      fielderId = selectedFielderId;
    }

    if (selectedType === "RUN_OUT") {
      if (!selectedDismissedBatsman) {
        alert("Please select which batsman was run out");
        return;
      }
      dismissedBatsmanId =
        selectedDismissedBatsman === "striker" ? striker?.id : nonStriker?.id;
      // For run out, we also need a fielder who effected it
      if (!selectedFielderId) {
        alert("Please select the fielder who effected the run out");
        return;
      }
      fielderId = selectedFielderId;
    }

    onConfirm({
      wicketType: selectedType,
      fielderId,
      dismissedBatsmanId,
    });

    // Reset state
    setSelectedType(null);
    setSelectedFielderId("");
    setSelectedDismissedBatsman(null);
  };

  const handleCancel = () => {
    setSelectedType(null);
    setSelectedFielderId("");
    setSelectedDismissedBatsman(null);
    onClose();
  };

  const dismissalTypes: Array<{
    type: WicketType;
    label: string;
    requiresFielder: boolean;
    requiresBatsmanSelection: boolean;
  }> = [
    {
      type: "BOWLED",
      label: "Bowled",
      requiresFielder: false,
      requiresBatsmanSelection: false,
    },
    {
      type: "CAUGHT",
      label: "Caught",
      requiresFielder: true,
      requiresBatsmanSelection: false,
    },
    {
      type: "CAUGHT_AND_BOWLED",
      label: "Caught & Bowled",
      requiresFielder: false,
      requiresBatsmanSelection: false,
    },
    {
      type: "RUN_OUT",
      label: "Run Out",
      requiresFielder: false,
      requiresBatsmanSelection: true,
    },
    {
      type: "STUMPED",
      label: "Stumped",
      requiresFielder: false,
      requiresBatsmanSelection: false,
    },
    {
      type: "HIT_WICKET",
      label: "Hit Wicket",
      requiresFielder: false,
      requiresBatsmanSelection: false,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Slide-up Modal */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-h-[85vh] overflow-y-auto">
          {/* Handle bar */}
          <div className="sticky top-0 z-10 flex items-center justify-center border-b-2 border-slate-200 bg-gradient-to-r from-blue-50 to-white py-4">
            <div className="h-1.5 w-16 rounded-full bg-slate-300" />
            <button
              type="button"
              onClick={handleCancel}
              className="absolute right-4 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
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

          {/* Content */}
          <div className="p-6">
            <div className="mb-6 text-center">
              <div className="mb-2 text-3xl">❌</div>
              <h2 className="text-2xl font-black text-slate-900">
                Wicket Dismissal
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select the type of dismissal
              </p>
            </div>

            {/* Dismissal Type Selection */}
            <div className="mb-6 space-y-3">
              {dismissalTypes.map((dismissal) => {
                const emojis: Record<WicketType, string> = {
                  BOWLED: "🎯",
                  CAUGHT: "✋",
                  CAUGHT_AND_BOWLED: "🤝",
                  RUN_OUT: "🏃",
                  STUMPED: "🧤",
                  HIT_WICKET: "⚡",
                };
                return (
                  <button
                    key={dismissal.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(dismissal.type);
                      if (!dismissal.requiresFielder) {
                        setSelectedFielderId("");
                      }
                      if (!dismissal.requiresBatsmanSelection) {
                        setSelectedDismissedBatsman(null);
                      }
                    }}
                    className={`w-full rounded-xl border-2 px-4 py-4 text-left transition-all ${
                      selectedType === dismissal.type
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {emojis[dismissal.type]}
                        </span>
                        <span className="font-bold">{dismissal.label}</span>
                      </div>
                      {selectedType === dismissal.type && (
                        <span className="text-2xl">✓</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fielder Selection (for Caught) */}
            {selectedType === "CAUGHT" && (
              <div className="mb-6 space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span>✋</span>
                  <span>Select Fielder</span>
                </label>
                <select
                  value={selectedFielderId}
                  onChange={(e) => setSelectedFielderId(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Choose a fielder...</option>
                  {bowlingTeamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fielder Selection (for Stumped) */}
            {selectedType === "STUMPED" && (
              <div className="mb-6 space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span>🧤</span>
                  <span>Select Wicketkeeper</span>
                </label>
                <select
                  value={selectedFielderId}
                  onChange={(e) => setSelectedFielderId(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Choose the wicketkeeper...</option>
                  {bowlingTeamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fielder Selection (for Run Out) */}
            {selectedType === "RUN_OUT" && (
              <div className="mb-6 space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span>🏃</span>
                  <span>Select Fielder Who Effected Run Out</span>
                </label>
                <select
                  value={selectedFielderId}
                  onChange={(e) => setSelectedFielderId(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-semibold text-slate-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Choose a fielder...</option>
                  {bowlingTeamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Batsman Selection (for Run Out) */}
            {selectedType === "RUN_OUT" && (
              <div className="mb-6 space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span>👤</span>
                  <span>Which Batsman Was Run Out?</span>
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDismissedBatsman("striker")}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      selectedDismissedBatsman === "striker"
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">👤 The Striker</div>
                        <div className="text-sm text-slate-600">
                          {striker?.name || "Not selected"}
                        </div>
                      </div>
                      {selectedDismissedBatsman === "striker" && (
                        <span className="text-2xl">✓</span>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDismissedBatsman("nonStriker")}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      selectedDismissedBatsman === "nonStriker"
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 shadow-md"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold">👤 The Non-Striker</div>
                        <div className="text-sm text-slate-600">
                          {nonStriker?.name || "Not selected"}
                        </div>
                      </div>
                      {selectedDismissedBatsman === "nonStriker" && (
                        <span className="text-2xl">✓</span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={
                  !selectedType ||
                  (selectedType === "CAUGHT" && !selectedFielderId) ||
                  (selectedType === "STUMPED" && !selectedFielderId) ||
                  (selectedType === "RUN_OUT" &&
                    (!selectedDismissedBatsman || !selectedFielderId)) ||
                  (selectedType === "CAUGHT_AND_BOWLED" && !bowler)
                }
                className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-4 py-3.5 font-bold text-white shadow-lg transition-all hover:from-red-600 hover:to-red-700 active:scale-95 disabled:opacity-50"
              >
                ✅ Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
