import { z } from 'zod';
import { SupportCategory, SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

const normalizeCategory = (val: unknown): SupportCategory => {
  if (val === 'AUDIO_DSP' || val === 'AUDIO_TUNER') return SupportCategory.AUDIO_TUNER;
  if (val === 'ACCOUNT' || val === 'ACCOUNT_ACCESS') return SupportCategory.ACCOUNT_ACCESS;
  if (val === 'CURRICULUM') return SupportCategory.CURRICULUM;
  if (val === 'CONTENT_BUG') return SupportCategory.CONTENT_BUG;
  return SupportCategory.GENERAL;
};

export const createTicketSchema = z
  .object({
    category: z.preprocess(normalizeCategory, z.nativeEnum(SupportCategory)).default(SupportCategory.GENERAL),
    subject: z.string().trim().max(200).optional(),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    body: z.string().trim().max(5000).optional(),
    telemetry: z
      .object({
        userAgent: z.string().max(500).optional(),
        audioSampleRate: z.number().int().positive().optional(),
        audioContextState: z.string().max(50).optional(),
        platform: z.string().max(100).optional(),
        screenResolution: z.string().max(50).optional(),
      })
      .optional(),
  })
  .transform((data) => ({
    category: data.category,
    subject: data.subject || data.title || '',
    body: data.body || data.description || '',
    description: data.description || data.body || '',
    telemetry: data.telemetry,
  }))
  .refine((d) => d.subject.length >= 3, {
    message: 'Subject/title must be at least 3 characters',
    path: ['subject'],
  })
  .refine((d) => d.body.length >= 10, {
    message: 'Problem description must be at least 10 characters',
    path: ['body'],
  });

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message body cannot be empty').max(5000, 'Message body too long'),
});

export const createInternalNoteSchema = z.object({
  body: z.string().trim().min(1, 'Internal note cannot be empty').max(5000, 'Internal note too long'),
});

export const assignTicketSchema = z.object({
  assignedToId: z.string().uuid('Invalid staff user ID').nullable(),
});

export const updatePrioritySchema = z.object({
  priority: z.nativeEnum(SupportTicketPriority),
});

export const transitionStatusSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateInternalNoteInput = z.infer<typeof createInternalNoteSchema>;
export type AssignTicketInput = z.infer<typeof assignTicketSchema>;
export type UpdatePriorityInput = z.infer<typeof updatePrioritySchema>;
export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
