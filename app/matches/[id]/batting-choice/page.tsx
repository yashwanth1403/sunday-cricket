import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BattingChoice } from "@/components/BattingChoice";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BattingChoicePage({ params }: PageProps) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: {
        include: { player: true },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const teamAPlayers = match.players
    .filter((mp) => mp.team === "A" && !mp.isDualPlayer)
    .map((mp) => mp.player.name);
  const teamBPlayers = match.players
    .filter((mp) => mp.team === "B" && !mp.isDualPlayer)
    .map((mp) => mp.player.name);
  const dualPlayers = match.players
    .filter((mp) => mp.isDualPlayer)
    .map((mp) => mp.player.name);

  return (
    <div className="min-h-screen bg-emerald-950/95 py-6 text-zinc-950">
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
        <header>
          <h1 className="text-xl font-semibold text-emerald-50">
            Start Match – {match.teamA} vs {match.teamB}
          </h1>
          <p className="text-sm text-emerald-200">
            Select which team will bat first.
          </p>
        </header>
        <BattingChoice
          matchId={match.id}
          teamA={match.teamA}
          teamB={match.teamB}
          teamAPlayers={teamAPlayers}
          teamBPlayers={teamBPlayers}
          dualPlayers={dualPlayers}
        />
      </main>
    </div>
  );
}
