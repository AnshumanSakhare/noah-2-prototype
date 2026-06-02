"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Student } from '../../data/students';
import { Question } from '../../data/questions';
import { Topic, learningOutcomes } from '../../data/topics';
import { getMathTopicBundle } from '../../data/math';

export interface BuilderState {
  subject: string;
  type: 'general' | 'specific';
  student: string | null;
  manual: boolean;
  topics: string[];
  diff: 'easy' | 'medium' | 'hard' | 'adaptive';
  length: number;
  format: 'journey' | 'questions';
}

export type StepType = 
  | 'topic-intro' 
  | 'recap' 
  | 'math-concept'
  | 'math-recap'
  | 'math-example'
  | 'flashcard' 
  | 'animation' 
  | 'topic-complete' 
  | 'mcq' 
  | 'fill' 
  | 'blanks' 
  | 'drag'
  | 'game-tap'
  | 'game-compare'
  | 'game-sort';

export interface HomeworkStep {
  type: StepType;
  topic?: string;
  lo?: Topic;
  isQuestion: boolean;
  topicIdx?: number;
  totalTopics?: number;
  motivational?: string;
  isLast?: boolean;
  
  // MCQ
  text?: string;
  options?: string[];
  correct?: number;
  explanation?: string;

  // Fill
  unit?: string;
  answer?: string;
  hint?: string;

  // Blanks
  sentence?: string;
  answers?: string[];
  wordBank?: string[];

  // Drag
  pairs?: Array<{ item: string; zone: string }>;

  // KG Game Tap
  numberA?: number;
  numberB?: number;
  correctSide?: 'A' | 'B';
  hideNumbers?: boolean;

  // KG Game Compare
  correctSymbol?: '>' | '<' | '=';

  // KG Game Sort
  numbers?: number[];
  correctOrder?: number[];

  // Recap
  content?: {
    title: string;
    sub: string;
    text: string;
    type?: 'cart' | 'ball';
    caption?: string;
    front?: string;
    back?: string;
  };
}

export interface HomeworkAnswer {
  type: 'content' | 'mcq' | 'fill' | 'blanks' | 'drag' | 'game-tap' | 'game-compare' | 'game-sort';
  viewed?: boolean;
  answer?: any; // MCQ: number, Fill: string, Game: side / symbol / order
  filledBlanks?: Array<string | null>; // Blanks
  placements?: Record<string, string>; // Drag
  correct: boolean;
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  topicSummary: string;
  subject: string;
  length: number;
  steps: HomeworkStep[];
  isCustom?: boolean;
  isCompleted?: boolean;
}

export interface HomeworkContextType {
  builderState: BuilderState;
  setBuilderState: React.Dispatch<React.SetStateAction<BuilderState>>;
  homeworkSteps: HomeworkStep[];
  setHomeworkSteps: React.Dispatch<React.SetStateAction<HomeworkStep[]>>;
  assignments: HomeworkAssignment[];
  setAssignments: React.Dispatch<React.SetStateAction<HomeworkAssignment[]>>;
  activeAssignmentId: string | null;
  setActiveAssignmentId: React.Dispatch<React.SetStateAction<string | null>>;
  hwAnswers: Record<number, HomeworkAnswer>;
  setHwAnswers: React.Dispatch<React.SetStateAction<Record<number, HomeworkAnswer>>>;
  hwIndex: number;
  setHwIndex: React.Dispatch<React.SetStateAction<number>>;
  hwElapsed: number;
  setHwElapsed: React.Dispatch<React.SetStateAction<number>>;
  streak: number;
  setStreak: React.Dispatch<React.SetStateAction<number>>;
  isCompleted: boolean;
  setIsCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  agentReady: boolean;
  setAgentReady: React.Dispatch<React.SetStateAction<boolean>>;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  streakToastMessage: string | null;
  showStreakToast: (streakNum: number) => void;
  resetHomework: () => void;
  hwStartTime: number | null;
  setHwStartTime: React.Dispatch<React.SetStateAction<number | null>>;
  eventLog: any[];
  logEvent: (e: any) => void;
  selectAssignment: (id: string) => void;
  selectedMathGrade: string;
  setSelectedMathGrade: React.Dispatch<React.SetStateAction<string>>;
}

export function getTopicName(step: HomeworkStep): string {
  if (step.lo?.name) return step.lo.name;
  if (step.topic) {
    const mathBundle = getMathTopicBundle(step.topic);
    if (mathBundle) return mathBundle.content.name;

    const sciLo = learningOutcomes.find(l => l.id === step.topic);
    if (sciLo) return sciLo.name;
  }
  return step.topic || "General";
}

const defaultDemoAssignments: HomeworkAssignment[] = [
  {
    id: 'demo1',
    title: 'Newtonian Physics Jumpstart',
    topicSummary: "Newton's Three Laws & Force-Mass-Acceleration physics",
    subject: 'science',
    length: 5,
    isCustom: false,
    isCompleted: false,
    steps: [
      {
        type: 'topic-intro',
        topic: 'lo1',
        lo: { id: 'lo1', name: "Newton's Three Laws", short: "The 3 Laws" },
        isQuestion: false,
        topicIdx: 0,
        totalTopics: 2,
        motivational: "Let's start with the big picture! 🌟"
      },
      {
        type: 'recap',
        topic: 'lo1',
        lo: { id: 'lo1', name: "Newton's Three Laws", short: "The 3 Laws" },
        isQuestion: false,
        content: {
          title: "Newton's Three Laws",
          sub: "30-second recap",
          text: "Newton described three fundamental laws that govern how objects move. The <strong>First Law (Inertia)</strong> says objects stay at rest or keep moving unless a force acts on them. The <strong>Second Law (F = ma)</strong> connects force, mass and acceleration. The <strong>Third Law</strong> says every action has an <strong>equal and opposite reaction</strong>."
        }
      },
      {
        type: 'flashcard',
        topic: 'lo1',
        lo: { id: 'lo1', name: "Newton's Three Laws", short: "The 3 Laws" },
        isQuestion: false,
        content: {
          title: "Newton's Three Laws",
          sub: 'Concept self-test card',
          text: '',
          front: "Can you name all three of Newton's Laws and what each one is about?",
          back: "<strong>1st Law:</strong> Inertia — objects resist changes in motion<br><strong>2nd Law:</strong> F = ma — force equals mass × acceleration<br><strong>3rd Law:</strong> Action–Reaction — equal and opposite forces"
        }
      },
      {
        type: 'mcq',
        topic: 'lo1',
        lo: { id: 'lo1', name: "Newton's Three Laws", short: "The 3 Laws" },
        isQuestion: true,
        text: "Which of Newton's laws says an object at rest stays at rest unless a force acts on it?",
        options: ["First Law", "Second Law", "Third Law", "Law of Gravity"],
        correct: 0,
        explanation: "The answer is First Law because inertia is about resisting change in motion, not about force pairs."
      },
      {
        type: 'topic-complete',
        topic: 'lo1',
        lo: { id: 'lo1', name: "Newton's Three Laws", short: "The 3 Laws" },
        isQuestion: false,
        topicIdx: 0,
        totalTopics: 2,
        isLast: false
      },
      {
        type: 'topic-intro',
        topic: 'lo2',
        lo: { id: 'lo2', name: "Force = mass × acceleration", short: "F = ma" },
        isQuestion: false,
        topicIdx: 1,
        totalTopics: 2,
        motivational: "Time to crunch some numbers! 🔢"
      },
      {
        type: 'recap',
        topic: 'lo2',
        lo: { id: 'lo2', name: "Force = mass × acceleration", short: "F = ma" },
        isQuestion: false,
        content: {
          title: "Force = mass × acceleration",
          sub: "The math behind motion",
          text: "Force equals mass times acceleration (<strong>F = ma</strong>). This means a bigger force creates more acceleration, and a heavier object needs more force to accelerate the same amount. If you <strong>double the force</strong>, acceleration doubles. If you <strong>double the mass</strong>, acceleration halves.",
          type: 'cart',
          caption: "A push (force) makes the cart speed up. More force → more acceleration."
        }
      },
      {
        type: 'flashcard',
        topic: 'lo2',
        lo: { id: 'lo2', name: "Force = mass × acceleration", short: "F = ma" },
        isQuestion: false,
        content: {
          title: "Force = mass × acceleration",
          sub: 'Concept self-test card',
          text: '',
          front: "What happens to acceleration if you double the force but keep mass the same?",
          back: "Acceleration <strong>doubles</strong>! Force and acceleration are directly proportional. Since a = F ÷ m, doubling F means doubling a."
        }
      },
      {
        type: 'fill',
        topic: 'lo2',
        lo: { id: 'lo2', name: "Force = mass × acceleration", short: "F = ma" },
        isQuestion: true,
        text: "A 5 kg box is pushed with 20 N of force. What is its acceleration?",
        unit: "m/s²",
        answer: '4',
        hint: 'Use F = ma → a = F ÷ m',
        explanation: "Using a = F ÷ m, we divide 20 N by 5 kg to get 4 m/s². Remember that acceleration equals force divided by mass."
      },
      {
        type: 'topic-complete',
        topic: 'lo2',
        lo: { id: 'lo2', name: "Force = mass × acceleration", short: "F = ma" },
        isQuestion: false,
        topicIdx: 1,
        totalTopics: 2,
        isLast: true
      }
    ]
  },
  {
    id: 'demo2',
    title: 'Forces & Interaction Challenge',
    topicSummary: "Action-Reaction force pairs & Inertia motion rules",
    subject: 'science',
    length: 5,
    isCustom: false,
    isCompleted: false,
    steps: [
      {
        type: 'topic-intro',
        topic: 'lo3',
        lo: { id: 'lo3', name: "Action–Reaction pairs", short: "Action–Reaction" },
        isQuestion: false,
        topicIdx: 0,
        totalTopics: 2,
        motivational: "Forces always come in pairs! 🤝"
      },
      {
        type: 'recap',
        topic: 'lo3',
        lo: { id: 'lo3', name: "Action–Reaction pairs", short: "Action–Reaction" },
        isQuestion: false,
        content: {
          title: "Action–Reaction Pairs",
          sub: "Every push has a pushback",
          text: "For every <strong>action force</strong>, there is an <strong>equal and opposite reaction force</strong>. When you push a wall, the wall pushes back with equal force. When a rocket pushes gas downward, the gas pushes the rocket upward. These paired forces always act on <strong>different objects</strong>."
        }
      },
      {
        type: 'flashcard',
        topic: 'lo3',
        lo: { id: 'lo3', name: "Action–Reaction pairs", short: "Action–Reaction" },
        isQuestion: false,
        content: {
          title: "Action–Reaction Pairs",
          sub: 'Concept self-test card',
          text: '',
          front: "When a rocket pushes gas downward, what pushes the rocket upward?",
          back: "The gas pushes the rocket up with an <strong>equal and opposite</strong> force. That's Newton's Third Law in action! 🚀"
        }
      },
      {
        type: 'blanks',
        topic: 'lo3',
        lo: { id: 'lo3', name: "Action–Reaction pairs", short: "Action–Reaction" },
        isQuestion: true,
        sentence: "For every {___}, there is an equal and opposite {___}.",
        answers: ['action', 'reaction'],
        wordBank: ['force', 'action', 'motion', 'reaction'],
        explanation: "Newton's Third Law states that forces always exist in pairs: for every action force, there is an equal and opposite reaction force."
      },
      {
        type: 'topic-complete',
        topic: 'lo3',
        lo: { id: 'lo3', name: "Action–Reaction pairs", short: "Action–Reaction" },
        isQuestion: false,
        topicIdx: 0,
        totalTopics: 2,
        isLast: false
      },
      {
        type: 'topic-intro',
        topic: 'lo4',
        lo: { id: 'lo4', name: "Inertia & motion", short: "Inertia" },
        isQuestion: false,
        topicIdx: 1,
        totalTopics: 2,
        motivational: "Objects are stubborn! Let's see why 💪"
      },
      {
        type: 'recap',
        topic: 'lo4',
        lo: { id: 'lo4', name: "Inertia & motion", short: "Inertia" },
        isQuestion: false,
        content: {
          title: "Inertia & Motion",
          sub: "Why objects resist change",
          text: "Every object <strong>resists changing its motion</strong>. A still object wants to stay still; a moving object wants to keep moving. That stubbornness is called <strong>inertia</strong>, and the more mass something has, the more inertia it has. That's why a loaded truck is harder to stop than a bicycle.",
          type: 'ball',
          caption: "The ball keeps rolling until friction slows it. More mass = more inertia."
        }
      },
      {
        type: 'flashcard',
        topic: 'lo4',
        lo: { id: 'lo4', name: "Inertia & motion", short: "Inertia" },
        isQuestion: false,
        content: {
          title: "Inertia & Motion",
          sub: 'Concept self-test card',
          text: '',
          front: "Why do passengers lurch forward when a bus suddenly stops?",
          back: "Their bodies have <strong>inertia</strong> — they keep moving forward even as the bus stops underneath them. Newton's First Law!"
        }
      },
      {
        type: 'mcq',
        topic: 'lo4',
        lo: { id: 'lo4', name: "Inertia & motion", short: "Inertia" },
        isQuestion: true,
        text: "A heavy truck and a bicycle move at the same speed. Which is harder to stop?",
        options: ["Bicycle — less friction", "Truck — more inertia from mass", "They're equal", "Truck — stronger engine"],
        correct: 1,
        explanation: "The truck has much more mass, which means it has more inertia (resistance to change in motion) and requires more force to stop."
      },
      {
        type: 'topic-complete',
        topic: 'lo4',
        lo: { id: 'lo4', name: "Inertia & motion", short: "Inertia" },
        isQuestion: false,
        topicIdx: 1,
        totalTopics: 2,
        isLast: true
      }
    ]
  },
  {
    id: 'demo-math-kg',
    title: 'Kindergarten: Number Weigh-In',
    topicSummary: 'Interactive Balance Scale, heavier vs lighter numbers, and comparison signs (>, <, =)',
    subject: 'math',
    length: 11,
    isCustom: false,
    isCompleted: false,
    steps: [
      {
        type: 'math-concept',
        topic: 'kg-comparing-numbers',
        isQuestion: false
      },
      {
        type: 'math-recap',
        topic: 'kg-comparing-numbers',
        isQuestion: false
      },
      // Game 1: Tap the Bigger Number (3 rounds)
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-tap',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Which side has more? Tap the bigger number!',
        numberA: 8,
        numberB: 3,
        correctSide: 'A',
        explanation: '8 is bigger than 3. You can see 8 has more items!'
      },
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-tap',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Count the dots! Which side has more?',
        numberA: 4,
        numberB: 9,
        correctSide: 'B',
        hideNumbers: true,
        explanation: '9 is bigger than 4. You can see 9 has more dots!'
      },
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-tap',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Count carefully! Which side has more dots?',
        numberA: 7,
        numberB: 8,
        correctSide: 'B',
        hideNumbers: true,
        explanation: '8 is bigger than 7. 8 has just one more dot than 7!'
      },
      // Game 2: Feed the Alligator (3 rounds)
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-compare',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'The alligator is hungry and wants to eat the bigger number! Which symbol goes between 5 and 2?',
        numberA: 5,
        numberB: 2,
        correctSymbol: '>',
        explanation: '5 is bigger than 2! The symbol > points the open side toward 5 because the alligator eats 5.'
      },
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-compare',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'The alligator is hungry and wants to eat the bigger number! Which symbol goes between 3 and 8?',
        numberA: 3,
        numberB: 8,
        correctSymbol: '<',
        explanation: '8 is bigger than 3! The symbol < points the open side toward 8 because the alligator eats 8.'
      },
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-compare',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Wow, both numbers look the same! Which symbol shows they are equal?',
        numberA: 6,
        numberB: 6,
        correctSymbol: '=',
        explanation: '6 and 6 are exactly the same size! The = sign means both numbers are equal.'
      },
      // Game 3: Number Tower Sort (3 rounds)
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-sort',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!',
        numbers: [7, 2, 5],
        correctOrder: [2, 5, 7],
        explanation: 'In order from smallest to biggest, the numbers are 2, 5, and then 7.'
      },
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-sort',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!',
        numbers: [9, 4, 6],
        correctOrder: [4, 6, 9],
        explanation: 'In order from smallest to biggest, the numbers are 4, 6, and then 9.'
      },
      {
        lo: { id: 'kg-comparing-numbers', name: 'Comparing Numbers', short: 'Comparing' },
        type: 'game-sort',
        topic: 'kg-comparing-numbers',
        isQuestion: true,
        text: 'Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!',
        numbers: [3, 8, 1],
        correctOrder: [1, 3, 8],
        explanation: 'In order from smallest to biggest, the numbers are 1, 3, and then 8.'
      }
    ]
  },
  {
    id: 'demo-math-g3',
    title: 'Grade 3: Fractions Pizza Party',
    topicSummary: 'Interactive Pizza Slicer, denominator and numerator concepts, and equivalent fractions',
    subject: 'math',
    length: 5,
    isCustom: false,
    isCompleted: false,
    steps: [
      {
        type: 'math-concept',
        topic: 'g3-intro-fractions',
        isQuestion: false
      },
      {
        lo: { id: 'g3-intro-fractions', name: 'Intro to Fractions', short: 'Fractions' },
        type: 'mcq',
        topic: 'g3-intro-fractions',
        isQuestion: true,
        text: 'If a pizza is cut into 8 equal slices and you eat 3 of them, what fraction of the pizza did you eat?',
        options: ['3/5', '5/8', '3/8', '8/3'],
        correct: 2,
        explanation: 'You ate 3 parts (numerator) out of a total of 8 parts (denominator), which is 3/8.'
      },
      {
        type: 'math-recap',
        topic: 'g3-intro-fractions',
        isQuestion: false
      },
      {
        lo: { id: 'g3-intro-fractions', name: 'Intro to Fractions', short: 'Fractions' },
        type: 'fill',
        topic: 'g3-intro-fractions',
        isQuestion: true,
        text: "In the fraction 3/4, what do we call the top number '3'?",
        unit: '',
        answer: 'numerator',
        hint: 'It starts with N! It is the opposite of denominator.',
        explanation: 'The top number of a fraction is called the numerator, representing the parts selected.'
      },
      {
        type: 'math-example',
        topic: 'g3-intro-fractions',
        isQuestion: false
      },
      {
        lo: { id: 'g3-intro-fractions', name: 'Intro to Fractions', short: 'Fractions' },
        type: 'blanks',
        topic: 'g3-intro-fractions',
        isQuestion: true,
        sentence: 'The top part of a fraction is the {___}, and the bottom part is the {___}.',
        answers: ['numerator', 'denominator'],
        wordBank: ['denominator', 'division', 'numerator', 'slice'],
        explanation: 'Fractions are written with a numerator on top and a denominator on the bottom.'
      },
      {
        type: 'flashcard',
        topic: 'g3-intro-fractions',
        isQuestion: false,
        content: {
          title: 'Introduction to Fractions',
          sub: 'Concept self-test card',
          text: '',
          front: 'What is the difference between a Numerator and a Denominator?',
          back: 'The <strong>Numerator</strong> (top number) is the number of parts we have.<br>The <strong>Denominator</strong> (bottom number) is the total number of equal parts in the whole.'
        }
      },
      {
        lo: { id: 'g3-intro-fractions', name: 'Intro to Fractions', short: 'Fractions' },
        type: 'drag',
        topic: 'g3-intro-fractions',
        isQuestion: true,
        text: 'Match each fraction with its visual description:',
        pairs: [
          { item: '1/2', zone: 'Half a pizza' },
          { item: '1/4', zone: 'Quarter a pizza' },
          { item: '4/4', zone: 'One whole pizza' }
        ],
        explanation: '1/2 is half, 1/4 is a quarter, and 4/4 is four quarters, which makes one whole.'
      }
    ]
  },
  {
    id: 'demo-math-g7',
    title: 'Grade 7: Pythagorean Water Proof',
    topicSummary: 'Dynamic side length sliders, central right triangle, and a² + b² = c² water proof visualizer',
    subject: 'math',
    length: 5,
    isCustom: false,
    isCompleted: false,
    steps: [
      {
        type: 'math-concept',
        topic: 'g7-pythagoras',
        isQuestion: false
      },
      {
        lo: { id: 'g7-pythagoras', name: 'Pythagoras Theorem', short: 'Pythagoras' },
        type: 'mcq',
        topic: 'g7-pythagoras',
        isQuestion: true,
        text: 'In a right triangle, if side a = 3 and side b = 4, what is the length of the hypotenuse c?',
        options: ['5', '7', '12', '25'],
        correct: 0,
        explanation: 'Using a² + b² = c² → 3² + 4² = 9 + 16 = 25. The square root of 25 is 5. So c = 5.'
      },
      {
        type: 'math-recap',
        topic: 'g7-pythagoras',
        isQuestion: false
      },
      {
        lo: { id: 'g7-pythagoras', name: 'Pythagoras Theorem', short: 'Pythagoras' },
        type: 'fill',
        topic: 'g7-pythagoras',
        isQuestion: true,
        text: 'In a right triangle, what is the special name given to the longest side opposite the 90-degree angle?',
        unit: '',
        answer: 'hypotenuse',
        hint: 'It starts with H and is the longest side of a right triangle.',
        explanation: 'The hypotenuse is the longest side of a right-angled triangle, opposite the right angle.'
      },
      {
        type: 'math-example',
        topic: 'g7-pythagoras',
        isQuestion: false
      },
      {
        lo: { id: 'g7-pythagoras', name: 'Pythagoras Theorem', short: 'Pythagoras' },
        type: 'blanks',
        topic: 'g7-pythagoras',
        isQuestion: true,
        sentence: "Pythagoras' Theorem is written as a² + b² = {___}, where the letter c represents the {___}.",
        answers: ['c²', 'hypotenuse'],
        wordBank: ['c²', 'c', 'hypotenuse', 'triangle'],
        explanation: "The theorem is a² + b² = c², where c is the hypotenuse."
      },
      {
        type: 'flashcard',
        topic: 'g7-pythagoras',
        isQuestion: false,
        content: {
          title: 'Pythagoras Theorem',
          sub: 'Concept self-test card',
          text: '',
          front: 'What is the Pythagorean formula and what side is the hypotenuse?',
          back: 'The formula is <strong>a² + b² = c²</strong>.<br>The side <strong>c</strong> is the hypotenuse, which is the longest side and always opposite the right angle.'
        }
      },
      {
        lo: { id: 'g7-pythagoras', name: 'Pythagoras Theorem', short: 'Pythagoras' },
        type: 'drag',
        topic: 'g7-pythagoras',
        isQuestion: true,
        text: 'Match the right triangle side lengths (a, b) with their correct hypotenuse length (c):',
        pairs: [
          { item: '3 and 4', zone: 'Hypotenuse: 5' },
          { item: '6 and 8', zone: 'Hypotenuse: 10' },
          { item: '5 and 12', zone: 'Hypotenuse: 13' }
        ],
        explanation: '3² + 4² = 25 (c=5); 6² + 8² = 100 (c=10); 5² + 12² = 169 (c=13).'
      }
    ]
  }
];

const HomeworkContext = createContext<HomeworkContextType | undefined>(undefined);

export const HomeworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [builderState, setBuilderState] = useState<BuilderState>({
    subject: 'science',
    type: 'general',
    student: null,
    manual: false,
    topics: ['lo1', 'lo2', 'lo3', 'lo4'],
    diff: 'adaptive',
    length: 5,
    format: 'journey',
  });

  const [assignments, setAssignments] = useState<HomeworkAssignment[]>(defaultDemoAssignments);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [homeworkSteps, setHomeworkSteps] = useState<HomeworkStep[]>([]);
  const [hwAnswers, setHwAnswers] = useState<Record<number, HomeworkAnswer>>({});
  const [hwIndex, setHwIndex] = useState<number>(0);
  const [hwElapsed, setHwElapsed] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [agentReady, setAgentReady] = useState<boolean>(false);
  const [hwStartTime, setHwStartTime] = useState<number | null>(null);
  const [eventLog, setEventLog] = useState<any[]>([]);
  const [selectedMathGrade, setSelectedMathGrade] = useState<string>('KG');

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  const [streakToastMessage, setStreakToastMessage] = useState<string | null>(null);
  const streakTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showStreakToast = (streakNum: number) => {
    setStreakToastMessage(`🔥 ${streakNum} correct in a row!`);
    if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
    streakTimerRef.current = setTimeout(() => {
      setStreakToastMessage(null);
    }, 2000);
  };

  const logEvent = (e: any) => {
    setEventLog(prev => [...prev, { ...e, t: Date.now() }]);
  };

  const selectAssignment = (id: string) => {
    const selected = assignments.find(a => a.id === id);
    if (selected) {
      setActiveAssignmentId(id);
      // Filter out redundant slides to keep total cards under 12
      const filteredSteps = selected.steps.filter(
        step => !['topic-intro', 'topic-complete', 'flashcard'].includes(step.type)
      );
      setHomeworkSteps(filteredSteps);
      resetHomework();
    }
  };

  const resetHomework = () => {
    setHwIndex(0);
    setHwAnswers({});
    setStreak(0);
    setIsCompleted(false);
    setHwStartTime(Date.now());
    setHwElapsed(0);
  };

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (streakTimerRef.current) clearTimeout(streakTimerRef.current);
    };
  }, []);

  return (
    <HomeworkContext.Provider
      value={{
        builderState,
        setBuilderState,
        homeworkSteps,
        setHomeworkSteps,
        assignments,
        setAssignments,
        activeAssignmentId,
        setActiveAssignmentId,
        hwAnswers,
        setHwAnswers,
        hwIndex,
        setHwIndex,
        hwElapsed,
        setHwElapsed,
        streak,
        setStreak,
        isCompleted,
        setIsCompleted,
        agentReady,
        setAgentReady,
        toastMessage,
        showToast,
        streakToastMessage,
        showStreakToast,
        resetHomework,
        hwStartTime,
        setHwStartTime,
        eventLog,
        logEvent,
        selectAssignment,
        selectedMathGrade,
        setSelectedMathGrade,
      }}
    >
      {children}
    </HomeworkContext.Provider>
  );
};

export const useHomework = () => {
  const context = useContext(HomeworkContext);
  if (context === undefined) {
    throw new Error('useHomework must be used within a HomeworkProvider');
  }
  return context;
};
