import * as XLSX from "xlsx";
import * as path from "path";

const filePath = path.resolve(process.cwd(), "Question Bank Plan - 13 ap.xlsx");
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data: any[] = XLSX.utils.sheet_to_json(worksheet);

console.log("Headers:", Object.keys(data[0] || {}));
console.log("Sample Row:", data[0]);
console.log("Unique Grades in Excel:", Array.from(new Set(data.map(r => r.Grade || r.grade || ""))));
