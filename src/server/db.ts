import { PGlite } from "@electric-sql/pglite";
import { mkdirSync } from "node:fs";
import pg from "pg";

export type SqlParam = unknown;

export interface Tx {
  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
}

export interface Db extends Tx {
  /**
   * Runs fn inside a transaction bound to a user identity. All queries executed
   * by fn are subject to row level security for that user.
   */
  withUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Runs fn as the schema owner, which bypasses RLS. Server logic only. */
  withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Serialises access to the single PGlite connection. */
function createMutex() {
  let tail: Promise<unknown> = Promise.resolve();
  return function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

const APP_ROLE = "app_authenticated";

class PgliteDb implements Db {
  private readonly exclusive = createMutex();

  constructor(private readonly client: PGlite) {}

  private async raw<T>(sql: string, params?: SqlParam[]): Promise<T[]> {
    const result = await this.client.query<T>(sql, (params ?? []) as never[]);
    return result.rows;
  }

  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]> {
    return this.exclusive(() => this.raw<T>(sql, params));
  }

  exec(sql: string): Promise<void> {
    return this.exclusive(async () => {
      await this.client.exec(sql);
    });
  }

  private transaction<T>(
    identity: "system" | string | null,
    fn: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    return this.exclusive(async () => {
      await this.client.exec("BEGIN");
      try {
        if (identity !== "system") {
          await this.client.query("select set_config('role', $1, true)", [APP_ROLE]);
          await this.client.query("select set_config('app.user_id', $1, true)", [
            identity ?? "",
          ]);
        }
        const tx: Tx = {
          query: <R>(sql: string, params?: SqlParam[]) => this.raw<R>(sql, params),
          exec: async (sql: string) => {
            await this.client.exec(sql);
          },
        };
        const result = await fn(tx);
        await this.client.exec("COMMIT");
        return result;
      } catch (error) {
        await this.client.exec("ROLLBACK").catch(() => undefined);
        throw error;
      }
    });
  }

  withUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.transaction(userId, fn);
  }

  withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.transaction("system", fn);
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

class PgDb implements Db {
  constructor(private readonly pool: pg.Pool) {}

  async query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]> {
    const result = await this.pool.query(sql, (params ?? []) as never[]);
    return result.rows as T[];
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  private async transaction<T>(
    identity: "system" | string | null,
    fn: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (identity !== "system") {
        await client.query("select set_config('role', $1, true)", [APP_ROLE]);
        await client.query("select set_config('app.user_id', $1, true)", [identity ?? ""]);
      }
      const tx: Tx = {
        query: async <R>(sql: string, params?: SqlParam[]) => {
          const result = await client.query(sql, (params ?? []) as never[]);
          return result.rows as R[];
        },
        exec: async (sql: string) => {
          await client.query(sql);
        },
      };
      const result = await fn(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  withUser<T>(userId: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.transaction(userId, fn);
  }

  withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.transaction("system", fn);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/** Builds an isolated PGlite database. Passing no directory uses memory. */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  if (dataDir) mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  return new PgliteDb(client);
}

/** Builds a pooled Postgres (or Supabase) database. */
export function createPgDb(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    ssl: connectionString.includes("sslmode=") ? undefined : { rejectUnauthorized: false },
  });
  return new PgDb(pool);
}

async function build(): Promise<Db> {
  const { config } = await import("../lib/config");
  if (config.databaseUrl) return createPgDb(config.databaseUrl);
  if (config.pgliteDataDir === "memory") return createPgliteDb();
  return createPgliteDb(config.pgliteDataDir);
}

const globalForDb = globalThis as unknown as { __campusDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__campusDb) {
    globalForDb.__campusDb = build();
  }
  return globalForDb.__campusDb;
}
