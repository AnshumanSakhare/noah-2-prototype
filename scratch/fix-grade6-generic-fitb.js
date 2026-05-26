const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT = process.cwd();

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

const updates = [
  {
    id: "726431f1-0676-4b05-9ab9-59483b82bc9c",
    question_text: "Simplify 7x + 3x. Answer: ____.",
    explanation:
      "Both terms are like terms because they both have x. Add the coefficients 7 and 3 to get 10, so the simplified expression is 10x.",
    answer: "10x",
    distractors: ["21x", "10", "7x3x"],
  },
  {
    id: "b6ed7301-b3a0-4f91-99e7-6a71f7e30f1a",
    question_text: "Expand 3(x + 4). Answer: ____.",
    explanation:
      "Distribute 3 to both terms inside the bracket: 3 x x = 3x and 3 x 4 = 12. So the expanded expression is 3x + 12.",
    answer: "3x + 12",
    distractors: ["3x + 4", "x + 12", "7x"],
  },
  {
    id: "8768e612-5c83-443f-807d-d5f84af5a085",
    question_text: "Evaluate 3x + 5 when x = 4. Answer: ____.",
    explanation: "Substitute x = 4 into 3x + 5: 3(4) + 5 = 12 + 5 = 17.",
    answer: "17",
    distractors: ["12", "20", "27"],
  },
  {
    id: "aad5aace-ebe3-4fd9-aa77-123458060dd3",
    question_text:
      "Find the area of a rectangular floor that is 8 m long and 5 m wide. Answer: ____ m^2.",
    explanation:
      "Area of a rectangle = length x width = 8 x 5 = 40, so the area is 40 m^2.",
    answer: "40",
    distractors: ["13", "26", "80"],
  },
  {
    id: "1a19d180-a7e4-4746-874d-93b2a8a5a12f",
    question_text:
      "How many rectangular faces are in the net of a triangular prism? Answer: ____.",
    explanation:
      "A triangular prism has 2 triangular faces and 3 rectangular faces, so its net contains 3 rectangles.",
    answer: "3",
    distractors: ["1", "2", "6"],
  },
  {
    id: "41f7174d-1cde-4bfa-8aac-03650f2589e3",
    question_text:
      "Find the surface area of a rectangular prism with length 6 cm, width 4 cm, and height 3 cm. Answer: ____ cm^2.",
    explanation:
      "Surface area of a rectangular prism is 2(lw + lh + wh). Here, 2(6x4 + 6x3 + 4x3) = 2(24 + 18 + 12) = 2x54 = 108, so the surface area is 108 cm^2.",
    answer: "108",
    distractors: ["72", "84", "96"],
  },
  {
    id: "dba5875b-2f72-49db-8d14-6a459c006e32",
    question_text: "How many equal squares are in a cube net? Answer: ____.",
    explanation:
      "A cube has 6 square faces, so any net of a cube is made of 6 equal squares.",
    answer: "6",
    distractors: ["3", "4", "8"],
  },
  {
    id: "c7fa3b25-2434-42a8-953c-9eb5dc2ce068",
    question_text: "Evaluate 2^4. Answer: ____.",
    explanation: "2^4 means 2 x 2 x 2 x 2, which equals 16.",
    answer: "16",
    distractors: ["6", "8", "24"],
  },
  {
    id: "84f0b5df-7871-40b9-a44d-a545689be67e",
    question_text:
      "Find the HCF of 18 and 24 using prime factorisation. Answer: ____.",
    explanation:
      "18 = 2 x 3 x 3 and 24 = 2 x 2 x 2 x 3. The common prime factors are 2 and 3, so the HCF is 2 x 3 = 6.",
    answer: "6",
    distractors: ["8", "12", "72"],
  },
  {
    id: "bbe7aa4d-d35a-4785-b4a1-8948d4960e65",
    question_text: "Convert 3/4 to a decimal. Answer: ____.",
    explanation: "3/4 means 3 divided by 4, which equals 0.75.",
    answer: "0.75",
    distractors: ["0.25", "0.34", "0.8"],
  },
  {
    id: "b53a27d7-5f50-4bac-972f-db6a956f7a18",
    question_text: "Calculate 5/8 - 1/8. Answer: ____.",
    explanation:
      "When denominators are the same, subtract the numerators: 5/8 - 1/8 = 4/8.",
    answer: "4/8",
    distractors: ["4/16", "5/7", "6/8"],
  },
  {
    id: "d8f14ffe-d518-4e28-89ec-49e9466d73ed",
    question_text: "Calculate 7/8 - 3/8. Answer: ____.",
    explanation:
      "With like denominators, subtract the numerators: 7 - 3 = 4, so 7/8 - 3/8 = 4/8.",
    answer: "4/8",
    distractors: ["10/8", "3/5", "4/16"],
  },
  {
    id: "41c5064d-89a3-4139-8025-e19a452775d1",
    question_text: "Calculate -8 + 3. Answer: ____.",
    explanation:
      "Adding 3 to -8 moves 3 steps right on the number line: -8, -7, -6, -5. So the result is -5.",
    answer: "-5",
    distractors: ["-11", "5", "11"],
  },
  {
    id: "7de32649-f557-4e77-9fe2-e52ac188b226",
    question_text:
      "Write an algebraic expression for the sum of p and 12. Answer: ____.",
    explanation:
      "The word sum means addition, so the expression for the sum of p and 12 is p + 12.",
    answer: "p + 12",
    distractors: ["12 - p", "12p", "p / 12"],
  },
  {
    id: "e84e7927-8582-4e15-ae67-3dbf18331879",
    question_text:
      "Write an equation for the total cost c of buying notebooks that cost $4 each. Use n for the number of notebooks. Answer: ____.",
    explanation:
      "If each notebook costs $4, the total cost is 4 times the number of notebooks n, so c = 4n.",
    answer: "c = 4n",
    distractors: ["c = 4 - n", "c = n + 4", "c = n - 4"],
  },
  {
    id: "9ca69706-715c-42e0-90e2-88b18c66526b",
    question_text:
      "Ben is in seat 4 in a row numbered 1 to 5 from left to right. Write Ben's position in words. Answer: ____.",
    explanation: "Seat 4 means Ben is in the fourth position in the row.",
    answer: "fourth",
    distractors: ["fifth", "first", "second"],
  },
  {
    id: "a5949747-a941-44f7-8148-58f4e84fa715",
    question_text:
      "What is the probability of rolling a fair six-sided die and getting a 4? Answer: ____.",
    explanation:
      "A fair six-sided die has 6 equally likely outcomes, and only 1 of them is a 4. So the probability is 1/6.",
    answer: "1/6",
    distractors: ["1/2", "1/3", "1/4"],
  },
  {
    id: "2ea4fdcc-dcc4-4db2-8653-cdd1253f7302",
    question_text:
      "How many outcomes are there when flipping 1 coin and rolling 1 six-sided die? Answer: ____.",
    explanation:
      "A coin has 2 outcomes and a six-sided die has 6 outcomes, so the total number of outcomes is 2 x 6 = 12.",
    answer: "12",
    distractors: ["6", "8", "18"],
  },
  {
    id: "f03c5c2a-c53f-4a47-b0bb-2d5223fdbcb9",
    question_text:
      "Write the sample space for flipping one coin. Answer: ____.",
    explanation:
      "A single coin has exactly two possible outcomes: heads (H) or tails (T), so the sample space is {H, T}.",
    answer: "{H, T}",
    distractors: ["{1, 2}", "{H, T, HT}", "{HH, HT}"],
  },
  {
    id: "3b1ccce9-c9e7-407e-a741-253530788d6e",
    question_text:
      "Write the intersection of A and B when A = {1, 3, 5, 7} and B = {3, 7, 9}. Answer: ____.",
    explanation:
      "The intersection contains the elements common to both sets. The numbers 3 and 7 appear in both A and B, so A intersection B = {3, 7}.",
    answer: "{3, 7}",
    distractors: ["{1, 5, 9}", "{1, 3, 5, 7, 9}", "{3, 7, 9}"],
  },
  {
    id: "66130467-2a72-4f16-95af-d200e1948a8b",
    question_text:
      "Write the subset of U that contains the even numbers when U = {1, 2, 3, 4, 5, 6}. Answer: ____.",
    explanation:
      "A subset contains only elements from U. The even numbers in U are 2, 4, and 6, so the subset is {2, 4, 6}.",
    answer: "{2, 4, 6}",
    distractors: ["{0, 1, 3}", "{2, 4, 8}", "{5, 6, 7}"],
  },
  {
    id: "ee531798-0659-491b-9500-5b7fefc4af4a",
    question_text:
      "Write the roster form of the even numbers from 2 to 10. Answer: ____.",
    explanation:
      "The even numbers from 2 to 10 are 2, 4, 6, 8, and 10, so the roster form is {2, 4, 6, 8, 10}.",
    answer: "{2, 4, 6, 8, 10}",
    distractors: [
      "{0, 2, 4, 6, 8, 10}",
      "{1, 3, 5, 7, 9}",
      "{2, 3, 4, 5, 6, 7, 8, 9, 10}",
    ],
  },
  {
    id: "5079a603-d33f-4ecc-83f7-cea2c0115ab5",
    question_text:
      "In a survey of 200 people, 25% chose Sports. How many people chose Sports? Answer: ____.",
    explanation:
      "25% means one quarter. One quarter of 200 is 50, so 50 people chose Sports.",
    answer: "50",
    distractors: ["25", "75", "100"],
  },
  {
    id: "f306a024-baae-41cb-8a19-086c43e8ebeb",
    question_text:
      "The numbers of books read are 12, 15, 9, and 18. Write the highest number. Answer: ____.",
    explanation:
      "Compare the numbers 12, 15, 9, and 18. The highest value is 18.",
    answer: "18",
    distractors: ["9", "12", "15"],
  },
  {
    id: "b62be089-c835-4229-aea2-f2882a698a9c",
    question_text: "Find the mean of the data set 6, 8, 10, 12. Answer: ____.",
    explanation:
      "Add the numbers: 6 + 8 + 10 + 12 = 36. Then divide by 4. The mean is 9.",
    answer: "9",
    distractors: ["8", "10", "11"],
  },
  {
    id: "6d96c94d-12ea-4a88-8f48-030861ad2891",
    question_text:
      "Find the HCF of 48 and 72 using the Vedic HCF method. Answer: ____.",
    explanation:
      "The highest common factor of 48 and 72 is 24 because 24 divides both numbers exactly.",
    answer: "24",
    distractors: ["12", "36", "48"],
  },
  {
    id: "d6bd7f8c-2181-4904-a0ef-3b64e7191726",
    question_text:
      "Calculate 234 / 9 using the Vedic division shortcut. Answer: ____.",
    explanation: "234 / 9 = 26 because 9 x 26 = 234.",
    answer: "26",
    distractors: ["24", "28", "29"],
  },
];

async function main() {
  loadEnv();
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 5432),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  let updated = 0;
  for (const row of updates) {
    const result = await client.query(
      `
      UPDATE final_content_questions
      SET
        question_text = $2,
        explanation = $3,
        generation_metadata = jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(generation_metadata, '{}'::jsonb),
              '{payload,answer}',
              to_jsonb($4::text),
              true
            ),
            '{payload,hint}',
            to_jsonb($3::text),
            true
          ),
          '{payload,distractors}',
          to_jsonb($5::text[]),
          true
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
      `,
      [row.id, row.question_text, row.explanation, row.answer, row.distractors],
    );
    updated += result.rowCount;
  }

  console.log(`Updated ${updated} rows.`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
