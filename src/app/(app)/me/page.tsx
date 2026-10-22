"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { zodiacLabel } from "@/lib/constants";
import { api, errorMessage } from "@/lib/api-client";
import type { MyProfile } from "@/lib/types";
import { Avatar, Badge, Banner, Button, Card, SectionTitle, Spinner } from "@/components/ui";

export default function MePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ profile: MyProfile }>("/api/profile")
      .then((data) => setProfile(data.profile))
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        {error ? <Banner>{error}</Banner> : <Spinner className="text-brand" />}
      </div>
    );
  }

  const obtained = profile.achievements.filter((item) => item.obtainedAt);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">我的</h1>
        <p className="mt-1.5 text-[13px] text-muted">{profile.schoolName}</p>
      </header>

      <Card className="flex items-center gap-4">
        <Avatar name={profile.nickname} src={profile.avatarUrl} size={62} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-ink">{profile.nickname || "未设置昵称"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.mbti ? <Badge tone="brand">{profile.mbti}</Badge> : null}
            <Badge>{zodiacLabel(profile.zodiac)}</Badge>
            <Badge tone={profile.status === "matchable" ? "mint" : "accent"}>
              {profile.status === "matchable" ? "匹配池中" : "待完善"}
            </Badge>
          </div>
        </div>
      </Card>

      {profile.bio ? (
        <Card>
          <p className="text-[13px] leading-6 text-ink-soft">{profile.bio}</p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <SectionTitle>资料</SectionTitle>
        <dl className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
          <dt className="text-muted">性别</dt>
          <dd className="text-right text-ink-soft">
            {profile.gender === "male" ? "男生" : profile.gender === "female" ? "女生" : "未填写"}
          </dd>
          <dt className="text-muted">年级 / 院系</dt>
          <dd className="text-right text-ink-soft">
            {[profile.grade, profile.department].filter(Boolean).join(" / ") || "未填写"}
          </dd>
          <dt className="text-muted">配对偏好</dt>
          <dd className="text-right text-ink-soft">
            {profile.matchGenderPref === "same"
              ? "同性"
              : profile.matchGenderPref === "opposite"
                ? "异性"
                : "未设置"}
          </dd>
          <dt className="text-muted">爱好</dt>
          <dd className="text-right text-ink-soft">
            {profile.hobbies.length > 0 ? profile.hobbies.join("、") : "未填写"}
          </dd>
          <dt className="text-muted">性格标签</dt>
          <dd className="text-right text-ink-soft">
            {profile.personalityTags.length > 0 ? profile.personalityTags.join("、") : "未填写"}
          </dd>
        </dl>
        <Link
          href="/profile"
          className="flex w-full items-center justify-center rounded-2xl bg-brand-soft px-4 py-2.5 text-[12.5px] font-medium text-brand"
        >
          编辑资料
        </Link>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>成就</SectionTitle>
        {obtained.length === 0 ? (
          <p className="text-[12px] text-muted">还没有获得成就，去和好友连续打卡试试。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {obtained.map((item) => (
              <span
                key={item.code}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6f6bf0] to-[#9d8bff] px-3 py-1.5 text-[11.5px] font-medium text-white"
              >
                <Trophy size={12} /> {item.name}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2.5">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
          <ShieldCheck size={15} className="text-mint" /> 隐私说明
        </p>
        <p className="flex gap-1.5 text-[11.5px] leading-5 text-muted">
          <Eye size={13} className="mt-0.5 shrink-0" />
          学号只做一次性核验并哈希存储，不展示、不流转；个人资料只对同校已认证用户可见，会话内容仅好友双方可读。
        </p>
      </Card>

      {profile.role === "admin" ? (
        <Link
          href="/admin"
          className="flex w-full items-center justify-center rounded-2xl border border-line bg-surface px-4 py-3 text-[12.5px] text-ink-soft"
        >
          进入管理后台
        </Link>
      ) : null}

      {error ? <Banner>{error}</Banner> : null}

      <Button variant="danger" className="w-full" onClick={logout}>
        <LogOut size={15} /> 退出登录
      </Button>
    </div>
  );
}
