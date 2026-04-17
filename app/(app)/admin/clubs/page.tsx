import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import { createClub, setArchived, setOfficer } from "./actions";
import { slugify } from "@/lib/utils";

export default async function AdminClubsPage() {
  const ctx = await requireAdmin();
  const { prisma, orgWhere } = scopedDb(ctx);

  const clubs = await prisma.club.findMany({
    where: orgWhere,
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: [{ isOfficer: "desc" }, { user: { name: "asc" } }],
      },
      _count: { select: { events: true, memberships: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Clubs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create new clubs, archive old ones, assign officers.
        </p>
      </div>

      <form action={createClub} className="card p-5 space-y-3">
        <div className="font-medium">Create club</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="label">Name</label>
            <input id="name" name="name" required minLength={2} className="input" />
          </div>
          <div>
            <label htmlFor="slug" className="label">Slug</label>
            <input
              id="slug"
              name="slug"
              required
              minLength={2}
              pattern="[a-z0-9-]+"
              placeholder={slugify("e.g. robotics-team")}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="category" className="label">Category</label>
            <input id="category" name="category" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" name="description" rows={3} className="input" />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Create club</button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-semibold">All clubs</h2>
        <ul className="mt-3 space-y-3">
          {clubs.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/clubs/${c.slug}`} className="font-medium text-brand-700 hover:underline">
                      {c.name}
                    </Link>
                    {!c.isActive ? (
                      <span className="badge bg-slate-100 text-slate-600">Archived</span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    /{c.slug} · {c._count.memberships} members · {c._count.events} events
                  </div>
                </div>
                <form action={setArchived}>
                  <input type="hidden" name="clubId" value={c.id} />
                  <input type="hidden" name="archived" value={c.isActive ? "true" : "false"} />
                  <button type="submit" className="btn-secondary">
                    {c.isActive ? "Archive" : "Restore"}
                  </button>
                </form>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-slate-600">
                  Members ({c.memberships.length})
                </summary>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {c.memberships.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2">
                      <div>
                        {m.user.name ?? m.user.email}
                        {m.isOfficer ? (
                          <span className="badge bg-brand-50 text-brand-700 ml-2">Officer</span>
                        ) : null}
                      </div>
                      <form action={setOfficer} className="inline">
                        <input type="hidden" name="clubId" value={c.id} />
                        <input type="hidden" name="userId" value={m.userId} />
                        <input
                          type="hidden"
                          name="isOfficer"
                          value={m.isOfficer ? "false" : "true"}
                        />
                        <button type="submit" className="text-xs text-brand-700 hover:underline">
                          {m.isOfficer ? "Demote" : "Promote"}
                        </button>
                      </form>
                    </li>
                  ))}
                  {c.memberships.length === 0 ? (
                    <li className="py-2 text-slate-500">No members yet.</li>
                  ) : null}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
