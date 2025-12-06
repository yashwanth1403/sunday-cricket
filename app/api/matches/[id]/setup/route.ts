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
    const { players } = body as {
      players: Array<{
        playerId: string;
        team: "A" | "B";
        isDualPlayer?: boolean;
        battingOrder?: number | null;
        bowlingOrder?: number | null;
      }>;
    };

    if (!Array.isArray(players) || players.length === 0) {
      return NextResponse.json(
        { error: "Players array is required" },
        { status: 400 }
      );
    }

    const match = await prisma.match.update({
      where: { id },
      data: {
        players: {
          deleteMany: {},
          create: players.map((p) => ({
            playerId: p.playerId,
            team: p.team,
            isDualPlayer: p.isDualPlayer ?? false,
            battingOrder: p.battingOrder ?? null,
            bowlingOrder: p.bowlingOrder ?? null,
          })),
        },
      },
      include: {
        players: {
          include: { player: true },
        },
      },
    });

    return NextResponse.json(match);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to setup match" },
      { status: 500 }
    );
  }
}
