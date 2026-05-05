CREATE TABLE IF NOT EXISTS public.diagnostic_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  normalized_name text NOT NULL,
  current_class_level text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diagnostic_students_class_level_check CHECK (
    current_class_level IN (
      'kg',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS diagnostic_students_normalized_name_class_level_idx
  ON public.diagnostic_students (normalized_name, current_class_level);

CREATE TABLE IF NOT EXISTS public.diagnostic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.diagnostic_students (id),
  student_display_name text NOT NULL,
  test_mode text NOT NULL,
  subject text NOT NULL,
  class_level text NOT NULL,
  topic text,
  readiness_score integer NOT NULL,
  attempted_readiness_score integer,
  overall_readiness_score integer,
  non_attempt_count integer,
  max_questions integer NOT NULL,
  total_questions_shown integer NOT NULL,
  question_bank_size integer NOT NULL,
  stopped_because text NOT NULL,
  expected_learning_objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  topic_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  learning_objective_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtopic_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  bloom_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  lesson_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  distractor_insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  engagement_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  behavioral_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_narrative jsonb,
  report_json jsonb NOT NULL,
  ai_summary text NOT NULL,
  started_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT diagnostic_assessments_test_mode_check CHECK (
    test_mode IN ('topic', 'grade')
  ),
  CONSTRAINT diagnostic_assessments_topic_mode_check CHECK (
    (test_mode = 'topic' AND topic IS NOT NULL)
    OR (test_mode = 'grade' AND topic IS NULL)
  ),
  CONSTRAINT diagnostic_assessments_class_level_check CHECK (
    class_level IN (
      'kg',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8'
    )
  )
);

CREATE INDEX IF NOT EXISTS diagnostic_assessments_student_submitted_idx
  ON public.diagnostic_assessments (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS diagnostic_assessments_class_subject_submitted_idx
  ON public.diagnostic_assessments (class_level, subject, submitted_at DESC);

CREATE INDEX IF NOT EXISTS diagnostic_assessments_test_mode_submitted_idx
  ON public.diagnostic_assessments (test_mode, submitted_at DESC);

CREATE TABLE IF NOT EXISTS public.diagnostic_question_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.diagnostic_assessments (id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.content_questions (id),
  question_order integer NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL,
  topic text NOT NULL,
  subtopic text,
  learning_objective text,
  bloom_level text NOT NULL,
  difficulty_level text,
  student_answer text NOT NULL DEFAULT '',
  verdict text NOT NULL,
  feedback text NOT NULL,
  why_wrong text,
  time_taken_ms integer,
  allocated_time_ms integer,
  was_auto_skipped boolean NOT NULL DEFAULT false,
  question_snapshot jsonb NOT NULL,
  behavioral_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  distractor_analysis jsonb,
  CONSTRAINT diagnostic_question_results_assessment_order_key UNIQUE (
    assessment_id,
    question_order
  ),
  CONSTRAINT diagnostic_question_results_verdict_check CHECK (
    verdict IN ('correct', 'partial', 'incorrect', 'non_attempt')
  )
);

CREATE INDEX IF NOT EXISTS diagnostic_question_results_assessment_order_idx
  ON public.diagnostic_question_results (assessment_id, question_order);

CREATE INDEX IF NOT EXISTS diagnostic_question_results_question_idx
  ON public.diagnostic_question_results (question_id);

CREATE INDEX IF NOT EXISTS diagnostic_question_results_learning_objective_verdict_idx
  ON public.diagnostic_question_results (learning_objective, verdict);
