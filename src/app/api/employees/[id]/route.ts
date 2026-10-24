import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { getEmployee, updateEmployee } from "@/server/services/employee.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  return withApi(request, async ({ user }) => {
    const { id } = await context.params;
    return json(await getEmployee(requireApiUser(user), id));
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const { id } = await context.params;
    return json(await updateEmployee(requireApiUser(user), id, await readJson<unknown>(currentRequest)));
  });
}
