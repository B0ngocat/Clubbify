import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/client";
import { updateOrgSettings } from "./actions";

export default async function AdminSettingsPage() {
  const ctx = await requireAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
  });
  if (!org) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Organization-wide settings. Multi-tenant mode lands in a later release.
        </p>
      </div>

      <form action={updateOrgSettings} className="card p-5 space-y-4">
        <div>
          <label htmlFor="name" className="label">Organization name</label>
          <input id="name" name="name" defaultValue={org.name} required className="input" />
        </div>
        <div>
          <label htmlFor="timezone" className="label">Timezone</label>
          <input id="timezone" name="timezone" defaultValue={org.timezone} required className="input" />
          <p className="mt-1 text-xs text-slate-500">
            IANA name, e.g. <code className="font-mono">America/Los_Angeles</code>.
          </p>
        </div>
        <div>
          <label htmlFor="emailDomainAllowlist" className="label">Allowed email domains</label>
          <textarea
            id="emailDomainAllowlist"
            name="emailDomainAllowlist"
            rows={3}
            defaultValue={org.emailDomainAllowlist.join("\n")}
            className="input font-mono text-xs"
          />
          <p className="mt-1 text-xs text-slate-500">
            One domain per line. Users must sign in with Google accounts on these domains.
          </p>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Save</button>
        </div>
      </form>

      <div className="card p-5 text-sm text-slate-600">
        <div className="font-medium text-slate-900">Engagement score thresholds</div>
        <p className="mt-1">
          Band cutoffs are currently constants in <code className="font-mono">lib/engagement/score.ts</code>
          {" "}(HEALTHY ≥ 60, WATCH ≥ 30). Per-org tuning lands in a later release.
        </p>
      </div>
    </div>
  );
}
