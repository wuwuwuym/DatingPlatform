"use client";

import { Flag, Heart, LockKeyhole, MessageCircle, ShieldCheck } from "lucide-react";
import { AvatarArt } from "@/components/landing/avatar-art";
import { Sheet } from "@/components/landing/sheet";
import { OnlineStatus, VerifiedBadge } from "@/components/landing/verified-badge";
import { Avatar, cn } from "@/components/ui";
import type { AccentTone, Student } from "@/lib/landing-data";

const TAG_STYLES: Record<AccentTone, string> = {
  coral: "bg-coral-soft text-coral-deep",
  mint: "bg-mint-soft text-mint-deep",
  indigo: "bg-brand-soft text-brand-deep",
};

const TAG_TONES: AccentTone[] = ["coral", "mint", "indigo"];

export function ProfileSheet({
  student,
  primaryLabel,
  primaryBusy = false,
  onClose,
  onPrimary,
  onMessage,
  onReport,
  onPrivacy,
}: {
  student: Student | null;
  primaryLabel: string;
  primaryBusy?: boolean;
  onClose: () => void;
  onPrimary: () => void;
  onMessage: () => void;
  onReport: (student: Student) => void;
  onPrivacy: () => void;
}) {
  return (
    <Sheet open={Boolean(student)} onClose={onClose} title="同学资料">
      {student ? (
        <div>
          <div className="pr-11">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[10px] font-semibold text-brand-deep">
              同频度 {student.match}%
            </span>
            <h2 className="mt-3 text-[24px] font-bold tracking-[-0.04em] text-ink">
              认识一下 {student.name}
            </h2>
            <p className="mt-1 text-[11.5px] text-muted">
              {[student.grade, student.major].filter(Boolean).join(" · ") || "同校同学"}
            </p>
          </div>

          <div className="mt-5 flex items-start gap-4 rounded-card bg-surface-soft p-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full border-[3px] border-paper bg-paper shadow-card">
              {student.avatarUrl || student.demo === false ? (
                <Avatar name={student.name} src={student.avatarUrl} size={80} />
              ) : (
                <AvatarArt variant={student.avatar} />
              )}
            </div>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-1">
                <p className="text-[18px] font-semibold tracking-tight text-ink">{student.name}</p>
                {student.verified ? <VerifiedBadge /> : null}
              </div>
              <OnlineStatus online={student.online} className="mt-1" />
              <p className="mt-2 text-[11.5px] leading-5 text-ink-soft">{student.bio}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-muted">你们的同频度</span>
              <span className="font-semibold text-brand-deep">{student.match}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-soft">
              <span
                className="block h-full origin-left rounded-full bg-brand"
                style={{ transform: `scaleX(${student.match / 100})` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-muted">
              {student.demo === false
                ? "同频度来自共同兴趣、性格标签与星座匹配 · 实时计算"
                : "同频度来自共同兴趣、性格标签与近期活跃度 · 演示算法"}
            </p>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold text-ink">TA 最近在喜欢</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
          </div>

          <div className="mt-5 rounded-card border border-line bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-mint-deep">
              <ShieldCheck size={13} aria-hidden="true" />
              已通过学生认证
            </p>
            <p className="mt-1.5 text-[10.5px] leading-5 text-muted">
              学号只做一次性核验并哈希存储，不展示、不流转。资料仅对同校认证学生可见。
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1.25fr_1fr]">
            <button
              type="button"
              onClick={onPrimary}
              disabled={primaryBusy}
              aria-busy={primaryBusy}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-[12.5px] font-semibold text-white disabled:opacity-60"
            >
              <Heart size={15} aria-hidden="true" />
              {primaryBusy ? "处理中…" : primaryLabel}
            </button>
            <button
              type="button"
              onClick={onMessage}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-3 text-[12px] font-medium text-ink-soft"
            >
              <MessageCircle size={15} aria-hidden="true" />
              打个招呼
            </button>
          </div>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[9.5px] text-muted">
            <LockKeyhole size={10} aria-hidden="true" />
            互相关注后才会解锁聊天
          </p>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={onPrivacy}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-medium text-ink-soft hover:bg-surface-soft"
            >
              <LockKeyhole size={12} aria-hidden="true" />
              隐私设置
            </button>
            <button
              type="button"
              onClick={() => onReport(student)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-[10.5px] font-medium text-coral-deep hover:bg-coral-soft"
            >
              <Flag size={12} aria-hidden="true" />
              举报这张卡片
            </button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
