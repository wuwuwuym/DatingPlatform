import { requireAdmin } from "@/server/auth";
import { ok, route } from "@/server/http";
import { getOverview, listSensitiveWords } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  const [overview, words] = await Promise.all([getOverview(), listSensitiveWords()]);
  return ok({ overview, words });
});
