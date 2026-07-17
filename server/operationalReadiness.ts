import {
  authAccounts,
  authUsers,
  branches,
  certificates,
  companies,
  contacts,
  courseSchedules,
  courses,
  documents,
  enrollments,
  equipment,
  equipmentLoans,
  externalProviders,
  leadActivities,
  leads,
  levelIIIActivities,
  levelIIIAssessments,
  levelIIIClients,
  levelIIIEquipment,
  levelIIISpecimens,
  levelIIITechnicians,
  lecturers,
  managementReviews,
  moduleAccess,
  qualityActions,
  qualityAudits,
  specimenLoans,
  specimenTypes,
  specimens,
  students,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";

export type OperationalReadinessSeverity = "critical" | "warning" | "info";
export type OperationalReadinessStatus = "healthy" | "attention" | "error";

export type OperationalReadinessAreaKey =
  | "system"
  | "access"
  | "branches"
  | "crm"
  | "training"
  | "equipment"
  | "specimens"
  | "level_iii"
  | "quality"
  | "documents";

export type OperationalReadinessIssue = {
  id: string;
  fingerprint: string;
  area: OperationalReadinessAreaKey;
  severity: OperationalReadinessSeverity;
  title: string;
  detail: string;
  action: string;
  recordType: string;
  recordId: string | number | null;
  branchId: number | null;
  branchName: string | null;
  path: string;
  qualityAction: {
    id: number;
    referenceNumber: string;
    status: string;
    dueDate: Date | string | null;
    ownerName: string | null;
  } | null;
};

export type OperationalReadinessArea = {
  key: OperationalReadinessAreaKey;
  label: string;
  status: OperationalReadinessStatus;
  total: number;
  critical: number;
  warning: number;
  info: number;
};

export type OperationalReadinessSnapshot = {
  generatedAt: string;
  status: OperationalReadinessStatus;
  scope: {
    branchId: number | null;
    branchName: string;
  };
  summary: {
    totalIssues: number;
    critical: number;
    warning: number;
    info: number;
    readyScore: number;
    affectedAreas: number;
    trackedQualityActions: number;
    untrackedIssues: number;
  };
  areas: OperationalReadinessArea[];
  issues: OperationalReadinessIssue[];
};

const AREA_LABELS: Record<OperationalReadinessAreaKey, string> = {
  system: "System Schema",
  access: "Users & Access",
  branches: "Branches",
  crm: "CRM",
  training: "Training Delivery",
  equipment: "Equipment",
  specimens: "Specimens",
  level_iii: "Level III Services",
  quality: "Quality System",
  documents: "Documents",
};

const AREA_KEYS = Object.keys(AREA_LABELS) as OperationalReadinessAreaKey[];

type IssueDraft = Omit<OperationalReadinessIssue, "id" | "fingerprint" | "qualityAction">;

function trim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseKey(value: unknown) {
  return trim(value).toLowerCase();
}

function parseDate(value: unknown) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysUntil(value: unknown, from = new Date()) {
  const parsed = parseDate(value);
  if (!parsed) return null;
  return Math.round(
    (startOfDay(parsed).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function isMissingOptionalTableError(error: unknown) {
  const message = String(
    (error as any)?.cause?.sqlMessage ||
      (error as any)?.cause?.message ||
      (error as any)?.sqlMessage ||
      (error as any)?.message ||
      error
  );

  return (
    message.includes("ER_NO_SUCH_TABLE") ||
    message.includes("doesn't exist") ||
    message.includes("does not exist")
  );
}

async function safeSelect<T>(
  label: string,
  loader: () => Promise<T[]>,
  missingTables: string[]
) {
  try {
    return await loader();
  } catch (error) {
    if (isMissingOptionalTableError(error)) {
      missingTables.push(label);
      return [] as T[];
    }

    throw error;
  }
}

function getStatusFromCounts(critical: number, warning: number): OperationalReadinessStatus {
  if (critical > 0) return "error";
  if (warning > 0) return "attention";
  return "healthy";
}

export function buildOperationalReadinessSummary(issues: OperationalReadinessIssue[]) {
  const critical = issues.filter((issue) => issue.severity === "critical").length;
  const warning = issues.filter((issue) => issue.severity === "warning").length;
  const info = issues.filter((issue) => issue.severity === "info").length;
  const trackedQualityActions = issues.filter((issue) => Boolean(issue.qualityAction)).length;
  const affectedAreas = new Set(issues.map((issue) => issue.area)).size;
  const readyScore = Math.max(0, 100 - critical * 8 - warning * 3 - info);

  return {
    status: getStatusFromCounts(critical, warning),
    summary: {
      totalIssues: issues.length,
      critical,
      warning,
      info,
      readyScore,
      affectedAreas,
      trackedQualityActions,
      untrackedIssues: Math.max(0, issues.length - trackedQualityActions),
    },
  };
}

export function getReadinessFingerprintMarker(fingerprint: string) {
  return `Readiness fingerprint: ${fingerprint}`;
}

function extractReadinessFingerprint(value: unknown) {
  const description = trim(value);
  if (!description) return null;

  const match = description.match(/Readiness fingerprint:\s*([^\r\n]+)/);
  return match?.[1]?.trim() || null;
}

function buildAreas(issues: OperationalReadinessIssue[]): OperationalReadinessArea[] {
  return AREA_KEYS.map((key) => {
    const areaIssues = issues.filter((issue) => issue.area === key);
    const critical = areaIssues.filter((issue) => issue.severity === "critical").length;
    const warning = areaIssues.filter((issue) => issue.severity === "warning").length;
    const info = areaIssues.filter((issue) => issue.severity === "info").length;

    return {
      key,
      label: AREA_LABELS[key],
      status: getStatusFromCounts(critical, warning),
      total: areaIssues.length,
      critical,
      warning,
      info,
    };
  });
}

function addIssue(
  issues: OperationalReadinessIssue[],
  issue: IssueDraft
) {
  const fingerprint = [
    issue.area,
    issue.recordType,
    issue.recordId ?? "global",
    issue.title,
  ]
    .join(":")
    .toLowerCase()
    .replace(/\s+/g, "-");

  issues.push({
    ...issue,
    fingerprint,
    id: fingerprint,
    qualityAction: null,
  });
}

function addDuplicateIssue<T extends Record<string, any>>(
  issues: OperationalReadinessIssue[],
  rows: T[],
  options: {
    area: OperationalReadinessAreaKey;
    severity: OperationalReadinessSeverity;
    fieldLabel: string;
    recordType: string;
    path: string;
    getValue: (row: T) => unknown;
    getRecordLabel: (row: T) => string;
    getBranchId?: (row: T) => number | null | undefined;
    getBranchName?: (branchId: number | null | undefined) => string | null;
    action: string;
  }
) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const key = normaliseKey(options.getValue(row));
    if (!key) continue;
    const existing = grouped.get(key) ?? [];
    existing.push(row);
    grouped.set(key, existing);
  }

  for (const [key, duplicates] of Array.from(grouped.entries())) {
    if (duplicates.length < 2) continue;
    const first = duplicates[0];
    const branchId = options.getBranchId?.(first) ?? null;

    addIssue(issues, {
      area: options.area,
      severity: options.severity,
      title: `Duplicate ${options.fieldLabel}`,
      detail: `${duplicates.length} ${options.recordType} records share "${key}". Examples: ${duplicates
        .slice(0, 4)
        .map(options.getRecordLabel)
        .join(", ")}.`,
      action: options.action,
      recordType: options.recordType,
      recordId: first?.id ?? key,
      branchId,
      branchName: options.getBranchName?.(branchId) ?? null,
      path: options.path,
    });
  }
}

function getBranchScopedRows<T extends { branchId?: number | null }>(
  rows: T[],
  branchId: number | null
) {
  return branchId === null ? rows : rows.filter((row) => row.branchId === branchId);
}

export async function buildOperationalReadinessSnapshot(
  branchId?: number | null
): Promise<OperationalReadinessSnapshot> {
  const db = getDb();
  const missingTables: string[] = [];
  const selectedBranchId = branchId ?? null;

  const [
    branchRows,
    userRows,
    authUserRows,
    authAccountRows,
    moduleAccessRows,
    studentRows,
    leadRows,
    companyRows,
    contactRows,
    leadActivityRows,
    courseRows,
    scheduleRows,
    enrollmentRows,
    lecturerRows,
    equipmentRows,
    equipmentLoanRows,
    specimenRows,
    specimenTypeRows,
    specimenLoanRows,
    documentRows,
    certificateRows,
    levelIIIClientRows,
    levelIIIActivityRows,
    levelIIITechnicianRows,
    levelIIIAssessmentRows,
    levelIIIEquipmentRows,
    levelIIISpecimenRows,
    qualityActionRows,
    qualityAuditRows,
    managementReviewRows,
    externalProviderRows,
  ] = await Promise.all([
    safeSelect("Branches", () => db.select().from(branches), missingTables),
    safeSelect("Application Users", () => db.select().from(users), missingTables),
    safeSelect("Authentication Users", () => db.select().from(authUsers), missingTables),
    safeSelect("Authentication Accounts", () => db.select().from(authAccounts), missingTables),
    safeSelect("Page Access Permissions", () => db.select().from(moduleAccess), missingTables),
    safeSelect("Students", () => db.select().from(students), missingTables),
    safeSelect("Leads", () => db.select().from(leads), missingTables),
    safeSelect("Companies", () => db.select().from(companies), missingTables),
    safeSelect("Contacts", () => db.select().from(contacts), missingTables),
    safeSelect("Lead Activities", () => db.select().from(leadActivities), missingTables),
    safeSelect("Courses", () => db.select().from(courses), missingTables),
    safeSelect("Course Schedules", () => db.select().from(courseSchedules), missingTables),
    safeSelect("Enrolments", () => db.select().from(enrollments), missingTables),
    safeSelect("Lecturers", () => db.select().from(lecturers), missingTables),
    safeSelect("Equipment", () => db.select().from(equipment), missingTables),
    safeSelect("Equipment Loans", () => db.select().from(equipmentLoans), missingTables),
    safeSelect("Specimens", () => db.select().from(specimens), missingTables),
    safeSelect("Specimen Types", () => db.select().from(specimenTypes), missingTables),
    safeSelect("Specimen Loans", () => db.select().from(specimenLoans), missingTables),
    safeSelect("Documents", () => db.select().from(documents), missingTables),
    safeSelect("Certificates", () => db.select().from(certificates), missingTables),
    safeSelect("Level III Clients", () => db.select().from(levelIIIClients), missingTables),
    safeSelect("Level III Activities", () => db.select().from(levelIIIActivities), missingTables),
    safeSelect("Level III Technicians", () => db.select().from(levelIIITechnicians), missingTables),
    safeSelect("Level III Assessments", () => db.select().from(levelIIIAssessments), missingTables),
    safeSelect("Level III Equipment", () => db.select().from(levelIIIEquipment), missingTables),
    safeSelect("Level III Specimens", () => db.select().from(levelIIISpecimens), missingTables),
    safeSelect("Quality Actions", () => db.select().from(qualityActions), missingTables),
    safeSelect("Quality Audits", () => db.select().from(qualityAudits), missingTables),
    safeSelect("Management Reviews", () => db.select().from(managementReviews), missingTables),
    safeSelect("External Providers", () => db.select().from(externalProviders), missingTables),
  ]);

  const issues: OperationalReadinessIssue[] = [];
  const branchMap = new Map(branchRows.map((branch: any) => [branch.id, branch]));
  const branchName = (id: number | null | undefined) =>
    id ? branchMap.get(id)?.name ?? `Branch #${id}` : null;
  const selectedBranch = selectedBranchId ? branchMap.get(selectedBranchId) : null;

  for (const tableLabel of missingTables) {
    addIssue(issues, {
      area: "system",
      severity: "critical",
      title: `${tableLabel} table is missing`,
      detail: `The live database does not currently expose the ${tableLabel} table.`,
      action: "Open Admin > Health and run Schema Readiness / Repair SQL before using this module.",
      recordType: "databaseTable",
      recordId: tableLabel,
      branchId: null,
      branchName: null,
      path: "/admin",
    });
  }

  if (selectedBranchId && !selectedBranch) {
    addIssue(issues, {
      area: "branches",
      severity: "critical",
      title: "Selected branch was not found",
      detail: `Branch #${selectedBranchId} was requested but does not exist in the branch register.`,
      action: "Check the branch list and re-run the readiness snapshot.",
      recordType: "branch",
      recordId: selectedBranchId,
      branchId: selectedBranchId,
      branchName: null,
      path: "/admin",
    });
  }

  const activeBranches = branchRows.filter((branch: any) => branch.active);
  if (activeBranches.length === 0) {
    addIssue(issues, {
      area: "branches",
      severity: "critical",
      title: "No active branches configured",
      detail: "Branch-aware scheduling, assets, and branding need at least one active branch.",
      action: "Create or activate at least one branch in Admin > Branches.",
      recordType: "branch",
      recordId: null,
      branchId: null,
      branchName: null,
      path: "/admin",
    });
  }

  for (const branch of branchRows as any[]) {
    if (!branch.active) continue;
    if (!trim(branch.code)) {
      addIssue(issues, {
        area: "branches",
        severity: "warning",
        title: "Branch code is missing",
        detail: `${branch.name} does not have a branch code, which makes schedule imports and exports harder to reconcile.`,
        action: "Add a short unique branch code.",
        recordType: "branch",
        recordId: branch.id,
        branchId: branch.id,
        branchName: branch.name,
        path: "/admin",
      });
    }
    if (!trim(branch.companyName) || !trim(branch.logoUrl)) {
      addIssue(issues, {
        area: "branches",
        severity: "info",
        title: "Branch branding is incomplete",
        detail: `${branch.name} is missing a company name or logo. Generated forms may fall back to generic branding.`,
        action: "Complete branch branding in Admin > Branches.",
        recordType: "branch",
        recordId: branch.id,
        branchId: branch.id,
        branchName: branch.name,
        path: "/admin",
      });
    }
  }

  const authUsersByEmail = new Map(authUserRows.map((row: any) => [normaliseKey(row.email), row]));
  const authUsersById = new Map(authUserRows.map((row: any) => [row.id, row]));
  const authUsersWithPassword = new Set(
    authAccountRows
      .filter((row: any) => trim(row.password))
      .map((row: any) => row.userId)
  );
  const accessByUserId = new Map<number, any[]>();
  for (const access of moduleAccessRows as any[]) {
    accessByUserId.set(access.userId, [...(accessByUserId.get(access.userId) ?? []), access]);
  }

  for (const appUser of userRows as any[]) {
    const authUser = appUser.authId
      ? authUsersById.get(appUser.authId)
      : authUsersByEmail.get(normaliseKey(appUser.email));
    if (!trim(appUser.email)) {
      addIssue(issues, {
        area: "access",
        severity: "critical",
        title: "User has no email address",
        detail: `${appUser.name || `User #${appUser.id}`} cannot sign in without an email address.`,
        action: "Edit the user and add a unique email address.",
        recordType: "user",
        recordId: appUser.id,
        branchId: null,
        branchName: null,
        path: "/admin",
      });
    } else if (!authUser || !authUsersWithPassword.has(authUser.id)) {
      addIssue(issues, {
        area: "access",
        severity: "critical",
        title: "User cannot sign in yet",
        detail: `${appUser.email} does not have a complete local password credential.`,
        action: "Edit the user and set a password, or use Forgot Password to create one.",
        recordType: "user",
        recordId: appUser.id,
        branchId: null,
        branchName: null,
        path: "/admin",
      });
    }

    if (appUser.role === "user") {
      const accessRows = accessByUserId.get(appUser.id) ?? [];
      const hasAnyPageAccess = accessRows.some((row) => row.canView);
      if (!hasAnyPageAccess) {
        addIssue(issues, {
          area: "access",
          severity: "warning",
          title: "User has no page access",
          detail: `${appUser.email || appUser.name || `User #${appUser.id}`} is a normal user with no visible application modules.`,
          action: "Use Manage Access to tick the pages and actions this user needs.",
          recordType: "user",
          recordId: appUser.id,
          branchId: null,
          branchName: null,
          path: "/admin",
        });
      }
    }
  }

  const scopedStudents = getBranchScopedRows(studentRows as any[], selectedBranchId);
  const scopedLeads = getBranchScopedRows(leadRows as any[], selectedBranchId);
  const scopedCompanies = getBranchScopedRows(companyRows as any[], selectedBranchId);
  const scopedCourses = getBranchScopedRows(courseRows as any[], selectedBranchId);
  const scopedSchedules = getBranchScopedRows(scheduleRows as any[], selectedBranchId);
  const scopedEquipment = getBranchScopedRows(equipmentRows as any[], selectedBranchId);
  const scopedSpecimens = getBranchScopedRows(specimenRows as any[], selectedBranchId);
  const scheduleIds = new Set(scopedSchedules.map((schedule: any) => schedule.id));
  const scopedEnrollments = selectedBranchId === null
    ? (enrollmentRows as any[])
    : (enrollmentRows as any[]).filter((enrollment) => scheduleIds.has(enrollment.courseScheduleId));

  addDuplicateIssue(issues, scopedStudents, {
    area: "training",
    severity: "critical",
    fieldLabel: "student ID number",
    recordType: "student",
    path: "/students",
    getValue: (row) => row.idNumber,
    getRecordLabel: (row) => `${row.firstName} ${row.lastName}`,
    getBranchId: (row) => row.branchId,
    getBranchName: branchName,
    action: "Merge or correct duplicate student identity records.",
  });

  addDuplicateIssue(issues, scopedStudents, {
    area: "training",
    severity: "critical",
    fieldLabel: "student passport number",
    recordType: "student",
    path: "/students",
    getValue: (row) => row.passportNumber,
    getRecordLabel: (row) => `${row.firstName} ${row.lastName}`,
    getBranchId: (row) => row.branchId,
    getBranchName: branchName,
    action: "Merge or correct duplicate student identity records.",
  });

  for (const student of scopedStudents) {
    if (student.active && !student.branchId) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Active student is not linked to a branch",
        detail: `${student.firstName} ${student.lastName} is active but has no branch.`,
        action: "Edit the student and select the correct branch.",
        recordType: "student",
        recordId: student.id,
        branchId: null,
        branchName: null,
        path: "/students",
      });
    }
    if (student.active && !trim(student.studentNumber)) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Student number is missing",
        detail: `${student.firstName} ${student.lastName} does not have a student number.`,
        action: "Edit/save the student record so the student number can be generated or corrected.",
        recordType: "student",
        recordId: student.id,
        branchId: student.branchId ?? null,
        branchName: branchName(student.branchId),
        path: "/students",
      });
    }
  }

  for (const lead of scopedLeads) {
    const followUpDays = daysUntil(lead.followUpDate);
    const isOpenLead = !["Converted", "Closed Lost"].includes(lead.status) && !lead.isBlacklisted;
    if (isOpenLead && lead.autoFollowUp && followUpDays !== null && followUpDays < 0) {
      addIssue(issues, {
        area: "crm",
        severity: "warning",
        title: "Lead follow-up is overdue",
        detail: `${lead.firstName} ${lead.lastName} is ${Math.abs(followUpDays)} day(s) overdue for follow-up.`,
        action: "Open Leads and complete or reschedule the follow-up.",
        recordType: "lead",
        recordId: lead.id,
        branchId: lead.branchId ?? null,
        branchName: branchName(lead.branchId),
        path: "/leads",
      });
    }
    if (isOpenLead && !lead.followUpDate) {
      addIssue(issues, {
        area: "crm",
        severity: "info",
        title: "Open lead has no follow-up date",
        detail: `${lead.firstName} ${lead.lastName} is open but not scheduled for contact.`,
        action: "Add a follow-up date or activity reminder.",
        recordType: "lead",
        recordId: lead.id,
        branchId: lead.branchId ?? null,
        branchName: branchName(lead.branchId),
        path: "/leads",
      });
    }
  }

  for (const company of scopedCompanies) {
    if (!trim(company.primaryContactEmail) && !trim(company.email)) {
      addIssue(issues, {
        area: "crm",
        severity: "info",
        title: "Company email contact is missing",
        detail: `${company.name} has no company or primary contact email.`,
        action: "Add contact details for reliable CRM follow-up.",
        recordType: "company",
        recordId: company.id,
        branchId: company.branchId ?? null,
        branchName: branchName(company.branchId),
        path: "/companies",
      });
    }
  }

  const contactCompanyIds = new Set((contactRows as any[]).map((contact) => contact.companyId).filter(Boolean));
  for (const company of scopedCompanies) {
    if (!company.primaryContactName && !contactCompanyIds.has(company.id)) {
      addIssue(issues, {
        area: "crm",
        severity: "info",
        title: "Company has no saved contact person",
        detail: `${company.name} has no primary contact and no linked contact records.`,
        action: "Add at least one contact person for this company.",
        recordType: "company",
        recordId: company.id,
        branchId: company.branchId ?? null,
        branchName: branchName(company.branchId),
        path: "/companies",
      });
    }
  }

  const courseById = new Map((courseRows as any[]).map((course) => [course.id, course]));
  const lecturerById = new Map((lecturerRows as any[]).map((lecturer) => [lecturer.id, lecturer]));
  const studentById = new Map((studentRows as any[]).map((student) => [student.id, student]));
  const scheduleById = new Map((scheduleRows as any[]).map((schedule) => [schedule.id, schedule]));
  const activeEnrollmentCountBySchedule = new Map<number, number>();

  for (const enrollment of scopedEnrollments) {
    if (enrollment.status === "Active") {
      activeEnrollmentCountBySchedule.set(
        enrollment.courseScheduleId,
        (activeEnrollmentCountBySchedule.get(enrollment.courseScheduleId) ?? 0) + 1
      );
    }
  }

  for (const course of scopedCourses) {
    if (course.active && (!course.duration || course.duration <= 0)) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Course duration is missing",
        detail: `${course.code} - ${course.name} has no duration configured.`,
        action: "Add duration so schedule end dates and planning checks remain reliable.",
        recordType: "course",
        recordId: course.id,
        branchId: course.branchId ?? null,
        branchName: branchName(course.branchId),
        path: "/courses",
      });
    }
  }

  for (const schedule of scopedSchedules) {
    const course = courseById.get(schedule.courseId);
    const lecturer = schedule.lecturerId ? lecturerById.get(schedule.lecturerId) : null;
    const start = parseDate(schedule.startDate);
    const end = parseDate(schedule.endDate);
    const label = course ? `${course.code} - ${course.name}` : `Schedule #${schedule.id}`;

    if (!course) {
      addIssue(issues, {
        area: "training",
        severity: "critical",
        title: "Schedule points to a missing course",
        detail: `Schedule #${schedule.id} references course #${schedule.courseId}, which cannot be found.`,
        action: "Edit the schedule and select a valid course.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId ?? null,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    }
    if (!schedule.branchId) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Schedule has no branch",
        detail: `${label} is not branch-specific.`,
        action: "Edit the schedule and choose the branch first.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: null,
        branchName: null,
        path: "/schedules",
      });
    }
    if (!schedule.lecturerId) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Schedule has no lecturer",
        detail: `${label} has no lecturer assigned.`,
        action: "Assign a lecturer before students are enrolled.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId ?? null,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    } else if (!lecturer) {
      addIssue(issues, {
        area: "training",
        severity: "critical",
        title: "Schedule points to a missing lecturer",
        detail: `${label} references lecturer #${schedule.lecturerId}, which cannot be found.`,
        action: "Edit the schedule and select a valid lecturer.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId ?? null,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    } else if (schedule.branchId && lecturer.branchId && schedule.branchId !== lecturer.branchId) {
      addIssue(issues, {
        area: "training",
        severity: "critical",
        title: "Lecturer branch mismatch",
        detail: `${label} is assigned to ${branchName(schedule.branchId)}, but the lecturer belongs to ${branchName(lecturer.branchId)}.`,
        action: "Change the schedule branch or assign a lecturer from the same branch.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    }
    if (start && end && end < start) {
      addIssue(issues, {
        area: "training",
        severity: "critical",
        title: "Schedule end date is before start date",
        detail: `${label} has an invalid date range.`,
        action: "Correct the start/end dates. The end date should normally be the final exam day.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId ?? null,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    }
    const examStart = parseDate(schedule.endOfCourseExamStartDate);
    const examEnd = parseDate(schedule.endOfCourseExamEndDate);
    if (examStart && examEnd && examEnd < examStart) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Exam date range is invalid",
        detail: `${label} has an exam end date before the exam start date.`,
        action: "Correct the exam date range on the schedule.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId ?? null,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    }
    if (!schedule.maxCapacity || schedule.maxCapacity <= 0) {
      addIssue(issues, {
        area: "training",
        severity: "warning",
        title: "Schedule capacity is missing",
        detail: `${label} has no usable maximum capacity.`,
        action: "Add a max capacity so seat enforcement can work correctly.",
        recordType: "schedule",
        recordId: schedule.id,
        branchId: schedule.branchId ?? null,
        branchName: branchName(schedule.branchId),
        path: "/schedules",
      });
    } else {
      const activeCount = activeEnrollmentCountBySchedule.get(schedule.id) ?? 0;
      if (activeCount > schedule.maxCapacity) {
        addIssue(issues, {
          area: "training",
          severity: "critical",
          title: "Schedule is over capacity",
          detail: `${label} has ${activeCount} active enrolments against capacity ${schedule.maxCapacity}.`,
          action: "Move students, increase capacity if valid, or resolve duplicate enrolments.",
          recordType: "schedule",
          recordId: schedule.id,
          branchId: schedule.branchId ?? null,
          branchName: branchName(schedule.branchId),
          path: "/enrollments",
        });
      }
    }
  }

  const enrollmentKeyMap = new Map<string, any[]>();
  for (const enrollment of scopedEnrollments) {
    const key = `${enrollment.studentId}:${enrollment.courseScheduleId}`;
    enrollmentKeyMap.set(key, [...(enrollmentKeyMap.get(key) ?? []), enrollment]);
    if (!studentById.has(enrollment.studentId)) {
      addIssue(issues, {
        area: "training",
        severity: "critical",
        title: "Enrolment points to missing student",
        detail: `Enrolment #${enrollment.id} references student #${enrollment.studentId}.`,
        action: "Correct or remove the enrolment record.",
        recordType: "enrolment",
        recordId: enrollment.id,
        branchId: null,
        branchName: null,
        path: "/enrollments",
      });
    }
    if (!scheduleById.has(enrollment.courseScheduleId)) {
      addIssue(issues, {
        area: "training",
        severity: "critical",
        title: "Enrolment points to missing schedule",
        detail: `Enrolment #${enrollment.id} references schedule #${enrollment.courseScheduleId}.`,
        action: "Correct or remove the enrolment record.",
        recordType: "enrolment",
        recordId: enrollment.id,
        branchId: null,
        branchName: null,
        path: "/enrollments",
      });
    }
  }
  for (const duplicates of Array.from(enrollmentKeyMap.values())) {
    if (duplicates.length < 2) continue;
    const first = duplicates[0];
    addIssue(issues, {
      area: "training",
      severity: "critical",
      title: "Duplicate enrolment",
      detail: `Student #${first.studentId} is enrolled ${duplicates.length} times on schedule #${first.courseScheduleId}.`,
      action: "Keep one enrolment and remove or withdraw the duplicates.",
      recordType: "enrolment",
      recordId: first.id,
      branchId: scheduleById.get(first.courseScheduleId)?.branchId ?? null,
      branchName: branchName(scheduleById.get(first.courseScheduleId)?.branchId),
      path: "/enrollments",
    });
  }

  addDuplicateIssue(issues, scopedEquipment, {
    area: "equipment",
    severity: "critical",
    fieldLabel: "equipment serial number",
    recordType: "equipment",
    path: "/equipment",
    getValue: (row) => row.serialNumber,
    getRecordLabel: (row) => `${row.name} (#${row.id})`,
    getBranchId: (row) => row.branchId,
    getBranchName: branchName,
    action: "Serial numbers must be unique. Correct the duplicated equipment records.",
  });

  for (const item of scopedEquipment) {
    if (item.status !== "Active") continue;
    const dueIn = daysUntil(item.nextDueDate);
    if (!trim(item.serialNumber)) {
      addIssue(issues, {
        area: "equipment",
        severity: "warning",
        title: "Active equipment has no serial number",
        detail: `${item.name} is active but has no serial number.`,
        action: "Add the serial number so duplicate and calibration tracking remains reliable.",
        recordType: "equipment",
        recordId: item.id,
        branchId: item.branchId ?? null,
        branchName: branchName(item.branchId),
        path: "/equipment",
      });
    }
    if (!item.branchId) {
      addIssue(issues, {
        area: "equipment",
        severity: "warning",
        title: "Active equipment has no branch",
        detail: `${item.name} is active but not assigned to a branch.`,
        action: "Assign the owning branch, or mark it as Level III/shared where appropriate.",
        recordType: "equipment",
        recordId: item.id,
        branchId: null,
        branchName: null,
        path: "/equipment",
      });
    }
    if (dueIn === null) {
      addIssue(issues, {
        area: "equipment",
        severity: "warning",
        title: "Calibration due date is missing",
        detail: `${item.name}${item.serialNumber ? ` (${item.serialNumber})` : ""} has no next due date.`,
        action: "Add the next calibration due date.",
        recordType: "equipment",
        recordId: item.id,
        branchId: item.branchId ?? null,
        branchName: branchName(item.branchId),
        path: "/equipment",
      });
    } else if (dueIn < 0) {
      addIssue(issues, {
        area: "equipment",
        severity: "critical",
        title: "Calibration is overdue",
        detail: `${item.name}${item.serialNumber ? ` (${item.serialNumber})` : ""} is ${Math.abs(dueIn)} day(s) overdue.`,
        action: "Calibrate, upload/link the certificate, and update the next due date.",
        recordType: "equipment",
        recordId: item.id,
        branchId: item.branchId ?? null,
        branchName: branchName(item.branchId),
        path: "/equipment",
      });
    } else if (dueIn <= 30) {
      addIssue(issues, {
        area: "equipment",
        severity: "warning",
        title: "Calibration due soon",
        detail: `${item.name}${item.serialNumber ? ` (${item.serialNumber})` : ""} is due in ${dueIn} day(s).`,
        action: "Schedule calibration before the due date.",
        recordType: "equipment",
        recordId: item.id,
        branchId: item.branchId ?? null,
        branchName: branchName(item.branchId),
        path: "/equipment",
      });
    }
  }

  for (const loan of equipmentLoanRows as any[]) {
    if (selectedBranchId !== null && loan.fromBranchId !== selectedBranchId && loan.toBranchId !== selectedBranchId) {
      continue;
    }
    const dueIn = daysUntil(loan.expectedReturnDate);
    if (!loan.returnedAt && dueIn !== null && dueIn < 0) {
      addIssue(issues, {
        area: "equipment",
        severity: "warning",
        title: "Equipment loan return is overdue",
        detail: `Equipment loan #${loan.id} was expected back ${Math.abs(dueIn)} day(s) ago.`,
        action: "Confirm the location and return or extend the loan.",
        recordType: "equipmentLoan",
        recordId: loan.id,
        branchId: loan.toBranchId ?? null,
        branchName: branchName(loan.toBranchId),
        path: "/equipment",
      });
    }
  }

  const specimenTypeById = new Map((specimenTypeRows as any[]).map((type) => [type.id, type]));
  addDuplicateIssue(issues, scopedSpecimens, {
    area: "specimens",
    severity: "warning",
    fieldLabel: "specimen serial number",
    recordType: "specimen",
    path: "/specimens",
    getValue: (row) => row.serialNumber,
    getRecordLabel: (row) => `${row.name} (#${row.id})`,
    getBranchId: (row) => row.branchId,
    getBranchName: branchName,
    action: "Confirm whether these are truly different specimens and correct the numbers if needed.",
  });

  for (const specimen of scopedSpecimens) {
    if (!specimenTypeById.has(specimen.specimenTypeId)) {
      addIssue(issues, {
        area: "specimens",
        severity: "critical",
        title: "Specimen type is missing",
        detail: `${specimen.name} references specimen type #${specimen.specimenTypeId}, which cannot be found.`,
        action: "Edit the specimen and select a valid admin-defined specimen type.",
        recordType: "specimen",
        recordId: specimen.id,
        branchId: specimen.branchId ?? null,
        branchName: branchName(specimen.branchId),
        path: "/specimens",
      });
    }
    if (!specimen.branchId) {
      addIssue(issues, {
        area: "specimens",
        severity: "warning",
        title: "Specimen has no branch",
        detail: `${specimen.name} is not assigned to an owning branch.`,
        action: "Assign the owning branch or record it under Level III if it belongs there.",
        recordType: "specimen",
        recordId: specimen.id,
        branchId: null,
        branchName: null,
        path: "/specimens",
      });
    }
    if (specimen.masteringStatus === "Re-master Required") {
      addIssue(issues, {
        area: "specimens",
        severity: "warning",
        title: "Specimen needs re-mastering",
        detail: `${specimen.name} is marked as requiring re-mastering.`,
        action: "Re-master the specimen or update its status.",
        recordType: "specimen",
        recordId: specimen.id,
        branchId: specimen.branchId ?? null,
        branchName: branchName(specimen.branchId),
        path: "/specimens",
      });
    }
  }

  for (const loan of specimenLoanRows as any[]) {
    if (selectedBranchId !== null && loan.fromBranchId !== selectedBranchId && loan.toBranchId !== selectedBranchId) {
      continue;
    }
    const dueIn = daysUntil(loan.expectedReturnDate);
    if (!loan.returnedAt && dueIn !== null && dueIn < 0) {
      addIssue(issues, {
        area: "specimens",
        severity: "warning",
        title: "Specimen loan return is overdue",
        detail: `Specimen loan #${loan.id} was expected back ${Math.abs(dueIn)} day(s) ago.`,
        action: "Confirm the location and return or extend the loan.",
        recordType: "specimenLoan",
        recordId: loan.id,
        branchId: loan.toBranchId ?? null,
        branchName: branchName(loan.toBranchId),
        path: "/specimens",
      });
    }
  }

  for (const document of documentRows as any[]) {
    if (selectedBranchId !== null && document.branchId !== selectedBranchId && document.branchId !== null) {
      continue;
    }
    if (!trim(document.url)) {
      addIssue(issues, {
        area: "documents",
        severity: "critical",
        title: "Document has no file or link",
        detail: `${document.title} has an empty document URL.`,
        action: "Upload, import, or link the document again.",
        recordType: "document",
        recordId: document.id,
        branchId: document.branchId ?? null,
        branchName: branchName(document.branchId),
        path: "/documents",
      });
    }
  }

  const activeCertificatesWithExpiry = (certificateRows as any[]).filter(
    (certificate) => certificate.status === "Active" && certificate.expiryDate
  );
  for (const certificate of activeCertificatesWithExpiry) {
    addIssue(issues, {
      area: "documents",
      severity: "info",
      title: "Certificate has an expiry date",
      detail: `${certificate.certificateNumber} has an expiry date, but TextPoint course attendance certificates normally do not expire.`,
      action: "Confirm whether this record should instead track PCN/internal review elsewhere.",
      recordType: "certificate",
      recordId: certificate.id,
      branchId: null,
      branchName: null,
      path: "/students",
    });
  }

  const levelIIIClientById = new Map((levelIIIClientRows as any[]).map((client) => [client.id, client]));
  for (const client of levelIIIClientRows as any[]) {
    const visitDue = daysUntil(client.nextVisit);
    if (visitDue === null) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Level III client has no next visit date",
        detail: `${client.companyName} has no next visit/contact date.`,
        action: "Set the next visit date so reminders can work.",
        recordType: "levelIIIClient",
        recordId: client.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (visitDue < 0) {
      addIssue(issues, {
        area: "level_iii",
        severity: "critical",
        title: "Level III client visit is overdue",
        detail: `${client.companyName} is ${Math.abs(visitDue)} day(s) overdue for contact or visit.`,
        action: "Record a visit/activity and update the next visit date.",
        recordType: "levelIIIClient",
        recordId: client.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (visitDue <= 30) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Level III client visit due soon",
        detail: `${client.companyName} is due for contact or visit in ${visitDue} day(s).`,
        action: "Plan the visit/activity.",
        recordType: "levelIIIClient",
        recordId: client.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
    if (!client.procedureUpdatedAt) {
      addIssue(issues, {
        area: "level_iii",
        severity: "info",
        title: "Procedure update date is missing",
        detail: `${client.companyName} has no last procedure update/review date captured.`,
        action: "Capture the latest procedure update date.",
        recordType: "levelIIIClient",
        recordId: client.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
  }

  for (const technician of levelIIITechnicianRows as any[]) {
    if (!levelIIIClientById.has(technician.clientId)) {
      addIssue(issues, {
        area: "level_iii",
        severity: "critical",
        title: "Technician is not linked to a valid client",
        detail: `${technician.name} references client #${technician.clientId}, which cannot be found.`,
        action: "Edit the technician and link the correct Level III client.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
    const methods = Array.isArray(technician.methods) ? technician.methods : [];
    if (methods.length === 0 && !trim(technician.method)) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Technician methods are missing",
        detail: `${technician.name} has no NDT methods recorded.`,
        action: "Tick the technician's qualified methods.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }

    const qualificationDue = technician.hasPcnQualification
      ? daysUntil(technician.pcnRenewalDate)
      : daysUntil(technician.internalAssessmentDate);
    if (qualificationDue === null) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Technician review date is missing",
        detail: `${technician.name} has no ${technician.hasPcnQualification ? "PCN renewal" : "internal assessment"} date captured.`,
        action: "Add the review/renewal date so reminders can work.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (qualificationDue < 0) {
      addIssue(issues, {
        area: "level_iii",
        severity: "critical",
        title: "Technician qualification review is overdue",
        detail: `${technician.name} is ${Math.abs(qualificationDue)} day(s) overdue for ${technician.hasPcnQualification ? "PCN renewal" : "internal assessment"}.`,
        action: "Review/renew the qualification and update the date.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (qualificationDue <= 60) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Technician qualification review due soon",
        detail: `${technician.name} is due in ${qualificationDue} day(s).`,
        action: "Plan the renewal/reassessment.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }

    const eyeTestDue = daysUntil(technician.eyeTestValidUntil);
    if (eyeTestDue === null) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Eye test date is missing",
        detail: `${technician.name} has no valid-until date for eye test tracking.`,
        action: "Capture the eye test validity date.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (eyeTestDue < 0) {
      addIssue(issues, {
        area: "level_iii",
        severity: "critical",
        title: "Eye test is overdue",
        detail: `${technician.name}'s eye test expired ${Math.abs(eyeTestDue)} day(s) ago.`,
        action: "Request an updated eye test and update the technician record.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (eyeTestDue <= 60) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Eye test due soon",
        detail: `${technician.name}'s eye test expires in ${eyeTestDue} day(s).`,
        action: "Request renewal before expiry.",
        recordType: "levelIIITechnician",
        recordId: technician.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
  }

  addDuplicateIssue(issues, levelIIIEquipmentRows as any[], {
    area: "level_iii",
    severity: "critical",
    fieldLabel: "Level III equipment serial number",
    recordType: "levelIIIEquipment",
    path: "/level-iii",
    getValue: (row) => row.serialNumber,
    getRecordLabel: (row) => `${row.name} (#${row.id})`,
    action: "Correct duplicated Level III equipment serial numbers.",
  });

  for (const item of levelIIIEquipmentRows as any[]) {
    const dueIn = daysUntil(item.nextDueDate);
    if (dueIn === null) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Level III equipment calibration date is missing",
        detail: `${item.name} has no next calibration due date.`,
        action: "Add the next due date.",
        recordType: "levelIIIEquipment",
        recordId: item.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    } else if (dueIn < 0) {
      addIssue(issues, {
        area: "level_iii",
        severity: "critical",
        title: "Level III equipment calibration is overdue",
        detail: `${item.name} is ${Math.abs(dueIn)} day(s) overdue.`,
        action: "Calibrate/update the equipment record.",
        recordType: "levelIIIEquipment",
        recordId: item.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
  }

  for (const specimen of levelIIISpecimenRows as any[]) {
    if (specimen.masteringStatus === "Re-master Required") {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Level III specimen needs re-mastering",
        detail: `${specimen.specimenNumber} - ${specimen.name} is marked as requiring re-mastering.`,
        action: "Re-master the specimen or update its status.",
        recordType: "levelIIISpecimen",
        recordId: specimen.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
  }

  for (const action of qualityActionRows as any[]) {
    if (selectedBranchId !== null && action.branchId !== selectedBranchId) continue;
    if (action.status === "Closed") continue;
    const dueIn = daysUntil(action.dueDate);
    if (dueIn !== null && dueIn < 0) {
      addIssue(issues, {
        area: "quality",
        severity: "critical",
        title: "Quality action is overdue",
        detail: `${action.referenceNumber} - ${action.title} is ${Math.abs(dueIn)} day(s) overdue.`,
        action: "Update, close, or reschedule the quality action.",
        recordType: "qualityAction",
        recordId: action.id,
        branchId: action.branchId ?? null,
        branchName: branchName(action.branchId),
        path: "/quality",
      });
    } else if (dueIn !== null && dueIn <= 30) {
      addIssue(issues, {
        area: "quality",
        severity: "warning",
        title: "Quality action due soon",
        detail: `${action.referenceNumber} - ${action.title} is due in ${dueIn} day(s).`,
        action: "Review progress before the due date.",
        recordType: "qualityAction",
        recordId: action.id,
        branchId: action.branchId ?? null,
        branchName: branchName(action.branchId),
        path: "/quality",
      });
    }
  }

  for (const audit of qualityAuditRows as any[]) {
    if (selectedBranchId !== null && audit.branchId !== selectedBranchId) continue;
    const plannedIn = daysUntil(audit.plannedDate);
    if (audit.status !== "Completed" && audit.status !== "Cancelled" && plannedIn !== null && plannedIn < 0) {
      addIssue(issues, {
        area: "quality",
        severity: "warning",
        title: "Quality audit is overdue",
        detail: `${audit.referenceNumber} - ${audit.title} was planned ${Math.abs(plannedIn)} day(s) ago.`,
        action: "Complete, reschedule, or cancel the audit.",
        recordType: "qualityAudit",
        recordId: audit.id,
        branchId: audit.branchId ?? null,
        branchName: branchName(audit.branchId),
        path: "/quality",
      });
    }
  }

  for (const review of managementReviewRows as any[]) {
    if (selectedBranchId !== null && review.branchId !== selectedBranchId) continue;
    const nextDue = daysUntil(review.nextReviewDate);
    if (nextDue !== null && nextDue < 0 && review.status !== "Closed" && review.status !== "Cancelled") {
      addIssue(issues, {
        area: "quality",
        severity: "warning",
        title: "Management review follow-up is overdue",
        detail: `${review.referenceNumber} - ${review.title} needs follow-up.`,
        action: "Update the management review record.",
        recordType: "managementReview",
        recordId: review.id,
        branchId: review.branchId ?? null,
        branchName: branchName(review.branchId),
        path: "/quality",
      });
    }
  }

  for (const provider of externalProviderRows as any[]) {
    if (selectedBranchId !== null && provider.branchId !== selectedBranchId) continue;
    const evaluationDue = daysUntil(provider.nextEvaluationDate);
    if (provider.status !== "Inactive" && provider.status !== "Suspended" && evaluationDue !== null && evaluationDue < 0) {
      addIssue(issues, {
        area: "quality",
        severity: "warning",
        title: "External provider evaluation is overdue",
        detail: `${provider.companyName} is ${Math.abs(evaluationDue)} day(s) overdue for evaluation.`,
        action: "Review the provider and update the next evaluation date.",
        recordType: "externalProvider",
        recordId: provider.id,
        branchId: provider.branchId ?? null,
        branchName: branchName(provider.branchId),
        path: "/quality",
      });
    }
  }

  for (const activity of levelIIIActivityRows as any[]) {
    const dueIn = daysUntil(activity.nextActionDate || activity.activityDate);
    if (activity.status === "Planned" && dueIn !== null && dueIn < 0) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Level III activity is overdue",
        detail: `${activity.subject} is ${Math.abs(dueIn)} day(s) overdue.`,
        action: "Complete, reschedule, or cancel the activity.",
        recordType: "levelIIIActivity",
        recordId: activity.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
  }

  for (const assessment of levelIIIAssessmentRows as any[]) {
    const reviewDue = daysUntil(assessment.nextReviewDate);
    if (reviewDue !== null && reviewDue < 0) {
      addIssue(issues, {
        area: "level_iii",
        severity: "warning",
        title: "Level III assessment review is overdue",
        detail: `${assessment.method} ${assessment.level} review is ${Math.abs(reviewDue)} day(s) overdue.`,
        action: "Review the assessment and update the next review date.",
        recordType: "levelIIIAssessment",
        recordId: assessment.id,
        branchId: null,
        branchName: null,
        path: "/level-iii",
      });
    }
  }

  const orderedIssues = issues.sort((left, right) => {
    const severityWeight: Record<OperationalReadinessSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };
    return (
      severityWeight[left.severity] - severityWeight[right.severity] ||
      AREA_LABELS[left.area].localeCompare(AREA_LABELS[right.area]) ||
      left.title.localeCompare(right.title)
    );
  });
  const openQualityActionsByFingerprint = new Map<
    string,
    NonNullable<OperationalReadinessIssue["qualityAction"]>
  >();

  for (const action of qualityActionRows as any[]) {
    if (action.status === "Closed") continue;
    const fingerprint = extractReadinessFingerprint(action.description);
    if (!fingerprint || openQualityActionsByFingerprint.has(fingerprint)) continue;

    openQualityActionsByFingerprint.set(fingerprint, {
      id: action.id,
      referenceNumber: action.referenceNumber,
      status: action.status,
      dueDate: action.dueDate ?? null,
      ownerName: action.ownerName ?? null,
    });
  }

  const linkedIssues = orderedIssues.map((issue) => ({
    ...issue,
    qualityAction: openQualityActionsByFingerprint.get(issue.fingerprint) ?? null,
  }));
  const { status, summary } = buildOperationalReadinessSummary(linkedIssues);

  return {
    generatedAt: new Date().toISOString(),
    status,
    scope: {
      branchId: selectedBranchId,
      branchName: selectedBranch?.name ?? "All Branches",
    },
    summary,
    areas: buildAreas(linkedIssues),
    issues: linkedIssues,
  };
}
