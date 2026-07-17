import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type {
  AccessAuditRemediationRow,
  AccessAuditRolloutRow,
  AccessGoLiveGate,
  AccessLaunchSignOffState,
  AuditTrailItem,
  BackupPreview,
  BackupRestoreHistoryItem,
  BackupRestorePlanStatus,
  BackupPreviewStatus,
  HealthStatus,
  LevelIIICertificateReminderRecord,
  LevelIIICertificateQueueHealth,
  OperationalReadinessIssue,
  OperationalReadinessSeverity,
  OperationalReadinessSnapshot,
  ProductionLaunchSignOffState,
  ProductionReadinessIssue,
  ReminderRunHistoryItem,
  RestoreMode,
  SchemaReadiness,
  SystemDiagnostics,
  TransferPackPreview,
} from "./adminTypes";

export const MODULE_LABELS: Record<string, string> = {
  students: "Students",
  leads: "Leads",
  companies: "Companies",
  courses: "Courses",
  schedules: "Schedules",
  enrollments: "Enrolments",
  attendance: "Attendance",
  equipment: "Equipment",
  specimens: "Specimens",
  kpi: "KPI",
  lecturers: "Lecturers",
  training: "Training",
  level_ii: "Level II",
  quality: "Quality",
  planner: "Planner",
  reports: "Reports",
  documents: "Documents",
  level_iii: "Level III Services",
  branches: "Branches",
  admin: "Administration",
};

export const BACKUP_TABLE_LABELS: Record<string, string> = {
  users: "Application Users",
  moduleAccess: "Page Access Permissions",
  branches: "Branches",
  students: "Students",
  leads: "Leads",
  companies: "Companies",
  contacts: "Contacts",
  leadActivities: "Lead Activities",
  courses: "Courses",
  courseSchedules: "Course Schedules",
  enrollments: "Enrolments",
  attendance: "Attendance",
  assessments: "Assessments",
  certificates: "Certificates",
  lecturers: "Lecturers",
  methods: "Methods",
  trainingOfferings: "Training Offerings",
  equipment: "Equipment",
  equipmentDocuments: "Equipment Documents",
  equipmentLoans: "Equipment Loans",
  specimenTypes: "Specimen Types",
  specimens: "Specimens",
  specimenDocuments: "Specimen Documents",
  specimenLoans: "Specimen Loans",
  levelIIIClients: "Level III Clients",
  levelIIIActivities: "Level III Activities",
  levelIIITechnicians: "Level III Technicians",
  levelIIIAssessments: "Level III Assessments",
  levelIIIEquipment: "Level III Equipment",
  levelIIISpecimens: "Level III Specimens",
  kpiTemplates: "KPI Templates",
  kpiQuestions: "KPI Questions",
  kpiRecords: "KPI Records",
  kpiAnswers: "KPI Answers",
  documents: "Documents",
  plannerEntries: "Planner Entries",
  sharedPlannerEvents: "Shared Planner Events",
  reports: "Reports",
  qualityActions: "Quality Actions",
  qualityAudits: "Quality Audits",
  managementReviews: "Management Reviews",
  externalProviders: "External Providers",
  importLogs: "Import Logs",
  auditLogs: "Audit Logs",
  notifications: "Notifications",
  notificationPreferences: "Notification Preferences",
};

export const EXPECTED_BACKUP_TABLE_KEYS = Object.keys(BACKUP_TABLE_LABELS);
export const SCHEMA_REPAIR_CONFIRMATION_PHRASE = "APPLY SCHEMA REPAIR";
export const LEVEL_III_CERTIFICATE_REVIEW_REMINDER_DAYS = 2;
export const LEVEL_III_CERTIFICATE_EXPIRY_REMINDER_DAYS = 30;

export function getHealthBadgeClass(status: HealthStatus) {
  switch (status) {
    case "healthy":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100";
    case "attention":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100";
    case "error":
    default:
      return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-100";
  }
}

export function getHealthIcon(status: HealthStatus) {
  switch (status) {
    case "healthy":
      return CheckCircle2;
    case "attention":
      return AlertTriangle;
    case "error":
    default:
      return XCircle;
  }
}

export function getHealthLabel(status: HealthStatus) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "attention":
      return "Attention";
    case "error":
    default:
      return "Error";
  }
}

export function getReadinessSeverityClass(severity: OperationalReadinessSeverity) {
  switch (severity) {
    case "critical":
      return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-100";
    case "warning":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100";
    case "info":
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100";
  }
}

export function getReadinessSeverityLabel(severity: OperationalReadinessSeverity) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    case "info":
    default:
      return "Info";
  }
}

export function getDaysUntil(dateValue: string | Date | null | undefined) {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
}

export function buildLevelIIICertificateQueueHealth(
  certificates: LevelIIICertificateReminderRecord[]
): LevelIIICertificateQueueHealth {
  return certificates.reduce<LevelIIICertificateQueueHealth>(
    (summary, certificate) => {
      const daysUntilExpiry = getDaysUntil(certificate.validUntil);
      const daysSinceReviewRequest =
        certificate.approvalStatus === "in_review"
          ? getDaysUntil(certificate.approvalRequestedAt)
          : null;

      if (certificate.status === "Active") {
        summary.active += 1;
      }
      if (certificate.approvalStatus === "in_review") {
        summary.inReview += 1;
      }
      if (
        certificate.approvalStatus === "in_review" &&
        daysSinceReviewRequest !== null &&
        daysSinceReviewRequest <= -LEVEL_III_CERTIFICATE_REVIEW_REMINDER_DAYS
      ) {
        summary.reviewWaiting += 1;
      }
      if (
        certificate.status !== "Revoked" &&
        certificate.status !== "Superseded" &&
        daysUntilExpiry !== null &&
        daysUntilExpiry >= 0 &&
        daysUntilExpiry <= LEVEL_III_CERTIFICATE_EXPIRY_REMINDER_DAYS
      ) {
        summary.expiringSoon += 1;
      }
      if (
        certificate.status !== "Revoked" &&
        certificate.status !== "Superseded" &&
        daysUntilExpiry !== null &&
        daysUntilExpiry < 0
      ) {
        summary.overdue += 1;
      }
      if (
        certificate.approvalStatus === "draft" &&
        certificate.status !== "Superseded" &&
        certificate.status !== "Revoked"
      ) {
        summary.blockedDrafts += 1;
      }
      return summary;
    },
    {
      active: 0,
      inReview: 0,
      reviewWaiting: 0,
      expiringSoon: 0,
      overdue: 0,
      blockedDrafts: 0,
    }
  );
}

export function getReminderRunNotificationCount(changes: unknown) {
  if (!changes) return 0;
  const parsed =
    typeof changes === "string"
      ? (() => {
          try {
            return JSON.parse(changes) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : typeof changes === "object" && !Array.isArray(changes)
        ? (changes as Record<string, unknown>)
        : null;
  const value = parsed?.notificationsSent;
  return typeof value === "number" ? value : Number(value ?? 0) || 0;
}

export function getReminderRunTriggerSource(changes: unknown) {
  if (!changes) return "Manual";
  const parsed =
    typeof changes === "string"
      ? (() => {
          try {
            return JSON.parse(changes) as Record<string, unknown>;
          } catch {
            return null;
          }
        })()
      : typeof changes === "object" && !Array.isArray(changes)
        ? (changes as Record<string, unknown>)
        : null;
  const value = String(parsed?.triggerSource ?? "manual").trim().toLowerCase();
  if (value === "scheduled") return "Scheduled";
  return "Manual";
}

export function getReminderRunDetailText(item: ReminderRunHistoryItem) {
  return item.errorMessage || item.changesSummary || "-";
}

export function getReminderRunActionTarget(entityType: string) {
  switch (entityType) {
    case "quality_reminder_sweep":
      return { href: "/quality", label: "Open Quality" };
    case "client_portal_reminder_sweep":
      return { href: "/client-portal", label: "Open Portal" };
    case "levelIII_document_review_reminder_sweep":
      return { href: "/documents", label: "Open Documents" };
    case "levelIII_certificate_reminder_sweep":
      return { href: "/level-iii?tab=technicians", label: "Open Level III" };
    case "planner_timesheet_reminder_sweep":
      return { href: "/planner?timesheetWorkspace=review", label: "Open Planner" };
    default:
      return null;
  }
}

export function getBackupPreviewHealthStatus(status: BackupPreviewStatus): HealthStatus {
  if (status === "ready") return "healthy";
  if (status === "warning") return "attention";
  return "error";
}

export function getBackupPreviewLabel(status: BackupPreviewStatus) {
  switch (status) {
    case "ready":
      return "Valid Preview";
    case "warning":
      return "Review Needed";
    case "error":
    default:
      return "Invalid Backup";
  }
}

export function getTransferPackPreviewLabel(status: BackupPreviewStatus) {
  switch (status) {
    case "ready":
      return "Valid Pack";
    case "warning":
      return "Review Needed";
    case "error":
    default:
      return "Invalid Pack";
  }
}

export function getSaveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "Failed to fetch") {
    return "Could not reach the app server. Please restart the dev server, refresh the page, and try again.";
  }

  return error instanceof Error ? error.message : fallback;
}

export function getBackupRestorePlanHealthStatus(status: BackupRestorePlanStatus): HealthStatus {
  if (status === "ready") return "healthy";
  if (status === "review") return "attention";
  return "error";
}

export function getBackupRestorePlanLabel(status: BackupRestorePlanStatus) {
  switch (status) {
    case "ready":
      return "Ready to Apply";
    case "review":
      return "Review Before Apply";
    case "blocked":
    default:
      return "Blocked";
  }
}

export function getRestoreModeLabel(mode: RestoreMode) {
  return mode === "replaceSelected" ? "Replace selected tables" : "Merge with conflict checks";
}

export function getRestoreActivityLabel(entityType: string) {
  switch (entityType) {
    case "backupSnapshot":
      return "Backup JSON Export";
    case "transferReadinessPack":
      return "Transfer Readiness Pack";
    case "backupRestorePlan":
      return "Restore Plan";
    case "backupRestorePreflight":
      return "Preflight";
    case "backupRestoreScript":
      return "SQL Script Export";
    case "backupRestoreApply":
      return "Apply Restore";
    case "schemaRepairScript":
      return "Schema Repair SQL";
    case "schemaRepairApply":
      return "Apply Schema Repair";
    default:
      return entityType;
  }
}

export function getRestoreActivityStatus(item: BackupRestoreHistoryItem): BackupRestorePlanStatus {
  if (item.status === "Failed") return "blocked";
  if (item.activityStatus === "blocked") return "blocked";
  if (item.activityStatus === "review") return "review";
  if ((item.warningCount ?? 0) > 0) return "review";
  if ((item.schemaMissingTables ?? 0) > 0 || (item.schemaMissingColumns ?? 0) > 0) return "review";
  if ((item.schemaManualReviewItems ?? 0) > 0) return "review";
  return "ready";
}

export function getMaintenanceHistoryTableCount(item: BackupRestoreHistoryItem) {
  return (
    item.backupTableCount ??
    item.selectedTableCount ??
    item.schemaRepairableStatements ??
    item.schemaAttemptedStatements ??
    "-"
  );
}

export function getMaintenanceHistoryRowCount(item: BackupRestoreHistoryItem) {
  return (
    item.backupTotalRows ??
    item.insertedRows ??
    item.selectedRows ??
    item.attemptedRows ??
    item.schemaAppliedStatements ??
    "-"
  );
}

export function getMaintenanceHistoryScope(item: BackupRestoreHistoryItem) {
  if (item.mode) return item.mode;
  if (item.entityType === "backupSnapshot") return "Full backup";
  if (item.entityType === "transferReadinessPack") return "Transfer pack";
  if (item.entityType === "schemaRepairScript") return "SQL export";
  if (item.entityType === "schemaRepairApply") return "Additive repair";
  return item.action;
}

export function getMaintenanceHistoryNotes(item: BackupRestoreHistoryItem) {
  if (item.errorMessage) return item.errorMessage;

  if (item.entityType === "backupSnapshot") {
    return `${item.backupTableCount ?? 0} tables, ${item.backupTotalRows ?? 0} rows exported.`;
  }

  if (item.entityType === "transferReadinessPack") {
    return `${item.backupTableCount ?? 0} tables, ${item.backupTotalRows ?? 0} rows, ${item.schemaRepairableStatements ?? 0} schema repair statement(s).`;
  }

  if (item.entityType === "schemaRepairScript") {
    return `${item.schemaRepairableStatements ?? 0} repair statement(s), ${item.schemaManualReviewItems ?? 0} manual review item(s).`;
  }

  if (item.entityType === "schemaRepairApply") {
    return `${item.schemaAppliedStatements ?? 0} applied, ${item.schemaSkippedStatements ?? 0} skipped, ${item.schemaManualReviewItems ?? 0} manual review item(s).`;
  }

  return `${item.warningCount ?? 0} warning${
    (item.warningCount ?? 0) === 1 ? "" : "s"
  }, ${item.errorCount ?? 0} error${(item.errorCount ?? 0) === 1 ? "" : "s"}`;
}

export function buildRestoreHistoryExportRows(items: BackupRestoreHistoryItem[]) {
  return items.map((item) => ({
    id: item.id,
    date: new Date(item.createdAt).toLocaleString("en-ZA"),
    activity: getRestoreActivityLabel(item.entityType),
    status: item.status,
    mode: getMaintenanceHistoryScope(item),
    actor: item.actorName || item.actorEmail || `User ${item.userId}`,
    tables: getMaintenanceHistoryTableCount(item),
    rows: getMaintenanceHistoryRowCount(item),
    warnings: item.warningCount ?? 0,
    errors: item.errorCount ?? (item.status === "Failed" ? 1 : 0),
    message: getMaintenanceHistoryNotes(item),
  }));
}

export const healthExportColumns = [
  { key: "label", label: "Check" },
  { key: "status", label: "Status" },
  { key: "detail", label: "Detail" },
  { key: "count", label: "Rows" },
  { key: "duration", label: "Time" },
];

export const restoreHistoryExportColumns = [
  { key: "date", label: "Date" },
  { key: "activity", label: "Activity" },
  { key: "status", label: "Status" },
  { key: "mode", label: "Mode" },
  { key: "actor", label: "Actor" },
  { key: "tables", label: "Tables" },
  { key: "rows", label: "Rows" },
  { key: "warnings", label: "Warnings" },
  { key: "errors", label: "Errors" },
  { key: "message", label: "Message" },
];

export const auditTrailExportColumns = [
  { key: "date", label: "Date" },
  { key: "actor", label: "Actor" },
  { key: "actorEmail", label: "Actor Email" },
  { key: "action", label: "Action" },
  { key: "entity", label: "Entity" },
  { key: "entityId", label: "Record ID" },
  { key: "status", label: "Status" },
  { key: "changes", label: "Changes" },
  { key: "error", label: "Error" },
  { key: "ipAddress", label: "IP Address" },
];

export const schemaReadinessExportColumns = [
  { key: "label", label: "Table" },
  { key: "tableName", label: "Database Table" },
  { key: "status", label: "Status" },
  { key: "expectedColumns", label: "Expected Columns" },
  { key: "presentColumns", label: "Present Columns" },
  { key: "missingColumns", label: "Missing Columns" },
  { key: "extraColumns", label: "Extra Columns" },
];

export const operationalReadinessExportColumns = [
  { key: "severity", label: "Severity" },
  { key: "area", label: "Area" },
  { key: "title", label: "Issue" },
  { key: "detail", label: "Detail" },
  { key: "action", label: "Recommended Action" },
  { key: "recordType", label: "Record Type" },
  { key: "recordId", label: "Record ID" },
  { key: "branch", label: "Branch" },
  { key: "qualityAction", label: "Quality Action" },
  { key: "qualityActionStatus", label: "QA Status" },
  { key: "path", label: "Page" },
];

export function buildSchemaReadinessExportRows(schemaReadiness: SchemaReadiness) {
  return schemaReadiness.tables.map((table) => ({
    id: table.key,
    label: table.label,
    tableName: table.tableName,
    status: getHealthLabel(table.status),
    expectedColumns: table.expectedColumnCount,
    presentColumns: table.presentColumnCount,
    missingColumns:
      table.missingColumns.length === 0
        ? "-"
        : table.missingColumns.map((column) => column.name).join(", "),
    extraColumns: table.extraColumns.length === 0 ? "-" : table.extraColumns.join(", "),
  }));
}

export function buildOperationalReadinessExportRows(issues: OperationalReadinessIssue[]) {
  return issues.map((issue) => ({
    id: issue.id,
    severity: getReadinessSeverityLabel(issue.severity),
    area: issue.area,
    title: issue.title,
    detail: issue.detail,
    action: issue.action,
    recordType: issue.recordType,
    recordId: issue.recordId ?? "",
    branch: issue.branchName ?? "",
    qualityAction: issue.qualityAction?.referenceNumber ?? "",
    qualityActionStatus: issue.qualityAction?.status ?? "",
    path: issue.path,
  }));
}

export function buildOperationalReadinessSupportSummary(snapshot: OperationalReadinessSnapshot) {
  const lines = [
    "TextPoint Operational Readiness Report",
    `Checked: ${new Date(snapshot.generatedAt).toLocaleString("en-ZA")}`,
    `Scope: ${snapshot.scope.branchName}`,
    `Overall: ${getHealthLabel(snapshot.status)} | Ready score: ${snapshot.summary.readyScore}%`,
    `Issues: ${snapshot.summary.critical} critical, ${snapshot.summary.warning} warning, ${snapshot.summary.info} info, ${snapshot.summary.totalIssues} total`,
    `Tracked by Quality Actions: ${snapshot.summary.trackedQualityActions}; untracked: ${snapshot.summary.untrackedIssues}`,
    "",
    snapshot.issues.length === 0 ? "No operational readiness issues were found." : "Top Issues:",
    ...snapshot.issues
      .slice(0, 20)
      .map(
        (issue) =>
          `- ${getReadinessSeverityLabel(issue.severity)} | ${issue.area} | ${issue.title}: ${issue.detail} Action: ${issue.action}`
      ),
  ];

  return lines.join("\n");
}

export function buildAccessRolloutSupportSummary(
  rolloutRows: AccessAuditRolloutRow[],
  remediationRows: AccessAuditRemediationRow[]
) {
  const ready = rolloutRows.filter((row) => row.status === "ready").length;
  const review = rolloutRows.filter((row) => row.status === "review").length;
  const blocked = rolloutRows.filter((row) => row.status === "blocked").length;
  const critical = remediationRows.filter((row) => row.priority >= 5).length;
  const high = remediationRows.filter((row) => row.priority === 4).length;

  const lines = [
    "TextPoint Access Rollout Pack",
    `Generated: ${new Date().toLocaleString("en-ZA")}`,
    `Client portals: ${rolloutRows.length}`,
    `Status: ${ready} ready, ${review} in review, ${blocked} blocked`,
    `Remediation queue: ${critical} critical, ${high} high, ${remediationRows.length} total`,
    "",
    blocked === 0 && review === 0 ? "All client portals are currently rollout-ready." : "Priority rollout items:",
    ...rolloutRows
      .filter((row) => row.status !== "ready")
      .slice(0, 10)
      .map(
        (row) =>
          `- ${row.companyName} | ${row.status.toUpperCase()} | ${row.primaryIssue} Action: ${row.nextAction}`
      ),
    "",
    remediationRows.length === 0 ? "No open access remediation items." : "Top remediation queue items:",
    ...remediationRows
      .slice(0, 10)
      .map(
        (row) =>
          `- ${row.scopeLabel} | ${row.subjectLabel} | P${row.priority} | ${row.issue} Action: ${row.recommendation}`
      ),
  ];

  return lines.join("\n");
}

export function buildAccessGoLiveVerdict(
  gate: AccessGoLiveGate,
  rolloutRows: AccessAuditRolloutRow[],
  remediationRows: AccessAuditRemediationRow[]
) {
  const lines = [
    "Access Go-Live Verdict",
    `Generated: ${new Date().toLocaleString()}`,
    `State: ${gate.label}`,
    `Detail: ${gate.detail}`,
    `Blocked clients: ${gate.blockedCount}`,
    `Review clients: ${gate.reviewCount}`,
    `Critical remediation items: ${gate.criticalCount}`,
    `High remediation items: ${gate.highCount}`,
  ];

  if (gate.primaryRow) {
    lines.push(
      `Primary client: ${gate.primaryRow.companyName} (${gate.primaryRow.status.toUpperCase()})`,
      `Primary issue: ${gate.primaryRow.primaryIssue}`,
      `Next action: ${gate.primaryRow.nextAction}`
    );
  }

  if (gate.blockerList.length > 0) {
    lines.push("", "Top blockers:");
    gate.blockerList.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  }

  lines.push("", buildAccessRolloutSupportSummary(rolloutRows, remediationRows));
  return lines.join("\n");
}

export function buildAccessLaunchSignOffSummary(
  gate: AccessGoLiveGate,
  signOff: AccessLaunchSignOffState,
  signOffReady: boolean
) {
  const lines = [
    "Access Launch Sign-Off",
    `Generated: ${new Date().toLocaleString()}`,
    `Verdict: ${signOffReady ? "READY FOR CLIENT PORTAL LAUNCH" : "LAUNCH BLOCKED"}`,
    `Go-live gate: ${gate.label}`,
    `Detail: ${gate.detail}`,
    "",
    `Access audit reviewed: ${signOff.auditReviewed ? "Signed off" : "Open"}`,
    `Blocked clients cleared: ${signOff.blockedClientsCleared ? "Signed off" : "Open"}`,
    `Review clients checked: ${signOff.reviewClientsChecked ? "Signed off" : "Open"}`,
    `Branch coverage verified: ${signOff.branchCoverageVerified ? "Signed off" : "Open"}`,
    `Onboarding backlog accepted: ${signOff.onboardingBacklogAccepted ? "Signed off" : "Open"}`,
  ];

  if (gate.blockerList.length > 0) {
    lines.push("", "Current blockers:");
    gate.blockerList.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
  }

  return lines.join("\n");
}

export function buildProductionLaunchSignOffSummary(
  gate: {
    label: string;
    detail: string;
    blockedCount: number;
    reviewCount: number;
  },
  issues: ProductionReadinessIssue[],
  signOff: ProductionLaunchSignOffState,
  signOffReady: boolean
) {
  const lines = [
    "Production Launch Sign-Off",
    `Generated: ${new Date().toLocaleString()}`,
    `Verdict: ${signOffReady ? "READY FOR PILOT ROLLOUT" : "ROLLOUT NOT SIGNED OFF"}`,
    `Rollout gate: ${gate.label}`,
    `Detail: ${gate.detail}`,
    `Blocked issues: ${gate.blockedCount}`,
    `Review issues: ${gate.reviewCount}`,
    "",
    `Health reviewed: ${signOff.healthReviewed ? "Signed off" : "Open"}`,
    `Backup / restore reviewed: ${signOff.backupRestoreReviewed ? "Signed off" : "Open"}`,
    `Pilot scope confirmed: ${signOff.pilotScopeConfirmed ? "Signed off" : "Open"}`,
    `Access rollout confirmed: ${signOff.accessRolloutConfirmed ? "Signed off" : "Open"}`,
    `Release config confirmed: ${signOff.releaseConfigConfirmed ? "Signed off" : "Open"}`,
  ];

  if (issues.length > 0) {
    lines.push("", "Open rollout issues:");
    issues.forEach((issue, index) =>
      lines.push(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.area}: ${issue.detail} Next: ${issue.nextAction}`)
    );
  }

  return lines.join("\n");
}

export function buildAuditTrailExportRows(items: AuditTrailItem[]) {
  return items.map((item) => ({
    id: item.id,
    date: new Date(item.createdAt).toLocaleString("en-ZA"),
    actor: item.actorName || item.actorEmail || `User ${item.userId}`,
    actorEmail: item.actorEmail ?? "",
    action: item.action,
    entity: item.entityType,
    entityId: item.entityId,
    status: item.status,
    changes: item.changesSummary,
    error: item.errorMessage ?? "",
    ipAddress: item.ipAddress ?? "",
  }));
}

export function buildHealthExportRows(diagnostics: SystemDiagnostics) {
  return diagnostics.checks.map((check) => ({
    id: check.key,
    label: check.label,
    status: getHealthLabel(check.status),
    detail: check.detail,
    count: check.count ?? "-",
    duration:
      check.durationMs === null || check.durationMs === undefined
        ? "-"
        : `${check.durationMs} ms`,
  }));
}

export function buildHealthSupportSummary(diagnostics: SystemDiagnostics) {
  const attentionChecks = diagnostics.checks.filter((check) => check.status !== "healthy");
  const lines = [
    "TextPoint System Health Report",
    `Checked: ${new Date(diagnostics.checkedAt).toLocaleString("en-ZA")}`,
    `Overall: ${getHealthLabel(diagnostics.status)}`,
    `Checks: ${diagnostics.summary.healthy} healthy, ${diagnostics.summary.attention} attention, ${diagnostics.summary.error} error, ${diagnostics.summary.total} total`,
    `Database: ${diagnostics.database.ok ? "Connected" : "Offline"}${
      diagnostics.database.latencyMs !== null ? ` (${diagnostics.database.latencyMs} ms)` : ""
    }${diagnostics.database.version ? ` | MySQL ${diagnostics.database.version}` : ""}`,
    `Mode: ${diagnostics.environment.nodeEnv}`,
    `App URL: ${diagnostics.environment.appBaseUrl}`,
    `Database Host: ${diagnostics.environment.databaseHost}`,
    `Local Auth Bypass: ${diagnostics.environment.localAuthBypass ? "Enabled" : "Disabled"}`,
    `External Owner Notifications: ${
      diagnostics.environment.ownerNotificationConfigured ? "Configured" : "Not configured"
    }`,
    diagnostics.schemaReadiness
      ? `Schema: ${getHealthLabel(diagnostics.schemaReadiness.status)} | ${diagnostics.schemaReadiness.summary.missingTables} missing table(s), ${diagnostics.schemaReadiness.summary.missingColumns} missing column(s), ${diagnostics.schemaReadiness.summary.extraColumns} extra legacy column(s)`
      : "Schema: Not available",
    "",
    attentionChecks.length === 0 ? "No attention/error checks." : "Attention/Error Checks:",
    ...attentionChecks.map(
      (check) => `- ${check.label}: ${getHealthLabel(check.status)} - ${check.detail}`
    ),
  ];

  return lines.join("\n");
}

export function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildBackupPreview(input: unknown, fileName: string): BackupPreview {
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return {
      fileName,
      status: "error",
      format: null,
      version: null,
      generatedAt: null,
      generatedBy: null,
      credentialTablesIncluded: null,
      summary: {
        tableCount: 0,
        totalRows: 0,
        declaredTableCount: null,
        declaredTotalRows: null,
      },
      missingTables: EXPECTED_BACKUP_TABLE_KEYS,
      extraTables: [],
      warnings: ["The selected file is not a valid TextPoint backup object."],
      tables: [],
    };
  }

  const format = readOptionalString(input.format);
  const version = readOptionalNumber(input.version);
  const rawTables = Array.isArray(input.tables) ? input.tables : [];
  const safety = isRecord(input.safety) ? input.safety : null;
  const generatedByRecord = isRecord(input.generatedBy) ? input.generatedBy : null;
  const summaryRecord = isRecord(input.summary) ? input.summary : null;

  if (format !== "textpoint-backup") {
    warnings.push("The backup format marker is missing or not recognised.");
  }

  if (version !== 1) {
    warnings.push(
      version === null
        ? "The backup version is missing."
        : `This backup is version ${version}; this app currently expects version 1.`
    );
  }

  if (!Array.isArray(input.tables)) {
    warnings.push("The backup does not contain a valid tables list.");
  }

  const tables = rawTables
    .filter(isRecord)
    .map((table, index) => {
      const key = readOptionalString(table.key) ?? `unknown_${index + 1}`;
      const rows = Array.isArray(table.rows) ? table.rows : [];
      const declaredRowCount = readOptionalNumber(table.rowCount);
      const rowCount = declaredRowCount ?? rows.length;

      return {
        key,
        label: readOptionalString(table.label) ?? BACKUP_TABLE_LABELS[key] ?? key,
        rowCount,
        actualRows: rows.length,
        rowCountMismatch: declaredRowCount !== null && declaredRowCount !== rows.length,
      };
    });

  const tableKeys = new Set(tables.map((table) => table.key));
  const missingTables = EXPECTED_BACKUP_TABLE_KEYS.filter((key) => !tableKeys.has(key));
  const extraTables = tables
    .map((table) => table.key)
    .filter((key) => !EXPECTED_BACKUP_TABLE_KEYS.includes(key));
  const mismatchTables = tables.filter((table) => table.rowCountMismatch);

  if (rawTables.length !== tables.length) {
    warnings.push("Some table entries could not be read because they are not valid objects.");
  }

  if (missingTables.length > 0) {
    warnings.push(
      `${missingTables.length} expected table${missingTables.length === 1 ? " is" : "s are"} missing from the backup.`
    );
  }

  if (extraTables.length > 0) {
    warnings.push(
      `${extraTables.length} extra table${extraTables.length === 1 ? " is" : "s are"} present. These will need review before restore.`
    );
  }

  if (mismatchTables.length > 0) {
    warnings.push(
      `${mismatchTables.length} table${mismatchTables.length === 1 ? " has" : "s have"} row-count mismatches.`
    );
  }

  const credentialTablesIncluded =
    typeof safety?.credentialTablesIncluded === "boolean"
      ? safety.credentialTablesIncluded
      : null;

  if (credentialTablesIncluded) {
    warnings.push("This backup says it includes credential/session tables. Do not restore it without manual review.");
  }

  if (tables.length === 0) {
    warnings.push("No readable table data was found in the backup.");
  }

  const totalRows = tables.reduce((total, table) => total + table.actualRows, 0);
  const declaredTableCount = readOptionalNumber(summaryRecord?.tableCount);
  const declaredTotalRows = readOptionalNumber(summaryRecord?.totalRows);

  if (declaredTableCount !== null && declaredTableCount !== tables.length) {
    warnings.push("The declared table count does not match the readable table count.");
  }

  if (declaredTotalRows !== null && declaredTotalRows !== totalRows) {
    warnings.push("The declared total row count does not match the readable row count.");
  }

  const invalidBackup = format !== "textpoint-backup" || tables.length === 0;

  return {
    fileName,
    status: invalidBackup ? "error" : warnings.length > 0 ? "warning" : "ready",
    format,
    version,
    generatedAt: readOptionalString(input.generatedAt),
    generatedBy: generatedByRecord
      ? [
          readOptionalString(generatedByRecord.name),
          readOptionalString(generatedByRecord.email),
        ]
          .filter(Boolean)
          .join(" / ") || null
      : null,
    credentialTablesIncluded,
    summary: {
      tableCount: tables.length,
      totalRows,
      declaredTableCount,
      declaredTotalRows,
    },
    missingTables,
    extraTables,
    warnings,
    tables: tables.sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export function buildTransferPackPreview(input: unknown, fileName: string): TransferPackPreview {
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return {
      fileName,
      status: "error",
      format: null,
      version: null,
      generatedAt: null,
      generatedBy: null,
      warnings: ["The selected file is not a valid TextPoint transfer pack object."],
      summary: {
        backupTableCount: null,
        backupTotalRows: null,
        unreadableTableCount: null,
        schemaStatus: null,
        missingTables: null,
        missingColumns: null,
        repairableStatements: null,
        manualReviewItems: null,
        maintenanceHistoryCount: null,
      },
      readme: null,
      schemaRepairSql: null,
      schemaReadiness: null,
      backupSnapshot: null,
      backupPreview: null,
      maintenanceHistoryCount: 0,
    };
  }

  const format = readOptionalString(input.format);
  const version = readOptionalNumber(input.version);
  const generatedByRecord = isRecord(input.generatedBy) ? input.generatedBy : null;
  const safetyRecord = isRecord(input.safety) ? input.safety : null;
  const summaryRecord = isRecord(input.summary) ? input.summary : null;
  const schemaReadiness =
    isRecord(input.schemaReadiness) && typeof input.schemaReadiness.status === "string"
      ? (input.schemaReadiness as unknown as SchemaReadiness)
      : null;
  const backupSnapshot = isRecord(input.backupSnapshot) ? input.backupSnapshot : null;
  const backupPreview = backupSnapshot
    ? buildBackupPreview(backupSnapshot, `${fileName} embedded backup`)
    : null;
  const readme = readOptionalString(input.readme);
  const schemaRepairSql = readOptionalString(input.schemaRepairSql);
  const maintenanceHistoryCount = Array.isArray(input.maintenanceHistory)
    ? input.maintenanceHistory.length
    : 0;

  if (format !== "textpoint-transfer-readiness-pack") {
    warnings.push("The transfer pack format marker is missing or not recognised.");
  }

  if (version !== 1) {
    warnings.push(
      version === null
        ? "The transfer pack version is missing."
        : `This transfer pack is version ${version}; this app currently expects version 1.`
    );
  }

  if (!backupSnapshot) {
    warnings.push("No embedded backup snapshot was found in this transfer pack.");
  } else if (backupPreview?.status === "error") {
    warnings.push("The embedded backup snapshot could not be validated.");
  } else if (backupPreview?.status === "warning") {
    warnings.push("The embedded backup snapshot has review items.");
  }

  if (!schemaReadiness) {
    warnings.push("No schema readiness report was found in this transfer pack.");
  }

  if (!schemaRepairSql) {
    warnings.push("No embedded schema repair SQL was found in this transfer pack.");
  }

  if (!readme) {
    warnings.push("No transfer readme/guidance text was found in this transfer pack.");
  }

  if (safetyRecord?.credentialTablesIncluded === true) {
    warnings.push("This transfer pack says credential/session tables are included. Do not restore it without manual review.");
  }

  const invalidPack = format !== "textpoint-transfer-readiness-pack";

  return {
    fileName,
    status: invalidPack ? "error" : warnings.length > 0 ? "warning" : "ready",
    format,
    version,
    generatedAt: readOptionalString(input.generatedAt),
    generatedBy: generatedByRecord
      ? [
          readOptionalString(generatedByRecord.name),
          readOptionalString(generatedByRecord.email),
        ]
          .filter(Boolean)
          .join(" / ") || null
      : null,
    warnings,
    summary: {
      backupTableCount: readOptionalNumber(summaryRecord?.backupTableCount),
      backupTotalRows: readOptionalNumber(summaryRecord?.backupTotalRows),
      unreadableTableCount: readOptionalNumber(summaryRecord?.unreadableTableCount),
      schemaStatus: readOptionalString(summaryRecord?.schemaStatus),
      missingTables: readOptionalNumber(summaryRecord?.missingTables),
      missingColumns: readOptionalNumber(summaryRecord?.missingColumns),
      repairableStatements: readOptionalNumber(summaryRecord?.repairableStatements),
      manualReviewItems: readOptionalNumber(summaryRecord?.manualReviewItems),
      maintenanceHistoryCount: readOptionalNumber(summaryRecord?.maintenanceHistoryCount),
    },
    readme,
    schemaRepairSql,
    schemaReadiness,
    backupSnapshot,
    backupPreview,
    maintenanceHistoryCount,
  };
}
