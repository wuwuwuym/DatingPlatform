import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { Db } from "./db";

export const DEFAULT_MIGRATIONS_DIR = path.join(
  process.cwd(),
  "supabase",
  "migrations",
);

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Applies every *.sql file in filename order, exactly once, inside a transaction.
 * Safe to call on every boot: already-applied versions are recorded in
 * schema_migrations.
 */
export async function runMigrations(
  db: Db,
  dir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationResult> {
  await db.withSystem(async (tx) => {
    await tx.exec(`
      create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);
  });

  const rows = await db.query<{ version: string }>(
    "select version from schema_migrations order by version",
  );
  const applied = new Set(rows.map((row) => row.version));

  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const result: MigrationResult = { applied: [], skipped: [] };

  for (const file of files) {
    if (applied.has(file)) {
      result.skipped.push(file);
      continue;
    }

    const sql = readFileSync(path.join(dir, file), "utf8");
    try {
      await db.withSystem(async (tx) => {
        await tx.exec(sql);
        await tx.query("insert into schema_migrations (version) values ($1)", [file]);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`[migrate] ${file} failed: ${message}`, { cause: error });
    }
    result.applied.push(file);
  }

  return result;
}
