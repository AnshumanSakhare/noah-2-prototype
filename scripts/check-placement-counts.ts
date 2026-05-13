import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { query } from "../lib/db";

async function checkCounts() {
  const result = await query(`
    SELECT grade, count(*) 
    FROM placement_test_questions 
    GROUP BY grade 
    ORDER BY grade
  `);
  console.log(result.rows);
}

checkCounts().catch(console.error);
