type Badge = {
  id: string;
  type: string;
  unlockedAt: string;
};

interface BadgeDisplayProps {
  badges: Badge[];
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
      <p className="text-xs text-zinc-500">
        Play more matches to unlock badges and flex on your friends.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {badges.map((b) => (
        <div
          key={b.id}
          className="rounded-xl bg-emerald-900/60 px-3 py-2 text-emerald-50 shadow-sm ring-1 ring-emerald-600/50"
        >
          <div className="font-semibold">
            {LABELS[b.type] ?? b.type.replaceAll("_", " ")}
          </div>
          <div className="mt-1 text-[11px] text-emerald-200">
            {new Date(b.unlockedAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}


