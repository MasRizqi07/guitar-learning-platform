import { CurriculumRepository } from '@/repositories/curriculum.repository';
import { UserRepository } from '@/repositories/user.repository';
import { determineLessonAvailability, isLessonAccessible, LessonAvailabilityStatus } from '@/domain/availability';
import { calculateLessonProgress } from '@/domain/progress-calculator';
import { AppError } from '@/lib/errors';
import { LessonProgressStatus } from '@prisma/client';

export class CurriculumService {
  static async getLearningPath(userId: string, courseId?: string) {
    const [course, progressMap, onboarding] = await Promise.all([
      CurriculumRepository.getMainCourse(courseId),
      CurriculumRepository.getUserProgressMap(userId),
      UserRepository.getOnboarding(userId),
    ]);

    if (!course) {
      throw AppError.notFound('LESSON_NOT_FOUND', 'Course curriculum not found');
    }

    // Determine starting lesson order from placement
    let startingLessonOrder = 1;
    if (onboarding?.recommendedLevel) {
      switch (onboarding.recommendedLevel) {
        case 'BEGINNER_2':
          startingLessonOrder = 6;
          break;
        case 'BEGINNER_3':
          startingLessonOrder = 11;
          break;
        case 'INTERMEDIATE_1':
          startingLessonOrder = 16;
          break;
        case 'BEGINNER_1':
        default:
          startingLessonOrder = 1;
          break;
      }
    }

    // Build sets of user completed and in-progress lesson orders
    const userCompletedLessonOrders = new Set<number>();
    const inProgressLessonOrders = new Set<number>();

    for (const mod of course.modules) {
      for (const les of mod.lessons) {
        const prog = progressMap.get(les.id);
        if (prog?.status === 'COMPLETED') {
          userCompletedLessonOrders.add(les.order);
        } else if (prog?.status === 'IN_PROGRESS') {
          inProgressLessonOrders.add(les.order);
        }
      }
    }

    // Map course with dynamic availability status
    let totalLessonsCount = 0;
    let completedLessonsCount = 0;

    const modulesWithAvailability = course.modules.map((mod) => {
      let moduleCompleted = 0;

      const lessonsWithStatus = mod.lessons.map((les) => {
        totalLessonsCount++;
        const prog = progressMap.get(les.id);
        const status = determineLessonAvailability({
          lessonOrder: les.order,
          userCompletedLessonOrders,
          userStartingLessonOrder: startingLessonOrder,
          inProgressLessonOrders,
        });

        if (status === 'COMPLETED') {
          completedLessonsCount++;
          moduleCompleted++;
        }

        return {
          id: les.id,
          title: les.title,
          slug: les.slug,
          description: les.description,
          difficulty: les.difficulty,
          estimatedMinutes: les.estimatedMinutes,
          xpReward: les.xpReward,
          order: les.order,
          availability: status,
          progress: prog
            ? {
                status: prog.status,
                progressPercentage: prog.progressPercentage,
                currentSectionOrder: prog.currentSectionOrder,
              }
            : null,
        };
      });

      const moduleProgressPercent = Math.round(
        (moduleCompleted / (mod.lessons.length || 1)) * 100
      );

      return {
        id: mod.id,
        title: mod.title,
        slug: mod.slug,
        description: mod.description,
        order: mod.order,
        estimatedMinutes: mod.estimatedMinutes,
        progressPercentage: moduleProgressPercent,
        lessons: lessonsWithStatus,
      };
    });

    const overallProgressPercent = Math.round(
      (completedLessonsCount / (totalLessonsCount || 1)) * 100
    );

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        totalLessons: totalLessonsCount,
        completedLessons: completedLessonsCount,
        progressPercentage: overallProgressPercent,
      },
      modules: modulesWithAvailability,
    };
  }

  static async getLessonBySlug(userId: string, slug: string) {
    const lesson = await CurriculumRepository.getLessonBySlug(slug);
    if (!lesson) {
      throw AppError.notFound('LESSON_NOT_FOUND', 'Lesson not found');
    }

    // Check availability within this lesson's course
    const learningPath = await this.getLearningPath(userId, lesson.module.course.id);
    let availabilityStatus = 'LOCKED';

    for (const mod of learningPath.modules) {
      const found = mod.lessons.find((l) => l.id === lesson.id);
      if (found) {
        availabilityStatus = found.availability;
        break;
      }
    }

    if (!isLessonAccessible(availabilityStatus as LessonAvailabilityStatus)) {
      throw AppError.forbidden('This lesson is currently locked. Complete the previous lessons first.');
    }

    // Load or initialize progress
    let progress = await CurriculumRepository.getSingleLessonProgress(userId, lesson.id);
    if (!progress) {
      progress = await CurriculumRepository.upsertProgress({
        userId,
        lessonId: lesson.id,
        status: LessonProgressStatus.IN_PROGRESS,
        currentSectionOrder: 1,
        progressPercentage: 0,
        startedAt: new Date(),
      });
    }

    return {
      lesson: {
        id: lesson.id,
        title: lesson.title,
        slug: lesson.slug,
        description: lesson.description,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimatedMinutes,
        xpReward: lesson.xpReward,
        order: lesson.order,
        module: lesson.module,
        sections: lesson.sections,
        quiz: lesson.quiz,
      },
      progress: {
        status: progress.status,
        currentSectionOrder: progress.currentSectionOrder,
        progressPercentage: progress.progressPercentage,
      },
      availability: availabilityStatus,
    };
  }

  static async updateProgress(userId: string, lessonId: string, currentSectionOrder: number) {
    const lesson = await CurriculumRepository.getLessonById(lessonId);
    if (!lesson) {
      throw AppError.notFound('LESSON_NOT_FOUND', 'Lesson not found');
    }

    const currentProgress = await CurriculumRepository.getSingleLessonProgress(userId, lessonId);
    if (currentProgress?.status === LessonProgressStatus.COMPLETED) {
      return currentProgress; // Do not downgrade completed lesson
    }

    const requiredSections = lesson.sections.filter((s) => s.required);
    const progressPercentage = calculateLessonProgress(
      currentSectionOrder,
      requiredSections.length || 1
    );

    const updated = await CurriculumRepository.upsertProgress({
      userId,
      lessonId,
      status: LessonProgressStatus.IN_PROGRESS,
      currentSectionOrder,
      progressPercentage,
    });

    return updated;
  }
}
