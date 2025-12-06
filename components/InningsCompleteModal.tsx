"use client";

interface InningsCompleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isAllOut: boolean;
  isOversComplete: boolean;
  isTargetReached?: boolean;
  inningsNumber: number;
  battingTeamName: string;
  loading?: boolean;
}

export function InningsCompleteModal({
  isOpen,
  onConfirm,
  onCancel,
  isAllOut,
  isOversComplete,
  isTargetReached = false,
  inningsNumber,
  battingTeamName,
  loading = false,
}: InningsCompleteModalProps) {
  if (!isOpen) return null;

  const reason = isTargetReached
    ? "Target runs have been reached"
    : isAllOut
    ? "All wickets have fallen"
    : isOversComplete
    ? "All overs have been completed"
    : "Innings completed";

  const actionText =
    inningsNumber === 1 ? "Start 2nd Innings" : "Complete Match";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out">
        <div className="p-6">
          {/* Handle bar */}
          <div className="mb-4 flex items-center justify-center">
            <div className="h-1.5 w-16 rounded-full bg-slate-300" />
          </div>

          {/* Content */}
          <div className="space-y-5">
            <div className="text-center">
              <div className="mb-3 text-4xl">🏏</div>
              <h2 className="text-2xl font-black text-slate-900">
                Innings Complete!
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                {battingTeamName}&apos;s {inningsNumber === 1 ? "1st" : "2nd"}{" "}
                innings is complete
              </p>
              <div className="mt-3 rounded-xl bg-blue-50 p-3">
                <p className="text-sm font-bold text-blue-800">
                  📊 Reason: {reason}
                </p>
              </div>
            </div>

            <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
              <p className="flex items-start gap-2 text-sm text-orange-800">
                <span className="text-lg">💡</span>
                <span>
                  <strong>Note:</strong> You can undo the last ball if you need
                  to make corrections before proceeding.
                </span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3.5 font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3.5 font-bold text-white shadow-lg transition-all hover:from-blue-700 hover:to-blue-800 active:scale-95 disabled:opacity-50"
              >
                {loading ? "⏳ Processing..." : `✅ ${actionText}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
