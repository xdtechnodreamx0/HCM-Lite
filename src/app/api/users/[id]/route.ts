import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { resetUserPassword, setUserActive } from "@/server/services/auth.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const { id } = await context.params;
    const input = z.object({ active: z.boolean() }).parse(await readJson<unknown>(currentRequest));
    await setUserActive(actor, id, input.active);
    return json({ updated: true });
  });
}

export async function POST(request: Request, context: RouteContext) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    const { id } = await context.params;
    return json(await resetUserPassword(actor, id));
  });
}
