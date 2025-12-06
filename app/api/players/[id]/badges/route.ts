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
    const badges = await prisma.badge.findMany({
      where: { playerId: id },
      orderBy: { unlockedAt: "desc" },
    });
    return NextResponse.json(badges);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load badges" },
      { status: 500 }
    );
  }
}
