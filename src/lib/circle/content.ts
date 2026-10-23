import { findSensitiveWords } from "@/lib/chat/sensitive";
import type { CircleMedia } from "@/lib/types";

export const MAX_POST_LENGTH = 800;
export const MAX_POST_MEDIA = 4;
export const MAX_COMMENT_LENGTH = 300;
/** Roughly 300 KB of binary data once base64-decoded. */
export const MAX_IMAGE_DATA_URL_LENGTH = 400_000;
export const MAX_VIDEO_URL_LENGTH = 500;

const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export interface MediaInput {
  type: "image" | "video";
  url: string;
}

/**
 * Circle content moderation is intentionally layered:
 *   1. structural limits (length / media count) via zod,
 *   2. media shape checks here,
 *   3. blocked-word matching on a normalised copy of the text.
 * A hit rejects the whole post/comment before it reaches the database.
 */
export function moderateText(text: string, words: readonly string[]): string[] {
  return findSensitiveWords(text, words);
}

export function isAllowedImageDataUrl(value: string): boolean {
  return value.length <= MAX_IMAGE_DATA_URL_LENGTH && IMAGE_DATA_URL.test(value);
}

export function isAllowedVideoUrl(value: string): boolean {
  if (value.length > MAX_VIDEO_URL_LENGTH) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export type NormalizedMedia =
  | { ok: true; media: CircleMedia[] }
  | { ok: false; message: string };

/** Validates and canonicalises the media array before it is persisted. */
export function normalizePostMedia(input: readonly MediaInput[]): NormalizedMedia {
  if (input.length > MAX_POST_MEDIA) {
    return { ok: false, message: `最多只能附带 ${MAX_POST_MEDIA} 张图片` };
  }

  const media: CircleMedia[] = [];
  let images = 0;
  let videos = 0;

  for (const item of input) {
    if (item.type === "image") {
      if (!isAllowedImageDataUrl(item.url)) {
        return { ok: false, message: "图片格式不支持或体积过大，请重新选择后上传" };
      }
      images += 1;
      media.push({ type: "image", url: item.url });
      continue;
    }

    if (!isAllowedVideoUrl(item.url)) {
      return { ok: false, message: "视频需要填写 https 开头的链接" };
    }
    videos += 1;
    media.push({ type: "video", url: item.url });
  }

  if (videos > 1) return { ok: false, message: "每条动态最多附带 1 个视频" };
  if (videos > 0 && images > 0) {
    return { ok: false, message: "图片和视频不能混在同一条动态里" };
  }

  return { ok: true, media };
}

/** Short single-line preview used by report lists and admin views. */
export function excerptOf(text: string, max = 48): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return `${[...collapsed].slice(0, max).join("")}…`;
}
