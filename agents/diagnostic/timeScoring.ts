const DEFAULT_SLOW_CORRECT_THRESHOLD_MS = 50_000;

const DIFFICULTY_SLOW_CORRECT_THRESHOLDS_MS: Record<string, number> = {
  easy: 45_000,
  medium: 55_000,
  hard: 70_000,
};

export function getSlowCorrectThresholdMs(difficultyLevel?: string) {
  const normalizedDifficulty = difficultyLevel?.trim().toLowerCase();
  if (!normalizedDifficulty) return DEFAULT_SLOW_CORRECT_THRESHOLD_MS;
  return (
    DIFFICULTY_SLOW_CORRECT_THRESHOLDS_MS[normalizedDifficulty] ??
    DEFAULT_SLOW_CORRECT_THRESHOLD_MS
  );
}

export function getCorrectQuestionPoints(
  timeTakenMs?: number,
  difficultyLevel?: string,
) {
  return (timeTakenMs ?? 0) > getSlowCorrectThresholdMs(difficultyLevel)
    ? 0.9
    : 1;
}
