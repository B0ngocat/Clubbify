import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";

export default async function EventsPage() {
  const ctx = await requireSession();
  const { prisma, orgWhere } = scopedDb(ctx);

  const upcoming = await prisma.event.findMany({
    where: { ...orgWhere, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 50,
    include: {
      club: { select: { id: true, name: true, slug: true } },
      rsvps: { where: { userId: ctx.userId }, select: { id: true, status: true } },
      _count: { select: { rsvps: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Upcoming events</h1>
      <p className="mt-1 text-sm text-slate-600">
        Everything happening across clubs you can see.
      </p>

      <ul className="mt-6 space-y-3">
        {upcoming.map((e) => {
          const myRsvp = e.rsvps[0];
          return (
            <li key={e.id}>
              <Link href={`/events/${e.id}`} className="card block p-4 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {e.club.name}
                    </div>
                    <div className="mt-1 font-medium">{e.title}</div>
                    <div className="mt-1 text-sm text-slate-600">
                      {formatDateTime(e.startsAt)}{e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {myRsvp ? (
                      <span className="badge bg-brand-50 text-brand-700">
                        {myRsvp.status}
                      </span>
                    ) : (
                      <span className="text-slate-500">{e._count.rsvps} going</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {upcoming.length === 0 ? (
          <li className="text-slate-500">No upcoming events yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
