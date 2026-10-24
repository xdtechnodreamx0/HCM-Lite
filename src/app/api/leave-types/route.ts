import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { requireRole } from "@/server/auth/authorization";
import { createLeaveType, listLeaveTypes } from "@/server/services/organization.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    requireRole(actor, ["ADMIN", "HR"]);
    return json(await listLeaveTypes(actor.companyId));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    return json(await createLeaveType(actor, await readJson<unknown>(currentRequest)), 201);
  });
}
