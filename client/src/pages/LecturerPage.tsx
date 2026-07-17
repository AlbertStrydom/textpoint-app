import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/DataTable";
import { FormDialog, FormField } from "@/components/FormDialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Lecturer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  specialization: string | null;
  active: boolean;
  branchId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function LecturerPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: lecturers = [], isLoading, refetch } = trpc.lecturers.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: methods = [] } = trpc.lecturers.methods.useQuery();
  const branchOptions = branches.map((b) => ({
    value: String(b.id),
    label: b.name,
  }));
  const methodOptions = methods.map((method) => ({
    value: method.name,
    label: method.name,
  }));

  const createMutation = trpc.lecturers.create.useMutation();
  const updateMutation = trpc.lecturers.update.useMutation();
  const deleteMutation = trpc.lecturers.delete.useMutation();

  const formFields: FormField[] = [
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      required: true,
      placeholder: "First Name",
      section: "Personal Information",
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      required: true,
      placeholder: "Last Name",
      section: "Personal Information",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      placeholder: "email@example.com",
      section: "Contact Information",
    },
    {
      name: "phone",
      label: "Phone",
      type: "text",
      placeholder: "Phone Number",
      section: "Contact Information",
    },
    {
      name: "branchId",
      label: "Branch",
      type: "select",
      options: branchOptions,
      placeholder: "Select Branch",
      section: "Branch and Specialization",
    },
    {
      name: "specialization",
      label: "Specializations",
      type: "checkbox-group",
      required: true,
      options: methodOptions,
      section: "Branch and Specialization",
    },
  ];

  const handleCreateNew = () => {
    setEditingLecturer(null);
    setError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (lecturer: Lecturer) => {
    setEditingLecturer(lecturer);
    setError(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (lecturer: Lecturer) => {
    if (
      !confirm(
        `Are you sure you want to delete ${lecturer.firstName} ${lecturer.lastName}?`
      )
    )
      return;
    try {
      await deleteMutation.mutateAsync({ id: lecturer.id });
      toast.success("Lecturer deleted");
      refetch();
    } catch (err) {
      toast.error("Failed to delete lecturer");
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const specializations = Array.isArray(data.specialization)
        ? (data.specialization as string[])
        : String(data.specialization ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

      if (editingLecturer) {
        // Fixed: was incorrectly calling createMutation
        await updateMutation.mutateAsync({
          id: editingLecturer.id,
          data: {
            firstName: String(data.firstName),
            lastName: String(data.lastName),
            email: data.email ? String(data.email) : null,
            phone: data.phone ? String(data.phone) : null,
            specialization: specializations.length > 0
              ? specializations.join(", ")
              : null,
            branchId: data.branchId
              ? parseInt(String(data.branchId))
              : null,
          },
        });
        toast.success("Lecturer updated");
      } else {
        await createMutation.mutateAsync({
          firstName: String(data.firstName),
          lastName: String(data.lastName),
          email: data.email ? String(data.email) : null,
          phone: data.phone ? String(data.phone) : null,
          specialization: specializations.length > 0
            ? specializations.join(", ")
            : null,
          branchId: data.branchId
            ? parseInt(String(data.branchId))
            : null,
        });
        toast.success("Lecturer created");
      }
      refetch();
      setIsFormOpen(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save lecturer";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Lecturer>[] = [
    { key: "firstName", label: "First Name", sortable: true, filterable: true },
    { key: "lastName", label: "Last Name", sortable: true, filterable: true },
    {
      key: "email",
      label: "Email",
      sortable: true,
      filterable: true,
      render: (v) => v || "—",
    },
    {
      key: "specialization",
      label: "Specialization",
      sortable: true,
      render: (v) => v || "—",
    },
    {
      key: "active",
      label: "Status",
      render: (v) => (v ? "Active" : "Inactive"),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Lecturers</h1>
            <p className="text-muted-foreground mt-1">Manage training lecturers</p>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lecturer
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={lecturers as Lecturer[]}
          isLoading={isLoading}
          onRowClick={handleEdit}
          searchPlaceholder="Search lecturers..."
          actions={(lecturer) => (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(lecturer);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(lecturer);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />

        <FormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={editingLecturer ? "Edit Lecturer" : "Add Lecturer"}
          fields={formFields}
          // Fixed: removed the dangling `: {}` and corrected the ternary
          initialValues={
            editingLecturer
              ? {
                  firstName: editingLecturer.firstName,
                  lastName: editingLecturer.lastName,
                  email: editingLecturer.email ?? "",
                  phone: editingLecturer.phone ?? "",
                  specialization: editingLecturer.specialization
                    ? editingLecturer.specialization.split(",").map((value) => value.trim()).filter(Boolean)
                    : [],
                  branchId: editingLecturer.branchId
                    ? String(editingLecturer.branchId)
                    : "",
                }
              : {}
          }
          onSubmit={handleFormSubmit}
          isLoading={isSubmitting}
          error={error}
        />
      </div>
    </DashboardLayout>
  );
}
