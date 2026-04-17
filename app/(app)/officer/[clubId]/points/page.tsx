import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { totalsForUser } from "@/lib/points/totals";
import {
  createPointRule,
  deletePointRule,
  createThreshold,
  deleteThreshold,
  manualAward,
} from "./actions";

const SOURCE_LABELS: Record<string, string> = {
  EVENT_ATTENDANCE: "Event attendance",
  EVENT_RSVP: "Event RSVP",
  OFFICER_ROLE: "Being an officer",
  ANNOUNCEMENT_READ: "Reading announcements",
  CUSTOM: "Custom",
};

export default async function PointsConfigPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const ctx = await requireSession();
  authorize("points.rule.manage", { orgId: ctx.orgId, clubId }, ctx);

  const { prisma, orgWhere, orgId } = scopedDb(ctx);
  const club = await prisma.club.findFirst({
    where: { ...orgWhere, id: clubId },
    include: {
      pointRules: { orderBy: { source: "asc" } },
      pointThresholds: { orderBy: { points: "asc" } },
      memberships: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  if (!club) notFound();

  const pointsEnabled = club.pointRules.length > 0;

  // Build a total-per-member lookup
  const awards = await prisma.clubPointAward.groupBy({
    by: ["userId"],
    where: { orgId, clubId },
    _sum: { points: true },
  });
  const totalsByUser = new Map<string, number>(
    awards.map((a) => [a.userId, a._sum.points ?? 0]),
  );

  const configuredSources = new Set(club.pointRules.map((r) => r.source));
  const availableSources = Object.keys(SOURCE_LABELS).filter(
    (s) => !configuredSources.has(s as never),
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Points</h1>
          <p className="mt-1 text-sm text-slate-600">
            {club.name} ·{" "}
            {pointsEnabled ? "points system is active" : "no rules — points disabled"}
          </p>
        </div>
        <Link href={`/officer/${clubId}`} className="btn-secondary">
          Back
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Rules</h2>
        <p className="mt-1 text-sm text-slate-600">
          Remove all rules to disable the points system for this club.
        </p>
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {club.pointRules.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium">
                  {r.points} pts · {SOURCE_LABELS[r.source] ?? r.source}
                </div>
                {r.notes ? (
                  <div className="mt-0.5 text-xs text-slate-500">{r.notes}</div>
                ) : null}
              </div>
              <form action={deletePointRule}>
                <input type="hidden" name="ruleId" value={r.id} />
                <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                  Delete
                </button>
              </form>
            </li>
          ))}
          {club.pointRules.length === 0 ? (
            <li className="px-4 py-3 text-slate-500">No rules configured.</li>
          ) : null}
        </ul>

        {availableSources.length > 0 ? (
          <form action={createPointRule} className="mt-4 card p-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="clubId" value={clubId} />
            <div>
              <label htmlFor="source" className="label">When</label>
              <select id="source" name="source" className="input">
                {availableSources.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="points" className="label">Award</label>
              <input type="number" id="points" name="points" min={0} max={1000}
                defaultValue={10} className="input w-24" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="notes" className="label">Notes (optional)</label>
              <input id="notes" name="notes" maxLength={500} className="input" />
            </div>
            <button type="submit" className="btn-primary">Add rule</button>
          </form>
        ) : null}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Thresholds</h2>
        <p className="mt-1 text-sm text-slate-600">
          Optional milestones shown to students (e.g. &quot;Active Member at 50 pts&quot;).
        </p>
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {club.pointThresholds.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3">
              <div className="font-medium">{t.label} · {t.points} pts</div>
              <form action={deleteThreshold}>
                <input type="hidden" name="thresholdId" value={t.id} />
                <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                  Delete
                </button>
              </form>
            </li>
          ))}
          {club.pointThresholds.length === 0 ? (
            <li className="px-4 py-3 text-slate-500">No thresholds configured.</li>
          ) : null}
        </ul>

        <form action={createThreshold} className="mt-4 card p-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="clubId" value={clubId} />
          <div className="flex-1 min-w-[160px]">
            <label htmlFor="label" className="label">Label</label>
            <input id="label" name="label" required maxLength={80} className="input" />
          </div>
          <div>
            <label htmlFor="t-points" className="label">Points</label>
            <input type="number" id="t-points" name="points" min={1} required defaultValue={50} className="input w-28" />
          </div>
          <button type="submit" className="btn-primary">Add threshold</button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Members & manual awards</h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {club.memberships.map((m) => {
            const total = totalsByUser.get(m.userId) ?? 0;
            return (
              <li key={m.userId} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {m.user.name ?? m.user.email}
                      {m.isOfficer ? (
                        <span className="badge bg-brand-50 text-brand-700 ml-2">Officer</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-slate-500">{total} pts</div>
                  </div>
                </div>
                <form action={manualAward} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="clubId" value={clubId} />
                  <input type="hidden" name="userId" value={m.userId} />
                  <div>
                    <label className="label">Points</label>
                    <input type="number" name="points" min={-1000} max={1000}
                      defaultValue={5} className="input w-24" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="label">Reason</label>
                    <input name="reason" required maxLength={500}
                      placeholder="e.g. Ran the booth at the open house" className="input" />
                  </div>
                  <button type="submit" className="btn-secondary">Award</button>
                </form>
              </li>
            );
          })}
          {club.memberships.length === 0 ? (
            <li className="px-4 py-3 text-slate-500">No members yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
