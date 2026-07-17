import { type ChangeEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { ImportDialog } from "@/components/ImportDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DOCUMENT_PLACEHOLDERS,
  getDocumentPlaceholderCategories,
  getPlaceholderDefinition,
  getTemplatePlaceholderProfile,
  replacePlaceholderToken,
  toPlaceholderToken,
  validateTemplatePlaceholders,
  type PlaceholderDefinition,
  type TemplateValidationResult,
} from "@shared/documentPlaceholders";
import {
  buildEditableHtmlDocument,
  buildEditableHtmlPackDocument,
  exportEditableHtmlDocument,
  exportEditableHtmlPackDocument,
  exportTableToCSV,
  exportTableToPDF,
  getDefaultDocumentLayout,
  type DocumentLayout,
} from "@/lib/exportUtils";
import { importDocxTemplateFile } from "@/lib/docxTemplateImport";
import { toast } from "sonner";
import {
  AlertTriangle,
  Clock3,
  Copy,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Layers3,
  Pencil,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  XCircle,
} from "lucide-react";

type DocumentKind = "library" | "template" | "generated";
type TemplateStatus = "Draft" | "Active" | "Archived";
type GeneratedStatus = "Draft" | "Issued" | "Corrected" | "Superseded";
type DocumentApprovalStatus = "Draft" | "In Review" | "Approved" | "Rejected";
type PackProgressStatus = "Complete" | "In Progress" | "No Documents";
type ApprovalDialogMode = "approve" | "reject";
type DocumentLifecycleStage =
  | "Draft"
  | "Blocked"
  | "In Review"
  | "Rejected"
  | "Approved"
  | "Issued"
  | "Acknowledged"
  | "Corrected"
  | "Superseded"
  | "Archived";

const LEARNER_PACK_CATEGORIES = [
  "Student Pack",
  "Course Control",
  "Results & Certificates",
] as const;
const LECTURER_PACK_CATEGORIES = ["Lecturer Pack"] as const;
const PACK_CATEGORY_ORDER = [
  ...LEARNER_PACK_CATEGORIES,
  ...LECTURER_PACK_CATEGORIES,
] as const;

interface Branch {
  id: number;
  name: string;
  logoUrl?: string | null;
  companyName?: string | null;
  primaryColor?: string | null;
}

interface StudentRecord {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string | null;
}

interface EnrollmentRecord {
  id: number;
  studentId: number;
  courseScheduleId: number;
  status: "Active" | "Completed" | "Withdrawn" | "Suspended";
}

interface CourseRecord {
  id: number;
  code: string | null;
  name: string;
}

interface ScheduleRecord {
  id: number;
  courseId: number;
  branchId: number | null;
  startDate: string | Date;
  endDate: string | Date;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
}

type DocumentMetadata = {
  kind?: DocumentKind;
  accentColor?: string;
  companyName?: string;
  logoUrl?: string;
  templateCategory?: string;
  templateStatus?: TemplateStatus;
  generatedStatus?: GeneratedStatus;
  version?: number;
  templateKey?: string;
  placeholderKeys?: string[];
  generatedFromTemplateId?: number;
  generatedFromTemplateTitle?: string;
  generatedFromTemplateKey?: string;
  sourceType?: string;
  studentId?: number;
  studentName?: string;
  enrollmentId?: number;
  scheduleId?: number;
  courseId?: number;
  courseLabel?: string;
  branchName?: string;
  branchId?: number;
  generatedAt?: string;
  documentCode?: string;
  issueNumber?: string;
  effectiveDate?: string;
  revisedFromDocumentId?: number;
  rootGeneratedDocumentId?: number;
  supersededByDocumentId?: number;
  revisionReason?: string | null;
  issuedAt?: string;
  issuedByName?: string;
  issueNote?: string | null;
  packReleaseReference?: string;
  distributedAt?: string;
  distributedByName?: string;
  distributedToName?: string;
  distributedToEmail?: string;
  distributionMethod?: string;
  signatureDueDate?: string;
  distributionNote?: string | null;
  acknowledgedAt?: string;
  acknowledgedByName?: string;
  acknowledgedByRole?: string;
  acknowledgementMethod?: string;
  acknowledgementNote?: string | null;
  acknowledgementSignatureDataUrl?: string;
  acknowledgementCapturedByName?: string;
  approvalStatus?: DocumentApprovalStatus;
  submittedForReviewAt?: string;
  submittedForReviewByName?: string;
  approvedAt?: string;
  approvedByName?: string;
  rejectedAt?: string;
  rejectedByName?: string;
  approvalNote?: string | null;
  rejectionReason?: string | null;
  releaseAuthority?: string | null;
  releaseAuthorityRole?: string | null;
  documentLayout?: DocumentLayout;
};

interface DocumentRecord {
  id: number;
  title: string;
  description: string | null;
  documentType: string | null;
  content: string | null;
  url: string;
  branchId: number | null;
  tags: DocumentMetadata | null;
  createdAt: string | Date;
}

type DocumentRow = DocumentRecord & {
  kind: DocumentKind;
  branchName: string;
  templateCategory: string;
  templateStatus: TemplateStatus;
  generatedStatus: GeneratedStatus;
  sourceType: string;
  version: number;
  documentCode: string;
  issueNumber: string;
  effectiveDate: string;
  templateKey: string;
  generatedFromTemplateKey: string;
  generatedFromTemplateTitle: string;
  studentName: string;
  courseLabel: string;
  placeholderCount: number;
  usageCount: number;
  enrollmentId: number | null;
  scheduleId: number | null;
  revisedFromDocumentId: number | null;
  supersededByDocumentId: number | null;
  revisionLabel: string;
  revisionReason: string;
  issuedAt: string;
  issuedByName: string;
  issueNote: string;
  packReleaseReference: string;
  distributedAt: string;
  distributedByName: string;
  distributedToName: string;
  distributedToEmail: string;
  distributionMethod: string;
  signatureDueDate: string;
  distributionNote: string;
  acknowledgedAt: string;
  acknowledgedByName: string;
  acknowledgedByRole: string;
  acknowledgementMethod: string;
  acknowledgementNote: string;
  acknowledgementSignatureDataUrl: string;
  acknowledgementCapturedByName: string;
  approvalStatus: DocumentApprovalStatus;
  submittedForReviewAt: string;
  submittedForReviewByName: string;
  approvedAt: string;
  approvedByName: string;
  rejectedAt: string;
  rejectedByName: string;
  approvalNote: string;
  rejectionReason: string;
  releaseAuthority: string;
  releaseAuthorityRole: string;
};

type DocumentLifecycleRegisterRow = {
  id: number;
  source: DocumentRow;
  title: string;
  kindLabel: "Template" | "Generated";
  documentCode: string;
  branchName: string;
  contextLabel: string;
  lifecycleStage: DocumentLifecycleStage;
  approvalStatus: DocumentApprovalStatus;
  validationStatus: TemplateValidationResult["status"] | "Ready";
  latestEventLabel: string;
  latestEventDate: string;
  latestEventDateLabel: string;
  latestEventActor: string;
  releaseReference: string;
  revisionLabel: string;
};

type DocumentLifecycleEvent = {
  id: string;
  documentId: number;
  title: string;
  kindLabel: "Template" | "Generated";
  eventType: string;
  eventDate: string;
  eventDateLabel: string;
  actorName: string;
  detail: string;
  branchName: string;
  contextLabel: string;
};

type PackControlRow = {
  id: string;
  packType: "Learner Pack" | "Lecturer Pack";
  contextLabel: string;
  branchName: string;
  studentId: number | null;
  enrollmentId: number | null;
  scheduleId: number | null;
  completedCount: number;
  requiredCount: number;
  missingTemplates: string[];
  issuedCount: number;
  draftCount: number;
  correctedCount: number;
  unapprovedCount: number;
  distributedCount: number;
  isFullyDistributed: boolean;
  distributedAt: string;
  distributedToName: string;
  distributedToEmail: string;
  distributionMethod: string;
  signatureDueDate: string;
  isSignatureOverdue: boolean;
  acknowledgedCount: number;
  isFullyAcknowledged: boolean;
  acknowledgedAt: string;
  acknowledgedByName: string;
  acknowledgementMethod: string;
  isFullyIssued: boolean;
  latestCreatedAt: string | Date | null;
  status: PackProgressStatus;
};

type PackDistributionStatus =
  | "Incomplete"
  | "Ready To Issue"
  | "Issued - Not Sent"
  | "Sent - Awaiting Signature"
  | "Signature Overdue"
  | "Acknowledged";

type PackDistributionRegisterRow = {
  id: string;
  source: PackControlRow;
  documents: DocumentRow[];
  packType: "Learner Pack" | "Lecturer Pack";
  contextLabel: string;
  branchName: string;
  distributionStatus: PackDistributionStatus;
  requiredCount: number;
  issuedCount: number;
  acknowledgedCount: number;
  outstandingSignatureCount: number;
  releaseReference: string;
  issuedAt: string;
  issuedAtLabel: string;
  issuedByName: string;
  distributedAt: string;
  distributedAtLabel: string;
  distributedToName: string;
  distributedToEmail: string;
  distributionMethod: string;
  signatureDueDate: string;
  signatureDueDateLabel: string;
  acknowledgedAt: string;
  acknowledgedAtLabel: string;
  acknowledgedByName: string;
  acknowledgementMethod: string;
  latestActivityDate: string;
  latestActivityDateLabel: string;
};

type TemplateControlRow = {
  id: string;
  title: string;
  documentCode: string;
  category: string;
  currentIssueNumber: string;
  currentEffectiveDate: string;
  currentStatus: TemplateStatus;
  issueCount: number;
  archivedCount: number;
  draftCount: number;
  usageCount: number;
  currentTemplate: DocumentRow;
  issueHistory: Array<{
    id: number;
    issueNumber: string;
    status: TemplateStatus;
    version: number;
    effectiveDate: string;
  }>;
};

const DOCUMENT_TYPES = [
  { value: "Course Enrolment Confirmation", label: "Course Enrolment Confirmation" },
  { value: "Course Feedback Form", label: "Course Feedback Form" },
  { value: "Training Process Control Sheet", label: "Training Process Control Sheet" },
  { value: "Counselling Register", label: "Counselling Register" },
  { value: "Course Completion Checklist", label: "Course Completion Checklist" },
  { value: "Certificate of Attendance", label: "Certificate of Attendance" },
  { value: "End of Course Result Notice", label: "End of Course Result Notice" },
  { value: "Exam Rewrite Application", label: "Exam Rewrite Application" },
  { value: "Lecturer Course Information", label: "Lecturer Course Information" },
  { value: "Policy", label: "Policy" },
  { value: "Procedure", label: "Procedure" },
  { value: "Training Material", label: "Training Material" },
  { value: "Report", label: "Report" },
  { value: "Letter", label: "Letter" },
  { value: "Other", label: "Other" },
];

const TEMPLATE_CATEGORIES = [
  { value: "Student Pack", label: "Student Pack" },
  { value: "Course Control", label: "Course Control" },
  { value: "Results & Certificates", label: "Results & Certificates" },
  { value: "Lecturer Pack", label: "Lecturer Pack" },
  { value: "General", label: "General" },
];

const TEMPLATE_STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Active", label: "Active" },
  { value: "Archived", label: "Archived" },
];

const GENERATED_STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Issued", label: "Issued" },
  { value: "Corrected", label: "Corrected" },
  { value: "Superseded", label: "Superseded" },
];

const DISTRIBUTION_METHOD_OPTIONS = [
  { value: "Email", label: "Email" },
  { value: "Printed Copy", label: "Printed Copy" },
  { value: "Hand Delivered", label: "Hand Delivered" },
  { value: "SharePoint Link", label: "SharePoint Link" },
  { value: "Other", label: "Other" },
] as const;
type DocumentDistributionMethod = (typeof DISTRIBUTION_METHOD_OPTIONS)[number]["value"];
const distributionMethodOptions = DISTRIBUTION_METHOD_OPTIONS.map((option) => ({ ...option }));

const DISTRIBUTION_ALL_FILTER_VALUE = "__all";
const DISTRIBUTION_NEEDS_ACTION_FILTER_VALUE = "__needs_action";
const DISTRIBUTION_STATUS_FILTER_OPTIONS = [
  { value: DISTRIBUTION_ALL_FILTER_VALUE, label: "All statuses" },
  { value: DISTRIBUTION_NEEDS_ACTION_FILTER_VALUE, label: "Needs action" },
  { value: "Signature Overdue", label: "Signature overdue" },
  { value: "Sent - Awaiting Signature", label: "Sent - awaiting signature" },
  { value: "Issued - Not Sent", label: "Issued - not sent" },
  { value: "Ready To Issue", label: "Ready to issue" },
  { value: "Incomplete", label: "Incomplete" },
  { value: "Acknowledged", label: "Acknowledged" },
] as const;

const DISTRIBUTION_PACK_TYPE_FILTER_OPTIONS = [
  { value: DISTRIBUTION_ALL_FILTER_VALUE, label: "All pack types" },
  { value: "Learner Pack", label: "Learner packs" },
  { value: "Lecturer Pack", label: "Lecturer packs" },
] as const;

const DEFAULT_LIBRARY_CONTENT =
  "<h2>Document heading</h2><p>Edit this content to suit the document.</p>";
const DEFAULT_TEMPLATE_CONTENT =
  "<h2>{{courseLabel}}</h2><p>Prepare this template with editable placeholders and workflow-specific instructions.</p>";

function getDocumentMetadata(tags: DocumentRecord["tags"]) {
  return tags && typeof tags === "object" ? tags : {};
}

function resolveDistributionMethod(value: unknown): DocumentDistributionMethod {
  const candidate = String(value || "Email");
  return DISTRIBUTION_METHOD_OPTIONS.some((option) => option.value === candidate)
    ? (candidate as DocumentDistributionMethod)
    : "Email";
}

function getDocumentKind(record: DocumentRecord | null | undefined): DocumentKind {
  const metadata = getDocumentMetadata(record?.tags || null);
  return (metadata.kind as DocumentKind) || "library";
}

function getDocumentApprovalStatus(
  metadata: DocumentMetadata,
  kind: DocumentKind
): DocumentApprovalStatus {
  const status = metadata.approvalStatus;
  if (status === "Draft" || status === "In Review" || status === "Approved" || status === "Rejected") {
    return status;
  }

  if (kind === "template" && metadata.templateStatus === "Active") {
    return "Approved";
  }

  if (kind === "generated" && metadata.generatedStatus === "Issued") {
    return "Approved";
  }

  return "Draft";
}

function resetApprovalMetadata(
  metadata: DocumentMetadata,
  kind: DocumentKind
): DocumentMetadata {
  if (kind !== "template" && kind !== "generated") {
    return metadata;
  }

  return {
    ...metadata,
    approvalStatus: "Draft",
    submittedForReviewAt: undefined,
    submittedForReviewByName: undefined,
    approvedAt: undefined,
    approvedByName: undefined,
    rejectedAt: undefined,
    rejectedByName: undefined,
    approvalNote: undefined,
    rejectionReason: undefined,
    releaseAuthority: undefined,
    releaseAuthorityRole: undefined,
  };
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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

function extractPlaceholders(content: string) {
  return Array.from(
    new Set(
      Array.from(content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map((match) => match[1])
    )
  );
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
}

function buildCourseLabel(course: CourseRecord | null | undefined) {
  if (!course) return "Unknown course";
  return course.code ? `${course.code} - ${course.name}` : course.name;
}

function getTemplateStatusClass(status: TemplateStatus) {
  switch (status) {
    case "Active":
      return "bg-emerald-100 text-emerald-800";
    case "Archived":
      return "bg-slate-200 text-slate-800";
    case "Draft":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getGeneratedStatusClass(status: GeneratedStatus) {
  switch (status) {
    case "Issued":
      return "bg-emerald-100 text-emerald-800";
    case "Corrected":
      return "bg-blue-100 text-blue-800";
    case "Superseded":
      return "bg-slate-200 text-slate-800";
    case "Draft":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getApprovalStatusClass(status: DocumentApprovalStatus) {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-800";
    case "In Review":
      return "bg-blue-100 text-blue-800";
    case "Rejected":
      return "bg-rose-100 text-rose-800";
    case "Draft":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getPackProgressClass(status: PackProgressStatus) {
  switch (status) {
    case "Complete":
      return "bg-emerald-100 text-emerald-800";
    case "In Progress":
      return "bg-blue-100 text-blue-800";
    case "No Documents":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getValidationStatusClass(status: TemplateValidationResult["status"]) {
  switch (status) {
    case "Ready":
      return "bg-emerald-100 text-emerald-800";
    case "Warnings":
      return "bg-amber-100 text-amber-800";
    case "Needs Attention":
    default:
      return "bg-rose-100 text-rose-800";
  }
}

function getLifecycleStageClass(status: DocumentLifecycleStage) {
  switch (status) {
    case "Issued":
      return "bg-emerald-100 text-emerald-800";
    case "Acknowledged":
      return "bg-indigo-100 text-indigo-800";
    case "Approved":
      return "bg-teal-100 text-teal-800";
    case "In Review":
      return "bg-blue-100 text-blue-800";
    case "Corrected":
      return "bg-cyan-100 text-cyan-800";
    case "Superseded":
      return "bg-slate-200 text-slate-800";
    case "Rejected":
      return "bg-rose-100 text-rose-800";
    case "Blocked":
      return "bg-red-100 text-red-800";
    case "Archived":
      return "bg-stone-200 text-stone-800";
    case "Draft":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getDistributionStatusClass(status: PackDistributionStatus) {
  switch (status) {
    case "Acknowledged":
      return "bg-indigo-100 text-indigo-800";
    case "Signature Overdue":
      return "bg-rose-100 text-rose-800";
    case "Sent - Awaiting Signature":
      return "bg-blue-100 text-blue-800";
    case "Issued - Not Sent":
      return "bg-slate-100 text-slate-800";
    case "Ready To Issue":
      return "bg-emerald-100 text-emerald-800";
    case "Incomplete":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getDistributionActionPriority(status: PackDistributionStatus) {
  switch (status) {
    case "Signature Overdue":
      return 0;
    case "Sent - Awaiting Signature":
      return 1;
    case "Issued - Not Sent":
      return 2;
    case "Ready To Issue":
      return 3;
    case "Incomplete":
      return 4;
    case "Acknowledged":
    default:
      return 5;
  }
}

function isDistributionNeedsAction(status: PackDistributionStatus) {
  return status !== "Acknowledged";
}

function getTemplateStatusPriority(status: TemplateStatus) {
  switch (status) {
    case "Active":
      return 3;
    case "Draft":
      return 2;
    case "Archived":
    default:
      return 1;
  }
}

function pickPreferredGeneratedDocument(left: DocumentRow | undefined, right: DocumentRow) {
  if (!left) return right;
  if (left.generatedStatus === "Superseded" && right.generatedStatus !== "Superseded") {
    return right;
  }
  if (left.generatedStatus !== "Superseded" && right.generatedStatus === "Superseded") {
    return left;
  }
  if (right.version > left.version) {
    return right;
  }

  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  return rightTime > leftTime ? right : left;
}

function pickPreferredTemplateIssue(left: DocumentRow | undefined, right: DocumentRow) {
  if (!left) return right;

  const leftPriority = getTemplateStatusPriority(left.templateStatus);
  const rightPriority = getTemplateStatusPriority(right.templateStatus);
  if (leftPriority !== rightPriority) {
    return rightPriority > leftPriority ? right : left;
  }

  if (right.version !== left.version) {
    return right.version > left.version ? right : left;
  }

  const leftEffective = left.effectiveDate ? new Date(left.effectiveDate).getTime() : 0;
  const rightEffective = right.effectiveDate ? new Date(right.effectiveDate).getTime() : 0;
  if (leftEffective !== rightEffective) {
    return rightEffective > leftEffective ? right : left;
  }

  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  return rightTime > leftTime ? right : left;
}

function extractEmbeddableHtmlContent(content: string | null | undefined) {
  if (!content) {
    return "<p>No content available.</p>";
  }

  const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1]?.trim() || content;
}

function buildControlMetadataHtml(metadata: DocumentMetadata) {
  const kind = (metadata.kind as DocumentKind) || "library";
  const approvalStatus = getDocumentApprovalStatus(metadata, kind);
  const details = [
    metadata.documentCode
      ? `<tr><th>Document Code</th><td>${String(metadata.documentCode)}</td></tr>`
      : "",
    metadata.issueNumber
      ? `<tr><th>Issue Number</th><td>${String(metadata.issueNumber)}</td></tr>`
      : "",
    metadata.effectiveDate
      ? `<tr><th>Effective Date</th><td>${formatDate(String(metadata.effectiveDate))}</td></tr>`
      : "",
    metadata.packReleaseReference
      ? `<tr><th>Release Reference</th><td>${String(metadata.packReleaseReference)}</td></tr>`
      : "",
    metadata.issuedAt
      ? `<tr><th>Issued</th><td>${formatDate(String(metadata.issuedAt))}${
          metadata.issuedByName ? ` by ${String(metadata.issuedByName)}` : ""
        }</td></tr>`
      : "",
    kind === "template" || kind === "generated"
      ? `<tr><th>Approval Status</th><td>${String(approvalStatus)}</td></tr>`
      : "",
    metadata.submittedForReviewAt
      ? `<tr><th>Submitted For Review</th><td>${formatDate(String(metadata.submittedForReviewAt))}${
          metadata.submittedForReviewByName
            ? ` by ${String(metadata.submittedForReviewByName)}`
            : ""
        }</td></tr>`
      : "",
    metadata.approvedAt
      ? `<tr><th>Approved</th><td>${formatDate(String(metadata.approvedAt))}${
          metadata.approvedByName ? ` by ${String(metadata.approvedByName)}` : ""
        }</td></tr>`
      : "",
    metadata.rejectedAt
      ? `<tr><th>Rejected</th><td>${formatDate(String(metadata.rejectedAt))}${
          metadata.rejectedByName ? ` by ${String(metadata.rejectedByName)}` : ""
        }</td></tr>`
      : "",
    metadata.releaseAuthority
      ? `<tr><th>Release Authority</th><td>${String(metadata.releaseAuthority)}${
          metadata.releaseAuthorityRole
            ? ` (${String(metadata.releaseAuthorityRole)})`
            : ""
        }</td></tr>`
      : "",
    metadata.distributedAt
      ? `<tr><th>Distributed</th><td>${formatDate(String(metadata.distributedAt))}${
          metadata.distributedByName ? ` by ${String(metadata.distributedByName)}` : ""
        }${
          metadata.distributedToName ? ` to ${String(metadata.distributedToName)}` : ""
        }${
          metadata.distributionMethod ? ` via ${String(metadata.distributionMethod)}` : ""
        }</td></tr>`
      : "",
    metadata.signatureDueDate
      ? `<tr><th>Signature Due</th><td>${formatDate(String(metadata.signatureDueDate))}</td></tr>`
      : "",
    metadata.acknowledgedAt
      ? `<tr><th>Acknowledged</th><td>${formatDate(String(metadata.acknowledgedAt))}${
          metadata.acknowledgedByName ? ` by ${String(metadata.acknowledgedByName)}` : ""
        }${
          metadata.acknowledgementMethod
            ? ` using ${String(metadata.acknowledgementMethod)}`
            : ""
        }</td></tr>`
      : "",
    metadata.acknowledgementSignatureDataUrl
      ? `<tr><th>Digital Signature</th><td><img src="${String(
          metadata.acknowledgementSignatureDataUrl
        )}" alt="Digital signature" style="max-width:240px;max-height:90px;object-fit:contain;" /></td></tr>`
      : "",
    metadata.acknowledgementNote
      ? `<tr><th>Acknowledgement Note</th><td>${String(
          metadata.acknowledgementNote
        )}</td></tr>`
      : "",
    metadata.approvalNote
      ? `<tr><th>Approval Note</th><td>${String(metadata.approvalNote)}</td></tr>`
      : "",
    metadata.rejectionReason
      ? `<tr><th>Rejection Reason</th><td>${String(metadata.rejectionReason)}</td></tr>`
      : "",
  ].filter(Boolean);

  if (details.length === 0) {
    return "";
  }

  return `<table><tbody>${details.join("")}</tbody></table>`;
}

function resolveDocumentLayout(metadata: DocumentMetadata) {
  const defaults = getDefaultDocumentLayout();
  const candidate = metadata.documentLayout;

  if (!candidate || typeof candidate !== "object") {
    return defaults;
  }

  return {
    ...defaults,
    ...candidate,
  };
}

function buildDocumentBodyContent(
  record: DocumentRecord,
  options?: { includeControlMetadata?: boolean }
) {
  const metadata = getDocumentMetadata(record.tags);
  const includeControlMetadata = options?.includeControlMetadata ?? true;
  const content = record.content || "<p>No content available.</p>";
  if (/<html[\s>]/i.test(content) || /<!doctype/i.test(content)) {
    return content;
  }

  const controlMetadata = includeControlMetadata ? buildControlMetadataHtml(metadata) : "";
  return `${controlMetadata}${extractEmbeddableHtmlContent(content)}`;
}

function buildAcknowledgementSignatureHtml(document: DocumentRow) {
  if (!document.acknowledgedAt && !document.acknowledgementSignatureDataUrl) {
    return "";
  }

  return `<div class="digital-acknowledgement" style="margin-top:28px;padding:16px;border:1px solid #dbe4f0;border-radius:12px;background:#f8fafc;">
    <h3 style="margin:0 0 10px;color:#0f766e;">Digital Acknowledgement</h3>
    <p style="margin:0 0 8px;"><strong>Signed by:</strong> ${document.acknowledgedByName || "-"}</p>
    <p style="margin:0 0 8px;"><strong>Role:</strong> ${document.acknowledgedByRole || "-"}</p>
    <p style="margin:0 0 8px;"><strong>Date:</strong> ${formatDateTime(document.acknowledgedAt)}</p>
    <p style="margin:0 0 12px;"><strong>Method:</strong> ${
      document.acknowledgementMethod || "Digital signature"
    }</p>
    ${
      document.acknowledgementSignatureDataUrl
        ? `<img src="${document.acknowledgementSignatureDataUrl}" alt="Digital signature" style="display:block;max-width:320px;max-height:120px;object-fit:contain;background:#fff;border:1px solid #dbe4f0;border-radius:8px;padding:8px;" />`
        : ""
    }
    ${
      document.acknowledgementNote
        ? `<p style="margin:12px 0 0;color:#475569;"><strong>Note:</strong> ${document.acknowledgementNote}</p>`
        : ""
    }
  </div>`;
}

function getEffectiveGeneratedDocuments(rows: DocumentRow[]) {
  const latestByTemplate = new Map<string, DocumentRow>();
  const untaggedRows: DocumentRow[] = [];

  for (const row of rows) {
    if (row.generatedStatus === "Superseded") continue;
    if (!row.generatedFromTemplateKey) {
      untaggedRows.push(row);
      continue;
    }

    latestByTemplate.set(
      row.generatedFromTemplateKey,
      pickPreferredGeneratedDocument(latestByTemplate.get(row.generatedFromTemplateKey), row)
    );
  }

  return [...Array.from(latestByTemplate.values()), ...untaggedRows].sort((left, right) => {
    const leftCategoryIndex = Math.max(
      PACK_CATEGORY_ORDER.indexOf(
        left.templateCategory as (typeof PACK_CATEGORY_ORDER)[number]
      ),
      0
    );
    const rightCategoryIndex = Math.max(
      PACK_CATEGORY_ORDER.indexOf(
        right.templateCategory as (typeof PACK_CATEGORY_ORDER)[number]
      ),
      0
    );

    if (leftCategoryIndex !== rightCategoryIndex) {
      return leftCategoryIndex - rightCategoryIndex;
    }

    const leftLabel = `${left.generatedFromTemplateTitle || left.title}`.toLowerCase();
    const rightLabel = `${right.generatedFromTemplateTitle || right.title}`.toLowerCase();
    if (leftLabel !== rightLabel) {
      return leftLabel.localeCompare(rightLabel);
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
}

function buildDocumentPreviewHtml(record: DocumentRecord) {
  const metadata = getDocumentMetadata(record.tags);
  const layout = resolveDocumentLayout(metadata);
  const content = buildDocumentBodyContent(record, {
    includeControlMetadata: layout.showControlTable,
  });
  if (/<html[\s>]/i.test(content) || /<!doctype/i.test(content)) {
    return content;
  }

  return buildEditableHtmlDocument({
    title: record.title,
    subtitle: record.description || undefined,
    content,
    design: {
      accentColor: String(metadata.accentColor || "#0f766e"),
      companyName: String(metadata.companyName || "TextPoint"),
      logoUrl: String(metadata.logoUrl || ""),
    },
    layout,
  });
}

function openDocumentPreview(record: DocumentRecord) {
  openHtmlPreview(buildDocumentPreviewHtml(record));
}

function hasDocumentLink(url: string | null | undefined) {
  return Boolean(url && url.trim() && url.trim() !== "about:blank");
}

function normalizeDocumentUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return "about:blank";
  }

  try {
    return new URL(trimmedUrl, window.location.origin).toString();
  } catch {
    throw new Error("Please enter a valid document link.");
  }
}

function openDocumentLink(url: string) {
  if (!hasDocumentLink(url)) {
    toast.error("No external link has been saved for this document.");
    return;
  }

  const openedWindow = window.open(
    normalizeDocumentUrl(url),
    "_blank",
    "noopener,noreferrer"
  );

  if (!openedWindow) {
    toast.error("The browser blocked the document link.");
  }
}

function openHtmlPreview(html: string) {
  const previewBlob = new Blob([html], { type: "text/html" });
  const previewUrl = window.URL.createObjectURL(previewBlob);
  const previewWindow = window.open(previewUrl, "_blank", "noopener,noreferrer");

  if (!previewWindow) {
    window.URL.revokeObjectURL(previewUrl);
    toast.error("Preview window was blocked by the browser.");
    return;
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(previewUrl);
  }, 60_000);
}

function buildInitialValues(
  record: DocumentRecord | null,
  kind: DocumentKind,
  seedValues?: Record<string, unknown> | null
) {
  const metadata = getDocumentMetadata(record?.tags || null);
  const initialContent =
    record?.content || (kind === "template" ? DEFAULT_TEMPLATE_CONTENT : DEFAULT_LIBRARY_CONTENT);

  return {
    title: record?.title ?? "",
    description: record?.description ?? "",
    url: hasDocumentLink(record?.url) ? record?.url ?? "" : "",
    documentType: record?.documentType ?? "Other",
    branchId: record?.branchId ? String(record.branchId) : "",
    accentColor: String(metadata.accentColor || "#0f766e"),
    templateCategory: String(metadata.templateCategory || "General"),
    templateStatus: String(metadata.templateStatus || "Draft"),
    generatedStatus: String(metadata.generatedStatus || "Draft"),
    documentCode: String(metadata.documentCode || metadata.templateKey || "").toUpperCase(),
    issueNumber: String(metadata.issueNumber || "01"),
    effectiveDate: String(metadata.effectiveDate || ""),
    content: initialContent,
    ...(seedValues ?? {}),
  };
}

export default function DocumentsPage() {
  const { user } = useAuth();
  const docxImportInputRef = useRef<HTMLInputElement | null>(null);
  const tokenAssistantTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const validationTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState<DocumentKind>("template");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isPackIssueOpen, setIsPackIssueOpen] = useState(false);
  const [isPackDispatchOpen, setIsPackDispatchOpen] = useState(false);
  const [isPackAcknowledgementOpen, setIsPackAcknowledgementOpen] = useState(false);
  const [isTemplateRevisionOpen, setIsTemplateRevisionOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isTokenAssistantOpen, setIsTokenAssistantOpen] = useState(false);
  const [isValidationWizardOpen, setIsValidationWizardOpen] = useState(false);
  const [isLayoutDesignerOpen, setIsLayoutDesignerOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);
  const [revisionSourceDocument, setRevisionSourceDocument] = useState<DocumentRow | null>(null);
  const [packIssueTarget, setPackIssueTarget] = useState<PackControlRow | null>(null);
  const [packDispatchTarget, setPackDispatchTarget] = useState<PackControlRow | null>(null);
  const [packAcknowledgementTarget, setPackAcknowledgementTarget] =
    useState<PackControlRow | null>(null);
  const [templateRevisionSource, setTemplateRevisionSource] = useState<DocumentRow | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<DocumentRow | null>(null);
  const [tokenAssistantTemplate, setTokenAssistantTemplate] = useState<DocumentRow | null>(null);
  const [tokenAssistantContent, setTokenAssistantContent] = useState("");
  const [tokenAssistantSearch, setTokenAssistantSearch] = useState("");
  const [validationTemplate, setValidationTemplate] = useState<DocumentRow | null>(null);
  const [validationContent, setValidationContent] = useState("");
  const [validationSearch, setValidationSearch] = useState("");
  const [validationMappings, setValidationMappings] = useState<Record<string, string>>({});
  const [layoutTarget, setLayoutTarget] = useState<DocumentRow | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<Required<DocumentLayout>>(getDefaultDocumentLayout());
  const [approvalMode, setApprovalMode] = useState<ApprovalDialogMode>("approve");
  const [editorKind, setEditorKind] = useState<DocumentKind>("library");
  const [editorSeedValues, setEditorSeedValues] = useState<Record<string, unknown> | null>(null);
  const [generateFormValues, setGenerateFormValues] = useState<Record<string, unknown>>({});
  const [packActionId, setPackActionId] = useState<string | null>(null);
  const [isDocxImporting, setIsDocxImporting] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isSignatureDrawingRef = useRef(false);
  const [acknowledgementSignerName, setAcknowledgementSignerName] = useState("");
  const [acknowledgementSignerRole, setAcknowledgementSignerRole] = useState("");
  const [acknowledgementNote, setAcknowledgementNote] = useState("");
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false);
  const [distributionStatusFilter, setDistributionStatusFilter] = useState(
    DISTRIBUTION_ALL_FILTER_VALUE
  );
  const [distributionPackTypeFilter, setDistributionPackTypeFilter] = useState(
    DISTRIBUTION_ALL_FILTER_VALUE
  );
  const [distributionBranchFilter, setDistributionBranchFilter] = useState(
    DISTRIBUTION_ALL_FILTER_VALUE
  );

  const { data: documents = [], isLoading, refetch } = trpc.documents.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: students = [] } = trpc.students.list.useQuery();
  const { data: enrollments = [] } = trpc.enrollments.list.useQuery();
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: schedules = [] } = trpc.courseSchedules.list.useQuery();

  const createMutation = trpc.documents.create.useMutation();
  const updateMutation = trpc.documents.update.useMutation();
  const deleteMutation = trpc.documents.delete.useMutation();
  const loadStarterTemplatesMutation = trpc.documents.loadTrainingStarterTemplates.useMutation();
  const loadSampleScenarioMutation = trpc.documents.loadSampleDocumentScenario.useMutation();
  const generateFromTemplateMutation = trpc.documents.generateFromTemplate.useMutation();
  const generateMissingStudentPackMutation =
    trpc.documents.generateMissingStudentPack.useMutation();
  const generateMissingSchedulePackMutation =
    trpc.documents.generateMissingSchedulePack.useMutation();
  const issueStudentPackMutation = trpc.documents.issueStudentPack.useMutation();
  const issueSchedulePackMutation = trpc.documents.issueSchedulePack.useMutation();
  const dispatchStudentPackMutation = trpc.documents.dispatchStudentPack.useMutation();
  const dispatchSchedulePackMutation = trpc.documents.dispatchSchedulePack.useMutation();
  const acknowledgeStudentPackMutation =
    trpc.documents.acknowledgeStudentPack.useMutation();
  const acknowledgeSchedulePackMutation =
    trpc.documents.acknowledgeSchedulePack.useMutation();
  const reviseTemplateMutation = trpc.documents.reviseTemplate.useMutation();
  const reviseGeneratedMutation = trpc.documents.reviseGenerated.useMutation();
  const submitForReviewMutation = trpc.documents.submitForReview.useMutation();
  const approveDocumentMutation = trpc.documents.approve.useMutation();
  const rejectDocumentMutation = trpc.documents.reject.useMutation();

  const typedBranches = branches as Branch[];
  const typedStudents = students as StudentRecord[];
  const typedEnrollments = enrollments as EnrollmentRecord[];
  const typedCourses = courses as CourseRecord[];
  const typedSchedules = schedules as ScheduleRecord[];
  const isReleaseAuthority = user?.role === "admin" || user?.role === "super_admin";

  const initialiseSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#0f172a";
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    setHasSignatureStroke(false);
  };

  useEffect(() => {
    if (!isPackAcknowledgementOpen) return;
    window.setTimeout(() => initialiseSignatureCanvas(), 0);
  }, [isPackAcknowledgementOpen, packAcknowledgementTarget]);

  const branchOptions = useMemo(
    () =>
      typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    [typedBranches]
  );

  const documentRows = useMemo<DocumentRow[]>(() => {
    const baseRows = (documents as DocumentRecord[]).map((record) => {
      const metadata = getDocumentMetadata(record.tags);
      const kind = (metadata.kind as DocumentKind) || "library";
      return {
        ...record,
        kind,
        branchName:
          typedBranches.find((branch) => branch.id === record.branchId)?.name ||
          String(metadata.branchName || "") ||
          "-",
        templateCategory: String(metadata.templateCategory || "General"),
        templateStatus: (metadata.templateStatus as TemplateStatus) || "Draft",
        generatedStatus: (metadata.generatedStatus as GeneratedStatus) || "Draft",
        sourceType: String(metadata.sourceType || ""),
        version: Number(metadata.version || 1),
        documentCode: String(
          metadata.documentCode ||
            metadata.generatedFromTemplateKey ||
            metadata.templateKey ||
            ""
        ).toUpperCase(),
        issueNumber: String(metadata.issueNumber || ""),
        effectiveDate: String(metadata.effectiveDate || ""),
        templateKey: String(metadata.templateKey || ""),
        generatedFromTemplateKey: String(metadata.generatedFromTemplateKey || ""),
        generatedFromTemplateTitle: String(metadata.generatedFromTemplateTitle || ""),
        studentName: String(metadata.studentName || ""),
        courseLabel: String(metadata.courseLabel || ""),
        placeholderCount: Array.isArray(metadata.placeholderKeys)
          ? metadata.placeholderKeys.length
          : extractPlaceholders(record.content || "").length,
        usageCount: 0,
        enrollmentId: typeof metadata.enrollmentId === "number" ? metadata.enrollmentId : null,
        scheduleId: typeof metadata.scheduleId === "number" ? metadata.scheduleId : null,
        revisedFromDocumentId:
          typeof metadata.revisedFromDocumentId === "number"
            ? metadata.revisedFromDocumentId
            : null,
        supersededByDocumentId:
          typeof metadata.supersededByDocumentId === "number"
            ? metadata.supersededByDocumentId
            : null,
        revisionLabel: metadata.revisedFromDocumentId
          ? `Revision of #${metadata.revisedFromDocumentId}`
          : "Original",
        revisionReason: String(metadata.revisionReason || ""),
        issuedAt: String(metadata.issuedAt || ""),
        issuedByName: String(metadata.issuedByName || ""),
        issueNote: String(metadata.issueNote || ""),
        packReleaseReference: String(metadata.packReleaseReference || ""),
        distributedAt: String(metadata.distributedAt || ""),
        distributedByName: String(metadata.distributedByName || ""),
        distributedToName: String(metadata.distributedToName || ""),
        distributedToEmail: String(metadata.distributedToEmail || ""),
        distributionMethod: String(metadata.distributionMethod || ""),
        signatureDueDate: String(metadata.signatureDueDate || ""),
        distributionNote: String(metadata.distributionNote || ""),
        acknowledgedAt: String(metadata.acknowledgedAt || ""),
        acknowledgedByName: String(metadata.acknowledgedByName || ""),
        acknowledgedByRole: String(metadata.acknowledgedByRole || ""),
        acknowledgementMethod: String(metadata.acknowledgementMethod || ""),
        acknowledgementNote: String(metadata.acknowledgementNote || ""),
        acknowledgementSignatureDataUrl: String(metadata.acknowledgementSignatureDataUrl || ""),
        acknowledgementCapturedByName: String(metadata.acknowledgementCapturedByName || ""),
        approvalStatus: getDocumentApprovalStatus(metadata, kind),
        submittedForReviewAt: String(metadata.submittedForReviewAt || ""),
        submittedForReviewByName: String(metadata.submittedForReviewByName || ""),
        approvedAt: String(metadata.approvedAt || ""),
        approvedByName: String(metadata.approvedByName || ""),
        rejectedAt: String(metadata.rejectedAt || ""),
        rejectedByName: String(metadata.rejectedByName || ""),
        approvalNote: String(metadata.approvalNote || ""),
        rejectionReason: String(metadata.rejectionReason || ""),
        releaseAuthority: String(metadata.releaseAuthority || ""),
        releaseAuthorityRole: String(metadata.releaseAuthorityRole || ""),
      };
    });

    return baseRows.map((row) => ({
      ...row,
      usageCount: baseRows.filter((candidate) => {
        const metadata = getDocumentMetadata(candidate.tags);
        return (
          candidate.kind === "generated" &&
          Number(metadata.generatedFromTemplateId || 0) === row.id
        );
      }).length,
    }));
  }, [branches, documents, typedBranches]);

  const templateRows = useMemo(
    () => documentRows.filter((row) => row.kind === "template"),
    [documentRows]
  );
  const generatedRows = useMemo(
    () => documentRows.filter((row) => row.kind === "generated"),
    [documentRows]
  );
  const libraryRows = useMemo(
    () => documentRows.filter((row) => row.kind === "library"),
    [documentRows]
  );

  const templateOptions = useMemo(
    () =>
      templateRows
        .filter((row) => row.templateStatus !== "Archived")
        .map((row) => ({
          value: String(row.id),
          label: `${row.title} | ${row.templateCategory} | v${row.version}`,
        })),
      [templateRows]
  );

  const groupedPlaceholderReference = useMemo(() => {
    const normalizedSearch = tokenAssistantSearch.trim().toLowerCase();
    const filteredPlaceholders = DOCUMENT_PLACEHOLDERS.filter((placeholder) => {
      if (!normalizedSearch) return true;
      return (
        placeholder.key.toLowerCase().includes(normalizedSearch) ||
        placeholder.description.toLowerCase().includes(normalizedSearch) ||
        placeholder.category.toLowerCase().includes(normalizedSearch)
      );
    });

    const grouped = new Map<string, PlaceholderDefinition[]>();
    for (const placeholder of filteredPlaceholders) {
      const items = grouped.get(placeholder.category) || [];
      items.push(placeholder);
      grouped.set(placeholder.category, items);
    }

    return Array.from(grouped.entries());
  }, [tokenAssistantSearch]);

  const placeholderReferenceGroups = useMemo(() => {
    return getDocumentPlaceholderCategories();
  }, []);

  const templateValidationById = useMemo(() => {
    return new Map(
      templateRows.map((row) => [
        row.id,
        validateTemplatePlaceholders({
          content: row.content || "",
          documentType: row.documentType || "",
          templateCategory: row.templateCategory,
        }),
      ])
    );
  }, [templateRows]);

  const validationWizardResult = useMemo(
    () =>
      validateTemplatePlaceholders({
        content: validationContent,
        documentType: validationTemplate?.documentType || "",
        templateCategory: validationTemplate?.templateCategory || "General",
      }),
    [validationContent, validationTemplate]
  );

  const validationProfile = useMemo(
    () =>
      getTemplatePlaceholderProfile(
        validationTemplate?.documentType || "",
        validationTemplate?.templateCategory || "General"
      ),
    [validationTemplate]
  );

  const filteredPlaceholderOptions = useMemo(() => {
    const normalizedSearch = validationSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return DOCUMENT_PLACEHOLDERS;
    }

    return DOCUMENT_PLACEHOLDERS.filter((placeholder) => {
      return (
        placeholder.key.toLowerCase().includes(normalizedSearch) ||
        placeholder.description.toLowerCase().includes(normalizedSearch) ||
        placeholder.category.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [validationSearch]);

  const templateControlRows = useMemo<TemplateControlRow[]>(() => {
    const groupedRows = new Map<string, DocumentRow[]>();

    for (const row of templateRows) {
      const familyKey = row.templateKey || slugifyValue(row.title);
      const existingRows = groupedRows.get(familyKey) || [];
      existingRows.push(row);
      groupedRows.set(familyKey, existingRows);
    }

    return Array.from(groupedRows.entries())
      .map(([familyKey, rows]) => {
        const currentTemplate =
          rows.reduce<DocumentRow | undefined>(
            (preferred, row) => pickPreferredTemplateIssue(preferred, row),
            undefined
          ) || rows[0];
        const issueHistory = [...rows]
          .sort((left, right) => {
            const leftPriority = getTemplateStatusPriority(left.templateStatus);
            const rightPriority = getTemplateStatusPriority(right.templateStatus);
            if (leftPriority !== rightPriority) {
              return rightPriority - leftPriority;
            }
            if (left.version !== right.version) {
              return right.version - left.version;
            }
            const leftTime = new Date(left.createdAt).getTime();
            const rightTime = new Date(right.createdAt).getTime();
            return rightTime - leftTime;
          })
          .map((row) => ({
            id: row.id,
            issueNumber: row.issueNumber || `v${row.version}`,
            status: row.templateStatus,
            version: row.version,
            effectiveDate: row.effectiveDate,
          }));

        return {
          id: familyKey,
          title: currentTemplate.title,
          documentCode: currentTemplate.documentCode || familyKey.toUpperCase(),
          category: currentTemplate.templateCategory,
          currentIssueNumber: currentTemplate.issueNumber || `v${currentTemplate.version}`,
          currentEffectiveDate: currentTemplate.effectiveDate,
          currentStatus: currentTemplate.templateStatus,
          issueCount: rows.length,
          archivedCount: rows.filter((row) => row.templateStatus === "Archived").length,
          draftCount: rows.filter((row) => row.templateStatus === "Draft").length,
          usageCount: rows.reduce((total, row) => total + row.usageCount, 0),
          currentTemplate,
          issueHistory,
        };
      })
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [templateRows]);

  const activeLearnerTemplates = useMemo(
    () =>
      templateRows.filter(
        (row) =>
          row.templateStatus === "Active" &&
          LEARNER_PACK_CATEGORIES.includes(
            row.templateCategory as (typeof LEARNER_PACK_CATEGORIES)[number]
          )
      ),
    [templateRows]
  );

  const activeLecturerTemplates = useMemo(
    () =>
      templateRows.filter(
        (row) =>
          row.templateStatus === "Active" &&
          LECTURER_PACK_CATEGORIES.includes(
            row.templateCategory as (typeof LECTURER_PACK_CATEGORIES)[number]
          )
      ),
    [templateRows]
  );

  const studentOptions = useMemo(
    () =>
      typedStudents.map((student) => ({
        value: String(student.id),
        label: `${student.firstName} ${student.lastName} (${student.studentNumber || student.id})`,
      })),
    [typedStudents]
  );

  const selectedGenerateStudentId = generateFormValues.studentId
    ? Number(generateFormValues.studentId)
    : null;

  const enrollmentOptions = useMemo(
    () =>
      typedEnrollments
        .filter((enrollment) =>
          selectedGenerateStudentId ? enrollment.studentId === selectedGenerateStudentId : false
        )
        .map((enrollment) => {
          const schedule = typedSchedules.find((item) => item.id === enrollment.courseScheduleId);
          const course = typedCourses.find((item) => item.id === schedule?.courseId);
          const branch = typedBranches.find((item) => item.id === schedule?.branchId);
          return {
            value: String(enrollment.id),
            label: `${buildCourseLabel(course)} | ${branch?.name || "No branch"} | ${formatDateRange(
              schedule?.startDate,
              schedule?.endDate
            )} | ${enrollment.status}`,
          };
        }),
    [selectedGenerateStudentId, typedBranches, typedCourses, typedEnrollments, typedSchedules]
  );

  const summary = useMemo(
    () => ({
      templates: templateRows.length,
      activeTemplates: templateRows.filter((row) => row.templateStatus === "Active").length,
      generated: generatedRows.length,
      issued: generatedRows.filter((row) => row.generatedStatus === "Issued").length,
      drafts: generatedRows.filter((row) => row.generatedStatus === "Draft").length,
      library: libraryRows.length,
    }),
    [generatedRows, libraryRows.length, templateRows]
  );

  const controlledRows = useMemo(
    () => [...templateRows, ...generatedRows],
    [generatedRows, templateRows]
  );

  const reviewQueueSummary = useMemo(() => {
    const draftReady = controlledRows.filter((row) => {
      if (row.approvalStatus !== "Draft" && row.approvalStatus !== "Rejected") {
        return false;
      }

      if (row.kind !== "template") return true;
      return templateValidationById.get(row.id)?.status !== "Needs Attention";
    }).length;

    const blockedTemplates = templateRows.filter((row) => {
      if (row.approvalStatus !== "Draft" && row.approvalStatus !== "Rejected") {
        return false;
      }
      return templateValidationById.get(row.id)?.status === "Needs Attention";
    }).length;

    return {
      inReview: controlledRows.filter((row) => row.approvalStatus === "In Review").length,
      draftReady,
      blockedTemplates,
      rejected: controlledRows.filter((row) => row.approvalStatus === "Rejected").length,
    };
  }, [controlledRows, templateRows, templateValidationById]);

  const approvalQueueRows = useMemo(
    () =>
      controlledRows
        .filter((row) => row.approvalStatus === "In Review")
        .sort(
          (left, right) =>
            new Date(right.submittedForReviewAt || right.createdAt).getTime() -
            new Date(left.submittedForReviewAt || left.createdAt).getTime()
        ),
    [controlledRows]
  );

  const reviewReadyRows = useMemo(
    () =>
      controlledRows
        .filter((row) => {
          if (row.approvalStatus !== "Draft" && row.approvalStatus !== "Rejected") {
            return false;
          }

          if (row.kind !== "template") return true;
          return templateValidationById.get(row.id)?.status !== "Needs Attention";
        })
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        ),
    [controlledRows, templateValidationById]
  );

  const blockedTemplateRows = useMemo(
    () =>
      templateRows
        .filter((row) => {
          if (row.approvalStatus !== "Draft" && row.approvalStatus !== "Rejected") {
            return false;
          }
          return templateValidationById.get(row.id)?.status === "Needs Attention";
        })
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        ),
    [templateRows, templateValidationById]
  );

  const lifecycleRegisterRows = useMemo<DocumentLifecycleRegisterRow[]>(() => {
    return controlledRows
      .map((row) => {
        const validationStatus =
          row.kind === "template"
            ? templateValidationById.get(row.id)?.status || "Ready"
            : "Ready";
        const lifecycleStage: DocumentLifecycleStage =
          row.generatedStatus === "Superseded"
            ? "Superseded"
            : row.generatedStatus === "Corrected"
            ? "Corrected"
            : row.acknowledgedAt
            ? "Acknowledged"
            : row.generatedStatus === "Issued"
            ? "Issued"
            : row.templateStatus === "Archived"
            ? "Archived"
            : row.approvalStatus === "Rejected"
            ? "Rejected"
            : row.kind === "template" && validationStatus === "Needs Attention"
            ? "Blocked"
            : row.approvalStatus === "In Review"
            ? "In Review"
            : row.approvalStatus === "Approved"
            ? "Approved"
            : "Draft";

        const eventCandidates = [
          {
            label: row.generatedStatus === "Corrected" ? "Corrected revision created" : "Created",
            date: String(row.createdAt),
            actor: "",
          },
          row.submittedForReviewAt
            ? {
                label: "Submitted for review",
                date: row.submittedForReviewAt,
                actor: row.submittedForReviewByName,
              }
            : null,
          row.approvedAt
            ? {
                label: "Approved",
                date: row.approvedAt,
                actor: row.approvedByName || row.releaseAuthority,
              }
            : null,
          row.rejectedAt
            ? {
                label: "Rejected",
                date: row.rejectedAt,
                actor: row.rejectedByName,
              }
            : null,
          row.issuedAt
            ? {
                label: "Issued / released",
                date: row.issuedAt,
                actor: row.issuedByName || row.releaseAuthority,
              }
            : null,
          row.distributedAt
            ? {
                label: "Distributed for signature",
                date: row.distributedAt,
                actor: row.distributedByName,
              }
            : null,
          row.acknowledgedAt
            ? {
                label: "Digitally acknowledged",
                date: row.acknowledgedAt,
                actor: row.acknowledgedByName,
              }
            : null,
        ].filter(
          (
            candidate
          ): candidate is { label: string; date: string; actor: string } =>
            Boolean(candidate?.date)
        );

        eventCandidates.sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
        );
        const latestEvent = eventCandidates[0] || {
          label: "Created",
          date: String(row.createdAt),
          actor: "",
        };
        const contextLabel = row.studentName
          ? [row.studentName, row.courseLabel].filter(Boolean).join(" | ")
          : row.courseLabel ||
            row.generatedFromTemplateTitle ||
            row.templateCategory ||
            row.documentType ||
            "Controlled document";

        return {
          id: row.id,
          source: row,
          title: row.title,
          kindLabel:
            row.kind === "template" ? ("Template" as const) : ("Generated" as const),
          documentCode: row.documentCode || "No code",
          branchName: row.branchName,
          contextLabel,
          lifecycleStage,
          approvalStatus: row.approvalStatus,
          validationStatus,
          latestEventLabel: latestEvent.label,
          latestEventDate: latestEvent.date,
          latestEventDateLabel: formatDateTime(latestEvent.date),
          latestEventActor: latestEvent.actor || "-",
          releaseReference: row.packReleaseReference || "-",
          revisionLabel: row.revisionLabel,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.latestEventDate).getTime() - new Date(left.latestEventDate).getTime()
      );
  }, [controlledRows, templateValidationById]);

  const lifecycleSummary = useMemo(
    () => ({
      drafts: lifecycleRegisterRows.filter((row) => row.lifecycleStage === "Draft").length,
      blocked: lifecycleRegisterRows.filter((row) => row.lifecycleStage === "Blocked").length,
      inReview: lifecycleRegisterRows.filter((row) => row.lifecycleStage === "In Review").length,
      approved: lifecycleRegisterRows.filter(
        (row) =>
          row.lifecycleStage === "Approved" ||
          row.lifecycleStage === "Issued" ||
          row.lifecycleStage === "Acknowledged"
      ).length,
      acknowledged: lifecycleRegisterRows.filter(
        (row) => row.lifecycleStage === "Acknowledged"
      ).length,
      revisions: lifecycleRegisterRows.filter(
        (row) =>
          row.lifecycleStage === "Corrected" || row.lifecycleStage === "Superseded"
      ).length,
      rejected: lifecycleRegisterRows.filter((row) => row.lifecycleStage === "Rejected").length,
    }),
    [lifecycleRegisterRows]
  );

  const lifecycleTimeline = useMemo<DocumentLifecycleEvent[]>(() => {
    const supersededEventsBySourceId = new Map<
      number,
      { date: string; title: string; reason: string }
    >();

    for (const row of controlledRows) {
      if (!row.revisedFromDocumentId) continue;
      const candidate = {
        date: String(row.createdAt),
        title: row.title,
        reason: row.revisionReason,
      };
      const existing = supersededEventsBySourceId.get(row.revisedFromDocumentId);
      if (!existing || new Date(candidate.date).getTime() > new Date(existing.date).getTime()) {
        supersededEventsBySourceId.set(row.revisedFromDocumentId, candidate);
      }
    }

    const events: DocumentLifecycleEvent[] = [];
    const pushEvent = (
      row: DocumentRow,
      eventType: string,
      eventDate: string | Date | null | undefined,
      actorName?: string,
      detail?: string
    ) => {
      if (!eventDate) return;
      const parsed = new Date(eventDate);
      if (Number.isNaN(parsed.getTime())) return;

      events.push({
        id: `${row.id}-${eventType}-${parsed.toISOString()}`,
        documentId: row.id,
        title: row.title,
        kindLabel:
          row.kind === "template" ? ("Template" as const) : ("Generated" as const),
        eventType,
        eventDate: parsed.toISOString(),
        eventDateLabel: formatDateTime(parsed),
        actorName: actorName || "-",
        detail: detail || "",
        branchName: row.branchName,
        contextLabel: row.studentName
          ? [row.studentName, row.courseLabel].filter(Boolean).join(" | ")
          : row.courseLabel ||
            row.generatedFromTemplateTitle ||
            row.templateCategory ||
            row.documentType ||
            "Controlled document",
      });
    };

    for (const row of controlledRows) {
      const validationStatus =
        row.kind === "template"
          ? templateValidationById.get(row.id)?.status || "Ready"
          : "Ready";
      pushEvent(
        row,
        row.generatedStatus === "Corrected" ? "Corrected revision created" : "Created",
        row.createdAt,
        "",
        row.revisionReason
      );
      if (row.kind === "template" && validationStatus === "Needs Attention") {
        pushEvent(
          row,
          "Validation blocked",
          row.createdAt,
          "",
          "Unknown or missing required placeholders still need attention."
        );
      }
      pushEvent(row, "Submitted for review", row.submittedForReviewAt, row.submittedForReviewByName);
      pushEvent(
        row,
        "Approved",
        row.approvedAt,
        row.approvedByName || row.releaseAuthority,
        row.approvalNote
      );
      pushEvent(
        row,
        "Rejected",
        row.rejectedAt,
        row.rejectedByName,
        row.rejectionReason
      );
      pushEvent(
        row,
        "Issued / released",
        row.issuedAt,
        row.issuedByName || row.releaseAuthority,
        row.issueNote || row.packReleaseReference
      );
      pushEvent(
        row,
        "Distributed for signature",
        row.distributedAt,
        row.distributedByName,
        [
          row.distributedToName ? `Recipient: ${row.distributedToName}` : "",
          row.distributedToEmail ? `Email: ${row.distributedToEmail}` : "",
          row.distributionMethod ? `Method: ${row.distributionMethod}` : "",
          row.signatureDueDate ? `Due: ${formatDate(row.signatureDueDate)}` : "",
          row.distributionNote ? `Note: ${row.distributionNote}` : "",
        ]
          .filter(Boolean)
          .join(" | ")
      );
      pushEvent(
        row,
        "Digitally acknowledged",
        row.acknowledgedAt,
        row.acknowledgedByName,
        [
          row.acknowledgedByRole ? `Role: ${row.acknowledgedByRole}` : "",
          row.acknowledgementMethod ? `Method: ${row.acknowledgementMethod}` : "",
          row.acknowledgementNote ? `Note: ${row.acknowledgementNote}` : "",
        ]
          .filter(Boolean)
          .join(" | ")
      );

      const supersededEvent = supersededEventsBySourceId.get(row.id);
      if (supersededEvent) {
        pushEvent(
          row,
          "Superseded by newer revision",
          supersededEvent.date,
          "",
          `${supersededEvent.title}${supersededEvent.reason ? ` | ${supersededEvent.reason}` : ""}`
        );
      }
    }

    return events
      .sort(
        (left, right) =>
          new Date(right.eventDate).getTime() - new Date(left.eventDate).getTime()
      )
      .slice(0, 14);
  }, [controlledRows, templateValidationById]);

  const learnerPackRows = useMemo<PackControlRow[]>(() => {
    const requiredTemplates = activeLearnerTemplates.map((row) => ({
      key: row.templateKey,
      title: row.title,
    }));
    return typedEnrollments
      .map((enrollment) => {
        const student = typedStudents.find((item) => item.id === enrollment.studentId);
        const schedule = typedSchedules.find(
          (item) => item.id === enrollment.courseScheduleId
        );
        const course = typedCourses.find((item) => item.id === schedule?.courseId);
        const branch = typedBranches.find((item) => item.id === schedule?.branchId);
        const rows = generatedRows.filter(
          (row) =>
            row.sourceType === "student_enrollment" && row.enrollmentId === enrollment.id
        );
        const latestByTemplate = new Map<string, DocumentRow>();

        for (const row of rows) {
          if (!row.generatedFromTemplateKey) continue;
          latestByTemplate.set(
            row.generatedFromTemplateKey,
            pickPreferredGeneratedDocument(
              latestByTemplate.get(row.generatedFromTemplateKey),
              row
            )
          );
        }

        const effectiveDocuments = Array.from(latestByTemplate.values()).filter(
          (row) => row.generatedStatus !== "Superseded"
        );
        const effectiveTemplateKeys = new Set(
          effectiveDocuments
            .map((row) => row.generatedFromTemplateKey)
            .filter((value) => Boolean(value))
        );
        const missingTemplates = requiredTemplates
          .filter((template) => !effectiveTemplateKeys.has(template.key))
          .map((template) => template.title);
        const latestCreatedAt = effectiveDocuments.reduce<string | Date | null>(
          (latest, row) => {
            if (!latest) return row.createdAt;
            return new Date(row.createdAt).getTime() > new Date(latest).getTime()
              ? row.createdAt
              : latest;
          },
          null
        );
        const status: PackProgressStatus =
          effectiveDocuments.length === 0
            ? "No Documents"
            : missingTemplates.length === 0
            ? "Complete"
            : "In Progress";
        const unapprovedCount = effectiveDocuments.filter(
          (row) => row.approvalStatus !== "Approved"
        ).length;
        const distributedDocuments = effectiveDocuments.filter((row) => row.distributedAt);
        const distributionSource = [...distributedDocuments].sort(
          (left, right) =>
            new Date(right.distributedAt).getTime() - new Date(left.distributedAt).getTime()
        )[0];
        const acknowledgedDocuments = effectiveDocuments.filter(
          (row) => row.acknowledgedAt && row.acknowledgementSignatureDataUrl
        );
        const acknowledgementSource = [...acknowledgedDocuments].sort(
          (left, right) =>
            new Date(right.acknowledgedAt).getTime() -
            new Date(left.acknowledgedAt).getTime()
        )[0];

        return {
          id: `learner-${enrollment.id}`,
          packType: "Learner Pack" as const,
          contextLabel: `${student ? `${student.firstName} ${student.lastName}` : "Learner"} | ${buildCourseLabel(course)} | ${formatDateRange(schedule?.startDate, schedule?.endDate)}`,
          branchName: branch?.name || rows[0]?.branchName || "-",
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          scheduleId: schedule?.id ?? null,
          completedCount: effectiveTemplateKeys.size,
          requiredCount: requiredTemplates.length,
          missingTemplates,
          issuedCount: effectiveDocuments.filter((row) => row.generatedStatus === "Issued").length,
          draftCount: effectiveDocuments.filter((row) => row.generatedStatus === "Draft").length,
          correctedCount: effectiveDocuments.filter((row) => row.generatedStatus === "Corrected").length,
          unapprovedCount,
          distributedCount: distributedDocuments.length,
          isFullyDistributed:
            effectiveDocuments.length > 0 && effectiveDocuments.every((row) => row.distributedAt),
          distributedAt: distributionSource?.distributedAt || "",
          distributedToName: distributionSource?.distributedToName || "",
          distributedToEmail: distributionSource?.distributedToEmail || "",
          distributionMethod: distributionSource?.distributionMethod || "",
          signatureDueDate: distributionSource?.signatureDueDate || "",
          isSignatureOverdue:
            Boolean(distributionSource?.signatureDueDate) &&
            !acknowledgedDocuments.length &&
            new Date(distributionSource.signatureDueDate).getTime() <
              new Date(new Date().toDateString()).getTime(),
          acknowledgedCount: acknowledgedDocuments.length,
          isFullyAcknowledged:
            effectiveDocuments.length > 0 &&
            effectiveDocuments.every(
              (row) => row.acknowledgedAt && row.acknowledgementSignatureDataUrl
            ),
          acknowledgedAt: acknowledgementSource?.acknowledgedAt || "",
          acknowledgedByName: acknowledgementSource?.acknowledgedByName || "",
          acknowledgementMethod: acknowledgementSource?.acknowledgementMethod || "",
          isFullyIssued:
            effectiveDocuments.length > 0 &&
            effectiveDocuments.every((row) => row.generatedStatus === "Issued"),
          latestCreatedAt,
          status,
        };
      })
      .sort((left, right) => {
        const leftTime = left.latestCreatedAt ? new Date(left.latestCreatedAt).getTime() : 0;
        const rightTime = right.latestCreatedAt ? new Date(right.latestCreatedAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [activeLearnerTemplates, generatedRows, typedBranches, typedCourses, typedEnrollments, typedSchedules, typedStudents]);

  const lecturerPackRows = useMemo<PackControlRow[]>(() => {
    const requiredTemplates = activeLecturerTemplates.map((row) => ({
      key: row.templateKey,
      title: row.title,
    }));
    return typedSchedules
      .map((schedule) => {
        const course = typedCourses.find((item) => item.id === schedule.courseId);
        const branch = typedBranches.find((item) => item.id === schedule.branchId);
        const rows = generatedRows.filter(
          (row) => row.sourceType === "schedule" && row.scheduleId === schedule.id
        );
        const latestByTemplate = new Map<string, DocumentRow>();

        for (const row of rows) {
          if (!row.generatedFromTemplateKey) continue;
          latestByTemplate.set(
            row.generatedFromTemplateKey,
            pickPreferredGeneratedDocument(
              latestByTemplate.get(row.generatedFromTemplateKey),
              row
            )
          );
        }

        const effectiveDocuments = Array.from(latestByTemplate.values()).filter(
          (row) => row.generatedStatus !== "Superseded"
        );
        const effectiveTemplateKeys = new Set(
          effectiveDocuments
            .map((row) => row.generatedFromTemplateKey)
            .filter((value) => Boolean(value))
        );
        const missingTemplates = requiredTemplates
          .filter((template) => !effectiveTemplateKeys.has(template.key))
          .map((template) => template.title);
        const latestCreatedAt = effectiveDocuments.reduce<string | Date | null>(
          (latest, row) => {
            if (!latest) return row.createdAt;
            return new Date(row.createdAt).getTime() > new Date(latest).getTime()
              ? row.createdAt
              : latest;
          },
          null
        );
        const status: PackProgressStatus =
          effectiveDocuments.length === 0
            ? "No Documents"
            : missingTemplates.length === 0
            ? "Complete"
            : "In Progress";
        const unapprovedCount = effectiveDocuments.filter(
          (row) => row.approvalStatus !== "Approved"
        ).length;
        const distributedDocuments = effectiveDocuments.filter((row) => row.distributedAt);
        const distributionSource = [...distributedDocuments].sort(
          (left, right) =>
            new Date(right.distributedAt).getTime() - new Date(left.distributedAt).getTime()
        )[0];
        const acknowledgedDocuments = effectiveDocuments.filter(
          (row) => row.acknowledgedAt && row.acknowledgementSignatureDataUrl
        );
        const acknowledgementSource = [...acknowledgedDocuments].sort(
          (left, right) =>
            new Date(right.acknowledgedAt).getTime() -
            new Date(left.acknowledgedAt).getTime()
        )[0];

        return {
          id: `lecturer-${schedule.id}`,
          packType: "Lecturer Pack" as const,
          contextLabel: `${buildCourseLabel(course)} | ${formatDateRange(schedule.startDate, schedule.endDate)}`,
          branchName: branch?.name || rows[0]?.branchName || "-",
          studentId: null,
          enrollmentId: null,
          scheduleId: schedule.id,
          completedCount: effectiveTemplateKeys.size,
          requiredCount: requiredTemplates.length,
          missingTemplates,
          issuedCount: effectiveDocuments.filter((row) => row.generatedStatus === "Issued").length,
          draftCount: effectiveDocuments.filter((row) => row.generatedStatus === "Draft").length,
          correctedCount: effectiveDocuments.filter((row) => row.generatedStatus === "Corrected").length,
          unapprovedCount,
          distributedCount: distributedDocuments.length,
          isFullyDistributed:
            effectiveDocuments.length > 0 && effectiveDocuments.every((row) => row.distributedAt),
          distributedAt: distributionSource?.distributedAt || "",
          distributedToName: distributionSource?.distributedToName || "",
          distributedToEmail: distributionSource?.distributedToEmail || "",
          distributionMethod: distributionSource?.distributionMethod || "",
          signatureDueDate: distributionSource?.signatureDueDate || "",
          isSignatureOverdue:
            Boolean(distributionSource?.signatureDueDate) &&
            !acknowledgedDocuments.length &&
            new Date(distributionSource.signatureDueDate).getTime() <
              new Date(new Date().toDateString()).getTime(),
          acknowledgedCount: acknowledgedDocuments.length,
          isFullyAcknowledged:
            effectiveDocuments.length > 0 &&
            effectiveDocuments.every(
              (row) => row.acknowledgedAt && row.acknowledgementSignatureDataUrl
            ),
          acknowledgedAt: acknowledgementSource?.acknowledgedAt || "",
          acknowledgedByName: acknowledgementSource?.acknowledgedByName || "",
          acknowledgementMethod: acknowledgementSource?.acknowledgementMethod || "",
          isFullyIssued:
            effectiveDocuments.length > 0 &&
            effectiveDocuments.every((row) => row.generatedStatus === "Issued"),
          latestCreatedAt,
          status,
        };
      })
      .sort((left, right) => {
        const leftTime = left.latestCreatedAt ? new Date(left.latestCreatedAt).getTime() : 0;
        const rightTime = right.latestCreatedAt ? new Date(right.latestCreatedAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [activeLecturerTemplates, generatedRows, typedBranches, typedCourses, typedSchedules]);

  const packSummary = useMemo(
    () => ({
      learnerComplete: learnerPackRows.filter((row) => row.status === "Complete").length,
      lecturerComplete: lecturerPackRows.filter((row) => row.status === "Complete").length,
      incomplete:
        learnerPackRows.filter((row) => row.status !== "Complete").length +
        lecturerPackRows.filter((row) => row.status !== "Complete").length,
    }),
    [learnerPackRows, lecturerPackRows]
  );

  const learnerPackDocumentsByEnrollment = useMemo(() => {
    const groupedRows = new Map<number, DocumentRow[]>();

    for (const row of generatedRows) {
      if (row.sourceType !== "student_enrollment" || row.enrollmentId === null) continue;
      const existingRows = groupedRows.get(row.enrollmentId) || [];
      existingRows.push(row);
      groupedRows.set(row.enrollmentId, existingRows);
    }

    return new Map(
      Array.from(groupedRows.entries()).map(([enrollmentId, rows]) => [
        enrollmentId,
        getEffectiveGeneratedDocuments(rows),
      ])
    );
  }, [generatedRows]);

  const lecturerPackDocumentsBySchedule = useMemo(() => {
    const groupedRows = new Map<number, DocumentRow[]>();

    for (const row of generatedRows) {
      if (row.sourceType !== "schedule" || row.scheduleId === null) continue;
      const existingRows = groupedRows.get(row.scheduleId) || [];
      existingRows.push(row);
      groupedRows.set(row.scheduleId, existingRows);
    }

    return new Map(
      Array.from(groupedRows.entries()).map(([scheduleId, rows]) => [
        scheduleId,
        getEffectiveGeneratedDocuments(rows),
      ])
    );
  }, [generatedRows]);

  const distributionRegisterRows = useMemo<PackDistributionRegisterRow[]>(() => {
    const buildRow = (row: PackControlRow, documents: DocumentRow[]) => {
      const issuedDocuments = documents.filter((document) => document.issuedAt);
      const acknowledgedDocuments = documents.filter((document) => document.acknowledgedAt);
      const issueSource = [...issuedDocuments].sort(
        (left, right) =>
          new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime()
      )[0];
      const acknowledgementSource = [...acknowledgedDocuments].sort(
        (left, right) =>
          new Date(right.acknowledgedAt).getTime() -
          new Date(left.acknowledgedAt).getTime()
      )[0];
      const distributionStatus: PackDistributionStatus =
        row.status !== "Complete"
          ? "Incomplete"
          : !row.isFullyIssued
          ? "Ready To Issue"
          : row.isFullyAcknowledged
          ? "Acknowledged"
          : row.isSignatureOverdue
          ? "Signature Overdue"
          : row.isFullyDistributed
          ? "Sent - Awaiting Signature"
          : "Issued - Not Sent";
      const latestActivityDate =
        acknowledgementSource?.acknowledgedAt ||
        row.distributedAt ||
        issueSource?.issuedAt ||
        String(row.latestCreatedAt || "");

      return {
        id: `distribution-${row.id}`,
        source: row,
        documents,
        packType: row.packType,
        contextLabel: row.contextLabel,
        branchName: row.branchName,
        distributionStatus,
        requiredCount: row.requiredCount,
        issuedCount: row.issuedCount,
        acknowledgedCount: row.acknowledgedCount,
        outstandingSignatureCount: Math.max(row.issuedCount - row.acknowledgedCount, 0),
        releaseReference: issueSource?.packReleaseReference || "-",
        issuedAt: issueSource?.issuedAt || "",
        issuedAtLabel: issueSource?.issuedAt ? formatDate(issueSource.issuedAt) : "-",
        issuedByName: issueSource?.issuedByName || "-",
        distributedAt: row.distributedAt,
        distributedAtLabel: row.distributedAt ? formatDate(row.distributedAt) : "-",
        distributedToName: row.distributedToName || "-",
        distributedToEmail: row.distributedToEmail || "-",
        distributionMethod: row.distributionMethod || "-",
        signatureDueDate: row.signatureDueDate || "",
        signatureDueDateLabel: row.signatureDueDate ? formatDate(row.signatureDueDate) : "-",
        acknowledgedAt: acknowledgementSource?.acknowledgedAt || "",
        acknowledgedAtLabel: acknowledgementSource?.acknowledgedAt
          ? formatDate(acknowledgementSource.acknowledgedAt)
          : "-",
        acknowledgedByName: acknowledgementSource?.acknowledgedByName || "-",
        acknowledgementMethod: acknowledgementSource?.acknowledgementMethod || "-",
        latestActivityDate,
        latestActivityDateLabel: latestActivityDate ? formatDate(latestActivityDate) : "-",
      };
    };

    const learnerRows = learnerPackRows.map((row) =>
      buildRow(
        row,
        (row.enrollmentId && learnerPackDocumentsByEnrollment.get(row.enrollmentId)) || []
      )
    );
    const lecturerRows = lecturerPackRows.map((row) =>
      buildRow(
        row,
        (row.scheduleId && lecturerPackDocumentsBySchedule.get(row.scheduleId)) || []
      )
    );

    return [...learnerRows, ...lecturerRows]
      .filter((row) => row.requiredCount > 0 || row.documents.length > 0)
      .sort((left, right) => {
        const leftTime = left.latestActivityDate
          ? new Date(left.latestActivityDate).getTime()
          : 0;
        const rightTime = right.latestActivityDate
          ? new Date(right.latestActivityDate).getTime()
          : 0;
        return rightTime - leftTime;
      });
  }, [
    learnerPackRows,
    lecturerPackRows,
    learnerPackDocumentsByEnrollment,
    lecturerPackDocumentsBySchedule,
  ]);

  const distributionSummary = useMemo(
    () => ({
      total: distributionRegisterRows.length,
      readyToIssue: distributionRegisterRows.filter(
        (row) => row.distributionStatus === "Ready To Issue"
      ).length,
      awaitingSignature: distributionRegisterRows.filter(
        (row) =>
          row.distributionStatus === "Sent - Awaiting Signature" ||
          row.distributionStatus === "Issued - Not Sent" ||
          row.distributionStatus === "Signature Overdue"
      ).length,
      overdue: distributionRegisterRows.filter(
        (row) => row.distributionStatus === "Signature Overdue"
      ).length,
      acknowledged: distributionRegisterRows.filter(
        (row) => row.distributionStatus === "Acknowledged"
      ).length,
      incomplete: distributionRegisterRows.filter(
        (row) => row.distributionStatus === "Incomplete"
      ).length,
    }),
    [distributionRegisterRows]
  );

  const distributionBranchFilterOptions = useMemo(() => {
    const branchNames = Array.from(
      new Set(
        distributionRegisterRows
          .map((row) => row.branchName)
          .filter((branchName) => branchName && branchName !== "-")
      )
    ).sort((left, right) => left.localeCompare(right));

    return [
      { value: DISTRIBUTION_ALL_FILTER_VALUE, label: "All branches" },
      ...branchNames.map((branchName) => ({
        value: branchName,
        label: branchName,
      })),
    ];
  }, [distributionRegisterRows]);

  const filteredDistributionRegisterRows = useMemo(() => {
    return distributionRegisterRows.filter((row) => {
      const matchesStatus =
        distributionStatusFilter === DISTRIBUTION_ALL_FILTER_VALUE
          ? true
          : distributionStatusFilter === DISTRIBUTION_NEEDS_ACTION_FILTER_VALUE
          ? isDistributionNeedsAction(row.distributionStatus)
          : row.distributionStatus === distributionStatusFilter;
      const matchesPackType =
        distributionPackTypeFilter === DISTRIBUTION_ALL_FILTER_VALUE ||
        row.packType === distributionPackTypeFilter;
      const matchesBranch =
        distributionBranchFilter === DISTRIBUTION_ALL_FILTER_VALUE ||
        row.branchName === distributionBranchFilter;

      return matchesStatus && matchesPackType && matchesBranch;
    });
  }, [
    distributionBranchFilter,
    distributionPackTypeFilter,
    distributionRegisterRows,
    distributionStatusFilter,
  ]);

  const packActionQueueRows = useMemo(() => {
    return distributionRegisterRows
      .filter((row) => isDistributionNeedsAction(row.distributionStatus))
      .sort((left, right) => {
        const priorityDifference =
          getDistributionActionPriority(left.distributionStatus) -
          getDistributionActionPriority(right.distributionStatus);
        if (priorityDifference !== 0) return priorityDifference;

        const leftDue = left.signatureDueDate ? new Date(left.signatureDueDate).getTime() : 0;
        const rightDue = right.signatureDueDate ? new Date(right.signatureDueDate).getTime() : 0;
        if (leftDue !== rightDue) {
          if (!leftDue) return 1;
          if (!rightDue) return -1;
          return leftDue - rightDue;
        }

        return (
          new Date(right.latestActivityDate || 0).getTime() -
          new Date(left.latestActivityDate || 0).getTime()
        );
      })
      .slice(0, 6);
  }, [distributionRegisterRows]);

  const buildPackExportOptions = (row: PackControlRow, packDocuments: DocumentRow[]) => {
    const firstDocument = packDocuments[0] || null;
    const firstMetadata = firstDocument ? getDocumentMetadata(firstDocument.tags) : {};
    const branch = typedBranches.find(
      (item) =>
        item.id === firstDocument?.branchId ||
        (row.branchName !== "-" && item.name === row.branchName)
    );
    const design = {
      accentColor: String(firstMetadata.accentColor || branch?.primaryColor || "#0f766e"),
      companyName: String(
        firstMetadata.companyName || branch?.companyName || branch?.name || "TextPoint"
      ),
      logoUrl: String(firstMetadata.logoUrl || branch?.logoUrl || ""),
    };
    const completionLabel = `${row.completedCount}/${row.requiredCount} current document${
      row.requiredCount === 1 ? "" : "s"
    }`;
    const issuedLabel = row.isFullyIssued ? "Fully issued" : `${row.issuedCount} issued`;
    const distributionLabel = row.isFullyDistributed
      ? `${row.distributionMethod || "Distributed"}${
          row.distributedToName ? ` to ${row.distributedToName}` : ""
        }${row.signatureDueDate ? ` | due ${formatDate(row.signatureDueDate)}` : ""}`
      : row.isFullyIssued
      ? "Issued but not yet distributed"
      : "Not issued";
    const acknowledgementLabel = row.isFullyAcknowledged
      ? `Fully acknowledged${row.acknowledgedAt ? ` on ${formatDate(row.acknowledgedAt)}` : ""}`
      : `${row.acknowledgedCount}/${packDocuments.length} acknowledged`;
    const introduction =
      row.missingTemplates.length === 0
        ? `This ${row.packType.toLowerCase()} contains the current effective documents for <strong>${row.contextLabel}</strong>. Each section remains editable after export.`
        : `This ${row.packType.toLowerCase()} is still in progress for <strong>${row.contextLabel}</strong>. Missing templates: <strong>${row.missingTemplates.join(", ")}</strong>.`;
    const manifest = [
      { label: "Pack Type", value: row.packType },
      { label: "Context", value: row.contextLabel },
      { label: "Branch", value: row.branchName || "-" },
      { label: "Pack Status", value: row.status },
      { label: "Completion", value: completionLabel },
      { label: "Issue State", value: issuedLabel },
      { label: "Distribution", value: distributionLabel },
      { label: "Acknowledgement", value: acknowledgementLabel },
      { label: "Documents Included", value: String(packDocuments.length) },
    ];

    if (row.latestCreatedAt) {
      manifest.push({
        label: "Latest Document Activity",
        value: formatDate(row.latestCreatedAt),
      });
    }

    if (row.missingTemplates.length > 0) {
      manifest.push({
        label: "Missing Templates",
        value: row.missingTemplates.join(", "),
      });
    }

    const issuedDocuments = packDocuments.filter((document) => document.issuedAt);
    const issueMetadataSource = issuedDocuments[issuedDocuments.length - 1];
    if (issueMetadataSource?.issuedAt) {
      if (issueMetadataSource.packReleaseReference) {
        manifest.push({
          label: "Release Reference",
          value: issueMetadataSource.packReleaseReference,
        });
      }
      manifest.push({
        label: "Release Date",
        value: formatDate(issueMetadataSource.issuedAt),
      });
      if (issueMetadataSource.issuedByName) {
        manifest.push({
          label: "Released By",
          value: issueMetadataSource.issuedByName,
        });
      }
      if (issueMetadataSource.issueNote) {
        manifest.push({
          label: "Release Note",
          value: issueMetadataSource.issueNote,
        });
      }
    }

    const distributedDocuments = packDocuments.filter((document) => document.distributedAt);
    const distributionMetadataSource = distributedDocuments[distributedDocuments.length - 1];
    if (distributionMetadataSource?.distributedAt) {
      manifest.push({
        label: "Distributed Date",
        value: formatDate(distributionMetadataSource.distributedAt),
      });
      if (distributionMetadataSource.distributedByName) {
        manifest.push({
          label: "Distributed By",
          value: distributionMetadataSource.distributedByName,
        });
      }
      if (distributionMetadataSource.distributedToName) {
        manifest.push({
          label: "Distributed To",
          value: distributionMetadataSource.distributedToName,
        });
      }
      if (distributionMetadataSource.distributedToEmail) {
        manifest.push({
          label: "Recipient Email",
          value: distributionMetadataSource.distributedToEmail,
        });
      }
      if (distributionMetadataSource.signatureDueDate) {
        manifest.push({
          label: "Signature Due",
          value: formatDate(distributionMetadataSource.signatureDueDate),
        });
      }
    }

    const acknowledgedDocuments = packDocuments.filter((document) => document.acknowledgedAt);
    const acknowledgementMetadataSource = acknowledgedDocuments[acknowledgedDocuments.length - 1];
    if (acknowledgementMetadataSource?.acknowledgedAt) {
      manifest.push({
        label: "Acknowledged Date",
        value: formatDate(acknowledgementMetadataSource.acknowledgedAt),
      });
      if (acknowledgementMetadataSource.acknowledgedByName) {
        manifest.push({
          label: "Acknowledged By",
          value: acknowledgementMetadataSource.acknowledgedByName,
        });
      }
      if (acknowledgementMetadataSource.acknowledgementMethod) {
        manifest.push({
          label: "Acknowledgement Method",
          value: acknowledgementMetadataSource.acknowledgementMethod,
        });
      }
      if (acknowledgementMetadataSource.acknowledgementNote) {
        manifest.push({
          label: "Acknowledgement Note",
          value: acknowledgementMetadataSource.acknowledgementNote,
        });
      }
    }

    return {
      filename: slugifyValue(`${row.packType}-${row.contextLabel}`),
      title: `${row.packType} | ${row.contextLabel}`,
      subtitle: row.branchName !== "-" ? row.branchName : undefined,
      introduction,
      design,
      manifest,
      sections: packDocuments.map((document) => ({
        title: document.title,
        subtitle: document.description || undefined,
        content: `${extractEmbeddableHtmlContent(document.content)}${buildAcknowledgementSignatureHtml(document)}`,
        details: [
          document.generatedFromTemplateTitle
            ? `Template: ${document.generatedFromTemplateTitle}`
            : "",
          document.documentCode ? `Document code: ${document.documentCode}` : "",
          document.issueNumber ? `Issue number: ${document.issueNumber}` : "",
          document.effectiveDate ? `Effective date: ${formatDate(document.effectiveDate)}` : "",
          document.templateCategory ? `Category: ${document.templateCategory}` : "",
          `Status: ${document.generatedStatus}`,
          document.packReleaseReference
            ? `Release reference: ${document.packReleaseReference}`
            : "",
          document.issuedAt
            ? `Issued: ${formatDate(document.issuedAt)}${document.issuedByName ? ` by ${document.issuedByName}` : ""}`
            : "",
          document.issueNote ? `Issue note: ${document.issueNote}` : "",
          document.distributedAt
            ? `Distributed: ${formatDate(document.distributedAt)}${
                document.distributedToName ? ` to ${document.distributedToName}` : ""
              }${
                document.distributionMethod ? ` via ${document.distributionMethod}` : ""
              }`
            : "",
          document.signatureDueDate ? `Signature due: ${formatDate(document.signatureDueDate)}` : "",
          document.distributionNote ? `Distribution note: ${document.distributionNote}` : "",
          document.acknowledgedAt
            ? `Acknowledged: ${formatDate(document.acknowledgedAt)}${
                document.acknowledgedByName ? ` by ${document.acknowledgedByName}` : ""
              }`
            : "",
          document.acknowledgementMethod
            ? `Acknowledgement method: ${document.acknowledgementMethod}`
            : "",
          document.acknowledgementNote
            ? `Acknowledgement note: ${document.acknowledgementNote}`
            : "",
          `Version: ${document.version}`,
          `Created: ${formatDate(document.createdAt)}`,
          document.revisionReason ? `Revision note: ${document.revisionReason}` : "",
        ].filter(Boolean),
      })),
    };
  };

  const lifecycleExportColumns = [
    { key: "documentCode", label: "Code" },
    { key: "title", label: "Controlled Document" },
    { key: "kindLabel", label: "Kind" },
    { key: "contextLabel", label: "Context" },
    { key: "branchName", label: "Branch" },
    { key: "lifecycleStage", label: "Lifecycle" },
    { key: "approvalStatus", label: "Approval" },
    { key: "latestEventLabel", label: "Latest Event" },
    { key: "latestEventDateLabel", label: "Latest Event Date" },
    { key: "latestEventActor", label: "Actor" },
    { key: "releaseReference", label: "Release Ref" },
    { key: "revisionLabel", label: "Revision" },
  ];

  const distributionExportColumns = [
    { key: "packType", label: "Pack Type" },
    { key: "contextLabel", label: "Context" },
    { key: "branchName", label: "Branch" },
    { key: "distributionStatus", label: "Distribution Status" },
    { key: "requiredCount", label: "Required" },
    { key: "issuedCount", label: "Issued" },
    { key: "acknowledgedCount", label: "Acknowledged" },
    { key: "outstandingSignatureCount", label: "Outstanding Signatures" },
    { key: "releaseReference", label: "Release Reference" },
    { key: "issuedAtLabel", label: "Issued Date" },
    { key: "issuedByName", label: "Issued By" },
    { key: "distributedAtLabel", label: "Distributed Date" },
    { key: "distributedToName", label: "Distributed To" },
    { key: "distributedToEmail", label: "Recipient Email" },
    { key: "distributionMethod", label: "Distribution Method" },
    { key: "signatureDueDateLabel", label: "Signature Due" },
    { key: "acknowledgedAtLabel", label: "Acknowledged Date" },
    { key: "acknowledgedByName", label: "Acknowledged By" },
    { key: "acknowledgementMethod", label: "Method" },
  ];

  const distributionColumns: Column<PackDistributionRegisterRow>[] = [
    { key: "packType", label: "Pack", sortable: true, filterable: true },
    { key: "contextLabel", label: "Context", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true, filterable: true },
    {
      key: "distributionStatus",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant="secondary"
          className={getDistributionStatusClass(value as PackDistributionStatus)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "issuedCount",
      label: "Issued",
      sortable: true,
      render: (_, row) => `${row.issuedCount}/${row.requiredCount}`,
    },
    {
      key: "acknowledgedCount",
      label: "Signed",
      sortable: true,
      render: (_, row) => `${row.acknowledgedCount}/${row.issuedCount || row.requiredCount}`,
    },
    { key: "outstandingSignatureCount", label: "Outstanding", sortable: true },
    {
      key: "signatureDueDateLabel",
      label: "Due",
      sortable: true,
      render: (_, row) => (
        <div className="text-xs">
          <div>{row.signatureDueDateLabel}</div>
          {row.distributionMethod !== "-" ? (
            <div className="text-muted-foreground">{row.distributionMethod}</div>
          ) : null}
        </div>
      ),
    },
    { key: "releaseReference", label: "Release Ref", sortable: true, filterable: true },
    {
      key: "issuedAtLabel",
      label: "Issued",
      sortable: true,
      render: (_, row) => (
        <div className="text-xs">
          <div>{row.issuedAtLabel}</div>
          {row.issuedByName !== "-" ? (
            <div className="text-muted-foreground">{row.issuedByName}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "acknowledgedAtLabel",
      label: "Acknowledged",
      sortable: true,
      render: (_, row) => (
        <div className="text-xs">
          <div>{row.acknowledgedAtLabel}</div>
          {row.acknowledgedByName !== "-" ? (
            <div className="text-muted-foreground">{row.acknowledgedByName}</div>
          ) : null}
        </div>
      ),
    },
  ];

  const lifecycleColumns: Column<DocumentLifecycleRegisterRow>[] = [
    { key: "title", label: "Controlled Document", sortable: true, filterable: true },
    { key: "kindLabel", label: "Kind", sortable: true, filterable: true },
    { key: "documentCode", label: "Code", sortable: true, filterable: true },
    { key: "contextLabel", label: "Context", sortable: true, filterable: true },
    {
      key: "lifecycleStage",
      label: "Lifecycle",
      sortable: true,
      render: (value) => (
        <Badge
          variant="secondary"
          className={getLifecycleStageClass(value as DocumentLifecycleStage)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "approvalStatus",
      label: "Approval",
      sortable: true,
      render: (value) => (
        <Badge
          variant="secondary"
          className={getApprovalStatusClass(value as DocumentApprovalStatus)}
        >
          {String(value)}
        </Badge>
      ),
    },
    { key: "revisionLabel", label: "Revision", sortable: true, filterable: true },
    { key: "releaseReference", label: "Release Ref", sortable: true, filterable: true },
    {
      key: "latestEventDateLabel",
      label: "Latest Activity",
      sortable: true,
      render: (_, row) => (
        <div className="text-xs">
          <div>{row.latestEventLabel}</div>
          <div className="text-muted-foreground">{row.latestEventDateLabel}</div>
        </div>
      ),
    },
  ];

  const templateColumns: Column<DocumentRow>[] = [
      { key: "title", label: "Template", sortable: true, filterable: true },
      { key: "documentCode", label: "Code", sortable: true, filterable: true },
      { key: "documentType", label: "Type", sortable: true, filterable: true },
      { key: "templateCategory", label: "Category", sortable: true, filterable: true },
    {
      key: "templateStatus",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getTemplateStatusClass(value as TemplateStatus)}>
          {String(value)}
          </Badge>
        ),
      },
    {
      key: "approvalStatus",
      label: "Approval",
      sortable: true,
      render: (value) => (
          <Badge variant="secondary" className={getApprovalStatusClass(value as DocumentApprovalStatus)}>
            {String(value)}
          </Badge>
        ),
      },
      {
        key: "id",
        label: "Validation",
        sortable: false,
        render: (_, row) => {
          const validation = templateValidationById.get(row.id);
          if (!validation) {
            return <span className="text-muted-foreground">-</span>;
          }

          return (
            <Badge
              variant="secondary"
              className={getValidationStatusClass(validation.status)}
            >
              {validation.status}
            </Badge>
          );
        },
      },
      { key: "issueNumber", label: "Issue", sortable: true, filterable: true },
    {
      key: "effectiveDate",
      label: "Effective",
      sortable: true,
      render: (value) =>
        value ? formatDate(value as string | Date) : <span className="text-muted-foreground">-</span>,
    },
    { key: "version", label: "Version", sortable: true },
    { key: "usageCount", label: "Generated", sortable: true },
    { key: "placeholderCount", label: "Tokens", sortable: true },
  ];

    const generatedColumns: Column<DocumentRow>[] = [
      { key: "title", label: "Generated Document", sortable: true, filterable: true },
      { key: "documentCode", label: "Code", sortable: true, filterable: true },
      { key: "generatedFromTemplateTitle", label: "Template", sortable: true, filterable: true },
      { key: "studentName", label: "Student", sortable: true, filterable: true },
      { key: "courseLabel", label: "Course", sortable: true, filterable: true },
      { key: "revisionLabel", label: "Revision", sortable: true, filterable: true },
      {
        key: "approvalStatus",
        label: "Approval",
        sortable: true,
        render: (value) => (
          <Badge variant="secondary" className={getApprovalStatusClass(value as DocumentApprovalStatus)}>
            {String(value)}
          </Badge>
        ),
      },
      {
        key: "generatedStatus",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getGeneratedStatusClass(value as GeneratedStatus)}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "issuedAt",
      label: "Issue",
      sortable: true,
      render: (_, row) =>
        row.issuedAt ? (
          <div className="text-xs">
            <div>{formatDate(row.issuedAt)}</div>
            {row.issuedByName ? (
              <div className="text-muted-foreground">{row.issuedByName}</div>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "acknowledgedAt",
      label: "Acknowledgement",
      sortable: true,
      render: (_, row) =>
        row.acknowledgedAt ? (
          <div className="text-xs">
            <div>{formatDate(row.acknowledgedAt)}</div>
            {row.acknowledgedByName ? (
              <div className="text-muted-foreground">{row.acknowledgedByName}</div>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    { key: "packReleaseReference", label: "Release Ref", sortable: true, filterable: true },
    { key: "version", label: "Version", sortable: true },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => formatDate(value as string | Date),
    },
  ];

  const libraryColumns: Column<DocumentRow>[] = [
    { key: "title", label: "Document", sortable: true, filterable: true },
    { key: "documentType", label: "Type", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true, filterable: true },
    {
      key: "url",
      label: "Link",
      render: (value) => (hasDocumentLink(value as string) ? "Available" : "-"),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => formatDate(value as string | Date),
    },
  ];

  const openCreateEditor = (
    kind: DocumentKind,
    seedValues?: Record<string, unknown> | null
  ) => {
    setEditorKind(kind);
    setEditingDocument(null);
    setEditorSeedValues(seedValues ?? null);
    setIsEditorOpen(true);
  };

  const openEditEditor = (record: DocumentRow) => {
    setEditorKind(record.kind);
    setEditingDocument(record);
    setEditorSeedValues(null);
    setIsEditorOpen(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawDocumentId = params.get("documentId")?.trim();
    const documentAction = params.get("documentAction")?.trim().toLowerCase() || "edit";

    if (!rawDocumentId) {
      return;
    }

    const documentId = Number(rawDocumentId);
    if (!Number.isInteger(documentId) || documentId <= 0) {
      params.delete("documentId");
      params.delete("documentAction");
      const nextQuery = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
      );
      return;
    }

    const targetDocument = documentRows.find((row) => row.id === documentId) ?? null;

    if (!targetDocument) {
      if (isLoading) {
        return;
      }

      toast.error("The requested document could not be found.");
      params.delete("documentId");
      params.delete("documentAction");
      const nextQuery = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
      );
      return;
    }

    if (activeTab !== targetDocument.kind) {
      setActiveTab(targetDocument.kind);
    }

    if (documentAction === "preview") {
      openDocumentPreview(targetDocument);
    } else if (
      !isEditorOpen ||
      editingDocument?.id !== targetDocument.id ||
      editorKind !== targetDocument.kind
    ) {
      openEditEditor(targetDocument);
    }

    params.delete("documentId");
    params.delete("documentAction");
    const nextQuery = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
    );
  }, [activeTab, documentRows, editorKind, editingDocument?.id, isEditorOpen, isLoading]);

  const handleDelete = async (record: DocumentRecord) => {
    if (!confirm(`Delete "${record.title}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: record.id });
      toast.success("Document deleted");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete document");
    }
  };

  const handleExport = (record: DocumentRecord) => {
    const metadata = getDocumentMetadata(record.tags);
    const layout = resolveDocumentLayout(metadata);
    exportEditableHtmlDocument({
      filename: record.title.replace(/\s+/g, "-").toLowerCase(),
      title: record.title,
      subtitle: record.description || undefined,
      content: buildDocumentBodyContent(record, {
        includeControlMetadata: layout.showControlTable,
      }),
      design: {
        accentColor: String(metadata.accentColor || "#0f766e"),
        companyName: String(metadata.companyName || "TextPoint"),
        logoUrl: String(metadata.logoUrl || ""),
      },
      layout,
    });
  };

  const handleImportDocxTemplate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsDocxImporting(true);

    try {
      const importedTemplate = await importDocxTemplateFile(file);
      const title = importedTemplate.title.trim() || "Imported Word Template";
      const today = new Date().toISOString().slice(0, 10);

      openCreateEditor("template", {
        title,
        description: `Imported from ${file.name}. Review layout, placeholders, and spacing before approving.`,
        documentType: importedTemplate.documentType,
        accentColor: "#0f766e",
        templateCategory: "General",
        templateStatus: "Draft",
        documentCode: slugifyValue(title).toUpperCase() || "IMPORTED-TEMPLATE",
        issueNumber: "01",
        effectiveDate: today,
        content: importedTemplate.content,
      });
      setActiveTab("template");

      toast.success(
        importedTemplate.warnings.length > 0
          ? `Word template imported with ${importedTemplate.warnings.length} conversion note${
              importedTemplate.warnings.length === 1 ? "" : "s"
            }.`
          : "Word template imported into the editor."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import the Word template"
      );
    } finally {
      setIsDocxImporting(false);
      event.target.value = "";
    }
  };

  const openApprovalDialog = (record: DocumentRow, mode: ApprovalDialogMode) => {
    setApprovalTarget(record);
    setApprovalMode(mode);
    setIsApprovalDialogOpen(true);
  };

  const openTokenAssistant = (record: DocumentRow) => {
    setTokenAssistantTemplate(record);
    setTokenAssistantContent(record.content || "");
    setTokenAssistantSearch("");
    setIsTokenAssistantOpen(true);
  };

  const openLayoutDesigner = (record: DocumentRow) => {
    const metadata = getDocumentMetadata(record.tags);
    setLayoutTarget(record);
    setLayoutDraft(resolveDocumentLayout(metadata));
    setIsLayoutDesignerOpen(true);
  };

  const openValidationWizard = (record: DocumentRow) => {
    setValidationTemplate(record);
    setValidationContent(record.content || "");
    setValidationSearch("");
    setValidationMappings({});
    setIsValidationWizardOpen(true);
  };

  const insertPlaceholderAtCursor = (placeholderKey: string) => {
    const textarea = tokenAssistantTextareaRef.current;
    const selectionStart = textarea?.selectionStart ?? tokenAssistantContent.length;
    const selectionEnd = textarea?.selectionEnd ?? tokenAssistantContent.length;
    const nextPosition = selectionStart + placeholderKey.length;

    setTokenAssistantContent(
      (currentValue) =>
        `${currentValue.slice(0, selectionStart)}${placeholderKey}${currentValue.slice(
          selectionEnd
        )}`
    );

    window.requestAnimationFrame(() => {
      const nextTextarea = tokenAssistantTextareaRef.current;
      if (!nextTextarea) return;
      nextTextarea.focus();
      nextTextarea.setSelectionRange(nextPosition, nextPosition);
    });
  };

  const insertValidationPlaceholderAtCursor = (placeholderKey: string) => {
    const textarea = validationTextareaRef.current;
    const selectionStart = textarea?.selectionStart ?? validationContent.length;
    const selectionEnd = textarea?.selectionEnd ?? validationContent.length;
    const token = toPlaceholderToken(placeholderKey);
    const nextPosition = selectionStart + token.length;

    setValidationContent(
      (currentValue) =>
        `${currentValue.slice(0, selectionStart)}${token}${currentValue.slice(selectionEnd)}`
    );

    window.requestAnimationFrame(() => {
      const nextTextarea = validationTextareaRef.current;
      if (!nextTextarea) return;
      nextTextarea.focus();
      nextTextarea.setSelectionRange(nextPosition, nextPosition);
    });
  };

  const saveTemplateWorkflowContent = async (
    record: DocumentRow,
    nextContentValue: string,
    successMessage: string
  ) => {
    const nextContent = nextContentValue.trim();
    if (!nextContent) {
      throw new Error("Template content cannot be empty.");
    }

    const metadata = getDocumentMetadata(record.tags);
    const nextMetadata = resetApprovalMetadata(
      {
        ...metadata,
        placeholderKeys: extractPlaceholders(nextContent),
      },
      record.kind
    );

    await updateMutation.mutateAsync({
      id: record.id,
      data: {
        content: nextContent,
        tags: nextMetadata,
      },
    });

    toast.success(successMessage);
    await refetch();
  };

  const handleSaveTokenAssistant = async () => {
    if (!tokenAssistantTemplate) {
      toast.error("Please select a template first.");
      return;
    }

    try {
      await saveTemplateWorkflowContent(
        tokenAssistantTemplate,
        tokenAssistantContent,
        "Template updated from token assistant"
      );
      setIsTokenAssistantOpen(false);
      setTokenAssistantTemplate(null);
      setTokenAssistantContent("");
      setTokenAssistantSearch("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save token assistant changes"
      );
    }
  };

  const applyValidationMapping = (sourceKey: string) => {
    const targetKey = validationMappings[sourceKey];
    if (!targetKey) {
      toast.error("Choose a valid system placeholder first.");
      return;
    }

    setValidationContent((currentValue) =>
      replacePlaceholderToken(currentValue, sourceKey, targetKey)
    );
    setValidationMappings((currentValue) => {
      const nextValue = { ...currentValue };
      delete nextValue[sourceKey];
      return nextValue;
    });
  };

  const handleSaveValidationTemplate = async () => {
    if (!validationTemplate) {
      toast.error("Please select a template first.");
      return;
    }

    try {
      await saveTemplateWorkflowContent(
        validationTemplate,
        validationContent,
        "Template updated from validation wizard"
      );
      setIsValidationWizardOpen(false);
      setValidationTemplate(null);
      setValidationContent("");
      setValidationSearch("");
      setValidationMappings({});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save validation changes"
      );
    }
  };

  const handleSaveLayoutDesigner = async () => {
    if (!layoutTarget) {
      toast.error("Please select a document first.");
      return;
    }

    try {
      const metadata = getDocumentMetadata(layoutTarget.tags);
      let nextMetadata: DocumentMetadata = {
        ...metadata,
        documentLayout: layoutDraft,
      };

      if (layoutTarget.kind === "template" || layoutTarget.kind === "generated") {
        nextMetadata = resetApprovalMetadata(nextMetadata, layoutTarget.kind);
      }

      await updateMutation.mutateAsync({
        id: layoutTarget.id,
        data: {
          tags: nextMetadata,
        },
      });

      toast.success("Document layout saved");
      setIsLayoutDesignerOpen(false);
      setLayoutTarget(null);
      setLayoutDraft(getDefaultDocumentLayout());
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save document layout");
    }
  };

  const handleSubmitForReview = async (record: DocumentRow) => {
    try {
      await submitForReviewMutation.mutateAsync({ id: record.id });
      toast.success("Document submitted for review");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit document for review");
    }
  };

  const handleEditorSubmit = async (values: Record<string, unknown>) => {
      const title = String(values.title || "").trim();
      if (!title) {
        throw new Error("Title is required.");
    }

    const branchId = values.branchId ? Number(values.branchId) : null;
    const branch = typedBranches.find((item) => item.id === branchId);
    const content = String(values.content || "").trim();
      const existingMetadata = getDocumentMetadata(editingDocument?.tags || null);
      const kind = editingDocument ? getDocumentKind(editingDocument) : editorKind;
      const description = String(values.description || "").trim() || undefined;
      const documentType = String(values.documentType || "Other");

      let baseMetadata: DocumentMetadata = {
        ...existingMetadata,
        kind,
        accentColor: String(values.accentColor || branch?.primaryColor || "#0f766e"),
        companyName: branch?.companyName || branch?.name || String(existingMetadata.companyName || "TextPoint"),
        logoUrl: branch?.logoUrl || String(existingMetadata.logoUrl || ""),
      branchName: branch?.name || String(existingMetadata.branchName || ""),
      branchId: branchId ?? undefined,
    };

    if (kind === "template") {
      baseMetadata.templateCategory = String(values.templateCategory || "General");
      baseMetadata.templateStatus = String(values.templateStatus || "Draft") as TemplateStatus;
      baseMetadata.version = Number(existingMetadata.version || 1);
      baseMetadata.templateKey = String(existingMetadata.templateKey || slugifyValue(title));
      baseMetadata.documentCode =
        String(values.documentCode || "").trim() ||
        String(existingMetadata.documentCode || "").trim() ||
        String(existingMetadata.templateKey || slugifyValue(title)).toUpperCase();
      baseMetadata.issueNumber =
        String(values.issueNumber || "").trim() || String(existingMetadata.issueNumber || "01");
      baseMetadata.effectiveDate =
        String(values.effectiveDate || "").trim() || String(existingMetadata.effectiveDate || "");
      baseMetadata.placeholderKeys = extractPlaceholders(content);
    } else if (kind === "generated") {
      baseMetadata.generatedStatus = String(values.generatedStatus || "Draft") as GeneratedStatus;
      baseMetadata.version = Number(existingMetadata.version || 1);
      baseMetadata.placeholderKeys = existingMetadata.placeholderKeys || extractPlaceholders(content);
      } else {
        baseMetadata.version = Number(existingMetadata.version || 1);
      }

      const existingTitle = editingDocument?.title ?? "";
      const existingDescription = editingDocument?.description ?? "";
      const existingContent = editingDocument?.content ?? "";
      const existingBranchId = editingDocument?.branchId ?? null;
      const existingDocumentType = editingDocument?.documentType ?? "Other";
      const hasControlledDocumentChanged =
        Boolean(editingDocument) &&
        (kind === "template" || kind === "generated") &&
        (
          title !== existingTitle ||
          (description || "") !== existingDescription ||
          content !== existingContent ||
          branchId !== existingBranchId ||
          documentType !== existingDocumentType ||
          String(values.accentColor || "") !== String(existingMetadata.accentColor || "") ||
          (kind === "template" &&
            (
              String(values.templateCategory || "General") !== String(existingMetadata.templateCategory || "General") ||
              String(values.templateStatus || "Draft") !== String(existingMetadata.templateStatus || "Draft") ||
              String(values.documentCode || "").trim() !== String(existingMetadata.documentCode || "").trim() ||
              String(values.issueNumber || "").trim() !== String(existingMetadata.issueNumber || "01") ||
              String(values.effectiveDate || "").trim() !== String(existingMetadata.effectiveDate || "")
            )) ||
          (kind === "generated" &&
            String(values.generatedStatus || "Draft") !== String(existingMetadata.generatedStatus || "Draft"))
        );

      if (hasControlledDocumentChanged) {
        baseMetadata = resetApprovalMetadata(baseMetadata, kind);
      }

      const payload = {
        title,
        description,
        documentType,
        content,
        branchId,
        url:
          kind === "library"
            ? normalizeDocumentUrl(String(values.url ?? ""))
            : editingDocument?.url || "about:blank",
        tags: baseMetadata,
    };

      try {
        if (editingDocument) {
          await updateMutation.mutateAsync({ id: editingDocument.id, data: payload });
          toast.success(
            hasControlledDocumentChanged && (kind === "template" || kind === "generated")
              ? "Document updated and approval reset to Draft"
              : "Document updated"
          );
        } else {
          await createMutation.mutateAsync(payload);
          toast.success(kind === "template" ? "Template created" : "Document created");
        }

      setIsEditorOpen(false);
      setEditingDocument(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save document");
    }
  };

  const handleLoadStarterTemplates = async () => {
    try {
      const result = await loadStarterTemplatesMutation.mutateAsync();
      toast.success(
        result.created > 0
          ? `${result.created} starter template${result.created === 1 ? "" : "s"} added`
          : "Starter templates were already loaded"
      );
      await refetch();
      setActiveTab("template");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load starter templates");
    }
  };

  const handleLoadSampleScenario = async () => {
    try {
      const result = await loadSampleScenarioMutation.mutateAsync();
      const createdParts = [
        result.branchCreated ? "branch" : null,
        result.courseCreated ? "course" : null,
        result.lecturerCreated ? "lecturer" : null,
        result.studentCreated ? "student" : null,
        result.scheduleCreated ? "schedule" : null,
        result.enrollmentCreated ? "enrolment" : null,
        result.assessmentCreated ? "assessment" : null,
        result.certificateCreated ? "certificate" : null,
      ].filter(Boolean);

      toast.success(
        [
          "Sample document scenario ready.",
          result.learnerDocumentsCreated > 0
            ? `${result.learnerDocumentsCreated} learner docs generated.`
            : "Learner docs already existed.",
          result.lecturerDocumentsCreated > 0
            ? `${result.lecturerDocumentsCreated} lecturer docs generated.`
            : "Lecturer docs already existed.",
          result.sampleTemplateMocksPrepared > 0
            ? `${result.sampleTemplateMocksPrepared} controlled draft template sample${
                result.sampleTemplateMocksPrepared === 1 ? "" : "s"
              } prepared.`
            : "Controlled draft template samples already existed.",
          result.revisionCreated ? "A corrected revision was created." : "Revision chain already existed.",
          result.lifecycleStatesPrepared > 0
            ? `${result.lifecycleStatesPrepared} lifecycle state${
                result.lifecycleStatesPrepared === 1 ? "" : "s"
              } refreshed.`
            : "Lifecycle demo states were already aligned.",
          createdParts.length > 0
            ? `Created: ${createdParts.join(", ")}.`
            : "Base sample records were already in place.",
        ].join(" ")
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load sample document scenario"
      );
    }
  };

  const handleGenerateMissingLearnerPack = async (row: PackControlRow) => {
    if (!row.studentId || !row.enrollmentId) {
      toast.error("This learner pack is missing its student or enrolment context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await generateMissingStudentPackMutation.mutateAsync({
        studentId: row.studentId,
        enrollmentId: row.enrollmentId,
        generatedStatus: "Draft",
      });

      toast.success(
        result.count > 0
          ? `${result.count} missing learner document${result.count === 1 ? "" : "s"} generated.`
          : "This learner pack is already complete."
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate missing learner documents"
      );
    } finally {
      setPackActionId(null);
    }
  };

  const handleGenerateMissingLecturerPack = async (row: PackControlRow) => {
    if (!row.scheduleId) {
      toast.error("This lecturer pack is missing its schedule context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await generateMissingSchedulePackMutation.mutateAsync({
        scheduleId: row.scheduleId,
        generatedStatus: "Draft",
      });

      toast.success(
        result.count > 0
          ? `${result.count} missing lecturer document${result.count === 1 ? "" : "s"} generated.`
          : "This lecturer pack is already complete."
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate missing lecturer documents"
      );
    } finally {
      setPackActionId(null);
    }
  };

  const handleIssueLearnerPack = async (row: PackControlRow, issueNote?: string) => {
    if (!row.studentId || !row.enrollmentId) {
      toast.error("This learner pack is missing its student or enrolment context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await issueStudentPackMutation.mutateAsync({
        studentId: row.studentId,
        enrollmentId: row.enrollmentId,
        issueNote: issueNote?.trim() || undefined,
      });

      toast.success(
        result.count > 0
          ? `${result.count} learner document${result.count === 1 ? "" : "s"} marked as issued.`
          : "This learner pack was already fully issued."
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to issue learner pack"
      );
      throw error;
    } finally {
      setPackActionId(null);
    }
  };

  const handleIssueLecturerPack = async (row: PackControlRow, issueNote?: string) => {
    if (!row.scheduleId) {
      toast.error("This lecturer pack is missing its schedule context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await issueSchedulePackMutation.mutateAsync({
        scheduleId: row.scheduleId,
        issueNote: issueNote?.trim() || undefined,
      });

      toast.success(
        result.count > 0
          ? `${result.count} lecturer document${result.count === 1 ? "" : "s"} marked as issued.`
          : "This lecturer pack was already fully issued."
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to issue lecturer pack"
      );
      throw error;
    } finally {
      setPackActionId(null);
    }
  };

  const handleDispatchLearnerPack = async (
    row: PackControlRow,
    values: Record<string, unknown>
  ) => {
    if (!row.studentId || !row.enrollmentId) {
      toast.error("This learner pack is missing its student or enrolment context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await dispatchStudentPackMutation.mutateAsync({
        studentId: row.studentId,
        enrollmentId: row.enrollmentId,
        recipientName: String(values.recipientName || "").trim(),
        recipientEmail: String(values.recipientEmail || "").trim() || undefined,
        distributionMethod: resolveDistributionMethod(values.distributionMethod),
        signatureDueDate: values.signatureDueDate
          ? new Date(`${String(values.signatureDueDate)}T00:00:00`)
          : undefined,
        distributionNote: String(values.distributionNote || "").trim() || undefined,
      });

      toast.success(
        `${result.count} learner document${result.count === 1 ? "" : "s"} marked as distributed.`
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to record learner pack dispatch"
      );
      throw error;
    } finally {
      setPackActionId(null);
    }
  };

  const handleDispatchLecturerPack = async (
    row: PackControlRow,
    values: Record<string, unknown>
  ) => {
    if (!row.scheduleId) {
      toast.error("This lecturer pack is missing its schedule context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await dispatchSchedulePackMutation.mutateAsync({
        scheduleId: row.scheduleId,
        recipientName: String(values.recipientName || "").trim(),
        recipientEmail: String(values.recipientEmail || "").trim() || undefined,
        distributionMethod: resolveDistributionMethod(values.distributionMethod),
        signatureDueDate: values.signatureDueDate
          ? new Date(`${String(values.signatureDueDate)}T00:00:00`)
          : undefined,
        distributionNote: String(values.distributionNote || "").trim() || undefined,
      });

      toast.success(
        `${result.count} lecturer document${result.count === 1 ? "" : "s"} marked as distributed.`
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to record lecturer pack dispatch"
      );
      throw error;
    } finally {
      setPackActionId(null);
    }
  };

  const handleAcknowledgeLearnerPack = async (row: PackControlRow, signatureDataUrl: string) => {
    if (!row.studentId || !row.enrollmentId) {
      toast.error("This learner pack is missing its student or enrolment context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await acknowledgeStudentPackMutation.mutateAsync({
        studentId: row.studentId,
        enrollmentId: row.enrollmentId,
        signerName: acknowledgementSignerName.trim(),
        signerRole: acknowledgementSignerRole.trim(),
        signatureDataUrl,
        acknowledgementNote: acknowledgementNote.trim() || undefined,
      });

      toast.success(
        `${result.count} learner document${result.count === 1 ? "" : "s"} digitally acknowledged.`
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to acknowledge learner pack"
      );
      throw error;
    } finally {
      setPackActionId(null);
    }
  };

  const handleAcknowledgeLecturerPack = async (row: PackControlRow, signatureDataUrl: string) => {
    if (!row.scheduleId) {
      toast.error("This lecturer pack is missing its schedule context.");
      return;
    }

    setPackActionId(row.id);

    try {
      const result = await acknowledgeSchedulePackMutation.mutateAsync({
        scheduleId: row.scheduleId,
        signerName: acknowledgementSignerName.trim(),
        signerRole: acknowledgementSignerRole.trim(),
        signatureDataUrl,
        acknowledgementNote: acknowledgementNote.trim() || undefined,
      });

      toast.success(
        `${result.count} lecturer document${result.count === 1 ? "" : "s"} digitally acknowledged.`
      );
      await refetch();
      setActiveTab("generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to acknowledge lecturer pack"
      );
      throw error;
    } finally {
      setPackActionId(null);
    }
  };

  const handlePreviewPack = (row: PackControlRow, packDocuments: DocumentRow[]) => {
    if (packDocuments.length === 0) {
      toast.error("There are no generated documents in this pack yet.");
      return;
    }

    openHtmlPreview(buildEditableHtmlPackDocument(buildPackExportOptions(row, packDocuments)));
  };

  const handleExportPack = (row: PackControlRow, packDocuments: DocumentRow[]) => {
    if (packDocuments.length === 0) {
      toast.error("There are no generated documents in this pack yet.");
      return;
    }

    exportEditableHtmlPackDocument(buildPackExportOptions(row, packDocuments));
  };

  const openPackIssueDialog = (row: PackControlRow) => {
    if (!isReleaseAuthority) {
      toast.error("Only Admin or Super Admin can issue controlled document packs.");
      return;
    }
    setPackIssueTarget(row);
    setIsPackIssueOpen(true);
  };

  const openPackDispatchDialog = (row: PackControlRow) => {
    if (!row.isFullyIssued) {
      toast.error("Only issued packs can be distributed.");
      return;
    }

    setPackDispatchTarget(row);
    setIsPackDispatchOpen(true);
  };

  const openPackAcknowledgementDialog = (row: PackControlRow) => {
    if (!row.isFullyIssued) {
      toast.error("Only issued packs can be acknowledged.");
      return;
    }

    setPackAcknowledgementTarget(row);
    setAcknowledgementSignerName(user?.name || user?.email || "");
    setAcknowledgementSignerRole(
      row.packType === "Learner Pack" ? "Learner / representative" : "Lecturer / receiver"
    );
    setAcknowledgementNote("");
    setHasSignatureStroke(false);
    setIsPackAcknowledgementOpen(true);
  };

  const getSignatureCanvasPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleSignaturePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;

    const point = getSignatureCanvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    isSignatureDrawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const handleSignaturePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isSignatureDrawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;

    const point = getSignatureCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasSignatureStroke(true);
  };

  const stopSignatureDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    isSignatureDrawingRef.current = false;
  };

  const handlePackAcknowledgementSubmit = async () => {
    if (!packAcknowledgementTarget) {
      toast.error("Please select a pack to acknowledge.");
      return;
    }
    if (!acknowledgementSignerName.trim()) {
      toast.error("Please enter the signer name.");
      return;
    }
    if (!acknowledgementSignerRole.trim()) {
      toast.error("Please enter the signer role.");
      return;
    }
    if (!hasSignatureStroke) {
      toast.error("Please draw the digital signature before saving.");
      return;
    }

    const signatureDataUrl = signatureCanvasRef.current?.toDataURL("image/png") || "";
    if (!signatureDataUrl) {
      toast.error("The digital signature could not be captured.");
      return;
    }

    if (packAcknowledgementTarget.packType === "Learner Pack") {
      await handleAcknowledgeLearnerPack(packAcknowledgementTarget, signatureDataUrl);
    } else {
      await handleAcknowledgeLecturerPack(packAcknowledgementTarget, signatureDataUrl);
    }

    setIsPackAcknowledgementOpen(false);
    setPackAcknowledgementTarget(null);
  };

  const openTemplateRevisionDialog = (record: DocumentRow) => {
    setTemplateRevisionSource(record);
    setIsTemplateRevisionOpen(true);
  };

  const openGenerateDialog = (template?: DocumentRow) => {
    setGenerateFormValues(
      template
        ? {
            templateId: String(template.id),
            generatedStatus: "Draft",
          }
        : {}
    );
    setIsGenerateOpen(true);
  };

  const openRevisionDialog = (record: DocumentRow) => {
    setRevisionSourceDocument(record);
    setIsRevisionOpen(true);
  };

  const renderDocumentApprovalActions = (row: DocumentRow) => {
    if (row.kind !== "template" && row.kind !== "generated") {
      return null;
    }

    if (row.approvalStatus === "Draft" || row.approvalStatus === "Rejected") {
      const validationStatus =
        row.kind === "template" ? templateValidationById.get(row.id)?.status : "Ready";

      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            handleSubmitForReview(row);
          }}
          disabled={
            submitForReviewMutation.isPending || validationStatus === "Needs Attention"
          }
        >
          <Send className="h-4 w-4" />
        </Button>
      );
    }

    if (row.approvalStatus === "In Review" && isReleaseAuthority) {
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              openApprovalDialog(row, "approve");
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              openApprovalDialog(row, "reject");
            }}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </>
      );
    }

    return null;
  };

  const editorFields = useMemo<FormField[]>(() => {
    const common: FormField[] = [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "documentType",
        label: "Type",
        type: "select",
        options: DOCUMENT_TYPES,
        required: true,
      },
      {
        name: "branchId",
        label: "Branch",
        type: "select",
        options: branchOptions,
      },
      { name: "description", label: "Subtitle", type: "text" },
      ...(editorKind === "library"
        ? [
            {
              name: "url",
              label: "External URL",
              type: "text" as const,
              placeholder: "https://example.com/document",
            },
          ]
        : []),
      {
        name: "accentColor",
        label: "Accent Colour",
        type: "text",
        placeholder: "#0f766e",
      },
    ];

    if (editorKind === "template") {
      common.splice(
        3,
        0,
        {
          name: "documentCode",
          label: "Document Code",
          type: "text",
          required: true,
          placeholder: "TRN-LRN-001",
        },
        {
          name: "issueNumber",
          label: "Issue Number",
          type: "text",
          required: true,
          placeholder: "01",
        },
        {
          name: "effectiveDate",
          label: "Effective Date",
          type: "date",
        },
        {
          name: "templateCategory",
          label: "Template Category",
          type: "select",
          options: TEMPLATE_CATEGORIES,
          required: true,
        },
        {
          name: "templateStatus",
          label: "Template Status",
          type: "select",
          options: TEMPLATE_STATUS_OPTIONS,
          required: true,
        }
      );
    }

    if (editorKind === "generated") {
      common.splice(3, 0, {
        name: "generatedStatus",
        label: "Generated Status",
        type: "select",
        options: GENERATED_STATUS_OPTIONS,
        required: true,
      });
    }

    common.push({
      name: "content",
      label: editorKind === "template" ? "Template HTML Content" : "HTML Content",
      type: "textarea",
      required: true,
      placeholder:
        editorKind === "template"
          ? "<h2>{{courseLabel}}</h2><p>Use placeholders like {{studentName}}.</p>"
          : "<h2>Heading</h2><p>Body copy</p>",
    });

    return common;
  }, [branchOptions, editorKind]);

  const activeRows = activeTab === "template" ? templateRows : activeTab === "generated" ? generatedRows : libraryRows;
  const activeColumns =
    activeTab === "template"
      ? templateColumns
      : activeTab === "generated"
      ? generatedColumns
      : libraryColumns;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">
              Manage editable templates, generate training paperwork from live student data, and keep a manual document library.
            </p>
          </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleLoadStarterTemplates}>
                <Sparkles className="mr-2 h-4 w-4" />
                Load Starter Templates
              </Button>
            <Button
              variant="outline"
              onClick={handleLoadSampleScenario}
              disabled={loadSampleScenarioMutation.isPending}
            >
              <Copy className="mr-2 h-4 w-4" />
              Load Sample Scenario
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Library Docs
            </Button>
              <Button variant="outline" onClick={() => openCreateEditor("library")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Library Doc
              </Button>
              <Button
                variant="outline"
                onClick={() => docxImportInputRef.current?.click()}
                disabled={isDocxImporting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isDocxImporting ? "Importing Word..." : "Import Word Template"}
              </Button>
              <Button variant="outline" onClick={() => openCreateEditor("template")}>
                <Layers3 className="mr-2 h-4 w-4" />
                Add Template
              </Button>
              <Button onClick={() => openGenerateDialog()}>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Document
              </Button>
            </div>
            <input
              ref={docxImportInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleImportDocxTemplate}
            />
          </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Templates</p>
            <p className="mt-2 text-3xl font-bold">{summary.templates}</p>
            <p className="mt-1 text-xs text-muted-foreground">{summary.activeTemplates} active templates</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Generated Docs</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">{summary.generated}</p>
            <p className="mt-1 text-xs text-blue-700">{summary.drafts} still in draft</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-900">Issued</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">{summary.issued}</p>
            <p className="mt-1 text-xs text-emerald-700">Generated documents marked as issued</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Library Docs</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{summary.library}</p>
            <p className="mt-1 text-xs text-amber-700">Manual documents outside the template flow</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sample Data</CardTitle>
            <CardDescription>
              Load a ready-made document workflow with a sample branch, course, lecturer,
              learner, enrolment, assessment, certificate, learner pack, lecturer pack,
              controlled draft templates, and a corrected revision chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The sample scenario is safe to run more than once. Existing sample records are
            reused, and only missing demo items are added. It also prepares useful review
            states like draft, blocked, in-review, rejected, approved, issued, corrected,
            and superseded so the controlled workflow is easier to test.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controlled Review Queue</CardTitle>
            <CardDescription>
              Track which controlled templates and generated documents are ready for review,
              blocked by validation issues, awaiting approval, or sitting in a rejected state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">Awaiting Approval</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{reviewQueueSummary.inReview}</p>
                <p className="mt-1 text-xs text-blue-700">Controlled documents already submitted for review</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Ready For Review</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{reviewQueueSummary.draftReady}</p>
                <p className="mt-1 text-xs text-emerald-700">Draft or rejected items that can move forward now</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">Blocked Templates</p>
                <p className="mt-2 text-3xl font-bold text-rose-900">{reviewQueueSummary.blockedTemplates}</p>
                <p className="mt-1 text-xs text-rose-700">Templates with validation issues still to correct</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{reviewQueueSummary.rejected}</p>
                <p className="mt-1 text-xs text-amber-700">Controlled documents returned for changes</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Awaiting Approval</h3>
                    <p className="text-sm text-muted-foreground">
                      Review-ready items already submitted and waiting for authority action.
                    </p>
                  </div>
                  <Badge variant="secondary">{approvalQueueRows.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {approvalQueueRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No controlled documents are waiting for approval right now.
                    </div>
                  ) : (
                    approvalQueueRows.slice(0, 6).map((row) => (
                      <div key={row.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{row.title}</p>
                          <Badge variant="outline">
                            {row.kind === "template" ? "Template" : "Generated"}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={getApprovalStatusClass(row.approvalStatus)}
                          >
                            {row.approvalStatus}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{row.documentCode || "No code"}</span>
                          <span>{row.templateCategory || row.documentType || "Document"}</span>
                          <span>
                            Submitted {formatDate(row.submittedForReviewAt || row.createdAt)}
                          </span>
                          {row.submittedForReviewByName ? (
                            <span>by {row.submittedForReviewByName}</span>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocumentPreview(row)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditEditor(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {renderDocumentApprovalActions(row)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Ready For Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Items that can be submitted without additional validation fixes.
                    </p>
                  </div>
                  <Badge variant="secondary">{reviewReadyRows.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {reviewReadyRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      There are no review-ready controlled documents at the moment.
                    </div>
                  ) : (
                    reviewReadyRows.slice(0, 6).map((row) => (
                      <div key={row.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{row.title}</p>
                          <Badge variant="outline">
                            {row.kind === "template" ? "Template" : "Generated"}
                          </Badge>
                          {row.kind === "template" ? (
                            <Badge
                              variant="secondary"
                              className={getValidationStatusClass(
                                templateValidationById.get(row.id)?.status || "Ready"
                              )}
                            >
                              {templateValidationById.get(row.id)?.status || "Ready"}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{row.documentCode || "No code"}</span>
                          <span>{row.templateCategory || row.documentType || "Document"}</span>
                          <span>Created {formatDate(row.createdAt)}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocumentPreview(row)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditEditor(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {renderDocumentApprovalActions(row)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Blocked Templates</h3>
                    <p className="text-sm text-muted-foreground">
                      Templates that still need placeholder or validation corrections.
                    </p>
                  </div>
                  <Badge variant="secondary">{blockedTemplateRows.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {blockedTemplateRows.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No templates are currently blocked by validation issues.
                    </div>
                  ) : (
                    blockedTemplateRows.slice(0, 6).map((row) => {
                      const validation = templateValidationById.get(row.id);
                      return (
                        <div key={row.id} className="rounded-lg border p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{row.title}</p>
                            <Badge variant="outline">Template</Badge>
                            <Badge
                              variant="secondary"
                              className={getValidationStatusClass(
                                validation?.status || "Needs Attention"
                              )}
                            >
                              {validation?.status || "Needs Attention"}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{row.documentCode || "No code"}</span>
                            <span>{row.templateCategory}</span>
                            <span>
                              {validation?.unknownKeys.length || 0} unknown token
                              {(validation?.unknownKeys.length || 0) === 1 ? "" : "s"}
                            </span>
                            <span>
                              {validation?.missingRequiredKeys.length || 0} required item
                              {(validation?.missingRequiredKeys.length || 0) === 1 ? "" : "s"} missing
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openValidationWizard(row)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Validate
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTokenAssistant(row)}
                            >
                              <Code2 className="mr-2 h-4 w-4" />
                              Tokens
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLayoutDesigner(row)}
                            >
                              <Layers3 className="mr-2 h-4 w-4" />
                              Layout
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Controlled Lifecycle Register</CardTitle>
              <CardDescription>
                Trace controlled templates and generated documents through draft, validation,
                review, approval, issue, correction, and superseding.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportTableToCSV(
                    lifecycleExportColumns,
                    lifecycleRegisterRows,
                    "document-lifecycle-register"
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportTableToPDF(
                    lifecycleExportColumns,
                    lifecycleRegisterRows,
                    "document-lifecycle-register",
                    "Document Lifecycle Register"
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Drafts</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{lifecycleSummary.drafts}</p>
                <p className="mt-1 text-xs text-amber-700">Editable items still being prepared</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-900">Blocked</p>
                <p className="mt-2 text-3xl font-bold text-red-900">{lifecycleSummary.blocked}</p>
                <p className="mt-1 text-xs text-red-700">Templates with validation gaps</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">In Review</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{lifecycleSummary.inReview}</p>
                <p className="mt-1 text-xs text-blue-700">Awaiting review or release decision</p>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <p className="text-sm font-medium text-teal-900">Approved / Issued</p>
                <p className="mt-2 text-3xl font-bold text-teal-900">{lifecycleSummary.approved}</p>
                <p className="mt-1 text-xs text-teal-700">Controlled items cleared for use</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-900">Acknowledged</p>
                <p className="mt-2 text-3xl font-bold text-indigo-900">{lifecycleSummary.acknowledged}</p>
                <p className="mt-1 text-xs text-indigo-700">Issued items digitally signed as received</p>
              </div>
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                <p className="text-sm font-medium text-cyan-900">Revisions</p>
                <p className="mt-2 text-3xl font-bold text-cyan-900">{lifecycleSummary.revisions}</p>
                <p className="mt-1 text-xs text-cyan-700">Corrected or superseded records</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">Rejected</p>
                <p className="mt-2 text-3xl font-bold text-rose-900">{lifecycleSummary.rejected}</p>
                <p className="mt-1 text-xs text-rose-700">Returned for correction or rework</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.8fr,1fr]">
              <div className="rounded-xl border bg-background p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Lifecycle Register</h3>
                    <p className="text-sm text-muted-foreground">
                      The current operational state of each controlled template and generated
                      document.
                    </p>
                  </div>
                  <Badge variant="secondary">{lifecycleRegisterRows.length}</Badge>
                </div>
                <DataTable
                  columns={lifecycleColumns}
                  data={lifecycleRegisterRows}
                  isLoading={isLoading}
                  pageSize={8}
                  searchPlaceholder="Search lifecycle register..."
                  onRowClick={(row) => openEditEditor(row.source)}
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocumentPreview(row.source);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {row.source.kind === "template" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openValidationWizard(row.source);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditEditor(row.source);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {renderDocumentApprovalActions(row.source)}
                    </div>
                  )}
                />
              </div>

              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">Recent Lifecycle Activity</h3>
                    <p className="text-sm text-muted-foreground">
                      A quick audit-style view of the latest controlled-document movement.
                    </p>
                  </div>
                  <Badge variant="secondary">{lifecycleTimeline.length}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {lifecycleTimeline.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No lifecycle activity is available yet.
                    </div>
                  ) : (
                    lifecycleTimeline.map((event) => (
                      <div key={event.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{event.eventType}</p>
                          <Badge variant="outline">{event.kindLabel}</Badge>
                        </div>
                        <p className="mt-1 text-sm">{event.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{event.branchName}</span>
                          <span>{event.contextLabel}</span>
                          <span>{event.eventDateLabel}</span>
                          {event.actorName && event.actorName !== "-" ? (
                            <span>by {event.actorName}</span>
                          ) : null}
                        </div>
                        {event.detail ? (
                          <p className="mt-2 text-xs text-muted-foreground">{event.detail}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Pack Distribution & Sign-Off Register</CardTitle>
              <CardDescription>
                Track released learner and lecturer packs from issue through digital acknowledgement.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportTableToCSV(
                    distributionExportColumns,
                    filteredDistributionRegisterRows,
                    "pack-distribution-sign-off-register"
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportTableToPDF(
                    distributionExportColumns,
                    filteredDistributionRegisterRows,
                    "pack-distribution-sign-off-register",
                    "Pack Distribution & Sign-Off Register"
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium">Tracked Packs</p>
                <p className="mt-2 text-3xl font-bold">{distributionSummary.total}</p>
                <p className="mt-1 text-xs text-muted-foreground">Learner and lecturer packs in scope</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Ready To Issue</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{distributionSummary.readyToIssue}</p>
                <p className="mt-1 text-xs text-emerald-700">Complete packs not released yet</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">Pending Signature</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{distributionSummary.awaitingSignature}</p>
                <p className="mt-1 text-xs text-blue-700">Issued or sent packs still needing sign-off</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-900">Acknowledged</p>
                <p className="mt-2 text-3xl font-bold text-indigo-900">{distributionSummary.acknowledged}</p>
                <p className="mt-1 text-xs text-indigo-700">Fully signed packs</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Incomplete</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{distributionSummary.incomplete}</p>
                <p className="mt-1 text-xs text-amber-700">Missing required documents</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-medium text-rose-900">Overdue</p>
                <p className="mt-2 text-3xl font-bold text-rose-900">{distributionSummary.overdue}</p>
                <p className="mt-1 text-xs text-rose-700">Signature due date has passed</p>
              </div>
            </div>

            <div className="rounded-xl border bg-background p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {distributionSummary.overdue > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-rose-600" />
                    ) : (
                      <Clock3 className="h-5 w-5 text-blue-600" />
                    )}
                    <h3 className="font-semibold">Pack Action Queue</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Prioritised packs that still need generation, issue, dispatch, or signature.
                  </p>
                </div>
                <Badge variant="secondary">{packActionQueueRows.length} open</Badge>
              </div>

              <div className="mt-4 space-y-3">
                {packActionQueueRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No open pack actions. Issued packs are signed off or nothing is currently ready.
                  </div>
                ) : (
                  packActionQueueRows.map((row) => (
                    <div key={`queue-${row.id}`} className="rounded-lg border p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={getDistributionStatusClass(row.distributionStatus)}
                            >
                              {row.distributionStatus}
                            </Badge>
                            <Badge variant="outline">{row.packType}</Badge>
                            {row.releaseReference !== "-" ? (
                              <Badge variant="outline">{row.releaseReference}</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 font-medium">{row.contextLabel}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{row.branchName}</span>
                            <span>{row.issuedCount}/{row.requiredCount} issued</span>
                            <span>{row.acknowledgedCount} signed</span>
                            {row.signatureDueDateLabel !== "-" ? (
                              <span>Due {row.signatureDueDateLabel}</span>
                            ) : null}
                            {row.distributedToName !== "-" ? (
                              <span>Recipient {row.distributedToName}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {row.distributionStatus === "Incomplete" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                row.source.requiredCount === 0 ||
                                packActionId === row.source.id
                              }
                              onClick={() =>
                                row.packType === "Learner Pack"
                                  ? handleGenerateMissingLearnerPack(row.source)
                                  : handleGenerateMissingLecturerPack(row.source)
                              }
                            >
                              <Wand2 className="mr-2 h-4 w-4" />
                              Generate
                            </Button>
                          ) : null}
                          {row.distributionStatus === "Ready To Issue" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                row.source.unapprovedCount > 0 ||
                                packActionId === row.source.id ||
                                !isReleaseAuthority
                              }
                              onClick={() => openPackIssueDialog(row.source)}
                            >
                              <Wand2 className="mr-2 h-4 w-4" />
                              Issue
                            </Button>
                          ) : null}
                          {row.distributionStatus === "Issued - Not Sent" ||
                          row.distributionStatus === "Sent - Awaiting Signature" ||
                          row.distributionStatus === "Signature Overdue" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={packActionId === row.source.id}
                              onClick={() => openPackDispatchDialog(row.source)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Dispatch
                            </Button>
                          ) : null}
                          {row.distributionStatus === "Issued - Not Sent" ||
                          row.distributionStatus === "Sent - Awaiting Signature" ||
                          row.distributionStatus === "Signature Overdue" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={packActionId === row.source.id}
                              onClick={() => openPackAcknowledgementDialog(row.source)}
                            >
                              <PenLine className="mr-2 h-4 w-4" />
                              Sign
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Register Filters</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Select
                  value={distributionStatusFilter}
                  onValueChange={setDistributionStatusFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRIBUTION_STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={distributionPackTypeFilter}
                  onValueChange={setDistributionPackTypeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pack type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRIBUTION_PACK_TYPE_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={distributionBranchFilter}
                  onValueChange={setDistributionBranchFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {distributionBranchFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDistributionStatusFilter(DISTRIBUTION_ALL_FILTER_VALUE);
                    setDistributionPackTypeFilter(DISTRIBUTION_ALL_FILTER_VALUE);
                    setDistributionBranchFilter(DISTRIBUTION_ALL_FILTER_VALUE);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {filteredDistributionRegisterRows.length} of{" "}
                {distributionRegisterRows.length} pack register record
                {distributionRegisterRows.length === 1 ? "" : "s"}.
              </p>
            </div>

            <DataTable
              columns={distributionColumns}
              data={filteredDistributionRegisterRows}
              isLoading={isLoading}
              pageSize={8}
              searchPlaceholder="Search pack distribution..."
              actions={(row) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={row.documents.length === 0}
                    onClick={() => handlePreviewPack(row.source, row.documents)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={row.documents.length === 0}
                    onClick={() => handleExportPack(row.source, row.documents)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {row.distributionStatus === "Ready To Issue" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        row.source.unapprovedCount > 0 ||
                        packActionId === row.source.id ||
                        !isReleaseAuthority
                      }
                      onClick={() => openPackIssueDialog(row.source)}
                    >
                      <Wand2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {row.distributionStatus === "Issued - Not Sent" ||
                  row.distributionStatus === "Sent - Awaiting Signature" ||
                  row.distributionStatus === "Signature Overdue" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={packActionId === row.source.id}
                      onClick={() => openPackDispatchDialog(row.source)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {row.distributionStatus === "Sent - Awaiting Signature" ||
                  row.distributionStatus === "Issued - Not Sent" ||
                  row.distributionStatus === "Signature Overdue" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={packActionId === row.source.id}
                      onClick={() => openPackAcknowledgementDialog(row.source)}
                    >
                      <PenLine className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DocumentKind)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Templates</TabsTrigger>
            <TabsTrigger value="generated">Generated</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Template Library</CardTitle>
                <CardDescription>
                  Templates stay editable and reusable. They can be issue-controlled, branded per branch, and generated into student-linked documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">Template Control Register</h3>
                      <p className="text-sm text-muted-foreground">
                        Review the current controlled issue for each template family, see historical issues, and move to the next issue cleanly.
                      </p>
                    </div>
                    <Badge variant="secondary">{templateControlRows.length}</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {templateControlRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No template families have been created yet.
                      </div>
                    ) : (
                      templateControlRows.slice(0, 8).map((row) => (
                        <div key={row.id} className="rounded-lg border p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">{row.title}</p>
                                  <Badge variant="outline">{row.documentCode}</Badge>
                                  <Badge
                                    variant="secondary"
                                  className={getTemplateStatusClass(row.currentStatus)}
                                  >
                                    {row.currentStatus}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={getApprovalStatusClass(row.currentTemplate.approvalStatus)}
                                  >
                                    {row.currentTemplate.approvalStatus}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={getValidationStatusClass(
                                      templateValidationById.get(row.currentTemplate.id)?.status ||
                                        "Needs Attention"
                                    )}
                                  >
                                    {templateValidationById.get(row.currentTemplate.id)?.status ||
                                      "Needs Attention"}
                                  </Badge>
                                </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{row.category}</span>
                                <span>Current issue {row.currentIssueNumber}</span>
                                {row.currentEffectiveDate ? (
                                  <span>Effective {formatDate(row.currentEffectiveDate)}</span>
                                ) : null}
                                <span>{row.issueCount} issue{row.issueCount === 1 ? "" : "s"}</span>
                                <span>{row.usageCount} generated</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDocumentPreview(row.currentTemplate)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Preview Current
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTokenAssistant(row.currentTemplate)}
                              >
                                <Code2 className="mr-2 h-4 w-4" />
                                Token Assistant
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openValidationWizard(row.currentTemplate)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Validate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openLayoutDesigner(row.currentTemplate)}
                              >
                                <Layers3 className="mr-2 h-4 w-4" />
                                Layout
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTemplateRevisionDialog(row.currentTemplate)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Next Issue
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {row.issueHistory.map((issue) => (
                              <Badge
                                key={issue.id}
                                variant="secondary"
                                className={getTemplateStatusClass(issue.status)}
                              >
                                {issue.issueNumber}
                                {issue.effectiveDate
                                  ? ` | ${formatDate(issue.effectiveDate)}`
                                  : ""}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-xl border bg-background p-4">
                  <h3 className="font-semibold">Placeholder Reference</h3>
                  <div className="mt-3 space-y-4">
                    {placeholderReferenceGroups.map(([category, placeholders]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {placeholders.length} token{placeholders.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {placeholders.map((placeholder) => (
                            <div key={placeholder.key} className="rounded-lg border px-3 py-2 text-sm">
                              <p className="font-mono text-xs">{placeholder.key}</p>
                              <p className="mt-1 text-muted-foreground">{placeholder.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <DataTable
                  columns={templateColumns}
                  data={templateRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search templates..."
                  onRowClick={(row) => openEditEditor(row)}
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasDocumentLink(row.url)}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocumentLink(row.url);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocumentPreview(row);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openGenerateDialog(row);
                        }}
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTokenAssistant(row);
                        }}
                      >
                        <Code2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openValidationWizard(row);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openLayoutDesigner(row);
                        }}
                      >
                        <Layers3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTemplateRevisionDialog(row);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleExport(row);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditEditor(row);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {renderDocumentApprovalActions(row)}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                          handleDelete(row);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          <Card>
              <CardHeader>
                <CardTitle>Generated Documents</CardTitle>
                <CardDescription>
                  These are document instances created from templates and linked to a training context. Use revision control when a correction is needed so the previous version is preserved.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-medium text-emerald-900">Learner Packs Complete</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-900">
                      {packSummary.learnerComplete}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-900">Lecturer Packs Complete</p>
                    <p className="mt-2 text-3xl font-bold text-blue-900">
                      {packSummary.lecturerComplete}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">Packs Needing Attention</p>
                    <p className="mt-2 text-3xl font-bold text-amber-900">
                      {packSummary.incomplete}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Learner Pack Control</h3>
                        <p className="text-sm text-muted-foreground">
                          Check whether each learner pack has all active student-side templates.
                        </p>
                      </div>
                      <Badge variant="secondary">{learnerPackRows.length}</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {learnerPackRows.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No learner-pack document sets found yet.
                        </div>
                      ) : (
                        learnerPackRows.slice(0, 6).map((row) => {
                          const packDocuments =
                            (row.enrollmentId &&
                              learnerPackDocumentsByEnrollment.get(row.enrollmentId)) ||
                            [];

                          return (
                            <div key={row.id} className="rounded-lg border p-3">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <p className="font-medium">{row.contextLabel}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{row.branchName}</span>
                                    <span>{row.completedCount}/{row.requiredCount} complete</span>
                                    {row.latestCreatedAt ? (
                                      <span>Latest {formatDate(row.latestCreatedAt)}</span>
                                    ) : null}
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={getPackProgressClass(row.status)}
                                >
                                  {row.status}
                                </Badge>
                              </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{row.issuedCount} issued</span>
                                  <span>{row.correctedCount} corrected</span>
                                  <span>{row.draftCount} draft</span>
                                  <span>{row.unapprovedCount} awaiting approval</span>
                                  <span>{row.acknowledgedCount} acknowledged</span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {row.missingTemplates.length === 0
                                    ? row.unapprovedCount > 0
                                      ? "All active learner-pack templates are present, but release is still waiting for formal approval."
                                      : "All active learner-pack templates are present."
                                    : `Missing: ${row.missingTemplates.join(", ")}`}
                                </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={packDocuments.length === 0}
                                  onClick={() => handlePreviewPack(row, packDocuments)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Preview Pack
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={packDocuments.length === 0}
                                  onClick={() => handleExportPack(row, packDocuments)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Export Pack
                                </Button>
                                {row.missingTemplates.length > 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                      row.requiredCount === 0 || packActionId === row.id
                                    }
                                    onClick={() => handleGenerateMissingLearnerPack(row)}
                                  >
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Generate Missing
                                  </Button>
                                ) : row.isFullyIssued ? (
                                  <>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        row.isFullyAcknowledged
                                          ? "bg-indigo-100 text-indigo-800"
                                          : "bg-emerald-100 text-emerald-800"
                                      }
                                    >
                                      {row.isFullyAcknowledged ? "Pack Acknowledged" : "Pack Issued"}
                                    </Badge>
                                    {!row.isFullyAcknowledged ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={packActionId === row.id}
                                        onClick={() => openPackAcknowledgementDialog(row)}
                                      >
                                        <PenLine className="mr-2 h-4 w-4" />
                                        Acknowledge
                                      </Button>
                                    ) : null}
                                  </>
                                ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        row.requiredCount === 0 ||
                                        packActionId === row.id ||
                                        row.unapprovedCount > 0 ||
                                        !isReleaseAuthority
                                      }
                                      onClick={() => openPackIssueDialog(row)}
                                    >
                                      <Wand2 className="mr-2 h-4 w-4" />
                                      Issue Pack
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">Lecturer Pack Control</h3>
                        <p className="text-sm text-muted-foreground">
                          Check whether each schedule has the full lecturer-pack set.
                        </p>
                      </div>
                      <Badge variant="secondary">{lecturerPackRows.length}</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {lecturerPackRows.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          No lecturer-pack document sets found yet.
                        </div>
                      ) : (
                        lecturerPackRows.slice(0, 6).map((row) => {
                          const packDocuments =
                            (row.scheduleId &&
                              lecturerPackDocumentsBySchedule.get(row.scheduleId)) ||
                            [];

                          return (
                            <div key={row.id} className="rounded-lg border p-3">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <p className="font-medium">{row.contextLabel}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{row.branchName}</span>
                                    <span>{row.completedCount}/{row.requiredCount} complete</span>
                                    {row.latestCreatedAt ? (
                                      <span>Latest {formatDate(row.latestCreatedAt)}</span>
                                    ) : null}
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={getPackProgressClass(row.status)}
                                >
                                  {row.status}
                                </Badge>
                              </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{row.issuedCount} issued</span>
                                  <span>{row.correctedCount} corrected</span>
                                  <span>{row.draftCount} draft</span>
                                  <span>{row.unapprovedCount} awaiting approval</span>
                                  <span>{row.acknowledgedCount} acknowledged</span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {row.missingTemplates.length === 0
                                    ? row.unapprovedCount > 0
                                      ? "All active lecturer-pack templates are present, but release is still waiting for formal approval."
                                      : "All active lecturer-pack templates are present."
                                    : `Missing: ${row.missingTemplates.join(", ")}`}
                                </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={packDocuments.length === 0}
                                  onClick={() => handlePreviewPack(row, packDocuments)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  Preview Pack
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={packDocuments.length === 0}
                                  onClick={() => handleExportPack(row, packDocuments)}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  Export Pack
                                </Button>
                                {row.missingTemplates.length > 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={
                                      row.requiredCount === 0 || packActionId === row.id
                                    }
                                    onClick={() => handleGenerateMissingLecturerPack(row)}
                                  >
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Generate Missing
                                  </Button>
                                ) : row.isFullyIssued ? (
                                  <>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        row.isFullyAcknowledged
                                          ? "bg-indigo-100 text-indigo-800"
                                          : "bg-emerald-100 text-emerald-800"
                                      }
                                    >
                                      {row.isFullyAcknowledged ? "Pack Acknowledged" : "Pack Issued"}
                                    </Badge>
                                    {!row.isFullyAcknowledged ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={packActionId === row.id}
                                        onClick={() => openPackAcknowledgementDialog(row)}
                                      >
                                        <PenLine className="mr-2 h-4 w-4" />
                                        Acknowledge
                                      </Button>
                                    ) : null}
                                  </>
                                ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={
                                        row.requiredCount === 0 ||
                                        packActionId === row.id ||
                                        row.unapprovedCount > 0 ||
                                        !isReleaseAuthority
                                      }
                                      onClick={() => openPackIssueDialog(row)}
                                    >
                                      <Wand2 className="mr-2 h-4 w-4" />
                                      Issue Pack
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <DataTable
                  columns={generatedColumns}
                  data={generatedRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search generated documents..."
                  onRowClick={(row) => openEditEditor(row)}
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocumentPreview(row);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleExport(row);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRevisionDialog(row);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openLayoutDesigner(row);
                          }}
                        >
                          <Layers3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditEditor(row);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {renderDocumentApprovalActions(row)}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                          handleDelete(row);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Document Library</CardTitle>
                <CardDescription>
                  Keep general editable documents here when they are not part of the template-generation flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={libraryColumns}
                  data={libraryRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search library documents..."
                  onRowClick={(row) => openEditEditor(row)}
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDocumentPreview(row);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleExport(row);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openLayoutDesigner(row);
                        }}
                      >
                        <Layers3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditEditor(row);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(row);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FormDialog
          open={isEditorOpen}
          onOpenChange={(open) => {
            setIsEditorOpen(open);
            if (!open) {
              setEditingDocument(null);
              setEditorSeedValues(null);
            }
          }}
          title={
            editingDocument
              ? `Edit ${editorKind === "template" ? "Template" : "Document"}`
              : editorKind === "template"
              ? "Add Template"
              : "Add Library Document"
          }
          description={
            editorKind === "template"
              ? "Templates remain editable and reusable. Use placeholders to pull live training data into generated documents."
              : editorKind === "generated"
              ? "Generated documents stay editable after generation so corrections can be made without flattening the file."
              : "Create a styled editable document for the library."
          }
          onSubmit={handleEditorSubmit}
          initialValues={buildInitialValues(editingDocument, editorKind, editorSeedValues)}
          fields={editorFields}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />

        <FormDialog
          open={isTemplateRevisionOpen}
          onOpenChange={(open) => {
            setIsTemplateRevisionOpen(open);
            if (!open) {
              setTemplateRevisionSource(null);
            }
          }}
          title="Create Next Template Issue"
          description={
            templateRevisionSource
              ? `Create the next controlled issue from "${templateRevisionSource.title}". The current active issue can be archived automatically.`
              : "Create the next issue from an existing template."
          }
          onSubmit={async (values) => {
            try {
              if (!templateRevisionSource) {
                throw new Error("Please select a template first.");
              }

              const title = String(values.title || "").trim();
              const content = String(values.content || "").trim();
              if (!title || !content) {
                throw new Error("Title and content are required.");
              }

              await reviseTemplateMutation.mutateAsync({
                documentId: templateRevisionSource.id,
                title,
                description: String(values.description || "").trim() || null,
                content,
                documentCode: String(values.documentCode || "").trim() || null,
                issueNumber: String(values.issueNumber || "").trim() || null,
                effectiveDate: String(values.effectiveDate || "").trim() || null,
                templateStatus: String(values.templateStatus || "Active") as
                  | "Draft"
                  | "Active"
                  | "Archived",
                revisionReason: String(values.revisionReason || "").trim() || null,
                supersedeSource: Boolean(values.supersedeSource ?? true),
              });

              toast.success("Next template issue created");
              setIsTemplateRevisionOpen(false);
              setTemplateRevisionSource(null);
              setActiveTab("template");
              await refetch();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to create the next template issue"
              );
            }
          }}
          initialValues={{
            title: templateRevisionSource?.title || "",
            description: templateRevisionSource?.description || "",
            documentCode: templateRevisionSource?.documentCode || "",
            issueNumber: incrementDocumentIssueNumber(templateRevisionSource?.issueNumber || "01"),
            effectiveDate: new Date().toISOString().slice(0, 10),
            templateStatus: "Active",
            revisionReason: "",
            supersedeSource: true,
            content: templateRevisionSource?.content || "",
          }}
          fields={[
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
            },
            {
              name: "description",
              label: "Subtitle",
              type: "text",
            },
            {
              name: "documentCode",
              label: "Document Code",
              type: "text",
              required: true,
            },
            {
              name: "issueNumber",
              label: "Issue Number",
              type: "text",
              required: true,
            },
            {
              name: "effectiveDate",
              label: "Effective Date",
              type: "date",
            },
            {
              name: "templateStatus",
              label: "New Issue Status",
              type: "select",
              options: TEMPLATE_STATUS_OPTIONS,
              required: true,
            },
            {
              name: "revisionReason",
              label: "Issue Change Note",
              type: "textarea",
              placeholder: "Summarise what changed in this new controlled issue.",
            },
            {
              name: "supersedeSource",
              label: "Archive Current Template If Replaced",
              type: "checkbox",
            },
            {
              name: "content",
              label: "Revised Template HTML Content",
              type: "textarea",
              required: true,
            },
          ]}
          isLoading={reviseTemplateMutation.isPending}
          submitLabel="Create Next Issue"
        />

        <FormDialog
          open={isRevisionOpen}
          onOpenChange={(open) => {
            setIsRevisionOpen(open);
            if (!open) {
              setRevisionSourceDocument(null);
            }
          }}
          title="Create Corrected Revision"
          description={
            revisionSourceDocument
              ? `Create a new version from "${revisionSourceDocument.title}". The current version will be marked as superseded.`
              : "Create a corrected revision from an existing generated document."
          }
          onSubmit={async (values) => {
            try {
              if (!revisionSourceDocument) {
                throw new Error("Please select a generated document first.");
              }

              const title = String(values.title || "").trim();
              const content = String(values.content || "").trim();
              if (!title || !content) {
                throw new Error("Title and content are required.");
              }

              await reviseGeneratedMutation.mutateAsync({
                documentId: revisionSourceDocument.id,
                title,
                description: String(values.description || "").trim() || null,
                content,
                generatedStatus: String(values.generatedStatus || "Corrected") as GeneratedStatus,
                revisionReason: String(values.revisionReason || "").trim() || null,
                supersedeSource: true,
              });

              toast.success("Corrected revision created");
              setIsRevisionOpen(false);
              setRevisionSourceDocument(null);
              setActiveTab("generated");
              await refetch();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to create revision"
              );
            }
          }}
          initialValues={{
            title: revisionSourceDocument?.title || "",
            description: revisionSourceDocument?.description || "",
            content: revisionSourceDocument?.content || "",
            generatedStatus: "Corrected",
            revisionReason: "",
          }}
          fields={[
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
            },
            {
              name: "description",
              label: "Subtitle",
              type: "text",
            },
            {
              name: "generatedStatus",
              label: "New Version Status",
              type: "select",
              options: GENERATED_STATUS_OPTIONS.filter(
                (option) => option.value !== "Superseded"
              ),
              required: true,
            },
            {
              name: "revisionReason",
              label: "Correction Note",
              type: "textarea",
              placeholder: "Summarise what was corrected in this new version.",
            },
            {
              name: "content",
              label: "Revised HTML Content",
              type: "textarea",
              required: true,
            },
          ]}
          isLoading={reviseGeneratedMutation.isPending}
          submitLabel="Create Revision"
        />

        <FormDialog
          open={isPackIssueOpen}
          onOpenChange={(open) => {
            setIsPackIssueOpen(open);
            if (!open) {
              setPackIssueTarget(null);
            }
          }}
          title={
            packIssueTarget
              ? `Issue ${packIssueTarget.packType}`
              : "Issue Pack"
          }
          description={
            packIssueTarget
              ? `Confirm release for ${packIssueTarget.contextLabel}. This will stamp the current effective documents with issue details.`
              : "Confirm release details for the selected pack."
          }
          onSubmit={async (values) => {
            if (!packIssueTarget) {
              throw new Error("Please select a pack to issue.");
            }

            const issueNote = String(values.issueNote || "").trim() || undefined;
            if (packIssueTarget.packType === "Learner Pack") {
              await handleIssueLearnerPack(packIssueTarget, issueNote);
            } else {
              await handleIssueLecturerPack(packIssueTarget, issueNote);
            }
            setIsPackIssueOpen(false);
            setPackIssueTarget(null);
          }}
          initialValues={{
            issueNote: "",
          }}
          fields={[
            {
              name: "issueNote",
              label: "Release Note",
              type: "textarea",
              placeholder:
                "Optional note for this release, for example final checked and ready for issuing.",
            },
          ]}
          isLoading={issueStudentPackMutation.isPending || issueSchedulePackMutation.isPending}
          submitLabel="Issue Pack"
        />

        <FormDialog
          open={isPackDispatchOpen}
          onOpenChange={(open) => {
            setIsPackDispatchOpen(open);
            if (!open) {
              setPackDispatchTarget(null);
            }
          }}
          title={
            packDispatchTarget
              ? `Record Dispatch | ${packDispatchTarget.packType}`
              : "Record Pack Dispatch"
          }
          description={
            packDispatchTarget
              ? `Record how the issued pack was sent for ${packDispatchTarget.contextLabel}.`
              : "Record how this issued pack was distributed for signature."
          }
          onSubmit={async (values) => {
            if (!packDispatchTarget) {
              throw new Error("Please select a pack to dispatch.");
            }

            if (packDispatchTarget.packType === "Learner Pack") {
              await handleDispatchLearnerPack(packDispatchTarget, values);
            } else {
              await handleDispatchLecturerPack(packDispatchTarget, values);
            }

            setIsPackDispatchOpen(false);
            setPackDispatchTarget(null);
          }}
          initialValues={{
            recipientName:
              packDispatchTarget?.distributedToName ||
              (packDispatchTarget?.packType === "Learner Pack"
                ? packDispatchTarget.contextLabel.split("|")[0]?.trim()
                : ""),
            recipientEmail: packDispatchTarget?.distributedToEmail || "",
            distributionMethod: packDispatchTarget?.distributionMethod || "Email",
            signatureDueDate:
              packDispatchTarget?.signatureDueDate ||
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            distributionNote: "",
          }}
          fields={[
            {
              name: "recipientName",
              label: "Recipient Name",
              type: "text",
              required: true,
            },
            {
              name: "recipientEmail",
              label: "Recipient Email",
              type: "email",
              placeholder: "Optional email address",
            },
            {
              name: "distributionMethod",
              label: "Distribution Method",
              type: "select",
              options: distributionMethodOptions,
              required: true,
            },
            {
              name: "signatureDueDate",
              label: "Signature Due Date",
              type: "date",
            },
            {
              name: "distributionNote",
              label: "Distribution Note",
              type: "textarea",
              placeholder: "Optional note, for example sent by email or handed to lecturer.",
            },
          ]}
          isLoading={dispatchStudentPackMutation.isPending || dispatchSchedulePackMutation.isPending}
          submitLabel="Record Dispatch"
        />

        <Dialog
          open={isPackAcknowledgementOpen}
          onOpenChange={(open) => {
            setIsPackAcknowledgementOpen(open);
            if (!open) {
              setPackAcknowledgementTarget(null);
              setAcknowledgementSignerName("");
              setAcknowledgementSignerRole("");
              setAcknowledgementNote("");
              setHasSignatureStroke(false);
            }
          }}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {packAcknowledgementTarget
                  ? `Digital Acknowledgement | ${packAcknowledgementTarget.packType}`
                  : "Digital Acknowledgement"}
              </DialogTitle>
              <DialogDescription>
                Capture the receiver details and drawn signature for the issued pack.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {packAcknowledgementTarget ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">{packAcknowledgementTarget.contextLabel}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{packAcknowledgementTarget.branchName}</span>
                    <span>{packAcknowledgementTarget.issuedCount} issued documents</span>
                    {packAcknowledgementTarget.acknowledgedCount > 0 ? (
                      <span>{packAcknowledgementTarget.acknowledgedCount} already acknowledged</span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="acknowledgement-signer-name">Signer Name</Label>
                  <Input
                    id="acknowledgement-signer-name"
                    value={acknowledgementSignerName}
                    onChange={(event) => setAcknowledgementSignerName(event.target.value)}
                    placeholder="Name of person signing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acknowledgement-signer-role">Signer Role</Label>
                  <Input
                    id="acknowledgement-signer-role"
                    value={acknowledgementSignerRole}
                    onChange={(event) => setAcknowledgementSignerRole(event.target.value)}
                    placeholder="Learner, lecturer, representative..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="acknowledgement-note">Acknowledgement Note</Label>
                <Textarea
                  id="acknowledgement-note"
                  value={acknowledgementNote}
                  onChange={(event) => setAcknowledgementNote(event.target.value)}
                  placeholder="Optional note, for example received electronically or signed in person."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Digital Signature</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={initialiseSignatureCanvas}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <canvas
                  ref={signatureCanvasRef}
                  width={900}
                  height={220}
                  className="h-48 w-full touch-none rounded-lg border bg-white"
                  onPointerDown={handleSignaturePointerDown}
                  onPointerMove={handleSignaturePointerMove}
                  onPointerUp={stopSignatureDrawing}
                  onPointerLeave={stopSignatureDrawing}
                  aria-label="Digital signature pad"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPackAcknowledgementOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePackAcknowledgementSubmit}
                disabled={
                  acknowledgeStudentPackMutation.isPending ||
                  acknowledgeSchedulePackMutation.isPending ||
                  packActionId === packAcknowledgementTarget?.id
                }
              >
                <PenLine className="mr-2 h-4 w-4" />
                Save Signature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FormDialog
          open={isApprovalDialogOpen}
          onOpenChange={(open) => {
            setIsApprovalDialogOpen(open);
            if (!open) {
              setApprovalTarget(null);
            }
          }}
          title={
            approvalMode === "approve"
              ? approvalTarget
                ? `Approve ${approvalTarget.kind === "template" ? "Template" : "Document"}`
                : "Approve Document"
              : approvalTarget
              ? `Reject ${approvalTarget.kind === "template" ? "Template" : "Document"}`
              : "Reject Document"
          }
          description={
            approvalTarget
              ? approvalMode === "approve"
                ? `Record the release authority details for "${approvalTarget.title}".`
                : `Capture the rejection reason for "${approvalTarget.title}".`
              : "Capture the review outcome for the selected document."
          }
          onSubmit={async (values) => {
            if (!approvalTarget) {
              throw new Error("Please select a document first.");
            }

            try {
              if (approvalMode === "approve") {
                await approveDocumentMutation.mutateAsync({
                  id: approvalTarget.id,
                  approvalNote: String(values.approvalNote || "").trim() || null,
                  releaseAuthority: String(values.releaseAuthority || "").trim() || null,
                  releaseAuthorityRole:
                    String(values.releaseAuthorityRole || "").trim() || null,
                });
                toast.success("Document approved");
              } else {
                const rejectionReason = String(values.rejectionReason || "").trim();
                if (!rejectionReason) {
                  throw new Error("Rejection reason is required.");
                }
                await rejectDocumentMutation.mutateAsync({
                  id: approvalTarget.id,
                  rejectionReason,
                });
                toast.success("Document rejected");
              }

              setIsApprovalDialogOpen(false);
              setApprovalTarget(null);
              await refetch();
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Failed to save approval decision"
              );
            }
          }}
          initialValues={{
            approvalNote: "",
            rejectionReason: "",
            releaseAuthority: user?.name || user?.email || "",
            releaseAuthorityRole:
              user?.role === "super_admin"
                ? "Super Admin"
                : user?.role === "admin"
                ? "Admin"
                : "User",
          }}
          fields={
            approvalMode === "approve"
              ? [
                  {
                    name: "releaseAuthority",
                    label: "Release Authority",
                    type: "text",
                    required: true,
                  },
                  {
                    name: "releaseAuthorityRole",
                    label: "Authority Role",
                    type: "text",
                    required: true,
                  },
                  {
                    name: "approvalNote",
                    label: "Approval Note",
                    type: "textarea",
                    placeholder: "Optional note for the approval decision or release conditions.",
                  },
                ]
              : [
                  {
                    name: "rejectionReason",
                    label: "Rejection Reason",
                    type: "textarea",
                    required: true,
                    placeholder: "Explain what must be corrected before this document can be approved.",
                  },
                ]
          }
          isLoading={approveDocumentMutation.isPending || rejectDocumentMutation.isPending}
          submitLabel={approvalMode === "approve" ? "Approve" : "Reject"}
        />

        <Dialog
          open={isTokenAssistantOpen}
          onOpenChange={(open) => {
            setIsTokenAssistantOpen(open);
            if (!open) {
              setTokenAssistantTemplate(null);
              setTokenAssistantContent("");
              setTokenAssistantSearch("");
            }
          }}
        >
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>
                {tokenAssistantTemplate
                  ? `Template Token Assistant | ${tokenAssistantTemplate.title}`
                  : "Template Token Assistant"}
              </DialogTitle>
              <DialogDescription>
                Insert live placeholders into the template HTML without leaving the document workflow.
                Saving will reset approval back to Draft for this controlled template.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-[1.1fr,1.4fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token-assistant-search">Find placeholders</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="token-assistant-search"
                      value={tokenAssistantSearch}
                      onChange={(event) => setTokenAssistantSearch(event.target.value)}
                      placeholder="Search by token, description, or category"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="max-h-[440px] space-y-4 overflow-y-auto rounded-xl border p-4">
                  {groupedPlaceholderReference.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No placeholders match this search yet.
                    </div>
                  ) : (
                    groupedPlaceholderReference.map(([category, placeholders]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {placeholders.length} token{placeholders.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {placeholders.map((placeholder) => (
                            <button
                              key={placeholder.key}
                              type="button"
                              className="w-full rounded-lg border px-3 py-2 text-left transition hover:border-primary hover:bg-accent"
                              onClick={() => insertPlaceholderAtCursor(placeholder.key)}
                            >
                              <p className="font-mono text-xs">{placeholder.key}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {placeholder.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token-assistant-content">Template HTML Content</Label>
                <Textarea
                  id="token-assistant-content"
                  ref={tokenAssistantTextareaRef}
                  value={tokenAssistantContent}
                  onChange={(event) => setTokenAssistantContent(event.target.value)}
                  placeholder="<h2>{{courseLabel}}</h2><p>Use placeholders like {{studentName}}.</p>"
                  className="min-h-[520px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: click a placeholder on the left to insert it at the current cursor position.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsTokenAssistantOpen(false);
                  setTokenAssistantTemplate(null);
                  setTokenAssistantContent("");
                  setTokenAssistantSearch("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTokenAssistant} disabled={updateMutation.isPending}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isValidationWizardOpen}
          onOpenChange={(open) => {
            setIsValidationWizardOpen(open);
            if (!open) {
              setValidationTemplate(null);
              setValidationContent("");
              setValidationSearch("");
              setValidationMappings({});
            }
          }}
        >
          <DialogContent className="max-w-7xl">
            <DialogHeader>
              <DialogTitle>
                {validationTemplate
                  ? `Template Validation Wizard | ${validationTemplate.title}`
                  : "Template Validation Wizard"}
              </DialogTitle>
              <DialogDescription>
                Check imported or edited templates before review, map invalid placeholders to the
                correct system fields, and close any required gaps. Templates with errors cannot be
                submitted for review.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 xl:grid-cols-[1.15fr,1.4fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium">Validation Status</p>
                    <div className="mt-2">
                      <Badge
                        variant="secondary"
                        className={getValidationStatusClass(validationWizardResult.status)}
                      >
                        {validationWizardResult.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {validationWizardResult.canSubmitForReview
                        ? "This template can move into review."
                        : "Fix errors before submitting this template for review."}
                    </p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-900">Tokens Found</p>
                    <p className="mt-2 text-3xl font-bold text-blue-900">
                      {validationWizardResult.foundKeys.length}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                      {validationWizardResult.knownKeys.length} recognised system tokens
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-medium text-rose-900">Errors</p>
                    <p className="mt-2 text-3xl font-bold text-rose-900">
                      {validationWizardResult.unknownKeys.length +
                        validationWizardResult.missingRequiredKeys.length}
                    </p>
                    <p className="mt-1 text-xs text-rose-700">
                      Unknown or required placeholders still need attention
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-medium text-amber-900">Warnings</p>
                    <p className="mt-2 text-3xl font-bold text-amber-900">
                      {validationWizardResult.missingRecommendedKeys.length}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Suggested placeholders that may strengthen document context
                    </p>
                  </div>
                </div>

                <div className="max-h-[560px] space-y-4 overflow-y-auto rounded-xl border p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">Required For This Template</h3>
                      <Badge variant="outline">
                        {validationProfile.required.length} required
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {validationProfile.required.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          This template does not have any strict required placeholders yet.
                        </div>
                      ) : (
                        validationProfile.required.map((key) => {
                          const definition = getPlaceholderDefinition(key);
                          const isPresent = validationWizardResult.foundKeys.includes(key);

                          return (
                            <div key={key} className="rounded-lg border p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-mono text-xs">{toPlaceholderToken(key)}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {definition?.description || "Required system token"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className={
                                      isPresent
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-rose-100 text-rose-800"
                                    }
                                  >
                                    {isPresent ? "Present" : "Missing"}
                                  </Badge>
                                  {!isPresent ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => insertValidationPlaceholderAtCursor(key)}
                                    >
                                      Insert
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Unknown Placeholders</h3>
                    {validationWizardResult.unknownKeys.length === 0 ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        No invalid placeholders were found in this template.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {validationWizardResult.unknownKeys.map((key) => (
                          <div key={key} className="rounded-lg border p-3">
                            <div className="flex flex-col gap-3">
                              <div>
                                <p className="font-mono text-xs text-rose-700">
                                  {toPlaceholderToken(key)}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  This token is not recognised by the system. Map it to a valid
                                  placeholder or edit it manually.
                                </p>
                              </div>
                              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr),auto]">
                                <Select
                                  value={validationMappings[key] || undefined}
                                  onValueChange={(value) =>
                                    setValidationMappings((currentValue) => ({
                                      ...currentValue,
                                      [key]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Map to a valid placeholder" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredPlaceholderOptions.map((placeholder) => (
                                      <SelectItem key={placeholder.key} value={placeholder.key}>
                                        {placeholder.key} | {placeholder.description}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  onClick={() => applyValidationMapping(key)}
                                >
                                  Replace All
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Recommended Placeholders</h3>
                    {validationWizardResult.missingRecommendedKeys.length === 0 ? (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                        All recommended placeholders for this template are already present.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {validationWizardResult.missingRecommendedKeys.map((key) => {
                          const definition = getPlaceholderDefinition(key);
                          return (
                            <div key={key} className="rounded-lg border p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-mono text-xs">{toPlaceholderToken(key)}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {definition?.description || "Recommended system token"}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => insertValidationPlaceholderAtCursor(key)}
                                >
                                  Insert
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Current Token Usage</h3>
                    {validationWizardResult.foundKeys.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        No placeholders are in the template yet.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {validationWizardResult.foundKeys.map((key) => {
                          const definition = getPlaceholderDefinition(key);
                          return (
                            <Badge key={key} variant="outline" className="gap-2">
                              {toPlaceholderToken(key)}
                              <span className="text-muted-foreground">
                                x{validationWizardResult.tokenUsage[key] || 1}
                              </span>
                              {!definition ? (
                                <span className="text-rose-700">invalid</span>
                              ) : null}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="validation-search">Quick Token Filter</Label>
                    <Input
                      id="validation-search"
                      value={validationSearch}
                      onChange={(event) => setValidationSearch(event.target.value)}
                      placeholder="Filter mapping options and token suggestions"
                      className="w-full md:w-80"
                    />
                  </div>
                  {validationTemplate ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const activeTemplate = validationTemplate;
                        setIsValidationWizardOpen(false);
                        setValidationTemplate(null);
                        setValidationContent("");
                        setValidationSearch("");
                        setValidationMappings({});
                        openTokenAssistant({
                          ...activeTemplate,
                          content: validationContent,
                        });
                      }}
                    >
                      <Code2 className="mr-2 h-4 w-4" />
                      Open Token Assistant
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-xl border p-4">
                  <Label htmlFor="validation-content">Template HTML Content</Label>
                  <Textarea
                    id="validation-content"
                    ref={validationTextareaRef}
                    value={validationContent}
                    onChange={(event) => setValidationContent(event.target.value)}
                    className="mt-2 min-h-[560px] font-mono text-xs"
                    placeholder="<h2>{{courseLabel}}</h2><p>Review, correct, and map placeholders here.</p>"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Replace broken tokens on the left, insert missing ones here, and save when the
                    validation status is ready. Saving resets approval back to Draft.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsValidationWizardOpen(false);
                  setValidationTemplate(null);
                  setValidationContent("");
                  setValidationSearch("");
                  setValidationMappings({});
                }}
              >
                Close
              </Button>
              <Button onClick={handleSaveValidationTemplate} disabled={updateMutation.isPending}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isLayoutDesignerOpen}
          onOpenChange={(open) => {
            setIsLayoutDesignerOpen(open);
            if (!open) {
              setLayoutTarget(null);
              setLayoutDraft(getDefaultDocumentLayout());
            }
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {layoutTarget
                  ? `Document Layout Designer | ${layoutTarget.title}`
                  : "Document Layout Designer"}
              </DialogTitle>
              <DialogDescription>
                Control the form presentation around the editable content, including header style,
                footer copy, signature blocks, and section styling. Saving layout changes resets
                approval to Draft for controlled templates and generated documents.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4 rounded-xl border p-4">
                <div className="space-y-2">
                  <Label>Header Style</Label>
                  <Select
                    value={layoutDraft.headerStyle}
                    onValueChange={(value) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        headerStyle: value as Required<DocumentLayout>["headerStyle"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title Alignment</Label>
                  <Select
                    value={layoutDraft.titleAlign}
                    onValueChange={(value) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        titleAlign: value as Required<DocumentLayout>["titleAlign"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section Style</Label>
                  <Select
                    value={layoutDraft.sectionStyle}
                    onValueChange={(value) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        sectionStyle: value as Required<DocumentLayout>["sectionStyle"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="boxed">Boxed Headings</SelectItem>
                      <SelectItem value="ruled">Ruled Headings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Page Spacing</Label>
                  <Select
                    value={layoutDraft.spacing}
                    onValueChange={(value) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        spacing: value as Required<DocumentLayout>["spacing"],
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <input
                    id="show-control-table"
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={layoutDraft.showControlTable}
                    onChange={(event) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        showControlTable: event.target.checked,
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="show-control-table">Show control metadata table</Label>
                    <p className="text-xs text-muted-foreground">
                      Include document code, issue, effective date, release reference, and approval
                      details in preview and export.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-3">
                  <input
                    id="show-signature-block"
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={layoutDraft.showSignatureBlock}
                    onChange={(event) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        showSignatureBlock: event.target.checked,
                      }))
                    }
                  />
                  <div className="space-y-1">
                    <Label htmlFor="show-signature-block">Show signature block</Label>
                    <p className="text-xs text-muted-foreground">
                      Add prepared-by and approval signature lines below the editable content.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border p-4">
                <div className="space-y-2">
                  <Label htmlFor="layout-footer-text">Footer Text</Label>
                  <Input
                    id="layout-footer-text"
                    value={layoutDraft.footerText}
                    onChange={(event) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        footerText: event.target.value,
                      }))
                    }
                    placeholder="Controlled copy, branch address, or issue footer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="layout-footer-note">Footer Note</Label>
                  <Textarea
                    id="layout-footer-note"
                    value={layoutDraft.footerNote}
                    onChange={(event) =>
                      setLayoutDraft((currentValue) => ({
                        ...currentValue,
                        footerNote: event.target.value,
                      }))
                    }
                    placeholder="Optional compliance note, disclaimer, or reference note"
                    className="min-h-[96px]"
                  />
                </div>

                {layoutDraft.showSignatureBlock ? (
                  <>
                    <div className="space-y-2">
                      <Label>Signature Layout</Label>
                      <Select
                        value={layoutDraft.signatureLayout}
                        onValueChange={(value) =>
                          setLayoutDraft((currentValue) => ({
                            ...currentValue,
                            signatureLayout:
                              value as Required<DocumentLayout>["signatureLayout"],
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single Signature</SelectItem>
                          <SelectItem value="dual">Dual Signature</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="primary-signature-label">Primary Signature Label</Label>
                      <Input
                        id="primary-signature-label"
                        value={layoutDraft.primarySignatureLabel}
                        onChange={(event) =>
                          setLayoutDraft((currentValue) => ({
                            ...currentValue,
                            primarySignatureLabel: event.target.value,
                          }))
                        }
                        placeholder="Prepared By"
                      />
                    </div>

                    {layoutDraft.signatureLayout === "dual" ? (
                      <div className="space-y-2">
                        <Label htmlFor="secondary-signature-label">Secondary Signature Label</Label>
                        <Input
                          id="secondary-signature-label"
                          value={layoutDraft.secondarySignatureLabel}
                          onChange={(event) =>
                            setLayoutDraft((currentValue) => ({
                              ...currentValue,
                              secondarySignatureLabel: event.target.value,
                            }))
                          }
                          placeholder="Approved By"
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium">Layout Summary</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>Header: {layoutDraft.headerStyle}</li>
                    <li>Title alignment: {layoutDraft.titleAlign}</li>
                    <li>Sections: {layoutDraft.sectionStyle}</li>
                    <li>Spacing: {layoutDraft.spacing}</li>
                    <li>Control table: {layoutDraft.showControlTable ? "Shown" : "Hidden"}</li>
                    <li>
                      Signature block:{" "}
                      {layoutDraft.showSignatureBlock
                        ? layoutDraft.signatureLayout === "dual"
                          ? "Dual"
                          : "Single"
                        : "Hidden"}
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsLayoutDesignerOpen(false);
                  setLayoutTarget(null);
                  setLayoutDraft(getDefaultDocumentLayout());
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveLayoutDesigner} disabled={updateMutation.isPending}>
                Save Layout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <FormDialog
          open={isGenerateOpen}
          onOpenChange={(open) => {
            setIsGenerateOpen(open);
            if (!open) {
              setGenerateFormValues({});
            }
          }}
          title="Generate From Template"
          description="Select a template, student, and enrolment. The document is generated with live training data and remains editable afterward."
          onSubmit={async (values) => {
            try {
              const templateId = Number(values.templateId);
              const studentId = Number(values.studentId);
              const enrollmentId = Number(values.enrollmentId);
              if (!Number.isFinite(templateId) || !Number.isFinite(studentId) || !Number.isFinite(enrollmentId)) {
                throw new Error("Template, student, and enrolment are required.");
              }

              await generateFromTemplateMutation.mutateAsync({
                templateId,
                studentId,
                enrollmentId,
                titleOverride: String(values.titleOverride || "").trim() || null,
                descriptionOverride: String(values.descriptionOverride || "").trim() || null,
                generatedStatus: String(values.generatedStatus || "Draft") as GeneratedStatus,
              });
              toast.success("Document generated");
              setIsGenerateOpen(false);
              setGenerateFormValues({});
              setActiveTab("generated");
              await refetch();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to generate document");
            }
          }}
          initialValues={{
            templateId: String(generateFormValues.templateId || ""),
            studentId: "",
            enrollmentId: "",
            generatedStatus: "Draft",
            titleOverride: "",
            descriptionOverride: "",
          }}
          fields={[
            {
              name: "templateId",
              label: "Template",
              type: "select",
              options: templateOptions,
              required: true,
            },
            {
              name: "studentId",
              label: "Student",
              type: "select",
              options: studentOptions,
              required: true,
            },
            {
              name: "enrollmentId",
              label: "Enrolment",
              type: "select",
              options: enrollmentOptions,
              required: true,
              disabled: !selectedGenerateStudentId,
              placeholder: selectedGenerateStudentId ? "Select enrolment" : "Select student first",
            },
            {
              name: "generatedStatus",
              label: "Initial Status",
              type: "select",
              options: GENERATED_STATUS_OPTIONS,
              required: true,
            },
            {
              name: "titleOverride",
              label: "Title Override",
              type: "text",
              placeholder: "Leave blank to use the template title",
            },
            {
              name: "descriptionOverride",
              label: "Subtitle Override",
              type: "text",
              placeholder: "Leave blank to use the template subtitle",
            },
          ]}
          onValuesChange={setGenerateFormValues}
          normalizeValues={(nextValues, change) => {
            if (change.name !== "studentId") {
              return nextValues;
            }

            return {
              ...nextValues,
              enrollmentId: "",
            };
          }}
          isLoading={generateFromTemplateMutation.isPending}
        />

        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title="Import Library Documents"
          description="Map your file columns to library document fields. Imported documents are treated as manual library items, not templates."
          targetFields={[
            { key: "title", label: "Title", required: true, aliases: ["document title", "name"] },
            { key: "description", label: "Description", required: false, aliases: ["details", "summary"] },
            { key: "documentType", label: "Document Type", required: false, aliases: ["type", "category"] },
            { key: "branchId", label: "Branch ID or Name", required: false, aliases: ["branch", "branch name", "branch code"] },
            { key: "accentColor", label: "Accent Colour", required: false, aliases: ["accent color", "colour", "color"] },
            { key: "content", label: "HTML Content", required: false, aliases: ["body", "document body", "html"] },
            { key: "url", label: "External URL", required: false, aliases: ["link", "external link", "website"] },
          ]}
          onImport={async (rows) => {
            for (const row of rows) {
              const branchValue = String(row.branchId || "").trim();
              const numericBranchId = Number(branchValue);
              const branch = typedBranches.find((item) =>
                Number.isFinite(numericBranchId)
                  ? item.id === numericBranchId
                  : item.name.toLowerCase() === branchValue.toLowerCase()
              );

              await createMutation.mutateAsync({
                title: String(row.title || "").trim(),
                description: String(row.description || "").trim() || undefined,
                documentType: String(row.documentType || "Other"),
                content: String(row.content || "").trim() || DEFAULT_LIBRARY_CONTENT,
                branchId: branch?.id ?? undefined,
                url: String(row.url || "").trim() || "about:blank",
                tags: {
                  kind: "library",
                  accentColor: String(row.accentColor || branch?.primaryColor || "#0f766e"),
                  logoUrl: branch?.logoUrl || "",
                  companyName: branch?.companyName || branch?.name || "TextPoint",
                  branchName: branch?.name || "",
                  branchId: branch?.id,
                  version: 1,
                },
              });
            }

            toast.success("Library documents imported");
            setIsImportOpen(false);
            await refetch();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
