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
      _count: { select: { memberships: true, events: true, announcements: true } },
      events: {
        orderBy: { startsAt: "desc" },
        take: 10,
        include: {
          _count: { select: { rsvps: true, attendances: true } },
        },
      },
      pointRules: { select: { id: true } },
    },
  });
  if (!club) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{club.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {club._count.memberships} members · {club._count.events} events · {club._count.announcements} announcements
          {club.pointRules.length > 0 ? " · points on" : " · points off"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href={`/officer/${clubId}/announcements`} className="card p-4 hover:shadow-md">
          <div className="font-medium">Announcements</div>
          <div className="mt-1 text-sm text-slate-600">Publish updates to members.</div>
        </Link>
        <Link href={`/officer/${clubId}/points`} className="card p-4 hover:shadow-md">
          <div className="font-medium">Points</div>
          <div className="mt-1 text-sm text-slate-600">Rules, thresholds, manual awards.</div>
        </Link>
        <Link href={`/clubs/${club.slug}`} className="card p-4 hover:shadow-md">
          <div className="font-medium">Public page</div>
          <div className="mt-1 text-sm text-slate-600">How students see this club.</div>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Events</h2>
        <Link href={`/officer/${clubId}/events/new`} className="btn-primary">
          New event
        </Link>
      </div>

      <ul className="space-y-3">
        {club.events.map((e) => (
          <li key={e.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{e.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {formatDateTime(e.startsAt)}
                  {e.location ? ` · ${e.location}` : ""}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {e._count.rsvps} RSVPs · {e._count.attendances} checked in
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/officer/${clubId}/events/${e.id}/attendance`}
                  className="btn-secondary"
                >
                  Attendance
                </Link>
                <Link
                  href={`/officer/${clubId}/events/${e.id}`}
                  className="btn-secondary"
                >
                  Edit
                </Link>
              </div>
            </div>
          </li>
        ))}
        {club.events.length === 0 ? (
          <li className="text-slate-500">No events yet. Create your first.</li>
        ) : null}
      </ul>
    </div>
  );
}
