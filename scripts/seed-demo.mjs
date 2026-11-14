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

function recentPeriods(period, count) {
  const [year, month] = period.split("-").map(Number);
  const periods = [];
  for (let offset = count; offset >= 1; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    periods.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
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
const currentYear = Number(today.slice(0, 4));
const currentPeriod = today.slice(0, 7);
const finalizedPeriods = recentPeriods(currentPeriod, 10);

const departments = [
  { id: "dept_demo_product", name: "Product & Engineering" },
  { id: "dept_demo_customer", name: "Customer Experience" },
  { id: "dept_demo_people", name: "People & Operations" },
  { id: "dept_demo_design", name: "Design" },
  { id: "dept_demo_finance", name: "Finance" },
  { id: "dept_demo_ops", name: "Business Operations" },
];

const designations = [
  { id: "des_demo_partner", name: "Managing Partner" },
  { id: "des_demo_engineer", name: "Software Engineer" },
  { id: "des_demo_lead", name: "Team Lead" },
  { id: "des_demo_people", name: "People Partner" },
  { id: "des_demo_support", name: "Customer Success Associate" },
  { id: "des_demo_designer", name: "Product Designer" },
  { id: "des_demo_analyst", name: "Finance Analyst" },
  { id: "des_demo_ops", name: "Operations Coordinator" },
];

const employeeSeed = [
  ["EMP-1000", "Nadia Rahman", "nadia.rahman", "people", "partner", 520000, "2020-01-06"],
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
  ["EMP-1013", "Rayan Qureshi", "rayan.qureshi", "design", "designer", 410000, "2026-02-16"],
  ["EMP-1014", "Sarmad Baig", "sarmad.baig", "finance", "analyst", 370000, "2022-05-23"],
  ["EMP-1015", "Noor Fatima", "noor.fatima", "ops", "ops", 300000, "2026-04-06"],
  ["EMP-1016", "Omar Latif", "omar.latif", "ops", "ops", 350000, "2022-09-12"],
];

const roleAccounts = [
  { id: "usr_demo_admin", name: "Nadia Rahman", email: "admin@northstar.demo", role: "ADMIN", employeeCode: "EMP-1000", employeeId: "emp_demo_1000" },
  { id: "usr_demo_hr", name: "Iqra Javed", email: "hr@northstar.demo", role: "HR", employeeCode: "EMP-1011", employeeId: "emp_demo_1011" },
  { id: "usr_demo_employee", name: "Sana Malik", email: "employee@northstar.demo", role: "EMPLOYEE", employeeCode: "EMP-1003", employeeId: "emp_demo_1003" },
  { id: "usr_demo_taimur", name: "Taimur Raza", email: "taimur@northstar.demo", role: "EMPLOYEE", employeeCode: "EMP-1004", employeeId: "emp_demo_1004" },
  { id: "usr_demo_sarmad", name: "Sarmad Baig", email: "sarmad@northstar.demo", role: "EMPLOYEE", employeeCode: "EMP-1014", employeeId: "emp_demo_1014" },
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
    // A reseed is a reset: remove every record created inside the demo
    // workspace so the curated snapshot is exact and repeatable.
    const demoCollections = [
      "users", "employees", "salaryStructures", "departments", "designations",
      "leaveTypes", "holidays", "attendance", "leaveRequests", "leaveUsage",
      "announcements", "notifications", "attendanceCorrections", "payrollRuns",
      "payslips", "auditLogs", "aiLogs",
    ];
    for (const collectionName of demoCollections) {
      await db.collection(collectionName).deleteMany({ companyId: DEMO_COMPANY_ID });
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

  const accountsByEmployeeCode = new Map(roleAccounts.filter((account) => account.employeeCode).map((account) => [account.employeeCode, account]));
  const employees = employeeSeed.map(([employeeCode, name, slug, departmentKey, designationKey, salaryRupees, joiningDate], index) => {
    const department = departments.find((item) => item.id === `dept_demo_${departmentKey}`);
    const designation = designations.find((item) => item.id === `des_demo_${designationKey}`);
    const id = `emp_demo_${employeeCode.slice(-4)}`;
    const account = accountsByEmployeeCode.get(employeeCode);
    return {
      id, companyId: DEMO_COMPANY_ID, employeeCode, name, email: account?.email ?? `${slug}@northstar.demo`,
      phone: `+92 300 555 ${String(1000 + index).slice(-4)}`, address: ["Gulberg, Lahore", "Clifton, Karachi", "F-7, Islamabad", "DHA, Lahore"][index % 4],
      gender: ["Female", "Male", "Not specified", "Female"][index % 4], departmentId: department.id, departmentName: department.name,
      designationId: designation.id, designationName: designation.name, joiningDate, exitDate: null,
      status: employeeCode === "EMP-1015" ? "probation" : "active", basicPaisa: salaryRupees * 100,
      ...(account ? { userId: account.id } : {}), createdAt: now,
    };
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users = roleAccounts.map((item, index) => ({
    ...item, companyId: DEMO_COMPANY_ID, passwordHash, active: true, forcePasswordChange: false,
    sessionVersion: 1, demoAccount: true, emailVerificationRequired: false, emailVerifiedAt: now,
    createdAt: new Date(now.getTime() - index * 60_000),
  }));

  const leaveTypes = [
    ["annual", "Annual leave", 14, false], ["sick", "Sick leave", 8, false],
    ["casual", "Casual leave", 10, false], ["unpaid", "Unpaid leave", 0, true],
  ].map(([code, name, yearlyQuota, unlimited]) => ({
    id: `lt_demo_${code}`, companyId: DEMO_COMPANY_ID, code, name, yearlyQuota, unlimited, active: true, createdAt: now,
  }));

  // Public and company holidays for the demo year. Attendance and payroll skip
  // these dates so the sample workspace never shows punches or absences on a
  // day the office was closed.
  const holidays = [
    { id: "hol_demo_kashmir", date: `${currentYear}-02-05`, name: "Kashmir Solidarity Day" },
    { id: "hol_demo_eid_fitr", date: `${currentYear}-03-20`, name: "Eid-ul-Fitr" },
    { id: "hol_demo_pakistan_day", date: `${currentYear}-03-23`, name: "Pakistan Day" },
    { id: "hol_demo_labour", date: `${currentYear}-05-01`, name: "Labour Day" },
    { id: "hol_demo_eid_adha", date: `${currentYear}-05-27`, name: "Eid-ul-Adha" },
    { id: "hol_demo_independence", date: `${currentYear}-08-14`, name: "Independence Day" },
    { id: "hol_demo_milad", date: `${currentYear}-08-26`, name: "Eid Milad-un-Nabi" },
    { id: "hol_demo_iqbal", date: `${currentYear}-11-09`, name: "Iqbal Day" },
    { id: "hol_demo_winter", date: `${currentYear}-12-25`, name: "Quaid-e-Azam Day · office closed" },
    { id: "hol_demo_year_end", date: `${currentYear}-12-31`, name: "Year-end office closure" },
  ].map((item) => ({ ...item, companyId: DEMO_COMPANY_ID }));
  const holidayDates = new Set(holidays.map((item) => item.date));

  const attendanceStart = `${today.slice(0, 4)}-01-01`;
  const workDates = datesBetween(attendanceStart, today).filter((date) => isWorkday(date) && !holidayDates.has(date));
  const attendanceRecords = [];
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
      attendanceRecords.push({
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
  const hrAccount = employees.find((item) => item.id === "emp_demo_1011");
  const taimurAccount = employees.find((item) => item.id === "emp_demo_1004");
  const sarmadAccount = employees.find((item) => item.id === "emp_demo_1014");
  const ayeshaAccount = employees.find((item) => item.id === "emp_demo_1001");
  const hamzaAccount = employees.find((item) => item.id === "emp_demo_1006");
  const meherAccount = employees.find((item) => item.id === "emp_demo_1012");
  const leaveRequest = ({ id, person, typeCode, status, dates, reason, daysAgo = 1 }) => {
    const type = leaveTypes.find((item) => item.code === typeCode);
    return {
      id, companyId: DEMO_COMPANY_ID, employeeId: person.id, employeeName: person.name, employeeCode: person.employeeCode,
      leaveTypeId: type.id, leaveTypeCode: type.code, leaveTypeName: type.name,
      startDate: dates[0], endDate: dates.at(-1), days: dates.length, dates, daysByYear: yearsFor(dates), reason, status,
      decisionComment: status === "approved" ? "Approved. Please coordinate coverage with your team lead." : "",
      requestedBy: person.userId ?? "usr_demo_hr",
      ...(status === "approved" ? { decidedBy: person.id === hrAccount.id ? "usr_demo_admin" : "usr_demo_hr", decidedAt: now } : {}),
      createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
      policySnapshot: { timezone: "Asia/Karachi", weekendDays: [0, 6], holidays: [], quota: type.yearlyQuota, unlimited: type.unlimited },
    };
  };
  const approvedFirst = approvedDates[0] ?? today;
  const approvedSecond = approvedDates[1] ?? approvedFirst;
  const leaveRequests = [
    leaveRequest({ id: "lev_demo_pending", person: employeeAccount, typeCode: "annual", status: "pending", dates: pendingDates, reason: "Family commitments planned in advance.", daysAgo: 0 }),
    leaveRequest({ id: "lev_demo_pending_2", person: ayeshaAccount, typeCode: "casual", status: "pending", dates: [nextWorkdays[0]], reason: "A family appointment already scheduled.", daysAgo: 1 }),
    leaveRequest({ id: "lev_demo_pending_taimur", person: taimurAccount, typeCode: "sick", status: "pending", dates: [nextWorkdays[1]], reason: "Recovering from a fever; the doctor advised a day of rest.", daysAgo: 0 }),
    leaveRequest({ id: "lev_demo_pending_sarmad", person: sarmadAccount, typeCode: "annual", status: "pending", dates: [nextWorkdays[0]], reason: "A pre-booked family commitment out of town.", daysAgo: 2 }),
    leaveRequest({ id: "lev_demo_approved", person: employeeAccount, typeCode: "casual", status: "approved", dates: approvedDates.length ? approvedDates : [approvedFirst], reason: "Personal appointment.", daysAgo: 5 }),
    leaveRequest({ id: "lev_demo_approved_2", person: hamzaAccount, typeCode: "sick", status: "approved", dates: [approvedSecond], reason: "Recovery day after a minor illness.", daysAgo: 9 }),
    leaveRequest({ id: "lev_demo_today", person: meherAccount, typeCode: "annual", status: "approved", dates: [today], reason: "A pre-booked personal day, approved by the People team.", daysAgo: 4 }),
    leaveRequest({ id: "lev_demo_hr_pending", person: hrAccount, typeCode: "annual", status: "pending", dates: [nextWorkdays[0]], reason: "A pre-planned family commitment.", daysAgo: 0 }),
    leaveRequest({ id: "lev_demo_hr_approved", person: hrAccount, typeCode: "annual", status: "approved", dates: [approvedFirst], reason: "Family event out of town.", daysAgo: 12 }),
  ];
  const approvedLeaveKeys = new Set(leaveRequests
    .filter((leave) => leave.status === "approved")
    .flatMap((leave) => leave.dates.map((date) => `${leave.employeeId}|${date}`)));
  const attendance = attendanceRecords.filter((record) => !approvedLeaveKeys.has(`${record.employeeId}|${record.workDate}`));

  const announcement = ({ id, title, body, authorId = "usr_demo_hr", authorName = "Iqra Javed", daysAgo = 0, active = true, pinned = false }) => ({
    id, companyId: DEMO_COMPANY_ID, title, body, authorId, authorName, active, pinned,
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
  });
  const announcements = [
    announcement({ id: "ann_demo_planning", title: "Quarterly planning week begins Monday", pinned: true, body: "Team leads will share priorities and project milestones in the Monday all-hands. Add your updates to the shared planning board before the first session so every squad can plan around the same commitments.", daysAgo: 0 }),
    announcement({ id: "ann_demo_wellbeing", title: "Wellbeing afternoon · Friday 20 November", authorId: "usr_demo_admin", authorName: "Nadia Rahman", body: "We are closing the studio at 1pm for a wellbeing afternoon. Use the time to reset, learn something new, or simply step away from screens. Please coordinate client coverage with your team lead before Friday.", daysAgo: 2 }),
    announcement({ id: "ann_demo_enrollment", title: "Open enrollment closes on 27 November", body: "Review your health, dental, and life cover choices in the benefits portal before 27 November. The People team is holding drop-in sessions every Tuesday and Thursday from 2pm to 4pm if you would like help comparing plans.", daysAgo: 5 }),
    announcement({ id: "ann_demo_newstarter", title: "Noor Fatima joins Business Operations", authorId: "usr_demo_admin", authorName: "Nadia Rahman", body: "Noor joins us as an Operations Associate and will sit with Omar on the fourth floor. Her first month will focus on studio scheduling and vendor coordination. Please give her a warm welcome.", daysAgo: 8 }),
    announcement({ id: "ann_demo_expenses", title: "Updated Q4 expense policy", authorId: "usr_demo_sarmad", authorName: "Sarmad Baig", body: "From this month, client entertainment claims need a named attendee list and a short business rationale. Receipts must be submitted within 14 days. The Finance team has updated the claim form and the policy page in the workspace.", daysAgo: 11 }),
    announcement({ id: "ann_demo_lift", title: "Karachi office: lift maintenance on 18 November", body: "The main passenger lift will be serviced on Tuesday 18 November between 8am and 12pm. Please use the service stairs or the rear lift. The ground-floor meeting rooms remain available for client calls.", daysAgo: 14 }),
    announcement({ id: "ann_demo_learning", title: "Learning stipend: submit November claims by 25 November", body: "The monthly learning stipend covers courses, books, and conferences up to Rs 25,000. Submit your claim with a receipt and a one-line learning summary by 25 November. Unused amounts do not roll over.", daysAgo: 18 }),
    announcement({ id: "ann_demo_reviews", title: "Performance conversations: book your slot by 30 November", authorId: "usr_demo_admin", authorName: "Nadia Rahman", body: "The autumn performance cycle is open. Book a 45-minute conversation with your manager before 30 November, and add your self-review to the shared template. Calibration sessions will run in the first week of December.", daysAgo: 23 }),
    announcement({ id: "ann_demo_offsite", title: "Save the date: studio offsite on 4 December", body: "This year's studio offsite will be at the Beach View Pavilion in Karachi. The day includes a strategy session, team activities, and dinner. Travel details and the full agenda will follow next week.", daysAgo: 29 }),
  ];

  const notification = ({ id, recipientUserId, title, body, href = "/announcements", read = false, hoursAgo = 0 }) => ({
    id, companyId: DEMO_COMPANY_ID, recipientUserId, title, body, href, read,
    createdAt: new Date(now.getTime() - hoursAgo * 3_600_000),
  });
  const notifications = [
    ...users.map((user, index) => notification({
      id: `ntf_demo_${user.id}`, recipientUserId: user.id,
      title: "Quarterly planning week begins Monday", body: "Team leads will share priorities and project milestones.",
      read: index === 0, hoursAgo: 2 + index,
    })),
    notification({ id: "ntf_demo_admin_hr_leave", recipientUserId: "usr_demo_admin", title: "An HR leave request needs Admin review", body: "Iqra Javed requested annual leave. HR self-requests are reviewed by an Admin.", href: "/leave", hoursAgo: 1 }),
    notification({ id: "ntf_demo_hr_taimur_leave", recipientUserId: "usr_demo_hr", title: "Taimur Raza requested sick leave", body: "A one-day sick leave request is waiting for a decision.", href: "/leave", hoursAgo: 1 }),
    notification({ id: "ntf_demo_hr_sarmad_leave", recipientUserId: "usr_demo_hr", title: "Sarmad Baig requested annual leave", body: "A one-day annual leave request is waiting for a decision.", href: "/leave", hoursAgo: 3 }),
    notification({ id: "ntf_demo_hr_ayesha_leave", recipientUserId: "usr_demo_hr", title: "Ayesha Khan requested casual leave", body: "A one-day casual leave request is waiting for a decision.", href: "/leave", hoursAgo: 4 }),
    notification({ id: "ntf_demo_hr_correction", recipientUserId: "usr_demo_hr", title: "Attendance correction needs review", body: "Bilal Ahmed submitted a correction for a recent check-in.", href: "/attendance", hoursAgo: 5 }),
    notification({ id: "ntf_demo_admin_payroll", recipientUserId: "usr_demo_admin", title: "November payroll draft is ready", body: "The draft for November has been prepared and is waiting for review before finalization.", href: "/payroll", hoursAgo: 6 }),
    notification({ id: "ntf_demo_hr_payroll", recipientUserId: "usr_demo_hr", title: "November payroll draft is ready", body: "The draft for November has been prepared with 17 employees.", href: "/payroll", read: true, hoursAgo: 7 }),
    notification({ id: "ntf_demo_employee_approved", recipientUserId: "usr_demo_employee", title: "Your casual leave was approved", body: "Your People partner approved your recent casual leave request.", href: "/leave", read: true, hoursAgo: 26 }),
    notification({ id: "ntf_demo_employee_payslip", recipientUserId: "usr_demo_employee", title: "Your October payslip is available", body: "The October payroll has been finalized. Open Payroll to download your payslip.", href: "/payroll", hoursAgo: 30 }),
    notification({ id: "ntf_demo_taimur_sick", recipientUserId: "usr_demo_taimur", title: "Sick leave request received", body: "Your one-day sick leave request is with the People team.", href: "/leave", read: true, hoursAgo: 28 }),
    notification({ id: "ntf_demo_sarmad_leave", recipientUserId: "usr_demo_sarmad", title: "Annual leave request received", body: "Your annual leave request is with the People team for review.", href: "/leave", read: true, hoursAgo: 32 }),
    notification({ id: "ntf_demo_all_enrollment", recipientUserId: "usr_demo_employee", title: "Open enrollment closes 27 November", body: "Review your benefits choices before the deadline.", href: "/announcements", hoursAgo: 48 }),
    notification({ id: "ntf_demo_admin_enrollment", recipientUserId: "usr_demo_admin", title: "Open enrollment closes 27 November", body: "Three team members have not yet reviewed their benefits choices.", href: "/announcements", read: true, hoursAgo: 52 }),
    notification({ id: "ntf_demo_hr_enrollment", recipientUserId: "usr_demo_hr", title: "Open enrollment closes 27 November", body: "Three team members have not yet reviewed their benefits choices.", href: "/announcements", read: true, hoursAgo: 53 }),
    notification({ id: "ntf_demo_hr_lift", recipientUserId: "usr_demo_hr", title: "Lift maintenance on 18 November", body: "Share the service notice with anyone visiting the Karachi office.", href: "/announcements", read: true, hoursAgo: 80 }),
  ];

  const corrections = [];
  const bilalAccount = employees.find((item) => item.id === "emp_demo_1002");
  const daniyalAccount = employees.find((item) => item.id === "emp_demo_1008");
  const recentCorrectionDate = pastWorkdays.at(-1);
  const approvedCorrectionDate = pastWorkdays[0];
  const rejectedCorrectionDate = workDates.filter((date) => date < today).slice(-6)[0];
  const correction = ({ id, person, workDate, beforeIn, afterIn, reason, status, decidedBy, comment, daysAgo }) => ({
    id, companyId: DEMO_COMPANY_ID, employeeId: person.id, employeeName: person.name, employeeCode: person.employeeCode,
    attendanceId: `att_demo_${person.id}_${workDate}`, workDate,
    before: { checkInAt: new Date(`${workDate}T${beforeIn}:00.000Z`).toISOString(), checkOutAt: new Date(`${workDate}T12:00:00.000Z`).toISOString() },
    after: { checkInAt: new Date(`${workDate}T${afterIn}:00.000Z`).toISOString(), checkOutAt: new Date(`${workDate}T12:00:00.000Z`).toISOString() },
    reason, status, requestedBy: person.userId ?? "usr_demo_hr",
    ...(status !== "pending" ? { decidedBy, comment, decidedAt: new Date(now.getTime() - (daysAgo - 1) * 86_400_000) } : {}),
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
  });
  if (recentCorrectionDate) corrections.push(correction({
    id: "cor_demo_pending", person: bilalAccount, workDate: recentCorrectionDate,
    beforeIn: "04:42", afterIn: "04:20", status: "pending", daysAgo: 0,
    reason: "I arrived before the door scanner recorded my check-in; the building reception can confirm the time.",
  }));
  if (approvedCorrectionDate) corrections.push(correction({
    id: "cor_demo_approved", person: employeeAccount, workDate: approvedCorrectionDate,
    beforeIn: "04:52", afterIn: "04:10", status: "approved", decidedBy: "usr_demo_hr", daysAgo: 6,
    comment: "Reception confirmed the earlier arrival. Attendance has been updated.",
    reason: "The client call started at 9am and I was at my desk before the scanner came online.",
  }));
  if (rejectedCorrectionDate) corrections.push(correction({
    id: "cor_demo_rejected", person: daniyalAccount, workDate: rejectedCorrectionDate,
    beforeIn: "05:38", afterIn: "04:25", status: "rejected", decidedBy: "usr_demo_hr", daysAgo: 8,
    comment: "The desk booking and support queue both show the later start. Please ask me to adjust if you have other evidence.",
    reason: "I believe my check-in should be earlier because I joined the morning handover from home.",
  }));
  const approvedCorrection = corrections.find((item) => item.status === "approved");
  if (approvedCorrection) {
    const record = attendance.find((item) => item.id === approvedCorrection.attendanceId);
    if (record) {
      record.checkInAt = new Date(approvedCorrection.after.checkInAt);
      record.status = "present";
      record.late = false;
      record.workedSeconds = 28_800;
    }
  }

  const approvedLeaveDateKeys = new Set(leaveRequests
    .filter((leave) => leave.status === "approved")
    .flatMap((leave) => leave.dates.map((date) => `${leave.employeeId}|${date}`)));
  const makePayroll = (period, status) => {
    const bounds = monthBounds(period);
    const workdays = datesBetween(bounds.start, bounds.end).filter((date) => isWorkday(date) && !holidayDates.has(date));
    const entries = employees.filter((person) => person.status !== "exited").flatMap((person) => {
      const employed = workdays.filter((date) => date >= person.joiningDate);
      if (!employed.length) return [];
      const personalAttendance = attendance.filter((item) => item.employeeId === person.id && item.workDate >= bounds.start && item.workDate <= bounds.end);
      const elapsedDays = employed.filter((date) => date <= today && !approvedLeaveDateKeys.has(`${person.id}|${date}`));
      const elapsedAttendance = personalAttendance.filter((item) => item.workDate <= today);
      const absentDays = Math.max(0, elapsedDays.length - elapsedAttendance.length);
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
  const payrollRuns = [
    ...finalizedPeriods.map((period) => makePayroll(period, "finalized")),
    makePayroll(currentPeriod, "draft"),
  ];

  const admin = users[0];
  const hrUser = users.find((user) => user.id === "usr_demo_hr");
  const audit = ({ id, action, entity, entityId, before = null, after = null, actor = admin, daysAgo = 0, hoursAgo = 0 }) => ({
    id, companyId: DEMO_COMPANY_ID, actorUserId: actor.id, actorEmail: actor.email, actorRole: actor.role,
    action, entity, entityId, before, after,
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000 - hoursAgo * 3_600_000),
  });
  const auditLogs = [
    audit({ id: "aud_demo_setup", action: "setup.initialize", entity: "company", entityId: DEMO_COMPANY_ID, after: { name: company.name, timezone: company.timezone }, daysAgo: 240 }),
    audit({ id: "aud_demo_people", action: "employee.import", entity: "employee", entityId: employees[0].id, after: { importedCount: employees.length, source: "HR onboarding pack" }, daysAgo: 90 }),
    audit({ id: "aud_demo_role_hr", action: "user.role.change", entity: "user", entityId: "usr_demo_hr", before: { role: "EMPLOYEE" }, after: { role: "HR" }, daysAgo: 60 }),
    audit({ id: "aud_demo_dept", action: "department.rename", entity: "department", entityId: "dept_demo_product", before: { name: "Product" }, after: { name: "Product & Engineering" }, actor: hrUser, daysAgo: 45 }),
    audit({ id: "aud_demo_designation", action: "designation.rename", entity: "designation", entityId: "des_demo_engineer", before: { name: "Engineer" }, after: { name: "Software Engineer" }, actor: hrUser, daysAgo: 44 }),
    audit({ id: "aud_demo_leave_policy", action: "leave_type.update", entity: "leaveType", entityId: "lt_demo_annual", before: { name: "Annual leave", yearlyQuota: 12, active: true }, after: { yearlyQuota: 14 }, actor: hrUser, daysAgo: 38 }),
    audit({ id: "aud_demo_holiday", action: "holiday.update", entity: "holiday", entityId: "hol_demo_eid_adha", before: { date: null, name: null }, after: { date: holidays[4].date, name: holidays[4].name }, actor: hrUser, daysAgo: 34 }),
    audit({ id: "aud_demo_noor", action: "employee.update", entity: "employee", entityId: "emp_demo_1015", before: { status: "probation" }, after: { status: "probation", phone: "+92 300 555 1015", address: "DHA, Lahore" }, actor: hrUser, daysAgo: 20 }),
    audit({ id: "aud_demo_rayan_salary", action: "employee.salary.update", entity: "salaryStructure", entityId: "sal_demo_emp_demo_1013", before: { basicPaisa: 38000000 }, after: { basicPaisa: 41000000, effectiveFrom: `${currentYear}-07-01` }, actor: hrUser, daysAgo: 17 }),
    ...finalizedPeriods.slice(-4).map((period, index) => audit({
      id: `aud_demo_payroll_${period}`, action: "payroll.finalize", entity: "payrollRun", entityId: `pay_demo_${period}`,
      before: { status: "draft" }, after: { status: "finalized", period, employeeCount: employees.length },
      actor: index % 2 === 0 ? admin : hrUser, daysAgo: 3 + index * 3,
    })),
    audit({ id: "aud_demo_payroll_draft", action: "payroll.draft.create", entity: "payrollRun", entityId: `pay_demo_${currentPeriod}`, after: { period: currentPeriod, employeeCount: employees.length }, actor: hrUser, hoursAgo: 6 }),
    audit({ id: "aud_demo_leave_approved", action: "leave.approve", entity: "leaveRequest", entityId: "lev_demo_today", before: { status: "pending" }, after: { status: "approved", employee: meherAccount.name }, daysAgo: 4 }),
    audit({ id: "aud_demo_leave_approved_2", action: "leave.approve", entity: "leaveRequest", entityId: "lev_demo_approved_2", before: { status: "pending" }, after: { status: "approved", employee: hamzaAccount.name }, daysAgo: 9 }),
    audit({ id: "aud_demo_correction_request", action: "attendance.correction.request", entity: "attendanceCorrection", entityId: "cor_demo_pending", after: { workDate: recentCorrectionDate, reason: "Door scanner missed the check-in." }, actor: { id: "usr_demo_bilal", email: bilalAccount.email, role: "EMPLOYEE" }, hoursAgo: 5 }),
    audit({ id: "aud_demo_correction", action: "attendance.correction.approve", entity: "attendanceCorrection", entityId: "cor_demo_approved", before: { checkInAt: corrections.find((item) => item.id === "cor_demo_approved")?.before?.checkInAt ?? null }, after: { status: "approved" }, daysAgo: 6 }),
    audit({ id: "aud_demo_correction_rejected", action: "attendance.correction.reject", entity: "attendanceCorrection", entityId: "cor_demo_rejected", after: { status: "rejected" }, daysAgo: 8 }),
    audit({ id: "aud_demo_announcement", action: "announcement.create", entity: "announcement", entityId: "ann_demo_planning", after: { title: "Quarterly planning week begins Monday" }, hoursAgo: 2 }),
    audit({ id: "aud_demo_announcement_enrollment", action: "announcement.create", entity: "announcement", entityId: "ann_demo_enrollment", after: { title: "Open enrollment closes on 27 November" }, actor: hrUser, daysAgo: 5 }),
    audit({ id: "aud_demo_password", action: "user.password.change", entity: "user", entityId: admin.id, daysAgo: 41 }),
  ];

  const collectionsToSeed = [
    ["users", users], ["departments", departments.map((item) => ({ ...item, companyId: DEMO_COMPANY_ID, createdAt: now }))],
    ["designations", designations.map((item) => ({ ...item, companyId: DEMO_COMPANY_ID, createdAt: now }))],
    ["employees", employees], ["salaryStructures", employees.map((person) => ({ id: `sal_demo_${person.id}`, companyId: DEMO_COMPANY_ID, employeeId: person.id, basicPaisa: person.basicPaisa, effectiveFrom: person.joiningDate, createdBy: "usr_demo_admin", createdAt: now }))],
    ["leaveTypes", leaveTypes], ["holidays", holidays], ["attendance", attendance], ["leaveRequests", leaveRequests],
    ["leaveUsage", [
      { id: "usage_demo_employee_casual", companyId: DEMO_COMPANY_ID, employeeId: employeeAccount.id, leaveTypeCode: "casual", year: Number(today.slice(0, 4)), approvedDays: Math.max(1, approvedDates.length), updatedAt: now },
      { id: "usage_demo_customer_sick", companyId: DEMO_COMPANY_ID, employeeId: hamzaAccount.id, leaveTypeCode: "sick", year: Number(today.slice(0, 4)), approvedDays: 1, updatedAt: now },
      { id: "usage_demo_hr_annual", companyId: DEMO_COMPANY_ID, employeeId: hrAccount.id, leaveTypeCode: "annual", year: Number(today.slice(0, 4)), approvedDays: 1, updatedAt: now },
      { id: "usage_demo_design_annual", companyId: DEMO_COMPANY_ID, employeeId: meherAccount.id, leaveTypeCode: "annual", year: Number(today.slice(0, 4)), approvedDays: 1, updatedAt: now },
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
