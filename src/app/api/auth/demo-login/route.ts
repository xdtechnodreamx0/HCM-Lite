import { z } from "zod";
import { json, readJson, withApi } from "@/server/http";
import { demoLogin } from "@/server/services/demo.service";

const schema = z.object({ accountId: z.string().min(1).max(100) }).strict();

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = schema.parse(await readJson<unknown>(currentRequest));
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await demoLogin(input.accountId, address));
  });
}
