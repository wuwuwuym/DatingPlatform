"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Ban,
  Flag,
  Flame,
  MessageCircle,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { zodiacLabel } from "@/lib/constants";
import { api, errorMessage } from "@/lib/api-client";
import type { FollowItem, FriendItem } from "@/lib/types";
import { ReportDialog } from "@/components/report-dialog";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Spinner,
  cn,
} from "@/components/ui";

type Tab = "friends" | "following" | "followers";

export default function FriendsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [following, setFollowing] = useState<FollowItem[]>([]);
  const [followers, setFollowers] = useState<FollowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{
        friends: FriendItem[];
        following: FollowItem[];
        followers: FollowItem[];
      }>("/api/friends");
      setFriends(data.friends);
      setFollowing(data.following);
      setFollowers(data.followers);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openChat(partnerId: string) {
    setBusyId(partnerId);
    try {
      const { id } = await api<{ id: string }>("/api/conversations/open", {
        body: { partnerId },
      });
      router.push(`/chat/${id}`);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusyId(null);
    }
  }

  async function doCheckin(friendId: string) {
    setBusyId(friendId);
    try {
      const result = await api<{ streakDays: number; unlocked: { name: string }[] }>(
        "/api/checkin",
        { body: { friendId } },
      );
      setToast(
        result.unlocked.length > 0
          ? `连续打卡 ${result.streakDays} 天，解锁「${result.unlocked[0]!.name}」`
          : `打卡成功，已连续 ${result.streakDays} 天`,
      );
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function social(targetUserId: string, action: "unfollow" | "block" | "follow") {
    setBusyId(targetUserId);
    try {
      await api("/api/follow", { body: { targetUserId, action } });
      setToast(
        action === "unfollow" ? "已取消关注" : action === "block" ? "已拉黑，双方不再互相推荐" : "已关注",
      );
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "friends", label: "好友", count: friends.length },
    { key: "following", label: "我关注的", count: following.length },
    { key: "followers", label: "关注我的", count: followers.length },
  ];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">好友</h1>
        <p className="mt-1.5 text-[13px] text-muted">互相关注后成为好友，解锁私聊与打卡</p>
      </header>

      <div className="flex gap-1 rounded-2xl bg-black/[0.035] p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "flex-1 rounded-xl py-2 text-[12.5px] transition",
              tab === item.key ? "bg-surface font-medium text-ink shadow-sm" : "text-muted",
            )}
          >
            {item.label}
            <span className="ml-1 text-[11px] opacity-60">{item.count}</span>
          </button>
        ))}
      </div>

      {toast ? <Banner tone="success">{toast}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      {loading ? (
        <div className="flex justify-center py-16 text-brand">
          <Spinner />
        </div>
      ) : tab === "friends" ? (
        friends.length === 0 ? (
          <EmptyState
            icon={<UsersRound size={30} />}
            title="还没有好友"
            description="去「发现」看看同校同学，互相关注后就会出现在这里。"
          />
        ) : (
          <div className="space-y-3">
            {friends.map(({ profile, streakDays, checkedInToday }) => (
              <Card key={profile.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={profile.nickname} src={profile.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">{profile.nickname}</p>
                    <p className="mt-0.5 truncate text-[11.5px] text-muted">
                      {[profile.mbti, zodiacLabel(profile.zodiac), profile.department]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {streakDays > 0 ? (
                    <Badge tone="accent">
                      <Flame size={11} className="mr-1" /> {streakDays} 天
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1 px-3 py-2 text-[12.5px]"
                    loading={busyId === profile.id}
                    onClick={() => openChat(profile.id)}
                  >
                    <MessageCircle size={14} /> 聊天
                  </Button>
                  <Button
                    className="flex-1 px-3 py-2 text-[12.5px]"
                    disabled={checkedInToday}
                    loading={busyId === profile.id}
                    onClick={() => doCheckin(profile.id)}
                  >
                    <Flame size={14} /> {checkedInToday ? "今日已打卡" : "打卡"}
                  </Button>
                  <button
                    type="button"
                    aria-label="举报"
                    onClick={() => setReportTarget({ id: profile.id, name: profile.nickname })}
                    className="grid size-9 place-items-center rounded-xl bg-black/[0.035] text-muted"
                  >
                    <Flag size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="拉黑"
                    onClick={() => social(profile.id, "block")}
                    className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"
                  >
                    <Ban size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === "following" ? (
        following.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={30} />}
            title="还没有关注任何人"
            description="在「发现」里对感兴趣的同学发起关注。"
          />
        ) : (
          <div className="space-y-3">
            {following.map((item) => (
              <Card key={item.profile.id} className="flex items-center gap-3 p-4">
                <Avatar name={item.profile.nickname} src={item.profile.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{item.profile.nickname}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    {item.profile.mbti ?? "—"} · {zodiacLabel(item.profile.zodiac)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => social(item.profile.id, "unfollow")}
                  className="flex items-center gap-1 rounded-xl bg-black/[0.035] px-3 py-2 text-[11.5px] text-muted"
                >
                  <UserMinus size={13} /> 取消关注
                </button>
              </Card>
            ))}
          </div>
        )
      ) : followers.length === 0 ? (
        <EmptyState
          icon={<UsersRound size={30} />}
          title="还没有人关注你"
          description="完善资料、多写点爱好，更容易被同频的人发现。"
        />
      ) : (
        <div className="space-y-3">
          {followers.map((item) => (
            <Card key={item.profile.id} className="flex items-center gap-3 p-4">
              <Avatar name={item.profile.nickname} src={item.profile.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{item.profile.nickname}</p>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {item.mutual ? "已互相关注" : "关注了你"}
                </p>
              </div>
              {item.mutual ? (
                <Badge tone="mint">好友</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => social(item.profile.id, "follow")}
                  className="flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-[11.5px] font-medium text-white"
                >
                  <UserPlus size={13} /> 回关
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {reportTarget ? (
        <ReportDialog
          targetUserId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      ) : null}
    </div>
  );
}
