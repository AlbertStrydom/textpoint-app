import { eq } from "drizzle-orm";
import { db } from "../_core/db";
import {
  leads,
  companies,
  contacts,
  leadActivities,
} from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Leads CRUD
// ---------------------------------------------------------------------------

export async function getAllLeads(branchId?: number) {
  return branchId
    ? db.select().from(leads).where(eq(leads.branchId, branchId))
    : db.select().from(leads);
}

export async function getLeadById(id: number) {
  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function findDuplicateLead(data: {
  email?: string;
  phone?: string;
  idNumber?: string;
  passportNumber?: string;
  firstName?: string;
  lastName?: string;
}) {
  const allLeads = await db.select().from(leads);

  return (
    allLeads.find((lead) => {
      if (data.idNumber && lead.idNumber && data.idNumber === lead.idNumber)
        return true;
      if (
        data.passportNumber &&
        lead.passportNumber &&
        data.passportNumber === lead.passportNumber
      )
        return true;
      if (
        data.email &&
        lead.email &&
        data.email.toLowerCase() === lead.email.toLowerCase()
      )
        return true;
      if (data.phone && lead.phone && data.phone === lead.phone) return true;
      if (
        data.firstName &&
        data.lastName &&
        lead.firstName &&
        lead.lastName &&
        data.firstName.trim().toLowerCase() ===
          lead.firstName.trim().toLowerCase() &&
        data.lastName.trim().toLowerCase() ===
          lead.lastName.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    }) ?? null
  );
}

export async function findLeadByIdentity(data: {
  idNumber?: string;
  passportNumber?: string;
  excludeLeadId?: number;
}) {
  const allLeads = await db.select().from(leads);

  return (
    allLeads.find((lead) => {
      if (data.excludeLeadId && lead.id === data.excludeLeadId) return false;
      if (data.idNumber && lead.idNumber && data.idNumber === lead.idNumber)
        return true;
      if (
        data.passportNumber &&
        lead.passportNumber &&
        data.passportNumber === lead.passportNumber
      )
        return true;
      return false;
    }) ?? null
  );
}

export async function createLead(data: typeof leads.$inferInsert) {
  return db.insert(leads).values(data);
}

export async function updateLead(
  id: number,
  data: Partial<typeof leads.$inferInsert>
) {
  return db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  return db.delete(leads).where(eq(leads.id, id));
}

// ---------------------------------------------------------------------------
// CRM Companies
// ---------------------------------------------------------------------------

export async function getAllCompanies(branchId?: number) {
  const rows = branchId
    ? await db.select().from(companies).where(eq(companies.branchId, branchId))
    : await db.select().from(companies);

  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCompanyById(id: number) {
  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createCompany(data: typeof companies.$inferInsert) {
  return db.insert(companies).values(data);
}

export async function updateCompany(
  id: number,
  data: Partial<typeof companies.$inferInsert>
) {
  return db.update(companies).set(data).where(eq(companies.id, id));
}

export async function deleteCompany(id: number) {
  await db.delete(contacts).where(eq(contacts.companyId, id));
  return db.delete(companies).where(eq(companies.id, id));
}

// ---------------------------------------------------------------------------
// CRM Contacts
// ---------------------------------------------------------------------------

export async function getContactsForCompany(companyId: number) {
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, companyId));

  return rows.sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
  );
}

export async function getContactById(id: number) {
  const result = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createContact(data: typeof contacts.$inferInsert) {
  return db.insert(contacts).values(data);
}

export async function updateContact(
  id: number,
  data: Partial<typeof contacts.$inferInsert>
) {
  return db.update(contacts).set(data).where(eq(contacts.id, id));
}

export async function deleteContact(id: number) {
  return db.delete(contacts).where(eq(contacts.id, id));
}

// ---------------------------------------------------------------------------
// Lead Activities
// ---------------------------------------------------------------------------

export async function getLeadActivities(leadId: number) {
  const rows = await db
    .select()
    .from(leadActivities)
    .where(eq(leadActivities.leadId, leadId));

  return rows.sort((a, b) => {
    const aDate = a.dueDate ?? a.createdAt;
    const bDate = b.dueDate ?? b.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });
}

export async function createLeadActivity(
  data: typeof leadActivities.$inferInsert
) {
  return db.insert(leadActivities).values(data);
}

export async function updateLeadActivity(
  id: number,
  data: Partial<typeof leadActivities.$inferInsert>
) {
  return db.update(leadActivities).set(data).where(eq(leadActivities.id, id));
}

export async function deleteLeadActivity(id: number) {
  return db.delete(leadActivities).where(eq(leadActivities.id, id));
}

// ---------------------------------------------------------------------------
// Lead Reminder Helpers
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

function isOpenLeadForReminder(lead: typeof leads.$inferSelect) {
  return (
    lead.status !== "Converted" &&
    lead.status !== "Closed Lost" &&
    !lead.isBlacklisted
  );
}

function getReminderPriority(dueDate: Date, today: Date) {
  const dueDay = startOfDay(dueDate);
  const daysUntil = Math.round(
    (dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntil < 0) return "overdue" as const;
  if (daysUntil === 0) return "today" as const;
  return "upcoming" as const;
}

// ---------------------------------------------------------------------------
// Lead Reminders
// ---------------------------------------------------------------------------

export async function getLeadReminders(daysAhead = 14) {
  const today = startOfDay(new Date());
  const until = addDays(today, Math.max(0, daysAhead));
  const allLeads = await db.select().from(leads);
  const allActivities = await db.select().from(leadActivities);
  const leadById = new Map(allLeads.map((lead) => [lead.id, lead]));

  const reminders: Array<{
    id: string;
    type: "followUp" | "activity";
    leadId: number;
    activityId?: number;
    activityType?: string;
    title: string;
    detail: string | null;
    leadName: string;
    companyName: string | null;
    dueDate: Date;
    priority: "overdue" | "today" | "upcoming";
  }> = [];

  for (const lead of allLeads) {
    if (!isOpenLeadForReminder(lead) || !lead.autoFollowUp || !lead.followUpDate) {
      continue;
    }

    const dueDate = new Date(lead.followUpDate);
    if (Number.isNaN(dueDate.getTime()) || startOfDay(dueDate) > until) {
      continue;
    }

    reminders.push({
      id: `lead-follow-up-${lead.id}`,
      type: "followUp",
      leadId: lead.id,
      title: "Lead follow-up",
      detail: lead.notes,
      leadName: `${lead.firstName} ${lead.lastName}`,
      companyName: lead.companyName,
      dueDate,
      priority: getReminderPriority(dueDate, today),
    });
  }

  for (const activity of allActivities) {
    if (activity.completed || !activity.dueDate) {
      continue;
    }

    const lead = leadById.get(activity.leadId);
    if (!lead || !isOpenLeadForReminder(lead)) {
      continue;
    }

    const dueDate = new Date(activity.dueDate);
    if (Number.isNaN(dueDate.getTime()) || startOfDay(dueDate) > until) {
      continue;
    }

    reminders.push({
      id: `lead-activity-${activity.id}`,
      type: "activity",
      leadId: lead.id,
      activityId: activity.id,
      activityType: activity.activityType,
      title: activity.subject || `${activity.activityType} activity`,
      detail: activity.notes,
      leadName: `${lead.firstName} ${lead.lastName}`,
      companyName: lead.companyName,
      dueDate,
      priority: getReminderPriority(dueDate, today),
    });
  }

  return reminders.sort((a, b) => {
    const priorityWeight = { overdue: 0, today: 1, upcoming: 2 };
    const priorityDifference =
      priorityWeight[a.priority] - priorityWeight[b.priority];
    if (priorityDifference !== 0) return priorityDifference;

    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
