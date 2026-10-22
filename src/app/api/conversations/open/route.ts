import { z } from "zod";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { openConversation } from "@/server/services/chat-service";

export const dynamic = "force-dynamic";

const openSchema = z.object({ partnerId: z.string().uuid() });

export const POST = route(async (request) => {
  const user = await requireUser();
  const { partnerId } = await parseBody(request, openSchema);
  const result = await openConversation(user, partnerId);
  return ok(result);
});
