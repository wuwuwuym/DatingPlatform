"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  BadgeCheck,
  EyeOff,
  LockKeyhole,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { AvatarArt } from "@/components/landing/avatar-art";
import { MatchButton } from "@/components/landing/match-button";
import { OnlineStatus } from "@/components/landing/verified-badge";
import { Avatar, cn } from "@/components/ui";
import { FLOATING_INTERESTS, type Student } from "@/lib/landing-data";

const TAG_TONES = {
  coral: "bg-coral-soft text-coral-deep",
  mint: "bg-mint-soft text-mint-deep",
  indigo: "bg-brand-soft text-brand-deep",
} as const;

const HERO_TAG_TONES = [
  "bg-coral-soft text-coral-deep",
  "bg-mint-soft text-mint-deep",
  "bg-brand-soft text-brand-deep",
] as const;

const FLOAT_TIMING = [
  { duration: "4.8s", delay: "-0.4s" },
  { duration: "5.4s", delay: "-1.9s" },
  { duration: "5.9s", delay: "-3.1s" },
  { duration: "5.1s", delay: "-2.4s" },
];

function CampusDoodle() {
  return (
    <svg
      viewBox="0 0 520 540"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="428" cy="92" r="72" fill="#F28C8C" opacity="0.14" />
      <circle cx="428" cy="92" r="50" fill="none" stroke="#F28C8C" strokeWidth="1.4" opacity="0.32" />
      <path
        d="M-10 440c72-58 135-73 211-48 78 26 143 17 325-48v206H-10z"
        fill="#7BC9A6"
        opacity="0.22"
      />
      <g fill="none" stroke="#1F2937" strokeWidth="1.5" opacity="0.18" strokeLinecap="round">
        <path d="M68 424V186h132v238" />
        <path d="M68 226h132M68 274h132M68 322h132M68 370h132" />
        <path d="M96 186v-26h76v26" />
        <path d="M118 424v-34h34v34" />
        <path d="M414 424V286h48v138" />
        <path d="M432 310h12M432 342h12M432 374h12" />
      </g>
      <g fill="#5B6CFF" opacity="0.22">
        <rect x="86" y="242" width="18" height="22" rx="2" />
        <rect x="120" y="242" width="18" height="22" rx="2" />
        <rect x="154" y="242" width="18" height="22" rx="2" />
        <rect x="86" y="290" width="18" height="22" rx="2" />
        <rect x="120" y="290" width="18" height="22" rx="2" />
        <rect x="154" y="290" width="18" height="22" rx="2" />
      </g>
      <path
        d="M64 486c12-35 37-52 75-52 38 0 63 17 75 52"
        fill="none"
        stroke="#1F2937"
        strokeOpacity="0.14"
        strokeWidth="1.5"
        strokeDasharray="4 7"
      />
      <g opacity="0.5">
        <circle cx="377" cy="407" r="30" fill="#7BC9A6" />
        <path d="M377 443v34" stroke="#1F2937" strokeOpacity="0.2" strokeWidth="3" />
        <circle cx="452" cy="427" r="19" fill="#F28C8C" opacity="0.7" />
        <path d="M452 450v27" stroke="#1F2937" strokeOpacity="0.18" strokeWidth="2.4" />
      </g>
      <path
        d="M250 92c40 0 72 32 72 72"
        fill="none"
        stroke="#5B6CFF"
        strokeWidth="1.5"
        strokeDasharray="3 8"
        opacity="0.45"
      />
      <circle cx="250" cy="92" r="3.5" fill="#5B6CFF" />
      <circle cx="322" cy="164" r="3.5" fill="#5B6CFF" />
    </svg>
  );
}

function FloatingTag({
  label,
  tone,
  index,
  className,
}: {
  label: string;
  tone: keyof typeof TAG_TONES;
  index: number;
  className?: string;
}) {
  const timing = FLOAT_TIMING[index] ?? { duration: "5s", delay: "-1s" };
  return (
    <span
      className={cn(
        "float-tag absolute z-20 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/95 px-3 py-2 text-[11px] font-medium shadow-soft backdrop-blur-sm",
        TAG_TONES[tone],
        className,
      )}
      style={
        {
          "--float-duration": timing.duration,
          "--float-delay": timing.delay,
        } as CSSProperties
      }
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label}
    </span>
  );
}

function HeroVisual({ student }: { student: Student | null }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[510px] sm:h-[500px] lg:h-[560px]">
      <CampusDoodle />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
        style={{ width: "min(82vw, 300px)" }}
        className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div className="rounded-card border border-line bg-paper/95 p-5 shadow-float backdrop-blur-sm">
          {student ? (
            <>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-semibold text-brand-deep">
                  <Sparkles size={11} aria-hidden="true" />
                  今日同频
                </span>
                <span className="text-[11px] font-semibold text-brand-deep">{student.match}%</span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="relative size-[58px] overflow-hidden rounded-full border-2 border-surface bg-surface shadow-card">
                  {student.avatarUrl || student.demo === false ? (
                    <Avatar name={student.name} src={student.avatarUrl} size={58} />
                  ) : (
                    <AvatarArt variant={student.avatar} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[17px] font-semibold tracking-tight text-ink">
                    {student.name}
                    <BadgeCheck size={15} className="text-brand" aria-hidden="true" />
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {[student.grade, student.major].filter(Boolean).join(" · ") || "同校同学"}
                  </p>
                  {student.online !== null ? (
                    <OnlineStatus online={student.online} className="mt-1" />
                  ) : null}
                </div>
              </div>

              <p className="mt-4 line-clamp-2 text-[12.5px] leading-5 text-ink-soft">{student.bio}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {student.interests.slice(0, 3).map((interest, index) => (
                  <span
                    key={interest}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10.5px] font-medium",
                      HERO_TAG_TONES[index % HERO_TAG_TONES.length]!,
                    )}
                  >
                    {interest}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-surface-soft px-3 py-2.5">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-coral-deep">
                  <Sparkles size={13} aria-hidden="true" />
                </span>
                <p className="text-[10.5px] leading-4 text-ink-soft">
                  {student.demo !== false ? (
                    <>
                      你们都喜欢{" "}
                      <span className="font-semibold text-ink">{student.sharedInterest}</span>，
                      共同兴趣 3 个
                    </>
                  ) : student.commonInterests && student.commonInterests > 0 ? (
                    <>
                      你们都喜欢{" "}
                      <span className="font-semibold text-ink">{student.sharedInterest}</span>，
                      共同兴趣 {student.commonInterests} 个
                    </>
                  ) : (
                    <>同校认证同学，兴趣可以慢慢发现</>
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="py-9 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-brand-soft text-brand-deep">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <p className="mt-3 text-[13.5px] font-semibold text-ink">匹配池正在更新</p>
              <p className="mx-auto mt-1.5 max-w-[220px] text-pretty text-[11px] leading-5 text-muted">
                等更多同校同学完善资料后，这里会出现第一位同频同学。
              </p>
            </div>
          )}
        </div>

        <div className="absolute -top-5 -right-7 rounded-full border border-line bg-paper px-3 py-1.5 text-[10px] font-semibold text-mint-deep shadow-soft">
          已通过学生认证
        </div>
        <div className="absolute -right-4 -bottom-5 flex items-center gap-1.5 rounded-full border border-line bg-ink px-3 py-1.5 text-[10px] font-medium text-white shadow-float">
          <LockKeyhole size={11} aria-hidden="true" />
          互关才可聊天
        </div>
      </motion.div>

      {FLOATING_INTERESTS.map((tag, index) => (
        <FloatingTag
          key={tag.label}
          label={tag.label}
          tone={tag.tone}
          index={index}
          className={tag.className}
        />
      ))}
    </div>
  );
}

export function Hero({
  query,
  onQueryChange,
  onSearch,
  onStartMatch,
  featured,
  live,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onStartMatch: () => void;
  featured: Student | null;
  live: boolean;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <section id="top" className="relative scroll-mt-24 overflow-hidden">
      <div aria-hidden="true" className="paper-grid absolute inset-0 opacity-70" />
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-24 size-[420px] rounded-full bg-mint-soft/60 blur-[1px]"
      />
      <div
        aria-hidden="true"
        className="absolute top-8 right-0 size-[320px] rounded-full bg-coral-soft/50 blur-[1px]"
      />

      <div className="landing-shell relative grid gap-4 py-10 sm:py-14 md:grid-cols-[1.04fr_0.96fr] md:items-center md:gap-8 md:py-20 lg:py-24">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-paper/80 px-3 py-1.5 text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-mint" aria-hidden="true" />
            只对同校 · 真实学生
          </div>

          <h1 className="mt-6 text-balance text-[clamp(2.6rem,6.3vw,4.8rem)] leading-[1.04] font-bold tracking-[-0.055em] text-ink">
            不必合群，
            <br />
            <span className="relative inline-block">
              遇见同频
              <svg
                viewBox="0 0 210 14"
                className="absolute -bottom-2 left-0 h-3 w-full text-coral"
                aria-hidden="true"
                preserveAspectRatio="none"
              >
                <path
                  d="M3 9c35-6 70-7 105-4 33 3 66 2 99-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            就好。
          </h1>

          <p className="mt-6 max-w-[470px] text-pretty text-[14px] leading-7 text-ink-soft sm:text-[15px]">
            不赶场，不内耗。用兴趣认识同校同学，互相关注之后再慢慢聊。
            <span className="text-muted">每一次认识，都从舒服的距离开始。</span>
          </p>

          <form
            onSubmit={submit}
            role="search"
            className="mt-7 flex max-w-[560px] items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-soft focus-within:ring-4 focus-within:ring-brand/15"
          >
            <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜兴趣、专业或昵称"
              aria-label="搜索兴趣、专业或昵称"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[13px] text-ink outline-none placeholder:text-muted"
            />
            {query ? (
              <button
                type="button"
                aria-label="清除搜索"
                onClick={() => onQueryChange("")}
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-soft"
              >
                <X size={15} aria-hidden="true" />
              </button>
            ) : (
              <span className="hidden shrink-0 pr-1 text-[10px] text-muted sm:block">试试看</span>
            )}
            <button
              type="submit"
              aria-label="搜索同频同学"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-canvas"
            >
              <Search size={17} aria-hidden="true" />
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <MatchButton onAction={onStartMatch}>开始匹配</MatchButton>
            <a
              href="#discover"
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line bg-paper px-5 py-3 text-[13px] font-medium text-ink-soft"
            >
              先随便看看
              <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-muted">
            <li className="inline-flex items-center gap-1.5">
              <BadgeCheck size={13} className="text-mint-deep" aria-hidden="true" />
              学生身份认证
            </li>
            <li className="inline-flex items-center gap-1.5">
              <EyeOff size={13} className="text-brand" aria-hidden="true" />
              资料可随时隐身
            </li>
            <li className="inline-flex items-center gap-1.5">
              <LockKeyhole size={13} className="text-coral-deep" aria-hidden="true" />
              互关才可私聊
            </li>
          </ul>

          <p className="mt-4 text-[10px] text-muted">
            {live
              ? "同校匹配池实时同步 · 仅同校认证学生可见"
              : "今天有 24 位同校同学在线 · 演示数据"}
          </p>
        </div>

        <HeroVisual student={featured} />
      </div>
    </section>
  );
}
