import { requireUser } from "@/server/auth";
import { ok, route } from "@/server/http";
import { getRecommendations } from "@/server/services/match-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser();
  const items = await getRecommendations(user);
  return ok({ items, count: items.length });
});
