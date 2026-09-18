import { LEVEL_THRESHOLDS } from '@/config/constants';

export interface LevelInfo {
  level: number;
  currentXP: number;
  currentLevelMinXP: number;
  nextLevelXP: number;
  progressPercent: number;
}

export function calculateLevel(totalXP: number): LevelInfo {
  const xp = Math.max(0, totalXP);

  let currentLevel: number = 1;
  let currentMin: number = 0;
  let nextMax: number = LEVEL_THRESHOLDS[1].minXP;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].minXP) {
      currentLevel = LEVEL_THRESHOLDS[i].level;
      currentMin = LEVEL_THRESHOLDS[i].minXP;
      nextMax = LEVEL_THRESHOLDS[i + 1]?.minXP ?? currentMin + 1000;
      break;
    }
  }

  const xpInCurrentLevel = xp - currentMin;
  const xpNeededForNext = nextMax - currentMin;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  return {
    level: currentLevel,
    currentXP: xp,
    currentLevelMinXP: currentMin,
    nextLevelXP: nextMax,
    progressPercent,
  };
}
