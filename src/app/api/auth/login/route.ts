import { loginSchema } from "@/lib/validation";
import { setUserSession } from "@/server/auth";
import { clientIp, ok, parseBody, route } from "@/server/http";
import { login } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const input = await parseBody(request, loginSchema);
  const { userId, status } = await login(input, clientIp(request));
  await setUserSession(userId);
  return ok({ userId, status });
});
