import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export const createTopicSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  keywords: z.object({
    include: z.array(z.string().min(1)).min(1, "At least one keyword required"),
    exclude: z.array(z.string()).default([]),
  }),
  category: z.enum(["brand", "competitor", "product", "industry"]).optional(),
});

export const updateTopicSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  keywords: z
    .object({
      include: z.array(z.string().min(1)).min(1),
      exclude: z.array(z.string()),
    })
    .optional(),
  category: z.enum(["brand", "competitor", "product", "industry"]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
