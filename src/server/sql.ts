/**
 * Shared column list for a public profile. Requires aliases `u` (users) and
 * `s` (schools) in the surrounding query. Columns are aliased to camelCase so
 * rows can be handed to the UI without a mapping layer.
 */
export const PROFILE_COLUMNS = `
  u.id,
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
  s.name as "schoolName"
`;

export function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
