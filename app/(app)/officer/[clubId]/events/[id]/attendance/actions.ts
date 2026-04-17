"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import {
  openCheckIn as openCheckInStore,
  closeCheckIn as closeCheckInStore,
} from "@/lib/attendance/checkInCode";
import {
  openCheckInSchema,
  markAttendanceSchema,
} from "@/lib/validation/attendance";
import { awardPoints } from "@/lib/points/award";
import { recomputeEngagementForUser } from "@/lib/engagement/recompute";

export async function openCheckIn(formData: FormData) {
  const ctx = await requireSession();
  const { eventId, windowMinutes } = openCheckInSchema.parse({
    eventId: formData.get("eventId"),
    windowMinutes: formData.get("windowMinutes") || undefined,
  });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const event = await prisma.event.findFirst({ where: { ...orgWhere, id: eventId } });
  if (!event) throw new Error("Event not found");
  authorize("event.attendance.mark", { orgId, clubId: event.clubId }, ctx);

  await openCheckInStore({ orgId, eventId, windowMinutes });
  revalidatePath(`/officer/${event.clubId}/events/${event.id}/attendance`);
}

export async function closeCheckIn(formData: FormData) {
  const ctx = await requireSession();
  const eventId = String(formData.get("eventId") ?? "");
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const event = await prisma.event.findFirst({ where: { ...orgWhere, id: eventId } });
  if (!event) throw new Error("Event not found");
  authorize("event.attendance.mark", { orgId, clubId: event.clubId }, ctx);

  await closeCheckInStore(eventId);
  revalidatePath(`/officer/${event.clubId}/events/${event.id}/attendance`);
}

export async function markAttendance(formData: FormData) {
  const ctx = await requireSession();
  const { eventId, userId, attended } = markAttendanceSchema.parse({
    eventId: formData.get("eventId"),
    userId: formData.get("userId"),
    attended: formData.get("attended") ?? "true",
  });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const event = await prisma.event.findFirst({ where: { ...orgWhere, id: eventId } });
  if (!event) throw new Error("Event not found");
  authorize("event.attendance.mark", { orgId, clubId: event.clubId }, ctx);

  if (attended) {
    await prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: {
        orgId,
        eventId,
        userId,
        attended: true,
        markedByUserId: ctx.userId,
      },
      update: { attended: true, markedByUserId: ctx.userId, checkedInAt: new Date() },
    });
    await awardPoints({
      orgId,
      clubId: event.clubId,
      userId,
      source: "EVENT_ATTENDANCE",
      sourceId: event.id,
    });
    await recomputeEngagementForUser(userId);
  } else {
    // "Un-attend" removes the row. Points stay (historical record).
    await prisma.eventAttendance.deleteMany({
      where: { eventId, userId },
    });
  }

  revalidatePath(`/officer/${event.clubId}/events/${event.id}/attendance`);
}
