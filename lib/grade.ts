/**
 * Grade helpers shared between the homework builder (which uses labels like
 * "KG", "G1".."G8") and the DB (which stores grade as an integer 0..8).
 */

/** "KG"/"K"/"G3"/"3"/"Grade 3" → 3 (KG → 0). Returns null if unrecognized. */
export function mathGradeToInt(grade: unknown): number | null {
  if (grade === null || grade === undefined || grade === "") return null;
  const g = String(grade).trim().toUpperCase();
  if (g === "KG" || g === "K") return 0;
  const m = g.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 0 && n <= 8 ? n : null;
}

/** 0 → "KG", 3 → "G3". */
export function intToMathGrade(grade: number): string {
  return grade === 0 ? "KG" : `G${grade}`;
}
