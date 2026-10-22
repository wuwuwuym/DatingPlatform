"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass, Heart, MessageCircle, RefreshCw, Sparkles, UserRound } from "lucide-react";
import { GENDER_OPTIONS, zodiacLabel } from "@/lib/constants";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { RecommendationItem } from "@/lib/types";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  ScoreRing,
  Spinner,
} from "@/components/ui";

export default function MatchPage() {
  const router = useRouter();
  const [items, setItems] = useState<RecommendationItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needProfile, setNeedProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setItems(null);
    setError(null);
    setNeedProfile(false);
    api<{ items: RecommendationItem[] }>("/api/match/recommendations")
      .then((data) => setItems(data.items))
      .catch((cause) => {
        if (cause instanceof ApiClientError && cause.code === "PROFILE_INCOMPLETE") {
          setNeedProfile(true);
        } else {
          setError(errorMessage(cause));
        }
        setItems([]);
      });
  }, [reloadKey]);

  const current = items?.[index];

  async function follow() {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ friend: boolean; following: boolean }>("/api/follow", {
        body: { targetUserId: current.profile.id, action: "follow" },
      });
      setItems((list) =>
        list ? list.map((item, i) => (i === index ? { ...item, following: true } : item)) : list,
      );
      if (result.friend) setFriendId(current.profile.id);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function openChat() {
    if (!friendId) return;
    try {
      const { id } = await api<{ id: string }>("/api/conversations/open", {
        body: { partnerId: friendId },
      });
      router.push(`/chat/${id}`);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  if (needProfile) {
    return (
      <EmptyState
        icon={<UserRound size={30} />}
        title="先完善资料，才能进入匹配池"
        description="填好昵称、MBTI、星座、爱好与配对偏好，我们才能为你匹配合适的同校同学。"
        action={
          <Link
            href="/profile"
            className="rounded-2xl bg-brand px-5 py-2.5 text-[13px] font-medium text-white"
          >
            去完善资料
          </Link>
        }
      />
    );
  }

  if (!items) {
    return (
      <div className="flex justify-center py-24 text-brand">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-[24px] font-semibold tracking-tight">发现</h1>
          <p className="mt-1.5 text-[13px] text-muted">同校匹配推荐</p>
        </header>
        {error ? <Banner>{error}</Banner> : null}
        <EmptyState
          icon={<Compass size={30} />}
          title="本校暂无更多可推荐用户"
          description="匹配池还在积累中。过一会儿再来，或者邀请同校同学一起加入。"
          action={
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw size={15} /> 刷新一下
            </Button>
          }
        />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-[24px] font-semibold tracking-tight">发现</h1>
          <p className="mt-1.5 text-[13px] text-muted">今天的推荐已经看完啦</p>
        </header>
        <EmptyState
          icon={<Sparkles size={30} />}
          title="今天的推荐看完啦"
          description="明天会有新的一批同校同学进入推荐池。"
          action={
            <Button variant="secondary" onClick={() => { setIndex(0); setReloadKey((k) => k + 1); }}>
              <RefreshCw size={15} /> 重新看看
            </Button>
          }
        />
      </div>
    );
  }

  const genderLabel =
    GENDER_OPTIONS.find((option) => option.value === current.profile.gender)?.label ?? "";

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">发现</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            第 {index + 1} / {items.length} 位同校同学
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          className="flex items-center gap-1 text-[12px] text-muted"
        >
          <RefreshCw size={13} /> 换一批
        </button>
      </header>

      {friendId ? (
        <Banner tone="success">
          你们互相关注了，已经成为好友。
          <button type="button" onClick={openChat} className="ml-2 font-medium underline">
            去聊天
          </button>
        </Banner>
      ) : null}
      {error ? <Banner>{error}</Banner> : null}

      <Card className="animate-rise relative overflow-hidden p-0" key={current.profile.id}>
        <div className="flex items-start justify-between bg-gradient-to-br from-[#f4f3ff] to-white px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <Avatar name={current.profile.nickname} src={current.profile.avatarUrl} size={54} />
            <div>
              <p className="text-[17px] font-semibold leading-tight text-ink">
                {current.profile.nickname}
              </p>
              <p className="mt-1 text-[11.5px] text-muted">
                {[genderLabel, current.profile.grade, current.profile.department]
                  .filter(Boolean)
                  .join(" · ") || "同校同学"}
              </p>
            </div>
          </div>
          <ScoreRing score={current.score} />
        </div>

        <div className="space-y-4 px-5 pb-5">
          <div className="flex flex-wrap gap-1.5">
            {current.profile.mbti ? <Badge tone="brand">{current.profile.mbti}</Badge> : null}
            <Badge>{zodiacLabel(current.profile.zodiac)}</Badge>
            {current.profile.personalityTags.slice(0, 3).map((tag) => (
              <Badge key={tag} tone="accent">
                {tag}
              </Badge>
            ))}
          </div>

          {current.profile.bio ? (
            <p className="text-[13px] leading-6 text-ink-soft">{current.profile.bio}</p>
          ) : (
            <p className="text-[13px] leading-6 text-muted">这位同学还没有写简介。</p>
          )}

          {current.profile.hobbies.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted">爱好</p>
              <div className="flex flex-wrap gap-1.5">
                {current.profile.hobbies.map((hobby) => (
                  <span
                    key={hobby}
                    className="rounded-full bg-black/[0.035] px-2.5 py-1 text-[11.5px] text-ink-soft"
                  >
                    {hobby}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {current.reasons.length > 0 ? (
            <div className="rounded-2xl bg-brand-soft/70 p-3.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-brand">
                <Sparkles size={13} /> 为什么推荐给你
              </p>
              <ul className="mt-2 space-y-1.5">
                {current.reasons.map((reason) => (
                  <li key={reason} className="flex gap-1.5 text-[12.5px] leading-5 text-ink-soft">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-brand/60" />
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 flex gap-3 text-[10.5px] text-muted">
                <span>爱好 {current.breakdown.hobby}</span>
                <span>MBTI {current.breakdown.mbti}</span>
                <span>性格 {current.breakdown.tag}</span>
                <span>星座 {current.breakdown.zodiac}</span>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-muted">你们暂时没有明显重合点，也许正好可以互相拓展兴趣。</p>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setIndex((value) => value + 1)}
          disabled={busy}
        >
          跳过
        </Button>
        {current.following ? (
          <Button variant="secondary" className="flex-[1.4]" disabled>
            <Heart size={15} /> 已关注
          </Button>
        ) : (
          <Button className="flex-[1.4]" loading={busy} onClick={follow}>
            <Heart size={15} /> 发起关注
          </Button>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted">
        <MessageCircle size={12} /> 互相关注后即可解锁私聊
      </p>
    </div>
  );
}
