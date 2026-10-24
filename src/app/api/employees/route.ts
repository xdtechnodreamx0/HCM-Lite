import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { createEmployee, listEmployees } from "@/server/services/employee.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    const params = new URL(request.url).searchParams;
    const sortBy = z.enum(["name", "joiningDate", "employeeCode"]).optional().parse(params.get("sortBy") ?? undefined);
    const sortDirection = z.enum(["asc", "desc"]).optional().parse(params.get("sortDirection") ?? undefined);
    return json(await listEmployees(actor, {
      query: params.get("query") ?? undefined,
      status: params.get("status") ?? undefined,
      departmentId: params.get("departmentId") ?? undefined,
      sortBy,
      sortDirection,
      page: Number(params.get("page") ?? 1),
      pageSize: Number(params.get("pageSize") ?? 20),
    }));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    return json(await createEmployee(requireApiUser(user), await readJson<unknown>(currentRequest)), 201);
  });
}
