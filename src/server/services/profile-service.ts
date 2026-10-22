import { missingProfileLabels } from "@/lib/profile";
import type { Gender, MatchPref, MyProfile, UserRole, UserStatus } from "@/lib/types";
import type { ProfileUpdateInput } from "@/lib/validation";
import type { SessionUser } from "../auth";
import { getDb } from "../db";
import { ApiError } from "../http";
import { iso, PROFILE_COLUMNS } from "../sql";
import { listAchievementsFor } from "./achievements";

interface MyProfileRow {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  gender: Gender | null;
  grade: string | null;
  department: string | null;
  mbti: string | null;
  zodiac: string | null;
  personalityTags: string[];
  hobbies: string[];
  bio: string;
  schoolName: string;
  schoolId: string;
  role: UserRole;
  status: UserStatus;
  matchGenderPref: MatchPref | null;
  createdAt: unknown;
}

const MY_PROFILE_SQL = `
  select
    ${PROFILE_COLUMNS},
    u.school_id as "schoolId",
    u.role,
    u.status,
    u.match_gender_pref as "matchGenderPref",
    u.created_at as "createdAt"
  from users u
  join schools s on s.id = u.school_id
  where u.id = $1
`;

export async function getMyProfile(userId: string): Promise<MyProfile> {
  const db = await getDb();
  return db.withUser(userId, async (tx) => {
    const rows = await tx.query<MyProfileRow>(MY_PROFILE_SQL, [userId]);
    const row = rows[0];
    if (!row) throw new ApiError(404, "NOT_FOUND", "用户不存在");
    const achievements = await listAchievementsFor(tx, userId);
    return {
      ...row,
      createdAt: iso(row.createdAt),
      achievements,
    };
  });
}

interface UpdateResult {
  profile: MyProfile;
  missing: string[];
  promoted: boolean;
}

const COLUMN_MAP: Record<
  keyof Omit<ProfileUpdateInput, "complete">,
  { column: string; cast?: string }
> = {
  nickname: { column: "nickname" },
  avatarUrl: { column: "avatar_url" },
  gender: { column: "gender", cast: "::gender_type" },
  grade: { column: "grade" },
  department: { column: "department" },
  mbti: { column: "mbti" },
  zodiac: { column: "zodiac" },
  personalityTags: { column: "personality_tags", cast: "::text[]" },
  hobbies: { column: "hobbies", cast: "::text[]" },
  bio: { column: "bio" },
  matchGenderPref: { column: "match_gender_pref", cast: "::match_pref" },
};

export async function updateMyProfile(
  user: SessionUser,
  input: ProfileUpdateInput,
): Promise<UpdateResult> {
  const db = await getDb();
  const sets: string[] = [];
  const params: unknown[] = [user.id];

  for (const key of Object.keys(COLUMN_MAP) as (keyof typeof COLUMN_MAP)[]) {
    const value = input[key];
    if (value === undefined) continue;
    const { column, cast } = COLUMN_MAP[key];
    params.push(value);
    sets.push(`${column} = $${params.length}${cast ?? ""}`);
  }

  if (sets.length > 0) {
    await db.withUser(user.id, (tx) =>
      tx.query(`update users set ${sets.join(", ")} where id = $1`, params),
    );
  }

  let promoted = false;
  if (input.complete) {
    try {
      await db.withUser(user.id, (tx) =>
        tx.query("select app.mark_profile_matchable()"),
      );
      promoted = true;
    } catch (error) {
      if (!isProfileIncomplete(error)) throw error;
    }
  }

  const profile = await getMyProfile(user.id);
  const missing = missingProfileLabels({
    nickname: profile.nickname,
    gender: profile.gender,
    mbti: profile.mbti,
    zodiac: profile.zodiac,
    hobbies: profile.hobbies,
    personalityTags: profile.personalityTags,
    matchGenderPref: profile.matchGenderPref,
  });

  return { profile, missing, promoted };
}

function isProfileIncomplete(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "P0001" && candidate.message === "PROFILE_INCOMPLETE";
}
