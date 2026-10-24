import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { cancelLeaveRequest, decideLeaveRequest } from "@/server/services/leave.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const { id } = await context.params;
    const body = await readJson<unknown>(currentRequest);
    const action = z.object({ action: z.enum(["cancel", "decide"]) }).parse(body).action;
    if (action === "cancel") return json(await cancelLeaveRequest(actor, id));
    return json(await decideLeaveRequest(actor, id, body));
  });
}
