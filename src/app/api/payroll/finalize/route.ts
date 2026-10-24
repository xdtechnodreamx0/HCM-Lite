import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { finalizePayroll } from "@/server/services/payroll.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const input = z.object({ period: z.string() }).parse(await readJson<unknown>(currentRequest));
    return json(await finalizePayroll(requireApiUser(user), input.period));
  });
}
