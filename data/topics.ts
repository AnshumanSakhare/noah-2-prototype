export interface Topic {
  id: string;
  name: string;
  short: string;
}

export interface TopicContentRecap {
  title: string;
  sub: string;
  text: string;
}

export interface TopicContentFlashcard {
  front: string;
  back: string;
}

export interface TopicContentAnimation {
  type: 'cart' | 'ball' | 'laws';
  caption: string;
}

export interface TopicContentItem {
  recap: TopicContentRecap;
  flashcard: TopicContentFlashcard;
  animation: TopicContentAnimation | null;
  motivational: string;
}

export const topicsBySubject: Record<string, Topic[]> = {
  science: [
    { id: 'lo1', name: "Newton's Three Laws", short: "The 3 Laws" },
    { id: 'lo2', name: "Force = mass × acceleration", short: "F = ma" },
    { id: 'lo3', name: "Action–Reaction pairs", short: "Action–Reaction" },
    { id: 'lo4', name: "Inertia & motion", short: "Inertia" },
  ],
};

export const learningOutcomes: Topic[] = topicsBySubject.science;

export const topicContent: Record<string, TopicContentItem> = {
  lo1: {
    recap: {
      title: "Newton's Three Laws",
      sub: "30-second recap",
      text: `Newton described three fundamental laws that govern how objects move. The <strong>First Law (Inertia)</strong> says objects stay at rest or keep moving unless a force acts on them. The <strong>Second Law (F = ma)</strong> connects force, mass and acceleration. The <strong>Third Law</strong> says every action has an <strong>equal and opposite reaction</strong>.`
    },
    flashcard: {
      front: "Can you name all three of Newton's Laws and what each one is about?",
      back: "<strong>1st Law:</strong> Inertia — objects resist changes in motion<br><strong>2nd Law:</strong> F = ma — force equals mass × acceleration<br><strong>3rd Law:</strong> Action–Reaction — equal and opposite forces"
    },
    animation: {
      type: 'laws',
      caption: "Explore Newton's Laws with interactive chalkboard demonstrations."
    },
    motivational: "Let's start with the big picture!"
  },
  lo2: {
    recap: {
      title: "Force = mass × acceleration",
      sub: "The math behind motion",
      text: `Force equals mass times acceleration (<strong>F = ma</strong>). This means a bigger force creates more acceleration, and a heavier object needs more force to accelerate the same amount. If you <strong>double the force</strong>, acceleration doubles. If you <strong>double the mass</strong>, acceleration halves.`
    },
    flashcard: {
      front: "What happens to acceleration if you double the force but keep mass the same?",
      back: "Acceleration <strong>doubles</strong>! Force and acceleration are directly proportional. Since a = F ÷ m, doubling F means doubling a."
    },
    animation: {
      type: 'cart',
      caption: "A push (force) makes the cart speed up. More force → more acceleration."
    },
    motivational: "Time to crunch some numbers! 🔢"
  },
  lo3: {
    recap: {
      title: "Action–Reaction Pairs",
      sub: "Every push has a pushback",
      text: `For every <strong>action force</strong>, there is an <strong>equal and opposite reaction force</strong>. When you push a wall, the wall pushes back with equal force. When a rocket pushes gas downward, the gas pushes the rocket upward. These paired forces always act on <strong>different objects</strong>.`
    },
    flashcard: {
      front: "When a rocket pushes gas downward, what pushes the rocket upward?",
      back: "The gas pushes the rocket up with an <strong>equal and opposite</strong> force. That's Newton's Third Law in action! 🚀"
    },
    animation: null,
    motivational: "Forces always come in pairs! 🤝"
  },
  lo4: {
    recap: {
      title: "Inertia & Motion",
      sub: "Why objects resist change",
      text: `Every object <strong>resists changing its motion</strong>. A still object wants to stay still; a moving object wants to keep moving. That stubbornness is called <strong>inertia</strong>, and the more mass something has, the more inertia it has. That's why a loaded truck is harder to stop than a bicycle.`
    },
    flashcard: {
      front: "Why do passengers lurch forward when a bus suddenly stops?",
      back: "Their bodies have <strong>inertia</strong> — they keep moving forward even as the bus stops underneath them. Newton's First Law!"
    },
    animation: {
      type: 'ball',
      caption: "The ball keeps rolling until friction slows it. More mass = more inertia."
    },
    motivational: "Objects are stubborn! Let's see why 💪"
  }
};
