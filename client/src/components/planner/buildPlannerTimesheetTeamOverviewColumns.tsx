import type { Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";

export function buildPlannerTimesheetTeamOverviewColumns(helpers: any) {
  const {
    formatLeaveDays,
    formatPlannerDate,
    formatPlannerDateRange,
    formatPlannerDateTime,
    getTimesheetLeaveAvailabilityBadgeVariant,
    getTimesheetLeaveCoverageBadgeVariant,
    getTimesheetWorkflowStatusLabel,
  } = helpers;

  const timesheetOverviewColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">{row.userEmail || "-"}</div>
        </div>
      ),
    },
    {
      key: "workflowStatus",
      label: "Status",
      sortable: true,
      filterable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <Badge variant={row.workflowStatus === "submitted" ? "outline" : row.workflowStatus === "approved" ? "secondary" : "destructive"}>
            {String(value)}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.submittedAt
              ? `Submitted ${formatPlannerDateTime(row.submittedAt)}`
              : row.reviewedAt
                ? `Reviewed ${formatPlannerDateTime(row.reviewedAt)}`
                : row.lastEntryAt
                  ? `Updated ${formatPlannerDateTime(row.lastEntryAt)}`
                  : "No saved entries yet"}
          </div>
        </div>
      ),
    },
    {
      key: "completionPercent",
      label: "Completion",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.dueWorkingDays > 0
              ? `${row.completedWorkingDays}/${row.dueWorkingDays} days`
              : "Not due yet"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.dueWorkingDays > 0 ? `${row.completionPercent}% complete` : "Future month days"}
          </div>
        </div>
      ),
    },
    {
      key: "attentionLabel",
      label: "Attention",
      sortable: true,
      filterable: true,
      render: (_value, row) => {
        const variant =
          row.attentionLabel === "Blocked"
            ? "destructive"
            : row.attentionLabel === "Warnings" || row.attentionLabel.startsWith("Overdue Review")
              ? "outline"
              : row.attentionLabel === "Approved" || row.attentionLabel === "Ready"
                ? "secondary"
                : "outline";
        return (
          <div className="space-y-1">
            <Badge variant={variant}>{row.attentionLabel}</Badge>
            <div className="text-xs text-muted-foreground">{row.attentionDetail}</div>
          </div>
        );
      },
    },
    {
      key: "blockerCount",
      label: "Blockers",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) > 0 ? "destructive" : "outline"}>{String(value)}</Badge>
      ),
    },
    {
      key: "warningCount",
      label: "Warnings",
      sortable: true,
      render: (value) => (
        <Badge variant={Number(value) > 0 ? "outline" : "secondary"}>{String(value)}</Badge>
      ),
    },
    {
      key: "workedMinutes",
      label: "Hours",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{helpers.formatMinutesAsDuration(row.workedMinutes)}</div>
          <div className="text-xs text-muted-foreground">
            Target {helpers.formatMinutesAsDuration(row.expectedMinutes)}
          </div>
        </div>
      ),
    },
  ];

  const timesheetTeamLeaveColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">{row.userEmail || "-"}</div>
          <div className="text-xs text-muted-foreground">
            Department: {row.department?.trim() || "No Department"}
          </div>
        </div>
      ),
    },
    {
      key: "availabilityLabel",
      label: "Availability",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant={getTimesheetLeaveAvailabilityBadgeVariant(row.availabilityLabel)}>
            {row.availabilityLabel}
          </Badge>
          <div className="text-xs text-muted-foreground">{row.availabilityDetail}</div>
        </div>
      ),
    },
    {
      key: "personalLeaveDays",
      label: "This Month Leave",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{formatLeaveDays(row.personalLeaveDays)} day(s)</div>
          <div className="text-xs text-muted-foreground">
            {row.leaveBlockCount === 0
              ? "No leave blocks"
              : row.leaveBlockCount === 1
                ? "1 leave block"
                : `${row.leaveBlockCount} leave blocks`}
          </div>
        </div>
      ),
    },
    {
      key: "leaveYearUsedDays",
      label: "Leave Balance",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            Used {formatLeaveDays(row.leaveYearUsedDays)} day(s)
          </div>
          <div className="text-xs text-muted-foreground">
            {row.leaveRemainingDays === null
              ? "Allowance not set"
              : `Remaining ${formatLeaveDays(row.leaveRemainingDays)} / ${formatLeaveDays(
                  row.leaveAvailableDays ?? 0
                )}`}
          </div>
        </div>
      ),
    },
    {
      key: "overrideLeaveDays",
      label: "Override Watch",
      sortable: true,
      filterable: true,
      render: (_value, row) =>
        row.hasLeaveOverride ? (
          <div className="space-y-1">
            <Badge variant="destructive">Override Used</Badge>
            <div className="text-xs text-muted-foreground">
              {formatLeaveDays(row.overrideLeaveDays)} day(s), {row.overrideLeaveBlockCount} block
              {row.overrideLeaveBlockCount === 1 ? "" : "s"}
            </div>
            <div className="text-xs text-muted-foreground">
              {row.latestOverrideDate
                ? `Latest ${formatPlannerDate(row.latestOverrideDate)}`
                : "Override date not captured"}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Badge variant="secondary">No Override</Badge>
            <div className="text-xs text-muted-foreground">Leave sat within balance and coverage rules.</div>
          </div>
        ),
    },
    {
      key: "leaveSummary",
      label: "Leave Types",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.leaveSummary}</div>
          <div className="text-xs text-muted-foreground">
            {row.sharedHolidayDays > 0
              ? `${row.sharedHolidayDays} shared holiday day(s) also apply`
              : "No shared holidays in this month"}
          </div>
        </div>
      ),
    },
    {
      key: "nextLeaveDate",
      label: "Next / Latest Leave",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1 text-xs">
          <div>
            Next: {row.nextLeaveDate ? formatPlannerDate(row.nextLeaveDate) : "-"}
          </div>
          <div className="text-muted-foreground">
            Latest: {row.lastLeaveDate ? formatPlannerDate(row.lastLeaveDate) : "-"}
          </div>
        </div>
      ),
    },
  ];

  const timesheetTeamLeaveOverrideColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">{row.userEmail || "-"}</div>
          <div className="text-xs text-muted-foreground">
            Department: {row.department?.trim() || "No Department"}
          </div>
        </div>
      ),
    },
    {
      key: "overrideLeaveDays",
      label: "Override Impact",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant="destructive">Override Used</Badge>
          <div className="text-sm font-medium">
            {formatLeaveDays(row.overrideLeaveDays)} day(s) across {row.overrideLeaveBlockCount} block
            {row.overrideLeaveBlockCount === 1 ? "" : "s"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.latestOverrideDate
              ? `Latest override ${formatPlannerDate(row.latestOverrideDate)}`
              : "Override date not captured"}
          </div>
        </div>
      ),
    },
    {
      key: "latestOverrideNote",
      label: "Override Note",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.latestOverrideNote?.trim() || "Override note not captured"}
          </div>
          <div className="text-xs text-muted-foreground">{row.availabilityDetail}</div>
        </div>
      ),
    },
    {
      key: "leaveYearUsedDays",
      label: "Leave Balance",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            Used {formatLeaveDays(row.leaveYearUsedDays)} day(s)
          </div>
          <div className="text-xs text-muted-foreground">
            {row.leaveRemainingDays === null
              ? "Allowance not set"
              : `Remaining ${formatLeaveDays(row.leaveRemainingDays)} / ${formatLeaveDays(
                  row.leaveAvailableDays ?? 0
                )}`}
          </div>
        </div>
      ),
    },
  ];

  const timesheetLeaveOverrideRegisterColumns: Column<any>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPlannerDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">{row.dateKey}</div>
        </div>
      ),
    },
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">{row.userEmail || "-"}</div>
          <div className="text-xs text-muted-foreground">
            Department: {row.department?.trim() || "No Department"}
          </div>
        </div>
      ),
    },
    {
      key: "leaveSummary",
      label: "Leave",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.leaveSummary || "Leave activity"}</div>
          <div className="text-xs text-muted-foreground">
            {Number(row.leavePortionPercent) === 50
              ? "Half day leave"
              : `${formatLeaveDays(row.leavePortionDays)} day(s)`}
          </div>
        </div>
      ),
    },
    {
      key: "overrideNote",
      label: "Override Note",
      render: (value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{String(value)}</div>
          <div className="text-xs text-muted-foreground">
            {row.sharedHolidayLabels.length > 0
              ? `Shared holiday overlap: ${row.sharedHolidayLabels.join(", ")}`
              : "No shared holiday overlap"}
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
          <Badge variant={row.reviewStatus === "reviewed" ? "secondary" : "destructive"}>
            {row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.reviewedAt
              ? `Reviewed ${formatPlannerDateTime(row.reviewedAt)}`
              : "Still waiting for admin review"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.reviewedByName?.trim()
              ? `By ${row.reviewedByName.trim()}`
              : row.reviewNote?.trim()
                ? row.reviewNote.trim()
                : "No review note yet"}
          </div>
        </div>
      ),
    },
    {
      key: "leaveRemainingDays",
      label: "Remaining Balance",
      sortable: true,
      render: (value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {value === null ? "Allowance not set" : `${formatLeaveDays(Number(value))} day(s)`}
          </div>
          <div className="text-xs text-muted-foreground">
            {getTimesheetWorkflowStatusLabel(row.workflowStatus)}
          </div>
        </div>
      ),
    },
  ];

  const timesheetDepartmentLeaveColumns: Column<any>[] = [
    {
      key: "departmentLabel",
      label: "Department",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.departmentLabel}</div>
          <div className="text-xs text-muted-foreground">
            {row.headcount} person{row.headcount === 1 ? "" : "s"} in this department
          </div>
        </div>
      ),
    },
    {
      key: "availabilityLabel",
      label: "Availability",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant={getTimesheetLeaveAvailabilityBadgeVariant(row.availabilityLabel)}>
            {row.availabilityLabel}
          </Badge>
          <div className="text-xs text-muted-foreground">{row.availabilityDetail}</div>
        </div>
      ),
    },
    {
      key: "peopleOnLeaveCount",
      label: "Today / Upcoming",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            Today {row.peopleOnLeaveCount} / Upcoming {row.upcomingLeaveCount}
          </div>
          <div className="text-xs text-muted-foreground">{row.coveragePercent}% of department off today</div>
        </div>
      ),
    },
    {
      key: "totalLeaveDays",
      label: "This Month Leave",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{formatLeaveDays(row.totalLeaveDays)} day(s)</div>
          <div className="text-xs text-muted-foreground">
            {row.peopleWithLeaveCount} person{row.peopleWithLeaveCount === 1 ? "" : "s"} with leave,{" "}
            {row.leaveBlockCount} block{row.leaveBlockCount === 1 ? "" : "s"}
          </div>
        </div>
      ),
    },
    {
      key: "averageRemainingDays",
      label: "Avg Remaining",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.averageRemainingDays === null
              ? "Allowance not set"
              : `${formatLeaveDays(row.averageRemainingDays)} day(s)`}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.nextLeaveDate ? `Next leave ${formatPlannerDate(row.nextLeaveDate)}` : "No next leave date"}
          </div>
        </div>
      ),
    },
    {
      key: "leaveTypes",
      label: "Leave Types",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.leaveTypes.length > 0 ? row.leaveTypes.join(", ") : "No leave types"}
          </div>
          <div className="text-xs text-muted-foreground">
            Lead person: {row.primaryUserName || "No person available"}
          </div>
        </div>
      ),
    },
  ];

  const timesheetDepartmentCoverageColumns: Column<any>[] = [
    {
      key: "date",
      label: "Date / Department",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPlannerDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">{row.departmentLabel}</div>
        </div>
      ),
    },
    {
      key: "severityLabel",
      label: "Risk",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant={getTimesheetLeaveCoverageBadgeVariant(row.severity)}>
            {row.severityLabel}
          </Badge>
          <div className="text-xs text-muted-foreground">{row.triggerLabel || row.detail}</div>
        </div>
      ),
    },
    {
      key: "coveragePercent",
      label: "Coverage",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.coveragePercent}%</div>
          <div className="text-xs text-muted-foreground">
            {row.peopleOnLeaveCount} of {row.headcount} off, {row.availableCount} available
          </div>
        </div>
      ),
    },
    {
      key: "ruleLabel",
      label: "Rule",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.ruleLabel}</div>
          <div className="text-xs text-muted-foreground">{row.detail}</div>
        </div>
      ),
    },
    {
      key: "usersOnLeave",
      label: "Who's Off",
      render: (_value, row) => (
        <div className="space-y-1 text-xs">
          {row.usersOnLeave.map((userRow: any) => (
            <div key={`${row.id}-${userRow.userId}`}>{userRow.userName}</div>
          ))}
        </div>
      ),
    },
    {
      key: "leaveTypes",
      label: "Leave Types",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.leaveTypes.length > 0 ? row.leaveTypes.join(", ") : "No leave types"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.sharedHolidayLabels.length > 0
              ? `Holiday overlap: ${row.sharedHolidayLabels.join(", ")}`
              : "No shared holiday overlap"}
          </div>
        </div>
      ),
    },
  ];

  const timesheetDepartmentCoverageRuleColumns: Column<any>[] = [
    {
      key: "department",
      label: "Department",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.department}</div>
          <div className="text-xs text-muted-foreground">
            {row.notes?.trim() || "No rule note added"}
          </div>
        </div>
      ),
    },
    {
      key: "minimumAvailableCount",
      label: "Min Available",
      sortable: true,
      render: (_value, row) => (
        <div className="text-sm font-medium">
          {row.minimumAvailableCount === null ? "Not set" : row.minimumAvailableCount}
        </div>
      ),
    },
    {
      key: "maximumPeopleOff",
      label: "Max Off",
      sortable: true,
      render: (_value, row) => (
        <div className="text-sm font-medium">
          {row.maximumPeopleOff === null ? "Not set" : row.maximumPeopleOff}
        </div>
      ),
    },
    {
      key: "mediumRiskPercent",
      label: "Thresholds",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            Watch {row.mediumRiskPercent}% / High {row.highRiskPercent}%
          </div>
          <div className="text-xs text-muted-foreground">
            Updated {formatPlannerDateTime(row.updatedAt)}
          </div>
        </div>
      ),
    },
  ];

  const timesheetTeamLeaveCalendarColumns: Column<any>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPlannerDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">
            {row.isToday ? "Today" : row.isWeekend ? "Weekend" : "Weekday"}
          </div>
        </div>
      ),
    },
    {
      key: "peopleOnLeaveCount",
      label: "Leave Load",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.peopleOnLeaveCount} person{row.peopleOnLeaveCount === 1 ? "" : "s"}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatLeaveDays(row.totalLeaveDays)} leave day(s) total
          </div>
        </div>
      ),
    },
    {
      key: "usersOnLeave",
      label: "Who's Off",
      render: (_value, row) => (
        <div className="space-y-1 text-xs">
          {row.usersOnLeave.length === 0 ? (
            <span className="text-muted-foreground">No personal leave</span>
          ) : (
            row.usersOnLeave.map((userRow: any) => (
              <div key={`${row.dateKey}-${userRow.userId}`}>{userRow.userName}</div>
            ))
          )}
        </div>
      ),
    },
    {
      key: "leaveTypes",
      label: "Leave Types",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.leaveTypes.length > 0 ? row.leaveTypes.join(", ") : "No personal leave"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.sharedHolidayCount > 0
              ? `${row.sharedHolidayCount} shared holiday entry${row.sharedHolidayCount === 1 ? "" : "ies"}`
              : "No shared holiday entries"}
          </div>
        </div>
      ),
    },
    {
      key: "sharedHolidayLabels",
      label: "Shared Holidays",
      render: (_value, row) => (
        <div className="space-y-1">
          {row.sharedHolidayLabels.length === 0 ? (
            <span className="text-xs text-muted-foreground">None</span>
          ) : (
            row.sharedHolidayLabels.map((label: string) => (
              <Badge key={`${row.dateKey}-${label}`} variant="outline" className="mr-1">
                {label}
              </Badge>
            ))
          )}
        </div>
      ),
    },
  ];

  const timesheetTeamLeaveCoverageColumns: Column<any>[] = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPlannerDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">{row.detail}</div>
        </div>
      ),
    },
    {
      key: "severityLabel",
      label: "Risk",
      sortable: true,
      filterable: true,
      render: (_value, row) => (
        <Badge variant={getTimesheetLeaveCoverageBadgeVariant(row.severity)}>
          {row.severityLabel}
        </Badge>
      ),
    },
    {
      key: "coveragePercent",
      label: "Coverage",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.coveragePercent}%</div>
          <div className="text-xs text-muted-foreground">
            {row.peopleOnLeaveCount} person{row.peopleOnLeaveCount === 1 ? "" : "s"} off
          </div>
        </div>
      ),
    },
    {
      key: "usersOnLeave",
      label: "Affected Team",
      render: (_value, row) => (
        <div className="space-y-1 text-xs">
          {row.usersOnLeave.map((userRow: any) => (
            <div key={`${row.dateKey}-${userRow.userId}`}>{userRow.userName}</div>
          ))}
        </div>
      ),
    },
    {
      key: "sharedHolidayLabels",
      label: "Overlap",
      render: (_value, row) => (
        <div className="space-y-1 text-xs">
          {row.sharedHolidayLabels.length > 0 ? (
            row.sharedHolidayLabels.map((label: string) => (
              <Badge key={`${row.dateKey}-${label}`} variant="outline" className="mr-1">
                {label}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">No shared holiday overlap</span>
          )}
        </div>
      ),
    },
  ];

  const timesheetLeaveOverrideQueueColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">{row.userEmail || "-"}</div>
          <div className="text-xs text-muted-foreground">
            Department: {row.department?.trim() || "No Department"}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      label: "Leave Date",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{formatPlannerDate(row.date)}</div>
          <div className="text-xs text-muted-foreground">
            Logged {row.loggedAt ? formatPlannerDateTime(row.loggedAt) : "date not captured"}
          </div>
        </div>
      ),
    },
    {
      key: "waitingDays",
      label: "Waiting",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant={row.priority === "high" ? "destructive" : "outline"}>
            {row.statusLabel}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.waitingDays} day{row.waitingDays === 1 ? "" : "s"} since it was logged
          </div>
        </div>
      ),
    },
    {
      key: "leaveSummary",
      label: "Override Context",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.leaveSummary || "Override leave"}</div>
          <div className="text-xs text-muted-foreground">
            {Number(row.leavePortionPercent) === 50
              ? "Half day leave"
              : `${formatLeaveDays(row.leavePortionDays)} day(s)`}
            {row.sharedHolidayLabels.length > 0
              ? `, holiday overlap: ${row.sharedHolidayLabels.join(", ")}`
              : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.leaveRemainingDays === null
              ? "Allowance not set"
              : `Remaining balance ${formatLeaveDays(row.leaveRemainingDays)}`}
          </div>
        </div>
      ),
    },
    {
      key: "overrideNote",
      label: "Override Note",
      render: (value) => <div className="max-w-md text-sm text-muted-foreground">{String(value)}</div>,
    },
  ];

  const timesheetLeaveOverrideBlockColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">
            {row.department?.trim() || "No Department"}
          </div>
        </div>
      ),
    },
    {
      key: "startDate",
      label: "Period",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {formatPlannerDateRange(row.startDate, row.endDate)}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.entryDates.length} override day{row.entryDates.length === 1 ? "" : "s"} across{" "}
            {row.spanDays} calendar day{row.spanDays === 1 ? "" : "s"}
          </div>
        </div>
      ),
    },
    {
      key: "waitingDays",
      label: "Waiting",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant={row.priority === "high" ? "destructive" : "outline"}>
            {row.statusLabel}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.waitingDays} day{row.waitingDays === 1 ? "" : "s"} since the oldest pending day was logged
          </div>
        </div>
      ),
    },
    {
      key: "pendingReviewCount",
      label: "Review Progress",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {row.pendingReviewCount} pending / {row.reviewedCount} reviewed
          </div>
          <div className="text-xs text-muted-foreground">
            {Number(row.leavePortionPercent) === 50
              ? "Half day leave block"
              : `${formatLeaveDays(row.usedDays)} total leave day(s)`}
            {row.sharedHolidayGapDays > 0
              ? `, ${row.sharedHolidayGapDays} shared holiday gap day${row.sharedHolidayGapDays === 1 ? "" : "s"}`
              : ""}
          </div>
        </div>
      ),
    },
    {
      key: "overrideNote",
      label: "Override Context",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.leaveSummary || "Override leave block"}</div>
          <div className="max-w-md text-xs text-muted-foreground">{row.overrideNote}</div>
        </div>
      ),
    },
  ];

  const timesheetReviewedLeaveOverrideBlockColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.userName}</div>
          <div className="text-xs text-muted-foreground">
            {row.department?.trim() || "No Department"}
          </div>
        </div>
      ),
    },
    {
      key: "startDate",
      label: "Period",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {formatPlannerDateRange(row.startDate, row.endDate)}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.entryDates.length} override day{row.entryDates.length === 1 ? "" : "s"} across{" "}
            {row.spanDays} calendar day{row.spanDays === 1 ? "" : "s"}
          </div>
        </div>
      ),
    },
    {
      key: "latestReviewedAt",
      label: "Reviewed",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant="secondary">Reviewed</Badge>
          <div className="text-xs text-muted-foreground">
            {row.latestReviewedAt ? formatPlannerDateTime(row.latestReviewedAt) : "-"}
          </div>
          <div className="text-xs text-muted-foreground">
            {row.latestReviewedByName?.trim()
              ? `By ${row.latestReviewedByName.trim()}`
              : "Reviewer not captured"}
          </div>
        </div>
      ),
    },
    {
      key: "leaveSummary",
      label: "Review Context",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.leaveSummary || "Override leave block"}</div>
          <div className="text-xs text-muted-foreground">
            {Number(row.leavePortionPercent) === 50
              ? "Half day leave block"
              : `${formatLeaveDays(row.usedDays)} total leave day(s)`}
          </div>
          <div className="max-w-md text-xs text-muted-foreground">
            {row.latestReviewNote?.trim() || row.overrideNote}
          </div>
        </div>
      ),
    },
    {
      key: "leaveRemainingDays",
      label: "Remaining Balance",
      sortable: true,
      render: (value) => (
        <div className="text-sm">
          {value === null ? "Allowance not set" : `${formatLeaveDays(Number(value))} day(s)`}
        </div>
      ),
    },
  ];

  return {
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
  };
}
