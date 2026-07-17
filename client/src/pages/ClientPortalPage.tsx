import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { ImportDialog, type ImportDialogResult } from "@/components/ImportDialog";
import {
  FormDialog,
  type CustomFieldBuilderItem,
  type FormField,
} from "@/components/FormDialog";
import { getClientLoginUrl } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  buildLevelIIIDocumentAutomationRules,
  findLevelIIIDocumentAutomationRuleByLabel,
} from "@shared/levelIIIDocumentAutomation";
import {
  BookOpenCheck,
  Building2,
  ClipboardList,
  AlertTriangle,
  Clock3,
  Copy,
  ExternalLink,
  FileDown,
  FileText,
  LockKeyhole,
  Mail,
  MessageSquare,
  Plus,
  ShieldCheck,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PortalAccessLevel = "viewer" | "editor" | "manager";
type PortalRequirementStatus =
  | "missing"
  | "current"
  | "expiring"
  | "expired"
  | "pending_review";
type PortalCustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox";
type PortalRequirementCustomField = {
  key: string;
  label: string;
  type: PortalCustomFieldType;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  options: string[];
  sortOrder: number;
};

type PortalClient = {
  id: number;
  companyName: string;
  primaryContact: string;
  email: string;
  accessLevel: PortalAccessLevel;
  receiveReminders: boolean;
};

type PortalDashboard = {
  technicianCount: number;
  requirementDefinitionCount: number;
  totalTrackedItems: number;
  missingCount: number;
  expiringCount: number;
  expiredCount: number;
  pendingReviewCount: number;
  documentCount: number;
  documentReviewDueCount: number;
  documentExpiredCount: number;
  reminders: Array<{
    technicianId: number;
    technicianName: string;
    definitionName: string;
    status: PortalRequirementStatus;
    validUntil: string | Date | null;
  }>;
};

type PortalTechnician = {
  id: number;
  name: string;
  email: string;
  methods: string[];
  level: string;
  methodQualifications?: PortalTechnicianMethodQualification[];
  eyeTestValidUntil: string | Date | null;
  pcnRenewalDate: string | Date | null;
  internalAssessmentDate: string | Date | null;
  phone?: string | null;
  hasPcnQualification?: boolean;
  certificateNumber?: string | null;
  procedureStatus?: string | null;
  notes?: string | null;
  clientBranchId?: number | null;
};

type PortalMethod = {
  id: number;
  name: string;
  color?: string | null;
};

type PortalTechnicianMethodQualification = {
  method: string;
  level: string;
};

type PortalRequirementDefinition = {
  id: number;
  clientId: number;
  name: string;
  category: string;
  description: string | null;
  validityDays: number | null;
  reminderDays: number;
  isRequired: boolean;
  active: boolean;
  sortOrder: number;
  customFields: PortalRequirementCustomField[];
};

type PortalRequirementRow = {
  recordId: number | null;
  technicianId: number;
  technicianName: string;
  technicianEmail: string;
  technicianMethods: string[];
  technicianLevel: string;
  definitionId: number;
  definitionName: string;
  definitionCategory: string;
  definitionDescription: string | null;
  validityDays: number | null;
  reminderDays: number;
  isRequired: boolean;
  definitionCustomFields: PortalRequirementCustomField[];
  status: PortalRequirementStatus;
  issuedAt: string | Date | null;
  validUntil: string | Date | null;
  notes: string | null;
  customFieldValues: Record<string, string | number | boolean | null>;
  documentCount: number;
  latestDocumentName: string | null;
  latestDocumentUrl: string | null;
};

type RequirementTableRow = PortalRequirementRow & { id: string | number };

type PortalAssignment = {
  id: number;
  clientId: number;
  userId: number;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  lastSignedIn?: string | Date | null;
  loginEnabled?: boolean;
  accessLevel: PortalAccessLevel;
  receiveReminders: boolean;
  userName: string | null;
  userEmail: string | null;
  userRole: "user" | "admin" | "super_admin";
  mustChangePassword?: boolean;
  branchIds?: number[];
};

type AssignmentTableRow = PortalAssignment & { id: number };

type PortalAssignableUser = {
  id: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "super_admin";
};

type PortalCredentialHandoff = {
  userId: number;
  name: string | null;
  email: string;
  password: string;
  mode: "created" | "reset";
  emailConfigured: boolean;
  emailSent: boolean;
};

type PortalReminderSettings = {
  clientId: number;
  complianceEnabled: boolean;
  documentEnabled: boolean;
  includeMissingRequired: boolean;
  includePendingReview: boolean;
  documentLeadDays: number;
  complianceEscalationDays: number;
  documentEscalationDays: number;
  sendToAssignedUsers: boolean;
  sendToInternalAdmins: boolean;
  escalationManagersOnly: boolean;
  allowedClientDocumentLabels: string[];
};

type PortalClientDocumentStatus = "active" | "archived" | "superseded";
type PortalClientDocumentHealth =
  | "current"
  | "review_due"
  | "expired"
  | PortalClientDocumentStatus;
type RequiredClientDocumentHealth = PortalClientDocumentHealth | "missing";
type PortalCommentRequestType = "general_comment" | "contact_request" | "suggestion";
type PortalCommentStatus = "open" | "acknowledged" | "closed";
type PortalClientResourceType = "file" | "link";
type PortalApprovalEntityType =
  | "technician"
  | "requirement_record"
  | "client_document"
  | "resource";
type PortalApprovalAction = "create" | "update" | "delete" | "upsert";
type PortalApprovalStatus = "pending" | "approved" | "rejected";
type PortalStoredFileReference = {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  contentType: string | null;
};
type PortalApprovalRequestPayload = {
  action: PortalApprovalAction;
  data?: Record<string, unknown> | null;
  previousData?: Record<string, unknown> | null;
  storedFile?: PortalStoredFileReference | null;
};

type PortalClientDocument = {
  id: number;
  clientId: number;
  clientBranchId: number | null;
  branchName?: string | null;
  title: string;
  category: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fileKey: string;
  contentType: string | null;
  sourceFileName?: string | null;
  sourcePath?: string | null;
  reviewDate: string | Date | null;
  validUntil: string | Date | null;
  status: PortalClientDocumentStatus;
  health: PortalClientDocumentHealth;
  uploadedByUserId: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type TechnicianSummaryRow = {
  id: number;
  name: string;
  methods: string;
  level: string;
  current: number;
  expiring: number;
  expired: number;
  missing: number;
  nextEyeTest: string | Date | null;
};

type AssessmentReadinessStatus =
  | "ready"
  | "booking_in_progress"
  | "needs_preparation"
  | "needs_guidance";

type AssessmentReadinessRow = {
  id: number;
  name: string;
  branchName: string;
  techniques: string;
  status: AssessmentReadinessStatus;
  pendingCount: number;
  uncoveredTechniqueCount: number;
  latestRequestStatus: PortalServiceRequestStatus | null;
  latestRequestDate: string | Date | null;
};

type TechnicianProfileDetail = {
  technician: PortalTechnician;
  branchName: string | null;
  methodQualifications: PortalTechnicianMethodQualification[];
  requirementRows: PortalRequirementRow[];
  pendingRows: PortalRequirementRow[];
  pendingReviewRows: PortalRequirementRow[];
  matchedGuides: PortalAssessmentGuide[];
  uncoveredTechniques: string[];
  readinessBringItems: string[];
  readinessCompanyItems: string[];
  relatedAssessmentRequests: PortalServiceRequest[];
  currentCount: number;
  expiringCount: number;
  expiredCount: number;
  missingCount: number;
};

type AssessmentBookingPlannerDetail = {
  technician: PortalTechnician;
  branchName: string | null;
  techniqueOptions: string[];
  selectedTechniques: string[];
  matchedGuides: PortalAssessmentGuide[];
  uncoveredTechniques: string[];
  bringItems: string[];
  companyItems: string[];
  recentRequests: PortalServiceRequest[];
};

type ClientDocumentTableRow = PortalClientDocument;
type RequiredClientDocumentCoverageRow = {
  id: string;
  documentType: string;
  branchName: string;
  health: RequiredClientDocumentHealth;
  category: string;
  reviewDate: string | Date | null;
  validUntil: string | Date | null;
  updatedAt: string | Date | null;
  latestDocumentId: number | null;
};
type RequiredClientDocumentActionQueueRow = {
  id: string;
  documentType: string;
  branchName: string;
  health: "missing" | "review_due" | "expired";
  actionLabel: string;
  reason: string;
  reviewDate: string | Date | null;
  validUntil: string | Date | null;
  latestDocumentId: number | null;
};

type PortalComment = {
  id: number;
  clientId: number;
  userId: number;
  requestType: PortalCommentRequestType;
  subject: string;
  message: string;
  status: PortalCommentStatus;
  internalNotes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdByName: string | null;
  createdByEmail: string | null;
};

type PortalClientResource = {
  id: number;
  clientId: number;
  clientBranchId: number | null;
  branchName?: string | null;
  title: string;
  category: string;
  description: string | null;
  resourceType: PortalClientResourceType;
  linkUrl: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileKey: string | null;
  contentType: string | null;
  sortOrder: number;
  active: boolean;
  uploadedByUserId: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PortalApprovalRequest = {
  id: number;
  clientId: number;
  entityType: PortalApprovalEntityType;
  action: PortalApprovalAction;
  entityId: number | null;
  summary: string;
  payload: PortalApprovalRequestPayload;
  status: PortalApprovalStatus;
  submittedByUserId: number;
  submittedByName: string | null;
  submittedByEmail: string | null;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  reviewedByEmail: string | null;
  reviewNotes: string | null;
  reviewedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PortalBranch = {
  id: number;
  clientId: number;
  sourceClientId?: number | null;
  sourceClientName?: string | null;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  sortOrder: number;
};

type PortalBranchImportCandidate = {
  id: number;
  companyName: string;
  primaryContact: string;
  email: string;
  phone: string;
  technicianCount: number;
  activityCount: number;
};

type PortalServiceRequestStatus =
  | "submitted"
  | "in_review"
  | "planned"
  | "scheduled"
  | "completed"
  | "closed";

type PortalServiceDefinitionConfig = {
  allowBranchSelection: boolean;
  allowTechnicianSelection: boolean;
  allowMultipleTechniques: boolean;
  allowPreferredDate: boolean;
  requestLabel: string;
  techniqueOptions: string[];
  requestedDocumentLabels: string[];
};
type PortalServiceRequestSupportingDocument = {
  label: string;
  note: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileKey?: string | null;
  contentType?: string | null;
  fileDataUrl?: string | null;
  classifiedLabel?: string | null;
  storagePath?: string | null;
  suggestedFileName?: string | null;
  linkedRequirementDefinitionId?: number | null;
  linkedRequirementDefinitionName?: string | null;
};
type PortalServiceRequestMetadata = {
  supportingDocuments: PortalServiceRequestSupportingDocument[];
  clientVisibleUpdate: string | null;
  internalOwner: string | null;
  plannedAction: string | null;
  confirmedDate: string | Date | null;
  linkedActivityId: number | null;
  selectedTechniques: string[];
  matchedGuideTitles: string[];
  readinessBringItems: string[];
  readinessCompanyItems: string[];
  uncoveredTechniques: string[];
  plannerNotes: string | null;
  [key: string]: unknown;
};
type PortalLinkedLevelIIIActivity = {
  id: number;
  activityType: string;
  subject: string;
  activityDate: string | Date;
  nextActionDate: string | Date | null;
  status: string;
  notes: string | null;
};

type PortalServiceDefinition = {
  id: number;
  clientId: number;
  title: string;
  category: string;
  description: string | null;
  instructions: string | null;
  active: boolean;
  sortOrder: number;
  config: PortalServiceDefinitionConfig;
};

type PortalServiceRequest = {
  id: number;
  clientId: number;
  clientBranchId: number | null;
  branchName: string | null;
  serviceDefinitionId: number | null;
  serviceDefinitionTitle: string | null;
  userId: number;
  requestedByName: string | null;
  requestedByEmail: string | null;
  technicianId: number | null;
  technicianName: string | null;
  title: string;
  requestType: string;
  status: PortalServiceRequestStatus;
  preferredDate: string | Date | null;
  techniques: string[];
  details: string | null;
  requestedDocuments: string[];
  supportingDocuments: PortalServiceRequestSupportingDocument[];
  internalNotes: string | null;
  metadata: PortalServiceRequestMetadata | null;
  linkedActivity?: PortalLinkedLevelIIIActivity | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PortalAssessmentGuide = {
  id: number;
  clientId: number;
  clientBranchId: number | null;
  branchName: string | null;
  title: string;
  techniqueName: string;
  description: string | null;
  bringItems: string[];
  companyItems: string[];
  active: boolean;
  sortOrder: number;
};

type PortalActivityItem = {
  id: number;
  createdAt: string | Date;
  actorName: string | null;
  actorEmail: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT";
  entityType: string;
  entityLabel: string;
  focus: string;
  title: string;
  description: string;
  status: "Success" | "Failed";
};

type PortalTechnicianFormState = {
  name: string;
  email: string;
  phone: string;
  hasPcnQualification: boolean;
  certificateNumber: string;
  pcnRenewalDate: string;
  internalAssessmentDate: string;
  eyeTestValidUntil: string;
  procedureStatus: string;
  clientBranchId: string;
  notes: string;
  methodQualifications: PortalTechnicianMethodQualification[];
};

function getDateInputValue(value: string | Date | null | undefined) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function normalisePortalTechniqueKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getExtensionFromDataUrl(value: string | null | undefined) {
  const match = String(value ?? "").match(/^data:([^;]+);base64,/i);
  const contentType = match?.[1]?.toLowerCase() ?? "";
  switch (contentType) {
    case "application/pdf":
      return ".pdf";
    case "image/png":
      return ".png";
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "application/msword":
      return ".doc";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return ".docx";
    case "application/vnd.ms-excel":
      return ".xls";
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return ".xlsx";
    case "text/csv":
      return ".csv";
    default:
      return "";
  }
}

function slugifyPortalStorageSegment(value: string | null | undefined, fallback = "item") {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function buildPortalPreviewFileName(baseName: string, fileDataUrl?: string | null) {
  const safeBaseName = String(baseName ?? "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const extension = getExtensionFromDataUrl(fileDataUrl);
  return safeBaseName ? `${safeBaseName}${extension}` : `file${extension}`;
}

function isAssessmentRelatedText(value: string | null | undefined) {
  return /\b(assessment|booking|appointment|book)\b/i.test(String(value ?? ""));
}

function getStatusBadge(status: PortalRequirementStatus) {
  switch (status) {
    case "current":
      return <Badge>Current</Badge>;
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

function getDocumentHealthBadge(health: PortalClientDocumentHealth) {
  switch (health) {
    case "current":
      return <Badge>Current</Badge>;
    case "review_due":
      return <Badge variant="secondary">Review Due</Badge>;
    case "expired":
      return <Badge variant="destructive">Expired</Badge>;
    case "archived":
      return <Badge variant="outline">Archived</Badge>;
    case "superseded":
      return <Badge variant="outline">Superseded</Badge>;
    case "active":
    default:
      return <Badge>Active</Badge>;
  }
}

function getRequiredClientDocumentHealthBadge(health: RequiredClientDocumentHealth) {
  if (health === "missing") {
    return <Badge variant="outline">Missing</Badge>;
  }
  return getDocumentHealthBadge(health);
}

function getCommentTypeLabel(type: PortalCommentRequestType) {
  switch (type) {
    case "contact_request":
      return "Contact Request";
    case "suggestion":
      return "Suggestion";
    case "general_comment":
    default:
      return "Comment";
  }
}

function getCommentStatusBadge(status: PortalCommentStatus) {
  switch (status) {
    case "acknowledged":
      return <Badge variant="secondary">Acknowledged</Badge>;
    case "closed":
      return <Badge variant="outline">Closed</Badge>;
    case "open":
    default:
      return <Badge>Open</Badge>;
  }
}

function getServiceRequestStatusBadge(status: PortalServiceRequestStatus) {
  switch (status) {
    case "completed":
      return <Badge>Completed</Badge>;
    case "scheduled":
      return <Badge variant="secondary">Scheduled</Badge>;
    case "planned":
      return <Badge variant="secondary">Planned</Badge>;
    case "closed":
      return <Badge variant="outline">Closed</Badge>;
    case "in_review":
      return <Badge variant="outline">In Review</Badge>;
    case "submitted":
    default:
      return <Badge variant="outline">Submitted</Badge>;
  }
}

function getAssessmentReadinessBadge(status: AssessmentReadinessStatus) {
  switch (status) {
    case "ready":
      return <Badge>Ready To Book</Badge>;
    case "booking_in_progress":
      return <Badge variant="secondary">Booking In Progress</Badge>;
    case "needs_guidance":
      return <Badge variant="destructive">Guide Setup Needed</Badge>;
    case "needs_preparation":
    default:
      return <Badge variant="outline">Preparation Needed</Badge>;
  }
}

type ServiceRequestSchedulingReadinessState =
  | "ready"
  | "waiting_for_uploads"
  | "waiting_for_guidance";

type ServiceRequestSchedulingReadiness = {
  state: ServiceRequestSchedulingReadinessState;
  uploadedCount: number;
  requiredUploadCount: number;
  outstandingUploadLabels: string[];
  uncoveredTechniques: string[];
};

function getServiceRequestSchedulingReadiness(
  request: PortalServiceRequest,
  metadata: PortalServiceRequestMetadata
): ServiceRequestSchedulingReadiness {
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

  if (metadata.uncoveredTechniques.length > 0) {
    return {
      state: "waiting_for_guidance",
      uploadedCount: requiredUploadLabels.length - outstandingUploadLabels.length,
      requiredUploadCount: requiredUploadLabels.length,
      outstandingUploadLabels,
      uncoveredTechniques: metadata.uncoveredTechniques,
    };
  }

  if (outstandingUploadLabels.length > 0) {
    return {
      state: "waiting_for_uploads",
      uploadedCount: requiredUploadLabels.length - outstandingUploadLabels.length,
      requiredUploadCount: requiredUploadLabels.length,
      outstandingUploadLabels,
      uncoveredTechniques: [],
    };
  }

  return {
    state: "ready",
    uploadedCount: requiredUploadLabels.length,
    requiredUploadCount: requiredUploadLabels.length,
    outstandingUploadLabels: [],
    uncoveredTechniques: [],
  };
}

function getServiceRequestSchedulingReadinessBadge(
  readiness: ServiceRequestSchedulingReadiness
) {
  switch (readiness.state) {
    case "waiting_for_guidance":
      return <Badge variant="destructive">Waiting For Guide Setup</Badge>;
    case "waiting_for_uploads":
      return <Badge className="bg-amber-100 text-amber-900">Waiting For Uploads</Badge>;
    case "ready":
    default:
      return <Badge className="bg-emerald-100 text-emerald-900">Ready For Scheduling</Badge>;
  }
}

function getApprovalEntityLabel(entityType: PortalApprovalEntityType) {
  switch (entityType) {
    case "technician":
      return "Technician";
    case "requirement_record":
      return "Compliance";
    case "client_document":
      return "Client Document";
    case "resource":
      return "Resource";
    default:
      return entityType;
  }
}

function getApprovalActionLabel(action: PortalApprovalAction) {
  switch (action) {
    case "create":
      return "Create";
    case "update":
      return "Update";
    case "delete":
      return "Delete";
    case "upsert":
      return "Update";
    default:
      return action;
  }
}

function getApprovalStatusBadge(status: PortalApprovalStatus) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>;
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    case "pending":
    default:
      return <Badge className="bg-amber-100 text-amber-800">Pending Review</Badge>;
  }
}

function getPortalActivityStatusBadge(activity: PortalActivityItem) {
  if (activity.status === "Failed") {
    return <Badge variant="destructive">Failed</Badge>;
  }

  if (activity.entityType === "client_portal_approval") {
    if (/approved/i.test(activity.title)) {
      return <Badge className="bg-emerald-100 text-emerald-800">Approved</Badge>;
    }
    if (/rejected/i.test(activity.title)) {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (/submitted|sent/i.test(activity.title)) {
      return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    }
  }

  if (activity.action === "DELETE") {
    return <Badge variant="outline">Removed</Badge>;
  }

  if (activity.action === "CREATE") {
    return <Badge>New</Badge>;
  }

  return <Badge variant="secondary">Updated</Badge>;
}

function humaniseApprovalFieldKey(key: string) {
  const finalSegment = key.split(".").pop() ?? key;
  return finalSegment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

function isPlainApprovalObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function flattenApprovalObject(
  value: Record<string, unknown> | null | undefined,
  prefix = ""
): Record<string, unknown> {
  if (!value) return {};

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, rawValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (
      rawValue &&
      typeof rawValue === "object" &&
      !Array.isArray(rawValue) &&
      !(rawValue instanceof Date)
    ) {
      Object.assign(result, flattenApprovalObject(rawValue as Record<string, unknown>, nextKey));
    } else {
      result[nextKey] = rawValue;
    }
    return result;
  }, {});
}

function areApprovalValuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function formatApprovalValue(
  value: unknown,
  key: string,
  options?: {
    techniciansById?: Map<number, PortalTechnician>;
    definitionsById?: Map<number, PortalRequirementDefinition>;
  }
) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (
      value.every(
        (entry) =>
          entry &&
          typeof entry === "object" &&
          "method" in (entry as Record<string, unknown>) &&
          "level" in (entry as Record<string, unknown>)
      )
    ) {
      return value
        .map((entry) => {
          const record = entry as Record<string, unknown>;
          return `${String(record.method ?? "").trim()}: ${String(record.level ?? "").trim()}`;
        })
        .join(" | ");
    }
    return value.map((entry) => String(entry)).join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number" && key === "technicianId") {
    return options?.techniciansById?.get(value)?.name ?? `Technician #${value}`;
  }

  if (typeof value === "number" && key === "definitionId") {
    return options?.definitionsById?.get(value)?.name ?? `Requirement #${value}`;
  }

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) {
      return formatDate(value);
    }
    return value.trim() || "-";
  }

  return JSON.stringify(value);
}

function getApprovalFieldLabel(
  request: PortalApprovalRequest,
  key: string,
  definitionsById: Map<number, PortalRequirementDefinition>
) {
  if (request.entityType === "requirement_record" && key.startsWith("customFieldValues.")) {
    const definitionId = Number(
      request.payload.data?.definitionId ?? request.payload.previousData?.definitionId ?? 0
    );
    const definition = definitionsById.get(definitionId);
    const fieldKey = key.slice("customFieldValues.".length);
    const field = definition?.customFields.find((entry) => entry.key === fieldKey);
    return field ? `Client detail: ${field.label}` : `Client detail: ${humaniseApprovalFieldKey(fieldKey)}`;
  }

  const labels: Partial<Record<PortalApprovalEntityType, Record<string, string>>> = {
    technician: {
      name: "Technician name",
      email: "Email",
      phone: "Phone",
      methods: "Methods",
      level: "Level",
      methodQualifications: "Method qualifications",
      clientBranchId: "Client branch",
      hasPcnQualification: "PCN qualified",
      certificateNumber: "Certificate number",
      procedureStatus: "Procedure status",
      pcnRenewalDate: "PCN valid until",
      internalAssessmentDate: "Internal assessment date",
      eyeTestValidUntil: "Eye test valid until",
      notes: "Notes",
    },
    requirement_record: {
      recordId: "Requirement record",
      technicianId: "Technician",
      technicianName: "Technician name",
      definitionId: "Requirement",
      definitionName: "Requirement name",
      status: "Status",
      issuedAt: "Issued at",
      validUntil: "Valid until",
      notes: "Notes",
      latestDocumentName: "Latest evidence file",
    },
    client_document: {
      title: "Document title",
      category: "Category",
      description: "Description",
      reviewDate: "Review date",
      validUntil: "Valid until",
      status: "Status",
      fileName: "File name",
      health: "Health",
    },
    resource: {
      title: "Resource title",
      category: "Category",
      description: "Description",
      resourceType: "Resource type",
      linkUrl: "Link URL",
      fileName: "File name",
      sortOrder: "Sort order",
      active: "Visible to client",
    },
  };

  return labels[request.entityType]?.[key] ?? humaniseApprovalFieldKey(key);
}

function getApprovalComparisonRows(
  request: PortalApprovalRequest,
  definitionsById: Map<number, PortalRequirementDefinition>
) {
  const previous = flattenApprovalObject(request.payload.previousData ?? null);
  const next = flattenApprovalObject(request.payload.data ?? null);
  const keys = Array.from(new Set([...Object.keys(previous), ...Object.keys(next)]));

  return keys
    .filter((key) => {
      if (request.action === "create") return key in next;
      if (request.action === "delete") return key in previous;
      return !areApprovalValuesEqual(previous[key], next[key]);
    })
    .map((key) => ({
      key,
      label: getApprovalFieldLabel(request, key, definitionsById),
      previousValue: previous[key],
      nextValue: next[key],
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function isApprovalRequestResult(value: unknown): value is PortalApprovalRequest {
  return (
    !!value &&
    typeof value === "object" &&
    "status" in value &&
    "entityType" in value &&
    "summary" in value
  );
}

function toBuilderItems(
  fields: PortalRequirementCustomField[] | null | undefined
): CustomFieldBuilderItem[] {
  return (fields ?? []).map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    placeholder: field.placeholder ?? "",
    helpText: field.helpText ?? "",
    optionsText: field.options.join(", "),
  }));
}

function normaliseCustomFieldDefinitions(
  value: unknown
): PortalRequirementCustomField[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .map((entry, index) => {
      const item = (entry ?? {}) as CustomFieldBuilderItem;
      const key = String(item.key ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 64);
      const label = String(item.label ?? "").trim();
      const type = String(item.type ?? "text") as PortalCustomFieldType;
      const options = String(item.optionsText ?? "")
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);

      if (!key || !label) {
        throw new Error("Each custom field needs both a label and field key.");
      }
      if (seen.has(key)) {
        throw new Error(`Duplicate custom field key: ${key}`);
      }
      if (type === "select" && options.length === 0) {
        throw new Error(`Custom field "${label}" needs at least one dropdown option.`);
      }

      seen.add(key);
      return {
        key,
        label,
        type,
        required: Boolean(item.required),
        placeholder: String(item.placeholder ?? "").trim() || null,
        helpText: String(item.helpText ?? "").trim() || null,
        options,
        sortOrder: index,
      };
    })
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildCustomRecordFields(
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
        ? field.options.map((option) => ({
            value: option,
            label: option,
          }))
        : undefined,
    section: "Client-Specific Details",
  }));
}

function getInitialCustomFieldValues(
  definition: PortalRequirementDefinition | null,
  record: PortalRequirementRow | null
) {
  if (!definition) return {};

  return Object.fromEntries(
    definition.customFields.map((field) => {
      const rawValue = record?.customFieldValues?.[field.key];
      return [
        `customField__${field.key}`,
        field.type === "checkbox" ? Boolean(rawValue) : (rawValue ?? ""),
      ];
    })
  );
}

function collectCustomFieldValues(
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

function formatCustomFieldValue(
  field: PortalRequirementCustomField,
  value: string | number | boolean | null | undefined
) {
  if (field.type === "checkbox") {
    return value ? "Yes" : "No";
  }

  if (field.type === "date") {
    return formatDate(typeof value === "string" ? value : null);
  }

  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function getCustomFieldSummary(row: PortalRequirementRow) {
  if (!row.definitionCustomFields.length) return "None";

  const summary = row.definitionCustomFields
    .map((field) => {
      const value = row.customFieldValues?.[field.key];
      if (value === null || value === undefined || value === "") return null;
      if (field.type === "checkbox" && value === false) return null;
      return `${field.label}: ${formatCustomFieldValue(field, value)}`;
    })
    .filter(Boolean);

  return summary.length > 0 ? summary.join(" | ") : "Pending details";
}

function getPortalTechnicianMethodQualifications(
  technician: Pick<
    PortalTechnician,
    "methodQualifications" | "methods" | "level"
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

  const level = String(technician.level ?? "").trim();
  if (!level) return [];
  return (technician.methods ?? [])
    .map((method) => String(method ?? "").trim())
    .filter(Boolean)
    .map((method) => ({ method, level }));
}

function summarisePortalTechnicianLevels(
  methodQualifications: PortalTechnicianMethodQualification[]
) {
  if (methodQualifications.length === 0) return "";
  const uniqueLevels = Array.from(
    new Set(methodQualifications.map((entry) => entry.level.trim()))
  );
  if (uniqueLevels.length === 1) {
    return uniqueLevels[0] ?? "";
  }
  return methodQualifications
    .map((entry) => `${entry.method}: ${entry.level}`)
    .join(" | ");
}

function createEmptyPortalTechnicianForm(): PortalTechnicianFormState {
  return {
    name: "",
    email: "",
    phone: "",
    hasPcnQualification: false,
    certificateNumber: "",
    pcnRenewalDate: "",
    internalAssessmentDate: "",
    eyeTestValidUntil: "",
    procedureStatus: "",
    clientBranchId: "unassigned",
    notes: "",
    methodQualifications: [],
  };
}

function parseLineList(value: unknown) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalisePortalServiceRequestSupportingDocuments(
  value: unknown
): PortalServiceRequestSupportingDocument[] {
  if (!Array.isArray(value)) return [];

  const supportingDocuments: PortalServiceRequestSupportingDocument[] = [];
  const seenLabels = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const source = entry as Record<string, unknown>;
    const label = String(source.label ?? "").trim();
    if (!label) continue;
    const labelKey = label.toLowerCase();
    if (seenLabels.has(labelKey)) continue;
    seenLabels.add(labelKey);
    supportingDocuments.push({
      label,
      note: String(source.note ?? "").trim() || null,
      fileName: String(source.fileName ?? "").trim() || null,
      fileUrl: String(source.fileUrl ?? "").trim() || null,
      fileKey: String(source.fileKey ?? "").trim() || null,
      contentType: String(source.contentType ?? "").trim() || null,
      fileDataUrl: String(source.fileDataUrl ?? "").trim() || null,
      classifiedLabel: String(source.classifiedLabel ?? "").trim() || null,
      storagePath: String(source.storagePath ?? "").trim() || null,
      suggestedFileName: String(source.suggestedFileName ?? "").trim() || null,
      linkedRequirementDefinitionId:
        Number.isInteger(Number(source.linkedRequirementDefinitionId)) &&
        Number(source.linkedRequirementDefinitionId) > 0
          ? Number(source.linkedRequirementDefinitionId)
          : null,
      linkedRequirementDefinitionName:
        String(source.linkedRequirementDefinitionName ?? "").trim() || null,
    });
  }

  return supportingDocuments;
}

function normalisePortalServiceRequestMetadata(value: unknown): PortalServiceRequestMetadata {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    ...source,
    supportingDocuments: normalisePortalServiceRequestSupportingDocuments(
      source.supportingDocuments
    ),
    clientVisibleUpdate: String(source.clientVisibleUpdate ?? "").trim() || null,
    internalOwner: String(source.internalOwner ?? "").trim() || null,
    plannedAction: String(source.plannedAction ?? "").trim() || null,
    confirmedDate:
      source.confirmedDate instanceof Date || typeof source.confirmedDate === "string"
        ? source.confirmedDate
        : null,
    linkedActivityId:
      Number.isInteger(Number(source.linkedActivityId)) && Number(source.linkedActivityId) > 0
        ? Number(source.linkedActivityId)
        : null,
    selectedTechniques: Array.isArray(source.selectedTechniques)
      ? source.selectedTechniques.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [],
    matchedGuideTitles: Array.isArray(source.matchedGuideTitles)
      ? source.matchedGuideTitles.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [],
    readinessBringItems: Array.isArray(source.readinessBringItems)
      ? source.readinessBringItems.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [],
    readinessCompanyItems: Array.isArray(source.readinessCompanyItems)
      ? source.readinessCompanyItems.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [],
    uncoveredTechniques: Array.isArray(source.uncoveredTechniques)
      ? source.uncoveredTechniques.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [],
    plannerNotes: String(source.plannerNotes ?? "").trim() || null,
  };
}

function alignServiceRequestSupportingDocuments(
  labels: string[],
  currentValue: unknown
): PortalServiceRequestSupportingDocument[] {
  const current = normalisePortalServiceRequestSupportingDocuments(currentValue);
  const currentByLabel = new Map(current.map((entry) => [entry.label.toLowerCase(), entry] as const));
  const seen = new Set<string>();

  return labels
    .map((rawLabel) => rawLabel.trim())
    .filter((label) => {
      if (!label) return false;
      const labelKey = label.toLowerCase();
      if (seen.has(labelKey)) return false;
      seen.add(labelKey);
      return true;
    })
    .map((label) => {
      const existing = currentByLabel.get(label.toLowerCase());
      return {
        label,
        note: existing?.note ?? null,
        fileName: existing?.fileName ?? null,
        fileUrl: existing?.fileUrl ?? null,
        fileKey: existing?.fileKey ?? null,
        contentType: existing?.contentType ?? null,
        fileDataUrl: existing?.fileDataUrl ?? null,
        classifiedLabel: existing?.classifiedLabel ?? null,
        storagePath: existing?.storagePath ?? null,
        suggestedFileName: existing?.suggestedFileName ?? null,
        linkedRequirementDefinitionId: existing?.linkedRequirementDefinitionId ?? null,
        linkedRequirementDefinitionName: existing?.linkedRequirementDefinitionName ?? null,
      } satisfies PortalServiceRequestSupportingDocument;
    });
}

function getRequirementStatusPriority(status: PortalRequirementStatus) {
  switch (status) {
    case "missing":
      return 0;
    case "expired":
      return 1;
    case "pending_review":
      return 2;
    case "expiring":
      return 3;
    case "current":
    default:
      return 4;
  }
}

export default function ClientPortalPage() {
  const { user } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: getClientLoginUrl(),
  });
  const utils = trpc.useUtils();
  const [location] = useLocation();
  const { data: accessibleClients = [], isLoading: accessLoading } =
    trpc.clientPortal.access.list.useQuery();

  const requestedClientId = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("clientId");
    return value ? value.trim() : "";
  }, [location]);
  const requestedFocus = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("focus");
    return value ? value.trim() : "";
  }, [location]);
  const requestedBranchId = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("branchId");
    return value ? value.trim() : "";
  }, [location]);

  const [selectedClientId, setSelectedClientId] = useState<string>(() => requestedClientId || "");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => requestedBranchId || "");
  const [isDefinitionDialogOpen, setIsDefinitionDialogOpen] = useState(false);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] = useState(false);
  const [isResetPortalPasswordDialogOpen, setIsResetPortalPasswordDialogOpen] = useState(false);
  const [isClientDocumentDialogOpen, setIsClientDocumentDialogOpen] = useState(false);
  const [isClientDocumentImportDialogOpen, setIsClientDocumentImportDialogOpen] = useState(false);
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [isResourceDialogOpen, setIsResourceDialogOpen] = useState(false);
  const [isReminderSettingsDialogOpen, setIsReminderSettingsDialogOpen] = useState(false);
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
  const [isCreatePortalUserDialogOpen, setIsCreatePortalUserDialogOpen] = useState(false);
  const [isCredentialHandoffDialogOpen, setIsCredentialHandoffDialogOpen] = useState(false);
  const [isApprovalReviewDialogOpen, setIsApprovalReviewDialogOpen] = useState(false);
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false);
  const [isBranchImportDialogOpen, setIsBranchImportDialogOpen] = useState(false);
  const [isServiceRequestDialogOpen, setIsServiceRequestDialogOpen] = useState(false);
  const [isServiceDefinitionDialogOpen, setIsServiceDefinitionDialogOpen] = useState(false);
  const [isAssessmentGuideDialogOpen, setIsAssessmentGuideDialogOpen] = useState(false);
  const [technicianForm, setTechnicianForm] = useState<PortalTechnicianFormState>(
    createEmptyPortalTechnicianForm
  );
  const [editingDefinition, setEditingDefinition] = useState<PortalRequirementDefinition | null>(null);
  const [editingRecord, setEditingRecord] = useState<PortalRequirementRow | null>(null);
  const [editingClientDocument, setEditingClientDocument] = useState<PortalClientDocument | null>(null);
  const [editingResource, setEditingResource] = useState<PortalClientResource | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<PortalTechnician | null>(null);
  const [editingBranch, setEditingBranch] = useState<PortalBranch | null>(null);
  const [editingServiceDefinition, setEditingServiceDefinition] =
    useState<PortalServiceDefinition | null>(null);
  const [editingAssessmentGuide, setEditingAssessmentGuide] =
    useState<PortalAssessmentGuide | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<PortalAssignment | null>(null);
  const [resettingPortalUser, setResettingPortalUser] = useState<PortalAssignment | null>(null);
  const [credentialHandoff, setCredentialHandoff] = useState<PortalCredentialHandoff | null>(null);
  const [reviewingApprovalRequest, setReviewingApprovalRequest] =
    useState<PortalApprovalRequest | null>(null);
  const [viewingServiceRequest, setViewingServiceRequest] =
    useState<PortalServiceRequest | null>(null);
  const [viewingTechnicianId, setViewingTechnicianId] = useState<number | null>(null);
  const [assessmentPlannerTechnicianId, setAssessmentPlannerTechnicianId] = useState<number | null>(null);
  const [assessmentPlannerTechniques, setAssessmentPlannerTechniques] = useState<string[]>([]);
  const [assessmentPlannerPreferredDate, setAssessmentPlannerPreferredDate] = useState("");
  const [assessmentPlannerNotes, setAssessmentPlannerNotes] = useState("");
  const [approvalReviewNotes, setApprovalReviewNotes] = useState("");
  const [recordDialogValues, setRecordDialogValues] = useState<Record<string, unknown>>({});
  const [clientDocumentDialogValues, setClientDocumentDialogValues] = useState<Record<string, unknown>>({});
  const [clientDocumentDialogSeed, setClientDocumentDialogSeed] =
    useState<Record<string, unknown>>({});
  const [serviceRequestDialogValues, setServiceRequestDialogValues] = useState<Record<string, unknown>>({});
  const [onboardingTechnicianId, setOnboardingTechnicianId] = useState<number | null>(null);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [onboardingQueue, setOnboardingQueue] = useState<PortalRequirementRow[]>([]);

  useEffect(() => {
    const hasRequestedClient =
      requestedClientId &&
      (accessibleClients as PortalClient[]).some((client) => String(client.id) === requestedClientId);

    if (hasRequestedClient && requestedClientId !== selectedClientId) {
      setSelectedClientId(requestedClientId);
      return;
    }

    if (!selectedClientId && accessibleClients.length > 0) {
      setSelectedClientId(String(accessibleClients[0].id));
    }
  }, [accessibleClients, requestedClientId, selectedClientId]);

  useEffect(() => {
    if (!isTechnicianDialogOpen) return;

    setTechnicianForm(
      editingTechnician
        ? {
            name: editingTechnician.name ?? "",
            email: editingTechnician.email ?? "",
            phone: editingTechnician.phone ?? "",
            hasPcnQualification: editingTechnician.hasPcnQualification ?? false,
            certificateNumber: editingTechnician.certificateNumber ?? "",
            pcnRenewalDate: getDateInputValue(editingTechnician.pcnRenewalDate),
            internalAssessmentDate: getDateInputValue(
              editingTechnician.internalAssessmentDate
            ),
            eyeTestValidUntil: getDateInputValue(editingTechnician.eyeTestValidUntil),
            procedureStatus: editingTechnician.procedureStatus ?? "",
            clientBranchId: editingTechnician.clientBranchId
              ? String(editingTechnician.clientBranchId)
              : "unassigned",
            notes: editingTechnician.notes ?? "",
            methodQualifications: getPortalTechnicianMethodQualifications(
              editingTechnician
            ),
          }
        : createEmptyPortalTechnicianForm()
    );
  }, [editingTechnician, isTechnicianDialogOpen]);

  const selectedClient = useMemo(
    () =>
      (accessibleClients as PortalClient[]).find(
        (client) => String(client.id) === selectedClientId
      ) ?? null,
    [accessibleClients, selectedClientId]
  );
  const selectedClientNumber = selectedClient ? selectedClient.id : null;
  const selectedBranchNumber =
    selectedBranchId && Number.isFinite(Number(selectedBranchId)) ? Number(selectedBranchId) : null;
  const isSystemAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canEditPortal =
    isSystemAdmin ||
    selectedClient?.accessLevel === "editor" ||
    selectedClient?.accessLevel === "manager";
  const canManagePortal = isSystemAdmin || selectedClient?.accessLevel === "manager";
  const canManageAssignments = canManagePortal;
  const canAssignExistingUsers = isSystemAdmin;
  const canReviewPortalApprovals = isSystemAdmin;

  const { data: portalBranches = [] } = trpc.clientPortal.branches.list.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null }
  );
  const { data: branchImportCandidates = [] } = trpc.clientPortal.branches.importCandidates.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null && canManagePortal }
  );
  const { data: dashboard } = trpc.clientPortal.dashboard.get.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: technicians = [] } = trpc.clientPortal.technicians.list.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: methods = [] } = trpc.lecturers.methods.useQuery();
  const technicianMethodOptions = useMemo(() => {
    const values = new Map<string, string>();
    (methods as PortalMethod[]).forEach((method) => {
      values.set(method.name, method.name);
    });
    technicians.forEach((technician) => {
      technician.methods.forEach((methodName) => {
        if (!values.has(methodName)) {
          values.set(methodName, methodName);
        }
      });
    });
    if (values.size === 0) {
      ["UT", "MT", "PT", "RT", "VT"].forEach((methodName) => {
        values.set(methodName, methodName);
      });
    }
    return Array.from(values.entries()).map(([value, label]) => ({ value, label }));
  }, [methods, technicians]);
  const { data: definitions = [] } = trpc.clientPortal.requirements.listDefinitions.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null }
  );
  const { data: requirementMatrix = [] } = trpc.clientPortal.requirements.listMatrix.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: serviceDefinitions = [] } = trpc.clientPortal.services.listDefinitions.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null }
  );
  const { data: serviceRequests = [] } = trpc.clientPortal.services.requestsList.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: assessmentGuides = [] } = trpc.clientPortal.guides.list.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: clientDocuments = [] } = trpc.clientPortal.documents.list.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: portalComments = [] } = trpc.clientPortal.comments.list.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null }
  );
  const { data: portalResources = [] } = trpc.clientPortal.resources.list.useQuery(
    { clientId: selectedClientNumber ?? 0, branchId: selectedBranchNumber },
    { enabled: selectedClientNumber !== null }
  );
  const { data: approvalRequests = [] } = trpc.clientPortal.approvals.list.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null }
  );
  const { data: portalActivity = [] } = trpc.clientPortal.activity.list.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null }
  );
  const { data: assignments = [] } = trpc.clientPortal.access.assignments.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null && canManageAssignments }
  );
  const { data: portalEmailDeliveryStatus } =
    trpc.clientPortal.access.emailDeliveryStatus.useQuery(undefined, {
      enabled: canManageAssignments,
      staleTime: 60_000,
    });
  const { data: reminderSettings } = trpc.clientPortal.settings.getReminderSettings.useQuery(
    { clientId: selectedClientNumber ?? 0 },
    { enabled: selectedClientNumber !== null && canManagePortal }
  );
  const { data: assignableUsers = [] } = trpc.clientPortal.access.assignableUsers.useQuery(
    undefined,
    { enabled: canManageAssignments && canAssignExistingUsers }
  );
  useEffect(() => {
    const branches = portalBranches as PortalBranch[];
    const hasRequestedBranch =
      requestedBranchId && branches.some((branch) => String(branch.id) === requestedBranchId);

    if (hasRequestedBranch && requestedBranchId !== selectedBranchId) {
      setSelectedBranchId(requestedBranchId);
      return;
    }

    if (selectedBranchId && !branches.some((branch) => String(branch.id) === selectedBranchId)) {
      setSelectedBranchId("");
    }
  }, [portalBranches, requestedBranchId, selectedBranchId]);
  const techniciansById = useMemo(
    () => new Map((technicians as PortalTechnician[]).map((technician) => [technician.id, technician])),
    [technicians]
  );
  const branchesById = useMemo(
    () => new Map((portalBranches as PortalBranch[]).map((branch) => [branch.id, branch])),
    [portalBranches]
  );
  const definitionsById = useMemo(
    () =>
      new Map(
        (definitions as PortalRequirementDefinition[]).map((definition) => [definition.id, definition])
      ),
    [definitions]
  );
  const serviceDefinitionsById = useMemo(
    () =>
      new Map(
        (serviceDefinitions as PortalServiceDefinition[]).map((definition) => [definition.id, definition])
      ),
    [serviceDefinitions]
  );

  const createBranchMutation = trpc.clientPortal.branches.create.useMutation();
  const importBranchesFromClientsMutation =
    trpc.clientPortal.branches.importExistingClients.useMutation();
  const updateBranchMutation = trpc.clientPortal.branches.update.useMutation();
  const deleteBranchMutation = trpc.clientPortal.branches.delete.useMutation();
  const createDefinitionMutation = trpc.clientPortal.requirements.createDefinition.useMutation();
  const updateDefinitionMutation = trpc.clientPortal.requirements.updateDefinition.useMutation();
  const createServiceDefinitionMutation = trpc.clientPortal.services.createDefinition.useMutation();
  const updateServiceDefinitionMutation = trpc.clientPortal.services.updateDefinition.useMutation();
  const createServiceRequestMutation = trpc.clientPortal.services.createRequest.useMutation();
  const updateServiceRequestStatusMutation =
    trpc.clientPortal.services.updateRequestStatus.useMutation();
  const createAssessmentGuideMutation = trpc.clientPortal.guides.create.useMutation();
  const updateAssessmentGuideMutation = trpc.clientPortal.guides.update.useMutation();
  const createTechnicianMutation = trpc.clientPortal.technicians.create.useMutation();
  const updateTechnicianMutation = trpc.clientPortal.technicians.update.useMutation();
  const deleteTechnicianMutation = trpc.clientPortal.technicians.delete.useMutation();
  const upsertRecordMutation = trpc.clientPortal.requirements.upsertRecord.useMutation();
  const uploadDocumentMutation = trpc.clientPortal.requirements.uploadDocument.useMutation();
  const createClientDocumentMutation = trpc.clientPortal.documents.create.useMutation();
  const importClientDocumentReferenceMutation =
    trpc.clientPortal.documents.importReference.useMutation();
  const updateClientDocumentMutation = trpc.clientPortal.documents.update.useMutation();
  const deleteClientDocumentMutation = trpc.clientPortal.documents.delete.useMutation();
  const createCommentMutation = trpc.clientPortal.comments.create.useMutation();
  const updateCommentStatusMutation = trpc.clientPortal.comments.updateStatus.useMutation();
  const createResourceMutation = trpc.clientPortal.resources.create.useMutation();
  const updateResourceMutation = trpc.clientPortal.resources.update.useMutation();
  const deleteResourceMutation = trpc.clientPortal.resources.delete.useMutation();
  const updateReminderSettingsMutation =
    trpc.clientPortal.settings.updateReminderSettings.useMutation();
  const assignUserMutation = trpc.clientPortal.access.assignUser.useMutation();
  const removeUserMutation = trpc.clientPortal.access.removeUser.useMutation();
  const setPortalUserLoginEnabledMutation =
    trpc.clientPortal.access.setLoginEnabled.useMutation();
  const createPortalUserMutation = trpc.clientPortal.access.createUser.useMutation();
  const resetPortalUserPasswordMutation = trpc.clientPortal.access.resetPassword.useMutation();
  const sendPortalCredentialsEmailMutation =
    trpc.clientPortal.access.sendCredentialsEmail.useMutation();
  const reviewApprovalMutation = trpc.clientPortal.approvals.review.useMutation();
  const isPortalEmailConfigured = portalEmailDeliveryStatus?.configured ?? false;

  const openApprovalReviewDialog = (request: PortalApprovalRequest) => {
    setReviewingApprovalRequest(request);
    setApprovalReviewNotes(request.reviewNotes ?? "");
    setIsApprovalReviewDialogOpen(true);
  };

  const closeApprovalReviewDialog = () => {
    setIsApprovalReviewDialogOpen(false);
    setReviewingApprovalRequest(null);
    setApprovalReviewNotes("");
  };

  const branchOptions = useMemo(
    () =>
      (portalBranches as PortalBranch[])
        .filter((branch) => branch.active)
        .map((branch) => ({
          value: String(branch.id),
          label: branch.code ? `${branch.name} (${branch.code})` : branch.name,
        })),
    [portalBranches]
  );
  const allowedClientDocumentLabels = useMemo(
    () =>
      Array.from(
        new Set(
          (reminderSettings?.allowedClientDocumentLabels ?? [])
            .map((label) => String(label ?? "").trim())
            .filter(Boolean)
        )
      ),
    [reminderSettings?.allowedClientDocumentLabels]
  );
  const allowedClientDocumentOptions = useMemo(
    () =>
      allowedClientDocumentLabels.map((label) => ({
        value: label,
        label,
      })),
    [allowedClientDocumentLabels]
  );
  const clientDocumentPreview = useMemo(() => {
    if (!selectedClient) {
      return null;
    }

    const selectedDocumentType = String(
      clientDocumentDialogValues.title ?? editingClientDocument?.title ?? ""
    ).trim();
    if (!selectedDocumentType) {
      return null;
    }

    const selectedBranchValue = String(
      clientDocumentDialogValues.clientBranchId ??
        (editingClientDocument?.clientBranchId ? String(editingClientDocument.clientBranchId) : "all")
    );
    const selectedBranchName =
      selectedBranchValue === "all"
        ? null
        : branchOptions.find((branch) => branch.value === selectedBranchValue)?.label ?? null;
    const fileDataUrl = String(clientDocumentDialogValues.fileDataUrl ?? "").trim() || null;

    return {
      fileName: buildPortalPreviewFileName(
        `${selectedClient.companyName}${selectedBranchName ? ` - ${selectedBranchName}` : ""} - ${selectedDocumentType}`,
        fileDataUrl
      ),
      folder: `client-portal/${selectedClient.id}/approvals/${selectedBranchName ? `client-documents/${slugifyPortalStorageSegment(selectedBranchName, "branch")}` : "client-documents/general"}/${slugifyPortalStorageSegment(selectedDocumentType, "document")}`,
    };
  }, [branchOptions, clientDocumentDialogValues.clientBranchId, clientDocumentDialogValues.fileDataUrl, clientDocumentDialogValues.title, editingClientDocument?.clientBranchId, editingClientDocument?.title, selectedClient]);
  const requiredClientDocumentCoverageRows = useMemo<RequiredClientDocumentCoverageRow[]>(() => {
    if (allowedClientDocumentLabels.length === 0) {
      return [];
    }

    const normaliseLabel = (value: string) => value.trim().toLocaleLowerCase();
    const isBranchScope = selectedBranchNumber !== null;
    const priorityByHealth: Record<PortalClientDocumentHealth, number> = {
      current: 6,
      review_due: 5,
      active: 4,
      expired: 3,
      archived: 2,
      superseded: 1,
    };
    const documents = (clientDocuments as PortalClientDocument[]).slice();

    return allowedClientDocumentLabels.map((label) => {
      const matchingDocuments = documents
        .filter((document) => {
          if (normaliseLabel(document.title) !== normaliseLabel(label)) {
            return false;
          }
          if (!isBranchScope) {
            return true;
          }
          return document.clientBranchId === null || document.clientBranchId === selectedBranchNumber;
        })
        .sort((left, right) => {
          if (isBranchScope) {
            const leftScopePriority = left.clientBranchId === selectedBranchNumber ? 2 : 1;
            const rightScopePriority = right.clientBranchId === selectedBranchNumber ? 2 : 1;
            const scopeDelta = rightScopePriority - leftScopePriority;
            if (scopeDelta !== 0) {
              return scopeDelta;
            }
          }
          const healthDelta =
            (priorityByHealth[right.health] ?? 0) - (priorityByHealth[left.health] ?? 0);
          if (healthDelta !== 0) {
            return healthDelta;
          }
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });

      const latestDocument = matchingDocuments[0];
      if (!latestDocument) {
        return {
          id: label,
          documentType: label,
          branchName: isBranchScope ? "Selected branch missing" : "Missing",
          health: "missing",
          category: "Not uploaded",
          reviewDate: null,
          validUntil: null,
          updatedAt: null,
          latestDocumentId: null,
        };
      }

      return {
        id: label,
        documentType: label,
        branchName:
          latestDocument.clientBranchId === null
            ? "All branches"
            : latestDocument.branchName ?? "Selected branch",
        health: latestDocument.health,
        category: latestDocument.category,
        reviewDate: latestDocument.reviewDate,
        validUntil: latestDocument.validUntil,
        updatedAt: latestDocument.updatedAt,
        latestDocumentId: latestDocument.id,
      };
    });
  }, [allowedClientDocumentLabels, clientDocuments, selectedBranchNumber]);
  const requiredClientDocumentCoverageSummary = useMemo(
    () => ({
      total: requiredClientDocumentCoverageRows.length,
      current: requiredClientDocumentCoverageRows.filter((row) => row.health === "current").length,
      reviewDue: requiredClientDocumentCoverageRows.filter((row) => row.health === "review_due").length,
      expired: requiredClientDocumentCoverageRows.filter((row) => row.health === "expired").length,
      missing: requiredClientDocumentCoverageRows.filter((row) => row.health === "missing").length,
    }),
    [requiredClientDocumentCoverageRows]
  );
  const requiredClientDocumentActionQueue = useMemo<RequiredClientDocumentActionQueueRow[]>(() => {
    const priorityByHealth: Record<"missing" | "review_due" | "expired", number> = {
      missing: 3,
      expired: 2,
      review_due: 1,
    };

    return requiredClientDocumentCoverageRows
      .filter(
        (row): row is RequiredClientDocumentCoverageRow & { health: "missing" | "review_due" | "expired" } =>
          row.health === "missing" || row.health === "review_due" || row.health === "expired"
      )
      .map((row) => ({
        id: row.id,
        documentType: row.documentType,
        branchName: row.branchName,
        health: row.health,
        actionLabel:
          row.health === "missing"
            ? "Upload Missing"
            : row.health === "expired"
              ? "Replace Expired"
              : "Refresh Review",
        reason:
          row.health === "missing"
            ? "This required document type has not been uploaded yet."
            : row.health === "expired"
              ? "The latest uploaded document is expired and should be replaced."
              : "The latest uploaded document is due for review.",
        reviewDate: row.reviewDate,
        validUntil: row.validUntil,
        latestDocumentId: row.latestDocumentId,
      }))
      .sort((left, right) => {
        const priorityDelta = priorityByHealth[right.health] - priorityByHealth[left.health];
        if (priorityDelta !== 0) {
          return priorityDelta;
        }
        return left.documentType.localeCompare(right.documentType);
      });
  }, [requiredClientDocumentCoverageRows]);
  const openSeededClientDocumentDialog = (documentType?: string) => {
    setEditingClientDocument(null);
    setClientDocumentDialogValues({});
    setClientDocumentDialogSeed(
      documentType
        ? {
            title: documentType,
            category: "Procedure",
            clientBranchId: selectedBranchNumber !== null ? String(selectedBranchNumber) : "all",
            description: "",
            reviewDate: "",
            validUntil: "",
            status: "active",
            fileDataUrl: "",
          }
        : {}
    );
    setIsClientDocumentDialogOpen(true);
  };

  const handleClientDocumentImport = async (
    rows: Record<string, unknown>[]
  ): Promise<ImportDialogResult> => {
    if (!selectedClientNumber) {
      return {
        successCount: 0,
        failureCount: rows.length,
        message: "Select a client before importing client documents.",
      };
    }

    let successCount = 0;
    const failures: string[] = [];
    const branchRows = portalBranches as PortalBranch[];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] ?? {};
      const title = String(row.title ?? row.documentType ?? "").trim();
      const category = String(row.category ?? "General").trim() || "General";
      const sourceFileName = String(row.sourceFileName ?? row.fileName ?? "").trim();
      const sourcePath = String(row.sourcePath ?? row.filePath ?? "").trim();
      const branchIdRaw = String(row.clientBranchId ?? "").trim();
      const branchNameRaw = String(row.clientBranchName ?? row.branchName ?? "").trim();

      if (!title || !sourceFileName || !sourcePath) {
        failures.push(
          `Row ${index + 1}: title, source file name, and source path are required.`
        );
        continue;
      }

      let clientBranchId: number | null = null;
      if (branchIdRaw) {
        const parsed = Number(branchIdRaw);
        if (!Number.isFinite(parsed) || !branchRows.some((branch) => branch.id === parsed)) {
          failures.push(`Row ${index + 1}: client branch ID could not be matched.`);
          continue;
        }
        clientBranchId = parsed;
      } else if (branchNameRaw) {
        const matchedBranch =
          branchRows.find(
            (branch) => branch.name.trim().toLowerCase() === branchNameRaw.trim().toLowerCase()
          ) ?? null;
        if (!matchedBranch) {
          failures.push(`Row ${index + 1}: client branch name could not be matched.`);
          continue;
        }
        clientBranchId = matchedBranch.id;
      }

      try {
        await importClientDocumentReferenceMutation.mutateAsync({
          clientId: selectedClientNumber,
          clientBranchId,
          title,
          category,
          description: String(row.description ?? "").trim() || null,
          sourceFileName,
          sourcePath,
          reviewDate: String(row.reviewDate ?? "").trim()
            ? new Date(`${String(row.reviewDate).trim()}T00:00:00`)
            : null,
          validUntil: String(row.validUntil ?? "").trim()
            ? new Date(`${String(row.validUntil).trim()}T00:00:00`)
            : null,
          status:
            (String(row.status ?? "active").trim() as PortalClientDocumentStatus) || "active",
        });
        successCount += 1;
      } catch (error) {
        failures.push(
          `Row ${index + 1}: ${
            error instanceof Error ? error.message : "could not import client document"
          }.`
        );
      }
    }

    if (successCount > 0) {
      await invalidatePortalData();
    }

    return {
      successCount,
      failureCount: failures.length,
      message:
        failures.length === 0
          ? `Imported ${successCount} client document reference${successCount === 1 ? "" : "s"}.`
          : `Imported ${successCount} client document reference${successCount === 1 ? "" : "s"}. ${failures.length} row(s) need attention.${failures[0] ? ` ${failures[0]}` : ""}`,
    };
  };
  const activeServiceDefinitions = useMemo(
    () =>
      (serviceDefinitions as PortalServiceDefinition[]).filter(
        (definition) => definition.active || editingServiceDefinition?.id === definition.id
      ),
    [editingServiceDefinition?.id, serviceDefinitions]
  );
  const assessmentServiceDefinition = useMemo(
    () =>
      activeServiceDefinitions.find((definition) =>
        isAssessmentRelatedText(
          `${definition.title} ${definition.category} ${definition.description ?? ""} ${definition.config.requestLabel ?? ""}`
        )
      ) ??
      activeServiceDefinitions.find(
        (definition) =>
          definition.config.allowTechnicianSelection && definition.config.allowPreferredDate
      ) ??
      null,
    [activeServiceDefinitions]
  );
  const serviceDefinitionOptions = useMemo(
    () =>
      activeServiceDefinitions.map((definition) => ({
        value: String(definition.id),
        label: definition.title,
      })),
    [activeServiceDefinitions]
  );

  const definitionSortOrderById = useMemo(() => {
    const index = new Map<number, number>();
    (definitions as PortalRequirementDefinition[]).forEach((definition) => {
      index.set(definition.id, Number(definition.sortOrder ?? 0));
    });
    return index;
  }, [definitions]);

  const technicianSummaryRows = useMemo<TechnicianSummaryRow[]>(() => {
    const matrixByTechnician = new Map<number, PortalRequirementRow[]>();
    (requirementMatrix as PortalRequirementRow[]).forEach((row) => {
      const existing = matrixByTechnician.get(row.technicianId) ?? [];
      existing.push(row);
      matrixByTechnician.set(row.technicianId, existing);
    });

    return (technicians as PortalTechnician[]).map((technician) => {
      const rows = matrixByTechnician.get(technician.id) ?? [];
      return {
        id: technician.id,
        name: technician.name,
        methods: technician.methods.join(", "),
        level:
          summarisePortalTechnicianLevels(
            getPortalTechnicianMethodQualifications(technician)
          ) || technician.level,
        current: rows.filter((row) => row.status === "current").length,
        expiring: rows.filter((row) => row.status === "expiring").length,
        expired: rows.filter((row) => row.status === "expired").length,
        missing: rows.filter((row) => row.status === "missing").length,
        nextEyeTest: technician.eyeTestValidUntil,
      };
    });
  }, [requirementMatrix, technicians]);
  const assessmentReadinessRows = useMemo<AssessmentReadinessRow[]>(() => {
    return (technicians as PortalTechnician[])
      .map((technician) => {
        const methodQualifications = getPortalTechnicianMethodQualifications(technician);
        const techniques = Array.from(
          new Set(
            (methodQualifications.length > 0
              ? methodQualifications.map((entry) => entry.method)
              : technician.methods
            )
              .map((value) => String(value ?? "").trim())
              .filter(Boolean)
          )
        );
        const techniqueKeys = new Set(techniques.map((value) => normalisePortalTechniqueKey(value)));
        const matchedGuides = (assessmentGuides as PortalAssessmentGuide[]).filter((guide) => {
          const guideKey = normalisePortalTechniqueKey(guide.techniqueName);
          if (!guideKey) return false;
          return techniqueKeys.has(guideKey) || guideKey === "all" || guideKey === "general";
        });
        const coveredTechniqueKeys = new Set(
          matchedGuides
            .map((guide) => normalisePortalTechniqueKey(guide.techniqueName))
            .filter((value) => value !== "all" && value !== "general")
        );
        const uncoveredTechniques = techniques.filter(
          (value) => !coveredTechniqueKeys.has(normalisePortalTechniqueKey(value))
        );
        const pendingCount = (requirementMatrix as PortalRequirementRow[]).filter(
          (row) =>
            row.technicianId === technician.id &&
            row.isRequired &&
            row.status !== "current"
        ).length;
        const latestRequest =
          (serviceRequests as PortalServiceRequest[])
            .filter((request) => request.technicianId === technician.id)
            .filter((request) => isAssessmentRelatedText(`${request.requestType} ${request.title}`))
            .sort(
              (left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
            )[0] ?? null;
        const hasOpenBooking =
          latestRequest !== null &&
          latestRequest.status !== "completed" &&
          latestRequest.status !== "closed";

        let status: AssessmentReadinessStatus = "ready";
        if (uncoveredTechniques.length > 0) {
          status = "needs_guidance";
        } else if (hasOpenBooking) {
          status = "booking_in_progress";
        } else if (pendingCount > 0) {
          status = "needs_preparation";
        }

        return {
          id: technician.id,
          name: technician.name,
          branchName: technician.clientBranchId
            ? branchesById.get(technician.clientBranchId)?.name ?? "Assigned"
            : "All / Unassigned",
          techniques: techniques.join(", ") || "Not captured",
          status,
          pendingCount,
          uncoveredTechniqueCount: uncoveredTechniques.length,
          latestRequestStatus: latestRequest?.status ?? null,
          latestRequestDate: latestRequest?.preferredDate ?? latestRequest?.createdAt ?? null,
        };
      })
      .sort((left, right) => {
        const statusPriority: Record<AssessmentReadinessStatus, number> = {
          needs_guidance: 0,
          needs_preparation: 1,
          booking_in_progress: 2,
          ready: 3,
        };
        const statusDiff = statusPriority[left.status] - statusPriority[right.status];
        if (statusDiff !== 0) return statusDiff;
        if (left.pendingCount !== right.pendingCount) {
          return right.pendingCount - left.pendingCount;
        }
        return left.name.localeCompare(right.name);
      });
  }, [assessmentGuides, branchesById, requirementMatrix, serviceRequests, technicians]);
  const latestAssessmentRequestByTechnician = useMemo(() => {
    const lookup = new Map<number, PortalServiceRequest>();
    assessmentReadinessRows.forEach((row) => {
      const request =
        (serviceRequests as PortalServiceRequest[])
          .filter((entry) => entry.technicianId === row.id)
          .filter((entry) => isAssessmentRelatedText(`${entry.requestType} ${entry.title}`))
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
          )[0] ?? null;
      if (request) {
        lookup.set(row.id, request);
      }
    });
    return lookup;
  }, [assessmentReadinessRows, serviceRequests]);

  const requirementTableRows = useMemo<RequirementTableRow[]>(
    () =>
      (requirementMatrix as PortalRequirementRow[]).map((row) => ({
        ...row,
        id: row.recordId ?? `${row.technicianId}-${row.definitionId}`,
      })),
    [requirementMatrix]
  );

  const onboardingQueueByTechnician = useMemo(() => {
    const queues = new Map<number, PortalRequirementRow[]>();
    const activeDefinitionIds = new Set(
      (definitions as PortalRequirementDefinition[])
        .filter((definition) => definition.active !== false && definition.isRequired)
        .map((definition) => definition.id)
    );

    (requirementMatrix as PortalRequirementRow[])
      .filter(
        (row) =>
          row.isRequired &&
          row.status !== "current" &&
          (activeDefinitionIds.size === 0 || activeDefinitionIds.has(row.definitionId))
      )
      .sort((left, right) => {
        const statusDiff =
          getRequirementStatusPriority(left.status) - getRequirementStatusPriority(right.status);
        if (statusDiff !== 0) return statusDiff;

        const sortDiff =
          (definitionSortOrderById.get(left.definitionId) ?? 0) -
          (definitionSortOrderById.get(right.definitionId) ?? 0);
        if (sortDiff !== 0) return sortDiff;

        return left.definitionName.localeCompare(right.definitionName);
      })
      .forEach((row) => {
        const existing = queues.get(row.technicianId) ?? [];
        existing.push(row);
        queues.set(row.technicianId, existing);
      });

    return queues;
  }, [definitionSortOrderById, definitions, requirementMatrix]);

  const onboardingOverviewRows = useMemo(
    () =>
      (technicians as PortalTechnician[])
        .map((technician) => {
          const queue = onboardingQueueByTechnician.get(technician.id) ?? [];
          if (queue.length === 0) return null;

          return {
            id: technician.id,
            name: technician.name,
            pendingCount: queue.length,
            nextRequirement: queue[0]?.definitionName ?? "Compliance item",
            nextStatus: queue[0]?.status ?? "missing",
          };
        })
        .filter(Boolean)
        .sort((left, right) => {
          const countDiff = (right?.pendingCount ?? 0) - (left?.pendingCount ?? 0);
          if (countDiff !== 0) return countDiff;
          return String(left?.name ?? "").localeCompare(String(right?.name ?? ""));
        }),
    [onboardingQueueByTechnician, technicians]
  );

  const isOnboardingMode = onboardingQueue.length > 0 && onboardingTechnicianId !== null;
  const activeOnboardingRow = isOnboardingMode ? onboardingQueue[onboardingStepIndex] ?? null : null;
  const activeRecord = activeOnboardingRow ?? editingRecord;
  const onboardingTechnician = useMemo(
    () =>
      onboardingTechnicianId === null
        ? null
        : (technicians as PortalTechnician[]).find((technician) => technician.id === onboardingTechnicianId) ??
          null,
    [onboardingTechnicianId, technicians]
  );
  const hasNextOnboardingStep = isOnboardingMode && onboardingStepIndex < onboardingQueue.length - 1;
  const onboardingProgress = isOnboardingMode
    ? ((onboardingStepIndex + 1) / Math.max(onboardingQueue.length, 1)) * 100
    : 0;

  const activeRecordDefinition = useMemo(() => {
    const definitionId = Number(
      recordDialogValues.definitionId ?? activeRecord?.definitionId ?? 0
    );

    if (!definitionId) return null;

    return (
      (definitions as PortalRequirementDefinition[]).find(
        (definition) => definition.id === definitionId
      ) ?? null
    );
  }, [activeRecord?.definitionId, definitions, recordDialogValues.definitionId]);
  const selectedRecordPreviewTechnician = useMemo(
    () =>
      techniciansById.get(
        Number(recordDialogValues.technicianId ?? activeRecord?.technicianId ?? 0)
      ) ?? null,
    [activeRecord?.technicianId, recordDialogValues.technicianId, techniciansById]
  );
  const selectedRecordPreviewDefinition = useMemo(
    () =>
      definitionsById.get(
        Number(recordDialogValues.definitionId ?? activeRecord?.definitionId ?? 0)
      ) ?? null,
    [activeRecord?.definitionId, definitionsById, recordDialogValues.definitionId]
  );
  const requirementDocumentPreview = useMemo(() => {
    if (!selectedRecordPreviewTechnician || !selectedRecordPreviewDefinition) {
      return null;
    }

    const fileDataUrl = String(recordDialogValues.attachmentFile ?? "").trim() || null;
    return {
      fileName: buildPortalPreviewFileName(
        `${selectedRecordPreviewTechnician.name} - ${selectedRecordPreviewDefinition.name}`,
        fileDataUrl
      ),
      folder: `client-portal/${selectedClientNumber ?? "client"}/approvals/technicians/${slugifyPortalStorageSegment(selectedRecordPreviewTechnician.name, "technician")}/${slugifyPortalStorageSegment(selectedRecordPreviewDefinition.name, "requirement")}`,
    };
  }, [
    recordDialogValues.attachmentFile,
    selectedClientNumber,
    selectedRecordPreviewDefinition,
    selectedRecordPreviewTechnician,
  ]);

  const definitionFields: FormField[] = [
    { name: "name", label: "Requirement", type: "text", required: true },
    { name: "category", label: "Category", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "validityDays", label: "Validity (days)", type: "number" },
    { name: "reminderDays", label: "Reminder Days", type: "number" },
    { name: "sortOrder", label: "Sort Order", type: "number" },
    { name: "isRequired", label: "Required for client", type: "checkbox" },
    { name: "active", label: "Active", type: "checkbox" },
    {
      name: "customFields",
      label: "Custom Client Fields",
      type: "custom-field-builder",
      helpText:
        "Use this for client-specific items like certificate numbers, dosage summaries, ID issue dates, or any extra evidence details.",
    },
  ];

  const recordFields: FormField[] = [
    {
      name: "technicianId",
      label: "Technician",
      type: "select",
      required: true,
      options: (technicians as PortalTechnician[]).map((technician) => ({
        value: String(technician.id),
        label: technician.name,
      })),
    },
    {
      name: "definitionId",
      label: "Requirement",
      type: "select",
      required: true,
      options: (definitions as PortalRequirementDefinition[]).map((definition) => ({
        value: String(definition.id),
        label: definition.name,
      })),
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "current", label: "Current" },
        { value: "expiring", label: "Expiring" },
        { value: "expired", label: "Expired" },
        { value: "pending_review", label: "Pending Review" },
        { value: "missing", label: "Missing" },
      ],
    },
    { name: "issuedAt", label: "Issued", type: "date" },
    { name: "validUntil", label: "Valid Until", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
    ...buildCustomRecordFields(activeRecordDefinition),
    {
      name: "attachmentFile",
      label: "Attachment File",
      type: "file",
      accept: ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx",
      helpText:
        "The file name is set automatically from the technician name and the selected requirement.",
    },
  ];

  const portalAccessLevelOptions = [
    { value: "viewer", label: "Viewer" },
    { value: "editor", label: "Editor" },
    { value: "manager", label: "Manager" },
  ];
  const assignmentFields: FormField[] = [
    {
      name: "userId",
      label: "User",
      type: "select",
      required: true,
      options: (assignableUsers as PortalAssignableUser[]).map((portalUser) => ({
        value: String(portalUser.id),
        label: portalUser.name
          ? `${portalUser.name} (${portalUser.email ?? "no email"})`
          : portalUser.email ?? `User ${portalUser.id}`,
      })),
    },
    {
      name: "accessLevel",
      label: "Portal Access",
      type: "select",
      required: true,
      options: portalAccessLevelOptions,
    },
    { name: "receiveReminders", label: "Receive reminders", type: "checkbox" },
    ...(branchOptions.length > 0
      ? [
          {
            name: "branchIds",
            label: "Visible Branches",
            type: "checkbox-group" as const,
            options: branchOptions,
            helpText:
              "Leave blank for full visibility across all branches in this client portal.",
          },
        ]
      : []),
  ];
  const editAssignmentFields: FormField[] = [
    {
      name: "accessLevel",
      label: "Portal Access",
      type: "select",
      required: true,
      options: portalAccessLevelOptions,
    },
    { name: "receiveReminders", label: "Receive reminders", type: "checkbox" },
    ...(branchOptions.length > 0
      ? [
          {
            name: "branchIds",
            label: "Visible Branches",
            type: "checkbox-group" as const,
            options: branchOptions,
            helpText:
              "Leave blank for full visibility across all branches in this client portal.",
          },
        ]
      : []),
  ];

  const createPortalUserFields: FormField[] = [
    { name: "name", label: "Client Contact Name", type: "text", required: true },
    { name: "email", label: "Client Login Email", type: "email", required: true },
    {
      name: "password",
      label: "Temporary Password",
      type: "password",
      required: true,
      placeholder: "Minimum 8 characters",
      helpText: "The client will be forced to change this password the first time they sign in.",
    },
    {
      name: "confirmPassword",
      label: "Confirm Password",
      type: "password",
      required: true,
      placeholder: "Repeat the password",
    },
    {
      name: "accessLevel",
      label: "Portal Access",
      type: "select",
      required: true,
      options: portalAccessLevelOptions,
    },
    { name: "receiveReminders", label: "Receive reminders", type: "checkbox" },
    ...(isPortalEmailConfigured
      ? [
          {
            name: "sendInviteEmail",
            label: "Email login details now",
            type: "checkbox" as const,
            helpText:
              "Send the temporary password and client portal link directly from TextPoint.",
          },
        ]
      : []),
    ...(branchOptions.length > 0
      ? [
          {
            name: "branchIds",
            label: "Visible Branches",
            type: "checkbox-group" as const,
            options: branchOptions,
            helpText:
              "Leave blank for full visibility across all branches in this client portal.",
          },
        ]
      : []),
  ];
  const resetPortalPasswordFields: FormField[] = [
    {
      name: "password",
      label: "New Temporary Password",
      type: "password",
      required: true,
      placeholder: "Minimum 8 characters",
      helpText:
        "The client will be forced to change this password the next time they sign in.",
    },
    {
      name: "confirmPassword",
      label: "Confirm Temporary Password",
      type: "password",
      required: true,
      placeholder: "Repeat the password",
    },
    ...(isPortalEmailConfigured
      ? [
          {
            name: "sendInviteEmail",
            label: "Email reset details now",
            type: "checkbox" as const,
            helpText:
              "Send the new temporary password and client portal link directly from TextPoint.",
          },
        ]
      : []),
  ];
  const branchFields: FormField[] = [
    { name: "name", label: "Branch Name", type: "text", required: true },
    { name: "code", label: "Branch Code", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "sortOrder", label: "Sort Order", type: "number" },
    { name: "active", label: "Active", type: "checkbox" },
  ];
  const branchImportFields: FormField[] = [
    {
      name: "sourceClientIds",
      label: "Existing Client Records To Convert",
      type: "checkbox-group",
      required: true,
      options: (branchImportCandidates as PortalBranchImportCandidate[]).map((candidate) => ({
        value: String(candidate.id),
        label: `${candidate.companyName} | ${candidate.primaryContact} | ${candidate.technicianCount} technician(s) | ${candidate.activityCount} activity record(s)`,
      })),
      helpText:
        "Each selected client will become one branch under the chosen head office. Technicians, portal requests, documents, resources, and client assignments will be moved across.",
    },
  ];
  const serviceDefinitionFields: FormField[] = [
    { name: "title", label: "Service Title", type: "text", required: true },
    { name: "category", label: "Category", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "instructions", label: "Client Instructions", type: "textarea" },
    { name: "requestLabel", label: "Button / CTA Label", type: "text" },
    { name: "techniqueOptionsText", label: "Technique Options", type: "textarea" },
    { name: "requestedDocumentLabelsText", label: "Requested Client Documents", type: "textarea" },
    { name: "sortOrder", label: "Sort Order", type: "number" },
    { name: "active", label: "Active", type: "checkbox" },
    {
      name: "allowBranchSelection",
      label: "Allow branch selection",
      type: "checkbox",
    },
    {
      name: "allowTechnicianSelection",
      label: "Allow technician selection",
      type: "checkbox",
    },
    {
      name: "allowMultipleTechniques",
      label: "Allow multiple techniques",
      type: "checkbox",
    },
    {
      name: "allowPreferredDate",
      label: "Allow preferred date",
      type: "checkbox",
    },
  ];
  const selectedServiceDefinition =
    serviceDefinitionsById.get(Number(serviceRequestDialogValues.serviceDefinitionId ?? 0)) ?? null;
  const serviceTechniqueOptions = useMemo(() => {
    const configured = selectedServiceDefinition?.config.techniqueOptions ?? [];
    if (configured.length > 0) {
      return configured.map((value) => ({ value, label: value }));
    }
    return technicianMethodOptions;
  }, [selectedServiceDefinition, technicianMethodOptions]);
  const serviceRequestedDocumentOptions = useMemo(
    () =>
      (selectedServiceDefinition?.config.requestedDocumentLabels ?? []).map((value) => ({
        value,
        label: value,
      })),
    [selectedServiceDefinition]
  );
  const selectedRequestedDocuments = useMemo(
    () =>
      Array.isArray(serviceRequestDialogValues.requestedDocuments)
        ? serviceRequestDialogValues.requestedDocuments
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
        : parseLineList(serviceRequestDialogValues.requestedDocuments),
    [serviceRequestDialogValues.requestedDocuments]
  );
  const serviceRequestSupportingDocuments = useMemo(
    () =>
      alignServiceRequestSupportingDocuments(
        selectedRequestedDocuments,
        serviceRequestDialogValues.supportingDocuments
      ),
    [selectedRequestedDocuments, serviceRequestDialogValues.supportingDocuments]
  );
  const selectedServiceRequestTechnician = useMemo(
    () => techniciansById.get(Number(serviceRequestDialogValues.technicianId ?? 0)) ?? null,
    [serviceRequestDialogValues.technicianId, techniciansById]
  );
  const serviceRequestDocumentAutomationRules = useMemo(
    () =>
      buildLevelIIIDocumentAutomationRules({
        technicianName: selectedServiceRequestTechnician?.name ?? null,
        techniques:
          Array.isArray(serviceRequestDialogValues.techniques)
            ? serviceRequestDialogValues.techniques.map((value) => String(value))
            : parseLineList(serviceRequestDialogValues.techniques),
        methodQualifications: selectedServiceRequestTechnician
          ? getPortalTechnicianMethodQualifications(selectedServiceRequestTechnician)
          : [],
        requestedDocuments: selectedRequestedDocuments,
      }),
    [
      selectedRequestedDocuments,
      selectedServiceRequestTechnician,
      serviceRequestDialogValues.techniques,
    ]
  );
  const serviceRequestFields: FormField[] = [
    {
      name: "serviceDefinitionId",
      label: "Request Type",
      type: "select",
      required: true,
      options: serviceDefinitionOptions,
    },
    { name: "title", label: "Request Title", type: "text", required: true },
    ...(branchOptions.length > 0
      ? [
          {
            name: "clientBranchId",
            label: "Branch",
            type: "select" as const,
            options: [{ value: "all", label: "Client-wide / not branch specific" }, ...branchOptions],
          },
        ]
      : []),
    {
      name: "technicianId",
      label: "Technician",
      type: "select",
      options: [
        { value: "none", label: "No specific technician" },
        ...(technicians as PortalTechnician[]).map((technician) => ({
          value: String(technician.id),
          label: technician.name,
        })),
      ],
    },
    {
      name: "preferredDate",
      label: "Preferred Date",
      type: "date",
    },
    {
      name: "techniques",
      label: "Techniques",
      type: serviceTechniqueOptions.length > 0 ? "checkbox-group" : "text",
      options: serviceTechniqueOptions.length > 0 ? serviceTechniqueOptions : undefined,
      placeholder:
        serviceTechniqueOptions.length > 0 ? undefined : "Enter techniques separated by commas",
    },
    {
      name: "requestedDocuments",
      label: "Documents To Send",
      type: serviceRequestedDocumentOptions.length > 0 ? "checkbox-group" : "textarea",
      options: serviceRequestedDocumentOptions.length > 0 ? serviceRequestedDocumentOptions : undefined,
      placeholder:
        serviceRequestedDocumentOptions.length > 0
          ? undefined
          : "Enter requested documents on separate lines",
      helpText:
        serviceRequestedDocumentOptions.length > 0
          ? "Tick the items this request needs. Upload slots for each selected item appear below."
          : undefined,
    },
    { name: "details", label: "Details", type: "textarea" },
  ];
  const assessmentGuideFields: FormField[] = [
    { name: "title", label: "Guide Title", type: "text", required: true },
    { name: "techniqueName", label: "Technique", type: "text", required: true },
    ...(branchOptions.length > 0
      ? [
          {
            name: "clientBranchId",
            label: "Branch",
            type: "select" as const,
            options: [{ value: "all", label: "All accessible branches" }, ...branchOptions],
          },
        ]
      : []),
    { name: "description", label: "Description", type: "textarea" },
    { name: "bringItemsText", label: "Technician Must Bring", type: "textarea" },
    { name: "companyItemsText", label: "Company Must Send / Upload", type: "textarea" },
    { name: "sortOrder", label: "Sort Order", type: "number" },
    { name: "active", label: "Active", type: "checkbox" },
  ];

  const reminderSettingsFields: FormField[] = [
    {
      name: "complianceEnabled",
      label: "Enable compliance reminders",
      type: "checkbox",
      section: "Reminder Types",
    },
    {
      name: "documentEnabled",
      label: "Enable document reminders",
      type: "checkbox",
      section: "Reminder Types",
    },
    {
      name: "includeMissingRequired",
      label: "Include missing required records",
      type: "checkbox",
      section: "Compliance Rules",
    },
    {
      name: "includePendingReview",
      label: "Include pending review records",
      type: "checkbox",
      section: "Compliance Rules",
    },
    {
      name: "documentLeadDays",
      label: "Document lead days",
      type: "number",
      helpText: "How many days before review or expiry document reminders should start.",
      section: "Document Rules",
    },
    {
      name: "complianceEscalationDays",
      label: "Compliance escalation days",
      type: "number",
      helpText: "Escalate once expired technician records are overdue by this many days.",
      section: "Escalation",
    },
    {
      name: "documentEscalationDays",
      label: "Document escalation days",
      type: "number",
      helpText: "Escalate once overdue documents stay unresolved for this many days.",
      section: "Escalation",
    },
    {
      name: "sendToAssignedUsers",
      label: "Notify assigned client users",
      type: "checkbox",
      section: "Recipients",
    },
    {
      name: "sendToInternalAdmins",
      label: "Notify internal admins",
      type: "checkbox",
      section: "Recipients",
    },
    {
      name: "escalationManagersOnly",
      label: "Escalations to managers only",
      type: "checkbox",
      helpText: "When enabled, escalated client-user reminders only go to client managers.",
      section: "Recipients",
    },
    {
      name: "allowedClientDocumentLabelsText",
      label: "Allowed client document types",
      type: "textarea",
      helpText:
        "One document type per line. Client uploads will be limited to this list and renamed automatically.",
      section: "Document Rules",
    },
  ];

  const clientDocumentFields: FormField[] = [
    {
      name: "title",
      label: "Document Type",
      type: allowedClientDocumentOptions.length > 0 ? "select" : "text",
      required: true,
      options: allowedClientDocumentOptions,
      helpText:
        allowedClientDocumentOptions.length > 0
          ? "Only admin-approved document types can be uploaded here."
          : "No allowed document list is configured yet. Admins can add one under Reminder Rules.",
    },
    { name: "category", label: "Category", type: "text", required: true },
    ...(branchOptions.length > 0
      ? [
          {
            name: "clientBranchId",
            label: "Branch Scope",
            type: "select" as const,
            options: [{ value: "all", label: "All accessible branches" }, ...branchOptions],
            helpText: "Use a branch when this document should only be visible to one branch.",
          },
        ]
      : []),
    { name: "description", label: "Description", type: "textarea" },
    { name: "reviewDate", label: "Review Date", type: "date" },
    { name: "validUntil", label: "Valid Until", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "active", label: "Active" },
        { value: "archived", label: "Archived" },
        { value: "superseded", label: "Superseded" },
      ],
    },
    {
      name: "fileDataUrl",
      label: "Upload File",
      type: "file",
      required: !editingClientDocument,
      accept: ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx",
      helpText:
        "The stored file name is generated automatically from the client, branch, and document type.",
    },
  ];

  const commentFields: FormField[] = [
    {
      name: "requestType",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { value: "general_comment", label: "General Comment" },
        { value: "contact_request", label: "Contact Request" },
        { value: "suggestion", label: "Suggestion" },
      ],
    },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "message", label: "Message", type: "textarea", required: true },
  ];

  const resourceFields: FormField[] = [
    { name: "title", label: "Resource Title", type: "text", required: true },
    { name: "category", label: "Category", type: "text", required: true },
    ...(branchOptions.length > 0
      ? [
          {
            name: "clientBranchId",
            label: "Branch Scope",
            type: "select" as const,
            options: [{ value: "all", label: "All accessible branches" }, ...branchOptions],
            helpText: "Use a branch when this resource should only be visible to one branch.",
          },
        ]
      : []),
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "resourceType",
      label: "Resource Type",
      type: "select",
      required: true,
      options: [
        { value: "file", label: "File Upload" },
        { value: "link", label: "External Link" },
      ],
    },
    { name: "linkUrl", label: "Link URL", type: "text" },
    { name: "fileName", label: "File Label", type: "text" },
    {
      name: "fileDataUrl",
      label: "Upload File",
      type: "file",
      accept: ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx",
    },
    { name: "sortOrder", label: "Sort Order", type: "number" },
    { name: "active", label: "Visible to client", type: "checkbox" },
  ];

  const technicianColumns: Column<TechnicianSummaryRow>[] = [
    { key: "name", label: "Technician", sortable: true },
    {
      key: "id",
      label: "Branch",
      render: (_value, row) => {
        const technician = techniciansById.get(row.id);
        if (!technician?.clientBranchId) return "All / Unassigned";
        return branchesById.get(technician.clientBranchId)?.name ?? "Assigned";
      },
    },
    { key: "methods", label: "Methods" },
    { key: "level", label: "Level" },
    { key: "current", label: "Current", sortable: true },
    { key: "expiring", label: "Expiring", sortable: true },
    { key: "expired", label: "Expired", sortable: true },
    { key: "missing", label: "Missing", sortable: true },
    {
      key: "nextEyeTest",
      label: "Eye Test Valid Until",
      render: (value) => formatDate(value),
    },
  ];
  const assessmentReadinessColumns: Column<AssessmentReadinessRow>[] = [
    { key: "name", label: "Technician", sortable: true },
    { key: "branchName", label: "Branch", sortable: true },
    { key: "techniques", label: "Techniques" },
    {
      key: "status",
      label: "Readiness",
      render: (value) => getAssessmentReadinessBadge(value as AssessmentReadinessStatus),
    },
    {
      key: "pendingCount",
      label: "Pending Items",
      render: (value) => Number(value ?? 0),
      sortable: true,
    },
    {
      key: "uncoveredTechniqueCount",
      label: "Guide Gaps",
      render: (value) => Number(value ?? 0),
      sortable: true,
    },
    {
      key: "latestRequestStatus",
      label: "Latest Booking",
      render: (value) =>
        value ? getServiceRequestStatusBadge(value as PortalServiceRequestStatus) : "None",
    },
    {
      key: "latestRequestDate",
      label: "Last Activity",
      render: (value) => formatDate(value),
    },
  ];

  const definitionColumns: Column<PortalRequirementDefinition>[] = [
    { key: "name", label: "Requirement", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "validityDays",
      label: "Validity",
      render: (value) => (value ? `${value} days` : "Manual"),
    },
    {
      key: "reminderDays",
      label: "Reminder",
      render: (value) => `${value} days`,
    },
    {
      key: "customFields",
      label: "Custom Fields",
      render: (value) => {
        const count = Array.isArray(value) ? value.length : 0;
        return count > 0 ? `${count} configured` : "Standard only";
      },
    },
    {
      key: "active",
      label: "Status",
      render: (value) => (value ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>),
    },
  ];

  const requirementColumns: Column<RequirementTableRow>[] = [
    { key: "technicianName", label: "Technician", sortable: true },
    { key: "definitionName", label: "Requirement", sortable: true },
    { key: "definitionCategory", label: "Category", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (value) => getStatusBadge(value as PortalRequirementStatus),
    },
    {
      key: "validUntil",
      label: "Valid Until",
      render: (value) => formatDate(value),
    },
    {
      key: "customFieldValues",
      label: "Client Fields",
      render: (_value, row) => (
        <span className="block max-w-[22rem] text-sm text-muted-foreground">
          {getCustomFieldSummary(row)}
        </span>
      ),
    },
    {
      key: "documentCount",
      label: "Files",
      render: (value, row) =>
        row.latestDocumentUrl ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-primary hover:underline"
            onClick={() => window.open(row.latestDocumentUrl ?? "", "_blank", "noopener,noreferrer")}
          >
            <FileDown className="h-4 w-4" />
            {value}
          </button>
        ) : (
          String(value)
        ),
    },
  ];

  const assignmentColumns: Column<AssignmentTableRow>[] = [
    {
      key: "userName",
      label: "User",
      render: (_value, row) => row.userName ?? row.userEmail ?? `User ${row.userId}`,
    },
    { key: "userEmail", label: "Email" },
    {
      key: "loginEnabled",
      label: "Login",
      render: (value, row) =>
        row.userRole !== "user" ? (
          <Badge variant="outline">Internal</Badge>
        ) : value === false ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline">Active</Badge>
        ),
    },
    {
      key: "accessLevel",
      label: "Access",
      render: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "receiveReminders",
      label: "Reminders",
      render: (value) => (value ? "Yes" : "No"),
    },
    {
      key: "mustChangePassword",
      label: "Password Status",
      render: (value) =>
        value ? (
          <Badge variant="secondary">Reset required</Badge>
        ) : (
          <Badge variant="outline">Ready</Badge>
        ),
    },
    {
      key: "lastSignedIn",
      label: "Last Login",
      render: (value, row) =>
        row.userRole !== "user" ? (
          <Badge variant="outline">Internal</Badge>
        ) : value ? (
          formatDateTime(value)
        ) : (
          <Badge variant="secondary">Not yet signed in</Badge>
        ),
    },
    {
      key: "createdAt",
      label: "Added",
      render: (value) => formatDate(value),
    },
    {
      key: "branchIds",
      label: "Branches",
      render: (value) => {
        const ids = Array.isArray(value) ? value : [];
        if (ids.length === 0) return "All branches";
        return ids
          .map((branchId) => branchesById.get(Number(branchId))?.name ?? `Branch ${branchId}`)
          .join(", ");
      },
    },
  ];
  const branchColumns: Column<PortalBranch>[] = [
    { key: "name", label: "Branch", sortable: true },
    { key: "code", label: "Code" },
    {
      key: "sourceClientName",
      label: "Origin",
      render: (value) =>
        value ? <span className="text-sm text-muted-foreground">Linked from {String(value)}</span> : "Manual",
    },
    {
      key: "active",
      label: "Status",
      render: (value) => (value ? <Badge>Active</Badge> : <Badge variant="outline">Hidden</Badge>),
    },
    { key: "sortOrder", label: "Order", sortable: true },
  ];
  const serviceRequestColumns: Column<PortalServiceRequest>[] = [
    { key: "title", label: "Request", sortable: true },
    {
      key: "serviceDefinitionTitle",
      label: "Type",
      render: (_value, row) => row.serviceDefinitionTitle ?? row.requestType,
    },
    {
      key: "branchName",
      label: "Branch",
      render: (value) => String(value ?? "Client-wide"),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => getServiceRequestStatusBadge(value as PortalServiceRequestStatus),
    },
    {
      key: "preferredDate",
      label: "Preferred",
      render: (value) => formatDate(value),
    },
    {
      key: "supportingDocuments",
      label: "Request Pack",
      render: (_value, row) => {
        const uploadedCount = row.supportingDocuments.filter((document) => Boolean(document.fileUrl)).length;
        const totalCount = row.requestedDocuments.length;
        if (totalCount === 0) return "None";
        return `${uploadedCount}/${totalCount} uploaded`;
      },
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (value) => formatDate(value),
    },
  ];

  const clientDocumentColumns: Column<ClientDocumentTableRow>[] = [
    { key: "title", label: "Document", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "branchName",
      label: "Branch",
      render: (value) => String(value ?? "All branches"),
    },
    {
      key: "health",
      label: "Health",
      render: (value) => getDocumentHealthBadge(value as PortalClientDocumentHealth),
    },
    {
      key: "reviewDate",
      label: "Review Date",
      render: (value) => formatDate(value),
    },
    {
      key: "validUntil",
      label: "Valid Until",
      render: (value) => formatDate(value),
    },
    {
      key: "sourcePath",
      label: "Import Source",
      render: (_value, row) =>
        row.sourcePath ? (
          <span className="text-xs text-muted-foreground">{row.sourceFileName || row.sourcePath}</span>
        ) : (
          "-"
        ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (value) => formatDate(value),
    },
  ];
  const requiredClientDocumentCoverageColumns: Column<RequiredClientDocumentCoverageRow>[] = [
    { key: "documentType", label: "Required Document", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "branchName",
      label: "Latest Scope",
      render: (value) => String(value ?? "All branches"),
    },
    {
      key: "health",
      label: "Coverage",
      render: (value) => getRequiredClientDocumentHealthBadge(value as RequiredClientDocumentHealth),
    },
    {
      key: "reviewDate",
      label: "Review Date",
      render: (value) => formatDate(value),
    },
    {
      key: "validUntil",
      label: "Valid Until",
      render: (value) => formatDate(value),
    },
    {
      key: "updatedAt",
      label: "Latest Update",
      render: (value) => formatDate(value),
    },
  ];
  const requiredClientDocumentActionQueueColumns: Column<RequiredClientDocumentActionQueueRow>[] = [
    { key: "documentType", label: "Required Document", sortable: true },
    {
      key: "health",
      label: "Priority",
      render: (value) => getRequiredClientDocumentHealthBadge(value as RequiredClientDocumentHealth),
    },
    {
      key: "branchName",
      label: "Latest Scope",
      render: (value) => String(value ?? "All branches"),
    },
    {
      key: "reason",
      label: "Reason",
      render: (value) => <span className="block max-w-[28rem]">{String(value)}</span>,
    },
    {
      key: "reviewDate",
      label: "Review Date",
      render: (value) => formatDate(value),
    },
    {
      key: "validUntil",
      label: "Valid Until",
      render: (value) => formatDate(value),
    },
  ];

  const commentColumns: Column<PortalComment>[] = [
    {
      key: "requestType",
      label: "Type",
      render: (value) => getCommentTypeLabel(value as PortalCommentRequestType),
    },
    { key: "subject", label: "Subject", sortable: true },
    {
      key: "message",
      label: "Message",
      render: (value) => <span className="block max-w-[24rem] truncate">{String(value)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => getCommentStatusBadge(value as PortalCommentStatus),
    },
    {
      key: "createdByName",
      label: "Requested By",
      render: (_value, row) => row.createdByName ?? row.createdByEmail ?? `User ${row.userId}`,
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (value) => formatDate(value),
    },
  ];

  const resourceColumns: Column<PortalClientResource>[] = [
    { key: "title", label: "Resource", sortable: true },
    { key: "category", label: "Category", sortable: true },
    {
      key: "branchName",
      label: "Branch",
      render: (value) => String(value ?? "All branches"),
    },
    {
      key: "resourceType",
      label: "Type",
      render: (value) => <Badge variant="outline">{value === "link" ? "Link" : "File"}</Badge>,
    },
    {
      key: "active",
      label: "Visibility",
      render: (value) => (value ? <Badge>Visible</Badge> : <Badge variant="outline">Hidden</Badge>),
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (value) => formatDate(value),
    },
  ];

  const approvalColumns: Column<PortalApprovalRequest>[] = [
    {
      key: "summary",
      label: "Submission",
      render: (_value, row) => (
        <div className="space-y-1">
          <p className="font-medium">{row.summary}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{getApprovalEntityLabel(row.entityType)}</span>
            <span>•</span>
            <span>{getApprovalActionLabel(row.action)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => getApprovalStatusBadge(value as PortalApprovalStatus),
    },
    {
      key: "submittedByName",
      label: "Submitted By",
      render: (_value, row) => row.submittedByName ?? row.submittedByEmail ?? `User ${row.submittedByUserId}`,
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (value) => formatDate(value),
    },
    {
      key: "reviewNotes",
      label: "Review Notes",
      render: (value) =>
        value ? <span className="block max-w-[18rem] truncate text-sm">{String(value)}</span> : "—",
    },
  ];

  const invalidatePortalData = async () => {
    await Promise.all([
      utils.clientPortal.access.list.invalidate(),
      utils.clientPortal.branches.list.invalidate(),
      utils.clientPortal.branches.importCandidates.invalidate(),
      utils.clientPortal.dashboard.get.invalidate(),
      utils.clientPortal.technicians.list.invalidate(),
      utils.clientPortal.requirements.listDefinitions.invalidate(),
      utils.clientPortal.requirements.listMatrix.invalidate(),
      utils.clientPortal.services.listDefinitions.invalidate(),
      utils.clientPortal.services.requestsList.invalidate(),
      utils.clientPortal.guides.list.invalidate(),
      utils.clientPortal.documents.list.invalidate(),
      utils.clientPortal.comments.list.invalidate(),
      utils.clientPortal.resources.list.invalidate(),
      utils.clientPortal.approvals.list.invalidate(),
      utils.clientPortal.activity.list.invalidate(),
      utils.clientPortal.access.assignments.invalidate(),
      utils.clientPortal.settings.getReminderSettings.invalidate(),
    ]);
  };

  const approvalComparisonRows = useMemo(
    () =>
      reviewingApprovalRequest
        ? getApprovalComparisonRows(reviewingApprovalRequest, definitionsById)
        : [],
    [definitionsById, reviewingApprovalRequest]
  );

  const submitApprovalReview = async (decision: "approved" | "rejected") => {
    if (!selectedClientNumber || !reviewingApprovalRequest) return;

    await reviewApprovalMutation.mutateAsync({
      id: reviewingApprovalRequest.id,
      clientId: selectedClientNumber,
      decision,
      reviewNotes: approvalReviewNotes.trim() || null,
    });
    await invalidatePortalData();
    closeApprovalReviewDialog();
    toast.success(decision === "approved" ? "Submission approved and applied" : "Submission rejected");
  };

  const resetOnboardingFlow = () => {
    setOnboardingTechnicianId(null);
    setOnboardingStepIndex(0);
    setOnboardingQueue([]);
  };

  const openRequirementRecord = (row: PortalRequirementRow) => {
    resetOnboardingFlow();
    setRecordDialogValues({});
    setEditingRecord(row);
    setIsRecordDialogOpen(true);
  };

  const closeAssessmentBookingPlanner = () => {
    setAssessmentPlannerTechnicianId(null);
    setAssessmentPlannerTechniques([]);
    setAssessmentPlannerPreferredDate("");
    setAssessmentPlannerNotes("");
  };

  const openAssessmentBookingPlanner = (technician: PortalTechnician) => {
    const techniques = Array.from(
      new Set(
        getPortalTechnicianMethodQualifications(technician).length > 0
          ? getPortalTechnicianMethodQualifications(technician)
              .map((entry) => String(entry.method ?? "").trim())
              .filter(Boolean)
          : technician.methods.map((value) => String(value ?? "").trim()).filter(Boolean)
      )
    );

    setAssessmentPlannerTechnicianId(technician.id);
    setAssessmentPlannerTechniques(techniques);
    setAssessmentPlannerPreferredDate("");
    setAssessmentPlannerNotes("");
  };

  const openAssessmentBookingRequest = (
    technician: PortalTechnician,
    options?: {
      techniques?: string[];
      preferredDate?: string;
      details?: string | null;
      metadata?: Record<string, unknown>;
    }
  ) => {
    const methodQualifications = getPortalTechnicianMethodQualifications(technician);
    const defaultTechniques = Array.from(
      new Set(
        (methodQualifications.length > 0
          ? methodQualifications.map((entry) => entry.method)
          : technician.methods
        )
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
      )
    );
    const techniques = Array.from(
      new Set(
        (options?.techniques && options.techniques.length > 0 ? options.techniques : defaultTechniques)
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
      )
    );
    const selectedDefinition = assessmentServiceDefinition;
    const requestedDocuments = selectedDefinition?.config.requestedDocumentLabels ?? [];

    setServiceRequestDialogValues({
      serviceDefinitionId: selectedDefinition ? String(selectedDefinition.id) : "",
      title: `${technician.name} assessment booking`,
      clientBranchId: technician.clientBranchId ? String(technician.clientBranchId) : "all",
      technicianId: String(technician.id),
      preferredDate: options?.preferredDate ?? "",
      techniques,
      requestedDocuments,
      supportingDocuments: requestedDocuments.map((label) => ({
        label,
        note: "",
        fileName: null,
        fileUrl: null,
        fileDataUrl: null,
      })),
      details:
        options?.details ??
        "Please confirm an assessment booking for this technician and review the preparation checklist linked to the selected techniques.",
      metadata: options?.metadata ?? null,
    });
    setIsServiceRequestDialogOpen(true);
  };

  const openOnboardingForTechnician = (technicianId: number) => {
    const queue = (onboardingQueueByTechnician.get(technicianId) ?? []).map((row) => ({ ...row }));
    if (queue.length === 0) {
      toast.success("This technician is already current on the required onboarding items.");
      return;
    }

    setRecordDialogValues({});
    setOnboardingTechnicianId(technicianId);
    setOnboardingStepIndex(0);
    setOnboardingQueue(queue);
    setEditingRecord(queue[0] ?? null);
    setIsRecordDialogOpen(true);
  };

  const openRequestCount = useMemo(
    () =>
      (portalComments as PortalComment[]).filter((comment) => comment.status !== "closed").length +
      (serviceRequests as PortalServiceRequest[]).filter(
        (request) => !["completed", "closed"].includes(request.status)
      ).length,
    [portalComments, serviceRequests]
  );
  const visibleApprovalRequests = useMemo(
    () =>
      canReviewPortalApprovals
        ? (approvalRequests as PortalApprovalRequest[])
        : (approvalRequests as PortalApprovalRequest[]).filter(
            (request) => request.submittedByUserId === user?.id
          ),
    [approvalRequests, canReviewPortalApprovals, user?.id]
  );
  const pendingApprovalCount = useMemo(
    () =>
      visibleApprovalRequests.filter((request) => request.status === "pending").length,
    [visibleApprovalRequests]
  );
  const openServiceRequestCount = useMemo(
    () =>
      (serviceRequests as PortalServiceRequest[]).filter(
        (request) => !["completed", "closed"].includes(request.status)
      ).length,
    [serviceRequests]
  );
  const urgentComplianceCount =
    (dashboard?.expiredCount ?? 0) + (dashboard?.missingCount ?? 0);
  const clientActionItems = useMemo(
    () =>
      [
        {
          key: "compliance",
          label: "Compliance attention",
          description: "Missing or expired technician items that need updates or evidence.",
          count: urgentComplianceCount,
          focus: "compliance",
        },
        {
          key: "documents",
          label: "Document review due",
          description: "Client-controlled documents approaching review or validity deadlines.",
          count:
            (dashboard?.documentReviewDueCount ?? 0) +
            (dashboard?.documentExpiredCount ?? 0),
          focus: "documents",
        },
        {
          key: "requests",
          label: "Open service requests",
          description: "Procedure, booking, and portal support requests still in progress.",
          count: openServiceRequestCount,
          focus: "services",
        },
        {
          key: "approvals",
          label: "Portal submissions awaiting review",
          description: "Changes submitted through the portal that still need approval or outcome feedback.",
          count: pendingApprovalCount,
          focus: "approvals",
        },
      ].filter((item) => item.count > 0),
    [
      dashboard?.documentExpiredCount,
      dashboard?.documentReviewDueCount,
      openServiceRequestCount,
      pendingApprovalCount,
      urgentComplianceCount,
    ]
  );
  const showApprovalQueue = canReviewPortalApprovals || canEditPortal || visibleApprovalRequests.length > 0;
  const recentPortalActivity = useMemo(
    () => (portalActivity as PortalActivityItem[]).slice(0, 12),
    [portalActivity]
  );
  const selectedBranch = useMemo(
    () =>
      (portalBranches as PortalBranch[]).find((branch) => String(branch.id) === selectedBranchId) ?? null,
    [portalBranches, selectedBranchId]
  );
  const selectedTechnicianProfile = useMemo<TechnicianProfileDetail | null>(() => {
    if (viewingTechnicianId === null) return null;

    const technician =
      (technicians as PortalTechnician[]).find((item) => item.id === viewingTechnicianId) ?? null;
    if (!technician) return null;

    const requirementRows = (requirementMatrix as PortalRequirementRow[])
      .filter((row) => row.technicianId === technician.id)
      .sort((left, right) => {
        const statusDiff =
          getRequirementStatusPriority(left.status) - getRequirementStatusPriority(right.status);
        if (statusDiff !== 0) return statusDiff;

        const sortDiff =
          (definitionSortOrderById.get(left.definitionId) ?? 0) -
          (definitionSortOrderById.get(right.definitionId) ?? 0);
        if (sortDiff !== 0) return sortDiff;

        return left.definitionName.localeCompare(right.definitionName);
      });
    const pendingRows = requirementRows.filter((row) => row.status !== "current");
    const pendingReviewRows = requirementRows.filter((row) => row.status === "pending_review");
    const methodQualifications = getPortalTechnicianMethodQualifications(technician);
    const techniqueNames = Array.from(
      new Set(
        (methodQualifications.length > 0
          ? methodQualifications.map((entry) => entry.method)
          : technician.methods
        )
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
      )
    );
    const techniqueKeys = new Set(techniqueNames.map((value) => normalisePortalTechniqueKey(value)));
    const matchedGuides = (assessmentGuides as PortalAssessmentGuide[]).filter((guide) => {
      const guideKey = normalisePortalTechniqueKey(guide.techniqueName);
      if (!guideKey) return false;
      return techniqueKeys.has(guideKey) || guideKey === "all" || guideKey === "general";
    });
    const coveredTechniqueKeys = new Set(
      matchedGuides
        .map((guide) => normalisePortalTechniqueKey(guide.techniqueName))
        .filter((value) => value !== "all" && value !== "general")
    );
    const uncoveredTechniques = techniqueNames.filter(
      (value) => !coveredTechniqueKeys.has(normalisePortalTechniqueKey(value))
    );
    const readinessBringItems = Array.from(
      new Set(
        matchedGuides.flatMap((guide) =>
          guide.bringItems.map((item) => String(item ?? "").trim()).filter(Boolean)
        )
      )
    );
    const readinessCompanyItems = Array.from(
      new Set(
        matchedGuides.flatMap((guide) =>
          guide.companyItems.map((item) => String(item ?? "").trim()).filter(Boolean)
        )
      )
    );
    const relatedAssessmentRequests = (serviceRequests as PortalServiceRequest[])
      .filter((request) => request.technicianId === technician.id)
      .filter((request) => {
        const definition = request.serviceDefinitionId
          ? serviceDefinitionsById.get(request.serviceDefinitionId)
          : null;
        return isAssessmentRelatedText(
          `${request.requestType} ${request.title} ${definition?.title ?? ""} ${definition?.category ?? ""}`
        );
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

    return {
      technician,
      branchName:
        technician.clientBranchId !== null && technician.clientBranchId !== undefined
          ? branchesById.get(technician.clientBranchId)?.name ?? null
          : null,
      methodQualifications,
      requirementRows,
      pendingRows,
      pendingReviewRows,
      matchedGuides,
      uncoveredTechniques,
      readinessBringItems,
      readinessCompanyItems,
      relatedAssessmentRequests,
      currentCount: requirementRows.filter((row) => row.status === "current").length,
      expiringCount: requirementRows.filter((row) => row.status === "expiring").length,
      expiredCount: requirementRows.filter((row) => row.status === "expired").length,
      missingCount: requirementRows.filter((row) => row.status === "missing").length,
    };
  }, [
    assessmentGuides,
    branchesById,
    definitionSortOrderById,
    requirementMatrix,
    serviceDefinitionsById,
    serviceRequests,
    technicians,
    viewingTechnicianId,
  ]);
  const assessmentBookingPlanner = useMemo<AssessmentBookingPlannerDetail | null>(() => {
    if (assessmentPlannerTechnicianId === null) return null;

    const technician =
      (technicians as PortalTechnician[]).find((item) => item.id === assessmentPlannerTechnicianId) ?? null;
    if (!technician) return null;

    const techniqueOptions = Array.from(
      new Set(
        (getPortalTechnicianMethodQualifications(technician).length > 0
          ? getPortalTechnicianMethodQualifications(technician).map((entry) => entry.method)
          : technician.methods
        )
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
      )
    );
    const selectedTechniques =
      assessmentPlannerTechniques.length > 0 ? assessmentPlannerTechniques : techniqueOptions;
    const selectedTechniqueKeys = new Set(
      selectedTechniques.map((value) => normalisePortalTechniqueKey(value))
    );
    const matchedGuides = (assessmentGuides as PortalAssessmentGuide[]).filter((guide) => {
      const guideKey = normalisePortalTechniqueKey(guide.techniqueName);
      if (!guideKey) return false;
      return (
        selectedTechniqueKeys.has(guideKey) || guideKey === "all" || guideKey === "general"
      );
    });
    const coveredTechniqueKeys = new Set(
      matchedGuides
        .map((guide) => normalisePortalTechniqueKey(guide.techniqueName))
        .filter((value) => value !== "all" && value !== "general")
    );
    const uncoveredTechniques = selectedTechniques.filter(
      (value) => !coveredTechniqueKeys.has(normalisePortalTechniqueKey(value))
    );
    const bringItems = Array.from(
      new Set(
        matchedGuides.flatMap((guide) =>
          guide.bringItems.map((item) => String(item ?? "").trim()).filter(Boolean)
        )
      )
    );
    const companyItems = Array.from(
      new Set(
        matchedGuides.flatMap((guide) =>
          guide.companyItems.map((item) => String(item ?? "").trim()).filter(Boolean)
        )
      )
    );
    const recentRequests = (serviceRequests as PortalServiceRequest[])
      .filter((request) => request.technicianId === technician.id)
      .filter((request) => isAssessmentRelatedText(`${request.requestType} ${request.title}`))
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );

    return {
      technician,
      branchName:
        technician.clientBranchId !== null && technician.clientBranchId !== undefined
          ? branchesById.get(technician.clientBranchId)?.name ?? null
          : null,
      techniqueOptions,
      selectedTechniques,
      matchedGuides,
      uncoveredTechniques,
      bringItems,
      companyItems,
      recentRequests,
    };
  }, [
    assessmentGuides,
    assessmentPlannerTechniques,
    assessmentPlannerTechnicianId,
    branchesById,
    serviceRequests,
    technicians,
  ]);
  const assessmentReadinessSummary = useMemo(
    () => ({
      ready: assessmentReadinessRows.filter((row) => row.status === "ready").length,
      bookingInProgress: assessmentReadinessRows.filter((row) => row.status === "booking_in_progress").length,
      needsPreparation: assessmentReadinessRows.filter((row) => row.status === "needs_preparation").length,
      needsGuidance: assessmentReadinessRows.filter((row) => row.status === "needs_guidance").length,
    }),
    [assessmentReadinessRows]
  );

  const assignmentRows = assignments as AssignmentTableRow[];
  const assignedUserCount = assignmentRows.length;
  const clientUserRows = assignmentRows.filter((row) => row.userRole === "user");
  const activeClientUserCount = clientUserRows.filter((row) => row.loginEnabled !== false).length;
  const suspendedClientUserCount = clientUserRows.filter((row) => row.loginEnabled === false).length;
  const passwordResetPendingCount = clientUserRows.filter((row) => row.mustChangePassword).length;
  const notYetSignedInCount = clientUserRows.filter((row) => !row.lastSignedIn).length;
  const portalLoginUrl = useMemo(() => {
    if (typeof window === "undefined") return getClientLoginUrl();
    return `${window.location.origin}${getClientLoginUrl()}`;
  }, []);
  const portalInviteMessage = useMemo(() => {
    const companyName = selectedClient?.companyName ?? "your company";
    const branchLine =
      (portalBranches as PortalBranch[]).length > 0
        ? "Branch access can be limited to the branches allocated to each user."
        : "No branch restrictions have been configured for this client yet.";

    return [
      `TextPoint client portal access has been prepared for ${companyName}.`,
      `Login link: ${portalLoginUrl}`,
      "Use the email address and password allocated to your company account.",
      branchLine,
    ].join("\n");
  }, [portalBranches, portalLoginUrl, selectedClient?.companyName]);
  const credentialInviteMessage = useMemo(() => {
    if (!credentialHandoff) return "";
    return [
      `TextPoint client portal access has been prepared for ${selectedClient?.companyName ?? "your company"}.`,
      credentialHandoff.mode === "created"
        ? "A new client portal login has been created."
        : "The client portal password has been reset.",
      credentialHandoff.name ? `Name: ${credentialHandoff.name}` : null,
      `Email: ${credentialHandoff.email}`,
      `Temporary Password: ${credentialHandoff.password}`,
      `Login link: ${portalLoginUrl}`,
      "The user will be forced to change this password on first sign-in.",
    ]
      .filter(Boolean)
      .join("\n");
  }, [credentialHandoff, portalLoginUrl, selectedClient?.companyName]);
  const handleSendCredentialEmail = async () => {
    if (!credentialHandoff || !selectedClientNumber) return;
    try {
      const delivery = await sendPortalCredentialsEmailMutation.mutateAsync({
        clientId: selectedClientNumber,
        userId: credentialHandoff.userId,
        password: credentialHandoff.password,
        mode: credentialHandoff.mode,
      });
      if (delivery.sent) {
        setCredentialHandoff((current) =>
          current
            ? {
                ...current,
                emailConfigured: delivery.configured,
                emailSent: true,
              }
            : current
        );
        toast.success("Client login email sent");
        return;
      }
      toast.error("Email delivery is not configured yet. Copy the invite details and share them manually.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the client login email");
    }
  };
  const clientWorkspaceSteps = useMemo(
    () => [
      {
        key: "services",
        title: "Submit a portal request",
        detail:
          "Use procedure, review, and booking requests when you need Level III support or an assessment date.",
        actionLabel: "Open Requests",
        focus: "services",
      },
      {
        key: "guidance",
        title: "Check assessment preparation",
        detail:
          "Review what the technician must bring and what the company should upload before the assessment.",
        actionLabel: "View Preparation",
        focus: "guidance",
      },
      {
        key: "compliance",
        title: "Keep technicians current",
        detail:
          "Update eye tests, medicals, certifications, and other requirement records before they expire.",
        actionLabel: "Open Compliance",
        focus: "compliance",
      },
    ],
    []
  );
  const accessScopeLabel = useMemo(() => {
    if (!selectedClient) return "No client selected";
    const branchSuffix = selectedBranch ? ` Branch scope: ${selectedBranch.name}.` : "";
    if (isSystemAdmin) {
      return `Admin scope with full management rights for ${selectedClient.companyName}.${branchSuffix}`;
    }
    if ((accessibleClients as PortalClient[]).length === 1) {
      return `Restricted to ${selectedClient.companyName} only.${branchSuffix}`;
    }
    return `Restricted to allocated client data only. Active scope: ${selectedClient.companyName}.${branchSuffix}`;
  }, [accessibleClients, isSystemAdmin, selectedBranch, selectedClient]);

  useEffect(() => {
    if (!selectedClient || !requestedFocus) return;

    const target = document.getElementById(`portal-${requestedFocus}`);
    if (!target) return;

    const timeoutId = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [requestedFocus, selectedClient]);

  const openPortalActivityFocus = (focus: string) => {
    if (focus === "settings") {
      if (canManagePortal) {
        setIsReminderSettingsDialogOpen(true);
      }
      return;
    }

    const targetId =
      focus === "access"
        ? "portal-access"
        : focus === "overview"
          ? "portal-activity"
          : `portal-${focus}`;
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Client Portal</h1>
            <p className="text-sm text-muted-foreground">
              Track Level III client technicians, compliance requirements, expiry dates, and supporting documents.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-[260px]">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder={accessLoading ? "Loading clients..." : "Select a client"} />
                </SelectTrigger>
                <SelectContent>
                  {(accessibleClients as PortalClient[]).map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {portalBranches.length > 0 ? (
              <div className="min-w-[240px]">
                <Select value={selectedBranchId || "all"} onValueChange={(value) => setSelectedBranchId(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All accessible branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All accessible branches</SelectItem>
                    {(portalBranches as PortalBranch[]).map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.code ? `${branch.name} (${branch.code})` : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {canManagePortal ? (
              <Button
                onClick={() => {
                  setEditingDefinition(null);
                  setIsDefinitionDialogOpen(true);
                }}
                disabled={!selectedClientNumber}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            ) : null}

            {canEditPortal ? (
              <Button
                variant="outline"
                onClick={() => {
                  setServiceRequestDialogValues({});
                  setIsServiceRequestDialogOpen(true);
                }}
                disabled={!selectedClientNumber}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                New Portal Request
              </Button>
            ) : null}

            {canEditPortal ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingTechnician(null);
                  setIsTechnicianDialogOpen(true);
                }}
                disabled={!selectedClientNumber}
              >
                <Users className="mr-2 h-4 w-4" />
                Add Technician
              </Button>
            ) : null}

            {canEditPortal ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetOnboardingFlow();
                  setEditingRecord(null);
                  setIsRecordDialogOpen(true);
                }}
                disabled={!selectedClientNumber}
              >
                <Upload className="mr-2 h-4 w-4" />
                Update Compliance
              </Button>
            ) : null}

            {canEditPortal ? (
              <Button
                variant="outline"
                onClick={() => openSeededClientDocumentDialog()}
                disabled={!selectedClientNumber}
              >
                <FileText className="mr-2 h-4 w-4" />
                Add Client Document
              </Button>
            ) : null}

            {canEditPortal ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingResource(null);
                  setIsResourceDialogOpen(true);
                }}
                disabled={!selectedClientNumber}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            ) : null}

            {canManagePortal ? (
              <Button
                variant="outline"
                onClick={() => setIsReminderSettingsDialogOpen(true)}
                disabled={!selectedClientNumber}
              >
                <Clock3 className="mr-2 h-4 w-4" />
                Reminder Rules
              </Button>
            ) : null}

            <Button
              variant="outline"
              onClick={() => setIsCommentDialogOpen(true)}
              disabled={!selectedClientNumber}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              New Request
            </Button>

            {canManageAssignments ? (
              <Button
                variant="outline"
                onClick={() => setIsCreatePortalUserDialogOpen(true)}
                disabled={!selectedClientNumber}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Client Login
              </Button>
            ) : null}

            {canAssignExistingUsers ? (
              <Button
                variant="outline"
                onClick={() => setIsAssignmentDialogOpen(true)}
                disabled={!selectedClientNumber}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assign User
              </Button>
            ) : null}

            {canManagePortal ? (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingBranch(null);
                  setIsBranchDialogOpen(true);
                }}
                disabled={!selectedClientNumber}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            ) : null}
          </div>
        </div>

        {selectedClient ? (
          <div
            id="portal-access"
            className={canManageAssignments ? "grid gap-6 xl:grid-cols-[1.2fr_1fr]" : "grid gap-6"}
          >
            <Card>
              <CardHeader>
                <CardTitle>Access Scope</CardTitle>
                <CardDescription>
                  Portal users are limited to the client companies specifically allocated to their account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                  <LockKeyhole className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{accessScopeLabel}</p>
                    <p className="text-muted-foreground">
                      Current access level:{" "}
                      <span className="font-medium text-foreground capitalize">
                        {selectedClient.accessLevel}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Allocated client count:{" "}
                      <span className="font-medium text-foreground">
                        {(accessibleClients as PortalClient[]).length}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Active Client
                    </p>
                    <p className="mt-2 font-medium">{selectedClient.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      Only data tied to this client is shown inside the portal scope.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Contact
                    </p>
                    <p className="mt-2 font-medium">{selectedClient.primaryContact || "Not set"}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedClient.email || "No client contact email recorded yet."}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Active Branch Scope
                    </p>
                    <p className="mt-2 font-medium">{selectedBranch?.name ?? "All accessible branches"}</p>
                    <p className="text-sm text-muted-foreground">
                      {(portalBranches as PortalBranch[]).length > 0
                        ? "Use the branch filter to limit technicians, bookings, and guidance to a specific branch."
                        : "No separate branches have been configured for this client yet."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canManageAssignments ? (
              <Card>
                <CardHeader>
                  <CardTitle>Client Login & Allocation</CardTitle>
                  <CardDescription>
                    Create client sign-ins, share the correct login link, and manage who can access this client portal.
                    {canAssignExistingUsers
                      ? " Internal admins can also allocate an existing app user."
                      : " Client managers can manage logins created for this company without opening broader internal admin access."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Client Login URL
                    </p>
                    <p className="mt-2 break-all text-sm font-medium">{portalLoginUrl}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Share this link with allocated client users so they land straight on the client portal sign-in.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Assigned Users
                      </p>
                      <p className="mt-2 text-2xl font-semibold">{assignedUserCount}</p>
                      <p className="text-sm text-muted-foreground">
                        Existing users currently allocated to {selectedClient.companyName}.
                      </p>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Branches Configured
                      </p>
                      <p className="mt-2 font-medium">{(portalBranches as PortalBranch[]).length}</p>
                      <p className="text-sm text-muted-foreground">
                        Client users can be limited to specific branches if you assign branch scope.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(portalLoginUrl);
                          toast.success("Client portal login link copied");
                        } catch {
                          toast.error("Could not copy the login link");
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Login Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(portalInviteMessage);
                          toast.success("Client portal invite message copied");
                        } catch {
                          toast.error("Could not copy the invite message");
                        }
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Copy Invite Message
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        window.open(portalLoginUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open Client Login
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreatePortalUserDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Client Login
                    </Button>
                    {canAssignExistingUsers ? (
                      <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(true)}>
                        <Users className="mr-2 h-4 w-4" />
                        Allocate Existing User
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {!selectedClient ? (
          <Card>
            <CardHeader>
              <CardTitle>No Client Portal Access Yet</CardTitle>
              <CardDescription>
                Ask an administrator to link your account to a Level III client before using this portal.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-9">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Technicians</CardDescription>
                  <CardTitle>{dashboard?.technicianCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Requirements</CardDescription>
                  <CardTitle>{dashboard?.requirementDefinitionCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Expiring Soon</CardDescription>
                  <CardTitle className="text-amber-600">{dashboard?.expiringCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Expired</CardDescription>
                  <CardTitle className="text-red-600">{dashboard?.expiredCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Missing</CardDescription>
                  <CardTitle>{dashboard?.missingCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Client Docs</CardDescription>
                  <CardTitle>{dashboard?.documentCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Docs Review Due</CardDescription>
                  <CardTitle className="text-amber-600">{dashboard?.documentReviewDueCount ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              {showApprovalQueue ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>
                      {canReviewPortalApprovals ? "Pending Approval" : "My Pending Submissions"}
                    </CardDescription>
                    <CardTitle className="text-amber-600">{pendingApprovalCount}</CardTitle>
                  </CardHeader>
                </Card>
              ) : null}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Open Requests</CardDescription>
                  <CardTitle>{openRequestCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
              <Card id="portal-action-centre">
                <CardHeader>
                  <CardTitle>Client Action Centre</CardTitle>
                  <CardDescription>
                    Focus on the next actions that matter most for this client portal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clientActionItems.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {clientActionItems.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => openPortalActivityFocus(item.focus)}
                          className="rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                            </div>
                            <Badge variant="secondary">{item.count}</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No urgent client-portal actions are outstanding right now. Use the quick actions below to submit requests, update records, or upload client files.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {canEditPortal ? (
                      <Button
                        onClick={() => {
                          setServiceRequestDialogValues({});
                          setIsServiceRequestDialogOpen(true);
                        }}
                      >
                        <ClipboardList className="mr-2 h-4 w-4" />
                        New Portal Request
                      </Button>
                    ) : null}
                    {canEditPortal ? (
                      <Button
                        variant="outline"
                        onClick={() => openSeededClientDocumentDialog()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Client Document
                      </Button>
                    ) : null}
                    {canEditPortal ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingResource(null);
                          setIsResourceDialogOpen(true);
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Add General Resource
                      </Button>
                    ) : null}
                    <Button variant="outline" onClick={() => openPortalActivityFocus("guidance")}>
                      <BookOpenCheck className="mr-2 h-4 w-4" />
                      Assessment Preparation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCommentDialogOpen(true);
                      }}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Contact / Suggest
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    A quick guide for new or occasional client portal users.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Current scope</p>
                    <p className="mt-1">{accessScopeLabel}</p>
                  </div>
                  <div className="space-y-3">
                    {clientWorkspaceSteps.map((step, index) => (
                      <div key={step.key} className="rounded-lg border p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{step.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                            <Button
                              variant="link"
                              className="mt-1 h-auto px-0"
                              onClick={() => openPortalActivityFocus(step.focus)}
                            >
                              {step.actionLabel}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {canManagePortal ? (
              <Card id="portal-branches">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Client Branches</CardTitle>
                      <CardDescription>
                        Control branch-level visibility so one branch does not automatically see another branch's technicians and requests.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsBranchImportDialogOpen(true);
                        }}
                        disabled={(branchImportCandidates as PortalBranchImportCandidate[]).length === 0}
                      >
                        Link Existing Clients
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingBranch(null);
                          setIsBranchDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Branch
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    If your branches were originally captured as separate Level III clients, choose
                    the head office here and use <span className="font-medium text-foreground">Link Existing Clients</span>{" "}
                    to convert those client records into branches under this client.
                  </div>
                  <DataTable
                    columns={branchColumns}
                    data={portalBranches as PortalBranch[]}
                    pageSize={6}
                    searchPlaceholder="Search branches..."
                    actions={(row) => (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingBranch(row);
                            setIsBranchDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!selectedClientNumber) return;
                            try {
                              await deleteBranchMutation.mutateAsync({
                                id: row.id,
                                clientId: selectedClientNumber,
                              });
                              await invalidatePortalData();
                              toast.success("Branch removed");
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Could not remove this branch"
                              );
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Card id="portal-services">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Procedure, Review & Booking Requests</CardTitle>
                      <CardDescription>
                        Clients can request procedure reviews or additions, book technician assessments, and track the status of those requests.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canManagePortal ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingServiceDefinition(null);
                            setIsServiceDefinitionDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Service Type
                        </Button>
                      ) : null}
                      {canEditPortal ? (
                        <Button
                          onClick={() => {
                            setServiceRequestDialogValues({});
                            setIsServiceRequestDialogOpen(true);
                          }}
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          New Request
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(serviceRequests as PortalServiceRequest[]).length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No portal requests have been submitted for this client yet.
                      {canEditPortal
                        ? " Use New Request to ask for a procedure review, booking, or another Level III service."
                        : ""}
                    </div>
                  ) : null}
                  <DataTable
                    columns={serviceRequestColumns}
                    data={serviceRequests as PortalServiceRequest[]}
                    pageSize={6}
                    searchPlaceholder="Search requests..."
                    actions={(row) => (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingServiceRequest(row)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        {canManagePortal ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!selectedClientNumber) return;
                              try {
                                const nextStatus =
                                  row.status === "submitted"
                                    ? "in_review"
                                    : row.status === "in_review"
                                      ? "planned"
                                      : row.status === "planned"
                                        ? "scheduled"
                                        : row.status === "scheduled"
                                          ? "completed"
                                          : "closed";
                                await updateServiceRequestStatusMutation.mutateAsync({
                                  id: row.id,
                                  clientId: selectedClientNumber,
                                  branchId: selectedBranchNumber,
                                  status: nextStatus,
                                  internalNotes: row.internalNotes ?? null,
                                });
                                await invalidatePortalData();
                                toast.success("Request status updated");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not update this request"
                                );
                              }
                            }}
                          >
                            Advance
                          </Button>
                        ) : null}
                      </div>
                    )}
                  />
                  {canManagePortal && activeServiceDefinitions.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {activeServiceDefinitions.map((definition) => (
                        <div key={definition.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{definition.title}</p>
                              <p className="text-sm text-muted-foreground">{definition.category}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingServiceDefinition(definition);
                                setIsServiceDefinitionDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </div>
                          {definition.description ? (
                            <p className="mt-3 text-sm text-muted-foreground">{definition.description}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card id="portal-guidance">
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Assessment Preparation</CardTitle>
                      <CardDescription>
                        Show clients what each technician should bring, plus what the company must upload or send ahead of the assessment.
                      </CardDescription>
                    </div>
                    {canManagePortal ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingAssessmentGuide(null);
                          setIsAssessmentGuideDialogOpen(true);
                        }}
                      >
                        <BookOpenCheck className="mr-2 h-4 w-4" />
                        Add Guide
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(assessmentGuides as PortalAssessmentGuide[]).length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No assessment preparation guides have been configured yet for this client or branch scope.
                    </div>
                  ) : (
                    (assessmentGuides as PortalAssessmentGuide[]).map((guide) => (
                    <div key={guide.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{guide.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {guide.techniqueName}
                            {guide.branchName ? ` • ${guide.branchName}` : ""}
                          </p>
                        </div>
                        {canManagePortal ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAssessmentGuide(guide);
                              setIsAssessmentGuideDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </div>
                      {guide.description ? (
                        <p className="mt-3 text-sm text-muted-foreground">{guide.description}</p>
                      ) : null}
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm font-medium">Technician must bring</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {guide.bringItems.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Company must send / upload</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            {guide.companyItems.map((item) => (
                              <li key={item}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card id="portal-assessment-queue">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Assessment Readiness Queue</CardTitle>
                    <CardDescription>
                      See which technicians are ready to book, which still need preparation, and
                      where assessment guides are still missing.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{assessmentReadinessSummary.ready} ready</Badge>
                    <Badge variant="secondary">
                      {assessmentReadinessSummary.bookingInProgress} in progress
                    </Badge>
                    <Badge variant="outline">
                      {assessmentReadinessSummary.needsPreparation} prep needed
                    </Badge>
                    <Badge variant="destructive">
                      {assessmentReadinessSummary.needsGuidance} guide gaps
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {assessmentReadinessRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No technicians have been captured for this client scope yet.
                    {canEditPortal ? " Add technicians first to start planning assessments." : ""}
                  </div>
                ) : null}
                <DataTable
                  columns={assessmentReadinessColumns}
                  data={assessmentReadinessRows}
                  pageSize={8}
                  searchPlaceholder="Search readiness queue..."
                  actions={(row) => {
                    const technician = techniciansById.get(row.id);
                    if (!technician) return null;
                    const latestRequest = latestAssessmentRequestByTechnician.get(row.id) ?? null;

                    return (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingTechnicianId(technician.id)}
                        >
                          View
                        </Button>
                        {canEditPortal ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAssessmentBookingPlanner(technician)}
                          >
                            Plan Booking
                          </Button>
                        ) : null}
                        {latestRequest ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingServiceRequest(latestRequest)}
                          >
                            Booking
                          </Button>
                        ) : null}
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Technician Compliance Summary</CardTitle>
                  <CardDescription>
                    Each technician shows current, expiring, expired, and missing records across the selected client requirements.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {technicianSummaryRows.length === 0 ? (
                    <div className="mb-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No technicians have been captured for this client scope yet.
                      {canEditPortal ? " Add or import technicians to begin tracking compliance." : ""}
                    </div>
                  ) : null}
                  <DataTable
                    columns={technicianColumns}
                    data={technicianSummaryRows}
                    pageSize={8}
                    searchPlaceholder="Search technicians..."
                    actions={
                      canEditPortal
                        ? (row) => {
                            const technician = (technicians as PortalTechnician[]).find(
                              (item) => item.id === row.id
                            );
                            if (!technician) return null;

                            const onboardingCount =
                              onboardingQueueByTechnician.get(technician.id)?.length ?? 0;

                            return (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingTechnicianId(technician.id)}
                                >
                                  View
                                </Button>
                                {onboardingCount > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openOnboardingForTechnician(technician.id)}
                                  >
                                    Onboard
                                  </Button>
                                ) : null}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingTechnician(technician);
                                    setIsTechnicianDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                                {canManagePortal ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!selectedClientNumber) return;
                                      try {
                                        const result = await deleteTechnicianMutation.mutateAsync({
                                          id: technician.id,
                                          clientId: selectedClientNumber,
                                          branchId: selectedBranchNumber,
                                        });
                                        toast.success(
                                          isApprovalRequestResult(result)
                                            ? "Technician removal submitted for approval"
                                            : "Technician removed"
                                        );
                                        await invalidatePortalData();
                                      } catch (error) {
                                        toast.error(
                                          error instanceof Error
                                            ? error.message
                                            : "Could not remove the technician"
                                        );
                                      }
                                    }}
                                    disabled={deleteTechnicianMutation.isPending}
                                  >
                                    Remove
                                  </Button>
                                ) : null}
                              </div>
                            );
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Priority Reminders</CardTitle>
                    <CardDescription>
                      The most urgent expiries and review items for this client.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(dashboard as PortalDashboard | undefined)?.reminders?.length ? (
                      (dashboard as PortalDashboard).reminders.map((reminder, index) => (
                        <div key={`${reminder.technicianId}-${reminder.definitionName}-${index}`} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">{reminder.technicianName}</p>
                              <p className="text-sm text-muted-foreground">{reminder.definitionName}</p>
                            </div>
                            {getStatusBadge(reminder.status)}
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>Valid until {formatDate(reminder.validUntil)}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No urgent reminders for this client right now.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {canEditPortal ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Technician Onboarding Queue</CardTitle>
                      <CardDescription>
                        Continue missing or expired technician onboarding items one requirement at a time with evidence uploads.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {isOnboardingMode && onboardingTechnician ? (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div>
                              <p className="font-medium">{onboardingTechnician.name}</p>
                              <p className="text-muted-foreground">
                                Step {onboardingStepIndex + 1} of {onboardingQueue.length}:{" "}
                                {activeOnboardingRow?.definitionName ?? "Compliance item"}
                              </p>
                            </div>
                            <Badge variant="secondary">In Progress</Badge>
                          </div>
                          <Progress className="mt-3" value={onboardingProgress} />
                        </div>
                      ) : null}

                      {onboardingOverviewRows.length > 0 ? (
                        onboardingOverviewRows.slice(0, 5).map((entry) => (
                          <div key={entry?.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{entry?.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Next: {entry?.nextRequirement}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {entry ? getStatusBadge(entry.nextStatus as PortalRequirementStatus) : null}
                                <Badge variant="outline">
                                  {entry?.pendingCount} item{entry?.pendingCount === 1 ? "" : "s"}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (entry) openOnboardingForTechnician(entry.id);
                                }}
                              >
                                Continue
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No technicians currently need guided onboarding attention.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>

            {showApprovalQueue ? (
              <div id="portal-approvals">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {canReviewPortalApprovals ? "Client Submission Review" : "My Portal Submissions"}
                    </CardTitle>
                    <CardDescription>
                      {canReviewPortalApprovals
                        ? "Client-submitted technician, compliance, document, and resource changes stay here until an internal admin approves or rejects them."
                        : "Track the status of the portal changes you submitted for internal approval."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={approvalColumns}
                      data={visibleApprovalRequests}
                      pageSize={8}
                      searchPlaceholder={
                        canReviewPortalApprovals
                          ? "Search client submissions..."
                          : "Search my submissions..."
                      }
                      actions={(row) => {
                        return (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openApprovalReviewDialog(row)}
                            >
                              View Details
                            </Button>
                            {canReviewPortalApprovals && row.status === "pending" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openApprovalReviewDialog(row)}
                              >
                                <ShieldCheck className="mr-1 h-4 w-4" />
                                Approve
                              </Button>
                            ) : null}
                            {canReviewPortalApprovals && row.status === "pending" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openApprovalReviewDialog(row)}
                              >
                                <AlertTriangle className="mr-1 h-4 w-4" />
                                Reject
                              </Button>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div id="portal-activity">
              <Card>
                <CardHeader>
                  <CardTitle>Portal Activity</CardTitle>
                  <CardDescription>
                    Recent portal changes, submissions, requests, and review outcomes for this Level III client.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentPortalActivity.length > 0 ? (
                    recentPortalActivity.map((activity) => (
                      <div key={activity.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{activity.title}</p>
                              <Badge variant="outline">{activity.entityLabel}</Badge>
                              {getPortalActivityStatusBadge(activity)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {activity.description || "A portal action was recorded."}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {activity.actorName ??
                                  activity.actorEmail ??
                                  "System user"}
                              </span>
                              <span>•</span>
                              <span>{formatDate(activity.createdAt)}</span>
                            </div>
                          </div>
                          {activity.focus !== "overview" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPortalActivityFocus(activity.focus)}
                            >
                              Open Section
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No recent portal activity has been recorded for this client yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div id="portal-compliance">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Register</CardTitle>
                <CardDescription>
                  Update technician records, upload evidence, and see which items are missing or nearing expiry.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requirementTableRows.length === 0 ? (
                  <div className="mb-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No compliance rows are available yet for this client scope.
                    {canEditPortal ? " Once technicians and requirements are in place, their tracked items will appear here." : ""}
                  </div>
                ) : null}
                <DataTable
                  columns={requirementColumns}
                  data={requirementTableRows}
                  pageSize={12}
                  searchPlaceholder="Search technicians or requirements..."
                  actions={
                    canEditPortal
                      ? (row) => (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRequirementRecord(row)}
                            >
                              Update
                            </Button>
                          </div>
                        )
                      : undefined
                  }
                />
              </CardContent>
            </Card>
            </div>

            <div id="portal-resources">
            <Card>
              <CardHeader>
                <CardTitle>General Resources</CardTitle>
                <CardDescription>
                  Share application forms, reference files, onboarding packs, and useful links for this client.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(portalResources as PortalClientResource[]).length === 0 ? (
                  <div className="mb-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No general resources have been uploaded for this client yet.
                    {canEditPortal ? " Add onboarding packs, application forms, or useful links here." : ""}
                  </div>
                ) : null}
                <DataTable
                  columns={resourceColumns}
                  data={portalResources as PortalClientResource[]}
                  pageSize={8}
                  searchPlaceholder="Search client resources..."
                  actions={(row) => {
                    const openUrl = row.resourceType === "link" ? row.linkUrl : row.fileUrl;
                    return (
                      <div className="flex gap-2">
                        {openUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
                          >
                            <FileDown className="mr-1 h-4 w-4" />
                            Open
                          </Button>
                        ) : null}
                        {canEditPortal ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingResource(row);
                              setIsResourceDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canEditPortal ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!selectedClientNumber) return;
                              try {
                                const result = await deleteResourceMutation.mutateAsync({
                                  id: row.id,
                                  clientId: selectedClientNumber,
                                  branchId: selectedBranchNumber,
                                });
                                toast.success(
                                  isApprovalRequestResult(result)
                                    ? "Resource removal submitted for approval"
                                    : "Resource removed"
                                );
                                await invalidatePortalData();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : "Could not remove resource"
                                );
                              }
                            }}
                            disabled={deleteResourceMutation.isPending}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>
            </div>

            <div id="portal-documents">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle>Client Documents</CardTitle>
                    <CardDescription>
                      Store procedures, appointment letters, written practices, and other client-controlled files with review and validity dates.
                    </CardDescription>
                  </div>
                  {canEditPortal ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsClientDocumentImportDialogOpen(true)}>
                        <Upload className="mr-1 h-4 w-4" />
                        Import References
                      </Button>
                    </div>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {allowedClientDocumentLabels.length > 0 ? (
                  <div className="mb-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium">Required Document Coverage</p>
                      <p className="text-sm text-muted-foreground">
                        This compares the admin-approved document list against the latest uploaded file for each required type.
                        {selectedBranchNumber !== null
                          ? " Client-wide documents and this selected branch both count toward coverage."
                          : " In client-wide view, the latest matching document for each type is used."}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Required Types</p>
                        <p className="mt-2 text-2xl font-semibold">{requiredClientDocumentCoverageSummary.total}</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current</p>
                        <p className="mt-2 text-2xl font-semibold text-emerald-600">
                          {requiredClientDocumentCoverageSummary.current}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Review Due</p>
                        <p className="mt-2 text-2xl font-semibold text-amber-600">
                          {requiredClientDocumentCoverageSummary.reviewDue}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Expired</p>
                        <p className="mt-2 text-2xl font-semibold text-red-600">
                          {requiredClientDocumentCoverageSummary.expired}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-700">
                          {requiredClientDocumentCoverageSummary.missing}
                        </p>
                      </div>
                    </div>
                    {requiredClientDocumentActionQueue.length > 0 ? (
                      <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
                        <div>
                          <p className="text-sm font-medium">Required Document Action Queue</p>
                          <p className="text-sm text-muted-foreground">
                            This pulls the required document items that still need upload, replacement, or review work.
                          </p>
                        </div>
                        <DataTable
                          columns={requiredClientDocumentActionQueueColumns}
                          data={requiredClientDocumentActionQueue}
                          pageSize={6}
                          searchPlaceholder="Search required document actions..."
                          actions={(row) => (
                            <div className="flex gap-2">
                              {row.latestDocumentId ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const latestDocument = (clientDocuments as ClientDocumentTableRow[]).find(
                                      (document) => document.id === row.latestDocumentId
                                    );
                                    if (!latestDocument) {
                                      return;
                                    }
                                    window.open(latestDocument.fileUrl, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  <FileDown className="mr-1 h-4 w-4" />
                                  Open Latest
                                </Button>
                              ) : null}
                              {canEditPortal ? (
                                <Button
                                  size="sm"
                                  onClick={() => openSeededClientDocumentDialog(row.documentType)}
                                >
                                  <Upload className="mr-1 h-4 w-4" />
                                  {row.actionLabel}
                                </Button>
                              ) : null}
                            </div>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        All required client document types are currently covered. Nothing is waiting in the document action queue.
                      </div>
                    )}
                    <DataTable
                      columns={requiredClientDocumentCoverageColumns}
                      data={requiredClientDocumentCoverageRows}
                      pageSize={8}
                      searchPlaceholder="Search required document coverage..."
                      actions={(row) => (
                        <div className="flex gap-2">
                          {row.latestDocumentId ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const latestDocument = (clientDocuments as ClientDocumentTableRow[]).find(
                                  (document) => document.id === row.latestDocumentId
                                );
                                if (!latestDocument) {
                                  return;
                                }
                                window.open(latestDocument.fileUrl, "_blank", "noopener,noreferrer");
                              }}
                            >
                              <FileDown className="mr-1 h-4 w-4" />
                              Open Latest
                            </Button>
                          ) : null}
                          {canEditPortal ? (
                            <Button
                              variant={row.health === "missing" ? "default" : "outline"}
                              size="sm"
                              onClick={() => openSeededClientDocumentDialog(row.documentType)}
                            >
                              <Upload className="mr-1 h-4 w-4" />
                              {row.health === "missing" ? "Upload Missing" : "Upload New Version"}
                            </Button>
                          ) : null}
                        </div>
                      )}
                    />
                  </div>
                ) : canManagePortal ? (
                  <div className="mb-6 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No allowed client document list is configured yet. Add the required document types under
                    <span className="font-medium text-foreground"> Reminder Rules </span>
                    to turn coverage tracking on here.
                  </div>
                ) : null}
                {(clientDocuments as ClientDocumentTableRow[]).length === 0 ? (
                  <div className="mb-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No client documents are stored yet for this scope.
                    {canEditPortal ? " Upload procedures, appointment letters, or written practices to make them available here." : ""}
                  </div>
                ) : null}
                <DataTable
                  columns={clientDocumentColumns}
                  data={clientDocuments as ClientDocumentTableRow[]}
                  pageSize={10}
                  searchPlaceholder="Search client documents..."
                  actions={(row) => (
                    <div className="flex gap-2">
                      {row.fileUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(row.fileUrl, "_blank", "noopener,noreferrer")}
                        >
                          <FileDown className="mr-1 h-4 w-4" />
                          Open
                        </Button>
                      ) : null}
                      {canEditPortal ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingClientDocument(row);
                            setIsClientDocumentDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canEditPortal ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!selectedClientNumber) return;
                            try {
                              const result = await deleteClientDocumentMutation.mutateAsync({
                                id: row.id,
                                clientId: selectedClientNumber,
                                branchId: selectedBranchNumber,
                              });
                              toast.success(
                                isApprovalRequestResult(result)
                                  ? "Client document removal submitted for approval"
                                  : "Client document removed"
                              );
                              await invalidatePortalData();
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Could not remove client document"
                              );
                            }
                          }}
                          disabled={deleteClientDocumentMutation.isPending}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
              </CardContent>
            </Card>
            </div>

            <div className={canManagePortal ? "grid gap-6 xl:grid-cols-[1.25fr_1fr]" : "grid gap-6"}>
              {canManagePortal ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Requirement Definitions</CardTitle>
                    <CardDescription>
                      Configure the checklist this client should track for technicians and compliance evidence.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={definitionColumns}
                      data={definitions as PortalRequirementDefinition[]}
                      pageSize={8}
                      searchPlaceholder="Search requirements..."
                      actions={(row) => (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDefinition(row);
                            setIsDefinitionDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    />
                  </CardContent>
                </Card>
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Comments & Requests</CardTitle>
                  <CardDescription>
                    Clients can leave comments, ask for contact, and suggest changes while internal users can acknowledge and close requests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(portalComments as PortalComment[]).length === 0 ? (
                    <div className="mb-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No comments or contact requests have been logged yet.
                      {canEditPortal ? " Use the request button to ask for contact or leave a suggestion." : ""}
                    </div>
                  ) : null}
                  <DataTable
                    columns={commentColumns}
                    data={portalComments as PortalComment[]}
                    pageSize={6}
                    searchPlaceholder="Search requests..."
                    actions={
                      canEditPortal
                        ? (row) => {
                            const nextStatus =
                              row.status === "open"
                                ? "acknowledged"
                                : row.status === "acknowledged"
                                  ? "closed"
                                  : "open";
                            const buttonLabel =
                              nextStatus === "acknowledged"
                                ? "Acknowledge"
                                : nextStatus === "closed"
                                  ? "Close"
                                  : "Reopen";

                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!selectedClientNumber) return;
                                  try {
                                    await updateCommentStatusMutation.mutateAsync({
                                      id: row.id,
                                      clientId: selectedClientNumber,
                                      status: nextStatus,
                                    });
                                    toast.success("Request updated");
                                    await invalidatePortalData();
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error ? error.message : "Could not update the request"
                                    );
                                  }
                                }}
                                disabled={updateCommentStatusMutation.isPending}
                              >
                                {buttonLabel}
                              </Button>
                            );
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            </div>

            {canManagePortal ? (
              <Card>
                <CardHeader>
                  <CardTitle>Reminder Settings</CardTitle>
                  <CardDescription>
                    Control which portal reminders are sent, when document reminders start, and when unresolved items escalate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      Compliance reminders:{" "}
                      <span className="font-medium text-foreground">
                        {reminderSettings?.complianceEnabled ? "On" : "Off"}
                      </span>
                    </p>
                    <p>
                      Document reminders:{" "}
                      <span className="font-medium text-foreground">
                        {reminderSettings?.documentEnabled ? "On" : "Off"}
                      </span>
                    </p>
                    <p>
                      Document lead window:{" "}
                      <span className="font-medium text-foreground">
                        {reminderSettings?.documentLeadDays ?? 14} day(s)
                      </span>
                    </p>
                    <p>
                      Compliance escalation:{" "}
                      <span className="font-medium text-foreground">
                        {reminderSettings?.complianceEscalationDays ?? 14} day(s)
                      </span>
                    </p>
                    <p>
                      Document escalation:{" "}
                      <span className="font-medium text-foreground">
                        {reminderSettings?.documentEscalationDays ?? 7} day(s)
                      </span>
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setIsReminderSettingsDialogOpen(true)}
                    disabled={!selectedClientNumber}
                  >
                    Edit Reminder Rules
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {canManageAssignments ? (
              <Card>
                <CardHeader>
                  <CardTitle>Client User Access</CardTitle>
                  <CardDescription>
                    Allocate which app users can view or manage this client portal. This is the admin side of the login allocation workflow.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Active client logins</p>
                      <p className="mt-1 text-2xl font-semibold">{activeClientUserCount}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Suspended logins</p>
                      <p className="mt-1 text-2xl font-semibold">{suspendedClientUserCount}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Password reset pending</p>
                      <p className="mt-1 text-2xl font-semibold">{passwordResetPendingCount}</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Not yet signed in</p>
                      <p className="mt-1 text-2xl font-semibold">{notYetSignedInCount}</p>
                    </div>
                  </div>
                  <DataTable
                    columns={assignmentColumns}
                    data={assignmentRows}
                    pageSize={8}
                    searchPlaceholder="Search assigned users..."
                    actions={(row) => (
                      <div className="flex flex-wrap gap-2">
                        {isSystemAdmin || row.userRole === "user" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAssignment(row);
                              setIsEditAssignmentDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {isSystemAdmin || row.userRole === "user" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResettingPortalUser(row);
                              setIsResetPortalPasswordDialogOpen(true);
                            }}
                          >
                            Reset Password
                          </Button>
                        ) : null}
                        {row.userRole === "user" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!selectedClientNumber) return;
                              try {
                                await setPortalUserLoginEnabledMutation.mutateAsync({
                                  clientId: selectedClientNumber,
                                  userId: row.userId,
                                  loginEnabled: row.loginEnabled === false,
                                });
                                await invalidatePortalData();
                                toast.success(
                                  row.loginEnabled === false
                                    ? "Client login reactivated"
                                    : "Client login suspended"
                                );
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not update this client login"
                                );
                              }
                            }}
                            disabled={setPortalUserLoginEnabledMutation.isPending}
                          >
                            {row.loginEnabled === false ? "Reactivate" : "Suspend"}
                          </Button>
                        ) : null}
                        {isSystemAdmin || row.userRole === "user" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!selectedClientNumber) return;
                              try {
                                await removeUserMutation.mutateAsync({
                                  id: row.id,
                                  clientId: selectedClientNumber,
                                });
                                toast.success("Client access removed");
                                await invalidatePortalData();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : "Could not remove client access"
                                );
                              }
                            }}
                            disabled={removeUserMutation.isPending}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    )}
                  />
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={isTechnicianDialogOpen}
        onOpenChange={(open) => {
          setIsTechnicianDialogOpen(open);
          if (!open) {
            setEditingTechnician(null);
            setTechnicianForm(createEmptyPortalTechnicianForm());
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader className="border-b px-6 pb-4 pt-6">
              <DialogTitle>
                {editingTechnician ? "Edit Technician" : "Add Technician"}
              </DialogTitle>
              <DialogDescription>
                Create or update client technician records directly from the portal with separate levels for each method.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="portal-technician-name">Technician Name</Label>
                  <Input
                    id="portal-technician-name"
                    value={technicianForm.name}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-technician-email">Email</Label>
                  <Input
                    id="portal-technician-email"
                    type="email"
                    value={technicianForm.email}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-technician-phone">Phone</Label>
                  <Input
                    id="portal-technician-phone"
                    value={technicianForm.phone}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                {branchOptions.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="portal-technician-branch">Client Branch</Label>
                    <select
                      id="portal-technician-branch"
                      value={technicianForm.clientBranchId}
                      onChange={(event) =>
                        setTechnicianForm((current) => ({
                          ...current,
                          clientBranchId: event.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={
                        createTechnicianMutation.isPending ||
                        updateTechnicianMutation.isPending ||
                        deleteTechnicianMutation.isPending
                      }
                    >
                      <option value="unassigned">No branch restriction</option>
                      {branchOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="space-y-3 md:col-span-2">
                  <div className="space-y-1">
                    <Label>Methods And Levels</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose the technician methods this client needs, then set the correct level for each method.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {technicianMethodOptions.map((option) => {
                        const selectedEntry = technicianForm.methodQualifications.find(
                          (entry) => entry.method === option.value
                        );

                        return (
                          <div key={option.value} className="rounded-md border border-dashed p-3">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={Boolean(selectedEntry)}
                                onCheckedChange={(checked) => {
                                  setTechnicianForm((current) => {
                                    const remaining = current.methodQualifications.filter(
                                      (entry) => entry.method !== option.value
                                    );
                                    if (!checked) {
                                      return {
                                        ...current,
                                        methodQualifications: remaining,
                                      };
                                    }
                                    return {
                                      ...current,
                                      methodQualifications: [
                                        ...remaining,
                                        {
                                          method: option.value,
                                          level: "",
                                        },
                                      ],
                                    };
                                  });
                                }}
                                disabled={
                                  createTechnicianMutation.isPending ||
                                  updateTechnicianMutation.isPending ||
                                  deleteTechnicianMutation.isPending
                                }
                              />
                              <Label className="cursor-pointer">{option.label}</Label>
                            </div>

                            {selectedEntry ? (
                              <div className="mt-3 space-y-2">
                                <Label htmlFor={`portal-technician-level-${option.value}`}>
                                  Level for {option.label}
                                </Label>
                                <Input
                                  id={`portal-technician-level-${option.value}`}
                                  value={selectedEntry.level}
                                  onChange={(event) =>
                                    setTechnicianForm((current) => ({
                                      ...current,
                                      methodQualifications: current.methodQualifications.map(
                                        (entry) =>
                                          entry.method === option.value
                                            ? { ...entry, level: event.target.value }
                                            : entry
                                      ),
                                    }))
                                  }
                                  placeholder="Level 2 / Level 3"
                                  disabled={
                                    createTechnicianMutation.isPending ||
                                    updateTechnicianMutation.isPending ||
                                    deleteTechnicianMutation.isPending
                                  }
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={technicianForm.hasPcnQualification}
                      onCheckedChange={(checked) =>
                        setTechnicianForm((current) => ({
                          ...current,
                          hasPcnQualification: Boolean(checked),
                          pcnRenewalDate: checked ? current.pcnRenewalDate : "",
                          internalAssessmentDate: checked
                            ? ""
                            : current.internalAssessmentDate,
                        }))
                      }
                      disabled={
                        createTechnicianMutation.isPending ||
                        updateTechnicianMutation.isPending ||
                        deleteTechnicianMutation.isPending
                      }
                    />
                    <Label className="cursor-pointer">
                      This technician holds PCN certification
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-technician-certificate">Certificate Number</Label>
                  <Input
                    id="portal-technician-certificate"
                    value={technicianForm.certificateNumber}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        certificateNumber: event.target.value,
                      }))
                    }
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-technician-eye-test">Eye Test Valid Until</Label>
                  <Input
                    id="portal-technician-eye-test"
                    type="date"
                    value={technicianForm.eyeTestValidUntil}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        eyeTestValidUntil: event.target.value,
                      }))
                    }
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-technician-pcn-date">PCN Re-certification Date</Label>
                  <Input
                    id="portal-technician-pcn-date"
                    type="date"
                    value={technicianForm.pcnRenewalDate}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        pcnRenewalDate: event.target.value,
                      }))
                    }
                    disabled={
                      !technicianForm.hasPcnQualification ||
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portal-technician-assessment-date">
                    Internal Assessment Date
                  </Label>
                  <Input
                    id="portal-technician-assessment-date"
                    type="date"
                    value={technicianForm.internalAssessmentDate}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        internalAssessmentDate: event.target.value,
                      }))
                    }
                    disabled={
                      technicianForm.hasPcnQualification ||
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="portal-technician-procedure">
                    Procedure / Assessment Status
                  </Label>
                  <Input
                    id="portal-technician-procedure"
                    value={technicianForm.procedureStatus}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        procedureStatus: event.target.value,
                      }))
                    }
                    placeholder="Procedure revision, last assessment, etc."
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="portal-technician-notes">Notes</Label>
                  <Textarea
                    id="portal-technician-notes"
                    value={technicianForm.notes}
                    onChange={(event) =>
                      setTechnicianForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    disabled={
                      createTechnicianMutation.isPending ||
                      updateTechnicianMutation.isPending ||
                      deleteTechnicianMutation.isPending
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTechnicianDialogOpen(false);
                  setEditingTechnician(null);
                  setTechnicianForm(createEmptyPortalTechnicianForm());
                }}
                disabled={
                  createTechnicianMutation.isPending ||
                  updateTechnicianMutation.isPending ||
                  deleteTechnicianMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  createTechnicianMutation.isPending ||
                  updateTechnicianMutation.isPending ||
                  deleteTechnicianMutation.isPending
                }
                onClick={async () => {
                  if (!selectedClientNumber) return;

                  const methodQualifications = technicianForm.methodQualifications
                    .map((entry) => ({
                      method: entry.method.trim(),
                      level: entry.level.trim(),
                    }))
                    .filter((entry) => entry.method && entry.level);
                  if (methodQualifications.length === 0) {
                    toast.error("Please select at least one method and level for this technician.");
                    return;
                  }

                  const payload = {
                    name: technicianForm.name.trim(),
                    email: technicianForm.email.trim(),
                    phone: technicianForm.phone.trim() || null,
                    methods: methodQualifications.map((entry) => entry.method),
                    level: summarisePortalTechnicianLevels(methodQualifications),
                    methodQualifications,
                    hasPcnQualification: technicianForm.hasPcnQualification,
                    certificateNumber: technicianForm.certificateNumber.trim() || null,
                    pcnRenewalDate: technicianForm.pcnRenewalDate.trim()
                      ? new Date(`${technicianForm.pcnRenewalDate}T00:00:00`)
                      : null,
                    internalAssessmentDate: technicianForm.internalAssessmentDate.trim()
                      ? new Date(`${technicianForm.internalAssessmentDate}T00:00:00`)
                      : null,
                    eyeTestValidUntil: technicianForm.eyeTestValidUntil.trim()
                      ? new Date(`${technicianForm.eyeTestValidUntil}T00:00:00`)
                      : null,
                    procedureStatus: technicianForm.procedureStatus.trim() || null,
                    clientBranchId:
                      technicianForm.clientBranchId === "unassigned"
                        ? null
                        : Number(technicianForm.clientBranchId),
                    notes: technicianForm.notes.trim() || null,
                  };

                  try {
                    const result = editingTechnician
                      ? await updateTechnicianMutation.mutateAsync({
                          id: editingTechnician.id,
                          clientId: selectedClientNumber,
                          data: payload,
                        })
                      : await createTechnicianMutation.mutateAsync({
                          clientId: selectedClientNumber,
                          ...payload,
                        });

                    await invalidatePortalData();
                    setIsTechnicianDialogOpen(false);
                    setEditingTechnician(null);
                    setTechnicianForm(createEmptyPortalTechnicianForm());
                    toast.success(
                      isApprovalRequestResult(result)
                        ? "Technician change submitted for approval"
                        : editingTechnician
                          ? "Technician updated"
                          : "Technician added"
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Could not save technician"
                    );
                  }
                }}
              >
                {createTechnicianMutation.isPending ||
                updateTechnicianMutation.isPending ||
                deleteTechnicianMutation.isPending
                  ? "Saving..."
                  : "Save Technician"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={isDefinitionDialogOpen}
        onOpenChange={setIsDefinitionDialogOpen}
        title={editingDefinition ? "Edit Requirement" : "Add Requirement"}
        description="Define what this client wants to track for technicians."
        fields={definitionFields}
        initialValues={{
          name: editingDefinition?.name ?? "",
          category: editingDefinition?.category ?? "Certification",
          description: editingDefinition?.description ?? "",
          validityDays: editingDefinition?.validityDays ?? "",
          reminderDays: editingDefinition?.reminderDays ?? 30,
          sortOrder: editingDefinition?.sortOrder ?? 0,
          isRequired: editingDefinition?.isRequired ?? true,
          active: editingDefinition?.active ?? true,
          customFields: toBuilderItems(editingDefinition?.customFields),
        }}
        isLoading={createDefinitionMutation.isPending || updateDefinitionMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          const definitionData = {
            name: String(values.name ?? ""),
            category: String(values.category ?? ""),
            description: String(values.description ?? "").trim() || null,
            validityDays: String(values.validityDays ?? "").trim()
              ? Number(values.validityDays)
              : null,
            reminderDays: String(values.reminderDays ?? "").trim()
              ? Number(values.reminderDays)
              : 30,
            isRequired: Boolean(values.isRequired),
            active: values.active !== false,
            sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
            customFields: normaliseCustomFieldDefinitions(values.customFields),
          };

          try {
            if (editingDefinition) {
              await updateDefinitionMutation.mutateAsync({
                id: editingDefinition.id,
                clientId: selectedClientNumber,
                data: definitionData,
              });
            } else {
              await createDefinitionMutation.mutateAsync({
                clientId: selectedClientNumber,
                ...definitionData,
              });
            }

            await invalidatePortalData();
            setIsDefinitionDialogOpen(false);
            setEditingDefinition(null);
            toast.success(editingDefinition ? "Requirement updated" : "Requirement added");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save requirement");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isRecordDialogOpen}
        onOpenChange={(open) => {
          setIsRecordDialogOpen(open);
          if (!open) {
            setRecordDialogValues({});
            setEditingRecord(null);
            resetOnboardingFlow();
          }
        }}
        title={
          isOnboardingMode
            ? `Onboarding: ${activeRecord?.definitionName ?? "Compliance Item"}`
            : editingRecord
              ? "Update Compliance Record"
              : "Add Compliance Record"
        }
        description={
          isOnboardingMode
            ? `Step ${onboardingStepIndex + 1} of ${onboardingQueue.length} for ${
                onboardingTechnician?.name ?? "this technician"
              }. Capture the required dates, status, and evidence, then we will move to the next item.`
            : "Track issue dates, validity, status, and supporting evidence for a technician requirement."
        }
        fields={recordFields}
        initialValues={{
          technicianId: activeRecord ? String(activeRecord.technicianId) : "",
          definitionId: activeRecord ? String(activeRecord.definitionId) : "",
          status: activeRecord?.status ?? "current",
          issuedAt: getDateInputValue(activeRecord?.issuedAt),
          validUntil: getDateInputValue(activeRecord?.validUntil),
          notes: activeRecord?.notes ?? "",
          ...getInitialCustomFieldValues(activeRecordDefinition, activeRecord),
          attachmentFile: "",
        }}
        onValuesChange={setRecordDialogValues}
        isLoading={upsertRecordMutation.isPending || uploadDocumentMutation.isPending}
        renderExtraContent={() =>
          requirementDocumentPreview ? (
            <div className="rounded-lg border bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">Stored Evidence Preview</p>
              <p className="mt-2 text-slate-600">
                File name: <span className="font-medium text-slate-900">{requirementDocumentPreview.fileName}</span>
              </p>
              <p className="mt-1 text-slate-600 break-all">
                Folder: <span className="font-medium text-slate-900">{requirementDocumentPreview.folder}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-slate-600">
              Choose the technician and requirement to see the final stored evidence name and folder.
            </div>
          )
        }
        submitLabel={
          isOnboardingMode ? (hasNextOnboardingStep ? "Save & Next" : "Save & Finish") : "Save"
        }
        cancelLabel={isOnboardingMode ? "Stop Onboarding" : "Cancel"}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          try {
            const attachmentFile = String(values.attachmentFile ?? "");
            const record = await upsertRecordMutation.mutateAsync({
              clientId: selectedClientNumber,
              technicianId: Number(values.technicianId),
              definitionId: Number(values.definitionId),
              status: String(values.status) as PortalRequirementStatus,
              issuedAt: String(values.issuedAt ?? "").trim()
                ? new Date(`${String(values.issuedAt)}T00:00:00`)
                : null,
              validUntil: String(values.validUntil ?? "").trim()
                ? new Date(`${String(values.validUntil)}T00:00:00`)
                : null,
              notes: String(values.notes ?? "").trim() || null,
              customFieldValues: collectCustomFieldValues(activeRecordDefinition, values),
              attachmentFileDataUrl: attachmentFile || null,
            });

            if (attachmentFile && record && !isApprovalRequestResult(record) && record?.id) {
              await uploadDocumentMutation.mutateAsync({
                clientId: selectedClientNumber,
                technicianRequirementId: Number(record.id),
                fileDataUrl: attachmentFile,
              });
            }

            await invalidatePortalData();

            if (isOnboardingMode) {
              if (hasNextOnboardingStep) {
                const nextIndex = onboardingStepIndex + 1;
                setOnboardingStepIndex(nextIndex);
                setEditingRecord(onboardingQueue[nextIndex] ?? null);
                setRecordDialogValues({});
                toast.success(
                  isApprovalRequestResult(record)
                    ? "Compliance update submitted for approval. Moving to the next onboarding item."
                    : "Compliance record saved. Moving to the next onboarding item."
                );
                return;
              }

              setIsRecordDialogOpen(false);
              setEditingRecord(null);
              resetOnboardingFlow();
              toast.success(
                isApprovalRequestResult(record)
                  ? "Onboarding updates submitted for approval."
                  : "Onboarding checklist completed for this technician."
              );
              return;
            }

            setIsRecordDialogOpen(false);
            setEditingRecord(null);
            toast.success(
              isApprovalRequestResult(record)
                ? "Compliance update submitted for approval"
                : "Compliance record saved"
            );
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not save the compliance record"
            );
            throw error;
          }
        }}
      />

      <FormDialog
        open={isResourceDialogOpen}
        onOpenChange={setIsResourceDialogOpen}
        title={editingResource ? "Edit General Resource" : "Add General Resource"}
        description="Add client-facing reference files or useful links for general portal use."
        fields={resourceFields}
        initialValues={{
          title: editingResource?.title ?? "",
          category: editingResource?.category ?? "General",
          clientBranchId: editingResource?.clientBranchId ? String(editingResource.clientBranchId) : "all",
          description: editingResource?.description ?? "",
          resourceType: editingResource?.resourceType ?? "file",
          linkUrl: editingResource?.linkUrl ?? "",
          fileName: editingResource?.fileName ?? "",
          fileDataUrl: "",
          sortOrder: editingResource?.sortOrder ?? 0,
          active: editingResource?.active ?? true,
        }}
        isLoading={
          createResourceMutation.isPending ||
          updateResourceMutation.isPending ||
          deleteResourceMutation.isPending
        }
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          const resourceType = String(values.resourceType ?? "file") as PortalClientResourceType;
          const linkUrl = String(values.linkUrl ?? "").trim();
          const fileDataUrl = String(values.fileDataUrl ?? "");
          const fileName = String(values.fileName ?? "").trim();

          if (editingResource && resourceType !== editingResource.resourceType) {
            const message = "To change a resource from file to link or link to file, create a new resource instead.";
            toast.error(message);
            throw new Error(message);
          }

          if (!editingResource && resourceType === "link" && !linkUrl) {
            const message = "Please enter a link URL for this resource.";
            toast.error(message);
            throw new Error(message);
          }

          if (!editingResource && resourceType === "file" && !fileDataUrl) {
            const message = "Please upload a file for this resource.";
            toast.error(message);
            throw new Error(message);
          }

          try {
            const result = editingResource
              ? await updateResourceMutation.mutateAsync({
                  id: editingResource.id,
                  clientId: selectedClientNumber,
                  branchId: selectedBranchNumber,
                  data: {
                  title: String(values.title ?? "").trim(),
                  category: String(values.category ?? "").trim(),
                  clientBranchId:
                    String(values.clientBranchId ?? "all") === "all"
                      ? null
                      : Number(values.clientBranchId),
                  description: String(values.description ?? "").trim() || null,
                    linkUrl: resourceType === "link" ? linkUrl || null : undefined,
                    sortOrder: String(values.sortOrder ?? "").trim()
                      ? Number(values.sortOrder)
                      : 0,
                    active: values.active !== false,
                  },
                })
              : await createResourceMutation.mutateAsync({
                clientId: selectedClientNumber,
                title: String(values.title ?? "").trim(),
                category: String(values.category ?? "").trim(),
                clientBranchId:
                  String(values.clientBranchId ?? "all") === "all"
                    ? null
                    : Number(values.clientBranchId),
                description: String(values.description ?? "").trim() || null,
                  resourceType,
                  linkUrl: resourceType === "link" ? linkUrl || null : null,
                  fileName: resourceType === "file" ? fileName || "resource-file" : null,
                  fileDataUrl: resourceType === "file" ? fileDataUrl : null,
                  sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
                  active: values.active !== false,
                });

            await invalidatePortalData();
            setIsResourceDialogOpen(false);
            setEditingResource(null);
            toast.success(
              isApprovalRequestResult(result)
                ? "Resource change submitted for approval"
                : editingResource
                  ? "Resource updated"
                  : "Resource added"
            );
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save this resource");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isClientDocumentDialogOpen}
        onOpenChange={(open) => {
          setIsClientDocumentDialogOpen(open);
          if (!open) {
            setClientDocumentDialogValues({});
            setClientDocumentDialogSeed({});
          }
        }}
        title={editingClientDocument ? "Edit Client Document" : "Add Client Document"}
        description="Upload client procedures, appointment letters, and other controlled documents with optional review and validity dates."
        fields={clientDocumentFields}
        initialValues={{
          title: editingClientDocument?.title ?? String(clientDocumentDialogSeed.title ?? ""),
          category: editingClientDocument?.category ?? String(clientDocumentDialogSeed.category ?? "Procedure"),
          clientBranchId:
            editingClientDocument?.clientBranchId
              ? String(editingClientDocument.clientBranchId)
              : String(clientDocumentDialogSeed.clientBranchId ?? "all"),
          description: editingClientDocument?.description ?? String(clientDocumentDialogSeed.description ?? ""),
          reviewDate:
            getDateInputValue(editingClientDocument?.reviewDate) ||
            String(clientDocumentDialogSeed.reviewDate ?? ""),
          validUntil:
            getDateInputValue(editingClientDocument?.validUntil) ||
            String(clientDocumentDialogSeed.validUntil ?? ""),
          status:
            editingClientDocument?.status ??
            (String(clientDocumentDialogSeed.status ?? "active") as PortalClientDocumentStatus),
          fileDataUrl: "",
        }}
        onValuesChange={setClientDocumentDialogValues}
        isLoading={
          createClientDocumentMutation.isPending ||
          updateClientDocumentMutation.isPending ||
          deleteClientDocumentMutation.isPending
        }
        renderExtraContent={() =>
          clientDocumentPreview ? (
            <div className="rounded-lg border bg-slate-50 p-4 text-sm">
              <p className="font-medium text-slate-900">Stored Document Preview</p>
              <p className="mt-2 text-slate-600">
                File name: <span className="font-medium text-slate-900">{clientDocumentPreview.fileName}</span>
              </p>
              <p className="mt-1 text-slate-600 break-all">
                Folder: <span className="font-medium text-slate-900">{clientDocumentPreview.folder}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed bg-slate-50 p-4 text-sm text-slate-600">
              Choose the document type to see the final stored file name and folder.
            </div>
          )
        }
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          try {
            const result = editingClientDocument
              ? await updateClientDocumentMutation.mutateAsync({
                  id: editingClientDocument.id,
                  clientId: selectedClientNumber,
                  branchId: selectedBranchNumber,
                  data: {
                    title: String(values.title ?? "").trim(),
                    category: String(values.category ?? "").trim(),
                    clientBranchId:
                      String(values.clientBranchId ?? "all") === "all"
                        ? null
                        : Number(values.clientBranchId),
                    description: String(values.description ?? "").trim() || null,
                    reviewDate: String(values.reviewDate ?? "").trim()
                      ? new Date(`${String(values.reviewDate)}T00:00:00`)
                      : null,
                    validUntil: String(values.validUntil ?? "").trim()
                      ? new Date(`${String(values.validUntil)}T00:00:00`)
                      : null,
                    status: String(values.status ?? "active") as PortalClientDocumentStatus,
                  },
                })
              : await createClientDocumentMutation.mutateAsync({
                clientId: selectedClientNumber,
                title: String(values.title ?? "").trim(),
                category: String(values.category ?? "").trim(),
                clientBranchId:
                  String(values.clientBranchId ?? "all") === "all"
                    ? null
                    : Number(values.clientBranchId),
                description: String(values.description ?? "").trim() || null,
                  fileDataUrl: String(values.fileDataUrl ?? ""),
                  reviewDate: String(values.reviewDate ?? "").trim()
                    ? new Date(`${String(values.reviewDate)}T00:00:00`)
                    : null,
                  validUntil: String(values.validUntil ?? "").trim()
                    ? new Date(`${String(values.validUntil)}T00:00:00`)
                    : null,
                  status: String(values.status ?? "active") as PortalClientDocumentStatus,
                });

            await invalidatePortalData();
            setIsClientDocumentDialogOpen(false);
            setEditingClientDocument(null);
            setClientDocumentDialogSeed({});
            toast.success(
              isApprovalRequestResult(result)
                ? "Client document change submitted for approval"
                : editingClientDocument
                  ? "Client document updated"
                  : "Client document added"
            );
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save client document");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isCommentDialogOpen}
        onOpenChange={setIsCommentDialogOpen}
        title="New Client Request"
        description="Leave a comment, ask for a callback, or submit a suggestion for this client."
        fields={commentFields}
        initialValues={{
          requestType: "general_comment",
          subject: "",
          message: "",
        }}
        isLoading={createCommentMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          try {
            await createCommentMutation.mutateAsync({
              clientId: selectedClientNumber,
              requestType: String(values.requestType ?? "general_comment") as PortalCommentRequestType,
              subject: String(values.subject ?? "").trim(),
              message: String(values.message ?? "").trim(),
            });
            await invalidatePortalData();
            setIsCommentDialogOpen(false);
            toast.success("Request submitted");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not submit this request");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isReminderSettingsDialogOpen}
        onOpenChange={setIsReminderSettingsDialogOpen}
        title="Reminder Rules"
        description="Choose which portal reminders are active, who should receive them, and when escalations should happen."
        fields={reminderSettingsFields}
        initialValues={{
          complianceEnabled: reminderSettings?.complianceEnabled ?? true,
          documentEnabled: reminderSettings?.documentEnabled ?? true,
          includeMissingRequired: reminderSettings?.includeMissingRequired ?? true,
          includePendingReview: reminderSettings?.includePendingReview ?? true,
          documentLeadDays: reminderSettings?.documentLeadDays ?? 14,
          complianceEscalationDays: reminderSettings?.complianceEscalationDays ?? 14,
          documentEscalationDays: reminderSettings?.documentEscalationDays ?? 7,
          sendToAssignedUsers: reminderSettings?.sendToAssignedUsers ?? true,
          sendToInternalAdmins: reminderSettings?.sendToInternalAdmins ?? true,
          escalationManagersOnly: reminderSettings?.escalationManagersOnly ?? true,
          allowedClientDocumentLabelsText: (reminderSettings?.allowedClientDocumentLabels ?? []).join("\n"),
        }}
        isLoading={updateReminderSettingsMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          try {
            await updateReminderSettingsMutation.mutateAsync({
              clientId: selectedClientNumber,
              data: {
                complianceEnabled: Boolean(values.complianceEnabled),
                documentEnabled: Boolean(values.documentEnabled),
                includeMissingRequired: Boolean(values.includeMissingRequired),
                includePendingReview: Boolean(values.includePendingReview),
                documentLeadDays: Number(values.documentLeadDays ?? 14),
                complianceEscalationDays: Number(values.complianceEscalationDays ?? 14),
                documentEscalationDays: Number(values.documentEscalationDays ?? 7),
                sendToAssignedUsers: Boolean(values.sendToAssignedUsers),
                sendToInternalAdmins: Boolean(values.sendToInternalAdmins),
                escalationManagersOnly: Boolean(values.escalationManagersOnly),
                allowedClientDocumentLabels: Array.from(
                  new Set(
                    String(values.allowedClientDocumentLabelsText ?? "")
                      .split(/\r?\n/)
                      .map((label) => label.trim())
                      .filter(Boolean)
                  )
                ),
              },
            });
            await invalidatePortalData();
            setIsReminderSettingsDialogOpen(false);
            toast.success("Reminder rules updated");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not update reminder rules"
            );
            throw error;
          }
        }}
      />

      <Dialog
        open={viewingTechnicianId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingTechnicianId(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTechnicianProfile?.technician.name ?? "Technician Profile"}
            </DialogTitle>
            <DialogDescription>
              Review the technician status, branch scope, methods, and the next compliance actions from one place.
            </DialogDescription>
          </DialogHeader>

          {selectedTechnicianProfile ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedTechnicianProfile.currentCount}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Expiring</p>
                  <p className="mt-1 text-2xl font-semibold text-amber-600">
                    {selectedTechnicianProfile.expiringCount}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Expired</p>
                  <p className="mt-1 text-2xl font-semibold text-red-600">
                    {selectedTechnicianProfile.expiredCount}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Missing</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedTechnicianProfile.missingCount}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Technician details</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Branch</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.branchName ?? "Client-wide / unassigned"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.technician.email || "Not captured"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.technician.phone || "Not captured"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Procedure status</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.technician.procedureStatus || "Not captured"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Certificate number</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.technician.certificateNumber || "Not captured"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Certification route</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.technician.hasPcnQualification
                          ? "PCN certification"
                          : "Internal assessment"}
                      </p>
                    </div>
                  </div>
                  {selectedTechnicianProfile.technician.notes ? (
                    <div className="mt-4 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                      {selectedTechnicianProfile.technician.notes}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Validity dates</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Eye test valid until</p>
                      <p className="mt-1 font-medium">
                        {formatDate(selectedTechnicianProfile.technician.eyeTestValidUntil)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">PCN re-certification</p>
                      <p className="mt-1 font-medium">
                        {formatDate(selectedTechnicianProfile.technician.pcnRenewalDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal assessment</p>
                      <p className="mt-1 font-medium">
                        {formatDate(selectedTechnicianProfile.technician.internalAssessmentDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Tracked items</p>
                      <p className="mt-1 font-medium">
                        {selectedTechnicianProfile.requirementRows.length} compliance record
                        {selectedTechnicianProfile.requirementRows.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Methods and levels</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTechnicianProfile.methodQualifications.length > 0 ? (
                    selectedTechnicianProfile.methodQualifications.map((entry) => (
                      <Badge key={`${entry.method}-${entry.level}`} variant="secondary">
                        {entry.method}: {entry.level}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No method qualifications captured yet.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-medium">Assessment readiness</p>
                    <p className="text-sm text-muted-foreground">
                      A technician-specific checklist built from the methods on this profile and
                      the matching assessment preparation guides.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {selectedTechnicianProfile.matchedGuides.length} guide
                      {selectedTechnicianProfile.matchedGuides.length === 1 ? "" : "s"}
                    </Badge>
                    <Badge variant="outline">
                      {selectedTechnicianProfile.relatedAssessmentRequests.length} booking request
                      {selectedTechnicianProfile.relatedAssessmentRequests.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>

                {selectedTechnicianProfile.uncoveredTechniques.length > 0 ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Preparation guidance is still missing for:{" "}
                    <span className="font-medium">
                      {selectedTechnicianProfile.uncoveredTechniques.join(", ")}
                    </span>
                    .
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">Technician must bring</p>
                      <div className="mt-3 space-y-2">
                        {selectedTechnicianProfile.readinessBringItems.length > 0 ? (
                          selectedTechnicianProfile.readinessBringItems.map((item) => (
                            <div key={`bring-${item}`} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            No technician checklist items have been configured yet for this
                            technician’s methods.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">Company must send / upload</p>
                      <div className="mt-3 space-y-2">
                        {selectedTechnicianProfile.readinessCompanyItems.length > 0 ? (
                          selectedTechnicianProfile.readinessCompanyItems.map((item) => (
                            <div key={`company-${item}`} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            No company-side preparation items have been configured yet for this
                            technician’s methods.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Matched preparation guides</p>
                    <div className="mt-3 space-y-3">
                      {selectedTechnicianProfile.matchedGuides.length > 0 ? (
                        selectedTechnicianProfile.matchedGuides.map((guide) => (
                          <div key={guide.id} className="rounded-lg border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{guide.title}</p>
                              <Badge variant="secondary">{guide.techniqueName}</Badge>
                              {guide.branchName ? (
                                <Badge variant="outline">{guide.branchName}</Badge>
                              ) : null}
                            </div>
                            {guide.description ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {guide.description}
                              </p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          No assessment guide currently matches this technician profile.
                        </div>
                      )}

                      {selectedTechnicianProfile.relatedAssessmentRequests.length > 0 ? (
                        <div className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-sm font-medium">Recent booking activity</p>
                          <div className="mt-3 space-y-2">
                            {selectedTechnicianProfile.relatedAssessmentRequests
                              .slice(0, 3)
                              .map((request) => (
                                <div
                                  key={`request-${request.id}`}
                                  className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">{request.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {request.preferredDate
                                        ? `Preferred ${formatDate(request.preferredDate)}`
                                        : `Submitted ${formatDate(request.createdAt)}`}
                                    </p>
                                  </div>
                                  {getServiceRequestStatusBadge(request.status)}
                                </div>
                              ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.85fr]">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Immediate compliance actions</p>
                      <p className="text-sm text-muted-foreground">
                        The next missing, expiring, or expired items for this technician.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedTechnicianProfile.pendingRows.length} pending
                    </Badge>
                  </div>
                  {selectedTechnicianProfile.pendingReviewRows.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                      {selectedTechnicianProfile.pendingReviewRows.length} compliance item
                      {selectedTechnicianProfile.pendingReviewRows.length === 1 ? "" : "s"} already
                      have uploaded evidence and are waiting for internal Level III review.
                    </div>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    {selectedTechnicianProfile.pendingRows.length > 0 ? (
                      selectedTechnicianProfile.pendingRows.slice(0, 6).map((row) => (
                        <div key={`${row.technicianId}-${row.definitionId}-${row.recordId ?? "pending"}`} className="rounded-lg border p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{row.definitionName}</p>
                                {getStatusBadge(row.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {row.definitionCategory}
                                {row.validUntil ? ` · Valid until ${formatDate(row.validUntil)}` : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {getCustomFieldSummary(row)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {row.latestDocumentUrl ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      row.latestDocumentUrl ?? "",
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  <FileDown className="mr-1 h-4 w-4" />
                                  File
                                </Button>
                              ) : null}
                              {canEditPortal ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setViewingTechnicianId(null);
                                    openRequirementRecord(row);
                                  }}
                                >
                                  Update
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        This technician is current on all tracked compliance items for the selected client scope.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Pending internal review</p>
                      <p className="text-sm text-muted-foreground">
                        Items with evidence already uploaded and currently waiting for the Level III
                        team to review.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {selectedTechnicianProfile.pendingReviewRows.length} waiting
                    </Badge>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedTechnicianProfile.pendingReviewRows.length > 0 ? (
                      selectedTechnicianProfile.pendingReviewRows.slice(0, 6).map((row) => (
                        <div
                          key={`pending-review-${row.technicianId}-${row.definitionId}-${row.recordId ?? "pending"}`}
                          className="rounded-md border p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">{row.definitionName}</p>
                              <p className="text-sm text-muted-foreground">
                                {row.latestDocumentName
                                  ? `Latest file: ${row.latestDocumentName}`
                                  : `${row.documentCount} file${row.documentCount === 1 ? "" : "s"} uploaded`}
                              </p>
                            </div>
                            {getStatusBadge(row.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No uploaded evidence is waiting for internal review right now.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Tracked compliance items</p>
                  <p className="text-sm text-muted-foreground">
                    A quick view of everything currently being tracked for this technician.
                  </p>
                  <div className="mt-4 space-y-2">
                    {selectedTechnicianProfile.requirementRows.length > 0 ? (
                      selectedTechnicianProfile.requirementRows.slice(0, 8).map((row) => (
                        <div
                          key={`tracked-${row.technicianId}-${row.definitionId}-${row.recordId ?? "pending"}`}
                          className="flex items-center justify-between gap-3 rounded-md border p-3"
                        >
                          <div>
                            <p className="font-medium">{row.definitionName}</p>
                            <p className="text-sm text-muted-foreground">
                              {row.documentCount} file{row.documentCount === 1 ? "" : "s"}
                            </p>
                          </div>
                          {getStatusBadge(row.status)}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No compliance definitions have been linked to this technician yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={() => setViewingTechnicianId(null)}>
                  Close
                </Button>
                {canEditPortal ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const technician = selectedTechnicianProfile.technician;
                      setViewingTechnicianId(null);
                      openAssessmentBookingPlanner(technician);
                    }}
                  >
                    Book Assessment
                  </Button>
                ) : null}
                {canEditPortal && selectedTechnicianProfile.pendingRows.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewingTechnicianId(null);
                      openOnboardingForTechnician(selectedTechnicianProfile.technician.id);
                    }}
                  >
                    Continue Onboarding
                  </Button>
                ) : null}
                {canEditPortal ? (
                  <Button
                    onClick={() => {
                      setViewingTechnicianId(null);
                      setEditingTechnician(selectedTechnicianProfile.technician);
                      setIsTechnicianDialogOpen(true);
                    }}
                  >
                    Edit Technician
                  </Button>
                ) : null}
              </DialogFooter>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              This technician is no longer available in the current client scope.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={assessmentPlannerTechnicianId !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeAssessmentBookingPlanner();
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {assessmentBookingPlanner
                ? `Assessment Booking Planner: ${assessmentBookingPlanner.technician.name}`
                : "Assessment Booking Planner"}
            </DialogTitle>
            <DialogDescription>
              Choose the techniques for this booking and review the exact preparation pack before
              the request is submitted.
            </DialogDescription>
          </DialogHeader>

          {assessmentBookingPlanner ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Branch</p>
                  <p className="mt-1 font-medium">
                    {assessmentBookingPlanner.branchName ?? "Client-wide / unassigned"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Guide coverage</p>
                  <p className="mt-1 font-medium">
                    {assessmentBookingPlanner.matchedGuides.length} matched guide
                    {assessmentBookingPlanner.matchedGuides.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous bookings</p>
                  <p className="mt-1 font-medium">
                    {assessmentBookingPlanner.recentRequests.length} request
                    {assessmentBookingPlanner.recentRequests.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4 rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">Techniques for this booking</p>
                    <p className="text-sm text-muted-foreground">
                      Select the methods that should be included in the assessment request.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {assessmentBookingPlanner.techniqueOptions.length > 0 ? (
                      assessmentBookingPlanner.techniqueOptions.map((technique) => {
                        const checked = assessmentPlannerTechniques.includes(technique);
                        return (
                          <label
                            key={`planner-technique-${technique}`}
                            className="flex items-start gap-3 rounded-lg border p-3"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => {
                                setAssessmentPlannerTechniques((current) => {
                                  if (value) {
                                    return current.includes(technique)
                                      ? current
                                      : [...current, technique];
                                  }
                                  return current.filter((entry) => entry !== technique);
                                });
                              }}
                            />
                            <div>
                              <p className="font-medium">{technique}</p>
                              <p className="text-sm text-muted-foreground">
                                Include {technique} in this technician's assessment request.
                              </p>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        No technician methods have been captured yet for this person.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="assessment-preferred-date">Preferred date</Label>
                      <Input
                        id="assessment-preferred-date"
                        type="date"
                        value={assessmentPlannerPreferredDate}
                        onChange={(event) => setAssessmentPlannerPreferredDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Requested client documents</Label>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {assessmentServiceDefinition?.config.requestedDocumentLabels?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {assessmentServiceDefinition.config.requestedDocumentLabels.map((label) => (
                              <Badge key={`planner-doc-${label}`} variant="outline">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          "No specific document prompts are configured on the assessment request type yet."
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assessment-notes">Booking notes</Label>
                    <Textarea
                      id="assessment-notes"
                      value={assessmentPlannerNotes}
                      onChange={(event) => setAssessmentPlannerNotes(event.target.value)}
                      placeholder="Add any timing, scope, or preparation notes that should carry into the booking request."
                      rows={4}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {assessmentBookingPlanner.uncoveredTechniques.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      Preparation guidance is still missing for:{" "}
                      <span className="font-medium">
                        {assessmentBookingPlanner.uncoveredTechniques.join(", ")}
                      </span>
                      .
                    </div>
                  ) : null}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">Technician must bring</p>
                      <div className="mt-3 space-y-2">
                        {assessmentBookingPlanner.bringItems.length > 0 ? (
                          assessmentBookingPlanner.bringItems.map((item) => (
                            <div
                              key={`planner-bring-${item}`}
                              className="rounded-md bg-muted/40 px-3 py-2 text-sm"
                            >
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            No technician checklist items match the selected techniques yet.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm font-medium">Company must send / upload</p>
                      <div className="mt-3 space-y-2">
                        {assessmentBookingPlanner.companyItems.length > 0 ? (
                          assessmentBookingPlanner.companyItems.map((item) => (
                            <div
                              key={`planner-company-${item}`}
                              className="rounded-md bg-muted/40 px-3 py-2 text-sm"
                            >
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            No company-side checklist items match the selected techniques yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Matched preparation guides</p>
                    <div className="mt-3 space-y-3">
                      {assessmentBookingPlanner.matchedGuides.length > 0 ? (
                        assessmentBookingPlanner.matchedGuides.map((guide) => (
                          <div key={`planner-guide-${guide.id}`} className="rounded-lg border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{guide.title}</p>
                              <Badge variant="secondary">{guide.techniqueName}</Badge>
                              {guide.branchName ? <Badge variant="outline">{guide.branchName}</Badge> : null}
                            </div>
                            {guide.description ? (
                              <p className="mt-2 text-sm text-muted-foreground">{guide.description}</p>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          No preparation guides match the currently selected techniques.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {assessmentBookingPlanner.recentRequests.length > 0 ? (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Recent assessment booking requests</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {assessmentBookingPlanner.recentRequests.slice(0, 3).map((request) => (
                      <div key={`planner-request-${request.id}`} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{request.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {request.preferredDate
                                ? `Preferred ${formatDate(request.preferredDate)}`
                                : `Submitted ${formatDate(request.createdAt)}`}
                            </p>
                          </div>
                          {getServiceRequestStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!assessmentServiceDefinition ? (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  No assessment service type is configured yet. Add or activate an assessment
                  booking request type in the portal service definitions to enable this action.
                </div>
              ) : null}

              <DialogFooter className="border-t pt-4">
                <Button variant="outline" onClick={closeAssessmentBookingPlanner}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const techniques = Array.from(
                      new Set(
                        assessmentPlannerTechniques
                          .map((value) => String(value ?? "").trim())
                          .filter(Boolean)
                      )
                    );
                    if (techniques.length === 0) {
                      toast.error("Please select at least one technique for this booking.");
                      return;
                    }
                    openAssessmentBookingRequest(assessmentBookingPlanner.technician, {
                      techniques,
                      preferredDate: assessmentPlannerPreferredDate,
                      details:
                        assessmentPlannerNotes.trim() ||
                        "Please confirm an assessment booking for this technician and review the preparation checklist linked to the selected techniques.",
                      metadata: {
                        selectedTechniques: techniques,
                        matchedGuideTitles: assessmentBookingPlanner.matchedGuides.map(
                          (guide) => guide.title
                        ),
                        readinessBringItems: assessmentBookingPlanner.bringItems,
                        readinessCompanyItems: assessmentBookingPlanner.companyItems,
                        uncoveredTechniques: assessmentBookingPlanner.uncoveredTechniques,
                        plannerNotes: assessmentPlannerNotes.trim() || null,
                      },
                    });
                    closeAssessmentBookingPlanner();
                  }}
                  disabled={!assessmentServiceDefinition}
                >
                  Open Booking Request
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              This technician is no longer available in the current client scope.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isApprovalReviewDialogOpen} onOpenChange={(open) => !open && closeApprovalReviewDialog()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Client Submission Review</DialogTitle>
            <DialogDescription>
              {reviewingApprovalRequest
                ? `${reviewingApprovalRequest.summary}. Review the submitted change before applying it to the live portal record.`
                : "Review this client-submitted portal change."}
            </DialogDescription>
          </DialogHeader>

          {reviewingApprovalRequest ? (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                  <p className="mt-1 font-medium">{getApprovalEntityLabel(reviewingApprovalRequest.entityType)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Action</p>
                  <p className="mt-1 font-medium">{getApprovalActionLabel(reviewingApprovalRequest.action)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Submitted By</p>
                  <p className="mt-1 font-medium">
                    {reviewingApprovalRequest.submittedByName ??
                      reviewingApprovalRequest.submittedByEmail ??
                      `User ${reviewingApprovalRequest.submittedByUserId}`}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">{getApprovalStatusBadge(reviewingApprovalRequest.status)}</div>
                </div>
              </div>

              {approvalComparisonRows.length > 0 ? (
                <div className="rounded-lg border">
                  <div className="border-b px-4 py-3">
                    <h3 className="font-medium">Change Summary</h3>
                    <p className="text-sm text-muted-foreground">
                      {reviewingApprovalRequest.action === "create"
                        ? "These values will be added if the submission is approved."
                        : reviewingApprovalRequest.action === "delete"
                          ? "These live values will be removed if the submission is approved."
                          : "These fields will change if the submission is approved."}
                    </p>
                  </div>
                  <div className="max-h-[22rem] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Field</th>
                          <th className="px-4 py-3 font-medium">Current</th>
                          <th className="px-4 py-3 font-medium">Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvalComparisonRows.map((entry) => (
                          <tr key={entry.key} className="border-t align-top">
                            <td className="px-4 py-3 font-medium">{entry.label}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {reviewingApprovalRequest.action === "create"
                                ? "-"
                                : formatApprovalValue(entry.previousValue, entry.key, {
                                    techniciansById,
                                    definitionsById,
                                  })}
                            </td>
                            <td className="px-4 py-3">
                              {reviewingApprovalRequest.action === "delete"
                                ? "-"
                                : formatApprovalValue(entry.nextValue, entry.key, {
                                    techniciansById,
                                    definitionsById,
                                  })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No field-level changes were captured for this submission, but the record can still be reviewed and actioned.
                </div>
              )}

              {reviewingApprovalRequest.payload.storedFile ? (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Pending file attachment</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reviewingApprovalRequest.payload.storedFile.fileName}
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          reviewingApprovalRequest.payload.storedFile?.fileUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      <FileDown className="mr-1 h-4 w-4" />
                      Open Attachment
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="portal-approval-review-notes">
                  Review Notes
                </label>
                <Textarea
                  id="portal-approval-review-notes"
                  value={approvalReviewNotes}
                  onChange={(event) => setApprovalReviewNotes(event.target.value)}
                  placeholder="Add internal context or explain what the client should correct."
                  rows={4}
                />
              </div>

              {reviewingApprovalRequest.reviewedAt || reviewingApprovalRequest.reviewedByName ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                  <p className="font-medium">Existing review record</p>
                  <p className="mt-1 text-muted-foreground">
                    Reviewed by{" "}
                    {reviewingApprovalRequest.reviewedByName ??
                      reviewingApprovalRequest.reviewedByEmail ??
                      "Internal reviewer"}{" "}
                    on {formatDate(reviewingApprovalRequest.reviewedAt)}.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={closeApprovalReviewDialog}>
              Close
            </Button>
            {canReviewPortalApprovals &&
            reviewingApprovalRequest?.status === "pending" ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await submitApprovalReview("rejected");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Could not review this submission"
                      );
                    }
                  }}
                  disabled={reviewApprovalMutation.isPending}
                >
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      await submitApprovalReview("approved");
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Could not review this submission"
                      );
                    }
                  }}
                  disabled={reviewApprovalMutation.isPending}
                >
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  Approve
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingServiceRequest)} onOpenChange={(open) => !open && setViewingServiceRequest(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingServiceRequest?.title ?? "Portal Request"}</DialogTitle>
            <DialogDescription>
              Review the request details, requested documents, and any supporting uploads attached by
              the client.
            </DialogDescription>
          </DialogHeader>

          {viewingServiceRequest ? (
            <div className="space-y-6">
              {(() => {
                const requestMetadata = normalisePortalServiceRequestMetadata(
                  viewingServiceRequest.metadata
                );
                const schedulingReadiness = getServiceRequestSchedulingReadiness(
                  viewingServiceRequest,
                  requestMetadata
                );
                return (
                  <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                  <p className="mt-1 font-medium">
                    {viewingServiceRequest.serviceDefinitionTitle ?? viewingServiceRequest.requestType}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Branch</p>
                  <p className="mt-1 font-medium">{viewingServiceRequest.branchName ?? "Client-wide"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Preferred Date</p>
                  <p className="mt-1 font-medium">{formatDate(viewingServiceRequest.preferredDate)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {getServiceRequestStatusBadge(viewingServiceRequest.status)}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Confirmed Date</p>
                  <p className="mt-1 font-medium">{formatDate(requestMetadata.confirmedDate)}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal Owner</p>
                  <p className="mt-1 font-medium">{requestMetadata.internalOwner ?? "-"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Planned Action</p>
                  <p className="mt-1 font-medium">{requestMetadata.plannedAction ?? "-"}</p>
                </div>
              </div>

              {(requestMetadata.selectedTechniques.length > 0 ||
                requestMetadata.readinessCompanyItems.length > 0 ||
                requestMetadata.uncoveredTechniques.length > 0) ? (
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium">Scheduling Readiness</p>
                      <p className="text-sm text-muted-foreground">
                        This shows whether Level III can move the request into a scheduled booking yet.
                      </p>
                    </div>
                    {getServiceRequestSchedulingReadinessBadge(schedulingReadiness)}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Uploads Received</p>
                      <p className="mt-1 font-medium">
                        {schedulingReadiness.requiredUploadCount > 0
                          ? `${schedulingReadiness.uploadedCount}/${schedulingReadiness.requiredUploadCount}`
                          : "No upload checklist"}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding Uploads</p>
                      <p className="mt-1 font-medium">
                        {schedulingReadiness.outstandingUploadLabels.length > 0
                          ? schedulingReadiness.outstandingUploadLabels.join(", ")
                          : "None"}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Guide Gaps</p>
                      <p className="mt-1 font-medium">
                        {schedulingReadiness.uncoveredTechniques.length > 0
                          ? schedulingReadiness.uncoveredTechniques.join(", ")
                          : "None"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Requested By</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {viewingServiceRequest.requestedByName ??
                      viewingServiceRequest.requestedByEmail ??
                      `User ${viewingServiceRequest.userId}`}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Technician</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {viewingServiceRequest.technicianName ?? "No specific technician selected"}
                  </p>
                </div>
              </div>

              {viewingServiceRequest.techniques.length > 0 ? (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Techniques</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {viewingServiceRequest.techniques.map((technique) => (
                      <Badge key={technique} variant="outline">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {(requestMetadata.selectedTechniques.length > 0 ||
                requestMetadata.readinessBringItems.length > 0 ||
                requestMetadata.readinessCompanyItems.length > 0 ||
                requestMetadata.matchedGuideTitles.length > 0) ? (
                <div className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium">Assessment Readiness Plan</p>
                      <p className="text-sm text-muted-foreground">
                        The booking planner summary that was captured when this request was created.
                      </p>
                    </div>
                    {requestMetadata.uncoveredTechniques.length > 0 ? (
                      <Badge variant="destructive">
                        {requestMetadata.uncoveredTechniques.length} guide gap
                        {requestMetadata.uncoveredTechniques.length === 1 ? "" : "s"}
                      </Badge>
                    ) : (
                      <Badge>Checklist captured</Badge>
                    )}
                  </div>

                  {requestMetadata.selectedTechniques.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Selected techniques</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requestMetadata.selectedTechniques.map((technique) => (
                          <Badge key={`selected-technique-${technique}`} variant="outline">
                            {technique}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {requestMetadata.plannerNotes ? (
                    <div className="mt-4 rounded-md bg-muted/40 p-3">
                      <p className="text-sm font-medium">Planner notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {requestMetadata.plannerNotes}
                      </p>
                    </div>
                  ) : null}

                  {requestMetadata.uncoveredTechniques.length > 0 ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Guidance was still missing for:{" "}
                      <span className="font-medium">
                        {requestMetadata.uncoveredTechniques.join(", ")}
                      </span>
                      .
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Technician must bring</p>
                      <div className="mt-2 space-y-2">
                        {requestMetadata.readinessBringItems.length > 0 ? (
                          requestMetadata.readinessBringItems.map((item) => (
                            <div key={`plan-bring-${item}`} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
                            No technician checklist was captured with this request.
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Company must send / upload</p>
                      <div className="mt-2 space-y-2">
                        {requestMetadata.readinessCompanyItems.length > 0 ? (
                          requestMetadata.readinessCompanyItems.map((item) => (
                            <div key={`plan-company-${item}`} className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
                            No company checklist was captured with this request.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {requestMetadata.matchedGuideTitles.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-sm font-medium">Matched preparation guides</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {requestMetadata.matchedGuideTitles.map((guideTitle) => (
                          <Badge key={`guide-title-${guideTitle}`} variant="secondary">
                            {guideTitle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {viewingServiceRequest.details ? (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Details</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {viewingServiceRequest.details}
                  </p>
                </div>
              ) : null}

              {requestMetadata.clientVisibleUpdate ? (
                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium">Latest Update From Level III</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {requestMetadata.clientVisibleUpdate}
                  </p>
                </div>
              ) : null}

              {viewingServiceRequest.linkedActivity ? (
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Linked Level III Follow-up</p>
                      <p className="text-sm text-muted-foreground">
                        This request is already tied to an internal Level III work item.
                      </p>
                    </div>
                    <Badge variant="outline">{viewingServiceRequest.linkedActivity.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Activity</p>
                      <p className="mt-1 font-medium">{viewingServiceRequest.linkedActivity.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                      <p className="mt-1 font-medium">{viewingServiceRequest.linkedActivity.activityType}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Planned Date</p>
                      <p className="mt-1 font-medium">
                        {formatDate(viewingServiceRequest.linkedActivity.nextActionDate ?? viewingServiceRequest.linkedActivity.activityDate)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Supporting Request Pack</p>
                    <p className="text-sm text-muted-foreground">
                      Files and notes the client attached to help the Level III team action this
                      request.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {viewingServiceRequest.supportingDocuments.filter((document) => Boolean(document.fileUrl)).length}/
                    {viewingServiceRequest.requestedDocuments.length || viewingServiceRequest.supportingDocuments.length} uploaded
                  </Badge>
                </div>

                {viewingServiceRequest.requestedDocuments.length === 0 ? (
                  <div className="mt-4 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    No document checklist was configured for this request type.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {viewingServiceRequest.requestedDocuments.map((label) => {
                      const supportingDocument =
                        requestMetadata.supportingDocuments.find(
                          (document) => document.label.toLowerCase() === label.toLowerCase()
                        ) ?? null;
                      return (
                        <div key={label} className="rounded-md border bg-muted/10 p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-medium">{label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {supportingDocument?.fileUrl
                                  ? `Attached as ${supportingDocument.fileName ?? "uploaded file"}`
                                  : "No file attached yet"}
                              </p>
                              {supportingDocument?.note ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                  {supportingDocument.note}
                                </p>
                              ) : null}
                            </div>

                            {supportingDocument?.fileUrl ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(supportingDocument.fileUrl ?? "", "_blank", "noopener,noreferrer")
                                }
                              >
                                <FileDown className="mr-2 h-4 w-4" />
                                Open File
                              </Button>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                  </>
                );
              })()}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingServiceRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={isBranchDialogOpen}
        onOpenChange={setIsBranchDialogOpen}
        title={editingBranch ? "Edit Client Branch" : "Add Client Branch"}
        description="Use branches when one client has multiple operating units that should not automatically see each other's technician records."
        fields={branchFields}
        initialValues={{
          name: editingBranch?.name ?? "",
          code: editingBranch?.code ?? "",
          description: editingBranch?.description ?? "",
          sortOrder: editingBranch?.sortOrder ?? 0,
          active: editingBranch?.active ?? true,
        }}
        isLoading={createBranchMutation.isPending || updateBranchMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;
          try {
            if (editingBranch) {
              await updateBranchMutation.mutateAsync({
                id: editingBranch.id,
                clientId: selectedClientNumber,
                data: {
                  name: String(values.name ?? "").trim(),
                  code: String(values.code ?? "").trim() || null,
                  description: String(values.description ?? "").trim() || null,
                  sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
                  active: values.active !== false,
                },
              });
            } else {
              await createBranchMutation.mutateAsync({
                clientId: selectedClientNumber,
                name: String(values.name ?? "").trim(),
                code: String(values.code ?? "").trim() || null,
                description: String(values.description ?? "").trim() || null,
                sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
                active: values.active !== false,
              });
            }
            await invalidatePortalData();
            setIsBranchDialogOpen(false);
            setEditingBranch(null);
            toast.success(editingBranch ? "Branch updated" : "Branch added");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save this branch");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isBranchImportDialogOpen}
        onOpenChange={setIsBranchImportDialogOpen}
        title="Link Existing Clients As Branches"
        description="Choose existing Level III client records that should sit under this selected head office as separate branches."
        fields={branchImportFields}
        initialValues={{ sourceClientIds: [] }}
        isLoading={importBranchesFromClientsMutation.isPending}
        submitLabel="Convert Into Branches"
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;
          try {
            const sourceClientIds = Array.isArray(values.sourceClientIds)
              ? values.sourceClientIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))
              : [];
            const result = await importBranchesFromClientsMutation.mutateAsync({
              clientId: selectedClientNumber,
              sourceClientIds,
            });
            await invalidatePortalData();
            setIsBranchImportDialogOpen(false);
            toast.success(
              `${result.branchCount} client record${result.branchCount === 1 ? "" : "s"} linked under ${result.headOfficeName}.`
            );
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not link these clients as branches"
            );
            throw error;
          }
        }}
      />

      <ImportDialog
        open={isClientDocumentImportDialogOpen}
        onOpenChange={setIsClientDocumentImportDialogOpen}
        title="Import Client Document References"
        description="Upload a CSV or Excel file of client documents already stored on your drive. This seeds the selected client document library with source references without uploading the actual files yet."
        targetFields={[
          { key: "title", label: "Document Title", required: true, aliases: ["document", "document type", "title"] },
          { key: "category", label: "Category", required: false, aliases: ["document category"] },
          { key: "clientBranchName", label: "Client Branch Name", required: false, aliases: ["branch", "branch name"] },
          { key: "clientBranchId", label: "Client Branch ID", required: false, aliases: ["branch id"] },
          { key: "description", label: "Description", required: false, aliases: ["notes", "comment"] },
          { key: "sourceFileName", label: "Source File Name", required: true, aliases: ["file name", "document file name"] },
          { key: "sourcePath", label: "Source Path", required: true, aliases: ["file path", "full path", "source folder"] },
          { key: "reviewDate", label: "Review Date", required: false, aliases: ["review"] },
          { key: "validUntil", label: "Valid Until", required: false, aliases: ["expiry", "expiry date", "valid to"] },
          { key: "status", label: "Status", required: false, aliases: ["document status"] },
        ]}
        onImport={handleClientDocumentImport}
      />

      <FormDialog
        open={isServiceDefinitionDialogOpen}
        onOpenChange={setIsServiceDefinitionDialogOpen}
        title={editingServiceDefinition ? "Edit Service Type" : "Add Service Type"}
        description="Keep request types configurable so each client can ask for the right support without hard-coded options."
        fields={serviceDefinitionFields}
        initialValues={{
          title: editingServiceDefinition?.title ?? "",
          category: editingServiceDefinition?.category ?? "General",
          description: editingServiceDefinition?.description ?? "",
          instructions: editingServiceDefinition?.instructions ?? "",
          requestLabel: editingServiceDefinition?.config.requestLabel ?? "",
          techniqueOptionsText: (editingServiceDefinition?.config.techniqueOptions ?? []).join("\n"),
          requestedDocumentLabelsText: (editingServiceDefinition?.config.requestedDocumentLabels ?? []).join("\n"),
          sortOrder: editingServiceDefinition?.sortOrder ?? 0,
          active: editingServiceDefinition?.active ?? true,
          allowBranchSelection: editingServiceDefinition?.config.allowBranchSelection ?? true,
          allowTechnicianSelection: editingServiceDefinition?.config.allowTechnicianSelection ?? true,
          allowMultipleTechniques: editingServiceDefinition?.config.allowMultipleTechniques ?? true,
          allowPreferredDate: editingServiceDefinition?.config.allowPreferredDate ?? true,
        }}
        isLoading={
          createServiceDefinitionMutation.isPending || updateServiceDefinitionMutation.isPending
        }
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;
          const payload = {
            title: String(values.title ?? "").trim(),
            category: String(values.category ?? "").trim(),
            description: String(values.description ?? "").trim() || null,
            instructions: String(values.instructions ?? "").trim() || null,
            sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
            active: values.active !== false,
            config: {
              allowBranchSelection: Boolean(values.allowBranchSelection),
              allowTechnicianSelection: Boolean(values.allowTechnicianSelection),
              allowMultipleTechniques: Boolean(values.allowMultipleTechniques),
              allowPreferredDate: Boolean(values.allowPreferredDate),
              requestLabel: String(values.requestLabel ?? "").trim() || "Submit Request",
              techniqueOptions: parseLineList(values.techniqueOptionsText),
              requestedDocumentLabels: parseLineList(values.requestedDocumentLabelsText),
            },
          };
          try {
            if (editingServiceDefinition) {
              await updateServiceDefinitionMutation.mutateAsync({
                id: editingServiceDefinition.id,
                clientId: selectedClientNumber,
                data: payload,
              });
            } else {
              await createServiceDefinitionMutation.mutateAsync({
                clientId: selectedClientNumber,
                ...payload,
              });
            }
            await invalidatePortalData();
            setIsServiceDefinitionDialogOpen(false);
            setEditingServiceDefinition(null);
            toast.success(editingServiceDefinition ? "Service type updated" : "Service type added");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save this service type");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isAssessmentGuideDialogOpen}
        onOpenChange={setIsAssessmentGuideDialogOpen}
        title={editingAssessmentGuide ? "Edit Assessment Guide" : "Add Assessment Guide"}
        description="Capture technique-specific preparation notes, equipment to bring, and company-side documents ahead of the assessment."
        fields={assessmentGuideFields}
        initialValues={{
          title: editingAssessmentGuide?.title ?? "",
          techniqueName: editingAssessmentGuide?.techniqueName ?? "",
          clientBranchId: editingAssessmentGuide?.clientBranchId
            ? String(editingAssessmentGuide.clientBranchId)
            : "all",
          description: editingAssessmentGuide?.description ?? "",
          bringItemsText: (editingAssessmentGuide?.bringItems ?? []).join("\n"),
          companyItemsText: (editingAssessmentGuide?.companyItems ?? []).join("\n"),
          sortOrder: editingAssessmentGuide?.sortOrder ?? 0,
          active: editingAssessmentGuide?.active ?? true,
        }}
        isLoading={createAssessmentGuideMutation.isPending || updateAssessmentGuideMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;
          const payload = {
            clientBranchId:
              String(values.clientBranchId ?? "all") === "all"
                ? null
                : Number(values.clientBranchId),
            title: String(values.title ?? "").trim(),
            techniqueName: String(values.techniqueName ?? "").trim(),
            description: String(values.description ?? "").trim() || null,
            bringItems: parseLineList(values.bringItemsText),
            companyItems: parseLineList(values.companyItemsText),
            sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
            active: values.active !== false,
          };
          try {
            if (editingAssessmentGuide) {
              await updateAssessmentGuideMutation.mutateAsync({
                id: editingAssessmentGuide.id,
                clientId: selectedClientNumber,
                data: payload,
              });
            } else {
              await createAssessmentGuideMutation.mutateAsync({
                clientId: selectedClientNumber,
                ...payload,
              });
            }
            await invalidatePortalData();
            setIsAssessmentGuideDialogOpen(false);
            setEditingAssessmentGuide(null);
            toast.success(editingAssessmentGuide ? "Assessment guide updated" : "Assessment guide added");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save this guide");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isServiceRequestDialogOpen}
        onOpenChange={(open) => {
          setIsServiceRequestDialogOpen(open);
          if (!open) {
            setServiceRequestDialogValues({});
          }
        }}
        title="New Portal Request"
        description={
          selectedServiceDefinition?.instructions ??
          "Request a procedure review, an assessment booking, or another configurable client portal service."
        }
        fields={serviceRequestFields}
        initialValues={{
          serviceDefinitionId: serviceDefinitionOptions[0]?.value ?? "",
          title: "",
          clientBranchId: selectedBranchId || "all",
          technicianId: "none",
          preferredDate: "",
          techniques: [],
          requestedDocuments: [],
          supportingDocuments: [],
          details: "",
        }}
        onValuesChange={setServiceRequestDialogValues}
        normalizeValues={(data, change) => {
          if (change.name === "serviceDefinitionId") {
            return {
              ...data,
              requestedDocuments: [],
              supportingDocuments: [],
            };
          }

          if (change.name !== "requestedDocuments") {
            return data;
          }

          const selectedDocuments = Array.isArray(data.requestedDocuments)
            ? data.requestedDocuments.map((value) => String(value ?? "").trim()).filter(Boolean)
            : parseLineList(data.requestedDocuments);

          return {
            ...data,
            supportingDocuments: alignServiceRequestSupportingDocuments(
              selectedDocuments,
              data.supportingDocuments
            ),
          };
        }}
        isLoading={createServiceRequestMutation.isPending}
        submitLabel={selectedServiceDefinition?.config.requestLabel || "Submit Request"}
        renderExtraContent={({ setValue, isLoading, normaliseFile }) =>
          serviceRequestSupportingDocuments.length > 0 ? (
            <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
              <div>
                <h3 className="text-sm font-semibold">Supporting Upload Pack</h3>
                <p className="text-sm text-muted-foreground">
                  Add the files or notes you want to send with this request. Each selected item stays
                  attached to the request for internal review.
                </p>
              </div>

              <div className="space-y-3">
                {serviceRequestSupportingDocuments.map((document, index) => (
                  <div key={`${document.label}-${index}`} className="rounded-md border bg-background p-3">
                    <div className="flex flex-col gap-3">
                      {(() => {
                        const matchingRule = findLevelIIIDocumentAutomationRuleByLabel(
                          serviceRequestDocumentAutomationRules,
                          document.label
                        );
                        return (
                          <>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">{document.label}</p>
                          <p className="text-xs text-muted-foreground">
                            Upload the current file if you have it, or leave a note for the Level III
                            team.
                          </p>
                          {matchingRule ? (
                            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                              <p>
                                Saved as:{" "}
                                <span className="font-medium text-foreground">
                                  {buildPortalPreviewFileName(
                                    matchingRule.suggestedFileName,
                                    document.fileDataUrl
                                  )}
                                </span>
                              </p>
                              <p>
                                Folder:{" "}
                                <span className="font-medium text-foreground">
                                  {matchingRule.storagePath}
                                </span>
                              </p>
                              {document.linkedRequirementDefinitionName ? (
                                <p>
                                  Compliance item:{" "}
                                  <span className="font-medium text-foreground">
                                    {document.linkedRequirementDefinitionName}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                        {document.fileName ? (
                          <Badge variant="secondary">{document.fileName}</Badge>
                        ) : (
                          <Badge variant="outline">No file attached yet</Badge>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
                        <div className="space-y-2">
                          <Label htmlFor={`service-request-note-${index}`}>Note</Label>
                          <Textarea
                            id={`service-request-note-${index}`}
                            value={document.note ?? ""}
                            onChange={(event) => {
                              const nextDocuments = serviceRequestSupportingDocuments.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, note: event.target.value || null }
                                  : entry
                              );
                              setValue("supportingDocuments", nextDocuments);
                            }}
                            rows={3}
                            placeholder="Optional note, for example 'Will upload after manager approval'."
                            disabled={isLoading}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`service-request-file-${index}`}>Upload File</Label>
                          <Input
                            id={`service-request-file-${index}`}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx"
                            disabled={isLoading}
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                const nextDocuments = serviceRequestSupportingDocuments.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? {
                                          ...entry,
                                          fileDataUrl: null,
                                          fileName: null,
                                          fileUrl: null,
                                          fileKey: null,
                                          contentType: null,
                                        }
                                      : entry
                                );
                                setValue("supportingDocuments", nextDocuments);
                                return;
                              }

                              try {
                                const normalisedValue = await normaliseFile(file, {
                                  maxDataUrlLength: 5_000_000,
                                });
                                const matchingRule = findLevelIIIDocumentAutomationRuleByLabel(
                                  serviceRequestDocumentAutomationRules,
                                  document.label
                                );
                                const nextDocuments = serviceRequestSupportingDocuments.map(
                                  (entry, entryIndex) =>
                                    entryIndex === index
                                      ? {
                                          ...entry,
                                          fileDataUrl: normalisedValue,
                                          fileName: matchingRule
                                            ? buildPortalPreviewFileName(
                                                matchingRule.suggestedFileName,
                                                normalisedValue
                                              )
                                            : file.name,
                                          fileUrl: null,
                                          fileKey: null,
                                          contentType: file.type || null,
                                          classifiedLabel: matchingRule?.label ?? entry.label,
                                          storagePath: matchingRule?.storagePath ?? null,
                                          suggestedFileName:
                                            matchingRule?.suggestedFileName ?? file.name,
                                        }
                                      : entry
                                );
                                setValue("supportingDocuments", nextDocuments);
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Could not read this supporting file."
                                );
                              }
                            }}
                          />

                          {document.fileName ? (
                            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs text-muted-foreground">
                              <span className="truncate">{document.fileName}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => {
                                  const nextDocuments = serviceRequestSupportingDocuments.map(
                                    (entry, entryIndex) =>
                                      entryIndex === index
                                        ? {
                                            ...entry,
                                            fileDataUrl: null,
                                            fileName: null,
                                            fileUrl: null,
                                            fileKey: null,
                                            contentType: null,
                                          }
                                        : entry
                                  );
                                  setValue("supportingDocuments", nextDocuments);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        }
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;
          const selectedDefinition =
            serviceDefinitionsById.get(Number(values.serviceDefinitionId ?? 0)) ?? null;
          if (!selectedDefinition) {
            const message = "Please choose a request type.";
            toast.error(message);
            throw new Error(message);
          }
          try {
            await createServiceRequestMutation.mutateAsync({
              clientId: selectedClientNumber,
              clientBranchId:
                String(values.clientBranchId ?? "all") === "all"
                  ? null
                  : Number(values.clientBranchId),
              serviceDefinitionId: selectedDefinition.id,
              technicianId:
                String(values.technicianId ?? "none") === "none"
                  ? null
                  : Number(values.technicianId),
              title: String(values.title ?? "").trim(),
              requestType: selectedDefinition.title,
              preferredDate: String(values.preferredDate ?? "").trim()
                ? new Date(`${String(values.preferredDate)}T00:00:00`)
                : null,
              techniques: Array.isArray(values.techniques)
                ? values.techniques.map((value) => String(value))
                : parseLineList(values.techniques),
              requestedDocuments: Array.isArray(values.requestedDocuments)
                ? values.requestedDocuments.map((value) => String(value))
                : parseLineList(values.requestedDocuments),
              supportingDocuments: normalisePortalServiceRequestSupportingDocuments(
                values.supportingDocuments
              ).map((document) => ({
                label: document.label,
                note: document.note,
                fileName: document.fileName,
                fileDataUrl: document.fileDataUrl ?? null,
              })),
              details: String(values.details ?? "").trim() || null,
              metadata: {
                selectedBranchId: selectedBranchNumber,
                ...(values.metadata &&
                typeof values.metadata === "object" &&
                !Array.isArray(values.metadata)
                  ? (values.metadata as Record<string, unknown>)
                  : {}),
              },
            });
            await invalidatePortalData();
            setIsServiceRequestDialogOpen(false);
            setServiceRequestDialogValues({});
            toast.success("Portal request submitted");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not submit this portal request");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isCreatePortalUserDialogOpen}
        onOpenChange={setIsCreatePortalUserDialogOpen}
        title="Create Client Login"
        description="Create a dedicated client user and allocate that user to the currently selected client portal in one step."
        fields={createPortalUserFields}
        initialValues={{
          name: selectedClient?.primaryContact ?? "",
          email: selectedClient?.email ?? "",
          password: "",
          confirmPassword: "",
          accessLevel: "viewer",
          receiveReminders: true,
          sendInviteEmail: isPortalEmailConfigured,
          branchIds: [],
        }}
        isLoading={createPortalUserMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          const password = String(values.password ?? "").trim();
          const confirmPassword = String(values.confirmPassword ?? "").trim();

          if (password.length < 8) {
            const message = "Password must be at least 8 characters long.";
            toast.error(message);
            throw new Error(message);
          }

          if (password !== confirmPassword) {
            const message = "Passwords do not match.";
            toast.error(message);
            throw new Error(message);
          }

          try {
            const createdUser = await createPortalUserMutation.mutateAsync({
              clientId: selectedClientNumber,
              name: String(values.name ?? "").trim(),
              email: String(values.email ?? "").trim().toLowerCase(),
              password,
              accessLevel: String(values.accessLevel) as PortalAccessLevel,
              receiveReminders: Boolean(values.receiveReminders),
              branchIds: Array.isArray(values.branchIds)
                ? values.branchIds.map((value) => Number(value))
                : [],
            });
            let inviteEmailSent = false;
            if (Boolean(values.sendInviteEmail) && createdUser?.id) {
              const delivery = await sendPortalCredentialsEmailMutation.mutateAsync({
                clientId: selectedClientNumber,
                userId: createdUser.id,
                password,
                mode: "created",
              });
              inviteEmailSent = delivery.sent;
              if (delivery.sent) {
                toast.success("Client login email sent");
              } else {
                toast.error(
                  "Email delivery is not configured yet. Copy the invite details and share them manually."
                );
              }
            }

            await invalidatePortalData();
            setIsCreatePortalUserDialogOpen(false);
            setCredentialHandoff({
              userId: createdUser.id,
              name: String(values.name ?? "").trim() || null,
              email: String(values.email ?? "").trim().toLowerCase(),
              password,
              mode: "created",
              emailConfigured: isPortalEmailConfigured,
              emailSent: inviteEmailSent,
            });
            setIsCredentialHandoffDialogOpen(true);
            toast.success("Client login created, allocated, and set to force a password change on first sign-in.");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not create and allocate this client login"
            );
            throw error;
          }
        }}
      />

      <FormDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        title="Assign Client User"
        description="Allocate an existing app user to this client portal. Allocated users will only see the clients you assign to them."
        fields={assignmentFields}
        initialValues={{
          userId: "",
          accessLevel: "viewer",
          receiveReminders: true,
          branchIds: [],
        }}
        isLoading={assignUserMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber) return;

          try {
            await assignUserMutation.mutateAsync({
              clientId: selectedClientNumber,
              userId: Number(values.userId),
              accessLevel: String(values.accessLevel) as PortalAccessLevel,
              receiveReminders: Boolean(values.receiveReminders),
              branchIds: Array.isArray(values.branchIds)
                ? values.branchIds.map((value) => Number(value))
                : [],
            });
            await invalidatePortalData();
            setIsAssignmentDialogOpen(false);
            toast.success("Client user assigned");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not assign this user");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isEditAssignmentDialogOpen}
        onOpenChange={(open) => {
          setIsEditAssignmentDialogOpen(open);
          if (!open) {
            setEditingAssignment(null);
          }
        }}
        title="Edit Client Access"
        description="Update this client user's portal access level, reminder preference, and visible branch scope."
        fields={editAssignmentFields}
        initialValues={{
          accessLevel: editingAssignment?.accessLevel ?? "viewer",
          receiveReminders: editingAssignment?.receiveReminders ?? true,
          branchIds: editingAssignment?.branchIds ?? [],
        }}
        isLoading={assignUserMutation.isPending}
        onSubmit={async (values) => {
          if (!selectedClientNumber || !editingAssignment) return;

          try {
            await assignUserMutation.mutateAsync({
              clientId: selectedClientNumber,
              userId: editingAssignment.userId,
              accessLevel: String(values.accessLevel) as PortalAccessLevel,
              receiveReminders: Boolean(values.receiveReminders),
              branchIds: Array.isArray(values.branchIds)
                ? values.branchIds.map((value) => Number(value))
                : [],
            });
            await invalidatePortalData();
            setIsEditAssignmentDialogOpen(false);
            setEditingAssignment(null);
            toast.success("Client access updated");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update this client access");
            throw error;
          }
        }}
      />

      <FormDialog
        open={isResetPortalPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsResetPortalPasswordDialogOpen(open);
          if (!open) {
            setResettingPortalUser(null);
          }
        }}
        title="Reset Client Password"
        description={
          resettingPortalUser
            ? `Issue a new temporary password for ${resettingPortalUser.userName ?? resettingPortalUser.userEmail ?? `User ${resettingPortalUser.userId}`}. They will be forced to change it on their next sign-in.`
            : "Issue a new temporary password for this client user."
        }
        fields={resetPortalPasswordFields}
        initialValues={{
          password: "",
          confirmPassword: "",
          sendInviteEmail: isPortalEmailConfigured,
        }}
        isLoading={resetPortalUserPasswordMutation.isPending}
        submitLabel="Reset Password"
        onSubmit={async (values) => {
          if (!selectedClientNumber || !resettingPortalUser) return;

          const password = String(values.password ?? "").trim();
          const confirmPassword = String(values.confirmPassword ?? "").trim();

          if (password.length < 8) {
            const message = "Password must be at least 8 characters long.";
            toast.error(message);
            throw new Error(message);
          }

          if (password !== confirmPassword) {
            const message = "Passwords do not match.";
            toast.error(message);
            throw new Error(message);
          }

          try {
            await resetPortalUserPasswordMutation.mutateAsync({
              clientId: selectedClientNumber,
              userId: resettingPortalUser.userId,
              password,
            });
            let inviteEmailSent = false;
            if (Boolean(values.sendInviteEmail)) {
              const delivery = await sendPortalCredentialsEmailMutation.mutateAsync({
                clientId: selectedClientNumber,
                userId: resettingPortalUser.userId,
                password,
                mode: "reset",
              });
              inviteEmailSent = delivery.sent;
              if (delivery.sent) {
                toast.success("Client password email sent");
              } else {
                toast.error(
                  "Email delivery is not configured yet. Copy the invite details and share them manually."
                );
              }
            }
            await invalidatePortalData();
            setIsResetPortalPasswordDialogOpen(false);
            setCredentialHandoff({
              userId: resettingPortalUser.userId,
              name: resettingPortalUser.userName ?? null,
              email: resettingPortalUser.userEmail ?? "",
              password,
              mode: "reset",
              emailConfigured: isPortalEmailConfigured,
              emailSent: inviteEmailSent,
            });
            setIsCredentialHandoffDialogOpen(true);
            setResettingPortalUser(null);
            toast.success("Temporary password reset. The client must change it on next sign-in.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not reset this client password");
            throw error;
          }
        }}
      />

      <Dialog
        open={isCredentialHandoffDialogOpen}
        onOpenChange={(open) => {
          setIsCredentialHandoffDialogOpen(open);
          if (!open) {
            setCredentialHandoff(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {credentialHandoff?.mode === "reset"
                ? "Temporary password ready"
                : "Client login ready"}
            </DialogTitle>
            <DialogDescription>
              Copy these details now and share them with the client user. The temporary password is only shown in this handoff step.
            </DialogDescription>
          </DialogHeader>

          {credentialHandoff ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Client user</p>
                    <p className="mt-1 font-medium">
                      {credentialHandoff.name || credentialHandoff.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                    <p className="mt-1 font-medium break-all">{credentialHandoff.email}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Temporary password</p>
                    <p className="mt-1 font-mono font-medium">{credentialHandoff.password}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Login link</p>
                    <p className="mt-1 break-all text-sm font-medium">{portalLoginUrl}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
                The user will be forced to change this password on first sign-in.
              </div>
              <div
                className={
                  credentialHandoff.emailConfigured
                    ? credentialHandoff.emailSent
                      ? "rounded-lg border border-emerald-300/60 bg-emerald-50 p-3 text-sm text-emerald-900"
                      : "rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground"
                    : "rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground"
                }
              >
                {credentialHandoff.emailConfigured
                  ? credentialHandoff.emailSent
                    ? "These temporary login details were also emailed from TextPoint."
                    : "Email delivery is available. You can send these details directly from TextPoint or copy them manually."
                  : "Email delivery is not configured yet, so these login details need to be shared manually."}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!credentialHandoff) return;
                  try {
                    await navigator.clipboard.writeText(
                      `Email: ${credentialHandoff.email}\nTemporary Password: ${credentialHandoff.password}\nLogin link: ${portalLoginUrl}`
                    );
                    toast.success("Client login details copied");
                  } catch {
                    toast.error("Could not copy the login details");
                  }
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Credentials
              </Button>
              <Button
                variant="outline"
                disabled={
                  !credentialHandoff?.emailConfigured ||
                  sendPortalCredentialsEmailMutation.isPending
                }
                onClick={handleSendCredentialEmail}
              >
                <Mail className="mr-2 h-4 w-4" />
                {sendPortalCredentialsEmailMutation.isPending
                  ? "Sending..."
                  : credentialHandoff?.emailSent
                    ? "Resend Email"
                    : "Send Email"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  if (!credentialInviteMessage) return;
                  try {
                    await navigator.clipboard.writeText(credentialInviteMessage);
                    toast.success("Client invite message copied");
                  } catch {
                    toast.error("Could not copy the invite message");
                  }
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Copy Invite Message
              </Button>
              <Button
                onClick={() => {
                  setIsCredentialHandoffDialogOpen(false);
                  setCredentialHandoff(null);
                }}
              >
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
