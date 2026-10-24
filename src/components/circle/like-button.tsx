"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";

export function LikeButton({
  liked,
  count,
  disabled = false,
  onToggle,
}: {
  liked: boolean;
  count: number;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={liked}
      aria-label={liked ? "取消点赞" : "点赞"}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[12px] transition-all duration-200 active:scale-95 disabled:opacity-50",
        hover || liked
          ? "bg-rose-50 font-medium text-rose-600"
          : "text-slate-500 hover:bg-rose-50 hover:text-rose-600",
      )}
    >
      <motion.span
        className="inline-flex"
        animate={
          reduce
            ? undefined
            : { scale: hover ? 1.18 : liked ? 1.08 : 1, rotate: hover ? -6 : 0 }
        }
        transition={{ type: "spring", stiffness: 480, damping: 14, mass: 0.5 }}
      >
        <Heart
          size={16}
          strokeWidth={1.5}
          className={cn(
            "transition-colors duration-200",
            hover || liked ? "text-rose-500" : "text-slate-500",
            liked && "fill-rose-300",
          )}
          aria-hidden="true"
        />
      </motion.span>
      {count > 0 ? count : "点赞"}
    </button>
  );
}
