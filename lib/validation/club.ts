import { z } from "zod";

export const clubJoinSchema = z.object({
  clubId: z.string().min(1),
});

export const clubSlugSchema = z.object({
  slug: z.string().min(1).max(64),
});
