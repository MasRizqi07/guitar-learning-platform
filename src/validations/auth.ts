import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(64, 'Name too long'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().trim().min(10, 'Invalid or missing reset token'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long'),
});

export const emailVerificationConfirmSchema = z.object({
  token: z.string().trim().min(10, 'Invalid or missing verification token'),
});

export const emailVerificationSendSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address').optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;
export type EmailVerificationSendInput = z.infer<typeof emailVerificationSendSchema>;
