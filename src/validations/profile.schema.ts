import { z } from 'zod';
import { ExperienceLevel, GuitarType } from '@prisma/client';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
  timezone: z.string().min(1).max(50).optional(),
  dailyGoalMinutes: z
    .union([z.literal(10), z.literal(15), z.literal(30), z.literal(45), z.literal(60)])
    .optional(),
  guitarType: z.nativeEnum(GuitarType).optional(),
  experienceLevel: z.nativeEnum(ExperienceLevel).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
