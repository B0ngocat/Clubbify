"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import {
  announcementInputSchema,
  announcementIdSchema,
} from "@/lib/validation/announcement";

export async function createAnnouncement(formData: FormData) {
  const ctx = await requireSession();
  const data = announcementInputSchema.parse({
    clubId: formData.get("clubId"),
    title: formData.get("title"),
    body: formData.get("body"),
  });

  authorize("announcement.create", { orgId: ctx.orgId, clubId: data.clubId }, ctx);

  const { prisma, orgId } = scopedDb(ctx);
  await prisma.announcement.create({
    data: {
      orgId,
      clubId: data.clubId,
      authorId: ctx.userId,
      title: data.title,
      body: data.body,
    },
  });

  revalidatePath(`/officer/${data.clubId}/announcements`);
  revalidatePath(`/clubs`);
}

export async function deleteAnnouncement(formData: FormData) {
  const ctx = await requireSession();
  const { announcementId } = announcementIdSchema.parse({
    announcementId: formData.get("announcementId"),
  });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const existing = await prisma.announcement.findFirst({
    where: { ...orgWhere, id: announcementId },
  });
  if (!existing) throw new Error("Announcement not found");

  authorize("announcement.delete", { orgId, clubId: existing.clubId }, ctx);

  await prisma.announcement.delete({ where: { id: announcementId } });
  revalidatePath(`/officer/${existing.clubId}/announcements`);
}
