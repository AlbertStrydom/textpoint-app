export type AppUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: "user" | "admin" | "super_admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
};

export type AccessAuditClientAssignment = {
  clientId: number;
  companyName: string;
  accessLevel: string;
  receiveReminders: boolean | null;
  branchIds: number[];
  totalClientBranches: number;
  scopedBranchCount: number;
  fullBranchAccess: boolean;
  assignmentCreatedAt: Date | string;
  assignmentUpdatedAt: Date | string;
};

export type AccessAuditRow = {
  id: string;
  userId: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "super_admin";
  loginEnabled: boolean;
  mustChangePassword: boolean;
  lastSignedIn: Date | string | null;
  createdAt: Date | string;
  portalAssignmentCount: number;
  portalManagerCount: number;
  portalViewerCount: number;
  restrictedClientCount: number;
  fullyScopedClientCount: number;
  clientAssignments: AccessAuditClientAssignment[];
  portalStatusLabel: string;
  scopeSummary: string;
  internalAccessLabel: string;
  accessFlags: string[];
};

export type AccessAuditQueueRow = {
  id: string;
  userId: number;
  name: string | null;
  email: string | null;
  issue: string;
  recommendation: string;
  priority: number;
  loginEnabled: boolean;
  mustChangePassword: boolean;
  role: "user" | "admin" | "super_admin";
};

export type AccessAuditClientMatrixRow = {
  id: string;
  clientId: number;
  companyName: string;
  allocatedUserCount: number;
  managerCount: number;
  viewerCount: number;
  restrictedUserCount: number;
  fullScopeUserCount: number;
  suspendedUserCount: number;
  passwordPendingUserCount: number;
  neverSignedInUserCount: number;
  flaggedUserCount: number;
  recommendation: string;
};

export type AccessAuditClientGapRow = {
  id: string;
  clientId: number;
  companyName: string;
  issue: string;
  recommendation: string;
  severity: number;
};

export type AccessAuditBranchScopeRow = {
  id: string;
  userId: number;
  clientId: number;
  name: string | null;
  email: string | null;
  role: "user" | "admin" | "super_admin";
  companyName: string;
  accessLevel: string;
  receiveReminders: boolean | null;
  loginEnabled: boolean;
  mustChangePassword: boolean;
  fullBranchAccess: boolean;
  scopedBranchCount: number;
  totalClientBranches: number;
  scopeLabel: string;
  recommendation: string;
};

export type AccessAuditBranchScopeQueueRow = {
  id: string;
  userId: number;
  clientId: number;
  name: string | null;
  email: string | null;
  companyName: string;
  issue: string;
  recommendation: string;
  priority: number;
};

export type AccessAuditBranchCoverageRow = {
  id: string;
  clientId: number;
  companyName: string;
  totalBranches: number;
  activeBranches: number;
  activeAssignedUsers: number;
  activeManagerCount: number;
  activeFullScopeCount: number;
  activeRestrictedCount: number;
  uncoveredBranchCount: number;
  uncoveredBranchNames: string[];
  coverageStatus: string;
  recommendation: string;
};

export type AccessAuditBranchCoverageQueueRow = {
  id: string;
  clientId: number;
  companyName: string;
  issue: string;
  recommendation: string;
  priority: number;
};

export type AccessAuditRemediationRow = {
  id: string;
  kind: "user" | "client" | "branch_scope" | "branch_coverage";
  priority: number;
  scopeLabel: string;
  subjectLabel: string;
  issue: string;
  recommendation: string;
  userId: number | null;
  clientId: number | null;
};

export type AccessAuditRolloutRow = {
  id: string;
  clientId: number;
  companyName: string;
  status: "ready" | "review" | "blocked";
  blockerCount: number;
  warningCount: number;
  allocatedUserCount: number;
  activeManagerCount: number;
  uncoveredBranchCount: number;
  primaryIssue: string;
  nextAction: string;
};

export type AccessGoLiveGate = {
  status: "ready" | "review" | "blocked" | "empty";
  label: string;
  detail: string;
  blockedCount: number;
  reviewCount: number;
  criticalCount: number;
  highCount: number;
  primaryRow: AccessAuditRolloutRow | null;
  blockedRow: AccessAuditRolloutRow | null;
  reviewRow: AccessAuditRolloutRow | null;
  blockerList: string[];
};

export type AccessLaunchSignOffState = {
  auditReviewed: boolean;
  blockedClientsCleared: boolean;
  reviewClientsChecked: boolean;
  branchCoverageVerified: boolean;
  onboardingBacklogAccepted: boolean;
};

export type ProductionLaunchSignOffState = {
  healthReviewed: boolean;
  backupRestoreReviewed: boolean;
  pilotScopeConfirmed: boolean;
  accessRolloutConfirmed: boolean;
  releaseConfigConfirmed: boolean;
};

export type ProductionRolloutQueueRow = {
  id: string;
  status: "blocked" | "review";
  area: "system" | "operations" | "access" | "release" | "signoff";
  subject: string;
  detail: string;
  nextAction: string;
  source: "gate" | "signoff";
  priority: number;
};

export type ProductionRolloutPhaseRow = {
  id: string;
  title: string;
  status: "ready" | "current" | "open";
  openCount: number;
  detail: string;
  nextAction: string;
  targetTab: "health" | "access";
};

export type ProductionChecklistRow = {
  id: string;
  label: string;
  status: "blocked" | "review" | "ready" | "signed_off";
  detail: string;
  evidence: string;
  nextAction: string;
  targetTab: "health" | "access";
  target: "rollout-gate" | "operational-readiness" | "diagnostics" | "launch-signoff" | "access-signoff";
};

export type AccessLaunchQueueRow = {
  id: string;
  clientId: number | null;
  queueType: "client" | "launch_signoff";
  status: "blocked" | "review" | "ready";
  subject: string;
  detail: string;
  nextAction: string;
  owner: "admin";
  source: string;
  priority: number;
};

export type AccessLaunchPhaseRow = {
  id: string;
  phase: string;
  status: "ready" | "current" | "open";
  openCount: number;
  detail: string;
  nextAction: string;
  targetFilter: "blocked" | "review" | "signoff" | "all";
};

export type AccessLaunchPhaseTaskRow = {
  id: string;
  phaseId: string;
  subject: string;
  detail: string;
  nextAction: string;
  status: "blocked" | "review";
  targetFilter: "blocked" | "review" | "signoff" | "all";
  clientId: number | null;
};

export type Branch = {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  companyName?: string | null;
  companyDescription?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RoleSummary = {
  id: number;
  key: "user" | "admin" | "super_admin";
  name: string;
  description: string;
  type: "system";
  userCount: number;
};

export type ModulePermission = {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type SpecimenType = {
  id: number;
  name: string;
  material: string | null;
  size: string | null;
  weight: string | null;
  description: string | null;
};

export type Method = {
  id: number;
  name: string;
  color: string | null;
  description: string | null;
};

export type AuditTrailItem = {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  changes: unknown;
  changesSummary: string;
  ipAddress: string | null;
  userAgent: string | null;
  status: "Success" | "Failed";
  errorMessage: string | null;
  createdAt: Date | string;
  actorName: string | null;
  actorEmail: string | null;
};

export type AuditTrailResponse = {
  items: AuditTrailItem[];
  summary: {
    total: number;
    success: number;
    failed: number;
    actions: string[];
    entityTypes: string[];
    actors: Array<{
      userId: number;
      name: string | null;
      email: string | null;
    }>;
  };
};

export type HealthStatus = "healthy" | "attention" | "error";

export type SystemDiagnosticCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  durationMs?: number | null;
  count?: number | null;
};

export type SchemaColumnReadiness = {
  name: string;
  sqlType: string;
  notNull: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isAutoincrement: boolean;
  exists: boolean;
};

export type SchemaTableReadiness = {
  key: string;
  label: string;
  tableName: string;
  status: HealthStatus;
  exists: boolean;
  expectedColumnCount: number;
  presentColumnCount: number;
  missingColumns: SchemaColumnReadiness[];
  extraColumns: string[];
};

export type SchemaReadiness = {
  checkedAt: string;
  status: HealthStatus;
  summary: {
    expectedTables: number;
    readyTables: number;
    missingTables: number;
    attentionTables: number;
    expectedColumns: number;
    missingColumns: number;
    extraColumns: number;
    repairableStatements: number;
    manualReviewItems: number;
  };
  tables: SchemaTableReadiness[];
  repairScriptAvailable: boolean;
  manualReviewItems: string[];
};

export type SchemaRepairApplyResult = {
  appliedAt: string;
  requiredConfirmation: string;
  safetySnapshot: unknown | null;
  summary: {
    attemptedStatements: number;
    appliedStatements: number;
    skippedStatements: number;
    manualReviewItems: number;
  };
  applied: Array<{
    kind: "createTable" | "addColumn";
    tableName: string;
    label: string;
  }>;
  skipped: Array<{
    kind: "createTable" | "addColumn";
    tableName: string;
    label: string;
    reason: string;
  }>;
  manualReviewItems: string[];
  schemaReadiness: SchemaReadiness;
};

export type TransferReadinessPack = {
  format: string;
  version: number;
  generatedAt: string;
  summary: {
    backupTableCount: number;
    backupTotalRows: number;
    unreadableTableCount: number;
    schemaStatus: HealthStatus;
    missingTables: number;
    missingColumns: number;
    repairableStatements: number;
    manualReviewItems: number;
    maintenanceHistoryCount: number;
  };
};

export type TransferPackPreview = {
  fileName: string;
  status: BackupPreviewStatus;
  format: string | null;
  version: number | null;
  generatedAt: string | null;
  generatedBy: string | null;
  warnings: string[];
  summary: {
    backupTableCount: number | null;
    backupTotalRows: number | null;
    unreadableTableCount: number | null;
    schemaStatus: string | null;
    missingTables: number | null;
    missingColumns: number | null;
    repairableStatements: number | null;
    manualReviewItems: number | null;
    maintenanceHistoryCount: number | null;
  };
  readme: string | null;
  schemaRepairSql: string | null;
  schemaReadiness: SchemaReadiness | null;
  backupSnapshot: unknown | null;
  backupPreview: BackupPreview | null;
  maintenanceHistoryCount: number;
};

export type SystemDiagnostics = {
  checkedAt: string;
  status: HealthStatus;
  summary: {
    total: number;
    healthy: number;
    attention: number;
    error: number;
  };
  database: {
    ok: boolean;
    latencyMs: number | null;
    version: string | null;
  };
  environment: {
    nodeEnv: string;
    appBaseUrl: string;
    databaseHost: string;
    localAuthBypass: boolean;
    localAuthEmail: string;
    ownerNotificationConfigured: boolean;
    smtpConfigured: boolean;
    bootstrapAdminPasswordConfigured: boolean;
    reminderSchedulerEnabled: boolean;
    reminderSchedulerIntervalMinutes: number;
    storageProvider: "local" | "s3";
    storageDurable: boolean;
    storageProductionOverride: boolean;
  };
  schemaReadiness: SchemaReadiness | null;
  checks: SystemDiagnosticCheck[];
};

export type OperationalReadinessSeverity = "critical" | "warning" | "info";

export type OperationalReadinessIssue = {
  id: string;
  fingerprint: string;
  area: string;
  severity: OperationalReadinessSeverity;
  title: string;
  detail: string;
  action: string;
  recordType: string;
  recordId: string | number | null;
  branchId: number | null;
  branchName: string | null;
  path: string;
  qualityAction: {
    id: number;
    referenceNumber: string;
    status: string;
    dueDate: string | Date | null;
    ownerName: string | null;
  } | null;
};

export type OperationalReadinessSnapshot = {
  generatedAt: string;
  status: HealthStatus;
  scope: {
    branchId: number | null;
    branchName: string;
  };
  summary: {
    totalIssues: number;
    critical: number;
    warning: number;
    info: number;
    readyScore: number;
    affectedAreas: number;
    trackedQualityActions: number;
    untrackedIssues: number;
  };
  areas: Array<{
    key: string;
    label: string;
    status: HealthStatus;
    total: number;
    critical: number;
    warning: number;
    info: number;
  }>;
  issues: OperationalReadinessIssue[];
};

export type LevelIIICertificateReminderRecord = {
  id: number;
  certificateNumber: string;
  validUntil: string | Date | null;
  status: string;
  approvalStatus: "draft" | "in_review" | "approved" | "rejected";
  approvalRequestedAt?: string | Date | null;
};

export type LevelIIICertificateQueueHealth = {
  active: number;
  inReview: number;
  reviewWaiting: number;
  expiringSoon: number;
  overdue: number;
  blockedDrafts: number;
};

export type LevelIIICertificateQueueFilterLink =
  | "active"
  | "in_review"
  | "expiring_soon"
  | "draft";

export type ReminderRunHistoryItem = AuditTrailItem;
export type ProductionReadinessIssue = {
  id: string;
  area: "system" | "operations" | "access" | "release";
  severity: "blocked" | "review";
  detail: string;
  nextAction: string;
};

export type BackupPreviewStatus = "ready" | "warning" | "error";

export type BackupPreviewTable = {
  key: string;
  label: string;
  rowCount: number;
  actualRows: number;
  rowCountMismatch: boolean;
};

export type BackupPreview = {
  fileName: string;
  status: BackupPreviewStatus;
  format: string | null;
  version: number | null;
  generatedAt: string | null;
  generatedBy: string | null;
  credentialTablesIncluded: boolean | null;
  summary: {
    tableCount: number;
    totalRows: number;
    declaredTableCount: number | null;
    declaredTotalRows: number | null;
  };
  missingTables: string[];
  extraTables: string[];
  warnings: string[];
  tables: BackupPreviewTable[];
};

export type RestoreMode = "merge" | "replaceSelected";

export type BackupRestorePlanStatus = "ready" | "review" | "blocked";

export type BackupRestorePlan = {
  plannedAt: string;
  status: BackupRestorePlanStatus;
  mode: RestoreMode;
  requiredConfirmation: string;
  backup: {
    format: string | null;
    version: number | null;
    generatedAt: string | null;
    generatedBy: {
      id: number | null;
      name: string | null;
      email: string | null;
      role: string | null;
    } | null;
    credentialTablesIncluded: boolean | null;
  };
  summary: {
    selectedTableCount: number;
    selectedRows: number;
    affectedCurrentRows: number;
    warnings: number;
    errors: number;
  };
  errors: string[];
  warnings: string[];
  selectedTables: Array<{
    key: string;
    label: string;
    backupRows: number;
    declaredBackupRows: number;
    currentRows: number | null;
    rowCountMismatch: boolean;
    action: string;
  }>;
  ignoredTables: {
    missingExpectedTables: string[];
    extraBackupTables: string[];
  };
  steps: string[];
};

export type BackupRestorePreflight = {
  checkedAt: string;
  status: BackupRestorePlanStatus;
  mode: RestoreMode;
  summary: {
    selectedTableCount: number;
    selectedRows: number;
    currentRows: number;
    blockedTables: number;
    reviewTables: number;
    duplicatePrimaryKeyCount: number;
    warnings: number;
    errors: number;
  };
  errors: string[];
  warnings: string[];
  selectedTables: Array<{
    key: string;
    label: string;
    status: BackupRestorePlanStatus;
    backupRows: number;
    currentRows: number | null;
    backupColumnCount: number;
    destinationColumnCount: number;
    missingDestinationColumns: string[];
    duplicatePrimaryKeyCount: number;
    duplicatePrimaryKeySamples: Array<string | number>;
    notes: string[];
  }>;
  next: string[];
};

export type BackupRestoreApplyResult = {
  appliedAt: string;
  mode: RestoreMode;
  requiredConfirmation: string;
  safetySnapshot: unknown;
  summary: {
    selectedTableCount: number;
    attemptedRows: number;
    insertedRows: number;
    skippedRows: number;
    warnings: number;
  };
  warnings: string[];
  tables: Array<{
    key: string;
    label: string;
    attemptedRows: number;
    insertedRows: number;
    skippedRows: number;
    duplicatePrimaryKeyCount: number;
  }>;
};

export type BackupRestoreHistoryItem = {
  id: number;
  action: string;
  entityType: string;
  status: "Success" | "Failed";
  errorMessage: string | null;
  createdAt: Date | string;
  userId: number;
  actorName: string | null;
  actorEmail: string | null;
  mode: string | null;
  activityStatus: string | null;
  backupTableCount: number | null;
  backupTotalRows: number | null;
  schemaRepairableStatements: number | null;
  schemaAttemptedStatements: number | null;
  schemaAppliedStatements: number | null;
  schemaSkippedStatements: number | null;
  schemaMissingTables: number | null;
  schemaMissingColumns: number | null;
  schemaManualReviewItems: number | null;
  selectedTableCount: number | null;
  selectedRows: number | null;
  attemptedRows: number | null;
  insertedRows: number | null;
  skippedRows: number | null;
  duplicatePrimaryKeyCount: number | null;
  warningCount: number | null;
  errorCount: number | null;
  changes: Record<string, unknown> | null;
};
