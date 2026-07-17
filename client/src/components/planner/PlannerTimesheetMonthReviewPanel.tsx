import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { buildPlannerTimesheetMonthReviewColumns } from "@/components/planner/buildPlannerTimesheetMonthReviewColumns";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import type {
  PlannerTimesheetOptionSummaryLite,
  PlannerTimesheetProfileLite,
  PlannerTimesheetReviewTargetLite,
  PlannerTimesheetRowLite,
  PlannerTimesheetTeamAttentionRowLite,
  PlannerUserLite,
} from "@/components/planner/plannerSharedTypes";

type PlannerTimesheetMonthReviewPanelProps = {
  adminQueuesPanel: ReactNode;
  formatMinutesAsDuration: (value: number) => string;
  formatPlannerDateTime: (value: string | Date) => string;
  formatVarianceMinutes: (value: number) => string;
  openTimesheetReviewTarget: (row: PlannerTimesheetReviewTargetLite) => void;
  setSelectedDate: (date: Date) => void;
  shouldShowPlannerSection: (sectionId: string) => boolean;
  startOfDay: (date: Date) => Date;
  teamOverviewPanel: ReactNode;
  timesheetEntriesLoading: boolean;
  timesheetMonthRows: PlannerTimesheetRowLite[];
  timesheetOptionSummaryRows: PlannerTimesheetOptionSummaryLite[];
  timesheetTeamAttentionRows: PlannerTimesheetTeamAttentionRowLite[];
  typedTimesheetProfile: PlannerTimesheetProfileLite | null;
  user: PlannerUserLite | null | undefined;
};

export function PlannerTimesheetMonthReviewPanel({
  adminQueuesPanel,
  formatMinutesAsDuration,
  formatPlannerDateTime,
  formatVarianceMinutes,
  openTimesheetReviewTarget,
  setSelectedDate,
  shouldShowPlannerSection,
  startOfDay,
  teamOverviewPanel,
  timesheetEntriesLoading,
  timesheetMonthRows,
  timesheetOptionSummaryRows,
  timesheetTeamAttentionRows,
  typedTimesheetProfile,
  user,
}: PlannerTimesheetMonthReviewPanelProps) {
  const { timesheetRegisterColumns, timesheetSummaryColumns, timesheetTeamAttentionColumns } =
    buildPlannerTimesheetMonthReviewColumns({
      formatMinutesAsDuration,
      formatPlannerDateTime,
      formatVarianceMinutes,
    });

  return (
    <>
      <Card id="timesheet-team-attention">
        <CardHeader>
          <CardTitle>Team Attention Queue</CardTitle>
          <CardDescription>
            Work through the most important team timesheet issues first, from overdue reviews and
            pending override checks to returned months and blocked submissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timesheetTeamAttentionRows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No team timesheet attention items are currently outstanding for this month.
            </div>
          ) : (
            <DataTable
              columns={timesheetTeamAttentionColumns}
              data={timesheetTeamAttentionRows}
              pageSize={8}
              searchPlaceholder="Search team attention items..."
              onRowClick={(row) => openTimesheetReviewTarget(row)}
              actions={(row) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openTimesheetReviewTarget(row)}
                >
                  {row.category === "review"
                    ? "Open Review"
                    : row.category === "override_review"
                      ? "Open Day"
                      : row.category === "handoff"
                        ? "Open Handoff"
                        : "Open Month"}
                </Button>
              )}
            />
          )}
        </CardContent>
      </Card>

      {teamOverviewPanel}
      {adminQueuesPanel}

      {shouldShowPlannerSection("timesheet-monthly-activity-totals") ? (
        <Card id="timesheet-monthly-activity-totals">
          <CardHeader>
            <CardTitle>Monthly Activity Totals</CardTitle>
            <CardDescription>
              See which work categories are taking up the month so far, based on the daily ticks
              already captured.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={timesheetSummaryColumns}
              data={timesheetOptionSummaryRows}
              pageSize={10}
              searchPlaceholder="Search monthly totals..."
            />
          </CardContent>
        </Card>
      ) : null}

      {shouldShowPlannerSection("timesheet-register") ? (
        <Card id="timesheet-register">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Monthly Timesheet Register</CardTitle>
              <CardDescription>
                Review the current month day by day, then export it to Excel in a familiar
                timesheet layout.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Input
                value={typedTimesheetProfile?.department ?? ""}
                readOnly
                className="sm:w-[180px]"
                placeholder="Department"
              />
              <Input
                value={typedTimesheetProfile?.signatureName?.trim() || user?.name?.trim() || ""}
                readOnly
                className="sm:w-[200px]"
                placeholder="Signed as"
              />
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={timesheetRegisterColumns}
              data={timesheetMonthRows}
              isLoading={timesheetEntriesLoading}
              pageSize={31}
              searchPlaceholder="Search timesheet days..."
              onRowClick={(row) => setSelectedDate(startOfDay(row.date))}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

export default PlannerTimesheetMonthReviewPanel;
