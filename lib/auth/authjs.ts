import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { isEmailAllowed, resolveOrgForEmail } from "@/lib/auth/allowlist";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      orgId: string | null;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email;
      if (!email) return false;
      const allowed = await isEmailAllowed(email);
      if (!allowed) return false;

      // Attach orgId on first creation.
      const orgId = await resolveOrgForEmail(email);
      if (!orgId) return false;

      const existing = await prisma.user.findFirst({
        where: { email },
        select: { id: true, orgId: true },
      });
      if (existing && !existing.orgId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { orgId },
        });
      }
      return true;
    },
    async session({ session, user }) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, orgId: true },
      });
      session.user.id = user.id;
      session.user.orgId = dbUser?.orgId ?? null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const userId = user.id;
      const orgId = await resolveOrgForEmail(user.email);
      if (!orgId) return;
      await prisma.user.update({
        where: { id: userId },
        data: { orgId },
      });
      // Default STUDENT membership.
      await prisma.membership.upsert({
        where: { userId_role: { userId, role: "STUDENT" } },
        create: { userId, role: "STUDENT", orgId },
        update: {},
      });
    },
  },
});
