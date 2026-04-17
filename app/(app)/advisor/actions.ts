"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { interventionInputSchema } from "@/lib/validation/intervention";
import { assertAdvisesStudent } from "@/lib/advisor/assignments";

export async function createIntervention(formData: FormData) {
  const ctx = await requireSession();
  authorize("intervention.create", { orgId: ctx.orgId }, ctx);

  const data = interventionInputSchema.parse({
    studentUserId: formData.get("studentUserId"),
    type: formData.get("type"),
    note: formData.get("note"),
    occurredAt: formData.get("occurredAt") || undefined,
  });

  await assertAdvisesStudent(ctx.userId, data.studentUserId);

  const { prisma, orgId } = scopedDb(ctx);
  await prisma.intervention.create({
    data: {
      orgId,
      advisorUserId: ctx.userId,
      studentUserId: data.studentUserId,
      type: data.type,
      note: data.note,
      occurredAt: data.occurredAt ?? new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      actorUserId: ctx.userId,
      action: "intervention.create",
      entityType: "Intervention",
      entityId: data.studentUserId,
      diff: {
        type: data.type,
        note: data.note.slice(0, 200),
      },
    },
  });

  revalidatePath(`/advisor/students/${data.studentUserId}`);
  revalidatePath(`/advisor`);
}
