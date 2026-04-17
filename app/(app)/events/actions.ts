"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { rsvpInputSchema, eventIdSchema } from "@/lib/validation/event";
import { awardPoints } from "@/lib/points/award";
import { recomputeEngagementForUser } from "@/lib/engagement/recompute";

export async function rsvpToEvent(formData: FormData) {
  const ctx = await requireSession();
  const { eventId, status } = rsvpInputSchema.parse({
    eventId: formData.get("eventId"),
    status: formData.get("status") ?? "GOING",
  });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const event = await prisma.event.findFirst({
    where: { ...orgWhere, id: eventId },
  });
  if (!event) throw new Error("Event not found");

  authorize("event.rsvp", { orgId, clubId: event.clubId }, ctx);

  await prisma.eventRSVP.upsert({
    where: { eventId_userId: { eventId, userId: ctx.userId } },
    create: { orgId, eventId, userId: ctx.userId, status },
    update: { status },
  });

  if (status === "GOING") {
    await awardPoints({
      orgId,
      clubId: event.clubId,
      userId: ctx.userId,
      source: "EVENT_RSVP",
      sourceId: event.id,
    });
  }
  await recomputeEngagementForUser(ctx.userId);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/me");
}

export async function cancelRsvp(formData: FormData) {
  const ctx = await requireSession();
  const { eventId } = eventIdSchema.parse({ eventId: formData.get("eventId") });
  const { prisma, orgWhere } = scopedDb(ctx);

  const existing = await prisma.eventRSVP.findFirst({
    where: { ...orgWhere, eventId, userId: ctx.userId },
  });
  if (!existing) return;

  await prisma.eventRSVP.delete({ where: { id: existing.id } });

  // Award stays as a historical record. Recompute so the decay/engagement
  // picks up the change if needed.
  await recomputeEngagementForUser(ctx.userId);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/me");
}
