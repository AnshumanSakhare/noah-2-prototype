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
    id: "0211462c-d2b6-4b2e-a669-39669d88df1c",
    question_text: "Expand 5(a + 2). Answer: ____.",
    explanation:
      "The 5 multiplies both terms inside the bracket: 5 x a = 5a and 5 x 2 = 10. So 5(a + 2) = 5a + 10.",
    answer: "5a + 10",
    distractors: ["10a", "5a + 2", "a + 10"],
  },
  {
    id: "528854b0-8207-45b4-b550-d2fdb8bdad26",
    question_text: "Simplify 4a + 2a. Answer: ____.",
    explanation:
      "4a and 2a are like terms, so add the coefficients: 4 + 2 = 6. That gives 6a.",
    answer: "6a",
    distractors: ["6a^2", "8a", "cannot be simplified"],
  },
  {
    id: "4202d7b0-9cec-427c-8e30-ef2b98e7cdd4",
    question_text: "Evaluate 2y - 1 when y = 6. Answer: ____.",
    explanation: "Substitute y = 6 into 2y - 1: 2(6) - 1 = 12 - 1 = 11.",
    answer: "11",
    distractors: ["5", "7", "12"],
  },
  {
    id: "d1c1ae58-46d4-4b72-8524-59667a551706",
    question_text:
      "Find the area of a parallelogram with base 9 m and height 4 m. Answer: ____ m^2.",
    explanation:
      "Area of a parallelogram = base x height = 9 x 4 = 36, so the area is 36 m^2.",
    answer: "36",
    distractors: ["13", "18", "72"],
  },
  {
    id: "5171b02e-2e57-4101-9c5e-d11936f60ca6",
    question_text:
      "Find the surface area of a rectangular prism with dimensions 5 cm by 2 cm by 4 cm. Answer: ____ cm^2.",
    explanation:
      "Use 2(lw + lh + wh). Here, 2(5x2 + 5x4 + 2x4) = 2(10 + 20 + 8) = 2x38 = 76, so the surface area is 76 cm^2.",
    answer: "76",
    distractors: ["38", "40", "56"],
  },
  {
    id: "008d3c16-f3ed-4d0d-92f3-81eccc59e28d",
    question_text: "Simplify 2^6 / 2^2. Answer: ____.",
    explanation:
      "When dividing powers with the same base, subtract the exponents: 2^6 / 2^2 = 2^(6 - 2) = 2^4.",
    answer: "2^4",
    distractors: ["2^3", "2^8", "4^4"],
  },
  {
    id: "97ff26ec-3a39-4cb0-ad41-071d9ac3359f",
    question_text: "Write 5^3 as repeated multiplication. Answer: ____.",
    explanation:
      "In 5^3, the base is 5 and the exponent 3 tells how many times 5 is used as a factor: 5 x 5 x 5.",
    answer: "5 x 5 x 5",
    distractors: ["5 + 5 + 5", "5 x 3", "3 x 3 x 3 x 3 x 3"],
  },
  {
    id: "05ba2ac1-a87a-4a14-a3f8-93a9aa824a95",
    question_text:
      "Write the prime factorisation of 18 in index notation. Answer: ____.",
    explanation: "18 = 2 x 3 x 3, which is 2 x 3^2 in index notation.",
    answer: "2 x 3^2",
    distractors: ["1 x 18", "2^2 x 3", "6 x 3"],
  },
  {
    id: "1b5e09f2-9280-48db-ab6b-e50d18c74944",
    question_text:
      "Find the LCM of 6 and 8 using prime factorisation. Answer: ____.",
    explanation:
      "6 = 2 x 3 and 8 = 2 x 2 x 2. Taking each prime factor at its greatest power gives 2 x 2 x 2 x 3 = 24, so the LCM is 24.",
    answer: "24",
    distractors: ["12", "14", "48"],
  },
  {
    id: "c1a14bf2-00e2-4b99-a8f5-8ea39fffc02b",
    question_text: "Convert 0.6 to a percentage. Answer: ____.",
    explanation:
      "To convert a decimal to a percentage, multiply by 100. So 0.6 = 60%.",
    answer: "60%",
    distractors: ["0.6%", "6%", "600%"],
  },
  {
    id: "cd2144c7-90d3-4d28-b733-0b8a7b138657",
    question_text:
      "Which two values are equal: 3/4, 0.72, and 75%? Write the pair. Answer: ____.",
    explanation:
      "3/4 = 0.75 and 75% = 0.75, so they are equal. Since 0.72 is smaller than 0.75, it is not equal to either of them.",
    answer: "3/4 and 75%",
    distractors: ["0.72 and 75%", "3/4 and 0.72", "all three are equal"],
  },
  {
    id: "9edd2b89-3aea-49e2-a29e-b0f64dc7cccd",
    question_text: "Calculate -24 / 6. Answer: ____.",
    explanation:
      "A negative divided by a positive gives a negative result. Since 24 / 6 = 4, -24 / 6 = -4.",
    answer: "-4",
    distractors: ["-30", "4", "30"],
  },
  {
    id: "bfde3ae4-82ea-4831-b3bd-11448a6cd2bd",
    question_text:
      "A bank balance is -$12 and then $20 is deposited. What is the new balance? Answer: ____.",
    explanation:
      "A deposit adds money: -12 + 20 = 8, so the new balance is $8.",
    answer: "$8",
    distractors: ["-$8", "$32", "-$12"],
  },
  {
    id: "ca650fc5-487f-497d-90e7-6c9bc571311e",
    question_text: "Calculate 6 - 9. Answer: ____.",
    explanation:
      "Starting at 6 and moving 9 steps left gives -3. So 6 - 9 = -3.",
    answer: "-3",
    distractors: ["-15", "3", "15"],
  },
  {
    id: "024a1a13-4708-48b8-bf8b-c09a9c33b90c",
    question_text: "Write the numbers that integers include. Answer: ____.",
    explanation:
      "Integers are the set of whole numbers and their negatives, including 0.",
    answer: "negative numbers, 0, and positive whole numbers",
    distractors: [
      "fractions and decimals",
      "only counting numbers",
      "only negative numbers",
    ],
  },
  {
    id: "a79f18ea-fe45-41ee-833d-1d05d96d8b66",
    question_text: "Compare -3 and 2 using < or >. Answer: ____.",
    explanation:
      "Any negative integer is less than any positive integer, so -3 < 2.",
    answer: "-3 < 2",
    distractors: ["-3 = 2", "-3 > 2", "2 < -3"],
  },
  {
    id: "aaae4b96-ad85-4af1-983c-1274225d5bf5",
    question_text:
      "In the expression 9 + y, which term is the variable? Answer: ____.",
    explanation:
      "In 9 + y, y can change, so it is the variable. The number 9 stays the same, so it is the constant.",
    answer: "y",
    distractors: ["9", "9 + y", "there is no variable"],
  },
  {
    id: "15a651cb-4980-424f-b3bf-5f12028b864a",
    question_text: "Does y = 14 satisfy the equation y - 6 = 8? Answer: ____.",
    explanation:
      "Substitute y = 14 into y - 6 = 8. This gives 14 - 6 = 8, which is true, so y = 14 satisfies the equation.",
    answer: "yes",
    distractors: ["equation becomes 14 - 6 = 6", "left side becomes 6", "no"],
  },
  {
    id: "d3f5ceab-8a13-4040-9cc8-8acc3908261a",
    question_text:
      "In the equation d = 12w, how many miles are traveled each hour? Answer: ____.",
    explanation:
      "d = 12w means the distance is 12 times the number of hours, so the rate is 12 miles each hour.",
    answer: "12",
    distractors: ["0", "1", "w / 12"],
  },
  {
    id: "1e841b66-8153-4636-b771-40396ae30ecf",
    question_text:
      "What is the rule for the pattern 14, 17, 20, 23, 26? Answer: ____.",
    explanation:
      "Each number is 3 more than the one before it: 14 to 17, 17 to 20, and so on. So the pattern adds 3 each time.",
    answer: "add 3",
    distractors: ["add 2", "double each term", "subtract 3"],
  },
  {
    id: "3e9fb738-8d21-4ed8-bb01-2f482f0fd26e",
    question_text:
      "What is the probability of getting heads when flipping a fair coin once? Answer: ____.",
    explanation:
      "A fair coin has 2 equally likely outcomes: heads and tails. So the probability of heads is 1/2.",
    answer: "1/2",
    distractors: ["1", "1/3", "2"],
  },
  {
    id: "2a592940-3e39-42d8-aa89-83d9f3ba158c",
    question_text:
      "How many outcomes are in the sample space for tossing two coins? Answer: ____.",
    explanation:
      "Two coin tosses produce 4 ordered outcomes: HH, HT, TH, and TT.",
    answer: "4",
    distractors: ["2", "3", "6"],
  },
  {
    id: "651e4bc2-d7e0-4fd6-967e-aed5c34d9112",
    question_text:
      "Write the sample space for rolling one standard six-sided die. Answer: ____.",
    explanation:
      "A standard six-sided die is numbered 1 to 6, so its sample space is {1, 2, 3, 4, 5, 6}.",
    answer: "{1, 2, 3, 4, 5, 6}",
    distractors: ["{0, 1, 2, 3, 4, 5, 6}", "{2, 4, 6}", "8 outcomes"],
  },
  {
    id: "aee4d2b8-a890-469e-8f45-b0e82e568e52",
    question_text:
      "Write the intersection of P and Q when P = {a, e, i} and Q = {e, i, o}. Answer: ____.",
    explanation:
      "The common elements in P and Q are e and i, so P intersection Q = {e, i}.",
    answer: "{e, i}",
    distractors: ["{a, o}", "no common elements", "{a, e, i, o}"],
  },
  {
    id: "7b8e1e3b-a0b2-4a2e-939d-f681a90f17a6",
    question_text: "What is a set? Answer: ____.",
    explanation:
      "A set is a well-defined collection of objects. Sets can contain numbers, letters, shapes, or other clearly chosen objects.",
    answer: "a well-defined collection of objects",
    distractors: [
      "a collection that must contain only numbers",
      "a group that cannot be written with braces",
      "a collection that must have at least 10 elements",
    ],
  },
  {
    id: "f0e416bc-fa2a-4312-8416-e2a8de3adb17",
    question_text: "How many elements are in the empty set? Answer: ____.",
    explanation: "The empty set has no elements. It is written as {} or ∅.",
    answer: "0",
    distractors: ["1", "{0}", "cannot be determined"],
  },
  {
    id: "22d845a6-2bca-4133-b4ba-96a24cc93258",
    question_text:
      "The temperatures over four days were 21°C, 24°C, 24°C, and 19°C. Which temperature appears twice? Answer: ____.",
    explanation:
      "The list is 21, 24, 24, and 19. The value 24°C appears two times.",
    answer: "24°C",
    distractors: ["19°C", "21°C", "all four temperatures are different"],
  },
  {
    id: "b2014146-deaf-4247-a515-40526a90fb31",
    question_text: "Find the mode of the data set 3, 5, 5, 7, 9. Answer: ____.",
    explanation:
      "The mode is the value that appears most often. In 3, 5, 5, 7, 9, the number 5 appears twice, more than any other number.",
    answer: "5",
    distractors: ["3", "7", "there is no mode"],
  },
  {
    id: "bc23b06f-6e3d-4d41-a19f-a7dc7ed39db4",
    question_text: "What is the median of a set of numbers? Answer: ____.",
    explanation:
      "The median is the middle value when the data is arranged in order.",
    answer: "the middle value in order",
    distractors: [
      "the largest number",
      "the most common value",
      "the difference between largest and smallest",
    ],
  },
  {
    id: "44ca6681-443c-4ec5-bdd2-b3c4809d3612",
    question_text: "Find the HCF of 18 and 30. Answer: ____.",
    explanation:
      "18 and 30 are both divisible by 6, and no larger common factor divides both. So the HCF is 6.",
    answer: "6",
    distractors: ["3", "9", "15"],
  },
  {
    id: "574f5422-b728-4dfd-a74c-a8c73bb1c79d",
    question_text: "Calculate 121 / 11 using a Vedic shortcut. Answer: ____.",
    explanation: "121 divided by 11 equals 11, since 11 x 11 = 121.",
    answer: "11",
    distractors: ["9", "10", "12"],
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
