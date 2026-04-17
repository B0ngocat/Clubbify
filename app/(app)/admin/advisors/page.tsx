import { requireAdmin } from "@/lib/auth/admin";
import { scopedDb } from "@/lib/db/scoped";
import { CsvImportForm } from "./CsvImportForm";
import { removeAssignment } from "./actions";

export default async function AdminAdvisorsPage() {
  const ctx = await requireAdmin();
  const { prisma, orgWhere } = scopedDb(ctx);

  const advisors = await prisma.user.findMany({
    where: {
      ...orgWhere,
      memberships: { some: { role: "ADVISOR" } },
    },
    orderBy: { name: "asc" },
    include: {
      advisorAssignments: {
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
        orderBy: { student: { name: "asc" } },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Advisors</h1>
        <p className="mt-1 text-sm text-slate-600">
          {advisors.length} advisors · bulk-assign students via CSV.
        </p>
      </div>

      <CsvImportForm />

      <section>
        <h2 className="text-lg font-semibold">Caseloads</h2>
        <ul className="mt-3 space-y-4">
          {advisors.map((a) => (
            <li key={a.id} className="card p-4">
              <div className="font-medium">{a.name ?? a.email}</div>
              <div className="text-xs text-slate-500">
                {a.email} · {a.advisorAssignments.length} students
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
                {a.advisorAssignments.map((asg) => (
                  <li key={asg.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-1.5">
                    <span>{asg.student.name ?? asg.student.email}</span>
                    <form action={removeAssignment} className="inline">
                      <input type="hidden" name="assignmentId" value={asg.id} />
                      <button type="submit" className="text-xs text-red-600 hover:text-red-800">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
                {a.advisorAssignments.length === 0 ? (
                  <li className="text-slate-500">No students assigned.</li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
