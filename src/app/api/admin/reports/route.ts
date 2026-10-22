import { adminReportUpdateSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { listReports, updateReportStatus } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  await requireAdmin();
  const status = new URL(request.url).searchParams.get("status");
  const allowed = ["pending", "resolved", "dismissed"] as const;
  const filter = allowed.find((value) => value === status);
  const reports = await listReports(filter);
  return ok({ reports });
});

export const POST = route(async (request) => {
  const admin = await requireAdmin();
  const input = await parseBody(request, adminReportUpdateSchema);
  const result = await updateReportStatus(admin, input.reportId, input.status);
  return ok(result);
});
