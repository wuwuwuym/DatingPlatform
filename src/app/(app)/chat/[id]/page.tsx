"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Flag, Send } from "lucide-react";
import { zodiacLabel } from "@/lib/constants";
import { api, errorMessage } from "@/lib/api-client";
import { formatClock } from "@/lib/format";
import type { ConversationItem, MessageItem } from "@/lib/types";
import { ReportDialog } from "@/components/report-dialog";
import { Avatar, Banner, Spinner, cn } from "@/components/ui";

export default function ChatRoomPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [messages, setMessages] = useState<MessageItem[] | null>(null);
  const [partner, setPartner] = useState<ConversationItem["partner"] | null>(null);
  const [closed, setClosed] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [live, setLive] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string>>(new Set());

  const append = useCallback((incoming: MessageItem[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const base = current ?? [];
      const merged = [...base];
      for (const message of incoming) {
        if (seen.current.has(message.id)) continue;
        seen.current.add(message.id);
        merged.push(message);
      }
      return merged;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMessages(null);
    seen.current.clear();

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
      <header className="sticky top-0 z-10 -mx-[18px] border-b border-line/70 bg-canvas/85 px-[18px] py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Link href="/chat" className="grid size-8 place-items-center rounded-xl text-muted">
            <ChevronLeft size={20} />
          </Link>
          {partner ? (
            <>
              <Avatar name={partner.nickname} src={partner.avatarUrl} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{partner.nickname}</p>
                <p className="truncate text-[10.5px] text-muted">
                  {[partner.mbti, zodiacLabel(partner.zodiac), partner.department]
                    .filter(Boolean)
                    .join(" · ")}
                  {live ? " · 实时" : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="举报"
                onClick={() => setShowReport(true)}
                className="grid size-8 place-items-center rounded-xl text-muted"
              >
                <Flag size={15} />
              </button>
            </>
          ) : (
            <span className="text-[14px] font-medium text-ink">会话</span>
          )}
        </div>
      </header>

      {error ? (
        <div className="pt-3">
          <Banner>{error}</Banner>
        </div>
      ) : null}

      <div className="space-y-3 pt-4">
        {!messages ? (
          <div className="flex justify-center py-16 text-brand">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-16 text-center text-[12.5px] text-muted">
            会话已建立，发条消息打个招呼吧。
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-6",
                  message.mine
                    ? "rounded-br-md bg-brand text-white"
                    : "rounded-bl-md border border-line bg-surface text-ink",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <p
                  className={cn(
                    "mt-1 text-right text-[9.5px]",
                    message.mine ? "text-white/60" : "text-muted",
                  )}
                >
                  {formatClock(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="fixed inset-x-0 bottom-[72px] z-20">
        <div className="mx-auto max-w-[460px] px-[18px]">
          {closed ? (
            <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-center text-[12px] text-muted">
              会话已关闭（好友关系解除或账号受限）
            </div>
          ) : (
            <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface p-2 pl-4 shadow-[0_10px_30px_-18px_rgba(22,24,43,0.45)]">
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
                className="max-h-24 flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-6 outline-none placeholder:text-muted"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!text.trim() || sending}
                className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-white transition disabled:opacity-40"
                aria-label="发送"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

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
