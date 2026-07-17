import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildPlannerTimesheetMonthWorkspaceColumns } from "@/components/planner/buildPlannerTimesheetMonthWorkspaceColumns";
import { Copy, Plus, Trash2 } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type {
  PlannerTimesheetAttentionRowLite,
  PlannerTimesheetAvailabilityFilterLite,
  PlannerTimesheetAvailabilitySummaryLite,
  PlannerTimesheetEntryLite,
  PlannerTimesheetHolidayLite,
  PlannerTimesheetLeaveBlockRowLite,
  PlannerTimesheetLeaveBreakdownRowLite,
  PlannerTimesheetLeaveOverrideBlockRowLite,
  PlannerTimesheetLeaveRowLite,
  PlannerTimesheetMonthComparisonLite,
  PlannerTimesheetOptionLite,
  PlannerTimesheetPersonalLeaveOverrideSummaryLite,
  PlannerTimesheetProfileHoursLite,
  PlannerTimesheetProfileLite,
  PlannerTimesheetRowLite,
  PlannerTimesheetTemplateLite,
  PlannerTimesheetWeekRowLite,
} from "@/components/planner/plannerSharedTypes";

type PlannerTimesheetMonthWorkspacePanelProps = {
  activeNonWorkingTimesheetOptions: PlannerTimesheetOptionLite[];
  activeTimesheetOptions: PlannerTimesheetOptionLite[];
  activeTimesheetTemplates: PlannerTimesheetTemplateLite[];
  applyTimesheetTemplateToDraft: (template: PlannerTimesheetTemplateLite) => void;
  firstMissingTimesheetRow: PlannerTimesheetRowLite | null;
  firstReviewTimesheetRow: PlannerTimesheetRowLite | null;
  focusTimesheetWeekRow: (row: PlannerTimesheetWeekRowLite) => void;
  formatLeaveDays: (days: number) => string;
  formatMinutesAsDuration: (minutes: number | null) => string;
  formatPlannerDate: (value: string | Date | null | undefined) => string;
  formatPlannerDateTime: (value: string | Date | null | undefined) => string;
  formatVarianceMinutes: (minutes: number | null) => string;
  getMonthLabel: (monthIndex: number) => string;
  getTimesheetAvailabilityClasses: (
    row: PlannerTimesheetRowLite,
    hasAttentionItems: boolean
  ) => string;
  getTimesheetAvailabilityLabel: (
    row: PlannerTimesheetRowLite,
    hasAttentionItems: boolean
  ) => string;
  getTimesheetAttentionBadgeVariant: (category: PlannerTimesheetAttentionRowLite["category"]) => any;
  getTimesheetHolidayTypeLabel: (holidayType: string) => string;
  getTimesheetHoursCategoryLabel: (hoursCategory: string) => string;
  getTimesheetProfileHours: (
    profile: PlannerTimesheetProfileLite | null,
    date: Date
  ) => PlannerTimesheetProfileHoursLite;
  handleDeleteTimesheetHoliday: (row: PlannerTimesheetHolidayLite) => void | Promise<unknown>;
  handleDeleteTimesheetLeaveBlock: (
    row: PlannerTimesheetLeaveBlockRowLite
  ) => void | Promise<unknown>;
  handleDeleteTimesheetOption: (row: PlannerTimesheetOptionLite) => void | Promise<unknown>;
  handleDeleteTimesheetTemplate: (
    row: PlannerTimesheetTemplateLite
  ) => void | Promise<unknown>;
  handleSaveSelectedTimesheetDay: () => void | Promise<unknown>;
  holidayByDateKey: Map<string, PlannerTimesheetHolidayLite>;
  isTimesheetEditorReadOnly: boolean;
  isTimesheetMonthApproved: boolean;
  isTimesheetMonthHandedOff: boolean;
  isTimesheetMonthSubmitted: boolean;
  isViewingAnotherTimesheet: boolean;
  leaveYearRange: {
    startMonth: number;
  };
  matchesTimesheetAvailabilityFilter: (
    row: PlannerTimesheetRowLite,
    hasAttentionItems: boolean,
    filter: PlannerTimesheetAvailabilityFilterLite
  ) => boolean;
  normaliseTimesheetLeavePortionPercent: (value: number | null | undefined) => 50 | 100;
  selectedDate: Date;
  selectedDateLabel: string;
  selectedDayComparisonStatus: PlannerTimesheetRowLite["comparisonStatus"];
  selectedDayExpectedMinutes: number;
  selectedDayHasNonWorkingActivity: boolean;
  selectedDayHoliday: PlannerTimesheetHolidayLite | null;
  selectedDayIsNonWorking: boolean;
  selectedDayIsPartialLeave: boolean;
  selectedDayLeavePortionDays: number;
  selectedDayVarianceMinutes: number | null;
  selectedDayWorkedMinutes: number | null;
  selectedPreviousTimesheetEntry: PlannerTimesheetEntryLite | null;
  selectedPreviousTimesheetOptions: PlannerTimesheetOptionLite[];
  selectedTimesheetEntry: PlannerTimesheetEntryLite | null;
  selectedTimesheetOptions: PlannerTimesheetOptionLite[];
  setEditingTimesheetHoliday: Dispatch<SetStateAction<PlannerTimesheetHolidayLite | null>>;
  setEditingTimesheetLeaveBlock: Dispatch<SetStateAction<PlannerTimesheetLeaveBlockRowLite | null>>;
  setEditingTimesheetOption: Dispatch<SetStateAction<PlannerTimesheetOptionLite | null>>;
  setEditingTimesheetTemplate: Dispatch<SetStateAction<PlannerTimesheetTemplateLite | null>>;
  setIsTimesheetBulkDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetHolidayApplyDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetHolidayDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetLeaveRangeDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetOptionDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetTemplateApplyDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetTemplateDialogOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedDate: (date: Date) => void;
  setTimesheetAvailabilityFilter: Dispatch<
    SetStateAction<PlannerTimesheetAvailabilityFilterLite>
  >;
  setTimesheetDraftEndTime: Dispatch<SetStateAction<string>>;
  setTimesheetDraftLeavePortionPercent: Dispatch<SetStateAction<50 | 100>>;
  setTimesheetDraftLunchBreakMinutes: Dispatch<SetStateAction<number>>;
  setTimesheetDraftOptionIds: Dispatch<SetStateAction<number[]>>;
  setTimesheetDraftRemarks: Dispatch<SetStateAction<string>>;
  setTimesheetDraftStartTime: Dispatch<SetStateAction<string>>;
  setTimesheetDraftTeaBreakMinutes: Dispatch<SetStateAction<number>>;
  shouldShowPlannerSection: (sectionId: string) => boolean;
  startOfDay: (date: Date) => Date;
  timesheetAttentionByDateKey: Map<string, PlannerTimesheetAttentionRowLite[]>;
  timesheetAttentionRows: PlannerTimesheetAttentionRowLite[];
  timesheetAvailabilityCalendarWeeks: Array<Array<PlannerTimesheetRowLite | null>>;
  timesheetAvailabilityFilter: PlannerTimesheetAvailabilityFilterLite;
  timesheetAvailabilitySummary: PlannerTimesheetAvailabilitySummaryLite;
  timesheetDraftEndTime: string;
  timesheetDraftLeavePortionPercent: 50 | 100;
  timesheetDraftLunchBreakMinutes: number;
  timesheetDraftOptionIds: number[];
  timesheetDraftRemarks: string;
  timesheetDraftStartTime: string;
  timesheetDraftTeaBreakMinutes: number;
  timesheetMonthComparison: PlannerTimesheetMonthComparisonLite;
  timesheetPersonalLeaveAvailableDays: number | null;
  timesheetPersonalLeaveBlocks: PlannerTimesheetLeaveBlockRowLite[];
  timesheetPersonalLeaveBreakdownRows: PlannerTimesheetLeaveBreakdownRowLite[];
  timesheetPersonalLeaveCarryOverDays: number;
  timesheetPersonalLeaveOverrideSummary: PlannerTimesheetPersonalLeaveOverrideSummaryLite;
  timesheetPersonalLeaveRemainingDays: number | null;
  timesheetPersonalLeaveRows: PlannerTimesheetLeaveRowLite[];
  timesheetPersonalLeaveUsedDays: number;
  timesheetPersonalLeaveYearUsedDays: number;
  timesheetWeekRows: PlannerTimesheetWeekRowLite[];
  toast: {
    success: (message: string) => void;
  };
  typedTimesheetHolidays: PlannerTimesheetHolidayLite[];
  typedTimesheetOptions: PlannerTimesheetOptionLite[];
  typedTimesheetProfile: PlannerTimesheetProfileLite | null;
  typedTimesheetTemplates: PlannerTimesheetTemplateLite[];
  typedTimesheetUserLeaveOverrideBlockRows: PlannerTimesheetLeaveOverrideBlockRowLite[];
  upsertTimesheetEntryMutation: {
    isPending: boolean;
  };
  user?: unknown;
};

export function PlannerTimesheetMonthWorkspacePanel({
  activeNonWorkingTimesheetOptions,
  activeTimesheetOptions,
  activeTimesheetTemplates,
  applyTimesheetTemplateToDraft,
  firstMissingTimesheetRow,
  firstReviewTimesheetRow,
  focusTimesheetWeekRow,
  formatLeaveDays,
  formatMinutesAsDuration,
  formatPlannerDate,
  formatPlannerDateTime,
  formatVarianceMinutes,
  getMonthLabel,
  getTimesheetAvailabilityClasses,
  getTimesheetAvailabilityLabel,
  getTimesheetAttentionBadgeVariant,
  getTimesheetHolidayTypeLabel,
  getTimesheetHoursCategoryLabel,
  getTimesheetProfileHours,
  handleDeleteTimesheetHoliday,
  handleDeleteTimesheetLeaveBlock,
  handleDeleteTimesheetOption,
  handleDeleteTimesheetTemplate,
  handleSaveSelectedTimesheetDay,
  holidayByDateKey,
  isTimesheetEditorReadOnly,
  isTimesheetMonthApproved,
  isTimesheetMonthHandedOff,
  isTimesheetMonthSubmitted,
  isViewingAnotherTimesheet,
  leaveYearRange,
  matchesTimesheetAvailabilityFilter,
  normaliseTimesheetLeavePortionPercent,
  selectedDate,
  selectedDateLabel,
  selectedDayComparisonStatus,
  selectedDayExpectedMinutes,
  selectedDayHasNonWorkingActivity,
  selectedDayHoliday,
  selectedDayIsNonWorking,
  selectedDayIsPartialLeave,
  selectedDayLeavePortionDays,
  selectedDayVarianceMinutes,
  selectedDayWorkedMinutes,
  selectedPreviousTimesheetEntry,
  selectedPreviousTimesheetOptions,
  selectedTimesheetEntry,
  selectedTimesheetOptions,
  setEditingTimesheetHoliday,
  setEditingTimesheetLeaveBlock,
  setEditingTimesheetOption,
  setEditingTimesheetTemplate,
  setIsTimesheetBulkDialogOpen,
  setIsTimesheetHolidayApplyDialogOpen,
  setIsTimesheetHolidayDialogOpen,
  setIsTimesheetLeaveRangeDialogOpen,
  setIsTimesheetOptionDialogOpen,
  setIsTimesheetTemplateApplyDialogOpen,
  setIsTimesheetTemplateDialogOpen,
  setSelectedDate,
  setTimesheetAvailabilityFilter,
  setTimesheetDraftEndTime,
  setTimesheetDraftLeavePortionPercent,
  setTimesheetDraftLunchBreakMinutes,
  setTimesheetDraftOptionIds,
  setTimesheetDraftRemarks,
  setTimesheetDraftStartTime,
  setTimesheetDraftTeaBreakMinutes,
  shouldShowPlannerSection,
  startOfDay,
  timesheetAttentionByDateKey,
  timesheetAttentionRows,
  timesheetAvailabilityCalendarWeeks,
  timesheetAvailabilityFilter,
  timesheetAvailabilitySummary,
  timesheetDraftEndTime,
  timesheetDraftLeavePortionPercent,
  timesheetDraftLunchBreakMinutes,
  timesheetDraftOptionIds,
  timesheetDraftRemarks,
  timesheetDraftStartTime,
  timesheetDraftTeaBreakMinutes,
  timesheetMonthComparison,
  timesheetPersonalLeaveAvailableDays,
  timesheetPersonalLeaveBlocks,
  timesheetPersonalLeaveBreakdownRows,
  timesheetPersonalLeaveCarryOverDays,
  timesheetPersonalLeaveOverrideSummary,
  timesheetPersonalLeaveRemainingDays,
  timesheetPersonalLeaveRows,
  timesheetPersonalLeaveUsedDays,
  timesheetPersonalLeaveYearUsedDays,
  timesheetWeekRows,
  toast,
  typedTimesheetHolidays,
  typedTimesheetOptions,
  typedTimesheetProfile,
  typedTimesheetTemplates,
  typedTimesheetUserLeaveOverrideBlockRows,
  upsertTimesheetEntryMutation,
}: PlannerTimesheetMonthWorkspacePanelProps) {
  const {
    timesheetAttentionColumns,
    timesheetHolidayColumns,
    timesheetOptionColumns,
    timesheetPersonalLeaveBlockColumns,
    timesheetPersonalLeaveColumns,
    timesheetPersonalLeaveOverrideBlockColumns,
    timesheetTemplateColumns,
    timesheetWeekColumns,
  } = buildPlannerTimesheetMonthWorkspaceColumns({
    formatLeaveDays,
    formatMinutesAsDuration,
    formatPlannerDate,
    formatPlannerDateTime,
    formatVarianceMinutes,
    getTimesheetAttentionBadgeVariant,
    getTimesheetHolidayTypeLabel,
    getTimesheetHoursCategoryLabel,
    typedTimesheetOptions,
  });

  return (
    <>
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            {shouldShowPlannerSection("timesheet-day-editor") ? (
            <Card id="timesheet-day-editor">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{selectedDateLabel}</CardTitle>
                    <CardDescription>
                      Tick the work completed for the selected day. Options stay editable, so your monthly sheet can adapt over time.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {selectedTimesheetOptions.length} selected
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isTimesheetEditorReadOnly ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      {isViewingAnotherTimesheet
                        ? "This is a read-only review view for another user's submitted timesheet."
                        : isTimesheetMonthHandedOff
                        ? "This month has already been handed off for payroll or admin processing. Ask an internal admin to return it for changes if an update is needed."
                        : isTimesheetMonthApproved
                        ? "This month has been approved. Ask an internal admin to return it for changes if an update is needed."
                        : isTimesheetMonthSubmitted
                          ? "This month has been submitted for review. It must be returned for changes before you can edit it again."
                          : "This month has been finalised. Reopen it if you need to change daily timesheet entries."}
                    </div>
                  ) : null}
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">Previous Month Check</div>
                        <div className="text-xs text-muted-foreground">
                          Compare this day with the same date in {timesheetMonthComparison.previousMonthLabel}.
                        </div>
                      </div>
                      <Badge
                        variant={
                          selectedDayComparisonStatus === "changed" ||
                          selectedDayComparisonStatus === "missing"
                            ? "destructive"
                            : selectedDayComparisonStatus === "new"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {selectedDayComparisonStatus === "same"
                          ? "Same"
                          : selectedDayComparisonStatus === "changed"
                            ? "Changed"
                            : selectedDayComparisonStatus === "new"
                              ? "New"
                              : selectedDayComparisonStatus === "missing"
                                ? "Missing"
                                : "No History"}
                      </Badge>
                    </div>
                    {selectedPreviousTimesheetEntry ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border bg-white p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Previous Hours
                          </div>
                          <div className="mt-1 text-sm font-semibold">
                            {selectedPreviousTimesheetEntry.startTime?.trim() &&
                            selectedPreviousTimesheetEntry.endTime?.trim()
                              ? `${selectedPreviousTimesheetEntry.startTime.trim()} - ${selectedPreviousTimesheetEntry.endTime.trim()}`
                              : "No saved hours"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Lunch {selectedPreviousTimesheetEntry.lunchBreakMinutes ?? 0} min, Tea{" "}
                            {selectedPreviousTimesheetEntry.teaBreakMinutes ?? 0} min
                          </div>
                        </div>
                        <div className="rounded-md border bg-white p-3">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">
                            Previous Activities
                          </div>
                          {selectedPreviousTimesheetOptions.length === 0 ? (
                            <div className="mt-1 text-sm text-muted-foreground">
                              No saved activities
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {selectedPreviousTimesheetOptions.map((option) => (
                                <Badge
                                  key={`selected-previous-timesheet-option-${option.id}`}
                                  variant="outline"
                                >
                                  {option.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {selectedPreviousTimesheetEntry.remarks?.trim() ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Remarks: {selectedPreviousTimesheetEntry.remarks.trim()}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-sm text-muted-foreground">
                        No saved day exists for this date in {timesheetMonthComparison.previousMonthLabel}.
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-3">
                    <div className="text-sm font-medium">Working Hours</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">Start Time</label>
                        <Input
                          type="time"
                          value={timesheetDraftStartTime}
                          disabled={isTimesheetEditorReadOnly}
                          onChange={(event) => setTimesheetDraftStartTime(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">End Time</label>
                        <Input
                          type="time"
                          value={timesheetDraftEndTime}
                          disabled={isTimesheetEditorReadOnly}
                          onChange={(event) => setTimesheetDraftEndTime(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          Lunch Break Minutes
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={String(timesheetDraftLunchBreakMinutes)}
                          disabled={isTimesheetEditorReadOnly}
                          onChange={(event) =>
                            setTimesheetDraftLunchBreakMinutes(
                              Math.max(0, Number(event.target.value || 0))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">
                          Tea Break Minutes
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={String(timesheetDraftTeaBreakMinutes)}
                          disabled={isTimesheetEditorReadOnly}
                          onChange={(event) =>
                            setTimesheetDraftTeaBreakMinutes(
                              Math.max(0, Number(event.target.value || 0))
                            )
                          }
                        />
                      </div>
                    </div>
                    {selectedDayHasNonWorkingActivity ? (
                      <div className="mt-3 space-y-2">
                        <label className="text-xs text-muted-foreground">Leave Portion</label>
                        <Select
                          value={String(timesheetDraftLeavePortionPercent)}
                          onValueChange={(value) =>
                            setTimesheetDraftLeavePortionPercent(value === "50" ? 50 : 100)
                          }
                          disabled={isTimesheetEditorReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose leave portion" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">Full Day Leave</SelectItem>
                            <SelectItem value="50">Half Day Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <p className="mt-3 text-xs text-muted-foreground">
                      Default hours come from your Timesheet Profile. Full-day leave or shared holidays can be saved without start and end times, while half-day leave reduces the target hours for the day.
                    </p>
                    {selectedDayHoliday ? (
                      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                        <div className="font-medium">{selectedDayHoliday.label}</div>
                        <div className="mt-1 text-xs text-indigo-700">
                          {getTimesheetHolidayTypeLabel(selectedDayHoliday.holidayType)}
                          {" · "}
                          {selectedDayHoliday.notes?.trim() ||
                            "This date is marked on your timesheet holiday calendar."}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-3 sm:grid-cols-5">
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Lunch
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {timesheetDraftLunchBreakMinutes} min
                        </div>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Tea
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {timesheetDraftTeaBreakMinutes} min
                        </div>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Net Worked
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {formatMinutesAsDuration(selectedDayWorkedMinutes)}
                        </div>
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {selectedDayIsNonWorking
                            ? "Non-working Day"
                            : selectedDayIsPartialLeave
                              ? "Reduced Day"
                              : "Standard Day"}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {selectedDayIsNonWorking
                            ? "No target hours"
                            : formatMinutesAsDuration(selectedDayExpectedMinutes)}
                        </div>
                        {selectedDayIsPartialLeave ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatLeaveDays(selectedDayLeavePortionDays)} day leave applied
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-md border bg-white p-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Variance
                        </div>
                        <div
                          className={`mt-1 text-sm font-semibold ${
                            selectedDayVarianceMinutes !== null && selectedDayVarianceMinutes > 0
                              ? "text-emerald-700"
                              : selectedDayVarianceMinutes !== null &&
                                  selectedDayVarianceMinutes < 0
                                ? "text-amber-700"
                                : ""
                          }`}
                        >
                          {formatVarianceMinutes(selectedDayVarianceMinutes)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeTimesheetOptions.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      No active timesheet activities exist yet. Add one first, then start ticking work for each day.
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        {activeTimesheetOptions.map((option) => {
                          const checked = timesheetDraftOptionIds.includes(option.id);
                          return (
                            <label
                              key={`timesheet-option-check-${option.id}`}
                              className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                                checked
                                  ? "border-amber-300 bg-amber-50"
                                  : "bg-background hover:border-slate-300"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={isTimesheetEditorReadOnly}
                                onCheckedChange={(nextChecked) => {
                                  setTimesheetDraftOptionIds((current) => {
                                    if (nextChecked) {
                                      return current.includes(option.id)
                                        ? current
                                        : [...current, option.id];
                                    }
                                    return current.filter((id) => id !== option.id);
                                  });
                                }}
                              />
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-medium">{option.label}</div>
                                  <Badge
                                    variant={
                                      option.hoursCategory === "non_working"
                                        ? "outline"
                                        : "secondary"
                                    }
                                  >
                                    {getTimesheetHoursCategoryLabel(option.hoursCategory)}
                                  </Badge>
                                </div>
                                {option.description ? (
                                  <div className="text-xs text-muted-foreground">
                                    {option.description}
                                  </div>
                                ) : null}
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Remarks</label>
                        <Textarea
                          value={timesheetDraftRemarks}
                          disabled={isTimesheetEditorReadOnly}
                          onChange={(event) => setTimesheetDraftRemarks(event.target.value)}
                          placeholder="Add any notes for the day, such as client names, technique details, travel, or follow-up context..."
                          rows={4}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          onClick={() => void handleSaveSelectedTimesheetDay()}
                          disabled={
                            isTimesheetEditorReadOnly || upsertTimesheetEntryMutation.isPending
                          }
                        >
                          {upsertTimesheetEntryMutation.isPending
                            ? "Saving..."
                            : "Save Timesheet Day"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const defaults = getTimesheetProfileHours(
                              typedTimesheetProfile,
                              selectedDate
                            );
                            setTimesheetDraftOptionIds(
                              Array.isArray(selectedTimesheetEntry?.selectedOptionIds)
                                ? selectedTimesheetEntry.selectedOptionIds
                                : []
                            );
                            setTimesheetDraftStartTime(
                              selectedTimesheetEntry?.startTime ?? defaults.startTime
                            );
                            setTimesheetDraftEndTime(
                              selectedTimesheetEntry?.endTime ?? defaults.endTime
                            );
                            setTimesheetDraftLunchBreakMinutes(
                              selectedTimesheetEntry?.lunchBreakMinutes ??
                                defaults.lunchBreakMinutes
                            );
                            setTimesheetDraftTeaBreakMinutes(
                              selectedTimesheetEntry?.teaBreakMinutes ?? defaults.teaBreakMinutes
                            );
                            setTimesheetDraftLeavePortionPercent(
                              normaliseTimesheetLeavePortionPercent(
                                selectedTimesheetEntry?.leavePortionPercent
                              )
                            );
                            setTimesheetDraftRemarks(selectedTimesheetEntry?.remarks ?? "");
                          }}
                        >
                          Reset Draft
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsTimesheetBulkDialogOpen(true)}
                          disabled={
                            isTimesheetEditorReadOnly || activeTimesheetOptions.length === 0
                          }
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Bulk Fill Range
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsTimesheetTemplateApplyDialogOpen(true)}
                          disabled={
                            isTimesheetEditorReadOnly || activeTimesheetTemplates.length === 0
                          }
                        >
                          Apply Template
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingTimesheetTemplate(null);
                            setIsTimesheetTemplateDialogOpen(true);
                          }}
                          disabled={isTimesheetEditorReadOnly}
                        >
                          Save As Template
                        </Button>
                      </div>

                      {selectedTimesheetOptions.length > 0 ? (
                        <div className="rounded-lg border bg-slate-50 p-3">
                          <div className="text-sm font-medium">Selected activities</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {selectedTimesheetOptions.map((option) => (
                              <Badge key={`timesheet-selected-${option.id}`} variant="secondary">
                                {option.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
              </CardContent>
            </Card>
            ) : null}

            {shouldShowPlannerSection("timesheet-activity-setup") ? (
              <Card id="timesheet-activity-setup">
                <CardHeader>
                  <CardTitle>Timesheet Activity Setup</CardTitle>
                  <CardDescription>
                    Start with the default activities, then add, hide, edit, or remove options as your team needs change.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {typedTimesheetOptions.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Your default timesheet activities will be created automatically as soon as you open or save the tracker.
                    </div>
                  ) : (
                    <DataTable
                      columns={timesheetOptionColumns}
                      data={typedTimesheetOptions}
                      pageSize={6}
                      searchPlaceholder="Search activities..."
                      onRowClick={(row) => {
                        setEditingTimesheetOption(row);
                        setIsTimesheetOptionDialogOpen(true);
                      }}
                      actions={(row) => (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTimesheetOption(row);
                              setIsTimesheetOptionDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleDeleteTimesheetOption(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            ) : null}

            {shouldShowPlannerSection("timesheet-saved-templates") ? (
            <Card id="timesheet-saved-templates">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Saved Day Templates</CardTitle>
                    <CardDescription>
                      Save a common work pattern once, then apply it quickly to the selected day or a future date range.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTimesheetTemplate(null);
                      setIsTimesheetTemplateDialogOpen(true);
                    }}
                    disabled={isViewingAnotherTimesheet}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Template
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {typedTimesheetTemplates.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      Save a common workday, leave day, or support pattern as a reusable template to speed up monthly completion.
                    </div>
                  ) : (
                    <DataTable
                      columns={timesheetTemplateColumns}
                      data={typedTimesheetTemplates}
                      pageSize={6}
                      searchPlaceholder="Search templates..."
                      onRowClick={(row) => {
                        if (isViewingAnotherTimesheet) return;
                        applyTimesheetTemplateToDraft(row);
                        toast.success(`Loaded "${row.label}" into the day editor.`);
                      }}
                      actions={(row) => (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              applyTimesheetTemplateToDraft(row);
                              toast.success(`Loaded "${row.label}" into the day editor.`);
                            }}
                            disabled={isViewingAnotherTimesheet}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTimesheetTemplate(row);
                              setIsTimesheetTemplateDialogOpen(true);
                            }}
                            disabled={isViewingAnotherTimesheet}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleDeleteTimesheetTemplate(row)}
                            disabled={isViewingAnotherTimesheet}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    />
                )}
              </CardContent>
            </Card>
            ) : null}

            {shouldShowPlannerSection("timesheet-holidays") ? (
            <Card id="timesheet-holidays">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Timesheet Holidays</CardTitle>
                  <CardDescription>
                    Keep public holidays and company shutdown days here. Personal leave should still be captured on the daily timesheet by ticking a non-working activity such as `Leave / Public Holiday`.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsTimesheetHolidayApplyDialogOpen(true)}
                    disabled={isViewingAnotherTimesheet || typedTimesheetHolidays.length === 0}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Apply To Month
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingTimesheetHoliday(null);
                      setIsTimesheetHolidayDialogOpen(true);
                    }}
                    disabled={isViewingAnotherTimesheet}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Holiday
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {typedTimesheetHolidays.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Add public holidays or company shutdown dates here, then apply them into the month so they stop counting as expected working days. Personal leave is not added here.
                  </div>
                ) : (
                  <DataTable
                    columns={timesheetHolidayColumns}
                    data={typedTimesheetHolidays}
                    pageSize={6}
                    searchPlaceholder="Search holiday dates..."
                    onRowClick={(row) => {
                      if (isViewingAnotherTimesheet) return;
                      setEditingTimesheetHoliday(row);
                      setIsTimesheetHolidayDialogOpen(true);
                    }}
                    actions={(row) => (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTimesheetHoliday(row);
                            setIsTimesheetHolidayDialogOpen(true);
                          }}
                          disabled={isViewingAnotherTimesheet}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleDeleteTimesheetHoliday(row)}
                          disabled={isViewingAnotherTimesheet}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  />
                )}
              </CardContent>
            </Card>
            ) : null}

            {shouldShowPlannerSection("timesheet-personal-leave") ? (
            <Card id="timesheet-personal-leave">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Personal Leave Register</CardTitle>
                  <CardDescription>
                    Review your own saved non-working leave days here. Shared public holidays and
                    company shutdown dates stay in `Timesheet Holidays`.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTimesheetLeaveBlock(null);
                    setIsTimesheetLeaveRangeDialogOpen(true);
                  }}
                  disabled={isViewingAnotherTimesheet || activeNonWorkingTimesheetOptions.length === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Leave Range
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {timesheetPersonalLeaveRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No personal leave or other non-working days have been saved in the visible
                    month yet.
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        Visible month leave days: {formatLeaveDays(timesheetPersonalLeaveUsedDays)}
                      </Badge>
                      <Badge variant="secondary">
                        Year-to-date leave days: {formatLeaveDays(timesheetPersonalLeaveYearUsedDays)}
                      </Badge>
                      <Badge variant="outline">
                        Carry-over: {formatLeaveDays(timesheetPersonalLeaveCarryOverDays)}
                      </Badge>
                      <Badge
                        variant={
                          timesheetPersonalLeaveRemainingDays !== null &&
                          timesheetPersonalLeaveRemainingDays < 0
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {timesheetPersonalLeaveAvailableDays === null
                          ? "Set leave allowance in Timesheet Profile"
                          : `Remaining: ${formatLeaveDays(timesheetPersonalLeaveRemainingDays ?? 0)} / ${formatLeaveDays(timesheetPersonalLeaveAvailableDays)} day(s)`}
                      </Badge>
                      <Badge variant="outline">
                        Leave year starts: {getMonthLabel(leaveYearRange.startMonth)}
                      </Badge>
                      <Badge variant="secondary">
                        Leave blocks: {timesheetPersonalLeaveBlocks.length}
                      </Badge>
                      <Badge
                        variant={
                          timesheetPersonalLeaveOverrideSummary.pendingDayCount > 0
                            ? "destructive"
                            : timesheetPersonalLeaveOverrideSummary.reviewedDayCount > 0
                              ? "secondary"
                              : "outline"
                        }
                      >
                        Override leave days: {formatLeaveDays(timesheetPersonalLeaveOverrideSummary.overrideLeaveDays)}
                      </Badge>
                      <Badge
                        variant={
                          timesheetPersonalLeaveOverrideSummary.pendingDayCount > 0
                            ? "destructive"
                            : "outline"
                        }
                      >
                        Pending override reviews: {timesheetPersonalLeaveOverrideSummary.pendingDayCount}
                      </Badge>
                      <Badge variant="outline">
                        Reviewed overrides: {timesheetPersonalLeaveOverrideSummary.reviewedDayCount}
                      </Badge>
                      <Badge variant="outline">
                        Weekends and shared holidays stay inside one continuous leave block
                      </Badge>
                      {timesheetPersonalLeaveBreakdownRows.map((row) => (
                        <Badge key={row.id} variant="outline">
                          {row.label}: {formatLeaveDays(row.usedDays)}
                        </Badge>
                      ))}
                    </div>
                    <DataTable
                      columns={timesheetPersonalLeaveBlockColumns}
                      data={timesheetPersonalLeaveBlocks}
                      pageSize={6}
                      searchPlaceholder="Search leave blocks..."
                      onRowClick={(row) => setSelectedDate(startOfDay(row.startDate))}
                      actions={(row) => (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDate(startOfDay(row.startDate))}
                          >
                            Open Start Day
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTimesheetLeaveBlock(row);
                              setSelectedDate(startOfDay(row.startDate));
                              setIsTimesheetLeaveRangeDialogOpen(true);
                            }}
                            disabled={isViewingAnotherTimesheet}
                          >
                            Edit Block
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleDeleteTimesheetLeaveBlock(row)}
                            disabled={isViewingAnotherTimesheet}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    />
                    <DataTable
                      columns={timesheetPersonalLeaveColumns}
                      data={timesheetPersonalLeaveRows}
                      pageSize={8}
                      searchPlaceholder="Search personal leave days..."
                      onRowClick={(row) => setSelectedDate(startOfDay(row.date))}
                      actions={(row) => (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedDate(startOfDay(row.date))}
                        >
                          Open Day
                        </Button>
                      )}
                    />
                    {shouldShowPlannerSection("timesheet-override-history") ? (
                    <Card id="timesheet-override-history">
                        <CardHeader>
                          <CardTitle>Leave Override Review History</CardTitle>
                          <CardDescription>
                            Track which override leave periods are still waiting for admin review
                            and which ones already came back with a review note.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {typedTimesheetUserLeaveOverrideBlockRows.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                              No override review history is recorded in the visible month yet.
                            </div>
                          ) : (
                            <DataTable
                              columns={timesheetPersonalLeaveOverrideBlockColumns}
                              data={typedTimesheetUserLeaveOverrideBlockRows}
                              pageSize={6}
                              searchPlaceholder="Search override review history..."
                              onRowClick={(row) => setSelectedDate(startOfDay(new Date(row.startDate)))}
                              actions={(row) => (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedDate(startOfDay(new Date(row.startDate)))}
                                >
                                  Open Start Day
                                </Button>
                              )}
                            />
                          )}
                        </CardContent>
                    </Card>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>
            ) : null}

            {shouldShowPlannerSection("timesheet-availability") ? (
            <Card id="timesheet-availability">
              <CardHeader>
                <CardTitle>Availability Calendar</CardTitle>
                <CardDescription>
                  Scan the month visually to see worked days, personal leave, shared holidays,
                  and any saved days that still need review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={timesheetAvailabilityFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimesheetAvailabilityFilter("all")}
                  >
                    All ({timesheetAvailabilitySummary.all})
                  </Button>
                  <Button
                    variant={timesheetAvailabilityFilter === "worked" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimesheetAvailabilityFilter("worked")}
                  >
                    Worked ({timesheetAvailabilitySummary.worked})
                  </Button>
                  <Button
                    variant={timesheetAvailabilityFilter === "leave" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimesheetAvailabilityFilter("leave")}
                  >
                    Leave ({timesheetAvailabilitySummary.leave})
                  </Button>
                  <Button
                    variant={timesheetAvailabilityFilter === "holiday" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimesheetAvailabilityFilter("holiday")}
                  >
                    Holidays ({timesheetAvailabilitySummary.holiday})
                  </Button>
                  <Button
                    variant={timesheetAvailabilityFilter === "review" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimesheetAvailabilityFilter("review")}
                  >
                    Needs Review ({timesheetAvailabilitySummary.review})
                  </Button>
                  <Button
                    variant={timesheetAvailabilityFilter === "empty" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTimesheetAvailabilityFilter("empty")}
                  >
                    No Entry ({timesheetAvailabilitySummary.empty})
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (firstMissingTimesheetRow) {
                        setSelectedDate(startOfDay(firstMissingTimesheetRow.date));
                      }
                    }}
                    disabled={!firstMissingTimesheetRow}
                  >
                    Open First Missing Day
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (firstReviewTimesheetRow) {
                        setSelectedDate(startOfDay(firstReviewTimesheetRow.date));
                      }
                    }}
                    disabled={!firstReviewTimesheetRow}
                  >
                    Open First Review Day
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-950">
                    Worked Day
                  </Badge>
                  <Badge variant="outline" className="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950">
                    Personal Leave
                  </Badge>
                  <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-950">
                    Public Holiday / Shutdown
                  </Badge>
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-950">
                    Needs Review
                  </Badge>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
                    <div key={`timesheet-weekday-${label}`} className="rounded-md border bg-slate-50 px-2 py-1">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {timesheetAvailabilityCalendarWeeks.map((week, weekIndex) => (
                    <div key={`timesheet-availability-week-${weekIndex}`} className="grid grid-cols-7 gap-2">
                      {week.map((row, dayIndex) => {
                        if (!row) {
                          return (
                            <div
                              key={`timesheet-availability-empty-${weekIndex}-${dayIndex}`}
                              className="min-h-[112px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50"
                            />
                          );
                        }
                        const attentionItems = timesheetAttentionByDateKey.get(row.dateKey) ?? [];
                        const matchesFilter = matchesTimesheetAvailabilityFilter(
                          row,
                          attentionItems.length > 0,
                          timesheetAvailabilityFilter
                        );
                        return (
                          <button
                            key={`timesheet-availability-${row.dateKey}`}
                            type="button"
                            className={`min-h-[112px] rounded-xl border p-3 text-left transition hover:shadow-sm ${
                              matchesFilter ? "" : "opacity-35"
                            } ${getTimesheetAvailabilityClasses(
                              row,
                              attentionItems.length > 0
                            )}`}
                            onClick={() => setSelectedDate(startOfDay(row.date))}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-lg font-semibold leading-none">
                                {row.date.getDate()}
                              </div>
                              <Badge variant="outline" className="bg-white/70">
                                {getTimesheetAvailabilityLabel(row, attentionItems.length > 0)}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs font-medium">{row.dayLabel}</div>
                            <div className="mt-2 space-y-1 text-xs">
                              {row.isHoliday ? (
                                <div>
                                  {getTimesheetHolidayTypeLabel(
                                    holidayByDateKey.get(row.dateKey)?.holidayType ?? ""
                                  )}
                                  {row.holidayLabel ? `: ${row.holidayLabel}` : ""}
                                </div>
                              ) : row.hasLeavePortion ? (
                                <div>
                                  {row.checkedOptions
                                    .filter((option) => option.hoursCategory === "non_working")
                                    .map((option) => option.label)
                                    .join(", ")}
                                  {` (${formatLeaveDays(row.leavePortionDays)} day)`}
                                </div>
                              ) : row.hasSavedEntry ? (
                                <div>
                                  {row.checkedCount} activity tick{row.checkedCount === 1 ? "" : "s"}
                                </div>
                              ) : (
                                <div>No saved entry yet</div>
                              )}
                              {attentionItems.length > 0 ? (
                                <div className="font-medium text-amber-900">
                                  {attentionItems[0].issueLabel}
                                </div>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            ) : null}
          </div>

          {shouldShowPlannerSection("timesheet-weekly-summary") ? (
          <Card id="timesheet-weekly-summary">
              <CardHeader>
                <CardTitle>Weekly Hours Summary</CardTitle>
                <CardDescription>
                  Review each week in the month at a glance, including logged days, target hours, overtime, and short time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={timesheetWeekColumns}
                  data={timesheetWeekRows}
                  pageSize={6}
                  searchPlaceholder="Search weekly summary..."
                  onRowClick={(row) => focusTimesheetWeekRow(row)}
                  actions={(row) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => focusTimesheetWeekRow(row)}
                    >
                      Open Day
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          ) : null}

            {shouldShowPlannerSection("timesheet-attention") ? (
            <Card id="timesheet-attention">
              <CardHeader>
                <CardTitle>Timesheet Attention Queue</CardTitle>
                <CardDescription>
                  Review missing weekdays, missing times, short days, overtime, and saved days without activity ticks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timesheetAttentionRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No current attention items for the viewed month.
                  </div>
                ) : (
                  <DataTable
                    columns={timesheetAttentionColumns}
                    data={timesheetAttentionRows}
                    pageSize={10}
                    searchPlaceholder="Search attention items..."
                    onRowClick={(row) => setSelectedDate(startOfDay(row.date))}
                    actions={(row) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(startOfDay(row.date))}
                      >
                        Review
                      </Button>
                    )}
                  />
                )}
              </CardContent>
            </Card>
            ) : null}
    </>
  );
}

export default PlannerTimesheetMonthWorkspacePanel;
