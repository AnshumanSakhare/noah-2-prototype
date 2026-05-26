const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "scratch", "grade6-audit");
const OUT_JSON = path.join(OUT_DIR, "issues.json");
const OUT_MD = path.join(OUT_DIR, "report.md");

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
      .replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

function compact(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value) {
  return compact(value)
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

function stripTags(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ");
}

function pushIssue(issues, row, severity, category, message, evidence = "") {
  issues.push({
    id: row.id,
    topic: row.topic,
    subtopic: row.subtopic,
    learning_objective: row.learning_objective,
    difficulty_level: row.difficulty_level,
    question_type: row.question_type,
    severity,
    category,
    message,
    evidence: compact(evidence).slice(0, 500),
    question_text: compact(row.question_text).slice(0, 700),
  });
}

function toOptions(value) {
  return Array.isArray(value) ? value : [];
}

function optionText(option) {
  if (typeof option === "string") return option;
  if (option && typeof option === "object")
    return option.text ?? option.label ?? "";
  return "";
}

function optionCorrect(option) {
  if (!option || typeof option !== "object") return false;
  return (
    option.correct === true || String(option.correct).toLowerCase() === "true"
  );
}

function isIntentionalIncorrectStatement(text, questionText) {
  const source = normalizeText(text);
  const question = normalizeText(questionText);
  return (
    source.includes("is the first incorrect step") ||
    source.includes("is wrong; it should") ||
    source.includes("is the first wrong step") ||
    question.includes("which step must be corrected first") ||
    question.includes("choose the judgment that correctly checks this work")
  );
}

function hasSuspiciousEncoding(text) {
  return /�|âœ|â|Â|Ã|ðŸ|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(
    String(text ?? ""),
  );
}

function hasUnbalanced(text, open, close) {
  const source = String(text ?? "");
  return (
    [...source].filter((ch) => ch === open).length !==
    [...source].filter((ch) => ch === close).length
  );
}

function evalSimpleExpression(expr) {
  const cleaned = expr
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  if (!/^-?\d+(?:\.\d+)?(?:[+\-*/]-?\d+(?:\.\d+)?){1,3}$/.test(cleaned)) {
    return null;
  }
  try {
    // The regex above allows only numeric arithmetic tokens.
    return Function(`"use strict"; return (${cleaned});`)();
  } catch {
    return null;
  }
}

function findBadEquations(text) {
  const source = stripTags(text)
    .replace(/−/g, "-")
    .replace(/[×x]/gi, "×")
    .replace(/[÷]/g, "÷");
  const issues = [];
  const number = String.raw`-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?`;
  const remainderPattern = new RegExp(
    String.raw`(?<![\d./^])(${number})\s*÷\s*(${number})\s*=\s*(${number})\s+remainder\s+(${number})(?![\d.,/^])`,
    "gi",
  );
  for (const match of source.matchAll(remainderPattern)) {
    const dividend = Number(match[1].replace(/,/g, ""));
    const divisor = Number(match[2].replace(/,/g, ""));
    const quotient = Number(match[3].replace(/,/g, ""));
    const remainder = Number(match[4].replace(/,/g, ""));
    if (
      Number.isFinite(dividend) &&
      Number.isFinite(divisor) &&
      Number.isFinite(quotient) &&
      Number.isFinite(remainder) &&
      (Math.abs(divisor * quotient + remainder - dividend) > 1e-9 ||
        remainder < 0 ||
        remainder >= Math.abs(divisor))
    ) {
      issues.push(
        `${match[1]} ÷ ${match[2]} = ${match[3]} remainder ${match[4]} (actual check ${divisor * quotient + remainder})`,
      );
    }
  }

  const equationPattern = new RegExp(
    String.raw`(?<![\d./^])(${number}(?:\s*[+\-×÷]\s*${number}){1,3})\s*=\s*(${number})(?![\d.,/^])(?!(?:\s*[+\-×÷]))`,
    "g",
  );
  for (const match of source.matchAll(equationPattern)) {
    if (/^\s+remainder\b/i.test(source.slice(match.index + match[0].length))) {
      continue;
    }
    const previousNonSpace = source
      .slice(0, match.index)
      .match(/\S(?=\s*$)/)?.[0];
    if (previousNonSpace && /[+\-×÷/^]/.test(previousNonSpace)) continue;

    const actual = evalSimpleExpression(match[1]);
    const expected = Number(match[2].replace(/,/g, ""));
    if (
      actual !== null &&
      Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      Math.abs(actual - expected) >
        (String(match[2]).includes(".") ? 0.0050000001 : 1e-9)
    ) {
      issues.push(`${match[1]} = ${match[2]} (actual ${actual})`);
    }
  }
  return issues;
}

function auditRow(row, duplicateQuestionIds) {
  const issues = [];
  const question = compact(row.question_text);
  const explanation = compact(row.explanation);
  const options = toOptions(row.options);
  const qtype = normalizeText(row.question_type);

  if (!question)
    pushIssue(issues, row, "critical", "data", "Blank question text");
  if (!explanation)
    pushIssue(issues, row, "high", "data", "Blank explanation text");

  for (const field of [
    ["question", row.question_text],
    ["explanation", row.explanation],
    ["svg", row.question_svg],
  ]) {
    if (hasSuspiciousEncoding(field[1])) {
      pushIssue(
        issues,
        row,
        "high",
        "display",
        `Suspicious encoding characters in ${field[0]}`,
        field[1],
      );
    }
  }

  for (const [label, text] of [
    ["question", question],
    ["explanation", explanation],
  ]) {
    for (const [open, close] of [
      ["(", ")"],
      ["[", "]"],
      ["{", "}"],
    ]) {
      if (hasUnbalanced(text, open, close)) {
        pushIssue(
          issues,
          row,
          "medium",
          "display",
          `Unbalanced ${open}${close} in ${label}`,
          text,
        );
      }
    }
  }

  if (question.length > 420) {
    pushIssue(
      issues,
      row,
      "medium",
      "display",
      "Question text is very long and may not look good in the demo",
      question,
    );
  }

  if (explanation.length > 900) {
    pushIssue(
      issues,
      row,
      "low",
      "display",
      "Explanation is very long and may crowd the review UI",
      explanation,
    );
  }

  if (duplicateQuestionIds.has(row.id)) {
    pushIssue(
      issues,
      row,
      "medium",
      "content",
      "Duplicate question text appears within Grade 6",
      question,
    );
  }

  const svg = compact(row.question_svg);
  if (svg && !svg.startsWith("<svg")) {
    pushIssue(
      issues,
      row,
      "high",
      "display",
      "question_svg is present but does not start with <svg",
      svg,
    );
  }
  if (svg && /<script|onload=|onclick=|javascript:/i.test(svg)) {
    pushIssue(
      issues,
      row,
      "critical",
      "display",
      "question_svg contains executable markup",
      svg,
    );
  }
  if (normalizeText(row.visual_mode) === "question_svg" && !svg) {
    pushIssue(
      issues,
      row,
      "high",
      "display",
      "visual_mode is question_svg but question_svg is empty",
    );
  }

  const badExplanationEquations = findBadEquations(explanation);
  for (const bad of badExplanationEquations) {
    pushIssue(
      issues,
      row,
      "high",
      "logic",
      "Explanation contains a mathematically false equation",
      bad,
    );
  }

  if (qtype === "mcq") {
    if (options.length !== 4) {
      pushIssue(
        issues,
        row,
        "high",
        "options",
        `MCQ has ${options.length} options instead of 4`,
      );
    }

    const texts = options.map(optionText).map(compact);
    const correctIndexes = options
      .map((option, index) => (optionCorrect(option) ? index : -1))
      .filter((index) => index >= 0);

    if (correctIndexes.length !== 1) {
      pushIssue(
        issues,
        row,
        "critical",
        "options",
        `MCQ has ${correctIndexes.length} correct options instead of exactly 1`,
        JSON.stringify(options),
      );
    }

    texts.forEach((text, index) => {
      if (!text) {
        pushIssue(
          issues,
          row,
          "high",
          "options",
          `Option ${index + 1} is blank`,
        );
      }
      if (text.length > 260) {
        pushIssue(
          issues,
          row,
          "medium",
          "display",
          `Option ${index + 1} is very long and may wrap poorly`,
          text,
        );
      }
      if (hasSuspiciousEncoding(text)) {
        pushIssue(
          issues,
          row,
          "high",
          "display",
          `Suspicious encoding characters in option ${index + 1}`,
          text,
        );
      }
    });

    const normalized = texts.map(normalizeText);
    const seen = new Map();
    normalized.forEach((text, index) => {
      if (!text) return;
      if (seen.has(text)) {
        pushIssue(
          issues,
          row,
          "critical",
          "options",
          `Duplicate option text at options ${seen.get(text) + 1} and ${index + 1}`,
          texts[index],
        );
      } else {
        seen.set(text, index);
      }
    });

    if (correctIndexes.length === 1) {
      const correctText = texts[correctIndexes[0]];
      if (!isIntentionalIncorrectStatement(correctText, question)) {
        const badCorrectEquations = findBadEquations(correctText);
        for (const bad of badCorrectEquations) {
          pushIssue(
            issues,
            row,
            "critical",
            "logic",
            "Marked-correct option contains a mathematically false equation",
            bad,
          );
        }
      }
    }
  }

  return issues;
}

function markdownTable(rows) {
  if (rows.length === 0) return "_No issues flagged._\n";
  const header =
    "| Severity | Category | ID | Subtopic | Issue | Evidence |\n|---|---|---|---|---|---|\n";
  return (
    header +
    rows
      .map((issue) => {
        const cells = [
          issue.severity,
          issue.category,
          issue.id,
          issue.subtopic ?? "",
          issue.message,
          issue.evidence || issue.question_text,
        ].map((cell) =>
          compact(cell).replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 220),
        );
        return `| ${cells.join(" | ")} |`;
      })
      .join("\n") +
    "\n"
  );
}

async function main() {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  const { rows } = await pool.query(`
    SELECT id, question_type, question_text, question_svg, visual_mode, subject,
           grade, topic, subtopic, learning_objective, blooms_level,
           difficulty_level, difficulty_rating, options, explanation,
           generation_metadata, created_at, updated_at
    FROM public.final_content_questions
    WHERE grade = '6'
    ORDER BY topic, subtopic, learning_objective, difficulty_level, id
  `);

  await pool.end();

  const byQuestion = new Map();
  for (const row of rows) {
    const key = normalizeText(row.question_text);
    if (!key) continue;
    byQuestion.set(key, [...(byQuestion.get(key) ?? []), row.id]);
  }
  const duplicateQuestionIds = new Set(
    [...byQuestion.values()].filter((ids) => ids.length > 1).flat(),
  );

  const issues = rows.flatMap((row) => auditRow(row, duplicateQuestionIds));
  const topicSummary = new Map();
  for (const row of rows) {
    const item = topicSummary.get(row.topic) ?? {
      topic: row.topic,
      questions: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      issueCount: 0,
    };
    item.questions += 1;
    topicSummary.set(row.topic, item);
  }
  for (const issue of issues) {
    const item = topicSummary.get(issue.topic);
    item.issueCount += 1;
    item[issue.severity] += 1;
  }

  const summaryRows = [...topicSummary.values()].sort((a, b) =>
    a.topic.localeCompare(b.topic),
  );

  fs.writeFileSync(OUT_JSON, JSON.stringify({ summaryRows, issues }, null, 2));

  let md = `# Grade 6 final_content_questions Audit\n\n`;
  md += `Source: AWS Postgres table \`public.final_content_questions\`\n\n`;
  md += `Rows reviewed: ${rows.length}\n\n`;
  md += `Issues flagged: ${issues.length}\n\n`;
  md +=
    "| Topic | Questions | Critical | High | Medium | Low | Total issues |\n|---|---:|---:|---:|---:|---:|---:|\n";
  for (const row of summaryRows) {
    md += `| ${row.topic.replace(/\|/g, "\\|")} | ${row.questions} | ${row.critical} | ${row.high} | ${row.medium} | ${row.low} | ${row.issueCount} |\n`;
  }

  for (const topic of summaryRows.map((row) => row.topic)) {
    md += `\n## ${topic}\n\n`;
    const topicIssues = issues
      .filter((issue) => issue.topic === topic)
      .sort((a, b) => {
        const rank = { critical: 0, high: 1, medium: 2, low: 3 };
        return rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id);
      });
    md += markdownTable(topicIssues);
  }

  fs.writeFileSync(OUT_MD, md);

  console.log(`Rows reviewed: ${rows.length}`);
  console.log(`Issues flagged: ${issues.length}`);
  console.log(`Report: ${OUT_MD}`);
  console.table(summaryRows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
