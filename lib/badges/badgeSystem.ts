import type { BadgeType, PlayerMatchStats } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function determineBadgesForStats(
  stats: PlayerMatchStats,
  existing: BadgeType[],
): BadgeType[] {
  const toAward: BadgeType[] = [];

  const maybeAdd = (type: BadgeType, condition: boolean) => {
    if (condition && !existing.includes(type) && !toAward.includes(type)) {
      toAward.push(type);
    }
  };

  // 50+ Runs
  maybeAdd("FIFTY", stats.runs >= 50);

  // Five-for
  maybeAdd("FIVE_FOR", stats.wickets >= 5);

  // Sixer milestones
  maybeAdd("SIXER_MONSTER_10", stats.sixes >= 10);
  maybeAdd("SIXER_MONSTER_25", stats.sixes >= 25);
  maybeAdd("SIXER_MONSTER_50", stats.sixes >= 50);

  return toAward;
}

export async function awardBadgesForMatch(matchId: string) {
  const stats = await prisma.playerMatchStats.findMany({
    where: { matchId },
  });

  if (!stats.length) return;

  const existingByPlayer: Record<string, BadgeType[]> = {};
  const existingBadges = await prisma.badge.findMany({
    where: { matchId },
  });
  for (const b of existingBadges) {
    if (!existingByPlayer[b.playerId]) existingByPlayer[b.playerId] = [];
    existingByPlayer[b.playerId].push(b.type);
  }

  const badgesToCreate: { playerId: string; type: BadgeType }[] = [];

  for (const s of stats) {
    const already = existingByPlayer[s.playerId] ?? [];
    const newOnes = determineBadgesForStats(s, already);
    for (const type of newOnes) {
      badgesToCreate.push({ playerId: s.playerId, type });
    }
  }

  if (!badgesToCreate.length) return;

  await prisma.badge.createMany({
    data: badgesToCreate.map((b) => ({
      playerId: b.playerId,
      matchId,
      type: b.type,
    })),
    skipDuplicates: true,
  });
}


