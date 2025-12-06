import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PlayerSelector } from "@/components/PlayerSelector";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchSetupPage({ params }: PageProps) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
  });

  if (!match) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-emerald-950/95 py-6 text-zinc-950">
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4">
        <header>
          <h1 className="text-xl font-semibold text-emerald-50">
            Players & teams
          </h1>
          <p className="text-sm text-emerald-200">
            Tap players to cycle through Team A → Team B → Bench → Dual.
          </p>
        </header>
        <PlayerSelector matchId={match.id} />
      </main>
    </div>
  );
}


