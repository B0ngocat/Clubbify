import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";

export default async function OfficerClubPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const ctx = await requireSession();
  authorize("club.update", { orgId: ctx.orgId, clubId }, ctx);

  const { prisma, orgWhere } = scopedDb(ctx);
  const club = await prisma.club.findFirst({
    where: { ...orgWhere, id: clubId },
    include: {
      _count: { select: { memberships: true, events: true } },
      events: {
        orderBy: { startsAt: "desc" },
        take: 10,
      },
    },
  });

  if (!club) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{club.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {club._count.memberships} members · {club._count.events} events
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Events</h2>
        <Link href={`/officer/${club.id}/events/new`} className="btn-primary">
          New event
        </Link>
      </div>

      <ul className="space-y-3">
        {club.events.map((e) => (
          <li key={e.id}>
            <Link
              href={`/officer/${club.id}/events/${e.id}`}
              className="card block p-4 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {formatDateTime(e.startsAt)}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {e.startsAt > new Date() ? "Upcoming" : "Past"}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {club.events.length === 0 ? (
          <li className="text-slate-500">No events yet. Create your first.</li>
        ) : null}
      </ul>
    </div>
  );
}
