import { z } from "zod";

export const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["STUDENT", "OFFICER", "ADVISOR", "ADMIN"]),
  enabled: z
    .string()
    .or(z.boolean())
    .transform((v) => (typeof v === "boolean" ? v : v === "true" || v === "on")),
});

export const clubInputSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, and dashes only"),
  description: z.string().max(2000).default(""),
  category: z.string().max(80).optional(),
});

export const archiveClubSchema = z.object({
  clubId: z.string().min(1),
  archived: z
    .string()
    .or(z.boolean())
    .transform((v) => (typeof v === "boolean" ? v : v === "true")),
});

export const promoteOfficerSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
  isOfficer: z
    .string()
    .or(z.boolean())
    .transform((v) => (typeof v === "boolean" ? v : v === "true")),
});

export const bulkAdvisorSchema = z.object({
  csv: z.string().min(1),
});

export const orgSettingsSchema = z.object({
  name: z.string().min(2).max(120),
  timezone: z.string().min(3).max(80),
  emailDomainAllowlist: z
    .string()
    .max(4000)
    .transform((s) =>
      s
        .split(/[,\s]+/)
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
    ),
});
