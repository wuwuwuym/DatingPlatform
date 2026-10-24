"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Flag, LockKeyhole } from "lucide-react";
import type { MouseEvent } from "react";
import { AvatarArt } from "@/components/landing/avatar-art";
import { OnlineStatus, VerifiedBadge } from "@/components/landing/verified-badge";
import { Avatar, cn } from "@/components/ui";
import type { AccentTone, Student } from "@/lib/landing-data";

const TAG_STYLES: Record<AccentTone, string> = {
  coral: "bg-coral-soft text-coral-deep",
  mint: "bg-mint-soft text-mint-deep",
  indigo: "bg-brand-soft text-brand-deep",
};

const TAG_TONES: AccentTone[] = ["coral", "mint", "indigo"];

export function UserCard({
  student,
  onOpen,
  onReport,
  onPrivacy,
}: {
  student: Student;
  onOpen: (student: Student) => void;
  onReport: (student: Student) => void;
  onPrivacy: () => void;
}) {
  const reduce = useReducedMotion();

  function stop(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <div className="group relative w-[84vw] max-w-[340px] shrink-0 snap-start md:w-auto md:max-w-none">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-4 bottom-0 rounded-card opacity-0 shadow-float transition-opacity duration-[160ms] group-hover:opacity-100 group-focus-within:opacity-100"
      />
      <motion.article
        onClick={() => onOpen(student)}
        whileHover={reduce ? undefined : { y: -2 }}
        whileTap={reduce ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="relative flex h-full min-h-[372px] cursor-pointer flex-col rounded-card border border-line bg-surface p-5 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="relative size-[68px] overflow-hidden rounded-full border-[3px] border-surface bg-surface shadow-card">
            {student.avatarUrl || student.demo === false ? (
              <Avatar name={student.name} src={student.avatarUrl} size={68} />
            ) : (
              <AvatarArt variant={student.avatar} />
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={`${student.name}的隐私设置`}
              title="隐私设置"
              onClick={(event) => {
                stop(event);
                onPrivacy();
              }}
              className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-soft"
            >
              <LockKeyhole size={15} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`举报 ${student.name}`}
              title="举报"
              onClick={(event) => {
                stop(event);
                onReport(student);
              }}
              className="grid size-11 place-items-center rounded-full text-muted hover:bg-surface-soft"
            >
              <Flag size={15} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1">
          <h3 className="text-[19px] font-semibold tracking-tight text-ink">{student.name}</h3>
          {student.verified ? <VerifiedBadge /> : null}
        </div>
        <p className="mt-1 text-[11.5px] text-muted">
          {[student.grade, student.major].filter(Boolean).join(" · ") || "同校同学"}
        </p>

        <p className="mt-3 line-clamp-2 min-h-[40px] text-[12.5px] leading-5 text-ink-soft">
          {student.bio}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {student.interests.map((interest, index) => {
            const tone = TAG_TONES[index % TAG_TONES.length] ?? "indigo";
            return (
              <span
                key={interest}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10.5px] font-medium",
                  TAG_STYLES[tone],
                )}
              >
                {interest}
              </span>
            );
          })}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-muted">同频度</span>
            <span className="font-semibold text-brand-deep">{student.match}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-soft">
            <motion.span
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={reduce ? undefined : { scaleX: student.match / 100 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={
                reduce
                  ? { transform: `scaleX(${student.match / 100})` }
                  : { transformOrigin: "left" }
              }
              className="block h-full w-full origin-left rounded-full bg-brand"
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <OnlineStatus online={student.online} />
            <button
              type="button"
              aria-label={`查看 ${student.name} 的主页`}
              onClick={(event) => {
                stop(event);
                onOpen(student);
              }}
              className="inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-brand-deep hover:bg-brand-soft"
            >
              看看 TA
              <ArrowUpRight size={13} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.article>
    </div>
  );
}
