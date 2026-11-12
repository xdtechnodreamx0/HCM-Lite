import { json, withApi } from "@/server/http";
import { getEnv } from "@/lib/env";
import { isInitialized } from "@/server/services/setup.service";
import { collections } from "@/server/db/collections";
import type { SessionUser } from "@/lib/types";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const env = getEnv();
    const initialized = await isInitialized();
    const flags = { demoMode: env.demoMode, emailConfigured: Boolean(env.resendApiKey && env.emailFrom) };
    if (!initialized || !user) return json({ initialized, ...flags, user: null, company: null });
    const db = await collections();
    const company = await db.companies.findOne({ id: user.companyId }, { projection: { _id: 0, id: 1, name: 1, timezone: 1, officeStart: 1, graceMinutes: 1, weekendDays: 1, officeLat: 1, officeLng: 1, geofenceRadiusMeters: 1 } });
    return json({ initialized, ...flags, user: publicUser(user), company });
  });
}

function publicUser(user: SessionUser) {
  return {
    id: user.id, email: user.email, name: user.name, role: user.role,
    employeeId: user.employeeId, forcePasswordChange: user.forcePasswordChange,
  };
}
