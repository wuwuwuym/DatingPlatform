"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion, type MotionProps } from "framer-motion";
import {
  Globe2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { CircleFeed, PostItem } from "@/lib/types";
import { Composer } from "@/components/circle/composer";
import { PostCard } from "@/components/circle/post-card";
import { ReportDialog } from "@/components/report-dialog";
import { Banner, Button, EmptyState, Spinner, cn } from "@/components/ui";

type Scope = "all" | "following";

export default function CirclePage() {
  const reduce = useReducedMotion();
  const [scope, setScope] = useState<Scope>("all");
  const [items, setItems] = useState<PostItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reportTarget, setReportTarget] = useState<PostItem | null>(null);

  const load = useCallback(
    async (target: Scope, cursor?: string) => {
      try {
        const query = new URLSearchParams({ scope: target });
        if (cursor) query.set("cursor", cursor);
        const data = await api<CircleFeed>(`/api/posts?${query.toString()}`);
        setItems((current) => (cursor ? [...(current ?? []), ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      } catch (cause) {
        setError(errorMessage(cause));
        if (!cursor) setItems([]);
      }
    },
    [],
  );

  useEffect(() => {
    setItems(null);
    setNextCursor(null);
    setError(null);
    void load(scope);
  }, [scope, load]);

  function patchPost(postId: string, patch: Partial<PostItem>) {
    setItems((current) =>
      current ? current.map((item) => (item.id === postId ? { ...item, ...patch } : item)) : current,
    );
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await load(scope, nextCursor);
    setLoadingMore(false);
  }

  function fadeUp(delay = 0): MotionProps {
    return {
      initial: reduce ? false : { opacity: 0, y: 15 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, ease: "easeOut", delay },
    };
  }

  return (
    <div className="space-y-4">
      <motion.header
        {...fadeUp()}
        className="circle-shadow relative overflow-hidden rounded-[24px] bg-white p-4 sm:p-6"
      >
        <div
          aria-hidden="true"
          className="circle-texture pointer-events-none absolute inset-0 opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-[radial-gradient(circle,rgba(253,164,175,0.32)_0%,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -left-16 size-52 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.16)_0%,transparent_70%)]"
        />

        <p className="relative text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
          Campus circle
        </p>
        <div className="relative mt-2 flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
            <Globe2 size={21} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold tracking-tight text-slate-800 sm:text-[26px]">校园圈</h1>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              同校同学的日常，点赞、评论，也可以关注作者
            </p>
          </div>
        </div>

        <div className="relative mt-3 flex flex-wrap gap-2 sm:mt-4">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10.5px] font-medium text-indigo-600">
            <Users size={11} strokeWidth={1.5} aria-hidden="true" />
            仅同校可见
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10.5px] font-medium text-rose-600">
            <ShieldCheck size={11} strokeWidth={1.5} aria-hidden="true" />
            友善互动
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10.5px] font-medium text-slate-500">
            <Sparkles size={11} strokeWidth={1.5} aria-hidden="true" />
            记录日常
          </span>
        </div>
      </motion.header>

      <motion.div {...fadeUp(0.06)}>
        <Composer
          onPublished={(post) => {
            setItems((current) => [post, ...(current ?? [])]);
            setToast("发布成功，同校同学现在可以看到啦");
          }}
        />
      </motion.div>

      {toast ? <Banner tone="success">{toast}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      <motion.div
        {...fadeUp(0.1)}
        className="circle-shadow flex gap-1 rounded-full bg-white p-1"
      >
        {(
          [
            { key: "all", label: "同校动态", icon: Globe2 },
            { key: "following", label: "我关注的", icon: Users },
          ] as { key: Scope; label: string; icon: typeof Globe2 }[]
        ).map((item) => {
          const Icon = item.icon;
          const active = scope === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              aria-pressed={active}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] transition-all duration-200",
                active
                  ? "bg-brand font-medium text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </motion.div>

      {items === null ? (
        <motion.div {...fadeUp(0.14)} className="flex justify-center py-20 text-brand">
          <Spinner />
        </motion.div>
      ) : items.length === 0 ? (
        <motion.div {...fadeUp(0.14)}>
          <EmptyState
            icon={scope === "following" ? <Users size={30} strokeWidth={1.5} /> : <Globe2 size={30} strokeWidth={1.5} />}
            title={scope === "following" ? "关注的人还没有发动态" : "校园圈还很安静"}
            description={
              scope === "following"
                ? "在动态里点作者头像旁的「关注」，或者在「发现」里关注同校同学。"
                : "发布第一条动态，让同校同学看到你的日常。"
            }
            action={
              <Button
                variant="secondary"
                className="circle-btn"
                onClick={() => {
                  setItems(null);
                  void load(scope);
                }}
              >
                <RefreshCw size={14} strokeWidth={1.5} /> 刷新
              </Button>
            }
          />
        </motion.div>
      ) : (
        <div className="space-y-3.5">
          {items.map((post, index) => (
            <motion.div key={post.id} {...fadeUp(0.14 + Math.min(index, 6) * 0.05)}>
              <PostCard
                post={post}
                onChange={(patch) => patchPost(post.id, patch)}
                onDelete={(postId) =>
                  setItems((current) => (current ?? []).filter((item) => item.id !== postId))
                }
                onReport={(target) => setReportTarget(target)}
              />
            </motion.div>
          ))}

          {nextCursor ? (
            <Button
              variant="secondary"
              className="circle-btn w-full"
              loading={loadingMore}
              onClick={loadMore}
            >
              <LoaderCircle size={14} strokeWidth={1.5} /> 加载更多
            </Button>
          ) : (
            <p className="py-2 text-center text-[11px] text-slate-500">已经看到这里啦</p>
          )}
        </div>
      )}

      {reportTarget ? (
        <ReportDialog
          targetPostId={reportTarget.id}
          targetName={`${reportTarget.author.nickname} 的动态`}
          onClose={() => setReportTarget(null)}
          onDone={() => setToast("举报已提交，管理员会尽快处理")}
        />
      ) : null}
    </div>
  );
}
