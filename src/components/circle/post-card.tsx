"use client";

import { useState } from "react";
import {
  Check,
  Flag,
  Heart,
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
import { Avatar, Badge, Banner, Card, cn } from "@/components/ui";
import { MAX_COMMENT_LENGTH } from "@/lib/circle/content";
import { ImageLightbox } from "./lightbox";

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
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={post.author.nickname} src={post.author.avatarUrl} size={40} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-ink">
            {post.author.nickname}
            {post.mine ? <span className="text-[10px] font-normal text-muted">我</span> : null}
          </p>
          <p className="mt-0.5 truncate text-[10.5px] text-muted">
            {[post.author.mbti, post.author.department, formatTime(post.createdAt)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {post.status === "hidden" ? <Badge tone="accent">审核中</Badge> : null}
        {post.status === "removed" ? <Badge>已删除</Badge> : null}

        {!post.mine && post.status === "published" ? (
          post.following ? (
            <span className="flex items-center gap-1 text-[11px] text-muted">
              <Check size={12} /> 已关注
            </span>
          ) : (
            <button
              type="button"
              onClick={follow}
              disabled={busy}
              className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1.5 text-[11px] font-medium text-brand disabled:opacity-50"
            >
              <UserPlus size={12} /> 关注
            </button>
          )
        ) : null}
      </div>

      {post.body ? (
        <p className="whitespace-pre-wrap break-words text-[13.5px] leading-6 text-ink-soft">
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
                "group relative block cursor-zoom-in overflow-hidden rounded-2xl bg-black/[0.03] outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
                images.length === 1 ? "w-full" : "aspect-square",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt="动态图片"
                loading="lazy"
                className={cn(
                  "w-full object-cover transition duration-300 group-hover:scale-[1.015]",
                  images.length === 1 ? "max-h-[420px] aspect-[4/3]" : "h-full",
                )}
              />
              <span className="pointer-events-none absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-black/40 text-white opacity-85 backdrop-blur transition group-hover:opacity-100">
                <Maximize2 size={12} />
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
            className="w-full rounded-2xl bg-black"
          />
        ) : (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-2xl bg-brand-soft/70 px-3.5 py-3 text-brand"
          >
            <Video size={17} className="shrink-0" />
            <span className="text-[12.5px] font-medium">查看视频</span>
            <span className="ml-auto max-w-[55%] truncate text-[10.5px] text-muted">
              {video.url}
            </span>
          </a>
        )
      ) : null}

      {notice ? <Banner tone="success">{notice}</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}

      <div className="flex items-center gap-4 border-t border-line pt-2.5 text-[12px] text-muted">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy || post.status !== "published"}
          className={cn(
            "flex items-center gap-1.5 transition disabled:opacity-50",
            post.liked && "font-medium text-accent",
          )}
        >
          <Heart size={15} fill={post.liked ? "currentColor" : "none"} />
          {post.likeCount > 0 ? post.likeCount : "点赞"}
        </button>

        <button type="button" onClick={openComments} className="flex items-center gap-1.5">
          <MessageCircle size={15} />
          {post.commentCount > 0 ? post.commentCount : "评论"}
        </button>

        {post.mine ? (
          <button
            type="button"
            onClick={deletePost}
            disabled={busy || post.status === "removed"}
            className="ml-auto flex items-center gap-1 text-[11px] disabled:opacity-40"
          >
            <Trash2 size={13} /> 删除
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onReport(post)}
            className="ml-auto flex items-center gap-1 text-[11px]"
          >
            <Flag size={12} /> 举报
          </button>
        )}
      </div>

      {showComments ? (
        <div className="space-y-2.5 rounded-2xl bg-black/[0.02] p-3">
          {comments === null ? (
            <p className="text-[11.5px] text-muted">评论加载中…</p>
          ) : comments.length === 0 ? (
            <p className="text-[11.5px] text-muted">还没有评论，来说第一句。</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                <Avatar name={comment.author.nickname} src={comment.author.avatarUrl} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted">
                    {comment.author.nickname} · {formatTime(comment.createdAt)}
                  </p>
                  <p className="mt-0.5 break-words text-[12.5px] leading-5 text-ink-soft">
                    {comment.body}
                  </p>
                </div>
                {comment.mine ? (
                  <button
                    type="button"
                    aria-label="删除评论"
                    onClick={() => deleteComment(comment.id)}
                    className="mt-0.5 text-muted"
                  >
                    <Trash2 size={12} />
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
              className="field-input py-2 text-[12.5px]"
            />
            <button
              type="button"
              aria-label="发送评论"
              onClick={submitComment}
              disabled={busy || commentText.trim().length === 0}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:opacity-40"
            >
              <Send size={14} />
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
