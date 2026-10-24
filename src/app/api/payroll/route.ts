import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { createPayrollDraft, getPayrollRun, listPayrollRuns } from "@/server/services/payroll.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    const period = new URL(request.url).searchParams.get("period");
    return json(period ? await getPayrollRun(actor, period) : await listPayrollRuns(actor));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const input = z.object({ period: z.string() }).parse(await readJson<unknown>(currentRequest));
    return json(await createPayrollDraft(requireApiUser(user), input.period), 201);
  });
}
