export const XP_PER_LEVEL = 500;

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
