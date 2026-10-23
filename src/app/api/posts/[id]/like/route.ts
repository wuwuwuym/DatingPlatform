import { likeSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { setLike } from "@/server/services/circle-service";

export const dynamic = "force-dynamic";

type ParamsContext = { params: Promise<{ id: string }> };

export const POST = route<ParamsContext>(async (request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const { liked } = await parseBody(request, likeSchema);
  const result = await setLike(user, id, liked);
  return ok(result);
});
