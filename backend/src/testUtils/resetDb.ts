import { pool } from '../db';

export async function resetDb() {
  await pool.query('TRUNCATE content_types CASCADE');
}
