export type AvatarVariant = "xiaoman" | "yuchen" | "suning" | "zhouzhou" | "hemiao" | "tangke";
export type AccentTone = "coral" | "mint" | "indigo";

export interface Student {
  id: string;
  name: string;
  grade: string;
  major: string;
  bio: string;
  interests: string[];
  sharedInterest: string;
  /** `null` means the product has no presence signal for this account. */
  online: boolean | null;
  verified: boolean;
  match: number;
  avatar: AvatarVariant;
  tone: AccentTone;
  avatarUrl?: string | null;
  following?: boolean;
  commonInterests?: number;
  /** Present only on the built-in marketing samples. */
  demo?: boolean;
}

export interface InterestTag {
  label: string;
  count: number;
  tone: AccentTone;
  size: "sm" | "md" | "lg";
}

export const INTEREST_TAGS: InterestTag[] = [
  { label: "摄影", count: 128, tone: "coral", size: "lg" },
  { label: "电影", count: 214, tone: "indigo", size: "lg" },
  { label: "夜跑", count: 96, tone: "mint", size: "md" },
  { label: "独立乐队", count: 74, tone: "coral", size: "md" },
  { label: "手冲咖啡", count: 61, tone: "mint", size: "sm" },
  { label: "读书", count: 183, tone: "indigo", size: "md" },
  { label: "猫咪", count: 156, tone: "coral", size: "md" },
  { label: "桌游", count: 88, tone: "mint", size: "sm" },
  { label: "骑行", count: 57, tone: "indigo", size: "sm" },
  { label: "展览", count: 66, tone: "coral", size: "sm" },
  { label: "羽毛球", count: 92, tone: "mint", size: "md" },
  { label: "旅行", count: 118, tone: "indigo", size: "lg" },
  { label: "游戏", count: 204, tone: "mint", size: "md" },
  { label: "烘焙", count: 54, tone: "coral", size: "sm" },
  { label: "话剧", count: 39, tone: "indigo", size: "sm" },
  { label: "滑板", count: 45, tone: "mint", size: "sm" },
];

export const STUDENTS: Student[] = [
  {
    id: "lin-xiaoman",
    name: "林小满",
    grade: "大二",
    major: "视觉传达",
    bio: "在图书馆靠窗的位置，收集日落和好看的字。",
    interests: ["摄影", "手冲咖啡", "展览"],
    sharedInterest: "摄影",
    online: true,
    verified: true,
    match: 92,
    avatar: "xiaoman",
    tone: "coral",
  },
  {
    id: "chen-yu",
    name: "陈屿",
    grade: "大三",
    major: "计算机科学",
    bio: "白天写代码，晚上在操场跑五公里。",
    interests: ["夜跑", "独立乐队", "游戏"],
    sharedInterest: "夜跑",
    online: true,
    verified: true,
    match: 88,
    avatar: "yuchen",
    tone: "indigo",
  },
  {
    id: "su-nian",
    name: "苏念",
    grade: "大一",
    major: "汉语言文学",
    bio: "想把学校所有桂花树都写进日记里。",
    interests: ["读书", "电影", "猫咪"],
    sharedInterest: "读书",
    online: false,
    verified: true,
    match: 84,
    avatar: "suning",
    tone: "mint",
  },
  {
    id: "zhou-zhou",
    name: "周舟",
    grade: "大四",
    major: "建筑学",
    bio: "画图到凌晨，也想去海边看一次日出。",
    interests: ["摄影", "旅行", "桌游"],
    sharedInterest: "旅行",
    online: true,
    verified: true,
    match: 81,
    avatar: "zhouzhou",
    tone: "coral",
  },
  {
    id: "he-miao",
    name: "何苗",
    grade: "大二",
    major: "心理学",
    bio: "擅长倾听，也擅长把无聊的下午变成一场散步。",
    interests: ["猫咪", "电影", "羽毛球"],
    sharedInterest: "电影",
    online: false,
    verified: true,
    match: 79,
    avatar: "hemiao",
    tone: "mint",
  },
  {
    id: "tang-ke",
    name: "唐可",
    grade: "大三",
    major: "新闻传播",
    bio: "校园记者，正在收集一百个人的大学生活。",
    interests: ["话剧", "展览", "独立乐队"],
    sharedInterest: "展览",
    online: true,
    verified: true,
    match: 76,
    avatar: "tangke",
    tone: "indigo",
  },
];

export const FLOATING_INTERESTS = [
  { label: "摄影", tone: "coral" as const, className: "left-[2%] top-[15%]" },
  { label: "夜跑", tone: "mint" as const, className: "right-[1%] top-[27%]" },
  { label: "独立乐队", tone: "indigo" as const, className: "right-[5%] bottom-[24%]" },
  { label: "手冲咖啡", tone: "coral" as const, className: "left-[5%] bottom-[12%]" },
];
