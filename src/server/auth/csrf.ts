import { AppError } from "@/lib/errors";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

/**
 * The public origin of this request as seen by the browser. Vercel (and most
 * reverse proxies) forward the original host and scheme in these headers, so a
 * deployment alias or custom domain does not need to be duplicated in env.
 */
export function getRequestOrigin(request: Request): string | null {
  const url = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host")) ??
    url.host;
  const protocol =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ??
    url.protocol.replace(":", "");
  if (!host || (protocol !== "http" && protocol !== "https")) return null;
  return `${protocol}://${host}`;
}

export function getAllowedOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin) origins.add(requestOrigin);
  const configured = normalizeOrigin(process.env.APP_BASE_URL);
  if (configured) origins.add(configured);
  return origins;
}

export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") throw new AppError(403, "Request origin is required.");
    return;
  }
  const incoming = normalizeOrigin(origin);
  if (!incoming) throw new AppError(403, "Invalid request origin.");
  if (getAllowedOrigins(request).has(incoming)) return;
  // Local development often switches between localhost, 127.0.0.1 and a LAN
  // address; production must match exactly.
  if (process.env.NODE_ENV !== "production") return;
  throw new AppError(403, "Invalid request origin.");
}
