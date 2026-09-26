import { z } from 'zod';

export const contentStatusEnum = z.enum(['DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']);
export type ContentStatusType = z.infer<typeof contentStatusEnum>;

export const lessonSectionTypeEnum = z.enum([
  'TEXT',
  'VIDEO',
  'IMAGE',
  'CHORD',
  'TIP',
  'WARNING',
  'PRACTICE',
  'SUMMARY',
]);

export const questionTypeEnum = z.enum([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'CHORD_IDENTIFICATION',
]);

export const chordTypeEnum = z.enum([
  'MAJOR',
  'MINOR',
  'SEVENTH',
  'MAJOR_SEVENTH',
  'MINOR_SEVENTH',
  'SUSPENDED',
]);

export const achievementConditionTypeEnum = z.enum([
  'LESSONS_COMPLETED',
  'PRACTICE_SECONDS',
  'CURRENT_STREAK',
  'QUIZZES_COMPLETED',
  'PERFECT_QUIZZES',
]);

// Slug validator
export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(100, 'Slug cannot exceed 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens (e.g. c-major-open)');

// Common query schema
export const contentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ALL', 'DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).default('ALL'),
  courseId: z.string().trim().optional(),
  moduleId: z.string().trim().optional(),
  difficulty: z.string().trim().optional(),
  sortBy: z.string().trim().default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Reorder schema
export const batchReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1, 'Item ID is required'),
      order: z.number().int().min(1, 'Order must be a positive integer'),
    })
  ).min(1, 'At least one item is required for reordering'),
});

// Course schemas
export const courseCreateSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  slug: slugSchema,
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  difficulty: z.string().trim().default('BEGINNER'),
  thumbnailUrl: z.string().trim().url('Invalid thumbnail URL').optional().nullable(),
  order: z.number().int().min(1).optional(),
});

export const courseUpdateSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  difficulty: z.string().trim().optional(),
  thumbnailUrl: z.string().trim().url('Invalid thumbnail URL').optional().nullable(),
  order: z.number().int().min(1).optional(),
  status: contentStatusEnum.optional(),
  clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

// Module schemas
export const moduleCreateSchema = z.object({
  courseId: z.string().min(1, 'Course ID is required'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  slug: slugSchema,
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  order: z.number().int().min(1).optional(),
  estimatedMinutes: z.number().int().min(1).max(600).default(30),
});

export const moduleUpdateSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  order: z.number().int().min(1).optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  status: contentStatusEnum.optional(),
  clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

// Lesson schemas
export const lessonCreateSchema = z.object({
  moduleId: z.string().min(1, 'Module ID is required'),
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(150),
  slug: slugSchema,
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(2000),
  difficulty: z.string().trim().default('BEGINNER'),
  estimatedMinutes: z.number().int().min(1).max(300).default(10),
  xpReward: z.number().int().min(5).max(500).default(20),
  order: z.number().int().min(1).optional(),
});

export const lessonUpdateSchema = z.object({
  moduleId: z.string().min(1).optional(),
  title: z.string().trim().min(2).max(150).optional(),
  slug: slugSchema.optional(),
  description: z.string().trim().min(5).max(2000).optional(),
  difficulty: z.string().trim().optional(),
  estimatedMinutes: z.number().int().min(1).max(300).optional(),
  xpReward: z.number().int().min(5).max(500).optional(),
  order: z.number().int().min(1).optional(),
  status: contentStatusEnum.optional(),
  clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

// Lesson Section schemas with type-dependent validation
export const lessonSectionCreateSchema = z.object({
  lessonId: z.string().min(1, 'Lesson ID is required'),
  type: lessonSectionTypeEnum,
  title: z.string().trim().min(1, 'Title is required').max(150),
  content: z.string().trim().min(1, 'Content is required'),
  mediaUrl: z.string().trim().url('Must be a valid URL').optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  required: z.boolean().default(true),
  order: z.number().int().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'VIDEO' && !data.mediaUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Video sections require a valid media URL',
      path: ['mediaUrl'],
    });
  }
  if (data.type === 'IMAGE' && !data.mediaUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Image sections require a valid media URL',
      path: ['mediaUrl'],
    });
  }
});

export const lessonSectionUpdateSchema = z.object({
  type: lessonSectionTypeEnum.optional(),
  title: z.string().trim().min(1).max(150).optional(),
  content: z.string().trim().min(1).optional(),
  mediaUrl: z.string().trim().url('Must be a valid URL').optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  required: z.boolean().optional(),
  order: z.number().int().min(1).optional(),
});

// Quiz & Question & AnswerOption schemas
export const answerOptionInputSchema = z.object({
  id: z.string().optional(),
  text: z.string().trim().min(1, 'Option text is required').max(300),
  isCorrect: z.boolean().default(false),
  order: z.number().int().min(1),
});

export const questionInputSchema = z.object({
  id: z.string().optional(),
  type: questionTypeEnum,
  prompt: z.string().trim().min(3, 'Question prompt must be at least 3 characters').max(500),
  explanation: z.string().trim().max(1000).optional().nullable(),
  order: z.number().int().min(1),
  options: z.array(answerOptionInputSchema).min(2, 'Question must have at least 2 options'),
}).superRefine((q, ctx) => {
  const correctCount = q.options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Question "${q.prompt.slice(0, 30)}..." must have exactly one correct answer (found ${correctCount})`,
      path: ['options'],
    });
  }
});

export const quizUpdateSchema = z.object({
  title: z.string().trim().min(3, 'Quiz title must be at least 3 characters').max(150),
  description: z.string().trim().max(1000).default(''),
  passingScore: z.number().int().min(0, 'Passing score must be between 0 and 100').max(100, 'Passing score must be between 0 and 100').default(60),
  xpReward: z.number().int().min(0).max(500).default(10),
  questions: z.array(questionInputSchema).min(1, 'Quiz must have at least one question'),
  clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

// Chord diagram validator
const chordFretValue = z.union([z.number().int().min(-1).max(24), z.string()]);
const chordFingerValue = z.union([z.number().int().min(0).max(4), z.string()]);

export const chordDiagramDataSchema = z.object({
  strings: z.array(chordFretValue).length(6, 'Strings array must have exactly 6 string values (low E to high E)'),
  fingers: z.array(chordFingerValue).length(6, 'Fingers array must have exactly 6 values').optional(),
  baseFret: z.number().int().min(1).max(20).default(1),
});

export const chordCreateSchema = z.object({
  name: z.string().trim().min(1, 'Chord name is required').max(50),
  slug: slugSchema,
  type: chordTypeEnum,
  difficulty: z.string().trim().default('BEGINNER'),
  notes: z.array(z.string().trim()).min(1, 'At least one note name is required'),
  diagramData: chordDiagramDataSchema,
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(1000),
});

export const chordUpdateSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  slug: slugSchema.optional(),
  type: chordTypeEnum.optional(),
  difficulty: z.string().trim().optional(),
  notes: z.array(z.string().trim()).min(1).optional(),
  diagramData: chordDiagramDataSchema.optional(),
  description: z.string().trim().min(5).max(1000).optional(),
  status: contentStatusEnum.optional(),
  clientUpdatedAt: z.string().datetime({ offset: true }).optional(),
});

// Achievement schemas
export const achievementCreateSchema = z.object({
  code: z.string().trim().min(2, 'Code is required').max(50).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase with underscores (e.g. STREAK_7)'),
  name: z.string().trim().min(2, 'Name is required').max(100),
  description: z.string().trim().min(5, 'Description is required').max(500),
  icon: z.string().trim().min(1, 'Icon or emoji is required').max(20),
  conditionType: achievementConditionTypeEnum,
  conditionValue: z.number().int().min(1, 'Condition value must be greater than 0'),
  xpReward: z.number().int().min(5).max(1000).default(50),
  active: z.boolean().default(true),
});

export const achievementUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().min(5).max(500).optional(),
  icon: z.string().trim().min(1).max(20).optional(),
  conditionType: achievementConditionTypeEnum.optional(),
  conditionValue: z.number().int().min(1).optional(),
  xpReward: z.number().int().min(5).max(1000).optional(),
  active: z.boolean().optional(),
});

// Types
export type CourseCreateInput = z.infer<typeof courseCreateSchema>;
export type CourseUpdateInput = z.infer<typeof courseUpdateSchema>;
export type ModuleCreateInput = z.infer<typeof moduleCreateSchema>;
export type ModuleUpdateInput = z.infer<typeof moduleUpdateSchema>;
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;
export type LessonSectionCreateInput = z.infer<typeof lessonSectionCreateSchema>;
export type LessonSectionUpdateInput = z.infer<typeof lessonSectionUpdateSchema>;
export type QuizUpdateInput = z.infer<typeof quizUpdateSchema>;
export type ChordCreateInput = z.infer<typeof chordCreateSchema>;
export type ChordUpdateInput = z.infer<typeof chordUpdateSchema>;
export type AchievementCreateInput = z.infer<typeof achievementCreateSchema>;
export type AchievementUpdateInput = z.infer<typeof achievementUpdateSchema>;
export type ContentQueryInput = z.infer<typeof contentQuerySchema>;
export type BatchReorderInput = z.infer<typeof batchReorderSchema>;
