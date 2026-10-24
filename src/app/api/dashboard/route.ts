import { json, withApi, requireApiUser } from "@/server/http";
import { getDashboard } from "@/server/services/dashboard.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const params = new URL(request.url).searchParams;
    return json(await getDashboard(requireApiUser(user), {
      start: params.get("start") ?? undefined,
      end: params.get("end") ?? undefined,
      departmentId: params.get("departmentId") ?? undefined,
    }));
  });
}
