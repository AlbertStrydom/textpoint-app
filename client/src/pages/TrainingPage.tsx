import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  Edit2,
  Layers3,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDateInputValue, parseDateInputValue } from "@shared/scheduling";

type TrainingStatus = "Planned" | "Active" | "Completed" | "Cancelled";
type ScheduleStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";
type EnrolmentStatus = "Active" | "Completed" | "Withdrawn" | "Suspended";
type TrainingHealth = "On Track" | "Starting Soon" | "Attention" | "Completed" | "Cancelled";

type TrainingRecord = {
  id: number;
  name: string;
  description: string | null;
  courseId: number | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
  status: TrainingStatus;
  branchId: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type CourseRecord = {
  id: number;
  name: string;
  code: string | null;
  duration: number | null;
  branchId: number | null;
  active?: boolean;
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
  maxCapacity: number | null;
  enrolledCount?: number | null;
  status: ScheduleStatus;
};

type EnrolmentRecord = {
  id: number;
  courseScheduleId: number;
  status: EnrolmentStatus;
};

type TrainingRow = TrainingRecord & {
  courseLabel: string;
  branchName: string;
  windowLabel: string;
  durationLabel: string;
  scheduleCount: number;
  enrolmentCount: number;
  activeEnrolmentCount: number;
  completedEnrolmentCount: number;
  healthLabel: TrainingHealth;
  relatedSchedules: ScheduleRecord[];
  relatedEnrolments: EnrolmentRecord[];
};

const TRAINING_STATUSES: Array<{ value: TrainingStatus; label: string }> = [
  { value: "Planned", label: "Planned" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

function parseDateValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseOptionalDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseDateInputValue(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatDate(value: string | Date | null | undefined) {
  const parsed = parseDateValue(value);
  return parsed
    ? parsed.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (start && end) {
    return `${formatDate(start)} to ${formatDate(end)}`;
  }

  if (start) {
    return `Starts ${formatDate(start)}`;
  }

  if (end) {
    return `Ends ${formatDate(end)}`;
  }

  return "Dates not set";
}

function getDurationLabel(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (!start || !end) {
    return "-";
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.floor((endOfDay(end).getTime() - startOfDay(start).getTime()) / msPerDay) + 1;
  if (diff <= 0) {
    return "Same day";
  }

  return `${diff} day${diff === 1 ? "" : "s"}`;
}

function isDateWithinNextDays(
  value: string | Date | null | undefined,
  days: number,
  today: Date
) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;

  const todayStart = startOfDay(today).getTime();
  const targetStart = startOfDay(parsed).getTime();
  const limit = new Date(today);
  limit.setDate(limit.getDate() + days);
  const limitStart = startOfDay(limit).getTime();

  return targetStart >= todayStart && targetStart <= limitStart;
}

function isPastDate(value: string | Date | null | undefined, today: Date) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return endOfDay(parsed).getTime() < startOfDay(today).getTime();
}

function rangesOverlap(
  training: Pick<TrainingRecord, "startDate" | "endDate">,
  schedule: Pick<ScheduleRecord, "startDate" | "endDate">
) {
  const trainingStart = parseDateValue(training.startDate);
  const trainingEnd = parseDateValue(training.endDate);
  const scheduleStart = parseDateValue(schedule.startDate);
  const scheduleEnd = parseDateValue(schedule.endDate);

  if (!scheduleStart || !scheduleEnd) {
    return true;
  }

  if (!trainingStart && !trainingEnd) {
    return true;
  }

  if (trainingStart && trainingEnd) {
    return trainingStart.getTime() <= scheduleEnd.getTime() &&
      trainingEnd.getTime() >= scheduleStart.getTime();
  }

  if (trainingStart) {
    return scheduleEnd.getTime() >= trainingStart.getTime();
  }

  if (trainingEnd) {
    return scheduleStart.getTime() <= trainingEnd.getTime();
  }

  return true;
}

function getSeatSummary(schedule: ScheduleRecord) {
  const max = schedule.maxCapacity ?? 0;
  const used = schedule.enrolledCount ?? 0;
  if (!max) return "No capacity limit";

  const available = Math.max(max - used, 0);
  if (available === 0) return `Full (${used}/${max})`;
  return `${available} left (${used}/${max})`;
}

function buildCourseLabel(course: CourseRecord | null | undefined) {
  if (!course) return "Unlinked course";
  return course.code ? `${course.code} - ${course.name}` : course.name;
}

function getTrainingHealth(row: TrainingRecord, today: Date): TrainingHealth {
  if (row.status === "Cancelled") return "Cancelled";
  if (row.status === "Completed") return "Completed";
  if (isPastDate(row.endDate, today)) return "Attention";
  if (row.status === "Planned" && isDateWithinNextDays(row.startDate, 14, today)) {
    return "Starting Soon";
  }
  return "On Track";
}

function getStatusBadgeClass(status: TrainingStatus) {
  switch (status) {
    case "Active":
      return "bg-emerald-100 text-emerald-800";
    case "Completed":
      return "bg-slate-200 text-slate-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    case "Planned":
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function getHealthBadgeClass(health: TrainingHealth) {
  switch (health) {
    case "Starting Soon":
      return "bg-amber-100 text-amber-800";
    case "Attention":
      return "bg-red-100 text-red-800";
    case "Completed":
      return "bg-slate-200 text-slate-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    case "On Track":
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

function buildInitialValues(training?: TrainingRecord | null) {
  if (!training) {
    return {
      name: "",
      description: "",
      branchId: "",
      courseId: "",
      startDate: "",
      endDate: "",
      status: "Planned",
    };
  }

  return {
    name: training.name,
    description: training.description || "",
    branchId: training.branchId ? String(training.branchId) : "",
    courseId: training.courseId ? String(training.courseId) : "",
    startDate: training.startDate ? formatDateInputValue(training.startDate) : "",
    endDate: training.endDate ? formatDateInputValue(training.endDate) : "",
    status: training.status,
  };
}

export default function TrainingPage() {
  const today = useMemo(() => new Date(), []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<TrainingRecord | null>(null);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: trainings = [], isLoading: trainingLoading, refetch } = trpc.training.list.useQuery();
  const { data: courses = [], isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: branches = [], isLoading: branchesLoading } = trpc.branches.list.useQuery();
  const { data: schedules = [], isLoading: schedulesLoading } = trpc.courseSchedules.list.useQuery();
  const { data: enrolments = [], isLoading: enrolmentsLoading } = trpc.enrollments.list.useQuery();

  const createMutation = trpc.training.create.useMutation();
  const updateMutation = trpc.training.update.useMutation();
  const deleteMutation = trpc.training.delete.useMutation();

  const trainingList = trainings as TrainingRecord[];
  const courseList = courses as CourseRecord[];
  const branchList = branches as BranchRecord[];
  const scheduleList = schedules as ScheduleRecord[];
  const enrolmentList = enrolments as EnrolmentRecord[];

  const pageLoading =
    trainingLoading || coursesLoading || branchesLoading || schedulesLoading || enrolmentsLoading;

  const selectedBranchId = formValues.branchId ? Number(formValues.branchId) : null;
  const selectedCourseId = formValues.courseId ? Number(formValues.courseId) : null;

  const formCourseOptions = useMemo(
    () =>
      courseList
        .filter((course) => {
          if (!selectedBranchId) return true;
          return (
            course.branchId === null ||
            course.branchId === selectedBranchId ||
            course.id === selectedCourseId
          );
        })
        .map((course) => ({
          value: String(course.id),
          label: `${buildCourseLabel(course)}${course.duration ? ` (${course.duration} days)` : ""}`,
        })),
    [courseList, selectedBranchId, selectedCourseId]
  );

  const branchOptions = useMemo(
    () =>
      branchList.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    [branchList]
  );

  const filterCourseOptions = useMemo(
    () => [
      { value: "all", label: "All courses" },
      ...courseList.map((course) => ({
        value: String(course.id),
        label: buildCourseLabel(course),
      })),
    ],
    [courseList]
  );

  const trainingRows = useMemo<TrainingRow[]>(() => {
    return trainingList.map((training) => {
      const course = courseList.find((item) => item.id === training.courseId) ?? null;
      const branch = branchList.find((item) => item.id === training.branchId) ?? null;
      const relatedSchedules = scheduleList.filter((schedule) => {
        if (!training.courseId || schedule.courseId !== training.courseId) {
          return false;
        }

        if (training.branchId && schedule.branchId !== training.branchId) {
          return false;
        }

        return rangesOverlap(training, schedule);
      });
      const relatedScheduleIds = new Set(relatedSchedules.map((schedule) => schedule.id));
      const relatedEnrolments = enrolmentList.filter((enrolment) =>
        relatedScheduleIds.has(enrolment.courseScheduleId)
      );

      const activeEnrolmentCount = relatedEnrolments.filter(
        (enrolment) => enrolment.status === "Active"
      ).length;
      const completedEnrolmentCount = relatedEnrolments.filter(
        (enrolment) => enrolment.status === "Completed"
      ).length;

      return {
        ...training,
        courseLabel: buildCourseLabel(course),
        branchName: branch?.name || "Unassigned",
        windowLabel: formatDateRange(training.startDate, training.endDate),
        durationLabel: getDurationLabel(training.startDate, training.endDate),
        scheduleCount: relatedSchedules.length,
        enrolmentCount: relatedEnrolments.length,
        activeEnrolmentCount,
        completedEnrolmentCount,
        healthLabel: getTrainingHealth(training, today),
        relatedSchedules,
        relatedEnrolments,
      };
    });
  }, [branchList, courseList, enrolmentList, scheduleList, today, trainingList]);

  const filteredRows = useMemo(() => {
    return trainingRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (branchFilter !== "all" && String(row.branchId ?? "") !== branchFilter) {
        return false;
      }

      if (courseFilter !== "all" && String(row.courseId ?? "") !== courseFilter) {
        return false;
      }

      return true;
    });
  }, [branchFilter, courseFilter, statusFilter, trainingRows]);

  useEffect(() => {
    if (!filteredRows.length) {
      setSelectedTrainingId(null);
      return;
    }

    if (!filteredRows.some((row) => row.id === selectedTrainingId)) {
      setSelectedTrainingId(filteredRows[0].id);
    }
  }, [filteredRows, selectedTrainingId]);

  const selectedTraining =
    filteredRows.find((row) => row.id === selectedTrainingId) ||
    trainingRows.find((row) => row.id === selectedTrainingId) ||
    null;

  const summary = useMemo(() => {
    return {
      total: filteredRows.length,
      active: filteredRows.filter((row) => row.status === "Active").length,
      startingSoon: filteredRows.filter((row) => row.healthLabel === "Starting Soon").length,
      attention: filteredRows.filter((row) => row.healthLabel === "Attention").length,
    };
  }, [filteredRows]);

  const formFields: FormField[] = [
    {
      name: "name",
      label: "Training Name",
      type: "text",
      required: true,
      placeholder: "2026 UT Level 2 Winter Intake",
    },
    {
      name: "branchId",
      label: "Branch",
      type: "select",
      required: true,
      options: branchOptions,
      placeholder: "Select branch",
    },
    {
      name: "courseId",
      label: "Course",
      type: "select",
      required: true,
      options: formCourseOptions,
      placeholder: selectedBranchId ? "Select linked course" : "Select course",
    },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    { name: "endDate", label: "End Date", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: TRAINING_STATUSES,
    },
    {
      name: "description",
      label: "Operational Notes",
      type: "textarea",
      placeholder: "Add intake notes, planning comments, or delivery context...",
    },
  ];

  const columns: Column<TrainingRow>[] = [
    { key: "name", label: "Training", sortable: true, filterable: true },
    { key: "courseLabel", label: "Course", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true, filterable: true },
    { key: "windowLabel", label: "Delivery Window", sortable: true, filterable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getStatusBadgeClass(value as TrainingStatus)}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "healthLabel",
      label: "Health",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getHealthBadgeClass(value as TrainingHealth)}>
          {String(value)}
        </Badge>
      ),
    },
    { key: "scheduleCount", label: "Schedules", sortable: true },
    { key: "enrolmentCount", label: "Enrolments", sortable: true },
  ];

  const handleCreateNew = () => {
    setEditingTraining(null);
    setFormError(null);
    setFormValues(buildInitialValues());
    setIsFormOpen(true);
  };

  const handleEdit = (training: TrainingRow) => {
    setEditingTraining(training);
    setSelectedTrainingId(training.id);
    setFormError(null);
    setFormValues(buildInitialValues(training));
    setIsFormOpen(true);
  };

  const handleDelete = async (training: TrainingRow) => {
    if (!confirm(`Delete "${training.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: training.id });
      toast.success("Training offering deleted");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete training offering");
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const name = String(values.name || "").trim();
      const branchId = Number(values.branchId);
      const courseId = Number(values.courseId);
      const startDate = parseOptionalDateInput(String(values.startDate || ""));
      const endDate = parseOptionalDateInput(String(values.endDate || ""));
      const status = String(values.status || "Planned") as TrainingStatus;

      if (!name) {
        throw new Error("Training name is required.");
      }

      if (!Number.isFinite(branchId)) {
        throw new Error("Branch is required.");
      }

      if (!Number.isFinite(courseId)) {
        throw new Error("Course is required.");
      }

      if (!startDate || !endDate) {
        throw new Error("Start date and end date are required.");
      }

      if (startDate.getTime() > endDate.getTime()) {
        throw new Error("Start date cannot be after end date.");
      }

      const payload = {
        name,
        description: String(values.description || "").trim() || null,
        branchId,
        courseId,
        startDate,
        endDate,
        status,
      };

      if (editingTraining) {
        await updateMutation.mutateAsync({
          id: editingTraining.id,
          data: payload,
        });
        toast.success("Training offering updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Training offering created");
      }

      setIsFormOpen(false);
      setEditingTraining(null);
      setFormValues({});
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save training offering";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Training</h1>
            <p className="text-muted-foreground">
              Plan branch-based training offerings and track the schedules and enrolments attached to each delivery window.
            </p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Training Offering
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Visible Offerings</p>
            <p className="mt-2 text-3xl font-bold">{summary.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">Current filtered operational view</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-900">Active Delivery</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">{summary.active}</p>
            <p className="mt-1 text-xs text-emerald-700">Offerings currently marked active</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Starting Soon</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{summary.startingSoon}</p>
            <p className="mt-1 text-xs text-amber-700">Planned starts in the next 14 days</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-900">Needs Attention</p>
            <p className="mt-2 text-3xl font-bold text-red-900">{summary.attention}</p>
            <p className="mt-1 text-xs text-red-700">Open offerings whose dates have already passed</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operational Filters</CardTitle>
            <CardDescription>
              Narrow the view by status, branch, or course. The training list links directly to the related schedule and enrolment activity below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {TRAINING_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Branch</label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branchList.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Course</label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterCourseOptions.map((course) => (
                      <SelectItem key={course.value} value={course.value}>
                        {course.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Offerings</CardTitle>
            <CardDescription>
              Search, review, and maintain branch-linked offerings. Selecting a row opens the linked delivery picture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredRows}
              isLoading={pageLoading}
              searchPlaceholder="Search training, branch, course, or status..."
              onRowClick={(row) => setSelectedTrainingId(row.id)}
              actions={(row) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleEdit(row);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(row);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                {selectedTraining ? selectedTraining.name : "Training Detail"}
              </CardTitle>
              <CardDescription>
                {selectedTraining
                  ? `${selectedTraining.courseLabel} | ${selectedTraining.branchName} | ${selectedTraining.windowLabel}`
                  : "Select a training offering to inspect its linked schedules and enrolments."}
              </CardDescription>
            </div>
            {selectedTraining ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className={getStatusBadgeClass(selectedTraining.status)}>
                  {selectedTraining.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className={getHealthBadgeClass(selectedTraining.healthLabel)}
                >
                  {selectedTraining.healthLabel}
                </Badge>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!selectedTraining ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No training offering selected yet.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      Linked Course
                    </div>
                    <p className="mt-2 font-semibold">{selectedTraining.courseLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedTraining.durationLabel}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Layers3 className="h-4 w-4" />
                      Related Schedules
                    </div>
                    <p className="mt-2 text-3xl font-bold">{selectedTraining.scheduleCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Matched by course, branch, and date window</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Active Enrolments
                    </div>
                    <p className="mt-2 text-3xl font-bold">{selectedTraining.activeEnrolmentCount}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedTraining.enrolmentCount} total linked enrolments
                    </p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarRange className="h-4 w-4" />
                      Delivery Window
                    </div>
                    <p className="mt-2 font-semibold">{selectedTraining.windowLabel}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedTraining.branchName}</p>
                  </div>
                </div>

                {selectedTraining.description ? (
                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="font-semibold">Operational Notes</h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedTraining.description}
                    </p>
                  </div>
                ) : null}

                {selectedTraining.relatedSchedules.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        No course schedules currently line up with this offering. Check the linked course, branch, and date range if this intake should already be scheduled.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Related Schedules</h3>
                    {selectedTraining.relatedSchedules.map((schedule) => {
                      const relatedScheduleEnrolments = selectedTraining.relatedEnrolments.filter(
                        (enrolment) => enrolment.courseScheduleId === schedule.id
                      );

                      return (
                        <div key={schedule.id} className="rounded-xl border bg-background p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{schedule.status}</Badge>
                                <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                                  {getSeatSummary(schedule)}
                                </span>
                              </div>
                              <p className="mt-3 font-medium">
                                Schedule #{schedule.id} | {formatDateRange(schedule.startDate, schedule.endDate)}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {relatedScheduleEnrolments.length} enrolment
                                {relatedScheduleEnrolments.length === 1 ? "" : "s"} linked to this schedule
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {branchList.find((branch) => branch.id === schedule.branchId)?.name || "Unassigned branch"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <FormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingTraining(null);
              setFormValues({});
              setFormError(null);
            }
          }}
          title={editingTraining ? "Edit Training Offering" : "Add Training Offering"}
          description="Link a training offering to a branch and course so schedules and enrolments can be tracked against the same operational window."
          fields={formFields}
          initialValues={buildInitialValues(editingTraining)}
          onSubmit={handleSubmit}
          onValuesChange={setFormValues}
          normalizeValues={(nextValues) => {
            const normalized = { ...nextValues };
            const nextBranchId = normalized.branchId ? Number(normalized.branchId) : null;
            const nextCourseId = normalized.courseId ? Number(normalized.courseId) : null;

            if (
              nextCourseId &&
              nextBranchId &&
              !courseList.some(
                (course) =>
                  course.id === nextCourseId &&
                  (course.branchId === null || course.branchId === nextBranchId)
              )
            ) {
              normalized.courseId = "";
            }

            return normalized;
          }}
          isLoading={isSubmitting}
          error={formError}
        />
      </div>
    </DashboardLayout>
  );
}
