"use client";

import { Compass, Home, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui";

const TABS = [
  { id: "top", label: "首页", icon: Home },
  { id: "discover", label: "发现", icon: Compass },
  { id: "interests", label: "兴趣", icon: Sparkles },
  { id: "safety", label: "安全", icon: ShieldCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function MobileTabBar() {
  const [active, setActive] = useState<TabId>("top");

  useEffect(() => {
    let frame = 0;

    function update() {
      frame = 0;
      const marker = window.scrollY + window.innerHeight * 0.32;
      let next: TabId = "top";

      for (const tab of TABS) {
        const section = document.getElementById(tab.id);
        if (section && section.offsetTop <= marker) next = tab.id;
      }

      setActive((current) => (current === next ? current : next));
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav
      aria-label="移动端快捷导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-canvas/92 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-[520px] items-stretch justify-between px-3 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => setActive(tab.id)}
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium",
                isActive ? "text-brand-deep" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full",
                  isActive ? "bg-brand-soft" : "bg-transparent",
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
              </span>
              {tab.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
