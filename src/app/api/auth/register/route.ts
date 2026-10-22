import { registerSchema } from "@/lib/validation";
import { setUserSession } from "@/server/auth";
import { clientIp, ok, parseBody, route } from "@/server/http";
import { register } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const input = await parseBody(request, registerSchema);
  const { userId } = await register(input, clientIp(request));
  await setUserSession(userId);
  return ok({ userId, status: "incomplete" }, 201);
});
