import { requireUser } from "@/server/auth";
import { toErrorResponse, route } from "@/server/http";
import { listMessages } from "@/server/services/chat-service";

export const dynamic = "force-dynamic";

type ParamsContext = { params: Promise<{ id: string }> };

const POLL_INTERVAL_MS = 1_200;

/**
 * Server-sent events push new messages without depending on Supabase Realtime,
 * so the demo runs identically on PGlite and on Postgres.
 */
export const GET = route<ParamsContext>(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;

  const url = new URL(request.url);
  let cursor = url.searchParams.get("after") ?? new Date(Date.now() - 60_000).toISOString();
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
          const messages = await listMessages(user, id, { after: cursor, markRead: false });
          for (const message of messages) {
            if (sent.has(message.id)) continue;
            sent.add(message.id);
            send("message", message);
            if (message.createdAt > cursor) cursor = message.createdAt;
          }
          send("ping", { at: Date.now() });
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      } catch (error) {
        const response = toErrorResponse(error);
        send("error", { status: response.status, message: "会话不可用" });
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
