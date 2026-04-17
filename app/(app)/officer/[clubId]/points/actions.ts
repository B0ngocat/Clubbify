"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import {
  pointRuleSchema,
  pointRuleIdSchema,
  thresholdInputSchema,
  thresholdIdSchema,
  manualAwardSchema,
} from "@/lib/validation/points";
import { awardManualPoints } from "@/lib/points/award";

export async function createPointRule(formData: FormData) {
  const ctx = await requireSession();
  const data = pointRuleSchema.parse({
    clubId: formData.get("clubId"),
    source: formData.get("source"),
    points: formData.get("points"),
    notes: formData.get("notes") || undefined,
  });
  authorize("points.rule.manage", { orgId: ctx.orgId, clubId: data.clubId }, ctx);

  const { prisma, orgId } = scopedDb(ctx);
  // One rule per source per club; replace if exists to keep UX predictable.
  const existing = await prisma.clubPointRule.findFirst({
    where: { orgId, clubId: data.clubId, source: data.source },
  });
  if (existing) {
    await prisma.clubPointRule.update({
      where: { id: existing.id },
      data: { points: data.points, notes: data.notes },
    });
  } else {
    await prisma.clubPointRule.create({
      data: {
        orgId,
        clubId: data.clubId,
        source: data.source,
        points: data.points,
        notes: data.notes,
      },
    });
  }

  revalidatePath(`/officer/${data.clubId}/points`);
  revalidatePath(`/clubs`);
}

export async function deletePointRule(formData: FormData) {
  const ctx = await requireSession();
  const { ruleId } = pointRuleIdSchema.parse({ ruleId: formData.get("ruleId") });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const existing = await prisma.clubPointRule.findFirst({
    where: { ...orgWhere, id: ruleId },
  });
  if (!existing) return;
  authorize("points.rule.manage", { orgId, clubId: existing.clubId }, ctx);

  await prisma.clubPointRule.delete({ where: { id: ruleId } });
  revalidatePath(`/officer/${existing.clubId}/points`);
}

export async function createThreshold(formData: FormData) {
  const ctx = await requireSession();
  const data = thresholdInputSchema.parse({
    clubId: formData.get("clubId"),
    label: formData.get("label"),
    points: formData.get("points"),
  });
  authorize("points.rule.manage", { orgId: ctx.orgId, clubId: data.clubId }, ctx);

  const { prisma, orgId } = scopedDb(ctx);
  const existingCount = await prisma.clubPointThreshold.count({
    where: { orgId, clubId: data.clubId },
  });

  await prisma.clubPointThreshold.create({
    data: {
      orgId,
      clubId: data.clubId,
      label: data.label,
      points: data.points,
      order: existingCount,
    },
  });

  revalidatePath(`/officer/${data.clubId}/points`);
}

export async function deleteThreshold(formData: FormData) {
  const ctx = await requireSession();
  const { thresholdId } = thresholdIdSchema.parse({
    thresholdId: formData.get("thresholdId"),
  });
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const existing = await prisma.clubPointThreshold.findFirst({
    where: { ...orgWhere, id: thresholdId },
  });
  if (!existing) return;
  authorize("points.rule.manage", { orgId, clubId: existing.clubId }, ctx);

  await prisma.clubPointThreshold.delete({ where: { id: thresholdId } });
  revalidatePath(`/officer/${existing.clubId}/points`);
}

export async function manualAward(formData: FormData) {
  const ctx = await requireSession();
  const data = manualAwardSchema.parse({
    clubId: formData.get("clubId"),
    userId: formData.get("userId"),
    points: formData.get("points"),
    reason: formData.get("reason"),
  });
  authorize("points.award.manual", { orgId: ctx.orgId, clubId: data.clubId }, ctx);

  await awardManualPoints({
    orgId: ctx.orgId,
    clubId: data.clubId,
    userId: data.userId,
    points: data.points,
    reason: data.reason,
    awardedByUserId: ctx.userId,
  });

  revalidatePath(`/officer/${data.clubId}/points`);
}
