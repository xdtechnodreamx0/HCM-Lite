import { z } from "zod";
import { json, readJson, withApi } from "@/server/http";
import { completePasswordReset } from "@/server/services/email.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = z.object({ token: z.string().min(24).max(200), password: z.string().min(10).max(100) }).strict().parse(await readJson<unknown>(currentRequest));
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await completePasswordReset(input.token, input.password, address));
  });
}
