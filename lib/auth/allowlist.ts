import { prisma } from "@/lib/db/client";

export function envAllowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function emailDomain(email: string): string {
  return email.toLowerCase().split("@")[1] ?? "";
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  const domain = emailDomain(email);
  if (!domain) return false;

  const orgs = await prisma.organization.findMany({
    select: { emailDomainAllowlist: true },
  });
  const orgDomains = orgs.flatMap((o) =>
    o.emailDomainAllowlist.map((d) => d.toLowerCase()),
  );

  const envDomains = envAllowedDomains();
  const all = new Set([...orgDomains, ...envDomains]);

  return all.has(domain);
}

export async function resolveOrgForEmail(email: string): Promise<string | null> {
  const domain = emailDomain(email);
  if (!domain) return null;

  const org = await prisma.organization.findFirst({
    where: { emailDomainAllowlist: { has: domain } },
    select: { id: true },
  });
  if (org) return org.id;

  // Fallback: if env allowlist covers it, use the default organization
  if (envAllowedDomains().includes(domain)) {
    const defaultSlug = process.env.DEFAULT_ORG_SLUG ?? "default";
    const fallback = await prisma.organization.findUnique({
      where: { slug: defaultSlug },
      select: { id: true },
    });
    return fallback?.id ?? null;
  }
  return null;
}
