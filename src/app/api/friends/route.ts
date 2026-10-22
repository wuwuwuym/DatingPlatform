import { requireUser } from "@/server/auth";
import { ok, route } from "@/server/http";
import { listFollowing, listFollowers, listFriends } from "@/server/services/social-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const [friends, following, followers] = await Promise.all([
    listFriends(user),
    listFollowing(user),
    listFollowers(user),
  ]);
  return ok({ friends, following, followers });
});
