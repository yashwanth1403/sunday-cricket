import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{
    id: string;
    inningsId: string;
  }>;
}

export default async function InningsSummaryPage({ params }: PageProps) {
  const { id: matchId, inningsId } = await params;

  const innings = await prisma.innings.findUnique({
    where: { id: inningsId },
    include: {
      match: true,
      balls: {
        orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
      },
      playerStats: {
        include: { player: true },
      },
    },
  });

  if (!innings || innings.matchId !== matchId) {
    notFound();
  }

  const runRate =
    innings.overs > 0
      ? (innings.totalRuns / innings.overs).toFixed(2)
      : "-";

  const topBatters = [...innings.playerStats]
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 3);

  const topBowlers = [...innings.playerStats]
    .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)
    .slice(0, 3);

  const byOver = new Map<number, string[]>();
  for (const b of innings.balls) {
    if (!byOver.has(b.overNumber)) byOver.set(b.overNumber, []);
    const arr = byOver.get(b.overNumber)!;
    if (b.isWicket) arr.push("W");
    else if (b.isWide) arr.push("Wd");
    else if (b.isNoBall) arr.push("Nb");
    else arr.push(String(b.runs));
  }

  const overs = Array.from(byOver.entries()).sort(([a], [b]) => a - b);

  const battingTeamName =
    innings.battingTeam === "A" ? innings.match.teamA : innings.match.teamB;

  return (
    <div className="min-h-screen bg-emerald-950/95 py-6 text-zinc-950">
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4">
        <header>
          <h1 className="text-xl font-semibold text-emerald-50">
            Innings summary – {battingTeamName}
          </h1>
          <p className="text-sm text-emerald-200">
            {innings.totalRuns}/{innings.wickets} in {innings.overs} overs • RR{" "}
            {runRate}
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-emerald-900/60 p-3 text-xs text-emerald-50">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
              Top batting
            </div>
            <ul className="space-y-1">
              {topBatters.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.player.name}</span>
                  <span>
                    {s.runs} ({s.ballsFaced}){" "}
                    {s.ballsFaced > 0
                      ? `SR ${((s.runs / s.ballsFaced) * 100).toFixed(1)}`
                      : ""}
                  </span>
                </li>
              ))}
              {topBatters.length === 0 && (
                <li className="text-emerald-200">No batting stats yet.</li>
              )}
            </ul>
          </div>
          <div className="rounded-2xl bg-emerald-900/60 p-3 text-xs text-emerald-50">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
              Top bowling
            </div>
            <ul className="space-y-1">
              {topBowlers.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.player.name}</span>
                  <span>
                    {Math.floor(s.ballsBowled / 6)}.{s.ballsBowled % 6} •{" "}
                    {s.runsConceded}/{s.wickets}
                  </span>
                </li>
              ))}
              {topBowlers.length === 0 && (
                <li className="text-emerald-200">No bowling stats yet.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl bg-emerald-900/60 p-3 text-xs text-emerald-50">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200">
            Per-over breakdown
          </div>
          <div className="space-y-1">
            {overs.map(([over, ballsInOver]) => (
              <div key={over} className="flex items-center justify-between">
                <span className="text-emerald-100">Over {over + 1}</span>
                <span className="font-mono text-emerald-50">
                  {ballsInOver.join(", ")}
                </span>
              </div>
            ))}
            {overs.length === 0 && (
              <p className="text-emerald-200">No balls recorded yet.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}


