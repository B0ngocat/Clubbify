import type { Prisma } from "@prisma/client";

type Components = {
  attendance?: number;
  rsvp?: number;
  announcements?: number;
  clubs?: number;
  officerBonus?: number;
  recencyPenaltyApplied?: boolean;
  raw?: number;
  lastActivityDaysAgo?: number | null;
};

export function EngagementBreakdown({
  components,
}: {
  components: Prisma.JsonValue | null;
}) {
  const c = (components ?? {}) as Components;
  return (
    <div className="card p-5">
      <div className="font-medium">Why this score</div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-slate-500">Attendance signal</dt>
        <dd className="font-mono">{fmt(c.attendance)}</dd>
        <dt className="text-slate-500">RSVP signal</dt>
        <dd className="font-mono">{fmt(c.rsvp)}</dd>
        <dt className="text-slate-500">Clubs signal</dt>
        <dd className="font-mono">{fmt(c.clubs)}</dd>
        <dt className="text-slate-500">Announcements signal</dt>
        <dd className="font-mono">{fmt(c.announcements)}</dd>
        <dt className="text-slate-500">Officer bonus</dt>
        <dd className="font-mono">{fmt(c.officerBonus)}</dd>
        <dt className="text-slate-500">Raw total (pre-sigmoid)</dt>
        <dd className="font-mono">{fmt(c.raw)}</dd>
        <dt className="text-slate-500">Last activity</dt>
        <dd>
          {c.lastActivityDaysAgo === null || c.lastActivityDaysAgo === undefined
            ? "no activity"
            : `${Math.round(c.lastActivityDaysAgo)} days ago`}
        </dd>
        <dt className="text-slate-500">Recency penalty</dt>
        <dd>{c.recencyPenaltyApplied ? "applied (×0.7)" : "—"}</dd>
      </dl>
    </div>
  );
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return n.toFixed(1);
}
