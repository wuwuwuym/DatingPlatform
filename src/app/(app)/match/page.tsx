"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Compass, Heart, MessageCircle, RefreshCw, Sparkles, UserRound, X } from "lucide-react";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { RecommendationItem } from "@/lib/types";
import {
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  Spinner,
  cn,
} from "@/components/ui";

export default function MatchPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [items, setItems] = useState<RecommendationItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needProfile, setNeedProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [exitDir, setExitDir] = useState<"left" | "right">("left");
  const [cardVisible, setCardVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const wrapOnExit = useRef(false);

  useEffect(() => {
    setItems(null);
    setIndex(0);
    setExitDir("left");
    setCardVisible(true);
    setLeaving(false);
    wrapOnExit.current = false;
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

  function leave(direction: "left" | "right", wrap = false) {
    wrapOnExit.current = wrap;
    setExitDir(direction);
    setLeaving(true);
    requestAnimationFrame(() => setCardVisible(false));
  }

  function skip() {
    if (busy || leaving) return;
    leave("left");
  }

  // The daily batch is a single list (FR-16), so "换一批" cycles within it
  // instead of re-fetching the same ordered rows and showing card #1 again.
  function refreshBatch() {
    if (!items || items.length === 0 || busy || leaving) return;
    leave("left", true);
  }

  async function follow() {
    if (!current || busy || leaving) return;

    if (current.following) {
      leave("right");
      return;
    }

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
      leave("right");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function handleExitComplete() {
    const wrap = wrapOnExit.current;
    wrapOnExit.current = false;
    setIndex((value) => {
      if (!wrap || !items || items.length === 0) return value + 1;
      return (value + 1) % items.length;
    });
    setCardVisible(true);
    setLeaving(false);
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
        icon={<UserRound size={30} strokeWidth={1.5} />}
        title="先完善资料，才能进入匹配池"
        description="填好昵称、MBTI、星座、爱好与配对偏好，我们才能为你匹配合适的同校同学。"
        action={
          <Link
            href="/profile"
            className="rounded-full bg-brand px-5 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-indigo-500/20"
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
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-800">发现</h1>
          <p className="mt-1.5 text-[13px] text-slate-500">同校匹配推荐</p>
        </header>
        {error ? <Banner>{error}</Banner> : null}
        <EmptyState
          icon={<Compass size={30} strokeWidth={1.5} />}
          title="本校暂无更多可推荐用户"
          description="匹配池还在积累中。过一会儿再来，或者邀请同校同学一起加入。"
          action={
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              <RefreshCw size={15} strokeWidth={1.5} /> 刷新一下
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
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-800">发现</h1>
          <p className="mt-1.5 text-[13px] text-slate-500">今天的推荐已经看完啦</p>
        </header>
        <EmptyState
          icon={<Sparkles size={30} strokeWidth={1.5} />}
          title="今天的推荐看完啦"
          description="明天会有新的一批同校同学进入推荐池。"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setIndex(0);
                setReloadKey((key) => key + 1);
              }}
            >
              <RefreshCw size={15} strokeWidth={1.5} /> 重新看看
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-slate-800">发现</h1>
          <p className="mt-1.5 text-[13px] text-slate-500">
            第 {index + 1} / {items.length} 位同校同学
          </p>
        </div>
        <button
          type="button"
          onClick={refreshBatch}
          disabled={busy || leaving}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={13} strokeWidth={1.5} /> 换一批
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

      <AnimatePresence onExitComplete={handleExitComplete}>
        {cardVisible ? (
          <motion.div
            key={current.profile.id}
            initial={reduce ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0 }
                : {
                    x: exitDir === "right" ? "110vw" : "-110vw",
                    opacity: 0,
                    rotate: exitDir === "right" ? 4 : -4,
                  }
            }
            transition={{ duration: reduce ? 0.01 : 0.35, ease: "easeInOut" }}
          >
            <Card className="relative overflow-hidden p-0">
              <div className="flex items-start justify-between gap-3 bg-gradient-to-br from-indigo-50/80 via-white to-white p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                    <Avatar
                      name={current.profile.nickname}
                      src={current.profile.avatarUrl}
                      size={64}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[20px] font-bold leading-tight tracking-tight text-slate-800">
                      {current.profile.nickname}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {current.profile.mbti ? (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10.5px] font-medium text-indigo-600">
                          {current.profile.mbti}
                        </span>
                      ) : null}
                      {current.profile.department ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-medium text-slate-600">
                          {current.profile.department}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-100/60 px-3 py-1.5 text-[10.5px] font-medium text-indigo-700 backdrop-blur"
                  aria-label={`同频度 ${current.score}`}
                >
                  <span className="text-[13px] font-semibold text-indigo-900">{current.score}</span>
                  同频
                </span>
              </div>

              <div className="space-y-4 p-4">
                {current.profile.bio ? (
                  <p className="text-[13px] leading-6 text-slate-600">{current.profile.bio}</p>
                ) : (
                  <p className="text-[13px] leading-6 text-slate-500">这位同学还没有写简介。</p>
                )}

                {current.profile.hobbies.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-medium tracking-wide text-slate-400">
                      爱好
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {current.profile.hobbies.map((hobby) => (
                        <span
                          key={hobby}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {hobby}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-50/70 to-white p-4">
                  <Sparkles
                    size={64}
                    strokeWidth={1}
                    className="pointer-events-none absolute -right-2 -bottom-2 text-indigo-100/80"
                    aria-hidden="true"
                  />
                  <div className="relative flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-white/80 text-indigo-500 shadow-sm">
                      <Sparkles size={14} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <p className="text-[11px] font-semibold text-indigo-600">为什么推荐给你</p>
                    <span className="ml-auto rounded-full bg-white/70 px-1.5 py-0.5 text-[9.5px] font-medium tracking-[0.12em] text-indigo-500">
                      AI
                    </span>
                  </div>

                  {current.reasons.length > 0 ? (
                    <ul className="relative mt-3 space-y-1.5">
                      {current.reasons.map((reason) => (
                        <li
                          key={reason}
                          className="flex gap-2 text-[11.5px] leading-5 text-slate-600"
                        >
                          <span
                            className="mt-[7px] size-1 shrink-0 rounded-full bg-indigo-300"
                            aria-hidden="true"
                          />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="relative mt-2 text-[11.5px] leading-5 text-slate-500">
                      你们暂时没有明显重合点，也许正好可以互相拓展兴趣。
                    </p>
                  )}

                  <p className="relative mt-3 text-[10px] text-slate-500">
                    由兴趣、性格与 MBTI 共同计算
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={skip}
          disabled={busy || leaving}
          className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-full bg-slate-100 text-[13px] font-medium text-slate-600 transition-all duration-200 hover:bg-slate-200/70 active:scale-[0.97] disabled:opacity-50"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" /> 跳过
        </button>
        <button
          type="button"
          onClick={() => void follow()}
          disabled={busy || leaving}
          aria-busy={busy}
          className={cn(
            "inline-flex h-12 flex-[1.2] items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50",
            current.following
              ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
              : cn(
                  "bg-brand text-white hover:bg-brand-deep",
                  !busy && "shadow-lg shadow-indigo-500/20",
                ),
          )}
        >
          {busy ? (
            <Spinner className="size-4" />
          ) : (
            <Heart
              size={16}
              strokeWidth={1.5}
              className={current.following ? "fill-rose-300" : undefined}
              aria-hidden="true"
            />
          )}
          {current.following ? "已关注" : "感兴趣"}
        </button>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
        <MessageCircle size={12} strokeWidth={1.5} aria-hidden="true" /> 互相关注后即可解锁私聊
      </p>
    </div>
  );
}
