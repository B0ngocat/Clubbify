"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/client";
import { orgSettingsSchema } from "@/lib/validation/admin";
import { recordAudit } from "@/lib/audit/log";

export async function updateOrgSettings(formData: FormData) {
  const ctx = await requireAdmin();
  const data = orgSettingsSchema.parse({
    name: formData.get("name"),
    timezone: formData.get("timezone"),
    emailDomainAllowlist: formData.get("emailDomainAllowlist") ?? "",
  });

  const before = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
  });

  await prisma.organization.update({
    where: { id: ctx.orgId },
    data: {
      name: data.name,
      timezone: data.timezone,
      emailDomainAllowlist: data.emailDomainAllowlist,
    },
  });

  await recordAudit({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    action: "org.settings.update",
    entityType: "Organization",
    entityId: ctx.orgId,
    diff: {
      nameBefore: before?.name,
      nameAfter: data.name,
      timezoneBefore: before?.timezone,
      timezoneAfter: data.timezone,
      allowlistBefore: before?.emailDomainAllowlist,
      allowlistAfter: data.emailDomainAllowlist,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
}
