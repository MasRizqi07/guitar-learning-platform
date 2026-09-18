export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  streakIncremented: boolean;
}

/**
 * Gets the current date formatted as YYYY-MM-DD in the specified timezone (default 'Asia/Jakarta').
 */
export function getFormattedDateInTimezone(date: Date = new Date(), timezone = 'Asia/Jakarta'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    // Fallback if timezone string is invalid
    return date.toISOString().split('T')[0];
  }
}

/**
 * Calculates updated streak counters based on calendar day in user's timezone.
 */
export function calculateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActiveDate: string | Date | null,
  userTimezone = 'Asia/Jakarta',
  now: Date = new Date()
): StreakUpdateResult {
  const todayStr = getFormattedDateInTimezone(now, userTimezone);

  if (!lastActiveDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastActiveDate: todayStr,
      streakIncremented: true,
    };
  }

  const lastActiveStr =
    typeof lastActiveDate === 'string'
      ? lastActiveDate.split('T')[0]
      : getFormattedDateInTimezone(lastActiveDate, userTimezone);

  // If already active today, streak is unchanged
  if (lastActiveStr === todayStr) {
    return {
      currentStreak,
      longestStreak,
      lastActiveDate: todayStr,
      streakIncremented: false,
    };
  }

  // Calculate yesterday in user's timezone
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getFormattedDateInTimezone(yesterday, userTimezone);

  let newCurrentStreak: number;
  if (lastActiveStr === yesterdayStr) {
    // Consecutive day
    newCurrentStreak = currentStreak + 1;
  } else {
    // Streak broken
    newCurrentStreak = 1;
  }

  const newLongestStreak = Math.max(longestStreak, newCurrentStreak);

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    lastActiveDate: todayStr,
    streakIncremented: true,
  };
}
