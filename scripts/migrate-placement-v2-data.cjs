const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const TABLE_NAME = "placement_test_questions_v2_v2";
const DEFAULT_CSV_ROOT = path.resolve(
  process.cwd(),
  "..",
  "agents-content",
  "agents",
  "content-generation",
  "output",
  "placement-test",
);

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(current);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0];
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    );
}

function parseJsonField(value, label, warnings) {
  if (!value || !value.trim()) return null;

  const candidates = [value.trim()];
  if (value.startsWith('"') && value.endsWith('"')) {
    candidates.push(value.slice(1, -1).replace(/""/g, '"'));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try next cleanup candidate.
    }
  }

  warnings.push(`${label}: failed to parse JSON`);
  return null;
}

function transformDragDropPayload(questionType, metadata) {
  if (questionType !== "drag_drop" || !metadata?.payload) return;

  const payload = metadata.payload;
  if (!payload.items || !payload.targets || payload.draggableItems) return;

  const itemMap = new Map(payload.items.map((item) => [item.id, item.label]));
  const targetMap = new Map(
    payload.targets.map((target) => [target.id, target.label]),
  );

  payload.draggableItems = payload.items.map((item) => item.label);
  payload.dropZones = payload.targets.map((target) => target.label);
  payload.answerKey = (payload.answerKey || []).map((answer) => ({
    item: itemMap.get(answer.itemId) || answer.item,
    target: targetMap.get(answer.targetId) || answer.target,
  }));
}

function findCsvFiles(root) {
  const files = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function toInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function fitVarchar(value, maxLength, label, warnings) {
  if (!value) return null;
  if (value.length <= maxLength) return value;

  warnings.push(
    `${label}: omitted ${value.length}-char value from varchar(${maxLength}) column`,
  );
  return null;
}

function makePool() {
  return new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    port: Number.parseInt(process.env.DB_PORT || "5432", 10),
    ssl: { rejectUnauthorized: false },
  });
}

async function migrate() {
  loadEnvLocal();

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const csvRootArg = args.find((arg) => !arg.startsWith("--"));
  const csvRoot = path.resolve(csvRootArg || DEFAULT_CSV_ROOT);

  if (!fs.existsSync(csvRoot)) {
    throw new Error(`CSV root does not exist: ${csvRoot}`);
  }

  const csvFiles = findCsvFiles(csvRoot);
  if (csvFiles.length === 0) {
    throw new Error(`No CSV files found under: ${csvRoot}`);
  }

  const warnings = [];
  const rows = csvFiles.flatMap((filePath) =>
    parseCsv(fs.readFileSync(filePath, "utf8")).map((row) => ({
      ...row,
      sourceFile: path.relative(csvRoot, filePath),
    })),
  );

  console.log(`Found ${csvFiles.length} CSV files with ${rows.length} rows.`);
  if (dryRun) {
    console.log("Dry run only. No database writes will be performed.");
    console.table(
      csvFiles.map((filePath) => ({
        file: path.relative(csvRoot, filePath),
        rows: parseCsv(fs.readFileSync(filePath, "utf8")).length,
      })),
    );
    return;
  }

  const pool = makePool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let inserted = 0;
    let skipped = 0;

    const insertSql = `
      INSERT INTO ${TABLE_NAME} (
        question_number,
        question_type,
        question_text,
        subject,
        grade,
        grade_level,
        topic,
        subtopic,
        learning_objective,
        blooms_level,
        difficulty_level,
        difficulty_rating,
        options,
        explanation,
        generation_metadata,
        rownumber,
        queueid,
        questionnumber,
        questiontype,
        questiontext,
        learningobjective,
        bloomslevel,
        difficultylevel,
        difficultyrating,
        summary,
        generationmetadata
      )
      SELECT
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13::jsonb, $14, $15::jsonb, $16::integer, $17::varchar,
        $18::varchar, $19::varchar, $20::varchar, $21::varchar,
        $22::varchar, $23::varchar, $24::integer, $25::varchar, $26::varchar
      WHERE NOT EXISTS (
        SELECT 1 FROM ${TABLE_NAME}
        WHERE queueid = $17::varchar
      )
    `;

    for (const row of rows) {
      const rowLabel = `${row.sourceFile}:${row.rowNumber || row.questionNumber || "unknown"}`;
      const optionsJson = parseJsonField(
        row.options,
        `${rowLabel} options`,
        warnings,
      );
      const metadataJson = parseJsonField(
        row.generationMetadata,
        `${rowLabel} generationMetadata`,
        warnings,
      );

      transformDragDropPayload(row.questionType, metadataJson);

      const result = await client.query(insertSql, [
        row.questionNumber,
        row.questionType,
        row.questionText,
        row.subject,
        row.grade,
        row.grade_level,
        row.topic,
        row.subtopic,
        row.learningObjective,
        row.bloomsLevel,
        row.difficultyLevel,
        toInteger(row.difficultyRating, 0),
        optionsJson ? JSON.stringify(optionsJson) : null,
        row.explanation,
        metadataJson ? JSON.stringify(metadataJson) : null,
        toInteger(row.rowNumber),
        row.queueId,
        row.questionNumber,
        row.questionType,
        fitVarchar(row.questionText, 128, `${rowLabel} questiontext`, warnings),
        fitVarchar(
          row.learningObjective,
          256,
          `${rowLabel} learningobjective`,
          warnings,
        ),
        row.bloomsLevel,
        row.difficultyLevel,
        toInteger(row.difficultyRating, 0),
        fitVarchar(row.summary, 512, `${rowLabel} summary`, warnings),
        fitVarchar(
          row.generationMetadata,
          2048,
          `${rowLabel} generationmetadata`,
          warnings,
        ),
      ]);

      if (result.rowCount === 1) inserted += 1;
      else skipped += 1;
    }

    await client.query("COMMIT");

    const countResult = await client.query(
      `SELECT grade, count(*)::int AS count FROM ${TABLE_NAME} GROUP BY grade ORDER BY grade`,
    );
    console.log(`Inserted ${inserted} rows. Skipped ${skipped} existing rows.`);
    console.table(countResult.rows);

    if (warnings.length > 0) {
      console.warn(`Warnings (${warnings.length}):`);
      for (const warning of warnings.slice(0, 20)) console.warn(`- ${warning}`);
      if (warnings.length > 20)
        console.warn(`- ...and ${warnings.length - 20} more`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
