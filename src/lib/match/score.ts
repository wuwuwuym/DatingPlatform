import { ZODIAC_ELEMENTS, zodiacElement, type ZodiacElement } from "@/lib/constants";

/**
 * Explainable matching. Every weight is public and the UI shows the breakdown,
 * so a score can never look like an unexplainable black box.
 */
export const MATCH_WEIGHTS = {
  hobbyPer: 8,
  hobbyCap: 24,
  mbtiDimensionPer: 6,
  mbtiCap: 12,
  /** N/S and T/F are the two dimensions weighted for the MVP. */
  mbtiKeyDimensions: [1, 2] as const,
  tagPer: 5,
  tagCap: 15,
  zodiacSameElement: 2,
} as const;

export const MATCH_MAX_RAW =
  MATCH_WEIGHTS.hobbyCap +
  MATCH_WEIGHTS.mbtiCap +
  MATCH_WEIGHTS.tagCap +
  MATCH_WEIGHTS.zodiacSameElement;

const DIMENSION_LABELS = ["E/I", "N/S", "T/F", "J/P"] as const;

export interface MatchProfile {
  hobbies: string[];
  personalityTags: string[];
  mbti: string | null;
  zodiac: string | null;
}

export interface MatchBreakdown {
  hobby: number;
  mbti: number;
  tag: number;
  zodiac: number;
}

export interface MatchResult {
  score: number;
  raw: number;
  breakdown: MatchBreakdown;
  reasons: string[];
  sharedHobbies: string[];
  sharedTags: string[];
  mbtiDimensionMatches: string[];
  sameZodiacElement: boolean;
}

function intersection(left: string[], right: string[]): string[] {
  const pool = new Set(right);
  return [...new Set(left)].filter((item) => pool.has(item));
}

function countMbtiMatches(me: string | null, other: string | null): string[] {
  if (!me || !other || me.length !== 4 || other.length !== 4) return [];
  const matches: string[] = [];
  for (const index of MATCH_WEIGHTS.mbtiKeyDimensions) {
    if (me[index] === other[index]) {
      matches.push(DIMENSION_LABELS[index] ?? "");
    }
  }
  return matches.filter(Boolean);
}

export function scoreMatch(me: MatchProfile, other: MatchProfile): MatchResult {
  const sharedHobbies = intersection(me.hobbies, other.hobbies);
  const sharedTags = intersection(me.personalityTags, other.personalityTags);
  const mbtiDimensionMatches = countMbtiMatches(me.mbti, other.mbti);

  const breakdown: MatchBreakdown = {
    hobby: Math.min(sharedHobbies.length * MATCH_WEIGHTS.hobbyPer, MATCH_WEIGHTS.hobbyCap),
    mbti: Math.min(
      mbtiDimensionMatches.length * MATCH_WEIGHTS.mbtiDimensionPer,
      MATCH_WEIGHTS.mbtiCap,
    ),
    tag: Math.min(sharedTags.length * MATCH_WEIGHTS.tagPer, MATCH_WEIGHTS.tagCap),
    zodiac: 0,
  };

  const myElement = zodiacElement(me.zodiac);
  const otherElement = zodiacElement(other.zodiac);
  const sameZodiacElement =
    myElement !== null && otherElement !== null && myElement === otherElement;
  if (sameZodiacElement) breakdown.zodiac = MATCH_WEIGHTS.zodiacSameElement;

  const raw = breakdown.hobby + breakdown.mbti + breakdown.tag + breakdown.zodiac;
  const score = Math.min(100, Math.round((raw / MATCH_MAX_RAW) * 100));

  const reasons = buildReasons({
    sharedHobbies,
    sharedTags,
    mbtiDimensionMatches,
    myElement: sameZodiacElement ? myElement : null,
    breakdown,
  });

  return {
    score,
    raw,
    breakdown,
    reasons,
    sharedHobbies,
    sharedTags,
    mbtiDimensionMatches,
    sameZodiacElement,
  };
}

function buildReasons(input: {
  sharedHobbies: string[];
  sharedTags: string[];
  mbtiDimensionMatches: string[];
  myElement: ZodiacElement | null;
  breakdown: MatchBreakdown;
}): string[] {
  const candidates: { weight: number; text: string }[] = [];

  if (input.sharedHobbies.length > 0) {
    candidates.push({
      weight: input.breakdown.hobby,
      text: `你们都想聊 ${input.sharedHobbies.slice(0, 3).join("、")}`,
    });
  }
  if (input.mbtiDimensionMatches.length > 0) {
    candidates.push({
      weight: input.breakdown.mbti,
      text: `MBTI 在 ${input.mbtiDimensionMatches.join("、")} 维度上一致`,
    });
  }
  if (input.sharedTags.length > 0) {
    candidates.push({
      weight: input.breakdown.tag,
      text: `性格标签重合：${input.sharedTags.slice(0, 3).join("、")}`,
    });
  }
  if (input.myElement) {
    candidates.push({
      weight: input.breakdown.zodiac,
      text: `同为${ZODIAC_ELEMENTS[input.myElement]}星座，节奏相近`,
    });
  }

  return candidates
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((item) => item.text);
}
