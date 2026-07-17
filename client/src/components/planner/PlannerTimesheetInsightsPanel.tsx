import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  PlannerDefaultTimesheetHoursLite,
  PlannerPreviousTimesheetSummaryLite,
  PlannerTimesheetAttentionRowLite,
  PlannerTimesheetCompletionSummaryLite,
  PlannerTimesheetDayComparisonSummaryLite,
  PlannerTimesheetHistoryEventLite,
  PlannerTimesheetMonthComparisonLite,
  PlannerTimesheetMonthStatusLite,
  PlannerTimesheetProfileLite,
  PlannerTimesheetSummaryLite,
  PlannerUserLite,
} from "@/components/planner/plannerSharedTypes";
import {
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Layers3,
  Lock,
  Unlock,
  Users,
} from "lucide-react";

type PlannerTimesheetInsightsPanelProps = {
  DEFAULT_TIMESHEET_PROFILE_HOURS: PlannerDefaultTimesheetHoursLite;
  PLANNER_TIMESHEET_DECLARATION_TEXT: string;
  currentMonthTimesheetHolidays: readonly unknown[];
  formatLeaveDays: (value: number) => string;
  formatMinutesAsDuration: (value: number) => string;
  formatPlannerDateTime: (value: string | Date) => string;
  formatVarianceMinutes: (value: number) => string;
  fridayDefaultTemplateLabel: string;
  getMonthLabel: (monthIndex: number) => string;
  getTimesheetWorkflowStatusLabel: (status: string) => string;
  isTimesheetMonthApproved: boolean;
  isTimesheetMonthHandedOff: boolean;
  isTimesheetMonthLocked: boolean;
  isTimesheetMonthReadOnly: boolean;
  isTimesheetMonthSubmitted: boolean;
  isViewingAnotherTimesheet: boolean;
  leaveYearRange: {
    label: string;
    startMonth: number;
  };
  monThuDefaultTemplateLabel: string;
  previousTimesheetSummary: PlannerPreviousTimesheetSummaryLite;
  selectedDate: Date;
  setTimesheetSubmissionDeclarationAccepted: (value: boolean) => void;
  shouldShowPlannerSection: (sectionId: string) => boolean;
  timesheetAttentionRows: readonly PlannerTimesheetAttentionRowLite[];
  timesheetCompletionSummary: PlannerTimesheetCompletionSummaryLite;
  timesheetDayComparisonSummary: PlannerTimesheetDayComparisonSummaryLite;
  timesheetMonthComparison: PlannerTimesheetMonthComparisonLite;
  timesheetMonthStatusLabel: string;
  timesheetPersonalLeaveAvailableDays: number | null;
  timesheetPersonalLeaveRemainingDays: number | null;
  timesheetPersonalLeaveYearUsedDays: number;
  timesheetSubmissionBlockers: readonly PlannerTimesheetAttentionRowLite[];
  timesheetSubmissionDeclarationAccepted: boolean;
  timesheetSubmissionWarnings: readonly PlannerTimesheetAttentionRowLite[];
  timesheetSummary: PlannerTimesheetSummaryLite;
  typedTimesheetHistory: readonly PlannerTimesheetHistoryEventLite[];
  typedTimesheetMonthStatus: PlannerTimesheetMonthStatusLite;
  typedTimesheetProfile: PlannerTimesheetProfileLite | null;
  user: PlannerUserLite | null | undefined;
  weekendDefaultTemplateLabel: string;
};

export function PlannerTimesheetInsightsPanel({
  DEFAULT_TIMESHEET_PROFILE_HOURS,
  PLANNER_TIMESHEET_DECLARATION_TEXT,
  currentMonthTimesheetHolidays,
  formatLeaveDays,
  formatMinutesAsDuration,
  formatPlannerDateTime,
  formatVarianceMinutes,
  fridayDefaultTemplateLabel,
  getMonthLabel,
  getTimesheetWorkflowStatusLabel,
  isTimesheetMonthApproved,
  isTimesheetMonthHandedOff,
  isTimesheetMonthLocked,
  isTimesheetMonthReadOnly,
  isTimesheetMonthSubmitted,
  isViewingAnotherTimesheet,
  leaveYearRange,
  monThuDefaultTemplateLabel,
  previousTimesheetSummary,
  selectedDate: _selectedDate,
  setTimesheetSubmissionDeclarationAccepted,
  shouldShowPlannerSection,
  timesheetAttentionRows,
  timesheetCompletionSummary,
  timesheetDayComparisonSummary,
  timesheetMonthComparison,
  timesheetMonthStatusLabel,
  timesheetPersonalLeaveAvailableDays,
  timesheetPersonalLeaveRemainingDays,
  timesheetPersonalLeaveYearUsedDays,
  timesheetSubmissionBlockers,
  timesheetSubmissionDeclarationAccepted,
  timesheetSubmissionWarnings,
  timesheetSummary,
  typedTimesheetHistory,
  typedTimesheetMonthStatus,
  typedTimesheetProfile,
  user,
  weekendDefaultTemplateLabel,
}: PlannerTimesheetInsightsPanelProps) {

  return (
    <>
            <div id="timesheet-summary" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-10">
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-amber-900">Tracked Days</p>
                  <Calendar className="h-4 w-4 text-amber-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {timesheetSummary.activeDays}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Days with ticks or remarks in the current month
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-900">Logged Hours</p>
                  <Clock3 className="h-4 w-4 text-blue-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-blue-900">
                  {formatMinutesAsDuration(timesheetSummary.workedMinutes)}
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  Total worked time saved for this month
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-emerald-900">Monthly Target</p>
                  <Layers3 className="h-4 w-4 text-emerald-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-emerald-900">
                  {formatMinutesAsDuration(timesheetSummary.expectedMinutes)}
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Standard hours for the saved working days
                </p>
              </div>

              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-sky-900">Total Ticks</p>
                  <CheckCircle2 className="h-4 w-4 text-sky-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-sky-900">
                  {timesheetSummary.totalTicks}
                </p>
                <p className="mt-1 text-xs text-sky-700">
                  All selected activity ticks for this month
                </p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-violet-900">Completion</p>
                  <CheckCircle2 className="h-4 w-4 text-violet-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-violet-900">
                  {timesheetCompletionSummary.dueWorkingDays > 0
                    ? `${timesheetCompletionSummary.completionPercent}%`
                    : "N/A"}
                </p>
                <p className="mt-1 text-xs text-violet-700">
                  {timesheetCompletionSummary.dueWorkingDays > 0
                    ? `${timesheetCompletionSummary.completedWorkingDays}/${timesheetCompletionSummary.dueWorkingDays} due working days completed`
                    : "No due working days yet this month"}
                </p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-rose-900">Variance</p>
                  <ArrowRightLeft className="h-4 w-4 text-rose-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-rose-900">
                  {formatVarianceMinutes(timesheetSummary.varianceMinutes)}
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  Difference from the normal scheduled hours
                </p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-violet-900">Signed As</p>
                  <Users className="h-4 w-4 text-violet-700" />
                </div>
                <p className="mt-2 text-lg font-bold text-violet-900">
                  {typedTimesheetProfile?.signatureName?.trim() ||
                    user?.name?.trim() ||
                    "Not set"}
                </p>
                <p className="mt-1 text-xs text-violet-700">
                  Department: {typedTimesheetProfile?.department?.trim() || "Not set"}
                </p>
                <p className="mt-2 text-xs text-violet-700">
                  Normal hours: Mon-Thu{" "}
                  {`${typedTimesheetProfile?.monThuStartTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.monThuStartTime} - ${typedTimesheetProfile?.monThuEndTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.monThuEndTime}`}
                  , Fri{" "}
                  {`${typedTimesheetProfile?.fridayStartTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.fridayStartTime} - ${typedTimesheetProfile?.fridayEndTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.fridayEndTime}`}
                </p>
                <p className="mt-1 text-xs text-violet-700">
                  Unpaid breaks: Lunch{" "}
                  {typedTimesheetProfile?.lunchBreakMinutes ??
                    DEFAULT_TIMESHEET_PROFILE_HOURS.lunchBreakMinutes}
                  min, Tea{" "}
                  {typedTimesheetProfile?.teaBreakMinutes ??
                    DEFAULT_TIMESHEET_PROFILE_HOURS.teaBreakMinutes}
                  min
                </p>
                <p className="mt-1 text-xs text-violet-700">
                  Personal leave allowance:{" "}
                  {timesheetPersonalLeaveAvailableDays === null
                    ? "Not set"
                    : `${formatLeaveDays(timesheetPersonalLeaveAvailableDays)} day(s) available this year, ${formatLeaveDays(timesheetPersonalLeaveYearUsedDays)} used YTD, ${formatLeaveDays(
                        timesheetPersonalLeaveRemainingDays ?? 0
                      )} remaining`}
                </p>
                <p className="mt-1 text-xs text-violet-700">
                  Leave year: starts in {getMonthLabel(leaveYearRange.startMonth)} ({leaveYearRange.label})
                </p>
                <p className="mt-2 text-xs text-violet-700">
                  Default templates: Mon-Thu {monThuDefaultTemplateLabel}, Fri{" "}
                  {fridayDefaultTemplateLabel}, Weekend {weekendDefaultTemplateLabel}
                </p>
              </div>

              <div className="rounded-xl border border-orange-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-orange-900">Needs Review</p>
                  <Clock3 className="h-4 w-4 text-orange-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-orange-900">
                  {timesheetAttentionRows.length}
                </p>
                <p className="mt-1 text-xs text-orange-700">
                  Missing, short, overtime, or incomplete saved days
                </p>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-900">Holiday Dates</p>
                  <Calendar className="h-4 w-4 text-indigo-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-indigo-900">
                  {currentMonthTimesheetHolidays.length}
                </p>
                <p className="mt-1 text-xs text-indigo-700">
                  Saved holiday or shutdown dates in the visible month
                </p>
              </div>

              <div className="rounded-xl border border-fuchsia-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-fuchsia-900">Personal Leave Days</p>
                  <Calendar className="h-4 w-4 text-fuchsia-700" />
                </div>
                <p className="mt-2 text-3xl font-bold text-fuchsia-900">
                  {formatLeaveDays(timesheetSummary.personalLeaveDays)}
                </p>
                <p className="mt-1 text-xs text-fuchsia-700">
                  Saved non-working leave days for you, separate from the shared holiday calendar
                </p>
              </div>

              <div
                className={`rounded-xl border bg-white p-4 ${
                  isTimesheetMonthReadOnly ? "border-slate-300" : "border-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-medium ${
                      isTimesheetMonthReadOnly ? "text-slate-900" : "text-emerald-900"
                    }`}
                  >
                    Month Status
                  </p>
                  {isTimesheetMonthReadOnly ? (
                    <Lock className="h-4 w-4 text-slate-700" />
                  ) : (
                    <Unlock className="h-4 w-4 text-emerald-700" />
                  )}
                </div>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    isTimesheetMonthReadOnly ? "text-slate-900" : "text-emerald-900"
                  }`}
                >
                  {timesheetMonthStatusLabel}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    isTimesheetMonthReadOnly ? "text-slate-700" : "text-emerald-700"
                  }`}
                >
                  {isTimesheetMonthHandedOff
                    ? `Handed off ${typedTimesheetMonthStatus?.handedOffAt ? formatPlannerDateTime(typedTimesheetMonthStatus.handedOffAt) : "for payroll or admin processing"}`
                    : isTimesheetMonthApproved
                    ? `Approved ${typedTimesheetMonthStatus?.reviewedAt ? formatPlannerDateTime(typedTimesheetMonthStatus.reviewedAt) : "for this month"}`
                    : isTimesheetMonthSubmitted
                      ? `Submitted ${typedTimesheetMonthStatus?.submittedAt ? formatPlannerDateTime(typedTimesheetMonthStatus.submittedAt) : "for review"}`
                      : isTimesheetMonthLocked
                        ? `Locked ${typedTimesheetMonthStatus?.lockedAt ? formatPlannerDateTime(typedTimesheetMonthStatus.lockedAt) : "for this month"}`
                        : "Daily saves and bulk fills are still allowed"}
                </p>
                {typedTimesheetMonthStatus?.submittedByName?.trim() ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Submitted by {typedTimesheetMonthStatus.submittedByName.trim()}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.employeeDeclarationAccepted ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Employee declaration confirmed
                    {typedTimesheetMonthStatus.employeeDeclarationAcceptedAt
                      ? ` on ${formatPlannerDateTime(
                          typedTimesheetMonthStatus.employeeDeclarationAcceptedAt
                        )}`
                      : ""}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.submissionNote?.trim() ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Submission note: {typedTimesheetMonthStatus.submissionNote.trim()}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.reviewedByName?.trim() ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Reviewed by {typedTimesheetMonthStatus.reviewedByName.trim()}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.reviewerDeclarationAccepted ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Reviewer declaration confirmed
                    {typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt
                      ? ` on ${formatPlannerDateTime(
                          typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt
                        )}`
                      : ""}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.reviewNote?.trim() ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Review note: {typedTimesheetMonthStatus.reviewNote.trim()}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.handedOffByName?.trim() ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Handed off by {typedTimesheetMonthStatus.handedOffByName.trim()}
                  </p>
                ) : null}
                {typedTimesheetMonthStatus?.handoffNote?.trim() ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Handoff note: {typedTimesheetMonthStatus.handoffNote.trim()}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-cyan-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-cyan-900">Employee Declaration</p>
                    <p className="mt-1 text-xs text-cyan-700">
                      This must be confirmed before a finalised month can be submitted for
                      review.
                    </p>
                  </div>
                  <Badge
                    variant={
                      typedTimesheetMonthStatus?.employeeDeclarationAccepted
                        ? "secondary"
                        : timesheetSubmissionDeclarationAccepted
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {typedTimesheetMonthStatus?.employeeDeclarationAccepted
                      ? "Confirmed"
                      : timesheetSubmissionDeclarationAccepted
                        ? "Ready"
                        : "Pending"}
                  </Badge>
                </div>
                <div className="mt-3 rounded-lg border bg-cyan-50 p-3 text-sm text-cyan-950">
                  {PLANNER_TIMESHEET_DECLARATION_TEXT}
                </div>
                {typedTimesheetMonthStatus?.employeeDeclarationAccepted ? (
                  <p className="mt-3 text-xs text-slate-600">
                    Confirmed
                    {typedTimesheetMonthStatus.employeeDeclarationAcceptedAt
                      ? ` on ${formatPlannerDateTime(
                          typedTimesheetMonthStatus.employeeDeclarationAcceptedAt
                        )}`
                      : ""}
                    .
                  </p>
                ) : !isViewingAnotherTimesheet ? (
                  <label className="mt-3 flex items-start gap-3 text-sm text-slate-700">
                    <Checkbox
                      checked={timesheetSubmissionDeclarationAccepted}
                      onCheckedChange={(checked) =>
                        setTimesheetSubmissionDeclarationAccepted(Boolean(checked))
                      }
                      disabled={isTimesheetMonthSubmitted || isTimesheetMonthApproved}
                    />
                    <span>
                      I confirm the declaration above for this month before submitting it for
                      internal review.
                    </span>
                  </label>
                ) : (
                  <p className="mt-3 text-xs text-slate-600">
                    Declaration confirmation is recorded when the owner submits their month.
                  </p>
                )}
              </div>

              <div
                className={`rounded-xl border bg-white p-4 ${
                  timesheetSubmissionBlockers.length > 0
                    ? "border-red-200"
                    : timesheetSubmissionWarnings.length > 0
                      ? "border-amber-200"
                      : "border-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-medium ${
                      timesheetSubmissionBlockers.length > 0
                        ? "text-red-900"
                        : timesheetSubmissionWarnings.length > 0
                          ? "text-amber-900"
                          : "text-emerald-900"
                    }`}
                  >
                    Submission Readiness
                  </p>
                  {timesheetSubmissionBlockers.length > 0 ? (
                    <Lock className="h-4 w-4 text-red-700" />
                  ) : timesheetSubmissionWarnings.length > 0 ? (
                    <Clock3 className="h-4 w-4 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  )}
                </div>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    timesheetSubmissionBlockers.length > 0
                      ? "text-red-900"
                      : timesheetSubmissionWarnings.length > 0
                        ? "text-amber-900"
                        : "text-emerald-900"
                  }`}
                >
                  {timesheetSubmissionBlockers.length > 0
                    ? "Blocked"
                    : timesheetSubmissionWarnings.length > 0
                      ? "Warnings Only"
                      : "Ready"}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    timesheetSubmissionBlockers.length > 0
                      ? "text-red-700"
                      : timesheetSubmissionWarnings.length > 0
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {timesheetSubmissionBlockers.length > 0
                    ? `${timesheetSubmissionBlockers.length} blocking item${timesheetSubmissionBlockers.length === 1 ? "" : "s"} must be fixed first`
                    : timesheetSubmissionWarnings.length > 0
                      ? `${timesheetSubmissionWarnings.length} warning${timesheetSubmissionWarnings.length === 1 ? "" : "s"} will still be visible to the reviewer`
                      : "No missing working days, missing hours, or blank saved activities"}
                </p>
              </div>
            </div>

            {shouldShowPlannerSection("timesheet-month-comparison") ? (
            <Card id="timesheet-month-comparison">
              <CardHeader>
                <CardTitle>Month Comparison</CardTitle>
                <CardDescription>
                  Compare the visible month against {timesheetMonthComparison.previousMonthLabel} to spot workload changes more quickly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!timesheetMonthComparison.hasPreviousData ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No saved timesheet days were found in {timesheetMonthComparison.previousMonthLabel}, so there is nothing to compare yet.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-sky-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-sky-900">Hours Change</p>
                          <Clock3 className="h-4 w-4 text-sky-700" />
                        </div>
                        <p className="mt-2 text-3xl font-bold text-sky-900">
                          {formatVarianceMinutes(timesheetMonthComparison.workedMinutesDelta)}
                        </p>
                        <p className="mt-1 text-xs text-sky-700">
                          {formatMinutesAsDuration(timesheetSummary.workedMinutes)} now vs{" "}
                          {formatMinutesAsDuration(previousTimesheetSummary.workedMinutes)} in{" "}
                          {timesheetMonthComparison.previousMonthLabel}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-amber-900">Tracked Day Change</p>
                          <Calendar className="h-4 w-4 text-amber-700" />
                        </div>
                        <p className="mt-2 text-3xl font-bold text-amber-900">
                          {timesheetMonthComparison.trackedDaysDelta > 0
                            ? `+${timesheetMonthComparison.trackedDaysDelta}`
                            : String(timesheetMonthComparison.trackedDaysDelta)}
                        </p>
                        <p className="mt-1 text-xs text-amber-700">
                          {timesheetSummary.activeDays} tracked day(s) now vs{" "}
                          {previousTimesheetSummary.activeDays} before
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-emerald-900">Tick Change</p>
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        </div>
                        <p className="mt-2 text-3xl font-bold text-emerald-900">
                          {timesheetMonthComparison.totalTicksDelta > 0
                            ? `+${timesheetMonthComparison.totalTicksDelta}`
                            : String(timesheetMonthComparison.totalTicksDelta)}
                        </p>
                        <p className="mt-1 text-xs text-emerald-700">
                          {timesheetSummary.totalTicks} total tick(s) now vs{" "}
                          {previousTimesheetSummary.totalTicks} before
                        </p>
                      </div>

                      <div className="rounded-xl border border-rose-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-rose-900">Variance Change</p>
                          <ArrowRightLeft className="h-4 w-4 text-rose-700" />
                        </div>
                        <p className="mt-2 text-3xl font-bold text-rose-900">
                          {formatVarianceMinutes(timesheetMonthComparison.varianceDelta)}
                        </p>
                        <p className="mt-1 text-xs text-rose-700">
                          Month variance moved from{" "}
                          {formatVarianceMinutes(previousTimesheetSummary.varianceMinutes)} to{" "}
                          {formatVarianceMinutes(timesheetSummary.varianceMinutes)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="text-sm font-medium text-slate-900">Matched Days</div>
                        <div className="mt-2 text-3xl font-bold text-slate-900">
                          {timesheetDayComparisonSummary.same}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Days that still match {timesheetMonthComparison.previousMonthLabel}
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <div className="text-sm font-medium text-amber-900">Changed Days</div>
                        <div className="mt-2 text-3xl font-bold text-amber-900">
                          {timesheetDayComparisonSummary.changed}
                        </div>
                        <div className="mt-1 text-xs text-amber-700">
                          Saved days that changed from the previous month
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <div className="text-sm font-medium text-emerald-900">New Days</div>
                        <div className="mt-2 text-3xl font-bold text-emerald-900">
                          {timesheetDayComparisonSummary.newDays}
                        </div>
                        <div className="mt-1 text-xs text-emerald-700">
                          Days only saved in the visible month
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-white p-4">
                        <div className="text-sm font-medium text-rose-900">Missing Days</div>
                        <div className="mt-2 text-3xl font-bold text-rose-900">
                          {timesheetDayComparisonSummary.missing}
                        </div>
                        <div className="mt-1 text-xs text-rose-700">
                          Days that existed in {timesheetMonthComparison.previousMonthLabel} but are not saved now
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-slate-50 p-4">
                      <div className="mb-3">
                        <div className="font-medium text-slate-900">Top Activity Shifts</div>
                        <div className="text-sm text-muted-foreground">
                          The biggest changes in activity usage compared with {timesheetMonthComparison.previousMonthLabel}.
                        </div>
                      </div>
                      {timesheetMonthComparison.topActivityShifts.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No activity changes were detected between the two months.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {timesheetMonthComparison.topActivityShifts.map((row) => (
                            <div
                              key={row.optionId}
                              className="flex flex-col gap-1 rounded-lg border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <div className="font-medium text-slate-900">{row.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {row.currentCount} this month vs {row.previousCount} in{" "}
                                  {timesheetMonthComparison.previousMonthLabel}
                                </div>
                              </div>
                              <Badge
                                variant={
                                  row.delta === 0
                                    ? "outline"
                                    : row.delta > 0
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {row.delta > 0 ? `+${row.delta}` : String(row.delta)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            ) : null}

            {shouldShowPlannerSection("timesheet-month-history") ? (
            <Card id="timesheet-month-history">
              <CardHeader>
                <CardTitle>Month History</CardTitle>
                <CardDescription>
                  Track the month lifecycle from finalisation through submission, approval, and any returned changes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {typedTimesheetHistory.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No month history has been recorded yet for this period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {typedTimesheetHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-medium">{entry.actionLabel}</div>
                              <Badge variant="outline">
                                {getTimesheetWorkflowStatusLabel(entry.resultingStatus)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.actorName?.trim()
                                ? `${entry.actorName.trim()}`
                                : "System"}
                              {" · "}
                              {formatPlannerDateTime(entry.createdAt)}
                            </div>
                          </div>
                        </div>
                        {entry.note?.trim() ? (
                          <div className="mt-3 rounded-lg border bg-white p-3 text-sm text-slate-700">
                            {entry.note.trim()}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            ) : null}
    </>
  );
}

export default PlannerTimesheetInsightsPanel;
