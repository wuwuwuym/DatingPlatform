import { postSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { createPost, listFeed } from "@/server/services/circle-service";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const scope = url.searchParams.get("scope") === "following" ? "following" : "all";
  const feed = await listFeed(user, { cursor, scope });
  return ok(feed);
});

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, postSchema);
  const post = await createPost(user, input);
  return ok({ post }, 201);
});
