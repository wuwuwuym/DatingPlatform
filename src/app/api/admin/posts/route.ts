import { adminPostSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { listAdminPosts, moderatePost } from "@/server/services/circle-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  const posts = await listAdminPosts();
  return ok({ posts });
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = await parseBody(request, adminPostSchema);
  const result = await moderatePost(input.postId, input.action);
  return ok(result);
});
