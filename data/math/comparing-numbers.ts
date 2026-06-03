import { MathTopicBundle } from './types';

export const comparingNumbersBundle: MathTopicBundle = {
  content: {
    topicId: 'kg-comparing-numbers',
    grade: 'KG',
    name: 'Comparing Numbers',
    icon: '⚖️',
    recap: {
      title: 'Comparing Numbers',
      sub: 'KG · Concept card',
      text: 'Comparing numbers means looking at two numbers and seeing which one is **larger (greater)**, **smaller (less)**, or if they are **equal (the same)**. We can use a **Balance Scale** to weigh them. A heavier side with the bigger number tilts downward! The alligator always wants to eat the bigger number: **>** means greater than, and **<** means less than.'
    },
    flashcard: {
      front: 'What do the symbols >, <, and = mean in math?',
      back: '<strong>&gt;</strong> means Greater Than (larger)<br><strong>&lt;</strong> means Less Than (smaller)<br><strong>=</strong> means Equal (exactly the same)'
    },
    sandbox: {
      type: 'balance-scale',
      caption: 'Tap numbers to place them on the scale. See which side weighs more!'
    },
    motivational: "Let's weigh some numbers and see which one is bigger! ⚖️"
  },
  questions: [
    // Game 1: Tap the Bigger Number (3 rounds)
    {
      id: 'mq-kg-g1-1',
      lo: 'kg-comparing-numbers',
      type: 'game-tap',
      text: 'Which side has more? Tap the bigger number!',
      numberA: 8,
      numberB: 7,
      correctSide: 'A',
      hideNumbers: true,
      explanation: '8 is bigger than 7. You can see 8 has more items!'
    },
    {
      id: 'mq-kg-g1-2',
      lo: 'kg-comparing-numbers',
      type: 'game-tap',
      text: 'Count the dots! Which side has more?',
      numberA: 8,
      numberB: 9,
      correctSide: 'B',
      hideNumbers: true,
      explanation: '9 is bigger than 8. You can see 9 has more dots!'
    },
    {
      id: 'mq-kg-g1-3',
      lo: 'kg-comparing-numbers',
      type: 'game-tap',
      text: 'Count carefully! Which side has more dots?',
      numberA: 7,
      numberB: 8,
      correctSide: 'B',
      hideNumbers: true,
      explanation: '8 is bigger than 7. 8 has just one more dot than 7!'
    },
    // Game 2: Feed the Alligator (3 rounds)
    {
      id: 'mq-kg-g2-1',
      lo: 'kg-comparing-numbers',
      type: 'game-compare',
      text: 'The alligator is hungry and wants to eat the bigger number! Which symbol goes between 5 and 4?',
      numberA: 5,
      numberB: 4,
      correctSymbol: '>',
      explanation: '5 is bigger than 4! The symbol > points the open side toward 5 because the alligator eats 5.'
    },
    {
      id: 'mq-kg-g2-2',
      lo: 'kg-comparing-numbers',
      type: 'game-compare',
      text: 'The alligator is hungry and wants to eat the bigger number! Which symbol goes between 7 and 8?',
      numberA: 7,
      numberB: 8,
      correctSymbol: '<',
      explanation: '8 is bigger than 7! The symbol < points the open side toward 8 because the alligator eats 8.'
    },
    {
      id: 'mq-kg-g2-3',
      lo: 'kg-comparing-numbers',
      type: 'game-compare',
      text: 'Wow, both numbers look the same! Which symbol shows they are equal?',
      numberA: 6,
      numberB: 6,
      correctSymbol: '=',
      explanation: '6 and 6 are exactly the same size! The = sign means both numbers are equal.'
    },
    // Game 3: Number Tower Sort (3 rounds)
    {
      id: 'mq-kg-g3-1',
      lo: 'kg-comparing-numbers',
      type: 'game-sort',
      text: 'Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!',
      numbers: [7, 2, 5],
      correctOrder: [2, 5, 7],
      useDots: [true, false, true],
      explanation: 'In order from smallest to biggest, the numbers are 2, 5, and then 7.'
    },
    {
      id: 'mq-kg-g3-2',
      lo: 'kg-comparing-numbers',
      type: 'game-sort',
      text: 'Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!',
      numbers: [9, 4, 6],
      correctOrder: [4, 6, 9],
      useDots: [false, true, true],
      explanation: 'In order from smallest to biggest, the numbers are 4, 6, and then 9.'
    },
    {
      id: 'mq-kg-g3-3',
      lo: 'kg-comparing-numbers',
      type: 'game-sort',
      text: 'Sort the number blocks from SMALLEST to BIGGEST to build the tall tower!',
      numbers: [6, 2, 8, 4],
      correctOrder: [2, 4, 6, 8],
      useDots: [true, false, true, false],
      explanation: 'In order from smallest to biggest, the numbers are 2, 4, 6, and then 8.'
    }
  ]
};
