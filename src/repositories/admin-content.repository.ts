import { prisma } from '@/lib/db';
import { Prisma, ContentStatus, ChordType, AchievementConditionType } from '@prisma/client';
import { ContentQueryInput } from '@/validations/content';

export class AdminContentRepository {
  // ==========================================
  // COURSES
  // ==========================================

  static async listCourses(query: ContentQueryInput) {
    const where: Prisma.CourseWhereInput = {};
    if (query.status !== 'ALL') {
      where.status = query.status as ContentStatus;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    const [items, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { [query.sortBy === 'order' ? 'order' : 'createdAt']: query.sortOrder },
        include: {
          _count: { select: { modules: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } },
          publishedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.course.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  static async getCourseById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                slug: true,
                order: true,
                status: true,
                published: true,
                difficulty: true,
              },
            },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        publishedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async getCourseBySlug(slug: string) {
    return prisma.course.findUnique({ where: { slug } });
  }

  static async getNextCourseOrder() {
    const last = await prisma.course.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  static async createCourse(data: {
    title: string;
    slug: string;
    description: string;
    difficulty?: string;
    thumbnailUrl?: string | null;
    order?: number;
    createdById: string;
  }) {
    const order = data.order ?? (await this.getNextCourseOrder());
    return prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        difficulty: data.difficulty ?? 'BEGINNER',
        thumbnailUrl: data.thumbnailUrl,
        order,
        status: ContentStatus.DRAFT,
        published: false,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  static async updateCourse(
    id: string,
    data: Prisma.CourseUpdateInput,
    updatedById: string
  ) {
    return prisma.course.update({
      where: { id },
      data: {
        ...data,
        updatedBy: { connect: { id: updatedById } },
      },
    });
  }

  // ==========================================
  // MODULES
  // ==========================================

  static async listModules(courseId?: string) {
    return prisma.module.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: [{ courseId: 'asc' }, { order: 'asc' }],
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { lessons: true } },
      },
    });
  }

  static async getModuleById(id: string) {
    return prisma.module.findUnique({
      where: { id },
      include: {
        course: true,
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
            status: true,
            published: true,
            difficulty: true,
          },
        },
      },
    });
  }

  static async getNextModuleOrder(courseId: string) {
    const last = await prisma.module.findFirst({
      where: { courseId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  static async createModule(data: {
    courseId: string;
    title: string;
    slug: string;
    description: string;
    order?: number;
    estimatedMinutes?: number;
  }) {
    const order = data.order ?? (await this.getNextModuleOrder(data.courseId));
    return prisma.module.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        slug: data.slug,
        description: data.description,
        order,
        estimatedMinutes: data.estimatedMinutes ?? 30,
        status: ContentStatus.DRAFT,
      },
    });
  }

  static async updateModule(id: string, data: Prisma.ModuleUpdateInput) {
    return prisma.module.update({
      where: { id },
      data,
    });
  }

  /**
   * Transactional two-phase reorder to avoid unique constraint collisions
   */
  static async reorderModules(items: { id: string; order: number }[]) {
    return prisma.$transaction(async (tx) => {
      // Phase 1: Set temporary negative order
      for (let i = 0; i < items.length; i++) {
        await tx.module.update({
          where: { id: items[i].id },
          data: { order: -(i + 1000) },
        });
      }
      // Phase 2: Set target order
      for (const item of items) {
        await tx.module.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }
    });
  }

  // ==========================================
  // LESSONS
  // ==========================================

  static async listLessons(query: ContentQueryInput) {
    const where: Prisma.LessonWhereInput = {};
    if (query.status !== 'ALL') {
      where.status = query.status as ContentStatus;
    }
    if (query.moduleId) {
      where.moduleId = query.moduleId;
    }
    if (query.courseId) {
      where.module = { courseId: query.courseId };
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    const [items, total] = await Promise.all([
      prisma.lesson.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ moduleId: 'asc' }, { order: 'asc' }],
        include: {
          module: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
          _count: { select: { sections: true, revisions: true } },
          quiz: { select: { id: true, title: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } },
          publishedBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.lesson.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  static async getLessonById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
        },
        quiz: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: {
                options: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        },
        revisions: {
          orderBy: { version: 'desc' },
          take: 10,
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        publishedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async getLessonBySlug(slug: string, moduleId?: string) {
    return prisma.lesson.findFirst({
      where: moduleId ? { slug, moduleId } : { slug },
    });
  }

  static async getNextLessonOrder(moduleId: string) {
    const last = await prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  static async createLesson(data: {
    moduleId: string;
    title: string;
    slug: string;
    description: string;
    difficulty?: string;
    estimatedMinutes?: number;
    xpReward?: number;
    order?: number;
    createdById: string;
  }) {
    const order = data.order ?? (await this.getNextLessonOrder(data.moduleId));
    return prisma.lesson.create({
      data: {
        moduleId: data.moduleId,
        title: data.title,
        slug: data.slug,
        description: data.description,
        difficulty: data.difficulty ?? 'BEGINNER',
        estimatedMinutes: data.estimatedMinutes ?? 10,
        xpReward: data.xpReward ?? 20,
        order,
        status: ContentStatus.DRAFT,
        published: false,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  static async updateLesson(
    id: string,
    data: Prisma.LessonUpdateInput,
    updatedById: string
  ) {
    return prisma.lesson.update({
      where: { id },
      data: {
        ...data,
        updatedBy: { connect: { id: updatedById } },
      },
    });
  }

  /**
   * Transactional two-phase reorder for lessons
   */
  static async reorderLessons(items: { id: string; order: number }[]) {
    return prisma.$transaction(async (tx) => {
      // Phase 1: Set temporary negative order
      for (let i = 0; i < items.length; i++) {
        await tx.lesson.update({
          where: { id: items[i].id },
          data: { order: -(i + 1000) },
        });
      }
      // Phase 2: Set target order
      for (const item of items) {
        await tx.lesson.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }
    });
  }

  // ==========================================
  // SECTIONS
  // ==========================================

  static async getNextSectionOrder(lessonId: string) {
    const last = await prisma.lessonSection.findFirst({
      where: { lessonId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return (last?.order ?? 0) + 1;
  }

  static async createSection(data: Prisma.LessonSectionCreateInput) {
    return prisma.lessonSection.create({ data });
  }

  static async updateSection(id: string, data: Prisma.LessonSectionUpdateInput) {
    return prisma.lessonSection.update({
      where: { id },
      data,
    });
  }

  static async deleteSection(id: string) {
    return prisma.lessonSection.delete({ where: { id } });
  }

  /**
   * Transactional two-phase reorder for sections
   */
  static async reorderSections(items: { id: string; order: number }[]) {
    return prisma.$transaction(async (tx) => {
      // Phase 1: temporary negative orders
      for (let i = 0; i < items.length; i++) {
        await tx.lessonSection.update({
          where: { id: items[i].id },
          data: { order: -(i + 1000) },
        });
      }
      // Phase 2: target orders
      for (const item of items) {
        await tx.lessonSection.update({
          where: { id: item.id },
          data: { order: item.order },
        });
      }
    });
  }

  // ==========================================
  // QUIZZES & QUESTIONS
  // ==========================================

  static async listQuizzes(query: ContentQueryInput) {
    const where: Prisma.QuizWhereInput = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { lesson: { title: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              module: { select: { title: true, course: { select: { title: true } } } },
            },
          },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      prisma.quiz.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  static async getQuizByLessonId(lessonId: string) {
    return prisma.quiz.findUnique({
      where: { lessonId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
            _count: { select: { attemptAnswers: true } },
          },
        },
      },
    });
  }

  static async getQuizById(id: string) {
    return prisma.quiz.findUnique({
      where: { id },
      include: {
        lesson: { select: { id: true, title: true, slug: true, status: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
            _count: { select: { attemptAnswers: true } },
          },
        },
      },
    });
  }

  static async countQuestionAttemptAnswers(questionId: string) {
    return prisma.quizAttemptAnswer.count({
      where: { questionId },
    });
  }

  // ==========================================
  // CHORDS
  // ==========================================

  static async listChords(query: ContentQueryInput) {
    const where: Prisma.ChordWhereInput = {};
    if (query.status !== 'ALL') {
      where.status = query.status as ContentStatus;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    const [items, total] = await Promise.all([
      prisma.chord.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { sessionChords: true } },
        },
      }),
      prisma.chord.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  static async getChordById(id: string) {
    return prisma.chord.findUnique({
      where: { id },
      include: {
        _count: { select: { sessionChords: true } },
      },
    });
  }

  static async getChordBySlug(slug: string) {
    return prisma.chord.findUnique({ where: { slug } });
  }

  static async createChord(data: {
    name: string;
    slug: string;
    type: ChordType;
    difficulty?: string;
    notes: Prisma.InputJsonValue;
    diagramData: Prisma.InputJsonValue;
    description: string;
  }) {
    return prisma.chord.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
        difficulty: data.difficulty ?? 'BEGINNER',
        notes: data.notes,
        diagramData: data.diagramData,
        description: data.description,
        status: ContentStatus.PUBLISHED,
      },
    });
  }

  static async updateChord(id: string, data: Prisma.ChordUpdateInput) {
    return prisma.chord.update({
      where: { id },
      data,
    });
  }

  // ==========================================
  // ACHIEVEMENTS
  // ==========================================

  static async listAchievements(search?: string) {
    const where: Prisma.AchievementWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    return prisma.achievement.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { userAchievements: true } },
      },
    });
  }

  static async getAchievementById(id: string) {
    return prisma.achievement.findUnique({
      where: { id },
      include: {
        _count: { select: { userAchievements: true } },
      },
    });
  }

  static async createAchievement(data: {
    code: string;
    name: string;
    description: string;
    icon: string;
    conditionType: AchievementConditionType;
    conditionValue: number;
    xpReward?: number;
    active?: boolean;
  }) {
    return prisma.achievement.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        conditionType: data.conditionType,
        conditionValue: data.conditionValue,
        xpReward: data.xpReward ?? 50,
        active: data.active ?? true,
      },
    });
  }

  static async updateAchievement(id: string, data: Prisma.AchievementUpdateInput) {
    return prisma.achievement.update({
      where: { id },
      data,
    });
  }

  // ==========================================
  // REVISIONS
  // ==========================================

  static async getNextRevisionVersion(lessonId: string) {
    const last = await prisma.lessonRevision.findFirst({
      where: { lessonId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (last?.version ?? 0) + 1;
  }

  static async createRevision(data: {
    lessonId: string;
    version: number;
    snapshot: Prisma.InputJsonValue;
    createdById: string;
    publishedAt?: Date | null;
  }) {
    return prisma.lessonRevision.create({
      data: {
        lessonId: data.lessonId,
        version: data.version,
        snapshot: data.snapshot,
        createdById: data.createdById,
        publishedAt: data.publishedAt,
      },
    });
  }

  static async getRevisionById(id: string) {
    return prisma.lessonRevision.findUnique({
      where: { id },
      include: {
        lesson: { select: { id: true, title: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async listLessonRevisions(lessonId: string) {
    return prisma.lessonRevision.findMany({
      where: { lessonId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // ==========================================
  // CONTENT OVERVIEW METRICS
  // ==========================================

  static async getContentOverviewMetrics() {
    const [
      draftCourses,
      publishedCourses,
      archivedCourses,
      draftLessons,
      inReviewLessons,
      scheduledLessons,
      publishedLessons,
      archivedLessons,
      totalQuizzes,
      totalChords,
      totalAchievements,
      recentlyUpdatedLessons,
    ] = await Promise.all([
      prisma.course.count({ where: { status: ContentStatus.DRAFT } }),
      prisma.course.count({ where: { status: ContentStatus.PUBLISHED } }),
      prisma.course.count({ where: { status: ContentStatus.ARCHIVED } }),
      prisma.lesson.count({ where: { status: ContentStatus.DRAFT } }),
      prisma.lesson.count({ where: { status: ContentStatus.IN_REVIEW } }),
      prisma.lesson.count({ where: { status: ContentStatus.SCHEDULED } }),
      prisma.lesson.count({ where: { status: ContentStatus.PUBLISHED } }),
      prisma.lesson.count({ where: { status: ContentStatus.ARCHIVED } }),
      prisma.quiz.count(),
      prisma.chord.count(),
      prisma.achievement.count(),
      prisma.lesson.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          updatedAt: true,
          updatedBy: { select: { name: true, email: true } },
        },
      }),
    ]);

    return {
      courses: {
        draft: draftCourses,
        published: publishedCourses,
        archived: archivedCourses,
      },
      lessons: {
        draft: draftLessons,
        inReview: inReviewLessons,
        scheduled: scheduledLessons,
        published: publishedLessons,
        archived: archivedLessons,
      },
      totals: {
        quizzes: totalQuizzes,
        chords: totalChords,
        achievements: totalAchievements,
      },
      recentlyUpdatedLessons,
    };
  }
}
