import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Download, Edit2 } from "lucide-react";
import { toast } from "sonner";

type EvidenceReviewRecord = {
  source?: "certificate" | "requirement" | "portal_request" | "request_pack" | string;
  description?: string | null;
  badges?: Array<{
    key: string;
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }>;
  contentType?: string | null;
  title?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  storagePath?: string | null;
  sourceReference?: string | null;
  certificate?: {
    id: number;
    technicianId: number;
    certificateNumber: string;
    approvalStatus: "draft" | "in_review" | "approved" | "rejected" | string;
  } | null;
  requirement?: unknown;
  portalRequest?: unknown;
};

type ControlledDocumentDecision = {
  document: {
    id: number;
    title: string;
  };
  action: "approve" | "reject";
};

type CertificateSignOffState = {
  certificate: {
    id: number;
    technicianId: number;
    certificateNumber: string;
  };
  action: "submit" | "approve" | "reject" | "reopen";
};

type CertificateHistoryRecord = {
  id: number;
  technicianId: number;
  certificateNumber: string;
};

type ControlledDocumentRecord = {
  id: number;
  title?: string | null;
};

type AuditTrailEntry = {
  id: number;
  action: string;
  actorName?: string | null;
  actorEmail?: string | null;
  createdAt: string | Date;
  changesSummary?: string | null;
};

type CertificateExportHistoryEntry = {
  id: number;
  exportFormat: string;
  fileName: string;
  createdAt?: string | Date | null;
  actorName?: string | null;
  actorEmail?: string | null;
  title?: string | null;
  artifactSummary?: Record<string, string | null> | null;
};

type DirectUploadFormValues = {
  documentLabel: string;
  fileName: string;
  issuedAt: string;
  notes: string;
  attachmentFileName: string;
};

type DirectUploadRule = {
  label: string;
  displayLabel: string;
  storagePath: string;
  suggestedFileName: string;
};

type DirectUploadDefinition = {
  validityDays?: number | null;
};

type DirectUploadTechnician = {
  name: string;
};

type LevelIIITechnicianWorkflowDialogsProps = {
  selectedEvidenceReview: EvidenceReviewRecord | null;
  setSelectedEvidenceReview: Dispatch<SetStateAction<EvidenceReviewRecord | null>>;
  selectedEvidencePreviewUrl: string | null;
  selectedEvidencePreviewContentType: string | null;
  selectedEvidencePreviewError: string | null;
  isSelectedEvidencePreviewLoading: boolean;
  shouldLoadSelectedEvidencePreview: boolean;
  setShouldLoadSelectedEvidencePreview: Dispatch<SetStateAction<boolean>>;
  getLevelIIIEvidencePreviewKind: (
    review: EvidenceReviewRecord,
    options: { contentType: string | null; fileUrl: string }
  ) => "image" | "pdf" | "text" | "external" | "none";
  approvedControlledDocumentByCertificateId: Map<number, ControlledDocumentRecord>;
  openLevelIIIDocumentRecord: (id: number, options?: { action?: string }) => void;
  setSelectedCertificateHistory: Dispatch<SetStateAction<CertificateHistoryRecord | null>>;
  openCertificateSignOffDialog: (
    certificate: CertificateSignOffState["certificate"],
    action: CertificateSignOffState["action"]
  ) => void;
  openTechnicianComplianceRecord: (requirement: unknown) => void;
  openPortalRequestManagement: (portalRequest: unknown) => void;
  copySelectedEvidenceReference: () => void;
  downloadSelectedEvidenceFile: () => void;
  openSelectedEvidenceFile: () => void;
  pendingControlledDocumentDecision: ControlledDocumentDecision | null;
  closeControlledLevelIIICertificateDecision: () => void;
  controlledDocumentDecisionNote: string;
  setControlledDocumentDecisionNote: Dispatch<SetStateAction<string>>;
  approveControlledDocumentPending: boolean;
  rejectControlledDocumentPending: boolean;
  confirmControlledLevelIIICertificateDecision: () => Promise<void> | void;
  pendingCertificateSignOff: CertificateSignOffState | null;
  closeCertificateSignOffDialog: () => void;
  getLevelIIITechnicianName: (technicianId: number) => string;
  certificateSignOffNote: string;
  setCertificateSignOffNote: Dispatch<SetStateAction<string>>;
  signOffTechnicianCertificatePending: boolean;
  handleSignOffLevelIIICertificate: (
    certificate: CertificateSignOffState["certificate"],
    action: CertificateSignOffState["action"],
    note: string
  ) => Promise<boolean>;
  selectedCertificateHistory: CertificateHistoryRecord | null;
  selectedCertificateAuditTrailLoading: boolean;
  selectedCertificateAuditTrail: AuditTrailEntry[];
  technicianCertificateHistoryLoading: boolean;
  technicianCertificateHistory: CertificateExportHistoryEntry[];
  handleReplayLevelIIICertificateExport: (entry: CertificateExportHistoryEntry) => void;
  isTechnicianDirectUploadOpen: boolean;
  setIsTechnicianDirectUploadOpen: Dispatch<SetStateAction<boolean>>;
  technicianDirectUploadFormValues: DirectUploadFormValues;
  setTechnicianDirectUploadFormValues: Dispatch<SetStateAction<DirectUploadFormValues>>;
  createEmptyTechnicianDirectUploadForm: () => DirectUploadFormValues;
  handleTechnicianDirectUploadRuleChange: (value: string) => void;
  selectedTechnicianDocumentPackGuide: DirectUploadRule[];
  availableTechnicianDirectUploadRules: DirectUploadRule[];
  createTechnicianRequirementDefinitionPending: boolean;
  upsertTechnicianRequirementPending: boolean;
  uploadTechnicianRequirementDocumentPending: boolean;
  selectedDirectUploadDefinition: DirectUploadDefinition | null;
  handleTechnicianDirectUploadFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedComplianceTechnician: DirectUploadTechnician | null;
  selectedDirectUploadRule: DirectUploadRule | null;
  handleSubmitTechnicianDirectUpload: () => Promise<void>;
};

export function LevelIIITechnicianWorkflowDialogs(
  props: LevelIIITechnicianWorkflowDialogsProps
) {
  const uploadPending =
    props.createTechnicianRequirementDefinitionPending ||
    props.upsertTechnicianRequirementPending ||
    props.uploadTechnicianRequirementDocumentPending;
  const closeSelectedEvidenceReview = () => {
    props.setShouldLoadSelectedEvidencePreview(false);
    props.setSelectedEvidenceReview(null);
  };
  const selectedEvidenceReviewKey = props.selectedEvidenceReview
    ? [
        props.selectedEvidenceReview.source,
        props.selectedEvidenceReview.fileUrl,
        props.selectedEvidenceReview.fileName,
        props.selectedEvidenceReview.title,
      ]
        .filter(Boolean)
        .join("::")
    : "no-evidence-review";
  const selectedPreviewKind =
    props.selectedEvidencePreviewUrl && props.selectedEvidenceReview
      ? props.getLevelIIIEvidencePreviewKind(props.selectedEvidenceReview, {
          contentType: props.selectedEvidencePreviewContentType,
          fileUrl: props.selectedEvidencePreviewUrl,
        })
      : "none";

  return (
    <>
      {props.selectedEvidenceReview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="absolute inset-0"
            aria-hidden="true"
            onClick={closeSelectedEvidenceReview}
          />
          <div
            key={selectedEvidenceReviewKey}
            className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border bg-background shadow-xl"
          >
            <div className="border-b px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Evidence Review</h2>
                  <p className="text-sm text-muted-foreground">
                    {props.selectedEvidenceReview?.description ??
                      "Review the stored file details before opening the evidence."}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={closeSelectedEvidenceReview}>
                  Close
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {(props.selectedEvidenceReview?.badges ?? []).map((badge) => (
                  <Badge
                    key={badge.key}
                    variant={badge.variant ?? "secondary"}
                    className={badge.className}
                  >
                    {badge.label}
                  </Badge>
                ))}
                {props.selectedEvidenceReview?.contentType ? (
                  <Badge variant="outline">{props.selectedEvidenceReview.contentType}</Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-medium">
                {props.selectedEvidenceReview?.title ??
                  props.selectedEvidenceReview?.fileName ??
                  "Stored evidence"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {props.selectedEvidenceReview?.fileName ?? "Stored file"}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Source
                </p>
                <p className="mt-1 text-sm">
                  {props.selectedEvidenceReview?.source === "certificate"
                    ? "Technician certificate"
                    : props.selectedEvidenceReview?.source === "requirement"
                      ? "Compliance requirement"
                      : props.selectedEvidenceReview?.source === "portal_request"
                        ? "Portal request"
                        : "Request pack"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  File Link
                </p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {props.selectedEvidenceReview?.fileUrl ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border p-3 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Storage / Import Reference
                </p>
                <p className="mt-1 break-all text-sm text-muted-foreground">
                  {props.selectedEvidenceReview?.storagePath ||
                    props.selectedEvidenceReview?.sourceReference ||
                    "No storage path recorded."}
                </p>
              </div>
            </div>
            {props.selectedEvidenceReview?.fileUrl ? (
              <div className="rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>
                  {selectedPreviewKind === "image" || selectedPreviewKind === "text" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => props.setShouldLoadSelectedEvidencePreview(true)}
                      disabled={props.isSelectedEvidencePreviewLoading}
                    >
                      {props.isSelectedEvidencePreviewLoading
                        ? "Loading Preview..."
                        : props.shouldLoadSelectedEvidencePreview
                          ? "Reload Preview"
                          : "Load Preview"}
                    </Button>
                  ) : null}
                </div>
                <div
                  key={`${selectedEvidenceReviewKey}:${selectedPreviewKind}`}
                  className="mt-3 overflow-hidden rounded-md border bg-muted/20"
                >
                  {!props.shouldLoadSelectedEvidencePreview &&
                  (selectedPreviewKind === "image" || selectedPreviewKind === "text") ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      Inline preview is available for this file. Load it on demand to keep the
                      evidence dialog stable.
                    </div>
                  ) : props.isSelectedEvidencePreviewLoading ? (
                    <div className="p-4 text-sm text-muted-foreground">Loading preview...</div>
                  ) : props.selectedEvidencePreviewUrl && selectedPreviewKind === "image" ? (
                    <img
                      src={props.selectedEvidencePreviewUrl}
                      alt={
                        props.selectedEvidenceReview.fileName ??
                        props.selectedEvidenceReview.title ??
                        "Stored evidence"
                      }
                      className="max-h-[60vh] w-full object-contain"
                    />
                  ) : props.selectedEvidencePreviewUrl && selectedPreviewKind === "pdf" ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      PDF preview is opened through a separate browser view in this workspace. Use{" "}
                      <span className="font-medium text-foreground">Open File</span> or{" "}
                      <span className="font-medium text-foreground">Download</span> to inspect the
                      scanned document.
                    </div>
                  ) : props.selectedEvidencePreviewUrl && selectedPreviewKind === "text" ? (
                    <iframe
                      src={props.selectedEvidencePreviewUrl}
                      title={
                        props.selectedEvidenceReview.fileName ??
                        props.selectedEvidenceReview.title ??
                        "Stored evidence"
                      }
                      className="h-[60vh] w-full bg-white"
                    />
                  ) : props.selectedEvidencePreviewError ? (
                    <div className="p-4 text-sm text-muted-foreground">
                      {props.selectedEvidencePreviewError}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Inline preview is not available for this file type. Use{" "}
                      <span className="font-medium text-foreground">Open File</span> or{" "}
                      <span className="font-medium text-foreground">Download</span>.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            </div>
            <div className="border-t px-6 py-4">
              <div className="flex flex-wrap justify-end gap-2">
            {props.selectedEvidenceReview?.certificate ? (
              <>
                {props.approvedControlledDocumentByCertificateId.get(
                  props.selectedEvidenceReview.certificate.id
                ) ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const certificateId = props.selectedEvidenceReview?.certificate?.id;
                      if (!certificateId) return;
                      const document =
                        props.approvedControlledDocumentByCertificateId.get(certificateId) ?? null;
                      if (!document) return;
                      props.openLevelIIIDocumentRecord(document.id, { action: "preview" });
                    }}
                  >
                    Released Document
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    props.setSelectedCertificateHistory(props.selectedEvidenceReview?.certificate ?? null);
                    props.setSelectedEvidenceReview(null);
                  }}
                >
                  History
                </Button>
                {props.selectedEvidenceReview.certificate.approvalStatus === "draft" ||
                props.selectedEvidenceReview.certificate.approvalStatus === "rejected" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      props.setSelectedEvidenceReview(null);
                      if (props.selectedEvidenceReview?.certificate) {
                        props.openCertificateSignOffDialog(
                          props.selectedEvidenceReview.certificate,
                          "submit"
                        );
                      }
                    }}
                  >
                    Open Sign-Off
                  </Button>
                ) : null}
                {props.selectedEvidenceReview.certificate.approvalStatus === "in_review" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        props.setSelectedEvidenceReview(null);
                        if (props.selectedEvidenceReview?.certificate) {
                          props.openCertificateSignOffDialog(
                            props.selectedEvidenceReview.certificate,
                            "approve"
                          );
                        }
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        props.setSelectedEvidenceReview(null);
                        if (props.selectedEvidenceReview?.certificate) {
                          props.openCertificateSignOffDialog(
                            props.selectedEvidenceReview.certificate,
                            "reject"
                          );
                        }
                      }}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
                {props.selectedEvidenceReview.certificate.approvalStatus === "approved" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      props.setSelectedEvidenceReview(null);
                      if (props.selectedEvidenceReview?.certificate) {
                        props.openCertificateSignOffDialog(
                          props.selectedEvidenceReview.certificate,
                          "reopen"
                        );
                      }
                    }}
                  >
                    Reopen
                  </Button>
                ) : null}
              </>
            ) : null}
            {props.selectedEvidenceReview?.requirement ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  props.setSelectedEvidenceReview(null);
                  props.openTechnicianComplianceRecord(props.selectedEvidenceReview?.requirement);
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Open Record
              </Button>
            ) : null}
            {props.selectedEvidenceReview?.portalRequest ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  props.setSelectedEvidenceReview(null);
                  props.openPortalRequestManagement(props.selectedEvidenceReview?.portalRequest);
                }}
              >
                Manage Request
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={closeSelectedEvidenceReview}
            >
              Close
            </Button>
            <Button type="button" variant="outline" onClick={props.copySelectedEvidenceReference}>
              Copy Reference
            </Button>
            <Button type="button" variant="outline" onClick={props.downloadSelectedEvidenceFile}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button type="button" onClick={props.openSelectedEvidenceFile}>
              <Download className="mr-2 h-4 w-4" />
              Open File
            </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={Boolean(props.pendingControlledDocumentDecision)}
        onOpenChange={(open) => {
          if (!open) {
            props.closeControlledLevelIIICertificateDecision();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {props.pendingControlledDocumentDecision?.action === "approve"
                ? "Approve Controlled Certificate Document"
                : "Reject Controlled Certificate Document"}
            </DialogTitle>
            <DialogDescription>
              {props.pendingControlledDocumentDecision
                ? props.pendingControlledDocumentDecision.document.title
                : "Capture the review decision for this controlled certificate document."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="controlled-document-review-note">
              {props.pendingControlledDocumentDecision?.action === "approve"
                ? "Approval Note"
                : "Rejection Reason"}
            </Label>
            <Textarea
              id="controlled-document-review-note"
              value={props.controlledDocumentDecisionNote}
              onChange={(event) => props.setControlledDocumentDecisionNote(event.target.value)}
              rows={5}
              placeholder={
                props.pendingControlledDocumentDecision?.action === "approve"
                  ? "Add an optional approval note."
                  : "Enter the rejection reason."
              }
              disabled={
                props.approveControlledDocumentPending || props.rejectControlledDocumentPending
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={props.closeControlledLevelIIICertificateDecision}
              disabled={
                props.approveControlledDocumentPending || props.rejectControlledDocumentPending
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                props.approveControlledDocumentPending ||
                props.rejectControlledDocumentPending ||
                (props.pendingControlledDocumentDecision?.action === "reject" &&
                  !props.controlledDocumentDecisionNote.trim())
              }
              onClick={() => void props.confirmControlledLevelIIICertificateDecision()}
            >
              {props.pendingControlledDocumentDecision?.action === "approve"
                ? props.approveControlledDocumentPending
                  ? "Approving..."
                  : "Approve Document"
                : props.rejectControlledDocumentPending
                  ? "Rejecting..."
                  : "Reject Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(props.pendingCertificateSignOff)}
        onOpenChange={(open) => {
          if (!open) {
            props.closeCertificateSignOffDialog();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Certificate Sign-Off</DialogTitle>
            <DialogDescription>
              {props.pendingCertificateSignOff
                ? `${props.pendingCertificateSignOff.certificate.certificateNumber} | ${props.getLevelIIITechnicianName(props.pendingCertificateSignOff.certificate.technicianId)}`
                : "Capture the sign-off note for this certificate action."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">
                Action:{" "}
                {props.pendingCertificateSignOff?.action === "submit"
                  ? "Open Sign-Off"
                  : props.pendingCertificateSignOff?.action === "approve"
                    ? "Approve"
                    : props.pendingCertificateSignOff?.action === "reject"
                      ? "Reject"
                      : "Reopen"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {props.pendingCertificateSignOff?.action === "approve" ||
                props.pendingCertificateSignOff?.action === "reject"
                  ? "A reviewer note is required for this action."
                  : "Add context for the sign-off transition if needed."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-signoff-note">Sign-Off Note</Label>
              <Textarea
                id="certificate-signoff-note"
                value={props.certificateSignOffNote}
                onChange={(event) => props.setCertificateSignOffNote(event.target.value)}
                rows={5}
                placeholder="Enter the review decision, reason, or follow-up instruction..."
                disabled={props.signOffTechnicianCertificatePending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={props.closeCertificateSignOffDialog}
              disabled={props.signOffTechnicianCertificatePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                props.signOffTechnicianCertificatePending ||
                ((props.pendingCertificateSignOff?.action === "approve" ||
                  props.pendingCertificateSignOff?.action === "reject") &&
                  !props.certificateSignOffNote.trim())
              }
              onClick={async () => {
                if (!props.pendingCertificateSignOff) return;
                const success = await props.handleSignOffLevelIIICertificate(
                  props.pendingCertificateSignOff.certificate,
                  props.pendingCertificateSignOff.action,
                  props.certificateSignOffNote
                );
                if (success) {
                  props.closeCertificateSignOffDialog();
                }
              }}
            >
              {props.signOffTechnicianCertificatePending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(props.selectedCertificateHistory)}
        onOpenChange={(open) => {
          if (!open) {
            props.setSelectedCertificateHistory(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Certificate History</DialogTitle>
            <DialogDescription>
              {props.selectedCertificateHistory
                ? `${props.selectedCertificateHistory.certificateNumber} | ${props.getLevelIIITechnicianName(props.selectedCertificateHistory.technicianId)}`
                : "Review certificate lifecycle events and generated exports."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {props.selectedCertificateHistory ? (
              <div>
                <p className="mb-2 text-sm font-medium">Released Document</p>
                <div className="rounded-lg border p-4">
                  {props.approvedControlledDocumentByCertificateId.get(
                    props.selectedCertificateHistory.id
                  ) ? (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">
                          {
                            props.approvedControlledDocumentByCertificateId.get(
                              props.selectedCertificateHistory.id
                            )?.title
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Approved controlled document is currently treated as the primary released
                          output for this certificate.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const certificateId = props.selectedCertificateHistory?.id;
                          if (!certificateId) return;
                          const document =
                            props.approvedControlledDocumentByCertificateId.get(certificateId) ??
                            null;
                          if (!document) return;
                          props.openLevelIIIDocumentRecord(document.id, { action: "preview" });
                        }}
                      >
                        Open Documents
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No approved controlled document is linked yet. This certificate still relies
                      on direct file export or stored file linkage.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
            <div>
              <p className="mb-2 text-sm font-medium">Lifecycle Audit Trail</p>
              <div className="rounded-lg border">
                {props.selectedCertificateAuditTrailLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Loading certificate lifecycle history...
                  </div>
                ) : props.selectedCertificateAuditTrail.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No certificate lifecycle history recorded yet.
                  </div>
                ) : (
                  <div className="divide-y">
                    {props.selectedCertificateAuditTrail.map((entry) => (
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

            <div>
              <p className="mb-2 text-sm font-medium">Export History</p>
              <div className="rounded-lg border">
                {props.technicianCertificateHistoryLoading ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Loading certificate export history...
                  </div>
                ) : props.technicianCertificateHistory.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No certificate exports have been recorded yet.
                  </div>
                ) : (
                  <div className="divide-y">
                    {props.technicianCertificateHistory.map((entry) => (
                      <div key={entry.id} className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{entry.exportFormat.toUpperCase()}</Badge>
                            <span className="text-sm font-medium">{entry.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {entry.createdAt
                                ? new Date(entry.createdAt).toLocaleString()
                                : "Unknown time"}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => props.handleReplayLevelIIICertificateExport(entry)}
                            >
                              Re-export
                            </Button>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {entry.actorName || entry.actorEmail || "Unknown user"}
                          {entry.title ? ` | ${entry.title}` : ""}
                        </p>
                        {entry.artifactSummary ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(entry.artifactSummary)
                              .filter(([, value]) => Boolean(value))
                              .slice(0, 6)
                              .map(([key, value]) => (
                                <Badge key={key} variant="secondary">
                                  {`${key}: ${value}`}
                                </Badge>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => props.setSelectedCertificateHistory(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={props.isTechnicianDirectUploadOpen}
        onOpenChange={(open) => {
          props.setIsTechnicianDirectUploadOpen(open);
          if (!open) {
            props.setTechnicianDirectUploadFormValues(props.createEmptyTechnicianDirectUploadForm());
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Technician Document</DialogTitle>
            <DialogDescription>
              Upload a technician document directly from the Level III workspace. The app will
              create the compliance rule and row if they do not exist yet.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="technician-direct-upload-type">Document Type</Label>
              <select
                id="technician-direct-upload-type"
                value={props.technicianDirectUploadFormValues.documentLabel}
                onChange={(event) => props.handleTechnicianDirectUploadRuleChange(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={uploadPending}
              >
                <option value="" disabled>
                  Select a document type
                </option>
                {props.availableTechnicianDirectUploadRules.map((rule) => (
                  <option key={`${rule.label}-${rule.storagePath}`} value={rule.label}>
                    {`${rule.displayLabel} | ${rule.label}`}
                  </option>
                ))}
              </select>
            </div>
            {props.availableTechnicianDirectUploadRules.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground md:col-span-2">
                Every listed document already has stored evidence. Use the technician document rows
                or record actions below to replace an existing file.
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="technician-direct-upload-file-name">Stored File Name</Label>
              <Input
                id="technician-direct-upload-file-name"
                value={props.technicianDirectUploadFormValues.fileName}
                onChange={(event) =>
                  props.setTechnicianDirectUploadFormValues((current) => ({
                    ...current,
                    fileName: event.target.value,
                  }))
                }
                placeholder="Technician Name - Document"
                disabled={uploadPending}
              />
            </div>

            {props.selectedDirectUploadDefinition?.validityDays ? (
              <div className="space-y-2">
                <Label htmlFor="technician-direct-upload-issued-at">Issued Date</Label>
                <Input
                  id="technician-direct-upload-issued-at"
                  type="date"
                  value={props.technicianDirectUploadFormValues.issuedAt}
                  onChange={(event) =>
                    props.setTechnicianDirectUploadFormValues((current) => ({
                      ...current,
                      issuedAt: event.target.value,
                    }))
                  }
                  disabled={uploadPending}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Expiry Rule</Label>
                <div className="flex h-10 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
                  This document type is configured with no expiry.
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="technician-direct-upload-notes">Notes</Label>
              <Textarea
                id="technician-direct-upload-notes"
                value={props.technicianDirectUploadFormValues.notes}
                onChange={(event) =>
                  props.setTechnicianDirectUploadFormValues((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional context for this upload"
                disabled={uploadPending}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="technician-direct-upload-file">Document File</Label>
              <Input
                id="technician-direct-upload-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt"
                onChange={props.handleTechnicianDirectUploadFileChange}
                disabled={uploadPending}
              />
              <p className="text-xs text-muted-foreground">
                Upload the technician document to create or update the linked compliance evidence.
              </p>
              {props.technicianDirectUploadFormValues.attachmentFileName ? (
                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                  <p className="font-medium">
                    {props.technicianDirectUploadFormValues.attachmentFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This file will be stored against the selected technician compliance record.
                  </p>
                </div>
              ) : null}
            </div>

            {props.selectedComplianceTechnician && props.selectedDirectUploadRule ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground md:col-span-2">
                <p>
                  Uploading for{" "}
                  <span className="font-medium text-foreground">
                    {props.selectedComplianceTechnician.name}
                  </span>
                  .
                </p>
                <p className="mt-1">
                  Suggested file name:{" "}
                  <span className="font-medium text-foreground">
                    {props.selectedDirectUploadRule.suggestedFileName}
                  </span>
                </p>
                <p className="mt-1">
                  Suggested folder:{" "}
                  <span className="font-medium text-foreground">
                    {props.selectedDirectUploadRule.storagePath}
                  </span>
                </p>
                <p className="mt-1">
                  Expiry rule:{" "}
                  <span className="font-medium text-foreground">
                    {props.selectedDirectUploadDefinition?.validityDays
                      ? `${props.selectedDirectUploadDefinition.validityDays} day validity from issued date`
                      : "N/A"}
                  </span>
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                props.setIsTechnicianDirectUploadOpen(false);
                props.setTechnicianDirectUploadFormValues(props.createEmptyTechnicianDirectUploadForm());
              }}
              disabled={uploadPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void props.handleSubmitTechnicianDirectUpload().catch((error) => {
                  toast.error(error instanceof Error ? error.message : "Could not upload document.");
                });
              }}
              disabled={uploadPending || props.availableTechnicianDirectUploadRules.length === 0}
            >
              {uploadPending ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
