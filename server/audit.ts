import { getDb } from "./db";
import { auditLogs, AuditLog, users } from "../drizzle/schema";
import { and, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";

export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  status?: "Success" | "Failed";
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  search?: string;
};

export type AuditTrailItem = AuditLog & {
  actorName: string | null;
  actorEmail: string | null;
  changesSummary: string;
};

function resolveAuditActorFallback(userId: number) {
  if (userId === 0) {
    return {
      actorName: "System Scheduler",
      actorEmail: null,
    };
  }

  return {
    actorName: null,
    actorEmail: null,
  };
}

function parseAuditChanges(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}

export function summarizeAuditChanges(value: unknown) {
  const changes = parseAuditChanges(value);
  if (!changes) return "-";

  const parts = Object.entries(changes)
    .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "")
    .slice(0, 4)
    .map(([key, entryValue]) => {
      if (typeof entryValue === "object") {
        return key;
      }
      return `${key}: ${String(entryValue)}`;
    });

  if (parts.length === 0) return "-";

  const remaining = Object.keys(changes).length - parts.length;
  return remaining > 0 ? `${parts.join("; ")}; +${remaining} more` : parts.join("; ");
}

/**
 * Log an audit event for tracking system changes
 */
export async function logAuditEvent(
  userId: number,
  action: "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT",
  entityType: string,
  entityId: number,
  changes?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  status: "Success" | "Failed" = "Success",
  errorMessage?: string
): Promise<AuditLog | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot log event: database not available");
    return null;
  }

  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      entityType,
      entityId,
      changes: changes ? JSON.stringify(changes) : null,
      ipAddress,
      userAgent,
      status,
      errorMessage,
    });

    // Return the inserted record
    const inserted = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.id))
      .limit(1);
    return inserted[0] || null;
  } catch (error) {
    console.error("[Audit] Failed to log event:", error);
    return null;
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: number,
  limit: number = 50
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot retrieve logs: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityType, entityType), eq(auditLogs.entityId, entityId)))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Audit] Failed to retrieve logs:", error);
    return [];
  }
}

export async function getEntityAuditTrail(
  entityType: string,
  entityId: number,
  limit: number = 50
): Promise<AuditTrailItem[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot retrieve entity trail: database not available");
    return [];
  }

  try {
    const rows = await getEntityAuditLogs(entityType, entityId, limit);
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
      const actor = actorById.get(row.userId);
      const fallbackActor = resolveAuditActorFallback(row.userId);
      return {
        ...row,
        actorName: actor?.name ?? fallbackActor.actorName,
        actorEmail: actor?.email ?? fallbackActor.actorEmail,
        changesSummary: summarizeAuditChanges(row.changes),
      };
    });
  } catch (error) {
    console.error("[Audit] Failed to retrieve entity trail:", error);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(
  userId: number,
  limit: number = 100
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot retrieve logs: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Audit] Failed to retrieve logs:", error);
    return [];
  }
}

/**
 * Get all audit logs with optional filtering
 */
export async function getAllAuditLogs(
  filters?: AuditLogFilters,
  limit: number = 100
): Promise<AuditLog[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot retrieve logs: database not available");
    return [];
  }

  try {
    const conditions = [];

    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.status) {
      conditions.push(eq(auditLogs.status, filters.status));
    }
    if (filters?.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          like(auditLogs.action, term),
          like(auditLogs.entityType, term),
          like(auditLogs.errorMessage, term)
        )
      );
    }

    return await db
      .select()
      .from(auditLogs)
      .$dynamic()
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Audit] Failed to retrieve logs:", error);
    return [];
  }
}

export async function getAuditTrail(
  filters?: AuditLogFilters,
  limit: number = 100
): Promise<AuditTrailItem[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot retrieve trail: database not available");
    return [];
  }

  try {
    const rows = await getAllAuditLogs(filters, limit);
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
      const actor = actorById.get(row.userId);
      const fallbackActor = resolveAuditActorFallback(row.userId);
      return {
        ...row,
        actorName: actor?.name ?? fallbackActor.actorName,
        actorEmail: actor?.email ?? fallbackActor.actorEmail,
        changesSummary: summarizeAuditChanges(row.changes),
      };
    });
  } catch (error) {
    console.error("[Audit] Failed to retrieve trail:", error);
    return [];
  }
}

export function buildAuditTrailExportRows(items: AuditTrailItem[]) {
  return items.map((item) => ({
    id: item.id,
    date: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
    actor: item.actorName || item.actorEmail || `User ${item.userId}`,
    actorEmail: item.actorEmail ?? "",
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId,
    status: item.status,
    changes: item.changesSummary,
    errorMessage: item.errorMessage ?? "",
    ipAddress: item.ipAddress ?? "",
  }));
}
