import { requireUser } from "@/server/auth";
import { ok, route } from "@/server/http";
import {
  listBlocked,
  listFollowing,
  listFollowers,
  listFriends,
} from "@/server/services/social-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const [friends, following, followers, blocked] = await Promise.all([
    listFriends(user),
    listFollowing(user),
    listFollowers(user),
    listBlocked(user),
  ]);
  return ok({ friends, following, followers, blocked });
});
