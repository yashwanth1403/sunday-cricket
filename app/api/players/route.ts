import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const player = await prisma.player.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create player" },
      { status: 500 },
    );
  }
}


