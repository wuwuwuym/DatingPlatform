import { messageSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { listMessages, sendMessage } from "@/server/services/chat-service";

export const dynamic = "force-dynamic";

type ParamsContext = { params: Promise<{ id: string }> };

export const GET = route<ParamsContext>(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const url = new URL(request.url);
  const after = url.searchParams.get("after") ?? undefined;
  const messages = await listMessages(user, id, { after });
  return ok({ messages });
});

export const POST = route<ParamsContext>(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const { content } = await parseBody(request, messageSchema);
  const message = await sendMessage(user, id, content);
  return ok({ message }, 201);
});
