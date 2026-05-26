const XLSX = require("xlsx");
const path = require("path");

// Load .env.local
const fs = require("fs");
for (const line of fs.readFileSync(
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

// Normalized key helper
function toNormalizeKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function run() {
  const { query } = await import("file:///D:/BuildFastWithAI/diagnostic-agent-noah/lib/db.ts");
  
  // 1. Read Excel topics
  const workbook = XLSX.readFile("docs/Topic-Grade Question Count.xlsx");
  const sheet = workbook.Sheets['Topic Test'];
  const excelRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  const excelTopics = {}; // grade -> Array of standardized topics
  for (let i = 2; i < excelRows.length; i++) {
    const row = excelRows[i];
    if (!row || row.length < 2) continue;
    const grade = String(row[0]).trim();
    const topic = String(row[1]).trim();
    if (!grade || grade === 'Grade' || !topic || grade.includes("questions") || grade.includes("Why") || grade.includes("Recurring")) continue;
    
    // Map Excel grade G1..G8 to 1..8
    let dbGrade = grade;
    if (grade.startsWith("G") && grade !== "KG") {
      dbGrade = grade.slice(1);
    }
    
    if (!excelTopics[dbGrade]) {
      excelTopics[dbGrade] = [];
    }
    excelTopics[dbGrade].push(topic);
  }
  
  // 2. Fetch unique topics from DB
  const dbResult = await query(`
    SELECT DISTINCT grade, topic
    FROM final_content_questions
    WHERE topic IS NOT NULL AND btrim(topic) <> ''
    ORDER BY grade, topic
  `);
  
  const dbTopicsByGrade = {};
  for (const row of dbResult.rows) {
    const grade = row.grade;
    if (!dbTopicsByGrade[grade]) {
      dbTopicsByGrade[grade] = [];
    }
    dbTopicsByGrade[grade].push(row.topic);
  }
  
  console.log("=== ANALYZING TOPIC MAPS ===");
  const updatesPlanned = [];
  const unmatchedDbTopics = [];
  
  for (const grade in dbTopicsByGrade) {
    const excelList = excelTopics[grade] || [];
    const excelNormMap = new Map();
    excelList.forEach(t => {
      excelNormMap.set(toNormalizeKey(t), t);
    });
    
    console.log(`\nGrade ${grade}:`);
    for (const dbTopic of dbTopicsByGrade[grade]) {
      const dbNorm = toNormalizeKey(dbTopic);
      const match = excelNormMap.get(dbNorm);
      
      if (match) {
        if (dbTopic !== match) {
          console.log(`  [CAPITALIZATION / SPACING TYPO]`);
          console.log(`    DB:    "${dbTopic}"`);
          console.log(`    Excel: "${match}"`);
          updatesPlanned.push({ grade, from: dbTopic, to: match });
        } else {
          // Exact match
        }
      } else {
        // No match by normalized alphanumeric key
        // Let's see if we can find close matches or if it's completely different
        let closest = "";
        let bestScore = 0;
        excelList.forEach(et => {
          // simple substring match or similarity
          if (et.toLowerCase().includes(dbTopic.toLowerCase()) || dbTopic.toLowerCase().includes(et.toLowerCase())) {
            closest = et;
          }
        });
        
        if (closest) {
          console.log(`  [CLOSE MATCH FOUND]`);
          console.log(`    DB:    "${dbTopic}"`);
          console.log(`    Excel: "${closest}"`);
          updatesPlanned.push({ grade, from: dbTopic, to: closest });
        } else {
          console.log(`  [UNMATCHED DB TOPIC] "${dbTopic}"`);
          unmatchedDbTopics.push({ grade, topic: dbTopic });
        }
      }
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Planned automatic typo/capitalization updates: ${updatesPlanned.length}`);
  console.log(`Unmatched topics remaining: ${unmatchedDbTopics.length}`);
  
  process.exit(0);
}

run().catch(console.error);
