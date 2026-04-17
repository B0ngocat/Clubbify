import { prisma } from "@/lib/db/client";
import type { SessionContext } from "@/lib/auth/session";

/**
 * Returns `{ prisma, orgId, orgWhere }` for a tenant-scoped request.
 *
 * - `orgId` — the session's organization id
 * - `orgWhere` — `{ orgId }` convenience fragment to spread into `where` clauses
 * - `prisma` — the raw client; always spread `orgWhere` into your where/create
 *   so data can't leak across orgs.
 *
 * Using the raw client here (instead of a hand-rolled wrapper) preserves
 * Prisma's full generic type inference for `include`, `select`, and payload
 * narrowing. A future ESLint rule will ban direct `prisma` imports outside
 * `lib/db/` to keep org-scoping enforced at call sites.
 */
export function scopedDb(ctx: Pick<SessionContext, "orgId">) {
  const { orgId } = ctx;
  return {
    prisma,
    orgId,
    orgWhere: { orgId } as const,
  };
}

export type ScopedDb = ReturnType<typeof scopedDb>;
