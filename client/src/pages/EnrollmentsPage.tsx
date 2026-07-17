import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "sonner";
import { AlertCircle, Plus, Search } from "lucide-react";

const ENROLLMENT_STATUSES = [
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Withdrawn", label: "Withdrawn" },
  { value: "Suspended", label: "Suspended" },
];

type EnrolmentStatus = "Active" | "Completed" | "Withdrawn" | "Suspended";

type EnrolmentRecord = {
  id: number;
  studentId: number;
  courseScheduleId: number;
  enrollmentDate: string | Date;
  status: EnrolmentStatus;
};

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
  maxCapacity: number | null;
  enrolledCount?: number | null;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getSeatSummary(schedule: ScheduleRecord) {
  const max = schedule.maxCapacity ?? 0;
  const used = schedule.enrolledCount ?? 0;
  if (!max) return "No capacity limit";

  const available = Math.max(max - used, 0);
  if (available === 0) return `Full (${used}/${max})`;
  return `${available} seat${available === 1 ? "" : "s"} left (${used}/${max})`;
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

  return `${courseLabel} | ${branch?.name || "No branch"} | ${formatDate(schedule.startDate)} | ${getSeatSummary(schedule)} | ${schedule.status}`;
}

export default function EnrollmentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: enrollments = [], isLoading, refetch } = trpc.enrollments.list.useQuery();
  const { data: students = [] } = trpc.students.list.useQuery();
  const { data: schedules = [] } = trpc.courseSchedules.list.useQuery();
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const createMutation = trpc.enrollments.create.useMutation();
  const updateMutation = trpc.enrollments.update.useMutation();
  const deleteMutation = trpc.enrollments.delete.useMutation();

  const typedEnrolments = enrollments as EnrolmentRecord[];
  const typedStudents = students as StudentRecord[];
  const typedSchedules = schedules as ScheduleRecord[];
  const typedCourses = courses as CourseRecord[];
  const typedBranches = branches as BranchRecord[];

  const studentOptions = typedStudents.map((student) => ({
    value: String(student.id),
    label: `${student.firstName} ${student.lastName} (${student.studentNumber || student.id})`,
  }));

  const scheduleOptions = typedSchedules.map((schedule) => ({
    value: String(schedule.id),
    label: buildScheduleLabel(schedule, typedCourses, typedBranches),
  }));

  const filteredEnrollments = useMemo(() => {
    return typedEnrolments.filter((enrollment) => {
      const student = typedStudents.find((item) => item.id === enrollment.studentId);
      const schedule = typedSchedules.find(
        (item) => item.id === enrollment.courseScheduleId
      );
      const haystack = [
        student ? `${student.firstName} ${student.lastName}` : "",
        student?.studentNumber || "",
        schedule
          ? buildScheduleLabel(schedule, typedCourses, typedBranches)
          : String(enrollment.courseScheduleId),
        enrollment.status,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, typedBranches, typedCourses, typedEnrolments, typedSchedules, typedStudents]);

  const activeEnrolments = typedEnrolments.filter(
    (enrollment) => enrollment.status === "Active"
  );
  const fullSchedules = typedSchedules.filter((schedule) => {
    const max = schedule.maxCapacity ?? 0;
    return max > 0 && (schedule.enrolledCount ?? 0) >= max;
  });

  const columns: Column<EnrolmentRecord>[] = [
    {
      key: "studentId",
      label: "Student",
      sortable: true,
      render: (value: number) => {
        const student = typedStudents.find((item) => item.id === value);
        return student ? `${student.firstName} ${student.lastName}` : `Student ${value}`;
      },
    },
    {
      key: "courseScheduleId",
      label: "Schedule",
      sortable: true,
      render: (value: number) => {
        const schedule = typedSchedules.find((item) => item.id === value);
        return schedule
          ? buildScheduleLabel(schedule, typedCourses, typedBranches)
          : `Schedule ${value}`;
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "Active" ? "default" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "enrollmentDate",
      label: "Date",
      sortable: true,
      render: (value: string | Date) => formatDate(value),
    },
  ];

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      if (editingEnrollment) {
        await updateMutation.mutateAsync({
          id: editingEnrollment.id,
          data: {
            status: String(data.status) as EnrolmentStatus,
          },
        });
        toast.success("Enrolment updated");
      } else {
        const studentId = Number(data.studentId);
        const courseScheduleId = Number(data.courseScheduleId);
        const selectedSchedule = typedSchedules.find(
          (schedule) => schedule.id === courseScheduleId
        );

        if (!Number.isFinite(studentId) || !Number.isFinite(courseScheduleId)) {
          throw new Error("Please select both a student and a schedule.");
        }

        if (!selectedSchedule) {
          throw new Error("Selected schedule could not be found.");
        }

        if (selectedSchedule.status === "Cancelled" || selectedSchedule.status === "Completed") {
          throw new Error("Students can only be enrolled into scheduled or in-progress courses.");
        }

        const max = selectedSchedule.maxCapacity ?? 0;
        if (max > 0 && (selectedSchedule.enrolledCount ?? 0) >= max) {
          throw new Error("This course schedule is already full.");
        }

        const duplicate = typedEnrolments.find(
          (enrollment) =>
            enrollment.studentId === studentId &&
            enrollment.courseScheduleId === courseScheduleId
        );

        if (duplicate) {
          throw new Error("This student is already enrolled on this schedule.");
        }

        await createMutation.mutateAsync({
          studentId,
          courseScheduleId,
          status: String(data.status) as EnrolmentStatus,
        });
        toast.success("Enrolment created");
      }

      setIsFormOpen(false);
      setEditingEnrollment(null);
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save enrolment");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Enrolments</h1>
            <p className="text-muted-foreground">Manage student course enrolments</p>
          </div>

          <Button
            onClick={() => {
              setEditingEnrollment(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Enrolment
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Enrolments</p>
              <p className="mt-2 text-3xl font-bold">{typedEnrolments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="mt-2 text-3xl font-bold">{activeEnrolments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Full Schedules</p>
              <p className="mt-2 text-3xl font-bold">{fullSchedules.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Enrolments</CardTitle>
            <CardDescription>Search and manage current enrolments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student, schedule or status..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Duplicate student/schedule enrolments are blocked, and full or closed schedules are protected before saving.
              </p>
            </div>

            <DataTable
              columns={columns}
              data={filteredEnrollments}
              isLoading={isLoading}
              onRowClick={(row) => {
                setEditingEnrollment(row);
                setIsFormOpen(true);
              }}
              actions={(row) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingEnrollment(row);
                      setIsFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!confirm("Delete this enrolment?")) return;
                      await deleteMutation.mutateAsync({ id: String(row.id) });
                      toast.success("Enrolment deleted");
                      await refetch();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>

        <FormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingEnrollment(null);
          }}
          title={editingEnrollment ? "Edit Enrolment" : "Create Enrolment"}
          onSubmit={handleSubmit}
          initialValues={
            editingEnrollment
              ? {
                  studentId: String(editingEnrollment.studentId),
                  courseScheduleId: String(editingEnrollment.courseScheduleId),
                  status: editingEnrollment.status,
                }
              : {
                  status: "Active",
                }
          }
          fields={[
            {
              name: "studentId",
              label: "Student",
              type: "select",
              options: studentOptions,
              required: true,
              disabled: Boolean(editingEnrollment),
            },
            {
              name: "courseScheduleId",
              label: "Schedule",
              type: "select",
              options: scheduleOptions,
              required: true,
              disabled: Boolean(editingEnrollment),
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: ENROLLMENT_STATUSES,
              required: true,
            },
          ]}
        />
      </div>
    </DashboardLayout>
  );
}
