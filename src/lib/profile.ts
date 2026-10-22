import type { Gender, MatchPref } from "@/lib/types";

export const PROFILE_FIELD_LABELS = {
  nickname: "昵称",
  gender: "性别",
  mbti: "MBTI",
  zodiac: "星座",
  hobbies: "爱好",
  personalityTags: "性格标签",
  matchGenderPref: "配对偏好",
} as const;

export type ProfileFieldKey = keyof typeof PROFILE_FIELD_LABELS;

export interface ProfileCompletenessInput {
  nickname: string;
  gender: Gender | null;
  mbti: string | null;
  zodiac: string | null;
  hobbies: string[];
  personalityTags: string[];
  matchGenderPref: MatchPref | null;
}

/**
 * The single source of truth for "can this user enter the matching pool?".
 * Mirrors the users_matchable_complete constraint and the SQL guard function.
 */
export function missingProfileFields(profile: ProfileCompletenessInput): ProfileFieldKey[] {
  const missing: ProfileFieldKey[] = [];
  if (profile.nickname.trim().length === 0) missing.push("nickname");
  if (!profile.gender) missing.push("gender");
  if (!profile.mbti) missing.push("mbti");
  if (!profile.zodiac) missing.push("zodiac");
  if (profile.hobbies.length === 0) missing.push("hobbies");
  if (profile.personalityTags.length === 0) missing.push("personalityTags");
  if (!profile.matchGenderPref) missing.push("matchGenderPref");
  return missing;
}

export function missingProfileLabels(profile: ProfileCompletenessInput): string[] {
  return missingProfileFields(profile).map((key) => PROFILE_FIELD_LABELS[key]);
}

/** "same" only matches the same gender; "opposite" only the other one. */
export function genderMatchesPreference(
  preference: MatchPref,
  myGender: Gender,
  otherGender: Gender,
): boolean {
  return preference === "same" ? otherGender === myGender : otherGender !== myGender;
}
