import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { EventForm } from "@/components/events/EventForm";
import { updateEvent, deleteEvent } from "../actions";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ clubId: string; id: string }>;
}) {
  const { clubId, id } = await params;
  const ctx = await requireSession();
  authorize("event.update", { orgId: ctx.orgId, clubId }, ctx);

  const { prisma, orgWhere } = scopedDb(ctx);
  const event = await prisma.event.findFirst({
    where: { ...orgWhere, id, clubId },
  });
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit event</h1>
        <Link href={`/events/${event.id}`} className="btn-secondary">
          View public page
        </Link>
      </div>

      <EventForm
        clubId={clubId}
        event={event}
        action={updateEvent}
        submitLabel="Save changes"
      />

      <form
        action={deleteEvent}
        className="card p-5 border-red-200 bg-red-50"
      >
        <input type="hidden" name="eventId" value={event.id} />
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-red-800">Delete event</div>
            <div className="text-sm text-red-700">
              This removes the event and all RSVPs. Cannot be undone.
            </div>
          </div>
          <button type="submit" className="btn-danger">Delete</button>
        </div>
      </form>
    </div>
  );
}
