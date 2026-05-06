import { Client } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function check() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT topic_results, learning_objective_results 
      FROM diagnostic_assessments 
      WHERE test_mode = 'grade' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (res.rows[0]) {
      console.log("TOPIC RESULTS:", JSON.stringify(res.rows[0].topic_results, null, 2));
      console.log("LO RESULTS:", JSON.stringify(res.rows[0].learning_objective_results.map((l: any) => ({ lo: l.learningObjective, score: l.score })), null, 2));
    } else {
      console.log("No grade test found.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

check();
