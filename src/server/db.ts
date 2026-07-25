import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  return getPool()
    .query<T>(text, params)
    .then((result) => result.rows);
}
