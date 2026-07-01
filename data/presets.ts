export interface Preset {
  id: string;
  name: string;
  icon: string;
  description: string;
  config: {
    diff: 'easy' | 'medium' | 'hard' | 'adaptive';
    length: number;
    format: 'journey' | 'questions';
    type: 'general' | 'specific';
  };
}

export const presets: Preset[] = [
  // Teacher Presets (Class-wide assignments)
  {
    id: 'quick-check',
    name: 'Quick 3-Q Check',
    icon: '⚡',
    description: '3 adaptive questions in an interactive journey. Great for a fast post-class pulse.',
    config: { diff: 'adaptive', length: 3, format: 'journey', type: 'general' }
  },
  {
    id: 'deep-dive',
    name: 'Deep Dive 10-Q Session',
    icon: '🏋️',
    description: '10 hard questions with complete learning guides. Perfect for deep homework.',
    config: { diff: 'hard', length: 10, format: 'journey', type: 'general' }
  },
  {
    id: 'revision-sprint',
    name: 'Revision Sprint',
    icon: '🏃',
    description: '5 medium questions only, skipping recaps. Ideal for exam practice.',
    config: { diff: 'medium', length: 5, format: 'questions', type: 'general' }
  },
  {
    id: 'warmup',
    name: 'Pre-class Warmup',
    icon: '🌅',
    description: '3 easy questions with recaps. Good for refreshing memory before next class.',
    config: { diff: 'easy', length: 3, format: 'journey', type: 'general' }
  },
  {
    id: 'class-challenge',
    name: 'Classroom Challenge',
    icon: '🏆',
    description: '6 hard questions, skipping recaps. Pushes student comprehension boundaries.',
    config: { diff: 'hard', length: 6, format: 'questions', type: 'general' }
  },
  // Student Presets (Personalized Remedial assignments via Profile Agent)
  {
    id: 'weakness-recovery',
    name: 'Weakness Recovery',
    icon: '🎯',
    description: '4 medium questions targeting student weak areas. Built via Profile Agent.',
    config: { diff: 'medium', length: 4, format: 'journey', type: 'specific' }
  },
  {
    id: 'concept-reinforcer',
    name: 'Concept Reinforcer',
    icon: '🧱',
    description: '3 easy questions with full guide cards. Solidifies weak topics from memories.',
    config: { diff: 'easy', length: 3, format: 'journey', type: 'specific' }
  },
  {
    id: 'mastery-recovery',
    name: 'Mastery Recovery',
    icon: '👑',
    description: '5 hard questions targeting weak topics to force high-level comprehension.',
    config: { diff: 'hard', length: 5, format: 'journey', type: 'specific' }
  },
  {
    id: 'adaptive-remedial',
    name: 'Adaptive Remediation',
    icon: '🔬',
    description: '5 adaptive questions focused entirely on the student\'s weakest areas.',
    config: { diff: 'adaptive', length: 5, format: 'journey', type: 'specific' }
  },
  {
    id: 'quick-refresher',
    name: 'Quick Refresher',
    icon: '⏱️',
    description: '2 adaptive questions on weak topics. Fast Mastery check for students.',
    config: { diff: 'adaptive', length: 2, format: 'questions', type: 'specific' }
  }
];
