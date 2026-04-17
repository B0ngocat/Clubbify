import type { Event } from "@prisma/client";

function toInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function EventForm({
  clubId,
  event,
  action,
  submitLabel = "Save",
}: {
  clubId: string;
  event?: Event;
  action: (fd: FormData) => Promise<void>;
  submitLabel?: string;
}) {
  return (
    <form action={action} className="space-y-4 card p-5">
      <input type="hidden" name="clubId" value={clubId} />
      {event ? <input type="hidden" name="eventId" value={event.id} /> : null}

      <div>
        <label htmlFor="title" className="label">Title</label>
        <input id="title" name="title" required minLength={2} maxLength={120}
          defaultValue={event?.title} className="input" />
      </div>
      <div>
        <label htmlFor="description" className="label">Description</label>
        <textarea id="description" name="description" rows={4}
          defaultValue={event?.description} className="input" />
      </div>
      <div>
        <label htmlFor="location" className="label">Location</label>
        <input id="location" name="location" defaultValue={event?.location ?? ""} className="input" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startsAt" className="label">Starts</label>
          <input type="datetime-local" id="startsAt" name="startsAt" required
            defaultValue={event ? toInput(event.startsAt) : ""} className="input" />
        </div>
        <div>
          <label htmlFor="endsAt" className="label">Ends</label>
          <input type="datetime-local" id="endsAt" name="endsAt" required
            defaultValue={event ? toInput(event.endsAt) : ""} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="capacity" className="label">Capacity (optional)</label>
        <input type="number" id="capacity" name="capacity" min={1}
          defaultValue={event?.capacity ?? ""} className="input" />
      </div>

      <div className="flex justify-end">
        <button type="submit" className="btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
