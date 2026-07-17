import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildPlannerTimesheetDepartmentCoverageSummary } from "@/components/planner/buildPlannerTimesheetAdminSummaries";
import { buildPlannerTimesheetTeamOverviewColumns } from "@/components/planner/buildPlannerTimesheetTeamOverviewColumns";
import { Download, Plus } from "lucide-react";
import { useMemo } from "react";

export function PlannerTimesheetTeamOverviewPanel(props: any) {
  const timesheetDepartmentCoverageSummary = useMemo(
    () =>
      buildPlannerTimesheetDepartmentCoverageSummary(
        props.timesheetDepartmentCoverageRows,
        props.typedTimesheetDepartmentCoverageSettings
      ),
    [props.timesheetDepartmentCoverageRows, props.typedTimesheetDepartmentCoverageSettings]
  );
  const {
    timesheetDepartmentCoverageColumns,
    timesheetDepartmentCoverageRuleColumns,
    timesheetDepartmentLeaveColumns,
    timesheetLeaveOverrideBlockColumns,
    timesheetLeaveOverrideQueueColumns,
    timesheetLeaveOverrideRegisterColumns,
    timesheetOverviewColumns,
    timesheetReviewedLeaveOverrideBlockColumns,
    timesheetTeamLeaveCalendarColumns,
    timesheetTeamLeaveColumns,
    timesheetTeamLeaveCoverageColumns,
    timesheetTeamLeaveOverrideColumns,
  } = buildPlannerTimesheetTeamOverviewColumns(props);

  return (
    <>
      <Card id="timesheet-team-overview">
        <CardHeader>
          <CardTitle>Team Timesheet Overview</CardTitle>
          <CardDescription>
            See who is complete, who is blocked, and which months are ready for internal review across your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={props.handleExportTeamTimesheetMonth}
              disabled={props.timesheetOverviewRows.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Team Month
            </Button>
          </div>
          {props.timesheetOverviewRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No team timesheet data is available for this month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetOverviewColumns}
              data={props.timesheetOverviewRows}
              pageSize={8}
              searchPlaceholder="Search team timesheets..."
              onRowClick={(row) => props.openTimesheetReviewTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetReviewTarget(row)}
                >
                  Open Month
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-team-leave">
        <CardHeader>
          <CardTitle>Team Leave & Availability</CardTitle>
          <CardDescription>
            See who is on leave, who still has upcoming time off, and how each person is tracking against their leave balance this month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={props.handleExportTeamLeaveOverview}
              disabled={props.timesheetTeamLeaveRows.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Team Leave
            </Button>
          </div>
          {props.timesheetTeamLeaveRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No team leave data is available for this month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetTeamLeaveColumns}
              data={props.timesheetTeamLeaveRows}
              pageSize={8}
              searchPlaceholder="Search team leave and availability..."
              onRowClick={(row) => props.openTimesheetReviewTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetReviewTarget(row)}
                >
                  Open Month
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-department-leave-overview">
        <CardHeader>
          <CardTitle>Department Leave Overview</CardTitle>
          <CardDescription>
            Roll leave planning up by department so you can spot which teams are carrying the biggest monthly leave load or same-day coverage pressure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetDepartmentLeaveRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No department leave data is available for this month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetDepartmentLeaveColumns}
              data={props.timesheetDepartmentLeaveRows}
              pageSize={8}
              searchPlaceholder="Search department leave..."
              onRowClick={(row) => props.openTimesheetDepartmentLeaveTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetDepartmentLeaveTarget(row)}
                  disabled={!row.primaryUserId}
                >
                  {row.primaryUserId ? "Open Lead Person" : "No Person"}
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-leave-override-watch">
        <CardHeader>
          <CardTitle>Leave Override Watch</CardTitle>
          <CardDescription>
            Review leave that went through with an override note because it exceeded the person's remaining balance or pushed department coverage into a high-risk day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetTeamLeaveOverrideRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No leave overrides were used in the visible month.
            </div>
          ) : (
            <DataTable
              columns={timesheetTeamLeaveOverrideColumns}
              data={props.timesheetTeamLeaveOverrideRows}
              pageSize={8}
              searchPlaceholder="Search leave overrides..."
              onRowClick={(row) => props.openTimesheetReviewTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetReviewTarget(row)}
                >
                  Open Month
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-override-review-blocks">
        <CardHeader>
          <CardTitle>Override Review Blocks</CardTitle>
          <CardDescription>
            Review continuous override leave periods in one action before drilling into the exact day-level override queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetPendingLeaveOverrideBlockQueueRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No pending override leave blocks are waiting in the visible month.
            </div>
          ) : (
            <DataTable
              columns={timesheetLeaveOverrideBlockColumns}
              data={props.timesheetPendingLeaveOverrideBlockQueueRows}
              pageSize={8}
              searchPlaceholder="Search override review blocks..."
              onRowClick={(row: any) =>
                props.openTimesheetReviewTarget({
                  userId: row.userId,
                  userName: row.userName,
                  userEmail: row.userEmail,
                  monthDate: row.monthDate,
                  entryDate: row.startDate,
                })
              }
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      props.openTimesheetReviewTarget({
                        userId: row.userId,
                        userName: row.userName,
                        userEmail: row.userEmail,
                        monthDate: row.monthDate,
                        entryDate: row.startDate,
                      })
                    }
                  >
                    Open Start Day
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void props.handleReviewTimesheetLeaveOverrideBlock(row)}
                    disabled={props.reviewTimesheetLeaveOverrideBlockMutation.isPending}
                  >
                    {props.reviewTimesheetLeaveOverrideBlockMutation.isPending
                      ? "Reviewing..."
                      : row.reviewStatus === "mixed"
                        ? "Finish Block Review"
                        : "Review Block"}
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-override-review-queue">
        <CardHeader>
          <CardTitle>Override Review Queue</CardTitle>
          <CardDescription>
            Work through the override days that still need an internal review note, ordered by how long they have been waiting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetPendingLeaveOverrideQueueRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No pending leave override reviews are waiting in the visible month.
            </div>
          ) : (
            <DataTable
              columns={timesheetLeaveOverrideQueueColumns}
              data={props.timesheetPendingLeaveOverrideQueueRows}
              pageSize={8}
              searchPlaceholder="Search pending override reviews..."
              onRowClick={(row: any) =>
                props.openTimesheetReviewTarget({
                  ...row,
                  entryDate: row.date,
                })
              }
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      props.openTimesheetReviewTarget({
                        ...row,
                        entryDate: row.date,
                      })
                    }
                  >
                    Open Day
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void props.handleReviewTimesheetLeaveOverride(row)}
                    disabled={props.reviewTimesheetLeaveOverrideMutation.isPending}
                  >
                    {props.reviewTimesheetLeaveOverrideMutation.isPending
                      ? "Reviewing..."
                      : "Mark Reviewed"}
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card id="timesheet-reviewed-override-block-archive">
        <CardHeader>
          <CardTitle>Reviewed Override Block Archive</CardTitle>
          <CardDescription>
            Revisit completed override block decisions, update the review note if needed, and keep a cleaner audit trail of what was already signed off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetReviewedLeaveOverrideBlockRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No override leave blocks have been fully reviewed in the visible month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetReviewedLeaveOverrideBlockColumns}
              data={props.timesheetReviewedLeaveOverrideBlockRows}
              pageSize={8}
              searchPlaceholder="Search reviewed override blocks..."
              onRowClick={(row: any) =>
                props.openTimesheetReviewTarget({
                  userId: row.userId,
                  userName: row.userName,
                  userEmail: row.userEmail,
                  monthDate: row.monthDate,
                  entryDate: row.startDate,
                })
              }
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      props.openTimesheetReviewTarget({
                        userId: row.userId,
                        userName: row.userName,
                        userEmail: row.userEmail,
                        monthDate: row.monthDate,
                        entryDate: row.startDate,
                      })
                    }
                  >
                    Open Start Day
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void props.handleReviewTimesheetLeaveOverrideBlock(row)}
                    disabled={props.reviewTimesheetLeaveOverrideBlockMutation.isPending}
                  >
                    {props.reviewTimesheetLeaveOverrideBlockMutation.isPending
                      ? "Updating..."
                      : "Update Review"}
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave Override Register</CardTitle>
          <CardDescription>
            Review each exact override leave date with the reason that was captured, so payroll and admin follow-up can work from day-level detail instead of only a monthly roll-up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetLeaveOverrideRegisterRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No dated leave override entries were recorded in the visible month.
            </div>
          ) : (
            <DataTable
              columns={timesheetLeaveOverrideRegisterColumns}
              data={props.timesheetLeaveOverrideRegisterRows}
              pageSize={8}
              searchPlaceholder="Search leave override register..."
              onRowClick={(row: any) =>
                props.openTimesheetReviewTarget({
                  ...row,
                  entryDate: row.date,
                })
              }
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      props.openTimesheetReviewTarget({
                        ...row,
                        entryDate: row.date,
                      })
                    }
                  >
                    Open Day
                  </Button>
                  <Button
                    size="sm"
                    variant={row.reviewStatus === "reviewed" ? "secondary" : "default"}
                    onClick={() => void props.handleReviewTimesheetLeaveOverride(row)}
                    disabled={props.reviewTimesheetLeaveOverrideMutation.isPending}
                  >
                    {row.reviewStatus === "reviewed"
                      ? props.reviewTimesheetLeaveOverrideMutation.isPending
                        ? "Updating..."
                        : "Update Review"
                      : props.reviewTimesheetLeaveOverrideMutation.isPending
                        ? "Reviewing..."
                        : "Mark Reviewed"}
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Leave Calendar</CardTitle>
          <CardDescription>
            Review the actual leave dates across the team, including multi-person leave days and shared holiday overlap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetTeamLeaveCalendarRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No leave or shared holiday dates are recorded in the visible month yet.
            </div>
          ) : (
            <DataTable
              columns={timesheetTeamLeaveCalendarColumns}
              data={props.timesheetTeamLeaveCalendarRows}
              pageSize={10}
              searchPlaceholder="Search team leave calendar..."
              onRowClick={(row) => props.openTimesheetLeaveCalendarTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetLeaveCalendarTarget(row)}
                  disabled={!row.primaryUserId}
                >
                  {row.primaryUserId ? "Open First Person" : "No Person"}
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department Coverage Rules</CardTitle>
          <CardDescription>
            Set department-specific staffing rules so coverage alerts can follow your real local limits instead of only generic percentage thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {timesheetDepartmentCoverageSummary.configuredRuleCount} rule
              {timesheetDepartmentCoverageSummary.configuredRuleCount === 1 ? "" : "s"} configured,{" "}
              {timesheetDepartmentCoverageSummary.unconfiguredAlertDepartments} alerting department
              {timesheetDepartmentCoverageSummary.unconfiguredAlertDepartments === 1
                ? ""
                : "s"}{" "}
              still using defaults.
            </div>
            <Button
              variant="outline"
              onClick={() => {
                props.setEditingTimesheetDepartmentCoverageRule(null);
                props.setIsTimesheetDepartmentCoverageRuleDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Coverage Rule
            </Button>
          </div>
          {props.typedTimesheetDepartmentCoverageSettings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No department-specific coverage rules have been added yet. Alerts are still working, but they are using the default thresholds until you add rules here.
            </div>
          ) : (
            <DataTable
              columns={timesheetDepartmentCoverageRuleColumns}
              data={props.typedTimesheetDepartmentCoverageSettings}
              pageSize={8}
              searchPlaceholder="Search department coverage rules..."
              onRowClick={(row: any) => {
                props.setEditingTimesheetDepartmentCoverageRule(row);
                props.setIsTimesheetDepartmentCoverageRuleDialogOpen(true);
              }}
              actions={(row: any) => (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      props.setEditingTimesheetDepartmentCoverageRule(row);
                      props.setIsTimesheetDepartmentCoverageRuleDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void props.handleDeleteTimesheetDepartmentCoverageRule(row)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Leave Coverage Alerts</CardTitle>
          <CardDescription>
            Focus on the dates where leave is clustering enough to create staffing pressure or holiday overlap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetTeamLeaveCoverageRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No medium or high leave coverage alerts were detected in the visible month.
            </div>
          ) : (
            <DataTable
              columns={timesheetTeamLeaveCoverageColumns}
              data={props.timesheetTeamLeaveCoverageRows}
              pageSize={8}
              searchPlaceholder="Search leave coverage alerts..."
              onRowClick={(row) => props.openTimesheetLeaveCalendarTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetLeaveCalendarTarget(row)}
                  disabled={!row.primaryUserId}
                >
                  {row.primaryUserId ? "Open First Person" : "No Person"}
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department Coverage Alerts</CardTitle>
          <CardDescription>
            Focus on exact department-date combinations where the same team is thin enough to create a local coverage risk, even if the wider business still looks fine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {props.timesheetDepartmentCoverageRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No department-specific coverage alerts were detected in the visible month.
            </div>
          ) : (
            <DataTable
              columns={timesheetDepartmentCoverageColumns}
              data={props.timesheetDepartmentCoverageRows}
              pageSize={8}
              searchPlaceholder="Search department coverage alerts..."
              onRowClick={(row) => props.openTimesheetLeaveCalendarTarget(row)}
              actions={(row: any) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => props.openTimesheetLeaveCalendarTarget(row)}
                  disabled={!row.primaryUserId}
                >
                  {row.primaryUserId ? "Open Lead Person" : "No Person"}
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
