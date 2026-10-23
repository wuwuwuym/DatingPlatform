import { commentSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { createComment, listComments } from "@/server/services/circle-service";

export const dynamic = "force-dynamic";

type ParamsContext = { params: Promise<{ id: string }> };

export const GET = route<ParamsContext>(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const comments = await listComments(user, id);
  return ok({ comments });
});

export const POST = route<ParamsContext>(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const input = await parseBody(request, commentSchema);
  const comment = await createComment(user, id, input);
  return ok({ comment }, 201);
});
