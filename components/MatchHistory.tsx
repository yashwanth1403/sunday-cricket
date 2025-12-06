import Link from "next/link";

type MatchHistoryItem = {
  id: string;
  name: string;
  date: string;
  teamA: string;
  teamB: string;
  winner?: "A" | "B" | null;
  manOfMatchName?: string | null;
};

interface Props {
  matches: MatchHistoryItem[];
}

export function MatchHistory({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-md">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800">
          <span>📅</span>
          <span>Recent Matches</span>
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          No matches yet. Start your first Sunday game! 🏏
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-md">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
        <span>📅</span>
        <span>Recent Matches</span>
      </h2>
      <ul className="space-y-3">
        {matches.map((m) => {
          const winnerName =
            m.winner === "A" ? m.teamA : m.winner === "B" ? m.teamB : undefined;
          return (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className="block rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50 p-4 transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-900">
                        {m.teamA} vs {m.teamB}
                      </div>
                      {winnerName && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          🏆 {winnerName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>📆 {new Date(m.date).toLocaleDateString()}</span>
                      {!winnerName && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-700">
                          🔴 Live
                        </span>
                      )}
                    </div>
                    {m.manOfMatchName && (
                      <div className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
                        <span>⭐</span>
                        <span>MOM: {m.manOfMatchName}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


