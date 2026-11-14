import { z } from "zod";
import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";
import { toIsoDate } from "@/lib/dates";
import { setCustomerCookie, clearCustomerCookie } from "@/server/auth/customer-session";
import { collections } from "@/server/db/collections";
import { rateLimit } from "@/server/security/rate-limit";
import type { CustomerSession } from "@/lib/types";

export const customerSessionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
}).strict();

type DemoCompany = Record<string, unknown> & { id: string; name: string };

/**
 * The production deployment has no demo database by design. The customer portal
 * still needs a believable, fully populated read-only snapshot, so this static
 * sample mirrors the seeded Northstar Studio workspace without touching staff
 * records, payroll, or any real tenant data.
 */
const SAMPLE_COMPANY: DemoCompany = {
  id: "co_demo_northstar",
  name: "Northstar Studio",
  timezone: "Asia/Karachi",
  officeStart: "09:00",
  graceMinutes: 15,
  weekendDays: [0, 6],
};

function sampleDate(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return toIsoDate(date, SAMPLE_COMPANY.timezone as string);
}

function sampleCustomerDashboard() {
  const timezone = String(SAMPLE_COMPANY.timezone);
  return {
    company: {
      name: String(SAMPLE_COMPANY.name),
      timezone,
      officeStart: String(SAMPLE_COMPANY.officeStart),
      graceMinutes: Number(SAMPLE_COMPANY.graceMinutes),
      weekendDays: SAMPLE_COMPANY.weekendDays as number[],
    },
    today: toIsoDate(new Date(), timezone),
    stats: { headcount: 17, departments: 6, onLeaveToday: 1, newJoiners: 2 },
    teams: [
      { name: "Product & Engineering", count: 5, lead: "Sana Malik" },
      { name: "Customer Experience", count: 4, lead: "Hira Noor" },
      { name: "People & Operations", count: 3, lead: "Nadia Rahman" },
      { name: "Design", count: 2, lead: "Meher Ali" },
      { name: "Business Operations", count: 2, lead: "Omar Latif" },
      { name: "Finance", count: 1, lead: "Sarmad Baig" },
    ],
    people: [
      { name: "Nadia Rahman", designation: "Managing Partner", department: "People & Operations" },
      { name: "Sana Malik", designation: "Team Lead", department: "Product & Engineering" },
      { name: "Bilal Ahmed", designation: "Software Engineer", department: "Product & Engineering" },
      { name: "Hira Noor", designation: "Team Lead", department: "Customer Experience" },
      { name: "Meher Ali", designation: "Product Designer", department: "Design" },
      { name: "Sarmad Baig", designation: "Finance Analyst", department: "Finance" },
      { name: "Omar Latif", designation: "Operations Manager", department: "Business Operations" },
      { name: "Iqra Javed", designation: "People Partner", department: "People & Operations" },
    ],
    updates: [
      {
        title: "Quarterly planning week begins Monday",
        body: "Team leads will share priorities and project milestones. Add your updates to the shared planning board before the first session.",
        date: sampleDate(0),
      },
      {
        title: "Wellbeing afternoon · Friday 20 November",
        body: "The studio closes at 1pm for a wellbeing afternoon. Coordinate client coverage with your team lead before Friday.",
        date: sampleDate(2),
      },
      {
        title: "Open enrollment closes on 27 November",
        body: "Review your health, dental, and life cover choices before the deadline. Drop-in sessions run every Tuesday and Thursday.",
        date: sampleDate(5),
      },
    ],
  };
}

async function demoCompany() {
  if (!getEnv().demoMode) return SAMPLE_COMPANY;
  const db = await collections();
  const company = await db.companies.findOne(
    { demoSeed: true },
    { projection: { _id: 0, id: 1, name: 1, timezone: 1, officeStart: 1, graceMinutes: 1, weekendDays: 1 } },
  );
  if (!company) {
    throw new AppError(404, "No demo workspace is available yet. Seed the demo database first.", "DEMO_WORKSPACE_MISSING");
  }
  return company as unknown as DemoCompany;
}

export async function createCustomerSession(raw: unknown, ip: string) {
  const input = customerSessionSchema.parse(raw);
  const company = await demoCompany();
  const ipHash = createHash("sha256").update(ip || "unknown").digest("hex");
  await rateLimit(`customer-demo:ip:${ipHash}`, 20, 60 * 60 * 1000);
  const session: CustomerSession = {
    kind: "customer",
    name: input.name,
    email: input.email,
    companyId: company.id,
    demo: true,
  };
  await setCustomerCookie(session);
  return {
    available: true,
    session: { name: session.name, email: session.email },
    dashboard: await customerDashboard(session),
  };
}

export async function clearCustomerSession() {
  await clearCustomerCookie();
  return { signedOut: true };
}

export async function customerBootstrap(session: CustomerSession | null) {
  if (!getEnv().demoMode) {
    return {
      available: true,
      company: { name: SAMPLE_COMPANY.name },
      session: session ? { name: session.name, email: session.email } : null,
      dashboard: session ? sampleCustomerDashboard() : null,
    };
  }
  let company: DemoCompany;
  try {
    company = await demoCompany();
  } catch {
    return {
      available: false,
      reason: "No demo workspace has been seeded yet. Run the demo seed, then return to this page.",
      session: null,
      dashboard: null,
    };
  }
  return {
    available: true,
    company: { name: String(company.name) },
    session: session ? { name: session.name, email: session.email } : null,
    dashboard: session ? await customerDashboard(session) : null,
  };
}

export async function customerDashboard(session: CustomerSession) {
  if (!getEnv().demoMode) return sampleCustomerDashboard();
  const db = await collections();
  const company = await db.companies.findOne(
    { id: session.companyId, demoSeed: true },
    { projection: { _id: 0, id: 1, name: 1, timezone: 1, officeStart: 1, graceMinutes: 1, weekendDays: 1 } },
  );
  if (!company) throw new AppError(404, "This demo workspace is no longer available.", "DEMO_WORKSPACE_MISSING");
  const timezone = String(company.timezone ?? "Asia/Karachi");
  const today = toIsoDate(new Date(), timezone);
  const [employees, announcements, onLeaveToday] = await Promise.all([
    db.employees
      .find(
        { companyId: session.companyId, status: { $in: ["active", "probation"] } },
        { projection: { _id: 0, name: 1, departmentName: 1, designationName: 1, joiningDate: 1, status: 1 } },
      )
      .limit(200)
      .toArray(),
    db.announcements
      .find({ companyId: session.companyId, active: true }, { projection: { _id: 0, title: 1, body: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray(),
    db.leaveRequests.countDocuments({
      companyId: session.companyId,
      status: "approved",
      startDate: { $lte: today },
      endDate: { $gte: today },
    }),
  ]);

  const teamMap = new Map<string, { name: string; count: number; lead: string | null }>();
  for (const employee of employees) {
    const name = String(employee.departmentName || "Unassigned");
    const team = teamMap.get(name) ?? { name, count: 0, lead: null };
    team.count += 1;
    if (!team.lead && /lead|head|partner|manager/i.test(String(employee.designationName ?? ""))) {
      team.lead = String(employee.name);
    }
    teamMap.set(name, team);
  }
  const teams = [...teamMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const people = employees.slice(0, 8).map((employee) => ({
    name: String(employee.name),
    designation: String(employee.designationName || "Team member"),
    department: String(employee.departmentName || "Unassigned"),
  }));

  return {
    company: {
      name: String(company.name),
      timezone,
      officeStart: String(company.officeStart ?? "09:00"),
      graceMinutes: Number(company.graceMinutes ?? 15),
      weekendDays: Array.isArray(company.weekendDays) ? company.weekendDays : [0, 6],
    },
    today,
    stats: {
      headcount: employees.length,
      departments: teams.length,
      onLeaveToday,
      newJoiners: employees.filter((employee) => String(employee.joiningDate ?? "").slice(0, 4) === today.slice(0, 4)).length,
    },
    teams,
    people,
    updates: announcements.map((announcement) => ({
      title: String(announcement.title),
      body: String(announcement.body),
      date: announcement.createdAt instanceof Date
        ? announcement.createdAt.toISOString().slice(0, 10)
        : String(announcement.createdAt ?? "").slice(0, 10),
    })),
  };
}
