ALTER TABLE public.diagnostic_assessments
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'US';

CREATE INDEX IF NOT EXISTS diagnostic_assessments_region_idx
  ON public.diagnostic_assessments (region);

CREATE INDEX IF NOT EXISTS final_content_questions_1_region_subject_grade_topic_idx
  ON public.final_content_questions_1 (region, subject, grade, topic);

CREATE INDEX IF NOT EXISTS final_content_questions_1_region_subject_grade_difficulty_topic_idx
  ON public.final_content_questions_1 (region, subject, grade, difficulty_level, topic);
