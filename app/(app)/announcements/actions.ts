"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { awardPoints } from "@/lib/points/award";
import { recomputeEngagementForUser } from "@/lib/engagement/recompute";

export async function markAnnouncementRead(formData: FormData) {
  const ctx = await requireSession();
  const announcementId = String(formData.get("announcementId") ?? "");
  if (!announcementId) return;

  const { prisma, orgWhere, orgId } = scopedDb(ctx);
  const announcement = await prisma.announcement.findFirst({
    where: { ...orgWhere, id: announcementId },
  });
  if (!announcement) return;

  // Idempotent: already-read rows are left alone
  await prisma.announcementRead.upsert({
    where: {
      announcementId_userId: { announcementId, userId: ctx.userId },
    },
    create: {
      orgId,
      announcementId,
      userId: ctx.userId,
    },
    update: {},
  });

  await awardPoints({
    orgId,
    clubId: announcement.clubId,
    userId: ctx.userId,
    source: "ANNOUNCEMENT_READ",
    sourceId: announcementId,
  });

  await recomputeEngagementForUser(ctx.userId);

  revalidatePath(`/clubs`);
  revalidatePath(`/me`);
}
