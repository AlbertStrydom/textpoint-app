import type { FormField } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import {
  buildLevelIIIDocumentAutomationRules,
  isLikelyLevelIIIAssessmentRequest,
} from "@shared/levelIIIDocumentAutomation";
import type {
  AssessmentBookingReadinessSnapshot,
  LevelIIIActivityType,
  LevelIIIAssessment,
  LevelIIIAssessmentMethodLevel,
  LevelIIIDocumentGenerationQueueItem,
  LevelIIIEvidenceReviewState,
  LevelIIITechnician,
  LevelIIITechnicianCertificate,
  LevelIIITechnicianCertificateApprovalStatus,
  LevelIIITechnicianCertificateStatus,
  LevelIIITechnicianDocumentQueueItem,
  LevelIIITechnicianMethodQualification,
  PortalCommentRequestType,
  PortalCommentStatus,
  PortalRequirementCustomField,
  PortalRequirementDefinition,
  PortalRequirementRow,
  PortalRequirementStatus,
  PortalActionQueuePriority,
  PortalServiceRequest,
  PortalServiceRequestMetadata,
  PortalServiceRequestStatus,
  PortalServiceRequestSupportingDocument,
} from "./LevelIIIPage.types";

export const LEVELIII_DOCUMENT_WATCHLIST_HANDLED_STORAGE_KEY =
  "leveliii-document-watchlist-handled";
export const LEVELIII_TECHNICIAN_DOCUMENT_QUEUE_HANDLED_STORAGE_KEY =
  "leveliii-technician-document-queue-handled";
export const LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY =
  "leveliii-cross-technician-queue-session";

export function buildTechnicianDocumentQueueItemSignature(
  item: LevelIIITechnicianDocumentQueueItem
) {
  return `${item.row.technicianId}:${item.row.definitionId}:${item.queueLabel}`;
}

export function getDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseOptionalDate(value: unknown) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return new Date(`${trimmed}T00:00:00`);
}

export function cleanOptionalString(value: unknown) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function formatLevelIIIStatusLabel(value: unknown, fallback = "Unknown") {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed.replace(/_/g, " ") : fallback;
}

export function formatLevelIIICategoryLabel(value: unknown, fallback = "Requirement") {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

export function getLevelIIIEvidencePreviewKind(
  review: LevelIIIEvidenceReviewState | null,
  options?: {
    contentType?: string | null;
    fileUrl?: string | null;
  }
) {
  const resolvedFileUrl = String(options?.fileUrl ?? review?.fileUrl ?? "").trim();
  if (!resolvedFileUrl) return "none" as const;
  const contentType = String(options?.contentType ?? review?.contentType ?? "")
    .trim()
    .toLowerCase();
  const fileName = String(review?.fileName ?? review?.title ?? "").trim().toLowerCase();
  const fileUrl = resolvedFileUrl.toLowerCase();
  const target = [contentType, fileName, fileUrl].join(" ");

  if (contentType.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/.test(target)) {
    return "image" as const;
  }
  if (
    contentType === "application/pdf" ||
    /^data:application\/pdf;base64,/.test(fileUrl) ||
    /\.pdf(\?|#|$)/.test(target)
  ) {
    return "pdf" as const;
  }
  if (contentType.startsWith("text/") || /\.(txt|csv|json|md)(\?|#|$)/.test(target)) {
    return "text" as const;
  }
  return "external" as const;
}

export function isLevelIIIEvidenceInlinePreviewKind(
  kind: ReturnType<typeof getLevelIIIEvidencePreviewKind>
) {
  return kind === "image" || kind === "text";
}

export async function fetchLevelIIIEvidencePreviewAsset(
  review: LevelIIIEvidenceReviewState
) {
  const response = await fetch(review.fileUrl, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Could not load the stored file (${response.status}).`);
  }
  const blob = await response.blob();
  return {
    blob,
    objectUrl: window.URL.createObjectURL(blob),
    contentType:
      cleanOptionalString(blob.type) ??
      cleanOptionalString(response.headers.get("content-type")) ??
      cleanOptionalString(review.contentType),
  };
}

export function normaliseLevelIIIEvidenceReviewState(
  review: LevelIIIEvidenceReviewState
): LevelIIIEvidenceReviewState {
  return {
    source:
      review.source === "certificate" ||
      review.source === "requirement" ||
      review.source === "portal_request" ||
      review.source === "request_pack"
        ? review.source
        : "requirement",
    title: String(review.title ?? "").trim() || "Stored evidence",
    description:
      String(review.description ?? "").trim() ||
      "Review the stored file details before opening the evidence.",
    fileName: cleanOptionalString(review.fileName),
    fileUrl: String(review.fileUrl ?? "").trim(),
    contentType: cleanOptionalString(review.contentType),
    storagePath: cleanOptionalString(review.storagePath),
    sourceReference: cleanOptionalString(review.sourceReference),
    certificate: review.certificate ?? null,
    requirement: review.requirement ?? null,
    portalRequest: review.portalRequest ?? null,
    badges: Array.isArray(review.badges)
      ? review.badges
          .filter((badge) => badge && typeof badge === "object")
          .map((badge, index) => ({
            key: String(badge.key ?? "").trim() || `badge-${index}`,
            label: String(badge.label ?? "").trim(),
            variant:
              badge.variant === "default" ||
              badge.variant === "secondary" ||
              badge.variant === "destructive" ||
              badge.variant === "outline"
                ? badge.variant
                : "secondary",
            className: cleanOptionalString(badge.className) ?? undefined,
          }))
          .filter((badge) => badge.label.length > 0)
      : [],
  };
}

export function getLevelIIIRequirementRowPriority(row: PortalRequirementRow) {
  const statusPriority: Record<PortalRequirementStatus, number> = {
    current: 5,
    no_expiry: 5,
    pending_review: 4,
    expiring: 3,
    expired: 2,
    missing: 1,
  };
  return statusPriority[row.status] ?? 0;
}

export function isCurrentLikePortalRequirementStatus(status: PortalRequirementStatus) {
  return status === "current" || status === "no_expiry";
}

export function dedupeLevelIIIRequirementDefinitions(
  definitions: PortalRequirementDefinition[]
) {
  const grouped = new Map<string, PortalRequirementDefinition[]>();
  definitions.forEach((definition) => {
    const key = definition.name.trim().toLowerCase();
    const list = grouped.get(key) ?? [];
    list.push(definition);
    grouped.set(key, list);
  });
  return Array.from(grouped.values()).map((group) =>
    group
      .slice()
      .sort((left, right) => {
        if (left.active !== right.active) {
          return Number(right.active) - Number(left.active);
        }
        if (left.isRequired !== right.isRequired) {
          return Number(right.isRequired) - Number(left.isRequired);
        }
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.id - right.id;
      })[0]
  );
}

export function dedupeLevelIIIRequirementRows(rows: PortalRequirementRow[]) {
  const grouped = new Map<string, PortalRequirementRow[]>();
  rows.forEach((row) => {
    const key = `${row.technicianId}:${row.definitionName.trim().toLowerCase()}`;
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  });
  return Array.from(grouped.values()).map((group) =>
    group
      .slice()
      .sort((left, right) => {
        if ((left.documentCount ?? 0) !== (right.documentCount ?? 0)) {
          return (right.documentCount ?? 0) - (left.documentCount ?? 0);
        }
        if (
          getLevelIIIRequirementRowPriority(left) !==
          getLevelIIIRequirementRowPriority(right)
        ) {
          return (
            getLevelIIIRequirementRowPriority(right) -
            getLevelIIIRequirementRowPriority(left)
          );
        }
        const leftFreshness =
          new Date(left.validUntil ?? left.issuedAt ?? 0).getTime() || 0;
        const rightFreshness =
          new Date(right.validUntil ?? right.issuedAt ?? 0).getTime() || 0;
        if (leftFreshness !== rightFreshness) {
          return rightFreshness - leftFreshness;
        }
        return (right.recordId ?? 0) - (left.recordId ?? 0);
      })[0]
  );
}

export function inferLevelIIIFileExtensionFromDataUrl(dataUrl: string) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,/i);
  const mimeType = match?.[1]?.toLowerCase() ?? "";
  const extensionMap: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "text/plain": ".txt",
  };
  return extensionMap[mimeType] ?? "";
}

export function normalisePortalServiceRequestSupportingDocuments(
  value: unknown
): PortalServiceRequestSupportingDocument[] {
  if (!Array.isArray(value)) return [];
  const documents: PortalServiceRequestSupportingDocument[] = [];
  const seenLabels = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const source = entry as Record<string, unknown>;
    const label = String(source.label ?? "").trim();
    if (!label) continue;
    const labelKey = label.toLowerCase();
    if (seenLabels.has(labelKey)) continue;
    seenLabels.add(labelKey);
    documents.push({
      label,
      note: cleanOptionalString(source.note),
      fileName: cleanOptionalString(source.fileName),
      fileUrl: cleanOptionalString(source.fileUrl),
      fileKey: cleanOptionalString(source.fileKey),
      contentType: cleanOptionalString(source.contentType),
      classifiedLabel: cleanOptionalString(source.classifiedLabel),
      storagePath: cleanOptionalString(source.storagePath),
      suggestedFileName: cleanOptionalString(source.suggestedFileName),
      linkedRequirementDefinitionId:
        Number.isInteger(Number(source.linkedRequirementDefinitionId)) &&
        Number(source.linkedRequirementDefinitionId) > 0
          ? Number(source.linkedRequirementDefinitionId)
          : null,
      linkedRequirementDefinitionName: cleanOptionalString(
        source.linkedRequirementDefinitionName
      ),
    });
  }
  return documents;
}

export function cleanMethodArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
}

export function normalisePortalServiceRequestMetadata(
  value: unknown
): PortalServiceRequestMetadata {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    ...source,
    supportingDocuments: normalisePortalServiceRequestSupportingDocuments(
      source.supportingDocuments
    ),
    clientVisibleUpdate: cleanOptionalString(source.clientVisibleUpdate),
    internalOwner: cleanOptionalString(source.internalOwner),
    plannedAction: cleanOptionalString(source.plannedAction),
    confirmedDate:
      source.confirmedDate instanceof Date || typeof source.confirmedDate === "string"
        ? source.confirmedDate
        : null,
    linkedActivityId:
      Number.isInteger(Number(source.linkedActivityId)) &&
      Number(source.linkedActivityId) > 0
        ? Number(source.linkedActivityId)
        : null,
    selectedTechniques: cleanMethodArray(source.selectedTechniques),
    matchedGuideTitles: cleanMethodArray(source.matchedGuideTitles),
    readinessBringItems: cleanMethodArray(source.readinessBringItems),
    readinessCompanyItems: cleanMethodArray(source.readinessCompanyItems),
    uncoveredTechniques: cleanMethodArray(source.uncoveredTechniques),
    plannerNotes: cleanOptionalString(source.plannerNotes),
  };
}

export function parseImportList(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|,|;|\|/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseImportBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalised = String(value ?? "").trim().toLowerCase();
  if (!normalised) return fallback;
  return ["true", "yes", "y", "1", "shared", "pcn", "available"].includes(normalised);
}

export function parseImportDateValue(value: unknown) {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normaliseEnumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T
) {
  const normalised = normaliseImportKey(value);
  if (!normalised) return fallback;
  const match = allowedValues.find(
    (allowedValue) => normaliseImportKey(allowedValue) === normalised
  );
  return match ?? fallback;
}

export function normaliseImportKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseMethodQualificationPairs(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|;|\|/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [method, ...levelParts] = entry.split(/:| - | – | — /);
      return {
        method: String(method ?? "").trim(),
        level: levelParts.join(":").trim(),
      };
    })
    .filter((entry) => entry.method && entry.level);
}

export function buildImportedMethodQualifications(
  rawMethods: unknown,
  rawLevel: unknown,
  rawMethodQualifications: unknown
) {
  const explicitQualifications = parseMethodQualificationPairs(rawMethodQualifications);
  if (explicitQualifications.length > 0) {
    return explicitQualifications;
  }
  const inferredQualifications = parseMethodQualificationPairs(rawLevel);
  if (inferredQualifications.length > 0) {
    return inferredQualifications;
  }
  const methods = parseImportList(rawMethods);
  const level = cleanOptionalString(rawLevel);
  if (!level) return [];
  return methods.map((method) => ({
    method,
    level,
  }));
}

export function formatExportDate(value: string | Date | null | undefined) {
  return getDateInputValue(value);
}

export function slugifyImportToken(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getTechnicianMethodQualifications(
  technician: Pick<
    LevelIIITechnician,
    "methodQualifications" | "methods" | "method" | "level"
  >
) {
  const fromQualifications = Array.isArray(technician.methodQualifications)
    ? technician.methodQualifications
        .map((entry) => ({
          method: String(entry.method ?? "").trim(),
          level: String(entry.level ?? "").trim(),
        }))
        .filter((entry) => entry.method && entry.level)
    : [];
  if (fromQualifications.length > 0) {
    return fromQualifications;
  }
  const methods = getTechnicianMethods(technician);
  const level = String(technician.level ?? "").trim();
  if (!level) return [];
  return methods.map((method) => ({ method, level }));
}

export function getTechnicianMethods(
  technician: Pick<LevelIIITechnician, "methods" | "method">
) {
  if (technician.methods.length > 0) return technician.methods;
  return technician.method
    .split(",")
    .map((method) => method.trim())
    .filter(Boolean);
}

export function formatMethods(methods: string[]) {
  return methods.length > 0 ? methods.join(", ") : "-";
}

export function summariseTechnicianLevels(
  methodQualifications: LevelIIITechnicianMethodQualification[]
) {
  if (methodQualifications.length === 0) return "";
  const uniqueLevels = Array.from(
    new Set(methodQualifications.map((entry) => entry.level))
  );
  if (uniqueLevels.length === 1) {
    return uniqueLevels[0] ?? "";
  }
  return methodQualifications
    .map((entry) => `${entry.method}: ${entry.level}`)
    .join(" | ");
}

export function formatTechnicianLevels(
  technician: Pick<
    LevelIIITechnician,
    "methodQualifications" | "methods" | "method" | "level"
  >
) {
  const methodQualifications = getTechnicianMethodQualifications(technician);
  return summariseTechnicianLevels(methodQualifications) || technician.level;
}

export function getTechnicianLevelForMethod(
  technician: Pick<
    LevelIIITechnician,
    "methodQualifications" | "methods" | "method" | "level"
  > | null | undefined,
  method: string
) {
  if (!technician) return "";
  return (
    getTechnicianMethodQualifications(technician).find(
      (entry) =>
        entry.method.trim().toLowerCase() === method.trim().toLowerCase()
    )?.level ?? ""
  );
}

export function getAssessmentMethodLevels(
  assessment: Pick<LevelIIIAssessment, "method" | "level" | "methodLevels">
) {
  if (Array.isArray(assessment.methodLevels) && assessment.methodLevels.length > 0) {
    return assessment.methodLevels
      .map((entry) => ({
        method: String(entry.method ?? "").trim(),
        level: String(entry.level ?? "").trim(),
      }))
      .filter((entry) => entry.method && entry.level);
  }
  const methods = String(assessment.method ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const level = String(assessment.level ?? "").trim();
  if (!level || methods.length === 0) return [];
  return methods.map((method) => ({ method, level }));
}

export function buildRequirementCustomRecordFields(
  definition: PortalRequirementDefinition | null
): FormField[] {
  if (!definition) return [];
  return definition.customFields.map((field) => ({
    name: `customField__${field.key}`,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder ?? undefined,
    helpText: field.helpText ?? undefined,
    options:
      field.type === "select"
        ? field.options
            .map((option) => String(option ?? "").trim())
            .filter((option) => option.length > 0)
            .map((option) => ({
              value: option,
              label: option,
            }))
        : undefined,
    section: "Requirement Details",
  }));
}

export function getInitialRequirementCustomFieldValues(
  definition: PortalRequirementDefinition | null,
  record: PortalRequirementRow | null
) {
  if (!definition) return {};
  return Object.fromEntries(
    definition.customFields.map((field) => {
      const rawValue = record?.customFieldValues?.[field.key];
      return [
        `customField__${field.key}`,
        field.type === "checkbox" ? Boolean(rawValue) : rawValue ?? "",
      ];
    })
  );
}

export function collectRequirementCustomFieldValues(
  definition: PortalRequirementDefinition | null,
  values: Record<string, unknown>
) {
  if (!definition) return {};
  return Object.fromEntries(
    definition.customFields.map((field) => [
      field.key,
      field.type === "checkbox"
        ? Boolean(values[`customField__${field.key}`])
        : values[`customField__${field.key}`] ?? "",
    ])
  );
}

export function formatRequirementCustomFieldValue(
  field: PortalRequirementCustomField,
  value: string | number | boolean | null | undefined
) {
  if (field.type === "checkbox") {
    return value ? "Yes" : "No";
  }
  if (field.type === "date") {
    return getDateInputValue(typeof value === "string" ? value : null) || "-";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

export function getRequirementCustomFieldSummary(row: PortalRequirementRow) {
  if (!row.definitionCustomFields.length) return "None";
  const summary = row.definitionCustomFields
    .map((field) => {
      const value = row.customFieldValues?.[field.key];
      if (value === null || value === undefined || value === "") return null;
      if (field.type === "checkbox" && value === false) return null;
      return `${field.label}: ${formatRequirementCustomFieldValue(field, value)}`;
    })
    .filter(Boolean);
  return summary.length > 0 ? summary.join(" | ") : "None";
}

export function getCertificateMethodLevels(
  certificate: Pick<
    LevelIIITechnicianCertificate,
    "method" | "level" | "methodLevels"
  >
) {
  if (Array.isArray(certificate.methodLevels) && certificate.methodLevels.length > 0) {
    return certificate.methodLevels
      .map((entry) => ({
        method: String(entry.method ?? "").trim(),
        level: String(entry.level ?? "").trim(),
      }))
      .filter((entry) => entry.method && entry.level);
  }
  const methods = String(certificate.method ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const level = String(certificate.level ?? "").trim();
  if (!level || methods.length === 0) return [];
  return methods.map((method) => ({ method, level }));
}

export function formatCertificateValidityRule(
  certificate: Pick<
    LevelIIITechnicianCertificate,
    "validityUnit" | "validityValue" | "validUntil"
  >
) {
  if (
    certificate.validityUnit &&
    certificate.validityUnit !== "custom" &&
    certificate.validityValue
  ) {
    const unit =
      certificate.validityValue === 1
        ? certificate.validityUnit.slice(0, -1)
        : certificate.validityUnit;
    return `${certificate.validityValue} ${unit}`;
  }
  if (certificate.validityUnit === "custom" && certificate.validUntil) {
    return `Custom until ${new Date(certificate.validUntil).toLocaleDateString()}`;
  }
  return certificate.validUntil
    ? `Until ${new Date(certificate.validUntil).toLocaleDateString()}`
    : "Manual";
}

export function getCertificateStatusBadge(
  status: LevelIIITechnicianCertificateStatus
) {
  switch (status) {
    case "Active":
      return <Badge className="bg-emerald-100 text-emerald-900">Active</Badge>;
    case "Expired":
      return <Badge variant="destructive">Expired</Badge>;
    case "Revoked":
      return <Badge className="bg-amber-100 text-amber-900">Revoked</Badge>;
    case "Superseded":
    default:
      return <Badge variant="secondary">Superseded</Badge>;
  }
}

export function getCertificateApprovalBadge(
  status: LevelIIITechnicianCertificateApprovalStatus
) {
  switch (status) {
    case "approved":
      return <Badge>Approved</Badge>;
    case "in_review":
      return <Badge variant="secondary">In Review</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "draft":
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}

export function getRequirementStatusBadge(status: PortalRequirementStatus) {
  switch (status) {
    case "current":
      return <Badge>Current</Badge>;
    case "no_expiry":
      return <Badge variant="secondary">N/A / No Expiry</Badge>;
    case "expiring":
      return <Badge variant="secondary">Expiring</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    case "pending_review":
      return <Badge variant="outline">Pending Review</Badge>;
    case "missing":
    default:
      return <Badge variant="outline">Missing</Badge>;
  }
}

export function getPortalServiceRequestStatusBadge(
  status: PortalServiceRequestStatus
) {
  switch (status) {
    case "submitted":
      return <Badge variant="secondary">Submitted</Badge>;
    case "in_review":
      return <Badge variant="outline">In Review</Badge>;
    case "planned":
      return <Badge className="bg-sky-100 text-sky-800">Planned</Badge>;
    case "scheduled":
      return <Badge className="bg-indigo-100 text-indigo-800">Scheduled</Badge>;
    case "completed":
      return <Badge className="bg-emerald-100 text-emerald-800">Completed</Badge>;
    case "closed":
      return <Badge variant="secondary">Closed</Badge>;
  }
}

export function getPortalCommentStatusBadge(status: PortalCommentStatus) {
  switch (status) {
    case "open":
      return <Badge variant="destructive">Open</Badge>;
    case "acknowledged":
      return <Badge variant="outline">Acknowledged</Badge>;
    case "closed":
      return <Badge variant="secondary">Closed</Badge>;
  }
}

export function getPortalCommentTypeLabel(type: PortalCommentRequestType) {
  switch (type) {
    case "contact_request":
      return "Contact Request";
    case "suggestion":
      return "Suggestion";
    case "general_comment":
    default:
      return "General Comment";
  }
}

export function getPortalActionQueuePriorityBadge(
  priority: PortalActionQueuePriority
) {
  switch (priority) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "high":
      return <Badge className="bg-amber-100 text-amber-900">High</Badge>;
    case "normal":
    default:
      return <Badge variant="outline">Normal</Badge>;
  }
}

export function isAssessmentPortalRequest(request: PortalServiceRequest) {
  const metadata = normalisePortalServiceRequestMetadata(request.metadata);
  const requestText = [request.requestType, request.serviceDefinitionTitle, request.title]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    requestText.includes("assessment") ||
    requestText.includes("booking") ||
    metadata.selectedTechniques.length > 0 ||
    metadata.readinessBringItems.length > 0 ||
    metadata.readinessCompanyItems.length > 0 ||
    metadata.uncoveredTechniques.length > 0
  );
}

export function getAssessmentBookingReadinessSnapshot(
  request: PortalServiceRequest
): AssessmentBookingReadinessSnapshot {
  const metadata = normalisePortalServiceRequestMetadata(request.metadata);
  const requiredUploadLabels = Array.from(
    new Set(
      [...request.requestedDocuments, ...metadata.readinessCompanyItems]
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    )
  );
  const uploadedLabels = new Set(
    request.supportingDocuments
      .filter((document) => Boolean(document.fileUrl))
      .map((document) => document.label.trim().toLowerCase())
  );
  const outstandingUploadLabels = requiredUploadLabels.filter(
    (label) => !uploadedLabels.has(label.toLowerCase())
  );
  const state =
    metadata.uncoveredTechniques.length > 0
      ? "guide_setup_needed"
      : outstandingUploadLabels.length > 0
        ? "uploads_needed"
        : "ready";

  return {
    state,
    selectedTechniques:
      metadata.selectedTechniques.length > 0
        ? metadata.selectedTechniques
        : request.techniques,
    matchedGuideTitles: metadata.matchedGuideTitles,
    bringItems: metadata.readinessBringItems,
    companyItems: metadata.readinessCompanyItems,
    uncoveredTechniques: metadata.uncoveredTechniques,
    uploadedCount: requiredUploadLabels.length - outstandingUploadLabels.length,
    requiredUploadCount: requiredUploadLabels.length,
    outstandingUploadLabels,
    plannerNotes: metadata.plannerNotes,
  };
}

export function getAssessmentBookingReadinessBadge(readiness: {
  state: "ready" | "uploads_needed" | "guide_setup_needed";
}) {
  switch (readiness.state) {
    case "guide_setup_needed":
      return <Badge variant="destructive">Guide setup needed</Badge>;
    case "uploads_needed":
      return <Badge className="bg-amber-100 text-amber-900">Need uploads</Badge>;
    case "ready":
    default:
      return <Badge className="bg-emerald-100 text-emerald-900">Ready pack</Badge>;
  }
}

export function getAssessmentBookingBlockingSummary(readiness: {
  state: "ready" | "uploads_needed" | "guide_setup_needed";
  uncoveredTechniques: string[];
  outstandingUploadLabels: string[];
}) {
  const parts: string[] = [];
  if (readiness.uncoveredTechniques.length > 0) {
    parts.push(`guide gaps: ${readiness.uncoveredTechniques.join(", ")}`);
  }
  if (readiness.outstandingUploadLabels.length > 0) {
    parts.push(
      `outstanding uploads: ${readiness.outstandingUploadLabels.join(", ")}`
    );
  }
  return parts.join(" | ");
}

export function getPortalRequestDocumentAutomationRules(
  request: PortalServiceRequest,
  technicians: LevelIIITechnician[]
) {
  const metadata = normalisePortalServiceRequestMetadata(request.metadata);
  const technician =
    request.technicianId !== null
      ? technicians.find((entry) => entry.id === request.technicianId) ?? null
      : null;
  const techniques =
    metadata.selectedTechniques.length > 0
      ? metadata.selectedTechniques
      : request.techniques;
  if (
    !isLikelyLevelIIIAssessmentRequest({
      title: request.title,
      requestType: request.requestType,
      techniques,
    })
  ) {
    return [];
  }
  return buildLevelIIIDocumentAutomationRules({
    technicianName: request.technicianName ?? technician?.name ?? null,
    techniques,
    methodQualifications: technician
      ? getTechnicianMethodQualifications(technician)
      : [],
    requestedDocuments: request.requestedDocuments,
  });
}

export function getNextPortalServiceRequestStatus(
  status: PortalServiceRequestStatus
): PortalServiceRequestStatus | null {
  switch (status) {
    case "submitted":
      return "in_review";
    case "in_review":
      return "planned";
    case "planned":
      return "scheduled";
    case "scheduled":
      return "completed";
    case "completed":
      return "closed";
    case "closed":
    default:
      return null;
  }
}

export function getNextPortalCommentStatus(
  status: PortalCommentStatus
): PortalCommentStatus | null {
  switch (status) {
    case "open":
      return "acknowledged";
    case "acknowledged":
      return "closed";
    case "closed":
    default:
      return null;
  }
}

export function getPortalRequestActivityType(
  requestType: string,
  fallback: LevelIIIActivityType = "General"
): LevelIIIActivityType {
  const value = requestType.toLowerCase();
  if (value.includes("assessment")) return "Assessment";
  if (value.includes("procedure")) return "Procedure Review";
  if (value.includes("visit")) return "Visit";
  if (value.includes("call") || value.includes("contact")) return "Call";
  if (value.includes("email")) return "Email";
  return fallback;
}

export function formatAssessmentMethods(
  assessment: Pick<LevelIIIAssessment, "method" | "level" | "methodLevels">
) {
  const methodLevels = getAssessmentMethodLevels(assessment);
  return methodLevels.length > 0
    ? methodLevels.map((entry) => entry.method).join(", ")
    : assessment.method;
}

export function compareCertificatePreviewRecency(
  left: Pick<LevelIIITechnicianCertificate, "id" | "issuedDate" | "createdAt">,
  right: {
    id: number;
    issuedDate: string | Date | null;
    createdAt?: string | Date | null;
  }
) {
  const leftIssued = parseOptionalDate(left.issuedDate)?.getTime() ?? 0;
  const rightIssued = parseOptionalDate(right.issuedDate)?.getTime() ?? 0;
  if (leftIssued !== rightIssued) {
    return leftIssued - rightIssued;
  }
  const leftCreated = parseOptionalDate(left.createdAt)?.getTime() ?? 0;
  const rightCreated = parseOptionalDate(right.createdAt)?.getTime() ?? 0;
  if (leftCreated !== rightCreated) {
    return leftCreated - rightCreated;
  }
  return left.id - right.id;
}

export function isCertificateExpiringSoon(
  record: Pick<LevelIIITechnicianCertificate, "validUntil" | "status">
) {
  if (
    !record.validUntil ||
    record.status === "Revoked" ||
    record.status === "Superseded"
  ) {
    return false;
  }
  const target = new Date(record.validUntil);
  const today = new Date();
  return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
}

export function getCertificateQueuePriority(
  record: LevelIIITechnicianCertificate
) {
  if (record.approvalStatus === "in_review") return 0;
  if (record.status === "Active" && isCertificateExpiringSoon(record)) return 1;
  if (record.approvalStatus === "draft" || record.approvalStatus === "rejected")
    return 2;
  if (record.status === "Active") return 3;
  if (record.approvalStatus === "approved") return 4;
  if (record.status === "Superseded") return 5;
  return 6;
}

export function compareCertificateQueueRows(
  left: LevelIIITechnicianCertificate,
  right: LevelIIITechnicianCertificate
) {
  const priorityDifference =
    getCertificateQueuePriority(left) - getCertificateQueuePriority(right);
  if (priorityDifference !== 0) {
    return priorityDifference;
  }
  const leftValidUntil =
    parseOptionalDate(left.validUntil)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightValidUntil =
    parseOptionalDate(right.validUntil)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftValidUntil !== rightValidUntil) {
    return leftValidUntil - rightValidUntil;
  }
  return compareCertificatePreviewRecency(right, left);
}

export function getLevelIIIAutoSupersededCertificateNumbers(
  certificate: Pick<
    LevelIIITechnicianCertificate,
    "autoSupersededCertificates"
  >
) {
  return (certificate.autoSupersededCertificates ?? [])
    .map((entry) => String(entry.certificateNumber ?? "").trim())
    .filter(Boolean);
}

export function extractLevelIIICertificateBlockingConflictNumber(
  message: string
) {
  const match = message.match(/technician scope \(([^)]+)\)/i);
  return match?.[1]?.trim() || null;
}

export function formatAssessmentLevels(
  assessment: Pick<LevelIIIAssessment, "method" | "level" | "methodLevels">
) {
  const methodLevels = getAssessmentMethodLevels(assessment);
  if (methodLevels.length === 0) return assessment.level;
  const uniqueLevels = Array.from(
    new Set(methodLevels.map((entry) => entry.level))
  );
  if (uniqueLevels.length === 1) {
    return uniqueLevels[0] ?? assessment.level;
  }
  return methodLevels
    .map((entry) => `${entry.method}: ${entry.level}`)
    .join(" | ");
}

export function formatAssessmentMethodLevelSummary(
  assessment: Pick<LevelIIIAssessment, "method" | "level" | "methodLevels">
) {
  const methodLevels = getAssessmentMethodLevels(assessment);
  if (methodLevels.length === 0) {
    return [assessment.method, assessment.level].filter(Boolean).join(" ");
  }
  return methodLevels
    .map((entry) => `${entry.method} ${entry.level}`)
    .join(" | ");
}

export function slugifyCertificateExportName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createEmptyAssessmentForm() {
  return {
    technicianId: "",
    assessmentDate: "",
    assessor: "",
    result: "Pending Review" as const,
    nextReviewDate: "",
    evidenceUrl: "",
    notes: "",
    methodLevels: [] as LevelIIIAssessmentMethodLevel[],
  };
}

export function createEmptyTechnicianForm() {
  return {
    clientId: "",
    clientBranchId: "unassigned",
    name: "",
    email: "",
    phone: "",
    hasPcnQualification: false,
    certificateNumber: "",
    pcnRenewalDate: "",
    internalAssessmentDate: "",
    eyeTestValidUntil: "",
    procedureStatus: "",
    notes: "",
    methodQualifications: [] as LevelIIITechnicianMethodQualification[],
  };
}

export function createEmptyTechnicianCertificateForm() {
  return {
    technicianId: "",
    assessmentId: "",
    certificateNumber: "",
    issuedDate: getDateInputValue(new Date()),
    validUntil: "",
    validityValue: "5",
    validityUnit: "years" as const,
    status: "Active" as const,
    approvalStatus: "draft" as const,
    notes: "",
    fileName: "",
    fileUrl: "",
    attachmentFileDataUrl: "",
    attachmentFileName: "",
    methodLevels: [] as LevelIIIAssessmentMethodLevel[],
  };
}

export function readLevelIIIFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function createEmptyTechnicianRequirementForm() {
  return {
    technicianId: "",
    definitionId: "",
    status: "missing" as const,
    issuedAt: "",
    validUntil: "",
    notes: "",
    attachmentFile: "",
  };
}

export function createEmptyTechnicianDirectUploadForm() {
  return {
    documentLabel: "",
    fileName: "",
    issuedAt: "",
    notes: "Select a document type to populate the suggested storage folder.",
    attachmentFile: "",
    attachmentFileName: "",
  };
}

export function createEmptyLevelIIIDocumentDefinitionForm() {
  return {
    name: "",
    category: "Core Document",
    description: "",
    validityMode: "na" as const,
    validityDays: "",
    reminderDays: "30",
    sortOrder: "0",
    isRequired: true,
    active: true,
  };
}

export function getQualificationTypeLabel(
  technician: Pick<LevelIIITechnician, "hasPcnQualification">
) {
  return technician.hasPcnQualification ? "PCN" : "SNT-TC-1A";
}

export function getQualificationReviewDate(
  technician: Pick<
    LevelIIITechnician,
    "hasPcnQualification" | "pcnRenewalDate" | "internalAssessmentDate"
  >
) {
  return technician.hasPcnQualification
    ? technician.pcnRenewalDate
    : technician.internalAssessmentDate;
}

export function getQualificationReviewLabel(
  technician: Pick<LevelIIITechnician, "hasPcnQualification">
) {
  return technician.hasPcnQualification
    ? "PCN Re-certification"
    : "Internal Assessment";
}

export function getDueBadge(dateValue: string | Date | null) {
  if (!dateValue) return <Badge variant="outline">Not Set</Badge>;
  const target = new Date(dateValue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return <Badge variant="destructive">Overdue</Badge>;
  if (diffDays <= 30) return <Badge variant="secondary">Due Soon</Badge>;
  return <Badge>Current</Badge>;
}

export function buildLevelIIIDocumentGenerationItemSignature(
  item: LevelIIIDocumentGenerationQueueItem
) {
  return [
    item.certificate.id,
    item.priorityLabel,
    item.certificate.approvalStatus,
    item.certificate.status,
    item.hasStoredFile ? "stored" : "unstored",
    item.hasApprovedControlledDocument ? "controlled-release" : "no-controlled-release",
    item.controlledDocumentCount,
    item.controlledDraftCount,
    item.controlledInReviewCount,
    item.controlledRejectedCount,
    item.missingEvidenceCount,
    item.pendingReviewCount,
    item.reasons.join("|"),
  ].join("::");
}
