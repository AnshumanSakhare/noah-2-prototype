// Recap/concept card content
export interface MathTopicContent {
  topicId: string;          // e.g. "kg-comparing-numbers"
  grade: string;            // e.g. "KG", "G3", "G7"
  name: string;             // e.g. "Comparing Numbers"
  icon: string;             // e.g. "⚖️"
  recap: {
    title: string;
    sub: string;
    text: string;           // HTML-safe rich text
  };
  flashcard: {
    front: string;
    back: string;           // HTML-safe
  };
  sandbox: {
    type: string;           // "balance-scale" | "pizza-slicer" | "pythagoras-proof"
    caption: string;
  };
  motivational: string;
}

// Re-export the same question types from the Science layer
// so Math questions are type-compatible with HomeworkStep
export type { MCQQuestion, FillQuestion, BlanksQuestion, DragQuestion, Question } from '../questions';

// Per-topic data bundle
export interface MathTopicBundle {
  content: MathTopicContent;
  questions: import('../questions').Question[];
}
