import { getSessionUser } from "@/server/auth";
import { ok, route } from "@/server/http";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return ok({ user: null });
  return ok({
    user: {
      id: user.id,
      nickname: user.nickname,
      status: user.status,
      role: user.role,
      schoolName: user.schoolName,
      avatarUrl: user.avatarUrl,
    },
  });
});
