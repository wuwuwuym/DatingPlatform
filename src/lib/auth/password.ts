import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const MAX_MEM = 64 * 1024 * 1024;

/** Returns `scrypt$N$r$p$salt$key`, all parameters stored with the hash. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, {
    ...PARAMS,
    maxmem: MAX_MEM,
  });
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const expected = Buffer.from(rawKey ?? "", "base64");
  if (expected.length === 0) return false;

  const salt = Buffer.from(rawSalt ?? "", "base64");
  const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N,
    r,
    p,
    maxmem: MAX_MEM,
  });

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export interface PasswordCheck {
  ok: boolean;
  message?: string;
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 72;

export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < MIN_LENGTH) {
    return { ok: false, message: `密码至少 ${MIN_LENGTH} 位` };
  }
  if (password.length > MAX_LENGTH) {
    return { ok: false, message: `密码不能超过 ${MAX_LENGTH} 位` };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, message: "密码需同时包含字母和数字" };
  }
  return { ok: true };
}
