import type {
  AdminOverview,
  ReportItem,
  ReportStatus,
  UserStatus,
} from "@/lib/types";
import type { SessionUser } from "../auth";
import { getDb } from "../db";
import { ApiError } from "../http";
import { iso } from "../sql";
import { isCorrectAdminPasscode, randomVerificationCode } from "./report-service";

export async function adminLogin(passcode: string): Promise<{ adminId: string }> {
  if (!isCorrectAdminPasscode(passcode)) {
    throw new ApiError(401, "INVALID_PASSCODE", "管理口令不正确");
  }
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string }>(
      "select id from users where role = 'admin' order by created_at asc limit 1",
      [],
    ),
  );
  const admin = rows[0];
  if (!admin) {
    throw new ApiError(500, "ADMIN_MISSING", "管理员账号未初始化，请重新执行迁移");
  }
  return { adminId: admin.id };
}

export async function getOverview(): Promise<AdminOverview> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<AdminOverview>(
      `select
         (select count(*)::int from users where role = 'user') as users,
         (select count(*)::int from users where status = 'matchable') as matchable,
         (select count(*)::int from users where status = 'banned') as banned,
         (select count(*)::int from reports where status = 'pending') as "pendingReports",
         (select count(*)::int from messages where created_at >= current_date) as "messagesToday",
         (select count(*)::int from checkins where checkin_date = current_date) as "checkinsToday"`,
      [],
    ),
  );
  return rows[0] ?? {
    users: 0,
    matchable: 0,
    banned: 0,
    pendingReports: 0,
    messagesToday: 0,
    checkinsToday: 0,
  };
}

interface RawReportRow {
  id: string;
  type: ReportItem["type"];
  description: string;
  status: ReportStatus;
  createdAt: unknown;
  reporter: { id: string; nickname: string };
  target: { id: string; nickname: string; status: UserStatus };
}

export async function listReports(status?: ReportStatus): Promise<ReportItem[]> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<RawReportRow>(
      `select r.id,
              r.type,
              r.description,
              r.status,
              r.created_at as "createdAt",
              json_build_object('id', rep.id, 'nickname', rep.nickname) as reporter,
              json_build_object(
                'id', tgt.id,
                'nickname', tgt.nickname,
                'status', tgt.status
              ) as target
         from reports r
         join users rep on rep.id = r.reporter_id
         join users tgt on tgt.id = r.target_user_id
        where ($1::text is null or r.status = $1::report_status)
        order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc
        limit 100`,
      [status ?? null],
    ),
  );

  return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export async function updateReportStatus(
  admin: SessionUser,
  reportId: string,
  status: ReportStatus,
): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string }>(
      `update reports
          set status = $2::report_status,
              handled_at = case when $2 = 'pending' then null else now() end,
              handled_by = case when $2 = 'pending' then null else $3::uuid end
        where id = $1
        returning id`,
      [reportId, status, admin.id],
    ),
  );
  if (rows.length === 0) throw new ApiError(404, "REPORT_NOT_FOUND", "举报记录不存在");
  return { id: rows[0]!.id };
}

export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<{ id: string; status: UserStatus }> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string; status: UserStatus }>(
      `update users
          set status = case
                when $2::boolean then 'banned'::user_status
                when (
                  nickname <> '' and gender is not null and match_gender_pref is not null
                  and mbti is not null and zodiac is not null
                  and coalesce(array_length(hobbies, 1), 0) >= 1
                  and coalesce(array_length(personality_tags, 1), 0) >= 1
                ) then 'matchable'::user_status
                else 'incomplete'::user_status
              end
        where id = $1 and role = 'user'
        returning id, status`,
      [userId, banned],
    ),
  );
  const row = rows[0];
  if (!row) throw new ApiError(404, "USER_NOT_FOUND", "用户不存在或不可封禁");

  if (banned) {
    await db.withSystem((tx) =>
      tx.query(
        `update conversations
            set closed_at = now()
          where (user_a = $1 or user_b = $1) and closed_at is null`,
        [userId],
      ),
    );
  }

  return row;
}

export async function listSensitiveWords(): Promise<{ id: string; word: string }[]> {
  const db = await getDb();
  return db.withSystem((tx) =>
    tx.query<{ id: string; word: string }>("select id, word from sensitive_words order by word", []),
  );
}

export async function addSensitiveWord(word: string): Promise<{ id: string; word: string }> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string; word: string }>(
      `insert into sensitive_words (word) values ($1)
       on conflict (word) do update set word = excluded.word
       returning id, word`,
      [word],
    ),
  );
  return rows[0]!;
}

export async function removeSensitiveWord(id: string): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string }>("delete from sensitive_words where id = $1 returning id", [id]),
  );
  if (rows.length === 0) throw new ApiError(404, "WORD_NOT_FOUND", "关键词不存在");
  return { id: rows[0]!.id };
}

export interface VerificationCodeRow {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  schoolName: string | null;
}

export async function listVerificationCodes(): Promise<VerificationCodeRow[]> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{
      id: string;
      code: string;
      maxUses: number;
      usedCount: number;
      createdAt: unknown;
      schoolName: string | null;
    }>(
      `select v.id,
              v.code,
              v.max_uses as "maxUses",
              v.used_count as "usedCount",
              v.created_at as "createdAt",
              s.name as "schoolName"
         from verification_codes v
         left join schools s on s.id = v.school_id
        order by v.created_at desc
        limit 50`,
      [],
    ),
  );
  return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export async function createVerificationCodes(input: {
  count: number;
  maxUses: number;
  schoolId?: string | null;
}): Promise<{ code: string; maxUses: number }[]> {
  const db = await getDb();
  const created: { code: string; maxUses: number }[] = [];

  for (let index = 0; index < input.count; index += 1) {
    const code = randomVerificationCode();
    await db.withSystem((tx) =>
      tx.query(
        `insert into verification_codes (code, max_uses, school_id)
         values ($1, $2, $3)`,
        [code, input.maxUses, input.schoolId ?? null],
      ),
    );
    created.push({ code, maxUses: input.maxUses });
  }

  return created;
}
