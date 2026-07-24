import { z } from "zod";

export const userProfileSchema = z.object({
  displayName: z.string().min(2, "Name is too short").max(50),
});

export const tindaDocSchema = z.object({
  title: z.string().min(3, "Title is too short").max(100),
  description: z.string().min(10, "Description must be more detailed"),
  status: z.enum(["active", "archived"]).default("active"),
  imageUrl: z.string().url().optional().or(z.literal("")),
});