import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LiveScoring } from "@/components/LiveScoring";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LivePage({ params }: PageProps) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      innings: {
        orderBy: { inningsNumber: "asc" },
      },
      players: {
        include: { player: true },
      },
    },
  });

  if (!match) notFound();

  const firstInnings = match.innings.find((i) => i.inningsNumber === 1);
  const secondInnings = match.innings.find((i) => i.inningsNumber === 2);

  const currentInnings =
    firstInnings && firstInnings.status !== "COMPLETED"
      ? firstInnings
      : secondInnings ?? firstInnings;

  if (!currentInnings) notFound();

  const battingTeamName =
    currentInnings.battingTeam === "A" ? match.teamA : match.teamB;
  const bowlingTeamName =
    currentInnings.bowlingTeam === "A" ? match.teamA : match.teamB;

  const players = match.players.map((mp) => ({
    id: mp.playerId,
    name: mp.player.name,
    team: mp.team,
    isDualPlayer: mp.isDualPlayer,
  }));

  const balls = await prisma.ball.findMany({
    where: { inningsId: currentInnings.id },
    orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
  });

  // Calculate target runs for 2nd innings
  const targetRuns =
    currentInnings.inningsNumber === 2 && firstInnings
      ? firstInnings.totalRuns + 1
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <header className="mb-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white shadow-lg">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <span>🔴</span>
            <span>
              Live – {match.teamA} vs {match.teamB}
            </span>
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            Ball-by-ball scoring with auto stats and strike rotation
          </p>
        </header>
        <LiveScoring
          matchId={match.id}
          inningsId={currentInnings.id}
          battingTeamName={battingTeamName}
          bowlingTeamName={bowlingTeamName}
          battingSide={currentInnings.battingTeam}
          bowlingSide={currentInnings.bowlingTeam}
          players={players}
          initialBalls={balls}
          totalOvers={match.totalOvers}
          inningsNumber={currentInnings.inningsNumber}
          targetRuns={targetRuns}
          initialScore={{
            totalRuns: currentInnings.totalRuns,
            wickets: currentInnings.wickets,
            overs: currentInnings.overs,
            ballsInOver: currentInnings.ballsInOver,
          }}
        />
      </main>
    </div>
  );
}
