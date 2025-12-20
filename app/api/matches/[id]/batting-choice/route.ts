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
    const { battingTeam } = body as {
      battingTeam: "A" | "B";
    };

    if (!battingTeam) {
      return NextResponse.json(
        { error: "battingTeam is required" },
        { status: 400 }
      );
    }

    // Set batting/bowling order
    const firstBatting: "A" | "B" = battingTeam;
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
      { error: "Failed to start match" },
      { status: 500 }
    );
  }
}



