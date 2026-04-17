import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";
import { getActiveCheckIn } from "@/lib/attendance/checkInCode";
import { formatDateTime } from "@/lib/utils";
import { CheckInForm } from "./CheckInForm";

export default async function CheckInPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { id } = await params;
  const { c } = await searchParams;
  const ctx = await requireSession();
  const { prisma, orgWhere } = scopedDb(ctx);

  const event = await prisma.event.findFirst({
    where: { ...orgWhere, id },
    include: { club: { select: { name: true, slug: true } } },
  });
  if (!event) notFound();

  const active = await getActiveCheckIn(id);

  const existing = await prisma.eventAttendance.findUnique({
    where: { eventId_userId: { eventId: id, userId: ctx.userId } },
  });

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {event.club.name}
        </div>
        <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
        <div className="mt-1 text-sm text-slate-600">
          {formatDateTime(event.startsAt)}
          {event.location ? ` · ${event.location}` : ""}
        </div>
      </div>

      {existing?.attended ? (
        <div className="card p-6 text-center">
          <div className="text-lg font-medium text-green-800">
            You're already checked in
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {formatDateTime(existing.checkedInAt)}
          </div>
          <Link href={`/events/${id}`} className="btn-secondary mt-4 inline-flex">
            Back to event
          </Link>
        </div>
      ) : !active ? (
        <div className="card p-6 text-center">
          <div className="font-medium">Check-in isn't open</div>
          <div className="mt-1 text-sm text-slate-600">
            Ask an officer to open check-in.
          </div>
          <Link href={`/events/${id}`} className="btn-secondary mt-4 inline-flex">
            Back to event
          </Link>
        </div>
      ) : (
        <CheckInForm eventId={id} initialCode={c} />
      )}
    </div>
  );
}
