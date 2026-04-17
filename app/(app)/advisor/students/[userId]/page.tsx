import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { assertAdvisesStudent } from "@/lib/advisor/assignments";
import { EngagementGauge } from "@/components/engagement/EngagementGauge";
import { EngagementBreakdown } from "@/components/advisor/EngagementBreakdown";
import { InterventionForm } from "@/components/advisor/InterventionForm";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function StudentProfile({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const ctx = await requireSession();
  authorize("advisor.student.view", { orgId: ctx.orgId }, ctx);

  try {
    await assertAdvisesStudent(ctx.userId, userId);
  } catch {
    notFound();
  }

  const { prisma, orgWhere } = scopedDb(ctx);
  const student = await prisma.user.findFirst({
    where: { ...orgWhere, id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      gradYear: true,
      engagementScore: true,
      clubMemberships: {
        include: { club: { select: { id: true, name: true, slug: true } } },
        orderBy: { joinedAt: "desc" },
      },
      rsvps: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          event: {
            select: { id: true, title: true, startsAt: true, club: { select: { name: true } } },
          },
        },
      },
      attendances: {
        orderBy: { checkedInAt: "desc" },
        take: 10,
        where: { attended: true },
        include: {
          event: {
            select: { id: true, title: true, startsAt: true, club: { select: { name: true } } },
          },
        },
      },
      interventionsOnMe: {
        orderBy: { occurredAt: "desc" },
        include: {
          advisor: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!student) notFound();

  const score = student.engagementScore;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{student.name ?? student.email}</h1>
          <div className="mt-1 text-sm text-slate-600">
            {student.email}
            {student.gradYear ? ` · class of ${student.gradYear}` : ""}
          </div>
        </div>
        <Link href="/advisor" className="btn-secondary">Back</Link>
      </div>

      {score ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <EngagementGauge
            score={score.score}
            band={score.band}
            trend7d={score.trend7d}
          />
          <EngagementBreakdown components={score.components} />
        </div>
      ) : (
        <div className="card p-5 text-sm text-slate-500">
          No engagement score yet for this student. (Runs on next activity or via nightly cron in M4.)
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">Clubs ({student.clubMemberships.length})</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {student.clubMemberships.map((m) => (
            <li key={m.id} className="card p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{m.club.name}</span>
                {m.isOfficer ? (
                  <span className="badge bg-brand-50 text-brand-700">Officer</span>
                ) : null}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                joined {formatDate(m.joinedAt)}
              </div>
            </li>
          ))}
          {student.clubMemberships.length === 0 ? (
            <li className="text-slate-500 text-sm">Not in any clubs.</li>
          ) : null}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Recent RSVPs</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {student.rsvps.map((r) => (
              <li key={r.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <Link href={`/events/${r.event.id}`} className="font-medium text-brand-700 hover:underline">
                    {r.event.title}
                  </Link>
                  <span className="text-xs text-slate-500">{r.status}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {r.event.club.name} · {formatDateTime(r.event.startsAt)}
                </div>
              </li>
            ))}
            {student.rsvps.length === 0 ? (
              <li className="text-slate-500">No RSVPs.</li>
            ) : null}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Recent attendance</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {student.attendances.map((a) => (
              <li key={a.id} className="card p-3">
                <Link href={`/events/${a.event.id}`} className="font-medium text-brand-700 hover:underline">
                  {a.event.title}
                </Link>
                <div className="mt-0.5 text-xs text-slate-500">
                  {a.event.club.name} · {formatDateTime(a.checkedInAt)}
                </div>
              </li>
            ))}
            {student.attendances.length === 0 ? (
              <li className="text-slate-500">No attendance yet.</li>
            ) : null}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Intervention log</h2>
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <InterventionForm studentUserId={student.id} />
          <ul className="space-y-2 text-sm">
            {student.interventionsOnMe.map((i) => (
              <li key={i.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{humanType(i.type)}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(i.occurredAt)}</span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  by {i.advisor.name ?? i.advisor.email}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{i.note}</p>
              </li>
            ))}
            {student.interventionsOnMe.length === 0 ? (
              <li className="card p-3 text-slate-500">No interventions logged.</li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  );
}

function humanType(t: string): string {
  switch (t) {
    case "CHECK_IN":
      return "Check-in";
    case "EMAIL":
      return "Email";
    case "MEETING":
      return "Meeting";
    case "REFERRAL":
      return "Referral";
    default:
      return t;
  }
}
