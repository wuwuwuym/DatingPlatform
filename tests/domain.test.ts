import { describe, expect, it } from "vitest";
import { checkPasswordStrength, hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  hashStudentNo,
  isValidStudentNo,
  maskStudentNo,
  normalizeStudentNo,
} from "@/lib/auth/identity";
import {
  createAdminToken,
  createUserToken,
  signToken,
  verifyToken,
} from "@/lib/auth/session";
import { MATCH_WEIGHTS, scoreMatch, type MatchProfile } from "@/lib/match/score";
import { findSensitiveWords, normalizeForFilter } from "@/lib/chat/sensitive";
import {
  excerptOf,
  isAllowedImageDataUrl,
  isAllowedVideoUrl,
  moderateText,
  normalizePostMedia,
} from "@/lib/circle/content";
import {
  computeStreak,
  dateKey,
  longestStreak,
  reachedThresholds,
  shiftDateKey,
} from "@/lib/checkin/streak";
import { RateLimiter } from "@/lib/rate-limit";
import { avatarVariantForId, toLandingStudent } from "@/lib/landing/adapters";
import type { RecommendationItem } from "@/lib/types";

describe("password hashing", () => {
  it("round-trips a valid password", async () => {
    const stored = await hashPassword("<REDACTED>");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("<REDACTED>", stored)).toBe(true);
  });

  it("rejects a wrong password and malformed hashes", async () => {
    const stored = await hashPassword("<REDACTED>");
    expect(await verifyPassword("<REDACTED>", stored)).toBe(false);
    expect(await verifyPassword("<REDACTED>", "not-a-hash")).toBe(false);
    expect(await verifyPassword("<REDACTED>", "scrypt$x$y$z$aa$bb")).toBe(false);
  });

  it("never stores the plaintext", async () => {
    const stored = await hashPassword("<REDACTED>");
    expect(stored).not.toContain("<REDACTED>");
  });

  it("enforces the documented strength rules", () => {
    expect(checkPasswordStrength("short1").ok).toBe(false);
    expect(checkPasswordStrength("alllettersonly").ok).toBe(false);
    expect(checkPasswordStrength("12345678").ok).toBe(false);
    expect(checkPasswordStrength("<REDACTED>").ok).toBe(true);
  });
});

describe("student number hashing", () => {
  it("normalizes separators before hashing", () => {
    expect(normalizeStudentNo(" 2021 0001 ")).toBe("20210001");
    expect(normalizeStudentNo("2021-0001")).toBe("20210001");
    expect(hashStudentNo("school-a", "2021 0001", "pepper")).toBe(
      hashStudentNo("school-a", "2021-0001", "pepper"),
    );
  });

  it("separates schools and peppers", () => {
    const base = hashStudentNo("school-a", "20210001", "pepper");
    expect(hashStudentNo("school-b", "20210001", "pepper")).not.toBe(base);
    expect(hashStudentNo("school-a", "20210001", "other")).not.toBe(base);
  });

  it("produces a sha256-sized hex digest with no plaintext", () => {
    const hash = hashStudentNo("school-a", "20210001", "pepper");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("20210001");
  });

  it("validates the student number shape", () => {
    expect(isValidStudentNo("20210001")).toBe(true);
    expect(isValidStudentNo("2021-0001")).toBe(true);
    expect(isValidStudentNo("12345")).toBe(false);
    expect(isValidStudentNo("2021abc1")).toBe(false);
  });

  it("masks student numbers for logs", () => {
    expect(maskStudentNo("20210001")).toBe("20****01");
  });
});

describe("session tokens", () => {
  const secret = "test-secret-value";

  it("verifies a freshly signed token", () => {
    const token = signToken(createUserToken("u-1", 60), secret);
    const parsed = verifyToken(token, secret);
    expect(parsed?.kind).toBe("user");
    if (parsed?.kind === "user") expect(parsed.uid).toBe("u-1");
  });

  it("rejects tampered payloads and wrong secrets", () => {
    const token = signToken(createUserToken("u-1", 60), secret);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ kind: "user", uid: "admin", iat: 0, exp: 9999999999 }))
      .toString("base64url");
    expect(verifyToken(`${forged}.${signature}`, secret)).toBeNull();
    expect(verifyToken(token, "another-secret")).toBeNull();
    expect(verifyToken(payload, secret)).toBeNull();
    expect(verifyToken(undefined, secret)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = signToken(createUserToken("u-1", 60, 0), secret);
    expect(verifyToken(token, secret, 61_000)).toBeNull();
    expect(verifyToken(token, secret, 59_000)).not.toBeNull();
  });

  it("keeps admin and user tokens distinct", () => {
    const token = signToken(createAdminToken("admin-1", 60), secret);
    const parsed = verifyToken(token, secret);
    expect(parsed?.kind).toBe("admin");
  });
});

describe("matching score", () => {
  const me: MatchProfile = {
    hobbies: ["摄影", "徒步", "电影", "音乐"],
    personalityTags: ["温和", "幽默", "理性"],
    mbti: "INFJ",
    zodiac: "pisces",
  };

  it("computes the documented weighted score", () => {
    const result = scoreMatch(me, {
      hobbies: ["摄影", "徒步", "旅行", "游戏"],
      personalityTags: ["温和", "幽默", "细心"],
      mbti: "INTJ",
      zodiac: "cancer",
    });

    expect(result.breakdown).toEqual({ hobby: 16, mbti: 6, tag: 10, zodiac: 2 });
    expect(result.raw).toBe(34);
    expect(result.score).toBe(Math.round((34 / (24 + 12 + 15 + 2)) * 100));
  });

  it("caps each dimension", () => {
    const result = scoreMatch(
      { ...me, hobbies: ["摄影", "徒步", "电影", "音乐", "游戏"] },
      {
        hobbies: ["摄影", "徒步", "电影", "音乐", "游戏"],
        personalityTags: ["温和", "幽默", "理性", "细心"],
        mbti: "INFJ",
        zodiac: "pisces",
      },
    );
    expect(result.breakdown.hobby).toBe(MATCH_WEIGHTS.hobbyCap);
    expect(result.breakdown.tag).toBe(MATCH_WEIGHTS.tagCap);
    expect(result.breakdown.mbti).toBe(MATCH_WEIGHTS.mbtiCap);
    expect(result.score).toBe(100);
  });

  it("scores an unrelated profile at zero and still explains nothing", () => {
    const result = scoreMatch(me, {
      hobbies: ["篮球"],
      personalityTags: ["外向"],
      mbti: "ESTP",
      zodiac: "leo",
    });
    expect(result.breakdown).toEqual({ hobby: 0, mbti: 0, tag: 0, zodiac: 0 });
    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("orders reasons by contribution and caps them at three", () => {
    const result = scoreMatch(me, {
      hobbies: ["摄影", "徒步", "电影"],
      personalityTags: ["温和"],
      mbti: "INTJ",
      zodiac: "cancer",
    });
    expect(result.reasons[0]).toContain("摄影");
    expect(result.reasons.length).toBeLessThanOrEqual(3);
    expect(result.reasons.join(" ")).toContain("MBTI");
  });

  it("ignores missing MBTI or zodiac instead of crashing", () => {
    const result = scoreMatch(
      { ...me, mbti: null, zodiac: null },
      { ...me, mbti: null, zodiac: null },
    );
    expect(result.breakdown.mbti).toBe(0);
    expect(result.breakdown.zodiac).toBe(0);
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("sensitive word filter", () => {
  const words = ["代考", "刷单", "裸聊"];

  it("matches plain occurrences", () => {
    expect(findSensitiveWords("有人能代考吗", words)).toEqual(["代考"]);
  });

  it("defeats spacing and punctuation obfuscation", () => {
    expect(findSensitiveWords("代 考", words)).toEqual(["代考"]);
    expect(findSensitiveWords("代-考", words)).toEqual(["代考"]);
    expect(findSensitiveWords("刷\u200b单", words)).toEqual(["刷单"]);
  });

  it("returns nothing for clean text", () => {
    expect(findSensitiveWords("下午一起去图书馆吗", words)).toEqual([]);
    expect(normalizeForFilter("Hello, World!")).toBe("helloworld");
  });
});

describe("circle content moderation", () => {
  const words = ["傻逼", "代考", "开盒"];
  const pixel =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("blocks insult words, including spaced or decorated obfuscation", () => {
    expect(moderateText("你这个傻逼", words)).toEqual(["傻逼"]);
    expect(moderateText("傻 逼", words)).toEqual(["傻逼"]);
    expect(moderateText("傻\u200b逼", words)).toEqual(["傻逼"]);
    expect(moderateText("帮你代-考", words)).toEqual(["代考"]);
  });

  it("lets ordinary campus chatter through", () => {
    expect(moderateText("食堂新出的桂花糖藕好吃，有人一起吗", words)).toEqual([]);
    expect(moderateText("今晚操场有流星雨，记得抬头", words)).toEqual([]);
  });

  it("accepts only compressed raster image data URLs", () => {
    expect(isAllowedImageDataUrl(pixel)).toBe(true);
    expect(isAllowedImageDataUrl("https://example.com/a.jpg")).toBe(false);
    expect(isAllowedImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isAllowedImageDataUrl(`data:image/png;base64,${"A".repeat(400_001)}`)).toBe(false);
  });

  it("accepts only https video links", () => {
    expect(isAllowedVideoUrl("https://example.com/clip.mp4")).toBe(true);
    expect(isAllowedVideoUrl("http://example.com/clip.mp4")).toBe(false);
    expect(isAllowedVideoUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedVideoUrl("not a url")).toBe(false);
  });

  it("normalises media and rejects mixed or oversized attachments", () => {
    const twoImages = normalizePostMedia([
      { type: "image", url: pixel },
      { type: "image", url: pixel },
    ]);
    expect(twoImages.ok).toBe(true);
    if (twoImages.ok) expect(twoImages.media).toHaveLength(2);

    const video = normalizePostMedia([{ type: "video", url: "https://example.com/a.mp4" }]);
    expect(video.ok).toBe(true);

    const mixed = normalizePostMedia([
      { type: "image", url: pixel },
      { type: "video", url: "https://example.com/a.mp4" },
    ]);
    expect(mixed.ok).toBe(false);

    const twoVideos = normalizePostMedia([
      { type: "video", url: "https://example.com/a.mp4" },
      { type: "video", url: "https://example.com/b.mp4" },
    ]);
    expect(twoVideos.ok).toBe(false);

    const tooMany = normalizePostMedia(Array.from({ length: 5 }, () => ({ type: "image" as const, url: pixel })));
    expect(tooMany.ok).toBe(false);
  });

  it("builds a compact single-line excerpt for moderation lists", () => {
    expect(excerptOf("  今天  去了图书馆\n还借了两本书  ")).toBe("今天 去了图书馆 还借了两本书");
    expect(excerptOf("很长的内容".repeat(20), 10)).toHaveLength(11);
  });
});

describe("landing page adapters", () => {
  const recommendation: RecommendationItem = {
    profile: {
      id: "6a2b6f70-0000-4000-8000-00000000c001",
      nickname: "陈一诺",
      avatarUrl: null,
      gender: "male",
      grade: "大三",
      department: "中文系",
      mbti: "INFP",
      zodiac: "pisces",
      personalityTags: ["温和", "慢热"],
      hobbies: ["电影", "阅读", "咖啡"],
      bio: "耳机常驻，最近在补是枝裕和。",
      schoolName: "星海大学",
    },
    score: 88,
    reasons: ["都喜欢电影"],
    breakdown: { hobby: 40, mbti: 20, tag: 14, zodiac: 14 },
    following: false,
  };

  it("maps a real recommendation into a truthful card", () => {
    const student = toLandingStudent(recommendation, ["电影", "摄影"]);

    expect(student.id).toBe(recommendation.profile.id);
    expect(student.name).toBe("陈一诺");
    expect(student.match).toBe(88);
    expect(student.verified).toBe(true);
    expect(student.demo).toBe(false);
    expect(student.following).toBe(false);
    expect(student.online).toBeNull();
    expect(student.avatarUrl).toBeNull();
    expect(student.interests).toEqual(["电影", "阅读", "咖啡"]);
    expect(student.sharedInterest).toBe("电影");
    expect(student.commonInterests).toBe(1);
  });

  it("derives a stable illustrated avatar from the account id", () => {
    const first = avatarVariantForId(recommendation.profile.id);
    expect(avatarVariantForId(recommendation.profile.id)).toBe(first);
    expect(["xiaoman", "yuchen", "suning", "zhouzhou", "hemiao", "tangke"]).toContain(first);
    expect(toLandingStudent(recommendation, []).avatar).toBe(first);
  });

  it("falls back gracefully when the profile is sparse", () => {
    const student = toLandingStudent(
      {
        ...recommendation,
        score: 0,
        profile: {
          ...recommendation.profile,
          avatarUrl: "data:image/png;base64,AA==",
          grade: null,
          department: null,
          hobbies: [],
          personalityTags: ["安静"],
          bio: "   ",
        },
      },
      ["摄影"],
    );

    expect(student.interests).toEqual(["安静"]);
    expect(student.grade).toBe("");
    expect(student.major).toBe("");
    expect(student.bio).toContain("打个招呼");
    expect(student.sharedInterest).toBe("安静");
    expect(student.commonInterests).toBe(0);
    expect(student.avatarUrl).toBe("data:image/png;base64,AA==");
  });
});

describe("check-in streaks", () => {
  it("uses the app time zone for the calendar date", () => {
    expect(dateKey(new Date("2026-10-22T16:30:00Z"))).toBe("2026-10-23");
    expect(dateKey(new Date("2026-10-22T15:30:00Z"))).toBe("2026-10-22");
  });

  it("shifts dates across month boundaries", () => {
    expect(shiftDateKey("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDateKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-10-23", "2026-10-22", "2026-10-21"], "2026-10-23")).toBe(3);
  });

  it("resets when yesterday is missing", () => {
    expect(computeStreak(["2026-10-21", "2026-10-20"], "2026-10-23")).toBe(0);
  });

  it("finds the longest historical run", () => {
    expect(
      longestStreak([
        "2026-10-01", "2026-10-02", "2026-10-03",
        "2026-10-10", "2026-10-11",
      ]),
    ).toBe(3);
  });

  it("reports only thresholds reached exactly now", () => {
    expect(reachedThresholds(3, [3, 7, 21])).toEqual([3]);
    expect(reachedThresholds(4, [3, 7, 21])).toEqual([]);
    expect(reachedThresholds(21, [3, 7, 21])).toEqual([21]);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit inside the window", () => {
    const limiter = new RateLimiter(3, 1000);
    expect(limiter.hit("k", 0).allowed).toBe(true);
    expect(limiter.hit("k", 100).allowed).toBe(true);
    expect(limiter.hit("k", 200).allowed).toBe(true);
    const blocked = limiter.hit("k", 300);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("frees the budget once the window slides", () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.hit("k", 0);
    limiter.hit("k", 500);
    expect(limiter.hit("k", 900).allowed).toBe(false);
    expect(limiter.hit("k", 1100).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = new RateLimiter(1, 1000);
    expect(limiter.hit("a", 0).allowed).toBe(true);
    expect(limiter.hit("b", 0).allowed).toBe(true);
    expect(limiter.hit("a", 10).allowed).toBe(false);
  });
});
