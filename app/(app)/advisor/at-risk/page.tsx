import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { advisorStudentIds } from "@/lib/advisor/assignments";
import { BandBadge, TrendCell } from "@/components/engagement/BandBadge";

export default async function AtRiskPage() {
  const ctx = await requireSession();
  authorize("advisor.student.view", { orgId: ctx.orgId }, ctx);

  const studentIds = await advisorStudentIds(ctx.userId);
  const { prisma, orgWhere } = scopedDb(ctx);

  const atRisk = await prisma.user.findMany({
    where: {
      ...orgWhere,
      id: { in: studentIds },
      engagementScore: { band: "AT_RISK" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      gradYear: true,
      engagementScore: { select: { score: true, band: true, trend7d: true } },
      interventionsOnMe: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { occurredAt: true, type: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const mailto = atRisk.length
    ? `mailto:${encodeURIComponent(
        atRisk.map((s) => s.email).join(","),
      )}?subject=${encodeURIComponent("Checking in from your advisor")}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">At-risk students</h1>
          <p className="mt-1 text-sm text-slate-600">
            {atRisk.length} of your assigned students are currently flagged.
          </p>
        </div>
        <div className="flex gap-2">
          {mailto ? (
            <a href={mailto} className="btn-secondary">
              Email all
            </a>
          ) : null}
          <Link href="/advisor" className="btn-secondary">Back</Link>
        </div>
      </div>

      <ul className="space-y-3">
        {atRisk.map((s) => {
          const last = s.interventionsOnMe[0];
          return (
            <li key={s.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/advisor/students/${s.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {s.name ?? s.email}
                  </Link>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {s.email}
                    {s.gradYear ? ` · '${String(s.gradYear).slice(-2)}` : ""}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Last intervention:{" "}
                    {last
                      ? `${last.type.toLowerCase()} on ${last.occurredAt.toLocaleDateString()}`
                      : "none"}
                  </div>
                </div>
                <div className="text-right">
                  {s.engagementScore ? (
                    <>
                      <BandBadge band={s.engagementScore.band} />
                      <div className="mt-2 font-mono text-lg">
                        {s.engagementScore.score.toFixed(1)}
                      </div>
                      <div className="text-xs">
                        <TrendCell trend={s.engagementScore.trend7d} />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
        {atRisk.length === 0 ? (
          <li className="card p-6 text-center text-slate-500">
            No at-risk students right now. Nice.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
