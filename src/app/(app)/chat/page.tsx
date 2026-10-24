"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { formatTime } from "@/lib/format";
import type { ConversationItem } from "@/lib/types";
import { CircleAvatar } from "@/components/avatar-ring";
import { Banner, EmptyState, Spinner } from "@/components/ui";

export default function ChatListPage() {
  const [items, setItems] = useState<ConversationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: ConversationItem[] }>("/api/conversations")
      .then((data) => setItems(data.items))
      .catch((cause) => {
        setError(errorMessage(cause));
        setItems([]);
      });
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight text-slate-800">消息</h1>
        <p className="mt-1.5 text-[13px] text-slate-500">只有好友之间才能发送消息</p>
      </header>

      {error ? <Banner>{error}</Banner> : null}

      {!items ? (
        <div className="flex justify-center py-16 text-brand">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare size={30} strokeWidth={1.5} />}
          title="还没有会话"
          description="成为好友后，聊天入口会自动出现在这里。"
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/chat/${item.id}`}
              className="card flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.995]"
            >
              <CircleAvatar name={item.partner.nickname} src={item.partner.avatarUrl} size={46} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[14px] font-semibold text-slate-800">
                    {item.partner.nickname}
                  </p>
                  <span className="shrink-0 text-[10.5px] text-slate-400">
                    {item.lastMessage ? formatTime(item.lastMessage.createdAt) : ""}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] text-slate-500">
                    {item.closed
                      ? "会话已关闭"
                      : item.lastMessage
                        ? `${item.lastMessage.mine ? "我：" : ""}${item.lastMessage.content}`
                        : "打个招呼吧"}
                  </p>
                  {item.unreadCount > 0 ? (
                    <span className="grid min-w-[18px] shrink-0 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {item.unreadCount > 99 ? "99+" : item.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
