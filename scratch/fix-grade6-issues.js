const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT = process.cwd();

for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const i = trimmed.indexOf("=");
  if (i <= 0) continue;
  process.env[trimmed.slice(0, i).trim()] = trimmed
    .slice(i + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const updates = [
  {
    id: "bd502635-3619-4a3d-a3d2-a6ba85c946e1",
    explanation:
      "First multiply: 134,000 x 68 = 9,112,000. Then subtract the 212,000 faulty batteries: 9,112,000 - 212,000 = 8,900,000. Option B is the total before removing the faulty batteries.",
  },
  {
    id: "016de296-342c-43f3-967b-611788cfc5fc",
    question_text:
      "A triangular-prism camping shelter uses fabric on every face except the bottom rectangle along the 14 m side of the triangular cross-section. The triangular ends are congruent right triangles with side lengths 14 m, 48 m, and 50 m, and each triangular end has area 336 m^2. The total fabric used is 1848 m^2. Choose the prism length.",
    explanation:
      "The two triangular ends use 2 x 336 = 672 m^2 of fabric. The remaining fabric is 1848 - 672 = 1176 m^2 for the two side rectangles that are covered. Their combined width is 48 + 50 = 98, so 98L = 1176 and L = 12 m.",
  },
  {
    id: "03c9217a-5544-4196-8094-3c0108063c58",
    question_text:
      "A triangular prism has right-triangle ends with side lengths 5 cm, 12 cm, and 13 cm. Method A uses side rectangles of widths 5, 12, and 13. Method B uses side rectangles of widths 5, 5, and 13. Which method makes a correct net?",
  },
  {
    id: "087b3f95-91d2-47cb-a8a8-24c72a428647",
    question_text:
      "An 8 cm x 5 cm x 3 cm rectangular prism is drawn as a net. Step 1 uses a strip of rectangles 8x5, 5x3, 8x5, 5x3. Step 2 attaches one 8x3 rectangle to the first 8x5 face. Step 3 attaches the other 8x3 rectangle to the third rectangle in the strip. Which step needs correction?",
  },
  {
    id: "48af30c3-481b-42ee-b5c7-eff68382fa68",
    question_text:
      "A 6 cm x 4 cm x 2 cm rectangular prism is shown with two possible nets. Method A uses a strip 6x4, 4x2, 6x4, 4x2 and adds the two 6x2 faces as ends. Method B uses a strip 6x2, 2x4, 6x2, 2x4 and adds the two 6x4 faces as ends. Which judgment is correct?",
  },
  {
    id: "4afb25d3-3769-4aed-8b78-5b31aba4d05b",
    question_text:
      "A square-based pyramid cover is compared with four net patterns. P has one square with a triangle on each side. Q has one square with three attached triangles and a fourth triangle attached to one of them. R has four triangles in a row with the square attached to the middle triangle. S has one square, two triangles, and two extra squares. Which pattern must fold into the pyramid?",
  },
  {
    id: "a4e20113-34b2-40db-afe2-4a017252f359",
    explanation:
      "The area of one triangular base is 1/2 x 3 x 4 = 6 cm^2, so the two triangular ends total 12 cm^2. The lateral area is length x perimeter of the triangle = 10 x (3 + 4 + 5) = 120 cm^2. Total surface area = 120 + 12 = 132 cm^2.",
    options: [
      { text: "132 cm^2", correct: true },
      { text: "72 cm^2", correct: false },
      { text: "126 cm^2", correct: false },
      { text: "120 cm^2", correct: false },
    ],
  },
  {
    id: "baab8535-fbcb-43eb-97b3-f4808f87ad45",
    explanation:
      "For a rectangular prism, surface area = 2(lw + lh + wh). Here that is 2(10 x 3 + 10 x 4 + 3 x 4) = 2(30 + 40 + 12) = 2 x 82 = 164 cm^2. The other choices either miss a face pair or double the total incorrectly.",
    options: [
      { text: "92 cm^2", correct: false },
      { text: "164 cm^2", correct: true },
      { text: "52 cm^2", correct: false },
      { text: "208 cm^2", correct: false },
    ],
  },
  {
    id: "672f457b-c609-42f7-9aef-1255200a3629",
    question_text: "Which type of angle is less than 90 degrees?",
  },
  {
    id: "91bccb3f-6dea-4f81-b4af-41443538ffb5",
    question_text: "Which pair has exactly the same value: 0.125, 12%, 1/8, and 0.13?",
  },
  {
    id: "fa731c6e-4e28-4329-bc14-bfded15fd1da",
    question_text: "Which statement correctly compares 0.125, 12%, 1/8, and 0.13?",
  },
  {
    id: "3ded0adf-324d-4d08-a802-4f7de8133426",
    question_text: "What is 3/8 + 2/8?",
  },
  {
    id: "ae41f483-f593-4a54-b82d-962f30a0b0ba",
    question_text: "Add the fractions 3/8 and 2/8.",
  },
  {
    id: "20c9a8fd-f7fe-4af3-9233-d569f6efbdab",
    question_text: "Find the circumference of a circle with radius 5 cm. Use pi = 3.14.",
  },
  {
    id: "38e9f177-317b-4566-8064-f291fb591f9b",
    question_text: "Find the area of a circle with diameter 10 cm. Use pi = 3.14.",
  },
  {
    id: "50f72d39-30b1-4083-958d-79e37f26ec01",
    question_text: "Find the circumference of a circle with radius 7 m. Use pi = 3.14.",
  },
  {
    id: "56a7f66d-e12d-4641-94a6-9f4f4030280f",
    question_text: "Find the circumference of a circle with diameter 8 cm. Use pi = 3.14.",
  },
  {
    id: "584379f6-2d6f-4593-9a35-d51a06362415",
    question_text: "How many different diameters can be drawn in a circle?",
  },
  {
    id: "69d71397-6d66-4729-9e31-2b5ce030b118",
    question_text: "Find the area of a circle with radius 3 cm. Use pi = 3.14.",
  },
  {
    id: "6d2ec647-6bc8-4bfc-b63a-e204a2bc5b90",
    question_text: "Find the area of a circle with radius 4 cm. Use pi = 3.14.",
  },
  {
    id: "84732d74-dc84-4cb4-8df5-87d037242434",
    question_text: "A diagram shows one diameter of a circle. How many diameters can the circle have in total?",
  },
  {
    id: "cfcbfff7-f18a-44b8-9a83-aa4e0b895d06",
    question_text: "Classify a 45-degree angle.",
  },
  {
    id: "01d7e2dd-2048-4a41-9a9c-cbd79380a65c",
    question_text:
      "A vertical mirror reflects the code [heart, right arrow, capital B]. The heart stays the same, the right arrow flips direction, and B becomes a different left-right shape. How many symbols look different in the mirror image?",
  },
  {
    id: "1303aaac-7e05-449d-ae07-7581b24b619b",
    question_text:
      "In each row, the third box keeps symbols that appear in exactly one of the first two boxes. Row 1: {star, dot} and {dot, line} gives {star, line}. Row 2: {triangle, line} and {line, circle} gives {triangle, circle}. Row 3 starts with {star, triangle, circle} and {triangle, square}. What should the third box be?",
  },
  {
    id: "776ee3dd-3a09-46d2-a243-8288f30ba2a9",
    explanation:
      "Reverse 421 to get 124. Then 421 + 124 = 545. Dividing by 3 does not give a whole number, so the correct method is to leave the result as 545 / 3. The other choices either subtract instead of add or claim a wrong exact value.",
    options: [
      { text: "(421 + 124) / 3 = 182", correct: false },
      { text: "(421 + 124) / 3 = 181", correct: false },
      { text: "(421 + 124) / 3 = 545 / 3", correct: true },
      { text: "(421 - 124) / 3 = 99", correct: false },
    ],
  },
  {
    id: "14f8b62e-ba45-4533-8875-e21e7251a3dc",
    explanation:
      "Test the seat rules step by step. Ayaan is fixed at 4, Farah cannot sit at 3 or 5, and Charu must be immediately right of Dev. The only arrangement that satisfies all conditions is Eshan 1, Bhavya 2, Gopal 3, Ayaan 4, Dev 5, Charu 6, and Farah 7. So Bhavya must be at seat 2.",
  },
  {
    id: "8da6839e-5c0b-4208-ba7b-f7d17b79c47b",
    question_text:
      "A fair die is rolled and a fair coin is tossed. Event A is getting an even number on the die. Event B is getting heads on the coin. A note says the events are not independent and are mutually exclusive. Which evaluation is correct?",
  },
  {
    id: "821863e5-2e63-41b9-bce9-b819ce1f74dd",
    question_text: "How many ordered outcomes are in the sample space when a die is rolled twice?",
  },
  {
    id: "ef2a5888-4b27-41f2-b71a-14b0c514242f",
    question_text: "What is the size of the sample space for two die rolls?",
  },
  {
    id: "2ee9dc2c-b725-42be-9bfe-1f25445b0308",
    question_text:
      "Compare this worked solution for D = {2, 6, 10} and E = {1, 2, 4, 6, 8, 10}. It says D intersection E = {2, 6, 10} and D union E = {1, 2, 4, 6, 8, 10}. How should the work be judged?",
  },
  {
    id: "50576d0a-c73f-4526-858d-f7cecb8a08bb",
    question_text:
      "For A = {m, n, p, r} and B = {n, q, r}, one result gives A intersection B = {n, r} and another gives A union B = {m, n, p, q, r}. How should the results be judged?",
  },
  {
    id: "699e15e5-80d7-44bd-bd15-a0058ec34ed0",
    question_text:
      "Set A contains the common factors of 18 and 24. Set B contains the factors of 12. Which method correctly finds A union B and A intersection B?",
  },
  {
    id: "88dfc195-dbdb-4a29-bfc1-dfc8bde010e2",
    question_text:
      "Choose the pair of sets that satisfies both conditions: A intersection B = {2, 6} and A union B = {1, 2, 3, 4, 5, 6}.",
  },
  {
    id: "971dd4ef-2cb0-4ff3-9fbe-a2e553a17d75",
    question_text:
      "For R = {1, 4, 7, 10} and S = {4, 7, 8, 10, 12}, Step 1 says R intersection S = {4, 7, 10}. Step 2 says R union S = {1, 4, 7, 8, 10, 12}. Which step needs correction?",
  },
  {
    id: "a9d8e3c4-d589-4807-af11-584b8f05ef28",
    question_text:
      "For U = {1, 2, 3, 4, 5} and V = {4, 5, 6, 7}, Statement 1 says U intersection V has 2 elements. Statement 2 says U union V has 7 elements. How should the statements be judged?",
  },
  {
    id: "c64cd8f3-896f-4ca8-94aa-d0a1ec0628da",
    question_text:
      "In a library survey, 90 members were asked about mystery novels (R) and science books (S). There are 54 in R, 47 in S, and 19 in neither set. Method 1 uses 90 - 19 to find the union before finding the overlap. Method 2 adds 54 + 47 and places 101 inside the circles first. Which method is correct?",
  },
  {
    id: "9fd35378-bc3b-48ca-9c67-83e319f70547",
    question_text:
      "Choose the number of books sold on Saturday so that in the 7-day record 18, 20, 20, 23, 27, 31, and Saturday, the median stays 23 and the mode is 20 only.",
    explanation:
      "Test each option in the ordered list. Adding 22 makes the median 22, so it fails. Adding 23 makes both 20 and 23 appear twice, so 20 is no longer the only mode. Adding 24 gives 18, 20, 20, 23, 24, 27, 31, so the median stays 23 and the only mode is 20. Therefore 24 is correct.",
  },
  {
    id: "cd01fbb4-fe16-4a8b-ae2c-fe81005f39f3",
    question_text:
      "Choose the correct statement about these four situations: (1) shoe sizes sold: 5, 5, 5, 6, 7, 8; (2) repair times in minutes: 8, 9, 10, 11, 60; (3) quiz scores: 14, 15, 16, 17, 18; (4) daily temperatures: 21, 21, 22, 22, 23, 40, 41.",
  },
  {
    id: "109afbcb-b8b8-4809-a8e5-49aebf4ee6bf",
    question_text:
      "Two methods are used to find the HCF of 84 and 126. Method P lists the factors of both numbers and chooses 42. Method Q uses repeated division: 126 / 84 leaves 42, then 84 / 42 leaves 0, so it also chooses 42. Which judgment is correct?",
  },
  {
    id: "1ce65aee-4978-4b0b-8839-8ae41554b2ef",
    question_text:
      "A factory cuts 108 cm wire and 180 cm wire into equal pieces of the greatest possible length with no waste. Method A divides both numbers by 2 and stops with 2. Method B uses repeated division and gets 36. Which method matches the situation?",
  },
];

async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    ssl: { rejectUnauthorized: false },
  });

  for (const update of updates) {
    const fields = [];
    const values = [];
    let index = 1;

    if (Object.prototype.hasOwnProperty.call(update, "question_text")) {
      fields.push(`question_text = $${index++}`);
      values.push(update.question_text);
    }
    if (Object.prototype.hasOwnProperty.call(update, "explanation")) {
      fields.push(`explanation = $${index++}`);
      values.push(update.explanation);
    }
    if (Object.prototype.hasOwnProperty.call(update, "options")) {
      fields.push(`options = $${index++}::jsonb`);
      values.push(JSON.stringify(update.options));
    }

    values.push(update.id);
    await pool.query(
      `UPDATE public.final_content_questions
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${index}`,
      values,
    );
  }

  await pool.end();
  console.log(`Applied ${updates.length} updates.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
