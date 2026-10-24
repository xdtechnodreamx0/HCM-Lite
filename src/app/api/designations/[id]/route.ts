import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { renameDesignation } from "@/server/services/organization.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const { id } = await context.params;
    const input = z.object({ name: z.string().trim().min(2).max(80) }).strict().parse(await readJson<unknown>(currentRequest));
    return json(await renameDesignation(requireApiUser(user), id, input.name));
  });
}
