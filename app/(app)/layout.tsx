import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/authjs";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  const isAdvisor = ctx.roles.has("ADVISOR");
  const isAdmin = ctx.roles.has("ADMIN");
  const isOfficer = ctx.officerClubIds.size > 0;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/clubs" className="flex items-center gap-2 font-bold text-brand-700">
            <span className="inline-block h-3 w-3 rounded-full bg-brand-600" />
            Clubbify
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/clubs" className="text-slate-700 hover:text-brand-700">Clubs</Link>
            <Link href="/events" className="text-slate-700 hover:text-brand-700">Events</Link>
            <Link href="/me" className="text-slate-700 hover:text-brand-700">My engagement</Link>
            {isOfficer ? (
              <Link href="/officer" className="text-slate-700 hover:text-brand-700">Officer</Link>
            ) : null}
            {isAdvisor ? (
              <Link href="/advisor" className="text-slate-700 hover:text-brand-700">Advisor</Link>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" className="text-slate-700 hover:text-brand-700">Admin</Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{ctx.name ?? ctx.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-slate-500 hover:text-slate-900">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
