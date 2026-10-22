import { clearUserSession } from "@/server/auth";
import { ok, route } from "@/server/http";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await clearUserSession();
  return ok({ signedOut: true });
});
