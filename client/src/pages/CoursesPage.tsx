import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, Column } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { DashboardLayout } from "@/components/DashboardLayout";
import { toast } from "sonner";
import { Plus, Upload, Search } from "lucide-react";

const COURSE_LEVELS = [
  { value: "Level 1", label: "Level 1" },
  { value: "Level 2", label: "Level 2" },
  { value: "Level 3", label: "Level 3" },
] as const;

type CourseLevel = (typeof COURSE_LEVELS)[number]["value"];

interface Course {
  id: number;
  code: string;
  name: string;
  level: CourseLevel;
  duration: number | null;
  description: string | null;
  active: boolean;
}

export default function CoursesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: courses = [], isLoading, refetch } = trpc.courses.list.useQuery();
  const createMutation = trpc.courses.create.useMutation();
  const updateMutation = trpc.courses.update.useMutation();
  const deleteMutation = trpc.courses.delete.useMutation();

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (course) =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  const initialValues = useMemo(
    () =>
      editingCourse
        ? {
            code: editingCourse.code ?? "",
            name: editingCourse.name ?? "",
            level: editingCourse.level ?? "Level 1",
            duration: editingCourse.duration ? String(editingCourse.duration) : "",
            description: editingCourse.description ?? "",
          }
        : {
            code: "",
            name: "",
            level: "Level 1",
            duration: "",
            description: "",
          },
    [editingCourse]
  );

  const mapCoursePayload = (data: Record<string, unknown>) => ({
    code: String(data.code),
    name: String(data.name),
    level: String(data.level) as CourseLevel,
    description: data.description ? String(data.description) : undefined,
    duration: data.duration ? Number(data.duration) : undefined,
  });

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      await createMutation.mutateAsync(mapCoursePayload(data));
      toast.success("Course created successfully");
      setIsFormOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create course");
    }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingCourse) return;

    try {
      await updateMutation.mutateAsync({
        id: editingCourse.id,
        data: mapCoursePayload(data),
      });
      toast.success("Course updated successfully");
      setIsFormOpen(false);
      setEditingCourse(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update course");
    }
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`Delete ${course.name}?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: String(course.id) });
      toast.success("Course deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete course");
    }
  };

  const columns: Column<Course>[] = [
    { key: "code", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "level", label: "Level", sortable: true },
    {
      key: "duration",
      label: "Duration",
      render: (value: number | null) => (value ? `${value} work days` : "-"),
    },
    {
      key: "active",
      label: "Status",
      render: (value: boolean) => (value ? "Active" : "Inactive"),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Courses</h1>
            <p className="text-muted-foreground">Manage training courses</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setIsImportOpen(true)} variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={() => {
                setEditingCourse(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Course List</CardTitle>
            <CardDescription>Search and manage all courses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by code or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <DataTable
              columns={columns}
              data={filteredCourses}
              isLoading={isLoading}
              actions={(course) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCourse(course);
                      setIsFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(course)}>
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
            if (!open) setEditingCourse(null);
          }}
          title={editingCourse ? "Edit Course" : "Create Course"}
          onSubmit={editingCourse ? handleUpdate : handleCreate}
          initialValues={initialValues}
          fields={[
            { name: "code", label: "Code", type: "text", required: true },
            { name: "name", label: "Name", type: "text", required: true },
            { name: "level", label: "Level", type: "select", options: [...COURSE_LEVELS], required: true },
            { name: "duration", label: "Duration (Work Days)", type: "number", placeholder: "e.g. 5" },
            { name: "description", label: "Description", type: "textarea" },
          ]}
        />

        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title="Import Courses"
          description="Upload a CSV or Excel file and map the columns to course fields."
          targetFields={[
            { key: "code", label: "Code", required: true, aliases: ["course code", "course id"] },
            { key: "name", label: "Name", required: true, aliases: ["course", "course name", "title"] },
            { key: "level", label: "Level", required: true, aliases: ["course level", "ndt level"] },
            { key: "duration", label: "Duration", required: false, aliases: ["days", "duration days", "course duration"] },
            { key: "description", label: "Description", required: false, aliases: ["details", "summary"] },
          ]}
          onImport={async (data) => {
            try {
              for (const record of data) {
                await createMutation.mutateAsync(mapCoursePayload(record));
              }
              toast.success("Courses imported");
              setIsImportOpen(false);
              refetch();
            } catch {
              toast.error("Import failed");
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}
