import { cache } from "react";
import { auth } from "@/lib/auth/authjs";
import { prisma } from "@/lib/db/client";
import type { Role } from "@prisma/client";

export type SessionContext = {
  userId: string;
  orgId: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: Set<Role>;
  officerClubIds: Set<string>;
};

export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        orgId: true,
        email: true,
        name: true,
        image: true,
        memberships: { select: { role: true } },
        clubMemberships: {
          where: { isOfficer: true },
          select: { clubId: true },
        },
      },
    });
    if (!user || !user.orgId) return null;

    return {
      userId: user.id,
      orgId: user.orgId,
      email: user.email,
      name: user.name,
      image: user.image,
      roles: new Set(user.memberships.map((m) => m.role)),
      officerClubIds: new Set(user.clubMemberships.map((m) => m.clubId)),
    };
  },
);

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) {
    throw new Error("UNAUTHENTICATED");
  }
  return ctx;
}
