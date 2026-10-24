import { withApi, requireApiUser } from "@/server/http";
import { createPayslipPdf } from "@/server/services/payroll.service";

type RouteContext = { params: Promise<{ period: string }> };

export async function GET(request: Request, context: RouteContext) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    const { period } = await context.params;
    const employeeId = new URL(request.url).searchParams.get("employeeId") ?? undefined;
    const payslip = await createPayslipPdf(actor, period, employeeId);
    return new Response(new Uint8Array(payslip.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payslip-${payslip.employeeCode}-${period}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
