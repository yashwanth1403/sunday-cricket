import { MatchHistory } from "@/components/MatchHistory";

async function getMatches() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(new URL("/api/matches", base).toString(), {
    next: { revalidate: 15 },
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function MatchesPage() {
  const matches: Array<{
    id: string;
    name: string;
    date: string;
    teamA: string;
    teamB: string;
    winner: "A" | "B" | null;
    manOfMatch?: { name: string } | null;
  }> = await getMatches();

  const history = matches.map((m) => ({
    id: m.id,
    name: m.name,
    date: m.date,
    teamA: m.teamA,
    teamB: m.teamB,
    winner: m.winner,
    manOfMatchName: m.manOfMatch?.name ?? null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <span>📅</span>
            <span>Match History</span>
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            Tap a match to open its full scorecard and ball-by-ball timeline
          </p>
        </header>
        <MatchHistory matches={history} />
      </main>
    </div>
  );
}
