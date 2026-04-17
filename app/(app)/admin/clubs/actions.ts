"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import {
  clubInputSchema,
  archiveClubSchema,
  promoteOfficerSchema,
} from "@/lib/validation/admin";
import { recordAudit } from "@/lib/audit/log";

export async function createClub(formData: FormData) {
  const ctx = await requireAdmin();
  const data = clubInputSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    category: formData.get("category") || undefined,
  });
  const { prisma, orgId } = scopedDb(ctx);
  const club = await prisma.club.create({
    data: { orgId, ...data },
  });
  await recordAudit({
    orgId,
    actorUserId: ctx.userId,
    action: "club.create",
    entityType: "Club",
    entityId: club.id,
    diff: { name: data.name },
  });
  revalidatePath("/admin/clubs");
  revalidatePath("/clubs");
}

export async function setArchived(formData: FormData) {
  const ctx = await requireAdmin();
  const { clubId, archived } = archiveClubSchema.parse({
    clubId: formData.get("clubId"),
    archived: formData.get("archived"),
  });
  const { prisma, orgWhere } = scopedDb(ctx);
  const existing = await prisma.club.findFirst({ where: { ...orgWhere, id: clubId } });
  if (!existing) throw new Error("Club not found");

  await prisma.club.update({
    where: { id: clubId },
    data: { isActive: !archived },
  });
  await recordAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: archived ? "club.archive" : "club.unarchive",
    entityType: "Club",
    entityId: clubId,
  });
  revalidatePath("/admin/clubs");
  revalidatePath("/clubs");
}

export async function setOfficer(formData: FormData) {
  const ctx = await requireAdmin();
  const { clubId, userId, isOfficer } = promoteOfficerSchema.parse({
    clubId: formData.get("clubId"),
    userId: formData.get("userId"),
    isOfficer: formData.get("isOfficer"),
  });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const club = await prisma.club.findFirst({ where: { ...orgWhere, id: clubId } });
  if (!club) throw new Error("Club not found");

  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId, userId } },
    create: { orgId, clubId, userId, isOfficer },
    update: { isOfficer },
  });
  // Make sure the user has the OFFICER role if being promoted.
  if (isOfficer) {
    await prisma.membership.upsert({
      where: { userId_role: { userId, role: "OFFICER" } },
      create: { userId, role: "OFFICER", orgId },
      update: {},
    });
  }
  await recordAudit({
    orgId,
    actorUserId: ctx.userId,
    action: isOfficer ? "officer.grant" : "officer.revoke",
    entityType: "Club",
    entityId: clubId,
    diff: { userId },
  });
  revalidatePath("/admin/clubs");
  revalidatePath(`/clubs/${club.slug}`);
}
