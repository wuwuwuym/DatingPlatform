"use client";

import { useState } from "react";
import {
  Check,
  Flag,
  Maximize2,
  MessageCircle,
  Send,
  Trash2,
  UserPlus,
  Video,
} from "lucide-react";
import { formatTime } from "@/lib/format";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { PostCommentItem, PostItem } from "@/lib/types";
import { Banner, Card, cn } from "@/components/ui";
import { MAX_COMMENT_LENGTH } from "@/lib/circle/content";
import { CircleAvatar } from "@/components/avatar-ring";
import { ImageLightbox } from "./lightbox";
import { LikeButton } from "./like-button";

export function PostCard({
  post,
  onChange,
  onDelete,
  onReport,
}: {
  post: PostItem;
  onChange: (patch: Partial<PostItem>) => void;
  onDelete: (postId: string) => void;
  onReport: (post: PostItem) => void;
}) {
  const [comments, setComments] = useState<PostCommentItem[] | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ liked: boolean; likeCount: number }>(
        `/api/posts/${post.id}/like`,
        { body: { liked: !post.liked } },
      );
      onChange({ liked: result.liked, likeCount: result.likeCount });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function follow() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ friend: boolean }>("/api/follow", {
        body: { targetUserId: post.author.id, action: "follow" },
      });
      onChange({ following: true });
      setNotice(result.friend ? "你们已互相关注，成为好友" : "已关注这位同学");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function openComments() {
    const next = !showComments;
    setShowComments(next);
    if (!next || comments !== null) return;
    try {
      const data = await api<{ comments: PostCommentItem[] }>(`/api/posts/${post.id}/comments`);
      setComments(data.comments);
    } catch (cause) {
      setError(errorMessage(cause));
      setComments([]);
    }
  }

  async function submitComment() {
    const body = commentText.trim();
    if (!body || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ comment: PostCommentItem }>(
        `/api/posts/${post.id}/comments`,
        { body: { body } },
      );
      setComments((current) => [...(current ?? []), data.comment]);
      setCommentText("");
      onChange({ commentCount: post.commentCount + 1 });
    } catch (cause) {
      setError(
        cause instanceof ApiClientError && cause.code === "SENSITIVE_CONTENT"
          ? "评论里有不适合发布的词句，换个说法吧。"
          : errorMessage(cause),
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(commentId: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/posts/${post.id}/comments/${commentId}`, { method: "DELETE" });
      setComments((current) => (current ?? []).filter((item) => item.id !== commentId));
      onChange({ commentCount: Math.max(0, post.commentCount - 1) });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("删除这条动态？删除后同校同学将看不到它。")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      onDelete(post.id);
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  const video = post.media.find((item) => item.type === "video");
  const images = post.media.filter((item) => item.type === "image");

  return (
    <Card className="circle-card-lift space-y-3.5">
      <div className="flex items-center gap-3">
        <CircleAvatar name={post.author.nickname} src={post.author.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-slate-800">
            {post.author.nickname}
            {post.mine ? (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-500">
                我
              </span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {post.author.mbti ? (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                {post.author.mbti}
              </span>
            ) : null}
            {post.author.department ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                {post.author.department}
              </span>
            ) : null}
            <span className="text-[10.5px] text-slate-500">{formatTime(post.createdAt)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {post.status === "hidden" ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-600">
              审核中
            </span>
          ) : null}
          {post.status === "removed" ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
              已删除
            </span>
          ) : null}

          {!post.mine && post.status === "published" ? (
            post.following ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-600">
                <Check size={12} strokeWidth={2} aria-hidden="true" /> 已关注
              </span>
            ) : (
              <button
                type="button"
                onClick={follow}
                disabled={busy}
                className="circle-btn relative inline-flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm shadow-indigo-500/25 after:absolute after:-inset-2 after:content-[''] disabled:opacity-50"
              >
                <UserPlus size={12} strokeWidth={1.5} aria-hidden="true" /> 关注
              </button>
            )
          ) : null}
        </div>
      </div>

      {post.body ? (
        <p className="whitespace-pre-wrap break-words text-[14px] leading-7 text-slate-600">
          {post.body}
        </p>
      ) : null}

      {images.length > 0 ? (
        <div className={cn("grid gap-2", images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {images.map((item, index) => (
            <button
              key={`${post.id}-${index}`}
              type="button"
              aria-label="查看大图"
              onClick={() => setViewerIndex(index)}
              className={cn(
                "group relative block cursor-zoom-in overflow-hidden rounded-xl bg-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
                images.length === 1 ? "w-full" : "aspect-square",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt="动态图片"
                loading="lazy"
                className={cn(
                  "w-full object-cover transition duration-300 group-hover:scale-[1.02]",
                  images.length === 1 ? "aspect-[4/3] max-h-[420px]" : "h-full",
                )}
              />
              <span className="pointer-events-none absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-slate-900/45 text-white opacity-85 backdrop-blur transition group-hover:opacity-100">
                <Maximize2 size={13} strokeWidth={1.5} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {video ? (
        /\.(mp4|webm)(\?.*)?$/i.test(video.url) ? (
          <video
            controls
            preload="metadata"
            src={video.url}
            className="w-full rounded-xl bg-slate-900"
          />
        ) : (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-xl bg-indigo-50 px-3.5 py-3 text-indigo-600 transition-colors hover:bg-indigo-100/70"
          >
            <Video size={17} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
            <span className="text-[12.5px] font-medium">查看视频</span>
            <span className="ml-auto max-w-[55%] truncate text-[10.5px] text-slate-500">
              {video.url}
            </span>
          </a>
        )
      ) : null}

      {notice ? <Banner tone="success">{notice}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      <div className="flex items-center gap-1 pt-0.5">
        <LikeButton
          liked={post.liked}
          count={post.likeCount}
          disabled={busy || post.status !== "published"}
          onToggle={toggleLike}
        />

        <button
          type="button"
          onClick={openComments}
          aria-expanded={showComments}
          aria-label={showComments ? "收起评论" : "查看评论"}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[12px] text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
        >
          <MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />
          {post.commentCount > 0 ? post.commentCount : "评论"}
        </button>

        {post.mine ? (
          <button
            type="button"
            onClick={deletePost}
            disabled={busy || post.status === "removed"}
            className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[11px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" /> 删除
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReport(post)}
            className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[11px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Flag size={13} strokeWidth={1.5} aria-hidden="true" /> 举报
          </button>
        )}
      </div>

      {showComments ? (
        <div className="space-y-3 rounded-2xl bg-slate-50 p-3.5">
          {comments === null ? (
            <p className="text-[11.5px] text-slate-500">评论加载中…</p>
          ) : comments.length === 0 ? (
            <p className="text-[11.5px] text-slate-500">还没有评论，来说第一句。</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <CircleAvatar name={comment.author.nickname} src={comment.author.avatarUrl} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-500">
                    {comment.author.nickname} · {formatTime(comment.createdAt)}
                  </p>
                  <p className="mt-0.5 break-words text-[12.5px] leading-5 text-slate-600">
                    {comment.body}
                  </p>
                </div>
                {comment.mine ? (
                  <button
                    type="button"
                    aria-label="删除评论"
                    onClick={() => deleteComment(comment.id)}
                    className="mt-0.5 text-slate-500 transition-colors hover:text-rose-600"
                  >
                    <Trash2 size={12} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            ))
          )}

          <div className="flex gap-2 pt-1">
            <input
              value={commentText}
              maxLength={MAX_COMMENT_LENGTH}
              onChange={(event) => setCommentText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void submitComment();
                }
              }}
              placeholder="友好地说点什么…"
              aria-label="写评论"
              className="field-input py-2 text-[12.5px]"
            />
            <button
              type="button"
              aria-label="发送评论"
              onClick={submitComment}
              disabled={busy || commentText.trim().length === 0}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-indigo-500 text-white transition-all duration-200 hover:bg-indigo-600 active:scale-95 disabled:opacity-40"
            >
              <Send size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      {viewerIndex !== null && images.length > 0 ? (
        <ImageLightbox
          images={images.map((item) => item.url)}
          index={Math.min(viewerIndex, images.length - 1)}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </Card>
  );
}
