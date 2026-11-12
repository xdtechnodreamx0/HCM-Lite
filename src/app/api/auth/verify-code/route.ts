import { z } from "zod";
import { json, readJson, withApi } from "@/server/http";
import { verifyEmailCode } from "@/server/services/email.service";

const schema = z.object({
  email: z.email().trim().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
}).strict();

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = schema.parse(await readJson<unknown>(currentRequest));
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await verifyEmailCode(input.email, input.code, address));
  });
}
