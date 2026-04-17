import { createIntervention } from "@/app/(app)/advisor/actions";

export function InterventionForm({ studentUserId }: { studentUserId: string }) {
  return (
    <form action={createIntervention} className="card p-5 space-y-3">
      <input type="hidden" name="studentUserId" value={studentUserId} />
      <div>
        <label htmlFor="type" className="label">Type</label>
        <select id="type" name="type" defaultValue="CHECK_IN" className="input">
          <option value="CHECK_IN">Check-in</option>
          <option value="EMAIL">Email</option>
          <option value="MEETING">Meeting</option>
          <option value="REFERRAL">Referral</option>
        </select>
      </div>
      <div>
        <label htmlFor="note" className="label">Note</label>
        <textarea
          id="note"
          name="note"
          rows={3}
          required
          minLength={1}
          maxLength={4000}
          placeholder="What happened? Outcome? Follow-up?"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="occurredAt" className="label">Occurred at</label>
        <input
          id="occurredAt"
          name="occurredAt"
          type="datetime-local"
          className="input"
        />
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary">Log intervention</button>
      </div>
    </form>
  );
}
