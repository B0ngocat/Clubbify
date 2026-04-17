import { prisma } from "@/lib/db/client";

/**
 * Throws if the given advisor is not assigned to the given student.
 * Used as a per-request guard on advisor routes so a stolen userId in the URL
 * doesn't reveal another advisor's caseload.
 */
export async function assertAdvisesStudent(
  advisorUserId: string,
  studentUserId: string,
): Promise<void> {
  const row = await prisma.advisorAssignment.findUnique({
    where: {
      advisorUserId_studentUserId: { advisorUserId, studentUserId },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error("NOT_ASSIGNED");
  }
}

export async function advisorStudentIds(advisorUserId: string): Promise<string[]> {
  const rows = await prisma.advisorAssignment.findMany({
    where: { advisorUserId },
    select: { studentUserId: true },
  });
  return rows.map((r) => r.studentUserId);
}
