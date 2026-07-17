import { and, eq, inArray, sql } from "drizzle-orm";
import {
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  users,
  students,
  leads,
  companies,
  contacts,
  leadActivities,
  courses,
  courseSchedules,
  enrollments,
  attendance,
  assessments,
  certificates,
  levelIIIClients,
  levelIIIActivities,
  levelIIITechnicians,
  levelIIITechnicianCertificates,
  levelIIITechnicianCertificateExports,
  portalClientUsers,
  portalClientReminderSettings,
  portalRequirementDefinitions,
  portalTechnicianRequirements,
  portalRequirementDocuments,
  portalRequirementSourceReferences,
  portalClientDocuments,
  portalClientComments,
  portalClientResources,
  portalApprovalRequests,
  portalClientBranches,
  portalClientUserBranches,
  portalServiceDefinitions,
  portalServiceRequests,
  portalAssessmentGuides,
  levelIIIAssessments,
  levelIIIEquipment,
  levelIIISpecimens,
  equipment,
  equipmentDocuments,
  equipmentLoans,
  specimens,
  specimenDocuments,
  specimenLoans,
  specimenTypes,
  kpiTemplates,
  kpiQuestions,
  kpiRecords,
  kpiAnswers,
  lecturers,
  methods,
  trainingOfferings,
  documents,
  plannerEntries,
  sharedPlannerEvents,
  plannerTimesheetProfiles,
  plannerTimesheetDepartmentCoverageSettings,
  plannerTimesheetOptions,
  plannerTimesheetEntries,
  plannerTimesheetTemplates,
  plannerTimesheetHolidays,
  plannerTimesheetMonthStatuses,
  plannerTimesheetLeaveOverrideReviews,
  importLogs,
  reports,
  qualityActions,
  qualityAudits,
  managementReviews,
  externalProviders,
  branches,
  moduleAccess,
  type User,
} from "../drizzle/schema";
import { db, getDb } from "./_core/db";

export { db, getDb };

import { ENV } from "./_core/env";
// Domain modules
import * as leadsDb from "./leads/db";
import * as studentsDb from "./students/db";
import { suggestMethodColor } from "../shared/methodColors";
import { buildLevelIIIDocumentAutomationRules } from "../shared/levelIIIDocumentAutomation";
import {
  canExportLevelIIITechnicianCertificate,
  hasOverlappingLevelIIITechnicianCertificateScope,
  resolveLevelIIITechnicianCertificateValidUntil as resolveSharedLevelIIICertificateValidUntil,
  shouldResetLevelIIITechnicianCertificateApprovalOnChange,
} from "../shared/levelIIICertificateWorkflow";
import { storagePut, storageResolveUrl } from "./storage";
import {
  cleanRuleStringArray,
  findDuplicatePortalSourceReferenceByPath,
  resolveAllowedClientDocumentLabel,
} from "./clientPortalRules";
import {
  buildNextLevelIIITechnicianCertificateNumber,
  isLevelIIITechnicianCertificateNumberFormat,
  normaliseLevelIIITechnicianCertificateNumber,
} from "./levelIIICertificateRules";
import {
  expandCalendarEvents,
  type CalendarFeedEvent,
  type CalendarFeedOccurrence,
  type CalendarFeedScope,
  type CalendarRecurrence,
} from "./calendarFeeds";

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

// (db and getDb are now in ./_core/db.ts)

export const USER_ROLE_ENUM_SQL = "ENUM('user','admin','super_admin')";

export function userRoleColumnSupportsSuperAdmin(columnType: unknown) {
  return typeof columnType === "string" && columnType.toLowerCase().includes("'super_admin'");
}

export function buildUserRoleEnumRepairSql() {
  return `ALTER TABLE \`users\` MODIFY COLUMN \`role\` ${USER_ROLE_ENUM_SQL} NOT NULL DEFAULT 'user'`;
}

function getFirstSqlRow(value: unknown) {
  if (Array.isArray(value)) {
    if (Array.isArray(value[0])) {
      return value[0][0] as Record<string, unknown> | undefined;
    }
    return value[0] as Record<string, unknown> | undefined;
  }
  return undefined;
}

function getDbSqlRows<T extends Record<string, unknown> = Record<string, unknown>>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows = Array.isArray(value[0]) ? value[0] : value;
  return rows.filter((row): row is T => typeof row === "object" && row !== null && !Array.isArray(row));
}

// Previously: ensureRuntimeColumn / ensureRuntimeTable performed unsafe DDL via sql.raw()
// These were removed â€” all columns and tables are defined in drizzle/schema.ts and must
// be managed through proper Migrations. If a column is missing, run the latest migration.
async function ensureRuntimeColumn(
  _tableName: string,
  _columnName: string,
  _definition: string
) {
  // No-op: columns are managed via drizzle migrations only
}

async function ensureRuntimeTable(_tableName: string, _createSql: string) {
  // No-op: tables are managed via drizzle migrations only
}

function getPortalRequirementStatusPriority(status: unknown) {
  const priority: Record<PortalRequirementStatus, number> = {
    current: 5,
    no_expiry: 5,
    pending_review: 4,
    expiring: 3,
    expired: 2,
    missing: 1,
  };
  return priority[status as PortalRequirementStatus] ?? 0;
}

async function mergePortalTechnicianRequirementRecords(
  recordIds: number[],
  preferredDefinitionId?: number | null
) {
  const uniqueRecordIds = Array.from(
    new Set(recordIds.filter((value) => Number.isFinite(value) && value > 0))
  );
  if (uniqueRecordIds.length <= 1) {
    return;
  }

  const duplicateRecords = await db
    .select()
    .from(portalTechnicianRequirements)
    .where(inArray(portalTechnicianRequirements.id, uniqueRecordIds));
  if (duplicateRecords.length <= 1) {
    return;
  }

  const documentCountsResult = await db.execute(sql`
    SELECT technicianRequirementId, COUNT(*) AS itemCount
    FROM portalRequirementDocuments
    WHERE technicianRequirementId IN (${sql.join(
      uniqueRecordIds.map((id) => sql`${id}`),
      sql`, `
    )})
    GROUP BY technicianRequirementId
  `);
  const documentCounts = new Map(
    getDbSqlRows<Record<string, unknown>>(documentCountsResult).map((row) => [
      Number(row.technicianRequirementId ?? 0),
      Number(row.itemCount ?? 0),
    ])
  );

  const sourceReferenceCountsResult = await db.execute(sql`
    SELECT technicianRequirementId, COUNT(*) AS itemCount
    FROM portalRequirementSourceReferences
    WHERE technicianRequirementId IN (${sql.join(
      uniqueRecordIds.map((id) => sql`${id}`),
      sql`, `
    )})
    GROUP BY technicianRequirementId
  `);
  const sourceReferenceCounts = new Map(
    getDbSqlRows<Record<string, unknown>>(sourceReferenceCountsResult).map((row) => [
      Number(row.technicianRequirementId ?? 0),
      Number(row.itemCount ?? 0),
    ])
  );

  const rankedRecords = duplicateRecords
    .slice()
    .sort((left, right) => {
      const leftPreferred = preferredDefinitionId && left.definitionId === preferredDefinitionId ? 1 : 0;
      const rightPreferred =
        preferredDefinitionId && right.definitionId === preferredDefinitionId ? 1 : 0;
      if (leftPreferred !== rightPreferred) {
        return rightPreferred - leftPreferred;
      }

      const leftDocumentCount = documentCounts.get(left.id) ?? 0;
      const rightDocumentCount = documentCounts.get(right.id) ?? 0;
      if (leftDocumentCount !== rightDocumentCount) {
        return rightDocumentCount - leftDocumentCount;
      }

      const leftSourceReferenceCount = sourceReferenceCounts.get(left.id) ?? 0;
      const rightSourceReferenceCount = sourceReferenceCounts.get(right.id) ?? 0;
      if (leftSourceReferenceCount !== rightSourceReferenceCount) {
        return rightSourceReferenceCount - leftSourceReferenceCount;
      }

      const leftStatusPriority = getPortalRequirementStatusPriority(left.status);
      const rightStatusPriority = getPortalRequirementStatusPriority(right.status);
      if (leftStatusPriority !== rightStatusPriority) {
        return rightStatusPriority - leftStatusPriority;
      }

      const leftUpdatedAt = new Date(left.updatedAt).getTime() || 0;
      const rightUpdatedAt = new Date(right.updatedAt).getTime() || 0;
      if (leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      return right.id - left.id;
    });

  const canonicalRecord = rankedRecords[0];
  if (!canonicalRecord) {
    return;
  }

  const duplicateIdsToRemove = rankedRecords
    .slice(1)
    .map((record) => record.id)
    .filter((id) => id !== canonicalRecord.id);
  if (duplicateIdsToRemove.length === 0) {
    if (preferredDefinitionId && canonicalRecord.definitionId !== preferredDefinitionId) {
      await db
        .update(portalTechnicianRequirements)
        .set({ definitionId: preferredDefinitionId })
        .where(eq(portalTechnicianRequirements.id, canonicalRecord.id));
    }
    return;
  }

  await db
    .update(portalRequirementDocuments)
    .set({ technicianRequirementId: canonicalRecord.id })
    .where(inArray(portalRequirementDocuments.technicianRequirementId, duplicateIdsToRemove));

  await db
    .update(portalRequirementSourceReferences)
    .set({ technicianRequirementId: canonicalRecord.id })
    .where(
      inArray(portalRequirementSourceReferences.technicianRequirementId, duplicateIdsToRemove)
    );

  const mergedRecord = rankedRecords.reduce<{
    status: NonNullable<typeof canonicalRecord.status>;
    issuedAt: Date | string | null;
    validUntil: Date | string | null;
    notes: string | null;
    customFieldValues: unknown;
    uploadedByUserId: number | null;
  }>(
    (best, record) => ({
      status:
        getPortalRequirementStatusPriority(record.status) >
        getPortalRequirementStatusPriority(best.status)
          ? record.status
          : best.status,
      issuedAt: best.issuedAt ?? record.issuedAt ?? null,
      validUntil: best.validUntil ?? record.validUntil ?? null,
      notes: best.notes ?? record.notes ?? null,
      customFieldValues:
        Object.keys((best.customFieldValues as Record<string, unknown> | null) ?? {}).length > 0
          ? best.customFieldValues
          : record.customFieldValues,
      uploadedByUserId: best.uploadedByUserId ?? record.uploadedByUserId ?? null,
    }),
    {
      status: canonicalRecord.status,
      issuedAt: canonicalRecord.issuedAt ?? null,
      validUntil: canonicalRecord.validUntil ?? null,
      notes: canonicalRecord.notes ?? null,
      customFieldValues: canonicalRecord.customFieldValues ?? null,
      uploadedByUserId: canonicalRecord.uploadedByUserId ?? null,
    }
  );

  await db
    .update(portalTechnicianRequirements)
    .set({
      definitionId:
        preferredDefinitionId && preferredDefinitionId > 0
          ? preferredDefinitionId
          : canonicalRecord.definitionId,
      status: mergedRecord.status,
      issuedAt: mergedRecord.issuedAt as Date | null,
      validUntil: mergedRecord.validUntil as Date | null,
      notes: mergedRecord.notes,
      customFieldValues: mergedRecord.customFieldValues,
      uploadedByUserId: mergedRecord.uploadedByUserId,
    })
    .where(eq(portalTechnicianRequirements.id, canonicalRecord.id));

  await db
    .delete(portalTechnicianRequirements)
    .where(inArray(portalTechnicianRequirements.id, duplicateIdsToRemove));
}

const _portalTechnicianUniquenessDone = new Set<string>();

async function ensurePortalTechnicianRequirementUniqueness() {
  const dedupeKey = "portalTechnicianRequirements.duplicate_repair";
  if (_portalTechnicianUniquenessDone.has(dedupeKey)) return;

  const duplicateGroupsResult = await db.execute(sql`
    SELECT
      technicianId,
      definitionId,
      GROUP_CONCAT(id ORDER BY updatedAt DESC, createdAt DESC, id DESC) AS duplicateIds,
      COUNT(*) AS duplicateCount
    FROM portalTechnicianRequirements
    GROUP BY technicianId, definitionId
    HAVING COUNT(*) > 1
  `);
  const duplicateGroups = getDbSqlRows<Record<string, unknown>>(duplicateGroupsResult);

  for (const group of duplicateGroups) {
    const recordIds = String(group.duplicateIds ?? "")
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isFinite(value) && value > 0);
    if (recordIds.length <= 1) continue;

    await mergePortalTechnicianRequirementRecords(recordIds);
  }

  const uniqueKeyResult = await db.execute(sql`
    SELECT COUNT(*) AS indexCount
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'portalTechnicianRequirements'
      AND index_name = 'portalTechnicianRequirements_unique'
  `);
  const uniqueKeyCount = Number(getFirstSqlRow(uniqueKeyResult)?.indexCount ?? 0);
  if (uniqueKeyCount === 0) {
    await db.execute(
      sql.raw(
        "ALTER TABLE `portalTechnicianRequirements` ADD UNIQUE KEY `portalTechnicianRequirements_unique` (`technicianId`, `definitionId`)"
      )
    );
  }

  _portalTechnicianUniquenessDone.add(dedupeKey);
}

const _portalDefinitionUniquenessDone = new Set<string>();

async function ensurePortalRequirementDefinitionUniqueness() {
  const dedupeKey = "portalRequirementDefinitions.duplicate_repair";
  if (_portalDefinitionUniquenessDone.has(dedupeKey)) return;

  const definitions = await db.select().from(portalRequirementDefinitions);
  const groupedDefinitions = new Map<string, typeof definitions>();
  definitions.forEach((definition) => {
    const key = `${definition.clientId}:${definition.name.trim().toLowerCase()}`;
    const list = groupedDefinitions.get(key) ?? [];
    list.push(definition);
    groupedDefinitions.set(key, list);
  });

  for (const group of groupedDefinitions.values()) {
    if (group.length <= 1) continue;

    const requirementCountsResult = await db.execute(sql`
      SELECT definitionId, COUNT(*) AS itemCount
      FROM portalTechnicianRequirements
      WHERE definitionId IN (${sql.join(
        group.map((definition) => sql`${definition.id}`),
        sql`, `
      )})
      GROUP BY definitionId
    `);
    const requirementCounts = new Map(
      getDbSqlRows<Record<string, unknown>>(requirementCountsResult).map((row) => [
        Number(row.definitionId ?? 0),
        Number(row.itemCount ?? 0),
      ])
    );

    const rankedDefinitions = group.slice().sort((left, right) => {
      const leftRequirementCount = requirementCounts.get(left.id) ?? 0;
      const rightRequirementCount = requirementCounts.get(right.id) ?? 0;
      if (leftRequirementCount !== rightRequirementCount) {
        return rightRequirementCount - leftRequirementCount;
      }

      if (left.active !== right.active) {
        return Number(right.active) - Number(left.active);
      }

      if (left.isRequired !== right.isRequired) {
        return Number(right.isRequired) - Number(left.isRequired);
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      const leftUpdatedAt = new Date(left.updatedAt).getTime() || 0;
      const rightUpdatedAt = new Date(right.updatedAt).getTime() || 0;
      if (leftUpdatedAt !== rightUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      return left.id - right.id;
    });

    const canonicalDefinition = rankedDefinitions[0];
    if (!canonicalDefinition) continue;

    const duplicateDefinitions = rankedDefinitions.slice(1);
    const duplicateDefinitionIds = duplicateDefinitions.map((definition) => definition.id);
    if (duplicateDefinitionIds.length === 0) continue;

    const groupedRequirementsResult = await db.execute(sql`
      SELECT technicianId, GROUP_CONCAT(id ORDER BY updatedAt DESC, createdAt DESC, id DESC) AS recordIds
      FROM portalTechnicianRequirements
      WHERE definitionId IN (${sql.join(
        rankedDefinitions.map((definition) => sql`${definition.id}`),
        sql`, `
      )})
      GROUP BY technicianId
    `);
    const groupedRequirements = getDbSqlRows<Record<string, unknown>>(groupedRequirementsResult);
    for (const row of groupedRequirements) {
      const requirementIds = String(row.recordIds ?? "")
        .split(",")
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (requirementIds.length === 0) continue;
      await mergePortalTechnicianRequirementRecords(requirementIds, canonicalDefinition.id);
    }

    await db
      .update(portalTechnicianRequirements)
      .set({ definitionId: canonicalDefinition.id })
      .where(inArray(portalTechnicianRequirements.definitionId, duplicateDefinitionIds));

    const mergedDefinition = rankedDefinitions.reduce<{
      category: string;
      description: string | null;
      validityDays: number | null;
      reminderDays: number;
      isRequired: boolean;
      active: boolean;
      sortOrder: number;
      customFields: unknown;
    }>(
      (best, definition) => ({
        category:
          String(best.category ?? "").trim() ||
          cleanRequiredText(definition.category ?? "General", "Category"),
        description: best.description ?? cleanOptionalText(definition.description),
        validityDays: best.validityDays ?? definition.validityDays ?? null,
        reminderDays:
          Number.isFinite(Number(best.reminderDays)) && Number(best.reminderDays) > 0
            ? best.reminderDays
            : definition.reminderDays,
        isRequired: best.isRequired || definition.isRequired,
        active: best.active || definition.active,
        sortOrder: Math.min(best.sortOrder, definition.sortOrder),
        customFields:
          (Array.isArray(best.customFields) && best.customFields.length > 0) ||
          (best.customFields &&
            typeof best.customFields === "object" &&
            Object.keys(best.customFields as Record<string, unknown>).length > 0)
            ? best.customFields
            : definition.customFields,
      }),
      {
        category: canonicalDefinition.category,
        description: canonicalDefinition.description ?? null,
        validityDays: canonicalDefinition.validityDays ?? null,
        reminderDays: canonicalDefinition.reminderDays,
        isRequired: canonicalDefinition.isRequired,
        active: canonicalDefinition.active,
        sortOrder: canonicalDefinition.sortOrder,
        customFields: canonicalDefinition.customFields ?? null,
      }
    );

    await db
      .update(portalRequirementDefinitions)
      .set({
        category: mergedDefinition.category,
        description: mergedDefinition.description,
        validityDays: mergedDefinition.validityDays,
        reminderDays: mergedDefinition.reminderDays,
        isRequired: mergedDefinition.isRequired,
        active: mergedDefinition.active,
        sortOrder: mergedDefinition.sortOrder,
        customFields: normalisePortalRequirementCustomFields(mergedDefinition.customFields),
      })
      .where(eq(portalRequirementDefinitions.id, canonicalDefinition.id));

    await db
      .delete(portalRequirementDefinitions)
      .where(inArray(portalRequirementDefinitions.id, duplicateDefinitionIds));
  }

  const uniqueKeyResult = await db.execute(sql`
    SELECT COUNT(*) AS indexCount
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = 'portalRequirementDefinitions'
      AND index_name = 'portalRequirementDefinitions_client_name_unique'
  `);
  const uniqueKeyCount = Number(getFirstSqlRow(uniqueKeyResult)?.indexCount ?? 0);
  if (uniqueKeyCount === 0) {
    try {
      await db.execute(
        sql.raw(
          "ALTER TABLE `portalRequirementDefinitions` ADD UNIQUE KEY `portalRequirementDefinitions_client_name_unique` (`clientId`, `name`)"
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (!message.includes("duplicate key name") && !message.includes("er_dup_keyname")) {
        throw error;
      }
    }
  }

  _portalDefinitionUniquenessDone.add(dedupeKey);
}

// ---------------------------------------------------------------------------
// Runtime column helpers (no-ops â€” columns managed via migrations)
// ---------------------------------------------------------------------------

async function ensureUserRuntimeColumns() {
  // No-op
}

async function ensureMethodRuntimeColumns() {
  // No-op
}

// Auth module functions â€” imported here so they're available locally in db.ts,
// then re-exported for consumers. This avoids the "cannot find name" errors
// that happen with `export { x } from "./auth/db"` syntax.
import {
  getOrCreateLocalDevUser,
  getUserByAuthId,
  getUserByEmail,
  getUserById,
  updateUser,
  getAllUsers,
  createAppUser,
  deleteAppUser,
  upsertAppUser,
  updateAppUserWithAuth,
  hasPasswordForUser,
  signInWithPassword,
  signOutSession,
  getUserBySessionToken,
  setUserLoginEnabled,
  setUserRole,
  requestPasswordReset,
  resetPasswordWithToken,
  changeUserPassword,
} from "./auth/db";
export {
  getOrCreateLocalDevUser,
  getUserByAuthId,
  getUserByEmail,
  getUserById,
  updateUser,
  getAllUsers,
  createAppUser,
  deleteAppUser,
  upsertAppUser,
  updateAppUserWithAuth,
  hasPasswordForUser,
  signInWithPassword,
  signOutSession,
  getUserBySessionToken,
  setUserLoginEnabled,
  setUserRole,
  requestPasswordReset,
  resetPasswordWithToken,
  changeUserPassword,
};

function generateCalendarFeedToken() {
  return randomBytes(24).toString("hex");
}

export async function getUserByCalendarFeedToken(token: string): Promise<User | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.calendarFeedToken, trimmed))
    .limit(1);
  return result[0] ?? null;
}

export async function ensureUserCalendarFeedToken(userId: number) {
  const existing = await getUserById(userId);
  if (!existing) throw new Error("User not found.");
  if (existing.calendarFeedToken?.trim()) return existing.calendarFeedToken.trim();

  const token = generateCalendarFeedToken();
  await updateUser(userId, { calendarFeedToken: token });
  return token;
}

export async function rotateUserCalendarFeedToken(userId: number) {
  const existing = await getUserById(userId);
  if (!existing) throw new Error("User not found.");

  const token = generateCalendarFeedToken();
  await updateUser(userId, { calendarFeedToken: token });
  return token;
}

export type UnifiedCalendarSourceType =
  | "private_planner"
  | "shared_planner"
  | "schedule"
  | "lead_follow_up"
  | "lead_activity"
  | "level_iii"
  | "quality";

export type UnifiedCalendarEvent = CalendarFeedEvent & {
  sourceType: UnifiedCalendarSourceType;
  sourceLabel: string;
  sourceUrl: string | null;
  branchId: number | null;
  branchName: string | null;
  statusLabel: string | null;
};

export type UnifiedCalendarOccurrence = CalendarFeedOccurrence<UnifiedCalendarEvent>;

export async function getUserModuleAccess(userId: number) {
  try {
    return await db
      .select()
      .from(moduleAccess)
      .where(eq(moduleAccess.userId, userId));
  } catch (error) {
    return [];
  }
}

export async function saveUserModuleAccess(
  userId: number,
  accessRows: Array<{
    module: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>
) {
  for (const accessRow of accessRows) {
    const existing = await db
      .select()
      .from(moduleAccess)
      .where(
        and(
          eq(moduleAccess.userId, userId),
          eq(moduleAccess.module, accessRow.module)
        )
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(moduleAccess)
        .set({
          canView: accessRow.canView,
          canCreate: accessRow.canCreate,
          canEdit: accessRow.canEdit,
          canDelete: accessRow.canDelete,
        })
        .where(eq(moduleAccess.id, existing[0].id));
      continue;
    }

    await db.insert(moduleAccess).values({
      userId,
      module: accessRow.module,
      canView: accessRow.canView,
      canCreate: accessRow.canCreate,
      canEdit: accessRow.canEdit,
      canDelete: accessRow.canDelete,
    });
  }

  return getUserModuleAccess(userId);
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Students â€” delegated to server/students/db.ts
// ---------------------------------------------------------------------------

export const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  findStudentByIdentity,
} = studentsDb;

// ---------------------------------------------------------------------------
// Leads â€” delegated to server/leads/db.ts
// ---------------------------------------------------------------------------

export const {
  getAllLeads,
  getLeadById,
  findDuplicateLead,
  findLeadByIdentity,
  createLead,
  updateLead,
  deleteLead,
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getContactsForCompany,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getLeadActivities,
  createLeadActivity,
  updateLeadActivity,
  deleteLeadActivity,
  getLeadReminders,
} = leadsDb;

export async function findDuplicateStudent(data: {
  idNumber?: string;
  passportNumber?: string;
}) {
  const allStudents = await db.select().from(students);

  return (
    allStudents.find((student) => {
      if (
        data.idNumber &&
        student.idNumber &&
        data.idNumber === student.idNumber
      )
        return true;
      if (
        data.passportNumber &&
        student.passportNumber &&
        data.passportNumber === student.passportNumber
      )
        return true;
      return false;
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// Shared date helpers (used across domains)
// ---------------------------------------------------------------------------

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export async function convertLeadToStudent(leadId: number) {
  const lead = await leadsDb.getLeadById(leadId);

  if (!lead) {
    throw new Error("Lead not found");
  }

  const existingStudent = await findStudentByIdentity({
    idNumber: lead.idNumber ?? undefined,
    passportNumber: lead.passportNumber ?? undefined,
  });

  if (existingStudent) {
    throw new Error("Student already exists for this lead");
  }

  await createStudent({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    idNumber: lead.idNumber ?? undefined,
    passportNumber: lead.passportNumber ?? undefined,
    interestType: lead.interestType ?? undefined,
    isCurrentPcnHolder: lead.isCurrentPcnHolder ?? false,
    bindtProductCompleted: lead.bindtProductCompleted ?? false,
    pcnNumber: lead.pcnNumber ?? undefined,
    active: true,
  } satisfies Partial<typeof students.$inferInsert> as typeof students.$inferInsert);

  await leadsDb.updateLead(leadId, { status: "Converted" });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getAllCourseSchedules,
  getCourseScheduleById,
  findLecturerScheduleConflict,
  normalizeScheduleExamDates,
  normalizeCourseStartPackConfig,
  updateCourseSchedule,
  createCourseSchedule,
  getAllEnrollments,
  getEnrollmentsByStudent,
  getEnrollmentsByCourseSchedule,
  getScheduleSeatInfo,
  createEnrollment,
  updateEnrollment,
  getAttendanceByEnrollment,
  getAttendanceByCourseSchedule,
  createAttendance,
  updateAttendance,
  markAttendanceForSchedule,
  getAllAssessments,
  getAssessmentsByEnrollment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  getAllCertificates,
  getCertificatesByEnrollment,
  getCertificatesByStudent,
  createCertificate,
  updateCertificate,
  deleteCertificate,
} = studentsDb;

// ---------------------------------------------------------------------------
// Level III Services
// ---------------------------------------------------------------------------

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function cleanRequiredText(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

function parseOptionalDateValue(
  value?: Date | string | null,
  errorMessage = "One or more dates are invalid."
) {
  if (!value) return null;

  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(errorMessage);
  }

  return startOfDay(date);
}

function parseOptionalLevelIIIDate(value?: Date | string | null) {
  return parseOptionalDateValue(value, "One or more Level III dates are invalid.");
}

function addLevelIIIDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return startOfDay(next);
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return startOfDay(next);
}

function calculateNextVisitFromCadence(
  cadence: "Weekly" | "Monthly" | "Six Monthly",
  fromDate: Date
) {
  switch (cadence) {
    case "Weekly":
      return addLevelIIIDays(fromDate, 7);
    case "Six Monthly":
      return addMonths(fromDate, 6);
    case "Monthly":
    default:
      return addMonths(fromDate, 1);
  }
}

type PortalAccessLevel = "viewer" | "editor" | "manager";
type PortalRequirementStatus =
  | "missing"
  | "current"
  | "no_expiry"
  | "expiring"
  | "expired"
  | "pending_review";
type PortalClientDocumentStatus = "active" | "archived" | "superseded";
type PortalClientCommentRequestType = "general_comment" | "contact_request" | "suggestion";
type PortalClientCommentStatus = "open" | "acknowledged" | "closed";
type PortalClientResourceType = "file" | "link";
type PortalServiceRequestStatus =
  | "submitted"
  | "in_review"
  | "planned"
  | "scheduled"
  | "completed"
  | "closed";
type LevelIIIAssessmentMethodLevel = {
  method: string;
  level: string;
};
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

type LevelIIITechnicianCertificateStoredFileInput = {
  clientId: number;
  technicianName: string;
  certificateNumber: string;
  fileDataUrl: string;
  fileNameHint?: string | null;
};
const LEVEL_III_IMPORT_CORE_LABEL_ALIASES: Record<string, string[]> = {
  ID: ["ID", "ID COPY", "TECHNICIAN ID COPY"],
  CV: ["CV", "CURRICULUM VITAE"],
  "LOG HOURS": ["LOG HOURS", "LOGBOOK", "LOG BOOK"],
  "EYE TEST": ["EYE TEST", "EYE EXAM"],
  "CODE OF ETHICS": ["CODE OF ETHICS", "COD OF ETHICS"],
};
type PortalClientReminderSettings = {
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
type LinkedBranchSourceInfo = {
  headOfficeClientId: number;
  headOfficeName: string;
  branchId: number;
  branchName: string;
};
type PortalApprovalRequestPayload = {
  action: PortalApprovalAction;
  data?: Record<string, unknown> | null;
  previousData?: Record<string, unknown> | null;
  storedFile?: PortalStoredFileReference | null;
};
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
  fileKey: string | null;
  contentType: string | null;
  classifiedLabel?: string | null;
  storagePath?: string | null;
  suggestedFileName?: string | null;
  linkedRequirementDefinitionId?: number | null;
  linkedRequirementDefinitionName?: string | null;
};
type PortalServiceRequestMetadata = Record<string, unknown> & {
  supportingDocuments: PortalServiceRequestSupportingDocument[];
  clientVisibleUpdate: string | null;
  internalOwner: string | null;
  plannedAction: string | null;
  confirmedDate: string | null;
  linkedActivityId: number | null;
};
type PortalRequirementCustomFieldInput = Partial<PortalRequirementCustomField> & {
  key?: string | null;
  label?: string | null;
  type?: PortalCustomFieldType | null;
  options?: unknown;
};

const PORTAL_CUSTOM_FIELD_TYPES: PortalCustomFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "checkbox",
];

const DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS: PortalClientReminderSettings = {
  complianceEnabled: true,
  documentEnabled: true,
  includeMissingRequired: true,
  includePendingReview: true,
  documentLeadDays: 14,
  complianceEscalationDays: 14,
  documentEscalationDays: 7,
  sendToAssignedUsers: true,
  sendToInternalAdmins: true,
  escalationManagersOnly: true,
  allowedClientDocumentLabels: [],
};

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    )
  );
}

function slugifyStorageSegment(value: string, fallback = "item") {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function sanitizePortalDisplayFileName(value: string, fallback = "file") {
  const trimmed = cleanRequiredText(value, "File name")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed || fallback;
}

function getFileExtensionFromContentType(contentType: string | null | undefined) {
  const normalized = String(contentType ?? "").trim().toLowerCase();
  switch (normalized) {
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
    case "application/vnd.ms-powerpoint":
      return ".ppt";
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      return ".pptx";
    default:
      return "";
  }
}

function getFileExtensionFromName(fileName: string | null | undefined) {
  const match = String(fileName ?? "").trim().match(/(\.[A-Za-z0-9]{2,8})$/);
  return match ? match[1].toLowerCase() : "";
}

function buildPortalFileName(baseName: string, contentType?: string | null, fileNameHint?: string | null) {
  const safeBaseName = sanitizePortalDisplayFileName(baseName, "file");
  const extension =
    getFileExtensionFromName(fileNameHint) || getFileExtensionFromContentType(contentType) || "";
  return safeBaseName.endsWith(extension) ? safeBaseName : `${safeBaseName}${extension}`;
}

async function stageLevelIIITechnicianCertificateStoredFile(
  input: LevelIIITechnicianCertificateStoredFileInput
) {
  const payload = parseDataUrlPayload(input.fileDataUrl);
  const suggestedBaseName = `${input.technicianName} - ${input.certificateNumber}`;
  const safeFileName = buildPortalFileName(
    input.fileNameHint?.trim() || suggestedBaseName,
    payload.contentType,
    input.fileNameHint ?? suggestedBaseName
  );
  const stored = await storagePut(
    `level-iii/${input.clientId}/technicians/${slugifyStorageSegment(
      input.technicianName,
      "technician"
    )}/certificates/${Date.now()}-${safeFileName}`,
    payload.buffer,
    payload.contentType
  );

  return {
    fileName: safeFileName,
    fileKey: stored.key,
    fileUrl: stored.url,
    contentType: payload.contentType,
  } satisfies PortalStoredFileReference;
}

function parseDataUrlPayload(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("The uploaded file format is invalid.");
  }

  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function normalisePortalApprovalPayload(
  value: unknown
): PortalApprovalRequestPayload {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const action = String(source.action ?? "create") as PortalApprovalAction;
  const allowedActions: PortalApprovalAction[] = ["create", "update", "delete", "upsert"];
  if (!allowedActions.includes(action)) {
    throw new Error(`Unsupported portal approval action: ${action}`);
  }

  const data =
    source.data && typeof source.data === "object" && !Array.isArray(source.data)
      ? (source.data as Record<string, unknown>)
      : null;

  const previousData =
    source.previousData &&
    typeof source.previousData === "object" &&
    !Array.isArray(source.previousData)
      ? (source.previousData as Record<string, unknown>)
      : null;

  const storedFileSource =
    source.storedFile && typeof source.storedFile === "object" && !Array.isArray(source.storedFile)
      ? (source.storedFile as Record<string, unknown>)
      : null;

  const storedFile =
    storedFileSource &&
    typeof storedFileSource.fileName === "string" &&
    typeof storedFileSource.fileKey === "string" &&
    typeof storedFileSource.fileUrl === "string"
      ? {
          fileName: storedFileSource.fileName,
          fileKey: storedFileSource.fileKey,
          fileUrl: storedFileSource.fileUrl,
          contentType:
            typeof storedFileSource.contentType === "string"
              ? storedFileSource.contentType
              : null,
        }
      : null;

  return {
    action,
    data,
    previousData,
    storedFile,
  };
}

async function ensureClientPortalRuntimeTables() {
  await ensureRuntimeTable(
    "portalClientUsers",
    `CREATE TABLE IF NOT EXISTS \`portalClientUsers\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`userId\` INT NOT NULL,
      \`accessLevel\` ENUM('viewer','editor','manager') NOT NULL DEFAULT 'viewer',
      \`receiveReminders\` TINYINT(1) NOT NULL DEFAULT 1,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`portalClientUsers_client_user_unique\` (\`clientId\`, \`userId\`),
      KEY \`portalClientUsers_user_idx\` (\`userId\`),
      KEY \`portalClientUsers_client_idx\` (\`clientId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalRequirementDefinitions",
    `CREATE TABLE IF NOT EXISTS \`portalRequirementDefinitions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(100) NOT NULL DEFAULT 'General',
      \`description\` TEXT NULL,
      \`validityDays\` INT NULL,
      \`reminderDays\` INT NOT NULL DEFAULT 30,
      \`isRequired\` TINYINT(1) NOT NULL DEFAULT 1,
      \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`customFields\` JSON NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalRequirementDefinitions_client_idx\` (\`clientId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalClientReminderSettings",
    `CREATE TABLE IF NOT EXISTS \`portalClientReminderSettings\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`complianceEnabled\` TINYINT(1) NOT NULL DEFAULT 1,
      \`documentEnabled\` TINYINT(1) NOT NULL DEFAULT 1,
      \`includeMissingRequired\` TINYINT(1) NOT NULL DEFAULT 1,
      \`includePendingReview\` TINYINT(1) NOT NULL DEFAULT 1,
      \`documentLeadDays\` INT NOT NULL DEFAULT 14,
      \`complianceEscalationDays\` INT NOT NULL DEFAULT 14,
      \`documentEscalationDays\` INT NOT NULL DEFAULT 7,
      \`sendToAssignedUsers\` TINYINT(1) NOT NULL DEFAULT 1,
      \`sendToInternalAdmins\` TINYINT(1) NOT NULL DEFAULT 1,
      \`escalationManagersOnly\` TINYINT(1) NOT NULL DEFAULT 1,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`portalClientReminderSettings_client_unique\` (\`clientId\`),
      KEY \`portalClientReminderSettings_client_idx\` (\`clientId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalTechnicianRequirements",
    `CREATE TABLE IF NOT EXISTS \`portalTechnicianRequirements\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`technicianId\` INT NOT NULL,
      \`definitionId\` INT NOT NULL,
      \`status\` ENUM('missing','current','no_expiry','expiring','expired','pending_review') NOT NULL DEFAULT 'missing',
      \`issuedAt\` DATE NULL,
      \`validUntil\` DATE NULL,
      \`notes\` TEXT NULL,
      \`customFieldValues\` JSON NULL,
      \`uploadedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`portalTechnicianRequirements_unique\` (\`technicianId\`, \`definitionId\`),
      KEY \`portalTechnicianRequirements_definition_idx\` (\`definitionId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalRequirementDocuments",
    `CREATE TABLE IF NOT EXISTS \`portalRequirementDocuments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`technicianRequirementId\` INT NOT NULL,
      \`fileName\` VARCHAR(255) NOT NULL,
      \`fileUrl\` TEXT NOT NULL,
      \`fileKey\` VARCHAR(500) NOT NULL,
      \`contentType\` VARCHAR(255) NULL,
      \`uploadedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY \`portalRequirementDocuments_requirement_idx\` (\`technicianRequirementId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalRequirementSourceReferences",
    `CREATE TABLE IF NOT EXISTS \`portalRequirementSourceReferences\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`technicianRequirementId\` INT NOT NULL,
      \`sourceFileName\` VARCHAR(255) NOT NULL,
      \`sourcePath\` TEXT NOT NULL,
      \`importedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY \`portalRequirementSourceReferences_requirement_idx\` (\`technicianRequirementId\`)
    )`
  );
  await ensurePortalRequirementDefinitionUniqueness();
  await ensurePortalTechnicianRequirementUniqueness();

  await ensureRuntimeTable(
    "portalClientDocuments",
    `CREATE TABLE IF NOT EXISTS \`portalClientDocuments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`clientBranchId\` INT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(120) NOT NULL DEFAULT 'General',
      \`description\` TEXT NULL,
      \`fileName\` VARCHAR(255) NOT NULL,
      \`fileUrl\` TEXT NOT NULL,
      \`fileKey\` VARCHAR(500) NOT NULL,
      \`contentType\` VARCHAR(255) NULL,
      \`reviewDate\` DATE NULL,
      \`validUntil\` DATE NULL,
      \`status\` ENUM('active','archived','superseded') NOT NULL DEFAULT 'active',
      \`uploadedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalClientDocuments_client_idx\` (\`clientId\`),
      KEY \`portalClientDocuments_branch_idx\` (\`clientBranchId\`)
    )`
  );
  await ensureRuntimeColumn("portalClientDocuments", "sourceFileName", "VARCHAR(255) NULL");
  await ensureRuntimeColumn("portalClientDocuments", "sourcePath", "TEXT NULL");

  await ensureRuntimeTable(
    "portalClientComments",
    `CREATE TABLE IF NOT EXISTS \`portalClientComments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`userId\` INT NOT NULL,
      \`requestType\` ENUM('general_comment','contact_request','suggestion') NOT NULL DEFAULT 'general_comment',
      \`subject\` VARCHAR(255) NOT NULL,
      \`message\` TEXT NOT NULL,
      \`status\` ENUM('open','acknowledged','closed') NOT NULL DEFAULT 'open',
      \`internalNotes\` TEXT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalClientComments_client_idx\` (\`clientId\`),
      KEY \`portalClientComments_user_idx\` (\`userId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalClientResources",
    `CREATE TABLE IF NOT EXISTS \`portalClientResources\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`clientBranchId\` INT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(120) NOT NULL DEFAULT 'General',
      \`description\` TEXT NULL,
      \`resourceType\` ENUM('file','link') NOT NULL DEFAULT 'file',
      \`linkUrl\` TEXT NULL,
      \`fileName\` VARCHAR(255) NULL,
      \`fileUrl\` TEXT NULL,
      \`fileKey\` VARCHAR(500) NULL,
      \`contentType\` VARCHAR(255) NULL,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`uploadedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalClientResources_client_idx\` (\`clientId\`),
      KEY \`portalClientResources_branch_idx\` (\`clientBranchId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalApprovalRequests",
    `CREATE TABLE IF NOT EXISTS \`portalApprovalRequests\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`entityType\` ENUM('technician','requirement_record','client_document','resource') NOT NULL,
      \`action\` ENUM('create','update','delete','upsert') NOT NULL,
      \`entityId\` INT NULL,
      \`summary\` VARCHAR(255) NOT NULL,
      \`payload\` JSON NULL,
      \`status\` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      \`submittedByUserId\` INT NOT NULL,
      \`reviewedByUserId\` INT NULL,
      \`reviewNotes\` TEXT NULL,
      \`reviewedAt\` TIMESTAMP NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalApprovalRequests_client_idx\` (\`clientId\`),
      KEY \`portalApprovalRequests_status_idx\` (\`status\`),
      KEY \`portalApprovalRequests_submitter_idx\` (\`submittedByUserId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalClientBranches",
    `CREATE TABLE IF NOT EXISTS \`portalClientBranches\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`sourceClientId\` INT NULL,
      \`name\` VARCHAR(255) NOT NULL,
      \`code\` VARCHAR(80) NULL,
      \`description\` TEXT NULL,
      \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalClientBranches_client_idx\` (\`clientId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalClientUserBranches",
    `CREATE TABLE IF NOT EXISTS \`portalClientUserBranches\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`userId\` INT NOT NULL,
      \`branchId\` INT NOT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`portalClientUserBranches_unique\` (\`clientId\`, \`userId\`, \`branchId\`),
      KEY \`portalClientUserBranches_branch_idx\` (\`branchId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalServiceDefinitions",
    `CREATE TABLE IF NOT EXISTS \`portalServiceDefinitions\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`category\` VARCHAR(120) NOT NULL DEFAULT 'General',
      \`description\` TEXT NULL,
      \`instructions\` TEXT NULL,
      \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`config\` JSON NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalServiceDefinitions_client_idx\` (\`clientId\`)
    )`
  );

  await ensureRuntimeTable(
    "portalServiceRequests",
    `CREATE TABLE IF NOT EXISTS \`portalServiceRequests\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`clientBranchId\` INT NULL,
      \`serviceDefinitionId\` INT NULL,
      \`userId\` INT NOT NULL,
      \`technicianId\` INT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`requestType\` VARCHAR(120) NOT NULL,
      \`status\` VARCHAR(80) NOT NULL DEFAULT 'submitted',
      \`preferredDate\` DATE NULL,
      \`techniques\` JSON NULL,
      \`details\` TEXT NULL,
      \`requestedDocuments\` JSON NULL,
      \`internalNotes\` TEXT NULL,
      \`metadata\` JSON NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalServiceRequests_client_idx\` (\`clientId\`),
      KEY \`portalServiceRequests_branch_idx\` (\`clientBranchId\`),
      KEY \`portalServiceRequests_status_idx\` (\`status\`)
    )`
  );

  await ensureRuntimeTable(
    "portalAssessmentGuides",
    `CREATE TABLE IF NOT EXISTS \`portalAssessmentGuides\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`clientId\` INT NOT NULL,
      \`clientBranchId\` INT NULL,
      \`title\` VARCHAR(255) NOT NULL,
      \`techniqueName\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NULL,
      \`bringItems\` JSON NULL,
      \`companyItems\` JSON NULL,
      \`active\` TINYINT(1) NOT NULL DEFAULT 1,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY \`portalAssessmentGuides_client_idx\` (\`clientId\`),
      KEY \`portalAssessmentGuides_branch_idx\` (\`clientBranchId\`)
    )`
  );

  await ensureRuntimeColumn(
    "portalRequirementDefinitions",
    "customFields",
    "JSON NULL"
  );
  await ensureRuntimeColumn(
    "portalTechnicianRequirements",
    "customFieldValues",
    "JSON NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "clientBranchId",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "portalClientDocuments",
    "clientBranchId",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "portalClientResources",
    "clientBranchId",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "portalClientBranches",
    "sourceClientId",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "complianceEnabled",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "documentEnabled",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "includeMissingRequired",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "includePendingReview",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "documentLeadDays",
    "INT NOT NULL DEFAULT 14"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "complianceEscalationDays",
    "INT NOT NULL DEFAULT 14"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "documentEscalationDays",
    "INT NOT NULL DEFAULT 7"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "sendToAssignedUsers",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "sendToInternalAdmins",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "escalationManagersOnly",
    "TINYINT(1) NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn(
    "portalClientReminderSettings",
    "allowedClientDocumentLabels",
    "JSON NULL"
  );
}

function cleanMethodsArray(
  value?: unknown,
  fallbackMethod?: string | null
): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof fallbackMethod === "string"
      ? fallbackMethod.split(",")
      : [];

  const methods = rawValues
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(methods));
}

type LevelIIITechnicianMethodQualification = {
  method: string;
  level: string;
};

function cleanLevelIIITechnicianMethodQualifications(
  value: unknown,
  fallbackMethod?: unknown,
  fallbackLevel?: unknown
) {
  const fromValue = Array.isArray(value)
    ? value
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const record = entry as Record<string, unknown>;
          const method = cleanOptionalText(
            typeof record.method === "string" ? record.method : null
          );
          const level = cleanOptionalText(
            typeof record.level === "string" ? record.level : null
          );
          if (!method || !level) return null;
          return {
            method: cleanRequiredText(method, "Method"),
            level: cleanRequiredText(level, "Level"),
          } satisfies LevelIIITechnicianMethodQualification;
        })
        .filter((entry): entry is LevelIIITechnicianMethodQualification => Boolean(entry))
    : [];

  if (fromValue.length > 0) {
    const deduped = new Map<string, LevelIIITechnicianMethodQualification>();
    for (const entry of fromValue) {
      deduped.set(entry.method.trim().toLowerCase(), entry);
    }
    return Array.from(deduped.values());
  }

  const methods = cleanMethodsArray(
    Array.isArray(fallbackMethod) ? fallbackMethod : undefined,
    typeof fallbackMethod === "string" ? fallbackMethod : null
  );
  const level = cleanOptionalText(
    typeof fallbackLevel === "string" ? fallbackLevel : null
  );

  if (!level || methods.length === 0) {
    return [] as LevelIIITechnicianMethodQualification[];
  }

  return methods.map((method) => ({
    method,
    level: cleanRequiredText(level, "Level"),
  }));
}

function summariseLevelIIITechnicianMethods(
  methodQualifications: LevelIIITechnicianMethodQualification[]
) {
  return methodQualifications.map((entry) => entry.method).join(", ");
}

function summariseLevelIIITechnicianLevels(
  methodQualifications: LevelIIITechnicianMethodQualification[]
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

function cleanLevelIIIAssessmentMethodLevels(
  value: unknown,
  fallbackMethod?: unknown,
  fallbackLevel?: unknown
) {
  const fromValue = Array.isArray(value)
    ? value
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const record = entry as Record<string, unknown>;
          const method = cleanOptionalText(
            typeof record.method === "string" ? record.method : null
          );
          const level = cleanOptionalText(
            typeof record.level === "string" ? record.level : null
          );
          if (!method || !level) return null;
          return {
            method: cleanRequiredText(method, "Method"),
            level: cleanRequiredText(level, "Level"),
          } satisfies LevelIIIAssessmentMethodLevel;
        })
        .filter((entry): entry is LevelIIIAssessmentMethodLevel => Boolean(entry))
    : [];

  if (fromValue.length > 0) {
    const deduped = new Map<string, LevelIIIAssessmentMethodLevel>();
    for (const entry of fromValue) {
      deduped.set(entry.method.trim().toLowerCase(), entry);
    }
    return Array.from(deduped.values());
  }

  const methods = cleanMethodsArray(
    Array.isArray(fallbackMethod) ? fallbackMethod : undefined,
    typeof fallbackMethod === "string" ? fallbackMethod : null
  );
  const level = cleanOptionalText(
    typeof fallbackLevel === "string" ? fallbackLevel : null
  );

  if (!level || methods.length === 0) {
    return [] as LevelIIIAssessmentMethodLevel[];
  }

  return methods.map((method) => ({
    method,
    level: cleanRequiredText(level, "Level"),
  }));
}

function summariseLevelIIIAssessmentMethods(methodLevels: LevelIIIAssessmentMethodLevel[]) {
  return methodLevels.map((entry) => entry.method).join(", ");
}

function summariseLevelIIIAssessmentLevels(methodLevels: LevelIIIAssessmentMethodLevel[]) {
  if (methodLevels.length === 0) return "";
  const uniqueLevels = Array.from(new Set(methodLevels.map((entry) => entry.level.trim())));
  if (uniqueLevels.length === 1) {
    return uniqueLevels[0] ?? "";
  }
  return methodLevels.map((entry) => `${entry.method}: ${entry.level}`).join(" | ");
}

function normaliseLevelIIIAssessmentRecord<
  T extends {
    method: string;
    level: string;
    methodLevels?: unknown;
  },
>(assessment: T) {
  const methodLevels = cleanLevelIIIAssessmentMethodLevels(
    assessment.methodLevels,
    assessment.method,
    assessment.level
  );

  return {
    ...assessment,
    methodLevels,
    method: summariseLevelIIIAssessmentMethods(methodLevels) || assessment.method,
    level: summariseLevelIIIAssessmentLevels(methodLevels) || assessment.level,
  };
}

function normalisePortalServiceDefinitionConfig(
  value: unknown
): PortalServiceDefinitionConfig {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    allowBranchSelection: source.allowBranchSelection !== false,
    allowTechnicianSelection: source.allowTechnicianSelection !== false,
    allowMultipleTechniques: source.allowMultipleTechniques !== false,
    allowPreferredDate: source.allowPreferredDate !== false,
    requestLabel:
      typeof source.requestLabel === "string" && source.requestLabel.trim()
        ? source.requestLabel.trim()
        : "Request Service",
    techniqueOptions: cleanStringArray(source.techniqueOptions),
    requestedDocumentLabels: cleanStringArray(source.requestedDocumentLabels),
  };
}

function normalisePortalServiceRequestSupportingDocuments(
  value: unknown
): PortalServiceRequestSupportingDocument[] {
  if (!Array.isArray(value)) return [];

  const documents: PortalServiceRequestSupportingDocument[] = [];
  const seenLabels = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const source = entry as Record<string, unknown>;
    const label = cleanOptionalText(String(source.label ?? ""));
    if (!label) continue;
    const labelKey = label.toLowerCase();
    if (seenLabels.has(labelKey)) continue;
    seenLabels.add(labelKey);
    documents.push({
      label,
      note: cleanOptionalText(typeof source.note === "string" ? source.note : null),
      fileName: cleanOptionalText(typeof source.fileName === "string" ? source.fileName : null),
      fileUrl: cleanOptionalText(typeof source.fileUrl === "string" ? source.fileUrl : null),
      fileKey: cleanOptionalText(typeof source.fileKey === "string" ? source.fileKey : null),
      contentType: cleanOptionalText(
        typeof source.contentType === "string" ? source.contentType : null
      ),
      classifiedLabel: cleanOptionalText(
        typeof source.classifiedLabel === "string" ? source.classifiedLabel : null
      ),
      storagePath: cleanOptionalText(
        typeof source.storagePath === "string" ? source.storagePath : null
      ),
      suggestedFileName: cleanOptionalText(
        typeof source.suggestedFileName === "string" ? source.suggestedFileName : null
      ),
      linkedRequirementDefinitionId:
        Number.isInteger(Number(source.linkedRequirementDefinitionId)) &&
        Number(source.linkedRequirementDefinitionId) > 0
          ? Number(source.linkedRequirementDefinitionId)
          : null,
      linkedRequirementDefinitionName: cleanOptionalText(
        typeof source.linkedRequirementDefinitionName === "string"
          ? source.linkedRequirementDefinitionName
          : null
      ),
    });
  }

  return documents;
}

export function normalisePortalServiceRequestMetadata(value: unknown): PortalServiceRequestMetadata {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? { ...(value as Record<string, unknown>) }
      : {};

  const confirmedDateValue =
    source.confirmedDate instanceof Date || typeof source.confirmedDate === "string"
      ? parseOptionalLevelIIIDate(source.confirmedDate as Date | string | null)
      : null;

  return {
    ...source,
    supportingDocuments: normalisePortalServiceRequestSupportingDocuments(
      source.supportingDocuments
    ),
    clientVisibleUpdate: cleanOptionalText(
      typeof source.clientVisibleUpdate === "string" ? source.clientVisibleUpdate : null
    ),
    internalOwner: cleanOptionalText(
      typeof source.internalOwner === "string" ? source.internalOwner : null
    ),
    plannedAction: cleanOptionalText(
      typeof source.plannedAction === "string" ? source.plannedAction : null
    ),
    confirmedDate: confirmedDateValue ? confirmedDateValue.toISOString() : null,
    linkedActivityId:
      Number.isInteger(Number(source.linkedActivityId)) && Number(source.linkedActivityId) > 0
        ? Number(source.linkedActivityId)
        : null,
  };
}

function normalisePortalBranchCode(value?: string | null) {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) return null;
  return cleaned.replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 80);
}

function slugifyPortalCustomFieldKey(value: string) {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return key.slice(0, 64);
}

function normalisePortalCustomFieldOptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((option) => String(option ?? "").trim())
        .filter(Boolean)
    )
  );
}

function normalisePortalRequirementCustomFields(value: unknown) {
  if (!Array.isArray(value)) return [] as PortalRequirementCustomField[];

  const seenKeys = new Set<string>();
  const fields: PortalRequirementCustomField[] = [];

  value.forEach((entry, index) => {
    const candidate = (entry ?? {}) as PortalRequirementCustomFieldInput;
    const key = slugifyPortalCustomFieldKey(
      String(candidate.key ?? candidate.label ?? "")
    );
    const label = String(candidate.label ?? "").trim();
    const type = String(candidate.type ?? "text").trim() as PortalCustomFieldType;

    if (!key || !label) {
      throw new Error("Each custom field must include both a key and label.");
    }

    if (!PORTAL_CUSTOM_FIELD_TYPES.includes(type)) {
      throw new Error(`Unsupported custom field type: ${type}`);
    }

    if (seenKeys.has(key)) {
      throw new Error(`Duplicate custom field key detected: ${key}`);
    }

    const options = normalisePortalCustomFieldOptions(candidate.options);
    if (type === "select" && options.length === 0) {
      throw new Error(`Select field "${label}" must include at least one option.`);
    }

    seenKeys.add(key);
    fields.push({
      key,
      label,
      type,
      required: Boolean(candidate.required),
      placeholder: cleanOptionalText(candidate.placeholder) ?? null,
      helpText: cleanOptionalText(candidate.helpText) ?? null,
      options,
      sortOrder:
        typeof candidate.sortOrder === "number" && Number.isFinite(candidate.sortOrder)
          ? candidate.sortOrder
          : index,
    });
  });

  return fields.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });
}

function normalisePortalRequirementCustomFieldValues(
  fields: PortalRequirementCustomField[],
  rawValue: unknown,
  options: { validateRequired?: boolean } = {}
) {
  const source =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? (rawValue as Record<string, unknown>)
      : {};

  const values: Record<string, string | number | boolean | null> = {};

  fields.forEach((field) => {
    const input = source[field.key];
    let nextValue: string | number | boolean | null = null;

    switch (field.type) {
      case "checkbox":
        nextValue = Boolean(input);
        break;
      case "number":
        if (input !== undefined && input !== null && String(input).trim() !== "") {
          const parsed = Number(input);
          if (!Number.isFinite(parsed)) {
            throw new Error(`"${field.label}" must be a valid number.`);
          }
          nextValue = parsed;
        }
        break;
      case "date":
        if (input !== undefined && input !== null && String(input).trim() !== "") {
          const parsed = parseOptionalLevelIIIDate(input as Date | string);
          if (!parsed) {
            throw new Error(`"${field.label}" must be a valid date.`);
          }
          nextValue = parsed.toISOString().slice(0, 10);
        }
        break;
      case "select": {
        const cleaned =
          input === undefined || input === null
            ? null
            : cleanOptionalText(String(input));
        if (cleaned && !field.options.includes(cleaned)) {
          throw new Error(`"${field.label}" must be one of the configured options.`);
        }
        nextValue = cleaned ?? null;
        break;
      }
      case "textarea":
      case "text":
      default:
        nextValue =
          input === undefined || input === null
            ? null
            : cleanOptionalText(String(input)) ?? null;
        break;
    }

    if (
      options.validateRequired !== false &&
      field.required &&
      (nextValue === null ||
        nextValue === "" ||
        (field.type === "checkbox" && nextValue === false))
    ) {
      throw new Error(`"${field.label}" is required.`);
    }

    values[field.key] = nextValue;
  });

  return values;
}

function resolveStoredFileUrl(
  fileKey: string | null | undefined,
  fallbackUrl: string | null | undefined
) {
  if (fileKey) {
    return storageResolveUrl(fileKey);
  }

  return fallbackUrl ?? null;
}

function normaliseLevelIIITechnician<
  T extends {
    method?: string | null;
    methods?: unknown;
    level?: string | null;
    methodQualifications?: unknown;
  },
>(technician: T) {
  const methodQualifications = cleanLevelIIITechnicianMethodQualifications(
    technician.methodQualifications,
    technician.methods ?? technician.method ?? null,
    technician.level ?? null
  );
  const methods =
    methodQualifications.length > 0
      ? methodQualifications.map((entry) => entry.method)
      : cleanMethodsArray(technician.methods, technician.method ?? null);
  return {
    ...technician,
    methodQualifications,
    methods,
    method:
      summariseLevelIIITechnicianMethods(methodQualifications) || methods.join(", "),
    level:
      summariseLevelIIITechnicianLevels(methodQualifications) ||
      cleanOptionalText(technician.level ?? null) ||
      "",
  };
}

async function validateLevelIIITechnicianBranch(
  clientId: number,
  clientBranchId: number | null | undefined
) {
  if (clientBranchId === null || clientBranchId === undefined) {
    return null;
  }

  const branch = await db
    .select()
    .from(portalClientBranches)
    .where(eq(portalClientBranches.id, clientBranchId))
    .limit(1);

  if (!branch[0]) {
    throw new Error("Selected client branch was not found.");
  }

  if (branch[0].clientId !== clientId) {
    throw new Error("Selected client branch does not belong to the selected company.");
  }

  return branch[0];
}

async function getLinkedBranchSourceInfoByClientId() {
  await ensureClientPortalRuntimeTables();

  const [branches, clients] = await Promise.all([
    db.select().from(portalClientBranches),
    db
      .select({
        id: levelIIIClients.id,
        companyName: levelIIIClients.companyName,
        notes: levelIIIClients.notes,
      })
      .from(levelIIIClients),
  ]);

  const clientMap = new Map(clients.map((client) => [client.id, client] as const));

  for (const branch of branches) {
    if (branch.sourceClientId) continue;

    const noteSuffix = `as branch ${branch.name}.`;
    const matches = clients.filter((client) => {
      if (client.id === branch.clientId) return false;
      return String(client.notes ?? "").includes(noteSuffix);
    });

    if (matches.length !== 1) continue;
    const matchedClient = matches[0]!;
    await db
      .update(portalClientBranches)
      .set({
        sourceClientId: matchedClient.id,
      })
      .where(eq(portalClientBranches.id, branch.id));
    branch.sourceClientId = matchedClient.id;
  }

  const sourceInfoMap = new Map<number, LinkedBranchSourceInfo>();
  for (const branch of branches) {
    if (!branch.sourceClientId) continue;
    const headOffice = clientMap.get(branch.clientId);
    if (!headOffice) continue;
    sourceInfoMap.set(branch.sourceClientId, {
      headOfficeClientId: branch.clientId,
      headOfficeName: headOffice.companyName,
      branchId: branch.id,
      branchName: branch.name,
    });
  }

  return sourceInfoMap;
}

async function hydratePortalBranchesWithSourceClients<T extends typeof portalClientBranches.$inferSelect>(
  rows: T[]
) {
  if (rows.length === 0) {
    return rows.map((row) => ({
      ...row,
      sourceClientName: null,
    }));
  }

  const sourceClientIds = Array.from(
    new Set(
      rows
        .map((row) => row.sourceClientId)
        .filter(
          (value): value is number =>
            value !== null && value !== undefined && Number.isInteger(value) && value > 0
        )
    )
  );
  const sourceClients =
    sourceClientIds.length > 0
      ? await db
          .select({
            id: levelIIIClients.id,
            companyName: levelIIIClients.companyName,
          })
          .from(levelIIIClients)
          .where(inArray(levelIIIClients.id, sourceClientIds))
      : [];
  const sourceClientMap = new Map(
    sourceClients.map((client) => [client.id, client.companyName] as const)
  );

  return rows.map((row) => ({
    ...row,
    sourceClientName: row.sourceClientId ? sourceClientMap.get(row.sourceClientId) ?? null : null,
  }));
}

export async function getAllLevelIIIClients(options?: {
  includeLinkedBranchClients?: boolean;
}) {
  const includeLinkedBranchClients = options?.includeLinkedBranchClients ?? false;
  const [rows, linkedBranchSourceInfo] = await Promise.all([
    db.select().from(levelIIIClients),
    getLinkedBranchSourceInfoByClientId(),
  ]);

  return rows
    .map((row) => ({
      ...row,
      linkedBranchInfo: linkedBranchSourceInfo.get(row.id) ?? null,
    }))
    .filter((client) => includeLinkedBranchClients || !client.linkedBranchInfo)
    .sort((a, b) => a.companyName.localeCompare(b.companyName));
}

async function syncLevelIIIClientVisitDates(clientId: number) {
  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, clientId))
    .limit(1);

  if (!client[0]) return;

  const activities = await db
    .select()
    .from(levelIIIActivities)
    .where(eq(levelIIIActivities.clientId, clientId));

  const completedVisits = activities
    .filter(
      (activity) =>
        activity.activityType === "Visit" && activity.status === "Completed"
    )
    .sort(
      (a, b) =>
        new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
    );

  const nextActionCandidates = [
    ...activities
      .filter((activity) => activity.status !== "Cancelled" && activity.nextActionDate)
      .map((activity) => new Date(activity.nextActionDate!)),
    ...activities
      .filter(
        (activity) =>
          activity.activityType === "Visit" &&
          activity.status === "Planned" &&
          activity.activityDate
      )
      .map((activity) => new Date(activity.activityDate)),
  ].sort((a, b) => a.getTime() - b.getTime());

  const lastVisit = completedVisits[0]
    ? startOfDay(new Date(completedVisits[0].activityDate))
    : null;

  const nextVisit =
    nextActionCandidates[0]
      ? startOfDay(new Date(nextActionCandidates[0]))
      : lastVisit
        ? calculateNextVisitFromCadence(client[0].visitCadence, lastVisit)
        : null;

  await db
    .update(levelIIIClients)
    .set({
      lastVisit,
      nextVisit,
    })
    .where(eq(levelIIIClients.id, clientId));
}

export async function createLevelIIIClient(
  data: typeof levelIIIClients.$inferInsert
) {
  return db.insert(levelIIIClients).values({
    companyName: cleanRequiredText(data.companyName, "Company name"),
    primaryContact: cleanRequiredText(data.primaryContact, "Primary contact"),
    secondaryContact: cleanOptionalText(data.secondaryContact),
    email: cleanRequiredText(data.email, "Email").toLowerCase(),
    secondaryEmail: cleanOptionalText(data.secondaryEmail)?.toLowerCase() || null,
    phone: cleanRequiredText(data.phone, "Phone"),
    secondaryPhone: cleanOptionalText(data.secondaryPhone),
    physicalAddress: cleanRequiredText(data.physicalAddress, "Physical address"),
    visitCadence: data.visitCadence ?? "Monthly",
    lastVisit: parseOptionalLevelIIIDate(data.lastVisit),
    nextVisit: parseOptionalLevelIIIDate(data.nextVisit),
    procedureUpdatedAt: parseOptionalLevelIIIDate(data.procedureUpdatedAt),
    notes: cleanOptionalText(data.notes),
  });
}

export async function updateLevelIIIClient(
  id: number,
  data: Partial<typeof levelIIIClients.$inferInsert>
) {
  return db
    .update(levelIIIClients)
    .set({
      companyName:
        data.companyName === undefined
          ? undefined
          : cleanRequiredText(data.companyName, "Company name"),
      primaryContact:
        data.primaryContact === undefined
          ? undefined
          : cleanRequiredText(data.primaryContact, "Primary contact"),
      secondaryContact:
        data.secondaryContact === undefined
          ? undefined
          : cleanOptionalText(data.secondaryContact),
      email:
        data.email === undefined
          ? undefined
          : cleanRequiredText(data.email, "Email").toLowerCase(),
      secondaryEmail:
        data.secondaryEmail === undefined
          ? undefined
          : cleanOptionalText(data.secondaryEmail)?.toLowerCase() || null,
      phone:
        data.phone === undefined
          ? undefined
          : cleanRequiredText(data.phone, "Phone"),
      secondaryPhone:
        data.secondaryPhone === undefined
          ? undefined
          : cleanOptionalText(data.secondaryPhone),
      physicalAddress:
        data.physicalAddress === undefined
          ? undefined
          : cleanRequiredText(data.physicalAddress, "Physical address"),
      visitCadence: data.visitCadence,
      lastVisit:
        data.lastVisit === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.lastVisit),
      nextVisit:
        data.nextVisit === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.nextVisit),
      procedureUpdatedAt:
        data.procedureUpdatedAt === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.procedureUpdatedAt),
      notes: data.notes === undefined ? undefined : cleanOptionalText(data.notes),
    })
    .where(eq(levelIIIClients.id, id));
}

export async function deleteLevelIIIClient(id: number) {
  await ensureClientPortalRuntimeTables();

  const [linkedBranch] = await db
    .select()
    .from(portalClientBranches)
    .where(eq(portalClientBranches.sourceClientId, id))
    .limit(1);
  if (linkedBranch) {
    throw new Error(
      `This client is already linked under a head office as branch "${linkedBranch.name}". Remove that branch link first if you want to delete the legacy client record.`
    );
  }

  await db
    .delete(levelIIIActivities)
    .where(eq(levelIIIActivities.clientId, id));

  const technicians = await db
    .select({ id: levelIIITechnicians.id })
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.clientId, id));

  const technicianIds = technicians.map((technician) => technician.id);
  if (technicianIds.length > 0) {
    await db
      .delete(levelIIIAssessments)
      .where(inArray(levelIIIAssessments.technicianId, technicianIds));
  }

  await db
    .delete(levelIIITechnicians)
    .where(eq(levelIIITechnicians.clientId, id));

  return db.delete(levelIIIClients).where(eq(levelIIIClients.id, id));
}

export async function getAllLevelIIIActivities() {
  const rows = await db.select().from(levelIIIActivities);
  return rows.sort(
    (a, b) =>
      new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime()
  );
}

export async function createLevelIIIActivity(
  data: typeof levelIIIActivities.$inferInsert
) {
  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);

  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  const activityDate =
    parseOptionalLevelIIIDate(data.activityDate) ?? startOfDay(new Date());

  const result = await db.insert(levelIIIActivities).values({
    clientId: data.clientId,
    activityType: data.activityType ?? "General",
    subject: cleanRequiredText(data.subject, "Subject"),
    activityDate,
    nextActionDate: parseOptionalLevelIIIDate(data.nextActionDate),
    status: data.status ?? "Planned",
    notes: cleanOptionalText(data.notes),
  });

  await syncLevelIIIClientVisitDates(data.clientId);
  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  const created = insertId
    ? (
        await db
          .select()
          .from(levelIIIActivities)
          .where(eq(levelIIIActivities.id, insertId))
          .limit(1)
      )[0]
    : null;
  return created ?? null;
}

export async function updateLevelIIIActivity(
  id: number,
  data: Partial<typeof levelIIIActivities.$inferInsert>
) {
  const existing = await db
    .select()
    .from(levelIIIActivities)
    .where(eq(levelIIIActivities.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Activity not found.");
  }

  if (data.clientId !== undefined) {
    const client = await db
      .select()
      .from(levelIIIClients)
      .where(eq(levelIIIClients.id, data.clientId))
      .limit(1);

    if (!client[0]) {
      throw new Error("Selected client was not found.");
    }
  }

  await db
    .update(levelIIIActivities)
    .set({
      clientId: data.clientId,
      activityType: data.activityType,
      subject:
        data.subject === undefined
          ? undefined
          : cleanRequiredText(data.subject, "Subject"),
      activityDate:
        data.activityDate === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.activityDate) ?? startOfDay(new Date()),
      nextActionDate:
        data.nextActionDate === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.nextActionDate),
      status: data.status,
      notes:
        data.notes === undefined ? undefined : cleanOptionalText(data.notes),
    })
    .where(eq(levelIIIActivities.id, id));

  await syncLevelIIIClientVisitDates(existing[0].clientId);
  if (data.clientId !== undefined && data.clientId !== existing[0].clientId) {
    await syncLevelIIIClientVisitDates(data.clientId);
  }

  return getAllLevelIIIActivities();
}

export async function deleteLevelIIIActivity(id: number) {
  const existing = await db
    .select()
    .from(levelIIIActivities)
    .where(eq(levelIIIActivities.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Activity not found.");
  }

  await db.delete(levelIIIActivities).where(eq(levelIIIActivities.id, id));
  await syncLevelIIIClientVisitDates(existing[0].clientId);
  return { success: true };
}

export async function getAllLevelIIITechnicians() {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  const rows = await db.select().from(levelIIITechnicians);
  return rows
    .map((row) => normaliseLevelIIITechnician(row))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createLevelIIITechnician(
  data: typeof levelIIITechnicians.$inferInsert
) {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);

  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  await validateLevelIIITechnicianBranch(data.clientId, data.clientBranchId);

  const methodQualifications = cleanLevelIIITechnicianMethodQualifications(
    data.methodQualifications,
    data.methods ?? data.method,
    data.level
  );
  if (methodQualifications.length === 0) {
    throw new Error("At least one technician method and level is required.");
  }
  const methods = methodQualifications.map((entry) => entry.method);

  const hasPcnQualification = data.hasPcnQualification ?? false;

  return db.insert(levelIIITechnicians).values({
    clientId: data.clientId,
    clientBranchId: data.clientBranchId ?? null,
    name: cleanRequiredText(data.name, "Technician name"),
    email: cleanRequiredText(data.email, "Email").toLowerCase(),
    phone: cleanOptionalText(data.phone),
    method: summariseLevelIIITechnicianMethods(methodQualifications),
    methods,
    level: summariseLevelIIITechnicianLevels(methodQualifications),
    methodQualifications,
    hasPcnQualification,
    certificateNumber: cleanOptionalText(data.certificateNumber),
    procedureStatus: cleanOptionalText(data.procedureStatus),
    pcnRenewalDate: hasPcnQualification
      ? parseOptionalLevelIIIDate(data.pcnRenewalDate)
      : null,
    internalAssessmentDate: hasPcnQualification
      ? null
      : parseOptionalLevelIIIDate(data.internalAssessmentDate),
    eyeTestValidUntil: parseOptionalLevelIIIDate(data.eyeTestValidUntil),
    notes: cleanOptionalText(data.notes),
  });
}

export async function updateLevelIIITechnician(
  id: number,
  data: Partial<typeof levelIIITechnicians.$inferInsert>
) {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  const existing = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Technician not found.");
  }

  if (data.clientId !== undefined) {
    const client = await db
      .select()
      .from(levelIIIClients)
      .where(eq(levelIIIClients.id, data.clientId))
      .limit(1);

    if (!client[0]) {
      throw new Error("Selected client was not found.");
    }
  }

  const nextClientId = data.clientId ?? existing[0].clientId;
  await validateLevelIIITechnicianBranch(nextClientId, data.clientBranchId ?? existing[0].clientBranchId);

  const current = normaliseLevelIIITechnician(existing[0]);
  const methodQualifications =
    data.methodQualifications !== undefined ||
    data.methods !== undefined ||
    data.method !== undefined ||
    data.level !== undefined
      ? cleanLevelIIITechnicianMethodQualifications(
          data.methodQualifications,
          data.methods ?? data.method ?? current.method,
          data.level ?? current.level
        )
      : current.methodQualifications;

  if (methodQualifications.length === 0) {
    throw new Error("At least one technician method and level is required.");
  }
  const methods = methodQualifications.map((entry) => entry.method);

  const hasPcnQualification =
    data.hasPcnQualification === undefined
      ? existing[0].hasPcnQualification
      : data.hasPcnQualification;

  return db
    .update(levelIIITechnicians)
    .set({
      clientId: data.clientId,
      clientBranchId:
        data.clientBranchId === undefined ? undefined : data.clientBranchId ?? null,
      name:
        data.name === undefined
          ? undefined
          : cleanRequiredText(data.name, "Technician name"),
      email:
        data.email === undefined
          ? undefined
          : cleanRequiredText(data.email, "Email").toLowerCase(),
      phone: data.phone === undefined ? undefined : cleanOptionalText(data.phone),
      method: summariseLevelIIITechnicianMethods(methodQualifications),
      methods,
      level: summariseLevelIIITechnicianLevels(methodQualifications),
      methodQualifications,
      hasPcnQualification,
      certificateNumber:
        data.certificateNumber === undefined
          ? undefined
          : cleanOptionalText(data.certificateNumber),
      procedureStatus:
        data.procedureStatus === undefined
          ? undefined
          : cleanOptionalText(data.procedureStatus),
      pcnRenewalDate:
        data.pcnRenewalDate === undefined && data.hasPcnQualification === undefined
          ? undefined
          : hasPcnQualification
            ? parseOptionalLevelIIIDate(data.pcnRenewalDate ?? existing[0].pcnRenewalDate)
            : null,
      internalAssessmentDate:
        data.internalAssessmentDate === undefined &&
        data.hasPcnQualification === undefined
          ? undefined
          : hasPcnQualification
            ? null
            : parseOptionalLevelIIIDate(
                data.internalAssessmentDate ?? existing[0].internalAssessmentDate
              ),
      eyeTestValidUntil:
        data.eyeTestValidUntil === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.eyeTestValidUntil),
      notes: data.notes === undefined ? undefined : cleanOptionalText(data.notes),
    })
    .where(eq(levelIIITechnicians.id, id));
}

export async function deleteLevelIIITechnician(id: number) {
  await ensureClientPortalRuntimeTables();

  const requirementIds = await db
    .select({ id: portalTechnicianRequirements.id })
    .from(portalTechnicianRequirements)
    .where(eq(portalTechnicianRequirements.technicianId, id));

  if (requirementIds.length > 0) {
    await db
      .delete(portalRequirementDocuments)
      .where(
        inArray(
          portalRequirementDocuments.technicianRequirementId,
          requirementIds.map((row) => row.id)
        )
      );
    await db
      .delete(portalRequirementSourceReferences)
      .where(
        inArray(
          portalRequirementSourceReferences.technicianRequirementId,
          requirementIds.map((row) => row.id)
        )
      );

    await db
      .delete(portalTechnicianRequirements)
      .where(eq(portalTechnicianRequirements.technicianId, id));
  }

  await db
    .delete(levelIIIAssessments)
    .where(eq(levelIIIAssessments.technicianId, id));

  return db.delete(levelIIITechnicians).where(eq(levelIIITechnicians.id, id));
}

function hasPortalAdminAccess(role: User["role"]) {
  return role === "admin" || role === "super_admin";
}

function canWritePortalForAccessLevel(accessLevel: PortalAccessLevel) {
  return accessLevel === "editor" || accessLevel === "manager";
}

function computePortalRequirementStatus({
  explicitStatus,
  issuedAt,
  validUntil,
  reminderDays,
}: {
  explicitStatus?: PortalRequirementStatus | null;
  issuedAt?: Date | string | null;
  validUntil?: Date | string | null;
  reminderDays?: number | null;
}): PortalRequirementStatus {
  if (explicitStatus === "pending_review") {
    return "pending_review";
  }

  if (validUntil) {
    const today = startOfDay(new Date());
    const target = startOfDay(new Date(validUntil));
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "expired";
    if (diffDays <= Math.max(0, Number(reminderDays ?? 30))) return "expiring";
    return "current";
  }

  if (explicitStatus && explicitStatus !== "missing") {
    return explicitStatus;
  }

  return issuedAt ? "current" : "missing";
}

function computePortalDocumentHealth(document: {
  status: PortalClientDocumentStatus | string;
  reviewDate?: Date | string | null;
  validUntil?: Date | string | null;
}) {
  if (document.status !== "active") {
    return document.status;
  }

  const today = startOfDay(new Date());
  const validUntil = document.validUntil ? startOfDay(new Date(document.validUntil)) : null;
  const reviewDate = document.reviewDate ? startOfDay(new Date(document.reviewDate)) : null;

  if (validUntil && validUntil.getTime() < today.getTime()) {
    return "expired";
  }

  if (reviewDate && reviewDate.getTime() < today.getTime()) {
    return "review_due";
  }

  return "current";
}

function normalisePortalReminderSettingsRecord(
  row: Partial<typeof portalClientReminderSettings.$inferSelect> | null | undefined
) {
  return {
    ...DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS,
    complianceEnabled: row?.complianceEnabled ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.complianceEnabled,
    documentEnabled: row?.documentEnabled ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.documentEnabled,
    includeMissingRequired:
      row?.includeMissingRequired ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.includeMissingRequired,
    includePendingReview:
      row?.includePendingReview ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.includePendingReview,
    documentLeadDays: Math.max(
      0,
      Number(row?.documentLeadDays ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.documentLeadDays)
    ),
    complianceEscalationDays: Math.max(
      0,
      Number(
        row?.complianceEscalationDays ??
          DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.complianceEscalationDays
      )
    ),
    documentEscalationDays: Math.max(
      0,
      Number(
        row?.documentEscalationDays ??
          DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.documentEscalationDays
      )
    ),
    sendToAssignedUsers:
      row?.sendToAssignedUsers ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.sendToAssignedUsers,
    sendToInternalAdmins:
      row?.sendToInternalAdmins ?? DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.sendToInternalAdmins,
    escalationManagersOnly:
      row?.escalationManagersOnly ??
      DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.escalationManagersOnly,
    allowedClientDocumentLabels:
      cleanStringArray(row?.allowedClientDocumentLabels) ??
      DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS.allowedClientDocumentLabels,
  };
}

async function ensurePortalClientReminderSettings(clientId: number) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalClientReminderSettings)
    .where(eq(portalClientReminderSettings.clientId, clientId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  await db.insert(portalClientReminderSettings).values({
    clientId,
    ...DEFAULT_PORTAL_CLIENT_REMINDER_SETTINGS,
  });

  const created = await db
    .select()
    .from(portalClientReminderSettings)
    .where(eq(portalClientReminderSettings.clientId, clientId))
    .limit(1);

  return created[0]!;
}

export async function getPortalAccessibleClientsForUser(
  userId: number,
  role: User["role"]
) {
  await ensureClientPortalRuntimeTables();

  const clients = await getAllLevelIIIClients({ includeLinkedBranchClients: true });
  if (hasPortalAdminAccess(role)) {
    return clients.map((client) => ({
      ...client,
      accessLevel: "manager" as PortalAccessLevel,
      receiveReminders: true,
    }));
  }

  const assignments = await db
    .select()
    .from(portalClientUsers)
    .where(eq(portalClientUsers.userId, userId));
  const assignmentMap = new Map(assignments.map((assignment) => [assignment.clientId, assignment]));

  return clients
    .filter((client) => assignmentMap.has(client.id))
    .map((client) => {
      const assignment = assignmentMap.get(client.id)!;
      return {
        ...client,
        accessLevel: assignment.accessLevel as PortalAccessLevel,
        receiveReminders: assignment.receiveReminders,
      };
    });
}

export async function getPortalClientAccessForUser(
  userId: number,
  role: User["role"],
  clientId: number
) {
  const accessibleClients = await getPortalAccessibleClientsForUser(userId, role);
  return accessibleClients.find((client) => client.id === clientId) ?? null;
}

export async function getPortalClientAssignments(clientId: number) {
  await ensureClientPortalRuntimeTables();

  const rows = await db
    .select({
      id: portalClientUsers.id,
      clientId: portalClientUsers.clientId,
      userId: portalClientUsers.userId,
      accessLevel: portalClientUsers.accessLevel,
      receiveReminders: portalClientUsers.receiveReminders,
      createdAt: portalClientUsers.createdAt,
      updatedAt: portalClientUsers.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      loginEnabled: users.loginEnabled,
      mustChangePassword: users.mustChangePassword,
      lastSignedIn: users.lastSignedIn,
    })
    .from(portalClientUsers)
    .innerJoin(users, eq(users.id, portalClientUsers.userId))
    .where(eq(portalClientUsers.clientId, clientId));

  const branchRows = await db
    .select()
    .from(portalClientUserBranches)
    .where(eq(portalClientUserBranches.clientId, clientId));
  const branchMap = new Map<number, number[]>();
  branchRows.forEach((row) => {
    const existing = branchMap.get(row.userId) ?? [];
    existing.push(row.branchId);
    branchMap.set(row.userId, existing);
  });

  return rows
    .map((row) => ({
      ...row,
      branchIds: Array.from(new Set(branchMap.get(row.userId) ?? [])),
    }))
    .sort((a, b) => (a.userName ?? a.userEmail ?? "").localeCompare(b.userName ?? b.userEmail ?? ""));
}

export async function getAccessAuditDashboard() {
  await ensureUserRuntimeColumns();
  await ensureClientPortalRuntimeTables();

  const [userRows, assignmentRows, branchRows, clientBranchCountRows] = await Promise.all([
    getAllUsers(),
    db
      .select({
        userId: portalClientUsers.userId,
        clientId: portalClientUsers.clientId,
        accessLevel: portalClientUsers.accessLevel,
        receiveReminders: portalClientUsers.receiveReminders,
        assignmentCreatedAt: portalClientUsers.createdAt,
        assignmentUpdatedAt: portalClientUsers.updatedAt,
        companyName: levelIIIClients.companyName,
      })
      .from(portalClientUsers)
      .innerJoin(levelIIIClients, eq(levelIIIClients.id, portalClientUsers.clientId)),
    db
      .select({
        userId: portalClientUserBranches.userId,
        clientId: portalClientUserBranches.clientId,
        branchId: portalClientUserBranches.branchId,
      })
      .from(portalClientUserBranches),
    db
      .select({
        clientId: portalClientBranches.clientId,
        totalBranches: sql<number>`count(*)`,
      })
      .from(portalClientBranches)
      .groupBy(portalClientBranches.clientId),
  ]);

  const branchAssignmentMap = new Map<string, number[]>();
  for (const row of branchRows) {
    const key = `${row.userId}:${row.clientId}`;
    const existing = branchAssignmentMap.get(key) ?? [];
    existing.push(row.branchId);
    branchAssignmentMap.set(key, existing);
  }

  const clientBranchCountMap = new Map<number, number>();
  for (const row of clientBranchCountRows) {
    clientBranchCountMap.set(row.clientId, Number(row.totalBranches) || 0);
  }

  return userRows
    .map((user) => {
      const clientAssignments = assignmentRows
        .filter((assignment) => assignment.userId === user.id)
        .map((assignment) => {
          const branchIds = Array.from(
            new Set(branchAssignmentMap.get(`${assignment.userId}:${assignment.clientId}`) ?? [])
          );
          const totalClientBranches = clientBranchCountMap.get(assignment.clientId) ?? 0;
          const fullBranchAccess = branchIds.length === 0;
          return {
            clientId: assignment.clientId,
            companyName: assignment.companyName,
            accessLevel: assignment.accessLevel,
            receiveReminders: assignment.receiveReminders,
            branchIds,
            totalClientBranches,
            scopedBranchCount: branchIds.length,
            fullBranchAccess,
            assignmentCreatedAt: assignment.assignmentCreatedAt,
            assignmentUpdatedAt: assignment.assignmentUpdatedAt,
          };
        })
        .sort((a, b) => a.companyName.localeCompare(b.companyName));

      const portalAssignmentCount = clientAssignments.length;
      const restrictedClientCount = clientAssignments.filter((assignment) => !assignment.fullBranchAccess).length;
      const fullyScopedClientCount = clientAssignments.filter((assignment) => assignment.fullBranchAccess).length;
      const portalManagerCount = clientAssignments.filter((assignment) => assignment.accessLevel === "manager").length;
      const portalViewerCount = clientAssignments.filter((assignment) => assignment.accessLevel !== "manager").length;
      const flags: string[] = [];

      if (user.loginEnabled === false && portalAssignmentCount > 0) {
        flags.push("Suspended login still has client allocations");
      }
      if (user.mustChangePassword) {
        flags.push("Temporary password change still pending");
      }
      if ((user.role === "admin" || user.role === "super_admin") && portalAssignmentCount > 0) {
        flags.push("Internal admin account also has client allocations");
      }
      if (portalAssignmentCount > 1) {
        flags.push("Allocated to multiple client portals");
      }
      if (restrictedClientCount > 0) {
        flags.push("One or more client allocations use branch-restricted scope");
      }
      if (portalAssignmentCount > 0 && !user.lastSignedIn) {
        flags.push("Allocated client user has never signed in");
      }

      return {
        id: String(user.id),
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loginEnabled: user.loginEnabled,
        mustChangePassword: user.mustChangePassword,
        lastSignedIn: user.lastSignedIn,
        createdAt: user.createdAt,
        portalAssignmentCount,
        portalManagerCount,
        portalViewerCount,
        restrictedClientCount,
        fullyScopedClientCount,
        clientAssignments,
        portalStatusLabel:
          portalAssignmentCount === 0
            ? "No client portal access"
            : portalAssignmentCount === 1
              ? "Allocated to 1 client"
              : `Allocated to ${portalAssignmentCount} clients`,
        scopeSummary:
          portalAssignmentCount === 0
            ? "None"
            : restrictedClientCount === 0
              ? "Full client visibility"
              : `${restrictedClientCount} restricted / ${fullyScopedClientCount} full`,
        internalAccessLabel:
          user.role === "super_admin"
            ? "Super Admin"
            : user.role === "admin"
              ? "Admin"
              : "Standard user",
        accessFlags: flags,
      };
    })
    .sort((left, right) => {
      if (left.accessFlags.length !== right.accessFlags.length) {
        return right.accessFlags.length - left.accessFlags.length;
      }
      if (left.portalAssignmentCount !== right.portalAssignmentCount) {
        return right.portalAssignmentCount - left.portalAssignmentCount;
      }
      return (left.name ?? left.email ?? "").localeCompare(right.name ?? right.email ?? "");
    });
}

export async function getAccessAuditBranchCoverage() {
  await ensureUserRuntimeColumns();
  await ensureClientPortalRuntimeTables();

  const [userRows, assignmentRows, branchRestrictionRows, clientBranchRows] = await Promise.all([
    getAllUsers(),
    db
      .select({
        userId: portalClientUsers.userId,
        clientId: portalClientUsers.clientId,
        accessLevel: portalClientUsers.accessLevel,
        companyName: levelIIIClients.companyName,
      })
      .from(portalClientUsers)
      .innerJoin(levelIIIClients, eq(levelIIIClients.id, portalClientUsers.clientId)),
    db
      .select({
        userId: portalClientUserBranches.userId,
        clientId: portalClientUserBranches.clientId,
        branchId: portalClientUserBranches.branchId,
      })
      .from(portalClientUserBranches),
    db
      .select({
        id: portalClientBranches.id,
        clientId: portalClientBranches.clientId,
        name: portalClientBranches.name,
        active: portalClientBranches.active,
      })
      .from(portalClientBranches),
  ]);

  const userMap = new Map(userRows.map((user) => [user.id, user]));
  const branchRestrictionMap = new Map<string, number[]>();
  for (const row of branchRestrictionRows) {
    const key = `${row.userId}:${row.clientId}`;
    const existing = branchRestrictionMap.get(key) ?? [];
    existing.push(row.branchId);
    branchRestrictionMap.set(key, existing);
  }

  const clientBranchMap = new Map<number, Array<{ id: number; name: string; active: boolean }>>();
  for (const row of clientBranchRows) {
    const existing = clientBranchMap.get(row.clientId) ?? [];
    existing.push({
      id: row.id,
      name: row.name,
      active: Boolean(row.active),
    });
    clientBranchMap.set(row.clientId, existing);
  }

  const clientAssignmentMap = new Map<
    number,
    Array<{
      userId: number;
      companyName: string;
      accessLevel: string;
      loginEnabled: boolean;
      branchIds: number[];
      fullBranchAccess: boolean;
    }>
  >();

  for (const assignment of assignmentRows) {
    const existing = clientAssignmentMap.get(assignment.clientId) ?? [];
    const branchIds = Array.from(
      new Set(branchRestrictionMap.get(`${assignment.userId}:${assignment.clientId}`) ?? [])
    );
    const user = userMap.get(assignment.userId);
    existing.push({
      userId: assignment.userId,
      companyName: assignment.companyName,
      accessLevel: assignment.accessLevel,
      loginEnabled: user?.loginEnabled !== false,
      branchIds,
      fullBranchAccess: branchIds.length === 0,
    });
    clientAssignmentMap.set(assignment.clientId, existing);
  }

  return Array.from(clientAssignmentMap.entries())
    .map(([clientId, assignments]) => {
      const companyName = assignments[0]?.companyName ?? `Client ${clientId}`;
      const clientBranches = (clientBranchMap.get(clientId) ?? []).sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      const activeBranches = clientBranches.filter((branch) => branch.active);
      const activeAssignments = assignments.filter((assignment) => assignment.loginEnabled);
      const activeManagers = activeAssignments.filter((assignment) => assignment.accessLevel === "manager");
      const activeFullScopeAssignments = activeAssignments.filter((assignment) => assignment.fullBranchAccess);
      const activeRestrictedAssignments = activeAssignments.filter((assignment) => !assignment.fullBranchAccess);

      const coveredBranchIds = new Set<number>();
      if (activeFullScopeAssignments.length > 0) {
        for (const branch of activeBranches) {
          coveredBranchIds.add(branch.id);
        }
      } else {
        for (const assignment of activeRestrictedAssignments) {
          for (const branchId of assignment.branchIds) {
            coveredBranchIds.add(branchId);
          }
        }
      }

      const uncoveredBranches = activeBranches
        .filter((branch) => !coveredBranchIds.has(branch.id))
        .map((branch) => branch.name);

      let coverageStatus = "No branches configured";
      let recommendation = "Create client branches before relying on branch-scoped access";

      if (activeBranches.length === 0 && assignments.length > 0) {
        coverageStatus = "No branches configured";
        recommendation = "Create client branches before relying on branch-scoped access";
      } else if (activeAssignments.length === 0) {
        coverageStatus = "No active access";
        recommendation = "Reactivate or replace the allocated users for this client";
      } else if (activeFullScopeAssignments.length > 0) {
        coverageStatus = "Full branch coverage";
        recommendation =
          activeManagers.length === 0
            ? "Allocate or reactivate an active manager for this client"
            : "No immediate branch coverage issue";
      } else if (uncoveredBranches.length > 0) {
        coverageStatus = `${uncoveredBranches.length} uncovered branch${uncoveredBranches.length === 1 ? "" : "es"}`;
        recommendation = "Review restricted assignments and cover the missing client branches";
      } else {
        coverageStatus = "Restricted coverage complete";
        recommendation =
          activeManagers.length === 0
            ? "Coverage is complete, but no active manager is allocated"
            : "Restricted branch coverage is complete";
      }

      return {
        id: String(clientId),
        clientId,
        companyName,
        totalBranches: clientBranches.length,
        activeBranches: activeBranches.length,
        activeAssignedUsers: activeAssignments.length,
        activeManagerCount: activeManagers.length,
        activeFullScopeCount: activeFullScopeAssignments.length,
        activeRestrictedCount: activeRestrictedAssignments.length,
        uncoveredBranchCount: uncoveredBranches.length,
        uncoveredBranchNames: uncoveredBranches,
        coverageStatus,
        recommendation,
      };
    })
    .sort((left, right) => {
      if (left.uncoveredBranchCount !== right.uncoveredBranchCount) {
        return right.uncoveredBranchCount - left.uncoveredBranchCount;
      }
      if (left.activeManagerCount !== right.activeManagerCount) {
        return left.activeManagerCount - right.activeManagerCount;
      }
      return left.companyName.localeCompare(right.companyName);
    });
}

export async function upsertPortalClientAssignment(data: {
  clientId: number;
  userId: number;
  accessLevel: PortalAccessLevel;
  receiveReminders?: boolean | null;
}) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalClientUsers)
    .where(
      and(
        eq(portalClientUsers.clientId, data.clientId),
        eq(portalClientUsers.userId, data.userId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(portalClientUsers)
      .set({
        accessLevel: data.accessLevel,
        receiveReminders: data.receiveReminders ?? true,
      })
      .where(eq(portalClientUsers.id, existing[0].id));
  } else {
    await db.insert(portalClientUsers).values({
      clientId: data.clientId,
      userId: data.userId,
      accessLevel: data.accessLevel,
      receiveReminders: data.receiveReminders ?? true,
    });
  }

  return getPortalClientAssignments(data.clientId);
}

export async function deletePortalClientAssignment(id: number) {
  await ensureClientPortalRuntimeTables();
  const existing = await db
    .select()
    .from(portalClientUsers)
    .where(eq(portalClientUsers.id, id))
    .limit(1);
  if (!existing[0]) {
    return;
  }
  await db
    .delete(portalClientUserBranches)
    .where(
      and(
        eq(portalClientUserBranches.clientId, existing[0].clientId),
        eq(portalClientUserBranches.userId, existing[0].userId)
      )
    );
  return db.delete(portalClientUsers).where(eq(portalClientUsers.id, id));
}

export async function stagePortalApprovalFile(data: {
  clientId: number;
  scope: string;
  fileName: string;
  fileDataUrl: string;
}) {
  await ensureClientPortalRuntimeTables();

  const payload = parseDataUrlPayload(data.fileDataUrl);
  const safeFileName = sanitizePortalDisplayFileName(data.fileName, "file");
  const stored = await storagePut(
    `client-portal/${data.clientId}/approvals/${data.scope}/${Date.now()}-${safeFileName}`,
    payload.buffer,
    payload.contentType
  );

  return {
    fileName: safeFileName,
    fileKey: stored.key,
    fileUrl: stored.url,
    contentType: payload.contentType,
  } satisfies PortalStoredFileReference;
}

export async function createPortalApprovalRequest(data: {
  clientId: number;
  entityType: PortalApprovalEntityType;
  action: PortalApprovalAction;
  entityId?: number | null;
  summary: string;
  payload?: PortalApprovalRequestPayload | null;
  submittedByUserId: number;
}) {
  await ensureClientPortalRuntimeTables();

  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);
  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  const result = await db.insert(portalApprovalRequests).values({
    clientId: data.clientId,
    entityType: data.entityType,
    action: data.action,
    entityId: data.entityId ?? null,
    summary: cleanRequiredText(data.summary, "Summary"),
    payload: data.payload ?? null,
    status: "pending",
    submittedByUserId: data.submittedByUserId,
  });

  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  return (
    await db
      .select()
      .from(portalApprovalRequests)
      .where(eq(portalApprovalRequests.id, insertId))
      .limit(1)
  )[0];
}

export async function getPortalApprovalRequests(clientId: number) {
  await ensureClientPortalRuntimeTables();

  const rows = await db
    .select({
      id: portalApprovalRequests.id,
      clientId: portalApprovalRequests.clientId,
      entityType: portalApprovalRequests.entityType,
      action: portalApprovalRequests.action,
      entityId: portalApprovalRequests.entityId,
      summary: portalApprovalRequests.summary,
      payload: portalApprovalRequests.payload,
      status: portalApprovalRequests.status,
      reviewNotes: portalApprovalRequests.reviewNotes,
      reviewedAt: portalApprovalRequests.reviewedAt,
      createdAt: portalApprovalRequests.createdAt,
      updatedAt: portalApprovalRequests.updatedAt,
      submittedByUserId: portalApprovalRequests.submittedByUserId,
      reviewedByUserId: portalApprovalRequests.reviewedByUserId,
      submittedByName: users.name,
      submittedByEmail: users.email,
    })
    .from(portalApprovalRequests)
    .leftJoin(users, eq(users.id, portalApprovalRequests.submittedByUserId))
    .where(eq(portalApprovalRequests.clientId, clientId));

  const reviewerIds = Array.from(
    new Set(
      rows
        .map((row) => row.reviewedByUserId)
        .filter((value): value is number => typeof value === "number" && value > 0)
    )
  );
  const reviewers =
    reviewerIds.length > 0 ? await db.select().from(users).where(inArray(users.id, reviewerIds)) : [];
  const reviewerMap = new Map(reviewers.map((reviewer) => [reviewer.id, reviewer] as const));

  return rows
    .map((row) => ({
      ...row,
      payload: normalisePortalApprovalPayload(row.payload),
      reviewedByName: row.reviewedByUserId ? reviewerMap.get(row.reviewedByUserId)?.name ?? null : null,
      reviewedByEmail: row.reviewedByUserId
        ? reviewerMap.get(row.reviewedByUserId)?.email ?? null
        : null,
    }))
    .sort((left, right) => {
      const leftPending = left.status === "pending" ? 0 : 1;
      const rightPending = right.status === "pending" ? 0 : 1;
      if (leftPending !== rightPending) return leftPending - rightPending;
      return new Date(right.updatedAt ?? right.createdAt).getTime() - new Date(left.updatedAt ?? left.createdAt).getTime();
    });
}

export async function getPortalClientReminderSettings(clientId: number) {
  const settings = await ensurePortalClientReminderSettings(clientId);
  return {
    clientId,
    ...normalisePortalReminderSettingsRecord(settings),
  };
}

export async function updatePortalClientReminderSettings(
  clientId: number,
  data: Partial<PortalClientReminderSettings>
) {
  const existing = await ensurePortalClientReminderSettings(clientId);
  const current = normalisePortalReminderSettingsRecord(existing);

  await db
    .update(portalClientReminderSettings)
    .set({
      complianceEnabled:
        data.complianceEnabled === undefined ? undefined : Boolean(data.complianceEnabled),
      documentEnabled:
        data.documentEnabled === undefined ? undefined : Boolean(data.documentEnabled),
      includeMissingRequired:
        data.includeMissingRequired === undefined
          ? undefined
          : Boolean(data.includeMissingRequired),
      includePendingReview:
        data.includePendingReview === undefined ? undefined : Boolean(data.includePendingReview),
      documentLeadDays:
        data.documentLeadDays === undefined
          ? undefined
          : Math.max(0, Number(data.documentLeadDays ?? current.documentLeadDays)),
      complianceEscalationDays:
        data.complianceEscalationDays === undefined
          ? undefined
          : Math.max(
              0,
              Number(data.complianceEscalationDays ?? current.complianceEscalationDays)
            ),
      documentEscalationDays:
        data.documentEscalationDays === undefined
          ? undefined
          : Math.max(0, Number(data.documentEscalationDays ?? current.documentEscalationDays)),
      sendToAssignedUsers:
        data.sendToAssignedUsers === undefined ? undefined : Boolean(data.sendToAssignedUsers),
      sendToInternalAdmins:
        data.sendToInternalAdmins === undefined ? undefined : Boolean(data.sendToInternalAdmins),
      escalationManagersOnly:
        data.escalationManagersOnly === undefined
          ? undefined
          : Boolean(data.escalationManagersOnly),
      allowedClientDocumentLabels:
        data.allowedClientDocumentLabels === undefined
          ? undefined
          : cleanStringArray(data.allowedClientDocumentLabels),
    })
    .where(eq(portalClientReminderSettings.clientId, clientId));

  return getPortalClientReminderSettings(clientId);
}

export async function getPortalAssignableUsers() {
  const rows = await db.select().from(users);
  return rows.sort((a, b) => (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""));
}

export async function getPortalBranchesForClient(clientId: number) {
  await ensureClientPortalRuntimeTables();
  const rows = await db
    .select()
    .from(portalClientBranches)
    .where(eq(portalClientBranches.clientId, clientId));

  const hydratedRows = await hydratePortalBranchesWithSourceClients(rows);
  return hydratedRows.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

export async function getAllPortalClientBranches() {
  await ensureClientPortalRuntimeTables();
  const rows = await db.select().from(portalClientBranches);
  const hydratedRows = await hydratePortalBranchesWithSourceClients(rows);
  return hydratedRows.sort((a, b) => {
    if (a.clientId !== b.clientId) return a.clientId - b.clientId;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });
}

function normalisePortalBranchName(value?: string | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getPortalAccessLevelRank(value: PortalAccessLevel) {
  switch (value) {
    case "manager":
      return 3;
    case "editor":
      return 2;
    case "viewer":
    default:
      return 1;
  }
}

export async function getPortalBranchImportCandidates(headOfficeClientId: number) {
  await ensureClientPortalRuntimeTables();

  const [headOffice] = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, headOfficeClientId))
    .limit(1);
  if (!headOffice) {
    throw new Error("Selected head office client was not found.");
  }

  const [clients, allBranches, technicians, activities] = await Promise.all([
    getAllLevelIIIClients({ includeLinkedBranchClients: true }),
    getAllPortalClientBranches(),
    db.select({ id: levelIIITechnicians.id, clientId: levelIIITechnicians.clientId }).from(levelIIITechnicians),
    db.select({ id: levelIIIActivities.id, clientId: levelIIIActivities.clientId }).from(levelIIIActivities),
  ]);
  const branches = allBranches.filter((branch) => branch.clientId === headOfficeClientId);

  const existingBranchNames = new Set(branches.map((branch) => normalisePortalBranchName(branch.name)));
  const linkedSourceClientIds = new Set(
    allBranches
      .map((branch) => branch.sourceClientId)
      .filter(
        (value): value is number =>
          value !== null && value !== undefined && Number.isInteger(value) && value > 0
      )
  );
  const technicianCountByClient = new Map<number, number>();
  technicians.forEach((technician) => {
    technicianCountByClient.set(
      technician.clientId,
      (technicianCountByClient.get(technician.clientId) ?? 0) + 1
    );
  });
  const activityCountByClient = new Map<number, number>();
  activities.forEach((activity) => {
    activityCountByClient.set(
      activity.clientId,
      (activityCountByClient.get(activity.clientId) ?? 0) + 1
    );
  });

  return clients
    .filter((client) => client.id !== headOfficeClientId)
    .filter((client) => !linkedSourceClientIds.has(client.id))
    .filter((client) => !existingBranchNames.has(normalisePortalBranchName(client.companyName)))
    .map((client) => ({
      id: client.id,
      companyName: client.companyName,
      primaryContact: client.primaryContact,
      email: client.email,
      phone: client.phone,
      technicianCount: technicianCountByClient.get(client.id) ?? 0,
      activityCount: activityCountByClient.get(client.id) ?? 0,
    }))
    .sort((left, right) => left.companyName.localeCompare(right.companyName));
}

export async function importPortalBranchesFromExistingClients(data: {
  headOfficeClientId: number;
  sourceClientIds: number[];
}) {
  await ensureClientPortalRuntimeTables();

  const sourceClientIds = Array.from(
    new Set(
      data.sourceClientIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0 && value !== data.headOfficeClientId)
    )
  );
  if (sourceClientIds.length === 0) {
    throw new Error("Choose at least one existing client to convert into a branch.");
  }

  const clients = await getAllLevelIIIClients();
  const headOffice = clients.find((client) => client.id === data.headOfficeClientId);
  if (!headOffice) {
    throw new Error("Selected head office client was not found.");
  }

  const sourceClients = clients.filter((client) => sourceClientIds.includes(client.id));
  if (sourceClients.length !== sourceClientIds.length) {
    throw new Error("One or more selected branch clients could not be found.");
  }

  const existingBranches = await getPortalBranchesForClient(data.headOfficeClientId);
  const existingBranchNames = new Set(
    existingBranches.map((branch) => normalisePortalBranchName(branch.name))
  );
  const createdBranches: Array<{ sourceClientId: number; branchId: number; branchName: string }> = [];

  for (let index = 0; index < sourceClients.length; index += 1) {
    const sourceClient = sourceClients[index]!;
    const branchName = cleanRequiredText(sourceClient.companyName, "Branch client name");
    if (existingBranchNames.has(normalisePortalBranchName(branchName))) {
      throw new Error(`A branch named "${branchName}" already exists under ${headOffice.companyName}.`);
    }

    const insertResult = await db.insert(portalClientBranches).values({
      clientId: data.headOfficeClientId,
      sourceClientId: sourceClient.id,
      name: branchName,
      code: null,
      description: `Imported from existing client record ${sourceClient.companyName}.`,
      active: true,
      sortOrder: existingBranches.length + index,
    });
    const branchId = Number((insertResult as any)?.[0]?.insertId ?? 0);
    createdBranches.push({
      sourceClientId: sourceClient.id,
      branchId,
      branchName,
    });
    existingBranchNames.add(normalisePortalBranchName(branchName));
  }

  for (const sourceClient of sourceClients) {
    const branch = createdBranches.find((entry) => entry.sourceClientId === sourceClient.id);
    if (!branch) continue;

    await db
      .update(levelIIITechnicians)
      .set({
        clientId: data.headOfficeClientId,
        clientBranchId: branch.branchId,
      })
      .where(eq(levelIIITechnicians.clientId, sourceClient.id));

    const sourceActivities = await db
      .select()
      .from(levelIIIActivities)
      .where(eq(levelIIIActivities.clientId, sourceClient.id));
    for (const activity of sourceActivities) {
      const branchNote = `Imported branch context: ${sourceClient.companyName}`;
      const existingNotes = activity.notes?.trim() ?? "";
      const mergedNotes = existingNotes.includes(branchNote)
        ? existingNotes
        : [branchNote, existingNotes].filter(Boolean).join("\n");
      await db
        .update(levelIIIActivities)
        .set({
          clientId: data.headOfficeClientId,
          notes: mergedNotes || null,
        })
        .where(eq(levelIIIActivities.id, activity.id));
    }

    await db
      .update(portalServiceRequests)
      .set({
        clientId: data.headOfficeClientId,
        clientBranchId: branch.branchId,
      })
      .where(eq(portalServiceRequests.clientId, sourceClient.id));

    await db
      .update(portalAssessmentGuides)
      .set({
        clientId: data.headOfficeClientId,
        clientBranchId: branch.branchId,
      })
      .where(eq(portalAssessmentGuides.clientId, sourceClient.id));

    await db
      .update(portalClientDocuments)
      .set({
        clientId: data.headOfficeClientId,
        clientBranchId: branch.branchId,
      })
      .where(eq(portalClientDocuments.clientId, sourceClient.id));

    await db
      .update(portalClientResources)
      .set({
        clientId: data.headOfficeClientId,
        clientBranchId: branch.branchId,
      })
      .where(eq(portalClientResources.clientId, sourceClient.id));

    const sourceComments = await db
      .select()
      .from(portalClientComments)
      .where(eq(portalClientComments.clientId, sourceClient.id));
    for (const comment of sourceComments) {
      const branchNote = `Imported from branch client ${sourceClient.companyName}.`;
      const existingNotes = comment.internalNotes?.trim() ?? "";
      const mergedNotes = existingNotes.includes(branchNote)
        ? existingNotes
        : [branchNote, existingNotes].filter(Boolean).join("\n");
      await db
        .update(portalClientComments)
        .set({
          clientId: data.headOfficeClientId,
          internalNotes: mergedNotes || null,
        })
        .where(eq(portalClientComments.id, comment.id));
    }

    await db
      .update(portalApprovalRequests)
      .set({
        clientId: data.headOfficeClientId,
      })
      .where(eq(portalApprovalRequests.clientId, sourceClient.id));

    const sourceAssignments = await getPortalClientAssignments(sourceClient.id);
    const headOfficeAssignments = await getPortalClientAssignments(data.headOfficeClientId);
    for (const assignment of sourceAssignments) {
      const existingHeadOfficeAssignment = headOfficeAssignments.find(
        (item) => item.userId === assignment.userId
      );
      const mergedAccessLevel =
        existingHeadOfficeAssignment &&
        getPortalAccessLevelRank(existingHeadOfficeAssignment.accessLevel as PortalAccessLevel) >=
          getPortalAccessLevelRank(assignment.accessLevel as PortalAccessLevel)
          ? (existingHeadOfficeAssignment.accessLevel as PortalAccessLevel)
          : (assignment.accessLevel as PortalAccessLevel);

      await upsertPortalClientAssignment({
        clientId: data.headOfficeClientId,
        userId: assignment.userId,
        accessLevel: mergedAccessLevel,
        receiveReminders:
          assignment.receiveReminders || existingHeadOfficeAssignment?.receiveReminders || false,
      });

      if (existingHeadOfficeAssignment && existingHeadOfficeAssignment.branchIds.length === 0) {
        continue;
      }

      const mergedBranchIds = Array.from(
        new Set([...(existingHeadOfficeAssignment?.branchIds ?? []), branch.branchId])
      );
      await savePortalUserBranchAssignments({
        clientId: data.headOfficeClientId,
        userId: assignment.userId,
        branchIds: mergedBranchIds,
      });
    }

    await db.delete(portalClientUserBranches).where(eq(portalClientUserBranches.clientId, sourceClient.id));
    await db.delete(portalClientUsers).where(eq(portalClientUsers.clientId, sourceClient.id));

    const branchMigrationNote = `Linked under ${headOffice.companyName} as branch ${branch.branchName}.`;
    const existingClientNotes = sourceClient.notes?.trim() ?? "";
    const mergedClientNotes = existingClientNotes.includes(branchMigrationNote)
      ? existingClientNotes
      : [branchMigrationNote, existingClientNotes].filter(Boolean).join("\n");
    await db
      .update(levelIIIClients)
      .set({
        notes: mergedClientNotes || null,
      })
      .where(eq(levelIIIClients.id, sourceClient.id));
  }

  await syncLevelIIIClientVisitDates(data.headOfficeClientId);

  return {
    headOfficeClientId: data.headOfficeClientId,
    headOfficeName: headOffice.companyName,
    createdBranches,
    branchCount: createdBranches.length,
  };
}

export async function createPortalClientBranch(
  data: typeof portalClientBranches.$inferInsert
) {
  await ensureClientPortalRuntimeTables();
  await db.insert(portalClientBranches).values({
    clientId: data.clientId,
    sourceClientId: data.sourceClientId ?? null,
    name: cleanRequiredText(data.name, "Branch name"),
    code: normalisePortalBranchCode(data.code),
    description: cleanOptionalText(data.description),
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  });
  return getPortalBranchesForClient(data.clientId);
}

export async function updatePortalClientBranch(
  id: number,
  data: Partial<typeof portalClientBranches.$inferInsert>
) {
  await ensureClientPortalRuntimeTables();
  const existing = await db
    .select()
    .from(portalClientBranches)
    .where(eq(portalClientBranches.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Client branch not found.");
  }

  await db
    .update(portalClientBranches)
    .set({
      sourceClientId: data.sourceClientId === undefined ? undefined : data.sourceClientId ?? null,
      name: data.name === undefined ? undefined : cleanRequiredText(data.name, "Branch name"),
      code: data.code === undefined ? undefined : normalisePortalBranchCode(data.code),
      description:
        data.description === undefined ? undefined : cleanOptionalText(data.description),
      active: data.active ?? undefined,
      sortOrder: data.sortOrder === undefined ? undefined : data.sortOrder ?? 0,
    })
    .where(eq(portalClientBranches.id, id));

  return getPortalBranchesForClient(existing[0].clientId);
}

export async function deletePortalClientBranch(id: number) {
  await ensureClientPortalRuntimeTables();
  const existing = await db
    .select()
    .from(portalClientBranches)
    .where(eq(portalClientBranches.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Client branch not found.");
  }

  await db.delete(portalClientUserBranches).where(eq(portalClientUserBranches.branchId, id));
  await db
    .update(levelIIITechnicians)
    .set({ clientBranchId: null })
    .where(eq(levelIIITechnicians.clientBranchId, id));
  await db.delete(portalClientBranches).where(eq(portalClientBranches.id, id));
  return getPortalBranchesForClient(existing[0].clientId);
}

export async function getPortalAccessibleBranchesForUser(
  userId: number,
  role: User["role"],
  clientId: number
) {
  await ensureClientPortalRuntimeTables();
  const branches = await getPortalBranchesForClient(clientId);
  if (hasPortalAdminAccess(role)) {
    return branches;
  }

  const scopedAssignments = await db
    .select()
    .from(portalClientUserBranches)
    .where(
      and(
        eq(portalClientUserBranches.clientId, clientId),
        eq(portalClientUserBranches.userId, userId)
      )
    );

  if (scopedAssignments.length === 0) {
    return branches;
  }

  const allowedIds = new Set(scopedAssignments.map((assignment) => assignment.branchId));
  return branches.filter((branch) => allowedIds.has(branch.id));
}

export async function savePortalUserBranchAssignments(data: {
  clientId: number;
  userId: number;
  branchIds: number[];
}) {
  await ensureClientPortalRuntimeTables();
  await db
    .delete(portalClientUserBranches)
    .where(
      and(
        eq(portalClientUserBranches.clientId, data.clientId),
        eq(portalClientUserBranches.userId, data.userId)
      )
    );

  const uniqueBranchIds = Array.from(new Set(data.branchIds.filter((value) => Number(value) > 0)));
  if (uniqueBranchIds.length > 0) {
    await db.insert(portalClientUserBranches).values(
      uniqueBranchIds.map((branchId) => ({
        clientId: data.clientId,
        userId: data.userId,
        branchId,
      }))
    );
  }

  return getPortalAccessibleBranchesForUser(data.userId, "user", data.clientId);
}

export async function getPortalUserBranchAssignments(clientId: number, userId: number) {
  await ensureClientPortalRuntimeTables();
  const rows = await db
    .select()
    .from(portalClientUserBranches)
    .where(
      and(
        eq(portalClientUserBranches.clientId, clientId),
        eq(portalClientUserBranches.userId, userId)
      )
    );
  return rows.map((row) => row.branchId);
}

async function ensurePortalDefaultServiceDefinitions(clientId: number) {
  const existing = await db
    .select({ id: portalServiceDefinitions.id })
    .from(portalServiceDefinitions)
    .where(eq(portalServiceDefinitions.clientId, clientId))
    .limit(1);

  if (existing[0]) return;

  await db.insert(portalServiceDefinitions).values([
    {
      clientId,
      title: "Procedure Review / Change Request",
      category: "Procedure",
      description: "Request a procedure review, revision, or a brand new procedure.",
      instructions:
        "Use this when you need a procedure reviewed, changed, or added. Add branch, technique, and any deadline or scope notes that matter.",
      active: true,
      sortOrder: 10,
      config: normalisePortalServiceDefinitionConfig({
        allowBranchSelection: true,
        allowTechnicianSelection: false,
        allowMultipleTechniques: true,
        allowPreferredDate: false,
        requestLabel: "Request Procedure Support",
        requestedDocumentLabels: [
          "Current procedure or technique sheet",
          "Written practice or work instruction",
          "Any client-specific supporting notes",
        ],
      }),
    },
    {
      clientId,
      title: "Technician Assessment Booking",
      category: "Assessment",
      description: "Book an assessment or request a proposed assessment slot for one technician.",
      instructions:
        "Choose the technician, branch, preferred date, and all techniques that should be covered during the assessment.",
      active: true,
      sortOrder: 20,
      config: normalisePortalServiceDefinitionConfig({
        allowBranchSelection: true,
        allowTechnicianSelection: true,
        allowMultipleTechniques: true,
        allowPreferredDate: true,
        requestLabel: "Book Assessment",
        requestedDocumentLabels: [
          "Technician ID document",
          "Technician CV",
          "Relevant log books",
          "Current certificates and qualifications",
          "Result notices",
          "Code of ethics",
          "Lifetime dose record (RT only)",
        ],
      }),
    },
  ]);
}

async function ensurePortalDefaultAssessmentGuides(clientId: number) {
  const existing = await db
    .select({ id: portalAssessmentGuides.id })
    .from(portalAssessmentGuides)
    .where(eq(portalAssessmentGuides.clientId, clientId))
    .limit(1);

  if (existing[0]) return;

  await db.insert(portalAssessmentGuides).values({
    clientId,
    title: "RT Assessment Preparation",
    techniqueName: "RT",
    description:
      "Default RT preparation guide. This is fully editable and can be tailored per client or branch.",
    bringItems: [
      "TLD or Film Badge (valid and with the technician's name on it)",
      "EPD (calibrated)",
      "Radiation monitor (calibrated)",
      "Isotope projector",
      "Projector key",
      "Films for the techniques required for approval or assessment",
      "Masking tape",
      "RT toolbox (lead numbers, reference markers, IQI's, stationery)",
      "Collimator",
      "Timing device",
    ],
    companyItems: [
      "Technician ID document",
      "Technician CV",
      "All relevant log books (hours per technique)",
      "All current certificates and qualifications",
      "Result notice for the certificates held",
      "Code of ethics",
      "Lifetime dose record (RT technicians only)",
    ],
    active: true,
    sortOrder: 10,
  });
}

export async function getPortalServiceDefinitions(clientId: number) {
  await ensureClientPortalRuntimeTables();
  await ensurePortalDefaultServiceDefinitions(clientId);
  const rows = await db
    .select()
    .from(portalServiceDefinitions)
    .where(eq(portalServiceDefinitions.clientId, clientId));
  return rows
    .map((row) => ({
      ...row,
      config: normalisePortalServiceDefinitionConfig(row.config),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.title.localeCompare(b.title);
    });
}

export async function createPortalServiceDefinition(
  data: typeof portalServiceDefinitions.$inferInsert
) {
  await ensureClientPortalRuntimeTables();
  await db.insert(portalServiceDefinitions).values({
    clientId: data.clientId,
    title: cleanRequiredText(data.title, "Service title"),
    category: cleanRequiredText(data.category ?? "General", "Category"),
    description: cleanOptionalText(data.description),
    instructions: cleanOptionalText(data.instructions),
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    config: normalisePortalServiceDefinitionConfig(data.config),
  });
  return getPortalServiceDefinitions(data.clientId);
}

export async function updatePortalServiceDefinition(
  id: number,
  data: Partial<typeof portalServiceDefinitions.$inferInsert>
) {
  await ensureClientPortalRuntimeTables();
  const existing = await db
    .select()
    .from(portalServiceDefinitions)
    .where(eq(portalServiceDefinitions.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Service definition not found.");
  }

  await db
    .update(portalServiceDefinitions)
    .set({
      title: data.title === undefined ? undefined : cleanRequiredText(data.title, "Service title"),
      category:
        data.category === undefined
          ? undefined
          : cleanRequiredText(data.category, "Category"),
      description:
        data.description === undefined ? undefined : cleanOptionalText(data.description),
      instructions:
        data.instructions === undefined ? undefined : cleanOptionalText(data.instructions),
      active: data.active ?? undefined,
      sortOrder: data.sortOrder === undefined ? undefined : data.sortOrder ?? 0,
      config:
        data.config === undefined
          ? undefined
          : normalisePortalServiceDefinitionConfig(data.config),
    })
    .where(eq(portalServiceDefinitions.id, id));

  return getPortalServiceDefinitions(existing[0].clientId);
}

export async function createPortalServiceRequest(data: {
  clientId: number;
  clientBranchId?: number | null;
  serviceDefinitionId?: number | null;
  userId: number;
  technicianId?: number | null;
  title: string;
  requestType: string;
  preferredDate?: Date | string | null;
  techniques?: string[] | null;
  details?: string | null;
  requestedDocuments?: string[] | null;
  metadata?: Record<string, unknown> | null;
}) {
  await ensureClientPortalRuntimeTables();
  const metadata = normalisePortalServiceRequestMetadata(data.metadata);
  const result = await db.insert(portalServiceRequests).values({
    clientId: data.clientId,
    clientBranchId: data.clientBranchId ?? null,
    serviceDefinitionId: data.serviceDefinitionId ?? null,
    userId: data.userId,
    technicianId: data.technicianId ?? null,
    title: cleanRequiredText(data.title, "Request title"),
    requestType: cleanRequiredText(data.requestType, "Request type"),
    status: "submitted",
    preferredDate: parseOptionalLevelIIIDate(data.preferredDate),
    techniques: cleanStringArray(data.techniques ?? []),
    details: cleanOptionalText(data.details),
    requestedDocuments: cleanStringArray(data.requestedDocuments ?? []),
    metadata,
  });
  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  return insertId;
}

export async function getPortalServiceRequestsForClient(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  await ensureClientPortalRuntimeTables();
  const rows = await db
    .select()
    .from(portalServiceRequests)
    .where(eq(portalServiceRequests.clientId, clientId));

  const allowedBranchIds = options?.branchIds ?? null;
  const filtered = Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0
    ? rows.filter(
        (row) =>
          row.clientBranchId === null ||
          row.clientBranchId === undefined ||
          allowedBranchIds.includes(Number(row.clientBranchId))
      )
    : rows;

  const userIds = Array.from(new Set(filtered.map((row) => row.userId)));
  const technicianIds = Array.from(
    new Set(filtered.map((row) => row.technicianId).filter((value): value is number => Number(value) > 0))
  );
  const branchIds = Array.from(
    new Set(filtered.map((row) => row.clientBranchId).filter((value): value is number => Number(value) > 0))
  );
  const definitionIds = Array.from(
    new Set(filtered.map((row) => row.serviceDefinitionId).filter((value): value is number => Number(value) > 0))
  );
  const linkedActivityIds = Array.from(
    new Set(
      filtered
        .map((row) => normalisePortalServiceRequestMetadata(row.metadata).linkedActivityId)
        .filter((value): value is number => Number(value) > 0)
    )
  );

  const [relatedUsers, technicians, branches, definitions, linkedActivities] = await Promise.all([
    userIds.length > 0 ? db.select().from(users).where(inArray(users.id, userIds)) : [],
    technicianIds.length > 0
      ? db.select().from(levelIIITechnicians).where(inArray(levelIIITechnicians.id, technicianIds))
      : [],
    branchIds.length > 0
      ? db.select().from(portalClientBranches).where(inArray(portalClientBranches.id, branchIds))
      : [],
    definitionIds.length > 0
      ? db.select().from(portalServiceDefinitions).where(inArray(portalServiceDefinitions.id, definitionIds))
      : [],
    linkedActivityIds.length > 0
      ? db.select().from(levelIIIActivities).where(inArray(levelIIIActivities.id, linkedActivityIds))
      : [],
  ]);

  const userMap = new Map(relatedUsers.map((entry) => [entry.id, entry] as const));
  const technicianMap = new Map(technicians.map((entry) => [entry.id, entry] as const));
  const branchMap = new Map(branches.map((entry) => [entry.id, entry] as const));
  const definitionMap = new Map(definitions.map((entry) => [entry.id, entry] as const));
  const linkedActivityMap = new Map(linkedActivities.map((entry) => [entry.id, entry] as const));

  return filtered
    .map((row) => {
      const metadata = normalisePortalServiceRequestMetadata(row.metadata);
      return {
        ...row,
        techniques: cleanStringArray(row.techniques),
        requestedDocuments: cleanStringArray(row.requestedDocuments),
        metadata,
        supportingDocuments: metadata.supportingDocuments,
        linkedActivity:
          metadata.linkedActivityId && linkedActivityMap.has(metadata.linkedActivityId)
            ? linkedActivityMap.get(metadata.linkedActivityId)
            : null,
        branchName: row.clientBranchId ? branchMap.get(row.clientBranchId)?.name ?? null : null,
        technicianName: row.technicianId ? technicianMap.get(row.technicianId)?.name ?? null : null,
        requestedByName: userMap.get(row.userId)?.name ?? null,
        requestedByEmail: userMap.get(row.userId)?.email ?? null,
        serviceDefinitionTitle: row.serviceDefinitionId
          ? definitionMap.get(row.serviceDefinitionId)?.title ?? null
          : null,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function updatePortalServiceRequestStatus(
  id: number,
  data: {
    status?: PortalServiceRequestStatus | null;
    internalNotes?: string | null;
    metadata?: Record<string, unknown> | null;
  }
) {
  await ensureClientPortalRuntimeTables();
  const existing = await db
    .select()
    .from(portalServiceRequests)
    .where(eq(portalServiceRequests.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Service request not found.");
  }
  const nextMetadata =
    data.metadata === undefined
      ? undefined
      : normalisePortalServiceRequestMetadata({
          ...normalisePortalServiceRequestMetadata(existing[0].metadata),
          ...(data.metadata ?? {}),
        });
  await db
    .update(portalServiceRequests)
    .set({
      status: data.status ?? undefined,
      internalNotes:
        data.internalNotes === undefined ? undefined : cleanOptionalText(data.internalNotes),
      metadata: nextMetadata,
    })
    .where(eq(portalServiceRequests.id, id));
  return getPortalServiceRequestsForClient(existing[0].clientId);
}

export async function getPortalAssessmentGuidesForClient(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  await ensureClientPortalRuntimeTables();
  await ensurePortalDefaultAssessmentGuides(clientId);
  const rows = await db
    .select()
    .from(portalAssessmentGuides)
    .where(eq(portalAssessmentGuides.clientId, clientId));

  const allowedBranchIds = options?.branchIds ?? null;
  const filtered = Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0
    ? rows.filter(
        (row) =>
          row.clientBranchId === null ||
          row.clientBranchId === undefined ||
          allowedBranchIds.includes(Number(row.clientBranchId))
      )
    : rows;

  const branchIds = Array.from(
    new Set(filtered.map((row) => row.clientBranchId).filter((value): value is number => Number(value) > 0))
  );
  const relatedBranches =
    branchIds.length > 0
      ? await db.select().from(portalClientBranches).where(inArray(portalClientBranches.id, branchIds))
      : [];
  const branchMap = new Map(relatedBranches.map((entry) => [entry.id, entry] as const));

  return filtered
    .map((row) => ({
      ...row,
      bringItems: cleanStringArray(row.bringItems),
      companyItems: cleanStringArray(row.companyItems),
      branchName: row.clientBranchId ? branchMap.get(row.clientBranchId)?.name ?? null : null,
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.techniqueName.localeCompare(b.techniqueName);
    });
}

export async function createPortalAssessmentGuide(
  data: typeof portalAssessmentGuides.$inferInsert
) {
  await ensureClientPortalRuntimeTables();
  await db.insert(portalAssessmentGuides).values({
    clientId: data.clientId,
    clientBranchId: data.clientBranchId ?? null,
    title: cleanRequiredText(data.title, "Guide title"),
    techniqueName: cleanRequiredText(data.techniqueName, "Technique"),
    description: cleanOptionalText(data.description),
    bringItems: cleanStringArray(data.bringItems ?? []),
    companyItems: cleanStringArray(data.companyItems ?? []),
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
  });
  return getPortalAssessmentGuidesForClient(data.clientId);
}

export async function updatePortalAssessmentGuide(
  id: number,
  data: Partial<typeof portalAssessmentGuides.$inferInsert>
) {
  await ensureClientPortalRuntimeTables();
  const existing = await db
    .select()
    .from(portalAssessmentGuides)
    .where(eq(portalAssessmentGuides.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Assessment guide not found.");
  }

  await db
    .update(portalAssessmentGuides)
    .set({
      clientBranchId:
        data.clientBranchId === undefined ? undefined : data.clientBranchId ?? null,
      title: data.title === undefined ? undefined : cleanRequiredText(data.title, "Guide title"),
      techniqueName:
        data.techniqueName === undefined
          ? undefined
          : cleanRequiredText(data.techniqueName, "Technique"),
      description:
        data.description === undefined ? undefined : cleanOptionalText(data.description),
      bringItems:
        data.bringItems === undefined ? undefined : cleanStringArray(data.bringItems ?? []),
      companyItems:
        data.companyItems === undefined ? undefined : cleanStringArray(data.companyItems ?? []),
      active: data.active ?? undefined,
      sortOrder: data.sortOrder === undefined ? undefined : data.sortOrder ?? 0,
    })
    .where(eq(portalAssessmentGuides.id, id));

  return getPortalAssessmentGuidesForClient(existing[0].clientId);
}

export async function getPortalTechniciansForClient(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  const rows = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.clientId, clientId));

  const allowedBranchIds = options?.branchIds ?? null;
  const filtered =
    Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0
      ? rows.filter(
          (row) =>
            row.clientBranchId === null ||
            row.clientBranchId === undefined ||
            allowedBranchIds.includes(Number(row.clientBranchId))
        )
      : rows;

  return filtered
    .map((row) => normaliseLevelIIITechnician(row))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getPortalRequirementDefinitionsForClient(clientId: number) {
  await ensureClientPortalRuntimeTables();

  const rows = await db
    .select()
    .from(portalRequirementDefinitions)
    .where(eq(portalRequirementDefinitions.clientId, clientId));

  return rows
    .map((row) => ({
      ...row,
      customFields: normalisePortalRequirementCustomFields(row.customFields),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
}

function ensureAllowedClientDocumentLabel(
  documentTitle: string,
  settings: PortalClientReminderSettings
) {
  return resolveAllowedClientDocumentLabel(
    documentTitle,
    cleanRuleStringArray(settings.allowedClientDocumentLabels)
  );
}

export async function buildPortalClientDocumentStoragePlan(data: {
  clientId: number;
  title: string;
  clientBranchId?: number | null;
  fileDataUrl?: string | null;
  fileNameHint?: string | null;
}) {
  await ensureClientPortalRuntimeTables();

  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);
  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  const settings = await getPortalClientReminderSettings(data.clientId);
  const documentTitle = ensureAllowedClientDocumentLabel(data.title, settings);
  const branch =
    data.clientBranchId && Number(data.clientBranchId) > 0
      ? (
          await db
            .select()
            .from(portalClientBranches)
            .where(eq(portalClientBranches.id, Number(data.clientBranchId)))
            .limit(1)
        )[0] ?? null
      : null;

  const contentType = data.fileDataUrl ? parseDataUrlPayload(data.fileDataUrl).contentType : null;
  const fileName = buildPortalFileName(
    `${client[0].companyName}${branch?.name ? ` - ${branch.name}` : ""} - ${documentTitle}`,
    contentType,
    data.fileNameHint
  );

  return {
    title: documentTitle,
    scope: branch?.name
      ? `client-documents/${slugifyStorageSegment(branch.name, "branch")}/${slugifyStorageSegment(documentTitle, "document")}`
      : `client-documents/general/${slugifyStorageSegment(documentTitle, "document")}`,
    fileName,
  };
}

export async function buildPortalRequirementDocumentStoragePlan(data: {
  clientId: number;
  technicianId: number;
  definitionId: number;
  fileDataUrl?: string | null;
  fileNameHint?: string | null;
}) {
  await ensureClientPortalRuntimeTables();

  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, data.technicianId))
    .limit(1);
  if (!technician[0] || technician[0].clientId !== data.clientId) {
    throw new Error("Technician does not belong to the selected client.");
  }

  const definition = await db
    .select()
    .from(portalRequirementDefinitions)
    .where(eq(portalRequirementDefinitions.id, data.definitionId))
    .limit(1);
  if (!definition[0] || definition[0].clientId !== data.clientId) {
    throw new Error("Requirement definition does not belong to the selected client.");
  }

  const contentType = data.fileDataUrl ? parseDataUrlPayload(data.fileDataUrl).contentType : null;
  return {
    scope: `technicians/${slugifyStorageSegment(technician[0].name, "technician")}/${slugifyStorageSegment(definition[0].name, "requirement")}`,
    fileName: buildPortalFileName(
      `${technician[0].name} - ${definition[0].name}`,
      contentType,
      data.fileNameHint
    ),
  };
}

export async function createPortalRequirementDefinition(
  data: typeof portalRequirementDefinitions.$inferInsert
) {
  await ensureClientPortalRuntimeTables();

  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);
  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  const createdName = cleanRequiredText(data.name, "Requirement name").trim().toLowerCase();
  const existingDefinitions = await getPortalRequirementDefinitionsForClient(data.clientId);
  const existingDefinition =
    existingDefinitions.find((definition) => definition.name.trim().toLowerCase() === createdName) ??
    null;
  if (existingDefinition) {
    return existingDefinition;
  }

  await db.insert(portalRequirementDefinitions).values({
    clientId: data.clientId,
    name: cleanRequiredText(data.name, "Requirement name"),
    category: cleanRequiredText(data.category ?? "General", "Category"),
    description: cleanOptionalText(data.description),
    validityDays: data.validityDays ?? null,
    reminderDays: data.reminderDays ?? 30,
    isRequired: data.isRequired ?? true,
    active: data.active ?? true,
    sortOrder: data.sortOrder ?? 0,
    customFields: normalisePortalRequirementCustomFields(data.customFields),
  });

  const definitions = await getPortalRequirementDefinitionsForClient(data.clientId);
  const createdDefinition =
    definitions.find((definition) => definition.name.trim().toLowerCase() === createdName) ?? null;
  if (!createdDefinition) {
    throw new Error("Requirement definition could not be created.");
  }

  return createdDefinition;
}

export async function updatePortalRequirementDefinition(
  id: number,
  data: Partial<typeof portalRequirementDefinitions.$inferInsert>
) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalRequirementDefinitions)
    .where(eq(portalRequirementDefinitions.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Requirement definition not found.");
  }

  if (data.name !== undefined) {
    const nextName = cleanRequiredText(data.name, "Requirement name").trim().toLowerCase();
    const siblingDefinitions = await getPortalRequirementDefinitionsForClient(existing[0].clientId);
    const conflictingDefinition =
      siblingDefinitions.find(
        (definition) =>
          definition.id !== id && definition.name.trim().toLowerCase() === nextName
      ) ?? null;
    if (conflictingDefinition) {
      throw new Error("A Level III technician document type with this name already exists.");
    }
  }

  await db
    .update(portalRequirementDefinitions)
    .set({
      name: data.name === undefined ? undefined : cleanRequiredText(data.name, "Requirement name"),
      category:
        data.category === undefined
          ? undefined
          : cleanRequiredText(data.category, "Category"),
      description:
        data.description === undefined ? undefined : cleanOptionalText(data.description),
      validityDays: data.validityDays === undefined ? undefined : data.validityDays ?? null,
      reminderDays: data.reminderDays,
      isRequired: data.isRequired,
      active: data.active,
      sortOrder: data.sortOrder,
      customFields:
        data.customFields === undefined
          ? undefined
          : normalisePortalRequirementCustomFields(data.customFields),
    })
    .where(eq(portalRequirementDefinitions.id, id));

  return getPortalRequirementDefinitionsForClient(existing[0].clientId);
}

export async function getPortalRequirementMatrixForClient(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  await ensureClientPortalRuntimeTables();

  const [technicians, definitions] = await Promise.all([
    getPortalTechniciansForClient(clientId, options),
    getPortalRequirementDefinitionsForClient(clientId),
  ]);

  const activeDefinitions = definitions.filter((definition) => definition.active);
  const technicianIds = technicians.map((technician) => technician.id);
  const definitionIds = activeDefinitions.map((definition) => definition.id);

  const records =
    technicianIds.length > 0 && definitionIds.length > 0
      ? await db
          .select()
          .from(portalTechnicianRequirements)
          .where(
            and(
              inArray(portalTechnicianRequirements.technicianId, technicianIds),
              inArray(portalTechnicianRequirements.definitionId, definitionIds)
            )
          )
      : [];

  const recordIds = records.map((record) => record.id);
  const documents =
    recordIds.length > 0
      ? await db
          .select()
          .from(portalRequirementDocuments)
          .where(inArray(portalRequirementDocuments.technicianRequirementId, recordIds))
      : [];
  const sourceReferences =
    recordIds.length > 0
      ? await db
          .select()
          .from(portalRequirementSourceReferences)
          .where(inArray(portalRequirementSourceReferences.technicianRequirementId, recordIds))
      : [];

  const documentsByRequirementId = new Map<number, typeof documents>();
  documents.forEach((document) => {
    const list = documentsByRequirementId.get(document.technicianRequirementId) ?? [];
    list.push(document);
    documentsByRequirementId.set(document.technicianRequirementId, list);
  });
  const sourceReferencesByRequirementId = new Map<number, typeof sourceReferences>();
  sourceReferences.forEach((reference) => {
    const list = sourceReferencesByRequirementId.get(reference.technicianRequirementId) ?? [];
    list.push(reference);
    sourceReferencesByRequirementId.set(reference.technicianRequirementId, list);
  });

  const recordMap = new Map(
    records.map((record) => [`${record.technicianId}:${record.definitionId}`, record] as const)
  );

  return technicians.flatMap((technician) =>
    activeDefinitions.map((definition) => {
      const record = recordMap.get(`${technician.id}:${definition.id}`) ?? null;
      const requirementDocuments = record
        ? (documentsByRequirementId.get(record.id) ?? []).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [];
      const requirementSourceReferences = record
        ? (sourceReferencesByRequirementId.get(record.id) ?? []).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        : [];
      const computedStatus = computePortalRequirementStatus({
        explicitStatus: (record?.status as PortalRequirementStatus | undefined) ?? "missing",
        issuedAt: record?.issuedAt ?? null,
        validUntil: record?.validUntil ?? null,
        reminderDays: definition.reminderDays,
      });
      const definitionCustomFields = normalisePortalRequirementCustomFields(
        definition.customFields
      );
      const customFieldValues = normalisePortalRequirementCustomFieldValues(
        definitionCustomFields,
        record?.customFieldValues ?? {},
        { validateRequired: false }
      );

      return {
        recordId: record?.id ?? null,
        technicianId: technician.id,
        technicianName: technician.name,
        technicianEmail: technician.email,
        technicianMethods: technician.methods,
        technicianLevel: technician.level,
        definitionId: definition.id,
        definitionName: definition.name,
        definitionCategory: definition.category,
        definitionDescription: definition.description,
        validityDays: definition.validityDays,
        reminderDays: definition.reminderDays,
        isRequired: definition.isRequired,
        definitionCustomFields,
        status: computedStatus,
        issuedAt: record?.issuedAt ?? null,
        validUntil: record?.validUntil ?? null,
        notes: record?.notes ?? null,
        customFieldValues,
        documentCount: requirementDocuments.length,
        latestDocumentName: requirementDocuments[0]?.fileName ?? null,
        latestDocumentUrl: resolveStoredFileUrl(
          requirementDocuments[0]?.fileKey,
          requirementDocuments[0]?.fileUrl
        ),
        sourceReferenceCount: requirementSourceReferences.length,
        latestSourceReferenceFileName: requirementSourceReferences[0]?.sourceFileName ?? null,
        latestSourceReferencePath: requirementSourceReferences[0]?.sourcePath ?? null,
      };
    })
  );
}

export async function getPortalDashboardForClient(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  const matrix = await getPortalRequirementMatrixForClient(clientId, options);
  const portalDocuments = await getPortalClientDocuments(clientId, options);
  const uniqueTechnicianIds = new Set(matrix.map((entry) => entry.technicianId));
  const uniqueDefinitionIds = new Set(matrix.map((entry) => entry.definitionId));
  const reminders = matrix
    .filter((entry) => entry.status === "expired" || entry.status === "expiring" || entry.status === "pending_review")
    .sort((a, b) => {
      const aTime = a.validUntil ? new Date(a.validUntil).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.validUntil ? new Date(b.validUntil).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    })
    .slice(0, 8);

  return {
    technicianCount: uniqueTechnicianIds.size,
    requirementDefinitionCount: uniqueDefinitionIds.size,
    totalTrackedItems: matrix.length,
    missingCount: matrix.filter((entry) => entry.status === "missing").length,
    expiringCount: matrix.filter((entry) => entry.status === "expiring").length,
    expiredCount: matrix.filter((entry) => entry.status === "expired").length,
    pendingReviewCount: matrix.filter((entry) => entry.status === "pending_review").length,
    documentCount: portalDocuments.length,
    documentReviewDueCount: portalDocuments.filter((document) => document.health === "review_due").length,
    documentExpiredCount: portalDocuments.filter((document) => document.health === "expired").length,
    reminders,
  };
}

export async function getPortalClientDocuments(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  await ensureClientPortalRuntimeTables();

  const rows = await db
    .select()
    .from(portalClientDocuments)
    .where(eq(portalClientDocuments.clientId, clientId));

  const allowedBranchIds = options?.branchIds ?? null;
  const filtered =
    Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0
      ? rows.filter(
          (row) =>
            row.clientBranchId === null ||
            row.clientBranchId === undefined ||
            allowedBranchIds.includes(Number(row.clientBranchId))
        )
      : rows;

  const branchIds = Array.from(
    new Set(filtered.map((row) => row.clientBranchId).filter((value): value is number => Number(value) > 0))
  );
  const branches =
    branchIds.length > 0
      ? await db.select().from(portalClientBranches).where(inArray(portalClientBranches.id, branchIds))
      : [];
  const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));

  return filtered
    .map((row) => ({
      ...row,
      fileUrl: resolveStoredFileUrl(row.fileKey, row.fileUrl),
      sourceFileName: cleanOptionalText((row as any).sourceFileName),
      sourcePath: cleanOptionalText((row as any).sourcePath),
      branchName: row.clientBranchId ? branchMap.get(row.clientBranchId)?.name ?? null : null,
      health: computePortalDocumentHealth({
        status: row.status,
        reviewDate: row.reviewDate,
        validUntil: row.validUntil,
      }),
    }))
    .sort((a, b) => {
      const leftTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const rightTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export async function createPortalClientDocument(data: {
  clientId: number;
  clientBranchId?: number | null;
  title: string;
  category?: string | null;
  description?: string | null;
  fileName: string;
  fileDataUrl?: string | null;
  sourceFileName?: string | null;
  sourcePath?: string | null;
  reviewDate?: Date | string | null;
  validUntil?: Date | string | null;
  status?: PortalClientDocumentStatus | null;
  uploadedByUserId?: number | null;
  storedFile?: PortalStoredFileReference | null;
  fileNameHint?: string | null;
}) {
  await ensureClientPortalRuntimeTables();

  const storagePlan = await buildPortalClientDocumentStoragePlan({
    clientId: data.clientId,
    title: data.title,
    clientBranchId: data.clientBranchId ?? null,
    fileDataUrl: data.fileDataUrl ?? null,
    fileNameHint: data.fileNameHint ?? data.fileName,
  });

  let storedFile = data.storedFile ?? null;
  if (!storedFile) {
    if (!data.fileDataUrl && !data.sourcePath) {
      throw new Error("Please upload a file for this document.");
    }
    storedFile = data.fileDataUrl
      ? await stagePortalApprovalFile({
          clientId: data.clientId,
          scope: storagePlan.scope,
          fileName: storagePlan.fileName,
          fileDataUrl: data.fileDataUrl,
        })
      : ({
          fileName: cleanOptionalText(data.sourceFileName) ?? data.fileName,
          fileUrl: "",
          fileKey: "",
          contentType: null,
        } satisfies PortalStoredFileReference);
  }

  const result = await db.insert(portalClientDocuments).values({
    clientId: data.clientId,
    clientBranchId: data.clientBranchId ?? null,
    title: storagePlan.title,
    category: cleanRequiredText(data.category ?? "General", "Category"),
    description: cleanOptionalText(data.description),
    fileName: storedFile.fileName,
    fileUrl: storedFile.fileUrl,
    fileKey: storedFile.fileKey,
    contentType: storedFile.contentType,
    sourceFileName: cleanOptionalText(data.sourceFileName),
    sourcePath: cleanOptionalText(data.sourcePath),
    reviewDate: parseOptionalLevelIIIDate(data.reviewDate),
    validUntil: parseOptionalLevelIIIDate(data.validUntil),
    status: data.status ?? "active",
    uploadedByUserId: data.uploadedByUserId ?? null,
  });

  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  return (
    await db
      .select()
      .from(portalClientDocuments)
      .where(eq(portalClientDocuments.id, insertId))
      .limit(1)
  )[0];
}

export async function updatePortalClientDocument(
  id: number,
  data: {
    clientBranchId?: number | null;
    title?: string;
    category?: string | null;
    description?: string | null;
    sourceFileName?: string | null;
    sourcePath?: string | null;
    reviewDate?: Date | string | null;
    validUntil?: Date | string | null;
    status?: PortalClientDocumentStatus | null;
  }
) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalClientDocuments)
    .where(eq(portalClientDocuments.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Client document not found.");
  }
  const reminderSettings = await getPortalClientReminderSettings(existing[0].clientId);
  const validatedTitle =
    data.title === undefined
      ? undefined
      : ensureAllowedClientDocumentLabel(data.title, reminderSettings);

  await db
    .update(portalClientDocuments)
    .set({
      clientBranchId:
        data.clientBranchId === undefined ? undefined : data.clientBranchId ?? null,
      title: validatedTitle,
      category:
        data.category === undefined
          ? undefined
          : cleanRequiredText(data.category ?? "General", "Category"),
      description:
        data.description === undefined ? undefined : cleanOptionalText(data.description),
      sourceFileName:
        data.sourceFileName === undefined
          ? undefined
          : cleanOptionalText(data.sourceFileName),
      sourcePath:
        data.sourcePath === undefined
          ? undefined
          : cleanOptionalText(data.sourcePath),
      reviewDate:
        data.reviewDate === undefined ? undefined : parseOptionalLevelIIIDate(data.reviewDate),
      validUntil:
        data.validUntil === undefined ? undefined : parseOptionalLevelIIIDate(data.validUntil),
      status: data.status ?? undefined,
    })
    .where(eq(portalClientDocuments.id, id));

  return (
    await db
      .select()
      .from(portalClientDocuments)
      .where(eq(portalClientDocuments.id, id))
      .limit(1)
  )[0];
}

export async function deletePortalClientDocument(id: number) {
  await ensureClientPortalRuntimeTables();
  return db.delete(portalClientDocuments).where(eq(portalClientDocuments.id, id));
}

export async function getPortalCommentsForClient(clientId: number) {
  await ensureClientPortalRuntimeTables();

  const rows = await db
    .select()
    .from(portalClientComments)
    .where(eq(portalClientComments.clientId, clientId));

  const userIds = Array.from(new Set(rows.map((row) => row.userId)));
  const relatedUsers =
    userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
  const userMap = new Map(relatedUsers.map((user) => [user.id, user] as const));

  return rows
    .map((row) => ({
      ...row,
      createdByName: userMap.get(row.userId)?.name ?? null,
      createdByEmail: userMap.get(row.userId)?.email ?? null,
    }))
    .sort((a, b) => {
      const leftTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const rightTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export async function createPortalComment(data: {
  clientId: number;
  userId: number;
  requestType?: PortalClientCommentRequestType | null;
  subject: string;
  message: string;
}) {
  await ensureClientPortalRuntimeTables();

  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);
  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  await db.insert(portalClientComments).values({
    clientId: data.clientId,
    userId: data.userId,
    requestType: data.requestType ?? "general_comment",
    subject: cleanRequiredText(data.subject, "Subject"),
    message: cleanRequiredText(data.message, "Message"),
    status: "open",
  });

  return getPortalCommentsForClient(data.clientId);
}

export async function updatePortalCommentStatus(
  id: number,
  data: {
    status?: PortalClientCommentStatus | null;
    internalNotes?: string | null;
  }
) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalClientComments)
    .where(eq(portalClientComments.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Portal request was not found.");
  }

  await db
    .update(portalClientComments)
    .set({
      status: data.status ?? undefined,
      internalNotes:
        data.internalNotes === undefined ? undefined : cleanOptionalText(data.internalNotes),
    })
    .where(eq(portalClientComments.id, id));

  return getPortalCommentsForClient(existing[0].clientId);
}

export async function getPortalResourcesForClient(
  clientId: number,
  options?: { branchIds?: number[] | null }
) {
  await ensureClientPortalRuntimeTables();

  const rows = await db
    .select()
    .from(portalClientResources)
    .where(eq(portalClientResources.clientId, clientId));

  const allowedBranchIds = options?.branchIds ?? null;
  const filtered =
    Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0
      ? rows.filter(
          (row) =>
            row.clientBranchId === null ||
            row.clientBranchId === undefined ||
            allowedBranchIds.includes(Number(row.clientBranchId))
        )
      : rows;

  const branchIds = Array.from(
    new Set(filtered.map((row) => row.clientBranchId).filter((value): value is number => Number(value) > 0))
  );
  const branches =
    branchIds.length > 0
      ? await db.select().from(portalClientBranches).where(inArray(portalClientBranches.id, branchIds))
      : [];
  const branchMap = new Map(branches.map((branch) => [branch.id, branch] as const));

  return filtered
    .map((row) => ({
      ...row,
      fileUrl: resolveStoredFileUrl(row.fileKey, row.fileUrl),
      branchName: row.clientBranchId ? branchMap.get(row.clientBranchId)?.name ?? null : null,
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.title.localeCompare(b.title);
    });
}

export async function createPortalClientResource(data: {
  clientId: number;
  clientBranchId?: number | null;
  title: string;
  category?: string | null;
  description?: string | null;
  resourceType: PortalClientResourceType;
  linkUrl?: string | null;
  fileName?: string | null;
  fileDataUrl?: string | null;
  sortOrder?: number | null;
  active?: boolean | null;
  uploadedByUserId?: number | null;
  storedFile?: PortalStoredFileReference | null;
}) {
  await ensureClientPortalRuntimeTables();

  const client = await db
    .select()
    .from(levelIIIClients)
    .where(eq(levelIIIClients.id, data.clientId))
    .limit(1);
  if (!client[0]) {
    throw new Error("Selected client was not found.");
  }

  let fileName: string | null = null;
  let fileUrl: string | null = null;
  let fileKey: string | null = null;
  let contentType: string | null = null;
  let linkUrl: string | null = null;

  if (data.resourceType === "link") {
    linkUrl = cleanRequiredText(data.linkUrl ?? "", "Resource URL");
  } else {
    const storedFile =
      data.storedFile ??
      (data.fileDataUrl
        ? await stagePortalApprovalFile({
            clientId: data.clientId,
            scope: "resources",
            fileName: data.fileName ?? "resource-file",
            fileDataUrl: data.fileDataUrl,
          })
        : null);
    if (!storedFile) {
      throw new Error("Please upload a file for this resource.");
    }

    fileName = storedFile.fileName;
    fileUrl = storedFile.fileUrl;
    fileKey = storedFile.fileKey;
    contentType = storedFile.contentType;
  }

  await db.insert(portalClientResources).values({
    clientId: data.clientId,
    clientBranchId: data.clientBranchId ?? null,
    title: cleanRequiredText(data.title, "Resource title"),
    category: cleanRequiredText(data.category ?? "General", "Category"),
    description: cleanOptionalText(data.description),
    resourceType: data.resourceType,
    linkUrl,
    fileName,
    fileUrl,
    fileKey,
    contentType,
    sortOrder: data.sortOrder ?? 0,
    active: data.active ?? true,
    uploadedByUserId: data.uploadedByUserId ?? null,
  });

  return getPortalResourcesForClient(data.clientId);
}

export async function updatePortalClientResource(
  id: number,
  data: {
    clientBranchId?: number | null;
    title?: string;
    category?: string | null;
    description?: string | null;
    linkUrl?: string | null;
    sortOrder?: number | null;
    active?: boolean | null;
  }
) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalClientResources)
    .where(eq(portalClientResources.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Client resource not found.");
  }

  await db
    .update(portalClientResources)
    .set({
      clientBranchId:
        data.clientBranchId === undefined ? undefined : data.clientBranchId ?? null,
      title: data.title === undefined ? undefined : cleanRequiredText(data.title, "Resource title"),
      category:
        data.category === undefined
          ? undefined
          : cleanRequiredText(data.category ?? "General", "Category"),
      description:
        data.description === undefined ? undefined : cleanOptionalText(data.description),
      linkUrl:
        existing[0].resourceType === "link"
          ? data.linkUrl === undefined
            ? undefined
            : cleanRequiredText(data.linkUrl ?? "", "Resource URL")
          : undefined,
      sortOrder: data.sortOrder === undefined ? undefined : data.sortOrder ?? 0,
      active: data.active ?? undefined,
    })
    .where(eq(portalClientResources.id, id));

  return getPortalResourcesForClient(existing[0].clientId);
}

export async function deletePortalClientResource(id: number) {
  await ensureClientPortalRuntimeTables();
  return db.delete(portalClientResources).where(eq(portalClientResources.id, id));
}

export async function upsertPortalTechnicianRequirement(data: {
  technicianId: number;
  definitionId: number;
  status?: PortalRequirementStatus | null;
  issuedAt?: Date | string | null;
  validUntil?: Date | string | null;
  notes?: string | null;
  customFieldValues?: Record<string, unknown> | null;
  uploadedByUserId?: number | null;
}) {
  await ensureClientPortalRuntimeTables();

  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, data.technicianId))
    .limit(1);
  if (!technician[0]) {
    throw new Error("Technician not found.");
  }

  const definition = await db
    .select()
    .from(portalRequirementDefinitions)
    .where(eq(portalRequirementDefinitions.id, data.definitionId))
    .limit(1);
  if (!definition[0]) {
    throw new Error("Requirement definition not found.");
  }

  if (definition[0].clientId !== technician[0].clientId) {
    throw new Error("Technician and requirement must belong to the same client.");
  }
  const definitionCustomFields = normalisePortalRequirementCustomFields(
    definition[0].customFields
  );

  const issuedAt = parseOptionalLevelIIIDate(data.issuedAt);
  const resolvedValidUntil =
    data.validUntil !== undefined
      ? parseOptionalLevelIIIDate(data.validUntil)
      : issuedAt && definition[0].validityDays
        ? addLevelIIIDays(issuedAt, definition[0].validityDays)
        : null;
  const resolvedStatus = computePortalRequirementStatus({
    explicitStatus: data.status ?? null,
    issuedAt,
    validUntil: resolvedValidUntil,
    reminderDays: definition[0].reminderDays,
  });
  const resolvedCustomFieldValues = normalisePortalRequirementCustomFieldValues(
    definitionCustomFields,
    data.customFieldValues ?? {},
    { validateRequired: true }
  );

  const existing = await db
    .select()
    .from(portalTechnicianRequirements)
    .where(
      and(
        eq(portalTechnicianRequirements.technicianId, data.technicianId),
        eq(portalTechnicianRequirements.definitionId, data.definitionId)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(portalTechnicianRequirements)
      .set({
        status: resolvedStatus,
        issuedAt,
        validUntil: resolvedValidUntil,
        notes: cleanOptionalText(data.notes),
        customFieldValues: resolvedCustomFieldValues,
        uploadedByUserId: data.uploadedByUserId ?? null,
      })
      .where(eq(portalTechnicianRequirements.id, existing[0].id));

    return (
      await db
        .select()
        .from(portalTechnicianRequirements)
        .where(eq(portalTechnicianRequirements.id, existing[0].id))
        .limit(1)
    )[0];
  }

  const result = await db.insert(portalTechnicianRequirements).values({
    technicianId: data.technicianId,
    definitionId: data.definitionId,
    status: resolvedStatus,
    issuedAt,
    validUntil: resolvedValidUntil,
    notes: cleanOptionalText(data.notes),
    customFieldValues: resolvedCustomFieldValues,
    uploadedByUserId: data.uploadedByUserId ?? null,
  });

  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  return (
    await db
      .select()
      .from(portalTechnicianRequirements)
      .where(eq(portalTechnicianRequirements.id, insertId))
      .limit(1)
  )[0];
}

export async function uploadPortalRequirementDocument(data: {
  clientId: number;
  technicianRequirementId: number;
  fileName?: string | null;
  fileDataUrl?: string | null;
  uploadedByUserId?: number | null;
  storedFile?: PortalStoredFileReference | null;
}) {
  await ensureClientPortalRuntimeTables();

  const requirement = await db
    .select()
    .from(portalTechnicianRequirements)
    .where(eq(portalTechnicianRequirements.id, data.technicianRequirementId))
    .limit(1);
  if (!requirement[0]) {
    throw new Error("Requirement record not found.");
  }

  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, requirement[0].technicianId))
    .limit(1);
  if (!technician[0] || technician[0].clientId !== data.clientId) {
    throw new Error("Requirement record does not belong to the selected client.");
  }
  const storagePlan = await buildPortalRequirementDocumentStoragePlan({
    clientId: data.clientId,
    technicianId: requirement[0].technicianId,
    definitionId: requirement[0].definitionId,
    fileDataUrl: data.fileDataUrl ?? null,
    fileNameHint: data.fileName ?? null,
  });

  let storedFile = data.storedFile ?? null;
  if (!storedFile) {
    if (!data.fileDataUrl) {
      throw new Error("Please upload a file for this requirement.");
    }
    storedFile = await stagePortalApprovalFile({
      clientId: data.clientId,
      scope: storagePlan.scope,
      fileName: storagePlan.fileName,
      fileDataUrl: data.fileDataUrl,
    });
  }

  const result = await db.insert(portalRequirementDocuments).values({
    technicianRequirementId: data.technicianRequirementId,
    fileName: storedFile.fileName,
    fileUrl: storedFile.fileUrl,
    fileKey: storedFile.fileKey,
    contentType: storedFile.contentType,
    uploadedByUserId: data.uploadedByUserId ?? null,
  });

  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  return (
    await db
      .select()
      .from(portalRequirementDocuments)
      .where(eq(portalRequirementDocuments.id, insertId))
      .limit(1)
  )[0];
}

export async function addPortalRequirementSourceReference(data: {
  technicianRequirementId: number;
  sourceFileName: string;
  sourcePath: string;
  importedByUserId?: number | null;
}) {
  await ensureClientPortalRuntimeTables();

  const sourceFileName = cleanRequiredText(data.sourceFileName, "Source file name");
  const sourcePath = cleanRequiredText(data.sourcePath, "Source path");
  const existing = await db
    .select()
    .from(portalRequirementSourceReferences)
    .where(eq(portalRequirementSourceReferences.technicianRequirementId, data.technicianRequirementId));
  const duplicate = findDuplicatePortalSourceReferenceByPath(existing, sourcePath);
  if (duplicate) {
    return duplicate;
  }

  const result = await db.insert(portalRequirementSourceReferences).values({
    technicianRequirementId: data.technicianRequirementId,
    sourceFileName,
    sourcePath,
    importedByUserId: data.importedByUserId ?? null,
  });
  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  return (
    await db
      .select()
      .from(portalRequirementSourceReferences)
      .where(eq(portalRequirementSourceReferences.id, insertId))
      .limit(1)
  )[0];
}

async function applyPortalApprovalRequestRow(
  request: typeof portalApprovalRequests.$inferSelect
) {
  const payload = normalisePortalApprovalPayload(request.payload);
  const data = payload.data ?? {};

  switch (request.entityType as PortalApprovalEntityType) {
    case "technician": {
      if (payload.action === "create") {
        const result = await createLevelIIITechnician({
          clientId: request.clientId,
          clientBranchId:
            typeof data.clientBranchId === "number"
              ? data.clientBranchId
              : data.clientBranchId === null
                ? null
                : null,
          name: String(data.name ?? ""),
          email: String(data.email ?? ""),
          phone: typeof data.phone === "string" ? data.phone : null,
          methods: Array.isArray(data.methods) ? data.methods.map((item) => String(item)) : [],
          level: String(data.level ?? ""),
          methodQualifications: Array.isArray(data.methodQualifications)
            ? data.methodQualifications.map((entry) => ({
                method: String((entry as Record<string, unknown>)?.method ?? ""),
                level: String((entry as Record<string, unknown>)?.level ?? ""),
              }))
            : undefined,
          hasPcnQualification: Boolean(data.hasPcnQualification),
          certificateNumber:
            typeof data.certificateNumber === "string" ? data.certificateNumber : null,
          procedureStatus: typeof data.procedureStatus === "string" ? data.procedureStatus : null,
          pcnRenewalDate:
            typeof data.pcnRenewalDate === "string" && data.pcnRenewalDate
              ? data.pcnRenewalDate
              : null,
          internalAssessmentDate:
            typeof data.internalAssessmentDate === "string" && data.internalAssessmentDate
              ? data.internalAssessmentDate
              : null,
          eyeTestValidUntil:
            typeof data.eyeTestValidUntil === "string" && data.eyeTestValidUntil
              ? data.eyeTestValidUntil
              : null,
          notes: typeof data.notes === "string" ? data.notes : null,
        } as typeof levelIIITechnicians.$inferInsert);
        const insertId = Number((result as any)?.[0]?.insertId ?? 0);
        return { entityId: insertId || null };
      }

      if (payload.action === "update") {
        if (!request.entityId) {
          throw new Error("Technician approval request is missing a target record.");
        }
        await updateLevelIIITechnician(request.entityId, {
          name: typeof data.name === "string" ? data.name : undefined,
          email: typeof data.email === "string" ? data.email : undefined,
          phone: data.phone === null || typeof data.phone === "string" ? data.phone : undefined,
          methods: Array.isArray(data.methods)
            ? data.methods.map((item) => String(item))
            : undefined,
          level: typeof data.level === "string" ? data.level : undefined,
          methodQualifications: Array.isArray(data.methodQualifications)
            ? data.methodQualifications.map((entry) => ({
                method: String((entry as Record<string, unknown>)?.method ?? ""),
                level: String((entry as Record<string, unknown>)?.level ?? ""),
              }))
            : undefined,
          hasPcnQualification:
            typeof data.hasPcnQualification === "boolean" ? data.hasPcnQualification : undefined,
          certificateNumber:
            data.certificateNumber === null || typeof data.certificateNumber === "string"
              ? data.certificateNumber
              : undefined,
          procedureStatus:
            data.procedureStatus === null || typeof data.procedureStatus === "string"
              ? data.procedureStatus
              : undefined,
          pcnRenewalDate:
            data.pcnRenewalDate === null || typeof data.pcnRenewalDate === "string"
              ? data.pcnRenewalDate
              : undefined,
          internalAssessmentDate:
            data.internalAssessmentDate === null || typeof data.internalAssessmentDate === "string"
              ? data.internalAssessmentDate
              : undefined,
          eyeTestValidUntil:
            data.eyeTestValidUntil === null || typeof data.eyeTestValidUntil === "string"
              ? data.eyeTestValidUntil
              : undefined,
          notes: data.notes === null || typeof data.notes === "string" ? data.notes : undefined,
          clientBranchId:
            typeof data.clientBranchId === "number"
              ? data.clientBranchId
              : data.clientBranchId === null
                ? null
                : undefined,
        } as Partial<typeof levelIIITechnicians.$inferInsert>);
        return { entityId: request.entityId };
      }

      if (payload.action === "delete") {
        if (!request.entityId) {
          throw new Error("Technician approval request is missing a target record.");
        }
        await deleteLevelIIITechnician(request.entityId);
        return { entityId: request.entityId };
      }
      break;
    }

    case "requirement_record": {
      if (payload.action !== "upsert") {
        throw new Error("Unsupported requirement approval action.");
      }
      const technicianId = Number(data.technicianId ?? 0);
      const definitionId = Number(data.definitionId ?? 0);
      const record = await upsertPortalTechnicianRequirement({
        technicianId,
        definitionId,
        status:
          typeof data.status === "string" ? (data.status as PortalRequirementStatus) : undefined,
        issuedAt:
          data.issuedAt === null || typeof data.issuedAt === "string" ? data.issuedAt : null,
        validUntil:
          data.validUntil === null || typeof data.validUntil === "string"
            ? data.validUntil
            : null,
        notes: data.notes === null || typeof data.notes === "string" ? data.notes : null,
        customFieldValues:
          data.customFieldValues && typeof data.customFieldValues === "object"
            ? (data.customFieldValues as Record<string, unknown>)
            : {},
        uploadedByUserId: request.submittedByUserId,
      });

      if (payload.storedFile && record?.id) {
        await uploadPortalRequirementDocument({
          clientId: request.clientId,
          technicianRequirementId: Number(record.id),
          fileName: payload.storedFile.fileName,
          storedFile: payload.storedFile,
          uploadedByUserId: request.submittedByUserId,
        });
      }

      return { entityId: Number(record?.id ?? 0) || null };
    }

    case "client_document": {
      if (payload.action === "create") {
        const created = await createPortalClientDocument({
          clientId: request.clientId,
          clientBranchId: typeof data.clientBranchId === "number" ? data.clientBranchId : null,
          title: String(data.title ?? ""),
          category: typeof data.category === "string" ? data.category : null,
          description: typeof data.description === "string" ? data.description : null,
          fileName: payload.storedFile?.fileName ?? String(data.fileName ?? "client-document"),
          sourceFileName: typeof data.sourceFileName === "string" ? data.sourceFileName : null,
          sourcePath: typeof data.sourcePath === "string" ? data.sourcePath : null,
          reviewDate:
            data.reviewDate === null || typeof data.reviewDate === "string"
              ? data.reviewDate
              : null,
          validUntil:
            data.validUntil === null || typeof data.validUntil === "string"
              ? data.validUntil
              : null,
          status:
            typeof data.status === "string" ? (data.status as PortalClientDocumentStatus) : null,
          uploadedByUserId: request.submittedByUserId,
          storedFile: payload.storedFile,
        });
        return { entityId: Number(created?.id ?? 0) || null };
      }

      if (payload.action === "update") {
        if (!request.entityId) {
          throw new Error("Document approval request is missing a target record.");
        }
        await updatePortalClientDocument(request.entityId, {
          clientBranchId:
            typeof data.clientBranchId === "number"
              ? data.clientBranchId
              : data.clientBranchId === null
                ? null
                : undefined,
          title: typeof data.title === "string" ? data.title : undefined,
          category:
            data.category === null || typeof data.category === "string" ? data.category : undefined,
          description:
            data.description === null || typeof data.description === "string"
              ? data.description
              : undefined,
          reviewDate:
            data.reviewDate === null || typeof data.reviewDate === "string"
              ? data.reviewDate
              : undefined,
          validUntil:
            data.validUntil === null || typeof data.validUntil === "string"
              ? data.validUntil
              : undefined,
          status:
            typeof data.status === "string" ? (data.status as PortalClientDocumentStatus) : undefined,
        });
        return { entityId: request.entityId };
      }

      if (payload.action === "delete") {
        if (!request.entityId) {
          throw new Error("Document approval request is missing a target record.");
        }
        await deletePortalClientDocument(request.entityId);
        return { entityId: request.entityId };
      }
      break;
    }

    case "resource": {
      if (payload.action === "create") {
        await createPortalClientResource({
          clientId: request.clientId,
          clientBranchId: typeof data.clientBranchId === "number" ? data.clientBranchId : null,
          title: String(data.title ?? ""),
          category: typeof data.category === "string" ? data.category : null,
          description: typeof data.description === "string" ? data.description : null,
          resourceType:
            typeof data.resourceType === "string"
              ? (data.resourceType as PortalClientResourceType)
              : "file",
          linkUrl: typeof data.linkUrl === "string" ? data.linkUrl : null,
          fileName: payload.storedFile?.fileName ?? (typeof data.fileName === "string" ? data.fileName : null),
          sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : null,
          active: typeof data.active === "boolean" ? data.active : true,
          uploadedByUserId: request.submittedByUserId,
          storedFile: payload.storedFile,
        });
        return { entityId: null };
      }

      if (payload.action === "update") {
        if (!request.entityId) {
          throw new Error("Resource approval request is missing a target record.");
        }
        await updatePortalClientResource(request.entityId, {
          clientBranchId:
            typeof data.clientBranchId === "number"
              ? data.clientBranchId
              : data.clientBranchId === null
                ? null
                : undefined,
          title: typeof data.title === "string" ? data.title : undefined,
          category:
            data.category === null || typeof data.category === "string" ? data.category : undefined,
          description:
            data.description === null || typeof data.description === "string"
              ? data.description
              : undefined,
          linkUrl:
            data.linkUrl === null || typeof data.linkUrl === "string" ? data.linkUrl : undefined,
          sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : undefined,
          active: typeof data.active === "boolean" ? data.active : undefined,
        });
        return { entityId: request.entityId };
      }

      if (payload.action === "delete") {
        if (!request.entityId) {
          throw new Error("Resource approval request is missing a target record.");
        }
        await deletePortalClientResource(request.entityId);
        return { entityId: request.entityId };
      }
      break;
    }
  }

  throw new Error("Unsupported portal approval request.");
}

export async function reviewPortalApprovalRequest(data: {
  id: number;
  clientId: number;
  reviewerUserId: number;
  decision: Extract<PortalApprovalStatus, "approved" | "rejected">;
  reviewNotes?: string | null;
}) {
  await ensureClientPortalRuntimeTables();

  const existing = await db
    .select()
    .from(portalApprovalRequests)
    .where(
      and(
        eq(portalApprovalRequests.id, data.id),
        eq(portalApprovalRequests.clientId, data.clientId)
      )
    )
    .limit(1);
  if (!existing[0]) {
    throw new Error("Portal approval request not found.");
  }
  if (existing[0].status !== "pending") {
    throw new Error("This approval request has already been reviewed.");
  }

  let resolvedEntityId = existing[0].entityId ?? null;
  if (data.decision === "approved") {
    const result = await applyPortalApprovalRequestRow(existing[0]);
    resolvedEntityId = result.entityId ?? resolvedEntityId;
  }

  await db
    .update(portalApprovalRequests)
    .set({
      entityId: resolvedEntityId,
      status: data.decision,
      reviewedByUserId: data.reviewerUserId,
      reviewNotes: cleanOptionalText(data.reviewNotes),
      reviewedAt: new Date(),
    })
    .where(eq(portalApprovalRequests.id, data.id));

  return getPortalApprovalRequests(data.clientId);
}

export async function getAllLevelIIIAssessments() {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  await ensureRuntimeColumn("levelIIIAssessments", "methodLevels", "JSON NULL");
  const rows = await db.select().from(levelIIIAssessments);
  return rows
    .map((row) => normaliseLevelIIIAssessmentRecord(row))
    .sort(
      (a, b) =>
        new Date(b.assessmentDate).getTime() -
        new Date(a.assessmentDate).getTime()
    );
}

export async function createLevelIIIAssessment(
  data: typeof levelIIIAssessments.$inferInsert
) {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  await ensureRuntimeColumn("levelIIIAssessments", "methodLevels", "JSON NULL");
  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, data.technicianId))
    .limit(1);

  if (!technician[0]) {
    throw new Error("Selected technician was not found.");
  }

  const technicianMethods = cleanMethodsArray(
    technician[0].methods,
    technician[0].method ?? null
  );
  const methodLevels = cleanLevelIIIAssessmentMethodLevels(
    data.methodLevels,
    data.method,
    data.level
  );

  if (methodLevels.length === 0) {
    throw new Error("Select at least one assessment method and level.");
  }

  if (
    technicianMethods.length > 0 &&
    methodLevels.some(
      (entry) =>
        !technicianMethods.some(
          (technicianMethod) =>
            technicianMethod.trim().toLowerCase() === entry.method.trim().toLowerCase()
        )
    )
  ) {
    throw new Error(
      "Assessment methods must be chosen from the technician's configured methods."
    );
  }

  return db.insert(levelIIIAssessments).values({
    technicianId: data.technicianId,
    assessmentDate:
      parseOptionalLevelIIIDate(data.assessmentDate) ??
      startOfDay(new Date()),
    method: summariseLevelIIIAssessmentMethods(methodLevels),
    level: summariseLevelIIIAssessmentLevels(methodLevels),
    methodLevels,
    assessor: cleanRequiredText(data.assessor, "Assessor"),
    result: data.result ?? "Pending Review",
    nextReviewDate: parseOptionalLevelIIIDate(data.nextReviewDate),
    evidenceUrl: cleanOptionalText(data.evidenceUrl),
    notes: cleanOptionalText(data.notes),
  });
}

export async function updateLevelIIIAssessment(
  id: number,
  data: Partial<typeof levelIIIAssessments.$inferInsert>
) {
  await ensureRuntimeColumn(
    "levelIIITechnicians",
    "methodQualifications",
    "JSON NULL"
  );
  await ensureRuntimeColumn("levelIIIAssessments", "methodLevels", "JSON NULL");
  const existing = await db
    .select()
    .from(levelIIIAssessments)
    .where(eq(levelIIIAssessments.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Assessment not found.");
  }

  const current = normaliseLevelIIIAssessmentRecord(existing[0]);

  if (data.technicianId !== undefined) {
    const technician = await db
      .select()
      .from(levelIIITechnicians)
      .where(eq(levelIIITechnicians.id, data.technicianId))
      .limit(1);

    if (!technician[0]) {
      throw new Error("Selected technician was not found.");
    }
  }

  const technicianId = data.technicianId ?? current.technicianId;
  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, technicianId))
    .limit(1);

  if (!technician[0]) {
    throw new Error("Selected technician was not found.");
  }

  const technicianMethods = cleanMethodsArray(
    technician[0].methods,
    technician[0].method ?? null
  );
  const methodLevels =
    data.methodLevels !== undefined || data.method !== undefined || data.level !== undefined
      ? cleanLevelIIIAssessmentMethodLevels(
          data.methodLevels,
          data.method ?? current.method,
          data.level ?? current.level
        )
      : current.methodLevels;

  if (methodLevels.length === 0) {
    throw new Error("Select at least one assessment method and level.");
  }

  if (
    technicianMethods.length > 0 &&
    methodLevels.some(
      (entry) =>
        !technicianMethods.some(
          (technicianMethod) =>
            technicianMethod.trim().toLowerCase() === entry.method.trim().toLowerCase()
        )
    )
  ) {
    throw new Error(
      "Assessment methods must be chosen from the technician's configured methods."
    );
  }

  return db
    .update(levelIIIAssessments)
    .set({
      technicianId,
      assessmentDate:
        data.assessmentDate === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.assessmentDate) ?? startOfDay(new Date()),
      method: summariseLevelIIIAssessmentMethods(methodLevels),
      level: summariseLevelIIIAssessmentLevels(methodLevels),
      methodLevels,
      assessor:
        data.assessor === undefined
          ? undefined
          : cleanRequiredText(data.assessor, "Assessor"),
      result: data.result,
      nextReviewDate:
        data.nextReviewDate === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.nextReviewDate),
      evidenceUrl:
        data.evidenceUrl === undefined
          ? undefined
          : cleanOptionalText(data.evidenceUrl),
      notes: data.notes === undefined ? undefined : cleanOptionalText(data.notes),
    })
    .where(eq(levelIIIAssessments.id, id));
}

export async function deleteLevelIIIAssessment(id: number) {
  return db.delete(levelIIIAssessments).where(eq(levelIIIAssessments.id, id));
}

type LevelIIITechnicianCertificateStatus =
  | "Active"
  | "Expired"
  | "Revoked"
  | "Superseded";

type LevelIIITechnicianCertificateValidityUnit =
  | "days"
  | "months"
  | "years"
  | "custom";
type LevelIIITechnicianCertificateApprovalStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected";

async function ensureLevelIIITechnicianCertificateRuntimeTable() {
  await ensureRuntimeTable(
    "levelIIITechnicianCertificates",
    `CREATE TABLE IF NOT EXISTS \`levelIIITechnicianCertificates\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`technicianId\` INT NOT NULL,
      \`assessmentId\` INT NULL,
      \`clientId\` INT NOT NULL,
      \`clientBranchId\` INT NULL,
      \`certificateNumber\` VARCHAR(120) NOT NULL,
      \`method\` VARCHAR(255) NOT NULL,
      \`level\` VARCHAR(100) NOT NULL,
      \`methodLevels\` JSON NULL,
      \`issuedDate\` DATE NOT NULL,
      \`validUntil\` DATE NULL,
      \`validityValue\` INT NULL,
      \`validityUnit\` ENUM('days','months','years','custom') NULL,
      \`status\` ENUM('Active','Expired','Revoked','Superseded') NOT NULL DEFAULT 'Active',
      \`fileName\` VARCHAR(255) NULL,
      \`fileUrl\` TEXT NULL,
      \`fileKey\` VARCHAR(500) NULL,
      \`contentType\` VARCHAR(255) NULL,
      \`approvalStatus\` ENUM('draft','in_review','approved','rejected') NOT NULL DEFAULT 'draft',
      \`approvalRequestedAt\` TIMESTAMP NULL,
      \`approvalRequestedBy\` INT NULL,
      \`approvedAt\` TIMESTAMP NULL,
      \`approvedBy\` INT NULL,
      \`approvalNote\` TEXT NULL,
      \`notes\` TEXT NULL,
      \`issuedBy\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`levelIIITechnicianCertificates_certificateNumber_unique\` (\`certificateNumber\`),
      KEY \`levelIIITechnicianCertificates_technician_idx\` (\`technicianId\`),
      KEY \`levelIIITechnicianCertificates_assessment_idx\` (\`assessmentId\`),
      KEY \`levelIIITechnicianCertificates_client_idx\` (\`clientId\`)
    )`
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "sourceFileName",
    "VARCHAR(255) NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "sourcePath",
    "TEXT NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "approvalStatus",
    "ENUM('draft','in_review','approved','rejected') NOT NULL DEFAULT 'draft'"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "approvalRequestedAt",
    "TIMESTAMP NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "approvalRequestedBy",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "approvedAt",
    "TIMESTAMP NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "approvedBy",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificates",
    "approvalNote",
    "TEXT NULL"
  );
  await ensureRuntimeTable(
    "levelIIITechnicianCertificateExports",
    `CREATE TABLE IF NOT EXISTS \`levelIIITechnicianCertificateExports\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`certificateId\` INT NOT NULL,
      \`technicianId\` INT NOT NULL,
      \`clientId\` INT NOT NULL,
      \`exportFormat\` ENUM('html','pdf') NOT NULL,
      \`fileName\` VARCHAR(255) NOT NULL,
      \`title\` VARCHAR(255) NULL,
      \`subtitle\` TEXT NULL,
      \`artifactSummary\` JSON NULL,
      \`artifactPayload\` JSON NULL,
      \`exportedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY \`levelIIITechnicianCertificateExports_certificate_idx\` (\`certificateId\`),
      KEY \`levelIIITechnicianCertificateExports_technician_idx\` (\`technicianId\`),
      KEY \`levelIIITechnicianCertificateExports_client_idx\` (\`clientId\`)
    )`
  );
  await ensureRuntimeColumn(
    "levelIIITechnicianCertificateExports",
    "artifactPayload",
    "JSON NULL"
  );
}

function getNormalisedLevelIIITechnicianCertificateStatus(
  status: string | null | undefined,
  validUntil: Date | null
): LevelIIITechnicianCertificateStatus {
  const normalized = cleanOptionalText(status);
  if (normalized === "Revoked" || normalized === "Superseded") {
    return normalized;
  }
  if (validUntil && validUntil.getTime() < startOfDay(new Date()).getTime()) {
    return "Expired";
  }
  return "Active";
}

function getNormalisedLevelIIITechnicianCertificateApprovalStatus(
  status: string | null | undefined
): LevelIIITechnicianCertificateApprovalStatus {
  switch (cleanOptionalText(status)) {
    case "in_review":
    case "approved":
    case "rejected":
      return cleanOptionalText(status) as LevelIIITechnicianCertificateApprovalStatus;
    case "draft":
    default:
      return "draft";
  }
}

function isActiveLevelIIITechnicianCertificateStatus(
  status: string | null | undefined
): status is LevelIIITechnicianCertificateStatus {
  return cleanOptionalText(status) === "Active";
}

function resolveLevelIIITechnicianCertificateValidUntil(input: {
  issuedDate: Date;
  validUntil?: Date | string | null;
  validityValue?: number | null;
  validityUnit?: LevelIIITechnicianCertificateValidityUnit | null;
}) {
  return resolveSharedLevelIIICertificateValidUntil(input);
}

function compareLevelIIITechnicianCertificateRecency(
  left: {
    id: number;
    issuedDate: Date | string | null;
    createdAt?: Date | string | null;
  },
  right: {
    id: number;
    issuedDate: Date | string | null;
    createdAt?: Date | string | null;
  }
) {
  const leftIssued = parseOptionalLevelIIIDate(left.issuedDate)?.getTime() ?? 0;
  const rightIssued = parseOptionalLevelIIIDate(right.issuedDate)?.getTime() ?? 0;
  if (leftIssued !== rightIssued) {
    return leftIssued - rightIssued;
  }
  const leftCreated = parseOptionalLevelIIIDate(left.createdAt)?.getTime() ?? 0;
  const rightCreated = parseOptionalLevelIIIDate(right.createdAt)?.getTime() ?? 0;
  if (leftCreated !== rightCreated) {
    return leftCreated - rightCreated;
  }
  return left.id - right.id;
}

async function ensureLevelIIITechnicianCertificateNumberIsUnique(
  certificateNumber: string,
  excludeCertificateId?: number
) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  const normalisedCertificateNumber = normaliseLevelIIITechnicianCertificateNumber(certificateNumber);
  const existing = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.certificateNumber, normalisedCertificateNumber))
    .limit(1);

  if (existing[0] && existing[0].id !== excludeCertificateId) {
    throw new Error("Level III certificate number already exists.");
  }
}

async function generateLevelIIITechnicianCertificateNumber() {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  const result = await db
    .select({
      certificateNumber: levelIIITechnicianCertificates.certificateNumber,
    })
    .from(levelIIITechnicianCertificates);

  return buildNextLevelIIITechnicianCertificateNumber(
    result.map((row) => row.certificateNumber),
    new Date()
  );
}

function isDuplicateEntryError(error: unknown) {
  const cause = (error as any)?.cause ?? error;
  const code = String((cause as any)?.code ?? "");
  const message = String((cause as any)?.message ?? (error as any)?.message ?? "").toLowerCase();
  return (
    code === "ER_DUP_ENTRY" ||
    message.includes("duplicate entry") ||
    message.includes("certificate number already exists")
  );
}

function resolveLevelIIITechnicianCertificateNumberInput(
  certificateNumber: string | null | undefined
) {
  const cleaned = cleanOptionalText(certificateNumber);
  if (!cleaned) return null;
  const normalised = normaliseLevelIIITechnicianCertificateNumber(cleaned);
  if (!isLevelIIITechnicianCertificateNumberFormat(normalised)) {
    throw new Error("Level III certificate numbers must use the format L3C-YYYY-####.");
  }
  return normalised;
}

async function createLevelIIITechnicianCertificateWithResolvedNumber(
  values: Omit<typeof levelIIITechnicianCertificates.$inferInsert, "certificateNumber"> & {
    certificateNumber?: string;
  },
  technicianId: number,
  autoGeneratedCertificateNumber: boolean
) {
  let attempts = autoGeneratedCertificateNumber ? 3 : 1;
  let lastError: unknown;

  while (attempts > 0) {
    const resolvedCertificateNumber =
      values.certificateNumber && !autoGeneratedCertificateNumber
        ? resolveLevelIIITechnicianCertificateNumberInput(values.certificateNumber)
        : await generateLevelIIITechnicianCertificateNumber();
    if (!resolvedCertificateNumber) {
      throw new Error("Level III certificate number could not be resolved.");
    }

    try {
      await ensureLevelIIITechnicianCertificateNumberIsUnique(resolvedCertificateNumber);
      const result = await db.insert(levelIIITechnicianCertificates).values({
        ...values,
        certificateNumber: resolvedCertificateNumber,
      });

      const insertId = Number((result as any)?.[0]?.insertId ?? 0);
      await syncLegacyLevelIIITechnicianCertificateNumber(technicianId);
      const created = (
        await db
          .select()
          .from(levelIIITechnicianCertificates)
          .where(eq(levelIIITechnicianCertificates.id, insertId))
          .limit(1)
      )[0];
      if (created) {
        await syncLevelIIITechnicianCertificateToPortalRequirements(created);
      }
      return created;
    } catch (error) {
      if (!autoGeneratedCertificateNumber || !isDuplicateEntryError(error)) {
        throw error;
      }
      lastError = error;
      attempts -= 1;
    }
  }

  throw lastError;
}

async function syncLegacyLevelIIITechnicianCertificateNumber(technicianId: number) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  const rows = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.technicianId, technicianId));

  const preferred = rows
    .slice()
    .sort((left, right) => {
      const leftActive = left.status === "Active" ? 1 : 0;
      const rightActive = right.status === "Active" ? 1 : 0;
      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }
      const leftIssued = left.issuedDate ? new Date(left.issuedDate).getTime() : 0;
      const rightIssued = right.issuedDate ? new Date(right.issuedDate).getTime() : 0;
      return rightIssued - leftIssued;
    })[0] ?? null;

  await db
    .update(levelIIITechnicians)
    .set({
      certificateNumber: preferred?.certificateNumber ?? null,
    })
    .where(eq(levelIIITechnicians.id, technicianId));
}

function normaliseLevelIIITechnicianCertificateRecord<
  T extends {
    issuedDate: Date | string | null;
    validUntil: Date | string | null;
    approvalRequestedAt: Date | string | null;
    approvedAt: Date | string | null;
    createdAt: Date | string | null;
    updatedAt: Date | string | null;
  },
>(row: T) {
  return {
    ...row,
    issuedDate: row.issuedDate ? new Date(row.issuedDate) : null,
    validUntil: row.validUntil ? new Date(row.validUntil) : null,
    approvalRequestedAt: row.approvalRequestedAt ? new Date(row.approvalRequestedAt) : null,
    approvedAt: row.approvedAt ? new Date(row.approvedAt) : null,
    createdAt: row.createdAt ? new Date(row.createdAt) : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
  };
}

function normaliseLevelIIITechnicianCertificateExportRecord<
  T extends {
    createdAt: Date | string | null;
  },
>(row: T) {
  return {
    ...row,
    createdAt: row.createdAt ? new Date(row.createdAt) : null,
  };
}

function mapLevelIIICertificateStatusToPortalRequirementStatus(
  status: string | null | undefined,
  validUntil: string | Date | null | undefined
): PortalRequirementStatus {
  switch (String(status ?? "").trim()) {
    case "Expired":
    case "Revoked":
      return "expired";
    case "Superseded":
      return "pending_review";
    case "Active":
    default: {
      if (validUntil) {
        const target = startOfDay(new Date(validUntil));
        const today = startOfDay(new Date());
        if (target.getTime() < today.getTime()) return "expired";
        if (target.getTime() <= addLevelIIIDays(today, 30).getTime()) return "expiring";
      }
      return "current";
    }
  }
}

function getLevelIIICertificateValidityDays(
  issuedDate: string | Date | null | undefined,
  validUntil: string | Date | null | undefined
) {
  if (!issuedDate || !validUntil) return null;
  const issued = startOfDay(new Date(issuedDate));
  const valid = startOfDay(new Date(validUntil));
  if (Number.isNaN(issued.getTime()) || Number.isNaN(valid.getTime())) return null;
  const diff = Math.round((valid.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function splitLevelIIIImportList(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => cleanOptionalText(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  return String(value ?? "")
    .split(",")
    .map((entry) => cleanOptionalText(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function normaliseLevelIIIImportLabel(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ");
}

function ruleMatchesImportedDocuments(
  rule: ReturnType<typeof buildLevelIIIDocumentAutomationRules>[number],
  detectedDocuments: string[]
) {
  return findImportedDocumentForRule(rule, detectedDocuments) !== null;
}

function findImportedDocumentForRule(
  rule: ReturnType<typeof buildLevelIIIDocumentAutomationRules>[number],
  detectedDocuments: string[]
) {
  const upperDocuments = detectedDocuments.map((entry) => entry.toUpperCase());
  const baseTokens =
    rule.category === "core"
      ? LEVEL_III_IMPORT_CORE_LABEL_ALIASES[rule.label] ?? [rule.label]
      : [rule.label];

  const index = baseTokens.findIndex((token) => {
    const upperToken = token.toUpperCase();
    return upperDocuments.some((document) => document.includes(upperToken));
  });
  if (index < 0) return null;

  const upperToken = baseTokens[index]!.toUpperCase();
  const matchIndex = upperDocuments.findIndex((document) => document.includes(upperToken));
  return matchIndex >= 0 ? detectedDocuments[matchIndex] ?? null : null;
}

async function findOrCreatePortalRequirementDefinitionForAutomationRule(data: {
  clientId: number;
  rule: ReturnType<typeof buildLevelIIIDocumentAutomationRules>[number];
  validityDays?: number | null;
}) {
  await ensureClientPortalRuntimeTables();
  const existingDefinitions = await getPortalRequirementDefinitionsForClient(data.clientId);
  const candidateNames =
    data.rule.category === "core"
      ? LEVEL_III_IMPORT_CORE_LABEL_ALIASES[data.rule.label] ?? [data.rule.label]
      : [data.rule.label];
  const existing = existingDefinitions.find((definition) =>
    candidateNames.some(
      (candidate) =>
        definition.name.trim().toLowerCase() === candidate.trim().toLowerCase()
    )
  );
  if (existing) {
    return existing;
  }

  const created = await createPortalRequirementDefinition({
    clientId: data.clientId,
    name: data.rule.label,
    category: data.rule.category === "method" ? "Certification" : "Core Document",
    description:
      data.rule.category === "method"
        ? "Auto-created from imported Level III technician certification evidence."
        : "Auto-created from imported Level III technician compliance evidence.",
    validityDays: data.validityDays ?? null,
    reminderDays: 30,
    isRequired: true,
    active: true,
    sortOrder: existingDefinitions.length + 1,
    customFields: [],
  } as typeof portalRequirementDefinitions.$inferInsert);

  return created;
}

async function findOrCreatePortalRequirementDefinitionForCertificate(data: {
  clientId: number;
  label: string;
  validityDays?: number | null;
}) {
  await ensureClientPortalRuntimeTables();
  const definitionName = cleanOptionalText(data.label);
  if (!definitionName) {
    throw new Error("Requirement definition label is required.");
  }

  const existingDefinitions = await getPortalRequirementDefinitionsForClient(data.clientId);
  const existing = existingDefinitions.find(
    (definition) => definition.name.trim().toLowerCase() === definitionName.toLowerCase()
  );
  if (existing) {
    return existing;
  }

  const created = await createPortalRequirementDefinition({
    clientId: data.clientId,
    name: definitionName,
    category: "Certification",
    description: "Auto-created from an issued Level III technician certificate.",
    validityDays: data.validityDays ?? null,
    reminderDays: 30,
    isRequired: true,
    active: true,
    sortOrder: existingDefinitions.length + 1,
    customFields: [],
  } as typeof portalRequirementDefinitions.$inferInsert);

  return created;
}

export async function bootstrapLevelIIITechnicianComplianceFromDriveAudit(data: {
  technicianId: number;
  sourceFolder?: string | null;
  folderGroup?: string | null;
  fileCount?: number | null;
  documentSummary?: string | null;
  missingCoreDocuments?: string[] | string | null;
  detectedDocuments?: string[] | string | null;
  internalAssessmentDate?: Date | string | null;
  eyeTestValidUntil?: Date | string | null;
  uploadedByUserId?: number | null;
}) {
  await ensureClientPortalRuntimeTables();
  await ensureRuntimeColumn("levelIIITechnicians", "methodQualifications", "JSON NULL");

  const technicianRow = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, data.technicianId))
    .limit(1);
  if (!technicianRow[0]) {
    throw new Error("Technician not found.");
  }

  const technician = normaliseLevelIIITechnician(technicianRow[0]);
  const rules = buildLevelIIIDocumentAutomationRules({
    technicianName: technician.name,
    techniques: technician.methods,
    methodQualifications: technician.methodQualifications,
  });
  const missingCoreLabels = new Set(
    splitLevelIIIImportList(data.missingCoreDocuments).map((entry) =>
      normaliseLevelIIIImportLabel(entry)
    )
  );
  const detectedDocuments = splitLevelIIIImportList(data.detectedDocuments);
  const internalAssessmentDate = parseOptionalLevelIIIDate(data.internalAssessmentDate);
  const eyeTestValidUntil = parseOptionalLevelIIIDate(data.eyeTestValidUntil);
  const noteParts = [
    "Seeded from Level III drive audit import.",
    cleanOptionalText(data.folderGroup) ? `Folder group: ${cleanOptionalText(data.folderGroup)}` : null,
    cleanOptionalText(data.sourceFolder) ? `Source folder: ${cleanOptionalText(data.sourceFolder)}` : null,
    Number(data.fileCount) > 0 ? `Detected files: ${Number(data.fileCount)}` : null,
    cleanOptionalText(data.documentSummary),
  ].filter((entry): entry is string => Boolean(entry));

  let currentCount = 0;
  let missingCount = 0;

  for (const rule of rules) {
    const definition = await findOrCreatePortalRequirementDefinitionForAutomationRule({
      clientId: technician.clientId,
      rule,
      validityDays: rule.label === "EYE TEST" ? null : undefined,
    });
    const labelKey = normaliseLevelIIIImportLabel(rule.label);
    const matchedDocumentName = findImportedDocumentForRule(rule, detectedDocuments);
    const hasDetectedDocument = Boolean(matchedDocumentName);
    const isMarkedMissing = rule.category === "core" && missingCoreLabels.has(labelKey);
    const status = hasDetectedDocument && !isMarkedMissing ? "current" : "missing";

    const record = await upsertPortalTechnicianRequirement({
      technicianId: technician.id,
      definitionId: Number(definition.id),
      status,
      issuedAt: rule.category === "method" ? internalAssessmentDate : null,
      validUntil: rule.label === "EYE TEST" ? eyeTestValidUntil : null,
      notes: noteParts.join(" "),
      customFieldValues: {},
      uploadedByUserId: data.uploadedByUserId ?? null,
    });
    if (
      record?.id &&
      matchedDocumentName &&
      cleanOptionalText(data.sourceFolder)
    ) {
      await addPortalRequirementSourceReference({
        technicianRequirementId: Number(record.id),
        sourceFileName: matchedDocumentName,
        sourcePath: `${cleanOptionalText(data.sourceFolder)}\\${matchedDocumentName}`,
        importedByUserId: data.uploadedByUserId ?? null,
      });
    }

    if (status === "current") {
      currentCount += 1;
    } else {
      missingCount += 1;
    }
  }

  return {
    seededCount: rules.length,
    currentCount,
    missingCount,
  };
}

function extractImportedMethodCertificates(input: {
  detectedDocuments: string[];
  methodQualifications: LevelIIIAssessmentMethodLevel[];
}) {
  const certificates = new Map<string, { method: string; level: string; fileName: string }>();

  for (const documentName of input.detectedDocuments) {
    const upperName = documentName.toUpperCase();
    if (!upperName.includes("CERT")) continue;
    if (upperName.includes("RESULT")) continue;
    if (upperName.includes("NOTICE")) continue;

    for (const qualification of input.methodQualifications) {
      const method = cleanOptionalText(qualification.method);
      const level = cleanOptionalText(qualification.level);
      if (!method || !level) continue;

      const methodUpper = method.toUpperCase();
      const levelDigitsMatch = level.match(/([123])/);
      const levelDigits = levelDigitsMatch?.[1] ?? "";
      const methodPattern = new RegExp(`\\b${methodUpper}\\s*${levelDigits ? levelDigits : "\\d*"}\\b`);
      if (!methodPattern.test(upperName)) continue;

      const key = `${methodUpper}:${level.toUpperCase()}`;
      if (!certificates.has(key)) {
        certificates.set(key, {
          method,
          level,
          fileName: documentName,
        });
      }
    }
  }

  return Array.from(certificates.values());
}

export async function bootstrapLevelIIITechnicianCertificatesFromDriveAudit(data: {
  technicianId: number;
  sourceFolder?: string | null;
  detectedDocuments?: string[] | string | null;
  internalAssessmentDate?: Date | string | null;
  uploadedByUserId?: number | null;
  notes?: string | null;
}) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  await ensureRuntimeColumn("levelIIITechnicians", "methodQualifications", "JSON NULL");

  const technicianRow = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, data.technicianId))
    .limit(1);
  if (!technicianRow[0]) {
    throw new Error("Technician not found.");
  }

  const technician = normaliseLevelIIITechnician(technicianRow[0]);
  const issuedDate =
    parseOptionalLevelIIIDate(data.internalAssessmentDate) ?? startOfDay(new Date());
  const detectedDocuments = splitLevelIIIImportList(data.detectedDocuments);
  const extractedCertificates = extractImportedMethodCertificates({
    detectedDocuments,
    methodQualifications: cleanLevelIIIAssessmentMethodLevels(
      technician.methodQualifications,
      technician.methods,
      technician.level
    ),
  });

  if (extractedCertificates.length === 0) {
    return {
      seededCount: 0,
      createdCount: 0,
      skippedCount: 0,
    };
  }

  const existingCertificates = (
    await db
      .select()
      .from(levelIIITechnicianCertificates)
      .where(eq(levelIIITechnicianCertificates.technicianId, technician.id))
  ).map((row) => normaliseLevelIIITechnicianCertificateRecord(row));

  let createdCount = 0;
  let skippedCount = 0;

  for (const certificate of extractedCertificates) {
    const duplicate = existingCertificates.some((existing) => {
      const methodLevels = cleanLevelIIIAssessmentMethodLevels(
        existing.methodLevels,
        existing.method,
        existing.level
      );
      return methodLevels.some(
        (entry) =>
          entry.method.trim().toLowerCase() === certificate.method.trim().toLowerCase() &&
          entry.level.trim().toLowerCase() === certificate.level.trim().toLowerCase()
      );
    });
    if (duplicate) {
      skippedCount += 1;
      continue;
    }

    const created = await createLevelIIITechnicianCertificate({
      technicianId: technician.id,
      assessmentId: null,
      clientId: technician.clientId,
      clientBranchId: technician.clientBranchId ?? null,
      certificateNumber: undefined,
      method: certificate.method,
      level: certificate.level,
      methodLevels: [
        {
          method: certificate.method,
          level: certificate.level,
        },
      ],
      issuedDate,
      validUntil: null,
      validityValue: null,
      validityUnit: null,
      status: "Active",
      fileName: certificate.fileName,
      fileUrl: null,
      fileKey: null,
      contentType: null,
      sourceFileName: certificate.fileName,
      sourcePath: cleanOptionalText(data.sourceFolder)
        ? `${cleanOptionalText(data.sourceFolder)}\\${certificate.fileName}`
        : null,
      notes:
        cleanOptionalText(data.notes) ??
        `Auto-created from imported drive audit file: ${certificate.fileName}`,
      issuedBy: data.uploadedByUserId ?? null,
    } as unknown as typeof levelIIITechnicianCertificates.$inferInsert);
    if (created) {
      createdCount += 1;
      existingCertificates.push(created);
    }
  }

  return {
    seededCount: extractedCertificates.length,
    createdCount,
    skippedCount,
  };
}

async function syncLevelIIITechnicianCertificateToPortalRequirements(
  certificateRow: typeof levelIIITechnicianCertificates.$inferSelect
) {
  await ensureClientPortalRuntimeTables();
  const certificate = normaliseLevelIIITechnicianCertificateRecord(certificateRow);
  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, certificate.technicianId))
    .limit(1);
  if (!technician[0]) return;

  const methodQualifications = cleanLevelIIIAssessmentMethodLevels(
    certificate.methodLevels,
    certificate.method,
    certificate.level
  );
  if (methodQualifications.length === 0) return;

  const validityDays = getLevelIIICertificateValidityDays(
    certificate.issuedDate,
    certificate.validUntil
  );
  const documentRules = buildLevelIIIDocumentAutomationRules({
    technicianName: technician[0].name,
    techniques: methodQualifications.map((entry) => entry.method),
    methodQualifications,
  }).filter((rule) => rule.category === "method");

  const storedFile =
    certificate.fileKey && certificate.fileUrl
      ? ({
          fileName:
            cleanOptionalText(certificate.fileName) ??
            `${technician[0].name} - ${certificate.certificateNumber}`,
          fileKey: certificate.fileKey,
          fileUrl: certificate.fileUrl,
          contentType: cleanOptionalText(certificate.contentType),
        } satisfies PortalStoredFileReference)
      : null;

  for (const rule of documentRules) {
    const definition = await findOrCreatePortalRequirementDefinitionForCertificate({
      clientId: certificate.clientId,
      label: rule.label,
      validityDays,
    });
    const record = await upsertPortalTechnicianRequirement({
      technicianId: certificate.technicianId,
      definitionId: Number(definition.id),
      status: mapLevelIIICertificateStatusToPortalRequirementStatus(
        certificate.status,
        certificate.validUntil
      ),
      issuedAt: certificate.issuedDate,
      validUntil: certificate.validUntil,
      notes: [
        `Certificate Number: ${certificate.certificateNumber}`,
        cleanOptionalText(certificate.notes),
      ]
        .filter(Boolean)
        .join("\n"),
      customFieldValues: {},
      uploadedByUserId: certificate.issuedBy ?? null,
    });

    if (storedFile && record?.id) {
      const existingDocuments = await db
        .select()
        .from(portalRequirementDocuments)
        .where(eq(portalRequirementDocuments.technicianRequirementId, Number(record.id)));
      const duplicate = existingDocuments.some(
        (document) =>
          document.fileKey.trim().toLowerCase() === storedFile.fileKey.trim().toLowerCase()
      );
      if (!duplicate) {
        await uploadPortalRequirementDocument({
          clientId: certificate.clientId,
          technicianRequirementId: Number(record.id),
          fileName: storedFile.fileName,
          storedFile,
          uploadedByUserId: certificate.issuedBy ?? null,
        });
      }
    }
  }
}

async function reconcileActiveLevelIIITechnicianCertificateScope(params: {
  certificateId: number;
  technicianId: number;
  methodLevels: LevelIIIAssessmentMethodLevel[];
  status: LevelIIITechnicianCertificateStatus;
  notes?: string | null;
}) {
  if (!isActiveLevelIIITechnicianCertificateStatus(params.status)) {
    return { supersededCertificates: [] as Array<typeof levelIIITechnicianCertificates.$inferSelect> };
  }

  const certificates = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.technicianId, params.technicianId));
  const current = certificates.find((row) => row.id === params.certificateId);
  if (!current) {
    return { supersededCertificates: [] as Array<typeof levelIIITechnicianCertificates.$inferSelect> };
  }

  const currentRecord = normaliseLevelIIITechnicianCertificateRecord(current);
  const overlappingActiveCertificates = certificates
    .filter(
      (row) =>
        row.id !== params.certificateId &&
        row.status === "Active" &&
        hasOverlappingLevelIIITechnicianCertificateScope(
          currentRecord.methodLevels,
          normaliseLevelIIITechnicianCertificateRecord(row).methodLevels
        )
    )
    .map((row) => normaliseLevelIIITechnicianCertificateRecord(row));

  if (overlappingActiveCertificates.length === 0) {
    return { supersededCertificates: [] as Array<typeof levelIIITechnicianCertificates.$inferSelect> };
  }

  const newerConflict = overlappingActiveCertificates.find(
    (row) => compareLevelIIITechnicianCertificateRecency(row, currentRecord) >= 0
  );
  if (newerConflict) {
    throw new Error(
      `An active Level III certificate already covers this technician scope (${newerConflict.certificateNumber}). Revoke or supersede the newer certificate before issuing an older replacement.`
    );
  }

  const supersedeNote = [
    "Auto-superseded by newer overlapping Level III certificate.",
    `Replacement Certificate: ${currentRecord.certificateNumber}`,
    cleanOptionalText(params.notes) ? `Replacement Notes: ${cleanOptionalText(params.notes)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const supersededIds: number[] = [];
  for (const certificate of overlappingActiveCertificates) {
    const mergedNotes = [cleanOptionalText(certificate.notes), supersedeNote]
      .filter(Boolean)
      .join("\n\n");
    await db
      .update(levelIIITechnicianCertificates)
      .set({
        status: "Superseded",
        notes: mergedNotes || null,
      })
      .where(eq(levelIIITechnicianCertificates.id, certificate.id));
    supersededIds.push(certificate.id);
  }

  if (supersededIds.length > 0) {
    const affectedRows = await db
      .select()
      .from(levelIIITechnicianCertificates)
      .where(inArray(levelIIITechnicianCertificates.id, supersededIds));
    for (const row of affectedRows) {
      await syncLevelIIITechnicianCertificateToPortalRequirements(row);
    }
    await syncLegacyLevelIIITechnicianCertificateNumber(params.technicianId);
    return { supersededCertificates: affectedRows };
  }

  return { supersededCertificates: [] as Array<typeof levelIIITechnicianCertificates.$inferSelect> };
}

async function assertNoBlockingLevelIIITechnicianCertificateScopeConflict(params: {
  certificateId?: number;
  technicianId: number;
  methodLevels: LevelIIIAssessmentMethodLevel[];
  status: LevelIIITechnicianCertificateStatus;
  issuedDate: Date;
  createdAt?: Date | string | null;
}) {
  if (!isActiveLevelIIITechnicianCertificateStatus(params.status)) {
    return;
  }

  const certificates = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.technicianId, params.technicianId));

  const candidateRecord = {
    id: params.certificateId ?? Number.MAX_SAFE_INTEGER,
    issuedDate: params.issuedDate,
    createdAt: params.createdAt ?? new Date(),
    methodLevels: params.methodLevels,
  };

  const blockingConflict = certificates
    .filter(
      (row) =>
        row.id !== params.certificateId &&
        row.status === "Active" &&
        hasOverlappingLevelIIITechnicianCertificateScope(
          params.methodLevels,
          normaliseLevelIIITechnicianCertificateRecord(row).methodLevels
        )
    )
    .map((row) => normaliseLevelIIITechnicianCertificateRecord(row))
    .find((row) => compareLevelIIITechnicianCertificateRecency(row, candidateRecord) >= 0);

  if (blockingConflict) {
    throw new Error(
      `An active Level III certificate already covers this technician scope (${blockingConflict.certificateNumber}). Revoke or supersede the newer certificate before issuing an older replacement.`
    );
  }
}

export async function getAllLevelIIITechnicianCertificates() {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  const rows = await db.select().from(levelIIITechnicianCertificates);
  return rows
    .map((row) => normaliseLevelIIITechnicianCertificateRecord(row))
    .sort((a, b) => {
      const left = a.issuedDate ? new Date(a.issuedDate).getTime() : 0;
      const right = b.issuedDate ? new Date(b.issuedDate).getTime() : 0;
      return right - left;
    });
}

export async function createLevelIIITechnicianCertificate(
  data: typeof levelIIITechnicianCertificates.$inferInsert & {
    attachmentFileDataUrl?: string | null;
    attachmentFileName?: string | null;
  }
) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  await ensureRuntimeColumn("levelIIIAssessments", "methodLevels", "JSON NULL");

  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, data.technicianId))
    .limit(1);
  if (!technician[0]) {
    throw new Error("Selected technician was not found.");
  }

  const assessment =
    data.assessmentId && Number(data.assessmentId) > 0
      ? (
          await db
            .select()
            .from(levelIIIAssessments)
            .where(eq(levelIIIAssessments.id, Number(data.assessmentId)))
            .limit(1)
        )[0] ?? null
      : null;

  if (assessment && assessment.technicianId !== data.technicianId) {
    throw new Error("Selected assessment does not belong to the selected technician.");
  }

  const methodLevels = cleanLevelIIIAssessmentMethodLevels(
    data.methodLevels,
    data.method ?? assessment?.method ?? technician[0].methods ?? technician[0].method,
    data.level ?? assessment?.level ?? technician[0].level
  );
  if (methodLevels.length === 0) {
    throw new Error("Select at least one certificate method and level.");
  }

  const issuedDate = parseOptionalLevelIIIDate(data.issuedDate) ?? startOfDay(new Date());
  const validUntil = resolveLevelIIITechnicianCertificateValidUntil({
    issuedDate,
    validUntil: data.validUntil,
    validityValue: data.validityValue ?? null,
    validityUnit:
      (data.validityUnit as LevelIIITechnicianCertificateValidityUnit | null | undefined) ?? null,
  });
  const manualCertificateNumber = resolveLevelIIITechnicianCertificateNumberInput(data.certificateNumber);
  const resolvedCertificateNumber =
    manualCertificateNumber ?? (await generateLevelIIITechnicianCertificateNumber());
  await ensureLevelIIITechnicianCertificateNumberIsUnique(resolvedCertificateNumber);
  const nextCertificateStatus = getNormalisedLevelIIITechnicianCertificateStatus(data.status, validUntil);
  await assertNoBlockingLevelIIITechnicianCertificateScopeConflict({
    technicianId: data.technicianId,
    methodLevels,
    status: nextCertificateStatus,
    issuedDate,
  });
  const attachmentFileDataUrl = cleanOptionalText(data.attachmentFileDataUrl);
  const storedFile = attachmentFileDataUrl
    ? await stageLevelIIITechnicianCertificateStoredFile({
        clientId: technician[0].clientId,
        technicianName: technician[0].name,
        certificateNumber: resolvedCertificateNumber,
        fileDataUrl: attachmentFileDataUrl,
        fileNameHint: cleanOptionalText(data.attachmentFileName) ?? cleanOptionalText(data.fileName),
      })
    : null;
  const created = await createLevelIIITechnicianCertificateWithResolvedNumber({
    technicianId: data.technicianId,
    assessmentId: assessment?.id ?? null,
    clientId: technician[0].clientId,
    clientBranchId: technician[0].clientBranchId ?? null,
    certificateNumber: resolvedCertificateNumber,
    method: summariseLevelIIIAssessmentMethods(methodLevels),
    level: summariseLevelIIIAssessmentLevels(methodLevels),
    methodLevels,
    issuedDate,
    validUntil,
    validityValue: data.validityValue ?? null,
    validityUnit:
      (data.validityUnit as LevelIIITechnicianCertificateValidityUnit | null | undefined) ?? null,
    status: nextCertificateStatus,
    fileName: storedFile?.fileName ?? cleanOptionalText(data.fileName),
    fileUrl: storedFile?.fileUrl ?? cleanOptionalText(data.fileUrl),
    fileKey: storedFile?.fileKey ?? cleanOptionalText(data.fileKey),
    contentType: storedFile?.contentType ?? cleanOptionalText(data.contentType),
    sourceFileName: cleanOptionalText((data as any).sourceFileName),
    sourcePath: cleanOptionalText((data as any).sourcePath),
    approvalStatus: getNormalisedLevelIIITechnicianCertificateApprovalStatus(
      (data as any).approvalStatus
    ),
    approvalRequestedAt: (data as any).approvalRequestedAt ?? null,
    approvalRequestedBy: (data as any).approvalRequestedBy ?? null,
    approvedAt: (data as any).approvedAt ?? null,
    approvedBy: (data as any).approvedBy ?? null,
    approvalNote: cleanOptionalText((data as any).approvalNote),
    notes: cleanOptionalText(data.notes),
    issuedBy: data.issuedBy ?? null,
  }, data.technicianId, !manualCertificateNumber);
  if (created) {
    const scopeReconciliation = await reconcileActiveLevelIIITechnicianCertificateScope({
      certificateId: created.id,
      technicianId: created.technicianId,
      methodLevels: cleanLevelIIIAssessmentMethodLevels(
        created.methodLevels,
        created.method,
        created.level
      ),
      status: created.status,
      notes: created.notes,
    });
    Object.assign(created, {
      autoSupersededCertificates: scopeReconciliation.supersededCertificates.map((row) =>
        normaliseLevelIIITechnicianCertificateRecord(row)
      ),
    });
  }
  return created;
}

export async function updateLevelIIITechnicianCertificate(
  id: number,
  data: Partial<typeof levelIIITechnicianCertificates.$inferInsert> & {
    attachmentFileDataUrl?: string | null;
    attachmentFileName?: string | null;
  }
) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  await ensureRuntimeColumn("levelIIIAssessments", "methodLevels", "JSON NULL");

  const existing = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Level III certificate not found.");
  }

  const technicianId = data.technicianId ?? existing[0].technicianId;
  const technician = await db
    .select()
    .from(levelIIITechnicians)
    .where(eq(levelIIITechnicians.id, technicianId))
    .limit(1);
  if (!technician[0]) {
    throw new Error("Selected technician was not found.");
  }

  const assessmentId =
    data.assessmentId === undefined ? existing[0].assessmentId : data.assessmentId;
  const assessment =
    assessmentId && Number(assessmentId) > 0
      ? (
          await db
            .select()
            .from(levelIIIAssessments)
            .where(eq(levelIIIAssessments.id, Number(assessmentId)))
            .limit(1)
        )[0] ?? null
      : null;

  if (assessment && assessment.technicianId !== technicianId) {
    throw new Error("Selected assessment does not belong to the selected technician.");
  }

  const current = normaliseLevelIIITechnicianCertificateRecord(existing[0]);
  const methodLevels =
    data.methodLevels !== undefined || data.method !== undefined || data.level !== undefined
      ? cleanLevelIIIAssessmentMethodLevels(
          data.methodLevels,
          data.method ?? assessment?.method ?? current.method,
          data.level ?? assessment?.level ?? current.level
        )
      : cleanLevelIIIAssessmentMethodLevels(current.methodLevels, current.method, current.level);
  if (methodLevels.length === 0) {
    throw new Error("Select at least one certificate method and level.");
  }

  const issuedDate =
    data.issuedDate === undefined
      ? parseOptionalLevelIIIDate(current.issuedDate)
      : parseOptionalLevelIIIDate(data.issuedDate) ?? startOfDay(new Date());
  if (!issuedDate) {
    throw new Error("Issued date is required.");
  }

  const validityValue =
    data.validityValue === undefined ? current.validityValue : data.validityValue ?? null;
  const validityUnit =
    data.validityUnit === undefined
      ? ((current.validityUnit as LevelIIITechnicianCertificateValidityUnit | null | undefined) ??
          null)
      : ((data.validityUnit as LevelIIITechnicianCertificateValidityUnit | null | undefined) ??
          null);
  const validUntil = resolveLevelIIITechnicianCertificateValidUntil({
    issuedDate,
    validUntil: data.validUntil === undefined ? current.validUntil : data.validUntil,
    validityValue,
    validityUnit,
  });

  const certificateNumber =
    data.certificateNumber === undefined
      ? resolveLevelIIITechnicianCertificateNumberInput(existing[0].certificateNumber) ??
        (await generateLevelIIITechnicianCertificateNumber())
      : resolveLevelIIITechnicianCertificateNumberInput(data.certificateNumber) ??
        (await generateLevelIIITechnicianCertificateNumber());
  await ensureLevelIIITechnicianCertificateNumberIsUnique(certificateNumber, id);
  const nextAttachmentFileDataUrl = cleanOptionalText(data.attachmentFileDataUrl);
  const storedFile = nextAttachmentFileDataUrl
    ? await stageLevelIIITechnicianCertificateStoredFile({
        clientId: technician[0].clientId,
        technicianName: technician[0].name,
        certificateNumber,
        fileDataUrl: nextAttachmentFileDataUrl,
        fileNameHint: cleanOptionalText(data.attachmentFileName) ?? cleanOptionalText(data.fileName),
      })
    : null;
  const nextCertificateStatus = getNormalisedLevelIIITechnicianCertificateStatus(
    data.status === undefined ? current.status : data.status,
    validUntil
  );
  await assertNoBlockingLevelIIITechnicianCertificateScopeConflict({
    certificateId: id,
    technicianId,
    methodLevels,
    status: nextCertificateStatus,
    issuedDate,
    createdAt: existing[0].createdAt ?? null,
  });
  const nextCertificateMethod = summariseLevelIIIAssessmentMethods(methodLevels);
  const nextCertificateLevel = summariseLevelIIIAssessmentLevels(methodLevels);
  const nextCertificateSnapshot = {
    technicianId,
    assessmentId: assessment?.id ?? null,
    certificateNumber,
    method: nextCertificateMethod,
    level: nextCertificateLevel,
    methodLevels,
    issuedDate,
    validUntil,
    validityValue,
    validityUnit,
    status: nextCertificateStatus,
    fileName: storedFile
      ? storedFile.fileName
      : data.fileName === undefined
        ? current.fileName
        : cleanOptionalText(data.fileName),
    fileUrl: storedFile
      ? storedFile.fileUrl
      : data.fileUrl === undefined
        ? current.fileUrl
        : cleanOptionalText(data.fileUrl),
    fileKey: storedFile
      ? storedFile.fileKey
      : data.fileKey === undefined
        ? current.fileKey
        : cleanOptionalText(data.fileKey),
    contentType:
      storedFile
        ? storedFile.contentType
        : data.contentType === undefined
          ? current.contentType
          : cleanOptionalText(data.contentType),
    notes: data.notes === undefined ? current.notes : cleanOptionalText(data.notes),
  };
  const resetApprovalState =
    data.approvalStatus === undefined &&
    shouldResetLevelIIITechnicianCertificateApprovalOnChange({
      currentApprovalStatus: current.approvalStatus,
      existing: {
        technicianId: current.technicianId,
        assessmentId: current.assessmentId,
        certificateNumber: current.certificateNumber,
        method: current.method,
        level: current.level,
        methodLevels: current.methodLevels,
        issuedDate: current.issuedDate,
        validUntil: current.validUntil,
        validityValue: current.validityValue,
        validityUnit: current.validityUnit,
        status: current.status,
        fileName: current.fileName,
        fileUrl: current.fileUrl,
        fileKey: current.fileKey,
        contentType: current.contentType,
        notes: current.notes,
      },
      next: nextCertificateSnapshot,
    });

  try {
    await db
      .update(levelIIITechnicianCertificates)
      .set({
        technicianId,
        assessmentId: assessment?.id ?? null,
        clientId: technician[0].clientId,
        clientBranchId: technician[0].clientBranchId ?? null,
        certificateNumber,
        method: nextCertificateMethod,
        level: nextCertificateLevel,
        methodLevels,
        issuedDate,
        validUntil,
        validityValue,
        validityUnit,
        status: nextCertificateStatus,
        fileName: data.fileName === undefined ? undefined : nextCertificateSnapshot.fileName,
        fileUrl: data.fileUrl === undefined ? undefined : nextCertificateSnapshot.fileUrl,
        fileKey: data.fileKey === undefined ? undefined : nextCertificateSnapshot.fileKey,
        contentType:
          data.contentType === undefined ? undefined : nextCertificateSnapshot.contentType,
        sourceFileName:
          (data as any).sourceFileName === undefined
            ? undefined
            : cleanOptionalText((data as any).sourceFileName),
        sourcePath:
          (data as any).sourcePath === undefined
            ? undefined
            : cleanOptionalText((data as any).sourcePath),
        approvalStatus:
          resetApprovalState
            ? "draft"
            : (data as any).approvalStatus === undefined
              ? undefined
              : getNormalisedLevelIIITechnicianCertificateApprovalStatus(
                  (data as any).approvalStatus
                ),
        approvalRequestedAt:
          resetApprovalState
            ? null
            : (data as any).approvalRequestedAt === undefined
              ? undefined
              : (data as any).approvalRequestedAt ?? null,
        approvalRequestedBy:
          resetApprovalState
            ? null
            : (data as any).approvalRequestedBy === undefined
              ? undefined
              : (data as any).approvalRequestedBy ?? null,
        approvedAt:
          resetApprovalState
            ? null
            : (data as any).approvedAt === undefined
              ? undefined
              : (data as any).approvedAt ?? null,
        approvedBy:
          resetApprovalState
            ? null
            : (data as any).approvedBy === undefined
              ? undefined
              : (data as any).approvedBy ?? null,
        approvalNote:
          resetApprovalState
            ? null
            : (data as any).approvalNote === undefined
              ? undefined
              : cleanOptionalText((data as any).approvalNote),
        notes: data.notes === undefined ? undefined : nextCertificateSnapshot.notes,
        issuedBy: data.issuedBy === undefined ? undefined : data.issuedBy ?? null,
      })
      .where(eq(levelIIITechnicianCertificates.id, id));
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      throw new Error("Level III certificate number already exists.");
    }
    throw error;
  }

  await syncLegacyLevelIIITechnicianCertificateNumber(technicianId);
  const updated = (
    await db
      .select()
      .from(levelIIITechnicianCertificates)
      .where(eq(levelIIITechnicianCertificates.id, id))
      .limit(1)
  )[0];
  if (updated) {
    const scopeReconciliation = await reconcileActiveLevelIIITechnicianCertificateScope({
      certificateId: updated.id,
      technicianId: updated.technicianId,
      methodLevels: cleanLevelIIIAssessmentMethodLevels(
        updated.methodLevels,
        updated.method,
        updated.level
      ),
      status: updated.status,
      notes: updated.notes,
    });
    Object.assign(updated, {
      autoSupersededCertificates: scopeReconciliation.supersededCertificates.map((row) =>
        normaliseLevelIIITechnicianCertificateRecord(row)
      ),
    });
    await syncLevelIIITechnicianCertificateToPortalRequirements(updated);
  }
  return updated;
}

export async function deleteLevelIIITechnicianCertificate(id: number) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();
  const existing = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.id, id))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Level III certificate not found.");
  }

  await db.delete(levelIIITechnicianCertificates).where(eq(levelIIITechnicianCertificates.id, id));
  await syncLegacyLevelIIITechnicianCertificateNumber(existing[0].technicianId);
  return { success: true };
}

export async function updateLevelIIITechnicianCertificateApproval(data: {
  id: number;
  approvalStatus: "draft" | "in_review" | "approved" | "rejected";
  approvalRequestedAt?: Date | null;
  approvalRequestedBy?: number | null;
  approvedAt?: Date | null;
  approvedBy?: number | null;
  approvalNote?: string | null;
}) {
  return updateLevelIIITechnicianCertificate(data.id, {
    approvalStatus: data.approvalStatus,
    approvalRequestedAt:
      data.approvalRequestedAt === undefined ? undefined : data.approvalRequestedAt,
    approvalRequestedBy:
      data.approvalRequestedBy === undefined ? undefined : data.approvalRequestedBy,
    approvedAt: data.approvedAt === undefined ? undefined : data.approvedAt,
    approvedBy: data.approvedBy === undefined ? undefined : data.approvedBy,
    approvalNote: data.approvalNote === undefined ? undefined : data.approvalNote,
  } as Partial<typeof levelIIITechnicianCertificates.$inferInsert>);
}

export async function recordLevelIIITechnicianCertificateExport(data: {
  certificateId: number;
  exportFormat: "html" | "pdf";
  fileName: string;
  title?: string | null;
  subtitle?: string | null;
  artifactSummary?: Record<string, string | null> | null;
  artifactPayload?: Record<string, unknown> | null;
  exportedByUserId?: number | null;
}) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();

  const certificate = await db
    .select()
    .from(levelIIITechnicianCertificates)
    .where(eq(levelIIITechnicianCertificates.id, data.certificateId))
    .limit(1);
  if (!certificate[0]) {
    throw new Error("Level III certificate not found.");
  }
  if (!canExportLevelIIITechnicianCertificate(certificate[0].approvalStatus)) {
    throw new Error("Only approved Level III certificates can be exported.");
  }

  const result = await db.insert(levelIIITechnicianCertificateExports).values({
    certificateId: data.certificateId,
    technicianId: certificate[0].technicianId,
    clientId: certificate[0].clientId,
    exportFormat: data.exportFormat,
    fileName: cleanOptionalText(data.fileName) ?? `certificate-${data.certificateId}.${data.exportFormat}`,
    title: cleanOptionalText(data.title),
    subtitle: cleanOptionalText(data.subtitle),
    artifactSummary: data.artifactSummary ?? null,
    artifactPayload: data.artifactPayload ?? null,
    exportedByUserId: data.exportedByUserId ?? null,
  });

  const insertId = Number((result as any)?.[0]?.insertId ?? 0);
  const created = (
    await db
      .select()
      .from(levelIIITechnicianCertificateExports)
      .where(eq(levelIIITechnicianCertificateExports.id, insertId))
      .limit(1)
  )[0];

  return created ? normaliseLevelIIITechnicianCertificateExportRecord(created) : null;
}

export async function getLevelIIITechnicianCertificateExportHistory(
  certificateId: number,
  limit = 20
) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();

  const rows = await db
    .select()
    .from(levelIIITechnicianCertificateExports)
    .where(eq(levelIIITechnicianCertificateExports.certificateId, certificateId));

  const normalisedRows = rows
    .map((row) => normaliseLevelIIITechnicianCertificateExportRecord(row))
    .sort(
      (left, right) =>
        new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    )
    .slice(0, Math.max(1, limit));

  const actorIds = Array.from(
    new Set(
      normalisedRows
        .map((row) => row.exportedByUserId)
        .filter((value): value is number => value !== null && Number.isInteger(value) && value > 0)
    )
  );
  const actorRows =
    actorIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, actorIds))
      : [];
  const actorsById = new Map(actorRows.map((row) => [row.id, row]));

  return normalisedRows.map((row) => {
    const actor = row.exportedByUserId ? actorsById.get(row.exportedByUserId) : null;
    return {
      ...row,
      actorName: cleanOptionalText(actor?.name) ?? null,
      actorEmail: cleanOptionalText(actor?.email) ?? null,
    };
  });
}

export async function getAllLevelIIITechnicianCertificateExports(limit = 500) {
  await ensureLevelIIITechnicianCertificateRuntimeTable();

  const rows = await db.select().from(levelIIITechnicianCertificateExports);
  const normalisedRows = rows
    .map((row) => normaliseLevelIIITechnicianCertificateExportRecord(row))
    .sort(
      (left, right) =>
        new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    )
    .slice(0, Math.max(1, limit));

  const actorIds = Array.from(
    new Set(
      normalisedRows
        .map((row) => row.exportedByUserId)
        .filter((value): value is number => value !== null && Number.isInteger(value) && value > 0)
    )
  );
  const actorRows =
    actorIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, actorIds))
      : [];
  const actorsById = new Map(actorRows.map((row) => [row.id, row]));

  return normalisedRows.map((row) => {
    const actor = row.exportedByUserId ? actorsById.get(row.exportedByUserId) : null;
    return {
      ...row,
      actorName: cleanOptionalText(actor?.name) ?? null,
      actorEmail: cleanOptionalText(actor?.email) ?? null,
    };
  });
}

export async function getAllLevelIIIEquipment() {
  const rows = await db.select().from(levelIIIEquipment);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function findDuplicateLevelIIIEquipment(
  serialNumber: string,
  excludeId?: number
) {
  return db
    .select()
    .from(levelIIIEquipment)
    .then((rows) =>
      rows.find((item) => {
        if (excludeId && item.id === excludeId) return false;
        return item.serialNumber.toLowerCase() === serialNumber.toLowerCase();
      })
    );
}

export async function createLevelIIIEquipment(
  data: typeof levelIIIEquipment.$inferInsert
) {
  const serialNumber = cleanRequiredText(data.serialNumber, "Serial number");
  const duplicate = await findDuplicateLevelIIIEquipment(serialNumber);
  if (duplicate) {
    throw new Error(
      "Duplicate Level III equipment detected. Check the serial number."
    );
  }

  return db.insert(levelIIIEquipment).values({
    name: cleanRequiredText(data.name, "Equipment name"),
    serialNumber,
    status: data.status ?? "Available",
    sharedWithMainEquipment: data.sharedWithMainEquipment ?? false,
    owner: cleanRequiredText(data.owner, "Owner"),
    calibrationType: cleanOptionalText(data.calibrationType),
    lastServiceDate: parseOptionalLevelIIIDate(data.lastServiceDate),
    nextDueDate: parseOptionalLevelIIIDate(data.nextDueDate),
    notes: cleanOptionalText(data.notes),
  });
}

export async function updateLevelIIIEquipment(
  id: number,
  data: Partial<typeof levelIIIEquipment.$inferInsert>
) {
  if (data.serialNumber !== undefined) {
    const serialNumber = cleanRequiredText(data.serialNumber, "Serial number");
    const duplicate = await findDuplicateLevelIIIEquipment(serialNumber, id);
    if (duplicate) {
      throw new Error(
        "Duplicate Level III equipment detected. Check the serial number."
      );
    }
  }

  return db
    .update(levelIIIEquipment)
    .set({
      name:
        data.name === undefined
          ? undefined
          : cleanRequiredText(data.name, "Equipment name"),
      serialNumber:
        data.serialNumber === undefined
          ? undefined
          : cleanRequiredText(data.serialNumber, "Serial number"),
      status: data.status,
      sharedWithMainEquipment: data.sharedWithMainEquipment,
      owner:
        data.owner === undefined
          ? undefined
          : cleanRequiredText(data.owner, "Owner"),
      calibrationType:
        data.calibrationType === undefined
          ? undefined
          : cleanOptionalText(data.calibrationType),
      lastServiceDate:
        data.lastServiceDate === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.lastServiceDate),
      nextDueDate:
        data.nextDueDate === undefined
          ? undefined
          : parseOptionalLevelIIIDate(data.nextDueDate),
      notes: data.notes === undefined ? undefined : cleanOptionalText(data.notes),
    })
    .where(eq(levelIIIEquipment.id, id));
}

export async function deleteLevelIIIEquipment(id: number) {
  return db.delete(levelIIIEquipment).where(eq(levelIIIEquipment.id, id));
}

export async function getAllLevelIIISpecimens() {
  const rows = await db.select().from(levelIIISpecimens);
  return rows.sort((a, b) => a.specimenNumber.localeCompare(b.specimenNumber));
}

function findDuplicateLevelIIISpecimen(
  specimenNumber: string,
  excludeId?: number
) {
  return db
    .select()
    .from(levelIIISpecimens)
    .then((rows) =>
      rows.find((item) => {
        if (excludeId && item.id === excludeId) return false;
        return (
          item.specimenNumber.toLowerCase() === specimenNumber.toLowerCase()
        );
      })
    );
}

export async function createLevelIIISpecimen(
  data: typeof levelIIISpecimens.$inferInsert
) {
  const specimenNumber = cleanRequiredText(
    data.specimenNumber,
    "Specimen number"
  );
  const duplicate = await findDuplicateLevelIIISpecimen(specimenNumber);
  if (duplicate) {
    throw new Error(
      "Duplicate Level III specimen detected. Check the specimen number."
    );
  }

  return db.insert(levelIIISpecimens).values({
    specimenNumber,
    name: cleanRequiredText(data.name, "Specimen name"),
    specimenType: cleanRequiredText(data.specimenType, "Specimen type"),
    status: data.status ?? "Available",
    sharedWithMainSpecimens: data.sharedWithMainSpecimens ?? false,
    masteringStatus: data.masteringStatus ?? "Pending",
    notes: cleanOptionalText(data.notes),
  });
}

export async function updateLevelIIISpecimen(
  id: number,
  data: Partial<typeof levelIIISpecimens.$inferInsert>
) {
  if (data.specimenNumber !== undefined) {
    const specimenNumber = cleanRequiredText(
      data.specimenNumber,
      "Specimen number"
    );
    const duplicate = await findDuplicateLevelIIISpecimen(specimenNumber, id);
    if (duplicate) {
      throw new Error(
        "Duplicate Level III specimen detected. Check the specimen number."
      );
    }
  }

  return db
    .update(levelIIISpecimens)
    .set({
      specimenNumber:
        data.specimenNumber === undefined
          ? undefined
          : cleanRequiredText(data.specimenNumber, "Specimen number"),
      name:
        data.name === undefined
          ? undefined
          : cleanRequiredText(data.name, "Specimen name"),
      specimenType:
        data.specimenType === undefined
          ? undefined
          : cleanRequiredText(data.specimenType, "Specimen type"),
      status: data.status,
      sharedWithMainSpecimens: data.sharedWithMainSpecimens,
      masteringStatus: data.masteringStatus,
      notes: data.notes === undefined ? undefined : cleanOptionalText(data.notes),
    })
    .where(eq(levelIIISpecimens.id, id));
}

export async function deleteLevelIIISpecimen(id: number) {
  return db.delete(levelIIISpecimens).where(eq(levelIIISpecimens.id, id));
}

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export async function getAllEquipment(branchId?: number) {
  return branchId
    ? db.select().from(equipment).where(eq(equipment.branchId, branchId))
    : db.select().from(equipment);
}

export async function getEquipmentById(id: number) {
  const result = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createEquipment(data: typeof equipment.$inferInsert) {
  const allEquipment = await db.select().from(equipment);
  const duplicate = allEquipment.find((item) => {
    if (
      data.serialNumber &&
      item.serialNumber &&
      item.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  if (duplicate) {
    throw new Error("Duplicate equipment detected. Check the serial number.");
  }

  return db.insert(equipment).values(data);
}

export async function updateEquipment(
  id: number,
  data: Partial<typeof equipment.$inferInsert>
) {
  const allEquipment = await db.select().from(equipment);
  const duplicate = allEquipment.find((item) => {
    if (item.id === id) return false;
    if (
      data.serialNumber &&
      item.serialNumber &&
      item.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  if (duplicate) {
    throw new Error("Duplicate equipment detected. Check the serial number.");
  }

  return db.update(equipment).set(data).where(eq(equipment.id, id));
}

// ---------------------------------------------------------------------------
// Equipment Documents
// ---------------------------------------------------------------------------

export async function getEquipmentDocuments(equipmentId: number) {
  return db
    .select()
    .from(equipmentDocuments)
    .where(eq(equipmentDocuments.equipmentId, equipmentId));
}

export async function createEquipmentDocument(
  data: typeof equipmentDocuments.$inferInsert
) {
  return db.insert(equipmentDocuments).values(data);
}

export async function deleteEquipmentDocument(id: number) {
  return db.delete(equipmentDocuments).where(eq(equipmentDocuments.id, id));
}

export async function getEquipmentLoans(equipmentId: number) {
  return db
    .select()
    .from(equipmentLoans)
    .where(eq(equipmentLoans.equipmentId, equipmentId));
}

export async function createEquipmentLoan(
  data: typeof equipmentLoans.$inferInsert
) {
  const item = await getEquipmentById(data.equipmentId);
  if (!item) throw new Error("Equipment not found.");
  if (!item.branchId)
    throw new Error(
      "Equipment must belong to a branch before it can be loaned."
    );
  if (item.branchId !== data.fromBranchId)
    throw new Error(
      "Equipment branch does not match the selected origin branch."
    );
  if (data.fromBranchId === data.toBranchId)
    throw new Error(
      "Loan destination branch must be different from the origin branch."
    );

  const existingLoans = await getEquipmentLoans(data.equipmentId);
  const openLoan = existingLoans.find((loan) => !loan.returnedAt);
  if (openLoan) throw new Error("This equipment item is already on loan.");

  await db.insert(equipmentLoans).values(data);
  await updateEquipment(data.equipmentId, { branchId: data.toBranchId });
  return getEquipmentLoans(data.equipmentId);
}

export async function returnEquipmentLoan(loanId: number) {
  const loan = await db
    .select()
    .from(equipmentLoans)
    .where(eq(equipmentLoans.id, loanId))
    .limit(1);

  const currentLoan = loan[0];
  if (!currentLoan) throw new Error("Loan record not found.");
  if (currentLoan.returnedAt)
    throw new Error("This loan has already been returned.");

  await db
    .update(equipmentLoans)
    .set({ returnedAt: new Date() })
    .where(eq(equipmentLoans.id, loanId));

  await updateEquipment(currentLoan.equipmentId, {
    branchId: currentLoan.fromBranchId,
  });
  return getEquipmentLoans(currentLoan.equipmentId);
}

// ---------------------------------------------------------------------------
// Specimens
// ---------------------------------------------------------------------------

export async function getAllSpecimens(branchId?: number) {
  return branchId
    ? db.select().from(specimens).where(eq(specimens.branchId, branchId))
    : db.select().from(specimens);
}

export async function getSpecimenById(id: number) {
  const result = await db
    .select()
    .from(specimens)
    .where(eq(specimens.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createSpecimen(data: typeof specimens.$inferInsert) {
  const allSpecimens = await db.select().from(specimens);
  const duplicate = allSpecimens.find((item) => {
    if (
      data.serialNumber &&
      item.serialNumber &&
      item.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  if (duplicate) {
    throw new Error("Duplicate specimen detected. Check the serial number.");
  }

  return db.insert(specimens).values(data);
}

export async function updateSpecimen(
  id: number,
  data: Partial<typeof specimens.$inferInsert>
) {
  const allSpecimens = await db.select().from(specimens);
  const duplicate = allSpecimens.find((item) => {
    if (item.id === id) return false;
    if (
      data.serialNumber &&
      item.serialNumber &&
      item.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()
    ) {
      return true;
    }
    return false;
  });

  if (duplicate) {
    throw new Error("Duplicate specimen detected. Check the serial number.");
  }

  return db.update(specimens).set(data).where(eq(specimens.id, id));
}

// ---------------------------------------------------------------------------
// Specimen Documents
// ---------------------------------------------------------------------------

export async function getSpecimenDocuments(specimenId: number) {
  return db
    .select()
    .from(specimenDocuments)
    .where(eq(specimenDocuments.specimenId, specimenId));
}

export async function createSpecimenDocument(
  data: typeof specimenDocuments.$inferInsert
) {
  return db.insert(specimenDocuments).values(data);
}

export async function deleteSpecimenDocument(id: number) {
  return db.delete(specimenDocuments).where(eq(specimenDocuments.id, id));
}

// ---------------------------------------------------------------------------
// Specimen Types
// ---------------------------------------------------------------------------

export async function getAllSpecimenTypes() {
  return db.select().from(specimenTypes);
}

export async function createSpecimenType(
  data: typeof specimenTypes.$inferInsert
) {
  try {
    await db.execute(
      sql`INSERT INTO specimenTypes (name, material, size, weight, description) 
          VALUES (${data.name}, ${data.material ?? null}, ${data.size ?? null}, ${data.weight ?? null}, ${data.description ?? null})`
    );
  } catch (error: any) {
    const cause = error?.cause ?? error;
    const code = cause?.code ?? "";
    const message = (cause?.message ?? error?.message ?? "").toLowerCase();
    if (code === "ER_DUP_ENTRY" || message.includes("duplicate entry")) {
      throw new Error("A specimen type with this name already exists.");
    }
    throw error;
  }
  return getAllSpecimenTypes();
}

export async function updateSpecimenType(
  id: number,
  data: Partial<typeof specimenTypes.$inferInsert>
) {
  try {
    await db
      .update(specimenTypes)
      .set({
        name: data.name?.trim(),
        material: data.material ?? null,
        size: data.size ?? null,
        weight: data.weight ?? null,
        description: data.description ?? null,
      })
      .where(eq(specimenTypes.id, id));
  } catch (error: any) {
    const cause = error?.cause ?? error;
    const code = cause?.code ?? "";
    const message = (cause?.message ?? error?.message ?? "").toLowerCase();
    if (code === "ER_DUP_ENTRY" || message.includes("duplicate entry")) {
      throw new Error("A specimen type with this name already exists.");
    }
    throw error;
  }

  return getAllSpecimenTypes();
}



// ---------------------------------------------------------------------------
// Specimen Loans
// ---------------------------------------------------------------------------

export async function getSpecimenLoans(specimenId: number) {
  return db
    .select()
    .from(specimenLoans)
    .where(eq(specimenLoans.specimenId, specimenId));
}

export async function createSpecimenLoan(
  data: typeof specimenLoans.$inferInsert
) {
  const item = await getSpecimenById(data.specimenId);
  if (!item) throw new Error("Specimen not found.");
  if (!item.branchId)
    throw new Error(
      "Specimen must belong to a branch before it can be loaned."
    );
  if (item.branchId !== data.fromBranchId)
    throw new Error(
      "Specimen branch does not match the selected origin branch."
    );
  if (data.fromBranchId === data.toBranchId)
    throw new Error(
      "Loan destination branch must be different from the origin branch."
    );

  const existingLoans = await getSpecimenLoans(data.specimenId);
  const openLoan = existingLoans.find((loan) => !loan.returnedAt);
  if (openLoan) throw new Error("This specimen is already on loan.");

  await db.insert(specimenLoans).values(data);
  await updateSpecimen(data.specimenId, {
    branchId: data.toBranchId,
    status: "Loaned Out",
  });
  return getSpecimenLoans(data.specimenId);
}

export async function returnSpecimenLoan(loanId: number) {
  const loan = await db
    .select()
    .from(specimenLoans)
    .where(eq(specimenLoans.id, loanId))
    .limit(1);

  const currentLoan = loan[0];
  if (!currentLoan) throw new Error("Loan record not found.");
  if (currentLoan.returnedAt)
    throw new Error("This loan has already been returned.");

  await db
    .update(specimenLoans)
    .set({ returnedAt: new Date() })
    .where(eq(specimenLoans.id, loanId));

  await updateSpecimen(currentLoan.specimenId, {
    branchId: currentLoan.fromBranchId,
    status: "Available",
  });
  return getSpecimenLoans(currentLoan.specimenId);
}

// ---------------------------------------------------------------------------
// KPI Templates
// ---------------------------------------------------------------------------

export async function getAllKPITemplates(branchId?: number) {
  return branchId
    ? db
        .select()
        .from(kpiTemplates)
        .where(eq(kpiTemplates.branchId, branchId))
    : db.select().from(kpiTemplates);
}

export async function getKPITemplateById(id: number) {
  const result = await db
    .select()
    .from(kpiTemplates)
    .where(eq(kpiTemplates.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createKPITemplate(
  data: typeof kpiTemplates.$inferInsert
) {
  return db.insert(kpiTemplates).values(data);
}

export async function updateKPITemplate(
  id: number,
  data: Partial<typeof kpiTemplates.$inferInsert>
) {
  return db.update(kpiTemplates).set(data).where(eq(kpiTemplates.id, id));
}

// ---------------------------------------------------------------------------
// KPI Questions
// ---------------------------------------------------------------------------

export async function getKPIQuestionsByTemplate(kpiTemplateId: number) {
  const rows = await db
    .select()
    .from(kpiQuestions)
    .where(eq(kpiQuestions.kpiTemplateId, kpiTemplateId));

  return rows.sort((left, right) => {
    const orderDiff = (left.displayOrder ?? 0) - (right.displayOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return left.id - right.id;
  });
}

export async function createKPIQuestion(
  data: typeof kpiQuestions.$inferInsert
) {
  return db.insert(kpiQuestions).values(data);
}

export async function updateKPIQuestion(
  id: number,
  data: Partial<typeof kpiQuestions.$inferInsert>
) {
  return db.update(kpiQuestions).set(data).where(eq(kpiQuestions.id, id));
}

export async function deleteKPIQuestion(id: number) {
  return db.delete(kpiQuestions).where(eq(kpiQuestions.id, id));
}

// ---------------------------------------------------------------------------
// KPI Records
// ---------------------------------------------------------------------------

export async function getAllKPIRecords() {
  const rows = await db.select().from(kpiRecords);
  return rows.sort((left, right) => {
    const leftDate = parseReportDate(left.evaluationDate)?.getTime() ?? 0;
    const rightDate = parseReportDate(right.evaluationDate)?.getTime() ?? 0;
    return rightDate - leftDate || right.id - left.id;
  });
}

export async function getKPIRecordById(id: number) {
  const result = await db
    .select()
    .from(kpiRecords)
    .where(eq(kpiRecords.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createKPIRecord(data: typeof kpiRecords.$inferInsert) {
  return db.insert(kpiRecords).values(data);
}

export async function updateKPIRecord(
  id: number,
  data: Partial<typeof kpiRecords.$inferInsert>
) {
  return db.update(kpiRecords).set(data).where(eq(kpiRecords.id, id));
}

// ---------------------------------------------------------------------------
// KPI Answers
// ---------------------------------------------------------------------------

export async function getKPIAnswersByRecord(kpiRecordId: number) {
  const rows = await db
    .select()
    .from(kpiAnswers)
    .where(eq(kpiAnswers.kpiRecordId, kpiRecordId));

  return rows.sort((left, right) => left.kpiQuestionId - right.kpiQuestionId);
}

export async function createKPIAnswer(data: typeof kpiAnswers.$inferInsert) {
  return db.insert(kpiAnswers).values(data);
}

export async function updateKPIAnswer(
  id: number,
  data: Partial<typeof kpiAnswers.$inferInsert>
) {
  return db.update(kpiAnswers).set(data).where(eq(kpiAnswers.id, id));
}

export async function upsertKPIAnswer(
  data: typeof kpiAnswers.$inferInsert
) {
  const existing = await db
    .select()
    .from(kpiAnswers)
    .where(
      and(
        eq(kpiAnswers.kpiRecordId, data.kpiRecordId),
        eq(kpiAnswers.kpiQuestionId, data.kpiQuestionId)
      )
    )
    .limit(1);

  const cleanedAnswerText = data.answerText?.trim() || null;
  const cleanedAnswerValue = data.answerValue?.trim() || null;

  if (existing[0]) {
    await db
      .update(kpiAnswers)
      .set({
        answerText: cleanedAnswerText,
        answerValue: cleanedAnswerValue,
      })
      .where(eq(kpiAnswers.id, existing[0].id));

    return existing[0].id;
  }

  const result = await db.insert(kpiAnswers).values({
    kpiRecordId: data.kpiRecordId,
    kpiQuestionId: data.kpiQuestionId,
    answerText: cleanedAnswerText,
    answerValue: cleanedAnswerValue,
  });

  return result;
}

export async function deleteKPIRecord(id: number) {
  await db.delete(kpiAnswers).where(eq(kpiAnswers.kpiRecordId, id));
  return db.delete(kpiRecords).where(eq(kpiRecords.id, id));
}

// ---------------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------------

export async function getAllLecturers(branchId?: number) {
  return branchId
    ? db.select().from(lecturers).where(eq(lecturers.branchId, branchId))
    : db.select().from(lecturers);
}

export async function getLecturerById(id: number) {
  const result = await db
    .select()
    .from(lecturers)
    .where(eq(lecturers.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createLecturer(data: typeof lecturers.$inferInsert) {
  return db.insert(lecturers).values(data);
}

export async function updateLecturer(
  id: number,
  data: Partial<typeof lecturers.$inferInsert>
) {
  return db.update(lecturers).set(data).where(eq(lecturers.id, id));
}

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

export async function getAllMethods() {
  await ensureMethodRuntimeColumns();
  return db.select().from(methods);
}

export async function createMethod(data: typeof methods.$inferInsert) {
  const allMethods = await getAllMethods();
  const resolvedColor =
    data.color?.trim() || suggestMethodColor(data.name, allMethods.map((method) => method.color));
  if (!/^#[0-9a-fA-F]{6}$/.test(resolvedColor)) {
    throw new Error("Method colour must be a valid hex value like #dc2626.");
  }

  try {
    return await db.insert(methods).values({
      ...data,
      name: data.name.trim(),
      color: resolvedColor,
      description: data.description ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("duplicate entry") || message.includes("er_dup_entry")) {
      throw new Error("A method with this name already exists.");
    }
    throw error;
  }
}

export async function updateMethod(
  id: number,
  data: Partial<typeof methods.$inferInsert>
) {
  try {
    await ensureMethodRuntimeColumns();
    const existingMethod = await db
      .select()
      .from(methods)
      .where(eq(methods.id, id))
      .limit(1);

    const methodRecord = existingMethod[0];
    if (!methodRecord) {
      throw new Error("Method not found.");
    }

    const allMethods = await getAllMethods();
    const nextName = data.name?.trim() || methodRecord.name;
    const nextColor =
      data.color === undefined
        ? methodRecord.color
        : data.color?.trim() || suggestMethodColor(
            nextName,
            allMethods
              .filter((method) => method.id !== id)
              .map((method) => method.color)
          );

    if (!nextColor || !/^#[0-9a-fA-F]{6}$/.test(nextColor)) {
      throw new Error("Method colour must be a valid hex value like #dc2626.");
    }

    await db
      .update(methods)
      .set({
        name: nextName,
        color: nextColor,
        description: data.description ?? null,
      })
      .where(eq(methods.id, id));
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("duplicate entry") || message.includes("er_dup_entry")) {
      throw new Error("A method with this name already exists.");
    }
    throw error;
  }

  return getAllMethods();
}

// ---------------------------------------------------------------------------
// Training Offerings
// ---------------------------------------------------------------------------

export async function getAllTrainingOfferings(branchId?: number) {
  const rows = branchId
    ? await db
        .select()
        .from(trainingOfferings)
        .where(eq(trainingOfferings.branchId, branchId))
    : await db.select().from(trainingOfferings);

  return rows.sort((left, right) => {
    const leftTime = left.startDate ? new Date(left.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.startDate ? new Date(right.startDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.name.localeCompare(right.name);
  });
}

export async function createTrainingOffering(
  data: typeof trainingOfferings.$inferInsert
) {
  const trimmedName = data.name.trim();
  if (!trimmedName) {
    throw new Error("Training name is required.");
  }

  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (startDate.getTime() > endDate.getTime()) {
      throw new Error("Start date cannot be after end date.");
    }
  }

  if (data.courseId) {
    const course = await getCourseById(data.courseId);
    if (!course) {
      throw new Error("Selected course could not be found.");
    }

    if (data.branchId && course.branchId && course.branchId !== data.branchId) {
      throw new Error("Selected course does not belong to the selected branch.");
    }
  }

  if (data.branchId) {
    const branch = await getBranchById(data.branchId);
    if (!branch) {
      throw new Error("Selected branch could not be found.");
    }
  }

  return db.insert(trainingOfferings).values({
    ...data,
    name: trimmedName,
    description: data.description?.trim() || null,
    courseId: data.courseId ?? null,
    branchId: data.branchId ?? null,
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null,
    status: data.status ?? "Planned",
  });
}

export async function updateTrainingOffering(
  id: number,
  data: Partial<typeof trainingOfferings.$inferInsert>
) {
  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error("Training name is required.");
    }
    data.name = trimmedName;
  }

  const existingRows = await db
    .select()
    .from(trainingOfferings)
    .where(eq(trainingOfferings.id, id))
    .limit(1);
  const existing = existingRows[0];

  if (!existing) {
    throw new Error("Training offering not found.");
  }

  const nextCourseId = data.courseId === undefined ? existing.courseId : data.courseId;
  const nextBranchId = data.branchId === undefined ? existing.branchId : data.branchId;
  const nextStartDate = data.startDate === undefined ? existing.startDate : data.startDate;
  const nextEndDate = data.endDate === undefined ? existing.endDate : data.endDate;

  if (nextStartDate && nextEndDate) {
    const startDate = new Date(nextStartDate);
    const endDate = new Date(nextEndDate);
    if (startDate.getTime() > endDate.getTime()) {
      throw new Error("Start date cannot be after end date.");
    }
  }

  if (nextCourseId) {
    const course = await getCourseById(nextCourseId);
    if (!course) {
      throw new Error("Selected course could not be found.");
    }

    if (nextBranchId && course.branchId && course.branchId !== nextBranchId) {
      throw new Error("Selected course does not belong to the selected branch.");
    }
  }

  if (nextBranchId) {
    const branch = await getBranchById(nextBranchId);
    if (!branch) {
      throw new Error("Selected branch could not be found.");
    }
  }

  return db
    .update(trainingOfferings)
    .set({
      ...data,
      description:
        data.description === undefined ? undefined : data.description?.trim() || null,
      courseId: data.courseId === undefined ? undefined : data.courseId ?? null,
      branchId: data.branchId === undefined ? undefined : data.branchId ?? null,
      startDate: data.startDate === undefined ? undefined : data.startDate ?? null,
      endDate: data.endDate === undefined ? undefined : data.endDate ?? null,
    })
    .where(eq(trainingOfferings.id, id));
}

export async function deleteTrainingOffering(id: number) {
  return db.delete(trainingOfferings).where(eq(trainingOfferings.id, id));
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getAllDocuments(branchId?: number) {
  const rows = branchId
    ? await db.select().from(documents).where(eq(documents.branchId, branchId))
    : await db.select().from(documents);

  return rows.sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  });
}

export async function getDocumentById(id: number) {
  const result = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createDocument(data: typeof documents.$inferInsert) {
  return db.insert(documents).values(data);
}

export async function updateDocument(
  id: number,
  data: Partial<typeof documents.$inferInsert>
) {
  return db.update(documents).set(data).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  return db.delete(documents).where(eq(documents.id, id));
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export async function getPlannerEntriesByUser(userId: number) {
  return db
    .select()
    .from(plannerEntries)
    .where(eq(plannerEntries.userId, userId));
}

export async function createPlannerEntry(
  data: typeof plannerEntries.$inferInsert
) {
  return db.insert(plannerEntries).values(data);
}

async function getPlannerEntryByIdForUser(id: number, userId: number) {
  const rows = await db
    .select()
    .from(plannerEntries)
    .where(
      and(eq(plannerEntries.id, id), eq(plannerEntries.userId, userId))
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function updatePlannerEntryForUser(
  userId: number,
  id: number,
  data: Partial<typeof plannerEntries.$inferInsert>
) {
  const existing = await getPlannerEntryByIdForUser(id, userId);
  if (!existing) {
    throw new Error("Planner entry not found.");
  }

  return db
    .update(plannerEntries)
    .set(data)
    .where(and(eq(plannerEntries.id, id), eq(plannerEntries.userId, userId)));
}

export async function deletePlannerEntryForUser(userId: number, id: number) {
  const existing = await getPlannerEntryByIdForUser(id, userId);
  if (!existing) {
    throw new Error("Planner entry not found.");
  }

  return db
    .delete(plannerEntries)
    .where(and(eq(plannerEntries.id, id), eq(plannerEntries.userId, userId)));
}

const DEFAULT_PLANNER_TIMESHEET_OPTIONS = [
  {
    label: "Training",
    description:
      "Presenting training, preparing course material, or supporting course delivery.",
    hoursCategory: "working",
  },
  {
    label: "Training Documentation",
    description:
      "Creating or updating course notes, practical exercises, or training packs.",
    hoursCategory: "working",
  },
  {
    label: "EOC Exams / Rewrites",
    description: "Invigilating end-of-course exams or rewrite sessions.",
    hoursCategory: "working",
  },
  {
    label: "EOC Marking",
    description: "Marking end-of-course examinations and related moderation.",
    hoursCategory: "working",
  },
  {
    label: "EOC Technical Support",
    description: "Technical assistance during end-of-course examinations.",
    hoursCategory: "working",
  },
  {
    label: "PCN Examination",
    description: "Invigilating PCN or Radiation Safety examinations.",
    hoursCategory: "working",
  },
  {
    label: "PCN Technical Support",
    description: "Technical assistance during PCN or Radiation Safety examinations.",
    hoursCategory: "working",
  },
  {
    label: "Level III Consulting",
    description: "Technician assessments, authorisations, audits, or consulting support.",
    hoursCategory: "working",
  },
  {
    label: "Support",
    description:
      "Support work such as reception, finance, HR, marketing, management coordination, or quality.",
    hoursCategory: "working",
  },
  {
    label: "Leave / Public Holiday",
    description:
      "Annual leave, sick leave, family responsibility leave, or public holiday tracking.",
    hoursCategory: "non_working",
  },
] as const;

function getDateOnlyKey(value: Date | string | null | undefined) {
  if (!value) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function isDateKeyInRange(dateKey: string, fromDate?: Date | null, toDate?: Date | null) {
  if (!dateKey) return false;
  const fromKey = fromDate ? getDateOnlyKey(fromDate) : null;
  const toKey = toDate ? getDateOnlyKey(toDate) : null;
  if (fromKey && dateKey < fromKey) return false;
  if (toKey && dateKey > toKey) return false;
  return true;
}

async function ensurePlannerTimesheetRuntimeTables() {
  await ensureRuntimeTable(
    "plannerTimesheetProfiles",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetProfiles\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`department\` VARCHAR(255) NULL,
      \`signatureName\` VARCHAR(255) NULL,
      \`personalLeaveAllowanceDays\` INT NULL,
      \`personalLeaveCarryOverDays\` INT NOT NULL DEFAULT 0,
      \`leaveYearStartMonth\` INT NOT NULL DEFAULT 1,
      \`monThuStartTime\` VARCHAR(10) NULL,
      \`monThuEndTime\` VARCHAR(10) NULL,
      \`fridayStartTime\` VARCHAR(10) NULL,
      \`fridayEndTime\` VARCHAR(10) NULL,
      \`weekendStartTime\` VARCHAR(10) NULL,
      \`weekendEndTime\` VARCHAR(10) NULL,
      \`monThuTemplateId\` INT NULL,
      \`fridayTemplateId\` INT NULL,
      \`weekendTemplateId\` INT NULL,
      \`lunchBreakMinutes\` INT NOT NULL DEFAULT 60,
      \`teaBreakMinutes\` INT NOT NULL DEFAULT 30,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`plannerTimesheetProfiles_user_unique\` (\`userId\`)
    )`
  );
  await ensureRuntimeColumn("plannerTimesheetProfiles", "monThuStartTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "monThuEndTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "personalLeaveAllowanceDays", "INT NULL");
  await ensureRuntimeColumn(
    "plannerTimesheetProfiles",
    "personalLeaveCarryOverDays",
    "INT NOT NULL DEFAULT 0"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetProfiles",
    "leaveYearStartMonth",
    "INT NOT NULL DEFAULT 1"
  );
  await ensureRuntimeColumn("plannerTimesheetProfiles", "fridayStartTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "fridayEndTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "weekendStartTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "weekendEndTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "monThuTemplateId", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "fridayTemplateId", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "weekendTemplateId", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "lunchBreakMinutes", "INT NOT NULL DEFAULT 60");
  await ensureRuntimeColumn("plannerTimesheetProfiles", "teaBreakMinutes", "INT NOT NULL DEFAULT 30");
  await ensureRuntimeTable(
    "plannerTimesheetDepartmentCoverageSettings",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetDepartmentCoverageSettings\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`department\` VARCHAR(255) NOT NULL,
      \`minimumAvailableCount\` INT NULL,
      \`maximumPeopleOff\` INT NULL,
      \`mediumRiskPercent\` INT NOT NULL DEFAULT 25,
      \`highRiskPercent\` INT NOT NULL DEFAULT 50,
      \`notes\` TEXT NULL,
      \`createdByUserId\` INT NULL,
      \`updatedByUserId\` INT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`plannerTimesheetDepartmentCoverageSettings_department_unique\` (\`department\`)
    )`
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "minimumAvailableCount",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "maximumPeopleOff",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "mediumRiskPercent",
    "INT NOT NULL DEFAULT 25"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "highRiskPercent",
    "INT NOT NULL DEFAULT 50"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "notes",
    "TEXT NULL"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "createdByUserId",
    "INT NULL"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetDepartmentCoverageSettings",
    "updatedByUserId",
    "INT NULL"
  );
  await ensureRuntimeTable(
    "plannerTimesheetOptions",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetOptions\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`label\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NULL,
      \`sortOrder\` INT NOT NULL DEFAULT 0,
      \`hoursCategory\` VARCHAR(30) NOT NULL DEFAULT 'working',
      \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`plannerTimesheetOptions_user_idx\` (\`userId\`)
    )`
  );
  await ensureRuntimeColumn(
    "plannerTimesheetOptions",
    "hoursCategory",
    "VARCHAR(30) NOT NULL DEFAULT 'working'"
  );
  await ensureRuntimeTable(
    "plannerTimesheetEntries",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetEntries\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`entryDate\` DATE NOT NULL,
      \`startTime\` VARCHAR(10) NULL,
      \`endTime\` VARCHAR(10) NULL,
      \`lunchBreakMinutes\` INT NULL,
      \`teaBreakMinutes\` INT NULL,
      \`leavePortionPercent\` INT NULL,
      \`selectedOptionIds\` JSON NOT NULL,
      \`remarks\` TEXT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`plannerTimesheetEntries_user_date_unique\` (\`userId\`, \`entryDate\`),
      KEY \`plannerTimesheetEntries_user_idx\` (\`userId\`)
    )`
  );
  await ensureRuntimeColumn("plannerTimesheetEntries", "startTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetEntries", "endTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetEntries", "lunchBreakMinutes", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetEntries", "teaBreakMinutes", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetEntries", "leavePortionPercent", "INT NULL");
  await ensureRuntimeTable(
    "plannerTimesheetTemplates",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetTemplates\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`label\` VARCHAR(255) NOT NULL,
      \`description\` TEXT NULL,
      \`startTime\` VARCHAR(10) NULL,
      \`endTime\` VARCHAR(10) NULL,
      \`lunchBreakMinutes\` INT NULL,
      \`teaBreakMinutes\` INT NULL,
      \`leavePortionPercent\` INT NULL,
      \`selectedOptionIds\` JSON NOT NULL,
      \`remarks\` TEXT NULL,
      \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`plannerTimesheetTemplates_user_idx\` (\`userId\`)
    )`
  );
  await ensureRuntimeColumn("plannerTimesheetTemplates", "startTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetTemplates", "endTime", "VARCHAR(10) NULL");
  await ensureRuntimeColumn("plannerTimesheetTemplates", "lunchBreakMinutes", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetTemplates", "teaBreakMinutes", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetTemplates", "leavePortionPercent", "INT NULL");
  await ensureRuntimeColumn(
    "plannerTimesheetTemplates",
    "isActive",
    "BOOLEAN NOT NULL DEFAULT TRUE"
  );
  await ensureRuntimeTable(
    "plannerTimesheetHolidays",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetHolidays\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`holidayDate\` DATE NOT NULL,
      \`label\` VARCHAR(255) NOT NULL,
      \`holidayType\` VARCHAR(40) NOT NULL DEFAULT 'public_holiday',
      \`notes\` TEXT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`plannerTimesheetHolidays_user_idx\` (\`userId\`),
      KEY \`plannerTimesheetHolidays_date_idx\` (\`holidayDate\`)
    )`
  );
  await ensureRuntimeColumn(
    "plannerTimesheetHolidays",
    "holidayType",
    "VARCHAR(40) NOT NULL DEFAULT 'public_holiday'"
  );
  await ensureRuntimeTable(
    "plannerTimesheetMonthStatuses",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetMonthStatuses\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`monthDate\` DATE NOT NULL,
      \`status\` VARCHAR(20) NOT NULL DEFAULT 'open',
      \`statusNote\` TEXT NULL,
      \`lockedAt\` TIMESTAMP NULL,
      \`reopenedAt\` TIMESTAMP NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`plannerTimesheetMonthStatuses_user_month_unique\` (\`userId\`, \`monthDate\`),
      KEY \`plannerTimesheetMonthStatuses_user_idx\` (\`userId\`)
    )`
  );
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "status", "VARCHAR(20) NOT NULL DEFAULT 'open'");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "statusNote", "TEXT NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "lockedAt", "TIMESTAMP NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "submittedAt", "TIMESTAMP NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "submittedByName", "VARCHAR(255) NULL");
  await ensureRuntimeColumn(
    "plannerTimesheetMonthStatuses",
    "employeeDeclarationAccepted",
    "BOOLEAN NOT NULL DEFAULT FALSE"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetMonthStatuses",
    "employeeDeclarationAcceptedAt",
    "TIMESTAMP NULL"
  );
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "submissionNote", "TEXT NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "reviewedAt", "TIMESTAMP NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "reviewedByUserId", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "reviewedByName", "VARCHAR(255) NULL");
  await ensureRuntimeColumn(
    "plannerTimesheetMonthStatuses",
    "reviewerDeclarationAccepted",
    "BOOLEAN NOT NULL DEFAULT FALSE"
  );
  await ensureRuntimeColumn(
    "plannerTimesheetMonthStatuses",
    "reviewerDeclarationAcceptedAt",
    "TIMESTAMP NULL"
  );
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "reviewNote", "TEXT NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "handedOffAt", "TIMESTAMP NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "handedOffByUserId", "INT NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "handedOffByName", "VARCHAR(255) NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "handoffNote", "TEXT NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "historyJson", "JSON NULL");
  await ensureRuntimeColumn("plannerTimesheetMonthStatuses", "reopenedAt", "TIMESTAMP NULL");
  await ensureRuntimeTable(
    "plannerTimesheetLeaveOverrideReviews",
    `CREATE TABLE IF NOT EXISTS \`plannerTimesheetLeaveOverrideReviews\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`userId\` INT NOT NULL,
      \`entryDate\` DATE NOT NULL,
      \`reviewedAt\` TIMESTAMP NULL,
      \`reviewedByUserId\` INT NULL,
      \`reviewedByName\` VARCHAR(255) NULL,
      \`reviewNote\` TEXT NULL,
      \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`plannerTimesheetLeaveOverrideReviews_user_date_unique\` (\`userId\`, \`entryDate\`),
      KEY \`plannerTimesheetLeaveOverrideReviews_user_idx\` (\`userId\`),
      KEY \`plannerTimesheetLeaveOverrideReviews_date_idx\` (\`entryDate\`)
    )`
  );
}

async function ensureDefaultPlannerTimesheetOptions(userId: number) {
  await ensurePlannerTimesheetRuntimeTables();
  const existing = await db
    .select()
    .from(plannerTimesheetOptions)
    .where(eq(plannerTimesheetOptions.userId, userId));
  if (existing.length > 0) {
    const sortedExisting = existing
      .slice()
      .sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.id - right.id;
      });

    const canonicalByKey = new Map<string, (typeof existing)[number]>();
    const duplicateIdToCanonicalId = new Map<number, number>();

    for (const option of sortedExisting) {
      const key = [
        option.label.trim().toLowerCase(),
        (option.description ?? "").trim().toLowerCase(),
        option.sortOrder,
      ].join("|");

      const canonical = canonicalByKey.get(key);
      if (canonical) {
        duplicateIdToCanonicalId.set(option.id, canonical.id);
      } else {
        canonicalByKey.set(key, option);
      }
    }

    if (duplicateIdToCanonicalId.size > 0) {
      const entryRows = await db
        .select()
        .from(plannerTimesheetEntries)
        .where(eq(plannerTimesheetEntries.userId, userId));
      const templateRows = await db
        .select()
        .from(plannerTimesheetTemplates)
        .where(eq(plannerTimesheetTemplates.userId, userId));

      for (const entry of entryRows) {
        const currentIds = Array.isArray(entry.selectedOptionIds)
          ? entry.selectedOptionIds
          : [];
        const remappedIds = Array.from(
          new Set(
            currentIds.map((optionId) => duplicateIdToCanonicalId.get(optionId) ?? optionId)
          )
        );

        const changed =
          remappedIds.length !== currentIds.length ||
          remappedIds.some((optionId, index) => optionId !== currentIds[index]);

        if (changed) {
          await db
            .update(plannerTimesheetEntries)
            .set({ selectedOptionIds: remappedIds })
            .where(eq(plannerTimesheetEntries.id, entry.id));
        }
      }

      for (const template of templateRows) {
        const currentIds = Array.isArray(template.selectedOptionIds)
          ? template.selectedOptionIds
          : [];
        const remappedIds = Array.from(
          new Set(
            currentIds.map((optionId) => duplicateIdToCanonicalId.get(optionId) ?? optionId)
          )
        );
        const changed =
          remappedIds.length !== currentIds.length ||
          remappedIds.some((optionId, index) => optionId !== currentIds[index]);

        if (changed) {
          await db
            .update(plannerTimesheetTemplates)
            .set({ selectedOptionIds: remappedIds })
            .where(eq(plannerTimesheetTemplates.id, template.id));
        }
      }

      for (const duplicateId of Array.from(duplicateIdToCanonicalId.keys())) {
        await db
          .delete(plannerTimesheetOptions)
          .where(
            and(
              eq(plannerTimesheetOptions.id, duplicateId),
              eq(plannerTimesheetOptions.userId, userId)
            )
          );
      }

      const deduped = await db
        .select()
        .from(plannerTimesheetOptions)
        .where(eq(plannerTimesheetOptions.userId, userId));

      return deduped.sort((left, right) => {
        if (left.sortOrder !== right.sortOrder) {
          return left.sortOrder - right.sortOrder;
        }
        return left.label.localeCompare(right.label);
      });
    }

    return existing.sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.label.localeCompare(right.label);
    });
  }

  await db.insert(plannerTimesheetOptions).values(
    DEFAULT_PLANNER_TIMESHEET_OPTIONS.map((option, index) => ({
      userId,
      label: option.label,
      description: option.description,
      sortOrder: index + 1,
      hoursCategory: option.hoursCategory,
      isActive: true,
    }))
  );

  const seeded = await db
    .select()
    .from(plannerTimesheetOptions)
    .where(eq(plannerTimesheetOptions.userId, userId));
  return seeded.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.label.localeCompare(right.label);
  });
}

export async function getPlannerTimesheetProfile(userId: number) {
  await ensurePlannerTimesheetRuntimeTables();
  const rows = await db
    .select()
    .from(plannerTimesheetProfiles)
    .where(eq(plannerTimesheetProfiles.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

function normalisePlannerTimesheetDepartmentLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function upsertPlannerTimesheetProfile(
  userId: number,
  data: {
    department?: string | null;
    signatureName?: string | null;
    personalLeaveAllowanceDays?: number | null;
    personalLeaveCarryOverDays?: number | null;
    leaveYearStartMonth?: number | null;
    monThuStartTime?: string | null;
    monThuEndTime?: string | null;
    fridayStartTime?: string | null;
    fridayEndTime?: string | null;
    weekendStartTime?: string | null;
    weekendEndTime?: string | null;
    monThuTemplateId?: number | null;
    fridayTemplateId?: number | null;
    weekendTemplateId?: number | null;
    lunchBreakMinutes?: number | null;
    teaBreakMinutes?: number | null;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const existing = await getPlannerTimesheetProfile(userId);
  if (existing) {
    await db
      .update(plannerTimesheetProfiles)
      .set({
        department: data.department ?? null,
        signatureName: data.signatureName ?? null,
        personalLeaveAllowanceDays: data.personalLeaveAllowanceDays ?? null,
        personalLeaveCarryOverDays: data.personalLeaveCarryOverDays ?? 0,
        leaveYearStartMonth: data.leaveYearStartMonth ?? 1,
        monThuStartTime: data.monThuStartTime ?? null,
        monThuEndTime: data.monThuEndTime ?? null,
        fridayStartTime: data.fridayStartTime ?? null,
        fridayEndTime: data.fridayEndTime ?? null,
        weekendStartTime: data.weekendStartTime ?? null,
        weekendEndTime: data.weekendEndTime ?? null,
        monThuTemplateId: data.monThuTemplateId ?? null,
        fridayTemplateId: data.fridayTemplateId ?? null,
        weekendTemplateId: data.weekendTemplateId ?? null,
        lunchBreakMinutes: data.lunchBreakMinutes ?? 60,
        teaBreakMinutes: data.teaBreakMinutes ?? 30,
      })
      .where(eq(plannerTimesheetProfiles.userId, userId));
  } else {
    await db.insert(plannerTimesheetProfiles).values({
      userId,
      department: data.department ?? null,
      signatureName: data.signatureName ?? null,
      personalLeaveAllowanceDays: data.personalLeaveAllowanceDays ?? null,
      personalLeaveCarryOverDays: data.personalLeaveCarryOverDays ?? 0,
      leaveYearStartMonth: data.leaveYearStartMonth ?? 1,
      monThuStartTime: data.monThuStartTime ?? null,
      monThuEndTime: data.monThuEndTime ?? null,
      fridayStartTime: data.fridayStartTime ?? null,
      fridayEndTime: data.fridayEndTime ?? null,
      weekendStartTime: data.weekendStartTime ?? null,
      weekendEndTime: data.weekendEndTime ?? null,
      monThuTemplateId: data.monThuTemplateId ?? null,
      fridayTemplateId: data.fridayTemplateId ?? null,
      weekendTemplateId: data.weekendTemplateId ?? null,
      lunchBreakMinutes: data.lunchBreakMinutes ?? 60,
      teaBreakMinutes: data.teaBreakMinutes ?? 30,
    });
  }
  return getPlannerTimesheetProfile(userId);
}

export async function listPlannerTimesheetDepartmentCoverageSettings() {
  await ensurePlannerTimesheetRuntimeTables();
  const rows = await db.select().from(plannerTimesheetDepartmentCoverageSettings);
  return rows.sort((left, right) => left.department.localeCompare(right.department));
}

export async function upsertPlannerTimesheetDepartmentCoverageSetting(
  actorUserId: number,
  data: {
    id?: number | null;
    department: string;
    minimumAvailableCount?: number | null;
    maximumPeopleOff?: number | null;
    mediumRiskPercent?: number | null;
    highRiskPercent?: number | null;
    notes?: string | null;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const department = data.department.trim().replace(/\s+/g, " ");
  if (!department) {
    throw new Error("Department is required.");
  }

  const normalisedDepartment = normalisePlannerTimesheetDepartmentLabel(department);
  const existingRows = await listPlannerTimesheetDepartmentCoverageSettings();
  const duplicate = existingRows.find((row) => {
    if (data.id && row.id === data.id) {
      return false;
    }
    return normalisePlannerTimesheetDepartmentLabel(row.department) === normalisedDepartment;
  });
  if (duplicate) {
    throw new Error(`A coverage rule already exists for ${duplicate.department}.`);
  }

  const minimumAvailableCount = data.minimumAvailableCount ?? null;
  const maximumPeopleOff = data.maximumPeopleOff ?? null;
  const mediumRiskPercent = data.mediumRiskPercent ?? 25;
  const highRiskPercent = data.highRiskPercent ?? 50;

  if (minimumAvailableCount !== null && minimumAvailableCount < 0) {
    throw new Error("Minimum available staff cannot be negative.");
  }
  if (maximumPeopleOff !== null && maximumPeopleOff < 0) {
    throw new Error("Max people off cannot be negative.");
  }
  if (mediumRiskPercent < 0 || mediumRiskPercent > 100) {
    throw new Error("Watch threshold must be between 0 and 100.");
  }
  if (highRiskPercent < 0 || highRiskPercent > 100) {
    throw new Error("High-risk threshold must be between 0 and 100.");
  }
  if (highRiskPercent < mediumRiskPercent) {
    throw new Error("High-risk threshold cannot be lower than the watch threshold.");
  }

  if (data.id) {
    const existing = existingRows.find((row) => row.id === data.id);
    if (!existing) {
      throw new Error("Department coverage rule not found.");
    }

    await db
      .update(plannerTimesheetDepartmentCoverageSettings)
      .set({
        department,
        minimumAvailableCount,
        maximumPeopleOff,
        mediumRiskPercent,
        highRiskPercent,
        notes: data.notes?.trim() || null,
        updatedByUserId: actorUserId,
      })
      .where(eq(plannerTimesheetDepartmentCoverageSettings.id, data.id));
  } else {
    await db.insert(plannerTimesheetDepartmentCoverageSettings).values({
      department,
      minimumAvailableCount,
      maximumPeopleOff,
      mediumRiskPercent,
      highRiskPercent,
      notes: data.notes?.trim() || null,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    });
  }

  return listPlannerTimesheetDepartmentCoverageSettings();
}

export async function deletePlannerTimesheetDepartmentCoverageSetting(id: number) {
  await ensurePlannerTimesheetRuntimeTables();
  await db
    .delete(plannerTimesheetDepartmentCoverageSettings)
    .where(eq(plannerTimesheetDepartmentCoverageSettings.id, id));
  return true;
}

function assessPlannerDepartmentCoverageRisk(input: {
  headcount: number;
  peopleOnLeaveCount: number;
  availableCount: number;
  sharedHolidayLabels: string[];
  minimumAvailableCount: number | null;
  maximumPeopleOff: number | null;
  mediumRiskPercent: number;
  highRiskPercent: number;
  useFallbackThresholds: boolean;
}) {
  const coveragePercent =
    input.headcount > 0 ? Math.round((input.peopleOnLeaveCount / input.headcount) * 100) : 0;
  const highReasons: string[] = [];
  const watchReasons: string[] = [];

  if (input.minimumAvailableCount !== null) {
    if (input.availableCount < input.minimumAvailableCount) {
      highReasons.push(
        `available ${input.availableCount} below minimum ${input.minimumAvailableCount}`
      );
    } else if (input.availableCount === input.minimumAvailableCount) {
      watchReasons.push(`available staff sitting on minimum ${input.minimumAvailableCount}`);
    }
  }

  if (input.maximumPeopleOff !== null) {
    if (input.peopleOnLeaveCount > input.maximumPeopleOff) {
      highReasons.push(
        `people off ${input.peopleOnLeaveCount} above max ${input.maximumPeopleOff}`
      );
    } else if (input.peopleOnLeaveCount === input.maximumPeopleOff) {
      watchReasons.push(`people off at max ${input.maximumPeopleOff}`);
    }
  }

  if (coveragePercent >= input.highRiskPercent) {
    highReasons.push(`coverage ${coveragePercent}% at or above ${input.highRiskPercent}%`);
  } else if (coveragePercent >= input.mediumRiskPercent) {
    watchReasons.push(`coverage ${coveragePercent}% at or above ${input.mediumRiskPercent}%`);
  }

  if (input.useFallbackThresholds) {
    if (coveragePercent >= 50 || (input.peopleOnLeaveCount >= 2 && input.headcount <= 4)) {
      highReasons.push("default department risk threshold reached");
    } else if (coveragePercent >= 25 || input.peopleOnLeaveCount >= 2) {
      watchReasons.push("default department watch threshold reached");
    }
  }

  if (input.sharedHolidayLabels.length > 0 && input.peopleOnLeaveCount > 0) {
    watchReasons.push(
      `${input.sharedHolidayLabels.length} shared holiday overlap${
        input.sharedHolidayLabels.length === 1 ? "" : "s"
      }`
    );
  }

  const severity: "high" | "medium" | null =
    highReasons.length > 0 ? "high" : watchReasons.length > 0 ? "medium" : null;

  return {
    coveragePercent,
    severity,
    severityLabel:
      severity === "high" ? "High Dept Risk" : severity === "medium" ? "Dept Watch" : null,
    triggerLabel:
      severity === "high"
        ? highReasons.join("; ")
        : severity === "medium"
          ? watchReasons.join("; ")
          : "",
  };
}

export async function getPlannerTimesheetDepartmentCoveragePreview(
  targetUserId: number,
  fromDate: Date,
  toDate: Date,
  options?: {
    includeWeekends?: boolean;
    skipSharedHolidays?: boolean;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const profile = await getPlannerTimesheetProfile(targetUserId);
  const departmentLabel = profile?.department?.trim() || null;
  if (!departmentLabel) {
    return {
      departmentLabel: null,
      headcount: 0,
      rule: null,
      previewRows: [],
      summary: {
        appliedDays: 0,
        highRiskDays: 0,
        mediumRiskDays: 0,
        weekendSkippedDays: 0,
        sharedHolidaySkippedDays: 0,
        alreadyOnLeaveDays: 0,
      },
    };
  }

  const startDate = startOfDay(fromDate);
  const endDate = startOfDay(toDate);
  const includeWeekends = options?.includeWeekends ?? false;
  const skipSharedHolidays = options?.skipSharedHolidays ?? true;
  const departmentKey = normalisePlannerTimesheetDepartmentLabel(departmentLabel);
  const settings = await listPlannerTimesheetDepartmentCoverageSettings();
  const rule =
    settings.find(
      (row) => normalisePlannerTimesheetDepartmentLabel(row.department) === departmentKey
    ) ?? null;

  const monthStarts: Date[] = [];
  for (
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    cursor <= endDate;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    monthStarts.push(startOfDay(cursor));
  }

  const teamLeaveOverviewMonths = await Promise.all(
    monthStarts.map((monthStart) => getPlannerTimesheetTeamLeaveOverview(monthStart))
  );
  const teamLeaveCalendarMonths = await Promise.all(
    monthStarts.map((monthStart) => getPlannerTimesheetTeamLeaveCalendar(monthStart))
  );

  const departmentHeadcountByMonth = new Map<string, number>();
  const departmentByUserId = new Map<number, string>();
  for (let index = 0; index < monthStarts.length; index += 1) {
    const monthKey = getDateOnlyKey(monthStarts[index]);
    const overviewRows = teamLeaveOverviewMonths[index];
    for (const row of overviewRows) {
      const rowDepartmentLabel = row.department?.trim() || "No Department";
      departmentByUserId.set(row.userId, rowDepartmentLabel);
    }
    const headcount = overviewRows.filter(
      (row) => normalisePlannerTimesheetDepartmentLabel(row.department?.trim() || "No Department") === departmentKey
    ).length;
    departmentHeadcountByMonth.set(monthKey, headcount);
  }

  const calendarByDateKey = new Map<
    string,
    (Awaited<ReturnType<typeof getPlannerTimesheetTeamLeaveCalendar>>)[number]
  >();
  for (const rows of teamLeaveCalendarMonths) {
    for (const row of rows) {
      calendarByDateKey.set(row.dateKey, row);
    }
  }

  const previewRows: Array<{
    date: Date;
    dateKey: string;
    weekdayLabel: string;
    willApply: boolean;
    skipReason: string | null;
    isWeekend: boolean;
    hasSharedHoliday: boolean;
    sharedHolidayLabels: string[];
    currentlyOffCount: number;
    projectedPeopleOffCount: number;
    projectedAvailableCount: number;
    coveragePercent: number;
    severity: "high" | "medium" | null;
    severityLabel: string | null;
    triggerLabel: string;
    alreadyOnLeave: boolean;
  }> = [];

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const dateKey = getDateOnlyKey(cursor);
    const monthKey = getDateOnlyKey(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    const calendarRow = calendarByDateKey.get(dateKey) ?? null;
    const sharedHolidayLabels = calendarRow?.sharedHolidayLabels ?? [];
    const hasSharedHoliday = sharedHolidayLabels.length > 0;
    const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    const willApply = (!isWeekend || includeWeekends) && !(skipSharedHolidays && hasSharedHoliday);
    const skipReason = !willApply
      ? isWeekend && !includeWeekends
        ? "Weekend skipped"
        : hasSharedHoliday && skipSharedHolidays
          ? "Shared holiday kept separate"
          : "Not applied"
      : null;
    const currentDepartmentOffCount = (calendarRow?.usersOnLeave ?? []).filter(
      (row) => normalisePlannerTimesheetDepartmentLabel(departmentByUserId.get(row.userId) ?? "No Department") === departmentKey
    ).length;
    const alreadyOnLeave = Boolean(
      calendarRow?.usersOnLeave.some((row) => row.userId === targetUserId)
    );
    const projectedPeopleOffCount = willApply
      ? alreadyOnLeave
        ? currentDepartmentOffCount
        : currentDepartmentOffCount + 1
      : currentDepartmentOffCount;
    const headcount = Math.max(departmentHeadcountByMonth.get(monthKey) ?? 0, 1);
    const projectedAvailableCount = Math.max(headcount - projectedPeopleOffCount, 0);
    const risk = assessPlannerDepartmentCoverageRisk({
      headcount,
      peopleOnLeaveCount: projectedPeopleOffCount,
      availableCount: projectedAvailableCount,
      sharedHolidayLabels: willApply ? sharedHolidayLabels : [],
      minimumAvailableCount: rule?.minimumAvailableCount ?? null,
      maximumPeopleOff: rule?.maximumPeopleOff ?? null,
      mediumRiskPercent: rule?.mediumRiskPercent ?? 25,
      highRiskPercent: rule?.highRiskPercent ?? 50,
      useFallbackThresholds: !rule,
    });

    previewRows.push({
      date: startOfDay(cursor),
      dateKey,
      weekdayLabel: cursor.toLocaleDateString("en-ZA", { weekday: "long" }),
      willApply,
      skipReason,
      isWeekend,
      hasSharedHoliday,
      sharedHolidayLabels,
      currentlyOffCount: currentDepartmentOffCount,
      projectedPeopleOffCount,
      projectedAvailableCount,
      coveragePercent: risk.coveragePercent,
      severity: willApply ? risk.severity : null,
      severityLabel: willApply ? risk.severityLabel : null,
      triggerLabel: willApply ? risk.triggerLabel : "",
      alreadyOnLeave,
    });
  }

  const summary = {
    appliedDays: previewRows.filter((row) => row.willApply).length,
    highRiskDays: previewRows.filter((row) => row.willApply && row.severity === "high").length,
    mediumRiskDays: previewRows.filter((row) => row.willApply && row.severity === "medium").length,
    weekendSkippedDays: previewRows.filter((row) => row.skipReason === "Weekend skipped").length,
    sharedHolidaySkippedDays: previewRows.filter(
      (row) => row.skipReason === "Shared holiday kept separate"
    ).length,
    alreadyOnLeaveDays: previewRows.filter((row) => row.alreadyOnLeave).length,
  };

  return {
    departmentLabel,
    headcount: Math.max(
      ...Array.from(departmentHeadcountByMonth.values()).filter((value) => Number.isFinite(value)),
      0
    ),
    rule: rule
      ? {
          department: rule.department,
          minimumAvailableCount: rule.minimumAvailableCount,
          maximumPeopleOff: rule.maximumPeopleOff,
          mediumRiskPercent: rule.mediumRiskPercent,
          highRiskPercent: rule.highRiskPercent,
          notes: rule.notes?.trim() || null,
        }
      : null,
    previewRows,
    summary,
  };
}

export async function getPlannerTimesheetLeaveBalancePreview(
  targetUserId: number,
  fromDate: Date,
  toDate: Date,
  options?: {
    includeWeekends?: boolean;
    overwriteExisting?: boolean;
    skipSharedHolidays?: boolean;
    leavePortionPercent?: number | null;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const profile = await getPlannerTimesheetProfile(targetUserId);
  const startDate = startOfDay(fromDate);
  const endDate = startOfDay(toDate);
  const includeWeekends = options?.includeWeekends ?? false;
  const overwriteExisting = options?.overwriteExisting ?? true;
  const skipSharedHolidays = options?.skipSharedHolidays ?? true;
  const leavePortionPercent =
    normalisePlannerTimesheetLeavePortionPercent(options?.leavePortionPercent) ?? 100;
  const leavePortionDays = leavePortionPercent === 50 ? 0.5 : 1;

  const touchedLeaveYears = new Map<
    string,
    {
      leaveYearStartDate: Date;
      leaveYearEndDate: Date;
      leaveYearStartMonth: number;
    }
  >();
  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const leaveYearRange = getPlannerTimesheetLeaveYearRange(
      cursor,
      profile?.leaveYearStartMonth ?? 1
    );
    const yearKey = getDateOnlyKey(leaveYearRange.startDate);
    if (!touchedLeaveYears.has(yearKey)) {
      touchedLeaveYears.set(yearKey, {
        leaveYearStartDate: leaveYearRange.startDate,
        leaveYearEndDate: leaveYearRange.endDate,
        leaveYearStartMonth: leaveYearRange.startMonth,
      });
    }
  }

  const touchedYearRows = Array.from(touchedLeaveYears.values()).sort(
    (left, right) => left.leaveYearStartDate.getTime() - right.leaveYearStartDate.getTime()
  );
  const overallFromDate = touchedYearRows[0]?.leaveYearStartDate ?? startDate;
  const overallToDate =
    touchedYearRows[touchedYearRows.length - 1]?.leaveYearEndDate ?? endDate;

  const [entries, holidays, optionRows] = await Promise.all([
    getPlannerTimesheetEntriesByUser(targetUserId, {
      fromDate: overallFromDate,
      toDate: overallToDate,
    }),
    getPlannerTimesheetHolidays(targetUserId, {
      fromDate: overallFromDate,
      toDate: overallToDate,
    }),
    getPlannerTimesheetOptions(targetUserId),
  ]);

  const holidayDateKeys = new Set(holidays.map((holiday) => getDateOnlyKey(holiday.holidayDate)));
  const entryByDate = new Map(entries.map((entry) => [getDateOnlyKey(entry.entryDate), entry] as const));
  const optionCategoryMap = new Map(
    optionRows.map((option) => [option.id, option.hoursCategory ?? "working"] as const)
  );

  const getEntryLeaveDays = (entry: (typeof entries)[number] | null, entryDate: Date) => {
    if (!entry) {
      return 0;
    }
    const dateKey = getDateOnlyKey(entryDate);
    if (holidayDateKeys.has(dateKey) || entryDate.getDay() === 0 || entryDate.getDay() === 6) {
      return 0;
    }
    const selectedOptionIds = Array.isArray(entry.selectedOptionIds)
      ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
      : [];
    const entryHoursCategory = getPlannerTimesheetEntryHoursCategory(
      selectedOptionIds,
      optionCategoryMap
    );
    if (!entryHoursCategory.hasNonWorkingActivity) {
      return 0;
    }
    const entryLeavePortionPercent = normalisePlannerTimesheetLeavePortionPercent(
      entry.leavePortionPercent
    );
    return entryLeavePortionPercent === 50 ? 0.5 : entryLeavePortionPercent === 100 ? 1 : 0;
  };

  const yearSummariesByKey = new Map<
    string,
    {
      leaveYearStartDate: Date;
      leaveYearEndDate: Date;
      leaveYearStartMonth: number;
      availableDays: number | null;
      currentYearUsedDays: number;
      projectedYearUsedDays: number;
      currentRemainingDays: number | null;
      projectedRemainingDays: number | null;
      appliedCalendarDays: number;
      appliedWorkingLeaveDays: number;
      netLeaveDaysChange: number;
      replacedLeaveDays: number;
    }
  >();

  for (const yearRow of touchedYearRows) {
    const availableDays =
      profile?.personalLeaveAllowanceDays === null ||
      profile?.personalLeaveAllowanceDays === undefined
        ? null
        : Math.max(
            0,
            Number(profile.personalLeaveAllowanceDays ?? 0) +
              Number(profile.personalLeaveCarryOverDays ?? 0)
          );
    yearSummariesByKey.set(getDateOnlyKey(yearRow.leaveYearStartDate), {
      leaveYearStartDate: yearRow.leaveYearStartDate,
      leaveYearEndDate: yearRow.leaveYearEndDate,
      leaveYearStartMonth: yearRow.leaveYearStartMonth,
      availableDays,
      currentYearUsedDays: 0,
      projectedYearUsedDays: 0,
      currentRemainingDays: null,
      projectedRemainingDays: null,
      appliedCalendarDays: 0,
      appliedWorkingLeaveDays: 0,
      netLeaveDaysChange: 0,
      replacedLeaveDays: 0,
    });
  }

  for (const entry of entries) {
    const entryDate = startOfDay(new Date(entry.entryDate));
    const leaveYearRange = getPlannerTimesheetLeaveYearRange(
      entryDate,
      profile?.leaveYearStartMonth ?? 1
    );
    const yearKey = getDateOnlyKey(leaveYearRange.startDate);
    const yearSummary = yearSummariesByKey.get(yearKey);
    if (!yearSummary) {
      continue;
    }
    yearSummary.currentYearUsedDays += getEntryLeaveDays(entry, entryDate);
  }

  let skippedWeekends = 0;
  let skippedSharedHolidays = 0;
  let skippedExisting = 0;

  for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
    const currentDate = startOfDay(cursor);
    const dateKey = getDateOnlyKey(currentDate);
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const hasSharedHoliday = holidayDateKeys.has(dateKey);
    const existingEntry = entryByDate.get(dateKey) ?? null;
    const existingLeaveDays = getEntryLeaveDays(existingEntry, currentDate);

    if (!includeWeekends && isWeekend) {
      skippedWeekends += 1;
      continue;
    }
    if (skipSharedHolidays && hasSharedHoliday) {
      skippedSharedHolidays += 1;
      continue;
    }
    if (!overwriteExisting && existingEntry) {
      skippedExisting += 1;
      continue;
    }

    const leaveYearRange = getPlannerTimesheetLeaveYearRange(
      currentDate,
      profile?.leaveYearStartMonth ?? 1
    );
    const yearSummary = yearSummariesByKey.get(getDateOnlyKey(leaveYearRange.startDate));
    if (!yearSummary) {
      continue;
    }

    const newLeaveDays = !isWeekend && !hasSharedHoliday ? leavePortionDays : 0;
    yearSummary.appliedCalendarDays += 1;
    yearSummary.appliedWorkingLeaveDays += newLeaveDays;
    yearSummary.replacedLeaveDays += overwriteExisting ? existingLeaveDays : 0;
    yearSummary.netLeaveDaysChange += newLeaveDays - (overwriteExisting ? existingLeaveDays : 0);
  }

  const yearSummaries = Array.from(yearSummariesByKey.values()).map((summary) => {
    const projectedYearUsedDays = summary.currentYearUsedDays + summary.netLeaveDaysChange;
    const currentRemainingDays =
      summary.availableDays === null ? null : summary.availableDays - summary.currentYearUsedDays;
    const projectedRemainingDays =
      summary.availableDays === null ? null : summary.availableDays - projectedYearUsedDays;
    return {
      leaveYearStartDate: summary.leaveYearStartDate,
      leaveYearEndDate: summary.leaveYearEndDate,
      leaveYearStartMonth: summary.leaveYearStartMonth,
      availableDays: summary.availableDays,
      currentYearUsedDays: summary.currentYearUsedDays,
      projectedYearUsedDays,
      currentRemainingDays,
      projectedRemainingDays,
      appliedCalendarDays: summary.appliedCalendarDays,
      appliedWorkingLeaveDays: summary.appliedWorkingLeaveDays,
      netLeaveDaysChange: summary.netLeaveDaysChange,
      replacedLeaveDays: summary.replacedLeaveDays,
      exceedsAllowanceByDays:
        projectedRemainingDays !== null && projectedRemainingDays < 0
          ? Math.abs(projectedRemainingDays)
          : 0,
    };
  });

  return {
    allowanceDays: profile?.personalLeaveAllowanceDays ?? null,
    carryOverDays: Number(profile?.personalLeaveCarryOverDays ?? 0),
    leavePortionPercent,
    skippedWeekends,
    skippedSharedHolidays,
    skippedExisting,
    yearSummaries,
  };
}

export async function getPlannerTimesheetHolidays(
  userId: number,
  options?: { fromDate?: Date | null; toDate?: Date | null }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const rows = await db
    .select()
    .from(plannerTimesheetHolidays)
    .where(eq(plannerTimesheetHolidays.userId, userId));

  return rows
    .filter((row) =>
      isDateKeyInRange(getDateOnlyKey(row.holidayDate), options?.fromDate, options?.toDate)
    )
    .sort((left, right) => getDateOnlyKey(left.holidayDate).localeCompare(getDateOnlyKey(right.holidayDate)));
}

export async function createPlannerTimesheetHoliday(
  userId: number,
  data: {
    holidayDate: Date;
    label: string;
    holidayType?: string | null;
    notes?: string | null;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const holidayDate = startOfDay(data.holidayDate);
  const dateKey = getDateOnlyKey(holidayDate);
  const existing = await getPlannerTimesheetHolidays(userId, {
    fromDate: holidayDate,
    toDate: holidayDate,
  });
  if (existing.some((row) => getDateOnlyKey(row.holidayDate) === dateKey)) {
    throw new Error("A timesheet holiday already exists for that date.");
  }

  await db.insert(plannerTimesheetHolidays).values({
    userId,
    holidayDate,
    label: data.label.trim(),
    holidayType: data.holidayType?.trim() || "public_holiday",
    notes: data.notes?.trim() || null,
  });

  return getPlannerTimesheetHolidays(userId);
}

export async function updatePlannerTimesheetHoliday(
  userId: number,
  id: number,
  data: {
    holidayDate?: Date | null;
    label?: string;
    holidayType?: string | null;
    notes?: string | null;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const existing = await db
    .select()
    .from(plannerTimesheetHolidays)
    .where(and(eq(plannerTimesheetHolidays.id, id), eq(plannerTimesheetHolidays.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Timesheet holiday was not found.");
  }

  const nextDate = data.holidayDate ? startOfDay(data.holidayDate) : existing[0].holidayDate;
  const nextDateKey = getDateOnlyKey(nextDate);
  const duplicates = await getPlannerTimesheetHolidays(userId, {
    fromDate: nextDate,
    toDate: nextDate,
  });
  if (
    duplicates.some(
      (row) => row.id !== id && getDateOnlyKey(row.holidayDate) === nextDateKey
    )
  ) {
    throw new Error("A timesheet holiday already exists for that date.");
  }

  await db
    .update(plannerTimesheetHolidays)
    .set({
      holidayDate: nextDate,
      label: data.label === undefined ? undefined : data.label.trim(),
      holidayType:
        data.holidayType === undefined ? undefined : data.holidayType?.trim() || "public_holiday",
      notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
    })
    .where(and(eq(plannerTimesheetHolidays.id, id), eq(plannerTimesheetHolidays.userId, userId)));

  return getPlannerTimesheetHolidays(userId);
}

export async function deletePlannerTimesheetHoliday(userId: number, id: number) {
  await ensurePlannerTimesheetRuntimeTables();
  await db
    .delete(plannerTimesheetHolidays)
    .where(and(eq(plannerTimesheetHolidays.id, id), eq(plannerTimesheetHolidays.userId, userId)));
  return getPlannerTimesheetHolidays(userId);
}

export async function applyPlannerTimesheetHolidaysToMonth(
  userId: number,
  monthStart: Date,
  options?: { overwriteExisting?: boolean }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthStart);
  const monthEnd = endOfMonth(normalisedMonthDate);
  const holidays = await getPlannerTimesheetHolidays(userId, {
    fromDate: normalisedMonthDate,
    toDate: monthEnd,
  });
  if (holidays.length === 0) {
    return { affectedEntries: 0 };
  }

  const timesheetOptions = await ensureDefaultPlannerTimesheetOptions(userId);
  const holidayOption =
    timesheetOptions.find((option) => option.hoursCategory === "non_working") ?? null;
  if (!holidayOption) {
    throw new Error("No non-working timesheet activity is available for holiday application.");
  }

  const existingEntries = await getPlannerTimesheetEntriesByUser(userId, {
    fromDate: normalisedMonthDate,
    toDate: monthEnd,
  });
  const existingEntryByDate = new Map(
    existingEntries.map((entry) => [getDateOnlyKey(entry.entryDate), entry] as const)
  );

  let affectedEntries = 0;
  for (const holiday of holidays) {
    const holidayDate = startOfDay(holiday.holidayDate);
    const dateKey = getDateOnlyKey(holidayDate);
    const existingEntry = existingEntryByDate.get(dateKey) ?? null;
    if (existingEntry && !options?.overwriteExisting) {
      continue;
    }

    const existingRemarks = existingEntry?.remarks?.trim() || "";
    const holidayRemark = holiday.notes?.trim()
      ? `Public holiday: ${holiday.label.trim()} - ${holiday.notes.trim()}`
      : `Public holiday: ${holiday.label.trim()}`;

    await upsertPlannerTimesheetEntryForUser(userId, {
      entryDate: holidayDate,
      startTime: null,
      endTime: null,
      lunchBreakMinutes: null,
      teaBreakMinutes: null,
      selectedOptionIds: [holidayOption.id],
      remarks: options?.overwriteExisting ? holidayRemark : existingRemarks || holidayRemark,
    });
    affectedEntries += 1;
  }

  return { affectedEntries };
}

function normalisePlannerTimesheetMonthDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

type PlannerTimesheetMonthHistoryEvent = {
  id: string;
  action: string;
  actionLabel: string;
  actorUserId: number | null;
  actorName: string | null;
  note: string | null;
  createdAt: string;
  resultingStatus: string;
};

function normalisePlannerTimesheetMonthHistory(
  value: unknown
): PlannerTimesheetMonthHistoryEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const createdAt =
        typeof record.createdAt === "string" && record.createdAt.trim()
          ? record.createdAt.trim()
          : new Date().toISOString();

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id.trim()
            : randomUUID(),
        action:
          typeof record.action === "string" && record.action.trim()
            ? record.action.trim()
            : "update",
        actionLabel:
          typeof record.actionLabel === "string" && record.actionLabel.trim()
            ? record.actionLabel.trim()
            : "Updated",
        actorUserId:
          typeof record.actorUserId === "number" && Number.isFinite(record.actorUserId)
            ? record.actorUserId
            : null,
        actorName:
          typeof record.actorName === "string" && record.actorName.trim()
            ? record.actorName.trim()
            : null,
        note:
          typeof record.note === "string" && record.note.trim() ? record.note.trim() : null,
        createdAt,
        resultingStatus:
          typeof record.resultingStatus === "string" && record.resultingStatus.trim()
            ? record.resultingStatus.trim()
            : "open",
      } satisfies PlannerTimesheetMonthHistoryEvent;
    })
    .filter((entry): entry is PlannerTimesheetMonthHistoryEvent => Boolean(entry))
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return leftTime - rightTime;
    });
}

function appendPlannerTimesheetMonthHistory(
  existingHistory: unknown,
  event: Omit<PlannerTimesheetMonthHistoryEvent, "id" | "createdAt">
) {
  return [
    ...normalisePlannerTimesheetMonthHistory(existingHistory),
    {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...event,
    },
  ];
}

export async function getPlannerTimesheetMonthStatus(userId: number, monthDate: Date) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const monthDateKey = getDateOnlyKey(normalisedMonthDate);
  const rows = await db
    .select()
    .from(plannerTimesheetMonthStatuses)
    .where(eq(plannerTimesheetMonthStatuses.userId, userId));

  const statusRow =
    rows.find((row) => getDateOnlyKey(row.monthDate) === monthDateKey) ?? null;
  if (!statusRow) {
    return null;
  }

  return {
    ...statusRow,
    historyJson: normalisePlannerTimesheetMonthHistory((statusRow as any).historyJson),
  };
}

async function assertPlannerTimesheetMonthIsEditable(userId: number, monthDate: Date) {
  const status = await getPlannerTimesheetMonthStatus(userId, monthDate);
  if (status && ["locked", "submitted", "approved", "handed_off"].includes(status.status)) {
    throw new Error(
      "This timesheet month is no longer editable. Reopen it or return it for changes before editing."
    );
  }
}

export async function lockPlannerTimesheetMonth(
  userId: number,
  monthDate: Date,
  actorName?: string | null,
  note?: string | null
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const existing = await getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
  const statusNote = note?.trim() || null;

  if (existing) {
    await db
      .update(plannerTimesheetMonthStatuses)
      .set({
        status: "locked",
        statusNote,
        lockedAt: new Date(),
        submittedAt: null,
        submittedByName: null,
        employeeDeclarationAccepted: false,
        employeeDeclarationAcceptedAt: null,
        submissionNote: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByName: null,
        reviewerDeclarationAccepted: false,
        reviewerDeclarationAcceptedAt: null,
        reviewNote: null,
        handedOffAt: null,
        handedOffByUserId: null,
        handedOffByName: null,
        handoffNote: null,
        historyJson: appendPlannerTimesheetMonthHistory(existing.historyJson, {
          action: "locked",
          actionLabel: "Month finalised",
          actorUserId: userId,
          actorName: actorName?.trim() || null,
          note: statusNote,
          resultingStatus: "locked",
        }),
      })
      .where(eq(plannerTimesheetMonthStatuses.id, existing.id));
  } else {
    await db.insert(plannerTimesheetMonthStatuses).values({
      userId,
      monthDate: normalisedMonthDate,
      status: "locked",
      statusNote,
      lockedAt: new Date(),
      submittedAt: null,
      submittedByName: null,
      employeeDeclarationAccepted: false,
      employeeDeclarationAcceptedAt: null,
      submissionNote: null,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewedByName: null,
      reviewerDeclarationAccepted: false,
      reviewerDeclarationAcceptedAt: null,
      reviewNote: null,
      handedOffAt: null,
      handedOffByUserId: null,
      handedOffByName: null,
      handoffNote: null,
      historyJson: appendPlannerTimesheetMonthHistory([], {
        action: "locked",
        actionLabel: "Month finalised",
        actorUserId: userId,
        actorName: actorName?.trim() || null,
        note: statusNote,
        resultingStatus: "locked",
      }),
      reopenedAt: null,
    });
  }

  return getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
}

export async function reopenPlannerTimesheetMonth(
  userId: number,
  monthDate: Date,
  actorName?: string | null,
  note?: string | null
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const existing = await getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
  const statusNote = note?.trim() || null;

  if (existing?.status === "submitted" || existing?.status === "approved" || existing?.status === "handed_off") {
    throw new Error(
      "Submitted, approved, or handed-off timesheets must be returned for changes by an internal admin."
    );
  }

  if (existing) {
    await db
      .update(plannerTimesheetMonthStatuses)
      .set({
        status: "open",
        statusNote,
        reopenedAt: new Date(),
        submittedAt: null,
        submittedByName: null,
        employeeDeclarationAccepted: false,
        employeeDeclarationAcceptedAt: null,
        submissionNote: null,
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByName: null,
        reviewerDeclarationAccepted: false,
        reviewerDeclarationAcceptedAt: null,
        reviewNote: null,
        handedOffAt: null,
        handedOffByUserId: null,
        handedOffByName: null,
        handoffNote: null,
        historyJson: appendPlannerTimesheetMonthHistory(existing.historyJson, {
          action: "reopened",
          actionLabel: "Month reopened",
          actorUserId: userId,
          actorName: actorName?.trim() || null,
          note: statusNote,
          resultingStatus: "open",
        }),
      })
      .where(eq(plannerTimesheetMonthStatuses.id, existing.id));
  } else {
    await db.insert(plannerTimesheetMonthStatuses).values({
      userId,
      monthDate: normalisedMonthDate,
      status: "open",
      statusNote,
      lockedAt: null,
      submittedAt: null,
      submittedByName: null,
      employeeDeclarationAccepted: false,
      employeeDeclarationAcceptedAt: null,
      submissionNote: null,
      reviewedAt: null,
      reviewedByUserId: null,
      reviewedByName: null,
      reviewerDeclarationAccepted: false,
      reviewerDeclarationAcceptedAt: null,
      reviewNote: null,
      handedOffAt: null,
      handedOffByUserId: null,
      handedOffByName: null,
      handoffNote: null,
      historyJson: appendPlannerTimesheetMonthHistory([], {
        action: "reopened",
        actionLabel: "Month reopened",
        actorUserId: userId,
        actorName: actorName?.trim() || null,
        note: statusNote,
        resultingStatus: "open",
      }),
      reopenedAt: new Date(),
    });
  }

  return getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
}

export async function submitPlannerTimesheetMonth(
  userId: number,
  monthDate: Date,
  submittedByName: string | null,
  note?: string | null,
  options?: {
    declarationAccepted?: boolean;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const existing = await getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
  const submissionNote = note?.trim() || null;

  if (existing?.status === "submitted") {
    return existing;
  }

  if (existing?.status === "approved" || existing?.status === "handed_off") {
    throw new Error("This timesheet month has already been approved.");
  }

  if (existing?.status !== "locked") {
    throw new Error("Finalise the timesheet month before submitting it for review.");
  }

  if (!options?.declarationAccepted) {
    throw new Error("Confirm the employee declaration before submitting this month for review.");
  }

  await db
    .update(plannerTimesheetMonthStatuses)
    .set({
      status: "submitted",
      submittedByName: submittedByName?.trim() || null,
      employeeDeclarationAccepted: true,
      employeeDeclarationAcceptedAt: new Date(),
      submissionNote,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedByUserId: null,
      reviewedByName: null,
      reviewerDeclarationAccepted: false,
      reviewerDeclarationAcceptedAt: null,
      reviewNote: null,
      handedOffAt: null,
      handedOffByUserId: null,
      handedOffByName: null,
      handoffNote: null,
      historyJson: appendPlannerTimesheetMonthHistory(existing.historyJson, {
        action: "submitted",
        actionLabel: "Submitted for review",
        actorUserId: userId,
        actorName: submittedByName?.trim() || null,
        note: submissionNote,
        resultingStatus: "submitted",
      }),
    })
    .where(eq(plannerTimesheetMonthStatuses.id, existing.id));

  return getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
}

export async function approvePlannerTimesheetMonth(
  reviewerUserId: number,
  reviewerName: string | null,
  userId: number,
  monthDate: Date,
  note?: string | null,
  options?: {
    reviewerDeclarationAccepted?: boolean;
  }
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const existing = await getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
  if (!existing || existing.status !== "submitted") {
    throw new Error("Only submitted timesheet months can be approved.");
  }

  if (!options?.reviewerDeclarationAccepted) {
    throw new Error("Confirm the reviewer declaration before approving this month.");
  }

  await db
    .update(plannerTimesheetMonthStatuses)
    .set({
      status: "approved",
      reviewNote: note?.trim() || null,
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId,
      reviewedByName: reviewerName?.trim() || null,
      reviewerDeclarationAccepted: true,
      reviewerDeclarationAcceptedAt: new Date(),
      handedOffAt: null,
      handedOffByUserId: null,
      handedOffByName: null,
      handoffNote: null,
      historyJson: appendPlannerTimesheetMonthHistory(existing.historyJson, {
        action: "approved",
        actionLabel: "Approved",
        actorUserId: reviewerUserId,
        actorName: reviewerName?.trim() || null,
        note: note?.trim() || null,
        resultingStatus: "approved",
      }),
    })
    .where(eq(plannerTimesheetMonthStatuses.id, existing.id));

  return getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
}

export async function markPlannerTimesheetMonthHandedOff(
  handoffUserId: number,
  handoffName: string | null,
  userId: number,
  monthDate: Date,
  note?: string | null
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const existing = await getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
  if (!existing || !["approved", "handed_off"].includes(existing.status)) {
    throw new Error("Only approved timesheet months can be handed off.");
  }

  const handoffNote = note?.trim() || null;
  await db
    .update(plannerTimesheetMonthStatuses)
    .set({
      status: "handed_off",
      handedOffAt: new Date(),
      handedOffByUserId: handoffUserId,
      handedOffByName: handoffName?.trim() || null,
      handoffNote,
      historyJson: appendPlannerTimesheetMonthHistory(existing.historyJson, {
        action: "handed_off",
        actionLabel: "Handed off",
        actorUserId: handoffUserId,
        actorName: handoffName?.trim() || null,
        note: handoffNote,
        resultingStatus: "handed_off",
      }),
    })
    .where(eq(plannerTimesheetMonthStatuses.id, existing.id));

  return getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
}

export async function returnPlannerTimesheetMonthForChanges(
  reviewerUserId: number,
  reviewerName: string | null,
  userId: number,
  monthDate: Date,
  note?: string | null
) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const existing = await getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
  if (!existing || !["submitted", "approved", "handed_off"].includes(existing.status)) {
    throw new Error("Only submitted, approved, or handed-off timesheet months can be returned for changes.");
  }

  await db
    .update(plannerTimesheetMonthStatuses)
    .set({
      status: "open",
      employeeDeclarationAccepted: false,
      employeeDeclarationAcceptedAt: null,
      reviewNote: note?.trim() || null,
      reopenedAt: new Date(),
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId,
      reviewedByName: reviewerName?.trim() || null,
      reviewerDeclarationAccepted: false,
      reviewerDeclarationAcceptedAt: null,
      handedOffAt: null,
      handedOffByUserId: null,
      handedOffByName: null,
      handoffNote: null,
      historyJson: appendPlannerTimesheetMonthHistory(existing.historyJson, {
        action: "returned",
        actionLabel: "Returned for changes",
        actorUserId: reviewerUserId,
        actorName: reviewerName?.trim() || null,
        note: note?.trim() || null,
        resultingStatus: "open",
      }),
    })
    .where(eq(plannerTimesheetMonthStatuses.id, existing.id));

  return getPlannerTimesheetMonthStatus(userId, normalisedMonthDate);
}

export async function getPlannerTimesheetReviewQueue() {
  await ensurePlannerTimesheetRuntimeTables();
  await ensureUserRuntimeColumns();

  const statuses = await db.select().from(plannerTimesheetMonthStatuses);
  const queueRows = statuses.filter((row) => row.status === "submitted");
  if (queueRows.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(queueRows.map((row) => row.userId)));
  const relatedUsers = await db.select().from(users).where(inArray(users.id, userIds));
  const userMap = new Map(relatedUsers.map((row) => [row.id, row]));

  return queueRows
    .map((row) => {
      const queueUser = userMap.get(row.userId);
      return {
        id: row.id,
        userId: row.userId,
        userName: queueUser?.name?.trim() || queueUser?.email?.trim() || `User ${row.userId}`,
        userEmail: queueUser?.email?.trim() || null,
        monthDate: row.monthDate,
        status: row.status,
        statusNote: row.statusNote ?? null,
        submittedByName: row.submittedByName ?? null,
        employeeDeclarationAccepted: Boolean((row as any).employeeDeclarationAccepted),
        employeeDeclarationAcceptedAt: (row as any).employeeDeclarationAcceptedAt ?? null,
        submissionNote: row.submissionNote ?? null,
        lockedAt: row.lockedAt ?? null,
        submittedAt: row.submittedAt ?? null,
        reviewedAt: row.reviewedAt ?? null,
        reviewedByName: row.reviewedByName ?? null,
        reviewerDeclarationAccepted: Boolean((row as any).reviewerDeclarationAccepted),
        reviewerDeclarationAcceptedAt: (row as any).reviewerDeclarationAcceptedAt ?? null,
        reviewNote: row.reviewNote ?? null,
        handedOffAt: (row as any).handedOffAt ?? null,
        handedOffByName: (row as any).handedOffByName ?? null,
        handoffNote: (row as any).handoffNote ?? null,
      };
    })
    .sort((left, right) => {
      const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
      const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

function parsePlannerTimesheetTimeToMinutes(value: string | null | undefined) {
  const trimmed = value?.trim() || "";
  if (!trimmed || !/^\d{2}:\d{2}$/.test(trimmed)) {
    return null;
  }
  const [hours, minutes] = trimmed.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function getPlannerTimesheetProfileHoursForDate(
  profile:
    | {
        monThuStartTime?: string | null;
        monThuEndTime?: string | null;
        fridayStartTime?: string | null;
        fridayEndTime?: string | null;
        weekendStartTime?: string | null;
        weekendEndTime?: string | null;
        lunchBreakMinutes?: number | null;
        teaBreakMinutes?: number | null;
      }
    | null
    | undefined,
  date: Date
) {
  const weekday = date.getDay();
  const isFriday = weekday === 5;
  const isWeekend = weekday === 0 || weekday === 6;
  const startTime = isWeekend
    ? profile?.weekendStartTime?.trim() || "07:00"
    : isFriday
      ? profile?.fridayStartTime?.trim() || "07:00"
      : profile?.monThuStartTime?.trim() || "07:00";
  const endTime = isWeekend
    ? profile?.weekendEndTime?.trim() || "16:00"
    : isFriday
      ? profile?.fridayEndTime?.trim() || "14:00"
      : profile?.monThuEndTime?.trim() || "16:00";
  const lunchBreakMinutes = Math.max(0, Number(profile?.lunchBreakMinutes ?? 60));
  const teaBreakMinutes = Math.max(0, Number(profile?.teaBreakMinutes ?? 30));

  return {
    startTime,
    endTime,
    lunchBreakMinutes,
    teaBreakMinutes,
  };
}

function getPlannerExpectedMinutesForDate(
  profile:
    | {
        monThuStartTime?: string | null;
        monThuEndTime?: string | null;
        fridayStartTime?: string | null;
        fridayEndTime?: string | null;
        weekendStartTime?: string | null;
        weekendEndTime?: string | null;
        lunchBreakMinutes?: number | null;
        teaBreakMinutes?: number | null;
      }
    | null
    | undefined,
  date: Date
) {
  const defaults = getPlannerTimesheetProfileHoursForDate(profile, date);
  const startMinutes = parsePlannerTimesheetTimeToMinutes(defaults.startTime);
  const endMinutes = parsePlannerTimesheetTimeToMinutes(defaults.endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 0;
  }
  return Math.max(0, endMinutes - startMinutes - defaults.lunchBreakMinutes - defaults.teaBreakMinutes);
}

function getPlannerWorkedMinutesForEntry(entry: {
  startTime?: string | null;
  endTime?: string | null;
  lunchBreakMinutes?: number | null;
  teaBreakMinutes?: number | null;
}) {
  const startMinutes = parsePlannerTimesheetTimeToMinutes(entry.startTime);
  const endMinutes = parsePlannerTimesheetTimeToMinutes(entry.endTime);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null;
  }
  return Math.max(
    0,
    endMinutes -
      startMinutes -
      Math.max(0, Number(entry.lunchBreakMinutes ?? 0)) -
      Math.max(0, Number(entry.teaBreakMinutes ?? 0))
  );
}

function getPlannerTimesheetEntryHoursCategory(
  selectedOptionIds: number[],
  optionMap: Map<number, string>
) {
  let hasWorkingActivity = false;
  let hasNonWorkingActivity = false;

  for (const optionId of selectedOptionIds) {
    const category = optionMap.get(optionId);
    if (category === "non_working") {
      hasNonWorkingActivity = true;
    } else {
      hasWorkingActivity = true;
    }
  }

  return {
    hasWorkingActivity,
    hasNonWorkingActivity,
    isNonWorkingDay: hasNonWorkingActivity && !hasWorkingActivity,
  };
}

const PLANNER_TIMESHEET_IMPACT_NOTE_PREFIX = "Planner impact note:";

function extractPlannerTimesheetImpactOverrideNote(remarks?: string | null) {
  const prefixLower = PLANNER_TIMESHEET_IMPACT_NOTE_PREFIX.toLowerCase();
  const lines = String(remarks ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matchingLine = lines.find((line) => line.toLowerCase().startsWith(prefixLower));
  if (!matchingLine) {
    return null;
  }
  const note = matchingLine.slice(PLANNER_TIMESHEET_IMPACT_NOTE_PREFIX.length).trim();
  return note || null;
}

function countPlannerTimesheetLeaveBlocks<T extends { date: Date }>(
  leaveRows: T[],
  holidayDateKeys: Set<string>
) {
  let leaveBlockCount = 0;
  let currentBlock: T | null = null;
  for (const row of leaveRows) {
    if (!currentBlock) {
      currentBlock = row;
      leaveBlockCount += 1;
      continue;
    }
    let cursor = addDays(currentBlock.date, 1);
    let keepTogether = true;
    while (cursor.getTime() < row.date.getTime()) {
      const cursorKey = getDateOnlyKey(cursor);
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      if (!isWeekend && !holidayDateKeys.has(cursorKey)) {
        keepTogether = false;
        break;
      }
      cursor = addDays(cursor, 1);
    }
    if (!keepTogether) {
      leaveBlockCount += 1;
    }
    currentBlock = row;
  }
  return leaveBlockCount;
}

function getPlannerTimesheetLeaveYearRange(monthDate: Date, startMonth?: number | null) {
  const safeStartMonth = Math.min(12, Math.max(1, Math.round(Number(startMonth ?? 1) || 1)));
  const monthNumber = monthDate.getMonth() + 1;
  const startYear =
    monthNumber >= safeStartMonth ? monthDate.getFullYear() : monthDate.getFullYear() - 1;
  const startDate = startOfDay(new Date(startYear, safeStartMonth - 1, 1));
  const nextStartDate = startOfDay(new Date(startYear + 1, safeStartMonth - 1, 1));
  const endDate = addDays(nextStartDate, -1);
  return {
    startDate,
    endDate,
    startMonth: safeStartMonth,
  };
}

export async function getPlannerTimesheetMonthOverview(monthDate: Date) {
  await ensurePlannerTimesheetRuntimeTables();
  await ensureUserRuntimeColumns();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const monthStart = startOfDay(normalisedMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const monthKey = getDateOnlyKey(monthStart);
  const today = startOfDay(new Date());
  const userRows = await getAllUsers();
  const profiles = await db.select().from(plannerTimesheetProfiles);
  const entries = await db.select().from(plannerTimesheetEntries);
  const options = await db.select().from(plannerTimesheetOptions);
  const holidays = await db.select().from(plannerTimesheetHolidays);
  const statuses = await db.select().from(plannerTimesheetMonthStatuses);
  const overrideReviews = await db.select().from(plannerTimesheetLeaveOverrideReviews);
  const accessRows = await getDb()
    .select()
    .from(moduleAccess)
    .catch((): Array<typeof moduleAccess.$inferSelect> => []);

  const profileByUser = new Map(profiles.map((row) => [row.userId, row]));
  const optionCategoryByUser = new Map<number, Map<number, string>>();
  for (const option of options) {
    const userOptionMap = optionCategoryByUser.get(option.userId) ?? new Map<number, string>();
    userOptionMap.set(option.id, option.hoursCategory ?? "working");
    optionCategoryByUser.set(option.userId, userOptionMap);
  }
  const holidayDateKeysByUser = new Map<number, Set<string>>();
  for (const holiday of holidays) {
    const dateKey = getDateOnlyKey(holiday.holidayDate);
    if (!isDateKeyInRange(dateKey, monthStart, monthEnd)) continue;
    const userHolidaySet = holidayDateKeysByUser.get(holiday.userId) ?? new Set<string>();
    userHolidaySet.add(dateKey);
    holidayDateKeysByUser.set(holiday.userId, userHolidaySet);
  }
  const accessByUser = new Map<number, typeof accessRows>();
  for (const accessRow of accessRows) {
    const rows = accessByUser.get(accessRow.userId) ?? [];
    rows.push(accessRow);
    accessByUser.set(accessRow.userId, rows);
  }

  const entriesByUser = new Map<number, typeof entries>();
  for (const entry of entries) {
    const entryDateKey = getDateOnlyKey(entry.entryDate);
    if (!entryDateKey || entryDateKey < getDateOnlyKey(monthStart) || entryDateKey > getDateOnlyKey(monthEnd)) {
      continue;
    }
    const rows = entriesByUser.get(entry.userId) ?? [];
    rows.push(entry);
    entriesByUser.set(entry.userId, rows);
  }

  const statusByUser = new Map<number, (typeof statuses)[number]>();
  for (const status of statuses) {
    if (getDateOnlyKey(status.monthDate) === monthKey) {
      statusByUser.set(status.userId, status);
    }
  }
  const overrideReviewByUserDateKey = new Map<string, (typeof overrideReviews)[number]>();
  for (const review of overrideReviews) {
    overrideReviewByUserDateKey.set(`${review.userId}:${getDateOnlyKey(review.entryDate)}`, review);
  }

  return userRows
    .filter((userRow) => {
      const moduleRows = accessByUser.get(userRow.id) ?? [];
      const hasPlannerModule = moduleRows.some(
        (row) => row.module === "planner" && row.canView
      );
      const hasTimesheetData =
        profileByUser.has(userRow.id) ||
        entriesByUser.has(userRow.id) ||
        statusByUser.has(userRow.id);
      return ["admin", "super_admin"].includes(userRow.role) || hasPlannerModule || hasTimesheetData;
    })
    .map((userRow) => {
      const profile = profileByUser.get(userRow.id) ?? null;
      const userEntries = (entriesByUser.get(userRow.id) ?? []).sort((left, right) => {
        const leftTime = new Date(left.updatedAt).getTime();
        const rightTime = new Date(right.updatedAt).getTime();
        return rightTime - leftTime;
      });
      const status = statusByUser.get(userRow.id) ?? null;
      const entryByDate = new Map(
        userEntries.map((entry) => [getDateOnlyKey(entry.entryDate), entry] as const)
      );

      let dueWorkingDays = 0;
      let completedWorkingDays = 0;
      let blockerCount = 0;
      let warningCount = 0;
      let workedMinutes = 0;
      let expectedMinutes = 0;
      const userOptionMap = optionCategoryByUser.get(userRow.id) ?? new Map<number, string>();
      const holidayDateKeys = holidayDateKeysByUser.get(userRow.id) ?? new Set<string>();

      for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor = addDays(cursor, 1)) {
        const dateKey = getDateOnlyKey(cursor);
        if (!dateKey) continue;
        const weekday = cursor.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isHoliday = holidayDateKeys.has(dateKey);
        const entry = entryByDate.get(dateKey) ?? null;
        const hasSavedEntry = Boolean(entry);
        const selectedOptionIds = Array.isArray(entry?.selectedOptionIds) ? entry!.selectedOptionIds : [];
        const entryHoursCategory = getPlannerTimesheetEntryHoursCategory(
          selectedOptionIds,
          userOptionMap
        );
        const startTime = entry?.startTime?.trim() || "";
        const endTime = entry?.endTime?.trim() || "";
        const workedForDay = entry ? getPlannerWorkedMinutesForEntry(entry) : null;
        const expectedForDay = entryHoursCategory.isNonWorkingDay
          ? 0
          : isHoliday
            ? 0
            : getPlannerExpectedMinutesForDate(profile, cursor);
        const isDueWorkingDay =
          !isWeekend && cursor <= today && !isHoliday && !entryHoursCategory.isNonWorkingDay;

        if (workedForDay !== null) {
          workedMinutes += workedForDay;
        }

        if (hasSavedEntry) {
          expectedMinutes += expectedForDay;
        }

        if (!isDueWorkingDay) {
          continue;
        }

        dueWorkingDays += 1;
        if (!hasSavedEntry) {
          blockerCount += 1;
          continue;
        }
        if (!entryHoursCategory.isNonWorkingDay && (!startTime || !endTime)) {
          blockerCount += 1;
          continue;
        }
        if (selectedOptionIds.length === 0) {
          blockerCount += 1;
          continue;
        }

        completedWorkingDays += 1;
        if (workedForDay !== null && workedForDay !== expectedForDay) {
          warningCount += 1;
        }
      }

      const completionPercent =
        dueWorkingDays > 0 ? Math.round((completedWorkingDays / dueWorkingDays) * 100) : 0;
      const lastEntryAt = userEntries[0]?.updatedAt ?? null;

      return {
        id: `${userRow.id}-${monthKey}`,
        userId: userRow.id,
        userName: userRow.name?.trim() || userRow.email?.trim() || `User ${userRow.id}`,
        userEmail: userRow.email?.trim() || null,
        role: userRow.role,
        monthDate: monthStart,
        workflowStatus: status?.status ?? "open",
        dueWorkingDays,
        completedWorkingDays,
        completionPercent,
        blockerCount,
        warningCount,
        trackedDays: userEntries.length,
        workedMinutes,
        expectedMinutes,
        submittedAt: status?.submittedAt ?? null,
        reviewedAt: status?.reviewedAt ?? null,
        handedOffAt: (status as any)?.handedOffAt ?? null,
        handedOffByName: (status as any)?.handedOffByName ?? null,
        handoffNote: (status as any)?.handoffNote ?? null,
        lastEntryAt,
      };
    })
    .sort((left, right) => {
      const leftBlocked = left.blockerCount > 0 ? 0 : left.workflowStatus === "submitted" ? 1 : 2;
      const rightBlocked = right.blockerCount > 0 ? 0 : right.workflowStatus === "submitted" ? 1 : 2;
      if (leftBlocked !== rightBlocked) {
        return leftBlocked - rightBlocked;
      }
      return left.userName.localeCompare(right.userName);
    });
}

export async function getPlannerTimesheetTeamLeaveOverview(monthDate: Date) {
  await ensurePlannerTimesheetRuntimeTables();
  await ensureUserRuntimeColumns();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const monthStart = startOfDay(normalisedMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const monthKey = getDateOnlyKey(monthStart);
  const today = startOfDay(new Date());
  const todayKey = getDateOnlyKey(today);
  const userRows = await getAllUsers();
  const profiles = await db.select().from(plannerTimesheetProfiles);
  const entries = await db.select().from(plannerTimesheetEntries);
  const options = await db.select().from(plannerTimesheetOptions);
  const holidays = await db.select().from(plannerTimesheetHolidays);
  const statuses = await db.select().from(plannerTimesheetMonthStatuses);
  const overrideReviews = await db.select().from(plannerTimesheetLeaveOverrideReviews);
  const accessRows = await getDb()
    .select()
    .from(moduleAccess)
    .catch((): Array<typeof moduleAccess.$inferSelect> => []);

  const profileByUser = new Map(profiles.map((row) => [row.userId, row]));
  const optionCategoryByUser = new Map<number, Map<number, string>>();
  const optionLabelByUser = new Map<number, Map<number, string>>();
  for (const option of options) {
    const userCategoryMap = optionCategoryByUser.get(option.userId) ?? new Map<number, string>();
    userCategoryMap.set(option.id, option.hoursCategory ?? "working");
    optionCategoryByUser.set(option.userId, userCategoryMap);

    const userLabelMap = optionLabelByUser.get(option.userId) ?? new Map<number, string>();
    userLabelMap.set(option.id, option.label?.trim() || `Option ${option.id}`);
    optionLabelByUser.set(option.userId, userLabelMap);
  }

  const holidayDateKeysByUser = new Map<number, Set<string>>();
  for (const holiday of holidays) {
    const dateKey = getDateOnlyKey(holiday.holidayDate);
    const userHolidaySet = holidayDateKeysByUser.get(holiday.userId) ?? new Set<string>();
    userHolidaySet.add(dateKey);
    holidayDateKeysByUser.set(holiday.userId, userHolidaySet);
  }

  const accessByUser = new Map<number, typeof accessRows>();
  for (const accessRow of accessRows) {
    const rows = accessByUser.get(accessRow.userId) ?? [];
    rows.push(accessRow);
    accessByUser.set(accessRow.userId, rows);
  }

  const entriesByUser = new Map<number, typeof entries>();
  for (const entry of entries) {
    const rows = entriesByUser.get(entry.userId) ?? [];
    rows.push(entry);
    entriesByUser.set(entry.userId, rows);
  }

  const statusByUser = new Map<number, (typeof statuses)[number]>();
  for (const status of statuses) {
    if (getDateOnlyKey(status.monthDate) === monthKey) {
      statusByUser.set(status.userId, status);
    }
  }
  const overrideReviewByUserDateKey = new Map<string, (typeof overrideReviews)[number]>();
  for (const review of overrideReviews) {
    overrideReviewByUserDateKey.set(`${review.userId}:${getDateOnlyKey(review.entryDate)}`, review);
  }

  const buildPersonalLeaveRows = (
    userEntries: typeof entries,
    optionCategoryMap: Map<number, string>,
    optionLabelMap: Map<number, string>,
    holidayDateKeys: Set<string>,
    fromDate: Date,
    toDate: Date
  ) => {
    return userEntries
      .map((entry) => {
        const entryDateKey = getDateOnlyKey(entry.entryDate);
        if (!isDateKeyInRange(entryDateKey, fromDate, toDate)) {
          return null;
        }
        const selectedOptionIds = Array.isArray(entry.selectedOptionIds)
          ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
          : [];
        const entryHoursCategory = getPlannerTimesheetEntryHoursCategory(
          selectedOptionIds,
          optionCategoryMap
        );
        if (!entryHoursCategory.hasNonWorkingActivity) {
          return null;
        }
        const leavePortionPercent = normalisePlannerTimesheetLeavePortionPercent(
          entry.leavePortionPercent
        );
        const leavePortionDays =
          leavePortionPercent === 50 ? 0.5 : leavePortionPercent === 100 ? 1 : 0;
        if (leavePortionDays <= 0) {
          return null;
        }
        const dateKey = getDateOnlyKey(entry.entryDate);
        if (holidayDateKeys.has(dateKey)) {
          return null;
        }
        const leaveLabels = selectedOptionIds
          .filter((optionId) => optionCategoryMap.get(optionId) === "non_working")
          .map((optionId) => optionLabelMap.get(optionId) ?? `Option ${optionId}`);
        const leaveSummary = Array.from(new Set(leaveLabels)).join(", ");
        const overrideNote = extractPlannerTimesheetImpactOverrideNote(entry.remarks);
        return {
          date: startOfDay(new Date(entry.entryDate)),
          dateKey,
          leaveLabels: Array.from(new Set(leaveLabels)),
          leaveSummary,
          leavePortionPercent,
          leavePortionDays,
          remarks: entry.remarks?.trim() || "",
          overrideNote,
          hasOverride: Boolean(overrideNote),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((left, right) => left.date.getTime() - right.date.getTime());
  };

  return userRows
    .filter((userRow) => {
      const moduleRows = accessByUser.get(userRow.id) ?? [];
      const hasPlannerModule = moduleRows.some((row) => row.module === "planner" && row.canView);
      const hasTimesheetData =
        profileByUser.has(userRow.id) ||
        entriesByUser.has(userRow.id) ||
        statusByUser.has(userRow.id);
      return ["admin", "super_admin"].includes(userRow.role) || hasPlannerModule || hasTimesheetData;
    })
    .map((userRow) => {
      const profile = profileByUser.get(userRow.id) ?? null;
      const userEntries = entriesByUser.get(userRow.id) ?? [];
      const userHolidayDateKeys = holidayDateKeysByUser.get(userRow.id) ?? new Set<string>();
      const monthHolidayDateKeys = new Set(
        Array.from(userHolidayDateKeys).filter((dateKey) => isDateKeyInRange(dateKey, monthStart, monthEnd))
      );
      const optionCategoryMap = optionCategoryByUser.get(userRow.id) ?? new Map<number, string>();
      const optionLabelMap = optionLabelByUser.get(userRow.id) ?? new Map<number, string>();
      const leaveYearRange = getPlannerTimesheetLeaveYearRange(
        monthStart,
        profile?.leaveYearStartMonth ?? 1
      );
      const monthLeaveRows = buildPersonalLeaveRows(
        userEntries,
        optionCategoryMap,
        optionLabelMap,
        monthHolidayDateKeys,
        monthStart,
        monthEnd
      );
      const yearLeaveRows = buildPersonalLeaveRows(
        userEntries,
        optionCategoryMap,
        optionLabelMap,
        userHolidayDateKeys,
        leaveYearRange.startDate,
        leaveYearRange.endDate
      );
      const overrideLeaveRows = monthLeaveRows.filter((row) => row.hasOverride);
      const pendingOverrideRows = overrideLeaveRows.filter(
        (row) => !overrideReviewByUserDateKey.has(`${userRow.id}:${row.dateKey}`)
      );
      const personalLeaveDays = monthLeaveRows.reduce((sum, row) => sum + row.leavePortionDays, 0);
      const leaveYearUsedDays = yearLeaveRows.reduce((sum, row) => sum + row.leavePortionDays, 0);
      const overrideLeaveDays = overrideLeaveRows.reduce((sum, row) => sum + row.leavePortionDays, 0);
      const leaveAvailableDays =
        profile?.personalLeaveAllowanceDays === null || profile?.personalLeaveAllowanceDays === undefined
          ? null
          : Math.max(
              0,
              Number(profile.personalLeaveAllowanceDays ?? 0) +
                Number(profile.personalLeaveCarryOverDays ?? 0)
            );
      const leaveRemainingDays =
        leaveAvailableDays === null ? null : Math.max(0, leaveAvailableDays - leaveYearUsedDays);

      const leaveBlockCount = countPlannerTimesheetLeaveBlocks(monthLeaveRows, monthHolidayDateKeys);
      const overrideLeaveBlockCount = countPlannerTimesheetLeaveBlocks(
        overrideLeaveRows,
        monthHolidayDateKeys
      );
      const latestOverrideRow = overrideLeaveRows[overrideLeaveRows.length - 1] ?? null;
      const latestOverrideReview =
        latestOverrideRow === null
          ? null
          : overrideReviewByUserDateKey.get(`${userRow.id}:${latestOverrideRow.dateKey}`) ?? null;

      const nextLeaveRow =
        monthLeaveRows.find((row) => row.dateKey >= todayKey) ??
        (monthStart.getTime() > today.getTime() ? monthLeaveRows[0] ?? null : null);
      const activeLeaveToday = monthLeaveRows.some((row) => row.dateKey === todayKey);
      const upcomingLeave =
        !activeLeaveToday &&
        Boolean(nextLeaveRow) &&
        nextLeaveRow!.dateKey >= todayKey;
      const lastLeaveRow = monthLeaveRows[monthLeaveRows.length - 1] ?? null;
      const leaveTypes = Array.from(
        new Set(monthLeaveRows.flatMap((row) => row.leaveLabels.filter(Boolean)))
      );
      const leaveSummary =
        leaveTypes.length === 0
          ? "No personal leave logged"
          : leaveTypes.slice(0, 3).join(", ") + (leaveTypes.length > 3 ? ", ..." : "");
      const workflowStatus = statusByUser.get(userRow.id)?.status ?? "open";

      let availabilityLabel = "No Leave";
      let availabilityDetail = "No personal leave is logged in this month.";
      if (activeLeaveToday) {
        availabilityLabel = "On Leave";
        availabilityDetail = "This person is on personal leave today.";
      } else if (upcomingLeave) {
        availabilityLabel = "Upcoming Leave";
        availabilityDetail = nextLeaveRow
          ? `Next leave starts on ${nextLeaveRow.date.toLocaleDateString("en-ZA")}.`
          : "Upcoming leave is scheduled in this month.";
      } else if (personalLeaveDays > 0) {
        availabilityLabel = "Leave Logged";
        availabilityDetail =
          leaveBlockCount > 1
            ? `${leaveBlockCount} leave blocks are logged this month.`
            : "One leave block is logged this month.";
      } else if (monthHolidayDateKeys.size > 0) {
        availabilityLabel = "Shared Holidays";
        availabilityDetail = `${monthHolidayDateKeys.size} shared holiday or shutdown day(s) apply this month.`;
      }

      return {
        id: `${userRow.id}-${monthKey}-leave`,
        userId: userRow.id,
        userName: userRow.name?.trim() || userRow.email?.trim() || `User ${userRow.id}`,
        userEmail: userRow.email?.trim() || null,
        role: userRow.role,
        department: profile?.department?.trim() || null,
        monthDate: monthStart,
        workflowStatus,
        personalLeaveDays,
        leaveBlockCount,
        overrideLeaveDays,
        overrideLeaveBlockCount,
        hasLeaveOverride: overrideLeaveRows.length > 0,
        latestOverrideDate: latestOverrideRow?.date ?? null,
        latestOverrideNote: latestOverrideRow?.overrideNote ?? null,
        reviewStatus:
          overrideLeaveRows.length > 0 && pendingOverrideRows.length === 0 ? "reviewed" : "pending",
        reviewedAt: latestOverrideReview?.reviewedAt ?? null,
        reviewedByName: latestOverrideReview?.reviewedByName ?? null,
        reviewNote: latestOverrideReview?.reviewNote ?? null,
        sharedHolidayDays: monthHolidayDateKeys.size,
        leaveTypes,
        leaveSummary,
        activeLeaveToday,
        upcomingLeave,
        nextLeaveDate: nextLeaveRow?.date ?? null,
        lastLeaveDate: lastLeaveRow?.date ?? null,
        leaveYearUsedDays,
        leaveAvailableDays,
        leaveRemainingDays,
        leaveYearStartMonth: leaveYearRange.startMonth,
        availabilityLabel,
        availabilityDetail,
      };
    })
    .sort((left, right) => {
      const leftPriority = left.activeLeaveToday
        ? 0
        : left.upcomingLeave
          ? 1
          : left.hasLeaveOverride
            ? 2
            : left.personalLeaveDays > 0
              ? 3
              : 4;
      const rightPriority =
        right.activeLeaveToday
          ? 0
          : right.upcomingLeave
            ? 1
            : right.hasLeaveOverride
              ? 2
              : right.personalLeaveDays > 0
                ? 3
                : 4;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      if (left.personalLeaveDays !== right.personalLeaveDays) {
        return right.personalLeaveDays - left.personalLeaveDays;
      }
      return left.userName.localeCompare(right.userName);
    });
}

export async function getPlannerTimesheetLeaveOverrideRegister(monthDate: Date) {
  await ensurePlannerTimesheetRuntimeTables();
  await ensureUserRuntimeColumns();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const monthStart = startOfDay(normalisedMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const monthKey = getDateOnlyKey(monthStart);
  const userRows = await getAllUsers();
  const profiles = await db.select().from(plannerTimesheetProfiles);
  const entries = await db.select().from(plannerTimesheetEntries);
  const options = await db.select().from(plannerTimesheetOptions);
  const holidays = await db.select().from(plannerTimesheetHolidays);
  const statuses = await db.select().from(plannerTimesheetMonthStatuses);
  const overrideReviews = await db.select().from(plannerTimesheetLeaveOverrideReviews);
  const accessRows = await getDb()
    .select()
    .from(moduleAccess)
    .catch((): Array<typeof moduleAccess.$inferSelect> => []);

  const profileByUser = new Map(profiles.map((row) => [row.userId, row]));
  const optionCategoryByUser = new Map<number, Map<number, string>>();
  const optionLabelByUser = new Map<number, Map<number, string>>();
  for (const option of options) {
    const userCategoryMap = optionCategoryByUser.get(option.userId) ?? new Map<number, string>();
    userCategoryMap.set(option.id, option.hoursCategory ?? "working");
    optionCategoryByUser.set(option.userId, userCategoryMap);

    const userLabelMap = optionLabelByUser.get(option.userId) ?? new Map<number, string>();
    userLabelMap.set(option.id, option.label?.trim() || `Option ${option.id}`);
    optionLabelByUser.set(option.userId, userLabelMap);
  }

  const holidayLabelsByUserDate = new Map<number, Map<string, string[]>>();
  for (const holiday of holidays) {
    const userHolidayMap = holidayLabelsByUserDate.get(holiday.userId) ?? new Map<string, string[]>();
    const dateKey = getDateOnlyKey(holiday.holidayDate);
    const labels = userHolidayMap.get(dateKey) ?? [];
    labels.push(holiday.label?.trim() || "Holiday");
    userHolidayMap.set(dateKey, labels);
    holidayLabelsByUserDate.set(holiday.userId, userHolidayMap);
  }

  const accessByUser = new Map<number, typeof accessRows>();
  for (const accessRow of accessRows) {
    const rows = accessByUser.get(accessRow.userId) ?? [];
    rows.push(accessRow);
    accessByUser.set(accessRow.userId, rows);
  }

  const entriesByUser = new Map<number, typeof entries>();
  for (const entry of entries) {
    const rows = entriesByUser.get(entry.userId) ?? [];
    rows.push(entry);
    entriesByUser.set(entry.userId, rows);
  }

  const statusByUser = new Map<number, (typeof statuses)[number]>();
  for (const status of statuses) {
    if (getDateOnlyKey(status.monthDate) === monthKey) {
      statusByUser.set(status.userId, status);
    }
  }
  const overrideReviewByUserDateKey = new Map<string, (typeof overrideReviews)[number]>();
  for (const review of overrideReviews) {
    overrideReviewByUserDateKey.set(`${review.userId}:${getDateOnlyKey(review.entryDate)}`, review);
  }

  const includedUserIds = new Set(
    userRows
      .filter((userRow) => {
        const moduleRows = accessByUser.get(userRow.id) ?? [];
        const hasPlannerModule = moduleRows.some((row) => row.module === "planner" && row.canView);
        const hasTimesheetData =
          profileByUser.has(userRow.id) ||
          entriesByUser.has(userRow.id) ||
          statusByUser.has(userRow.id);
        return ["admin", "super_admin"].includes(userRow.role) || hasPlannerModule || hasTimesheetData;
      })
      .map((row) => row.id)
  );

  const buildLeaveYearUsedDays = (
    userEntries: typeof entries,
    optionCategoryMap: Map<number, string>,
    holidayDateMap: Map<string, string[]>,
    fromDate: Date,
    toDate: Date
  ) => {
    return userEntries.reduce((sum, entry) => {
      const dateKey = getDateOnlyKey(entry.entryDate);
      if (!isDateKeyInRange(dateKey, fromDate, toDate)) {
        return sum;
      }
      if ((holidayDateMap.get(dateKey) ?? []).length > 0) {
        return sum;
      }
      const selectedOptionIds = Array.isArray(entry.selectedOptionIds)
        ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
        : [];
      const entryHoursCategory = getPlannerTimesheetEntryHoursCategory(
        selectedOptionIds,
        optionCategoryMap
      );
      if (!entryHoursCategory.hasNonWorkingActivity) {
        return sum;
      }
      const leavePortionPercent = normalisePlannerTimesheetLeavePortionPercent(entry.leavePortionPercent);
      const leavePortionDays =
        leavePortionPercent === 50 ? 0.5 : leavePortionPercent === 100 ? 1 : 0;
      return leavePortionDays > 0 ? sum + leavePortionDays : sum;
    }, 0);
  };

  const rows: Array<{
    id: string;
    userId: number;
    userName: string;
    userEmail: string | null;
    role: string;
    department: string | null;
    monthDate: Date;
    workflowStatus: string;
    date: Date;
    dateKey: string;
    leaveSummary: string;
    leaveTypes: string[];
    leavePortionPercent: number;
    leavePortionDays: number;
    loggedAt: Date | null;
    overrideNote: string;
    sharedHolidayLabels: string[];
    leaveRemainingDays: number | null;
    reviewStatus: "pending" | "reviewed";
    reviewedAt: Date | null;
    reviewedByName: string | null;
    reviewNote: string | null;
  }> = [];

  for (const userRow of userRows) {
    if (!includedUserIds.has(userRow.id)) continue;
    const profile = profileByUser.get(userRow.id) ?? null;
    const optionCategoryMap = optionCategoryByUser.get(userRow.id) ?? new Map<number, string>();
    const optionLabelMap = optionLabelByUser.get(userRow.id) ?? new Map<number, string>();
    const holidayDateMap = holidayLabelsByUserDate.get(userRow.id) ?? new Map<string, string[]>();
    const userEntries = entriesByUser.get(userRow.id) ?? [];
    const leaveYearRange = getPlannerTimesheetLeaveYearRange(
      monthStart,
      profile?.leaveYearStartMonth ?? 1
    );
    const leaveYearUsedDays = buildLeaveYearUsedDays(
      userEntries,
      optionCategoryMap,
      holidayDateMap,
      leaveYearRange.startDate,
      leaveYearRange.endDate
    );
    const leaveAvailableDays =
      profile?.personalLeaveAllowanceDays === null || profile?.personalLeaveAllowanceDays === undefined
        ? null
        : Math.max(
            0,
            Number(profile.personalLeaveAllowanceDays ?? 0) +
              Number(profile.personalLeaveCarryOverDays ?? 0)
          );
    const leaveRemainingDays =
      leaveAvailableDays === null ? null : Math.max(0, leaveAvailableDays - leaveYearUsedDays);

    for (const entry of userEntries) {
      const dateKey = getDateOnlyKey(entry.entryDate);
      if (!isDateKeyInRange(dateKey, monthStart, monthEnd)) continue;
      const selectedOptionIds = Array.isArray(entry.selectedOptionIds)
        ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
        : [];
      const entryHoursCategory = getPlannerTimesheetEntryHoursCategory(
        selectedOptionIds,
        optionCategoryMap
      );
      if (!entryHoursCategory.hasNonWorkingActivity) continue;
      const leavePortionPercent = normalisePlannerTimesheetLeavePortionPercent(entry.leavePortionPercent);
      const normalisedLeavePortionPercent = leavePortionPercent === 50 ? 50 : 100;
      const leavePortionDays =
        leavePortionPercent === 50 ? 0.5 : leavePortionPercent === 100 ? 1 : 0;
      if (leavePortionDays <= 0) continue;
      const overrideNote = extractPlannerTimesheetImpactOverrideNote(entry.remarks);
      if (!overrideNote) continue;
      const reviewRecord = overrideReviewByUserDateKey.get(`${userRow.id}:${dateKey}`) ?? null;
      const leaveTypes = selectedOptionIds
        .filter((optionId) => optionCategoryMap.get(optionId) === "non_working")
        .map((optionId) => optionLabelMap.get(optionId) ?? `Option ${optionId}`);
      const sharedHolidayLabels = Array.from(new Set(holidayDateMap.get(dateKey) ?? []));
      rows.push({
        id: `leave-override-${userRow.id}-${dateKey}-${entry.id}`,
        userId: userRow.id,
        userName: userRow.name?.trim() || userRow.email?.trim() || `User ${userRow.id}`,
        userEmail: userRow.email?.trim() || null,
        role: userRow.role,
        department: profile?.department?.trim() || null,
        monthDate: monthStart,
        workflowStatus: statusByUser.get(userRow.id)?.status ?? "open",
        date: startOfDay(new Date(entry.entryDate)),
        dateKey,
        leaveSummary: Array.from(new Set(leaveTypes)).join(", "),
        leaveTypes: Array.from(new Set(leaveTypes)),
        leavePortionPercent: normalisedLeavePortionPercent,
        leavePortionDays,
        loggedAt: entry.updatedAt ? new Date(entry.updatedAt) : entry.createdAt ? new Date(entry.createdAt) : null,
        overrideNote,
        sharedHolidayLabels,
        leaveRemainingDays,
        reviewStatus: reviewRecord ? "reviewed" : "pending",
        reviewedAt: reviewRecord?.reviewedAt ? new Date(reviewRecord.reviewedAt) : null,
        reviewedByName: reviewRecord?.reviewedByName?.trim() || null,
        reviewNote: reviewRecord?.reviewNote?.trim() || null,
      });
    }
  }

  return rows.sort((left, right) => {
    if (left.date.getTime() !== right.date.getTime()) {
      return right.date.getTime() - left.date.getTime();
    }
    return left.userName.localeCompare(right.userName);
  });
}

export async function getPlannerTimesheetLeaveOverrideBlocks(monthDate: Date) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const monthStart = startOfDay(normalisedMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const overrideRows = await getPlannerTimesheetLeaveOverrideRegister(monthStart);
  const holidays = await db.select().from(plannerTimesheetHolidays);

  const holidayDateKeysByUser = new Map<number, Set<string>>();
  const holidayLabelsByUserDate = new Map<number, Map<string, string[]>>();
  for (const holiday of holidays) {
    const holidayDate = startOfDay(new Date(holiday.holidayDate));
    if (holidayDate < monthStart || holidayDate > monthEnd) continue;
    const dateKey = getDateOnlyKey(holidayDate);
    const userHolidayKeys = holidayDateKeysByUser.get(holiday.userId) ?? new Set<string>();
    userHolidayKeys.add(dateKey);
    holidayDateKeysByUser.set(holiday.userId, userHolidayKeys);

    const userHolidayLabels = holidayLabelsByUserDate.get(holiday.userId) ?? new Map<string, string[]>();
    const labels = userHolidayLabels.get(dateKey) ?? [];
    const holidayLabel = holiday.label?.trim() || "Shared holiday";
    if (!labels.includes(holidayLabel)) {
      labels.push(holidayLabel);
      userHolidayLabels.set(dateKey, labels);
    }
    holidayLabelsByUserDate.set(holiday.userId, userHolidayLabels);
  }

  type OverrideBlockRow = {
    id: string;
    userId: number;
    userName: string;
    userEmail: string | null;
    role: string;
    department: string | null;
    monthDate: Date;
    workflowStatus: string;
    startDate: Date;
    endDate: Date;
    startDateKey: string;
    endDateKey: string;
    entryDates: Date[];
    entryDateKeys: string[];
    leaveSummary: string;
    leaveTypes: string[];
    leavePortionPercent: number;
    leavePortionDays: number;
    overrideNote: string;
    usedDays: number;
    spanDays: number;
    workingLeaveDays: number;
    weekendLeaveDays: number;
    sharedHolidayGapDays: number;
    sharedHolidayLabels: string[];
    leaveRemainingDays: number | null;
    pendingReviewCount: number;
    reviewedCount: number;
    reviewStatus: "pending" | "mixed" | "reviewed";
    oldestPendingLoggedAt: Date | null;
    latestLoggedAt: Date | null;
    latestReviewedAt: Date | null;
    latestReviewedByName: string | null;
    latestReviewNote: string | null;
  };

  const rowsByUser = new Map<number, Awaited<ReturnType<typeof getPlannerTimesheetLeaveOverrideRegister>>>();
  for (const row of overrideRows) {
    const userRows = rowsByUser.get(row.userId) ?? [];
    userRows.push(row);
    rowsByUser.set(row.userId, userRows);
  }

  const blocks: OverrideBlockRow[] = [];
  for (const [userId, userRows] of Array.from(rowsByUser.entries())) {
    const sortedRows = [...userRows].sort((left, right) => left.date.getTime() - right.date.getTime());
    const holidayDateKeys = holidayDateKeysByUser.get(userId) ?? new Set<string>();
    const holidayLabelMap = holidayLabelsByUserDate.get(userId) ?? new Map<string, string[]>();
    let currentBlock: OverrideBlockRow | null = null;

    const buildNewBlock = (row: (typeof sortedRows)[number]): OverrideBlockRow => {
      const isWeekendDay = row.date.getDay() === 0 || row.date.getDay() === 6;
      const loggedAt = row.loggedAt ? new Date(row.loggedAt) : null;
      return {
        id: `override-block-${row.userId}-${row.dateKey}`,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        role: row.role,
        department: row.department,
        monthDate: row.monthDate,
        workflowStatus: row.workflowStatus,
        startDate: row.date,
        endDate: row.date,
        startDateKey: row.dateKey,
        endDateKey: row.dateKey,
        entryDates: [row.date],
        entryDateKeys: [row.dateKey],
        leaveSummary: row.leaveSummary,
        leaveTypes: [...row.leaveTypes],
        leavePortionPercent: row.leavePortionPercent,
        leavePortionDays: row.leavePortionDays,
        overrideNote: row.overrideNote,
        usedDays: row.leavePortionDays,
        spanDays: 1,
        workingLeaveDays: isWeekendDay ? 0 : row.leavePortionDays,
        weekendLeaveDays: isWeekendDay ? row.leavePortionDays : 0,
        sharedHolidayGapDays: 0,
        sharedHolidayLabels: [...row.sharedHolidayLabels],
        leaveRemainingDays: row.leaveRemainingDays,
        pendingReviewCount: row.reviewStatus === "reviewed" ? 0 : 1,
        reviewedCount: row.reviewStatus === "reviewed" ? 1 : 0,
        reviewStatus: row.reviewStatus === "reviewed" ? "reviewed" : "pending",
        oldestPendingLoggedAt: row.reviewStatus === "reviewed" ? null : loggedAt,
        latestLoggedAt: loggedAt,
        latestReviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null,
        latestReviewedByName: row.reviewedByName?.trim() || null,
        latestReviewNote: row.reviewNote?.trim() || null,
      };
    };

    for (const row of sortedRows) {
      if (!currentBlock) {
        currentBlock = buildNewBlock(row);
        continue;
      }

      const previousDate = currentBlock.endDate;
      const sameLeaveSummary = currentBlock.leaveSummary === row.leaveSummary;
      const sameOverrideNote = currentBlock.overrideNote === row.overrideNote;
      const sameLeavePortion = currentBlock.leavePortionDays === row.leavePortionDays;
      let canBridgeGap = true;
      let sharedHolidayGapDays = 0;
      const gapHolidayLabels = new Set<string>();
      for (
        let cursor = addDays(previousDate, 1);
        cursor.getTime() < row.date.getTime();
        cursor = addDays(cursor, 1)
      ) {
        const cursorKey = getDateOnlyKey(cursor);
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        const gapHolidayEntries = holidayLabelMap.get(cursorKey) ?? [];
        const isSharedHoliday = holidayDateKeys.has(cursorKey);
        if (isSharedHoliday) {
          sharedHolidayGapDays += 1;
          for (const label of gapHolidayEntries) {
            gapHolidayLabels.add(label);
          }
        }
        if (!isWeekend && !isSharedHoliday) {
          canBridgeGap = false;
          break;
        }
      }

      if (canBridgeGap && sameLeaveSummary && sameOverrideNote && sameLeavePortion) {
        const isWeekendDay = row.date.getDay() === 0 || row.date.getDay() === 6;
        const loggedAt = row.loggedAt ? new Date(row.loggedAt) : null;
        const rowReviewedAt = row.reviewedAt ? new Date(row.reviewedAt) : null;
        const currentSharedHolidayLabels: Set<string> = new Set(currentBlock.sharedHolidayLabels);
        for (const label of row.sharedHolidayLabels) {
          currentSharedHolidayLabels.add(label);
        }
        for (const label of Array.from(gapHolidayLabels)) {
          currentSharedHolidayLabels.add(label);
        }
        const nextPendingReviewCount: number =
          currentBlock.pendingReviewCount + (row.reviewStatus === "reviewed" ? 0 : 1);
        const nextReviewedCount: number =
          currentBlock.reviewedCount + (row.reviewStatus === "reviewed" ? 1 : 0);
        currentBlock = {
          ...currentBlock,
          id: `override-block-${currentBlock.userId}-${currentBlock.startDateKey}-${row.dateKey}`,
          endDate: row.date,
          endDateKey: row.dateKey,
          entryDates: [...currentBlock.entryDates, row.date],
          entryDateKeys: [...currentBlock.entryDateKeys, row.dateKey],
          leaveTypes: Array.from(new Set([...currentBlock.leaveTypes, ...row.leaveTypes])),
          usedDays: currentBlock.usedDays + row.leavePortionDays,
          spanDays:
            Math.round(
              (startOfDay(row.date).getTime() - startOfDay(currentBlock.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1,
          workingLeaveDays:
            currentBlock.workingLeaveDays + (isWeekendDay ? 0 : row.leavePortionDays),
          weekendLeaveDays:
            currentBlock.weekendLeaveDays + (isWeekendDay ? row.leavePortionDays : 0),
          sharedHolidayGapDays: currentBlock.sharedHolidayGapDays + sharedHolidayGapDays,
          sharedHolidayLabels: Array.from(currentSharedHolidayLabels),
          leaveRemainingDays: row.leaveRemainingDays,
          pendingReviewCount: nextPendingReviewCount,
          reviewedCount: nextReviewedCount,
          reviewStatus:
            nextPendingReviewCount === 0
              ? "reviewed"
              : nextReviewedCount > 0
                ? "mixed"
                : "pending",
          oldestPendingLoggedAt:
            row.reviewStatus === "reviewed"
              ? currentBlock.oldestPendingLoggedAt
              : currentBlock.oldestPendingLoggedAt && loggedAt
                ? currentBlock.oldestPendingLoggedAt.getTime() <= loggedAt.getTime()
                  ? currentBlock.oldestPendingLoggedAt
                  : loggedAt
                : currentBlock.oldestPendingLoggedAt ?? loggedAt,
          latestLoggedAt:
            currentBlock.latestLoggedAt && loggedAt
              ? currentBlock.latestLoggedAt.getTime() >= loggedAt.getTime()
                ? currentBlock.latestLoggedAt
                : loggedAt
              : currentBlock.latestLoggedAt ?? loggedAt,
          latestReviewedAt:
            rowReviewedAt && currentBlock.latestReviewedAt
              ? currentBlock.latestReviewedAt.getTime() >= rowReviewedAt.getTime()
                ? currentBlock.latestReviewedAt
                : rowReviewedAt
              : currentBlock.latestReviewedAt ?? rowReviewedAt,
          latestReviewedByName:
            rowReviewedAt &&
            (!currentBlock.latestReviewedAt ||
              currentBlock.latestReviewedAt.getTime() <= rowReviewedAt.getTime()) &&
            row.reviewedByName?.trim()
              ? row.reviewedByName.trim()
              : currentBlock.latestReviewedByName,
          latestReviewNote:
            rowReviewedAt &&
            (!currentBlock.latestReviewedAt ||
              currentBlock.latestReviewedAt.getTime() <= rowReviewedAt.getTime()) &&
            row.reviewNote?.trim()
              ? row.reviewNote.trim()
              : currentBlock.latestReviewNote,
        };
        continue;
      }

      blocks.push(currentBlock);
      currentBlock = buildNewBlock(row);
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }
  }

  return blocks.sort((left, right) => {
    if (left.pendingReviewCount !== right.pendingReviewCount) {
      return right.pendingReviewCount - left.pendingReviewCount;
    }
    if (left.startDate.getTime() !== right.startDate.getTime()) {
      return right.startDate.getTime() - left.startDate.getTime();
    }
    return left.userName.localeCompare(right.userName);
  });
}

export async function getPlannerTimesheetUserLeaveOverrideRegister(userId: number, monthDate: Date) {
  const rows = await getPlannerTimesheetLeaveOverrideRegister(monthDate);
  return rows.filter((row) => row.userId === userId);
}

export async function getPlannerTimesheetUserLeaveOverrideBlocks(userId: number, monthDate: Date) {
  const rows = await getPlannerTimesheetLeaveOverrideBlocks(monthDate);
  return rows.filter((row) => row.userId === userId);
}

export async function reviewPlannerTimesheetLeaveOverride(data: {
  reviewerUserId: number;
  reviewerName: string | null;
  userId: number;
  entryDate: Date;
  note?: string | null;
}) {
  await ensurePlannerTimesheetRuntimeTables();
  const entryDate = startOfDay(data.entryDate);
  const dateKey = getDateOnlyKey(entryDate);
  const matchingEntries = await db
    .select()
    .from(plannerTimesheetEntries)
    .where(eq(plannerTimesheetEntries.userId, data.userId));
  const matchingEntry = matchingEntries.find(
    (entry) =>
      getDateOnlyKey(entry.entryDate) === dateKey &&
      Boolean(extractPlannerTimesheetImpactOverrideNote(entry.remarks))
  );
  if (!matchingEntry) {
    throw new Error("This leave override entry could not be found.");
  }

  const reviewNote = data.note?.trim() || null;
  const existing = await db
    .select()
    .from(plannerTimesheetLeaveOverrideReviews)
    .where(and(
      eq(plannerTimesheetLeaveOverrideReviews.userId, data.userId),
      eq(plannerTimesheetLeaveOverrideReviews.entryDate, entryDate)
    ))
    .limit(1);

  if (existing[0]) {
    await db
      .update(plannerTimesheetLeaveOverrideReviews)
      .set({
        reviewedAt: new Date(),
        reviewedByUserId: data.reviewerUserId,
        reviewedByName: data.reviewerName?.trim() || null,
        reviewNote,
      })
      .where(eq(plannerTimesheetLeaveOverrideReviews.id, existing[0].id));
  } else {
    await db.insert(plannerTimesheetLeaveOverrideReviews).values({
      userId: data.userId,
      entryDate,
      reviewedAt: new Date(),
      reviewedByUserId: data.reviewerUserId,
      reviewedByName: data.reviewerName?.trim() || null,
      reviewNote,
    });
  }

  return {
    success: true,
    userId: data.userId,
    entryDate,
  };
}

export async function reviewPlannerTimesheetLeaveOverrideBlock(data: {
  reviewerUserId: number;
  reviewerName: string | null;
  userId: number;
  entryDates: Date[];
  note?: string | null;
}) {
  await ensurePlannerTimesheetRuntimeTables();
  const normalisedDates = Array.from(
    new Map(
      data.entryDates
        .map((value) => startOfDay(value))
        .map((value) => [getDateOnlyKey(value), value] as const)
    ).values()
  ).sort((left, right) => left.getTime() - right.getTime());

  if (normalisedDates.length === 0) {
    throw new Error("At least one leave override date is required.");
  }

  for (const entryDate of normalisedDates) {
    await reviewPlannerTimesheetLeaveOverride({
      reviewerUserId: data.reviewerUserId,
      reviewerName: data.reviewerName,
      userId: data.userId,
      entryDate,
      note: data.note ?? null,
    });
  }

  return {
    success: true,
    userId: data.userId,
    entryDates: normalisedDates,
    reviewedCount: normalisedDates.length,
  };
}

export async function getPlannerTimesheetTeamLeaveCalendar(monthDate: Date) {
  await ensurePlannerTimesheetRuntimeTables();
  await ensureUserRuntimeColumns();
  const normalisedMonthDate = normalisePlannerTimesheetMonthDate(monthDate);
  const monthStart = startOfDay(normalisedMonthDate);
  const monthEnd = endOfMonth(monthStart);
  const todayKey = getDateOnlyKey(startOfDay(new Date()));
  const userRows = await getAllUsers();
  const entries = await db.select().from(plannerTimesheetEntries);
  const options = await db.select().from(plannerTimesheetOptions);
  const holidays = await db.select().from(plannerTimesheetHolidays);
  const accessRows = await getDb()
    .select()
    .from(moduleAccess)
    .catch((): Array<typeof moduleAccess.$inferSelect> => []);

  const userById = new Map(userRows.map((row) => [row.id, row]));
  const optionCategoryByUser = new Map<number, Map<number, string>>();
  const optionLabelByUser = new Map<number, Map<number, string>>();
  for (const option of options) {
    const userCategoryMap = optionCategoryByUser.get(option.userId) ?? new Map<number, string>();
    userCategoryMap.set(option.id, option.hoursCategory ?? "working");
    optionCategoryByUser.set(option.userId, userCategoryMap);

    const userLabelMap = optionLabelByUser.get(option.userId) ?? new Map<number, string>();
    userLabelMap.set(option.id, option.label?.trim() || `Option ${option.id}`);
    optionLabelByUser.set(option.userId, userLabelMap);
  }

  const accessByUser = new Map<number, typeof accessRows>();
  for (const accessRow of accessRows) {
    const rows = accessByUser.get(accessRow.userId) ?? [];
    rows.push(accessRow);
    accessByUser.set(accessRow.userId, rows);
  }

  const includedUserIds = new Set(
    userRows
      .filter((userRow) => {
        const moduleRows = accessByUser.get(userRow.id) ?? [];
        return (
          ["admin", "super_admin"].includes(userRow.role) ||
          moduleRows.some((row) => row.module === "planner" && row.canView)
        );
      })
      .map((row) => row.id)
  );

  const rowsByDate = new Map<
    string,
    {
      date: Date;
      usersOnLeave: Array<{ userId: number; userName: string; userEmail: string | null }>;
      totalLeaveDays: number;
      leaveTypes: Set<string>;
      sharedHolidayUsers: Array<{ userId: number; userName: string; userEmail: string | null }>;
      sharedHolidayLabels: Set<string>;
    }
  >();

  for (const holiday of holidays) {
    if (!includedUserIds.has(holiday.userId)) continue;
    const dateKey = getDateOnlyKey(holiday.holidayDate);
    if (!isDateKeyInRange(dateKey, monthStart, monthEnd)) continue;
    const userRow = userById.get(holiday.userId);
    if (!userRow) continue;
    const current =
      rowsByDate.get(dateKey) ?? {
        date: startOfDay(new Date(holiday.holidayDate)),
        usersOnLeave: [],
        totalLeaveDays: 0,
        leaveTypes: new Set<string>(),
        sharedHolidayUsers: [],
        sharedHolidayLabels: new Set<string>(),
      };
    current.sharedHolidayUsers.push({
      userId: holiday.userId,
      userName: userRow.name?.trim() || userRow.email?.trim() || `User ${holiday.userId}`,
      userEmail: userRow.email?.trim() || null,
    });
    current.sharedHolidayLabels.add(holiday.label?.trim() || "Holiday");
    rowsByDate.set(dateKey, current);
  }

  for (const entry of entries) {
    if (!includedUserIds.has(entry.userId)) continue;
    const dateKey = getDateOnlyKey(entry.entryDate);
    if (!isDateKeyInRange(dateKey, monthStart, monthEnd)) continue;
    const userRow = userById.get(entry.userId);
    if (!userRow) continue;
    const selectedOptionIds = Array.isArray(entry.selectedOptionIds)
      ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
      : [];
    const optionCategoryMap = optionCategoryByUser.get(entry.userId) ?? new Map<number, string>();
    const optionLabelMap = optionLabelByUser.get(entry.userId) ?? new Map<number, string>();
    const entryHoursCategory = getPlannerTimesheetEntryHoursCategory(selectedOptionIds, optionCategoryMap);
    if (!entryHoursCategory.hasNonWorkingActivity) continue;
    const leavePortionPercent = normalisePlannerTimesheetLeavePortionPercent(entry.leavePortionPercent);
    const leavePortionDays =
      leavePortionPercent === 50 ? 0.5 : leavePortionPercent === 100 ? 1 : 0;
    if (leavePortionDays <= 0) continue;

    const current =
      rowsByDate.get(dateKey) ?? {
        date: startOfDay(new Date(entry.entryDate)),
        usersOnLeave: [],
        totalLeaveDays: 0,
        leaveTypes: new Set<string>(),
        sharedHolidayUsers: [],
        sharedHolidayLabels: new Set<string>(),
      };
    current.usersOnLeave.push({
      userId: entry.userId,
      userName: userRow.name?.trim() || userRow.email?.trim() || `User ${entry.userId}`,
      userEmail: userRow.email?.trim() || null,
    });
    current.totalLeaveDays += leavePortionDays;
    selectedOptionIds
      .filter((optionId) => optionCategoryMap.get(optionId) === "non_working")
      .map((optionId) => optionLabelMap.get(optionId) ?? `Option ${optionId}`)
      .forEach((label) => current.leaveTypes.add(label));
    rowsByDate.set(dateKey, current);
  }

  return Array.from(rowsByDate.entries())
    .map(([dateKey, row]) => {
      const primaryUser =
        row.usersOnLeave
          .slice()
          .sort((left, right) => left.userName.localeCompare(right.userName))[0] ?? null;
      return {
        id: `team-leave-calendar-${dateKey}`,
        date: row.date,
        dateKey,
        peopleOnLeaveCount: row.usersOnLeave.length,
        totalLeaveDays: row.totalLeaveDays,
        usersOnLeave: row.usersOnLeave
          .slice()
          .sort((left, right) => left.userName.localeCompare(right.userName)),
        leaveTypes: Array.from(row.leaveTypes).sort((left, right) => left.localeCompare(right)),
        sharedHolidayCount: row.sharedHolidayUsers.length,
        sharedHolidayLabels: Array.from(row.sharedHolidayLabels).sort((left, right) =>
          left.localeCompare(right)
        ),
        isToday: dateKey === todayKey,
        isWeekend: row.date.getDay() === 0 || row.date.getDay() === 6,
        primaryUserId: primaryUser?.userId ?? null,
        primaryUserName: primaryUser?.userName ?? null,
        primaryUserEmail: primaryUser?.userEmail ?? null,
      };
    })
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

export async function getPlannerTimesheetOptions(userId: number) {
  return ensureDefaultPlannerTimesheetOptions(userId);
}

export async function createPlannerTimesheetOption(
  userId: number,
  data: {
    label: string;
    description?: string | null;
    sortOrder?: number | null;
    hoursCategory?: string | null;
    isActive?: boolean;
  }
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const existing = await db
    .select()
    .from(plannerTimesheetOptions)
    .where(eq(plannerTimesheetOptions.userId, userId));
  const fallbackSortOrder =
    existing.reduce((highest, option) => Math.max(highest, option.sortOrder), 0) + 1;
  await db.insert(plannerTimesheetOptions).values({
    userId,
    label: data.label,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? fallbackSortOrder,
    hoursCategory: data.hoursCategory === "non_working" ? "non_working" : "working",
    isActive: data.isActive ?? true,
  });
  return getPlannerTimesheetOptions(userId);
}

export async function updatePlannerTimesheetOptionForUser(
  userId: number,
  id: number,
  data: Partial<{
    label: string;
    description: string | null;
    sortOrder: number | null;
    hoursCategory: string | null;
    isActive: boolean;
  }>
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const existing = await db
    .select()
    .from(plannerTimesheetOptions)
    .where(and(eq(plannerTimesheetOptions.id, id), eq(plannerTimesheetOptions.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Timesheet option not found.");
  }
  await db
    .update(plannerTimesheetOptions)
    .set({
      label: data.label,
      description: data.description,
      sortOrder: data.sortOrder ?? undefined,
      hoursCategory:
        data.hoursCategory === undefined
          ? undefined
          : data.hoursCategory === "non_working"
            ? "non_working"
            : "working",
      isActive: data.isActive,
    })
    .where(and(eq(plannerTimesheetOptions.id, id), eq(plannerTimesheetOptions.userId, userId)));
  return getPlannerTimesheetOptions(userId);
}

export async function deletePlannerTimesheetOptionForUser(userId: number, id: number) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const existing = await db
    .select()
    .from(plannerTimesheetOptions)
    .where(and(eq(plannerTimesheetOptions.id, id), eq(plannerTimesheetOptions.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Timesheet option not found.");
  }
  await db
    .delete(plannerTimesheetOptions)
    .where(and(eq(plannerTimesheetOptions.id, id), eq(plannerTimesheetOptions.userId, userId)));

  const entryRows = await db
    .select()
    .from(plannerTimesheetEntries)
    .where(eq(plannerTimesheetEntries.userId, userId));
  for (const entry of entryRows) {
    const nextSelectedOptionIds = Array.isArray(entry.selectedOptionIds)
      ? entry.selectedOptionIds.filter((optionId) => optionId !== id)
      : [];
    await db
      .update(plannerTimesheetEntries)
      .set({ selectedOptionIds: nextSelectedOptionIds })
      .where(eq(plannerTimesheetEntries.id, entry.id));
  }

  const templateRows = await db
    .select()
    .from(plannerTimesheetTemplates)
    .where(eq(plannerTimesheetTemplates.userId, userId));
  for (const template of templateRows) {
    const nextSelectedOptionIds = Array.isArray(template.selectedOptionIds)
      ? template.selectedOptionIds.filter((optionId) => optionId !== id)
      : [];
    await db
      .update(plannerTimesheetTemplates)
      .set({ selectedOptionIds: nextSelectedOptionIds })
      .where(eq(plannerTimesheetTemplates.id, template.id));
  }

  return getPlannerTimesheetOptions(userId);
}

function normalisePlannerTimesheetTemplateTime(value?: string | null) {
  const trimmed = value?.trim() || "";
  if (!trimmed) return null;
  if (!/^\d{2}:\d{2}$/.test(trimmed)) {
    throw new Error("Timesheet template times must use HH:MM format.");
  }
  const [hours, minutes] = trimmed.split(":").map(Number);
  if (hours > 23 || minutes > 59) {
    throw new Error("Timesheet template times must use valid 24-hour values.");
  }
  return trimmed;
}

function normalisePlannerTimesheetTemplateBreakMinutes(value?: number | null) {
  if (value === null || value === undefined || value === ("" as never)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Template break minutes must be zero or a positive number.");
  }
  return Math.round(parsed);
}

function normalisePlannerTimesheetLeavePortionPercent(value?: number | null) {
  if (value === null || value === undefined || value === ("" as never)) return null;
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || ![50, 100].includes(parsed)) {
    throw new Error("Leave portion must be either 50 or 100 percent.");
  }
  return parsed;
}

export async function getPlannerTimesheetTemplates(userId: number) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const rows = await db
    .select()
    .from(plannerTimesheetTemplates)
    .where(eq(plannerTimesheetTemplates.userId, userId));
  const optionRows = await getPlannerTimesheetOptions(userId);
  const validOptionIds = new Set(optionRows.map((option) => option.id));
  return rows
    .map((row) => ({
      ...row,
      selectedOptionIds: Array.isArray(row.selectedOptionIds)
        ? row.selectedOptionIds.filter((optionId) => validOptionIds.has(optionId))
        : [],
    }))
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }
      return left.label.localeCompare(right.label);
    });
}

export async function createPlannerTimesheetTemplate(
  userId: number,
  data: {
    label: string;
    description?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    lunchBreakMinutes?: number | null;
    teaBreakMinutes?: number | null;
    leavePortionPercent?: number | null;
    selectedOptionIds?: number[];
    remarks?: string | null;
    isActive?: boolean;
  }
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const optionRows = await getPlannerTimesheetOptions(userId);
  const validOptionIds = new Set(optionRows.map((option) => option.id));
  const selectedOptionIds = Array.from(
    new Set((data.selectedOptionIds ?? []).filter((optionId) => validOptionIds.has(optionId)))
  );
  const hasNonWorkingActivity = selectedOptionIds.some((optionId) => {
    const option = optionRows.find((row) => row.id === optionId);
    return option?.hoursCategory === "non_working";
  });
  await db.insert(plannerTimesheetTemplates).values({
    userId,
    label: data.label.trim(),
    description: data.description?.trim() || null,
    startTime: normalisePlannerTimesheetTemplateTime(data.startTime),
    endTime: normalisePlannerTimesheetTemplateTime(data.endTime),
    lunchBreakMinutes: normalisePlannerTimesheetTemplateBreakMinutes(data.lunchBreakMinutes),
    teaBreakMinutes: normalisePlannerTimesheetTemplateBreakMinutes(data.teaBreakMinutes),
    leavePortionPercent: hasNonWorkingActivity
      ? normalisePlannerTimesheetLeavePortionPercent(data.leavePortionPercent) ?? 100
      : null,
    selectedOptionIds,
    remarks: data.remarks?.trim() || null,
    isActive: data.isActive ?? true,
  });
  return getPlannerTimesheetTemplates(userId);
}

export async function updatePlannerTimesheetTemplateForUser(
  userId: number,
  id: number,
  data: Partial<{
    label: string;
    description: string | null;
    startTime: string | null;
    endTime: string | null;
    lunchBreakMinutes: number | null;
    teaBreakMinutes: number | null;
    leavePortionPercent: number | null;
    selectedOptionIds: number[];
    remarks: string | null;
    isActive: boolean;
  }>
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const existing = await db
    .select()
    .from(plannerTimesheetTemplates)
    .where(and(eq(plannerTimesheetTemplates.id, id), eq(plannerTimesheetTemplates.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Timesheet template not found.");
  }

  const optionRows = await getPlannerTimesheetOptions(userId);
  const validOptionIds = new Set(optionRows.map((option) => option.id));
  const selectedOptionIds =
    data.selectedOptionIds === undefined
      ? undefined
      : Array.from(
          new Set(
            (data.selectedOptionIds ?? []).filter((optionId) => validOptionIds.has(optionId))
          )
        );
  const effectiveOptionIds = selectedOptionIds ?? existing[0].selectedOptionIds ?? [];
  const hasNonWorkingActivity = effectiveOptionIds.some((optionId) => {
    const option = optionRows.find((row) => row.id === optionId);
    return option?.hoursCategory === "non_working";
  });

  await db
    .update(plannerTimesheetTemplates)
    .set({
      label: data.label?.trim(),
      description:
        data.description === undefined ? undefined : data.description?.trim() || null,
      startTime:
        data.startTime === undefined
          ? undefined
          : normalisePlannerTimesheetTemplateTime(data.startTime),
      endTime:
        data.endTime === undefined
          ? undefined
          : normalisePlannerTimesheetTemplateTime(data.endTime),
      lunchBreakMinutes:
        data.lunchBreakMinutes === undefined
          ? undefined
          : normalisePlannerTimesheetTemplateBreakMinutes(data.lunchBreakMinutes),
      teaBreakMinutes:
        data.teaBreakMinutes === undefined
          ? undefined
          : normalisePlannerTimesheetTemplateBreakMinutes(data.teaBreakMinutes),
      leavePortionPercent: hasNonWorkingActivity
        ? data.leavePortionPercent === undefined
          ? existing[0].leavePortionPercent ?? 100
          : normalisePlannerTimesheetLeavePortionPercent(data.leavePortionPercent) ?? 100
        : null,
      selectedOptionIds,
      remarks: data.remarks === undefined ? undefined : data.remarks?.trim() || null,
      isActive: data.isActive,
    })
    .where(and(eq(plannerTimesheetTemplates.id, id), eq(plannerTimesheetTemplates.userId, userId)));

  return getPlannerTimesheetTemplates(userId);
}

export async function deletePlannerTimesheetTemplateForUser(userId: number, id: number) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const existing = await db
    .select()
    .from(plannerTimesheetTemplates)
    .where(and(eq(plannerTimesheetTemplates.id, id), eq(plannerTimesheetTemplates.userId, userId)))
    .limit(1);
  if (!existing[0]) {
    throw new Error("Timesheet template not found.");
  }

  await db
    .delete(plannerTimesheetTemplates)
    .where(and(eq(plannerTimesheetTemplates.id, id), eq(plannerTimesheetTemplates.userId, userId)));

  return getPlannerTimesheetTemplates(userId);
}

export async function getPlannerTimesheetEntriesByUser(
  userId: number,
  options?: { fromDate?: Date | null; toDate?: Date | null }
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const rows = await db
    .select()
    .from(plannerTimesheetEntries)
    .where(eq(plannerTimesheetEntries.userId, userId));
  return rows
    .filter((row) =>
      isDateKeyInRange(getDateOnlyKey(row.entryDate), options?.fromDate, options?.toDate)
    )
    .sort((left, right) => getDateOnlyKey(left.entryDate).localeCompare(getDateOnlyKey(right.entryDate)));
}

export async function upsertPlannerTimesheetEntryForUser(
  userId: number,
  data: {
    entryDate: Date;
    startTime?: string | null;
    endTime?: string | null;
    lunchBreakMinutes?: number | null;
    teaBreakMinutes?: number | null;
    leavePortionPercent?: number | null;
    selectedOptionIds: number[];
    remarks?: string | null;
  }
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  await assertPlannerTimesheetMonthIsEditable(userId, data.entryDate);
  const entryDateKey = getDateOnlyKey(data.entryDate);
  if (!entryDateKey) {
    throw new Error("Timesheet date is invalid.");
  }
  const normaliseTime = (value?: string | null) => {
    const trimmed = value?.trim() || "";
    if (!trimmed) return null;
    if (!/^\d{2}:\d{2}$/.test(trimmed)) {
      throw new Error("Timesheet times must use HH:MM format.");
    }
    const [hours, minutes] = trimmed.split(":").map(Number);
    if (hours > 23 || minutes > 59) {
      throw new Error("Timesheet times must use valid 24-hour values.");
    }
    return trimmed;
  };
  const optionRows = await getPlannerTimesheetOptions(userId);
  const validOptionIds = new Set(optionRows.map((option) => option.id));
  const selectedOptionIds = Array.from(
    new Set((data.selectedOptionIds ?? []).filter((optionId) => validOptionIds.has(optionId)))
  );
  const hasNonWorkingActivity = selectedOptionIds.some((optionId) => {
    const option = optionRows.find((row) => row.id === optionId);
    return option?.hoursCategory === "non_working";
  });
  const startTime = normaliseTime(data.startTime);
  const endTime = normaliseTime(data.endTime);
  const normaliseBreakMinutes = (value?: number | null) => {
    if (value === null || value === undefined || value === ("" as never)) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Break minutes must be zero or a positive number.");
    }
    return Math.round(parsed);
  };
  const lunchBreakMinutes = normaliseBreakMinutes(data.lunchBreakMinutes);
  const teaBreakMinutes = normaliseBreakMinutes(data.teaBreakMinutes);
  const leavePortionPercent = hasNonWorkingActivity
    ? normalisePlannerTimesheetLeavePortionPercent(data.leavePortionPercent) ?? 100
    : null;
  const remarks = data.remarks?.trim() || null;
  const existing = await db
    .select()
    .from(plannerTimesheetEntries)
    .where(eq(plannerTimesheetEntries.userId, userId));
  const current = existing.find((row) => getDateOnlyKey(row.entryDate) === entryDateKey) ?? null;

  if (
    selectedOptionIds.length === 0 &&
    !remarks &&
    !startTime &&
    !endTime &&
    lunchBreakMinutes === null &&
    teaBreakMinutes === null &&
    leavePortionPercent === null
  ) {
    if (current) {
      await db.delete(plannerTimesheetEntries).where(eq(plannerTimesheetEntries.id, current.id));
    }
    return null;
  }

  if (current) {
    await db
      .update(plannerTimesheetEntries)
      .set({
        startTime,
        endTime,
        lunchBreakMinutes,
        teaBreakMinutes,
        leavePortionPercent,
        selectedOptionIds,
        remarks,
      })
      .where(eq(plannerTimesheetEntries.id, current.id));
  } else {
    await db.insert(plannerTimesheetEntries).values({
      userId,
      entryDate: data.entryDate,
      startTime,
      endTime,
      lunchBreakMinutes,
      teaBreakMinutes,
      leavePortionPercent,
      selectedOptionIds,
      remarks,
    });
  }

  const refreshed = await db
    .select()
    .from(plannerTimesheetEntries)
    .where(eq(plannerTimesheetEntries.userId, userId));
  return refreshed.find((row) => getDateOnlyKey(row.entryDate) === entryDateKey) ?? null;
}

export async function bulkUpsertPlannerTimesheetEntriesForUser(
  userId: number,
  data: {
    fromDate: Date;
    toDate: Date;
    startTime?: string | null;
    endTime?: string | null;
    lunchBreakMinutes?: number | null;
    teaBreakMinutes?: number | null;
    leavePortionPercent?: number | null;
    selectedOptionIds: number[];
    remarks?: string | null;
    includeWeekends?: boolean;
    overwriteExisting?: boolean;
  }
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const fromDate = startOfDay(data.fromDate);
  const toDate = startOfDay(data.toDate);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Timesheet date range is invalid.");
  }

  if (toDate < fromDate) {
    throw new Error("Timesheet end date cannot be before the start date.");
  }

  let monthCursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const monthLimit = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  while (monthCursor <= monthLimit) {
    await assertPlannerTimesheetMonthIsEditable(userId, monthCursor);
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
  }

  const includeWeekends = Boolean(data.includeWeekends);
  const overwriteExisting = Boolean(data.overwriteExisting);
  const requestedRemarks = data.remarks?.trim() || null;
  const requestedStartTime = data.startTime?.trim() || null;
  const requestedEndTime = data.endTime?.trim() || null;
  const requestedLunchBreakMinutes =
    data.lunchBreakMinutes === null || data.lunchBreakMinutes === undefined
      ? null
      : Math.round(Number(data.lunchBreakMinutes));
  const requestedTeaBreakMinutes =
    data.teaBreakMinutes === null || data.teaBreakMinutes === undefined
      ? null
      : Math.round(Number(data.teaBreakMinutes));
  const requestedLeavePortionPercent =
    data.leavePortionPercent === null || data.leavePortionPercent === undefined
      ? null
      : Math.round(Number(data.leavePortionPercent));
  const optionRows = await getPlannerTimesheetOptions(userId);
  const validOptionIds = new Set(optionRows.map((option) => option.id));
  const selectedOptionIds = Array.from(
    new Set((data.selectedOptionIds ?? []).filter((optionId) => validOptionIds.has(optionId)))
  );

  let processedDays = 0;
  let affectedEntries = 0;

  for (let cursor = new Date(fromDate); cursor <= toDate; cursor = addDays(cursor, 1)) {
    const weekday = cursor.getDay();
    if (!includeWeekends && (weekday === 0 || weekday === 6)) {
      continue;
    }

    processedDays += 1;
    const current = await getPlannerTimesheetEntriesByUser(userId, {
      fromDate: cursor,
      toDate: cursor,
    });
    const existing = current[0] ?? null;

    const mergedOptionIds = overwriteExisting
      ? selectedOptionIds
      : Array.from(
          new Set([...(existing?.selectedOptionIds ?? []), ...selectedOptionIds])
        );
    const mergedStartTime = overwriteExisting
      ? requestedStartTime
      : requestedStartTime || existing?.startTime || null;
    const mergedEndTime = overwriteExisting
      ? requestedEndTime
      : requestedEndTime || existing?.endTime || null;
    const mergedLunchBreakMinutes = overwriteExisting
      ? requestedLunchBreakMinutes
      : requestedLunchBreakMinutes ?? existing?.lunchBreakMinutes ?? null;
    const mergedTeaBreakMinutes = overwriteExisting
      ? requestedTeaBreakMinutes
      : requestedTeaBreakMinutes ?? existing?.teaBreakMinutes ?? null;
    const mergedLeavePortionPercent = overwriteExisting
      ? requestedLeavePortionPercent
      : requestedLeavePortionPercent ?? existing?.leavePortionPercent ?? null;
    const mergedRemarks = overwriteExisting
      ? requestedRemarks
      : existing?.remarks?.trim() && requestedRemarks
        ? `${existing.remarks.trim()}\n${requestedRemarks}`
        : existing?.remarks?.trim() || requestedRemarks;

    const result = await upsertPlannerTimesheetEntryForUser(userId, {
      entryDate: cursor,
      startTime: mergedStartTime,
      endTime: mergedEndTime,
      lunchBreakMinutes: mergedLunchBreakMinutes,
      teaBreakMinutes: mergedTeaBreakMinutes,
      leavePortionPercent: mergedLeavePortionPercent,
      selectedOptionIds: mergedOptionIds,
      remarks: mergedRemarks,
    });

    if (result || existing) {
      affectedEntries += 1;
    }
  }

  return {
    processedDays,
    affectedEntries,
  };
}

export async function fillPlannerTimesheetMonthFromProfileTemplates(
  userId: number,
  monthDate: Date,
  options?: {
    includeWeekends?: boolean;
    overwriteExisting?: boolean;
  }
) {
  await ensureDefaultPlannerTimesheetOptions(userId);
  const profile = await getPlannerTimesheetProfile(userId);
  if (!profile) {
    throw new Error("Set up your Timesheet Profile before filling the month from templates.");
  }

  const templateIds = Array.from(
    new Set(
      [
        profile.monThuTemplateId ?? null,
        profile.fridayTemplateId ?? null,
        profile.weekendTemplateId ?? null,
      ].filter((value): value is number => Number.isFinite(value))
    )
  );
  if (templateIds.length === 0) {
    throw new Error("Choose at least one default template in your Timesheet Profile first.");
  }

  const templates = await getPlannerTimesheetTemplates(userId);
  const templateMap = new Map(templates.map((template) => [template.id, template]));
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);
  await assertPlannerTimesheetMonthIsEditable(userId, monthStart);
  const includeWeekends = Boolean(options?.includeWeekends);
  const overwriteExisting = Boolean(options?.overwriteExisting);
  const existingEntries = await getPlannerTimesheetEntriesByUser(userId, {
    fromDate: monthStart,
    toDate: monthEnd,
  });
  const existingByDate = new Map(
    existingEntries.map((entry) => [getDateOnlyKey(entry.entryDate), entry] as const)
  );

  let processedDays = 0;
  let affectedEntries = 0;

  for (let cursor = new Date(monthStart); cursor <= monthEnd; cursor = addDays(cursor, 1)) {
    const weekday = cursor.getDay();
    const dateKey = getDateOnlyKey(cursor);
    if (!dateKey) {
      continue;
    }

    let templateId: number | null = null;
    if (weekday === 0 || weekday === 6) {
      if (!includeWeekends) {
        continue;
      }
      templateId = profile.weekendTemplateId ?? null;
    } else if (weekday === 5) {
      templateId = profile.fridayTemplateId ?? profile.monThuTemplateId ?? null;
    } else {
      templateId = profile.monThuTemplateId ?? null;
    }

    if (!templateId) {
      continue;
    }

    const template = templateMap.get(templateId);
    if (!template || !template.isActive) {
      continue;
    }

    processedDays += 1;
    const existing = existingByDate.get(dateKey) ?? null;
    if (existing && !overwriteExisting) {
      continue;
    }

    const result = await upsertPlannerTimesheetEntryForUser(userId, {
      entryDate: cursor,
      startTime: template.startTime ?? null,
      endTime: template.endTime ?? null,
      lunchBreakMinutes: template.lunchBreakMinutes ?? null,
      teaBreakMinutes: template.teaBreakMinutes ?? null,
      leavePortionPercent: template.leavePortionPercent ?? null,
      selectedOptionIds: Array.isArray(template.selectedOptionIds)
        ? template.selectedOptionIds
        : [],
      remarks: template.remarks ?? null,
    });

    if (result || existing) {
      affectedEntries += 1;
    }
  }

  return {
    processedDays,
    affectedEntries,
  };
}

export async function getAllSharedPlannerEvents(branchId?: number) {
  const rows =
    branchId === undefined
      ? await db.select().from(sharedPlannerEvents)
      : await db
          .select()
          .from(sharedPlannerEvents)
          .where(eq(sharedPlannerEvents.branchId, branchId));

  return rows.sort((left, right) => {
    const leftTime = left.startAt ? new Date(left.startAt).getTime() : 0;
    const rightTime = right.startAt ? new Date(right.startAt).getTime() : 0;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.title.localeCompare(right.title);
  });
}

async function getSharedPlannerEventById(id: number) {
  const rows = await db
    .select()
    .from(sharedPlannerEvents)
    .where(eq(sharedPlannerEvents.id, id))
    .limit(1);

  return rows[0] ?? null;
}

function canManageSharedPlannerEvent(
  actor: { id: number; role: "user" | "admin" | "super_admin" },
  event: { createdByUserId: number }
) {
  return (
    actor.role === "admin" ||
    actor.role === "super_admin" ||
    actor.id === event.createdByUserId
  );
}

export async function createSharedPlannerEvent(
  data: typeof sharedPlannerEvents.$inferInsert
) {
  return db.insert(sharedPlannerEvents).values(data);
}

export async function updateSharedPlannerEventForUser(
  actor: { id: number; role: "user" | "admin" | "super_admin" },
  id: number,
  data: Partial<typeof sharedPlannerEvents.$inferInsert>
) {
  const existing = await getSharedPlannerEventById(id);
  if (!existing) {
    throw new Error("Shared calendar event not found.");
  }

  if (!canManageSharedPlannerEvent(actor, existing)) {
    throw new Error("You can only edit your own shared calendar events.");
  }

  return db.update(sharedPlannerEvents).set(data).where(eq(sharedPlannerEvents.id, id));
}

export async function deleteSharedPlannerEventForUser(
  actor: { id: number; role: "user" | "admin" | "super_admin" },
  id: number
) {
  const existing = await getSharedPlannerEventById(id);
  if (!existing) {
    throw new Error("Shared calendar event not found.");
  }

  if (!canManageSharedPlannerEvent(actor, existing)) {
    throw new Error("You can only delete your own shared calendar events.");
  }

  return db.delete(sharedPlannerEvents).where(eq(sharedPlannerEvents.id, id));
}

function isCalendarScopeEnabled(
  scope: CalendarFeedScope,
  section: "private" | "shared" | "operations"
) {
  return scope === "all" || scope === section;
}

function dateHasExplicitTime(value: Date | string | null | undefined) {
  if (!value) return false;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return (
    parsed.getHours() !== 0 ||
    parsed.getMinutes() !== 0 ||
    parsed.getSeconds() !== 0 ||
    parsed.getMilliseconds() !== 0
  );
}

function buildCalendarDescription(lines: Array<string | null | undefined>) {
  return lines
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export async function getUnifiedCalendarEventsForUser(
  userId: number,
  options?: {
    scope?: CalendarFeedScope;
    branchId?: number;
  }
) {
  const scope = options?.scope ?? "all";
  const branchId = options?.branchId;

  const result: UnifiedCalendarEvent[] = [];
  const branchRows = await db.select().from(branches);
  const branchMap = new Map(branchRows.map((branch) => [branch.id, branch.name]));

  if (isCalendarScopeEnabled(scope, "private")) {
    const plannerRows = await db
      .select()
      .from(plannerEntries)
      .where(eq(plannerEntries.userId, userId));

    result.push(
      ...plannerRows.map(
        (entry): UnifiedCalendarEvent => ({
        uid: `planner-${entry.id}@textpoint`,
        title: entry.title,
        description: entry.notes,
        startAt: entry.reminderAt ?? entry.entryDate,
        endAt: null,
        allDay: !entry.reminderAt,
        recurrence: (entry.recurrence as CalendarRecurrence | string | null) ?? null,
        recurrenceUntil: entry.recurrenceUntil ?? null,
        status: entry.isComplete ? "COMPLETED" : "CONFIRMED",
        categories: ["Planner", "Private"],
        sourceType: "private_planner",
        sourceLabel: "Private Planner",
        sourceUrl: "/planner",
        branchId: null,
        branchName: null,
        statusLabel: entry.isComplete ? "Done" : "Open",
      })
      )
    );
  }

  if (isCalendarScopeEnabled(scope, "shared")) {
    const sharedRows =
      branchId === undefined
        ? await db.select().from(sharedPlannerEvents)
        : await db
            .select()
            .from(sharedPlannerEvents)
            .where(eq(sharedPlannerEvents.branchId, branchId));

    result.push(
      ...sharedRows.map(
        (event): UnifiedCalendarEvent => ({
        uid: `shared-${event.id}@textpoint`,
        title: event.title,
        description: buildCalendarDescription([
          event.notes,
          event.branchId ? `Branch: ${branchMap.get(event.branchId) ?? "Unknown Branch"}` : "Scope: System-wide",
          `Type: ${event.eventType}`,
        ]),
        location: event.location,
        startAt: event.startAt,
        endAt: event.endAt ?? null,
        allDay: event.isAllDay,
        recurrence: (event.recurrence as CalendarRecurrence | string | null) ?? null,
        recurrenceUntil: event.recurrenceUntil ?? null,
        status: "CONFIRMED",
        categories: ["Planner", "Shared", event.eventType],
        sourceType: "shared_planner",
        sourceLabel: "Shared Calendar",
        sourceUrl: "/planner",
        branchId: event.branchId ?? null,
        branchName: event.branchId ? branchMap.get(event.branchId) ?? null : null,
        statusLabel: event.eventType,
      })
      )
    );
  }

  if (isCalendarScopeEnabled(scope, "operations")) {
    const [
      scheduleRows,
      courseRows,
      lecturerRows,
      leadRows,
      leadActivityRows,
      levelIIIClientRows,
      levelIIIActivityRows,
      qualityRows,
      qualityAuditRows,
      managementReviewRows,
      externalProviderRows,
    ] = await Promise.all([
      branchId === undefined
        ? db.select().from(courseSchedules)
        : db.select().from(courseSchedules).where(eq(courseSchedules.branchId, branchId)),
      db.select().from(courses),
      db.select().from(lecturers),
      branchId === undefined
        ? db.select().from(leads)
        : db.select().from(leads).where(eq(leads.branchId, branchId)),
      db.select().from(leadActivities),
      db.select().from(levelIIIClients),
      db.select().from(levelIIIActivities),
      branchId === undefined
        ? db.select().from(qualityActions)
        : db.select().from(qualityActions).where(eq(qualityActions.branchId, branchId)),
      branchId === undefined
        ? db.select().from(qualityAudits)
        : db.select().from(qualityAudits).where(eq(qualityAudits.branchId, branchId)),
      branchId === undefined
        ? db.select().from(managementReviews)
        : db.select().from(managementReviews).where(eq(managementReviews.branchId, branchId)),
      branchId === undefined
        ? db.select().from(externalProviders)
        : db.select().from(externalProviders).where(eq(externalProviders.branchId, branchId)),
    ]);

    const courseMap = new Map(courseRows.map((course) => [course.id, course]));
    const lecturerMap = new Map(
      lecturerRows.map((lecturer) => [lecturer.id, `${lecturer.firstName} ${lecturer.lastName}`.trim()])
    );
    const leadMap = new Map(leadRows.map((lead) => [lead.id, lead]));
    const clientMap = new Map(levelIIIClientRows.map((client) => [client.id, client]));

    result.push(
      ...scheduleRows.map((schedule) => {
        const course = courseMap.get(schedule.courseId);
        const branchName = schedule.branchId ? branchMap.get(schedule.branchId) ?? null : null;
        const lecturerName = schedule.lecturerId
          ? lecturerMap.get(schedule.lecturerId) ?? null
          : null;
        return {
          uid: `schedule-${schedule.id}@textpoint`,
          title: `${course?.code ?? "Course"} ${course?.name ? `- ${course.name}` : "Training Schedule"}`,
          description: buildCalendarDescription([
            course?.description,
            branchName ? `Branch: ${branchName}` : null,
            lecturerName ? `Lecturer: ${lecturerName}` : "Lecturer: Not assigned",
            schedule.status ? `Status: ${schedule.status}` : null,
            schedule.endOfCourseExamStartDate
              ? `Exam start: ${new Date(schedule.endOfCourseExamStartDate).toLocaleDateString("en-ZA")}`
              : null,
            schedule.endOfCourseExamEndDate
              ? `Exam end: ${new Date(schedule.endOfCourseExamEndDate).toLocaleDateString("en-ZA")}`
              : null,
          ]),
          startAt: schedule.startDate,
          endAt: schedule.endDate,
          allDay: true,
          recurrence: null,
          recurrenceUntil: null,
          status: schedule.status === "Cancelled" ? "CANCELLED" : "CONFIRMED",
          categories: ["Operations", "Training", course?.code ?? "Course"],
          sourceType: "schedule",
          sourceLabel: "Training Schedule",
          sourceUrl: "/schedules",
          branchId: schedule.branchId ?? null,
          branchName,
          statusLabel: schedule.status,
        } satisfies UnifiedCalendarEvent;
      })
    );

    result.push(
      ...leadRows
        .filter(
          (lead) =>
            Boolean(lead.followUpDate) &&
            lead.status !== "Converted" &&
            lead.status !== "Closed Lost"
        )
        .map(
          (lead): UnifiedCalendarEvent => ({
          uid: `lead-follow-up-${lead.id}@textpoint`,
          title: `Lead follow-up: ${lead.firstName} ${lead.lastName}`.trim(),
          description: buildCalendarDescription([
            lead.companyName ? `Company: ${lead.companyName}` : null,
            lead.methodInterested ? `Method: ${lead.methodInterested}` : null,
            lead.phone ? `Phone: ${lead.phone}` : null,
            lead.email ? `Email: ${lead.email}` : null,
            lead.notes,
          ]),
          startAt: lead.followUpDate!,
          endAt: null,
          allDay: !dateHasExplicitTime(lead.followUpDate),
          recurrence: null,
          recurrenceUntil: null,
          status: "CONFIRMED",
          categories: ["Operations", "CRM", "Lead"],
          sourceType: "lead_follow_up",
          sourceLabel: "Lead Follow-up",
          sourceUrl: "/leads",
          branchId: lead.branchId ?? null,
          branchName: lead.branchId ? branchMap.get(lead.branchId) ?? null : null,
          statusLabel: lead.status,
        })
        )
    );

    result.push(
      ...leadActivityRows
        .filter((activity) => Boolean(activity.dueDate) && !activity.completed)
        .flatMap((activity) => {
          const lead = leadMap.get(activity.leadId);
          if (!lead) return [];
          return [
            {
              uid: `lead-activity-${activity.id}@textpoint`,
              title: `${activity.activityType}: ${activity.subject?.trim() || `${lead.firstName} ${lead.lastName}`}`.trim(),
              description: buildCalendarDescription([
                `Lead: ${lead.firstName} ${lead.lastName}`.trim(),
                lead.companyName ? `Company: ${lead.companyName}` : null,
                activity.notes,
              ]),
              startAt: activity.dueDate!,
              endAt: null,
              allDay: !dateHasExplicitTime(activity.dueDate),
              recurrence: null,
              recurrenceUntil: null,
              status: "CONFIRMED",
              categories: ["Operations", "CRM", "Activity"],
              sourceType: "lead_activity",
              sourceLabel: "CRM Activity",
              sourceUrl: "/leads",
              branchId: lead.branchId ?? null,
              branchName: lead.branchId ? branchMap.get(lead.branchId) ?? null : null,
              statusLabel: activity.activityType,
            } satisfies UnifiedCalendarEvent,
          ];
        })
    );

    result.push(
      ...levelIIIActivityRows.flatMap((activity) => {
        if (activity.status === "Cancelled") return [];
        const client = clientMap.get(activity.clientId);
        if (!client) return [];
        const eventDate =
          activity.nextActionDate ??
          (activity.status === "Planned" ? activity.activityDate : null);
        if (!eventDate) return [];

        return [
          {
            uid: `level-iii-${activity.id}@textpoint`,
            title: `Level III ${activity.activityType}: ${client.companyName}`,
            description: buildCalendarDescription([
              activity.subject,
              `Client: ${client.companyName}`,
              `Primary contact: ${client.primaryContact}`,
              client.phone ? `Phone: ${client.phone}` : null,
              activity.notes,
            ]),
            startAt: eventDate,
            endAt: null,
            allDay: true,
            recurrence: null,
            recurrenceUntil: null,
            status: activity.status === "Completed" ? "COMPLETED" : "CONFIRMED",
            categories: ["Operations", "Level III", activity.activityType],
            sourceType: "level_iii",
            sourceLabel: "Level III",
            sourceUrl: "/level-iii",
            branchId: null,
            branchName: null,
            statusLabel: activity.status,
          } satisfies UnifiedCalendarEvent,
        ];
      })
    );

    result.push(
      ...qualityRows
        .filter((action) => Boolean(action.dueDate) && action.status !== "Closed")
        .map(
          (action): UnifiedCalendarEvent => ({
          uid: `quality-${action.id}@textpoint`,
          title: `Quality action ${action.referenceNumber}: ${action.title}`,
          description: buildCalendarDescription([
            `Category: ${action.category}`,
            `Source: ${action.source}`,
            action.ownerName ? `Owner: ${action.ownerName}` : null,
            action.description,
          ]),
          startAt: action.dueDate!,
          endAt: null,
          allDay: true,
          recurrence: null,
          recurrenceUntil: null,
          status:
            action.status === "Closed"
              ? "COMPLETED"
              : action.status === "Awaiting Verification"
                ? "TENTATIVE"
                : "CONFIRMED",
          categories: ["Operations", "Quality", action.category],
          sourceType: "quality",
          sourceLabel: "Quality",
          sourceUrl: "/quality",
          branchId: action.branchId ?? null,
          branchName: action.branchId ? branchMap.get(action.branchId) ?? null : null,
          statusLabel: action.status,
        })
        )
    );

    result.push(
      ...qualityAuditRows
        .filter((audit) => audit.status !== "Cancelled")
        .map(
          (audit): UnifiedCalendarEvent => ({
            uid: `quality-audit-${audit.id}@textpoint`,
            title: `Audit ${audit.referenceNumber}: ${audit.title}`,
            description: buildCalendarDescription([
              `Audit type: ${audit.auditType}`,
              audit.leadAuditor ? `Lead auditor: ${audit.leadAuditor}` : null,
              audit.auditee ? `Auditee: ${audit.auditee}` : null,
              audit.scope,
              audit.findingsSummary,
            ]),
            startAt: audit.plannedDate,
            endAt: null,
            allDay: true,
            recurrence: null,
            recurrenceUntil: null,
            status: audit.status === "Completed" ? "COMPLETED" : "CONFIRMED",
            categories: ["Operations", "Quality", "Audit"],
            sourceType: "quality",
            sourceLabel: "Internal Audit",
            sourceUrl: "/quality",
            branchId: audit.branchId ?? null,
            branchName: audit.branchId ? branchMap.get(audit.branchId) ?? null : null,
            statusLabel: audit.status,
          })
        )
    );

    result.push(
      ...managementReviewRows
        .filter((review) => review.status !== "Cancelled")
        .map(
          (review): UnifiedCalendarEvent => ({
            uid: `management-review-${review.id}@textpoint`,
            title: `Management Review ${review.referenceNumber}: ${review.title}`,
            description: buildCalendarDescription([
              review.chairperson ? `Chairperson: ${review.chairperson}` : null,
              review.attendees,
              review.agenda,
              review.decisionsSummary,
            ]),
            startAt: review.meetingDate,
            endAt: null,
            allDay: true,
            recurrence: null,
            recurrenceUntil: null,
            status:
              review.status === "Closed" || review.status === "Held"
                ? "COMPLETED"
                : "CONFIRMED",
            categories: ["Operations", "Quality", "Management Review"],
            sourceType: "quality",
            sourceLabel: "Management Review",
            sourceUrl: "/quality",
            branchId: review.branchId ?? null,
            branchName: review.branchId ? branchMap.get(review.branchId) ?? null : null,
            statusLabel: review.status,
          })
        )
    );

    result.push(
      ...externalProviderRows
        .filter(
          (provider) =>
            Boolean(provider.nextEvaluationDate) &&
            provider.status !== "Inactive" &&
            provider.status !== "Suspended"
        )
        .map(
          (provider): UnifiedCalendarEvent => ({
            uid: `external-provider-${provider.id}@textpoint`,
            title: `Provider review ${provider.referenceNumber}: ${provider.companyName}`,
            description: buildCalendarDescription([
              `Type: ${provider.providerType}`,
              `Status: ${provider.status}`,
              `Rating: ${provider.rating}`,
              provider.primaryContact
                ? `Primary contact: ${provider.primaryContact}`
                : null,
              provider.serviceScope,
              provider.correctiveActionNotes,
            ]),
            startAt: provider.nextEvaluationDate!,
            endAt: null,
            allDay: true,
            recurrence: null,
            recurrenceUntil: null,
            status:
              provider.status === "Approved"
                ? "CONFIRMED"
                : provider.status === "Conditional" ||
                    provider.status === "Under Review"
                  ? "TENTATIVE"
                  : "CONFIRMED",
            categories: ["Operations", "Quality", "External Provider"],
            sourceType: "quality",
            sourceLabel: "External Provider",
            sourceUrl: "/quality",
            branchId: provider.branchId ?? null,
            branchName: provider.branchId
              ? branchMap.get(provider.branchId) ?? null
              : null,
            statusLabel: provider.status,
          })
        )
    );
  }

  return result.sort((left, right) => {
    const leftTime = new Date(left.startAt).getTime();
    const rightTime = new Date(right.startAt).getTime();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.title.localeCompare(right.title);
  });
}

export async function getUnifiedCalendarOccurrencesForUser(
  userId: number,
  options?: {
    scope?: CalendarFeedScope;
    branchId?: number;
    fromDate?: Date;
    toDate?: Date;
  }
) {
  const fromDate = options?.fromDate ?? new Date();
  const toDate = options?.toDate ?? new Date(fromDate.getTime() + 1000 * 60 * 60 * 24 * 60);
  const events = await getUnifiedCalendarEventsForUser(userId, {
    scope: options?.scope,
    branchId: options?.branchId,
  });
  return expandCalendarEvents(events, fromDate, toDate);
}

export async function getUnifiedCalendarFeedByToken(
  token: string,
  options?: {
    scope?: CalendarFeedScope;
    branchId?: number;
  }
) {
  const user = await getUserByCalendarFeedToken(token);
  if (!user) return null;

  const events = await getUnifiedCalendarEventsForUser(user.id, {
    scope: options?.scope,
    branchId: options?.branchId,
  });

  const scope = options?.scope ?? "all";
  const scopeLabel =
    scope === "private"
      ? "Private Planner"
      : scope === "shared"
        ? "Shared Calendar"
        : scope === "operations"
          ? "Operational Calendar"
          : "Unified Calendar";

  return {
    user,
    events,
    calendarName: `TextPoint ${scopeLabel} - ${user.name ?? user.email ?? "User"}`,
    calendarDescription: `${scopeLabel} feed from TextPoint`,
  };
}

// ---------------------------------------------------------------------------
// Import Logs
// ---------------------------------------------------------------------------

export async function createImportLog(data: typeof importLogs.$inferInsert) {
  return db.insert(importLogs).values(data);
}

export async function updateImportLog(
  id: number,
  data: Partial<typeof importLogs.$inferInsert>
) {
  return db.update(importLogs).set(data).where(eq(importLogs.id, id));
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function parseReportDate(value?: Date | string | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDateOverdue(value?: Date | string | null, from = new Date()) {
  const target = parseReportDate(value);
  if (!target) return false;
  return startOfDay(target).getTime() < startOfDay(from).getTime();
}

function isDateWithinNextDays(
  value: Date | string | null | undefined,
  days: number,
  from = new Date()
) {
  const target = parseReportDate(value);
  if (!target) return false;

  const start = startOfDay(from).getTime();
  const end = addDays(startOfDay(from), days).getTime();
  const current = startOfDay(target).getTime();
  return current >= start && current <= end;
}

function countWhere<T>(items: T[], predicate: (item: T) => boolean) {
  return items.reduce((count, item) => (predicate(item) ? count + 1 : count), 0);
}

function buildCountRows(
  labels: string[],
  getCount: (label: string) => number
) {
  return labels.map((label) => ({
    label,
    value: getCount(label),
  }));
}

function isMissingOptionalTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ER_NO_SUCH_TABLE") ||
    message.includes("doesn't exist") ||
    message.includes("does not exist")
  );
}

async function selectOptionalRows<T>(
  label: string,
  loader: () => Promise<T[]>
): Promise<T[]> {
  try {
    return await loader();
  } catch (error) {
    if (isMissingOptionalTableError(error)) {
      console.warn(`[Reports] Optional table "${label}" is missing. Using an empty dataset for this snapshot.`);
      return [];
    }
    throw error;
  }
}

type ReportSnapshot = {
  generatedAt: string;
  scope: {
    branchId: number | null;
    branchName: string;
  };
  highlights: Array<{
    label: string;
    value: number | string;
  }>;
  sections: Array<{
    title: string;
    rows: Array<{
      label: string;
      value: number | string;
    }>;
  }>;
  notes: string[];
};

export async function generateReportSnapshot(
  reportType: string,
  branchId?: number | null
): Promise<ReportSnapshot> {
  const [
    branchRows,
    studentRows,
    leadRows,
    companyRows,
    contactRows,
    courseRows,
    scheduleRows,
    enrollmentRows,
    attendanceRows,
    assessmentRows,
    equipmentRows,
    equipmentLoanRows,
    specimenRows,
    specimenLoanRows,
    lecturerRows,
    documentRows,
    levelIIIClientRows,
    levelIIIActivityRows,
    levelIIITechnicianRows,
    levelIIIAssessmentRows,
    levelIIIEquipmentRows,
    levelIIISpecimenRows,
  ] = await Promise.all([
    db.select().from(branches),
    db.select().from(students),
    db.select().from(leads),
    db.select().from(companies),
    db.select().from(contacts),
    db.select().from(courses),
    db.select().from(courseSchedules),
    db.select().from(enrollments),
    db.select().from(attendance),
    db.select().from(assessments),
    db.select().from(equipment),
    selectOptionalRows("equipmentLoans", () => db.select().from(equipmentLoans)),
    db.select().from(specimens),
    selectOptionalRows("specimenLoans", () => db.select().from(specimenLoans)),
    db.select().from(lecturers),
    db.select().from(documents),
    db.select().from(levelIIIClients),
    db.select().from(levelIIIActivities),
    db.select().from(levelIIITechnicians),
    db.select().from(levelIIIAssessments),
    db.select().from(levelIIIEquipment),
    db.select().from(levelIIISpecimens),
  ]);

  const selectedBranch =
    branchId === undefined || branchId === null
      ? null
      : branchRows.find((branch) => branch.id === branchId) ?? null;

  if (branchId && !selectedBranch) {
    throw new Error("Selected branch was not found.");
  }

  const filteredStudents =
    branchId === undefined || branchId === null
      ? studentRows
      : studentRows.filter((student) => student.branchId === branchId);
  const filteredLeads =
    branchId === undefined || branchId === null
      ? leadRows
      : leadRows.filter((lead) => lead.branchId === branchId);
  const filteredCompanies =
    branchId === undefined || branchId === null
      ? companyRows
      : companyRows.filter((company) => company.branchId === branchId);
  const companyIds = new Set(filteredCompanies.map((company) => company.id));
  const filteredContacts =
    branchId === undefined || branchId === null
      ? contactRows
      : contactRows.filter(
          (contact) => contact.companyId !== null && companyIds.has(contact.companyId)
        );
  const filteredCourses =
    branchId === undefined || branchId === null
      ? courseRows
      : courseRows.filter((course) => course.branchId === branchId);
  const filteredSchedules =
    branchId === undefined || branchId === null
      ? scheduleRows
      : scheduleRows.filter((schedule) => schedule.branchId === branchId);
  const scheduleIds = new Set(filteredSchedules.map((schedule) => schedule.id));
  const filteredEnrollments =
    branchId === undefined || branchId === null
      ? enrollmentRows
      : enrollmentRows.filter((enrollment) =>
          scheduleIds.has(enrollment.courseScheduleId)
        );
  const enrollmentIds = new Set(filteredEnrollments.map((enrollment) => enrollment.id));
  const filteredAttendance =
    branchId === undefined || branchId === null
      ? attendanceRows
      : attendanceRows.filter(
          (record) =>
            scheduleIds.has(record.courseScheduleId) ||
            enrollmentIds.has(record.enrollmentId)
        );
  const filteredAssessments =
    branchId === undefined || branchId === null
      ? assessmentRows
      : assessmentRows.filter((assessment) =>
          enrollmentIds.has(assessment.enrollmentId)
        );
  const filteredEquipment =
    branchId === undefined || branchId === null
      ? equipmentRows
      : equipmentRows.filter((item) => item.branchId === branchId);
  const filteredEquipmentLoans =
    branchId === undefined || branchId === null
      ? equipmentLoanRows
      : equipmentLoanRows.filter(
          (loan) => loan.fromBranchId === branchId || loan.toBranchId === branchId
        );
  const filteredSpecimens =
    branchId === undefined || branchId === null
      ? specimenRows
      : specimenRows.filter((item) => item.branchId === branchId);
  const filteredSpecimenLoans =
    branchId === undefined || branchId === null
      ? specimenLoanRows
      : specimenLoanRows.filter(
          (loan) => loan.fromBranchId === branchId || loan.toBranchId === branchId
        );
  const filteredLecturers =
    branchId === undefined || branchId === null
      ? lecturerRows
      : lecturerRows.filter((lecturer) => lecturer.branchId === branchId);
  const filteredDocuments =
    branchId === undefined || branchId === null
      ? documentRows
      : documentRows.filter((document) => document.branchId === branchId);

  const openLeads = filteredLeads.filter(
    (lead) =>
      lead.status !== "Converted" &&
      lead.status !== "Closed Lost" &&
      !lead.isBlacklisted
  );
  const overdueLeadFollowUps = countWhere(
    openLeads,
    (lead) => Boolean(lead.autoFollowUp && lead.followUpDate) && isDateOverdue(lead.followUpDate)
  );
  const dueTodayLeadFollowUps = countWhere(
    openLeads,
    (lead) =>
      Boolean(lead.autoFollowUp && lead.followUpDate) &&
      isDateWithinNextDays(lead.followUpDate, 0)
  );
  const nextSevenDayLeadFollowUps = countWhere(
    openLeads,
    (lead) =>
      Boolean(lead.autoFollowUp && lead.followUpDate) &&
      !isDateWithinNextDays(lead.followUpDate, 0) &&
      isDateWithinNextDays(lead.followUpDate, 7)
  );

  const overdueCalibration = countWhere(
    filteredEquipment,
    (item) => isDateOverdue(item.nextDueDate)
  );
  const dueCalibrationIn30 = countWhere(
    filteredEquipment,
    (item) => !isDateOverdue(item.nextDueDate) && isDateWithinNextDays(item.nextDueDate, 30)
  );
  const activeEquipmentLoans = countWhere(
    filteredEquipmentLoans,
    (loan) => !loan.returnedAt
  );
  const activeSpecimenLoans = countWhere(
    filteredSpecimenLoans,
    (loan) => !loan.returnedAt
  );

  const levelIIIDueVisits = countWhere(
    levelIIIClientRows,
    (client) => isDateWithinNextDays(client.nextVisit, 30)
  );
  const levelIIIQualificationDue = countWhere(levelIIITechnicianRows, (technician) => {
    const reviewDate = technician.hasPcnQualification
      ? technician.pcnRenewalDate
      : technician.internalAssessmentDate;
    return isDateWithinNextDays(reviewDate, 60);
  });
  const levelIIIActivityDue = countWhere(levelIIIActivityRows, (activity) => {
    const dueDate =
      activity.nextActionDate ||
      (activity.status === "Planned" ? activity.activityDate : null);
    return activity.status !== "Cancelled" && isDateWithinNextDays(dueDate, 30);
  });

  const snapshot: ReportSnapshot = {
    generatedAt: new Date().toISOString(),
    scope: {
      branchId: branchId ?? null,
      branchName: selectedBranch?.name ?? "All Branches",
    },
    highlights: [],
    sections: [],
    notes: [],
  };

  switch (reportType) {
    case "Training Summary":
      snapshot.highlights = [
        { label: "Courses", value: filteredCourses.length },
        {
          label: "Live Schedules",
          value: countWhere(
            filteredSchedules,
            (schedule) =>
              schedule.status === "Scheduled" || schedule.status === "In Progress"
          ),
        },
        {
          label: "Active Enrolments",
          value: countWhere(filteredEnrollments, (enrollment) => enrollment.status === "Active"),
        },
        { label: "Attendance Records", value: filteredAttendance.length },
        { label: "Assessments", value: filteredAssessments.length },
      ];
      snapshot.sections = [
        {
          title: "Schedule Status",
          rows: buildCountRows(
            ["Scheduled", "In Progress", "Completed", "Cancelled"],
            (label) => countWhere(filteredSchedules, (schedule) => schedule.status === label)
          ),
        },
        {
          title: "Enrolment Status",
          rows: buildCountRows(
            ["Active", "Completed", "Withdrawn", "Suspended"],
            (label) => countWhere(filteredEnrollments, (enrollment) => enrollment.status === label)
          ),
        },
        {
          title: "Attendance Status",
          rows: buildCountRows(
            ["Present", "Absent", "Late", "Excused"],
            (label) => countWhere(filteredAttendance, (record) => record.status === label)
          ),
        },
        {
          title: "Assessment Results",
          rows: buildCountRows(
            ["Pass", "Fail", "Incomplete"],
            (label) => countWhere(filteredAssessments, (assessment) => assessment.result === label)
          ),
        },
        {
          title: "Training Team",
          rows: [
            { label: "Lecturers", value: filteredLecturers.length },
            {
              label: "Active Lecturers",
              value: countWhere(filteredLecturers, (lecturer) => lecturer.active),
            },
          ],
        },
      ];
      break;

    case "CRM Summary":
      snapshot.highlights = [
        { label: "Open Leads", value: openLeads.length },
        { label: "Overdue Follow-ups", value: overdueLeadFollowUps },
        { label: "Due Today", value: dueTodayLeadFollowUps },
        { label: "Companies", value: filteredCompanies.length },
        { label: "Contacts", value: filteredContacts.length },
        {
          label: "Converted Leads",
          value: countWhere(filteredLeads, (lead) => lead.status === "Converted"),
        },
      ];
      snapshot.sections = [
        {
          title: "Lead Status Pipeline",
          rows: buildCountRows(
            ["New", "Contacted", "Qualified", "Converted", "Closed Lost"],
            (label) => countWhere(filteredLeads, (lead) => lead.status === label)
          ),
        },
        {
          title: "Follow-up Queue",
          rows: [
            { label: "Overdue", value: overdueLeadFollowUps },
            { label: "Due Today", value: dueTodayLeadFollowUps },
            { label: "Next 7 Days", value: nextSevenDayLeadFollowUps },
            {
              label: "No Follow-up Date",
              value: countWhere(
                openLeads,
                (lead) => !lead.autoFollowUp || !lead.followUpDate
              ),
            },
          ],
        },
        {
          title: "Preferred Contact Method",
          rows: buildCountRows(["Phone", "Email", "WhatsApp"], (label) =>
            countWhere(filteredLeads, (lead) => lead.preferredContactMethod === label)
          ),
        },
        {
          title: "Company Status",
          rows: buildCountRows(["Active", "Prospect", "Inactive"], (label) =>
            countWhere(filteredCompanies, (company) => company.status === label)
          ),
        },
      ];
      break;

    case "Equipment Summary":
      snapshot.highlights = [
        { label: "Equipment", value: filteredEquipment.length },
        { label: "Calibration Overdue", value: overdueCalibration },
        { label: "Due In 30 Days", value: dueCalibrationIn30 },
        { label: "Specimens", value: filteredSpecimens.length },
        { label: "Open Equipment Loans", value: activeEquipmentLoans },
        { label: "Open Specimen Loans", value: activeSpecimenLoans },
      ];
      snapshot.sections = [
        {
          title: "Equipment Status",
          rows: buildCountRows(
            ["Active", "Inactive", "Maintenance", "Retired"],
            (label) => countWhere(filteredEquipment, (item) => item.status === label)
          ),
        },
        {
          title: "Calibration Queue",
          rows: [
            { label: "Overdue", value: overdueCalibration },
            { label: "Due In 30 Days", value: dueCalibrationIn30 },
            {
              label: "No Due Date",
              value: countWhere(filteredEquipment, (item) => !item.nextDueDate),
            },
          ],
        },
        {
          title: "Specimen Status",
          rows: buildCountRows(
            ["Available", "In Use", "Loaned Out", "Quarantine", "Retired"],
            (label) => countWhere(filteredSpecimens, (item) => item.status === label)
          ),
        },
        {
          title: "Specimen Mastering",
          rows: buildCountRows(
            ["Mastered", "Re-master Required", "Pending"],
            (label) =>
              countWhere(filteredSpecimens, (item) => item.masteringStatus === label)
          ),
        },
      ];
      break;

    case "Level III Summary":
      snapshot.highlights = [
        { label: "Clients", value: levelIIIClientRows.length },
        { label: "Visits In 30 Days", value: levelIIIDueVisits },
        { label: "Technicians", value: levelIIITechnicianRows.length },
        { label: "Reviews Due In 60 Days", value: levelIIIQualificationDue },
        { label: "Assessments", value: levelIIIAssessmentRows.length },
        { label: "Activities Due", value: levelIIIActivityDue },
      ];
      snapshot.sections = [
        {
          title: "Client Visit Cadence",
          rows: buildCountRows(["Weekly", "Monthly", "Six Monthly"], (label) =>
            countWhere(levelIIIClientRows, (client) => client.visitCadence === label)
          ),
        },
        {
          title: "Activity & Review Queue",
          rows: [
            { label: "Client Visits In 30 Days", value: levelIIIDueVisits },
            { label: "Activities Due In 30 Days", value: levelIIIActivityDue },
            { label: "Qualification Reviews Due In 60 Days", value: levelIIIQualificationDue },
          ],
        },
        {
          title: "Qualification Route",
          rows: [
            {
              label: "PCN Route",
              value: countWhere(
                levelIIITechnicianRows,
                (technician) => technician.hasPcnQualification
              ),
            },
            {
              label: "Internal Route",
              value: countWhere(
                levelIIITechnicianRows,
                (technician) => !technician.hasPcnQualification
              ),
            },
            {
              label: "Eye Tests Due In 60 Days",
              value: countWhere(levelIIITechnicianRows, (technician) =>
                isDateWithinNextDays(technician.eyeTestValidUntil, 60)
              ),
            },
          ],
        },
        {
          title: "Assessment Results",
          rows: buildCountRows(
            ["Pass", "Fail", "Observation", "Pending Review"],
            (label) =>
              countWhere(levelIIIAssessmentRows, (assessment) => assessment.result === label)
          ),
        },
        {
          title: "Dedicated Assets",
          rows: [
            { label: "Level III Equipment", value: levelIIIEquipmentRows.length },
            {
              label: "Calibration Due In 30 Days",
              value: countWhere(levelIIIEquipmentRows, (item) =>
                isDateWithinNextDays(item.nextDueDate, 30)
              ),
            },
            { label: "Level III Specimens", value: levelIIISpecimenRows.length },
            {
              label: "Re-master Required",
              value: countWhere(
                levelIIISpecimenRows,
                (item) => item.masteringStatus === "Re-master Required"
              ),
            },
          ],
        },
      ];
      if (branchId !== undefined && branchId !== null) {
        snapshot.notes.push(
          "Level III data is currently stored globally and is not branch-scoped in the database."
        );
      }
      break;

    case "Operations Summary":
    default:
      snapshot.highlights = [
        { label: "Students", value: filteredStudents.length },
        { label: "Leads", value: filteredLeads.length },
        { label: "Courses", value: filteredCourses.length },
        { label: "Enrolments", value: filteredEnrollments.length },
        { label: "Equipment", value: filteredEquipment.length },
        { label: "Documents", value: filteredDocuments.length },
      ];
      snapshot.sections = [
        {
          title: "CRM Pipeline",
          rows: buildCountRows(
            ["New", "Contacted", "Qualified", "Converted", "Closed Lost"],
            (label) => countWhere(filteredLeads, (lead) => lead.status === label)
          ),
        },
        {
          title: "Training Delivery",
          rows: [
            { label: "Course Schedules", value: filteredSchedules.length },
            {
              label: "In Progress Schedules",
              value: countWhere(
                filteredSchedules,
                (schedule) => schedule.status === "In Progress"
              ),
            },
            {
              label: "Active Enrolments",
              value: countWhere(filteredEnrollments, (entry) => entry.status === "Active"),
            },
            { label: "Lecturers", value: filteredLecturers.length },
          ],
        },
        {
          title: "Assets & Content",
          rows: [
            { label: "Equipment", value: filteredEquipment.length },
            { label: "Calibration Overdue", value: overdueCalibration },
            { label: "Specimens", value: filteredSpecimens.length },
            { label: "Documents", value: filteredDocuments.length },
          ],
        },
        {
          title: "CRM Directory",
          rows: [
            { label: "Companies", value: filteredCompanies.length },
            { label: "Contacts", value: filteredContacts.length },
            { label: "Open Leads", value: openLeads.length },
            { label: "Overdue Follow-ups", value: overdueLeadFollowUps },
          ],
        },
      ];
      break;
  }

  snapshot.notes.unshift(
    `Scope: ${snapshot.scope.branchName}`,
    `Generated: ${new Date(snapshot.generatedAt).toLocaleString("en-ZA")}`
  );

  return snapshot;
}

export async function getAllReports(branchId?: number) {
  return branchId
    ? db.select().from(reports).where(eq(reports.branchId, branchId))
    : db.select().from(reports);
}

export async function createReport(data: typeof reports.$inferInsert) {
  return db.insert(reports).values(data);
}

export async function deleteReport(id: number) {
  return db.delete(reports).where(eq(reports.id, id));
}

// ---------------------------------------------------------------------------
// Quality Actions
// ---------------------------------------------------------------------------

const QUALITY_REFERENCE_PREFIX: Record<
  "Nonconformance" | "Corrective Action" | "Observation" | "Improvement",
  string
> = {
  Nonconformance: "NC",
  "Corrective Action": "CA",
  Observation: "OBS",
  Improvement: "IMP",
};

async function generateQualityReferenceNumber(
  category: "Nonconformance" | "Corrective Action" | "Observation" | "Improvement"
) {
  const year = new Date().getFullYear();
  const prefix = QUALITY_REFERENCE_PREFIX[category];
  const matcher = new RegExp(`^${prefix}-${year}-(\\d{3,})$`);
  const existing = await db
    .select({ referenceNumber: qualityActions.referenceNumber })
    .from(qualityActions);

  const nextSequence =
    existing.reduce((highest, row) => {
      const match = row.referenceNumber?.match(matcher);
      if (!match) return highest;
      const sequence = Number.parseInt(match[1] || "0", 10);
      return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
    }, 0) + 1;

  return `${prefix}-${year}-${String(nextSequence).padStart(3, "0")}`;
}

function normalizeQualityActionStatusDates(
  data: Partial<typeof qualityActions.$inferInsert>
) {
  if (data.status === "Closed") {
    return {
      ...data,
      closedAt: data.closedAt ?? new Date(),
    };
  }

  if (data.status) {
    return {
      ...data,
      closedAt: null,
    };
  }

  return data;
}

async function generateSequencedReferenceNumber(
  table:
    | typeof qualityActions
    | typeof qualityAudits
    | typeof managementReviews
    | typeof externalProviders,
  prefix: string
) {
  const year = new Date().getFullYear();
  const matcher = new RegExp(`^${prefix}-${year}-(\\d{3,})$`);
  const existing = await db
    .select({ referenceNumber: table.referenceNumber })
    .from(table);

  const nextSequence =
    existing.reduce((highest, row) => {
      const match = row.referenceNumber?.match(matcher);
      if (!match) return highest;
      const sequence = Number.parseInt(match[1] || "0", 10);
      return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
    }, 0) + 1;

  return `${prefix}-${year}-${String(nextSequence).padStart(3, "0")}`;
}

export async function getAllQualityActions(branchId?: number) {
  const result = branchId
    ? await db.select().from(qualityActions).where(eq(qualityActions.branchId, branchId))
    : await db.select().from(qualityActions);

  return result.sort((a, b) => {
    const reportedA = a.reportedDate ? new Date(a.reportedDate).getTime() : 0;
    const reportedB = b.reportedDate ? new Date(b.reportedDate).getTime() : 0;
    if (reportedA !== reportedB) {
      return reportedB - reportedA;
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getQualityActionById(id: number) {
  const result = await db
    .select()
    .from(qualityActions)
    .where(eq(qualityActions.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createQualityAction(data: typeof qualityActions.$inferInsert) {
  const referenceNumber =
    data.referenceNumber?.trim() ||
    (await generateQualityReferenceNumber(
      (data.category ??
        "Nonconformance") as "Nonconformance" | "Corrective Action" | "Observation" | "Improvement"
    ));

  const values = normalizeQualityActionStatusDates({
      ...data,
      referenceNumber,
    }) as typeof qualityActions.$inferInsert;

  return db.insert(qualityActions).values(values);
}

export async function updateQualityAction(
  id: number,
  data: Partial<typeof qualityActions.$inferInsert>
) {
  return db
    .update(qualityActions)
    .set(normalizeQualityActionStatusDates(data))
    .where(eq(qualityActions.id, id));
}

export async function deleteQualityAction(id: number) {
  return db.delete(qualityActions).where(eq(qualityActions.id, id));
}

async function generateQualityAuditReferenceNumber() {
  return generateSequencedReferenceNumber(qualityAudits, "IA");
}

function normalizeQualityAuditStatusDates(
  data: Partial<typeof qualityAudits.$inferInsert>
) {
  if (data.status === "Completed") {
    return {
      ...data,
      completedDate: data.completedDate ?? new Date(),
    };
  }

  if (data.status) {
    return {
      ...data,
      completedDate: null,
    };
  }

  return data;
}

export async function getAllQualityAudits(branchId?: number) {
  const result = branchId
    ? await db.select().from(qualityAudits).where(eq(qualityAudits.branchId, branchId))
    : await db.select().from(qualityAudits);

  return result.sort((a, b) => {
    const plannedA = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
    const plannedB = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;
    if (plannedA !== plannedB) {
      return plannedB - plannedA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getQualityAuditById(id: number) {
  const result = await db
    .select()
    .from(qualityAudits)
    .where(eq(qualityAudits.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createQualityAudit(data: typeof qualityAudits.$inferInsert) {
  const referenceNumber = data.referenceNumber?.trim() || (await generateQualityAuditReferenceNumber());
  const values = normalizeQualityAuditStatusDates({
    ...data,
    referenceNumber,
  }) as typeof qualityAudits.$inferInsert;

  return db.insert(qualityAudits).values(values);
}

export async function updateQualityAudit(
  id: number,
  data: Partial<typeof qualityAudits.$inferInsert>
) {
  return db
    .update(qualityAudits)
    .set(normalizeQualityAuditStatusDates(data))
    .where(eq(qualityAudits.id, id));
}

export async function deleteQualityAudit(id: number) {
  return db.delete(qualityAudits).where(eq(qualityAudits.id, id));
}

async function generateManagementReviewReferenceNumber() {
  return generateSequencedReferenceNumber(managementReviews, "MR");
}

export async function getAllManagementReviews(branchId?: number) {
  const result = branchId
    ? await db
        .select()
        .from(managementReviews)
        .where(eq(managementReviews.branchId, branchId))
    : await db.select().from(managementReviews);

  return result.sort((a, b) => {
    const meetingA = a.meetingDate ? new Date(a.meetingDate).getTime() : 0;
    const meetingB = b.meetingDate ? new Date(b.meetingDate).getTime() : 0;
    if (meetingA !== meetingB) {
      return meetingB - meetingA;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getManagementReviewById(id: number) {
  const result = await db
    .select()
    .from(managementReviews)
    .where(eq(managementReviews.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createManagementReview(
  data: typeof managementReviews.$inferInsert
) {
  const referenceNumber =
    data.referenceNumber?.trim() || (await generateManagementReviewReferenceNumber());

  return db.insert(managementReviews).values({
    ...data,
    referenceNumber,
  });
}

export async function updateManagementReview(
  id: number,
  data: Partial<typeof managementReviews.$inferInsert>
) {
  return db.update(managementReviews).set(data).where(eq(managementReviews.id, id));
}

export async function deleteManagementReview(id: number) {
  return db.delete(managementReviews).where(eq(managementReviews.id, id));
}

async function generateExternalProviderReferenceNumber() {
  return generateSequencedReferenceNumber(externalProviders, "EP");
}

export async function getAllExternalProviders(branchId?: number) {
  const result = branchId
    ? await db
        .select()
        .from(externalProviders)
        .where(eq(externalProviders.branchId, branchId))
    : await db.select().from(externalProviders);

  return result.sort((a, b) => {
    const nextEvalA = a.nextEvaluationDate ? new Date(a.nextEvaluationDate).getTime() : 0;
    const nextEvalB = b.nextEvaluationDate ? new Date(b.nextEvaluationDate).getTime() : 0;
    if (nextEvalA !== nextEvalB) {
      return nextEvalA - nextEvalB;
    }
    return a.companyName.localeCompare(b.companyName);
  });
}

export async function getExternalProviderById(id: number) {
  const result = await db
    .select()
    .from(externalProviders)
    .where(eq(externalProviders.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createExternalProvider(
  data: typeof externalProviders.$inferInsert
) {
  const referenceNumber =
    data.referenceNumber?.trim() || (await generateExternalProviderReferenceNumber());

  return db.insert(externalProviders).values({
    ...data,
    referenceNumber,
  });
}

export async function updateExternalProvider(
  id: number,
  data: Partial<typeof externalProviders.$inferInsert>
) {
  return db.update(externalProviders).set(data).where(eq(externalProviders.id, id));
}

export async function deleteExternalProvider(id: number) {
  return db.delete(externalProviders).where(eq(externalProviders.id, id));
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export async function getAllBranches() {
  return db.select().from(branches);
}

export async function getBranchById(id: number) {
  const result = await db
    .select()
    .from(branches)
    .where(eq(branches.id, id))
    .limit(1);
  return result[0] ?? null;
}

function validateBranchBranding(data: {
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}) {
  const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

  if (data.logoUrl && data.logoUrl.length > 60_000) {
    throw new Error(
      "Branch logo is too large. Please upload a smaller image."
    );
  }

  if (data.primaryColor && !hexColorRegex.test(data.primaryColor)) {
    throw new Error("Primary colour must be a valid hex value like #0f766e.");
  }

  if (data.secondaryColor && !hexColorRegex.test(data.secondaryColor)) {
    throw new Error("Secondary colour must be a valid hex value like #0f172a.");
  }
}

export async function createBranch(data: typeof branches.$inferInsert) {
  validateBranchBranding({
    logoUrl: data.logoUrl ?? null,
    primaryColor: data.primaryColor ?? null,
    secondaryColor: data.secondaryColor ?? null,
  });
  return db.insert(branches).values(data);
}

export async function updateBranch(
  id: number,
  data: Partial<typeof branches.$inferInsert>
) {
  validateBranchBranding({
    logoUrl: data.logoUrl ?? null,
    primaryColor: data.primaryColor ?? null,
    secondaryColor: data.secondaryColor ?? null,
  });
  return db.update(branches).set(data).where(eq(branches.id, id));
}

export async function deleteBranch(id: number) {
  return db.delete(branches).where(eq(branches.id, id));
}
