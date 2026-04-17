import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireSession();
  const { prisma, orgWhere } = scopedDb(ctx);

  const q = sp.q?.trim();
  const category = sp.category?.trim();

  const clubs = await prisma.club.findMany({
    where: {
      ...orgWhere,
      isActive: true,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { memberships: true, events: true } },
      memberships: {
        where: { userId: ctx.userId },
        select: { id: true, isOfficer: true },
      },
    },
  });

  const categories = Array.from(
    new Set(clubs.map((c) => c.category).filter((c): c is string => !!c)),
  );

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clubs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Find your people. Join clubs, RSVP to events, and stay in the loop.
          </p>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" action="/clubs">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="q" className="label">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Chess, robotics, debate..."
            className="input"
          />
        </div>
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select id="category" name="category" defaultValue={category ?? ""} className="input">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">Filter</button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((c) => {
          const joined = c.memberships.length > 0;
          return (
            <Link key={c.id} href={`/clubs/${c.slug}`} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{c.name}</h2>
                {joined ? (
                  <span className="badge bg-brand-50 text-brand-700">Joined</span>
                ) : null}
              </div>
              {c.category ? (
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{c.category}</div>
              ) : null}
              <p className="mt-2 text-sm text-slate-600 line-clamp-3">{c.description}</p>
              <div className="mt-4 text-xs text-slate-500">
                {c._count.memberships} members · {c._count.events} events
              </div>
            </Link>
          );
        })}
        {clubs.length === 0 ? (
          <div className="col-span-full text-slate-500">No clubs match your search.</div>
        ) : null}
      </div>
    </div>
  );
}
