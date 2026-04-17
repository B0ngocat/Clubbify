"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { selfCheckInSchema } from "@/lib/validation/attendance";
import { validateCode } from "@/lib/attendance/checkInCode";
import { awardPoints } from "@/lib/points/award";
import { recomputeEngagementForUser } from "@/lib/engagement/recompute";

export type SelfCheckInResult =
  | { ok: true; clubId: string }
  | {
      ok: false;
      reason: "invalid-input" | "not-open" | "wrong-code" | "expired" | "not-found";
    };

export async function selfCheckIn(formData: FormData): Promise<SelfCheckInResult> {
  const ctx = await requireSession();
  const parsed = selfCheckInSchema.safeParse({
    eventId: formData.get("eventId"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { ok: false, reason: "invalid-input" };

  const { eventId, code } = parsed.data;
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const event = await prisma.event.findFirst({
    where: { ...orgWhere, id: eventId },
  });
  if (!event) return { ok: false, reason: "not-found" };

  const validation = await validateCode(eventId, code);
  if (!validation.ok) return { ok: false, reason: validation.reason };

  await prisma.eventAttendance.upsert({
    where: { eventId_userId: { eventId, userId: ctx.userId } },
    create: {
      orgId,
      eventId,
      userId: ctx.userId,
      attended: true,
      markedByUserId: ctx.userId,
    },
    update: { attended: true, checkedInAt: new Date() },
  });

  await awardPoints({
    orgId,
    clubId: event.clubId,
    userId: ctx.userId,
    source: "EVENT_ATTENDANCE",
    sourceId: event.id,
  });

  await recomputeEngagementForUser(ctx.userId);

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/me`);

  return { ok: true, clubId: event.clubId };
}
