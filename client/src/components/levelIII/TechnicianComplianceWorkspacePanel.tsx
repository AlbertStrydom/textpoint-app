import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Edit2, Plus, TriangleAlert, Upload } from "lucide-react";

type TechnicianComplianceWorkspacePanelProps = {
  createControlledLevelIIICertificateDocument: (record: any) => Promise<void> | void;
  clearHandledTechnicianDocumentQueueHistory: () => void;
  complianceMatrixLoading: boolean;
  exportCertificateHtml: (certificate: any) => Promise<void> | void;
  exportCertificatePdf: (certificate: any) => Promise<void> | void;
  filteredSelectedTechnicianBulkQueueItems: any[];
  formatExportDate: (value: string | Date | null | undefined) => string;
  formatCertificateValidityRule: (certificate: any) => string;
  formatLevelIIICategoryLabel: (value: string) => string;
  getCertificateApprovalBadge: (value: any) => ReactNode;
  getCertificateStatusBadge: (value: any) => ReactNode;
  handlePreviewLevelIIICertificate: (certificate: any) => void;
  getLevelIIITechnicianName: (technicianId: number) => string;
  getRequirementStatusBadge: (status: string) => ReactNode;
  latestTechnicianCertificateByTechnicianId: Map<number, any>;
  levelIIIRequirementDefinitions: any[];
  markTechnicianDocumentQueueItemHandled: (item: any) => void;
  nextCertificateLinkedRequirement: any | null;
  nextExpiredRequirement: any | null;
  nextMissingEvidenceRequirement: any | null;
  nextPendingReviewRequirement: any | null;
  openEvidenceReview: (payload: any) => void;
  openCertificateEditor: (certificate: any) => void;
  openCertificateSignOffDialog: (
    certificate: any,
    action: "submit" | "approve" | "reject" | "reopen"
  ) => void;
  openTechnicianComplianceRecord: (row: any) => void;
  openTechnicianDirectUploadDialog: (rule?: any) => void;
  openTechnicianRequirementUploadFromRow: (row: any) => void;
  recentHandledSelectedTechnicianBulkQueueEntries: any[];
  restoreHandledTechnicianDocumentQueueEntry: (entry: any) => void;
  selectedComplianceTechnician: any | null;
  selectedTechnicianDocumentGenerationItem: any | null;
  setSelectedCertificateHistory: (certificate: any) => void;
  submitControlledLevelIIICertificateDocumentForReview: (document: any) => Promise<void> | void;
  availableTechnicianDirectUploadRules: any[];
  selectedTechnicianDocumentControlSummary: any;
  selectedTechnicianDocumentPackGuide: any[];
  selectedTechnicianPendingReviewRows: any[];
  selectedTechnicianRequirementSummary: any;
  selectedTechnicianRequirementTableRows: any[];
  setEditingTechnicianRequirement: (row: any | null) => void;
  setEditingTechnicianRequirementDefinition: (row: any | null) => void;
  setIsTechnicianRequirementDefinitionFormOpen: (open: boolean) => void;
  setIsTechnicianRequirementFormOpen: (open: boolean) => void;
  technicianRequirementColumns: any[];
  technicianRequirementDefinitionColumns: any[];
};

type QueueFocusFilter =
  | "all"
  | "missing_evidence"
  | "pending_review"
  | "expired"
  | "current_without_evidence";

function matchesQueueFocusFilter(item: any, filter: QueueFocusFilter) {
  switch (filter) {
    case "missing_evidence":
      return item.queueLabel === "Missing Evidence";
    case "pending_review":
      return item.queueLabel === "Pending Review";
    case "expired":
      return item.queueLabel === "Expired";
    case "current_without_evidence":
      return item.queueLabel === "Current Without Evidence";
    default:
      return true;
  }
}

export function TechnicianComplianceWorkspacePanel({
  createControlledLevelIIICertificateDocument,
  clearHandledTechnicianDocumentQueueHistory,
  complianceMatrixLoading,
  exportCertificateHtml,
  exportCertificatePdf,
  filteredSelectedTechnicianBulkQueueItems,
  formatExportDate,
  formatCertificateValidityRule,
  formatLevelIIICategoryLabel,
  getCertificateApprovalBadge,
  getCertificateStatusBadge,
  handlePreviewLevelIIICertificate,
  getLevelIIITechnicianName,
  getRequirementStatusBadge,
  latestTechnicianCertificateByTechnicianId,
  levelIIIRequirementDefinitions,
  markTechnicianDocumentQueueItemHandled,
  nextCertificateLinkedRequirement,
  nextExpiredRequirement,
  nextMissingEvidenceRequirement,
  nextPendingReviewRequirement,
  openEvidenceReview,
  openCertificateEditor,
  openCertificateSignOffDialog,
  openTechnicianComplianceRecord,
  openTechnicianDirectUploadDialog,
  openTechnicianRequirementUploadFromRow,
  recentHandledSelectedTechnicianBulkQueueEntries,
  restoreHandledTechnicianDocumentQueueEntry,
  selectedComplianceTechnician,
  selectedTechnicianDocumentGenerationItem,
  setSelectedCertificateHistory,
  submitControlledLevelIIICertificateDocumentForReview,
  availableTechnicianDirectUploadRules,
  selectedTechnicianDocumentControlSummary,
  selectedTechnicianDocumentPackGuide,
  selectedTechnicianPendingReviewRows,
  selectedTechnicianRequirementSummary,
  selectedTechnicianRequirementTableRows,
  setEditingTechnicianRequirement,
  setEditingTechnicianRequirementDefinition,
  setIsTechnicianRequirementDefinitionFormOpen,
  setIsTechnicianRequirementFormOpen,
  technicianRequirementColumns,
  technicianRequirementDefinitionColumns,
}: TechnicianComplianceWorkspacePanelProps) {
  const [queueFocusFilter, setQueueFocusFilter] = useState<QueueFocusFilter>("all");
  const [requirementSearch, setRequirementSearch] = useState("");
  const [selectedQueueItemSignatures, setSelectedQueueItemSignatures] = useState<string[]>([]);
  const getSummaryCardClassName = (tone: "neutral" | "amber" | "rose" | "violet" | "emerald") =>
    tone === "amber"
      ? "border-amber-200 bg-amber-50/80"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50/85"
        : tone === "violet"
          ? "border-violet-200 bg-violet-50/80"
          : tone === "emerald"
            ? "border-emerald-200 bg-emerald-50/80"
            : "border-slate-200 bg-white";
  const getWatchlistCardClassName = (tone: "neutral" | "amber" | "rose" | "violet") =>
    tone === "amber"
      ? "border-amber-200 bg-amber-50/65 hover:bg-amber-100/60"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50/70 hover:bg-rose-100/65"
        : tone === "violet"
          ? "border-violet-200 bg-violet-50/65 hover:bg-violet-100/60"
          : "border-slate-200 hover:bg-muted/20";
  const latestCertificate = selectedComplianceTechnician
    ? latestTechnicianCertificateByTechnicianId.get(selectedComplianceTechnician.id)
    : null;
  const latestCertificateControlledDocument =
    latestCertificate &&
    selectedTechnicianDocumentGenerationItem?.certificate?.id === latestCertificate.id
      ? selectedTechnicianDocumentGenerationItem
      : null;
  const latestCertificateControlledAction =
    !latestCertificateControlledDocument
      ? null
      : latestCertificateControlledDocument.controlledRejectedCount > 0
        ? "Controlled correction needed"
        : latestCertificateControlledDocument.controlledInReviewCount > 0
          ? "Controlled review in progress"
          : latestCertificateControlledDocument.controlledDocumentCount === 0
            ? "Create first controlled draft"
            : latestCertificateControlledDocument.hasApprovedControlledDocument
              ? "Controlled document approved"
              : "Submit controlled draft";
  const buildQueueSignature = (item: any) =>
    `${item.row.technicianId}:${item.row.definitionId}:${item.queueLabel}`;
  const normalizedRequirementSearch = requirementSearch.trim().toLowerCase();
  const queueFocusOptions: Array<{
    value: QueueFocusFilter;
    label: string;
    count: number;
  }> = [
    { value: "all", label: "All", count: filteredSelectedTechnicianBulkQueueItems.length },
    {
      value: "missing_evidence",
      label: "Missing Evidence",
      count: filteredSelectedTechnicianBulkQueueItems.filter(
        (item: any) => item.queueLabel === "Missing Evidence"
      ).length,
    },
    {
      value: "pending_review",
      label: "Pending Review",
      count: filteredSelectedTechnicianBulkQueueItems.filter(
        (item: any) => item.queueLabel === "Pending Review"
      ).length,
    },
    {
      value: "expired",
      label: "Expired",
      count: filteredSelectedTechnicianBulkQueueItems.filter(
        (item: any) => item.queueLabel === "Expired"
      ).length,
    },
    {
      value: "current_without_evidence",
      label: "Current Without Evidence",
      count: filteredSelectedTechnicianBulkQueueItems.filter(
        (item: any) => item.queueLabel === "Current Without Evidence"
      ).length,
    },
  ];
  const visibleQueueItems = useMemo(
    () =>
      filteredSelectedTechnicianBulkQueueItems.filter((item: any) =>
        matchesQueueFocusFilter(item, queueFocusFilter)
      ),
    [filteredSelectedTechnicianBulkQueueItems, queueFocusFilter]
  );
  const uploadableVisibleQueueItems = useMemo(
    () => visibleQueueItems.filter((item: any) => item.supportsUpload),
    [visibleQueueItems]
  );
  const visibleQueueItemSignatures = useMemo(
    () => visibleQueueItems.map((item: any) => buildQueueSignature(item)),
    [visibleQueueItems]
  );
  const selectedVisibleQueueItems = useMemo(
    () =>
      visibleQueueItems.filter((item: any) =>
        selectedQueueItemSignatures.includes(buildQueueSignature(item))
      ),
    [selectedQueueItemSignatures, visibleQueueItems]
  );
  const uploadableSelectedVisibleQueueItems = useMemo(
    () => selectedVisibleQueueItems.filter((item: any) => item.supportsUpload),
    [selectedVisibleQueueItems]
  );
  const allVisibleQueueItemsSelected =
    visibleQueueItemSignatures.length > 0 &&
    visibleQueueItemSignatures.every((signature) =>
      selectedQueueItemSignatures.includes(signature)
    );
  const filteredRequirementTableRows = useMemo(() => {
    if (!normalizedRequirementSearch) {
      return selectedTechnicianRequirementTableRows;
    }
    return selectedTechnicianRequirementTableRows.filter((row: any) => {
      const haystack = [
        row.definitionName,
        row.definitionCategory,
        row.status,
        row.latestDocumentName,
        row.latestSourceReferenceFileName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedRequirementSearch);
    });
  }, [normalizedRequirementSearch, selectedTechnicianRequirementTableRows]);
  const visibleDocumentPackRules = useMemo(() => {
    if (!normalizedRequirementSearch) {
      return selectedTechnicianDocumentPackGuide;
    }
    return selectedTechnicianDocumentPackGuide.filter((rule: any) => {
      const haystack = [
        rule.displayLabel,
        rule.label,
        rule.storagePath,
        rule.suggestedFileName,
        rule.matchedRequirement?.definitionName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedRequirementSearch);
    });
  }, [normalizedRequirementSearch, selectedTechnicianDocumentPackGuide]);
  const toggleQueueItemSelection = (item: any) => {
    const signature = buildQueueSignature(item);
    setSelectedQueueItemSignatures((current) =>
      current.includes(signature)
        ? current.filter((entry) => entry !== signature)
        : [...current, signature]
    );
  };
  const clearSelectedQueueItems = () => setSelectedQueueItemSignatures([]);
  const selectVisibleQueueItems = () =>
    setSelectedQueueItemSignatures((current) => {
      const next = new Set(current);
      visibleQueueItemSignatures.forEach((signature) => next.add(signature));
      return Array.from(next);
    });
  const markQueueItemsHandled = (items: any[]) => {
    items.forEach((item: any) => markTechnicianDocumentQueueItemHandled(item));
    const handled = new Set(items.map((item: any) => buildQueueSignature(item)));
    setSelectedQueueItemSignatures((current) =>
      current.filter((signature) => !handled.has(signature))
    );
  };
  useEffect(() => {
    setSelectedQueueItemSignatures([]);
  }, [selectedComplianceTechnician?.id]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Technician Compliance Documents</CardTitle>
          <CardDescription>
            Review required technician documents, track validity, and upload supporting
            evidence from inside the Level III workflow.
          </CardDescription>
        </div>
        {selectedComplianceTechnician ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{selectedComplianceTechnician.name}</Badge>
            <Button
              onClick={() => openTechnicianDirectUploadDialog()}
              disabled={availableTechnicianDirectUploadRules.length === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingTechnicianRequirement(null);
                setIsTechnicianRequirementFormOpen(true);
              }}
              disabled={levelIIIRequirementDefinitions.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Update Record
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedComplianceTechnician ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Choose a technician from the cards or the table above to open that technician&apos;s
            compliance and document workspace.
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-7">
              <Card className={getSummaryCardClassName("neutral")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Tracked</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.total}</p></CardContent></Card>
              <Card className={getSummaryCardClassName("emerald")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Current</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.current}</p></CardContent></Card>
              <Card className={getSummaryCardClassName("amber")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Expiring</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.expiring}</p></CardContent></Card>
              <Card className={getSummaryCardClassName("amber")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Expired</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.expired}</p></CardContent></Card>
              <Card className={getSummaryCardClassName("rose")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Missing</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.missing}</p></CardContent></Card>
              <Card className={getSummaryCardClassName("violet")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">Pending Review</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.pendingReview}</p></CardContent></Card>
              <Card className={getSummaryCardClassName("emerald")}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">With Evidence</p><p className="text-2xl font-semibold">{selectedTechnicianRequirementSummary.evidence}</p></CardContent></Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Document Control Operations</CardTitle>
                  <CardDescription>
                    Focus document-control work on missing evidence, expired records, review
                    backlog, and certificate-linked compliance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-3"><p className="text-xs uppercase text-rose-700">Missing Evidence</p><p className="mt-1 text-2xl font-semibold text-rose-900">{selectedTechnicianDocumentControlSummary.missingEvidenceRows.length}</p></div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3"><p className="text-xs uppercase text-amber-700">Expired</p><p className="mt-1 text-2xl font-semibold text-amber-900">{selectedTechnicianDocumentControlSummary.expiredRows.length}</p></div>
                    <div className="rounded-lg border border-violet-200 bg-violet-50/80 p-3"><p className="text-xs uppercase text-violet-700">Pending Review</p><p className="mt-1 text-2xl font-semibold text-violet-900">{selectedTechnicianDocumentControlSummary.pendingReviewRows.length}</p></div>
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3"><p className="text-xs uppercase text-emerald-700">Cert-Linked</p><p className="mt-1 text-2xl font-semibold text-emerald-900">{selectedTechnicianDocumentControlSummary.certificateLinkedRows.length}</p></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={!nextMissingEvidenceRequirement} onClick={() => nextMissingEvidenceRequirement ? openTechnicianRequirementUploadFromRow(nextMissingEvidenceRequirement) : null}><Upload className="mr-2 h-4 w-4" />Upload Next Missing</Button>
                    <Button type="button" variant="outline" size="sm" disabled={!nextPendingReviewRequirement} onClick={() => nextPendingReviewRequirement ? openTechnicianComplianceRecord(nextPendingReviewRequirement) : null}><Edit2 className="mr-2 h-4 w-4" />Review Next Pending</Button>
                    <Button type="button" variant="outline" size="sm" disabled={!nextExpiredRequirement} onClick={() => nextExpiredRequirement ? openTechnicianComplianceRecord(nextExpiredRequirement) : null}><TriangleAlert className="mr-2 h-4 w-4" />Open Next Expired</Button>
                    <Button type="button" variant="outline" size="sm" disabled={!nextCertificateLinkedRequirement} onClick={() => nextCertificateLinkedRequirement ? openTechnicianComplianceRecord(nextCertificateLinkedRequirement) : null}><Download className="mr-2 h-4 w-4" />Open Cert-Linked</Button>
                  </div>
                  {latestCertificate ? (
                    <div className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Latest Technician Certificate</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{latestCertificate.certificateNumber || "Unnumbered"}</Badge>
                            {getCertificateStatusBadge(latestCertificate.status)}
                            {getCertificateApprovalBadge(latestCertificate.approvalStatus)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewLevelIIICertificate(latestCertificate)}
                          >
                            Preview
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openCertificateEditor(latestCertificate)}
                          >
                            Open Certificate
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCertificateHistory(latestCertificate)}
                          >
                            History
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Validity: {formatCertificateValidityRule(latestCertificate)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Use this as the reference point when checking whether compliance records and
                        uploaded evidence match the currently active certificate.
                      </p>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">Approval Gate</p>
                          <p className="mt-1 text-sm font-medium">
                            {latestCertificate.approvalStatus === "approved"
                              ? "Approved"
                              : latestCertificate.approvalStatus === "in_review"
                                ? "Awaiting review"
                                : latestCertificate.approvalStatus === "rejected"
                                  ? "Rejected and blocked"
                                  : "Draft sign-off required"}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">Compliance Link</p>
                          <p className="mt-1 text-sm font-medium">
                            {selectedTechnicianDocumentControlSummary.certificateLinkedRows.length} linked row
                            {selectedTechnicianDocumentControlSummary.certificateLinkedRows.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">Release Readiness</p>
                          <p className="mt-1 text-sm font-medium">
                            {latestCertificateControlledDocument
                              ? latestCertificateControlledDocument.priorityLabel
                              : latestCertificate.approvalStatus === "approved"
                                ? "Ready for controlled output"
                                : "Blocked by certificate approval"}
                          </p>
                        </div>
                      </div>
                      {latestCertificateControlledDocument ? (
                        <div className="mt-3 rounded-lg border bg-muted/10 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase text-muted-foreground">
                                Controlled Document Queue
                              </p>
                              <p className="mt-1 text-sm font-medium">
                                {latestCertificateControlledAction}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>{latestCertificateControlledDocument.controlledDraftCount} draft</span>
                              <span>{latestCertificateControlledDocument.controlledInReviewCount} in review</span>
                              <span>{latestCertificateControlledDocument.controlledRejectedCount} rejected</span>
                              <span>{latestCertificateControlledDocument.controlledIssuedCount} issued</span>
                            </div>
                          </div>
                          {latestCertificateControlledDocument.reasons.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {latestCertificateControlledDocument.reasons
                                .slice(0, 3)
                                .map((reason: string) => (
                                  <Badge key={reason} variant="outline">
                                    {reason}
                                  </Badge>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(latestCertificate.approvalStatus === "draft" ||
                          latestCertificate.approvalStatus === "rejected") ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              openCertificateSignOffDialog(latestCertificate, "submit")
                            }
                          >
                            Open Sign-Off
                          </Button>
                        ) : null}
                        {latestCertificate.approvalStatus === "in_review" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                openCertificateSignOffDialog(latestCertificate, "approve")
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openCertificateSignOffDialog(latestCertificate, "reject")
                              }
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {latestCertificate.approvalStatus === "approved" ? (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                void createControlledLevelIIICertificateDocument(latestCertificate)
                              }
                            >
                              Create Controlled Draft
                            </Button>
                            {latestCertificateControlledDocument?.latestControlledDocument &&
                            !latestCertificateControlledDocument.hasApprovedControlledDocument &&
                            latestCertificateControlledDocument.controlledInReviewCount === 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void submitControlledLevelIIICertificateDocumentForReview(
                                    latestCertificateControlledDocument.latestControlledDocument
                                  )
                                }
                              >
                                Submit Controlled Review
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void exportCertificateHtml(latestCertificate)}
                            >
                              Export HTML
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void exportCertificatePdf(latestCertificate)}
                            >
                              Export PDF
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openCertificateSignOffDialog(latestCertificate, "reopen")
                              }
                            >
                              Reopen
                            </Button>
                          </>
                        ) : null}
                        {nextCertificateLinkedRequirement ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openTechnicianComplianceRecord(nextCertificateLinkedRequirement)
                            }
                          >
                            Open Linked Requirement
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No technician certificate is linked yet. Compliance can still be tracked, but
                      certificate-driven evidence checks will stay partial until one is issued.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Document Control Watchlists</CardTitle>
                  <CardDescription>Open the records that most likely need action first.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-rose-700">Missing Evidence</p>
                    {selectedTechnicianDocumentControlSummary.missingEvidenceRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No missing-evidence records.</div>
                    ) : (
                      selectedTechnicianDocumentControlSummary.missingEvidenceRows.slice(0, 5).map((row: any) => (
                        <button key={`missing-${row.technicianId}-${row.definitionId}`} type="button" className={`w-full rounded-lg border p-3 text-left ${getWatchlistCardClassName("rose")}`} onClick={() => openTechnicianComplianceRecord(row)}>
                          <p className="font-medium">{row.definitionName}</p>
                          <p className="text-sm text-muted-foreground">{formatLevelIIICategoryLabel(row.definitionCategory)} | no stored evidence</p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-amber-700">Expired / Pending</p>
                    {selectedTechnicianDocumentControlSummary.expiredRows.length === 0 &&
                    selectedTechnicianDocumentControlSummary.pendingReviewRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No expired or pending-review records.</div>
                    ) : (
                      [...selectedTechnicianDocumentControlSummary.expiredRows, ...selectedTechnicianDocumentControlSummary.pendingReviewRows].slice(0, 5).map((row: any) => (
                        <button key={`review-${row.technicianId}-${row.definitionId}-${row.status}`} type="button" className={`w-full rounded-lg border p-3 text-left ${getWatchlistCardClassName(row.status === "pending_review" ? "violet" : "amber")}`} onClick={() => openTechnicianComplianceRecord(row)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{row.definitionName}</p>
                            {getRequirementStatusBadge(row.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{row.validUntil ? `Valid until ${formatExportDate(row.validUntil)}` : "No valid-until date"}</p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-rose-700">Current Without Evidence</p>
                    {selectedTechnicianDocumentControlSummary.currentWithoutEvidenceRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No current records are missing evidence.</div>
                    ) : (
                      selectedTechnicianDocumentControlSummary.currentWithoutEvidenceRows.slice(0, 5).map((row: any) => (
                        <button key={`current-no-evidence-${row.technicianId}-${row.definitionId}`} type="button" className={`w-full rounded-lg border p-3 text-left ${getWatchlistCardClassName("rose")}`} onClick={() => openTechnicianComplianceRecord(row)}>
                          <p className="font-medium">{row.definitionName}</p>
                          <p className="text-sm text-muted-foreground">Current status but no uploaded evidence is stored.</p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-emerald-700">Certificate-Linked Records</p>
                    {selectedTechnicianDocumentControlSummary.certificateLinkedRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No compliance rows are linked to certificate evidence yet.</div>
                    ) : (
                      selectedTechnicianDocumentControlSummary.certificateLinkedRows.slice(0, 5).map((row: any) => (
                        <button key={`cert-linked-${row.technicianId}-${row.definitionId}`} type="button" className="w-full rounded-lg border border-emerald-200 bg-emerald-50/65 p-3 text-left hover:bg-emerald-100/60" onClick={() => openTechnicianComplianceRecord(row)}>
                          <p className="font-medium">{row.definitionName}</p>
                          <p className="text-sm text-muted-foreground">{row.documentCount > 0 ? `${row.documentCount} evidence file(s) stored` : "Certificate-linked note present but no stored evidence file"}</p>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pending Internal Review</CardTitle>
                <CardDescription>
                  Uploaded technician evidence that is already in the system and still waiting for an
                  internal Level III review decision.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedTechnicianPendingReviewRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No technician evidence is waiting for internal review right now.
                  </div>
                ) : (
                  selectedTechnicianPendingReviewRows.map((row: any) => (
                    <div key={`pending-review-${row.technicianId}-${row.definitionId}-${row.recordId ?? "pending"}`} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{row.definitionName}</p>
                            {getRequirementStatusBadge(row.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatLevelIIICategoryLabel(row.definitionCategory)}
                            {row.validUntil ? ` | Valid until ${formatExportDate(row.validUntil)}` : ""}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {row.documentCount > 0 ? `${row.documentCount} evidence file${row.documentCount === 1 ? "" : "s"} uploaded` : "No evidence file linked yet"}
                            {row.latestDocumentName ? ` | Latest: ${row.latestDocumentName}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {row.latestDocumentUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openEvidenceReview({
                                  source: "requirement",
                                  title: row.latestDocumentName || row.definitionName,
                                  description: `${row.definitionName} | ${getLevelIIITechnicianName(row.technicianId)}`,
                                  fileName: row.latestDocumentName,
                                  fileUrl: row.latestDocumentUrl ?? "",
                                  sourceReference: row.latestSourceReferencePath ?? null,
                                  requirement: row,
                                  badges: [
                                    {
                                      key: "status",
                                      label: row.status,
                                      variant:
                                        row.status === "expired"
                                          ? "destructive"
                                          : row.status === "pending_review"
                                            ? "outline"
                                            : "secondary",
                                    },
                                  ],
                                })
                              }
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Open Evidence
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => openTechnicianComplianceRecord(row)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Open Record
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Bulk Follow-Up Queue</CardTitle>
                    <CardDescription>
                      Work through the selected technician&apos;s outstanding document items in order and
                      keep a local handled trail.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{filteredSelectedTechnicianBulkQueueItems.length} open</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearHandledTechnicianDocumentQueueHistory}
                      disabled={recentHandledSelectedTechnicianBulkQueueEntries.length === 0}
                    >
                      Clear Handled
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                  <Input
                    value={requirementSearch}
                    onChange={(event) => setRequirementSearch(event.target.value)}
                    placeholder="Filter requirement, status, evidence, or document name..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={visibleQueueItems.length === 0}
                    onClick={() =>
                      visibleQueueItems[0]
                        ? openTechnicianComplianceRecord(visibleQueueItems[0].row)
                        : null
                    }
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Open First Visible
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadableVisibleQueueItems.length === 0}
                    onClick={() =>
                      uploadableVisibleQueueItems[0]
                        ? openTechnicianRequirementUploadFromRow(uploadableVisibleQueueItems[0].row)
                        : null
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload First Visible
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={visibleQueueItems.length === 0}
                    onClick={() =>
                      visibleQueueItems.forEach((item: any) =>
                        markTechnicianDocumentQueueItemHandled(item)
                      )
                    }
                  >
                    Mark Visible Handled
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {selectedVisibleQueueItems.length} selected in view
                  </Badge>
                  <Button
                    type="button"
                    variant={allVisibleQueueItemsSelected ? "secondary" : "outline"}
                    size="sm"
                    disabled={visibleQueueItems.length === 0}
                    onClick={() =>
                      allVisibleQueueItemsSelected
                        ? clearSelectedQueueItems()
                        : selectVisibleQueueItems()
                    }
                  >
                    {allVisibleQueueItemsSelected ? "Clear View Selection" : "Select Visible"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedVisibleQueueItems.length === 0}
                    onClick={() =>
                      selectedVisibleQueueItems[0]
                        ? openTechnicianComplianceRecord(selectedVisibleQueueItems[0].row)
                        : null
                    }
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Open Selected Next
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadableSelectedVisibleQueueItems.length === 0}
                    onClick={() =>
                      uploadableSelectedVisibleQueueItems[0]
                        ? openTechnicianRequirementUploadFromRow(
                            uploadableSelectedVisibleQueueItems[0].row
                          )
                        : null
                    }
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Selected Next
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={selectedVisibleQueueItems.length === 0}
                    onClick={() => markQueueItemsHandled(selectedVisibleQueueItems)}
                  >
                    Mark Selected Handled
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {queueFocusOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={queueFocusFilter === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQueueFocusFilter(option.value)}
                    >
                      {option.label}
                      <span className="ml-2 text-xs opacity-80">{option.count}</span>
                    </Button>
                  ))}
                </div>
                {filteredSelectedTechnicianBulkQueueItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No queued technician document follow-up items are open right now.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleQueueItems.slice(0, 6).map((item: any) => (
                      <div
                        key={`${item.row.technicianId}-${item.row.definitionId}-${item.queueLabel}`}
                        className={`rounded-lg border p-4 ${
                          selectedQueueItemSignatures.includes(buildQueueSignature(item))
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : ""
                        }`}
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{item.row.definitionName}</p>
                              <Badge variant="outline">{item.queueLabel}</Badge>
                              {getRequirementStatusBadge(item.row.status)}
                              {selectedQueueItemSignatures.includes(buildQueueSignature(item)) ? (
                                <Badge variant="secondary">Selected</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.reason}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatLevelIIICategoryLabel(item.row.definitionCategory)}
                              {item.row.latestDocumentName ? ` | Latest: ${item.row.latestDocumentName}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleQueueItemSelection(item)}
                            >
                              {selectedQueueItemSignatures.includes(buildQueueSignature(item))
                                ? "Deselect"
                                : "Select"}
                            </Button>
                            {item.supportsUpload ? (
                              <Button type="button" variant="outline" size="sm" onClick={() => openTechnicianRequirementUploadFromRow(item.row)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload
                              </Button>
                            ) : null}
                            <Button type="button" variant="outline" size="sm" onClick={() => openTechnicianComplianceRecord(item.row)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Open Record
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => markQueueItemsHandled([item])}
                            >
                              Mark Handled
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {filteredSelectedTechnicianBulkQueueItems.length > 0 &&
                visibleQueueItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No queue items match the current queue focus.
                  </div>
                ) : null}
                {recentHandledSelectedTechnicianBulkQueueEntries.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase text-muted-foreground">Recently Handled</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {recentHandledSelectedTechnicianBulkQueueEntries.map((entry: any) => (
                        <div key={entry.signature} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                          <div>
                            <p className="text-sm font-medium">{entry.definitionName}</p>
                            <p className="text-xs text-muted-foreground">{entry.queueLabel} | {formatExportDate(entry.handledAt)}</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => restoreHandledTechnicianDocumentQueueEntry(entry)}>
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <DataTable
              columns={technicianRequirementColumns}
              data={filteredRequirementTableRows}
              isLoading={complianceMatrixLoading}
              onRowClick={(row) => openTechnicianComplianceRecord(row)}
              searchPlaceholder="Search requirement, category, or evidence..."
              actions={(row) => (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openTechnicianComplianceRecord(row)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />

            <Card>
              <CardHeader>
                <CardTitle>Document Pack Guidance</CardTitle>
                <CardDescription>
                  Suggested technician document names and folders based on the selected
                  technician&apos;s methods and compliance items.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedTechnicianDocumentPackGuide.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No document rules are available for this technician yet.
                  </div>
                ) : (
                  visibleDocumentPackRules.map((rule: any) => (
                    <div key={`${rule.label}-${rule.storagePath}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{rule.displayLabel}</p>
                          <Badge variant="outline">{rule.label}</Badge>
                          {rule.category === "method" ? <Badge>Method Certificate</Badge> : <Badge variant="secondary">Core Document</Badge>}
                          {rule.matchedRequirement ? getRequirementStatusBadge(rule.matchedRequirement.status) : <Badge variant="outline">No compliance row yet</Badge>}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => openTechnicianDirectUploadDialog(rule)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Suggested file name: <span className="font-medium text-foreground">{rule.suggestedFileName}</span></p>
                      <p className="mt-1 text-sm text-muted-foreground">Storage folder: <span className="font-medium text-foreground">{rule.storagePath}</span></p>
                      {rule.matchedRequirement ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            Evidence: {rule.matchedRequirement.documentCount > 0 ? `${rule.matchedRequirement.documentCount} file(s)` : "none uploaded"}
                          </span>
                          {rule.matchedRequirement.latestSourceReferencePath ? (
                            <span className="text-muted-foreground">
                              Imported source: {rule.matchedRequirement.latestSourceReferenceFileName || rule.matchedRequirement.latestSourceReferencePath}
                            </span>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => openTechnicianComplianceRecord(rule.matchedRequirement)}>
                            Open Record
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
                {selectedTechnicianDocumentPackGuide.length > 0 &&
                visibleDocumentPackRules.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No document rules match the current filter.
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Document Type Setup</CardTitle>
                    <CardDescription>
                      Edit the required document list, names, and expiry rules for this client. Set
                      Validity to N/A for documents that do not expire.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTechnicianRequirementDefinition(null);
                      setIsTechnicianRequirementDefinitionFormOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Additional Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {levelIIIRequirementDefinitions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <p>No document types have been configured for this client yet.</p>
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTechnicianRequirementDefinition(null);
                          setIsTechnicianRequirementDefinitionFormOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Document Type
                      </Button>
                    </div>
                  </div>
                ) : (
                  <DataTable
                    columns={technicianRequirementDefinitionColumns}
                    data={levelIIIRequirementDefinitions}
                    pageSize={6}
                    searchPlaceholder="Search document types..."
                    actions={(row) => (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTechnicianRequirementDefinition(row);
                            setIsTechnicianRequirementDefinitionFormOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  />
                )}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTechnicianRequirementDefinition(null);
                      setIsTechnicianRequirementDefinitionFormOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Additional Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
