import { requireUser } from "@/server/auth";
import { ok, route } from "@/server/http";
import { removePost } from "@/server/services/circle-service";

export const dynamic = "force-dynamic";

type ParamsContext = { params: Promise<{ id: string }> };

export const DELETE = route<ParamsContext>(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const result = await removePost(user, id);
  return ok(result);
});
