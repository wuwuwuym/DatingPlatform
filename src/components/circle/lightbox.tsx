"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Full-screen image viewer. Rendered through a portal because the page
 * container uses a transform animation, which would otherwise become the
 * containing block for `position: fixed`.
 */
export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && index < images.length - 1) onIndexChange(index + 1);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [images.length, index, onClose, onIndexChange]);

  if (!mounted) return null;

  const image = images[index];
  if (!image) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="查看大图"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        autoFocus
        aria-label="关闭大图"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white/12 text-white outline-none backdrop-blur transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <X size={20} />
      </button>

      {images.length > 1 && index > 0 ? (
        <button
          type="button"
          aria-label="上一张"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index - 1);
          }}
          className="absolute left-3 z-10 grid size-10 place-items-center rounded-full bg-white/12 text-white outline-none backdrop-blur transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <ChevronLeft size={22} />
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt="动态图片大图"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88dvh] max-w-full rounded-2xl object-contain shadow-2xl"
      />

      {images.length > 1 && index < images.length - 1 ? (
        <button
          type="button"
          aria-label="下一张"
          onClick={(event) => {
            event.stopPropagation();
            onIndexChange(index + 1);
          }}
          className="absolute right-3 z-10 grid size-10 place-items-center rounded-full bg-white/12 text-white outline-none backdrop-blur transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <ChevronRight size={22} />
        </button>
      ) : null}

      {images.length > 1 ? (
        <span className="absolute bottom-5 rounded-full bg-black/45 px-3 py-1 text-[12px] text-white/90">
          {index + 1} / {images.length}
        </span>
      ) : null}
    </div>,
    document.body,
  );
}
