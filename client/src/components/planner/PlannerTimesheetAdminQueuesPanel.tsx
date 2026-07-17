import { DataTable } from "@/components/DataTable";
import { buildPlannerTimesheetAdminQueueColumns } from "@/components/planner/buildPlannerTimesheetAdminQueueColumns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";

export function PlannerTimesheetAdminQueuesPanel(props: any) {
  const { timesheetApprovedColumns, timesheetReviewQueueColumns } =
    buildPlannerTimesheetAdminQueueColumns(props);

  return props.isTimesheetReviewAdmin ? (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Approved Timesheet Handoff Queue</CardTitle>
          <CardDescription>
            Track which reviewed months are still waiting for handoff and which have already
            been sent to payroll or admin processing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={props.handleExportApprovedTimesheetPack}
              disabled={props.timesheetApprovedRows.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Approved Pack
            </Button>
          </div>
          {props.timesheetApprovedRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No approved timesheet months are available for this month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetApprovedColumns}
              data={props.timesheetApprovedRows}
              pageSize={8}
              searchPlaceholder="Search approved timesheets..."
              onRowClick={(row) => props.openTimesheetReviewTarget(row)}
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => props.openTimesheetReviewTarget(row)}
                  >
                    Open Approved Month
                  </Button>
                  <Button
                    size="sm"
                    variant={row.workflowStatus === "handed_off" ? "secondary" : "default"}
                    onClick={() => void props.handleMarkTimesheetMonthHandedOff(row)}
                    disabled={props.markTimesheetMonthHandedOffMutation.isPending}
                  >
                    {row.workflowStatus === "handed_off"
                      ? props.markTimesheetMonthHandedOffMutation.isPending
                        ? "Updating..."
                        : "Update Handoff"
                      : props.markTimesheetMonthHandedOffMutation.isPending
                        ? "Handing Off..."
                        : "Mark Handed Off"}
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Handed Off Timesheet Archive</CardTitle>
          <CardDescription>
            Review months that have already been handed to payroll or admin processing and
            export a completed handoff pack when needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={props.handleExportHandedOffTimesheetPack}
              disabled={props.timesheetHandedOffRows.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Handed Off Pack
            </Button>
          </div>
          {props.timesheetHandedOffRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No months have been marked as handed off for this month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetApprovedColumns}
              data={props.timesheetHandedOffRows}
              pageSize={8}
              searchPlaceholder="Search handed-off timesheets..."
              onRowClick={(row) => props.openTimesheetReviewTarget(row)}
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => props.openTimesheetReviewTarget(row)}
                  >
                    Open Handed Off Month
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void props.handleMarkTimesheetMonthHandedOff(row)}
                    disabled={props.markTimesheetMonthHandedOffMutation.isPending}
                  >
                    {props.markTimesheetMonthHandedOffMutation.isPending
                      ? "Updating..."
                      : "Update Handoff"}
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-review-queue">
        <CardHeader>
          <CardTitle>Submitted Timesheet Review Queue</CardTitle>
          <CardDescription>
            Review finalised months submitted by your team, then approve them or return them
            for changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetReviewQueueRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No submitted timesheet months are currently waiting for review.
            </div>
          ) : (
            <DataTable
              columns={timesheetReviewQueueColumns}
              data={props.timesheetReviewQueueRows}
              pageSize={8}
              searchPlaceholder="Search submitted timesheets..."
              onRowClick={(row) => props.openTimesheetReviewTarget(row)}
              actions={(row: any) => (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => props.openTimesheetReviewTarget(row)}
                  >
                    Open Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void props.handleApproveTimesheetMonth(row)}
                    disabled={
                      props.approveTimesheetMonthMutation.isPending ||
                      !row.employeeDeclarationAccepted ||
                      row.blockerCount > 0
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void props.handleReturnTimesheetMonthForChanges(row)}
                    disabled={props.returnTimesheetMonthMutation.isPending}
                  >
                    Return
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </>
  ) : props.shouldShowPlannerSection("timesheet-admin-review-notice") ? (
    <Card id="timesheet-admin-review-notice" className="border-dashed">
      <CardHeader>
        <CardTitle>Team Timesheet Review</CardTitle>
        <CardDescription>
          The team summary cards, review queue, and team month export are only visible to
          internal `Admin` or `Super Admin` users.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        You are currently working in the individual planner view. If you need the team
        dashboard, sign in with an internal admin account.
      </CardContent>
    </Card>
  ) : null;
}
