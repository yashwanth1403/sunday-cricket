import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const stats = await prisma.playerMatchStats.findMany({
      include: {
        player: true,
      },
    });

    const byPlayer = new Map<
      string,
      {
        id: string;
        name: string;
        runs: number;
        ballsFaced: number;
        wickets: number;
        ballsBowled: number;
      }
    >();

    for (const s of stats) {
      if (!byPlayer.has(s.playerId)) {
        byPlayer.set(s.playerId, {
          id: s.playerId,
          name: s.player.name,
          runs: 0,
          ballsFaced: 0,
          wickets: 0,
          ballsBowled: 0,
        });
      }
      const agg = byPlayer.get(s.playerId)!;
      agg.runs += s.runs;
      agg.ballsFaced += s.ballsFaced;
      agg.wickets += s.wickets;
      agg.ballsBowled += s.ballsBowled;
    }

    const players = Array.from(byPlayer.values());

    const topRuns = [...players]
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, runs: p.runs }));

    const topWickets = [...players]
      .sort((a, b) => b.wickets - a.wickets)
      .slice(0, 10)
      .map((p) => ({ id: p.id, name: p.name, wickets: p.wickets }));

    const topStrikeRate = [...players]
      .filter((p) => p.ballsFaced >= 20)
      .map((p) => ({
        id: p.id,
        name: p.name,
        strikeRate: p.ballsFaced
          ? (p.runs / p.ballsFaced) * 100
          : 0,
      }))
      .sort((a, b) => b.strikeRate - a.strikeRate)
      .slice(0, 10);

    return NextResponse.json({ topRuns, topWickets, topStrikeRate });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load leaderboards" },
      { status: 500 },
    );
  }
}


