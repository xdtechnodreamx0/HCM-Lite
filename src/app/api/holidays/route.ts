import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { requireRole } from "@/server/auth/authorization";
import { createHoliday, listHolidays } from "@/server/services/organization.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    requireRole(actor, ["ADMIN", "HR"]);
    return json(await listHolidays(actor.companyId));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const input = z.object({ date: z.iso.date(), name: z.string().trim().min(2).max(100) }).parse(await readJson<unknown>(currentRequest));
    return json(await createHoliday(actor, input.date, input.name), 201);
  });
}
