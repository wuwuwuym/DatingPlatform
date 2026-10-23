import { requireUser } from "@/server/auth";
import { ok, route } from "@/server/http";
import { removeComment } from "@/server/services/circle-service";

export const dynamic = "force-dynamic";

type ParamsContext = { params: Promise<{ id: string; commentId: string }> };

export const DELETE = route<ParamsContext>(async (_request, context) => {
  const user = await requireUser();
  const { id, commentId } = await context.params;
  const result = await removeComment(user, id, commentId);
  return ok(result);
});
