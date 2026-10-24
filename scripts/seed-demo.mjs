import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";

const DB_NAME = process.env.MONGODB_DB;
const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DEMO_COMPANY_ID = "co_demo_northstar";
const PASSWORD = "12345";

if (DB_NAME !== "hcm_lite_demo") {
  throw new Error("Refusing to seed: set MONGODB_DB exactly to hcm_lite_demo.");
}

const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });

function isoDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function plusDays(date, amount) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function datesBetween(start, end) {
  const result = [];
  for (let date = start; date <= end; date = plusDays(date, 1)) result.push(date);
  return result;
}

function isWorkday(date) {
  const day = new Date(`${date}T12:00:00.000Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

function monthBounds(period) {
  const [year, month] = period.split("-").map(Number);
  const start = `${period}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

function previousMonth(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
}

function taxForAnnualGross(annualGrossPaisa) {
  const slabs = [
    { to: 60_000_000, base: 0, rate: 0, excess: 0 },
    { to: 120_000_000, base: 0, rate: 5, excess: 60_000_000 },
    { to: 240_000_000, base: 3_000_000, rate: 15, excess: 120_000_000 },
    { to: 360_000_000, base: 21_000_000, rate: 25, excess: 240_000_000 },
    { to: null, base: 51_000_000, rate: 35, excess: 360_000_000 },
  ];
  const income = Math.max(0, annualGrossPaisa);
  const slab = slabs.find((item) => item.to === null || income <= item.to);
  return Math.round((slab.base + Math.max(0, income - slab.excess) * slab.rate / 100) / 12);
}

const now = new Date();
const today = isoDate(now);
const currentPeriod = today.slice(0, 7);
const finalizedPeriod = previousMonth(currentPeriod);
const finalPeriodBounds = monthBounds(finalizedPeriod);

const departments = [
  { id: "dept_demo_product", name: "Product & Engineering" },
  { id: "dept_demo_customer", name: "Customer Experience" },
  { id: "dept_demo_people", name: "People & Operations" },
  { id: "dept_demo_design", name: "Design" },
  { id: "dept_demo_finance", name: "Finance" },
  { id: "dept_demo_ops", name: "Business Operations" },
];

const designations = [
  { id: "des_demo_engineer", name: "Software Engineer" },
  { id: "des_demo_lead", name: "Team Lead" },
  { id: "des_demo_people", name: "People Partner" },
  { id: "des_demo_support", name: "Customer Success Associate" },
  { id: "des_demo_designer", name: "Product Designer" },
  { id: "des_demo_analyst", name: "Finance Analyst" },
  { id: "des_demo_ops", name: "Operations Coordinator" },
];

const employeeSeed = [
  ["EMP-1001", "Ayesha Khan", "ayesha.khan", "product", "engineer", 280000, "2023-03-13"],
  ["EMP-1002", "Bilal Ahmed", "bilal.ahmed", "product", "engineer", 310000, "2022-11-07"],
  ["EMP-1003", "Sana Malik", "sana.malik", "product", "lead", 390000, "2021-06-21"],
  ["EMP-1004", "Taimur Raza", "taimur.raza", "product", "engineer", 330000, "2024-02-05"],
  ["EMP-1005", "Zoya Siddiqui", "zoya.siddiqui", "product", "engineer", 350000, "2023-09-18"],
  ["EMP-1006", "Hamza Iqbal", "hamza.iqbal", "customer", "support", 260000, "2024-06-10"],
  ["EMP-1007", "Mariam Farooq", "mariam.farooq", "customer", "support", 275000, "2023-01-16"],
  ["EMP-1008", "Daniyal Shah", "daniyal.shah", "customer", "support", 290000, "2022-08-29"],
  ["EMP-1009", "Hira Noor", "hira.noor", "customer", "lead", 345000, "2021-10-04"],
  ["EMP-1010", "Usman Tariq", "usman.tariq", "people", "people", 320000, "2022-04-11"],
  ["EMP-1011", "Iqra Javed", "iqra.javed", "people", "people", 350000, "2023-07-03"],
  ["EMP-1012", "Meher Ali", "meher.ali", "design", "designer", 380000, "2022-02-14"],
  ["EMP-1013", "Rayan Qureshi", "rayan.qureshi", "design", "designer", 410000, "2021-12-06"],
  ["EMP-1014", "Sarmad Baig", "sarmad.baig", "finance", "analyst", 370000, "2022-05-23"],
  ["EMP-1015", "Noor Fatima", "noor.fatima", "ops", "ops", 300000, "2023-04-17"],
  ["EMP-1016", "Omar Latif", "omar.latif", "ops", "ops", 350000, "2022-09-12"],
];

const roleAccounts = [
  { id: "usr_demo_admin", name: "Demo Admin", email: "admin@northstar.demo", role: "ADMIN" },
  { id: "usr_demo_hr", name: "Demo HR", email: "hr@northstar.demo", role: "HR" },
  { id: "usr_demo_employee", name: "Sana Malik", email: "employee@northstar.demo", role: "EMPLOYEE", employeeId: "emp_demo_1003" },
];

try {
  await client.connect();
  const db = client.db(DB_NAME);
  const existingCompanies = await db.collection("companies").find({}).toArray();
  let company = existingCompanies.find((row) => row.id === DEMO_COMPANY_ID);
  if (existingCompanies.length && (existingCompanies.length !== 1 || company?.demoSeed !== true || company?.setupKey !== "primary")) {
    throw new Error("Refusing to seed: this database contains a company that is not this script's marked demo workspace.");
  }
  if (!existingCompanies.length) {
    for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) {
      if (await db.collection(item.name).countDocuments({})) {
        throw new Error(`Refusing to seed: collection ${item.name} is not empty. Choose an empty demo database.`);
      }
    }
  } else {
    for (const item of await db.listCollections({}, { nameOnly: true }).toArray()) {
      if (item.name === "companies") continue;
      if (await db.collection(item.name).countDocuments({ companyId: { $exists: true, $ne: DEMO_COMPANY_ID } })) {
        throw new Error(`Refusing to seed: collection ${item.name} contains records for another company.`);
      }
    }
  }

  const createIndex = (name, key, options) => db.collection(name).createIndex(key, options);
  await Promise.all([
    createIndex("companies", { setupKey: 1 }, { unique: true }),
    createIndex("users", { email: 1 }, { unique: true }), createIndex("users", { companyId: 1, role: 1 }),
    createIndex("employees", { companyId: 1, employeeCode: 1 }, { unique: true }), createIndex("employees", { companyId: 1, email: 1 }, { unique: true }),
    createIndex("departments", { companyId: 1, name: 1 }, { unique: true }), createIndex("designations", { companyId: 1, name: 1 }, { unique: true }),
    createIndex("leaveTypes", { companyId: 1, code: 1 }, { unique: true }), createIndex("holidays", { companyId: 1, date: 1 }, { unique: true }),
    createIndex("attendance", { companyId: 1, employeeId: 1, workDate: 1 }, { unique: true }),
    createIndex("leaveRequests", { companyId: 1, employeeId: 1, status: 1, startDate: 1 }),
    createIndex("payrollRuns", { companyId: 1, period: 1 }, { unique: true }), createIndex("payslips", { companyId: 1, employeeId: 1, period: 1 }, { unique: true }),
    createIndex("notifications", { companyId: 1, recipientUserId: 1, createdAt: -1 }), createIndex("auditLogs", { companyId: 1, createdAt: -1 }),
    createIndex("announcements", { companyId: 1, createdAt: -1 }), createIndex("aiLogs", { companyId: 1, actorUserId: 1, createdAt: -1 }),
    createIndex("leaveUsage", { companyId: 1, employeeId: 1, leaveTypeCode: 1, year: 1 }, { unique: true }),
    createIndex("rateLimits", { key: 1 }, { unique: true }), createIndex("rateLimits", { expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);

  company = {
    id: DEMO_COMPANY_ID, setupKey: "primary", demoSeed: true, name: "Northstar Studio",
    timezone: "Asia/Karachi", officeStart: "09:00", graceMinutes: 15, weekendDays: [0, 6],
    officeLat: null, officeLng: null, geofenceRadiusMeters: 150, createdAt: company?.createdAt ?? now, updatedAt: now,
  };
  await db.collection("companies").replaceOne({ setupKey: "primary" }, company, { upsert: true });

  const employees = employeeSeed.map(([employeeCode, name, slug, departmentKey, designationKey, salaryRupees, joiningDate], index) => {
    const department = departments.find((item) => item.id === `dept_demo_${departmentKey}`);
    const designation = designations.find((item) => item.id === `des_demo_${designationKey}`);
    const id = `emp_demo_${employeeCode.slice(-4)}`;
    const isLoginEmployee = employeeCode === "EMP-1003";
    return {
      id, companyId: DEMO_COMPANY_ID, employeeCode, name, email: isLoginEmployee ? "employee@northstar.demo" : `${slug}@northstar.demo`,
      phone: `+92 300 555 ${String(1000 + index).slice(-4)}`, address: ["Gulberg, Lahore", "Clifton, Karachi", "F-7, Islamabad", "DHA, Lahore"][index % 4],
      gender: ["Female", "Male", "Not specified", "Female"][index % 4], departmentId: department.id, departmentName: department.name,
      designationId: designation.id, designationName: designation.name, joiningDate, exitDate: null,
      status: index === 14 ? "probation" : "active", basicPaisa: salaryRupees * 100,
      ...(isLoginEmployee ? { userId: "usr_demo_employee" } : {}), createdAt: now,
    };
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users = roleAccounts.map((item, index) => ({
    ...item, companyId: DEMO_COMPANY_ID, passwordHash, active: true, forcePasswordChange: false,
    sessionVersion: 1, createdAt: new Date(now.getTime() - index * 60_000),
  }));

  const leaveTypes = [
    ["annual", "Annual leave", 14, false], ["sick", "Sick leave", 8, false],
    ["casual", "Casual leave", 10, false], ["unpaid", "Unpaid leave", 0, true],
  ].map(([code, name, yearlyQuota, unlimited]) => ({
    id: `lt_demo_${code}`, companyId: DEMO_COMPANY_ID, code, name, yearlyQuota, unlimited, active: true, createdAt: now,
  }));

  const attendanceStart = finalPeriodBounds.start;
  const workDates = datesBetween(attendanceStart, today).filter(isWorkday);
  const attendance = [];
  for (const [dayIndex, workDate] of workDates.entries()) {
    for (const [personIndex, person] of employees.entries()) {
      if (workDate < person.joiningDate) continue;
      const isToday = workDate === today;
      const isLate = !isToday && (dayIndex * 3 + personIndex * 5) % 13 === 0;
      const isHalfDay = !isToday && (dayIndex * 7 + personIndex * 2) % 47 === 0;
      const isMissingCheckout = isToday && person.id === "emp_demo_1003";
      const minutesAfter = isLate ? 22 + (personIndex % 19) : 0;
      const checkInAt = new Date(`${workDate}T04:${String(minutesAfter).padStart(2, "0")}:00.000Z`);
      const checkOutAt = isMissingCheckout ? null : new Date(`${workDate}T${isHalfDay ? "09:00" : "12:10"}:00.000Z`);
      const status = isMissingCheckout ? "missing_checkout" : isHalfDay ? "half_day" : isLate ? "late" : "present";
      attendance.push({
        id: `att_demo_${person.id}_${workDate}`, companyId: DEMO_COMPANY_ID, employeeId: person.id, workDate,
        checkInAt, checkOutAt, workedSeconds: isMissingCheckout ? 14_400 : isHalfDay ? 14_400 : 28_800,
        status, late: isLate, halfDay: isHalfDay, missingCheckout: isMissingCheckout,
        policySnapshot: { timezone: "Asia/Karachi", officeStart: "09:00", graceMinutes: 15 }, createdAt: checkInAt, updatedAt: checkOutAt ?? checkInAt,
      });
    }
  }

  const nextWorkdays = [];
  for (let date = plusDays(today, 1); nextWorkdays.length < 2; date = plusDays(date, 1)) if (isWorkday(date)) nextWorkdays.push(date);
  const pastWorkdays = workDates.filter((date) => date < today).slice(-2);
  const pendingDates = datesBetween(nextWorkdays[0], nextWorkdays[1]).filter(isWorkday);
  const approvedDates = pastWorkdays;
  const yearsFor = (dates) => [...new Set(dates.map((date) => Number(date.slice(0, 4))))].map((year) => ({ year, days: dates.filter((date) => Number(date.slice(0, 4)) === year).length }));
  const employeeAccount = employees.find((item) => item.id === "emp_demo_1003");
  const leaveRequest = ({ id, person, typeCode, status, dates, reason, daysAgo = 1 }) => {
    const type = leaveTypes.find((item) => item.code === typeCode);
    return {
      id, companyId: DEMO_COMPANY_ID, employeeId: person.id, employeeName: person.name, employeeCode: person.employeeCode,
      leaveTypeId: type.id, leaveTypeCode: type.code, leaveTypeName: type.name,
      startDate: dates[0], endDate: dates.at(-1), days: dates.length, dates, daysByYear: yearsFor(dates), reason, status,
      decisionComment: status === "approved" ? "Approved. Please coordinate coverage with your team lead." : "",
      requestedBy: person.id === employeeAccount.id ? "usr_demo_employee" : "usr_demo_hr",
      ...(status === "approved" ? { decidedBy: "usr_demo_hr", decidedAt: now } : {}),
      createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
      policySnapshot: { timezone: "Asia/Karachi", weekendDays: [0, 6], holidays: [], quota: type.yearlyQuota, unlimited: type.unlimited },
    };
  };
  const approvedFirst = approvedDates[0] ?? today;
  const approvedSecond = approvedDates[1] ?? approvedFirst;
  const leaveRequests = [
    leaveRequest({ id: "lev_demo_pending", person: employeeAccount, typeCode: "annual", status: "pending", dates: pendingDates, reason: "Family commitments planned in advance.", daysAgo: 0 }),
    leaveRequest({ id: "lev_demo_pending_2", person: employees[0], typeCode: "casual", status: "pending", dates: [nextWorkdays[0]], reason: "A family appointment already scheduled.", daysAgo: 1 }),
    leaveRequest({ id: "lev_demo_approved", person: employeeAccount, typeCode: "casual", status: "approved", dates: approvedDates.length ? approvedDates : [approvedFirst], reason: "Personal appointment.", daysAgo: 5 }),
    leaveRequest({ id: "lev_demo_approved_2", person: employees[5], typeCode: "sick", status: "approved", dates: [approvedSecond], reason: "Recovery day after a minor illness.", daysAgo: 9 }),
  ];

  const announcements = [
    { id: "ann_demo_planning", title: "Quarterly planning week begins Monday", body: "Team leads will share priorities and project milestones. Add your updates to the shared planning board before the first session.", authorId: "usr_demo_hr", authorName: "Demo HR", active: true, createdAt: now },
    { id: "ann_demo_wellbeing", title: "Wellbeing afternoon · 30 October", body: "A half-day to reset, learn, or spend time with your team. Coordinate coverage with your manager before joining a session.", authorId: "usr_demo_admin", authorName: "Demo Admin", active: true, createdAt: new Date(now.getTime() - 2 * 86_400_000) },
    { id: "ann_demo_enrollment", title: "Benefits enrollment is open", body: "Review your benefits choices with the People team by the end of next week. Contact HR if you need help comparing options.", authorId: "usr_demo_hr", authorName: "Demo HR", active: true, createdAt: new Date(now.getTime() - 5 * 86_400_000) },
  ].map((item) => ({ ...item, companyId: DEMO_COMPANY_ID }));

  const notifications = users.map((user, index) => ({
    id: `ntf_demo_${user.id}`, companyId: DEMO_COMPANY_ID, recipientUserId: user.id,
    title: "Quarterly planning week begins Monday", body: "Team leads will share priorities and project milestones.",
    href: "/announcements", read: index === 0, createdAt: now,
  }));

  const corrections = [];
  const recentCorrectionDate = pastWorkdays.at(-1);
  if (recentCorrectionDate) corrections.push({
    id: "cor_demo_pending", companyId: DEMO_COMPANY_ID, employeeId: employees[1].id,
    employeeName: employees[1].name, employeeCode: employees[1].employeeCode, workDate: recentCorrectionDate,
    before: { checkInAt: new Date(`${recentCorrectionDate}T04:42:00.000Z`).toISOString(), checkOutAt: new Date(`${recentCorrectionDate}T12:00:00.000Z`).toISOString() },
    after: { checkInAt: new Date(`${recentCorrectionDate}T04:20:00.000Z`).toISOString(), checkOutAt: new Date(`${recentCorrectionDate}T12:00:00.000Z`).toISOString() },
    reason: "I arrived before the door scanner recorded my check-in.", status: "pending", createdAt: now,
  });

  const holidays = [
    { id: "hol_demo_oct", companyId: DEMO_COMPANY_ID, date: `${currentPeriod}-27`, name: "Team learning afternoon" },
    { id: "hol_demo_dec", companyId: DEMO_COMPANY_ID, date: `${today.slice(0, 4)}-12-25`, name: "Winter office closure" },
  ];

  const makePayroll = (period, status) => {
    const bounds = monthBounds(period);
    const workdays = datesBetween(bounds.start, bounds.end).filter(isWorkday);
    const entries = employees.filter((person) => person.status !== "exited").flatMap((person) => {
      const employed = workdays.filter((date) => date >= person.joiningDate);
      if (!employed.length) return [];
      const personalAttendance = attendance.filter((item) => item.employeeId === person.id && item.workDate >= bounds.start && item.workDate <= bounds.end);
      const absentDays = Math.max(0, employed.length - personalAttendance.length);
      const halfDays = personalAttendance.filter((item) => item.status === "half_day").length;
      const basicPaisa = person.basicPaisa;
      const hraPaisa = Math.round(basicPaisa * 0.4);
      const medicalPaisa = Math.round(basicPaisa * 0.1);
      const grossPaisa = basicPaisa + hraPaisa + medicalPaisa;
      const perDayPaisa = workdays.length ? Math.round(grossPaisa / workdays.length) : 0;
      const deductedDays = absentDays + halfDays * 0.5;
      const paidDays = Math.max(0, employed.length - deductedDays);
      const grossPayablePaisa = Math.round(perDayPaisa * paidDays);
      const annualGrossPaisa = grossPaisa * 12;
      const taxPaisa = taxForAnnualGross(annualGrossPaisa);
      return [{
        employeeId: person.id, employeeCode: person.employeeCode, employeeName: person.name,
        departmentId: person.departmentId, departmentName: person.departmentName, basicPaisa, hraPaisa, medicalPaisa,
        grossPaisa, grossPayablePaisa, annualGrossPaisa, taxPaisa, netPaisa: Math.max(0, grossPayablePaisa - taxPaisa),
        workingDays: workdays.length, payableDays: employed.length, deductedDays, paidDays, perDayPaisa,
        deductions: { absentDays, unpaidLeaveDays: 0, halfDays }, formulaVersion: "hcm-lite-brief-v1",
      }];
    });
    const totals = entries.reduce((sum, entry) => ({
      basicPaisa: sum.basicPaisa + entry.basicPaisa, grossPayablePaisa: sum.grossPayablePaisa + entry.grossPayablePaisa,
      taxPaisa: sum.taxPaisa + entry.taxPaisa, netPaisa: sum.netPaisa + entry.netPaisa,
    }), { basicPaisa: 0, grossPayablePaisa: 0, taxPaisa: 0, netPaisa: 0 });
    return {
      id: `pay_demo_${period}`, companyId: DEMO_COMPANY_ID, period, ...bounds, status,
      employeeCount: entries.length, totals, entries, formulaVersion: "hcm-lite-brief-v1",
      createdBy: "usr_demo_hr", createdAt: new Date(`${bounds.start}T06:00:00.000Z`), updatedAt: now,
      ...(status === "finalized" ? { finalizedAt: new Date(`${bounds.end}T12:00:00.000Z`) } : {}),
    };
  };
  const payrollRuns = [makePayroll(finalizedPeriod, "finalized"), makePayroll(currentPeriod, "draft")];

  const admin = users[0];
  const auditLogs = [
    ["aud_demo_setup", "setup.initialize", "company", DEMO_COMPANY_ID, { name: company.name }, new Date(now.getTime() - 30 * 86_400_000)],
    ["aud_demo_people", "employee.import", "employee", employees[0].id, { importedCount: employees.length }, new Date(now.getTime() - 12 * 86_400_000)],
    ["aud_demo_payroll", "payroll.finalize", "payrollRun", `pay_demo_${finalizedPeriod}`, { period: finalizedPeriod }, new Date(now.getTime() - 4 * 86_400_000)],
  ].map(([id, action, entity, entityId, after, logDate]) => ({
    id, companyId: DEMO_COMPANY_ID, actorUserId: admin.id, actorEmail: admin.email, actorRole: admin.role,
    action, entity, entityId, before: null, after, createdAt: logDate,
  }));

  const collectionsToSeed = [
    ["users", users], ["departments", departments.map((item) => ({ ...item, companyId: DEMO_COMPANY_ID, createdAt: now }))],
    ["designations", designations.map((item) => ({ ...item, companyId: DEMO_COMPANY_ID, createdAt: now }))],
    ["employees", employees], ["salaryStructures", employees.map((person) => ({ id: `sal_demo_${person.id}`, companyId: DEMO_COMPANY_ID, employeeId: person.id, basicPaisa: person.basicPaisa, effectiveFrom: person.joiningDate, createdBy: "usr_demo_admin", createdAt: now }))],
    ["leaveTypes", leaveTypes], ["holidays", holidays], ["attendance", attendance], ["leaveRequests", leaveRequests],
    ["leaveUsage", [
      { id: "usage_demo_employee_casual", companyId: DEMO_COMPANY_ID, employeeId: employeeAccount.id, leaveTypeCode: "casual", year: Number(today.slice(0, 4)), approvedDays: Math.max(1, approvedDates.length), updatedAt: now },
      { id: "usage_demo_customer_sick", companyId: DEMO_COMPANY_ID, employeeId: employees[5].id, leaveTypeCode: "sick", year: Number(today.slice(0, 4)), approvedDays: 1, updatedAt: now },
    ]],
    ["announcements", announcements], ["notifications", notifications], ["attendanceCorrections", corrections],
    ["payrollRuns", payrollRuns], ["auditLogs", auditLogs],
  ];

  for (const [collectionName, records] of collectionsToSeed) {
    for (const record of records) {
      await db.collection(collectionName).replaceOne({ id: record.id, companyId: DEMO_COMPANY_ID }, record, { upsert: true });
    }
  }

  const counts = {};
  for (const [collectionName] of collectionsToSeed) counts[collectionName] = await db.collection(collectionName).countDocuments({ companyId: DEMO_COMPANY_ID });
  console.log(JSON.stringify({ database: DB_NAME, company: company.name, accounts: roleAccounts.map(({ email, role }) => ({ username: email, role, password: PASSWORD })), seededCounts: counts }, null, 2));
} finally {
  await client.close();
}
