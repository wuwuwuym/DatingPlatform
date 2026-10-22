import { createHmac, timingSafeEqual } from "node:crypto";

export interface TokenBase {
  iat: number;
  exp: number;
}

export interface UserToken extends TokenBase {
  kind: "user";
  uid: string;
}

export interface AdminToken extends TokenBase {
  kind: "admin";
  adminId: string;
}

export type Token = UserToken | AdminToken;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signToken(token: Token, secret: string): string {
  const payload = base64url(JSON.stringify(token));
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verifies signature and expiry. Returns null for anything malformed so callers
 * cannot be tricked by a truncated or tampered cookie.
 */
export function verifyToken(raw: string | undefined, secret: string, nowMs = Date.now()): Token | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expected = sign(payload, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const token = parsed as Partial<Token>;
  if (typeof token.exp !== "number" || token.exp * 1000 <= nowMs) return null;
  if (token.kind === "user" && typeof token.uid === "string") {
    return token as UserToken;
  }
  if (token.kind === "admin" && typeof token.adminId === "string") {
    return token as AdminToken;
  }
  return null;
}

export function createUserToken(uid: string, ttlSeconds: number, nowMs = Date.now()): UserToken {
  const iat = Math.floor(nowMs / 1000);
  return { kind: "user", uid, iat, exp: iat + ttlSeconds };
}

export function createAdminToken(adminId: string, ttlSeconds: number, nowMs = Date.now()): AdminToken {
  const iat = Math.floor(nowMs / 1000);
  return { kind: "admin", adminId, iat, exp: iat + ttlSeconds };
}
