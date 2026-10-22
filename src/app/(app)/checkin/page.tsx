"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, PartyPopper, Trophy } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AchievementItem, FriendItem } from "@/lib/types";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  SectionTitle,
  Spinner,
  cn,
} from "@/components/ui";

export default function CheckinPage() {
  const [friends, setFriends] = useState<FriendItem[] | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [friendData, achievementData] = await Promise.all([
        api<{ friends: FriendItem[] }>("/api/friends"),
        api<{ achievements: AchievementItem[] }>("/api/achievements"),
      ]);
      setFriends(friendData.friends);
      setAchievements(achievementData.achievements);
    } catch (cause) {
      setError(errorMessage(cause));
      setFriends([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function doCheckin(friendId: string) {
    setBusyId(friendId);
    setError(null);
    try {
      const result = await api<{ streakDays: number; unlocked: AchievementItem[] }>(
        "/api/checkin",
        { body: { friendId } },
      );
      setToast(
        result.unlocked.length > 0
          ? `连续打卡 ${result.streakDays} 天，解锁「${result.unlocked[0]!.name}」`
          : `和好友打卡成功，已连续 ${result.streakDays} 天`,
      );
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">打卡</h1>
        <p className="mt-1.5 text-[13px] text-muted">每天和一位好友打卡，连续天数解锁成就卡片</p>
      </header>

      {toast ? (
        <Banner tone="success">
          <span className="inline-flex items-center gap-1.5">
            <PartyPopper size={14} /> {toast}
          </span>
        </Banner>
      ) : null}
      {error ? <Banner>{error}</Banner> : null}

      <section>
        <SectionTitle>好友打卡</SectionTitle>
        {!friends ? (
          <div className="flex justify-center py-10 text-brand">
            <Spinner />
          </div>
        ) : friends.length === 0 ? (
          <EmptyState
            icon={<Flame size={30} />}
            title="还没有可以打卡的好友"
            description="成为好友后才能与对方每日打卡。"
            action={
              <Link href="/match" className="rounded-2xl bg-brand px-5 py-2.5 text-[13px] text-white">
                去发现
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {friends.map(({ profile, streakDays, checkedInToday, partnerCheckedInToday }) => (
              <Card key={profile.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={profile.nickname} src={profile.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{profile.nickname}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {profile.mbti ?? "—"} · {profile.department || "同校同学"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-1 text-[15px] font-semibold text-accent">
                      <Flame size={15} /> {streakDays}
                    </p>
                    <p className="text-[10px] text-muted">连续天数</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted">
                    {partnerCheckedInToday ? "对方今天也打卡了 💞" : "对方今天还没打卡"}
                  </p>
                  <Button
                    className="px-4 py-2 text-[12.5px]"
                    disabled={checkedInToday}
                    loading={busyId === profile.id}
                    onClick={() => doCheckin(profile.id)}
                  >
                    {checkedInToday ? "今日已打卡" : "打卡"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle action={<Badge tone="brand">{achievements.filter((a) => a.obtainedAt).length}/{achievements.length}</Badge>}>
          成就卡片墙
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {achievements.map((achievement) => {
            const obtained = Boolean(achievement.obtainedAt);
            return (
              <div
                key={achievement.code}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-3 text-center",
                  obtained
                    ? "border-transparent bg-gradient-to-br from-[#6f6bf0] to-[#9d8bff] text-white"
                    : "border-line bg-surface text-muted",
                )}
              >
                <div
                  className={cn(
                    "mx-auto grid size-9 place-items-center rounded-full",
                    obtained ? "bg-white/20" : "bg-black/[0.04]",
                  )}
                >
                  <Trophy size={17} />
                </div>
                <p className={cn("mt-2 text-[12px] font-medium", obtained ? "text-white" : "text-ink-soft")}>
                  {achievement.name}
                </p>
                <p className={cn("mt-0.5 text-[10px]", obtained ? "text-white/75" : "text-muted")}>
                  {obtained ? "已获得" : `连续 ${achievement.threshold} 天`}
                </p>
                {!obtained ? (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-brand/60"
                      style={{
                        width: `${Math.min(100, (achievement.progress / achievement.threshold) * 100)}%`,
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-muted">
          连续天数按「与同一位好友」计算；中断后从 1 重新开始，已获得的成就不回收。
        </p>
      </section>
    </div>
  );
}
