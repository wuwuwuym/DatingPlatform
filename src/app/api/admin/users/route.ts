import { adminBanSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { setUserBanned } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  await requireAdmin();
  const input = await parseBody(request, adminBanSchema);
  const result = await setUserBanned(input.userId, input.banned);
  return ok(result);
});
