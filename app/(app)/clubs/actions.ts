"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { clubJoinSchema } from "@/lib/validation/club";

export async function joinClub(formData: FormData) {
  const ctx = await requireSession();
  const { clubId } = clubJoinSchema.parse({ clubId: formData.get("clubId") });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const club = await prisma.club.findFirst({ where: { ...orgWhere, id: clubId } });
  if (!club) throw new Error("Club not found");

  authorize("club.join", { orgId, clubId }, ctx);

  await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId, userId: ctx.userId } },
    create: { orgId, clubId, userId: ctx.userId },
    update: {},
  });

  revalidatePath(`/clubs/${club.slug}`);
  revalidatePath("/clubs");
}

export async function leaveClub(formData: FormData) {
  const ctx = await requireSession();
  const { clubId } = clubJoinSchema.parse({ clubId: formData.get("clubId") });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const club = await prisma.club.findFirst({ where: { ...orgWhere, id: clubId } });
  if (!club) throw new Error("Club not found");

  authorize("club.leave", { orgId, clubId }, ctx);

  await prisma.clubMembership.deleteMany({
    where: { ...orgWhere, clubId, userId: ctx.userId, isOfficer: false },
  });

  revalidatePath(`/clubs/${club.slug}`);
  revalidatePath("/clubs");
}
