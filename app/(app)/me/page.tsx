import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";

export default async function MePage() {
  const ctx = await requireSession();
  const { prisma, orgWhere } = scopedDb(ctx);

  const memberships = await prisma.clubMembership.findMany({
    where: { ...orgWhere, userId: ctx.userId },
    include: { club: true },
    orderBy: { joinedAt: "desc" },
  });

  const upcomingRsvps = await prisma.eventRSVP.findMany({
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
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My engagement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your clubs and upcoming events at a glance. Engagement scoring arrives in M2.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">My clubs ({memberships.length})</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {memberships.map((m) => (
            <li key={m.id}>
              <Link href={`/clubs/${m.club.slug}`} className="card block p-4 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.club.name}</div>
                  {m.isOfficer ? (
                    <span className="badge bg-brand-50 text-brand-700">Officer</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
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
