import fs from "fs";
import path from "path";

console.log("CWD is:", process.cwd());
// 1. Parse .env.local manually
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  console.log("Env path is:", envPath);
  if (fs.existsSync(envPath)) {
    console.log("Env file exists!");
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || "").trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val;
      }
    });
  } else {
    console.log("Env file DOES NOT exist!");
  }
} catch (e) {
  console.error("Failed to load env:", e);
}

console.log("Loaded DB_HOST:", process.env.DB_HOST);
console.log("Loaded DB_PORT:", process.env.DB_PORT);
console.log("Loaded DB_NAME:", process.env.DB_NAME);

async function run() {
  try {
    // Dynamically import pool after env variables have been populated
    const { query } = await import("../lib/db");
    
    const res = await query(`
      SELECT qv.id, qv.status, qv.verifier_status, qt.topic, qt.status as template_status
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
    `);
    console.log("Total variations in DB:", res.rows.length);
    console.log("Variations details:", JSON.stringify(res.rows.slice(0, 10), null, 2));
  } catch (err) {
    console.error(err);
  }
}

run();
