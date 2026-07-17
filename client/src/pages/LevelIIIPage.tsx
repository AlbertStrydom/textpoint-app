import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { type FormField } from "@/components/FormDialog";
import { type ImportDialogResult } from "@/components/ImportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  buildEditableHtmlDocument,
  type EditableHtmlDocumentOptions,
  exportEditableHtmlDocument,
  exportStructuredPdfDocument,
  type StructuredPdfDocumentOptions,
  exportToCSV,
} from "@/lib/exportUtils";
import { trpc } from "@/lib/trpc";
import {
  buildLevelIIIDocumentAutomationRules,
  isLikelyLevelIIIAssessmentRequest,
} from "@shared/levelIIIDocumentAutomation";
import {
  buildLevelIIITechnicianCertificateContent,
  buildLevelIIITechnicianCertificatePdfContent,
  buildSuggestedLevelIIITechnicianCertificateFileName,
  hasOverlappingLevelIIITechnicianCertificateScope,
  resolveLevelIIITechnicianCertificateValidUntil,
  summarizeLevelIIITechnicianCertificateMethodLevels,
} from "@shared/levelIIICertificateWorkflow";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  BellRing,
  Building2,
  CalendarClock,
  Download,
  Edit2,
  FileText,
  Gauge,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react";
import type {
  LevelIIIActivityType,
  LevelIIIActivityStatus,
} from "./LevelIIIPage.types";
import type {
  AssessmentFormState,
  AssessmentBookingReadinessSnapshot,
  AuditTrailEntry,
  CertificateIssuanceImpactPreview,
  CertificateQueueFilter,
  CertificateSignOffAction,
  LevelIIIActivity,
  LevelIIIAssessment,
  LevelIIIAssessmentMethodLevel,
  LevelIIIAssessmentResult,
  LevelIIICertificateLifecycleSummary,
  LevelIIICertificateWorkflowNotice,
  LevelIIIClient,
  LevelIIIClientBranch,
  LevelIIIControlledDocumentMetadata,
  LevelIIIControlledDocumentRecord,
  LevelIIICrossTechnicianQueueLastStartedItem,
  LevelIIICrossTechnicianQueueSessionState,
  LevelIIIDocumentDefinitionFormState,
  LevelIIIDocumentGenerationFilter,
  LevelIIIDocumentGenerationQueueItem,
  LevelIIIDocumentGenerationSummary,
  LevelIIIDocumentWatchlistHandledEntry,
  LevelIIIEquipment,
  LevelIIIEquipmentStatus,
  LevelIIIEvidenceReviewState,
  LevelIIIEvidenceReviewSource,
  LevelIIIRolloutReadinessSummary,
  LevelIIISpecimen,
  LevelIIISpecimenStatus,
  LevelIIITabValue,
  LevelIIITechnician,
  LevelIIITechnicianCertificate,
  LevelIIITechnicianCertificateApprovalStatus,
  LevelIIITechnicianCertificateExportHistoryItem,
  LevelIIITechnicianCertificateStatus,
  LevelIIITechnicianCertificateValidityUnit,
  LevelIIITechnicianDocumentQueueHandledEntry,
  LevelIIITechnicianDocumentQueueItem,
  LevelIIITechnicianMethodQualification,
  LevelIIITechnicianQueueFilter,
  PortalActionQueueItem,
  PortalActionQueuePriority,
  PortalComment,
  PortalCommentRequestType,
  PortalCommentStatus,
  PortalLinkedLevelIIIActivity,
  PortalRequirementCustomField,
  PortalRequirementDefinition,
  PortalRequirementRow,
  PortalRequirementStatus,
  PortalServiceRequest,
  PortalServiceRequestMetadata,
  PortalServiceRequestStatus,
  PortalServiceRequestSupportingDocument,
  ReminderItem,
  RequirementTableRow,
  TechnicianCertificateFileLinkSuggestion,
  TechnicianCertificateFormState,
  TechnicianDirectUploadFormState,
  TechnicianDocumentControlSummary,
  TechnicianFormState,
  TechnicianIntakeQueueItem,
  TechnicianIntakeQueueSummary,
  TechnicianRequirementFormState,
  VisitCadence,
} from "./LevelIIIPage.types";
import {
  LEVELIII_DOCUMENT_WATCHLIST_HANDLED_STORAGE_KEY,
  LEVELIII_TECHNICIAN_DOCUMENT_QUEUE_HANDLED_STORAGE_KEY,
  LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY,
  buildTechnicianDocumentQueueItemSignature,
  getDateInputValue,
  parseOptionalDate,
  cleanOptionalString,
  formatLevelIIIStatusLabel,
  formatLevelIIICategoryLabel,
  getLevelIIIEvidencePreviewKind,
  isLevelIIIEvidenceInlinePreviewKind,
  fetchLevelIIIEvidencePreviewAsset,
  normaliseLevelIIIEvidenceReviewState,
  getLevelIIIRequirementRowPriority,
  isCurrentLikePortalRequirementStatus,
  dedupeLevelIIIRequirementDefinitions,
  dedupeLevelIIIRequirementRows,
  inferLevelIIIFileExtensionFromDataUrl,
  normalisePortalServiceRequestSupportingDocuments,
  cleanMethodArray,
  normalisePortalServiceRequestMetadata,
  parseImportList,
  parseImportBoolean,
  parseImportDateValue,
  normaliseEnumValue,
  normaliseImportKey,
  parseMethodQualificationPairs,
  buildImportedMethodQualifications,
  formatExportDate,
  slugifyImportToken,
  getTechnicianMethodQualifications,
  getTechnicianMethods,
  formatMethods,
  summariseTechnicianLevels,
  formatTechnicianLevels,
  getTechnicianLevelForMethod,
  getAssessmentMethodLevels,
  buildRequirementCustomRecordFields,
  getInitialRequirementCustomFieldValues,
  collectRequirementCustomFieldValues,
  formatRequirementCustomFieldValue,
  getRequirementCustomFieldSummary,
  getCertificateMethodLevels,
  formatCertificateValidityRule,
  getCertificateStatusBadge,
  getCertificateApprovalBadge,
  getRequirementStatusBadge,
  getPortalServiceRequestStatusBadge,
  getPortalCommentStatusBadge,
  getPortalCommentTypeLabel,
  getPortalActionQueuePriorityBadge,
  isAssessmentPortalRequest,
  getAssessmentBookingReadinessSnapshot,
  getAssessmentBookingReadinessBadge,
  getAssessmentBookingBlockingSummary,
  getPortalRequestDocumentAutomationRules,
  getNextPortalServiceRequestStatus,
  getNextPortalCommentStatus,
  getPortalRequestActivityType,
  formatAssessmentMethods,
  compareCertificatePreviewRecency,
  isCertificateExpiringSoon,
  getCertificateQueuePriority,
  compareCertificateQueueRows,
  getLevelIIIAutoSupersededCertificateNumbers,
  extractLevelIIICertificateBlockingConflictNumber,
  formatAssessmentLevels,
  formatAssessmentMethodLevelSummary,
  slugifyCertificateExportName,
  createEmptyAssessmentForm,
  createEmptyTechnicianForm,
  createEmptyTechnicianCertificateForm,
  readLevelIIIFileAsDataUrl,
  createEmptyTechnicianRequirementForm,
  createEmptyTechnicianDirectUploadForm,
  createEmptyLevelIIIDocumentDefinitionForm,
  getQualificationTypeLabel,
  getQualificationReviewDate,
  getQualificationReviewLabel,
  getDueBadge,
  buildLevelIIIDocumentGenerationItemSignature,
} from "./LevelIIIPage.utils"; // Keep .utils (extensionless import resolves both .ts and .tsx)

import { LevelIIIDialogs } from "@/components/LevelIIIDialogs";
import { LevelIIITabPanels } from "@/components/LevelIIITabPanels";
import {
  clientColumns,
  createActivityColumns,
  createActivityFields,
  createAssessmentColumns,
  createSpecimenFields,
  createTechnicianCertificateColumns,
  createTechnicianColumns,
  createTechnicianRequirementColumns,
  equipmentColumns,
  equipmentFields,
  portalAssessmentBookingColumns,
  portalCommentColumns,
  portalRequestManagementFields,
  portalServiceRequestColumns,
  clientFields,
  specimenColumns,
  technicianRequirementDefinitionColumns,
} from "./LevelIIIPage.columns";


export default function LevelIIIPage() {
  const utils = trpc.useUtils();
  const [location] = useLocation();
  const { data: methods = [] } = trpc.lecturers.methods.useQuery();
  const { data: specimenTypes = [] } = trpc.specimens.types.useQuery();
  const [showLinkedBranchClients, setShowLinkedBranchClients] = useState(false);
  const technicianComplianceSectionRef = useRef<HTMLDivElement | null>(null);
  const { data: clients = [], isLoading: clientsLoading } = trpc.levelIII.clients.list.useQuery({
    includeLinkedBranchClients: showLinkedBranchClients,
  });
  const { data: activities = [], isLoading: activitiesLoading } =
    trpc.levelIII.activities.list.useQuery();
  const { data: clientBranches = [] } = trpc.levelIII.clientBranches.list.useQuery();
  const { data: technicians = [], isLoading: techniciansLoading } =
    trpc.levelIII.technicians.list.useQuery();
  const { data: equipment = [], isLoading: equipmentLoading } =
    trpc.levelIII.equipment.list.useQuery();
  const { data: specimens = [], isLoading: specimensLoading } =
    trpc.levelIII.specimens.list.useQuery();
  const { data: assessments = [], isLoading: assessmentsLoading } =
    trpc.levelIII.assessments.list.useQuery();
  const { data: technicianCertificates = [], isLoading: technicianCertificatesLoading } =
    trpc.levelIII.technicianCertificates.list.useQuery();
  const { data: controlledDocuments = [] } = trpc.documents.list.useQuery();
  const { data: technicianCertificateExports = [] } =
    trpc.levelIII.technicianCertificates.exports.useQuery({ limit: 500 });
  const [selectedPortalClientFilter, setSelectedPortalClientFilter] = useState("all");
  const [selectedPortalBranchFilter, setSelectedPortalBranchFilter] = useState("all");
  const [portalRequestSearch, setPortalRequestSearch] = useState("");
  const [selectedCertificateQueueFilter, setSelectedCertificateQueueFilter] =
    useState<CertificateQueueFilter>("all");
  const [selectedDocumentGenerationFilter, setSelectedDocumentGenerationFilter] =
    useState<LevelIIIDocumentGenerationFilter>("all");
  const [selectedTechnicianQueueFilter, setSelectedTechnicianQueueFilter] =
    useState<LevelIIITechnicianQueueFilter>("all");
  const selectedPortalClientNumber =
    selectedPortalClientFilter === "all"
      ? 0
      : Number.parseInt(selectedPortalClientFilter, 10) || 0;
  const selectedPortalBranchNumber =
    selectedPortalBranchFilter === "all"
      ? null
      : Number.parseInt(selectedPortalBranchFilter, 10) || null;
  const { data: portalServiceRequests = [], isLoading: portalServiceRequestsLoading } =
    trpc.clientPortal.services.requestsList.useQuery(
      {
        clientId: selectedPortalClientNumber,
        branchId: selectedPortalBranchNumber,
      },
      { enabled: selectedPortalClientNumber > 0 }
    );
  const { data: portalComments = [], isLoading: portalCommentsLoading } =
    trpc.clientPortal.comments.list.useQuery(
      { clientId: selectedPortalClientNumber },
      { enabled: selectedPortalClientNumber > 0 }
    );
  const createClientMutation = trpc.levelIII.clients.create.useMutation();
  const updateClientMutation = trpc.levelIII.clients.update.useMutation();
  const deleteClientMutation = trpc.levelIII.clients.delete.useMutation();
  const createActivityMutation = trpc.levelIII.activities.create.useMutation();
  const updateActivityMutation = trpc.levelIII.activities.update.useMutation();
  const deleteActivityMutation = trpc.levelIII.activities.delete.useMutation();
  const createTechnicianMutation = trpc.levelIII.technicians.create.useMutation();
  const importDriveAuditTechnicianMutation =
    trpc.levelIII.technicians.importDriveAudit.useMutation();
  const updateTechnicianMutation = trpc.levelIII.technicians.update.useMutation();
  const deleteTechnicianMutation = trpc.levelIII.technicians.delete.useMutation();
  const createAssessmentMutation = trpc.levelIII.assessments.create.useMutation();
  const updateAssessmentMutation = trpc.levelIII.assessments.update.useMutation();
  const deleteAssessmentMutation = trpc.levelIII.assessments.delete.useMutation();
  const createTechnicianCertificateMutation =
    trpc.levelIII.technicianCertificates.create.useMutation();
  const updateTechnicianCertificateMutation =
    trpc.levelIII.technicianCertificates.update.useMutation();
  const deleteTechnicianCertificateMutation =
    trpc.levelIII.technicianCertificates.delete.useMutation();
  const signOffTechnicianCertificateMutation =
    trpc.levelIII.technicianCertificates.signOff.useMutation();
  const recordTechnicianCertificateExportMutation =
    trpc.levelIII.technicianCertificates.recordExport.useMutation();
  const generateEditableDocumentMutation = trpc.documents.generateEditable.useMutation();
  const submitControlledDocumentForReviewMutation = trpc.documents.submitForReview.useMutation();
  const approveControlledDocumentMutation = trpc.documents.approve.useMutation();
  const rejectControlledDocumentMutation = trpc.documents.reject.useMutation();
  const updatePortalServiceRequestStatusMutation =
    trpc.clientPortal.services.updateRequestStatus.useMutation();
  const generatePortalRequestPackMutation =
    trpc.clientPortal.services.generateRequestPack.useMutation();
  const updatePortalCommentStatusMutation =
    trpc.clientPortal.comments.updateStatus.useMutation();
  const createTechnicianRequirementDefinitionMutation =
    trpc.clientPortal.requirements.createDefinition.useMutation();
  const updateTechnicianRequirementDefinitionMutation =
    trpc.clientPortal.requirements.updateDefinition.useMutation();
  const upsertTechnicianRequirementMutation =
    trpc.clientPortal.requirements.upsertRecord.useMutation();
  const uploadTechnicianRequirementDocumentMutation =
    trpc.clientPortal.requirements.uploadDocument.useMutation();
  const createEquipmentMutation = trpc.levelIII.equipment.create.useMutation();
  const updateEquipmentMutation = trpc.levelIII.equipment.update.useMutation();
  const deleteEquipmentMutation = trpc.levelIII.equipment.delete.useMutation();
  const createSpecimenMutation = trpc.levelIII.specimens.create.useMutation();
  const updateSpecimenMutation = trpc.levelIII.specimens.update.useMutation();
  const deleteSpecimenMutation = trpc.levelIII.specimens.delete.useMutation();

  const [activeTab, setActiveTab] = useState<LevelIIITabValue>("clients");
  const [clientSearch, setClientSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [selectedClientFilter, setSelectedClientFilter] = useState("all");
  const [technicianDirectoryView, setTechnicianDirectoryView] = useState<"grouped" | "table">(
    "grouped"
  );
  const [selectedActivityClientFilter, setSelectedActivityClientFilter] = useState("all");
  const [selectedAssessmentClientFilter, setSelectedAssessmentClientFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [specimenFilter, setSpecimenFilter] = useState("all");
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [isTechnicianFormOpen, setIsTechnicianFormOpen] = useState(false);
  const [isEquipmentFormOpen, setIsEquipmentFormOpen] = useState(false);
  const [isSpecimenFormOpen, setIsSpecimenFormOpen] = useState(false);
  const [isAssessmentFormOpen, setIsAssessmentFormOpen] = useState(false);
  const [isTechnicianCertificateFormOpen, setIsTechnicianCertificateFormOpen] = useState(false);
  const [technicianCertificateEditorMode, setTechnicianCertificateEditorMode] = useState<
    "general" | "file_link"
  >("general");
  const [technicianCertificateFileLinkSuggestion, setTechnicianCertificateFileLinkSuggestion] =
    useState<TechnicianCertificateFileLinkSuggestion | null>(null);
  const [isTechnicianRequirementFormOpen, setIsTechnicianRequirementFormOpen] = useState(false);
  const [isTechnicianRequirementDefinitionFormOpen, setIsTechnicianRequirementDefinitionFormOpen] =
    useState(false);
  const [isPortalRequestManagementOpen, setIsPortalRequestManagementOpen] = useState(false);
  const [isClientImportOpen, setIsClientImportOpen] = useState(false);
  const [isTechnicianImportOpen, setIsTechnicianImportOpen] = useState(false);
  const [isEquipmentImportOpen, setIsEquipmentImportOpen] = useState(false);
  const [isSpecimenImportOpen, setIsSpecimenImportOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<LevelIIIClient | null>(null);
  const [editingActivity, setEditingActivity] = useState<LevelIIIActivity | null>(null);
  const [editingTechnician, setEditingTechnician] = useState<LevelIIITechnician | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<LevelIIIEquipment | null>(null);
  const [editingSpecimen, setEditingSpecimen] = useState<LevelIIISpecimen | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<LevelIIIAssessment | null>(null);
  const [editingTechnicianCertificate, setEditingTechnicianCertificate] =
    useState<LevelIIITechnicianCertificate | null>(null);
  const [editingTechnicianRequirementDefinition, setEditingTechnicianRequirementDefinition] =
    useState<PortalRequirementDefinition | null>(null);
  const [pendingControlledDocumentDecision, setPendingControlledDocumentDecision] = useState<{
    document: LevelIIIControlledDocumentRecord;
    action: "approve" | "reject";
  } | null>(null);
  const [controlledDocumentDecisionNote, setControlledDocumentDecisionNote] = useState("");
  const [handledDocumentGenerationEntries, setHandledDocumentGenerationEntries] = useState<
    LevelIIIDocumentWatchlistHandledEntry[]
  >([]);
  const [
    handledTechnicianDocumentQueueEntries,
    setHandledTechnicianDocumentQueueEntries,
  ] = useState<LevelIIITechnicianDocumentQueueHandledEntry[]>([]);
  const [selectedCrossTechnicianQueueSignatures, setSelectedCrossTechnicianQueueSignatures] = useState<
    string[]
  >([]);
  const [autoHandleCrossTechnicianQueueSessionItems, setAutoHandleCrossTechnicianQueueSessionItems] =
    useState(false);
  const [crossTechnicianQueueSearch, setCrossTechnicianQueueSearch] = useState("");
  const [showSavedSessionQueueOnly, setShowSavedSessionQueueOnly] = useState(false);
  const [crossTechnicianQueuePage, setCrossTechnicianQueuePage] = useState(1);
  const [crossTechnicianQueueSessionPeakCount, setCrossTechnicianQueueSessionPeakCount] = useState(0);
  const [crossTechnicianQueueLastStartedItem, setCrossTechnicianQueueLastStartedItem] =
    useState<LevelIIICrossTechnicianQueueLastStartedItem | null>(null);
  const [crossTechnicianQueueSessionUpdatedAt, setCrossTechnicianQueueSessionUpdatedAt] = useState<
    string | null
  >(null);
  const crossTechnicianQueueLoadedScopeRef = useRef<string | null>(null);
  const [documentGenerationBatchAction, setDocumentGenerationBatchAction] = useState<
    "create_drafts" | "submit_reviews" | "export_html" | "export_html_release_queue" | null
  >(null);

  const requestedTab = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("tab")?.trim();
    if (
      value === "clients" ||
      value === "activities" ||
      value === "technicians" ||
      value === "assessments" ||
      value === "portalRequests" ||
      value === "equipment" ||
      value === "specimens" ||
      value === "reminders"
    ) {
      return value as LevelIIITabValue;
    }
    return null;
  }, [location]);

  const requestedCertificateQueueFilter = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("certificateQueue")?.trim();
    if (
      value === "all" ||
      value === "approved" ||
      value === "in_review" ||
      value === "draft" ||
      value === "active" ||
      value === "superseded" ||
      value === "expiring_soon"
    ) {
      return value as CertificateQueueFilter;
    }
    return null;
  }, [location]);
  const crossTechnicianQueueSessionScopeKey =
    selectedClientFilter === "all" ? "all-clients" : `client-${selectedClientFilter}`;
  const crossTechnicianQueueSessionScopeLabel =
    selectedClientFilter === "all"
      ? "All clients"
      : (clients.find((client) => client.id === Number.parseInt(selectedClientFilter, 10))?.companyName ??
        `Client ${selectedClientFilter}`);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LEVELIII_DOCUMENT_WATCHLIST_HANDLED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setHandledDocumentGenerationEntries(
        parsed.filter(
          (entry): entry is LevelIIIDocumentWatchlistHandledEntry =>
            Boolean(entry) &&
            typeof entry === "object" &&
            typeof (entry as { certificateId?: unknown }).certificateId === "number" &&
            typeof (entry as { certificateNumber?: unknown }).certificateNumber === "string" &&
            typeof (entry as { technicianName?: unknown }).technicianName === "string" &&
            typeof (entry as { priorityLabel?: unknown }).priorityLabel === "string" &&
            typeof (entry as { signature?: unknown }).signature === "string" &&
            typeof (entry as { handledAt?: unknown }).handledAt === "string"
        )
      );
    } catch {
      window.localStorage.removeItem(LEVELIII_DOCUMENT_WATCHLIST_HANDLED_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LEVELIII_DOCUMENT_WATCHLIST_HANDLED_STORAGE_KEY,
      JSON.stringify(handledDocumentGenerationEntries.slice(0, 30))
    );
  }, [handledDocumentGenerationEntries]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        LEVELIII_TECHNICIAN_DOCUMENT_QUEUE_HANDLED_STORAGE_KEY
      );
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setHandledTechnicianDocumentQueueEntries(
        parsed.filter(
          (entry): entry is LevelIIITechnicianDocumentQueueHandledEntry =>
            Boolean(entry) &&
            typeof entry === "object" &&
            typeof (entry as { technicianId?: unknown }).technicianId === "number" &&
            typeof (entry as { definitionId?: unknown }).definitionId === "number" &&
            typeof (entry as { technicianName?: unknown }).technicianName === "string" &&
            typeof (entry as { definitionName?: unknown }).definitionName === "string" &&
            typeof (entry as { queueLabel?: unknown }).queueLabel === "string" &&
            typeof (entry as { signature?: unknown }).signature === "string" &&
            typeof (entry as { handledAt?: unknown }).handledAt === "string"
        )
      );
    } catch {
      window.localStorage.removeItem(LEVELIII_TECHNICIAN_DOCUMENT_QUEUE_HANDLED_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LEVELIII_TECHNICIAN_DOCUMENT_QUEUE_HANDLED_STORAGE_KEY,
      JSON.stringify(handledTechnicianDocumentQueueEntries.slice(0, 50))
    );
  }, [handledTechnicianDocumentQueueEntries]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY);
      if (!raw) {
        crossTechnicianQueueLoadedScopeRef.current = crossTechnicianQueueSessionScopeKey;
        setSelectedCrossTechnicianQueueSignatures([]);
        setCrossTechnicianQueueSessionUpdatedAt(null);
        setAutoHandleCrossTechnicianQueueSessionItems(false);
        setCrossTechnicianQueueSessionPeakCount(0);
        setCrossTechnicianQueueLastStartedItem(null);
        return;
      }

      const parsed = JSON.parse(raw) as
        | {
            sessions?: Record<string, Partial<LevelIIICrossTechnicianQueueSessionState> | null>;
          }
        | (Partial<LevelIIICrossTechnicianQueueSessionState> & { signatures?: unknown })
        | null;

      const legacySession =
        parsed &&
        typeof parsed === "object" &&
        Array.isArray((parsed as { signatures?: unknown }).signatures)
          ? (parsed as Partial<LevelIIICrossTechnicianQueueSessionState>)
          : null;
      const scopedSession =
        parsed &&
        typeof parsed === "object" &&
        "sessions" in parsed &&
        parsed.sessions &&
        typeof parsed.sessions === "object"
          ? parsed.sessions[crossTechnicianQueueSessionScopeKey] ?? null
          : legacySession;

      const nextSession: LevelIIICrossTechnicianQueueSessionState = {
        signatures: Array.isArray(scopedSession?.signatures)
          ? scopedSession.signatures.filter((entry: unknown): entry is string => typeof entry === "string")
          : [],
        updatedAt: typeof scopedSession?.updatedAt === "string" ? scopedSession.updatedAt : null,
        autoHandle: Boolean(scopedSession?.autoHandle),
        peakCount:
          typeof scopedSession?.peakCount === "number" && scopedSession.peakCount >= 0
            ? scopedSession.peakCount
            : 0,
        lastStartedItem:
          scopedSession?.lastStartedItem &&
          typeof scopedSession.lastStartedItem === "object" &&
          typeof (scopedSession.lastStartedItem as { signature?: unknown }).signature === "string" &&
          typeof (scopedSession.lastStartedItem as { technicianId?: unknown }).technicianId === "number" &&
          typeof (scopedSession.lastStartedItem as { technicianName?: unknown }).technicianName === "string" &&
          typeof (scopedSession.lastStartedItem as { definitionId?: unknown }).definitionId === "number" &&
          typeof (scopedSession.lastStartedItem as { definitionName?: unknown }).definitionName === "string" &&
          typeof (scopedSession.lastStartedItem as { queueLabel?: unknown }).queueLabel === "string" &&
          (((scopedSession.lastStartedItem as { action?: unknown }).action === "record") ||
            (scopedSession.lastStartedItem as { action?: unknown }).action === "upload") &&
          typeof (scopedSession.lastStartedItem as { startedAt?: unknown }).startedAt === "string"
            ? (scopedSession.lastStartedItem as LevelIIICrossTechnicianQueueLastStartedItem)
            : null,
      };

      crossTechnicianQueueLoadedScopeRef.current = crossTechnicianQueueSessionScopeKey;
      setSelectedCrossTechnicianQueueSignatures(nextSession.signatures);
      setCrossTechnicianQueueSessionUpdatedAt(nextSession.updatedAt);
      setAutoHandleCrossTechnicianQueueSessionItems(nextSession.autoHandle);
      setCrossTechnicianQueueSessionPeakCount(nextSession.peakCount);
      setCrossTechnicianQueueLastStartedItem(nextSession.lastStartedItem);
    } catch {
      window.localStorage.removeItem(LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY);
    }
  }, [crossTechnicianQueueSessionScopeKey]);

  useEffect(() => {
    if (crossTechnicianQueueLoadedScopeRef.current !== crossTechnicianQueueSessionScopeKey) {
      return;
    }
    const nextUpdatedAt =
      selectedCrossTechnicianQueueSignatures.length > 0 ? new Date().toISOString() : null;
    const nextPeakCount =
      selectedCrossTechnicianQueueSignatures.length === 0
        ? 0
        : Math.max(crossTechnicianQueueSessionPeakCount, selectedCrossTechnicianQueueSignatures.length);
    if (nextPeakCount !== crossTechnicianQueueSessionPeakCount) {
      setCrossTechnicianQueueSessionPeakCount(nextPeakCount);
    }
    setCrossTechnicianQueueSessionUpdatedAt(nextUpdatedAt);
    try {
      const raw = window.localStorage.getItem(LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const sessions =
        parsed && typeof parsed === "object" && parsed.sessions && typeof parsed.sessions === "object"
          ? { ...(parsed.sessions as Record<string, LevelIIICrossTechnicianQueueSessionState | null>) }
          : {};
      sessions[crossTechnicianQueueSessionScopeKey] = {
        signatures: selectedCrossTechnicianQueueSignatures,
        updatedAt: nextUpdatedAt,
        autoHandle: autoHandleCrossTechnicianQueueSessionItems,
        peakCount: nextPeakCount,
        lastStartedItem: crossTechnicianQueueLastStartedItem,
      };
      window.localStorage.setItem(
        LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY,
        JSON.stringify({ sessions })
      );
    } catch {
      window.localStorage.removeItem(LEVELIII_CROSS_TECHNICIAN_QUEUE_SESSION_STORAGE_KEY);
    }
  }, [
    autoHandleCrossTechnicianQueueSessionItems,
    crossTechnicianQueueLastStartedItem,
    crossTechnicianQueueSessionPeakCount,
    crossTechnicianQueueSessionScopeKey,
    selectedCrossTechnicianQueueSignatures,
  ]);

  useEffect(() => {
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
    if (
      requestedCertificateQueueFilter &&
      requestedCertificateQueueFilter !== selectedCertificateQueueFilter
    ) {
      setSelectedCertificateQueueFilter(requestedCertificateQueueFilter);
    }
  }, [activeTab, requestedCertificateQueueFilter, requestedTab, selectedCertificateQueueFilter]);
  const [selectedCertificateHistory, setSelectedCertificateHistory] =
    useState<LevelIIITechnicianCertificate | null>(null);
  const [pendingCertificateSignOff, setPendingCertificateSignOff] = useState<{
    certificate: LevelIIITechnicianCertificate;
    action: CertificateSignOffAction;
  } | null>(null);
  const [certificateSignOffNote, setCertificateSignOffNote] = useState("");
  const [lastCertificateWorkflowNotice, setLastCertificateWorkflowNotice] =
    useState<LevelIIICertificateWorkflowNotice | null>(null);
  const [selectedComplianceTechnicianId, setSelectedComplianceTechnicianId] = useState<number | null>(null);
  const [editingTechnicianRequirement, setEditingTechnicianRequirement] =
    useState<PortalRequirementRow | null>(null);
  const [selectedEvidenceReview, setSelectedEvidenceReview] =
    useState<LevelIIIEvidenceReviewState | null>(null);
  const [selectedEvidencePreviewUrl, setSelectedEvidencePreviewUrl] = useState<string | null>(null);
  const [selectedEvidencePreviewContentType, setSelectedEvidencePreviewContentType] =
    useState<string | null>(null);
  const [selectedEvidencePreviewError, setSelectedEvidencePreviewError] = useState<string | null>(null);
  const [isSelectedEvidencePreviewLoading, setIsSelectedEvidencePreviewLoading] = useState(false);
  const [shouldLoadSelectedEvidencePreview, setShouldLoadSelectedEvidencePreview] = useState(false);
  const [isTechnicianDirectUploadOpen, setIsTechnicianDirectUploadOpen] = useState(false);
  const [technicianDirectUploadFormValues, setTechnicianDirectUploadFormValues] =
    useState<TechnicianDirectUploadFormState>(createEmptyTechnicianDirectUploadForm);
  const [managingPortalRequest, setManagingPortalRequest] = useState<PortalServiceRequest | null>(null);
  const [technicianForm, setTechnicianForm] = useState<TechnicianFormState>(
    createEmptyTechnicianForm
  );
  const [assessmentForm, setAssessmentForm] = useState<AssessmentFormState>(
    createEmptyAssessmentForm
  );
  const [technicianCertificateForm, setTechnicianCertificateForm] =
    useState<TechnicianCertificateFormState>(createEmptyTechnicianCertificateForm);
  const [technicianRequirementFormValues, setTechnicianRequirementFormValues] =
    useState<Record<string, unknown>>(createEmptyTechnicianRequirementForm());
  const [
    technicianRequirementDefinitionFormValues,
    setTechnicianRequirementDefinitionFormValues,
  ] = useState<Record<string, unknown>>(createEmptyLevelIIIDocumentDefinitionForm());
  useEffect(() => {
    if (!selectedEvidenceReview?.fileUrl || !shouldLoadSelectedEvidencePreview) {
      setSelectedEvidencePreviewUrl(null);
      setSelectedEvidencePreviewContentType(null);
      setSelectedEvidencePreviewError(null);
      setIsSelectedEvidencePreviewLoading(false);
      return;
    }

    let isActive = true;
    let objectUrl: string | null = null;
    const previewKind = getLevelIIIEvidencePreviewKind(selectedEvidenceReview);

    setSelectedEvidencePreviewUrl(null);
    setSelectedEvidencePreviewContentType(cleanOptionalString(selectedEvidenceReview.contentType));
    setSelectedEvidencePreviewError(null);
    if (!isLevelIIIEvidenceInlinePreviewKind(previewKind)) {
      setIsSelectedEvidencePreviewLoading(false);
      return;
    }
    setIsSelectedEvidencePreviewLoading(true);

    void (async () => {
      try {
        const asset = await fetchLevelIIIEvidencePreviewAsset(selectedEvidenceReview);
        if (!isActive) {
          window.URL.revokeObjectURL(asset.objectUrl);
          return;
        }
        objectUrl = asset.objectUrl;
        setSelectedEvidencePreviewUrl(asset.objectUrl);
        setSelectedEvidencePreviewContentType(asset.contentType);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSelectedEvidencePreviewError(
          error instanceof Error ? error.message : "Could not load the stored file preview."
        );
      } finally {
        if (isActive) {
          setIsSelectedEvidencePreviewLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [selectedEvidenceReview, shouldLoadSelectedEvidencePreview]);
  const { data: technicianHistory = [], isLoading: technicianHistoryLoading } =
    trpc.levelIII.technicians.history.useQuery(
      { id: editingTechnician?.id ?? 0, limit: 12 },
      { enabled: Boolean(editingTechnician?.id && isTechnicianFormOpen) }
    );
  const {
    data: technicianCertificateHistory = [],
    isLoading: technicianCertificateHistoryLoading,
  } = trpc.levelIII.technicianCertificates.history.useQuery(
    { id: selectedCertificateHistory?.id ?? 0, limit: 20 },
    { enabled: Boolean(selectedCertificateHistory?.id) }
  );
  const {
    data: selectedCertificateAuditTrail = [],
    isLoading: selectedCertificateAuditTrailLoading,
  } = trpc.levelIII.technicianCertificates.auditTrail.useQuery(
    { id: selectedCertificateHistory?.id ?? 0, limit: 20 },
    { enabled: Boolean(selectedCertificateHistory?.id) }
  );
  const {
    data: technicianCertificateAuditTrail = [],
    isLoading: technicianCertificateAuditTrailLoading,
  } = trpc.levelIII.technicianCertificates.auditTrail.useQuery(
    { id: editingTechnicianCertificate?.id ?? 0, limit: 12 },
    { enabled: Boolean(editingTechnicianCertificate?.id && isTechnicianCertificateFormOpen) }
  );
  const hiddenLinkedBranchClientCount = useMemo(
    () =>
      new Set(
        clientBranches
          .map((branch) => branch.sourceClientId)
          .filter((value): value is number => value !== null && value !== undefined && Number.isInteger(value) && value > 0)
      ).size,
    [clientBranches]
  );

  const clientOptions = clients.map((client) => ({
    value: String(client.id),
    label: client.companyName,
  }));
  const technicianOptions = technicians.map((technician) => {
    const clientName =
      clients.find((client) => client.id === technician.clientId)?.companyName ??
      "Unlinked Client";
    const methodLabel = formatMethods(getTechnicianMethods(technician));
    return {
      value: String(technician.id),
      label: `${technician.name} | ${clientName} | ${methodLabel} | ${formatTechnicianLevels(technician)}`,
    };
  });
  const methodOptions =
    methods.length > 0
      ? methods.map((method) => ({
          value: method.name,
          label: method.name,
        }))
      : [
          { value: "UT", label: "UT" },
          { value: "MT", label: "MT" },
          { value: "PT", label: "PT" },
          { value: "RT", label: "RT" },
          { value: "VT", label: "VT" },
        ];
  const technicianMethodOptions = useMemo(() => {
    const values = new Map<string, string>();
    methodOptions.forEach((option) => values.set(option.value, option.label));
    technicians.forEach((technician) => {
      getTechnicianMethods(technician).forEach((methodName) => {
        if (!values.has(methodName)) {
          values.set(methodName, methodName);
        }
      });
    });
    return Array.from(values.entries()).map(([value, label]) => ({ value, label }));
  }, [methodOptions, technicians]);
  const assessmentResultOptions: Array<{ value: LevelIIIAssessmentResult; label: string }> = [
    { value: "Pass", label: "Pass" },
    { value: "Fail", label: "Fail" },
    { value: "Observation", label: "Observation" },
    { value: "Pending Review", label: "Pending Review" },
  ];
  const specimenTypeOptions =
    specimenTypes.length > 0
      ? specimenTypes.map((specimenType) => ({
          value: specimenType.name,
          label: [specimenType.name, specimenType.material].filter(Boolean).join(" | "),
        }))
      : [];
  const selectedAssessmentTechnician = technicians.find(
    (technician) => technician.id === Number.parseInt(assessmentForm.technicianId, 10)
  );
  const selectedCertificateTechnician = technicians.find(
    (technician) => technician.id === Number.parseInt(technicianCertificateForm.technicianId, 10)
  );
  const selectedComplianceTechnician = technicians.find(
    (technician) => technician.id === selectedComplianceTechnicianId
  );
  const selectedComplianceClientId = selectedComplianceTechnician?.clientId ?? 0;
  const selectedComplianceBranchId = selectedComplianceTechnician?.clientBranchId ?? null;
  const selectedTechnicianFilterClientId =
    selectedClientFilter === "all" ? 0 : Number.parseInt(selectedClientFilter, 10) || 0;
  const activeLevelIIIDocumentSetupClientId =
    selectedComplianceClientId || selectedTechnicianFilterClientId;
  const activeLevelIIIDocumentSetupClient =
    clients.find((client) => client.id === activeLevelIIIDocumentSetupClientId) ?? null;
  const { data: complianceDefinitions = [] } =
    trpc.clientPortal.requirements.listDefinitions.useQuery(
      { clientId: activeLevelIIIDocumentSetupClientId },
      { enabled: activeLevelIIIDocumentSetupClientId > 0 }
    );
  const { data: complianceMatrix = [], isLoading: complianceMatrixLoading } =
    trpc.clientPortal.requirements.listMatrix.useQuery(
      {
        clientId: selectedComplianceClientId,
        branchId: selectedComplianceBranchId,
      },
      { enabled: selectedComplianceClientId > 0 }
    );
  const levelIIIRequirementDefinitions = useMemo(
    () => dedupeLevelIIIRequirementDefinitions(complianceDefinitions as PortalRequirementDefinition[]),
    [complianceDefinitions]
  );
  const levelIIIDocumentTypeSummary = useMemo(
    () => ({
      total: levelIIIRequirementDefinitions.length,
      active: levelIIIRequirementDefinitions.filter((definition) => definition.active).length,
      required: levelIIIRequirementDefinitions.filter((definition) => definition.isRequired).length,
      noExpiry: levelIIIRequirementDefinitions.filter((definition) => !definition.validityDays).length,
    }),
    [levelIIIRequirementDefinitions]
  );
  const dedupedComplianceMatrix = useMemo(
    () => dedupeLevelIIIRequirementRows(complianceMatrix as PortalRequirementRow[]),
    [complianceMatrix]
  );
  const availableAssessmentMethods = useMemo(
    () =>
      (
        selectedAssessmentTechnician
          ? getTechnicianMethods(selectedAssessmentTechnician)
          : methodOptions.map((option) => option.value)
      ).filter(Boolean),
    [methodOptions, selectedAssessmentTechnician]
  );
  const availableCertificateMethods = useMemo(
    () =>
      (
        selectedCertificateTechnician
          ? getTechnicianMethods(selectedCertificateTechnician)
          : methodOptions.map((option) => option.value)
      ).filter(Boolean),
    [methodOptions, selectedCertificateTechnician]
  );
  const selectedCertificateAssessmentOptions = useMemo(() => {
    if (!selectedCertificateTechnician) return [];
    return assessments.filter(
      (assessment) => assessment.technicianId === selectedCertificateTechnician.id
    );
  }, [assessments, selectedCertificateTechnician]);
  const certificateWorkflowPreview = useMemo(() => {
    const issuedDate = parseOptionalDate(technicianCertificateForm.issuedDate);
    const validityValue =
      technicianCertificateForm.validityUnit === "custom"
        ? null
        : Number.parseInt(technicianCertificateForm.validityValue, 10);
    const resolvedValidUntil = resolveLevelIIITechnicianCertificateValidUntil({
      issuedDate,
      validUntil:
        technicianCertificateForm.validityUnit === "custom"
          ? parseOptionalDate(technicianCertificateForm.validUntil)
          : null,
      validityValue: Number.isFinite(validityValue) ? validityValue : null,
      validityUnit: technicianCertificateForm.validityUnit,
    });
    const methodSummary = summarizeLevelIIITechnicianCertificateMethodLevels(
      technicianCertificateForm.methodLevels
    );
    const suggestedFileName = buildSuggestedLevelIIITechnicianCertificateFileName(
      selectedCertificateTechnician?.name,
      technicianCertificateForm.methodLevels
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedStatus =
      technicianCertificateForm.status === "Revoked" ||
      technicianCertificateForm.status === "Superseded"
        ? technicianCertificateForm.status
        : resolvedValidUntil && resolvedValidUntil.getTime() < today.getTime()
          ? "Expired"
          : "Active";

    return {
      certificateNumber:
        cleanOptionalString(technicianCertificateForm.certificateNumber) ??
        "Auto-generated on save",
      methodSummary,
      issuedDate: getDateInputValue(issuedDate),
      validUntil: getDateInputValue(resolvedValidUntil),
      resolvedStatus,
      fileName:
        cleanOptionalString(technicianCertificateForm.fileName) ?? suggestedFileName,
    };
  }, [selectedCertificateTechnician?.name, technicianCertificateForm]);
  const certificateIssuanceImpactPreview = useMemo<CertificateIssuanceImpactPreview>(() => {
    const technicianId = Number.parseInt(technicianCertificateForm.technicianId, 10);
    const issuedDate = parseOptionalDate(technicianCertificateForm.issuedDate);
    if (
      !Number.isInteger(technicianId) ||
      technicianId <= 0 ||
      !issuedDate ||
      technicianCertificateForm.methodLevels.length === 0 ||
      certificateWorkflowPreview.resolvedStatus !== "Active"
    ) {
      return {
        canSave: true,
        willSupersedeCertificateIds: [],
        willSupersedeCertificateNumbers: [],
        blockingCertificateId: null,
        blockingCertificateNumber: null,
      };
    }

    const currentCertificateId = editingTechnicianCertificate?.id ?? 0;
    const currentPreviewRecord = {
      id: currentCertificateId > 0 ? currentCertificateId : Number.MAX_SAFE_INTEGER,
      issuedDate,
      createdAt:
        editingTechnicianCertificate?.createdAt ??
        editingTechnicianCertificate?.updatedAt ??
        issuedDate,
    };
    const overlappingActiveCertificates = technicianCertificates.filter(
      (certificate) =>
        certificate.technicianId === technicianId &&
        certificate.id !== currentCertificateId &&
        certificate.status === "Active" &&
        hasOverlappingLevelIIITechnicianCertificateScope(
          technicianCertificateForm.methodLevels,
          getCertificateMethodLevels(certificate)
        )
    );

    if (overlappingActiveCertificates.length === 0) {
      return {
        canSave: true,
        willSupersedeCertificateIds: [],
        willSupersedeCertificateNumbers: [],
        blockingCertificateId: null,
        blockingCertificateNumber: null,
      };
    }

    const blockingCertificate =
      overlappingActiveCertificates.find(
        (certificate) => compareCertificatePreviewRecency(certificate, currentPreviewRecord) >= 0
      ) ?? null;
    if (blockingCertificate) {
      return {
        canSave: false,
        willSupersedeCertificateIds: [],
        willSupersedeCertificateNumbers: [],
        blockingCertificateId: blockingCertificate.id,
        blockingCertificateNumber: blockingCertificate.certificateNumber,
      };
    }

    return {
      canSave: true,
      willSupersedeCertificateIds: overlappingActiveCertificates.map((certificate) => certificate.id),
      willSupersedeCertificateNumbers: overlappingActiveCertificates.map(
        (certificate) => certificate.certificateNumber
      ),
      blockingCertificateId: null,
      blockingCertificateNumber: null,
    };
  }, [
    certificateWorkflowPreview.resolvedStatus,
    editingTechnicianCertificate?.createdAt,
    editingTechnicianCertificate?.id,
    editingTechnicianCertificate?.updatedAt,
    technicianCertificateForm.issuedDate,
    technicianCertificateForm.methodLevels,
    technicianCertificateForm.technicianId,
    technicianCertificates,
  ]);
  const getLevelIIICertificateDocumentOptions = (
    record: LevelIIITechnicianCertificate
  ) => {
    const technician =
      technicians.find((entry) => entry.id === record.technicianId) ?? null;
    const client = technician
      ? clients.find((entry) => entry.id === technician.clientId) ?? null
      : null;
    const branch =
      technician?.clientBranchId
        ? (clientBranchesByClientId.get(technician.clientId) ?? []).find(
            (entry) => entry.id === technician.clientBranchId
          ) ?? null
        : null;
    const linkedAssessment =
      record.assessmentId
        ? assessments.find((entry) => entry.id === record.assessmentId) ?? null
        : null;
    const title = "Level III Technician Certificate";
    const qualificationBasis = technician?.hasPcnQualification ? "PCN" : "SNT-TC-1A";
    const content = buildLevelIIITechnicianCertificateContent({
      technicianName: technician?.name ?? "Technician",
      companyName: client?.companyName ?? "Client",
      branchName: branch?.name ?? null,
      certificateNumber: record.certificateNumber,
      issuedDate: formatExportDate(record.issuedDate),
      validUntil: record.validUntil ? formatExportDate(record.validUntil) : "No expiry recorded",
      qualificationBasis,
      methodLevels: getCertificateMethodLevels(record),
      assessor: linkedAssessment?.assessor ?? null,
      notes: record.notes,
    });

    return {
      filename:
        slugifyCertificateExportName(record.certificateNumber) || `leveliii-certificate-${record.id}`,
      title,
      subtitle: [
        technician?.name ?? "Technician",
        client?.companyName ?? "Client",
        branch?.name ?? null,
      ]
        .filter(Boolean)
        .join(" | "),
      content,
      design: {
        accentColor: "#0f766e",
        companyName: client?.companyName || "TextPoint",
        logoUrl: "",
      },
    };
  };

  const getLevelIIICertificatePdfOptions = (
    record: LevelIIITechnicianCertificate
  ) => {
    const technician =
      technicians.find((entry) => entry.id === record.technicianId) ?? null;
    const client = technician
      ? clients.find((entry) => entry.id === technician.clientId) ?? null
      : null;
    const branch =
      technician?.clientBranchId
        ? (clientBranchesByClientId.get(technician.clientId) ?? []).find(
            (entry) => entry.id === technician.clientBranchId
          ) ?? null
        : null;
    const linkedAssessment =
      record.assessmentId
        ? assessments.find((entry) => entry.id === record.assessmentId) ?? null
        : null;
    const qualificationBasis = technician?.hasPcnQualification ? "PCN" : "SNT-TC-1A";
    const pdfContent = buildLevelIIITechnicianCertificatePdfContent({
      technicianName: technician?.name ?? "Technician",
      companyName: client?.companyName ?? "Client",
      branchName: branch?.name ?? null,
      certificateNumber: record.certificateNumber,
      issuedDate: formatExportDate(record.issuedDate),
      validUntil: record.validUntil ? formatExportDate(record.validUntil) : "No expiry recorded",
      qualificationBasis,
      methodLevels: getCertificateMethodLevels(record),
      assessor: linkedAssessment?.assessor ?? null,
      notes: record.notes,
    });

    return {
      filename:
        slugifyCertificateExportName(record.certificateNumber) || `leveliii-certificate-${record.id}`,
      title: "Level III Technician Certificate",
      subtitle: [
        technician?.name ?? "Technician",
        client?.companyName ?? "Client",
        branch?.name ?? null,
      ]
        .filter(Boolean)
        .join(" | "),
      ...pdfContent,
    };
  };

  const getLevelIIITechnicianName = (technicianId: number) =>
    technicians.find((entry) => entry.id === technicianId)?.name ?? "Technician";

  const openLevelIIIDocumentRecord = (
    documentId: number,
    options?: {
      action?: "edit" | "preview";
      tab?: "generated" | "template" | "library";
    }
  ) => {
    const params = new URLSearchParams();
    params.set("tab", options?.tab || "generated");
    params.set("documentId", String(documentId));
    if (options?.action && options.action !== "edit") {
      params.set("documentAction", options.action);
    }
    window.location.href = `/documents?${params.toString()}`;
  };

  const buildLevelIIICertificateExportSummary = (
    record: LevelIIITechnicianCertificate
  ): Record<string, string | null> => ({
    certificateNumber: record.certificateNumber,
    technicianName: getLevelIIITechnicianName(record.technicianId),
    methodSummary: summarizeLevelIIITechnicianCertificateMethodLevels(
      getCertificateMethodLevels(record)
    ),
    issuedDate: getDateInputValue(record.issuedDate) || null,
    validUntil: getDateInputValue(record.validUntil) || null,
    status: record.status,
  });

  const recordLevelIIICertificateExport = async (
    record: LevelIIITechnicianCertificate,
    exportFormat: "html" | "pdf"
  ) => {
    if (record.approvalStatus !== "approved") {
      toast.error("Approve the certificate before exporting the final document.");
      return;
    }
    const exportOptions =
      exportFormat === "html"
        ? getLevelIIICertificateDocumentOptions(record)
        : getLevelIIICertificatePdfOptions(record);

    try {
      await recordTechnicianCertificateExportMutation.mutateAsync({
        certificateId: record.id,
        exportFormat,
        fileName: exportOptions.filename,
        title: exportOptions.title,
        subtitle: exportOptions.subtitle,
        artifactSummary: buildLevelIIICertificateExportSummary(record),
        artifactPayload: exportOptions as Record<string, unknown>,
      });
      await utils.levelIII.technicianCertificates.history.invalidate({
        id: record.id,
        limit: 20,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `${error.message} Export completed, but history was not recorded.`
          : "Export completed, but history was not recorded."
      );
    }
  };
  const createControlledLevelIIICertificateDocument = async (
    record: LevelIIITechnicianCertificate
  ) => {
    const technician = technicians.find((entry) => entry.id === record.technicianId) ?? null;
    const client = technician ? clients.find((entry) => entry.id === technician.clientId) ?? null : null;
    const htmlOptions = getLevelIIICertificateDocumentOptions(record);

    try {
      await generateEditableDocumentMutation.mutateAsync({
        title: `${record.certificateNumber} - Controlled Draft`,
        description: `Controlled Level III certificate document for ${technician?.name ?? "technician"}.`,
        content: htmlOptions.content,
        branchId: null,
        tags: {
          kind: "generated",
          generatedStatus: "Draft",
          approvalStatus: "Draft",
          sourceType: "leveliii_certificate",
          certificateId: record.id,
          technicianId: record.technicianId,
          technicianName: technician?.name ?? "",
          clientId: record.clientId,
          studentName: technician?.name ?? "",
          branchName:
            (technician?.clientBranchId
              ? clientBranchesByClientId
                  .get(technician.clientId)
                  ?.find((entry) => entry.id === technician.clientBranchId)?.name
              : null) ?? "",
          courseLabel: `Level III Certificate | ${client?.companyName ?? "Client"}`,
          documentCode: `L3-CERT-${record.id}`,
          issueNumber: "01",
          effectiveDate: getDateInputValue(record.issuedDate) || "",
          generatedAt: new Date().toISOString(),
        },
      });
      await utils.documents.list.invalidate();
      toast.success("Controlled certificate draft created in Documents.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not create the controlled certificate draft."
      );
    }
  };
  const submitControlledLevelIIICertificateDocumentForReview = async (
    document: LevelIIIControlledDocumentRecord
  ) => {
    try {
      await submitControlledDocumentForReviewMutation.mutateAsync({ id: document.id });
      await utils.documents.list.invalidate();
      toast.success("Controlled certificate draft submitted for review.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit the controlled document for review."
      );
    }
  };
  const openControlledLevelIIICertificateDecision = (
    document: LevelIIIControlledDocumentRecord,
    action: "approve" | "reject"
  ) => {
    setPendingControlledDocumentDecision({ document, action });
    setControlledDocumentDecisionNote("");
  };
  const closeControlledLevelIIICertificateDecision = () => {
    setPendingControlledDocumentDecision(null);
    setControlledDocumentDecisionNote("");
  };
  const openTechnicianComplianceWorkspace = (technicianId: number) => {
    const technician = technicians.find((entry) => entry.id === technicianId) ?? null;
    setActiveTab("technicians");
    if (technician?.clientId) {
      setSelectedClientFilter(String(technician.clientId));
    }
    setSelectedComplianceTechnicianId(technicianId);
    window.setTimeout(() => {
      technicianComplianceSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };
  const openClientComplianceBacklog = (clientId: number) => {
    setActiveTab("technicians");
    setSelectedClientFilter(String(clientId));
    setSelectedComplianceTechnicianId(null);
    window.setTimeout(() => {
      technicianComplianceSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };
  const handleTechnicianClientFilterChange = (value: string) => {
    setSelectedClientFilter(value);
    if (
      selectedComplianceTechnician &&
      value !== "all" &&
      selectedComplianceTechnician.clientId !== (Number.parseInt(value, 10) || 0)
    ) {
      setSelectedComplianceTechnicianId(null);
    }
  };
  const confirmControlledLevelIIICertificateDecision = async () => {
    if (!pendingControlledDocumentDecision) return;
    try {
      if (pendingControlledDocumentDecision.action === "approve") {
        await approveControlledDocumentMutation.mutateAsync({
          id: pendingControlledDocumentDecision.document.id,
          approvalNote: controlledDocumentDecisionNote.trim() || null,
          releaseAuthority: null,
          releaseAuthorityRole: null,
        });
        toast.success("Controlled certificate document approved.");
      } else {
        await rejectControlledDocumentMutation.mutateAsync({
          id: pendingControlledDocumentDecision.document.id,
          rejectionReason: controlledDocumentDecisionNote.trim(),
        });
        toast.success("Controlled certificate document rejected.");
      }
      await utils.documents.list.invalidate();
      closeControlledLevelIIICertificateDecision();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update the controlled document review status."
      );
    }
  };

  const handleSignOffLevelIIICertificate = async (
    record: LevelIIITechnicianCertificate,
    action: CertificateSignOffAction,
    note?: string
  ) => {
    try {
      await signOffTechnicianCertificateMutation.mutateAsync({
        id: record.id,
        action,
        note: note?.trim() || null,
      });
      await Promise.all([
        utils.levelIII.technicianCertificates.list.invalidate(),
        utils.levelIII.technicianCertificates.history.invalidate({
          id: record.id,
          limit: 20,
        }),
        utils.levelIII.technicianCertificates.auditTrail.invalidate({
          id: record.id,
          limit: 12,
        }),
      ]);
      const label =
        action === "submit"
          ? "Certificate sent for sign-off"
          : action === "approve"
            ? "Certificate approved"
            : action === "reject"
              ? "Certificate rejected"
            : "Certificate reopened";
      toast.success(label);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update certificate sign-off state."
      );
      return false;
    }
  };

  const openCertificateSignOffDialog = (
    certificate: LevelIIITechnicianCertificate,
    action: CertificateSignOffAction
  ) => {
    setPendingCertificateSignOff({ certificate, action });
    setCertificateSignOffNote(
      action === "approve" || action === "reject" ? "" : certificate.approvalNote ?? ""
    );
  };

  const closeCertificateSignOffDialog = () => {
    setPendingCertificateSignOff(null);
    setCertificateSignOffNote("");
  };
  const runDocumentGenerationBatchAction = async () => {
    if (!batchDocumentGenerationActionLabel || batchDocumentGenerationCandidates.length === 0) {
      return;
    }

    const action =
      selectedDocumentGenerationFilter === "missing_controlled"
        ? "create_drafts"
        : selectedDocumentGenerationFilter === "draft_progress"
          ? "submit_reviews"
          : selectedDocumentGenerationFilter === "ready_to_release"
            ? "export_html"
            : null;

    if (!action) {
      return;
    }

    setDocumentGenerationBatchAction(action);
    let completedCount = 0;

    try {
      for (const item of batchDocumentGenerationCandidates) {
        if (action === "create_drafts") {
          await createControlledLevelIIICertificateDocument(item.certificate);
          completedCount += 1;
          continue;
        }

        if (action === "submit_reviews" && item.latestControlledDocument) {
          await submitControlledLevelIIICertificateDocumentForReview(item.latestControlledDocument);
          completedCount += 1;
          continue;
        }

        if (action === "export_html") {
          exportEditableHtmlDocument(getLevelIIICertificateDocumentOptions(item.certificate));
          await recordLevelIIICertificateExport(item.certificate, "html");
          completedCount += 1;
        }
      }

      toast.success(
        `${batchDocumentGenerationActionLabel} completed for ${completedCount} item${
          completedCount === 1 ? "" : "s"
        }.`
      );
    } finally {
      setDocumentGenerationBatchAction(null);
    }
  };
  const markDocumentGenerationItemHandled = (item: LevelIIIDocumentGenerationQueueItem) => {
    const signature = buildLevelIIIDocumentGenerationItemSignature(item);
    setHandledDocumentGenerationEntries((current) => {
      const next = current.filter((entry) => entry.signature !== signature);
      next.unshift({
        certificateId: item.certificate.id,
        certificateNumber: item.certificate.certificateNumber,
        technicianName: item.technician?.name ?? "Unknown technician",
        priorityLabel: item.priorityLabel,
        signature,
        handledAt: new Date().toISOString(),
      });
      return next.slice(0, 30);
    });
    toast.success(`${item.certificate.certificateNumber} marked as handled.`);
  };
  const restoreHandledDocumentGenerationEntry = (entry: LevelIIIDocumentWatchlistHandledEntry) => {
    setHandledDocumentGenerationEntries((current) =>
      current.filter((currentEntry) => currentEntry.signature !== entry.signature)
    );
    toast.success(`${entry.certificateNumber} restored to the watchlist.`);
  };
  const clearHandledDocumentGenerationHistory = () => {
    setHandledDocumentGenerationEntries([]);
    toast.success("Cleared handled watchlist history.");
  };
  const markTechnicianDocumentQueueItemHandled = (item: LevelIIITechnicianDocumentQueueItem) => {
    const signature = buildTechnicianDocumentQueueItemSignature(item);
    setHandledTechnicianDocumentQueueEntries((current) => {
      const next = current.filter((entry) => entry.signature !== signature);
      next.unshift({
        technicianId: item.row.technicianId,
        definitionId: item.row.definitionId,
        technicianName: item.row.technicianName,
        definitionName: item.row.definitionName,
        queueLabel: item.queueLabel,
        signature,
        handledAt: new Date().toISOString(),
      });
      return next.slice(0, 50);
    });
    toast.success(`${item.row.definitionName} marked as handled.`);
  };
  const toggleCrossTechnicianQueueItemSelection = (item: LevelIIITechnicianDocumentQueueItem) => {
    const signature = buildTechnicianDocumentQueueItemSignature(item);
    setSelectedCrossTechnicianQueueSignatures((current) =>
      current.includes(signature)
        ? current.filter((entry) => entry !== signature)
        : [...current, signature]
    );
  };
  const markSelectedCrossTechnicianQueueItemsHandled = (
    items: LevelIIITechnicianDocumentQueueItem[]
  ) => {
    if (items.length === 0) {
      toast.error("Select at least one queue item first.");
      return;
    }
    const handledAt = new Date().toISOString();
    const signatures = new Set(items.map((item) => buildTechnicianDocumentQueueItemSignature(item)));
    setHandledTechnicianDocumentQueueEntries((current) => {
      const next = current.filter((entry) => !signatures.has(entry.signature));
      items
        .slice()
        .reverse()
        .forEach((item) => {
          next.unshift({
            technicianId: item.row.technicianId,
            definitionId: item.row.definitionId,
            technicianName: item.row.technicianName,
            definitionName: item.row.definitionName,
            queueLabel: item.queueLabel,
            signature: buildTechnicianDocumentQueueItemSignature(item),
            handledAt,
          });
        });
      return next.slice(0, 50);
    });
    setSelectedCrossTechnicianQueueSignatures((current) =>
      current.filter((signature) => !signatures.has(signature))
    );
    toast.success(`${items.length} queue item${items.length === 1 ? "" : "s"} marked as handled.`);
  };
  const startCrossTechnicianQueueSessionItem = (
    targetItem: LevelIIITechnicianDocumentQueueItem,
    action: "record" | "upload"
  ) => {
    const signature = buildTechnicianDocumentQueueItemSignature(targetItem);
    setSelectedCrossTechnicianQueueSignatures((current) =>
      current.filter((entry) => entry !== signature)
    );
    setCrossTechnicianQueueLastStartedItem({
      signature,
      technicianId: targetItem.row.technicianId,
      technicianName: targetItem.row.technicianName,
      definitionId: targetItem.row.definitionId,
      definitionName: targetItem.row.definitionName,
      queueLabel: targetItem.queueLabel,
      action,
      startedAt: new Date().toISOString(),
    });
    if (autoHandleCrossTechnicianQueueSessionItems) {
      setHandledTechnicianDocumentQueueEntries((current) => {
        const next = current.filter((entry) => entry.signature !== signature);
        next.unshift({
          technicianId: targetItem.row.technicianId,
          definitionId: targetItem.row.definitionId,
          technicianName: targetItem.row.technicianName,
          definitionName: targetItem.row.definitionName,
          queueLabel: targetItem.queueLabel,
          signature,
          handledAt: new Date().toISOString(),
        });
        return next.slice(0, 50);
      });
    }
    openCrossTechnicianQueueItem(targetItem, action);
  };
  const runNextSelectedCrossTechnicianQueueAction = (action: "record" | "upload") => {
    if (selectedCrossTechnicianQueueItems.length === 0) {
      toast.error("Select at least one queue item first.");
      return;
    }
    const targetItem =
      action === "upload"
        ? selectedCrossTechnicianQueueItems.find((item) => item.supportsUpload) ?? null
        : selectedCrossTechnicianQueueItems[0] ?? null;
    if (!targetItem) {
      toast.error("None of the selected queue items can be uploaded directly.");
      return;
    }
    startCrossTechnicianQueueSessionItem(targetItem, action);
    const remainingCount = selectedCrossTechnicianQueueItems.length - 1;
    toast.success(
      `${targetItem.row.technicianName} ${action === "upload" ? "upload" : "record"} opened${
        autoHandleCrossTechnicianQueueSessionItems ? " and marked handled" : ""
      }. ${remainingCount} selected item${remainingCount === 1 ? "" : "s"} remaining.`
    );
  };
  const restoreLastStartedCrossTechnicianQueueItem = () => {
    if (!crossTechnicianQueueLastStartedItem) {
      toast.error("No recently started queue item is available to restore.");
      return;
    }
    setSelectedCrossTechnicianQueueSignatures((current) =>
      current.includes(crossTechnicianQueueLastStartedItem.signature)
        ? current
        : [crossTechnicianQueueLastStartedItem.signature, ...current]
    );
    setHandledTechnicianDocumentQueueEntries((current) =>
      current.filter((entry) => entry.signature !== crossTechnicianQueueLastStartedItem.signature)
    );
    toast.success(
      `${crossTechnicianQueueLastStartedItem.definitionName} restored to the saved session.`
    );
  };
  const clearCrossTechnicianQueueSession = () => {
    setSelectedCrossTechnicianQueueSignatures([]);
    setCrossTechnicianQueueSessionPeakCount(0);
    setCrossTechnicianQueueLastStartedItem(null);
    setCrossTechnicianQueueSessionUpdatedAt(null);
    toast.success(`Cleared the saved queue session for ${crossTechnicianQueueSessionScopeLabel}.`);
  };
  const restoreHandledTechnicianDocumentQueueEntry = (
    entry: LevelIIITechnicianDocumentQueueHandledEntry
  ) => {
    setHandledTechnicianDocumentQueueEntries((current) =>
      current.filter((currentEntry) => currentEntry.signature !== entry.signature)
    );
    toast.success(`${entry.definitionName} restored to the queue.`);
  };
  const clearHandledTechnicianDocumentQueueHistory = () => {
    if (!selectedComplianceTechnicianId) {
      setHandledTechnicianDocumentQueueEntries([]);
      toast.success("Cleared technician queue history.");
      return;
    }
    setHandledTechnicianDocumentQueueEntries((current) =>
      current.filter((entry) => entry.technicianId !== selectedComplianceTechnicianId)
    );
    toast.success("Cleared technician queue history.");
  };

  const isStructuredPdfFieldList = (
    value: unknown
  ): value is Array<{ label: string; value: string }> =>
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Boolean(entry) &&
        typeof entry === "object" &&
        typeof (entry as { label?: unknown }).label === "string" &&
        typeof (entry as { value?: unknown }).value === "string"
    );

  const isStringList = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((entry) => typeof entry === "string");

  const parseEditableHtmlExportPayload = (
    value: Record<string, unknown> | null | undefined
  ): EditableHtmlDocumentOptions | null => {
    if (!value) return null;
    if (
      typeof value.filename !== "string" ||
      typeof value.title !== "string" ||
      typeof value.content !== "string"
    ) {
      return null;
    }

    return {
      filename: value.filename,
      title: value.title,
      subtitle: typeof value.subtitle === "string" ? value.subtitle : undefined,
      content: value.content,
      design:
        value.design && typeof value.design === "object"
          ? (value.design as EditableHtmlDocumentOptions["design"])
          : undefined,
      layout:
        value.layout && typeof value.layout === "object"
          ? (value.layout as EditableHtmlDocumentOptions["layout"])
          : undefined,
    };
  };

  const parseStructuredPdfExportPayload = (
    value: Record<string, unknown> | null | undefined
  ): StructuredPdfDocumentOptions | null => {
    if (!value || typeof value.filename !== "string" || typeof value.title !== "string") {
      return null;
    }

    return {
      filename: value.filename,
      title: value.title,
      subtitle: typeof value.subtitle === "string" ? value.subtitle : undefined,
      fields: isStructuredPdfFieldList(value.fields) ? value.fields : undefined,
      paragraphs: isStringList(value.paragraphs) ? value.paragraphs : undefined,
    };
  };

  const handleReplayLevelIIICertificateExport = (
    entry: LevelIIITechnicianCertificateExportHistoryItem
  ) => {
    if (entry.exportFormat === "html") {
      const options = parseEditableHtmlExportPayload(entry.artifactPayload);
      if (!options) {
        toast.error("This HTML export record is missing a reusable payload.");
        return;
      }
      exportEditableHtmlDocument(options);
      toast.success("Certificate HTML export regenerated");
      return;
    }

    const options = parseStructuredPdfExportPayload(entry.artifactPayload);
    if (!options) {
      toast.error("This PDF export record is missing a reusable payload.");
      return;
    }
    exportStructuredPdfDocument(options);
    toast.success("Certificate PDF export regenerated");
  };

  const handlePreviewLevelIIICertificate = (record: LevelIIITechnicianCertificate) => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Unable to open certificate preview.");
      return;
    }

    previewWindow.document.write(
      buildEditableHtmlDocument(getLevelIIICertificateDocumentOptions(record))
    );
    previewWindow.document.close();
  };
  const activeTechnicianRequirementDefinition = useMemo(() => {
    const definitionId = Number.parseInt(
      String(technicianRequirementFormValues.definitionId ?? ""),
      10
    );
    return (
      levelIIIRequirementDefinitions.find(
        (definition) => definition.id === definitionId
      ) ?? null
    );
  }, [complianceDefinitions, technicianRequirementFormValues.definitionId]);
  const clientsByReference = useMemo(() => {
    const lookup = new Map<string, LevelIIIClient>();
    clients.forEach((client) => {
      lookup.set(String(client.id), client);
      lookup.set(normaliseImportKey(client.companyName), client);
      lookup.set(normaliseImportKey(client.email), client);
      lookup.set(normaliseImportKey(client.primaryContact), client);
    });
    return lookup;
  }, [clients]);
  const clientBranchesById = useMemo(
    () => new Map(clientBranches.map((branch) => [branch.id, branch] as const)),
    [clientBranches]
  );
  const clientBranchesByClientId = useMemo(() => {
    const grouped = new Map<number, LevelIIIClientBranch[]>();
    clientBranches.forEach((branch) => {
      const existing = grouped.get(branch.clientId) ?? [];
      existing.push(branch);
      grouped.set(branch.clientId, existing);
    });
    return grouped;
  }, [clientBranches]);
  const selectedClientBranchOptions = useMemo(() => {
    const clientId = Number.parseInt(technicianForm.clientId, 10);
    if (!clientId) return [];
    return (clientBranchesByClientId.get(clientId) ?? []).filter((branch) => branch.active);
  }, [clientBranchesByClientId, technicianForm.clientId]);
  const selectedPortalBranchOptions = useMemo(() => {
    if (!selectedPortalClientNumber) return [];
    return (clientBranchesByClientId.get(selectedPortalClientNumber) ?? []).filter(
      (branch) => branch.active
    );
  }, [clientBranchesByClientId, selectedPortalClientNumber]);
  const technicianCertificatesByTechnicianId = useMemo(() => {
    const grouped = new Map<number, LevelIIITechnicianCertificate[]>();
    technicianCertificates.forEach((certificate) => {
      const existing = grouped.get(certificate.technicianId) ?? [];
      existing.push(certificate);
      grouped.set(certificate.technicianId, existing);
    });
    return grouped;
  }, [technicianCertificates]);
  const latestTechnicianCertificateByTechnicianId = useMemo(() => {
    const entries = new Map<number, LevelIIITechnicianCertificate>();
    technicianCertificates.forEach((certificate) => {
      if (!entries.has(certificate.technicianId)) {
        entries.set(certificate.technicianId, certificate);
      }
    });
    return entries;
  }, [technicianCertificates]);
  const primaryTechnicianCertificateByTechnicianId = useMemo(() => {
    const entries = new Map<number, LevelIIITechnicianCertificate>();

    technicianCertificatesByTechnicianId.forEach((certificates, technicianId) => {
      const ranked = [...certificates].sort((left, right) => {
        const leftActive = left.status === "Active" ? 1 : 0;
        const rightActive = right.status === "Active" ? 1 : 0;
        if (leftActive !== rightActive) {
          return rightActive - leftActive;
        }

        const leftUpdatedAt = new Date(left.updatedAt).getTime() || 0;
        const rightUpdatedAt = new Date(right.updatedAt).getTime() || 0;
        if (leftUpdatedAt !== rightUpdatedAt) {
          return rightUpdatedAt - leftUpdatedAt;
        }

        return right.id - left.id;
      });

      if (ranked[0]) {
        entries.set(technicianId, ranked[0]);
      }
    });

    return entries;
  }, [technicianCertificatesByTechnicianId]);
  const controlledDocumentsByCertificateId = useMemo(() => {
    const grouped = new Map<number, LevelIIIControlledDocumentRecord[]>();
    (controlledDocuments as LevelIIIControlledDocumentRecord[]).forEach((document) => {
      const metadata = document.tags ?? {};
      if (metadata.kind !== "generated" || metadata.sourceType !== "leveliii_certificate") {
        return;
      }
      const certificateId = Number(metadata.certificateId ?? 0);
      if (!certificateId) return;
      const existing = grouped.get(certificateId) ?? [];
      existing.push(document);
      grouped.set(certificateId, existing);
    });
    return grouped;
  }, [controlledDocuments]);
  const latestTechnicianCertificateExportByCertificateId = useMemo(() => {
    const grouped = new Map<number, LevelIIITechnicianCertificateExportHistoryItem>();
    technicianCertificateExports.forEach((entry) => {
      const existing = grouped.get(entry.certificateId);
      if (!existing) {
        grouped.set(entry.certificateId, entry);
        return;
      }

      const existingTime = new Date(existing.createdAt ?? 0).getTime() || 0;
      const nextTime = new Date(entry.createdAt ?? 0).getTime() || 0;
      if (nextTime > existingTime) {
        grouped.set(entry.certificateId, entry);
      }
    });
    return grouped;
  }, [technicianCertificateExports]);
  const approvedControlledDocumentByCertificateId = useMemo(() => {
    const grouped = new Map<number, LevelIIIControlledDocumentRecord>();
    controlledDocumentsByCertificateId.forEach((documents, certificateId) => {
      const approved = documents
        .filter((document) => String(document.tags?.approvalStatus || "Draft") === "Approved")
        .sort(
          (left, right) =>
            (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0)
        )[0];
      if (approved) {
        grouped.set(certificateId, approved);
      }
    });
    return grouped;
  }, [controlledDocumentsByCertificateId]);

  const resolveClientReference = (value: unknown) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return null;
    return (
      clientsByReference.get(trimmed) ??
      clientsByReference.get(normaliseImportKey(trimmed)) ??
      null
    );
  };

  const resolveClientBranchReference = (clientId: number, row: Record<string, unknown>) => {
    const branchesForClient = clientBranchesByClientId.get(clientId) ?? [];
    const branchIdValue = String(row.clientBranchId ?? "").trim();
    if (branchIdValue) {
      const parsedBranchId = Number.parseInt(branchIdValue, 10);
      if (Number.isNaN(parsedBranchId)) {
        throw new Error(`client branch ID "${branchIdValue}" is not valid.`);
      }
      const branchById = branchesForClient.find((branch) => branch.id === parsedBranchId);
      if (!branchById) {
        throw new Error(`client branch ID "${branchIdValue}" could not be matched.`);
      }
      return branchById;
    }

    const branchCode = normaliseImportKey(row.clientBranchCode ?? row.branchCode);
    if (branchCode) {
      const branchByCode = branchesForClient.find(
        (branch) => normaliseImportKey(branch.code) === branchCode
      );
      if (!branchByCode) {
        throw new Error(`client branch code "${row.clientBranchCode ?? row.branchCode}" could not be matched.`);
      }
      return branchByCode;
    }

    const branchName = normaliseImportKey(
      row.clientBranchName ?? row.branchName ?? row.branch
    );
    if (branchName) {
      const branchByName = branchesForClient.find(
        (branch) => normaliseImportKey(branch.name) === branchName
      );
      if (!branchByName) {
        throw new Error(`client branch "${row.clientBranchName ?? row.branchName ?? row.branch}" could not be matched.`);
      }
      return branchByName;
    }

    return null;
  };

  const exportClientsCsv = () => {
    exportToCSV(
      filteredClients.map((client) => ({
        "Company Name": client.companyName,
        "Primary Contact": client.primaryContact,
        "Secondary Contact": client.secondaryContact ?? "",
        "Primary Email": client.email,
        "Secondary Email": client.secondaryEmail ?? "",
        Phone: client.phone,
        "Secondary Phone": client.secondaryPhone ?? "",
        "Physical Address": client.physicalAddress,
        "Visit Cadence": client.visitCadence,
        "Last Visit": formatExportDate(client.lastVisit),
        "Next Visit": formatExportDate(client.nextVisit),
        "Procedure Review Date": formatExportDate(client.procedureUpdatedAt),
        Notes: client.notes ?? "",
      })),
      "level-iii-clients"
    );
    toast.success("Level III clients exported to CSV");
  };

  const exportTechniciansCsv = () => {
    exportToCSV(
      filteredTechnicians.map((technician) => ({
        Company:
          clients.find((client) => client.id === technician.clientId)?.companyName ?? "",
        "Client Branch":
          (technician.clientBranchId
            ? clientBranchesById.get(technician.clientBranchId)?.name
            : null) ?? "",
        "Client Branch Code":
          (technician.clientBranchId
            ? clientBranchesById.get(technician.clientBranchId)?.code
            : null) ?? "",
        Technician: technician.name,
        Email: technician.email,
        Phone: technician.phone ?? "",
        Methods: formatMethods(getTechnicianMethods(technician)),
        "Method Qualifications": getTechnicianMethodQualifications(technician)
          .map((entry) => `${entry.method}: ${entry.level}`)
          .join(" | "),
        "Level Summary": formatTechnicianLevels(technician),
        Qualification: technician.hasPcnQualification ? "PCN" : "SNT-TC-1A",
        "Certificate Number": technician.certificateNumber ?? "",
        "Procedure Status": technician.procedureStatus ?? "",
        "PCN Renewal Date": formatExportDate(technician.pcnRenewalDate),
        "Internal Assessment Date": formatExportDate(technician.internalAssessmentDate),
        "Eye Test Valid Until": formatExportDate(technician.eyeTestValidUntil),
        Notes: technician.notes ?? "",
      })),
      "level-iii-technicians"
    );
    toast.success("Level III technicians exported to CSV");
  };
  const exportCrossTechnicianQueueCsv = () => {
    exportToCSV(
      filteredCrossTechnicianBulkQueueItems.map((item) => ({
        Technician: item.row.technicianName,
        Company:
          clients.find(
            (client) => client.id === technicians.find((tech) => tech.id === item.row.technicianId)?.clientId
          )?.companyName ?? "",
        Queue: item.queueLabel,
        Requirement: item.row.definitionName,
        Category: formatLevelIIICategoryLabel(item.row.definitionCategory),
        Status: formatLevelIIIStatusLabel(item.row.status),
        "Valid Until": formatExportDate(item.row.validUntil),
        "Latest Document": item.row.latestDocumentName ?? "",
        "Document Count": item.row.documentCount,
        Reason: item.reason,
      })),
      "level-iii-cross-technician-document-queue"
    );
    toast.success("Cross-technician document queue exported to CSV");
  };
  const exportSelectedCrossTechnicianQueueCsv = (
    items: LevelIIITechnicianDocumentQueueItem[],
    fileName = "level-iii-cross-technician-document-queue-selected"
  ) => {
    exportToCSV(
      items.map((item) => ({
        Technician: item.row.technicianName,
        Company:
          clients.find(
            (client) => client.id === technicians.find((tech) => tech.id === item.row.technicianId)?.clientId
          )?.companyName ?? "",
        Queue: item.queueLabel,
        Requirement: item.row.definitionName,
        Category: formatLevelIIICategoryLabel(item.row.definitionCategory),
        Status: formatLevelIIIStatusLabel(item.row.status),
        "Valid Until": formatExportDate(item.row.validUntil),
        "Latest Document": item.row.latestDocumentName ?? "",
        "Document Count": item.row.documentCount,
        Reason: item.reason,
      })),
      fileName
    );
    toast.success(`${items.length} selected queue item${items.length === 1 ? "" : "s"} exported to CSV`);
  };
  const exportClientComplianceBacklogCsv = () => {
    exportToCSV(
      clientComplianceBacklogSummary.map((item) => ({
        Client: item.clientName,
        "Open Items": item.openItems,
        "Technicians Affected": item.techniciansAffected,
        "Missing Evidence": item.missingEvidence,
        "Pending Review": item.pendingReview,
        Expired: item.expired,
        "Current Without Evidence": item.currentWithoutEvidence,
      })),
      "level-iii-client-compliance-backlog"
    );
    toast.success("Client compliance backlog exported to CSV");
  };
  const exportTechnicianComplianceBacklogCsv = () => {
    exportToCSV(
      technicianComplianceBacklogSummary.map((item) => ({
        Technician: item.technicianName,
        Client: item.clientName,
        "Open Items": item.openItems,
        "Missing Evidence": item.missingEvidence,
        "Pending Review": item.pendingReview,
        Expired: item.expired,
        "Current Without Evidence": item.currentWithoutEvidence,
      })),
      "level-iii-technician-compliance-backlog"
    );
    toast.success("Technician compliance backlog exported to CSV");
  };

  const exportTechnicianCertificatesCsv = () => {
    exportToCSV(
      filteredTechnicianCertificates.map((certificate) => {
        const technician = technicians.find((entry) => entry.id === certificate.technicianId);
        const client = technician
          ? clients.find((entry) => entry.id === technician.clientId)
          : null;
        const branch =
          technician?.clientBranchId !== null && technician?.clientBranchId !== undefined
            ? clientBranchesById.get(technician.clientBranchId)
            : null;
        return {
          "Certificate Number": certificate.certificateNumber,
          Technician: technician?.name ?? "",
          Company: client?.companyName ?? "",
          "Client Branch": branch?.name ?? "",
          Methods: certificate.method,
          Levels: certificate.level,
          "Issued Date": formatExportDate(certificate.issuedDate),
          "Valid Until": formatExportDate(certificate.validUntil),
          "Validity Rule": formatCertificateValidityRule(certificate),
          Status: certificate.status,
          "Assessment ID": certificate.assessmentId ?? "",
          "File Name": certificate.fileName ?? "",
          "File URL": certificate.fileUrl ?? "",
          Notes: certificate.notes ?? "",
        };
      }),
      "level-iii-technician-certificates"
    );
    toast.success("Level III technician certificates exported to CSV");
  };

  const openNewTechnicianCertificateForm = (technician?: LevelIIITechnician | null) => {
    setTechnicianCertificateEditorMode("general");
    setTechnicianCertificateFileLinkSuggestion(null);
    setEditingTechnicianCertificate(null);
    setTechnicianCertificateForm({
      ...createEmptyTechnicianCertificateForm(),
      technicianId: technician ? String(technician.id) : "",
      methodLevels: technician ? getTechnicianMethodQualifications(technician) : [],
    });
    setIsTechnicianCertificateFormOpen(true);
  };
  const openCertificateStorageLinker = (item: LevelIIIDocumentGenerationQueueItem) => {
    setTechnicianCertificateEditorMode("file_link");
    setTechnicianCertificateFileLinkSuggestion({
      recommendedFileName: item.recommendedFileName,
      storageTargets: item.storageTargets,
    });
    setEditingTechnicianCertificate(item.certificate);
    const certificate = item.certificate;
    if (certificate) {
      const nextForm = {
        technicianId: String(certificate.technicianId),
        assessmentId: certificate.assessmentId ? String(certificate.assessmentId) : "",
        certificateNumber: certificate.certificateNumber ?? "",
        issuedDate: getDateInputValue(certificate.issuedDate),
        validUntil: getDateInputValue(certificate.validUntil),
        validityValue:
          certificate.validityValue !== null && certificate.validityValue !== undefined
            ? String(certificate.validityValue)
            : "",
        validityUnit: certificate.validityUnit ?? "custom",
        status: certificate.status ?? "Active",
        approvalStatus: certificate.approvalStatus ?? "draft",
        notes: certificate.notes ?? "",
        fileName: certificate.fileName ?? "",
        fileUrl: certificate.fileUrl ?? "",
        attachmentFileDataUrl: "",
        attachmentFileName: "",
        methodLevels: getCertificateMethodLevels(certificate),
      };
      setTechnicianCertificateForm(nextForm);
    }
    setIsTechnicianCertificateFormOpen(true);
  };

  const handleSubmitTechnicianCertificateForm = async () => {
    const technicianId = Number.parseInt(technicianCertificateForm.technicianId, 10);
    const assessmentId = technicianCertificateForm.assessmentId
      ? Number.parseInt(technicianCertificateForm.assessmentId, 10)
      : null;
    const methodLevels = technicianCertificateForm.methodLevels
      .map((entry) => ({
        method: entry.method.trim(),
        level: entry.level.trim(),
      }))
      .filter((entry) => entry.method && entry.level);

    if (!technicianId) {
      toast.error("Please choose a technician.");
      return;
    }
    if (!technicianCertificateForm.issuedDate) {
      toast.error("Please choose the issued date.");
      return;
    }
    if (methodLevels.length === 0) {
      toast.error("Choose at least one certificate method and level.");
      return;
    }
    if (!certificateIssuanceImpactPreview.canSave) {
      toast.error(
        certificateIssuanceImpactPreview.blockingCertificateNumber
          ? `A newer active certificate already covers this scope (${certificateIssuanceImpactPreview.blockingCertificateNumber}).`
          : "A newer active certificate already covers this scope."
      );
      return;
    }
    if (
      technicianCertificateForm.validityUnit === "custom" &&
      !technicianCertificateForm.validUntil
    ) {
      toast.error("Please choose the custom valid-until date.");
      return;
    }
    if (
      technicianCertificateForm.validityUnit !== "custom" &&
      (!technicianCertificateForm.validityValue ||
        Number.parseInt(technicianCertificateForm.validityValue, 10) <= 0)
    ) {
      toast.error("Please enter a validity value greater than zero.");
      return;
    }

    const payload = {
      technicianId,
      assessmentId,
      certificateNumber: cleanOptionalString(technicianCertificateForm.certificateNumber),
      methodLevels,
      issuedDate: parseOptionalDate(technicianCertificateForm.issuedDate) ?? new Date(),
      validUntil:
        technicianCertificateForm.validityUnit === "custom"
          ? parseOptionalDate(technicianCertificateForm.validUntil)
          : null,
      validityValue:
        technicianCertificateForm.validityUnit === "custom"
          ? null
          : Number.parseInt(technicianCertificateForm.validityValue, 10),
      validityUnit: technicianCertificateForm.validityUnit,
      status: technicianCertificateForm.status,
      fileName: cleanOptionalString(technicianCertificateForm.fileName),
      fileUrl: cleanOptionalString(technicianCertificateForm.fileUrl),
      attachmentFileDataUrl: cleanOptionalString(
        technicianCertificateForm.attachmentFileDataUrl
      ),
      attachmentFileName: cleanOptionalString(technicianCertificateForm.attachmentFileName),
      notes: cleanOptionalString(technicianCertificateForm.notes),
    };

    try {
      const previousApprovalStatus = editingTechnicianCertificate?.approvalStatus ?? null;
      let savedCertificate: LevelIIITechnicianCertificate | null = null;
      if (editingTechnicianCertificate) {
        savedCertificate = await updateTechnicianCertificateMutation.mutateAsync({
          id: editingTechnicianCertificate.id,
          data: payload,
        });
      } else {
        savedCertificate = await createTechnicianCertificateMutation.mutateAsync(payload);
      }

      await Promise.all([
        utils.levelIII.technicianCertificates.list.invalidate(),
        utils.levelIII.technicians.list.invalidate(),
        utils.clientPortal.requirements.listMatrix.invalidate(),
        utils.clientPortal.requirements.listDefinitions.invalidate(),
        utils.levelIII.technicianCertificates.auditTrail.invalidate(),
        utils.levelIII.technicianCertificates.history.invalidate(),
      ]);
      setIsTechnicianCertificateFormOpen(false);
      setTechnicianCertificateEditorMode("general");
      setTechnicianCertificateFileLinkSuggestion(null);
      setEditingTechnicianCertificate(null);
      setTechnicianCertificateForm(createEmptyTechnicianCertificateForm());
      const autoSupersededCertificateNumbers = savedCertificate
        ? getLevelIIIAutoSupersededCertificateNumbers(savedCertificate)
        : [];
      if (
        editingTechnicianCertificate &&
        (previousApprovalStatus === "approved" || previousApprovalStatus === "in_review") &&
        savedCertificate?.approvalStatus === "draft"
      ) {
        setLastCertificateWorkflowNotice({
          kind: "approval_reset",
          title: "Certificate approval was reset",
          description:
            "Certificate content changed, so approval returned to draft and must be signed off again.",
        });
        toast.success(
          "Certificate updated. Approval was reset because certificate content changed."
        );
      } else if (autoSupersededCertificateNumbers.length > 0) {
        const replacementLabel = savedCertificate?.certificateNumber || "This certificate";
        setLastCertificateWorkflowNotice({
          kind: "auto_superseded",
          title: "Active certificates were auto-superseded",
          description: `${replacementLabel} replaced ${autoSupersededCertificateNumbers.join(", ")} for the same technician scope.`,
        });
        toast.success(
          `${editingTechnicianCertificate ? "Certificate updated" : "Certificate issued"}. Auto-superseded ${autoSupersededCertificateNumbers.join(", ")}.`
        );
      } else {
        setLastCertificateWorkflowNotice(null);
        toast.success(editingTechnicianCertificate ? "Certificate updated" : "Certificate issued");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save certificate.";
      const blockingCertificateNumber =
        extractLevelIIICertificateBlockingConflictNumber(message);
      if (blockingCertificateNumber) {
        setLastCertificateWorkflowNotice({
          kind: "blocked",
          title: "Certificate save was blocked",
          description: `An active certificate already covers this technician scope (${blockingCertificateNumber}). Revoke or supersede that newer certificate before saving this older replacement.`,
        });
      }
      toast.error(message);
    }
  };

  const handleSubmitAssessmentForm = async () => {
    const technicianId = Number.parseInt(assessmentForm.technicianId, 10);
    const normalisedMethodLevels = assessmentForm.methodLevels
      .map((entry) => ({
        method: entry.method.trim(),
        level: entry.level.trim(),
      }))
      .filter((entry) => entry.method && entry.level);

    if (!technicianId) {
      toast.error("Please select a technician.");
      return;
    }
    if (!assessmentForm.assessmentDate) {
      toast.error("Please choose the assessment date.");
      return;
    }
    if (!assessmentForm.assessor.trim()) {
      toast.error("Please enter the assessor name.");
      return;
    }
    if (normalisedMethodLevels.length === 0) {
      toast.error("Choose at least one method and level for this assessment.");
      return;
    }

    const payload = {
      technicianId,
      assessmentDate: parseOptionalDate(assessmentForm.assessmentDate) ?? new Date(),
      methodLevels: normalisedMethodLevels,
      method: normalisedMethodLevels.map((entry) => entry.method).join(", "),
      level:
        Array.from(new Set(normalisedMethodLevels.map((entry) => entry.level))).length === 1
          ? normalisedMethodLevels[0]?.level ?? ""
          : normalisedMethodLevels
              .map((entry) => `${entry.method}: ${entry.level}`)
              .join(" | "),
      assessor: assessmentForm.assessor.trim(),
      result: assessmentForm.result,
      nextReviewDate: parseOptionalDate(assessmentForm.nextReviewDate),
      evidenceUrl: cleanOptionalString(assessmentForm.evidenceUrl),
      notes: cleanOptionalString(assessmentForm.notes),
    };

    try {
      if (editingAssessment) {
        await updateAssessmentMutation.mutateAsync({
          id: editingAssessment.id,
          data: payload,
        });
      } else {
        await createAssessmentMutation.mutateAsync(payload);
      }

      await utils.levelIII.assessments.list.invalidate();
      setIsAssessmentFormOpen(false);
      setEditingAssessment(null);
      setAssessmentForm(createEmptyAssessmentForm());
      toast.success(editingAssessment ? "Assessment updated" : "Assessment added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save assessment.");
    }
  };

  const handleSubmitTechnicianForm = async () => {
    const clientId = Number.parseInt(technicianForm.clientId, 10);
    const clientBranchId =
      technicianForm.clientBranchId === "unassigned"
        ? null
        : Number.parseInt(technicianForm.clientBranchId, 10);
    const methodQualifications = technicianForm.methodQualifications
      .map((entry) => ({
        method: entry.method.trim(),
        level: entry.level.trim(),
      }))
      .filter((entry) => entry.method && entry.level);
    const levelSummary = summariseTechnicianLevels(methodQualifications);
    const methods = methodQualifications.map((entry) => entry.method);
    const hasPcnQualification = technicianForm.hasPcnQualification;

    if (!clientId) {
      toast.error("Please choose a client.");
      return;
    }
    if (!technicianForm.name.trim()) {
      toast.error("Please enter the technician name.");
      return;
    }
    if (!technicianForm.email.trim()) {
      toast.error("Please enter the technician email.");
      return;
    }
    if (methodQualifications.length === 0) {
      toast.error("Choose at least one method and level for this technician.");
      return;
    }

    const payload = {
      clientId,
      clientBranchId,
      name: technicianForm.name.trim(),
      email: technicianForm.email.trim(),
      phone: cleanOptionalString(technicianForm.phone),
      methods,
      level: levelSummary,
      methodQualifications,
      hasPcnQualification,
      certificateNumber: cleanOptionalString(technicianForm.certificateNumber),
      procedureStatus: cleanOptionalString(technicianForm.procedureStatus),
      pcnRenewalDate: hasPcnQualification
        ? parseOptionalDate(technicianForm.pcnRenewalDate)
        : null,
      internalAssessmentDate: hasPcnQualification
        ? null
        : parseOptionalDate(technicianForm.internalAssessmentDate),
      eyeTestValidUntil: parseOptionalDate(technicianForm.eyeTestValidUntil),
      notes: cleanOptionalString(technicianForm.notes),
    };

    try {
      if (editingTechnician) {
        await updateTechnicianMutation.mutateAsync({
          id: editingTechnician.id,
          data: payload,
        });
      } else {
        await createTechnicianMutation.mutateAsync(payload);
      }

      await Promise.all([
        utils.levelIII.technicians.list.invalidate(),
        utils.levelIII.assessments.list.invalidate(),
      ]);
      setIsTechnicianFormOpen(false);
      setEditingTechnician(null);
      setTechnicianForm(createEmptyTechnicianForm());
      toast.success(editingTechnician ? "Technician updated" : "Technician added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save technician.");
    }
  };

  const handleSubmitTechnicianRequirementDefinitionForm = async (
    values: Record<string, unknown>
  ) => {
    if (!activeLevelIIIDocumentSetupClientId) {
      throw new Error(
        "Choose a Level III client or technician first so the document list can be managed."
      );
    }

    const payload = {
      name: String(values.name ?? "").trim(),
      category: String(values.category ?? "").trim() || "Core Document",
      description: String(values.description ?? "").trim() || null,
      validityDays:
        String(values.validityMode ?? "na") === "days" &&
        String(values.validityDays ?? "").trim()
          ? Number(values.validityDays)
          : null,
      reminderDays: String(values.reminderDays ?? "").trim()
        ? Number(values.reminderDays)
        : 30,
      sortOrder: String(values.sortOrder ?? "").trim() ? Number(values.sortOrder) : 0,
      isRequired: Boolean(values.isRequired),
      active: values.active !== false,
      customFields: editingTechnicianRequirementDefinition?.customFields ?? [],
    };

    if (editingTechnicianRequirementDefinition) {
      await updateTechnicianRequirementDefinitionMutation.mutateAsync({
        id: editingTechnicianRequirementDefinition.id,
        clientId: activeLevelIIIDocumentSetupClientId,
        data: payload,
      });
    } else {
      await createTechnicianRequirementDefinitionMutation.mutateAsync({
        clientId: activeLevelIIIDocumentSetupClientId,
        ...payload,
      });
    }

    await Promise.all([
      utils.clientPortal.requirements.listDefinitions.invalidate(),
      utils.clientPortal.requirements.listMatrix.invalidate(),
    ]);
    setIsTechnicianRequirementDefinitionFormOpen(false);
    setEditingTechnicianRequirementDefinition(null);
    toast.success(
      editingTechnicianRequirementDefinition
        ? "Document type updated"
        : "Document type added"
    );
  };

  const handleSubmitTechnicianRequirementForm = async (
    values: Record<string, unknown>
  ) => {
    if (!selectedComplianceClientId) {
      throw new Error("Choose a technician before saving a compliance record.");
    }

    const technicianId = Number(values.technicianId);
    const definitionId = Number(values.definitionId);
    if (!technicianId || !definitionId) {
      throw new Error("Both technician and requirement are required.");
    }

    const resolvedStatus = String(values.status ?? "") as PortalRequirementStatus;
    const issuedAtValue = String(values.issuedAt ?? "").trim();
    const validUntilValue = String(values.validUntil ?? "").trim();

    const record = await upsertTechnicianRequirementMutation.mutateAsync({
      clientId: selectedComplianceClientId,
      technicianId,
      definitionId,
      status: resolvedStatus,
      issuedAt:
        resolvedStatus === "no_expiry"
          ? null
          : issuedAtValue
            ? new Date(`${issuedAtValue}T00:00:00`)
            : null,
      validUntil:
        resolvedStatus === "no_expiry"
          ? null
          : validUntilValue
            ? new Date(`${validUntilValue}T00:00:00`)
            : undefined,
      notes: String(values.notes ?? "").trim() || null,
      customFieldValues: collectRequirementCustomFieldValues(
        activeTechnicianRequirementDefinition,
        values
      ),
      attachmentFileDataUrl: String(values.attachmentFile ?? "").trim() || null,
    });

    const attachmentFile = String(values.attachmentFile ?? "").trim();
    if (
      attachmentFile &&
      record &&
      typeof record === "object" &&
      "id" in record &&
      Number((record as { id?: unknown }).id)
    ) {
      await uploadTechnicianRequirementDocumentMutation.mutateAsync({
        clientId: selectedComplianceClientId,
        technicianRequirementId: Number((record as { id?: unknown }).id),
        fileDataUrl: attachmentFile,
      });
    }

    await Promise.all([
      utils.clientPortal.requirements.listMatrix.invalidate(),
      utils.clientPortal.requirements.listDefinitions.invalidate(),
    ]);
    setIsTechnicianRequirementFormOpen(false);
    setEditingTechnicianRequirement(null);
    setTechnicianRequirementFormValues(createEmptyTechnicianRequirementForm());
    setSelectedComplianceTechnicianId(technicianId);
    toast.success("Technician compliance record saved");
  };

  const handleSubmitEquipmentForm = async (values: Record<string, unknown>) => {
    const payload = {
      name: String(values.name ?? "").trim(),
      serialNumber: String(values.serialNumber ?? "").trim(),
      owner: String(values.owner ?? "").trim(),
      status: values.status as LevelIIIEquipmentStatus,
      sharedWithMainEquipment: String(values.sharedWithMainEquipment) === "true",
      calibrationType: cleanOptionalString(values.calibrationType),
      lastServiceDate: parseOptionalDate(values.lastServiceDate),
      nextDueDate: parseOptionalDate(values.nextDueDate),
      notes: cleanOptionalString(values.notes),
    };

    try {
      if (editingEquipment) {
        await updateEquipmentMutation.mutateAsync({
          id: editingEquipment.id,
          data: payload,
        });
      } else {
        await createEquipmentMutation.mutateAsync(payload);
      }

      await utils.levelIII.equipment.list.invalidate();
      setIsEquipmentFormOpen(false);
      setEditingEquipment(null);
      toast.success(
        editingEquipment ? "Level III equipment updated" : "Level III equipment added"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save Level III equipment."
      );
      throw error;
    }
  };

  const handleSubmitSpecimenForm = async (values: Record<string, unknown>) => {
    const payload = {
      specimenNumber: String(values.specimenNumber ?? "").trim(),
      name: String(values.name ?? "").trim(),
      specimenType: String(values.specimenType ?? "").trim(),
      status: values.status as LevelIIISpecimenStatus,
      sharedWithMainSpecimens: String(values.sharedWithMainSpecimens) === "true",
      masteringStatus: String(values.masteringStatus ?? "Pending") as LevelIIISpecimen["masteringStatus"],
      notes: cleanOptionalString(values.notes),
    };

    try {
      if (editingSpecimen) {
        await updateSpecimenMutation.mutateAsync({
          id: editingSpecimen.id,
          data: payload,
        });
      } else {
        await createSpecimenMutation.mutateAsync(payload);
      }

      await utils.levelIII.specimens.list.invalidate();
      setIsSpecimenFormOpen(false);
      setEditingSpecimen(null);
      toast.success(
        editingSpecimen ? "Level III specimen updated" : "Level III specimen added"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save Level III specimen."
      );
      throw error;
    }
  };

  const handleSubmitClientForm = async (values: Record<string, unknown>) => {
    const payload = {
      companyName: String(values.companyName ?? "").trim(),
      primaryContact: String(values.primaryContact ?? "").trim(),
      secondaryContact: cleanOptionalString(values.secondaryContact),
      email: String(values.email ?? "").trim(),
      secondaryEmail: cleanOptionalString(values.secondaryEmail),
      phone: String(values.phone ?? "").trim(),
      secondaryPhone: cleanOptionalString(values.secondaryPhone),
      physicalAddress: String(values.physicalAddress ?? "").trim(),
      visitCadence: values.visitCadence as VisitCadence,
      lastVisit: parseOptionalDate(values.lastVisit),
      nextVisit: parseOptionalDate(values.nextVisit),
      procedureUpdatedAt: parseOptionalDate(values.procedureUpdatedAt),
      notes: cleanOptionalString(values.notes),
    };

    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync({
          id: editingClient.id,
          data: payload,
        });
      } else {
        await createClientMutation.mutateAsync(payload);
      }

      await Promise.all([
        utils.levelIII.clients.list.invalidate(),
        utils.levelIII.technicians.list.invalidate(),
        utils.levelIII.assessments.list.invalidate(),
      ]);
      setIsClientFormOpen(false);
      setEditingClient(null);
      toast.success(editingClient ? "Level III client updated" : "Level III client added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save Level III client."
      );
      throw error;
    }
  };

  const handleSubmitActivityForm = async (values: Record<string, unknown>) => {
    const payload = {
      clientId: Number.parseInt(String(values.clientId), 10),
      activityType: values.activityType as LevelIIIActivityType,
      subject: String(values.subject ?? "").trim(),
      activityDate: parseOptionalDate(values.activityDate) ?? new Date(),
      nextActionDate: parseOptionalDate(values.nextActionDate),
      status: values.status as LevelIIIActivityStatus,
      notes: cleanOptionalString(values.notes),
    };

    try {
      if (editingActivity) {
        await updateActivityMutation.mutateAsync({
          id: editingActivity.id,
          data: payload,
        });
      } else {
        await createActivityMutation.mutateAsync(payload);
      }

      await Promise.all([
        utils.levelIII.activities.list.invalidate(),
        utils.levelIII.clients.list.invalidate(),
      ]);
      setIsActivityFormOpen(false);
      setEditingActivity(null);
      toast.success(editingActivity ? "Activity updated" : "Activity logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save activity.");
      throw error;
    }
  };

  const handleGeneratePortalRequestDraftPack = async (request: PortalServiceRequest) => {
    try {
      const result = await generatePortalRequestPackMutation.mutateAsync({
        clientId: selectedPortalClientNumber,
        requestId: request.id,
        branchId: request.clientBranchId ?? selectedPortalBranchNumber ?? null,
        generatedStatus: "Draft",
      });
      await Promise.all([
        utils.clientPortal.services.requestsList.invalidate(),
        utils.documents.list.invalidate(),
      ]);
      toast.success(
        `Generated ${result.count} Level III draft document${result.count === 1 ? "" : "s"}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not generate the Level III draft pack."
      );
      throw error;
    }
  };

  const handleSubmitPortalRequestManagementForm = async (
    values: Record<string, unknown>
  ) => {
    if (!managingPortalRequest) return;
    const readiness = getAssessmentBookingReadinessSnapshot(managingPortalRequest);
    const nextStatus = values.status as PortalServiceRequestStatus;
    if (
      nextStatus === "scheduled" &&
      isAssessmentPortalRequest(managingPortalRequest) &&
      readiness.state !== "ready"
    ) {
      toast.error(
        `This assessment booking cannot be marked as scheduled yet: ${getAssessmentBookingBlockingSummary(readiness)}`
      );
      return;
    }
    try {
      await updatePortalServiceRequestStatusMutation.mutateAsync({
        id: managingPortalRequest.id,
        clientId: managingPortalRequest.clientId,
        branchId: selectedPortalBranchNumber,
        status: nextStatus,
        internalNotes: cleanOptionalString(values.internalNotes),
        metadata: {
          ...normalisePortalServiceRequestMetadata(managingPortalRequest.metadata),
          confirmedDate: parseOptionalDate(values.confirmedDate),
          internalOwner: cleanOptionalString(values.internalOwner),
          plannedAction: cleanOptionalString(values.plannedAction),
          clientVisibleUpdate: cleanOptionalString(values.clientVisibleUpdate),
        },
      });
      await utils.clientPortal.services.requestsList.invalidate();
      closePortalRequestManagement();
      toast.success("Portal request plan updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this portal request."
      );
      throw error;
    }
  };

  const openTechnicianComplianceRecord = (row: PortalRequirementRow) => {
    setSelectedComplianceTechnicianId(row.technicianId);
    setEditingTechnicianRequirement(row);
    const definition =
      levelIIIRequirementDefinitions.find(
        (entry) => entry.id === row.definitionId
      ) ?? null;
    const nextValues = {
      ...createEmptyTechnicianRequirementForm(),
      technicianId: String(row.technicianId),
      definitionId: String(row.definitionId),
      status: row?.status ?? "missing",
      issuedAt: row?.status === "no_expiry" ? "" : getDateInputValue(row?.issuedAt),
      validUntil: row?.status === "no_expiry" ? "" : getDateInputValue(row?.validUntil),
      notes: row?.notes ?? "",
      ...getInitialRequirementCustomFieldValues(definition, row),
    };
    setTechnicianRequirementFormValues(nextValues);
    setIsTechnicianRequirementFormOpen(true);
  };

  const openTechnicianForm = (technician: LevelIIITechnician | null) => {
    setEditingTechnician(technician);
    if (technician) {
      setTechnicianForm({
        clientId: String(technician.clientId),
        clientBranchId:
          technician.clientBranchId === null || technician.clientBranchId === undefined
            ? "unassigned"
            : String(technician.clientBranchId),
        name: technician.name ?? "",
        email: technician.email ?? "",
        phone: technician.phone ?? "",
        hasPcnQualification: technician.hasPcnQualification ?? false,
        certificateNumber: technician.certificateNumber ?? "",
        pcnRenewalDate: getDateInputValue(technician.pcnRenewalDate),
        internalAssessmentDate: getDateInputValue(technician.internalAssessmentDate),
        eyeTestValidUntil: getDateInputValue(technician.eyeTestValidUntil),
        procedureStatus: technician.procedureStatus ?? "",
        notes: technician.notes ?? "",
        methodQualifications: getTechnicianMethodQualifications(technician),
      });
    } else {
      setTechnicianForm(createEmptyTechnicianForm());
    }
    setIsTechnicianFormOpen(true);
  };

  const openLevelIIIEvidenceFile = async (review: LevelIIIEvidenceReviewState) => {
    const normalisedReview = normaliseLevelIIIEvidenceReviewState(review);
    if (!normalisedReview.fileUrl) {
      toast.error("This record does not have a stored file yet.");
      return;
    }

    try {
      const previewKind = getLevelIIIEvidencePreviewKind(normalisedReview);
      if (previewKind === "pdf" || previewKind === "external") {
        const previewWindow = window.open(normalisedReview.fileUrl, "_blank");
        if (!previewWindow) {
          toast.error("Unable to open the stored file.");
        }
        return;
      }

      const asset = await fetchLevelIIIEvidencePreviewAsset(normalisedReview);
      const previewWindow = window.open(asset.objectUrl, "_blank");
      if (!previewWindow) {
        window.URL.revokeObjectURL(asset.objectUrl);
        toast.error("Unable to open the stored file.");
        return;
      }
      window.setTimeout(() => {
        window.URL.revokeObjectURL(asset.objectUrl);
      }, 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the stored file.");
    }
  };
  const openEvidenceReview = (review: LevelIIIEvidenceReviewState) => {
    void openLevelIIIEvidenceFile(review);
  };

  const exportEquipmentCsv = () => {
    exportToCSV(
      filteredEquipment.map((item) => ({
        Equipment: item.name,
        "Serial Number": item.serialNumber,
        Status: item.status,
        "Shared With Main Equipment": item.sharedWithMainEquipment ? "Yes" : "No",
        Owner: item.owner,
        "Calibration Type": item.calibrationType ?? "",
        "Last Service Date": formatExportDate(item.lastServiceDate),
        "Next Due Date": formatExportDate(item.nextDueDate),
        Notes: item.notes ?? "",
      })),
      "level-iii-equipment"
    );
    toast.success("Level III equipment exported to CSV");
  };

  const exportSpecimensCsv = () => {
    exportToCSV(
      filteredSpecimens.map((item) => ({
        "Specimen Number": item.specimenNumber,
        Specimen: item.name,
        "Specimen Type": item.specimenType,
        Status: item.status,
        "Shared With Main Specimens": item.sharedWithMainSpecimens ? "Yes" : "No",
        "Mastering Status": item.masteringStatus,
        Notes: item.notes ?? "",
      })),
      "level-iii-specimens"
    );
    toast.success("Level III specimens exported to CSV");
  };

  const downloadClientImportTemplate = () => {
    exportToCSV(
      [
        {
          "Company Name": "Acme NDT Services",
          "Primary Contact": "Jane Smith",
          "Secondary Contact": "John Smith",
          Email: "jane@acmendt.com",
          "Secondary Email": "ops@acmendt.com",
          Phone: "+27 82 000 0000",
          "Secondary Phone": "+27 11 000 0000",
          "Physical Address": "12 Inspection Road, Johannesburg",
          "Visit Cadence": "Monthly",
          "Last Visit": "2026-05-01",
          "Next Visit": "2026-06-01",
          "Procedure Updated At": "2026-04-20",
          Notes: "Example import row",
        },
      ],
      "level-iii-client-import-template"
    );
    toast.success("Level III client import template downloaded");
  };

  const downloadTechnicianImportTemplate = () => {
    exportToCSV(
      [
        {
          "Client / Company Reference": "Acme NDT Services",
          "Client Branch Name": "Johannesburg",
          Name: "Michael Jacobs",
          Email: "michael@acmendt.com",
          Phone: "+27 83 000 0000",
          "Method Qualifications": "UT: Level II | MT: Level II",
          Methods: "UT, MT",
          Level: "Level II",
          "Has PCN Qualification": "Yes",
          "Certificate Number": "PCN-UT2-001",
          "Procedure Status": "Current",
          "PCN Renewal Date": "2027-05-01",
          "Internal Assessment Date": "2026-05-15",
          "Eye Test Valid Until": "2027-03-01",
          Notes: "Example import row",
        },
      ],
      "level-iii-technician-import-template"
    );
    toast.success("Level III technician import template downloaded");
  };

  const downloadEquipmentImportTemplate = () => {
    exportToCSV(
      [
        {
          Equipment: "UT Set 01",
          "Serial Number": "UT-001",
          Status: "Available",
          "Shared With Main Equipment": "No",
          Owner: "Level III",
          "Calibration Type": "Annual",
          "Last Service Date": "2026-04-01",
          "Next Due Date": "2027-04-01",
          Notes: "Example import row",
        },
      ],
      "level-iii-equipment-import-template"
    );
    toast.success("Level III equipment import template downloaded");
  };

  const downloadSpecimenImportTemplate = () => {
    exportToCSV(
      [
        {
          "Specimen Number": "SP-001",
          Specimen: "Pipe Weld Sample 01",
          "Specimen Type": "Pipe Weld",
          Status: "Available",
          "Shared With Main Specimens": "No",
          "Mastering Status": "Pending",
          Notes: "Example import row",
        },
      ],
      "level-iii-specimen-import-template"
    );
    toast.success("Level III specimen import template downloaded");
  };

  const handleClientImport = async (rows: Record<string, unknown>[]): Promise<ImportDialogResult> => {
    let successCount = 0;
    const failures: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] ?? {};
      const companyName = String(row.companyName ?? "").trim();
      const primaryContactRaw = String(row.primaryContact ?? "").trim();
      const secondaryContactRaw = String(row.secondaryContact ?? "").trim();
      const phoneRaw = String(row.phone ?? "").trim();
      const secondaryPhoneRaw = String(row.secondaryPhone ?? "").trim();
      const physicalAddressRaw = String(row.physicalAddress ?? "").trim();
      const emailRaw = String(row.email ?? "").trim().toLowerCase();
      const fallbackSlug = slugifyImportToken(companyName) || `leveliii-client-${index + 1}`;
      const placeholderNotes: string[] = [];

      const primaryContact =
        primaryContactRaw || secondaryContactRaw || companyName || `Imported Client ${index + 1}`;
      if (!primaryContactRaw) {
        placeholderNotes.push("Primary contact was not available in the source file.");
      }

      const email = emailRaw || `imported+${fallbackSlug}-${index + 1}@textpoint.local`;
      if (!emailRaw) {
        placeholderNotes.push(`Primary email placeholder used: ${email}.`);
      }

      const phone = phoneRaw || secondaryPhoneRaw || "Not captured";
      if (!phoneRaw) {
        placeholderNotes.push("Primary phone was not available in the source file.");
      }

      const physicalAddress = physicalAddressRaw || "Not captured";
      if (!physicalAddressRaw) {
        placeholderNotes.push("Physical address was not available in the source file.");
      }

      const existingNotes = cleanOptionalString(row.notes);
      const payload = {
        companyName,
        primaryContact,
        secondaryContact: cleanOptionalString(row.secondaryContact),
        email,
        secondaryEmail: cleanOptionalString(row.secondaryEmail),
        phone,
        secondaryPhone: cleanOptionalString(row.secondaryPhone),
        physicalAddress,
        visitCadence: normaliseEnumValue(
          row.visitCadence,
          ["Weekly", "Monthly", "Six Monthly"] as const,
          "Monthly"
        ),
        lastVisit: parseImportDateValue(row.lastVisit),
        nextVisit: parseImportDateValue(row.nextVisit),
        procedureUpdatedAt: parseImportDateValue(row.procedureUpdatedAt),
        notes: [existingNotes, ...placeholderNotes].filter(Boolean).join(" ").trim() || null,
      };

      if (!payload.companyName) {
        failures.push(`Row ${index + 1}: missing one or more required client fields.`);
        continue;
      }

      try {
        await createClientMutation.mutateAsync(payload);
        successCount += 1;
      } catch (error) {
        failures.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : "failed to import client"}.`
        );
      }
    }

    if (successCount > 0) {
      await utils.levelIII.clients.list.invalidate();
    }

    return {
      successCount,
      failureCount: failures.length,
      message:
        failures.length === 0
          ? `Imported ${successCount} Level III client record${successCount === 1 ? "" : "s"}.`
          : `Imported ${successCount} client record${successCount === 1 ? "" : "s"}. ${failures.length} row(s) need attention.${failures[0] ? ` ${failures[0]}` : ""}`,
    };
  };

  const handleTechnicianImport = async (
    rows: Record<string, unknown>[]
  ): Promise<ImportDialogResult> => {
    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    const failures: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] ?? {};
      const client = resolveClientReference(row.clientReference);
      const methodQualifications = buildImportedMethodQualifications(
        row.methods ?? row.detectedMethods,
        row.level,
        row.methodQualifications ?? row.detectedMethodQualifications
      );
      const methodsForPayload =
        methodQualifications.length > 0
          ? methodQualifications.map((entry) => entry.method)
          : parseImportList(row.methods ?? row.detectedMethods);

      if (!client) {
        failures.push(`Row ${index + 1}: client reference could not be matched.`);
        continue;
      }

      let clientBranchId: number | null = null;
      try {
        clientBranchId = resolveClientBranchReference(client.id, row)?.id ?? null;
      } catch (error) {
        failures.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : "client branch could not be matched"}.`
        );
        continue;
      }

      const name = String(row.name ?? row.technicianName ?? "").trim();
      const emailRaw = String(row.email ?? "").trim().toLowerCase();
      const nameKey = name.toLowerCase();
      const technicianMatchedByEmail = emailRaw
        ? technicians.find(
            (technician) =>
              technician.clientId === client.id &&
              technician.email.trim().toLowerCase() === emailRaw
          )
        : null;
      const technicianMatchedByName = technicians.find(
        (technician) =>
          technician.clientId === client.id &&
          technician.name.trim().toLowerCase() === nameKey
      );
      const existingTechnician = technicianMatchedByEmail ?? technicianMatchedByName ?? null;
      const fallbackSlug =
        slugifyImportToken(`${client.companyName}-${name}`) ||
        `leveliii-technician-${client.id}-${index + 1}`;
      const placeholderNotes: string[] = [];
      const email =
        emailRaw ||
        existingTechnician?.email.trim().toLowerCase() ||
        `imported+${fallbackSlug}-${index + 1}@textpoint.local`;

      if (!emailRaw && !existingTechnician?.email) {
        placeholderNotes.push(`Technician email placeholder used: ${email}.`);
      }

      if (!name || methodsForPayload.length === 0 || methodQualifications.length === 0) {
        failures.push(
          `Row ${index + 1}: missing technician name or method/level information.`
        );
        continue;
      }

      try {
        const importedNotes = cleanOptionalString(row.notes ?? row.documentSummary);
        const hasPcnQualification = parseImportBoolean(
          row.hasPcnQualification,
          existingTechnician?.hasPcnQualification ?? false
        );
        const payload = {
          clientId: client.id,
          clientBranchId,
          name,
          email,
          phone: cleanOptionalString(row.phone) ?? existingTechnician?.phone ?? null,
          methods: methodsForPayload,
          level: summariseTechnicianLevels(methodQualifications) || String(row.level ?? "").trim(),
          methodQualifications,
          hasPcnQualification,
          certificateNumber:
            cleanOptionalString(row.certificateNumber) ??
            existingTechnician?.certificateNumber ??
            null,
          procedureStatus:
            cleanOptionalString(row.procedureStatus) ??
            existingTechnician?.procedureStatus ??
            null,
          pcnRenewalDate:
            parseImportDateValue(row.pcnRenewalDate) ??
            parseImportDateValue(existingTechnician?.pcnRenewalDate),
          internalAssessmentDate:
            parseImportDateValue(row.internalAssessmentDate ?? row.sourceAssessmentDate) ??
            parseImportDateValue(existingTechnician?.internalAssessmentDate),
          eyeTestValidUntil:
            parseImportDateValue(row.eyeTestValidUntil) ??
            parseImportDateValue(existingTechnician?.eyeTestValidUntil),
          notes:
            [importedNotes, ...placeholderNotes].filter(Boolean).join(" ").trim() ||
            existingTechnician?.notes ||
            null,
        };
        const importAudit = {
          sourceFolder: cleanOptionalString(row.sourceFolder),
          folderGroup: cleanOptionalString(row.folderGroup),
          fileCount: Number.isFinite(Number(row.fileCount)) ? Number(row.fileCount) : null,
          documentSummary: cleanOptionalString(row.documentSummary) ?? importedNotes,
          missingCoreDocuments: parseImportList(row.missingCoreDocuments),
          detectedDocuments: parseImportList(row.detectedDocuments),
        };
        const result = await importDriveAuditTechnicianMutation.mutateAsync({
          existingTechnicianId: existingTechnician?.id ?? null,
          ...payload,
          importAudit,
        });
        if (result.action === "created") {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }
        successCount += 1;
      } catch (error) {
        failures.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : "failed to import technician"}.`
        );
      }
    }

    if (successCount > 0) {
      await utils.levelIII.technicians.list.invalidate();
      await utils.levelIII.technicianCertificates.list.invalidate();
      await utils.clientPortal.requirements.listDefinitions.invalidate();
      await utils.clientPortal.requirements.listMatrix.invalidate();
      await utils.clientPortal.dashboard.get.invalidate();
    }

    return {
      successCount,
      failureCount: failures.length,
      message:
        failures.length === 0
          ? `Imported ${successCount} Level III technician record${successCount === 1 ? "" : "s"} (${createdCount} created, ${updatedCount} updated).`
          : `Imported ${successCount} technician record${successCount === 1 ? "" : "s"} (${createdCount} created, ${updatedCount} updated). ${failures.length} row(s) need attention.${failures[0] ? ` ${failures[0]}` : ""}`,
    };
  };

  const handleEquipmentImport = async (
    rows: Record<string, unknown>[]
  ): Promise<ImportDialogResult> => {
    let successCount = 0;
    const failures: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] ?? {};
      const payload = {
        name: String(row.name ?? "").trim(),
        serialNumber: String(row.serialNumber ?? "").trim(),
        status: normaliseEnumValue(
          row.status,
          ["Available", "In Service", "Calibration Due", "Out of Service"] as const,
          "Available"
        ),
        sharedWithMainEquipment: parseImportBoolean(row.sharedWithMainEquipment),
        owner: String(row.owner ?? "").trim() || "Level III",
        calibrationType: cleanOptionalString(row.calibrationType),
        lastServiceDate: parseImportDateValue(row.lastServiceDate),
        nextDueDate: parseImportDateValue(row.nextDueDate),
        notes: cleanOptionalString(row.notes),
      };

      if (!payload.name || !payload.serialNumber) {
        failures.push(`Row ${index + 1}: equipment name and serial number are required.`);
        continue;
      }

      try {
        await createEquipmentMutation.mutateAsync(payload);
        successCount += 1;
      } catch (error) {
        failures.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : "failed to import equipment"}.`
        );
      }
    }

    if (successCount > 0) {
      await utils.levelIII.equipment.list.invalidate();
    }

    return {
      successCount,
      failureCount: failures.length,
      message:
        failures.length === 0
          ? `Imported ${successCount} Level III equipment record${successCount === 1 ? "" : "s"}.`
          : `Imported ${successCount} equipment record${successCount === 1 ? "" : "s"}. ${failures.length} row(s) need attention.${failures[0] ? ` ${failures[0]}` : ""}`,
    };
  };

  const handleSpecimenImport = async (
    rows: Record<string, unknown>[]
  ): Promise<ImportDialogResult> => {
    let successCount = 0;
    const failures: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] ?? {};
      const payload = {
        specimenNumber: String(row.specimenNumber ?? "").trim(),
        name: String(row.name ?? "").trim(),
        specimenType: String(row.specimenType ?? "").trim(),
        status: normaliseEnumValue(
          row.status,
          ["Available", "In Use", "Shared", "Retired"] as const,
          "Available"
        ),
        sharedWithMainSpecimens: parseImportBoolean(row.sharedWithMainSpecimens),
        masteringStatus: normaliseEnumValue(
          row.masteringStatus,
          ["Mastered", "Re-master Required", "Pending"] as const,
          "Pending"
        ),
        notes: cleanOptionalString(row.notes),
      };

      if (!payload.specimenNumber || !payload.name || !payload.specimenType) {
        failures.push(
          `Row ${index + 1}: specimen number, name, and specimen type are required.`
        );
        continue;
      }

      try {
        await createSpecimenMutation.mutateAsync(payload);
        successCount += 1;
      } catch (error) {
        failures.push(
          `Row ${index + 1}: ${error instanceof Error ? error.message : "failed to import specimen"}.`
        );
      }
    }

    if (successCount > 0) {
      await utils.levelIII.specimens.list.invalidate();
    }

    return {
      successCount,
      failureCount: failures.length,
      message:
        failures.length === 0
          ? `Imported ${successCount} Level III specimen record${successCount === 1 ? "" : "s"}.`
          : `Imported ${successCount} specimen record${successCount === 1 ? "" : "s"}. ${failures.length} row(s) need attention.${failures[0] ? ` ${failures[0]}` : ""}`,
    };
  };

  useEffect(() => {
    if (!isTechnicianFormOpen) return;

    const nextForm = editingTechnician
      ? {
          clientId: String(editingTechnician.clientId),
          clientBranchId:
            editingTechnician.clientBranchId === null ||
            editingTechnician.clientBranchId === undefined
              ? "unassigned"
              : String(editingTechnician.clientBranchId),
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
          notes: editingTechnician.notes ?? "",
          methodQualifications: getTechnicianMethodQualifications(editingTechnician),
        }
      : createEmptyTechnicianForm();

    setTechnicianForm((current) =>
      JSON.stringify(current) === JSON.stringify(nextForm) ? current : nextForm
    );
  }, [editingTechnician?.id, isTechnicianFormOpen]);

  useEffect(() => {
    if (!isAssessmentFormOpen) return;

    const nextForm = editingAssessment
      ? {
          technicianId: String(editingAssessment.technicianId),
          assessmentDate: getDateInputValue(editingAssessment.assessmentDate),
          assessor: editingAssessment.assessor ?? "",
          result: editingAssessment.result ?? "Pending Review",
          nextReviewDate: getDateInputValue(editingAssessment.nextReviewDate),
          evidenceUrl: editingAssessment.evidenceUrl ?? "",
          notes: editingAssessment.notes ?? "",
          methodLevels: getAssessmentMethodLevels(editingAssessment),
        }
      : createEmptyAssessmentForm();

    setAssessmentForm((current) =>
      JSON.stringify(current) === JSON.stringify(nextForm) ? current : nextForm
    );
  }, [editingAssessment?.id, isAssessmentFormOpen]);

  useEffect(() => {
    if (!isTechnicianCertificateFormOpen) return;
    if (!editingTechnicianCertificate) return;

    const nextForm = {
        technicianId: String(editingTechnicianCertificate.technicianId),
        assessmentId: editingTechnicianCertificate.assessmentId
          ? String(editingTechnicianCertificate.assessmentId)
          : "",
        certificateNumber: editingTechnicianCertificate.certificateNumber ?? "",
        issuedDate: getDateInputValue(editingTechnicianCertificate.issuedDate),
        validUntil: getDateInputValue(editingTechnicianCertificate.validUntil),
        validityValue:
          editingTechnicianCertificate.validityValue !== null &&
          editingTechnicianCertificate.validityValue !== undefined
            ? String(editingTechnicianCertificate.validityValue)
            : "",
        validityUnit: editingTechnicianCertificate.validityUnit ?? "custom",
        status: editingTechnicianCertificate.status ?? "Active",
        approvalStatus: editingTechnicianCertificate.approvalStatus ?? "draft",
        notes: editingTechnicianCertificate.notes ?? "",
        fileName: editingTechnicianCertificate.fileName ?? "",
        fileUrl: editingTechnicianCertificate.fileUrl ?? "",
        attachmentFileDataUrl: "",
        attachmentFileName: "",
        methodLevels: getCertificateMethodLevels(editingTechnicianCertificate),
      };

    setTechnicianCertificateForm((current) =>
      JSON.stringify(current) === JSON.stringify(nextForm) ? current : nextForm
    );
  }, [editingTechnicianCertificate?.id, isTechnicianCertificateFormOpen]);

  useEffect(() => {
    if (!isTechnicianCertificateFormOpen) return;
    if (technicianCertificateEditorMode !== "file_link") return;
    if (!technicianCertificateFileLinkSuggestion) return;

    const suggestedFileName = technicianCertificateFileLinkSuggestion.recommendedFileName.trim();
    if (!suggestedFileName) return;

    setTechnicianCertificateForm((current) => {
      if (current.fileName === suggestedFileName) {
        return current;
      }

      return {
        ...current,
        fileName: suggestedFileName,
      };
    });
  }, [
    isTechnicianCertificateFormOpen,
    technicianCertificateEditorMode,
    technicianCertificateFileLinkSuggestion,
  ]);

  const handleTechnicianCertificateFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setTechnicianCertificateForm((current) => ({
        ...current,
        attachmentFileDataUrl: "",
        attachmentFileName: "",
      }));
      return;
    }

    try {
      const dataUrl = await readLevelIIIFileAsDataUrl(file);
      setTechnicianCertificateForm((current) => ({
        ...current,
        attachmentFileDataUrl: dataUrl,
        attachmentFileName: file.name,
        fileName: current.fileName.trim() ? current.fileName : file.name,
      }));
      toast.success("Certificate file attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the certificate file.");
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!isTechnicianRequirementFormOpen) return;

    const record = editingTechnicianRequirement;
    const technicianId =
      record?.technicianId ?? selectedComplianceTechnician?.id ?? null;
    const definitionId = record?.definitionId ?? null;
    const definition =
      levelIIIRequirementDefinitions.find(
        (entry) => entry.id === definitionId
      ) ?? null;

    const nextValues = {
      ...createEmptyTechnicianRequirementForm(),
      technicianId: technicianId ? String(technicianId) : "",
      definitionId: definitionId ? String(definitionId) : "",
      status: record?.status ?? "missing",
      issuedAt: record?.status === "no_expiry" ? "" : getDateInputValue(record?.issuedAt),
      validUntil: record?.status === "no_expiry" ? "" : getDateInputValue(record?.validUntil),
      notes: record?.notes ?? "",
      ...getInitialRequirementCustomFieldValues(definition, record),
    };

    setTechnicianRequirementFormValues((current) =>
      JSON.stringify(current) === JSON.stringify(nextValues) ? current : nextValues
    );
  }, [
    complianceDefinitions,
    editingTechnicianRequirement?.technicianId,
    editingTechnicianRequirement?.definitionId,
    editingTechnicianRequirement?.status,
    isTechnicianRequirementFormOpen,
    selectedComplianceTechnicianId,
  ]);

  useEffect(() => {
    if (!isTechnicianFormOpen) return;
    if (!technicianForm.clientId) return;

    const selectedBranchValue = technicianForm.clientBranchId;
    if (selectedBranchValue === "unassigned") return;

    const branchStillValid = selectedClientBranchOptions.some(
      (branch) => String(branch.id) === selectedBranchValue
    );

    if (!branchStillValid) {
      setTechnicianForm((current) => ({
        ...current,
        clientBranchId: "unassigned",
      }));
    }
  }, [
    isTechnicianFormOpen,
    selectedClientBranchOptions,
    technicianForm.clientBranchId,
    technicianForm.clientId,
  ]);

  useEffect(() => {
    if (!isTechnicianCertificateFormOpen) return;
    if (!technicianCertificateForm.technicianId) return;

    const selectedAssessmentValue = technicianCertificateForm.assessmentId;
    if (!selectedAssessmentValue) return;

    const assessmentStillValid = selectedCertificateAssessmentOptions.some(
      (assessment) => String(assessment.id) === selectedAssessmentValue
    );
    if (!assessmentStillValid) {
      setTechnicianCertificateForm((current) => ({
        ...current,
        assessmentId: "",
      }));
    }
  }, [
    isTechnicianCertificateFormOpen,
    selectedCertificateAssessmentOptions,
    technicianCertificateForm.assessmentId,
    technicianCertificateForm.technicianId,
  ]);

  useEffect(() => {
    if (selectedComplianceTechnicianId && !technicians.some((row) => row.id === selectedComplianceTechnicianId)) {
      setSelectedComplianceTechnicianId(null);
    }
  }, [selectedComplianceTechnicianId, technicians]);

  useEffect(() => {
    if (selectedPortalBranchFilter === "all") return;
    const branchStillValid = selectedPortalBranchOptions.some(
      (branch) => String(branch.id) === selectedPortalBranchFilter
    );
    if (!branchStillValid) {
      setSelectedPortalBranchFilter("all");
    }
  }, [selectedPortalBranchFilter, selectedPortalBranchOptions]);

  useEffect(() => {
    if (!isAssessmentFormOpen) return;
    if (availableAssessmentMethods.length === 0) return;

    setAssessmentForm((current) => {
      const filteredMethodLevels = current.methodLevels.filter((entry) =>
        availableAssessmentMethods.includes(entry.method)
      );
      if (filteredMethodLevels.length === current.methodLevels.length) {
        return current;
      }
      return {
        ...current,
        methodLevels: filteredMethodLevels,
      };
    });
  }, [availableAssessmentMethods, isAssessmentFormOpen]);

  useEffect(() => {
    if (!isTechnicianCertificateFormOpen) return;
    if (availableCertificateMethods.length === 0) return;

    setTechnicianCertificateForm((current) => {
      const filteredMethodLevels = current.methodLevels.filter((entry) =>
        availableCertificateMethods.includes(entry.method)
      );
      if (filteredMethodLevels.length === current.methodLevels.length) {
        return current;
      }
      return {
        ...current,
        methodLevels: filteredMethodLevels,
      };
    });
  }, [availableCertificateMethods, isTechnicianCertificateFormOpen]);

  const reminderCount = useMemo(() => {
    const clientReminders = clients.filter((client) => {
      if (!client.nextVisit) return false;
      const nextVisit = new Date(client.nextVisit);
      const today = new Date();
      return nextVisit.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
    }).length;

    const technicianReminders = technicians.filter((technician) => {
      const dueDates = [
        getQualificationReviewDate(technician),
        technician.eyeTestValidUntil,
      ].filter(Boolean) as Array<string | Date>;
      return dueDates.some((dateValue) => {
        const target = new Date(dateValue);
        const today = new Date();
        return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
      });
    }).length;

    const assessmentReminders = assessments.filter((assessment) => {
      if (!assessment.nextReviewDate) return false;
      const target = new Date(assessment.nextReviewDate);
      const today = new Date();
      return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
    }).length;

    const certificateReminders = technicianCertificates.filter((certificate) => {
      if (!certificate.validUntil || certificate.status === "Revoked") return false;
      const target = new Date(certificate.validUntil);
      const today = new Date();
      return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
    }).length;

    const activityReminders = activities.filter((activity) => {
      const dueDate =
        activity.nextActionDate ||
        (activity.status === "Planned" ? activity.activityDate : null);
      if (!dueDate || activity.status === "Cancelled") return false;
      const target = new Date(dueDate);
      const today = new Date();
      return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
    }).length;

    return (
      clientReminders +
      technicianReminders +
      assessmentReminders +
      certificateReminders +
      activityReminders
    );
  }, [activities, assessments, clients, technicianCertificates, technicians]);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        const searchTarget = [
          client.companyName,
          client.primaryContact,
          client.email,
          client.physicalAddress,
        ]
          .join(" ")
          .toLowerCase();
        return searchTarget.includes(clientSearch.toLowerCase());
      }),
    [clientSearch, clients]
  );

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const matchesClient =
          selectedActivityClientFilter === "all" ||
          activity.clientId === Number.parseInt(selectedActivityClientFilter, 10);
        const clientName =
          clients.find((client) => client.id === activity.clientId)?.companyName ?? "";
        const searchTarget = [
          clientName,
          activity.activityType,
          activity.subject,
          activity.status,
          activity.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesClient && searchTarget.includes(activitySearch.toLowerCase());
      }),
    [activities, activitySearch, clients, selectedActivityClientFilter]
  );

  const filteredTechnicians = useMemo(
    () =>
      technicians.filter((technician) => {
        const matchesClient =
          selectedClientFilter === "all" || technician.clientId === Number.parseInt(selectedClientFilter, 10);
        const clientName = clients.find((client) => client.id === technician.clientId)?.companyName ?? "";
        const searchTarget = [
          technician.name,
          technician.email,
          formatMethods(getTechnicianMethods(technician)),
          formatTechnicianLevels(technician),
          getQualificationTypeLabel(technician),
          clientName,
        ]
          .join(" ")
          .toLowerCase();
        return matchesClient && searchTarget.includes(technicianSearch.toLowerCase());
      }),
    [clients, selectedClientFilter, technicianSearch, technicians]
  );
  const visibleTechnicianClients = useMemo(
    () =>
      clients.filter((client) => {
        const matchesClientFilter =
          selectedClientFilter === "all" || client.id === Number.parseInt(selectedClientFilter, 10);
        if (!matchesClientFilter) {
          return false;
        }
        if (technicianSearch.trim().length === 0) {
          return true;
        }
        const clientMatchesSearch = client.companyName
          .toLowerCase()
          .includes(technicianSearch.toLowerCase());
        const hasVisibleTechnician = filteredTechnicians.some(
          (technician) => technician.clientId === client.id
        );
        if (technicianSearch.trim().length === 0) {
          return hasVisibleTechnician;
        }
        return clientMatchesSearch || hasVisibleTechnician;
      }),
    [clients, filteredTechnicians, selectedClientFilter, technicianSearch]
  );
  const technicianDirectorySummary = useMemo(
    () => ({
      totalTechnicians: filteredTechnicians.length,
      visibleClients: visibleTechnicianClients.filter((client) =>
        filteredTechnicians.some((technician) => technician.clientId === client.id)
      ).length,
      withCertificates: filteredTechnicians.filter((technician) =>
        latestTechnicianCertificateByTechnicianId.has(technician.id)
      ).length,
      selectedClientLabel:
        selectedClientFilter === "all"
          ? "All clients"
          : clients.find((client) => client.id === Number.parseInt(selectedClientFilter, 10))
              ?.companyName ?? "Filtered client",
    }),
    [
      clients,
      filteredTechnicians,
      latestTechnicianCertificateByTechnicianId,
      selectedClientFilter,
      visibleTechnicianClients,
    ]
  );
  const filteredTechnicianCertificates = useMemo(
    () => {
      const filtered = technicianCertificates.filter((certificate) => {
        const technician = technicians.find((item) => item.id === certificate.technicianId);
        const matchesClient =
          selectedClientFilter === "all" ||
          technician?.clientId === Number.parseInt(selectedClientFilter, 10);
        const clientName = technician
          ? clients.find((client) => client.id === technician.clientId)?.companyName ?? ""
          : "";
        const searchTarget = [
          certificate.certificateNumber,
          technician?.name,
          clientName,
          certificate.method,
          certificate.level,
          certificate.status,
          certificate.notes,
          certificate.fileName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const matchesSearch = searchTarget.includes(technicianSearch.toLowerCase());
        const matchesQueueFilter =
          selectedCertificateQueueFilter === "all"
            ? true
            : selectedCertificateQueueFilter === "approved"
              ? certificate.approvalStatus === "approved"
              : selectedCertificateQueueFilter === "in_review"
                ? certificate.approvalStatus === "in_review"
                : selectedCertificateQueueFilter === "draft"
                  ? certificate.approvalStatus === "draft" || certificate.approvalStatus === "rejected"
                  : selectedCertificateQueueFilter === "active"
                    ? certificate.status === "Active"
                    : selectedCertificateQueueFilter === "superseded"
                      ? certificate.status === "Superseded"
                      : isCertificateExpiringSoon(certificate);
        return matchesClient && matchesSearch && matchesQueueFilter;
      });
      if (selectedCertificateQueueFilter === "all") {
        return filtered;
      }
      return filtered.slice().sort(compareCertificateQueueRows);
    },
    [
      clients,
      selectedCertificateQueueFilter,
      selectedClientFilter,
      technicianCertificates,
      technicianSearch,
      technicians,
    ]
  );
  const certificateQueueSummary = useMemo(() => {
    const approved = technicianCertificates.filter(
      (certificate) => certificate.approvalStatus === "approved"
    ).length;
    const inReview = technicianCertificates.filter(
      (certificate) => certificate.approvalStatus === "in_review"
    ).length;
    const active = technicianCertificates.filter((certificate) => certificate.status === "Active").length;
    const superseded = technicianCertificates.filter(
      (certificate) => certificate.status === "Superseded"
    ).length;
    const expiringSoon = technicianCertificates.filter((certificate) =>
      isCertificateExpiringSoon(certificate)
    ).length;
    return { approved, inReview, active, superseded, expiringSoon };
  }, [technicianCertificates]);
  const certificateLifecycleSummary = useMemo<LevelIIICertificateLifecycleSummary>(() => {
    const byNewest = technicianCertificates
      .slice()
      .sort(
        (left, right) =>
          (new Date(right.updatedAt).getTime() || 0) - (new Date(left.updatedAt).getTime() || 0)
      );

    return {
      issuedRecent: byNewest.slice(0, 5),
      approvedRecent: byNewest.filter((certificate) => certificate.approvalStatus === "approved").slice(0, 5),
      expiringSoon: byNewest.filter((certificate) => isCertificateExpiringSoon(certificate)).slice(0, 5),
      autoSupersededRecent: byNewest
        .filter(
          (certificate) =>
            certificate.status === "Superseded" &&
            String(certificate.notes ?? "").toLowerCase().includes("auto-superseded")
        )
        .slice(0, 5),
    };
  }, [technicianCertificates]);
  const selectedTechnicianRequirementRows = useMemo(
    () =>
      selectedComplianceTechnicianId
        ? dedupedComplianceMatrix.filter(
            (row) => row.technicianId === selectedComplianceTechnicianId
          )
        : [],
    [dedupedComplianceMatrix, selectedComplianceTechnicianId]
  );
  const selectedTechnicianRequirementTableRows = useMemo<RequirementTableRow[]>(
    () =>
      selectedTechnicianRequirementRows.map((row) => ({
        ...row,
        id: row.recordId ?? `${row.technicianId}-${row.definitionId}`,
      })),
    [selectedTechnicianRequirementRows]
  );
  const selectedTechnicianRequirementSummary = useMemo(() => {
    const rows = selectedTechnicianRequirementRows;
    return {
      total: rows.length,
      current: rows.filter((row) => isCurrentLikePortalRequirementStatus(row.status)).length,
      expiring: rows.filter((row) => row.status === "expiring").length,
      expired: rows.filter((row) => row.status === "expired").length,
      missing: rows.filter((row) => row.status === "missing").length,
      pendingReview: rows.filter((row) => row.status === "pending_review").length,
      evidence: rows.filter((row) => row.documentCount > 0).length,
    };
  }, [selectedTechnicianRequirementRows]);
  const selectedTechnicianPendingReviewRows = useMemo(
    () =>
      selectedTechnicianRequirementRows.filter((row) => row.status === "pending_review"),
    [selectedTechnicianRequirementRows]
  );
  const selectedTechnicianDocumentControlSummary = useMemo<TechnicianDocumentControlSummary>(() => {
    const certificateLinkedRows = selectedTechnicianRequirementRows.filter((row) =>
      String(row.notes ?? "").toLowerCase().includes("certificate number:")
    );
    return {
      missingEvidenceRows: selectedTechnicianRequirementRows.filter(
        (row) =>
          (row.status === "missing" || row.status === "expired" || row.status === "pending_review") &&
          row.documentCount === 0
      ),
      expiredRows: selectedTechnicianRequirementRows.filter((row) => row.status === "expired"),
      pendingReviewRows: selectedTechnicianRequirementRows.filter(
        (row) => row.status === "pending_review"
      ),
      currentWithoutEvidenceRows: selectedTechnicianRequirementRows.filter(
        (row) => isCurrentLikePortalRequirementStatus(row.status) && row.documentCount === 0
      ),
      certificateLinkedRows,
    };
  }, [selectedTechnicianRequirementRows]);
  const selectedTechnicianBulkQueueItems = useMemo<LevelIIITechnicianDocumentQueueItem[]>(() => {
    const items = selectedTechnicianRequirementRows.map<LevelIIITechnicianDocumentQueueItem | null>((row) => {
      if (row.status === "missing" && row.documentCount === 0) {
        return {
          row,
          queueLabel: "Missing Evidence",
          queueRank: 4,
          reason: "No stored evidence file is linked yet.",
          supportsUpload: true,
        };
      }
      if (row.status === "pending_review") {
        return {
          row,
          queueLabel: "Pending Review",
          queueRank: 3,
          reason: "Evidence is waiting for an internal review decision.",
          supportsUpload: row.documentCount === 0,
        };
      }
      if (row.status === "expired") {
        return {
          row,
          queueLabel: "Expired",
          queueRank: 2,
          reason: row.validUntil
            ? `Expired on ${formatExportDate(row.validUntil)}.`
            : "Validity date needs attention.",
          supportsUpload: true,
        };
      }
      if (isCurrentLikePortalRequirementStatus(row.status) && row.documentCount === 0) {
        return {
          row,
          queueLabel: "Current Without Evidence",
          queueRank: 1,
          reason: "Record is current but no stored evidence file is linked.",
          supportsUpload: true,
        };
      }
      return null;
    });

    return items
      .filter((item): item is LevelIIITechnicianDocumentQueueItem => Boolean(item))
      .sort(
        (left, right) =>
          right.queueRank - left.queueRank ||
          left.row.definitionName.localeCompare(right.row.definitionName)
      );
  }, [selectedTechnicianRequirementRows]);
  const filteredSelectedTechnicianBulkQueueItems = useMemo(() => {
    const handledSignatures = new Set(
      handledTechnicianDocumentQueueEntries
        .filter((entry) => entry.technicianId === selectedComplianceTechnicianId)
        .map((entry) => entry.signature)
    );
    return selectedTechnicianBulkQueueItems.filter(
      (item) => !handledSignatures.has(`${item.row.technicianId}:${item.row.definitionId}:${item.queueLabel}`)
    );
  }, [
    handledTechnicianDocumentQueueEntries,
    selectedComplianceTechnicianId,
    selectedTechnicianBulkQueueItems,
  ]);
  const recentHandledSelectedTechnicianBulkQueueEntries = useMemo(
    () =>
      handledTechnicianDocumentQueueEntries
        .filter((entry) => entry.technicianId === selectedComplianceTechnicianId)
        .slice()
        .sort(
          (left, right) =>
            (new Date(right.handledAt).getTime() || 0) - (new Date(left.handledAt).getTime() || 0)
        )
        .slice(0, 5),
    [handledTechnicianDocumentQueueEntries, selectedComplianceTechnicianId]
  );
  const crossTechnicianBulkQueueItems = useMemo<LevelIIITechnicianDocumentQueueItem[]>(() => {
    const visibleTechnicianIds = new Set(filteredTechnicians.map((technician) => technician.id));
    const items = dedupedComplianceMatrix
      .filter((row) => visibleTechnicianIds.has(row.technicianId))
      .map<LevelIIITechnicianDocumentQueueItem | null>((row) => {
        if (row.status === "missing" && row.documentCount === 0) {
          return {
            row,
            queueLabel: "Missing Evidence",
            queueRank: 4,
            reason: "No stored evidence file is linked yet.",
            supportsUpload: true,
          };
        }
        if (row.status === "pending_review") {
          return {
            row,
            queueLabel: "Pending Review",
            queueRank: 3,
            reason: "Evidence is waiting for an internal review decision.",
            supportsUpload: row.documentCount === 0,
          };
        }
        if (row.status === "expired") {
          return {
            row,
            queueLabel: "Expired",
            queueRank: 2,
            reason: row.validUntil
              ? `Expired on ${formatExportDate(row.validUntil)}.`
              : "Validity date needs attention.",
            supportsUpload: true,
          };
        }
        if (isCurrentLikePortalRequirementStatus(row.status) && row.documentCount === 0) {
          return {
            row,
            queueLabel: "Current Without Evidence",
            queueRank: 1,
            reason: "Record is current but no stored evidence file is linked.",
            supportsUpload: true,
          };
        }
        return null;
      });

    return items
      .filter((item): item is LevelIIITechnicianDocumentQueueItem => Boolean(item))
      .sort(
        (left, right) =>
          right.queueRank - left.queueRank ||
          left.row.technicianName.localeCompare(right.row.technicianName) ||
          left.row.definitionName.localeCompare(right.row.definitionName)
      );
  }, [dedupedComplianceMatrix, filteredTechnicians]);
  const filteredCrossTechnicianBulkQueueItems = useMemo(() => {
    const handledSignatures = new Set(handledTechnicianDocumentQueueEntries.map((entry) => entry.signature));
    const matchesFilter = (item: LevelIIITechnicianDocumentQueueItem) => {
      switch (selectedTechnicianQueueFilter) {
        case "missing_evidence":
          return item.queueLabel === "Missing Evidence";
        case "pending_review":
          return item.queueLabel === "Pending Review";
        case "expired":
          return item.queueLabel === "Expired";
        case "current_without_evidence":
          return item.queueLabel === "Current Without Evidence";
        default:
          return true;
      }
    };
    return crossTechnicianBulkQueueItems.filter(
      (item) =>
        matchesFilter(item) &&
        !handledSignatures.has(`${item.row.technicianId}:${item.row.definitionId}:${item.queueLabel}`)
    );
  }, [
    crossTechnicianBulkQueueItems,
    handledTechnicianDocumentQueueEntries,
    selectedTechnicianQueueFilter,
  ]);
  const technicianQueueFilterOptions = useMemo(
    () => [
      { value: "all" as const, label: "All", count: crossTechnicianBulkQueueItems.length },
      {
        value: "missing_evidence" as const,
        label: "Missing Evidence",
        count: crossTechnicianBulkQueueItems.filter((item) => item.queueLabel === "Missing Evidence").length,
      },
      {
        value: "pending_review" as const,
        label: "Pending Review",
        count: crossTechnicianBulkQueueItems.filter((item) => item.queueLabel === "Pending Review").length,
      },
      {
        value: "expired" as const,
        label: "Expired",
        count: crossTechnicianBulkQueueItems.filter((item) => item.queueLabel === "Expired").length,
      },
      {
        value: "current_without_evidence" as const,
        label: "Current Without Evidence",
        count: crossTechnicianBulkQueueItems.filter(
          (item) => item.queueLabel === "Current Without Evidence"
        ).length,
      },
    ],
    [crossTechnicianBulkQueueItems]
  );
  const recentHandledCrossTechnicianBulkQueueEntries = useMemo(
    () =>
      handledTechnicianDocumentQueueEntries
        .slice()
        .sort(
          (left, right) =>
            (new Date(right.handledAt).getTime() || 0) - (new Date(left.handledAt).getTime() || 0)
        )
        .slice(0, 5),
    [handledTechnicianDocumentQueueEntries]
  );
  const selectedCrossTechnicianQueueItems = useMemo(
    () =>
      filteredCrossTechnicianBulkQueueItems.filter((item) =>
        selectedCrossTechnicianQueueSignatures.includes(buildTechnicianDocumentQueueItemSignature(item))
      ),
    [filteredCrossTechnicianBulkQueueItems, selectedCrossTechnicianQueueSignatures]
  );
  const crossTechnicianQueueSessionItems = useMemo(
    () =>
      crossTechnicianBulkQueueItems.filter((item) =>
        selectedCrossTechnicianQueueSignatures.includes(buildTechnicianDocumentQueueItemSignature(item))
      ),
    [crossTechnicianBulkQueueItems, selectedCrossTechnicianQueueSignatures]
  );
  const visibleCrossTechnicianQueueSignatures = useMemo(
    () =>
      filteredCrossTechnicianBulkQueueItems.map((item) =>
        buildTechnicianDocumentQueueItemSignature(item)
      ),
    [filteredCrossTechnicianBulkQueueItems]
  );
  const searchedCrossTechnicianBulkQueueItems = useMemo(() => {
    const searchValue = crossTechnicianQueueSearch.trim().toLowerCase();
    const baseItems = showSavedSessionQueueOnly
      ? filteredCrossTechnicianBulkQueueItems.filter((item) =>
          selectedCrossTechnicianQueueSignatures.includes(buildTechnicianDocumentQueueItemSignature(item))
        )
      : filteredCrossTechnicianBulkQueueItems;
    if (searchValue.length === 0) {
      return baseItems;
    }
    return baseItems.filter((item) => {
      const technician = technicians.find((entry) => entry.id === item.row.technicianId) ?? null;
      const clientName =
        clients.find((client) => client.id === (technician?.clientId ?? 0))?.companyName ??
        "Unknown client";
      const searchTarget = [
        item.row.technicianName,
        item.row.definitionName,
        item.queueLabel,
        item.reason,
        clientName,
      ]
        .join(" ")
        .toLowerCase();
      return searchTarget.includes(searchValue);
    });
  }, [
    clients,
    crossTechnicianQueueSearch,
    filteredCrossTechnicianBulkQueueItems,
    selectedCrossTechnicianQueueSignatures,
    showSavedSessionQueueOnly,
    technicians,
  ]);
  const crossTechnicianQueuePageSize = 10;
  const crossTechnicianQueueTotalPages = Math.max(
    1,
    Math.ceil(searchedCrossTechnicianBulkQueueItems.length / crossTechnicianQueuePageSize)
  );
  const pagedCrossTechnicianBulkQueueItems = useMemo(() => {
    const startIndex = (crossTechnicianQueuePage - 1) * crossTechnicianQueuePageSize;
    return searchedCrossTechnicianBulkQueueItems.slice(
      startIndex,
      startIndex + crossTechnicianQueuePageSize
    );
  }, [crossTechnicianQueuePage, searchedCrossTechnicianBulkQueueItems]);
  const hiddenCrossTechnicianQueueSelectionCount = Math.max(
    selectedCrossTechnicianQueueSignatures.length - selectedCrossTechnicianQueueItems.length,
    0
  );
  const crossTechnicianQueueSessionCompletedCount = Math.max(
    crossTechnicianQueueSessionPeakCount - selectedCrossTechnicianQueueSignatures.length,
    0
  );
  const crossTechnicianQueueSessionSummary = useMemo(
    () => ({
      all: crossTechnicianQueueSessionItems.length,
      missing_evidence: crossTechnicianQueueSessionItems.filter(
        (item) => item.queueLabel === "Missing Evidence"
      ).length,
      pending_review: crossTechnicianQueueSessionItems.filter(
        (item) => item.queueLabel === "Pending Review"
      ).length,
      expired: crossTechnicianQueueSessionItems.filter((item) => item.queueLabel === "Expired").length,
      current_without_evidence: crossTechnicianQueueSessionItems.filter(
        (item) => item.queueLabel === "Current Without Evidence"
      ).length,
    }),
    [crossTechnicianQueueSessionItems]
  );
  const crossTechnicianQueueSessionVisibleSummary = useMemo(
    () => ({
      missingEvidence: selectedCrossTechnicianQueueItems.filter(
        (item) => item.queueLabel === "Missing Evidence"
      ).length,
      pendingReview: selectedCrossTechnicianQueueItems.filter(
        (item) => item.queueLabel === "Pending Review"
      ).length,
      expired: selectedCrossTechnicianQueueItems.filter((item) => item.queueLabel === "Expired").length,
      currentWithoutEvidence: selectedCrossTechnicianQueueItems.filter(
        (item) => item.queueLabel === "Current Without Evidence"
      ).length,
    }),
    [selectedCrossTechnicianQueueItems]
  );
  const crossTechnicianQueueSessionFocusOptions = useMemo(
    () => [
      { value: "all" as const, label: "Focus All", count: crossTechnicianQueueSessionSummary.all },
      {
        value: "missing_evidence" as const,
        label: "Focus Missing",
        count: crossTechnicianQueueSessionSummary.missing_evidence,
      },
      {
        value: "pending_review" as const,
        label: "Focus Review",
        count: crossTechnicianQueueSessionSummary.pending_review,
      },
      {
        value: "expired" as const,
        label: "Focus Expired",
        count: crossTechnicianQueueSessionSummary.expired,
      },
      {
        value: "current_without_evidence" as const,
        label: "Focus Current W/O Evidence",
        count: crossTechnicianQueueSessionSummary.current_without_evidence,
      },
    ],
    [crossTechnicianQueueSessionSummary]
  );
  const crossTechnicianQueueSessionCompletionPercent =
    crossTechnicianQueueSessionPeakCount > 0
      ? Math.round(
          (crossTechnicianQueueSessionCompletedCount / crossTechnicianQueueSessionPeakCount) * 100
        )
      : 0;
  const nextCrossTechnicianQueueSessionItem = crossTechnicianQueueSessionItems[0] ?? null;
  const nextCrossTechnicianQueueSessionTechnician = useMemo(() => {
    const grouped = new Map<
      number,
      {
        technicianId: number;
        technicianName: string;
        clientName: string;
        openItems: number;
        uploadableItems: number;
      }
    >();

    crossTechnicianQueueSessionItems.forEach((item) => {
      const technician = technicians.find((entry) => entry.id === item.row.technicianId) ?? null;
      const clientName =
        clients.find((client) => client.id === (technician?.clientId ?? 0))?.companyName ??
        "Unknown client";
      const existing = grouped.get(item.row.technicianId) ?? {
        technicianId: item.row.technicianId,
        technicianName: item.row.technicianName,
        clientName,
        openItems: 0,
        uploadableItems: 0,
      };
      existing.openItems += 1;
      if (item.supportsUpload) {
        existing.uploadableItems += 1;
      }
      grouped.set(item.row.technicianId, existing);
    });

    return Array.from(grouped.values()).sort(
      (left, right) =>
        right.openItems - left.openItems || left.technicianName.localeCompare(right.technicianName)
    )[0] ?? null;
  }, [clients, crossTechnicianQueueSessionItems, technicians]);
  const nextCrossTechnicianQueueSessionClient = useMemo(() => {
    const grouped = new Map<
      number,
      {
        clientId: number;
        clientName: string;
        openItems: number;
        techniciansAffected: Set<number>;
        uploadableItems: number;
      }
    >();

    crossTechnicianQueueSessionItems.forEach((item) => {
      const technician = technicians.find((entry) => entry.id === item.row.technicianId) ?? null;
      const clientId = technician?.clientId ?? 0;
      const clientName =
        clients.find((client) => client.id === clientId)?.companyName ?? "Unknown client";
      const existing = grouped.get(clientId) ?? {
        clientId,
        clientName,
        openItems: 0,
        techniciansAffected: new Set<number>(),
        uploadableItems: 0,
      };
      existing.openItems += 1;
      existing.techniciansAffected.add(item.row.technicianId);
      if (item.supportsUpload) {
        existing.uploadableItems += 1;
      }
      grouped.set(clientId, existing);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        clientId: item.clientId,
        clientName: item.clientName,
        openItems: item.openItems,
        techniciansAffected: item.techniciansAffected.size,
        uploadableItems: item.uploadableItems,
      }))
      .sort((left, right) => right.openItems - left.openItems || left.clientName.localeCompare(right.clientName))[0] ?? null;
  }, [clients, crossTechnicianQueueSessionItems, technicians]);
  const allVisibleCrossTechnicianQueueSelected =
    visibleCrossTechnicianQueueSignatures.length > 0 &&
    visibleCrossTechnicianQueueSignatures.every((signature) =>
      selectedCrossTechnicianQueueSignatures.includes(signature)
    );
  useEffect(() => {
    setCrossTechnicianQueuePage(1);
  }, [crossTechnicianQueueSearch, selectedTechnicianQueueFilter, selectedClientFilter, showSavedSessionQueueOnly]);
  useEffect(() => {
    if (crossTechnicianQueuePage > crossTechnicianQueueTotalPages) {
      setCrossTechnicianQueuePage(crossTechnicianQueueTotalPages);
    }
  }, [crossTechnicianQueuePage, crossTechnicianQueueTotalPages]);
  const clientComplianceBacklogSummary = useMemo(() => {
    const grouped = new Map<
      number,
      {
        clientId: number;
        clientName: string;
        openItems: number;
        technicians: Set<number>;
        missingEvidence: number;
        pendingReview: number;
        expired: number;
        currentWithoutEvidence: number;
      }
    >();

    filteredCrossTechnicianBulkQueueItems.forEach((item) => {
      const technician = technicians.find((entry) => entry.id === item.row.technicianId) ?? null;
      const clientId = technician?.clientId ?? 0;
      const clientName =
        clients.find((client) => client.id === clientId)?.companyName ?? "Unknown client";
      const existing = grouped.get(clientId) ?? {
        clientId,
        clientName,
        openItems: 0,
        technicians: new Set<number>(),
        missingEvidence: 0,
        pendingReview: 0,
        expired: 0,
        currentWithoutEvidence: 0,
      };
      existing.openItems += 1;
      existing.technicians.add(item.row.technicianId);
      if (item.queueLabel === "Missing Evidence") existing.missingEvidence += 1;
      if (item.queueLabel === "Pending Review") existing.pendingReview += 1;
      if (item.queueLabel === "Expired") existing.expired += 1;
      if (item.queueLabel === "Current Without Evidence") existing.currentWithoutEvidence += 1;
      grouped.set(clientId, existing);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        clientId: item.clientId,
        clientName: item.clientName,
        openItems: item.openItems,
        techniciansAffected: item.technicians.size,
        missingEvidence: item.missingEvidence,
        pendingReview: item.pendingReview,
        expired: item.expired,
        currentWithoutEvidence: item.currentWithoutEvidence,
      }))
      .sort((left, right) => right.openItems - left.openItems || left.clientName.localeCompare(right.clientName));
  }, [clients, filteredCrossTechnicianBulkQueueItems, technicians]);
  const technicianComplianceBacklogSummary = useMemo(() => {
    const grouped = new Map<
      number,
      {
        technicianId: number;
        technicianName: string;
        clientName: string;
        openItems: number;
        missingEvidence: number;
        pendingReview: number;
        expired: number;
        currentWithoutEvidence: number;
      }
    >();

    filteredCrossTechnicianBulkQueueItems.forEach((item) => {
      const technician = technicians.find((entry) => entry.id === item.row.technicianId) ?? null;
      const clientName =
        clients.find((client) => client.id === (technician?.clientId ?? 0))?.companyName ??
        "Unknown client";
      const existing = grouped.get(item.row.technicianId) ?? {
        technicianId: item.row.technicianId,
        technicianName: item.row.technicianName,
        clientName,
        openItems: 0,
        missingEvidence: 0,
        pendingReview: 0,
        expired: 0,
        currentWithoutEvidence: 0,
      };
      existing.openItems += 1;
      if (item.queueLabel === "Missing Evidence") existing.missingEvidence += 1;
      if (item.queueLabel === "Pending Review") existing.pendingReview += 1;
      if (item.queueLabel === "Expired") existing.expired += 1;
      if (item.queueLabel === "Current Without Evidence") existing.currentWithoutEvidence += 1;
      grouped.set(item.row.technicianId, existing);
    });

    return Array.from(grouped.values()).sort(
      (left, right) =>
        right.openItems - left.openItems || left.technicianName.localeCompare(right.technicianName)
    );
  }, [clients, filteredCrossTechnicianBulkQueueItems, technicians]);
  const openNextClientComplianceQueueItem = (
    clientId: number,
    action: "record" | "upload" = "record"
  ) => {
    const matchingItems = filteredCrossTechnicianBulkQueueItems.filter((item) => {
      const technician = technicians.find((entry) => entry.id === item.row.technicianId) ?? null;
      return technician?.clientId === clientId;
    });
    const targetItem =
      action === "upload"
        ? matchingItems.find((item) => item.supportsUpload) ?? matchingItems[0] ?? null
        : matchingItems[0] ?? null;
    if (!targetItem) {
      toast.error("No matching queue item is available for this client.");
      return;
    }
    openCrossTechnicianQueueItem(targetItem, action === "upload" && targetItem.supportsUpload ? "upload" : "record");
  };
  const openNextTechnicianComplianceQueueItem = (
    technicianId: number,
    action: "record" | "upload" = "record"
  ) => {
    const matchingItems = filteredCrossTechnicianBulkQueueItems.filter(
      (item) => item.row.technicianId === technicianId
    );
    const targetItem =
      action === "upload"
        ? matchingItems.find((item) => item.supportsUpload) ?? matchingItems[0] ?? null
        : matchingItems[0] ?? null;
    if (!targetItem) {
      toast.error("No matching queue item is available for this technician.");
      return;
    }
    openCrossTechnicianQueueItem(targetItem, action === "upload" && targetItem.supportsUpload ? "upload" : "record");
  };
  const selectVisibleCrossTechnicianQueueItems = () => {
    setSelectedCrossTechnicianQueueSignatures((current) =>
      Array.from(new Set([...current, ...visibleCrossTechnicianQueueSignatures]))
    );
  };
  const addVisibleCrossTechnicianQueueItemsToSession = () => {
    if (visibleCrossTechnicianQueueSignatures.length === 0) {
      toast.error("No visible queue items are available for this session.");
      return;
    }
    setSelectedCrossTechnicianQueueSignatures((current) =>
      Array.from(new Set([...current, ...visibleCrossTechnicianQueueSignatures]))
    );
    toast.success(
      `Added ${visibleCrossTechnicianQueueSignatures.length} visible item${
        visibleCrossTechnicianQueueSignatures.length === 1 ? "" : "s"
      } to the saved session for ${crossTechnicianQueueSessionScopeLabel}.`
    );
  };
  const replaceCrossTechnicianQueueSessionWithVisible = () => {
    if (visibleCrossTechnicianQueueSignatures.length === 0) {
      toast.error("No visible queue items are available for this session.");
      return;
    }
    setSelectedCrossTechnicianQueueSignatures(visibleCrossTechnicianQueueSignatures);
    setCrossTechnicianQueueSessionPeakCount(visibleCrossTechnicianQueueSignatures.length);
    setCrossTechnicianQueueLastStartedItem(null);
    toast.success(
      `Rebuilt the saved session for ${crossTechnicianQueueSessionScopeLabel} from ${
        visibleCrossTechnicianQueueSignatures.length
      } visible item${visibleCrossTechnicianQueueSignatures.length === 1 ? "" : "s"}.`
    );
  };
  const clearVisibleCrossTechnicianQueueItems = () => {
    setSelectedCrossTechnicianQueueSignatures((current) =>
      current.filter((signature) => !visibleCrossTechnicianQueueSignatures.includes(signature))
    );
  };
  const technicianIntakeQueueSummary = useMemo<TechnicianIntakeQueueSummary>(() => {
    const rowsByTechnicianId = new Map<number, PortalRequirementRow[]>();
    dedupedComplianceMatrix.forEach((row) => {
      const existing = rowsByTechnicianId.get(row.technicianId) ?? [];
      existing.push(row);
      rowsByTechnicianId.set(row.technicianId, existing);
    });

    const assessmentsByTechnicianId = new Map<number, LevelIIIAssessment[]>();
    assessments.forEach((assessment) => {
      const existing = assessmentsByTechnicianId.get(assessment.technicianId) ?? [];
      existing.push(assessment);
      assessmentsByTechnicianId.set(assessment.technicianId, existing);
    });

    const activeCertificateByTechnicianId = new Map<number, LevelIIITechnicianCertificate>();
    technicianCertificates.forEach((certificate) => {
      if (certificate.status !== "Active") return;
      if (!activeCertificateByTechnicianId.has(certificate.technicianId)) {
        activeCertificateByTechnicianId.set(certificate.technicianId, certificate);
      }
    });

    const items = technicians
      .map<TechnicianIntakeQueueItem>((technician) => {
        const technicianRows = rowsByTechnicianId.get(technician.id) ?? [];
        const importedFromDrive = String(technician.notes ?? "")
          .toLowerCase()
          .includes("seeded from level iii drive audit import");
        const hasAssessment = (assessmentsByTechnicianId.get(technician.id) ?? []).length > 0;
        const hasActiveCertificate = activeCertificateByTechnicianId.has(technician.id);
        const missingEvidenceCount = technicianRows.filter(
          (row) =>
            (row.status === "missing" || row.status === "expired" || row.status === "pending_review") &&
            row.documentCount === 0
        ).length;
        const pendingReviewCount = technicianRows.filter((row) => row.status === "pending_review").length;
        const currentWithoutEvidenceCount = technicianRows.filter(
          (row) => isCurrentLikePortalRequirementStatus(row.status) && row.documentCount === 0
        ).length;
        const reasons: string[] = [];

        if (importedFromDrive) {
          reasons.push("Imported drive-audit record");
        }
        if (!hasAssessment) {
          reasons.push("No assessment linked yet");
        }
        if (!hasActiveCertificate) {
          reasons.push("No active certificate issued");
        }
        if (missingEvidenceCount > 0) {
          reasons.push(`${missingEvidenceCount} evidence gap${missingEvidenceCount === 1 ? "" : "s"}`);
        }
        if (pendingReviewCount > 0) {
          reasons.push(`${pendingReviewCount} item${pendingReviewCount === 1 ? "" : "s"} pending review`);
        }
        if (currentWithoutEvidenceCount > 0) {
          reasons.push(
            `${currentWithoutEvidenceCount} current record${
              currentWithoutEvidenceCount === 1 ? "" : "s"
            } without stored evidence`
          );
        }

        return {
          technician,
          importedFromDrive,
          hasAssessment,
          hasActiveCertificate,
          missingEvidenceCount,
          pendingReviewCount,
          currentWithoutEvidenceCount,
          reasons,
        };
      })
      .filter((item) => item.reasons.length > 0)
      .sort((left, right) => {
        const severityLeft =
          left.missingEvidenceCount * 4 +
          left.pendingReviewCount * 3 +
          (left.hasActiveCertificate ? 0 : 2) +
          (left.hasAssessment ? 0 : 2) +
          left.currentWithoutEvidenceCount;
        const severityRight =
          right.missingEvidenceCount * 4 +
          right.pendingReviewCount * 3 +
          (right.hasActiveCertificate ? 0 : 2) +
          (right.hasAssessment ? 0 : 2) +
          right.currentWithoutEvidenceCount;
        if (severityLeft !== severityRight) {
          return severityRight - severityLeft;
        }
        return left.technician.name.localeCompare(right.technician.name);
      });

    const techniciansWithoutActiveCertificate = technicians.filter(
      (technician) => !activeCertificateByTechnicianId.has(technician.id)
    );

    return {
      importedFromDrive: technicians.filter((technician) =>
        String(technician.notes ?? "").toLowerCase().includes("seeded from level iii drive audit import")
      ).length,
      noAssessment: technicians.filter(
        (technician) => (assessmentsByTechnicianId.get(technician.id) ?? []).length === 0
      ).length,
      noActiveCertificate: techniciansWithoutActiveCertificate.length,
      missingEvidence: items.filter((item) => item.missingEvidenceCount > 0).length,
      pendingReview: items.filter((item) => item.pendingReviewCount > 0).length,
      readyForCertificate: techniciansWithoutActiveCertificate.filter((technician) => {
        const queueItem = items.find((item) => item.technician.id === technician.id);
        return (
          (assessmentsByTechnicianId.get(technician.id) ?? []).length > 0 &&
          (queueItem?.missingEvidenceCount ?? 0) === 0 &&
          (queueItem?.pendingReviewCount ?? 0) === 0
        );
      }).length,
      items: items.slice(0, 8),
    };
  }, [assessments, complianceMatrix, technicianCertificates, technicians]);
  const levelIIIDocumentGenerationSummary = useMemo<LevelIIIDocumentGenerationSummary>(() => {
    const rowsByTechnicianId = new Map<number, PortalRequirementRow[]>();
    dedupedComplianceMatrix.forEach((row) => {
      const existing = rowsByTechnicianId.get(row.technicianId) ?? [];
      existing.push(row);
      rowsByTechnicianId.set(row.technicianId, existing);
    });

    const items = technicianCertificates
      .map<LevelIIIDocumentGenerationQueueItem>((certificate) => {
        const technician = technicians.find((entry) => entry.id === certificate.technicianId) ?? null;
        const methodLevels = getCertificateMethodLevels(certificate);
        const recommendedFileName =
          buildSuggestedLevelIIITechnicianCertificateFileName(technician?.name, methodLevels) ||
          `${certificate.certificateNumber}.pdf`;
        const hasStoredFile = Boolean(certificate.fileUrl || certificate.fileKey);
        const latestReleaseExport =
          latestTechnicianCertificateExportByCertificateId.get(certificate.id) ?? null;
        const approvedAtTime = new Date(
          certificate.approvedAt ?? certificate.updatedAt ?? certificate.createdAt
        ).getTime();
        const latestReleaseExportTime = new Date(latestReleaseExport?.createdAt ?? 0).getTime();
        const hasReleaseExport =
          Boolean(latestReleaseExport) &&
          latestReleaseExportTime >= (Number.isNaN(approvedAtTime) ? 0 : approvedAtTime);
        const sourceBackedImport = Boolean(certificate.sourcePath && !hasStoredFile);
        const technicianRows = rowsByTechnicianId.get(certificate.technicianId) ?? [];
        const missingEvidenceCount = technicianRows.filter(
          (row) =>
            (row.status === "missing" || row.status === "expired" || row.status === "pending_review") &&
            row.documentCount === 0
        ).length;
        const pendingReviewCount = technicianRows.filter((row) => row.status === "pending_review").length;
        const controlledDocs = controlledDocumentsByCertificateId.get(certificate.id) ?? [];
        const sortedControlledDocs = controlledDocs
          .slice()
          .sort(
            (left, right) =>
              (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0)
          );
        const latestControlledDocument = sortedControlledDocs[0] ?? null;
        const controlledDraftCount = controlledDocs.filter(
          (document) => String(document.tags?.generatedStatus || "Draft") === "Draft"
        ).length;
        const controlledInReviewCount = controlledDocs.filter(
          (document) => String(document.tags?.approvalStatus || "Draft") === "In Review"
        ).length;
        const controlledRejectedCount = controlledDocs.filter(
          (document) => String(document.tags?.approvalStatus || "Draft") === "Rejected"
        ).length;
        const approvedControlledDocs = controlledDocs.filter(
          (document) => String(document.tags?.approvalStatus || "Draft") === "Approved"
        );
        const hasApprovedControlledDocument = approvedControlledDocs.length > 0;
        const controlledIssuedCount = controlledDocs.filter(
          (document) => String(document.tags?.generatedStatus || "") === "Issued"
        ).length;
        const storageTargets = technician
          ? buildLevelIIIDocumentAutomationRules({
              technicianName: technician.name,
              techniques: getTechnicianMethods(technician),
              methodQualifications: getTechnicianMethodQualifications(technician),
            })
              .slice(0, 3)
              .map((rule) => ({ label: rule.label, path: rule.storagePath }))
          : [];
        const reasons: string[] = [];

        if (
          certificate.approvalStatus === "approved" &&
          !hasStoredFile &&
          !hasApprovedControlledDocument &&
          !hasReleaseExport
        ) {
          reasons.push("Approved certificate is ready for final export");
        }
        if (
          certificate.approvalStatus === "approved" &&
          !hasStoredFile &&
          hasApprovedControlledDocument &&
          !hasReleaseExport
        ) {
          reasons.push("Approved controlled document is ready for stored release output");
        }
        if (certificate.approvalStatus === "approved" && !hasStoredFile && hasReleaseExport) {
          reasons.push(
            `Release export recorded ${formatExportDate(latestReleaseExport?.createdAt ?? null)}; stored file link still pending`
          );
        }
        if (certificate.approvalStatus !== "approved") {
          reasons.push(
            `Export blocked until approval is ${formatLevelIIIStatusLabel(
              certificate.approvalStatus,
              "unknown"
            )}`
          );
        }
        if (!hasStoredFile && !hasApprovedControlledDocument) {
          reasons.push("No stored certificate file is linked yet");
        }
        if (sourceBackedImport && !hasApprovedControlledDocument) {
          reasons.push("Imported source path exists but no stored file has been attached");
        }
        if (missingEvidenceCount > 0) {
          reasons.push(`${missingEvidenceCount} technician evidence gap${missingEvidenceCount === 1 ? "" : "s"}`);
        }
        if (pendingReviewCount > 0) {
          reasons.push(`${pendingReviewCount} technician item${pendingReviewCount === 1 ? "" : "s"} pending review`);
        }
        if (controlledDocs.length === 0) {
          reasons.push("No controlled generated document exists yet");
        } else if (controlledDraftCount > 0 && controlledIssuedCount === 0) {
          reasons.push("Controlled document exists but is still draft-stage");
        }
        if (controlledInReviewCount > 0) {
          reasons.push("Controlled document is waiting for approval");
        }
        if (controlledRejectedCount > 0) {
          reasons.push("Controlled document was rejected and needs correction");
        }

        const priorityRank =
          controlledRejectedCount > 0
            ? 7
            : certificate.approvalStatus === "in_review" || controlledInReviewCount > 0
              ? 6
              : certificate.approvalStatus === "approved" &&
                  !hasStoredFile &&
                  !hasReleaseExport
                ? 5
                : controlledDocs.length === 0
                  ? 4
                  : controlledDraftCount > 0 && !hasApprovedControlledDocument
                    ? 3
                    : missingEvidenceCount > 0 || pendingReviewCount > 0
                      ? 2
                      : sourceBackedImport
                        ? 1
                        : 0;
        const priorityLabel =
          priorityRank === 7
            ? "Rejected Controlled Doc"
            : priorityRank === 6
              ? "Approval Blocked"
              : priorityRank === 5
                ? "Ready To Release"
                : priorityRank === 4
                  ? "Missing Controlled Doc"
                  : priorityRank === 3
                    ? "Draft Needs Progress"
                    : priorityRank === 2
                      ? "Evidence Follow-Up"
                      : priorityRank === 1
                        ? "Imported Output Follow-Up"
                        : "Stable";

        return {
          certificate,
          technician,
          recommendedFileName,
          priorityLabel,
          priorityRank,
          hasStoredFile,
          hasReleaseExport,
          hasApprovedControlledDocument,
          sourceBackedImport,
          latestReleaseExport,
          missingEvidenceCount,
          pendingReviewCount,
          controlledDocumentCount: controlledDocs.length,
          controlledDraftCount,
          controlledIssuedCount,
          controlledInReviewCount,
          controlledRejectedCount,
          latestControlledDocument,
          storageTargets,
          reasons,
        };
      })
      .filter((item) => item.reasons.length > 0)
      .sort((left, right) => {
        if (left.priorityRank !== right.priorityRank) {
          return right.priorityRank - left.priorityRank;
        }

        const severityLeft =
          left.controlledRejectedCount * 6 +
          left.controlledInReviewCount * 5 +
          (left.certificate.approvalStatus === "approved" && !left.hasStoredFile ? 4 : 0) +
          (left.hasStoredFile || left.hasApprovedControlledDocument ? 0 : 3) +
          left.missingEvidenceCount * 2 +
          left.pendingReviewCount +
          (left.sourceBackedImport ? 1 : 0);
        const severityRight =
          right.controlledRejectedCount * 6 +
          right.controlledInReviewCount * 5 +
          (right.certificate.approvalStatus === "approved" && !right.hasStoredFile ? 4 : 0) +
          (right.hasStoredFile || right.hasApprovedControlledDocument ? 0 : 3) +
          right.missingEvidenceCount * 2 +
          right.pendingReviewCount +
          (right.sourceBackedImport ? 1 : 0);
        if (severityLeft !== severityRight) {
          return severityRight - severityLeft;
        }
        return right.certificate.id - left.certificate.id;
      });

    return {
      readyForFinalExport: technicianCertificates.filter(
        (certificate) =>
          certificate.approvalStatus === "approved" &&
          !certificate.fileUrl &&
          !certificate.fileKey &&
          !(() => {
            const latestExport = latestTechnicianCertificateExportByCertificateId.get(certificate.id);
            if (!latestExport) return false;
            const approvedAtTime = new Date(
              certificate.approvedAt ?? certificate.updatedAt ?? certificate.createdAt
            ).getTime();
            const exportTime = new Date(latestExport.createdAt ?? 0).getTime();
            return exportTime >= (Number.isNaN(approvedAtTime) ? 0 : approvedAtTime);
          })()
      ).length,
      blockedByApproval: technicianCertificates.filter(
        (certificate) => certificate.approvalStatus !== "approved"
      ).length,
      missingStoredFiles: technicianCertificates.filter(
        (certificate) =>
          !certificate.fileUrl &&
          !certificate.fileKey &&
          !(controlledDocumentsByCertificateId.get(certificate.id) ?? []).some(
            (document) => String(document.tags?.approvalStatus || "Draft") === "Approved"
          )
      ).length,
      sourceBackedImports: technicianCertificates.filter(
        (certificate) =>
          Boolean(certificate.sourcePath) &&
          !certificate.fileUrl &&
          !certificate.fileKey &&
          !(controlledDocumentsByCertificateId.get(certificate.id) ?? []).some(
            (document) => String(document.tags?.approvalStatus || "Draft") === "Approved"
          )
      ).length,
      techniciansWithAutomationTargets: technicians.filter((technician) =>
        buildLevelIIIDocumentAutomationRules({
          technicianName: technician.name,
          techniques: getTechnicianMethods(technician),
          methodQualifications: getTechnicianMethodQualifications(technician),
        }).length > 0
      ).length,
      releasedByControlledDocs: technicianCertificates.filter((certificate) =>
        (controlledDocumentsByCertificateId.get(certificate.id) ?? []).some(
          (document) => String(document.tags?.approvalStatus || "Draft") === "Approved"
        )
      ).length,
      missingControlledDocs: technicianCertificates.filter(
        (certificate) => (controlledDocumentsByCertificateId.get(certificate.id) ?? []).length === 0
      ).length,
      controlledDrafts: Array.from(controlledDocumentsByCertificateId.values()).reduce(
        (total, documents) =>
          total +
          documents.filter((document) => String(document.tags?.generatedStatus || "Draft") === "Draft").length,
        0
      ),
      controlledInReview: Array.from(controlledDocumentsByCertificateId.values()).reduce(
        (total, documents) =>
          total +
          documents.filter((document) => String(document.tags?.approvalStatus || "Draft") === "In Review").length,
        0
      ),
      controlledRejected: Array.from(controlledDocumentsByCertificateId.values()).reduce(
        (total, documents) =>
          total +
          documents.filter((document) => String(document.tags?.approvalStatus || "Draft") === "Rejected").length,
        0
      ),
      controlledIssued: Array.from(controlledDocumentsByCertificateId.values()).reduce(
        (total, documents) =>
          total +
          documents.filter((document) => String(document.tags?.generatedStatus || "") === "Issued").length,
        0
      ),
      items,
    };
  }, [
    complianceMatrix,
    controlledDocumentsByCertificateId,
    formatExportDate,
    latestTechnicianCertificateExportByCertificateId,
    technicianCertificates,
    technicians,
  ]);
  const filteredLevelIIIDocumentGenerationItems = useMemo(() => {
    const handledSignatures = new Set(handledDocumentGenerationEntries.map((entry) => entry.signature));
    const matchesFilter = (item: LevelIIIDocumentGenerationQueueItem) => {
      switch (selectedDocumentGenerationFilter) {
        case "approval_blocked":
          return item.priorityRank === 6;
        case "rejected_controlled":
          return item.priorityRank === 7;
        case "ready_to_release":
          return item.priorityRank === 5;
        case "missing_controlled":
          return item.priorityRank === 4;
        case "draft_progress":
          return item.priorityRank === 3;
        case "evidence_follow_up":
          return item.priorityRank === 2;
        case "imported_follow_up":
          return item.priorityRank === 1;
        default:
          return true;
      }
    };

    return levelIIIDocumentGenerationSummary.items.filter(
      (item) =>
        matchesFilter(item) &&
        !handledSignatures.has(buildLevelIIIDocumentGenerationItemSignature(item))
    );
  }, [
    handledDocumentGenerationEntries,
    levelIIIDocumentGenerationSummary.items,
    selectedDocumentGenerationFilter,
  ]);
  const levelIIIDocumentGenerationFilterOptions = useMemo(
    () => [
      {
        value: "all" as const,
        label: "All",
        count: levelIIIDocumentGenerationSummary.items.length,
      },
      {
        value: "rejected_controlled" as const,
        label: "Rejected",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 7).length,
      },
      {
        value: "approval_blocked" as const,
        label: "Approval Blocked",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 6).length,
      },
      {
        value: "ready_to_release" as const,
        label: "Ready To Release",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 5).length,
      },
      {
        value: "missing_controlled" as const,
        label: "Missing Controlled",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 4).length,
      },
      {
        value: "draft_progress" as const,
        label: "Draft Progress",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 3).length,
      },
      {
        value: "evidence_follow_up" as const,
        label: "Evidence",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 2).length,
      },
      {
        value: "imported_follow_up" as const,
        label: "Imported",
        count: levelIIIDocumentGenerationSummary.items.filter((item) => item.priorityRank === 1).length,
      },
    ],
    [levelIIIDocumentGenerationSummary.items]
  );
  const primaryFilteredDocumentGenerationItem = filteredLevelIIIDocumentGenerationItems[0] ?? null;
  const recentHandledDocumentGenerationEntries = useMemo(
    () =>
      handledDocumentGenerationEntries
        .slice()
        .sort(
          (left, right) =>
            (new Date(right.handledAt).getTime() || 0) - (new Date(left.handledAt).getTime() || 0)
        )
        .slice(0, 5),
    [handledDocumentGenerationEntries]
  );
  const batchDocumentGenerationCandidates = useMemo(() => {
    switch (selectedDocumentGenerationFilter) {
      case "missing_controlled":
        return filteredLevelIIIDocumentGenerationItems.filter((item) => item.controlledDocumentCount === 0);
      case "draft_progress":
        return filteredLevelIIIDocumentGenerationItems.filter(
          (item) =>
            Boolean(item.latestControlledDocument) &&
            String(item.latestControlledDocument?.tags?.approvalStatus || "Draft") !== "In Review" &&
            String(item.latestControlledDocument?.tags?.approvalStatus || "Draft") !== "Approved"
        );
      case "ready_to_release":
        return filteredLevelIIIDocumentGenerationItems.filter(
          (item) =>
            item.certificate.approvalStatus === "approved" &&
            !item.hasStoredFile &&
            !item.hasApprovedControlledDocument
        );
      default:
        return [];
    }
  }, [filteredLevelIIIDocumentGenerationItems, selectedDocumentGenerationFilter]);
  const batchDocumentGenerationActionLabel =
    selectedDocumentGenerationFilter === "missing_controlled"
      ? "Create Drafts"
      : selectedDocumentGenerationFilter === "draft_progress"
        ? "Submit Reviews"
        : selectedDocumentGenerationFilter === "ready_to_release"
          ? "Export HTML Batch"
          : null;
  const levelIIICertificateReleaseQueueItems = useMemo(
    () =>
      levelIIIDocumentGenerationSummary.items.filter(
        (item) =>
          item.certificate.approvalStatus === "approved" &&
          !item.hasStoredFile &&
          !item.hasReleaseExport
      ),
    [levelIIIDocumentGenerationSummary.items]
  );
  const levelIIICertificateReleaseQueueSummary = useMemo(
    () => ({
      total: levelIIICertificateReleaseQueueItems.length,
      controlledReady: levelIIICertificateReleaseQueueItems.filter(
        (item) => item.hasApprovedControlledDocument
      ).length,
      certificateReady: levelIIICertificateReleaseQueueItems.filter(
        (item) => !item.hasApprovedControlledDocument
      ).length,
      sourceImports: levelIIICertificateReleaseQueueItems.filter((item) => item.sourceBackedImport).length,
      exportedPendingStorage: levelIIIDocumentGenerationSummary.items.filter(
        (item) =>
          item.certificate.approvalStatus === "approved" &&
          !item.hasStoredFile &&
          item.hasReleaseExport
      ).length,
    }),
    [levelIIICertificateReleaseQueueItems, levelIIIDocumentGenerationSummary.items]
  );
  const runCertificateReleaseBatchAction = async () => {
    if (levelIIICertificateReleaseQueueItems.length === 0) {
      return;
    }

    setDocumentGenerationBatchAction("export_html_release_queue");
    let completedCount = 0;

    try {
      for (const item of levelIIICertificateReleaseQueueItems) {
        exportEditableHtmlDocument(getLevelIIICertificateDocumentOptions(item.certificate));
        await recordLevelIIICertificateExport(item.certificate, "html");
        completedCount += 1;
      }

      toast.success(
        `Export HTML Batch completed for ${completedCount} release item${
          completedCount === 1 ? "" : "s"
        }.`
      );
    } finally {
      setDocumentGenerationBatchAction(null);
    }
  };
  const selectedTechnicianDocumentGenerationItem = useMemo(() => {
    if (!selectedComplianceTechnicianId) {
      return null;
    }

    const latestCertificate = latestTechnicianCertificateByTechnicianId.get(
      selectedComplianceTechnicianId
    );
    if (latestCertificate) {
      const matchingLatestCertificate =
        levelIIIDocumentGenerationSummary.items.find(
          (item) => item.certificate.id === latestCertificate.id
        ) ?? null;
      if (matchingLatestCertificate) {
        return matchingLatestCertificate;
      }
    }

    return (
      levelIIIDocumentGenerationSummary.items.find(
        (item) => item.certificate.technicianId === selectedComplianceTechnicianId
      ) ?? null
    );
  }, [
    latestTechnicianCertificateByTechnicianId,
    levelIIIDocumentGenerationSummary.items,
    selectedComplianceTechnicianId,
  ]);
  const selectedTechnicianDocumentPackGuide = useMemo(() => {
    if (!selectedComplianceTechnician) return [];
    const requestedDocuments = selectedTechnicianRequirementRows.map((row) => row.definitionName);
    const rules = buildLevelIIIDocumentAutomationRules({
      technicianName: selectedComplianceTechnician.name,
      techniques: getTechnicianMethods(selectedComplianceTechnician),
      methodQualifications: getTechnicianMethodQualifications(selectedComplianceTechnician),
      requestedDocuments,
    });
    const requirementByName = new Map(
      selectedTechnicianRequirementRows.map((row) => [row.definitionName.trim().toLowerCase(), row] as const)
    );
    return rules.map((rule) => {
      const matchedRequirement = requirementByName.get(rule.label.trim().toLowerCase()) ?? null;
      return {
        ...rule,
        matchedRequirement,
      };
    });
  }, [selectedComplianceTechnician, selectedTechnicianRequirementRows]);
  const availableTechnicianDirectUploadRules = useMemo(
    () =>
      selectedTechnicianDocumentPackGuide.filter((rule) => {
        const matchedRequirement = rule.matchedRequirement;
        if (!matchedRequirement) {
          return true;
        }
        return Number(matchedRequirement.documentCount ?? 0) <= 0;
      }),
    [selectedTechnicianDocumentPackGuide]
  );
  const nextMissingEvidenceRequirement =
    selectedTechnicianDocumentControlSummary.missingEvidenceRows[0] ?? null;
  const nextPendingReviewRequirement =
    selectedTechnicianDocumentControlSummary.pendingReviewRows[0] ?? null;
  const nextExpiredRequirement = selectedTechnicianDocumentControlSummary.expiredRows[0] ?? null;
  const nextCertificateLinkedRequirement =
    selectedTechnicianDocumentControlSummary.certificateLinkedRows[0] ?? null;
  const openTechnicianDirectUploadDialog = (
    preferredRule: (typeof selectedTechnicianDocumentPackGuide)[number] | null = null
  ) => {
    const defaultRule =
      preferredRule ??
      availableTechnicianDirectUploadRules[0] ??
      selectedTechnicianDocumentPackGuide[0] ??
      null;
    setTechnicianDirectUploadFormValues({
      documentLabel: defaultRule?.label ?? "",
      fileName: defaultRule?.suggestedFileName ?? "",
      issuedAt: "",
      notes: defaultRule
        ? `Suggested storage folder: ${defaultRule.storagePath}`
        : "Select a document type to populate the suggested storage folder.",
      attachmentFile: "",
      attachmentFileName: "",
    });
    setIsTechnicianDirectUploadOpen(true);
  };
  const openTechnicianRequirementUploadFromRow = (row: PortalRequirementRow) => {
    const matchedRule =
      selectedTechnicianDocumentPackGuide.find(
        (rule) => rule.label.trim().toLowerCase() === row.definitionName.trim().toLowerCase()
      ) ?? null;
    if (matchedRule) {
      openTechnicianDirectUploadDialog(matchedRule);
      return;
    }
    openTechnicianComplianceRecord(row);
  };
  const openTechnicianDirectUploadDialogForRow = (row: PortalRequirementRow) => {
    const technician = technicians.find((entry) => entry.id === row.technicianId) ?? null;
    if (!technician) {
      toast.error("Technician not found for this document row.");
      return;
    }
    const rules = buildLevelIIIDocumentAutomationRules({
      technicianName: technician.name,
      techniques: getTechnicianMethods(technician),
      methodQualifications: getTechnicianMethodQualifications(technician),
      requestedDocuments: [row.definitionName],
    });
    const matchedRule =
      rules.find((rule) => rule.label.trim().toLowerCase() === row.definitionName.trim().toLowerCase()) ??
      rules[0] ??
      null;
    setSelectedClientFilter(String(technician.clientId));
    setSelectedComplianceTechnicianId(technician.id);
    setTechnicianDirectUploadFormValues({
      documentLabel: matchedRule?.label ?? row.definitionName,
      fileName: matchedRule?.suggestedFileName ?? row.latestDocumentName ?? row.definitionName,
      issuedAt: "",
      notes: matchedRule
        ? `Suggested storage folder: ${matchedRule.storagePath}`
        : "Select a document type to populate the suggested storage folder.",
      attachmentFile: "",
      attachmentFileName: "",
    });
    setIsTechnicianDirectUploadOpen(true);
  };
  const openCrossTechnicianQueueItem = (
    item: LevelIIITechnicianDocumentQueueItem,
    action: "record" | "upload" = "record"
  ) => {
    openTechnicianComplianceWorkspace(item.row.technicianId);
    if (action === "upload" && item.supportsUpload) {
      openTechnicianDirectUploadDialogForRow(item.row);
      return;
    }
    window.setTimeout(() => {
      openTechnicianComplianceRecord(item.row);
    }, 0);
  };
  const selectedDirectUploadRule =
    selectedTechnicianDocumentPackGuide.find(
      (rule) => rule.label === technicianDirectUploadFormValues.documentLabel
    ) ??
    availableTechnicianDirectUploadRules[0] ??
    selectedTechnicianDocumentPackGuide[0] ??
    null;
  const selectedDirectUploadDefinition =
    selectedDirectUploadRule?.matchedRequirement ??
    (levelIIIRequirementDefinitions.find(
      (definition) =>
        definition.name.trim().toLowerCase() ===
        String(selectedDirectUploadRule?.label ?? "")
          .trim()
          .toLowerCase()
    ) ??
      null);
  const handleTechnicianDirectUploadRuleChange = (documentLabel: string) => {
    const selectedRule =
      selectedTechnicianDocumentPackGuide.find((rule) => rule.label === documentLabel) ?? null;
    setTechnicianDirectUploadFormValues((current) => ({
      ...current,
      documentLabel,
      fileName: selectedRule?.suggestedFileName ?? current.fileName,
      issuedAt: "",
      notes: selectedRule
        ? `Suggested storage folder: ${selectedRule.storagePath}`
        : "Select a document type to populate the suggested storage folder.",
    }));
  };
  const handleTechnicianDirectUploadFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setTechnicianDirectUploadFormValues((current) => ({
        ...current,
        attachmentFile: "",
        attachmentFileName: "",
      }));
      return;
    }

    try {
      const dataUrl = await readLevelIIIFileAsDataUrl(file);
      setTechnicianDirectUploadFormValues((current) => ({
        ...current,
        attachmentFile: dataUrl,
        attachmentFileName: file.name,
        fileName: current.fileName.trim() ? current.fileName : file.name,
      }));
      toast.success("Document attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read the selected file.");
    } finally {
      event.target.value = "";
    }
  };
  const openSelectedEvidenceFile = async () => {
    if (!selectedEvidenceReview?.fileUrl) {
      toast.error("This record does not have a stored file yet.");
      return;
    }
    await openLevelIIIEvidenceFile(selectedEvidenceReview);
  };
  const downloadSelectedEvidenceFile = async () => {
    if (!selectedEvidenceReview?.fileUrl) {
      toast.error("This record does not have a stored file yet.");
      return;
    }

    try {
      const asset = await fetchLevelIIIEvidencePreviewAsset(selectedEvidenceReview);
      const anchor = window.document.createElement("a");
      anchor.href = asset.objectUrl;
      anchor.download = selectedEvidenceReview.fileName || selectedEvidenceReview.title || "evidence";
      window.document.body.appendChild(anchor);
      anchor.click();
      window.document.body.removeChild(anchor);
      window.setTimeout(() => {
        window.URL.revokeObjectURL(asset.objectUrl);
      }, 5_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download the stored file.");
    }
  };
  const copySelectedEvidenceReference = async () => {
    const value =
      selectedEvidenceReview?.storagePath ||
      selectedEvidenceReview?.sourceReference ||
      selectedEvidenceReview?.fileUrl ||
      "";
    if (!value) {
      toast.error("No file reference is available for this evidence record.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Evidence reference copied");
    } catch {
      toast.error("Could not copy the evidence reference.");
    }
  };
  const handleSubmitTechnicianDirectUpload = async () => {
    const values = technicianDirectUploadFormValues;
    if (!selectedComplianceTechnician || !selectedComplianceClientId) {
      throw new Error("Choose a technician before uploading a document.");
    }

    const selectedRule =
      selectedTechnicianDocumentPackGuide.find(
        (rule) => rule.label === String(values.documentLabel ?? "").trim()
      ) ?? null;
    if (!selectedRule) {
      throw new Error("Choose a document type before uploading.");
    }

    const attachmentFile = String(values.attachmentFile ?? "").trim();
    if (!attachmentFile) {
      throw new Error("Choose a file to upload.");
    }

    const definitions = levelIIIRequirementDefinitions;
    const existingDefinition =
      definitions.find(
        (definition) =>
          definition.name.trim().toLowerCase() === selectedRule.label.trim().toLowerCase()
      ) ?? null;
    let ensuredDefinitionId = Number(
      selectedRule.matchedRequirement?.definitionId ?? existingDefinition?.id ?? 0
    );
    if (!Number.isFinite(ensuredDefinitionId) || ensuredDefinitionId <= 0) {
      const createdDefinition = await createTechnicianRequirementDefinitionMutation.mutateAsync({
        clientId: selectedComplianceClientId,
        name: selectedRule.label,
        category: selectedRule.category === "method" ? "Method Certificate" : "Core Document",
        description: `Auto-created from the Level III upload workspace for ${selectedRule.displayLabel}.`,
        isRequired: true,
        active: true,
        reminderDays: 30,
        sortOrder: selectedTechnicianDocumentPackGuide.findIndex(
          (rule) => rule.label === selectedRule.label
        ),
      });
      ensuredDefinitionId = Number((createdDefinition as { id?: number } | null)?.id ?? 0);
    }
    if (!Number.isFinite(ensuredDefinitionId) || ensuredDefinitionId <= 0) {
      const refreshedDefinitions = await utils.clientPortal.requirements.listDefinitions.fetch({
        clientId: selectedComplianceClientId,
      });
      const resolvedDefinition =
        (refreshedDefinitions as PortalRequirementDefinition[]).find(
          (definition) =>
            definition.name.trim().toLowerCase() === selectedRule.label.trim().toLowerCase()
        ) ?? null;
      ensuredDefinitionId = Number(resolvedDefinition?.id ?? 0);
    }
    if (!Number.isFinite(ensuredDefinitionId) || ensuredDefinitionId <= 0) {
      throw new Error("Could not create the selected compliance document type.");
    }

    const ensuredRecord = await upsertTechnicianRequirementMutation.mutateAsync({
      clientId: selectedComplianceClientId,
      technicianId: selectedComplianceTechnician.id,
      definitionId: ensuredDefinitionId,
      status: "pending_review",
      issuedAt: String(values.issuedAt ?? "").trim()
        ? new Date(`${String(values.issuedAt)}T00:00:00`)
        : null,
      validUntil: undefined,
      notes:
        String(values.notes ?? "").trim() ||
        `Direct upload from Level III workspace. Suggested storage folder: ${selectedRule.storagePath}`,
      customFieldValues: {},
    });

    const uploadFileNameBase =
      String(values.fileName ?? "").trim() || selectedRule.suggestedFileName;
    const fileExtension = inferLevelIIIFileExtensionFromDataUrl(attachmentFile);
    const uploadFileName = fileExtension &&
      !uploadFileNameBase.toLowerCase().endsWith(fileExtension.toLowerCase())
      ? `${uploadFileNameBase}${fileExtension}`
      : uploadFileNameBase;

    await uploadTechnicianRequirementDocumentMutation.mutateAsync({
      clientId: selectedComplianceClientId,
      technicianRequirementId: Number(ensuredRecord.id),
      fileName: uploadFileName,
      fileDataUrl: attachmentFile,
    });

    await Promise.all([
      utils.clientPortal.requirements.listMatrix.invalidate(),
      utils.clientPortal.requirements.listDefinitions.invalidate(),
    ]);
    setIsTechnicianDirectUploadOpen(false);
    setTechnicianDirectUploadFormValues(createEmptyTechnicianDirectUploadForm());
    toast.success("Technician document uploaded");
  };
  const filteredAssessments = useMemo(
    () =>
      assessments.filter((assessment) => {
        const technician = technicians.find((item) => item.id === assessment.technicianId);
        const clientName = technician
          ? clients.find((client) => client.id === technician.clientId)?.companyName ?? ""
          : "";
        const matchesClient =
          selectedAssessmentClientFilter === "all" ||
          (technician?.clientId === Number.parseInt(selectedAssessmentClientFilter, 10));
        const searchTarget = [
          technician?.name,
          clientName,
          formatAssessmentMethods(assessment),
          formatAssessmentLevels(assessment),
          assessment.assessor,
          assessment.result,
          assessment.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesClient && searchTarget.includes(assessmentSearch.toLowerCase());
      }),
    [
      assessmentSearch,
      assessments,
      clients,
      selectedAssessmentClientFilter,
      technicians,
    ]
  );
  const filteredPortalServiceRequests = useMemo(() => {
    const term = portalRequestSearch.toLowerCase();
    return (portalServiceRequests as PortalServiceRequest[]).filter((request) => {
      const metadata = normalisePortalServiceRequestMetadata(request.metadata);
      const searchTarget = [
        request.title,
        request.requestType,
        request.serviceDefinitionTitle,
        request.branchName,
        request.technicianName,
        request.requestedByName,
        request.requestedByEmail,
        request.status,
        request.details,
        request.internalNotes,
        metadata.clientVisibleUpdate,
        metadata.internalOwner,
        metadata.plannedAction,
        request.linkedActivity?.subject,
        request.linkedActivity?.activityType,
        request.linkedActivity?.status,
        request.techniques.join(" "),
        request.requestedDocuments.join(" "),
        metadata.selectedTechniques.join(" "),
        metadata.matchedGuideTitles.join(" "),
        metadata.readinessBringItems.join(" "),
        metadata.readinessCompanyItems.join(" "),
        metadata.uncoveredTechniques.join(" "),
        metadata.plannerNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchTarget.includes(term);
    });
  }, [portalRequestSearch, portalServiceRequests]);
  const levelIIIRolloutReadinessSummary = useMemo<LevelIIIRolloutReadinessSummary>(() => {
    const allComplianceRows = dedupedComplianceMatrix;
    const requestReadinessSnapshots = filteredPortalServiceRequests.map((request) =>
      getAssessmentBookingReadinessSnapshot(request)
    );
    const checklistItems: string[] = [];

    if (clients.length === 0) {
      checklistItems.push("Add at least one Level III client.");
    }
    if (technicians.length === 0) {
      checklistItems.push("Add technicians before running certificate and compliance workflow tests.");
    }
    if (levelIIIRequirementDefinitions.length === 0) {
      checklistItems.push("Define technician compliance requirements so evidence routing can be tested.");
    }
    if (selectedPortalClientNumber <= 0) {
      checklistItems.push("Choose a portal client in the Portal Requests tab to test request-pack routing.");
    }
    if (
      requestReadinessSnapshots.some(
        (snapshot) =>
          snapshot.outstandingUploadLabels.length > 0 || snapshot.uncoveredTechniques.length > 0
      )
    ) {
      checklistItems.push("Resolve request-pack upload gaps and uncovered technique guide gaps.");
    }
    if (
      allComplianceRows.some(
        (row) =>
          (row.status === "missing" || row.status === "expired" || row.status === "pending_review") &&
          row.documentCount === 0
      )
    ) {
      checklistItems.push("Upload missing technician evidence for expired, missing, or pending-review compliance rows.");
    }
    if (
      technicianCertificates.some(
        (certificate) =>
          certificate.approvalStatus === "draft" || certificate.approvalStatus === "in_review"
      )
    ) {
      checklistItems.push("Complete certificate sign-off for draft and in-review certificates.");
    }

    return {
      activeCertificates: technicianCertificates.filter((certificate) => certificate.status === "Active").length,
      pendingCertificateApprovals: technicianCertificates.filter(
        (certificate) =>
          certificate.approvalStatus === "draft" ||
          certificate.approvalStatus === "in_review" ||
          certificate.approvalStatus === "rejected"
      ).length,
      expiringCertificates: technicianCertificates.filter((certificate) =>
        isCertificateExpiringSoon(certificate)
      ).length,
      complianceMissingEvidence: allComplianceRows.filter(
        (row) =>
          (row.status === "missing" || row.status === "expired" || row.status === "pending_review") &&
          row.documentCount === 0
      ).length,
      compliancePendingReview: allComplianceRows.filter((row) => row.status === "pending_review").length,
      requestUploadsOutstanding: requestReadinessSnapshots.reduce(
        (total, snapshot) => total + snapshot.outstandingUploadLabels.length,
        0
      ),
      requestGuideGaps: requestReadinessSnapshots.reduce(
        (total, snapshot) => total + snapshot.uncoveredTechniques.length,
        0
      ),
      checklistItems,
    };
  }, [
    clients.length,
    technicians.length,
    complianceMatrix,
    complianceDefinitions,
    filteredPortalServiceRequests,
    selectedPortalClientNumber,
    technicianCertificates,
  ]);
  const levelIIIKpiSummary = useMemo(() => {
    const openCompliancePressure =
      levelIIIRolloutReadinessSummary.complianceMissingEvidence +
      levelIIIRolloutReadinessSummary.compliancePendingReview;
    const topClientPressure = clientComplianceBacklogSummary.slice(0, 3);

    return {
      activeCertificates: levelIIIRolloutReadinessSummary.activeCertificates,
      pendingCertificateApprovals: levelIIIRolloutReadinessSummary.pendingCertificateApprovals,
      expiringCertificates: levelIIIRolloutReadinessSummary.expiringCertificates,
      openCompliancePressure,
      requestUploadsOutstanding: levelIIIRolloutReadinessSummary.requestUploadsOutstanding,
      requestGuideGaps: levelIIIRolloutReadinessSummary.requestGuideGaps,
      portalRequests: filteredPortalServiceRequests.length,
      assessments: assessments.length,
      activities: activities.length,
      topClientPressure,
      nextAction:
        levelIIIRolloutReadinessSummary.checklistItems[0] ??
        "Core Level III workflow is covered. Next step is shaping client-specific performance targets.",
    };
  }, [
    activities.length,
    assessments.length,
    clientComplianceBacklogSummary,
    filteredPortalServiceRequests.length,
    levelIIIRolloutReadinessSummary,
  ]);
  const levelIIIMissingDocumentAlertCount =
    levelIIIRolloutReadinessSummary.complianceMissingEvidence;
  const levelIIITabTriggerClassName =
    "group flex items-center justify-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-all data-[state=active]:border-transparent data-[state=active]:text-slate-950";
  const renderLevelIIITabLabel = (
    label: string,
    options?: {
      tone?: "blue" | "amber" | "emerald" | "violet" | "rose" | "cyan" | "slate";
      alertCount?: number;
    }
  ) => {
    const tone = options?.tone ?? "slate";
    const toneClassName =
      tone === "blue"
        ? "bg-blue-50 hover:bg-blue-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
        : tone === "amber"
          ? "bg-amber-50 hover:bg-amber-100 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950"
          : tone === "emerald"
            ? "bg-emerald-50 hover:bg-emerald-100 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
            : tone === "violet"
              ? "bg-violet-50 hover:bg-violet-100 data-[state=active]:bg-violet-600 data-[state=active]:text-white"
              : tone === "rose"
                ? "bg-rose-50 hover:bg-rose-100 data-[state=active]:bg-rose-600 data-[state=active]:text-white"
                : tone === "cyan"
                  ? "bg-cyan-50 hover:bg-cyan-100 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                  : "bg-slate-50 hover:bg-slate-100 data-[state=active]:bg-slate-700 data-[state=active]:text-white";

    return (
      <span className={`${levelIIITabTriggerClassName} ${toneClassName}`}>
        <span>{label}</span>
        {options?.alertCount && options.alertCount > 0 ? (
          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold leading-none text-white group-data-[state=active]:bg-white/20">
            {options.alertCount}
          </span>
        ) : null}
      </span>
    );
  };
  const filteredPortalComments = useMemo(() => {
    const term = portalRequestSearch.toLowerCase();
    return (portalComments as PortalComment[]).filter((comment) => {
      const searchTarget = [
        comment.subject,
        comment.message,
        comment.requestType,
        comment.status,
        comment.createdByName,
        comment.createdByEmail,
        comment.internalNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchTarget.includes(term);
    });
  }, [portalComments, portalRequestSearch]);
  const portalRequestSummary = useMemo(() => {
    const requests = filteredPortalServiceRequests;
    const comments = filteredPortalComments;
    return {
      requestOpen: requests.filter((request) => !["completed", "closed"].includes(request.status))
        .length,
      requestScheduled: requests.filter((request) => request.status === "scheduled").length,
      commentOpen: comments.filter((comment) => comment.status !== "closed").length,
    };
  }, [filteredPortalComments, filteredPortalServiceRequests]);
  const managingPortalRequestAutomationRules = useMemo(
    () =>
      managingPortalRequest
        ? getPortalRequestDocumentAutomationRules(managingPortalRequest, technicians)
        : [],
    [managingPortalRequest, technicians]
  );
  const assessmentBookingRequests = useMemo(
    () => filteredPortalServiceRequests.filter((request) => isAssessmentPortalRequest(request)),
    [filteredPortalServiceRequests]
  );
  const assessmentBookingRequestSummary = useMemo(() => {
    return assessmentBookingRequests.reduce(
      (summary, request) => {
        const readiness = getAssessmentBookingReadinessSnapshot(request);
        summary.total += 1;
        if (request.status === "scheduled") {
          summary.scheduled += 1;
        }
        if (readiness.state === "ready") {
          summary.ready += 1;
        }
        if (readiness.state === "uploads_needed") {
          summary.uploadGaps += 1;
        }
        if (readiness.state === "guide_setup_needed") {
          summary.guideGaps += 1;
        }
        return summary;
      },
      { total: 0, ready: 0, uploadGaps: 0, guideGaps: 0, scheduled: 0 }
    );
  }, [assessmentBookingRequests]);
  const filteredEquipment = useMemo(
    () =>
      equipment.filter((item) => {
        if (equipmentFilter === "shared") return item.sharedWithMainEquipment;
        if (equipmentFilter === "dedicated") return !item.sharedWithMainEquipment;
        return true;
      }),
    [equipment, equipmentFilter]
  );
  const filteredSpecimens = useMemo(
    () =>
      specimens.filter((item) => {
        if (specimenFilter === "shared") return item.sharedWithMainSpecimens;
        if (specimenFilter === "dedicated") return !item.sharedWithMainSpecimens;
        return true;
      }),
    [specimenFilter, specimens]
  );

  const upcomingVisitReminders = useMemo(
    () =>
      clients
        .filter((client) => client.nextVisit)
        .map((client) => ({
          id: `visit-${client.id}`,
          type: "Client Visit",
          subject: client.companyName,
          detail: `${client.primaryContact} | ${client.visitCadence}`,
          dueDate: client.nextVisit!,
        }))
        .filter((item) => {
          const target = new Date(item.dueDate);
          const today = new Date();
          return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
        }),
    [clients]
  );
  const activityReminders = useMemo<ReminderItem[]>(
    () =>
      activities
        .reduce<ReminderItem[]>((items, activity) => {
          const clientName =
            clients.find((client) => client.id === activity.clientId)?.companyName ??
            "Unlinked Client";
          const dueDate =
            activity.nextActionDate ||
            (activity.status === "Planned" ? activity.activityDate : null);

          if (!dueDate || activity.status === "Cancelled") {
            return items;
          }

          items.push({
            id: `activity-${activity.id}`,
            type: `${activity.activityType} Follow-up`,
            subject: activity.subject,
            detail: `${clientName} | ${activity.status}`,
            dueDate,
          });

          return items;
        }, [])
        .filter((item) => {
          const target = new Date(item.dueDate);
          const today = new Date();
          return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
        }),
    [activities, clients]
  );
  const technicianReminders = useMemo(
    () =>
      technicians.flatMap((technician) => {
        const clientName = clients.find((client) => client.id === technician.clientId)?.companyName ?? "Unlinked Client";
        return [
          getQualificationReviewDate(technician)
            ? {
                id: `qualification-${technician.id}`,
                type: getQualificationReviewLabel(technician),
                subject: technician.name,
                detail: `${clientName} | ${getQualificationTypeLabel(technician)}`,
                dueDate: getQualificationReviewDate(technician)!,
              }
            : null,
          technician.eyeTestValidUntil
            ? {
                id: `eye-${technician.id}`,
                type: "Eye Test",
                subject: technician.name,
                detail: clientName,
                dueDate: technician.eyeTestValidUntil,
              }
            : null,
        ].filter(Boolean) as ReminderItem[];
      }).filter((item) => {
        const target = new Date(item.dueDate);
        const today = new Date();
        return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
      }),
    [clients, technicians]
  );
  const assessmentReminders = useMemo(
    () =>
      assessments
        .filter((assessment) => assessment.nextReviewDate)
        .map((assessment) => {
          const technician = technicians.find((item) => item.id === assessment.technicianId);
          const clientName = technician
            ? clients.find((client) => client.id === technician.clientId)?.companyName ?? "Unlinked Client"
            : "Unlinked Client";

          return {
            id: `assessment-${assessment.id}`,
            type: "Assessment Review",
            subject: technician?.name ?? "Unknown technician",
            detail: `${clientName} | ${formatAssessmentMethodLevelSummary(assessment)}`,
            dueDate: assessment.nextReviewDate!,
          };
        })
        .filter((item) => {
          const target = new Date(item.dueDate);
          const today = new Date();
          return target.getTime() <= today.getTime() + 1000 * 60 * 60 * 24 * 30;
        }),
    [assessments, clients, technicians]
  );
  const reminderItems: ReminderItem[] = [
    ...upcomingVisitReminders,
    ...activityReminders,
    ...technicianReminders,
    ...assessmentReminders,
  ].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const openPortalRequestManagement = (request: PortalServiceRequest) => {
    setManagingPortalRequest(request);
    setIsPortalRequestManagementOpen(true);
  };

  const closePortalRequestManagement = () => {
    setIsPortalRequestManagementOpen(false);
    setManagingPortalRequest(null);
  };

  const advancePortalServiceRequest = async (request: PortalServiceRequest) => {
    const nextStatus = getNextPortalServiceRequestStatus(request.status);
    if (!nextStatus) return;
    if (nextStatus === "scheduled" && isAssessmentPortalRequest(request)) {
      const readiness = getAssessmentBookingReadinessSnapshot(request);
      if (readiness.state !== "ready") {
        toast.error(
          `This assessment booking is not ready to schedule yet: ${getAssessmentBookingBlockingSummary(readiness)}`
        );
        return;
      }
    }
    try {
      await updatePortalServiceRequestStatusMutation.mutateAsync({
        id: request.id,
        clientId: request.clientId,
        branchId: selectedPortalBranchNumber,
        status: nextStatus,
      });
      await utils.clientPortal.services.requestsList.invalidate();
      toast.success(`Request moved to ${nextStatus.replace("_", " ")}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this portal request."
      );
    }
  };

  const convertPortalServiceRequestToActivity = async (request: PortalServiceRequest) => {
    const requestMetadata = normalisePortalServiceRequestMetadata(request.metadata);
    const createdActivity = await createActivityMutation.mutateAsync({
      clientId: request.clientId,
      activityType: getPortalRequestActivityType(request.requestType),
      subject: requestMetadata.plannedAction || request.title,
      activityDate:
        requestMetadata.confirmedDate
          ? new Date(String(requestMetadata.confirmedDate))
          : request.preferredDate
            ? new Date(request.preferredDate)
            : new Date(),
      nextActionDate:
        requestMetadata.confirmedDate
          ? new Date(String(requestMetadata.confirmedDate))
          : request.preferredDate
            ? new Date(request.preferredDate)
            : null,
      status: "Planned",
      notes: [
        request.details ? `Details: ${request.details}` : null,
        request.technicianName ? `Technician: ${request.technicianName}` : null,
        request.branchName ? `Branch: ${request.branchName}` : null,
        request.techniques.length > 0 ? `Techniques: ${request.techniques.join(", ")}` : null,
        requestMetadata.selectedTechniques.length > 0
          ? `Booking techniques: ${requestMetadata.selectedTechniques.join(", ")}`
          : null,
        request.requestedDocuments.length > 0
          ? `Requested documents: ${request.requestedDocuments.join(", ")}`
          : null,
        requestMetadata.readinessCompanyItems.length > 0
          ? `Company must send / upload: ${requestMetadata.readinessCompanyItems.join(", ")}`
          : null,
        requestMetadata.readinessBringItems.length > 0
          ? `Technician must bring: ${requestMetadata.readinessBringItems.join(", ")}`
          : null,
        requestMetadata.matchedGuideTitles.length > 0
          ? `Matched guides: ${requestMetadata.matchedGuideTitles.join(", ")}`
          : null,
        requestMetadata.uncoveredTechniques.length > 0
          ? `Guide gaps: ${requestMetadata.uncoveredTechniques.join(", ")}`
          : null,
        requestMetadata.plannerNotes ? `Planner notes: ${requestMetadata.plannerNotes}` : null,
        requestMetadata.internalOwner ? `Internal owner: ${requestMetadata.internalOwner}` : null,
        requestMetadata.clientVisibleUpdate
          ? `Client update: ${requestMetadata.clientVisibleUpdate}`
          : null,
        request.requestedByName || request.requestedByEmail
          ? `Requested by: ${request.requestedByName || request.requestedByEmail}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (createdActivity?.id) {
      await updatePortalServiceRequestStatusMutation.mutateAsync({
        id: request.id,
        clientId: request.clientId,
        branchId: selectedPortalBranchNumber,
        status:
          request.status === "submitted"
            ? "planned"
            : request.status,
        internalNotes: request.internalNotes ?? null,
        metadata: {
          ...requestMetadata,
          confirmedDate: requestMetadata.confirmedDate
            ? new Date(String(requestMetadata.confirmedDate))
            : request.preferredDate
              ? new Date(String(request.preferredDate))
              : null,
          internalOwner: requestMetadata.internalOwner,
          plannedAction: requestMetadata.plannedAction || createdActivity.subject,
          clientVisibleUpdate:
            requestMetadata.clientVisibleUpdate ||
            `Level III follow-up created: ${createdActivity.subject}`,
          linkedActivityId: createdActivity.id,
        },
      });
      await utils.clientPortal.services.requestsList.invalidate();
    }
    await Promise.all([
      utils.levelIII.activities.list.invalidate(),
      utils.levelIII.clients.list.invalidate(),
    ]);
  };

  const advancePortalComment = async (comment: PortalComment) => {
    const nextStatus = getNextPortalCommentStatus(comment.status);
    if (!nextStatus) return;
    try {
      await updatePortalCommentStatusMutation.mutateAsync({
        id: comment.id,
        clientId: comment.clientId,
        status: nextStatus,
      });
      await utils.clientPortal.comments.list.invalidate();
      toast.success(`Comment moved to ${nextStatus}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update this client comment."
      );
    }
  };

  const convertPortalCommentToActivity = async (comment: PortalComment) => {
    await createActivityMutation.mutateAsync({
      clientId: comment.clientId,
      activityType: getPortalRequestActivityType(
        comment.requestType,
        comment.requestType === "contact_request" ? "Call" : "General"
      ),
      subject: comment.subject,
      activityDate: new Date(),
      nextActionDate: new Date(),
      status: "Planned",
      notes: [
        `Client portal ${getPortalCommentTypeLabel(comment.requestType).toLowerCase()}.`,
        comment.message,
        comment.createdByName || comment.createdByEmail
          ? `Requested by: ${comment.createdByName || comment.createdByEmail}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    await Promise.all([
      utils.levelIII.activities.list.invalidate(),
      utils.levelIII.clients.list.invalidate(),
    ]);
  };

  const portalActionQueue = useMemo<PortalActionQueueItem[]>(() => {
    const requestItems = filteredPortalServiceRequests.flatMap((request) => {
      if (["completed", "closed"].includes(request.status)) return [];

      const readiness = isAssessmentPortalRequest(request)
        ? getAssessmentBookingReadinessSnapshot(request)
        : null;
      const branchLabel = request.branchName || "Client-wide";
      const technicianLabel = request.technicianName || "No technician selected";
      const items: PortalActionQueueItem[] = [];

      if (readiness?.state === "guide_setup_needed" && request.status !== "scheduled") {
        items.push({
          id: `request-${request.id}-guide-gap`,
          kind: "service_request",
          priority: "critical",
          priorityRank: 0,
          title: request.title,
          detail: `Guide coverage missing for ${readiness.uncoveredTechniques.join(", ")} | ${branchLabel} | ${technicianLabel}`,
          status: request.status,
          createdAt: request.createdAt,
          request,
        });
        return items;
      }

      if (readiness?.state === "uploads_needed" && request.status !== "scheduled") {
        items.push({
          id: `request-${request.id}-uploads`,
          kind: "service_request",
          priority: "high",
          priorityRank: 1,
          title: request.title,
          detail: `Waiting for ${readiness.outstandingUploadLabels.length} upload(s): ${readiness.outstandingUploadLabels.join(", ")}`,
          status: request.status,
          createdAt: request.createdAt,
          request,
        });
        return items;
      }

      if (!request.linkedActivity && ["submitted", "in_review", "planned", "scheduled"].includes(request.status)) {
        items.push({
          id: `request-${request.id}-activity-gap`,
          kind: "service_request",
          priority: "high",
          priorityRank: 1,
          title: request.title,
          detail: `No internal Level III activity linked yet | ${branchLabel} | ${technicianLabel}`,
          status: request.status,
          createdAt: request.createdAt,
          request,
        });
        return items;
      }

      if (request.status === "submitted" || request.status === "in_review") {
        items.push({
          id: `request-${request.id}-review`,
          kind: "service_request",
          priority: "normal",
          priorityRank: 2,
          title: request.title,
          detail:
            request.status === "submitted"
              ? `New service request waiting for review | ${branchLabel}`
              : `Service request is waiting for planning | ${branchLabel}`,
          status: request.status,
          createdAt: request.createdAt,
          request,
        });
      }

      return items;
    });

    const commentItems = filteredPortalComments.flatMap((comment) => {
      if (comment.status === "closed") return [];
      return [
        {
          id: `comment-${comment.id}`,
          kind: "comment",
          priority: comment.status === "open" ? "high" : "normal",
          priorityRank: comment.status === "open" ? 1 : 2,
          title: comment.subject,
          detail:
            comment.status === "open"
              ? `${getPortalCommentTypeLabel(comment.requestType)} waiting for acknowledgement`
              : `${getPortalCommentTypeLabel(comment.requestType)} can be closed or converted to an activity`,
          status: comment.status,
          createdAt: comment.createdAt,
          comment,
        } satisfies PortalActionQueueItem,
      ];
    });

    return [...requestItems, ...commentItems].sort((left, right) => {
      if (left.priorityRank !== right.priorityRank) {
        return left.priorityRank - right.priorityRank;
      }
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
  }, [filteredPortalComments, filteredPortalServiceRequests]);

  const portalActionQueueSummary = useMemo(
    () => ({
      total: portalActionQueue.length,
      critical: portalActionQueue.filter((item) => item.priority === "critical").length,
      high: portalActionQueue.filter((item) => item.priority === "high").length,
      normal: portalActionQueue.filter((item) => item.priority === "normal").length,
    }),
    [portalActionQueue]
  );

  const renderPortalRequestActions = (row: PortalServiceRequest) => (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => openPortalRequestManagement(row)}>
        Manage
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void advancePortalServiceRequest(row)}
        disabled={
          updatePortalServiceRequestStatusMutation.isPending || row.status === "closed"
        }
      >
        Advance
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          try {
            await convertPortalServiceRequestToActivity(row);
            toast.success("Level III activity created from request");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Could not create a Level III activity."
            );
          }
        }}
        disabled={createActivityMutation.isPending}
      >
        Create Activity
      </Button>
    </div>
  );

  const activityColumns = createActivityColumns(clients);

  const technicianColumns = createTechnicianColumns({
    clients,
    clientBranchesById,
    primaryTechnicianCertificateByTechnicianId,
    controlledDocumentsByCertificateId,
    approvedControlledDocumentByCertificateId,
  });

  const technicianCertificateColumns = createTechnicianCertificateColumns({
    technicians,
    clients,
    getLevelIIITechnicianName,
    openEvidenceReview,
  });

  const technicianRequirementColumns = createTechnicianRequirementColumns({
    getLevelIIITechnicianName,
    openEvidenceReview,
  });

  const assessmentColumns = createAssessmentColumns(technicians, clients);
  const technicianRequirementDefinitionFields: FormField[] = [
    { name: "name", label: "Document / Requirement Name", type: "text", required: true },
    { name: "category", label: "Category", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    {
      name: "validityMode",
      label: "Validity",
      type: "select",
      required: true,
      options: [
        { value: "days", label: "Expires after set number of days" },
        { value: "na", label: "N/A / No expiry" },
      ],
      helpText: "Choose N/A for documents that do not expire.",
    },
    {
      name: "validityDays",
      label: "Validity Days",
      type: "number",
      helpText: "Set the expiry period here when Validity is set to days.",
      disabled: String(technicianRequirementDefinitionFormValues.validityMode ?? "na") !== "days",
      validation: (value) => {
        if (String(technicianRequirementDefinitionFormValues.validityMode ?? "na") !== "days") {
          return undefined;
        }
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          return "Validity Days must be greater than 0 when expiry is enabled";
        }
        return undefined;
      },
    },
    { name: "reminderDays", label: "Reminder Days", type: "number" },
    { name: "sortOrder", label: "Sort Order", type: "number" },
    { name: "isRequired", label: "Required", type: "checkbox" },
    { name: "active", label: "Active", type: "checkbox" },
  ];

  const activityFields = createActivityFields(clientOptions);
  const specimenFields = createSpecimenFields(specimenTypeOptions);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-primary/10 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.98)_52%,rgba(236,253,245,0.96))] p-6 shadow-[var(--app-shell-shadow)]">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)] xl:items-start">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/75">
                Service Operations
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 lg:text-4xl">Level III Services</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Manage Level III clients, technicians, dedicated service equipment, and service specimens.
              </p>
            </div>
            <div className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70 bg-white/88 shadow-[var(--app-card-shadow)]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-2xl bg-blue-500 p-2.5 text-white shadow-sm">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Clients</p>
                      <p className="text-2xl font-semibold tracking-tight">{clients.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-white/88 shadow-[var(--app-card-shadow)]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-2xl bg-amber-500 p-2.5 text-white shadow-sm">
                      <BellRing className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Due Soon</p>
                      <p className="text-2xl font-semibold tracking-tight">{reminderCount}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-white/88 shadow-[var(--app-card-shadow)]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-2xl bg-emerald-500 p-2.5 text-white shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Technicians</p>
                      <p className="text-2xl font-semibold tracking-tight">{technicians.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-white/88 shadow-[var(--app-card-shadow)]">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="rounded-2xl bg-cyan-500 p-2.5 text-white shadow-sm">
                      <CalendarClock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Activities</p>
                      <p className="text-2xl font-semibold tracking-tight">{activities.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-border/70 bg-white/92 shadow-[var(--app-card-shadow)]">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Gauge className="h-5 w-5 text-primary" />
                      Level III KPI Snapshot
                    </CardTitle>
                    <CardDescription>
                      First operational KPI view for Level III. It uses live certificate, compliance,
                      request, and activity data already captured in this workspace.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">Initial KPI section</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Active Certs
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {levelIIIKpiSummary.activeCertificates}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Approval Queue
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {levelIIIKpiSummary.pendingCertificateApprovals}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Compliance Pressure
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {levelIIIKpiSummary.openCompliancePressure}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Portal Requests
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {levelIIIKpiSummary.portalRequests}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Upload Gaps
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {levelIIIKpiSummary.requestUploadsOutstanding}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Expiring Soon
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {levelIIIKpiSummary.expiringCertificates}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">Current workload shape</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Activities
                        </p>
                        <p className="mt-1 text-lg font-semibold">{levelIIIKpiSummary.activities}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Assessments
                        </p>
                        <p className="mt-1 text-lg font-semibold">{levelIIIKpiSummary.assessments}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Guide Gaps
                        </p>
                        <p className="mt-1 text-lg font-semibold">{levelIIIKpiSummary.requestGuideGaps}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-3 text-sm text-amber-900">
                      <span className="font-semibold">Next action:</span> {levelIIIKpiSummary.nextAction}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">Top client pressure</p>
                    <div className="mt-3 space-y-3">
                      {levelIIIKpiSummary.topClientPressure.length === 0 ? (
                        <div className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                          No cross-technician compliance backlog is active yet.
                        </div>
                      ) : (
                        levelIIIKpiSummary.topClientPressure.map((item) => (
                          <div key={item.clientId} className="rounded-xl border border-border/70 bg-white/80 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-slate-900">{item.clientName}</p>
                              <Badge variant="secondary">{item.openItems} open</Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {item.techniciansAffected} technician
                              {item.techniciansAffected === 1 ? "" : "s"} affected
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Missing {item.missingEvidence} | Review {item.pendingReview} | Expired {item.expired}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as LevelIIITabValue)}
        >
          <TabsList className="grid w-full grid-cols-4 gap-2 rounded-[1.25rem] border border-border/70 bg-white/88 p-2 shadow-[var(--app-card-shadow)] md:grid-cols-8">
            <TabsTrigger value="clients" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Clients", { tone: "blue" })}
            </TabsTrigger>
            <TabsTrigger value="activities" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Activities", { tone: "emerald" })}
            </TabsTrigger>
            <TabsTrigger value="technicians" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Technicians", {
                tone: levelIIIMissingDocumentAlertCount > 0 ? "rose" : "violet",
                alertCount: levelIIIMissingDocumentAlertCount,
              })}
            </TabsTrigger>
            <TabsTrigger value="assessments" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Assessments", { tone: "amber" })}
            </TabsTrigger>
            <TabsTrigger value="portalRequests" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Portal Requests", { tone: "cyan" })}
            </TabsTrigger>
            <TabsTrigger value="equipment" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Equipment", { tone: "slate" })}
            </TabsTrigger>
            <TabsTrigger value="specimens" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Specimens", { tone: "blue" })}
            </TabsTrigger>
            <TabsTrigger value="reminders" className="p-0 shadow-none">
              {renderLevelIIITabLabel("Reminders", { tone: "amber" })}
            </TabsTrigger>
          </TabsList>

          <LevelIIITabPanels data={{
        activeTab,
        clients,
        filteredClients,
        clientsLoading,
        clientColumns,
        clientSearch,
        setClientSearch,
        hiddenLinkedBranchClientCount,
        showLinkedBranchClients,
        toggleShowLinkedBranchClients: () => setShowLinkedBranchClients((current) => !current),
        openClientImport: () => setIsClientImportOpen(true),
        downloadClientImportTemplate,
        exportClientsCsv,
        openAddClient: () => setIsClientFormOpen(true),
        setEditingClient,
        setIsClientFormOpen,
        deleteClientMutation,
        utils,
        toast,
        filteredActivities,
        activitiesLoading,
        activityColumns,
        activitySearch,
        setActivitySearch,
        selectedActivityClientFilter,
        setSelectedActivityClientFilter,
        openAddActivity: () => setIsActivityFormOpen(true),
        setIsActivityFormOpen,
        setEditingActivity,
        setTechnicianCertificateEditorMode,
        setEditingTechnicianCertificate,
        setTechnicianCertificateForm,
        createEmptyTechnicianCertificateForm,
        setIsTechnicianCertificateFormOpen,
        setEditingAssessment,
        setIsAssessmentFormOpen,
        deleteActivityMutation,
        filteredAssessments,
        assessmentsLoading,
        assessmentColumns,
        assessmentSearch,
        setAssessmentSearch,
        selectedAssessmentClientFilter,
        setSelectedAssessmentClientFilter,
        technicians,
        deleteAssessmentMutation,
        filteredEquipment,
        equipmentLoading,
        equipmentColumns,
        equipmentFilter,
        setEquipmentFilter,
        openEquipmentImport: () => setIsEquipmentImportOpen(true),
        downloadEquipmentImportTemplate,
        exportEquipmentCsv,
        openAddEquipment: () => setIsEquipmentFormOpen(true),
        setIsEquipmentFormOpen,
        setEditingEquipment,
        deleteEquipmentMutation,
        filteredSpecimens,
        specimensLoading,
        specimenColumns,
        specimenFilter,
        setSpecimenFilter,
        openSpecimenImport: () => setIsSpecimenImportOpen(true),
        downloadSpecimenImportTemplate,
        exportSpecimensCsv,
        openAddSpecimen: () => setIsSpecimenFormOpen(true),
        setIsSpecimenFormOpen,
        setEditingSpecimen,
        deleteSpecimenMutation,
        reminderItems,
        getDueBadge,
        getAssessmentMethodLevels,

        filteredTechnicians,
        filteredTechnicianCertificates,
        setIsTechnicianImportOpen,
        downloadTechnicianImportTemplate,
        exportTechniciansCsv,
        exportTechnicianCertificatesCsv,
        openNewTechnicianCertificateForm,
        openTechnicianForm,
        setIsTechnicianFormOpen,
        levelIIIRolloutReadinessSummary,
        technicianIntakeQueueSummary,
        setSelectedComplianceTechnicianId,
        setEditingTechnician,
        recentHandledCrossTechnicianBulkQueueEntries,
        filteredCrossTechnicianBulkQueueItems,
        exportCrossTechnicianQueueCsv,
        setHandledTechnicianDocumentQueueEntries,
        technicianQueueFilterOptions,
        selectedTechnicianQueueFilter,
        setSelectedTechnicianQueueFilter,
        crossTechnicianQueueSessionScopeLabel,
        selectedCrossTechnicianQueueSignatures,
        crossTechnicianQueueSessionCompletedCount,
        selectedCrossTechnicianQueueItems,
        hiddenCrossTechnicianQueueSelectionCount,
        crossTechnicianQueueSessionUpdatedAt,
        crossTechnicianQueueLastStartedItem,
        autoHandleCrossTechnicianQueueSessionItems,
        setAutoHandleCrossTechnicianQueueSessionItems,
        allVisibleCrossTechnicianQueueSelected,
        clearVisibleCrossTechnicianQueueItems,
        selectVisibleCrossTechnicianQueueItems,
        visibleCrossTechnicianQueueSignatures,
        addVisibleCrossTechnicianQueueItemsToSession,
        replaceCrossTechnicianQueueSessionWithVisible,
        restoreLastStartedCrossTechnicianQueueItem,
        clearCrossTechnicianQueueSession,
        runNextSelectedCrossTechnicianQueueAction,
        markSelectedCrossTechnicianQueueItemsHandled,
        exportSelectedCrossTechnicianQueueCsv,
        crossTechnicianQueueSessionCompletionPercent,
        crossTechnicianQueueSessionPeakCount,
        crossTechnicianQueueSessionVisibleSummary,
        crossTechnicianQueueSessionFocusOptions,
        nextCrossTechnicianQueueSessionItem,
        startCrossTechnicianQueueSessionItem,
        openTechnicianComplianceWorkspace,
        nextCrossTechnicianQueueSessionTechnician,
        openNextTechnicianComplianceQueueItem,
        nextCrossTechnicianQueueSessionClient,
        openNextClientComplianceQueueItem,
        openClientComplianceBacklog,
        clientComplianceBacklogSummary,
        exportClientComplianceBacklogCsv,
        technicianComplianceBacklogSummary,
        exportTechnicianComplianceBacklogCsv,
        crossTechnicianQueueSearch,
        setCrossTechnicianQueueSearch,
        showSavedSessionQueueOnly,
        setShowSavedSessionQueueOnly,
        searchedCrossTechnicianBulkQueueItems,
        crossTechnicianQueuePage,
        crossTechnicianQueueTotalPages,
        pagedCrossTechnicianBulkQueueItems,
        buildTechnicianDocumentQueueItemSignature,
        toggleCrossTechnicianQueueItemSelection,
        getRequirementStatusBadge,
        markTechnicianDocumentQueueItemHandled,
        crossTechnicianQueuePageSize,
        setCrossTechnicianQueuePage,
        restoreHandledTechnicianDocumentQueueEntry,
        levelIIIDocumentGenerationSummary,
        levelIIIDocumentGenerationFilterOptions,
        selectedDocumentGenerationFilter,
        setSelectedDocumentGenerationFilter,
        filteredLevelIIIDocumentGenerationItems,
        levelIIICertificateReleaseQueueItems,
        levelIIICertificateReleaseQueueSummary,
        primaryFilteredDocumentGenerationItem,
        batchDocumentGenerationActionLabel,
        batchDocumentGenerationCandidates,
        documentGenerationBatchAction,
        runDocumentGenerationBatchAction,
        runCertificateReleaseBatchAction,
        openCertificateSignOffDialog,
        createControlledLevelIIICertificateDocument,
        submitControlledLevelIIICertificateDocumentForReview,
        selectedTechnicianDocumentGenerationItem,
        setSelectedCertificateHistory,
        markDocumentGenerationItemHandled,
        recentHandledDocumentGenerationEntries,
        clearHandledDocumentGenerationHistory,
        restoreHandledDocumentGenerationEntry,
        getCertificateApprovalBadge,
        getCertificateStatusBadge,
        handlePreviewLevelIIICertificate,
        openControlledLevelIIICertificateDecision,
        getLevelIIICertificateDocumentOptions,
        exportEditableHtmlDocument,
        recordLevelIIICertificateExport,
        getLevelIIICertificatePdfOptions,
        exportStructuredPdfDocument,
        openLevelIIIDocumentRecord,
        technicianSearch,
        setTechnicianSearch,
        selectedClientFilter,
        handleTechnicianClientFilterChange,
        activeLevelIIIDocumentSetupClient,
        activeLevelIIIDocumentSetupClientId,
        setEditingTechnicianRequirementDefinition,
        setIsTechnicianRequirementDefinitionFormOpen,
        selectedComplianceTechnician,
        levelIIIDocumentTypeSummary,
        levelIIIRequirementDefinitions,
        technicianRequirementDefinitionColumns,
        getQualificationTypeLabel,
        formatMethods,
        getTechnicianMethods,
        technicianComplianceSectionRef,
        visibleTechnicianClients,
        technicianDirectorySummary,
        technicianDirectoryView,
        setTechnicianDirectoryView,
        latestTechnicianCertificateByTechnicianId,
        formatCertificateValidityRule,
        getQualificationReviewDate,
        getQualificationReviewLabel,
        formatTechnicianLevels,
        summariseTechnicianLevels,
        getTechnicianMethodQualifications,
        techniciansLoading,
        technicianColumns,
        deleteTechnicianMutation,
        lastCertificateWorkflowNotice,
        setSelectedCertificateQueueFilter,
        selectedCertificateQueueFilter,
        certificateQueueSummary,
        certificateLifecycleSummary,
        getLevelIIITechnicianName,
        formatExportDate,
        technicianCertificateColumns,
        technicianCertificatesLoading,
        openCertificateStorageLinker,
        deleteTechnicianCertificateMutation,
        clearHandledTechnicianDocumentQueueHistory,
        complianceMatrixLoading,
        filteredSelectedTechnicianBulkQueueItems,
        formatLevelIIICategoryLabel,
        nextCertificateLinkedRequirement,
        nextExpiredRequirement,
        nextMissingEvidenceRequirement,
        nextPendingReviewRequirement,
        openEvidenceReview,
        openTechnicianComplianceRecord,
        openTechnicianDirectUploadDialog,
        openTechnicianRequirementUploadFromRow,
        recentHandledSelectedTechnicianBulkQueueEntries,
        availableTechnicianDirectUploadRules,
        selectedTechnicianDocumentControlSummary,
        selectedTechnicianDocumentPackGuide,
        selectedTechnicianPendingReviewRows,
        selectedTechnicianRequirementSummary,
        selectedTechnicianRequirementTableRows,
        setEditingTechnicianRequirement,
        setIsTechnicianRequirementFormOpen,
        technicianRequirementColumns,
        setTechnicianCertificateFileLinkSuggestion,

        assessmentBookingRequestSummary,
        assessmentBookingRequests,
        convertPortalCommentToActivity,
        convertPortalServiceRequestToActivity,
        createActivityPending: createActivityMutation.isPending,
        filteredPortalComments,
        filteredPortalServiceRequests,
        getPortalActionQueuePriorityBadge,
        getPortalCommentStatusBadge,
        getPortalServiceRequestStatusBadge,
        openPortalRequestManagement,
        portalActionQueue,
        portalActionQueueSummary,
        portalAssessmentBookingColumns,
        portalCommentColumns,
        portalCommentsLoading,
        portalRequestSummary,
        portalRequestSearch,
        portalServiceRequestColumns,
        portalServiceRequestsLoading,
        renderPortalRequestActions,
        selectedPortalBranchFilter,
        selectedPortalBranchOptions,
        selectedPortalClientFilter,
        setPortalRequestSearch,
        setSelectedPortalBranchFilter,
        setSelectedPortalClientFilter,
        advancePortalComment,
        advancePortalServiceRequest,
        updatePortalCommentStatusPending: updatePortalCommentStatusMutation.isPending,
        updatePortalServiceRequestStatusPending: updatePortalServiceRequestStatusMutation.isPending,
      }} />

        </Tabs>
      </div>

      <LevelIIIDialogs data={{
        isPortalRequestManagementOpen,
        setIsPortalRequestManagementOpen,
        managingPortalRequest,
        setManagingPortalRequest,
        portalRequestManagementFields,
        getDateInputValue,
        normalisePortalServiceRequestMetadata,
        isLoading: updatePortalServiceRequestStatusMutation.isPending || createActivityMutation.isPending || generatePortalRequestPackMutation.isPending,
        updatePortalServiceRequestStatusPending: updatePortalServiceRequestStatusMutation.isPending,
        createActivityPending: createActivityMutation.isPending,
        generatePortalRequestPackPending: generatePortalRequestPackMutation.isPending,
        selectedPortalClientNumber,
        selectedPortalBranchNumber,
        convertPortalServiceRequestToActivity,
        closePortalRequestManagement,
        handleGenerateDraftPack: handleGeneratePortalRequestDraftPack,
        managingPortalRequestAutomationRules,
        getAssessmentBookingReadinessSnapshot,
        getAssessmentBookingReadinessBadge,
        getAssessmentBookingBlockingSummary,
        openEvidenceReview,
        onSubmit: handleSubmitPortalRequestManagementForm,

        editingClient,
        isClientFormOpen,
        setIsClientFormOpen,
        setEditingClient,
        clientFields,
        clientPending: createClientMutation.isPending || updateClientMutation.isPending,
        onSubmitClient: handleSubmitClientForm,
        editingActivity,
        isActivityFormOpen,
        setIsActivityFormOpen,
        setEditingActivity,
        activityFields,
        activityPending: createActivityMutation.isPending || updateActivityMutation.isPending,
        onSubmitActivity: handleSubmitActivityForm,

        openTechnicianForm,
        isTechnicianFormOpen,
        setIsTechnicianFormOpen,
        editingTechnician,
        setEditingTechnician,
        technicianForm,
        setTechnicianForm,
        createEmptyTechnicianForm,
        clientOptions,
        selectedClientBranchOptions,
        technicianMethodOptions,
        technicianHistoryLoading,
        technicianHistory: technicianHistory as AuditTrailEntry[],
        technicianPending: createTechnicianMutation.isPending || updateTechnicianMutation.isPending,
        onSubmitTechnician: handleSubmitTechnicianForm,

        isTechnicianCertificateFormOpen,
        technicianCertificateEditorMode,
        setIsTechnicianCertificateFormOpen,
        setTechnicianCertificateEditorMode,
        editingTechnicianCertificate,
        setEditingTechnicianCertificate,
        technicianCertificateFileLinkSuggestion,
        setTechnicianCertificateFileLinkSuggestion,
        technicianCertificateForm,
        setTechnicianCertificateForm,
        createEmptyTechnicianCertificateForm,
        technicians,
        technicianOptions,
        selectedCertificateAssessmentOptions,
        getTechnicianMethodQualifications,
        getAssessmentMethodLevels,
        formatAssessmentMethodLevelSummary,
        certificateMutationPending: createTechnicianCertificateMutation.isPending || updateTechnicianCertificateMutation.isPending,
        handleTechnicianCertificateFileChange,
        certificateWorkflowPreview,
        certificateIssuanceImpactPreview,
        getCertificateApprovalBadge,
        technicianCertificateAuditTrailLoading,
        technicianCertificateAuditTrail: technicianCertificateAuditTrail as AuditTrailEntry[],
        availableCertificateMethods,
        selectedCertificateTechnician,
        getTechnicianLevelForMethod,
        onSubmitCertificate: handleSubmitTechnicianCertificateForm,
        isAssessmentFormOpen,
        setIsAssessmentFormOpen,
        editingAssessment,
        setEditingAssessment,
        assessmentForm,
        setAssessmentForm,
        createEmptyAssessmentForm,
        methodOptions,
        getTechnicianMethods,
        assessmentMutationPending: createAssessmentMutation.isPending || updateAssessmentMutation.isPending,
        assessmentResultOptions,
        availableAssessmentMethods,
        selectedAssessmentTechnician,
        onSubmitAssessment: handleSubmitAssessmentForm,

        selectedEvidenceReview,
        setSelectedEvidenceReview,
        shouldLoadSelectedEvidencePreview,
        setShouldLoadSelectedEvidencePreview,
        selectedEvidencePreviewUrl,
        selectedEvidencePreviewContentType,
        selectedEvidencePreviewError,
        isSelectedEvidencePreviewLoading,
        getLevelIIIEvidencePreviewKind,
        approvedControlledDocumentByCertificateId,
        openLevelIIIDocumentRecord,
        setSelectedCertificateHistory,
        openCertificateSignOffDialog,
        openTechnicianComplianceRecord,
        openPortalRequestManagement,
        copySelectedEvidenceReference,
        downloadSelectedEvidenceFile,
        openSelectedEvidenceFile,
        pendingControlledDocumentDecision,
        closeControlledLevelIIICertificateDecision,
        controlledDocumentDecisionNote,
        setControlledDocumentDecisionNote,
        approveControlledDocumentPending: approveControlledDocumentMutation.isPending,
        rejectControlledDocumentPending: rejectControlledDocumentMutation.isPending,
        confirmControlledLevelIIICertificateDecision,
        pendingCertificateSignOff,
        closeCertificateSignOffDialog,
        getLevelIIITechnicianName,
        certificateSignOffNote,
        setCertificateSignOffNote,
        signOffTechnicianCertificatePending: signOffTechnicianCertificateMutation.isPending,
        handleSignOffLevelIIICertificate,
        selectedCertificateHistory,
        selectedCertificateAuditTrailLoading,
        selectedCertificateAuditTrail: selectedCertificateAuditTrail as AuditTrailEntry[],
        technicianCertificateHistoryLoading,
        technicianCertificateHistory: technicianCertificateHistory as LevelIIITechnicianCertificateExportHistoryItem[],
        handleReplayLevelIIICertificateExport,
        isTechnicianDirectUploadOpen,
        setIsTechnicianDirectUploadOpen,
        technicianDirectUploadFormValues,
        setTechnicianDirectUploadFormValues,
        createEmptyTechnicianDirectUploadForm,
        handleTechnicianDirectUploadRuleChange,
        selectedTechnicianDocumentPackGuide,
        availableTechnicianDirectUploadRules,
        createTechnicianRequirementDefinitionPending: createTechnicianRequirementDefinitionMutation.isPending,
        upsertTechnicianRequirementPending: upsertTechnicianRequirementMutation.isPending,
        uploadTechnicianRequirementDocumentPending: uploadTechnicianRequirementDocumentMutation.isPending,
        selectedDirectUploadDefinition,
        handleTechnicianDirectUploadFileChange,
        selectedComplianceTechnician,
        selectedDirectUploadRule,
        handleSubmitTechnicianDirectUpload,

        isTechnicianRequirementDefinitionFormOpen,
        setIsTechnicianRequirementDefinitionFormOpen,
        editingTechnicianRequirementDefinition,
        setEditingTechnicianRequirementDefinition,
        technicianRequirementDefinitionFields,
        createEmptyLevelIIIDocumentDefinitionForm,
        technicianRequirementDefinitionFormValues,
        setTechnicianRequirementDefinitionFormValues,
        technicianRequirementDefinitionPending: createTechnicianRequirementDefinitionMutation.isPending || updateTechnicianRequirementDefinitionMutation.isPending,
        onSubmitDefinition: handleSubmitTechnicianRequirementDefinitionForm,
        isTechnicianRequirementFormOpen,
        setIsTechnicianRequirementFormOpen,
        editingTechnicianRequirement,
        setEditingTechnicianRequirement,
        createEmptyTechnicianRequirementForm,
        technicianRequirementFormValues,
        setTechnicianRequirementFormValues,
        technicianRequirementPending: upsertTechnicianRequirementMutation.isPending || uploadTechnicianRequirementDocumentMutation.isPending,
        levelIIIRequirementDefinitions,
        buildRequirementCustomRecordFields,
        activeTechnicianRequirementDefinition,
        getRequirementStatusBadge,
        openEditingRequirementEvidence: () => {
          const requirement = editingTechnicianRequirement;
          if (!requirement?.latestDocumentUrl) return;
          setIsTechnicianRequirementFormOpen(false);
          setEditingTechnicianRequirement(null);
          openEvidenceReview({
            source: "requirement",
            title: requirement.latestDocumentName || requirement.definitionName,
            description: `${requirement.definitionName} | ${getLevelIIITechnicianName(requirement.technicianId)}`,
            fileName: requirement.latestDocumentName,
            fileUrl: requirement.latestDocumentUrl ?? "",
            sourceReference: requirement.latestSourceReferencePath ?? null,
            requirement,
            badges: [
              {
                key: "status",
                label: formatLevelIIIStatusLabel(requirement.status),
                variant: requirement.status === "expired" ? "destructive" : requirement.status === "pending_review" ? "outline" : "secondary",
              },
            ],
          });
        },
        getRequirementCustomFieldSummary,
        onSubmitRequirement: handleSubmitTechnicianRequirementForm,

        isClientImportOpen,
        setIsClientImportOpen,
        handleClientImport,
        isTechnicianImportOpen,
        setIsTechnicianImportOpen,
        handleTechnicianImport,
        isEquipmentImportOpen,
        setIsEquipmentImportOpen,
        handleEquipmentImport,
        isSpecimenImportOpen,
        setIsSpecimenImportOpen,
        handleSpecimenImport,

        editingEquipment,
        isEquipmentFormOpen,
        setIsEquipmentFormOpen,
        setEditingEquipment,
        equipmentFields,
        equipmentPending: createEquipmentMutation.isPending || updateEquipmentMutation.isPending,
        onSubmitEquipment: handleSubmitEquipmentForm,
        editingSpecimen,
        isSpecimenFormOpen,
        setIsSpecimenFormOpen,
        setEditingSpecimen,
        specimenFields,
        specimenPending: createSpecimenMutation.isPending || updateSpecimenMutation.isPending,
        onSubmitSpecimen: handleSubmitSpecimenForm,
      }} />
    </DashboardLayout>
  );
}
