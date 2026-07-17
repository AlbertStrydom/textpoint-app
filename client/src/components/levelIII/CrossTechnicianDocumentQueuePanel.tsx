import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Edit2, Upload } from "lucide-react";

type TechnicianQueueFilterOption = {
  value: string;
  label: string;
  count: number;
};

type QueueItem = {
  row: {
    technicianId: number;
    technicianName: string;
    definitionId: number;
    definitionName: string;
    status: string;
  };
  queueLabel: string;
  reason: string;
  supportsUpload: boolean;
};

type SessionLastStartedItem = {
  technicianName: string;
  definitionName: string;
};

type SessionFocusOption = {
  value: string;
  label: string;
  count: number;
};

type BacklogByClientItem = {
  clientId: number;
  clientName: string;
  openItems: number;
  techniciansAffected: number;
  missingEvidence: number;
  pendingReview: number;
  expired: number;
  currentWithoutEvidence: number;
};

type BacklogByTechnicianItem = {
  technicianId: number;
  technicianName: string;
  clientName: string;
  openItems: number;
  missingEvidence: number;
  pendingReview: number;
  expired: number;
  currentWithoutEvidence: number;
};

type RecentHandledEntry = {
  signature: string;
  technicianName: string;
  definitionName: string;
  queueLabel: string;
};

type NextQueueItem = QueueItem | null;

type NextTechnicianLane = {
  technicianId: number;
  technicianName: string;
  clientName: string;
  openItems: number;
  uploadableItems: number;
} | null;

type NextClientLane = {
  clientId: number;
  clientName: string;
  openItems: number;
  techniciansAffected: number;
  uploadableItems: number;
} | null;

type CrossTechnicianDocumentQueuePanelProps = {
  filteredOpenCount: number;
  exportCrossTechnicianQueueCsv: () => void;
  clearAllHandled: () => void;
  recentHandledCrossTechnicianBulkQueueEntries: RecentHandledEntry[];
  technicianQueueFilterOptions: readonly TechnicianQueueFilterOption[];
  selectedTechnicianQueueFilter: string;
  setSelectedTechnicianQueueFilter: (value: string) => void;
  crossTechnicianQueueSessionScopeLabel: string;
  selectedCrossTechnicianQueueSignaturesCount: number;
  crossTechnicianQueueSessionCompletedCount: number;
  selectedCrossTechnicianQueueItemsCount: number;
  hiddenCrossTechnicianQueueSelectionCount: number;
  crossTechnicianQueueSessionUpdatedAt: string | null;
  crossTechnicianQueueLastStartedItem: SessionLastStartedItem | null;
  autoHandleCrossTechnicianQueueSessionItems: boolean;
  setAutoHandleCrossTechnicianQueueSessionItems: (value: boolean) => void;
  allVisibleCrossTechnicianQueueSelected: boolean;
  clearVisibleCrossTechnicianQueueItems: () => void;
  selectVisibleCrossTechnicianQueueItems: () => void;
  visibleCrossTechnicianQueueSignaturesCount: number;
  addVisibleCrossTechnicianQueueItemsToSession: () => void;
  replaceCrossTechnicianQueueSessionWithVisible: () => void;
  restoreLastStartedCrossTechnicianQueueItem: () => void;
  clearCrossTechnicianQueueSession: () => void;
  runNextSelectedCrossTechnicianQueueAction: (action: "upload" | "record") => void;
  selectedCrossTechnicianQueueHasUploadableItems: boolean;
  markSelectedCrossTechnicianQueueItemsHandled: () => void;
  exportSelectedCrossTechnicianQueueCsv: () => void;
  crossTechnicianQueueSessionCompletionPercent: number;
  crossTechnicianQueueSessionPeakCount: number;
  crossTechnicianQueueSessionVisibleSummary: {
    missingEvidence: number;
    pendingReview: number;
    expired: number;
    currentWithoutEvidence: number;
  };
  crossTechnicianQueueSessionFocusOptions: readonly SessionFocusOption[];
  nextCrossTechnicianQueueSessionItem: NextQueueItem;
  startNextCrossTechnicianQueueSessionItem: (item: QueueItem, action: "upload" | "record") => void;
  openTechnicianComplianceWorkspace: (technicianId: number) => void;
  nextCrossTechnicianQueueSessionTechnician: NextTechnicianLane;
  openNextTechnicianComplianceQueueItem: (technicianId: number, action: "upload" | "record") => void;
  nextCrossTechnicianQueueSessionClient: NextClientLane;
  openNextClientComplianceQueueItem: (clientId: number, action: "upload" | "record") => void;
  openClientComplianceBacklog: (clientId: number) => void;
  clientComplianceBacklogSummary: readonly BacklogByClientItem[];
  exportClientComplianceBacklogCsv: () => void;
  technicianComplianceBacklogSummary: readonly BacklogByTechnicianItem[];
  exportTechnicianComplianceBacklogCsv: () => void;
  crossTechnicianQueueSearch: string;
  setCrossTechnicianQueueSearch: (value: string) => void;
  showSavedSessionQueueOnly: boolean;
  setShowSavedSessionQueueOnly: (value: boolean) => void;
  searchedCrossTechnicianBulkQueueItemsCount: number;
  crossTechnicianQueuePage: number;
  crossTechnicianQueueTotalPages: number;
  pagedCrossTechnicianBulkQueueItems: readonly QueueItem[];
  selectedCrossTechnicianQueueSignatures: readonly string[];
  buildTechnicianDocumentQueueItemSignature: (item: QueueItem) => string;
  toggleCrossTechnicianQueueItemSelection: (item: QueueItem) => void;
  getRequirementStatusBadge: (status: string) => ReactNode;
  resolveClientName: (technicianId: number) => string;
  openCrossTechnicianQueueItem: (item: QueueItem, action: "upload" | "record") => void;
  markTechnicianDocumentQueueItemHandled: (item: QueueItem) => void;
  crossTechnicianQueuePageSize: number;
  setCrossTechnicianQueuePage: (updater: (current: number) => number) => void;
  restoreHandledTechnicianDocumentQueueEntry: (entry: RecentHandledEntry) => void;
};

export function CrossTechnicianDocumentQueuePanel(
  props: CrossTechnicianDocumentQueuePanelProps
) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Cross-Technician Document Queue</CardTitle>
            <CardDescription>
              Work outstanding evidence, expiry, and pending-review items across the current
              technician filter from one queue.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{props.filteredOpenCount} open</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={props.exportCrossTechnicianQueueCsv}
              disabled={props.filteredOpenCount === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={props.clearAllHandled}
              disabled={props.recentHandledCrossTechnicianBulkQueueEntries.length === 0}
            >
              Clear All Handled
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {props.technicianQueueFilterOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={props.selectedTechnicianQueueFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => props.setSelectedTechnicianQueueFilter(option.value)}
            >
              {option.label} ({option.count})
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
          <Badge variant="secondary">Session: {props.crossTechnicianQueueSessionScopeLabel}</Badge>
          <Badge variant="outline">{props.selectedCrossTechnicianQueueSignaturesCount} saved in session</Badge>
          <Badge variant="outline">{props.crossTechnicianQueueSessionCompletedCount} completed</Badge>
          <Badge variant="outline">{props.selectedCrossTechnicianQueueItemsCount} visible in current filter</Badge>
          {props.hiddenCrossTechnicianQueueSelectionCount > 0 ? (
            <Badge variant="secondary">
              {props.hiddenCrossTechnicianQueueSelectionCount} hidden by current filter
            </Badge>
          ) : null}
          {props.crossTechnicianQueueSessionUpdatedAt ? (
            <span className="text-xs text-muted-foreground">
              Resume saved {new Date(props.crossTechnicianQueueSessionUpdatedAt).toLocaleString()}
            </span>
          ) : null}
          {props.crossTechnicianQueueLastStartedItem ? (
            <span className="text-xs text-muted-foreground">
              Last started: {props.crossTechnicianQueueLastStartedItem.technicianName} |{" "}
              {props.crossTechnicianQueueLastStartedItem.definitionName}
            </span>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={props.autoHandleCrossTechnicianQueueSessionItems}
              onCheckedChange={(checked) =>
                props.setAutoHandleCrossTechnicianQueueSessionItems(Boolean(checked))
              }
            />
            Auto-handle on start
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={
              props.allVisibleCrossTechnicianQueueSelected
                ? props.clearVisibleCrossTechnicianQueueItems
                : props.selectVisibleCrossTechnicianQueueItems
            }
            disabled={props.visibleCrossTechnicianQueueSignaturesCount === 0}
          >
            {props.allVisibleCrossTechnicianQueueSelected ? "Clear Visible" : "Select Visible"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.addVisibleCrossTechnicianQueueItemsToSession}
            disabled={props.visibleCrossTechnicianQueueSignaturesCount === 0}
          >
            Add Visible To Session
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.replaceCrossTechnicianQueueSessionWithVisible}
            disabled={props.visibleCrossTechnicianQueueSignaturesCount === 0}
          >
            Replace Session With Visible
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.restoreLastStartedCrossTechnicianQueueItem}
            disabled={!props.crossTechnicianQueueLastStartedItem}
          >
            Restore Last Started Item
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.clearCrossTechnicianQueueSession}
            disabled={props.selectedCrossTechnicianQueueSignaturesCount === 0}
          >
            Clear Saved Session
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => props.runNextSelectedCrossTechnicianQueueAction("upload")}
            disabled={
              props.selectedCrossTechnicianQueueItemsCount === 0 ||
              !props.selectedCrossTechnicianQueueHasUploadableItems
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Next Selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => props.runNextSelectedCrossTechnicianQueueAction("record")}
            disabled={props.selectedCrossTechnicianQueueItemsCount === 0}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Open Next Selected
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={props.markSelectedCrossTechnicianQueueItemsHandled}
            disabled={props.selectedCrossTechnicianQueueItemsCount === 0}
          >
            Mark Selected Handled
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={props.exportSelectedCrossTechnicianQueueCsv}
            disabled={props.selectedCrossTechnicianQueueItemsCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Selected
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Session Progress</p>
            <p className="mt-1 text-2xl font-semibold">{props.crossTechnicianQueueSessionCompletionPercent}%</p>
            <p className="text-xs text-muted-foreground">
              {props.crossTechnicianQueueSessionCompletedCount} of {props.crossTechnicianQueueSessionPeakCount} completed
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Missing Evidence</p>
            <p className="mt-1 text-2xl font-semibold">
              {props.crossTechnicianQueueSessionVisibleSummary.missingEvidence}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Pending Review</p>
            <p className="mt-1 text-2xl font-semibold">
              {props.crossTechnicianQueueSessionVisibleSummary.pendingReview}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Expired</p>
            <p className="mt-1 text-2xl font-semibold">{props.crossTechnicianQueueSessionVisibleSummary.expired}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs uppercase text-muted-foreground">Current Without Evidence</p>
            <p className="mt-1 text-2xl font-semibold">
              {props.crossTechnicianQueueSessionVisibleSummary.currentWithoutEvidence}
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Session Focus</p>
              <p className="text-sm text-muted-foreground">
                Jump the queue view to the next work type inside the saved session.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {props.crossTechnicianQueueSessionFocusOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={props.selectedTechnicianQueueFilter === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => props.setSelectedTechnicianQueueFilter(option.value)}
                  disabled={option.count === 0}
                >
                  {option.label} ({option.count})
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Next Queue Item</CardTitle>
              <CardDescription>
                Open the highest-priority saved item directly into upload or record review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {props.nextCrossTechnicianQueueSessionItem ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{props.nextCrossTechnicianQueueSessionItem.row.technicianName}</p>
                    <p className="text-sm text-muted-foreground">
                      {props.nextCrossTechnicianQueueSessionItem.row.definitionName} |{" "}
                      {props.nextCrossTechnicianQueueSessionItem.queueLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {props.nextCrossTechnicianQueueSessionItem.reason}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        props.startNextCrossTechnicianQueueSessionItem(
                          props.nextCrossTechnicianQueueSessionItem!,
                          props.nextCrossTechnicianQueueSessionItem!.supportsUpload ? "upload" : "record"
                        )
                      }
                    >
                      {props.nextCrossTechnicianQueueSessionItem.supportsUpload
                        ? "Upload Next Item"
                        : "Open Next Item"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        props.openTechnicianComplianceWorkspace(
                          props.nextCrossTechnicianQueueSessionItem!.row.technicianId
                        )
                      }
                    >
                      Open Technician
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No saved queue items are available in this session.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Next Technician Lane</CardTitle>
              <CardDescription>Move the busiest technician in the saved session into focus.</CardDescription>
            </CardHeader>
            <CardContent>
              {props.nextCrossTechnicianQueueSessionTechnician ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{props.nextCrossTechnicianQueueSessionTechnician.technicianName}</p>
                    <p className="text-sm text-muted-foreground">
                      {props.nextCrossTechnicianQueueSessionTechnician.clientName} |{" "}
                      {props.nextCrossTechnicianQueueSessionTechnician.openItems} open item
                      {props.nextCrossTechnicianQueueSessionTechnician.openItems === 1 ? "" : "s"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {props.nextCrossTechnicianQueueSessionTechnician.uploadableItems} ready for direct upload
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        props.openNextTechnicianComplianceQueueItem(
                          props.nextCrossTechnicianQueueSessionTechnician!.technicianId,
                          "upload"
                        )
                      }
                    >
                      Upload Next
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        props.openTechnicianComplianceWorkspace(
                          props.nextCrossTechnicianQueueSessionTechnician!.technicianId
                        )
                      }
                    >
                      Open Documents
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No technician lane is waiting in this saved session.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>Next Client Lane</CardTitle>
              <CardDescription>
                Jump straight into the client with the largest remaining session backlog.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {props.nextCrossTechnicianQueueSessionClient ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{props.nextCrossTechnicianQueueSessionClient.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {props.nextCrossTechnicianQueueSessionClient.openItems} open item
                      {props.nextCrossTechnicianQueueSessionClient.openItems === 1 ? "" : "s"} across{" "}
                      {props.nextCrossTechnicianQueueSessionClient.techniciansAffected} technician
                      {props.nextCrossTechnicianQueueSessionClient.techniciansAffected === 1 ? "" : "s"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {props.nextCrossTechnicianQueueSessionClient.uploadableItems} ready for direct upload
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        props.openNextClientComplianceQueueItem(
                          props.nextCrossTechnicianQueueSessionClient!.clientId,
                          "upload"
                        )
                      }
                    >
                      Upload Next
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        props.openClientComplianceBacklog(props.nextCrossTechnicianQueueSessionClient!.clientId)
                      }
                    >
                      Open Queue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No client lane is waiting in this saved session.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Backlog By Client</CardTitle>
                <CardDescription>
                  See which Level III clients are carrying the most open document follow-up items in the current queue filter.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={props.exportClientComplianceBacklogCsv}
                disabled={props.clientComplianceBacklogSummary.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {props.clientComplianceBacklogSummary.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No client backlog items match the current queue filter.
                </div>
              ) : (
                props.clientComplianceBacklogSummary.slice(0, 6).map((item) => (
                  <div key={item.clientId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium">{item.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.openItems} open item{item.openItems === 1 ? "" : "s"} across{" "}
                          {item.techniciansAffected} technician
                          {item.techniciansAffected === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Missing {item.missingEvidence}</Badge>
                        <Badge variant="outline">Review {item.pendingReview}</Badge>
                        <Badge variant="outline">Expired {item.expired}</Badge>
                        <Badge variant="outline">Current w/o evidence {item.currentWithoutEvidence}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => props.openNextClientComplianceQueueItem(item.clientId, "upload")}
                        >
                          Upload Next
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => props.openClientComplianceBacklog(item.clientId)}
                        >
                          Open Queue
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Backlog By Technician</CardTitle>
                <CardDescription>
                  Identify the technicians with the deepest compliance backlog in the currently visible queue.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={props.exportTechnicianComplianceBacklogCsv}
                disabled={props.technicianComplianceBacklogSummary.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {props.technicianComplianceBacklogSummary.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No technician backlog items match the current queue filter.
                </div>
              ) : (
                props.technicianComplianceBacklogSummary.slice(0, 6).map((item) => (
                  <div key={item.technicianId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-medium">{item.technicianName}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.clientName} | {item.openItems} open item
                          {item.openItems === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">Missing {item.missingEvidence}</Badge>
                        <Badge variant="outline">Review {item.pendingReview}</Badge>
                        <Badge variant="outline">Expired {item.expired}</Badge>
                        <Badge variant="outline">Current w/o evidence {item.currentWithoutEvidence}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => props.openNextTechnicianComplianceQueueItem(item.technicianId, "upload")}
                        >
                          Upload Next
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => props.openTechnicianComplianceWorkspace(item.technicianId)}
                        >
                          Open Documents
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Label htmlFor="crossTechnicianQueueSearch">Queue Search</Label>
            <Input
              id="crossTechnicianQueueSearch"
              value={props.crossTechnicianQueueSearch}
              onChange={(event) => props.setCrossTechnicianQueueSearch(event.target.value)}
              placeholder="Search technician, client, document, reason, or queue label..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={props.showSavedSessionQueueOnly}
                onCheckedChange={(checked) => props.setShowSavedSessionQueueOnly(Boolean(checked))}
              />
              Show only saved session items
            </label>
            <Badge variant="outline">
              {props.searchedCrossTechnicianBulkQueueItemsCount} result
              {props.searchedCrossTechnicianBulkQueueItemsCount === 1 ? "" : "s"}
            </Badge>
            <Badge variant="secondary">
              Page {props.crossTechnicianQueuePage} of {props.crossTechnicianQueueTotalPages}
            </Badge>
          </div>
        </div>
        {props.searchedCrossTechnicianBulkQueueItemsCount === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No cross-technician document follow-up items match the current queue view.
          </div>
        ) : (
          <div className="space-y-3">
            {props.pagedCrossTechnicianBulkQueueItems.map((item) => (
              <div
                key={`${item.row.technicianId}-${item.row.definitionId}-${item.queueLabel}`}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Checkbox
                        checked={props.selectedCrossTechnicianQueueSignatures.includes(
                          props.buildTechnicianDocumentQueueItemSignature(item)
                        )}
                        onCheckedChange={() => props.toggleCrossTechnicianQueueItemSelection(item)}
                      />
                      <p className="font-medium">{item.row.technicianName}</p>
                      <Badge variant="outline">{item.queueLabel}</Badge>
                      {props.getRequirementStatusBadge(item.row.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {props.resolveClientName(item.row.technicianId)} | {item.row.definitionName}
                    </p>
                    <p className="text-sm text-muted-foreground">{item.reason}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.supportsUpload ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => props.openCrossTechnicianQueueItem(item, "upload")}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => props.openCrossTechnicianQueueItem(item, "record")}
                    >
                      <Edit2 className="mr-2 h-4 w-4" />
                      Open Record
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => props.markTechnicianDocumentQueueItemHandled(item)}
                    >
                      Mark Handled
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                {Math.min(
                  (props.crossTechnicianQueuePage - 1) * props.crossTechnicianQueuePageSize + 1,
                  props.searchedCrossTechnicianBulkQueueItemsCount
                )}{" "}
                to{" "}
                {Math.min(
                  props.crossTechnicianQueuePage * props.crossTechnicianQueuePageSize,
                  props.searchedCrossTechnicianBulkQueueItemsCount
                )}{" "}
                of {props.searchedCrossTechnicianBulkQueueItemsCount} queue item
                {props.searchedCrossTechnicianBulkQueueItemsCount === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => props.setCrossTechnicianQueuePage((current) => Math.max(1, current - 1))}
                  disabled={props.crossTechnicianQueuePage <= 1}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    props.setCrossTechnicianQueuePage((current) =>
                      Math.min(props.crossTechnicianQueueTotalPages, current + 1)
                    )
                  }
                  disabled={props.crossTechnicianQueuePage >= props.crossTechnicianQueueTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
        {props.recentHandledCrossTechnicianBulkQueueEntries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase text-muted-foreground">Recently Handled Across Technicians</p>
            <div className="grid gap-2 md:grid-cols-2">
              {props.recentHandledCrossTechnicianBulkQueueEntries.map((entry) => (
                <div
                  key={entry.signature}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{entry.technicianName}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.definitionName} | {entry.queueLabel}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => props.restoreHandledTechnicianDocumentQueueEntry(entry)}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
