import { ok, route } from "@/server/http";
import { listSchools } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok({ schools: await listSchools() }));
