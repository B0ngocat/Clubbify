"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import { bulkAdvisorSchema } from "@/lib/validation/admin";
import { recordAudit } from "@/lib/audit/log";

type ImportResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export async function importAssignments(formData: FormData): Promise<ImportResult> {
  const ctx = await requireAdmin();
  const { csv } = bulkAdvisorSchema.parse({ csv: formData.get("csv") });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const result: ImportResult = { created: 0, skipped: 0, errors: [] };
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  for (const line of lines) {
    const [advisorEmail, studentEmail] = line.split(",").map((s) => s.trim());
    if (!advisorEmail || !studentEmail) {
      result.errors.push(`Bad line: "${line}"`);
      continue;
    }
    const [advisor, student] = await Promise.all([
      prisma.user.findFirst({
        where: { ...orgWhere, email: advisorEmail.toLowerCase() },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { ...orgWhere, email: studentEmail.toLowerCase() },
        select: { id: true },
      }),
    ]);
    if (!advisor) {
      result.errors.push(`Advisor not found: ${advisorEmail}`);
      continue;
    }
    if (!student) {
      result.errors.push(`Student not found: ${studentEmail}`);
      continue;
    }
    const existing = await prisma.advisorAssignment.findUnique({
      where: {
        advisorUserId_studentUserId: {
          advisorUserId: advisor.id,
          studentUserId: student.id,
        },
      },
    });
    if (existing) {
      result.skipped += 1;
      continue;
    }
    await prisma.advisorAssignment.create({
      data: {
        orgId,
        advisorUserId: advisor.id,
        studentUserId: student.id,
      },
    });
    result.created += 1;
  }

  await recordAudit({
    orgId,
    actorUserId: ctx.userId,
    action: "advisor.assign.bulk",
    entityType: "AdvisorAssignment",
    entityId: "bulk",
    diff: { created: result.created, skipped: result.skipped, errors: result.errors.length },
  });

  revalidatePath("/admin/advisors");
  return result;
}

export async function removeAssignment(formData: FormData) {
  const ctx = await requireAdmin();
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const { prisma, orgWhere } = scopedDb(ctx);
  const row = await prisma.advisorAssignment.findFirst({
    where: { ...orgWhere, id: assignmentId },
  });
  if (!row) return;
  await prisma.advisorAssignment.delete({ where: { id: row.id } });
  await recordAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "advisor.unassign",
    entityType: "AdvisorAssignment",
    entityId: assignmentId,
    diff: { advisorUserId: row.advisorUserId, studentUserId: row.studentUserId },
  });
  revalidatePath("/admin/advisors");
}
