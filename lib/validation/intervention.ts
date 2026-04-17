import { z } from "zod";

export const interventionInputSchema = z.object({
  studentUserId: z.string().min(1),
  type: z.enum(["CHECK_IN", "EMAIL", "MEETING", "REFERRAL"]),
  note: z.string().min(1).max(4000),
  occurredAt: z.coerce.date().optional(),
});

export const interventionIdSchema = z.object({
  interventionId: z.string().min(1),
});
