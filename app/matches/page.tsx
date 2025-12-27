import { MatchHistory } from "@/components/MatchHistory";
import { DateFilter } from "@/components/DateFilter";
import { BackButton } from "@/components/BackButton";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const revalidate = 15; // Revalidate every 15 seconds

async function getMatches(filterDate?: string) {
  try {
    const whereClause: Prisma.MatchWhereInput = {};

    // Filter by date if provided
    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      const startOfDay = new Date(filterDateObj);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDateObj);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const matchesData = await prisma.match.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      take: 50, // Increased limit to show more filtered results
      include: {
        manOfMatch: true,
        innings: true,
      },
    });

    return matchesData.map((m) => ({
      id: m.id,
      name: m.name,
      date: m.date.toISOString(),
      teamA: m.teamA,
      teamB: m.teamB,
      winner: m.winner,
      status: m.status,
      manOfMatch: m.manOfMatch ? { name: m.manOfMatch.name } : null,
    }));
  } catch (error) {
    console.error("Failed to load matches:", error);
    return [];
  }
}

interface MatchesPageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams;
  const filterDate = params.date;
  const matches: Array<{
    id: string;
    name: string;
    date: string;
    teamA: string;
    teamB: string;
    winner: "A" | "B" | null;
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
    manOfMatch?: { name: string } | null;
  }> = await getMatches(filterDate);

  const history = matches.map((m) => ({
    id: m.id,
    name: m.name,
    date: m.date,
    teamA: m.teamA,
    teamB: m.teamB,
    winner: m.winner,
    status: m.status,
    manOfMatchName: m.manOfMatch?.name ?? null,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-6">
        <header className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-lg">
          <div className="mb-3">
            <BackButton href="/" label="Home" />
          </div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <span>📅</span>
            <span>Match History</span>
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            Tap a match to open its full scorecard and ball-by-ball timeline
          </p>
        </header>
        <div className="mb-4 rounded-xl bg-white p-4 shadow-md">
          <DateFilter />
        </div>
        <MatchHistory matches={history} />
      </main>
    </div>
  );
}
