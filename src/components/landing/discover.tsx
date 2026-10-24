"use client";

import { useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { EmptyMatches } from "@/components/landing/empty-matches";
import { Reveal } from "@/components/landing/reveal";
import { UserCard } from "@/components/landing/user-card";
import { cn } from "@/components/ui";
import type { Student } from "@/lib/landing-data";

const TABS = [
  { id: "recommended", label: "为你推荐" },
  { id: "online", label: "在线" },
  { id: "freshman", label: "大一新生" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Discover({
  students,
  query,
  selectedTags,
  mode,
  onRemoveTag,
  onClearAll,
  onOpen,
  onReport,
  onPrivacy,
}: {
  students: Student[];
  query: string;
  selectedTags: string[];
  mode: "demo" | "live";
  onRemoveTag: (tag: string) => void;
  onClearAll: () => void;
  onOpen: (student: Student) => void;
  onReport: (student: Student) => void;
  onPrivacy: () => void;
}) {
  const [tab, setTab] = useState<TabId>("recommended");
  const live = mode === "live";
  const tabs = useMemo(
    () => (live ? TABS.filter((item) => item.id !== "online") : TABS),
    [live],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return students
      .filter((student) => {
        if (tab === "online" && !student.online) return false;
        if (tab === "freshman" && student.grade !== "大一") return false;

        if (
          selectedTags.length > 0 &&
          !selectedTags.some((tag) => student.interests.includes(tag))
        ) {
          return false;
        }

        if (!needle) return true;

        return [student.name, student.major, student.bio, ...student.interests]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => b.match - a.match);
  }, [query, selectedTags, students, tab]);

  const hasFilters = query.trim().length > 0 || selectedTags.length > 0 || tab !== "recommended";

  function reset() {
    setTab("recommended");
    onClearAll();
  }

  return (
    <section id="discover" className="scroll-mt-20 py-14 sm:py-20">
      <div className="landing-shell">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
                01 / Discover
              </p>
              <h2 className="mt-3 text-balance text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.12] font-bold tracking-[-0.045em] text-ink">
                今天，和谁聊两句？
              </h2>
              <p className="mt-3 max-w-[430px] text-pretty text-[13px] leading-6 text-ink-soft">
                {live
                  ? "每一张卡片都来自同校认证学生，按兴趣与性格计算同频度。先看看共同的兴趣，再决定要不要认识。"
                  : "下面是几张示例卡片。登录并完善资料后，这里会换成同校认证学生的实时推荐。"}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-[11px] text-muted">
              <SlidersHorizontal size={14} className="text-brand" aria-hidden="true" />
              <span>
                找到 <span className="font-semibold text-ink">{filtered.length}</span> 位同频同学
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <div className="mt-7 flex flex-col gap-3 border-y border-line py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto" aria-label="推荐筛选">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={tab === item.id}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full px-3.5 py-2 text-[11.5px] font-medium",
                    tab === item.id
                      ? "bg-ink text-canvas"
                      : "text-muted hover:bg-surface-soft hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-[10.5px] font-medium text-brand-deep"
                  aria-label={`移除兴趣筛选 ${tag}`}
                >
                  {tag}
                  <X size={11} aria-hidden="true" />
                </button>
              ))}
              {hasFilters ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium text-muted"
                >
                  <RotateCcw size={11} aria-hidden="true" />
                  清空筛选
                </button>
              ) : null}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-6">
          {filtered.length > 0 ? (
            <div
              className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-5 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3"
              aria-label="推荐同学"
            >
              {filtered.map((student) => (
                <UserCard
                  key={student.id}
                  student={student}
                  onOpen={onOpen}
                  onReport={onReport}
                  onPrivacy={onPrivacy}
                />
              ))}
            </div>
          ) : (
            <EmptyMatches
              title={live ? "本校暂无更多可推荐同学" : "这一组暂时没有同频同学"}
              description={
                live
                  ? "匹配池还在积累中。等更多同校同学完善资料后，这里会自动更新。"
                  : "换个兴趣，或者把筛选放宽一点。认识人这件事，不用着急。"
              }
              action={
                live && students.length === 0 ? undefined : (
                  <button
                    type="button"
                    onClick={reset}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 py-3 text-[12px] font-semibold text-white"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    重新看看
                  </button>
                )
              }
            />
          )}
        </Reveal>

        <p className="mt-4 text-center text-[10px] text-muted">
          {live
            ? "推荐来自同校匹配池 · 仅同校认证学生可见"
            : "以上人物与数据均为演示内容 · 登录后查看同校实时推荐"}
        </p>
      </div>
    </section>
  );
}
