import { prisma } from "@/lib/db/client";
import type { PointSource } from "@prisma/client";

export type AwardInput = {
  orgId: string;
  clubId: string;
  userId: string;
  source: PointSource;
  /**
   * Domain object id that produced this award (eventId, announcementId, etc.).
   * Combined with (clubId, userId, source) it forms the uniqueness key, so
   * calling `awardPoints` twice for the same event produces at most one row.
   * For `MANUAL` awards, pass a fresh uuid to allow multiple distinct awards.
   */
  sourceId: string | null;
  reason?: string;
  awardedByUserId?: string | null;
};

export type AwardResult =
  | { status: "created"; points: number }
  | { status: "noop"; reason: "no-rule" | "duplicate" | "zero" };

/**
 * Idempotently awards points for a domain event.
 *
 * Looks up the relevant `ClubPointRule` for (clubId, source). If no rule is
 * configured for this club, it's a no-op (points are opt-in per club).
 * Otherwise inserts a `ClubPointAward`; duplicates (same clubId/userId/source/
 * sourceId) are caught via the unique constraint and return a noop.
 */
export async function awardPoints(input: AwardInput): Promise<AwardResult> {
  // Short-circuit if the club has no rules for this source.
  const rule = await prisma.clubPointRule.findFirst({
    where: {
      orgId: input.orgId,
      clubId: input.clubId,
      source: input.source,
    },
    select: { points: true },
  });
  if (!rule) return { status: "noop", reason: "no-rule" };
  if (rule.points === 0) return { status: "noop", reason: "zero" };

  try {
    await prisma.clubPointAward.create({
      data: {
        orgId: input.orgId,
        clubId: input.clubId,
        userId: input.userId,
        source: input.source,
        sourceId: input.sourceId,
        points: rule.points,
        reason: input.reason,
        awardedByUserId: input.awardedByUserId ?? null,
      },
    });
    return { status: "created", points: rule.points };
  } catch (err) {
    // P2002 = unique constraint failure → already awarded
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { status: "noop", reason: "duplicate" };
    }
    throw err;
  }
}

/**
 * Awards manual (officer-granted) points. Each call creates a fresh row; no
 * idempotency key is used.
 */
export async function awardManualPoints(params: {
  orgId: string;
  clubId: string;
  userId: string;
  points: number;
  reason: string;
  awardedByUserId: string;
}): Promise<void> {
  if (params.points === 0) return;
  await prisma.clubPointAward.create({
    data: {
      orgId: params.orgId,
      clubId: params.clubId,
      userId: params.userId,
      source: "MANUAL",
      sourceId: cryptoRandomId(),
      points: params.points,
      reason: params.reason,
      awardedByUserId: params.awardedByUserId,
    },
  });
}

function cryptoRandomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
