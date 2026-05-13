import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

// Manually parse .env.local
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const parts = line.split("=");
      if (parts.length === 2) {
        process.env[parts[0].trim()] = parts[1].trim();
      }
    });
  }
}

loadEnvLocal();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: {
    rejectUnauthorized: false,
  },
});

// Since we don't have csv-parse, we'll implement a simple CSV parser that can handle quoted fields
function parseCSV(content: string) {
  const lines = content.split(/\r?\n/);
  const result = [];
  const header = parseCSVLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const obj: any = {};
    header.forEach((key, index) => {
      obj[key] = values[index];
    });
    result.push(obj);
  }
  return result;
}

function parseCSVLine(line: string) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // This is for escaped quotes within quotes
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Improved JSON cleanup specifically for how pg wants JSONB
function sanitizeJson(val: any) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  return val;
}

async function migrate() {
  const csvPath = path.resolve(process.cwd(), "csv/placement test.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const data = parseCSV(content);

  const client = await pool.connect();
  try {
    console.log(`Starting migration of ${data.length} questions...`);
    
    // Begin transaction
    await client.query("BEGIN");

    for (const row of data) {
      const {
        questionNumber,
        questionType,
        questionText,
        subject,
        grade,
        grade_level,
        topic,
        subtopic,
        learningObjective,
        bloomsLevel,
        difficultyLevel,
        difficultyRating,
        options,
        explanation,
        generationMetadata
      } = row;

      // Parse JSON fields
      let optionsJson: any = null;
      if (options && options.trim()) {
        try {
          optionsJson = JSON.parse(options);
        } catch (e) {
          try {
             // Handle case where it might be double stringified or have common CSV issues
             let cleaned = options.trim();
             if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
             cleaned = cleaned.replace(/""/g, '"');
             optionsJson = JSON.parse(cleaned);
          } catch (e2) {
             console.warn(`Failed to parse options for Q${questionNumber}:`, options.substring(0, 50));
          }
        }
      }

      let metadataJson: any = null;
      if (generationMetadata && generationMetadata.trim()) {
        try {
          metadataJson = JSON.parse(generationMetadata);
        } catch (e) {
          try {
            let cleaned = generationMetadata.trim();
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
            cleaned = cleaned.replace(/""/g, '"');
            metadataJson = JSON.parse(cleaned);
          } catch (e2) {
            console.warn(`Failed to parse metadata for Q${questionNumber}:`, generationMetadata.substring(0, 50));
          }
        }
      }

      const queryText = `
        INSERT INTO placement_test_questions (
          question_number, question_type, question_text, subject, 
          grade, grade_level, topic, subtopic, learning_objective, 
          blooms_level, difficulty_level, difficulty_rating, 
          options, explanation, generation_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;

      const values = [
        questionNumber,
        questionType,
        questionText,
        subject,
        grade,
        grade_level,
        topic,
        subtopic,
        learningObjective,
        bloomsLevel,
        difficultyLevel,
        parseInt(difficultyRating) || 0,
        sanitizeJson(optionsJson),
        explanation,
        sanitizeJson(metadataJson)
      ];

      await client.query(queryText, values);
    }

    await client.query("COMMIT");
    console.log("Migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

migrate();
