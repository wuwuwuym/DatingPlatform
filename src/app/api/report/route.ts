import { reportSchema } from "@/lib/validation";
import { requireUser } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { createReport } from "@/server/services/report-service";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, reportSchema);
  const result = await createReport(user, input);
  return ok(result, 201);
});
