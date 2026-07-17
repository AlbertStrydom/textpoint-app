import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportTableToCSV, exportTableToPDF } from "@/lib/exportUtils";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Edit2,
  FileJson,
  History,
  Lock,
  Plus,
  RefreshCw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getDefaultMethodColor, suggestMethodColor } from "@shared/methodColors";
import type {
  AccessAuditClientAssignment,
  AccessAuditClientGapRow,
  AccessAuditClientMatrixRow,
  AccessAuditBranchCoverageRow,
  AccessAuditBranchCoverageQueueRow,
  AccessAuditBranchScopeRow,
  AccessAuditBranchScopeQueueRow,
  AccessAuditQueueRow,
  AccessAuditRemediationRow,
  AccessAuditRolloutRow,
  AccessAuditRow,
  AccessGoLiveGate,
  AccessLaunchPhaseRow,
  AccessLaunchPhaseTaskRow,
  AccessLaunchQueueRow,
  AccessLaunchSignOffState,
  AppUser,
  AuditTrailItem,
  AuditTrailResponse,
  BackupPreview,
  BackupPreviewStatus,
  BackupRestoreApplyResult,
  BackupRestoreHistoryItem,
  BackupRestorePlan,
  BackupRestorePlanStatus,
  BackupRestorePreflight,
  Branch,
  HealthStatus,
  LevelIIICertificateQueueFilterLink,
  LevelIIICertificateQueueHealth,
  LevelIIICertificateReminderRecord,
  Method,
  ModulePermission,
  OperationalReadinessIssue,
  OperationalReadinessSeverity,
  OperationalReadinessSnapshot,
  ProductionChecklistRow,
  ProductionLaunchSignOffState,
  ProductionReadinessIssue,
  ProductionRolloutPhaseRow,
  ProductionRolloutQueueRow,
  ReminderRunHistoryItem,
  RestoreMode,
  RoleSummary,
  SchemaReadiness,
  SchemaRepairApplyResult,
  SpecimenType,
  SystemDiagnostics,
  TransferPackPreview,
  TransferReadinessPack,
} from "./adminTypes";
import {
  auditTrailExportColumns,
  BACKUP_TABLE_LABELS,
  buildAccessGoLiveVerdict,
  buildAccessLaunchSignOffSummary,
  buildAccessRolloutSupportSummary,
  buildAuditTrailExportRows,
  buildBackupPreview,
  buildHealthExportRows,
  buildHealthSupportSummary,
  buildLevelIIICertificateQueueHealth,
  buildOperationalReadinessExportRows,
  buildOperationalReadinessSupportSummary,
  buildProductionLaunchSignOffSummary,
  buildRestoreHistoryExportRows,
  buildSchemaReadinessExportRows,
  buildTransferPackPreview,
  downloadJsonFile,
  downloadTextFile,
  EXPECTED_BACKUP_TABLE_KEYS,
  getBackupPreviewHealthStatus,
  getBackupPreviewLabel,
  getBackupRestorePlanHealthStatus,
  getBackupRestorePlanLabel,
  getDaysUntil,
  getHealthBadgeClass,
  getHealthIcon,
  getHealthLabel,
  getMaintenanceHistoryNotes,
  getMaintenanceHistoryRowCount,
  getMaintenanceHistoryScope,
  getMaintenanceHistoryTableCount,
  getReadinessSeverityClass,
  getReadinessSeverityLabel,
  getReminderRunActionTarget,
  getReminderRunDetailText,
  getReminderRunNotificationCount,
  getReminderRunTriggerSource,
  getRestoreActivityLabel,
  getRestoreActivityStatus,
  getRestoreModeLabel,
  getSaveErrorMessage,
  getTransferPackPreviewLabel,
  healthExportColumns,
  isRecord,
  LEVEL_III_CERTIFICATE_EXPIRY_REMINDER_DAYS,
  LEVEL_III_CERTIFICATE_REVIEW_REMINDER_DAYS,
  MODULE_LABELS,
  operationalReadinessExportColumns,
  readOptionalNumber,
  readOptionalString,
  restoreHistoryExportColumns,
  SCHEMA_REPAIR_CONFIRMATION_PHRASE,
  schemaReadinessExportColumns,
} from "./adminUtils";

export default function AdminPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);
  const transferPackFileInputRef = useRef<HTMLInputElement | null>(null);
  const accessLaunchSignOffRef = useRef<HTMLDivElement | null>(null);
  const rolloutGateRef = useRef<HTMLDivElement | null>(null);
  const operationalReadinessRef = useRef<HTMLDivElement | null>(null);
  const diagnosticsRef = useRef<HTMLDivElement | null>(null);
  const productionLaunchSignOffRef = useRef<HTMLDivElement | null>(null);
  const accessLaunchStorageKey = `textpoint-admin-access-launch-signoff:${user?.id ?? "anonymous"}`;
  const productionLaunchStorageKey = `textpoint-admin-production-launch-signoff:${user?.id ?? "anonymous"}`;
  const [activeTab, setActiveTab] = useState("users");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isBranchFormOpen, setIsBranchFormOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<AppUser | null>(null);
  const [permissionState, setPermissionState] = useState<Record<string, ModulePermission>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSpecimenTypeFormOpen, setIsSpecimenTypeFormOpen] = useState(false);
  const [isMethodFormOpen, setIsMethodFormOpen] = useState(false);
  const [permissionSeedUserId, setPermissionSeedUserId] = useState<number | null>(null);
  const [editingSpecimenType, setEditingSpecimenType] = useState<SpecimenType | null>(null);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [backupPreviewError, setBackupPreviewError] = useState<string | null>(null);
  const [backupRestorePayload, setBackupRestorePayload] = useState<unknown | null>(null);
  const [transferPackPreview, setTransferPackPreview] = useState<TransferPackPreview | null>(null);
  const [transferPackPreviewError, setTransferPackPreviewError] = useState<string | null>(null);
  const [selectedRestoreTables, setSelectedRestoreTables] = useState<string[]>([]);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("merge");
  const [restorePlan, setRestorePlan] = useState<BackupRestorePlan | null>(null);
  const [restorePreflight, setRestorePreflight] = useState<BackupRestorePreflight | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [restoreApplyResult, setRestoreApplyResult] = useState<BackupRestoreApplyResult | null>(null);
  const [schemaRepairConfirmation, setSchemaRepairConfirmation] = useState("");
  const [schemaRepairApplyResult, setSchemaRepairApplyResult] = useState<SchemaRepairApplyResult | null>(null);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [auditUserFilter, setAuditUserFilter] = useState("all");
  const [auditStartDate, setAuditStartDate] = useState("");
  const [auditEndDate, setAuditEndDate] = useState("");
  const [auditLimit, setAuditLimit] = useState("100");
  const [readinessBranchFilter, setReadinessBranchFilter] = useState("all");
  const [readinessSeverityFilter, setReadinessSeverityFilter] = useState("all");
  const [readinessAreaFilter, setReadinessAreaFilter] = useState("all");
  const [creatingQualityActionIssueId, setCreatingQualityActionIssueId] = useState<string | null>(null);
  const [accessAuditFocus, setAccessAuditFocus] = useState<
    "all" | "flagged" | "suspended" | "password_pending" | "never_signed_in"
  >("all");
  const [accessAuditClientFilter, setAccessAuditClientFilter] = useState("all");
  const [accessPasswordTarget, setAccessPasswordTarget] = useState<AccessAuditRow | null>(null);
  const [accessPasswordError, setAccessPasswordError] = useState<string | null>(null);
  const [accessLaunchQueueFilter, setAccessLaunchQueueFilter] = useState<
    "all" | "blocked" | "review" | "client" | "signoff"
  >("all");
  const [accessLaunchSignOff, setAccessLaunchSignOff] = useState<AccessLaunchSignOffState>(() => {
    if (typeof window === "undefined") {
      return {
        auditReviewed: false,
        blockedClientsCleared: false,
        reviewClientsChecked: false,
        branchCoverageVerified: false,
        onboardingBacklogAccepted: false,
      };
    }

    try {
      const raw = window.localStorage.getItem(`textpoint-admin-access-launch-signoff:anonymous`);
      if (!raw) {
        return {
          auditReviewed: false,
          blockedClientsCleared: false,
          reviewClientsChecked: false,
          branchCoverageVerified: false,
          onboardingBacklogAccepted: false,
        };
      }

      const parsed = JSON.parse(raw) as Partial<AccessLaunchSignOffState>;
      return {
        auditReviewed: Boolean(parsed.auditReviewed),
        blockedClientsCleared: Boolean(parsed.blockedClientsCleared),
        reviewClientsChecked: Boolean(parsed.reviewClientsChecked),
        branchCoverageVerified: Boolean(parsed.branchCoverageVerified),
        onboardingBacklogAccepted: Boolean(parsed.onboardingBacklogAccepted),
      };
    } catch {
      return {
        auditReviewed: false,
        blockedClientsCleared: false,
        reviewClientsChecked: false,
        branchCoverageVerified: false,
        onboardingBacklogAccepted: false,
      };
    }
  });
  const [productionLaunchSignOff, setProductionLaunchSignOff] = useState<ProductionLaunchSignOffState>(() => {
    if (typeof window === "undefined") {
      return {
        healthReviewed: false,
        backupRestoreReviewed: false,
        pilotScopeConfirmed: false,
        accessRolloutConfirmed: false,
        releaseConfigConfirmed: false,
      };
    }

    try {
      const raw = window.localStorage.getItem(`textpoint-admin-production-launch-signoff:anonymous`);
      if (!raw) {
        return {
          healthReviewed: false,
          backupRestoreReviewed: false,
          pilotScopeConfirmed: false,
          accessRolloutConfirmed: false,
          releaseConfigConfirmed: false,
        };
      }

      const parsed = JSON.parse(raw) as Partial<ProductionLaunchSignOffState>;
      return {
        healthReviewed: Boolean(parsed.healthReviewed),
        backupRestoreReviewed: Boolean(parsed.backupRestoreReviewed),
        pilotScopeConfirmed: Boolean(parsed.pilotScopeConfirmed),
        accessRolloutConfirmed: Boolean(parsed.accessRolloutConfirmed),
        releaseConfigConfirmed: Boolean(parsed.releaseConfigConfirmed),
      };
    } catch {
      return {
        healthReviewed: false,
        backupRestoreReviewed: false,
        pilotScopeConfirmed: false,
        accessRolloutConfirmed: false,
        releaseConfigConfirmed: false,
      };
    }
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = trpc.access.users.list.useQuery();
  const {
    data: accessAuditRows = [],
    isLoading: accessAuditLoading,
    refetch: refetchAccessAudit,
  } = trpc.access.auditDashboard.useQuery(undefined, {
    enabled: activeTab === "access" && ["admin", "super_admin"].includes(user?.role ?? "user"),
    refetchOnWindowFocus: false,
  });
  const {
    data: accessBranchCoverageRows = [],
    isLoading: accessBranchCoverageLoading,
    refetch: refetchAccessBranchCoverage,
  } = trpc.access.auditBranchCoverage.useQuery(undefined, {
    enabled: activeTab === "access" && ["admin", "super_admin"].includes(user?.role ?? "user"),
    refetchOnWindowFocus: false,
  });
  const { data: roles = [], isLoading: rolesLoading } = trpc.access.roles.list.useQuery();
  const { data: branches = [], isLoading: branchesLoading, refetch: refetchBranches } = trpc.branches.list.useQuery();
  const { data: specimenTypes = [], refetch: refetchSpecimenTypes } = trpc.specimens.types.useQuery();
  const { data: methods = [], refetch: refetchMethods } = trpc.lecturers.methods.useQuery();
  const { data: moduleList = [] } = trpc.access.permissions.listModules.useQuery();
  const {
    data: diagnostics,
    error: diagnosticsError,
    isFetching: diagnosticsLoading,
    refetch: refetchDiagnostics,
  } = trpc.system.diagnostics.useQuery(undefined, {
    enabled: activeTab === "health",
    refetchOnWindowFocus: false,
  });
  const operationalReadinessInput = useMemo(
    () => ({
      branchId:
        readinessBranchFilter === "all" ? null : Number(readinessBranchFilter),
    }),
    [readinessBranchFilter]
  );
  const {
    data: operationalReadiness,
    isFetching: operationalReadinessLoading,
    refetch: refetchOperationalReadiness,
  } = trpc.system.operationalReadiness.useQuery(operationalReadinessInput, {
    enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
    refetchOnWindowFocus: false,
  });
  const { data: levelIIITechnicianCertificates = [] } =
    trpc.levelIII.technicianCertificates.list.useQuery(undefined, {
      enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
      refetchOnWindowFocus: false,
    });
  const {
    data: restoreHistory = [],
    isFetching: restoreHistoryLoading,
    refetch: refetchRestoreHistory,
  } = trpc.system.backupRestoreHistory.useQuery(
    { limit: 25 },
    {
      enabled: activeTab === "health" && user?.role === "super_admin",
      refetchOnWindowFocus: false,
    }
  );
  const auditTrailInput = useMemo(
    () => ({
      search: auditSearch.trim() || undefined,
      action: auditActionFilter === "all" ? undefined : auditActionFilter,
      entityType: auditEntityFilter === "all" ? undefined : auditEntityFilter,
      status:
        auditStatusFilter === "all"
          ? undefined
          : (auditStatusFilter as "Success" | "Failed"),
      userId: auditUserFilter === "all" ? undefined : Number(auditUserFilter),
      startDate: auditStartDate || undefined,
      endDate: auditEndDate || undefined,
      limit: Number(auditLimit) || 100,
    }),
    [
      auditActionFilter,
      auditEndDate,
      auditEntityFilter,
      auditLimit,
      auditSearch,
      auditStartDate,
      auditStatusFilter,
      auditUserFilter,
    ]
  );
  const {
    data: auditTrailData,
    isFetching: auditTrailLoading,
    refetch: refetchAuditTrail,
  } = trpc.audit.trail.useQuery(auditTrailInput, {
    enabled: activeTab === "audit" && ["admin", "super_admin"].includes(user?.role ?? "user"),
    refetchOnWindowFocus: false,
  });
  const {
    data: levelIIIReminderRunHistoryData,
    isFetching: levelIIIReminderRunHistoryLoading,
    refetch: refetchLevelIIIReminderRunHistory,
  } = trpc.audit.trail.useQuery(
    {
      action: "UPDATE",
      entityType: "levelIII_certificate_reminder_sweep",
      limit: 8,
    },
    {
      enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
      refetchOnWindowFocus: false,
    }
  );
  const {
    data: qualityReminderRunHistoryData,
    isFetching: qualityReminderRunHistoryLoading,
    refetch: refetchQualityReminderRunHistory,
  } = trpc.audit.trail.useQuery(
    {
      action: "UPDATE",
      entityType: "quality_reminder_sweep",
      limit: 5,
    },
    {
      enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
      refetchOnWindowFocus: false,
    }
  );
  const {
    data: clientPortalReminderRunHistoryData,
    isFetching: clientPortalReminderRunHistoryLoading,
    refetch: refetchClientPortalReminderRunHistory,
  } = trpc.audit.trail.useQuery(
    {
      action: "UPDATE",
      entityType: "client_portal_reminder_sweep",
      limit: 5,
    },
    {
      enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
      refetchOnWindowFocus: false,
    }
  );
  const {
    data: levelIIIDocumentReminderRunHistoryData,
    isFetching: levelIIIDocumentReminderRunHistoryLoading,
    refetch: refetchLevelIIIDocumentReminderRunHistory,
  } = trpc.audit.trail.useQuery(
    {
      action: "UPDATE",
      entityType: "levelIII_document_review_reminder_sweep",
      limit: 5,
    },
    {
      enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
      refetchOnWindowFocus: false,
    }
  );
  const {
    data: plannerReminderRunHistoryData,
    isFetching: plannerReminderRunHistoryLoading,
    refetch: refetchPlannerReminderRunHistory,
  } = trpc.audit.trail.useQuery(
    {
      action: "UPDATE",
      entityType: "planner_timesheet_reminder_sweep",
      limit: 5,
    },
    {
      enabled: activeTab === "health" && ["admin", "super_admin"].includes(user?.role ?? "user"),
      refetchOnWindowFocus: false,
    }
  );
  const { data: userPermissions = [] } = trpc.access.permissions.getForUser.useQuery(
    { userId: selectedUserForPermissions?.id ?? 0 },
    { enabled: Boolean(selectedUserForPermissions) }
  );

  const createUserMutation = trpc.access.users.create.useMutation();
  const updateUserMutation = trpc.access.users.update.useMutation();
  const deleteUserMutation = trpc.access.users.delete.useMutation();
  const savePermissionsMutation = trpc.access.permissions.saveForUser.useMutation();
  const createBranchMutation = trpc.branches.create.useMutation();
  const updateBranchMutation = trpc.branches.update.useMutation();
  const deleteBranchMutation = trpc.branches.delete.useMutation();
  const createSpecimenTypeMutation = trpc.specimens.createType.useMutation();
  const updateSpecimenTypeMutation = trpc.specimens.updateType.useMutation();
  const createMethodMutation = trpc.lecturers.createMethod.useMutation();
  const updateMethodMutation = trpc.lecturers.updateMethod.useMutation();
  const backupSnapshotMutation = trpc.system.backupSnapshot.useMutation();
  const transferReadinessPackMutation = trpc.system.transferReadinessPack.useMutation();
  const schemaRepairScriptMutation = trpc.system.schemaRepairScript.useMutation();
  const schemaRepairApplyMutation = trpc.system.schemaRepairApply.useMutation();
  const createQualityActionFromReadinessMutation =
    trpc.system.createQualityActionFromReadinessIssue.useMutation();
  const checkQualityRemindersMutation = trpc.notifications.checkQualityReminders.useMutation();
  const checkClientPortalRemindersMutation =
    trpc.notifications.checkClientPortalReminders.useMutation();
  const checkLevelIIIDocumentReviewRemindersMutation =
    trpc.notifications.checkLevelIIIDocumentReviewReminders.useMutation();
  const checkLevelIIITechnicianCertificateRemindersMutation =
    trpc.notifications.checkLevelIIITechnicianCertificateReminders.useMutation();
  const checkPlannerTimesheetRemindersMutation =
    trpc.notifications.checkPlannerTimesheetReminders.useMutation();
  const backupRestorePlanMutation = trpc.system.backupRestorePlan.useMutation();
  const backupRestorePreflightMutation = trpc.system.backupRestorePreflight.useMutation();
  const backupRestoreScriptMutation = trpc.system.backupRestoreScript.useMutation();
  const backupRestoreApplyMutation = trpc.system.backupRestoreApply.useMutation();
  const typedRestoreHistory = restoreHistory as BackupRestoreHistoryItem[];
  const typedAuditTrail = (auditTrailData as AuditTrailResponse | undefined)?.items ?? [];
  const typedLevelIIIReminderRunHistory =
    (levelIIIReminderRunHistoryData as AuditTrailResponse | undefined)?.items ?? [];
  const typedQualityReminderRunHistory =
    (qualityReminderRunHistoryData as AuditTrailResponse | undefined)?.items ?? [];
  const typedClientPortalReminderRunHistory =
    (clientPortalReminderRunHistoryData as AuditTrailResponse | undefined)?.items ?? [];
  const typedLevelIIIDocumentReminderRunHistory =
    (levelIIIDocumentReminderRunHistoryData as AuditTrailResponse | undefined)?.items ?? [];
  const typedPlannerReminderRunHistory =
    (plannerReminderRunHistoryData as AuditTrailResponse | undefined)?.items ?? [];
  const auditTrailSummary = (auditTrailData as AuditTrailResponse | undefined)?.summary ?? {
    total: 0,
    success: 0,
    failed: 0,
    actions: [],
    entityTypes: [],
    actors: [],
  };
  const typedDiagnostics = diagnostics as SystemDiagnostics | undefined;
  const typedOperationalReadiness = operationalReadiness as OperationalReadinessSnapshot | undefined;
  const schemaReadiness = typedDiagnostics?.schemaReadiness ?? null;
  const healthAttentionChecks = typedDiagnostics?.checks.filter(
    (check) => check.status !== "healthy"
  ) ?? [];
  const readinessIssues = useMemo(
    () =>
      (typedOperationalReadiness?.issues ?? []).filter((issue) => {
        if (readinessSeverityFilter !== "all" && issue.severity !== readinessSeverityFilter) {
          return false;
        }
        if (readinessAreaFilter !== "all" && issue.area !== readinessAreaFilter) {
          return false;
        }
        return true;
      }),
    [readinessAreaFilter, readinessSeverityFilter, typedOperationalReadiness]
  );
  const readinessAreaOptions = useMemo(
    () => typedOperationalReadiness?.areas.filter((area) => area.total > 0) ?? [],
    [typedOperationalReadiness]
  );
  const levelIIICertificateQueueHealth = useMemo(
    () =>
      buildLevelIIICertificateQueueHealth(
        levelIIITechnicianCertificates as LevelIIICertificateReminderRecord[]
      ),
    [levelIIITechnicianCertificates]
  );

  const buildPermissionState = useCallback(() => {
    const nextState: Record<string, ModulePermission> = {};
    for (const module of moduleList) {
      const existing = userPermissions.find((permission) => permission.module === module);
      nextState[module] = existing ?? {
        module,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      };
    }
    return nextState;
  }, [moduleList, userPermissions]);
  const scrollToAdminSection = useCallback(
    (tab: string, targetRef: React.RefObject<HTMLDivElement | null>) => {
      setActiveTab(tab);
      window.setTimeout(() => {
        targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    []
  );
  const openProductionChecklistTarget = useCallback(
    (row: ProductionChecklistRow) => {
      if (row.targetTab === "access") {
        scrollToAdminSection("access", accessLaunchSignOffRef);
        return;
      }

      const targetRef =
        row.target === "operational-readiness"
          ? operationalReadinessRef
          : row.target === "diagnostics"
            ? diagnosticsRef
            : row.target === "launch-signoff"
              ? productionLaunchSignOffRef
              : rolloutGateRef;

      scrollToAdminSection("health", targetRef);
    },
    [scrollToAdminSection]
  );

  useEffect(() => {
    if (!isPermissionDialogOpen || !selectedUserForPermissions?.id) return;
    if (permissionSeedUserId === selectedUserForPermissions.id) return;
    setPermissionState(buildPermissionState());
    setPermissionSeedUserId(selectedUserForPermissions.id);
  }, [buildPermissionState, isPermissionDialogOpen, permissionSeedUserId, selectedUserForPermissions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(accessLaunchStorageKey);
      if (!raw) {
        setAccessLaunchSignOff({
          auditReviewed: false,
          blockedClientsCleared: false,
          reviewClientsChecked: false,
          branchCoverageVerified: false,
          onboardingBacklogAccepted: false,
        });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<AccessLaunchSignOffState>;
      setAccessLaunchSignOff({
        auditReviewed: Boolean(parsed.auditReviewed),
        blockedClientsCleared: Boolean(parsed.blockedClientsCleared),
        reviewClientsChecked: Boolean(parsed.reviewClientsChecked),
        branchCoverageVerified: Boolean(parsed.branchCoverageVerified),
        onboardingBacklogAccepted: Boolean(parsed.onboardingBacklogAccepted),
      });
    } catch {
      setAccessLaunchSignOff({
        auditReviewed: false,
        blockedClientsCleared: false,
        reviewClientsChecked: false,
        branchCoverageVerified: false,
        onboardingBacklogAccepted: false,
      });
    }
  }, [accessLaunchStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(accessLaunchStorageKey, JSON.stringify(accessLaunchSignOff));
  }, [accessLaunchSignOff, accessLaunchStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(productionLaunchStorageKey);
      if (!raw) {
        setProductionLaunchSignOff({
          healthReviewed: false,
          backupRestoreReviewed: false,
          pilotScopeConfirmed: false,
          accessRolloutConfirmed: false,
          releaseConfigConfirmed: false,
        });
        return;
      }

      const parsed = JSON.parse(raw) as Partial<ProductionLaunchSignOffState>;
      setProductionLaunchSignOff({
        healthReviewed: Boolean(parsed.healthReviewed),
        backupRestoreReviewed: Boolean(parsed.backupRestoreReviewed),
        pilotScopeConfirmed: Boolean(parsed.pilotScopeConfirmed),
        accessRolloutConfirmed: Boolean(parsed.accessRolloutConfirmed),
        releaseConfigConfirmed: Boolean(parsed.releaseConfigConfirmed),
      });
    } catch {
      setProductionLaunchSignOff({
        healthReviewed: false,
        backupRestoreReviewed: false,
        pilotScopeConfirmed: false,
        accessRolloutConfirmed: false,
        releaseConfigConfirmed: false,
      });
    }
  }, [productionLaunchStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(productionLaunchStorageKey, JSON.stringify(productionLaunchSignOff));
  }, [productionLaunchSignOff, productionLaunchStorageKey]);

  const auditActionOptions = useMemo(
    () => Array.from(new Set(["CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT", ...auditTrailSummary.actions])).sort(),
    [auditTrailSummary.actions]
  );
  const auditEntityOptions = useMemo(
    () => auditTrailSummary.entityTypes,
    [auditTrailSummary.entityTypes]
  );

  const branchColumns: Column<Branch>[] = [
    { key: "name", label: "Name", sortable: true, filterable: true },
    { key: "code", label: "Code", sortable: true, render: (value) => value || "-" },
    { key: "companyName", label: "Company", sortable: true, render: (value) => value || "-" },
    {
      key: "active",
      label: "Status",
      render: (value) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const userColumns: Column<AppUser>[] = [
    { key: "name", label: "Name", sortable: true, filterable: true, render: (value) => value || "-" },
    { key: "email", label: "Email", sortable: true, filterable: true, render: (value) => value || "-" },
    {
      key: "role",
      label: "Role",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "super_admin" ? "default" : value === "admin" ? "secondary" : "outline"}>
          {value === "super_admin" ? "Super Admin" : value === "admin" ? "Admin" : "User"}
        </Badge>
      ),
    },
    {
      key: "lastSignedIn",
      label: "Last Sign In",
      sortable: true,
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
  ];
  const typedAccessAuditRows = accessAuditRows as AccessAuditRow[];
  const accessAuditSummary = useMemo(() => {
    const allocatedUsers = typedAccessAuditRows.filter((row) => row.portalAssignmentCount > 0);
    return {
      totalUsers: typedAccessAuditRows.length,
      allocatedUsers: allocatedUsers.length,
      suspendedAllocatedUsers: allocatedUsers.filter((row) => !row.loginEnabled).length,
      passwordResetPendingUsers: typedAccessAuditRows.filter((row) => row.mustChangePassword).length,
      multiClientUsers: allocatedUsers.filter((row) => row.portalAssignmentCount > 1).length,
      flaggedUsers: typedAccessAuditRows.filter((row) => row.accessFlags.length > 0).length,
      internalClientMixedUsers: typedAccessAuditRows.filter(
        (row) =>
          (row.role === "admin" || row.role === "super_admin") && row.portalAssignmentCount > 0
      ).length,
    };
  }, [typedAccessAuditRows]);
  const accessAuditFocusRows = useMemo(() => {
    switch (accessAuditFocus) {
      case "flagged":
        return typedAccessAuditRows.filter((row) => row.accessFlags.length > 0);
      case "suspended":
        return typedAccessAuditRows.filter((row) => !row.loginEnabled);
      case "password_pending":
        return typedAccessAuditRows.filter((row) => row.mustChangePassword);
      case "never_signed_in":
        return typedAccessAuditRows.filter((row) => row.portalAssignmentCount > 0 && !row.lastSignedIn);
      default:
        return typedAccessAuditRows;
    }
  }, [accessAuditFocus, typedAccessAuditRows]);
  const filteredAccessAuditRows = useMemo(() => {
    if (accessAuditClientFilter === "all") {
      return accessAuditFocusRows;
    }
    const clientId = Number(accessAuditClientFilter);
    return accessAuditFocusRows.filter((row) =>
      row.clientAssignments.some((assignment) => assignment.clientId === clientId)
    );
  }, [accessAuditClientFilter, accessAuditFocusRows]);
  const flaggedAccessQueueRows = useMemo<AccessAuditQueueRow[]>(
    () =>
      filteredAccessAuditRows
        .filter((row) => row.accessFlags.length > 0)
        .map((row) => {
          const issue = row.accessFlags[0] ?? "Access review needed";
          let recommendation = "Review user record";
          let priority = 1;

          if (!row.loginEnabled && row.portalAssignmentCount > 0) {
            recommendation = "Confirm whether this suspended login should be reactivated or removed";
            priority = 5;
          } else if (row.mustChangePassword) {
            recommendation = "Confirm the user received the temporary password and can complete first sign-in";
            priority = 4;
          } else if ((row.role === "admin" || row.role === "super_admin") && row.portalAssignmentCount > 0) {
            recommendation = "Confirm this mixed internal/client account is intentional";
            priority = 4;
          } else if (row.portalAssignmentCount > 1) {
            recommendation = "Confirm multi-client portal visibility is correct";
            priority = 3;
          } else if (!row.lastSignedIn && row.portalAssignmentCount > 0) {
            recommendation = "Check whether onboarding is complete for this allocated client user";
            priority = 2;
          }

          return {
            id: row.id,
            userId: row.userId,
            name: row.name,
            email: row.email,
            issue,
            recommendation,
            priority,
            loginEnabled: row.loginEnabled,
            mustChangePassword: row.mustChangePassword,
            role: row.role,
          };
        })
        .sort((left, right) => right.priority - left.priority || left.issue.localeCompare(right.issue)),
    [filteredAccessAuditRows]
  );
  const clientAccessMatrixRows = useMemo<AccessAuditClientMatrixRow[]>(() => {
    const clientMap = new Map<number, AccessAuditClientMatrixRow>();

    for (const row of typedAccessAuditRows) {
      for (const assignment of row.clientAssignments) {
        const existing = clientMap.get(assignment.clientId) ?? {
          id: String(assignment.clientId),
          clientId: assignment.clientId,
          companyName: assignment.companyName,
          allocatedUserCount: 0,
          managerCount: 0,
          viewerCount: 0,
          restrictedUserCount: 0,
          fullScopeUserCount: 0,
          suspendedUserCount: 0,
          passwordPendingUserCount: 0,
          neverSignedInUserCount: 0,
          flaggedUserCount: 0,
          recommendation: "Review client access mix",
        };

        existing.allocatedUserCount += 1;
        if (assignment.accessLevel === "manager") {
          existing.managerCount += 1;
        } else {
          existing.viewerCount += 1;
        }
        if (assignment.fullBranchAccess) {
          existing.fullScopeUserCount += 1;
        } else {
          existing.restrictedUserCount += 1;
        }
        if (!row.loginEnabled) {
          existing.suspendedUserCount += 1;
        }
        if (row.mustChangePassword) {
          existing.passwordPendingUserCount += 1;
        }
        if (!row.lastSignedIn) {
          existing.neverSignedInUserCount += 1;
        }
        if (row.accessFlags.length > 0) {
          existing.flaggedUserCount += 1;
        }

        if (existing.suspendedUserCount > 0) {
          existing.recommendation = "Confirm suspended allocated users are intentional";
        } else if (existing.passwordPendingUserCount > 0 || existing.neverSignedInUserCount > 0) {
          existing.recommendation = "Check onboarding and first-sign-in status";
        } else if (existing.restrictedUserCount > 0) {
          existing.recommendation = "Verify branch-restricted scope for this client";
        } else if (existing.managerCount > 1) {
          existing.recommendation = "Confirm multiple managers are intended";
        } else {
          existing.recommendation = "No immediate exposure issue";
        }

        clientMap.set(assignment.clientId, existing);
      }
    }

    return Array.from(clientMap.values()).sort((left, right) => {
      if (left.flaggedUserCount !== right.flaggedUserCount) {
        return right.flaggedUserCount - left.flaggedUserCount;
      }
      if (left.allocatedUserCount !== right.allocatedUserCount) {
        return right.allocatedUserCount - left.allocatedUserCount;
      }
      return left.companyName.localeCompare(right.companyName);
    });
  }, [typedAccessAuditRows]);
  const clientAccessMatrixSummary = useMemo(
    () => ({
      totalClients: clientAccessMatrixRows.length,
      flaggedClients: clientAccessMatrixRows.filter((row) => row.flaggedUserCount > 0).length,
      restrictedClients: clientAccessMatrixRows.filter((row) => row.restrictedUserCount > 0).length,
      onboardingClients: clientAccessMatrixRows.filter(
        (row) => row.passwordPendingUserCount > 0 || row.neverSignedInUserCount > 0
      ).length,
    }),
    [clientAccessMatrixRows]
  );
  const accessAuditClientOptions = useMemo(
    () =>
      clientAccessMatrixRows.map((row) => ({
        value: String(row.clientId),
        label: row.companyName,
      })),
    [clientAccessMatrixRows]
  );
  const clientAccessGapRows = useMemo<AccessAuditClientGapRow[]>(() => {
    const rows: AccessAuditClientGapRow[] = [];
    for (const row of clientAccessMatrixRows) {
      if (row.allocatedUserCount > 0 && row.managerCount === 0) {
        rows.push({
          id: `${row.clientId}-no-manager`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "No manager allocated",
          recommendation: "Allocate at least one manager for this client portal",
          severity: 5,
        });
      }
      if (row.allocatedUserCount > 0 && row.suspendedUserCount === row.allocatedUserCount) {
        rows.push({
          id: `${row.clientId}-all-suspended`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "All allocated users are suspended",
          recommendation: "Reactivate or replace the allocated client users",
          severity: 5,
        });
      }
      if (row.allocatedUserCount > 0 && row.neverSignedInUserCount === row.allocatedUserCount) {
        rows.push({
          id: `${row.clientId}-no-signins`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "No allocated users have signed in",
          recommendation: "Check onboarding, email delivery, and temporary-password handoff",
          severity: 4,
        });
      }
      if (row.passwordPendingUserCount > 0) {
        rows.push({
          id: `${row.clientId}-password-pending`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "Temporary password changes still pending",
          recommendation: "Confirm users can complete first-login password change",
          severity: 3,
        });
      }
      if (row.restrictedUserCount > 0 && row.fullScopeUserCount === 0) {
        rows.push({
          id: `${row.clientId}-restricted-only`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "All access is branch-restricted",
          recommendation: "Confirm there should be no full-scope user for this client",
          severity: 2,
        });
      }
    }
    return rows.sort((left, right) => right.severity - left.severity || left.companyName.localeCompare(right.companyName));
  }, [clientAccessMatrixRows]);
  const branchScopeRows = useMemo<AccessAuditBranchScopeRow[]>(
    () =>
      filteredAccessAuditRows
        .flatMap((row) =>
          row.clientAssignments.map((assignment) => {
            const scopeLabel = assignment.fullBranchAccess
              ? `All ${assignment.totalClientBranches} branches`
              : `${assignment.scopedBranchCount} of ${assignment.totalClientBranches} branches`;

            let recommendation = assignment.fullBranchAccess
              ? "Full client visibility is in place"
              : "Restricted branch visibility is in place";

            if (!assignment.fullBranchAccess && assignment.accessLevel === "manager") {
              recommendation = "Confirm this manager should be limited to selected branches";
            } else if (!assignment.fullBranchAccess && assignment.totalClientBranches >= 5) {
              recommendation = "Review whether this large client should keep branch-restricted access";
            } else if (!row.loginEnabled) {
              recommendation = "Suspended assignment still exists; confirm whether this branch scope should remain allocated";
            } else if (row.mustChangePassword) {
              recommendation = "Onboarding is still incomplete for this branch-scoped assignment";
            }

            return {
              id: `${row.userId}-${assignment.clientId}`,
              userId: row.userId,
              clientId: assignment.clientId,
              name: row.name,
              email: row.email,
              role: row.role,
              companyName: assignment.companyName,
              accessLevel: assignment.accessLevel,
              receiveReminders: assignment.receiveReminders,
              loginEnabled: row.loginEnabled,
              mustChangePassword: row.mustChangePassword,
              fullBranchAccess: assignment.fullBranchAccess,
              scopedBranchCount: assignment.scopedBranchCount,
              totalClientBranches: assignment.totalClientBranches,
              scopeLabel,
              recommendation,
            };
          })
        )
        .sort((left, right) => {
          if (left.fullBranchAccess !== right.fullBranchAccess) {
            return left.fullBranchAccess ? 1 : -1;
          }
          if (left.accessLevel !== right.accessLevel) {
            return left.accessLevel === "manager" ? -1 : 1;
          }
          return left.companyName.localeCompare(right.companyName);
        }),
    [filteredAccessAuditRows]
  );
  const branchScopeSummary = useMemo(
    () => ({
      restrictedAssignments: branchScopeRows.filter((row) => !row.fullBranchAccess).length,
      fullScopeAssignments: branchScopeRows.filter((row) => row.fullBranchAccess).length,
      restrictedManagers: branchScopeRows.filter(
        (row) => !row.fullBranchAccess && row.accessLevel === "manager"
      ).length,
      largeClientScopeReviews: branchScopeRows.filter(
        (row) => !row.fullBranchAccess && row.totalClientBranches >= 5
      ).length,
    }),
    [branchScopeRows]
  );
  const branchScopeQueueRows = useMemo<AccessAuditBranchScopeQueueRow[]>(() => {
    const rows: AccessAuditBranchScopeQueueRow[] = [];

    for (const row of branchScopeRows) {
      if (!row.fullBranchAccess && row.accessLevel === "manager") {
        rows.push({
          id: `${row.id}-restricted-manager`,
          userId: row.userId,
          clientId: row.clientId,
          name: row.name,
          email: row.email,
          companyName: row.companyName,
          issue: "Manager is branch-restricted",
          recommendation: "Confirm this manager should not have full client visibility",
          priority: 5,
        });
      }
      if (!row.loginEnabled && !row.fullBranchAccess) {
        rows.push({
          id: `${row.id}-suspended-restricted`,
          userId: row.userId,
          clientId: row.clientId,
          name: row.name,
          email: row.email,
          companyName: row.companyName,
          issue: "Suspended branch-scoped assignment",
          recommendation: "Confirm whether this suspended restricted access should be removed or reactivated",
          priority: 4,
        });
      }
      if (row.mustChangePassword && !row.fullBranchAccess) {
        rows.push({
          id: `${row.id}-password-pending`,
          userId: row.userId,
          clientId: row.clientId,
          name: row.name,
          email: row.email,
          companyName: row.companyName,
          issue: "Branch-scoped onboarding still pending",
          recommendation: "Confirm the user can complete first sign-in and see the correct branch scope",
          priority: 3,
        });
      }
      if (!row.fullBranchAccess && row.totalClientBranches >= 5 && row.scopedBranchCount <= 1) {
        rows.push({
          id: `${row.id}-narrow-large-client`,
          userId: row.userId,
          clientId: row.clientId,
          name: row.name,
          email: row.email,
          companyName: row.companyName,
          issue: "Very narrow scope on a large client",
          recommendation: "Review whether one-branch visibility is intentional for this client",
          priority: 3,
        });
      }
    }

    return rows.sort((left, right) => right.priority - left.priority || left.companyName.localeCompare(right.companyName));
  }, [branchScopeRows]);
  const typedAccessBranchCoverageRows = accessBranchCoverageRows as AccessAuditBranchCoverageRow[];
  const branchCoverageSummary = useMemo(
    () => ({
      clientsWithBranches: typedAccessBranchCoverageRows.filter((row) => row.totalBranches > 0).length,
      fullyCoveredClients: typedAccessBranchCoverageRows.filter(
        (row) => row.coverageStatus === "Full branch coverage" || row.coverageStatus === "Restricted coverage complete"
      ).length,
      uncoveredBranchClients: typedAccessBranchCoverageRows.filter((row) => row.uncoveredBranchCount > 0).length,
      missingManagerClients: typedAccessBranchCoverageRows.filter(
        (row) => row.totalBranches > 0 && row.activeAssignedUsers > 0 && row.activeManagerCount === 0
      ).length,
    }),
    [typedAccessBranchCoverageRows]
  );
  const branchCoverageQueueRows = useMemo<AccessAuditBranchCoverageQueueRow[]>(() => {
    const rows: AccessAuditBranchCoverageQueueRow[] = [];

    for (const row of typedAccessBranchCoverageRows) {
      if (row.uncoveredBranchCount > 0) {
        rows.push({
          id: `${row.clientId}-uncovered`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: `${row.uncoveredBranchCount} uncovered branch${row.uncoveredBranchCount === 1 ? "" : "es"}`,
          recommendation: `Review missing branch visibility: ${row.uncoveredBranchNames.slice(0, 3).join(", ")}${row.uncoveredBranchNames.length > 3 ? "..." : ""}`,
          priority: 5,
        });
      }
      if (row.totalBranches > 0 && row.activeAssignedUsers > 0 && row.activeManagerCount === 0) {
        rows.push({
          id: `${row.clientId}-no-manager`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "No active manager across client branches",
          recommendation: "Allocate or reactivate an active manager for this client portal",
          priority: 4,
        });
      }
      if (row.totalBranches > 1 && row.activeAssignedUsers > 0 && row.activeFullScopeCount === 0) {
        rows.push({
          id: `${row.clientId}-restricted-only`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "Multi-branch client relies only on restricted access",
          recommendation: "Confirm there should be no active full-scope user for this client",
          priority: 3,
        });
      }
      if (row.totalBranches > 0 && row.activeAssignedUsers === 0) {
        rows.push({
          id: `${row.clientId}-no-active-access`,
          clientId: row.clientId,
          companyName: row.companyName,
          issue: "Branches exist but no active access remains",
          recommendation: "Reactivate or replace the allocated client users before rollout",
          priority: 5,
        });
      }
    }

    return rows.sort((left, right) => right.priority - left.priority || left.companyName.localeCompare(right.companyName));
  }, [typedAccessBranchCoverageRows]);
  const accessRemediationRows = useMemo<AccessAuditRemediationRow[]>(
    () =>
      [
        ...flaggedAccessQueueRows.map((row) => ({
          id: `user-${row.id}`,
          kind: "user" as const,
          priority: row.priority,
          scopeLabel: "User access",
          subjectLabel: row.name || row.email || `User ${row.userId}`,
          issue: row.issue,
          recommendation: row.recommendation,
          userId: row.userId,
          clientId: null,
        })),
        ...clientAccessGapRows.map((row) => ({
          id: `client-${row.id}`,
          kind: "client" as const,
          priority: row.severity,
          scopeLabel: "Client access",
          subjectLabel: row.companyName,
          issue: row.issue,
          recommendation: row.recommendation,
          userId: null,
          clientId: row.clientId,
        })),
        ...branchScopeQueueRows.map((row) => ({
          id: `branch-scope-${row.id}`,
          kind: "branch_scope" as const,
          priority: row.priority,
          scopeLabel: "Branch scope",
          subjectLabel: `${row.companyName} Â· ${row.name || row.email || `User ${row.userId}`}`,
          issue: row.issue,
          recommendation: row.recommendation,
          userId: row.userId,
          clientId: row.clientId,
        })),
        ...branchCoverageQueueRows.map((row) => ({
          id: `branch-coverage-${row.id}`,
          kind: "branch_coverage" as const,
          priority: row.priority,
          scopeLabel: "Branch coverage",
          subjectLabel: row.companyName,
          issue: row.issue,
          recommendation: row.recommendation,
          userId: null,
          clientId: row.clientId,
        })),
      ].sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority;
        }
        return left.subjectLabel.localeCompare(right.subjectLabel);
      }),
    [branchCoverageQueueRows, branchScopeQueueRows, clientAccessGapRows, flaggedAccessQueueRows]
  );
  const accessRemediationSummary = useMemo(
    () => ({
      total: accessRemediationRows.length,
      critical: accessRemediationRows.filter((row) => row.priority >= 5).length,
      high: accessRemediationRows.filter((row) => row.priority === 4).length,
      userItems: accessRemediationRows.filter((row) => row.kind === "user").length,
      clientItems: accessRemediationRows.filter((row) => row.kind !== "user").length,
    }),
    [accessRemediationRows]
  );
  const accessRolloutRows = useMemo<AccessAuditRolloutRow[]>(() => {
    const branchCoverageMap = new Map(typedAccessBranchCoverageRows.map((row) => [row.clientId, row]));
    const gapMap = new Map<number, AccessAuditClientGapRow[]>();
    for (const row of clientAccessGapRows) {
      const existing = gapMap.get(row.clientId) ?? [];
      existing.push(row);
      gapMap.set(row.clientId, existing);
    }

    const remediationByClient = new Map<number, AccessAuditRemediationRow[]>();
    for (const row of accessRemediationRows) {
      if (row.clientId === null) continue;
      const existing = remediationByClient.get(row.clientId) ?? [];
      existing.push(row);
      remediationByClient.set(row.clientId, existing);
    }

    return clientAccessMatrixRows.map((client) => {
      const branchCoverage = branchCoverageMap.get(client.clientId);
      const gaps = gapMap.get(client.clientId) ?? [];
      const remediation = remediationByClient.get(client.clientId) ?? [];
      const blockerCount = remediation.filter((row) => row.priority >= 4).length;
      const warningCount = remediation.filter((row) => row.priority < 4).length;

      let status: "ready" | "review" | "blocked" = "ready";
      if (
        gaps.some((gap) => gap.severity >= 4) ||
        (branchCoverage?.uncoveredBranchCount ?? 0) > 0 ||
        client.allocatedUserCount === 0 ||
        client.managerCount === 0
      ) {
        status = "blocked";
      } else if (gaps.length > 0 || warningCount > 0 || client.restrictedUserCount > 0 || client.flaggedUserCount > 0) {
        status = "review";
      }

      const primaryIssue =
        remediation[0]?.issue ??
        branchCoverage?.coverageStatus ??
        client.recommendation;
      const nextAction =
        remediation[0]?.recommendation ??
        branchCoverage?.recommendation ??
        client.recommendation;

      return {
        id: String(client.clientId),
        clientId: client.clientId,
        companyName: client.companyName,
        status,
        blockerCount,
        warningCount,
        allocatedUserCount: client.allocatedUserCount,
        activeManagerCount: branchCoverage?.activeManagerCount ?? client.managerCount,
        uncoveredBranchCount: branchCoverage?.uncoveredBranchCount ?? 0,
        primaryIssue,
        nextAction,
      };
    }).sort((left, right) => {
      const statusRank = { blocked: 0, review: 1, ready: 2 };
      if (statusRank[left.status] !== statusRank[right.status]) {
        return statusRank[left.status] - statusRank[right.status];
      }
      if (left.blockerCount !== right.blockerCount) {
        return right.blockerCount - left.blockerCount;
      }
      return left.companyName.localeCompare(right.companyName);
    });
  }, [accessRemediationRows, clientAccessGapRows, clientAccessMatrixRows, typedAccessBranchCoverageRows]);
  const accessRolloutSummary = useMemo(
    () => ({
      ready: accessRolloutRows.filter((row) => row.status === "ready").length,
      review: accessRolloutRows.filter((row) => row.status === "review").length,
      blocked: accessRolloutRows.filter((row) => row.status === "blocked").length,
      clientsWithBranchesBlocked: accessRolloutRows.filter(
        (row) => row.status === "blocked" && row.uncoveredBranchCount > 0
      ).length,
    }),
    [accessRolloutRows]
  );
  const accessGoLiveGate = useMemo<AccessGoLiveGate>(() => {
    const blockedRows = accessRolloutRows.filter((row) => row.status === "blocked");
    const reviewRows = accessRolloutRows.filter((row) => row.status === "review");
    const criticalCount = accessRemediationRows.filter((row) => row.priority >= 5).length;
    const highCount = accessRemediationRows.filter((row) => row.priority === 4).length;
    const blockedRow = blockedRows[0] ?? null;
    const reviewRow = reviewRows[0] ?? null;
    const primaryRow = blockedRow ?? reviewRow ?? accessRolloutRows[0] ?? null;
    const blockerList = [
      blockedRow ? `${blockedRow.companyName}: ${blockedRow.primaryIssue}` : null,
      reviewRow && reviewRow.clientId !== blockedRow?.clientId
        ? `${reviewRow.companyName}: ${reviewRow.primaryIssue}`
        : null,
      criticalCount > 0 ? `${criticalCount} critical remediation item${criticalCount === 1 ? "" : "s"} still open` : null,
      highCount > 0 ? `${highCount} high remediation item${highCount === 1 ? "" : "s"} still open` : null,
    ].filter((value): value is string => Boolean(value));

    if (accessRolloutRows.length === 0) {
      return {
        status: "empty",
        label: "No portal rollout data",
        detail: "No client portal allocations have been audited yet.",
        blockedCount: 0,
        reviewCount: 0,
        criticalCount,
        highCount,
        primaryRow: null,
        blockedRow: null,
        reviewRow: null,
        blockerList: [],
      };
    }

    if (blockedRows.length > 0 || criticalCount > 0) {
      return {
        status: "blocked",
        label: "Client portal rollout blocked",
        detail: blockedRow
          ? `${blockedRows.length} blocked client portal${blockedRows.length === 1 ? "" : "s"} remain. Start with ${blockedRow.companyName}.`
          : `${criticalCount} critical remediation item${criticalCount === 1 ? "" : "s"} remain open.`,
        blockedCount: blockedRows.length,
        reviewCount: reviewRows.length,
        criticalCount,
        highCount,
        primaryRow,
        blockedRow,
        reviewRow,
        blockerList,
      };
    }

    if (reviewRows.length > 0 || highCount > 0) {
      return {
        status: "review",
        label: "Client portal rollout in review",
        detail: reviewRow
          ? `${reviewRows.length} client portal${reviewRows.length === 1 ? "" : "s"} still need review. Start with ${reviewRow.companyName}.`
          : `${highCount} high remediation item${highCount === 1 ? "" : "s"} still need review.`,
        blockedCount: blockedRows.length,
        reviewCount: reviewRows.length,
        criticalCount,
        highCount,
        primaryRow,
        blockedRow,
        reviewRow,
        blockerList,
      };
    }

    return {
      status: "ready",
      label: "Client portals ready for rollout",
      detail: `${accessRolloutRows.length} client portal${accessRolloutRows.length === 1 ? "" : "s"} are currently clear from an access-audit perspective.`,
      blockedCount: 0,
      reviewCount: 0,
      criticalCount,
      highCount,
      primaryRow,
      blockedRow: null,
      reviewRow: null,
      blockerList,
    };
  }, [accessRemediationRows, accessRolloutRows]);
  const accessLaunchSignOffItems = useMemo(
    () => [
      {
        key: "auditReviewed" as const,
        label: "Access audit reviewed",
        description: "The access audit dashboard, rollout gate, and remediation queue were reviewed against the current rollout scope.",
        blocked: false,
      },
      {
        key: "blockedClientsCleared" as const,
        label: "Blocked clients cleared",
        description: "All blocked client portals have been resolved or deliberately removed from launch scope.",
        blocked: accessGoLiveGate.blockedCount > 0 || accessGoLiveGate.criticalCount > 0,
      },
      {
        key: "reviewClientsChecked" as const,
        label: "Review clients checked",
        description: "All review-status client portals have been checked and accepted for launch.",
        blocked: accessGoLiveGate.reviewCount > 0,
      },
      {
        key: "branchCoverageVerified" as const,
        label: "Branch coverage verified",
        description: "Branch coverage and manager coverage were checked for clients with branch structures.",
        blocked: accessRolloutSummary.clientsWithBranchesBlocked > 0,
      },
      {
        key: "onboardingBacklogAccepted" as const,
        label: "Onboarding backlog accepted",
        description: "Password-change backlog, never-signed-in users, and onboarding gaps were reviewed and accepted.",
        blocked: accessGoLiveGate.highCount > 0 || accessGoLiveGate.criticalCount > 0,
      },
    ],
    [accessGoLiveGate.blockedCount, accessGoLiveGate.criticalCount, accessGoLiveGate.highCount, accessGoLiveGate.reviewCount, accessRolloutSummary.clientsWithBranchesBlocked]
  );
  const accessLaunchSignOffReady = useMemo(
    () =>
      accessGoLiveGate.status === "ready" &&
      accessLaunchSignOffItems.every(
        (item) => !item.blocked && Boolean(accessLaunchSignOff[item.key])
      ),
    [accessGoLiveGate.status, accessLaunchSignOffItems, accessLaunchSignOff]
  );
  const productionReadinessIssues = useMemo<ProductionReadinessIssue[]>(() => {
    const issues: ProductionReadinessIssue[] = [];

    if (!typedDiagnostics) {
      issues.push({
        id: "system-diagnostics-unavailable",
        area: "system",
        severity: "blocked",
        detail: "System diagnostics have not been loaded yet.",
        nextAction: "Refresh System Health Diagnostics and confirm the checks complete successfully.",
      });
    } else {
      if (!typedDiagnostics.database.ok) {
        issues.push({
          id: "database-offline",
          area: "system",
          severity: "blocked",
          detail: "Database connectivity is failing.",
          nextAction: "Resolve the database connection issue before rollout testing continues.",
        });
      }
      if (typedDiagnostics.summary.error > 0) {
        issues.push({
          id: "health-errors",
          area: "system",
          severity: "blocked",
          detail: `${typedDiagnostics.summary.error} system health check${typedDiagnostics.summary.error === 1 ? "" : "s"} are in error state.`,
          nextAction: "Clear the failing health checks shown in System Health Diagnostics.",
        });
      }
      if (typedDiagnostics.environment.localAuthBypass) {
        issues.push({
          id: "local-auth-bypass",
          area: "system",
          severity: "blocked",
          detail: "Local auth bypass is still enabled.",
          nextAction: "Disable local auth bypass before any production or pilot rollout.",
        });
      }
      if (schemaReadiness && schemaReadiness.status !== "healthy") {
        issues.push({
          id: "schema-readiness",
          area: "system",
          severity: "blocked",
          detail: `Schema readiness is ${schemaReadiness.status}.`,
          nextAction: "Review schema readiness and repair any missing tables, columns, or manual review items.",
        });
      }
      if (!typedDiagnostics.environment.appBaseUrl || /localhost|127\.0\.0\.1/i.test(typedDiagnostics.environment.appBaseUrl)) {
        issues.push({
          id: "app-base-url",
          area: "release",
          severity: "review",
          detail: "App base URL is missing or still pointing at localhost.",
          nextAction: "Set the real hosted app URL before broader rollout.",
        });
      }
      if (typedDiagnostics.environment.nodeEnv !== "production") {
        issues.push({
          id: "node-env",
          area: "release",
          severity: "review",
          detail: `Node environment is '${typedDiagnostics.environment.nodeEnv}'.`,
          nextAction: "Confirm the hosted environment runs with NODE_ENV=production.",
        });
      }
      if (!typedDiagnostics.environment.ownerNotificationConfigured) {
        issues.push({
          id: "owner-notifications",
          area: "release",
          severity: "review",
          detail: "Owner notification email is not configured.",
          nextAction: "Configure owner notification email so failures and escalations have a destination.",
        });
      }
      if (!typedDiagnostics.environment.smtpConfigured) {
        issues.push({
          id: "smtp-delivery",
          area: "release",
          severity: "review",
          detail: "SMTP email delivery is not configured.",
          nextAction:
            "Configure SMTP so password resets, portal handoffs, and outbound workflow emails can be sent from the app.",
        });
      }
      if (typedDiagnostics.environment.bootstrapAdminPasswordConfigured) {
        issues.push({
          id: "bootstrap-admin-password",
          area: "system",
          severity: "blocked",
          detail: "Bootstrap admin password is still configured in the environment.",
          nextAction:
            "Remove BOOTSTRAP_ADMIN_PASSWORD after confirming the live Super Admin account can sign in normally.",
        });
      }
      if (!typedDiagnostics.environment.storageDurable) {
        issues.push({
          id: "storage-durability",
          area: "release",
          severity: typedDiagnostics.environment.nodeEnv === "production" ? "blocked" : "review",
          detail:
            typedDiagnostics.environment.storageProvider === "local"
              ? "File storage is still local and not durable for hosted production use."
              : "File storage durability is not confirmed.",
          nextAction:
            "Move uploads to S3-compatible storage before production rollout so technician, portal, and document files are durable.",
        });
      }
      if (!typedDiagnostics.environment.reminderSchedulerEnabled) {
        issues.push({
          id: "reminder-scheduler-disabled",
          area: "release",
          severity: "review",
          detail: "Automatic reminder scheduler is disabled.",
          nextAction:
            "Enable the reminder scheduler so certificate, portal, quality, and planner reminders continue without manual admin runs.",
        });
      }
      if (healthAttentionChecks.length > 0) {
        issues.push({
          id: "health-attention",
          area: "system",
          severity: "review",
          detail: `${healthAttentionChecks.length} system health check${healthAttentionChecks.length === 1 ? "" : "s"} still need attention.`,
          nextAction: "Work through the attention-state health checks and decide whether each is acceptable for pilot rollout.",
        });
      }
    }

    if (!typedOperationalReadiness) {
      issues.push({
        id: "operational-readiness-unavailable",
        area: "operations",
        severity: "blocked",
        detail: "Operational readiness checks have not been loaded yet.",
        nextAction: "Refresh Operational Readiness and confirm the live pre-flight checks complete.",
      });
    } else {
      if (typedOperationalReadiness.summary.critical > 0) {
        issues.push({
          id: "operational-critical",
          area: "operations",
          severity: "blocked",
          detail: `${typedOperationalReadiness.summary.critical} critical operational readiness issue${typedOperationalReadiness.summary.critical === 1 ? "" : "s"} remain open.`,
          nextAction: "Clear the critical operational readiness issues before rollout.",
        });
      }
      if (typedOperationalReadiness.summary.warning > 0) {
        issues.push({
          id: "operational-warning",
          area: "operations",
          severity: "review",
          detail: `${typedOperationalReadiness.summary.warning} warning-level operational issue${typedOperationalReadiness.summary.warning === 1 ? "" : "s"} still need review.`,
          nextAction: "Review warning-level operational issues and accept or clear them deliberately.",
        });
      }
    }

    if (accessGoLiveGate.status === "blocked") {
      issues.push({
        id: "access-rollout-blocked",
        area: "access",
        severity: "blocked",
        detail: `${accessGoLiveGate.blockedCount} client portal rollout blocker${accessGoLiveGate.blockedCount === 1 ? "" : "s"} remain in the access audit.`,
        nextAction: accessGoLiveGate.blockedRow?.nextAction ?? "Open Access and clear the blocked rollout clients first.",
      });
    } else if (accessGoLiveGate.status === "review" || accessGoLiveGate.status === "empty") {
      issues.push({
        id: "access-rollout-review",
        area: "access",
        severity: "review",
        detail: accessGoLiveGate.detail,
        nextAction: accessGoLiveGate.reviewRow?.nextAction ?? accessGoLiveGate.primaryRow?.nextAction ?? "Open Access and review the remaining rollout items.",
      });
    }

    if (!accessLaunchSignOffReady) {
      issues.push({
        id: "access-launch-signoff",
        area: "access",
        severity: "review",
        detail: "Access launch sign-off is not complete yet.",
        nextAction: "Finish the Access Launch Sign-Off items after the access blockers and review items are cleared.",
      });
    }

    return issues;
  }, [
    accessGoLiveGate,
    accessLaunchSignOffReady,
    healthAttentionChecks.length,
    schemaReadiness,
    typedDiagnostics,
    typedOperationalReadiness,
  ]);
  const productionReadinessGate = useMemo(() => {
    const blockedIssues = productionReadinessIssues.filter((issue) => issue.severity === "blocked");
    const reviewIssues = productionReadinessIssues.filter((issue) => issue.severity === "review");
    const nextIssue = blockedIssues[0] ?? reviewIssues[0] ?? null;

    if (blockedIssues.length > 0) {
      return {
        status: "blocked" as const,
        label: "Production rollout blocked",
        detail: `${blockedIssues.length} blocking issue${blockedIssues.length === 1 ? "" : "s"} still need to be resolved before rollout testing should proceed.`,
        blockedCount: blockedIssues.length,
        reviewCount: reviewIssues.length,
        nextIssue,
      };
    }

    if (reviewIssues.length > 0) {
      return {
        status: "review" as const,
        label: "Production rollout in review",
        detail: `${reviewIssues.length} review item${reviewIssues.length === 1 ? "" : "s"} still need an explicit decision before wider rollout.`,
        blockedCount: 0,
        reviewCount: reviewIssues.length,
        nextIssue,
      };
    }

    return {
      status: "ready" as const,
      label: "Production rollout ready for pilot",
      detail: "System health, operational readiness, and access rollout are currently clear enough for controlled pilot testing.",
      blockedCount: 0,
      reviewCount: 0,
      nextIssue: null,
    };
  }, [productionReadinessIssues]);
  const productionLaunchSignOffItems = useMemo(
    () => [
      {
        key: "healthReviewed" as const,
        label: "Health reviewed",
        description: "System Health Diagnostics and Operational Readiness were reviewed against the current rollout scope.",
        blocked: productionReadinessIssues.some(
          (issue) => (issue.area === "system" || issue.area === "operations") && issue.severity === "blocked"
        ),
      },
      {
        key: "backupRestoreReviewed" as const,
        label: "Backup / restore reviewed",
        description: "Backup JSON, transfer pack, and restore path were checked before rollout.",
        blocked: false,
      },
      {
        key: "pilotScopeConfirmed" as const,
        label: "Pilot scope confirmed",
        description: "The first pilot users, clients, and branches were selected and agreed.",
        blocked: false,
      },
      {
        key: "accessRolloutConfirmed" as const,
        label: "Access rollout confirmed",
        description: "Client portal access rollout is clear and the access launch sign-off is complete.",
        blocked: accessGoLiveGate.status !== "ready" || !accessLaunchSignOffReady,
      },
      {
        key: "releaseConfigConfirmed" as const,
        label: "Release config confirmed",
        description: "Hosted URL, notification destinations, and deployment settings were checked for rollout.",
        blocked: productionReadinessIssues.some((issue) => issue.area === "release"),
      },
    ],
    [accessGoLiveGate.status, accessLaunchSignOffReady, productionReadinessIssues]
  );
  const productionLaunchSignOffReady = useMemo(
    () =>
      productionReadinessGate.status === "ready" &&
      productionLaunchSignOffItems.every(
        (item) => !item.blocked && Boolean(productionLaunchSignOff[item.key])
      ),
    [productionLaunchSignOff, productionLaunchSignOffItems, productionReadinessGate.status]
  );
  const productionRolloutQueueRows = useMemo<ProductionRolloutQueueRow[]>(() => {
    const gateRows = productionReadinessIssues.map((issue, index) => ({
      id: `gate-${issue.id}`,
      status: issue.severity,
      area: issue.area,
      subject: `${issue.area[0].toUpperCase()}${issue.area.slice(1)} rollout check`,
      detail: issue.detail,
      nextAction: issue.nextAction,
      source: "gate" as const,
      priority: issue.severity === "blocked" ? 1000 - index : 700 - index,
    }));

    const signOffRows = productionLaunchSignOffItems
      .filter((item) => item.blocked || !productionLaunchSignOff[item.key])
      .map((item, index) => ({
        id: `signoff-${item.key}`,
        status: item.blocked ? "blocked" as const : "review" as const,
        area: "signoff" as const,
        subject: item.label,
        detail: item.description,
        nextAction: item.blocked
          ? "Clear the live rollout blocker first, then sign off this release item."
          : "Review this release-control item and sign it off when confirmed.",
        source: "signoff" as const,
        priority: item.blocked ? 500 - index : 300 - index,
      }));

    return [...gateRows, ...signOffRows].sort((left, right) => right.priority - left.priority);
  }, [productionLaunchSignOff, productionLaunchSignOffItems, productionReadinessIssues]);
  const productionRolloutQueueGate = useMemo(() => {
    const blockedCount = productionRolloutQueueRows.filter((row) => row.status === "blocked").length;
    const reviewCount = productionRolloutQueueRows.filter((row) => row.status === "review").length;
    const nextRow = productionRolloutQueueRows[0] ?? null;

    if (blockedCount > 0) {
      return {
        status: "blocked" as const,
        label: "Rollout queue blocked",
        detail: `${blockedCount} blocked rollout item${blockedCount === 1 ? "" : "s"} still need to be cleared first.`,
        blockedCount,
        reviewCount,
        nextRow,
      };
    }

    if (reviewCount > 0) {
      return {
        status: "review" as const,
        label: "Rollout queue in review",
        detail: `${reviewCount} rollout review item${reviewCount === 1 ? "" : "s"} still need explicit sign-off or acceptance.`,
        blockedCount: 0,
        reviewCount,
        nextRow,
      };
    }

    return {
      status: "ready" as const,
      label: "Rollout queue clear",
      detail: "No open rollout gate items or unsigned release checks remain.",
      blockedCount: 0,
      reviewCount: 0,
      nextRow: null,
    };
  }, [productionRolloutQueueRows]);
  const productionRolloutPhases = useMemo<ProductionRolloutPhaseRow[]>(() => {
    const phaseDefinitions = [
      {
        id: "system-ops",
        title: "1. System & Operations Clearance",
        targetTab: "health" as const,
        rows: productionRolloutQueueRows.filter((row) => row.area === "system" || row.area === "operations"),
        emptyDetail: "System diagnostics and operational readiness are clear enough for pilot rollout.",
        nextAction:
          productionRolloutQueueRows.find((row) => row.area === "system" || row.area === "operations")?.nextAction ??
          "No action required.",
      },
      {
        id: "access",
        title: "2. Access Clearance",
        targetTab: "access" as const,
        rows: productionRolloutQueueRows.filter((row) => row.area === "access"),
        emptyDetail: "Client portal access rollout is clear enough for pilot rollout.",
        nextAction:
          productionRolloutQueueRows.find((row) => row.area === "access")?.nextAction ??
          "No action required.",
      },
      {
        id: "release-signoff",
        title: "3. Release Sign-Off",
        targetTab: "health" as const,
        rows: productionRolloutQueueRows.filter((row) => row.area === "release" || row.area === "signoff"),
        emptyDetail: "Release configuration and admin sign-off checks are complete.",
        nextAction:
          productionRolloutQueueRows.find((row) => row.area === "release" || row.area === "signoff")?.nextAction ??
          "No action required.",
      },
      {
        id: "pilot-decision",
        title: "4. Pilot Launch Decision",
        targetTab: "health" as const,
        rows:
          productionRolloutQueueRows.length === 0 && productionLaunchSignOffReady
            ? []
            : [
                {
                  id: "pilot-decision-row",
                  status: "review" as const,
                  area: "signoff" as const,
                  subject: "Pilot launch decision",
                  detail:
                    productionRolloutQueueRows.length === 0
                      ? "Final rollout decision still needs to be recorded."
                      : "Pilot launch decision should wait until earlier rollout phases are clear.",
                  nextAction:
                    productionRolloutQueueRows.length === 0
                      ? "Review the final rollout state and decide whether to start the controlled pilot."
                      : "Clear the earlier rollout phases before making the pilot launch decision.",
                  source: "signoff" as const,
                  priority: 0,
                },
              ],
        emptyDetail: "Pilot launch decision can proceed.",
        nextAction:
          productionRolloutQueueRows.length === 0
            ? "Start the agreed pilot rollout and monitor the first users closely."
            : "Clear the earlier rollout phases first.",
      },
    ];

    const firstOpenIndex = phaseDefinitions.findIndex((phase) => phase.rows.length > 0);

    return phaseDefinitions.map((phase, index) => {
      const status: ProductionRolloutPhaseRow["status"] =
        phase.rows.length === 0 ? "ready" : firstOpenIndex === index ? "current" : "open";
      return {
        id: phase.id,
        title: phase.title,
        status,
        openCount: phase.rows.length,
        detail: phase.rows.length === 0 ? phase.emptyDetail : phase.rows[0].detail,
        nextAction: phase.nextAction,
        targetTab: phase.targetTab,
      };
    });
  }, [productionLaunchSignOffReady, productionRolloutQueueRows]);
  const productionChecklistRows = useMemo<ProductionChecklistRow[]>(() => {
    const systemBlocked = productionReadinessIssues.some(
      (issue) => issue.area === "system" && issue.severity === "blocked"
    );
    const systemReview = productionReadinessIssues.some((issue) => issue.area === "system");
    const operationsBlocked = productionReadinessIssues.some(
      (issue) => issue.area === "operations" && issue.severity === "blocked"
    );
    const operationsReview = productionReadinessIssues.some((issue) => issue.area === "operations");
    const releaseBlocked = productionReadinessIssues.some(
      (issue) => issue.area === "release" && issue.severity === "blocked"
    );
    const releaseReview = productionReadinessIssues.some((issue) => issue.area === "release");
    const accessBlocked = accessGoLiveGate.status === "blocked";
    const accessReview = accessGoLiveGate.status === "review" || accessGoLiveGate.status === "empty";
    const backupSignedOff = productionLaunchSignOff.backupRestoreReviewed;
    const pilotScopeSignedOff = productionLaunchSignOff.pilotScopeConfirmed;

    return [
      {
        id: "system-health",
        label: "System diagnostics",
        status: !typedDiagnostics ? "blocked" : systemBlocked ? "blocked" : systemReview ? "review" : "ready",
        detail: !typedDiagnostics
          ? "System diagnostics have not been loaded yet."
          : healthAttentionChecks.length === 0
            ? "System diagnostics are clear enough for pilot rollout."
            : `${healthAttentionChecks.length} diagnostics item${healthAttentionChecks.length === 1 ? "" : "s"} still need attention.`,
        evidence: !typedDiagnostics
          ? "No diagnostics snapshot loaded"
          : `${typedDiagnostics.summary.error} errors, ${typedDiagnostics.summary.attention} attention, checked ${new Date(
              typedDiagnostics.checkedAt
            ).toLocaleString("en-ZA")}`,
        nextAction: !typedDiagnostics
          ? "Run diagnostics and confirm the system snapshot loads."
          : systemBlocked
            ? "Resolve the blocked diagnostics and schema issues first."
            : systemReview
              ? "Review the attention-state diagnostics and accept or clear them."
              : "No action required.",
        targetTab: "health",
        target: "diagnostics",
      },
      {
        id: "operational-readiness",
        label: "Operational readiness",
        status: !typedOperationalReadiness
          ? "blocked"
          : operationsBlocked
            ? "blocked"
            : operationsReview
              ? "review"
              : "ready",
        detail: !typedOperationalReadiness
          ? "Operational readiness has not been loaded yet."
          : typedOperationalReadiness.summary.critical > 0
            ? `${typedOperationalReadiness.summary.critical} critical operational issue${typedOperationalReadiness.summary.critical === 1 ? "" : "s"} remain open.`
            : typedOperationalReadiness.summary.warning > 0
              ? `${typedOperationalReadiness.summary.warning} warning-level operational issue${typedOperationalReadiness.summary.warning === 1 ? "" : "s"} still need review.`
              : "Operational checks are clear enough for pilot rollout.",
        evidence: !typedOperationalReadiness
          ? "No operational snapshot loaded"
          : `Ready score ${typedOperationalReadiness.summary.readyScore}% across ${typedOperationalReadiness.summary.affectedAreas} affected area(s)`,
        nextAction: !typedOperationalReadiness
          ? "Refresh the operational readiness checks."
          : operationsBlocked
            ? "Clear the critical operational blockers first."
            : operationsReview
              ? "Review the warning-level operational issues and decide on each one."
              : "No action required.",
        targetTab: "health",
        target: "operational-readiness",
      },
      {
        id: "access-rollout",
        label: "Access rollout",
        status: accessBlocked
          ? "blocked"
          : accessReview || !accessLaunchSignOffReady
            ? "review"
            : productionLaunchSignOff.accessRolloutConfirmed
              ? "signed_off"
              : "ready",
        detail: accessBlocked
          ? accessGoLiveGate.detail
          : accessReview
            ? accessGoLiveGate.detail
            : !accessLaunchSignOffReady
              ? "Access audit is clear, but access launch sign-off is still open."
              : productionLaunchSignOff.accessRolloutConfirmed
                ? "Access rollout is clear and signed off."
                : "Access rollout is clear and ready for final sign-off.",
        evidence: `Gate: ${accessGoLiveGate.label} | blocked ${accessGoLiveGate.blockedCount} | review ${accessGoLiveGate.reviewCount}`,
        nextAction: accessBlocked
          ? accessGoLiveGate.blockedRow?.nextAction ?? "Open Access and clear the rollout blockers."
          : accessReview
            ? accessGoLiveGate.reviewRow?.nextAction ?? "Open Access and review the remaining rollout items."
            : !accessLaunchSignOffReady
              ? "Complete the Access Launch Sign-Off items."
              : productionLaunchSignOff.accessRolloutConfirmed
                ? "No action required."
                : "Tick the final access rollout sign-off item when confirmed.",
        targetTab: "access",
        target: "access-signoff",
      },
      {
        id: "backup-restore",
        label: "Backup and restore evidence",
        status: backupSignedOff ? "signed_off" : "review",
        detail: backupSignedOff
          ? "Backup and restore evidence has been reviewed and signed off."
          : "Backup and restore checks still need explicit admin sign-off.",
        evidence: `${typedRestoreHistory.length} maintenance entr${typedRestoreHistory.length === 1 ? "y" : "ies"} recorded`,
        nextAction: backupSignedOff
          ? "No action required."
          : "Review the backup JSON, transfer pack, and restore path, then sign off this item.",
        targetTab: "health",
        target: "launch-signoff",
      },
      {
        id: "release-config",
        label: "Release configuration",
        status: releaseBlocked
          ? "blocked"
          : releaseReview
            ? "review"
            : productionLaunchSignOff.releaseConfigConfirmed
              ? "signed_off"
              : "ready",
        detail: releaseBlocked
          ? "Release configuration still has a live rollout blocker."
          : releaseReview
            ? "Release configuration still has review items to confirm."
            : productionLaunchSignOff.releaseConfigConfirmed
              ? "Release configuration has been signed off."
              : "Release configuration checks are clear and ready for sign-off.",
        evidence: releaseReview
          ? productionReadinessIssues
              .filter((issue) => issue.area === "release")
              .map((issue) => issue.detail)
              .join(" | ")
          : "Hosted URL, notifications, and deployment configuration currently look clear",
        nextAction: releaseBlocked
          ? productionReadinessIssues.find((issue) => issue.area === "release")?.nextAction ??
            "Clear the release configuration blocker."
          : releaseReview
            ? productionReadinessIssues.find((issue) => issue.area === "release")?.nextAction ??
              "Review the release configuration items."
            : productionLaunchSignOff.releaseConfigConfirmed
              ? "No action required."
              : "Confirm the hosted URL, notification targets, and deployment settings, then sign off.",
        targetTab: "health",
        target: "launch-signoff",
      },
      {
        id: "pilot-decision",
        label: "Pilot scope and final sign-off",
        status: productionLaunchSignOffReady
          ? "signed_off"
          : pilotScopeSignedOff && productionRolloutQueueRows.length === 0
            ? "ready"
            : "review",
        detail: productionLaunchSignOffReady
          ? "Pilot scope is agreed and the final production sign-off is complete."
          : pilotScopeSignedOff
            ? "Pilot scope is agreed, but the final release sign-off still needs to be completed."
            : "Pilot users, clients, and branches still need to be explicitly confirmed.",
        evidence: `Launch sign-off ${productionLaunchSignOffItems.filter((item) => productionLaunchSignOff[item.key]).length}/${productionLaunchSignOffItems.length} complete`,
        nextAction: productionLaunchSignOffReady
          ? "Pilot rollout can proceed."
          : pilotScopeSignedOff
            ? "Finish the remaining release sign-off items."
            : "Confirm the first pilot users, clients, and branches, then sign off the pilot scope.",
        targetTab: "health",
        target: "launch-signoff",
      },
    ];
  }, [
    accessGoLiveGate,
    accessLaunchSignOffReady,
    healthAttentionChecks.length,
    productionLaunchSignOff,
    productionLaunchSignOffItems,
    productionLaunchSignOffReady,
    productionReadinessIssues,
    productionRolloutQueueRows.length,
    typedDiagnostics,
    typedOperationalReadiness,
    typedRestoreHistory.length,
  ]);
  const accessLaunchQueueRows = useMemo<AccessLaunchQueueRow[]>(() => {
    const clientRows = accessRolloutRows.map((row) => ({
      id: `client-${row.clientId}`,
      clientId: row.clientId,
      queueType: "client" as const,
      status: row.status,
      subject: row.companyName,
      detail: row.primaryIssue,
      nextAction: row.nextAction,
      owner: "admin" as const,
      source: "Client rollout",
      priority: row.status === "blocked" ? 500 + row.blockerCount : row.status === "review" ? 300 + row.warningCount : 100,
    }));

    const signOffRows = accessLaunchSignOffItems
      .filter((item) => item.blocked || !accessLaunchSignOff[item.key])
      .map((item, index) => ({
        id: `signoff-${item.key}`,
        clientId: null,
        queueType: "launch_signoff" as const,
        status: item.blocked ? "blocked" as const : "review" as const,
        subject: item.label,
        detail: item.description,
        nextAction: item.blocked ? "Clear the live blocker first, then sign off the item." : "Review the item and sign it off.",
        owner: "admin" as const,
        source: "Launch sign-off",
        priority: item.blocked ? 700 - index : 250 - index,
      }));

    return [...signOffRows, ...clientRows].sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority;
      }
      return left.subject.localeCompare(right.subject);
    });
  }, [accessLaunchSignOff, accessLaunchSignOffItems, accessRolloutRows]);
  const accessLaunchQueueSummary = useMemo(
    () => ({
      total: accessLaunchQueueRows.length,
      blocked: accessLaunchQueueRows.filter((row) => row.status === "blocked").length,
      review: accessLaunchQueueRows.filter((row) => row.status === "review").length,
      ready: accessLaunchQueueRows.filter((row) => row.status === "ready").length,
    }),
    [accessLaunchQueueRows]
  );
  const filteredAccessLaunchQueueRows = useMemo(() => {
    switch (accessLaunchQueueFilter) {
      case "blocked":
        return accessLaunchQueueRows.filter((row) => row.status === "blocked");
      case "review":
        return accessLaunchQueueRows.filter((row) => row.status === "review");
      case "client":
        return accessLaunchQueueRows.filter((row) => row.queueType === "client");
      case "signoff":
        return accessLaunchQueueRows.filter((row) => row.queueType === "launch_signoff");
      default:
        return accessLaunchQueueRows;
    }
  }, [accessLaunchQueueFilter, accessLaunchQueueRows]);
  const accessLaunchQueueGate = useMemo(() => {
    const nextBlocked = accessLaunchQueueRows.find((row) => row.status === "blocked") ?? null;
    const nextReview = accessLaunchQueueRows.find((row) => row.status === "review") ?? null;
    const nextRow = nextBlocked ?? nextReview ?? accessLaunchQueueRows[0] ?? null;

    if (accessLaunchQueueRows.length === 0) {
      return {
        label: "Launch queue clear",
        detail: "No launch queue items are currently open.",
        status: "ready" as const,
        nextRow: null as AccessLaunchQueueRow | null,
      };
    }

    if (nextBlocked) {
      return {
        label: "Launch queue blocked",
        detail: `Blocked launch work remains. Start with ${nextBlocked.subject}.`,
        status: "blocked" as const,
        nextRow,
      };
    }

    return {
      label: "Launch queue in review",
      detail: nextReview
        ? `Review work remains. Start with ${nextReview.subject}.`
        : "Launch queue items still need review.",
      status: "review" as const,
      nextRow,
    };
  }, [accessLaunchQueueRows]);
  const accessLaunchPhaseRows = useMemo<AccessLaunchPhaseRow[]>(() => {
    const blockedCount = accessLaunchQueueRows.filter((row) => row.status === "blocked").length;
    const reviewCount = accessLaunchQueueRows.filter((row) => row.status === "review").length;
    const signOffOpenCount = accessLaunchSignOffItems.filter(
      (item) => item.blocked || !accessLaunchSignOff[item.key]
    ).length;

    const cleanupStatus: AccessLaunchPhaseRow["status"] =
      blockedCount > 0 ? "current" : reviewCount > 0 || signOffOpenCount > 0 ? "ready" : accessLaunchSignOffReady ? "ready" : "ready";
    const reviewStatus: AccessLaunchPhaseRow["status"] =
      blockedCount > 0 ? "open" : reviewCount > 0 ? "current" : signOffOpenCount > 0 ? "ready" : "ready";
    const signOffStatus: AccessLaunchPhaseRow["status"] =
      blockedCount > 0 || reviewCount > 0 ? "open" : signOffOpenCount > 0 ? "current" : "ready";
    const decisionStatus: AccessLaunchPhaseRow["status"] =
      blockedCount > 0 || reviewCount > 0 || signOffOpenCount > 0 ? "open" : "ready";

    return [
      {
        id: "cleanup",
        phase: "1. Access Cleanup",
        status: cleanupStatus,
        openCount: blockedCount,
        detail:
          blockedCount > 0
            ? `${blockedCount} blocked launch item${blockedCount === 1 ? "" : "s"} still need remediation.`
            : "Blocked access launch items are clear.",
        nextAction:
          blockedCount > 0
            ? "Clear blocked client or sign-off items first."
            : "Cleanup phase is clear.",
        targetFilter: "blocked",
      },
      {
        id: "review",
        phase: "2. Review Clearance",
        status: reviewStatus,
        openCount: reviewCount,
        detail:
          reviewCount > 0
            ? `${reviewCount} review item${reviewCount === 1 ? "" : "s"} still need checking.`
            : "Review-stage launch items are clear.",
        nextAction:
          reviewCount > 0
            ? "Work through review clients and accepted launch items."
            : "Review phase is clear.",
        targetFilter: "review",
      },
      {
        id: "signoff",
        phase: "3. Final Sign-Off",
        status: signOffStatus,
        openCount: signOffOpenCount,
        detail:
          signOffOpenCount > 0
            ? `${signOffOpenCount} launch sign-off item${signOffOpenCount === 1 ? "" : "s"} still open.`
            : "Launch sign-off is complete.",
        nextAction:
          signOffOpenCount > 0
            ? "Complete the remaining launch sign-off items."
            : "Sign-off phase is clear.",
        targetFilter: "signoff",
      },
      {
        id: "decision",
        phase: "4. Launch Decision",
        status: decisionStatus,
        openCount: accessLaunchSignOffReady ? 0 : blockedCount + reviewCount + signOffOpenCount,
        detail: accessLaunchSignOffReady
          ? "Access rollout is ready for client portal launch."
          : "Launch decision is still blocked by open rollout or sign-off work.",
        nextAction: accessLaunchSignOffReady
          ? "Use the launch sign-off as the final release record."
          : "Clear earlier phases before making the launch decision.",
        targetFilter: "all",
      },
    ];
  }, [accessLaunchQueueRows, accessLaunchSignOff, accessLaunchSignOffItems, accessLaunchSignOffReady]);
  const currentAccessLaunchPhase = useMemo(
    () => accessLaunchPhaseRows.find((phase) => phase.status === "current") ?? accessLaunchPhaseRows.find((phase) => phase.status === "open") ?? null,
    [accessLaunchPhaseRows]
  );
  const currentAccessLaunchPhaseTasks = useMemo<AccessLaunchPhaseTaskRow[]>(() => {
    if (!currentAccessLaunchPhase) return [];

    if (currentAccessLaunchPhase.id === "cleanup") {
      return accessLaunchQueueRows
        .filter((row) => row.status === "blocked")
        .map((row) => ({
          id: `phase-task-${row.id}`,
          phaseId: "cleanup",
          subject: row.subject,
          detail: row.detail,
          nextAction: row.nextAction,
          status: "blocked" as const,
          targetFilter: row.queueType === "launch_signoff" ? "signoff" : "blocked",
          clientId: row.clientId,
        }));
    }

    if (currentAccessLaunchPhase.id === "review") {
      return accessLaunchQueueRows
        .filter((row) => row.status === "review")
        .map((row) => ({
          id: `phase-task-${row.id}`,
          phaseId: "review",
          subject: row.subject,
          detail: row.detail,
          nextAction: row.nextAction,
          status: "review" as const,
          targetFilter: row.queueType === "launch_signoff" ? "signoff" : "review",
          clientId: row.clientId,
        }));
    }

    if (currentAccessLaunchPhase.id === "signoff") {
      return accessLaunchSignOffItems
        .filter((item) => item.blocked || !accessLaunchSignOff[item.key])
        .map((item) => ({
          id: `phase-task-signoff-${item.key}`,
          phaseId: "signoff",
          subject: item.label,
          detail: item.description,
          nextAction: item.blocked ? "Clear the blocker before sign-off." : "Review and sign off the item.",
          status: item.blocked ? "blocked" as const : "review" as const,
          targetFilter: "signoff" as const,
          clientId: null,
        }));
    }

    return [
      {
        id: "phase-task-decision",
        phaseId: "decision",
        subject: accessLaunchSignOffReady ? "Launch decision ready" : "Launch decision blocked",
        detail: accessLaunchSignOffReady
          ? "Access rollout is ready for client portal launch."
          : "Earlier launch phases still need to be cleared before launch.",
        nextAction: accessLaunchSignOffReady
          ? "Use the launch sign-off record as the final release decision."
          : "Return to the earlier open phase and clear the remaining items.",
        status: accessLaunchSignOffReady ? "review" as const : "blocked" as const,
        targetFilter: "all" as const,
        clientId: null,
      },
    ];
  }, [accessLaunchQueueRows, accessLaunchSignOff, accessLaunchSignOffItems, accessLaunchSignOffReady, currentAccessLaunchPhase]);
  const currentAccessLaunchPhaseGate = useMemo(() => {
    if (!currentAccessLaunchPhase) {
      return {
        status: "ready" as const,
        label: "Current phase clear",
        detail: "No launch phase is currently open.",
        blockedCount: 0,
        reviewCount: 0,
        clientTaskCount: 0,
        signOffTaskCount: 0,
        nextTask: null as AccessLaunchPhaseTaskRow | null,
      };
    }

    const blockedCount = currentAccessLaunchPhaseTasks.filter((task) => task.status === "blocked").length;
    const reviewCount = currentAccessLaunchPhaseTasks.filter((task) => task.status === "review").length;
    const clientTaskCount = currentAccessLaunchPhaseTasks.filter((task) => task.clientId !== null).length;
    const signOffTaskCount = currentAccessLaunchPhaseTasks.filter((task) => task.clientId === null).length;
    const nextTask =
      currentAccessLaunchPhaseTasks.find((task) => task.status === "blocked") ??
      currentAccessLaunchPhaseTasks.find((task) => task.status === "review") ??
      null;

    if (blockedCount > 0) {
      return {
        status: "blocked" as const,
        label: "Current phase blocked",
        detail: `${blockedCount} blocked task${blockedCount === 1 ? "" : "s"} remain in ${currentAccessLaunchPhase.phase}.`,
        blockedCount,
        reviewCount,
        clientTaskCount,
        signOffTaskCount,
        nextTask,
      };
    }

    if (reviewCount > 0) {
      return {
        status: "review" as const,
        label: "Current phase in review",
        detail: `${reviewCount} review task${reviewCount === 1 ? "" : "s"} remain in ${currentAccessLaunchPhase.phase}.`,
        blockedCount,
        reviewCount,
        clientTaskCount,
        signOffTaskCount,
        nextTask,
      };
    }

    return {
      status: "ready" as const,
      label: "Current phase clear",
      detail: `${currentAccessLaunchPhase.phase} is clear.`,
      blockedCount,
      reviewCount,
      clientTaskCount,
      signOffTaskCount,
      nextTask,
    };
  }, [currentAccessLaunchPhase, currentAccessLaunchPhaseTasks]);
  const currentAccessLaunchPhaseDecision = useMemo(() => {
    if (!currentAccessLaunchPhase) {
      return {
        label: "Launch phases clear",
        detail: "No access launch phase is currently open.",
        nextAction: "Use the access launch sign-off as the final release record.",
        targetFilter: "all" as const,
      };
    }

    if (currentAccessLaunchPhaseGate.status === "blocked" && currentAccessLaunchPhaseGate.nextTask) {
      return {
        label: "Clear blocked task",
        detail: `${currentAccessLaunchPhaseGate.nextTask.subject} is blocking ${currentAccessLaunchPhase.phase}.`,
        nextAction: currentAccessLaunchPhaseGate.nextTask.nextAction,
        targetFilter: currentAccessLaunchPhaseGate.nextTask.targetFilter,
      };
    }

    if (currentAccessLaunchPhaseGate.status === "review" && currentAccessLaunchPhaseGate.nextTask) {
      return {
        label: "Work review task",
        detail: `${currentAccessLaunchPhaseGate.nextTask.subject} is the next review item in ${currentAccessLaunchPhase.phase}.`,
        nextAction: currentAccessLaunchPhaseGate.nextTask.nextAction,
        targetFilter: currentAccessLaunchPhaseGate.nextTask.targetFilter,
      };
    }

    const currentIndex = accessLaunchPhaseRows.findIndex((phase) => phase.id === currentAccessLaunchPhase.id);
    const nextPhase = currentIndex >= 0 ? accessLaunchPhaseRows[currentIndex + 1] ?? null : null;

    if (nextPhase) {
      return {
        label: "Advance to next phase",
        detail: `${currentAccessLaunchPhase.phase} is clear. Move into ${nextPhase.phase}.`,
        nextAction: nextPhase.nextAction,
        targetFilter: nextPhase.targetFilter,
      };
    }

    return {
      label: "Finalize launch decision",
      detail: "Earlier access launch phases are clear.",
      nextAction: "Use the launch sign-off and go-live gate to record the final launch decision.",
      targetFilter: "all" as const,
    };
  }, [accessLaunchPhaseRows, currentAccessLaunchPhase, currentAccessLaunchPhaseGate]);
  const currentAccessLaunchPhaseDecisionBasis = useMemo(() => {
    const currentPhaseIndex = currentAccessLaunchPhase
      ? accessLaunchPhaseRows.findIndex((phase) => phase.id === currentAccessLaunchPhase.id)
      : -1;
    const nextPhase =
      currentPhaseIndex >= 0 ? accessLaunchPhaseRows[currentPhaseIndex + 1] ?? null : null;

    if (!currentAccessLaunchPhase) {
      return [
        {
          label: "No current launch phase is open",
          met: true,
        },
        {
          label: "Earlier access launch phases are clear",
          met: accessLaunchQueueRows.length === 0,
        },
      ];
    }

    if (currentAccessLaunchPhaseDecision.label === "Clear blocked task") {
      return [
        {
          label: `${currentAccessLaunchPhase.phase} still has blocked tasks`,
          met: currentAccessLaunchPhaseGate.blockedCount > 0,
        },
        {
          label: "A next blocked task is available",
          met: Boolean(currentAccessLaunchPhaseGate.nextTask),
        },
        {
          label: "Blocked work takes precedence over review or phase advance",
          met: currentAccessLaunchPhaseGate.blockedCount >= 0,
        },
      ];
    }

    if (currentAccessLaunchPhaseDecision.label === "Work review task") {
      return [
        {
          label: "No blocked task remains in the current phase",
          met: currentAccessLaunchPhaseGate.blockedCount === 0,
        },
        {
          label: `${currentAccessLaunchPhase.phase} still has review tasks`,
          met: currentAccessLaunchPhaseGate.reviewCount > 0,
        },
        {
          label: "A next review task is available",
          met: Boolean(currentAccessLaunchPhaseGate.nextTask),
        },
      ];
    }

    if (currentAccessLaunchPhaseDecision.label === "Advance to next phase") {
      return [
        {
          label: `${currentAccessLaunchPhase.phase} has no blocked tasks`,
          met: currentAccessLaunchPhaseGate.blockedCount === 0,
        },
        {
          label: `${currentAccessLaunchPhase.phase} has no review tasks`,
          met: currentAccessLaunchPhaseGate.reviewCount === 0,
        },
        {
          label: "A next rollout phase is available",
          met: Boolean(nextPhase),
        },
      ];
    }

    return [
      {
        label: "Blocked launch work is clear",
        met: accessLaunchQueueSummary.blocked === 0,
      },
      {
        label: "Review launch work is clear",
        met: accessLaunchQueueSummary.review === 0,
      },
      {
        label: "Launch sign-off is complete",
        met: accessLaunchSignOffReady,
      },
    ];
  }, [
    accessLaunchPhaseRows,
    accessLaunchQueueRows.length,
    accessLaunchQueueSummary.blocked,
    accessLaunchQueueSummary.review,
    accessLaunchSignOffReady,
    currentAccessLaunchPhase,
    currentAccessLaunchPhaseDecision.label,
    currentAccessLaunchPhaseGate.blockedCount,
    currentAccessLaunchPhaseGate.nextTask,
    currentAccessLaunchPhaseGate.reviewCount,
  ]);
  const canManageAccessAuditRow = useCallback(
    (row: Pick<AccessAuditRow, "role" | "userId">) =>
      row.role !== "super_admin" || user?.role === "super_admin",
    [user?.role]
  );
  const openAccessAuditClientUsers = useCallback((clientId: number) => {
    setAccessAuditClientFilter(String(clientId));
    setAccessAuditFocus("all");
  }, []);
  const accessQueueColumns: Column<AccessAuditQueueRow>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{value || row.email || `User ${row.userId}`}</div>
          <div className="text-xs text-muted-foreground">{row.issue}</div>
        </div>
      ),
    },
    {
      key: "recommendation",
      label: "Recommended Action",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) >= 4 ? "destructive" : Number(value) >= 3 ? "secondary" : "outline"}>
          P{value}
        </Badge>
      ),
    },
  ];
  const clientAccessMatrixColumns: Column<AccessAuditClientMatrixRow>[] = [
    {
      key: "companyName",
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "allocatedUserCount",
      label: "Allocated Users",
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{value}</div>
          <div className="text-xs text-muted-foreground">
            {row.managerCount} manager / {row.viewerCount} viewer
          </div>
        </div>
      ),
    },
    {
      key: "restrictedUserCount",
      label: "Scope",
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1">
          <div className="font-medium">
            {row.fullScopeUserCount} full / {row.restrictedUserCount} restricted
          </div>
          <div className="text-xs text-muted-foreground">
            Branch scope mix for this client portal
          </div>
        </div>
      ),
    },
    {
      key: "flaggedUserCount",
      label: "Exposure Flags",
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.flaggedUserCount > 0 ? "destructive" : "secondary"}>
            {row.flaggedUserCount} flagged
          </Badge>
          {row.suspendedUserCount > 0 ? <Badge variant="outline">{row.suspendedUserCount} suspended</Badge> : null}
          {row.passwordPendingUserCount > 0 ? (
            <Badge variant="outline">{row.passwordPendingUserCount} password pending</Badge>
          ) : null}
          {row.neverSignedInUserCount > 0 ? (
            <Badge variant="outline">{row.neverSignedInUserCount} never signed in</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "recommendation",
      label: "Recommended Review",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
  ];
  const clientAccessGapColumns: Column<AccessAuditClientGapRow>[] = [
    {
      key: "companyName",
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "issue",
      label: "Issue",
      sortable: true,
    },
    {
      key: "recommendation",
      label: "Recommended Action",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
    {
      key: "severity",
      label: "Severity",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) >= 4 ? "destructive" : Number(value) >= 3 ? "secondary" : "outline"}>
          S{value}
        </Badge>
      ),
    },
  ];
  const branchScopeColumns: Column<AccessAuditBranchScopeRow>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{value || row.email || `User ${row.userId}`}</div>
          <div className="text-xs text-muted-foreground">
            {row.companyName} Â· {row.accessLevel === "manager" ? "Manager" : "Viewer"}
          </div>
        </div>
      ),
    },
    {
      key: "scopeLabel",
      label: "Branch Scope",
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="flex flex-wrap gap-1">
            <Badge variant={row.fullBranchAccess ? "secondary" : "outline"}>
              {row.fullBranchAccess ? "Full scope" : "Restricted"}
            </Badge>
            {row.receiveReminders ? <Badge variant="outline">Reminders</Badge> : null}
          </div>
        </div>
      ),
    },
    {
      key: "loginEnabled",
      label: "Login State",
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.loginEnabled ? "secondary" : "destructive"}>
            {row.loginEnabled ? "Active" : "Suspended"}
          </Badge>
          {row.mustChangePassword ? <Badge variant="outline">Password pending</Badge> : null}
        </div>
      ),
    },
    {
      key: "recommendation",
      label: "Recommended Review",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
  ];
  const branchScopeQueueColumns: Column<AccessAuditBranchScopeQueueRow>[] = [
    {
      key: "name",
      label: "Assignment",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{value || row.email || `User ${row.userId}`}</div>
          <div className="text-xs text-muted-foreground">{row.companyName}</div>
        </div>
      ),
    },
    {
      key: "issue",
      label: "Issue",
      sortable: true,
      render: (value) => <span className="text-sm">{String(value)}</span>,
    },
    {
      key: "recommendation",
      label: "Recommended Action",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) >= 4 ? "destructive" : Number(value) >= 3 ? "secondary" : "outline"}>
          P{value}
        </Badge>
      ),
    },
  ];
  const branchCoverageColumns: Column<AccessAuditBranchCoverageRow>[] = [
    {
      key: "companyName",
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "coverageStatus",
      label: "Coverage",
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">
            {row.activeBranches} active / {row.totalBranches} total branches
          </div>
        </div>
      ),
    },
    {
      key: "activeAssignedUsers",
      label: "Active Access",
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.activeAssignedUsers} active users</div>
          <div className="text-xs text-muted-foreground">
            {row.activeManagerCount} manager / {row.activeFullScopeCount} full / {row.activeRestrictedCount} restricted
          </div>
        </div>
      ),
    },
    {
      key: "uncoveredBranchCount",
      label: "Uncovered Branches",
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.uncoveredBranchCount}</div>
          <div className="text-xs text-muted-foreground">
            {row.uncoveredBranchNames.length > 0 ? row.uncoveredBranchNames.slice(0, 3).join(", ") : "None"}
          </div>
        </div>
      ),
    },
    {
      key: "recommendation",
      label: "Recommended Review",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
  ];
  const branchCoverageQueueColumns: Column<AccessAuditBranchCoverageQueueRow>[] = [
    {
      key: "companyName",
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "issue",
      label: "Issue",
      sortable: true,
      render: (value) => <span className="text-sm">{String(value)}</span>,
    },
    {
      key: "recommendation",
      label: "Recommended Action",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) >= 4 ? "destructive" : Number(value) >= 3 ? "secondary" : "outline"}>
          P{value}
        </Badge>
      ),
    },
  ];
  const accessRemediationColumns: Column<AccessAuditRemediationRow>[] = [
    {
      key: "scopeLabel",
      label: "Queue",
      sortable: true,
      render: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "subjectLabel",
      label: "Subject",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.issue}</div>
        </div>
      ),
    },
    {
      key: "recommendation",
      label: "Recommended Action",
      render: (value) => <span className="text-sm text-muted-foreground">{String(value)}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) >= 5 ? "destructive" : Number(value) >= 4 ? "secondary" : "outline"}>
          P{value}
        </Badge>
      ),
    },
  ];
  const accessRolloutColumns: Column<AccessAuditRolloutRow>[] = [
    {
      key: "companyName",
      label: "Client",
      sortable: true,
      filterable: true,
    },
    {
      key: "status",
      label: "Rollout Status",
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <Badge
            variant={
              value === "blocked"
                ? "destructive"
                : value === "review"
                  ? "secondary"
                  : "outline"
            }
          >
            {value === "blocked" ? "Blocked" : value === "review" ? "Review" : "Ready"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.blockerCount} blocker / {row.warningCount} warning
          </div>
        </div>
      ),
    },
    {
      key: "allocatedUserCount",
      label: "Coverage",
      sortable: true,
      render: (_, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.allocatedUserCount} allocated users</div>
          <div className="text-xs text-muted-foreground">
            {row.activeManagerCount} manager / {row.uncoveredBranchCount} uncovered branches
          </div>
        </div>
      ),
    },
    {
      key: "primaryIssue",
      label: "Primary Issue",
      render: (value, row) => (
        <div className="space-y-1">
          <div className="text-sm">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.nextAction}</div>
        </div>
      ),
    },
  ];
  const accessLaunchQueueColumns: Column<AccessLaunchQueueRow>[] = [
    {
      key: "subject",
      label: "Launch Item",
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
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "blocked"
              ? "destructive"
              : value === "review"
                ? "secondary"
                : "outline"
          }
        >
          {value === "blocked" ? "Blocked" : value === "review" ? "Review" : "Ready"}
        </Badge>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      render: (value, row) => (
        <div className="space-y-1">
          <div className="text-sm">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.nextAction}</div>
        </div>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      sortable: true,
      render: () => <Badge variant="outline">Admin</Badge>,
    },
  ];
  const accessLaunchPhaseTaskColumns: Column<AccessLaunchPhaseTaskRow>[] = [
    {
      key: "subject",
      label: "Phase Task",
      sortable: true,
      filterable: true,
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "blocked" ? "destructive" : "secondary"}>
          {value === "blocked" ? "Blocked" : "Review"}
        </Badge>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      render: (value, row) => (
        <div className="space-y-1">
          <div className="text-sm">{String(value)}</div>
          <div className="text-xs text-muted-foreground">{row.nextAction}</div>
        </div>
      ),
    },
  ];
  const accessAuditColumns: Column<AccessAuditRow>[] = [
    {
      key: "name",
      label: "User",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{value || row.email || `User ${row.userId}`}</div>
          <div className="text-xs text-muted-foreground">{row.internalAccessLabel}</div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
      render: (value) => value || "-",
    },
    {
      key: "portalStatusLabel",
      label: "Portal Status",
      sortable: true,
      filterable: true,
      render: (_, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.portalStatusLabel}</div>
          <div className="text-xs text-muted-foreground">{row.scopeSummary}</div>
        </div>
      ),
    },
    {
      key: "clientAssignments",
      label: "Allocations",
      render: (value) => {
        const assignments = value as AccessAuditClientAssignment[];
        if (!assignments.length) return <span className="text-muted-foreground">No client allocations</span>;
        return (
          <div className="space-y-2">
            {assignments.slice(0, 3).map((assignment) => (
              <div key={`${assignment.clientId}-${assignment.companyName}`} className="space-y-1">
                <div className="text-sm font-medium">{assignment.companyName}</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{assignment.accessLevel}</Badge>
                  <Badge variant="outline">
                    {assignment.fullBranchAccess
                      ? "All branches"
                      : `${assignment.scopedBranchCount}/${assignment.totalClientBranches || assignment.scopedBranchCount} branches`}
                  </Badge>
                  {assignment.receiveReminders ? <Badge variant="secondary">Reminders</Badge> : null}
                </div>
              </div>
            ))}
            {assignments.length > 3 ? (
              <div className="text-xs text-muted-foreground">
                +{assignments.length - 3} more allocation(s)
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "loginEnabled",
      label: "Login",
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={row.loginEnabled ? "secondary" : "destructive"}>
            {row.loginEnabled ? "Active" : "Suspended"}
          </Badge>
          {row.mustChangePassword ? <Badge variant="outline">Password change pending</Badge> : null}
        </div>
      ),
    },
    {
      key: "lastSignedIn",
      label: "Last Sign-In",
      sortable: true,
      render: (value) =>
        value ? new Date(value as Date | string).toLocaleString() : "Never signed in",
    },
    {
      key: "accessFlags",
      label: "Conflicts",
      render: (value) => {
        const flags = value as string[];
        if (!flags.length) return <Badge variant="secondary">Clear</Badge>;
        return (
          <div className="flex flex-wrap gap-1">
            {flags.map((flag) => (
              <Badge key={flag} variant="outline">
                {flag}
              </Badge>
            ))}
          </div>
        );
      },
    },
  ];

  const roleColumns: Column<RoleSummary>[] = [
    { key: "name", label: "Role", sortable: true, filterable: true },
    { key: "description", label: "Description", sortable: false },
    { key: "userCount", label: "Users", sortable: true, render: (value) => `${value} assigned` },
  ];

  const branchFormFields: FormField[] = [
    { name: "name", label: "Branch Name", type: "text", required: true, placeholder: "Main Office" },
    { name: "code", label: "Branch Code", type: "text", placeholder: "MO" },
    { name: "description", label: "Description", type: "textarea", placeholder: "Branch description" },
    { name: "companyName", label: "Company Name", type: "text", placeholder: "Company name for this branch" },
    { name: "companyDescription", label: "Company Description", type: "textarea", placeholder: "Branch-specific company summary" },
    { name: "logoUrl", label: "Branch Logo", type: "file", accept: "image/*" },
    { name: "primaryColor", label: "Primary Color", type: "text", placeholder: "#0f766e" },
    { name: "secondaryColor", label: "Secondary Color", type: "text", placeholder: "#0f172a" },
  ];

  const superAdminCount = roles.includes("super_admin") ? 1 : 0;
  const canAssignSuperAdmin =
    user?.role === "super_admin" || (user?.role === "admin" && superAdminCount === 0);
  const canManageUserRecord = (targetUser: AppUser) =>
    targetUser.role !== "super_admin" || user?.role === "super_admin";
  const canOpenAccessDialog = (targetUser: AppUser) =>
    targetUser.role !== "super_admin" || user?.role === "super_admin";

  const userFormFields: FormField[] = [
    { name: "name", label: "Display Name", type: "text", required: true, placeholder: "Albert Example" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "user@example.com" },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { value: "user", label: "User" },
        { value: "admin", label: "Admin" },
        ...(canAssignSuperAdmin
          ? [{ value: "super_admin", label: "Super Admin" }]
          : []),
      ],
    },
    { name: "password", label: editingUser ? "New Password" : "Password", type: "password", placeholder: editingUser ? "Leave blank to keep current password" : "Minimum 8 characters" },
    { name: "confirmPassword", label: editingUser ? "Confirm New Password" : "Confirm Password", type: "password", placeholder: "Repeat the password" },
  ];
  const accessPasswordFields: FormField[] = [
    {
      name: "password",
      label: "Temporary Password",
      type: "password",
      required: true,
      placeholder: "Minimum 8 characters",
    },
    {
      name: "confirmPassword",
      label: "Confirm Temporary Password",
      type: "password",
      required: true,
      placeholder: "Repeat the temporary password",
    },
  ];

  const permissionRows = useMemo(
    () => moduleList.map((module) => permissionState[module]).filter(Boolean),
    [moduleList, permissionState]
  );

  const hasAppAccess = permissionRows.some((permission) => permission.canView);
  const canManageBranches = user?.role === "super_admin";

  const handleUserSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const password = String(values.password ?? "").trim();
      const confirmPassword = String(values.confirmPassword ?? "").trim();

      if (!editingUser && password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      if (password && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const payload = {
        name: String(values.name ?? "").trim(),
        email: String(values.email ?? "").trim().toLowerCase(),
        role: values.role as "user" | "admin" | "super_admin",
        password: password || null,
      };

      const savedUser = editingUser
        ? await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: payload,
        })
        : await createUserMutation.mutateAsync(payload);

      if (editingUser) {
        toast.success("User updated successfully");
      } else {
        toast.success("User created successfully");
      }

      if (user?.id === savedUser.id) {
        utils.auth.me.setData(undefined, savedUser);
      }

      const refreshResults = await Promise.allSettled([
        refetchUsers(),
        utils.access.roles.list.invalidate(),
        utils.auth.me.invalidate(),
        utils.access.myAccess.invalidate(),
      ]);

      if (refreshResults.some((result) => result.status === "rejected")) {
        toast.warning("User saved, but the live refresh failed. Refresh the page if the list does not update immediately.");
      }

      setIsUserFormOpen(false);
      setEditingUser(null);
    } catch (err) {
      const message = getSaveErrorMessage(err, "Failed to save user");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBranchSubmit = async (values: Record<string, unknown>) => {
    if (!canManageBranches) {
      toast.error("Only Super Admin can manage branch branding and branch records.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: String(values.name ?? "").trim(),
        code: String(values.code ?? "").trim() || undefined,
        description: String(values.description ?? "").trim() || undefined,
        companyName: String(values.companyName ?? "").trim() || undefined,
        companyDescription: String(values.companyDescription ?? "").trim() || undefined,
        logoUrl: String(values.logoUrl ?? "").trim() || editingBranch?.logoUrl || undefined,
        primaryColor: String(values.primaryColor ?? "").trim() || undefined,
        secondaryColor: String(values.secondaryColor ?? "").trim() || undefined,
      };

      if (editingBranch) {
        await updateBranchMutation.mutateAsync({
          id: editingBranch.id,
          data: payload,
        });
        toast.success("Branch updated successfully");
      } else {
        await createBranchMutation.mutateAsync(payload);
        toast.success("Branch created successfully");
      }

      await refetchBranches();
      setIsBranchFormOpen(false);
      setEditingBranch(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save branch";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const openAuditUserRecord = useCallback(
    (row: AccessAuditRow) => {
      const targetUser = (users as AppUser[]).find((entry) => entry.id === row.userId);
      if (!targetUser) {
        setActiveTab("users");
        return;
      }
      setEditingUser(targetUser);
      setError(null);
      setIsUserFormOpen(true);
      setActiveTab("users");
    },
    [users]
  );
  const handleAccessAuditLoginToggle = useCallback(
    async (row: AccessAuditRow) => {
      if (!canManageAccessAuditRow(row)) {
        toast.error("Only a Super Admin can manage a Super Admin login.");
        return;
      }
      try {
        await updateUserMutation.mutateAsync({
          id: row.userId,
          data: {
            loginEnabled: !row.loginEnabled,
          },
        });
        toast.success(row.loginEnabled ? "User login suspended" : "User login reactivated");
        await Promise.all([refetchAccessAudit(), refetchAccessBranchCoverage(), refetchUsers()]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not update this login state");
      }
    },
    [canManageAccessAuditRow, refetchAccessAudit, refetchAccessBranchCoverage, refetchUsers, updateUserMutation]
  );
  const handleAccessAuditPasswordReset = useCallback(
    async (values: Record<string, unknown>) => {
      if (!accessPasswordTarget) return;
      setAccessPasswordError(null);
      const password = String(values.password ?? "").trim();
      const confirmPassword = String(values.confirmPassword ?? "").trim();
      if (password.length < 8) {
        const message = "Temporary password must be at least 8 characters long.";
        setAccessPasswordError(message);
        throw new Error(message);
      }
      if (password !== confirmPassword) {
        const message = "Temporary passwords do not match.";
        setAccessPasswordError(message);
        throw new Error(message);
      }
      try {
        await updateUserMutation.mutateAsync({
          id: accessPasswordTarget.userId,
          data: {
            password,
            forcePasswordChange: true,
          },
        });
        await Promise.all([refetchAccessAudit(), refetchAccessBranchCoverage(), refetchUsers()]);
        toast.success("Temporary password issued");
        setAccessPasswordTarget(null);
        setAccessPasswordError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Could not issue a temporary password";
        setAccessPasswordError(message);
        toast.error(message);
        throw err;
      }
    },
    [accessPasswordTarget, refetchAccessAudit, refetchAccessBranchCoverage, refetchUsers, updateUserMutation]
  );

  const handlePermissionChange = (
    module: string,
    key: keyof Omit<ModulePermission, "module">,
    value: boolean
  ) => {
    setPermissionState((current) => ({
      ...current,
      [module]: {
        ...(current[module] ?? {
          module,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        }),
        [key]: value,
      },
    }));
  };

  const handleModuleAppAccessChange = (module: string, enabled: boolean) => {
    setPermissionState((current) => ({
      ...current,
      [module]: {
        ...(current[module] ?? {
          module,
          canView: false,
          canCreate: false,
          canEdit: false,
          canDelete: false,
        }),
        canView: enabled,
        canCreate: enabled ? current[module]?.canCreate ?? false : false,
        canEdit: enabled ? current[module]?.canEdit ?? false : false,
        canDelete: enabled ? current[module]?.canDelete ?? false : false,
      },
    }));
  };

  const handleAppAccessToggle = (enabled: boolean) => {
    const nextState: Record<string, ModulePermission> = {};
    for (const module of moduleList) {
      nextState[module] = {
        module,
        canView: enabled,
        canCreate: enabled,
        canEdit: enabled,
        canDelete: enabled,
      };
    }
    setPermissionState(nextState);
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;

    setIsSubmitting(true);
    try {
      await savePermissionsMutation.mutateAsync({
        userId: selectedUserForPermissions.id,
        modules: Object.values(permissionState),
      });
      toast.success("Access permissions updated");
      setIsPermissionDialogOpen(false);
      setSelectedUserForPermissions(null);
      setPermissionSeedUserId(null);
      await utils.access.myAccess.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save access permissions";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQualityActionFromReadinessIssue = async (
    issue: OperationalReadinessIssue
  ) => {
    if (!["admin", "super_admin"].includes(user?.role ?? "user")) {
      toast.error("Only Admin or Super Admin can create quality actions from readiness issues.");
      return;
    }

    setCreatingQualityActionIssueId(issue.id);
    try {
      const result = await createQualityActionFromReadinessMutation.mutateAsync({
        fingerprint: issue.fingerprint,
        area: issue.area,
        severity: issue.severity,
        title: issue.title,
        detail: issue.detail,
        action: issue.action,
        recordType: issue.recordType,
        recordId: issue.recordId,
        branchId: issue.branchId,
        branchName: issue.branchName,
        path: issue.path,
      });

      if (result.created) {
        toast.success(
          result.referenceNumber
            ? `Quality Action ${result.referenceNumber} created.`
            : "Quality Action created."
        );
      } else {
        toast.info(
          result.referenceNumber
            ? `Already tracked as ${result.referenceNumber}.`
            : result.message
        );
      }

      await Promise.allSettled([
        utils.quality.list.invalidate(),
        refetchOperationalReadiness(),
      ]);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to create Quality Action from readiness issue."
      );
    } finally {
      setCreatingQualityActionIssueId(null);
    }
  };

  const refetchReminderSweepHistories = async () => {
    await Promise.allSettled([
      refetchQualityReminderRunHistory(),
      refetchClientPortalReminderRunHistory(),
      refetchLevelIIIDocumentReminderRunHistory(),
      refetchLevelIIIReminderRunHistory(),
      refetchPlannerReminderRunHistory(),
      refetchAuditTrail(),
    ]);
  };

  const handleRunQualityReminderSweep = async () => {
    if (!["admin", "super_admin"].includes(user?.role ?? "user")) {
      toast.error("Only Admin or Super Admin can run quality reminders.");
      return;
    }
    try {
      const result = await checkQualityRemindersMutation.mutateAsync();
      await refetchReminderSweepHistories();
      toast.success(
        result.notificationsSent > 0
          ? `Quality reminders sent: ${result.notificationsSent}.`
          : "Quality reminder sweep completed with no notifications to send."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run the quality reminder sweep.");
    }
  };

  const handleRunClientPortalReminderSweep = async () => {
    if (!["admin", "super_admin"].includes(user?.role ?? "user")) {
      toast.error("Only Admin or Super Admin can run client portal reminders.");
      return;
    }
    try {
      const result = await checkClientPortalRemindersMutation.mutateAsync();
      await refetchReminderSweepHistories();
      toast.success(
        result.notificationsSent > 0
          ? `Client portal reminders sent: ${result.notificationsSent}.`
          : "Client portal reminder sweep completed with no notifications to send."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to run the client portal reminder sweep."
      );
    }
  };

  const handleRunLevelIIIDocumentReminderSweep = async () => {
    if (!["admin", "super_admin"].includes(user?.role ?? "user")) {
      toast.error("Only Admin or Super Admin can run Level III document reminders.");
      return;
    }
    try {
      const result = await checkLevelIIIDocumentReviewRemindersMutation.mutateAsync();
      await refetchReminderSweepHistories();
      toast.success(
        result.notificationsSent > 0
          ? `Level III document reminders sent: ${result.notificationsSent}.`
          : "Level III document reminder sweep completed with no notifications to send."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to run the Level III document reminder sweep."
      );
    }
  };

  const handleRunLevelIIICertificateReminderSweep = async () => {
    if (!["admin", "super_admin"].includes(user?.role ?? "user")) {
      toast.error("Only Admin or Super Admin can run Level III certificate reminders.");
      return;
    }

    try {
      const result = await checkLevelIIITechnicianCertificateRemindersMutation.mutateAsync();
      await Promise.allSettled([
        utils.levelIII.technicianCertificates.list.invalidate(),
        refetchOperationalReadiness(),
        refetchReminderSweepHistories(),
      ]);
      toast.success(
        result.notificationsSent > 0
          ? `Level III certificate reminders sent: ${result.notificationsSent}.`
          : "Level III certificate reminder sweep completed with no notifications to send."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to run the Level III certificate reminder sweep."
      );
    }
  };

  const handleRunPlannerReminderSweep = async () => {
    if (!["admin", "super_admin"].includes(user?.role ?? "user")) {
      toast.error("Only Admin or Super Admin can run planner reminders.");
      return;
    }
    try {
      const result = await checkPlannerTimesheetRemindersMutation.mutateAsync();
      await refetchReminderSweepHistories();
      toast.success(
        result.notificationsSent > 0
          ? `Planner reminders sent: ${result.notificationsSent}.`
          : "Planner reminder sweep completed with no notifications to send."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run the planner reminder sweep.");
    }
  };

  const handleOpenLevelIIICertificateQueue = (
    filter: LevelIIICertificateQueueFilterLink
  ) => {
    setLocation(`/level-iii?tab=technicians&certificateQueue=${filter}`);
  };

  const handleDownloadBackupSnapshot = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can export a system backup snapshot.");
      return;
    }

    try {
      const snapshot = await backupSnapshotMutation.mutateAsync();
      const timestamp = new Date(snapshot.generatedAt)
        .toISOString()
        .replace(/[:.]/g, "-");
      downloadJsonFile(snapshot, `textpoint-backup-${timestamp}.json`);
      toast.success(
        `Backup exported: ${snapshot.summary.tableCount} tables, ${snapshot.summary.totalRows} rows.`
      );
      await refetchRestoreHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export backup");
    }
  };

  const handleDownloadTransferReadinessPack = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can export a transfer readiness pack.");
      return;
    }

    try {
      const pack = (await transferReadinessPackMutation.mutateAsync()) as TransferReadinessPack;
      const timestamp = new Date(pack.generatedAt)
        .toISOString()
        .replace(/[:.]/g, "-");
      downloadJsonFile(pack, `textpoint-transfer-readiness-pack-${timestamp}.json`);
      await refetchRestoreHistory();
      toast.success(
        `Transfer pack exported: ${pack.summary.backupTableCount} tables, ${pack.summary.backupTotalRows} rows, ${pack.summary.repairableStatements} schema repair statement(s).`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export transfer readiness pack");
    }
  };

  const handleDownloadSchemaRepairScript = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can export a schema repair script.");
      return;
    }

    try {
      const result = await schemaRepairScriptMutation.mutateAsync();
      downloadTextFile(result.script, result.fileName, "text/sql");
      toast.success(
        result.summary.repairableStatements > 0
          ? `Schema repair script exported: ${result.summary.repairableStatements} statement(s).`
          : "Schema is ready; review script exported with no repair statements."
      );
      await refetchRestoreHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export schema repair script");
    }
  };

  const handleApplySchemaRepair = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can apply schema repairs.");
      return;
    }

    try {
      const result = await schemaRepairApplyMutation.mutateAsync({
        confirmation: schemaRepairConfirmation,
      });
      const typedResult = result as SchemaRepairApplyResult;
      setSchemaRepairApplyResult(typedResult);
      setSchemaRepairConfirmation("");
      if (typedResult.safetySnapshot) {
        const timestamp = new Date(typedResult.appliedAt)
          .toISOString()
          .replace(/[:.]/g, "-");
        downloadJsonFile(
          typedResult.safetySnapshot,
          `textpoint-safety-before-schema-repair-${timestamp}.json`
        );
      }
      await refetchDiagnostics();
      await refetchRestoreHistory();
      toast.success(
        result.summary.appliedStatements > 0
          ? `Schema repair applied: ${result.summary.appliedStatements} statement(s). Safety backup downloaded.`
          : "Schema already matches the application."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply schema repair");
    }
  };

  const resetBackupRestorePreviewState = () => {
    setBackupPreview(null);
    setBackupPreviewError(null);
    setBackupRestorePayload(null);
    setSelectedRestoreTables([]);
    setRestorePlan(null);
    setRestorePreflight(null);
    setRestoreConfirmation("");
    setRestoreApplyResult(null);
  };

  const handlePreviewBackupFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can inspect backup files.");
      return;
    }

    resetBackupRestorePreviewState();

    try {
      const rawContent = await file.text();
      const parsed = JSON.parse(rawContent) as unknown;
      const preview = buildBackupPreview(parsed, file.name);
      setBackupPreview(preview);
      setBackupRestorePayload(parsed);

      if (preview.status === "error") {
        toast.error("Backup file could not be validated.");
      } else if (preview.status === "warning") {
        toast.warning("Backup preview loaded with items to review.");
      } else {
        toast.success("Backup preview loaded successfully.");
      }
    } catch (err) {
      const message =
        err instanceof SyntaxError
          ? "The selected file is not valid JSON."
          : err instanceof Error
            ? err.message
            : "Failed to read the selected backup file.";
      setBackupPreviewError(message);
      toast.error(message);
    }
  };

  const handlePreviewTransferPackFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can inspect transfer packs.");
      return;
    }

    setTransferPackPreview(null);
    setTransferPackPreviewError(null);

    try {
      const rawContent = await file.text();
      const parsed = JSON.parse(rawContent) as unknown;
      const preview = buildTransferPackPreview(parsed, file.name);
      setTransferPackPreview(preview);

      if (preview.status === "error") {
        toast.error("Transfer pack could not be validated.");
      } else if (preview.status === "warning") {
        toast.warning("Transfer pack loaded with items to review.");
      } else {
        toast.success("Transfer pack loaded successfully.");
      }
    } catch (err) {
      const message =
        err instanceof SyntaxError
          ? "The selected file is not valid JSON."
          : err instanceof Error
            ? err.message
            : "Failed to read the selected transfer pack.";
      setTransferPackPreviewError(message);
      toast.error(message);
    }
  };

  const handleLoadTransferPackBackupPreview = () => {
    if (!transferPackPreview?.backupSnapshot || !transferPackPreview.backupPreview) {
      toast.error("This transfer pack does not contain a readable embedded backup.");
      return;
    }

    setBackupPreview(transferPackPreview.backupPreview);
    setBackupPreviewError(null);
    setBackupRestorePayload(transferPackPreview.backupSnapshot);
    setSelectedRestoreTables(
      transferPackPreview.backupPreview.tables
        .map((table) => table.key)
        .filter((key) => EXPECTED_BACKUP_TABLE_KEYS.includes(key))
    );
    setRestorePlan(null);
    setRestorePreflight(null);
    setRestoreConfirmation("");
    setRestoreApplyResult(null);
    toast.success("Embedded backup loaded into the restore preview.");
  };

  const handleDownloadTransferPackReadme = () => {
    if (!transferPackPreview?.readme) return;
    downloadTextFile(transferPackPreview.readme, "textpoint-transfer-pack-readme.txt");
  };

  const handleDownloadTransferPackSchemaSql = () => {
    if (!transferPackPreview?.schemaRepairSql) return;
    downloadTextFile(
      transferPackPreview.schemaRepairSql,
      "textpoint-transfer-pack-schema-repair.sql",
      "text/sql"
    );
  };

  const handleToggleRestoreTable = (tableKey: string, selected: boolean) => {
    setRestorePlan(null);
    setRestorePreflight(null);
    setRestoreApplyResult(null);
    setSelectedRestoreTables((current) => {
      if (selected) {
        return current.includes(tableKey) ? current : [...current, tableKey];
      }
      return current.filter((key) => key !== tableKey);
    });
  };

  const handleSelectAllRestoreTables = () => {
    if (!backupPreview) return;
    setRestorePlan(null);
    setRestorePreflight(null);
    setRestoreApplyResult(null);
    setSelectedRestoreTables(
      backupPreview.tables
        .map((table) => table.key)
        .filter((key) => EXPECTED_BACKUP_TABLE_KEYS.includes(key))
    );
  };

  const handleClearRestoreSelection = () => {
    setRestorePlan(null);
    setRestorePreflight(null);
    setRestoreApplyResult(null);
    setSelectedRestoreTables([]);
  };

  const handleGenerateRestorePlan = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can plan a backup restore.");
      return;
    }

    if (!backupRestorePayload) {
      toast.error("Load a backup JSON first.");
      return;
    }

    if (selectedRestoreTables.length === 0) {
      toast.error("Select at least one table to include in the restore plan.");
      return;
    }

    try {
      const plan = await backupRestorePlanMutation.mutateAsync({
        backup: backupRestorePayload,
        selectedTables: selectedRestoreTables,
        mode: restoreMode,
      });
      setRestorePlan(plan as BackupRestorePlan);
      setRestoreApplyResult(null);
      await refetchRestoreHistory();

      if (plan.status === "blocked") {
        toast.error("Restore plan is blocked. Review the errors shown.");
      } else if (plan.status === "review") {
        toast.warning("Restore plan created with review items.");
      } else {
        toast.success("Restore plan is ready.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate restore plan");
    }
  };

  const handleRunRestorePreflight = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can run a backup restore preflight.");
      return;
    }

    if (!backupRestorePayload) {
      toast.error("Load a backup JSON first.");
      return;
    }

    if (selectedRestoreTables.length === 0) {
      toast.error("Select at least one table to include in the preflight.");
      return;
    }

    try {
      const preflight = await backupRestorePreflightMutation.mutateAsync({
        backup: backupRestorePayload,
        selectedTables: selectedRestoreTables,
        mode: restoreMode,
      });
      setRestorePreflight(preflight as BackupRestorePreflight);
      setRestoreApplyResult(null);
      await refetchRestoreHistory();

      if (preflight.status === "blocked") {
        toast.error("Restore preflight is blocked. Review the errors shown.");
      } else if (preflight.status === "review") {
        toast.warning("Restore preflight completed with review items.");
      } else {
        toast.success("Restore preflight passed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run restore preflight");
    }
  };

  const handleDownloadRestoreScript = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can export a restore script.");
      return;
    }

    if (!backupRestorePayload) {
      toast.error("Load a backup JSON first.");
      return;
    }

    if (selectedRestoreTables.length === 0) {
      toast.error("Select at least one table to include in the restore script.");
      return;
    }

    try {
      const result = await backupRestoreScriptMutation.mutateAsync({
        backup: backupRestorePayload,
        selectedTables: selectedRestoreTables,
        mode: restoreMode,
      });
      downloadTextFile(result.script, result.fileName, "text/sql");
      toast.success(
        `Restore script exported: ${result.summary.selectedTableCount} tables, ${result.summary.selectedRows} rows.`
      );
      await refetchRestoreHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export restore script");
    }
  };

  const handleApplyMergeRestore = async () => {
    if (user?.role !== "super_admin") {
      toast.error("Only Super Admin can apply a backup restore.");
      return;
    }

    if (!backupRestorePayload) {
      toast.error("Load a backup JSON first.");
      return;
    }

    if (restoreMode !== "merge") {
      toast.error("Direct restore apply currently supports merge mode only.");
      return;
    }

    if (restorePreflight?.status === "blocked") {
      toast.error("Resolve the blocked preflight items before applying restore.");
      return;
    }

    if (selectedRestoreTables.length === 0) {
      toast.error("Select at least one table to apply.");
      return;
    }

    try {
      const result = await backupRestoreApplyMutation.mutateAsync({
        backup: backupRestorePayload,
        selectedTables: selectedRestoreTables,
        mode: restoreMode,
        confirmation: restoreConfirmation,
      });
      const typedResult = result as BackupRestoreApplyResult;
      setRestoreApplyResult(typedResult);

      const timestamp = new Date(typedResult.appliedAt).toISOString().replace(/[:.]/g, "-");
      downloadJsonFile(
        typedResult.safetySnapshot,
        `textpoint-safety-before-restore-${timestamp}.json`
      );
      await refetchDiagnostics();
      await refetchRestoreHistory();
      toast.success(
        `Restore applied: ${typedResult.summary.insertedRows} inserted, ${typedResult.summary.skippedRows} skipped. Safety backup downloaded.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply restore");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Administration
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, branches, and page-level access.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-7">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Access
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Health
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="font-medium">Super Admin Control</p>
                <p className="text-sm text-muted-foreground">
                  {superAdminCount === 0
                    ? "Bootstrap mode is active. An admin can assign the first Super Admin account once."
                    : "Once a Super Admin exists, only a Super Admin can create, edit, or manage Super Admin accounts."}
                </p>
              </div>
              <Badge variant={superAdminCount === 0 ? "secondary" : "outline"}>
                {superAdminCount === 0 ? "Bootstrap mode" : `${superAdminCount} Super Admin${superAdminCount === 1 ? "" : "s"}`}
              </Badge>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setError(null);
                  setIsUserFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>

            <DataTable
              columns={userColumns}
              data={users as AppUser[]}
              isLoading={usersLoading}
              pageSize={10}
              searchPlaceholder="Search users..."
              actions={(user) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canOpenAccessDialog(user)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!canOpenAccessDialog(user)) {
                        toast.error("Super Admin accounts already have full access and do not use page-level permission tick boxes.");
                        return;
                      }
                      setSelectedUserForPermissions(user);
                      setPermissionSeedUserId(null);
                      setIsPermissionDialogOpen(true);
                    }}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {user.role === "super_admin" ? "Full Access" : "Access"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canManageUserRecord(user)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!canManageUserRecord(user)) {
                        toast.error("Only a Super Admin can edit a Super Admin account.");
                        return;
                      }
                      setEditingUser(user);
                      setError(null);
                      setIsUserFormOpen(true);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canManageUserRecord(user)}
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!canManageUserRecord(user)) {
                        toast.error("Only a Super Admin can delete a Super Admin account.");
                        return;
                      }
                      if (!confirm(`Delete user ${user.name || user.email}?`)) return;
                      try {
                        await deleteUserMutation.mutateAsync(user.id);
                        toast.success("User deleted successfully");
                        await refetchUsers();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Failed to delete user");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="font-medium">Access Audit Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Review real client portal allocations, branch scope, suspended logins, forced password changes, and likely access conflicts before rollout.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => void Promise.all([refetchAccessAudit(), refetchAccessBranchCoverage()])}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Audit
                </Button>
                <Button
                  variant="outline"
                  disabled={accessRolloutRows.length === 0}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        buildAccessGoLiveVerdict(
                          accessGoLiveGate,
                          accessRolloutRows,
                          accessRemediationRows
                        )
                      );
                      toast.success("Access rollout pack copied");
                    } catch {
                      toast.error("Could not copy the access rollout pack");
                    }
                  }}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Copy Rollout Pack
                </Button>
                <Button
                  variant="outline"
                  disabled={accessRolloutRows.length === 0}
                  onClick={() =>
                    exportTableToCSV(
                      accessRolloutColumns,
                      accessRolloutRows,
                      "access-rollout-readiness"
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Rollout CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={accessRolloutRows.length === 0}
                  onClick={() =>
                    exportTableToPDF(
                      accessRolloutColumns,
                      accessRolloutRows,
                      "access-rollout-readiness",
                      "Client Portal Rollout Readiness"
                    )
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  Rollout PDF
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All Users" },
                { key: "flagged", label: "Flagged Only" },
                { key: "suspended", label: "Suspended" },
                { key: "password_pending", label: "Password Pending" },
                { key: "never_signed_in", label: "Never Signed In" },
              ].map((option) => (
                <Button
                  key={option.key}
                  variant={accessAuditFocus === option.key ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setAccessAuditFocus(
                      option.key as
                        | "all"
                        | "flagged"
                        | "suspended"
                        | "password_pending"
                        | "never_signed_in"
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-2 md:max-w-md">
              <Label htmlFor="access-audit-client-filter">Client Filter</Label>
              <select
                id="access-audit-client-filter"
                value={accessAuditClientFilter}
                onChange={(event) => setAccessAuditClientFilter(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All client portals</option>
                {accessAuditClientOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Users</CardDescription>
                  <CardTitle>{accessAuditSummary.totalUsers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Allocated Client Users</CardDescription>
                  <CardTitle>{accessAuditSummary.allocatedUsers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Flagged Access Cases</CardDescription>
                  <CardTitle>{accessAuditSummary.flaggedUsers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Password Change Pending</CardDescription>
                  <CardTitle>{accessAuditSummary.passwordResetPendingUsers}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Suspended But Allocated</CardDescription>
                  <CardTitle>{accessAuditSummary.suspendedAllocatedUsers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Multi-Client Users</CardDescription>
                  <CardTitle>{accessAuditSummary.multiClientUsers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Internal + Client Mixed</CardDescription>
                  <CardTitle>{accessAuditSummary.internalClientMixedUsers}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Access Scope Register</CardTitle>
                <CardDescription>
                  This is the rollout-facing view of who can access which client portal data, under what branch scope, and with what login state.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={accessAuditColumns}
                  data={filteredAccessAuditRows}
                  isLoading={accessAuditLoading}
                  pageSize={10}
                  searchPlaceholder="Search access scope..."
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAuditUserRecord(row)}
                      >
                        User Record
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManageAccessAuditRow(row) || updateUserMutation.isPending}
                        onClick={() => void handleAccessAuditLoginToggle(row)}
                      >
                        {row.loginEnabled ? "Suspend" : "Reactivate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canManageAccessAuditRow(row)}
                        onClick={() => {
                          setAccessPasswordError(null);
                          setAccessPasswordTarget(row);
                        }}
                      >
                        Temp Password
                      </Button>
                      {row.accessFlags.length > 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("audit")}
                        >
                          Audit
                        </Button>
                      ) : null}
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flagged Access Queue</CardTitle>
                <CardDescription>
                  Priority view of the access cases most likely to cause rollout, visibility, or onboarding problems.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={accessQueueColumns}
                  data={flaggedAccessQueueRows}
                  isLoading={accessAuditLoading}
                  pageSize={8}
                  searchPlaceholder="Search flagged access cases..."
                  actions={(row) => {
                    const fullRow = typedAccessAuditRows.find((entry) => entry.userId === row.userId) ?? null;
                    if (!fullRow) return null;
                    return (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAuditUserRecord(fullRow)}>
                          User Record
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canManageAccessAuditRow(fullRow) || updateUserMutation.isPending}
                          onClick={() => void handleAccessAuditLoginToggle(fullRow)}
                        >
                          {fullRow.loginEnabled ? "Suspend" : "Reactivate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canManageAccessAuditRow(fullRow)}
                          onClick={() => {
                            setAccessPasswordError(null);
                            setAccessPasswordTarget(fullRow);
                          }}
                        >
                          Temp Password
                        </Button>
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Access Remediation Items</CardDescription>
                  <CardTitle>{accessRemediationSummary.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Critical Items</CardDescription>
                  <CardTitle>{accessRemediationSummary.critical}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>High Items</CardDescription>
                  <CardTitle>{accessRemediationSummary.high}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>User-Level Items</CardDescription>
                  <CardTitle>{accessRemediationSummary.userItems}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Client / Branch Items</CardDescription>
                  <CardTitle>{accessRemediationSummary.clientItems}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Access Remediation Queue</CardTitle>
                <CardDescription>
                  One ordered rollout queue combining user issues, client gaps, branch-scope risks, and uncovered branch coverage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={accessRemediationColumns}
                  data={accessRemediationRows}
                  isLoading={accessAuditLoading || accessBranchCoverageLoading}
                  pageSize={10}
                  searchPlaceholder="Search access remediation..."
                  actions={(row) => {
                    const fullRow =
                      row.userId === null
                        ? null
                        : typedAccessAuditRows.find((entry) => entry.userId === row.userId) ?? null;
                    return (
                      <div className="flex gap-2">
                        {fullRow ? (
                          <Button variant="outline" size="sm" onClick={() => openAuditUserRecord(fullRow)}>
                            User Record
                          </Button>
                        ) : null}
                        {row.clientId !== null ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAccessAuditClientFilter(String(row.clientId));
                              setAccessAuditFocus("all");
                            }}
                          >
                            Open Client Users
                          </Button>
                        ) : null}
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Client Portals Ready</CardDescription>
                  <CardTitle>{accessRolloutSummary.ready}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Client Portals In Review</CardDescription>
                  <CardTitle>{accessRolloutSummary.review}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Client Portals Blocked</CardDescription>
                  <CardTitle>{accessRolloutSummary.blocked}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Branch-Coverage Blockers</CardDescription>
                  <CardTitle>{accessRolloutSummary.clientsWithBranchesBlocked}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div ref={accessLaunchSignOffRef}>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Access Go-Live Gate</CardTitle>
                      <Badge
                        variant={
                          accessGoLiveGate.status === "blocked"
                            ? "destructive"
                            : accessGoLiveGate.status === "review"
                              ? "secondary"
                              : accessGoLiveGate.status === "ready"
                                ? "default"
                                : "outline"
                        }
                      >
                        {accessGoLiveGate.label}
                      </Badge>
                    </div>
                    <CardDescription>{accessGoLiveGate.detail}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={accessRolloutRows.length === 0}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            buildAccessGoLiveVerdict(
                              accessGoLiveGate,
                              accessRolloutRows,
                              accessRemediationRows
                            )
                          );
                          toast.success("Access go-live verdict copied");
                        } catch {
                          toast.error("Could not copy the access go-live verdict");
                        }
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Access Verdict
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!accessGoLiveGate.blockedRow}
                      onClick={() => {
                        if (accessGoLiveGate.blockedRow) {
                          openAccessAuditClientUsers(accessGoLiveGate.blockedRow.clientId);
                        }
                      }}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Open First Blocked Client
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!accessGoLiveGate.reviewRow}
                      onClick={() => {
                        if (accessGoLiveGate.reviewRow) {
                          openAccessAuditClientUsers(accessGoLiveGate.reviewRow.clientId);
                        }
                      }}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Open First Review Client
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Blocked Clients</CardDescription>
                      <CardTitle>{accessGoLiveGate.blockedCount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Review Clients</CardDescription>
                      <CardTitle>{accessGoLiveGate.reviewCount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>Critical Remediation</CardDescription>
                      <CardTitle>{accessGoLiveGate.criticalCount}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardDescription>High Remediation</CardDescription>
                      <CardTitle>{accessGoLiveGate.highCount}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>
                <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium">Primary rollout action</div>
                    {accessGoLiveGate.primaryRow ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="font-medium">{accessGoLiveGate.primaryRow.companyName}</div>
                        <div className="text-muted-foreground">
                          {accessGoLiveGate.primaryRow.primaryIssue}
                        </div>
                        <div className="text-muted-foreground">
                          Next action: {accessGoLiveGate.primaryRow.nextAction}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No client portal rollout item has been generated yet.
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm font-medium">Current blockers</div>
                    {accessGoLiveGate.blockerList.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {accessGoLiveGate.blockerList.map((blocker) => (
                          <div key={blocker} className="text-sm text-muted-foreground">
                            {blocker}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No open access blockers are currently stopping rollout.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Access Launch Sign-Off</CardTitle>
                      <Badge variant={accessLaunchSignOffReady ? "default" : "destructive"}>
                        {accessLaunchSignOffReady ? "Ready for client portal launch" : "Launch blocked"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Final admin sign-off for client portal rollout. Items that are still blocked by live access data cannot be signed off yet.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            buildAccessLaunchSignOffSummary(
                              accessGoLiveGate,
                              accessLaunchSignOff,
                              accessLaunchSignOffReady
                            )
                          );
                          toast.success("Access launch sign-off copied");
                        } catch {
                          toast.error("Could not copy the access launch sign-off");
                        }
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Launch Sign-Off
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setAccessLaunchSignOff({
                          auditReviewed: false,
                          blockedClientsCleared: false,
                          reviewClientsChecked: false,
                          branchCoverageVerified: false,
                          onboardingBacklogAccepted: false,
                        })
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Sign-Off
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {accessLaunchSignOffItems.map((item) => {
                    const statusLabel = item.blocked
                      ? "Blocked"
                      : accessLaunchSignOff[item.key]
                        ? "Signed off"
                        : "Open";
                    return (
                      <div key={item.key} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">{item.label}</div>
                            <Badge
                              variant={
                                item.blocked
                                  ? "destructive"
                                  : accessLaunchSignOff[item.key]
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={accessLaunchSignOff[item.key]}
                            disabled={item.blocked}
                            onCheckedChange={(checked) =>
                              setAccessLaunchSignOff((current) => ({
                                ...current,
                                [item.key]: Boolean(checked),
                              }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Launch Queue Items</CardDescription>
                  <CardTitle>{accessLaunchQueueSummary.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Blocked Queue Items</CardDescription>
                  <CardTitle>{accessLaunchQueueSummary.blocked}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Review Queue Items</CardDescription>
                  <CardTitle>{accessLaunchQueueSummary.review}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Ready Queue Items</CardDescription>
                  <CardTitle>{accessLaunchQueueSummary.ready}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Launch Queue Gate</CardTitle>
                      <Badge
                        variant={
                          accessLaunchQueueGate.status === "blocked"
                            ? "destructive"
                            : accessLaunchQueueGate.status === "review"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {accessLaunchQueueGate.label}
                      </Badge>
                    </div>
                    <CardDescription>{accessLaunchQueueGate.detail}</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={accessLaunchQueueFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAccessLaunchQueueFilter("all")}
                    >
                      All
                    </Button>
                    <Button
                      variant={accessLaunchQueueFilter === "blocked" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAccessLaunchQueueFilter("blocked")}
                    >
                      Blocked
                    </Button>
                    <Button
                      variant={accessLaunchQueueFilter === "review" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAccessLaunchQueueFilter("review")}
                    >
                      Review
                    </Button>
                    <Button
                      variant={accessLaunchQueueFilter === "client" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAccessLaunchQueueFilter("client")}
                    >
                      Client
                    </Button>
                    <Button
                      variant={accessLaunchQueueFilter === "signoff" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAccessLaunchQueueFilter("signoff")}
                    >
                      Sign-Off
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!accessLaunchQueueGate.nextRow}
                      onClick={() => {
                        if (!accessLaunchQueueGate.nextRow) return;
                        if (accessLaunchQueueGate.nextRow.clientId) {
                          openAccessAuditClientUsers(accessLaunchQueueGate.nextRow.clientId);
                          return;
                        }
                        setAccessLaunchQueueFilter("signoff");
                      }}
                    >
                      Open Next Launch Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Portal Launch Phases</CardTitle>
                <CardDescription>
                  Launch rollout sequence for access readiness, from blocked remediation through final launch decision.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 xl:grid-cols-2">
                  {accessLaunchPhaseRows.map((phase) => (
                    <div key={phase.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium">{phase.phase}</div>
                          <div className="text-sm text-muted-foreground">{phase.detail}</div>
                        </div>
                        <Badge
                          variant={
                            phase.status === "current"
                              ? "destructive"
                              : phase.status === "open"
                                ? "outline"
                                : "default"
                          }
                        >
                          {phase.status === "current"
                            ? "Current"
                            : phase.status === "open"
                              ? "Open"
                              : "Ready"}
                        </Badge>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          {phase.openCount} open item{phase.openCount === 1 ? "" : "s"}.
                          {" "}
                          {phase.nextAction}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAccessLaunchQueueFilter(phase.targetFilter)}
                        >
                          Open Phase
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Current Launch Phase Queue</CardTitle>
                    <CardDescription>
                      The exact work list for the current rollout phase, derived from the launch queue and launch sign-off state.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentAccessLaunchPhase ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                [
                                  `Current launch phase: ${currentAccessLaunchPhase.phase}`,
                                  `State: ${currentAccessLaunchPhaseGate.label}`,
                                  `Detail: ${currentAccessLaunchPhaseGate.detail}`,
                                  `Blocked tasks: ${currentAccessLaunchPhaseGate.blockedCount}`,
                                  `Review tasks: ${currentAccessLaunchPhaseGate.reviewCount}`,
                                  `Client tasks: ${currentAccessLaunchPhaseGate.clientTaskCount}`,
                                  `Sign-off tasks: ${currentAccessLaunchPhaseGate.signOffTaskCount}`,
                                  currentAccessLaunchPhaseGate.nextTask
                                    ? `Next task: ${currentAccessLaunchPhaseGate.nextTask.subject} - ${currentAccessLaunchPhaseGate.nextTask.nextAction}`
                                    : "Next task: None",
                                ].join("\n")
                              );
                              toast.success("Current launch phase copied");
                            } catch {
                              toast.error("Could not copy the current launch phase");
                            }
                          }}
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Copy Phase Queue
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!currentAccessLaunchPhaseGate.nextTask}
                          onClick={() => {
                            const nextTask = currentAccessLaunchPhaseGate.nextTask;
                            if (!nextTask) return;
                            if (nextTask.clientId) {
                              openAccessAuditClientUsers(nextTask.clientId);
                              return;
                            }
                            setAccessLaunchQueueFilter(nextTask.targetFilter);
                          }}
                        >
                          Open Next Phase Task
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAccessLaunchQueueFilter(currentAccessLaunchPhase.targetFilter)}
                        >
                          Open {currentAccessLaunchPhase.phase}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {currentAccessLaunchPhase ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{currentAccessLaunchPhase.phase}</div>
                        <Badge
                          variant={
                            currentAccessLaunchPhaseGate.status === "blocked"
                              ? "destructive"
                              : currentAccessLaunchPhaseGate.status === "review"
                                ? "outline"
                                : "default"
                          }
                        >
                          {currentAccessLaunchPhaseGate.label}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {currentAccessLaunchPhaseGate.detail} {currentAccessLaunchPhase.nextAction}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>Blocked Tasks</CardDescription>
                          <CardTitle>{currentAccessLaunchPhaseGate.blockedCount}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>Review Tasks</CardDescription>
                          <CardTitle>{currentAccessLaunchPhaseGate.reviewCount}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>Client Tasks</CardDescription>
                          <CardTitle>{currentAccessLaunchPhaseGate.clientTaskCount}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader className="pb-3">
                          <CardDescription>Sign-Off Tasks</CardDescription>
                          <CardTitle>{currentAccessLaunchPhaseGate.signOffTaskCount}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium">Current phase decision</div>
                            <Badge variant={currentAccessLaunchPhaseGate.status === "blocked" ? "destructive" : currentAccessLaunchPhaseGate.status === "review" ? "secondary" : "default"}>
                              {currentAccessLaunchPhaseDecision.label}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {currentAccessLaunchPhaseDecision.detail}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Next action: {currentAccessLaunchPhaseDecision.nextAction}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  [
                                    `Current launch phase decision: ${currentAccessLaunchPhaseDecision.label}`,
                                    `Phase: ${currentAccessLaunchPhase.phase}`,
                                    `Detail: ${currentAccessLaunchPhaseDecision.detail}`,
                                    `Next action: ${currentAccessLaunchPhaseDecision.nextAction}`,
                                  ].join("\n")
                                );
                                toast.success("Current launch phase decision copied");
                              } catch {
                                toast.error("Could not copy the current launch phase decision");
                              }
                            }}
                          >
                            <ClipboardList className="mr-2 h-4 w-4" />
                            Copy Phase Decision
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAccessLaunchQueueFilter(currentAccessLaunchPhaseDecision.targetFilter)}
                          >
                            Open Decision Target
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Current phase decision basis</div>
                          <div className="text-sm text-muted-foreground">
                            The criteria currently driving the phase decision.
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                [
                                  `Current launch phase decision basis: ${currentAccessLaunchPhaseDecision.label}`,
                                  ...currentAccessLaunchPhaseDecisionBasis.map((item) => `${item.met ? "[MET]" : "[OPEN]"} ${item.label}`),
                                ].join("\n")
                              );
                              toast.success("Current launch phase basis copied");
                            } catch {
                              toast.error("Could not copy the current launch phase basis");
                            }
                          }}
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Copy Decision Basis
                        </Button>
                      </div>
                      <div className="mt-4 space-y-2">
                        {currentAccessLaunchPhaseDecisionBasis.map((item) => (
                          <div key={item.label} className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge variant={item.met ? "default" : "outline"}>
                              {item.met ? "Met" : "Open"}
                            </Badge>
                            <span className="text-muted-foreground">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium">Next phase task</div>
                      {currentAccessLaunchPhaseGate.nextTask ? (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="font-medium">{currentAccessLaunchPhaseGate.nextTask.subject}</div>
                          <div className="text-muted-foreground">
                            {currentAccessLaunchPhaseGate.nextTask.detail}
                          </div>
                          <div className="text-muted-foreground">
                            Next action: {currentAccessLaunchPhaseGate.nextTask.nextAction}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-muted-foreground">
                          No open task remains in the current phase.
                        </div>
                      )}
                    </div>
                    <DataTable
                      columns={accessLaunchPhaseTaskColumns}
                      data={currentAccessLaunchPhaseTasks}
                      pageSize={6}
                      searchPlaceholder="Search current phase tasks..."
                      actions={(row) =>
                        row.clientId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAccessAuditClientUsers(row.clientId!)}
                          >
                            Open Client Users
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAccessLaunchQueueFilter(row.targetFilter);
                              scrollToAdminSection("access", accessLaunchSignOffRef);
                            }}
                          >
                            Open Sign-Off
                          </Button>
                        )
                      }
                    />
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No current launch phase is open. The access rollout phases are clear.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Client Portal Launch Queue</CardTitle>
                    <CardDescription>
                      One ordered launch work list combining client rollout items and open launch sign-off items.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    disabled={accessLaunchQueueRows.length === 0}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          accessLaunchQueueRows
                            .map(
                              (row, index) =>
                                `${index + 1}. [${row.status.toUpperCase()}] ${row.subject} - ${row.detail} Next: ${row.nextAction}`
                            )
                            .join("\n")
                        );
                        toast.success("Access launch queue copied");
                      } catch {
                        toast.error("Could not copy the access launch queue");
                      }
                    }}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Copy Launch Queue
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={accessLaunchQueueColumns}
                  data={filteredAccessLaunchQueueRows}
                  isLoading={accessAuditLoading || accessBranchCoverageLoading}
                  pageSize={8}
                  searchPlaceholder="Search launch queue..."
                  actions={(row) =>
                    row.clientId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAccessAuditClientUsers(row.clientId!)}
                      >
                        Open Client Users
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollToAdminSection("access", accessLaunchSignOffRef)}
                      >
                        Open Sign-Off
                      </Button>
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Portal Rollout Readiness</CardTitle>
                <CardDescription>
                  Per-client rollout verdict combining access gaps, branch-scope risk, and branch coverage into one readiness view.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={accessRolloutColumns}
                  data={accessRolloutRows}
                  isLoading={accessAuditLoading || accessBranchCoverageLoading}
                  pageSize={8}
                  searchPlaceholder="Search client rollout readiness..."
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAccessAuditClientUsers(row.clientId)}
                    >
                      Open Client Users
                    </Button>
                  )}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Client Portals With Access</CardDescription>
                  <CardTitle>{clientAccessMatrixSummary.totalClients}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Flagged Clients</CardDescription>
                  <CardTitle>{clientAccessMatrixSummary.flaggedClients}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Restricted Scope Clients</CardDescription>
                  <CardTitle>{clientAccessMatrixSummary.restrictedClients}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Onboarding Watch Clients</CardDescription>
                  <CardTitle>{clientAccessMatrixSummary.onboardingClients}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>Client Access Matrix</CardTitle>
                    <CardDescription>
                      Client-by-client view of portal exposure, branch scope mix, onboarding state, and rollout risk.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        exportTableToCSV(
                          clientAccessMatrixColumns,
                          clientAccessMatrixRows,
                          "access-audit-client-matrix"
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
                          clientAccessMatrixColumns,
                          clientAccessMatrixRows,
                          "access-audit-client-matrix",
                          "Client Access Matrix"
                        )
                      }
                    >
                      <FileJson className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={clientAccessMatrixColumns}
                  data={clientAccessMatrixRows}
                  isLoading={accessAuditLoading}
                  pageSize={8}
                  searchPlaceholder="Search client access matrix..."
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccessAuditClientFilter(String(row.clientId));
                        setAccessAuditFocus("all");
                      }}
                    >
                      Open Client Users
                    </Button>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Access Gap Queue</CardTitle>
                <CardDescription>
                  Client-level rollout blockers such as no manager, all users suspended, or no completed sign-in activity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={clientAccessGapColumns}
                  data={clientAccessGapRows}
                  isLoading={accessAuditLoading}
                  pageSize={8}
                  searchPlaceholder="Search client access gaps..."
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccessAuditClientFilter(String(row.clientId));
                        setAccessAuditFocus("all");
                      }}
                    >
                      Open Client Users
                    </Button>
                  )}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Restricted Assignments</CardDescription>
                  <CardTitle>{branchScopeSummary.restrictedAssignments}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Full-Scope Assignments</CardDescription>
                  <CardTitle>{branchScopeSummary.fullScopeAssignments}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Restricted Managers</CardDescription>
                  <CardTitle>{branchScopeSummary.restrictedManagers}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Large Client Scope Reviews</CardDescription>
                  <CardTitle>{branchScopeSummary.largeClientScopeReviews}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Branch Scope Register</CardTitle>
                <CardDescription>
                  Assignment-level view of who has full client visibility versus branch-restricted portal access.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={branchScopeColumns}
                  data={branchScopeRows}
                  isLoading={accessAuditLoading}
                  pageSize={8}
                  searchPlaceholder="Search branch scope assignments..."
                  actions={(row) => {
                    const fullRow = typedAccessAuditRows.find((entry) => entry.userId === row.userId) ?? null;
                    if (!fullRow) return null;
                    return (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAuditUserRecord(fullRow)}>
                          User Record
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccessAuditClientFilter(String(row.clientId));
                            setAccessAuditFocus("all");
                          }}
                        >
                          Open Client Users
                        </Button>
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Branch Scope Risk Queue</CardTitle>
                <CardDescription>
                  Priority branch-scope cases such as restricted managers, suspended restricted users, and very narrow scope on large clients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={branchScopeQueueColumns}
                  data={branchScopeQueueRows}
                  isLoading={accessAuditLoading}
                  pageSize={8}
                  searchPlaceholder="Search branch scope risks..."
                  actions={(row) => {
                    const fullRow = typedAccessAuditRows.find((entry) => entry.userId === row.userId) ?? null;
                    return (
                      <div className="flex gap-2">
                        {fullRow ? (
                          <Button variant="outline" size="sm" onClick={() => openAuditUserRecord(fullRow)}>
                            User Record
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAccessAuditClientFilter(String(row.clientId));
                            setAccessAuditFocus("all");
                          }}
                        >
                          Open Client Users
                        </Button>
                      </div>
                    );
                  }}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Clients With Branches</CardDescription>
                  <CardTitle>{branchCoverageSummary.clientsWithBranches}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Fully Covered Clients</CardDescription>
                  <CardTitle>{branchCoverageSummary.fullyCoveredClients}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Clients With Uncovered Branches</CardDescription>
                  <CardTitle>{branchCoverageSummary.uncoveredBranchClients}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Clients Missing Active Manager</CardDescription>
                  <CardTitle>{branchCoverageSummary.missingManagerClients}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Client Branch Coverage Matrix</CardTitle>
                <CardDescription>
                  Client-by-client branch coverage view showing whether active portal access actually covers the branch structure in place.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={branchCoverageColumns}
                  data={typedAccessBranchCoverageRows}
                  isLoading={accessBranchCoverageLoading}
                  pageSize={8}
                  searchPlaceholder="Search branch coverage..."
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccessAuditClientFilter(String(row.clientId));
                        setAccessAuditFocus("all");
                      }}
                    >
                      Open Client Users
                    </Button>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Uncovered Branch Queue</CardTitle>
                <CardDescription>
                  Priority branch coverage blockers such as uncovered branches, no active manager, or no active access against configured client branches.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={branchCoverageQueueColumns}
                  data={branchCoverageQueueRows}
                  isLoading={accessBranchCoverageLoading}
                  pageSize={8}
                  searchPlaceholder="Search branch coverage risks..."
                  actions={(row) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAccessAuditClientFilter(String(row.clientId));
                        setAccessAuditFocus("all");
                      }}
                    >
                      Open Client Users
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Summary</CardTitle>
                <CardDescription>
                  Roles are assigned per user, and user-level access can then be narrowed with the permission tick boxes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={roleColumns}
                  data={roles.map((r, i) => ({ id: i + 1, key: r as RoleSummary["key"], name: r, description: "", type: "system" as const, userCount: 0 }))}
                  isLoading={rolesLoading}
                  pageSize={10}
                  searchPlaceholder="Search roles..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches" className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="font-medium">Branch Branding Control</p>
                <p className="text-sm text-muted-foreground">
                  Branch records, company details, and logos are controlled by Super Admin only.
                </p>
              </div>
              {canManageBranches ? (
                <Button
                  onClick={() => {
                    setEditingBranch(null);
                    setError(null);
                    setIsBranchFormOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Branch
                </Button>
              ) : (
                <Badge variant="outline">Read only</Badge>
              )}
            </div>

            <DataTable
              columns={branchColumns}
              data={branches as Branch[]}
              isLoading={branchesLoading}
              pageSize={10}
              searchPlaceholder="Search branches..."
              onRowClick={(branch) => {
                if (!canManageBranches) return;
                setEditingBranch(branch);
                setError(null);
                setIsBranchFormOpen(true);
              }}
              actions={(branch) => (
                <div className="flex gap-2">
                  {canManageBranches ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingBranch(branch);
                          setError(null);
                          setIsBranchFormOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (!confirm(`Delete branch ${branch.name}?`)) return;
                          try {
                            await deleteBranchMutation.mutateAsync(branch.id);
                            toast.success("Branch deleted successfully");
                            await refetchBranches();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed to delete branch"
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Administration Notes</CardTitle>
                <CardDescription>
                  Branch branding is managed per branch, and non-admin users can be limited per module using the access controls in the Users tab.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Use the Branches tab to set each branch name, logo, company details, and brand colors.</p>
                <p>Use the Users tab to assign a role and then tailor which pages and actions that user can access.</p>
                <div className="rounded-lg border p-4 bg-background">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">Specimen Types</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        These are the options users see in the specimen type dropdown.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setIsSpecimenTypeFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Type
                    </Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(specimenTypes as SpecimenType[]).length === 0 ? (
                      <span>No specimen types configured yet.</span>
                    ) : (
                      <div className="w-full overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left">Type</th>
                              <th className="px-3 py-2 text-left">Material</th>
                              <th className="px-3 py-2 text-left">Size</th>
                             <th className="px-3 py-2 text-left">Weight</th>
                             <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(specimenTypes as SpecimenType[]).map((specimenType, index) => (
                              <tr key={specimenType.id ?? `${specimenType.name}-${index}`} className="border-t">
                                <td className="px-3 py-2 font-medium">{specimenType.name}</td>
                                <td className="px-3 py-2">{specimenType.material || "-"}</td>
                                <td className="px-3 py-2">{specimenType.size || "-"}</td>
                                <td className="px-3 py-2">{specimenType.weight || "-"}</td>
                                <td className="px-3 py-2">{specimenType.description || "-"}</td>
                                <td className="px-3 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingSpecimenType(specimenType);
                                      setIsSpecimenTypeFormOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border p-4 bg-background">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">Methods</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lecturer specialisations are selected from this list.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setIsMethodFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Method
                    </Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(methods as Method[]).length === 0 ? (
                      <span>No methods configured yet.</span>
                    ) : (
                      <div className="w-full overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left">Method</th>
                              <th className="px-3 py-2 text-left">Colour</th>
                              <th className="px-3 py-2 text-left">Description</th>
                              <th className="px-3 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(methods as Method[]).map((method) => (
                              <tr key={method.id} className="border-t">
                                <td className="px-3 py-2 font-medium">{method.name}</td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="inline-block h-4 w-4 rounded-full border"
                                      style={{ backgroundColor: method.color || getDefaultMethodColor(method.name) }}
                                    />
                                    <span className="font-mono text-xs">
                                      {method.color || getDefaultMethodColor(method.name)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">{method.description || "-"}</td>
                                <td className="px-3 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingMethod(method);
                                      setIsMethodFormOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-6">
            <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-medium">System Health Diagnostics</p>
                <p className="text-sm text-muted-foreground">
                  Check database connectivity, mapped tables, authentication setup, and operational configuration.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handlePreviewBackupFile}
                />
                <input
                  ref={transferPackFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handlePreviewTransferPackFile}
                />
                <Button
                  variant="outline"
                  onClick={() => refetchDiagnostics()}
                  disabled={diagnosticsLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${diagnosticsLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  disabled={!typedDiagnostics}
                  onClick={async () => {
                    if (!typedDiagnostics) return;
                    try {
                      await navigator.clipboard.writeText(
                        buildHealthSupportSummary(typedDiagnostics)
                      );
                      toast.success("Health summary copied");
                    } catch {
                      toast.error("Could not copy the health summary");
                    }
                  }}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Copy Summary
                </Button>
                <Button
                  variant="outline"
                  disabled={!typedDiagnostics}
                  onClick={() => {
                    if (!typedDiagnostics) return;
                    exportTableToCSV(
                      healthExportColumns,
                      buildHealthExportRows(typedDiagnostics),
                      "system-health-diagnostics"
                    );
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={!typedDiagnostics}
                  onClick={() => {
                    if (!typedDiagnostics) return;
                    exportTableToPDF(
                      healthExportColumns,
                      buildHealthExportRows(typedDiagnostics),
                      "system-health-diagnostics",
                      "System Health Diagnostics"
                    );
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  disabled={user?.role !== "super_admin" || backupSnapshotMutation.isPending}
                  onClick={handleDownloadBackupSnapshot}
                  title={
                    user?.role === "super_admin"
                      ? "Export a JSON backup snapshot"
                      : "Only Super Admin can export backup snapshots"
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  {backupSnapshotMutation.isPending ? "Exporting..." : "Backup JSON"}
                </Button>
                <Button
                  disabled={user?.role !== "super_admin" || transferReadinessPackMutation.isPending}
                  onClick={handleDownloadTransferReadinessPack}
                  title={
                    user?.role === "super_admin"
                      ? "Export backup, schema readiness, repair SQL, and maintenance history in one pack"
                      : "Only Super Admin can export transfer packs"
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  {transferReadinessPackMutation.isPending ? "Preparing..." : "Transfer Pack"}
                </Button>
                <Button
                  variant="outline"
                  disabled={user?.role !== "super_admin"}
                  onClick={() => transferPackFileInputRef.current?.click()}
                  title={
                    user?.role === "super_admin"
                      ? "Preview a transfer pack before using it"
                      : "Only Super Admin can inspect transfer packs"
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Preview Transfer Pack
                </Button>
                <Button
                  variant="outline"
                  disabled={user?.role !== "super_admin"}
                  onClick={() => backupFileInputRef.current?.click()}
                  title={
                    user?.role === "super_admin"
                      ? "Inspect a backup JSON before restoring"
                      : "Only Super Admin can inspect backup files"
                  }
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Preview Backup
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Pilot Rollout Checklist
                    </CardTitle>
                    <CardDescription>
                      Release-control checklist for the first pilot. Each row shows current status, supporting evidence, and where to go next.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const lines = [
                            `Pilot Rollout Checklist: ${productionLaunchSignOffReady ? "Ready" : "Open"}`,
                            ...productionChecklistRows.map(
                              (row) =>
                                `- [${row.status.toUpperCase()}] ${row.label} | ${row.detail} Evidence: ${row.evidence} Next: ${row.nextAction}`
                            ),
                          ];
                          await navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Pilot rollout checklist copied");
                        } catch {
                          toast.error("Could not copy the pilot rollout checklist");
                        }
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Checklist
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Signed off</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {productionChecklistRows.filter((row) => row.status === "signed_off").length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Ready to sign off</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {productionChecklistRows.filter((row) => row.status === "ready").length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Review needed</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {productionChecklistRows.filter((row) => row.status === "review").length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {productionChecklistRows.filter((row) => row.status === "blocked").length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  {productionChecklistRows.map((row) => (
                    <div key={row.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">{row.label}</div>
                            <Badge
                              variant={
                                row.status === "blocked"
                                  ? "destructive"
                                  : row.status === "review"
                                    ? "secondary"
                                    : row.status === "signed_off"
                                      ? "default"
                                      : "outline"
                              }
                            >
                              {row.status === "signed_off"
                                ? "Signed off"
                                : row.status === "ready"
                                  ? "Ready"
                                  : row.status === "review"
                                    ? "Review"
                                    : "Blocked"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{row.detail}</p>
                          <p className="text-sm">
                            <span className="font-medium">Evidence:</span> {row.evidence}
                          </p>
                          <p className="text-sm font-medium">{row.nextAction}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => openProductionChecklistTarget(row)}>
                            Open Section
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card ref={rolloutGateRef}>
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Production Rollout Gate
                    </CardTitle>
                    <CardDescription>
                      One rollout verdict across system health, operational readiness, and client portal access control.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const lines = [
                            `Production Rollout Gate: ${productionReadinessGate.label}`,
                            productionReadinessGate.detail,
                            `Blocked: ${productionReadinessGate.blockedCount}`,
                            `Review: ${productionReadinessGate.reviewCount}`,
                            ...productionReadinessIssues.map(
                              (issue) =>
                                `- [${issue.severity.toUpperCase()}] ${issue.area}: ${issue.detail} Next: ${issue.nextAction}`
                            ),
                          ];
                          await navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Production rollout summary copied");
                        } catch {
                          toast.error("Could not copy the production rollout summary");
                        }
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Rollout Summary
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveTab("access");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Open Access Rollout
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={
                      productionReadinessGate.status === "blocked"
                        ? "destructive"
                        : productionReadinessGate.status === "review"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {productionReadinessGate.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{productionReadinessGate.detail}</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked items</p>
                      <p className="mt-2 text-2xl font-semibold">{productionReadinessGate.blockedCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Review items</p>
                      <p className="mt-2 text-2xl font-semibold">{productionReadinessGate.reviewCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">System health</p>
                      <p className="mt-2 text-sm font-medium">
                        {productionReadinessIssues.some((issue) => issue.area === "system" && issue.severity === "blocked")
                          ? "Blocked"
                          : productionReadinessIssues.some((issue) => issue.area === "system")
                            ? "Review"
                            : "Clear"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Operations / Access</p>
                      <p className="mt-2 text-sm font-medium">
                        {productionReadinessIssues.some(
                          (issue) => (issue.area === "operations" || issue.area === "access") && issue.severity === "blocked"
                        )
                          ? "Blocked"
                          : productionReadinessIssues.some(
                              (issue) => issue.area === "operations" || issue.area === "access" || issue.area === "release"
                            )
                            ? "Review"
                            : "Clear"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {productionReadinessGate.nextIssue ? (
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Primary next action</p>
                        <p className="text-sm text-muted-foreground">{productionReadinessGate.nextIssue.detail}</p>
                        <p className="text-sm font-medium">{productionReadinessGate.nextIssue.nextAction}</p>
                      </div>
                      <Badge variant={productionReadinessGate.nextIssue.severity === "blocked" ? "destructive" : "secondary"}>
                        {productionReadinessGate.nextIssue.area}
                      </Badge>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Open rollout issues</p>
                    <p className="text-sm text-muted-foreground">
                      These are the remaining items that should be addressed before wider rollout.
                    </p>
                  </div>
                  {productionReadinessIssues.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No open rollout blockers or review items were detected from the current admin health and access data.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {productionReadinessIssues.map((issue) => (
                        <div key={issue.id} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={issue.severity === "blocked" ? "destructive" : "secondary"}>
                                  {issue.severity === "blocked" ? "Blocked" : "Review"}
                                </Badge>
                                <Badge variant="outline">{issue.area}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{issue.detail}</p>
                              <p className="text-sm font-medium">{issue.nextAction}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card ref={productionLaunchSignOffRef}>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Production Launch Sign-Off</CardTitle>
                      <Badge variant={productionLaunchSignOffReady ? "default" : "destructive"}>
                        {productionLaunchSignOffReady ? "Ready for pilot rollout" : "Rollout not signed off"}
                      </Badge>
                    </div>
                    <CardDescription>
                      Final release-control checks for the first controlled rollout. Items blocked by live gate data cannot be signed off yet.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            buildProductionLaunchSignOffSummary(
                              productionReadinessGate,
                              productionReadinessIssues,
                              productionLaunchSignOff,
                              productionLaunchSignOffReady
                            )
                          );
                          toast.success("Production launch sign-off copied");
                        } catch {
                          toast.error("Could not copy the production launch sign-off");
                        }
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Launch Sign-Off
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setProductionLaunchSignOff({
                          healthReviewed: false,
                          backupRestoreReviewed: false,
                          pilotScopeConfirmed: false,
                          accessRolloutConfirmed: false,
                          releaseConfigConfirmed: false,
                        })
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Sign-Off
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {productionLaunchSignOffItems.map((item) => {
                    const statusLabel = item.blocked
                      ? "Blocked"
                      : productionLaunchSignOff[item.key]
                        ? "Signed off"
                        : "Open";
                    return (
                      <div key={item.key} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium">{item.label}</div>
                            <Badge
                              variant={
                                item.blocked
                                  ? "destructive"
                                  : productionLaunchSignOff[item.key]
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={productionLaunchSignOff[item.key]}
                            disabled={item.blocked}
                            onCheckedChange={(checked) =>
                              setProductionLaunchSignOff((current) => ({
                                ...current,
                                [item.key]: Boolean(checked),
                              }))
                            }
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>Production Rollout Queue</CardTitle>
                      <Badge
                        variant={
                          productionRolloutQueueGate.status === "blocked"
                            ? "destructive"
                            : productionRolloutQueueGate.status === "review"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {productionRolloutQueueGate.label}
                      </Badge>
                    </div>
                    <CardDescription>
                      Ordered rollout work list across live gate issues and unsigned release checks.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const lines = [
                            `Production Rollout Queue: ${productionRolloutQueueGate.label}`,
                            productionRolloutQueueGate.detail,
                            `Blocked: ${productionRolloutQueueGate.blockedCount}`,
                            `Review: ${productionRolloutQueueGate.reviewCount}`,
                            ...productionRolloutQueueRows.map(
                              (row, index) =>
                                `${index + 1}. [${row.status.toUpperCase()}] ${row.subject} | ${row.detail} Next: ${row.nextAction}`
                            ),
                          ];
                          await navigator.clipboard.writeText(lines.join("\n"));
                          toast.success("Production rollout queue copied");
                        } catch {
                          toast.error("Could not copy the production rollout queue");
                        }
                      }}
                    >
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Copy Queue
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!productionRolloutQueueGate.nextRow}
                      onClick={() => {
                        const nextRow = productionRolloutQueueGate.nextRow;
                        if (!nextRow) return;
                        if (nextRow.area === "access") {
                          setActiveTab("access");
                        } else {
                          setActiveTab("health");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Open Next Rollout Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Blocked queue items</p>
                      <p className="mt-2 text-2xl font-semibold">{productionRolloutQueueGate.blockedCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Review queue items</p>
                      <p className="mt-2 text-2xl font-semibold">{productionRolloutQueueGate.reviewCount}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Next item</p>
                      <p className="mt-2 text-sm font-medium">
                        {productionRolloutQueueGate.nextRow?.subject ?? "Queue clear"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {productionRolloutQueueRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No rollout queue items remain. The rollout gate is clear and the release checks are signed off.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productionRolloutQueueRows.map((row, index) => (
                      <div key={row.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">
                                {index + 1}. {row.subject}
                              </div>
                              <Badge variant={row.status === "blocked" ? "destructive" : "secondary"}>
                                {row.status === "blocked" ? "Blocked" : "Review"}
                              </Badge>
                              <Badge variant="outline">{row.source === "gate" ? row.area : "sign-off"}</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">{row.detail}</div>
                            <div className="text-sm font-medium">{row.nextAction}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle>Production Rollout Phases</CardTitle>
                  <CardDescription>
                    Ordered release sequence for the remaining rollout work across health, access, and final pilot decision.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {productionRolloutPhases.map((phase) => (
                  <div key={phase.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium">{phase.title}</div>
                          <Badge
                            variant={
                              phase.status === "current"
                                ? "destructive"
                                : phase.status === "open"
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {phase.status === "current" ? "Current" : phase.status === "open" ? "Open" : "Ready"}
                          </Badge>
                          <Badge variant="outline">{phase.openCount} open</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">{phase.detail}</div>
                        <div className="text-sm font-medium">{phase.nextAction}</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveTab(phase.targetTab);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Open Phase
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {typedOperationalReadiness ? (
              <Card ref={operationalReadinessRef}>
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Operational Readiness
                      </CardTitle>
                      <CardDescription>
                        Live pre-flight checks for login readiness, branch links, schedules, enrolments, equipment, specimens, Level III, and quality follow-ups.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchOperationalReadiness()}
                        disabled={operationalReadinessLoading}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${operationalReadinessLoading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!typedOperationalReadiness) return;
                          try {
                            await navigator.clipboard.writeText(
                              buildOperationalReadinessSupportSummary(typedOperationalReadiness)
                            );
                            toast.success("Operational readiness summary copied");
                          } catch {
                            toast.error("Could not copy the readiness summary");
                          }
                        }}
                      >
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Copy Summary
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={readinessIssues.length === 0}
                        onClick={() =>
                          exportTableToCSV(
                            operationalReadinessExportColumns,
                            buildOperationalReadinessExportRows(readinessIssues),
                            "operational-readiness"
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={readinessIssues.length === 0}
                        onClick={() =>
                          exportTableToPDF(
                            operationalReadinessExportColumns,
                            buildOperationalReadinessExportRows(readinessIssues),
                            "operational-readiness",
                            "Operational Readiness"
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Ready Score</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-2xl font-bold">{typedOperationalReadiness.summary.readyScore}%</p>
                        <Badge className={getHealthBadgeClass(typedOperationalReadiness.status)}>
                          {getHealthLabel(typedOperationalReadiness.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Critical Issues</p>
                      <p className="text-2xl font-bold text-rose-700">{typedOperationalReadiness.summary.critical}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Warnings</p>
                      <p className="text-2xl font-bold text-amber-700">{typedOperationalReadiness.summary.warning}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Scope</p>
                      <p className="font-medium">{typedOperationalReadiness.scope.branchName}</p>
                      <p className="text-xs text-muted-foreground">
                        {typedOperationalReadiness.summary.affectedAreas} affected area(s)
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Tracked In Quality</p>
                      <p className="text-2xl font-bold text-sky-700">
                        {typedOperationalReadiness.summary.trackedQualityActions}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typedOperationalReadiness.summary.untrackedIssues} not tracked
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="readiness-branch">Branch</Label>
                        <select
                          id="readiness-branch"
                          value={readinessBranchFilter}
                          onChange={(event) => setReadinessBranchFilter(event.target.value)}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="all">All branches</option>
                          {(branches as Branch[]).map((branch) => (
                            <option key={branch.id} value={String(branch.id)}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="readiness-severity">Severity</Label>
                        <select
                          id="readiness-severity"
                          value={readinessSeverityFilter}
                          onChange={(event) => setReadinessSeverityFilter(event.target.value)}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="all">All severities</option>
                          <option value="critical">Critical</option>
                          <option value="warning">Warning</option>
                          <option value="info">Info</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="readiness-area">Area</Label>
                        <select
                          id="readiness-area"
                          value={readinessAreaFilter}
                          onChange={(event) => setReadinessAreaFilter(event.target.value)}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="all">All areas</option>
                          {readinessAreaOptions.map((area) => (
                            <option key={area.key} value={area.key}>
                              {area.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    {typedOperationalReadiness.areas.map((area) => (
                      <div key={area.key} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{area.label}</p>
                          <Badge className={getHealthBadgeClass(area.status)}>
                            {area.total}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {area.critical} critical / {area.warning} warning / {area.info} info
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Level III Certificate Reminder Sweep</p>
                        <p className="text-sm text-muted-foreground">
                          Run the same backend reminder job used for certificates waiting on sign-off and
                          certificates nearing expiry.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRunLevelIIICertificateReminderSweep}
                        disabled={checkLevelIIITechnicianCertificateRemindersMutation.isPending}
                      >
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${
                            checkLevelIIITechnicianCertificateRemindersMutation.isPending
                              ? "animate-spin"
                              : ""
                          }`}
                        />
                        Run Reminder Sweep
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                      <button
                        type="button"
                        onClick={() => handleOpenLevelIIICertificateQueue("active")}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs text-muted-foreground">Active</p>
                        <p className="text-2xl font-bold">{levelIIICertificateQueueHealth.active}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLevelIIICertificateQueue("in_review")}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs text-muted-foreground">In Review</p>
                        <p className="text-2xl font-bold">{levelIIICertificateQueueHealth.inReview}</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLevelIIICertificateQueue("in_review")}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs text-muted-foreground">Review Waiting 2+ Days</p>
                        <p className="text-2xl font-bold text-amber-700">
                          {levelIIICertificateQueueHealth.reviewWaiting}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLevelIIICertificateQueue("expiring_soon")}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs text-muted-foreground">Expiring Within 30 Days</p>
                        <p className="text-2xl font-bold text-amber-700">
                          {levelIIICertificateQueueHealth.expiringSoon}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLevelIIICertificateQueue("expiring_soon")}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs text-muted-foreground">Overdue</p>
                        <p className="text-2xl font-bold text-rose-700">
                          {levelIIICertificateQueueHealth.overdue}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenLevelIIICertificateQueue("draft")}
                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs text-muted-foreground">Drafts Blocking Export</p>
                        <p className="text-2xl font-bold">{levelIIICertificateQueueHealth.blockedDrafts}</p>
                      </button>
                    </div>
                    <div className="mt-4 rounded-lg border bg-background">
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">Recent Reminder Runs</p>
                          <p className="text-xs text-muted-foreground">
                            Latest audit-backed runs for the Level III certificate sweep.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchLevelIIIReminderRunHistory()}
                          disabled={levelIIIReminderRunHistoryLoading}
                        >
                          <RefreshCw
                            className={`mr-2 h-4 w-4 ${
                              levelIIIReminderRunHistoryLoading ? "animate-spin" : ""
                            }`}
                          />
                          Refresh History
                        </Button>
                      </div>
                      {levelIIIReminderRunHistoryLoading ? (
                        <div className="flex items-center gap-3 px-4 py-4 text-sm text-muted-foreground">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Loading reminder run history...
                        </div>
                      ) : typedLevelIIIReminderRunHistory.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-muted-foreground">
                          No reminder sweep runs have been recorded yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-4 py-2 text-left">Run Time</th>
                                <th className="px-4 py-2 text-left">Actor</th>
                                <th className="px-4 py-2 text-left">Source</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2 text-left">Notifications</th>
                                <th className="px-4 py-2 text-left">Details</th>
                                <th className="px-4 py-2 text-left">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(typedLevelIIIReminderRunHistory as ReminderRunHistoryItem[]).map((item) => (
                                <tr key={item.id} className="border-t">
                                  <td className="whitespace-nowrap px-4 py-2">
                                    {new Date(item.createdAt).toLocaleString("en-ZA")}
                                  </td>
                                  <td className="px-4 py-2">
                                    {item.actorName || item.actorEmail || `User ${item.userId}`}
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge variant="outline">
                                      {getReminderRunTriggerSource(item.changes)}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge
                                      className={getHealthBadgeClass(
                                        item.status === "Success" ? "healthy" : "error"
                                      )}
                                    >
                                      {item.status}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2">
                                    {getReminderRunNotificationCount(item.changes)}
                                  </td>
                                  <td className="px-4 py-2 text-muted-foreground">
                                    {item.errorMessage || item.changesSummary}
                                  </td>
                                  <td className="px-4 py-2">
                                    {getReminderRunActionTarget(item.entityType) ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          setLocation(
                                            getReminderRunActionTarget(item.entityType)?.href ??
                                              "/level-iii?tab=technicians"
                                          )
                                        }
                                      >
                                        {getReminderRunActionTarget(item.entityType)?.label}
                                      </Button>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium">Other Reminder Sweeps</p>
                        <p className="text-sm text-muted-foreground">
                          Run the remaining reminder jobs and review their latest audit-backed runs from
                          the same Admin workspace.
                        </p>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">Quality Reminder Sweep</p>
                              <p className="text-sm text-muted-foreground">
                                Quality actions, audits, management reviews, and provider follow-ups.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRunQualityReminderSweep}
                              disabled={checkQualityRemindersMutation.isPending}
                            >
                              <RefreshCw
                                className={`mr-2 h-4 w-4 ${
                                  checkQualityRemindersMutation.isPending ? "animate-spin" : ""
                                }`}
                              />
                              Run
                            </Button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {qualityReminderRunHistoryLoading ? (
                              <div className="text-sm text-muted-foreground">Loading history...</div>
                            ) : typedQualityReminderRunHistory.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No runs recorded yet.</div>
                            ) : (
                              (typedQualityReminderRunHistory as ReminderRunHistoryItem[]).map((item) => (
                                <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span>{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                                      <Badge variant="outline">
                                        {getReminderRunTriggerSource(item.changes)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={getHealthBadgeClass(
                                          item.status === "Success" ? "healthy" : "error"
                                        )}
                                      >
                                        {getReminderRunNotificationCount(item.changes)} sent
                                      </Badge>
                                      {getReminderRunActionTarget(item.entityType) ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setLocation(getReminderRunActionTarget(item.entityType)?.href ?? "/quality")
                                          }
                                        >
                                          {getReminderRunActionTarget(item.entityType)?.label}
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {getReminderRunDetailText(item)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">Client Portal Reminder Sweep</p>
                              <p className="text-sm text-muted-foreground">
                                Client document and technician compliance reminder runs.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRunClientPortalReminderSweep}
                              disabled={checkClientPortalRemindersMutation.isPending}
                            >
                              <RefreshCw
                                className={`mr-2 h-4 w-4 ${
                                  checkClientPortalRemindersMutation.isPending ? "animate-spin" : ""
                                }`}
                              />
                              Run
                            </Button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {clientPortalReminderRunHistoryLoading ? (
                              <div className="text-sm text-muted-foreground">Loading history...</div>
                            ) : typedClientPortalReminderRunHistory.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No runs recorded yet.</div>
                            ) : (
                              (typedClientPortalReminderRunHistory as ReminderRunHistoryItem[]).map((item) => (
                                <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span>{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                                      <Badge variant="outline">
                                        {getReminderRunTriggerSource(item.changes)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={getHealthBadgeClass(
                                          item.status === "Success" ? "healthy" : "error"
                                        )}
                                      >
                                        {getReminderRunNotificationCount(item.changes)} sent
                                      </Badge>
                                      {getReminderRunActionTarget(item.entityType) ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setLocation(
                                              getReminderRunActionTarget(item.entityType)?.href ?? "/client-portal"
                                            )
                                          }
                                        >
                                          {getReminderRunActionTarget(item.entityType)?.label}
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {getReminderRunDetailText(item)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">Level III Document Review Sweep</p>
                              <p className="text-sm text-muted-foreground">
                                Documents still waiting for internal Level III review.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRunLevelIIIDocumentReminderSweep}
                              disabled={checkLevelIIIDocumentReviewRemindersMutation.isPending}
                            >
                              <RefreshCw
                                className={`mr-2 h-4 w-4 ${
                                  checkLevelIIIDocumentReviewRemindersMutation.isPending
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                              Run
                            </Button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {levelIIIDocumentReminderRunHistoryLoading ? (
                              <div className="text-sm text-muted-foreground">Loading history...</div>
                            ) : typedLevelIIIDocumentReminderRunHistory.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No runs recorded yet.</div>
                            ) : (
                              (typedLevelIIIDocumentReminderRunHistory as ReminderRunHistoryItem[]).map((item) => (
                                <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span>{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                                      <Badge variant="outline">
                                        {getReminderRunTriggerSource(item.changes)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={getHealthBadgeClass(
                                          item.status === "Success" ? "healthy" : "error"
                                        )}
                                      >
                                        {getReminderRunNotificationCount(item.changes)} sent
                                      </Badge>
                                      {getReminderRunActionTarget(item.entityType) ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setLocation(
                                              getReminderRunActionTarget(item.entityType)?.href ?? "/documents"
                                            )
                                          }
                                        >
                                          {getReminderRunActionTarget(item.entityType)?.label}
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {getReminderRunDetailText(item)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg border bg-background p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium">Planner Timesheet Sweep</p>
                              <p className="text-sm text-muted-foreground">
                                Timesheet review, return-for-change, and leave override reminders.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRunPlannerReminderSweep}
                              disabled={checkPlannerTimesheetRemindersMutation.isPending}
                            >
                              <RefreshCw
                                className={`mr-2 h-4 w-4 ${
                                  checkPlannerTimesheetRemindersMutation.isPending
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                              Run
                            </Button>
                          </div>
                          <div className="mt-3 space-y-2">
                            {plannerReminderRunHistoryLoading ? (
                              <div className="text-sm text-muted-foreground">Loading history...</div>
                            ) : typedPlannerReminderRunHistory.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No runs recorded yet.</div>
                            ) : (
                              (typedPlannerReminderRunHistory as ReminderRunHistoryItem[]).map((item) => (
                                <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span>{new Date(item.createdAt).toLocaleString("en-ZA")}</span>
                                      <Badge variant="outline">
                                        {getReminderRunTriggerSource(item.changes)}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={getHealthBadgeClass(
                                          item.status === "Success" ? "healthy" : "error"
                                        )}
                                      >
                                        {getReminderRunNotificationCount(item.changes)} sent
                                      </Badge>
                                      {getReminderRunActionTarget(item.entityType) ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setLocation(
                                              getReminderRunActionTarget(item.entityType)?.href ?? "/planner"
                                            )
                                          }
                                        >
                                          {getReminderRunActionTarget(item.entityType)?.label}
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {getReminderRunDetailText(item)}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {operationalReadinessLoading ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Refreshing operational readiness...
                    </div>
                  ) : readinessIssues.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No operational readiness issues match the selected filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left">Severity</th>
                            <th className="px-3 py-2 text-left">Area</th>
                            <th className="px-3 py-2 text-left">Issue</th>
                            <th className="px-3 py-2 text-left">Action</th>
                            <th className="px-3 py-2 text-left">Record</th>
                            <th className="px-3 py-2 text-left">Branch</th>
                            <th className="px-3 py-2 text-left">Quality Action</th>
                            <th className="px-3 py-2 text-left">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {readinessIssues.slice(0, 100).map((issue) => (
                            <tr key={issue.id} className="border-t align-top">
                              <td className="px-3 py-2">
                                <Badge className={getReadinessSeverityClass(issue.severity)}>
                                  {getReadinessSeverityLabel(issue.severity)}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">{issue.area}</td>
                              <td className="max-w-md px-3 py-2">
                                <p className="font-medium">{issue.title}</p>
                                <p className="text-muted-foreground">{issue.detail}</p>
                              </td>
                              <td className="max-w-md px-3 py-2 text-muted-foreground">
                                {issue.action}
                              </td>
                              <td className="px-3 py-2">
                                <p className="font-medium">{issue.recordType}</p>
                                <p className="text-xs text-muted-foreground">
                                  {issue.recordId ?? "-"}
                                </p>
                              </td>
                              <td className="px-3 py-2">{issue.branchName ?? "-"}</td>
                              <td className="px-3 py-2">
                                {issue.qualityAction ? (
                                  <div className="space-y-1">
                                    <Badge className={getHealthBadgeClass("attention")}>
                                      Tracked
                                    </Badge>
                                    <p className="font-medium">{issue.qualityAction.referenceNumber}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {issue.qualityAction.status}
                                      {issue.qualityAction.ownerName
                                        ? ` | ${issue.qualityAction.ownerName}`
                                        : ""}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Not tracked</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-2">
                                  {issue.qualityAction ? (
                                    <Button asChild variant="outline" size="sm">
                                      <a href={`/quality?actionId=${issue.qualityAction.id}`}>
                                        Open QA
                                      </a>
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCreateQualityActionFromReadinessIssue(issue)}
                                      disabled={creatingQualityActionIssueId === issue.id}
                                      title="Create a Quality Action from this readiness issue"
                                    >
                                      {creatingQualityActionIssueId === issue.id ? "Creating..." : "Create QA"}
                                    </Button>
                                  )}
                                  <Button asChild variant="outline" size="sm">
                                    <a href={issue.path}>Open</a>
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {readinessIssues.length > 100 ? (
                        <div className="border-t bg-muted/20 p-3 text-xs text-muted-foreground">
                          Showing first 100 of {readinessIssues.length} issues. Use filters or export CSV/PDF for the full list.
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                  <RefreshCw className={`h-4 w-4 ${operationalReadinessLoading ? "animate-spin" : ""}`} />
                  Operational readiness will load when the Health tab is opened.
                </CardContent>
              </Card>
            )}

            {schemaReadiness ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        Database Schema Readiness
                      </CardTitle>
                      <CardDescription>
                        Compares the live MySQL database against the application schema so missing tables and columns are visible before they break a form.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          exportTableToCSV(
                            schemaReadinessExportColumns,
                            buildSchemaReadinessExportRows(schemaReadiness),
                            "database-schema-readiness"
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        disabled={user?.role !== "super_admin" || schemaRepairScriptMutation.isPending}
                        onClick={handleDownloadSchemaRepairScript}
                        title={
                          user?.role === "super_admin"
                            ? "Download a safe SQL script for missing schema items"
                            : "Only Super Admin can export schema repair scripts"
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {schemaRepairScriptMutation.isPending ? "Preparing..." : "Repair SQL"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Schema Status</p>
                      <div className="mt-1">
                        <Badge className={getHealthBadgeClass(schemaReadiness.status)}>
                          {getHealthLabel(schemaReadiness.status)}
                        </Badge>
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Tables Ready</p>
                      <p className="font-medium">
                        {schemaReadiness.summary.readyTables} / {schemaReadiness.summary.expectedTables}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Missing Items</p>
                      <p className="font-medium">
                        {schemaReadiness.summary.missingTables} tables / {schemaReadiness.summary.missingColumns} columns
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Repair Statements</p>
                      <p className="font-medium">{schemaReadiness.summary.repairableStatements}</p>
                    </div>
                  </div>

                  {schemaReadiness.manualReviewItems.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      <p className="mb-2 font-medium">Manual review before running SQL</p>
                      <div className="space-y-1">
                        {schemaReadiness.manualReviewItems.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {user?.role === "super_admin" && schemaReadiness.repairScriptAvailable ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl space-y-2">
                          <Label htmlFor="schema-repair-confirmation" className="text-sm font-medium">
                            Controlled schema repair apply
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            This only creates missing tables and adds missing columns. It does not drop data, remove legacy columns, or modify existing column types.
                          </p>
                          <input
                            id="schema-repair-confirmation"
                            value={schemaRepairConfirmation}
                            onChange={(event) => setSchemaRepairConfirmation(event.target.value)}
                            placeholder={SCHEMA_REPAIR_CONFIRMATION_PHRASE}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Type <span className="font-mono">{SCHEMA_REPAIR_CONFIRMATION_PHRASE}</span> to enable the apply button.
                          </p>
                        </div>
                        <Button
                          onClick={handleApplySchemaRepair}
                          disabled={
                            schemaRepairApplyMutation.isPending ||
                            schemaRepairConfirmation.trim() !== SCHEMA_REPAIR_CONFIRMATION_PHRASE
                          }
                        >
                          {schemaRepairApplyMutation.isPending ? "Applying..." : "Apply Schema Repair"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {schemaRepairApplyResult ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                      <p className="font-medium">Schema repair result</p>
                      <p className="mt-1">
                        {schemaRepairApplyResult.summary.appliedStatements} applied,{" "}
                        {schemaRepairApplyResult.summary.skippedStatements} skipped,{" "}
                        {schemaRepairApplyResult.summary.attemptedStatements} attempted.
                      </p>
                      {schemaRepairApplyResult.safetySnapshot ? (
                        <p className="mt-1">
                          A best-effort safety backup was downloaded before schema changes were applied.
                        </p>
                      ) : null}
                      {schemaRepairApplyResult.manualReviewItems.length > 0 ? (
                        <p className="mt-1">
                          {schemaRepairApplyResult.manualReviewItems.length} item
                          {schemaRepairApplyResult.manualReviewItems.length === 1 ? "" : "s"} still need manual review.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {schemaReadiness.tables.filter((table) => table.status !== "healthy").length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No schema gaps detected. The live database matches the expected application tables and columns.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left">Table</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Columns</th>
                            <th className="px-3 py-2 text-left">Missing</th>
                            <th className="px-3 py-2 text-left">Extra Legacy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schemaReadiness.tables
                            .filter((table) => table.status !== "healthy")
                            .map((table) => {
                              const TableIcon = getHealthIcon(table.status);
                              return (
                                <tr key={table.key} className="border-t">
                                  <td className="px-3 py-2">
                                    <p className="font-medium">{table.label}</p>
                                    <p className="font-mono text-xs text-muted-foreground">{table.tableName}</p>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className={getHealthBadgeClass(table.status)}>
                                      <TableIcon className="mr-1 h-3.5 w-3.5" />
                                      {table.exists ? getHealthLabel(table.status) : "Missing Table"}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    {table.presentColumnCount} / {table.expectedColumnCount}
                                  </td>
                                  <td className="max-w-md px-3 py-2 text-muted-foreground">
                                    {table.missingColumns.length === 0
                                      ? "-"
                                      : table.missingColumns.map((column) => column.name).join(", ")}
                                  </td>
                                  <td className="max-w-md px-3 py-2 text-muted-foreground">
                                    {table.extraColumns.length === 0 ? "-" : table.extraColumns.join(", ")}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Transfer Pack Preview
                </CardTitle>
                <CardDescription>
                  Inspect a transfer pack before using it on another PC. This preview reads the JSON locally and does not write anything to the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {transferPackPreviewError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
                    {transferPackPreviewError}
                  </div>
                ) : null}

                {transferPackPreview ? (
                  (() => {
                    const previewHealth = getBackupPreviewHealthStatus(transferPackPreview.status);
                    const PreviewIcon = getHealthIcon(previewHealth);
                    const generatedAt = transferPackPreview.generatedAt
                      ? new Date(transferPackPreview.generatedAt).toLocaleString("en-ZA")
                      : "Not supplied";
                    const embeddedSchemaStatus =
                      transferPackPreview.summary.schemaStatus ??
                      transferPackPreview.schemaReadiness?.status ??
                      "Unknown";
                    const readmePreview = transferPackPreview.readme
                      ?.split(/\r?\n/)
                      .slice(0, 12)
                      .join("\n");

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
                          <div>
                            <p className="font-medium">{transferPackPreview.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              Generated {generatedAt}
                              {transferPackPreview.generatedBy
                                ? ` by ${transferPackPreview.generatedBy}`
                                : ""}
                            </p>
                          </div>
                          <Badge className={getHealthBadgeClass(previewHealth)}>
                            <PreviewIcon className="mr-1 h-3.5 w-3.5" />
                            {getTransferPackPreviewLabel(transferPackPreview.status)}
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Format / Version</p>
                            <p className="font-medium">
                              {transferPackPreview.format || "Unknown"} /{" "}
                              {transferPackPreview.version ?? "Unknown"}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Embedded Backup</p>
                            <p className="font-medium">
                              {transferPackPreview.summary.backupTableCount ??
                                transferPackPreview.backupPreview?.summary.tableCount ??
                                "Unknown"}{" "}
                              tables /{" "}
                              {transferPackPreview.summary.backupTotalRows ??
                                transferPackPreview.backupPreview?.summary.totalRows ??
                                "Unknown"}{" "}
                              rows
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Schema Readiness</p>
                            <p className="font-medium">
                              {embeddedSchemaStatus} /{" "}
                              {transferPackPreview.summary.repairableStatements ?? "Unknown"} repair
                              statement
                              {transferPackPreview.summary.repairableStatements === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Maintenance History</p>
                            <p className="font-medium">
                              {transferPackPreview.summary.maintenanceHistoryCount ??
                                transferPackPreview.maintenanceHistoryCount}{" "}
                              item
                              {(transferPackPreview.summary.maintenanceHistoryCount ??
                                transferPackPreview.maintenanceHistoryCount) === 1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Missing Schema Items</p>
                            <p className="font-medium">
                              {transferPackPreview.summary.missingTables ?? "Unknown"} tables /{" "}
                              {transferPackPreview.summary.missingColumns ?? "Unknown"} columns
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Manual Review Items</p>
                            <p className="font-medium">
                              {transferPackPreview.summary.manualReviewItems ??
                                transferPackPreview.schemaReadiness?.manualReviewItems.length ??
                                "Unknown"}
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Unreadable Backup Tables</p>
                            <p className="font-medium">
                              {transferPackPreview.summary.unreadableTableCount ?? "Unknown"}
                            </p>
                          </div>
                        </div>

                        {transferPackPreview.warnings.length > 0 ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            <p className="mb-2 font-medium">Review before use</p>
                            <div className="space-y-1">
                              {transferPackPreview.warnings.map((warning) => (
                                <p key={warning}>{warning}</p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                            Transfer pack structure looks ready. You can download its guidance files or load the embedded backup into the restore preview.
                          </div>
                        )}

                        {readmePreview ? (
                          <div className="rounded-lg border">
                            <div className="border-b bg-muted/30 px-4 py-2 text-sm font-medium">
                              Embedded Readme Preview
                            </div>
                            <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-4 text-xs text-muted-foreground">
                              {readmePreview}
                            </pre>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={handleLoadTransferPackBackupPreview}
                            disabled={
                              !transferPackPreview.backupSnapshot ||
                              !transferPackPreview.backupPreview ||
                              transferPackPreview.backupPreview.status === "error"
                            }
                          >
                            <FileJson className="mr-2 h-4 w-4" />
                            Load Embedded Backup
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDownloadTransferPackReadme}
                            disabled={!transferPackPreview.readme}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Readme
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleDownloadTransferPackSchemaSql}
                            disabled={!transferPackPreview.schemaRepairSql}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Schema SQL
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setTransferPackPreview(null);
                              setTransferPackPreviewError(null);
                            }}
                          >
                            Clear Preview
                          </Button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No transfer pack loaded yet. Use Preview Transfer Pack to inspect a transfer readiness JSON file before using it on another machine.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-5 w-5" />
                  Backup Restore Preview
                </CardTitle>
                <CardDescription>
                  Load an exported backup JSON to inspect its contents before any future restore. This preview does not write anything to the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {backupPreviewError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
                    {backupPreviewError}
                  </div>
                ) : null}

                {backupPreview ? (
                  (() => {
                    const previewHealth = getBackupPreviewHealthStatus(backupPreview.status);
                    const PreviewIcon = getHealthIcon(previewHealth);
                    const generatedAt = backupPreview.generatedAt
                      ? new Date(backupPreview.generatedAt).toLocaleString("en-ZA")
                      : "Not supplied";
                    const selectedRestoreTableSet = new Set(selectedRestoreTables);

                    return (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
                          <div>
                            <p className="font-medium">{backupPreview.fileName}</p>
                            <p className="text-sm text-muted-foreground">
                              Generated {generatedAt}
                              {backupPreview.generatedBy ? ` by ${backupPreview.generatedBy}` : ""}
                            </p>
                          </div>
                          <Badge className={getHealthBadgeClass(previewHealth)}>
                            <PreviewIcon className="mr-1 h-3.5 w-3.5" />
                            {getBackupPreviewLabel(backupPreview.status)}
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Format</p>
                            <p className="font-medium">{backupPreview.format || "Unknown"}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Version</p>
                            <p className="font-medium">{backupPreview.version ?? "Unknown"}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Tables / Rows</p>
                            <p className="font-medium">
                              {backupPreview.summary.tableCount} tables / {backupPreview.summary.totalRows} rows
                            </p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-xs text-muted-foreground">Credential Tables</p>
                            <p className="font-medium">
                              {backupPreview.credentialTablesIncluded === true
                                ? "Included"
                                : backupPreview.credentialTablesIncluded === false
                                  ? "Excluded"
                                  : "Unknown"}
                            </p>
                          </div>
                        </div>

                        {backupPreview.warnings.length > 0 ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                            <p className="mb-2 font-medium">Review before restore</p>
                            <div className="space-y-1">
                              {backupPreview.warnings.map((warning) => (
                                <p key={warning}>{warning}</p>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                            Backup structure matches the current expected operational tables.
                          </div>
                        )}

                        {(backupPreview.missingTables.length > 0 || backupPreview.extraTables.length > 0) ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border p-3">
                              <p className="font-medium">Missing Tables</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {backupPreview.missingTables.length === 0
                                  ? "None"
                                  : backupPreview.missingTables
                                      .map((key) => BACKUP_TABLE_LABELS[key] ?? key)
                                      .join(", ")}
                              </p>
                            </div>
                            <div className="rounded-lg border p-3">
                              <p className="font-medium">Extra Tables</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {backupPreview.extraTables.length === 0
                                  ? "None"
                                  : backupPreview.extraTables.join(", ")}
                              </p>
                            </div>
                          </div>
                        ) : null}

                        <div className="rounded-lg border bg-muted/20 p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-2">
                              <Label htmlFor="restore-mode">Restore mode</Label>
                              <select
                                id="restore-mode"
                                value={restoreMode}
                                onChange={(event) => {
                                  setRestoreMode(event.target.value as RestoreMode);
                                  setRestorePlan(null);
                                  setRestorePreflight(null);
                                  setRestoreApplyResult(null);
                                }}
                                className="h-10 rounded-md border bg-background px-3 text-sm"
                              >
                                <option value="merge">Merge with conflict checks</option>
                                <option value="replaceSelected">Replace selected tables</option>
                              </select>
                              <p className="max-w-2xl text-xs text-muted-foreground">
                                This creates a server-side restore plan and audit entry. It still does not apply database changes.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={handleSelectAllRestoreTables}>
                                Select supported tables
                              </Button>
                              <Button variant="outline" size="sm" onClick={handleClearRestoreSelection}>
                                Clear selection
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleGenerateRestorePlan}
                                disabled={
                                  backupRestorePlanMutation.isPending ||
                                  selectedRestoreTables.length === 0 ||
                                  backupPreview.status === "error"
                                }
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                {backupRestorePlanMutation.isPending ? "Planning..." : "Generate Restore Plan"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRunRestorePreflight}
                                disabled={
                                  backupRestorePreflightMutation.isPending ||
                                  selectedRestoreTables.length === 0 ||
                                  backupPreview.status === "error"
                                }
                              >
                                <Database className="mr-2 h-4 w-4" />
                                {backupRestorePreflightMutation.isPending ? "Checking..." : "Run Preflight"}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border">
                          <ScrollArea className="max-h-72">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="px-3 py-2 text-left">Restore</th>
                                  <th className="px-3 py-2 text-left">Table</th>
                                  <th className="px-3 py-2 text-left">Rows</th>
                                  <th className="px-3 py-2 text-left">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {backupPreview.tables.map((table) => (
                                  <tr key={table.key} className="border-t">
                                    <td className="px-3 py-2">
                                      <Checkbox
                                        checked={selectedRestoreTableSet.has(table.key)}
                                        disabled={!EXPECTED_BACKUP_TABLE_KEYS.includes(table.key)}
                                        onCheckedChange={(checked) =>
                                          handleToggleRestoreTable(table.key, Boolean(checked))
                                        }
                                        aria-label={`Include ${table.label} in restore plan`}
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <p className="font-medium">{table.label}</p>
                                      <p className="font-mono text-xs text-muted-foreground">{table.key}</p>
                                    </td>
                                    <td className="px-3 py-2">{table.actualRows}</td>
                                    <td className="px-3 py-2">
                                      {table.rowCountMismatch ? (
                                        <Badge className={getHealthBadgeClass("attention")}>
                                          Row count mismatch
                                        </Badge>
                                      ) : (
                                        <Badge className={getHealthBadgeClass("healthy")}>Readable</Badge>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </ScrollArea>
                        </div>

                        {restorePreflight ? (
                          (() => {
                            const preflightHealth = getBackupRestorePlanHealthStatus(
                              restorePreflight.status
                            );
                            const PreflightIcon = getHealthIcon(preflightHealth);

                            return (
                              <div className="space-y-4 rounded-lg border p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium">Restore Preflight</p>
                                    <p className="text-sm text-muted-foreground">
                                      {getRestoreModeLabel(restorePreflight.mode)} checked at{" "}
                                      {new Date(restorePreflight.checkedAt).toLocaleString("en-ZA")}.
                                    </p>
                                  </div>
                                  <Badge className={getHealthBadgeClass(preflightHealth)}>
                                    <PreflightIcon className="mr-1 h-3.5 w-3.5" />
                                    {getBackupRestorePlanLabel(restorePreflight.status)}
                                  </Badge>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Tables Checked</p>
                                    <p className="font-medium">{restorePreflight.summary.selectedTableCount}</p>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Backup / Current Rows</p>
                                    <p className="font-medium">
                                      {restorePreflight.summary.selectedRows} / {restorePreflight.summary.currentRows}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Blocked / Review</p>
                                    <p className="font-medium">
                                      {restorePreflight.summary.blockedTables} / {restorePreflight.summary.reviewTables}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Duplicate IDs</p>
                                    <p className="font-medium">
                                      {restorePreflight.summary.duplicatePrimaryKeyCount}
                                    </p>
                                  </div>
                                </div>

                                {restorePreflight.errors.length > 0 ? (
                                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
                                    <p className="mb-2 font-medium">Blocked items</p>
                                    <div className="space-y-1">
                                      {restorePreflight.errors.map((error) => (
                                        <p key={error}>{error}</p>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {restorePreflight.warnings.length > 0 ? (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                                    <p className="mb-2 font-medium">Review items</p>
                                    <div className="space-y-1">
                                      {restorePreflight.warnings.map((warning) => (
                                        <p key={warning}>{warning}</p>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                <div className="overflow-x-auto rounded-lg border">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Table</th>
                                        <th className="px-3 py-2 text-left">Status</th>
                                        <th className="px-3 py-2 text-left">Columns</th>
                                        <th className="px-3 py-2 text-left">Duplicate IDs</th>
                                        <th className="px-3 py-2 text-left">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {restorePreflight.selectedTables.map((table) => {
                                        const tableHealth = getBackupRestorePlanHealthStatus(table.status);
                                        return (
                                          <tr key={table.key} className="border-t">
                                            <td className="px-3 py-2">
                                              <p className="font-medium">{table.label}</p>
                                              <p className="font-mono text-xs text-muted-foreground">{table.key}</p>
                                            </td>
                                            <td className="px-3 py-2">
                                              <Badge className={getHealthBadgeClass(tableHealth)}>
                                                {getBackupRestorePlanLabel(table.status)}
                                              </Badge>
                                            </td>
                                            <td className="px-3 py-2">
                                              {table.backupColumnCount} backup / {table.destinationColumnCount} destination
                                            </td>
                                            <td className="px-3 py-2">
                                              {table.duplicatePrimaryKeyCount}
                                              {table.duplicatePrimaryKeySamples.length > 0
                                                ? ` (${table.duplicatePrimaryKeySamples.join(", ")})`
                                                : ""}
                                            </td>
                                            <td className="max-w-lg px-3 py-2 text-muted-foreground">
                                              {table.notes.length > 0 ? table.notes.join(" ") : "No issues found."}
                                              {table.missingDestinationColumns.length > 0
                                                ? ` Missing columns: ${table.missingDestinationColumns.join(", ")}.`
                                                : ""}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="rounded-lg border bg-muted/20 p-4">
                                  <p className="mb-2 font-medium">Preflight recommendation</p>
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    {restorePreflight.next.map((step, index) => (
                                      <p key={step}>
                                        {index + 1}. {step}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : null}

                        {restorePlan ? (
                          (() => {
                            const planHealth = getBackupRestorePlanHealthStatus(restorePlan.status);
                            const PlanIcon = getHealthIcon(planHealth);

                            return (
                              <div className="space-y-4 rounded-lg border p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium">Controlled Restore Plan</p>
                                    <p className="text-sm text-muted-foreground">
                                      {getRestoreModeLabel(restorePlan.mode)} planned at{" "}
                                      {new Date(restorePlan.plannedAt).toLocaleString("en-ZA")}.
                                    </p>
                                  </div>
                                  <Badge className={getHealthBadgeClass(planHealth)}>
                                    <PlanIcon className="mr-1 h-3.5 w-3.5" />
                                    {getBackupRestorePlanLabel(restorePlan.status)}
                                  </Badge>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Selected Tables</p>
                                    <p className="font-medium">{restorePlan.summary.selectedTableCount}</p>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Backup Rows</p>
                                    <p className="font-medium">{restorePlan.summary.selectedRows}</p>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Current Rows Affected</p>
                                    <p className="font-medium">{restorePlan.summary.affectedCurrentRows}</p>
                                  </div>
                                  <div className="rounded-lg border p-3">
                                    <p className="text-xs text-muted-foreground">Confirmation Phrase</p>
                                    <p className="font-mono text-xs font-medium">
                                      {restorePlan.requiredConfirmation}
                                    </p>
                                  </div>
                                </div>

                                {restorePlan.errors.length > 0 ? (
                                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
                                    <p className="mb-2 font-medium">Blocked items</p>
                                    <div className="space-y-1">
                                      {restorePlan.errors.map((error) => (
                                        <p key={error}>{error}</p>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {restorePlan.warnings.length > 0 ? (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                                    <p className="mb-2 font-medium">Review items</p>
                                    <div className="space-y-1">
                                      {restorePlan.warnings.map((warning) => (
                                        <p key={warning}>{warning}</p>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                <div className="overflow-x-auto rounded-lg border">
                                  <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th className="px-3 py-2 text-left">Table</th>
                                        <th className="px-3 py-2 text-left">Backup Rows</th>
                                        <th className="px-3 py-2 text-left">Current Rows</th>
                                        <th className="px-3 py-2 text-left">Planned Action</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {restorePlan.selectedTables.map((table) => (
                                        <tr key={table.key} className="border-t">
                                          <td className="px-3 py-2">
                                            <p className="font-medium">{table.label}</p>
                                            <p className="font-mono text-xs text-muted-foreground">{table.key}</p>
                                          </td>
                                          <td className="px-3 py-2">{table.backupRows}</td>
                                          <td className="px-3 py-2">{table.currentRows ?? "Unknown"}</td>
                                          <td className="px-3 py-2 text-muted-foreground">{table.action}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="rounded-lg border bg-muted/20 p-4">
                                  <p className="mb-2 font-medium">Next apply sequence</p>
                                  <div className="space-y-1 text-sm text-muted-foreground">
                                    {restorePlan.steps.map((step, index) => (
                                      <p key={step}>
                                        {index + 1}. {step}
                                      </p>
                                    ))}
                                  </div>
                                </div>

                                {restoreMode === "merge" ? (
                                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                                    <Label htmlFor="restore-confirmation" className="text-sm font-medium">
                                      Direct merge apply confirmation
                                    </Label>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Type <span className="font-mono">{restorePlan.requiredConfirmation}</span> to
                                      insert non-conflicting backup rows. A safety backup will download automatically before results are shown.
                                    </p>
                                    <input
                                      id="restore-confirmation"
                                      value={restoreConfirmation}
                                      onChange={(event) => setRestoreConfirmation(event.target.value)}
                                      placeholder={restorePlan.requiredConfirmation}
                                      className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                    />
                                  </div>
                                ) : (
                                  <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                                    Direct apply is disabled for replace-selected mode. Use the SQL script export and review it manually before running.
                                  </div>
                                )}

                                {restoreApplyResult ? (
                                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                                    <p className="font-medium">Restore applied</p>
                                    <p className="mt-1">
                                      {restoreApplyResult.summary.insertedRows} row
                                      {restoreApplyResult.summary.insertedRows === 1 ? "" : "s"} inserted,{" "}
                                      {restoreApplyResult.summary.skippedRows} skipped across{" "}
                                      {restoreApplyResult.summary.selectedTableCount} table
                                      {restoreApplyResult.summary.selectedTableCount === 1 ? "" : "s"}.
                                    </p>
                                  </div>
                                ) : null}

                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <p className="text-xs text-muted-foreground">
                                    SQL export is still available; direct apply is merge-only and requires a non-blocked preflight.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={handleDownloadRestoreScript}
                                      disabled={
                                        backupRestoreScriptMutation.isPending ||
                                        restorePlan.status === "blocked" ||
                                        restorePreflight?.status === "blocked"
                                      }
                                    >
                                      <Download className="mr-2 h-4 w-4" />
                                      {backupRestoreScriptMutation.isPending
                                        ? "Exporting..."
                                        : "Download SQL Script"}
                                    </Button>
                                    <Button
                                      onClick={handleApplyMergeRestore}
                                      disabled={
                                        restoreMode !== "merge" ||
                                        backupRestoreApplyMutation.isPending ||
                                        restorePlan.status === "blocked" ||
                                        restorePreflight?.status === "blocked" ||
                                        restoreConfirmation.trim() !== restorePlan.requiredConfirmation
                                      }
                                      title={
                                        restoreMode === "merge"
                                          ? "Apply a merge restore after confirmation"
                                          : "Direct apply is merge-only"
                                      }
                                    >
                                      {backupRestoreApplyMutation.isPending ? "Applying..." : "Apply Merge Restore"}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        ) : null}

                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            onClick={resetBackupRestorePreviewState}
                          >
                            Clear Preview
                          </Button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No backup file loaded yet. Use Preview Backup to validate an exported JSON file before planning a restore.
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.role === "super_admin" ? (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        System Maintenance History
                      </CardTitle>
                      <CardDescription>
                        Recent backup exports, restore planning, restore applies, and schema repair activity from the audit log.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchRestoreHistory()}
                        disabled={restoreHistoryLoading}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${restoreHistoryLoading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={typedRestoreHistory.length === 0}
                        onClick={() =>
                          exportTableToCSV(
                            restoreHistoryExportColumns,
                            buildRestoreHistoryExportRows(typedRestoreHistory),
                            "system-maintenance-history"
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {restoreHistoryLoading ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading maintenance activity...
                    </div>
                  ) : typedRestoreHistory.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No system maintenance activity has been recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Activity</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Actor</th>
                            <th className="px-3 py-2 text-left">Mode / Scope</th>
                            <th className="px-3 py-2 text-left">Tables / Statements</th>
                            <th className="px-3 py-2 text-left">Rows / Applied</th>
                            <th className="px-3 py-2 text-left">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {typedRestoreHistory.map((item) => {
                            const activityHealth = getBackupRestorePlanHealthStatus(
                              getRestoreActivityStatus(item)
                            );
                            const actor = item.actorName || item.actorEmail || `User ${item.userId}`;
                            const tableCount = getMaintenanceHistoryTableCount(item);
                            const rowCount = getMaintenanceHistoryRowCount(item);
                            const notes = getMaintenanceHistoryNotes(item);

                            return (
                              <tr key={item.id} className="border-t">
                                <td className="px-3 py-2">
                                  {new Date(item.createdAt).toLocaleString("en-ZA")}
                                </td>
                                <td className="px-3 py-2 font-medium">
                                  {getRestoreActivityLabel(item.entityType)}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge className={getHealthBadgeClass(activityHealth)}>
                                    {item.status === "Failed"
                                      ? "Failed"
                                      : getBackupRestorePlanLabel(getRestoreActivityStatus(item))}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2">{actor}</td>
                                <td className="px-3 py-2">{getMaintenanceHistoryScope(item)}</td>
                                <td className="px-3 py-2">{tableCount}</td>
                                <td className="px-3 py-2">{rowCount}</td>
                                <td className="max-w-md px-3 py-2 text-muted-foreground">{notes}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {diagnosticsError ? (
              <Card className="border-rose-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-rose-700">
                    <XCircle className="h-5 w-5" />
                    Diagnostics Unavailable
                  </CardTitle>
                  <CardDescription>{diagnosticsError.message}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {diagnostics ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Overall Status</CardDescription>
                      <CardTitle className="flex items-center gap-2">
                        {React.createElement(getHealthIcon((diagnostics as SystemDiagnostics).status), {
                          className: "h-5 w-5",
                        })}
                        {getHealthLabel((diagnostics as SystemDiagnostics).status)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={getHealthBadgeClass((diagnostics as SystemDiagnostics).status)}>
                        {(diagnostics as SystemDiagnostics).summary.healthy} healthy /{" "}
                        {(diagnostics as SystemDiagnostics).summary.total} checks
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Database</CardDescription>
                      <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        {(diagnostics as SystemDiagnostics).database.ok ? "Connected" : "Offline"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {(diagnostics as SystemDiagnostics).database.latencyMs ?? "-"} ms
                      {(diagnostics as SystemDiagnostics).database.version
                        ? ` | MySQL ${(diagnostics as SystemDiagnostics).database.version}`
                        : ""}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Attention</CardDescription>
                      <CardTitle className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                        {(diagnostics as SystemDiagnostics).summary.attention}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Configuration items to review before production use.
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Errors</CardDescription>
                      <CardTitle className="flex items-center gap-2 text-rose-700">
                        <XCircle className="h-5 w-5" />
                        {(diagnostics as SystemDiagnostics).summary.error}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Schema or connectivity problems needing immediate attention.
                    </CardContent>
                  </Card>
                </div>

                <Card ref={diagnosticsRef}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Attention Snapshot
                    </CardTitle>
                    <CardDescription>
                      The items below are the first places to look if testing reveals odd behaviour.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {healthAttentionChecks.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        No health checks currently need attention.
                      </div>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {healthAttentionChecks.map((check) => {
                          const HealthIcon = getHealthIcon(check.status);
                          return (
                            <div key={`attention-${check.key}`} className="rounded-lg border p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={getHealthBadgeClass(check.status)}>
                                  <HealthIcon className="mr-1 h-3.5 w-3.5" />
                                  {getHealthLabel(check.status)}
                                </Badge>
                                <p className="font-medium">{check.label}</p>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5" />
                      Environment
                    </CardTitle>
                    <CardDescription>
                      Last checked{" "}
                      {new Date((diagnostics as SystemDiagnostics).checkedAt).toLocaleString("en-ZA")}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Mode</p>
                        <p className="font-medium">{(diagnostics as SystemDiagnostics).environment.nodeEnv}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">App URL</p>
                        <p className="truncate font-medium">
                          {(diagnostics as SystemDiagnostics).environment.appBaseUrl}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Database Host</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.databaseHost}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Local Auth Bypass</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.localAuthBypass
                            ? "Enabled"
                            : "Disabled"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Local Auth Email</p>
                        <p className="truncate font-medium">
                          {(diagnostics as SystemDiagnostics).environment.localAuthEmail}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">External Owner Notifications</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.ownerNotificationConfigured
                            ? "Configured"
                            : "Not configured"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">SMTP Delivery</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.smtpConfigured
                            ? "Configured"
                            : "Not configured"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Storage</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.storageProvider === "s3"
                            ? "S3 / durable"
                            : (diagnostics as SystemDiagnostics).environment.storageDurable
                              ? "Local / development"
                              : "Local / not durable"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Bootstrap Admin Password</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.bootstrapAdminPasswordConfigured
                            ? "Still configured"
                            : "Removed"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Reminder Scheduler</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.reminderSchedulerEnabled
                            ? `Enabled (${(diagnostics as SystemDiagnostics).environment.reminderSchedulerIntervalMinutes} min)`
                            : "Disabled"}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Local Storage Production Override</p>
                        <p className="font-medium">
                          {(diagnostics as SystemDiagnostics).environment.storageProductionOverride
                            ? "Enabled"
                            : "Off"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diagnostic Checks</CardTitle>
                    <CardDescription>
                      Each database table check reads the mapped columns, so missing schema changes are easier to spot.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left">Check</th>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Detail</th>
                            <th className="px-3 py-2 text-left">Rows</th>
                            <th className="px-3 py-2 text-left">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(diagnostics as SystemDiagnostics).checks.map((check) => {
                            const HealthIcon = getHealthIcon(check.status);
                            return (
                              <tr key={check.key} className="border-t">
                                <td className="px-3 py-2 font-medium">{check.label}</td>
                                <td className="px-3 py-2">
                                  <Badge className={getHealthBadgeClass(check.status)}>
                                    <HealthIcon className="mr-1 h-3.5 w-3.5" />
                                    {getHealthLabel(check.status)}
                                  </Badge>
                                </td>
                                <td className="max-w-xl px-3 py-2 text-muted-foreground">
                                  {check.detail}
                                </td>
                                <td className="px-3 py-2">{check.count ?? "-"}</td>
                                <td className="px-3 py-2">
                                  {check.durationMs === null || check.durationMs === undefined
                                    ? "-"
                                    : `${check.durationMs} ms`}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : diagnosticsLoading ? (
              <Card>
                <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Running diagnostics...
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Audit Trail
                    </CardTitle>
                    <CardDescription>
                      Review user, branch, permission, import, export, schema repair, and restore activity from one controlled place.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchAuditTrail()}
                      disabled={auditTrailLoading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${auditTrailLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={typedAuditTrail.length === 0}
                      onClick={() =>
                        exportTableToCSV(
                          auditTrailExportColumns,
                          buildAuditTrailExportRows(typedAuditTrail),
                          "admin-audit-trail"
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={typedAuditTrail.length === 0}
                      onClick={() =>
                        exportTableToPDF(
                          auditTrailExportColumns,
                          buildAuditTrailExportRows(typedAuditTrail),
                          "admin-audit-trail",
                          "Admin Audit Trail"
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Returned Records</p>
                    <p className="font-medium">{auditTrailSummary.total}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Successful</p>
                    <p className="font-medium text-emerald-700">{auditTrailSummary.success}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="font-medium text-rose-700">{auditTrailSummary.failed}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Actors</p>
                    <p className="font-medium">{auditTrailSummary.actors.length}</p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="audit-search">Search</Label>
                      <input
                        id="audit-search"
                        value={auditSearch}
                        onChange={(event) => setAuditSearch(event.target.value)}
                        placeholder="Action, entity, or error"
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-action">Action</Label>
                      <select
                        id="audit-action"
                        value={auditActionFilter}
                        onChange={(event) => setAuditActionFilter(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="all">All actions</option>
                        {auditActionOptions.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-entity">Entity</Label>
                      <select
                        id="audit-entity"
                        value={auditEntityFilter}
                        onChange={(event) => setAuditEntityFilter(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="all">All entities</option>
                        {auditEntityOptions.map((entityType) => (
                          <option key={entityType} value={entityType}>
                            {entityType}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-status">Status</Label>
                      <select
                        id="audit-status"
                        value={auditStatusFilter}
                        onChange={(event) => setAuditStatusFilter(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="all">All statuses</option>
                        <option value="Success">Success</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-user">Actor</Label>
                      <select
                        id="audit-user"
                        value={auditUserFilter}
                        onChange={(event) => setAuditUserFilter(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="all">All users</option>
                        {(users as AppUser[]).map((appUser) => (
                          <option key={appUser.id} value={String(appUser.id)}>
                            {appUser.name || appUser.email || `User ${appUser.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-start-date">From</Label>
                      <input
                        id="audit-start-date"
                        type="date"
                        value={auditStartDate}
                        onChange={(event) => setAuditStartDate(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-end-date">To</Label>
                      <input
                        id="audit-end-date"
                        type="date"
                        value={auditEndDate}
                        onChange={(event) => setAuditEndDate(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="audit-limit">Limit</Label>
                      <select
                        id="audit-limit"
                        value={auditLimit}
                        onChange={(event) => setAuditLimit(event.target.value)}
                        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      >
                        <option value="50">50 records</option>
                        <option value="100">100 records</option>
                        <option value="250">250 records</option>
                        <option value="500">500 records</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAuditSearch("");
                        setAuditActionFilter("all");
                        setAuditEntityFilter("all");
                        setAuditStatusFilter("all");
                        setAuditUserFilter("all");
                        setAuditStartDate("");
                        setAuditEndDate("");
                        setAuditLimit("100");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>

                {auditTrailLoading ? (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading audit trail...
                  </div>
                ) : typedAuditTrail.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No audit records match the selected filters yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Actor</th>
                          <th className="px-3 py-2 text-left">Action</th>
                          <th className="px-3 py-2 text-left">Entity</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Changes</th>
                          <th className="px-3 py-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typedAuditTrail.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="whitespace-nowrap px-3 py-2">
                              {new Date(item.createdAt).toLocaleString("en-ZA")}
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">
                                {item.actorName || item.actorEmail || `User ${item.userId}`}
                              </p>
                              {item.actorEmail ? (
                                <p className="text-xs text-muted-foreground">{item.actorEmail}</p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline">{item.action}</Badge>
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{item.entityType}</p>
                              <p className="text-xs text-muted-foreground">#{item.entityId}</p>
                            </td>
                            <td className="px-3 py-2">
                              <Badge
                                className={getHealthBadgeClass(
                                  item.status === "Success" ? "healthy" : "error"
                                )}
                              >
                                {item.status}
                              </Badge>
                            </td>
                            <td className="max-w-md px-3 py-2 text-muted-foreground">
                              {item.changesSummary}
                            </td>
                            <td className="max-w-md px-3 py-2 text-rose-700">
                              {item.errorMessage || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <FormDialog
        open={isUserFormOpen}
        onOpenChange={setIsUserFormOpen}
        title={editingUser ? "Edit User" : "Add User"}
        description="Create or update a system user record."
        fields={userFormFields}
        initialValues={
          editingUser
            ? {
                name: editingUser.name ?? "",
                email: editingUser.email ?? "",
                role: editingUser.role,
              }
            : {
                role: "user",
              }
        }
        onSubmit={handleUserSubmit}
        isLoading={isSubmitting}
        error={error}
        submitLabel={editingUser ? "Update" : "Create"}
      />

      <FormDialog
        open={Boolean(accessPasswordTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAccessPasswordTarget(null);
            setAccessPasswordError(null);
          }
        }}
        title="Issue Temporary Password"
        description={`Set a new temporary password for ${accessPasswordTarget?.name || accessPasswordTarget?.email || "this user"}. The user will be forced to change it at first sign-in.`}
        fields={accessPasswordFields}
        initialValues={{}}
        onSubmit={handleAccessAuditPasswordReset}
        isLoading={updateUserMutation.isPending}
        error={accessPasswordError}
        submitLabel="Issue Temporary Password"
      />

      <FormDialog
        open={isBranchFormOpen}
        onOpenChange={(open) => {
          if (!canManageBranches) {
            setIsBranchFormOpen(false);
            return;
          }
          setIsBranchFormOpen(open);
        }}
        title={editingBranch ? "Edit Branch" : "Add Branch"}
        description="Create or update branch details and branding."
        fields={branchFormFields}
        initialValues={
          editingBranch
            ? {
                name: editingBranch.name,
                code: editingBranch.code ?? "",
                description: editingBranch.description ?? "",
                companyName: editingBranch.companyName ?? "",
                companyDescription: editingBranch.companyDescription ?? "",
                logoUrl: editingBranch.logoUrl ?? "",
                primaryColor: editingBranch.primaryColor ?? "",
                secondaryColor: editingBranch.secondaryColor ?? "",
              }
            : {}
        }
        onSubmit={handleBranchSubmit}
        isLoading={isSubmitting}
        error={error}
        submitLabel={editingBranch ? "Update" : "Create"}
      />

      <Dialog
        open={isPermissionDialogOpen}
        onOpenChange={(open) => {
          setIsPermissionDialogOpen(open);
          if (!open) {
            setSelectedUserForPermissions(null);
            setPermissionSeedUserId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Access</DialogTitle>
            <DialogDescription>
              Set app access, page access, and actions for {selectedUserForPermissions?.name || selectedUserForPermissions?.email}.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[28rem] rounded-md border p-4">
            <div className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="app-access"
                    checked={hasAppAccess}
                    onCheckedChange={(checked) => handleAppAccessToggle(Boolean(checked))}
                  />
                  <Label htmlFor="app-access" className="cursor-pointer font-medium">
                    App Access
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Turn this on to give the user access to the application. Turning it off removes all page and action access.
                </p>
              </div>
              {permissionRows.map((permission) => (
                <div key={permission.module} className="border-b pb-4 last:border-b-0">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <h4 className="font-medium text-sm">
                      {MODULE_LABELS[permission.module] ?? permission.module}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${permission.module}-app-access`}
                        checked={permission.canView}
                        onCheckedChange={(checked) =>
                          handleModuleAppAccessChange(permission.module, Boolean(checked))
                        }
                      />
                      <Label htmlFor={`${permission.module}-app-access`} className="cursor-pointer text-sm">
                        Page Access
                      </Label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((key) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${permission.module}-${key}`}
                          checked={permission[key]}
                          disabled={!permission.canView && key !== "canView"}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(permission.module, key, Boolean(checked))
                          }
                        />
                        <Label htmlFor={`${permission.module}-${key}`} className="cursor-pointer">
                          {key === "canView" ? "View" : key === "canCreate" ? "Add" : key === "canEdit" ? "Edit" : "Delete"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={isSubmitting}>
              Save Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FormDialog
        open={isSpecimenTypeFormOpen}
        onOpenChange={(open) => {
          setIsSpecimenTypeFormOpen(open);
          if (!open) setEditingSpecimenType(null);
        }}
        title={editingSpecimenType ? "Edit Specimen Type" : "Add Specimen Type"}
        description="Create or update a specimen type that users can select from the dropdown."
        onSubmit={async (values) => {
          try {
            const payload = {
              name: String(values.name || "").trim(),
              material: String(values.material || "").trim() || undefined,
              size: String(values.size || "").trim() || undefined,
              weight: String(values.weight || "").trim() || undefined,
              description: String(values.description || "").trim() || undefined,
            };

            if (editingSpecimenType) {
              await updateSpecimenTypeMutation.mutateAsync({
                id: editingSpecimenType.id,
                data: payload,
              });
              toast.success("Specimen type updated");
            } else {
              await createSpecimenTypeMutation.mutateAsync(payload);
              toast.success("Specimen type created");
            }
            setIsSpecimenTypeFormOpen(false);
            setEditingSpecimenType(null);
            await refetchSpecimenTypes();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save specimen type");
          }
        }}
        initialValues={
          editingSpecimenType
            ? {
                name: editingSpecimenType.name,
                material: editingSpecimenType.material ?? "",
                size: editingSpecimenType.size ?? "",
                weight: editingSpecimenType.weight ?? "",
                description: editingSpecimenType.description ?? "",
              }
            : {}
        }
        fields={[
          { name: "name", label: "Type Name", type: "text", required: true, placeholder: "UT Block" },
          { name: "material", label: "Material", type: "text", required: false, placeholder: "Mild steel" },
          { name: "size", label: "Size", type: "text", required: false, placeholder: "100 x 50 x 10 mm" },
          { name: "weight", label: "Weight", type: "text", required: false, placeholder: "1.2 kg" },
          { name: "description", label: "Description", type: "textarea", required: false },
        ]}
        isLoading={createSpecimenTypeMutation.isPending || updateSpecimenTypeMutation.isPending}
      />

      <FormDialog
        open={isMethodFormOpen}
        onOpenChange={(open) => {
          setIsMethodFormOpen(open);
          if (!open) setEditingMethod(null);
        }}
        title={editingMethod ? "Edit Method" : "Add Method"}
        description="Create or update a method that lecturers can be assigned to."
        onSubmit={async (values) => {
          try {
            const payload = {
              name: String(values.name || "").trim(),
              color:
                String(values.color || "").trim() ||
                suggestMethodColor(
                  String(values.name || "").trim(),
                  (methods as Method[]).map((method) => method.color)
                ),
              description: String(values.description || "").trim() || undefined,
            };

            if (editingMethod) {
              await updateMethodMutation.mutateAsync({
                id: editingMethod.id,
                data: payload,
              });
              toast.success("Method updated");
            } else {
              await createMethodMutation.mutateAsync(payload);
              toast.success("Method created");
            }
            setIsMethodFormOpen(false);
            setEditingMethod(null);
            await refetchMethods();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save method");
          }
        }}
        initialValues={
          editingMethod
            ? {
                name: editingMethod.name,
                color: editingMethod.color || getDefaultMethodColor(editingMethod.name),
                description: editingMethod.description ?? "",
              }
            : {
                color: getDefaultMethodColor(""),
              }
        }
        normalizeValues={(nextValues, change) => {
          if (!editingMethod && change.name === "name") {
            return {
              ...nextValues,
              color: getDefaultMethodColor(String(change.value || "")),
            };
          }
          return nextValues;
        }}
        fields={[
          { name: "name", label: "Method Name", type: "text", required: true, placeholder: "Ultrasonic Testing" },
          {
            name: "color",
            label: "Calendar Colour",
            type: "color",
            required: true,
            validation: (value) =>
              /^#[0-9a-fA-F]{6}$/.test(String(value || ""))
                ? undefined
                : "Please choose a valid colour.",
          },
          { name: "description", label: "Description", type: "textarea", required: false },
        ]}
        isLoading={createMethodMutation.isPending || updateMethodMutation.isPending}
      />
    </DashboardLayout>
  );
}
