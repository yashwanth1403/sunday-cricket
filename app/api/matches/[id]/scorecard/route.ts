import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        innings: {
          orderBy: { inningsNumber: "asc" },
        },
        playerStats: {
          include: { player: true },
        },
        balls: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load scorecard" },
      { status: 500 },
    );
  }
}


