import { z } from "zod";

export const pointRuleSchema = z.object({
  clubId: z.string().min(1),
  source: z.enum([
    "EVENT_ATTENDANCE",
    "EVENT_RSVP",
    "OFFICER_ROLE",
    "ANNOUNCEMENT_READ",
    "CUSTOM",
  ]),
  points: z.coerce.number().int().min(0).max(1000),
  notes: z.string().max(500).optional(),
});

export const pointRuleIdSchema = z.object({
  ruleId: z.string().min(1),
});

export const thresholdInputSchema = z.object({
  clubId: z.string().min(1),
  label: z.string().min(1).max(80),
  points: z.coerce.number().int().min(1).max(100000),
});

export const thresholdIdSchema = z.object({
  thresholdId: z.string().min(1),
});

export const manualAwardSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
  points: z.coerce.number().int().min(-1000).max(1000),
  reason: z.string().min(1).max(500),
});
