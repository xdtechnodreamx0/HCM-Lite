import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { decideCorrection } from "@/server/services/attendance.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const { id } = await context.params;
    return json(await decideCorrection(requireApiUser(user), id, await readJson<unknown>(currentRequest)));
  });
}
