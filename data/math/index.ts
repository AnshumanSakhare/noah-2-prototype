import { MathTopicBundle } from './types';
import { comparingNumbersBundle } from './comparing-numbers';
import { introFractionsBundle } from './intro-fractions';
import { pythagorasBundle } from './pythagoras';

const registry: Record<string, MathTopicBundle> = {
  'kg-comparing-numbers': comparingNumbersBundle,
  'g3-intro-fractions': introFractionsBundle,
  'g7-pythagoras': pythagorasBundle,
};

/** Fetch a math topic bundle by its topicId */
export function getMathTopicBundle(topicId: string): MathTopicBundle | null {
  return registry[topicId] ?? null;
}

/** Get all registered math topic IDs */
export function getAllMathTopicIds(): string[] {
  return Object.keys(registry);
}

export type { MathTopicBundle, MathTopicContent } from './types';
