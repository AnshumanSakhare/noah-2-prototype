import { NextResponse } from "next/server"

import { runDiagnostic } from "@/agents/diagnostic/diagnosticAgent"

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
      answers?: Array<{
        questionId?: string
        answer?: string
        timeTakenMs?: number
        allocatedTimeMs?: number
        wasAutoSkipped?: boolean
      }>
    }

    const answerMap = new Map(
      (body.answers ?? []).map((item) => [
        String(item.questionId ?? ""),
        {
          answer: String(item.answer ?? ""),
          timeTakenMs: Number(item.timeTakenMs) || 0,
          allocatedTimeMs: Number(item.allocatedTimeMs) || 0,
          wasAutoSkipped: item.wasAutoSkipped === true,
        },
      ])
    )

    const report = await runDiagnostic({
      studentId: body.studentId?.trim() || "Riya Sharma",
      subject: body.subject as never,
      classLevel: body.classLevel as never,
      topic: body.topic ?? "",
      maxQuestions: Number(body.maxQuestions) || 1,
      onQuestion: async (question) =>
        answerMap.get(question.id) ?? {
          answer: "",
          timeTakenMs: 0,
          allocatedTimeMs: 0,
          wasAutoSkipped: false,
        },
    })

    return NextResponse.json({ report })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to submit quiz.",
      },
      { status: 400 }
    )
  }
}
