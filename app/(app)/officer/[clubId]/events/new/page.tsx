import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "../actions";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const ctx = await requireSession();
  authorize("event.create", { orgId: ctx.orgId, clubId }, ctx);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New event</h1>
      <EventForm clubId={clubId} action={createEvent} submitLabel="Create event" />
    </div>
  );
}
