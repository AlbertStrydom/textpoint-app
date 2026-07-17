import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../_core/db";
import {
  students,
  courses,
  courseSchedules,
  enrollments,
  attendance,
  assessments,
  certificates,
} from "../../drizzle/schema";
import { suggestMethodColor } from "../../shared/methodColors";
import { getLecturerById } from "../db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function cleanOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

async function ensureRuntimeColumn(
  _tableName: string,
  _columnName: string,
  _definition: string
) {
  // No-op: columns are managed via drizzle migrations only
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function getAllStudents(branchId?: number) {
  return branchId
    ? db.select().from(students).where(eq(students.branchId, branchId))
    : db.select().from(students);
}

export async function getStudentById(id: number) {
  const result = await db
    .select()
    .from(students)
    .where(eq(students.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createStudent(data: typeof students.$inferInsert) {
  if (data.idNumber || data.passportNumber) {
    const existing = await findStudentByIdentity({
      idNumber: data.idNumber ?? undefined,
      passportNumber: data.passportNumber ?? undefined,
    });

    if (existing) {
      throw new Error(
        "A student already exists with this ID or passport number."
      );
    }
  }

  if (!data.studentNumber) {
    const year = new Date().getFullYear();
    const allStudents = await db.select().from(students);
    const nextNumber = allStudents.length + 1;
    data.studentNumber = `STU-${year}-${String(nextNumber).padStart(4, "0")}`;
  }

  return db.insert(students).values(data);
}

export async function updateStudent(
  id: number,
  data: Partial<typeof students.$inferInsert>
) {
  return db.update(students).set(data).where(eq(students.id, id));
}

export async function deleteStudent(id: number) {
  return db.delete(students).where(eq(students.id, id));
}

export async function findStudentByIdentity(data: {
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
// Courses
// ---------------------------------------------------------------------------

export async function getAllCourses(branchId?: number) {
  return branchId
    ? db.select().from(courses).where(eq(courses.branchId, branchId))
    : db.select().from(courses);
}

export async function getCourseById(id: number) {
  const result = await db
    .select()
    .from(courses)
    .where(eq(courses.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createCourse(data: typeof courses.$inferInsert) {
  return db.insert(courses).values(data);
}

export async function updateCourse(
  id: number,
  data: Partial<typeof courses.$inferInsert>
) {
  return db.update(courses).set(data).where(eq(courses.id, id));
}

export async function deleteCourse(id: number) {
  return db.delete(courses).where(eq(courses.id, id));
}

// ---------------------------------------------------------------------------
// Course Schedules
// ---------------------------------------------------------------------------

export async function getAllCourseSchedules(branchId?: number) {
  await ensureCourseScheduleRuntimeColumns();
  const schedules = branchId
    ? await db
        .select()
        .from(courseSchedules)
        .where(eq(courseSchedules.branchId, branchId))
    : await db.select().from(courseSchedules);

  const allEnrollments = await db.select().from(enrollments);
  const enrollmentCounts = new Map<number, number>();

  for (const enrollment of allEnrollments) {
    if (!countsTowardsScheduleSeat(enrollment.status)) {
      continue;
    }

    const currentCount =
      enrollmentCounts.get(enrollment.courseScheduleId) ?? 0;
    enrollmentCounts.set(enrollment.courseScheduleId, currentCount + 1);
  }

  return schedules.map((schedule) => ({
    ...schedule,
    courseStartPackConfig: normalizeCourseStartPackConfig(schedule.courseStartPackConfig),
    enrolledCount: enrollmentCounts.get(schedule.id) ?? 0,
  }));
}

export async function getCourseScheduleById(id: number) {
  await ensureCourseScheduleRuntimeColumns();
  const result = await db
    .select()
    .from(courseSchedules)
    .where(eq(courseSchedules.id, id))
    .limit(1);
  const schedule = result[0] ?? null;
  if (!schedule) return null;
  return {
    ...schedule,
    courseStartPackConfig: normalizeCourseStartPackConfig(schedule.courseStartPackConfig),
  };
}

export async function findLecturerScheduleConflict(data: {
  lecturerId?: number | null;
  startDate: Date;
  endDate: Date;
  excludeScheduleId?: number;
}) {
  if (!data.lecturerId) return null;

  const allSchedules = await db.select().from(courseSchedules);

  return (
    allSchedules.find((schedule) => {
      if (data.excludeScheduleId && schedule.id === data.excludeScheduleId) {
        return false;
      }
      if (schedule.lecturerId !== data.lecturerId) {
        return false;
      }
      const existingStart = new Date(schedule.startDate);
      const existingEnd = new Date(schedule.endDate);
      const newStart = new Date(data.startDate);
      const newEnd = new Date(data.endDate);
      return newStart <= existingEnd && newEnd >= existingStart;
    }) || null
  );
}

export function normalizeScheduleExamDates(data: {
  startDate: Date | string;
  endDate: Date | string;
  endOfCourseExamStartDate?: Date | string | null;
  endOfCourseExamEndDate?: Date | string | null;
}) {
  const start = new Date(data.startDate);
  let end = new Date(data.endDate);
  const hasExamStart = Boolean(data.endOfCourseExamStartDate);
  const hasExamEnd = Boolean(data.endOfCourseExamEndDate);

  if (start > end) {
    throw new Error("End date cannot be earlier than start date.");
  }

  if (!hasExamStart && !hasExamEnd) {
    return {
      start,
      end,
      examStart: null as Date | null,
      examEnd: null as Date | null,
    };
  }

  const examStart = new Date(
    data.endOfCourseExamStartDate || data.endOfCourseExamEndDate || data.endDate
  );
  const examEnd = new Date(
    data.endOfCourseExamEndDate || data.endOfCourseExamStartDate || data.endDate
  );

  if (examStart > examEnd) {
    throw new Error("End-of-course exam end date cannot be earlier than the exam start date.");
  }

  if (examStart < start) {
    throw new Error("End-of-course exam dates cannot be earlier than the course start date.");
  }

  if (examEnd < start) {
    throw new Error("End-of-course exam dates cannot be earlier than the course start date.");
  }

  if (examEnd > end) {
    end = examEnd;
  }

  return {
    start,
    end,
    examStart,
    examEnd,
  };
}

export type CourseStartPackConfig = {
  location?: string | null;
  industrySector?: string | null;
  sectorScope?: string | null;
  productOrEquipmentScope?: string | null;
  techniqueScope?: string | null;
  selectedEquipmentIds?: number[];
  selectedSpecimenIds?: number[];
  additionalEquipment?: string | null;
  additionalSpecimens?: string | null;
  safetyDeclaration?: string | null;
  lecturerNotes?: string | null;
};

function normaliseSchedulePackIdList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    )
  );
}

export function normalizeCourseStartPackConfig(value: unknown): CourseStartPackConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const normalized: CourseStartPackConfig = {
    location: typeof record.location === "string" ? record.location.trim() || null : null,
    industrySector:
      typeof record.industrySector === "string" ? record.industrySector.trim() || null : null,
    sectorScope: typeof record.sectorScope === "string" ? record.sectorScope.trim() || null : null,
    productOrEquipmentScope:
      typeof record.productOrEquipmentScope === "string"
        ? record.productOrEquipmentScope.trim() || null
        : null,
    techniqueScope:
      typeof record.techniqueScope === "string" ? record.techniqueScope.trim() || null : null,
    selectedEquipmentIds: normaliseSchedulePackIdList(record.selectedEquipmentIds),
    selectedSpecimenIds: normaliseSchedulePackIdList(record.selectedSpecimenIds),
    additionalEquipment:
      typeof record.additionalEquipment === "string"
        ? record.additionalEquipment.trim() || null
        : null,
    additionalSpecimens:
      typeof record.additionalSpecimens === "string"
        ? record.additionalSpecimens.trim() || null
        : null,
    safetyDeclaration:
      typeof record.safetyDeclaration === "string"
        ? record.safetyDeclaration.trim() || null
        : null,
    lecturerNotes:
      typeof record.lecturerNotes === "string" ? record.lecturerNotes.trim() || null : null,
  };

  const hasValues = Object.entries(normalized).some(([key, fieldValue]) => {
    if (key === "selectedEquipmentIds" || key === "selectedSpecimenIds") {
      return Array.isArray(fieldValue) && fieldValue.length > 0;
    }
    return Boolean(fieldValue);
  });

  return hasValues ? normalized : null;
}

async function ensureCourseScheduleRuntimeColumns() {
  await ensureRuntimeColumn("courseSchedules", "courseStartPackConfig", "JSON NULL");
}

export async function updateCourseSchedule(
  id: number,
  data: Partial<typeof courseSchedules.$inferInsert>
) {
  await ensureCourseScheduleRuntimeColumns();
  const existing = await getCourseScheduleById(id);

  if (!existing) {
    throw new Error("Schedule not found.");
  }

  const merged = { ...existing, ...data };

  if (!merged.branchId) {
    throw new Error("Branch is required for schedules.");
  }

  if (merged.lecturerId) {
    const lecturer = await getLecturerById(merged.lecturerId);
    if (!lecturer) {
      throw new Error("Selected lecturer was not found.");
    }
    if (!lecturer.branchId) {
      throw new Error("Selected lecturer is not assigned to a branch.");
    }
    if (lecturer.branchId !== merged.branchId) {
      throw new Error("Selected lecturer belongs to a different branch.");
    }
  }

  const { start, end, examStart, examEnd } = normalizeScheduleExamDates({
    startDate: merged.startDate,
    endDate: merged.endDate,
    endOfCourseExamStartDate: merged.endOfCourseExamStartDate ?? null,
    endOfCourseExamEndDate: merged.endOfCourseExamEndDate ?? null,
  });

  const conflict = await findLecturerScheduleConflict({
    lecturerId: merged.lecturerId ?? null,
    startDate: start,
    endDate: end,
    excludeScheduleId: id,
  });

  if (conflict) {
    throw new Error(
      `Lecturer already booked from ${new Date(
        conflict.startDate
      ).toLocaleDateString()} to ${new Date(
        conflict.endDate
      ).toLocaleDateString()}`
    );
  }

  return db
    .update(courseSchedules)
    .set({
      ...data,
      courseStartPackConfig:
        data.courseStartPackConfig === undefined
          ? undefined
          : normalizeCourseStartPackConfig(data.courseStartPackConfig),
      endDate: end,
      endOfCourseExamStartDate: examStart,
      endOfCourseExamEndDate: examEnd,
    })
    .where(eq(courseSchedules.id, id));
}

export async function createCourseSchedule(
  data: typeof courseSchedules.$inferInsert
) {
  await ensureCourseScheduleRuntimeColumns();
  if (!data.branchId) {
    throw new Error("Branch is required for schedules.");
  }

  const { start, end, examStart, examEnd } = normalizeScheduleExamDates({
    startDate: data.startDate,
    endDate: data.endDate,
    endOfCourseExamStartDate: data.endOfCourseExamStartDate ?? null,
    endOfCourseExamEndDate: data.endOfCourseExamEndDate ?? null,
  });

  if (data.lecturerId) {
    const lecturer = await getLecturerById(data.lecturerId);
    if (!lecturer) {
      throw new Error("Selected lecturer was not found.");
    }
    if (!lecturer.branchId) {
      throw new Error("Selected lecturer is not assigned to a branch.");
    }
    if (lecturer.branchId !== data.branchId) {
      throw new Error("Selected lecturer belongs to a different branch.");
    }
  }

  const conflict = await findLecturerScheduleConflict({
    lecturerId: data.lecturerId ?? null,
    startDate: start,
    endDate: end,
  });

  if (conflict) {
    throw new Error(
      `Lecturer is already assigned to another schedule from ${new Date(
        conflict.startDate
      ).toLocaleDateString()} to ${new Date(
        conflict.endDate
      ).toLocaleDateString()}.`
    );
  }

  return db.insert(courseSchedules).values({
    ...data,
    courseStartPackConfig: normalizeCourseStartPackConfig(data.courseStartPackConfig),
    endDate: end,
    endOfCourseExamStartDate: examStart,
    endOfCourseExamEndDate: examEnd,
  });
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export async function getAllEnrollments() {
  return db.select().from(enrollments);
}

export async function getEnrollmentsByStudent(studentId: number) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.studentId, studentId));
}

export async function getEnrollmentsByCourseSchedule(
  courseScheduleId: number
) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.courseScheduleId, courseScheduleId));
}

function countsTowardsScheduleSeat(status?: string | null) {
  return status !== "Withdrawn";
}

export async function getScheduleSeatInfo(scheduleId: number) {
  const schedule = await db
    .select()
    .from(courseSchedules)
    .where(eq(courseSchedules.id, scheduleId))
    .limit(1);

  if (!schedule[0]) return null;

  const enrolments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.courseScheduleId, scheduleId));

  const maxCapacity = schedule[0].maxCapacity ?? 0;
  const usedSeats = enrolments.filter((enrollment) =>
    countsTowardsScheduleSeat(enrollment.status)
  ).length;
  const availableSeats = maxCapacity - usedSeats;

  return {
    maxCapacity,
    usedSeats,
    availableSeats,
    isFull: maxCapacity > 0 && availableSeats <= 0,
  };
}

export async function createEnrollment(
  data: typeof enrollments.$inferInsert
) {
  const student = await getStudentById(data.studentId);
  if (!student) {
    throw new Error("Selected student was not found.");
  }

  const schedule = await getCourseScheduleById(data.courseScheduleId);
  if (!schedule) {
    throw new Error("Selected schedule was not found.");
  }

  if (schedule.status === "Cancelled") {
    throw new Error("Cannot enrol a student into a cancelled schedule.");
  }

  if (schedule.status === "Completed") {
    throw new Error("Cannot enrol a student into a completed schedule.");
  }

  const existingEnrollment = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.studentId, data.studentId),
        eq(enrollments.courseScheduleId, data.courseScheduleId)
      )
    )
    .limit(1);

  if (existingEnrollment[0]) {
    throw new Error("This student is already enrolled on this schedule.");
  }

  if (countsTowardsScheduleSeat(data.status ?? "Active")) {
    const seatInfo = await getScheduleSeatInfo(data.courseScheduleId);
    if (seatInfo?.isFull) {
      throw new Error("This course schedule is already full.");
    }
  }

  return db.insert(enrollments).values(data);
}

export async function updateEnrollment(
  id: number,
  data: Partial<typeof enrollments.$inferInsert>
) {
  const existing = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Enrolment not found.");
  }

  const currentCountsTowardsSeat = countsTowardsScheduleSeat(existing[0].status);
  const nextCountsTowardsSeat = countsTowardsScheduleSeat(
    data.status ?? existing[0].status
  );

  if (!currentCountsTowardsSeat && nextCountsTowardsSeat) {
    const seatInfo = await getScheduleSeatInfo(existing[0].courseScheduleId);
    if (seatInfo?.isFull) {
      throw new Error("This course schedule is already full.");
    }
  }

  return db.update(enrollments).set(data).where(eq(enrollments.id, id));
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function getAttendanceByEnrollment(enrollmentId: number) {
  return db
    .select()
    .from(attendance)
    .where(eq(attendance.enrollmentId, enrollmentId));
}

export async function getAttendanceByCourseSchedule(
  courseScheduleId: number
) {
  return db
    .select()
    .from(attendance)
    .where(eq(attendance.courseScheduleId, courseScheduleId));
}

type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

function toDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseAttendanceDate(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Attendance date is invalid.");
  }

  return startOfDay(date);
}

function cleanAttendanceNotes(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function saveAttendanceRecord(data: {
  enrollmentId: number;
  courseScheduleId: number;
  attendanceDate: Date;
  status: AttendanceStatus;
  notes?: string | null;
}) {
  const attendanceDay = parseAttendanceDate(data.attendanceDate);
  const existingRecords = await db
    .select()
    .from(attendance)
    .where(eq(attendance.enrollmentId, data.enrollmentId));
  const existing = existingRecords.find(
    (record) =>
      record.courseScheduleId === data.courseScheduleId &&
      toDateKey(record.attendanceDate) === toDateKey(attendanceDay)
  );

  const payload = {
    enrollmentId: data.enrollmentId,
    courseScheduleId: data.courseScheduleId,
    attendanceDate: attendanceDay,
    status: data.status,
    notes: cleanAttendanceNotes(data.notes),
  };

  if (existing) {
    await db.update(attendance).set(payload).where(eq(attendance.id, existing.id));
    return { ...existing, ...payload };
  }

  await db.insert(attendance).values(payload);
  return payload;
}

export async function markAttendanceForSchedule(data: {
  courseScheduleId: number;
  attendanceDate: Date;
  records: Array<{
    enrollmentId: number;
    status: AttendanceStatus;
    notes?: string | null;
  }>;
}) {
  const schedule = await getCourseScheduleById(data.courseScheduleId);
  if (!schedule) {
    throw new Error("Selected schedule was not found.");
  }

  if (schedule.status === "Cancelled") {
    throw new Error("Attendance cannot be marked for a cancelled schedule.");
  }

  const attendanceDay = parseAttendanceDate(data.attendanceDate);
  const today = startOfDay(new Date());
  const scheduleStart = startOfDay(new Date(schedule.startDate));
  const scheduleEnd = startOfDay(new Date(schedule.endDate));

  if (attendanceDay > today) {
    throw new Error("Attendance cannot be marked for a future date.");
  }

  if (attendanceDay < scheduleStart || attendanceDay > scheduleEnd) {
    throw new Error("Attendance date must fall within the selected schedule.");
  }

  const scheduleEnrollments = await getEnrollmentsByCourseSchedule(
    data.courseScheduleId
  );
  const enrollmentById = new Map(
    scheduleEnrollments.map((enrollment) => [enrollment.id, enrollment])
  );

  for (const record of data.records) {
    const enrollment = enrollmentById.get(record.enrollmentId);
    if (!enrollment) {
      throw new Error("One or more enrolments do not belong to this schedule.");
    }

    if (enrollment.status === "Withdrawn") {
      throw new Error("Attendance cannot be marked for withdrawn enrolments.");
    }
  }

  for (const record of data.records) {
    await saveAttendanceRecord({
      enrollmentId: record.enrollmentId,
      courseScheduleId: data.courseScheduleId,
      attendanceDate: attendanceDay,
      status: record.status,
      notes: record.notes,
    });
  }

  return getAttendanceByCourseSchedule(data.courseScheduleId);
}

export async function createAttendance(data: typeof attendance.$inferInsert) {
  const enrollment = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, data.enrollmentId))
    .limit(1);

  if (!enrollment[0] || enrollment[0].courseScheduleId !== data.courseScheduleId) {
    throw new Error("Attendance enrolment does not belong to this schedule.");
  }

  return saveAttendanceRecord({
    enrollmentId: data.enrollmentId,
    courseScheduleId: data.courseScheduleId,
    attendanceDate: data.attendanceDate,
    status: data.status ?? "Present",
    notes: data.notes,
  });
}

export async function updateAttendance(
  id: number,
  data: Partial<typeof attendance.$inferInsert>
) {
  return db.update(attendance).set(data).where(eq(attendance.id, id));
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

function parseAssessmentDate(value: Date | string) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Assessment date is invalid.");
  }

  return startOfDay(date);
}

function normaliseAssessmentScore(value?: number | string | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("Assessment scores must be zero or greater.");
  }

  return numeric.toFixed(2);
}

async function validateAssessmentPayload(data: {
  enrollmentId: number;
  assessmentDate: Date | string;
  attemptNumber?: number | null;
  score?: number | string | null;
  maxScore?: number | string | null;
}) {
  const enrollment = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, data.enrollmentId))
    .limit(1);

  if (!enrollment[0]) {
    throw new Error("Selected enrolment was not found.");
  }

  if (enrollment[0].status === "Withdrawn") {
    throw new Error("Assessments cannot be captured for withdrawn enrolments.");
  }

  const score = normaliseAssessmentScore(data.score);
  const maxScore = normaliseAssessmentScore(data.maxScore);

  if (score !== null && maxScore !== null && Number(score) > Number(maxScore)) {
    throw new Error("Score cannot be greater than max score.");
  }

  const attemptNumber = data.attemptNumber ?? 1;
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("Attempt number must be at least 1.");
  }

  return {
    assessmentDate: parseAssessmentDate(data.assessmentDate),
    attemptNumber,
    score,
    maxScore,
  };
}

export async function getAllAssessments() {
  const rows = await db.select().from(assessments);
  return rows.sort(
    (a, b) =>
      new Date(b.assessmentDate).getTime() -
      new Date(a.assessmentDate).getTime()
  );
}

export async function getAssessmentsByEnrollment(enrollmentId: number) {
  const rows = await db
    .select()
    .from(assessments)
    .where(eq(assessments.enrollmentId, enrollmentId));

  return rows.sort(
    (a, b) =>
      new Date(b.assessmentDate).getTime() -
      new Date(a.assessmentDate).getTime()
  );
}

export async function createAssessment(
  data: Omit<typeof assessments.$inferInsert, "score" | "maxScore"> & {
    score?: number | string | null;
    maxScore?: number | string | null;
  }
) {
  const normalised = await validateAssessmentPayload(data);

  return db.insert(assessments).values({
    ...data,
    assessmentDate: normalised.assessmentDate,
    attemptNumber: normalised.attemptNumber,
    score: normalised.score,
    maxScore: normalised.maxScore,
    notes: data.notes?.trim() || null,
  });
}

export async function updateAssessment(
  id: number,
  data: Partial<
    Omit<typeof assessments.$inferInsert, "score" | "maxScore"> & {
      score?: number | string | null;
      maxScore?: number | string | null;
    }
  >
) {
  const existing = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Assessment not found.");
  }

  const merged = { ...existing[0], ...data };
  const normalised = await validateAssessmentPayload(merged);

  return db
    .update(assessments)
    .set({
      ...data,
      assessmentDate: data.assessmentDate
        ? normalised.assessmentDate
        : undefined,
      attemptNumber:
        data.attemptNumber === undefined ? undefined : normalised.attemptNumber,
      score: data.score === undefined ? undefined : normalised.score,
      maxScore: data.maxScore === undefined ? undefined : normalised.maxScore,
      notes: data.notes === undefined ? undefined : data.notes?.trim() || null,
    })
    .where(eq(assessments.id, id));
}

export async function deleteAssessment(id: number) {
  return db.delete(assessments).where(eq(assessments.id, id));
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

function getNormalisedCertificateStatus(
  status: "Active" | "Expired" | "Revoked" | null | undefined,
  expiryDate?: Date | string | null
) {
  if (status === "Revoked") {
    return "Revoked" as const;
  }

  if (status === "Expired") {
    return "Expired" as const;
  }

  const parsedExpiryDate = parseOptionalDateValue(expiryDate);
  if (parsedExpiryDate && parsedExpiryDate.getTime() < startOfDay(new Date()).getTime()) {
    return "Expired" as const;
  }

  return "Active" as const;
}

function normaliseCertificateRecord<
  T extends {
    status: "Active" | "Expired" | "Revoked";
    expiryDate?: Date | string | null;
  },
>(record: T) {
  return {
    ...record,
    status: getNormalisedCertificateStatus(record.status, record.expiryDate),
  };
}

function personaliseCertificateContent(
  content: string | null | undefined,
  certificateNumber: string
) {
  if (!content) return null;
  return content.replaceAll("{{CERTIFICATE_NUMBER}}", certificateNumber);
}

async function ensureCertificateEnrollmentExists(enrollmentId: number) {
  const enrollment = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment[0]) {
    throw new Error("Selected enrolment was not found.");
  }

  return enrollment[0];
}

async function ensureCertificateNumberIsUnique(
  certificateNumber: string,
  excludeCertificateId?: number
) {
  const existing = await db
    .select()
    .from(certificates)
    .where(eq(certificates.certificateNumber, certificateNumber))
    .limit(1);

  if (existing[0] && existing[0].id !== excludeCertificateId) {
    throw new Error("Certificate number already exists.");
  }
}

async function generateCertificateNumber() {
  const result = await db
    .select({
      maxId: sql<number>`coalesce(max(${certificates.id}), 0)`,
    })
    .from(certificates);

  const nextSequence = Number(result[0]?.maxId ?? 0) + 1;
  return `CERT-${new Date().getFullYear()}-${String(nextSequence).padStart(4, "0")}`;
}

export async function getAllCertificates() {
  const rows = await db.select().from(certificates);
  return rows
    .map((row) => normaliseCertificateRecord(row))
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
}

export async function getCertificatesByEnrollment(enrollmentId: number) {
  const rows = await db
    .select()
    .from(certificates)
    .where(eq(certificates.enrollmentId, enrollmentId));

  return rows
    .map((row) => normaliseCertificateRecord(row))
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
}

export async function getCertificatesByStudent(studentId: number) {
  const studentEnrollments = await getEnrollmentsByStudent(studentId);

  if (studentEnrollments.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(certificates)
    .where(inArray(
      certificates.enrollmentId,
      studentEnrollments.map((enrollment) => enrollment.id)
    ));

  return rows
    .map((row) => normaliseCertificateRecord(row))
    .sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
}

export async function createCertificate(
  data: Omit<typeof certificates.$inferInsert, "certificateNumber"> & {
    certificateNumber?: string | null;
  }
) {
  await ensureCertificateEnrollmentExists(data.enrollmentId);

  const certificateNumber =
    cleanOptionalText(data.certificateNumber) ?? (await generateCertificateNumber());
  await ensureCertificateNumberIsUnique(certificateNumber);

  const issuedDate =
    parseOptionalDateValue(data.issuedDate) ?? startOfDay(new Date());
  const expiryDate = parseOptionalDateValue(data.expiryDate);

  return db.insert(certificates).values({
    enrollmentId: data.enrollmentId,
    certificateNumber,
    issuedDate,
    expiryDate,
    status: getNormalisedCertificateStatus(data.status, expiryDate),
    content: personaliseCertificateContent(cleanOptionalText(data.content), certificateNumber),
    notes: cleanOptionalText(data.notes),
    issuedBy: data.issuedBy ?? null,
  });
}

export async function updateCertificate(
  id: number,
  data: Partial<typeof certificates.$inferInsert>
) {
  const existing = await db
    .select()
    .from(certificates)
    .where(eq(certificates.id, id))
    .limit(1);

  if (!existing[0]) {
    throw new Error("Certificate not found.");
  }

  if (data.enrollmentId !== undefined) {
    await ensureCertificateEnrollmentExists(data.enrollmentId);
  }

  const nextCertificateNumber =
    data.certificateNumber === undefined
      ? existing[0].certificateNumber
      : cleanOptionalText(data.certificateNumber) ?? (await generateCertificateNumber());

  await ensureCertificateNumberIsUnique(nextCertificateNumber, id);

  const nextExpiryDate =
    data.expiryDate === undefined
      ? parseOptionalDateValue(existing[0].expiryDate)
      : parseOptionalDateValue(data.expiryDate);

  const nextStatus =
    data.status === undefined && data.expiryDate === undefined
      ? undefined
      : getNormalisedCertificateStatus(
          data.status ?? existing[0].status,
          nextExpiryDate
        );

  return db
    .update(certificates)
    .set({
      enrollmentId: data.enrollmentId,
      certificateNumber: nextCertificateNumber,
      issuedDate:
        data.issuedDate === undefined
          ? undefined
          : parseOptionalDateValue(data.issuedDate) ?? startOfDay(new Date()),
      expiryDate:
        data.expiryDate === undefined ? undefined : nextExpiryDate,
      status: nextStatus,
      content:
        data.content === undefined
          ? undefined
          : personaliseCertificateContent(
              cleanOptionalText(data.content),
              nextCertificateNumber
            ),
      notes: data.notes === undefined ? undefined : cleanOptionalText(data.notes),
      issuedBy: data.issuedBy === undefined ? undefined : data.issuedBy ?? null,
    })
    .where(eq(certificates.id, id));
}

export async function deleteCertificate(id: number) {
  return db.delete(certificates).where(eq(certificates.id, id));
}
