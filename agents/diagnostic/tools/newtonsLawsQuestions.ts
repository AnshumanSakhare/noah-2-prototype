import type { QuestionBankQuestion } from "../types/index"

export const NEWTONS_LAWS_QUESTIONS: QuestionBankQuestion[] = [
  // LO1 – Identify Newton's Three Laws
  {
    id: "sci-nl-01",
    topic: "Newton's Laws of Motion",
    subtopic: "Identifying the Laws",
    learningObjective: "Students can identify Newton's three laws of motion",
    difficultyLevel: "easy",
    classLevel: "class6",
    bloomLevel: "remember",
    questionType: "mcq",
    question:
      "Which of Newton's laws states that an object at rest stays at rest unless acted upon by an unbalanced force?",
    options: ["First Law", "Second Law", "Third Law", "Law of Gravitation"],
    correctAnswer: "A",
    explanation:
      "Newton's First Law (Law of Inertia) states that an object will remain at rest or in uniform motion unless acted on by an external unbalanced force.",
    keywords: ["newton", "first law", "inertia", "rest", "motion"],
    payload: {
      options: [
        { text: "First Law", correct: true },
        { text: "Second Law", correct: false },
        { text: "Third Law", correct: false },
        { text: "Law of Gravitation", correct: false },
      ],
      explanation:
        "Newton's First Law (Law of Inertia) states that an object will remain at rest or in uniform motion unless acted on by an external unbalanced force.",
    },
  },
  {
    id: "sci-nl-02",
    topic: "Newton's Laws of Motion",
    subtopic: "Identifying the Laws",
    learningObjective: "Students can identify Newton's three laws of motion",
    difficultyLevel: "medium",
    classLevel: "class6",
    bloomLevel: "understand",
    questionType: "mcq",
    question:
      "A soccer ball sits still on the field until a player kicks it. Which law best explains why the ball was stationary before the kick?",
    options: [
      "Third Law – action and reaction",
      "First Law – inertia",
      "Second Law – force equals mass times acceleration",
      "None of these laws apply",
    ],
    correctAnswer: "B",
    explanation:
      "The ball was at rest and stayed at rest due to inertia (Newton's First Law). It required an unbalanced force (the kick) to change its state.",
    keywords: ["newton", "first law", "inertia", "soccer", "rest"],
    payload: {
      options: [
        { text: "Third Law – action and reaction", correct: false },
        { text: "First Law – inertia", correct: true },
        {
          text: "Second Law – force equals mass times acceleration",
          correct: false,
        },
        { text: "None of these laws apply", correct: false },
      ],
      explanation:
        "The ball was at rest and stayed at rest due to inertia (Newton's First Law). It required an unbalanced force (the kick) to change its state.",
    },
  },
  {
    id: "sci-nl-03",
    topic: "Newton's Laws of Motion",
    subtopic: "Identifying the Laws",
    learningObjective: "Students can identify Newton's three laws of motion",
    difficultyLevel: "hard",
    classLevel: "class6",
    bloomLevel: "apply",
    questionType: "mcq",
    question:
      "When you jump off a small boat into the water, the boat moves backward. Meanwhile, you accelerate forward based on how hard you push. Which combination of Newton's laws are at play?",
    options: [
      "Only the First Law",
      "Only the Third Law",
      "Second and Third Laws together",
      "First and Second Laws together",
    ],
    correctAnswer: "C",
    explanation:
      "The Third Law explains the equal and opposite reaction (boat moves back). The Second Law (F=ma) determines how fast you and the boat each accelerate based on the forces and masses involved.",
    keywords: ["newton", "second law", "third law", "boat", "reaction"],
    payload: {
      options: [
        { text: "Only the First Law", correct: false },
        { text: "Only the Third Law", correct: false },
        { text: "Second and Third Laws together", correct: true },
        { text: "First and Second Laws together", correct: false },
      ],
      explanation:
        "The Third Law explains the equal and opposite reaction (boat moves back). The Second Law (F=ma) determines how fast you and the boat each accelerate based on the forces and masses involved.",
    },
  },

  // LO2 – Apply F = ma to Real Scenarios
  {
    id: "sci-nl-04",
    topic: "Newton's Laws of Motion",
    subtopic: "F = ma Calculations",
    learningObjective: "Students can apply F = ma to real scenarios",
    difficultyLevel: "easy",
    classLevel: "class6",
    bloomLevel: "remember",
    questionType: "mcq",
    question: "A 5 kg box is pushed with a force of 20 N. What is its acceleration?",
    options: ["2 m/s²", "4 m/s²", "10 m/s²", "100 m/s²"],
    correctAnswer: "B",
    explanation:
      "Using F = ma → a = F/m = 20/5 = 4 m/s². The box accelerates at 4 meters per second squared.",
    keywords: ["force", "mass", "acceleration", "f=ma", "calculation"],
    payload: {
      options: [
        { text: "2 m/s²", correct: false },
        { text: "4 m/s²", correct: true },
        { text: "10 m/s²", correct: false },
        { text: "100 m/s²", correct: false },
      ],
      explanation:
        "Using F = ma → a = F/m = 20/5 = 4 m/s². The box accelerates at 4 meters per second squared.",
    },
  },
  {
    id: "sci-nl-05",
    topic: "Newton's Laws of Motion",
    subtopic: "F = ma Calculations",
    learningObjective: "Students can apply F = ma to real scenarios",
    difficultyLevel: "medium",
    classLevel: "class6",
    bloomLevel: "understand",
    questionType: "mcq",
    question:
      "Two identical shopping carts are pushed with different forces. Cart A gets 30 N and Cart B gets 15 N. How do their accelerations compare?",
    options: [
      "Cart A accelerates twice as fast as Cart B",
      "Cart B accelerates twice as fast",
      "They accelerate equally",
      "Cannot determine without mass",
    ],
    correctAnswer: "A",
    explanation:
      "Since both carts have the same mass, F = ma tells us that double the force means double the acceleration. Cart A's acceleration is 2× Cart B's.",
    keywords: ["force", "acceleration", "proportional", "f=ma", "carts"],
    payload: {
      options: [
        { text: "Cart A accelerates twice as fast as Cart B", correct: true },
        { text: "Cart B accelerates twice as fast", correct: false },
        { text: "They accelerate equally", correct: false },
        { text: "Cannot determine without mass", correct: false },
      ],
      explanation:
        "Since both carts have the same mass, F = ma tells us that double the force means double the acceleration. Cart A's acceleration is 2× Cart B's.",
    },
  },
  {
    id: "sci-nl-06",
    topic: "Newton's Laws of Motion",
    subtopic: "F = ma Calculations",
    learningObjective: "Students can apply F = ma to real scenarios",
    difficultyLevel: "hard",
    classLevel: "class6",
    bloomLevel: "apply",
    questionType: "mcq",
    question:
      "A rocket has a mass of 500 kg and its engines produce 10,000 N of thrust. If gravity pulls it down with 4,900 N, what is the rocket's upward acceleration?",
    options: ["20 m/s²", "10.2 m/s²", "9.8 m/s²", "5.1 m/s²"],
    correctAnswer: "B",
    explanation:
      "Net upward force = 10,000 − 4,900 = 5,100 N. Using a = F/m = 5,100 / 500 = 10.2 m/s².",
    keywords: ["rocket", "thrust", "gravity", "net force", "acceleration"],
    payload: {
      options: [
        { text: "20 m/s²", correct: false },
        { text: "10.2 m/s²", correct: true },
        { text: "9.8 m/s²", correct: false },
        { text: "5.1 m/s²", correct: false },
      ],
      explanation:
        "Net upward force = 10,000 − 4,900 = 5,100 N. Using a = F/m = 5,100 / 500 = 10.2 m/s².",
    },
  },

  // LO3 – Analyze Action-Reaction Pairs
  {
    id: "sci-nl-07",
    topic: "Newton's Laws of Motion",
    subtopic: "Action-Reaction Pairs",
    learningObjective: "Students can analyze action-reaction pairs",
    difficultyLevel: "easy",
    classLevel: "class6",
    bloomLevel: "remember",
    questionType: "mcq",
    question:
      "When you push against a wall, the wall pushes back on you with an equal force. This is an example of which law?",
    options: [
      "Newton's First Law",
      "Newton's Second Law",
      "Newton's Third Law",
      "Law of Conservation of Energy",
    ],
    correctAnswer: "C",
    explanation:
      "Newton's Third Law: For every action, there is an equal and opposite reaction. You push the wall → the wall pushes you back.",
    keywords: ["third law", "action", "reaction", "wall", "equal force"],
    payload: {
      options: [
        { text: "Newton's First Law", correct: false },
        { text: "Newton's Second Law", correct: false },
        { text: "Newton's Third Law", correct: true },
        { text: "Law of Conservation of Energy", correct: false },
      ],
      explanation:
        "Newton's Third Law: For every action, there is an equal and opposite reaction. You push the wall → the wall pushes you back.",
    },
  },
  {
    id: "sci-nl-08",
    topic: "Newton's Laws of Motion",
    subtopic: "Action-Reaction Pairs",
    learningObjective: "Students can analyze action-reaction pairs",
    difficultyLevel: "medium",
    classLevel: "class6",
    bloomLevel: "understand",
    questionType: "mcq",
    question:
      "A swimmer pushes water backward with her hands. What is the reaction force?",
    options: [
      "Gravity pulling her down",
      "Water pushing her forward",
      "Her legs kicking",
      "The pool wall pushing back",
    ],
    correctAnswer: "B",
    explanation:
      "Action: swimmer pushes water backward. Reaction: water pushes the swimmer forward. These are the Third-Law force pair.",
    keywords: ["swimmer", "water", "reaction", "third law", "forward"],
    payload: {
      options: [
        { text: "Gravity pulling her down", correct: false },
        { text: "Water pushing her forward", correct: true },
        { text: "Her legs kicking", correct: false },
        { text: "The pool wall pushing back", correct: false },
      ],
      explanation:
        "Action: swimmer pushes water backward. Reaction: water pushes the swimmer forward. These are the Third-Law force pair.",
    },
  },
  {
    id: "sci-nl-09",
    topic: "Newton's Laws of Motion",
    subtopic: "Action-Reaction Pairs",
    learningObjective: "Students can analyze action-reaction pairs",
    difficultyLevel: "hard",
    classLevel: "class6",
    bloomLevel: "apply",
    questionType: "mcq",
    question:
      "If a hammer hits a nail with 50 N of force, how much force does the nail exert back on the hammer?",
    options: [
      "0 N – the nail can't push",
      "25 N – half the force",
      "50 N – equal and opposite",
      "100 N – double the force",
    ],
    correctAnswer: "C",
    explanation:
      "By Newton's Third Law, forces always come in equal and opposite pairs. The nail pushes back on the hammer with exactly 50 N.",
    keywords: ["hammer", "nail", "third law", "equal", "opposite"],
    payload: {
      options: [
        { text: "0 N – the nail can't push", correct: false },
        { text: "25 N – half the force", correct: false },
        { text: "50 N – equal and opposite", correct: true },
        { text: "100 N – double the force", correct: false },
      ],
      explanation:
        "By Newton's Third Law, forces always come in equal and opposite pairs. The nail pushes back on the hammer with exactly 50 N.",
    },
  },

  // LO4 – Predict Motion Using Inertia
  {
    id: "sci-nl-10",
    topic: "Newton's Laws of Motion",
    subtopic: "Inertia and Motion",
    learningObjective: "Students can predict motion using inertia",
    difficultyLevel: "easy",
    classLevel: "class6",
    bloomLevel: "remember",
    questionType: "mcq",
    question:
      "When a bus suddenly stops, passengers lurch forward. This happens because of:",
    options: ["Gravity", "Friction", "Inertia", "Air resistance"],
    correctAnswer: "C",
    explanation:
      "Inertia! The passengers' bodies tend to keep moving at the bus's original speed even after the bus stops (Newton's First Law).",
    keywords: ["bus", "inertia", "passengers", "forward", "first law"],
    payload: {
      options: [
        { text: "Gravity", correct: false },
        { text: "Friction", correct: false },
        { text: "Inertia", correct: true },
        { text: "Air resistance", correct: false },
      ],
      explanation:
        "Inertia! The passengers' bodies tend to keep moving at the bus's original speed even after the bus stops (Newton's First Law).",
    },
  },
  {
    id: "sci-nl-11",
    topic: "Newton's Laws of Motion",
    subtopic: "Inertia and Motion",
    learningObjective: "Students can predict motion using inertia",
    difficultyLevel: "medium",
    classLevel: "class6",
    bloomLevel: "understand",
    questionType: "mcq",
    question:
      "A coin is placed on a smooth card on top of a glass. When the card is flicked away quickly, the coin drops into the glass. Why?",
    options: [
      "The card pushes the coin down",
      "Gravity increases when the card moves",
      "The coin's inertia keeps it in place while the card moves",
      "Air pressure pushes the coin down",
    ],
    correctAnswer: "C",
    explanation:
      "The coin has inertia – it resists the change in motion. When the card is removed quickly, the coin stays in place and drops straight into the glass due to gravity.",
    keywords: ["coin", "card", "inertia", "glass", "resist"],
    payload: {
      options: [
        { text: "The card pushes the coin down", correct: false },
        { text: "Gravity increases when the card moves", correct: false },
        {
          text: "The coin's inertia keeps it in place while the card moves",
          correct: true,
        },
        { text: "Air pressure pushes the coin down", correct: false },
      ],
      explanation:
        "The coin has inertia – it resists the change in motion. When the card is removed quickly, the coin stays in place and drops straight into the glass due to gravity.",
    },
  },
  {
    id: "sci-nl-12",
    topic: "Newton's Laws of Motion",
    subtopic: "Inertia and Motion",
    learningObjective: "Students can predict motion using inertia",
    difficultyLevel: "hard",
    classLevel: "class6",
    bloomLevel: "apply",
    questionType: "mcq",
    question:
      "A heavy truck and a bicycle are both moving at the same speed. Which one is harder to stop and why?",
    options: [
      "The bicycle, because it has less friction",
      "The truck, because it has more inertia due to greater mass",
      "They are equally hard to stop at the same speed",
      "The truck, because its engine is more powerful",
    ],
    correctAnswer: "B",
    explanation:
      "Inertia depends on mass. The truck has far more mass, so it has more inertia and resists changes in motion more strongly. It takes more force to stop.",
    keywords: ["truck", "bicycle", "mass", "inertia", "stop"],
    payload: {
      options: [
        { text: "The bicycle, because it has less friction", correct: false },
        {
          text: "The truck, because it has more inertia due to greater mass",
          correct: true,
        },
        {
          text: "They are equally hard to stop at the same speed",
          correct: false,
        },
        {
          text: "The truck, because its engine is more powerful",
          correct: false,
        },
      ],
      explanation:
        "Inertia depends on mass. The truck has far more mass, so it has more inertia and resists changes in motion more strongly. It takes more force to stop.",
    },
  },

  // LO5 – Evaluate Mass, Force & Acceleration
  {
    id: "sci-nl-13",
    topic: "Newton's Laws of Motion",
    subtopic: "Mass, Force and Acceleration",
    learningObjective: "Students can evaluate mass, force and acceleration",
    difficultyLevel: "easy",
    classLevel: "class6",
    bloomLevel: "remember",
    questionType: "mcq",
    question:
      "If you double the force applied to an object while keeping mass the same, what happens to acceleration?",
    options: ["It halves", "It stays the same", "It doubles", "It quadruples"],
    correctAnswer: "C",
    explanation:
      "From F = ma, if F doubles and m stays the same, then a must double. Force and acceleration are directly proportional.",
    keywords: ["force", "acceleration", "double", "proportional", "f=ma"],
    payload: {
      options: [
        { text: "It halves", correct: false },
        { text: "It stays the same", correct: false },
        { text: "It doubles", correct: true },
        { text: "It quadruples", correct: false },
      ],
      explanation:
        "From F = ma, if F doubles and m stays the same, then a must double. Force and acceleration are directly proportional.",
    },
  },
  {
    id: "sci-nl-14",
    topic: "Newton's Laws of Motion",
    subtopic: "Mass, Force and Acceleration",
    learningObjective: "Students can evaluate mass, force and acceleration",
    difficultyLevel: "medium",
    classLevel: "class6",
    bloomLevel: "understand",
    questionType: "mcq",
    question:
      "Object X has a mass of 2 kg and Object Y has a mass of 8 kg. The same 16 N force is applied to both. What are their accelerations?",
    options: [
      "X: 8 m/s², Y: 2 m/s²",
      "X: 4 m/s², Y: 4 m/s²",
      "X: 2 m/s², Y: 8 m/s²",
      "X: 32 m/s², Y: 128 m/s²",
    ],
    correctAnswer: "A",
    explanation:
      "For X: a = 16/2 = 8 m/s². For Y: a = 16/8 = 2 m/s². More mass means less acceleration for the same force.",
    keywords: ["mass", "force", "acceleration", "f=ma", "inverse"],
    payload: {
      options: [
        { text: "X: 8 m/s², Y: 2 m/s²", correct: true },
        { text: "X: 4 m/s², Y: 4 m/s²", correct: false },
        { text: "X: 2 m/s², Y: 8 m/s²", correct: false },
        { text: "X: 32 m/s², Y: 128 m/s²", correct: false },
      ],
      explanation:
        "For X: a = 16/2 = 8 m/s². For Y: a = 16/8 = 2 m/s². More mass means less acceleration for the same force.",
    },
  },
  {
    id: "sci-nl-15",
    topic: "Newton's Laws of Motion",
    subtopic: "Mass, Force and Acceleration",
    learningObjective: "Students can evaluate mass, force and acceleration",
    difficultyLevel: "hard",
    classLevel: "class6",
    bloomLevel: "apply",
    questionType: "mcq",
    question:
      "An astronaut pushes a 200 kg satellite in space with a force of 40 N. On Earth, she pushes a 200 kg crate with the same force, but friction exerts 30 N against her. Compare the accelerations.",
    options: [
      "Satellite: 0.2 m/s², Crate: 0.05 m/s²",
      "Both accelerate at 0.2 m/s²",
      "Satellite: 0.05 m/s², Crate: 0.2 m/s²",
      "Neither accelerates because 40 N isn't enough",
    ],
    correctAnswer: "A",
    explanation:
      "Satellite (no friction): a = 40/200 = 0.2 m/s². Crate: net force = 40 - 30 = 10 N → a = 10/200 = 0.05 m/s². Friction reduces the effective force on Earth.",
    keywords: ["astronaut", "satellite", "friction", "net force", "space"],
    payload: {
      options: [
        {
          text: "Satellite: 0.2 m/s², Crate: 0.05 m/s²",
          correct: true,
        },
        { text: "Both accelerate at 0.2 m/s²", correct: false },
        {
          text: "Satellite: 0.05 m/s², Crate: 0.2 m/s²",
          correct: false,
        },
        {
          text: "Neither accelerates because 40 N isn't enough",
          correct: false,
        },
      ],
      explanation:
        "Satellite (no friction): a = 40/200 = 0.2 m/s². Crate: net force = 40 - 30 = 10 N → a = 10/200 = 0.05 m/s². Friction reduces the effective force on Earth.",
    },
  },
]
