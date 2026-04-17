import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth/session";
import type { SessionContext } from "@/lib/auth/session";

/**
 * Redirects to /clubs if the current user is not an admin.
 * Use at the top of any admin page/action.
 */
export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.roles.has("ADMIN")) redirect("/clubs");
  return ctx;
}
