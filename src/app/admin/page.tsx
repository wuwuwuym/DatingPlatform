"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Eye, EyeOff, KeyRound, ShieldAlert, Trash2, X } from "lucide-react";
import { REPORT_TYPE_OPTIONS } from "@/lib/constants";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import type { AdminOverview, AdminPostItem, PostStatus, ReportItem } from "@/lib/types";
import { Badge, Banner, Button, Card, Field, Input, SectionTitle, Spinner, cn } from "@/components/ui";

interface WordRow {
  id: string;
  word: string;
}

interface CodeRow {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  createdAt: string;
  schoolName: string | null;
}

const POST_STATUS_LABEL: Record<PostStatus, string> = {
  published: "正常",
  hidden: "已隐藏",
  removed: "已删除",
};

type Tab = "reports" | "posts" | "words" | "codes";

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("reports");

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [posts, setPosts] = useState<AdminPostItem[]>([]);
  const [words, setWords] = useState<WordRow[]>([]);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [newWord, setNewWord] = useState("");
  const [codeMaxUses, setCodeMaxUses] = useState(1);
  const [generated, setGenerated] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [state, reportData, postData, wordData, codeData] = await Promise.all([
      api<{ overview: AdminOverview; words: WordRow[] }>("/api/admin/overview"),
      api<{ reports: ReportItem[] }>("/api/admin/reports"),
      api<{ posts: AdminPostItem[] }>("/api/admin/posts"),
      api<{ words: WordRow[] }>("/api/admin/words"),
      api<{ codes: CodeRow[] }>("/api/admin/codes"),
    ]);
    setOverview(state.overview);
    setWords(wordData.words);
    setReports(reportData.reports);
    setPosts(postData.posts);
    setCodes(codeData.codes);
  }, []);

  useEffect(() => {
    api("/api/admin/session")
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadAll().catch((cause) => setError(errorMessage(cause)));
  }, [authed, loadAll]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/session", { body: { passcode } });
      setAuthed(true);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError && cause.code === "RATE_LIMITED"
          ? "尝试过于频繁，请稍后再试"
          : errorMessage(cause),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleReport(report: ReportItem, status: "resolved" | "dismissed") {
    setBusy(true);
    try {
      await api("/api/admin/reports", { body: { reportId: report.id, status } });
      await loadAll();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function ban(report: ReportItem) {
    setBusy(true);
    try {
      await api("/api/admin/users", {
        body: { userId: report.target.id, banned: report.target.status !== "banned" },
      });
      await loadAll();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function moderatePost(postId: string, action: "hide" | "restore" | "remove") {
    setBusy(true);
    try {
      await api("/api/admin/posts", { body: { postId, action } });
      await loadAll();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function addWord() {    if (!newWord.trim()) return;
    setBusy(true);
    try {
      await api("/api/admin/words", { body: { word: newWord.trim() } });
      setNewWord("");
      await loadAll();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeWord(id: string) {
    setBusy(true);
    try {
      await api(`/api/admin/words?id=${id}`, { method: "DELETE" });
      await loadAll();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function generateCodes() {
    setBusy(true);
    try {
      const result = await api<{ codes: { code: string }[] }>("/api/admin/codes", {
        body: { count: 3, maxUses: codeMaxUses },
      });
      setGenerated(result.codes.map((item) => item.code));
      await loadAll();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="text-brand" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col justify-center px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">admin console</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight">管理后台</h1>
        <p className="mt-2 text-[12.5px] leading-6 text-muted">
          输入管理口令进入。演示环境口令由本地 .data/dev-secrets.json 生成，可用
          <code className="mx-1 rounded bg-black/[0.05] px-1 py-0.5 text-[11px]">pnpm admin:passcode</code>
          查看。
        </p>

        <form onSubmit={login} className="mt-6 space-y-3">
          <Field label="管理口令">
            <Input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="输入口令"
              required
            />
          </Field>
          {error ? <Banner>{error}</Banner> : null}
          <Button type="submit" className="w-full" loading={busy}>
            进入后台
          </Button>
        </form>

        <Link href="/" className="mt-6 text-center text-[12px] text-muted">
          返回首页
        </Link>
      </div>
    );
  }

  const stats = [
    { label: "注册用户", value: overview?.users ?? 0 },
    { label: "匹配池", value: overview?.matchable ?? 0 },
    { label: "今日动态", value: overview?.postsToday ?? 0 },
    { label: "今日消息", value: overview?.messagesToday ?? 0 },
    { label: "今日打卡", value: overview?.checkinsToday ?? 0 },
    { label: "待处理举报", value: overview?.pendingReports ?? 0 },
    { label: "封禁账号", value: overview?.banned ?? 0 },
  ];

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted">admin console</p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight">举报与社区治理</h1>
        </div>
        <Link href="/match" className="text-[12px] text-muted">
          返回应用
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {stats.map((item) => (
          <div key={item.label} className="card px-4 py-3">
            <p className="text-[20px] font-semibold text-ink">{item.value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-1 rounded-2xl bg-black/[0.035] p-1">
        {(
          [
            { key: "reports", label: "举报处理", count: reports.filter((r) => r.status === "pending").length },
            { key: "posts", label: "校园圈", count: posts.length },
            { key: "words", label: "敏感词", count: words.length },
            { key: "codes", label: "核验码", count: codes.length },
          ] as { key: Tab; label: string; count: number }[]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "flex-1 rounded-xl py-2 text-[12.5px] transition",
              tab === item.key ? "bg-surface font-medium text-ink shadow-sm" : "text-muted",
            )}
          >
            {item.label}
            <span className="ml-1 text-[11px] opacity-60">{item.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4">
          <Banner>{error}</Banner>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {tab === "reports" ? (
          reports.length === 0 ? (
            <Card className="text-center text-[12.5px] text-muted">暂无举报记录</Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={report.status === "pending" ? "accent" : "mint"}>
                      {report.status === "pending" ? "待处理" : report.status === "resolved" ? "已处理" : "已忽略"}
                    </Badge>
                    <Badge>
                      {REPORT_TYPE_OPTIONS.find((option) => option.value === report.type)?.label ??
                        report.type}
                    </Badge>
                    <span className="text-[11px] text-muted">{formatTime(report.createdAt)}</span>
                  </div>
                  <span className="text-[11px] text-muted">
                    {report.reporter.nickname} →{" "}
                    {report.target.kind === "post"
                      ? `动态：${report.target.excerpt}`
                      : report.target.nickname}
                  </span>
                </div>

                {report.description ? (
                  <p className="rounded-xl bg-black/[0.03] px-3 py-2 text-[12.5px] leading-5 text-ink-soft">
                    {report.description}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="px-3 py-2 text-[12px]"
                    disabled={busy || report.status === "resolved"}
                    onClick={() => handleReport(report, "resolved")}
                  >
                    <Check size={13} /> 标记已处理
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-3 py-2 text-[12px]"
                    disabled={busy || report.status === "dismissed"}
                    onClick={() => handleReport(report, "dismissed")}
                  >
                    <X size={13} /> 忽略
                  </Button>
                  {report.target.kind === "post" ? (
                    <>
                      <Button
                        variant="secondary"
                        className="px-3 py-2 text-[12px]"
                        disabled={busy}
                        onClick={() =>
                          moderatePost(
                            report.target.id,
                            report.target.status === "hidden" ? "restore" : "hide",
                          )
                        }
                      >
                        {report.target.status === "hidden" ? (
                          <>
                            <Eye size={13} /> 恢复展示
                          </>
                        ) : (
                          <>
                            <EyeOff size={13} /> 隐藏动态
                          </>
                        )}
                      </Button>
                      <Button
                        variant="danger"
                        className="px-3 py-2 text-[12px]"
                        disabled={busy}
                        onClick={() => moderatePost(report.target.id, "remove")}
                      >
                        <Trash2 size={13} /> 删除动态
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      className="px-3 py-2 text-[12px]"
                      disabled={busy}
                      onClick={() => ban(report)}
                    >
                      <Ban size={13} />{" "}
                      {report.target.status === "banned" ? "解除封禁" : "封禁用户"}
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )
        ) : tab === "posts" ? (
          posts.length === 0 ? (
            <Card className="text-center text-[12.5px] text-muted">校园圈还没有动态</Card>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <Card key={post.id} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={post.status === "published" ? "mint" : "accent"}>
                        {POST_STATUS_LABEL[post.status]}
                      </Badge>
                      <span className="text-[12px] text-ink-soft">{post.author.nickname}</span>
                      <span className="text-[11px] text-muted">{formatTime(post.createdAt)}</span>
                    </div>
                    <span className="text-[11px] text-muted">
                      {post.media.length} 媒体 · {post.likeCount} 赞 · {post.commentCount} 评论
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap break-words rounded-xl bg-black/[0.03] px-3 py-2 text-[12.5px] leading-5 text-ink-soft">
                    {post.body || "（无文字内容）"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {post.status === "published" ? (
                      <Button
                        variant="secondary"
                        className="px-3 py-2 text-[12px]"
                        disabled={busy}
                        onClick={() => moderatePost(post.id, "hide")}
                      >
                        <EyeOff size={13} /> 隐藏
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="px-3 py-2 text-[12px]"
                        disabled={busy}
                        onClick={() => moderatePost(post.id, "restore")}
                      >
                        <Eye size={13} /> 恢复展示
                      </Button>
                    )}
                    <Button
                      variant="danger"
                      className="px-3 py-2 text-[12px]"
                      disabled={busy || post.status === "removed"}
                      onClick={() => moderatePost(post.id, "remove")}
                    >
                      <Trash2 size={13} /> 删除
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : tab === "words" ? (
          <Card className="space-y-4">
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <ShieldAlert size={15} /> 敏感词维护
              </span>
            </SectionTitle>
            <div className="flex gap-2">
              <Input
                value={newWord}
                onChange={(event) => setNewWord(event.target.value)}
                placeholder="添加关键词，例如 代考"
                maxLength={32}
              />
              <Button className="shrink-0 px-4" loading={busy} onClick={addWord}>
                添加
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {words.map((word) => (
                <span
                  key={word.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-[12px] text-ink-soft"
                >
                  {word.word}
                  <button type="button" onClick={() => removeWord(word.id)} aria-label="删除">
                    <Trash2 size={12} className="text-muted hover:text-accent" />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-[11px] leading-5 text-muted">
              匹配前会统一做全角转半角、去除空格与标点，因此「代 考」「代-考」同样会被拦截。
            </p>
          </Card>
        ) : (
          <Card className="space-y-4">
            <SectionTitle>
              <span className="inline-flex items-center gap-1.5">
                <KeyRound size={15} /> 演示核验码
              </span>
            </SectionTitle>
            <div className="flex items-end gap-2">
              <Field label="每个码可用次数">
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={codeMaxUses}
                  onChange={(event) => setCodeMaxUses(Number(event.target.value) || 1)}
                />
              </Field>
              <Button className="shrink-0 px-4" loading={busy} onClick={generateCodes}>
                生成 3 个
              </Button>
            </div>

            {generated.length > 0 ? (
              <Banner tone="success">
                新生成：{generated.join("、")}（请立即记录，列表中仅保留最近 50 条）
              </Banner>
            ) : null}

            <div className="space-y-2">
              {codes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2"
                >
                  <span className="font-mono text-[12.5px] text-ink">{code.code}</span>
                  <span className="text-[11px] text-muted">
                    {code.schoolName ?? "全部学校"} · {code.usedCount}/{code.maxUses}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
