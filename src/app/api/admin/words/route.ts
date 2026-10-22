import { adminWordSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { addSensitiveWord, listSensitiveWords, removeSensitiveWord } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return ok({ words: await listSensitiveWords() });
});

export const POST = route(async (request) => {
  await requireAdmin();
  const { word } = await parseBody(request, adminWordSchema);
  return ok({ word: await addSensitiveWord(word) }, 201);
});

export const DELETE = route(async (request) => {
  await requireAdmin();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return ok({ deleted: false });
  return ok({ deleted: true, ...(await removeSensitiveWord(id)) });
});
