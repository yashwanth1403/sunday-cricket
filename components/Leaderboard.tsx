type LeaderRow = {
  playerId: string;
  name: string;
  value: number;
  secondary?: string;
};

interface LeaderboardProps {
  title: string;
  rows: LeaderRow[];
}

export function Leaderboard({ title, rows }: LeaderboardProps) {
  const getMedal = (idx: number) => {
    if (idx === 0) return "🥇";
    if (idx === 1) return "🥈";
    if (idx === 2) return "🥉";
    return null;
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <h2 className="mb-4 text-base font-bold text-slate-800">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">
          Stats will appear once you play a match. 🏏
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row, idx) => {
            const medal = getMedal(idx);
            return (
              <li
                key={row.playerId}
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-50 to-white p-3 transition-all hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      {idx + 1}
                    </span>
                  )}
                  <span className="font-semibold text-slate-800">{row.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold text-slate-900">
                    {row.value}
                  </div>
                  {row.secondary && (
                    <div className="text-xs text-slate-500">{row.secondary}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
