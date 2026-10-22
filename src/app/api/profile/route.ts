import { profileUpdateSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { getMyProfile, updateMyProfile } from "@/server/services/profile-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  return ok({ profile: await getMyProfile(user.id) });
});

export const PUT = route(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, profileUpdateSchema);
  const result = await updateMyProfile(user, input);
  return ok(result);
});
