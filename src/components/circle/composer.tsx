"use client";

import { useRef, useState } from "react";
import { ImagePlus, Send, Video, X } from "lucide-react";
import { MAX_POST_LENGTH, MAX_POST_MEDIA } from "@/lib/circle/content";
import { fileToPostImageDataUrl } from "@/lib/image";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import type { PostItem } from "@/lib/types";
import { Banner, Button, Card, Textarea, cn } from "@/components/ui";

interface MediaDraft {
  type: "image" | "video";
  url: string;
}

export function Composer({ onPublished }: { onPublished: (post: PostItem) => void }) {
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoMode, setVideoMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const images = media.filter((item) => item.type === "image");

  function apologize(cause: unknown) {
    if (cause instanceof ApiClientError && cause.code === "SENSITIVE_CONTENT") {
      setError("内容里有不适合发布的词句，换个说法再发一次吧。");
      return;
    }
    setError(errorMessage(cause));
  }

  async function pickImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_POST_MEDIA - images.length;
    if (room <= 0) {
      setError(`最多只能添加 ${MAX_POST_MEDIA} 张图片`);
      return;
    }

    const selected = [...files].slice(0, room);
    try {
      const urls: string[] = [];
      for (const file of selected) {
        urls.push(await fileToPostImageDataUrl(file));
      }
      setVideoMode(false);
      setVideoUrl("");
      setMedia((current) => [
        ...current.filter((item) => item.type === "image"),
        ...urls.map((url) => ({ type: "image" as const, url })),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "图片处理失败，请换一张试试");
    }
  }

  function attachVideo() {
    const url = videoUrl.trim();
    if (!url) {
      setError("先填写视频链接");
      return;
    }
    if (!/^https:\/\//i.test(url)) {
      setError("视频链接需要以 https:// 开头");
      return;
    }
    setMedia([{ type: "video", url }]);
    setVideoMode(false);
    setError(null);
  }

  async function publish() {
    setBusy(true);
    setError(null);
    try {
      const { post } = await api<{ post: PostItem }>("/api/posts", {
        body: { body, media },
      });
      setBody("");
      setMedia([]);
      setVideoUrl("");
      setVideoMode(false);
      onPublished(post);
    } catch (cause) {
      apologize(cause);
    } finally {
      setBusy(false);
    }
  }

  const canPublish = !busy && (body.trim().length > 0 || media.length > 0);

  return (
    <Card className="space-y-3 p-4">
      <Textarea
        rows={3}
        value={body}
        maxLength={MAX_POST_LENGTH}
        onChange={(event) => setBody(event.target.value)}
        placeholder="分享此刻的校园生活：一张晚霞、一顿食堂新菜，或者一句想说的话…"
        className="border-transparent bg-black/[0.025]"
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {images.map((item, index) => (
            <div key={`${item.url.slice(0, 32)}-${index}`} className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <button
                type="button"
                aria-label="移除图片"
                onClick={() => setMedia((current) => current.filter((entry) => entry !== item))}
                className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-black/55 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {media.some((item) => item.type === "video") ? (
        <div className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2.5">
          <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-soft">
            <Video size={14} className="shrink-0" />
            <span className="truncate">{media.find((item) => item.type === "video")?.url}</span>
          </span>
          <button
            type="button"
            aria-label="移除视频"
            onClick={() => setMedia([])}
            className="ml-2 shrink-0 text-[11px] text-muted"
          >
            移除
          </button>
        </div>
      ) : null}

      {videoMode ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://… 视频链接"
            className="field-input py-2 text-[13px]"
          />
          <Button className="shrink-0 px-3 py-2 text-[12px]" onClick={attachVideo}>
            添加
          </Button>
        </div>
      ) : null}

      {error ? <Banner>{error}</Banner> : null}

      <div className="flex items-center gap-1.5">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => {
            void pickImages(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="添加图片"
          onClick={() => fileInput.current?.click()}
          className={cn(
            "grid size-9 place-items-center rounded-xl bg-black/[0.035] text-ink-soft",
            images.length >= MAX_POST_MEDIA && "opacity-40",
          )}
        >
          <ImagePlus size={16} />
        </button>
        <button
          type="button"
          aria-label="添加视频链接"
          onClick={() => {
            setVideoMode((value) => !value);
            setMedia((current) => current.filter((item) => item.type === "image"));
          }}
          className="grid size-9 place-items-center rounded-xl bg-black/[0.035] text-ink-soft"
        >
          <Video size={16} />
        </button>

        <span className="ml-auto text-[11px] text-muted">
          {body.length}/{MAX_POST_LENGTH}
        </span>
        <Button
          className="px-4 py-2 text-[12.5px]"
          loading={busy}
          disabled={!canPublish}
          onClick={publish}
        >
          <Send size={13} /> 发布
        </Button>
      </div>

      <p className="text-[10.5px] leading-4 text-muted">
        发布前会自动检查屏蔽词与媒体格式，含侮辱、诈骗、代考等内容会被直接拦截。
      </p>
    </Card>
  );
}
