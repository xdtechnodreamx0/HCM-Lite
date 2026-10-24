import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError } from "@/lib/errors";
import { assertSameOrigin } from "@/server/auth/csrf";
import { getRequestUser } from "@/server/auth/sessions";
import { secureHeaders } from "@/server/security/secure-headers";
import type { SessionUser } from "@/lib/types";

export function requireApiUser(user: SessionUser | null): SessionUser {
  if (!user) throw new AppError(401, "Please sign in.");
  return user;
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: secureHeaders() });
}

export function errorResponse(error: unknown) {
  if (isAppError(error)) {
    return json(
      { error: error.message, code: error.code, details: error.details },
      error.status,
    );
  }
  if (error instanceof ZodError) {
    return json({
      error: "Please check the submitted information.",
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    }, 422);
  }
  const kind = error instanceof Error ? error.name : "UnknownError";
  console.error(`API request failed: ${kind}`);
  return json({ error: "Something went wrong." }, 500);
}

export async function withApi(
  request: Request,
  handler: (ctx: { request: Request; user: SessionUser | null }) => Promise<Response>,
) {
  try {
    assertSameOrigin(request);
    const user = await getRequestUser();
    const path = new URL(request.url).pathname;
    const passwordChangePaths = new Set(["/api/auth/password", "/api/auth/logout", "/api/session"]);
    if (user?.forcePasswordChange && !passwordChangePaths.has(path)) {
      throw new (await import("@/lib/errors")).AppError(403, "Change your temporary password before continuing.", "PASSWORD_CHANGE_REQUIRED");
    }
    return await handler({ request, user });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new (await import("@/lib/errors")).AppError(400, "Invalid JSON body.");
  }
}
