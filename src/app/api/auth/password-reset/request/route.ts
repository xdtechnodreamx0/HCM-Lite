import { z } from "zod";
import { json, readJson, withApi } from "@/server/http";
import { requestPasswordReset } from "@/server/services/email.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = z.object({ email: z.email().trim().toLowerCase() }).strict().parse(await readJson<unknown>(currentRequest));
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await requestPasswordReset(input.email, address));
  });
}
