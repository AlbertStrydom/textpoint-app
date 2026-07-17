import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TriangleAlert } from "lucide-react";

type MethodLevel = {
  method: string;
  level: string;
};

type TechnicianOption = {
  value: string;
  label: string;
};

type AssessmentOption = {
  id: number;
  assessmentDate: string | Date;
  assessor: string;
  method?: string;
  level?: string;
  methodLevels?: MethodLevel[];
};

type TechnicianRecord = {
  id: number;
};

type CertificateRecord = {
  id: number;
  fileUrl?: string | null;
  fileName?: string | null;
  approvalStatus?: "draft" | "approved" | "in_review" | "rejected" | null;
  approvedAt?: string | Date | null;
  approvalRequestedAt?: string | Date | null;
  approvalNote?: string | null;
};

type AuditTrailEntry = {
  id: number;
  action: string;
  actorName?: string | null;
  actorEmail?: string | null;
  createdAt: string | Date;
  changesSummary?: string | null;
};

type CertificateWorkflowPreview = {
  certificateNumber: string;
  resolvedStatus: string;
  issuedDate: string;
  validUntil: string;
  methodSummary: string;
  fileName: string;
};

type CertificateIssuanceImpactPreview = {
  canSave: boolean;
  willSupersedeCertificateNumbers: string[];
  blockingCertificateNumber: string | null;
};

type CertificateFormState = {
  technicianId: string;
  assessmentId: string;
  certificateNumber: string;
  issuedDate: string;
  validUntil: string;
  validityValue: string;
  validityUnit: "days" | "months" | "years" | "custom";
  status: "Active" | "Expired" | "Revoked" | "Superseded";
  fileName: string;
  fileUrl: string;
  attachmentFileName: string;
  notes: string;
  methodLevels: MethodLevel[];
};

type AssessmentFormState = {
  technicianId: string;
  assessmentDate: string;
  assessor: string;
  result: string;
  nextReviewDate: string;
  evidenceUrl: string;
  notes: string;
  methodLevels: MethodLevel[];
};

type AssessmentRecord = {
  id: number;
};

type ResultOption = {
  value: string;
  label: string;
};

type LevelIIITechnicianEntryDialogsProps = {
  isTechnicianCertificateFormOpen: boolean;
  technicianCertificateEditorMode: "general" | "file_link";
  setIsTechnicianCertificateFormOpen: Dispatch<SetStateAction<boolean>>;
  setTechnicianCertificateEditorMode: Dispatch<SetStateAction<"general" | "file_link">>;
  editingTechnicianCertificate: CertificateRecord | null;
  setEditingTechnicianCertificate: Dispatch<SetStateAction<CertificateRecord | null>>;
  technicianCertificateFileLinkSuggestion: {
    recommendedFileName: string;
    storageTargets: Array<{ label: string; path: string }>;
  } | null;
  setTechnicianCertificateFileLinkSuggestion: Dispatch<
    SetStateAction<{
      recommendedFileName: string;
      storageTargets: Array<{ label: string; path: string }>;
    } | null>
  >;
  technicianCertificateForm: CertificateFormState;
  setTechnicianCertificateForm: Dispatch<SetStateAction<CertificateFormState>>;
  createEmptyTechnicianCertificateForm: () => CertificateFormState;
  technicians: TechnicianRecord[];
  technicianOptions: TechnicianOption[];
  selectedCertificateAssessmentOptions: AssessmentOption[];
  getTechnicianMethodQualifications: (technician: TechnicianRecord) => MethodLevel[];
  getAssessmentMethodLevels: (assessment: AssessmentOption) => MethodLevel[];
  getDateInputValue: (value: string | Date | null | undefined) => string;
  formatAssessmentMethodLevelSummary: (assessment: AssessmentOption) => string;
  certificateMutationPending: boolean;
  handleTechnicianCertificateFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  certificateWorkflowPreview: CertificateWorkflowPreview;
  certificateIssuanceImpactPreview: CertificateIssuanceImpactPreview;
  getCertificateApprovalBadge: (status: string) => React.ReactNode;
  technicianCertificateAuditTrailLoading: boolean;
  technicianCertificateAuditTrail: AuditTrailEntry[];
  availableCertificateMethods: string[];
  selectedCertificateTechnician: TechnicianRecord | null;
  getTechnicianLevelForMethod: (
    technician: TechnicianRecord | null,
    methodName: string
  ) => string;
  onSubmitCertificate: () => Promise<void>;
  isAssessmentFormOpen: boolean;
  setIsAssessmentFormOpen: Dispatch<SetStateAction<boolean>>;
  editingAssessment: AssessmentRecord | null;
  setEditingAssessment: Dispatch<SetStateAction<AssessmentRecord | null>>;
  assessmentForm: AssessmentFormState;
  setAssessmentForm: Dispatch<SetStateAction<AssessmentFormState>>;
  createEmptyAssessmentForm: () => AssessmentFormState;
  methodOptions: Array<{ value: string }>;
  getTechnicianMethods: (technician: TechnicianRecord) => string[];
  assessmentMutationPending: boolean;
  assessmentResultOptions: ResultOption[];
  availableAssessmentMethods: string[];
  selectedAssessmentTechnician: TechnicianRecord | null;
  onSubmitAssessment: () => Promise<void>;
};

export function LevelIIITechnicianEntryDialogs(
  props: LevelIIITechnicianEntryDialogsProps
) {
  return (
    <>
      <Dialog
        open={props.isTechnicianCertificateFormOpen}
        onOpenChange={(open) => {
          props.setIsTechnicianCertificateFormOpen(open);
          if (!open) {
            props.setTechnicianCertificateEditorMode("general");
            props.setEditingTechnicianCertificate(null);
            props.setTechnicianCertificateFileLinkSuggestion(null);
            props.setTechnicianCertificateForm(props.createEmptyTechnicianCertificateForm());
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader className="border-b px-6 pb-4 pt-6">
              <DialogTitle>
                {props.technicianCertificateEditorMode === "file_link"
                  ? "Store Or Link Certificate File"
                  : props.editingTechnicianCertificate
                  ? "Edit Technician Certificate"
                  : "Issue Technician Certificate"}
              </DialogTitle>
              <DialogDescription>
                {props.technicianCertificateEditorMode === "file_link"
                  ? "Attach or replace the final stored certificate file for this released certificate."
                  : "Create a unique Level III certificate, set the validity rule, and attach the final file link when available."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="certificate-technician">Technician</Label>
                  <select
                    id="certificate-technician"
                    value={props.technicianCertificateForm.technicianId}
                    onChange={(event) => {
                      const nextTechnicianId = event.target.value;
                      const technician = props.technicians.find(
                        (entry) => entry.id === Number.parseInt(nextTechnicianId, 10)
                      );
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        technicianId: nextTechnicianId,
                        assessmentId: "",
                        methodLevels:
                          current.methodLevels.length > 0 && current.technicianId === nextTechnicianId
                            ? current.methodLevels
                            : technician
                              ? props.getTechnicianMethodQualifications(technician)
                              : [],
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={props.certificateMutationPending}
                  >
                    <option value="">Select technician</option>
                    {props.technicianOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-assessment">Linked Assessment</Label>
                  <select
                    id="certificate-assessment"
                    value={props.technicianCertificateForm.assessmentId}
                    onChange={(event) => {
                      const nextAssessmentId = event.target.value;
                      const assessment = props.selectedCertificateAssessmentOptions.find(
                        (entry) => String(entry.id) === nextAssessmentId
                      );
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        assessmentId: nextAssessmentId,
                        methodLevels: assessment
                          ? props.getAssessmentMethodLevels(assessment)
                          : current.methodLevels,
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={
                      !props.technicianCertificateForm.technicianId || props.certificateMutationPending
                    }
                  >
                    <option value="">No linked assessment</option>
                    {props.selectedCertificateAssessmentOptions.map((assessment) => (
                      <option key={assessment.id} value={String(assessment.id)}>
                        {props.getDateInputValue(assessment.assessmentDate)} | {assessment.assessor} |{" "}
                        {props.formatAssessmentMethodLevelSummary(assessment)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-number">Certificate Number</Label>
                  <Input
                    id="certificate-number"
                    value={props.technicianCertificateForm.certificateNumber}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        certificateNumber: event.target.value,
                      }))
                    }
                    placeholder="Leave blank to auto-generate"
                    disabled={props.certificateMutationPending}
                  />
                  {props.technicianCertificateEditorMode === "file_link" &&
                  props.technicianCertificateFileLinkSuggestion?.recommendedFileName ? (
                    <p className="text-xs text-muted-foreground">
                      Suggested release file name:{" "}
                      {props.technicianCertificateFileLinkSuggestion.recommendedFileName}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-issued-date">Issued Date</Label>
                  <Input
                    id="certificate-issued-date"
                    type="date"
                    value={props.technicianCertificateForm.issuedDate}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        issuedDate: event.target.value,
                      }))
                    }
                    disabled={props.certificateMutationPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-validity-unit">Validity Rule</Label>
                  <select
                    id="certificate-validity-unit"
                    value={props.technicianCertificateForm.validityUnit}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        validityUnit: event.target.value as CertificateFormState["validityUnit"],
                        validUntil: event.target.value === "custom" ? current.validUntil : "",
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={props.certificateMutationPending}
                  >
                    <option value="years">Years</option>
                    <option value="months">Months</option>
                    <option value="days">Days</option>
                    <option value="custom">Custom valid-until date</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-validity-value">
                    {props.technicianCertificateForm.validityUnit === "custom"
                      ? "Custom Valid Until"
                      : "Validity Value"}
                  </Label>
                  {props.technicianCertificateForm.validityUnit === "custom" ? (
                    <Input
                      id="certificate-validity-value"
                      type="date"
                      value={props.technicianCertificateForm.validUntil}
                      onChange={(event) =>
                        props.setTechnicianCertificateForm((current) => ({
                          ...current,
                          validUntil: event.target.value,
                        }))
                      }
                      disabled={props.certificateMutationPending}
                    />
                  ) : (
                    <Input
                      id="certificate-validity-value"
                      type="number"
                      min="1"
                      value={props.technicianCertificateForm.validityValue}
                      onChange={(event) =>
                        props.setTechnicianCertificateForm((current) => ({
                          ...current,
                          validityValue: event.target.value,
                        }))
                      }
                      disabled={props.certificateMutationPending}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-status">Status</Label>
                  <select
                    id="certificate-status"
                    value={props.technicianCertificateForm.status}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        status: event.target.value as CertificateFormState["status"],
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={props.certificateMutationPending}
                  >
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Revoked">Revoked</option>
                    <option value="Superseded">Superseded</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-file-name">File Name</Label>
                  <Input
                    id="certificate-file-name"
                    value={props.technicianCertificateForm.fileName}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        fileName: event.target.value,
                      }))
                    }
                    placeholder="AZIZ KELL - MT2 CERTIFICATE.pdf"
                    disabled={props.certificateMutationPending}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="certificate-file-url">File Link</Label>
                  <Input
                    id="certificate-file-url"
                    value={props.technicianCertificateForm.fileUrl}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        fileUrl: event.target.value,
                      }))
                    }
                    placeholder="https://... or local hosted file URL"
                    disabled={props.certificateMutationPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Manual URL fallback only. Prefer uploading the certificate file below so
                    TextPoint stores it directly.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="certificate-file-upload">Certificate File Upload</Label>
                  {props.technicianCertificateEditorMode === "file_link" ? (
                    <Alert>
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Release queue file-link mode</AlertTitle>
                      <AlertDescription>
                        Upload the final certificate file or paste a hosted file URL below, then
                        save to mark this certificate as stored.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {props.technicianCertificateEditorMode === "file_link" &&
                  props.technicianCertificateFileLinkSuggestion?.storageTargets?.length ? (
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                      <p className="font-medium">Suggested storage targets</p>
                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {props.technicianCertificateFileLinkSuggestion.storageTargets.map((target) => (
                          <p key={`${target.label}-${target.path}`}>
                            {target.label}: {target.path}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <Input
                    id="certificate-file-upload"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                    onChange={props.handleTechnicianCertificateFileChange}
                    disabled={props.certificateMutationPending}
                  />
                  {props.technicianCertificateForm.attachmentFileName ? (
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                      <p className="font-medium">
                        {props.technicianCertificateForm.attachmentFileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This upload will replace the stored certificate file when you save.
                      </p>
                    </div>
                  ) : props.editingTechnicianCertificate?.fileUrl ? (
                    <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                      <p className="font-medium">
                        Existing file:{" "}
                        {props.editingTechnicianCertificate.fileName || "Stored certificate"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Leave upload blank to keep the current stored file.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="space-y-1">
                    <Label>Issuance Preview</Label>
                    <p className="text-sm text-muted-foreground">
                      Review the final certificate values that will be stored when you save.
                    </p>
                  </div>
                  <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Certificate Number</p>
                      <p className="text-sm font-medium">
                        {props.certificateWorkflowPreview.certificateNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Resolved Status</p>
                      <p className="text-sm font-medium">
                        {props.certificateWorkflowPreview.resolvedStatus}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Issued Date</p>
                      <p className="text-sm font-medium">
                        {props.certificateWorkflowPreview.issuedDate || "Choose an issued date"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Valid Until</p>
                      <p className="text-sm font-medium">
                        {props.certificateWorkflowPreview.validUntil || "No valid-until date yet"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">Methods And Levels</p>
                      <p className="text-sm font-medium">
                        {props.certificateWorkflowPreview.methodSummary}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase text-muted-foreground">Suggested File Name</p>
                      <p className="text-sm font-medium">
                        {props.certificateWorkflowPreview.fileName}
                      </p>
                    </div>
                  </div>
                  {!props.certificateIssuanceImpactPreview.canSave ? (
                    <Alert variant="destructive">
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Save will be blocked</AlertTitle>
                      <AlertDescription>
                        A newer active certificate already covers this technician scope
                        {props.certificateIssuanceImpactPreview.blockingCertificateNumber
                          ? ` (${props.certificateIssuanceImpactPreview.blockingCertificateNumber})`
                          : ""}
                        . Revoke or supersede that newer certificate before saving this older
                        replacement.
                      </AlertDescription>
                    </Alert>
                  ) : props.certificateIssuanceImpactPreview.willSupersedeCertificateNumbers.length >
                    0 ? (
                    <Alert>
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Save will auto-supersede active certificates</AlertTitle>
                      <AlertDescription>
                        Saving this certificate will automatically supersede{" "}
                        {props.certificateIssuanceImpactPreview.willSupersedeCertificateNumbers.join(
                          ", "
                        )}
                        .
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                {props.editingTechnicianCertificate ? (
                  <div className="space-y-3 md:col-span-2">
                    <div className="space-y-1">
                      <Label>Sign-Off Summary</Label>
                      <p className="text-sm text-muted-foreground">
                        Review the current approval state, latest sign-off note, and certificate
                        audit trail before making changes.
                      </p>
                    </div>
                    <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Approval State</p>
                        <div className="mt-1">
                          {props.getCertificateApprovalBadge(
                            props.editingTechnicianCertificate.approvalStatus ?? "draft"
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Approved At</p>
                        <p className="text-sm font-medium">
                          {props.editingTechnicianCertificate.approvedAt
                            ? new Date(props.editingTechnicianCertificate.approvedAt).toLocaleString()
                            : "Not approved yet"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">
                          Submitted For Review
                        </p>
                        <p className="text-sm font-medium">
                          {props.editingTechnicianCertificate.approvalRequestedAt
                            ? new Date(
                                props.editingTechnicianCertificate.approvalRequestedAt
                              ).toLocaleString()
                            : "Not submitted yet"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Current Note</p>
                        <p className="text-sm font-medium">
                          {props.editingTechnicianCertificate.approvalNote?.trim() ||
                            "No sign-off note recorded"}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      {props.technicianCertificateAuditTrailLoading ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          Loading certificate history...
                        </div>
                      ) : props.technicianCertificateAuditTrail.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          No certificate history recorded yet.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {props.technicianCertificateAuditTrail.map((entry) => (
                            <div key={entry.id} className="px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{entry.action}</Badge>
                                  <span className="text-sm font-medium">
                                    {entry.actorName || entry.actorEmail || "Unknown user"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(entry.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {entry.changesSummary || "No summary available."}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 md:col-span-2">
                  <div className="space-y-1">
                    <Label>Certificate Methods And Levels</Label>
                    <p className="text-sm text-muted-foreground">
                      Set the exact techniques and levels covered by this certificate. This can
                      mirror the linked assessment or be adjusted manually.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {props.availableCertificateMethods.map((methodName) => {
                        const selectedEntry = props.technicianCertificateForm.methodLevels.find(
                          (entry) => entry.method === methodName
                        );

                        return (
                          <div key={methodName} className="rounded-md border border-dashed p-3">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={Boolean(selectedEntry)}
                                onCheckedChange={(checked) => {
                                  props.setTechnicianCertificateForm((current) => {
                                    const remaining = current.methodLevels.filter(
                                      (entry) => entry.method !== methodName
                                    );
                                    if (!checked) {
                                      return {
                                        ...current,
                                        methodLevels: remaining,
                                      };
                                    }
                                    return {
                                      ...current,
                                      methodLevels: [
                                        ...remaining,
                                        {
                                          method: methodName,
                                          level:
                                            props.getTechnicianLevelForMethod(
                                              props.selectedCertificateTechnician,
                                              methodName
                                            ) || "",
                                        },
                                      ],
                                    };
                                  });
                                }}
                                disabled={props.certificateMutationPending}
                              />
                              <Label className="cursor-pointer">{methodName}</Label>
                            </div>

                            {selectedEntry ? (
                              <div className="mt-3 space-y-2">
                                <Label htmlFor={`certificate-level-${methodName}`}>
                                  Level for {methodName}
                                </Label>
                                <Input
                                  id={`certificate-level-${methodName}`}
                                  value={selectedEntry.level}
                                  onChange={(event) =>
                                    props.setTechnicianCertificateForm((current) => ({
                                      ...current,
                                      methodLevels: current.methodLevels.map((entry) =>
                                        entry.method === methodName
                                          ? { ...entry, level: event.target.value }
                                          : entry
                                      ),
                                    }))
                                  }
                                  placeholder="Level I, II, III"
                                  disabled={props.certificateMutationPending}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="certificate-notes">Notes</Label>
                  <Textarea
                    id="certificate-notes"
                    value={props.technicianCertificateForm.notes}
                    onChange={(event) =>
                      props.setTechnicianCertificateForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    disabled={props.certificateMutationPending}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    props.setTechnicianCertificateEditorMode("general");
                    props.setIsTechnicianCertificateFormOpen(false);
                    props.setEditingTechnicianCertificate(null);
                    props.setTechnicianCertificateForm(props.createEmptyTechnicianCertificateForm());
                  }}
                disabled={props.certificateMutationPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={props.certificateMutationPending}
                onClick={() => void props.onSubmitCertificate()}
              >
                {props.certificateMutationPending
                  ? "Saving..."
                  : props.editingTechnicianCertificate
                    ? "Save Certificate"
                    : "Issue Certificate"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={props.isAssessmentFormOpen}
        onOpenChange={(open) => {
          props.setIsAssessmentFormOpen(open);
          if (!open) {
            props.setEditingAssessment(null);
            props.setAssessmentForm(props.createEmptyAssessmentForm());
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex max-h-[90vh] flex-col">
            <DialogHeader className="border-b px-6 pb-4 pt-6">
              <DialogTitle>
                {props.editingAssessment ? "Edit Technician Assessment" : "Add Technician Assessment"}
              </DialogTitle>
              <DialogDescription>
                Record one assessment with multiple methods and capture the level for each chosen
                method.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="assessment-technician">Technician</Label>
                  <select
                    id="assessment-technician"
                    value={props.assessmentForm.technicianId}
                    onChange={(event) => {
                      const nextTechnicianId = event.target.value;
                      const technician = props.technicians.find(
                        (entry) => entry.id === Number.parseInt(nextTechnicianId, 10)
                      );
                      const technicianMethods = technician
                        ? props.getTechnicianMethods(technician)
                        : props.methodOptions.map((option) => option.value);
                      props.setAssessmentForm((current) => ({
                        ...current,
                        technicianId: nextTechnicianId,
                        methodLevels: current.methodLevels.filter((entry) =>
                          technicianMethods.includes(entry.method)
                        ),
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={props.assessmentMutationPending}
                  >
                    <option value="">Select technician</option>
                    {props.technicianOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-date">Assessment Date</Label>
                  <Input
                    id="assessment-date"
                    type="date"
                    value={props.assessmentForm.assessmentDate}
                    onChange={(event) =>
                      props.setAssessmentForm((current) => ({
                        ...current,
                        assessmentDate: event.target.value,
                      }))
                    }
                    disabled={props.assessmentMutationPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-assessor">Assessor</Label>
                  <Input
                    id="assessment-assessor"
                    value={props.assessmentForm.assessor}
                    onChange={(event) =>
                      props.setAssessmentForm((current) => ({
                        ...current,
                        assessor: event.target.value,
                      }))
                    }
                    placeholder="Assessor name"
                    disabled={props.assessmentMutationPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-result">Result</Label>
                  <select
                    id="assessment-result"
                    value={props.assessmentForm.result}
                    onChange={(event) =>
                      props.setAssessmentForm((current) => ({
                        ...current,
                        result: event.target.value,
                      }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={props.assessmentMutationPending}
                  >
                    {props.assessmentResultOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-next-review">Next Review Date</Label>
                  <Input
                    id="assessment-next-review"
                    type="date"
                    value={props.assessmentForm.nextReviewDate}
                    onChange={(event) =>
                      props.setAssessmentForm((current) => ({
                        ...current,
                        nextReviewDate: event.target.value,
                      }))
                    }
                    disabled={props.assessmentMutationPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessment-evidence">Evidence / Report Link</Label>
                  <Input
                    id="assessment-evidence"
                    value={props.assessmentForm.evidenceUrl}
                    onChange={(event) =>
                      props.setAssessmentForm((current) => ({
                        ...current,
                        evidenceUrl: event.target.value,
                      }))
                    }
                    placeholder="SharePoint or document link"
                    disabled={props.assessmentMutationPending}
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <div className="space-y-1">
                    <Label>Methods And Levels</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose one or more methods for this assessment, then set the applicable level
                      for each.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {props.availableAssessmentMethods.map((methodName) => {
                        const selectedEntry = props.assessmentForm.methodLevels.find(
                          (entry) => entry.method === methodName
                        );

                        return (
                          <div
                            key={methodName}
                            className="rounded-md border border-dashed p-3"
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={Boolean(selectedEntry)}
                                onCheckedChange={(checked) => {
                                  props.setAssessmentForm((current) => {
                                    const remaining = current.methodLevels.filter(
                                      (entry) => entry.method !== methodName
                                    );
                                    if (!checked) {
                                      return { ...current, methodLevels: remaining };
                                    }
                                    return {
                                      ...current,
                                      methodLevels: [
                                        ...remaining,
                                        {
                                          method: methodName,
                                          level:
                                            props.getTechnicianLevelForMethod(
                                              props.selectedAssessmentTechnician,
                                              methodName
                                            ) || "",
                                        },
                                      ],
                                    };
                                  });
                                }}
                                disabled={props.assessmentMutationPending}
                              />
                              <Label className="cursor-pointer">{methodName}</Label>
                            </div>

                            {selectedEntry ? (
                              <div className="mt-3 space-y-2">
                                <Label htmlFor={`assessment-level-${methodName}`}>
                                  Level for {methodName}
                                </Label>
                                <Input
                                  id={`assessment-level-${methodName}`}
                                  value={selectedEntry.level}
                                  onChange={(event) =>
                                    props.setAssessmentForm((current) => ({
                                      ...current,
                                      methodLevels: current.methodLevels.map((entry) =>
                                        entry.method === methodName
                                          ? { ...entry, level: event.target.value }
                                          : entry
                                      ),
                                    }))
                                  }
                                  placeholder="Level I, II, III"
                                  disabled={props.assessmentMutationPending}
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {props.availableAssessmentMethods.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Select a technician first, or configure methods for the technician before
                        adding the assessment.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="assessment-notes">Assessment Notes</Label>
                  <Textarea
                    id="assessment-notes"
                    value={props.assessmentForm.notes}
                    onChange={(event) =>
                      props.setAssessmentForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    disabled={props.assessmentMutationPending}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  props.setIsAssessmentFormOpen(false);
                  props.setEditingAssessment(null);
                  props.setAssessmentForm(props.createEmptyAssessmentForm());
                }}
                disabled={props.assessmentMutationPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={props.assessmentMutationPending}
                onClick={() => void props.onSubmitAssessment()}
              >
                {props.assessmentMutationPending ? "Saving..." : "Save Assessment"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
