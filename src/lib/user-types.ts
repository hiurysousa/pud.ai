export const XP_PER_LEVEL = 500;

export const QUIZ_LEVELS = ['iniciante', 'intermediário', 'avançado'] as const;

export type QuizLevel = (typeof QUIZ_LEVELS)[number];

const QUIZ_REWARDS: Record<QuizLevel, { xpPerCorrect: number; progressOnPass: number }> = {
  iniciante: { xpPerCorrect: 5, progressOnPass: 5 },
  intermediário: { xpPerCorrect: 10, progressOnPass: 10 },
  avançado: { xpPerCorrect: 15, progressOnPass: 15 },
};

export type Disciplina = {
  id: string;
  nome: string;
  progresso: number;
};

export type UserProfile = {
  displayName: string;
  email: string;
  xp: number;
  badges: string[];
};

export type RankingEntry = {
  id: string;
  displayName: string;
  xp: number;
};

export function getLevel(xp: number) {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function getLevelProgress(xp: number) {
  const safeXp = Math.max(0, xp);
  const currentLevelXp = safeXp % XP_PER_LEVEL;

  return {
    currentLevelXp,
    percent: (currentLevelXp / XP_PER_LEVEL) * 100,
    xpToNextLevel: XP_PER_LEVEL - currentLevelXp,
  };
}

export function getQuizReward(level: QuizLevel, correctAnswers: number) {
  const score = Math.max(0, Math.min(10, Math.round(correctAnswers)));
  const config = QUIZ_REWARDS[level];
  const passed = score >= 7;

  return {
    passed,
    xpEarned: score * config.xpPerCorrect,
    progressEarned: passed ? config.progressOnPass : 0,
  };
}
