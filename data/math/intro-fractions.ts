import { MathTopicBundle } from './types';

export const introFractionsBundle: MathTopicBundle = {
  content: {
    topicId: 'g3-intro-fractions',
    grade: 'G3',
    name: 'Introduction to Fractions',
    icon: '🍕',
    recap: {
      title: 'Introduction to Fractions',
      sub: 'Grade 3 · Concept card',
      text: 'A **fraction** represents a part of a whole! Imagine a circular **Pizza**. The **denominator** (bottom number) shows how many equal slices the pizza is cut into. The **numerator** (top number) shows how many slices are selected or eaten. For example, **3/8** means 3 slices out of an 8-slice pizza!'
    },
    flashcard: {
      front: 'What is the difference between a Numerator and a Denominator?',
      back: 'The <strong>Numerator</strong> (top number) is the number of parts we have.<br>The <strong>Denominator</strong> (bottom number) is the total number of equal parts in the whole.'
    },
    sandbox: {
      type: 'pizza-slicer',
      caption: 'Slice the pizza and select pieces to build fractions! Toggle equivalent fraction mode to compare.'
    },
    motivational: "Let's slice some pizzas and discover fractions! 🍕"
  },
  questions: [
    {
      id: 'mq-g3-1',
      lo: 'g3-intro-fractions',
      type: 'mcq',
      text: 'If a pizza is cut into 8 equal slices and you eat 3 of them, what fraction of the pizza did you eat?',
      options: ['3/5', '5/8', '3/8', '8/3'],
      correct: 2,
      explanation: 'You ate 3 parts (numerator) out of a total of 8 parts (denominator), which is 3/8.'
    },
    {
      id: 'mq-g3-2',
      lo: 'g3-intro-fractions',
      type: 'mcq',
      text: 'What fraction of a shape is shaded if it is split into 4 equal parts and 2 parts are shaded?',
      options: ['1/4', '2/4', '4/2', '3/4'],
      correct: 1,
      explanation: '2 shaded parts out of 4 total parts is represented as 2/4.'
    },
    {
      id: 'mq-g3-3',
      lo: 'g3-intro-fractions',
      type: 'mcq',
      text: 'If you divide a candy bar into 3 equal pieces and give 1 piece to a friend, what fraction of the candy bar do you have left?',
      options: ['1/3', '2/3', '3/3', '1/2'],
      correct: 1,
      explanation: 'You gave away 1/3, leaving you with 2 pieces out of 3, which is 2/3.'
    },
    {
      id: 'mq-g3-4',
      lo: 'g3-intro-fractions',
      type: 'fill',
      text: "In the fraction 3/4, what do we call the top number '3'?",
      unit: '',
      answer: 'numerator',
      hint: 'It starts with N! It is the opposite of denominator.',
      explanation: 'The top number of a fraction is called the numerator, representing the parts selected.'
    },
    {
      id: 'mq-g3-5',
      lo: 'g3-intro-fractions',
      type: 'fill',
      text: "In the fraction 5/8, what do we call the bottom number '8'?",
      unit: '',
      answer: 'denominator',
      hint: 'It starts with D! It is the total number of parts.',
      explanation: 'The bottom number of a fraction is the denominator, showing the total number of equal pieces.'
    },
    {
      id: 'mq-g3-6',
      lo: 'g3-intro-fractions',
      type: 'fill',
      text: 'If a circle is cut into 6 equal parts, and 5 parts are colored, what is the numerator of the fraction representing the colored parts?',
      unit: '',
      answer: '5',
      hint: 'The numerator is the number of parts we have or select.',
      explanation: 'The number of colored parts is 5, which is the numerator.'
    },
    {
      id: 'mq-g3-7',
      lo: 'g3-intro-fractions',
      type: 'blanks',
      sentence: 'The top part of a fraction is the {___}, and the bottom part is the {___}.',
      answers: ['numerator', 'denominator'],
      wordBank: ['denominator', 'division', 'numerator', 'slice'],
      explanation: 'Fractions are written with a numerator on top and a denominator on the bottom.'
    },
    {
      id: 'mq-g3-8',
      lo: 'g3-intro-fractions',
      type: 'blanks',
      sentence: 'In the fraction 2/5, the numerator is {___} and the denominator is {___}.',
      answers: ['2', '5'],
      wordBank: ['2', '5', 'numerator', 'denominator'],
      explanation: '2 is the top number (numerator) and 5 is the bottom number (denominator).'
    },
    {
      id: 'mq-g3-9',
      lo: 'g3-intro-fractions',
      type: 'blanks',
      sentence: 'A fraction with a numerator of 1 and denominator of 3 is {___}, and a fraction with numerator 3 and denominator 4 is {___}.',
      answers: ['1/3', '3/4'],
      wordBank: ['1/3', '3/4', '3/1', '4/3'],
      explanation: 'The fractions are 1/3 and 3/4.'
    },
    {
      id: 'mq-g3-10',
      lo: 'g3-intro-fractions',
      type: 'drag',
      text: 'Match each fraction with its visual description:',
      pairs: [
        { item: '1/2', zone: 'Half a pizza' },
        { item: '1/4', zone: 'Quarter a pizza' },
        { item: '4/4', zone: 'One whole pizza' }
      ],
      explanation: '1/2 is half, 1/4 is a quarter, and 4/4 is four quarters, which makes one whole.'
    },
    {
      id: 'mq-g3-11',
      lo: 'g3-intro-fractions',
      type: 'drag',
      text: 'Match each fraction with its visual description:',
      pairs: [
        { item: '3/4', zone: 'Three quarters of a pizza' },
        { item: '2/3', zone: 'Two thirds of a pizza' },
        { item: '1/6', zone: 'One sixth of a pizza' }
      ],
      explanation: '3/4 is three quarters, 2/3 is two thirds, and 1/6 is one out of six parts.'
    },
    {
      id: 'mq-g3-12',
      lo: 'g3-intro-fractions',
      type: 'drag',
      text: 'Match each fraction of a shaded circle with its fraction value:',
      pairs: [
        { item: '3/6', zone: 'Half the circle shaded' },
        { item: '5/8', zone: 'Five out of eight parts shaded' },
        { item: '1/3', zone: 'One third of the circle shaded' }
      ],
      explanation: '3/6 is half, 5/8 is five-eighths, and 1/3 is one-third.'
    }
  ]
};
