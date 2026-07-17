import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { isEmailDeliveryConfigured, sendEmail } from "../_core/email";
import { getAuditTrail, logAuditEvent } from "../audit";
import { extractDocumentPlaceholders } from "../../shared/documentPlaceholders";
import {
  buildLevelIIIDocumentAutomationRules,
  findLevelIIIDocumentAutomationRuleByLabel,
  isLikelyLevelIIIAssessmentRequest,
} from "@shared/levelIIIDocumentAutomation";
import { validatePassword } from "../../shared/passwordValidation";
import {
  getAllLevelIIIClients,
  getPortalAccessibleClientsForUser,
  getPortalClientAccessForUser,
  getPortalClientAssignments,
  upsertPortalClientAssignment,
  deletePortalClientAssignment,
  setUserLoginEnabled,
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
  getPortalApprovalRequests,
  reviewPortalApprovalRequest,
  createPortalApprovalRequest,
  getPortalClientReminderSettings,
  updatePortalClientReminderSettings,
  getPortalServiceDefinitions,
  createPortalServiceDefinition,
  updatePortalServiceDefinition,
  getPortalServiceRequestsForClient,
  createPortalServiceRequest,
  normalisePortalServiceRequestMetadata,
  updatePortalServiceRequestStatus,
  getPortalAssessmentGuidesForClient,
  createPortalAssessmentGuide,
  updatePortalAssessmentGuide,
  getPortalTechniciansForClient,
  createLevelIIITechnician,
  updateLevelIIITechnician,
  deleteLevelIIITechnician,
  getAllLevelIIITechnicians,
  getAllLevelIIIAssessments,
  getPortalRequirementDefinitionsForClient,
  createPortalRequirementDefinition,
  updatePortalRequirementDefinition,
  getPortalRequirementMatrixForClient,
  upsertPortalTechnicianRequirement,
  uploadPortalRequirementDocument,
  buildPortalRequirementDocumentStoragePlan,
  getPortalDashboardForClient,
  getPortalClientDocuments,
  buildPortalClientDocumentStoragePlan,
  createPortalClientDocument,
  updatePortalClientDocument,
  deletePortalClientDocument,
  getPortalCommentsForClient,
  createPortalComment,
  updatePortalCommentStatus,
  getPortalResourcesForClient,
  createPortalClientResource,
  updatePortalClientResource,
  deletePortalClientResource,
  getAllDocuments,
  getDocumentById,
  createDocument,
  stagePortalApprovalFile,
  createAppUser,
  updateAppUserWithAuth,
  getUserById,
  getUserModuleAccess,
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
] as const;

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

function getDocumentMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
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

function getInsertId(result: unknown) {
  return Number((result as any)?.insertId || 0);
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

  const insertResult = await createDocument({
    title,
    description: description || null,
    documentType: template.documentType || "Generated",
    content,
    url: `/documents/${slug || "generated-document"}.html`,
    branchId: params.context.metadata.branchId ?? template.branchId ?? null,
    tags: {
      kind: "generated" satisfies DocumentMetadataKind,
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

const levelIIITechnicianMethodQualificationSchema = z.object({
  method: z.string().min(1),
  level: z.string().min(1),
});

const portalAccessLevelSchema = z.enum(["viewer", "editor", "manager"]);

const portalRequirementStatusSchema = z.enum([
  "missing",
  "current",
  "no_expiry",
  "expiring",
  "expired",
  "pending_review",
]);
const portalCustomFieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
]);
const portalRequirementCustomFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: portalCustomFieldTypeSchema,
  required: z.boolean().optional(),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).optional(),
  sortOrder: z.number().int().optional().nullable(),
});
const portalReminderSettingsSchema = z.object({
  complianceEnabled: z.boolean().optional(),
  documentEnabled: z.boolean().optional(),
  includeMissingRequired: z.boolean().optional(),
  includePendingReview: z.boolean().optional(),
  documentLeadDays: z.number().int().min(0).optional(),
  complianceEscalationDays: z.number().int().min(0).optional(),
  documentEscalationDays: z.number().int().min(0).optional(),
  sendToAssignedUsers: z.boolean().optional(),
  sendToInternalAdmins: z.boolean().optional(),
  escalationManagersOnly: z.boolean().optional(),
  allowedClientDocumentLabels: z.array(z.string().min(1)).optional(),
});
const portalServiceRequestStatusSchema = z.enum([
  "submitted",
  "in_review",
  "planned",
  "scheduled",
  "completed",
  "closed",
]);
const portalServiceDefinitionConfigSchema = z.object({
  allowBranchSelection: z.boolean().optional(),
  allowTechnicianSelection: z.boolean().optional(),
  allowMultipleTechniques: z.boolean().optional(),
  allowPreferredDate: z.boolean().optional(),
  requestLabel: z.string().optional().nullable(),
  techniqueOptions: z.array(z.string().min(1)).optional(),
  requestedDocumentLabels: z.array(z.string().min(1)).optional(),
});
const portalServiceRequestSupportingDocumentSchema = z.object({
  label: z.string().min(1),
  note: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileDataUrl: z.string().optional().nullable(),
});
const portalServiceRequestManagementMetadataSchema = z.object({
  clientVisibleUpdate: z.string().optional().nullable(),
  internalOwner: z.string().optional().nullable(),
  plannedAction: z.string().optional().nullable(),
  confirmedDate: z.date().optional().nullable(),
  linkedActivityId: z.number().int().positive().optional().nullable(),
});

function normaliseRequirementMatchKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function matchPortalRequirementDefinitionForDocument(
  label: string,
  definitions: Awaited<ReturnType<typeof getPortalRequirementDefinitionsForClient>>
) {
  const labelKey = normaliseRequirementMatchKey(label);
  if (!labelKey) return null;

  const exact = definitions.find(
    (definition) => normaliseRequirementMatchKey(definition.name) === labelKey
  );
  if (exact) return exact;

  const contains = definitions.find((definition) => {
    const nameKey = normaliseRequirementMatchKey(definition.name);
    return nameKey.includes(labelKey) || labelKey.includes(nameKey);
  });
  return contains ?? null;
}

async function requirePortalClientAccess(
  ctx: { user: NonNullable<Awaited<ReturnType<typeof getUserById>>> },
  clientId: number,
  mode: "view" | "edit" | "manage" = "view"
) {
  const access = await getPortalClientAccessForUser(ctx.user.id, ctx.user.role, clientId);
  if (!access) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this client portal.",
    });
  }

  const isAdmin = ["admin", "super_admin"].includes(ctx.user.role);
  if (mode === "view" || isAdmin) {
    return access;
  }

  if (mode === "edit" && ["editor", "manager"].includes(access.accessLevel)) {
    return access;
  }

  if (mode === "manage" && access.accessLevel === "manager") {
    return access;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      mode === "manage"
        ? "You need manager access for this client."
        : "You do not have edit access for this client.",
  });
}

function isPortalSystemAdmin(user: NonNullable<Awaited<ReturnType<typeof getUserById>>>) {
  return ["admin", "super_admin"].includes(user.role);
}

function buildPortalLoginUrl() {
  return `${ENV.appBaseUrl.replace(/\/$/, "")}/client-login`;
}

async function sendPortalCredentialEmail(args: {
  recipientEmail: string;
  recipientName?: string | null;
  companyName: string;
  temporaryPassword: string;
  mode: "created" | "reset";
}) {
  const configured = isEmailDeliveryConfigured();
  const loginUrl = buildPortalLoginUrl();
  if (!configured) {
    return { configured, sent: false, loginUrl };
  }

  const recipientName = args.recipientName?.trim() || "there";
  const subject =
    args.mode === "reset"
      ? `TextPoint: temporary password reset for ${args.companyName}`
      : `TextPoint: client portal login for ${args.companyName}`;
  const intro =
    args.mode === "reset"
      ? "A new temporary password has been issued for your TextPoint client portal access."
      : "Your TextPoint client portal login is ready.";
  const lines = [
    `Hello ${recipientName},`,
    "",
    intro,
    "",
    `Client: ${args.companyName}`,
    `Email: ${args.recipientEmail}`,
    `Temporary Password: ${args.temporaryPassword}`,
    `Client Portal Login: ${loginUrl}`,
    "",
    "You will be required to change this password the first time you sign in.",
    "",
    "If you were not expecting this email, please contact your TextPoint administrator.",
  ];

  const sent = await sendEmail({
    to: args.recipientEmail,
    subject,
    text: lines.join("\n"),
    replyTo: ENV.smtpReplyTo ?? null,
  });

  return { configured, sent, loginUrl };
}

async function getPortalBranchScope(
  ctx: { user: NonNullable<Awaited<ReturnType<typeof getUserById>>> },
  clientId: number,
  requestedBranchId?: number | null
) {
  const accessibleBranches = await getPortalAccessibleBranchesForUser(
    ctx.user.id,
    ctx.user.role,
    clientId
  );
  const accessibleBranchIds = accessibleBranches.map((branch) => branch.id);

  if (requestedBranchId && !accessibleBranchIds.includes(requestedBranchId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to the selected client branch.",
    });
  }

  return {
    accessibleBranches,
    accessibleBranchIds,
    selectedBranchId: requestedBranchId ?? null,
    scopedBranchIds: requestedBranchId ? [requestedBranchId] : accessibleBranchIds,
  };
}

async function getPortalAuthScope(args: {
  ctx: { user: NonNullable<Awaited<ReturnType<typeof getUserById>>> };
  clientId: number;
  branchId?: number | null;
  mode?: "view" | "edit" | "manage";
}) {
  const access = await requirePortalClientAccess(args.ctx, args.clientId, args.mode ?? "view");
  const scope =
    args.branchId === undefined
      ? null
      : await getPortalBranchScope(args.ctx, args.clientId, args.branchId);

  return {
    access,
    scope,
    clientId: args.clientId,
  };
}

function requirePortalScopedEntity<T>(
  entity: T | null | undefined,
  message: string
): T {
  if (!entity) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message,
    });
  }
  return entity;
}

function canDirectlyApplyPortalChanges(role: NonNullable<Awaited<ReturnType<typeof getUserById>>>["role"]) {
  return role === "admin" || role === "super_admin";
}

function canReviewPortalChanges(role: NonNullable<Awaited<ReturnType<typeof getUserById>>>["role"]) {
  return role === "admin" || role === "super_admin";
}

function serialisePortalDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function buildPortalTechnicianApprovalSnapshot(
  technician:
    | Awaited<ReturnType<typeof getPortalTechniciansForClient>>[number]
    | null
    | undefined
) {
  if (!technician) return null;
  return {
    name: technician.name,
    email: technician.email,
    phone: technician.phone ?? null,
    methods: technician.methods ?? [],
    level: technician.level,
    methodQualifications: technician.methodQualifications ?? [],
    clientBranchId: technician.clientBranchId ?? null,
    hasPcnQualification: technician.hasPcnQualification ?? false,
    certificateNumber: technician.certificateNumber ?? null,
    procedureStatus: technician.procedureStatus ?? null,
    pcnRenewalDate: serialisePortalDate(technician.pcnRenewalDate),
    internalAssessmentDate: serialisePortalDate(technician.internalAssessmentDate),
    eyeTestValidUntil: serialisePortalDate(technician.eyeTestValidUntil),
    notes: technician.notes ?? null,
  } satisfies Record<string, unknown>;
}

function buildPortalRequirementApprovalSnapshot(
  record:
    | Awaited<ReturnType<typeof getPortalRequirementMatrixForClient>>[number]
    | null
    | undefined
) {
  if (!record || !record.recordId) return null;
  return {
    recordId: record.recordId,
    technicianId: record.technicianId,
    technicianName: record.technicianName,
    definitionId: record.definitionId,
    definitionName: record.definitionName,
    status: record.status,
    issuedAt: serialisePortalDate(record.issuedAt),
    validUntil: serialisePortalDate(record.validUntil),
    notes: record.notes ?? null,
    customFieldValues: record.customFieldValues ?? {},
    latestDocumentName: record.latestDocumentName ?? null,
  } satisfies Record<string, unknown>;
}

function buildPortalDocumentApprovalSnapshot(
  document:
    | Awaited<ReturnType<typeof getPortalClientDocuments>>[number]
    | null
    | undefined
) {
  if (!document) return null;
  return {
    title: document.title,
    category: document.category,
    clientBranchId: document.clientBranchId ?? null,
    description: document.description ?? null,
    reviewDate: serialisePortalDate(document.reviewDate),
    validUntil: serialisePortalDate(document.validUntil),
    status: document.status,
    fileName: document.fileName,
    sourceFileName: document.sourceFileName ?? null,
    sourcePath: document.sourcePath ?? null,
    health: document.health,
  } satisfies Record<string, unknown>;
}

function buildPortalResourceApprovalSnapshot(
  resource:
    | Awaited<ReturnType<typeof getPortalResourcesForClient>>[number]
    | null
    | undefined
) {
  if (!resource) return null;
  return {
    title: resource.title,
    category: resource.category,
    clientBranchId: resource.clientBranchId ?? null,
    description: resource.description ?? null,
    resourceType: resource.resourceType,
    linkUrl: resource.linkUrl ?? null,
    fileName: resource.fileName ?? null,
    sortOrder: resource.sortOrder,
    active: resource.active,
  } satisfies Record<string, unknown>;
}

async function submitPortalApprovalRequest(
  ctx: { user: NonNullable<Awaited<ReturnType<typeof getUserById>>> },
  data: Parameters<typeof createPortalApprovalRequest>[0]
) {
  const request = await createPortalApprovalRequest(data);

  await logPortalAuditEvent(ctx as any, {
    action: "CREATE",
    entityType: "client_portal_approval",
    entityId: request.id,
    clientId: data.clientId,
    focus: "approvals",
    title: "Portal submission sent",
    description: request.summary,
    changes: {
      approvalEntityType: data.entityType,
      approvalAction: data.action,
      approvalStatus: "pending",
      submittedByUserId: data.submittedByUserId,
      summary: request.summary,
    },
  });

  try {
    const { notifyPortalApprovalSubmitted } = await import("../notifications");
    await notifyPortalApprovalSubmitted({
      requestId: request.id,
      clientId: data.clientId,
      summary: request.summary,
      submittedByUserId: data.submittedByUserId,
      submittedByName: ctx.user.name ?? ctx.user.email ?? null,
    });
  } catch (error) {
    console.warn("[Portal Approval] Failed to send submission notification:", error);
  }

  return request;
}

function parsePortalAuditChanges(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

function getPortalActivityEntityLabel(entityType: string) {
  switch (entityType) {
    case "client_portal_approval":
      return "Approval";
    case "client_portal_technician":
      return "Technician";
    case "client_portal_compliance":
      return "Compliance";
    case "client_portal_evidence":
      return "Evidence";
    case "client_portal_document":
      return "Client Document";
    case "client_portal_resource":
      return "Resource";
    case "client_portal_service_definition":
      return "Service Type";
    case "client_portal_service_request":
      return "Service Request";
    case "client_portal_assessment_guide":
      return "Assessment Guide";
    case "client_portal_branch":
      return "Client Branch";
    case "client_portal_comment":
      return "Request";
    case "client_portal_requirement_definition":
      return "Requirement Rule";
    case "client_portal_reminder_rules":
      return "Reminder Rule";
    case "client_portal_access":
      return "Access";
    default:
      return entityType
        .replace(/^client_portal_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (value) => value.toUpperCase());
  }
}

function getPortalActivityFocus(
  entityType: string,
  changes?: Record<string, unknown> | null
) {
  const explicitFocus =
    changes && typeof changes.focus === "string" && changes.focus.trim()
      ? changes.focus.trim()
      : null;
  if (explicitFocus) return explicitFocus;

  switch (entityType) {
    case "client_portal_approval":
      return "approvals";
    case "client_portal_technician":
    case "client_portal_compliance":
    case "client_portal_evidence":
    case "client_portal_requirement_definition":
      return "compliance";
    case "client_portal_document":
      return "documents";
    case "client_portal_resource":
      return "resources";
    case "client_portal_service_definition":
    case "client_portal_service_request":
      return "services";
    case "client_portal_assessment_guide":
      return "guidance";
    case "client_portal_branch":
      return "branches";
    case "client_portal_comment":
      return "comments";
    case "client_portal_reminder_rules":
      return "settings";
    case "client_portal_access":
      return "access";
    default:
      return "overview";
  }
}

async function logPortalAuditEvent(
  ctx: {
    req: {
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
    };
    user: NonNullable<Awaited<ReturnType<typeof getUserById>>>;
  },
  options: {
    action: "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT";
    entityType: string;
    entityId?: number | null;
    clientId: number;
    focus?: string;
    title: string;
    description?: string | null;
    changes?: Record<string, unknown> | null;
  }
) {
  const { ipAddress, userAgent } = getAuditRequestMeta(ctx);
  await logAuditEvent(
    ctx.user.id,
    options.action,
    options.entityType,
    options.entityId ?? options.clientId,
    {
      clientId: options.clientId,
      focus: options.focus ?? getPortalActivityFocus(options.entityType),
      title: options.title,
      description: options.description ?? null,
      ...(options.changes ?? {}),
    },
    ipAddress,
    userAgent
  );
}

export const clientPortalRouter = router({
  access: router({
    list: portalViewProcedure.query(async ({ ctx }) => {
      return getPortalAccessibleClientsForUser(ctx.user.id, ctx.user.role);
    }),

    assignableUsers: portalViewProcedure.query(async ({ ctx }) => {
      if (!["admin", "super_admin"].includes(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getPortalAssignableUsers();
    }),

    assignments: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        return getPortalClientAssignments(input.clientId);
      }),

    emailDeliveryStatus: portalViewProcedure.query(async () => ({
      configured: isEmailDeliveryConfigured(),
    })),

    createUser: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1),
          email: z.string().email(),
          password: z.string().min(1),
          accessLevel: portalAccessLevelSchema,
          receiveReminders: z.boolean().optional(),
          branchIds: z.array(z.number().int().positive()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const branches = await getPortalBranchesForClient(input.clientId);
        const validBranchIds = new Set(branches.map((branch) => branch.id));
        const branchIds = Array.from(
          new Set((input.branchIds ?? []).filter((branchId) => validBranchIds.has(branchId)))
        );

        const passwordValidation = validatePassword(input.password);
        if (!passwordValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: passwordValidation.errors.join(" "),
          });
        }

        const createdUser = await createAppUser({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          role: "user",
          password: input.password.trim(),
          mustChangePassword: true,
        });
        await upsertPortalClientAssignment({
          clientId: input.clientId,
          userId: createdUser.id,
          accessLevel: input.accessLevel,
          receiveReminders: input.receiveReminders,
        });
        await savePortalUserBranchAssignments({
          clientId: input.clientId,
          userId: createdUser.id,
          branchIds,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_access",
          entityId: createdUser.id,
          clientId: input.clientId,
          focus: "access",
          title: "Client login created",
          description: `${createdUser.name ?? createdUser.email ?? `User ${createdUser.id}`} was created for this client portal.`,
          changes: {
            assignedUserId: createdUser.id,
            accessLevel: input.accessLevel,
            receiveReminders: input.receiveReminders ?? true,
            branchIds,
            mustChangePassword: true,
          },
        });
        return createdUser;
      }),

    assignUser: portalEditProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          accessLevel: portalAccessLevelSchema,
          receiveReminders: z.boolean().optional(),
          branchIds: z.array(z.number().int().positive()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const isSystemAdmin = isPortalSystemAdmin(ctx.user);
        const existingAssignments = await getPortalClientAssignments(input.clientId);
        const existingAssignment = existingAssignments.find((entry) => entry.userId === input.userId);
        if (!isSystemAdmin && !existingAssignment) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client managers can only update users already allocated to this client.",
          });
        }
        if (!isSystemAdmin && existingAssignment?.userRole !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client managers can only manage standard client logins.",
          });
        }
        const branches = await getPortalBranchesForClient(input.clientId);
        const validBranchIds = new Set(branches.map((branch) => branch.id));
        const branchIds = Array.from(
          new Set((input.branchIds ?? []).filter((branchId) => validBranchIds.has(branchId)))
        );
        const result = await upsertPortalClientAssignment({
          clientId: input.clientId,
          userId: input.userId,
          accessLevel: input.accessLevel,
          receiveReminders: input.receiveReminders,
        });
        await savePortalUserBranchAssignments({
          clientId: input.clientId,
          userId: input.userId,
          branchIds,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_access",
          entityId: input.userId,
          clientId: input.clientId,
          focus: "access",
          title: "Client portal access updated",
          description: `Access for user #${input.userId} is now ${input.accessLevel}.`,
          changes: {
            assignedUserId: input.userId,
            accessLevel: input.accessLevel,
            receiveReminders: input.receiveReminders ?? true,
            branchIds,
          },
        });
        return result;
      }),

    removeUser: portalDeleteProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const isSystemAdmin = isPortalSystemAdmin(ctx.user);
        const assignments = await getPortalClientAssignments(input.clientId);
        const assignment = assignments.find((entry) => entry.id === input.id);
        if (!assignment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client user allocation not found." });
        }
        if (!isSystemAdmin && assignment.userRole !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client managers can only remove standard client logins.",
          });
        }
        await deletePortalClientAssignment(input.id);
        await logPortalAuditEvent(ctx as any, {
          action: "DELETE",
          entityType: "client_portal_access",
          entityId: input.id,
          clientId: input.clientId,
          focus: "access",
          title: "Client portal access removed",
          description: `A user allocation was removed from this client portal.`,
        });
        return getPortalClientAssignments(input.clientId);
      }),

    setLoginEnabled: portalEditProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          loginEnabled: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const isSystemAdmin = isPortalSystemAdmin(ctx.user);
        const assignments = await getPortalClientAssignments(input.clientId);
        const assignment = assignments.find((entry) => entry.userId === input.userId);
        if (!assignment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client user allocation not found." });
        }
        if (!isSystemAdmin && assignment.userRole !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client managers can only suspend or reactivate standard client logins.",
          });
        }

        const updatedUser = await setUserLoginEnabled(input.userId, input.loginEnabled);
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_access",
          entityId: input.userId,
          clientId: input.clientId,
          focus: "access",
          title: input.loginEnabled ? "Client login reactivated" : "Client login suspended",
          description: `${updatedUser.name ?? updatedUser.email ?? `User ${updatedUser.id}`} login access was ${input.loginEnabled ? "restored" : "suspended"}.`,
          changes: {
            userId: input.userId,
            loginEnabled: input.loginEnabled,
          },
        });
        return getPortalClientAssignments(input.clientId);
      }),

    resetPassword: portalEditProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          password: z.string().min(8),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const isSystemAdmin = isPortalSystemAdmin(ctx.user);
        const assignments = await getPortalClientAssignments(input.clientId);
        const assignment = assignments.find((entry) => entry.userId === input.userId);
        if (!assignment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client user allocation not found." });
        }
        if (!isSystemAdmin && assignment.userRole !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Client managers can only reset passwords for standard client logins.",
          });
        }

        await updateAppUserWithAuth(input.userId, {
          password: input.password.trim(),
          mustChangePassword: true,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_access",
          entityId: input.userId,
          clientId: input.clientId,
          focus: "access",
          title: "Client password reset",
          description: `${assignment.userName ?? assignment.userEmail ?? `User ${assignment.userId}`} was issued a new temporary password.`,
          changes: {
            userId: input.userId,
            mustChangePassword: true,
          },
        });
        return getPortalClientAssignments(input.clientId);
      }),

    sendCredentialsEmail: portalEditProcedure
      .input(
        z.object({
          clientId: z.number(),
          userId: z.number(),
          password: z.string().min(8),
          mode: z.enum(["created", "reset"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const isSystemAdmin = isPortalSystemAdmin(ctx.user);
        const assignments = await getPortalClientAssignments(input.clientId);
        const assignment = assignments.find((entry) => entry.userId === input.userId);
        if (!assignment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client user allocation not found." });
        }
        if (!isSystemAdmin && assignment.userRole !== "user") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Client managers can only send login emails for standard client logins.",
          });
        }
        if (!assignment.userEmail?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This client user does not have an email address on record.",
          });
        }

        const client = (await getAllLevelIIIClients({ includeLinkedBranchClients: true })).find(
          (entry) => entry.id === input.clientId
        );
        const companyName = client?.companyName?.trim() || "TextPoint Client Portal";
        const delivery = await sendPortalCredentialEmail({
          recipientEmail: assignment.userEmail.trim(),
          recipientName: assignment.userName,
          companyName,
          temporaryPassword: input.password.trim(),
          mode: input.mode,
        });

        if (delivery.sent) {
          await logPortalAuditEvent(ctx as any, {
            action: "UPDATE",
            entityType: "client_portal_access",
            entityId: input.userId,
            clientId: input.clientId,
            focus: "access",
            title:
              input.mode === "reset"
                ? "Client password email sent"
                : "Client login email sent",
            description: `${assignment.userName ?? assignment.userEmail ?? `User ${assignment.userId}`} was emailed their temporary client portal credentials.`,
            changes: {
              userId: input.userId,
              emailSent: true,
              mode: input.mode,
            },
          });
        }

        return delivery;
      }),
  }),

  branches: router({
    list: portalViewProcedure
      .input(
        z.object({
          clientId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId);
        return scope.accessibleBranches;
      }),

    importCandidates: portalViewProcedure
      .input(
        z.object({
          clientId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        return getPortalBranchImportCandidates(input.clientId);
      }),

    create: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1),
          code: z.string().optional().nullable(),
          description: z.string().optional().nullable(),
          active: z.boolean().optional(),
          sortOrder: z.number().int().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const result = await createPortalClientBranch({
          clientId: input.clientId,
          name: input.name.trim(),
          code: input.code?.trim() || null,
          description: input.description?.trim() || null,
          active: input.active ?? true,
          sortOrder: input.sortOrder ?? 0,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_branch",
          clientId: input.clientId,
          focus: "branches",
          title: "Client branch added",
          description: `${input.name.trim()} was added to this client portal.`,
          changes: {
            branchName: input.name.trim(),
            branchCode: input.code?.trim() || null,
            active: input.active ?? true,
          },
        });
        return result;
      }),

    importExistingClients: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          sourceClientIds: z.array(z.number().int().positive()).min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const accessibleClients = await getPortalAccessibleClientsForUser(ctx.user.id, ctx.user.role);
        const accessibleClientIds = new Set(accessibleClients.map((client) => client.id));
        const disallowedSourceClientId = input.sourceClientIds.find(
          (sourceClientId) => !accessibleClientIds.has(sourceClientId)
        );
        if (disallowedSourceClientId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to one or more source clients selected for import.",
          });
        }
        const result = await importPortalBranchesFromExistingClients({
          headOfficeClientId: input.clientId,
          sourceClientIds: input.sourceClientIds,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_branch",
          clientId: input.clientId,
          focus: "branches",
          title: "Existing clients converted into branches",
          description: `${result.branchCount} existing client record(s) were linked under ${result.headOfficeName}.`,
          changes: {
            sourceClientIds: input.sourceClientIds,
            branchCount: result.branchCount,
            createdBranches: result.createdBranches,
          },
        });
        return result;
      }),

    update: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          data: z.object({
            name: z.string().min(1).optional(),
            code: z.string().optional().nullable(),
            description: z.string().optional().nullable(),
            active: z.boolean().optional(),
            sortOrder: z.number().int().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const branches = await getPortalBranchesForClient(input.clientId);
        requirePortalScopedEntity(
          branches.find((branch) => branch.id === input.id),
          "You do not have access to the selected client branch."
        );
        const result = await updatePortalClientBranch(input.id, {
          name: input.data.name?.trim(),
          code:
            input.data.code === undefined ? undefined : input.data.code?.trim() || null,
          description:
            input.data.description === undefined
              ? undefined
              : input.data.description?.trim() || null,
          active: input.data.active,
          sortOrder:
            input.data.sortOrder === undefined ? undefined : input.data.sortOrder ?? 0,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_branch",
          entityId: input.id,
          clientId: input.clientId,
          focus: "branches",
          title: "Client branch updated",
          description: `${input.data.name?.trim() || "A client branch"} was updated.`,
          changes: {
            branchId: input.id,
            ...input.data,
          },
        });
        return result;
      }),

    delete: portalDeleteProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const branches = await getPortalBranchesForClient(input.clientId);
        requirePortalScopedEntity(
          branches.find((branch) => branch.id === input.id),
          "You do not have access to the selected client branch."
        );
        const result = await deletePortalClientBranch(input.id);
        await logPortalAuditEvent(ctx as any, {
          action: "DELETE",
          entityType: "client_portal_branch",
          entityId: input.id,
          clientId: input.clientId,
          focus: "branches",
          title: "Client branch removed",
          description: "A client branch was removed from this portal scope.",
          changes: {
            branchId: input.id,
          },
        });
        return result;
      }),
  }),

  approvals: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        return getPortalApprovalRequests(input.clientId);
      }),

    review: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          decision: z.enum(["approved", "rejected"]),
          reviewNotes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await getPortalAuthScope({
          ctx: ctx as any,
          clientId: input.clientId,
          mode: "manage",
        });
        if (!canReviewPortalChanges(ctx.user.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only internal admins can review client-submitted portal changes.",
          });
        }
        const requests = await getPortalApprovalRequests(input.clientId);
        const targetRequest = requirePortalScopedEntity(
          requests.find((request) => request.id === input.id),
          "You do not have access to the selected approval request."
        );
        const result = await reviewPortalApprovalRequest({
          id: input.id,
          clientId: input.clientId,
          reviewerUserId: ctx.user.id,
          decision: input.decision,
          reviewNotes: input.reviewNotes?.trim() || null,
        });
        if (
          targetRequest &&
          targetRequest.submittedByUserId &&
          targetRequest.submittedByUserId !== ctx.user.id
        ) {
          try {
            const { notifyPortalApprovalReviewed } = await import("../notifications");
            await notifyPortalApprovalReviewed({
              requestId: input.id,
              clientId: input.clientId,
              submittedByUserId: targetRequest.submittedByUserId,
              decision: input.decision,
              summary: targetRequest.summary,
              reviewedByName: ctx.user.name ?? ctx.user.email ?? null,
              reviewNotes: input.reviewNotes?.trim() || null,
            });
          } catch (error) {
            console.warn("[Portal Approval] Failed to send review notification:", error);
          }
        }
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_approval",
          entityId: input.id,
          clientId: input.clientId,
          focus: "approvals",
          title:
            input.decision === "approved"
              ? "Portal submission approved"
              : "Portal submission rejected",
          description: targetRequest?.summary ?? "A client portal submission was reviewed.",
          changes: {
            approvalStatus: input.decision,
            reviewNotes: input.reviewNotes?.trim() || null,
            approvalEntityType: targetRequest?.entityType ?? null,
            approvalAction: targetRequest?.action ?? null,
          },
        });
        return result;
      }),
  }),

  settings: router({
    getReminderSettings: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        return getPortalClientReminderSettings(input.clientId);
      }),

    updateReminderSettings: portalEditProcedure
      .input(
        z.object({
          clientId: z.number(),
          data: portalReminderSettingsSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const result = await updatePortalClientReminderSettings(input.clientId, input.data);
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_reminder_rules",
          clientId: input.clientId,
          focus: "settings",
          title: "Reminder rules updated",
          description: "The client portal reminder and escalation settings were changed.",
          changes: input.data,
        });
        return result;
      }),
  }),

  activity: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");

        const items = await getAuditTrail(undefined, 400);
        const hiddenFocuses = ["access", "settings"] as const;

        return items
          .map((item) => {
            if (!item.entityType.startsWith("client_portal_")) {
              return null;
            }

            const changes = parsePortalAuditChanges(item.changes);
            const clientId = Number(changes?.clientId ?? 0);
            if (!Number.isFinite(clientId) || clientId !== input.clientId) {
              return null;
            }

            const focus = getPortalActivityFocus(item.entityType, changes);
            if (!canReviewPortalChanges(ctx.user.role) && hiddenFocuses.includes(focus as any)) {
              return null;
            }

            const title =
              typeof changes?.title === "string" && changes.title.trim()
                ? changes.title.trim()
                : `${getPortalActivityEntityLabel(item.entityType)} ${item.action.toLowerCase()}`;
            const description =
              typeof changes?.description === "string" && changes.description.trim()
                ? changes.description.trim()
                : item.changesSummary;

            return {
              id: item.id,
              createdAt: item.createdAt,
              actorName: item.actorName,
              actorEmail: item.actorEmail,
              action: item.action,
              entityType: item.entityType,
              entityLabel: getPortalActivityEntityLabel(item.entityType),
              focus,
              title,
              description,
              status: item.status,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          )
          .slice(0, 40);
      }),
  }),

  services: router({
    listDefinitions: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        return getPortalServiceDefinitions(input.clientId);
      }),

    createDefinition: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          title: z.string().min(1),
          category: z.string().min(1),
          description: z.string().optional().nullable(),
          instructions: z.string().optional().nullable(),
          active: z.boolean().optional(),
          sortOrder: z.number().int().optional().nullable(),
          config: portalServiceDefinitionConfigSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const result = await createPortalServiceDefinition({
          clientId: input.clientId,
          title: input.title.trim(),
          category: input.category.trim(),
          description: input.description?.trim() || null,
          instructions: input.instructions?.trim() || null,
          active: input.active ?? true,
          sortOrder: input.sortOrder ?? 0,
          config: input.config ?? {},
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_service_definition",
          clientId: input.clientId,
          focus: "services",
          title: "Service type added",
          description: `${input.title.trim()} is now available inside the client portal.`,
          changes: {
            title: input.title.trim(),
            category: input.category.trim(),
          },
        });
        return result;
      }),

    updateDefinition: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          data: z.object({
            title: z.string().min(1).optional(),
            category: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            instructions: z.string().optional().nullable(),
            active: z.boolean().optional(),
            sortOrder: z.number().int().optional().nullable(),
            config: portalServiceDefinitionConfigSchema.optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const definitions = await getPortalServiceDefinitions(input.clientId);
        requirePortalScopedEntity(
          definitions.find((definition) => definition.id === input.id),
          "You do not have access to the selected service definition."
        );
        const result = await updatePortalServiceDefinition(input.id, {
          title: input.data.title?.trim(),
          category: input.data.category?.trim(),
          description:
            input.data.description === undefined
              ? undefined
              : input.data.description?.trim() || null,
          instructions:
            input.data.instructions === undefined
              ? undefined
              : input.data.instructions?.trim() || null,
          active: input.data.active,
          sortOrder:
            input.data.sortOrder === undefined ? undefined : input.data.sortOrder ?? 0,
          config: input.data.config,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_service_definition",
          entityId: input.id,
          clientId: input.clientId,
          focus: "services",
          title: "Service type updated",
          description: `${input.data.title?.trim() || "A service type"} was updated.`,
          changes: {
            serviceDefinitionId: input.id,
            ...input.data,
          },
        });
        return result;
      }),

    generateRequestPack: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          requestId: z.number(),
          branchId: z.number().optional().nullable(),
          generatedStatus: generatedDocumentStatusSchema.optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        const scopedRequests = await getPortalServiceRequestsForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        const request = scopedRequests.find((entry) => entry.id === input.requestId) ?? null;
        if (!request) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected portal request.",
          });
        }
        if (!request.technicianId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Link a technician to this request before generating the draft pack.",
          });
        }

        const allDocuments = await getAllDocuments();
        const templates = LEVEL_III_REQUEST_PACK_TEMPLATE_KEYS.map((templateKey) =>
          allDocuments.find((document) => {
            const metadata = getDocumentMetadata(document.tags);
            return (
              metadata.kind === "template" &&
              String(metadata.templateKey || "") === templateKey &&
              String(metadata.templateStatus || "Draft") !== "Archived"
            );
          })
        ).filter((document): document is NonNullable<typeof document> => Boolean(document));
        const foundTemplateKeys = new Set(
          templates.map((template) => String(getDocumentMetadata(template.tags).templateKey || ""))
        );
        const missingTemplateKeys = LEVEL_III_REQUEST_PACK_TEMPLATE_KEYS.filter(
          (templateKey) => !foundTemplateKeys.has(templateKey)
        );
        if (missingTemplateKeys.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `The Level III request pack is not ready yet. Missing active templates: ${missingTemplateKeys.join(", ")}.`,
          });
        }

        const context = await buildLevelIIIDocumentContextFromRequest({
          clientId: input.clientId,
          requestId: input.requestId,
        });
        const documents = [];
        for (const template of templates) {
          documents.push(
            await createGeneratedLevelIIIRequestDocument({
              template,
              context,
              requestId: input.requestId,
              generatedStatus: input.generatedStatus ?? "Draft",
            })
          );
        }

        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_service_request",
          entityId: input.requestId,
          clientId: input.clientId,
          focus: "services",
          title: "Level III draft pack generated",
          description: `${request.title} generated ${documents.length} draft document(s) from the standard Level III templates.`,
          changes: {
            requestId: input.requestId,
            technicianId: request.technicianId,
            generatedStatus: input.generatedStatus ?? "Draft",
            templateKeys: [...LEVEL_III_REQUEST_PACK_TEMPLATE_KEYS],
            documentIds: documents.map((document) => document.id),
          },
        });

        return {
          count: documents.length,
          documents,
          requestId: input.requestId,
          technicianId: request.technicianId,
          templateKeys: [...LEVEL_III_REQUEST_PACK_TEMPLATE_KEYS],
        };
      }),

    requestsList: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalServiceRequestsForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    createRequest: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          clientBranchId: z.number().int().positive().optional().nullable(),
          serviceDefinitionId: z.number().int().positive().optional().nullable(),
          technicianId: z.number().int().positive().optional().nullable(),
          title: z.string().min(1),
          requestType: z.string().min(1),
          preferredDate: z.date().optional().nullable(),
          techniques: z.array(z.string().min(1)).optional(),
          details: z.string().optional().nullable(),
          requestedDocuments: z.array(z.string().min(1)).optional(),
          supportingDocuments: z.array(portalServiceRequestSupportingDocumentSchema).optional(),
          metadata: z.record(z.string(), z.unknown()).optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const auth = await getPortalAuthScope({
          ctx: ctx as any,
          clientId: input.clientId,
          branchId: input.clientBranchId ?? null,
          mode: "edit",
        });
        const scope = auth.scope!;
        const technicians = await getPortalTechniciansForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        if (
          input.technicianId &&
          !technicians.some((technician) => technician.id === input.technicianId)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected technician.",
          });
        }

        const selectedTechnician =
          input.technicianId && technicians.some((technician) => technician.id === input.technicianId)
            ? technicians.find((technician) => technician.id === input.technicianId) ?? null
            : null;
        const requirementDefinitions = selectedTechnician
          ? await getPortalRequirementDefinitionsForClient(input.clientId)
          : [];
        const serviceDefinitions = await getPortalServiceDefinitions(input.clientId);
        if (
          input.serviceDefinitionId &&
          !serviceDefinitions.some((definition) => definition.id === input.serviceDefinitionId)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected service definition.",
          });
        }
        const documentAutomationRules = isLikelyLevelIIIAssessmentRequest({
          title: input.title,
          requestType: input.requestType,
          techniques: input.techniques ?? [],
        })
          ? buildLevelIIIDocumentAutomationRules({
              technicianName: selectedTechnician?.name ?? null,
              techniques: input.techniques ?? [],
              methodQualifications: Array.isArray(selectedTechnician?.methodQualifications)
                ? selectedTechnician.methodQualifications
                : [],
              requestedDocuments: input.requestedDocuments ?? [],
            })
          : [];
        const autoRequestedDocuments =
          documentAutomationRules.length > 0
            ? documentAutomationRules.map((rule) => rule.label)
            : (input.requestedDocuments ?? []);

        const supportingDocuments = await Promise.all(
          (input.supportingDocuments ?? []).map(async (document, index) => {
            const label = document.label.trim();
            if (!label) return null;
            const matchingRule = findLevelIIIDocumentAutomationRuleByLabel(
              documentAutomationRules,
              label
            );

            const dataUrl = document.fileDataUrl?.trim() || "";
            const suppliedFileName =
              document.fileName?.trim() || `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "supporting-document"}-${index + 1}`;
            const storedFile = dataUrl
              ? await stagePortalApprovalFile({
                  clientId: input.clientId,
                  scope: matchingRule?.storagePath ?? "service-requests",
                  fileName: matchingRule?.suggestedFileName ?? suppliedFileName,
                  fileDataUrl: dataUrl,
                })
              : null;
            const matchingRequirementDefinition = selectedTechnician
              ? matchPortalRequirementDefinitionForDocument(
                  matchingRule?.label ?? label,
                  requirementDefinitions
                )
              : null;

            return {
              label,
              note: document.note?.trim() || null,
              fileName: storedFile?.fileName ?? null,
              fileUrl: storedFile?.fileUrl ?? null,
              fileKey: storedFile?.fileKey ?? null,
              contentType: storedFile?.contentType ?? null,
              classifiedLabel: matchingRule?.label ?? label,
              storagePath: matchingRule?.storagePath ?? "service-requests",
              suggestedFileName: matchingRule?.suggestedFileName ?? suppliedFileName,
              linkedRequirementDefinitionId: matchingRequirementDefinition?.id ?? null,
              linkedRequirementDefinitionName: matchingRequirementDefinition?.name ?? null,
            };
          })
        );

        const requestId = await createPortalServiceRequest({
          clientId: input.clientId,
          clientBranchId: input.clientBranchId ?? null,
          serviceDefinitionId: input.serviceDefinitionId ?? null,
          userId: ctx.user.id,
          technicianId: input.technicianId ?? null,
          title: input.title.trim(),
          requestType: input.requestType.trim(),
          preferredDate: input.preferredDate ?? null,
          techniques: input.techniques ?? [],
          details: input.details?.trim() || null,
          requestedDocuments: autoRequestedDocuments,
          metadata: {
            ...(input.metadata ?? {}),
            supportingDocuments: supportingDocuments.filter(
              (document): document is NonNullable<typeof document> => Boolean(document)
            ),
          },
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_service_request",
          entityId: requestId || input.clientId,
          clientId: input.clientId,
          focus: "services",
          title: "Service request submitted",
          description: `${input.title.trim()} was submitted through the client portal.`,
          changes: {
            requestType: input.requestType.trim(),
            clientBranchId: input.clientBranchId ?? null,
            technicianId: input.technicianId ?? null,
            techniques: input.techniques ?? [],
          },
        });
        const uploadedLabels = new Set(
          supportingDocuments
            .filter((document): document is NonNullable<typeof document> => Boolean(document?.fileUrl))
            .map((document) => document.label.trim().toLowerCase())
        );
        const outstandingUploadLabels = autoRequestedDocuments.filter(
          (label) => !uploadedLabels.has(label.trim().toLowerCase())
        );
        if (outstandingUploadLabels.length > 0) {
          const assignments = await getPortalClientAssignments(input.clientId);
          const reminderSettings = await getPortalClientReminderSettings(input.clientId);
          const recipientIds = Array.from(
            new Set(
              assignments
                .filter(
                  (assignment) =>
                    assignment.receiveReminders &&
                    (assignment.accessLevel === "manager" || reminderSettings.sendToAssignedUsers)
                )
                .map((assignment) => assignment.userId)
            )
          ).filter((userId) => userId !== ctx.user.id);
          if (recipientIds.length > 0) {
            const { broadcastNotification } = await import("../notifications");
            await broadcastNotification(recipientIds, {
              type: "system_alert",
              title: `Assessment pack missing uploads: ${input.title.trim()}`,
              message: `${input.title.trim()} is waiting on ${outstandingUploadLabels.join(", ")}.`,
              entityType: "client_portal_service_request",
              entityId: requestId || undefined,
              actionUrl: "/level-iii",
              priority: "high",
              metadata: {
                clientId: input.clientId,
                requestId,
                outstandingUploadLabels,
              },
            });
          }
        }
        const linkedRequirementUploads = selectedTechnician
          ? supportingDocuments
              .filter(
                (
                  document
                ): document is NonNullable<typeof document> & {
                  linkedRequirementDefinitionId: number;
                  fileKey: string;
                  fileUrl: string;
                  fileName: string;
                } =>
                  Boolean(
                    document?.linkedRequirementDefinitionId &&
                      document?.fileKey &&
                      document?.fileUrl &&
                      document?.fileName
                  )
              )
          : [];
        const createdRequirementNames: string[] = [];
        for (const document of linkedRequirementUploads) {
          const record = await upsertPortalTechnicianRequirement({
            technicianId: selectedTechnician!.id,
            definitionId: document.linkedRequirementDefinitionId,
            status: "pending_review",
            notes:
              document.note ||
              `Auto-linked from assessment request: ${input.title.trim()}`,
            uploadedByUserId: ctx.user.id,
          });
          await uploadPortalRequirementDocument({
            clientId: input.clientId,
            technicianRequirementId: Number((record as any)?.id ?? 0),
            uploadedByUserId: ctx.user.id,
            storedFile: {
              fileName: document.fileName,
              fileKey: document.fileKey,
              fileUrl: document.fileUrl,
              contentType: document.contentType ?? null,
            },
          });
          if (document.linkedRequirementDefinitionName) {
            createdRequirementNames.push(document.linkedRequirementDefinitionName);
          }
        }
        if (createdRequirementNames.length > 0) {
          const linkedTechnicianId = selectedTechnician?.id ?? null;
          const assignments = await getPortalClientAssignments(input.clientId);
          const recipientIds = Array.from(
            new Set(
              assignments
                .filter((assignment) => assignment.receiveReminders)
                .map((assignment) => assignment.userId)
            )
          ).filter((userId) => userId !== ctx.user.id);
          if (recipientIds.length > 0) {
            const { broadcastNotification } = await import("../notifications");
            await broadcastNotification(recipientIds, {
              type: "system_alert",
              title: `Compliance items created: ${input.title.trim()}`,
              message: `${createdRequirementNames.join(", ")} moved into technician compliance as pending review evidence.`,
              entityType: "client_portal_compliance",
              entityId: linkedTechnicianId ?? undefined,
              actionUrl: "/client-portal",
              priority: "normal",
              metadata: {
                clientId: input.clientId,
                technicianId: linkedTechnicianId,
                requestId,
                createdRequirementNames,
              },
            });
          }
        }
        return getPortalServiceRequestsForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    updateRequestStatus: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          branchId: z.number().optional().nullable(),
          status: portalServiceRequestStatusSchema,
          internalNotes: z.string().optional().nullable(),
          metadata: portalServiceRequestManagementMetadataSchema.optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { scope } = await getPortalAuthScope({
          ctx: ctx as any,
          clientId: input.clientId,
          branchId: input.branchId,
          mode: "manage",
        });
        const scopedRequests = await getPortalServiceRequestsForClient(input.clientId, {
          branchIds: scope?.scopedBranchIds,
        });
        requirePortalScopedEntity(
          scopedRequests.find((request) => request.id === input.id),
          "You do not have access to the selected portal request."
        );
        const result = await updatePortalServiceRequestStatus(input.id, {
          status: input.status,
          internalNotes: input.internalNotes?.trim() || null,
          metadata:
            input.metadata === undefined
              ? undefined
              : {
                  clientVisibleUpdate: input.metadata?.clientVisibleUpdate?.trim() || null,
                  internalOwner: input.metadata?.internalOwner?.trim() || null,
                  plannedAction: input.metadata?.plannedAction?.trim() || null,
                  confirmedDate: input.metadata?.confirmedDate ?? null,
                  linkedActivityId: input.metadata?.linkedActivityId ?? null,
                },
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_service_request",
          entityId: input.id,
          clientId: input.clientId,
          focus: "services",
          title: "Service request updated",
          description: `A portal service request moved to ${input.status.replace(/_/g, " ")}.`,
          changes: {
            status: input.status,
            internalNotes: input.internalNotes?.trim() || null,
            metadata:
              input.metadata === undefined
                ? undefined
                : {
                    clientVisibleUpdate: input.metadata?.clientVisibleUpdate?.trim() || null,
                    internalOwner: input.metadata?.internalOwner?.trim() || null,
                    plannedAction: input.metadata?.plannedAction?.trim() || null,
                    confirmedDate: input.metadata?.confirmedDate ?? null,
                    linkedActivityId: input.metadata?.linkedActivityId ?? null,
                  },
          },
        });
        const scopedBranchIds = scope?.scopedBranchIds ?? [];
        return result.filter(
          (entry) =>
            !entry.clientBranchId ||
            scopedBranchIds.includes(Number(entry.clientBranchId))
        );
      }),
  }),

  guides: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalAssessmentGuidesForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    create: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          clientBranchId: z.number().int().positive().optional().nullable(),
          title: z.string().min(1),
          techniqueName: z.string().min(1),
          description: z.string().optional().nullable(),
          bringItems: z.array(z.string().min(1)).optional(),
          companyItems: z.array(z.string().min(1)).optional(),
          active: z.boolean().optional(),
          sortOrder: z.number().int().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        await getPortalBranchScope(ctx as any, input.clientId, input.clientBranchId ?? null);
        const result = await createPortalAssessmentGuide({
          clientId: input.clientId,
          clientBranchId: input.clientBranchId ?? null,
          title: input.title.trim(),
          techniqueName: input.techniqueName.trim(),
          description: input.description?.trim() || null,
          bringItems: input.bringItems ?? [],
          companyItems: input.companyItems ?? [],
          active: input.active ?? true,
          sortOrder: input.sortOrder ?? 0,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_assessment_guide",
          clientId: input.clientId,
          focus: "guidance",
          title: "Assessment guide added",
          description: `${input.techniqueName.trim()} guidance is now available in the portal.`,
          changes: {
            guideTitle: input.title.trim(),
            techniqueName: input.techniqueName.trim(),
            clientBranchId: input.clientBranchId ?? null,
          },
        });
        return result;
      }),

    update: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          data: z.object({
            clientBranchId: z.number().int().positive().optional().nullable(),
            title: z.string().min(1).optional(),
            techniqueName: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            bringItems: z.array(z.string().min(1)).optional(),
            companyItems: z.array(z.string().min(1)).optional(),
            active: z.boolean().optional(),
            sortOrder: z.number().int().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const scope = await getPortalBranchScope(
          ctx as any,
          input.clientId,
          input.data.clientBranchId ?? null
        );
        const guides = await getPortalAssessmentGuidesForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        requirePortalScopedEntity(
          guides.find((guide) => guide.id === input.id),
          "You do not have access to the selected assessment guide."
        );
        const result = await updatePortalAssessmentGuide(input.id, {
          clientBranchId:
            input.data.clientBranchId === undefined
              ? undefined
              : input.data.clientBranchId ?? null,
          title: input.data.title?.trim(),
          techniqueName: input.data.techniqueName?.trim(),
          description:
            input.data.description === undefined
              ? undefined
              : input.data.description?.trim() || null,
          bringItems: input.data.bringItems,
          companyItems: input.data.companyItems,
          active: input.data.active,
          sortOrder:
            input.data.sortOrder === undefined ? undefined : input.data.sortOrder ?? 0,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_assessment_guide",
          entityId: input.id,
          clientId: input.clientId,
          focus: "guidance",
          title: "Assessment guide updated",
          description: `${input.data.techniqueName?.trim() || "An assessment guide"} was updated.`,
          changes: {
            guideId: input.id,
            ...input.data,
          },
        });
        return result;
      }),
  }),

  dashboard: router({
    get: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalDashboardForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),
  }),

  technicians: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalTechniciansForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    create: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1),
          email: z.string().email(),
          phone: z.string().optional().nullable(),
          methods: z.array(z.string().min(1)).min(1),
          level: z.string().min(1),
          methodQualifications: z
            .array(levelIIITechnicianMethodQualificationSchema)
            .min(1),
          hasPcnQualification: z.boolean().optional(),
          certificateNumber: z.string().optional().nullable(),
          procedureStatus: z.string().optional().nullable(),
          pcnRenewalDate: z.date().optional().nullable(),
          internalAssessmentDate: z.date().optional().nullable(),
          eyeTestValidUntil: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
          clientBranchId: z.number().int().positive().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        await getPortalBranchScope(ctx as any, input.clientId, input.clientBranchId);
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "technician",
            action: "create",
            summary: `Create technician: ${input.name.trim()}`.slice(0, 255),
            payload: {
              action: "create",
              data: {
                name: input.name.trim(),
                email: input.email.trim().toLowerCase(),
                phone: input.phone?.trim() || null,
                methods: input.methods.map((method) => method.trim()),
                level: input.level.trim(),
                methodQualifications: input.methodQualifications.map((entry) => ({
                  method: entry.method.trim(),
                  level: entry.level.trim(),
                })),
                hasPcnQualification: input.hasPcnQualification ?? false,
                certificateNumber: input.certificateNumber?.trim() || null,
                procedureStatus: input.procedureStatus?.trim() || null,
                pcnRenewalDate: input.pcnRenewalDate
                  ? input.pcnRenewalDate.toISOString().slice(0, 10)
                  : null,
                internalAssessmentDate: input.internalAssessmentDate
                  ? input.internalAssessmentDate.toISOString().slice(0, 10)
                  : null,
                eyeTestValidUntil: input.eyeTestValidUntil
                  ? input.eyeTestValidUntil.toISOString().slice(0, 10)
                  : null,
                notes: input.notes?.trim() || null,
                clientBranchId: input.clientBranchId ?? null,
              },
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const createdTechnician = await createLevelIIITechnician({
          ...input,
          method: input.methods.join(", "),
          phone: input.phone?.trim() || null,
          certificateNumber: input.certificateNumber?.trim() || null,
          procedureStatus: input.procedureStatus?.trim() || null,
          notes: input.notes?.trim() || null,
          clientBranchId: input.clientBranchId ?? null,
        } as any);
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_technician",
          entityId: Number((createdTechnician as any)?.id ?? 0) || input.clientId,
          clientId: input.clientId,
          focus: "compliance",
          title: "Technician added",
          description: `${input.name.trim()} was added to the Level III portal.`,
          changes: {
            technicianName: input.name.trim(),
            level: input.level.trim(),
            methods: input.methods.map((method) => method.trim()),
            methodQualifications: input.methodQualifications.map((entry) => ({
              method: entry.method.trim(),
              level: entry.level.trim(),
            })),
            clientBranchId: input.clientBranchId ?? null,
          },
        });
        return createdTechnician;
      }),

    update: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          data: z.object({
            name: z.string().min(1).optional(),
            email: z.string().email().optional(),
            phone: z.string().optional().nullable(),
            methods: z.array(z.string().min(1)).min(1).optional(),
            level: z.string().min(1).optional(),
            methodQualifications: z
              .array(levelIIITechnicianMethodQualificationSchema)
              .min(1)
              .optional(),
            hasPcnQualification: z.boolean().optional(),
            certificateNumber: z.string().optional().nullable(),
            procedureStatus: z.string().optional().nullable(),
            pcnRenewalDate: z.date().optional().nullable(),
            internalAssessmentDate: z.date().optional().nullable(),
            eyeTestValidUntil: z.date().optional().nullable(),
            notes: z.string().optional().nullable(),
            clientBranchId: z.number().int().positive().optional().nullable(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const accessibleScope = await getPortalBranchScope(ctx as any, input.clientId);
        await getPortalBranchScope(
          ctx as any,
          input.clientId,
          input.data.clientBranchId ?? null
        );
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          const technicians = await getPortalTechniciansForClient(input.clientId, {
            branchIds: accessibleScope.scopedBranchIds,
          });
          const currentTechnician = technicians.find((technician) => technician.id === input.id) ?? null;
          if (!currentTechnician) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have access to the selected technician.",
            });
          }
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "technician",
            action: "update",
            entityId: input.id,
            summary: `Update technician: ${input.data.name?.trim() || currentTechnician?.name || `#${input.id}`}`.slice(0, 255),
            payload: {
              action: "update",
              previousData: buildPortalTechnicianApprovalSnapshot(currentTechnician),
              data: {
                name: input.data.name?.trim(),
                email: input.data.email?.trim().toLowerCase(),
                phone:
                  input.data.phone === undefined ? undefined : input.data.phone?.trim() || null,
                methods: input.data.methods?.map((method) => method.trim()),
                level: input.data.level?.trim(),
                methodQualifications: input.data.methodQualifications?.map((entry) => ({
                  method: entry.method.trim(),
                  level: entry.level.trim(),
                })),
                hasPcnQualification: input.data.hasPcnQualification,
                certificateNumber:
                  input.data.certificateNumber === undefined
                    ? undefined
                    : input.data.certificateNumber?.trim() || null,
                procedureStatus:
                  input.data.procedureStatus === undefined
                    ? undefined
                    : input.data.procedureStatus?.trim() || null,
                pcnRenewalDate:
                  input.data.pcnRenewalDate === undefined
                    ? undefined
                    : input.data.pcnRenewalDate
                      ? input.data.pcnRenewalDate.toISOString().slice(0, 10)
                      : null,
                internalAssessmentDate:
                  input.data.internalAssessmentDate === undefined
                    ? undefined
                    : input.data.internalAssessmentDate
                      ? input.data.internalAssessmentDate.toISOString().slice(0, 10)
                      : null,
                eyeTestValidUntil:
                  input.data.eyeTestValidUntil === undefined
                    ? undefined
                    : input.data.eyeTestValidUntil
                      ? input.data.eyeTestValidUntil.toISOString().slice(0, 10)
                      : null,
                notes:
                  input.data.notes === undefined ? undefined : input.data.notes?.trim() || null,
                clientBranchId:
                  input.data.clientBranchId === undefined
                    ? undefined
                    : input.data.clientBranchId ?? null,
              },
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const accessibleTechnicians = await getPortalTechniciansForClient(input.clientId, {
          branchIds: accessibleScope.scopedBranchIds,
        });
        if (!accessibleTechnicians.some((technician) => technician.id === input.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected technician.",
          });
        }
        const updatedTechnician = await updateLevelIIITechnician(input.id, {
          ...input.data,
          method:
            input.data.methods === undefined
              ? undefined
              : input.data.methods.join(", "),
          phone:
            input.data.phone === undefined
              ? undefined
              : input.data.phone?.trim() || null,
          certificateNumber:
            input.data.certificateNumber === undefined
              ? undefined
              : input.data.certificateNumber?.trim() || null,
          procedureStatus:
            input.data.procedureStatus === undefined
              ? undefined
              : input.data.procedureStatus?.trim() || null,
          notes:
            input.data.notes === undefined
              ? undefined
              : input.data.notes?.trim() || null,
          clientBranchId:
            input.data.clientBranchId === undefined
              ? undefined
              : input.data.clientBranchId ?? null,
        } as any);
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_technician",
          entityId: input.id,
          clientId: input.clientId,
          focus: "compliance",
          title: "Technician updated",
          description: `${input.data.name?.trim() || "A technician"} record was updated.`,
          changes: {
            technicianId: input.id,
            ...input.data,
            methods: input.data.methods?.map((method) => method.trim()),
            methodQualifications: input.data.methodQualifications?.map((entry) => ({
              method: entry.method.trim(),
              level: entry.level.trim(),
            })),
          },
        });
        return updatedTechnician;
      }),

    delete: portalDeleteProcedure
      .input(z.object({ id: z.number(), clientId: z.number(), branchId: z.number().optional().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        const technicians = await getPortalTechniciansForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        const currentTechnician = technicians.find((technician) => technician.id === input.id) ?? null;
        if (!currentTechnician) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this technician.",
          });
        }
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "technician",
            action: "delete",
            entityId: input.id,
            summary: `Delete technician: ${currentTechnician?.name || `#${input.id}`}`.slice(0, 255),
            payload: {
              action: "delete",
              data: {},
              previousData: buildPortalTechnicianApprovalSnapshot(currentTechnician),
            },
            submittedByUserId: ctx.user.id,
          });
        }
        await deleteLevelIIITechnician(input.id);
        await logPortalAuditEvent(ctx as any, {
          action: "DELETE",
          entityType: "client_portal_technician",
          entityId: input.id,
          clientId: input.clientId,
          focus: "compliance",
          title: "Technician removed",
          description: `${currentTechnician?.name || `Technician #${input.id}`} was removed from the client portal.`,
          changes: {
            technicianName: currentTechnician?.name ?? null,
          },
        });
        return getPortalTechniciansForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),
  }),

  requirements: router({
    listDefinitions: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        return getPortalRequirementDefinitionsForClient(input.clientId);
      }),

    createDefinition: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          name: z.string().min(1),
          category: z.string().min(1),
          description: z.string().optional().nullable(),
          validityDays: z.number().int().min(1).optional().nullable(),
          reminderDays: z.number().int().min(0).optional().nullable(),
          isRequired: z.boolean().optional(),
          active: z.boolean().optional(),
          sortOrder: z.number().int().optional().nullable(),
          customFields: z.array(portalRequirementCustomFieldSchema).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const definition = await createPortalRequirementDefinition({
          clientId: input.clientId,
          name: input.name.trim(),
          category: input.category.trim(),
          description: input.description?.trim() || null,
          validityDays: input.validityDays ?? null,
          reminderDays: input.reminderDays ?? 30,
          isRequired: input.isRequired ?? true,
          active: input.active ?? true,
          sortOrder: input.sortOrder ?? 0,
          customFields: input.customFields ?? [],
        } as any);
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_requirement_definition",
          entityId: Number((definition as any)?.id ?? 0) || input.clientId,
          clientId: input.clientId,
          focus: "compliance",
          title: "Requirement definition added",
          description: `${input.name.trim()} is now part of this client compliance checklist.`,
          changes: {
            requirementName: input.name.trim(),
            category: input.category.trim(),
            isRequired: input.isRequired ?? true,
          },
        });
        return definition;
      }),

    updateDefinition: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          data: z.object({
            name: z.string().min(1).optional(),
            category: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            validityDays: z.number().int().min(1).optional().nullable(),
            reminderDays: z.number().int().min(0).optional().nullable(),
            isRequired: z.boolean().optional(),
            active: z.boolean().optional(),
            sortOrder: z.number().int().optional().nullable(),
            customFields: z.array(portalRequirementCustomFieldSchema).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "manage");
        const definitions = await getPortalRequirementDefinitionsForClient(input.clientId);
        requirePortalScopedEntity(
          definitions.find((definition) => definition.id === input.id),
          "You do not have access to the selected requirement definition."
        );
        const definition = await updatePortalRequirementDefinition(input.id, {
          ...input.data,
          name: input.data.name?.trim(),
          category: input.data.category?.trim(),
          description:
            input.data.description === undefined
              ? undefined
              : input.data.description?.trim() || null,
          validityDays:
            input.data.validityDays === undefined ? undefined : input.data.validityDays ?? null,
          reminderDays:
            input.data.reminderDays === undefined ? undefined : input.data.reminderDays ?? 30,
          sortOrder:
            input.data.sortOrder === undefined ? undefined : input.data.sortOrder ?? 0,
          customFields: input.data.customFields,
        } as any);
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_requirement_definition",
          entityId: input.id,
          clientId: input.clientId,
          focus: "compliance",
          title: "Requirement definition updated",
          description: `${input.data.name?.trim() || "A requirement"} was updated.`,
          changes: {
            requirementId: input.id,
            ...input.data,
          },
        });
        return definition;
      }),

    listMatrix: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalRequirementMatrixForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    upsertRecord: portalEditProcedure
      .input(
        z.object({
          clientId: z.number(),
          technicianId: z.number(),
          definitionId: z.number(),
          status: portalRequirementStatusSchema.optional(),
          issuedAt: z.date().optional().nullable(),
          validUntil: z.date().optional().nullable(),
          notes: z.string().optional().nullable(),
          customFieldValues: z.record(z.string(), z.unknown()).optional().nullable(),
          attachmentFileDataUrl: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const scope = await getPortalBranchScope(ctx as any, input.clientId);
        const scopedTechnicians = await getPortalTechniciansForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        if (!scopedTechnicians.some((technician) => technician.id === input.technicianId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected technician.",
          });
        }
        const requirementDefinitions = await getPortalRequirementDefinitionsForClient(input.clientId);
        if (!requirementDefinitions.some((definition) => definition.id === input.definitionId)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected requirement definition.",
          });
        }
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          const storedFile =
            input.attachmentFileDataUrl
              ? await buildPortalRequirementDocumentStoragePlan({
                  clientId: input.clientId,
                  technicianId: input.technicianId,
                  definitionId: input.definitionId,
                  fileDataUrl: input.attachmentFileDataUrl,
                }).then((storagePlan) =>
                  stagePortalApprovalFile({
                    clientId: input.clientId,
                    scope: storagePlan.scope,
                    fileName: storagePlan.fileName,
                    fileDataUrl: input.attachmentFileDataUrl!,
                  })
                )
              : null;
          const matrix = await getPortalRequirementMatrixForClient(input.clientId, {
            branchIds: scope.scopedBranchIds,
          });
          const currentRecord =
            matrix.find(
              (entry) =>
                entry.technicianId === input.technicianId && entry.definitionId === input.definitionId
            ) ?? null;
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "requirement_record",
            action: "upsert",
            entityId: null,
            summary: `Update compliance record for ${currentRecord?.technicianName || `technician #${input.technicianId}`}`.slice(0, 255),
            payload: {
              action: "upsert",
              previousData: buildPortalRequirementApprovalSnapshot(currentRecord),
              data: {
                technicianId: input.technicianId,
                definitionId: input.definitionId,
                status: input.status ?? null,
                issuedAt: input.issuedAt ? input.issuedAt.toISOString().slice(0, 10) : null,
                validUntil: input.validUntil ? input.validUntil.toISOString().slice(0, 10) : null,
                notes: input.notes?.trim() || null,
                customFieldValues: input.customFieldValues ?? {},
              },
              storedFile,
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const record = await upsertPortalTechnicianRequirement({
          technicianId: input.technicianId,
          definitionId: input.definitionId,
          status: input.status,
          issuedAt: input.issuedAt ?? null,
          validUntil: input.validUntil ?? null,
          notes: input.notes?.trim() || null,
          customFieldValues: input.customFieldValues ?? {},
          uploadedByUserId: ctx.user.id,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_compliance",
          entityId: Number((record as any)?.id ?? 0) || input.technicianId,
          clientId: input.clientId,
          focus: "compliance",
          title: "Compliance record updated",
          description: `A technician compliance record was updated for this client.`,
          changes: {
            technicianId: input.technicianId,
            definitionId: input.definitionId,
            status: input.status ?? null,
            validUntil: input.validUntil ? input.validUntil.toISOString().slice(0, 10) : null,
          },
        });
        return record;
      }),

    uploadDocument: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          technicianRequirementId: z.number(),
          fileName: z.string().min(1).optional().nullable(),
          fileDataUrl: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { scope } = await getPortalAuthScope({
          ctx: ctx as any,
          clientId: input.clientId,
          branchId: null,
          mode: "edit",
        });
        const requirementMatrix = await getPortalRequirementMatrixForClient(input.clientId, {
          branchIds: scope?.scopedBranchIds,
        });
        requirePortalScopedEntity(
          requirementMatrix.find((entry) => entry.recordId === input.technicianRequirementId),
          "You do not have access to the selected requirement record."
        );
        const document = await uploadPortalRequirementDocument({
          clientId: input.clientId,
          technicianRequirementId: input.technicianRequirementId,
          fileName: input.fileName?.trim() || null,
          fileDataUrl: input.fileDataUrl,
          uploadedByUserId: ctx.user.id,
        } as any);
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_evidence",
          entityId: Number((document as any)?.id ?? 0) || input.technicianRequirementId,
          clientId: input.clientId,
          focus: "compliance",
          title: "Evidence uploaded",
          description: `${document.fileName} was uploaded as supporting compliance evidence.`,
          changes: {
            technicianRequirementId: input.technicianRequirementId,
            fileName: document.fileName,
          },
        });
        return document;
      }),
  }),

  documents: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalClientDocuments(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    create: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          clientBranchId: z.number().int().positive().optional().nullable(),
          title: z.string().min(1),
          category: z.string().min(1),
          description: z.string().optional().nullable(),
          fileName: z.string().optional().nullable(),
          fileDataUrl: z.string().min(1),
          reviewDate: z.date().optional().nullable(),
          validUntil: z.date().optional().nullable(),
          status: z.enum(["active", "archived", "superseded"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        await getPortalBranchScope(ctx as any, input.clientId, input.clientBranchId ?? null);
        const storagePlan = await buildPortalClientDocumentStoragePlan({
          clientId: input.clientId,
          title: input.title.trim(),
          clientBranchId: input.clientBranchId ?? null,
          fileDataUrl: input.fileDataUrl,
          fileNameHint: input.fileName?.trim() || null,
        });
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          const storedFile = await stagePortalApprovalFile({
            clientId: input.clientId,
            scope: storagePlan.scope,
            fileName: storagePlan.fileName,
            fileDataUrl: input.fileDataUrl,
          });
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "client_document",
            action: "create",
            summary: `Create client document: ${storagePlan.title}`.slice(0, 255),
            payload: {
              action: "create",
              data: {
                title: storagePlan.title,
                category: input.category.trim(),
                clientBranchId: input.clientBranchId ?? null,
                description: input.description?.trim() || null,
                reviewDate: input.reviewDate ? input.reviewDate.toISOString().slice(0, 10) : null,
                validUntil: input.validUntil ? input.validUntil.toISOString().slice(0, 10) : null,
                status: input.status ?? "active",
                fileName: storagePlan.fileName,
              },
              storedFile,
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const document = await createPortalClientDocument({
          clientId: input.clientId,
          clientBranchId: input.clientBranchId ?? null,
          title: storagePlan.title,
          category: input.category.trim(),
          description: input.description?.trim() || null,
          fileName: storagePlan.fileName,
          fileNameHint: input.fileName?.trim() || null,
          fileDataUrl: input.fileDataUrl,
          reviewDate: input.reviewDate ?? null,
          validUntil: input.validUntil ?? null,
          status: input.status ?? "active",
          uploadedByUserId: ctx.user.id,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_document",
          entityId: Number((document as any)?.id ?? 0) || input.clientId,
          clientId: input.clientId,
          focus: "documents",
          title: "Client document added",
          description: `${storagePlan.title} was added to the client document library.`,
          changes: {
            documentTitle: storagePlan.title,
            category: input.category.trim(),
            clientBranchId: input.clientBranchId ?? null,
            status: input.status ?? "active",
          },
        });
        return document;
      }),

    importReference: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          clientBranchId: z.number().int().positive().optional().nullable(),
          title: z.string().min(1),
          category: z.string().min(1),
          description: z.string().optional().nullable(),
          sourceFileName: z.string().min(1),
          sourcePath: z.string().min(1),
          reviewDate: z.date().optional().nullable(),
          validUntil: z.date().optional().nullable(),
          status: z.enum(["active", "archived", "superseded"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        await getPortalBranchScope(ctx as any, input.clientId, input.clientBranchId ?? null);
        const storagePlan = await buildPortalClientDocumentStoragePlan({
          clientId: input.clientId,
          title: input.title.trim(),
          clientBranchId: input.clientBranchId ?? null,
          fileDataUrl: null,
          fileNameHint: input.sourceFileName.trim(),
        });
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "client_document",
            action: "create",
            summary: `Import client document: ${storagePlan.title}`.slice(0, 255),
            payload: {
              action: "create",
              data: {
                title: storagePlan.title,
                category: input.category.trim(),
                clientBranchId: input.clientBranchId ?? null,
                description: input.description?.trim() || null,
                reviewDate: input.reviewDate ? input.reviewDate.toISOString().slice(0, 10) : null,
                validUntil: input.validUntil ? input.validUntil.toISOString().slice(0, 10) : null,
                status: input.status ?? "active",
                fileName: input.sourceFileName.trim(),
                sourceFileName: input.sourceFileName.trim(),
                sourcePath: input.sourcePath.trim(),
              },
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const document = await createPortalClientDocument({
          clientId: input.clientId,
          clientBranchId: input.clientBranchId ?? null,
          title: storagePlan.title,
          category: input.category.trim(),
          description: input.description?.trim() || null,
          fileName: input.sourceFileName.trim(),
          sourceFileName: input.sourceFileName.trim(),
          sourcePath: input.sourcePath.trim(),
          reviewDate: input.reviewDate ?? null,
          validUntil: input.validUntil ?? null,
          status: input.status ?? "active",
          uploadedByUserId: ctx.user.id,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_document",
          entityId: Number((document as any)?.id ?? 0) || input.clientId,
          clientId: input.clientId,
          focus: "documents",
          title: "Client document imported",
          description: `${storagePlan.title} was imported into the client document library as a source reference.`,
          changes: {
            documentTitle: storagePlan.title,
            category: input.category.trim(),
            clientBranchId: input.clientBranchId ?? null,
            sourceFileName: input.sourceFileName.trim(),
            sourcePath: input.sourcePath.trim(),
            status: input.status ?? "active",
          },
        });
        return document;
      }),

    update: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          branchId: z.number().optional().nullable(),
          data: z.object({
            clientBranchId: z.number().int().positive().optional().nullable(),
            title: z.string().min(1).optional(),
            category: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            reviewDate: z.date().optional().nullable(),
            validUntil: z.date().optional().nullable(),
            status: z.enum(["active", "archived", "superseded"]).optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        await getPortalBranchScope(
          ctx as any,
          input.clientId,
          input.data.clientBranchId ?? null
        );
        const documents = await getPortalClientDocuments(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        const currentDocument = documents.find((document) => document.id === input.id) ?? null;
        if (!currentDocument) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected client document.",
          });
        }
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "client_document",
            action: "update",
            entityId: input.id,
            summary: `Update client document: ${input.data.title?.trim() || currentDocument?.title || `#${input.id}`}`.slice(0, 255),
            payload: {
              action: "update",
              previousData: buildPortalDocumentApprovalSnapshot(currentDocument),
              data: {
                title: input.data.title?.trim(),
                category:
                  input.data.category === undefined
                    ? undefined
                    : input.data.category?.trim() || null,
                clientBranchId:
                  input.data.clientBranchId === undefined
                    ? undefined
                    : input.data.clientBranchId ?? null,
                description:
                  input.data.description === undefined
                    ? undefined
                    : input.data.description?.trim() || null,
                reviewDate:
                  input.data.reviewDate === undefined
                    ? undefined
                    : input.data.reviewDate
                      ? input.data.reviewDate.toISOString().slice(0, 10)
                      : null,
                validUntil:
                  input.data.validUntil === undefined
                    ? undefined
                    : input.data.validUntil
                      ? input.data.validUntil.toISOString().slice(0, 10)
                      : null,
                status: input.data.status,
              },
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const document = await updatePortalClientDocument(input.id, {
          clientBranchId:
            input.data.clientBranchId === undefined
              ? undefined
              : input.data.clientBranchId ?? null,
          title: input.data.title?.trim(),
          category: input.data.category?.trim(),
          description:
            input.data.description === undefined
              ? undefined
              : input.data.description?.trim() || null,
          reviewDate:
            input.data.reviewDate === undefined ? undefined : input.data.reviewDate ?? null,
          validUntil:
            input.data.validUntil === undefined ? undefined : input.data.validUntil ?? null,
          status: input.data.status,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_document",
          entityId: input.id,
          clientId: input.clientId,
          focus: "documents",
          title: "Client document updated",
          description: `${input.data.title?.trim() || "A client document"} was updated.`,
          changes: {
            documentId: input.id,
            ...input.data,
          },
        });
        return document;
      }),

    delete: portalDeleteProcedure
      .input(z.object({ id: z.number(), clientId: z.number(), branchId: z.number().optional().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        const documents = await getPortalClientDocuments(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        const currentDocument = documents.find((document) => document.id === input.id) ?? null;
        if (!currentDocument) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected client document.",
          });
        }
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "client_document",
            action: "delete",
            entityId: input.id,
            summary: `Delete client document: ${currentDocument?.title || `#${input.id}`}`.slice(0, 255),
            payload: {
              action: "delete",
              data: {},
              previousData: buildPortalDocumentApprovalSnapshot(currentDocument),
            },
            submittedByUserId: ctx.user.id,
          });
        }
        await deletePortalClientDocument(input.id);
        await logPortalAuditEvent(ctx as any, {
          action: "DELETE",
          entityType: "client_portal_document",
          entityId: input.id,
          clientId: input.clientId,
          focus: "documents",
          title: "Client document removed",
          description: `${currentDocument?.title || `Document #${input.id}`} was removed from the client library.`,
          changes: {
            documentTitle: currentDocument?.title ?? null,
          },
        });
        return { success: true };
      }),
  }),

  comments: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        return getPortalCommentsForClient(input.clientId);
      }),

    create: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          requestType: z.enum(["general_comment", "contact_request", "suggestion"]).optional(),
          subject: z.string().min(1),
          message: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const comment = await createPortalComment({
          clientId: input.clientId,
          userId: ctx.user.id,
          requestType: input.requestType ?? "general_comment",
          subject: input.subject.trim(),
          message: input.message.trim(),
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_comment",
          entityId: Number((comment as any)?.id ?? 0) || input.clientId,
          clientId: input.clientId,
          focus: "comments",
          title: "New client request submitted",
          description: input.subject.trim(),
          changes: {
            requestType: input.requestType ?? "general_comment",
            subject: input.subject.trim(),
            status: "open",
          },
        });
        return comment;
      }),

    updateStatus: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          status: z.enum(["open", "acknowledged", "closed"]),
          internalNotes: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const comments = await getPortalCommentsForClient(input.clientId);
        requirePortalScopedEntity(
          comments.find((comment) => comment.id === input.id),
          "You do not have access to the selected client request."
        );
        const comment = await updatePortalCommentStatus(input.id, {
          status: input.status,
          internalNotes: input.internalNotes?.trim() || null,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_comment",
          entityId: input.id,
          clientId: input.clientId,
          focus: "comments",
          title: `Client request ${input.status}`,
          description: `A client request status changed to ${input.status}.`,
          changes: {
            status: input.status,
            internalNotes: input.internalNotes?.trim() || null,
          },
        });
        return comment;
      }),
  }),

  resources: router({
    list: portalViewProcedure
      .input(z.object({ clientId: z.number(), branchId: z.number().optional().nullable() }))
      .query(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "view");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        return getPortalResourcesForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
      }),

    create: portalCreateProcedure
      .input(
        z.object({
          clientId: z.number(),
          clientBranchId: z.number().int().positive().optional().nullable(),
          title: z.string().min(1),
          category: z.string().min(1),
          description: z.string().optional().nullable(),
          resourceType: z.enum(["file", "link"]),
          linkUrl: z.string().url().optional().or(z.literal("")).nullable(),
          fileName: z.string().optional().nullable(),
          fileDataUrl: z.string().optional().nullable(),
          sortOrder: z.number().int().optional().nullable(),
          active: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        await getPortalBranchScope(ctx as any, input.clientId, input.clientBranchId ?? null);
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          const storedFile =
            input.resourceType === "file" && input.fileDataUrl
              ? await stagePortalApprovalFile({
                  clientId: input.clientId,
                  scope: "resources",
                  fileName: input.fileName?.trim() || "resource-file",
                  fileDataUrl: input.fileDataUrl,
                })
              : null;
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "resource",
            action: "create",
            summary: `Create resource: ${input.title.trim()}`.slice(0, 255),
            payload: {
              action: "create",
              data: {
                title: input.title.trim(),
                category: input.category.trim(),
                clientBranchId: input.clientBranchId ?? null,
                description: input.description?.trim() || null,
                resourceType: input.resourceType,
                linkUrl: input.linkUrl?.trim() || null,
                fileName: input.fileName?.trim() || null,
                sortOrder: input.sortOrder ?? 0,
                active: input.active ?? true,
              },
              storedFile,
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const resource = await createPortalClientResource({
          clientId: input.clientId,
          clientBranchId: input.clientBranchId ?? null,
          title: input.title.trim(),
          category: input.category.trim(),
          description: input.description?.trim() || null,
          resourceType: input.resourceType,
          linkUrl: input.linkUrl?.trim() || null,
          fileName: input.fileName?.trim() || null,
          fileDataUrl: input.fileDataUrl || null,
          sortOrder: input.sortOrder ?? 0,
          active: input.active ?? true,
          uploadedByUserId: ctx.user.id,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "CREATE",
          entityType: "client_portal_resource",
          entityId: Number((resource as any)?.id ?? 0) || input.clientId,
          clientId: input.clientId,
          focus: "resources",
          title: "Client resource added",
          description: `${input.title.trim()} was added to the general resources section.`,
          changes: {
            resourceTitle: input.title.trim(),
            resourceType: input.resourceType,
            clientBranchId: input.clientBranchId ?? null,
            active: input.active ?? true,
          },
        });
        return resource;
      }),

    update: portalEditProcedure
      .input(
        z.object({
          id: z.number(),
          clientId: z.number(),
          branchId: z.number().optional().nullable(),
          data: z.object({
            clientBranchId: z.number().int().positive().optional().nullable(),
            title: z.string().min(1).optional(),
            category: z.string().min(1).optional(),
            description: z.string().optional().nullable(),
            linkUrl: z.string().url().optional().or(z.literal("")).nullable(),
            sortOrder: z.number().int().optional().nullable(),
            active: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        await getPortalBranchScope(
          ctx as any,
          input.clientId,
          input.data.clientBranchId ?? null
        );
        const resources = await getPortalResourcesForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        const currentResource = resources.find((resource) => resource.id === input.id) ?? null;
        if (!currentResource) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected resource.",
          });
        }
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "resource",
            action: "update",
            entityId: input.id,
            summary: `Update resource: ${input.data.title?.trim() || currentResource?.title || `#${input.id}`}`.slice(0, 255),
            payload: {
              action: "update",
              previousData: buildPortalResourceApprovalSnapshot(currentResource),
              data: {
                title: input.data.title?.trim(),
                category:
                  input.data.category === undefined
                    ? undefined
                    : input.data.category?.trim() || null,
                clientBranchId:
                  input.data.clientBranchId === undefined
                    ? undefined
                    : input.data.clientBranchId ?? null,
                description:
                  input.data.description === undefined
                    ? undefined
                    : input.data.description?.trim() || null,
                linkUrl:
                  input.data.linkUrl === undefined ? undefined : input.data.linkUrl?.trim() || null,
                sortOrder: input.data.sortOrder,
                active: input.data.active,
              },
            },
            submittedByUserId: ctx.user.id,
          });
        }
        const resource = await updatePortalClientResource(input.id, {
          clientBranchId:
            input.data.clientBranchId === undefined
              ? undefined
              : input.data.clientBranchId ?? null,
          title: input.data.title?.trim(),
          category: input.data.category?.trim(),
          description:
            input.data.description === undefined
              ? undefined
              : input.data.description?.trim() || null,
          linkUrl:
            input.data.linkUrl === undefined
              ? undefined
              : input.data.linkUrl?.trim() || null,
          sortOrder:
            input.data.sortOrder === undefined ? undefined : input.data.sortOrder ?? 0,
          active: input.data.active,
        });
        await logPortalAuditEvent(ctx as any, {
          action: "UPDATE",
          entityType: "client_portal_resource",
          entityId: input.id,
          clientId: input.clientId,
          focus: "resources",
          title: "Client resource updated",
          description: `${input.data.title?.trim() || "A resource"} was updated.`,
          changes: {
            resourceId: input.id,
            ...input.data,
          },
        });
        return resource;
      }),

    delete: portalDeleteProcedure
      .input(z.object({ id: z.number(), clientId: z.number(), branchId: z.number().optional().nullable() }))
      .mutation(async ({ ctx, input }) => {
        await requirePortalClientAccess(ctx as any, input.clientId, "edit");
        const scope = await getPortalBranchScope(ctx as any, input.clientId, input.branchId);
        const resources = await getPortalResourcesForClient(input.clientId, {
          branchIds: scope.scopedBranchIds,
        });
        const currentResource = resources.find((resource) => resource.id === input.id) ?? null;
        if (!currentResource) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to the selected resource.",
          });
        }
        if (!canDirectlyApplyPortalChanges(ctx.user.role)) {
          return submitPortalApprovalRequest(ctx as any, {
            clientId: input.clientId,
            entityType: "resource",
            action: "delete",
            entityId: input.id,
            summary: `Delete resource: ${currentResource?.title || `#${input.id}`}`.slice(0, 255),
            payload: {
              action: "delete",
              data: {},
              previousData: buildPortalResourceApprovalSnapshot(currentResource),
            },
            submittedByUserId: ctx.user.id,
          });
        }
        await deletePortalClientResource(input.id);
        await logPortalAuditEvent(ctx as any, {
          action: "DELETE",
          entityType: "client_portal_resource",
          entityId: input.id,
          clientId: input.clientId,
          focus: "resources",
          title: "Client resource removed",
          description: `${currentResource?.title || `Resource #${input.id}`} was removed from general resources.`,
          changes: {
            resourceTitle: currentResource?.title ?? null,
          },
        });
        return { success: true };
      }),
  }),
});
