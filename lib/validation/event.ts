import { z } from "zod";

export const eventInputSchema = z
  .object({
    clubId: z.string().min(1),
    title: z.string().min(2).max(120),
    description: z.string().max(4000).default(""),
    location: z.string().max(200).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: "End time must be after start time.",
    path: ["endsAt"],
  });

export const rsvpInputSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["GOING", "MAYBE", "DECLINED"]).default("GOING"),
});

export const eventIdSchema = z.object({
  eventId: z.string().min(1),
});
