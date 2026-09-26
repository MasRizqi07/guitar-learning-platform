import { prisma } from '@/lib/db';
import { LessonProgressStatus } from '@prisma/client';

export class CurriculumRepository {
  static async getMainCourse(courseId?: string) {
    return prisma.course.findFirst({
      where: courseId ? { id: courseId, published: true } : { published: true },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { published: true },
              orderBy: { order: 'asc' },
              include: {
                sections: {
                  orderBy: { order: 'asc' },
                },
                quiz: {
                  select: {
                    id: true,
                    title: true,
                    passingScore: true,
                    xpReward: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  static async getLessonBySlug(slug: string) {
    return prisma.lesson.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        published: true,
      },
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
                  select: {
                    id: true,
                    text: true,
                    order: true,
                    // Security rule: isCorrect is NOT selected here for client delivery!
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  static async getLessonById(lessonId: string) {
    return prisma.lesson.findFirst({
      where: {
        OR: [{ id: lessonId }, { slug: lessonId }],
      },
      include: {
        sections: {
          orderBy: { order: 'asc' },
        },
        quiz: true,
      },
    });
  }

  static async getUserProgressMap(userId: string) {
    const progressList = await prisma.lessonProgress.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, (typeof progressList)[0]>();
    for (const p of progressList) {
      progressMap.set(p.lessonId, p);
    }
    return progressMap;
  }

  static async getSingleLessonProgress(userId: string, lessonId: string) {
    return prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });
  }

  static async upsertProgress(data: {
    userId: string;
    lessonId: string;
    status: LessonProgressStatus;
    currentSectionOrder: number;
    progressPercentage: number;
    startedAt?: Date;
    completedAt?: Date;
  }) {
    return prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: data.userId,
          lessonId: data.lessonId,
        },
      },
      update: {
        status: data.status,
        currentSectionOrder: data.currentSectionOrder,
        progressPercentage: data.progressPercentage,
        lastAccessedAt: new Date(),
        completedAt: data.completedAt,
      },
      create: {
        userId: data.userId,
        lessonId: data.lessonId,
        status: data.status,
        currentSectionOrder: data.currentSectionOrder,
        progressPercentage: data.progressPercentage,
        startedAt: data.startedAt ?? new Date(),
        lastAccessedAt: new Date(),
        completedAt: data.completedAt,
      },
    });
  }
}
