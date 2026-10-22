import { randomBytes } from "node:crypto";
import { config } from "@/lib/config";
import type { ReportInput } from "@/lib/validation";
import type { SessionUser } from "../auth";
import { getDb } from "../db";
import { ApiError, assertRateLimit } from "../http";
import { limiters } from "../rate-limits";

export async function createReport(
  user: SessionUser,
  input: ReportInput,
): Promise<{ id: string }> {
  assertRateLimit(limiters.report.hit(`report:${user.id}`), "举报过于频繁，请稍后再试");

  if (input.targetUserId === user.id) {
    throw new ApiError(400, "CANNOT_REPORT_SELF", "不能举报自己");
  }

  const db = await getDb();
  const target = await db.withSystem((tx) =>
    tx.query<{ id: string }>("select id from users where id = $1 and role = 'user'", [
      input.targetUserId,
    ]),
  );
  if (target.length === 0) {
    throw new ApiError(404, "USER_NOT_FOUND", "举报对象不存在");
  }

  const rows = await db.withUser(user.id, (tx) =>
    tx.query<{ id: string }>(
      `insert into reports (reporter_id, target_user_id, type, description)
       values ($1, $2, $3, $4)
       returning id`,
      [user.id, input.targetUserId, input.type, input.description],
    ),
  );

  return { id: rows[0]!.id };
}

/** Constant-time-ish comparison that also handles different lengths. */
export function isCorrectAdminPasscode(passcode: string): boolean {
  const expected = Buffer.from(config.adminPasscode);
  const given = Buffer.from(passcode);
  let diff = given.length ^ expected.length;
  const length = Math.max(given.length, expected.length);
  for (let i = 0; i < length; i += 1) {
    diff |= (given[i] ?? 0) ^ (expected[i] ?? 0);
  }
  return diff === 0;
}

export function randomVerificationCode(): string {
  return `CAMPUS-${randomBytes(4).toString("hex").toUpperCase()}`;
}
