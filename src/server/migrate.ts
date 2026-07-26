import { query } from "./db.js";
import { MIGRATIONS } from "./migrations.js";

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log("[pipehero] DATABASE_URL not set — skipping migrations (login/accounts disabled)");
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = await query<{ name: string }>("SELECT name FROM schema_migrations");
  const appliedNames = new Set(applied.map((row) => row.name));

  for (const migration of MIGRATIONS) {
    if (appliedNames.has(migration.name)) continue;
    await query(migration.sql);
    await query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration.name]);
  }
}
