import { getDb } from "./db";
import { students, leads, courses, equipment, specimens } from "../drizzle/schema";
import { like, and, or, gte, lte } from "drizzle-orm";

/**
 * Advanced search for students
 */
export async function searchStudents(
  query: string,
  filters?: {
    active?: boolean;
    blacklisted?: boolean;
    branchId?: number;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Search] Cannot search: database not available");
    return [];
  }

  try {
    let sqlQuery = db
      .select()
      .from(students)
      .where(
        or(
          like(students.firstName, `%${query}%`),
          like(students.lastName, `%${query}%`),
          like(students.email, `%${query}%`),
          like(students.phone, `%${query}%`)
        )
      ) as any;

    // Apply additional filters
    const conditions = [];
    if (filters?.active !== undefined) {
      conditions.push(students.active === filters.active as any);
    }
    if (filters?.blacklisted !== undefined) {
      conditions.push(students.blacklisted === filters.blacklisted as any);
    }
    if (filters?.branchId !== undefined) {
      conditions.push(students.branchId === filters.branchId as any);
    }

    if (conditions.length > 0) {
      sqlQuery = sqlQuery.where(and(...(conditions as any)));
    }

    return await sqlQuery;
  } catch (error) {
    console.error("[Search] Failed to search students:", error);
    return [];
  }
}

/**
 * Advanced search for leads
 */
export async function searchLeads(
  query: string,
  filters?: {
    status?: string;
    branchId?: number;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Search] Cannot search: database not available");
    return [];
  }

  try {
    let sqlQuery = db
      .select()
      .from(leads)
      .where(
        or(
          like(leads.firstName, `%${query}%`),
          like(leads.lastName, `%${query}%`),
          like(leads.email, `%${query}%`),
          like(leads.companyName, `%${query}%`)
        )
      ) as any;

    // Apply additional filters
    const conditions = [];
    if (filters?.status) {
      conditions.push(leads.status === filters.status as any);
    }
    if (filters?.branchId !== undefined) {
      conditions.push(leads.branchId === filters.branchId as any);
    }

    if (conditions.length > 0) {
      sqlQuery = sqlQuery.where(and(...(conditions as any)));
    }

    return await sqlQuery;
  } catch (error) {
    console.error("[Search] Failed to search leads:", error);
    return [];
  }
}

/**
 * Advanced search for courses
 */
export async function searchCourses(
  query: string,
  filters?: {
    level?: string;
    active?: boolean;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Search] Cannot search: database not available");
    return [];
  }

  try {
    let sqlQuery = db
      .select()
      .from(courses)
      .where(
        or(
          like(courses.name, `%${query}%`),
          like(courses.code, `%${query}%`),
          like(courses.description, `%${query}%`)
        )
      ) as any;

    // Apply additional filters
    const conditions = [];
    if (filters?.level) {
      conditions.push(courses.level === filters.level as any);
    }
    if (filters?.active !== undefined) {
      conditions.push(courses.active === filters.active as any);
    }

    if (conditions.length > 0) {
      sqlQuery = sqlQuery.where(and(...(conditions as any)));
    }

    return await sqlQuery;
  } catch (error) {
    console.error("[Search] Failed to search courses:", error);
    return [];
  }
}

/**
 * Advanced search for equipment
 */
export async function searchEquipment(
  query: string,
  filters?: {
    status?: string;
    branchId?: number;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Search] Cannot search: database not available");
    return [];
  }

  try {
    let sqlQuery = db
      .select()
      .from(equipment)
      .where(
        or(
          like(equipment.name, `%${query}%`),
          like(equipment.serialNumber, `%${query}%`),
          like(equipment.description, `%${query}%`)
        )
      ) as any;

    // Apply additional filters
    const conditions = [];
    if (filters?.status) {
      conditions.push(equipment.status === filters.status as any);
    }
    if (filters?.branchId !== undefined) {
      conditions.push(equipment.branchId === filters.branchId as any);
    }

    if (conditions.length > 0) {
      sqlQuery = sqlQuery.where(and(...(conditions as any)));
    }

    return await sqlQuery;
  } catch (error) {
    console.error("[Search] Failed to search equipment:", error);
    return [];
  }
}

/**
 * Advanced search for specimens
 */
export async function searchSpecimens(
  query: string,
  filters?: {
    status?: string;
  }
): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Search] Cannot search: database not available");
    return [];
  }

  try {
    let sqlQuery = db
      .select()
      .from(specimens)
      .where(
        or(
          like(specimens.name, `%${query}%`),
          like(specimens.serialNumber, `%${query}%`),
          like(specimens.description, `%${query}%`)
        )
      ) as any;

    // Apply additional filters
    const conditions = [];
    if (filters?.status) {
      conditions.push(specimens.status === filters.status as any);
    }

    if (conditions.length > 0) {
      sqlQuery = sqlQuery.where(and(...(conditions as any)));
    }

    return await sqlQuery;
  } catch (error) {
    console.error("[Search] Failed to search specimens:", error);
    return [];
  }
}
