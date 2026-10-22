import { computeStreak, dateKey, reachedThresholds } from "@/lib/checkin/streak";
import { pairKeyOf } from "@/lib/pair";
import type { AchievementItem, CheckinResult } from "@/lib/types";
import type { SessionUser } from "../auth";
import { getDb } from "../db";
import { ApiError } from "../http";

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

export async function checkin(user: SessionUser, friendId: string): Promise<CheckinResult> {
  if (friendId === user.id) {
    throw new ApiError(400, "INVALID_FRIEND", "不能与自己打卡");
  }

  const db = await getDb();
  const pairKey = pairKeyOf(user.id, friendId);
  const today = dateKey();

  const friend = await db.withSystem((tx) =>
    tx.query<{ status: string }>("select status from users where id = $1", [friendId]),
  );
  if (!friend[0] || friend[0].status === "banned") {
    throw new ApiError(403, "FRIEND_UNAVAILABLE", "对方账号当前不可用");
  }

  await db.withUser(user.id, async (tx) => {
    const friends = await tx.query(
      `select 1 from friendships
        where user_a = least($1::uuid, $2::uuid)
          and user_b = greatest($1::uuid, $2::uuid)`,
      [user.id, friendId],
    );
    if (friends.length === 0) {
      throw new ApiError(403, "NOT_FRIENDS", "只有好友之间才能打卡");
    }
  });

  try {
    await db.withUser(user.id, (tx) =>
      tx.query(
        `insert into checkins (pair_key, user_id, partner_id, checkin_date)
         values ($1, $2, $3, $4::date)`,
        [pairKey, user.id, friendId, today],
      ),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "ALREADY_CHECKED_IN", "今天已经和这位好友打过卡了");
    }
    throw error;
  }

  const dates = await db.withUser(user.id, async (tx) => {
    const rows = await tx.query<{ day: string }>(
      `select checkin_date::text as day
         from checkins
        where pair_key = $1 and user_id = $2
        order by checkin_date asc`,
      [pairKey, user.id],
    );
    return rows.map((row) => row.day);
  });

  const streakDays = computeStreak(dates, today);

  const unlocked = await unlockAchievements(user, pairKey, streakDays);

  const partnerCheckedInToday = await db.withSystem(async (tx) => {
    const rows = await tx.query(
      "select 1 from checkins where user_id = $1 and partner_id = $2 and checkin_date = $3::date",
      [friendId, user.id, today],
    );
    return rows.length > 0;
  });

  return {
    streakDays,
    checkedInToday: true,
    partnerCheckedInToday,
    unlocked,
  };
}

async function unlockAchievements(
  user: SessionUser,
  pairKey: string,
  streakDays: number,
): Promise<AchievementItem[]> {
  const db = await getDb();

  const definitions = await db.withSystem((tx) =>
    tx.query<{ id: string; code: string; name: string; description: string; threshold: number }>(
      `select id, code, name, description, threshold
         from achievements
        where condition_type = 'streak_days'
        order by threshold asc`,
      [],
    ),
  );

  const reached = new Set(reachedThresholds(streakDays, definitions.map((row) => row.threshold)));
  if (reached.size === 0) return [];

  const unlocked: AchievementItem[] = [];
  for (const definition of definitions) {
    if (!reached.has(definition.threshold)) continue;

    const inserted = await db.withSystem((tx) =>
      tx.query<{ obtainedAt: unknown }>(
        `insert into user_achievements (user_id, achievement_id, pair_key)
         values ($1, $2, $3)
         on conflict (user_id, achievement_id) do nothing
         returning obtained_at as "obtainedAt"`,
        [user.id, definition.id, pairKey],
      ),
    );
    const row = inserted[0];
    if (!row) continue;

    unlocked.push({
      code: definition.code,
      name: definition.name,
      description: definition.description,
      threshold: definition.threshold,
      obtainedAt:
        row.obtainedAt instanceof Date ? row.obtainedAt.toISOString() : String(row.obtainedAt),
      progress: streakDays,
      pairKey,
    });
  }

  return unlocked;
}
