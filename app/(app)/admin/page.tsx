import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import Link from "next/link";

export default async function AdminOverview() {
  const ctx = await requireAdmin();
  const { prisma, orgWhere } = scopedDb(ctx);

  const [users, clubs, events, advisors, atRisk] = await Promise.all([
    prisma.user.count({ where: orgWhere }),
    prisma.club.count({ where: { ...orgWhere, isActive: true } }),
    prisma.event.count({ where: orgWhere }),
    prisma.membership.count({
      where: { orgId: ctx.orgId, role: "ADVISOR" },
    }),
    prisma.studentEngagementScore.count({
      where: { ...orgWhere, band: "AT_RISK" },
    }),
  ]);

  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, emailDomainAllowlist: true, timezone: true },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-slate-600">
          {org?.name ?? "Organization"} · {org?.emailDomainAllowlist.join(", ")} · {org?.timezone}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Users" n={users} href="/admin/users" />
        <Stat label="Clubs" n={clubs} href="/admin/clubs" />
        <Stat label="Events" n={events} href="/admin/reports" />
        <Stat label="Advisors" n={advisors} href="/admin/advisors" />
        <Stat label="At risk" n={atRisk} tone="red" href="/admin/reports" />
      </div>
    </div>
  );
}

function Stat({
  label,
  n,
  tone,
  href,
}: {
  label: string;
  n: number;
  tone?: "red";
  href: string;
}) {
  const classes = tone === "red" ? "text-red-700" : "text-slate-900";
  return (
    <Link href={href} className="card p-4 hover:shadow-md">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${classes}`}>{n}</div>
    </Link>
  );
}
