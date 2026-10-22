import { cookies } from "next/headers";
import { config } from "@/lib/config";
import {
  createAdminToken,
  createUserToken,
  signToken,
  verifyToken,
} from "@/lib/auth/session";
import { getDb } from "./db";
import { ApiError } from "./http";
import { findUserById, type SessionUser } from "./user-repo";

export type { SessionUser };

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(config.sessionCookieName)?.value;
  const token = verifyToken(raw, config.sessionSecret);
  if (!token || token.kind !== "user") return null;
  return findUserById(token.uid);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "请先登录");
  if (user.status === "banned") {
    await clearUserSession();
    throw new ApiError(403, "ACCOUNT_BANNED", "账号已被封禁");
  }
  return user;
}

export async function requireMatchable(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.status !== "matchable") {
    throw new ApiError(403, "PROFILE_INCOMPLETE", "请先完善资料，加入匹配池");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const store = await cookies();
  const raw = store.get(config.adminCookieName)?.value;
  const token = verifyToken(raw, config.sessionSecret);
  if (!token || token.kind !== "admin") {
    throw new ApiError(401, "ADMIN_UNAUTHENTICATED", "请先登录管理后台");
  }
  const user = await findUserById(token.adminId);
  if (!user || user.role !== "admin") {
    throw new ApiError(403, "NOT_ADMIN", "该账号不是管理员");
  }
  return user;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: config.isProduction,
    path: "/",
    maxAge,
  };
}

export async function setUserSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: config.sessionCookieName,
    value: signToken(createUserToken(userId, config.sessionMaxAgeSeconds), config.sessionSecret),
    ...cookieOptions(config.sessionMaxAgeSeconds),
  });
}

export async function clearUserSession(): Promise<void> {
  const store = await cookies();
  store.delete(config.sessionCookieName);
}

export async function setAdminSession(adminId: string): Promise<void> {
  const store = await cookies();
  store.set({
    name: config.adminCookieName,
    value: signToken(createAdminToken(adminId, config.sessionMaxAgeSeconds), config.sessionSecret),
    ...cookieOptions(config.sessionMaxAgeSeconds),
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(config.adminCookieName);
}

export async function countUsers(): Promise<number> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ count: string }>("select count(*)::text as count from users", []),
  );
  return Number(rows[0]?.count ?? 0);
}
