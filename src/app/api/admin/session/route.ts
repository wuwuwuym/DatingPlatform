import { adminLoginSchema } from "@/lib/validation";
import { clearAdminSession, requireAdmin, setAdminSession } from "@/server/auth";
import { clientIp, ok, parseBody, route } from "@/server/http";
import { assertRateLimit } from "@/server/http";
import { limiters } from "@/server/rate-limits";
import { adminLogin } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const admin = await requireAdmin();
  return ok({ admin: { id: admin.id, nickname: admin.nickname } });
});

export const POST = route(async (request) => {
  assertRateLimit(
    limiters.adminLogin.hit(`admin-login:${clientIp(request)}`),
    "尝试过于频繁，请稍后再试",
  );
  const { passcode } = await parseBody(request, adminLoginSchema);
  const { adminId } = await adminLogin(passcode);
  await setAdminSession(adminId);
  return ok({ signedIn: true });
});

export const DELETE = route(async () => {
  await clearAdminSession();
  return ok({ signedOut: true });
});
