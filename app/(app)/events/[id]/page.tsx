import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { can } from "@/lib/auth/authorize";
import { formatDateTime } from "@/lib/utils";
import { rsvpToEvent, cancelRsvp } from "../actions";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireSession();
  const { prisma, orgWhere, orgId } = scopedDb(ctx);

  const event = await prisma.event.findFirst({
    where: { ...orgWhere, id },
    include: {
      club: { select: { id: true, slug: true, name: true } },
      rsvps: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { rsvps: true, attendances: true } },
    },
  });

  if (!event) notFound();

  const myRsvp = event.rsvps.find((r) => r.userId === ctx.userId);
  const isOfficerHere = can(
    "event.update",
    { orgId, clubId: event.clubId },
    ctx,
  );

  const going = event.rsvps.filter((r) => r.status === "GOING");
  const maybe = event.rsvps.filter((r) => r.status === "MAYBE");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          <Link href={`/clubs/${event.club.slug}`} className="hover:underline">
            {event.club.name}
          </Link>
        </div>
        <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
        <div className="mt-1 text-sm text-slate-600">
          {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}
          {event.location ? ` · ${event.location}` : ""}
        </div>
        {event.capacity ? (
          <div className="mt-1 text-xs text-slate-500">
            Capacity {event.capacity} · {going.length} going
          </div>
        ) : null}
      </div>

      <div className="card p-5">
        <p className="whitespace-pre-wrap text-slate-700">{event.description}</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="font-medium">Your RSVP</div>
          {myRsvp ? (
            <span className="badge bg-brand-50 text-brand-700">{myRsvp.status}</span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={rsvpToEvent}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="status" value="GOING" />
            <button className="btn-primary" type="submit">I'm going</button>
          </form>
          <form action={rsvpToEvent}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="status" value="MAYBE" />
            <button className="btn-secondary" type="submit">Maybe</button>
          </form>
          {myRsvp ? (
            <form action={cancelRsvp}>
              <input type="hidden" name="eventId" value={event.id} />
              <button className="btn-secondary" type="submit">Cancel RSVP</button>
            </form>
          ) : null}
        </div>
      </div>

      {isOfficerHere ? (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            You're an officer of this club.
          </div>
          <Link
            href={`/officer/${event.clubId}/events/${event.id}`}
            className="btn-secondary"
          >
            Manage event
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="card p-5">
          <div className="font-medium">Going ({going.length})</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {going.map((r) => (
              <li key={r.id}>{r.user.name ?? r.user.email}</li>
            ))}
            {going.length === 0 ? (
              <li className="text-slate-500">Nobody yet — be the first.</li>
            ) : null}
          </ul>
        </div>
        <div className="card p-5">
          <div className="font-medium">Maybe ({maybe.length})</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {maybe.map((r) => (
              <li key={r.id}>{r.user.name ?? r.user.email}</li>
            ))}
            {maybe.length === 0 ? (
              <li className="text-slate-500">—</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
