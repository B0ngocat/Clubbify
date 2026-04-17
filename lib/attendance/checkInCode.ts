import { prisma } from "@/lib/db/client";

const DEFAULT_WINDOW_MINUTES = 120;
const CODE_LENGTH = 6;
// Crockford's base32 without I/L/O/U/0/1 for readability.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export async function openCheckIn(params: {
  orgId: string;
  eventId: string;
  windowMinutes?: number;
}): Promise<{ code: string; openUntil: Date }> {
  const openUntil = new Date(
    Date.now() + (params.windowMinutes ?? DEFAULT_WINDOW_MINUTES) * 60 * 1000,
  );
  const code = generateCode();
  await prisma.eventCheckInCode.upsert({
    where: { eventId: params.eventId },
    create: {
      orgId: params.orgId,
      eventId: params.eventId,
      code,
      rotatesAt: openUntil,
      openUntil,
    },
    update: {
      code,
      rotatesAt: openUntil,
      openUntil,
    },
  });
  return { code, openUntil };
}

export async function closeCheckIn(eventId: string): Promise<void> {
  const now = new Date();
  await prisma.eventCheckInCode
    .update({
      where: { eventId },
      data: { openUntil: now, rotatesAt: now },
    })
    .catch(() => undefined);
}

export async function getActiveCheckIn(eventId: string) {
  const row = await prisma.eventCheckInCode.findUnique({
    where: { eventId },
  });
  if (!row) return null;
  if (row.openUntil < new Date()) return null;
  return row;
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; reason: "not-open" | "wrong-code" | "expired" };

export async function validateCode(
  eventId: string,
  submittedCode: string,
): Promise<ValidateResult> {
  const row = await prisma.eventCheckInCode.findUnique({
    where: { eventId },
  });
  if (!row) return { ok: false, reason: "not-open" };
  if (row.openUntil < new Date()) return { ok: false, reason: "expired" };
  if (row.code.toUpperCase() !== submittedCode.trim().toUpperCase()) {
    return { ok: false, reason: "wrong-code" };
  }
  return { ok: true };
}
