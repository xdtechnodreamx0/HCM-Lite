import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { createLeaveRequest, listLeaveRequests } from "@/server/services/leave.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "all";
    return json(await listLeaveRequests(requireApiUser(user), status));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => json(await createLeaveRequest(requireApiUser(user), await readJson<unknown>(currentRequest)), 201));
}
