import { FormDialog } from "@/components/FormDialog";

export function PlannerTimesheetTemplateDialogs(props: any) {
  return (
    <>
      <FormDialog
        open={props.isTimesheetTemplateDialogOpen}
        onOpenChange={(open) => {
          props.setIsTimesheetTemplateDialogOpen(open);
          if (!open) {
            props.setEditingTimesheetTemplate(null);
          }
        }}
        title={
          props.editingTimesheetTemplate ? "Edit Timesheet Template" : "Save Day As Template"
        }
        description="Save a reusable day pattern so you can apply the same activities, hours, breaks, and notes again without rebuilding them."
        submitLabel={props.editingTimesheetTemplate ? "Save Template" : "Add Template"}
        initialValues={{
          label: props.editingTimesheetTemplate?.label ?? "",
          description: props.editingTimesheetTemplate?.description ?? "",
          startTime: props.editingTimesheetTemplate?.startTime ?? props.timesheetDraftStartTime,
          endTime: props.editingTimesheetTemplate?.endTime ?? props.timesheetDraftEndTime,
          lunchBreakMinutes:
            props.editingTimesheetTemplate?.lunchBreakMinutes ??
            props.timesheetDraftLunchBreakMinutes,
          teaBreakMinutes:
            props.editingTimesheetTemplate?.teaBreakMinutes ?? props.timesheetDraftTeaBreakMinutes,
          leavePortionPercent: String(
            props.editingTimesheetTemplate?.leavePortionPercent ??
              props.timesheetDraftLeavePortionPercent
          ),
          selectedOptionIds: (
            props.editingTimesheetTemplate?.selectedOptionIds ?? props.timesheetDraftOptionIds
          ).map(String),
          remarks: props.editingTimesheetTemplate?.remarks ?? props.timesheetDraftRemarks,
          isActive: props.editingTimesheetTemplate?.isActive ?? true,
        }}
        fields={[
          {
            name: "label",
            label: "Template Name",
            type: "text",
            required: true,
            placeholder: "Normal Training Day, Client Support Day, Leave Day, etc.",
          },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            placeholder: "Optional note to explain when this template should be used",
          },
          {
            name: "selectedOptionIds",
            label: "Activities",
            type: "checkbox-group",
            options: props.activeTimesheetOptions.map((option: any) => ({
              value: String(option.id),
              label: option.label,
            })),
          },
          {
            name: "startTime",
            label: "Start Time",
            type: "time",
          },
          {
            name: "endTime",
            label: "End Time",
            type: "time",
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
            name: "leavePortionPercent",
            label: "Leave Portion",
            type: "select",
            options: [
              { value: "100", label: "Full Day Leave" },
              { value: "50", label: "Half Day Leave" },
            ],
          },
          {
            name: "remarks",
            label: "Remarks",
            type: "textarea",
            placeholder: "Optional notes that should be carried with this template",
          },
          {
            name: "isActive",
            label: "Active",
            type: "checkbox",
            placeholder:
              "Hidden templates stay available on history but do not show in quick apply lists",
          },
        ]}
        onSubmit={async (values) => {
          const label = String(values.label || "").trim();
          if (!label) {
            throw new Error("Template name is required.");
          }

          const selectedOptionIds = Array.isArray(values.selectedOptionIds)
            ? (values.selectedOptionIds as string[]).map((value) => Number(value))
            : [];
          const startTime = String(values.startTime || "").trim() || null;
          const endTime = String(values.endTime || "").trim() || null;
          const remarks = String(values.remarks || "").trim() || null;
          const lunchBreakMinutes = Math.max(0, Number(values.lunchBreakMinutes || 0));
          const teaBreakMinutes = Math.max(0, Number(values.teaBreakMinutes || 0));
          const hasNonWorkingSelection = props.activeTimesheetOptions.some(
            (option: any) =>
              selectedOptionIds.includes(option.id) && option.hoursCategory === "non_working"
          );
          const leavePortionPercent: 50 | 100 | null = hasNonWorkingSelection
            ? Number(values.leavePortionPercent || 100) === 50
              ? 50
              : 100
            : null;

          if (
            selectedOptionIds.length === 0 &&
            !startTime &&
            !endTime &&
            !remarks &&
            lunchBreakMinutes === 0 &&
            teaBreakMinutes === 0
          ) {
            throw new Error(
              "Add at least one activity, time, break, or note before saving a template."
            );
          }

          try {
            if (props.editingTimesheetTemplate) {
              await props.updateTimesheetTemplateMutation.mutateAsync({
                id: props.editingTimesheetTemplate.id,
                data: {
                  label,
                  description: String(values.description || "").trim() || null,
                  startTime,
                  endTime,
                  lunchBreakMinutes,
                  teaBreakMinutes,
                  leavePortionPercent,
                  selectedOptionIds,
                  remarks,
                  isActive: Boolean(values.isActive),
                },
              });
              props.toast.success("Timesheet template updated");
            } else {
              await props.createTimesheetTemplateMutation.mutateAsync({
                label,
                description: String(values.description || "").trim() || null,
                startTime,
                endTime,
                lunchBreakMinutes,
                teaBreakMinutes,
                leavePortionPercent,
                selectedOptionIds,
                remarks,
                isActive: Boolean(values.isActive),
              });
              props.toast.success("Timesheet template saved");
            }

            props.setIsTimesheetTemplateDialogOpen(false);
            props.setEditingTimesheetTemplate(null);
            await props.refetchTimesheetTemplates();
          } catch (error) {
            props.toast.error(
              error instanceof Error ? error.message : "Failed to save the timesheet template"
            );
          }
        }}
      />

      <FormDialog
        open={props.isTimesheetTemplateApplyDialogOpen}
        onOpenChange={props.setIsTimesheetTemplateApplyDialogOpen}
        title="Apply Timesheet Template"
        description="Use a saved day pattern on the selected day or spread it across a future date range."
        submitLabel="Apply Template"
        initialValues={{
          templateId: props.activeTimesheetTemplates[0]?.id
            ? String(props.activeTimesheetTemplates[0].id)
            : "",
          applyMode: "selected_day",
          fromDate: props.getDateInputValue(props.selectedDate),
          toDate: props.getDateInputValue(props.selectedDate),
          includeWeekends: false,
          overwriteExisting: true,
        }}
        fields={[
          {
            name: "templateId",
            label: "Template",
            type: "select",
            required: true,
            options: props.activeTimesheetTemplates.map((template: any) => ({
              value: String(template.id),
              label: template.label,
            })),
          },
          {
            name: "applyMode",
            label: "Apply To",
            type: "select",
            required: true,
            options: [
              { value: "selected_day", label: "Selected Day Only" },
              { value: "date_range", label: "Date Range" },
            ],
          },
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
            name: "includeWeekends",
            label: "Include Weekends",
            type: "checkbox",
            placeholder:
              "Apply the template to Saturdays and Sundays as well when using a date range",
          },
          {
            name: "overwriteExisting",
            label: "Replace Existing Entries",
            type: "checkbox",
            placeholder:
              "If unticked, the template merges into existing saved days instead of replacing them",
          },
        ]}
        onSubmit={async (values) => {
          const template = props.typedTimesheetTemplates.find(
            (row: any) => row.id === Number(values.templateId || 0)
          );
          if (!template) {
            throw new Error("Choose a valid timesheet template first.");
          }

          const payload = {
            startTime: template.startTime?.trim() || null,
            endTime: template.endTime?.trim() || null,
            lunchBreakMinutes: template.lunchBreakMinutes ?? null,
            teaBreakMinutes: template.teaBreakMinutes ?? null,
            leavePortionPercent:
              template.leavePortionPercent === null
                ? null
                : props.normaliseTimesheetLeavePortionPercent(template.leavePortionPercent),
            selectedOptionIds: template.selectedOptionIds,
            remarks: template.remarks?.trim() || null,
          };

          try {
            if (String(values.applyMode || "selected_day") === "date_range") {
              const fromDate = props.parseDateInputValue(String(values.fromDate || ""));
              const toDate = props.parseDateInputValue(String(values.toDate || ""));
              if (!fromDate || !toDate) {
                throw new Error("Choose a valid date range.");
              }

              const result = await props.bulkUpsertTimesheetEntriesMutation.mutateAsync({
                fromDate,
                toDate,
                ...payload,
                includeWeekends: Boolean(values.includeWeekends),
                overwriteExisting: Boolean(values.overwriteExisting),
              });
              props.toast.success(
                `Applied "${template.label}" across ${result.processedDays} day(s).`
              );
            } else {
              await props.upsertTimesheetEntryMutation.mutateAsync({
                entryDate: props.selectedDate,
                ...payload,
              });
              props.applyTimesheetTemplateToDraft(template);
              props.toast.success(
                `Applied "${template.label}" to ${props.formatPlannerDate(props.selectedDate)}.`
              );
            }

            props.setIsTimesheetTemplateApplyDialogOpen(false);
            await Promise.all([
              props.refetchTimesheetEntries(),
              props.refetchYearTimesheetEntries(),
              props.refetchTimesheetOverview(),
              props.refetchTimesheetTeamLeaveOverview(),
              props.refetchTimesheetTeamLeaveCalendar(),
            ]);
          } catch (error) {
            props.toast.error(
              error instanceof Error ? error.message : "Failed to apply the timesheet template"
            );
          }
        }}
      />

      <FormDialog
        open={props.isTimesheetTemplateFillDialogOpen}
        onOpenChange={props.setIsTimesheetTemplateFillDialogOpen}
        title="Fill Month From Default Templates"
        description="Use the default Mon-Thu, Friday, and weekend templates from your Timesheet Profile to populate the current month much faster."
        submitLabel="Fill Month"
        initialValues={{
          includeWeekends: false,
          overwriteExisting: false,
        }}
        fields={[
          {
            name: "includeWeekends",
            label: "Include Weekends",
            type: "checkbox",
            placeholder: "Use the weekend default template where one has been set",
          },
          {
            name: "overwriteExisting",
            label: "Replace Existing Entries",
            type: "checkbox",
            placeholder:
              "If unticked, only missing days will be filled and your existing saved days stay as they are",
          },
        ]}
        onSubmit={async (values) => {
          await props.handleFillTimesheetMonthFromTemplates({
            includeWeekends: Boolean(values.includeWeekends),
            overwriteExisting: Boolean(values.overwriteExisting),
          });
        }}
      />

      <FormDialog
        open={props.isTimesheetPreviousMonthCopyDialogOpen}
        onOpenChange={props.setIsTimesheetPreviousMonthCopyDialogOpen}
        title="Copy Previous Month"
        description={`Pull saved day entries from ${props.previousTimesheetMonthLabel} into the visible month by matching day number. This is useful when most of the work pattern is similar from month to month.`}
        submitLabel="Copy Month"
        initialValues={{
          includeWeekends: false,
          overwriteExisting: false,
          copyRemarks: true,
        }}
        fields={[
          {
            name: "includeWeekends",
            label: "Include Weekends",
            type: "checkbox",
            placeholder:
              "Copy Saturdays and Sundays too when the previous month has saved weekend entries",
          },
          {
            name: "overwriteExisting",
            label: "Replace Existing Entries",
            type: "checkbox",
            placeholder:
              "If unticked, existing saved days in the visible month stay as they are and only missing days get copied",
          },
          {
            name: "copyRemarks",
            label: "Copy Remarks",
            type: "checkbox",
            placeholder:
              "Keep the previous month's day remarks as part of the copied entries",
          },
        ]}
        onSubmit={async (values) => {
          await props.handleCopyPreviousTimesheetMonth({
            includeWeekends: Boolean(values.includeWeekends),
            overwriteExisting: Boolean(values.overwriteExisting),
            copyRemarks: Boolean(values.copyRemarks),
          });
        }}
      />

      <FormDialog
        open={props.isTimesheetHolidayApplyDialogOpen}
        onOpenChange={props.setIsTimesheetHolidayApplyDialogOpen}
        title="Apply Timesheet Holidays"
        description="Create or refresh non-working entries for the visible month from your saved holiday calendar. This helps the planner stop counting those dates as expected working days."
        submitLabel="Apply Holidays"
        initialValues={{
          overwriteExisting: false,
        }}
        fields={[
          {
            name: "overwriteExisting",
            label: "Replace Existing Entries",
            type: "checkbox",
            placeholder:
              "If unticked, only missing days will be created and existing saved entries will be left as they are",
          },
        ]}
        onSubmit={async (values) => {
          await props.handleApplyTimesheetHolidaysToMonth({
            overwriteExisting: Boolean(values.overwriteExisting),
          });
        }}
      />
    </>
  );
}
