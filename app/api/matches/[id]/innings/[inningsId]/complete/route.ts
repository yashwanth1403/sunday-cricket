import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteProps {
  params: Promise<{
    id: string;
    inningsId: string;
  }>;
}

export async function POST(_req: NextRequest, { params }: RouteProps) {
  const { id: matchId, inningsId } = await params;

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const innings = await prisma.innings.findUnique({
      where: { id: inningsId },
    });

    if (!innings || innings.matchId !== matchId) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }

    // Mark current innings as completed
    const updatedInnings = await prisma.innings.update({
      where: { id: inningsId },
      data: {
        status: "COMPLETED",
      },
    });

    let secondInningsStarted = false;
    let matchCompleted = false;

    // If first innings, start second innings
    if (updatedInnings.inningsNumber === 1) {
      const secondInnings = await prisma.innings.findFirst({
        where: {
          matchId: match.id,
          inningsNumber: 2,
        },
      });

      if (secondInnings) {
        await prisma.innings.update({
          where: { id: secondInnings.id },
          data: { status: "IN_PROGRESS" },
        });
        secondInningsStarted = true;
      }
    }

    // If second innings, complete match and calculate result
    if (updatedInnings.inningsNumber === 2) {
      const firstInnings = await prisma.innings.findFirst({
        where: {
          matchId: match.id,
          inningsNumber: 1,
        },
      });

      if (firstInnings) {
        // Calculate winner
        let winner: "A" | "B" | null = null;
        if (updatedInnings.totalRuns > firstInnings.totalRuns) {
          winner = updatedInnings.battingTeam;
        } else if (updatedInnings.totalRuns < firstInnings.totalRuns) {
          winner = firstInnings.battingTeam;
        }
        // If tied, winner remains null

        // Calculate MOM
        const matchWithStats = await prisma.match.findUnique({
          where: { id: match.id },
          include: {
            innings: true,
            playerStats: true,
          },
        });

        if (matchWithStats) {
          const { calculateManOfTheMatch } = await import(
            "@/lib/stats/momCalculator"
          );
          const momPlayerId = calculateManOfTheMatch(matchWithStats);

          await prisma.match.update({
            where: { id: match.id },
            data: {
              status: "COMPLETED",
              winner,
              manOfMatchId: momPlayerId ?? null,
            },
          });

          // Award badges
          const { awardBadgesForMatch } = await import(
            "@/lib/badges/badgeSystem"
          );
          await awardBadgesForMatch(match.id);
          matchCompleted = true;
        }
      }
    }

    return NextResponse.json({
      innings: updatedInnings,
      secondInningsStarted,
      matchCompleted,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to complete innings" },
      { status: 500 }
    );
  }
}
