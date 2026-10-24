import { z } from "zod";
import { json, readJson, withApi } from "@/server/http";
import { verifyEmailToken } from "@/server/services/email.service";

const schema = z.object({ token: z.string().min(24).max(200) }).strict();

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const { token } = schema.parse(await readJson<unknown>(currentRequest));
    return json(await verifyEmailToken(token));
  });
}
