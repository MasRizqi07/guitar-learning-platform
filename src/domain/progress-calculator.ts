export function calculateLessonProgress(
  completedRequiredSections: number,
  totalRequiredSections: number
): number {
  if (totalRequiredSections <= 0) return 100;
  if (completedRequiredSections <= 0) return 0;
  const percent = Math.round((completedRequiredSections / totalRequiredSections) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function calculateModuleProgress(
  completedLessons: number,
  totalLessons: number
): number {
  if (totalLessons <= 0) return 0;
  if (completedLessons <= 0) return 0;
  const percent = Math.round((completedLessons / totalLessons) * 100);
  return Math.min(100, Math.max(0, percent));
}

export function calculateCourseProgress(
  completedCourseLessons: number,
  totalCourseLessons: number
): number {
  if (totalCourseLessons <= 0) return 0;
  if (completedCourseLessons <= 0) return 0;
  const percent = Math.round((completedCourseLessons / totalCourseLessons) * 100);
  return Math.min(100, Math.max(0, percent));
}
