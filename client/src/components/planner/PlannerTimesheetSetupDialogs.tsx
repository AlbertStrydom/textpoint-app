import { FormDialog } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import type { Dispatch, SetStateAction } from "react";
import type {
  PlannerDefaultTimesheetProfileHoursLite,
  PlannerTimesheetDepartmentCoveragePreviewLite,
  PlannerTimesheetLeaveBalancePreviewLite,
  PlannerTimesheetLeaveBlockRowLite,
  PlannerTimesheetLeaveRangePreviewInputLite,
  PlannerTimesheetOptionLite,
  PlannerTimesheetProfileLite,
  PlannerTimesheetTemplateLite,
  PlannerUserLite,
} from "@/components/planner/plannerSharedTypes";

type MutationWithAsync<TInput> = {
  mutateAsync: (input: TInput) => Promise<unknown>;
};

type RefetchFn = () => Promise<unknown>;

type PlannerTimesheetSetupDialogsProps = {
  DEFAULT_TIMESHEET_PROFILE_HOURS: PlannerDefaultTimesheetProfileHoursLite;
  activeNonWorkingTimesheetOptions: PlannerTimesheetOptionLite[];
  activeTimesheetTemplates: PlannerTimesheetTemplateLite[];
  createTimesheetOptionMutation: MutationWithAsync<{
    description: string | null;
    hoursCategory: "working" | "non_working";
    isActive: boolean;
    label: string;
    sortOrder: number;
  }>;
  defaultTimesheetLeaveOptionId: string;
  editingTimesheetLeaveBlock: PlannerTimesheetLeaveBlockRowLite | null;
  editingTimesheetOption: PlannerTimesheetOptionLite | null;
  formatLeaveDays: (days: number) => string;
  formatPlannerDate: (value: string | Date | null | undefined) => string;
  getDateInputValue: (value: string | Date | null | undefined) => string;
  getMonthLabel: (monthIndex: number) => string;
  getTimesheetLeaveCoverageBadgeVariant: (
    severity: "high" | "medium"
  ) => "default" | "secondary" | "destructive" | "outline";
  handleApplyTimesheetLeaveRange: (values: Record<string, unknown>) => Promise<void>;
  isTimesheetLeaveRangeDialogOpen: boolean;
  isTimesheetOptionDialogOpen: boolean;
  isTimesheetProfileDialogOpen: boolean;
  refetchTimesheetEntries: RefetchFn;
  refetchTimesheetOptions: RefetchFn;
  refetchTimesheetOverview: RefetchFn;
  refetchTimesheetProfile: RefetchFn;
  refetchTimesheetTeamLeaveCalendar: RefetchFn;
  refetchTimesheetTeamLeaveOverview: RefetchFn;
  refetchTimesheetTemplates: RefetchFn;
  refetchYearTimesheetEntries: RefetchFn;
  saveTimesheetProfileMutation: MutationWithAsync<{
    department: string | null;
    fridayEndTime: string | null;
    fridayStartTime: string | null;
    fridayTemplateId: number | null;
    leaveYearStartMonth: number;
    lunchBreakMinutes: number;
    monThuEndTime: string | null;
    monThuStartTime: string | null;
    monThuTemplateId: number | null;
    personalLeaveAllowanceDays: number;
    personalLeaveCarryOverDays: number;
    signatureName: string | null;
    teaBreakMinutes: number;
    weekendEndTime: string | null;
    weekendStartTime: string | null;
    weekendTemplateId: number | null;
  }>;
  selectedDate: Date;
  setEditingTimesheetLeaveBlock: Dispatch<SetStateAction<PlannerTimesheetLeaveBlockRowLite | null>>;
  setEditingTimesheetOption: Dispatch<SetStateAction<PlannerTimesheetOptionLite | null>>;
  setIsTimesheetLeaveRangeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetOptionDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetProfileDialogOpen: Dispatch<SetStateAction<boolean>>;
  setTimesheetLeaveRangePreviewValues: Dispatch<
    SetStateAction<Record<string, unknown>>
  >;
  timesheetDepartmentCoveragePreview: PlannerTimesheetDepartmentCoveragePreviewLite | undefined;
  timesheetDepartmentCoveragePreviewLoading: boolean;
  timesheetLeaveBalancePreview: PlannerTimesheetLeaveBalancePreviewLite | undefined;
  timesheetLeaveBalancePreviewLoading: boolean;
  timesheetLeaveRangePreviewInput: PlannerTimesheetLeaveRangePreviewInputLite | null;
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
  };
  typedTimesheetOptions: PlannerTimesheetOptionLite[];
  typedTimesheetProfile: PlannerTimesheetProfileLite | null;
  updateTimesheetOptionMutation: MutationWithAsync<{
    data: {
      description: string | null;
      hoursCategory: "working" | "non_working";
      isActive: boolean;
      label: string;
      sortOrder: number;
    };
    id: number;
  }>;
  user: PlannerUserLite | null | undefined;
};

export function PlannerTimesheetSetupDialogs({
  DEFAULT_TIMESHEET_PROFILE_HOURS,
  activeNonWorkingTimesheetOptions,
  activeTimesheetTemplates,
  createTimesheetOptionMutation,
  defaultTimesheetLeaveOptionId,
  editingTimesheetLeaveBlock,
  editingTimesheetOption,
  formatLeaveDays,
  formatPlannerDate,
  getDateInputValue,
  getMonthLabel,
  getTimesheetLeaveCoverageBadgeVariant,
  handleApplyTimesheetLeaveRange,
  isTimesheetLeaveRangeDialogOpen,
  isTimesheetOptionDialogOpen,
  isTimesheetProfileDialogOpen,
  refetchTimesheetEntries,
  refetchTimesheetOptions,
  refetchTimesheetOverview,
  refetchTimesheetProfile,
  refetchTimesheetTeamLeaveCalendar,
  refetchTimesheetTeamLeaveOverview,
  refetchTimesheetTemplates,
  refetchYearTimesheetEntries,
  saveTimesheetProfileMutation,
  selectedDate,
  setEditingTimesheetLeaveBlock,
  setEditingTimesheetOption,
  setIsTimesheetLeaveRangeDialogOpen,
  setIsTimesheetOptionDialogOpen,
  setIsTimesheetProfileDialogOpen,
  setTimesheetLeaveRangePreviewValues,
  timesheetDepartmentCoveragePreview,
  timesheetDepartmentCoveragePreviewLoading,
  timesheetLeaveBalancePreview,
  timesheetLeaveBalancePreviewLoading,
  timesheetLeaveRangePreviewInput,
  toast,
  typedTimesheetOptions,
  typedTimesheetProfile,
  updateTimesheetOptionMutation,
  user,
}: PlannerTimesheetSetupDialogsProps) {

  return (
    <>
        <FormDialog
          open={isTimesheetLeaveRangeDialogOpen}
          onOpenChange={(open) => {
            setIsTimesheetLeaveRangeDialogOpen(open);
            if (!open) {
              setEditingTimesheetLeaveBlock(null);
              setTimesheetLeaveRangePreviewValues({});
            }
          }}
          title={editingTimesheetLeaveBlock ? "Edit Personal Leave Block" : "Apply Personal Leave Range"}
          description="Create personal non-working leave days across a date range at once. Shared public holidays and company shutdowns can stay untouched if you want to keep them separate."
          submitLabel={editingTimesheetLeaveBlock ? "Save Leave Block" : "Apply Leave Range"}
          initialValues={{
            fromDate: editingTimesheetLeaveBlock
              ? getDateInputValue(editingTimesheetLeaveBlock.startDate)
              : getDateInputValue(selectedDate),
            toDate: editingTimesheetLeaveBlock
              ? getDateInputValue(editingTimesheetLeaveBlock.endDate)
              : getDateInputValue(selectedDate),
            leaveOptionId: editingTimesheetLeaveBlock
              ? String(
                  activeNonWorkingTimesheetOptions.find(
                    (option) => option.label === editingTimesheetLeaveBlock.leaveLabels[0]
                  )?.id || defaultTimesheetLeaveOptionId
                )
              : defaultTimesheetLeaveOptionId,
            leavePortionPercent: String(editingTimesheetLeaveBlock?.leavePortionPercent ?? 100),
            remarks: editingTimesheetLeaveBlock?.remarks ?? "",
            includeWeekends: false,
            overwriteExisting: true,
            skipSharedHolidays: true,
            impactAcknowledged: false,
            impactOverrideReason: "",
          }}
          fields={[
            {
              name: "fromDate",
              label: "From Date",
              type: "date",
              required: true,
            },
            {
              name: "toDate",
              label: "To Date",
              type: "date",
              required: true,
            },
            {
              name: "leaveOptionId",
              label: "Leave Activity",
              type: "select",
              required: true,
              options: activeNonWorkingTimesheetOptions.map((option) => ({
                value: String(option.id),
                label: option.label,
              })),
            },
            {
              name: "remarks",
              label: "Leave Remarks",
              type: "textarea",
              placeholder: "Optional note, such as annual leave, sick leave, or family responsibility leave",
            },
            {
              name: "leavePortionPercent",
              label: "Leave Portion",
              type: "select",
              options: [
                { value: "100", label: "Full Day Leave" },
                { value: "50", label: "Half Day Leave" },
              ],
            },
            {
              name: "includeWeekends",
              label: "Include Weekends",
              type: "checkbox",
              placeholder: "Apply the leave activity to Saturdays and Sundays too",
            },
            {
              name: "overwriteExisting",
              label: "Replace Existing Entries",
              type: "checkbox",
              placeholder: "Replace saved days in this range instead of keeping them",
            },
            {
              name: "skipSharedHolidays",
              label: "Keep Shared Holidays Separate",
              type: "checkbox",
              placeholder: "Do not overwrite public holidays or company shutdown dates from the holiday calendar",
            },
            {
              name: "impactAcknowledged",
              label: "Acknowledge Leave Impact",
              type: "checkbox",
              placeholder:
                "Required when this leave exceeds allowance or creates a high-risk department day",
            },
            {
              name: "impactOverrideReason",
              label: "Impact Override Note",
              type: "textarea",
              placeholder:
                "Required when allowance is exceeded or the leave creates a high-risk department day",
            },
          ]}
          onValuesChange={setTimesheetLeaveRangePreviewValues}
          renderExtraContent={() => {
            const coveragePreview = timesheetDepartmentCoveragePreview;
            const leaveBalancePreview = timesheetLeaveBalancePreview;
            const totalPreviewWorkingLeaveDays =
              leaveBalancePreview?.yearSummaries.reduce(
                (total: number, summary) => total + summary.appliedWorkingLeaveDays,
                0
              ) ?? 0;
            const totalPreviewNetLeaveChange =
              leaveBalancePreview?.yearSummaries.reduce(
                (total: number, summary) => total + summary.netLeaveDaysChange,
                0
              ) ?? 0;
            const totalPreviewReplacedLeaveDays =
              leaveBalancePreview?.yearSummaries.reduce(
                (total: number, summary) => total + summary.replacedLeaveDays,
                0
              ) ?? 0;
            const hasHighCoverageRisk = Boolean(
              coveragePreview?.previewRows.some(
                (row) => row.willApply && row.severity === "high"
              )
            );
            const hasLeaveBalanceOverAllocation = Boolean(
              leaveBalancePreview?.yearSummaries.some(
                (summary) => summary.exceedsAllowanceByDays > 0
              )
            );
            const requiresImpactAcknowledgement =
              hasLeaveBalanceOverAllocation || hasHighCoverageRisk;

            return (
              <div className="space-y-3">
                <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Leave Balance Check
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      Preview how this leave range will affect the person&apos;s leave balance before
                      saving it.
                    </div>
                  </div>

                  {requiresImpactAcknowledgement ? (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                      This leave needs an acknowledgement and an impact override note before it can be
                      applied because it {hasLeaveBalanceOverAllocation ? "exceeds the available leave balance" : "creates a high-risk department coverage day"}
                      {hasLeaveBalanceOverAllocation && hasHighCoverageRisk
                        ? " and creates a high-risk department coverage day."
                        : "."}
                    </div>
                  ) : null}

                  {!timesheetLeaveRangePreviewInput ? (
                    <div className="rounded-md border border-dashed bg-white px-3 py-3 text-sm text-muted-foreground">
                      Choose a valid leave range to check the leave balance impact.
                    </div>
                  ) : timesheetLeaveBalancePreviewLoading ? (
                    <div className="rounded-md border border-dashed bg-white px-3 py-3 text-sm text-muted-foreground">
                      Checking leave balance impact...
                    </div>
                  ) : !leaveBalancePreview ? (
                    <div className="rounded-md border border-dashed bg-white px-3 py-3 text-sm text-muted-foreground">
                      Leave balance preview is not available yet.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-md border bg-white p-3">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Leave Portion
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {leaveBalancePreview.leavePortionPercent === 50
                              ? "Half Day Leave"
                              : "Full Day Leave"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatLeaveDays(leaveBalancePreview.leavePortionPercent === 50 ? 0.5 : 1)}{" "}
                            working leave day(s) per applied weekday
                          </div>
                        </div>
                        <div className="rounded-md border bg-white p-3">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Working Leave Impact
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {formatLeaveDays(totalPreviewWorkingLeaveDays)} day(s)
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Net YTD change {formatLeaveDays(totalPreviewNetLeaveChange)} day(s)
                          </div>
                        </div>
                        <div className="rounded-md border bg-white p-3">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Existing Days Replaced
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {formatLeaveDays(totalPreviewReplacedLeaveDays)} day(s)
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {leaveBalancePreview.skippedExisting} existing day(s) kept by preview
                          </div>
                        </div>
                        <div className="rounded-md border bg-white p-3">
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Preview State
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-900">
                            {hasLeaveBalanceOverAllocation
                              ? "Allowance Exceeded"
                              : leaveBalancePreview.yearSummaries.some(
                                    (summary) => summary.availableDays !== null
                                  )
                                ? "Allowance OK"
                                : "Allowance Not Set"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {leaveBalancePreview.skippedWeekends} weekend and{" "}
                            {leaveBalancePreview.skippedSharedHolidays} holiday day(s) skipped
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {leaveBalancePreview.yearSummaries.map((summary) => {
                          const exceedsAllowance = summary.exceedsAllowanceByDays > 0;
                          return (
                            <div
                              key={`leave-balance-preview-${String(summary.leaveYearStartDate)}`}
                              className={`rounded-md border p-3 ${
                                exceedsAllowance ? "border-rose-300 bg-rose-50/80" : "bg-white"
                              }`}
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    Leave Year {formatPlannerDate(summary.leaveYearStartDate)} -{" "}
                                    {formatPlannerDate(summary.leaveYearEndDate)}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Used {formatLeaveDays(summary.currentYearUsedDays)} day(s) now,{" "}
                                    {formatLeaveDays(summary.projectedYearUsedDays)} after this
                                    leave.
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {summary.availableDays === null ? (
                                    <Badge variant="outline">Allowance Not Set</Badge>
                                  ) : exceedsAllowance ? (
                                    <Badge variant="destructive">
                                      Exceeds by {formatLeaveDays(summary.exceedsAllowanceByDays)} day(s)
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary">Within Balance</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 grid gap-2 text-xs text-slate-700 md:grid-cols-2 xl:grid-cols-4">
                                <div>
                                  <span className="font-medium">Available:</span>{" "}
                                  {summary.availableDays === null
                                    ? "Not set"
                                    : `${formatLeaveDays(summary.availableDays)} day(s)`}
                                </div>
                                <div>
                                  <span className="font-medium">Remaining:</span>{" "}
                                  {summary.currentRemainingDays === null
                                    ? "Not set"
                                    : `${formatLeaveDays(summary.currentRemainingDays)} now -> ${formatLeaveDays(summary.projectedRemainingDays ?? 0)} after apply`}
                                </div>
                                <div>
                                  <span className="font-medium">Applied working leave:</span>{" "}
                                  {formatLeaveDays(summary.appliedWorkingLeaveDays)} day(s)
                                </div>
                                <div>
                                  <span className="font-medium">Existing leave replaced:</span>{" "}
                                  {formatLeaveDays(summary.replacedLeaveDays)} day(s)
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Coverage Impact Check
                    </div>
                    <div className="mt-1 text-sm text-slate-700">
                      Preview how this leave range affects your department coverage before saving it.
                    </div>
                  </div>

                  {!timesheetLeaveRangePreviewInput ? (
                  <div className="rounded-md border border-dashed bg-white px-3 py-3 text-sm text-muted-foreground">
                    Choose a valid leave range to check the department impact.
                  </div>
                ) : timesheetDepartmentCoveragePreviewLoading ? (
                  <div className="rounded-md border border-dashed bg-white px-3 py-3 text-sm text-muted-foreground">
                    Checking department coverage impact...
                  </div>
                ) : !coveragePreview?.departmentLabel ? (
                  <div className="rounded-md border border-dashed bg-white px-3 py-3 text-sm text-muted-foreground">
                    No department is set on this timesheet profile yet, so coverage impact cannot be
                    checked. Add a department in `Timesheet Profile` if you want leave previews.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Department
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {coveragePreview.departmentLabel}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Headcount {coveragePreview.headcount}
                        </div>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Applied Days
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {coveragePreview.summary.appliedDays}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {coveragePreview.summary.weekendSkippedDays} weekend and{" "}
                          {coveragePreview.summary.sharedHolidaySkippedDays} holiday day(s) skipped
                        </div>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Risk Days
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {coveragePreview.summary.highRiskDays} high / {coveragePreview.summary.mediumRiskDays} watch
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {coveragePreview.summary.alreadyOnLeaveDays} day(s) already recorded for you
                        </div>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Active Rule
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {coveragePreview.rule
                            ? `Watch ${coveragePreview.rule.mediumRiskPercent}% / High ${coveragePreview.rule.highRiskPercent}%`
                            : "Default thresholds"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {coveragePreview.rule
                            ? [
                                coveragePreview.rule.minimumAvailableCount !== null
                                  ? `Min available ${coveragePreview.rule.minimumAvailableCount}`
                                  : null,
                                coveragePreview.rule.maximumPeopleOff !== null
                                  ? `Max off ${coveragePreview.rule.maximumPeopleOff}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(", ") || "No count-based limit set"
                            : "No department-specific rule yet"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {coveragePreview.previewRows.map((row) => (
                        <div
                          key={`leave-preview-${row.dateKey}`}
                          className={`rounded-md border p-3 ${
                            !row.willApply
                              ? "bg-slate-100/70"
                              : row.severity === "high"
                                ? "border-amber-300 bg-amber-50/80"
                                : row.severity === "medium"
                                  ? "border-yellow-300 bg-yellow-50/80"
                                  : "bg-white"
                          }`}
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {formatPlannerDate(row.date)} - {row.weekdayLabel}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {!row.willApply
                                  ? row.skipReason
                                  : `${row.projectedPeopleOffCount} off / ${row.projectedAvailableCount} available after this leave`}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!row.willApply ? (
                                <Badge variant="outline">{row.skipReason || "Skipped"}</Badge>
                              ) : row.severity ? (
                                <Badge variant={getTimesheetLeaveCoverageBadgeVariant(row.severity)}>
                                  {row.severityLabel}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No New Risk</Badge>
                              )}
                              {row.alreadyOnLeave ? (
                                <Badge variant="outline">Already On Leave</Badge>
                              ) : null}
                              {row.hasSharedHoliday ? (
                                <Badge variant="outline">
                                  {row.sharedHolidayLabels.join(", ")}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          {row.willApply ? (
                            <div className="mt-2 text-xs text-slate-700">
                              Coverage {row.coveragePercent}%.
                              {row.triggerLabel ? ` ${row.triggerLabel}.` : " No alert trigger."}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            );
          }}
          onSubmit={handleApplyTimesheetLeaveRange}
        />

        <FormDialog
          open={isTimesheetProfileDialogOpen}
          onOpenChange={setIsTimesheetProfileDialogOpen}
          title="Timesheet Profile"
          description="These details appear on the exported timesheet, and the default hours control the normal working day used by the planner."
          submitLabel="Save Profile"
          initialValues={{
            department: typedTimesheetProfile?.department ?? "",
            signatureName:
              typedTimesheetProfile?.signatureName?.trim() ||
              user?.name?.trim() ||
              "",
            personalLeaveAllowanceDays:
              typedTimesheetProfile?.personalLeaveAllowanceDays ?? 0,
            personalLeaveCarryOverDays:
              typedTimesheetProfile?.personalLeaveCarryOverDays ?? 0,
            leaveYearStartMonth: String(typedTimesheetProfile?.leaveYearStartMonth ?? 1),
            monThuStartTime:
              typedTimesheetProfile?.monThuStartTime?.trim() ||
              DEFAULT_TIMESHEET_PROFILE_HOURS.monThuStartTime,
            monThuEndTime:
              typedTimesheetProfile?.monThuEndTime?.trim() ||
              DEFAULT_TIMESHEET_PROFILE_HOURS.monThuEndTime,
            fridayStartTime:
              typedTimesheetProfile?.fridayStartTime?.trim() ||
              DEFAULT_TIMESHEET_PROFILE_HOURS.fridayStartTime,
            fridayEndTime:
              typedTimesheetProfile?.fridayEndTime?.trim() ||
              DEFAULT_TIMESHEET_PROFILE_HOURS.fridayEndTime,
            weekendStartTime:
              typedTimesheetProfile?.weekendStartTime?.trim() ||
              DEFAULT_TIMESHEET_PROFILE_HOURS.weekendStartTime,
            weekendEndTime:
              typedTimesheetProfile?.weekendEndTime?.trim() ||
              DEFAULT_TIMESHEET_PROFILE_HOURS.weekendEndTime,
            monThuTemplateId: typedTimesheetProfile?.monThuTemplateId
              ? String(typedTimesheetProfile.monThuTemplateId)
              : "__none__",
            fridayTemplateId: typedTimesheetProfile?.fridayTemplateId
              ? String(typedTimesheetProfile.fridayTemplateId)
              : "__none__",
            weekendTemplateId: typedTimesheetProfile?.weekendTemplateId
              ? String(typedTimesheetProfile.weekendTemplateId)
              : "__none__",
            lunchBreakMinutes:
              typedTimesheetProfile?.lunchBreakMinutes ??
              DEFAULT_TIMESHEET_PROFILE_HOURS.lunchBreakMinutes,
            teaBreakMinutes:
              typedTimesheetProfile?.teaBreakMinutes ??
              DEFAULT_TIMESHEET_PROFILE_HOURS.teaBreakMinutes,
          }}
          fields={[
            {
              name: "department",
              label: "Department",
              type: "text",
              placeholder: "Training, Level III, Quality, Admin, or your own department name",
            },
            {
              name: "signatureName",
              label: "Signed As",
              type: "text",
              placeholder: "Name to show on exported timesheet",
            },
            {
              name: "personalLeaveAllowanceDays",
              label: "Personal Leave Allowance Days",
              type: "number",
              placeholder: "Set 0 if you do not want to track a balance yet",
            },
            {
              name: "personalLeaveCarryOverDays",
              label: "Personal Leave Carry-Over Days",
              type: "number",
            },
            {
              name: "leaveYearStartMonth",
              label: "Leave Year Starts In",
              type: "select",
              options: Array.from({ length: 12 }, (_, index) => ({
                value: String(index + 1),
                label: getMonthLabel(index + 1),
              })),
            },
            {
              name: "monThuStartTime",
              label: "Mon-Thu Start",
              type: "time",
            },
            {
              name: "monThuEndTime",
              label: "Mon-Thu End",
              type: "time",
            },
            {
              name: "fridayStartTime",
              label: "Friday Start",
              type: "time",
            },
            {
              name: "fridayEndTime",
              label: "Friday End",
              type: "time",
            },
            {
              name: "weekendStartTime",
              label: "Weekend Start",
              type: "time",
            },
            {
              name: "weekendEndTime",
              label: "Weekend End",
              type: "time",
            },
            {
              name: "monThuTemplateId",
              label: "Mon-Thu Default Template",
              type: "select",
              options: [
                { value: "__none__", label: "No default template" },
                ...activeTimesheetTemplates.map((template) => ({
                  value: String(template.id),
                  label: template.label,
                })),
              ],
            },
            {
              name: "fridayTemplateId",
              label: "Friday Default Template",
              type: "select",
              options: [
                { value: "__none__", label: "Use Mon-Thu template" },
                ...activeTimesheetTemplates.map((template) => ({
                  value: String(template.id),
                  label: template.label,
                })),
              ],
            },
            {
              name: "weekendTemplateId",
              label: "Weekend Default Template",
              type: "select",
              options: [
                { value: "__none__", label: "No weekend template" },
                ...activeTimesheetTemplates.map((template) => ({
                  value: String(template.id),
                  label: template.label,
                })),
              ],
            },
            {
              name: "lunchBreakMinutes",
              label: "Default Lunch Break Minutes",
              type: "number",
            },
            {
              name: "teaBreakMinutes",
              label: "Default Tea Break Minutes",
              type: "number",
            },
          ]}
          onSubmit={async (values) => {
            try {
              await saveTimesheetProfileMutation.mutateAsync({
                department: String(values.department || "").trim() || null,
                signatureName: String(values.signatureName || "").trim() || null,
                personalLeaveAllowanceDays: Math.max(
                  0,
                  Number(values.personalLeaveAllowanceDays || 0)
                ),
                personalLeaveCarryOverDays: Math.max(
                  0,
                  Number(values.personalLeaveCarryOverDays || 0)
                ),
                leaveYearStartMonth: Math.min(
                  12,
                  Math.max(1, Number(values.leaveYearStartMonth || 1))
                ),
                monThuStartTime: String(values.monThuStartTime || "").trim() || null,
                monThuEndTime: String(values.monThuEndTime || "").trim() || null,
                fridayStartTime: String(values.fridayStartTime || "").trim() || null,
                fridayEndTime: String(values.fridayEndTime || "").trim() || null,
                weekendStartTime: String(values.weekendStartTime || "").trim() || null,
                weekendEndTime: String(values.weekendEndTime || "").trim() || null,
                monThuTemplateId:
                  String(values.monThuTemplateId || "__none__") === "__none__"
                    ? null
                    : Number(values.monThuTemplateId),
                fridayTemplateId:
                  String(values.fridayTemplateId || "__none__") === "__none__"
                    ? null
                    : Number(values.fridayTemplateId),
                weekendTemplateId:
                  String(values.weekendTemplateId || "__none__") === "__none__"
                    ? null
                    : Number(values.weekendTemplateId),
                lunchBreakMinutes: Math.max(0, Number(values.lunchBreakMinutes || 0)),
                teaBreakMinutes: Math.max(0, Number(values.teaBreakMinutes || 0)),
              });
              toast.success("Timesheet profile saved");
              setIsTimesheetProfileDialogOpen(false);
              await Promise.all([
                refetchTimesheetProfile(),
                refetchYearTimesheetEntries(),
                refetchTimesheetOverview(),
                refetchTimesheetTeamLeaveOverview(),
                refetchTimesheetTeamLeaveCalendar(),
              ]);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to save the timesheet profile"
              );
            }
          }}
        />

        <FormDialog
          open={isTimesheetOptionDialogOpen}
          onOpenChange={(open) => {
            setIsTimesheetOptionDialogOpen(open);
            if (!open) {
              setEditingTimesheetOption(null);
            }
          }}
          title={editingTimesheetOption ? "Edit Timesheet Activity" : "Add Timesheet Activity"}
          description="Keep the list flexible so the team can change what gets tracked without hard-coding the format."
          submitLabel={editingTimesheetOption ? "Save Activity" : "Add Activity"}
          initialValues={{
            label: editingTimesheetOption?.label ?? "",
            description: editingTimesheetOption?.description ?? "",
            sortOrder:
              editingTimesheetOption?.sortOrder ?? typedTimesheetOptions.length + 1,
            hoursCategory: editingTimesheetOption?.hoursCategory ?? "working",
            isActive: editingTimesheetOption?.isActive ?? true,
          }}
          fields={[
            {
              name: "label",
              label: "Activity Name",
              type: "text",
              required: true,
              placeholder: "Training, Technical Support, Site Visit, Leave, etc.",
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              placeholder: "Optional guidance for when this activity should be ticked",
            },
            {
              name: "sortOrder",
              label: "Sort Order",
              type: "number",
              required: true,
            },
            {
              name: "hoursCategory",
              label: "Hours Behaviour",
              type: "select",
              required: true,
              options: [
                { value: "working", label: "Working activity" },
                { value: "non_working", label: "Non-working / leave day" },
              ],
            },
            {
              name: "isActive",
              label: "Active",
              type: "checkbox",
              placeholder: "Inactive activities stay on history but do not show in the tick list",
            },
          ]}
          onSubmit={async (values) => {
            const label = String(values.label || "").trim();
            if (!label) {
              throw new Error("Activity name is required.");
            }

            const sortOrder = Number(values.sortOrder || 0);
            if (!Number.isFinite(sortOrder)) {
              throw new Error("Sort order must be a valid number.");
            }

            const payload = {
              label,
              description: String(values.description || "").trim() || null,
              sortOrder,
              hoursCategory:
                String(values.hoursCategory || "working") === "non_working"
                  ? "non_working"
                  : "working",
              isActive: Boolean(values.isActive),
            } as const;

            try {
              if (editingTimesheetOption) {
                await updateTimesheetOptionMutation.mutateAsync({
                  id: editingTimesheetOption.id,
                  data: payload,
                });
                toast.success("Timesheet activity updated");
              } else {
                await createTimesheetOptionMutation.mutateAsync(payload);
                toast.success("Timesheet activity added");
              }

              setIsTimesheetOptionDialogOpen(false);
              setEditingTimesheetOption(null);
              await Promise.all([
                refetchTimesheetOptions(),
                refetchTimesheetEntries(),
                refetchYearTimesheetEntries(),
                refetchTimesheetTemplates(),
                refetchTimesheetTeamLeaveOverview(),
                refetchTimesheetTeamLeaveCalendar(),
              ]);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to save the timesheet activity"
              );
            }
          }}
        />
    </>
  );
}
