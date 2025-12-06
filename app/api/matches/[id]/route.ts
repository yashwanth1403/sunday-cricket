import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      innings: {
        orderBy: { inningsNumber: "asc" },
      },
      players: {
        include: { player: true },
      },
      manOfMatch: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json(match);
}

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { id } = await params;

  try {
    // Prisma will cascade delete related records (innings, players, etc.) due to onDelete: Cascade
    await prisma.match.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete match" },
      { status: 500 }
    );
  }
}

