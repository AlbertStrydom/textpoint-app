import type { Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";

export function buildPlannerTimesheetMonthWorkspaceColumns(helpers: any) {
  const {
    formatLeaveDays,
    formatMinutesAsDuration,
    formatPlannerDate,
    formatPlannerDateTime,
    formatVarianceMinutes,
    getTimesheetAttentionBadgeVariant,
    getTimesheetHolidayTypeLabel,
    getTimesheetHoursCategoryLabel,
    typedTimesheetOptions,
  } = helpers;

  const timesheetOptionColumns: Column<any>[] = [
    {
      key: "label",
      label: "Activity",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.label}</div>
          {row.description ? <div className="text-xs text-muted-foreground">{row.description}</div> : null}
        </div>
      ),
    },
    {
      key: "sortOrder",
      label: "Order",
      sortable: true,
      render: (value) => String(value),
    },
    {
      key: "hoursCategory",
      label: "Hours",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "non_working" ? "outline" : "secondary"}>
          {getTimesheetHoursCategoryLabel(String(value || ""))}
        </Badge>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value ? "secondary" : "outline"}>{value ? "Active" : "Hidden"}</Badge>
      ),
    },
  ];

  const timesheetTemplateColumns: Column<any>[] = [
    {
      key: "label",
      label: "Template",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.label}</div>
          <div className="text-xs text-muted-foreground">
            {row.description?.trim() || "Reusable day pattern"}
          </div>
        </div>
      ),
    },
    {
      key: "selectedOptionIds",
      label: "Activities",
      render: (_value, row) => {
        const matchedOptions = typedTimesheetOptions.filter((option: any) =>
          row.selectedOptionIds.includes(option.id)
        );
        return matchedOptions.length === 0 ? (
          <span className="text-sm text-muted-foreground">No activities</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {matchedOptions.slice(0, 3).map((option: any) => (
              <Badge key={`timesheet-template-option-${row.id}-${option.id}`} variant="outline">
                {option.label}
              </Badge>
            ))}
            {matchedOptions.length > 3 ? (
              <Badge variant="outline">+{matchedOptions.length - 3} more</Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "startTime",
      label: "Hours",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.startTime?.trim() && row.endTime?.trim()
              ? `${row.startTime.trim()} - ${row.endTime.trim()}`
              : "No fixed hours"}
          </div>
          <div className="text-xs text-muted-foreground">
            Lunch {row.lunchBreakMinutes ?? 0} min, Tea {row.teaBreakMinutes ?? 0} min
          </div>
          {row.leavePortionPercent ? (
            <div className="text-xs text-muted-foreground">
              {row.leavePortionPercent === 50 ? "Half-day leave" : "Full-day leave"}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant={value ? "secondary" : "outline"}>{value ? "Active" : "Hidden"}</Badge>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      render: (value) => formatPlannerDateTime(value),
    },
  ];

  const timesheetHolidayColumns: Column<any>[] = [
    {
      key: "holidayDate",
      label: "Date",
      sortable: true,
      render: (value) => formatPlannerDate(value),
    },
    {
      key: "holidayType",
      label: "Type",
      sortable: true,
      filterable: true,
      render: (value) => (
        <Badge variant={String(value) === "company_shutdown" ? "outline" : "secondary"}>
          {getTimesheetHolidayTypeLabel(String(value || ""))}
        </Badge>
      ),
    },
    {
      key: "label",
      label: "Holiday",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.label}</div>
          <div className="text-xs text-muted-foreground">{row.notes?.trim() || "No extra notes"}</div>
        </div>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      sortable: true,
      render: (value) => formatPlannerDateTime(value),
    },
  ];

  const timesheetPersonalLeaveColumns: Column<any>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPlannerDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">{row.dayLabel}</div>
        </div>
      ),
    },
    {
      key: "leaveSummary",
      label: "Leave / Non-Working",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.leaveSummary}</div>
          <div className="text-xs text-muted-foreground">
            {row.leavePortionPercent === 50 ? "Half-day leave" : "Full-day leave"}
          </div>
          <div className="flex flex-wrap gap-1">
            {row.leaveLabels.map((label: string) => (
              <Badge key={`${row.id}-${label}`} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      filterable: true,
      render: (value) =>
        String(value || "").trim() ? <span>{String(value).trim()}</span> : <span className="text-sm text-muted-foreground">No remarks</span>,
    },
    {
      key: "overrideReviewStatus",
      label: "Override Review",
      sortable: true,
      filterable: true,
      render: (_value, row) =>
        row.hasLeaveOverride ? (
          <div className="space-y-1">
            <Badge variant={row.overrideReviewStatus === "reviewed" ? "secondary" : "destructive"}>
              {row.overrideReviewStatus === "reviewed" ? "Reviewed Override" : "Pending Override Review"}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {row.overrideNote?.trim() ? `Override note: ${row.overrideNote.trim()}` : "Override note not captured"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.overrideReviewedAt ? `Reviewed ${formatPlannerDateTime(row.overrideReviewedAt)}` : "Still waiting for admin review"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.overrideReviewedByName?.trim()
                ? `By ${row.overrideReviewedByName.trim()}`
                : row.overrideReviewNote?.trim()
                  ? row.overrideReviewNote.trim()
                  : "No review note yet"}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Badge variant="outline">Within Rules</Badge>
            <div className="text-xs text-muted-foreground">This leave day did not need an override.</div>
          </div>
        ),
    },
    {
      key: "comparisonStatus",
      label: "Vs Prev",
      sortable: true,
      render: (value) => (
        <Badge variant={value === "changed" || value === "new" ? "secondary" : "outline"}>
          {value === "same"
            ? "Same"
            : value === "changed"
              ? "Changed"
              : value === "new"
                ? "New"
                : value === "missing"
                  ? "Missing"
                  : "No History"}
        </Badge>
      ),
    },
  ];

  const timesheetPersonalLeaveBlockColumns: Column<any>[] = [
    {
      key: "startDate",
      label: "Leave Block",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">
            {row.startDateKey === row.endDateKey
              ? formatPlannerDate(row.startDate)
              : `${formatPlannerDate(row.startDate)} to ${formatPlannerDate(row.endDate)}`}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.startDayLabel}
            {row.startDateKey === row.endDateKey ? "" : ` to ${row.endDayLabel}`}
          </div>
        </div>
      ),
    },
    {
      key: "leaveSummary",
      label: "Leave / Non-Working",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.leaveSummary}</div>
          <div className="flex flex-wrap gap-1">
            {row.leaveLabels.map((label: string) => (
              <Badge key={`${row.id}-${label}`} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "usedDays",
      label: "Impact",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary">Leave: {formatLeaveDays(row.usedDays)}</Badge>
            <Badge variant="outline">Span: {row.spanDays}</Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatLeaveDays(row.workingLeaveDays)} working
            {row.weekendLeaveDays > 0 ? `, ${formatLeaveDays(row.weekendLeaveDays)} weekend` : ""}
            {row.sharedHolidayGapDays > 0 ? `, ${row.sharedHolidayGapDays} shared holiday` : ""}
          </div>
        </div>
      ),
    },
    {
      key: "remarks",
      label: "Remarks",
      filterable: true,
      render: (value) =>
        String(value || "").trim() ? <span>{String(value).trim()}</span> : <span className="text-sm text-muted-foreground">No remarks</span>,
    },
    {
      key: "overrideReviewStatus",
      label: "Override Review",
      sortable: true,
      filterable: true,
      render: (_value, row) =>
        row.hasLeaveOverride ? (
          <div className="space-y-1">
            <Badge
              variant={
                row.overrideReviewStatus === "reviewed"
                  ? "secondary"
                  : row.overrideReviewStatus === "mixed"
                    ? "outline"
                    : "destructive"
              }
            >
              {row.overrideReviewStatus === "reviewed"
                ? "Reviewed"
                : row.overrideReviewStatus === "mixed"
                  ? "Partly Reviewed"
                  : "Pending Review"}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {formatLeaveDays(row.overrideLeaveDays)} override day(s), {row.pendingOverrideReviewCount} pending,{" "}
              {row.reviewedOverrideCount} reviewed
            </div>
            <div className="text-xs text-muted-foreground">
              {row.latestOverrideNote?.trim() ? `Override note: ${row.latestOverrideNote.trim()}` : "Override note not captured"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.latestOverrideReviewedAt ? `Latest review ${formatPlannerDateTime(row.latestOverrideReviewedAt)}` : "No override review captured yet"}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Badge variant="outline">Within Rules</Badge>
            <div className="text-xs text-muted-foreground">No leave override was needed in this block.</div>
          </div>
        ),
    },
  ];

  const timesheetPersonalLeaveOverrideBlockColumns: Column<any>[] = [
    {
      key: "startDate",
      label: "Override Period",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">
            {row.startDateKey === row.endDateKey
              ? formatPlannerDate(row.startDate)
              : `${formatPlannerDate(row.startDate)} to ${formatPlannerDate(row.endDate)}`}
          </div>
          <div className="text-xs text-muted-foreground">{row.leaveSummary || "Override leave block"}</div>
        </div>
      ),
    },
    {
      key: "overrideNote",
      label: "Override",
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.overrideNote?.trim() || "Override note not captured"}</div>
          <div className="text-xs text-muted-foreground">
            {formatLeaveDays(row.usedDays)} leave day(s) across {row.entryDateKeys.length} saved day{row.entryDateKeys.length === 1 ? "" : "s"}
          </div>
        </div>
      ),
    },
    {
      key: "reviewStatus",
      label: "Review",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge
            variant={
              row.reviewStatus === "reviewed"
                ? "secondary"
                : row.reviewStatus === "mixed"
                  ? "outline"
                  : "destructive"
            }
          >
            {row.reviewStatus === "reviewed"
              ? "Reviewed"
              : row.reviewStatus === "mixed"
                ? "Partly Reviewed"
                : "Pending Review"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.latestReviewedAt ? `Latest review ${formatPlannerDateTime(row.latestReviewedAt)}` : "Still waiting for admin review"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.latestReviewedByName?.trim()
              ? `By ${row.latestReviewedByName.trim()}`
              : row.latestReviewNote?.trim()
                ? row.latestReviewNote.trim()
                : "No review note yet"}
          </div>
        </div>
      ),
    },
    {
      key: "leaveRemainingDays",
      label: "Remaining Balance",
      sortable: true,
      render: (value) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {value === null ? "Allowance not set" : `${formatLeaveDays(Number(value))} day(s)`}
          </div>
        </div>
      ),
    },
  ];

  const timesheetWeekColumns: Column<any>[] = [
    {
      key: "weekLabel",
      label: "Week",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.weekLabel}</div>
          <div className="text-xs text-muted-foreground">{row.rangeLabel}</div>
        </div>
      ),
    },
    {
      key: "readinessStatus",
      label: "Readiness",
      sortable: true,
      render: (_value, row) => {
        const variant =
          row.readinessStatus === "ready"
            ? "secondary"
            : row.readinessStatus === "warnings"
              ? "outline"
              : row.readinessStatus === "needs_work"
                ? "destructive"
                : "outline";
        const label =
          row.readinessStatus === "ready"
            ? "Ready"
            : row.readinessStatus === "warnings"
              ? "Warnings"
              : row.readinessStatus === "needs_work"
                ? "Needs Work"
                : row.readinessStatus === "in_progress"
                  ? "In Progress"
                  : "Upcoming";
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      key: "completionPercent",
      label: "Progress",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.dueWorkingDays > 0 ? `${row.completedWorkingDays}/${row.dueWorkingDays} days` : "Not due yet"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.dueWorkingDays > 0 ? `${row.completionPercent}% complete` : "Future week"}
          </div>
        </div>
      ),
    },
    {
      key: "nextActionLabel",
      label: "Next Action",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.nextActionLabel}</div>
          <div className="text-xs text-muted-foreground">{row.nextActionDetail}</div>
        </div>
      ),
    },
    {
      key: "loggedDays",
      label: "Logged Days",
      sortable: true,
      render: (value) => <Badge variant={Number(value) > 0 ? "secondary" : "outline"}>{String(value)}</Badge>,
    },
    {
      key: "blockerCount",
      label: "Blockers",
      sortable: true,
      render: (value) => <Badge variant={Number(value) > 0 ? "destructive" : "outline"}>{String(value)}</Badge>,
    },
    {
      key: "warningCount",
      label: "Warnings",
      sortable: true,
      render: (value) => <Badge variant={Number(value) > 0 ? "outline" : "secondary"}>{String(value)}</Badge>,
    },
    {
      key: "workedMinutes",
      label: "Worked",
      sortable: true,
      render: (value) => formatMinutesAsDuration(Number(value)),
    },
    {
      key: "expectedMinutes",
      label: "Target",
      sortable: true,
      render: (value) => formatMinutesAsDuration(Number(value)),
    },
    {
      key: "overtimeMinutes",
      label: "Overtime",
      sortable: true,
      render: (value) =>
        Number(value) > 0 ? <span className="text-emerald-700">{formatMinutesAsDuration(Number(value))}</span> : <span className="text-sm text-muted-foreground">-</span>,
    },
    {
      key: "shortMinutes",
      label: "Short",
      sortable: true,
      render: (value) =>
        Number(value) > 0 ? <span className="text-amber-700">{formatMinutesAsDuration(Number(value))}</span> : <span className="text-sm text-muted-foreground">-</span>,
    },
    {
      key: "varianceMinutes",
      label: "Variance",
      sortable: true,
      render: (value) => {
        const numericValue = Number(value);
        return (
          <span
            className={
              numericValue > 0
                ? "text-emerald-700"
                : numericValue < 0
                  ? "text-amber-700"
                  : "text-muted-foreground"
            }
          >
            {formatVarianceMinutes(numericValue)}
          </span>
        );
      },
    },
  ];

  const timesheetAttentionColumns: Column<any>[] = [
    {
      key: "dayLabel",
      label: "Day",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.dayLabel}</div>
          <div className="text-xs text-muted-foreground">{row.dateKey}</div>
        </div>
      ),
    },
    {
      key: "issueLabel",
      label: "Issue",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <Badge variant={getTimesheetAttentionBadgeVariant(row.category)}>{row.issueLabel}</Badge>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      render: (value) => <span>{String(value)}</span>,
    },
  ];

  return {
    timesheetAttentionColumns,
    timesheetHolidayColumns,
    timesheetOptionColumns,
    timesheetPersonalLeaveBlockColumns,
    timesheetPersonalLeaveColumns,
    timesheetPersonalLeaveOverrideBlockColumns,
    timesheetTemplateColumns,
    timesheetWeekColumns,
  };
}
