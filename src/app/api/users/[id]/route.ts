import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { resetUserPassword, setUserActive, setUserRole } from "@/server/services/auth.service";
import type { Role } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const { id } = await context.params;
    const body = await readJson<unknown>(currentRequest);
    const activeInput = z.object({ active: z.boolean() }).strict().safeParse(body);
    if (activeInput.success) {
      await setUserActive(actor, id, activeInput.data.active);
      return json({ updated: true });
    }
    const roleInput = z.object({ role: z.enum(["ADMIN", "HR", "EMPLOYEE"]) }).strict().parse(body);
    await setUserRole(actor, id, roleInput.role as Role);
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
