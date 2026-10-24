import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { requireRole } from "@/server/auth/authorization";
import { collections } from "@/server/db/collections";
import { getCalendar, listDepartments, listDesignations, listHolidays, listLeaveTypes, updateSettings } from "@/server/services/organization.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    requireRole(actor, ["ADMIN", "HR"]);
    const [calendar, departments, designations, leaveTypes, holidays] = await Promise.all([
      getCalendar(actor.companyId), listDepartments(actor.companyId), listDesignations(actor.companyId),
      listLeaveTypes(actor.companyId), listHolidays(actor.companyId),
    ]);
    return json({ calendar, departments, designations, leaveTypes, holidays });
  });
}

export async function PATCH(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    await updateSettings(actor, await readJson<unknown>(currentRequest));
    const db = await collections();
    const company = await db.companies.findOne({ id: actor.companyId }, { projection: { _id: 0, setupKey: 0 } });
    return json({ updated: true, company });
  });
}
