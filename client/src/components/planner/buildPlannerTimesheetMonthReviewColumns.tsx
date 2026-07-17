import type { Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";

export function buildPlannerTimesheetMonthReviewColumns(helpers: any) {
  const {
    formatMinutesAsDuration,
    formatVarianceMinutes,
    formatPlannerDateTime,
    getTimesheetAttentionBadgeVariant,
  } = helpers;

  const timesheetRegisterColumns: Column<any>[] = [
    {
      key: "dayLabel",
      label: "Date",
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="font-medium">{row.dayLabel}</div>
          {row.isHoliday && row.holidayLabel ? <Badge variant="outline">{row.holidayLabel}</Badge> : null}
        </div>
      ),
    },
    {
      key: "checkedCount",
      label: "Selected",
      sortable: true,
      render: (_value, row) => (
        <Badge variant={row.checkedCount > 0 ? "secondary" : "outline"}>{row.checkedCount}</Badge>
      ),
    },
    {
      key: "comparisonStatus",
      label: "Vs Prev",
      sortable: true,
      render: (_value, row) => {
        const variant =
          row.comparisonStatus === "changed" || row.comparisonStatus === "missing"
            ? "destructive"
            : row.comparisonStatus === "new"
              ? "secondary"
              : "outline";
        const label =
          row.comparisonStatus === "same"
            ? "Same"
            : row.comparisonStatus === "changed"
              ? "Changed"
              : row.comparisonStatus === "new"
                ? "New"
                : row.comparisonStatus === "missing"
                  ? "Missing"
                  : "None";
        return (
          <div className="space-y-1">
            <Badge variant={variant}>{label}</Badge>
            <div className="text-xs text-muted-foreground">{row.comparisonDetail}</div>
          </div>
        );
      },
    },
    {
      key: "startTime",
      label: "Start",
      sortable: true,
      render: (value) =>
        String(value || "").trim() ? <span>{String(value)}</span> : <span className="text-sm text-muted-foreground">-</span>,
    },
    {
      key: "endTime",
      label: "End",
      sortable: true,
      render: (value) =>
        String(value || "").trim() ? <span>{String(value)}</span> : <span className="text-sm text-muted-foreground">-</span>,
    },
    {
      key: "lunchBreakMinutes",
      label: "Lunch",
      sortable: true,
      render: (value) => `${Number(value || 0)} min`,
    },
    {
      key: "teaBreakMinutes",
      label: "Tea",
      sortable: true,
      render: (value) => `${Number(value || 0)} min`,
    },
    {
      key: "workedMinutes",
      label: "Net Hours",
      sortable: true,
      render: (value, row) =>
        row.workedMinutes === null ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          <span>{formatMinutesAsDuration(Number(value))}</span>
        ),
    },
    {
      key: "varianceMinutes",
      label: "Variance",
      sortable: true,
      render: (value, row) =>
        row.varianceMinutes === null ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          <span
            className={
              row.varianceMinutes > 0
                ? "text-emerald-700"
                : row.varianceMinutes < 0
                  ? "text-amber-700"
                  : "text-muted-foreground"
            }
          >
            {formatVarianceMinutes(Number(value))}
          </span>
        ),
    },
    {
      key: "checkedOptions",
      label: "Activities",
      render: (_value, row) =>
        row.checkedOptions.length === 0 ? (
          row.isHoliday && row.holidayLabel ? (
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{row.holidayLabel}</Badge>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">None logged</span>
          )
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.checkedOptions.map((option: any) => (
              <Badge key={`timesheet-row-option-${row.dateKey}-${option.id}`} variant="outline">
                {option.label}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "remarks",
      label: "Remarks",
      render: (value) =>
        String(value || "").trim() ? <span>{String(value)}</span> : <span className="text-sm text-muted-foreground">No remarks</span>,
    },
  ];

  const timesheetSummaryColumns: Column<any>[] = [
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
      key: "usedDays",
      label: "Days Used",
      sortable: true,
      render: (value) => <Badge variant={Number(value) > 0 ? "secondary" : "outline"}>{String(value)}</Badge>,
    },
  ];

  const timesheetTeamAttentionColumns: Column<any>[] = [
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
      key: "monthDate",
      label: "Month",
      sortable: true,
      render: (_value, row) => {
        const parsedMonth = new Date(row.monthDate);
        return Number.isNaN(parsedMonth.getTime())
          ? "-"
          : parsedMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
      },
    },
    {
      key: "statusLabel",
      label: "Attention",
      sortable: true,
      filterable: true,
      render: (_value, row) => {
        const variant =
          row.priority === "high" ? "destructive" : row.priority === "medium" ? "outline" : "secondary";
        return (
          <div className="space-y-1">
            <Badge variant={variant}>{row.statusLabel}</Badge>
            <div className="text-xs text-muted-foreground">{row.detail}</div>
          </div>
        );
      },
    },
    {
      key: "waitingDays",
      label: "Age",
      sortable: true,
      render: (_value, row) =>
        row.waitingDays === null ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          <Badge variant={row.waitingDays >= 2 ? "destructive" : "outline"}>
            {row.waitingDays} day{row.waitingDays === 1 ? "" : "s"}
          </Badge>
        ),
    },
    {
      key: "submittedAt",
      label: "Updated",
      sortable: true,
      render: (_value, row) => (row.submittedAt ? formatPlannerDateTime(row.submittedAt) : "-"),
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
    timesheetRegisterColumns,
    timesheetSummaryColumns,
    timesheetTeamAttentionColumns,
  };
}
