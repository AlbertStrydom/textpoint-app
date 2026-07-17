import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  Edit2,
  Lock,
  Plus,
  Repeat,
  Unlock,
} from "lucide-react";

type PendingMutationLike = {
  isPending: boolean;
};

type PlannerTimesheetReviewTarget = {
  userEmail: string | null;
} | null;

type PlannerTimesheetMonthStatusLite = {
  reviewerDeclarationAccepted: boolean;
  reviewerDeclarationAcceptedAt: string | Date | null;
} | null;

type PlannerTimesheetReviewQueueRowLite = {
  blockerCount: number;
  employeeDeclarationAccepted: boolean;
  employeeDeclarationAcceptedAt: string | Date | null;
  id: number;
  lockedAt: string | Date | null;
  monthDate: string | Date;
  reviewedAt: string | Date | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  reviewerDeclarationAccepted: boolean;
  reviewerDeclarationAcceptedAt: string | Date | null;
  status: string;
  statusNote: string | null;
  submissionNote: string | null;
  submittedAt: string | Date | null;
  submittedByName: string | null;
  userEmail: string | null;
  userId: number;
  userName: string;
  waitingDays: number | null;
  warningCount: number;
};

type PlannerTimesheetShellPanelProps = {
  PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT: string;
  activeTimesheetOptions: readonly unknown[];
  activeTimesheetReviewQueueRow: PlannerTimesheetReviewQueueRowLite | null;
  activeTimesheetTemplates: readonly unknown[];
  adminReviewPanel: ReactNode;
  approveTimesheetMonthMutation: PendingMutationLike;
  canSubmitTimesheetMonth: boolean;
  formatPlannerDateTime: (value: string | Date) => string;
  handleApproveTimesheetMonth: (
    row: PlannerTimesheetReviewQueueRowLite
  ) => Promise<unknown> | unknown;
  handleExportTimesheetMonth: () => void;
  handleLockTimesheetMonth: () => Promise<unknown> | unknown;
  handleReopenTimesheetMonth: () => Promise<unknown> | unknown;
  handleReturnTimesheetMonthForChanges: (
    row: PlannerTimesheetReviewQueueRowLite
  ) => Promise<unknown> | unknown;
  handleSubmitTimesheetMonth: () => Promise<unknown> | unknown;
  isTimesheetMonthApproved: boolean;
  isTimesheetMonthHandedOff: boolean;
  isTimesheetMonthLocked: boolean;
  isTimesheetMonthSubmitted: boolean;
  isTimesheetReviewAdmin: boolean;
  isViewingAnotherTimesheet: boolean;
  lockTimesheetMonthMutation: PendingMutationLike;
  monthWorkspacePanel: ReactNode;
  previousTimesheetEntriesLoading: boolean;
  reopenTimesheetMonthMutation: PendingMutationLike;
  returnTimesheetMonthMutation: PendingMutationLike;
  setEditingTimesheetHoliday: (value: null) => void;
  setEditingTimesheetOption: (value: null) => void;
  setEditingTimesheetTemplate: (value: null) => void;
  setIsTimesheetHolidayApplyDialogOpen: (value: boolean) => void;
  setIsTimesheetHolidayDialogOpen: (value: boolean) => void;
  setIsTimesheetOptionDialogOpen: (value: boolean) => void;
  setIsTimesheetPreviousMonthCopyDialogOpen: (value: boolean) => void;
  setIsTimesheetProfileDialogOpen: (value: boolean) => void;
  setIsTimesheetTemplateApplyDialogOpen: (value: boolean) => void;
  setIsTimesheetTemplateDialogOpen: (value: boolean) => void;
  setIsTimesheetTemplateFillDialogOpen: (value: boolean) => void;
  setTimesheetReviewDeclarationAccepted: (value: boolean) => void;
  setTimesheetReviewTarget: (value: null) => void;
  submitTimesheetMonthMutation: PendingMutationLike;
  timesheetOwnerName: string;
  timesheetReviewDeclarationAccepted: boolean;
  timesheetReviewTarget: PlannerTimesheetReviewTarget;
  timesheetSubmitDisabledReason: string | null;
  typedTimesheetHolidays: readonly unknown[];
  typedTimesheetMonthStatus: PlannerTimesheetMonthStatusLite;
  workspaceHubPanel: ReactNode;
};

export function PlannerTimesheetShellPanel({
  PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT,
  activeTimesheetOptions,
  activeTimesheetReviewQueueRow,
  activeTimesheetTemplates,
  adminReviewPanel,
  approveTimesheetMonthMutation,
  canSubmitTimesheetMonth,
  formatPlannerDateTime,
  handleApproveTimesheetMonth,
  handleExportTimesheetMonth,
  handleLockTimesheetMonth,
  handleReopenTimesheetMonth,
  handleReturnTimesheetMonthForChanges,
  handleSubmitTimesheetMonth,
  isTimesheetMonthApproved,
  isTimesheetMonthHandedOff,
  isTimesheetMonthLocked,
  isTimesheetMonthSubmitted,
  isTimesheetReviewAdmin,
  isViewingAnotherTimesheet,
  lockTimesheetMonthMutation,
  monthWorkspacePanel,
  previousTimesheetEntriesLoading,
  reopenTimesheetMonthMutation,
  returnTimesheetMonthMutation,
  setEditingTimesheetHoliday,
  setEditingTimesheetOption,
  setEditingTimesheetTemplate,
  setIsTimesheetHolidayApplyDialogOpen,
  setIsTimesheetHolidayDialogOpen,
  setIsTimesheetOptionDialogOpen,
  setIsTimesheetPreviousMonthCopyDialogOpen,
  setIsTimesheetProfileDialogOpen,
  setIsTimesheetTemplateApplyDialogOpen,
  setIsTimesheetTemplateDialogOpen,
  setIsTimesheetTemplateFillDialogOpen,
  setTimesheetReviewDeclarationAccepted,
  setTimesheetReviewTarget,
  submitTimesheetMonthMutation,
  timesheetOwnerName,
  timesheetReviewDeclarationAccepted,
  timesheetReviewTarget,
  timesheetSubmitDisabledReason,
  typedTimesheetHolidays,
  typedTimesheetMonthStatus,
  workspaceHubPanel,
}: PlannerTimesheetShellPanelProps) {

  const showAdminReviewPanel =
    isTimesheetReviewAdmin &&
    Boolean(adminReviewPanel);

  return (
    <Card className="border-amber-100 bg-gradient-to-r from-amber-50/80 via-white to-white">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600" />
            Planner Timesheet
          </CardTitle>
          <CardDescription>
            {isViewingAnotherTimesheet
              ? `Reviewing ${timesheetOwnerName}'s monthly timesheet in read-only mode.`
              : "Track what you worked on each day using simple tick boxes, editable activity options, and export-ready monthly records."}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsTimesheetProfileDialogOpen(true)}
            disabled={isViewingAnotherTimesheet}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Timesheet Profile
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingTimesheetHoliday(null);
              setIsTimesheetHolidayDialogOpen(true);
            }}
            disabled={isViewingAnotherTimesheet}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Holiday Calendar
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTimesheetHolidayApplyDialogOpen(true)}
            disabled={isViewingAnotherTimesheet || typedTimesheetHolidays.length === 0}
          >
            <Copy className="mr-2 h-4 w-4" />
            Apply Holidays
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingTimesheetOption(null);
              setIsTimesheetOptionDialogOpen(true);
            }}
            disabled={isViewingAnotherTimesheet}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Activity
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingTimesheetTemplate(null);
              setIsTimesheetTemplateDialogOpen(true);
            }}
            disabled={isViewingAnotherTimesheet}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save Day Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTimesheetTemplateApplyDialogOpen(true)}
            disabled={isViewingAnotherTimesheet || activeTimesheetTemplates.length === 0}
          >
            <Copy className="mr-2 h-4 w-4" />
            Apply Template
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTimesheetTemplateFillDialogOpen(true)}
            disabled={isViewingAnotherTimesheet || activeTimesheetTemplates.length === 0}
          >
            <Repeat className="mr-2 h-4 w-4" />
            Fill Missing Days
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsTimesheetPreviousMonthCopyDialogOpen(true)}
            disabled={isViewingAnotherTimesheet || previousTimesheetEntriesLoading}
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Copy Previous Month
          </Button>
          <Button
            variant="outline"
            onClick={handleExportTimesheetMonth}
            disabled={activeTimesheetOptions.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Timesheet
          </Button>
          <Button
            variant={isTimesheetMonthLocked ? "outline" : "default"}
            onClick={() =>
              void (isTimesheetMonthLocked ? handleReopenTimesheetMonth() : handleLockTimesheetMonth())
            }
            disabled={
              isViewingAnotherTimesheet ||
              isTimesheetMonthSubmitted ||
              isTimesheetMonthApproved ||
              isTimesheetMonthHandedOff ||
              lockTimesheetMonthMutation.isPending ||
              reopenTimesheetMonthMutation.isPending
            }
          >
            {isTimesheetMonthLocked ? (
              <Unlock className="mr-2 h-4 w-4" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {isTimesheetMonthLocked
              ? reopenTimesheetMonthMutation.isPending
                ? "Reopening..."
                : "Reopen Month"
              : lockTimesheetMonthMutation.isPending
                ? "Finalising..."
                : "Finalise Month"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleSubmitTimesheetMonth()}
            disabled={!canSubmitTimesheetMonth}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {submitTimesheetMonthMutation.isPending ? "Submitting..." : "Submit For Review"}
          </Button>
          {isViewingAnotherTimesheet ? (
            <Button variant="outline" onClick={() => setTimesheetReviewTarget(null)}>
              Return To My Timesheet
            </Button>
          ) : null}
        </div>
        {!canSubmitTimesheetMonth && timesheetSubmitDisabledReason ? (
          <p className="text-xs text-muted-foreground">{timesheetSubmitDisabledReason}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Finalise the month first, then submit it for internal review when the blocking items are
            cleared.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {isViewingAnotherTimesheet ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            You are reviewing <span className="font-semibold">{timesheetOwnerName}</span>
            {timesheetReviewTarget?.userEmail ? ` (${timesheetReviewTarget.userEmail})` : ""}. Editing
            controls are disabled in this mode.
          </div>
        ) : null}
        {isViewingAnotherTimesheet && activeTimesheetReviewQueueRow ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-emerald-900">Review Decision Panel</div>
                  <div className="mt-1 text-sm text-emerald-800">
                    Review this submitted month in context, then approve it or return it for changes.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      activeTimesheetReviewQueueRow.employeeDeclarationAccepted
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {activeTimesheetReviewQueueRow.employeeDeclarationAccepted
                      ? "Declaration Confirmed"
                      : "Declaration Missing"}
                  </Badge>
                  <Badge
                    variant={
                      activeTimesheetReviewQueueRow.blockerCount > 0
                        ? "destructive"
                        : activeTimesheetReviewQueueRow.warningCount > 0
                          ? "outline"
                          : "secondary"
                    }
                  >
                    {activeTimesheetReviewQueueRow.blockerCount > 0
                      ? `${activeTimesheetReviewQueueRow.blockerCount} blocker${activeTimesheetReviewQueueRow.blockerCount === 1 ? "" : "s"}`
                      : activeTimesheetReviewQueueRow.warningCount > 0
                        ? `${activeTimesheetReviewQueueRow.warningCount} warning${activeTimesheetReviewQueueRow.warningCount === 1 ? "" : "s"}`
                        : "Ready To Approve"}
                  </Badge>
                  <Badge variant="outline">
                    Waiting{" "}
                    {activeTimesheetReviewQueueRow.waitingDays === null
                      ? "-"
                      : `${activeTimesheetReviewQueueRow.waitingDays} day${activeTimesheetReviewQueueRow.waitingDays === 1 ? "" : "s"}`}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Submitted
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      {activeTimesheetReviewQueueRow.submittedAt
                        ? formatPlannerDateTime(activeTimesheetReviewQueueRow.submittedAt)
                        : activeTimesheetReviewQueueRow.lockedAt
                          ? formatPlannerDateTime(activeTimesheetReviewQueueRow.lockedAt)
                          : "-"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      By {activeTimesheetReviewQueueRow.submittedByName?.trim() || timesheetOwnerName}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-white p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Submission Note
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {activeTimesheetReviewQueueRow.submissionNote?.trim() || "No submission note was added."}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border bg-white p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Reviewer Declaration
                      </div>
                      <div className="text-sm text-slate-900">
                        {PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT}
                      </div>
                      {typedTimesheetMonthStatus?.reviewerDeclarationAccepted ? (
                        <div className="text-xs text-slate-600">
                          Confirmed
                          {typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt
                            ? ` on ${formatPlannerDateTime(
                                typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt
                              )}`
                            : ""}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">
                          Confirm this before approving the submitted month.
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 md:max-w-sm">
                      <Checkbox
                        checked={timesheetReviewDeclarationAccepted}
                        onCheckedChange={(checked) =>
                          setTimesheetReviewDeclarationAccepted(Boolean(checked))
                        }
                        disabled={Boolean(typedTimesheetMonthStatus?.reviewerDeclarationAccepted)}
                      />
                      <label className="text-sm leading-5 text-emerald-950">
                        I confirm the reviewer declaration above for this month before approving it.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleApproveTimesheetMonth(activeTimesheetReviewQueueRow)}
                  disabled={
                    approveTimesheetMonthMutation.isPending ||
                    !activeTimesheetReviewQueueRow.employeeDeclarationAccepted ||
                    activeTimesheetReviewQueueRow.blockerCount > 0 ||
                    (!typedTimesheetMonthStatus?.reviewerDeclarationAccepted &&
                      !timesheetReviewDeclarationAccepted)
                  }
                >
                  Approve Month
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void handleReturnTimesheetMonthForChanges(activeTimesheetReviewQueueRow)
                  }
                  disabled={returnTimesheetMonthMutation.isPending}
                >
                  Return For Changes
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {workspaceHubPanel}
        {monthWorkspacePanel}
        {showAdminReviewPanel ? adminReviewPanel : null}
      </CardContent>
    </Card>
  );
}
