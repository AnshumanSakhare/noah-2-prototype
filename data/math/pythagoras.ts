import { MathTopicBundle } from './types';

export const pythagorasBundle: MathTopicBundle = {
  content: {
    topicId: 'g7-pythagoras',
    grade: 'G7',
    name: 'Pythagoras Theorem',
    icon: '📐',
    recap: {
      title: 'Pythagoras Theorem',
      sub: 'Grade 7 · Concept card',
      text: "The **Pythagorean Theorem** states that in any right-angled triangle, the area of the square on the longest side (the **hypotenuse**, *c*) is equal to the sum of the areas of the squares on the other two sides (*a* and *b*). This is written as: **a² + b² = c²**. You can prove this visually using a water-grid: filling the squares on sides *a* and *b* with water, and then draining them together to perfectly fill the square on side *c*!"
    },
    flashcard: {
      front: 'What is the Pythagorean formula and what side is the hypotenuse?',
      back: 'The formula is <strong>a² + b² = c²</strong>.<br>The side <strong>c</strong> is the hypotenuse, which is the longest side and always opposite the right angle.'
    },
    sandbox: {
      type: 'pythagoras-proof',
      caption: 'Adjust side lengths and trigger the water flow animation to see how a² + b² perfectly fills c²!'
    },
    motivational: "Let's explore the magical math of right triangles! 📐"
  },
  questions: [
    {
      id: 'mq-g7-1',
      lo: 'g7-pythagoras',
      type: 'mcq',
      text: 'In a right triangle, if side a = 3 and side b = 4, what is the length of the hypotenuse c?',
      options: ['5', '7', '12', '25'],
      correct: 0,
      explanation: 'Using a² + b² = c² → 3² + 4² = 9 + 16 = 25. The square root of 25 is 5. So c = 5.'
    },
    {
      id: 'mq-g7-2',
      lo: 'g7-pythagoras',
      type: 'mcq',
      text: 'In a right triangle, if the hypotenuse c = 10 and one side a = 6, what is the length of the other side b?',
      options: ['4', '8', '16', '36'],
      correct: 1,
      explanation: 'Using a² + b² = c² → 6² + b² = 10² → 36 + b² = 100 → b² = 64 → b = 8.'
    },
    {
      id: 'mq-g7-3',
      lo: 'g7-pythagoras',
      type: 'mcq',
      text: 'Which of the following sets of numbers forms a Pythagorean triple (can be the sides of a right triangle)?',
      options: ['2, 3, 4', '5, 12, 13', '4, 5, 6', '3, 4, 6'],
      correct: 1,
      explanation: 'Since 5² + 12² = 25 + 144 = 169, and 13² = 169, 5-12-13 is a Pythagorean triple.'
    },
    {
      id: 'mq-g7-4',
      lo: 'g7-pythagoras',
      type: 'fill',
      text: 'In a right triangle, what is the special name given to the longest side opposite the 90-degree angle?',
      unit: '',
      answer: 'hypotenuse',
      hint: 'It starts with H and is the longest side of a right triangle.',
      explanation: 'The hypotenuse is the longest side of a right-angled triangle, opposite the right angle.'
    },
    {
      id: 'mq-g7-5',
      lo: 'g7-pythagoras',
      type: 'fill',
      text: 'What is the length of the hypotenuse of a right-angled triangle with other sides of length 8 and 15?',
      unit: '',
      answer: '17',
      hint: 'Compute 8² + 15² and find the square root of the sum.',
      explanation: '8² + 15² = 64 + 225 = 289. The square root of 289 is 17.'
    },
    {
      id: 'mq-g7-6',
      lo: 'g7-pythagoras',
      type: 'fill',
      text: 'If a right-angled triangle has a hypotenuse of length 13 and one side of length 12, what is the length of the remaining side?',
      unit: '',
      answer: '5',
      hint: 'Find c² - b² and take the square root.',
      explanation: '13² - 12² = 169 - 144 = 25. The square root of 25 is 5.'
    },
    {
      id: 'mq-g7-7',
      lo: 'g7-pythagoras',
      type: 'blanks',
      sentence: "Pythagoras' Theorem is written as a² + b² = {___}, where the letter c represents the {___}.",
      answers: ['c²', 'hypotenuse'],
      wordBank: ['c²', 'c', 'hypotenuse', 'triangle'],
      explanation: "The theorem is a² + b² = c², where c is the hypotenuse."
    },
    {
      id: 'mq-g7-8',
      lo: 'g7-pythagoras',
      type: 'blanks',
      sentence: 'In a right triangle, the side opposite the 90-degree angle is the {___}, and the theorem formula is written as a² + {___} = c².',
      answers: ['hypotenuse', 'b²'],
      wordBank: ['hypotenuse', 'adjacent', 'b²', 'c²'],
      explanation: 'The side is the hypotenuse, and the formula is a² + b² = c².'
    },
    {
      id: 'mq-g7-9',
      lo: 'g7-pythagoras',
      type: 'blanks',
      sentence: 'A triangle with sides of lengths 9, 12, and 15 is a {___} triangle, because 9² + 12² is equal to {___}.',
      answers: ['right', '15²'],
      wordBank: ['right', 'acute', '15²', '144'],
      explanation: '9² + 12² = 81 + 144 = 225 = 15², so it is a right triangle.'
    },
    {
      id: 'mq-g7-10',
      lo: 'g7-pythagoras',
      type: 'drag',
      text: 'Match the right triangle side lengths (a, b) with their correct hypotenuse length (c):',
      pairs: [
        { item: '3 and 4', zone: 'Hypotenuse: 5' },
        { item: '6 and 8', zone: 'Hypotenuse: 10' },
        { item: '5 and 12', zone: 'Hypotenuse: 13' }
      ],
      explanation: '3² + 4² = 25 (c=5); 6² + 8² = 100 (c=10); 5² + 12² = 169 (c=13).'
    },
    {
      id: 'mq-g7-11',
      lo: 'g7-pythagoras',
      type: 'drag',
      text: 'Match the side lengths a and b with the correct square of the hypotenuse c²:',
      pairs: [
        { item: '1 and 2', zone: 'c²: 5' },
        { item: '2 and 3', zone: 'c²: 13' },
        { item: '3 and 3', zone: 'c²: 18' }
      ],
      explanation: '1² + 2² = 5; 2² + 3² = 13; 3² + 3² = 18.'
    },
    {
      id: 'mq-g7-12',
      lo: 'g7-pythagoras',
      type: 'drag',
      text: 'Match the hypotenuse length (c) and one side (a) with the remaining side length (b):',
      pairs: [
        { item: 'Hypotenuse 25, Side 7', zone: 'Remaining Side: 24' },
        { item: 'Hypotenuse 20, Side 12', zone: 'Remaining Side: 16' },
        { item: 'Hypotenuse 10, Side 6', zone: 'Remaining Side: 8' }
      ],
      explanation: '25² - 7² = 576 = 24²; 20² - 12² = 256 = 16²; 10² - 6² = 64 = 8².'
    }
  ]
};
