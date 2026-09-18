import { prisma } from '@/lib/db';
import { PracticeType, PracticeDifficulty } from '@prisma/client';
import { getFormattedDateInTimezone } from '@/domain/streak';

export class PracticeRepository {
  static async createSession(data: {
    userId: string;
    lessonId?: string | null;
    practiceType: PracticeType;
    durationSeconds: number;
    difficultyFeedback?: PracticeDifficulty | null;
    isValid: boolean;
    completedAt?: Date | null;
    chordIds?: string[];
  }) {
    return prisma.practiceSession.create({
      data: {
        userId: data.userId,
        lessonId: data.lessonId ?? null,
        practiceType: data.practiceType,
        durationSeconds: data.durationSeconds,
        difficultyFeedback: data.difficultyFeedback ?? null,
        isValid: data.isValid,
        completedAt: data.completedAt ?? null,
        sessionChords: data.chordIds?.length
          ? {
              create: data.chordIds.map((chordId) => ({ chordId })),
            }
          : undefined,
      },
      include: {
        sessionChords: {
          include: { chord: true },
        },
      },
    });
  }

  static async getUserSessions(userId: string, limit = 20) {
    return prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sessionChords: {
          include: { chord: true },
        },
        lesson: {
          select: { id: true, title: true, order: true },
        },
      },
    });
  }

  static async getTodayValidPracticeMinutes(userId: string, timezone = 'Asia/Jakarta'): Promise<number> {
    const todayStr = getFormattedDateInTimezone(new Date(), timezone);

    // Fetch user's valid sessions
    const sessions = await prisma.practiceSession.findMany({
      where: {
        userId,
        isValid: true,
        completedAt: { not: null },
      },
      select: {
        durationSeconds: true,
        completedAt: true,
      },
    });

    // Filter sessions that occurred on today's calendar day in user timezone
    let totalSeconds = 0;
    for (const s of sessions) {
      if (s.completedAt) {
        const sessionDateStr = getFormattedDateInTimezone(s.completedAt, timezone);
        if (sessionDateStr === todayStr) {
          totalSeconds += s.durationSeconds;
        }
      }
    }

    return Math.round(totalSeconds / 60);
  }
}
