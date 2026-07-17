import { TRPCError } from "@trpc/server";
import { desc, eq, getTableColumns, getTableName, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  attendance,
  assessments,
  auditLogs,
  branches,
  certificates,
  companies,
  contacts,
  courseSchedules,
  courses,
  documents,
  enrollments,
  equipment,
  equipmentDocuments,
  equipmentLoans,
  externalProviders,
  importLogs,
  kpiAnswers,
  kpiQuestions,
  kpiRecords,
  kpiTemplates,
  leadActivities,
  leads,
  levelIIIAssessments,
  levelIIIActivities,
  levelIIIClients,
  levelIIIEquipment,
  levelIIISpecimens,
  levelIIITechnicians,
  lecturers,
  managementReviews,
  methods,
  moduleAccess,
  notificationPreferences,
  notifications,
  notificationSubscriptions,
  plannerEntries,
  qualityActions,
  qualityAudits,
  reports,
  sharedPlannerEvents,
  specimenDocuments,
  specimenLoans,
  specimenTypes,
  specimens,
  students,
  trainingOfferings,
  users,
} from "../../drizzle/schema";
import { createQualityAction, getDb } from "../db";
import { ENV, evaluateEnvironmentReadiness } from "./env";
import { isEmailDeliveryConfigured } from "./email";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import { getStorageRuntimeSummary } from "../storage";
import { logAuditEvent } from "../audit";
import {
  buildOperationalReadinessSnapshot,
  getReadinessFingerprintMarker,
} from "../operationalReadiness";

type DiagnosticStatus = "healthy" | "attention" | "error";

type DiagnosticCheck = {
  key: string;
  label: string;
  status: DiagnosticStatus;
  detail: string;
  durationMs?: number;
  count?: number | null;
};

type BackupRestoreStatus = "ready" | "review" | "blocked";

type ParsedBackupTable = {
  key: string;
  label: string;
  rowCount: number;
  actualRows: number;
  rowCountMismatch: boolean;
  rows: unknown[];
};

type SchemaColumnReadiness = {
  name: string;
  sqlType: string;
  notNull: boolean;
  hasDefault: boolean;
  isPrimaryKey: boolean;
  isAutoincrement: boolean;
  exists: boolean;
};

type SchemaTableReadiness = {
  key: string;
  label: string;
  tableName: string;
  status: DiagnosticStatus;
  exists: boolean;
  expectedColumnCount: number;
  presentColumnCount: number;
  missingColumns: SchemaColumnReadiness[];
  extraColumns: string[];
};

type SchemaReadiness = {
  checkedAt: string;
  status: DiagnosticStatus;
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

type SchemaTableEntry = {
  key: string;
  label: string;
  table: any;
};

type SchemaRepairStatement = {
  kind: "createTable" | "addColumn";
  tableName: string;
  label: string;
  statement: string;
};

type SystemMaintenanceHistoryItem = {
  id: number;
  action: string;
  entityType: string;
  status: "Success" | "Failed";
  errorMessage: string | null;
  createdAt: Date;
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

const CORE_TABLE_CHECKS = [
  { key: "auth_users", label: "Authentication Users", table: authUsers },
  { key: "auth_accounts", label: "Authentication Accounts", table: authAccounts },
  { key: "auth_sessions", label: "Authentication Sessions", table: authSessions },
  { key: "users", label: "Application Users", table: users },
  { key: "module_access", label: "Page Access Permissions", table: moduleAccess },
  { key: "branches", label: "Branches", table: branches },
  { key: "students", label: "Students", table: students },
  { key: "leads", label: "Leads", table: leads },
  { key: "companies", label: "Companies", table: companies },
  { key: "contacts", label: "Contacts", table: contacts },
  { key: "courses", label: "Courses", table: courses },
  { key: "course_schedules", label: "Course Schedules", table: courseSchedules },
  { key: "enrollments", label: "Enrolments", table: enrollments },
  { key: "lecturers", label: "Lecturers", table: lecturers },
  { key: "methods", label: "Methods", table: methods },
  { key: "equipment", label: "Equipment", table: equipment },
  { key: "specimens", label: "Specimens", table: specimens },
  { key: "specimen_types", label: "Specimen Types", table: specimenTypes },
  { key: "documents", label: "Documents", table: documents },
  { key: "planner_entries", label: "Planner Entries", table: plannerEntries },
  { key: "kpi_records", label: "KPI Records", table: kpiRecords },
  { key: "quality_actions", label: "Quality Actions", table: qualityActions },
  { key: "reports", label: "Reports", table: reports },
  { key: "notifications", label: "Notifications", table: notifications },
] as const;

const BACKUP_TABLES = [
  { key: "users", label: "Application Users", table: users },
  { key: "moduleAccess", label: "Page Access Permissions", table: moduleAccess },
  { key: "branches", label: "Branches", table: branches },
  { key: "students", label: "Students", table: students },
  { key: "leads", label: "Leads", table: leads },
  { key: "companies", label: "Companies", table: companies },
  { key: "contacts", label: "Contacts", table: contacts },
  { key: "leadActivities", label: "Lead Activities", table: leadActivities },
  { key: "courses", label: "Courses", table: courses },
  { key: "courseSchedules", label: "Course Schedules", table: courseSchedules },
  { key: "enrollments", label: "Enrolments", table: enrollments },
  { key: "attendance", label: "Attendance", table: attendance },
  { key: "assessments", label: "Assessments", table: assessments },
  { key: "certificates", label: "Certificates", table: certificates },
  { key: "lecturers", label: "Lecturers", table: lecturers },
  { key: "methods", label: "Methods", table: methods },
  { key: "trainingOfferings", label: "Training Offerings", table: trainingOfferings },
  { key: "equipment", label: "Equipment", table: equipment },
  { key: "equipmentDocuments", label: "Equipment Documents", table: equipmentDocuments },
  { key: "equipmentLoans", label: "Equipment Loans", table: equipmentLoans },
  { key: "specimenTypes", label: "Specimen Types", table: specimenTypes },
  { key: "specimens", label: "Specimens", table: specimens },
  { key: "specimenDocuments", label: "Specimen Documents", table: specimenDocuments },
  { key: "specimenLoans", label: "Specimen Loans", table: specimenLoans },
  { key: "levelIIIClients", label: "Level III Clients", table: levelIIIClients },
  { key: "levelIIIActivities", label: "Level III Activities", table: levelIIIActivities },
  { key: "levelIIITechnicians", label: "Level III Technicians", table: levelIIITechnicians },
  { key: "levelIIIAssessments", label: "Level III Assessments", table: levelIIIAssessments },
  { key: "levelIIIEquipment", label: "Level III Equipment", table: levelIIIEquipment },
  { key: "levelIIISpecimens", label: "Level III Specimens", table: levelIIISpecimens },
  { key: "kpiTemplates", label: "KPI Templates", table: kpiTemplates },
  { key: "kpiQuestions", label: "KPI Questions", table: kpiQuestions },
  { key: "kpiRecords", label: "KPI Records", table: kpiRecords },
  { key: "kpiAnswers", label: "KPI Answers", table: kpiAnswers },
  { key: "documents", label: "Documents", table: documents },
  { key: "plannerEntries", label: "Planner Entries", table: plannerEntries },
  { key: "sharedPlannerEvents", label: "Shared Planner Events", table: sharedPlannerEvents },
  { key: "reports", label: "Reports", table: reports },
  { key: "qualityActions", label: "Quality Actions", table: qualityActions },
  { key: "qualityAudits", label: "Quality Audits", table: qualityAudits },
  { key: "managementReviews", label: "Management Reviews", table: managementReviews },
  { key: "externalProviders", label: "External Providers", table: externalProviders },
  { key: "importLogs", label: "Import Logs", table: importLogs },
  { key: "auditLogs", label: "Audit Logs", table: auditLogs },
  { key: "notifications", label: "Notifications", table: notifications },
  { key: "notificationPreferences", label: "Notification Preferences", table: notificationPreferences },
] as const;

const SCHEMA_TABLES: SchemaTableEntry[] = [
  { key: "authUsers", label: "Authentication Users", table: authUsers },
  { key: "authAccounts", label: "Authentication Accounts", table: authAccounts },
  { key: "authSessions", label: "Authentication Sessions", table: authSessions },
  { key: "authVerifications", label: "Authentication Verifications", table: authVerifications },
  ...BACKUP_TABLES,
  { key: "notificationSubscriptions", label: "Notification Subscriptions", table: notificationSubscriptions },
];

const BACKUP_TABLE_BY_KEY = new Map(BACKUP_TABLES.map((entry) => [entry.key, entry]));
const EXPECTED_BACKUP_TABLE_KEYS = BACKUP_TABLES.map((entry) => entry.key);
const SYSTEM_MAINTENANCE_AUDIT_ENTITY_TYPES = [
  "backupSnapshot",
  "transferReadinessPack",
  "backupRestorePlan",
  "backupRestorePreflight",
  "backupRestoreScript",
  "backupRestoreApply",
  "schemaRepairScript",
  "schemaRepairApply",
] as const;

const backupRestorePlanInput = z.object({
  backup: z.unknown(),
  selectedTables: z.array(z.string()).min(1, "Select at least one table to plan a restore."),
  mode: z.enum(["merge", "replaceSelected"]),
});

type BackupRestorePlanInput = z.infer<typeof backupRestorePlanInput>;

const RESTORE_CONFIRMATION_PHRASE = "RESTORE TextPoint BACKUP";
const SCHEMA_REPAIR_CONFIRMATION_PHRASE = "APPLY SCHEMA REPAIR";

const backupRestoreApplyInput = backupRestorePlanInput.extend({
  confirmation: z.string(),
});

const schemaRepairApplyInput = z.object({
  confirmation: z.string(),
});

const operationalReadinessIssueInput = z.object({
  fingerprint: z.string().min(1),
  area: z.string().min(1),
  severity: z.enum(["critical", "warning", "info"]),
  title: z.string().min(1),
  detail: z.string().min(1),
  action: z.string().min(1),
  recordType: z.string().min(1),
  recordId: z.union([z.string(), z.number()]).optional().nullable(),
  branchId: z.number().int().positive().optional().nullable(),
  branchName: z.string().optional().nullable(),
  path: z.string().optional().nullable(),
});

type BackupRestorePreflightTable = {
  key: string;
  label: string;
  status: BackupRestoreStatus;
  backupRows: number;
  currentRows: number | null;
  backupColumnCount: number;
  destinationColumnCount: number;
  missingDestinationColumns: string[];
  duplicatePrimaryKeyCount: number;
  duplicatePrimaryKeySamples: Array<string | number>;
  notes: string[];
};

function normaliseErrorMessage(error: unknown) {
  const cause = (error as any)?.cause ?? error;
  return String((cause as any)?.sqlMessage || (cause as any)?.message || "Unknown error");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAuditChanges(value: unknown) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? parsed : { value: parsed };
    } catch {
      return { value };
    }
  }

  return isRecord(value) ? value : { value };
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function mapReadinessAreaToQualitySource(
  area: string
):
  | "Customer Complaint"
  | "Internal Audit"
  | "Supplier"
  | "Training"
  | "Examination"
  | "Level III"
  | "Equipment"
  | "Document Control"
  | "Management Review"
  | "Other" {
  switch (area) {
    case "training":
    case "crm":
      return "Training";
    case "equipment":
    case "specimens":
      return "Equipment";
    case "level_iii":
      return "Level III";
    case "documents":
      return "Document Control";
    case "quality":
      return "Internal Audit";
    case "branches":
    case "access":
    case "system":
    default:
      return "Other";
  }
}

function mapReadinessSeverityToQualitySeverity(
  severity: "critical" | "warning" | "info"
): "Minor" | "Major" | "Critical" {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Major";
  return "Minor";
}

function mapReadinessSeverityToQualityCategory(
  severity: "critical" | "warning" | "info"
): "Nonconformance" | "Corrective Action" | "Observation" | "Improvement" {
  if (severity === "critical") return "Corrective Action";
  if (severity === "warning") return "Observation";
  return "Improvement";
}

function getReadinessDueDate(severity: "critical" | "warning" | "info") {
  if (severity === "critical") return addDays(new Date(), 7);
  if (severity === "warning") return addDays(new Date(), 14);
  return addDays(new Date(), 30);
}

function parseBackupTables(backup: unknown) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(backup)) {
    return {
      errors: ["The submitted backup is not a valid TextPoint backup object."],
      warnings,
      format: null,
      version: null,
      generatedAt: null,
      generatedBy: null,
      credentialTablesIncluded: null,
      missingTables: EXPECTED_BACKUP_TABLE_KEYS,
      extraTables: [] as string[],
      tables: [] as ParsedBackupTable[],
    };
  }

  const format = readOptionalString(backup.format);
  const version = readOptionalNumber(backup.version);
  const safety = isRecord(backup.safety) ? backup.safety : null;
  const generatedBy = isRecord(backup.generatedBy) ? backup.generatedBy : null;
  const rawTables = Array.isArray(backup.tables) ? backup.tables : [];

  if (format !== "textpoint-backup") {
    errors.push("The backup format marker is missing or not recognised.");
  }

  if (version !== 1) {
    errors.push(
      version === null
        ? "The backup version is missing."
        : `Backup version ${version} is not supported by this restore planner.`
    );
  }

  if (!Array.isArray(backup.tables)) {
    errors.push("The backup does not contain a valid tables list.");
  }

  const tables = rawTables
    .filter(isRecord)
    .map((table, index): ParsedBackupTable => {
      const key = readOptionalString(table.key) ?? `unknown_${index + 1}`;
      const rows = Array.isArray(table.rows) ? table.rows : [];
      const declaredRowCount = readOptionalNumber(table.rowCount);

      return {
        key,
        label:
          readOptionalString(table.label) ??
          BACKUP_TABLE_BY_KEY.get(key as (typeof BACKUP_TABLES)[number]["key"])?.label ??
          key,
        rowCount: declaredRowCount ?? rows.length,
        actualRows: rows.length,
        rowCountMismatch: declaredRowCount !== null && declaredRowCount !== rows.length,
        rows,
      };
    });

  if (rawTables.length !== tables.length) {
    warnings.push("Some table entries were ignored because they are not valid objects.");
  }

  const tableKeys = new Set(tables.map((table) => table.key));
  const missingTables = EXPECTED_BACKUP_TABLE_KEYS.filter((key) => !tableKeys.has(key));
  const extraTables = tables
    .map((table) => table.key)
    .filter((key) => !BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"]));

  const rowCountMismatches = tables.filter((table) => table.rowCountMismatch);
  if (rowCountMismatches.length > 0) {
    warnings.push(
      `${rowCountMismatches.length} backup table${
        rowCountMismatches.length === 1 ? " has" : "s have"
      } row-count mismatches.`
    );
  }

  const credentialTablesIncluded =
    typeof safety?.credentialTablesIncluded === "boolean"
      ? safety.credentialTablesIncluded
      : null;

  if (credentialTablesIncluded) {
    errors.push("The backup says it includes credential/session tables. Restore is blocked.");
  }

  return {
    errors,
    warnings,
    format,
    version,
    generatedAt: readOptionalString(backup.generatedAt),
    generatedBy: generatedBy
      ? {
          id: readOptionalNumber(generatedBy.id),
          name: readOptionalString(generatedBy.name),
          email: readOptionalString(generatedBy.email),
          role: readOptionalString(generatedBy.role),
        }
      : null,
    credentialTablesIncluded,
    missingTables,
    extraTables,
    tables,
  };
}

async function countRowsForBackupTable(key: (typeof BACKUP_TABLES)[number]["key"]) {
  const entry = BACKUP_TABLE_BY_KEY.get(key);
  if (!entry) return null;

  const db = getDb();
  const result = await db
    .select({ rowCount: sql<number>`count(*)` })
    .from(entry.table as any);
  const rowCount = Number(result[0]?.rowCount ?? 0);
  return Number.isFinite(rowCount) ? rowCount : null;
}

async function getDestinationColumns(tableName: string) {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT column_name AS columnName
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
    ORDER BY ordinal_position
  `);

  return getSqlRows(result)
    .map((row) => String(row.columnName ?? ""))
    .filter(Boolean);
}

function getBackupPrimaryKeyValues(rows: unknown[]) {
  const values: Array<string | number> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const value = row.id;
    if (typeof value !== "number" && typeof value !== "string") continue;
    if (typeof value === "string" && !value.trim()) continue;

    const key = `${typeof value}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(value);
  }

  return values;
}

async function findExistingPrimaryKeys(tableName: string, values: Array<string | number>) {
  if (values.length === 0) return [];

  const db = getDb();
  const existingValues: Array<string | number> = [];
  const chunkSize = 500;

  for (let index = 0; index < values.length; index += chunkSize) {
    const chunk = values.slice(index, index + chunkSize);
    const safeValues = chunk.map(backupValueToSql).join(", ");
    const result = await db.execute(
      sql.raw(
        `SELECT \`id\` FROM ${quoteSqlIdentifier(tableName)} WHERE \`id\` IN (${safeValues})`
      )
    );

    for (const row of getSqlRows(result)) {
      const id = row.id;
      if (typeof id === "number" || typeof id === "string") {
        existingValues.push(id);
      }
    }
  }

  return existingValues;
}

function getBackupSqlTableName(key: string) {
  return key === "moduleAccess" ? "module_access" : key;
}

function quoteSqlIdentifier(identifier: string) {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
}

function escapeSqlString(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function backupValueToSql(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) return escapeSqlString(value.toISOString().slice(0, 19).replace("T", " "));
  if (Array.isArray(value) || isRecord(value)) return escapeSqlString(JSON.stringify(value));
  return escapeSqlString(String(value));
}

function getBackupRowColumns(rows: unknown[]) {
  const columns = new Set<string>();

  for (const row of rows) {
    if (!isRecord(row)) {
      throw new Error("Backup table contains a row that is not an object.");
    }

    for (const column of Object.keys(row)) {
      if (!/^[A-Za-z0-9_]+$/.test(column)) {
        throw new Error(`Backup row contains an unsafe column name: ${column}`);
      }
      columns.add(column);
    }
  }

  return Array.from(columns);
}

function buildRestoreInsertSql(tableName: string, rows: unknown[], mode: BackupRestorePlanInput["mode"]) {
  if (rows.length === 0) {
    return [`-- ${quoteSqlIdentifier(tableName)} has no rows in the backup.`];
  }

  const columns = getBackupRowColumns(rows);
  if (columns.length === 0) {
    return [`-- ${quoteSqlIdentifier(tableName)} has rows but no readable columns.`];
  }

  const insertVerb = mode === "merge" ? "INSERT IGNORE INTO" : "INSERT INTO";
  const quotedColumns = columns.map(quoteSqlIdentifier).join(", ");

  return rows.map((row) => {
    if (!isRecord(row)) {
      throw new Error("Backup table contains a row that is not an object.");
    }

    const values = columns.map((column) => backupValueToSql(row[column])).join(", ");
    return `${insertVerb} ${quoteSqlIdentifier(tableName)} (${quotedColumns}) VALUES (${values});`;
  });
}

function buildRestoreInsertStatement(
  tableName: string,
  columns: string[],
  row: Record<string, unknown>,
  mode: BackupRestorePlanInput["mode"]
) {
  const insertVerb = mode === "merge" ? "INSERT IGNORE INTO" : "INSERT INTO";
  const quotedColumns = columns.map(quoteSqlIdentifier).join(", ");
  const values = columns.map((column) => backupValueToSql(row[column])).join(", ");

  return `${insertVerb} ${quoteSqlIdentifier(tableName)} (${quotedColumns}) VALUES (${values});`;
}

function getAffectedRows(value: unknown) {
  if (!Array.isArray(value)) return 0;
  const first = value[0];

  if (isRecord(first) && typeof first.affectedRows === "number") {
    return first.affectedRows;
  }

  if (Array.isArray(first) && isRecord(first[0]) && typeof first[0].affectedRows === "number") {
    return first[0].affectedRows;
  }

  return 0;
}

function getInsertId(value: unknown) {
  if (!Array.isArray(value)) return 0;
  const first = value[0];

  if (isRecord(first) && typeof first.insertId === "number") {
    return first.insertId;
  }

  if (Array.isArray(first) && isRecord(first[0]) && typeof first[0].insertId === "number") {
    return first[0].insertId;
  }

  return 0;
}

function isIgnorableSchemaRepairError(error: unknown) {
  const message = normaliseErrorMessage(error).toLowerCase();
  return (
    message.includes("duplicate column") ||
    message.includes("er_dup_fieldname") ||
    message.includes("already exists") ||
    message.includes("er_table_exists_error")
  );
}

async function buildSafetySnapshot(ctx: { id: number; name: string | null; email: string | null; role: string }) {
  const tables = await Promise.all(BACKUP_TABLES.map((entry) => readBackupTable(entry)));
  const totalRows = tables.reduce((total, table) => total + table.rowCount, 0);

  return {
    format: "textpoint-backup",
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: {
      id: ctx.id,
      name: ctx.name,
      email: ctx.email,
      role: ctx.role,
    },
    reason: "Automatic safety snapshot before direct restore apply.",
    safety: {
      credentialTablesIncluded: false,
      note:
        "This export excludes auth password/account/session tables. Create new passwords after restoring on another machine.",
    },
    environment: {
      appBaseUrl: ENV.appBaseUrl,
      databaseHost: (() => {
        try {
          return new URL(ENV.databaseUrl).host;
        } catch {
          return "Configured";
        }
      })(),
      nodeEnv: process.env.NODE_ENV || "development",
    },
    summary: {
      tableCount: tables.length,
      totalRows,
    },
    tables,
  };
}

async function buildBestEffortSafetySnapshot(options: {
  ctx: { id: number; name: string | null; email: string | null; role: string };
  reason: string;
}) {
  const results = await Promise.all(
    BACKUP_TABLES.map(async (entry) => {
      try {
        return {
          ok: true as const,
          table: await readBackupTable(entry),
          key: entry.key,
          label: entry.label,
          error: null,
        };
      } catch (error) {
        return {
          ok: false as const,
          table: null,
          key: entry.key,
          label: entry.label,
          error: normaliseErrorMessage(error),
        };
      }
    })
  );
  const tables = results.flatMap((result) => (result.ok ? [result.table] : []));
  const unreadableTables = results
    .filter((result) => !result.ok)
    .map((result) => ({
      key: result.key,
      label: result.label,
      error: result.error,
    }));
  const totalRows = tables.reduce((total, table) => total + table.rowCount, 0);

  return {
    format: "textpoint-backup",
    version: 1,
    generatedAt: new Date().toISOString(),
    generatedBy: {
      id: options.ctx.id,
      name: options.ctx.name,
      email: options.ctx.email,
      role: options.ctx.role,
    },
    reason: options.reason,
    safety: {
      credentialTablesIncluded: false,
      bestEffort: true,
      note:
        "Best-effort safety snapshot created before schema repair. Credential/password/account/session tables are excluded.",
      unreadableTables,
    },
    environment: {
      appBaseUrl: ENV.appBaseUrl,
      databaseHost: (() => {
        try {
          return new URL(ENV.databaseUrl).host;
        } catch {
          return "Configured";
        }
      })(),
      nodeEnv: process.env.NODE_ENV || "development",
    },
    summary: {
      tableCount: tables.length,
      totalRows,
      unreadableTableCount: unreadableTables.length,
    },
    tables,
  };
}

function buildRestoreSqlScript(options: {
  backupGeneratedAt: string | null;
  generatedBy: string;
  generatedAt: string;
  mode: BackupRestorePlanInput["mode"];
  warnings: string[];
  selectedTables: ParsedBackupTable[];
}) {
  const selectedTablesInBackupOrder = BACKUP_TABLES
    .map((entry) => options.selectedTables.find((table) => table.key === entry.key))
    .filter((table): table is ParsedBackupTable => Boolean(table));

  const lines = [
    "-- TextPoint controlled restore script",
    `-- Script generated: ${options.generatedAt}`,
    `-- Generated by: ${options.generatedBy}`,
    `-- Backup generated: ${options.backupGeneratedAt ?? "not supplied"}`,
    `-- Mode: ${options.mode === "replaceSelected" ? "replace selected tables" : "merge with duplicate protection"}`,
    "--",
    "-- Review this file before running it. Keep a fresh backup of the destination database.",
    "-- Credential/password/session tables are intentionally not included in TextPoint backup exports.",
    "-- After restoring to another PC, create/reset user passwords in the application.",
  ];

  if (options.warnings.length > 0) {
    lines.push("--", "-- Warnings from restore planning:");
    for (const warning of options.warnings) {
      lines.push(`-- - ${warning.replace(/\r?\n/g, " ")}`);
    }
  }

  lines.push("", "SET FOREIGN_KEY_CHECKS = 0;", "START TRANSACTION;", "");

  if (options.mode === "replaceSelected") {
    lines.push("-- Clear selected destination tables first. Delete order is reversed to reduce dependency conflicts.");
    for (const table of [...selectedTablesInBackupOrder].reverse()) {
      lines.push(`DELETE FROM ${quoteSqlIdentifier(getBackupSqlTableName(table.key))};`);
    }
    lines.push("");
  }

  for (const table of selectedTablesInBackupOrder) {
    const tableName = getBackupSqlTableName(table.key);
    lines.push(`-- ${table.label} (${table.key}) - ${table.actualRows} row${table.actualRows === 1 ? "" : "s"}`);
    lines.push(...buildRestoreInsertSql(tableName, table.rows, options.mode));
    lines.push("");
  }

  lines.push("COMMIT;", "SET FOREIGN_KEY_CHECKS = 1;", "");
  return lines.join("\n");
}

function getFirstRow(value: unknown) {
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) {
      return value[0][0] as Record<string, unknown> | undefined;
    }
    return value[0] as Record<string, unknown> | undefined;
  }
  return undefined;
}

function getSqlRows(value: unknown) {
  if (Array.isArray(value)) {
    const rows = Array.isArray(value[0]) ? value[0] : value;
    return rows.filter(isRecord);
  }

  return [];
}

async function checkTable(
  key: string,
  label: string,
  table: (typeof CORE_TABLE_CHECKS)[number]["table"]
): Promise<DiagnosticCheck> {
  const db = getDb();
  const startedAt = Date.now();

  try {
    await db.select().from(table as any).limit(1);
    const countResult = await db
      .select({ rowCount: sql<number>`count(*)` })
      .from(table as any);
    const rowCount = Number(countResult[0]?.rowCount ?? 0);

    return {
      key,
      label,
      status: "healthy",
      detail: "Table and mapped columns are readable.",
      durationMs: Date.now() - startedAt,
      count: Number.isFinite(rowCount) ? rowCount : null,
    };
  } catch (error) {
    return {
      key,
      label,
      status: "error",
      detail: normaliseErrorMessage(error),
      durationMs: Date.now() - startedAt,
      count: null,
    };
  }
}

async function readBackupTable(entry: (typeof BACKUP_TABLES)[number]) {
  const db = getDb();
  const rows = await db.select().from(entry.table as any);

  return {
    key: entry.key,
    label: entry.label,
    rowCount: rows.length,
    rows,
  };
}

function getExpectedSchemaColumns(table: any): SchemaColumnReadiness[] {
  const columns = getTableColumns(table) as Record<string, any>;

  return Object.values(columns).map((column) => ({
    name: String(column.name),
    sqlType:
      typeof column.getSQLType === "function" ? String(column.getSQLType()) : "text",
    notNull: Boolean(column.notNull),
    hasDefault: Boolean(column.hasDefault),
    isPrimaryKey: Boolean(column.primary),
    isAutoincrement: Boolean(column.autoIncrement),
    exists: false,
  }));
}

function schemaDefaultToSql(column: any) {
  if (column.default === undefined || column.default === null) return null;
  if (typeof column.default === "boolean") return column.default ? "true" : "false";
  if (typeof column.default === "number") return Number.isFinite(column.default) ? String(column.default) : null;
  if (typeof column.default === "string") return escapeSqlString(column.default);

  const columnType = String(column.columnType ?? "").toLowerCase();
  if (columnType.includes("timestamp") || columnType.includes("datetime")) {
    return "CURRENT_TIMESTAMP";
  }

  return null;
}

function buildColumnSqlDefinition(column: any, options: { forExistingTable: boolean }) {
  const sqlType =
    typeof column.getSQLType === "function" ? String(column.getSQLType()) : "text";
  const parts = [
    quoteSqlIdentifier(String(column.name)),
    sqlType,
  ];
  const isPrimaryKey = Boolean(column.primary);
  const isAutoincrement = Boolean(column.autoIncrement);
  const canInlineUnique =
    !options.forExistingTable &&
    Boolean(column.isUnique) &&
    !isPrimaryKey &&
    !["text", "json"].includes(sqlType.toLowerCase());
  const hasSafeNotNull =
    Boolean(column.notNull) &&
    (!options.forExistingTable || Boolean(column.hasDefault) || isAutoincrement || isPrimaryKey);
  const defaultSql = schemaDefaultToSql(column);

  if (hasSafeNotNull) parts.push("NOT NULL");
  if (defaultSql) parts.push(`DEFAULT ${defaultSql}`);
  if (Boolean(column.hasOnUpdateNow)) parts.push("ON UPDATE CURRENT_TIMESTAMP");
  if (isAutoincrement) parts.push("AUTO_INCREMENT");
  if (isPrimaryKey && !options.forExistingTable) parts.push("PRIMARY KEY");
  if (canInlineUnique) parts.push("UNIQUE");

  return parts.join(" ");
}

function getSchemaManualReviewItems(readiness: SchemaReadiness) {
  const tableByName = new Map(SCHEMA_TABLES.map((entry) => [getTableName(entry.table), entry]));
  const items: string[] = [];

  for (const table of readiness.tables) {
    const entry = tableByName.get(table.tableName);
    if (!entry || !table.exists) continue;
    const columns = getTableColumns(entry.table) as Record<string, any>;

    for (const missingColumn of table.missingColumns) {
      const column = Object.values(columns).find((candidate) => candidate.name === missingColumn.name) as any;
      if (!column) continue;

      if (Boolean(column.primary)) {
        items.push(
          `${table.label} is missing primary key column ${missingColumn.name}; recreate or repair this table manually before production use.`
        );
        continue;
      }

      if (Boolean(column.notNull) && !Boolean(column.hasDefault) && !Boolean(column.autoIncrement)) {
        items.push(
          `${table.label}.${missingColumn.name} is NOT NULL without a default; the repair script adds it as nullable so existing records are not damaged.`
        );
      }
    }
  }

  return items;
}

async function buildSchemaReadiness(): Promise<SchemaReadiness> {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT
      table_name AS tableName,
      column_name AS columnName
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    ORDER BY table_name, ordinal_position
  `);
  const currentRows = getSqlRows(result);
  const columnsByTable = new Map<string, string[]>();
  const tableNameByLower = new Map<string, string>();

  for (const row of currentRows) {
    const tableName = String(row.tableName ?? "");
    const columnName = String(row.columnName ?? "");
    if (!tableName || !columnName) continue;

    tableNameByLower.set(tableName.toLowerCase(), tableName);
    const tableColumns = columnsByTable.get(tableName) ?? [];
    tableColumns.push(columnName);
    columnsByTable.set(tableName, tableColumns);
  }

  const tables = SCHEMA_TABLES.map((entry): SchemaTableReadiness => {
    const tableName = getTableName(entry.table);
    const actualTableName = tableNameByLower.get(tableName.toLowerCase());
    const presentColumns = actualTableName ? columnsByTable.get(actualTableName) ?? [] : [];
    const presentColumnSet = new Set(presentColumns.map((column) => column.toLowerCase()));
    const expectedColumns = getExpectedSchemaColumns(entry.table);
    const expectedColumnSet = new Set(expectedColumns.map((column) => column.name.toLowerCase()));
    const missingColumns = expectedColumns
      .filter((column) => !presentColumnSet.has(column.name.toLowerCase()))
      .map((column) => ({ ...column, exists: false }));
    const extraColumns = presentColumns.filter(
      (column) => !expectedColumnSet.has(column.toLowerCase())
    );
    const exists = Boolean(actualTableName);
    const status: DiagnosticStatus = !exists || missingColumns.length > 0
      ? "error"
      : extraColumns.length > 0
        ? "attention"
        : "healthy";

    return {
      key: entry.key,
      label: entry.label,
      tableName,
      status,
      exists,
      expectedColumnCount: expectedColumns.length,
      presentColumnCount: presentColumns.length,
      missingColumns,
      extraColumns,
    };
  });

  const summary = {
    expectedTables: tables.length,
    readyTables: tables.filter((table) => table.status === "healthy").length,
    missingTables: tables.filter((table) => !table.exists).length,
    attentionTables: tables.filter((table) => table.status === "attention").length,
    expectedColumns: tables.reduce((total, table) => total + table.expectedColumnCount, 0),
    missingColumns: tables.reduce((total, table) => total + table.missingColumns.length, 0),
    extraColumns: tables.reduce((total, table) => total + table.extraColumns.length, 0),
    repairableStatements: tables.reduce((total, table) => {
      if (!table.exists) return total + 1;
      return total + table.missingColumns.filter((column) => !column.isPrimaryKey).length;
    }, 0),
    manualReviewItems: 0,
  };

  const readinessWithoutManualCount: SchemaReadiness = {
    checkedAt: new Date().toISOString(),
    status: summary.missingTables > 0 || summary.missingColumns > 0
      ? "error"
      : summary.attentionTables > 0
        ? "attention"
        : "healthy",
    summary,
    tables,
    repairScriptAvailable: summary.repairableStatements > 0,
    manualReviewItems: [],
  };
  const manualReviewItems = getSchemaManualReviewItems(readinessWithoutManualCount);

  return {
    ...readinessWithoutManualCount,
    summary: {
      ...summary,
      manualReviewItems: manualReviewItems.length,
    },
    manualReviewItems,
  };
}

function buildCreateTableSql(entry: SchemaTableEntry) {
  const columns = Object.values(getTableColumns(entry.table) as Record<string, any>);
  const columnDefinitions = columns.map((column) =>
    `  ${buildColumnSqlDefinition(column, { forExistingTable: false })}`
  );

  return [
    `CREATE TABLE IF NOT EXISTS ${quoteSqlIdentifier(getTableName(entry.table))} (`,
    columnDefinitions.join(",\n"),
    ")",
  ].join("\n");
}

function buildSchemaRepairStatements(readiness: SchemaReadiness): SchemaRepairStatement[] {
  const tableReadinessByName = new Map(
    readiness.tables.map((table) => [table.tableName, table])
  );
  const statements: SchemaRepairStatement[] = [];

  for (const entry of SCHEMA_TABLES) {
    const tableName = getTableName(entry.table);
    const tableReadiness = tableReadinessByName.get(tableName);
    if (!tableReadiness) continue;

    if (!tableReadiness.exists) {
      statements.push({
        kind: "createTable",
        tableName,
        label: tableReadiness.label,
        statement: buildCreateTableSql(entry),
      });
      continue;
    }

    if (tableReadiness.missingColumns.length === 0) continue;

    const columns = getTableColumns(entry.table) as Record<string, any>;
    for (const missingColumn of tableReadiness.missingColumns) {
      const column = Object.values(columns).find((candidate) => candidate.name === missingColumn.name) as any;
      if (!column || Boolean(column.primary)) continue;

      statements.push({
        kind: "addColumn",
        tableName,
        label: `${tableReadiness.label}.${missingColumn.name}`,
        statement: `ALTER TABLE ${quoteSqlIdentifier(tableName)} ADD COLUMN ${buildColumnSqlDefinition(column, {
          forExistingTable: true,
        })}`,
      });
    }
  }

  return statements;
}

function buildSchemaRepairScript(options: {
  readiness: SchemaReadiness;
  generatedAt: string;
  generatedBy: string;
}) {
  const statements = buildSchemaRepairStatements(options.readiness);
  const lines = [
    "-- TextPoint schema readiness repair script",
    `-- Script generated: ${options.generatedAt}`,
    `-- Generated by: ${options.generatedBy}`,
    "--",
    "-- Review this file before running it in MySQL Workbench or the mysql CLI.",
    "-- Create a fresh backup before applying schema changes.",
    "-- MySQL DDL statements auto-commit; run this during quiet time with users logged out.",
    "",
  ];

  if (!options.readiness.repairScriptAvailable) {
    lines.push("-- No missing tables or columns were detected.");
    return lines.join("\n");
  }

  if (options.readiness.manualReviewItems.length > 0) {
    lines.push("-- Manual review notes:");
    for (const item of options.readiness.manualReviewItems) {
      lines.push(`-- - ${item.replace(/\r?\n/g, " ")}`);
    }
    lines.push("");
  }

  let lastTableName = "";
  for (const repairStatement of statements) {
    if (repairStatement.tableName !== lastTableName) {
      lines.push(
        repairStatement.kind === "createTable"
          ? `-- Missing table: ${repairStatement.label}`
          : `-- Missing columns for ${repairStatement.tableName}`
      );
      lastTableName = repairStatement.tableName;
    }
    lines.push(`${repairStatement.statement};`);
  }

  lines.push("");
  return lines.join("\n");
}

function getDiagnosticSummary(checks: DiagnosticCheck[]) {
  return {
    total: checks.length,
    healthy: checks.filter((check) => check.status === "healthy").length,
    attention: checks.filter((check) => check.status === "attention").length,
    error: checks.filter((check) => check.status === "error").length,
  };
}

function getOverallStatus(summary: ReturnType<typeof getDiagnosticSummary>): DiagnosticStatus {
  if (summary.error > 0) return "error";
  if (summary.attention > 0) return "attention";
  return "healthy";
}

function getEnvironmentSummary() {
  const storageSummary = getStorageRuntimeSummary();
  return {
    appBaseUrl: ENV.appBaseUrl,
    databaseHost: (() => {
      try {
        return new URL(ENV.databaseUrl).host;
      } catch {
        return "Configured";
      }
    })(),
    nodeEnv: process.env.NODE_ENV || "development",
    localAuthBypass: ENV.localAuthBypass,
    localAuthEmail: ENV.localAuthEmail,
    ownerNotificationConfigured: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
    smtpConfigured: isEmailDeliveryConfigured(),
    bootstrapAdminPasswordConfigured: Boolean(ENV.bootstrapAdminPassword),
    reminderSchedulerEnabled: ENV.reminderSchedulerEnabled,
    reminderSchedulerIntervalMinutes: ENV.reminderSchedulerIntervalMinutes,
    storageProvider: storageSummary.provider,
    storageDurable:
      storageSummary.provider === "s3" ||
      (storageSummary.provider === "local" && !ENV.isProduction),
    storageProductionOverride:
      storageSummary.provider === "local" ? Boolean(storageSummary.productionOverride) : false,
  };
}

async function getSystemMaintenanceHistory(limit = 25): Promise<SystemMaintenanceHistoryItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditLogs)
    .where(inArray(auditLogs.entityType, [...SYSTEM_MAINTENANCE_AUDIT_ENTITY_TYPES]))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  const userIds = Array.from(new Set(rows.map((row) => row.userId).filter(Boolean)));
  const actorRows =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];
  const actorById = new Map(actorRows.map((actor) => [actor.id, actor]));

  return rows.map((row) => {
    const changes = parseAuditChanges(row.changes);
    const actor = actorById.get(row.userId);

    return {
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      status: row.status,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      userId: row.userId,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      mode: readOptionalString(changes?.mode),
      activityStatus: readOptionalString(changes?.status),
      backupTableCount: readOptionalNumber(changes?.tableCount),
      backupTotalRows: readOptionalNumber(changes?.totalRows),
      schemaRepairableStatements: readOptionalNumber(changes?.repairableStatements),
      schemaAttemptedStatements: readOptionalNumber(changes?.attemptedStatements),
      schemaAppliedStatements: readOptionalNumber(changes?.appliedStatements),
      schemaSkippedStatements: readOptionalNumber(changes?.skippedStatements),
      schemaMissingTables: readOptionalNumber(changes?.missingTables),
      schemaMissingColumns: readOptionalNumber(changes?.missingColumns),
      schemaManualReviewItems: readOptionalNumber(changes?.manualReviewItems),
      selectedTableCount: readOptionalNumber(changes?.selectedTableCount),
      selectedRows: readOptionalNumber(changes?.selectedRows),
      attemptedRows: readOptionalNumber(changes?.attemptedRows),
      insertedRows: readOptionalNumber(changes?.insertedRows),
      skippedRows: readOptionalNumber(changes?.skippedRows),
      duplicatePrimaryKeyCount: readOptionalNumber(changes?.duplicatePrimaryKeyCount),
      warningCount: Array.isArray(changes?.warnings)
        ? changes.warnings.length
        : readOptionalNumber(changes?.warnings),
      errorCount: Array.isArray(changes?.errors)
        ? changes.errors.length
        : readOptionalNumber(changes?.errors),
      changes,
    };
  });
}

function buildTransferPackReadme(options: {
  generatedAt: string;
  generatedBy: string;
  schemaReadiness: SchemaReadiness;
  backupSummary: {
    tableCount: number;
    totalRows: number;
    unreadableTableCount: number;
  };
}) {
  const lines = [
    "TextPoint Transfer / Readiness Pack",
    `Generated: ${options.generatedAt}`,
    `Generated by: ${options.generatedBy}`,
    "",
    "What is included",
    "- Best-effort operational backup data excluding credential/password/session tables.",
    "- Database schema readiness report.",
    "- Additive schema repair SQL for missing tables/columns.",
    "- Recent system maintenance history.",
    "- Environment summary without database passwords.",
    "",
    "Recommended move-to-PC sequence",
    "1. Install Node.js, MySQL, and project dependencies on the destination PC.",
    "2. Create the target MySQL database.",
    "3. Start the app once and open Admin > Health.",
    "4. Review schemaReadiness and schemaRepairSql in this pack.",
    "5. If needed, run the schema repair SQL or use Admin > Health > Apply Schema Repair.",
    "6. Use the backup restore preview/preflight flow before restoring data.",
    "7. Recreate or reset user passwords on the destination PC.",
    "8. Run System Health Diagnostics after the move.",
    "",
    "Current pack summary",
    `- Backup: ${options.backupSummary.tableCount} readable tables, ${options.backupSummary.totalRows} rows, ${options.backupSummary.unreadableTableCount} unreadable table(s).`,
    `- Schema: ${options.schemaReadiness.status}; ${options.schemaReadiness.summary.missingTables} missing table(s), ${options.schemaReadiness.summary.missingColumns} missing column(s), ${options.schemaReadiness.summary.repairableStatements} repair statement(s).`,
    "",
    "Important safety note",
    "This pack intentionally excludes authentication credential/session tables. After restoring on another PC, create/reset user passwords inside the app.",
  ];

  return lines.join("\n");
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  readiness: publicProcedure.query(async () => {
    const environment = evaluateEnvironmentReadiness();
    let databaseOk = false;
    let databaseError: string | null = null;

    try {
      await getDb().execute(sql`SELECT 1`);
      databaseOk = true;
    } catch (error) {
      databaseError =
        error instanceof Error ? error.message : "Database connectivity check failed.";
    }

    const checks = [
      {
        key: "database",
        status: databaseOk ? "healthy" : "error",
        detail: databaseOk ? "Database connection is responding." : databaseError,
      },
      {
        key: "environment",
        status: environment.status,
        detail:
          environment.issues[0]?.message ??
          "Environment configuration is ready for rollout checks.",
      },
    ];

    const hasError =
      !databaseOk || checks.some((check) => check.status === "error");
    const hasAttention = checks.some((check) => check.status === "attention");

    return {
      ok: !hasError,
      status: hasError ? "error" : hasAttention ? "attention" : "healthy",
      checkedAt: new Date().toISOString(),
      environment,
      checks,
    };
  }),

  diagnostics: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || !["admin", "super_admin"].includes(ctx.user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Admin or Super Admin can view system diagnostics.",
      });
    }

    const db = getDb();
    const checks: DiagnosticCheck[] = [];
    const databaseStartedAt = Date.now();
    let databaseVersion = "";

    try {
      const pingResult = await db.execute(sql`select version() as version`);
      const row = getFirstRow(pingResult);
      databaseVersion = String(row?.version || "");
      checks.push({
        key: "database_connection",
        label: "Database Connection",
        status: "healthy",
        detail: databaseVersion
          ? `Connected to MySQL ${databaseVersion}.`
          : "Database connection is responding.",
        durationMs: Date.now() - databaseStartedAt,
      });
    } catch (error) {
      checks.push({
        key: "database_connection",
        label: "Database Connection",
        status: "error",
        detail: normaliseErrorMessage(error),
        durationMs: Date.now() - databaseStartedAt,
      });
    }

    const tableChecks = await Promise.all(
      CORE_TABLE_CHECKS.map((check) => checkTable(check.key, check.label, check.table))
    );
    checks.push(...tableChecks);

    let schemaReadiness: SchemaReadiness | null = null;
    try {
      schemaReadiness = await buildSchemaReadiness();
      checks.push({
        key: "schema_readiness",
        label: "Database Schema Readiness",
        status: schemaReadiness.status,
        detail:
          schemaReadiness.status === "healthy"
            ? `${schemaReadiness.summary.expectedTables} tables and ${schemaReadiness.summary.expectedColumns} expected columns are present.`
            : `${schemaReadiness.summary.missingTables} missing table(s), ${schemaReadiness.summary.missingColumns} missing column(s), ${schemaReadiness.summary.extraColumns} extra legacy column(s).`,
        count: schemaReadiness.summary.repairableStatements,
      });
    } catch (error) {
      checks.push({
        key: "schema_readiness",
        label: "Database Schema Readiness",
        status: "error",
        detail: normaliseErrorMessage(error),
        count: null,
      });
    }

    const superAdminRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "super_admin"))
      .catch(() => []);

    checks.push({
      key: "super_admin_account",
      label: "Super Admin Account",
      status: superAdminRows.length > 0 ? "healthy" : "attention",
      detail:
        superAdminRows.length > 0
          ? `${superAdminRows.length} Super Admin account${
              superAdminRows.length === 1 ? "" : "s"
            } found.`
          : "No Super Admin account exists yet. Bootstrap one before production use.",
      count: superAdminRows.length,
    });

    checks.push({
      key: "local_auth_bypass",
      label: "Local Auth Bypass",
      status: ENV.localAuthBypass ? "attention" : "healthy",
      detail: ENV.localAuthBypass
        ? "LOCAL_AUTH_BYPASS is enabled. Useful for development, but disable it before production."
        : "Local auth bypass is disabled.",
    });

    const environmentReadiness = evaluateEnvironmentReadiness();
    checks.push({
      key: "environment_readiness",
      label: "Environment Readiness",
      status: environmentReadiness.status,
      detail:
        environmentReadiness.issues[0]?.message ??
        "Environment configuration is ready for rollout checks.",
      count: environmentReadiness.issues.length,
    });

    checks.push({
      key: "owner_notification_service",
      label: "Owner Notification Service",
      status: ENV.forgeApiUrl && ENV.forgeApiKey ? "healthy" : "attention",
      detail:
        ENV.forgeApiUrl && ENV.forgeApiKey
          ? "External owner notification service is configured."
          : "External owner notification service is not configured. In-app notifications still work.",
    });

    checks.push({
      key: "smtp_delivery",
      label: "SMTP Email Delivery",
      status: isEmailDeliveryConfigured() ? "healthy" : "attention",
      detail: isEmailDeliveryConfigured()
        ? "SMTP email delivery is configured."
        : "SMTP email delivery is not configured. Password resets and outbound handoff emails will stay manual.",
    });

    const storageSummary = getStorageRuntimeSummary();
    checks.push({
      key: "storage_provider",
      label: "File Storage Provider",
      status:
        storageSummary.provider === "s3" ||
        (storageSummary.provider === "local" && !ENV.isProduction)
          ? "healthy"
          : "attention",
      detail:
        storageSummary.provider === "s3"
          ? `Durable object storage is configured (${storageSummary.bucket ?? "bucket not reported"}).`
          : ENV.isProduction
            ? "Storage is still local in production. Upload durability depends on the current machine."
            : "Local storage is active for development.",
    });

    checks.push({
      key: "bootstrap_admin_password",
      label: "Bootstrap Admin Password",
      status: ENV.bootstrapAdminPassword ? "attention" : "healthy",
      detail: ENV.bootstrapAdminPassword
        ? "BOOTSTRAP_ADMIN_PASSWORD is still configured. Remove it after the first live admin login."
        : "Bootstrap admin password is not configured.",
    });

    checks.push({
      key: "reminder_scheduler",
      label: "Reminder Scheduler",
      status: ENV.reminderSchedulerEnabled ? "healthy" : "attention",
      detail: ENV.reminderSchedulerEnabled
        ? `Automatic reminder sweeps are enabled every ${ENV.reminderSchedulerIntervalMinutes} minute(s).`
        : "Automatic reminder sweeps are disabled. Only manual reminder runs will happen.",
    });

    const summary = getDiagnosticSummary(checks);

    return {
      checkedAt: new Date().toISOString(),
      status: getOverallStatus(summary),
      summary,
      database: {
        ok: checks.find((check) => check.key === "database_connection")?.status === "healthy",
        latencyMs: checks.find((check) => check.key === "database_connection")?.durationMs ?? null,
        version: databaseVersion || null,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        appBaseUrl: ENV.appBaseUrl,
        databaseHost: getEnvironmentSummary().databaseHost,
        localAuthBypass: ENV.localAuthBypass,
        localAuthEmail: ENV.localAuthEmail,
        ownerNotificationConfigured: Boolean(ENV.forgeApiUrl && ENV.forgeApiKey),
      },
      schemaReadiness,
      checks,
    };
  }),

  operationalReadiness: protectedProcedure
    .input(
      z
        .object({
          branchId: z.number().int().positive().optional().nullable(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || !["admin", "super_admin"].includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admin or Super Admin can view operational readiness.",
        });
      }

      return buildOperationalReadinessSnapshot(input?.branchId ?? null);
    }),

  createQualityActionFromReadinessIssue: protectedProcedure
    .input(operationalReadinessIssueInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || !["admin", "super_admin"].includes(ctx.user.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Admin or Super Admin can create quality actions from readiness issues.",
        });
      }

      const fingerprintMarker = getReadinessFingerprintMarker(input.fingerprint);
      const existingActions = await getDb().select().from(qualityActions);
      const existing = existingActions.find(
        (action) =>
          action.status !== "Closed" &&
          typeof action.description === "string" &&
          action.description.includes(fingerprintMarker)
      );

      if (existing) {
        return {
          created: false,
          qualityActionId: existing.id,
          referenceNumber: existing.referenceNumber,
          message: "An open Quality Action already tracks this readiness issue.",
        };
      }

      const category = mapReadinessSeverityToQualityCategory(input.severity);
      const severity = mapReadinessSeverityToQualitySeverity(input.severity);
      const source = mapReadinessAreaToQualitySource(input.area);
      const ownerName = ctx.user.name || ctx.user.email || `User ${ctx.user.id}`;
      const description = [
        `Operational Readiness finding: ${input.title}`,
        "",
        input.detail,
        "",
        `Recommended action: ${input.action}`,
        `Area: ${input.area}`,
        `Record: ${input.recordType}${input.recordId === null || input.recordId === undefined ? "" : ` #${input.recordId}`}`,
        input.branchName ? `Branch: ${input.branchName}` : null,
        input.path ? `Source page: ${input.path}` : null,
        fingerprintMarker,
      ]
        .filter(Boolean)
        .join("\n");

      const result = await createQualityAction({
        referenceNumber: null,
        title: `Readiness: ${input.title}`.slice(0, 255),
        category,
        source,
        severity,
        status: "Open",
        branchId: input.branchId ?? null,
        ownerName,
        reportedByUserId: ctx.user.id,
        reportedDate: new Date(),
        dueDate: getReadinessDueDate(input.severity),
        description,
        immediateCorrection: "Operational Readiness flagged this item for review.",
        rootCause: null,
        correctiveAction: input.action,
        verificationNotes: null,
        verifiedByName: null,
      } as any);

      const insertId = getInsertId(result);
      const createdRecord = insertId
        ? (
            await getDb()
              .select()
              .from(qualityActions)
              .where(eq(qualityActions.id, insertId))
              .limit(1)
          )[0] ?? null
        : null;

      await logAuditEvent(
        ctx.user.id,
        "CREATE",
        "qualityActionFromReadiness",
        insertId,
        {
          readinessFingerprint: input.fingerprint,
          readinessArea: input.area,
          readinessSeverity: input.severity,
          qualityCategory: category,
          qualitySeverity: severity,
          branchId: input.branchId ?? null,
        }
      );

      return {
        created: true,
        qualityActionId: insertId || null,
        referenceNumber: createdRecord?.referenceNumber ?? null,
        message: "Quality Action created from readiness issue.",
      };
    }),

  backupRestoreHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(25),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can view system maintenance history.",
        });
      }

      return getSystemMaintenanceHistory(input?.limit ?? 25);
    }),

  transferReadinessPack: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Super Admin can export a transfer readiness pack.",
      });
    }

    const generatedAt = new Date().toISOString();
    const generatedBy =
      [ctx.user.name, ctx.user.email].filter(Boolean).join(" / ") || `User ${ctx.user.id}`;
    const schemaReadiness = await buildSchemaReadiness();
    const backupSnapshot = await buildBestEffortSafetySnapshot({
      ctx: ctx.user,
      reason: "Transfer/readiness pack backup snapshot.",
    });
    const schemaRepairSql = buildSchemaRepairScript({
      readiness: schemaReadiness,
      generatedAt,
      generatedBy,
    });
    let databaseVersion: string | null = null;

    try {
      const versionResult = await getDb().execute(sql`select version() as version`);
      databaseVersion = String(getFirstRow(versionResult)?.version || "") || null;
    } catch {
      databaseVersion = null;
    }

    await logAuditEvent(
      ctx.user.id,
      "EXPORT",
      "transferReadinessPack",
      0,
      {
        tableCount: backupSnapshot.summary.tableCount,
        totalRows: backupSnapshot.summary.totalRows,
        unreadableTableCount: backupSnapshot.summary.unreadableTableCount,
        schemaStatus: schemaReadiness.status,
        missingTables: schemaReadiness.summary.missingTables,
        missingColumns: schemaReadiness.summary.missingColumns,
        repairableStatements: schemaReadiness.summary.repairableStatements,
        manualReviewItems: schemaReadiness.summary.manualReviewItems,
      },
      undefined,
      undefined,
      "Success"
    );

    const maintenanceHistory = await getSystemMaintenanceHistory(100);
    const readme = buildTransferPackReadme({
      generatedAt,
      generatedBy,
      schemaReadiness,
      backupSummary: backupSnapshot.summary,
    });

    return {
      format: "textpoint-transfer-readiness-pack",
      version: 1,
      generatedAt,
      generatedBy: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      },
      safety: {
        credentialTablesIncluded: false,
        note:
          "Credential/password/account/session tables are intentionally excluded. Reset/create user passwords after restoring on another PC.",
      },
      environment: {
        ...getEnvironmentSummary(),
        databaseVersion,
      },
      summary: {
        backupTableCount: backupSnapshot.summary.tableCount,
        backupTotalRows: backupSnapshot.summary.totalRows,
        unreadableTableCount: backupSnapshot.summary.unreadableTableCount,
        schemaStatus: schemaReadiness.status,
        missingTables: schemaReadiness.summary.missingTables,
        missingColumns: schemaReadiness.summary.missingColumns,
        repairableStatements: schemaReadiness.summary.repairableStatements,
        manualReviewItems: schemaReadiness.summary.manualReviewItems,
        maintenanceHistoryCount: maintenanceHistory.length,
      },
      readme,
      backupSnapshot,
      schemaReadiness,
      schemaRepairSql,
      maintenanceHistory,
    };
  }),

  schemaRepairScript: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Super Admin can export a schema repair script.",
      });
    }

    const generatedAt = new Date().toISOString();
    const readiness = await buildSchemaReadiness();
    const generatedBy =
      [ctx.user.name, ctx.user.email].filter(Boolean).join(" / ") || `User ${ctx.user.id}`;
    const script = buildSchemaRepairScript({
      readiness,
      generatedAt,
      generatedBy,
    });

    await logAuditEvent(
      ctx.user.id,
      "EXPORT",
      "schemaRepairScript",
      0,
      {
        status: readiness.status,
        missingTables: readiness.summary.missingTables,
        missingColumns: readiness.summary.missingColumns,
        repairableStatements: readiness.summary.repairableStatements,
        manualReviewItems: readiness.summary.manualReviewItems,
      },
      undefined,
      undefined,
      "Success"
    );

    return {
      generatedAt,
      fileName: `textpoint-schema-repair-${generatedAt.replace(/[:.]/g, "-")}.sql`,
      summary: readiness.summary,
      manualReviewItems: readiness.manualReviewItems,
      script,
    };
  }),

  schemaRepairApply: protectedProcedure
    .input(schemaRepairApplyInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can apply schema repairs.",
        });
      }

      if (input.confirmation.trim() !== SCHEMA_REPAIR_CONFIRMATION_PHRASE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type ${SCHEMA_REPAIR_CONFIRMATION_PHRASE} to apply schema repairs.`,
        });
      }

      const db = getDb();
      const startedAt = new Date().toISOString();
      const readiness = await buildSchemaReadiness();
      const statements = buildSchemaRepairStatements(readiness);
      const applied: SchemaRepairStatement[] = [];
      const skipped: Array<SchemaRepairStatement & { reason: string }> = [];

      if (statements.length === 0) {
        await logAuditEvent(
          ctx.user.id,
          "UPDATE",
          "schemaRepairApply",
          0,
          {
            status: readiness.status,
            attemptedStatements: 0,
            appliedStatements: 0,
            skippedStatements: 0,
            message: "No schema repair statements were required.",
          },
          undefined,
          undefined,
          "Success"
        );

        return {
          appliedAt: startedAt,
          requiredConfirmation: SCHEMA_REPAIR_CONFIRMATION_PHRASE,
          summary: {
            attemptedStatements: 0,
            appliedStatements: 0,
            skippedStatements: 0,
            manualReviewItems: readiness.summary.manualReviewItems,
          },
          applied: [],
          skipped: [],
          manualReviewItems: readiness.manualReviewItems,
          schemaReadiness: readiness,
          safetySnapshot: null,
        };
      }

      try {
        const safetySnapshot = await buildBestEffortSafetySnapshot({
          ctx: ctx.user,
          reason: "Automatic best-effort safety snapshot before direct schema repair apply.",
        });

        for (const repairStatement of statements) {
          try {
            await db.execute(sql.raw(repairStatement.statement));
            applied.push(repairStatement);
          } catch (error) {
            if (isIgnorableSchemaRepairError(error)) {
              skipped.push({
                ...repairStatement,
                reason: normaliseErrorMessage(error),
              });
              continue;
            }
            throw error;
          }
        }

        const afterReadiness = await buildSchemaReadiness();
        await logAuditEvent(
          ctx.user.id,
          "UPDATE",
          "schemaRepairApply",
          0,
          {
            status: afterReadiness.status,
            attemptedStatements: statements.length,
            appliedStatements: applied.length,
            skippedStatements: skipped.length,
            safetySnapshotTables: safetySnapshot.summary.tableCount,
            safetySnapshotUnreadableTables: safetySnapshot.summary.unreadableTableCount,
            remainingMissingTables: afterReadiness.summary.missingTables,
            remainingMissingColumns: afterReadiness.summary.missingColumns,
            manualReviewItems: afterReadiness.summary.manualReviewItems,
          },
          undefined,
          undefined,
          "Success"
        );

        return {
          appliedAt: new Date().toISOString(),
          requiredConfirmation: SCHEMA_REPAIR_CONFIRMATION_PHRASE,
          summary: {
            attemptedStatements: statements.length,
            appliedStatements: applied.length,
            skippedStatements: skipped.length,
            manualReviewItems: afterReadiness.summary.manualReviewItems,
          },
          applied: applied.map((statement) => ({
            kind: statement.kind,
            tableName: statement.tableName,
            label: statement.label,
          })),
          skipped: skipped.map((statement) => ({
            kind: statement.kind,
            tableName: statement.tableName,
            label: statement.label,
            reason: statement.reason,
          })),
          manualReviewItems: afterReadiness.manualReviewItems,
          schemaReadiness: afterReadiness,
          safetySnapshot,
        };
      } catch (error) {
        await logAuditEvent(
          ctx.user.id,
          "UPDATE",
          "schemaRepairApply",
          0,
          {
            attemptedStatements: statements.length,
            appliedStatements: applied.length,
            skippedStatements: skipped.length,
            error: normaliseErrorMessage(error),
          },
          undefined,
          undefined,
          "Failed",
          normaliseErrorMessage(error)
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Schema repair stopped after ${applied.length} applied statement(s): ${normaliseErrorMessage(error)}`,
        });
      }
    }),

  backupSnapshot: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Super Admin can export a system backup snapshot.",
      });
    }

    const tables = await Promise.all(BACKUP_TABLES.map((entry) => readBackupTable(entry)));
    const totalRows = tables.reduce((total, table) => total + table.rowCount, 0);
    const generatedAt = new Date().toISOString();

    await logAuditEvent(
      ctx.user.id,
      "EXPORT",
      "backupSnapshot",
      0,
      {
        tableCount: tables.length,
        totalRows,
        credentialTablesIncluded: false,
      },
      undefined,
      undefined,
      "Success"
    );

    return {
      format: "textpoint-backup",
      version: 1,
      generatedAt,
      generatedBy: {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
      },
      safety: {
        credentialTablesIncluded: false,
        note:
          "This export excludes auth password/account/session tables. Create new passwords after restoring on another machine.",
      },
      environment: {
        appBaseUrl: ENV.appBaseUrl,
        databaseHost: (() => {
          try {
            return new URL(ENV.databaseUrl).host;
          } catch {
            return "Configured";
          }
        })(),
        nodeEnv: process.env.NODE_ENV || "development",
      },
      summary: {
        tableCount: tables.length,
        totalRows,
      },
      tables,
    };
  }),

  backupRestorePlan: protectedProcedure
    .input(backupRestorePlanInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can plan a backup restore.",
        });
      }

      const parsed = parseBackupTables(input.backup);
      const selectedTableKeys = Array.from(new Set(input.selectedTables));
      const errors = [...parsed.errors];
      const warnings = [...parsed.warnings];
      const backupTablesByKey = new Map(parsed.tables.map((table) => [table.key, table]));

      const unknownSelectedTables = selectedTableKeys.filter(
        (key) => !BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"])
      );
      if (unknownSelectedTables.length > 0) {
        errors.push(`Unknown restore table selection: ${unknownSelectedTables.join(", ")}.`);
      }

      const selectedMissingFromBackup = selectedTableKeys.filter((key) => !backupTablesByKey.has(key));
      if (selectedMissingFromBackup.length > 0) {
        errors.push(
          `Selected table${selectedMissingFromBackup.length === 1 ? " is" : "s are"} missing from the backup: ${selectedMissingFromBackup.join(", ")}.`
        );
      }

      if (parsed.extraTables.length > 0) {
        warnings.push(
          `${parsed.extraTables.length} extra table${
            parsed.extraTables.length === 1 ? " is" : "s are"
          } present in the backup and will be ignored unless explicitly supported later.`
        );
      }

      if (parsed.missingTables.length > 0) {
        warnings.push(
          `${parsed.missingTables.length} expected table${
            parsed.missingTables.length === 1 ? " is" : "s are"
          } not present in the backup.`
        );
      }

      const validSelectedKeys = selectedTableKeys.filter(
        (key): key is (typeof BACKUP_TABLES)[number]["key"] =>
          BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"]) &&
          backupTablesByKey.has(key)
      );

      const plannedTables = await Promise.all(
        validSelectedKeys.map(async (key) => {
          const entry = BACKUP_TABLE_BY_KEY.get(key)!;
          const backupTable = backupTablesByKey.get(key)!;
          const currentRows = await countRowsForBackupTable(key);

          return {
            key,
            label: entry.label,
            backupRows: backupTable.actualRows,
            declaredBackupRows: backupTable.rowCount,
            currentRows,
            rowCountMismatch: backupTable.rowCountMismatch,
            action:
              input.mode === "replaceSelected"
                ? "Replace current rows in this table with backup rows."
                : "Merge backup rows into this table after duplicate/conflict checks.",
          };
        })
      );

      const selectedRows = plannedTables.reduce((total, table) => total + table.backupRows, 0);
      const affectedCurrentRows = plannedTables.reduce(
        (total, table) => total + (table.currentRows ?? 0),
        0
      );
      const status: BackupRestoreStatus =
        errors.length > 0 ? "blocked" : warnings.length > 0 ? "review" : "ready";

      const plan = {
        plannedAt: new Date().toISOString(),
        status,
        mode: input.mode,
        requiredConfirmation: "RESTORE TextPoint BACKUP",
        backup: {
          format: parsed.format,
          version: parsed.version,
          generatedAt: parsed.generatedAt,
          generatedBy: parsed.generatedBy,
          credentialTablesIncluded: parsed.credentialTablesIncluded,
        },
        summary: {
          selectedTableCount: plannedTables.length,
          selectedRows,
          affectedCurrentRows,
          warnings: warnings.length,
          errors: errors.length,
        },
        errors,
        warnings,
        selectedTables: plannedTables,
        ignoredTables: {
          missingExpectedTables: parsed.missingTables,
          extraBackupTables: parsed.extraTables,
        },
        steps:
          input.mode === "replaceSelected"
            ? [
                "Export a fresh backup of the current database before applying restore.",
                "Disable normal user activity during restore.",
                "Clear only the selected tables in dependency-safe order.",
                "Insert selected backup rows.",
                "Run system diagnostics and review audit logs.",
                "Create/reset user passwords because credential tables are excluded.",
              ]
            : [
                "Export a fresh backup of the current database before applying restore.",
                "Check duplicate keys and relationship conflicts for selected tables.",
                "Insert non-conflicting backup rows and report conflicts for manual review.",
                "Run system diagnostics and review audit logs.",
                "Create/reset user passwords because credential tables are excluded.",
              ],
      };

      await logAuditEvent(
        ctx.user.id,
        "IMPORT",
        "backupRestorePlan",
        0,
        {
          mode: input.mode,
          status,
          selectedTableCount: plannedTables.length,
          selectedRows,
          errors,
          warnings,
        },
        undefined,
        undefined,
        status === "blocked" ? "Failed" : "Success",
        status === "blocked" ? errors.join(" ") : undefined
      );

      return plan;
    }),

  backupRestorePreflight: protectedProcedure
    .input(backupRestorePlanInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can run a backup restore preflight.",
        });
      }

      const parsed = parseBackupTables(input.backup);
      const selectedTableKeys = Array.from(new Set(input.selectedTables));
      const errors = [...parsed.errors];
      const warnings = [...parsed.warnings];
      const backupTablesByKey = new Map(parsed.tables.map((table) => [table.key, table]));

      const unknownSelectedTables = selectedTableKeys.filter(
        (key) => !BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"])
      );
      if (unknownSelectedTables.length > 0) {
        errors.push(`Unknown restore table selection: ${unknownSelectedTables.join(", ")}.`);
      }

      const selectedMissingFromBackup = selectedTableKeys.filter((key) => !backupTablesByKey.has(key));
      if (selectedMissingFromBackup.length > 0) {
        errors.push(
          `Selected table${selectedMissingFromBackup.length === 1 ? " is" : "s are"} missing from the backup: ${selectedMissingFromBackup.join(", ")}.`
        );
      }

      const validSelectedKeys = selectedTableKeys.filter(
        (key): key is (typeof BACKUP_TABLES)[number]["key"] =>
          BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"]) &&
          backupTablesByKey.has(key)
      );

      const preflightTables = await Promise.all(
        validSelectedKeys.map(async (key): Promise<BackupRestorePreflightTable> => {
          const entry = BACKUP_TABLE_BY_KEY.get(key)!;
          const backupTable = backupTablesByKey.get(key)!;
          const tableName = getBackupSqlTableName(key);
          const notes: string[] = [];
          let tableStatus: BackupRestoreStatus = "ready";
          let backupColumns: string[] = [];
          let destinationColumns: string[] = [];
          let currentRows: number | null = null;
          let duplicatePrimaryKeyCount = 0;
          let duplicatePrimaryKeySamples: Array<string | number> = [];

          try {
            backupColumns = getBackupRowColumns(backupTable.rows);
          } catch (error) {
            tableStatus = "blocked";
            notes.push(error instanceof Error ? error.message : "Backup rows could not be inspected.");
          }

          try {
            destinationColumns = await getDestinationColumns(tableName);
            if (destinationColumns.length === 0) {
              tableStatus = "blocked";
              notes.push("Destination table does not exist or has no readable columns.");
            }
          } catch (error) {
            tableStatus = "blocked";
            notes.push(
              error instanceof Error ? error.message : "Destination table columns could not be inspected."
            );
          }

          try {
            currentRows = await countRowsForBackupTable(key);
          } catch (error) {
            tableStatus = "blocked";
            notes.push(error instanceof Error ? error.message : "Current row count could not be read.");
          }

          const destinationColumnSet = new Set(destinationColumns);
          const missingDestinationColumns = backupColumns.filter(
            (column) => !destinationColumnSet.has(column)
          );

          if (missingDestinationColumns.length > 0) {
            tableStatus = "blocked";
            notes.push(
              `${missingDestinationColumns.length} backup column${
                missingDestinationColumns.length === 1 ? " is" : "s are"
              } missing in the destination table.`
            );
          }

          if (backupTable.rowCountMismatch) {
            if (tableStatus === "ready") tableStatus = "review";
            notes.push("The backup declared row count does not match the readable rows.");
          }

          try {
            const primaryKeyValues = getBackupPrimaryKeyValues(backupTable.rows);
            const duplicates = await findExistingPrimaryKeys(tableName, primaryKeyValues);
            duplicatePrimaryKeyCount = duplicates.length;
            duplicatePrimaryKeySamples = duplicates.slice(0, 10);

            if (duplicates.length > 0 && input.mode === "merge") {
              if (tableStatus === "ready") tableStatus = "review";
              notes.push(
                `${duplicates.length} backup row${
                  duplicates.length === 1 ? " has" : "s have"
                } an ID already present in the destination. Merge mode will ignore or conflict with these rows.`
              );
            }
          } catch (error) {
            tableStatus = "blocked";
            notes.push(error instanceof Error ? error.message : "Primary-key conflicts could not be checked.");
          }

          return {
            key,
            label: entry.label,
            status: tableStatus,
            backupRows: backupTable.actualRows,
            currentRows,
            backupColumnCount: backupColumns.length,
            destinationColumnCount: destinationColumns.length,
            missingDestinationColumns,
            duplicatePrimaryKeyCount,
            duplicatePrimaryKeySamples,
            notes,
          };
        })
      );

      const blockedTables = preflightTables.filter((table) => table.status === "blocked");
      const reviewTables = preflightTables.filter((table) => table.status === "review");
      const duplicatePrimaryKeyCount = preflightTables.reduce(
        (total, table) => total + table.duplicatePrimaryKeyCount,
        0
      );

      for (const table of blockedTables) {
        errors.push(`${table.label}: ${table.notes.join(" ")}`);
      }

      for (const table of reviewTables) {
        warnings.push(`${table.label}: ${table.notes.join(" ")}`);
      }

      const status: BackupRestoreStatus =
        errors.length > 0 ? "blocked" : warnings.length > 0 ? "review" : "ready";

      const preflight = {
        checkedAt: new Date().toISOString(),
        status,
        mode: input.mode,
        summary: {
          selectedTableCount: preflightTables.length,
          selectedRows: preflightTables.reduce((total, table) => total + table.backupRows, 0),
          currentRows: preflightTables.reduce(
            (total, table) => total + (table.currentRows ?? 0),
            0
          ),
          blockedTables: blockedTables.length,
          reviewTables: reviewTables.length,
          duplicatePrimaryKeyCount,
          warnings: warnings.length,
          errors: errors.length,
        },
        errors,
        warnings,
        selectedTables: preflightTables,
        next:
          status === "blocked"
            ? [
                "Resolve blocked schema or backup issues before applying a restore.",
                "Run System Health Diagnostics to confirm destination schema readiness.",
                "Generate a fresh backup from the source system if the file appears incomplete.",
              ]
            : status === "review"
              ? [
                  "Review duplicate IDs and row-count warnings before applying restore.",
                  "Prefer replace-selected mode only on a fresh destination or after exporting a current backup.",
                  "Run the SQL script manually only after confirming the warnings are acceptable.",
                ]
              : [
                  "Export a current destination backup before applying restore.",
                  "Use the generated SQL script or future apply workflow.",
                  "Run diagnostics immediately after restore.",
                ],
      };

      await logAuditEvent(
        ctx.user.id,
        "IMPORT",
        "backupRestorePreflight",
        0,
        {
          mode: input.mode,
          status,
          selectedTableCount: preflightTables.length,
          selectedRows: preflight.summary.selectedRows,
          duplicatePrimaryKeyCount,
          errors,
          warnings,
        },
        undefined,
        undefined,
        status === "blocked" ? "Failed" : "Success",
        status === "blocked" ? errors.join(" ") : undefined
      );

      return preflight;
    }),

  backupRestoreApply: protectedProcedure
    .input(backupRestoreApplyInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can apply a backup restore.",
        });
      }

      if (input.confirmation.trim() !== RESTORE_CONFIRMATION_PHRASE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Type ${RESTORE_CONFIRMATION_PHRASE} to apply a restore.`,
        });
      }

      if (input.mode !== "merge") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Direct restore apply currently supports merge mode only. Use the exported SQL script for replace-selected restores.",
        });
      }

      const parsed = parseBackupTables(input.backup);
      const selectedTableKeys = Array.from(new Set(input.selectedTables));
      const errors = [...parsed.errors];
      const warnings = [...parsed.warnings];
      const backupTablesByKey = new Map(parsed.tables.map((table) => [table.key, table]));

      const unknownSelectedTables = selectedTableKeys.filter(
        (key) => !BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"])
      );
      if (unknownSelectedTables.length > 0) {
        errors.push(`Unknown restore table selection: ${unknownSelectedTables.join(", ")}.`);
      }

      const selectedMissingFromBackup = selectedTableKeys.filter((key) => !backupTablesByKey.has(key));
      if (selectedMissingFromBackup.length > 0) {
        errors.push(
          `Selected table${selectedMissingFromBackup.length === 1 ? " is" : "s are"} missing from the backup: ${selectedMissingFromBackup.join(", ")}.`
        );
      }

      const validSelectedKeys = selectedTableKeys.filter(
        (key): key is (typeof BACKUP_TABLES)[number]["key"] =>
          BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"]) &&
          backupTablesByKey.has(key)
      );

      const preparedTables = await Promise.all(
        validSelectedKeys.map(async (key) => {
          const entry = BACKUP_TABLE_BY_KEY.get(key)!;
          const backupTable = backupTablesByKey.get(key)!;
          const tableName = getBackupSqlTableName(key);
          const backupColumns = getBackupRowColumns(backupTable.rows);
          const destinationColumns = await getDestinationColumns(tableName);
          const destinationColumnSet = new Set(destinationColumns);
          const missingDestinationColumns = backupColumns.filter(
            (column) => !destinationColumnSet.has(column)
          );

          if (backupTable.rowCountMismatch) {
            errors.push(`${entry.label}: backup row-count mismatch must be resolved before direct apply.`);
          }

          if (destinationColumns.length === 0) {
            errors.push(`${entry.label}: destination table does not exist or has no readable columns.`);
          }

          if (missingDestinationColumns.length > 0) {
            errors.push(
              `${entry.label}: destination table is missing columns ${missingDestinationColumns.join(", ")}.`
            );
          }

          const primaryKeyValues = getBackupPrimaryKeyValues(backupTable.rows);
          const duplicates = await findExistingPrimaryKeys(tableName, primaryKeyValues);
          if (duplicates.length > 0) {
            warnings.push(
              `${entry.label}: ${duplicates.length} row${duplicates.length === 1 ? "" : "s"} already exist and will be skipped in merge mode.`
            );
          }

          return {
            key,
            label: entry.label,
            tableName,
            rows: backupTable.rows,
            columns: backupColumns,
            duplicatePrimaryKeyCount: duplicates.length,
          };
        })
      );

      if (errors.length > 0) {
        await logAuditEvent(
          ctx.user.id,
          "IMPORT",
          "backupRestoreApply",
          0,
          {
            mode: input.mode,
            selectedTableCount: selectedTableKeys.length,
            status: "blocked",
            errors,
            warnings,
          },
          undefined,
          undefined,
          "Failed",
          errors.join(" ")
        );

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errors.join(" "),
        });
      }

      const safetySnapshot = await buildSafetySnapshot(ctx.user);
      const appliedTables: Array<{
        key: string;
        label: string;
        attemptedRows: number;
        insertedRows: number;
        skippedRows: number;
        duplicatePrimaryKeyCount: number;
      }> = [];
      let attemptedRows = 0;
      let insertedRows = 0;

      const db = getDb();

      try {
        await (db as any).transaction(async (tx: any) => {
          for (const table of preparedTables) {
            let tableInsertedRows = 0;

            for (const row of table.rows) {
              if (!isRecord(row)) {
                throw new Error(`${table.label}: backup row is not a valid object.`);
              }

              const statement = buildRestoreInsertStatement(
                table.tableName,
                table.columns,
                row,
                "merge"
              );
              const result = await tx.execute(sql.raw(statement));
              const affectedRows = getAffectedRows(result);
              tableInsertedRows += affectedRows;
              insertedRows += affectedRows;
              attemptedRows += 1;
            }

            appliedTables.push({
              key: table.key,
              label: table.label,
              attemptedRows: table.rows.length,
              insertedRows: tableInsertedRows,
              skippedRows: Math.max(0, table.rows.length - tableInsertedRows),
              duplicatePrimaryKeyCount: table.duplicatePrimaryKeyCount,
            });
          }
        });
      } catch (error) {
        const message = normaliseErrorMessage(error);
        await logAuditEvent(
          ctx.user.id,
          "IMPORT",
          "backupRestoreApply",
          0,
          {
            mode: input.mode,
            attemptedRows,
            insertedRows,
            selectedTableCount: preparedTables.length,
            error: message,
          },
          undefined,
          undefined,
          "Failed",
          message
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message,
        });
      }

      const skippedRows = Math.max(0, attemptedRows - insertedRows);
      const appliedAt = new Date().toISOString();

      await logAuditEvent(
        ctx.user.id,
        "IMPORT",
        "backupRestoreApply",
        0,
        {
          mode: input.mode,
          selectedTableCount: appliedTables.length,
          attemptedRows,
          insertedRows,
          skippedRows,
          warnings,
        },
        undefined,
        undefined,
        "Success"
      );

      return {
        appliedAt,
        mode: input.mode,
        requiredConfirmation: RESTORE_CONFIRMATION_PHRASE,
        safetySnapshot,
        summary: {
          selectedTableCount: appliedTables.length,
          attemptedRows,
          insertedRows,
          skippedRows,
          warnings: warnings.length,
        },
        warnings,
        tables: appliedTables,
      };
    }),

  backupRestoreScript: protectedProcedure
    .input(backupRestorePlanInput)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Super Admin can export a backup restore script.",
        });
      }

      const parsed = parseBackupTables(input.backup);
      const selectedTableKeys = Array.from(new Set(input.selectedTables));
      const errors = [...parsed.errors];
      const warnings = [...parsed.warnings];
      const backupTablesByKey = new Map(parsed.tables.map((table) => [table.key, table]));

      const unknownSelectedTables = selectedTableKeys.filter(
        (key) => !BACKUP_TABLE_BY_KEY.has(key as (typeof BACKUP_TABLES)[number]["key"])
      );
      if (unknownSelectedTables.length > 0) {
        errors.push(`Unknown restore table selection: ${unknownSelectedTables.join(", ")}.`);
      }

      const selectedMissingFromBackup = selectedTableKeys.filter((key) => !backupTablesByKey.has(key));
      if (selectedMissingFromBackup.length > 0) {
        errors.push(
          `Selected table${selectedMissingFromBackup.length === 1 ? " is" : "s are"} missing from the backup: ${selectedMissingFromBackup.join(", ")}.`
        );
      }

      if (errors.length > 0) {
        await logAuditEvent(
          ctx.user.id,
          "EXPORT",
          "backupRestoreScript",
          0,
          {
            mode: input.mode,
            selectedTableCount: selectedTableKeys.length,
            errors,
          },
          undefined,
          undefined,
          "Failed",
          errors.join(" ")
        );

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: errors.join(" "),
        });
      }

      const selectedTables = selectedTableKeys
        .map((key) => backupTablesByKey.get(key))
        .filter((table): table is ParsedBackupTable => Boolean(table));
      const totalRows = selectedTables.reduce((total, table) => total + table.actualRows, 0);
      const generatedAt = new Date().toISOString();
      const script = buildRestoreSqlScript({
        backupGeneratedAt: parsed.generatedAt,
        generatedAt,
        generatedBy: `${ctx.user.name || "Super Admin"} <${ctx.user.email || "unknown"}>`,
        mode: input.mode,
        warnings,
        selectedTables,
      });

      await logAuditEvent(
        ctx.user.id,
        "EXPORT",
        "backupRestoreScript",
        0,
        {
          mode: input.mode,
          selectedTableCount: selectedTables.length,
          selectedRows: totalRows,
          warnings,
        },
        undefined,
        undefined,
        "Success"
      );

      return {
        generatedAt,
        fileName: `textpoint-restore-${generatedAt.replace(/[:.]/g, "-")}.sql`,
        mode: input.mode,
        summary: {
          selectedTableCount: selectedTables.length,
          selectedRows: totalRows,
          warnings: warnings.length,
        },
        warnings,
        script,
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
