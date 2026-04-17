import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";
import {
  totalForUserInClub,
  deriveThresholdProgress,
} from "@/lib/points/totals";
import { joinClub, leaveClub } from "../actions";
import { markAnnouncementRead } from "@/app/(app)/announcements/actions";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireSession();
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

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
      announcements: {
        orderBy: { publishedAt: "desc" },
        take: 10,
        include: {
          author: { select: { name: true, email: true } },
          reads: {
            where: { userId: ctx.userId },
            select: { announcementId: true },
          },
        },
      },
    },
  });

  if (!club) notFound();

  const joined = club.memberships.length > 0;
  const isOfficerHere = club.memberships.some((m) => m.isOfficer);
  const pointsEnabled = club.pointRules.length > 0;

  const myTotal = pointsEnabled
    ? await totalForUserInClub(orgId, club.id, ctx.userId)
    : 0;
  const progress = pointsEnabled
    ? deriveThresholdProgress(myTotal, club.pointThresholds)
    : null;

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

      {pointsEnabled && joined ? (
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div className="font-medium">Your points</div>
            <div className="text-2xl font-bold">{myTotal}</div>
          </div>
          {progress?.next ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{progress.next.label}</span>
                <span>
                  {progress.next.remaining} pts to go
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-brand-500"
                  style={{
                    width: `${Math.min(100, (myTotal / progress.next.points) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : progress?.achieved.length ? (
            <div className="mt-2 text-sm text-green-700">
              All thresholds achieved: {progress.achieved.map((a) => a.label).join(", ")}.
            </div>
          ) : null}
          <div className="mt-4 grid gap-1 text-sm text-slate-600">
            {club.pointRules.map((r) => (
              <div key={r.id}>
                +{r.points} pts · {formatSource(r.source)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold">Announcements</h2>
        {club.announcements.length === 0 ? (
          <div className="mt-2 text-sm text-slate-500">No announcements yet.</div>
        ) : (
          <ul className="mt-3 space-y-3">
            {club.announcements.map((a) => {
              const alreadyRead = a.reads.length > 0;
              return (
                <li key={a.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(a.publishedAt)} · {a.author.name ?? a.author.email}
                      </div>
                    </div>
                    {alreadyRead ? (
                      <span className="badge bg-slate-100 text-slate-600">Read</span>
                    ) : (
                      <form action={markAnnouncementRead}>
                        <input type="hidden" name="announcementId" value={a.id} />
                        <button type="submit" className="btn-secondary text-sm">
                          Mark read
                        </button>
                      </form>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {a.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
      return "Reading an announcement";
    case "CUSTOM":
      return "Custom activity";
    case "MANUAL":
      return "Manual award";
    default:
      return source;
  }
}
