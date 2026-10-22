export type UserStatus = "incomplete" | "matchable" | "banned";
export type UserRole = "user" | "admin";
export type Gender = "male" | "female";
export type MatchPref = "same" | "opposite";
export type ReportType = "harassment" | "fake_identity" | "inappropriate" | "other";
export type ReportStatus = "pending" | "resolved" | "dismissed";

export interface PublicProfile {
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
}

export interface MyProfile extends PublicProfile {
  schoolId: string;
  role: UserRole;
  status: UserStatus;
  matchGenderPref: MatchPref | null;
  createdAt: string;
  achievements: AchievementItem[];
}

export interface AchievementItem {
  code: string;
  name: string;
  description: string;
  threshold: number;
  obtainedAt: string | null;
  progress: number;
  pairKey: string | null;
}

export interface ScoreBreakdown {
  hobby: number;
  mbti: number;
  tag: number;
  zodiac: number;
}

export interface RecommendationItem {
  profile: PublicProfile;
  score: number;
  reasons: string[];
  breakdown: ScoreBreakdown;
  following: boolean;
}

export interface FriendItem {
  profile: PublicProfile;
  streakDays: number;
  checkedInToday: boolean;
  partnerCheckedInToday: boolean;
}

export interface FollowItem {
  profile: PublicProfile;
  followedAt: string;
  mutual: boolean;
}

export interface ConversationItem {
  id: string;
  partner: PublicProfile;
  lastMessage: {
    content: string;
    createdAt: string;
    mine: boolean;
  } | null;
  unreadCount: number;
  closed: boolean;
}

export interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  mine: boolean;
}

export interface CheckinResult {
  streakDays: number;
  checkedInToday: boolean;
  partnerCheckedInToday: boolean;
  unlocked: AchievementItem[];
}

export interface ReportItem {
  id: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; nickname: string };
  target: { id: string; nickname: string; status: UserStatus };
}

export interface AdminOverview {
  users: number;
  matchable: number;
  banned: number;
  pendingReports: number;
  messagesToday: number;
  checkinsToday: number;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
