import { prisma } from "@/lib/db/client";

export type AuditEntry = {
  orgId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  diff?: Record<string, unknown>;
};

export async function recordAudit(entry: AuditEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      orgId: entry.orgId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      diff: entry.diff ?? {},
    },
  });
}
