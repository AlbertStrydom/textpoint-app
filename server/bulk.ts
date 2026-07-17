import { getDb } from "./db";
import { students, leads, equipment, specimens } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Bulk delete students
 */
export async function bulkDeleteStudents(studentIds: number[]): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Bulk] Cannot delete: database not available");
    return { success: 0, failed: studentIds.length };
  }

  try {
    await db.delete(students).where(inArray(students.id, studentIds));
    return { success: studentIds.length, failed: 0 };
  } catch (error) {
    console.error("[Bulk] Failed to delete students:", error);
    return { success: 0, failed: studentIds.length };
  }
}

/**
 * Bulk delete leads
 */
export async function bulkDeleteLeads(leadIds: number[]): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Bulk] Cannot delete: database not available");
    return { success: 0, failed: leadIds.length };
  }

  try {
    await db.delete(leads).where(inArray(leads.id, leadIds));
    return { success: leadIds.length, failed: 0 };
  } catch (error) {
    console.error("[Bulk] Failed to delete leads:", error);
    return { success: 0, failed: leadIds.length };
  }
}

/**
 * Bulk update student status (active/inactive)
 */
export async function bulkUpdateStudentStatus(
  studentIds: number[],
  active: boolean
): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Bulk] Cannot update: database not available");
    return { success: 0, failed: studentIds.length };
  }

  try {
    await db.update(students).set({ active }).where(inArray(students.id, studentIds));
    return { success: studentIds.length, failed: 0 };
  } catch (error) {
    console.error("[Bulk] Failed to update students:", error);
    return { success: 0, failed: studentIds.length };
  }
}

/**
 * Bulk update lead status
 */
export async function bulkUpdateLeadStatus(
  leadIds: number[],
  status: "New" | "Contacted" | "Qualified" | "Converted" | "Closed Lost"
): Promise<{ success: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Bulk] Cannot update: database not available");
    return { success: 0, failed: leadIds.length };
  }

  try {
    await db.update(leads).set({ status }).where(inArray(leads.id, leadIds));
    return { success: leadIds.length, failed: 0 };
  } catch (error) {
    console.error("[Bulk] Failed to update leads:", error);
    return { success: 0, failed: leadIds.length };
  }
}

/**
 * Bulk export students to JSON
 */
export async function bulkExportStudents(studentIds?: number[]): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Bulk] Cannot export: database not available");
    return [];
  }

  try {
    let query = db.select().from(students) as any;
    if (studentIds && studentIds.length > 0) {
      query = query.where(inArray(students.id, studentIds));
    }
    return await query;
  } catch (error) {
    console.error("[Bulk] Failed to export students:", error);
    return [];
  }
}

/**
 * Bulk export leads to JSON
 */
export async function bulkExportLeads(leadIds?: number[]): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Bulk] Cannot export: database not available");
    return [];
  }

  try {
    let query = db.select().from(leads) as any;
    if (leadIds && leadIds.length > 0) {
      query = query.where(inArray(leads.id, leadIds));
    }
    return await query;
  } catch (error) {
    console.error("[Bulk] Failed to export leads:", error);
    return [];
  }
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`;
          }
          return value;
        })
        .join(",")
    ),
  ].join("\n");

  return csv;
}

/**
 * Convert data to Excel format (returns base64 encoded)
 */
export function convertToExcel(data: any[]): string {
  // Simple implementation - in production, use a library like xlsx
  const csv = convertToCSV(data);
  return Buffer.from(csv).toString("base64");
}
