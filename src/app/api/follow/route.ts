import { socialActionSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { blockUser, followUser, unblockUser, unfollowUser } from "@/server/services/social-service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, socialActionSchema);

  switch (input.action) {
    case "follow": {
      const result = await followUser(user, input.targetUserId);
      return ok(result);
    }
    case "unfollow": {
      const result = await unfollowUser(user, input.targetUserId);
      return ok(result);
    }
    case "block": {
      const result = await blockUser(user, input.targetUserId);
      return ok(result);
    }
    case "unblock": {
      const result = await unblockUser(user, input.targetUserId);
      return ok(result);
    }
  }
});
