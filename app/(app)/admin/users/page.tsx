import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import { setRole } from "./actions";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = ["STUDENT", "OFFICER", "ADVISOR", "ADMIN"];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const role = sp.role as Role | undefined;

  const { prisma, orgWhere } = scopedDb(ctx);
  const users = await prisma.user.findMany({
    where: {
      ...orgWhere,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(role ? { memberships: { some: { role } } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      memberships: { select: { role: true } },
    },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          {users.length} users · toggle roles with the checkboxes.
        </p>
      </div>

      <form action="/admin/users" className="card p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="label">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name or email..." className="input" />
        </div>
        <div>
          <label htmlFor="role" className="label">Has role</label>
          <select id="role" name="role" defaultValue={role ?? ""} className="input">
            <option value="">Any</option>
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">Filter</button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">User</th>
              {ALL_ROLES.map((r) => (
                <th key={r} className="px-4 py-2 text-center">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => {
              const held = new Set(u.memberships.map((m) => m.role));
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{u.name ?? u.email}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  {ALL_ROLES.map((r) => (
                    <td key={r} className="px-4 py-2 text-center">
                      <form action={setRole} className="inline">
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="role" value={r} />
                        <input
                          type="hidden"
                          name="enabled"
                          value={held.has(r) ? "false" : "true"}
                        />
                        <button
                          type="submit"
                          className={`inline-flex h-6 w-6 items-center justify-center rounded border ${
                            held.has(r)
                              ? "bg-brand-600 border-brand-600 text-white"
                              : "border-slate-300 text-transparent hover:border-brand-500"
                          }`}
                          aria-label={`Toggle ${r} role for ${u.email}`}
                        >
                          ✓
                        </button>
                      </form>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
