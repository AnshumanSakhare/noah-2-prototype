import { NextResponse } from "next/server"

import {
  getDiagnosticQuizCatalog,
  getTopicQuizForClient,
} from "@/agents/diagnostic/tools/contentQuiz"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string
      subject?: string
      classLevel?: string
      topic?: string
      maxQuestions?: number
    }

    const studentId = body.studentId?.trim() || "Riya Sharma"
    const catalog = await getDiagnosticQuizCatalog()
    const entry = catalog.entries.find(
      (item) =>
        item.subject === body.subject &&
        item.classLevel === body.classLevel &&
        item.topic === body.topic
    )

    if (!entry) {
      return NextResponse.json(
        { error: "The selected diagnostic quiz was not found." },
        { status: 400 }
      )
    }

    const quiz = await getTopicQuizForClient({
      studentId,
      subject: entry.subject,
      classLevel: entry.classLevel,
      topic: entry.topic,
      maxQuestions: 15,
    })

    return NextResponse.json({ quiz })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load quiz.",
      },
      { status: 400 }
    )
  }
}
