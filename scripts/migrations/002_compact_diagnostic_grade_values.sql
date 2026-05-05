UPDATE public.diagnostic_students
SET current_class_level = CASE current_class_level
  WHEN 'classKG' THEN 'kg'
  WHEN 'class1' THEN '1'
  WHEN 'class2' THEN '2'
  WHEN 'class3' THEN '3'
  WHEN 'class4' THEN '4'
  WHEN 'class5' THEN '5'
  WHEN 'class6' THEN '6'
  WHEN 'class7' THEN '7'
  WHEN 'class8' THEN '8'
  ELSE current_class_level
END
WHERE current_class_level IN (
  'classKG',
  'class1',
  'class2',
  'class3',
  'class4',
  'class5',
  'class6',
  'class7',
  'class8'
);

UPDATE public.diagnostic_assessments
SET class_level = CASE class_level
  WHEN 'classKG' THEN 'kg'
  WHEN 'class1' THEN '1'
  WHEN 'class2' THEN '2'
  WHEN 'class3' THEN '3'
  WHEN 'class4' THEN '4'
  WHEN 'class5' THEN '5'
  WHEN 'class6' THEN '6'
  WHEN 'class7' THEN '7'
  WHEN 'class8' THEN '8'
  ELSE class_level
END
WHERE class_level IN (
  'classKG',
  'class1',
  'class2',
  'class3',
  'class4',
  'class5',
  'class6',
  'class7',
  'class8'
);

ALTER TABLE public.diagnostic_students
  DROP CONSTRAINT IF EXISTS diagnostic_students_class_level_check;

ALTER TABLE public.diagnostic_students
  ADD CONSTRAINT diagnostic_students_class_level_check CHECK (
    current_class_level IN ('kg', '1', '2', '3', '4', '5', '6', '7', '8')
  );

ALTER TABLE public.diagnostic_assessments
  DROP CONSTRAINT IF EXISTS diagnostic_assessments_class_level_check;

ALTER TABLE public.diagnostic_assessments
  ADD CONSTRAINT diagnostic_assessments_class_level_check CHECK (
    class_level IN ('kg', '1', '2', '3', '4', '5', '6', '7', '8')
  );
