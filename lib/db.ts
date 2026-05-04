import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: false, // Required for some RDS instances
  },
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
