import type { AccentTone, AvatarVariant, Student } from "@/lib/landing-data";
import type { RecommendationItem } from "@/lib/types";

const AVATAR_VARIANTS: AvatarVariant[] = [
  "xiaoman",
  "yuchen",
  "suning",
  "zhouzhou",
  "hemiao",
  "tangke",
];

const AVATAR_TONES: Record<AvatarVariant, AccentTone> = {
  xiaoman: "coral",
  yuchen: "indigo",
  suning: "mint",
  zhouzhou: "coral",
  hemiao: "mint",
  tangke: "indigo",
};

/** FNV-1a: stable across server and client, so SSR and hydration pick the same art. */
function hashId(id: string): number {
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function avatarVariantForId(id: string): AvatarVariant {
  return AVATAR_VARIANTS[hashId(id) % AVATAR_VARIANTS.length]!;
}

export function commonHobbiesOf(profileHobbies: string[], viewerHobbies: string[]): string[] {
  const viewer = new Set(viewerHobbies);
  return profileHobbies.filter((hobby) => viewer.has(hobby));
}

/**
 * Converts a ranked matching-pool entry into the card model used by the
 * landing page. The landing page never invents presence data: `online` stays
 * `null` until the product ships a real presence signal.
 */
export function toLandingStudent(
  item: RecommendationItem,
  viewerHobbies: string[],
): Student {
  const profile = item.profile;
  const interests = (profile.hobbies.length > 0 ? profile.hobbies : profile.personalityTags).slice(
    0,
    3,
  );
  const common = commonHobbiesOf(profile.hobbies, viewerHobbies);
  const avatar = avatarVariantForId(profile.id);

  return {
    id: profile.id,
    name: profile.nickname,
    grade: profile.grade?.trim() ?? "",
    major: profile.department?.trim() ?? "",
    bio: profile.bio.trim() || "还没来得及写简介，打个招呼认识一下吧。",
    interests: interests.length > 0 ? interests : ["同校"],
    sharedInterest: common[0] ?? interests[0] ?? "同校",
    online: null,
    verified: true,
    match: item.score,
    avatar,
    tone: AVATAR_TONES[avatar],
    avatarUrl: profile.avatarUrl,
    following: item.following,
    commonInterests: common.length,
    demo: false,
  };
}
