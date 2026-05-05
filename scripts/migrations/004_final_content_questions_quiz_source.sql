CREATE INDEX IF NOT EXISTS final_content_questions_subject_grade_topic_idx
  ON public.final_content_questions (subject, grade, topic);

CREATE INDEX IF NOT EXISTS final_content_questions_subject_grade_idx
  ON public.final_content_questions (subject, grade);

CREATE INDEX IF NOT EXISTS final_content_questions_subject_grade_difficulty_topic_idx
  ON public.final_content_questions (subject, grade, difficulty_level, topic);
