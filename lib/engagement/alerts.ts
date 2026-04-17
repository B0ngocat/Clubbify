import type { EngagementBand } from "@prisma/client";
import { prisma } from "@/lib/db/client";

/**
 * Fires when a student's engagement band transitions. In M4 this will fan
 * out to Inngest functions that email assigned advisors; for now we log to
 * the audit table and stderr so the transition is observable.
 */
export async function onBandTransition(params: {
  orgId: string;
  studentUserId: string;
  from: EngagementBand | null;
  to: EngagementBand;
  score: number;
  trend7d: number;
}): Promise<void> {
  const { orgId, studentUserId, from, to } = params;
  if (from === to) return;

  // Only alert when a student crosses INTO AT_RISK. Other transitions are
  // interesting for reporting but shouldn't page anyone.
  if (to !== "AT_RISK") return;

  const advisors = await prisma.advisorAssignment.findMany({
    where: { studentUserId, orgId },
    select: { advisorUserId: true },
  });

  await prisma.auditLog.create({
    data: {
      orgId,
      actorUserId: null,
      action: "engagement.atRisk.alert",
      entityType: "User",
      entityId: studentUserId,
      diff: {
        from: from ?? null,
        to,
        score: params.score,
        trend7d: params.trend7d,
        advisors: advisors.map((a) => a.advisorUserId),
      },
    },
  });

  if (process.env.NODE_ENV !== "test") {
    console.warn(
      `[atRisk] student=${studentUserId} from=${from ?? "null"} to=${to} score=${params.score} trend=${params.trend7d} advisors=${advisors
        .map((a) => a.advisorUserId)
        .join(",")}`,
    );
  }
}
