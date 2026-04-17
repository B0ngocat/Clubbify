import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";
import { recomputeEngagementForUser } from "@/lib/engagement/recompute";
import { totalsForUser, deriveThresholdProgress } from "@/lib/points/totals";
import { EngagementGauge } from "@/components/engagement/EngagementGauge";

export default async function MePage() {
  const ctx = await requireSession();
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  // Make sure the student has at least one score row so the gauge renders
  // something meaningful on first visit.
  const existingScore = await prisma.studentEngagementScore.findUnique({
    where: { userId: ctx.userId },
  });
  if (!existingScore) {
    await recomputeEngagementForUser(ctx.userId);
  }
  const score = await prisma.studentEngagementScore.findUnique({
    where: { userId: ctx.userId },
  });

  const [memberships, upcomingRsvps, totals] = await Promise.all([
    prisma.clubMembership.findMany({
      where: { ...orgWhere, userId: ctx.userId },
      include: {
        club: {
          include: {
            pointRules: { select: { id: true } },
            pointThresholds: { orderBy: { points: "asc" } },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.eventRSVP.findMany({
      where: {
        ...orgWhere,
        userId: ctx.userId,
        event: { startsAt: { gte: new Date() } },
      },
      include: {
        event: { include: { club: { select: { name: true } } } },
      },
      orderBy: { event: { startsAt: "asc" } },
      take: 10,
    }),
    totalsForUser(orgId, ctx.userId),
  ]);

  const totalsByClub = new Map(totals.map((t) => [t.clubId, t.total]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My engagement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your retention signal, club memberships, and upcoming RSVPs.
        </p>
      </div>

      {score ? (
        <EngagementGauge
          score={score.score}
          band={score.band}
          trend7d={score.trend7d}
        />
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">My clubs ({memberships.length})</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => {
            const pointsEnabled = m.club.pointRules.length > 0;
            const total = totalsByClub.get(m.clubId) ?? 0;
            const progress = pointsEnabled
              ? deriveThresholdProgress(total, m.club.pointThresholds)
              : null;
            return (
              <li key={m.id}>
                <Link href={`/clubs/${m.club.slug}`} className="card block p-4 hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{m.club.name}</div>
                    {m.isOfficer ? (
                      <span className="badge bg-brand-50 text-brand-700">Officer</span>
                    ) : null}
                  </div>
                  {pointsEnabled ? (
                    <div className="mt-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Points</span>
                        <span className="font-semibold">{total}</span>
                      </div>
                      {progress?.next ? (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{progress.next.label}</span>
                            <span>{total} / {progress.next.points}</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full bg-brand-500"
                              style={{
                                width: `${Math.min(100, (total / progress.next.points) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : progress?.achieved.length ? (
                        <div className="mt-1 text-xs text-green-700">
                          All thresholds achieved.
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
          {memberships.length === 0 ? (
            <li className="text-slate-500">You haven't joined any clubs yet.</li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Upcoming RSVPs</h2>
        <ul className="mt-3 space-y-3">
          {upcomingRsvps.map((r) => (
            <li key={r.id}>
              <Link href={`/events/${r.eventId}`} className="card block p-4 hover:shadow-md">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {r.event.club.name}
                </div>
                <div className="mt-1 font-medium">{r.event.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatDateTime(r.event.startsAt)}
                </div>
              </Link>
            </li>
          ))}
          {upcomingRsvps.length === 0 ? (
            <li className="text-slate-500">
              No upcoming RSVPs. <Link href="/events" className="text-brand-700 hover:underline">Find events</Link>.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
