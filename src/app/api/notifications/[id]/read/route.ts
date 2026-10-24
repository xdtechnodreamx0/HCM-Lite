import { json, withApi, requireApiUser } from "@/server/http";
import { setNotificationRead } from "@/server/services/communications.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ user }) => {
    const { id } = await context.params;
    return json(await setNotificationRead(requireApiUser(user), id));
  });
}
