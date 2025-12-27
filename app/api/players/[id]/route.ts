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

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  try {
    // Check if player has any balls (which would prevent deletion)
    const ballsCount = await prisma.ball.count({
      where: {
        OR: [
          { batsmanId: id },
          { nonStrikerId: id },
          { bowlerId: id },
          { fielderId: id },
        ],
      },
    });

    if (ballsCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete player. This player has match data (balls) associated with them.",
        },
        { status: 400 }
      );
    }

    // Check if player is man of match for any match
    const momMatches = await prisma.match.count({
      where: { manOfMatchId: id },
    });

    if (momMatches > 0) {
      // Set manOfMatchId to null for matches where this player is MOM
      await prisma.match.updateMany({
        where: { manOfMatchId: id },
        data: { manOfMatchId: null },
      });
    }

    // Delete the player (cascade will handle MatchPlayer, PlayerMatchStats, and Badges)
    await prisma.player.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}