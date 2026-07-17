import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { toast } from "sonner";
import { ArrowRightLeft, Calendar as CalendarIcon, Edit2, ExternalLink, FileText, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MaintenanceCalendar, type EquipmentEvent } from "@/components/MaintenanceCalendar";

interface Equipment {
  id: number;
  name: string;
  serialNumber: string | null;
  make: string | null;
  model: string | null;
  description: string | null;
  domain: string | null;
  calibrationType: string | null;
  intervalMonths: number | null;
  lastServiceDate: Date | null;
  nextDueDate: Date | null;
  status: "Active" | "Inactive" | "Maintenance" | "Retired";
  escalationLevel: number;
  branchId: number | null;
}

type EquipmentDocument = {
  id: number;
  equipmentId: number;
  label: string;
  documentType: "Manual" | "Certificate" | "Specification" | "Maintenance Log" | "Other";
  url: string;
};

type EquipmentLoan = {
  id: number;
  equipmentId: number;
  fromBranchId: number;
  toBranchId: number;
  loanDate: string | Date;
  expectedReturnDate: string | Date | null;
  returnedAt: string | Date | null;
  notes: string | null;
};

function addMonthsToDate(input: string, monthsValue: string) {
  if (!input || !monthsValue) return "";

  const months = Number.parseInt(monthsValue, 10);
  if (!Number.isFinite(months)) return "";

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function resolveBranchId(
  rawBranch: unknown,
  branches: Array<{ id: number; name: string; code: string | null }>
) {
  if (rawBranch === undefined || rawBranch === null || String(rawBranch).trim() === "") {
    return null;
  }

  const branchValue = String(rawBranch).trim();
  const numericBranchId = Number.parseInt(branchValue, 10);
  if (Number.isFinite(numericBranchId)) {
    return numericBranchId;
  }

  const matchedBranch = branches.find(
    (branch) =>
      branch.name.toLowerCase() === branchValue.toLowerCase() ||
      (branch.code ?? "").toLowerCase() === branchValue.toLowerCase()
  );

  return matchedBranch?.id ?? null;
}

function getDueState(nextDueDate: Date | string | null) {
  if (!nextDueDate) {
    return { label: "Unscheduled", variant: "secondary" as const };
  }

  const dueDate = new Date(nextDueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return { label: "Overdue", variant: "destructive" as const };
  if (diffDays <= 30) return { label: "Due Soon", variant: "secondary" as const };
  return { label: "Current", variant: "default" as const };
}

function getCalendarStatus(nextDueDate: Date | string | null): "normal" | "warning" | "urgent" | "critical" {
  if (!nextDueDate) return "normal";

  const dueDate = new Date(nextDueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return "critical";
  if (diffDays <= 7) return "urgent";
  if (diffDays <= 30) return "warning";
  return "normal";
}

export default function EquipmentPage() {
  const { data: equipment = [], isLoading, refetch } = trpc.equipment.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: myAccess = [] } = trpc.access.myAccess.useQuery();
  const createMutation = trpc.equipment.create.useMutation();
  const updateMutation = trpc.equipment.update.useMutation();
  const deleteMutation = trpc.equipment.delete.useMutation();
  const rescheduleMutation = trpc.equipment.reschedule.useMutation();
  const addDocumentMutation = trpc.equipment.addDocument.useMutation();
  const removeDocumentMutation = trpc.equipment.removeDocument.useMutation();
  const createLoanMutation = trpc.equipment.createLoan.useMutation();
  const returnLoanMutation = trpc.equipment.returnLoan.useMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentType, setDocumentType] = useState<EquipmentDocument["documentType"]>("Certificate");
  const [documentUrl, setDocumentUrl] = useState("");
  const [loanBranchId, setLoanBranchId] = useState("");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loanReturnDate, setLoanReturnDate] = useState("");
  const [loanNotes, setLoanNotes] = useState("");

  const { data: equipmentDocuments = [], refetch: refetchDocuments } = trpc.equipment.documents.useQuery(
    selectedEquipment?.id ?? 0,
    { enabled: Boolean(selectedEquipment) }
  );
  const { data: equipmentLoans = [], refetch: refetchLoans } = trpc.equipment.loans.useQuery(
    selectedEquipment?.id ?? 0,
    { enabled: Boolean(selectedEquipment) }
  );

  const accessMap = new Map(myAccess.map((entry) => [entry.module, entry]));
  const equipmentAccess = accessMap.get("equipment") ?? {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  };

  const branchOptions = branches.map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  }));

  const formFields: FormField[] = [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "Equipment Name" },
    { name: "branchId", label: "Branch", type: "select", required: true, options: branchOptions, placeholder: "Select branch" },
    { name: "serialNumber", label: "Serial Number", type: "text", placeholder: "Serial Number" },
    { name: "make", label: "Make", type: "text", placeholder: "Manufacturer" },
    { name: "model", label: "Model", type: "text", placeholder: "Model Number" },
    { name: "domain", label: "Domain", type: "text", placeholder: "Mechanical, Electrical, NDT..." },
    { name: "calibrationType", label: "Calibration Type", type: "text", placeholder: "Internal, External..." },
    { name: "intervalMonths", label: "Calibration Interval (Months)", type: "number", placeholder: "12" },
    { name: "lastServiceDate", label: "Calibration Date", type: "date" },
    { name: "nextDueDate", label: "Expiry / Next Due Date", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Maintenance", label: "Maintenance" },
        { value: "Retired", label: "Retired" },
      ],
    },
    { name: "description", label: "Description", type: "textarea", placeholder: "Additional details" },
  ];

  const columns: Column<Equipment>[] = [
    { key: "name", label: "Name", sortable: true, filterable: true },
    {
      key: "branchId",
      label: "Branch",
      sortable: true,
      render: (value) => branches.find((branch) => branch.id === value)?.name || "-",
    },
    { key: "serialNumber", label: "Serial Number", sortable: true, filterable: true },
    {
      key: "status",
      label: "Status",
      render: (value) => <Badge variant={value === "Active" ? "default" : "secondary"}>{value}</Badge>,
    },
    {
      key: "nextDueDate",
      label: "Calibration Status",
      render: (value) => {
        const dueState = getDueState(value);
        return <Badge variant={dueState.variant}>{dueState.label}</Badge>;
      },
    },
    {
      key: "lastServiceDate",
      label: "Calibration Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
    {
      key: "nextDueDate",
      label: "Next Due",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
    },
  ];

  const calendarEvents: EquipmentEvent[] = useMemo(
    () =>
      (equipment || [])
        .filter((item) => item.nextDueDate)
        .map((item) => ({
          id: item.id,
          title: item.name,
          start: new Date(item.nextDueDate!),
          end: new Date(item.nextDueDate!),
          resource: {
            equipmentId: item.id,
            serialNumber: item.serialNumber ?? undefined,
            status: item.escalationLevel >= 2 ? "critical" : getCalendarStatus(item.nextDueDate),
            escalationLevel: item.escalationLevel,
          },
        })),
    [equipment]
  );

  const handleCreateNew = () => {
    setEditingEquipment(null);
    setError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Equipment) => {
    if (!equipmentAccess.canEdit) return;
    setEditingEquipment(item);
    setError(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (item: Equipment) => {
    if (!equipmentAccess.canDelete) return;
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: item.id });
      toast.success("Equipment deleted");
      await refetch();
    } catch (err) {
      toast.error("Failed to delete equipment");
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: String(data.name ?? "").trim(),
        branchId: data.branchId ? Number.parseInt(String(data.branchId), 10) : null,
        serialNumber: String(data.serialNumber ?? "").trim() || null,
        make: String(data.make ?? "").trim() || null,
        model: String(data.model ?? "").trim() || null,
        description: String(data.description ?? "").trim() || null,
        domain: String(data.domain ?? "").trim() || null,
        calibrationType: String(data.calibrationType ?? "").trim() || null,
        intervalMonths: data.intervalMonths ? Number.parseInt(String(data.intervalMonths), 10) : null,
        lastServiceDate: data.lastServiceDate ? new Date(String(data.lastServiceDate)) : null,
        nextDueDate: data.nextDueDate ? new Date(String(data.nextDueDate)) : null,
        status: (data.status as Equipment["status"]) || "Active",
      };

      if (editingEquipment) {
        await updateMutation.mutateAsync({
          id: editingEquipment.id,
          data: payload,
        });
        toast.success("Equipment updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Equipment created");
      }

      await refetch();
      setIsFormOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save equipment";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      await createMutation.mutateAsync({
        name: String(row.name ?? "").trim(),
        branchId: resolveBranchId(row.branchId, branches),
        serialNumber: String(row.serialNumber ?? "").trim() || null,
        make: String(row.make ?? "").trim() || null,
        model: String(row.model ?? "").trim() || null,
        description: String(row.description ?? "").trim() || null,
        domain: String(row.domain ?? "").trim() || null,
        calibrationType: String(row.calibrationType ?? "").trim() || null,
        intervalMonths: row.intervalMonths ? Number.parseInt(String(row.intervalMonths), 10) : null,
        lastServiceDate: row.lastServiceDate ? new Date(String(row.lastServiceDate)) : null,
        nextDueDate: row.nextDueDate ? new Date(String(row.nextDueDate)) : null,
        status: (String(row.status || "Active") as Equipment["status"]),
      });
    }

    await refetch();
  };

  const handleAddDocument = async () => {
    if (!selectedEquipment) return;

    try {
      await addDocumentMutation.mutateAsync({
        equipmentId: selectedEquipment.id,
        label: documentLabel.trim(),
        documentType,
        url: documentUrl.trim(),
      });
      toast.success("Document link added");
      setDocumentLabel("");
      setDocumentUrl("");
      await refetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save document link");
    }
  };

  const openLoanDialog = (item: Equipment) => {
    setSelectedEquipment(item);
    setLoanBranchId("");
    setLoanDate(new Date().toISOString().slice(0, 10));
    setLoanReturnDate("");
    setLoanNotes("");
    setIsLoanOpen(true);
  };

  const selectedBranchName =
    branches.find((branch) => branch.id === selectedEquipment?.branchId)?.name ?? "Unknown branch";

  const buildLoanDocumentHtml = (item: Equipment, toBranchName: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Equipment Loan Form</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
    h1 { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    td, th { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    .muted { color: #6b7280; }
  </style>
</head>
<body>
  <h1>Equipment Transmittal / Loan Form</h1>
  <p class="muted">Generated by TextPoint</p>
  <table>
    <tr><th>Equipment</th><td>${item.name}</td></tr>
    <tr><th>Serial Number</th><td>${item.serialNumber || "-"}</td></tr>
    <tr><th>From Branch</th><td>${selectedBranchName}</td></tr>
    <tr><th>To Branch</th><td>${toBranchName}</td></tr>
    <tr><th>Loan Date</th><td>${loanDate}</td></tr>
    <tr><th>Expected Return</th><td>${loanReturnDate || "-"}</td></tr>
    <tr><th>Notes</th><td>${loanNotes || "-"}</td></tr>
  </table>
  <table style="margin-top: 32px;">
    <tr><th>Released By Signature</th><td style="height: 48px;"></td></tr>
    <tr><th>Received By Signature</th><td style="height: 48px;"></td></tr>
  </table>
</body>
</html>`;

  const openLoanFormWindow = (html: string) => {
    const loanWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!loanWindow) return;
    loanWindow.document.open();
    loanWindow.document.write(html);
    loanWindow.document.close();
  };

  const handleCreateLoan = async () => {
    if (!selectedEquipment?.branchId) {
      toast.error("This equipment item does not have an origin branch.");
      return;
    }

    try {
      const destinationBranchId = Number.parseInt(loanBranchId, 10);
      await createLoanMutation.mutateAsync({
        equipmentId: selectedEquipment.id,
        fromBranchId: selectedEquipment.branchId,
        toBranchId: destinationBranchId,
        loanDate: new Date(loanDate),
        expectedReturnDate: loanReturnDate ? new Date(loanReturnDate) : null,
        notes: loanNotes.trim() || null,
      });
      const destinationBranch = branches.find((branch) => branch.id === destinationBranchId);
      openLoanFormWindow(buildLoanDocumentHtml(selectedEquipment, destinationBranch?.name || "Receiving Branch"));
      toast.success("Equipment loan created");
      setIsLoanOpen(false);
      await refetch();
      await refetchLoans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create equipment loan");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Equipment</h1>
            <p className="text-muted-foreground mt-2">
              Manage equipment, calibration dates, due status, and linked external documents.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setViewMode(viewMode === "list" ? "calendar" : "list")}>
              {viewMode === "list" ? <CalendarIcon className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
              {viewMode === "list" ? "Calendar View" : "List View"}
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={!equipmentAccess.canCreate}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleCreateNew} disabled={!equipmentAccess.canCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </div>
        </div>

        {viewMode === "list" ? (
          <DataTable
            columns={columns}
            data={equipment}
            isLoading={isLoading}
            onRowClick={handleEdit}
            searchPlaceholder="Search equipment..."
            actions={(item) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedEquipment(item);
                    setIsDocumentsOpen(true);
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!equipmentAccess.canEdit}
                  onClick={(event) => {
                    event.stopPropagation();
                    openLoanDialog(item);
                  }}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!equipmentAccess.canEdit}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(item);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!equipmentAccess.canDelete}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(item);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        ) : (
          <div className="bg-card border rounded-lg p-4">
            <MaintenanceCalendar
              events={calendarEvents}
              onReschedule={async (equipmentId, newDate) => {
                await rescheduleMutation.mutateAsync({
                  id: equipmentId,
                  nextDueDate: newDate,
                });
                await refetch();
                toast.success("Calibration date rescheduled");
              }}
            />
          </div>
        )}

        <FormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={editingEquipment ? "Edit Equipment" : "Add Equipment"}
          fields={formFields}
          initialValues={
            editingEquipment
              ? {
                  ...editingEquipment,
                  branchId: editingEquipment.branchId ? String(editingEquipment.branchId) : "",
                  intervalMonths: editingEquipment.intervalMonths ? String(editingEquipment.intervalMonths) : "",
                  lastServiceDate: editingEquipment.lastServiceDate ? new Date(editingEquipment.lastServiceDate).toISOString().slice(0, 10) : "",
                  nextDueDate: editingEquipment.nextDueDate ? new Date(editingEquipment.nextDueDate).toISOString().slice(0, 10) : "",
                }
              : {
                  status: "Active",
                }
          }
          normalizeValues={(values, change) => {
            if (change.name !== "lastServiceDate" && change.name !== "intervalMonths") {
              return values;
            }

            const nextDueDate = addMonthsToDate(
              String(values.lastServiceDate ?? ""),
              String(values.intervalMonths ?? "")
            );

            return {
              ...values,
              nextDueDate: nextDueDate || values.nextDueDate,
            };
          }}
          onSubmit={handleFormSubmit}
          isLoading={isSubmitting}
          error={error}
        />

        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title="Import Equipment"
          description="Choose which source columns map to the equipment fields you need."
          targetFields={[
            { key: "name", label: "Name", required: true, aliases: ["equipment", "equipment name", "item name"] },
            { key: "branchId", label: "Branch ID", required: true, aliases: ["branch", "branch code", "branch name"] },
            { key: "serialNumber", label: "Serial Number", required: false, aliases: ["serial", "serial no", "serial #"] },
            { key: "make", label: "Make", required: false, aliases: ["manufacturer", "brand"] },
            { key: "model", label: "Model", required: false, aliases: ["model number"] },
            { key: "domain", label: "Domain", required: false, aliases: ["technique", "method", "discipline"] },
            { key: "calibrationType", label: "Calibration Type", required: false, aliases: ["service type", "calibration"] },
            { key: "intervalMonths", label: "Interval Months", required: false, aliases: ["interval", "service interval", "months"] },
            { key: "lastServiceDate", label: "Calibration Date", required: false, aliases: ["last service date", "last calibration date", "service date"] },
            { key: "nextDueDate", label: "Next Due Date", required: false, aliases: ["due date", "next service date", "next calibration date"] },
            { key: "status", label: "Status", required: false, aliases: ["equipment status"] },
            { key: "description", label: "Description", required: false, aliases: ["notes", "details"] },
          ]}
          onImport={handleImport}
        />

        <Dialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Equipment Documents</DialogTitle>
              <DialogDescription>
                Link SharePoint or any other external document URL for {selectedEquipment?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="documentLabel">Label</Label>
                  <Input id="documentLabel" value={documentLabel} onChange={(event) => setDocumentLabel(event.target.value)} placeholder="Calibration Certificate" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentType">Document Type</Label>
                  <select
                    id="documentType"
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value as EquipmentDocument["documentType"])}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Certificate">Certificate</option>
                    <option value="Manual">Manual</option>
                    <option value="Specification">Specification</option>
                    <option value="Maintenance Log">Maintenance Log</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label htmlFor="documentUrl">External URL</Label>
                  <Input id="documentUrl" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://..." />
                </div>
              </div>

              <Button onClick={handleAddDocument} disabled={!equipmentAccess.canEdit || !documentLabel.trim() || !documentUrl.trim()}>
                Add Link
              </Button>

              <div className="space-y-3">
                {(equipmentDocuments as EquipmentDocument[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked documents yet.</p>
                ) : (
                  (equipmentDocuments as EquipmentDocument[]).map((document) => (
                    <div key={document.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{document.label}</p>
                        <p className="text-sm text-muted-foreground">{document.documentType}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(document.url, "_blank", "noopener,noreferrer")}>
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!equipmentAccess.canDelete}
                          onClick={async () => {
                            await removeDocumentMutation.mutateAsync(document.id);
                            toast.success("Document removed");
                            await refetchDocuments();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDocumentsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLoanOpen} onOpenChange={setIsLoanOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Loan Equipment</DialogTitle>
              <DialogDescription>
                Transfer {selectedEquipment?.name} to another branch and generate a transmittal form.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current Branch</Label>
                  <Input value={selectedBranchName} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipmentLoanBranch">Receiving Branch</Label>
                  <select
                    id="equipmentLoanBranch"
                    value={loanBranchId}
                    onChange={(event) => setLoanBranchId(event.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select branch</option>
                    {branches
                      .filter((branch) => branch.id !== selectedEquipment?.branchId)
                      .map((branch) => (
                        <option key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipmentLoanDate">Loan Date</Label>
                  <Input id="equipmentLoanDate" type="date" value={loanDate} onChange={(event) => setLoanDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="equipmentLoanReturnDate">Expected Return Date</Label>
                  <Input id="equipmentLoanReturnDate" type="date" value={loanReturnDate} onChange={(event) => setLoanReturnDate(event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="equipmentLoanNotes">Notes</Label>
                  <Input id="equipmentLoanNotes" value={loanNotes} onChange={(event) => setLoanNotes(event.target.value)} placeholder="Condition, courier, reference number..." />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  <p className="font-medium">Loan History</p>
                </div>
                <div className="space-y-3">
                  {(equipmentLoans as EquipmentLoan[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No previous loans recorded.</p>
                  ) : (
                    (equipmentLoans as EquipmentLoan[]).map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">
                            {branches.find((branch) => branch.id === loan.fromBranchId)?.name || "Unknown"} to{" "}
                            {branches.find((branch) => branch.id === loan.toBranchId)?.name || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Loaned {new Date(loan.loanDate).toLocaleDateString()} | Return due{" "}
                            {loan.expectedReturnDate ? new Date(loan.expectedReturnDate).toLocaleDateString() : "-"}
                          </p>
                        </div>
                        {!loan.returnedAt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await returnLoanMutation.mutateAsync({ loanId: loan.id });
                              toast.success("Equipment returned to origin branch");
                              await refetch();
                              await refetchLoans();
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Return
                          </Button>
                        ) : (
                          <Badge variant="outline">Returned</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLoanOpen(false)}>
                Close
              </Button>
              <Button
                onClick={handleCreateLoan}
                disabled={!loanBranchId || createLoanMutation.isPending}
              >
                Create Loan Form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
