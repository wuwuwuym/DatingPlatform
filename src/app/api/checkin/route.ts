import { checkinSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { checkin } from "@/server/services/checkin-service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const user = await requireUser();
  const { friendId } = await parseBody(request, checkinSchema);
  const result = await checkin(user, friendId);
  return ok(result);
});
