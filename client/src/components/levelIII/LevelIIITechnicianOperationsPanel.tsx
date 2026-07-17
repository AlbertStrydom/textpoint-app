import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Upload } from "lucide-react";
import { CrossTechnicianDocumentQueuePanel } from "@/components/levelIII/CrossTechnicianDocumentQueuePanel";
import { DocumentGenerationStoragePanel } from "@/components/levelIII/DocumentGenerationStoragePanel";

type LevelIIITechnicianOperationsPanelProps = {
  props: any;
};

export function LevelIIITechnicianOperationsPanel({
  props,
}: LevelIIITechnicianOperationsPanelProps) {
  const selectedTechnicianCvRule =
    props.selectedTechnicianDocumentPackGuide?.find((rule: any) =>
      ["cv", "curriculum vitae"].includes(String(rule?.label ?? "").trim().toLowerCase())
    ) ?? null;

  return (
    <>
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Level III Rollout Readiness</CardTitle>
            <CardDescription>
              One panel for final local testing across certificates, technician
              document control, and client request-pack processing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground">Active Certs</p>
                <p className="mt-1 text-2xl font-semibold">
                  {props.levelIIIRolloutReadinessSummary.activeCertificates}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground">Approval Queue</p>
                <p className="mt-1 text-2xl font-semibold">
                  {props.levelIIIRolloutReadinessSummary.pendingCertificateApprovals}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground">Expiring Soon</p>
                <p className="mt-1 text-2xl font-semibold">
                  {props.levelIIIRolloutReadinessSummary.expiringCertificates}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground">Missing Evidence</p>
                <p className="mt-1 text-2xl font-semibold">
                  {props.levelIIIRolloutReadinessSummary.complianceMissingEvidence}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground">Pending Review</p>
                <p className="mt-1 text-2xl font-semibold">
                  {props.levelIIIRolloutReadinessSummary.compliancePendingReview}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase text-muted-foreground">Request Gaps</p>
                <p className="mt-1 text-2xl font-semibold">
                  {props.levelIIIRolloutReadinessSummary.requestUploadsOutstanding +
                    props.levelIIIRolloutReadinessSummary.requestGuideGaps}
                </p>
              </div>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Testing Checklist
                </p>
                {props.levelIIIRolloutReadinessSummary.checklistItems.length === 0 ? (
                  <p className="mt-2 text-sm text-emerald-700">
                    Core Level III rollout checks are in place. Focus local testing
                    on real records, approvals, and request-pack processing flows.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {props.levelIIIRolloutReadinessSummary.checklistItems.map(
                      (item: string) => (
                        <div
                          key={item}
                          className="rounded-md border bg-muted/20 px-3 py-2 text-sm"
                        >
                          {item}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">
                  Suggested Test Order
                </p>
                <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                  <p>1. Issue or update a technician certificate and complete sign-off.</p>
                  <p>2. Review technician compliance rows, upload missing evidence, and clear pending review.</p>
                  <p>3. Open a client request, confirm automation routing, and resolve any checklist or guide gaps.</p>
                  <p>4. Recheck the certificate lifecycle and document-control panels for clean status.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Technician Intake Operations</CardTitle>
            <CardDescription>
              Track imported and existing technicians that still need assessment,
              certificate, or evidence work before rollout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Drive Imports", props.technicianIntakeQueueSummary.importedFromDrive],
                ["No Assessment", props.technicianIntakeQueueSummary.noAssessment],
                ["No Active Cert", props.technicianIntakeQueueSummary.noActiveCertificate],
                ["Evidence Gaps", props.technicianIntakeQueueSummary.missingEvidence],
                ["Pending Review", props.technicianIntakeQueueSummary.pendingReview],
                ["Ready For Cert", props.technicianIntakeQueueSummary.readyForCertificate],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value as number}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
              Start with imported technicians that still have no active
              certificate, then clear evidence gaps and pending review items before
              final sign-off.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Technician Intake Watchlist</CardTitle>
            <CardDescription>
              Open the technicians most likely to block certificate issuance or
              compliance rollout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {props.technicianIntakeQueueSummary.items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No technician intake blockers were found in the current Level III
                dataset.
              </div>
            ) : (
              props.technicianIntakeQueueSummary.items.map((item: any) => (
                <div key={item.technician.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.technician.name}</p>
                        {item.importedFromDrive ? (
                          <Badge variant="outline">Drive import</Badge>
                        ) : null}
                        {item.hasActiveCertificate ? (
                          <Badge variant="secondary">Active cert</Badge>
                        ) : (
                          <Badge variant="outline">No active cert</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {props.clients.find(
                          (client: any) => client.id === item.technician.clientId
                        )?.companyName ?? "Unknown client"}
                        {" | "}
                        {props.summariseTechnicianLevels(
                          props.getTechnicianMethodQualifications(item.technician)
                        ) || item.technician.level}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.reasons.map((reason: string) => (
                          <Badge
                            key={`${item.technician.id}-${reason}`}
                            variant="outline"
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          props.setSelectedComplianceTechnicianId(item.technician.id)
                        }
                      >
                        Open Documents
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          props.openNewTechnicianCertificateForm(item.technician)
                        }
                      >
                        Issue Certificate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => props.openTechnicianForm(item.technician)}
                      >
                        Edit Technician
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <CrossTechnicianDocumentQueuePanel
        filteredOpenCount={props.filteredCrossTechnicianBulkQueueItems.length}
        exportCrossTechnicianQueueCsv={props.exportCrossTechnicianQueueCsv}
        clearAllHandled={() => props.setHandledTechnicianDocumentQueueEntries([])}
        recentHandledCrossTechnicianBulkQueueEntries={
          props.recentHandledCrossTechnicianBulkQueueEntries
        }
        technicianQueueFilterOptions={props.technicianQueueFilterOptions}
        selectedTechnicianQueueFilter={props.selectedTechnicianQueueFilter}
        setSelectedTechnicianQueueFilter={props.setSelectedTechnicianQueueFilter}
        crossTechnicianQueueSessionScopeLabel={
          props.crossTechnicianQueueSessionScopeLabel
        }
        selectedCrossTechnicianQueueSignaturesCount={
          props.selectedCrossTechnicianQueueSignatures.length
        }
        crossTechnicianQueueSessionCompletedCount={
          props.crossTechnicianQueueSessionCompletedCount
        }
        selectedCrossTechnicianQueueItemsCount={
          props.selectedCrossTechnicianQueueItems.length
        }
        hiddenCrossTechnicianQueueSelectionCount={
          props.hiddenCrossTechnicianQueueSelectionCount
        }
        crossTechnicianQueueSessionUpdatedAt={
          props.crossTechnicianQueueSessionUpdatedAt
        }
        crossTechnicianQueueLastStartedItem={props.crossTechnicianQueueLastStartedItem}
        autoHandleCrossTechnicianQueueSessionItems={
          props.autoHandleCrossTechnicianQueueSessionItems
        }
        setAutoHandleCrossTechnicianQueueSessionItems={
          props.setAutoHandleCrossTechnicianQueueSessionItems
        }
        allVisibleCrossTechnicianQueueSelected={
          props.allVisibleCrossTechnicianQueueSelected
        }
        clearVisibleCrossTechnicianQueueItems={
          props.clearVisibleCrossTechnicianQueueItems
        }
        selectVisibleCrossTechnicianQueueItems={
          props.selectVisibleCrossTechnicianQueueItems
        }
        visibleCrossTechnicianQueueSignaturesCount={
          props.visibleCrossTechnicianQueueSignatures.length
        }
        addVisibleCrossTechnicianQueueItemsToSession={
          props.addVisibleCrossTechnicianQueueItemsToSession
        }
        replaceCrossTechnicianQueueSessionWithVisible={
          props.replaceCrossTechnicianQueueSessionWithVisible
        }
        restoreLastStartedCrossTechnicianQueueItem={
          props.restoreLastStartedCrossTechnicianQueueItem
        }
        clearCrossTechnicianQueueSession={props.clearCrossTechnicianQueueSession}
        runNextSelectedCrossTechnicianQueueAction={
          props.runNextSelectedCrossTechnicianQueueAction
        }
        selectedCrossTechnicianQueueHasUploadableItems={props.selectedCrossTechnicianQueueItems.some(
          (item: any) => item.supportsUpload
        )}
        markSelectedCrossTechnicianQueueItemsHandled={() =>
          props.markSelectedCrossTechnicianQueueItemsHandled(
            props.selectedCrossTechnicianQueueItems
          )
        }
        exportSelectedCrossTechnicianQueueCsv={() =>
          props.exportSelectedCrossTechnicianQueueCsv(
            props.selectedCrossTechnicianQueueItems
          )
        }
        crossTechnicianQueueSessionCompletionPercent={
          props.crossTechnicianQueueSessionCompletionPercent
        }
        crossTechnicianQueueSessionPeakCount={
          props.crossTechnicianQueueSessionPeakCount
        }
        crossTechnicianQueueSessionVisibleSummary={
          props.crossTechnicianQueueSessionVisibleSummary
        }
        crossTechnicianQueueSessionFocusOptions={
          props.crossTechnicianQueueSessionFocusOptions
        }
        nextCrossTechnicianQueueSessionItem={
          props.nextCrossTechnicianQueueSessionItem
        }
        startNextCrossTechnicianQueueSessionItem={(item: any, action: any) => {
          props.startCrossTechnicianQueueSessionItem(item, action);
          props.toast.success(
            `${item.row.technicianName} ${
              action === "upload" ? "upload" : "record"
            } opened from the saved session.`
          );
        }}
        openTechnicianComplianceWorkspace={props.openTechnicianComplianceWorkspace}
        nextCrossTechnicianQueueSessionTechnician={
          props.nextCrossTechnicianQueueSessionTechnician
        }
        openNextTechnicianComplianceQueueItem={
          props.openNextTechnicianComplianceQueueItem
        }
        nextCrossTechnicianQueueSessionClient={props.nextCrossTechnicianQueueSessionClient}
        openNextClientComplianceQueueItem={props.openNextClientComplianceQueueItem}
        openClientComplianceBacklog={props.openClientComplianceBacklog}
        clientComplianceBacklogSummary={props.clientComplianceBacklogSummary}
        exportClientComplianceBacklogCsv={props.exportClientComplianceBacklogCsv}
        technicianComplianceBacklogSummary={props.technicianComplianceBacklogSummary}
        exportTechnicianComplianceBacklogCsv={
          props.exportTechnicianComplianceBacklogCsv
        }
        crossTechnicianQueueSearch={props.crossTechnicianQueueSearch}
        setCrossTechnicianQueueSearch={props.setCrossTechnicianQueueSearch}
        showSavedSessionQueueOnly={props.showSavedSessionQueueOnly}
        setShowSavedSessionQueueOnly={props.setShowSavedSessionQueueOnly}
        searchedCrossTechnicianBulkQueueItemsCount={
          props.searchedCrossTechnicianBulkQueueItems.length
        }
        crossTechnicianQueuePage={props.crossTechnicianQueuePage}
        crossTechnicianQueueTotalPages={props.crossTechnicianQueueTotalPages}
        pagedCrossTechnicianBulkQueueItems={props.pagedCrossTechnicianBulkQueueItems}
        selectedCrossTechnicianQueueSignatures={
          props.selectedCrossTechnicianQueueSignatures
        }
        buildTechnicianDocumentQueueItemSignature={
          props.buildTechnicianDocumentQueueItemSignature
        }
        toggleCrossTechnicianQueueItemSelection={
          props.toggleCrossTechnicianQueueItemSelection
        }
        getRequirementStatusBadge={props.getRequirementStatusBadge}
        resolveClientName={(technicianId: number) =>
          props.clients.find(
            (client: any) =>
              client.id ===
              props.technicians.find((tech: any) => tech.id === technicianId)
                ?.clientId
          )?.companyName ?? "Unknown client"
        }
        openCrossTechnicianQueueItem={props.openTechnicianComplianceWorkspace}
        markTechnicianDocumentQueueItemHandled={
          props.markTechnicianDocumentQueueItemHandled
        }
        crossTechnicianQueuePageSize={props.crossTechnicianQueuePageSize}
        setCrossTechnicianQueuePage={props.setCrossTechnicianQueuePage}
        restoreHandledTechnicianDocumentQueueEntry={
          props.restoreHandledTechnicianDocumentQueueEntry
        }
      />

      <DocumentGenerationStoragePanel
        levelIIIDocumentGenerationSummary={props.levelIIIDocumentGenerationSummary}
        levelIIICertificateReleaseQueueItems={props.levelIIICertificateReleaseQueueItems}
        levelIIICertificateReleaseQueueSummary={props.levelIIICertificateReleaseQueueSummary}
        openDocumentsPage={props.openDocumentsPage}
        levelIIIDocumentGenerationFilterOptions={
          props.levelIIIDocumentGenerationFilterOptions
        }
        selectedDocumentGenerationFilter={props.selectedDocumentGenerationFilter}
        setSelectedDocumentGenerationFilter={props.setSelectedDocumentGenerationFilter}
        filteredLevelIIIDocumentGenerationItems={
          props.filteredLevelIIIDocumentGenerationItems
        }
        primaryFilteredDocumentGenerationItem={
          props.primaryFilteredDocumentGenerationItem
        }
        batchDocumentGenerationActionLabel={props.batchDocumentGenerationActionLabel}
        batchDocumentGenerationCandidatesCount={
          props.batchDocumentGenerationCandidates.length
        }
        documentGenerationBatchAction={props.documentGenerationBatchAction}
        runDocumentGenerationBatchAction={props.runDocumentGenerationBatchAction}
        runCertificateReleaseBatchAction={props.runCertificateReleaseBatchAction}
        openCertificateSignOffDialog={props.openCertificateSignOffDialog}
        exportPrimaryHtml={props.exportEditableCertificateHtml}
        createControlledLevelIIICertificateDocument={
          props.createControlledLevelIIICertificateDocument
        }
        submitControlledLevelIIICertificateDocumentForReview={
          props.submitControlledLevelIIICertificateDocumentForReview
        }
        setSelectedCertificateHistory={props.setSelectedCertificateHistory}
        markDocumentGenerationItemHandled={props.markDocumentGenerationItemHandled}
        recentHandledDocumentGenerationEntries={
          props.recentHandledDocumentGenerationEntries
        }
        clearHandledDocumentGenerationHistory={
          props.clearHandledDocumentGenerationHistory
        }
        restoreHandledDocumentGenerationEntry={
          props.restoreHandledDocumentGenerationEntry
        }
        getCertificateApprovalBadge={props.getCertificateApprovalBadge}
        getCertificateStatusBadge={props.getCertificateStatusBadge}
        handlePreviewLevelIIICertificate={props.handlePreviewLevelIIICertificate}
        openControlledApprovalDecision={
          props.openControlledLevelIIICertificateDecision
        }
        exportCertificateHtml={props.exportEditableCertificateHtml}
        exportCertificatePdf={props.exportCertificatePdf}
        openCertificateStorageLinker={props.openCertificateStorageLinker}
        setSelectedComplianceTechnicianId={props.setSelectedComplianceTechnicianId}
        openLevelIIIDocumentRecordPreview={props.openLevelIIIDocumentRecordPreview}
        openLevelIIIDocumentRecord={props.openLevelIIIDocumentRecord}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="technicianSearch">Quick Search</Label>
          <Input
            id="technicianSearch"
            value={props.technicianSearch}
            onChange={(event) => props.setTechnicianSearch(event.target.value)}
            placeholder="Search technician, company, method, or level..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientFilter">Filter By Client</Label>
          <select
            id="clientFilter"
            value={props.selectedClientFilter}
            onChange={(event) =>
              props.handleTechnicianClientFilterChange(event.target.value)
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Clients</option>
            {props.clients.map((client: any) => (
              <option key={client.id} value={String(client.id)}>
                {client.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Level III Document Type Library</CardTitle>
              <CardDescription>
                Maintain the technician document list for each Level III client
                separately from the training and student side.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {props.activeLevelIIIDocumentSetupClient ? (
                <Badge variant="outline">
                  {props.activeLevelIIIDocumentSetupClient.companyName}
                </Badge>
              ) : (
                <Badge variant="outline">Choose client</Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!props.activeLevelIIIDocumentSetupClientId}
                onClick={() => {
                  props.setEditingTechnicianRequirementDefinition(null);
                  props.setIsTechnicianRequirementDefinitionFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Additional Document
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!props.activeLevelIIIDocumentSetupClientId ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Select a Level III client in the filter above, or open a technician
              document workspace, to manage that client&apos;s technician document
              types.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Document Types", props.levelIIIDocumentTypeSummary.total],
                  ["Active", props.levelIIIDocumentTypeSummary.active],
                  ["Required", props.levelIIIDocumentTypeSummary.required],
                  ["No Expiry", props.levelIIIDocumentTypeSummary.noExpiry],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs uppercase text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold">{value as number}</p>
                  </div>
                ))}
              </div>
              {props.selectedComplianceTechnician &&
              props.selectedComplianceTechnician.clientId ===
                props.activeLevelIIIDocumentSetupClientId ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Document setup and technician evidence workspace are both loaded
                  for{" "}
                  <span className="font-medium text-foreground">
                    {props.activeLevelIIIDocumentSetupClient?.companyName ??
                      "the selected client"}
                  </span>
                  .
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  You can edit the client&apos;s required Level III technician
                  document list here first, then open any technician below to
                  upload or review evidence.
                </div>
              )}
              {props.levelIIIRequirementDefinitions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  <p>
                    No Level III technician document types have been configured for
                    this client yet.
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        props.setEditingTechnicianRequirementDefinition(null);
                        props.setIsTechnicianRequirementDefinitionFormOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Document Type
                    </Button>
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={props.technicianRequirementDefinitionColumns}
                  data={props.levelIIIRequirementDefinitions}
                  pageSize={6}
                  searchPlaceholder="Search Level III document types..."
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          props.setEditingTechnicianRequirementDefinition(row);
                          props.setIsTechnicianRequirementDefinitionFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {props.selectedComplianceTechnician ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Selected Technician
              </p>
              <p className="text-base font-semibold">
                {props.selectedComplianceTechnician.name}
              </p>
              <p className="text-sm text-muted-foreground">
                Document workspace loaded for{" "}
                {props.clients.find(
                  (client: any) =>
                    client.id === props.selectedComplianceTechnician.clientId
                )?.companyName ?? "linked client"}
                . Continue below or use the jump button.
              </p>
              <p className="mt-2 text-sm text-foreground">
                Upload path for this technician:
                {" "}
                use
                {" "}
                <span className="font-medium">Upload Document</span>
                {" "}
                to add any evidence, or
                {" "}
                <span className="font-medium">Upload CV</span>
                {" "}
                for the CV record directly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {props.getQualificationTypeLabel(props.selectedComplianceTechnician)}
              </Badge>
              <Badge variant="outline">
                {props.formatMethods(
                  props.getTechnicianMethods(props.selectedComplianceTechnician)
                )}
              </Badge>
              <Button
                onClick={() => props.openTechnicianDirectUploadDialog()}
                disabled={props.selectedTechnicianDocumentPackGuide.length === 0}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
              <Button
                variant="outline"
                onClick={() => props.openTechnicianDirectUploadDialog(selectedTechnicianCvRule)}
                disabled={!selectedTechnicianCvRule}
              >
                <FileText className="mr-2 h-4 w-4" />
                Upload CV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  props.technicianComplianceSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
              >
                Jump to Documents
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
