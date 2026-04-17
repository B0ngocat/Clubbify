import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { getActiveCheckIn } from "@/lib/attendance/checkInCode";
import { CheckInDisplay } from "@/components/attendance/CheckInDisplay";
import { openCheckIn, closeCheckIn, markAttendance } from "./actions";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ clubId: string; id: string }>;
}) {
  const { clubId, id } = await params;
  const ctx = await requireSession();
  authorize("event.attendance.mark", { orgId: ctx.orgId, clubId }, ctx);

  const { prisma, orgWhere } = scopedDb(ctx);
  const event = await prisma.event.findFirst({
    where: { ...orgWhere, id, clubId },
    include: {
      club: { select: { name: true } },
    },
  });
  if (!event) notFound();

  const [roster, rsvps, attendances, active] = await Promise.all([
    prisma.clubMembership.findMany({
      where: { ...orgWhere, clubId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ isOfficer: "desc" }, { user: { name: "asc" } }],
    }),
    prisma.eventRSVP.findMany({
      where: { ...orgWhere, eventId: id },
      select: { userId: true, status: true },
    }),
    prisma.eventAttendance.findMany({
      where: { ...orgWhere, eventId: id },
      select: { userId: true, attended: true, checkedInAt: true },
    }),
    getActiveCheckIn(id),
  ]);

  const attendedSet = new Set(
    attendances.filter((a) => a.attended).map((a) => a.userId),
  );
  const rsvpMap = new Map(rsvps.map((r) => [r.userId, r.status]));

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const checkInUrl = `${proto}://${host}/events/${id}/checkin${
    active ? `?c=${encodeURIComponent(active.code)}` : ""
  }`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {event.club.name}
          </div>
          <h1 className="mt-1 text-2xl font-bold">Attendance · {event.title}</h1>
        </div>
        <Link href={`/officer/${clubId}/events/${id}`} className="btn-secondary">
          Back to event
        </Link>
      </div>

      {active ? (
        <>
          <CheckInDisplay
            code={active.code}
            openUntil={active.openUntil}
            checkInUrl={checkInUrl}
          />
          <form action={closeCheckIn}>
            <input type="hidden" name="eventId" value={id} />
            <button type="submit" className="btn-secondary">Close check-in</button>
          </form>
        </>
      ) : (
        <form action={openCheckIn} className="card p-5">
          <input type="hidden" name="eventId" value={id} />
          <div className="flex items-end gap-3">
            <div>
              <label htmlFor="windowMinutes" className="label">
                Open for (minutes)
              </label>
              <input
                id="windowMinutes"
                name="windowMinutes"
                type="number"
                min={5}
                max={720}
                defaultValue={120}
                className="input w-32"
              />
            </div>
            <button type="submit" className="btn-primary">Open check-in</button>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Opens a rotating code students can enter, plus a QR that links straight
            to the check-in page. You can always mark names manually below.
          </p>
        </form>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Roster</h2>
          <div className="text-sm text-slate-500">
            {attendedSet.size} / {roster.length} checked in
          </div>
        </div>
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {roster.map((m) => {
            const attended = attendedSet.has(m.userId);
            const rsvp = rsvpMap.get(m.userId);
            return (
              <li key={m.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium">
                    {m.user.name ?? m.user.email}
                    {m.isOfficer ? (
                      <span className="badge bg-brand-50 text-brand-700 ml-2">Officer</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-500">
                    {rsvp ? `RSVP: ${rsvp}` : "no RSVP"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {attended ? (
                    <span className="badge bg-green-100 text-green-800">Here</span>
                  ) : null}
                  <form action={markAttendance}>
                    <input type="hidden" name="eventId" value={id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <input
                      type="hidden"
                      name="attended"
                      value={attended ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={attended ? "btn-secondary" : "btn-primary"}
                    >
                      {attended ? "Undo" : "Mark here"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
          {roster.length === 0 ? (
            <li className="px-4 py-3 text-slate-500">No club members yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
