import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { formatDateInputValue, parseDateInputValue } from "@shared/scheduling";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Edit2,
  FileSearch,
  FileWarning,
  Plus,
  Scale,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type QualityCategory =
  | "Nonconformance"
  | "Corrective Action"
  | "Observation"
  | "Improvement";
type QualitySource =
  | "Customer Complaint"
  | "Internal Audit"
  | "Supplier"
  | "Training"
  | "Examination"
  | "Level III"
  | "Equipment"
  | "Document Control"
  | "Management Review"
  | "Other";
type QualitySeverity = "Minor" | "Major" | "Critical";
type QualityStatus = "Open" | "In Progress" | "Awaiting Verification" | "Closed";
type QualityAuditType =
  | "Internal Audit"
  | "Process Audit"
  | "Training Audit"
  | "Equipment Audit"
  | "Document Audit"
  | "Branch Audit";
type QualityAuditStatus = "Planned" | "In Progress" | "Completed" | "Cancelled";
type ManagementReviewStatus = "Planned" | "Held" | "Closed" | "Cancelled";
type ExternalProviderType =
  | "Lecturer"
  | "Assessor"
  | "Calibration"
  | "Consumables"
  | "Venue"
  | "Equipment"
  | "Level III Consultant"
  | "Document / Printing"
  | "Other";
type ExternalProviderStatus =
  | "Approved"
  | "Conditional"
  | "Under Review"
  | "Suspended"
  | "Inactive";
type ExternalProviderRating = "Preferred" | "Acceptable" | "Probationary";
type QualityTab = "actions" | "audits" | "reviews" | "providers";

type QualityAction = {
  id: number;
  referenceNumber: string;
  title: string;
  category: QualityCategory;
  source: QualitySource;
  severity: QualitySeverity;
  status: QualityStatus;
  branchId: number | null;
  ownerName: string | null;
  reportedByUserId: number | null;
  reportedDate: string | Date;
  dueDate: string | Date | null;
  closedAt: string | Date | null;
  description: string;
  immediateCorrection: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  verificationNotes: string | null;
  verifiedByName: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type QualityAudit = {
  id: number;
  referenceNumber: string;
  title: string;
  auditType: QualityAuditType;
  status: QualityAuditStatus;
  branchId: number | null;
  leadAuditor: string | null;
  auditee: string | null;
  plannedDate: string | Date;
  completedDate: string | Date | null;
  nextAuditDate: string | Date | null;
  scope: string;
  criteria: string | null;
  summary: string | null;
  findingsSummary: string | null;
  followUpSummary: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ManagementReview = {
  id: number;
  referenceNumber: string;
  title: string;
  status: ManagementReviewStatus;
  branchId: number | null;
  meetingDate: string | Date;
  nextReviewDate: string | Date | null;
  chairperson: string | null;
  attendees: string | null;
  agenda: string | null;
  inputsSummary: string | null;
  decisionsSummary: string | null;
  actionSummary: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ExternalProvider = {
  id: number;
  referenceNumber: string;
  companyName: string;
  providerType: ExternalProviderType;
  status: ExternalProviderStatus;
  rating: ExternalProviderRating;
  branchId: number | null;
  primaryContact: string | null;
  email: string | null;
  phone: string | null;
  serviceScope: string;
  approvalDate: string | Date | null;
  lastEvaluationDate: string | Date | null;
  nextEvaluationDate: string | Date | null;
  notes: string | null;
  correctiveActionNotes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type Branch = {
  id: number;
  name: string;
};

type QualityRow = QualityAction & {
  branchName: string;
  dueLabel: string;
  overdue: boolean;
};

type AuditRow = QualityAudit & {
  branchName: string;
  plannedLabel: string;
  overdue: boolean;
};

type ReviewRow = ManagementReview & {
  branchName: string;
  meetingLabel: string;
  overdue: boolean;
};

type ProviderRow = ExternalProvider & {
  branchName: string;
  nextEvaluationLabel: string;
  overdue: boolean;
};

type QualityAttentionItem = {
  id: string;
  tab: QualityTab;
  recordId: number;
  source: string;
  referenceNumber: string;
  title: string;
  status: string;
  branchName: string;
  owner: string;
  dueDate: string | Date | null;
  dueLabel: string;
  daysUntilDue: number;
  priority: "critical" | "high" | "normal";
  reason: string;
};

const ALL_BRANCHES_VALUE = "__all_branches__";
const SYSTEM_WIDE_BRANCH_VALUE = "__system_wide__";
const FORM_SYSTEM_WIDE_BRANCH_VALUE = "__form_system_wide__";
const ALL_STATUS_VALUE = "__all_status__";
const ALL_CATEGORY_VALUE = "__all_category__";
const ALL_AUDIT_TYPE_VALUE = "__all_audit_type__";
const ALL_REVIEW_STATUS_VALUE = "__all_review_status__";
const ALL_PROVIDER_TYPE_VALUE = "__all_provider_type__";
const ALL_PROVIDER_STATUS_VALUE = "__all_provider_status__";

const CATEGORY_OPTIONS: Array<{ value: QualityCategory; label: string }> = [
  { value: "Nonconformance", label: "Nonconformance" },
  { value: "Corrective Action", label: "Corrective Action" },
  { value: "Observation", label: "Observation" },
  { value: "Improvement", label: "Improvement" },
];

const SOURCE_OPTIONS: Array<{ value: QualitySource; label: string }> = [
  { value: "Customer Complaint", label: "Customer Complaint" },
  { value: "Internal Audit", label: "Internal Audit" },
  { value: "Supplier", label: "Supplier" },
  { value: "Training", label: "Training" },
  { value: "Examination", label: "Examination" },
  { value: "Level III", label: "Level III" },
  { value: "Equipment", label: "Equipment" },
  { value: "Document Control", label: "Document Control" },
  { value: "Management Review", label: "Management Review" },
  { value: "Other", label: "Other" },
];

const SEVERITY_OPTIONS: Array<{ value: QualitySeverity; label: string }> = [
  { value: "Minor", label: "Minor" },
  { value: "Major", label: "Major" },
  { value: "Critical", label: "Critical" },
];

const STATUS_OPTIONS: Array<{ value: QualityStatus; label: string }> = [
  { value: "Open", label: "Open" },
  { value: "In Progress", label: "In Progress" },
  { value: "Awaiting Verification", label: "Awaiting Verification" },
  { value: "Closed", label: "Closed" },
];

const AUDIT_TYPE_OPTIONS: Array<{ value: QualityAuditType; label: string }> = [
  { value: "Internal Audit", label: "Internal Audit" },
  { value: "Process Audit", label: "Process Audit" },
  { value: "Training Audit", label: "Training Audit" },
  { value: "Equipment Audit", label: "Equipment Audit" },
  { value: "Document Audit", label: "Document Audit" },
  { value: "Branch Audit", label: "Branch Audit" },
];

const AUDIT_STATUS_OPTIONS: Array<{ value: QualityAuditStatus; label: string }> = [
  { value: "Planned", label: "Planned" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const REVIEW_STATUS_OPTIONS: Array<{ value: ManagementReviewStatus; label: string }> = [
  { value: "Planned", label: "Planned" },
  { value: "Held", label: "Held" },
  { value: "Closed", label: "Closed" },
  { value: "Cancelled", label: "Cancelled" },
];

const PROVIDER_TYPE_OPTIONS: Array<{ value: ExternalProviderType; label: string }> = [
  { value: "Lecturer", label: "Lecturer" },
  { value: "Assessor", label: "Assessor" },
  { value: "Calibration", label: "Calibration" },
  { value: "Consumables", label: "Consumables" },
  { value: "Venue", label: "Venue" },
  { value: "Equipment", label: "Equipment" },
  { value: "Level III Consultant", label: "Level III Consultant" },
  { value: "Document / Printing", label: "Document / Printing" },
  { value: "Other", label: "Other" },
];

const PROVIDER_STATUS_OPTIONS: Array<{
  value: ExternalProviderStatus;
  label: string;
}> = [
  { value: "Approved", label: "Approved" },
  { value: "Conditional", label: "Conditional" },
  { value: "Under Review", label: "Under Review" },
  { value: "Suspended", label: "Suspended" },
  { value: "Inactive", label: "Inactive" },
];

const PROVIDER_RATING_OPTIONS: Array<{
  value: ExternalProviderRating;
  label: string;
}> = [
  { value: "Preferred", label: "Preferred" },
  { value: "Acceptable", label: "Acceptable" },
  { value: "Probationary", label: "Probationary" },
];

function parseDateValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | Date | null | undefined) {
  const parsed = parseDateValue(value);
  return parsed
    ? parsed.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function isPastDate(value: string | Date | null | undefined) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function getDaysUntilDate(value: string | Date | null | undefined) {
  const parsed = parseDateValue(value);
  if (!parsed) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  return Math.ceil((parsed.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function getAttentionDueLabel(daysUntilDue: number, value: string | Date | null | undefined) {
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} day(s) overdue`;
  if (daysUntilDue === 0) return "Due today";
  return `Due in ${daysUntilDue} day(s) | ${formatDate(value)}`;
}

function getAttentionPriority(daysUntilDue: number): QualityAttentionItem["priority"] {
  if (daysUntilDue < 0) return "critical";
  if (daysUntilDue <= 2) return "high";
  return "normal";
}

function getAttentionPriorityBadgeClass(priority: QualityAttentionItem["priority"]) {
  switch (priority) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200";
  }
}

function shouldShowAttentionItem(daysUntilDue: number | null, windowDays = 7) {
  return daysUntilDue !== null && daysUntilDue <= windowDays;
}

function isQualityActionOverdue(
  dueDate: string | Date | null | undefined,
  status: QualityStatus
) {
  return Boolean(dueDate) && status !== "Closed" && isPastDate(dueDate);
}

function isAuditOverdue(
  plannedDate: string | Date | null | undefined,
  status: QualityAuditStatus
) {
  return (
    Boolean(plannedDate) &&
    status !== "Completed" &&
    status !== "Cancelled" &&
    isPastDate(plannedDate)
  );
}

function isReviewOverdue(
  meetingDate: string | Date | null | undefined,
  status: ManagementReviewStatus
) {
  return (
    Boolean(meetingDate) &&
    status !== "Held" &&
    status !== "Closed" &&
    status !== "Cancelled" &&
    isPastDate(meetingDate)
  );
}

function getSeverityBadgeClass(severity: QualitySeverity) {
  switch (severity) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "Major":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getStatusBadgeClass(status: QualityStatus) {
  switch (status) {
    case "Closed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Awaiting Verification":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "In Progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getAuditStatusBadgeClass(status: QualityAuditStatus) {
  switch (status) {
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Cancelled":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "In Progress":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getReviewStatusBadgeClass(status: ManagementReviewStatus) {
  switch (status) {
    case "Closed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Held":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Cancelled":
      return "border-slate-200 bg-slate-50 text-slate-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function getDueLabel(row: QualityAction) {
  if (!row.dueDate) return "No due date";
  return isQualityActionOverdue(row.dueDate, row.status)
    ? `Overdue since ${formatDate(row.dueDate)}`
    : formatDate(row.dueDate);
}

function getPlannedLabel(row: QualityAudit) {
  return isAuditOverdue(row.plannedDate, row.status)
    ? `Past due since ${formatDate(row.plannedDate)}`
    : formatDate(row.plannedDate);
}

function getMeetingLabel(row: ManagementReview) {
  return isReviewOverdue(row.meetingDate, row.status)
    ? `Past due since ${formatDate(row.meetingDate)}`
    : formatDate(row.meetingDate);
}

function isProviderOverdue(
  nextEvaluationDate: string | Date | null | undefined,
  status: ExternalProviderStatus
) {
  return (
    Boolean(nextEvaluationDate) &&
    status !== "Inactive" &&
    status !== "Suspended" &&
    isPastDate(nextEvaluationDate)
  );
}

function getProviderStatusBadgeClass(status: ExternalProviderStatus) {
  switch (status) {
    case "Approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Conditional":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Under Review":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Suspended":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function getProviderNextEvaluationLabel(row: ExternalProvider) {
  if (!row.nextEvaluationDate) return "No evaluation date";
  return isProviderOverdue(row.nextEvaluationDate, row.status)
    ? `Overdue since ${formatDate(row.nextEvaluationDate)}`
    : formatDate(row.nextEvaluationDate);
}

type QualityDeepLink = {
  tab: QualityTab | null;
  actionId: number | null;
  auditId: number | null;
  reviewId: number | null;
  providerId: number | null;
};

type HighlightedQualityRecord = {
  tab: QualityTab;
  id: number;
};

function getPositiveQueryNumber(params: URLSearchParams, key: string) {
  const rawId = params.get(key);
  const parsedId = rawId ? Number(rawId) : NaN;

  return Number.isFinite(parsedId) && parsedId > 0 ? parsedId : null;
}

function getQualityDeepLink(): QualityDeepLink {
  if (typeof window === "undefined") {
    return {
      tab: null,
      actionId: null,
      auditId: null,
      reviewId: null,
      providerId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const validTab =
    tab === "actions" || tab === "audits" || tab === "reviews" || tab === "providers"
      ? tab
      : null;

  return {
    tab: validTab,
    actionId: getPositiveQueryNumber(params, "actionId"),
    auditId: getPositiveQueryNumber(params, "auditId"),
    reviewId: getPositiveQueryNumber(params, "reviewId"),
    providerId: getPositiveQueryNumber(params, "providerId"),
  };
}

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<QualityTab>("actions");
  const qualityDeepLink = useMemo(getQualityDeepLink, []);

  const [actionBranchFilter, setActionBranchFilter] = useState(ALL_BRANCHES_VALUE);
  const [actionStatusFilter, setActionStatusFilter] = useState(ALL_STATUS_VALUE);
  const [actionCategoryFilter, setActionCategoryFilter] = useState(ALL_CATEGORY_VALUE);
  const [selectedActionId, setSelectedActionId] = useState<number | null>(null);
  const [highlightedRecord, setHighlightedRecord] =
    useState<HighlightedQualityRecord | null>(null);
  const [isActionFormOpen, setIsActionFormOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<QualityAction | null>(null);
  const [actionFormError, setActionFormError] = useState<string | null>(null);

  const [auditBranchFilter, setAuditBranchFilter] = useState(ALL_BRANCHES_VALUE);
  const [auditStatusFilter, setAuditStatusFilter] = useState(ALL_STATUS_VALUE);
  const [auditTypeFilter, setAuditTypeFilter] = useState(ALL_AUDIT_TYPE_VALUE);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [isAuditFormOpen, setIsAuditFormOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<QualityAudit | null>(null);
  const [auditFormError, setAuditFormError] = useState<string | null>(null);

  const [reviewBranchFilter, setReviewBranchFilter] = useState(ALL_BRANCHES_VALUE);
  const [reviewStatusFilter, setReviewStatusFilter] = useState(ALL_REVIEW_STATUS_VALUE);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ManagementReview | null>(null);
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);

  const [providerBranchFilter, setProviderBranchFilter] = useState(ALL_BRANCHES_VALUE);
  const [providerStatusFilter, setProviderStatusFilter] = useState(
    ALL_PROVIDER_STATUS_VALUE
  );
  const [providerTypeFilter, setProviderTypeFilter] = useState(
    ALL_PROVIDER_TYPE_VALUE
  );
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [isProviderFormOpen, setIsProviderFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ExternalProvider | null>(null);
  const [providerFormError, setProviderFormError] = useState<string | null>(null);

  const {
    data: qualityActions = [],
    isLoading: qualityActionsLoading,
    refetch: refetchActions,
  } = trpc.quality.list.useQuery();
  const {
    data: qualityAudits = [],
    isLoading: qualityAuditsLoading,
    refetch: refetchAudits,
  } = trpc.quality.audits.list.useQuery();
  const {
    data: managementReviews = [],
    isLoading: managementReviewsLoading,
    refetch: refetchReviews,
  } = trpc.quality.reviews.list.useQuery();
  const {
    data: externalProviders = [],
    isLoading: externalProvidersLoading,
    refetch: refetchProviders,
  } = trpc.quality.providers.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();

  const createActionMutation = trpc.quality.create.useMutation();
  const updateActionMutation = trpc.quality.update.useMutation();
  const deleteActionMutation = trpc.quality.delete.useMutation();
  const createAuditMutation = trpc.quality.audits.create.useMutation();
  const updateAuditMutation = trpc.quality.audits.update.useMutation();
  const deleteAuditMutation = trpc.quality.audits.delete.useMutation();
  const createReviewMutation = trpc.quality.reviews.create.useMutation();
  const updateReviewMutation = trpc.quality.reviews.update.useMutation();
  const deleteReviewMutation = trpc.quality.reviews.delete.useMutation();
  const createProviderMutation = trpc.quality.providers.create.useMutation();
  const updateProviderMutation = trpc.quality.providers.update.useMutation();
  const deleteProviderMutation = trpc.quality.providers.delete.useMutation();

  const typedActions = qualityActions as QualityAction[];
  const typedAudits = qualityAudits as QualityAudit[];
  const typedReviews = managementReviews as ManagementReview[];
  const typedProviders = externalProviders as ExternalProvider[];
  const typedBranches = branches as Branch[];

  const branchMap = useMemo(
    () => new Map(typedBranches.map((branch) => [branch.id, branch.name])),
    [typedBranches]
  );

  const getBranchName = (branchId: number | null | undefined) =>
    branchId ? branchMap.get(branchId) || "Unknown Branch" : "System-wide";

  const branchFilterOptions = useMemo(
    () => [
      { value: ALL_BRANCHES_VALUE, label: "All branches" },
      { value: SYSTEM_WIDE_BRANCH_VALUE, label: "System-wide only" },
      ...typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [typedBranches]
  );

  const formBranchOptions = useMemo(
    () => [
      { value: FORM_SYSTEM_WIDE_BRANCH_VALUE, label: "System-wide / no branch" },
      ...typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [typedBranches]
  );

  const actionRows = useMemo<QualityRow[]>(
    () =>
      typedActions.map((row) => ({
        ...row,
        branchName: row.branchId
          ? branchMap.get(row.branchId) || "Unknown Branch"
          : "System-wide",
        dueLabel: getDueLabel(row),
        overdue: isQualityActionOverdue(row.dueDate, row.status),
      })),
    [branchMap, typedActions]
  );

  const filteredActionRows = useMemo(() => {
    return actionRows.filter((row) => {
      if (actionBranchFilter === SYSTEM_WIDE_BRANCH_VALUE && row.branchId !== null) {
        return false;
      }

      if (
        actionBranchFilter !== ALL_BRANCHES_VALUE &&
        actionBranchFilter !== SYSTEM_WIDE_BRANCH_VALUE &&
        String(row.branchId ?? "") !== actionBranchFilter
      ) {
        return false;
      }

      if (actionStatusFilter !== ALL_STATUS_VALUE && row.status !== actionStatusFilter) {
        return false;
      }

      if (actionCategoryFilter !== ALL_CATEGORY_VALUE && row.category !== actionCategoryFilter) {
        return false;
      }

      return true;
    });
  }, [actionBranchFilter, actionCategoryFilter, actionRows, actionStatusFilter]);

  useEffect(() => {
    if (!filteredActionRows.length) {
      setSelectedActionId(null);
      return;
    }

    if (!filteredActionRows.some((row) => row.id === selectedActionId)) {
      setSelectedActionId(filteredActionRows[0].id);
    }
  }, [filteredActionRows, selectedActionId]);

  const selectedAction =
    filteredActionRows.find((row) => row.id === selectedActionId) ||
    actionRows.find((row) => row.id === selectedActionId) ||
    null;

  useEffect(() => {
    if (qualityDeepLink.tab && !qualityDeepLink.actionId) {
      setActiveTab(qualityDeepLink.tab);
    }

    if (!qualityDeepLink.actionId) return;

    const linkedAction = actionRows.find((row) => row.id === qualityDeepLink.actionId);
    if (!linkedAction) return;

    setActiveTab("actions");
    setActionBranchFilter(ALL_BRANCHES_VALUE);
    setActionStatusFilter(ALL_STATUS_VALUE);
    setActionCategoryFilter(ALL_CATEGORY_VALUE);
    setSelectedActionId(linkedAction.id);
    setHighlightedRecord({ tab: "actions", id: linkedAction.id });
  }, [actionRows, qualityDeepLink]);

  useEffect(() => {
    if (!highlightedRecord) return;

    const timer = window.setTimeout(() => {
      setHighlightedRecord(null);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [highlightedRecord]);

  const actionSummary = useMemo(
    () => ({
      open: filteredActionRows.filter((row) => row.status === "Open").length,
      overdue: filteredActionRows.filter((row) => row.overdue).length,
      awaitingVerification: filteredActionRows.filter(
        (row) => row.status === "Awaiting Verification"
      ).length,
      closed: filteredActionRows.filter((row) => row.status === "Closed").length,
    }),
    [filteredActionRows]
  );

  const actionColumns: Column<QualityRow>[] = [
    {
      key: "referenceNumber",
      label: "Reference",
      sortable: true,
      filterable: true,
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.source}</div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "severity",
      label: "Severity",
      sortable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className={getSeverityBadgeClass(value as QualitySeverity)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className={getStatusBadgeClass(value as QualityStatus)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "branchName",
      label: "Branch",
      sortable: true,
      filterable: true,
    },
    {
      key: "ownerName",
      label: "Owner",
      sortable: true,
      render: (value) => String(value || "Unassigned"),
    },
    {
      key: "dueLabel",
      label: "Due",
      render: (_value, row) => (
        <span className={row.overdue ? "font-medium text-red-600" : ""}>
          {row.dueLabel}
        </span>
      ),
    },
  ];

  const actionFormFields = useMemo<FormField[]>(
    () => [
      {
        name: "referenceNumber",
        label: "Reference Number",
        type: "text",
        placeholder: "Auto-generated if left blank",
        section: "Classification",
      },
      {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        placeholder: "Short description of the finding",
      },
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        options: CATEGORY_OPTIONS,
      },
      {
        name: "source",
        label: "Source",
        type: "select",
        required: true,
        options: SOURCE_OPTIONS,
      },
      {
        name: "severity",
        label: "Severity",
        type: "select",
        required: true,
        options: SEVERITY_OPTIONS,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        name: "branchId",
        label: "Branch",
        type: "select",
        options: formBranchOptions,
      },
      {
        name: "ownerName",
        label: "Owner",
        type: "text",
        placeholder: "Responsible person",
      },
      {
        name: "reportedDate",
        label: "Reported Date",
        type: "date",
        required: true,
        section: "Dates & Scope",
      },
      {
        name: "dueDate",
        label: "Target Closure Date",
        type: "date",
      },
      {
        name: "description",
        label: "Issue Description",
        type: "textarea",
        required: true,
        placeholder: "Describe the issue, evidence, and impact",
        section: "Finding",
      },
      {
        name: "immediateCorrection",
        label: "Immediate Correction",
        type: "textarea",
        placeholder: "Containment or immediate correction taken",
        section: "Correction & Cause",
      },
      {
        name: "rootCause",
        label: "Root Cause",
        type: "textarea",
        placeholder: "Underlying cause identified",
      },
      {
        name: "correctiveAction",
        label: "Corrective Action",
        type: "textarea",
        placeholder: "Permanent action to prevent recurrence",
      },
      {
        name: "verificationNotes",
        label: "Verification Notes",
        type: "textarea",
        placeholder: "How closure/effectiveness was verified",
        section: "Verification & Close-Out",
      },
      {
        name: "verifiedByName",
        label: "Verified By",
        type: "text",
        placeholder: "Verifier name",
      },
    ],
    [formBranchOptions]
  );

  const actionInitialValues = editingAction
    ? {
        referenceNumber: editingAction.referenceNumber,
        title: editingAction.title,
        category: editingAction.category,
        source: editingAction.source,
        severity: editingAction.severity,
        status: editingAction.status,
        branchId:
          editingAction.branchId === null
            ? FORM_SYSTEM_WIDE_BRANCH_VALUE
            : String(editingAction.branchId),
        ownerName: editingAction.ownerName || "",
        reportedDate: formatDateInputValue(editingAction.reportedDate),
        dueDate: editingAction.dueDate
          ? formatDateInputValue(editingAction.dueDate)
          : "",
        description: editingAction.description,
        immediateCorrection: editingAction.immediateCorrection || "",
        rootCause: editingAction.rootCause || "",
        correctiveAction: editingAction.correctiveAction || "",
        verificationNotes: editingAction.verificationNotes || "",
        verifiedByName: editingAction.verifiedByName || "",
      }
    : {
        referenceNumber: "",
        title: "",
        category: "Nonconformance",
        source: "Other",
        severity: "Minor",
        status: "Open",
        branchId: FORM_SYSTEM_WIDE_BRANCH_VALUE,
        ownerName: "",
        reportedDate: formatDateInputValue(new Date()),
        dueDate: "",
        description: "",
        immediateCorrection: "",
        rootCause: "",
        correctiveAction: "",
        verificationNotes: "",
        verifiedByName: "",
      };

  const handleActionSubmit = async (values: Record<string, unknown>) => {
    setActionFormError(null);

    try {
      const reportedDate = parseDateInputValue(String(values.reportedDate ?? "").trim());
      const dueDateRaw = String(values.dueDate ?? "").trim();
      const branchValue = String(values.branchId ?? FORM_SYSTEM_WIDE_BRANCH_VALUE);

      const payload = {
        referenceNumber: String(values.referenceNumber ?? "").trim() || null,
        title: String(values.title ?? "").trim(),
        category: values.category as QualityCategory,
        source: values.source as QualitySource,
        severity: values.severity as QualitySeverity,
        status: values.status as QualityStatus,
        branchId:
          branchValue === FORM_SYSTEM_WIDE_BRANCH_VALUE ? null : Number(branchValue),
        ownerName: String(values.ownerName ?? "").trim() || null,
        reportedDate,
        dueDate: dueDateRaw ? parseDateInputValue(dueDateRaw) : null,
        description: String(values.description ?? "").trim(),
        immediateCorrection:
          String(values.immediateCorrection ?? "").trim() || null,
        rootCause: String(values.rootCause ?? "").trim() || null,
        correctiveAction:
          String(values.correctiveAction ?? "").trim() || null,
        verificationNotes:
          String(values.verificationNotes ?? "").trim() || null,
        verifiedByName: String(values.verifiedByName ?? "").trim() || null,
      };

      if (editingAction) {
        await updateActionMutation.mutateAsync({
          id: editingAction.id,
          data: payload,
        });
        toast.success("Quality action updated.");
      } else {
        await createActionMutation.mutateAsync(payload);
        toast.success("Quality action logged.");
      }

      await refetchActions();
      setIsActionFormOpen(false);
      setEditingAction(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save quality action.";
      setActionFormError(message);
      toast.error(message);
    }
  };

  const handleActionDelete = async (row: QualityRow) => {
    const confirmed = window.confirm(
      `Delete quality action ${row.referenceNumber}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteActionMutation.mutateAsync({ id: row.id });
      toast.success("Quality action deleted.");
      await refetchActions();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete quality action."
      );
    }
  };

  const auditRows = useMemo<AuditRow[]>(
    () =>
      typedAudits.map((row) => ({
        ...row,
        branchName: row.branchId
          ? branchMap.get(row.branchId) || "Unknown Branch"
          : "System-wide",
        plannedLabel: getPlannedLabel(row),
        overdue: isAuditOverdue(row.plannedDate, row.status),
      })),
    [branchMap, typedAudits]
  );

  const filteredAuditRows = useMemo(() => {
    return auditRows.filter((row) => {
      if (auditBranchFilter === SYSTEM_WIDE_BRANCH_VALUE && row.branchId !== null) {
        return false;
      }

      if (
        auditBranchFilter !== ALL_BRANCHES_VALUE &&
        auditBranchFilter !== SYSTEM_WIDE_BRANCH_VALUE &&
        String(row.branchId ?? "") !== auditBranchFilter
      ) {
        return false;
      }

      if (auditStatusFilter !== ALL_STATUS_VALUE && row.status !== auditStatusFilter) {
        return false;
      }

      if (auditTypeFilter !== ALL_AUDIT_TYPE_VALUE && row.auditType !== auditTypeFilter) {
        return false;
      }

      return true;
    });
  }, [auditBranchFilter, auditRows, auditStatusFilter, auditTypeFilter]);

  useEffect(() => {
    if (!filteredAuditRows.length) {
      setSelectedAuditId(null);
      return;
    }

    if (!filteredAuditRows.some((row) => row.id === selectedAuditId)) {
      setSelectedAuditId(filteredAuditRows[0].id);
    }
  }, [filteredAuditRows, selectedAuditId]);

  const selectedAudit =
    filteredAuditRows.find((row) => row.id === selectedAuditId) ||
    auditRows.find((row) => row.id === selectedAuditId) ||
    null;

  useEffect(() => {
    if (!qualityDeepLink.auditId) return;

    const linkedAudit = auditRows.find((row) => row.id === qualityDeepLink.auditId);
    if (!linkedAudit) return;

    setActiveTab("audits");
    setAuditBranchFilter(ALL_BRANCHES_VALUE);
    setAuditStatusFilter(ALL_STATUS_VALUE);
    setAuditTypeFilter(ALL_AUDIT_TYPE_VALUE);
    setSelectedAuditId(linkedAudit.id);
    setHighlightedRecord({ tab: "audits", id: linkedAudit.id });
  }, [auditRows, qualityDeepLink]);

  const auditSummary = useMemo(
    () => ({
      open: filteredAuditRows.filter(
        (row) => row.status === "Planned" || row.status === "In Progress"
      ).length,
      overdue: filteredAuditRows.filter((row) => row.overdue).length,
      completed: filteredAuditRows.filter((row) => row.status === "Completed").length,
      nextCycle: filteredAuditRows.filter((row) => row.nextAuditDate).length,
    }),
    [filteredAuditRows]
  );

  const auditColumns: Column<AuditRow>[] = [
    {
      key: "referenceNumber",
      label: "Reference",
      sortable: true,
      filterable: true,
    },
    {
      key: "title",
      label: "Audit",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.auditType}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className={getAuditStatusBadgeClass(value as QualityAuditStatus)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "branchName",
      label: "Branch",
      sortable: true,
      filterable: true,
    },
    {
      key: "leadAuditor",
      label: "Lead Auditor",
      sortable: true,
      render: (value) => String(value || "Not assigned"),
    },
    {
      key: "plannedLabel",
      label: "Planned",
      render: (_value, row) => (
        <span className={row.overdue ? "font-medium text-red-600" : ""}>
          {row.plannedLabel}
        </span>
      ),
    },
  ];

  const auditFormFields = useMemo<FormField[]>(
    () => [
      {
        name: "referenceNumber",
        label: "Reference Number",
        type: "text",
        placeholder: "Auto-generated if left blank",
        section: "Audit Control",
      },
      {
        name: "title",
        label: "Audit Title",
        type: "text",
        required: true,
        placeholder: "Internal audit of branch, process, or discipline",
      },
      {
        name: "auditType",
        label: "Audit Type",
        type: "select",
        required: true,
        options: AUDIT_TYPE_OPTIONS,
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: AUDIT_STATUS_OPTIONS,
      },
      {
        name: "branchId",
        label: "Branch",
        type: "select",
        options: formBranchOptions,
      },
      {
        name: "leadAuditor",
        label: "Lead Auditor",
        type: "text",
        placeholder: "Lead auditor or responsible reviewer",
      },
      {
        name: "auditee",
        label: "Auditee / Area Owner",
        type: "text",
        placeholder: "Process owner, branch lead, or department",
      },
      {
        name: "plannedDate",
        label: "Planned Date",
        type: "date",
        required: true,
        section: "Schedule",
      },
      {
        name: "completedDate",
        label: "Completed Date",
        type: "date",
      },
      {
        name: "nextAuditDate",
        label: "Next Audit Date",
        type: "date",
      },
      {
        name: "scope",
        label: "Scope",
        type: "textarea",
        required: true,
        placeholder: "Scope of the audit, affected processes, locations, or services",
        section: "Content",
      },
      {
        name: "criteria",
        label: "Criteria",
        type: "textarea",
        placeholder: "QMS clauses, procedures, work instructions, or customer requirements",
      },
      {
        name: "summary",
        label: "Audit Summary",
        type: "textarea",
        placeholder: "General observations and context from the audit",
      },
      {
        name: "findingsSummary",
        label: "Findings Summary",
        type: "textarea",
        placeholder: "Key findings, strengths, or nonconformances raised",
      },
      {
        name: "followUpSummary",
        label: "Follow-up Summary",
        type: "textarea",
        placeholder: "Expected follow-up, linked actions, or next steps",
      },
    ],
    [formBranchOptions]
  );

  const auditInitialValues = editingAudit
    ? {
        referenceNumber: editingAudit.referenceNumber,
        title: editingAudit.title,
        auditType: editingAudit.auditType,
        status: editingAudit.status,
        branchId:
          editingAudit.branchId === null
            ? FORM_SYSTEM_WIDE_BRANCH_VALUE
            : String(editingAudit.branchId),
        leadAuditor: editingAudit.leadAuditor || "",
        auditee: editingAudit.auditee || "",
        plannedDate: formatDateInputValue(editingAudit.plannedDate),
        completedDate: editingAudit.completedDate
          ? formatDateInputValue(editingAudit.completedDate)
          : "",
        nextAuditDate: editingAudit.nextAuditDate
          ? formatDateInputValue(editingAudit.nextAuditDate)
          : "",
        scope: editingAudit.scope,
        criteria: editingAudit.criteria || "",
        summary: editingAudit.summary || "",
        findingsSummary: editingAudit.findingsSummary || "",
        followUpSummary: editingAudit.followUpSummary || "",
      }
    : {
        referenceNumber: "",
        title: "",
        auditType: "Internal Audit",
        status: "Planned",
        branchId: FORM_SYSTEM_WIDE_BRANCH_VALUE,
        leadAuditor: "",
        auditee: "",
        plannedDate: formatDateInputValue(new Date()),
        completedDate: "",
        nextAuditDate: "",
        scope: "",
        criteria: "",
        summary: "",
        findingsSummary: "",
        followUpSummary: "",
      };

  const handleAuditSubmit = async (values: Record<string, unknown>) => {
    setAuditFormError(null);

    try {
      const plannedDate = parseDateInputValue(String(values.plannedDate ?? "").trim());
      const completedDateRaw = String(values.completedDate ?? "").trim();
      const nextAuditDateRaw = String(values.nextAuditDate ?? "").trim();
      const branchValue = String(values.branchId ?? FORM_SYSTEM_WIDE_BRANCH_VALUE);

      const payload = {
        referenceNumber: String(values.referenceNumber ?? "").trim() || null,
        title: String(values.title ?? "").trim(),
        auditType: values.auditType as QualityAuditType,
        status: values.status as QualityAuditStatus,
        branchId:
          branchValue === FORM_SYSTEM_WIDE_BRANCH_VALUE ? null : Number(branchValue),
        leadAuditor: String(values.leadAuditor ?? "").trim() || null,
        auditee: String(values.auditee ?? "").trim() || null,
        plannedDate,
        completedDate: completedDateRaw ? parseDateInputValue(completedDateRaw) : null,
        nextAuditDate: nextAuditDateRaw ? parseDateInputValue(nextAuditDateRaw) : null,
        scope: String(values.scope ?? "").trim(),
        criteria: String(values.criteria ?? "").trim() || null,
        summary: String(values.summary ?? "").trim() || null,
        findingsSummary: String(values.findingsSummary ?? "").trim() || null,
        followUpSummary: String(values.followUpSummary ?? "").trim() || null,
      };

      if (editingAudit) {
        await updateAuditMutation.mutateAsync({
          id: editingAudit.id,
          data: payload,
        });
        toast.success("Audit record updated.");
      } else {
        await createAuditMutation.mutateAsync(payload);
        toast.success("Audit record created.");
      }

      await refetchAudits();
      setIsAuditFormOpen(false);
      setEditingAudit(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save audit record.";
      setAuditFormError(message);
      toast.error(message);
    }
  };

  const handleAuditDelete = async (row: AuditRow) => {
    const confirmed = window.confirm(
      `Delete audit record ${row.referenceNumber}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteAuditMutation.mutateAsync({ id: row.id });
      toast.success("Audit record deleted.");
      await refetchAudits();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete audit record."
      );
    }
  };

  const reviewRows = useMemo<ReviewRow[]>(
    () =>
      typedReviews.map((row) => ({
        ...row,
        branchName: row.branchId
          ? branchMap.get(row.branchId) || "Unknown Branch"
          : "System-wide",
        meetingLabel: getMeetingLabel(row),
        overdue: isReviewOverdue(row.meetingDate, row.status),
      })),
    [branchMap, typedReviews]
  );

  const filteredReviewRows = useMemo(() => {
    return reviewRows.filter((row) => {
      if (reviewBranchFilter === SYSTEM_WIDE_BRANCH_VALUE && row.branchId !== null) {
        return false;
      }

      if (
        reviewBranchFilter !== ALL_BRANCHES_VALUE &&
        reviewBranchFilter !== SYSTEM_WIDE_BRANCH_VALUE &&
        String(row.branchId ?? "") !== reviewBranchFilter
      ) {
        return false;
      }

      if (
        reviewStatusFilter !== ALL_REVIEW_STATUS_VALUE &&
        row.status !== reviewStatusFilter
      ) {
        return false;
      }

      return true;
    });
  }, [reviewBranchFilter, reviewRows, reviewStatusFilter]);

  useEffect(() => {
    if (!filteredReviewRows.length) {
      setSelectedReviewId(null);
      return;
    }

    if (!filteredReviewRows.some((row) => row.id === selectedReviewId)) {
      setSelectedReviewId(filteredReviewRows[0].id);
    }
  }, [filteredReviewRows, selectedReviewId]);

  const selectedReview =
    filteredReviewRows.find((row) => row.id === selectedReviewId) ||
    reviewRows.find((row) => row.id === selectedReviewId) ||
    null;

  useEffect(() => {
    if (!qualityDeepLink.reviewId) return;

    const linkedReview = reviewRows.find((row) => row.id === qualityDeepLink.reviewId);
    if (!linkedReview) return;

    setActiveTab("reviews");
    setReviewBranchFilter(ALL_BRANCHES_VALUE);
    setReviewStatusFilter(ALL_REVIEW_STATUS_VALUE);
    setSelectedReviewId(linkedReview.id);
    setHighlightedRecord({ tab: "reviews", id: linkedReview.id });
  }, [qualityDeepLink, reviewRows]);

  const reviewSummary = useMemo(
    () => ({
      planned: filteredReviewRows.filter((row) => row.status === "Planned").length,
      overdue: filteredReviewRows.filter((row) => row.overdue).length,
      held: filteredReviewRows.filter((row) => row.status === "Held").length,
      closed: filteredReviewRows.filter((row) => row.status === "Closed").length,
    }),
    [filteredReviewRows]
  );

  const reviewColumns: Column<ReviewRow>[] = [
    {
      key: "referenceNumber",
      label: "Reference",
      sortable: true,
      filterable: true,
    },
    {
      key: "title",
      label: "Review",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">
            {row.chairperson || "Chairperson not recorded"}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className={getReviewStatusBadgeClass(value as ManagementReviewStatus)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "branchName",
      label: "Branch",
      sortable: true,
      filterable: true,
    },
    {
      key: "meetingLabel",
      label: "Meeting Date",
      render: (_value, row) => (
        <span className={row.overdue ? "font-medium text-red-600" : ""}>
          {row.meetingLabel}
        </span>
      ),
    },
  ];

  const reviewFormFields = useMemo<FormField[]>(
    () => [
      {
        name: "referenceNumber",
        label: "Reference Number",
        type: "text",
        placeholder: "Auto-generated if left blank",
        section: "Review Control",
      },
      {
        name: "title",
        label: "Review Title",
        type: "text",
        required: true,
        placeholder: "Management review meeting or cycle description",
      },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: REVIEW_STATUS_OPTIONS,
      },
      {
        name: "branchId",
        label: "Branch",
        type: "select",
        options: formBranchOptions,
      },
      {
        name: "meetingDate",
        label: "Meeting Date",
        type: "date",
        required: true,
        section: "Meeting Schedule",
      },
      {
        name: "nextReviewDate",
        label: "Next Review Date",
        type: "date",
      },
      {
        name: "chairperson",
        label: "Chairperson",
        type: "text",
        placeholder: "Chairperson or responsible manager",
      },
      {
        name: "attendees",
        label: "Attendees",
        type: "textarea",
        placeholder: "Attendees, departments, or functions represented",
        section: "Meeting Inputs",
      },
      {
        name: "agenda",
        label: "Agenda",
        type: "textarea",
        placeholder: "Agenda topics covered during the review",
      },
      {
        name: "inputsSummary",
        label: "Inputs Summary",
        type: "textarea",
        placeholder: "Performance inputs, audit results, complaints, KPIs, risks, etc.",
      },
      {
        name: "decisionsSummary",
        label: "Decisions & Outputs",
        type: "textarea",
        placeholder: "Decisions, improvement directions, and resource commitments",
        section: "Outputs & Actions",
      },
      {
        name: "actionSummary",
        label: "Action Summary",
        type: "textarea",
        placeholder: "Follow-up actions, owners, and due dates noted in the review",
      },
    ],
    [formBranchOptions]
  );

  const reviewInitialValues = editingReview
    ? {
        referenceNumber: editingReview.referenceNumber,
        title: editingReview.title,
        status: editingReview.status,
        branchId:
          editingReview.branchId === null
            ? FORM_SYSTEM_WIDE_BRANCH_VALUE
            : String(editingReview.branchId),
        meetingDate: formatDateInputValue(editingReview.meetingDate),
        nextReviewDate: editingReview.nextReviewDate
          ? formatDateInputValue(editingReview.nextReviewDate)
          : "",
        chairperson: editingReview.chairperson || "",
        attendees: editingReview.attendees || "",
        agenda: editingReview.agenda || "",
        inputsSummary: editingReview.inputsSummary || "",
        decisionsSummary: editingReview.decisionsSummary || "",
        actionSummary: editingReview.actionSummary || "",
      }
    : {
        referenceNumber: "",
        title: "",
        status: "Planned",
        branchId: FORM_SYSTEM_WIDE_BRANCH_VALUE,
        meetingDate: formatDateInputValue(new Date()),
        nextReviewDate: "",
        chairperson: "",
        attendees: "",
        agenda: "",
        inputsSummary: "",
        decisionsSummary: "",
        actionSummary: "",
      };

  const handleReviewSubmit = async (values: Record<string, unknown>) => {
    setReviewFormError(null);

    try {
      const meetingDate = parseDateInputValue(String(values.meetingDate ?? "").trim());
      const nextReviewDateRaw = String(values.nextReviewDate ?? "").trim();
      const branchValue = String(values.branchId ?? FORM_SYSTEM_WIDE_BRANCH_VALUE);

      const payload = {
        referenceNumber: String(values.referenceNumber ?? "").trim() || null,
        title: String(values.title ?? "").trim(),
        status: values.status as ManagementReviewStatus,
        branchId:
          branchValue === FORM_SYSTEM_WIDE_BRANCH_VALUE ? null : Number(branchValue),
        meetingDate,
        nextReviewDate: nextReviewDateRaw
          ? parseDateInputValue(nextReviewDateRaw)
          : null,
        chairperson: String(values.chairperson ?? "").trim() || null,
        attendees: String(values.attendees ?? "").trim() || null,
        agenda: String(values.agenda ?? "").trim() || null,
        inputsSummary: String(values.inputsSummary ?? "").trim() || null,
        decisionsSummary: String(values.decisionsSummary ?? "").trim() || null,
        actionSummary: String(values.actionSummary ?? "").trim() || null,
      };

      if (editingReview) {
        await updateReviewMutation.mutateAsync({
          id: editingReview.id,
          data: payload,
        });
        toast.success("Management review updated.");
      } else {
        await createReviewMutation.mutateAsync(payload);
        toast.success("Management review created.");
      }

      await refetchReviews();
      setIsReviewFormOpen(false);
      setEditingReview(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save management review.";
      setReviewFormError(message);
      toast.error(message);
    }
  };

  const handleReviewDelete = async (row: ReviewRow) => {
    const confirmed = window.confirm(
      `Delete management review ${row.referenceNumber}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteReviewMutation.mutateAsync({ id: row.id });
      toast.success("Management review deleted.");
      await refetchReviews();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete management review."
      );
    }
  };

  const providerRows = useMemo<ProviderRow[]>(
    () =>
      typedProviders.map((row) => ({
        ...row,
        branchName: row.branchId
          ? branchMap.get(row.branchId) || "Unknown Branch"
          : "System-wide",
        nextEvaluationLabel: getProviderNextEvaluationLabel(row),
        overdue: isProviderOverdue(row.nextEvaluationDate, row.status),
      })),
    [branchMap, typedProviders]
  );

  const filteredProviderRows = useMemo(() => {
    return providerRows.filter((row) => {
      if (providerBranchFilter === SYSTEM_WIDE_BRANCH_VALUE && row.branchId !== null) {
        return false;
      }

      if (
        providerBranchFilter !== ALL_BRANCHES_VALUE &&
        providerBranchFilter !== SYSTEM_WIDE_BRANCH_VALUE &&
        String(row.branchId ?? "") !== providerBranchFilter
      ) {
        return false;
      }

      if (
        providerStatusFilter !== ALL_PROVIDER_STATUS_VALUE &&
        row.status !== providerStatusFilter
      ) {
        return false;
      }

      if (
        providerTypeFilter !== ALL_PROVIDER_TYPE_VALUE &&
        row.providerType !== providerTypeFilter
      ) {
        return false;
      }

      return true;
    });
  }, [providerBranchFilter, providerRows, providerStatusFilter, providerTypeFilter]);

  useEffect(() => {
    if (!filteredProviderRows.length) {
      setSelectedProviderId(null);
      return;
    }

    if (!filteredProviderRows.some((row) => row.id === selectedProviderId)) {
      setSelectedProviderId(filteredProviderRows[0].id);
    }
  }, [filteredProviderRows, selectedProviderId]);

  const selectedProvider =
    filteredProviderRows.find((row) => row.id === selectedProviderId) ||
    providerRows.find((row) => row.id === selectedProviderId) ||
    null;

  useEffect(() => {
    if (!qualityDeepLink.providerId) return;

    const linkedProvider = providerRows.find(
      (row) => row.id === qualityDeepLink.providerId
    );
    if (!linkedProvider) return;

    setActiveTab("providers");
    setProviderBranchFilter(ALL_BRANCHES_VALUE);
    setProviderStatusFilter(ALL_PROVIDER_STATUS_VALUE);
    setProviderTypeFilter(ALL_PROVIDER_TYPE_VALUE);
    setSelectedProviderId(linkedProvider.id);
    setHighlightedRecord({ tab: "providers", id: linkedProvider.id });
  }, [providerRows, qualityDeepLink]);

  const providerSummary = useMemo(
    () => ({
      approved: filteredProviderRows.filter((row) => row.status === "Approved").length,
      underReview: filteredProviderRows.filter(
        (row) => row.status === "Under Review" || row.status === "Conditional"
      ).length,
      overdue: filteredProviderRows.filter((row) => row.overdue).length,
      preferred: filteredProviderRows.filter((row) => row.rating === "Preferred").length,
    }),
    [filteredProviderRows]
  );

  const qualityAttentionItems = useMemo<QualityAttentionItem[]>(() => {
    const items: QualityAttentionItem[] = [];

    const addItem = (item: Omit<QualityAttentionItem, "dueLabel" | "priority">) => {
      items.push({
        ...item,
        dueLabel: getAttentionDueLabel(item.daysUntilDue, item.dueDate),
        priority: getAttentionPriority(item.daysUntilDue),
      });
    };

    for (const action of typedActions) {
      if (action.status === "Closed") continue;

      const daysUntilDue = getDaysUntilDate(action.dueDate);
      if (!shouldShowAttentionItem(daysUntilDue)) continue;

      addItem({
        id: `action-${action.id}`,
        tab: "actions",
        recordId: action.id,
        source: "Quality Action",
        referenceNumber: action.referenceNumber,
        title: action.title,
        status: action.status,
        branchName: getBranchName(action.branchId),
        owner: action.ownerName || "Unassigned",
        dueDate: action.dueDate,
        daysUntilDue: daysUntilDue!,
        reason:
          action.status === "Awaiting Verification"
            ? "Awaiting verification"
            : "Target closure date",
      });
    }

    for (const audit of typedAudits) {
      if (audit.status !== "Completed" && audit.status !== "Cancelled") {
        const daysUntilDue = getDaysUntilDate(audit.plannedDate);
        if (shouldShowAttentionItem(daysUntilDue)) {
          addItem({
            id: `audit-planned-${audit.id}`,
            tab: "audits",
            recordId: audit.id,
            source: "Internal Audit",
            referenceNumber: audit.referenceNumber,
            title: audit.title,
            status: audit.status,
            branchName: getBranchName(audit.branchId),
            owner: audit.leadAuditor || "Lead auditor not assigned",
            dueDate: audit.plannedDate,
            daysUntilDue: daysUntilDue!,
            reason: "Planned audit date",
          });
        }
      }

      if (audit.status !== "Cancelled") {
        const daysUntilDue = getDaysUntilDate(audit.nextAuditDate);
        if (shouldShowAttentionItem(daysUntilDue)) {
          addItem({
            id: `audit-next-${audit.id}`,
            tab: "audits",
            recordId: audit.id,
            source: "Internal Audit",
            referenceNumber: audit.referenceNumber,
            title: audit.title,
            status: audit.status,
            branchName: getBranchName(audit.branchId),
            owner: audit.leadAuditor || "Lead auditor not assigned",
            dueDate: audit.nextAuditDate,
            daysUntilDue: daysUntilDue!,
            reason: "Next audit cycle",
          });
        }
      }
    }

    for (const review of typedReviews) {
      if (
        review.status !== "Held" &&
        review.status !== "Closed" &&
        review.status !== "Cancelled"
      ) {
        const daysUntilDue = getDaysUntilDate(review.meetingDate);
        if (shouldShowAttentionItem(daysUntilDue)) {
          addItem({
            id: `review-meeting-${review.id}`,
            tab: "reviews",
            recordId: review.id,
            source: "Management Review",
            referenceNumber: review.referenceNumber,
            title: review.title,
            status: review.status,
            branchName: getBranchName(review.branchId),
            owner: review.chairperson || "Chairperson not recorded",
            dueDate: review.meetingDate,
            daysUntilDue: daysUntilDue!,
            reason: "Review meeting date",
          });
        }
      }

      if (review.status !== "Cancelled") {
        const daysUntilDue = getDaysUntilDate(review.nextReviewDate);
        if (shouldShowAttentionItem(daysUntilDue)) {
          addItem({
            id: `review-next-${review.id}`,
            tab: "reviews",
            recordId: review.id,
            source: "Management Review",
            referenceNumber: review.referenceNumber,
            title: review.title,
            status: review.status,
            branchName: getBranchName(review.branchId),
            owner: review.chairperson || "Chairperson not recorded",
            dueDate: review.nextReviewDate,
            daysUntilDue: daysUntilDue!,
            reason: "Next review cycle",
          });
        }
      }
    }

    for (const provider of typedProviders) {
      if (provider.status === "Inactive" || provider.status === "Suspended") continue;

      const daysUntilDue = getDaysUntilDate(provider.nextEvaluationDate);
      if (!shouldShowAttentionItem(daysUntilDue)) continue;

      addItem({
        id: `provider-${provider.id}`,
        tab: "providers",
        recordId: provider.id,
        source: "External Provider",
        referenceNumber: provider.referenceNumber,
        title: provider.companyName,
        status: provider.status,
        branchName: getBranchName(provider.branchId),
        owner:
          provider.primaryContact ||
          provider.email ||
          "Provider contact not recorded",
        dueDate: provider.nextEvaluationDate,
        daysUntilDue: daysUntilDue!,
        reason: "Provider evaluation",
      });
    }

    return items.sort((left, right) => {
      if (left.daysUntilDue !== right.daysUntilDue) {
        return left.daysUntilDue - right.daysUntilDue;
      }

      return left.referenceNumber.localeCompare(right.referenceNumber);
    });
  }, [branchMap, typedActions, typedAudits, typedProviders, typedReviews]);

  const attentionSummary = useMemo(
    () => ({
      total: qualityAttentionItems.length,
      critical: qualityAttentionItems.filter((item) => item.priority === "critical").length,
      dueToday: qualityAttentionItems.filter((item) => item.daysUntilDue === 0).length,
      dueSoon: qualityAttentionItems.filter((item) => item.daysUntilDue > 0).length,
    }),
    [qualityAttentionItems]
  );

  const providerColumns: Column<ProviderRow>[] = [
    {
      key: "referenceNumber",
      label: "Reference",
      sortable: true,
      filterable: true,
    },
    {
      key: "companyName",
      label: "Provider",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.providerType}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant="outline"
          className={getProviderStatusBadgeClass(value as ExternalProviderStatus)}
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "branchName",
      label: "Branch",
      sortable: true,
      filterable: true,
    },
    {
      key: "nextEvaluationLabel",
      label: "Next Evaluation",
      render: (_value, row) => (
        <span className={row.overdue ? "font-medium text-red-600" : ""}>
          {row.nextEvaluationLabel}
        </span>
      ),
    },
  ];

  const providerFormFields = useMemo<FormField[]>(
    () => [
      {
        name: "referenceNumber",
        label: "Reference Number",
        type: "text",
        placeholder: "Auto-generated if left blank",
        section: "Provider Control",
      },
      {
        name: "companyName",
        label: "Company Name",
        type: "text",
        required: true,
        placeholder: "Supplier or service provider name",
      },
      {
        name: "providerType",
        label: "Provider Type",
        type: "select",
        required: true,
        options: PROVIDER_TYPE_OPTIONS,
      },
      {
        name: "status",
        label: "Approval Status",
        type: "select",
        required: true,
        options: PROVIDER_STATUS_OPTIONS,
      },
      {
        name: "rating",
        label: "Rating",
        type: "select",
        required: true,
        options: PROVIDER_RATING_OPTIONS,
      },
      {
        name: "branchId",
        label: "Branch",
        type: "select",
        options: formBranchOptions,
      },
      {
        name: "primaryContact",
        label: "Primary Contact",
        type: "text",
        placeholder: "Main contact person",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "Contact email",
      },
      {
        name: "phone",
        label: "Phone",
        type: "text",
        placeholder: "Contact number",
      },
      {
        name: "approvalDate",
        label: "Approval Date",
        type: "date",
        section: "Approval & Evaluation",
      },
      {
        name: "lastEvaluationDate",
        label: "Last Evaluation Date",
        type: "date",
      },
      {
        name: "nextEvaluationDate",
        label: "Next Evaluation Date",
        type: "date",
      },
      {
        name: "serviceScope",
        label: "Service Scope",
        type: "textarea",
        required: true,
        placeholder: "What this provider is approved to supply or perform",
        section: "Scope & Notes",
      },
      {
        name: "notes",
        label: "Notes",
        type: "textarea",
        placeholder: "General notes, constraints, or approval remarks",
      },
      {
        name: "correctiveActionNotes",
        label: "Corrective Action / Review Notes",
        type: "textarea",
        placeholder: "Conditional approval notes, review findings, or required follow-up",
      },
    ],
    [formBranchOptions]
  );

  const providerInitialValues = editingProvider
    ? {
        referenceNumber: editingProvider.referenceNumber,
        companyName: editingProvider.companyName,
        providerType: editingProvider.providerType,
        status: editingProvider.status,
        rating: editingProvider.rating,
        branchId:
          editingProvider.branchId === null
            ? FORM_SYSTEM_WIDE_BRANCH_VALUE
            : String(editingProvider.branchId),
        primaryContact: editingProvider.primaryContact || "",
        email: editingProvider.email || "",
        phone: editingProvider.phone || "",
        approvalDate: editingProvider.approvalDate
          ? formatDateInputValue(editingProvider.approvalDate)
          : "",
        lastEvaluationDate: editingProvider.lastEvaluationDate
          ? formatDateInputValue(editingProvider.lastEvaluationDate)
          : "",
        nextEvaluationDate: editingProvider.nextEvaluationDate
          ? formatDateInputValue(editingProvider.nextEvaluationDate)
          : "",
        serviceScope: editingProvider.serviceScope,
        notes: editingProvider.notes || "",
        correctiveActionNotes: editingProvider.correctiveActionNotes || "",
      }
    : {
        referenceNumber: "",
        companyName: "",
        providerType: "Other",
        status: "Approved",
        rating: "Acceptable",
        branchId: FORM_SYSTEM_WIDE_BRANCH_VALUE,
        primaryContact: "",
        email: "",
        phone: "",
        approvalDate: "",
        lastEvaluationDate: "",
        nextEvaluationDate: "",
        serviceScope: "",
        notes: "",
        correctiveActionNotes: "",
      };

  const handleProviderSubmit = async (values: Record<string, unknown>) => {
    setProviderFormError(null);

    try {
      const branchValue = String(values.branchId ?? FORM_SYSTEM_WIDE_BRANCH_VALUE);
      const approvalDateRaw = String(values.approvalDate ?? "").trim();
      const lastEvaluationDateRaw = String(values.lastEvaluationDate ?? "").trim();
      const nextEvaluationDateRaw = String(values.nextEvaluationDate ?? "").trim();

      const payload = {
        referenceNumber: String(values.referenceNumber ?? "").trim() || null,
        companyName: String(values.companyName ?? "").trim(),
        providerType: values.providerType as ExternalProviderType,
        status: values.status as ExternalProviderStatus,
        rating: values.rating as ExternalProviderRating,
        branchId:
          branchValue === FORM_SYSTEM_WIDE_BRANCH_VALUE ? null : Number(branchValue),
        primaryContact: String(values.primaryContact ?? "").trim() || null,
        email: String(values.email ?? "").trim() || null,
        phone: String(values.phone ?? "").trim() || null,
        serviceScope: String(values.serviceScope ?? "").trim(),
        approvalDate: approvalDateRaw ? parseDateInputValue(approvalDateRaw) : null,
        lastEvaluationDate: lastEvaluationDateRaw
          ? parseDateInputValue(lastEvaluationDateRaw)
          : null,
        nextEvaluationDate: nextEvaluationDateRaw
          ? parseDateInputValue(nextEvaluationDateRaw)
          : null,
        notes: String(values.notes ?? "").trim() || null,
        correctiveActionNotes:
          String(values.correctiveActionNotes ?? "").trim() || null,
      };

      if (editingProvider) {
        await updateProviderMutation.mutateAsync({
          id: editingProvider.id,
          data: payload,
        });
        toast.success("External provider updated.");
      } else {
        await createProviderMutation.mutateAsync(payload);
        toast.success("External provider created.");
      }

      await refetchProviders();
      setIsProviderFormOpen(false);
      setEditingProvider(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save external provider.";
      setProviderFormError(message);
      toast.error(message);
    }
  };

  const handleProviderDelete = async (row: ProviderRow) => {
    const confirmed = window.confirm(
      `Delete external provider ${row.referenceNumber}? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteProviderMutation.mutateAsync({ id: row.id });
      toast.success("External provider deleted.");
      await refetchProviders();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete external provider."
      );
    }
  };

  const handleOpenAttentionItem = (item: QualityAttentionItem) => {
    setActiveTab(item.tab);
    setHighlightedRecord({ tab: item.tab, id: item.recordId });

    if (item.tab === "actions") {
      setActionBranchFilter(ALL_BRANCHES_VALUE);
      setActionStatusFilter(ALL_STATUS_VALUE);
      setActionCategoryFilter(ALL_CATEGORY_VALUE);
      setSelectedActionId(item.recordId);
      window.history.replaceState(null, "", `/quality?actionId=${item.recordId}`);
      return;
    }

    if (item.tab === "audits") {
      setAuditBranchFilter(ALL_BRANCHES_VALUE);
      setAuditStatusFilter(ALL_STATUS_VALUE);
      setAuditTypeFilter(ALL_AUDIT_TYPE_VALUE);
      setSelectedAuditId(item.recordId);
      window.history.replaceState(null, "", `/quality?tab=audits&auditId=${item.recordId}`);
      return;
    }

    if (item.tab === "reviews") {
      setReviewBranchFilter(ALL_BRANCHES_VALUE);
      setReviewStatusFilter(ALL_REVIEW_STATUS_VALUE);
      setSelectedReviewId(item.recordId);
      window.history.replaceState(
        null,
        "",
        `/quality?tab=reviews&reviewId=${item.recordId}`
      );
      return;
    }

    setProviderBranchFilter(ALL_BRANCHES_VALUE);
    setProviderStatusFilter(ALL_PROVIDER_STATUS_VALUE);
    setProviderTypeFilter(ALL_PROVIDER_TYPE_VALUE);
    setSelectedProviderId(item.recordId);
    window.history.replaceState(
      null,
      "",
      `/quality?tab=providers&providerId=${item.recordId}`
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Quality</h1>
                <p className="text-sm text-muted-foreground">
                  Manage nonconformances, internal audits, management reviews,
                  and approved external providers in one QMS workspace.
                </p>
              </div>
            </div>
          </div>

          {activeTab === "actions" ? (
            <Button
              onClick={() => {
                setEditingAction(null);
                setActionFormError(null);
                setIsActionFormOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Log Quality Action
            </Button>
          ) : activeTab === "audits" ? (
            <Button
              onClick={() => {
                setEditingAudit(null);
                setAuditFormError(null);
                setIsAuditFormOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Audit
            </Button>
          ) : activeTab === "reviews" ? (
            <Button
              onClick={() => {
                setEditingReview(null);
                setReviewFormError(null);
                setIsReviewFormOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Review
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingProvider(null);
                setProviderFormError(null);
                setIsProviderFormOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Provider
            </Button>
          )}
        </div>

        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 via-white to-white dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <CardHeader className="gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Quality Attention Queue
              </CardTitle>
              <CardDescription>
                One view for due and overdue quality actions, audits, management reviews, and provider evaluations.
              </CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-xl border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{attentionSummary.total}</p>
              </div>
              <div className="rounded-xl border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-xl font-semibold text-red-600">
                  {attentionSummary.critical}
                </p>
              </div>
              <div className="rounded-xl border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-xl font-semibold text-amber-600">
                  {attentionSummary.dueToday}
                </p>
              </div>
              <div className="rounded-xl border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Next 7 Days</p>
                <p className="text-xl font-semibold text-sky-600">
                  {attentionSummary.dueSoon}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {qualityAttentionItems.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No quality records are due in the next 7 days and no overdue quality items were found.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Priority</th>
                      <th className="px-3 py-2 text-left">Source</th>
                      <th className="px-3 py-2 text-left">Record</th>
                      <th className="px-3 py-2 text-left">Owner</th>
                      <th className="px-3 py-2 text-left">Due</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualityAttentionItems.slice(0, 12).map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={getAttentionPriorityBadgeClass(item.priority)}
                          >
                            {item.priority === "critical"
                              ? "Overdue"
                              : item.priority === "high"
                                ? "High"
                                : "Due Soon"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.source}</p>
                          <p className="text-xs text-muted-foreground">{item.reason}</p>
                        </td>
                        <td className="max-w-md px-3 py-2">
                          <p className="font-medium">{item.referenceNumber}</p>
                          <p className="truncate text-muted-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.branchName} | {item.status}
                          </p>
                        </td>
                        <td className="px-3 py-2">{item.owner}</td>
                        <td className="px-3 py-2">
                          <p
                            className={
                              item.priority === "critical"
                                ? "font-medium text-red-600"
                                : item.priority === "high"
                                  ? "font-medium text-amber-600"
                                  : ""
                            }
                          >
                            {item.dueLabel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(item.dueDate)}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAttentionItem(item)}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {qualityAttentionItems.length > 12 ? (
                  <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Showing first 12 of {qualityAttentionItems.length} attention items. The most urgent items are listed first.
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as QualityTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="audits" className="flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Internal Audits
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Management Review
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              External Providers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Open</CardDescription>
                  <CardTitle className="text-3xl">{actionSummary.open}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Findings still awaiting action.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overdue</CardDescription>
                  <CardTitle className="text-3xl">{actionSummary.overdue}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Actions past their target closure date.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Awaiting Verification</CardDescription>
                  <CardTitle className="text-3xl">
                    {actionSummary.awaitingVerification}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Actions ready for effectiveness review.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Closed</CardDescription>
                  <CardTitle className="text-3xl">{actionSummary.closed}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Actions formally closed out.
                </CardContent>
              </Card>
            </div>

            <Card className="border-red-100 bg-gradient-to-r from-red-50/80 via-white to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardCheck className="h-5 w-5 text-red-600" />
                  Corrective Action Workflow
                </CardTitle>
                <CardDescription>
                  Supports nonconformance handling, corrective action, and closure
                  verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <FileWarning className="h-4 w-4 text-amber-600" />
                    Capture the issue
                  </div>
                  <p>
                    Log the finding, source, severity, branch scope, and immediate
                    correction.
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Drive the action
                  </div>
                  <p>
                    Record root cause, assign ownership, and set a target closure
                    date.
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Verify and close
                  </div>
                  <p>
                    Document verification evidence before marking the action
                    closed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Quality Action Register</CardTitle>
                  <CardDescription>
                    Filter by branch, category, or workflow state and open a row to
                    review the full record.
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Select value={actionBranchFilter} onValueChange={setActionBranchFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={actionCategoryFilter}
                    onValueChange={setActionCategoryFilter}
                  >
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORY_VALUE}>
                        All categories
                      </SelectItem>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={actionStatusFilter} onValueChange={setActionStatusFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={actionColumns}
                  data={filteredActionRows}
                  isLoading={qualityActionsLoading}
                  pageSize={12}
                  searchPlaceholder="Search by reference, title, source, owner, or branch..."
                  onRowClick={(row) => setSelectedActionId(row.id)}
                  actions={(row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingAction(row);
                          setActionFormError(null);
                          setIsActionFormOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleActionDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card
              className={
                highlightedRecord?.tab === "actions" &&
                selectedAction?.id === highlightedRecord.id
                  ? "border-blue-300 bg-blue-50/40 shadow-sm ring-2 ring-blue-200 dark:border-blue-500/70 dark:bg-blue-950/20 dark:ring-blue-900/60"
                  : undefined
              }
            >
              <CardHeader>
                <CardTitle>Selected Quality Action</CardTitle>
                <CardDescription>
                  Full issue, cause, correction, and verification detail for the
                  selected action.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAction ? (
                  <div className="space-y-6">
                    {qualityDeepLink.actionId === selectedAction.id ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                        Opened from a direct Quality link. Filters were cleared so
                        this Quality Action is visible.
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {selectedAction.referenceNumber}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getSeverityBadgeClass(selectedAction.severity)}
                          >
                            {selectedAction.severity}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeClass(selectedAction.status)}
                          >
                            {selectedAction.status}
                          </Badge>
                        </div>
                        <h2 className="text-2xl font-semibold">
                          {selectedAction.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedAction.category} from {selectedAction.source} |{" "}
                          {selectedAction.branchName}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingAction(selectedAction);
                          setActionFormError(null);
                          setIsActionFormOpen(true);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Owner
                        </div>
                        <div className="mt-2 font-medium">
                          {selectedAction.ownerName || "Unassigned"}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Reported
                        </div>
                        <div className="mt-2 font-medium">
                          {formatDate(selectedAction.reportedDate)}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Target Closure
                        </div>
                        <div
                          className={`mt-2 font-medium ${
                            selectedAction.overdue ? "text-red-600" : ""
                          }`}
                        >
                          {selectedAction.dueLabel}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Verified By
                        </div>
                        <div className="mt-2 font-medium">
                          {selectedAction.verifiedByName || "Not recorded"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Issue Description
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAction.description || "No description recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Immediate Correction
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAction.immediateCorrection ||
                            "No immediate correction recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Root Cause</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAction.rootCause || "No root cause recorded yet."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Corrective Action
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAction.correctiveAction ||
                            "No corrective action recorded yet."}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Verification & Close-Out
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-slate-700">
                        <p className="whitespace-pre-wrap">
                          {selectedAction.verificationNotes ||
                            "No verification notes recorded yet."}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          Closed At:{" "}
                          {selectedAction.closedAt
                            ? formatDate(selectedAction.closedAt)
                            : "Not closed"}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No quality action matches the current filters yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audits" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Open Audits</CardDescription>
                  <CardTitle className="text-3xl">{auditSummary.open}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Planned or in-progress audits still needing completion.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overdue</CardDescription>
                  <CardTitle className="text-3xl">{auditSummary.overdue}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Audit dates already passed without completion.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Completed</CardDescription>
                  <CardTitle className="text-3xl">
                    {auditSummary.completed}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Audits closed out with summary and findings recorded.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Next Cycle Set</CardDescription>
                  <CardTitle className="text-3xl">{auditSummary.nextCycle}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Audit records already carrying the next cycle date.
                </CardContent>
              </Card>
            </div>

            <Card className="border-amber-100 bg-gradient-to-r from-amber-50/80 via-white to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSearch className="h-5 w-5 text-amber-600" />
                  Internal Audit Control
                </CardTitle>
                <CardDescription>
                  Plan the audit, define the scope and criteria, and record the
                  findings and follow-up needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <CalendarClock className="h-4 w-4 text-amber-600" />
                    Plan the cycle
                  </div>
                  <p>Set the branch, audit type, planned date, and lead auditor.</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <ClipboardCheck className="h-4 w-4 text-sky-600" />
                    Record evidence
                  </div>
                  <p>
                    Capture scope, criteria, audit summary, and findings in one
                    place.
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Drive follow-up
                  </div>
                  <p>
                    Note the next cycle date and follow-up requirements so nothing
                    slips.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Audit Register</CardTitle>
                  <CardDescription>
                    Filter by branch, audit type, or status and review the audit
                    detail below.
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Select value={auditBranchFilter} onValueChange={setAuditBranchFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={auditTypeFilter} onValueChange={setAuditTypeFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_AUDIT_TYPE_VALUE}>
                        All audit types
                      </SelectItem>
                      {AUDIT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={auditStatusFilter} onValueChange={setAuditStatusFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                      {AUDIT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={auditColumns}
                  data={filteredAuditRows}
                  isLoading={qualityAuditsLoading}
                  pageSize={12}
                  searchPlaceholder="Search by reference, title, audit type, auditor, or branch..."
                  onRowClick={(row) => setSelectedAuditId(row.id)}
                  actions={(row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingAudit(row);
                          setAuditFormError(null);
                          setIsAuditFormOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleAuditDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card
              className={
                highlightedRecord?.tab === "audits" &&
                selectedAudit?.id === highlightedRecord.id
                  ? "border-blue-300 bg-blue-50/40 shadow-sm ring-2 ring-blue-200 dark:border-blue-500/70 dark:bg-blue-950/20 dark:ring-blue-900/60"
                  : undefined
              }
            >
              <CardHeader>
                <CardTitle>Selected Audit</CardTitle>
                <CardDescription>
                  Review the planned scope, criteria, findings, and next-cycle
                  information for the selected audit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedAudit ? (
                  <div className="space-y-6">
                    {qualityDeepLink.auditId === selectedAudit.id ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                        Opened from a direct Quality link. Filters were cleared so
                        this audit is visible.
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{selectedAudit.referenceNumber}</Badge>
                          <Badge variant="outline">{selectedAudit.auditType}</Badge>
                          <Badge
                            variant="outline"
                            className={getAuditStatusBadgeClass(selectedAudit.status)}
                          >
                            {selectedAudit.status}
                          </Badge>
                        </div>
                        <h2 className="text-2xl font-semibold">{selectedAudit.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedAudit.branchName} | Lead auditor:{" "}
                          {selectedAudit.leadAuditor || "Not assigned"}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingAudit(selectedAudit);
                          setAuditFormError(null);
                          setIsAuditFormOpen(true);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Planned Date
                        </div>
                        <div
                          className={`mt-2 font-medium ${
                            selectedAudit.overdue ? "text-red-600" : ""
                          }`}
                        >
                          {selectedAudit.plannedLabel}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Completed
                        </div>
                        <div className="mt-2 font-medium">
                          {formatDate(selectedAudit.completedDate)}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Auditee
                        </div>
                        <div className="mt-2 font-medium">
                          {selectedAudit.auditee || "Not recorded"}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Next Audit
                        </div>
                        <div className="mt-2 font-medium">
                          {formatDate(selectedAudit.nextAuditDate)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Scope</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAudit.scope}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Criteria</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAudit.criteria || "No criteria recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Audit Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAudit.summary || "No audit summary recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Findings Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedAudit.findingsSummary ||
                            "No findings summary recorded yet."}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Follow-up Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                        {selectedAudit.followUpSummary ||
                          "No follow-up summary recorded yet."}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No audit matches the current filters yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Planned</CardDescription>
                  <CardTitle className="text-3xl">{reviewSummary.planned}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Review meetings still scheduled ahead.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overdue</CardDescription>
                  <CardTitle className="text-3xl">{reviewSummary.overdue}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Management reviews that should already have happened.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Held</CardDescription>
                  <CardTitle className="text-3xl">{reviewSummary.held}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Meetings held, but not yet formally closed.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Closed</CardDescription>
                  <CardTitle className="text-3xl">{reviewSummary.closed}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Reviews closed with decisions and actions recorded.
                </CardContent>
              </Card>
            </div>

            <Card className="border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-violet-600" />
                  Management Review Control
                </CardTitle>
                <CardDescription>
                  Capture review inputs, decisions, outputs, and follow-up actions
                  as part of your QMS review cycle.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4 text-violet-600" />
                    Plan the meeting
                  </div>
                  <p>
                    Set the branch, meeting date, chairperson, and next review
                    timing.
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <ClipboardCheck className="h-4 w-4 text-sky-600" />
                    Record the inputs
                  </div>
                  <p>
                    Note agenda items, review inputs, and the operational evidence
                    considered.
                  </p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Lock in the outputs
                  </div>
                  <p>
                    Record decisions, actions, and improvement directions for the
                    next cycle.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>Management Review Register</CardTitle>
                  <CardDescription>
                    Filter by branch or status and review meeting outcomes in the
                    detail panel.
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={reviewBranchFilter} onValueChange={setReviewBranchFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_REVIEW_STATUS_VALUE}>
                        All statuses
                      </SelectItem>
                      {REVIEW_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={reviewColumns}
                  data={filteredReviewRows}
                  isLoading={managementReviewsLoading}
                  pageSize={12}
                  searchPlaceholder="Search by reference, title, chairperson, or branch..."
                  onRowClick={(row) => setSelectedReviewId(row.id)}
                  actions={(row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingReview(row);
                          setReviewFormError(null);
                          setIsReviewFormOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleReviewDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card
              className={
                highlightedRecord?.tab === "reviews" &&
                selectedReview?.id === highlightedRecord.id
                  ? "border-blue-300 bg-blue-50/40 shadow-sm ring-2 ring-blue-200 dark:border-blue-500/70 dark:bg-blue-950/20 dark:ring-blue-900/60"
                  : undefined
              }
            >
              <CardHeader>
                <CardTitle>Selected Management Review</CardTitle>
                <CardDescription>
                  Review the agenda, inputs, decisions, and actions from the
                  selected management review cycle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedReview ? (
                  <div className="space-y-6">
                    {qualityDeepLink.reviewId === selectedReview.id ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                        Opened from a direct Quality link. Filters were cleared so
                        this management review is visible.
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {selectedReview.referenceNumber}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={getReviewStatusBadgeClass(selectedReview.status)}
                          >
                            {selectedReview.status}
                          </Badge>
                        </div>
                        <h2 className="text-2xl font-semibold">
                          {selectedReview.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedReview.branchName} | Chairperson:{" "}
                          {selectedReview.chairperson || "Not recorded"}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingReview(selectedReview);
                          setReviewFormError(null);
                          setIsReviewFormOpen(true);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Meeting Date
                        </div>
                        <div
                          className={`mt-2 font-medium ${
                            selectedReview.overdue ? "text-red-600" : ""
                          }`}
                        >
                          {selectedReview.meetingLabel}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Next Review
                        </div>
                        <div className="mt-2 font-medium">
                          {formatDate(selectedReview.nextReviewDate)}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Chairperson
                        </div>
                        <div className="mt-2 font-medium">
                          {selectedReview.chairperson || "Not recorded"}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Status
                        </div>
                        <div className="mt-2 font-medium">{selectedReview.status}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Attendees</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedReview.attendees || "No attendees recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Agenda</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedReview.agenda || "No agenda recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Inputs Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedReview.inputsSummary ||
                            "No review inputs recorded."}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            Decisions & Outputs
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedReview.decisionsSummary ||
                            "No decisions or outputs recorded."}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Action Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                        {selectedReview.actionSummary ||
                          "No action summary recorded yet."}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No management review matches the current filters yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Approved</CardDescription>
                  <CardTitle className="text-3xl">{providerSummary.approved}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Providers currently approved for use.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Under Review</CardDescription>
                  <CardTitle className="text-3xl">{providerSummary.underReview}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Conditional or review-stage providers needing attention.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Overdue Reviews</CardDescription>
                  <CardTitle className="text-3xl">{providerSummary.overdue}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Re-evaluation dates that are already past due.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Preferred</CardDescription>
                  <CardTitle className="text-3xl">{providerSummary.preferred}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Providers rated as preferred.
                </CardContent>
              </Card>
            </div>

            <Card className="border-sky-100 bg-gradient-to-r from-sky-50/80 via-white to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-sky-600" />
                  Approved Supplier / External Provider Control
                </CardTitle>
                <CardDescription>
                  Track provider approval, contact details, evaluation dates, and conditional follow-up inside the QMS workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Building2 className="h-4 w-4 text-sky-600" />
                    Approve the provider
                  </div>
                  <p>Register the supplier, define the service scope, and set the approval status.</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Users className="h-4 w-4 text-violet-600" />
                    Keep the contact trail
                  </div>
                  <p>Store the primary contact, branch relevance, and communication detail in one place.</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <CalendarClock className="h-4 w-4 text-amber-600" />
                    Re-evaluate on time
                  </div>
                  <p>Use last and next evaluation dates so provider reviews stay visible in the operational calendar.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle>External Provider Register</CardTitle>
                  <CardDescription>
                    Filter by branch, provider type, or approval status and review the full approval record below.
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Select value={providerBranchFilter} onValueChange={setProviderBranchFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={providerTypeFilter} onValueChange={setProviderTypeFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by provider type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_PROVIDER_TYPE_VALUE}>All provider types</SelectItem>
                      {PROVIDER_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={providerStatusFilter} onValueChange={setProviderStatusFilter}>
                    <SelectTrigger className="w-full min-w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_PROVIDER_STATUS_VALUE}>All statuses</SelectItem>
                      {PROVIDER_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={providerColumns}
                  data={filteredProviderRows}
                  isLoading={externalProvidersLoading}
                  pageSize={12}
                  searchPlaceholder="Search by reference, company, contact, type, or branch..."
                  onRowClick={(row) => setSelectedProviderId(row.id)}
                  actions={(row) => (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingProvider(row);
                          setProviderFormError(null);
                          setIsProviderFormOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleProviderDelete(row)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card
              className={
                highlightedRecord?.tab === "providers" &&
                selectedProvider?.id === highlightedRecord.id
                  ? "border-blue-300 bg-blue-50/40 shadow-sm ring-2 ring-blue-200 dark:border-blue-500/70 dark:bg-blue-950/20 dark:ring-blue-900/60"
                  : undefined
              }
            >
              <CardHeader>
                <CardTitle>Selected External Provider</CardTitle>
                <CardDescription>
                  Review approval scope, contact detail, evaluation dates, and conditional notes for the selected provider.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedProvider ? (
                  <div className="space-y-6">
                    {qualityDeepLink.providerId === selectedProvider.id ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                        Opened from a direct Quality link. Filters were cleared so
                        this external provider is visible.
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{selectedProvider.referenceNumber}</Badge>
                          <Badge variant="outline">{selectedProvider.providerType}</Badge>
                          <Badge
                            variant="outline"
                            className={getProviderStatusBadgeClass(selectedProvider.status)}
                          >
                            {selectedProvider.status}
                          </Badge>
                          <Badge variant="outline">{selectedProvider.rating}</Badge>
                        </div>
                        <h2 className="text-2xl font-semibold">{selectedProvider.companyName}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedProvider.branchName} | Contact: {selectedProvider.primaryContact || "Not recorded"}
                        </p>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProvider(selectedProvider);
                          setProviderFormError(null);
                          setIsProviderFormOpen(true);
                        }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Approval Date
                        </div>
                        <div className="mt-2 font-medium">{formatDate(selectedProvider.approvalDate)}</div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Last Evaluation
                        </div>
                        <div className="mt-2 font-medium">{formatDate(selectedProvider.lastEvaluationDate)}</div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Next Evaluation
                        </div>
                        <div className={`mt-2 font-medium ${selectedProvider.overdue ? "text-red-600" : ""}`}>
                          {selectedProvider.nextEvaluationLabel}
                        </div>
                      </div>
                      <div className="rounded-xl border p-4">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Contact Detail
                        </div>
                        <div className="mt-2 font-medium">
                          {selectedProvider.email || selectedProvider.phone || "Not recorded"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Service Scope</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedProvider.serviceScope}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">General Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                          {selectedProvider.notes || "No notes recorded."}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Review / Corrective Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="whitespace-pre-wrap text-sm text-slate-700">
                        {selectedProvider.correctiveActionNotes ||
                          "No review or corrective notes recorded yet."}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No external provider matches the current filters yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FormDialog
          open={isActionFormOpen}
          onOpenChange={(open) => {
            setIsActionFormOpen(open);
            if (!open) {
              setEditingAction(null);
              setActionFormError(null);
            }
          }}
          title={editingAction ? "Edit Quality Action" : "Log Quality Action"}
          description="Capture the issue, assign ownership, record the cause, and close it out with verification."
          fields={actionFormFields}
          initialValues={actionInitialValues}
          onSubmit={handleActionSubmit}
          isLoading={
            createActionMutation.isPending || updateActionMutation.isPending
          }
          error={actionFormError}
          submitLabel={editingAction ? "Save Changes" : "Create Record"}
        />

        <FormDialog
          open={isAuditFormOpen}
          onOpenChange={(open) => {
            setIsAuditFormOpen(open);
            if (!open) {
              setEditingAudit(null);
              setAuditFormError(null);
            }
          }}
          title={editingAudit ? "Edit Audit Record" : "Add Audit Record"}
          description="Plan the audit cycle, record the criteria, and capture findings and follow-up."
          fields={auditFormFields}
          initialValues={auditInitialValues}
          onSubmit={handleAuditSubmit}
          isLoading={createAuditMutation.isPending || updateAuditMutation.isPending}
          error={auditFormError}
          submitLabel={editingAudit ? "Save Changes" : "Create Record"}
        />

        <FormDialog
          open={isReviewFormOpen}
          onOpenChange={(open) => {
            setIsReviewFormOpen(open);
            if (!open) {
              setEditingReview(null);
              setReviewFormError(null);
            }
          }}
          title={editingReview ? "Edit Management Review" : "Add Management Review"}
          description="Record the meeting inputs, decisions, and follow-up outputs from the management review cycle."
          fields={reviewFormFields}
          initialValues={reviewInitialValues}
          onSubmit={handleReviewSubmit}
          isLoading={
            createReviewMutation.isPending || updateReviewMutation.isPending
          }
          error={reviewFormError}
          submitLabel={editingReview ? "Save Changes" : "Create Record"}
        />

        <FormDialog
          open={isProviderFormOpen}
          onOpenChange={(open) => {
            setIsProviderFormOpen(open);
            if (!open) {
              setEditingProvider(null);
              setProviderFormError(null);
            }
          }}
          title={editingProvider ? "Edit External Provider" : "Add External Provider"}
          description="Record approved suppliers and external providers with their review dates and approval status."
          fields={providerFormFields}
          initialValues={providerInitialValues}
          onSubmit={handleProviderSubmit}
          isLoading={
            createProviderMutation.isPending || updateProviderMutation.isPending
          }
          error={providerFormError}
          submitLabel={editingProvider ? "Save Changes" : "Create Record"}
        />
      </div>
    </DashboardLayout>
  );
}
