import { randomBytes } from "node:crypto";
import { config } from "@/lib/config";
import { hashStudentNo } from "@/lib/auth/identity";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import type { LoginInput, RegisterInput } from "@/lib/validation";
import { getDb } from "../db";
import { ApiError, assertRateLimit } from "../http";
import { limiters } from "../rate-limits";

export interface SchoolOption {
  id: string;
  name: string;
  slug: string;
}

export async function listSchools(): Promise<SchoolOption[]> {
  const db = await getDb();
  return db.withSystem((tx) =>
    tx.query<SchoolOption>("select id, name, slug from schools order by name", []),
  );
}

const CONSENT_LABELS = {
  terms: "用户协议",
  privacy: "隐私政策",
  matching: "匹配特质处理说明",
} as const;

export async function register(
  input: RegisterInput,
  ip: string,
): Promise<{ userId: string }> {
  assertRateLimit(limiters.register.hit(`register:${ip}`), "注册过于频繁，请稍后再试");

  const rejected = (Object.keys(CONSENT_LABELS) as (keyof typeof CONSENT_LABELS)[]).filter(
    (scope) => input.consents[scope] !== true,
  );
  if (rejected.length > 0) {
    throw new ApiError(
      400,
      "CONSENT_REQUIRED",
      `注册前需勾选同意：${rejected.map((scope) => CONSENT_LABELS[scope]).join("、")}`,
      { missing: rejected },
    );
  }

  const strength = checkPasswordStrength(input.password);
  if (!strength.ok) {
    throw new ApiError(400, "WEAK_PASSWORD", strength.message ?? "密码强度不足");
  }

  const db = await getDb();
  const school = await db.withSystem((tx) =>
    tx.query<{ id: string }>("select id from schools where id = $1", [input.schoolId]),
  );
  if (school.length === 0) {
    throw new ApiError(400, "SCHOOL_NOT_FOUND", "学校不存在，请重新选择");
  }

  const studentNoHash = hashStudentNo(
    input.schoolId,
    input.studentNo,
    config.studentNoPepper,
  );

  const duplicated = await db.withSystem((tx) =>
    tx.query(
      "select 1 from identity_verifications where school_id = $1 and student_no_hash = $2",
      [input.schoolId, studentNoHash],
    ),
  );
  if (duplicated.length > 0) {
    throw new ApiError(409, "ALREADY_REGISTERED", "该学号已注册，请直接登录");
  }

  const codeRows = await db.withSystem((tx) =>
    tx.query<{ id: string }>(
      `select id
         from verification_codes
        where code = $1
          and (school_id is null or school_id = $2)
          and (expires_at is null or expires_at > now())
          and used_count < max_uses`,
      [input.verificationCode.trim(), input.schoolId],
    ),
  );
  const demoCodeAccepted = input.verificationCode.trim() === config.demoVerificationCode;
  const code = codeRows[0];
  if (!code && !demoCodeAccepted) {
    throw new ApiError(400, "INVALID_CODE", "核验码无效或已过期，请重新输入");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const userId = await db.withSystem(async (tx) => {
      const created = await tx.query<{ id: string }>(
        `insert into users (school_id, status, password_hash)
         values ($1, 'incomplete', $2)
         returning id`,
        [input.schoolId, passwordHash],
      );
      const uid = created[0]!.id;

      await tx.query(
        `insert into identity_verifications (user_id, school_id, student_no_hash)
         values ($1, $2, $3)`,
        [uid, input.schoolId, studentNoHash],
      );

      for (const scope of ["terms", "privacy", "matching"] as const) {
        await tx.query(
          `insert into consents (user_id, policy_version, scope)
           values ($1, $2, $3::consent_scope)`,
          [uid, config.policyVersion, scope],
        );
      }

      if (code) {
        await tx.query("update verification_codes set used_count = used_count + 1 where id = $1", [
          code.id,
        ]);
      }

      return uid;
    });

    return { userId };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "ALREADY_REGISTERED", "该学号已注册，请直接登录");
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

let dummyPasswordHash: string | null = null;

async function verifyDummy(password: string): Promise<false> {
  dummyPasswordHash ??= await hashPassword(randomBytes(12).toString("hex"));
  await verifyPassword(password, dummyPasswordHash);
  return false;
}

export async function login(
  input: LoginInput,
  ip: string,
): Promise<{ userId: string; status: string }> {
  assertRateLimit(limiters.login.hit(`login:${ip}`), "登录尝试过于频繁，请 5 分钟后再试");

  const db = await getDb();
  const studentNoHash = hashStudentNo(
    input.schoolId,
    input.studentNo,
    config.studentNoPepper,
  );

  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string; status: string; passwordHash: string }>(
      `select u.id, u.status, u.password_hash as "passwordHash"
         from identity_verifications iv
         join users u on u.id = iv.user_id
        where iv.school_id = $1 and iv.student_no_hash = $2`,
      [input.schoolId, studentNoHash],
    ),
  );

  const row = rows[0];
  const passwordOk = row
    ? await verifyPassword(input.password, row.passwordHash)
    : await verifyDummy(input.password);

  if (!row || !passwordOk) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "学号或密码不正确");
  }
  if (row.status === "banned") {
    throw new ApiError(403, "ACCOUNT_BANNED", "该账号已被封禁，如有疑问请联系管理员");
  }

  await db.withSystem((tx) =>
    tx.query("update users set last_login_at = now() where id = $1", [row.id]),
  );

  return { userId: row.id, status: row.status };
}
