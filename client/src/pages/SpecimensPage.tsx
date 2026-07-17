import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { toast } from "sonner";
import { ArrowRightLeft, Edit2, ExternalLink, FileText, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Specimen {
  id: number;
  name: string;
  specimenTypeId: number;
  serialNumber: string | null;
  description: string | null;
  status: "Available" | "In Use" | "Loaned Out" | "Quarantine" | "Retired";
  masteringStatus: "Mastered" | "Re-master Required" | "Pending";
  branchId: number | null;
}

type SpecimenType = {
  id: number;
  name: string;
  material: string | null;
  size: string | null;
  weight: string | null;
};

type SpecimenDocument = {
  id: number;
  specimenId: number;
  label: string;
  url: string;
};

type SpecimenLoan = {
  id: number;
  specimenId: number;
  fromBranchId: number;
  toBranchId: number;
  loanDate: string | Date;
  expectedReturnDate: string | Date | null;
  returnedAt: string | Date | null;
  notes: string | null;
};

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

function resolveSpecimenTypeId(
  rawSpecimenType: unknown,
  specimenTypes: SpecimenType[]
) {
  const specimenTypeValue = String(rawSpecimenType ?? "").trim();
  const numericSpecimenTypeId = Number.parseInt(specimenTypeValue, 10);
  if (Number.isFinite(numericSpecimenTypeId)) {
    return numericSpecimenTypeId;
  }

  const matchedSpecimenType = specimenTypes.find(
    (specimenType) => specimenType.name.toLowerCase() === specimenTypeValue.toLowerCase()
  );

  return matchedSpecimenType?.id ?? 0;
}

export default function SpecimensPage() {
  const { data: specimens = [], isLoading, refetch } = trpc.specimens.list.useQuery();
  const { data: specimenTypes = [] } = trpc.specimens.types.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: myAccess = [] } = trpc.access.myAccess.useQuery();
  const createMutation = trpc.specimens.create.useMutation();
  const updateMutation = trpc.specimens.update.useMutation();
  const deleteMutation = trpc.specimens.delete.useMutation();
  const addDocumentMutation = trpc.specimens.addDocument.useMutation();
  const removeDocumentMutation = trpc.specimens.removeDocument.useMutation();
  const createLoanMutation = trpc.specimens.createLoan.useMutation();
  const returnLoanMutation = trpc.specimens.returnLoan.useMutation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isLoanOpen, setIsLoanOpen] = useState(false);
  const [editingSpecimen, setEditingSpecimen] = useState<Specimen | null>(null);
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentLabel, setDocumentLabel] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [loanBranchId, setLoanBranchId] = useState("");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loanReturnDate, setLoanReturnDate] = useState("");
  const [loanNotes, setLoanNotes] = useState("");

  const { data: specimenDocuments = [], refetch: refetchDocuments } = trpc.specimens.documents.useQuery(
    selectedSpecimen?.id ?? 0,
    { enabled: Boolean(selectedSpecimen) }
  );
  const { data: specimenLoans = [], refetch: refetchLoans } = trpc.specimens.loans.useQuery(
    selectedSpecimen?.id ?? 0,
    { enabled: Boolean(selectedSpecimen) }
  );

  const accessMap = new Map(myAccess.map((entry) => [entry.module, entry]));
  const specimenAccess = accessMap.get("specimens") ?? {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
  };

  const typeOptions = specimenTypes.map((type) => ({
    value: String(type.id),
    label: [type.name, type.material].filter(Boolean).join(" | "),
  }));
  const branchOptions = branches.map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  }));

  const formFields: FormField[] = [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "Specimen Name" },
    { name: "branchId", label: "Branch", type: "select", required: true, options: branchOptions, placeholder: "Select branch" },
    { name: "specimenTypeId", label: "Specimen Type", type: "select", required: true, options: typeOptions, placeholder: "Select type" },
    { name: "serialNumber", label: "Serial Number", type: "text", placeholder: "Serial Number" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Available", label: "Available" },
        { value: "In Use", label: "In Use" },
        { value: "Loaned Out", label: "Loaned Out" },
        { value: "Quarantine", label: "Quarantine" },
        { value: "Retired", label: "Retired" },
      ],
    },
    {
      name: "masteringStatus",
      label: "Mastering Status",
      type: "select",
      options: [
        { value: "Pending", label: "Pending" },
        { value: "Mastered", label: "Mastered" },
        { value: "Re-master Required", label: "Re-master Required" },
      ],
    },
    { name: "description", label: "Description", type: "textarea", placeholder: "Additional details" },
  ];

  const columns: Column<Specimen>[] = [
    { key: "name", label: "Name", sortable: true, filterable: true },
    {
      key: "branchId",
      label: "Branch",
      sortable: true,
      render: (value) => branches.find((branch) => branch.id === value)?.name || "-",
    },
    {
      key: "specimenTypeId",
      label: "Type",
      sortable: true,
      render: (value) => {
        const type = specimenTypes.find((item) => item.id === value);
        if (!type) return "-";
        return [type.name, type.material, type.size].filter(Boolean).join(" | ");
      },
    },
    { key: "serialNumber", label: "Serial Number", sortable: true, filterable: true },
    {
      key: "status",
      label: "Status",
      render: (value) => <Badge variant={value === "Available" ? "default" : "secondary"}>{value}</Badge>,
    },
    {
      key: "masteringStatus",
      label: "Mastering",
      render: (value) => <Badge variant={value === "Mastered" ? "default" : "secondary"}>{value}</Badge>,
    },
  ];

  const handleCreateNew = () => {
    setEditingSpecimen(null);
    setError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Specimen) => {
    if (!specimenAccess.canEdit) return;
    setEditingSpecimen({ ...item });
    setError(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (item: Specimen) => {
    if (!specimenAccess.canDelete) return;
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: item.id });
      toast.success("Specimen deleted");
      await refetch();
    } catch (err) {
      toast.error("Failed to delete specimen");
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const parsedBranchId =
        data.branchId === undefined || data.branchId === null || String(data.branchId).trim() === ""
          ? null
          : Number.parseInt(String(data.branchId), 10);
      const parsedSpecimenTypeId = Number.parseInt(String(data.specimenTypeId ?? ""), 10);

      if (!Number.isFinite(parsedSpecimenTypeId)) {
        throw new Error("Select a valid specimen type.");
      }

      if (parsedBranchId !== null && !Number.isFinite(parsedBranchId)) {
        throw new Error("Select a valid branch.");
      }

      const payload = {
        name: String(data.name ?? "").trim(),
        branchId: parsedBranchId,
        specimenTypeId: parsedSpecimenTypeId,
        serialNumber: String(data.serialNumber ?? "").trim() || null,
        description: String(data.description ?? "").trim() || null,
        status: (data.status as Specimen["status"]) || "Available",
        masteringStatus: (data.masteringStatus as Specimen["masteringStatus"]) || "Pending",
      };

      if (editingSpecimen) {
        await updateMutation.mutateAsync({
          id: editingSpecimen.id,
          data: payload,
        });
        toast.success("Specimen updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Specimen created");
      }

      await refetch();
      setIsFormOpen(false);
      setEditingSpecimen(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save specimen";
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
        specimenTypeId: resolveSpecimenTypeId(row.specimenTypeId, specimenTypes),
        serialNumber: String(row.serialNumber ?? "").trim() || null,
        description: String(row.description ?? "").trim() || null,
        status: (String(row.status || "Available") as Specimen["status"]),
        masteringStatus: (String(row.masteringStatus || "Pending") as Specimen["masteringStatus"]),
      });
    }

    await refetch();
  };

  const handleAddDocument = async () => {
    if (!selectedSpecimen) return;

    try {
      await addDocumentMutation.mutateAsync({
        specimenId: selectedSpecimen.id,
        label: documentLabel.trim(),
        url: documentUrl.trim(),
      });
      toast.success("Document link added");
      setDocumentLabel("");
      setDocumentUrl("");
      await refetchDocuments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add document link");
    }
  };

  const openLoanDialog = (item: Specimen) => {
    setSelectedSpecimen(item);
    setLoanBranchId("");
    setLoanDate(new Date().toISOString().slice(0, 10));
    setLoanReturnDate("");
    setLoanNotes("");
    setIsLoanOpen(true);
  };

  const selectedBranchName =
    branches.find((branch) => branch.id === selectedSpecimen?.branchId)?.name ?? "Unknown branch";

  const buildLoanDocumentHtml = (item: Specimen, toBranchName: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Specimen Loan Form</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
    h1 { margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    td, th { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    .muted { color: #6b7280; }
  </style>
</head>
<body>
  <h1>Specimen Transmittal / Loan Form</h1>
  <p class="muted">Generated by TextPoint</p>
  <table>
    <tr><th>Specimen</th><td>${item.name}</td></tr>
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
    if (!selectedSpecimen?.branchId) {
      toast.error("This specimen does not have an origin branch.");
      return;
    }

    try {
      const destinationBranchId = Number.parseInt(loanBranchId, 10);
      await createLoanMutation.mutateAsync({
        specimenId: selectedSpecimen.id,
        fromBranchId: selectedSpecimen.branchId,
        toBranchId: destinationBranchId,
        loanDate: new Date(loanDate),
        expectedReturnDate: loanReturnDate ? new Date(loanReturnDate) : null,
        notes: loanNotes.trim() || null,
      });
      const destinationBranch = branches.find((branch) => branch.id === destinationBranchId);
      openLoanFormWindow(buildLoanDocumentHtml(selectedSpecimen, destinationBranch?.name || "Receiving Branch"));
      toast.success("Specimen loan created");
      setIsLoanOpen(false);
      await refetch();
      await refetchLoans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create specimen loan");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Specimens</h1>
            <p className="text-muted-foreground mt-2">
              Manage specimens, mastering state, and linked external reference documents.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)} disabled={!specimenAccess.canCreate}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={handleCreateNew} disabled={!specimenAccess.canCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Specimen
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={specimens}
          isLoading={isLoading}
          onRowClick={handleEdit}
          searchPlaceholder="Search specimens..."
          actions={(item) => (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedSpecimen(item);
                  setIsDocumentsOpen(true);
                }}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!specimenAccess.canEdit}
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
                disabled={!specimenAccess.canEdit}
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
                disabled={!specimenAccess.canDelete}
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

        <FormDialog
          key={`specimen-form-${editingSpecimen?.id ?? "new"}`}
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingSpecimen(null);
              setError(null);
            }
          }}
          title={editingSpecimen ? "Edit Specimen" : "Add Specimen"}
          fields={formFields}
          initialValues={
            editingSpecimen
              ? {
                  ...editingSpecimen,
                  branchId: editingSpecimen.branchId ? String(editingSpecimen.branchId) : "",
                  specimenTypeId: String(editingSpecimen.specimenTypeId),
                }
              : {
                  status: "Available",
                  masteringStatus: "Pending",
                }
          }
          onSubmit={handleFormSubmit}
          isLoading={isSubmitting}
          error={error}
        />

        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title="Import Specimens"
          description="Map your file headings to the specimen fields you need."
          targetFields={[
            { key: "name", label: "Name", required: true, aliases: ["specimen", "specimen name"] },
            { key: "branchId", label: "Branch ID", required: true, aliases: ["branch", "branch code", "branch name"] },
            { key: "specimenTypeId", label: "Specimen Type ID", required: true, aliases: ["specimen type", "type", "type id"] },
            { key: "serialNumber", label: "Serial Number", required: false, aliases: ["serial", "serial no", "serial #", "specimen number"] },
            { key: "status", label: "Status", required: false, aliases: ["specimen status"] },
            { key: "masteringStatus", label: "Mastering Status", required: false, aliases: ["mastering", "mastering state", "mastering result"] },
            { key: "description", label: "Description", required: false, aliases: ["notes", "details"] },
          ]}
          onImport={handleImport}
        />

        <Dialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Specimen Documents</DialogTitle>
              <DialogDescription>
                Link external documents such as master defect references for {selectedSpecimen?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="specimenDocumentLabel">Label</Label>
                  <Input id="specimenDocumentLabel" value={documentLabel} onChange={(event) => setDocumentLabel(event.target.value)} placeholder="Master Defect Document" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specimenDocumentUrl">External URL</Label>
                  <Input id="specimenDocumentUrl" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://..." />
                </div>
              </div>

              <Button onClick={handleAddDocument} disabled={!specimenAccess.canEdit || !documentLabel.trim() || !documentUrl.trim()}>
                Add Link
              </Button>

              <div className="space-y-3">
                {(specimenDocuments as SpecimenDocument[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No linked documents yet.</p>
                ) : (
                  (specimenDocuments as SpecimenDocument[]).map((document) => (
                    <div key={document.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{document.label}</p>
                        <p className="text-sm text-muted-foreground truncate">{document.url}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.open(document.url, "_blank", "noopener,noreferrer")}>
                          Open
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!specimenAccess.canDelete}
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
              <DialogTitle>Loan Specimen</DialogTitle>
              <DialogDescription>
                Transfer {selectedSpecimen?.name} to another branch and generate a transmittal form.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Current Branch</Label>
                  <Input value={selectedBranchName} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specimenLoanBranch">Receiving Branch</Label>
                  <select
                    id="specimenLoanBranch"
                    value={loanBranchId}
                    onChange={(event) => setLoanBranchId(event.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select branch</option>
                    {branches
                      .filter((branch) => branch.id !== selectedSpecimen?.branchId)
                      .map((branch) => (
                        <option key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specimenLoanDate">Loan Date</Label>
                  <Input id="specimenLoanDate" type="date" value={loanDate} onChange={(event) => setLoanDate(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specimenLoanReturnDate">Expected Return Date</Label>
                  <Input id="specimenLoanReturnDate" type="date" value={loanReturnDate} onChange={(event) => setLoanReturnDate(event.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="specimenLoanNotes">Notes</Label>
                  <Input id="specimenLoanNotes" value={loanNotes} onChange={(event) => setLoanNotes(event.target.value)} placeholder="Condition, courier, reference number..." />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" />
                  <p className="font-medium">Loan History</p>
                </div>
                <div className="space-y-3">
                  {(specimenLoans as SpecimenLoan[]).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No previous loans recorded.</p>
                  ) : (
                    (specimenLoans as SpecimenLoan[]).map((loan) => (
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
                              toast.success("Specimen returned to origin branch");
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
