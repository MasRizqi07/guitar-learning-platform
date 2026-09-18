export type LessonAvailabilityStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

export interface LessonProgressionContext {
  lessonOrder: number;
  userCompletedLessonOrders: Set<number>;
  userStartingLessonOrder?: number;
  inProgressLessonOrders?: Set<number>;
}

/**
 * Determines whether a lesson is available to the user based on prerequisite completion or placement starting order.
 */
export function determineLessonAvailability(context: LessonProgressionContext): LessonAvailabilityStatus {
  const {
    lessonOrder,
    userCompletedLessonOrders,
    userStartingLessonOrder = 1,
    inProgressLessonOrders = new Set(),
  } = context;

  // If already completed
  if (userCompletedLessonOrders.has(lessonOrder)) {
    return 'COMPLETED';
  }

  // If already in progress
  if (inProgressLessonOrders.has(lessonOrder)) {
    return 'IN_PROGRESS';
  }

  // First lesson or up to user's placement starting level is always available
  if (lessonOrder <= userStartingLessonOrder) {
    return 'AVAILABLE';
  }

  // Otherwise, available only if previous consecutive lesson is completed
  const previousLessonOrder = lessonOrder - 1;
  if (userCompletedLessonOrders.has(previousLessonOrder)) {
    return 'AVAILABLE';
  }

  return 'LOCKED';
}

export function isLessonAccessible(status: LessonAvailabilityStatus): boolean {
  return status !== 'LOCKED';
}
