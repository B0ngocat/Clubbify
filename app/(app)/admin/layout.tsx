import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/clubs", label: "Clubs" },
  { href: "/admin/advisors", label: "Advisors" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit", label: "Audit" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-1 border-b border-slate-200 text-sm">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-2 text-slate-600 hover:text-brand-700 hover:border-b-2 hover:border-brand-600 -mb-px"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
