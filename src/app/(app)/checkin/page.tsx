"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Flame, Heart, PartyPopper, Sparkles, Trophy } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { AchievementItem, FriendItem } from "@/lib/types";
import { CheckinButton } from "@/components/checkin/checkin-button";
import { CircleAvatar } from "@/components/avatar-ring";
import { Banner, Card, EmptyState, SectionTitle, Spinner, cn } from "@/components/ui";

export default function CheckinPage() {
  const [friends, setFriends] = useState<FriendItem[] | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
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
      setCelebrateId(friendId);
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrateId(null), 900);
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  const friendList = friends ?? [];
  const maxStreak = friendList.reduce((max, item) => Math.max(max, item.streakDays), 0);
  const checkedToday = friendList.filter((item) => item.checkedInToday).length;
  const obtainedCount = achievements.filter((item) => item.obtainedAt).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight text-slate-800">打卡</h1>
        <p className="mt-1.5 text-[13px] text-slate-500">
          每天和一位好友打卡，连续天数解锁成就卡片
        </p>
      </header>

      {toast ? (
        <Banner tone="success">
          <span className="inline-flex items-center gap-1.5">
            <PartyPopper size={14} strokeWidth={1.5} /> {toast}
          </span>
        </Banner>
      ) : null}
      {error ? <Banner>{error}</Banner> : null}

      {friends && friends.length > 0 ? (
        <Card className="relative overflow-hidden p-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-[radial-gradient(circle,rgba(253,164,175,0.35)_0%,transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.14)_0%,transparent_70%)]"
          />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                Streak
              </p>
              <div className="mt-1 flex items-end gap-2">
                <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-indigo-500 bg-clip-text text-[56px] leading-none font-bold tracking-tight text-transparent">
                  {maxStreak}
                </span>
                <span className="pb-2 text-[12px] text-slate-500">天连续</span>
              </div>
              <p className="mt-2 text-[11.5px] text-slate-500">
                今天已和 {checkedToday} / {friendList.length} 位好友打卡
              </p>
            </div>
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-rose-100 to-orange-50 text-rose-500">
              <Flame size={34} strokeWidth={1.5} aria-hidden="true" />
            </span>
          </div>
        </Card>
      ) : null}

      <section>
        <SectionTitle>好友打卡</SectionTitle>
        {!friends ? (
          <div className="flex justify-center py-10 text-brand">
            <Spinner />
          </div>
        ) : friends.length === 0 ? (
          <EmptyState
            icon={<Flame size={30} strokeWidth={1.5} />}
            title="还没有可以打卡的好友"
            description="成为好友后才能与对方每日打卡。"
            action={
              <Link
                href="/match"
                className="rounded-full bg-brand px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-indigo-500/20"
              >
                去发现
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {friends.map(({ profile, streakDays, checkedInToday, partnerCheckedInToday }) => (
              <Card key={profile.id} className="p-4">
                <div className="flex items-center gap-3">
                  <CircleAvatar name={profile.nickname} src={profile.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-slate-800">
                      {profile.nickname}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {profile.mbti ? (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                          {profile.mbti}
                        </span>
                      ) : null}
                      {profile.department ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {profile.department}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-[26px] leading-none font-bold tracking-tight text-transparent">
                      {streakDays}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">连续天数</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    {partnerCheckedInToday ? (
                      <>
                        <Heart
                          size={12}
                          className="text-rose-400"
                          fill="currentColor"
                          aria-hidden="true"
                        />
                        对方今天也打卡了
                      </>
                    ) : (
                      "对方今天还没打卡"
                    )}
                  </p>
                  <CheckinButton
                    checked={checkedInToday}
                    busy={busyId === profile.id}
                    celebrate={celebrateId === profile.id}
                    onCheckin={() => void doCheckin(profile.id)}
                    label={profile.nickname}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          action={
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10.5px] font-medium text-indigo-600">
              {obtainedCount}/{achievements.length}
            </span>
          }
        >
          成就卡片墙
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2.5">
          {achievements.map((achievement) => {
            const obtained = Boolean(achievement.obtainedAt);
            return (
              <div
                key={achievement.code}
                className={cn(
                  "relative overflow-hidden rounded-2xl p-3 text-center transition-all duration-300",
                  obtained
                    ? "achievement-shimmer bg-gradient-to-br from-indigo-500 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {obtained ? (
                  <Sparkles
                    size={10}
                    strokeWidth={1.5}
                    className="absolute top-2 right-2 text-white/70"
                    aria-hidden="true"
                  />
                ) : null}
                <div
                  className={cn(
                    "mx-auto grid size-10 place-items-center rounded-full",
                    obtained ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-400",
                  )}
                >
                  <Trophy size={18} strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p
                  className={cn(
                    "mt-2 text-[12px] font-semibold",
                    obtained ? "text-white" : "text-slate-500",
                  )}
                >
                  {achievement.name}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-[10px]",
                    obtained ? "text-white/75" : "text-slate-400",
                  )}
                >
                  {obtained ? "已获得" : `连续 ${achievement.threshold} 天`}
                </p>
                {!obtained ? (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-400/70"
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
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          连续天数按「与同一位好友」计算；中断后从 1 重新开始，已获得的成就不回收。
        </p>
      </section>
    </div>
  );
}
