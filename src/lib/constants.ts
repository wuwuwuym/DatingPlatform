export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export type MbtiType = (typeof MBTI_TYPES)[number];

export type ZodiacElement = "fire" | "earth" | "air" | "water";

export const ZODIAC_SIGNS = [
  { value: "aries", label: "白羊座", element: "fire" },
  { value: "taurus", label: "金牛座", element: "earth" },
  { value: "gemini", label: "双子座", element: "air" },
  { value: "cancer", label: "巨蟹座", element: "water" },
  { value: "leo", label: "狮子座", element: "fire" },
  { value: "virgo", label: "处女座", element: "earth" },
  { value: "libra", label: "天秤座", element: "air" },
  { value: "scorpio", label: "天蝎座", element: "water" },
  { value: "sagittarius", label: "射手座", element: "fire" },
  { value: "capricorn", label: "摩羯座", element: "earth" },
  { value: "aquarius", label: "水瓶座", element: "air" },
  { value: "pisces", label: "双鱼座", element: "water" },
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]["value"];

export const ZODIAC_ELEMENTS: Record<ZodiacElement, string> = {
  fire: "火象",
  earth: "土象",
  air: "风象",
  water: "水象",
};

export function zodiacElement(sign: string | null): ZodiacElement | null {
  if (!sign) return null;
  return ZODIAC_SIGNS.find((item) => item.value === sign)?.element ?? null;
}

export function zodiacLabel(sign: string | null): string {
  if (!sign) return "未填写";
  return ZODIAC_SIGNS.find((item) => item.value === sign)?.label ?? "未填写";
}

export const HOBBIES = [
  "摄影", "徒步", "电影", "音乐", "游戏", "阅读",
  "健身", "美食", "旅行", "动漫", "咖啡", "手作",
  "剧本杀", "篮球", "跑步", "宠物",
] as const;

export const PERSONALITY_TAGS = [
  "温和", "幽默", "理性", "感性", "外向", "内向",
  "细心", "随性", "乐观", "慢热", "自来熟", "好奇",
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "男生" },
  { value: "female", label: "女生" },
] as const;

export const MATCH_PREF_OPTIONS = [
  { value: "same", label: "同性" },
  { value: "opposite", label: "异性" },
] as const;

export const REPORT_TYPE_OPTIONS = [
  { value: "harassment", label: "骚扰" },
  { value: "fake_identity", label: "虚假身份" },
  { value: "inappropriate", label: "不当内容" },
  { value: "other", label: "其他" },
] as const;

export const MAX_MESSAGE_LENGTH = 500;
export const MAX_BIO_LENGTH = 200;
export const MAX_NICKNAME_LENGTH = 16;
