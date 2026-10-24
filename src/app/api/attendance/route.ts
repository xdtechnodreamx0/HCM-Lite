import { json, withApi, requireApiUser } from "@/server/http";
import { attendanceBoard, attendanceHistory } from "@/server/services/attendance.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    const params = new URL(request.url).searchParams;
    if (actor.role === "EMPLOYEE") return json(await attendanceHistory(actor));
    const employeeId = params.get("employeeId") ?? undefined;
    if (employeeId) return json(await attendanceHistory(actor, employeeId));
    return json(await attendanceBoard(actor, params.get("date") ?? undefined, params.get("departmentId") ?? undefined));
  });
}
