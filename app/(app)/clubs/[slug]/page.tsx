import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";
import { joinClub, leaveClub } from "../actions";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireSession();
  const { prisma, orgWhere } = scopedDb(ctx);

  const club = await prisma.club.findFirst({
    where: { ...orgWhere, slug },
    include: {
      _count: { select: { memberships: true } },
      memberships: {
        where: { userId: ctx.userId },
        select: { id: true, isOfficer: true },
      },
      events: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 10,
      },
      pointRules: true,
      pointThresholds: { orderBy: { points: "asc" } },
    },
  });

  if (!club) notFound();

  const joined = club.memberships.length > 0;
  const isOfficerHere = club.memberships.some((m) => m.isOfficer);
  const pointsEnabled = club.pointRules.length > 0;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {club.category ?? "Club"}
            </div>
            <h1 className="mt-1 text-2xl font-bold">{club.name}</h1>
            <p className="mt-2 text-slate-600">{club.description}</p>
            <div className="mt-3 text-sm text-slate-500">
              {club._count.memberships} members
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {isOfficerHere ? (
              <Link href={`/officer/${club.id}`} className="btn-secondary">
                Manage
              </Link>
            ) : null}
            {joined ? (
              <form action={leaveClub}>
                <input type="hidden" name="clubId" value={club.id} />
                <button
                  type="submit"
                  className="btn-secondary"
                  disabled={isOfficerHere}
                  title={isOfficerHere ? "Officers cannot leave via this button." : undefined}
                >
                  Leave
                </button>
              </form>
            ) : (
              <form action={joinClub}>
                <input type="hidden" name="clubId" value={club.id} />
                <button type="submit" className="btn-primary">Join</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Upcoming events</h2>
        {club.events.length === 0 ? (
          <div className="mt-2 text-sm text-slate-500">No upcoming events yet.</div>
        ) : (
          <ul className="mt-3 space-y-3">
            {club.events.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="card p-4 block hover:shadow-md">
                  <div className="font-medium">{e.title}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {formatDateTime(e.startsAt)}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pointsEnabled ? (
        <section>
          <h2 className="text-lg font-semibold">Points</h2>
          <p className="mt-1 text-sm text-slate-600">
            This club tracks participation with a points system.
          </p>
          <div className="mt-3 card p-4">
            <div className="text-sm font-medium">How points are earned</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {club.pointRules.map((r) => (
                <li key={r.id}>
                  {r.points} pts · {formatSource(r.source)}
                </li>
              ))}
            </ul>
            {club.pointThresholds.length > 0 ? (
              <>
                <div className="mt-4 text-sm font-medium">Thresholds</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {club.pointThresholds.map((t) => (
                    <li key={t.id}>{t.label} — {t.points} pts</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatSource(source: string): string {
  switch (source) {
    case "EVENT_ATTENDANCE":
      return "Attending an event";
    case "EVENT_RSVP":
      return "RSVPing to an event";
    case "OFFICER_ROLE":
      return "Being an officer";
    case "ANNOUNCEMENT_READ":
      return "Reading announcements";
    case "CUSTOM":
      return "Custom activity";
    case "MANUAL":
      return "Manual award";
    default:
      return source;
  }
}
