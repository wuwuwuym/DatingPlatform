import { getDb } from "../src/server/db";
import { runMigrations } from "../src/server/migrate";

async function main(): Promise<void> {
  const db = await getDb();
  const { applied, skipped } = await runMigrations(db, undefined);
  if (applied.length === 0) {
    console.log(`[migrate] up to date (${skipped.length} migrations already applied)`);
  } else {
    console.log(`[migrate] applied ${applied.length} migration(s):`);
    for (const file of applied) console.log(`  - ${file}`);
  }
  await db.close();
}

main().catch((error) => {
  console.error("[migrate] failed:", error);
  process.exitCode = 1;
});
