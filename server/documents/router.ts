import { TRPCError } from "@trpc/server";
import {
  extractDocumentPlaceholders,
  validateTemplatePlaceholders,
} from "../../shared/documentPlaceholders";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getAllBranches,
  getBranchById,
  createBranch,
  getAllCourses,
  getCourseById,
  createCourse,
  getAllCourseSchedules,
  getCourseScheduleById,
  createCourseSchedule,
  getEnrollmentsByStudent,
  getEnrollmentsByCourseSchedule,
  createEnrollment,
  getAssessmentsByEnrollment,
  createAssessment,
  getCertificatesByEnrollment,
  createCertificate,
  getAllLecturers,
  getLecturerById,
  createLecturer,
  getAllStudents,
  createStudent,
  getStudentById,
  getAllEquipment,
  getAllSpecimens,
  getAllLevelIIIClients,
  getAllLevelIIITechnicians,
  getAllLevelIIIAssessments,
  getPortalServiceRequestsForClient,
  normalisePortalServiceRequestMetadata,
  getUserById,
  getUserModuleAccess,
  getPortalAccessibleClientsForUser,
} from "../db";
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
const equipmentViewProcedure = moduleProcedure("equipment", "view");
const equipmentCreateProcedure = moduleProcedure("equipment", "create");
const equipmentEditProcedure = moduleProcedure("equipment", "edit");
const equipmentDeleteProcedure = moduleProcedure("equipment", "delete");
const specimensViewProcedure = moduleProcedure("specimens", "view");
const specimensCreateProcedure = moduleProcedure("specimens", "create");
const specimensEditProcedure = moduleProcedure("specimens", "edit");
const specimensDeleteProcedure = moduleProcedure("specimens", "delete");
const documentsViewProcedure = moduleProcedure("documents", "view");
const documentsCreateProcedure = moduleProcedure("documents", "create");
const documentsEditProcedure = moduleProcedure("documents", "edit");
const documentsDeleteProcedure = moduleProcedure("documents", "delete");
const plannerViewProcedure = moduleProcedure("planner", "view");
const plannerCreateProcedure = moduleProcedure("planner", "create");
const plannerEditProcedure = moduleProcedure("planner", "edit");
const plannerDeleteProcedure = moduleProcedure("planner", "delete");
const levelIIIViewProcedure = moduleProcedure("level_iii", "view");
const levelIIICreateProcedure = moduleProcedure("level_iii", "create");
const levelIIIEditProcedure = moduleProcedure("level_iii", "edit");
const levelIIIDeleteProcedure = moduleProcedure("level_iii", "delete");
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
const kpiViewProcedure = moduleProcedure("kpi", "view");
const kpiCreateProcedure = moduleProcedure("kpi", "create");
const kpiEditProcedure = moduleProcedure("kpi", "edit");
const kpiDeleteProcedure = moduleProcedure("kpi", "delete");
const lecturersViewProcedure = moduleProcedure("lecturers", "view");
const lecturersCreateProcedure = moduleProcedure("lecturers", "create");
const lecturersEditProcedure = moduleProcedure("lecturers", "edit");
const lecturersDeleteProcedure = moduleProcedure("lecturers", "delete");
const trainingViewProcedure = moduleProcedure("training", "view");
const trainingCreateProcedure = moduleProcedure("training", "create");
const trainingEditProcedure = moduleProcedure("training", "edit");
const trainingDeleteProcedure = moduleProcedure("training", "delete");
const portalViewProcedure = moduleProcedure("client_portal", "view");
const portalCreateProcedure = moduleProcedure("client_portal", "create");
const portalEditProcedure = moduleProcedure("client_portal", "edit");
const portalDeleteProcedure = moduleProcedure("client_portal", "delete");
const adminModuleProcedure = moduleProcedure("admin", "view");
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

// ============ Documents Router ============
export const documentsRouter = router({
  list: documentsViewProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return getAllDocuments(input?.branchId);
    }),

  get: documentsViewProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const document = await getDocumentById(input);
      if (!document) throw new TRPCError({ code: "NOT_FOUND" });
      return document;
    }),

  create: documentsCreateProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        documentType: z.string().optional(),
        content: z.string().optional(),
        url: z.string().optional(),
        branchId: z.number().optional().nullable(),
        tags: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const baseTags = getDocumentMetadata(input.tags ?? { kind: "library" });
      const normalizedTags = ensureDocumentApprovalMetadata(baseTags);
      return createDocument({
        ...input,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        content: input.content ?? "",
        url: input.url || "about:blank",
        tags: normalizedTags,
      } as any);
    }),

  update: documentsEditProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          documentType: z.string().optional(),
          content: z.string().optional(),
          url: z.string().optional(),
          branchId: z.number().optional().nullable(),
          tags: z.record(z.string(), z.any()).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const existingDocument = await getDocumentById(input.id);
      if (!existingDocument) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found." });
      }

      const existingMetadata = getDocumentMetadata(existingDocument.tags);
      const mergedTags = input.data.tags
        ? { ...existingMetadata, ...input.data.tags }
        : existingMetadata;
      const normalizedTags = ensureDocumentApprovalMetadata(mergedTags);

      return updateDocument(input.id, {
        ...input.data,
        title: input.data.title?.trim(),
        description:
          input.data.description === undefined
            ? undefined
            : input.data.description?.trim() || null,
        tags: normalizedTags,
      } as any);
    }),

  delete: documentsDeleteProcedure
    .input(z.object({ id: z.union([z.number(), z.string()]) }))
    .mutation(async ({ input }) => {
      const numId = typeof input.id === "string" ? parseInt(input.id, 10) : input.id;
      await deleteDocument(numId);
      return { success: true };
    }),

  generateEditable: documentsCreateProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        content: z.string(),
        branchId: z.number().optional().nullable(),
        tags: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${input.title}</title>
</head>
<body>
${input.content}
</body>
</html>`;

      return createDocument({
        title: input.title,
        description: input.description,
        documentType: "Generated",
        content: html,
        branchId: input.branchId ?? undefined,
        tags: input.tags ?? null,
        url: `/documents/${slug || "generated-document"}.html`,
      } as any);
    }),

  loadTrainingStarterTemplates: adminModuleProcedure.mutation(async () => {
    return loadMissingTrainingStarterTemplates();
  }),

  loadSampleDocumentScenario: adminModuleProcedure.mutation(async ({ ctx }) => {
    if (!["admin", "super_admin"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only internal admins can load the sample document scenario.",
      });
    }

    const templatesResult = await loadMissingTrainingStarterTemplates();

    let branchCreated = false;
    let courseCreated = false;
    let lecturerCreated = false;
    let studentCreated = false;
    let scheduleCreated = false;
    let enrollmentCreated = false;
    let assessmentCreated = false;
    let certificateCreated = false;
    let learnerDocumentsCreated = 0;
    let lecturerDocumentsCreated = 0;
    let revisionCreated = false;
    let lifecycleStatesPrepared = 0;
    let sampleTemplateMocksPrepared = 0;

    const sampleBranchCode = "DOC-SAMPLE";
    const sampleBranchName = "TextPoint Sample Training Centre";
    const sampleCourseCode = "PT2-SAMPLE";
    const sampleLecturerEmail = "sample.lecturer@textpoint.local";
    const sampleStudentEmail = "sample.learner@textpoint.local";
    const scheduleStartDate = new Date("2026-05-04T08:00:00");
    const scheduleEndDate = new Date("2026-05-15T17:00:00");
    const enrollmentDate = new Date("2026-04-20T09:00:00");
    const assessmentDate = new Date("2026-05-15T00:00:00");
    const certificateIssuedDate = new Date("2026-05-16T00:00:00");
    const sampleTemplateDefinitions = [
      {
        templateKey: "sample-controlled-ready-draft",
        title: "Sample Controlled Template - Ready Draft",
        description:
          "A clean controlled draft template that is ready to move into review.",
        documentType: "Other",
        templateCategory: "General",
        documentCode: "DOC-SAMPLE-RDY",
        content: `
          <h2>{{courseLabel}}</h2>
          <p><strong>Learner:</strong> {{studentName}}</p>
          <p>This mock template is intentionally review-ready so the controlled queue has a clean draft example.</p>
          <p><strong>Branch:</strong> {{branchName}}</p>
        `.trim(),
      },
      {
        templateKey: "sample-controlled-blocked-draft",
        title: "Sample Controlled Template - Blocked Draft",
        description:
          "A draft template with an intentionally invalid token for validation testing.",
        documentType: "Other",
        templateCategory: "General",
        documentCode: "DOC-SAMPLE-BLK",
        content: `
          <h2>{{courseLabel}}</h2>
          <p><strong>Learner:</strong> {{studentFullName}}</p>
          <p>This mock template deliberately contains an invalid placeholder so it shows in the blocked queue.</p>
          <p><strong>Schedule:</strong> {{scheduleDateRange}}</p>
        `.trim(),
      },
    ] as const;

    let branch =
      (await getAllBranches()).find(
        (item) => item.code === sampleBranchCode || item.name === sampleBranchName
      ) ?? null;
    if (!branch) {
      const insertResult = await createBranch({
        name: sampleBranchName,
        code: sampleBranchCode,
        description:
          "Sample branch used to demonstrate learner packs, lecturer packs, and revision control.",
        companyName: "TextPoint Sample Division",
        companyDescription:
          "Reusable sample data for document workflow demonstrations.",
        primaryColor: "#0f766e",
        secondaryColor: "#0f172a",
        active: true,
      } as any);
      branchCreated = true;
      branch = await getBranchById(getInsertId(insertResult));
    }
    if (!branch) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to prepare the sample branch.",
      });
    }

    let course =
      (await getAllCourses(branch.id)).find((item) => item.code === sampleCourseCode) ?? null;
    if (!course) {
      const insertResult = await createCourse({
        name: "Penetrant Testing Level 2",
        code: sampleCourseCode,
        description:
          "Sample course used to demonstrate document generation and revision control.",
        duration: 10,
        level: "Level 2",
        branchId: branch.id,
        active: true,
      } as any);
      courseCreated = true;
      course = await getCourseById(getInsertId(insertResult));
    }
    if (!course) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to prepare the sample course.",
      });
    }

    let lecturer =
      (await getAllLecturers(branch.id)).find(
        (item) => item.email?.toLowerCase() === sampleLecturerEmail
      ) ?? null;
    if (!lecturer) {
      const insertResult = await createLecturer({
        firstName: "Nomsa",
        lastName: "Dlamini",
        email: sampleLecturerEmail,
        phone: "0820000001",
        specialization: "Penetrant Testing",
        branchId: branch.id,
        active: true,
      } as any);
      lecturerCreated = true;
      lecturer = await getLecturerById(getInsertId(insertResult));
    }
    if (!lecturer) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to prepare the sample lecturer.",
      });
    }

    let student =
      (await getAllStudents()).find(
        (item) => item.email?.toLowerCase() === sampleStudentEmail
      ) ?? null;
    if (!student) {
      const insertResult = await createStudent({
        firstName: "Sipho",
        lastName: "Maseko",
        email: sampleStudentEmail,
        phone: "0830000002",
        passportNumber: "DOC-SAMPLE-2026",
        branchId: branch.id,
        interestType: "PCN After Course",
        isCurrentPcnHolder: false,
        bindtProductCompleted: false,
        pcnNumber: null,
        active: true,
        blacklisted: false,
      } as any);
      studentCreated = true;
      student = await getStudentById(getInsertId(insertResult));
    }
    if (!student) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to prepare the sample student.",
      });
    }

    let schedule =
      (await getAllCourseSchedules(branch.id)).find(
        (item) =>
          item.courseId === course.id &&
          item.lecturerId === lecturer.id &&
          new Date(item.startDate).getTime() === scheduleStartDate.getTime()
      ) ?? null;
    if (!schedule) {
      const insertResult = await createCourseSchedule({
        courseId: course.id,
        lecturerId: lecturer.id,
        branchId: branch.id,
        startDate: scheduleStartDate,
        endDate: scheduleEndDate,
        maxCapacity: 12,
        status: "Scheduled",
      } as any);
      scheduleCreated = true;
      const insertedScheduleId = getInsertId(insertResult);
      schedule =
        (await getAllCourseSchedules(branch.id)).find(
          (item) => item.id === insertedScheduleId
        ) ?? null;
    }
    if (!schedule) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to prepare the sample schedule.",
      });
    }

    let enrollment =
      (await getEnrollmentsByStudent(student.id)).find(
        (item) => item.courseScheduleId === schedule?.id
      ) ?? null;
    if (!enrollment) {
      const insertResult = await createEnrollment({
        studentId: student.id,
        courseScheduleId: schedule.id,
        enrollmentDate,
        status: "Active",
      } as any);
      enrollmentCreated = true;
      const insertedEnrollmentId = getInsertId(insertResult);
      enrollment =
        (await getEnrollmentsByStudent(student.id)).find(
          (item) => item.id === insertedEnrollmentId
        ) ??
        (await getEnrollmentsByStudent(student.id)).find(
          (item) => item.courseScheduleId === schedule?.id
        ) ??
        null;
    }
    if (!enrollment) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to prepare the sample enrolment.",
      });
    }

    const existingAssessments = await getAssessmentsByEnrollment(enrollment.id);
    if (existingAssessments.length === 0) {
      await createAssessment({
        enrollmentId: enrollment.id,
        assessorId: lecturer.id,
        assessmentType: "Theory",
        attemptNumber: 1,
        score: 86,
        maxScore: 100,
        result: "Pass",
        assessmentDate,
        notes: "Sample end-of-course assessment used for document placeholders.",
      } as any);
      assessmentCreated = true;
    }

    const existingCertificates = await getCertificatesByEnrollment(enrollment.id);
    if (existingCertificates.length === 0) {
      await createCertificate({
        enrollmentId: enrollment.id,
        certificateNumber: null,
        issuedDate: certificateIssuedDate,
        expiryDate: null,
        status: "Active",
        content:
          "<p>This sample certificate supports the document workflow demonstration.</p>",
        notes: "Sample certificate generated for document placeholders.",
        issuedBy: ctx.user.id,
      } as any);
      certificateCreated = true;
    }

    const existingDocuments = await getAllDocuments();
    for (const definition of sampleTemplateDefinitions) {
      const existingTemplate = existingDocuments.find((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "template" &&
          String(metadata.templateKey || "").trim() === definition.templateKey
        );
      });
      const preparedTags = {
        ...resetDocumentApprovalMetadata(
          {
            ...getDocumentMetadata(existingTemplate?.tags),
            kind: "template" satisfies DocumentMetadataKind,
          },
          "Draft"
        ),
        templateCategory: definition.templateCategory,
        templateStatus: "Draft",
        version:
          Number(getDocumentMetadata(existingTemplate?.tags).version || 0) > 0
            ? Number(getDocumentMetadata(existingTemplate?.tags).version)
            : 1,
        templateKey: definition.templateKey,
        documentCode: definition.documentCode,
        issueNumber: String(
          getDocumentMetadata(existingTemplate?.tags).issueNumber || "01"
        ),
        effectiveDate:
          String(getDocumentMetadata(existingTemplate?.tags).effectiveDate || "").trim() ||
          formatDocumentControlDate(new Date("2026-04-29T00:00:00")),
        placeholderKeys: extractTemplatePlaceholders(definition.content),
        accentColor: "#0f766e",
        companyName: "TextPoint",
        logoUrl: "",
      };

      if (!existingTemplate) {
        await createDocument({
          title: definition.title,
          description: definition.description,
          documentType: definition.documentType,
          content: definition.content,
          url: `/documents/${slugifyDocumentValue(definition.title)}.html`,
          branchId: branch.id,
          tags: preparedTags,
        } as any);
        sampleTemplateMocksPrepared += 1;
        continue;
      }

      const metadata = getDocumentMetadata(existingTemplate.tags);
      const needsRefresh =
        existingTemplate.title !== definition.title ||
        String(existingTemplate.description || "") !== definition.description ||
        String(existingTemplate.content || "").trim() !== definition.content ||
        String(existingTemplate.documentType || "") !== definition.documentType ||
        existingTemplate.branchId !== branch.id ||
        String(metadata.templateStatus || "") !== "Draft" ||
        String(metadata.approvalStatus || "") !== "Draft" ||
        String(metadata.templateCategory || "") !== definition.templateCategory ||
        String(metadata.documentCode || "") !== definition.documentCode;

      if (!needsRefresh) continue;

      await updateDocument(existingTemplate.id, {
        title: definition.title,
        description: definition.description,
        documentType: definition.documentType,
        content: definition.content,
        url: `/documents/${slugifyDocumentValue(definition.title)}.html`,
        branchId: branch.id,
        tags: preparedTags,
      } as any);
      sampleTemplateMocksPrepared += 1;
    }

    const existingLearnerDocuments = existingDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return (
        metadata.kind === "generated" &&
        metadata.sourceType === "student_enrollment" &&
        Number(metadata.studentId || 0) === student.id &&
        Number(metadata.enrollmentId || 0) === enrollment.id
      );
    });
    const existingScheduleDocuments = existingDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return (
        metadata.kind === "generated" &&
        metadata.sourceType === "schedule" &&
        Number(metadata.scheduleId || 0) === schedule.id
      );
    });

    let learnerDocuments = existingLearnerDocuments;
    if (learnerDocuments.length === 0) {
      const learnerTemplates = await getActiveTemplatesForCategories(
        STUDENT_PACKET_TEMPLATE_CATEGORIES
      );
      const learnerContext = await buildTrainingDocumentContext({
        studentId: student.id,
        enrollmentId: enrollment.id,
      });

      const createdDocuments = [];
      for (const template of learnerTemplates) {
        createdDocuments.push(
          await createGeneratedEnrollmentDocument({
            template,
            context: learnerContext,
            enrollmentId: enrollment.id,
            generatedStatus: "Issued",
          })
        );
      }
      learnerDocumentsCreated = createdDocuments.length;
      learnerDocuments = createdDocuments;
    }

    let scheduleDocuments = existingScheduleDocuments;
    if (scheduleDocuments.length === 0) {
      const lecturerTemplates = await getActiveTemplatesForCategories(
        LECTURER_PACKET_TEMPLATE_CATEGORIES
      );
      const scheduleContext = await buildScheduleDocumentContext({
        scheduleId: schedule.id,
      });

      const createdDocuments = [];
      for (const template of lecturerTemplates) {
        createdDocuments.push(
          await createGeneratedScheduleDocument({
            template,
            context: scheduleContext,
            scheduleId: schedule.id,
            generatedStatus: "Draft",
          })
        );
      }
      lecturerDocumentsCreated = createdDocuments.length;
      scheduleDocuments = createdDocuments;
    }

    const correctedLearnerDocument = learnerDocuments.find((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return metadata.generatedStatus === "Corrected";
    });

    if (!correctedLearnerDocument && learnerDocuments.length > 0) {
      const revisionSource =
        learnerDocuments.find((document) =>
          document.title.toLowerCase().includes("result notice")
        ) ?? learnerDocuments[0];

      const revisionTitle = revisionSource.title.toLowerCase().includes("corrected")
        ? revisionSource.title
        : `${revisionSource.title} - Corrected`;
      const revisionContent = `${revisionSource.content || "<p>No content available.</p>"}\n<p><strong>Correction Note:</strong> Sample corrected version created to demonstrate revision control and superseding.</p>`;

      await createGeneratedRevisionFromSource({
        sourceDocument: revisionSource,
        title: revisionTitle,
        description: revisionSource.description,
        content: revisionContent,
        generatedStatus: "Corrected",
        revisionReason:
          "Sample correction applied to demonstrate revision history for generated paperwork.",
        supersedeSource: true,
      });
      revisionCreated = true;
    }

    const learnerIssueDate = new Date("2026-05-16T10:00:00");
    const learnerIssuedAt = learnerIssueDate.toISOString();
    const learnerApprovedAt = new Date("2026-05-16T09:20:00").toISOString();
    const learnerDistributedAt = new Date("2026-05-16T10:35:00").toISOString();
    const learnerAcknowledgedAt = new Date("2026-05-16T11:15:00").toISOString();
    const sampleSignatureDataUrl =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='420' height='120' viewBox='0 0 420 120'%3E%3Crect width='420' height='120' fill='white'/%3E%3Cpath d='M28 76 C70 24 88 96 132 58 C152 42 148 88 178 68 C218 42 216 80 252 62 C296 39 306 72 388 45' fill='none' stroke='%230f172a' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ctext x='30' y='106' font-family='Segoe UI, Arial' font-size='16' fill='%23475569'%3ESample digital acknowledgement%3C/text%3E%3C/svg%3E";
    const learnerReleaseReference = buildPackReleaseReference(
      "Learner Pack",
      enrollment.id,
      learnerIssueDate
    );
    const learnerIssuedDocuments = learnerDocuments.filter((document) => {
      const metadata = getDocumentMetadata(document.tags);
      return metadata.generatedStatus === "Issued";
    });

    for (const document of learnerIssuedDocuments) {
      const metadata = getDocumentMetadata(document.tags);
      const needsLifecycleStamp =
        metadata.issuedAt !== learnerIssuedAt ||
        metadata.approvedAt !== learnerApprovedAt ||
        metadata.approvalStatus !== "Approved" ||
        metadata.packReleaseReference !== learnerReleaseReference ||
        metadata.distributedAt !== learnerDistributedAt ||
        metadata.acknowledgedAt !== learnerAcknowledgedAt;

      if (!needsLifecycleStamp) continue;

      await updateDocument(document.id, {
        tags: {
          ...metadata,
          approvalStatus: "Approved" satisfies DocumentApprovalStatus,
          approvedAt: learnerApprovedAt,
          approvedByName: "System Bootstrap",
          releaseAuthority: "System Bootstrap",
          releaseAuthorityRole: "System",
          issuedAt: learnerIssuedAt,
          issuedByName: "System Bootstrap",
          issueNote: "Sample learner pack formally issued for lifecycle demonstration.",
          packReleaseReference: learnerReleaseReference,
          distributedAt: learnerDistributedAt,
          distributedByName: "System Bootstrap",
          distributedToName: "Sipho Maseko",
          distributedToEmail: "sample.learner@textpoint.local",
          distributionMethod: "Email",
          signatureDueDate: new Date("2026-05-23T00:00:00").toISOString(),
          distributionNote:
            "Sample distribution record captured before digital acknowledgement.",
          acknowledgedAt: learnerAcknowledgedAt,
          acknowledgedByName: "Sipho Maseko",
          acknowledgedByRole: "Learner",
          acknowledgementMethod: "Digital Signature",
          acknowledgementNote:
            "Sample learner acknowledgement captured for pack sign-off demonstration.",
          acknowledgementSignatureDataUrl: sampleSignatureDataUrl,
          acknowledgementCapturedByName: "System Bootstrap",
          acknowledgementCapturedByUserId: ctx.user.id,
        },
      } as any);
      lifecycleStatesPrepared += 1;
    }

    const scheduleDocumentsWithMetadata = scheduleDocuments.map((document) => ({
      document,
      metadata: getDocumentMetadata(document.tags),
    }));
    const hasInReviewScheduleDocument = scheduleDocumentsWithMetadata.some(
      ({ metadata }) => metadata.approvalStatus === "In Review"
    );
    const hasRejectedScheduleDocument = scheduleDocumentsWithMetadata.some(
      ({ metadata }) => metadata.approvalStatus === "Rejected"
    );

    if (!hasInReviewScheduleDocument) {
      const inReviewTarget = scheduleDocumentsWithMetadata.find(
        ({ metadata }) =>
          metadata.generatedStatus === "Draft" &&
          metadata.approvalStatus !== "Rejected" &&
          metadata.approvalStatus !== "Approved"
      );

      if (inReviewTarget) {
        await updateDocument(inReviewTarget.document.id, {
          tags: {
            ...inReviewTarget.metadata,
            approvalStatus: "In Review" satisfies DocumentApprovalStatus,
            submittedForReviewAt: new Date("2026-04-30T11:30:00").toISOString(),
            submittedForReviewByName: "System Bootstrap",
            approvedAt: undefined,
            approvedByName: undefined,
            rejectedAt: undefined,
            rejectedByName: undefined,
            approvalNote: undefined,
            rejectionReason: undefined,
            releaseAuthority: undefined,
            releaseAuthorityRole: undefined,
          },
        } as any);
        lifecycleStatesPrepared += 1;
      }
    }

    if (!hasRejectedScheduleDocument) {
      const rejectedTarget = scheduleDocumentsWithMetadata.find(
        ({ metadata, document }) =>
          metadata.generatedStatus === "Draft" &&
          metadata.approvalStatus !== "In Review" &&
          metadata.approvalStatus !== "Approved" &&
          metadata.approvalStatus !== "Rejected" &&
          !scheduleDocumentsWithMetadata.some((candidate) => candidate.document.id === document.id)
      ) || scheduleDocumentsWithMetadata.find(
        ({ metadata }) =>
          metadata.generatedStatus === "Draft" &&
          metadata.approvalStatus !== "In Review" &&
          metadata.approvalStatus !== "Approved" &&
          metadata.approvalStatus !== "Rejected"
      );

      if (rejectedTarget) {
        await updateDocument(rejectedTarget.document.id, {
          tags: {
            ...rejectedTarget.metadata,
            approvalStatus: "Rejected" satisfies DocumentApprovalStatus,
            submittedForReviewAt: new Date("2026-04-29T10:00:00").toISOString(),
            submittedForReviewByName: "System Bootstrap",
            rejectedAt: new Date("2026-04-29T15:45:00").toISOString(),
            rejectedByName: "System Bootstrap",
            rejectionReason:
              "Sample rejection note added to demonstrate the controlled review lifecycle.",
            approvedAt: undefined,
            approvedByName: undefined,
            approvalNote: undefined,
            releaseAuthority: undefined,
            releaseAuthorityRole: undefined,
          },
        } as any);
        lifecycleStatesPrepared += 1;
      }
    }

    return {
      templatesCreated: templatesResult.created,
      branchCreated,
      courseCreated,
      lecturerCreated,
      studentCreated,
      scheduleCreated,
      enrollmentCreated,
      assessmentCreated,
      certificateCreated,
      learnerDocumentsCreated,
      lecturerDocumentsCreated,
      revisionCreated,
      lifecycleStatesPrepared,
      sampleTemplateMocksPrepared,
      branchId: branch.id,
      studentId: student.id,
      enrollmentId: enrollment.id,
      scheduleId: schedule.id,
    };
  }),

  generateFromTemplate: documentsCreateProcedure
    .input(
      z.object({
        templateId: z.number(),
        studentId: z.number(),
        enrollmentId: z.number(),
        titleOverride: z.string().optional().nullable(),
        descriptionOverride: z.string().optional().nullable(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const context = await buildTrainingDocumentContext({
        studentId: input.studentId,
        enrollmentId: input.enrollmentId,
      });

      return createGeneratedEnrollmentDocument({
        template: await getDocumentById(input.templateId),
        context,
        enrollmentId: input.enrollmentId,
        generatedStatus: input.generatedStatus ?? "Draft",
        titleOverride: input.titleOverride,
        descriptionOverride: input.descriptionOverride,
      });
    }),

  generateStudentPack: documentsCreateProcedure
    .input(
      z.object({
        studentId: z.number(),
        enrollmentId: z.number(),
        templateCategories: z.array(studentPacketTemplateCategorySchema).optional(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...STUDENT_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No active learner-pack templates were found for the selected categories.",
        });
      }

      const context = await buildTrainingDocumentContext({
        studentId: input.studentId,
        enrollmentId: input.enrollmentId,
      });

      const documents = [];
      for (const template of templates) {
        documents.push(
          await createGeneratedEnrollmentDocument({
            template,
            context,
            enrollmentId: input.enrollmentId,
            generatedStatus: input.generatedStatus ?? "Draft",
          })
        );
      }

      return {
        count: documents.length,
        categories,
        documents,
      };
    }),

  generateMissingStudentPack: documentsCreateProcedure
    .input(
      z.object({
        studentId: z.number(),
        enrollmentId: z.number(),
        templateCategories: z.array(studentPacketTemplateCategorySchema).optional(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...STUDENT_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No active learner-pack templates were found for the selected categories.",
        });
      }

      const context = await buildTrainingDocumentContext({
        studentId: input.studentId,
        enrollmentId: input.enrollmentId,
      });

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "student_enrollment" &&
          Number(metadata.studentId || 0) === input.studentId &&
          Number(metadata.enrollmentId || 0) === input.enrollmentId
        );
      });
      const effectiveTemplateKeys = new Set(
        Array.from(getEffectiveGeneratedDocumentsByTemplate(relatedDocuments).keys())
      );
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveTemplateKeys.has(templateKey);
      });

      const documents = [];
      for (const template of missingTemplates) {
        documents.push(
          await createGeneratedEnrollmentDocument({
            template,
            context,
            enrollmentId: input.enrollmentId,
            generatedStatus: input.generatedStatus ?? "Draft",
          })
        );
      }

      return {
        count: documents.length,
        categories,
        generatedTemplateTitles: missingTemplates.map((template) => template.title),
      };
    }),

  issueStudentPack: documentsEditProcedure
    .input(
      z.object({
        studentId: z.number(),
        enrollmentId: z.number(),
        templateCategories: z.array(studentPacketTemplateCategorySchema).optional(),
        issueNote: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCanApproveDocuments(ctx.user.role);
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...STUDENT_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No active learner-pack templates were found for the selected categories.",
        });
      }

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "student_enrollment" &&
          Number(metadata.studentId || 0) === input.studentId &&
          Number(metadata.enrollmentId || 0) === input.enrollmentId
        );
      });
      const effectiveDocumentsByTemplate =
        getEffectiveGeneratedDocumentsByTemplate(relatedDocuments);
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveDocumentsByTemplate.has(templateKey);
      });

        if (missingTemplates.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
          message: `This learner pack is incomplete. Missing: ${missingTemplates
            .map((template) => template.title)
            .join(", ")}.`,
        });
        }

        const documentsToIssue = Array.from(effectiveDocumentsByTemplate.values());
        const documentsAwaitingApproval = documentsToIssue.filter((document) => {
          const metadata = getDocumentMetadata(document.tags);
          return getDocumentApprovalStatus(metadata) !== "Approved";
        });

        if (documentsAwaitingApproval.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This learner pack still has documents awaiting approval: ${documentsAwaitingApproval
              .map((document) => document.title)
              .join(", ")}.`,
          });
        }

        const issuedDate = new Date();
        const issuedAt = issuedDate.toISOString();
        const issuedByName = ctx.user.name?.trim() || ctx.user.email?.trim() || "System User";
      const issueNote = input.issueNote?.trim() || null;
      const packReleaseReference = buildPackReleaseReference(
        "Learner Pack",
        input.enrollmentId,
        issuedDate
      );

        for (const document of documentsToIssue) {
          const metadata = getDocumentMetadata(document.tags);
          await updateDocument(document.id, {
            tags: {
              ...metadata,
            generatedStatus: "Issued",
              issuedAt,
              issuedByName,
              issueNote,
              packReleaseReference,
              releaseAuthority:
                String(metadata.releaseAuthority || "").trim() || issuedByName,
              releaseAuthorityRole:
                String(metadata.releaseAuthorityRole || "").trim() ||
                formatReleaseAuthorityRole(ctx.user.role),
            },
          } as any);
        }

      return {
        count: documentsToIssue.length,
        categories,
        issuedAt,
        issuedByName,
        packReleaseReference,
      };
    }),

  dispatchStudentPack: documentsEditProcedure
    .input(
      z.object({
        studentId: z.number(),
        enrollmentId: z.number(),
        templateCategories: z.array(studentPacketTemplateCategorySchema).optional(),
        recipientName: z.string().min(1),
        recipientEmail: z.string().email().optional().or(z.literal("")).nullable(),
        distributionMethod: documentDistributionMethodSchema,
        signatureDueDate: z.date().optional().nullable(),
        distributionNote: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...STUDENT_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No active learner-pack templates were found for the selected categories.",
        });
      }

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "student_enrollment" &&
          Number(metadata.studentId || 0) === input.studentId &&
          Number(metadata.enrollmentId || 0) === input.enrollmentId
        );
      });
      const effectiveDocumentsByTemplate =
        getEffectiveGeneratedDocumentsByTemplate(relatedDocuments);
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveDocumentsByTemplate.has(templateKey);
      });

      if (missingTemplates.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This learner pack is incomplete. Missing: ${missingTemplates
            .map((template) => template.title)
            .join(", ")}.`,
        });
      }

      const documentsToDispatch = Array.from(effectiveDocumentsByTemplate.values());
      const unissuedDocuments = documentsToDispatch.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return metadata.generatedStatus !== "Issued";
      });

      if (unissuedDocuments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This learner pack must be issued before dispatch: ${unissuedDocuments
            .map((document) => document.title)
            .join(", ")}.`,
        });
      }

      const distributedAt = new Date().toISOString();
      const distributedByName =
        ctx.user.name?.trim() || ctx.user.email?.trim() || "System User";

      for (const document of documentsToDispatch) {
        const metadata = getDocumentMetadata(document.tags);
        await updateDocument(document.id, {
          tags: {
            ...metadata,
            distributedAt,
            distributedByName,
            distributedToName: input.recipientName.trim(),
            distributedToEmail: input.recipientEmail?.trim() || null,
            distributionMethod: input.distributionMethod,
            signatureDueDate: input.signatureDueDate?.toISOString() || null,
            distributionNote: input.distributionNote?.trim() || null,
          },
        } as any);
      }

      return {
        count: documentsToDispatch.length,
        categories,
        distributedAt,
        distributedByName,
        distributedToName: input.recipientName.trim(),
        distributionMethod: input.distributionMethod,
      };
    }),

  acknowledgeStudentPack: documentsEditProcedure
    .input(
      z.object({
        studentId: z.number(),
        enrollmentId: z.number(),
        templateCategories: z.array(studentPacketTemplateCategorySchema).optional(),
        signerName: z.string().min(1),
        signerRole: z.string().min(1),
        signatureDataUrl: digitalSignatureDataUrlSchema,
        acknowledgementNote: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...STUDENT_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "No active learner-pack templates were found for the selected categories.",
        });
      }

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "student_enrollment" &&
          Number(metadata.studentId || 0) === input.studentId &&
          Number(metadata.enrollmentId || 0) === input.enrollmentId
        );
      });
      const effectiveDocumentsByTemplate =
        getEffectiveGeneratedDocumentsByTemplate(relatedDocuments);
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveDocumentsByTemplate.has(templateKey);
      });

      if (missingTemplates.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This learner pack is incomplete. Missing: ${missingTemplates
            .map((template) => template.title)
            .join(", ")}.`,
        });
      }

      const documentsToAcknowledge = Array.from(effectiveDocumentsByTemplate.values());
      const unissuedDocuments = documentsToAcknowledge.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return metadata.generatedStatus !== "Issued";
      });

      if (unissuedDocuments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This learner pack must be issued before acknowledgement: ${unissuedDocuments
            .map((document) => document.title)
            .join(", ")}.`,
        });
      }

      const acknowledgedAt = new Date().toISOString();
      const capturedByName = ctx.user.name?.trim() || ctx.user.email?.trim() || "System User";

      for (const document of documentsToAcknowledge) {
        const metadata = getDocumentMetadata(document.tags);
        await updateDocument(document.id, {
          tags: {
            ...metadata,
            acknowledgedAt,
            acknowledgedByName: input.signerName.trim(),
            acknowledgedByRole: input.signerRole.trim(),
            acknowledgementMethod: "Digital Signature",
            acknowledgementNote: input.acknowledgementNote?.trim() || null,
            acknowledgementSignatureDataUrl: input.signatureDataUrl,
            acknowledgementCapturedByName: capturedByName,
            acknowledgementCapturedByUserId: ctx.user.id,
          },
        } as any);
      }

      return {
        count: documentsToAcknowledge.length,
        categories,
        acknowledgedAt,
        acknowledgedByName: input.signerName.trim(),
        acknowledgementMethod: "Digital Signature",
      };
    }),

  generateFromScheduleTemplate: documentsCreateProcedure
    .input(
      z.object({
        templateId: z.number(),
        scheduleId: z.number(),
        titleOverride: z.string().optional().nullable(),
        descriptionOverride: z.string().optional().nullable(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const context = await buildScheduleDocumentContext({
        scheduleId: input.scheduleId,
      });

      return createGeneratedScheduleDocument({
        template: await getDocumentById(input.templateId),
        context,
        scheduleId: input.scheduleId,
        generatedStatus: input.generatedStatus ?? "Draft",
        titleOverride: input.titleOverride,
        descriptionOverride: input.descriptionOverride,
      });
    }),

  generateSchedulePack: documentsCreateProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        templateCategories: z.array(lecturerPacketTemplateCategorySchema).optional(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...LECTURER_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active lecturer-pack templates were found.",
        });
      }

      const context = await buildScheduleDocumentContext({
        scheduleId: input.scheduleId,
      });

      const documents = [];
      for (const template of templates) {
        documents.push(
          await createGeneratedScheduleDocument({
            template,
            context,
            scheduleId: input.scheduleId,
            generatedStatus: input.generatedStatus ?? "Draft",
          })
        );
      }

      return {
        count: documents.length,
        categories,
        documents,
      };
    }),

  generateMissingSchedulePack: documentsCreateProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        templateCategories: z.array(lecturerPacketTemplateCategorySchema).optional(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...LECTURER_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active lecturer-pack templates were found.",
        });
      }

      const context = await buildScheduleDocumentContext({
        scheduleId: input.scheduleId,
      });

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "schedule" &&
          Number(metadata.scheduleId || 0) === input.scheduleId
        );
      });
      const effectiveTemplateKeys = new Set(
        Array.from(getEffectiveGeneratedDocumentsByTemplate(relatedDocuments).keys())
      );
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveTemplateKeys.has(templateKey);
      });

      const documents = [];
      for (const template of missingTemplates) {
        documents.push(
          await createGeneratedScheduleDocument({
            template,
            context,
            scheduleId: input.scheduleId,
            generatedStatus: input.generatedStatus ?? "Draft",
          })
        );
      }

      return {
        count: documents.length,
        categories,
        generatedTemplateTitles: missingTemplates.map((template) => template.title),
      };
    }),

  issueSchedulePack: documentsEditProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        templateCategories: z.array(lecturerPacketTemplateCategorySchema).optional(),
        issueNote: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      assertCanApproveDocuments(ctx.user.role);
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...LECTURER_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active lecturer-pack templates were found.",
        });
      }

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "schedule" &&
          Number(metadata.scheduleId || 0) === input.scheduleId
        );
      });
      const effectiveDocumentsByTemplate =
        getEffectiveGeneratedDocumentsByTemplate(relatedDocuments);
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveDocumentsByTemplate.has(templateKey);
      });

        if (missingTemplates.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
          message: `This lecturer pack is incomplete. Missing: ${missingTemplates
            .map((template) => template.title)
            .join(", ")}.`,
        });
        }

        const documentsToIssue = Array.from(effectiveDocumentsByTemplate.values());
        const documentsAwaitingApproval = documentsToIssue.filter((document) => {
          const metadata = getDocumentMetadata(document.tags);
          return getDocumentApprovalStatus(metadata) !== "Approved";
        });

        if (documentsAwaitingApproval.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This lecturer pack still has documents awaiting approval: ${documentsAwaitingApproval
              .map((document) => document.title)
              .join(", ")}.`,
          });
        }

        const issuedDate = new Date();
        const issuedAt = issuedDate.toISOString();
        const issuedByName = ctx.user.name?.trim() || ctx.user.email?.trim() || "System User";
      const issueNote = input.issueNote?.trim() || null;
      const packReleaseReference = buildPackReleaseReference(
        "Lecturer Pack",
        input.scheduleId,
        issuedDate
      );

        for (const document of documentsToIssue) {
          const metadata = getDocumentMetadata(document.tags);
          await updateDocument(document.id, {
            tags: {
              ...metadata,
            generatedStatus: "Issued",
              issuedAt,
              issuedByName,
              issueNote,
              packReleaseReference,
              releaseAuthority:
                String(metadata.releaseAuthority || "").trim() || issuedByName,
              releaseAuthorityRole:
                String(metadata.releaseAuthorityRole || "").trim() ||
                formatReleaseAuthorityRole(ctx.user.role),
            },
          } as any);
        }

      return {
        count: documentsToIssue.length,
        categories,
        issuedAt,
        issuedByName,
        packReleaseReference,
      };
    }),

  dispatchSchedulePack: documentsEditProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        templateCategories: z.array(lecturerPacketTemplateCategorySchema).optional(),
        recipientName: z.string().min(1),
        recipientEmail: z.string().email().optional().or(z.literal("")).nullable(),
        distributionMethod: documentDistributionMethodSchema,
        signatureDueDate: z.date().optional().nullable(),
        distributionNote: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...LECTURER_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active lecturer-pack templates were found.",
        });
      }

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "schedule" &&
          Number(metadata.scheduleId || 0) === input.scheduleId
        );
      });
      const effectiveDocumentsByTemplate =
        getEffectiveGeneratedDocumentsByTemplate(relatedDocuments);
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveDocumentsByTemplate.has(templateKey);
      });

      if (missingTemplates.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This lecturer pack is incomplete. Missing: ${missingTemplates
            .map((template) => template.title)
            .join(", ")}.`,
        });
      }

      const documentsToDispatch = Array.from(effectiveDocumentsByTemplate.values());
      const unissuedDocuments = documentsToDispatch.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return metadata.generatedStatus !== "Issued";
      });

      if (unissuedDocuments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This lecturer pack must be issued before dispatch: ${unissuedDocuments
            .map((document) => document.title)
            .join(", ")}.`,
        });
      }

      const distributedAt = new Date().toISOString();
      const distributedByName =
        ctx.user.name?.trim() || ctx.user.email?.trim() || "System User";

      for (const document of documentsToDispatch) {
        const metadata = getDocumentMetadata(document.tags);
        await updateDocument(document.id, {
          tags: {
            ...metadata,
            distributedAt,
            distributedByName,
            distributedToName: input.recipientName.trim(),
            distributedToEmail: input.recipientEmail?.trim() || null,
            distributionMethod: input.distributionMethod,
            signatureDueDate: input.signatureDueDate?.toISOString() || null,
            distributionNote: input.distributionNote?.trim() || null,
          },
        } as any);
      }

      return {
        count: documentsToDispatch.length,
        categories,
        distributedAt,
        distributedByName,
        distributedToName: input.recipientName.trim(),
        distributionMethod: input.distributionMethod,
      };
    }),

  acknowledgeSchedulePack: documentsEditProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        templateCategories: z.array(lecturerPacketTemplateCategorySchema).optional(),
        signerName: z.string().min(1),
        signerRole: z.string().min(1),
        signatureDataUrl: digitalSignatureDataUrlSchema,
        acknowledgementNote: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const categories =
        input.templateCategories && input.templateCategories.length > 0
          ? input.templateCategories
          : [...LECTURER_PACKET_TEMPLATE_CATEGORIES];
      const templates = await getActiveTemplatesForCategories(categories);

      if (templates.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active lecturer-pack templates were found.",
        });
      }

      const allDocuments = await getAllDocuments();
      const relatedDocuments = allDocuments.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return (
          metadata.kind === "generated" &&
          metadata.sourceType === "schedule" &&
          Number(metadata.scheduleId || 0) === input.scheduleId
        );
      });
      const effectiveDocumentsByTemplate =
        getEffectiveGeneratedDocumentsByTemplate(relatedDocuments);
      const missingTemplates = templates.filter((template) => {
        const metadata = getDocumentMetadata(template.tags);
        const templateKey =
          String(metadata.templateKey || "") || slugifyDocumentValue(template.title);
        return !effectiveDocumentsByTemplate.has(templateKey);
      });

      if (missingTemplates.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This lecturer pack is incomplete. Missing: ${missingTemplates
            .map((template) => template.title)
            .join(", ")}.`,
        });
      }

      const documentsToAcknowledge = Array.from(effectiveDocumentsByTemplate.values());
      const unissuedDocuments = documentsToAcknowledge.filter((document) => {
        const metadata = getDocumentMetadata(document.tags);
        return metadata.generatedStatus !== "Issued";
      });

      if (unissuedDocuments.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This lecturer pack must be issued before acknowledgement: ${unissuedDocuments
            .map((document) => document.title)
            .join(", ")}.`,
        });
      }

      const acknowledgedAt = new Date().toISOString();
      const capturedByName = ctx.user.name?.trim() || ctx.user.email?.trim() || "System User";

      for (const document of documentsToAcknowledge) {
        const metadata = getDocumentMetadata(document.tags);
        await updateDocument(document.id, {
          tags: {
            ...metadata,
            acknowledgedAt,
            acknowledgedByName: input.signerName.trim(),
            acknowledgedByRole: input.signerRole.trim(),
            acknowledgementMethod: "Digital Signature",
            acknowledgementNote: input.acknowledgementNote?.trim() || null,
            acknowledgementSignatureDataUrl: input.signatureDataUrl,
            acknowledgementCapturedByName: capturedByName,
            acknowledgementCapturedByUserId: ctx.user.id,
          },
        } as any);
      }

      return {
        count: documentsToAcknowledge.length,
        categories,
        acknowledgedAt,
        acknowledgedByName: input.signerName.trim(),
        acknowledgementMethod: "Digital Signature",
      };
    }),

  reviseTemplate: documentsEditProcedure
    .input(
      z.object({
        documentId: z.number(),
        title: z.string(),
        description: z.string().optional().nullable(),
        content: z.string(),
        documentCode: z.string().optional().nullable(),
        issueNumber: z.string().optional().nullable(),
        effectiveDate: z.string().optional().nullable(),
        templateStatus: z.enum(["Draft", "Active", "Archived"]).optional(),
        revisionReason: z.string().optional().nullable(),
        supersedeSource: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createTemplateRevisionFromSource({
        sourceDocument: await getDocumentById(input.documentId),
        title: input.title,
        description: input.description,
        content: input.content,
        documentCode: input.documentCode,
        issueNumber: input.issueNumber,
        effectiveDate: input.effectiveDate,
        templateStatus: input.templateStatus,
        revisionReason: input.revisionReason,
        supersedeSource: input.supersedeSource,
      });
    }),

  reviseGenerated: documentsEditProcedure
    .input(
      z.object({
        documentId: z.number(),
        title: z.string(),
        description: z.string().optional().nullable(),
        content: z.string(),
        generatedStatus: generatedDocumentStatusSchema.optional(),
        revisionReason: z.string().optional().nullable(),
        supersedeSource: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createGeneratedRevisionFromSource({
        sourceDocument: await getDocumentById(input.documentId),
        title: input.title,
        description: input.description,
        content: input.content,
        generatedStatus: input.generatedStatus,
        revisionReason: input.revisionReason,
        supersedeSource: input.supersedeSource,
      });
    }),

  submitForReview: documentsEditProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { document, metadata } = await requireControlledDocumentForApproval(input.id);

      if (getDocumentApprovalStatus(metadata) === "Approved") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This document is already approved. Edit it or create a revision if a new review cycle is required.",
        });
      }

      if (metadata.kind === "template") {
        const validation = validateTemplatePlaceholders({
          content: document.content || "",
          documentType: document.documentType || "",
          templateCategory: String(metadata.templateCategory || "General"),
        });

        if (!validation.canSubmitForReview) {
          const unknownSummary = validation.unknownKeys.length
            ? `Unknown placeholders: ${validation.unknownKeys
                .slice(0, 3)
                .map((key) => `{{${key}}}`)
                .join(", ")}`
            : "";
          const missingSummary = validation.missingRequiredKeys.length
            ? `Missing required placeholders: ${validation.missingRequiredKeys
                .slice(0, 3)
                .map((key) => `{{${key}}}`)
                .join(", ")}`
            : "";

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: [
              "This template is not ready for review yet.",
              unknownSummary,
              missingSummary,
              "Open the validation wizard, correct the placeholders, and submit again.",
            ]
              .filter(Boolean)
              .join(" "),
          });
        }
      }

      await updateDocument(document.id, {
        tags: {
          ...metadata,
          approvalStatus: "In Review" satisfies DocumentApprovalStatus,
          submittedForReviewAt: new Date().toISOString(),
          submittedForReviewByName:
            ctx.user.name?.trim() || ctx.user.email?.trim() || "System User",
          submittedForReviewByUserId: ctx.user.id,
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
        },
      } as any);

      const { notifyLevelIIIDocumentReviewChanged } = await import("../notifications");
      await notifyLevelIIIDocumentReviewChanged({
        documentId: document.id,
        documentTitle: document.title,
        action: "submit",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name?.trim() || ctx.user.email?.trim() || "System User",
        technicianName: String(metadata.technicianName ?? "").trim() || null,
        submittedByUserId: ctx.user.id,
        metadata,
      });

      return getDocumentById(document.id);
    }),

  approve: documentsEditProcedure
    .input(
      z.object({
        id: z.number(),
        approvalNote: z.string().optional().nullable(),
        releaseAuthority: z.string().optional().nullable(),
        releaseAuthorityRole: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanApproveDocuments(ctx.user.role);
      const { document, metadata } = await requireControlledDocumentForApproval(input.id);

      await updateDocument(document.id, {
        tags: {
          ...metadata,
          approvalStatus: "Approved" satisfies DocumentApprovalStatus,
          approvedAt: new Date().toISOString(),
          approvedByName: ctx.user.name?.trim() || ctx.user.email?.trim() || "System User",
          approvedByUserId: ctx.user.id,
          rejectedAt: undefined,
          rejectedByName: undefined,
          rejectedByUserId: undefined,
          rejectionReason: undefined,
          approvalNote: input.approvalNote?.trim() || null,
          releaseAuthority:
            input.releaseAuthority?.trim() ||
            ctx.user.name?.trim() ||
            ctx.user.email?.trim() ||
            "System User",
          releaseAuthorityRole:
            input.releaseAuthorityRole?.trim() || formatReleaseAuthorityRole(ctx.user.role),
        },
      } as any);

      const { notifyLevelIIIDocumentReviewChanged } = await import("../notifications");
      await notifyLevelIIIDocumentReviewChanged({
        documentId: document.id,
        documentTitle: document.title,
        action: "approve",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name?.trim() || ctx.user.email?.trim() || "System User",
        technicianName: String(metadata.technicianName ?? "").trim() || null,
        submittedByUserId: Number(metadata.submittedForReviewByUserId ?? 0) || null,
        note: input.approvalNote?.trim() || null,
        metadata,
      });

      return getDocumentById(document.id);
    }),

  reject: documentsEditProcedure
    .input(
      z.object({
        id: z.number(),
        rejectionReason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanApproveDocuments(ctx.user.role);
      const { document, metadata } = await requireControlledDocumentForApproval(input.id);

      await updateDocument(document.id, {
        tags: {
          ...metadata,
          approvalStatus: "Rejected" satisfies DocumentApprovalStatus,
          rejectedAt: new Date().toISOString(),
          rejectedByName: ctx.user.name?.trim() || ctx.user.email?.trim() || "System User",
          rejectedByUserId: ctx.user.id,
          approvedAt: undefined,
          approvedByName: undefined,
          approvedByUserId: undefined,
          approvalNote: undefined,
          rejectionReason: input.rejectionReason.trim(),
          releaseAuthority: undefined,
          releaseAuthorityRole: undefined,
        },
      } as any);

      const { notifyLevelIIIDocumentReviewChanged } = await import("../notifications");
      await notifyLevelIIIDocumentReviewChanged({
        documentId: document.id,
        documentTitle: document.title,
        action: "reject",
        actorUserId: ctx.user.id,
        actorName: ctx.user.name?.trim() || ctx.user.email?.trim() || "System User",
        technicianName: String(metadata.technicianName ?? "").trim() || null,
        submittedByUserId: Number(metadata.submittedForReviewByUserId ?? 0) || null,
        note: input.rejectionReason.trim(),
        metadata,
      });

      return getDocumentById(document.id);
    }),
});