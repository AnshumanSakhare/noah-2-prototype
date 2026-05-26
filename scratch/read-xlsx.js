const XLSX = require("xlsx");
const path = require("path");

function run() {
  const filePath = path.resolve("docs/Topic-Grade Question Count.xlsx");
  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets["Topic Test"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // read as raw arrays of rows

  const topicsByGrade = {};

  // Row 0 is title, Row 1 is header
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const grade = String(row[0]).trim();
    const topic = String(row[1]).trim();
    if (!grade || grade === "Grade" || !topic) continue;

    if (!topicsByGrade[grade]) {
      topicsByGrade[grade] = [];
    }
    topicsByGrade[grade].push(topic);
  }

  console.log("=== Topics from Excel by Grade ===");
  for (const grade in topicsByGrade) {
    console.log(`\nGrade: ${grade} (${topicsByGrade[grade].length} topics)`);
    topicsByGrade[grade].forEach((topic) => console.log(`- ${topic}`));
  }
}

run();
