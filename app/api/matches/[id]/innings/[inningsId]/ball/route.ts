import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordBall, undoLastBall, syncRecordBallToDatabase, syncUndoBallToDatabase } from "@/lib/scoring/scoringEngine";
import { calculateRecordBall, calculateUndoBall, type BallLike } from "@/lib/scoring/scoringCalculator";

interface RouteProps {
  params: Promise<{
    id: string;
    inningsId: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteProps) {
  const { id: matchId, inningsId } = await params;

  try {
    const body = await req.json();
    const {
      batsmanId,
      nonStrikerId,
      bowlerId,
      runs,
      isWide,
      isNoBall,
      isWicket,
      wicketType,
      fielderId,
      dismissedBatsmanId,
    } = body;

    if (!batsmanId || !nonStrikerId || !bowlerId) {
      return NextResponse.json(
        { error: "batsmanId, nonStrikerId and bowlerId are required" },
        { status: 400 }
      );
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const innings = await prisma.innings.findUnique({
      where: { id: inningsId },
    });
    if (!innings || innings.matchId !== matchId) {
      return NextResponse.json({ error: "Innings not found" }, { status: 404 });
    }

    // Get existing balls for calculation (fast read operation)
    const existingBalls = await prisma.ball.findMany({
      where: { inningsId },
      orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
    });

    // Convert to BallLike format
    const existingBallsLike: BallLike[] = existingBalls.map((b) => ({
      id: b.id,
      overNumber: b.overNumber,
      ballNumber: b.ballNumber,
      runs: b.runs,
      isWide: b.isWide,
      isNoBall: b.isNoBall,
      isWicket: b.isWicket,
      batsmanId: b.batsmanId,
      nonStrikerId: b.nonStrikerId,
      bowlerId: b.bowlerId,
      strikerChanged: b.strikerChanged,
      wicketType: b.wicketType,
      fielderId: b.fielderId,
      dismissedBatsmanId: b.dismissedBatsmanId,
    }));

    // Calculate immediately (pure function, no database access)
    const calculationResult = calculateRecordBall({
      existingBalls: existingBallsLike,
      innings,
      batsmanId,
      nonStrikerId,
      bowlerId,
      runs: Number(runs ?? 0),
      isWide: Boolean(isWide),
      isNoBall: Boolean(isNoBall),
      isWicket: Boolean(isWicket),
      wicketType,
      fielderId: fielderId || undefined,
      dismissedBatsmanId: dismissedBatsmanId || undefined,
    });

    // Generate a temporary ID for the ball (will be replaced by database)
    const tempBallId = `temp-${Date.now()}-${Math.random()}`;
    const ballWithId: BallLike = {
      ...calculationResult.ball,
      id: tempBallId,
    };

    // Start background database sync (don't await - fire and forget)
    syncRecordBallToDatabase(inningsId, {
      match,
      innings,
      batsmanId,
      nonStrikerId,
      bowlerId,
      runs: Number(runs ?? 0),
      isWide: Boolean(isWide),
      isNoBall: Boolean(isNoBall),
      isWicket: Boolean(isWicket),
      wicketType,
      fielderId: fielderId || undefined,
      dismissedBatsmanId: dismissedBatsmanId || undefined,
    }, calculationResult).catch((error) => {
      console.error("Background sync error:", error);
      // In production, you might want to queue this for retry
    });

    // Use calculated result for immediate response
    const updatedInnings = {
      ...innings,
      totalRuns: calculationResult.updatedInnings.totalRuns,
      wickets: calculationResult.updatedInnings.wickets,
      overs: calculationResult.updatedInnings.overs,
      ballsInOver: calculationResult.updatedInnings.ballsInOver,
    };

    // Get all match players to calculate actual batting team size
    const matchPlayers = await prisma.matchPlayer.findMany({
      where: { matchId },
    });

    // Calculate batting team players (including dual players)
    // Dual players can bat for either team
    const battingTeamPlayers = matchPlayers.filter(
      (mp) => mp.team === updatedInnings.battingTeam || mp.isDualPlayer
    );

    // All out when wickets >= (total players - 1)
    // -1 because one player remains not out
    const maxWickets = Math.max(0, battingTeamPlayers.length - 1);
    const isAllOut = updatedInnings.wickets >= maxWickets;
    const isOversComplete = updatedInnings.overs >= match.totalOvers;

    // Check if target runs reached (for 2nd innings)
    let isTargetReached = false;
    if (updatedInnings.inningsNumber === 2) {
      const firstInnings = await prisma.innings.findFirst({
        where: {
          matchId: match.id,
          inningsNumber: 1,
        },
      });
      if (firstInnings) {
        const targetRuns = firstInnings.totalRuns + 1;
        isTargetReached = updatedInnings.totalRuns >= targetRuns;
      }
    }

    // Check if innings is complete (overs reached, all out, or target reached)
    const isInningsComplete = isOversComplete || isAllOut || isTargetReached;

    // Return flag indicating completion is possible (user must confirm)
    const canCompleteInnings =
      isInningsComplete && updatedInnings.status !== "COMPLETED";

    return NextResponse.json(
      {
        innings: updatedInnings,
        ball: ballWithId,
        canCompleteInnings,
        isAllOut,
        isOversComplete,
        isTargetReached,
        inningsNumber: updatedInnings.inningsNumber,
        syncing: true, // Flag to indicate background sync is in progress
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to record ball" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteProps) {
  const { inningsId } = await params;

  try {
    // Get current innings
    const innings = await prisma.innings.findUniqueOrThrow({
      where: { id: inningsId },
    });

    // Get existing balls
    const existingBalls = await prisma.ball.findMany({
      where: { inningsId },
      orderBy: [{ overNumber: "asc" }, { ballNumber: "asc" }],
    });

    // Convert to BallLike format
    const existingBallsLike: BallLike[] = existingBalls.map((b) => ({
      id: b.id,
      overNumber: b.overNumber,
      ballNumber: b.ballNumber,
      runs: b.runs,
      isWide: b.isWide,
      isNoBall: b.isNoBall,
      isWicket: b.isWicket,
      batsmanId: b.batsmanId,
      nonStrikerId: b.nonStrikerId,
      bowlerId: b.bowlerId,
      strikerChanged: b.strikerChanged,
      wicketType: b.wicketType,
      fielderId: b.fielderId,
      dismissedBatsmanId: b.dismissedBatsmanId,
    }));

    // Calculate immediately
    const calculationResult = calculateUndoBall({
      existingBalls: existingBallsLike,
      innings,
    });

    // Start background database sync
    syncUndoBallToDatabase(inningsId, calculationResult).catch((error) => {
      console.error("Background sync error (undo):", error);
    });

    // Return calculated result immediately
    return NextResponse.json({
      innings: {
        ...innings,
        totalRuns: calculationResult.updatedInnings.totalRuns,
        wickets: calculationResult.updatedInnings.wickets,
        overs: calculationResult.updatedInnings.overs,
        ballsInOver: calculationResult.updatedInnings.ballsInOver,
      },
      deletedBall: calculationResult.deletedBall,
      syncing: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to undo last ball" },
      { status: 500 }
    );
  }
}
