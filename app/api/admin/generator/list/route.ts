import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getXlsxContext(grade: number, topic: string) {
  try {
    const filePath = path.resolve(process.cwd(), "Question Bank Plan - 13 ap.xlsx");
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const gradeLabel = grade === 0 ? "KG" : `G${grade}`;
    const matchingRows = data.filter((row) => {
      const g = String(row.Grade || row.grade || "").trim();
      const t = String(row.Topic || row.topic || "").trim();
      return g === gradeLabel && t === topic;
    });

    if (matchingRows.length === 0) {
      return null;
    }

    const subtopics = Array.from(new Set(matchingRows.map((r) => r.Subtopic || r.subtopic || "").filter(Boolean)));
    const learningObjectives = Array.from(new Set(matchingRows.map((r) => r["Learning Objective"] || r.learning_objective || "").filter(Boolean)));
    const exampleQuestions = Array.from(new Set(matchingRows.map((r) => r["Example Question"] || r.example_question || "").filter(Boolean)));

    return {
      subtopics,
      learningObjectives,
      exampleQuestions
    };
  } catch (err) {
    console.error("Failed to read context from Excel sheet:", err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeStr = searchParams.get("grade");
    const topic = searchParams.get("topic");

    if (gradeStr === null || !topic) {
      return NextResponse.json({ success: false, error: "Missing grade or topic" }, { status: 400 });
    }

    const grade = parseInt(gradeStr, 10);
    if (isNaN(grade)) {
      return NextResponse.json({ success: false, error: "Invalid grade" }, { status: 400 });
    }

    const res = await query(
      `SELECT 
        qv.id,
        qv.template_id,
        qv.variation_index,
        qv.variation_data,
        qv.difficulty,
        qv.verifier_status,
        qv.status,
        qt.slug as template_slug,
        qt.grade,
        qt.topic,
        qt.subtopic,
        qt.interaction_type,
        qt.learning_objective,
        qt.template_html,
        qt.output_schema
      FROM public.question_variations qv
      JOIN public.question_templates qt ON qv.template_id = qt.id
      WHERE qt.grade = $1 AND qt.topic = $2`,
      [grade, topic]
    );

    const xlsxContext = getXlsxContext(grade, topic);

    return NextResponse.json({
      success: true,
      data: res.rows,
      context: xlsxContext
    });
  } catch (error: any) {
    console.error("GET /api/admin/generator/list error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
