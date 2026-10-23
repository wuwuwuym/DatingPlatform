"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe2, Loader2, RefreshCw, Users } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import type { CircleFeed, PostItem } from "@/lib/types";
import { Composer } from "@/components/circle/composer";
import { PostCard } from "@/components/circle/post-card";
import { ReportDialog } from "@/components/report-dialog";
import { Banner, Button, EmptyState, Spinner, cn } from "@/components/ui";

type Scope = "all" | "following";

export default function CirclePage() {
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

  return (
    <div className="space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-[24px] font-semibold tracking-tight">
          <Globe2 size={22} className="text-brand" /> 校园圈
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">同校同学的日常，点赞、评论，也可以关注作者</p>
      </header>

      <Composer
        onPublished={(post) => {
          setItems((current) => [post, ...(current ?? [])]);
          setToast("发布成功，同校同学现在可以看到啦");
        }}
      />

      {toast ? <Banner tone="success">{toast}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      <div className="flex gap-1 rounded-2xl bg-black/[0.035] p-1">
        {(
          [
            { key: "all", label: "同校动态", icon: Globe2 },
            { key: "following", label: "我关注的", icon: Users },
          ] as { key: Scope; label: string; icon: typeof Globe2 }[]
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setScope(item.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[12.5px] transition",
                scope === item.key ? "bg-surface font-medium text-ink shadow-sm" : "text-muted",
              )}
            >
              <Icon size={13} /> {item.label}
            </button>
          );
        })}
      </div>

      {items === null ? (
        <div className="flex justify-center py-16 text-brand">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={scope === "following" ? <Users size={30} /> : <Globe2 size={30} />}
          title={scope === "following" ? "关注的人还没有发动态" : "校园圈还很安静"}
          description={
            scope === "following"
              ? "在动态里点作者头像旁的「关注」，或者在「发现」里关注同校同学。"
              : "发布第一条动态，让同校同学看到你的日常。"
          }
          action={
            <Button variant="secondary" onClick={() => { setItems(null); void load(scope); }}>
              <RefreshCw size={14} /> 刷新
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onChange={(patch) => patchPost(post.id, patch)}
              onDelete={(postId) =>
                setItems((current) => (current ?? []).filter((item) => item.id !== postId))
              }
              onReport={(target) => setReportTarget(target)}
            />
          ))}

          {nextCursor ? (
            <Button
              variant="secondary"
              className="w-full"
              loading={loadingMore}
              onClick={loadMore}
            >
              <Loader2 size={14} /> 加载更多
            </Button>
          ) : (
            <p className="py-2 text-center text-[11px] text-muted">已经看到这里啦</p>
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
