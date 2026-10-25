import { requireUser } from "@/server/auth";
import { route, toErrorResponse } from "@/server/http";
import { listMessageNotifications } from "@/server/services/chat-service";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 1_500;

function parseCursor(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/**
 * Streams messages from every conversation the current user belongs to.
 * The chat room has its own per-conversation stream; this one powers the
 * global in-app notification toast while the user is anywhere else.
 */
export const GET = route(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  let cursor = parseCursor(url.searchParams.get("after"));
  const sent = new Set<string>();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      request.signal.addEventListener("abort", close);
      controller.enqueue(encoder.encode("retry: 3000\n\n"));

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        while (!closed) {
          const notifications = await listMessageNotifications(user, cursor);
          for (const notification of notifications) {
            if (sent.has(notification.message.id)) continue;
            sent.add(notification.message.id);
            send("message", notification);
            if (notification.message.createdAt > cursor) {
              cursor = notification.message.createdAt;
            }
          }
          send("ping", { at: Date.now() });
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      } catch (error) {
        const response = toErrorResponse(error);
        send("error", { status: response.status, message: "消息通知暂不可用" });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});
