"use client";

import { MotionConfig, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Discover } from "@/components/landing/discover";
import { Hero } from "@/components/landing/hero";
import { Interests } from "@/components/landing/interests";
import { MobileTabBar } from "@/components/landing/mobile-tab-bar";
import { PrivacySheet } from "@/components/landing/privacy-sheet";
import { ProfileSheet } from "@/components/landing/profile-sheet";
import { ReportSheet } from "@/components/landing/report-sheet";
import { Safety, type PrivacyState } from "@/components/landing/safety";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Toast } from "@/components/landing/toast";
import { api, errorMessage } from "@/lib/api-client";
import { INTEREST_TAGS, type Student } from "@/lib/landing-data";
import type { ReportType } from "@/lib/types";

const DEFAULT_PRIVACY: PrivacyState = { discoverable: true, showOnline: true };

const REPORT_TYPES: Record<string, ReportType> = {
  harassment: "harassment",
  fake: "fake_identity",
  content: "inappropriate",
  other: "other",
};

type ReportTarget = Student | "general" | null;

export function LandingPage({
  signedIn,
  destination,
  students: initialStudents,
  mode,
}: {
  signedIn: boolean;
  destination: string;
  students: Student[];
  mode: "demo" | "live";
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const live = mode === "live";
  const canUseBackend = signedIn && live;

  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [profile, setProfile] = useState<Student | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [privacy, setPrivacy] = useState<PrivacyState>(DEFAULT_PRIVACY);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [friendId, setFriendId] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("tongpin-privacy-demo");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PrivacyState>;
        setPrivacy({
          discoverable: parsed.discoverable ?? true,
          showOnline: parsed.showOnline ?? true,
        });
      }
    } catch {
      // A blocked storage API should never block the page.
    }
    setPrivacyLoaded(true);
  }, []);

  useEffect(() => {
    if (!privacyLoaded) return;
    try {
      window.localStorage.setItem("tongpin-privacy-demo", JSON.stringify(privacy));
    } catch {
      // Ignore private-mode storage failures.
    }
  }, [privacy, privacyLoaded]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const matchCount = students.filter((student) =>
    selectedTags.some((tag) => student.interests.includes(tag)),
  ).length;

  function scrollToDiscover() {
    document.getElementById("discover")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }

  function handleSearch() {
    scrollToDiscover();
  }

  function handleStartMatch() {
    router.push(destination);
  }

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function clearAllFilters() {
    setQuery("");
    setSelectedTags([]);
  }

  function openProfile(student: Student) {
    setProfile(student);
  }

  function openReport(student?: Student) {
    setProfile(null);
    setPrivacyOpen(false);
    setReportTarget(student ?? "general");
  }

  function openPrivacy() {
    setProfile(null);
    setPrivacyOpen(true);
  }

  function requireAccount(): boolean {
    if (canUseBackend) return true;
    router.push(destination);
    return false;
  }

  function markFollowing(student: Student) {
    setStudents((list) =>
      list.map((item) => (item.id === student.id ? { ...item, following: true } : item)),
    );
    setProfile((current) =>
      current && current.id === student.id ? { ...current, following: true } : current,
    );
  }

  async function follow(student: Student) {
    if (!requireAccount()) return;
    if (student.following) {
      setToast("你已关注 TA，等对方回关就可以聊天了。");
      return;
    }

    setBusyId(student.id);
    try {
      const result = await api<{ friend: boolean; following: boolean }>("/api/follow", {
        body: { targetUserId: student.id, action: "follow" },
      });
      markFollowing(student);
      if (result.friend) {
        setFriendId(student.id);
        setToast("你们互相关注了，可以开始聊天。");
      } else {
        setToast(`已关注 ${student.name}，等对方回关就可以聊天。`);
      }
    } catch (cause) {
      setToast(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  async function openChat(student: Student) {
    setBusyId(student.id);
    try {
      const { id } = await api<{ id: string }>("/api/conversations/open", {
        body: { partnerId: student.id },
      });
      setProfile(null);
      router.push(`/chat/${id}`);
    } catch (cause) {
      setToast(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  function sayHi(student: Student) {
    if (!requireAccount()) return;
    if (friendId === student.id) {
      void openChat(student);
      return;
    }
    if (student.following) {
      setToast(`已关注 ${student.name}，等对方回关就会解锁聊天。`);
      return;
    }
    setToast("先关注 TA，互相关注后就能聊天。");
  }

  function handlePrimary() {
    const student = profile;
    if (!student) return;
    if (canUseBackend && friendId === student.id) {
      void openChat(student);
      return;
    }
    void follow(student);
  }

  async function submitReport(reason: string, detail: string) {
    const target = reportTarget;
    if (!target || target === "general" || !canUseBackend) return;
    await api("/api/report", {
      body: {
        targetUserId: target.id,
        type: REPORT_TYPES[reason] ?? "other",
        description: detail,
      },
    });
  }

  function primaryLabel(student: Student): string {
    if (!signedIn) return "登录后关注";
    if (!canUseBackend) return "完善资料后关注";
    if (friendId === student.id) return "去聊天";
    if (student.following) return "已关注";
    return "关注 TA";
  }

  const reportDemo = !canUseBackend || reportTarget === "general";

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh overflow-x-clip bg-canvas">
        <SiteHeader signedIn={signedIn} destination={destination} />

        <main>
          <Hero
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            onStartMatch={handleStartMatch}
            featured={students[0] ?? null}
            live={live}
          />

          <Discover
            students={students}
            query={query}
            selectedTags={selectedTags}
            mode={mode}
            onRemoveTag={toggleTag}
            onClearAll={clearAllFilters}
            onOpen={openProfile}
            onReport={(student) => openReport(student)}
            onPrivacy={openPrivacy}
          />

          <Interests
            tags={INTEREST_TAGS}
            selectedTags={selectedTags}
            matchCount={matchCount}
            onToggle={toggleTag}
            onClear={() => setSelectedTags([])}
            onViewMatches={scrollToDiscover}
          />

          <Safety privacy={privacy} onPrivacyChange={setPrivacy} onReport={() => openReport()} />
        </main>

        <SiteFooter />
        <MobileTabBar />

        <ProfileSheet
          student={profile}
          primaryLabel={profile ? primaryLabel(profile) : "关注 TA"}
          primaryBusy={Boolean(profile && busyId === profile.id)}
          onClose={() => setProfile(null)}
          onPrimary={handlePrimary}
          onMessage={() => profile && sayHi(profile)}
          onReport={(student) => openReport(student)}
          onPrivacy={openPrivacy}
        />

        <PrivacySheet
          open={privacyOpen}
          privacy={privacy}
          onChange={setPrivacy}
          onClose={() => setPrivacyOpen(false)}
          onReport={() => openReport()}
        />

        <ReportSheet
          open={Boolean(reportTarget)}
          targetName={reportTarget === "general" ? "平台安全问题" : (reportTarget?.name ?? "")}
          demo={reportDemo}
          onSubmit={submitReport}
          onClose={() => setReportTarget(null)}
        />

        <Toast message={toast} />
      </div>
    </MotionConfig>
  );
}
