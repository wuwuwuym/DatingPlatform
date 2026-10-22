import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

type DevSecrets = {
  studentNoPepper: string;
  sessionSecret: string;
  adminPasscode: string;
};

let cachedDevSecrets: DevSecrets | null = null;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Local-first development needs zero configuration, but secrets must never be
 * committed. Dev-only secrets are generated once into .data/dev-secrets.json
 * (gitignored). Production always requires real environment variables.
 */
function readOrCreateDevSecrets(): DevSecrets {
  if (cachedDevSecrets) return cachedDevSecrets;
  const file = path.join(DATA_DIR, "dev-secrets.json");

  if (existsSync(file)) {
    cachedDevSecrets = JSON.parse(readFileSync(file, "utf8")) as DevSecrets;
    return cachedDevSecrets;
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const generated: DevSecrets = {
    studentNoPepper: randomBytes(32).toString("base64url"),
    sessionSecret: randomBytes(32).toString("base64url"),
    adminPasscode: randomBytes(6).toString("hex"),
  };
  writeFileSync(file, JSON.stringify(generated, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  cachedDevSecrets = generated;
  return cachedDevSecrets;
}

function resolveSecret(
  envKey: "STUDENT_NO_PEPPER" | "SESSION_SECRET" | "ADMIN_PASSCODE",
  devKey: keyof DevSecrets,
): string {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv && fromEnv.length >= 8) return fromEnv;
  if (isProduction()) {
    throw new Error(
      `[config] ${envKey} must be set (>= 8 chars) when NODE_ENV=production.`,
    );
  }
  return readOrCreateDevSecrets()[devKey];
}

export const config = {
  /** HMAC pepper used when hashing student numbers. */
  get studentNoPepper(): string {
    return resolveSecret("STUDENT_NO_PEPPER", "studentNoPepper");
  },
  /** HMAC key used to sign session cookies. */
  get sessionSecret(): string {
    return resolveSecret("SESSION_SECRET", "sessionSecret");
  },
  /** Passcode that unlocks the demo admin console. */
  get adminPasscode(): string {
    return resolveSecret("ADMIN_PASSCODE", "adminPasscode");
  },

  /** When set, the app talks to a real Postgres/Supabase instead of PGlite. */
  get databaseUrl(): string | null {
    const url = process.env.DATABASE_URL?.trim();
    return url && url.length > 0 ? url : null;
  },

  get pgliteDataDir(): string {
    const custom = process.env.PGLITE_DIR?.trim();
    return custom && custom.length > 0
      ? custom
      : path.join(DATA_DIR, "pgdata");
  },

  /** Version stamped onto every consent record. */
  policyVersion: "2026-01" as const,

  /** Simulated campus verification code usable for the public demo. */
  get demoVerificationCode(): string {
    return process.env.DEMO_VERIFICATION_CODE?.trim() || "CAMPUS-2026";
  },

  get isProduction(): boolean {
    return isProduction();
  },

  sessionCookieName: "tp_session",
  adminCookieName: "tp_admin",
  sessionMaxAgeSeconds: 60 * 60 * 24 * 7,
} as const;

/** Only for the local dev helper script; never exposed over HTTP. */
export function getDevAdminPasscode(): string | null {
  if (isProduction()) return null;
  return readOrCreateDevSecrets().adminPasscode;
}
