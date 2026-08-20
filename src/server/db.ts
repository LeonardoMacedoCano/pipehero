import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// DATE (OID 1082): keep as 'YYYY-MM-DD' text instead of node-postgres's default JS Date —
// economy.ts does its own UTC date-string math and a Date object here silently breaks it.
types.setTypeParser(1082, (value) => value);

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

// Use client.query(...) inside fn, not the module-level query() above — that grabs a fresh
// connection from the pool on every call and would break transaction isolation.
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
