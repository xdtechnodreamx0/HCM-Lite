import { z } from "zod";
import { json, readJson, withApi } from "@/server/http";
import { resendEmailVerification } from "@/server/services/email.service";

const schema = z.object({ email: z.email().max(254) }).strict();

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const { email } = schema.parse(await readJson<unknown>(currentRequest));
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await resendEmailVerification(email, ip));
  });
}
