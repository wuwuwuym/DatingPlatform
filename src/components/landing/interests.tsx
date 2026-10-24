"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, Check, Sparkles, X } from "lucide-react";
import { cn } from "@/components/ui";
import type { AccentTone, InterestTag } from "@/lib/landing-data";

const SIZE_STYLES = {
  sm: "px-3 py-2 text-[11px]",
  md: "px-4 py-2.5 text-[12px]",
  lg: "px-4.5 py-3 text-[13px]",
} as const;

const DOT_STYLES: Record<AccentTone, string> = {
  coral: "bg-coral",
  mint: "bg-mint",
  indigo: "bg-brand",
};

function InterestChip({
  tag,
  selected,
  onToggle,
}: {
  tag: InterestTag;
  selected: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      whileHover={reduce ? undefined : { y: -4 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.55 }}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25",
        SIZE_STYLES[tag.size],
        selected
          ? "border-transparent bg-brand text-white"
          : "border-line bg-paper text-ink-soft hover:border-line-strong",
      )}
    >
      {selected ? (
        <Check size={13} strokeWidth={2.6} aria-hidden="true" />
      ) : (
        <span className={cn("size-1.5 rounded-full", DOT_STYLES[tag.tone])} aria-hidden="true" />
      )}
      <span className="font-medium">{tag.label}</span>
      <span className={cn("text-[9.5px]", selected ? "text-white/80" : "text-muted")}>
        {tag.count}
      </span>
    </motion.button>
  );
}

export function Interests({
  tags,
  selectedTags,
  matchCount,
  onToggle,
  onClear,
  onViewMatches,
}: {
  tags: InterestTag[];
  selectedTags: string[];
  matchCount: number;
  onToggle: (tag: string) => void;
  onClear: () => void;
  onViewMatches: () => void;
}) {
  return (
    <section id="interests" className="scroll-mt-20 border-y border-line bg-surface-soft/60 py-14 sm:py-20">
      <div className="landing-shell grid gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-14">
        <div className="lg:sticky lg:top-24">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
            02 / Interests
          </p>
          <h2 className="mt-3 text-balance text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.12] font-bold tracking-[-0.045em] text-ink">
            把喜欢的事，
            <br />
            先说出来。
          </h2>
          <p className="mt-4 max-w-[380px] text-pretty text-[13px] leading-6 text-ink-soft">
            不用想一个完美的自我介绍。选几个最近在意的兴趣，我们会把同频的人放到你面前。
          </p>

          <div className="mt-6 rounded-card border border-line bg-paper p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
                <Sparkles size={13} className="text-coral-deep" aria-hidden="true" />
                {selectedTags.length > 0 ? `已选 ${selectedTags.length} 个兴趣` : "还没有选择兴趣"}
              </p>
              {selectedTags.length > 0 ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex min-h-8 items-center gap-1 text-[10.5px] text-muted"
                >
                  <X size={11} aria-hidden="true" />
                  清空
                </button>
              ) : null}
            </div>

            {selectedTags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-medium text-brand-deep"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-5 text-muted">
                从右边随手点一个也可以，不喜欢随时取消。
              </p>
            )}

            <button
              type="button"
              onClick={onViewMatches}
              disabled={selectedTags.length === 0}
              className={cn(
                "mt-4 inline-flex min-h-10 w-full items-center justify-between rounded-full px-4 py-2.5 text-[11.5px] font-semibold",
                selectedTags.length > 0
                  ? "bg-ink text-canvas"
                  : "cursor-not-allowed bg-surface-soft text-muted",
              )}
            >
              <span>
                {selectedTags.length > 0 ? `看看 ${matchCount} 位同频同学` : "先选一个兴趣"}
              </span>
              <ArrowDownRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-panel border border-line bg-canvas p-5 sm:p-8">
          <div aria-hidden="true" className="dot-field absolute top-4 right-4 size-24 opacity-40" />
          <div
            aria-hidden="true"
            className="absolute -bottom-16 -left-14 size-44 rounded-full bg-coral-soft/80"
          />
          <div
            aria-hidden="true"
            className="absolute -top-10 -right-8 size-32 rounded-full bg-brand-soft/80"
          />

          <div className="relative flex flex-wrap content-start gap-2.5 sm:gap-3">
            {tags.map((tag) => (
              <InterestChip
                key={tag.label}
                tag={tag}
                selected={selectedTags.includes(tag.label)}
                onToggle={() => onToggle(tag.label)}
              />
            ))}
          </div>

          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <p className="text-[10px] text-muted">标签后的数字是近 7 天同校提及次数 · 演示数据</p>
            <button
              type="button"
              onClick={onViewMatches}
              disabled={selectedTags.length === 0}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[10.5px] font-medium text-ink-soft disabled:opacity-50"
            >
              查看匹配
              <ArrowDownRight size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
