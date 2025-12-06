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
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        playerStats: true,
        badges: true,
      },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load player" },
      { status: 500 }
    );
  }
}
