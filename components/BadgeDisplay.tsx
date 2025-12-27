type Badge = {
  id: string;
  type: string;
  unlockedAt: string;
};

interface BadgeDisplayProps {
  badges: Badge[];
}

// Helper function to format date consistently (avoiding hydration mismatch)
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

const LABELS: Record<string, string> = {
  FIFTY: "🎯 50+ Runs",
  BOUNDARY_BURST: "💥 Boundary Burst",
  HAT_TRICK: "🎭 Hat Trick",
  FIVE_FOR: "🔥 Five-for",
  SIXER_MONSTER_10: "💣 Sixer Monster 10",
  SIXER_MONSTER_25: "💣 Sixer Monster 25",
  SIXER_MONSTER_50: "💣 Sixer Monster 50",
  MOM_MASTER_1: "⭐ MOM Master 1",
  MOM_MASTER_5: "⭐ MOM Master 5",
  MOM_MASTER_10: "⭐ MOM Master 10",
};

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  if (!badges.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
        <div className="text-4xl mb-2">🏆</div>
        <p className="text-sm text-slate-500">
          Play more matches to unlock badges and flex on your friends!
        </p>
      </div>
    );
  }

  // Group badges by type to show count
  const badgeCounts = new Map<string, number>();
  const badgeDates = new Map<string, string>();
  
  for (const badge of badges) {
    const count = badgeCounts.get(badge.type) || 0;
    badgeCounts.set(badge.type, count + 1);
    // Keep the earliest date for each badge type
    if (!badgeDates.has(badge.type)) {
      badgeDates.set(badge.type, badge.unlockedAt);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from(badgeCounts.entries()).map(([type, count]) => {
        const badgeDate = badgeDates.get(type);
        const isRare = count === 1;
        const isCommon = count > 5;
        
        return (
          <div
            key={type}
            className={`rounded-xl p-3 shadow-sm transition-all hover:shadow-md ${
              isRare
                ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                : isCommon
                ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                : "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-bold text-sm leading-tight">
                  {LABELS[type] ?? type.replaceAll("_", " ")}
                </div>
                {count > 1 && (
                  <div className="mt-1 text-xs opacity-90">
                    ×{count}
                  </div>
                )}
              </div>
              {isRare && (
                <span className="text-lg">✨</span>
              )}
            </div>
            {badgeDate && (
              <div className={`mt-2 text-[10px] ${
                isRare || isCommon ? "opacity-80" : "opacity-70"
              }`}>
                {formatDate(badgeDate)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


