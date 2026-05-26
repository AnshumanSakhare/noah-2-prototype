"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Student } from '../../data/students';
import { Question } from '../../data/questions';
import { Topic } from '../../data/topics';

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
  | 'flashcard' 
  | 'animation' 
  | 'topic-complete' 
  | 'mcq' 
  | 'fill' 
  | 'blanks' 
  | 'drag';

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
  type: 'content' | 'mcq' | 'fill' | 'blanks' | 'drag';
  viewed?: boolean;
  answer?: any; // MCQ: number, Fill: string
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
