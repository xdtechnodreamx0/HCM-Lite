import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { updateHoliday } from "@/server/services/organization.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const { id } = await context.params;
    return json(await updateHoliday(requireApiUser(user), id, await readJson<unknown>(currentRequest)));
  });
}
