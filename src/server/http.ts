import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

function failure(status: number, code: string, message: string, details?: unknown): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message, details } }, { status });
}

function isPgError(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return failure(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    const issue = error.issues[0];
    return failure(400, "VALIDATION_ERROR", issue?.message ?? "提交的数据格式不正确");
  }

  if (isPgError(error)) {
    if (error.code === "23505") {
      return failure(409, "DUPLICATE", "该记录已存在");
    }
    if (error.code === "42501") {
      return failure(403, "FORBIDDEN", "没有权限执行该操作");
    }
    // Surface business errors raised by plpgsql guards, never raw SQL text.
    if (error.code === "P0001" && /^[A-Z_]+$/.test(error.message)) {
      return failure(400, error.message, "当前资料还不满足条件");
    }
  }

  console.error("[api] unhandled error:", error);
  return failure(500, "INTERNAL", "服务器开小差了，请稍后再试");
}

export type RouteContext = Record<string, string | string[]>;

export function route<C>(
  handler: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "请求体不是合法的 JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, "VALIDATION_ERROR", issue?.message ?? "提交的数据格式不正确");
  }
  return parsed.data;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

export function assertRateLimit(
  result: { allowed: boolean; retryAfterSeconds: number },
  message: string,
): void {
  if (!result.allowed) {
    throw new ApiError(429, "RATE_LIMITED", message, {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}
