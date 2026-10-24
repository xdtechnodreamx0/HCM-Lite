import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { changePassword } from "@/server/services/auth.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    requireApiUser(user);
    const input = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(100) }).parse(await readJson<unknown>(currentRequest));
    await changePassword(input.currentPassword, input.newPassword);
    return json({ changed: true });
  });
}
