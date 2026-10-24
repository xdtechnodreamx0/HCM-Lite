import { json, withApi, requireApiUser } from "@/server/http";
import { getLeaveBalances } from "@/server/services/leave.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    const employeeId = new URL(request.url).searchParams.get("employeeId") ?? undefined;
    return json(await getLeaveBalances(actor, employeeId));
  });
}
