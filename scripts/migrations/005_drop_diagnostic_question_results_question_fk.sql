DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'diagnostic_question_results'
      AND constraint_name = 'diagnostic_question_results_question_id_fkey'
  ) THEN
    ALTER TABLE public.diagnostic_question_results
      DROP CONSTRAINT diagnostic_question_results_question_id_fkey;
  END IF;
END $$;
