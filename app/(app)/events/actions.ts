"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { rsvpInputSchema, eventIdSchema } from "@/lib/validation/event";

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

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
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

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}
