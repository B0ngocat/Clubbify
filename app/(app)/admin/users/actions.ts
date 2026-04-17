"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import { setRoleSchema } from "@/lib/validation/admin";
import { recordAudit } from "@/lib/audit/log";

export async function setRole(formData: FormData) {
  const ctx = await requireAdmin();
  const { userId, role, enabled } = setRoleSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    enabled: formData.get("enabled") ?? "true",
  });

  const { prisma, orgWhere } = scopedDb(ctx);
  const target = await prisma.user.findFirst({
    where: { ...orgWhere, id: userId },
    select: { id: true },
  });
  if (!target) throw new Error("User not found");

  if (enabled) {
    await prisma.membership.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role, orgId: ctx.orgId },
      update: {},
    });
  } else {
    // Prevent removing the last ADMIN.
    if (role === "ADMIN") {
      const adminCount = await prisma.membership.count({
        where: { orgId: ctx.orgId, role: "ADMIN" },
      });
      if (adminCount <= 1 && userId === ctx.userId) {
        throw new Error("Cannot remove the last admin.");
      }
    }
    await prisma.membership
      .delete({ where: { userId_role: { userId, role } } })
      .catch(() => undefined);
  }

  await recordAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: enabled ? "role.grant" : "role.revoke",
    entityType: "User",
    entityId: userId,
    diff: { role },
  });

  revalidatePath("/admin/users");
}
