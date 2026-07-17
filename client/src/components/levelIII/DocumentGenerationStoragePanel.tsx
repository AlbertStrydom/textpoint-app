import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

type DocumentGenerationFilterOption = {
  value: string;
  label: string;
  count: number;
};

type ControlledDocument = {
  id: number;
  tags?: Record<string, unknown> | null;
};

type CertificateRecord = {
  id: number;
  certificateNumber: string;
  approvalStatus: string;
  status: string;
};

type TechnicianRecord = {
  id: number;
  name: string;
};

type StorageTarget = {
  label: string;
  path: string;
};

type DocumentGenerationItem = {
  certificate: CertificateRecord;
  technician: TechnicianRecord | null;
  priorityLabel: string;
  priorityRank: number;
  recommendedFileName: string;
  controlledDocumentCount: number;
  controlledDraftCount: number;
  controlledIssuedCount: number;
  controlledInReviewCount: number;
  controlledRejectedCount: number;
  hasReleaseExport: boolean;
  hasApprovedControlledDocument: boolean;
  hasStoredFile: boolean;
  latestReleaseExport: {
    createdAt: string | Date | null;
    exportFormat: "html" | "pdf";
  } | null;
  reasons: string[];
  storageTargets: StorageTarget[];
  latestControlledDocument: ControlledDocument | null;
};

type HandledEntry = {
  signature: string;
  certificateNumber: string;
  technicianName: string;
  priorityLabel: string;
  handledAt: string;
};

type DocumentGenerationSummary = {
  readyForFinalExport: number;
  blockedByApproval: number;
  missingStoredFiles: number;
  sourceBackedImports: number;
  missingControlledDocs: number;
  controlledDrafts: number;
  controlledInReview: number;
  controlledRejected: number;
  releasedByControlledDocs: number;
  techniciansWithAutomationTargets: number;
  items: DocumentGenerationItem[];
};

type DocumentGenerationStoragePanelProps = {
  levelIIIDocumentGenerationSummary: DocumentGenerationSummary;
  levelIIICertificateReleaseQueueItems: readonly DocumentGenerationItem[];
  levelIIICertificateReleaseQueueSummary: {
    total: number;
    controlledReady: number;
    certificateReady: number;
    sourceImports: number;
    exportedPendingStorage: number;
  };
  openDocumentsPage: () => void;
  levelIIIDocumentGenerationFilterOptions: readonly DocumentGenerationFilterOption[];
  selectedDocumentGenerationFilter: string;
  setSelectedDocumentGenerationFilter: (value: string) => void;
  filteredLevelIIIDocumentGenerationItems: readonly DocumentGenerationItem[];
  primaryFilteredDocumentGenerationItem: DocumentGenerationItem | null;
  batchDocumentGenerationActionLabel: string | null;
  batchDocumentGenerationCandidatesCount: number;
  documentGenerationBatchAction: string | null;
  runDocumentGenerationBatchAction: () => Promise<void> | void;
  runCertificateReleaseBatchAction: () => Promise<void> | void;
  openCertificateSignOffDialog: (
    certificate: CertificateRecord,
    action: "submit" | "approve" | "reject" | "reopen"
  ) => void;
  exportPrimaryHtml: (item: DocumentGenerationItem) => Promise<void> | void;
  createControlledLevelIIICertificateDocument: (certificate: CertificateRecord) => Promise<void> | void;
  submitControlledLevelIIICertificateDocumentForReview: (document: ControlledDocument) => Promise<void> | void;
  setSelectedCertificateHistory: (certificate: CertificateRecord) => void;
  markDocumentGenerationItemHandled: (item: DocumentGenerationItem) => void;
  recentHandledDocumentGenerationEntries: readonly HandledEntry[];
  clearHandledDocumentGenerationHistory: () => void;
  restoreHandledDocumentGenerationEntry: (entry: HandledEntry) => void;
  getCertificateApprovalBadge: (approvalStatus: string) => ReactNode;
  getCertificateStatusBadge: (status: string) => ReactNode;
  handlePreviewLevelIIICertificate: (certificate: CertificateRecord) => void;
  openControlledApprovalDecision: (document: ControlledDocument, action: "approve" | "reject") => void;
  exportCertificateHtml: (certificate: CertificateRecord) => Promise<void> | void;
  exportCertificatePdf: (certificate: CertificateRecord) => Promise<void> | void;
  openCertificateStorageLinker: (item: DocumentGenerationItem) => void;
  setSelectedComplianceTechnicianId: (technicianId: number) => void;
  openLevelIIIDocumentRecordPreview: (documentId: number) => void;
  openLevelIIIDocumentRecord: (documentId: number) => void;
};

export function DocumentGenerationStoragePanel(props: DocumentGenerationStoragePanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Document Generation And Storage</CardTitle>
            <CardDescription>
              Control final certificate output, stored file coverage, and technician automation targets from one Level III queue.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={props.openDocumentsPage}>
            Open Documents
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric title="Ready For Export" value={props.levelIIIDocumentGenerationSummary.readyForFinalExport} />
            <Metric title="Approval Blocked" value={props.levelIIIDocumentGenerationSummary.blockedByApproval} />
            <Metric title="Missing Stored File" value={props.levelIIIDocumentGenerationSummary.missingStoredFiles} />
            <Metric title="Source Imports" value={props.levelIIIDocumentGenerationSummary.sourceBackedImports} />
            <Metric title="Missing Controlled" value={props.levelIIIDocumentGenerationSummary.missingControlledDocs} />
            <Metric title="Controlled Drafts" value={props.levelIIIDocumentGenerationSummary.controlledDrafts} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric title="Controlled Review" value={props.levelIIIDocumentGenerationSummary.controlledInReview} />
            <Metric title="Controlled Rejected" value={props.levelIIIDocumentGenerationSummary.controlledRejected} />
            <Metric title="Released By Controlled" value={props.levelIIIDocumentGenerationSummary.releasedByControlledDocs} />
            <Metric title="Automation Targets" value={props.levelIIIDocumentGenerationSummary.techniciansWithAutomationTargets} />
          </div>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Use this queue to finalize approved certificates first, then backfill stored files for imports and confirm technician document paths match the automation rules.
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Technician Certificate Release Queue</CardTitle>
          <CardDescription>
            Approved technician certificates waiting for final stored release output.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric title="Pending Release" value={props.levelIIICertificateReleaseQueueSummary.total} />
            <Metric title="Controlled Ready" value={props.levelIIICertificateReleaseQueueSummary.controlledReady} />
            <Metric title="Cert Ready" value={props.levelIIICertificateReleaseQueueSummary.certificateReady} />
            <Metric title="Source Imports" value={props.levelIIICertificateReleaseQueueSummary.sourceImports} />
            <Metric
              title="Exported Pending Storage"
              value={props.levelIIICertificateReleaseQueueSummary.exportedPendingStorage}
            />
          </div>
          {props.levelIIICertificateReleaseQueueSummary.total > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={props.documentGenerationBatchAction !== null}
              onClick={() => void props.runCertificateReleaseBatchAction()}
            >
              {props.documentGenerationBatchAction === "export_html_release_queue"
                ? "Running Batch..."
                : `Export HTML Batch (${props.levelIIICertificateReleaseQueueSummary.total})`}
            </Button>
          ) : null}
          {props.levelIIICertificateReleaseQueueItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No approved technician certificates are currently waiting for release output.
            </div>
          ) : (
            <div className="space-y-3">
              {props.levelIIICertificateReleaseQueueItems.slice(0, 4).map((item) => (
                <div key={`release-${item.certificate.id}`} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.certificate.certificateNumber}</p>
                        {props.getCertificateApprovalBadge(item.certificate.approvalStatus)}
                        <Badge className="bg-slate-100 text-slate-900">
                          {item.hasApprovedControlledDocument ? "Controlled release ready" : "Certificate release ready"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.technician?.name ?? "Unknown technician"} | {item.recommendedFileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.hasApprovedControlledDocument
                          ? "Approved controlled document exists and no stored certificate file is linked yet."
                          : "Certificate is approved and still needs first release export."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.reasons.slice(0, 3).map((reason) => (
                          <Badge key={`release-reason-${item.certificate.id}-${reason}`} variant="outline">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => props.handlePreviewLevelIIICertificate(item.certificate)}>
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void props.exportCertificateHtml(item.certificate)}>
                        HTML
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void props.exportCertificatePdf(item.certificate)}>
                        PDF
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => props.openCertificateStorageLinker(item)}
                      >
                        Store / Link File
                      </Button>
                      {item.technician ? (
                        <Button variant="ghost" size="sm" onClick={() => props.setSelectedComplianceTechnicianId(item.technician!.id)}>
                          Documents
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => props.setSelectedCertificateHistory(item.certificate)}>
                        History
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Generation Watchlist</CardTitle>
          <CardDescription>
            Open the certificates that still need final export, stored file linkage, or technician document follow-through.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {props.levelIIIDocumentGenerationFilterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={props.selectedDocumentGenerationFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => props.setSelectedDocumentGenerationFilter(option.value)}
              >
                {option.label} ({option.count})
              </Button>
            ))}
          </div>
          {props.selectedDocumentGenerationFilter !== "all" ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Showing {props.filteredLevelIIIDocumentGenerationItems.length} item
              {props.filteredLevelIIIDocumentGenerationItems.length === 1 ? "" : "s"} for{" "}
              {
                props.levelIIIDocumentGenerationFilterOptions.find(
                  (option) => option.value === props.selectedDocumentGenerationFilter
                )?.label
              }
              .
            </div>
          ) : null}
          {props.selectedDocumentGenerationFilter !== "all" && props.primaryFilteredDocumentGenerationItem ? (
            <div className="rounded-lg border p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Quick action target: {props.primaryFilteredDocumentGenerationItem.certificate.certificateNumber}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {props.primaryFilteredDocumentGenerationItem.technician?.name ?? "Unknown technician"} |{" "}
                    {props.primaryFilteredDocumentGenerationItem.priorityLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {props.batchDocumentGenerationActionLabel &&
                  props.batchDocumentGenerationCandidatesCount > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={props.documentGenerationBatchAction !== null}
                      onClick={() => void props.runDocumentGenerationBatchAction()}
                    >
                      {props.documentGenerationBatchAction
                        ? "Running Batch..."
                        : `${props.batchDocumentGenerationActionLabel} (${props.batchDocumentGenerationCandidatesCount})`}
                    </Button>
                  ) : null}
                  {props.selectedDocumentGenerationFilter === "approval_blocked" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        props.openCertificateSignOffDialog(
                          props.primaryFilteredDocumentGenerationItem!.certificate,
                          props.primaryFilteredDocumentGenerationItem!.certificate.approvalStatus ===
                            "in_review"
                            ? "approve"
                            : "submit"
                        )
                      }
                    >
                      Open Sign-Off
                    </Button>
                  ) : null}
                  {props.selectedDocumentGenerationFilter === "ready_to_release" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => void props.exportPrimaryHtml(props.primaryFilteredDocumentGenerationItem!)}>
                      Export HTML
                    </Button>
                  ) : null}
                  {props.selectedDocumentGenerationFilter === "missing_controlled" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void props.createControlledLevelIIICertificateDocument(
                          props.primaryFilteredDocumentGenerationItem!.certificate
                        )
                      }
                    >
                      Create Draft
                    </Button>
                  ) : null}
                  {props.selectedDocumentGenerationFilter === "draft_progress" &&
                  props.primaryFilteredDocumentGenerationItem.latestControlledDocument ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void props.submitControlledLevelIIICertificateDocumentForReview(
                          props.primaryFilteredDocumentGenerationItem!.latestControlledDocument!
                        )
                      }
                    >
                      Submit Review
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      props.setSelectedCertificateHistory(props.primaryFilteredDocumentGenerationItem!.certificate)
                    }
                  >
                    Open History
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      props.markDocumentGenerationItemHandled(props.primaryFilteredDocumentGenerationItem!)
                    }
                  >
                    Mark Handled
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          {props.recentHandledDocumentGenerationEntries.length > 0 ? (
            <div className="rounded-lg border bg-muted/10 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Recently Cleared</p>
                <Button type="button" size="sm" variant="ghost" onClick={props.clearHandledDocumentGenerationHistory}>
                  Clear History
                </Button>
              </div>
              <div className="space-y-2">
                {props.recentHandledDocumentGenerationEntries.map((entry) => (
                  <div
                    key={entry.signature}
                    className="flex flex-col gap-2 rounded-md border px-3 py-2 text-xs lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <p className="font-medium">
                        {entry.certificateNumber} | {entry.technicianName}
                      </p>
                      <p className="text-muted-foreground">
                        {entry.priorityLabel} cleared {new Date(entry.handledAt).toLocaleString()}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={() => props.restoreHandledDocumentGenerationEntry(entry)}>
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {props.filteredLevelIIIDocumentGenerationItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              {props.levelIIIDocumentGenerationSummary.items.length === 0
                ? "No Level III document-generation blockers were found in the current certificate set."
                : "No watchlist items match the selected filter."}
            </div>
          ) : (
            props.filteredLevelIIIDocumentGenerationItems.map((item) => (
              <div key={item.certificate.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.certificate.certificateNumber}</p>
                      {props.getCertificateApprovalBadge(item.certificate.approvalStatus)}
                      {props.getCertificateStatusBadge(item.certificate.status)}
                      <Badge className="bg-slate-100 text-slate-900">{item.priorityLabel}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.technician?.name ?? "Unknown technician"} | {item.recommendedFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Controlled docs: {item.controlledDocumentCount} total | drafts {item.controlledDraftCount} | issued {item.controlledIssuedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Review queue: in review {item.controlledInReviewCount} | rejected {item.controlledRejectedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Release source:{" "}
                      {item.hasStoredFile
                        ? "Stored certificate file"
                        : item.hasReleaseExport
                          ? `Release export recorded${
                              item.latestReleaseExport?.createdAt
                                ? ` ${new Date(item.latestReleaseExport.createdAt).toLocaleDateString()}`
                                : ""
                            }`
                          : item.hasApprovedControlledDocument
                        ? "Approved controlled document"
                        : "Not released yet"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.reasons.map((reason) => (
                        <Badge key={`${item.certificate.id}-${reason}`} variant="outline">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                    {item.storageTargets.length > 0 ? (
                      <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {item.storageTargets.map((target) => `${target.label}: ${target.path}`).join(" | ")}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => props.handlePreviewLevelIIICertificate(item.certificate)}>
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.controlledDraftCount > 0}
                      onClick={() => void props.createControlledLevelIIICertificateDocument(item.certificate)}
                    >
                      Create Draft
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !item.latestControlledDocument ||
                        String(item.latestControlledDocument.tags?.approvalStatus || "Draft") === "In Review" ||
                        String(item.latestControlledDocument.tags?.approvalStatus || "Draft") === "Approved"
                      }
                      onClick={() =>
                        item.latestControlledDocument
                          ? void props.submitControlledLevelIIICertificateDocumentForReview(item.latestControlledDocument)
                          : undefined
                      }
                    >
                      Submit Review
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !item.latestControlledDocument ||
                        String(item.latestControlledDocument.tags?.approvalStatus || "Draft") !== "In Review"
                      }
                      onClick={() =>
                        item.latestControlledDocument
                          ? props.openControlledApprovalDecision(item.latestControlledDocument, "approve")
                          : undefined
                      }
                    >
                      Approve Doc
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !item.latestControlledDocument ||
                        String(item.latestControlledDocument.tags?.approvalStatus || "Draft") !== "In Review"
                      }
                      onClick={() =>
                        item.latestControlledDocument
                          ? props.openControlledApprovalDecision(item.latestControlledDocument, "reject")
                          : undefined
                      }
                    >
                      Reject Doc
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.certificate.approvalStatus !== "approved"}
                      onClick={() => void props.exportCertificateHtml(item.certificate)}
                    >
                      HTML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={item.certificate.approvalStatus !== "approved"}
                      onClick={() => void props.exportCertificatePdf(item.certificate)}
                    >
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => props.setSelectedCertificateHistory(item.certificate)}>
                      History
                    </Button>
                    {item.technician ? (
                      <Button variant="ghost" size="sm" onClick={() => props.setSelectedComplianceTechnicianId(item.technician!.id)}>
                        Documents
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="sm" onClick={() => props.markDocumentGenerationItemHandled(item)}>
                      Handled
                    </Button>
                    {item.latestControlledDocument ? (
                      <Button variant="ghost" size="sm" onClick={() => props.openLevelIIIDocumentRecordPreview(item.latestControlledDocument!.id)}>
                        Preview Doc
                      </Button>
                    ) : null}
                    {item.latestControlledDocument ? (
                      <Button variant="ghost" size="sm" onClick={() => props.openLevelIIIDocumentRecord(item.latestControlledDocument!.id)}>
                        Open Draft
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
