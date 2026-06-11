import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

async function main() {
  const filePath = path.resolve(process.cwd(), "Question Bank Plan - 13 ap.xlsx");
  if (!fs.existsSync(filePath)) {
    console.error("File does not exist:", filePath);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(worksheet);

  const gradesSet = new Set<string>();
  const topicsSet = new Set<string>();
  const gradeTopicsMap: Record<string, Set<string>> = {};

  data.forEach((row) => {
    const grade = String(row.Grade || row.grade || "").trim();
    const topic = String(row.Topic || row.topic || "").trim();

    if (grade) {
      gradesSet.add(grade);
      if (!gradeTopicsMap[grade]) {
        gradeTopicsMap[grade] = new Set<string>();
      }
      if (topic) {
        topicsSet.add(topic);
        gradeTopicsMap[grade].add(topic);
      }
    }
  });

  // Convert Sets to Arrays
  const rawGrades = Array.from(gradesSet);
  const rawTopics = Array.from(topicsSet);

  // Custom grade sorter: KG first, then numeric grades
  const gradeOrder = (g: string) => {
    if (g === "KG") return -1;
    const match = g.match(/\d+/);
    return match ? parseInt(match[0]) : 99;
  };

  const sortedGrades = rawGrades.sort((a, b) => gradeOrder(a) - gradeOrder(b));
  const sortedTopics = rawTopics.sort();

  const gradeTopicsJson: Record<string, string[]> = {};
  for (const grade in gradeTopicsMap) {
    gradeTopicsJson[grade] = Array.from(gradeTopicsMap[grade]).sort();
  }

  const outputData = {
    grades: sortedGrades,
    topics: sortedTopics,
    gradeTopicsMap: gradeTopicsJson,
  };

  const outputPath = path.resolve(process.cwd(), "data", "question-bank-plan-filters.json");
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log("Successfully extracted filters data:");
  console.log("- Unique Grades:", sortedGrades);
  console.log("- Total Unique Topics:", sortedTopics.length);
  console.log("Output saved to:", outputPath);
}

main();
