import { Card, CardContent } from "@/components/ui/card";
import {
  buildPlannerTimesheetDepartmentCoverageSummary,
  buildPlannerTimesheetDepartmentLeaveSummary,
  buildPlannerTimesheetLeaveOverrideBlockSummary,
  buildPlannerTimesheetLeaveOverrideRegisterSummary,
  buildPlannerTimesheetTeamLeaveCalendarSummary,
  buildPlannerTimesheetTeamLeaveCoverageSummary,
  buildPlannerTimesheetTeamLeaveSummary,
} from "@/components/planner/buildPlannerTimesheetAdminSummaries";
import type { PlannerTimesheetTeamSummaryLite } from "@/components/planner/plannerSharedTypes";
import { useMemo } from "react";

type PlannerTimesheetAdminSummaryPanelProps = {
  formatLeaveDays: (days: number) => string;
  timesheetDepartmentCoverageRows: Record<string, any>[];
  timesheetDepartmentLeaveRows: Record<string, any>[];
  timesheetLeaveOverrideBlockRows: Record<string, any>[];
  timesheetLeaveOverrideRegisterRows: Record<string, any>[];
  timesheetPendingLeaveOverrideBlockQueueRows: Record<string, any>[];
  timesheetPendingLeaveOverrideQueueRows: Record<string, any>[];
  timesheetTeamLeaveCalendarRows: Record<string, any>[];
  timesheetTeamLeaveCoverageRows: Record<string, any>[];
  timesheetTeamLeaveRows: Record<string, any>[];
  timesheetTeamSummary: PlannerTimesheetTeamSummaryLite;
  typedTimesheetDepartmentCoverageSettings: Record<string, any>[];
};

export function PlannerTimesheetAdminSummaryPanel({
  formatLeaveDays,
  timesheetDepartmentCoverageRows,
  timesheetDepartmentLeaveRows,
  timesheetLeaveOverrideBlockRows,
  timesheetLeaveOverrideRegisterRows,
  timesheetPendingLeaveOverrideBlockQueueRows,
  timesheetPendingLeaveOverrideQueueRows,
  timesheetTeamLeaveCalendarRows,
  timesheetTeamLeaveCoverageRows,
  timesheetTeamLeaveRows,
  timesheetTeamSummary,
  typedTimesheetDepartmentCoverageSettings,
}: PlannerTimesheetAdminSummaryPanelProps) {
  const timesheetTeamLeaveSummary = useMemo(
    () => buildPlannerTimesheetTeamLeaveSummary(timesheetTeamLeaveRows),
    [timesheetTeamLeaveRows]
  );
  const timesheetLeaveOverrideRegisterSummary = useMemo(
    () =>
      buildPlannerTimesheetLeaveOverrideRegisterSummary(
        timesheetLeaveOverrideRegisterRows,
        timesheetPendingLeaveOverrideQueueRows
      ),
    [timesheetLeaveOverrideRegisterRows, timesheetPendingLeaveOverrideQueueRows]
  );
  const timesheetLeaveOverrideBlockSummary = useMemo(
    () =>
      buildPlannerTimesheetLeaveOverrideBlockSummary(
        timesheetLeaveOverrideBlockRows,
        timesheetPendingLeaveOverrideBlockQueueRows
      ),
    [timesheetLeaveOverrideBlockRows, timesheetPendingLeaveOverrideBlockQueueRows]
  );
  const timesheetDepartmentLeaveSummary = useMemo(
    () => buildPlannerTimesheetDepartmentLeaveSummary(timesheetDepartmentLeaveRows),
    [timesheetDepartmentLeaveRows]
  );
  const timesheetTeamLeaveCalendarSummary = useMemo(
    () => buildPlannerTimesheetTeamLeaveCalendarSummary(timesheetTeamLeaveCalendarRows),
    [timesheetTeamLeaveCalendarRows]
  );
  const timesheetTeamLeaveCoverageSummary = useMemo(
    () => buildPlannerTimesheetTeamLeaveCoverageSummary(timesheetTeamLeaveCoverageRows),
    [timesheetTeamLeaveCoverageRows]
  );
  const timesheetDepartmentCoverageSummary = useMemo(
    () =>
      buildPlannerTimesheetDepartmentCoverageSummary(
        timesheetDepartmentCoverageRows,
        typedTimesheetDepartmentCoverageSettings
      ),
    [timesheetDepartmentCoverageRows, typedTimesheetDepartmentCoverageSettings]
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <Card className="border-slate-200 bg-slate-50/70">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-slate-900">Submitted</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {timesheetTeamSummary.submittedCount}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Months currently waiting for internal review.
            </p>
          </CardContent>
        </Card>
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-rose-900">Overdue Review</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900">
              {timesheetTeamSummary.overdueReviewCount}
            </p>
            <p className="mt-1 text-xs text-rose-700">
              Submitted months waiting 2 days or longer.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">Blocked</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {timesheetTeamSummary.blockedCount}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Months with blocking gaps still to be fixed.
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-violet-900">Warnings Only</p>
            <p className="mt-2 text-2xl font-semibold text-violet-900">
              {timesheetTeamSummary.warningsOnlyCount}
            </p>
            <p className="mt-1 text-xs text-violet-700">
              No blockers, but short days or overtime still flagged.
            </p>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-sky-900">Returned</p>
            <p className="mt-2 text-2xl font-semibold text-sky-900">
              {timesheetTeamSummary.returnedCount}
            </p>
            <p className="mt-1 text-xs text-sky-700">
              Months returned for changes and not yet resubmitted.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-900">Pending Handoff</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">
              {timesheetTeamSummary.approvedCount}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Months already signed off and still waiting for payroll handoff.
            </p>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-teal-900">Handed Off</p>
            <p className="mt-2 text-2xl font-semibold text-teal-900">
              {timesheetTeamSummary.handedOffCount}
            </p>
            <p className="mt-1 text-xs text-teal-700">
              Months already handed to payroll or admin processing.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-rose-900">Team Leave Days</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900">
              {formatLeaveDays(timesheetTeamLeaveSummary.teamLeaveDays)}
            </p>
            <p className="mt-1 text-xs text-rose-700">
              Personal leave days already logged across the team this month.
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-900">On Leave Today</p>
            <p className="mt-2 text-2xl font-semibold text-red-900">
              {timesheetTeamLeaveSummary.peopleOnLeaveCount}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Team members currently marked on personal leave today.
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-200 bg-indigo-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-indigo-900">Upcoming Leave</p>
            <p className="mt-2 text-2xl font-semibold text-indigo-900">
              {timesheetTeamLeaveSummary.upcomingLeaveCount}
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              Team members with upcoming leave still coming this month.
            </p>
          </CardContent>
        </Card>
        <Card className="border-cyan-200 bg-cyan-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-cyan-900">People With Leave</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-900">
              {timesheetTeamLeaveSummary.peopleWithLeaveCount}
            </p>
            <p className="mt-1 text-xs text-cyan-700">
              Team members with personal leave recorded in the visible month.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-900">Override Leave Days</p>
            <p className="mt-2 text-2xl font-semibold text-red-900">
              {formatLeaveDays(timesheetTeamLeaveSummary.overrideLeaveDays)}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Leave days saved with an override because they exceeded balance or created a high
              coverage risk.
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-900">People With Overrides</p>
            <p className="mt-2 text-2xl font-semibold text-orange-900">
              {timesheetTeamLeaveSummary.peopleWithOverrideCount}
            </p>
            <p className="mt-1 text-xs text-orange-700">
              Team members who used at least one leave override in the visible month.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">Override Leave Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {timesheetTeamLeaveSummary.overrideLeaveBlockCount}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Leave periods that were saved with an impact override note this month.
            </p>
          </CardContent>
        </Card>
        <Card className="border-pink-200 bg-pink-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-pink-900">Override Entries</p>
            <p className="mt-2 text-2xl font-semibold text-pink-900">
              {timesheetLeaveOverrideRegisterSummary.overrideEntryCount}
            </p>
            <p className="mt-1 text-xs text-pink-700">
              Exact override leave dates recorded in the visible month.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-rose-200 bg-rose-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-rose-900">Half-Day Overrides</p>
            <p className="mt-2 text-2xl font-semibold text-rose-900">
              {timesheetLeaveOverrideRegisterSummary.halfDayOverrideCount}
            </p>
            <p className="mt-1 text-xs text-rose-700">
              Override entries using half-day leave instead of a full day.
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-violet-900">Holiday Overlap Overrides</p>
            <p className="mt-2 text-2xl font-semibold text-violet-900">
              {timesheetLeaveOverrideRegisterSummary.holidayOverlapCount}
            </p>
            <p className="mt-1 text-xs text-violet-700">
              Override dates that also land on a shared holiday or shutdown day.
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-yellow-900">Pending Override Review</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-900">
              {timesheetLeaveOverrideRegisterSummary.pendingReviewCount}
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Override entries still waiting for an internal admin review note.
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-900">Pending Override Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-orange-900">
              {timesheetLeaveOverrideBlockSummary.pendingBlockCount}
            </p>
            <p className="mt-1 text-xs text-orange-700">
              Continuous override leave periods that still have at least one day waiting for
              review.
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-900">Overdue Override Reviews</p>
            <p className="mt-2 text-2xl font-semibold text-red-900">
              {timesheetLeaveOverrideRegisterSummary.overduePendingReviewCount}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Pending override reviews that have been sitting for two days or longer.
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-300 bg-red-50/90">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-red-900">Overdue Override Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-red-900">
              {timesheetLeaveOverrideBlockSummary.overduePendingBlockCount}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Override blocks whose oldest pending day has been waiting two days or longer.
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-blue-900">Partly Reviewed Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-blue-900">
              {timesheetLeaveOverrideBlockSummary.mixedBlockCount}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Override leave periods where some days are reviewed and some are still pending.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-900">Reviewed Overrides</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">
              {timesheetLeaveOverrideRegisterSummary.reviewedCount}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Override entries already acknowledged and noted by an internal admin.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-300 bg-emerald-50/90">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-900">Reviewed Override Blocks</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">
              {timesheetLeaveOverrideBlockSummary.reviewedBlockCount}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Continuous override leave periods already fully reviewed by an internal admin.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-sky-200 bg-sky-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-sky-900">Departments With Leave</p>
            <p className="mt-2 text-2xl font-semibold text-sky-900">
              {timesheetDepartmentLeaveSummary.departmentsWithLeave}
            </p>
            <p className="mt-1 text-xs text-sky-700">
              Departments with recorded personal leave in the visible month.
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-blue-900">Departments Off Today</p>
            <p className="mt-2 text-2xl font-semibold text-blue-900">
              {timesheetDepartmentLeaveSummary.departmentsOnLeaveToday}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Departments currently carrying at least one person on leave today.
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-violet-900">Peak Dept Coverage</p>
            <p className="mt-2 text-2xl font-semibold text-violet-900">
              {timesheetDepartmentLeaveSummary.peakCoveragePercent}%
            </p>
            <p className="mt-1 text-xs text-violet-700">
              Highest single department leave coverage reached on the current month view.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-emerald-900">Most Affected Dept</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">
              {timesheetDepartmentLeaveSummary.peakCoverageDepartment}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Department with the strongest same-day leave pressure in this month.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-fuchsia-200 bg-fuchsia-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-fuchsia-900">Multi-Person Leave Days</p>
            <p className="mt-2 text-2xl font-semibold text-fuchsia-900">
              {timesheetTeamLeaveCalendarSummary.multiPersonLeaveDays}
            </p>
            <p className="mt-1 text-xs text-fuchsia-700">
              Dates in this month where two or more people are off at the same time.
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">High Risk Leave Days</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {timesheetTeamLeaveCoverageSummary.highRiskDays}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Dates where leave load is heavy enough to create a clear coverage risk.
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-yellow-900">Coverage Watch Days</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-900">
              {timesheetTeamLeaveCoverageSummary.mediumRiskDays}
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Medium-pressure dates worth checking before more leave is added.
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-purple-900">Holiday Overlap Days</p>
            <p className="mt-2 text-2xl font-semibold text-purple-900">
              {timesheetTeamLeaveCoverageSummary.sharedHolidayOverlapDays}
            </p>
            <p className="mt-1 text-xs text-purple-700">
              Leave dates that also sit on a public holiday or shutdown entry.
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-900">Peak Coverage %</p>
            <p className="mt-2 text-2xl font-semibold text-orange-900">
              {timesheetTeamLeaveCoverageSummary.peakCoveragePercent}%
            </p>
            <p className="mt-1 text-xs text-orange-700">
              Highest share of the visible team on leave on one date this month.
            </p>
          </CardContent>
        </Card>
        <Card className="border-lime-200 bg-lime-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-lime-900">Today&apos;s Leave Load</p>
            <p className="mt-2 text-2xl font-semibold text-lime-900">
              {timesheetTeamLeaveCalendarSummary.todayLeaveLoad}
            </p>
            <p className="mt-1 text-xs text-lime-700">
              People currently on personal leave today.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-900">High Risk Dept Days</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {timesheetDepartmentCoverageSummary.highRiskDepartmentDays}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Department-date combinations where leave creates a strong same-day coverage risk.
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-yellow-900">Dept Coverage Watch</p>
            <p className="mt-2 text-2xl font-semibold text-yellow-900">
              {timesheetDepartmentCoverageSummary.mediumRiskDepartmentDays}
            </p>
            <p className="mt-1 text-xs text-yellow-700">
              Department dates worth checking before additional leave is approved.
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-purple-900">Impacted Departments</p>
            <p className="mt-2 text-2xl font-semibold text-purple-900">
              {timesheetDepartmentCoverageSummary.impactedDepartments}
            </p>
            <p className="mt-1 text-xs text-purple-700">
              Departments appearing in the coverage alerts during this month view.
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/80">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-orange-900">Peak Dept Coverage %</p>
            <p className="mt-2 text-2xl font-semibold text-orange-900">
              {timesheetDepartmentCoverageSummary.peakDepartmentCoveragePercent}%
            </p>
            <p className="mt-1 text-xs text-orange-700">
              Highest share of one department off on a single date this month.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default PlannerTimesheetAdminSummaryPanel;
