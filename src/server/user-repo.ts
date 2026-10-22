import type { Gender, MatchPref, UserRole, UserStatus } from "@/lib/types";
import { getDb } from "./db";

export interface SessionUser {
  id: string;
  schoolId: string;
  schoolName: string;
  role: UserRole;
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
  matchGenderPref: MatchPref | null;
  status: UserStatus;
}

interface UserRow {
  id: string;
  schoolId: string;
  schoolName: string;
  role: UserRole;
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
  matchGenderPref: MatchPref | null;
  status: UserStatus;
}

export async function findUserById(userId: string): Promise<SessionUser | null> {
  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<UserRow>(
      `select
         u.id,
         u.school_id as "schoolId",
         s.name as "schoolName",
         u.role,
         u.nickname,
         u.avatar_url as "avatarUrl",
         u.gender,
         u.grade,
         u.department,
         u.mbti,
         u.zodiac,
         u.personality_tags as "personalityTags",
         u.hobbies,
         u.bio,
         u.match_gender_pref as "matchGenderPref",
         u.status
       from users u
       join schools s on s.id = u.school_id
       where u.id = $1`,
      [userId],
    ),
  );
  return rows[0] ?? null;
}
