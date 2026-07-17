import { createNotification, broadcastNotification, isNotificationEnabled } from "./notifications";

/**
 * Event trigger for when a student is added
 */
export async function triggerStudentAdded(studentId: number, studentName: string, addedByUserId: number) {
  try {
    await createNotification(addedByUserId, {
      type: "student_added",
      title: "New Student Added",
      message: `${studentName} has been added to the system`,
      entityType: "student",
      entityId: studentId,
      actionUrl: `/students`,
      priority: "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger student added notification:", error);
  }
}

/**
 * Event trigger for when a lead status changes
 */
export async function triggerLeadStatusChanged(
  leadId: number,
  leadName: string,
  oldStatus: string,
  newStatus: string,
  changedByUserId: number
) {
  try {
    const enabled = await isNotificationEnabled(changedByUserId, "lead_status_changed");
    if (!enabled) return;

    await createNotification(changedByUserId, {
      type: "lead_status_changed",
      title: "Lead Status Updated",
      message: `${leadName} status changed from ${oldStatus} to ${newStatus}`,
      entityType: "lead",
      entityId: leadId,
      actionUrl: `/leads`,
      priority: newStatus === "Closed Lost" ? "high" : "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger lead status changed notification:", error);
  }
}

/**
 * Event trigger for when attendance is marked
 */
export async function triggerAttendanceMarked(
  studentId: number,
  studentName: string,
  courseScheduleName: string,
  markedByUserId: number
) {
  try {
    const enabled = await isNotificationEnabled(markedByUserId, "attendance_marked");
    if (!enabled) return;

    await createNotification(markedByUserId, {
      type: "attendance_marked",
      title: "Attendance Recorded",
      message: `Attendance marked for ${studentName} in ${courseScheduleName}`,
      entityType: "attendance",
      entityId: studentId,
      actionUrl: `/attendance`,
      priority: "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger attendance marked notification:", error);
  }
}

/**
 * Event trigger for equipment maintenance due
 */
export async function triggerEquipmentMaintenance(
  equipmentId: number,
  equipmentName: string,
  maintenanceType: string,
  dueDate: Date,
  userId: number
) {
  try {
    const enabled = await isNotificationEnabled(userId, "equipment_maintenance");
    if (!enabled) return;

    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const priority = daysUntilDue <= 7 ? "high" : daysUntilDue <= 14 ? "normal" : "low";

    await createNotification(userId, {
      type: "equipment_maintenance",
      title: "Equipment Maintenance Due",
      message: `${equipmentName} requires ${maintenanceType} in ${daysUntilDue} days`,
      entityType: "equipment",
      entityId: equipmentId,
      actionUrl: `/equipment`,
      priority,
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger equipment maintenance notification:", error);
  }
}

/**
 * Event trigger for specimen mastered
 */
export async function triggerSpecimenMastered(
  specimenId: number,
  specimenName: string,
  masteredByUserId: number
) {
  try {
    const enabled = await isNotificationEnabled(masteredByUserId, "specimen_mastered");
    if (!enabled) return;

    await createNotification(masteredByUserId, {
      type: "specimen_mastered",
      title: "Specimen Mastered",
      message: `${specimenName} has been mastered and is ready for use`,
      entityType: "specimen",
      entityId: specimenId,
      actionUrl: `/specimens`,
      priority: "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger specimen mastered notification:", error);
  }
}

/**
 * Event trigger for KPI completed
 */
export async function triggerKPICompleted(
  kpiRecordId: number,
  kpiName: string,
  completedByUserId: number,
  score?: number
) {
  try {
    const enabled = await isNotificationEnabled(completedByUserId, "kpi_completed");
    if (!enabled) return;

    await createNotification(completedByUserId, {
      type: "kpi_completed",
      title: "KPI Evaluation Completed",
      message: `${kpiName} evaluation has been completed${score ? ` with a score of ${score}%` : ""}`,
      entityType: "kpi",
      entityId: kpiRecordId,
      actionUrl: `/kpi`,
      priority: "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger KPI completed notification:", error);
  }
}

/**
 * Event trigger for course started
 */
export async function triggerCourseStarted(
  courseScheduleId: number,
  courseName: string,
  startDate: Date,
  enrolledUserIds: number[]
) {
  try {
    for (const userId of enrolledUserIds) {
      await createNotification(userId, {
        type: "course_started",
        title: "Course Started",
        message: `${courseName} has started today`,
        entityType: "course",
        entityId: courseScheduleId,
        actionUrl: `/schedules`,
        priority: "high",
      });
    }
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger course started notification:", error);
  }
}

/**
 * Event trigger for enrollment confirmed
 */
export async function triggerEnrollmentConfirmed(
  enrollmentId: number,
  studentName: string,
  courseName: string,
  enrolledByUserId: number
) {
  try {
    const enabled = await isNotificationEnabled(enrolledByUserId, "enrollment_confirmed");
    if (!enabled) return;

    await createNotification(enrolledByUserId, {
      type: "enrollment_confirmed",
      title: "Enrollment Confirmed",
      message: `${studentName} has been enrolled in ${courseName}`,
      entityType: "enrollment",
      entityId: enrollmentId,
      actionUrl: `/enrollments`,
      priority: "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger enrollment confirmed notification:", error);
  }
}

/**
 * Event trigger for system alerts
 */
export async function triggerSystemAlert(
  title: string,
  message: string,
  userIds: number[],
  priority: "low" | "normal" | "high" | "critical" = "normal"
) {
  try {
    for (const userId of userIds) {
      await createNotification(userId, {
        type: "system_alert" as const,
        title,
        message,
        priority,
        actionUrl: "/admin",
      });
    }
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger system alert notification:", error);
  }
}

/**
 * Event trigger for bulk import completion
 */
export async function triggerImportCompleted(
  entityType: string,
  successCount: number,
  failureCount: number,
  userId: number
) {
  try {
    const total = successCount + failureCount;
    const message = `Import completed: ${successCount}/${total} ${entityType} imported successfully${
      failureCount > 0 ? ` (${failureCount} failed)` : ""
    }`;

    await createNotification(userId, {
      type: "system_alert" as const,
      title: "Import Completed",
      message,
      priority: failureCount > 0 ? "high" : "normal",
    });
  } catch (error) {
    console.error("[EventTriggers] Failed to trigger import completed notification:", error);
  }
}
