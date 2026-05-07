import Link from "next/link";

import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  topic?: string;
  visualMode?: string;
  type?: string;
}>;

type RawVisualQuestionRow = {
  id: string;
  question_type: string;
  question_text: string;
  question_svg: string | null;
  visual_mode: string | null;
  topic: string;
  subtopic: string | null;
  learning_objective: string | null;
  difficulty_level: string | null;
  difficulty_rating: number | null;
  explanation: string | null;
  options: unknown;
  generation_metadata: unknown;
};

type VisualOption = {
  text: string;
  svg?: string;
  correct: boolean;
};

type VisualQuestion = {
  id: string;
  questionType: string;
  questionText: string;
  questionSvg?: string;
  visualMode: string;
  topic: string;
  subtopic: string;
  learningObjective: string;
  difficultyLevel: string;
  difficultyRating?: number;
  explanation: string;
  options: VisualOption[];
  correctAnswerSummary: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function toSvg(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.startsWith("<svg") ? trimmed : undefined;
}

function toMcqOptions(value: unknown): VisualOption[] {
  const rawOptions = Array.isArray(value)
    ? value
    : toArray(toRecord(value).options);

  return rawOptions
    .map((option) => {
      if (typeof option === "string") {
        const svg = toSvg(option);
        return {
          text: svg ? "" : normalizeText(option),
          ...(svg ? { svg } : {}),
          correct: false,
        };
      }

      const record = toRecord(option);
      const correctValue = record.correct ?? record.is_correct;
      const svg = toSvg(
        record.svg ??
          record.option_svg ??
          record.image_svg ??
          record.visual_svg ??
          record.media,
      );

      return {
        text: normalizeText(record.text ?? record.label ?? record.value ?? ""),
        ...(svg ? { svg } : {}),
        correct:
          correctValue === true ||
          String(correctValue).toLowerCase() === "true",
      };
    })
    .filter((option) => option.text.length > 0 || Boolean(option.svg));
}

function formatVisualMode(value: string) {
  const normalized = normalizeKey(value);
  if (normalized === "option_svg") return "Option Svg";
  if (normalized === "question_svg") return "Question Svg";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getQuestionPayload(metadataValue: unknown) {
  const metadata = toRecord(metadataValue);
  const nested = toRecord(metadata.payload);
  return Object.keys(nested).length > 0 ? nested : metadata;
}

function buildVisualQuestion(row: RawVisualQuestionRow): VisualQuestion {
  const payload = getQuestionPayload(row.generation_metadata);
  const questionSvg =
    toSvg(row.question_svg) ??
    toSvg(payload.questionSvg) ??
    toSvg(payload.question_svg);
  const options =
    normalizeKey(row.question_type) === "mcq"
      ? (() => {
          const fromRow = toMcqOptions(row.options);
          return fromRow.length > 0 ? fromRow : toMcqOptions(payload.options);
        })()
      : [];

  const correctOptions = options.filter((option) => option.correct);
  const correctAnswerSummary =
    correctOptions.length > 0
      ? correctOptions
          .map((option, index) => option.text || `Option ${index + 1} (SVG)`)
          .join(" | ")
      : normalizeText(
          payload.answer ?? payload.finalAnswer ?? payload.modelAnswer,
        );

  return {
    id: row.id,
    questionType: normalizeText(row.question_type),
    questionText: normalizeText(row.question_text),
    ...(questionSvg ? { questionSvg } : {}),
    visualMode: normalizeText(row.visual_mode),
    topic: normalizeText(row.topic),
    subtopic: normalizeText(row.subtopic),
    learningObjective: normalizeText(row.learning_objective),
    difficultyLevel: normalizeText(row.difficulty_level || "unknown"),
    ...(row.difficulty_rating
      ? { difficultyRating: row.difficulty_rating }
      : {}),
    explanation: normalizeText(row.explanation),
    options,
    correctAnswerSummary,
  };
}

function badgeClass(tone: "blue" | "green" | "amber" | "slate" | "teal") {
  if (tone === "blue") return "bg-[#EEF2FF] text-[#375DFB]";
  if (tone === "green") return "bg-[#E8F8F1] text-[#10845B]";
  if (tone === "amber") return "bg-[#FFF4DF] text-[#B76E00]";
  if (tone === "teal") return "bg-[#E6F7F5] text-[#0F8B8D]";
  return "bg-[#F3F4F6] text-[#475467]";
}

function difficultyTone(level: string): "green" | "amber" | "blue" {
  const normalized = normalizeKey(level);
  if (normalized === "hard") return "blue";
  if (normalized === "medium") return "amber";
  return "green";
}

async function getVisualQuestions() {
  const result = await query(
    `
      SELECT
        id,
        question_type,
        question_text,
        question_svg,
        visual_mode,
        topic,
        subtopic,
        learning_objective,
        difficulty_level,
        difficulty_rating,
        explanation,
        options,
        generation_metadata
      FROM final_content_questions
      WHERE grade = '6'
        AND visual_mode IS NOT NULL
        AND btrim(visual_mode) <> ''
      ORDER BY topic, subtopic, difficulty_rating NULLS LAST, id
    `,
  );

  return (result.rows as RawVisualQuestionRow[]).map(buildVisualQuestion);
}

function buildFilterHref(
  active: { topic?: string; visualMode?: string; type?: string },
  next: Partial<{ topic?: string; visualMode?: string; type?: string }>,
) {
  const params = new URLSearchParams();
  const merged = { ...active, ...next };

  if (merged.topic) params.set("topic", merged.topic);
  if (merged.visualMode) params.set("visualMode", merged.visualMode);
  if (merged.type) params.set("type", merged.type);

  const queryString = params.toString();
  return queryString
    ? `/visual-review/grade-6?${queryString}`
    : "/visual-review/grade-6";
}

export default async function Grade6VisualReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [questions, filters] = await Promise.all([
    getVisualQuestions(),
    searchParams,
  ]);

  const activeTopic = normalizeText(filters.topic);
  const activeVisualMode = normalizeText(filters.visualMode);
  const activeType = normalizeText(filters.type);

  const filteredQuestions = questions.filter((question) => {
    if (activeTopic && question.topic !== activeTopic) return false;
    if (activeVisualMode && question.visualMode !== activeVisualMode)
      return false;
    if (activeType && question.questionType !== activeType) return false;
    return true;
  });

  const topics = Array.from(
    new Set(questions.map((question) => question.topic)),
  ).sort();
  const visualModes = Array.from(
    new Set(questions.map((question) => question.visualMode)),
  ).sort();
  const questionTypes = Array.from(
    new Set(questions.map((question) => question.questionType)),
  ).sort();

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-6 rounded-[24px] border border-[#E7E1D7] bg-white px-5 py-5 shadow-[0_10px_32px_rgba(24,39,75,0.06)] sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#0F8B8D]">
                Visual Review
              </div>
              <h1 className="mt-2 text-[28px] font-bold tracking-tight text-[#101828]">
                Grade 6 Visual Questions
              </h1>
              <p className="mt-2 max-w-[900px] text-[14px] leading-6 text-[#475467]">
                Review every Grade 6 question with visual content. Use the
                filters to inspect a topic, switch between `question_svg` and
                `option_svg`, and open details to see the explanation and keyed
                answer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[18px] border border-[#E7E1D7] bg-[#FCFBF8] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">
                  Total
                </div>
                <div className="mt-1 text-[24px] font-bold text-[#101828]">
                  {questions.length}
                </div>
              </div>
              <div className="rounded-[18px] border border-[#E7E1D7] bg-[#FCFBF8] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">
                  Topics
                </div>
                <div className="mt-1 text-[24px] font-bold text-[#101828]">
                  {topics.length}
                </div>
              </div>
              <div className="rounded-[18px] border border-[#E7E1D7] bg-[#FCFBF8] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">
                  Option Svg
                </div>
                <div className="mt-1 text-[24px] font-bold text-[#101828]">
                  {
                    questions.filter(
                      (question) =>
                        normalizeKey(question.visualMode) === "option_svg",
                    ).length
                  }
                </div>
              </div>
              <div className="rounded-[18px] border border-[#E7E1D7] bg-[#FCFBF8] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667085]">
                  Question Svg
                </div>
                <div className="mt-1 text-[24px] font-bold text-[#101828]">
                  {
                    questions.filter(
                      (question) =>
                        normalizeKey(question.visualMode) === "question_svg",
                    ).length
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-[24px] border border-[#E7E1D7] bg-white px-5 py-5 shadow-[0_10px_32px_rgba(24,39,75,0.06)] sm:px-7">
          <div className="flex flex-col gap-5">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#667085]">
                Topic Filter
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={buildFilterHref(
                    {
                      ...(activeTopic ? { topic: activeTopic } : {}),
                      ...(activeVisualMode
                        ? { visualMode: activeVisualMode }
                        : {}),
                      ...(activeType ? { type: activeType } : {}),
                    },
                    { topic: undefined },
                  )}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                    !activeTopic
                      ? "border-[#0F8B8D] bg-[#E6F7F5] text-[#0F8B8D]"
                      : "border-[#D6D3D1] bg-[#FCFBF8] text-[#475467]"
                  }`}
                >
                  All topics
                </Link>
                {topics.map((topic) => (
                  <Link
                    key={topic}
                    href={buildFilterHref(
                      {
                        ...(activeTopic ? { topic: activeTopic } : {}),
                        ...(activeVisualMode
                          ? { visualMode: activeVisualMode }
                          : {}),
                        ...(activeType ? { type: activeType } : {}),
                      },
                      { topic },
                    )}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                      activeTopic === topic
                        ? "border-[#0F8B8D] bg-[#E6F7F5] text-[#0F8B8D]"
                        : "border-[#D6D3D1] bg-[#FCFBF8] text-[#475467]"
                    }`}
                  >
                    {topic}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#667085]">
                  Visual Mode
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={buildFilterHref(
                      {
                        ...(activeTopic ? { topic: activeTopic } : {}),
                        ...(activeVisualMode
                          ? { visualMode: activeVisualMode }
                          : {}),
                        ...(activeType ? { type: activeType } : {}),
                      },
                      { visualMode: undefined },
                    )}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                      !activeVisualMode
                        ? "border-[#0F8B8D] bg-[#E6F7F5] text-[#0F8B8D]"
                        : "border-[#D6D3D1] bg-[#FCFBF8] text-[#475467]"
                    }`}
                  >
                    All modes
                  </Link>
                  {visualModes.map((visualMode) => (
                    <Link
                      key={visualMode}
                      href={buildFilterHref(
                        {
                          ...(activeTopic ? { topic: activeTopic } : {}),
                          ...(activeVisualMode
                            ? { visualMode: activeVisualMode }
                            : {}),
                          ...(activeType ? { type: activeType } : {}),
                        },
                        { visualMode },
                      )}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                        activeVisualMode === visualMode
                          ? "border-[#0F8B8D] bg-[#E6F7F5] text-[#0F8B8D]"
                          : "border-[#D6D3D1] bg-[#FCFBF8] text-[#475467]"
                      }`}
                    >
                      {formatVisualMode(visualMode)}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#667085]">
                  Question Type
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={buildFilterHref(
                      {
                        ...(activeTopic ? { topic: activeTopic } : {}),
                        ...(activeVisualMode
                          ? { visualMode: activeVisualMode }
                          : {}),
                        ...(activeType ? { type: activeType } : {}),
                      },
                      { type: undefined },
                    )}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                      !activeType
                        ? "border-[#0F8B8D] bg-[#E6F7F5] text-[#0F8B8D]"
                        : "border-[#D6D3D1] bg-[#FCFBF8] text-[#475467]"
                    }`}
                  >
                    All types
                  </Link>
                  {questionTypes.map((questionType) => (
                    <Link
                      key={questionType}
                      href={buildFilterHref(
                        {
                          ...(activeTopic ? { topic: activeTopic } : {}),
                          ...(activeVisualMode
                            ? { visualMode: activeVisualMode }
                            : {}),
                          ...(activeType ? { type: activeType } : {}),
                        },
                        { type: questionType },
                      )}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                        activeType === questionType
                          ? "border-[#0F8B8D] bg-[#E6F7F5] text-[#0F8B8D]"
                          : "border-[#D6D3D1] bg-[#FCFBF8] text-[#475467]"
                      }`}
                    >
                      {questionType}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mb-4 flex items-center justify-between px-1">
          <div className="text-[14px] font-semibold text-[#475467]">
            Showing{" "}
            <span className="text-[#101828]">{filteredQuestions.length}</span>{" "}
            visual questions
          </div>
          <div className="text-[12px] font-medium text-[#667085]">
            Route: <code>/visual-review/grade-6</code>
          </div>
        </div>

        <div className="space-y-6">
          {filteredQuestions.map((question, index) => {
            const hasQuestionSvg = Boolean(question.questionSvg);
            const hasOptionSvg = question.options.some((option) =>
              Boolean(option.svg),
            );

            return (
              <article
                key={question.id}
                className="rounded-[24px] border border-[#E7E1D7] bg-white px-5 py-5 shadow-[0_10px_32px_rgba(24,39,75,0.06)] sm:px-6"
              >
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[13px] font-bold ${badgeClass("blue")}`}
                    >
                      Q{index + 1}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[13px] font-bold ${badgeClass(
                        difficultyTone(question.difficultyLevel),
                      )}`}
                    >
                      {question.difficultyLevel || "Unknown"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[13px] font-semibold ${badgeClass("slate")}`}
                    >
                      G6
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[13px] font-semibold ${badgeClass("slate")}`}
                    >
                      {formatVisualMode(question.visualMode)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[13px] font-medium ${badgeClass("slate")}`}
                    >
                      ID: {question.id}
                    </span>
                    {hasQuestionSvg ? (
                      <span
                        className={`rounded-full px-3 py-1 text-[13px] font-semibold ${badgeClass("teal")}`}
                      >
                        SVG
                      </span>
                    ) : null}
                    {hasOptionSvg ? (
                      <span
                        className={`rounded-full px-3 py-1 text-[13px] font-semibold ${badgeClass("teal")}`}
                      >
                        Option SVG
                      </span>
                    ) : null}
                  </div>

                  <details className="group rounded-full border border-[#D6D3D1] bg-[#FCFBF8] px-4 py-2 text-[14px] font-semibold text-[#475467]">
                    <summary className="cursor-pointer list-none">
                      <span className="inline-flex items-center gap-2">
                        <span className="transition-transform group-open:rotate-180">
                          ˅
                        </span>
                        Show details
                      </span>
                    </summary>
                    <div className="mt-4 w-[min(460px,80vw)] rounded-[18px] border border-[#E7E1D7] bg-white p-4 text-left shadow-[0_8px_28px_rgba(24,39,75,0.08)]">
                      <div className="grid gap-3 text-[13px] leading-6 text-[#344054]">
                        <div>
                          <span className="font-bold text-[#101828]">ID:</span>{" "}
                          <code>{question.id}</code>
                        </div>
                        <div>
                          <span className="font-bold text-[#101828]">
                            Topic:
                          </span>{" "}
                          {question.topic}
                        </div>
                        <div>
                          <span className="font-bold text-[#101828]">
                            Subtopic:
                          </span>{" "}
                          {question.subtopic || "-"}
                        </div>
                        <div>
                          <span className="font-bold text-[#101828]">
                            Learning Objective:
                          </span>{" "}
                          {question.learningObjective || "-"}
                        </div>
                        <div>
                          <span className="font-bold text-[#101828]">
                            Type:
                          </span>{" "}
                          {question.questionType}
                        </div>
                        <div>
                          <span className="font-bold text-[#101828]">
                            Correct:
                          </span>{" "}
                          {question.correctAnswerSummary || "-"}
                        </div>
                        <div>
                          <span className="font-bold text-[#101828]">
                            Explanation:
                          </span>{" "}
                          {question.explanation || "-"}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                <h2 className="mb-5 text-[20px] font-bold leading-9 text-[#101828] sm:text-[22px]">
                  {question.questionText}
                </h2>

                {hasQuestionSvg ? (
                  <div
                    className="mb-5 flex items-center justify-center overflow-hidden rounded-[20px] border border-[#E8E3D8] bg-[#FAFAF7] p-3 [&_svg]:block [&_svg]:h-[36vh] [&_svg]:max-h-[280px] [&_svg]:w-auto [&_svg]:max-w-full"
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted internal SVG content from the curated question bank is required for visual QA.
                    dangerouslySetInnerHTML={{
                      __html: question.questionSvg ?? "",
                    }}
                  />
                ) : null}

                {question.options.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {question.options.map((option, optionIndex) => {
                      const label = String.fromCharCode(65 + optionIndex);
                      return (
                        <div
                          key={`${question.id}-${label}`}
                          className={`rounded-[22px] border p-4 ${
                            option.correct
                              ? "border-[#9AE6C8] bg-[#F2FBF6]"
                              : "border-[#E7E1D7] bg-white"
                          }`}
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F1EC] text-[15px] font-bold text-[#344054]">
                                {label}
                              </span>
                              {option.correct ? (
                                <span className="rounded-full bg-[#2CCB84] px-3 py-1 text-[12px] font-bold text-white">
                                  Correct
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {option.svg ? (
                            <div
                              className="mb-3 flex items-center justify-center overflow-hidden rounded-[18px] border border-[#E8E3D8] bg-[#FAFAF7] p-2 [&_svg]:block [&_svg]:h-[22vh] [&_svg]:max-h-[200px] [&_svg]:w-auto [&_svg]:max-w-full"
                              // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted internal SVG content from the curated question bank is required for visual QA.
                              dangerouslySetInnerHTML={{ __html: option.svg }}
                            />
                          ) : null}

                          {option.text ? (
                            <div className="text-[15px] font-semibold leading-7 text-[#101828]">
                              {option.text}
                            </div>
                          ) : option.svg ? (
                            <div className="text-[13px] font-medium text-[#667085]">
                              SVG-only option
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[#D6D3D1] bg-[#FCFBF8] px-5 py-6 text-[14px] font-medium text-[#667085]">
                    No MCQ options to render for this visual question.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
