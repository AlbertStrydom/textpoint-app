import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Save, Search, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "sonner";

type StudentRecord = {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string | null;
};

type CourseRecord = {
  id: number;
  name: string;
  code?: string | null;
};

type BranchRecord = {
  id: number;
  name: string;
};

type ScheduleRecord = {
  id: number;
  courseId: number;
  branchId: number | null;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
};

type EnrolmentRecord = {
  id: number;
  studentId: number;
  courseScheduleId: number;
  status: "Active" | "Completed" | "Withdrawn" | "Suspended";
};

type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

type AttendanceRecord = {
  id: number;
  enrollmentId: number;
  courseScheduleId: number;
  attendanceDate: string | Date;
  status: AttendanceStatus;
  notes: string | null;
};

type AttendanceMark = {
  status: AttendanceStatus;
  notes: string;
};

const EMPTY_SCHEDULES: ScheduleRecord[] = [];
const EMPTY_ENROLMENTS: EnrolmentRecord[] = [];
const EMPTY_ATTENDANCE: AttendanceRecord[] = [];

const ATTENDANCE_STATUSES: Array<{ value: AttendanceStatus; label: string }> = [
  { value: "Present", label: "Present" },
  { value: "Absent", label: "Absent" },
  { value: "Late", label: "Late" },
  { value: "Excused", label: "Excused" },
];

function getDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return getDateInputValue(date);
}

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getStudentLabel(student?: StudentRecord | null) {
  if (!student) return "Unknown student";
  return `${student.firstName} ${student.lastName}${
    student.studentNumber ? ` (${student.studentNumber})` : ""
  }`;
}

function buildScheduleLabel(
  schedule: ScheduleRecord,
  courses: CourseRecord[],
  branches: BranchRecord[]
) {
  const course = courses.find((item) => item.id === schedule.courseId);
  const branch = branches.find((item) => item.id === schedule.branchId);
  const courseLabel = course
    ? `${course.code ? `${course.code} - ` : ""}${course.name}`
    : `Course ${schedule.courseId}`;

  return `${courseLabel} | ${branch?.name || "No branch"} | ${formatDate(schedule.startDate)}`;
}

function getAttendanceStatusClass(status: AttendanceStatus) {
  switch (status) {
    case "Present":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "Absent":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    case "Late":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
  }
}

export default function AttendancePage() {
  const { data: courseSchedules, isLoading: schedulesLoading } = trpc.courseSchedules.list.useQuery();
  const { data: enrollments, isLoading: enrollmentsLoading } = trpc.enrollments.list.useQuery();
  const { data: students = [] } = trpc.students.list.useQuery();
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();

  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(getDateInputValue(new Date()));
  const [attendanceMarks, setAttendanceMarks] = useState<Record<number, AttendanceMark>>({});

  const typedSchedules = (courseSchedules ?? EMPTY_SCHEDULES) as ScheduleRecord[];
  const typedEnrollments = (enrollments ?? EMPTY_ENROLMENTS) as EnrolmentRecord[];
  const typedStudents = students as StudentRecord[];
  const typedCourses = courses as CourseRecord[];
  const typedBranches = branches as BranchRecord[];

  const scheduleStatus = useMemo(() => {
    const now = new Date();
    return (
      typedSchedules.reduce((acc, schedule) => {
        const startDate = new Date(schedule.startDate);
        acc[schedule.id] = startDate <= now;
        return acc;
      }, {} as Record<number, boolean>) || {}
    );
  }, [typedSchedules]);

  const selectedSchedule = typedSchedules.find((s) => s.id === Number(selectedScheduleId));
  const isScheduleStarted = selectedSchedule ? scheduleStatus[selectedSchedule.id] : false;

  const {
    data: attendanceRecords,
    isLoading: attendanceLoading,
    refetch: refetchAttendance,
  } = trpc.attendance.byCourseSchedule.useQuery(selectedSchedule?.id ?? 0, {
    enabled: Boolean(selectedSchedule),
    refetchOnWindowFocus: false,
  });
  const markBatchMutation = trpc.attendance.markBatch.useMutation();

  const typedAttendanceRecords = (attendanceRecords ?? EMPTY_ATTENDANCE) as AttendanceRecord[];
  const scheduleEnrollments = useMemo(
    () =>
      selectedSchedule
        ? typedEnrollments.filter((e) => e.courseScheduleId === selectedSchedule.id)
        : [],
    [selectedSchedule, typedEnrollments]
  );

  const existingAttendanceForDate = useMemo(() => {
    const selectedDateKey = attendanceDate;
    return new Map(
      typedAttendanceRecords
        .filter((record) => getDateKey(record.attendanceDate) === selectedDateKey)
        .map((record) => [record.enrollmentId, record])
    );
  }, [attendanceDate, typedAttendanceRecords]);

  useEffect(() => {
    const nextMarks: Record<number, AttendanceMark> = {};

    for (const enrollment of scheduleEnrollments) {
      const existing = existingAttendanceForDate.get(enrollment.id);
      nextMarks[enrollment.id] = {
        status: existing?.status ?? "Present",
        notes: existing?.notes ?? "",
      };
    }

    setAttendanceMarks(nextMarks);
  }, [existingAttendanceForDate, scheduleEnrollments]);

  const filteredEnrollments = scheduleEnrollments.filter((enrollment) => {
    const student = typedStudents.find((item) => item.id === enrollment.studentId);
    const haystack = [
      enrollment.id,
      enrollment.status,
      getStudentLabel(student),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchTerm.toLowerCase());
  });

  const isLoading = schedulesLoading || enrollmentsLoading || attendanceLoading;

  const markedCount = scheduleEnrollments.filter((enrollment) =>
    existingAttendanceForDate.has(enrollment.id)
  ).length;

  const handleAttendanceMarkChange = (
    enrollmentId: number,
    change: Partial<AttendanceMark>
  ) => {
    setAttendanceMarks((current) => ({
      ...current,
      [enrollmentId]: {
        status: current[enrollmentId]?.status ?? "Present",
        notes: current[enrollmentId]?.notes ?? "",
        ...change,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSchedule) {
      toast.error("Please select a schedule first.");
      return;
    }

    if (!isScheduleStarted) {
      toast.error("Attendance can only be marked once the course has started.");
      return;
    }

    if (scheduleEnrollments.length === 0) {
      toast.error("There are no enrolments for this schedule.");
      return;
    }

    try {
      await markBatchMutation.mutateAsync({
        courseScheduleId: selectedSchedule.id,
        attendanceDate: parseDateInput(attendanceDate),
        records: scheduleEnrollments.map((enrollment) => ({
          enrollmentId: enrollment.id,
          status: attendanceMarks[enrollment.id]?.status ?? "Present",
          notes: attendanceMarks[enrollment.id]?.notes?.trim() || null,
        })),
      });

      toast.success("Attendance saved.");
      await refetchAttendance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save attendance.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
            <p className="text-muted-foreground mt-2">Mark and track student attendance</p>
          </div>
          <Button
            size="sm"
            disabled={!selectedSchedule || !isScheduleStarted || markBatchMutation.isPending}
            onClick={handleSaveAttendance}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Attendance
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Course Schedule</CardTitle>
            <CardDescription>Choose a course schedule to manage attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course schedule..." />
              </SelectTrigger>
              <SelectContent>
                {typedSchedules.map((schedule) => {
                  const hasStarted = scheduleStatus[schedule.id];

                  return (
                    <SelectItem key={schedule.id} value={schedule.id.toString()}>
                      {buildScheduleLabel(schedule, typedCourses, typedBranches)}
                      {hasStarted ? "" : " - Not started"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedSchedule ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance</CardTitle>
                  <CardDescription>
                    {buildScheduleLabel(selectedSchedule, typedCourses, typedBranches)}
                  </CardDescription>
                </div>
                <div>
                  {isScheduleStarted ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                      <Lock className="mr-1 h-3 w-3" />
                      Not Started
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="font-medium">Attendance Date</span>
                  <Input
                    type="date"
                    value={attendanceDate}
                    onChange={(event) => setAttendanceDate(event.target.value)}
                    disabled={!isScheduleStarted}
                  />
                </label>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-sm text-muted-foreground">Enrolments</p>
                  <p className="mt-1 text-2xl font-bold">{scheduleEnrollments.length}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-sm text-muted-foreground">Saved for Date</p>
                  <p className="mt-1 text-2xl font-bold">
                    {markedCount}/{scheduleEnrollments.length}
                  </p>
                </div>
              </div>

              {!isScheduleStarted ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Attendance locked
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Attendance can only be captured once the course has started.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by student, number, enrolment or status..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No enrolments found for this schedule.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEnrollments.map((enrollment) => {
                    const student = typedStudents.find(
                      (item) => item.id === enrollment.studentId
                    );

                    return (
                      <div
                        key={enrollment.id}
                        className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1fr_180px_1.5fr_auto] lg:items-center"
                      >
                        <div>
                          <p className="font-medium">{getStudentLabel(student)}</p>
                          <p className="text-sm text-muted-foreground">
                            Enrolment #{enrollment.id}
                          </p>
                        </div>
                        <Select
                          value={attendanceMarks[enrollment.id]?.status ?? "Present"}
                          onValueChange={(value) =>
                            handleAttendanceMarkChange(enrollment.id, {
                              status: value as AttendanceStatus,
                            })
                          }
                          disabled={!isScheduleStarted || markBatchMutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ATTENDANCE_STATUSES.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={attendanceMarks[enrollment.id]?.notes ?? ""}
                          onChange={(event) =>
                            handleAttendanceMarkChange(enrollment.id, {
                              notes: event.target.value,
                            })
                          }
                          placeholder="Optional attendance note..."
                          disabled={!isScheduleStarted || markBatchMutation.isPending}
                        />
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant="outline">{enrollment.status}</Badge>
                          <Badge
                            className={getAttendanceStatusClass(
                              attendanceMarks[enrollment.id]?.status ?? "Present"
                            )}
                          >
                            {existingAttendanceForDate.has(enrollment.id)
                              ? "Saved"
                              : "Unsaved"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedSchedule && isScheduleStarted ? (
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveAttendance}
                    disabled={markBatchMutation.isPending || scheduleEnrollments.length === 0}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {markBatchMutation.isPending ? "Saving..." : "Save Register"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
