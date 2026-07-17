import type { Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";

export function buildPlannerTimesheetAdminQueueColumns(helpers: any) {
  const { formatMinutesAsDuration, formatPlannerDateTime } = helpers;

  const timesheetReviewQueueColumns: Column<any>[] = [
    {
      key: "userName",
      label: "User",
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
      render: (_value, row) => {
        const parsedMonth = new Date(row.monthDate);
        return Number.isNaN(parsedMonth.getTime())
          ? "-"
          : parsedMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
      },
    },
    {
      key: "submittedAt",
      label: "Submitted",
      render: (_value, row) =>
        row.submittedAt
          ? formatPlannerDateTime(row.submittedAt)
          : row.lockedAt
            ? formatPlannerDateTime(row.lockedAt)
            : "-",
    },
    {
      key: "employeeDeclarationAccepted",
      label: "Declaration",
      sortable: true,
      render: (_value, row) => (
        <Badge variant={row.employeeDeclarationAccepted ? "secondary" : "destructive"}>
          {row.employeeDeclarationAccepted ? "Confirmed" : "Missing"}
        </Badge>
      ),
    },
    {
      key: "blockerCount",
      label: "Readiness",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge
            variant={row.blockerCount > 0 ? "destructive" : row.warningCount > 0 ? "outline" : "secondary"}
          >
            {row.blockerCount > 0
              ? `${row.blockerCount} blocker${row.blockerCount === 1 ? "" : "s"}`
              : row.warningCount > 0
                ? `${row.warningCount} warning${row.warningCount === 1 ? "" : "s"}`
                : "Ready"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.blockerCount > 0
              ? "Fix blockers before approval"
              : row.warningCount > 0
                ? "Admin acknowledgement needed"
                : "No outstanding review issues"}
          </div>
        </div>
      ),
    },
    {
      key: "waitingDays",
      label: "Waiting",
      sortable: true,
      render: (_value, row) => (
        <Badge variant={(row.waitingDays ?? 0) >= 2 ? "destructive" : "outline"}>
          {row.waitingDays === null ? "-" : `${row.waitingDays} day${row.waitingDays === 1 ? "" : "s"}`}
        </Badge>
      ),
    },
    {
      key: "statusNote",
      label: "Submitted Note",
      render: (_value, row) => row.submissionNote?.trim() || "-",
    },
  ];

  const timesheetApprovedColumns: Column<any>[] = [
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
      key: "reviewedAt",
      label: "Approved",
      sortable: true,
      render: (_value, row) => (row.reviewedAt ? formatPlannerDateTime(row.reviewedAt) : "-"),
    },
    {
      key: "approvedAgeDays",
      label: "Age",
      sortable: true,
      render: (_value, row) =>
        row.approvedAgeDays === null ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          <Badge variant="secondary">
            {row.approvedAgeDays} day{row.approvedAgeDays === 1 ? "" : "s"}
          </Badge>
        ),
    },
    {
      key: "workflowStatus",
      label: "Handoff",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant={row.workflowStatus === "handed_off" ? "secondary" : "outline"}>
            {row.workflowStatus === "handed_off" ? "Handed Off" : "Pending Handoff"}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {row.workflowStatus === "handed_off"
              ? row.handedOffAt
                ? `On ${formatPlannerDateTime(row.handedOffAt)}`
                : "Recorded as handed off"
              : "Still waiting for payroll or admin handoff"}
          </div>
        </div>
      ),
    },
    {
      key: "workedMinutes",
      label: "Worked",
      sortable: true,
      render: (_value, row) => formatMinutesAsDuration(row.workedMinutes),
    },
    {
      key: "expectedMinutes",
      label: "Target",
      sortable: true,
      render: (_value, row) => formatMinutesAsDuration(row.expectedMinutes),
    },
    {
      key: "warningCount",
      label: "Warnings",
      sortable: true,
      render: (_value, row) => (
        <Badge variant={row.warningCount > 0 ? "outline" : "secondary"}>{row.warningCount}</Badge>
      ),
    },
  ];

  return {
    timesheetApprovedColumns,
    timesheetReviewQueueColumns,
  };
}
