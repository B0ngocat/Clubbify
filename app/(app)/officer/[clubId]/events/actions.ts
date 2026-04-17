"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { eventInputSchema } from "@/lib/validation/event";

function parseEventForm(fd: FormData) {
  return eventInputSchema.parse({
    clubId: fd.get("clubId"),
    title: fd.get("title"),
    description: fd.get("description") ?? "",
    location: fd.get("location") || undefined,
    startsAt: fd.get("startsAt"),
    endsAt: fd.get("endsAt"),
    capacity: fd.get("capacity") || undefined,
  });
}

export async function createEvent(formData: FormData) {
  const ctx = await requireSession();
  const data = parseEventForm(formData);

  authorize("event.create", { orgId: ctx.orgId, clubId: data.clubId }, ctx);

  const { prisma, orgId } = scopedDb(ctx);
  const created = await prisma.event.create({
    data: {
      orgId,
      clubId: data.clubId,
      title: data.title,
      description: data.description,
      location: data.location,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity,
    },
  });

  revalidatePath(`/officer/${data.clubId}`);
  revalidatePath(`/clubs`);
  redirect(`/officer/${data.clubId}/events/${created.id}`);
}

export async function updateEvent(formData: FormData) {
  const ctx = await requireSession();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) throw new Error("Missing eventId");
  const data = parseEventForm(formData);

  const { prisma, orgWhere, orgId } = scopedDb(ctx);
  const existing = await prisma.event.findFirst({
    where: { ...orgWhere, id: eventId },
  });
  if (!existing) throw new Error("Event not found");

  authorize("event.update", { orgId, clubId: existing.clubId }, ctx);

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title: data.title,
      description: data.description,
      location: data.location,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      capacity: data.capacity,
    },
  });

  revalidatePath(`/officer/${existing.clubId}`);
  revalidatePath(`/events/${eventId}`);
  redirect(`/officer/${existing.clubId}/events/${eventId}`);
}

export async function deleteEvent(formData: FormData) {
  const ctx = await requireSession();
  const eventId = String(formData.get("eventId") ?? "");
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const existing = await prisma.event.findFirst({
    where: { ...orgWhere, id: eventId },
  });
  if (!existing) throw new Error("Event not found");

  authorize("event.delete", { orgId, clubId: existing.clubId }, ctx);

  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath(`/officer/${existing.clubId}`);
  redirect(`/officer/${existing.clubId}`);
}
