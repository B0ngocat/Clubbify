import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { authorize } from "@/lib/auth/authorize";
import { scopedDb } from "@/lib/db/scoped";
import { formatDateTime } from "@/lib/utils";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export default async function OfficerAnnouncementsPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const ctx = await requireSession();
  authorize("announcement.create", { orgId: ctx.orgId, clubId }, ctx);

  const { prisma, orgWhere } = scopedDb(ctx);
  const club = await prisma.club.findFirst({
    where: { ...orgWhere, id: clubId },
    include: {
      announcements: {
        orderBy: { publishedAt: "desc" },
        take: 50,
        include: {
          author: { select: { name: true, email: true } },
          _count: { select: { reads: true } },
        },
      },
    },
  });
  if (!club) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="mt-1 text-sm text-slate-600">{club.name}</p>
        </div>
        <Link href={`/officer/${clubId}`} className="btn-secondary">
          Back
        </Link>
      </div>

      <form action={createAnnouncement} className="card p-5 space-y-3">
        <input type="hidden" name="clubId" value={clubId} />
        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" required minLength={2} maxLength={160} className="input" />
        </div>
        <div>
          <label htmlFor="body" className="label">Message</label>
          <textarea id="body" name="body" rows={4} required minLength={1} className="input" />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Publish</button>
        </div>
      </form>

      <section>
        <h2 className="text-lg font-semibold">Published</h2>
        <ul className="mt-3 space-y-3">
          {club.announcements.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDateTime(a.publishedAt)} · by {a.author.name ?? a.author.email} · {a._count.reads} reads
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-wrap text-slate-700">
                    {a.body}
                  </p>
                </div>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="announcementId" value={a.id} />
                  <button type="submit" className="text-sm text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
          {club.announcements.length === 0 ? (
            <li className="text-slate-500">No announcements yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
