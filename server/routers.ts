import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import {
  extractDocumentPlaceholders,
  validateTemplatePlaceholders,
} from "../shared/documentPlaceholders";
import {
  buildLevelIIIDocumentAutomationRules,
  findLevelIIIDocumentAutomationRuleByLabel,
  isLikelyLevelIIIAssessmentRequest,
} from "@shared/levelIIIDocumentAutomation";
import { validatePassword } from "../shared/passwordValidation";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { COOKIE_NAME, LOCAL_AUTH_LOGOUT_COOKIE } from "../shared/const";
import { ENV } from "./_core/env";
import { isEmailDeliveryConfigured, sendEmail } from "./_core/email";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { students, leads } from "../drizzle/schema";
import { getAuditTrail, getEntityAuditTrail, logAuditEvent } from "./audit";
import {
  updateAppUserWithAuth,
  getAllUsers,
  getUserById,
  getUserByEmail,
  createAppUser,
  deleteAppUser,
  hasPasswordForUser,
  signInWithPassword,
  signOutSession,
  requestPasswordReset,
  resetPasswordWithToken,
  changeUserPassword,
  getUserModuleAccess,
  saveUserModuleAccess,
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getContactsForCompany,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getLeadActivities,
  createLeadActivity,
  updateLeadActivity,
  deleteLeadActivity,
  getLeadReminders,
  findDuplicateLead,
  findDuplicateStudent,
  findLeadByIdentity,
  findStudentByIdentity,
  convertLeadToStudent,
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  getAllCourseSchedules,
  getCourseScheduleById,
  createCourseSchedule,
  updateCourseSchedule,
  normalizeScheduleExamDates,
  getAllEnrollments,
  getEnrollmentsByStudent,
  getEnrollmentsByCourseSchedule,
  createEnrollment,
  updateEnrollment,
  getAttendanceByEnrollment,
  getAttendanceByCourseSchedule,
  createAttendance,
  updateAttendance,
  markAttendanceForSchedule,
  getAllAssessments,
  getAssessmentsByEnrollment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAllCertificates,
  getCertificatesByEnrollment,
  getCertificatesByStudent,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  getAllLevelIIIClients,
  createLevelIIIClient,
  updateLevelIIIClient,
  deleteLevelIIIClient,
  getPortalAccessibleClientsForUser,
  getPortalClientAccessForUser,
  getPortalClientAssignments,
  getAccessAuditDashboard,
  getAccessAuditBranchCoverage,
  getPortalClientReminderSettings,
  upsertPortalClientAssignment,
  updatePortalClientReminderSettings,
  deletePortalClientAssignment,
  createPortalApprovalRequest,
  getPortalApprovalRequests,
  getPortalAssignableUsers,
  getPortalAccessibleBranchesForUser,
  getPortalBranchesForClient,
  getAllPortalClientBranches,
  createPortalClientBranch,
  getPortalBranchImportCandidates,
  importPortalBranchesFromExistingClients,
  updatePortalClientBranch,
  deletePortalClientBranch,
  savePortalUserBranchAssignments,
  setUserLoginEnabled,
  getPortalServiceDefinitions,
  createPortalServiceDefinition,
  updatePortalServiceDefinition,
  createPortalServiceRequest,
  getPortalServiceRequestsForClient,
  normalisePortalServiceRequestMetadata,
  updatePortalServiceRequestStatus,
  getPortalAssessmentGuidesForClient,
  createPortalAssessmentGuide,
  updatePortalAssessmentGuide,
  getPortalTechniciansForClient,
  getPortalRequirementDefinitionsForClient,
  createPortalRequirementDefinition,
  updatePortalRequirementDefinition,
  getPortalRequirementMatrixForClient,
  getPortalDashboardForClient,
  getPortalClientDocuments,
  createPortalClientDocument,
  buildPortalClientDocumentStoragePlan,
  updatePortalClientDocument,
  deletePortalClientDocument,
  getPortalCommentsForClient,
  createPortalComment,
  updatePortalCommentStatus,
  getPortalResourcesForClient,
  createPortalClientResource,
  updatePortalClientResource,
  deletePortalClientResource,
  upsertPortalTechnicianRequirement,
  buildPortalRequirementDocumentStoragePlan,
  uploadPortalRequirementDocument,
  reviewPortalApprovalRequest,
  stagePortalApprovalFile,
  getAllLevelIIIActivities,
  createLevelIIIActivity,
  updateLevelIIIActivity,
  deleteLevelIIIActivity,
  getAllLevelIIITechnicians,
  createLevelIIITechnician,
  updateLevelIIITechnician,
  deleteLevelIIITechnician,
  bootstrapLevelIIITechnicianComplianceFromDriveAudit,
  bootstrapLevelIIITechnicianCertificatesFromDriveAudit,
  getAllLevelIIITechnicianCertificates,
  createLevelIIITechnicianCertificate,
  updateLevelIIITechnicianCertificate,
  updateLevelIIITechnicianCertificateApproval,
  deleteLevelIIITechnicianCertificate,
  getAllLevelIIITechnicianCertificateExports,
  getLevelIIITechnicianCertificateExportHistory,
  recordLevelIIITechnicianCertificateExport,
  getAllLevelIIIAssessments,
  createLevelIIIAssessment,
  updateLevelIIIAssessment,
  deleteLevelIIIAssessment,
  getAllLevelIIIEquipment,
  createLevelIIIEquipment,
  updateLevelIIIEquipment,
  deleteLevelIIIEquipment,
  getAllLevelIIISpecimens,
  createLevelIIISpecimen,
  updateLevelIIISpecimen,
  deleteLevelIIISpecimen,
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  getEquipmentDocuments,
  createEquipmentDocument,
  deleteEquipmentDocument,
  getEquipmentLoans,
  createEquipmentLoan,
  returnEquipmentLoan,
  getAllSpecimens,
  getSpecimenById,
  createSpecimen,
  updateSpecimen,
  getSpecimenDocuments,
  createSpecimenDocument,
  deleteSpecimenDocument,
  getSpecimenLoans,
  createSpecimenLoan,
  returnSpecimenLoan,
  getAllSpecimenTypes,
  createSpecimenType,
  updateSpecimenType,
  getAllLecturers,
  getLecturerById,
  createLecturer,
  updateLecturer,
  getAllMethods,
  createMethod,
  updateMethod,
  getAllTrainingOfferings,
  createTrainingOffering,
  updateTrainingOffering,
  deleteTrainingOffering,
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getPlannerEntriesByUser,
  createPlannerEntry,
  updatePlannerEntryForUser,
  deletePlannerEntryForUser,
  getPlannerTimesheetProfile,
  upsertPlannerTimesheetProfile,
  listPlannerTimesheetDepartmentCoverageSettings,
  upsertPlannerTimesheetDepartmentCoverageSetting,
  deletePlannerTimesheetDepartmentCoverageSetting,
  getPlannerTimesheetHolidays,
  createPlannerTimesheetHoliday,
  updatePlannerTimesheetHoliday,
  deletePlannerTimesheetHoliday,
  applyPlannerTimesheetHolidaysToMonth,
  fillPlannerTimesheetMonthFromProfileTemplates,
  getPlannerTimesheetMonthStatus,
  lockPlannerTimesheetMonth,
  reopenPlannerTimesheetMonth,
  submitPlannerTimesheetMonth,
  approvePlannerTimesheetMonth,
  markPlannerTimesheetMonthHandedOff,
  returnPlannerTimesheetMonthForChanges,
  getPlannerTimesheetReviewQueue,
  getPlannerTimesheetMonthOverview,
  getPlannerTimesheetTeamLeaveOverview,
  getPlannerTimesheetLeaveOverrideRegister,
  getPlannerTimesheetLeaveOverrideBlocks,
  getPlannerTimesheetUserLeaveOverrideRegister,
  getPlannerTimesheetUserLeaveOverrideBlocks,
  reviewPlannerTimesheetLeaveOverride,
  reviewPlannerTimesheetLeaveOverrideBlock,
  getPlannerTimesheetTeamLeaveCalendar,
  getPlannerTimesheetDepartmentCoveragePreview,
  getPlannerTimesheetLeaveBalancePreview,
  getPlannerTimesheetTemplates,
  getPlannerTimesheetOptions,
  createPlannerTimesheetTemplate,
  updatePlannerTimesheetTemplateForUser,
  deletePlannerTimesheetTemplateForUser,
  createPlannerTimesheetOption,
  updatePlannerTimesheetOptionForUser,
  deletePlannerTimesheetOptionForUser,
  getPlannerTimesheetEntriesByUser,
  upsertPlannerTimesheetEntryForUser,
  bulkUpsertPlannerTimesheetEntriesForUser,
  ensureUserCalendarFeedToken,
  rotateUserCalendarFeedToken,
  getAllSharedPlannerEvents,
  createSharedPlannerEvent,
  updateSharedPlannerEventForUser,
  deleteSharedPlannerEventForUser,
  getUnifiedCalendarOccurrencesForUser,
  createImportLog,
  updateImportLog,
  getAllReports,
  createReport,
  generateReportSnapshot,
  deleteReport,
  getAllQualityActions,
  getQualityActionById,
  createQualityAction,
  updateQualityAction,
  deleteQualityAction,
  getAllQualityAudits,
  getQualityAuditById,
  createQualityAudit,
  updateQualityAudit,
  deleteQualityAudit,
  getAllManagementReviews,
  getManagementReviewById,
  createManagementReview,
  updateManagementReview,
  deleteManagementReview,
  getAllExternalProviders,
  getExternalProviderById,
  createExternalProvider,
  updateExternalProvider,
  deleteExternalProvider,
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "./db";
import { systemRouter } from "./_core/systemRouter";
import { clientPortalRouter } from "./portal/router";
import { documentsRouter } from "./documents/router";
import { plannerRouter } from "./planner/router";
import { levelIIIRouter } from "./levelIII/router";
import { equipmentRouter } from "./equipment/router";
import { kpiRouter } from "./kpi/router";
import { lecturersRouter } from "./lecturers/router";
import { specimensRouter } from "./specimens/router";
import { trainingRouter } from "./training/router";
import { calculateEndDateFromDuration } from "../shared/scheduling";

function getSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: (ENV.isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  };
}

function getLocalAuthLogoutCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: ENV.isProduction,
    sameSite: (ENV.isProduction ? "none" : "lax") as "none" | "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365,
  };
}

function getCookieClearOptions(
  options: ReturnType<typeof getSessionCookieOptions> | ReturnType<typeof getLocalAuthLogoutCookieOptions>
) {
  const { maxAge: _maxAge, ...clearOptions } = options;
  return clearOptions;
}

const AVAILABLE_MODULES = [
  "students",
  "leads",
  "companies",
  "courses",
  "schedules",
  "enrollments",
  "attendance",
  "equipment",
  "specimens",
  "kpi",
  "lecturers",
  "training",
  "level_ii",
  "planner",
  "reports",
  "documents",
  "level_iii",
  "client_portal",
  "quality",
  "branches",
  "admin",
];

type AvailableModule = (typeof AVAILABLE_MODULES)[number];
type ModulePermissionAction = "view" | "create" | "edit" | "delete";

async function assertModulePermission(
  user: NonNullable<Awaited<ReturnType<typeof getUserById>>>,
  module: AvailableModule,
  action: ModulePermissionAction = "view"
) {
  if (user.role === "admin" || user.role === "super_admin") {
    return;
  }

  if (module === "client_portal") {
    const portalClients = await getPortalAccessibleClientsForUser(user.id, user.role);
    if (portalClients.length > 0) {
      return;
    }
  }

  const rows = await getUserModuleAccess(user.id);
  const access = rows.find((row) => row.module === module);
  const allowed =
    action === "view"
      ? Boolean(access?.canView)
      : action === "create"
        ? Boolean(access?.canCreate)
        : action === "edit"
          ? Boolean(access?.canEdit)
          : Boolean(access?.canDelete);

  if (allowed) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: `You do not have ${action} access for the ${module.replace(/_/g, " ")} module.`,
  });
}

function moduleProcedure(module: AvailableModule, action: ModulePermissionAction = "view") {
  return protectedProcedure.use(async ({ ctx, next }) => {
    await assertModulePermission(ctx.user, module, action);
    return next({
      ctx,
    });
  });
}

const studentsViewProcedure = moduleProcedure("students", "view");
const studentsCreateProcedure = moduleProcedure("students", "create");
const studentsEditProcedure = moduleProcedure("students", "edit");
const studentsDeleteProcedure = moduleProcedure("students", "delete");
const leadsViewProcedure = moduleProcedure("leads", "view");
const leadsCreateProcedure = moduleProcedure("leads", "create");
const leadsEditProcedure = moduleProcedure("leads", "edit");
const leadsDeleteProcedure = moduleProcedure("leads", "delete");
const companiesViewProcedure = moduleProcedure("companies", "view");
const companiesCreateProcedure = moduleProcedure("companies", "create");
const companiesEditProcedure = moduleProcedure("companies", "edit");
const companiesDeleteProcedure = moduleProcedure("companies", "delete");
const coursesViewProcedure = moduleProcedure("courses", "view");
const coursesCreateProcedure = moduleProcedure("courses", "create");
const coursesEditProcedure = moduleProcedure("courses", "edit");
const coursesDeleteProcedure = moduleProcedure("courses", "delete");
const schedulesViewProcedure = moduleProcedure("schedules", "view");
const schedulesCreateProcedure = moduleProcedure("schedules", "create");
const schedulesEditProcedure = moduleProcedure("schedules", "edit");
const schedulesDeleteProcedure = moduleProcedure("schedules", "delete");
const documentsViewProcedure = moduleProcedure("documents", "view");
const documentsCreateProcedure = moduleProcedure("documents", "create");
const documentsEditProcedure = moduleProcedure("documents", "edit");
const documentsDeleteProcedure = moduleProcedure("documents", "delete");
const plannerViewProcedure = moduleProcedure("planner", "view");
const plannerCreateProcedure = moduleProcedure("planner", "create");
const plannerEditProcedure = moduleProcedure("planner", "edit");
const plannerDeleteProcedure = moduleProcedure("planner", "delete");
const qualityViewProcedure = moduleProcedure("quality", "view");
const qualityCreateProcedure = moduleProcedure("quality", "create");
const qualityEditProcedure = moduleProcedure("quality", "edit");
const qualityDeleteProcedure = moduleProcedure("quality", "delete");
const reportsViewProcedure = moduleProcedure("reports", "view");
const reportsCreateProcedure = moduleProcedure("reports", "create");
const reportsDeleteProcedure = moduleProcedure("reports", "delete");
const branchesViewProcedure = moduleProcedure("branches", "view");
const branchesCreateProcedure = moduleProcedure("branches", "create");
const branchesEditProcedure = moduleProcedure("branches", "edit");
const branchesDeleteProcedure = moduleProcedure("branches", "delete");
const portalViewProcedure = moduleProcedure("client_portal", "view");
const portalCreateProcedure = moduleProcedure("client_portal", "create");
const portalEditProcedure = moduleProcedure("client_portal", "edit");
const portalDeleteProcedure = moduleProcedure("client_portal", "delete");
const adminModuleProcedure = moduleProcedure("admin", "view");

const scheduleStatusSchema = z.enum([
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
]);

const courseLevelSchema = z.enum(["Level 1", "Level 2", "Level 3"]);
const qualityCategorySchema = z.enum([
  "Nonconformance",
  "Corrective Action",
  "Observation",
  "Improvement",
]);
const qualitySourceSchema = z.enum([
  "Customer Complaint",
  "Internal Audit",
  "Supplier",
  "Training",
  "Examination",
  "Level III",
  "Equipment",
  "Document Control",
  "Management Review",
  "Other",
]);
const qualitySeveritySchema = z.enum(["Minor", "Major", "Critical"]);
const qualityStatusSchema = z.enum([
  "Open",
  "In Progress",
  "Awaiting Verification",
  "Closed",
]);
const qualityAuditTypeSchema = z.enum([
  "Internal Audit",
  "Process Audit",
  "Training Audit",
  "Equipment Audit",
  "Document Audit",
  "Branch Audit",
]);
const qualityAuditStatusSchema = z.enum([
  "Planned",
  "In Progress",
  "Completed",
  "Cancelled",
]);
const managementReviewStatusSchema = z.enum([
  "Planned",
  "Held",
  "Closed",
  "Cancelled",
]);
const externalProviderTypeSchema = z.enum([
  "Lecturer",
  "Assessor",
  "Calibration",
  "Consumables",
  "Venue",
  "Equipment",
  "Level III Consultant",
  "Document / Printing",
  "Other",
]);
const externalProviderStatusSchema = z.enum([
  "Approved",
  "Conditional",
  "Under Review",
  "Suspended",
  "Inactive",
]);
const externalProviderRatingSchema = z.enum([
  "Preferred",
  "Acceptable",
  "Probationary",
]);

async function getSuperAdminManagementContext(targetUserId?: number) {
  const users = await getAllUsers();
  const superAdminCount = users.filter((user) => user.role === "super_admin").length;
  const targetUser =
    targetUserId === undefined ? null : users.find((user) => user.id === targetUserId) ?? null;

  return {
    superAdminCount,
    targetUser,
    targetTouchesSuperAdmin: Boolean(
      targetUser && targetUser.role === "super_admin"
    ),
  };
}

async function assertCanManageSuperAdminRole(options: {
  actorRole: "user" | "admin" | "super_admin";
  targetUserId?: number;
  requestedRole?: "user" | "admin" | "super_admin";
}) {
  const { superAdminCount, targetTouchesSuperAdmin } =
    await getSuperAdminManagementContext(options.targetUserId);

  const requestedTouchesSuperAdmin = options.requestedRole === "super_admin";
  const touchesSuperAdmin = targetTouchesSuperAdmin || requestedTouchesSuperAdmin;

  if (!touchesSuperAdmin) {
    return;
  }

  if (options.actorRole === "super_admin") {
    return;
  }

  const bootstrapAllowed =
    options.actorRole === "admin" &&
    superAdminCount === 0 &&
    requestedTouchesSuperAdmin;

  if (bootstrapAllowed) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Only an existing Super Admin can create, edit, or change Super Admin accounts.",
  });
}

function getAuditRequestMeta(ctx: {
  req: {
    ip?: string;
    headers: Record<string, string | string[] | undefined>;
  };
}) {
  const rawUserAgent = ctx.req.headers["user-agent"];
  return {
    ipAddress: ctx.req.ip,
    userAgent: Array.isArray(rawUserAgent) ? rawUserAgent.join(", ") : rawUserAgent,
  };
}

const scheduleImportRowSchema = z.object({
  branchId: z.any().optional().nullable(),
  branchCode: z.any().optional().nullable(),
  branchName: z.any().optional().nullable(),
  courseId: z.any().optional().nullable(),
  courseCode: z.any().optional().nullable(),
  courseName: z.any().optional().nullable(),
  courseDuration: z.any().optional().nullable(),
  courseLevel: z.any().optional().nullable(),
  courseDescription: z.any().optional().nullable(),
  lecturerId: z.any().optional().nullable(),
  lecturerEmail: z.any().optional().nullable(),
  lecturerName: z.any().optional().nullable(),
  lecturerFirstName: z.any().optional().nullable(),
  lecturerLastName: z.any().optional().nullable(),
  startDate: z.any().optional().nullable(),
  endDate: z.any().optional().nullable(),
  endOfCourseExamStartDate: z.any().optional().nullable(),
  endOfCourseExamEndDate: z.any().optional().nullable(),
  maxCapacity: z.any().optional().nullable(),
  status: z.any().optional().nullable(),
});

type ScheduleImportRow = z.infer<typeof scheduleImportRowSchema>;

type ImportBranchRecord = {
  id: number;
  name: string;
  code: string | null;
};

type ImportCourseRecord = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  duration: number | null;
  level: "Level 1" | "Level 2" | "Level 3";
  branchId: number | null;
  active: boolean;
};

type ImportLecturerRecord = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  branchId: number | null;
  active?: boolean;
};

type ImportScheduleRecord = {
  id: number;
  courseId: number;
  branchId: number | null;
  startDate: Date | string;
  endDate: Date | string;
  endOfCourseExamStartDate: Date | string | null;
  endOfCourseExamEndDate: Date | string | null;
  lecturerId: number | null;
  maxCapacity: number | null;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
};

function normalizeImportText(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeImportKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function parseOptionalImportInteger(value: unknown, label: string) {
  const rawValue = normalizeImportText(value);
  if (!rawValue) return null;

  const normalized = rawValue.replace(/,/g, "");
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return parsed;
}

function convertExcelSerialDate(serial: number) {
  const baseDate = Date.UTC(1899, 11, 30);
  const parsedDate = new Date(baseDate + serial * 24 * 60 * 60 * 1000);
  return new Date(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate()
  );
}

function parseImportedDateValue(value: unknown, label: string) {
  if (value === null || value === undefined || String(value).trim?.() === "") {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate()
    );
  }

  if (typeof value === "number") {
    return convertExcelSerialDate(value);
  }

  const rawValue = String(value).trim();
  if (!rawValue) return null;

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    return convertExcelSerialDate(Number(rawValue));
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    const parsed = new Date(`${rawValue}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const tokenizedMatch = rawValue.match(
    /^(\d{1,2})[-/ ]([A-Za-z]+|\d{1,2})[-/ ](\d{2}|\d{4})$/
  );

  if (tokenizedMatch) {
    const [, dayToken, monthTokenRaw, yearTokenRaw] = tokenizedMatch;
    const monthLookup: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      sept: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };

    let monthIndex = Number.parseInt(monthTokenRaw, 10) - 1;
    if (!Number.isFinite(monthIndex)) {
      monthIndex = monthLookup[monthTokenRaw.toLowerCase()];
    }

    const day = Number.parseInt(dayToken, 10);
    const year =
      yearTokenRaw.length === 2
        ? 2000 + Number.parseInt(yearTokenRaw, 10)
        : Number.parseInt(yearTokenRaw, 10);

    const parsed = new Date(year, monthIndex, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date(rawValue);
  if (!Number.isNaN(fallback.getTime())) {
    return new Date(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate()
    );
  }

  throw new Error(`Unable to read ${label} "${rawValue}".`);
}

function formatDateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inferImportedCourseLevel(row: ScheduleImportRow) {
  const explicitLevel = normalizeImportText(row.courseLevel);
  if (explicitLevel && courseLevelSchema.safeParse(explicitLevel).success) {
    return explicitLevel as z.infer<typeof courseLevelSchema>;
  }

  const combined = `${normalizeImportText(row.courseCode) ?? ""} ${normalizeImportText(
    row.courseName
  ) ?? ""}`.toLowerCase();

  if (combined.includes("level 3") || /\b3\b/.test(combined)) {
    return "Level 3" as const;
  }

  if (
    combined.includes("level 2") ||
    combined.includes("1&2") ||
    combined.includes("1 and 2") ||
    /\b(ut|mt|pt|vt|rt|wt|rts|tofd|paut|rtfi|cr\/dr)\b/.test(combined)
  ) {
    return "Level 2" as const;
  }

  return "Level 1" as const;
}

function resolveImportedScheduleStatus(
  value: unknown
): "Scheduled" | "In Progress" | "Completed" | "Cancelled" {
  const rawValue = normalizeImportText(value);
  if (!rawValue) return "Scheduled" as const;

  const normalizedValue = rawValue.toLowerCase();
  const mappedStatus =
    normalizedValue === "scheduled"
      ? "Scheduled"
      : normalizedValue === "in progress"
        ? "In Progress"
        : normalizedValue === "completed"
          ? "Completed"
          : normalizedValue === "cancelled" || normalizedValue === "canceled"
            ? "Cancelled"
            : null;

  if (!mappedStatus) {
    throw new Error(`Status "${rawValue}" is not recognised.`);
  }

  return mappedStatus;
}

function resolveImportedBranch(
  row: ScheduleImportRow,
  branchesList: ImportBranchRecord[],
  defaultBranchId?: number | null
) {
  const branchIdValue = parseOptionalImportInteger(row.branchId, "Branch ID");
  if (branchIdValue) {
    const branchById = branchesList.find((branch) => branch.id === branchIdValue);
    if (!branchById) {
      throw new Error(`Branch ID ${branchIdValue} was not found.`);
    }
    return branchById;
  }

  const branchCode = normalizeImportKey(normalizeImportText(row.branchCode));
  if (branchCode) {
    const branchByCode = branchesList.find(
      (branch) => normalizeImportKey(branch.code) === branchCode
    );
    if (!branchByCode) {
      throw new Error(`Branch code "${row.branchCode}" was not found.`);
    }
    return branchByCode;
  }

  const branchName = normalizeImportKey(normalizeImportText(row.branchName));
  if (branchName) {
    const branchByName = branchesList.find(
      (branch) => normalizeImportKey(branch.name) === branchName
    );
    if (!branchByName) {
      throw new Error(`Branch name "${row.branchName}" was not found.`);
    }
    return branchByName;
  }

  if (defaultBranchId) {
    const defaultBranch = branchesList.find((branch) => branch.id === defaultBranchId);
    if (defaultBranch) {
      return defaultBranch;
    }
  }

  if (branchesList.length === 1) {
    return branchesList[0];
  }

  throw new Error(
    "Branch could not be resolved. Map branch ID, branch code, or branch name, or filter schedules to a branch before importing."
  );
}

async function resolveImportedCourse(
  row: ScheduleImportRow,
  branchId: number,
  coursesList: ImportCourseRecord[]
) {
  const courseIdValue = parseOptionalImportInteger(row.courseId, "Course ID");
  if (courseIdValue) {
    const courseById = coursesList.find((course) => course.id === courseIdValue);
    if (!courseById) {
      throw new Error(`Course ID ${courseIdValue} was not found.`);
    }
    return courseById;
  }

  const courseCode = normalizeImportKey(normalizeImportText(row.courseCode));
  if (courseCode) {
    const courseByCode = coursesList.find(
      (course) => normalizeImportKey(course.code) === courseCode
    );
    if (courseByCode) {
      return courseByCode;
    }
  }

  const courseName = normalizeImportKey(normalizeImportText(row.courseName));
  if (courseName) {
    const nameMatches = coursesList.filter(
      (course) => normalizeImportKey(course.name) === courseName
    );
    const branchMatch = nameMatches.find((course) => course.branchId === branchId);
    if (branchMatch) {
      return branchMatch;
    }
    if (nameMatches.length === 1) {
      return nameMatches[0];
    }
    if (nameMatches.length > 1) {
      throw new Error(
        `Multiple courses named "${normalizeImportText(row.courseName)}" already exist. Map the course code as well.`
      );
    }
  }

  const newCourseCode = normalizeImportText(row.courseCode);
  const newCourseName = normalizeImportText(row.courseName);

  if (!newCourseCode || !newCourseName) {
    throw new Error(
      "Course could not be resolved. Provide course ID, course code, or course name. To auto-create a new course, include both course code and course name."
    );
  }

  const createdCourseResult = await createCourse({
    code: newCourseCode,
    name: newCourseName,
    duration: parseOptionalImportInteger(
      row.courseDuration,
      "Course Duration (Work Days)"
    ),
    description: normalizeImportText(row.courseDescription) ?? undefined,
    level: inferImportedCourseLevel(row),
    branchId,
    active: true,
  } as const);

  const createdCourseId = Number((createdCourseResult as { insertId?: number }).insertId);
  const createdCourse = createdCourseId
    ? ((await getCourseById(createdCourseId)) as ImportCourseRecord | null)
    : null;

  if (!createdCourse) {
    throw new Error(`Failed to create course "${newCourseName}".`);
  }

  coursesList.push(createdCourse);
  return createdCourse;
}

function resolveImportedLecturer(
  row: ScheduleImportRow,
  branchId: number,
  lecturersList: ImportLecturerRecord[]
) {
  const lecturerIdValue = parseOptionalImportInteger(row.lecturerId, "Lecturer ID");
  if (lecturerIdValue) {
    const lecturerById = lecturersList.find((lecturer) => lecturer.id === lecturerIdValue);
    if (!lecturerById) {
      throw new Error(`Lecturer ID ${lecturerIdValue} was not found.`);
    }
    if (lecturerById.branchId !== branchId) {
      throw new Error("Selected lecturer belongs to a different branch.");
    }
    return lecturerById;
  }

  const lecturerEmail = normalizeImportKey(normalizeImportText(row.lecturerEmail));
  const lecturerName = normalizeImportKey(normalizeImportText(row.lecturerName));
  const lecturerFirstName = normalizeImportKey(normalizeImportText(row.lecturerFirstName));
  const lecturerLastName = normalizeImportKey(normalizeImportText(row.lecturerLastName));

  if (!lecturerEmail && !lecturerName && !lecturerFirstName && !lecturerLastName) {
    return null;
  }

  const branchLecturers = lecturersList.filter(
    (lecturer) => lecturer.active !== false && lecturer.branchId === branchId
  );

  const emailMatch = lecturerEmail
    ? branchLecturers.find(
        (lecturer) => normalizeImportKey(lecturer.email) === lecturerEmail
      )
    : null;
  if (emailMatch) return emailMatch;

  const fullNameMatch = lecturerName
    ? branchLecturers.find(
        (lecturer) =>
          normalizeImportKey(`${lecturer.firstName} ${lecturer.lastName}`) === lecturerName
      )
    : null;
  if (fullNameMatch) return fullNameMatch;

  if (lecturerFirstName && lecturerLastName) {
    const splitNameMatch = branchLecturers.find(
      (lecturer) =>
        normalizeImportKey(lecturer.firstName) === lecturerFirstName &&
        normalizeImportKey(lecturer.lastName) === lecturerLastName
    );
    if (splitNameMatch) return splitNameMatch;
  }

  const crossBranchMatch = lecturersList.find((lecturer) => {
    if (lecturer.active === false) return false;
    if (lecturerEmail && normalizeImportKey(lecturer.email) === lecturerEmail) return true;
    if (
      lecturerName &&
      normalizeImportKey(`${lecturer.firstName} ${lecturer.lastName}`) === lecturerName
    ) {
      return true;
    }
    return (
      lecturerFirstName &&
      lecturerLastName &&
      normalizeImportKey(lecturer.firstName) === lecturerFirstName &&
      normalizeImportKey(lecturer.lastName) === lecturerLastName
    );
  });

  if (crossBranchMatch) {
    throw new Error("Selected lecturer belongs to a different branch.");
  }

  throw new Error("Lecturer could not be resolved for the selected branch.");
}

// ============ Students Router ============
const studentsRouter = router({
  list: studentsViewProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllStudents(input?.branchId);
    }),

  get: studentsViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const student = await getStudentById(input);
      if (!student) throw new TRPCError({ code: "NOT_FOUND" });
      return student;
    }),

  checkDuplicate: studentsViewProcedure
    .input(
      z.object({
        idNumber: z.string().optional().nullish(),
        passportNumber: z.string().optional().nullish(),
        excludeStudentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const idNumber = input.idNumber?.trim() || undefined;
      const passportNumber = input.passportNumber?.trim() || undefined;

      if (!idNumber && !passportNumber) {
        return {
          duplicate: false,
          studentMatch: null,
        };
      }

      const allStudents = await getAllStudents();
      const studentMatch =
        allStudents.find((student: any) => {
          if (input.excludeStudentId && student.id === input.excludeStudentId) {
            return false;
          }
          if (idNumber && student.idNumber && student.idNumber === idNumber) {
            return true;
          }
          if (
            passportNumber &&
            student.passportNumber &&
            student.passportNumber === passportNumber
          ) {
            return true;
          }
          return false;
        }) || null;

      return {
        duplicate: Boolean(studentMatch),
        studentMatch: studentMatch
          ? {
              id: studentMatch.id,
              firstName: studentMatch.firstName,
              lastName: studentMatch.lastName,
              idNumber: studentMatch.idNumber,
              passportNumber: studentMatch.passportNumber,
              studentNumber: studentMatch.studentNumber,
            }
          : null,
      };
    }),

  create: studentsCreateProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional().or(z.literal("")).nullish(),
        phone: z.string().optional().nullish(),
        idNumber: z.string().optional().nullish(),
        passportNumber: z.string().optional().nullish(),
        studentNumber: z.string().optional().nullish(),
        interestType: z.enum(["SNT Only", "PCN After Course"]).optional().nullish(),
        isCurrentPcnHolder: z.boolean().optional(),
        bindtProductCompleted: z.boolean().optional(),
        pcnNumber: z.string().optional().nullish(),
        active: z.boolean().optional(),
        branchId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cleaned = {
        ...input,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        idNumber: input.idNumber?.trim() || undefined,
        passportNumber: input.passportNumber?.trim() || undefined,
        studentNumber: input.studentNumber?.trim() || undefined,
        interestType: input.interestType || undefined,
        isCurrentPcnHolder: input.isCurrentPcnHolder ?? false,
        bindtProductCompleted: input.bindtProductCompleted ?? false,
        pcnNumber: input.pcnNumber?.trim() || undefined,
        active: input.active ?? true,
      };

      const isPcnRoute =
        cleaned.interestType === "PCN After Course" ||
        Boolean(cleaned.isCurrentPcnHolder) ||
        Boolean(cleaned.pcnNumber);

      if (!isPcnRoute) {
        cleaned.interestType = "SNT Only";
        cleaned.isCurrentPcnHolder = false;
        cleaned.bindtProductCompleted = false;
        cleaned.pcnNumber = undefined;
      } else if (cleaned.pcnNumber) {
        cleaned.isCurrentPcnHolder = true;
        cleaned.bindtProductCompleted = false;
      } else if (cleaned.isCurrentPcnHolder) {
        cleaned.bindtProductCompleted = false;
      }

      if (cleaned.idNumber && cleaned.passportNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please provide either an ID number or a passport number, not both.",
        });
      }

      const result = await createStudent(cleaned as any);
      const { createNotification } = await import("./notifications");
      await createNotification(ctx.user.id, {
        type: "student_added",
        title: "New Student Added",
        message: `${cleaned.firstName} ${cleaned.lastName} has been added to the system.`,
        actionUrl: "/students",
        priority: "normal",
      });
      return result;
    }),

  update: studentsEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")).nullish(),
          phone: z.string().optional().nullish(),
          idNumber: z.string().optional().nullish(),
          passportNumber: z.string().optional().nullish(),
          studentNumber: z.string().optional().nullish(),
          interestType: z.enum(["SNT Only", "PCN After Course"]).optional().nullish(),
          isCurrentPcnHolder: z.boolean().optional(),
          bindtProductCompleted: z.boolean().optional(),
          pcnNumber: z.string().optional().nullish(),
          active: z.boolean().optional(),
          isBlacklisted: z.boolean().optional(),
          blacklistReason: z.string().optional().nullish(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const cleaned = {
        ...input.data,
        firstName: input.data.firstName?.trim(),
        lastName: input.data.lastName?.trim(),
        email: input.data.email?.trim() || undefined,
        phone: input.data.phone?.trim() || undefined,
        idNumber: input.data.idNumber?.trim() || undefined,
        passportNumber: input.data.passportNumber?.trim() || undefined,
        studentNumber: input.data.studentNumber?.trim() || undefined,
        interestType: input.data.interestType || undefined,
        isCurrentPcnHolder: input.data.isCurrentPcnHolder ?? false,
        bindtProductCompleted: input.data.bindtProductCompleted ?? false,
        pcnNumber: input.data.pcnNumber?.trim() || undefined,
        blacklistReason: input.data.blacklistReason?.trim() || undefined,
      };

      const isPcnRoute =
        cleaned.interestType === "PCN After Course" ||
        Boolean(cleaned.isCurrentPcnHolder) ||
        Boolean(cleaned.pcnNumber);

      if (!isPcnRoute) {
        cleaned.interestType = "SNT Only";
        cleaned.isCurrentPcnHolder = false;
        cleaned.bindtProductCompleted = false;
        cleaned.pcnNumber = undefined;
      } else if (cleaned.pcnNumber) {
        cleaned.isCurrentPcnHolder = true;
        cleaned.bindtProductCompleted = false;
      } else if (cleaned.isCurrentPcnHolder) {
        cleaned.bindtProductCompleted = false;
      }

      if (cleaned.idNumber && cleaned.passportNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please provide either an ID number or a passport number, not both.",
        });
      }

      const existing = await findStudentByIdentity({
        idNumber: cleaned.idNumber,
        passportNumber: cleaned.passportNumber,
      });

      if (existing && existing.id !== input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A student already exists with this ID or passport number.",
        });
      }

      return updateStudent(input.id, cleaned as any);
    }),

  delete: studentsDeleteProcedure
    .input(z.object({ id: z.union([z.number(), z.string()]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const numId = typeof input.id === "string" ? parseInt(input.id, 10) : input.id;
      await db.delete(students).where(eq(students.id, numId));
      return { success: true };
    }),

  toggleBlacklist: studentsEditProcedure
    .input(
      z.object({
        id: z.number(),
        isBlacklisted: z.boolean(),
        blacklistReason: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return updateStudent(input.id, {
        isBlacklisted: input.isBlacklisted,
        blacklistReason: input.blacklistReason ?? undefined,
      } as any);
    }),

  import: studentsCreateProcedure
    .input(
      z.object({
        records: z.array(
          z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional().or(z.literal("")).nullish(),
            phone: z.string().optional().nullish(),
            studentId: z.string().optional().nullish(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      for (const record of input.records) {
        try {
          const student = await createStudent({
            firstName: record.firstName || "Unknown",
            lastName: record.lastName || "Unknown",
            email: record.email?.trim() || undefined,
            phone: record.phone?.trim() || undefined,
            idNumber: record.studentId?.trim() || undefined,
            active: true,
          } as any);

          results.push({ success: true, id: (student as any).id || 0 });
        } catch (error) {
          results.push({ success: false, error: String(error) });
        }
      }
      return results;
    }),
});

// ============ Leads Router ============
const leadsRouter = router({
  list: leadsViewProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllLeads(input?.branchId);
    }),

  get: leadsViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const lead = await getLeadById(input);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      return lead;
    }),

  create: leadsCreateProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional().or(z.literal("")).nullish(),
        phone: z.string().nullish(),
        companyId: z.number().optional().nullable(),
        contactId: z.number().optional().nullable(),
        companyName: z.string().nullish(),
        idNumber: z.string().nullish(),
        passportNumber: z.string().nullish(),
        preferredContactMethod: z.enum(["Phone", "Email", "WhatsApp"]).optional().nullish(),
        methodInterested: z.string().nullish(),
        interestedCourseId: z.number().optional().nullable(),
        interestType: z.enum(["SNT Only", "PCN After Course"]).optional().nullish(),
        isCurrentPcnHolder: z.boolean().optional(),
        bindtProductCompleted: z.boolean().optional(),
        pcnNumber: z.string().optional().nullish(),
        followUpDate: z.string().optional().nullish(),
        autoFollowUp: z.boolean().optional(),
        status: z.enum(["New", "Contacted", "Qualified", "Converted", "Closed Lost"]).optional(),
        statusFlag: z.enum(["Green", "Amber", "Red", "Blacklisted"]).optional(),
        source: z.string().nullish(),
        notes: z.string().nullish(),
        isBlacklisted: z.boolean().optional(),
        blacklistReason: z.string().nullish(),
        branchId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const cleaned: any = {
        ...input,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        companyId: input.companyId ?? undefined,
        contactId: input.contactId ?? undefined,
        companyName: input.companyName?.trim() || undefined,
        idNumber: input.idNumber?.trim() || undefined,
        passportNumber: input.passportNumber?.trim() || undefined,
        preferredContactMethod: input.preferredContactMethod || undefined,
        methodInterested: input.methodInterested?.trim() || undefined,
        interestedCourseId: input.interestedCourseId ?? undefined,
        interestType: input.interestType || undefined,
        isCurrentPcnHolder: input.isCurrentPcnHolder ?? false,
        bindtProductCompleted: input.bindtProductCompleted ?? false,
        pcnNumber: input.pcnNumber?.trim() || undefined,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
        autoFollowUp: input.autoFollowUp ?? false,
        status: input.status ?? "New",
        statusFlag: input.statusFlag ?? "Green",
        source: input.source?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        isBlacklisted: input.isBlacklisted ?? false,
        blacklistReason: input.blacklistReason?.trim() || undefined,
      };

      if (cleaned.companyId) {
        const company = await getCompanyById(cleaned.companyId);
        if (!company) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected company could not be found.",
          });
        }
        cleaned.companyName = company.name;
      }

      if (cleaned.contactId) {
        const contact = await getContactById(cleaned.contactId);
        if (!contact) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected contact could not be found.",
          });
        }
        if (cleaned.companyId && contact.companyId !== cleaned.companyId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected contact does not belong to the selected company.",
          });
        }
        cleaned.companyId = contact.companyId ?? cleaned.companyId;
        cleaned.firstName = contact.firstName;
        cleaned.lastName = contact.lastName;
        cleaned.email = contact.email ?? cleaned.email;
        cleaned.phone = contact.phone ?? cleaned.phone;
      }

      if (cleaned.idNumber && cleaned.passportNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please provide either an ID number or a passport number, not both.",
        });
      }

      if (cleaned.isBlacklisted && !cleaned.blacklistReason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Blacklist reason is required.",
        });
      }

      if (cleaned.autoFollowUp && !cleaned.followUpDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Follow-up date is required when Auto Follow-Up is enabled.",
        });
      }

      if (cleaned.pcnNumber) {
        cleaned.interestType = "PCN After Course";
        cleaned.isCurrentPcnHolder = true;
        cleaned.bindtProductCompleted = false;
      } else if (cleaned.interestType !== "PCN After Course") {
        cleaned.isCurrentPcnHolder = false;
        cleaned.bindtProductCompleted = false;
      } else if (cleaned.isCurrentPcnHolder) {
        cleaned.bindtProductCompleted = false;
      }

      if (!cleaned.autoFollowUp) {
        cleaned.followUpDate = undefined;
      }

      if (!cleaned.isBlacklisted) {
        cleaned.blacklistReason = undefined;
      } else {
        cleaned.statusFlag = "Blacklisted";
      }

      const duplicateLead = await findLeadByIdentity({
        idNumber: cleaned.idNumber,
        passportNumber: cleaned.passportNumber,
      });

      const duplicateStudent = await findStudentByIdentity({
        idNumber: cleaned.idNumber,
        passportNumber: cleaned.passportNumber,
      });

      if (duplicateLead || duplicateStudent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Duplicate detected. A lead or student already exists with this ID number or passport number. The record was not saved.",
        });
      }

      const softDuplicate = await findDuplicateLead({
        email: cleaned.email,
        phone: cleaned.phone,
        firstName: cleaned.firstName,
        lastName: cleaned.lastName,
      });

      if (softDuplicate) {
        cleaned.duplicateWarning = true;
        cleaned.duplicateNotes = `Possible duplicate based on name/email/phone (ID ${softDuplicate.id})`;
      } else {
        cleaned.duplicateWarning = false;
        cleaned.duplicateNotes = undefined;
      }

      return createLead(cleaned);
    }),

  checkDuplicate: leadsViewProcedure
    .input(
      z.object({
        idNumber: z.string().optional().nullish(),
        passportNumber: z.string().optional().nullish(),
        excludeLeadId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const idNumber = input.idNumber?.trim() || undefined;
      const passportNumber = input.passportNumber?.trim() || undefined;

      if (!idNumber && !passportNumber) {
        return {
          duplicate: false,
          leadMatch: null,
          studentMatch: null,
        };
      }

      const leadMatch = await findLeadByIdentity({
        idNumber,
        passportNumber,
        excludeLeadId: input.excludeLeadId,
      });

      const studentMatch = await findStudentByIdentity({
        idNumber,
        passportNumber,
      });

      return {
        duplicate: Boolean(leadMatch || studentMatch),
        leadMatch: leadMatch
          ? {
              id: leadMatch.id,
              firstName: leadMatch.firstName,
              lastName: leadMatch.lastName,
              idNumber: leadMatch.idNumber,
              passportNumber: leadMatch.passportNumber,
            }
          : null,
        studentMatch: studentMatch
          ? {
              id: studentMatch.id,
              firstName: studentMatch.firstName,
              lastName: studentMatch.lastName,
              idNumber: studentMatch.idNumber,
              passportNumber: studentMatch.passportNumber,
            }
          : null,
      };
    }),

  update: leadsEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")).nullish(),
          phone: z.string().nullish(),
          companyId: z.number().optional().nullable(),
          contactId: z.number().optional().nullable(),
          companyName: z.string().nullish(),
          idNumber: z.string().nullish(),
          passportNumber: z.string().nullish(),
          preferredContactMethod: z.enum(["Phone", "Email", "WhatsApp"]).optional().nullish(),
          methodInterested: z.string().nullish(),
          interestedCourseId: z.number().optional().nullable(),
          interestType: z.enum(["SNT Only", "PCN After Course"]).optional().nullish(),
          isCurrentPcnHolder: z.boolean().optional(),
          bindtProductCompleted: z.boolean().optional(),
          pcnNumber: z.string().optional().nullish(),
          followUpDate: z.string().optional().nullish(),
          autoFollowUp: z.boolean().optional(),
          status: z.enum(["New", "Contacted", "Qualified", "Converted", "Closed Lost"]).optional(),
          statusFlag: z.enum(["Green", "Amber", "Red", "Blacklisted"]).optional(),
          source: z.string().nullish(),
          notes: z.string().nullish(),
          isBlacklisted: z.boolean().optional(),
          blacklistReason: z.string().nullish(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingLead = await getLeadById(input.id);
      const cleaned: any = {
        ...input.data,
        firstName: input.data.firstName?.trim(),
        lastName: input.data.lastName?.trim(),
        email: input.data.email?.trim() || undefined,
        phone: input.data.phone?.trim() || undefined,
        companyId: input.data.companyId === null ? null : input.data.companyId ?? undefined,
        contactId: input.data.contactId === null ? null : input.data.contactId ?? undefined,
        companyName: input.data.companyName?.trim() || undefined,
        idNumber: input.data.idNumber?.trim() || undefined,
        passportNumber: input.data.passportNumber?.trim() || undefined,
        preferredContactMethod: input.data.preferredContactMethod || undefined,
        methodInterested: input.data.methodInterested?.trim() || undefined,
        interestedCourseId: input.data.interestedCourseId ?? undefined,
        interestType: input.data.interestType || undefined,
        isCurrentPcnHolder: input.data.isCurrentPcnHolder ?? false,
        bindtProductCompleted: input.data.bindtProductCompleted ?? false,
        pcnNumber: input.data.pcnNumber?.trim() || undefined,
        followUpDate: input.data.followUpDate ? new Date(input.data.followUpDate) : undefined,
        autoFollowUp: input.data.autoFollowUp ?? false,
        status: input.data.status,
        statusFlag: input.data.statusFlag,
        source: input.data.source?.trim() || undefined,
        notes: input.data.notes?.trim() || undefined,
        isBlacklisted: input.data.isBlacklisted ?? false,
        blacklistReason: input.data.blacklistReason?.trim() || undefined,
      };

      if (cleaned.companyId) {
        const company = await getCompanyById(cleaned.companyId);
        if (!company) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected company could not be found.",
          });
        }
        cleaned.companyName = company.name;
      }

      if (cleaned.contactId) {
        const contact = await getContactById(cleaned.contactId);
        if (!contact) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected contact could not be found.",
          });
        }
        if (cleaned.companyId && contact.companyId !== cleaned.companyId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected contact does not belong to the selected company.",
          });
        }
        cleaned.companyId = contact.companyId ?? cleaned.companyId;
        cleaned.firstName = contact.firstName;
        cleaned.lastName = contact.lastName;
        cleaned.email = contact.email ?? cleaned.email;
        cleaned.phone = contact.phone ?? cleaned.phone;
      }

      if (cleaned.idNumber && cleaned.passportNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please provide either an ID number or a passport number, not both.",
        });
      }

      if (cleaned.isBlacklisted && !cleaned.blacklistReason) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Blacklist reason is required.",
        });
      }

      if (cleaned.autoFollowUp && !cleaned.followUpDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Follow-up date is required when Auto Follow-Up is enabled.",
        });
      }

      if (cleaned.pcnNumber) {
        cleaned.interestType = "PCN After Course";
        cleaned.isCurrentPcnHolder = true;
        cleaned.bindtProductCompleted = false;
      } else if (cleaned.interestType !== "PCN After Course") {
        cleaned.isCurrentPcnHolder = false;
        cleaned.bindtProductCompleted = false;
      } else if (cleaned.isCurrentPcnHolder) {
        cleaned.bindtProductCompleted = false;
      }

      if (!cleaned.autoFollowUp) {
        cleaned.followUpDate = undefined;
      }

      if (!cleaned.isBlacklisted) {
        cleaned.blacklistReason = undefined;
      } else {
        cleaned.statusFlag = "Blacklisted";
      }

      const duplicateLead = await findLeadByIdentity({
        idNumber: cleaned.idNumber,
        passportNumber: cleaned.passportNumber,
        excludeLeadId: input.id,
      });

      const duplicateStudent = await findStudentByIdentity({
        idNumber: cleaned.idNumber,
        passportNumber: cleaned.passportNumber,
      });

      if (duplicateLead || duplicateStudent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Duplicate detected. A lead or student already exists with this ID number or passport number. The record was not saved.",
        });
      }

      const softDuplicate =
        cleaned.firstName && cleaned.lastName
          ? await findDuplicateLead({
              email: cleaned.email,
              phone: cleaned.phone,
              firstName: cleaned.firstName,
              lastName: cleaned.lastName,
            })
          : null;

      const softDuplicateIsAnotherLead =
        softDuplicate && softDuplicate.id !== input.id ? softDuplicate : null;

      if (softDuplicateIsAnotherLead) {
        cleaned.duplicateWarning = true;
        cleaned.duplicateNotes = `Possible duplicate based on name/email/phone (ID ${softDuplicateIsAnotherLead.id})`;
      } else {
        cleaned.duplicateWarning = false;
        cleaned.duplicateNotes = undefined;
      }

      const result = await updateLead(input.id, cleaned);

      if (
        existingLead &&
        cleaned.status &&
        cleaned.status !== existingLead.status
      ) {
        const { triggerLeadStatusChanged } = await import("./eventTriggers");
        await triggerLeadStatusChanged(
          input.id,
          `${cleaned.firstName ?? existingLead.firstName} ${cleaned.lastName ?? existingLead.lastName}`.trim(),
          existingLead.status,
          cleaned.status,
          ctx.user.id
        );
      }

      return result;
    }),

  delete: leadsDeleteProcedure
    .input(z.object({ id: z.union([z.number(), z.string()]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const numId = typeof input.id === "string" ? parseInt(input.id, 10) : input.id;
      await db.delete(leads).where(eq(leads.id, numId));
      return { success: true };
    }),

  reminders: leadsViewProcedure
    .input(z.object({ daysAhead: z.number().min(0).max(90).optional() }).optional())
    .query(async ({ input }) => {
      return getLeadReminders(input?.daysAhead ?? 14);
    }),

  activities: leadsViewProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      return getLeadActivities(input.leadId);
    }),

  createActivity: leadsCreateProcedure
    .input(
      z.object({
        leadId: z.number(),
        activityType: z
          .enum(["Note", "Call", "Email", "Meeting", "Reminder", "Task"])
          .default("Note"),
        subject: z.string().optional().nullish(),
        notes: z.string().optional().nullish(),
        dueDate: z.string().optional().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      return createLeadActivity({
        leadId: input.leadId,
        userId: ctx.user.id,
        activityType: input.activityType,
        subject: input.subject?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        completed: false,
      });
    }),

  updateActivity: leadsEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          activityType: z
            .enum(["Note", "Call", "Email", "Meeting", "Reminder", "Task"])
            .optional(),
          subject: z.string().optional().nullish(),
          notes: z.string().optional().nullish(),
          dueDate: z.string().optional().nullish(),
          completed: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const completed = input.data.completed;
      return updateLeadActivity(input.id, {
        activityType: input.data.activityType,
        subject:
          input.data.subject === undefined
            ? undefined
            : input.data.subject?.trim() || null,
        notes:
          input.data.notes === undefined
            ? undefined
            : input.data.notes?.trim() || null,
        dueDate:
          input.data.dueDate === undefined
            ? undefined
            : input.data.dueDate
              ? new Date(input.data.dueDate)
              : null,
        completed,
        completedAt:
          completed === undefined ? undefined : completed ? new Date() : null,
      });
    }),

  deleteActivity: leadsDeleteProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLeadActivity(input.id);
      return { success: true };
    }),

  import: leadsCreateProcedure
    .input(
      z.object({
        records: z.array(
          z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            email: z.string().optional().or(z.literal("")).nullish(),
            phone: z.string().nullish(),
            company: z.string().nullish(),
            source: z.string().nullish(),
            notes: z.string().nullish(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      for (const record of input.records) {
        try {
          const cleaned: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            companyName?: string;
            source?: string;
            notes?: string;
            status: "New";
            statusFlag: "Green";
            isBlacklisted: boolean;
            duplicateWarning: boolean;
            duplicateNotes?: string;
          } = {
            firstName: record.firstName || "Unknown",
            lastName: record.lastName || "Unknown",
            email: record.email?.trim() || undefined,
            phone: record.phone?.trim() || undefined,
            companyName: record.company?.trim() || undefined,
            source: record.source?.trim() || undefined,
            notes: record.notes?.trim() || undefined,
            status: "New",
            statusFlag: "Green",
            isBlacklisted: false,
            duplicateWarning: false,
          };

          const softDuplicate = await findDuplicateLead({
            email: cleaned.email,
            phone: cleaned.phone,
            firstName: cleaned.firstName,
            lastName: cleaned.lastName,
          });

          if (softDuplicate) {
            cleaned.duplicateWarning = true;
            cleaned.duplicateNotes = `Possible duplicate based on name/email/phone (ID ${softDuplicate.id}).`;
          }

          const lead = await createLead(cleaned as any);
          results.push({ success: true, id: (lead as any).id || 0 });
        } catch (error) {
          results.push({ success: false, error: String(error) });
        }
      }
           return results;
    }),

  convert: protectedProcedure
    .use(async ({ ctx, next }) => {
      await assertModulePermission(ctx.user, "leads", "edit");
      await assertModulePermission(ctx.user, "students", "create");
      return next();
    })
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return convertLeadToStudent(input.id);
    }),
}); 

// ============ Companies Router ============
const companiesRouter = router({
  list: companiesViewProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllCompanies(input?.branchId);
    }),

  get: companiesViewProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const company = await getCompanyById(input.id);
      if (!company) throw new TRPCError({ code: "NOT_FOUND" });
      return company;
    }),

  create: companiesCreateProcedure
    .input(
      z.object({
        name: z.string().min(1),
        registrationNumber: z.string().optional().nullish(),
        phone: z.string().optional().nullish(),
        email: z.string().email().optional().or(z.literal("")).nullish(),
        website: z.string().optional().nullish(),
        physicalAddress: z.string().optional().nullish(),
        primaryContactName: z.string().optional().nullish(),
        primaryContactEmail: z.string().email().optional().or(z.literal("")).nullish(),
        primaryContactPhone: z.string().optional().nullish(),
        status: z.enum(["Active", "Inactive", "Prospect"]).optional(),
        branchId: z.number().optional().nullable(),
        notes: z.string().optional().nullish(),
      })
    )
    .mutation(async ({ input }) => {
      return createCompany({
        name: input.name.trim(),
        registrationNumber: input.registrationNumber?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        email: input.email?.trim() || undefined,
        website: input.website?.trim() || undefined,
        physicalAddress: input.physicalAddress?.trim() || undefined,
        primaryContactName: input.primaryContactName?.trim() || undefined,
        primaryContactEmail: input.primaryContactEmail?.trim() || undefined,
        primaryContactPhone: input.primaryContactPhone?.trim() || undefined,
        status: input.status ?? "Active",
        branchId: input.branchId ?? undefined,
        notes: input.notes?.trim() || undefined,
      });
    }),

  update: companiesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().min(1).optional(),
          registrationNumber: z.string().optional().nullish(),
          phone: z.string().optional().nullish(),
          email: z.string().email().optional().or(z.literal("")).nullish(),
          website: z.string().optional().nullish(),
          physicalAddress: z.string().optional().nullish(),
          primaryContactName: z.string().optional().nullish(),
          primaryContactEmail: z.string().email().optional().or(z.literal("")).nullish(),
          primaryContactPhone: z.string().optional().nullish(),
          status: z.enum(["Active", "Inactive", "Prospect"]).optional(),
          branchId: z.number().optional().nullable(),
          notes: z.string().optional().nullish(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateCompany(input.id, {
        name: input.data.name?.trim(),
        registrationNumber: input.data.registrationNumber?.trim() || undefined,
        phone: input.data.phone?.trim() || undefined,
        email: input.data.email?.trim() || undefined,
        website: input.data.website?.trim() || undefined,
        physicalAddress: input.data.physicalAddress?.trim() || undefined,
        primaryContactName: input.data.primaryContactName?.trim() || undefined,
        primaryContactEmail: input.data.primaryContactEmail?.trim() || undefined,
        primaryContactPhone: input.data.primaryContactPhone?.trim() || undefined,
        status: input.data.status,
        branchId: input.data.branchId ?? undefined,
        notes: input.data.notes?.trim() || undefined,
      });
    }),

  delete: companiesDeleteProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCompany(input.id);
      return { success: true };
    }),

  contacts: companiesViewProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ input }) => {
      return getContactsForCompany(input.companyId);
    }),

  createContact: companiesCreateProcedure
    .input(
      z.object({
        companyId: z.number().optional().nullable(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional().or(z.literal("")).nullish(),
        phone: z.string().optional().nullish(),
        position: z.string().optional().nullish(),
        contactType: z.string().optional().nullish(),
        notes: z.string().optional().nullish(),
      })
    )
    .mutation(async ({ input }) => {
      return createContact({
        companyId: input.companyId ?? undefined,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        position: input.position?.trim() || undefined,
        contactType: input.contactType?.trim() || "Client",
        notes: input.notes?.trim() || undefined,
        active: true,
      });
    }),

  updateContact: companiesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          companyId: z.number().optional().nullable(),
          firstName: z.string().min(1).optional(),
          lastName: z.string().min(1).optional(),
          email: z.string().email().optional().or(z.literal("")).nullish(),
          phone: z.string().optional().nullish(),
          position: z.string().optional().nullish(),
          contactType: z.string().optional().nullish(),
          notes: z.string().optional().nullish(),
          active: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateContact(input.id, {
        companyId: input.data.companyId ?? undefined,
        firstName: input.data.firstName?.trim(),
        lastName: input.data.lastName?.trim(),
        email: input.data.email?.trim() || undefined,
        phone: input.data.phone?.trim() || undefined,
        position: input.data.position?.trim() || undefined,
        contactType: input.data.contactType?.trim() || undefined,
        notes: input.data.notes?.trim() || undefined,
        active: input.data.active,
      });
    }),

  deleteContact: companiesDeleteProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteContact(input.id);
      return { success: true };
    }),
});

// ============ Courses Router ============
const coursesRouter = router({
  list: coursesViewProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllCourses(input?.branchId);
    }),

  get: coursesViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const course = await getCourseById(input);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  create: coursesCreateProcedure
    .input(
      z.object({
        name: z.string(),
        code: z.string(),
        description: z.string().optional(),
        duration: z.number().optional(),
        level: z.enum(["Level 1", "Level 2", "Level 3"]).optional(),
        branchId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createCourse(input as any);
    }),

  update: coursesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          duration: z.number().optional(),
          level: z.enum(["Level 1", "Level 2", "Level 3"]).optional(),
          active: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateCourse(input.id, input.data);
    }),

  delete: coursesDeleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const numId = parseInt(input.id, 10);
      const { courses } = await import("../drizzle/schema");
      await db.delete(courses).where(eq(courses.id, numId));
      return { success: true };
    }),
});

const courseStartPackConfigSchema = z
  .object({
    location: z.string().optional().nullable(),
    industrySector: z.string().optional().nullable(),
    sectorScope: z.string().optional().nullable(),
    productOrEquipmentScope: z.string().optional().nullable(),
    techniqueScope: z.string().optional().nullable(),
    selectedEquipmentIds: z.array(z.number().int().positive()).optional(),
    selectedSpecimenIds: z.array(z.number().int().positive()).optional(),
    additionalEquipment: z.string().optional().nullable(),
    additionalSpecimens: z.string().optional().nullable(),
    safetyDeclaration: z.string().optional().nullable(),
    lecturerNotes: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

// ============ Course Schedules Router ============
const courseSchedulesRouter = router({
  list: schedulesViewProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllCourseSchedules(input?.branchId);
    }),

  create: schedulesCreateProcedure
    .input(
      z.object({
        courseId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
        endOfCourseExamStartDate: z.date().optional().nullable(),
        endOfCourseExamEndDate: z.date().optional().nullable(),
        lecturerId: z.number().optional().nullable(),
        maxCapacity: z.number().optional(),
        branchId: z.number().optional().nullable(),
        courseStartPackConfig: courseStartPackConfigSchema,
        status: z.enum(["Scheduled", "In Progress", "Completed", "Cancelled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createCourseSchedule(input as any);
    }),

  import: schedulesCreateProcedure
    .input(
      z.object({
        records: z.array(scheduleImportRowSchema),
        defaults: z
          .object({
            branchId: z.number().optional().nullable(),
            status: scheduleStatusSchema.optional(),
          })
          .optional(),
        importMeta: z
          .object({
            fileName: z.string().optional().nullable(),
            columnMapping: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const branchRecords = (await getAllBranches()) as ImportBranchRecord[];
      const courseRecords = (await getAllCourses()) as ImportCourseRecord[];
      const lecturerRecords = (await getAllLecturers()) as ImportLecturerRecord[];
      const scheduleRecords = (await getAllCourseSchedules()) as ImportScheduleRecord[];

      const scheduleKeyMap = new Map<string, ImportScheduleRecord>();
      for (const schedule of scheduleRecords) {
        scheduleKeyMap.set(
          `${schedule.branchId ?? 0}|${schedule.courseId}|${formatDateKey(schedule.startDate)}`,
          schedule
        );
      }

      let importLogId: number | null = null;
      if (input.importMeta?.fileName) {
        const importLogResult = await createImportLog({
          entityType: "courseSchedules",
          fileName: input.importMeta.fileName,
          totalRecords: input.records.length,
          successfulRecords: 0,
          failedRecords: 0,
          columnMapping: input.importMeta.columnMapping ?? {},
          status: "Processing",
          uploadedBy: ctx.user.id,
        });

        importLogId = Number(
          (importLogResult as { insertId?: number } | undefined)?.insertId ?? 0
        ) || null;
      }

      let successCount = 0;
      let failureCount = 0;
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      for (let index = 0; index < input.records.length; index += 1) {
        const row = input.records[index];
        try {
          const branch = resolveImportedBranch(
            row,
            branchRecords,
            input.defaults?.branchId ?? null
          );
          const course = await resolveImportedCourse(row, branch.id, courseRecords);
          const lecturer = resolveImportedLecturer(row, branch.id, lecturerRecords);

          const startDate = parseImportedDateValue(row.startDate, "start date");
          if (!startDate) {
            throw new Error("Start date is required.");
          }

          const examStartDate = parseImportedDateValue(
            row.endOfCourseExamStartDate,
            "end-of-course exam start date"
          );
          const examEndDate = parseImportedDateValue(
            row.endOfCourseExamEndDate,
            "end-of-course exam end date"
          );

          let endDate = parseImportedDateValue(row.endDate, "end date");
          if (!endDate) {
            endDate = examEndDate ?? examStartDate;
          }
          if (!endDate && course.duration && course.duration > 0) {
            endDate = calculateEndDateFromDuration(startDate, course.duration);
          }
          if (!endDate) {
            throw new Error(
              "End date is required unless an exam date or course duration is available."
            );
          }

          const maxCapacity = parseOptionalImportInteger(
            row.maxCapacity,
            "Max Capacity"
          );
          if (maxCapacity !== null && maxCapacity < 1) {
            throw new Error("Max Capacity must be at least 1.");
          }

          const status = resolveImportedScheduleStatus(
            row.status ?? input.defaults?.status ?? "Scheduled"
          );

          const normalizedDates = normalizeScheduleExamDates({
            startDate,
            endDate,
            endOfCourseExamStartDate: examStartDate,
            endOfCourseExamEndDate: examEndDate,
          });

          const schedulePayload = {
            courseId: course.id,
            branchId: branch.id,
            lecturerId: lecturer?.id ?? null,
            startDate,
            endDate: normalizedDates.end,
            endOfCourseExamStartDate: normalizedDates.examStart,
            endOfCourseExamEndDate: normalizedDates.examEnd,
            maxCapacity: maxCapacity ?? null,
            status,
          };

          const scheduleKey = `${branch.id}|${course.id}|${formatDateKey(startDate)}`;
          const existingSchedule = scheduleKeyMap.get(scheduleKey);

          if (existingSchedule) {
            const hasChanges =
              formatDateKey(existingSchedule.startDate) !== formatDateKey(startDate) ||
              formatDateKey(existingSchedule.endDate) !==
                formatDateKey(normalizedDates.end) ||
              formatDateKey(existingSchedule.endOfCourseExamStartDate) !==
                formatDateKey(normalizedDates.examStart) ||
              formatDateKey(existingSchedule.endOfCourseExamEndDate) !==
                formatDateKey(normalizedDates.examEnd) ||
              (existingSchedule.lecturerId ?? null) !== (lecturer?.id ?? null) ||
              (existingSchedule.maxCapacity ?? null) !== (maxCapacity ?? null) ||
              existingSchedule.status !== status;

            if (hasChanges) {
              await updateCourseSchedule(existingSchedule.id, schedulePayload);
              scheduleKeyMap.set(scheduleKey, {
                ...existingSchedule,
                ...schedulePayload,
              });
              updatedCount += 1;
            } else {
              skippedCount += 1;
            }
          } else {
            const createdScheduleResult = await createCourseSchedule(schedulePayload as any);
            const createdScheduleId = Number(
              (createdScheduleResult as { insertId?: number } | undefined)?.insertId ?? 0
            );

            scheduleKeyMap.set(scheduleKey, {
              id: createdScheduleId,
              courseId: course.id,
              branchId: branch.id,
              lecturerId: lecturer?.id ?? null,
              startDate,
              endDate: normalizedDates.end,
              endOfCourseExamStartDate: normalizedDates.examStart,
              endOfCourseExamEndDate: normalizedDates.examEnd,
              maxCapacity: maxCapacity ?? null,
              status,
            });
            createdCount += 1;
          }

          successCount += 1;
        } catch (error) {
          failureCount += 1;
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Row ${index + 1}: ${message}`);
        }
      }

      if (importLogId) {
        await updateImportLog(importLogId, {
          successfulRecords: successCount,
          failedRecords: failureCount,
          status:
            successCount === 0 && failureCount > 0
              ? "Failed"
              : "Completed",
          errorLog: errors.length > 0 ? errors.join("\n") : null,
        });
      }

      return {
        successCount,
        failureCount,
        createdCount,
        updatedCount,
        skippedCount,
        errors: errors.slice(0, 10),
        importLogId,
      };
    }),

  get: schedulesViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const schedule = await getCourseScheduleById(input);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      return schedule;
    }),

  update: schedulesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          courseId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          endOfCourseExamStartDate: z.date().optional().nullable(),
          endOfCourseExamEndDate: z.date().optional().nullable(),
          lecturerId: z.number().optional().nullable(),
          maxCapacity: z.number().optional(),
          branchId: z.number().optional().nullable(),
          courseStartPackConfig: courseStartPackConfigSchema,
          status: z.enum(["Scheduled", "In Progress", "Completed", "Cancelled"]).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateCourseSchedule(input.id, input.data);
    }),

  isStarted: schedulesViewProcedure
    .input(z.number())
    .mutation(async ({ input }) => {
      const schedule = await getCourseScheduleById(input);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      const now = new Date();
      return new Date(schedule.startDate) <= now;
    }),

  delete: schedulesDeleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const numId = parseInt(input.id, 10);
      const { courseSchedules } = await import("../drizzle/schema");
      await db.delete(courseSchedules).where(eq(courseSchedules.id, numId));
      return { success: true };
    }),
});

// ============ Enrollments Router ============
const enrollmentsRouter = router({
  list: schedulesViewProcedure.query(async () => {
    return getAllEnrollments();
  }),

  byStudent: schedulesViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getEnrollmentsByStudent(input);
    }),

  byCourseSchedule: schedulesViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getEnrollmentsByCourseSchedule(input);
    }),

  create: schedulesCreateProcedure
    .input(
      z.object({
        studentId: z.number(),
        courseScheduleId: z.number(),
        status: z.enum(["Active", "Completed", "Withdrawn", "Suspended"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createEnrollment(input as any);
      const student = await getStudentById(input.studentId);
      const schedule = await getCourseScheduleById(input.courseScheduleId);
      const course = schedule ? await getCourseById(schedule.courseId) : null;

      const { createNotification } = await import("./notifications");
      await createNotification(ctx.user.id, {
        type: "enrollment_confirmed",
        title: "Enrolment Confirmed",
        message: `${student ? `${student.firstName} ${student.lastName}` : "Student"} has been enrolled in ${course?.name || "the selected course"}.`,
        entityType: "enrollment",
        actionUrl: "/enrollments",
        priority: "normal",
      });

      return result;
    }),

  update: schedulesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["Active", "Completed", "Withdrawn", "Suspended"]).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateEnrollment(input.id, input.data);
    }),

  delete: schedulesDeleteProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const numId = parseInt(input.id, 10);
      const { enrollments } = await import("../drizzle/schema");
      await db.delete(enrollments).where(eq(enrollments.id, numId));
      return { success: true };
    }),
});

// ============ Attendance Router ============
const attendanceRouter = router({
  byEnrollment: schedulesViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getAttendanceByEnrollment(input);
    }),

  byCourseSchedule: schedulesViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      return getAttendanceByCourseSchedule(input);
    }),

  create: schedulesCreateProcedure
    .input(
      z.object({
        enrollmentId: z.number(),
        courseScheduleId: z.number(),
        attendanceDate: z.date(),
        status: z.enum(["Present", "Absent", "Late", "Excused"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createAttendance(input as any);
    }),

  update: schedulesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["Present", "Absent", "Late", "Excused"]).optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateAttendance(input.id, input.data);
    }),

  markBatch: schedulesEditProcedure
    .input(
      z.object({
        courseScheduleId: z.number(),
        attendanceDate: z.date(),
        records: z
          .array(
            z.object({
              enrollmentId: z.number(),
              status: z.enum(["Present", "Absent", "Late", "Excused"]),
              notes: z.string().optional().nullable(),
            })
          )
          .min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await markAttendanceForSchedule(input);
      const schedule = await getCourseScheduleById(input.courseScheduleId);
      const course = schedule ? await getCourseById(schedule.courseId) : null;

      const { createNotification } = await import("./notifications");
      await createNotification(ctx.user.id, {
        type: "attendance_marked",
        title: "Attendance Recorded",
        message: `${input.records.length} attendance record(s) captured for ${course?.name || "the selected schedule"}.`,
        entityType: "attendance",
        actionUrl: "/attendance",
        priority: "normal",
      });

      return result;
  }),
});

// ============ Assessments Router ============
const assessmentsRouter = router({
  list: schedulesViewProcedure
    .input(z.object({ enrollmentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      if (input?.enrollmentId) {
        return getAssessmentsByEnrollment(input.enrollmentId);
      }

      return getAllAssessments();
    }),

  create: schedulesCreateProcedure
    .input(
      z.object({
        enrollmentId: z.number(),
        assessorId: z.number().optional().nullable(),
        assessmentType: z.enum(["Theory", "Practical"]),
        attemptNumber: z.number().int().min(1).optional(),
        score: z.number().min(0).optional().nullable(),
        maxScore: z.number().min(0).optional().nullable(),
        result: z.enum(["Pass", "Fail", "Incomplete"]),
        assessmentDate: z.date(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      return createAssessment({
        enrollmentId: input.enrollmentId,
        assessorId: input.assessorId ?? null,
        assessmentType: input.assessmentType,
        attemptNumber: input.attemptNumber ?? 1,
        score: input.score ?? null,
        maxScore: input.maxScore ?? null,
        result: input.result,
        assessmentDate: input.assessmentDate,
        notes: input.notes?.trim() || null,
      });
    }),

  update: schedulesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          assessorId: z.number().optional().nullable(),
          assessmentType: z.enum(["Theory", "Practical"]).optional(),
          attemptNumber: z.number().int().min(1).optional(),
          score: z.number().min(0).optional().nullable(),
          maxScore: z.number().min(0).optional().nullable(),
          result: z.enum(["Pass", "Fail", "Incomplete"]).optional(),
          assessmentDate: z.date().optional(),
          notes: z.string().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const data = {
        ...input.data,
        notes:
          input.data.notes === undefined
            ? undefined
            : input.data.notes?.trim() || null,
      };
      return updateAssessment(input.id, {
        ...data,
      });
    }),

  delete: schedulesDeleteProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteAssessment(input.id);
      return { success: true };
    }),
});

// ============ Certificates Router ============
const certificatesRouter = router({
  list: schedulesViewProcedure
    .input(
      z
        .object({
          studentId: z.number().optional(),
          enrollmentId: z.number().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (input?.enrollmentId) {
        return getCertificatesByEnrollment(input.enrollmentId);
      }

      if (input?.studentId) {
        return getCertificatesByStudent(input.studentId);
      }

      return getAllCertificates();
    }),

  create: schedulesCreateProcedure
    .input(
      z.object({
        enrollmentId: z.number(),
        certificateNumber: z.string().optional().nullable(),
        issuedDate: z.date(),
        expiryDate: z.date().optional().nullable(),
        status: z.enum(["Active", "Expired", "Revoked"]).optional(),
        content: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createCertificate({
        enrollmentId: input.enrollmentId,
        certificateNumber: input.certificateNumber?.trim() || undefined,
        issuedDate: input.issuedDate,
        expiryDate: input.expiryDate ?? null,
        status: input.status ?? "Active",
        content: input.content?.trim() || null,
        notes: input.notes?.trim() || null,
        issuedBy: ctx.user.id,
      });
    }),

  update: schedulesEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          enrollmentId: z.number().optional(),
          certificateNumber: z.string().optional().nullable(),
          issuedDate: z.date().optional(),
          expiryDate: z.date().optional().nullable(),
          status: z.enum(["Active", "Expired", "Revoked"]).optional(),
          content: z.string().optional().nullable(),
          notes: z.string().optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      return updateCertificate(input.id, {
        enrollmentId: input.data.enrollmentId,
        certificateNumber:
          input.data.certificateNumber === undefined
            ? undefined
            : input.data.certificateNumber?.trim() || undefined,
        issuedDate: input.data.issuedDate,
        expiryDate:
          input.data.expiryDate === undefined ? undefined : input.data.expiryDate,
        status: input.data.status,
        content:
          input.data.content === undefined
            ? undefined
            : input.data.content?.trim() || null,
        notes:
          input.data.notes === undefined
            ? undefined
            : input.data.notes?.trim() || null,
      });
    }),

  delete: schedulesDeleteProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCertificate(input.id);
      return { success: true };
    }),
});
export { levelIIIRouter } from "./levelIII/router";
// ============ Specimens Router ============


// ============ KPI Router ============
// ============ Lecturers Router ============
type DocumentMetadataKind = "library" | "template" | "generated";

const generatedDocumentStatusSchema = z.enum([
  "Draft",
  "Issued",
  "Corrected",
  "Superseded",
]);
const documentApprovalStatusSchema = z.enum([
  "Draft",
  "In Review",
  "Approved",
  "Rejected",
]);
type DocumentApprovalStatus = z.infer<typeof documentApprovalStatusSchema>;
const digitalSignatureDataUrlSchema = z
  .string()
  .min(1)
  .max(500_000)
  .refine((value) => value.startsWith("data:image/png;base64,"), {
    message: "The digital signature must be a PNG signature captured from the signature pad.",
  });
const documentDistributionMethodSchema = z.enum([
  "Email",
  "Printed Copy",
  "Hand Delivered",
  "SharePoint Link",
  "Other",
]);

function getDocumentMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getControlledDocumentKind(metadata: Record<string, any>) {
  const kind = String(metadata.kind || "").trim();
  return kind === "template" || kind === "generated" ? kind : null;
}

function getDocumentApprovalStatus(
  metadata: Record<string, any>,
  fallbackStatus: DocumentApprovalStatus = "Draft"
) {
  if (documentApprovalStatusSchema.safeParse(metadata.approvalStatus).success) {
    return metadata.approvalStatus as DocumentApprovalStatus;
  }

  const controlledKind = getControlledDocumentKind(metadata);
  if (controlledKind === "template" && String(metadata.templateStatus || "") === "Active") {
    return "Approved";
  }

  if (controlledKind === "generated" && String(metadata.generatedStatus || "") === "Issued") {
    return "Approved";
  }

  return fallbackStatus;
}

function resetDocumentApprovalMetadata(
  metadata: Record<string, any>,
  fallbackStatus: DocumentApprovalStatus = "Draft"
) {
  const controlledKind = getControlledDocumentKind(metadata);
  if (!controlledKind) {
    return metadata;
  }

  return {
    ...metadata,
    approvalStatus: fallbackStatus,
    submittedForReviewAt: undefined,
    submittedForReviewByName: undefined,
    submittedForReviewByUserId: undefined,
    approvedAt: undefined,
    approvedByName: undefined,
    approvedByUserId: undefined,
    rejectedAt: undefined,
    rejectedByName: undefined,
    rejectedByUserId: undefined,
    approvalNote: undefined,
    rejectionReason: undefined,
    releaseAuthority: undefined,
    releaseAuthorityRole: undefined,
  };
}

function ensureDocumentApprovalMetadata(
  metadata: Record<string, any>,
  fallbackStatus: DocumentApprovalStatus = "Draft"
) {
  const controlledKind = getControlledDocumentKind(metadata);
  if (!controlledKind) {
    return metadata;
  }

  return {
    ...metadata,
    approvalStatus: getDocumentApprovalStatus(metadata, fallbackStatus),
  };
}

function formatReleaseAuthorityRole(role: "user" | "admin" | "super_admin") {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "user":
    default:
      return "User";
  }
}

async function requireControlledDocumentForApproval(documentId: number) {
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The document could not be found.",
    });
  }

  const metadata = ensureDocumentApprovalMetadata(getDocumentMetadata(document.tags));
  const controlledKind = getControlledDocumentKind(metadata);
  if (!controlledKind) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only template and generated documents use the approval workflow.",
    });
  }

  return {
    document,
    metadata,
    controlledKind,
  };
}

function assertCanApproveDocuments(role: "user" | "admin" | "super_admin") {
  if (!["admin", "super_admin"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only Admin or Super Admin can approve, reject, or release controlled documents.",
    });
  }
}

function slugifyDocumentValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractTemplatePlaceholders(content: string) {
  return extractDocumentPlaceholders(content);
}

function resolveDocumentCode(metadata: Record<string, any>, fallbackValue: string) {
  const code = String(metadata.documentCode || "").trim();
  if (code) return code;
  const keyFallback = String(metadata.templateKey || "").trim();
  if (keyFallback) return keyFallback.toUpperCase();
  return fallbackValue.trim().toUpperCase();
}

function formatDocumentDate(value?: Date | string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDocumentControlDate(value?: Date | string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function buildPackReleaseReference(
  packType: "Learner Pack" | "Lecturer Pack",
  contextId: number,
  issuedAt: Date
) {
  const prefix = packType === "Learner Pack" ? "LP" : "LCP";
  const stamp = `${issuedAt.getFullYear()}${String(issuedAt.getMonth() + 1).padStart(2, "0")}${String(
    issuedAt.getDate()
  ).padStart(2, "0")}${String(issuedAt.getHours()).padStart(2, "0")}${String(
    issuedAt.getMinutes()
  ).padStart(2, "0")}`;
  return `${prefix}-${String(contextId).padStart(5, "0")}-${stamp}`;
}

function incrementDocumentIssueNumber(currentValue: string) {
  const trimmedValue = currentValue.trim();
  if (!trimmedValue) {
    return "01";
  }

  if (/^\d+$/.test(trimmedValue)) {
    return String(Number(trimmedValue) + 1).padStart(trimmedValue.length, "0");
  }

  const match = trimmedValue.match(/(\d+)(?!.*\d)/);
  if (!match || match.index === undefined) {
    return `${trimmedValue}-01`;
  }

  const currentDigits = match[1];
  const nextDigits = String(Number(currentDigits) + 1).padStart(currentDigits.length, "0");
  return (
    trimmedValue.slice(0, match.index) +
    nextDigits +
    trimmedValue.slice(match.index + currentDigits.length)
  );
}

function formatDocumentScore(score: string | number | null, maxScore: string | number | null) {
  if (score === null || score === undefined || score === "") return "";
  if (maxScore === null || maxScore === undefined || maxScore === "") return String(score);
  return `${score}/${maxScore}`;
}

function pickLatestDocumentRecord<T extends { id: number }>(
  rows: T[],
  getDate: (row: T) => Date | string | null | undefined
) {
  return rows.reduce<T | null>((latest, row) => {
    if (!latest) return row;

    const latestTime = new Date(getDate(latest) ?? 0).getTime();
    const rowTime = new Date(getDate(row) ?? 0).getTime();

    if (rowTime > latestTime) return row;
    if (rowTime === latestTime && row.id > latest.id) return row;
    return latest;
  }, null);
}

function replaceDocumentPlaceholders(
  source: string,
  values: Record<string, string | number | null | undefined>
) {
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key) => {
    if (!(key in values)) {
      return `{{${key}}}`;
    }

    const value = values[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlList(items: string[], emptyLabel: string) {
  if (items.length === 0) {
    return `<p>${escapeHtml(emptyLabel)}</p>`;
  }

  return `<ul>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

const DEFAULT_STUDENT_SAFETY_DECLARATION =
  "I acknowledge the course safety briefing, will follow site and classroom safety rules, will report unsafe conditions immediately, and will use the required protective equipment and procedures throughout the course.";

function getInsertId(result: unknown) {
  return Number((result as any)?.insertId || 0);
}

const TRAINING_STARTER_TEMPLATE_DEFINITIONS = [
  {
    templateKey: "course-enrolment-confirmation",
    title: "Course Enrolment Confirmation",
    documentType: "Course Enrolment Confirmation",
    templateCategory: "Student Pack",
    documentCode: "TRN-LRN-001",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Training booking confirmation for a learner and scheduled course.",
    content: `
      <h2>Course Enrolment Confirmation</h2>
      <p>This letter confirms that <strong>{{studentName}}</strong> has been enrolled for the following training.</p>
      <table>
        <tbody>
          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>
          <tr><th>Course</th><td>{{courseLabel}}</td></tr>
          <tr><th>Branch</th><td>{{branchName}}</td></tr>
          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>
          <tr><th>Enrolment Date</th><td>{{enrollmentDate}}</td></tr>
          <tr><th>Schedule Status</th><td>{{scheduleStatus}}</td></tr>
        </tbody>
      </table>
      <p>Please report to <strong>{{branchName}}</strong> with the required identification and PPE where applicable.</p>
      <p>Generated on {{todayDate}}.</p>
    `,
  },
  {
    templateKey: "course-feedback-form",
    title: "Course Feedback Form",
    documentType: "Course Feedback Form",
    templateCategory: "Course Control",
    documentCode: "TRN-CTL-001",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Editable learner feedback form for a completed course.",
    content: `
      <h2>Course Feedback Form</h2>
      <p>Student: <strong>{{studentName}}</strong></p>
      <p>Course: <strong>{{courseLabel}}</strong></p>
      <p>Dates: {{scheduleStartDate}} to {{scheduleEndDate}}</p>
      <table>
        <tbody>
          <tr><th>Training Material</th><td contenteditable="true">Excellent / Good / Fair / Poor</td></tr>
          <tr><th>Lecturer Delivery</th><td contenteditable="true">Excellent / Good / Fair / Poor</td></tr>
          <tr><th>Venue & Facilities</th><td contenteditable="true">Excellent / Good / Fair / Poor</td></tr>
          <tr><th>Overall Experience</th><td contenteditable="true">Excellent / Good / Fair / Poor</td></tr>
        </tbody>
      </table>
      <p><strong>Learner Comments:</strong></p>
      <p contenteditable="true">Add learner comments here.</p>
    `,
  },
  {
    templateKey: "training-process-control-sheet",
    title: "Training Process Control Sheet",
    documentType: "Training Process Control Sheet",
    templateCategory: "Course Control",
    documentCode: "TRN-CTL-002",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Course delivery control sheet linked to a student enrolment and schedule.",
    content: `
      <h2>Training Process Control Sheet</h2>
      <table>
        <tbody>
          <tr><th>Student</th><td>{{studentName}}</td></tr>
          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>
          <tr><th>Course</th><td>{{courseLabel}}</td></tr>
          <tr><th>Course Level</th><td>{{courseLevel}}</td></tr>
          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>
          <tr><th>Branch</th><td>{{branchName}}</td></tr>
          <tr><th>Latest Assessment</th><td>{{latestAssessmentType}} - {{latestAssessmentResult}}</td></tr>
        </tbody>
      </table>
      <p><strong>Control Notes:</strong></p>
      <p contenteditable="true">Capture training observations, attendance issues, or material checks here.</p>
    `,
  },
  {
    templateKey: "counselling-register",
    title: "Counselling Register",
    documentType: "Counselling Register",
    templateCategory: "Course Control",
    documentCode: "TRN-CTL-003",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Editable counselling record for learner support or performance interventions.",
    content: `
      <h2>Counselling Register</h2>
      <p>Learner: <strong>{{studentName}}</strong></p>
      <p>Course: <strong>{{courseLabel}}</strong></p>
      <table>
        <tbody>
          <tr><th>Date</th><td>{{todayDate}}</td></tr>
          <tr><th>Reason for Counselling</th><td contenteditable="true">Add counselling reason.</td></tr>
          <tr><th>Action Agreed</th><td contenteditable="true">Add agreed action.</td></tr>
          <tr><th>Follow-up Date</th><td contenteditable="true">Add follow-up date.</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    templateKey: "course-completion-checklist",
    title: "Course Completion Checklist",
    documentType: "Course Completion Checklist",
    templateCategory: "Results & Certificates",
    documentCode: "TRN-RES-001",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Checklist used before a training course is formally closed out.",
    content: `
      <h2>Course Completion Checklist</h2>
      <p>Student: <strong>{{studentName}}</strong> | Course: <strong>{{courseLabel}}</strong></p>
      <table>
        <tbody>
          <tr><th>Attendance Finalised</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Assessment Recorded</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Result Notice Issued</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Certificate Ready</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Feedback Captured</th><td contenteditable="true">Yes / No</td></tr>
        </tbody>
      </table>
      <p><strong>Close-out Notes:</strong></p>
      <p contenteditable="true">Record outstanding actions or corrections here.</p>
    `,
  },
  {
    templateKey: "certificate-of-attendance",
    title: "Certificate of Attendance",
    documentType: "Certificate of Attendance",
    templateCategory: "Results & Certificates",
    documentCode: "TRN-RES-002",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Attendance confirmation document driven from the enrolment and course schedule.",
    content: `
      <h2>Certificate of Attendance</h2>
      <p>This certifies that <strong>{{studentName}}</strong> attended the training course listed below.</p>
      <table>
        <tbody>
          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>
          <tr><th>Course</th><td>{{courseLabel}}</td></tr>
          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>
          <tr><th>Branch</th><td>{{branchName}}</td></tr>
          <tr><th>Certificate Number</th><td>{{certificateNumber}}</td></tr>
          <tr><th>Issued Date</th><td>{{certificateIssuedDate}}</td></tr>
        </tbody>
      </table>
      <p>Generated on {{todayDate}}.</p>
    `,
  },
  {
    templateKey: "end-of-course-result-notice",
    title: "End of Course Result Notice",
    documentType: "End of Course Result Notice",
    templateCategory: "Results & Certificates",
    documentCode: "TRN-RES-003",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Learner result notice using the latest recorded assessment result.",
    content: `
      <h2>End of Course Exam Result Notice</h2>
      <table>
        <tbody>
          <tr><th>Student</th><td>{{studentName}}</td></tr>
          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>
          <tr><th>Course</th><td>{{courseLabel}}</td></tr>
          <tr><th>Exam Date</th><td>{{latestAssessmentDate}}</td></tr>
          <tr><th>Assessment Type</th><td>{{latestAssessmentType}}</td></tr>
          <tr><th>Result</th><td>{{latestAssessmentResult}}</td></tr>
          <tr><th>Score</th><td>{{latestAssessmentScore}}</td></tr>
        </tbody>
      </table>
      <p><strong>Remarks:</strong></p>
      <p contenteditable="true">Add remarks, rewrite conditions, or special instructions here.</p>
    `,
  },
  {
    templateKey: "exam-rewrite-application",
    title: "Exam Rewrite Application",
    documentType: "Exam Rewrite Application",
    templateCategory: "Results & Certificates",
    documentCode: "TRN-RES-004",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Editable rewrite application linked to the learner and their latest assessment outcome.",
    content: `
      <h2>End of Course Exam Rewrite Application Form</h2>
      <table>
        <tbody>
          <tr><th>Student</th><td>{{studentName}}</td></tr>
          <tr><th>Student Number</th><td>{{studentNumber}}</td></tr>
          <tr><th>Course</th><td>{{courseLabel}}</td></tr>
          <tr><th>Latest Result</th><td>{{latestAssessmentResult}}</td></tr>
          <tr><th>Latest Score</th><td>{{latestAssessmentScore}}</td></tr>
          <tr><th>Requested Rewrite Date</th><td contenteditable="true">Add requested date.</td></tr>
        </tbody>
      </table>
      <p><strong>Reason / Notes:</strong></p>
      <p contenteditable="true">Add the rewrite reason and approval notes here.</p>
    `,
  },
  {
    templateKey: "lecturer-course-information",
    title: "Lecturer Course Information",
    documentType: "Lecturer Course Information",
    templateCategory: "Lecturer Pack",
    documentCode: "TRN-LEC-001",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Lecturer-facing summary sheet for the allocated course delivery.",
    content: `
      <h2>Lecturer Course Information</h2>
      <table>
        <tbody>
          <tr><th>Course</th><td>{{courseLabel}}</td></tr>
          <tr><th>Level</th><td>{{courseLevel}}</td></tr>
          <tr><th>Duration</th><td>{{courseDurationDays}} day(s)</td></tr>
          <tr><th>Branch</th><td>{{branchName}}</td></tr>
          <tr><th>Training Dates</th><td>{{scheduleStartDate}} to {{scheduleEndDate}}</td></tr>
          <tr><th>End of Course Exam</th><td>{{endOfCourseExamDate}}</td></tr>
          <tr><th>Schedule Status</th><td>{{scheduleStatus}}</td></tr>
        </tbody>
      </table>
      <p><strong>Lecturer Notes:</strong></p>
      <p contenteditable="true">Add delivery notes, logistics, or reminders for the lecturer pack.</p>
    `,
  },
  {
    templateKey: "course-start-readiness-sheet",
    title: "Course Start Readiness Sheet",
    documentType: "Course Start Readiness Sheet",
    templateCategory: "Lecturer Pack",
    documentCode: "QF-TRG-1586",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Course-start sheet for lecturers with sector, equipment, specimen, and logistics details.",
    content: `
      <h2>Course Start Readiness Sheet</h2>
      <table>
        <tbody>
          <tr><th>Course Information</th><td>{{courseLabel}}</td></tr>
          <tr><th>Course Description</th><td>{{courseDescription}}</td></tr>
          <tr><th>Lecturer</th><td>{{lecturerName}}</td></tr>
          <tr><th>Location</th><td>{{scheduleLocation}}</td></tr>
          <tr><th>Start Date</th><td>{{scheduleStartDate}}</td></tr>
          <tr><th>End Date</th><td>{{scheduleEndDate}}</td></tr>
          <tr><th>General / Aerospace Sector</th><td>{{industrySector}}</td></tr>
          <tr><th>Sector Scope</th><td>{{sectorScope}}</td></tr>
          <tr><th>Product / Equipment</th><td>{{productOrEquipmentScope}}</td></tr>
          <tr><th>Techniques</th><td>{{techniqueScope}}</td></tr>
        </tbody>
      </table>
      <h3>Equipment Required</h3>
      {{courseStartEquipmentListHtml}}
      <h3>Specimens Required</h3>
      {{courseStartSpecimenListHtml}}
      <p><strong>Lecturer Notes:</strong></p>
      <p>{{lecturerPackNotes}}</p>
    `,
  },
  {
    templateKey: "student-safety-acknowledgement",
    title: "Student Safety Acknowledgement",
    documentType: "Student Safety Acknowledgement",
    templateCategory: "Lecturer Pack",
    documentCode: "QF-TRG-1411",
    issueNumber: "01",
    effectiveDate: "2026-01-01",
    description: "Class-level safety acknowledgement register for all learners on the course schedule.",
    content: `
      <h2>Student Safety Acknowledgement</h2>
      <table>
        <tbody>
          <tr><th>Course Information</th><td>{{courseLabel}}</td></tr>
          <tr><th>Course Description</th><td>{{courseDescription}}</td></tr>
          <tr><th>Location</th><td>{{scheduleLocation}}</td></tr>
          <tr><th>Start Date</th><td>{{scheduleStartDate}}</td></tr>
          <tr><th>Lecturer</th><td>{{lecturerName}}</td></tr>
          <tr><th>End Date</th><td>{{scheduleEndDate}}</td></tr>
          <tr><th>Student Count</th><td>{{studentCount}}</td></tr>
        </tbody>
      </table>
      <p><strong>Declaration</strong></p>
      <p>{{safetyDeclaration}}</p>
      <table>
        <thead>
          <tr>
            <th>File Number</th>
            <th>Student Number</th>
            <th>Student Name</th>
            <th>Signature</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {{studentSafetyAcknowledgementRows}}
        </tbody>
      </table>
    `,
  },
];

const LEVEL_III_STARTER_TEMPLATE_DEFINITIONS = [
  {
    templateKey: "level-iii-assessment-booking-and-checklist",
    title: "Assessment Booking and Checklist",
    documentType: "Assessment Booking and Checklist",
    templateCategory: "Level III Assessment Pack",
    documentCode: "LVL3-ASM-001",
    issueNumber: "01",
    effectiveDate: "2026-06-08",
    description:
      "Technician booking and pre-assessment checklist based on the Level III assessment pack.",
    content: `
      <h2>Assessment Booking and Checklist</h2>
      <table>
        <tbody>
          <tr><th>Technician</th><td>{{technicianName}}</td></tr>
          <tr><th>ID / Passport</th><td>{{technicianIdNumber}}</td></tr>
          <tr><th>Company</th><td>{{companyName}}</td></tr>
          <tr><th>Branch</th><td>{{branchName}}</td></tr>
          <tr><th>Method</th><td>{{assessmentMethod}}</td></tr>
          <tr><th>Level</th><td>{{assessmentLevel}}</td></tr>
          <tr><th>Assessment Date</th><td>{{assessmentDate}}</td></tr>
          <tr><th>Assessment Venue</th><td>{{assessmentVenue}}</td></tr>
          <tr><th>Eye Test Valid Until</th><td>{{eyeTestValidUntil}}</td></tr>
        </tbody>
      </table>
      <p><strong>Required Support Documents</strong></p>
      {{assessmentSupportDocumentListHtml}}
      <table>
        <tbody>
          <tr><th>Updated logbook received</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Latest CV received</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>ID copy received</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Method certificate received</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Technician ready for assessment</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Required equipment available</th><td contenteditable="true">Yes / No</td></tr>
          <tr><th>Required consumables available</th><td contenteditable="true">Yes / No</td></tr>
        </tbody>
      </table>
      <p><strong>Comments</strong></p>
      <p contenteditable="true">Capture booking acceptance, missing documents, and immediate actions here.</p>
    `,
  },
  {
    templateKey: "level-iii-practical-marking-sheet",
    title: "Practical Marking Sheet",
    documentType: "Practical Marking Sheet",
    templateCategory: "Level III Assessment Pack",
    documentCode: "LVL3-ASM-002",
    issueNumber: "01",
    effectiveDate: "2026-06-08",
    description:
      "Editable practical assessment marking sheet aligned to the PT and MT working forms.",
    content: `
      <h2>Practical Marking Sheet</h2>
      <table>
        <tbody>
          <tr><th>Candidate Name</th><td>{{technicianName}}</td><th>Examination Centre</th><td>{{assessmentVenue}}</td></tr>
          <tr><th>Test Method</th><td>{{assessmentMethod}}</td><th>Examination Date</th><td>{{assessmentDate}}</td></tr>
          <tr><th>Level</th><td>{{assessmentLevel}}</td><th>Examination Reference</th><td>{{assessmentReference}}</td></tr>
          <tr><th>Examination Type</th><td>{{assessmentType}}</td><th>Examiner</th><td>{{examinerName}}</td></tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>Examination Section</th>
            <th>Specimen 1</th>
            <th>Specimen 2</th>
            <th>Max Marks</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>System control and functional checks</td><td contenteditable="true"></td><td contenteditable="true"></td><td>5</td></tr>
          <tr><td>Verification of equipment settings</td><td contenteditable="true"></td><td contenteditable="true"></td><td>5</td></tr>
          <tr><td>Preparation of the specimen</td><td contenteditable="true"></td><td contenteditable="true"></td><td>2</td></tr>
          <tr><td>Selection of technique and operating conditions</td><td contenteditable="true"></td><td contenteditable="true"></td><td>10</td></tr>
          <tr><td>Application of written instructions</td><td contenteditable="true"></td><td contenteditable="true"></td><td>10</td></tr>
          <tr><td>Interpretation and evaluation</td><td contenteditable="true"></td><td contenteditable="true"></td><td>20</td></tr>
          <tr><td>Report completion</td><td contenteditable="true"></td><td contenteditable="true"></td><td>8</td></tr>
        </tbody>
      </table>
      <p><strong>Practical Result Summary</strong></p>
      <table>
        <tbody>
          <tr><th>Specimen 1 Score</th><td contenteditable="true">Add score</td></tr>
          <tr><th>Specimen 2 Score</th><td contenteditable="true">Add score</td></tr>
          <tr><th>Final Decision</th><td contenteditable="true">{{latestAssessmentResult}}</td></tr>
        </tbody>
      </table>
    `,
  },
  {
    templateKey: "level-iii-technician-authorisation-scope",
    title: "Technician Authorisation Scope",
    documentType: "Technician Authorisation Scope",
    templateCategory: "Level III Assessment Pack",
    documentCode: "LVL3-ASM-003",
    issueNumber: "01",
    effectiveDate: "2026-06-08",
    description:
      "Editable scope and limitation sheet for the technician's authorised methods and techniques.",
    content: `
      <h2>Technician Authorisation Scope</h2>
      <table>
        <tbody>
          <tr><th>Technician</th><td>{{technicianName}}</td></tr>
          <tr><th>Company</th><td>{{companyName}}</td></tr>
          <tr><th>Branch</th><td>{{branchName}}</td></tr>
          <tr><th>Certificate Number</th><td>{{certificateNumber}}</td></tr>
          <tr><th>Method</th><td>{{assessmentMethod}}</td></tr>
          <tr><th>Level</th><td>{{assessmentLevel}}</td></tr>
          <tr><th>Certifying Authority</th><td>{{certifyingAuthorityName}}</td></tr>
        </tbody>
      </table>
      <table>
        <thead>
          <tr>
            <th>NDT Method</th>
            <th>Level</th>
            <th>Techniques within the method</th>
            <th>Limitations</th>
          </tr>
        </thead>
        <tbody>
          {{certificationScopeHtml}}
        </tbody>
      </table>
      <p><strong>Restrictions</strong></p>
      <p contenteditable="true">Add restrictions or special notes here.</p>
    `,
  },
  {
    templateKey: "level-iii-assessment-result-notice",
    title: "Assessment Result Notice",
    documentType: "Assessment Result Notice",
    templateCategory: "Level III Assessment Pack",
    documentCode: "LVL3-ASM-004",
    issueNumber: "01",
    effectiveDate: "2026-06-08",
    description:
      "Technician assessment outcome notice that can be issued after the Level III review is complete.",
    content: `
      <h2>Assessment Result Notice</h2>
      <table>
        <tbody>
          <tr><th>Technician</th><td>{{technicianName}}</td></tr>
          <tr><th>Company</th><td>{{companyName}}</td></tr>
          <tr><th>Method</th><td>{{assessmentMethod}}</td></tr>
          <tr><th>Level</th><td>{{assessmentLevel}}</td></tr>
          <tr><th>Assessment Date</th><td>{{assessmentDate}}</td></tr>
          <tr><th>Result</th><td>{{latestAssessmentResult}}</td></tr>
          <tr><th>Score</th><td>{{latestAssessmentScore}}</td></tr>
          <tr><th>Examiner</th><td>{{examinerName}}</td></tr>
        </tbody>
      </table>
      <p><strong>Result Notice</strong></p>
      <p contenteditable="true">{{assessmentResultNotice}}</p>
      <p><strong>Immediate Action</strong></p>
      <p contenteditable="true">Add next steps, retraining actions, or issue instructions here.</p>
    `,
  },
] as const;

async function buildTrainingDocumentContext(input: {
  studentId: number;
  enrollmentId: number;
}) {
  const student = await getStudentById(input.studentId);
  if (!student) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected student could not be found.",
    });
  }

  const studentEnrollments = await getEnrollmentsByStudent(input.studentId);
  const enrollment = studentEnrollments.find((row) => row.id === input.enrollmentId);
  if (!enrollment) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected enrolment does not belong to the selected student.",
    });
  }

  const schedule = await getCourseScheduleById(enrollment.courseScheduleId);
  if (!schedule) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Linked schedule could not be found.",
    });
  }

  const course = await getCourseById(schedule.courseId);
  if (!course) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Linked course could not be found.",
    });
  }

  const branch = schedule.branchId ? await getBranchById(schedule.branchId) : null;
  const lecturer = schedule.lecturerId ? await getLecturerById(schedule.lecturerId) : null;
  const scheduleEnrollments = await getEnrollmentsByCourseSchedule(schedule.id);
  const assessmentRows = await getAssessmentsByEnrollment(enrollment.id);
  const certificateRows = await getCertificatesByEnrollment(enrollment.id);
  const latestAssessment = pickLatestDocumentRecord(
    assessmentRows,
    (row) => row.assessmentDate
  );
  const latestCertificate = pickLatestDocumentRecord(
    certificateRows,
    (row) => row.issuedDate
  );

  const studentName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim();
  const courseLabel = course.code ? `${course.code} - ${course.name}` : course.name;
  const lecturerName = lecturer
    ? [lecturer.firstName, lecturer.lastName].filter(Boolean).join(" ").trim()
    : "";
  const maxCapacity = schedule.maxCapacity ?? null;
  const enrolledCount = scheduleEnrollments.length;
  const endOfCourseExamStartDate = formatDocumentDate(schedule.endOfCourseExamStartDate);
  const endOfCourseExamEndDate = formatDocumentDate(schedule.endOfCourseExamEndDate);
  const endOfCourseExamDate =
    endOfCourseExamStartDate && endOfCourseExamEndDate
      ? endOfCourseExamStartDate === endOfCourseExamEndDate
        ? endOfCourseExamStartDate
        : `${endOfCourseExamStartDate} to ${endOfCourseExamEndDate}`
      : endOfCourseExamStartDate || endOfCourseExamEndDate || "";
  const availableSeats =
    maxCapacity === null || maxCapacity === undefined
      ? ""
      : String(Math.max(maxCapacity - enrolledCount, 0));
  const contextValues = {
    studentName,
    studentFirstName: student.firstName ?? "",
    studentLastName: student.lastName ?? "",
    studentNumber: student.studentNumber ?? "",
    studentIdNumber: student.idNumber ?? "",
    studentPassportNumber: student.passportNumber ?? "",
    enrollmentStatus: enrollment.status,
    enrollmentDate: formatDocumentDate(enrollment.enrollmentDate),
    courseName: course.name,
    courseCode: course.code ?? "",
    courseLabel,
    courseLevel: course.level,
    courseDurationDays: course.duration ? String(course.duration) : "",
    scheduleId: String(schedule.id),
    scheduleStartDate: formatDocumentDate(schedule.startDate),
    scheduleEndDate: formatDocumentDate(schedule.endDate),
    endOfCourseExamStartDate,
    endOfCourseExamEndDate,
    endOfCourseExamDate,
    scheduleStatus: schedule.status,
    lecturerName,
    lecturerFirstName: lecturer?.firstName ?? "",
    lecturerLastName: lecturer?.lastName ?? "",
    maxCapacity: maxCapacity ? String(maxCapacity) : "",
    enrolledCount: String(enrolledCount),
    availableSeats,
    branchName: branch?.name ?? "",
    companyName: branch?.companyName || branch?.name || "TextPoint",
    todayDate: formatDocumentDate(new Date()),
    latestAssessmentType: latestAssessment?.assessmentType ?? "",
    latestAssessmentResult: latestAssessment?.result ?? "",
    latestAssessmentDate: formatDocumentDate(latestAssessment?.assessmentDate),
    latestAssessmentScore: formatDocumentScore(
      latestAssessment?.score ?? null,
      latestAssessment?.maxScore ?? null
    ),
    certificateNumber: latestCertificate?.certificateNumber ?? "",
    certificateStatus: latestCertificate?.status ?? "",
    certificateIssuedDate: formatDocumentDate(latestCertificate?.issuedDate),
    certificateExpiryDate: formatDocumentDate(latestCertificate?.expiryDate),
  };

  return {
    values: contextValues,
    metadata: {
      studentId: student.id,
      studentName,
      enrollmentId: enrollment.id,
      scheduleId: schedule.id,
      courseId: course.id,
      courseLabel,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? "",
    },
  };
}

async function buildScheduleDocumentContext(input: { scheduleId: number }) {
  const schedule = await getCourseScheduleById(input.scheduleId);
  if (!schedule) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected schedule could not be found.",
    });
  }

  const course = await getCourseById(schedule.courseId);
  if (!course) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Linked course could not be found.",
    });
  }

  const branch = schedule.branchId ? await getBranchById(schedule.branchId) : null;
  const lecturer = schedule.lecturerId ? await getLecturerById(schedule.lecturerId) : null;
  const scheduleEnrollments = await getEnrollmentsByCourseSchedule(schedule.id);
  const allStudents = await getAllStudents();
  const allEquipment = await getAllEquipment();
  const allSpecimens = await getAllSpecimens();
  const packConfig = schedule.courseStartPackConfig || null;

  const courseLabel = course.code ? `${course.code} - ${course.name}` : course.name;
  const lecturerName = lecturer
    ? [lecturer.firstName, lecturer.lastName].filter(Boolean).join(" ").trim()
    : "";
  const maxCapacity = schedule.maxCapacity ?? null;
  const enrolledCount = scheduleEnrollments.length;
  const endOfCourseExamStartDate = formatDocumentDate(schedule.endOfCourseExamStartDate);
  const endOfCourseExamEndDate = formatDocumentDate(schedule.endOfCourseExamEndDate);
  const endOfCourseExamDate =
    endOfCourseExamStartDate && endOfCourseExamEndDate
      ? endOfCourseExamStartDate === endOfCourseExamEndDate
        ? endOfCourseExamStartDate
        : `${endOfCourseExamStartDate} to ${endOfCourseExamEndDate}`
      : endOfCourseExamStartDate || endOfCourseExamEndDate || "";
  const availableSeats =
    maxCapacity === null || maxCapacity === undefined
      ? ""
      : String(Math.max(maxCapacity - enrolledCount, 0));
  const enrolledStudents = scheduleEnrollments
    .map((enrollment) => allStudents.find((student) => student.id === enrollment.studentId) ?? null)
    .filter((student): student is NonNullable<typeof student> => Boolean(student))
    .sort((left, right) => {
      const leftName = `${left.firstName} ${left.lastName}`.trim();
      const rightName = `${right.firstName} ${right.lastName}`.trim();
      return leftName.localeCompare(rightName);
    });
  const selectedEquipmentIds = Array.isArray(packConfig?.selectedEquipmentIds)
    ? packConfig.selectedEquipmentIds
    : [];
  const selectedSpecimenIds = Array.isArray(packConfig?.selectedSpecimenIds)
    ? packConfig.selectedSpecimenIds
    : [];
  const selectedEquipmentLabels = allEquipment
    .filter((item) => selectedEquipmentIds.includes(item.id))
    .map((item) =>
      [item.name, item.serialNumber ? `Serial: ${item.serialNumber}` : null]
        .filter(Boolean)
        .join(" | ")
    );
  const selectedSpecimenLabels = allSpecimens
    .filter((item) => selectedSpecimenIds.includes(item.id))
    .map((item) =>
      [item.name, item.serialNumber ? `Serial: ${item.serialNumber}` : null]
        .filter(Boolean)
        .join(" | ")
    );
  const equipmentList = [
    ...selectedEquipmentLabels,
    ...(packConfig?.additionalEquipment
      ? packConfig.additionalEquipment
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      : []),
  ];
  const specimenList = [
    ...selectedSpecimenLabels,
    ...(packConfig?.additionalSpecimens
      ? packConfig.additionalSpecimens
          .split(/\r?\n|,/)
          .map((item) => item.trim())
          .filter(Boolean)
      : []),
  ];
  const studentSafetyAcknowledgementRows = enrolledStudents.length
    ? enrolledStudents
        .map((student) => {
          const studentName = [student.firstName, student.lastName].filter(Boolean).join(" ").trim();
          return `
            <tr>
              <td>${escapeHtml(student.studentNumber || String(student.id))}</td>
              <td>${escapeHtml(student.studentNumber || "-")}</td>
              <td>${escapeHtml(studentName || "Learner")}</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          `.trim();
        })
        .join("")
    : '<tr><td colspan="5">No learners are enrolled on this schedule yet.</td></tr>';

  return {
    values: {
      courseName: course.name,
      courseCode: course.code ?? "",
      courseLabel,
      courseDescription: course.description ?? "",
      courseLevel: course.level,
      courseDurationDays: course.duration ? String(course.duration) : "",
      scheduleId: String(schedule.id),
      scheduleStartDate: formatDocumentDate(schedule.startDate),
      scheduleEndDate: formatDocumentDate(schedule.endDate),
      endOfCourseExamStartDate,
      endOfCourseExamEndDate,
      endOfCourseExamDate,
      scheduleStatus: schedule.status,
      lecturerName,
      lecturerFirstName: lecturer?.firstName ?? "",
      lecturerLastName: lecturer?.lastName ?? "",
      branchName: branch?.name ?? "",
      companyName: branch?.companyName || branch?.name || "TextPoint",
      maxCapacity: maxCapacity ? String(maxCapacity) : "",
      enrolledCount: String(enrolledCount),
      availableSeats,
      studentCount: String(enrolledStudents.length),
      scheduleLocation: packConfig?.location || branch?.name || "",
      industrySector: packConfig?.industrySector || "",
      sectorScope: packConfig?.sectorScope || "",
      productOrEquipmentScope: packConfig?.productOrEquipmentScope || "",
      techniqueScope: packConfig?.techniqueScope || "",
      courseStartEquipmentList: equipmentList.join(", "),
      courseStartSpecimenList: specimenList.join(", "),
      courseStartEquipmentListHtml: buildHtmlList(
        equipmentList,
        "No equipment has been configured for this schedule."
      ),
      courseStartSpecimenListHtml: buildHtmlList(
        specimenList,
        "No specimens have been configured for this schedule."
      ),
      studentSafetyAcknowledgementRows,
      safetyDeclaration:
        packConfig?.safetyDeclaration || DEFAULT_STUDENT_SAFETY_DECLARATION,
      lecturerPackNotes: packConfig?.lecturerNotes || "",
      todayDate: formatDocumentDate(new Date()),
    },
    metadata: {
      scheduleId: schedule.id,
      courseId: course.id,
      courseLabel,
      branchId: branch?.id ?? null,
      branchName: branch?.name ?? "",
    },
  };
}

const STUDENT_PACKET_TEMPLATE_CATEGORIES = [
  "Student Pack",
  "Course Control",
  "Results & Certificates",
] as const;

const LECTURER_PACKET_TEMPLATE_CATEGORIES = ["Lecturer Pack"] as const;
const studentPacketTemplateCategorySchema = z.enum(STUDENT_PACKET_TEMPLATE_CATEGORIES);
const lecturerPacketTemplateCategorySchema = z.enum(LECTURER_PACKET_TEMPLATE_CATEGORIES);

function sortTemplatesForPack(documents: Awaited<ReturnType<typeof getAllDocuments>>) {
  const categoryOrder = [
    "Student Pack",
    "Course Control",
    "Results & Certificates",
    "Lecturer Pack",
    "General",
  ];

  return [...documents].sort((left, right) => {
    const leftMetadata = getDocumentMetadata(left.tags);
    const rightMetadata = getDocumentMetadata(right.tags);
    const leftIndex = categoryOrder.indexOf(String(leftMetadata.templateCategory || "General"));
    const rightIndex = categoryOrder.indexOf(String(rightMetadata.templateCategory || "General"));

    if (leftIndex !== rightIndex) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    }

    return left.title.localeCompare(right.title);
  });
}

async function getActiveTemplatesForCategories(categories: readonly string[]) {
  const categorySet = new Set(categories);
  const allDocuments = await getAllDocuments();

  return sortTemplatesForPack(
    allDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return (
        metadata.kind === "template" &&
        metadata.templateStatus === "Active" &&
        categorySet.has(String(metadata.templateCategory || "General"))
      );
    })
  );
}

async function loadMissingTrainingStarterTemplates() {
  const existingDocuments = await getAllDocuments();
  const existingTemplateKeys = new Set(
    existingDocuments
      .map((document) => getDocumentMetadata(document.tags))
      .filter((metadata) => metadata.kind === "template" && metadata.templateKey)
      .map((metadata) => String(metadata.templateKey))
  );

  let created = 0;

  for (const definition of [
    ...TRAINING_STARTER_TEMPLATE_DEFINITIONS,
    ...LEVEL_III_STARTER_TEMPLATE_DEFINITIONS,
  ]) {
    if (existingTemplateKeys.has(definition.templateKey)) {
      continue;
    }

    await createDocument({
      title: definition.title,
      description: definition.description,
      documentType: definition.documentType,
      content: definition.content.trim(),
      url: "about:blank",
      tags: {
        kind: "template" satisfies DocumentMetadataKind,
        templateCategory: definition.templateCategory,
        templateStatus: "Active",
        approvalStatus: "Approved" satisfies DocumentApprovalStatus,
        version: 1,
        templateKey: definition.templateKey,
        documentCode: definition.documentCode,
        issueNumber: definition.issueNumber,
        effectiveDate: definition.effectiveDate,
        placeholderKeys: extractTemplatePlaceholders(definition.content),
        accentColor: "#0f766e",
        companyName: "TextPoint",
        logoUrl: "",
        approvedAt: new Date().toISOString(),
        approvedByName: "System Bootstrap",
        releaseAuthority: "System Bootstrap",
        releaseAuthorityRole: "System",
      },
    } as any);
    created += 1;
  }

  return { created };
}

async function createGeneratedEnrollmentDocument(params: {
  template: Awaited<ReturnType<typeof getDocumentById>>;
  context: Awaited<ReturnType<typeof buildTrainingDocumentContext>>;
  enrollmentId: number;
  generatedStatus: z.infer<typeof generatedDocumentStatusSchema>;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
}) {
  const template = params.template;
  if (!template) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected template could not be found.",
    });
  }

  const templateMetadata = getDocumentMetadata(template.tags);
  if (templateMetadata.kind !== "template") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected document is not a template.",
    });
  }

  const allDocuments = await getAllDocuments();
  const nextVersion =
    allDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return (
        metadata.kind === "generated" &&
        Number(metadata.generatedFromTemplateId) === template.id &&
        Number(metadata.enrollmentId) === params.enrollmentId
      );
    }).length + 1;

  const title = replaceDocumentPlaceholders(
    params.titleOverride?.trim() || template.title,
    params.context.values
  );
  const description = replaceDocumentPlaceholders(
    params.descriptionOverride?.trim() || template.description || "",
    params.context.values
  );
  const content = replaceDocumentPlaceholders(template.content || "", params.context.values);
  const slug = slugifyDocumentValue(title || template.title || "generated-document");
  const approvalResetMetadata = resetDocumentApprovalMetadata(
    {
      ...templateMetadata,
      kind: "generated" satisfies DocumentMetadataKind,
    },
    "Draft"
  );

  const insertResult = await createDocument({
    title,
    description: description || null,
    documentType: template.documentType || "Generated",
    content,
    url: `/documents/${slug || "generated-document"}.html`,
      branchId: params.context.metadata.branchId ?? template.branchId ?? null,
      tags: {
        ...approvalResetMetadata,
        generatedStatus: params.generatedStatus,
        version: nextVersion,
      generatedFromTemplateId: template.id,
      generatedFromTemplateTitle: template.title,
      generatedFromTemplateKey:
        templateMetadata.templateKey || slugifyDocumentValue(template.title),
      sourceType: "student_enrollment",
      studentId: params.context.metadata.studentId,
      studentName: params.context.metadata.studentName,
      enrollmentId: params.context.metadata.enrollmentId,
      scheduleId: params.context.metadata.scheduleId,
      courseId: params.context.metadata.courseId,
      courseLabel: params.context.metadata.courseLabel,
      branchId: params.context.metadata.branchId,
      branchName: params.context.metadata.branchName,
      generatedAt: new Date().toISOString(),
      documentCode: resolveDocumentCode(
        templateMetadata,
        template.title || "GENERATED-DOCUMENT"
      ),
      issueNumber: String(templateMetadata.issueNumber || "01"),
      effectiveDate: String(
        templateMetadata.effectiveDate || formatDocumentControlDate(new Date())
      ),
      placeholderKeys: templateMetadata.placeholderKeys || extractTemplatePlaceholders(content),
    },
  } as any);
  const generatedDocument = await getDocumentById(getInsertId(insertResult));

  if (!generatedDocument) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the generated document.",
    });
  }

  return generatedDocument;
}

async function createGeneratedScheduleDocument(params: {
  template: Awaited<ReturnType<typeof getDocumentById>>;
  context: Awaited<ReturnType<typeof buildScheduleDocumentContext>>;
  scheduleId: number;
  generatedStatus: z.infer<typeof generatedDocumentStatusSchema>;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
}) {
  const template = params.template;
  if (!template) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected template could not be found.",
    });
  }

  const templateMetadata = getDocumentMetadata(template.tags);
  if (templateMetadata.kind !== "template") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected document is not a template.",
    });
  }

  const allDocuments = await getAllDocuments();
  const nextVersion =
    allDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return (
        metadata.kind === "generated" &&
        Number(metadata.generatedFromTemplateId) === template.id &&
        metadata.sourceType === "schedule" &&
        Number(metadata.scheduleId) === params.scheduleId
      );
    }).length + 1;

  const title = replaceDocumentPlaceholders(
    params.titleOverride?.trim() || template.title,
    params.context.values
  );
  const description = replaceDocumentPlaceholders(
    params.descriptionOverride?.trim() || template.description || "",
    params.context.values
  );
  const content = replaceDocumentPlaceholders(template.content || "", params.context.values);
  const slug = slugifyDocumentValue(title || template.title || "generated-document");
  const approvalResetMetadata = resetDocumentApprovalMetadata(
    {
      ...templateMetadata,
      kind: "generated" satisfies DocumentMetadataKind,
    },
    "Draft"
  );

  const insertResult = await createDocument({
    title,
    description: description || null,
    documentType: template.documentType || "Generated",
    content,
    url: `/documents/${slug || "generated-document"}.html`,
      branchId: params.context.metadata.branchId ?? template.branchId ?? null,
      tags: {
        ...approvalResetMetadata,
        generatedStatus: params.generatedStatus,
        version: nextVersion,
      generatedFromTemplateId: template.id,
      generatedFromTemplateTitle: template.title,
      generatedFromTemplateKey:
        templateMetadata.templateKey || slugifyDocumentValue(template.title),
      sourceType: "schedule",
      scheduleId: params.context.metadata.scheduleId,
      courseId: params.context.metadata.courseId,
      courseLabel: params.context.metadata.courseLabel,
      branchId: params.context.metadata.branchId,
      branchName: params.context.metadata.branchName,
      generatedAt: new Date().toISOString(),
      documentCode: resolveDocumentCode(
        templateMetadata,
        template.title || "GENERATED-DOCUMENT"
      ),
      issueNumber: String(templateMetadata.issueNumber || "01"),
      effectiveDate: String(
        templateMetadata.effectiveDate || formatDocumentControlDate(new Date())
      ),
      placeholderKeys: templateMetadata.placeholderKeys || extractTemplatePlaceholders(content),
    },
  } as any);
  const generatedDocument = await getDocumentById(getInsertId(insertResult));

  if (!generatedDocument) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the generated document.",
    });
  }

  return generatedDocument;
}

function buildLevelIIIHtmlList(items: string[]) {
  if (items.length === 0) {
    return "<ul><li>No support documents listed yet.</li></ul>";
  }
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function summariseLevelIIIRequestLevels(
  technician: Awaited<ReturnType<typeof getAllLevelIIITechnicians>>[number] | null,
  techniques: string[]
) {
  const requestedKeys = new Set(techniques.map((technique) => technique.trim().toLowerCase()));
  const methodQualifications = Array.isArray(technician?.methodQualifications)
    ? technician!.methodQualifications
        .map((entry) => ({
          method: String(entry.method ?? "").trim(),
          level: String(entry.level ?? "").trim(),
        }))
        .filter((entry) => entry.method && entry.level)
    : [];
  const filtered = methodQualifications.filter((entry) =>
    requestedKeys.has(entry.method.toLowerCase())
  );
  const effective = filtered.length > 0 ? filtered : methodQualifications;
  if (effective.length === 0) {
    return String(technician?.level ?? "").trim();
  }
  const uniqueLevels = Array.from(new Set(effective.map((entry) => entry.level)));
  if (uniqueLevels.length === 1) {
    return uniqueLevels[0] ?? "";
  }
  return effective.map((entry) => `${entry.method}: ${entry.level}`).join(" | ");
}

function buildLevelIIIScopeRows(
  technician: Awaited<ReturnType<typeof getAllLevelIIITechnicians>>[number] | null,
  techniques: string[]
) {
  const requestedKeys = new Set(techniques.map((technique) => technique.trim().toLowerCase()));
  const methodQualifications = Array.isArray(technician?.methodQualifications)
    ? technician!.methodQualifications
        .map((entry) => ({
          method: String(entry.method ?? "").trim(),
          level: String(entry.level ?? "").trim(),
        }))
        .filter((entry) => entry.method && entry.level)
    : [];
  const effective =
    methodQualifications.filter((entry) => requestedKeys.has(entry.method.toLowerCase())).length > 0
      ? methodQualifications.filter((entry) => requestedKeys.has(entry.method.toLowerCase()))
      : methodQualifications;
  if (effective.length === 0) {
    return `<tr><td>${techniques.join(", ") || "Method to confirm"}</td><td>${String(
      technician?.level ?? ""
    )}</td><td contenteditable="true">Add scope</td><td contenteditable="true">Add limitations</td></tr>`;
  }
  return effective
    .map(
      (entry) =>
        `<tr><td>${entry.method}</td><td>${entry.level}</td><td contenteditable="true">Add authorised techniques</td><td contenteditable="true">Add limitations</td></tr>`
    )
    .join("");
}

async function buildLevelIIIDocumentContextFromRequest(input: {
  clientId: number;
  requestId: number;
}) {
  const clients = await getAllLevelIIIClients({ includeLinkedBranchClients: true });
  const client = clients.find((entry) => entry.id === input.clientId) ?? null;
  if (!client) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected Level III client could not be found.",
    });
  }

  const requests = await getPortalServiceRequestsForClient(input.clientId);
  const request = requests.find((entry) => entry.id === input.requestId) ?? null;
  if (!request) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected portal request could not be found.",
    });
  }
  if (!request.technicianId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This request does not have a technician linked yet.",
    });
  }

  const technicians = await getAllLevelIIITechnicians();
  const technician = technicians.find((entry) => entry.id === request.technicianId) ?? null;
  if (!technician) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The linked technician could not be found.",
    });
  }

  const assessments = await getAllLevelIIIAssessments();
  const latestAssessment =
    pickLatestDocumentRecord(
      assessments.filter((entry) => entry.technicianId === technician.id),
      (row) => row.assessmentDate
    ) ?? null;
  const requestMetadata = normalisePortalServiceRequestMetadata(request.metadata);
  const assessmentDateValue =
    requestMetadata.confirmedDate ??
    request.preferredDate ??
    latestAssessment?.assessmentDate ??
    new Date().toISOString();
  const assessmentDate = formatDocumentDate(assessmentDateValue);
  const requestSelectedTechniques = Array.isArray((requestMetadata as any).selectedTechniques)
    ? (requestMetadata as any).selectedTechniques
        .map((entry: unknown) => String(entry ?? "").trim())
        .filter(Boolean)
    : [];
  const selectedTechniques =
    requestSelectedTechniques.length > 0 ? requestSelectedTechniques : request.techniques;
  const techniques: string[] =
    selectedTechniques.length > 0 ? selectedTechniques : ["Method to confirm"];
  const readinessCompanyItems = Array.isArray((requestMetadata as any).readinessCompanyItems)
    ? (requestMetadata as any).readinessCompanyItems
        .map((entry: unknown) => String(entry ?? "").trim())
        .filter(Boolean)
    : [];
  const supportDocuments = Array.from(
    new Set(
      [...request.requestedDocuments, ...readinessCompanyItems]
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    )
  );
  const examinerName = requestMetadata.internalOwner || "";
  const assessmentResult =
    latestAssessment?.result ||
    (request.status === "completed" ? "Completed - review pending" : "Pending Review");
  const contextValues = {
    technicianName: technician.name ?? "",
    technicianFirstName: technician.name?.split(/\s+/)[0] ?? "",
    technicianLastName: technician.name?.split(/\s+/).slice(1).join(" ") ?? "",
    technicianIdNumber: "",
    technicianCertificateNumber: technician.certificateNumber ?? "",
    branchName: request.branchName ?? "",
    companyName: client.companyName ?? "",
    latestAssessmentType: latestAssessment?.method ?? request.requestType,
    latestAssessmentResult: assessmentResult,
    latestAssessmentDate: formatDocumentDate(latestAssessment?.assessmentDate),
    latestAssessmentScore: "",
    assessmentDate,
    assessmentMethod: techniques.join(", "),
    assessmentLevel: summariseLevelIIIRequestLevels(technician, techniques),
    assessmentType: request.requestType,
    assessmentVenue: request.branchName || client.companyName || "Venue to confirm",
    assessmentReference: `LVL3-REQ-${request.id}`,
    assessmentSupportDocumentListHtml: buildLevelIIIHtmlList(supportDocuments),
    assessmentSupportDocumentSummary:
      supportDocuments.length > 0 ? supportDocuments.join(", ") : "No support documents listed yet",
    assessmentResultNotice: assessmentResult,
    eyeTestValidUntil: formatDocumentDate(technician.eyeTestValidUntil),
    examinerName,
    certifyingAuthorityName: client.companyName ?? "TextPoint Level III",
    certificationScopeHtml: buildLevelIIIScopeRows(technician, techniques),
    certificateNumber: technician.certificateNumber ?? "",
    todayDate: formatDocumentDate(new Date()),
  };

  return {
    request,
    technician,
    values: contextValues,
    metadata: {
      clientId: client.id,
      clientName: client.companyName,
      requestId: request.id,
      technicianId: technician.id,
      technicianName: technician.name ?? "",
      branchId: request.clientBranchId ?? technician.clientBranchId ?? null,
      branchName: request.branchName ?? "",
    },
  };
}

async function createGeneratedLevelIIIRequestDocument(params: {
  template: Awaited<ReturnType<typeof getDocumentById>>;
  context: Awaited<ReturnType<typeof buildLevelIIIDocumentContextFromRequest>>;
  requestId: number;
  generatedStatus: z.infer<typeof generatedDocumentStatusSchema>;
  titleOverride?: string | null;
  descriptionOverride?: string | null;
}) {
  const template = params.template;
  if (!template) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected template could not be found.",
    });
  }
  const templateMetadata = getDocumentMetadata(template.tags);
  if (templateMetadata.kind !== "template") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Selected document is not a template.",
    });
  }

  const allDocuments = await getAllDocuments();
  const existingForRequest = allDocuments.filter((document) => {
    const metadata = getDocumentMetadata(document.tags);
    return (
      metadata.kind === "generated" &&
      metadata.sourceType === "leveliii_request" &&
      Number(metadata.requestId) === params.requestId &&
      String(metadata.generatedFromTemplateKey || "") ===
        String(templateMetadata.templateKey || slugifyDocumentValue(template.title))
    );
  });
  const activeExisting = existingForRequest.find((document) => {
    const metadata = getDocumentMetadata(document.tags);
    return String(metadata.generatedStatus || "") !== "Superseded";
  });
  if (activeExisting) {
    return activeExisting;
  }

  const nextVersion = existingForRequest.length + 1;
  const title = replaceDocumentPlaceholders(
    params.titleOverride?.trim() || template.title,
    params.context.values
  );
  const description = replaceDocumentPlaceholders(
    params.descriptionOverride?.trim() || template.description || "",
    params.context.values
  );
  const content = replaceDocumentPlaceholders(template.content || "", params.context.values);
  const slug = slugifyDocumentValue(title || template.title || "generated-document");
  const approvalResetMetadata = resetDocumentApprovalMetadata(
    {
      ...templateMetadata,
      kind: "generated" satisfies DocumentMetadataKind,
    },
    "Draft"
  );

  const insertResult = await createDocument({
    title,
    description: description || null,
    documentType: template.documentType || "Generated",
    content,
    url: `/documents/${slug || "generated-document"}.html`,
    branchId: params.context.metadata.branchId ?? template.branchId ?? null,
    tags: {
      ...approvalResetMetadata,
      generatedStatus: params.generatedStatus,
      version: nextVersion,
      generatedFromTemplateId: template.id,
      generatedFromTemplateTitle: template.title,
      generatedFromTemplateKey:
        templateMetadata.templateKey || slugifyDocumentValue(template.title),
      sourceType: "leveliii_request",
      clientId: params.context.metadata.clientId,
      clientName: params.context.metadata.clientName,
      requestId: params.context.metadata.requestId,
      technicianId: params.context.metadata.technicianId,
      technicianName: params.context.metadata.technicianName,
      branchId: params.context.metadata.branchId,
      branchName: params.context.metadata.branchName,
      generatedAt: new Date().toISOString(),
      documentCode: resolveDocumentCode(
        templateMetadata,
        template.title || "GENERATED-DOCUMENT"
      ),
      issueNumber: String(templateMetadata.issueNumber || "01"),
      effectiveDate: String(
        templateMetadata.effectiveDate || formatDocumentControlDate(new Date())
      ),
      placeholderKeys: templateMetadata.placeholderKeys || extractTemplatePlaceholders(content),
    },
  } as any);
  const generatedDocument = await getDocumentById(getInsertId(insertResult));
  if (!generatedDocument) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create the generated document.",
    });
  }
  return generatedDocument;
}

const LEVEL_III_REQUEST_PACK_TEMPLATE_KEYS = [
  "level-iii-assessment-booking-and-checklist",
  "level-iii-practical-marking-sheet",
  "level-iii-technician-authorisation-scope",
  "level-iii-assessment-result-notice",
] as const;

function getNextGeneratedDocumentVersion(
  allDocuments: Awaited<ReturnType<typeof getAllDocuments>>,
  metadata: Record<string, any>,
  fallbackDocumentId: number
) {
  const rootGeneratedDocumentId = Number(
    metadata.rootGeneratedDocumentId || fallbackDocumentId
  );
  const templateId = Number(metadata.generatedFromTemplateId || 0);
  const enrollmentId = Number(metadata.enrollmentId || 0);
  const scheduleId = Number(metadata.scheduleId || 0);
  const sourceType = String(metadata.sourceType || "");

  return (
    allDocuments.filter((document) => {
      const candidateMetadata = getDocumentMetadata(document.tags);
      if (candidateMetadata.kind !== "generated") {
        return false;
      }

      const candidateRootId = Number(
        candidateMetadata.rootGeneratedDocumentId || document.id
      );
      if (candidateRootId === rootGeneratedDocumentId) {
        return true;
      }

      if (templateId > 0 && Number(candidateMetadata.generatedFromTemplateId || 0) === templateId) {
        if (sourceType === "student_enrollment" && enrollmentId > 0) {
          return Number(candidateMetadata.enrollmentId || 0) === enrollmentId;
        }

        if (sourceType === "schedule" && scheduleId > 0) {
          return (
            String(candidateMetadata.sourceType || "") === "schedule" &&
            Number(candidateMetadata.scheduleId || 0) === scheduleId
          );
        }
      }

      return false;
    }).length + 1
  );
}

function getNextTemplateDocumentVersion(
  allDocuments: Awaited<ReturnType<typeof getAllDocuments>>,
  metadata: Record<string, any>,
  fallbackDocumentId: number
) {
  const rootTemplateDocumentId = Number(metadata.rootTemplateDocumentId || fallbackDocumentId);
  const templateKey = String(metadata.templateKey || "");

  return (
    allDocuments.filter((document) => {
      const candidateMetadata = getDocumentMetadata(document.tags);
      if (candidateMetadata.kind !== "template") {
        return false;
      }

      const candidateRootId = Number(
        candidateMetadata.rootTemplateDocumentId || document.id
      );
      if (candidateRootId === rootTemplateDocumentId) {
        return true;
      }

      if (templateKey && String(candidateMetadata.templateKey || "") === templateKey) {
        return true;
      }

      return false;
    }).length + 1
  );
}

function pickPreferredGeneratedDocumentRecord<
  T extends { createdAt: string | Date; tags: unknown },
>(left: T | undefined, right: T) {
  if (!left) return right;

  const leftMetadata = getDocumentMetadata(left.tags);
  const rightMetadata = getDocumentMetadata(right.tags);

  if (
    leftMetadata.generatedStatus === "Superseded" &&
    rightMetadata.generatedStatus !== "Superseded"
  ) {
    return right;
  }

  if (
    leftMetadata.generatedStatus !== "Superseded" &&
    rightMetadata.generatedStatus === "Superseded"
  ) {
    return left;
  }

  const leftVersion = Number(leftMetadata.version || 1);
  const rightVersion = Number(rightMetadata.version || 1);
  if (rightVersion !== leftVersion) {
    return rightVersion > leftVersion ? right : left;
  }

  return new Date(right.createdAt).getTime() > new Date(left.createdAt).getTime()
    ? right
    : left;
}

function getEffectiveGeneratedTemplateKeys(
  documents: Awaited<ReturnType<typeof getAllDocuments>>
) {
  const latestByTemplate = new Map<string, (typeof documents)[number]>();

  for (const document of documents) {
    const metadata = getDocumentMetadata(document.tags);
    const templateKey = String(metadata.generatedFromTemplateKey || "");
    if (!templateKey) continue;

    latestByTemplate.set(
      templateKey,
      pickPreferredGeneratedDocumentRecord(latestByTemplate.get(templateKey), document)
    );
  }

  return new Set(
    Array.from(latestByTemplate.entries())
      .filter(([, document]) => {
        const metadata = getDocumentMetadata(document.tags);
        return metadata.generatedStatus !== "Superseded";
      })
      .map(([templateKey]) => templateKey)
  );
}

function getEffectiveGeneratedDocumentsByTemplate(
  documents: Awaited<ReturnType<typeof getAllDocuments>>
) {
  const latestByTemplate = new Map<string, (typeof documents)[number]>();

  for (const document of documents) {
    const metadata = getDocumentMetadata(document.tags);
    const templateKey = String(metadata.generatedFromTemplateKey || "");
    if (!templateKey) continue;

    latestByTemplate.set(
      templateKey,
      pickPreferredGeneratedDocumentRecord(latestByTemplate.get(templateKey), document)
    );
  }

  return new Map(
    Array.from(latestByTemplate.entries()).filter(([, document]) => {
      const metadata = getDocumentMetadata(document.tags);
      return metadata.generatedStatus !== "Superseded";
    })
  );
}

async function createGeneratedRevisionFromSource(params: {
  sourceDocument: Awaited<ReturnType<typeof getDocumentById>>;
  title: string;
  description?: string | null;
  content: string;
  generatedStatus?: z.infer<typeof generatedDocumentStatusSchema>;
  revisionReason?: string | null;
  supersedeSource?: boolean;
}) {
  const sourceDocument = params.sourceDocument;
  if (!sourceDocument) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The generated document could not be found.",
    });
  }

  const sourceMetadata = getDocumentMetadata(sourceDocument.tags);
  if (sourceMetadata.kind !== "generated") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only generated documents can be revised.",
    });
  }

  const title = params.title.trim();
  const content = params.content.trim();
  if (!title || !content) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Title and content are required for a revision.",
    });
  }

  const allDocuments = await getAllDocuments();
  const nextVersion = getNextGeneratedDocumentVersion(
    allDocuments,
    sourceMetadata,
    sourceDocument.id
  );
  const rootGeneratedDocumentId = Number(
    sourceMetadata.rootGeneratedDocumentId || sourceDocument.id
  );
  const slug = slugifyDocumentValue(title || sourceDocument.title || "generated-document");
  const generatedAt = new Date().toISOString();
  const approvalResetMetadata = resetDocumentApprovalMetadata(
    {
      ...sourceMetadata,
      kind: "generated" satisfies DocumentMetadataKind,
    },
    "Draft"
  );

  const insertResult = await createDocument({
    title,
    description: params.description?.trim() || null,
    documentType: sourceDocument.documentType || "Generated",
    content,
    url: `/documents/${slug || "generated-document"}.html`,
      branchId: sourceDocument.branchId ?? null,
      tags: {
        ...approvalResetMetadata,
        generatedStatus: params.generatedStatus ?? "Corrected",
        version: nextVersion,
      rootGeneratedDocumentId,
      revisedFromDocumentId: sourceDocument.id,
      revisionReason: params.revisionReason?.trim() || null,
      generatedAt,
      placeholderKeys: Array.isArray(sourceMetadata.placeholderKeys)
        ? sourceMetadata.placeholderKeys
        : extractTemplatePlaceholders(content),
      supersededByDocumentId: undefined,
    },
  } as any);
  const revisedDocumentId = getInsertId(insertResult);

  if ((params.supersedeSource ?? true) && revisedDocumentId > 0) {
    await updateDocument(sourceDocument.id, {
      tags: {
        ...sourceMetadata,
        generatedStatus: "Superseded",
        supersededByDocumentId: revisedDocumentId,
      },
    } as any);
  }

  const revisedDocument =
    revisedDocumentId > 0 ? await getDocumentById(revisedDocumentId) : null;

  return revisedDocument ?? sourceDocument;
}

async function createTemplateRevisionFromSource(params: {
  sourceDocument: Awaited<ReturnType<typeof getDocumentById>>;
  title: string;
  description?: string | null;
  content: string;
  documentCode?: string | null;
  issueNumber?: string | null;
  effectiveDate?: string | null;
  templateStatus?: "Draft" | "Active" | "Archived";
  revisionReason?: string | null;
  supersedeSource?: boolean;
}) {
  const sourceDocument = params.sourceDocument;
  if (!sourceDocument) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The template could not be found.",
    });
  }

  const sourceMetadata = getDocumentMetadata(sourceDocument.tags);
  if (sourceMetadata.kind !== "template") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only template documents can be revised into a new issue.",
    });
  }

  const title = params.title.trim();
  const content = params.content.trim();
  if (!title || !content) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Title and content are required for a template revision.",
    });
  }

  const allDocuments = await getAllDocuments();
  const nextVersion = getNextTemplateDocumentVersion(
    allDocuments,
    sourceMetadata,
    sourceDocument.id
  );
  const rootTemplateDocumentId = Number(
    sourceMetadata.rootTemplateDocumentId || sourceDocument.id
  );
  const slug = slugifyDocumentValue(title || sourceDocument.title || "template-document");
  const effectiveDate =
    params.effectiveDate?.trim() || formatDocumentControlDate(new Date());
  const templateStatus = params.templateStatus ?? "Active";
  const templateKey =
    String(sourceMetadata.templateKey || "").trim() ||
    slugifyDocumentValue(sourceDocument.title || title || "template-document");
  const approvalResetMetadata = resetDocumentApprovalMetadata(
    {
      ...sourceMetadata,
      kind: "template" satisfies DocumentMetadataKind,
    },
    "Draft"
  );

  const insertResult = await createDocument({
    title,
    description: params.description?.trim() || null,
    documentType: sourceDocument.documentType || "Template",
    content,
    url: `/documents/${slug || "template-document"}.html`,
      branchId: sourceDocument.branchId ?? null,
      tags: {
        ...approvalResetMetadata,
        templateStatus,
        version: nextVersion,
      templateKey,
      documentCode: resolveDocumentCode(
        {
          ...sourceMetadata,
          documentCode: params.documentCode?.trim() || sourceMetadata.documentCode,
        },
        title
      ),
      issueNumber:
        params.issueNumber?.trim() || incrementDocumentIssueNumber(String(sourceMetadata.issueNumber || "01")),
      effectiveDate,
      rootTemplateDocumentId,
      revisedFromTemplateId: sourceDocument.id,
      revisionReason: params.revisionReason?.trim() || null,
      placeholderKeys: extractTemplatePlaceholders(content),
      supersededByTemplateId: undefined,
    },
  } as any);
  const revisedTemplateId = getInsertId(insertResult);

  if (revisedTemplateId > 0) {
    const templatesInFamily = allDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return metadata.kind === "template" && String(metadata.templateKey || "") === templateKey;
    });

    if (templateStatus === "Active") {
      for (const document of templatesInFamily) {
        if (document.id === revisedTemplateId) continue;
        const metadata = getDocumentMetadata(document.tags);
        if (metadata.templateStatus === "Active") {
          await updateDocument(document.id, {
            tags: {
              ...metadata,
              templateStatus: "Archived",
              supersededByTemplateId: revisedTemplateId,
            },
          } as any);
        }
      }
    }

    if (params.supersedeSource ?? true) {
      await updateDocument(sourceDocument.id, {
        tags: {
          ...sourceMetadata,
          templateStatus:
            templateStatus === "Active"
              ? "Archived"
              : String(sourceMetadata.templateStatus || "Draft"),
          supersededByTemplateId: revisedTemplateId,
        },
      } as any);
    }
  }

  const revisedTemplate = revisedTemplateId > 0 ? await getDocumentById(revisedTemplateId) : null;
  return revisedTemplate ?? sourceDocument;
}

// ============ Quality Router ============
const qualityRouter = router({
  list: qualityViewProcedure.query(async () => getAllQualityActions()),
  get: qualityViewProcedure.input(z.number()).query(async ({ input }) => {
    const item = await getQualityActionById(input);
    if (!item) throw new TRPCError({ code: "NOT_FOUND" });
    return item;
  }),
  create: qualityCreateProcedure.input(z.any()).mutation(async ({ input }) => createQualityAction(input as any)),
  update: qualityEditProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateQualityAction(input.id, input.data)),
  delete: qualityDeleteProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => deleteQualityAction(input.id)),
  audits: router({
    list: qualityViewProcedure.query(async () => getAllQualityAudits()),
    get: qualityViewProcedure.input(z.number()).query(async ({ input }) => {
      const item = await getQualityAuditById(input);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),
    create: qualityCreateProcedure.input(z.any()).mutation(async ({ input }) => createQualityAudit(input as any)),
    update: qualityEditProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateQualityAudit(input.id, input.data)),
    delete: qualityDeleteProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => deleteQualityAudit(input.id)),
  }),
  reviews: router({
    list: qualityViewProcedure.query(async () => getAllManagementReviews()),
    get: qualityViewProcedure.input(z.number()).query(async ({ input }) => {
      const item = await getManagementReviewById(input);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),
    create: qualityCreateProcedure.input(z.any()).mutation(async ({ input }) => createManagementReview(input as any)),
    update: qualityEditProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateManagementReview(input.id, input.data)),
    delete: qualityDeleteProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => deleteManagementReview(input.id)),
  }),
  providers: router({
    list: qualityViewProcedure.query(async () => getAllExternalProviders()),
    get: qualityViewProcedure.input(z.number()).query(async ({ input }) => {
      const item = await getExternalProviderById(input);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),
    create: qualityCreateProcedure.input(z.any()).mutation(async ({ input }) => createExternalProvider(input as any)),
    update: qualityEditProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateExternalProvider(input.id, input.data)),
    delete: qualityDeleteProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => deleteExternalProvider(input.id)),
  }),
});

// ============ Reports Router ============
const reportsRouter = router({
  list: reportsViewProcedure.query(async () => getAllReports()),
  create: reportsCreateProcedure.input(z.any()).mutation(async ({ input }) => createReport(input as any)),
  generate: reportsCreateProcedure.input(z.any()).mutation(async ({ input }) => generateReportSnapshot(input.reportType ?? "students", input.branchId)),
  delete: reportsDeleteProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => deleteReport(input.id)),
});

// ============ Branches Router ============
const branchesRouter = router({
  list: branchesViewProcedure.query(async () => getAllBranches()),
  get: branchesViewProcedure.input(z.number()).query(async ({ input }) => {
    const item = await getBranchById(input);
    if (!item) throw new TRPCError({ code: "NOT_FOUND" });
    return item;
  }),
  create: branchesCreateProcedure.input(z.any()).mutation(async ({ input }) => createBranch(input as any)),
  update: branchesEditProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateBranch(input.id, input.data)),
  delete: branchesDeleteProcedure.input(z.number()).mutation(async ({ input }) => deleteBranch(input)),
});

// ============ Access Router ============
const accessRouter = router({
  myAccess: protectedProcedure.query(async ({ ctx }) => getUserModuleAccess(ctx.user.id)),
  getUserAccess: protectedProcedure.input(z.number()).query(async ({ input }) => getUserModuleAccess(input)),
  saveUserAccess: protectedProcedure.input(z.object({
    userId: z.number(), modules: z.array(z.object({
      module: z.string(), canView: z.boolean(), canCreate: z.boolean(),
      canEdit: z.boolean(), canDelete: z.boolean(),
    }))
  })).mutation(async ({ input }) => saveUserModuleAccess(input.userId, input.modules)),
  auditDashboard: protectedProcedure.query(async () => getAccessAuditDashboard()),
  auditBranchCoverage: protectedProcedure.query(async () => getAccessAuditBranchCoverage()),
  users: router({
    list: protectedProcedure.query(async () => getAllUsers()),
    create: protectedProcedure.input(z.any()).mutation(async ({ input }) => createAppUser(input as any)),
    update: protectedProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateAppUserWithAuth(input.id, input.data)),
    delete: protectedProcedure.input(z.number()).mutation(async ({ input }) => deleteAppUser(input)),
  }),
  roles: router({
    list: protectedProcedure.query(async () => {
      return ["admin", "super_admin", "staff", "lecturer", "student", "client"];
    }),
  }),
  permissions: router({
    listModules: protectedProcedure.query(async () => AVAILABLE_MODULES),
    getForUser: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserModuleAccess(input.userId)),
    saveForUser: protectedProcedure.input(z.object({
      userId: z.number(), modules: z.array(z.object({
        module: z.string(), canView: z.boolean(), canCreate: z.boolean(),
        canEdit: z.boolean(), canDelete: z.boolean(),
      }))
    })).mutation(async ({ input }) => saveUserModuleAccess(input.userId, input.modules)),
  }),
});

// ============ Bulk Router ============
const bulkRouter = router({
  createLog: protectedProcedure.input(z.any()).mutation(async ({ input }) => createImportLog(input as any)),
  updateLog: protectedProcedure.input(z.object({ id: z.number(), data: z.any() })).mutation(async ({ input }) => updateImportLog(input.id, input.data as any)),
});

// ============ Search Router ============
const searchRouter = router({
  students: protectedProcedure.input(z.string().min(1)).query(async ({ input }) => {
    const { searchStudents } = await import("./search");
    return searchStudents(input);
  }),
  leads: protectedProcedure.input(z.string().min(1)).query(async ({ input }) => {
    const { searchLeads } = await import("./search");
    return searchLeads(input);
  }),
});

// ============ Audit Router ============
const auditRouter = router({
  trail: protectedProcedure.input(z.object({
    limit: z.number().default(50), offset: z.number().default(0),
    userId: z.number().optional(), action: z.string().optional(),
    entityType: z.string().optional(), status: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).query(async ({ input }) => {
    const { limit, ...filters } = input;
    return getAuditTrail(filters as any, limit);
  }),
  getEntity: protectedProcedure.input(z.object({
    entityType: z.string(), entityId: z.number(), limit: z.number().default(50),
  })).query(async ({ input }) => getEntityAuditTrail(input.entityType, input.entityId, input.limit)),
});

// ============ Auth Router ============
const authRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return getUserById(ctx.user.id);
  }),
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string(), rememberMe: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const result = await signInWithPassword({ email: input.email, password: input.password });
      if (!result) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      if (result && typeof result === "object" && "error" in result) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: String((result as any).error) });
      }
      const sessionId = typeof result === "number" ? result : (result as any)?.id ?? 0;
      ctx.res.appendHeader("Set-Cookie", `${COOKIE_NAME}=${sessionId}; ${Object.entries(getSessionCookieOptions()).map(([k, v]) => `${k}=${v}`).join("; ")}`);
      const user = await getUserByEmail(input.email);
      return user;
    }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const cookies = parseCookie(ctx.req.headers.cookie ?? "");
    const sessionToken = cookies[COOKIE_NAME];
    if (sessionToken) {
      await signOutSession(sessionToken);
    }
    ctx.res.appendHeader("Set-Cookie", `${COOKIE_NAME}=; ${Object.entries(getCookieClearOptions(getSessionCookieOptions())).map(([k, v]) => `${k}=${v}`).join("; ")}`);
    ctx.res.appendHeader("Set-Cookie", `${LOCAL_AUTH_LOGOUT_COOKIE}=true; ${Object.entries(getLocalAuthLogoutCookieOptions()).map(([k, v]) => `${k}=${v}`).join("; ")}`);
  }),
  passwordStatus: protectedProcedure.query(async ({ ctx }) => {
    return { hasPassword: await hasPasswordForUser(ctx.user.id) };
  }),
  changePassword: protectedProcedure
    .input(z.object({ currentPassword: z.string(), newPassword: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await changeUserPassword({ userId: ctx.user.id, currentPassword: input.currentPassword, newPassword: input.newPassword });
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
      return { success: true };
    }),
  updateProfile: protectedProcedure
    .input(z.object({ name: z.string().optional(), email: z.string().email().optional() }))
    .mutation(async ({ ctx, input }) => {
      return updateAppUserWithAuth(ctx.user.id, input);
    }),
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      await requestPasswordReset(input.email);
      return { success: true };
    }),
  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), password: z.string().optional(), newPassword: z.string().optional() }))
    .mutation(async ({ input }) => {
      const pwd = input.password ?? input.newPassword ?? "";
      const result = await resetPasswordWithToken(input.token, pwd);
      if (!result) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
      return { success: true };
    }),
});

export const appRouter = router({
  auth: authRouter,
  system: systemRouter,
  students: studentsRouter,
  leads: leadsRouter,
  companies: companiesRouter,
  courses: coursesRouter,
  courseSchedules: courseSchedulesRouter,
  enrollments: enrollmentsRouter,
  attendance: attendanceRouter,
  assessments: assessmentsRouter,
  certificates: certificatesRouter,
  levelIII: levelIIIRouter,
  clientPortal: clientPortalRouter,
  equipment: equipmentRouter,
  specimens: specimensRouter,
  kpi: kpiRouter,
  lecturers: lecturersRouter,
  training: trainingRouter,
  planner: plannerRouter,
  quality: qualityRouter,
  documents: documentsRouter,
  reports: reportsRouter,
  branches: branchesRouter,
  access: accessRouter,
  bulk: bulkRouter,
  search: searchRouter,
  audit: auditRouter,
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotifications } = await import("./notifications");
      return getUnreadNotifications(ctx.user.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { markNotificationAsRead } = await import("./notifications");
        return markNotificationAsRead(input.id, ctx.user.id);
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      const { markAllNotificationsAsRead } = await import("./notifications");
      return markAllNotificationsAsRead(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteNotification } = await import("./notifications");
        return deleteNotification(input.id, ctx.user.id);
      }),

    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      const { getNotificationPreferences } = await import("./notifications");
      return getNotificationPreferences(ctx.user.id);
    }),

    updatePreferences: protectedProcedure
      .input(
        z.object({
          emailNotifications: z.boolean().optional(),
          pushNotifications: z.boolean().optional(),
          soundAlerts: z.boolean().optional(),
          studentAddedNotif: z.boolean().optional(),
          leadStatusChangeNotif: z.boolean().optional(),
          attendanceNotif: z.boolean().optional(),
          equipmentNotif: z.boolean().optional(),
          specimenNotif: z.boolean().optional(),
          kpiNotif: z.boolean().optional(),
          courseNotif: z.boolean().optional(),
          enrollmentNotif: z.boolean().optional(),
          systemAlertNotif: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { updateNotificationPreferences } = await import("./notifications");
        return updateNotificationPreferences(ctx.user.id, input);
      }),

    checkEscalation: adminModuleProcedure.mutation(async () => {
      const { checkEquipmentEscalation } = await import("./notifications");
      return checkEquipmentEscalation();
    }),

    checkDocumentSignatures: adminModuleProcedure.mutation(async () => {
      const { checkDocumentSignatureDue } = await import("./notifications");
      return checkDocumentSignatureDue();
    }),

    checkQualityReminders: adminModuleProcedure.mutation(async ({ ctx }) => {
      const { checkQualityReminders } = await import("./notifications");
      const result = await checkQualityReminders();
      await logAuditEvent(
        ctx.user.id,
        "UPDATE",
        "quality_reminder_sweep",
        0,
        {
          notificationsSent: result.notificationsSent,
          success: result.success,
          triggerSource: "manual",
          errorMessage: result.errorMessage ?? null,
        },
        getAuditRequestMeta(ctx).ipAddress,
        getAuditRequestMeta(ctx).userAgent,
        result.success ? "Success" : "Failed",
        result.errorMessage ?? undefined
      );
      return result;
    }),

  checkClientPortalReminders: adminModuleProcedure.mutation(async ({ ctx }) => {
    const { checkClientPortalReminders } = await import("./notifications");
    const result = await checkClientPortalReminders();
    await logAuditEvent(
      ctx.user.id,
      "UPDATE",
      "client_portal_reminder_sweep",
      0,
      {
        notificationsSent: result.notificationsSent,
        success: result.success,
        triggerSource: "manual",
        errorMessage: result.errorMessage ?? null,
      },
      getAuditRequestMeta(ctx).ipAddress,
      getAuditRequestMeta(ctx).userAgent,
      result.success ? "Success" : "Failed",
      result.errorMessage ?? undefined
    );
    return result;
  }),

  checkLevelIIIDocumentReviewReminders: adminModuleProcedure.mutation(async ({ ctx }) => {
    const { checkLevelIIIDocumentReviewReminders } = await import("./notifications");
    const result = await checkLevelIIIDocumentReviewReminders();
    await logAuditEvent(
      ctx.user.id,
      "UPDATE",
      "levelIII_document_review_reminder_sweep",
      0,
      {
        notificationsSent: result.notificationsSent,
        success: result.success,
        triggerSource: "manual",
        errorMessage: result.errorMessage ?? null,
      },
      getAuditRequestMeta(ctx).ipAddress,
      getAuditRequestMeta(ctx).userAgent,
      result.success ? "Success" : "Failed",
      result.errorMessage ?? undefined
    );
    return result;
  }),

  checkLevelIIITechnicianCertificateReminders: adminModuleProcedure.mutation(async ({ ctx }) => {
    const { checkLevelIIITechnicianCertificateReminders } = await import("./notifications");
    const result = await checkLevelIIITechnicianCertificateReminders();
    await logAuditEvent(
      ctx.user.id,
      "UPDATE",
      "levelIII_certificate_reminder_sweep",
      0,
      {
        notificationsSent: result.notificationsSent,
        success: result.success,
        triggerSource: "manual",
        errorMessage: result.errorMessage ?? null,
      },
      getAuditRequestMeta(ctx).ipAddress,
      getAuditRequestMeta(ctx).userAgent,
      result.success ? "Success" : "Failed",
      result.errorMessage ?? undefined
    );
    return result;
  }),

  checkPlannerTimesheetReminders: adminModuleProcedure.mutation(async ({ ctx }) => {
    const { checkPlannerTimesheetReminders } = await import("./notifications");
    const result = await checkPlannerTimesheetReminders();
    await logAuditEvent(
      ctx.user.id,
      "UPDATE",
      "planner_timesheet_reminder_sweep",
      0,
      {
        notificationsSent: result.notificationsSent,
        success: result.success,
        triggerSource: "manual",
        errorMessage: result.errorMessage ?? null,
      },
      getAuditRequestMeta(ctx).ipAddress,
      getAuditRequestMeta(ctx).userAgent,
      result.success ? "Success" : "Failed",
      result.errorMessage ?? undefined
    );
    return result;
  }),

    getEscalationHistory: adminModuleProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const { getEquipmentEscalationHistory } = await import("./notifications");
        return getEquipmentEscalationHistory(input);
      }),

    resetEscalation: adminModuleProcedure
      .input(z.number())
      .mutation(async ({ input }) => {
        const { resetEquipmentEscalation } = await import("./notifications");
        return resetEquipmentEscalation(input);
      }),
  }),
});

export type AppRouter = typeof appRouter;
