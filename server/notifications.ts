import { and, eq, gt, lt } from "drizzle-orm";
import {
  documents,
  equipment,
  externalProviders,
  kpiRecords,
  managementReviews,
  notificationPreferences,
  notifications as notificationsTable,
  plannerTimesheetEntries,
  plannerTimesheetLeaveOverrideReviews,
  plannerTimesheetMonthStatuses,
  portalClientUsers,
  levelIIIClients,
  qualityActions,
  qualityAudits,
  users,
} from "../drizzle/schema";
import { sendEmail } from "./_core/email";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import {
  getDb,
  getAllLevelIIITechnicianCertificates,
  getAllLevelIIITechnicians,
  getPortalClientDocuments,
  getPortalClientReminderSettings,
  getPortalRequirementMatrixForClient,
} from "./db";

type NotificationPriority = "low" | "normal" | "high" | "critical";
type NotificationType =
  | "student_added"
  | "lead_status_changed"
  | "attendance_marked"
  | "equipment_maintenance"
  | "specimen_mastered"
  | "kpi_completed"
  | "course_started"
  | "enrollment_confirmed"
  | "system_alert";

type NotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  actionUrl?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown> | null;
  relatedUserId?: number | null;
};

type NotificationPreferencePayload = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundAlerts: boolean;
  studentAddedNotif: boolean;
  leadStatusChangeNotif: boolean;
  attendanceNotif: boolean;
  equipmentNotif: boolean;
  specimenNotif: boolean;
  kpiNotif: boolean;
  courseNotif: boolean;
  enrollmentNotif: boolean;
  systemAlertNotif: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencePayload = {
  emailNotifications: true,
  pushNotifications: true,
  soundAlerts: true,
  studentAddedNotif: true,
  leadStatusChangeNotif: true,
  attendanceNotif: true,
  equipmentNotif: true,
  specimenNotif: true,
  kpiNotif: true,
  courseNotif: true,
  enrollmentNotif: true,
  systemAlertNotif: true,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_REMINDER_WINDOW_DAYS = 7;
const PLANNER_TIMESHEET_REVIEW_REMINDER_DAYS = 2;
const PLANNER_TIMESHEET_RETURN_REMINDER_DAYS = 1;
const PLANNER_TIMESHEET_OVERRIDE_REVIEW_REMINDER_DAYS = 2;
const LEVEL_III_DOCUMENT_REVIEW_REMINDER_DAYS = 2;
const LEVEL_III_DOCUMENT_REVIEW_ESCALATION_DAYS = 5;
const LEVEL_III_CERTIFICATE_REVIEW_REMINDER_DAYS = 2;
const LEVEL_III_CERTIFICATE_REVIEW_ESCALATION_DAYS = 5;
const LEVEL_III_CERTIFICATE_EXPIRY_REMINDER_DAYS = 30;
const NOTIFICATION_EMAIL_COOLDOWN_MS =
  Math.max(5, ENV.notificationEmailCooldownMinutes) * 60 * 1000;
const PLANNER_TIMESHEET_IMPACT_NOTE_PREFIX = "Planner impact note:";

const NOTIFICATION_PREFERENCE_MAP: Record<
  NotificationType,
  keyof NotificationPreferencePayload
> = {
  student_added: "studentAddedNotif",
  lead_status_changed: "leadStatusChangeNotif",
  attendance_marked: "attendanceNotif",
  equipment_maintenance: "equipmentNotif",
  specimen_mastered: "specimenNotif",
  kpi_completed: "kpiNotif",
  course_started: "courseNotif",
  enrollment_confirmed: "enrollmentNotif",
  system_alert: "systemAlertNotif",
};

async function ensureNotificationPreferences(userId: number) {
  const db = getDb();
  const existing = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  await db.insert(notificationPreferences).values({
    userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });

  const created = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return created[0]!;
}

async function getAdminRecipientIds() {
  const db = getDb();
  const allUsers = await db.select().from(users);
  return allUsers
    .filter((user) => user.role === "admin" || user.role === "super_admin")
    .map((user) => user.id);
}

function formatPlannerTimesheetMonthLabel(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "this month";
  }
  return parsed.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function formatPlannerTimesheetMonthParam(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatPlannerTimesheetDateParam(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}-${String(
      fallback.getDate()
    ).padStart(2, "0")}`;
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(
    parsed.getDate()
  ).padStart(2, "0")}`;
}

function formatPlannerTimesheetDateLabel(value: Date | string) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "this day";
  }
  return parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getDocumentMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isLevelIIIDocumentReviewMetadata(metadata: Record<string, unknown>) {
  const kind = String(metadata.kind ?? "").trim();
  if (kind !== "template" && kind !== "generated") {
    return false;
  }

  const sourceType = String(metadata.sourceType ?? "").trim().toLowerCase();
  const templateCategory = String(metadata.templateCategory ?? "").trim().toLowerCase();
  return (
    sourceType === "leveliii_request" ||
    templateCategory.includes("level iii") ||
    (Number(metadata.technicianId ?? 0) > 0 && Number(metadata.clientId ?? 0) > 0)
  );
}

export function getLevelIIIDocumentReviewReminderState(
  submittedForReviewAt: unknown,
  now = new Date()
) {
  const submittedAt = getValidDate(submittedForReviewAt);
  if (!submittedAt) {
    return null;
  }

  const waitingDays = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(submittedAt).getTime()) / DAY_IN_MS
  );
  if (waitingDays < LEVEL_III_DOCUMENT_REVIEW_REMINDER_DAYS) {
    return null;
  }

  return {
    waitingDays,
    escalated: waitingDays >= LEVEL_III_DOCUMENT_REVIEW_ESCALATION_DAYS,
    priority:
      waitingDays >= LEVEL_III_DOCUMENT_REVIEW_ESCALATION_DAYS ? ("critical" as const) : ("high" as const),
  };
}

export function getLevelIIITechnicianCertificateReviewReminderState(
  submittedForReviewAt: unknown,
  now = new Date()
) {
  const submittedAt = getValidDate(submittedForReviewAt);
  if (!submittedAt) {
    return null;
  }

  const waitingDays = Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(submittedAt).getTime()) / DAY_IN_MS
  );
  if (waitingDays < LEVEL_III_CERTIFICATE_REVIEW_REMINDER_DAYS) {
    return null;
  }

  const escalated = waitingDays >= LEVEL_III_CERTIFICATE_REVIEW_ESCALATION_DAYS;
  return {
    waitingDays,
    escalated,
    priority: (escalated ? "critical" : "high") as NotificationPriority,
  };
}

export function getLevelIIITechnicianCertificateExpiryReminderState(
  validUntil: unknown,
  now = new Date()
) {
  return getDueReminderState(validUntil, now, LEVEL_III_CERTIFICATE_EXPIRY_REMINDER_DAYS);
}

function extractPlannerTimesheetImpactOverrideNote(remarks?: string | null) {
  if (!remarks?.trim()) {
    return null;
  }

  const prefixLower = PLANNER_TIMESHEET_IMPACT_NOTE_PREFIX.toLowerCase();
  const matchingLine = remarks
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith(prefixLower));

  if (!matchingLine) {
    return null;
  }

  const note = matchingLine.slice(PLANNER_TIMESHEET_IMPACT_NOTE_PREFIX.length).trim();
  return note || null;
}

function buildPlannerTimesheetActionUrl(options: {
  monthDate: Date | string;
  userId?: number | null;
  review?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  date?: Date | string | null;
}) {
  const params = new URLSearchParams();
  params.set("timesheetMonth", formatPlannerTimesheetMonthParam(options.monthDate));
  if (options.date) {
    params.set("timesheetDate", formatPlannerTimesheetDateParam(options.date));
  }
  if (options.userId) {
    params.set("timesheetUserId", String(options.userId));
  }
  if (options.review) {
    params.set("timesheetReview", "1");
  }
  if (options.userName?.trim()) {
    params.set("timesheetUserName", options.userName.trim());
  }
  if (options.userEmail?.trim()) {
    params.set("timesheetUserEmail", options.userEmail.trim());
  }
  return `/planner?${params.toString()}`;
}

async function findExistingUnreadNotification(
  userId: number,
  payload: NotificationPayload
) {
  const db = getDb();
  const candidates = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.type, payload.type)
      )
    );

  return (
    candidates.find((notification) => {
      return (
        !notification.isRead &&
        notification.title === payload.title &&
        (notification.entityType ?? null) === (payload.entityType ?? null) &&
        (notification.entityId ?? null) === (payload.entityId ?? null) &&
        (notification.actionUrl ?? null) === (payload.actionUrl ?? null)
      );
    }) ?? null
  );
}

async function findRecentNotification(
  userId: number,
  payload: NotificationPayload,
  since: Date
) {
  const db = getDb();
  const candidates = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.type, payload.type),
        gt(notificationsTable.createdAt, since)
      )
    );

  return (
    candidates.find((notification) => {
      return (
        notification.title === payload.title &&
        (notification.entityType ?? null) === (payload.entityType ?? null) &&
        (notification.entityId ?? null) === (payload.entityId ?? null) &&
        (notification.actionUrl ?? null) === (payload.actionUrl ?? null)
      );
    }) ?? null
  );
}

async function sendNotificationEmail(
  userId: number,
  payload: NotificationPayload,
  recipientEmail: string,
  recipientName?: string | null
) {
  const appUrl = ENV.appBaseUrl.replace(/\/$/, "");
  const actionLink = payload.actionUrl
    ? new URL(payload.actionUrl, `${appUrl}/`).toString()
    : null;

  const greetingName = recipientName?.trim() || "there";
  const lines = [
    `Hello ${greetingName},`,
    "",
    payload.title,
    "",
    payload.message,
  ];

  if (actionLink) {
    lines.push("", `Open in TextPoint: ${actionLink}`);
  }

  lines.push(
    "",
    "This reminder was sent from TextPoint.",
    "You can change your notification preferences inside the app."
  );

  const sent = await sendEmail({
    to: recipientEmail,
    subject: `TextPoint: ${payload.title}`,
    text: lines.join("\n"),
    replyTo: ENV.smtpReplyTo ?? null,
  });

  if (!sent) {
    console.warn(
      `[Notifications] Email delivery skipped or failed for user ${userId}.`
    );
  }

  return sent;
}

async function notifyOwnerSafely(title: string, content: string) {
  try {
    await notifyOwner({ title, content });
  } catch (error) {
    console.warn("[Notifications] Failed to notify owner:", error);
  }
}

/**
 * Check for equipment that is due for calibration and send notifications.
 */
export async function checkEquipmentCalibrationDue() {
  const db = getDb();
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const dueEquipment = await db
    .select()
    .from(equipment)
    .where(lt(equipment.nextDueDate, sevenDaysFromNow));

  const recipientIds = await getAdminRecipientIds();

  for (const item of dueEquipment) {
    if (!item.nextDueDate) continue;

    const dueDate = new Date(item.nextDueDate);
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    const message = `Equipment "${item.name}" (${item.serialNumber}) is due for calibration in ${daysUntilDue} day(s).`;

    await notifyOwnerSafely(`Equipment Calibration Due: ${item.name}`, message);

    await broadcastNotification(recipientIds, {
      type: "equipment_maintenance",
      title: `Equipment Calibration Due: ${item.name}`,
      message,
      entityType: "equipment",
      entityId: item.id,
      actionUrl: "/equipment",
      priority: daysUntilDue <= 0 ? "critical" : daysUntilDue <= 7 ? "high" : "normal",
      metadata: {
        serialNumber: item.serialNumber,
        nextDueDate: item.nextDueDate,
        lastServiceDate: item.lastServiceDate,
      },
    });
  }
}

/**
 * Check for KPI records pending approval and send notifications.
 */
export async function checkKPIApprovalsNeeded() {
  const db = getDb();
  const pendingRecords = await db
    .select()
    .from(kpiRecords)
    .where(eq(kpiRecords.status, "Submitted"));

  if (pendingRecords.length === 0) return 0;

  const recipientIds = await getAdminRecipientIds();
  const message = `You have ${pendingRecords.length} KPI evaluation record(s) awaiting approval.`;

  await notifyOwnerSafely(
    `KPI Records Pending Approval (${pendingRecords.length})`,
    message
  );

  await broadcastNotification(recipientIds, {
    type: "kpi_completed",
    title: `KPI Records Pending Approval (${pendingRecords.length})`,
    message,
    entityType: "kpi",
    actionUrl: "/kpi",
    priority: pendingRecords.length >= 3 ? "high" : "normal",
    metadata: { pendingCount: pendingRecords.length },
  });

  return pendingRecords.length;
}

/**
 * Check for overdue calibrations and send urgent notifications.
 */
export async function checkOverdueCalibrations() {
  const db = getDb();
  const now = new Date();
  const overdueEquipment = await db
    .select()
    .from(equipment)
    .where(lt(equipment.nextDueDate, now));

  const recipientIds = await getAdminRecipientIds();

  for (const item of overdueEquipment) {
    if (!item.nextDueDate) continue;

    const dueDate = new Date(item.nextDueDate);
    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const message = `Equipment "${item.name}" (${item.serialNumber}) is ${daysOverdue} day(s) overdue for calibration.`;

    await notifyOwnerSafely(
      `URGENT: Equipment Calibration Overdue - ${item.name}`,
      message
    );

    await broadcastNotification(recipientIds, {
      type: "equipment_maintenance",
      title: `URGENT: Equipment Calibration Overdue - ${item.name}`,
      message,
      entityType: "equipment",
      entityId: item.id,
      actionUrl: "/equipment",
      priority: "critical",
      metadata: {
        serialNumber: item.serialNumber,
        nextDueDate: item.nextDueDate,
        daysOverdue,
      },
    });
  }
}

function getNotificationMetadata(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function getValidDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(value as string | number | Date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatReminderDate(value: Date) {
  return value.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getDueReminderState(
  value: unknown,
  now = new Date(),
  windowDays = DEFAULT_REMINDER_WINDOW_DAYS
) {
  const dueDate = getValidDate(value);
  if (!dueDate) return null;

  const today = startOfLocalDay(now);
  const dueDay = startOfLocalDay(dueDate);
  const daysUntilDue = Math.ceil((dueDay.getTime() - today.getTime()) / DAY_IN_MS);

  if (daysUntilDue > windowDays) return null;

  const isOverdue = daysUntilDue < 0;
  const duePhrase = isOverdue
    ? `${Math.abs(daysUntilDue)} day(s) overdue`
    : daysUntilDue === 0
      ? "due today"
      : `due in ${daysUntilDue} day(s)`;

  return {
    dueDate: dueDay,
    daysUntilDue,
    isOverdue,
    duePhrase,
    priority: (isOverdue ? "critical" : daysUntilDue <= 2 ? "high" : "normal") as NotificationPriority,
  };
}

/**
 * Check QMS items that are due soon or overdue and send in-app reminders.
 */
export async function checkQualityReminders() {
  try {
    const db = getDb();
    const [actionRows, auditRows, reviewRows, providerRows, recipientIds] =
      await Promise.all([
        db.select().from(qualityActions),
        db.select().from(qualityAudits),
        db.select().from(managementReviews),
        db.select().from(externalProviders),
        getAdminRecipientIds(),
      ]);

    if (recipientIds.length === 0) {
      return { success: true, notificationsSent: 0, errorMessage: null };
    }

    let notificationCount = 0;
    const sendReminder = async (payload: NotificationPayload) => {
      await broadcastNotification(recipientIds, {
        ...payload,
        type: "system_alert",
      });
      notificationCount++;
    };

    for (const action of actionRows) {
      if (action.status === "Closed") continue;

      const reminder = getDueReminderState(action.dueDate);
      if (!reminder) continue;

      await sendReminder({
        type: "system_alert",
        title: `Quality action attention: ${action.referenceNumber}`,
        message: `Quality Action ${action.referenceNumber} "${action.title}" is ${reminder.duePhrase}. Owner: ${action.ownerName || "Unassigned"}.`,
        entityType: "quality_action",
        entityId: action.id,
        actionUrl: `/quality?actionId=${action.id}`,
        priority: reminder.priority,
        metadata: {
          referenceNumber: action.referenceNumber,
          status: action.status,
          severity: action.severity,
          dueDate: reminder.dueDate.toISOString(),
          dueDateLabel: formatReminderDate(reminder.dueDate),
          daysUntilDue: reminder.daysUntilDue,
        },
      });
    }

    for (const audit of auditRows) {
    if (audit.status !== "Completed" && audit.status !== "Cancelled") {
      const plannedReminder = getDueReminderState(audit.plannedDate);
      if (plannedReminder) {
        await sendReminder({
          type: "system_alert",
          title: `Audit planned date attention: ${audit.referenceNumber}`,
          message: `Audit ${audit.referenceNumber} "${audit.title}" is ${plannedReminder.duePhrase}. Lead auditor: ${audit.leadAuditor || "Not assigned"}.`,
          entityType: "quality_audit",
          entityId: audit.id,
          actionUrl: `/quality?tab=audits&auditId=${audit.id}`,
          priority: plannedReminder.priority,
          metadata: {
            referenceNumber: audit.referenceNumber,
            status: audit.status,
            auditType: audit.auditType,
            dueDate: plannedReminder.dueDate.toISOString(),
            dueDateLabel: formatReminderDate(plannedReminder.dueDate),
            daysUntilDue: plannedReminder.daysUntilDue,
          },
        });
      }
    }

    if (audit.status !== "Cancelled") {
      const nextCycleReminder = getDueReminderState(audit.nextAuditDate);
      if (nextCycleReminder) {
        await sendReminder({
          type: "system_alert",
          title: `Next audit cycle attention: ${audit.referenceNumber}`,
          message: `Next audit cycle for ${audit.referenceNumber} "${audit.title}" is ${nextCycleReminder.duePhrase}.`,
          entityType: "quality_audit_next_cycle",
          entityId: audit.id,
          actionUrl: `/quality?tab=audits&auditId=${audit.id}`,
          priority: nextCycleReminder.priority,
          metadata: {
            referenceNumber: audit.referenceNumber,
            status: audit.status,
            auditType: audit.auditType,
            dueDate: nextCycleReminder.dueDate.toISOString(),
            dueDateLabel: formatReminderDate(nextCycleReminder.dueDate),
            daysUntilDue: nextCycleReminder.daysUntilDue,
          },
        });
      }
    }
  }

    for (const review of reviewRows) {
    if (
      review.status !== "Held" &&
      review.status !== "Closed" &&
      review.status !== "Cancelled"
    ) {
      const meetingReminder = getDueReminderState(review.meetingDate);
      if (meetingReminder) {
        await sendReminder({
          type: "system_alert",
          title: `Management review attention: ${review.referenceNumber}`,
          message: `Management Review ${review.referenceNumber} "${review.title}" is ${meetingReminder.duePhrase}. Chairperson: ${review.chairperson || "Not recorded"}.`,
          entityType: "management_review",
          entityId: review.id,
          actionUrl: `/quality?tab=reviews&reviewId=${review.id}`,
          priority: meetingReminder.priority,
          metadata: {
            referenceNumber: review.referenceNumber,
            status: review.status,
            dueDate: meetingReminder.dueDate.toISOString(),
            dueDateLabel: formatReminderDate(meetingReminder.dueDate),
            daysUntilDue: meetingReminder.daysUntilDue,
          },
        });
      }
    }

    if (review.status !== "Cancelled") {
      const nextReviewReminder = getDueReminderState(review.nextReviewDate);
      if (nextReviewReminder) {
        await sendReminder({
          type: "system_alert",
          title: `Next management review attention: ${review.referenceNumber}`,
          message: `Next management review cycle for ${review.referenceNumber} "${review.title}" is ${nextReviewReminder.duePhrase}.`,
          entityType: "management_review_next_cycle",
          entityId: review.id,
          actionUrl: `/quality?tab=reviews&reviewId=${review.id}`,
          priority: nextReviewReminder.priority,
          metadata: {
            referenceNumber: review.referenceNumber,
            status: review.status,
            dueDate: nextReviewReminder.dueDate.toISOString(),
            dueDateLabel: formatReminderDate(nextReviewReminder.dueDate),
            daysUntilDue: nextReviewReminder.daysUntilDue,
          },
        });
      }
    }
  }

    for (const provider of providerRows) {
    if (provider.status === "Inactive" || provider.status === "Suspended") {
      continue;
    }

    const reminder = getDueReminderState(provider.nextEvaluationDate);
    if (!reminder) continue;

    await sendReminder({
      type: "system_alert",
      title: `Provider review attention: ${provider.referenceNumber}`,
      message: `External Provider ${provider.referenceNumber} "${provider.companyName}" evaluation is ${reminder.duePhrase}. Contact: ${provider.primaryContact || provider.email || "Not recorded"}.`,
      entityType: "external_provider",
      entityId: provider.id,
      actionUrl: `/quality?tab=providers&providerId=${provider.id}`,
      priority: reminder.priority,
      metadata: {
        referenceNumber: provider.referenceNumber,
        status: provider.status,
        providerType: provider.providerType,
        dueDate: reminder.dueDate.toISOString(),
        dueDateLabel: formatReminderDate(reminder.dueDate),
        daysUntilDue: reminder.daysUntilDue,
      },
    });
  }

    return { success: true, notificationsSent: notificationCount, errorMessage: null };
  } catch (error) {
    console.error("Error checking quality reminders:", error);
    return {
      success: false,
      notificationsSent: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown reminder failure",
    };
  }
}

/**
 * Check generated document packs that were dispatched but not digitally signed.
 */
export async function checkDocumentSignatureDue() {
  const db = getDb();
  const now = new Date();
  const today = startOfLocalDay(now);
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const allDocuments = await db.select().from(documents);

  const packs = new Map<
    string,
    {
      sourceType: "student_enrollment" | "schedule";
      contextId: number;
      packType: "Learner Pack" | "Lecturer Pack";
      packLabel: string;
      packReleaseReference: string;
      distributedToName: string;
      distributedToEmail: string;
      distributionMethod: string;
      branchName: string;
      courseLabel: string;
      dueDate: Date;
      documentTitles: string[];
    }
  >();

  for (const document of allDocuments) {
    const metadata = getNotificationMetadata(document.tags);
    if (
      metadata.kind !== "generated" ||
      metadata.generatedStatus !== "Issued" ||
      !metadata.distributedAt ||
      metadata.acknowledgedAt
    ) {
      continue;
    }

    const dueDate = getValidDate(metadata.signatureDueDate);
    if (!dueDate || startOfLocalDay(dueDate) > sevenDaysFromNow) {
      continue;
    }

    const sourceType = String(metadata.sourceType || "");
    const contextId =
      sourceType === "student_enrollment"
        ? Number(metadata.enrollmentId || 0)
        : sourceType === "schedule"
          ? Number(metadata.scheduleId || 0)
          : 0;

    if (
      (sourceType !== "student_enrollment" && sourceType !== "schedule") ||
      !Number.isFinite(contextId) ||
      contextId <= 0
    ) {
      continue;
    }

    const packType =
      sourceType === "student_enrollment" ? "Learner Pack" : "Lecturer Pack";
    const packLabel =
      sourceType === "student_enrollment"
        ? String(metadata.studentName || "Learner pack").trim()
        : String(metadata.courseLabel || "Lecturer pack").trim();
    const packReleaseReference = String(metadata.packReleaseReference || "").trim();
    const key = `${sourceType}:${contextId}:${packReleaseReference || "no-release"}`;
    const existing = packs.get(key);

    if (existing) {
      if (dueDate < existing.dueDate) {
        existing.dueDate = dueDate;
      }
      existing.documentTitles.push(document.title);
      continue;
    }

    packs.set(key, {
      sourceType: sourceType as "student_enrollment" | "schedule",
      contextId,
      packType,
      packLabel,
      packReleaseReference,
      distributedToName: String(metadata.distributedToName || "").trim(),
      distributedToEmail: String(metadata.distributedToEmail || "").trim(),
      distributionMethod: String(metadata.distributionMethod || "").trim(),
      branchName: String(metadata.branchName || "").trim(),
      courseLabel: String(metadata.courseLabel || "").trim(),
      dueDate,
      documentTitles: [document.title],
    });
  }

  if (packs.size === 0) return 0;

  const recipientIds = await getAdminRecipientIds();
  let notificationCount = 0;

  for (const pack of Array.from(packs.values())) {
    const dueDay = startOfLocalDay(pack.dueDate);
    const daysUntilDue = Math.ceil(
      (dueDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)
    );
    const isOverdue = daysUntilDue < 0;
    const title = isOverdue
      ? `Document signature overdue: ${pack.packType} - ${pack.packLabel}`
      : `Document signature due soon: ${pack.packType} - ${pack.packLabel}`;
    const duePhrase = isOverdue
      ? `${Math.abs(daysUntilDue)} day(s) overdue`
      : daysUntilDue === 0
        ? "due today"
        : `due in ${daysUntilDue} day(s)`;
    const recipient = pack.distributedToName || pack.distributedToEmail || "the recipient";
    const message = `${pack.packType} ${pack.packReleaseReference || ""} for ${pack.packLabel} is ${duePhrase}. ${pack.documentTitles.length} document(s) are awaiting digital acknowledgement from ${recipient}.`;

    if (isOverdue) {
      await notifyOwnerSafely(title, message);
    }

    await broadcastNotification(recipientIds, {
      type: "system_alert",
      title,
      message,
      entityType:
        pack.sourceType === "student_enrollment"
          ? "document_student_pack"
          : "document_lecturer_pack",
      entityId: pack.contextId,
      actionUrl: "/documents",
      priority: isOverdue ? "critical" : daysUntilDue <= 2 ? "high" : "normal",
      metadata: {
        packType: pack.packType,
        packLabel: pack.packLabel,
        packReleaseReference: pack.packReleaseReference,
        dueDate: pack.dueDate.toISOString(),
        dueDateLabel: formatReminderDate(pack.dueDate),
        daysUntilDue,
        distributedToName: pack.distributedToName,
        distributedToEmail: pack.distributedToEmail,
        distributionMethod: pack.distributionMethod,
        branchName: pack.branchName,
        courseLabel: pack.courseLabel,
        documentTitles: pack.documentTitles,
      },
    });

    notificationCount++;
  }

  return notificationCount;
}

async function getPortalReminderRecipientIds(
  clientId: number,
  options: {
    sendToAssignedUsers: boolean;
    sendToInternalAdmins: boolean;
    escalationManagersOnly?: boolean;
    escalated?: boolean;
  }
) {
  const db = getDb();
  const [assignments, adminIds] = await Promise.all([
    options.sendToAssignedUsers
      ? db
          .select()
          .from(portalClientUsers)
          .where(
            and(
              eq(portalClientUsers.clientId, clientId),
              eq(portalClientUsers.receiveReminders, true)
            )
          )
      : Promise.resolve([]),
    options.sendToInternalAdmins ? getAdminRecipientIds() : Promise.resolve([]),
  ]);

  const assignmentIds = assignments
    .filter((assignment) => {
      if (!options.escalated || !options.escalationManagersOnly) {
        return true;
      }
      return assignment.accessLevel === "manager";
    })
    .map((assignment) => assignment.userId);

  return Array.from(
    new Set([...adminIds, ...assignmentIds])
  );
}

function getPortalDocumentReminderBreakdown(
  documents: Awaited<ReturnType<typeof getPortalClientDocuments>>,
  leadDays: number,
  now = new Date()
) {
  const today = startOfLocalDay(now);
  let upcomingCount = 0;
  let reviewDueCount = 0;
  let expiredCount = 0;
  let maxOverdueDays = 0;

  for (const document of documents) {
    const validUntil = getValidDate(document.validUntil);
    const reviewDate = getValidDate(document.reviewDate);

    if (validUntil) {
      const validDay = startOfLocalDay(validUntil);
      const daysUntilExpiry = Math.ceil((validDay.getTime() - today.getTime()) / DAY_IN_MS);
      if (daysUntilExpiry < 0) {
        expiredCount += 1;
        maxOverdueDays = Math.max(maxOverdueDays, Math.abs(daysUntilExpiry));
        continue;
      }

      if (daysUntilExpiry <= leadDays) {
        upcomingCount += 1;
        continue;
      }
    }

    if (reviewDate) {
      const reviewDay = startOfLocalDay(reviewDate);
      const daysUntilReview = Math.ceil((reviewDay.getTime() - today.getTime()) / DAY_IN_MS);
      if (daysUntilReview < 0) {
        reviewDueCount += 1;
        maxOverdueDays = Math.max(maxOverdueDays, Math.abs(daysUntilReview));
        continue;
      }

      if (daysUntilReview <= leadDays) {
        upcomingCount += 1;
      }
    }
  }

  return {
    upcomingCount,
    reviewDueCount,
    expiredCount,
    maxOverdueDays,
  };
}

export async function checkClientPortalReminders() {
  try {
    const db = getDb();
    const clients = await db.select().from(levelIIIClients);
    let notificationCount = 0;

    for (const client of clients) {
    const reminderSettings = await getPortalClientReminderSettings(client.id);

    const [requirementMatrix, clientDocuments] = await Promise.all([
      getPortalRequirementMatrixForClient(client.id),
      getPortalClientDocuments(client.id),
    ]);

    if (reminderSettings.complianceEnabled) {
      const expiredRows = requirementMatrix.filter((row) => row.status === "expired");
      const expiredCount = expiredRows.length;
      const expiringCount = requirementMatrix.filter((row) => row.status === "expiring").length;
      const pendingReviewCount = reminderSettings.includePendingReview
        ? requirementMatrix.filter((row) => row.status === "pending_review").length
        : 0;
      const missingRequiredCount = reminderSettings.includeMissingRequired
        ? requirementMatrix.filter((row) => row.status === "missing" && row.isRequired).length
        : 0;
      const maxExpiredDays = expiredRows.reduce((maxDays, row) => {
        const validUntil = getValidDate(row.validUntil);
        if (!validUntil) return maxDays;
        const daysOverdue = Math.abs(
          Math.ceil(
            (startOfLocalDay(new Date()).getTime() - startOfLocalDay(validUntil).getTime()) /
              DAY_IN_MS
          )
        );
        return Math.max(maxDays, daysOverdue);
      }, 0);
      const escalated =
        expiredCount > 0 &&
        maxExpiredDays >= reminderSettings.complianceEscalationDays;
      const complianceRecipients = await getPortalReminderRecipientIds(client.id, {
        sendToAssignedUsers: reminderSettings.sendToAssignedUsers,
        sendToInternalAdmins: reminderSettings.sendToInternalAdmins,
        escalationManagersOnly: reminderSettings.escalationManagersOnly,
        escalated,
      });

      if (
        complianceRecipients.length > 0 &&
        (expiredCount > 0 ||
          expiringCount > 0 ||
          pendingReviewCount > 0 ||
          missingRequiredCount > 0)
      ) {
        const messageParts = [
          expiredCount > 0 ? `${expiredCount} expired` : null,
          expiringCount > 0 ? `${expiringCount} expiring soon` : null,
          pendingReviewCount > 0 ? `${pendingReviewCount} pending review` : null,
          missingRequiredCount > 0 ? `${missingRequiredCount} missing required` : null,
        ].filter(Boolean);

        await broadcastNotification(complianceRecipients, {
          type: "system_alert",
          title: `${escalated ? "Escalated" : "Client portal"} compliance attention: ${client.companyName}`,
          message: `${client.companyName} has ${messageParts.join(", ")} technician compliance record(s) needing attention.${escalated ? ` The oldest expired item is ${maxExpiredDays} day(s) overdue.` : ""}`,
          entityType: "client_portal_compliance",
          entityId: client.id,
          actionUrl: `/client-portal?clientId=${client.id}&focus=compliance`,
          priority: escalated
            ? "critical"
            : expiredCount > 0
              ? "high"
              : expiringCount > 0 || pendingReviewCount > 0
                ? "high"
                : "normal",
          metadata: {
            clientId: client.id,
            clientName: client.companyName,
            expiredCount,
            expiringCount,
            pendingReviewCount,
            missingRequiredCount,
            escalated,
            maxExpiredDays,
          },
        });
        notificationCount++;
      }
    }

    if (reminderSettings.documentEnabled) {
      const {
        expiredCount: documentExpiredCount,
        reviewDueCount: documentReviewDueCount,
        upcomingCount: documentUpcomingCount,
        maxOverdueDays: documentMaxOverdueDays,
      } = getPortalDocumentReminderBreakdown(
        clientDocuments,
        reminderSettings.documentLeadDays
      );
      const escalated =
        (documentExpiredCount > 0 || documentReviewDueCount > 0) &&
        documentMaxOverdueDays >= reminderSettings.documentEscalationDays;
      const documentRecipients = await getPortalReminderRecipientIds(client.id, {
        sendToAssignedUsers: reminderSettings.sendToAssignedUsers,
        sendToInternalAdmins: reminderSettings.sendToInternalAdmins,
        escalationManagersOnly: reminderSettings.escalationManagersOnly,
        escalated,
      });

      if (
        documentRecipients.length > 0 &&
        (documentExpiredCount > 0 ||
          documentReviewDueCount > 0 ||
          documentUpcomingCount > 0)
      ) {
        const documentMessageParts = [
          documentExpiredCount > 0 ? `${documentExpiredCount} expired` : null,
          documentReviewDueCount > 0 ? `${documentReviewDueCount} review due` : null,
          documentUpcomingCount > 0
            ? `${documentUpcomingCount} due within ${reminderSettings.documentLeadDays} day(s)`
            : null,
        ].filter(Boolean);

        await broadcastNotification(documentRecipients, {
          type: "system_alert",
          title: `${escalated ? "Escalated" : "Client portal"} documents attention: ${client.companyName}`,
          message: `${client.companyName} has ${documentMessageParts.join(", ")} client document(s) needing attention.${escalated ? ` The oldest overdue document item is ${documentMaxOverdueDays} day(s) overdue.` : ""}`,
          entityType: "client_portal_documents",
          entityId: client.id,
          actionUrl: `/client-portal?clientId=${client.id}&focus=documents`,
          priority: escalated
            ? "critical"
            : documentExpiredCount > 0 || documentReviewDueCount > 0
              ? "high"
              : "normal",
          metadata: {
            clientId: client.id,
            clientName: client.companyName,
            documentExpiredCount,
            documentReviewDueCount,
            documentUpcomingCount,
            documentLeadDays: reminderSettings.documentLeadDays,
            escalated,
            documentMaxOverdueDays,
          },
        });
        notificationCount++;
      }
    }
    }

    return { success: true, notificationsSent: notificationCount, errorMessage: null };
  } catch (error) {
    console.error("Error checking client portal reminders:", error);
    return {
      success: false,
      notificationsSent: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown reminder failure",
    };
  }
}

export async function getUnreadNotifications(userId: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId));

  return rows
    .sort((left, right) => {
      if (left.isRead !== right.isRead) {
        return Number(left.isRead) - Number(right.isRead);
      }

      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    })
    .slice(0, 50);
}

export async function markNotificationAsRead(
  notificationId: number,
  userId: number
) {
  const db = getDb();
  await db
    .update(notificationsTable)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.userId, userId)
      )
    );

  return { success: true };
}

export async function markAllNotificationsAsRead(userId: number) {
  const db = getDb();
  await db
    .update(notificationsTable)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.isRead, false)
      )
    );

  return { success: true };
}

export async function deleteNotification(notificationId: number, userId: number) {
  const db = getDb();
  await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, notificationId),
        eq(notificationsTable.userId, userId)
      )
    );

  return { success: true };
}

export async function getNotificationPreferences(userId: number) {
  return ensureNotificationPreferences(userId);
}

export async function updateNotificationPreferences(
  userId: number,
  preferences: Partial<NotificationPreferencePayload>
) {
  const db = getDb();
  const existing = await ensureNotificationPreferences(userId);

  const nextValues: Partial<NotificationPreferencePayload> = {};
  const keys = Object.keys(
    DEFAULT_NOTIFICATION_PREFERENCES
  ) as Array<keyof NotificationPreferencePayload>;

  for (const key of keys) {
    if (key in preferences && typeof preferences[key] === "boolean") {
      nextValues[key] = preferences[key];
    }
  }

  await db
    .update(notificationPreferences)
    .set(nextValues)
    .where(eq(notificationPreferences.userId, userId));

  const updated = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return updated[0] ?? existing;
}

export async function createNotification(
  userId: number,
  payload: NotificationPayload
) {
  const db = getDb();
  const preferences = await ensureNotificationPreferences(userId);
  const enabled = preferences[NOTIFICATION_PREFERENCE_MAP[payload.type]];

  if (!enabled) {
    return { success: true, skipped: true };
  }

  const existing = await findExistingUnreadNotification(userId, payload);

  if (existing) {
    await db
      .update(notificationsTable)
      .set({
        message: payload.message,
        actionUrl: payload.actionUrl ?? null,
        metadata: payload.metadata ?? null,
        relatedUserId: payload.relatedUserId ?? null,
        priority: payload.priority ?? "normal",
      })
      .where(eq(notificationsTable.id, existing.id));

    return { success: true, id: existing.id, deduped: true };
  }

  const recentNotification = await findRecentNotification(
    userId,
    payload,
    new Date(Date.now() - NOTIFICATION_EMAIL_COOLDOWN_MS)
  );

  await db.insert(notificationsTable).values({
    userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entityType: payload.entityType ?? null,
    entityId: payload.entityId ?? null,
    relatedUserId: payload.relatedUserId ?? null,
    isRead: false,
    actionUrl: payload.actionUrl ?? null,
    metadata: payload.metadata ?? null,
    priority: payload.priority ?? "normal",
    readAt: null,
  });

  if (!recentNotification && preferences.emailNotifications) {
    const recipient = await db
      .select({
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const recipientEmail = recipient[0]?.email?.trim();

    if (recipientEmail) {
      await sendNotificationEmail(
        userId,
        payload,
        recipientEmail,
        recipient[0]?.name
      );
    }
  }

  return { success: true };
}

export async function broadcastNotification(
  userIds: number[],
  payload: NotificationPayload
) {
  return Promise.all(
    Array.from(new Set(userIds)).map((userId) => createNotification(userId, payload))
  );
}

export async function notifyPortalApprovalSubmitted(data: {
  requestId: number;
  clientId: number;
  summary: string;
  submittedByUserId: number;
  submittedByName?: string | null;
}) {
  const recipientIds = (await getAdminRecipientIds()).filter(
    (userId) => userId !== data.submittedByUserId
  );
  if (recipientIds.length === 0) {
    return { success: true };
  }

  const requester = data.submittedByName?.trim() || `User ${data.submittedByUserId}`;
  return broadcastNotification(recipientIds, {
    type: "system_alert",
    title: "Client portal submission awaiting review",
    message: `${data.summary} was submitted by ${requester} and is waiting for internal approval.`,
    entityType: "client_portal_approval",
    entityId: data.requestId,
    actionUrl: `/client-portal?clientId=${data.clientId}&focus=approvals`,
    priority: "high",
    metadata: {
      clientId: data.clientId,
      requestId: data.requestId,
      submittedByUserId: data.submittedByUserId,
    },
  });
}

export async function notifyPortalApprovalReviewed(data: {
  requestId: number;
  clientId: number;
  submittedByUserId: number;
  decision: "approved" | "rejected";
  summary: string;
  reviewedByName?: string | null;
  reviewNotes?: string | null;
}) {
  if (!data.submittedByUserId) {
    return { success: true };
  }

  const reviewer = data.reviewedByName?.trim() || "an internal reviewer";
  const statusLabel = data.decision === "approved" ? "approved" : "rejected";
  const noteSuffix =
    data.reviewNotes?.trim()
      ? ` Review notes: ${data.reviewNotes.trim()}`
      : "";

  return broadcastNotification([data.submittedByUserId], {
    type: "system_alert",
    title:
      data.decision === "approved"
        ? "Client portal submission approved"
        : "Client portal submission needs changes",
    message: `${data.summary} was ${statusLabel} by ${reviewer}.${noteSuffix}`,
    entityType: "client_portal_approval",
    entityId: data.requestId,
    actionUrl: `/client-portal?clientId=${data.clientId}&focus=approvals`,
    priority: data.decision === "approved" ? "normal" : "high",
    metadata: {
      clientId: data.clientId,
      requestId: data.requestId,
      decision: data.decision,
    },
  });
}

export async function notifyLevelIIITechnicianCertificateSignOffChanged(data: {
  certificateId: number;
  certificateNumber?: string | null;
  technicianName?: string | null;
  action: "submit" | "approve" | "reject" | "reopen";
  actorUserId: number;
  actorName?: string | null;
  note?: string | null;
  approvalRequestedBy?: number | null;
  approvedBy?: number | null;
  issuedBy?: number | null;
}) {
  const certificateLabel = data.certificateNumber?.trim() || `Certificate #${data.certificateId}`;
  const technicianLabel = data.technicianName?.trim() || "the selected technician";
  const actorLabel = data.actorName?.trim() || `User ${data.actorUserId}`;
  const noteSuffix = data.note?.trim() ? ` Note: ${data.note.trim()}` : "";
  const actionUrl = `/level-iii?certificateId=${data.certificateId}`;

  if (data.action === "submit") {
    const recipientIds = (await getAdminRecipientIds()).filter(
      (userId) => userId !== data.actorUserId
    );
    if (recipientIds.length === 0) {
      return { success: true };
    }

    return broadcastNotification(recipientIds, {
      type: "system_alert",
      title: "Level III certificate awaiting sign-off",
      message: `${certificateLabel} for ${technicianLabel} was submitted by ${actorLabel} and is waiting for review.${noteSuffix}`,
      entityType: "levelIII_technician_certificate",
      entityId: data.certificateId,
      actionUrl,
      priority: "high",
      metadata: {
        action: data.action,
        certificateId: data.certificateId,
        certificateNumber: certificateLabel,
        technicianName: technicianLabel,
      },
      relatedUserId: data.actorUserId,
    });
  }

  const recipientIds = Array.from(
    new Set(
      [data.approvalRequestedBy, data.approvedBy, data.issuedBy]
        .filter((value): value is number => Number.isInteger(value) && Number(value) > 0)
        .filter((userId) => userId !== data.actorUserId)
    )
  );

  if (recipientIds.length === 0) {
    return { success: true };
  }

  const titleByAction = {
    approve: "Level III certificate approved",
    reject: "Level III certificate rejected",
    reopen: "Level III certificate reopened",
  } as const;

  const messageByAction = {
    approve: `${certificateLabel} for ${technicianLabel} was approved by ${actorLabel}.${noteSuffix}`,
    reject: `${certificateLabel} for ${technicianLabel} was rejected by ${actorLabel}.${noteSuffix}`,
    reopen: `${certificateLabel} for ${technicianLabel} was reopened by ${actorLabel}.${noteSuffix}`,
  } as const;

  return broadcastNotification(recipientIds, {
    type: "system_alert",
    title: titleByAction[data.action],
    message: messageByAction[data.action],
    entityType: "levelIII_technician_certificate",
    entityId: data.certificateId,
    actionUrl,
    priority: data.action === "reject" ? "high" : "normal",
    metadata: {
      action: data.action,
      certificateId: data.certificateId,
      certificateNumber: certificateLabel,
      technicianName: technicianLabel,
    },
    relatedUserId: data.actorUserId,
  });
}

export async function notifyLevelIIIDocumentReviewChanged(data: {
  documentId: number;
  documentTitle: string;
  action: "submit" | "approve" | "reject";
  actorUserId: number;
  actorName?: string | null;
  technicianName?: string | null;
  submittedByUserId?: number | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const metadata = data.metadata ?? null;
  if (metadata && !isLevelIIIDocumentReviewMetadata(metadata)) {
    return { success: true, skipped: true };
  }

  const documentLabel = data.documentTitle.trim() || `Document #${data.documentId}`;
  const actorLabel = data.actorName?.trim() || `User ${data.actorUserId}`;
  const technicianSuffix = data.technicianName?.trim() ? ` for ${data.technicianName.trim()}` : "";
  const noteSuffix = data.note?.trim() ? ` Note: ${data.note.trim()}` : "";
  const actionUrl = `/documents?documentId=${data.documentId}`;

  if (data.action === "submit") {
    const recipientIds = (await getAdminRecipientIds()).filter((userId) => userId !== data.actorUserId);
    if (recipientIds.length === 0) {
      return { success: true };
    }

    return broadcastNotification(recipientIds, {
      type: "system_alert",
      title: "Level III document awaiting review",
      message: `${documentLabel}${technicianSuffix} was submitted by ${actorLabel} and is waiting for review.${noteSuffix}`,
      entityType: "levelIII_document_review",
      entityId: data.documentId,
      actionUrl,
      priority: "high",
      metadata: {
        action: data.action,
        documentId: data.documentId,
        documentTitle: documentLabel,
        technicianName: data.technicianName ?? null,
      },
      relatedUserId: data.actorUserId,
    });
  }

  const recipientIds = Array.from(
    new Set([data.submittedByUserId].filter((value): value is number => Number(value) > 0))
  ).filter((userId) => userId !== data.actorUserId);
  if (recipientIds.length === 0) {
    return { success: true };
  }

  return broadcastNotification(recipientIds, {
    type: "system_alert",
    title:
      data.action === "approve"
        ? "Level III document approved"
        : "Level III document rejected",
    message:
      data.action === "approve"
        ? `${documentLabel}${technicianSuffix} was approved by ${actorLabel}.${noteSuffix}`
        : `${documentLabel}${technicianSuffix} was rejected by ${actorLabel}.${noteSuffix}`,
    entityType: "levelIII_document_review",
    entityId: data.documentId,
    actionUrl,
    priority: data.action === "approve" ? "normal" : "high",
    metadata: {
      action: data.action,
      documentId: data.documentId,
      documentTitle: documentLabel,
      technicianName: data.technicianName ?? null,
    },
    relatedUserId: data.actorUserId,
  });
}

export async function checkLevelIIIDocumentReviewReminders() {
  try {
    const db = getDb();
    const allDocuments = await db.select().from(documents);
    let notificationCount = 0;

    for (const document of allDocuments) {
      const metadata = getDocumentMetadata(document.tags);
      if (!isLevelIIIDocumentReviewMetadata(metadata)) {
        continue;
      }
      if (String(metadata.approvalStatus ?? "").trim() !== "In Review") {
        continue;
      }

      const reminderState = getLevelIIIDocumentReviewReminderState(metadata.submittedForReviewAt);
      if (!reminderState) {
        continue;
      }

      const submittedByUserId = Number(metadata.submittedForReviewByUserId ?? 0) || null;
      const recipientIds = (await getAdminRecipientIds()).filter((userId) => userId !== submittedByUserId);
      if (recipientIds.length === 0) {
        continue;
      }

      const technicianSuffix = String(metadata.technicianName ?? "").trim()
        ? ` for ${String(metadata.technicianName).trim()}`
        : "";

      await broadcastNotification(recipientIds, {
        type: "system_alert",
        title: reminderState.escalated
          ? "Escalated Level III document review queue"
          : "Level III document still waiting for review",
        message: `${document.title}${technicianSuffix} has been waiting ${reminderState.waitingDays} day(s) for internal review.`,
        entityType: "levelIII_document_review",
        entityId: document.id,
        actionUrl: `/documents?documentId=${document.id}`,
        priority: reminderState.priority,
        metadata: {
          documentId: document.id,
          documentTitle: document.title,
          technicianName: metadata.technicianName ?? null,
          waitingDays: reminderState.waitingDays,
          escalated: reminderState.escalated,
        },
        relatedUserId: submittedByUserId,
      });
      notificationCount += 1;
    }

    return { success: true, notificationsSent: notificationCount, errorMessage: null };
  } catch (error) {
    console.error("Error checking Level III document review reminders:", error);
    return {
      success: false,
      notificationsSent: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown reminder failure",
    };
  }
}

export async function checkLevelIIITechnicianCertificateReminders() {
  try {
    const [certificates, technicians] = await Promise.all([
      getAllLevelIIITechnicianCertificates(),
      getAllLevelIIITechnicians(),
    ]);
    const technicianById = new Map(technicians.map((technician) => [technician.id, technician]));
    const adminRecipientIds = await getAdminRecipientIds();
    let notificationCount = 0;

    for (const certificate of certificates) {
      const certificateLabel = certificate.certificateNumber?.trim() || `Certificate #${certificate.id}`;
      const technicianLabel =
        technicianById.get(certificate.technicianId)?.name?.trim() || "the selected technician";

      if (String(certificate.approvalStatus ?? "").trim() === "in_review") {
        const reminderState = getLevelIIITechnicianCertificateReviewReminderState(
          certificate.approvalRequestedAt
        );
        if (reminderState) {
          const submittedByUserId = Number(certificate.approvalRequestedBy ?? 0) || null;
          const recipientIds = adminRecipientIds.filter((userId) => userId !== submittedByUserId);
          if (recipientIds.length > 0) {
            await broadcastNotification(recipientIds, {
              type: "system_alert",
              title: reminderState.escalated
                ? "Escalated Level III certificate sign-off queue"
                : "Level III certificate still waiting for sign-off",
              message: `${certificateLabel} for ${technicianLabel} has been waiting ${reminderState.waitingDays} day(s) for internal sign-off.`,
              entityType: "levelIII_technician_certificate",
              entityId: certificate.id,
              actionUrl: `/level-iii?certificateId=${certificate.id}`,
              priority: reminderState.priority,
              metadata: {
                certificateId: certificate.id,
                certificateNumber: certificateLabel,
                technicianName: technicianLabel,
                waitingDays: reminderState.waitingDays,
                escalated: reminderState.escalated,
                reminderType: "certificate_signoff_review",
              },
              relatedUserId: submittedByUserId,
            });
            notificationCount += 1;
          }
        }
      }

      if (String(certificate.status ?? "").trim() === "Active") {
        const dueState = getLevelIIITechnicianCertificateExpiryReminderState(certificate.validUntil);
        if (!dueState) {
          continue;
        }
        const recipientIds = Array.from(
          new Set(
            [certificate.issuedBy]
              .filter((value): value is number => Number.isInteger(value) && Number(value) > 0)
              .concat(adminRecipientIds)
          )
        );
        if (recipientIds.length === 0) {
          continue;
        }

        await broadcastNotification(recipientIds, {
          type: "system_alert",
          title: dueState.isOverdue
            ? "Level III certificate expired"
            : "Level III certificate nearing expiry",
          message: `${certificateLabel} for ${technicianLabel} is ${dueState.duePhrase}. Valid until ${formatReminderDate(dueState.dueDate)}.`,
          entityType: "levelIII_technician_certificate",
          entityId: certificate.id,
          actionUrl: `/level-iii?certificateId=${certificate.id}`,
          priority: dueState.priority,
          metadata: {
            certificateId: certificate.id,
            certificateNumber: certificateLabel,
            technicianName: technicianLabel,
            validUntil: certificate.validUntil,
            duePhrase: dueState.duePhrase,
            daysUntilDue: dueState.daysUntilDue,
            reminderType: "certificate_expiry",
          },
          relatedUserId: certificate.issuedBy ?? null,
        });
        notificationCount += 1;
      }
    }

    return { success: true, notificationsSent: notificationCount, errorMessage: null };
  } catch (error) {
    console.error("Error checking Level III technician certificate reminders:", error);
    return {
      success: false,
      notificationsSent: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown reminder failure",
    };
  }
}

export async function checkPlannerTimesheetReminders() {
  try {
    const db = getDb();
    const now = new Date();
    const reviewCutoff = new Date(
      now.getTime() - PLANNER_TIMESHEET_REVIEW_REMINDER_DAYS * DAY_IN_MS
    );
    const returnCutoff = new Date(
      now.getTime() - PLANNER_TIMESHEET_RETURN_REMINDER_DAYS * DAY_IN_MS
    );
    const overrideReviewCutoff = new Date(
      now.getTime() - PLANNER_TIMESHEET_OVERRIDE_REVIEW_REMINDER_DAYS * DAY_IN_MS
    );
    const statuses = await db.select().from(plannerTimesheetMonthStatuses);
    const timesheetEntries = await db.select().from(plannerTimesheetEntries);
    const overrideReviews = await db.select().from(plannerTimesheetLeaveOverrideReviews);
    if (statuses.length === 0) {
      // keep processing override reminders even when month statuses do not exist
    }

    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((user) => [user.id, user]));
    const adminRecipientIds = await getAdminRecipientIds();
    const overrideReviewKeys = new Set(
      overrideReviews.map(
        (row) =>
          `${row.userId}:${new Date(row.entryDate).getFullYear()}-${String(
            new Date(row.entryDate).getMonth() + 1
          ).padStart(2, "0")}-${String(new Date(row.entryDate).getDate()).padStart(2, "0")}`
      )
    );
    let notificationCount = 0;

    for (const status of statuses) {
      const owner = userMap.get(status.userId);
      const ownerName =
        owner?.name?.trim() || owner?.email?.trim() || `User ${status.userId}`;
      const ownerEmail = owner?.email?.trim() || null;
      const monthLabel = formatPlannerTimesheetMonthLabel(status.monthDate);

      if (status.status === "submitted" && status.submittedAt) {
        const submittedAt = new Date(status.submittedAt);
        if (!Number.isNaN(submittedAt.getTime()) && submittedAt <= reviewCutoff) {
          const recipientIds = adminRecipientIds.filter((userId) => userId !== status.userId);
          if (recipientIds.length > 0) {
            await broadcastNotification(recipientIds, {
              type: "system_alert",
              title: "Timesheet ready for review",
              message: `${ownerName}'s ${monthLabel} timesheet is still waiting for internal review.`,
              entityType: "plannerTimesheetMonth",
              entityId: status.id,
              actionUrl: buildPlannerTimesheetActionUrl({
                monthDate: status.monthDate,
                userId: status.userId,
                review: true,
                userName: ownerName,
                userEmail: ownerEmail,
              }),
              priority: "high",
              relatedUserId: status.userId,
            });
            notificationCount += 1;
          }
        }
      }

      if (
        status.status === "open" &&
        status.reviewedAt &&
        status.reviewedByUserId &&
        new Date(status.reviewedAt) <= returnCutoff
      ) {
        await createNotification(status.userId, {
          type: "system_alert",
          title: "Timesheet returned for changes",
          message: `${monthLabel} is still open after being returned for changes${status.reviewNote?.trim() ? `: ${status.reviewNote.trim()}` : "."}`,
          entityType: "plannerTimesheetMonth",
          entityId: status.id,
          actionUrl: buildPlannerTimesheetActionUrl({
            monthDate: status.monthDate,
          }),
          priority: "high",
          relatedUserId: status.reviewedByUserId,
        });
        notificationCount += 1;
      }
    }

    for (const entry of timesheetEntries) {
      const overrideNote = extractPlannerTimesheetImpactOverrideNote(entry.remarks);
      if (!overrideNote) {
        continue;
      }

      const entryDate = new Date(entry.entryDate);
      const loggedAt = new Date(entry.updatedAt ?? entry.createdAt ?? entry.entryDate);
      if (
        Number.isNaN(entryDate.getTime()) ||
        Number.isNaN(loggedAt.getTime()) ||
        loggedAt > overrideReviewCutoff
      ) {
        continue;
      }

      const entryDateKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(entryDate.getDate()).padStart(2, "0")}`;
      if (overrideReviewKeys.has(`${entry.userId}:${entryDateKey}`)) {
        continue;
      }

      const owner = userMap.get(entry.userId);
      const ownerName = owner?.name?.trim() || owner?.email?.trim() || `User ${entry.userId}`;
      const ownerEmail = owner?.email?.trim() || null;
      const recipientIds = adminRecipientIds.filter((userId) => userId !== entry.userId);
      if (recipientIds.length === 0) {
        continue;
      }

      await broadcastNotification(recipientIds, {
        type: "system_alert",
        title: "Leave override pending review",
        message: `${ownerName}'s leave override on ${formatPlannerTimesheetDateLabel(entryDate)} is still waiting for admin review.`,
        entityType: "plannerTimesheetLeaveOverride",
        entityId: entry.id,
        actionUrl: buildPlannerTimesheetActionUrl({
          monthDate: entryDate,
          date: entryDate,
          userId: entry.userId,
          review: true,
          userName: ownerName,
          userEmail: ownerEmail,
        }),
        priority: "high",
        relatedUserId: entry.userId,
      });
      notificationCount += 1;
    }

    return { success: true, notificationsSent: notificationCount, errorMessage: null };
  } catch (error) {
    console.error("Error checking planner timesheet reminders:", error);
    return {
      success: false,
      notificationsSent: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown reminder failure",
    };
  }
}

export async function isNotificationEnabled(
  userId: number,
  type: NotificationType
) {
  const preferences = await ensureNotificationPreferences(userId);
  const preferenceKey = NOTIFICATION_PREFERENCE_MAP[type];
  return preferences[preferenceKey];
}

/**
 * Check for equipment that needs escalation (14+ days overdue).
 */
export async function checkEquipmentEscalation() {
  try {
    const db = getDb();
    const now = new Date();
    const overdueEquipment = await db
      .select()
      .from(equipment)
      .where(
        and(
          lt(equipment.nextDueDate, now),
          eq(equipment.escalationLevel, 0),
          eq(equipment.status, "Active")
        )
      );

    const recipientIds = await getAdminRecipientIds();
    let escalatedCount = 0;

    for (const item of overdueEquipment) {
      const daysOverdue = Math.floor(
        (now.getTime() -
          (item.nextDueDate
            ? new Date(item.nextDueDate).getTime()
            : now.getTime())) /
          (24 * 60 * 60 * 1000)
      );

      if (daysOverdue < 14) continue;

      await db
        .update(equipment)
        .set({
          escalationLevel: 2,
          lastEscalationDate: now,
        })
        .where(eq(equipment.id, item.id));

      const title = `URGENT: Equipment ${item.serialNumber} Escalated`;
      const message = `Equipment "${item.name}" (${item.serialNumber}) is ${daysOverdue} day(s) overdue for calibration.`;

      await notifyOwnerSafely(title, message);
      await broadcastNotification(recipientIds, {
        type: "equipment_maintenance",
        title,
        message,
        entityType: "equipment",
        entityId: item.id,
        actionUrl: "/equipment",
        priority: "critical",
        metadata: {
          serialNumber: item.serialNumber,
          daysOverdue,
          escalationLevel: 2,
        },
      });

      escalatedCount++;
    }

    return escalatedCount;
  } catch (error) {
    console.error("Error checking equipment escalation:", error);
    return 0;
  }
}

export async function getEquipmentEscalationHistory(equipmentId: number) {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.entityType, "equipment"),
          eq(notificationsTable.entityId, equipmentId)
        )
      );

    return rows.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error getting escalation history:", error);
    return [];
  }
}

export async function resetEquipmentEscalation(equipmentId: number) {
  try {
    const db = getDb();

    await db
      .update(equipment)
      .set({
        escalationLevel: 0,
        lastEscalationDate: null,
      })
      .where(eq(equipment.id, equipmentId));

    return true;
  } catch (error) {
    console.error("Error resetting escalation:", error);
    return false;
  }
}
