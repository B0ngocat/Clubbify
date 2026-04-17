import { z } from "zod";

export const openCheckInSchema = z.object({
  eventId: z.string().min(1),
  windowMinutes: z.coerce.number().int().positive().max(720).optional(),
});

export const markAttendanceSchema = z.object({
  eventId: z.string().min(1),
  userId: z.string().min(1),
  attended: z.coerce.boolean().default(true),
});

export const selfCheckInSchema = z.object({
  eventId: z.string().min(1),
  code: z.string().min(4).max(12),
});
