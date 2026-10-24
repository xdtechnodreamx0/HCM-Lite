import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { dryRunEmployeeCsv, importEmployeeCsv } from "@/server/services/employee.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const input = z.object({ csv: z.string().min(1).max(1_000_000), dryRun: z.boolean().default(true) }).parse(await readJson<unknown>(currentRequest));
    const actor = requireApiUser(user);
    return json(input.dryRun ? await dryRunEmployeeCsv(actor, input.csv) : await importEmployeeCsv(actor, input.csv));
  });
}
