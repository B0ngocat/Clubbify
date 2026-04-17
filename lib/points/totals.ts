import { prisma } from "@/lib/db/client";

export type ClubPointsTotal = {
  clubId: string;
  total: number;
};

export async function totalsForUser(
  orgId: string,
  userId: string,
): Promise<ClubPointsTotal[]> {
  const rows = await prisma.clubPointAward.groupBy({
    by: ["clubId"],
    where: { orgId, userId },
    _sum: { points: true },
  });
  return rows.map((r) => ({ clubId: r.clubId, total: r._sum.points ?? 0 }));
}

export async function totalForUserInClub(
  orgId: string,
  clubId: string,
  userId: string,
): Promise<number> {
  const agg = await prisma.clubPointAward.aggregate({
    where: { orgId, clubId, userId },
    _sum: { points: true },
  });
  return agg._sum.points ?? 0;
}

export type ThresholdProgress = {
  current: number;
  next: { label: string; points: number; remaining: number } | null;
  achieved: { label: string; points: number }[];
};

export function deriveThresholdProgress(
  current: number,
  thresholds: { label: string; points: number }[],
): ThresholdProgress {
  const sorted = [...thresholds].sort((a, b) => a.points - b.points);
  const achieved = sorted.filter((t) => current >= t.points);
  const next = sorted.find((t) => current < t.points) ?? null;
  return {
    current,
    achieved,
    next: next
      ? { label: next.label, points: next.points, remaining: next.points - current }
      : null,
  };
}
