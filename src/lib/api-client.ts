import { AppError } from "@/lib/errors";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : "The request could not be completed.";
    throw new AppError(response.status, message);
  }
  return payload as T;
}

export function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export async function downloadApiFile(path: string) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const payload: unknown = contentType.includes("application/json") ? await response.json() : await response.text();
    const message = typeof payload === "object" && payload !== null && "error" in payload ? String(payload.error) : "The download could not be created.";
    throw new AppError(response.status, message);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  const disposition = response.headers.get("content-disposition") ?? "";
  const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "download";
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
