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
  console.log("Sheet Names:", workbook.SheetNames);

  // Read first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to JSON and print first 15 rows
  const data = XLSX.utils.sheet_to_json(worksheet);
  console.log(`Total rows in sheet ${firstSheetName}:`, data.length);
  console.log("\n--- First 15 Rows Sample ---");
  console.dir(data.slice(0, 15), { depth: null, colors: true });
}

main();
