import { exportEmployeesCsv } from "@/server/services/employee.service";
import { withApi, requireApiUser } from "@/server/http";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const csv = await exportEmployeesCsv(requireApiUser(user));
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=employees.csv",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
