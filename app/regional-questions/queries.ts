import { pool } from '@/lib/db';

export async function getDashboardStats() {
  const res = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE region = 'global') as global_count,
      COUNT(*) FILTER (WHERE region = 'US') as us_count,
      COUNT(*) FILTER (WHERE region = 'UK') as uk_count,
      COUNT(*) FILTER (WHERE region = 'Ontario') as ontario_count,
      COUNT(*) FILTER (WHERE region = 'UAE') as uae_count,
      COUNT(*) FILTER (WHERE region = 'Australia') as australia_count
    FROM public.final_content_questions_1;
  `);
  
  const row = res.rows[0];
  const total = parseInt(row.total);
  const globalCount = parseInt(row.global_count);
  const perCountry: Record<string, number> = {
    'US': parseInt(row.us_count),
    'UK': parseInt(row.uk_count),
    'Ontario': parseInt(row.ontario_count),
    'UAE': parseInt(row.uae_count),
    'Australia': parseInt(row.australia_count)
  };
  const localizedTotal = Object.values(perCountry).reduce((acc, curr) => acc + curr, 0);

  return { total, globalCount, localizedTotal, perCountry };
}

export async function getLocalizationParity() {
  const res = await pool.query(`
    WITH TargetRegions AS (
        SELECT COUNT(DISTINCT region) as target_count 
        FROM (VALUES ('UK'), ('Ontario'), ('UAE'), ('Australia')) AS t(region)
    ),
    US_Questions AS (
        SELECT id FROM public.final_content_questions_1 WHERE region = 'US'
    ),
    ChildCounts AS (
        SELECT parent_id, COUNT(DISTINCT region) as child_region_count
        FROM public.final_content_questions_1
        WHERE region IN ('UK', 'Ontario', 'UAE', 'Australia')
        GROUP BY parent_id
    )
    SELECT
        (SELECT COUNT(*) FROM US_Questions) as total_us,
        (SELECT COUNT(*) FROM ChildCounts JOIN TargetRegions ON ChildCounts.child_region_count = TargetRegions.target_count) as fully_localized;
  `);
  return res.rows[0];
}

export async function getLocalizedBreakdowns() {
  const [gradeRes, typeRes] = await Promise.all([
    pool.query(`
      SELECT region, grade, COUNT(*) as count
      FROM public.final_content_questions_1
      WHERE region IN ('US', 'UK', 'Ontario', 'UAE', 'Australia')
      GROUP BY region, grade
      ORDER BY grade, region;
    `),
    pool.query(`
      SELECT region, question_type as type, COUNT(*) as count
      FROM public.final_content_questions_1
      WHERE region IN ('US', 'UK', 'Ontario', 'UAE', 'Australia')
      GROUP BY region, question_type
      ORDER BY type, region;
    `)
  ]);

  return {
    byGrade: gradeRes.rows,
    byType: typeRes.rows
  };
}

export async function getComparisonData(page: number = 1, limit: number = 10) {
  const offset = (page - 1) * limit;

  // Fetch US Master questions and total count in parallel
  const [usRes, countRes] = await Promise.all([
    pool.query(`
      SELECT id, question_text, explanation, subject, grade, topic
      FROM public.final_content_questions_1
      WHERE region = 'US'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `, [limit, offset]),
    pool.query(`SELECT COUNT(*) FROM public.final_content_questions_1 WHERE region = 'US'`)
  ]);

  const usQuestions = usRes.rows;
  const total = parseInt(countRes.rows[0].count);
  const usIds = usQuestions.map(q => q.id);

  if (usIds.length === 0) {
    return { questions: [], total };
  }

  // Fetch children for these US questions
  const childRes = await pool.query(`
    SELECT id, parent_id, region, question_text, explanation
    FROM public.final_content_questions_1
    WHERE parent_id = ANY($1::uuid[])
    AND region IN ('UK', 'Ontario', 'UAE', 'Australia');
  `, [usIds]);

  const children = childRes.rows;

  // Group children by parent_id
  const questions = usQuestions.map(usQ => {
    const regionalVersions: Record<string, any> = {};
    children
      .filter(c => c.parent_id === usQ.id)
      .forEach(c => {
        regionalVersions[c.region] = c;
      });

    return {
      ...usQ,
      regionalVersions
    };
  });

  return { questions, total };
}
