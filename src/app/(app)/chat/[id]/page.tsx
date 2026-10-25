"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, Flag, Send, ShieldCheck } from "lucide-react";
import { zodiacLabel } from "@/lib/constants";
import { api, errorMessage } from "@/lib/api-client";
import { mergeMessages } from "@/lib/chat/merge";
import { formatClock } from "@/lib/format";
import type { ConversationItem, MessageItem } from "@/lib/types";
import { ChatPrivacyDialog } from "@/components/chat-privacy-dialog";
import { ReportDialog } from "@/components/report-dialog";
import { CircleAvatar } from "@/components/avatar-ring";
import { Banner, Spinner, cn } from "@/components/ui";

export default function ChatRoomPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const reduce = useReducedMotion();

  const [messages, setMessages] = useState<MessageItem[] | null>(null);
  const [partner, setPartner] = useState<ConversationItem["partner"] | null>(null);
  const [closed, setClosed] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [live, setLive] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string>>(new Set());
  const newIds = useRef<Set<string>>(new Set());

  const append = useCallback((incoming: MessageItem[]) => {
    // Dedupe before scheduling the update. Mutating `seen` inside the updater
    // makes the second StrictMode pass skip the message and drop it.
    const fresh = incoming.filter((message) => !seen.current.has(message.id));
    if (fresh.length === 0) return;

    for (const message of fresh) {
      seen.current.add(message.id);
      newIds.current.add(message.id);
    }
    setMessages((current) => mergeMessages(current ?? [], fresh));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    seen.current.clear();
    newIds.current.clear();

    Promise.all([
      api<{ items: ConversationItem[] }>("/api/conversations"),
      api<{ messages: MessageItem[] }>(`/api/conversations/${conversationId}/messages`),
    ])
      .then(([conversations, history]) => {
        if (cancelled) return;
        const conversation = conversations.items.find((item) => item.id === conversationId);
        setPartner(conversation?.partner ?? null);
        setClosed(conversation?.closed ?? false);
        for (const message of history.messages) seen.current.add(message.id);
        setMessages(history.messages);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(errorMessage(cause));
        setMessages([]);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!messages) return;
    const last = messages.at(-1);
    const after = last ? last.createdAt : new Date(Date.now() - 60_000).toISOString();
    const source = new EventSource(
      `/api/conversations/${conversationId}/stream?after=${encodeURIComponent(after)}`,
    );

    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as MessageItem;
        append([message]);
      } catch {
        // ignore malformed frames
      }
    };

    return () => {
      source.close();
      setLive(false);
    };
    // Reconnect only when the conversation changes, not on every message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages !== null]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await api<{ message: MessageItem }>(
        `/api/conversations/${conversationId}/messages`,
        { body: { content } },
      );
      append([result.message]);
      setText("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pb-36">
      <header className="sticky top-0 z-10 -mx-[18px] bg-white/80 px-[18px] py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link
            href="/chat"
            className="grid size-10 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="返回消息列表"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </Link>
          {partner ? (
            <>
              <CircleAvatar name={partner.nickname} src={partner.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-slate-800">
                  {partner.nickname}
                </p>
                <p className="truncate text-[10.5px] text-slate-500">
                  {[partner.mbti, zodiacLabel(partner.zodiac), partner.department]
                    .filter(Boolean)
                    .join(" · ")}
                  {live ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-600">
                      <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                      实时
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                aria-label="聊天隐私与安全"
                onClick={() => setShowPrivacy(true)}
                className="grid size-10 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
              >
                <ShieldCheck size={16} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label="举报"
                onClick={() => setShowReport(true)}
                className="grid size-10 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
              >
                <Flag size={15} strokeWidth={1.5} />
              </button>
            </>
          ) : (
            <span className="text-[14px] font-semibold text-slate-800">会话</span>
          )}
        </div>
      </header>

      {error ? (
        <div className="pt-3">
          <Banner>{error}</Banner>
        </div>
      ) : null}

      <div className="space-y-3.5 pt-4">
        {!messages ? (
          <div className="flex justify-center py-16 text-brand">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-[12.5px] text-slate-500">
            会话已建立，发条消息打个招呼吧。
          </p>
        ) : (
          messages.map((message) => {
            const isNew = newIds.current.has(message.id);
            return (
              <motion.div
                key={message.id}
                initial={!reduce && isNew ? { opacity: 0, y: 16, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.7 }}
                className={cn(
                  "flex items-end gap-2",
                  message.mine ? "justify-end" : "justify-start",
                )}
              >
                {!message.mine ? (
                  <CircleAvatar
                    name={partner?.nickname ?? "同学"}
                    src={partner?.avatarUrl}
                    size={30}
                    className="mb-1"
                  />
                ) : null}
                <div
                  className={cn(
                    "max-w-[78%] px-3.5 py-2.5 text-[13.5px] leading-6",
                    message.mine
                      ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_8px_20px_-12px_rgba(99,102,241,0.5)]"
                      : "rounded-2xl rounded-bl-sm bg-white text-slate-700 shadow-[0_4px_20px_rgb(0,0,0,0.04)]",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[9.5px]",
                      message.mine ? "text-white/60" : "text-slate-400",
                    )}
                  >
                    {formatClock(message.createdAt)}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div className="h-40" aria-hidden="true" />
        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-[72px] z-20">
        <div className="mx-auto max-w-[460px] px-[18px]">
          {closed ? (
            <div className="rounded-full bg-white/70 px-4 py-3 text-center text-[12px] text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl">
              会话已关闭（好友关系解除或账号受限）
            </div>
          ) : (
            <div className="flex items-end gap-2 rounded-full border border-white/70 bg-white/70 p-1.5 pl-4 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-xl transition-shadow focus-within:ring-4 focus-within:ring-indigo-500/10">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                maxLength={500}
                placeholder="说点什么…"
                aria-label="消息内容"
                className="max-h-24 flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-6 text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!text.trim() || sending}
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-full transition-all duration-200 active:scale-95",
                  text.trim() && !sending
                    ? "bg-brand text-white shadow-lg shadow-indigo-500/25"
                    : "bg-slate-200 text-slate-400",
                )}
                aria-label="发送"
              >
                {sending ? (
                  <Spinner className="size-4" />
                ) : (
                  <Send size={16} strokeWidth={1.5} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <ChatPrivacyDialog
        open={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        onReport={() => {
          setShowPrivacy(false);
          setShowReport(true);
        }}
      />

      {showReport && partner ? (
        <ReportDialog
          targetUserId={partner.id}
          targetName={partner.nickname}
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </div>
  );
}
