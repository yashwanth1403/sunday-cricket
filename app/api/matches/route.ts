import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const matches = await prisma.match.findMany({
    orderBy: { date: "desc" },
    take: 20,
    include: {
      manOfMatch: true,
      innings: true,
    },
  });

  return NextResponse.json(matches);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      date,
      teamA,
      teamB,
      totalOvers,
      maxOversPerBowler,
    } = body;

    if (!name || !teamA || !teamB || !totalOvers || !maxOversPerBowler) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const match = await prisma.match.create({
      data: {
        name,
        date: date ? new Date(date) : new Date(),
        teamA,
        teamB,
        totalOvers,
        maxOversPerBowler,
        // create two innings upfront
        innings: {
          create: [
            {
              inningsNumber: 1,
              battingTeam: "A",
              bowlingTeam: "B",
            },
            {
              inningsNumber: 2,
              battingTeam: "B",
              bowlingTeam: "A",
            },
          ],
        },
      },
      include: {
        innings: true,
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 },
    );
  }
}


