import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

// Load .env.local variables
for (const line of readFileSync(
  path.resolve(process.cwd(), ".env.local"),
  "utf8",
).split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const index = trimmed.indexOf("=");
  if (index <= 0) continue;
  const key = trimmed.slice(0, index).trim();
  const value = trimmed
    .slice(index + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
  process.env[key] = value;
}

const csvPath = path.resolve(process.cwd(), "scratch/question_reviews.csv");

// Helper to read reviewed IDs from CSV
function getReviewedIds(): Set<string> {
  const reviewed = new Set<string>();
  if (!existsSync(csvPath)) {
    // Write header if file does not exist
    writeFileSync(csvPath, "id,status,details\n", "utf8");
    return reviewed;
  }
  
  const content = readFileSync(csvPath, "utf8");
  const lines = content.split(/\r?\n/);
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (simple split by first comma for ID)
    const firstCommaIndex = line.indexOf(",");
    if (firstCommaIndex > 0) {
      const id = line.slice(0, firstCommaIndex).trim().replace(/^["']|["']$/g, "");
      if (id) reviewed.add(id);
    }
  }
  return reviewed;
}

// Helper to append a review to the CSV
function appendReviewToCsv(id: string, status: string, details: string) {
  // Escape fields for CSV safety
  const safeId = `"${id.replace(/"/g, '""')}"`;
  const safeStatus = `"${status.replace(/"/g, '""')}"`;
  const safeDetails = `"${details.replace(/"/g, '""')}"`;
  
  writeFileSync(csvPath, `${safeId},${safeStatus},${safeDetails}\n`, { flag: "a", encoding: "utf8" });
}

// Main runner function
async function run() {
  const { default: pool } = await import("../lib/db");
  
  console.log("=== Math QA Quality Check Batch Runner ===");
  
  // 1. Get already reviewed IDs
  const reviewedIds = getReviewedIds();
  console.log(`Loaded ${reviewedIds.size} already reviewed question IDs.`);

  // 2. Fetch 10 unreviewed questions
  try {
    let queryText = `
      SELECT id::text, question_type, question_text, options, explanation, generation_metadata, subject, grade, topic
      FROM final_content_questions_1
    `;
    const queryParams: any[] = [];
    
    if (reviewedIds.size > 0) {
      // Exclude reviewed IDs using parameterization
      queryText += ` WHERE NOT (id::text = ANY($1::text[]))`;
      queryParams.push(Array.from(reviewedIds));
    }
    
    queryText += ` ORDER BY id LIMIT 10`;
    
    const res = await pool.query(queryText, queryParams);
    const questions = res.rows as QuestionRow[];
    
    if (questions.length === 0) {
      console.log("🎉 All questions have been reviewed! No unreviewed questions remaining.");
      process.exit(0);
    }
    
    console.log(`Fetched ${questions.length} unreviewed questions. Starting AI review...`);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ Error: OPENAI_API_KEY is not defined in .env.local.");
      process.exit(1);
    }

    // 3. Process each question via OpenAI API
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`\n[${i + 1}/10] Reviewing ID: ${q.id} (${q.question_type})...`);
      
      const payload = typeof q.generation_metadata === "string" 
        ? JSON.parse(q.generation_metadata) 
        : (q.generation_metadata || {});
      const actualPayload = payload.payload || payload;
      
      // Construct detailed prompt for math verification
      const questionDetails = {
        id: q.id,
        type: q.question_type,
        text: q.question_text,
        options: q.options,
        explanation: q.explanation || actualPayload.explanation || "",
        payloadDetails: actualPayload
      };

      const systemPrompt = `You are a professional mathematics Quality Assurance expert. 
Your job is to thoroughly inspect a math question and determine if it has any errors.

Inspect for these issues:
1. **Mathematical correctness**: Is the problem solvable? Is the answer correct?
2. **Options and answer key alignment**:
   - For 'mcq': Does one of the choices match the correct answer? Is the 'correct' option key marked correctly?
   - For 'fitb': Is the expected answer and acceptable answers correct?
   - For 'drag_drop': Are draggable items correctly mapped to targets in the answerKey?
3. **Consistency**: Does the explanation agree with the question text and options/answers?

Provide your response in raw JSON format:
{
  "status": "correct" | "issue",
  "details": "A concise explanation of why it is correct OR a detailed summary of the exact mathematical/keying issue found."
}`;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: JSON.stringify(questionDetails, null, 2) }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API responded with status ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0]?.message?.content;
        if (!choice) {
          throw new Error("No response content from OpenAI API");
        }

        const review = JSON.parse(choice) as { status: string; details: string };
        
        console.log(`Result: ${review.status.toUpperCase()}`);
        console.log(`Details: ${review.details}`);

        // 4. Store result in CSV
        appendReviewToCsv(q.id, review.status, review.details);

      } catch (err: any) {
        console.error(`❌ Failed to review question ${q.id}:`, err.message);
        // Append error status to avoid blocking future batches, but flag as issue for human inspection
        appendReviewToCsv(q.id, "issue", `QA pipeline error: ${err.message}`);
      }
    }

    console.log("\n✅ Batch review completed successfully! Results stored in scratch/question_reviews.csv.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Database or runtime error:", err);
    process.exit(1);
  }
}

interface QuestionRow {
  id: string;
  question_type: string;
  question_text: string;
  options: any;
  explanation: string | null;
  generation_metadata: any;
  subject: string;
  grade: string;
  topic: string;
}

run();
