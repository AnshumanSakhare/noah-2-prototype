export interface BaseQuestion {
  id: string;
  lo: string;
  type: 'mcq' | 'fill' | 'blanks' | 'drag';
  explanation: string;
  text?: string;
}

export interface MCQQuestion extends BaseQuestion {
  type: 'mcq';
  text: string;
  options: string[];
  correct: number;
}

export interface FillQuestion extends BaseQuestion {
  type: 'fill';
  text: string;
  unit: string;
  answer: string;
  hint: string;
}

export interface BlanksQuestion extends BaseQuestion {
  type: 'blanks';
  sentence: string;
  answers: string[];
  wordBank: string[];
}

export interface DragQuestionPair {
  item: string;
  zone: string;
}

export interface DragQuestion extends BaseQuestion {
  type: 'drag';
  text: string;
  pairs: DragQuestionPair[];
}

export type Question = MCQQuestion | FillQuestion | BlanksQuestion | DragQuestion;

export const questionBank: Question[] = [
  {
    id: 'q1',
    lo: 'lo1',
    type: 'mcq',
    text: "Which of Newton's laws says an object at rest stays at rest unless a force acts on it?",
    options: ["First Law", "Second Law", "Third Law", "Law of Gravity"],
    correct: 0,
    explanation: "The answer is First Law because inertia is about resisting change in motion, not about force pairs."
  },
  {
    id: 'q2',
    lo: 'lo2',
    type: 'fill',
    text: "A 5 kg box is pushed with 20 N of force. What is its acceleration?",
    unit: "m/s²",
    answer: '4',
    hint: 'Use F = ma → a = F ÷ m',
    explanation: "Using a = F ÷ m, we divide 20 N by 5 kg to get 4 m/s². Remember that acceleration equals force divided by mass."
  },
  {
    id: 'q3',
    lo: 'lo3',
    type: 'blanks',
    sentence: "For every {___}, there is an equal and opposite {___}.",
    answers: ['action', 'reaction'],
    wordBank: ['force', 'action', 'motion', 'reaction'],
    explanation: "Newton's Third Law states that forces always exist in pairs: for every action force, there is an equal and opposite reaction force."
  },
  {
    id: 'q4',
    lo: 'lo1',
    type: 'drag',
    text: "Match each law to its key concept:",
    pairs: [
      { item: 'First Law', zone: 'Inertia' },
      { item: 'Second Law', zone: 'F = ma' },
      { item: 'Third Law', zone: 'Action–Reaction' }
    ],
    explanation: "First Law deals with Inertia (motion resistance), Second Law defines F = ma (acceleration rate), and Third Law defines Action-Reaction pairs."
  },
  {
    id: 'q5',
    lo: 'lo3',
    type: 'mcq',
    text: "A swimmer pushes water backward with her hands. What is the reaction force?",
    options: ["Gravity pulling down", "Water pushing her forward", "Her kick", "The wall"],
    correct: 1,
    explanation: "The swimmer pushes water backward (action), so the water pushes the swimmer forward (reaction) with equal force according to the 3rd Law."
  },
  {
    id: 'q6',
    lo: 'lo2',
    type: 'fill',
    text: "If Force = mass × ___, fill in the missing term.",
    unit: "",
    answer: 'acceleration',
    hint: 'The second part of F = ma',
    explanation: "Newton's Second Law is F = ma, which stands for Force = mass × acceleration. Acceleration is the rate at which velocity changes."
  },
  {
    id: 'q7',
    lo: 'lo4',
    type: 'blanks',
    sentence: "An object in {___} stays in motion unless acted on by a {___}.",
    answers: ['motion', 'force'],
    wordBank: ['motion', 'force', 'speed', 'gravity'],
    explanation: "According to the First Law, an object in motion stays in motion with the same speed and direction unless acted on by a net external force."
  },
  {
    id: 'q8',
    lo: 'lo3',
    type: 'drag',
    text: "Match each example to the correct Newton's Law:",
    pairs: [
      { item: 'Bus stops → passengers lurch', zone: 'First Law' },
      { item: 'Rocket accelerating upward', zone: 'Second Law' },
      { item: 'Walking (push ground back)', zone: 'Third Law' }
    ],
    explanation: "Passenger lurch is First Law (inertia of body), Rocket thrust is Second Law (F = ma push), ground kick is Third Law (action-reaction)."
  },
  {
    id: 'q9',
    lo: 'lo4',
    type: 'mcq',
    text: "A heavy truck and a bicycle move at the same speed. Which is harder to stop?",
    options: ["Bicycle — less friction", "Truck — more inertia from mass", "They're equal", "Truck — stronger engine"],
    correct: 1,
    explanation: "The truck has much more mass, which means it has more inertia (resistance to change in motion) and requires more force to stop."
  },
  {
    id: 'q10',
    lo: 'lo2',
    type: 'fill',
    text: "A 500 kg rocket has 10,000 N thrust up and 4,900 N gravity down. What is the net upward force?",
    unit: "N",
    answer: '5100',
    hint: 'Net force = thrust − gravity',
    explanation: "Net upward force is calculated by subtracting downward gravity from upward thrust: 10,000 N - 4,900 N = 5,100 N."
  },
  {
    id: 'q11',
    lo: 'lo1',
    type: 'mcq',
    text: "What is another common name for Newton's First Law of Motion?",
    options: ["Law of Inertia", "Law of Acceleration", "Law of Action-Reaction", "Law of Gravity"],
    correct: 0,
    explanation: "The First Law of Motion is commonly called the Law of Inertia because inertia is the tendency of objects to resist changes in motion."
  },
  {
    id: 'q12',
    lo: 'lo4',
    type: 'fill',
    text: "The tendency of an object to resist changes in its state of motion is called ___.",
    unit: "",
    answer: 'inertia',
    hint: 'It starts with the letter I',
    explanation: "Inertia is defined as the inherent property of matter to resist any change in its velocity or state of rest."
  },
  {
    id: 'q13',
    lo: 'lo3',
    type: 'blanks',
    sentence: "When you jump off a small boat, you push the boat {___} and you move {___}.",
    answers: ['backward', 'forward'],
    wordBank: ['forward', 'backward', 'downward', 'upward'],
    explanation: "As you jump forward, your feet push the boat backward (action). The boat pushes you forward (reaction) according to the 3rd Law."
  },
  {
    id: 'q14',
    lo: 'lo2',
    type: 'drag',
    text: "Match the mass and acceleration to the resulting net force (F = ma):",
    pairs: [
      { item: 'Mass 2 kg, Accel 3 m/s²', zone: 'Force = 6 N' },
      { item: 'Mass 10 kg, Accel 2 m/s²', zone: 'Force = 20 N' },
      { item: 'Mass 5 kg, Accel 5 m/s²', zone: 'Force = 25 N' }
    ],
    explanation: "Multiplying mass by acceleration (F = m * a) gives the net force: 2*3 = 6 N, 10*2 = 20 N, and 5*5 = 25 N."
  }
];
