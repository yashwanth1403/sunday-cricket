import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateManOfTheMatch } from "@/lib/stats/momCalculator";
import { awardBadgesForMatch } from "@/lib/badges/badgeSystem";

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(_req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        innings: true,
        playerStats: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const firstInnings = match.innings.find((i) => i.inningsNumber === 1);
    const secondInnings = match.innings.find((i) => i.inningsNumber === 2);

    // Calculate winner based on runs
    let winner: "A" | "B" | null = null;
    if (firstInnings && secondInnings) {
      if (secondInnings.totalRuns > firstInnings.totalRuns) {
        winner = secondInnings.battingTeam;
      } else if (secondInnings.totalRuns < firstInnings.totalRuns) {
        winner = firstInnings.battingTeam;
      }
      // If tied, winner remains null
    }

    const momPlayerId = calculateManOfTheMatch(match);

    const updated = await prisma.match.update({
      where: { id },
      data: {
        status: "COMPLETED",
        winner,
        manOfMatchId: momPlayerId ?? null,
      },
      include: {
        manOfMatch: true,
        innings: true,
        playerStats: true,
      },
    });

    await awardBadgesForMatch(id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to complete match" },
      { status: 500 },
    );
  }
}


