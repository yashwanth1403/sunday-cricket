import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { tossWinner, decision } = body as {
      tossWinner: "A" | "B";
      decision: "BAT" | "BOWL";
    };

    if (!tossWinner || !decision) {
      return NextResponse.json(
        { error: "tossWinner and decision are required" },
        { status: 400 },
      );
    }

    // Decide batting/bowling order based on toss
    const firstBatting: "A" | "B" =
      decision === "BAT" ? tossWinner : tossWinner === "A" ? "B" : "A";
    const firstBowling: "A" | "B" = firstBatting === "A" ? "B" : "A";

    const match = await prisma.match.update({
      where: { id },
      data: {
        innings: {
          updateMany: [
            {
              where: { inningsNumber: 1 },
              data: {
                battingTeam: firstBatting,
                bowlingTeam: firstBowling,
                status: "IN_PROGRESS",
              },
            },
            {
              where: { inningsNumber: 2 },
              data: {
                battingTeam: firstBowling,
                bowlingTeam: firstBatting,
              },
            },
          ],
        },
        status: "IN_PROGRESS",
      },
      include: {
        innings: true,
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to record toss" },
      { status: 500 },
    );
  }
}


