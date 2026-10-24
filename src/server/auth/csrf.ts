import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";

export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const env = getEnv();
  const origin = request.headers.get("origin");
  if (!origin) {
    if (env.nodeEnv === "production") throw new AppError(403, "Request origin is required.");
    return;
  }
  const allowed = new URL(env.appBaseUrl).origin;
  let incoming: string;
  try {
    incoming = new URL(origin).origin;
  } catch {
    throw new AppError(403, "Invalid request origin.");
  }
  if (incoming !== allowed && env.nodeEnv === "production") {
    throw new AppError(403, "Invalid request origin.");
  }
}
