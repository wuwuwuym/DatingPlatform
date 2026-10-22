import { z } from "zod";
import { MAX_BIO_LENGTH, MAX_MESSAGE_LENGTH, MAX_NICKNAME_LENGTH, MBTI_TYPES, ZODIAC_SIGNS } from "@/lib/constants";

const zodiacValues = ZODIAC_SIGNS.map((item) => item.value) as [string, ...string[]];

export const registerSchema = z.object({
  schoolId: z.string().uuid("请选择学校"),
  studentNo: z.string().min(6, "学号至少 6 位").max(16, "学号过长"),
  verificationCode: z.string().min(4, "请填写核验码").max(64, "核验码过长"),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码过长"),
  consents: z.object({
    terms: z.boolean(),
    privacy: z.boolean(),
    matching: z.boolean(),
  }),
});

export const loginSchema = z.object({
  schoolId: z.string().uuid("请选择学校"),
  studentNo: z.string().min(6, "请填写学号").max(16, "学号过长"),
  password: z.string().min(1, "请填写密码").max(72, "密码过长"),
});

export const profileUpdateSchema = z.object({
  nickname: z.string().trim().min(1, "昵称不能为空").max(MAX_NICKNAME_LENGTH, "昵称最多 16 字").optional(),
  avatarUrl: z.string().max(400_000, "头像文件过大").nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
  grade: z.string().trim().max(20).nullable().optional(),
  department: z.string().trim().max(40).nullable().optional(),
  mbti: z.enum(MBTI_TYPES).nullable().optional(),
  zodiac: z.enum(zodiacValues).nullable().optional(),
  personalityTags: z.array(z.string().trim().min(1).max(20)).max(8, "性格标签最多 8 个").optional(),
  hobbies: z.array(z.string().trim().min(1).max(20)).max(8, "爱好最多 8 个").optional(),
  bio: z.string().trim().max(MAX_BIO_LENGTH, "简介最多 200 字").optional(),
  matchGenderPref: z.enum(["same", "opposite"]).nullable().optional(),
  complete: z.boolean().optional(),
});

export const messageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "消息不能为空")
    .max(MAX_MESSAGE_LENGTH, `消息最多 ${MAX_MESSAGE_LENGTH} 字`),
});

export const socialActionSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(["follow", "unfollow", "block", "unblock"]),
});

export const checkinSchema = z.object({
  friendId: z.string().uuid("请选择好友"),
});

export const reportSchema = z.object({
  targetUserId: z.string().uuid("请选择举报对象"),
  type: z.enum(["harassment", "fake_identity", "inappropriate", "other"]),
  description: z.string().trim().max(300, "说明最多 300 字").default(""),
});

export const adminLoginSchema = z.object({
  passcode: z.string().min(4, "请输入管理口令").max(128),
});

export const adminReportUpdateSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(["pending", "resolved", "dismissed"]),
});

export const adminBanSchema = z.object({
  userId: z.string().uuid(),
  banned: z.boolean(),
});

export const adminWordSchema = z.object({
  word: z.string().trim().min(1, "关键词不能为空").max(32, "关键词过长"),
});

export const adminCodeSchema = z.object({
  count: z.number().int().min(1).max(20).default(1),
  maxUses: z.number().int().min(1).max(10_000).default(1),
  schoolId: z.string().uuid().nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SocialActionInput = z.infer<typeof socialActionSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type AdminCodeInput = z.infer<typeof adminCodeSchema>;
