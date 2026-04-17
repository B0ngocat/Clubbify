import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { scopedDb } from "@/lib/db/scoped";

export default async function OfficerIndexPage() {
  const ctx = await requireSession();
  if (ctx.officerClubIds.size === 0) redirect("/clubs");

  const { prisma, orgWhere } = scopedDb(ctx);
  const clubs = await prisma.club.findMany({
    where: { ...orgWhere, id: { in: Array.from(ctx.officerClubIds) } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Your clubs</h1>
      <p className="mt-1 text-sm text-slate-600">
        Manage clubs where you're an officer.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {clubs.map((c) => (
          <li key={c.id}>
            <Link href={`/officer/${c.id}`} className="card block p-4 hover:shadow-md">
              <div className="font-medium">{c.name}</div>
              <div className="mt-1 text-sm text-slate-600 line-clamp-2">{c.description}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
