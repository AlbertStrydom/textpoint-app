import { FormDialog } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import type { Dispatch, SetStateAction } from "react";
import type {
  PlannerTimesheetHolidayLite,
  PlannerTimesheetOptionLite,
} from "@/components/planner/plannerSharedTypes";

type MutationWithAsync<TInput, TResult = unknown> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
};

type RefetchFn = () => Promise<unknown>;

type PlannerTimesheetDepartmentCoverageRuleLite = {
  createdAt: string | Date;
  createdByUserId: number | null;
  id: number;
  department: string;
  highRiskPercent: number;
  minimumAvailableCount: number | null;
  maximumPeopleOff: number | null;
  mediumRiskPercent: number;
  notes: string | null;
  updatedAt: string | Date;
  updatedByUserId: number | null;
};

type PlannerTimesheetProfileHoursLite = {
  startTime: string;
  endTime: string;
};

type PlannerTimesheetOperationalDialogsProps = {
  activeTimesheetOptions: PlannerTimesheetOptionLite[];
  bulkUpsertTimesheetEntriesMutation: MutationWithAsync<
    {
      endTime: string | null;
      fromDate: Date;
      includeWeekends: boolean;
      leavePortionPercent: 50 | 100 | null;
      lunchBreakMinutes: number;
      overwriteExisting: boolean;
      remarks: string | null;
      selectedOptionIds: number[];
      startTime: string | null;
      teaBreakMinutes: number;
      toDate: Date;
    },
    { processedDays: number }
  >;
  createTimesheetHolidayMutation: MutationWithAsync<{
    holidayDate: Date;
    holidayType: "public_holiday" | "company_shutdown";
    label: string;
    notes: string | null;
  }>;
  editingTimesheetDepartmentCoverageRule: PlannerTimesheetDepartmentCoverageRuleLite | null;
  editingTimesheetHoliday: PlannerTimesheetHolidayLite | null;
  getDateInputValue: (value: string | Date | null | undefined) => string;
  getDefaultTimesheetHours: (date: Date) => PlannerTimesheetProfileHoursLite;
  isTimesheetBulkDialogOpen: boolean;
  isTimesheetDepartmentCoverageRuleDialogOpen: boolean;
  isTimesheetHolidayDialogOpen: boolean;
  monthEnd: Date;
  parseDateInputValue: (value: string) => Date | null;
  refetchTimesheetDepartmentCoverageSettings: RefetchFn;
  refetchTimesheetEntries: RefetchFn;
  refetchTimesheetHolidays: RefetchFn;
  refetchTimesheetOverview: RefetchFn;
  refetchTimesheetTeamLeaveCalendar: RefetchFn;
  refetchTimesheetTeamLeaveOverview: RefetchFn;
  refetchYearTimesheetEntries: RefetchFn;
  saveTimesheetDepartmentCoverageRuleMutation: MutationWithAsync<{
    department: string;
    highRiskPercent: number;
    id: number | null;
    maximumPeopleOff: number | null;
    mediumRiskPercent: number;
    minimumAvailableCount: number | null;
    notes: string | null;
  }>;
  selectedDate: Date;
  setEditingTimesheetDepartmentCoverageRule: Dispatch<
    SetStateAction<PlannerTimesheetDepartmentCoverageRuleLite | null>
  >;
  setEditingTimesheetHoliday: Dispatch<SetStateAction<PlannerTimesheetHolidayLite | null>>;
  setIsTimesheetBulkDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetDepartmentCoverageRuleDialogOpen: Dispatch<SetStateAction<boolean>>;
  setIsTimesheetHolidayDialogOpen: Dispatch<SetStateAction<boolean>>;
  timesheetDraftEndTime: string;
  timesheetDraftLeavePortionPercent: number;
  timesheetDraftLunchBreakMinutes: number;
  timesheetDraftOptionIds: number[];
  timesheetDraftRemarks: string;
  timesheetDraftStartTime: string;
  timesheetDraftTeaBreakMinutes: number;
  timesheetKnownDepartments: string[];
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
  };
  updateTimesheetHolidayMutation: MutationWithAsync<{
    data: {
      holidayDate: Date;
      holidayType: "public_holiday" | "company_shutdown";
      label: string;
      notes: string | null;
    };
    id: number;
  }>;
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function PlannerTimesheetOperationalDialogs({
  activeTimesheetOptions,
  bulkUpsertTimesheetEntriesMutation,
  createTimesheetHolidayMutation,
  editingTimesheetDepartmentCoverageRule,
  editingTimesheetHoliday,
  getDateInputValue,
  getDefaultTimesheetHours,
  isTimesheetBulkDialogOpen,
  isTimesheetDepartmentCoverageRuleDialogOpen,
  isTimesheetHolidayDialogOpen,
  monthEnd,
  parseDateInputValue,
  refetchTimesheetDepartmentCoverageSettings,
  refetchTimesheetEntries,
  refetchTimesheetHolidays,
  refetchTimesheetOverview,
  refetchTimesheetTeamLeaveCalendar,
  refetchTimesheetTeamLeaveOverview,
  refetchYearTimesheetEntries,
  saveTimesheetDepartmentCoverageRuleMutation,
  selectedDate,
  setEditingTimesheetDepartmentCoverageRule,
  setEditingTimesheetHoliday,
  setIsTimesheetBulkDialogOpen,
  setIsTimesheetDepartmentCoverageRuleDialogOpen,
  setIsTimesheetHolidayDialogOpen,
  timesheetDraftEndTime,
  timesheetDraftLeavePortionPercent,
  timesheetDraftLunchBreakMinutes,
  timesheetDraftOptionIds,
  timesheetDraftRemarks,
  timesheetDraftStartTime,
  timesheetDraftTeaBreakMinutes,
  timesheetKnownDepartments,
  toast,
  updateTimesheetHolidayMutation,
}: PlannerTimesheetOperationalDialogsProps) {

  return (
    <>
        <FormDialog
          open={isTimesheetBulkDialogOpen}
          onOpenChange={setIsTimesheetBulkDialogOpen}
          title="Bulk Fill Timesheet Range"
          description="Apply the currently selected work pattern across several days at once, which is useful when the same type of work repeats over a week or block of time."
          submitLabel="Apply Bulk Fill"
          initialValues={{
            fromDate: getDateInputValue(addDays(selectedDate, 1)),
            toDate: getDateInputValue(monthEnd),
            startTime:
              timesheetDraftStartTime ||
              getDefaultTimesheetHours(selectedDate).startTime,
            endTime:
              timesheetDraftEndTime ||
              getDefaultTimesheetHours(selectedDate).endTime,
            lunchBreakMinutes: timesheetDraftLunchBreakMinutes,
            teaBreakMinutes: timesheetDraftTeaBreakMinutes,
            leavePortionPercent: String(timesheetDraftLeavePortionPercent),
            selectedOptionIds: timesheetDraftOptionIds.map(String),
            remarks: timesheetDraftRemarks,
            includeWeekends: false,
            overwriteExisting: false,
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
              name: "startTime",
              label: "Start Time",
              type: "text",
              placeholder: "07:00",
              validation: (value) => {
                const trimmed = String(value || "").trim();
                if (!trimmed) return undefined;
                return /^\d{2}:\d{2}$/.test(trimmed)
                  ? undefined
                  : "Use HH:MM format";
              },
            },
            {
              name: "endTime",
              label: "End Time",
              type: "text",
              placeholder: "16:00",
              validation: (value) => {
                const trimmed = String(value || "").trim();
                if (!trimmed) return undefined;
                return /^\d{2}:\d{2}$/.test(trimmed)
                  ? undefined
                  : "Use HH:MM format";
              },
            },
            {
              name: "selectedOptionIds",
              label: "Activities To Apply",
              type: "checkbox-group",
              required: true,
              options: activeTimesheetOptions.map((option) => ({
                value: String(option.id),
                label: option.label,
              })),
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
              name: "lunchBreakMinutes",
              label: "Lunch Break Minutes",
              type: "number",
            },
            {
              name: "teaBreakMinutes",
              label: "Tea Break Minutes",
              type: "number",
            },
            {
              name: "remarks",
              label: "Remarks To Apply",
              type: "textarea",
              placeholder: "Optional note to apply across the selected range",
            },
            {
              name: "includeWeekends",
              label: "Include Weekends",
              type: "checkbox",
              placeholder: "Apply this bulk fill to Saturdays and Sundays as well",
            },
            {
              name: "overwriteExisting",
              label: "Replace Existing Entries",
              type: "checkbox",
              placeholder:
                "If unticked, the new activities merge into existing days instead of replacing them",
            },
          ]}
          onSubmit={async (values) => {
            const fromDate = parseDateInputValue(String(values.fromDate || ""));
            const toDate = parseDateInputValue(String(values.toDate || ""));
            if (!fromDate || !toDate) {
              throw new Error("Bulk fill dates are invalid.");
            }

            const selectedOptionIds = Array.isArray(values.selectedOptionIds)
              ? (values.selectedOptionIds as string[]).map((value) => Number(value))
              : [];

            if (selectedOptionIds.length === 0) {
              throw new Error("Choose at least one activity to apply.");
            }

            try {
              const selectedOptionSet = new Set(selectedOptionIds);
              const hasNonWorkingSelection = activeTimesheetOptions.some(
                (option) =>
                  selectedOptionSet.has(option.id) && option.hoursCategory === "non_working"
              );
              const result = await bulkUpsertTimesheetEntriesMutation.mutateAsync({
                fromDate,
                toDate,
                startTime: String(values.startTime || "").trim() || null,
                endTime: String(values.endTime || "").trim() || null,
                lunchBreakMinutes: Math.max(0, Number(values.lunchBreakMinutes || 0)),
                teaBreakMinutes: Math.max(0, Number(values.teaBreakMinutes || 0)),
                leavePortionPercent: hasNonWorkingSelection
                  ? Number(values.leavePortionPercent || 100) === 50
                    ? 50
                    : 100
                  : null,
                selectedOptionIds,
                remarks: String(values.remarks || "").trim() || null,
                includeWeekends: Boolean(values.includeWeekends),
                overwriteExisting: Boolean(values.overwriteExisting),
              });
              toast.success(
                `Bulk fill applied across ${result.processedDays} day(s).`
              );
              setIsTimesheetBulkDialogOpen(false);
              await Promise.all([
                refetchTimesheetEntries(),
                refetchYearTimesheetEntries(),
                refetchTimesheetOverview(),
                refetchTimesheetTeamLeaveOverview(),
                refetchTimesheetTeamLeaveCalendar(),
              ]);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to apply the bulk timesheet fill"
              );
            }
          }}
        />

        <FormDialog
          open={isTimesheetHolidayDialogOpen}
          onOpenChange={(open) => {
            setIsTimesheetHolidayDialogOpen(open);
            if (!open) {
              setEditingTimesheetHoliday(null);
            }
          }}
          title={editingTimesheetHoliday ? "Edit Timesheet Holiday" : "Add Timesheet Holiday"}
          description="Use this for shared non-working dates like public holidays and company shutdowns. Personal leave should still be captured on the daily timesheet itself."
          submitLabel={editingTimesheetHoliday ? "Save Holiday" : "Add Holiday"}
          initialValues={{
            holidayDate: editingTimesheetHoliday
              ? getDateInputValue(editingTimesheetHoliday.holidayDate)
              : getDateInputValue(selectedDate),
            holidayType: editingTimesheetHoliday?.holidayType ?? "public_holiday",
            label: editingTimesheetHoliday?.label ?? "",
            notes: editingTimesheetHoliday?.notes ?? "",
          }}
          fields={[
            {
              name: "holidayDate",
              label: "Holiday Date",
              type: "date",
              required: true,
            },
            {
              name: "holidayType",
              label: "Type",
              type: "select",
              options: [
                { value: "public_holiday", label: "Public Holiday" },
                { value: "company_shutdown", label: "Company Shutdown" },
              ],
              required: true,
            },
            {
              name: "label",
              label: "Holiday Name",
              type: "text",
              required: true,
              placeholder: "Youth Day, December Shutdown, Branch Closure, etc.",
            },
            {
              name: "notes",
              label: "Notes",
              type: "textarea",
              placeholder:
                "Optional context, such as branch closure or the reason for the non-working date",
            },
          ]}
          onSubmit={async (values) => {
            const holidayDate = parseDateInputValue(String(values.holidayDate || ""));
            if (!holidayDate) {
              throw new Error("Choose a valid holiday date.");
            }

            const label = String(values.label || "").trim();
            if (!label) {
              throw new Error("Holiday name is required.");
            }

            const holidayType: "public_holiday" | "company_shutdown" =
              String(values.holidayType || "").trim() === "company_shutdown"
                ? "company_shutdown"
                : "public_holiday";

            const payload = {
              holidayDate,
              holidayType,
              label,
              notes: String(values.notes || "").trim() || null,
            };

            try {
              if (editingTimesheetHoliday) {
                await updateTimesheetHolidayMutation.mutateAsync({
                  id: editingTimesheetHoliday.id,
                  data: payload,
                });
                toast.success("Timesheet holiday updated");
              } else {
                await createTimesheetHolidayMutation.mutateAsync(payload);
                toast.success("Timesheet holiday added");
              }

              setIsTimesheetHolidayDialogOpen(false);
              setEditingTimesheetHoliday(null);
              await Promise.all([
                refetchTimesheetHolidays(),
                refetchTimesheetEntries(),
                refetchYearTimesheetEntries(),
                refetchTimesheetOverview(),
                refetchTimesheetTeamLeaveOverview(),
                refetchTimesheetTeamLeaveCalendar(),
              ]);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to save the timesheet holiday"
              );
            }
          }}
        />

        <FormDialog
          open={isTimesheetDepartmentCoverageRuleDialogOpen}
          onOpenChange={(open) => {
            setIsTimesheetDepartmentCoverageRuleDialogOpen(open);
            if (!open) {
              setEditingTimesheetDepartmentCoverageRule(null);
            }
          }}
          title={
            editingTimesheetDepartmentCoverageRule
              ? "Edit Department Coverage Rule"
              : "Add Department Coverage Rule"
          }
          description="Tune leave coverage alerts for one department at a time. These rules only affect admin leave coverage views, not personal timesheet calculations."
          submitLabel={
            editingTimesheetDepartmentCoverageRule ? "Save Coverage Rule" : "Add Coverage Rule"
          }
          initialValues={{
            department: editingTimesheetDepartmentCoverageRule?.department ?? "",
            minimumAvailableCount:
              editingTimesheetDepartmentCoverageRule?.minimumAvailableCount ?? "",
            maximumPeopleOff: editingTimesheetDepartmentCoverageRule?.maximumPeopleOff ?? "",
            mediumRiskPercent:
              editingTimesheetDepartmentCoverageRule?.mediumRiskPercent ?? 25,
            highRiskPercent:
              editingTimesheetDepartmentCoverageRule?.highRiskPercent ?? 50,
            notes: editingTimesheetDepartmentCoverageRule?.notes ?? "",
          }}
          fields={[
            {
              name: "department",
              label: "Department",
              type: "text",
              required: true,
              placeholder: "Quality, Admin, Training, Level III, etc.",
            },
            {
              name: "minimumAvailableCount",
              label: "Minimum Available Staff",
              type: "number",
              placeholder: "Leave blank if you only want percentage or max-off rules",
            },
            {
              name: "maximumPeopleOff",
              label: "Max People Off At Once",
              type: "number",
              placeholder: "Leave blank if not needed",
            },
            {
              name: "mediumRiskPercent",
              label: "Watch Threshold %",
              type: "number",
              required: true,
            },
            {
              name: "highRiskPercent",
              label: "High-Risk Threshold %",
              type: "number",
              required: true,
            },
            {
              name: "notes",
              label: "Rule Notes",
              type: "textarea",
              placeholder: "Optional context, for example why this department needs tighter coverage",
            },
          ]}
          renderExtraContent={({ setValue }) =>
            timesheetKnownDepartments.length > 0 ? (
              <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Known Departments
                </div>
                <div className="flex flex-wrap gap-2">
                  {timesheetKnownDepartments.map((departmentLabel) => (
                    <Button
                      key={departmentLabel}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setValue("department", departmentLabel)}
                    >
                      {departmentLabel}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null
          }
          onSubmit={async (values) => {
            const department = String(values.department || "").trim();
            if (!department) {
              throw new Error("Department is required.");
            }

            const parseOptionalNumber = (value: unknown) => {
              const raw = String(value ?? "").trim();
              if (!raw) {
                return null;
              }
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) {
                throw new Error("Enter a valid whole number for the coverage rule.");
              }
              return Math.max(0, Math.round(parsed));
            };

            const minimumAvailableCount = parseOptionalNumber(values.minimumAvailableCount);
            const maximumPeopleOff = parseOptionalNumber(values.maximumPeopleOff);
            const mediumRiskPercent = parseOptionalNumber(values.mediumRiskPercent);
            const highRiskPercent = parseOptionalNumber(values.highRiskPercent);

            if (mediumRiskPercent === null || highRiskPercent === null) {
              throw new Error("Watch and high-risk thresholds are required.");
            }

            try {
              await saveTimesheetDepartmentCoverageRuleMutation.mutateAsync({
                id: editingTimesheetDepartmentCoverageRule?.id ?? null,
                department,
                minimumAvailableCount,
                maximumPeopleOff,
                mediumRiskPercent,
                highRiskPercent,
                notes: String(values.notes || "").trim() || null,
              });
              toast.success(
                editingTimesheetDepartmentCoverageRule
                  ? "Department coverage rule updated"
                  : "Department coverage rule added"
              );
              setIsTimesheetDepartmentCoverageRuleDialogOpen(false);
              setEditingTimesheetDepartmentCoverageRule(null);
              await Promise.all([
                refetchTimesheetDepartmentCoverageSettings(),
                refetchTimesheetTeamLeaveOverview(),
                refetchTimesheetTeamLeaveCalendar(),
              ]);
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to save the department coverage rule"
              );
            }
          }}
        />
    </>
  );
}
