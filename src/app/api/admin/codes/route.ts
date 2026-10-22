import { adminCodeSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth";
import { ok, parseBody, route } from "@/server/http";
import { createVerificationCodes, listVerificationCodes } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireAdmin();
  return ok({ codes: await listVerificationCodes() });
});

export const POST = route(async (request) => {
  await requireAdmin();
  const input = await parseBody(request, adminCodeSchema);
  const codes = await createVerificationCodes({
    count: input.count,
    maxUses: input.maxUses,
    schoolId: input.schoolId ?? null,
  });
  return ok({ codes }, 201);
});
