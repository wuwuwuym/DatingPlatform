import { requireUser } from "@/server/auth";
import { ok, route } from "@/server/http";
import { getMyProfile } from "@/server/services/profile-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const profile = await getMyProfile(user.id);
  return ok({ achievements: profile.achievements });
});
