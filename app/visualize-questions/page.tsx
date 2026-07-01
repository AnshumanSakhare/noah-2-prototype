import Link from "next/link";
import { query } from "@/lib/db";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  Sparkles, 
  CheckSquare, 
  Type, 
  Move,
  BookOpen,
  Sliders,
  Globe,
  Tag,
  Filter,
  XCircle,
  GraduationCap
} from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  type?: string;
  page?: string;
  grade?: string;
  region?: string;
  topic?: string;
}>;

type QuestionRow = {
  id: string;
  question_type: string;
  question_text: string;
  question_svg: string | null;
  subject: string;
  grade: string;
  topic: string;
  subtopic: string | null;
  learning_objective: string | null;
  blooms_level: string | null;
  difficulty_level: string | null;
  difficulty_rating: number | null;
  options: unknown;
  explanation: string | null;
  generation_metadata: unknown;
  region: string | null;
};

// Safe JSON parser
function parseJsonSafe<T>(value: unknown, defaultValue: T): T {
  if (!value) return defaultValue;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

// Badge styling helper based on difficulty
function getDifficultyBadgeClass(level: string | null): string {
  const norm = (level || "").toLowerCase().trim();
  if (norm === "easy") return "bg-[#E8F8F1] text-[#10845B] border border-[#B3EAD2]";
  if (norm === "medium") return "bg-[#FFF4DF] text-[#B76E00] border border-[#FFE2AD]";
  if (norm === "hard") return "bg-[#EEF2FF] text-[#375DFB] border border-[#C7D2FE]";
  return "bg-[#F3F4F6] text-[#475467] border border-[#E5E7EB]";
}

// Badge styling helper based on Bloom level
function getBloomBadgeClass(level: string | null): string {
  const norm = (level || "").toLowerCase().trim();
  if (norm.includes("rem") || norm.includes("know")) return "bg-sky-50 text-sky-700 border border-sky-200";
  if (norm.includes("und")) return "bg-indigo-50 text-indigo-700 border border-indigo-200";
  return "bg-purple-50 text-purple-700 border border-purple-200"; // Applying / Critical Thinking
}

// Visual layout helper for Drag & Drop
interface DragDropItem {
  id: string;
  label: string;
}

interface DragDropTarget {
  id: string;
  label: string;
}

interface DragDropPair {
  itemId: string;
  targetId: string;
}

interface DragDropPayload {
  items?: DragDropItem[];
  draggableItems?: string[];
  targets?: DragDropTarget[];
  dropZones?: string[];
  answerKey?: DragDropPair[];
}

export default async function VisualizeQuestionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activeType = params.type; // 'mcq', 'fitb', or 'drag_drop'
  const activePage = Math.max(1, parseInt(params.page || "1", 10));
  const activeGrade = params.grade || "";
  const activeRegion = params.region || "";
  const activeTopic = params.topic || "";
  
  const pageSize = 10;
  const offset = (activePage - 1) * pageSize;

  // 1. Fetch Question Type Counts
  const countsResult = await query(`
    SELECT question_type, count(*)::int as count 
    FROM final_content_questions_1 
    WHERE question_type IN ('mcq', 'fitb', 'drag_drop') 
    GROUP BY question_type
  `);
  
  const typeCounts: Record<string, number> = {
    mcq: 0,
    fitb: 0,
    drag_drop: 0,
  };

  for (const row of countsResult.rows) {
    if (row.question_type) {
      typeCounts[row.question_type] = row.count;
    }
  }

  // 2. Fetch questions and count if a type is active
  let questions: QuestionRow[] = [];
  let totalQuestions = 0;
  
  // Available filter options fetched dynamically from database
  let availableGrades: string[] = [];
  let availableRegions: string[] = [];
  let availableTopics: string[] = [];

  if (activeType && ['mcq', 'fitb', 'drag_drop'].includes(activeType)) {
    
    // Fetch distinct filter options dynamically based on question_type
    const [gradesRes, regionsRes, topicsRes] = await Promise.all([
      query(
        `SELECT DISTINCT grade FROM final_content_questions_1 WHERE question_type = $1 AND grade IS NOT NULL AND grade <> '' ORDER BY grade`,
        [activeType]
      ),
      query(
        `SELECT DISTINCT region FROM final_content_questions_1 WHERE question_type = $1 AND region IS NOT NULL AND region <> '' ORDER BY region`,
        [activeType]
      ),
      query(
        `SELECT DISTINCT topic FROM final_content_questions_1 WHERE question_type = $1 AND topic IS NOT NULL AND topic <> '' ORDER BY topic`,
        [activeType]
      )
    ]);

    availableGrades = gradesRes.rows.map(r => r.grade);
    availableRegions = regionsRes.rows.map(r => r.region);
    availableTopics = topicsRes.rows.map(r => r.topic);

    // Build parameterized conditions dynamically
    const conditions = ["question_type = $1"];
    const paramsList: any[] = [activeType];
    let paramIndex = 2;

    if (activeGrade) {
      conditions.push(`grade = $${paramIndex}`);
      paramsList.push(activeGrade);
      paramIndex++;
    }
    if (activeRegion) {
      conditions.push(`region = $${paramIndex}`);
      paramsList.push(activeRegion);
      paramIndex++;
    }
    if (activeTopic) {
      conditions.push(`topic = $${paramIndex}`);
      paramsList.push(activeTopic);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    // Fetch matching questions
    const questionsQuery = query(
      `
        SELECT 
          id::text,
          question_type,
          question_text,
          question_svg,
          subject,
          grade,
          topic,
          subtopic,
          learning_objective,
          blooms_level,
          difficulty_level,
          difficulty_rating,
          options,
          explanation,
          generation_metadata,
          region
        FROM final_content_questions_1
        WHERE ${whereClause}
        ORDER BY id
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `,
      [...paramsList, pageSize, offset]
    );

    // Fetch matching counts
    const countQuery = query(
      `
        SELECT count(*)::int as count
        FROM final_content_questions_1
        WHERE ${whereClause}
      `,
      paramsList
    );

    const [qRes, cRes] = await Promise.all([questionsQuery, countQuery]);
    questions = qRes.rows as QuestionRow[];
    totalQuestions = cRes.rows[0].count;
  }

  const totalPages = Math.ceil(totalQuestions / pageSize);

  // Helper for generating page href with all filters preserved
  function getPageHref(page: number) {
    const search = new URLSearchParams();
    search.set("type", activeType || "");
    search.set("page", String(page));
    if (activeGrade) search.set("grade", activeGrade);
    if (activeRegion) search.set("region", activeRegion);
    if (activeTopic) search.set("topic", activeTopic);
    return `/visualize-questions?${search.toString()}`;
  }

  return (
    <main className="min-h-screen bg-[var(--bg-warm)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        
        {/* Page Header */}
        <div className="mb-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-[var(--border)] pb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Database Explorer
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--heading)] sm:text-4xl">
              Curated Question Explorer
            </h1>
            <p className="mt-2 text-sm text-[var(--text-dim)] max-w-2xl">
              Browse, analyze, and visualize the entire database of curated assessment questions stored in the <code>final_content_questions_1</code> table.
            </p>
          </div>
          
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text)] shadow-sm hover:bg-[var(--bg-warm)] transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Home Dashboard
          </Link>
        </div>

        {/* Question Type Cards Dashboard */}
        <div className="grid gap-6 sm:grid-cols-3 mb-10">
          
          {/* MCQ Card */}
          <Link
            href="/visualize-questions?type=mcq"
            className={`relative flex flex-col justify-between rounded-3xl p-6 bg-white border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              activeType === "mcq"
                ? "border-[var(--accent-blue)] ring-2 ring-[var(--accent-blue)]/20"
                : "border-[var(--border)]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-[var(--accent-blue)] border border-cyan-100">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-[var(--accent-blue)] border border-cyan-100">
                  MCQ
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Multiple Choice</h2>
              <p className="mt-2 text-xs text-[var(--text-dim)] leading-relaxed">
                Standard single-choice questions with structured options, explanations, and misconception mapping.
              </p>
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-[var(--border)] pt-4">
              <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Total Questions</span>
              <span className="text-2xl font-black text-[var(--text)]">{typeCounts.mcq.toLocaleString()}</span>
            </div>
          </Link>

          {/* FITB Card */}
          <Link
            href="/visualize-questions?type=fitb"
            className={`relative flex flex-col justify-between rounded-3xl p-6 bg-white border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              activeType === "fitb"
                ? "border-[var(--accent-purple)] ring-2 ring-[var(--accent-purple)]/20"
                : "border-[var(--border)]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[var(--accent-purple)] border border-indigo-100">
                  <Type className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-[var(--accent-purple)] border border-indigo-100">
                  FITB
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Fill in the Blank</h2>
              <p className="mt-2 text-xs text-[var(--text-dim)] leading-relaxed">
                Text or arithmetic input questions with designated blanks, hints, and acceptable case-insensitive answer lists.
              </p>
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-[var(--border)] pt-4">
              <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Total Questions</span>
              <span className="text-2xl font-black text-[var(--text)]">{typeCounts.fitb.toLocaleString()}</span>
            </div>
          </Link>

          {/* Drag & Drop Card */}
          <Link
            href="/visualize-questions?type=drag_drop"
            className={`relative flex flex-col justify-between rounded-3xl p-6 bg-white border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              activeType === "drag_drop"
                ? "border-[var(--accent-coral)] ring-2 ring-[var(--accent-coral)]/20"
                : "border-[var(--border)]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[var(--accent-coral)] border border-orange-100">
                  <Move className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-[var(--accent-coral)] border border-orange-100">
                  D&D
                </span>
              </div>
              <h2 className="text-xl font-bold text-[var(--text)]">Drag & Drop</h2>
              <p className="mt-2 text-xs text-[var(--text-dim)] leading-relaxed">
                Interactive matching and classification questions with draggable items mapped to target container zones.
              </p>
            </div>
            <div className="mt-6 flex items-baseline justify-between border-t border-[var(--border)] pt-4">
              <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Total Questions</span>
              <span className="text-2xl font-black text-[var(--text)]">{typeCounts.drag_drop.toLocaleString()}</span>
            </div>
          </Link>

        </div>

        {/* Filters Panel (Shown only when type is active) */}
        {activeType && (
          <div className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 mb-4 text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">
              <Filter className="h-4 w-4 text-[var(--accent-blue)]" /> Filter Dataset
            </div>
            
            <form action="/visualize-questions" method="GET" className="grid gap-4 sm:grid-cols-4 items-end">
              <input type="hidden" name="type" value={activeType} />
              <input type="hidden" name="page" value="1" />

              {/* Grade Filter */}
              <div>
                <label htmlFor="grade" className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5 flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5" /> Grade Level
                </label>
                <select
                  id="grade"
                  name="grade"
                  defaultValue={activeGrade}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-all"
                >
                  <option value="">All Grades</option>
                  {availableGrades.map((grade) => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              {/* Region Filter */}
              <div>
                <label htmlFor="region" className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5 flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" /> Geographic Region
                </label>
                <select
                  id="region"
                  name="region"
                  defaultValue={activeRegion}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-all"
                >
                  <option value="">All Regions</option>
                  {availableRegions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* Topic Filter */}
              <div>
                <label htmlFor="topic" className="block text-xs font-semibold text-[var(--text-dim)] mb-1.5 flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Broad Topic
                </label>
                <select
                  id="topic"
                  name="topic"
                  defaultValue={activeTopic}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] transition-all"
                >
                  <option value="">All Topics</option>
                  {availableTopics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white font-bold text-xs py-2 px-4 shadow-sm transition-all"
                >
                  Apply Filters
                </button>
                {(activeGrade || activeRegion || activeTopic) && (
                  <Link
                    href={`/visualize-questions?type=${activeType}`}
                    className="flex h-8 items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 transition-all"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Clear
                  </Link>
                )}
              </div>

            </form>
          </div>
        )}

        {/* Content Section */}
        {activeType ? (
          <div>
            
            {/* Header for Active List */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                  Showing Questions for <span className="uppercase text-[var(--primary)]">{activeType === 'drag_drop' ? 'drag & drop' : activeType}</span>
                </h3>
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Page <span className="font-bold text-[var(--text)]">{activePage}</span> of <span className="font-bold text-[var(--text)]">{totalPages || 1}</span> ({totalQuestions.toLocaleString()} total questions matching filters)
                </p>
              </div>

              {/* Server-side Pagination Top */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Link
                    href={getPageHref(activePage - 1)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--text-dim)] shadow-sm hover:bg-[var(--bg-warm)] ${
                      activePage <= 1 ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                  
                  <span className="text-xs font-semibold px-3 py-1 bg-white border border-[var(--border)] rounded-xl text-[var(--text)]">
                    {activePage} / {totalPages}
                  </span>

                  <Link
                    href={getPageHref(activePage + 1)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--text-dim)] shadow-sm hover:bg-[var(--bg-warm)] ${
                      activePage >= totalPages ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Questions Stack */}
            <div className="space-y-6">
              {questions.length > 0 ? (
                questions.map((question, index) => {
                  const metadata = parseJsonSafe<any>(question.generation_metadata, {});
                  const payload = parseJsonSafe<any>(metadata.payload || metadata, {});
                  const explanation = question.explanation || payload.explanation || payload.scoringGuidance || "";
                  
                  return (
                    <article 
                      key={question.id}
                      className="overflow-hidden rounded-3xl bg-white border border-[var(--border)] shadow-[0_4px_20px_rgba(0,0,0,0.02)] p-6"
                    >
                      
                      {/* Top Row: Badges & Tags */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-[var(--border)] pb-4">
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold border border-slate-200">
                            #{offset + index + 1}
                          </span>
                          <span className="rounded-full bg-[var(--surface-2)] text-[var(--text-dim)] px-2.5 py-1 text-xs font-mono">
                            ID: {question.id}
                          </span>
                          {question.difficulty_level && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getDifficultyBadgeClass(question.difficulty_level)}`}>
                              {question.difficulty_level}
                            </span>
                          )}
                          {question.blooms_level && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getBloomBadgeClass(question.blooms_level)}`}>
                              {question.blooms_level}
                            </span>
                          )}
                          {question.grade && (
                            <span className="rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 text-xs font-bold border border-amber-200">
                              Grade {question.grade}
                            </span>
                          )}
                          {question.region && (
                            <span className="rounded-full bg-teal-50 text-teal-700 px-2.5 py-1 text-xs font-bold border border-teal-200 flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {question.region}
                            </span>
                          )}
                        </div>

                        {/* Subject/Topic Path */}
                        <div className="text-[11px] font-semibold text-[var(--text-dim)] bg-[var(--surface-2)] px-3 py-1 rounded-xl flex items-center gap-1.5 border border-[var(--border)]">
                          <BookOpen className="h-3.5 w-3.5 text-[var(--primary)]" />
                          <span>{question.subject}</span>
                          <span>•</span>
                          <span>{question.topic}</span>
                        </div>

                      </div>

                      {/* Question Content */}
                      <div className="grid gap-6 lg:grid-cols-12 mb-6">
                        
                        {/* Left: Text & Format Renderer */}
                        <div className="lg:col-span-8 flex flex-col justify-between">
                          <div>
                            <h4 className="text-lg font-extrabold text-[var(--text)] leading-relaxed mb-4">
                              {question.question_text}
                            </h4>

                            {/* 1. MCQ Rendering */}
                            {activeType === "mcq" && (() => {
                              const rawOptions = parseJsonSafe<any[]>(question.options, []);
                              const optionsList = rawOptions.length > 0 ? rawOptions : (payload.options || []);
                              
                              return (
                                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                                  {optionsList.map((opt: any, optIdx: number) => {
                                    const label = String.fromCharCode(65 + optIdx);
                                    const isCorrect = opt.correct || opt.is_correct === true || String(opt.correct).toLowerCase() === 'true';
                                    
                                    return (
                                      <div 
                                        key={optIdx}
                                        className={`rounded-2xl border p-3.5 flex items-start gap-3 transition-colors ${
                                          isCorrect 
                                            ? "border-emerald-200 bg-emerald-50/50" 
                                            : "border-[var(--border)] bg-white"
                                        }`}
                                      >
                                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-xs font-bold text-[var(--text)] border border-[var(--border)]">
                                          {label}
                                        </span>
                                        <div>
                                          <p className="text-sm font-semibold text-[var(--text)]">{opt.text || opt.label || ""}</p>
                                          {isCorrect && (
                                            <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                              Correct Answer
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}

                            {/* 2. FITB Rendering */}
                            {activeType === "fitb" && (() => {
                              const expectedAnswer = payload.answer || question.question_text.match(/____+/)?.[0] || "";
                              const hint = payload.hint || "";
                              const acceptable = payload.acceptableAnswers || [];
                              
                              return (
                                <div className="mt-4 space-y-3">
                                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-purple)]"></span>
                                      <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Correct Answer Payload</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl font-mono text-sm font-bold text-indigo-700 shadow-sm">
                                        {expectedAnswer || "Not configured"}
                                      </span>
                                      {acceptable.length > 1 && (
                                        <span className="text-xs text-[var(--text-dim)]">
                                          Acceptable options: <code className="font-semibold text-[var(--text)]">{JSON.stringify(acceptable)}</code>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {hint && (
                                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-[var(--text-dim)] border border-[var(--border)]">
                                      <span className="font-bold text-[var(--text)] mr-1">Hint:</span> {hint}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 3. Drag & Drop Rendering */}
                            {activeType === "drag_drop" && (() => {
                              const dragPayload = payload as DragDropPayload;
                              
                              // Map drag items
                              let draggableItems: DragDropItem[] = [];
                              if (Array.isArray(dragPayload.items)) {
                                draggableItems = dragPayload.items;
                              } else if (Array.isArray(dragPayload.draggableItems)) {
                                draggableItems = dragPayload.draggableItems.map((item, idx) => ({ id: `item_${idx}`, label: item }));
                              }

                              // Map drop zones / targets
                              let dropZones: DragDropTarget[] = [];
                              if (Array.isArray(dragPayload.targets)) {
                                dropZones = dragPayload.targets;
                              } else if (Array.isArray(dragPayload.dropZones)) {
                                dropZones = dragPayload.dropZones.map((zone, idx) => ({ id: `target_${idx}`, label: zone }));
                              }

                              const answers = dragPayload.answerKey || [];

                              return (
                                <div className="mt-4 space-y-4">
                                  
                                  {/* Draggable Elements */}
                                  <div>
                                    <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider block mb-2">Draggable Cards</span>
                                    <div className="flex flex-wrap gap-2">
                                      {draggableItems.map((item) => (
                                        <span 
                                          key={item.id}
                                          className="px-3.5 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-900 shadow-sm flex items-center gap-1.5"
                                        >
                                          <Move className="h-3 w-3 text-amber-500" /> {item.label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Target Containers Mapping */}
                                  <div>
                                    <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-wider block mb-2">Drop Targets Mapping (Answer Key)</span>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {dropZones.map((target) => {
                                        // Find all items mapped to this target
                                        const matchedItems = answers
                                          .filter((ans) => ans.targetId === target.id || (ans as any).target === target.label)
                                          .map((ans) => {
                                            const matchedItem = draggableItems.find((itm) => itm.id === ans.itemId || itm.label === (ans as any).item);
                                            return matchedItem ? matchedItem.label : ((ans as any).item || ans.itemId);
                                          });

                                        return (
                                          <div key={target.id} className="rounded-2xl border border-orange-100 bg-orange-50/20 p-3.5">
                                            <span className="text-xs font-extrabold text-orange-800 uppercase tracking-wide block mb-2">{target.label}</span>
                                            <div className="flex flex-wrap gap-1.5 min-h-[36px] bg-white/60 rounded-xl p-1.5 border border-dashed border-orange-200">
                                              {matchedItems.length > 0 ? (
                                                matchedItems.map((itemLabel, idx) => (
                                                  <span key={idx} className="px-2 py-1 bg-white border border-orange-200 rounded-lg text-xs font-bold text-orange-950 shadow-2xs">
                                                    {itemLabel}
                                                  </span>
                                                ))
                                              ) : (
                                                <span className="text-[10px] text-[var(--text-dim)] italic p-1">No items mapped</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </div>
                              );
                            })()}

                          </div>

                          {/* Expandable Explanation Details Box */}
                          {explanation && (
                            <div className="mt-5 border-t border-[var(--border)] pt-4">
                              <details className="group">
                                <summary className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider cursor-pointer list-none select-none hover:text-[var(--text)] transition-colors">
                                  <span className="transition-transform group-open:rotate-90">▶</span> Pedagogical Explanation
                                </summary>
                                <div className="mt-2.5 rounded-2xl bg-amber-50/50 p-4 border border-amber-100/50 text-sm leading-relaxed text-amber-900">
                                  {explanation}
                                </div>
                              </details>
                            </div>
                          )}

                        </div>

                        {/* Right: Technical Metadata (LOs, focus, planner pack) */}
                        <div className="lg:col-span-4 rounded-2xl bg-[var(--surface-2)] p-4 border border-[var(--border)] flex flex-col justify-between text-xs text-[var(--text-dim)]">
                          <div className="space-y-4">
                            
                            <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between">
                              <span className="font-bold text-[var(--text)] uppercase tracking-wider text-[10px]">Assessment Specs</span>
                              <Sliders className="h-3.5 w-3.5 text-[var(--text-dim)]" />
                            </div>

                            {question.learning_objective && (
                              <div>
                                <span className="font-bold text-[var(--text)] block mb-1">Learning Objective:</span>
                                <p className="leading-relaxed">{question.learning_objective}</p>
                              </div>
                            )}

                            {question.subtopic && (
                              <div>
                                <span className="font-bold text-[var(--text)] block mb-1">Subtopic:</span>
                                <p>{question.subtopic}</p>
                              </div>
                            )}

                            {metadata.focus && (
                              <div>
                                <span className="font-bold text-[var(--text)] block mb-1">Skill Focus:</span>
                                <p className="italic font-medium text-[var(--text)]">"{metadata.focus}"</p>
                              </div>
                            )}

                          </div>

                          {metadata.planner?.packId && (
                            <div className="mt-6 border-t border-[var(--border)] pt-3 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-[var(--text-dim)] flex items-center gap-1">
                                <Tag className="h-3 w-3" /> PACK ID:
                              </span>
                              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded">
                                {metadata.planner.packId}
                              </span>
                            </div>
                          )}

                        </div>

                      </div>

                    </article>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-12 text-center max-w-xl mx-auto shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-[var(--primary)] border border-amber-100 mb-6">
                    <XCircle className="h-8 w-8 text-amber-500 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[var(--text)] mb-2">No matching questions</h3>
                  <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-sm mx-auto mb-6">
                    There are no curated questions matching the applied filter criteria (Grade: {activeGrade || 'All'}, Region: {activeRegion || 'All'}, Topic: {activeTopic || 'All'}). Try resetting filters.
                  </p>
                  <Link 
                    href={`/visualize-questions?type=${activeType}`}
                    className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[var(--accent-blue)]/90 transition-all"
                  >
                    Reset Filters
                  </Link>
                </div>
              )}
            </div>

            {/* Server-side Pagination Bottom */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border)] pt-6">
                <span className="text-xs text-[var(--text-dim)]">
                  Showing questions <span className="font-bold text-[var(--text)]">{offset + 1}</span> to <span className="font-bold text-[var(--text)]">{Math.min(offset + pageSize, totalQuestions)}</span> of <span className="font-bold text-[var(--text)]">{totalQuestions.toLocaleString()}</span>
                </span>
                
                <div className="flex items-center gap-1">
                  
                  {/* Previous Button */}
                  <Link
                    href={getPageHref(activePage - 1)}
                    className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--text-dim)] shadow-sm hover:bg-[var(--bg-warm)] ${
                      activePage <= 1 ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Link>

                  {/* Dynamic Page Numbers (show surrounding pages) */}
                  {(() => {
                    let startPage = Math.max(1, activePage - 2);
                    let endPage = Math.min(totalPages, startPage + 4);
                    if (endPage - startPage < 4) {
                      startPage = Math.max(1, endPage - 4);
                    }
                    
                    const pages = [];
                    for (let p = startPage; p <= endPage; p++) {
                      pages.push(p);
                    }

                    return pages.map((targetPage) => (
                      <Link
                        key={targetPage}
                        href={getPageHref(targetPage)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                          activePage === targetPage
                            ? "bg-[var(--accent-blue)] text-white shadow-sm border border-[var(--accent-blue)]"
                            : "bg-white border border-[var(--border)] hover:bg-[var(--bg-warm)] text-[var(--text)]"
                        }`}
                      >
                        {targetPage}
                      </Link>
                    ));
                  })()}

                  {/* Next Button */}
                  <Link
                    href={getPageHref(activePage + 1)}
                    className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--text-dim)] shadow-sm hover:bg-[var(--bg-warm)] ${
                      activePage >= totalPages ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Link>

                </div>
              </div>
            )}

          </div>
        ) : (
          
          /* Empty/Initial Selection State */
          <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-[var(--primary)] border border-amber-100 mb-6">
              <HelpCircle className="h-8 w-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-extrabold text-[var(--text)] mb-2">No category selected</h3>
            <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-sm mx-auto mb-6">
              Please click on one of the question type cards above to visualize the list of questions, retrieve their payloads, and interact with the dataset.
            </p>
            <div className="flex justify-center gap-3">
              <Link 
                href="/visualize-questions?type=mcq"
                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100/60 transition-all"
              >
                Explore MCQ
              </Link>
              <Link 
                href="/visualize-questions?type=fitb"
                className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold hover:bg-purple-100/60 transition-all"
              >
                Explore FITB
              </Link>
            </div>
          </div>

        )}

      </div>
    </main>
  );
}
