"use client";

import Image from "next/image";
import { ArrowUpRight, Eye, Flag, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { Switch } from "@/components/landing/switch";

export interface PrivacyState {
  discoverable: boolean;
  showOnline: boolean;
}

export function Safety({
  privacy,
  onPrivacyChange,
  onReport,
}: {
  privacy: PrivacyState;
  onPrivacyChange: (next: PrivacyState) => void;
  onReport: () => void;
}) {
  return (
    <section id="safety" className="scroll-mt-20 py-14 sm:py-20">
      <div className="landing-shell">
        <Reveal>
          <div className="relative overflow-hidden rounded-panel bg-ink px-5 py-8 text-white sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:22px_22px]"
            />
            <div
              aria-hidden="true"
              className="absolute -top-20 -right-16 size-64 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-6 size-40 rounded-full border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute right-10 bottom-6 hidden text-white/[0.06] lg:block"
            >
              <ShieldCheck size={150} strokeWidth={1} />
            </div>

            <div className="relative grid gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-white/55 uppercase">
                  03 / Safety
                </p>
                <h2 className="mt-3 text-balance text-[clamp(1.8rem,4vw,2.9rem)] leading-[1.12] font-bold tracking-[-0.045em]">
                  安心认识，
                  <br />
                  慢慢熟悉。
                </h2>
                <p className="mt-4 max-w-[370px] text-pretty text-[13px] leading-6 text-white/68">
                  真实身份只是起点。我们把隐私开关、举报入口和边界感，放在你随时够得到的地方。
                </p>

                <div className="mt-7 flex gap-3">
                  <figure className="w-[46%] rotate-[-2.5deg] rounded-card border border-white/20 bg-paper p-1.5 shadow-float">
                    <div className="overflow-hidden rounded-[14px]">
                      <Image
                        src="/circle/library.jpg"
                        alt="校园图书馆靠窗的自习区插画"
                        width={720}
                        height={480}
                        loading="lazy"
                        sizes="(max-width: 768px) 40vw, 180px"
                        className="h-auto w-full object-cover"
                      />
                    </div>
                    <figcaption className="px-1.5 py-1.5 text-[9px] text-ink-soft">
                      图书馆四楼，靠窗的位置
                    </figcaption>
                  </figure>
                  <figure className="mt-5 w-[46%] rotate-[2deg] rounded-card border border-white/20 bg-paper p-1.5 shadow-float">
                    <div className="overflow-hidden rounded-[14px]">
                      <Image
                        src="/circle/sunset.jpg"
                        alt="校园傍晚天空与教学楼的插画"
                        width={720}
                        height={480}
                        loading="lazy"
                        sizes="(max-width: 768px) 40vw, 180px"
                        className="h-auto w-full object-cover"
                      />
                    </div>
                    <figcaption className="px-1.5 py-1.5 text-[9px] text-ink-soft">
                      傍晚六点，操场边的天空
                    </figcaption>
                  </figure>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-card border border-white/10 bg-white/[0.06] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
                      <ShieldCheck size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold">学生身份认证</p>
                        <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[9.5px] font-medium text-mint">
                          已认证
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-5 text-white/60">
                        学号只做一次性核验并哈希存储，不展示、不流转。通过后只保留一枚认证徽章。
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-card border border-white/10 bg-white/[0.06] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13.5px] font-semibold">隐私开关</p>
                      <p className="mt-1 text-[11px] leading-5 text-white/55">
                        先决定谁能看见你，再决定要不要开口。
                      </p>
                    </div>
                    <LockKeyhole size={17} className="shrink-0 text-white/45" aria-hidden="true" />
                  </div>

                  <div className="mt-3 divide-y divide-white/10">
                    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
                      <span className="flex items-center gap-2 text-[11.5px] text-white/80">
                        <Eye size={14} className="text-mint" aria-hidden="true" />
                        允许同校同学发现我
                      </span>
                      <Switch
                        checked={privacy.discoverable}
                        onChange={(next) =>
                          onPrivacyChange({ ...privacy, discoverable: next })
                        }
                        label="允许同校同学发现我"
                      />
                    </div>
                    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
                      <span className="flex items-center gap-2 text-[11.5px] text-white/80">
                        <Radio size={14} className="text-coral" aria-hidden="true" />
                        展示在线状态
                      </span>
                      <Switch
                        checked={privacy.showOnline}
                        onChange={(next) => onPrivacyChange({ ...privacy, showOnline: next })}
                        label="展示在线状态"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onReport}
                  className="group flex w-full items-center justify-between gap-4 rounded-card border border-white/10 bg-white/[0.06] p-4 text-left sm:p-5"
                >
                  <span className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral/15 text-coral">
                      <Flag size={18} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-semibold">遇到不舒服，随时说</span>
                      <span className="mt-1 block text-[11px] leading-5 text-white/55">
                        举报入口 24 小时可达，不会通知对方。管理员会尽快处理。
                      </span>
                    </span>
                  </span>
                  <ArrowUpRight
                    size={17}
                    className="shrink-0 text-white/50 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>

                <p className="px-1 text-[9.5px] leading-4 text-white/55">
                  以上开关为产品演示，仅保存在当前浏览器，不会写入真实账号。
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
