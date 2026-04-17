import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { advisorStudentIds } from "@/lib/advisor/assignments";
import { BandBadge, TrendCell } from "@/components/engagement/BandBadge";
import { formatDate } from "@/lib/utils";
import type { EngagementBand } from "@prisma/client";

type Sort = "score-asc" | "score-desc" | "trend-asc" | "trend-desc" | "name";

export default async function AdvisorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ band?: string; sort?: string; q?: string }>;
}) {
  const ctx = await requireSession();
  authorize("advisor.student.view", { orgId: ctx.orgId }, ctx);

  const sp = await searchParams;
  const band = (sp.band as EngagementBand | "ALL" | undefined) ?? "ALL";
  const sort = (sp.sort as Sort | undefined) ?? "score-asc";
  const q = sp.q?.trim();

  const studentIds = await advisorStudentIds(ctx.userId);
  const { prisma, orgWhere } = scopedDb(ctx);

  const students = await prisma.user.findMany({
    where: {
      ...orgWhere,
      id: { in: studentIds },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      gradYear: true,
      engagementScore: {
        select: { score: true, band: true, trend7d: true, computedAt: true },
      },
      _count: { select: { clubMemberships: true } },
    },
  });

  const filtered = students.filter((s) => {
    if (band === "ALL") return true;
    return (s.engagementScore?.band ?? "HEALTHY") === band;
  });

  filtered.sort((a, b) => {
    const aScore = a.engagementScore?.score ?? 0;
    const bScore = b.engagementScore?.score ?? 0;
    const aTrend = a.engagementScore?.trend7d ?? 0;
    const bTrend = b.engagementScore?.trend7d ?? 0;
    switch (sort) {
      case "score-desc":
        return bScore - aScore;
      case "trend-asc":
        return aTrend - bTrend;
      case "trend-desc":
        return bTrend - aTrend;
      case "name":
        return (a.name ?? a.email).localeCompare(b.name ?? b.email);
      case "score-asc":
      default:
        return aScore - bScore;
    }
  });

  const counts = {
    HEALTHY: students.filter((s) => s.engagementScore?.band === "HEALTHY").length,
    WATCH: students.filter((s) => s.engagementScore?.band === "WATCH").length,
    AT_RISK: students.filter((s) => s.engagementScore?.band === "AT_RISK").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advisor dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {students.length} students assigned to you.
          </p>
        </div>
        <Link href="/advisor/at-risk" className="btn-primary">
          At-risk list
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <FilterCard label="Healthy" count={counts.HEALTHY} tone="green" />
        <FilterCard label="Watch" count={counts.WATCH} tone="amber" />
        <FilterCard label="At risk" count={counts.AT_RISK} tone="red" />
      </div>

      <form action="/advisor" className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name or email..." className="input" />
        </div>
        <div>
          <label htmlFor="band" className="label">Band</label>
          <select id="band" name="band" defaultValue={band} className="input">
            <option value="ALL">All</option>
            <option value="AT_RISK">At risk</option>
            <option value="WATCH">Watch</option>
            <option value="HEALTHY">Healthy</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort" className="label">Sort</label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            <option value="score-asc">Lowest score first</option>
            <option value="score-desc">Highest score first</option>
            <option value="trend-asc">Worst trend first</option>
            <option value="trend-desc">Best trend first</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">Apply</button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Band</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">7d trend</th>
              <th className="px-4 py-2">Clubs</th>
              <th className="px-4 py-2">Last computed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((s) => {
              const score = s.engagementScore;
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/advisor/students/${s.id}`} className="font-medium text-brand-700 hover:underline">
                      {s.name ?? s.email}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {s.email}
                      {s.gradYear ? ` · '${String(s.gradYear).slice(-2)}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {score ? <BandBadge band={score.band} /> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {score ? score.score.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {score ? <TrendCell trend={score.trend7d} /> : "—"}
                  </td>
                  <td className="px-4 py-3">{s._count.clubMemberships}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {score ? formatDate(score.computedAt) : "never"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No students match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "green" | "amber" | "red";
}) {
  const classes =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-900";
  return (
    <div className={`rounded-lg border ${classes} p-4`}>
      <div className="text-xs uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-3xl font-bold">{count}</div>
    </div>
  );
}
