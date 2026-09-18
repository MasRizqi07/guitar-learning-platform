import { prisma } from '@/lib/db';

export class QuizRepository {
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
          },
        },
      },
    });
  }

  static async getQuizById(quizId: string) {
    return prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        lesson: {
          select: { id: true, title: true, slug: true, order: true },
        },
        questions: {
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  static async createAttempt(userId: string, quizId: string, totalQuestions: number) {
    return prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        totalQuestions,
        startedAt: new Date(),
      },
    });
  }

  static async getAttempt(attemptId: string) {
    return prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });
  }

  static async getUserAttempts(userId: string, quizId: string) {
    return prisma.quizAttempt.findMany({
      where: { userId, quizId },
      orderBy: { createdAt: 'desc' },
      include: {
        answers: true,
      },
    });
  }
}
