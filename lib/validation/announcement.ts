import { z } from "zod";

export const announcementInputSchema = z.object({
  clubId: z.string().min(1),
  title: z.string().min(2).max(160),
  body: z.string().min(1).max(10000),
});

export const announcementIdSchema = z.object({
  announcementId: z.string().min(1),
});
