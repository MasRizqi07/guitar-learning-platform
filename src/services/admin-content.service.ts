import { prisma } from '@/lib/db';
import { Prisma, ContentStatus, LessonSectionType, QuestionType, ChordType, AchievementConditionType } from '@prisma/client';
import { AdminContentRepository } from '@/repositories/admin-content.repository';
import { AdminAuditService } from '@/services/admin-audit.service';
import { AppError } from '@/lib/errors';
import { hasPermission, UserRole } from '@/lib/permissions';
import {
  CourseCreateInput,
  CourseUpdateInput,
  ModuleCreateInput,
  ModuleUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
  LessonSectionCreateInput,
  LessonSectionUpdateInput,
  QuizUpdateInput,
  ChordCreateInput,
  ChordUpdateInput,
  AchievementCreateInput,
  AchievementUpdateInput,
  ContentQueryInput,
  BatchReorderInput,
} from '@/validations/content';

export interface CMSActor {
  id: string;
  role: UserRole;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
}

export class AdminContentService {
  // ==========================================
  // CONCURRENCY & VALIDATION HELPERS
  // ==========================================

  private static checkConcurrency(clientUpdatedAt?: string, currentUpdatedAt?: Date) {
    if (!clientUpdatedAt || !currentUpdatedAt) return;
    const clientTime = new Date(clientUpdatedAt).getTime();
    const serverTime = new Date(currentUpdatedAt).getTime();
    if (clientTime < serverTime - 1000) {
      throw AppError.conflict(
        'CONTENT_CONFLICT',
        'This content was updated by another editor. Refresh before saving.'
      );
    }
  }

  // ==========================================
  // PUBLISH VALIDATION ENGINE
  // ==========================================

  static async validateLessonForPublish(lessonId: string): Promise<{ valid: boolean; errors: string[] }> {
    const lesson = await AdminContentRepository.getLessonById(lessonId);
    if (!lesson) {
      return { valid: false, errors: ['Lesson does not exist'] };
    }

    const errors: string[] = [];

    if (!lesson.title || lesson.title.trim().length < 2) {
      errors.push('Lesson title must be at least 2 characters long');
    }
    if (!lesson.slug || lesson.slug.trim().length < 2) {
      errors.push('Lesson slug is required and must be valid');
    }
    if (!lesson.description || lesson.description.trim().length < 5) {
      errors.push('Lesson description must be at least 5 characters long');
    }
    if (!lesson.sections || lesson.sections.length === 0) {
      errors.push('Lesson must have at least one content section');
    } else {
      for (const section of lesson.sections) {
        if (!section.title || section.title.trim().length === 0) {
          errors.push(`Section #${section.order} is missing a title`);
        }
        if (!section.content || section.content.trim().length === 0) {
          errors.push(`Section "${section.title || section.order}" has empty content`);
        }
        if ((section.type === 'VIDEO' || section.type === 'IMAGE') && !section.mediaUrl) {
          errors.push(`Section "${section.title}" (${section.type}) requires a valid media URL`);
        }
      }
    }

    if (lesson.quiz) {
      if (!lesson.quiz.questions || lesson.quiz.questions.length === 0) {
        errors.push('If a quiz is attached, it must contain at least one question');
      } else {
        for (const q of lesson.quiz.questions) {
          if (!q.options || q.options.length < 2) {
            errors.push(`Question "${q.prompt.slice(0, 30)}..." must have at least 2 options`);
          }
          const correctOptions = q.options.filter((o) => o.isCorrect);
          if (correctOptions.length !== 1) {
            errors.push(`Question "${q.prompt.slice(0, 30)}..." must have exactly 1 correct answer (found ${correctOptions.length})`);
          }
        }
      }
      if (lesson.quiz.passingScore < 0 || lesson.quiz.passingScore > 100) {
        errors.push('Quiz passing score must be between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static async validateCourseForPublish(courseId: string): Promise<{ valid: boolean; errors: string[] }> {
    const course = await AdminContentRepository.getCourseById(courseId);
    if (!course) {
      return { valid: false, errors: ['Course does not exist'] };
    }

    const errors: string[] = [];
    if (!course.title || course.title.trim().length < 2) {
      errors.push('Course title must be at least 2 characters long');
    }
    if (!course.modules || course.modules.length === 0) {
      errors.push('Course must have at least one module before publishing');
    }

    return { valid: errors.length === 0, errors };
  }

  // ==========================================
  // COURSES
  // ==========================================

  static async listCourses(actor: CMSActor, query: ContentQueryInput) {
    if (!hasPermission(actor.role, 'course.read')) {
      throw AppError.forbidden('Permission denied: course.read required');
    }
    return AdminContentRepository.listCourses(query);
  }

  static async getCourse(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'course.read')) {
      throw AppError.forbidden('Permission denied: course.read required');
    }
    const course = await AdminContentRepository.getCourseById(id);
    if (!course) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Course not found');
    }
    return course;
  }

  static async createCourse(actor: CMSActor, input: CourseCreateInput) {
    if (!hasPermission(actor.role, 'course.create')) {
      throw AppError.forbidden('Permission denied: course.create required');
    }

    const existingSlug = await AdminContentRepository.getCourseBySlug(input.slug);
    if (existingSlug) {
      throw AppError.badRequest('SLUG_ALREADY_EXISTS', `A course with slug "${input.slug}" already exists`);
    }

    const course = await AdminContentRepository.createCourse({
      ...input,
      createdById: actor.id,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'COURSE_CREATED',
      entityType: 'Course',
      entityId: course.id,
      after: course as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return course;
  }

  static async updateCourse(actor: CMSActor, id: string, input: CourseUpdateInput) {
    if (!hasPermission(actor.role, 'course.update')) {
      throw AppError.forbidden('Permission denied: course.update required');
    }

    const current = await AdminContentRepository.getCourseById(id);
    if (!current) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Course not found');
    }

    this.checkConcurrency(input.clientUpdatedAt, current.updatedAt);

    if (input.slug && input.slug !== current.slug) {
      const existingSlug = await AdminContentRepository.getCourseBySlug(input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw AppError.badRequest('SLUG_ALREADY_EXISTS', `A course with slug "${input.slug}" already exists`);
      }
    }

    // Status transition authorization
    if (input.status && input.status !== current.status) {
      this.validateStatusTransition(actor, current.status, input.status);
    }

    const isPublishing = input.status === ContentStatus.PUBLISHED;
    const isArchiving = input.status === ContentStatus.ARCHIVED;

    const updateData: Prisma.CourseUpdateInput = {
      title: input.title,
      slug: input.slug,
      description: input.description,
      difficulty: input.difficulty,
      thumbnailUrl: input.thumbnailUrl,
      order: input.order,
      status: input.status,
      published: isPublishing ? true : input.status ? false : current.published,
      publishedAt: isPublishing ? (current.publishedAt ?? new Date()) : input.status ? null : current.publishedAt,
      archivedAt: isArchiving ? new Date() : undefined,
      publishedBy: isPublishing ? { connect: { id: actor.id } } : undefined,
    };

    const updated = await AdminContentRepository.updateCourse(id, updateData, actor.id);

    const auditAction = isPublishing
      ? 'COURSE_PUBLISHED'
      : isArchiving
      ? 'COURSE_ARCHIVED'
      : 'COURSE_UPDATED';

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: auditAction,
      entityType: 'Course',
      entityId: updated.id,
      before: current as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  // ==========================================
  // MODULES
  // ==========================================

  static async listModules(actor: CMSActor, courseId?: string) {
    if (!hasPermission(actor.role, 'module.read')) {
      throw AppError.forbidden('Permission denied: module.read required');
    }
    return AdminContentRepository.listModules(courseId);
  }

  static async getModule(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'module.read')) {
      throw AppError.forbidden('Permission denied: module.read required');
    }
    const moduleRecord = await AdminContentRepository.getModuleById(id);
    if (!moduleRecord) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Module not found');
    }
    return moduleRecord;
  }

  static async createModule(actor: CMSActor, input: ModuleCreateInput) {
    if (!hasPermission(actor.role, 'module.create')) {
      throw AppError.forbidden('Permission denied: module.create required');
    }

    const course = await AdminContentRepository.getCourseById(input.courseId);
    if (!course) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Parent course not found');
    }

    const createdModule = await AdminContentRepository.createModule(input);

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'MODULE_CREATED',
      entityType: 'Module',
      entityId: createdModule.id,
      after: createdModule as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return createdModule;
  }

  static async updateModule(actor: CMSActor, id: string, input: ModuleUpdateInput) {
    if (!hasPermission(actor.role, 'module.update')) {
      throw AppError.forbidden('Permission denied: module.update required');
    }

    const current = await AdminContentRepository.getModuleById(id);
    if (!current) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Module not found');
    }

    this.checkConcurrency(input.clientUpdatedAt, current.updatedAt);

    if (input.status && input.status !== current.status) {
      this.validateStatusTransition(actor, current.status, input.status);
    }

    const updated = await AdminContentRepository.updateModule(id, {
      title: input.title,
      slug: input.slug,
      description: input.description,
      order: input.order,
      estimatedMinutes: input.estimatedMinutes,
      status: input.status,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'MODULE_UPDATED',
      entityType: 'Module',
      entityId: updated.id,
      before: current as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  static async reorderModules(actor: CMSActor, input: BatchReorderInput) {
    if (!hasPermission(actor.role, 'module.update')) {
      throw AppError.forbidden('Permission denied: module.update required');
    }

    await AdminContentRepository.reorderModules(input.items);

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'MODULE_REORDERED',
      entityType: 'Module',
      entityId: input.items[0]?.id ?? 'batch',
      after: { items: input.items },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { success: true };
  }

  // ==========================================
  // LESSONS
  // ==========================================

  static async listLessons(actor: CMSActor, query: ContentQueryInput) {
    if (!hasPermission(actor.role, 'lesson.read')) {
      throw AppError.forbidden('Permission denied: lesson.read required');
    }
    return AdminContentRepository.listLessons(query);
  }

  static async getLesson(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'lesson.read')) {
      throw AppError.forbidden('Permission denied: lesson.read required');
    }
    const lesson = await AdminContentRepository.getLessonById(id);
    if (!lesson) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }
    return lesson;
  }

  static async createLesson(actor: CMSActor, input: LessonCreateInput) {
    if (!hasPermission(actor.role, 'lesson.create')) {
      throw AppError.forbidden('Permission denied: lesson.create required');
    }

    const parentModule = await AdminContentRepository.getModuleById(input.moduleId);
    if (!parentModule) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Parent module not found');
    }

    const existingSlug = await AdminContentRepository.getLessonBySlug(input.slug, input.moduleId);
    if (existingSlug) {
      throw AppError.badRequest('SLUG_ALREADY_EXISTS', `A lesson with slug "${input.slug}" already exists in this module`);
    }

    const lesson = await AdminContentRepository.createLesson({
      ...input,
      createdById: actor.id,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_CREATED',
      entityType: 'Lesson',
      entityId: lesson.id,
      after: lesson as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return lesson;
  }

  static async updateLesson(actor: CMSActor, id: string, input: LessonUpdateInput) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required');
    }

    const current = await AdminContentRepository.getLessonById(id);
    if (!current) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }

    this.checkConcurrency(input.clientUpdatedAt, current.updatedAt);

    if (input.slug && input.slug !== current.slug) {
      const existingSlug = await AdminContentRepository.getLessonBySlug(input.slug, input.moduleId ?? current.moduleId);
      if (existingSlug && existingSlug.id !== id) {
        throw AppError.badRequest('SLUG_ALREADY_EXISTS', `A lesson with slug "${input.slug}" already exists`);
      }
    }

    if (input.status && input.status !== current.status) {
      this.validateStatusTransition(actor, current.status, input.status);
    }

    const isPublishing = input.status === ContentStatus.PUBLISHED;
    const isArchiving = input.status === ContentStatus.ARCHIVED;

    const updated = await AdminContentRepository.updateLesson(
      id,
      {
        module: input.moduleId ? { connect: { id: input.moduleId } } : undefined,
        title: input.title,
        slug: input.slug,
        description: input.description,
        difficulty: input.difficulty,
        estimatedMinutes: input.estimatedMinutes,
        xpReward: input.xpReward,
        order: input.order,
        status: input.status,
        published: isPublishing ? true : input.status ? false : current.published,
        publishedAt: isPublishing ? (current.publishedAt ?? new Date()) : input.status ? null : current.publishedAt,
        archivedAt: isArchiving ? new Date() : undefined,
        publishedBy: isPublishing ? { connect: { id: actor.id } } : undefined,
      },
      actor.id
    );

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_UPDATED',
      entityType: 'Lesson',
      entityId: updated.id,
      before: current as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  static async submitLessonForReview(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'lesson.review') && !hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.review or lesson.update required');
    }

    const lesson = await AdminContentRepository.getLessonById(id);
    if (!lesson) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }

    if (lesson.status !== ContentStatus.DRAFT) {
      throw AppError.badRequest(
        'INVALID_STATUS_TRANSITION',
        `Cannot submit lesson in ${lesson.status} status for review (must be DRAFT)`
      );
    }

    const updated = await AdminContentRepository.updateLesson(
      id,
      {
        status: ContentStatus.IN_REVIEW,
        submittedForReviewAt: new Date(),
      },
      actor.id
    );

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_SUBMITTED_REVIEW',
      entityType: 'Lesson',
      entityId: id,
      before: { status: lesson.status },
      after: { status: ContentStatus.IN_REVIEW },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  static async publishLesson(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'lesson.publish')) {
      throw AppError.forbidden('Permission denied: lesson.publish required. Content editors cannot publish.');
    }

    const lesson = await AdminContentRepository.getLessonById(id);
    if (!lesson) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }

    if (lesson.status === ContentStatus.ARCHIVED) {
      throw AppError.badRequest(
        'INVALID_STATUS_TRANSITION',
        'Cannot publish archived lesson directly. Restore to DRAFT or review before publishing.'
      );
    }

    // Validate lesson content completeness
    const validation = await this.validateLessonForPublish(id);
    if (!validation.valid) {
      throw AppError.badRequest('CONTENT_NOT_PUBLISHABLE', validation.errors.join('; '));
    }

    // Capture snapshot for LessonRevision
    const snapshot = {
      lesson: {
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        xpReward: lesson.xpReward,
        order: lesson.order,
      },
      sections: lesson.sections.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        content: s.content,
        mediaUrl: s.mediaUrl,
        metadata: s.metadata,
        required: s.required,
        order: s.order,
      })),
      quiz: lesson.quiz
        ? {
            id: lesson.quiz.id,
            title: lesson.quiz.title,
            description: lesson.quiz.description,
            passingScore: lesson.quiz.passingScore,
            xpReward: lesson.quiz.xpReward,
            questions: lesson.quiz.questions.map((q) => ({
              id: q.id,
              type: q.type,
              prompt: q.prompt,
              explanation: q.explanation,
              order: q.order,
              options: q.options.map((o) => ({
                id: o.id,
                text: o.text,
                isCorrect: o.isCorrect,
                order: o.order,
              })),
            })),
          }
        : null,
    };

    // Allocate monotonic revision version
    const version = await AdminContentRepository.getNextRevisionVersion(id);

    const now = new Date();

    const [updated] = await prisma.$transaction([
      prisma.lesson.update({
        where: { id },
        data: {
          status: ContentStatus.PUBLISHED,
          published: true,
          publishedAt: now,
          publishedById: actor.id,
          updatedById: actor.id,
        },
      }),
      prisma.lessonRevision.create({
        data: {
          lessonId: id,
          version,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          createdById: actor.id,
          publishedAt: now,
        },
      }),
    ]);

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_PUBLISHED',
      entityType: 'Lesson',
      entityId: id,
      before: { status: lesson.status, published: lesson.published },
      after: { status: ContentStatus.PUBLISHED, published: true, revisionVersion: version },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  static async archiveLesson(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'lesson.archive')) {
      throw AppError.forbidden('Permission denied: lesson.archive required');
    }

    const lesson = await AdminContentRepository.getLessonById(id);
    if (!lesson) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }

    if (lesson.status === ContentStatus.ARCHIVED) {
      throw AppError.badRequest('CONTENT_ALREADY_ARCHIVED', 'Lesson is already archived');
    }

    const updated = await AdminContentRepository.updateLesson(
      id,
      {
        status: ContentStatus.ARCHIVED,
        published: false,
        archivedAt: new Date(),
      },
      actor.id
    );

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_ARCHIVED',
      entityType: 'Lesson',
      entityId: id,
      before: { status: lesson.status, published: lesson.published },
      after: { status: ContentStatus.ARCHIVED, published: false },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  static async reorderLessons(actor: CMSActor, input: BatchReorderInput) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required');
    }

    await AdminContentRepository.reorderLessons(input.items);

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_REORDERED',
      entityType: 'Lesson',
      entityId: input.items[0]?.id ?? 'batch',
      after: { items: input.items },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { success: true };
  }

  // ==========================================
  // SECTIONS
  // ==========================================

  static async createSection(actor: CMSActor, input: LessonSectionCreateInput) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required');
    }

    const lesson = await AdminContentRepository.getLessonById(input.lessonId);
    if (!lesson) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }

    const order = input.order ?? (await AdminContentRepository.getNextSectionOrder(input.lessonId));

    const section = await AdminContentRepository.createSection({
      lesson: { connect: { id: input.lessonId } },
      type: input.type as LessonSectionType,
      title: input.title,
      content: input.content,
      mediaUrl: input.mediaUrl,
      metadata: input.metadata as unknown as Prisma.InputJsonValue,
      required: input.required ?? true,
      order,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_UPDATED',
      entityType: 'LessonSection',
      entityId: section.id,
      after: section as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return section;
  }

  static async updateSection(actor: CMSActor, id: string, input: LessonSectionUpdateInput) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required');
    }

    const section = await AdminContentRepository.updateSection(id, {
      type: input.type as LessonSectionType | undefined,
      title: input.title,
      content: input.content,
      mediaUrl: input.mediaUrl,
      metadata: input.metadata as unknown as Prisma.InputJsonValue | undefined,
      required: input.required,
      order: input.order,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_UPDATED',
      entityType: 'LessonSection',
      entityId: section.id,
      after: section as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return section;
  }

  static async deleteSection(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required');
    }

    const section = await AdminContentRepository.deleteSection(id);

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_UPDATED',
      entityType: 'LessonSection',
      entityId: id,
      before: section as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return { success: true };
  }

  static async reorderSections(actor: CMSActor, input: BatchReorderInput) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required');
    }

    await AdminContentRepository.reorderSections(input.items);
    return { success: true };
  }

  // ==========================================
  // QUIZZES & QUESTIONS (HISTORY-SAFE)
  // ==========================================

  static async listQuizzes(actor: CMSActor, query: ContentQueryInput) {
    if (!hasPermission(actor.role, 'quiz.read')) {
      throw AppError.forbidden('Permission denied: quiz.read required');
    }
    return AdminContentRepository.listQuizzes(query);
  }

  static async getQuiz(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'quiz.read')) {
      throw AppError.forbidden('Permission denied: quiz.read required');
    }
    const quiz = await AdminContentRepository.getQuizById(id);
    if (!quiz) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Quiz not found');
    }
    return quiz;
  }

  static async updateQuiz(actor: CMSActor, quizId: string, input: QuizUpdateInput) {
    if (!hasPermission(actor.role, 'quiz.update')) {
      throw AppError.forbidden('Permission denied: quiz.update required');
    }

    const currentQuiz = await AdminContentRepository.getQuizById(quizId);
    if (!currentQuiz) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Quiz not found');
    }

    this.checkConcurrency(input.clientUpdatedAt, currentQuiz.updatedAt);

    // CRITICAL DATA INTEGRITY CHECK:
    // Check if any existing question is being removed.
    // If an existing question has QuizAttemptAnswer records, DO NOT allow deletion!
    const incomingQuestionIds = new Set(input.questions.map((q) => q.id).filter(Boolean) as string[]);
    for (const existingQuestion of currentQuiz.questions) {
      if (!incomingQuestionIds.has(existingQuestion.id)) {
        const attemptCount = await AdminContentRepository.countQuestionAttemptAnswers(existingQuestion.id);
        if (attemptCount > 0) {
          throw AppError.badRequest(
            'QUESTION_IN_USE',
            `Cannot delete question "${existingQuestion.prompt.slice(0, 30)}..." because it has ${attemptCount} learner quiz attempts`
          );
        }
      }
    }

    // Execute transactional update of quiz, questions, and options
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update quiz top-level fields
      await tx.quiz.update({
        where: { id: quizId },
        data: {
          title: input.title,
          description: input.description,
          passingScore: input.passingScore,
          xpReward: input.xpReward,
        },
      });

      // 2. Process incoming questions
      for (const q of input.questions) {
        if (q.id) {
          // Update existing question
          await tx.question.update({
            where: { id: q.id },
            data: {
              prompt: q.prompt,
              type: q.type as QuestionType,
              explanation: q.explanation,
              order: q.order,
            },
          });

          // Delete options not in incoming payload
          const incomingOptionIds = new Set(q.options.map((o) => o.id).filter(Boolean) as string[]);
          await tx.answerOption.deleteMany({
            where: {
              questionId: q.id,
              id: { notIn: Array.from(incomingOptionIds) },
            },
          });

          // Update or create options
          for (const opt of q.options) {
            if (opt.id) {
              await tx.answerOption.update({
                where: { id: opt.id },
                data: {
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  order: opt.order,
                },
              });
            } else {
              await tx.answerOption.create({
                data: {
                  questionId: q.id,
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  order: opt.order,
                },
              });
            }
          }
        } else {
          // Create new question with options
          await tx.question.create({
            data: {
              quizId,
              prompt: q.prompt,
              type: q.type as QuestionType,
              explanation: q.explanation,
              order: q.order,
              options: {
                create: q.options.map((opt) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                  order: opt.order,
                })),
              },
            },
          });
        }
      }

      // Remove questions that had 0 attempt answers
      const removedQuestionIds = currentQuiz.questions
        .filter((q) => !incomingQuestionIds.has(q.id))
        .map((q) => q.id);

      if (removedQuestionIds.length > 0) {
        await tx.question.deleteMany({
          where: { id: { in: removedQuestionIds } },
        });
      }

      return tx.quiz.findUnique({
        where: { id: quizId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      });
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'QUIZ_UPDATED',
      entityType: 'Quiz',
      entityId: quizId,
      before: currentQuiz as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  // ==========================================
  // REVISION HISTORY & RESTORE
  // ==========================================

  static async listLessonRevisions(actor: CMSActor, lessonId: string) {
    if (!hasPermission(actor.role, 'lesson.read')) {
      throw AppError.forbidden('Permission denied: lesson.read required');
    }
    return AdminContentRepository.listLessonRevisions(lessonId);
  }

  static async getLessonRevision(actor: CMSActor, revisionId: string) {
    if (!hasPermission(actor.role, 'lesson.read')) {
      throw AppError.forbidden('Permission denied: lesson.read required');
    }
    const revision = await AdminContentRepository.getRevisionById(revisionId);
    if (!revision) {
      throw AppError.notFound('REVISION_NOT_FOUND', 'Lesson revision not found');
    }
    return revision;
  }

  static async restoreLessonRevision(actor: CMSActor, lessonId: string, revisionId: string) {
    if (!hasPermission(actor.role, 'lesson.update')) {
      throw AppError.forbidden('Permission denied: lesson.update required to restore revisions');
    }

    const [lesson, targetRevision] = await Promise.all([
      AdminContentRepository.getLessonById(lessonId),
      AdminContentRepository.getRevisionById(revisionId),
    ]);

    if (!lesson) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Lesson not found');
    }
    if (!targetRevision || targetRevision.lessonId !== lessonId) {
      throw AppError.notFound('REVISION_NOT_FOUND', 'Target revision not found for this lesson');
    }

    // 1. Create a safety snapshot of the current state before restore
    const currentSnapshot = {
      lesson: {
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        xpReward: lesson.xpReward,
        order: lesson.order,
      },
      sections: lesson.sections,
      quiz: lesson.quiz,
    };

    const safetyVersion = await AdminContentRepository.getNextRevisionVersion(lessonId);

    interface LessonSnapshot {
      lesson: {
        title: string;
        description: string;
        difficulty: string;
        estimatedMinutes: number;
        xpReward: number;
      };
      sections: Array<{
        type: LessonSectionType;
        title: string;
        content: string;
        mediaUrl?: string | null;
        metadata?: Prisma.InputJsonValue;
        required: boolean;
        order: number;
      }>;
      quiz?: {
        title: string;
        description?: string;
        passingScore: number;
        xpReward: number;
        questions: Array<{
          type: QuestionType;
          prompt: string;
          explanation?: string;
          order: number;
          options: Array<{
            text: string;
            isCorrect: boolean;
            order: number;
          }>;
        }>;
      } | null;
    }

    const snapshot = targetRevision.snapshot as unknown as LessonSnapshot | null;
    if (!snapshot || !snapshot.lesson) {
      throw AppError.badRequest('REVISION_RESTORE_FAILED', 'Malformed revision snapshot');
    }

    // 2. Perform transactional restore
    await prisma.$transaction(async (tx) => {
      // Save current safety backup revision
      await tx.lessonRevision.create({
        data: {
          lessonId,
          version: safetyVersion,
          snapshot: currentSnapshot as unknown as Prisma.InputJsonValue,
          createdById: actor.id,
        },
      });

      // Update lesson metadata and set to DRAFT (Section 46: Restored state: DRAFT)
      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          title: snapshot.lesson.title,
          description: snapshot.lesson.description,
          difficulty: snapshot.lesson.difficulty,
          estimatedMinutes: snapshot.lesson.estimatedMinutes,
          xpReward: snapshot.lesson.xpReward,
          status: ContentStatus.DRAFT,
          published: false,
          updatedById: actor.id,
        },
      });

      // Restore sections: delete existing sections and recreate from snapshot
      await tx.lessonSection.deleteMany({ where: { lessonId } });
      if (Array.isArray(snapshot.sections)) {
        for (const s of snapshot.sections) {
          await tx.lessonSection.create({
            data: {
              lessonId,
              type: s.type as LessonSectionType,
              title: s.title,
              content: s.content,
              mediaUrl: s.mediaUrl,
              metadata: s.metadata,
              required: s.required ?? true,
              order: s.order,
            },
          });
        }
      }
    });

    const restoredLesson = await AdminContentRepository.getLessonById(lessonId);

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'LESSON_REVISION_RESTORED',
      entityType: 'Lesson',
      entityId: lessonId,
      before: { version: lesson.revisions[0]?.version },
      after: { restoredFromVersion: targetRevision.version, safetyBackupVersion: safetyVersion, status: ContentStatus.DRAFT },
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return restoredLesson;
  }

  // ==========================================
  // CHORDS
  // ==========================================

  static async listChords(actor: CMSActor, query: ContentQueryInput) {
    if (!hasPermission(actor.role, 'chord.read')) {
      throw AppError.forbidden('Permission denied: chord.read required');
    }
    return AdminContentRepository.listChords(query);
  }

  static async getChord(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'chord.read')) {
      throw AppError.forbidden('Permission denied: chord.read required');
    }
    const chord = await AdminContentRepository.getChordById(id);
    if (!chord) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Chord not found');
    }
    return chord;
  }

  static async createChord(actor: CMSActor, input: ChordCreateInput) {
    if (!hasPermission(actor.role, 'chord.create')) {
      throw AppError.forbidden('Permission denied: chord.create required');
    }

    const existingSlug = await AdminContentRepository.getChordBySlug(input.slug);
    if (existingSlug) {
      throw AppError.badRequest('SLUG_ALREADY_EXISTS', `A chord with slug "${input.slug}" already exists`);
    }

    const chord = await AdminContentRepository.createChord({
      name: input.name,
      slug: input.slug,
      type: input.type as ChordType,
      difficulty: input.difficulty,
      notes: input.notes as unknown as Prisma.InputJsonValue,
      diagramData: input.diagramData as unknown as Prisma.InputJsonValue,
      description: input.description,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'CHORD_CREATED',
      entityType: 'Chord',
      entityId: chord.id,
      after: chord as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return chord;
  }

  static async updateChord(actor: CMSActor, id: string, input: ChordUpdateInput) {
    if (!hasPermission(actor.role, 'chord.update')) {
      throw AppError.forbidden('Permission denied: chord.update required');
    }

    const current = await AdminContentRepository.getChordById(id);
    if (!current) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Chord not found');
    }

    this.checkConcurrency(input.clientUpdatedAt, current.updatedAt);

    if (input.slug && input.slug !== current.slug) {
      const existingSlug = await AdminContentRepository.getChordBySlug(input.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw AppError.badRequest('SLUG_ALREADY_EXISTS', `A chord with slug "${input.slug}" already exists`);
      }
    }

    const updated = await AdminContentRepository.updateChord(id, {
      name: input.name,
      slug: input.slug,
      type: input.type as ChordType | undefined,
      difficulty: input.difficulty,
      notes: input.notes as unknown as Prisma.InputJsonValue | undefined,
      diagramData: input.diagramData as unknown as Prisma.InputJsonValue | undefined,
      description: input.description,
      status: input.status,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'CHORD_UPDATED',
      entityType: 'Chord',
      entityId: updated.id,
      before: current as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  // ==========================================
  // ACHIEVEMENTS
  // ==========================================

  static async listAchievements(actor: CMSActor, search?: string) {
    if (!hasPermission(actor.role, 'achievement.read')) {
      throw AppError.forbidden('Permission denied: achievement.read required');
    }
    return AdminContentRepository.listAchievements(search);
  }

  static async getAchievement(actor: CMSActor, id: string) {
    if (!hasPermission(actor.role, 'achievement.read')) {
      throw AppError.forbidden('Permission denied: achievement.read required');
    }
    const ach = await AdminContentRepository.getAchievementById(id);
    if (!ach) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Achievement not found');
    }
    return ach;
  }

  static async createAchievement(actor: CMSActor, input: AchievementCreateInput) {
    if (!hasPermission(actor.role, 'achievement.create')) {
      throw AppError.forbidden('Permission denied: achievement.create required');
    }

    const ach = await AdminContentRepository.createAchievement({
      code: input.code,
      name: input.name,
      description: input.description,
      icon: input.icon,
      conditionType: input.conditionType as AchievementConditionType,
      conditionValue: input.conditionValue,
      xpReward: input.xpReward,
      active: input.active,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'ACHIEVEMENT_CREATED',
      entityType: 'Achievement',
      entityId: ach.id,
      after: ach as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return ach;
  }

  static async updateAchievement(actor: CMSActor, id: string, input: AchievementUpdateInput) {
    if (!hasPermission(actor.role, 'achievement.update')) {
      throw AppError.forbidden('Permission denied: achievement.update required');
    }

    const current = await AdminContentRepository.getAchievementById(id);
    if (!current) {
      throw AppError.notFound('CONTENT_NOT_FOUND', 'Achievement not found');
    }

    const updated = await AdminContentRepository.updateAchievement(id, {
      name: input.name,
      description: input.description,
      icon: input.icon,
      conditionType: input.conditionType as AchievementConditionType | undefined,
      conditionValue: input.conditionValue,
      xpReward: input.xpReward,
      active: input.active,
    });

    await AdminAuditService.record({
      actorUserId: actor.id,
      action: 'ACHIEVEMENT_UPDATED',
      entityType: 'Achievement',
      entityId: updated.id,
      before: current as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return updated;
  }

  // ==========================================
  // CONTENT OVERVIEW METRICS
  // ==========================================

  static async getOverviewMetrics(actor: CMSActor) {
    if (!hasPermission(actor.role, 'course.read')) {
      throw AppError.forbidden('Permission denied: course.read required');
    }
    return AdminContentRepository.getContentOverviewMetrics();
  }

  // ==========================================
  // STATUS TRANSITION RULES & POLICY
  // ==========================================

  private static validateStatusTransition(
    actor: CMSActor,
    fromStatus: ContentStatus,
    toStatus: ContentStatus
  ) {
    // Valid transitions
    const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
      DRAFT: [ContentStatus.IN_REVIEW, ContentStatus.ARCHIVED, ContentStatus.PUBLISHED],
      IN_REVIEW: [ContentStatus.DRAFT, ContentStatus.PUBLISHED, ContentStatus.SCHEDULED],
      SCHEDULED: [ContentStatus.PUBLISHED, ContentStatus.DRAFT],
      PUBLISHED: [ContentStatus.DRAFT, ContentStatus.ARCHIVED],
      ARCHIVED: [ContentStatus.DRAFT],
    };

    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    if (!allowed.includes(toStatus)) {
      throw AppError.badRequest(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition status from ${fromStatus} to ${toStatus}`
      );
    }

    // Role restrictions: CONTENT_EDITOR cannot publish or archive
    if (toStatus === ContentStatus.PUBLISHED || toStatus === ContentStatus.ARCHIVED) {
      if (actor.role === 'CONTENT_EDITOR') {
        throw AppError.forbidden('Content editors cannot publish or archive content. Admin or Owner approval required.');
      }
    }
  }
}
