import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import { BandBadge } from "@/components/engagement/BandBadge";

export default async function AdminReportsPage() {
  const ctx = await requireAdmin();
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const [scores, counts, interventions, pastEventsCount, upcomingEventsCount] =
    await Promise.all([
      prisma.studentEngagementScore.findMany({
        where: orgWhere,
        select: {
          score: true,
          band: true,
          trend7d: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { score: "asc" },
      }),
      prisma.studentEngagementScore.groupBy({
        by: ["band"],
        where: orgWhere,
        _count: true,
      }),
      prisma.intervention.count({ where: orgWhere }),
      prisma.event.count({
        where: { ...orgWhere, startsAt: { lt: new Date() } },
      }),
      prisma.event.count({
        where: { ...orgWhere, startsAt: { gte: new Date() } },
      }),
    ]);

  void orgId;
  const total = scores.length || 1;
  const bandCount = (b: string) =>
    counts.find((c) => c.band === b)?._count ?? 0;

  const bands = [
    { key: "HEALTHY", color: "bg-green-500", label: "Healthy" },
    { key: "WATCH", color: "bg-amber-500", label: "Watch" },
    { key: "AT_RISK", color: "bg-red-500", label: "At risk" },
  ] as const;

  // Histogram: 10 buckets of 10 points each
  const buckets = Array.from({ length: 10 }, () => 0);
  for (const s of scores) {
    const idx = Math.min(9, Math.floor(s.score / 10));
    buckets[idx] += 1;
  }
  const maxBucket = Math.max(1, ...buckets);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Org-wide engagement distribution.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Scored students" n={scores.length} />
        <Stat label="Interventions logged" n={interventions} />
        <Stat label="Past events" n={pastEventsCount} />
        <Stat label="Upcoming events" n={upcomingEventsCount} />
      </div>

      <section className="card p-5">
        <div className="font-medium">Band distribution</div>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-100">
          {bands.map((b) => {
            const c = bandCount(b.key);
            const pct = (c / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={b.key}
                className={b.color}
                style={{ width: `${pct}%` }}
                title={`${b.label}: ${c}`}
              />
            );
          })}
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
          {bands.map((b) => {
            const c = bandCount(b.key);
            return (
              <li key={b.key} className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-full ${b.color}`} />
                <span className="font-medium">{b.label}</span>
                <span className="text-slate-500">
                  {c} ({((c / total) * 100).toFixed(0)}%)
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <div className="font-medium">Score histogram (0–100)</div>
        <div className="mt-4 flex items-end gap-1 h-32">
          {buckets.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${(n / maxBucket) * 100}%` }}
                title={`${i * 10}-${i * 10 + 10}: ${n}`}
              />
              <div className="text-xs text-slate-500">{i * 10}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Lowest scoring</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {scores.slice(0, 10).map((s, i) => (
            <li key={i} className="card p-3 flex items-center justify-between">
              <div>{s.user.name ?? s.user.email}</div>
              <div className="flex items-center gap-3">
                <span className="font-mono">{s.score.toFixed(1)}</span>
                <BandBadge band={s.band} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, n }: { label: string; n: number }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{n}</div>
    </div>
  );
}
