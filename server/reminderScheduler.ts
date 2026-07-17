import { logAuditEvent } from "./audit";
import { ENV } from "./_core/env";
import {
  checkClientPortalReminders,
  checkLevelIIIDocumentReviewReminders,
  checkLevelIIITechnicianCertificateReminders,
  checkPlannerTimesheetReminders,
  checkQualityReminders,
} from "./notifications";

const SYSTEM_SCHEDULER_USER_ID = 0;
const MINIMUM_INTERVAL_MINUTES = 5;

type ReminderSweepResult = {
  success: boolean;
  notificationsSent: number;
  errorMessage: string | null;
};

type ReminderSweep = {
  entityType: string;
  label: string;
  run: () => Promise<ReminderSweepResult>;
};

const REMINDER_SWEEPS: ReminderSweep[] = [
  {
    entityType: "quality_reminder_sweep",
    label: "quality reminders",
    run: checkQualityReminders,
  },
  {
    entityType: "client_portal_reminder_sweep",
    label: "client portal reminders",
    run: checkClientPortalReminders,
  },
  {
    entityType: "levelIII_document_review_reminder_sweep",
    label: "Level III document review reminders",
    run: checkLevelIIIDocumentReviewReminders,
  },
  {
    entityType: "levelIII_certificate_reminder_sweep",
    label: "Level III certificate reminders",
    run: checkLevelIIITechnicianCertificateReminders,
  },
  {
    entityType: "planner_timesheet_reminder_sweep",
    label: "planner timesheet reminders",
    run: checkPlannerTimesheetReminders,
  },
];

async function runReminderSweep(sweep: ReminderSweep) {
  const result = await sweep.run();
  await logAuditEvent(
    SYSTEM_SCHEDULER_USER_ID,
    "UPDATE",
    sweep.entityType,
    0,
    {
      notificationsSent: result.notificationsSent,
      success: result.success,
      triggerSource: "scheduled",
      errorMessage: result.errorMessage,
    },
    undefined,
    "system:reminder-scheduler",
    result.success ? "Success" : "Failed",
    result.errorMessage ?? undefined
  );

  if (!result.success) {
    console.error(`[ReminderScheduler] ${sweep.label} failed: ${result.errorMessage ?? "Unknown error"}`);
  }

  return result;
}

export function startReminderScheduler() {
  if (!ENV.reminderSchedulerEnabled) {
    console.log("[ReminderScheduler] Disabled.");
    return () => {};
  }

  const intervalMinutes = Math.max(
    MINIMUM_INTERVAL_MINUTES,
    Math.floor(ENV.reminderSchedulerIntervalMinutes)
  );
  const intervalMs = intervalMinutes * 60 * 1000;
  let isRunning = false;

  const runAllSweeps = async () => {
    if (isRunning) {
      console.log("[ReminderScheduler] Previous cycle still running. Skipping overlap.");
      return;
    }

    isRunning = true;
    try {
      for (const sweep of REMINDER_SWEEPS) {
        await runReminderSweep(sweep);
      }
    } finally {
      isRunning = false;
    }
  };

  if (ENV.reminderSchedulerRunOnBoot) {
    void runAllSweeps();
  }

  const timer = setInterval(() => {
    void runAllSweeps();
  }, intervalMs);

  console.log(
    `[ReminderScheduler] Enabled. Interval=${intervalMinutes} minute(s). RunOnBoot=${ENV.reminderSchedulerRunOnBoot}.`
  );

  return () => {
    clearInterval(timer);
  };
}
