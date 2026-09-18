import { prisma } from '@/lib/db';
import { UserRepository } from '@/repositories/user.repository';
import { CurriculumService } from './curriculum.service';
import { PracticeRepository } from '@/repositories/practice.repository';
import { calculateLevel } from '@/domain/level';
import { AppError } from '@/lib/errors';

export class DashboardService {
  static async getDashboardData(userId: string) {
    const [user, profile, onboarding, learningPath, recentActivities] = await Promise.all([
      UserRepository.findById(userId),
      UserRepository.getProfile(userId),
      UserRepository.getOnboarding(userId),
      CurriculumService.getLearningPath(userId),
      prisma.learningActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ]);

    if (!user || !profile) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found');
    }

    // 1. Level Calculation
    const levelInfo = calculateLevel(profile.totalXP);

    // 2. Daily Goal Progress
    const todayMinutes = await PracticeRepository.getTodayValidPracticeMinutes(
      userId,
      profile.timezone
    );
    const dailyGoalMinutes = onboarding?.dailyGoalMinutes || 15;
    const goalPercentage = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));
    const goalMet = todayMinutes >= dailyGoalMinutes;

    // 3. Determine "One Clear Next Action"
    let nextAction: {
      type: 'CONTINUE_LESSON' | 'START_LESSON' | 'PRACTICE' | 'REVIEW';
      title: string;
      subtitle: string;
      href: string;
      buttonText: string;
      badge: string;
    };

    // Find first in-progress lesson
    let activeLesson: { slug: string; title: string; order: number; progressPercentage: number } | null = null;
    let nextAvailableLesson: { slug: string; title: string; order: number } | null = null;

    for (const mod of learningPath.modules) {
      for (const les of mod.lessons) {
        if (les.availability === 'IN_PROGRESS' && !activeLesson) {
          activeLesson = {
            slug: les.slug,
            title: les.title,
            order: les.order,
            progressPercentage: les.progress?.progressPercentage || 0,
          };
          break;
        }
        if (les.availability === 'AVAILABLE' && !nextAvailableLesson && !activeLesson) {
          nextAvailableLesson = {
            slug: les.slug,
            title: les.title,
            order: les.order,
          };
        }
      }
      if (activeLesson) break;
    }

    if (activeLesson) {
      nextAction = {
        type: 'CONTINUE_LESSON',
        title: activeLesson.title,
        subtitle: `Resume Lesson #${activeLesson.order} (${activeLesson.progressPercentage}% complete)`,
        href: `/lessons/${activeLesson.slug}`,
        buttonText: 'Resume Lesson →',
        badge: 'In Progress',
      };
    } else if (nextAvailableLesson) {
      nextAction = {
        type: 'START_LESSON',
        title: nextAvailableLesson.title,
        subtitle: `Lesson #${nextAvailableLesson.order} is unlocked and ready`,
        href: `/lessons/${nextAvailableLesson.slug}`,
        buttonText: 'Start Lesson →',
        badge: 'Up Next',
      };
    } else if (!goalMet) {
      nextAction = {
        type: 'PRACTICE',
        title: 'Daily Practice Goal',
        subtitle: `${dailyGoalMinutes - todayMinutes} minutes remaining to reach your goal today`,
        href: '/practice',
        buttonText: 'Start Practice Room →',
        badge: 'Daily Habit',
      };
    } else {
      nextAction = {
        type: 'REVIEW',
        title: 'Roadmap Milestone Reached!',
        subtitle: 'Review completed lessons or explore the chord library',
        href: '/learn',
        buttonText: 'Explore Curriculum →',
        badge: 'All Caught Up',
      };
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      profile: {
        totalXP: profile.totalXP,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        timezone: profile.timezone,
        level: levelInfo,
      },
      dailyGoal: {
        todayMinutes,
        dailyGoalMinutes,
        goalPercentage,
        goalMet,
      },
      nextAction,
      courseProgress: {
        title: learningPath.course.title,
        slug: learningPath.course.slug,
        totalLessons: learningPath.course.totalLessons,
        completedLessons: learningPath.course.completedLessons,
        progressPercentage: learningPath.course.progressPercentage,
      },
      recentActivities: recentActivities.map((act) => ({
        id: act.id,
        type: act.type,
        createdAt: act.createdAt,
        metadata: act.metadata,
      })),
    };
  }
}
