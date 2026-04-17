import { prisma } from "@/lib/db/client";
import { computeScore } from "@/lib/engagement/score";

/**
 * Recomputes the engagement score for a single user and upserts it into
 * StudentEngagementScore. Called inline from Server Actions that mutate
 * signals (attendance, RSVP, announcement read). A nightly cron will cover
 * inactive users in M4 when background jobs land.
 */
export async function recomputeEngagementForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, orgId: true },
  });
  if (!user || !user.orgId) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [attendances, rsvps, reads, memberships, officerships] = await Promise.all([
    prisma.eventAttendance.findMany({
      where: { userId, attended: true, checkedInAt: { gte: windowStart } },
      select: { checkedInAt: true },
    }),
    prisma.eventRSVP.findMany({
      where: { userId, createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.announcementRead.findMany({
      where: { userId, readAt: { gte: windowStart } },
      select: { readAt: true },
    }),
    prisma.clubMembership.findMany({
      where: { userId },
      select: { clubId: true },
    }),
    prisma.clubMembership.findMany({
      where: { userId, isOfficer: true },
      select: { clubId: true },
    }),
  ]);

  // Compute current score
  const current = computeScore({
    now,
    attendances: attendances.map((a) => ({ at: a.checkedInAt })),
    rsvps: rsvps.map((r) => ({ at: r.createdAt })),
    announcementReads: reads.map((r) => ({ at: r.readAt })),
    distinctActiveClubIds: memberships.map((m) => m.clubId),
    isOfficer: officerships.length > 0,
  });

  // Compute score 7 days ago for trend
  const thenNow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const then = computeScore({
    now: thenNow,
    attendances: attendances
      .filter((a) => a.checkedInAt <= thenNow)
      .map((a) => ({ at: a.checkedInAt })),
    rsvps: rsvps
      .filter((r) => r.createdAt <= thenNow)
      .map((r) => ({ at: r.createdAt })),
    announcementReads: reads
      .filter((r) => r.readAt <= thenNow)
      .map((r) => ({ at: r.readAt })),
    distinctActiveClubIds: memberships.map((m) => m.clubId),
    isOfficer: officerships.length > 0,
  });

  const trend7d = Math.round((current.score - then.score) * 10) / 10;

  // Re-derive band with trend
  const finalScore = computeScore(
    {
      now,
      attendances: attendances.map((a) => ({ at: a.checkedInAt })),
      rsvps: rsvps.map((r) => ({ at: r.createdAt })),
      announcementReads: reads.map((r) => ({ at: r.readAt })),
      distinctActiveClubIds: memberships.map((m) => m.clubId),
      isOfficer: officerships.length > 0,
    },
    trend7d,
  );

  await prisma.studentEngagementScore.upsert({
    where: { userId },
    create: {
      userId,
      orgId: user.orgId,
      score: finalScore.score,
      band: finalScore.band,
      components: finalScore.components as object,
      trend7d,
    },
    update: {
      score: finalScore.score,
      band: finalScore.band,
      components: finalScore.components as object,
      trend7d,
      computedAt: new Date(),
    },
  });
}
