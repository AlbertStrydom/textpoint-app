import {
  buildPlannerTimesheetDepartmentCoverageSummary,
  buildPlannerTimesheetDepartmentLeaveSummary,
  buildPlannerTimesheetLeaveOverrideBlockSummary,
  buildPlannerTimesheetLeaveOverrideRegisterSummary,
  buildPlannerTimesheetTeamLeaveSummary,
} from "@/components/planner/buildPlannerTimesheetAdminSummaries";

let xlsxModulePromise: Promise<typeof import("xlsx")> | null = null;

function loadXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

type ApprovedTimesheetRow = {
  userName: string;
  userEmail: string | null;
  monthDate: string | Date;
  workflowStatus: string;
  reviewedAt: string | Date | null;
  handedOffAt: string | Date | null;
  handedOffByName: string | null;
  approvedAgeDays: number | null;
  workedMinutes: number;
  expectedMinutes: number;
  warningCount: number;
  dueWorkingDays: number;
  completionPercent: number;
  completedWorkingDays: number;
};

type HandedOffTimesheetRow = {
  userName: string;
  userEmail: string | null;
  monthDate: string | Date;
  reviewedAt: string | Date | null;
  handedOffAt: string | Date | null;
  handedOffByName: string | null;
  handoffNote: string | null;
  workedMinutes: number;
  expectedMinutes: number;
};

type PlannerExportHelpers = {
  formatMinutesAsDuration: (minutes: number) => string;
  formatLeaveDays: (value: number) => string;
  formatPlannerDate: (date: Date | string) => string;
  formatPlannerDateTime: (date: Date | string) => string;
  formatVarianceMinutes: (minutes: number) => string;
};

type ExportActor = {
  name?: string | null;
  email?: string | null;
};

type ApprovedPackArgs = {
  currentDate: Date;
  helpers: PlannerExportHelpers;
  pendingHandoffRows: ApprovedTimesheetRow[];
  approvedRows: ApprovedTimesheetRow[];
  user: ExportActor | null | undefined;
};

type HandedOffPackArgs = {
  currentDate: Date;
  handedOffRows: HandedOffTimesheetRow[];
  helpers: PlannerExportHelpers;
  user: ExportActor | null | undefined;
};

type AnyPlannerRow = Record<string, any>;

type TeamTimesheetExportArgs = {
  currentDate: Date;
  user: ExportActor | null | undefined;
  helpers: PlannerExportHelpers;
  getTimesheetWorkflowStatusLabel: (status: string) => string;
  timesheetTeamSummary: AnyPlannerRow;
  timesheetOverviewRows: AnyPlannerRow[];
  timesheetTeamLeaveRows: AnyPlannerRow[];
  timesheetTeamLeaveOverrideRows: AnyPlannerRow[];
  timesheetLeaveOverrideRegisterRows: AnyPlannerRow[];
  timesheetPendingLeaveOverrideQueueRows: AnyPlannerRow[];
  timesheetPendingLeaveOverrideBlockQueueRows: AnyPlannerRow[];
  timesheetLeaveOverrideBlockRows: AnyPlannerRow[];
  timesheetReviewedLeaveOverrideBlockRows: AnyPlannerRow[];
  timesheetDepartmentLeaveRows: AnyPlannerRow[];
  timesheetDepartmentCoverageRows: AnyPlannerRow[];
  typedTimesheetDepartmentCoverageSettings: AnyPlannerRow[];
  timesheetTeamLeaveCalendarRows: AnyPlannerRow[];
  timesheetTeamLeaveCoverageRows: AnyPlannerRow[];
  timesheetReviewQueueRows: AnyPlannerRow[];
  timesheetApprovedRows: AnyPlannerRow[];
};

type TeamLeaveOverviewExportArgs = {
  currentDate: Date;
  user: ExportActor | null | undefined;
  helpers: PlannerExportHelpers;
  getTimesheetWorkflowStatusLabel: (status: string) => string;
  timesheetTeamLeaveRows: AnyPlannerRow[];
  timesheetTeamLeaveOverrideRows: AnyPlannerRow[];
  timesheetLeaveOverrideRegisterRows: AnyPlannerRow[];
  timesheetPendingLeaveOverrideQueueRows: AnyPlannerRow[];
  timesheetPendingLeaveOverrideBlockQueueRows: AnyPlannerRow[];
  timesheetLeaveOverrideBlockRows: AnyPlannerRow[];
  timesheetReviewedLeaveOverrideBlockRows: AnyPlannerRow[];
  timesheetDepartmentLeaveRows: AnyPlannerRow[];
  timesheetDepartmentCoverageRows: AnyPlannerRow[];
  typedTimesheetDepartmentCoverageSettings: AnyPlannerRow[];
  timesheetTeamLeaveCalendarRows: AnyPlannerRow[];
  timesheetTeamLeaveCoverageRows: AnyPlannerRow[];
};

type PersonalTimesheetExportArgs = {
  currentDate: Date;
  user: ExportActor | null | undefined;
  helpers: PlannerExportHelpers;
  typedTimesheetProfile: AnyPlannerRow | null | undefined;
  activeTimesheetOptions: AnyPlannerRow[];
  timesheetMonthRows: AnyPlannerRow[];
  timesheetSummary: AnyPlannerRow;
  typedTimesheetOptions: AnyPlannerRow[];
  typedTimesheetHolidays: AnyPlannerRow[];
  getTimesheetHolidayTypeLabel: (type: string) => string;
  timesheetWeekRows: AnyPlannerRow[];
  timesheetAttentionRows: AnyPlannerRow[];
  leaveYearRange: AnyPlannerRow;
  getMonthLabel: (month: number) => string;
  timesheetPersonalLeaveAllowanceDays: number | null;
  timesheetPersonalLeaveCarryOverDays: number;
  timesheetPersonalLeaveAvailableDays: number | null;
  timesheetPersonalLeaveYearUsedDays: number;
  timesheetPersonalLeaveUsedDays: number;
  timesheetPersonalLeaveRemainingDays: number | null;
  timesheetPersonalLeaveOverrideSummary: AnyPlannerRow;
  timesheetPersonalLeaveRows: AnyPlannerRow[];
  timesheetPersonalLeaveBreakdownRows: AnyPlannerRow[];
  timesheetPersonalLeaveBlocks: AnyPlannerRow[];
  typedTimesheetUserLeaveOverrideBlockRows: AnyPlannerRow[];
  timesheetAttentionByDateKey: Map<string, AnyPlannerRow[]>;
  getTimesheetAvailabilityLabel: (row: AnyPlannerRow, hasAttention: boolean) => string;
  holidayByDateKey: Map<string, AnyPlannerRow>;
  timesheetMonthStatusLabel: string;
  currentMonthTimesheetHolidays: AnyPlannerRow[];
  timesheetSubmissionBlockers: AnyPlannerRow[];
  timesheetSubmissionWarnings: AnyPlannerRow[];
  timesheetCompletionSummary: AnyPlannerRow;
  typedTimesheetMonthStatus: AnyPlannerRow | null | undefined;
  typedTimesheetHistory: AnyPlannerRow[];
  timesheetOwnerName: string;
  plannerTimesheetDeclarationText: string;
  plannerTimesheetReviewerDeclarationText: string;
  timesheetMonthComparison: AnyPlannerRow;
  timesheetDayComparisonSummary: AnyPlannerRow;
  previousTimesheetSummary: AnyPlannerRow;
  previousTimesheetEntriesByDayNumber: Map<number, AnyPlannerRow>;
  getNetWorkedMinutes: (
    startTime: string | null | undefined,
    endTime: string | null | undefined,
    lunchBreakMinutes: number | null | undefined,
    teaBreakMinutes: number | null | undefined
  ) => number | null;
};

export async function exportApprovedTimesheetPack({
  currentDate,
  helpers,
  pendingHandoffRows,
  approvedRows,
  user,
}: ApprovedPackArgs) {
  const XLSX = await loadXlsxModule();
  const monthLabel = currentDate.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const summaryRows: (string | number)[][] = [
    ["Approved Timesheet Pack"],
    [],
    ["Month", monthLabel],
    ["Pending Handoff", pendingHandoffRows.length],
    ["Handed Off Months", approvedRows.length - pendingHandoffRows.length],
    [
      "Total Worked Hours",
      helpers.formatMinutesAsDuration(
        approvedRows.reduce((total, row) => total + row.workedMinutes, 0)
      ),
    ],
    [
      "Total Target Hours",
      helpers.formatMinutesAsDuration(
        approvedRows.reduce((total, row) => total + row.expectedMinutes, 0)
      ),
    ],
    ["Exported At", helpers.formatPlannerDateTime(new Date())],
    ["Exported By", user?.name?.trim() || user?.email?.trim() || "TextPoint Admin"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 42 }];

  const approvedSheetRows: (string | number)[][] = [
    ["Approved Timesheet Handoff Queue"],
    [],
    [
      "User",
      "Email",
      "Month",
      "Handoff Status",
      "Approved",
      "Handed Off",
      "Handed Off By",
      "Approved Age",
      "Worked Hours",
      "Target Hours",
      "Variance",
      "Warnings",
      "Completion",
    ],
    ...approvedRows.map((row) => [
      row.userName,
      row.userEmail || "",
      helpers.formatPlannerDate(row.monthDate),
      row.workflowStatus === "handed_off" ? "Handed Off" : "Pending Handoff",
      row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
      row.handedOffAt ? helpers.formatPlannerDateTime(row.handedOffAt) : "",
      row.handedOffByName?.trim() || "",
      row.approvedAgeDays === null
        ? ""
        : `${row.approvedAgeDays} day${row.approvedAgeDays === 1 ? "" : "s"}`,
      helpers.formatMinutesAsDuration(row.workedMinutes),
      helpers.formatMinutesAsDuration(row.expectedMinutes),
      helpers.formatVarianceMinutes(row.workedMinutes - row.expectedMinutes),
      row.warningCount,
      row.dueWorkingDays > 0
        ? `${row.completionPercent}% (${row.completedWorkingDays}/${row.dueWorkingDays})`
        : "Not due yet",
    ]),
  ];
  const approvedSheet = XLSX.utils.aoa_to_sheet(approvedSheetRows);
  approvedSheet["!cols"] = [
    { wch: 24 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Approved Summary");
  XLSX.utils.book_append_sheet(workbook, approvedSheet, "Approved Queue");
  const stamp = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `textpoint-approved-timesheets-${stamp}.xlsx`);
}

export async function exportHandedOffTimesheetPack({
  currentDate,
  handedOffRows,
  helpers,
  user,
}: HandedOffPackArgs) {
  const XLSX = await loadXlsxModule();
  const monthLabel = currentDate.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const summaryRows: (string | number)[][] = [
    ["Handed Off Timesheet Pack"],
    [],
    ["Month", monthLabel],
    ["Handed Off Months", handedOffRows.length],
    [
      "Total Worked Hours",
      helpers.formatMinutesAsDuration(
        handedOffRows.reduce((total, row) => total + row.workedMinutes, 0)
      ),
    ],
    [
      "Total Target Hours",
      helpers.formatMinutesAsDuration(
        handedOffRows.reduce((total, row) => total + row.expectedMinutes, 0)
      ),
    ],
    ["Exported At", helpers.formatPlannerDateTime(new Date())],
    ["Exported By", user?.name?.trim() || user?.email?.trim() || "TextPoint Admin"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 42 }];

  const handedOffSheetRows: (string | number)[][] = [
    ["Handed Off Timesheet Archive"],
    [],
    [
      "User",
      "Email",
      "Month",
      "Approved",
      "Handed Off",
      "Handed Off By",
      "Handoff Note",
      "Worked Hours",
      "Target Hours",
      "Variance",
    ],
    ...handedOffRows.map((row) => [
      row.userName,
      row.userEmail || "",
      helpers.formatPlannerDate(row.monthDate),
      row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
      row.handedOffAt ? helpers.formatPlannerDateTime(row.handedOffAt) : "",
      row.handedOffByName?.trim() || "",
      row.handoffNote?.trim() || "",
      helpers.formatMinutesAsDuration(row.workedMinutes),
      helpers.formatMinutesAsDuration(row.expectedMinutes),
      helpers.formatVarianceMinutes(row.workedMinutes - row.expectedMinutes),
    ]),
  ];
  const handedOffSheet = XLSX.utils.aoa_to_sheet(handedOffSheetRows);
  handedOffSheet["!cols"] = [
    { wch: 24 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 48 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Handed Off Summary");
  XLSX.utils.book_append_sheet(workbook, handedOffSheet, "Handed Off Queue");
  const stamp = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `textpoint-handed-off-timesheets-${stamp}.xlsx`);
}

export async function exportTeamTimesheetMonth(args: TeamTimesheetExportArgs) {
  const {
    currentDate,
    user,
    helpers,
    getTimesheetWorkflowStatusLabel,
    timesheetTeamSummary,
    timesheetOverviewRows,
    timesheetTeamLeaveRows,
    timesheetTeamLeaveOverrideRows,
    timesheetLeaveOverrideRegisterRows,
    timesheetPendingLeaveOverrideQueueRows,
    timesheetPendingLeaveOverrideBlockQueueRows,
    timesheetLeaveOverrideBlockRows,
    timesheetReviewedLeaveOverrideBlockRows,
    timesheetDepartmentLeaveRows,
    timesheetDepartmentCoverageRows,
    typedTimesheetDepartmentCoverageSettings,
    timesheetTeamLeaveCalendarRows,
    timesheetTeamLeaveCoverageRows,
    timesheetReviewQueueRows,
    timesheetApprovedRows,
  } = args;
  const timesheetTeamLeaveSummary = buildPlannerTimesheetTeamLeaveSummary(timesheetTeamLeaveRows);
  const timesheetLeaveOverrideRegisterSummary = buildPlannerTimesheetLeaveOverrideRegisterSummary(
    timesheetLeaveOverrideRegisterRows,
    timesheetPendingLeaveOverrideQueueRows
  );
  const timesheetDepartmentLeaveSummary =
    buildPlannerTimesheetDepartmentLeaveSummary(timesheetDepartmentLeaveRows);
  const timesheetLeaveOverrideBlockSummary = buildPlannerTimesheetLeaveOverrideBlockSummary(
    timesheetLeaveOverrideBlockRows,
    timesheetPendingLeaveOverrideBlockQueueRows
  );
  const timesheetDepartmentCoverageSummary = buildPlannerTimesheetDepartmentCoverageSummary(
    timesheetDepartmentCoverageRows,
    typedTimesheetDepartmentCoverageSettings
  );
  const XLSX = await loadXlsxModule();
  const monthLabel = currentDate.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
  const summaryRows: (string | number)[][] = [
    ["Team Timesheet Summary"],
    [],
    ["Month", monthLabel],
    ["Submitted For Review", timesheetTeamSummary.submittedCount],
    ["Overdue Review", timesheetTeamSummary.overdueReviewCount],
    ["Blocked Months", timesheetTeamSummary.blockedCount],
    ["Warnings Only", timesheetTeamSummary.warningsOnlyCount],
    ["Returned For Changes", timesheetTeamSummary.returnedCount],
    ["Pending Handoff", timesheetTeamSummary.approvedCount],
    ["Handed Off Months", timesheetTeamSummary.handedOffCount],
    ["Exported At", helpers.formatPlannerDateTime(new Date())],
    ["Exported By", user?.name?.trim() || user?.email?.trim() || "TextPoint Admin"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 42 }];

  const overviewRows: (string | number)[][] = [
    ["Team Timesheet Overview"],
    [],
    ["User", "Email", "Workflow Status", "Attention", "Attention Detail", "Completion", "Blockers", "Warnings", "Worked Hours", "Target Hours", "Variance", "Submitted At", "Reviewed At", "Last Updated"],
    ...timesheetOverviewRows.map((row) => [
      row.userName,
      row.userEmail || "",
      getTimesheetWorkflowStatusLabel(row.workflowStatus),
      row.attentionLabel,
      row.attentionDetail,
      row.dueWorkingDays > 0 ? `${row.completionPercent}% (${row.completedWorkingDays}/${row.dueWorkingDays})` : "Not due yet",
      row.blockerCount,
      row.warningCount,
      helpers.formatMinutesAsDuration(row.workedMinutes),
      helpers.formatMinutesAsDuration(row.expectedMinutes),
      helpers.formatVarianceMinutes(row.workedMinutes - row.expectedMinutes),
      row.submittedAt ? helpers.formatPlannerDateTime(row.submittedAt) : "",
      row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
      row.lastEntryAt ? helpers.formatPlannerDateTime(row.lastEntryAt) : "",
    ]),
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  overviewSheet["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 50 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

  const teamLeaveRows: (string | number)[][] = [
    ["Team Leave & Availability"],
    [],
    ["Month", monthLabel],
    ["Team Leave Days", helpers.formatLeaveDays(timesheetTeamLeaveSummary.teamLeaveDays)],
    ["Override Leave Days", helpers.formatLeaveDays(timesheetTeamLeaveSummary.overrideLeaveDays)],
    ["Override Entries", timesheetLeaveOverrideRegisterSummary.overrideEntryCount],
    ["Half-Day Overrides", timesheetLeaveOverrideRegisterSummary.halfDayOverrideCount],
    ["Pending Override Review", timesheetLeaveOverrideRegisterSummary.pendingReviewCount],
    ["Reviewed Overrides", timesheetLeaveOverrideRegisterSummary.reviewedCount],
    ["People On Leave Today", timesheetTeamLeaveSummary.peopleOnLeaveCount],
    ["Upcoming Leave", timesheetTeamLeaveSummary.upcomingLeaveCount],
    ["People With Leave This Month", timesheetTeamLeaveSummary.peopleWithLeaveCount],
    ["People With Overrides", timesheetTeamLeaveSummary.peopleWithOverrideCount],
    ["Override Leave Blocks", timesheetTeamLeaveSummary.overrideLeaveBlockCount],
    ["Holiday Overlap Overrides", timesheetLeaveOverrideRegisterSummary.holidayOverlapCount],
    ["Shared Holiday Days", timesheetTeamLeaveSummary.sharedHolidayDays],
    ["Departments With Leave", timesheetDepartmentLeaveSummary.departmentsWithLeave],
    ["Departments On Leave Today", timesheetDepartmentLeaveSummary.departmentsOnLeaveToday],
    ["Peak Department Coverage", `${timesheetDepartmentLeaveSummary.peakCoveragePercent}% (${timesheetDepartmentLeaveSummary.peakCoverageDepartment})`],
    [],
    ["User", "Department", "Email", "Workflow Status", "Availability", "Detail", "This Month Leave Days", "Leave Blocks", "Override Leave Days", "Override Blocks", "Latest Override Date", "Latest Override Note", "Review Status", "Reviewed At", "Reviewed By", "Review Note", "Leave Types", "Next Leave", "Latest Leave", "YTD Used", "Remaining", "Shared Holidays"],
    ...timesheetTeamLeaveRows.map((row) => [
      row.userName,
      row.department?.trim() || "No Department",
      row.userEmail || "",
      getTimesheetWorkflowStatusLabel(row.workflowStatus),
      row.availabilityLabel,
      row.availabilityDetail,
      helpers.formatLeaveDays(row.personalLeaveDays),
      row.leaveBlockCount,
      row.hasLeaveOverride ? helpers.formatLeaveDays(row.overrideLeaveDays) : "",
      row.hasLeaveOverride ? row.overrideLeaveBlockCount : "",
      row.latestOverrideDate ? helpers.formatPlannerDate(row.latestOverrideDate) : "",
      row.latestOverrideNote || "",
      row.hasLeaveOverride ? (row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review") : "",
      row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
      row.reviewedByName || "",
      row.reviewNote || "",
      row.leaveSummary,
      row.nextLeaveDate ? helpers.formatPlannerDate(row.nextLeaveDate) : "",
      row.lastLeaveDate ? helpers.formatPlannerDate(row.lastLeaveDate) : "",
      helpers.formatLeaveDays(row.leaveYearUsedDays),
      row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
      row.sharedHolidayDays,
    ]),
  ];
  const teamLeaveSheet = XLSX.utils.aoa_to_sheet(teamLeaveRows);
  teamLeaveSheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 48 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 42 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

  const teamLeaveOverrideRows: (string | number)[][] = [
    ["Leave Override Watch"], [], ["Month", monthLabel], ["People With Overrides", timesheetTeamLeaveSummary.peopleWithOverrideCount], ["Override Leave Days", helpers.formatLeaveDays(timesheetTeamLeaveSummary.overrideLeaveDays)], ["Override Leave Blocks", timesheetTeamLeaveSummary.overrideLeaveBlockCount], ["Pending Override Review", timesheetLeaveOverrideRegisterSummary.pendingReviewCount], ["Reviewed Overrides", timesheetLeaveOverrideRegisterSummary.reviewedCount], [],
    ["User", "Department", "Email", "Workflow Status", "Override Leave Days", "Override Blocks", "Latest Override Date", "Latest Override Note", "Review Status", "Reviewed At", "Reviewed By", "Review Note", "Availability", "Leave Balance Remaining"],
    ...(timesheetTeamLeaveOverrideRows.length > 0 ? timesheetTeamLeaveOverrideRows.map((row) => [
      row.userName, row.department?.trim() || "No Department", row.userEmail || "", getTimesheetWorkflowStatusLabel(row.workflowStatus), helpers.formatLeaveDays(row.overrideLeaveDays), row.overrideLeaveBlockCount, row.latestOverrideDate ? helpers.formatPlannerDate(row.latestOverrideDate) : "", row.latestOverrideNote || "", row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review", row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "", row.reviewedByName || "", row.reviewNote || "", row.availabilityLabel, row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
    ]) : [["No override leave rows in the visible month."]]),
  ];
  const teamLeaveOverrideSheet = XLSX.utils.aoa_to_sheet(teamLeaveOverrideRows);
  teamLeaveOverrideSheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 48 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 18 }, { wch: 18 }];

  const leaveOverrideRegisterRows: (string | number)[][] = [
    ["Leave Override Register"], [], ["Month", monthLabel], ["Override Entries", timesheetLeaveOverrideRegisterSummary.overrideEntryCount], ["Half-Day Overrides", timesheetLeaveOverrideRegisterSummary.halfDayOverrideCount], ["Overdue Override Reviews", timesheetLeaveOverrideRegisterSummary.overduePendingReviewCount], ["Holiday Overlap Overrides", timesheetLeaveOverrideRegisterSummary.holidayOverlapCount], [],
    ["Date", "Logged", "User", "Department", "Email", "Workflow Status", "Leave Types", "Leave Portion", "Override Note", "Review Status", "Reviewed At", "Reviewed By", "Review Note", "Shared Holiday Overlap", "Remaining Balance"],
    ...(timesheetLeaveOverrideRegisterRows.length > 0 ? timesheetLeaveOverrideRegisterRows.map((row) => [
      helpers.formatPlannerDate(row.date), row.loggedAt ? helpers.formatPlannerDateTime(row.loggedAt) : "", row.userName, row.department?.trim() || "No Department", row.userEmail || "", getTimesheetWorkflowStatusLabel(row.workflowStatus), row.leaveSummary, Number(row.leavePortionPercent) === 50 ? "Half Day" : `${helpers.formatLeaveDays(row.leavePortionDays)} day(s)`, row.overrideNote, row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review", row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "", row.reviewedByName || "", row.reviewNote || "", row.sharedHolidayLabels.join(", "), row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
    ]) : [["No override leave rows in the visible month."]]),
  ];
  const leaveOverrideRegisterSheet = XLSX.utils.aoa_to_sheet(leaveOverrideRegisterRows);
  leaveOverrideRegisterSheet["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 24 }, { wch: 16 }, { wch: 48 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 32 }, { wch: 18 }];

  const leaveOverrideQueueRows: (string | number)[][] = [
    ["Override Review Queue"], [], ["Month", monthLabel], ["Pending Override Review", timesheetLeaveOverrideRegisterSummary.pendingReviewCount], ["Overdue Override Reviews", timesheetLeaveOverrideRegisterSummary.overduePendingReviewCount], [],
    ["User", "Department", "Leave Date", "Logged", "Waiting Days", "Priority", "Leave Types", "Leave Portion", "Override Note", "Shared Holiday Overlap", "Remaining Balance"],
    ...(timesheetPendingLeaveOverrideQueueRows.length > 0 ? timesheetPendingLeaveOverrideQueueRows.map((row) => [
      row.userName, row.department?.trim() || "No Department", helpers.formatPlannerDate(row.date), row.loggedAt ? helpers.formatPlannerDateTime(row.loggedAt) : "", row.waitingDays, row.statusLabel, row.leaveSummary, Number(row.leavePortionPercent) === 50 ? "Half Day" : `${helpers.formatLeaveDays(row.leavePortionDays)} day(s)`, row.overrideNote, row.sharedHolidayLabels.join(", "), row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
    ]) : [["No pending override reviews in the visible month."]]),
  ];
  const leaveOverrideQueueSheet = XLSX.utils.aoa_to_sheet(leaveOverrideQueueRows);
  leaveOverrideQueueSheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 14 }, { wch: 42 }, { wch: 24 }, { wch: 18 }];

  const leaveOverrideBlockRows: (string | number)[][] = [
    ["Override Review Blocks"], [], ["Month", monthLabel], ["Override Blocks", timesheetLeaveOverrideBlockSummary.blockCount], ["Pending Override Blocks", timesheetLeaveOverrideBlockSummary.pendingBlockCount], ["Overdue Override Blocks", timesheetLeaveOverrideBlockSummary.overduePendingBlockCount], ["Partly Reviewed Blocks", timesheetLeaveOverrideBlockSummary.mixedBlockCount], ["Reviewed Override Blocks", timesheetLeaveOverrideBlockSummary.reviewedBlockCount], [],
    ["User", "Department", "Start", "End", "Span Days", "Override Days", "Pending Days", "Reviewed Days", "Oldest Pending Logged", "Status", "Leave Types", "Override Note", "Shared Holiday Gap Days", "Latest Review Note", "Remaining Balance"],
    ...(timesheetLeaveOverrideBlockRows.length > 0 ? timesheetLeaveOverrideBlockRows.map((row) => [
      row.userName, row.department?.trim() || "No Department", helpers.formatPlannerDate(row.startDate), helpers.formatPlannerDate(row.endDate), row.spanDays, helpers.formatLeaveDays(row.usedDays), row.pendingReviewCount, row.reviewedCount, row.oldestPendingLoggedAt ? helpers.formatPlannerDateTime(row.oldestPendingLoggedAt) : "", row.reviewStatus === "reviewed" ? "Reviewed" : row.reviewStatus === "mixed" ? "Partly Reviewed" : "Pending Review", row.leaveSummary, row.overrideNote, row.sharedHolidayGapDays, row.latestReviewNote || "", row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
    ]) : [["No override leave blocks in the visible month."]]),
  ];
  const leaveOverrideBlockSheet = XLSX.utils.aoa_to_sheet(leaveOverrideBlockRows);
  leaveOverrideBlockSheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 42 }, { wch: 16 }, { wch: 42 }, { wch: 18 }];

  const reviewedLeaveOverrideBlockRows: (string | number)[][] = [
    ["Reviewed Override Block Archive"], [], ["Month", monthLabel], ["Reviewed Override Blocks", timesheetLeaveOverrideBlockSummary.reviewedBlockCount], [],
    ["User", "Department", "Start", "End", "Span Days", "Override Days", "Reviewed At", "Reviewed By", "Review Note", "Override Note", "Remaining Balance"],
    ...(timesheetReviewedLeaveOverrideBlockRows.length > 0 ? timesheetReviewedLeaveOverrideBlockRows.map((row) => [
      row.userName, row.department?.trim() || "No Department", helpers.formatPlannerDate(row.startDate), helpers.formatPlannerDate(row.endDate), row.spanDays, helpers.formatLeaveDays(row.usedDays), row.latestReviewedAt ? helpers.formatPlannerDateTime(row.latestReviewedAt) : "", row.latestReviewedByName || "", row.latestReviewNote || "", row.overrideNote, row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
    ]) : [["No reviewed override blocks in the visible month."]]),
  ];
  const reviewedLeaveOverrideBlockSheet = XLSX.utils.aoa_to_sheet(reviewedLeaveOverrideBlockRows);
  reviewedLeaveOverrideBlockSheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 42 }, { wch: 18 }];

  const departmentLeaveRows: (string | number)[][] = [
    ["Department Leave Overview"], [], ["Month", monthLabel], ["Departments With Leave", timesheetDepartmentLeaveSummary.departmentsWithLeave], ["Departments On Leave Today", timesheetDepartmentLeaveSummary.departmentsOnLeaveToday], ["Peak Department Coverage", `${timesheetDepartmentLeaveSummary.peakCoveragePercent}% (${timesheetDepartmentLeaveSummary.peakCoverageDepartment})`], [],
    ["Department", "Headcount", "On Leave Today", "Upcoming Leave", "People With Leave", "Leave Days", "Leave Blocks", "Coverage %", "Average Remaining", "Next Leave", "Leave Types", "Lead Person"],
    ...timesheetDepartmentLeaveRows.map((row) => [row.departmentLabel, row.headcount, row.peopleOnLeaveCount, row.upcomingLeaveCount, row.peopleWithLeaveCount, helpers.formatLeaveDays(row.totalLeaveDays), row.leaveBlockCount, row.coveragePercent, row.averageRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.averageRemainingDays), row.nextLeaveDate ? helpers.formatPlannerDate(row.nextLeaveDate) : "", row.leaveTypes.join(", "), row.primaryUserName || ""]),
  ];
  const departmentLeaveSheet = XLSX.utils.aoa_to_sheet(departmentLeaveRows);
  departmentLeaveSheet["!cols"] = [{ wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 22 }];

  const departmentCoverageRows: (string | number)[][] = [
    ["Department Coverage Alerts"], [], ["High Risk Dept Days", timesheetDepartmentCoverageSummary.highRiskDepartmentDays], ["Dept Coverage Watch Days", timesheetDepartmentCoverageSummary.mediumRiskDepartmentDays], ["Impacted Departments", timesheetDepartmentCoverageSummary.impactedDepartments], ["Peak Dept Coverage %", `${timesheetDepartmentCoverageSummary.peakDepartmentCoveragePercent}%`], ["Configured Rules", timesheetDepartmentCoverageSummary.configuredRuleCount], ["Alerting Depts Using Defaults", timesheetDepartmentCoverageSummary.unconfiguredAlertDepartments], [],
    ["Date", "Department", "Risk", "Coverage %", "People Off", "Headcount", "Available", "Rule", "Trigger", "Who's Off", "Leave Types", "Shared Holiday Overlap", "Detail"],
    ...timesheetDepartmentCoverageRows.map((row) => [helpers.formatPlannerDate(row.date), row.departmentLabel, row.severityLabel, row.coveragePercent, row.peopleOnLeaveCount, row.headcount, row.availableCount, row.ruleLabel, row.triggerLabel, row.usersOnLeave.map((userRow: AnyPlannerRow) => userRow.userName).join(", "), row.leaveTypes.join(", "), row.sharedHolidayLabels.join(", "), row.detail]),
  ];
  const departmentCoverageSheet = XLSX.utils.aoa_to_sheet(departmentCoverageRows);
  departmentCoverageSheet["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 32 }, { wch: 44 }, { wch: 38 }, { wch: 28 }, { wch: 28 }, { wch: 42 }];

  const departmentCoverageRuleRows: (string | number)[][] = [
    ["Department Coverage Rules"], [], ["Department", "Min Available", "Max Off", "Watch %", "High %", "Notes"],
    ...typedTimesheetDepartmentCoverageSettings.map((row) => [row.department, row.minimumAvailableCount ?? "", row.maximumPeopleOff ?? "", row.mediumRiskPercent, row.highRiskPercent, row.notes?.trim() || ""]),
  ];
  const departmentCoverageRuleSheet = XLSX.utils.aoa_to_sheet(departmentCoverageRuleRows);
  departmentCoverageRuleSheet["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 48 }];

  const teamLeaveCalendarRows: (string | number)[][] = [
    ["Team Leave Calendar"], [], ["Date", "People On Leave", "Total Leave Days", "Who's Off", "Leave Types", "Shared Holidays"],
    ...timesheetTeamLeaveCalendarRows.map((row) => [helpers.formatPlannerDate(row.date), row.peopleOnLeaveCount, helpers.formatLeaveDays(row.totalLeaveDays), row.usersOnLeave.map((userRow: AnyPlannerRow) => userRow.userName).join(", "), row.leaveTypes.join(", "), row.sharedHolidayLabels.join(", ")]),
  ];
  const teamLeaveCalendarSheet = XLSX.utils.aoa_to_sheet(teamLeaveCalendarRows);
  teamLeaveCalendarSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 32 }, { wch: 32 }];

  const teamLeaveCoverageRows: (string | number)[][] = [
    ["Leave Coverage Alerts"], [], ["Date", "Risk", "Coverage %", "People On Leave", "Total Leave Days", "Affected Team", "Shared Holiday Overlap", "Detail"],
    ...timesheetTeamLeaveCoverageRows.map((row) => [helpers.formatPlannerDate(row.date), row.severityLabel, row.coveragePercent, row.peopleOnLeaveCount, helpers.formatLeaveDays(row.totalLeaveDays), row.usersOnLeave.map((userRow: AnyPlannerRow) => userRow.userName).join(", "), row.sharedHolidayLabels.join(", "), row.detail]),
  ];
  const teamLeaveCoverageSheet = XLSX.utils.aoa_to_sheet(teamLeaveCoverageRows);
  teamLeaveCoverageSheet["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 32 }, { wch: 48 }];

  const reviewQueueRows: (string | number)[][] = [
    ["Submitted Timesheet Review Queue"], [], ["User", "Email", "Month", "Submitted", "Waiting", "Declaration", "Blockers", "Warnings", "Submission Note"],
    ...timesheetReviewQueueRows.map((row) => [row.userName, row.userEmail || "", helpers.formatPlannerDate(row.monthDate), row.submittedAt ? helpers.formatPlannerDateTime(row.submittedAt) : row.lockedAt ? helpers.formatPlannerDateTime(row.lockedAt) : "", row.waitingDays === null ? "" : `${row.waitingDays} day${row.waitingDays === 1 ? "" : "s"}`, row.employeeDeclarationAccepted ? "Confirmed" : "Missing", row.blockerCount, row.warningCount, row.submissionNote?.trim() || ""]),
  ];
  const reviewQueueSheet = XLSX.utils.aoa_to_sheet(reviewQueueRows);
  reviewQueueSheet["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 60 }];

  const approvedQueueRows: (string | number)[][] = [
    ["Approved Timesheet Handoff Queue"], [], ["User", "Email", "Month", "Handoff Status", "Approved", "Handed Off", "Handed Off By", "Approved Age", "Worked Hours", "Target Hours", "Variance", "Warnings"],
    ...timesheetApprovedRows.map((row) => [row.userName, row.userEmail || "", helpers.formatPlannerDate(row.monthDate), row.workflowStatus === "handed_off" ? "Handed Off" : "Pending Handoff", row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "", row.handedOffAt ? helpers.formatPlannerDateTime(row.handedOffAt) : "", row.handedOffByName?.trim() || "", row.approvedAgeDays === null ? "" : `${row.approvedAgeDays} day${row.approvedAgeDays === 1 ? "" : "s"}`, helpers.formatMinutesAsDuration(row.workedMinutes), helpers.formatMinutesAsDuration(row.expectedMinutes), helpers.formatVarianceMinutes(row.workedMinutes - row.expectedMinutes), row.warningCount]),
  ];
  const approvedQueueSheet = XLSX.utils.aoa_to_sheet(approvedQueueRows);
  approvedQueueSheet["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Team Summary");
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "Team Overview");
  XLSX.utils.book_append_sheet(workbook, teamLeaveSheet, "Team Leave");
  XLSX.utils.book_append_sheet(workbook, teamLeaveOverrideSheet, "Leave Overrides");
  XLSX.utils.book_append_sheet(workbook, leaveOverrideRegisterSheet, "Override Register");
  XLSX.utils.book_append_sheet(workbook, leaveOverrideBlockSheet, "Override Blocks");
  XLSX.utils.book_append_sheet(workbook, reviewedLeaveOverrideBlockSheet, "Reviewed Override Blocks");
  XLSX.utils.book_append_sheet(workbook, leaveOverrideQueueSheet, "Override Review Queue");
  XLSX.utils.book_append_sheet(workbook, departmentLeaveSheet, "Dept Leave");
  XLSX.utils.book_append_sheet(workbook, departmentCoverageRuleSheet, "Dept Rules");
  XLSX.utils.book_append_sheet(workbook, departmentCoverageSheet, "Dept Coverage");
  XLSX.utils.book_append_sheet(workbook, teamLeaveCalendarSheet, "Leave Calendar");
  XLSX.utils.book_append_sheet(workbook, teamLeaveCoverageSheet, "Coverage Alerts");
  XLSX.utils.book_append_sheet(workbook, reviewQueueSheet, "Review Queue");
  XLSX.utils.book_append_sheet(workbook, approvedQueueSheet, "Approved Queue");
  const stamp = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `textpoint-team-timesheets-${stamp}.xlsx`);
}

export async function exportTeamLeaveOverview({
  currentDate,
  user,
  helpers,
  getTimesheetWorkflowStatusLabel,
  timesheetTeamLeaveRows,
  timesheetTeamLeaveOverrideRows,
  timesheetLeaveOverrideRegisterRows,
  timesheetPendingLeaveOverrideQueueRows,
  timesheetPendingLeaveOverrideBlockQueueRows,
  timesheetLeaveOverrideBlockRows,
  timesheetReviewedLeaveOverrideBlockRows,
  timesheetDepartmentLeaveRows,
  timesheetDepartmentCoverageRows,
  typedTimesheetDepartmentCoverageSettings,
  timesheetTeamLeaveCalendarRows,
  timesheetTeamLeaveCoverageRows,
}: TeamLeaveOverviewExportArgs) {
  const timesheetTeamLeaveSummary = buildPlannerTimesheetTeamLeaveSummary(timesheetTeamLeaveRows);
  const timesheetLeaveOverrideRegisterSummary = buildPlannerTimesheetLeaveOverrideRegisterSummary(
    timesheetLeaveOverrideRegisterRows,
    timesheetPendingLeaveOverrideQueueRows
  );
  const timesheetDepartmentLeaveSummary =
    buildPlannerTimesheetDepartmentLeaveSummary(timesheetDepartmentLeaveRows);
  const timesheetLeaveOverrideBlockSummary = buildPlannerTimesheetLeaveOverrideBlockSummary(
    timesheetLeaveOverrideBlockRows,
    timesheetPendingLeaveOverrideBlockQueueRows
  );
  const timesheetDepartmentCoverageSummary = buildPlannerTimesheetDepartmentCoverageSummary(
    timesheetDepartmentCoverageRows,
    typedTimesheetDepartmentCoverageSettings
  );
  const XLSX = await loadXlsxModule();
  const monthLabel = currentDate.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });

  const summaryRows: (string | number)[][] = [
    ["Team Leave & Availability"],
    [],
    ["Month", monthLabel],
    ["Team Leave Days", helpers.formatLeaveDays(timesheetTeamLeaveSummary.teamLeaveDays)],
    ["Override Leave Days", helpers.formatLeaveDays(timesheetTeamLeaveSummary.overrideLeaveDays)],
    ["Override Entries", timesheetLeaveOverrideRegisterSummary.overrideEntryCount],
    ["Half-Day Overrides", timesheetLeaveOverrideRegisterSummary.halfDayOverrideCount],
    ["Pending Override Review", timesheetLeaveOverrideRegisterSummary.pendingReviewCount],
    ["Reviewed Overrides", timesheetLeaveOverrideRegisterSummary.reviewedCount],
    ["People On Leave Today", timesheetTeamLeaveSummary.peopleOnLeaveCount],
    ["Upcoming Leave", timesheetTeamLeaveSummary.upcomingLeaveCount],
    ["People With Leave This Month", timesheetTeamLeaveSummary.peopleWithLeaveCount],
    ["People With Overrides", timesheetTeamLeaveSummary.peopleWithOverrideCount],
    ["Override Leave Blocks", timesheetTeamLeaveSummary.overrideLeaveBlockCount],
    ["Holiday Overlap Overrides", timesheetLeaveOverrideRegisterSummary.holidayOverlapCount],
    ["Shared Holiday Days", timesheetTeamLeaveSummary.sharedHolidayDays],
    ["Departments With Leave", timesheetDepartmentLeaveSummary.departmentsWithLeave],
    ["Departments On Leave Today", timesheetDepartmentLeaveSummary.departmentsOnLeaveToday],
    [
      "Peak Department Coverage",
      `${timesheetDepartmentLeaveSummary.peakCoveragePercent}% (${timesheetDepartmentLeaveSummary.peakCoverageDepartment})`,
    ],
    ["Exported At", helpers.formatPlannerDateTime(new Date())],
    ["Exported By", user?.name?.trim() || user?.email?.trim() || "TextPoint Admin"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 24 }, { wch: 42 }];

  const detailRows: (string | number)[][] = [
    ["Team Leave Detail"],
    [],
    [
      "User", "Department", "Email", "Workflow Status", "Availability", "Detail",
      "This Month Leave Days", "Leave Blocks", "Override Leave Days", "Override Blocks",
      "Latest Override Date", "Latest Override Note", "Review Status", "Reviewed At",
      "Reviewed By", "Review Note", "Leave Types", "Next Leave", "Latest Leave",
      "YTD Used", "Available", "Remaining", "Shared Holidays",
    ],
    ...timesheetTeamLeaveRows.map((row) => [
      row.userName,
      row.department?.trim() || "No Department",
      row.userEmail || "",
      getTimesheetWorkflowStatusLabel(row.workflowStatus),
      row.availabilityLabel,
      row.availabilityDetail,
      helpers.formatLeaveDays(row.personalLeaveDays),
      row.leaveBlockCount,
      row.hasLeaveOverride ? helpers.formatLeaveDays(row.overrideLeaveDays) : "",
      row.hasLeaveOverride ? row.overrideLeaveBlockCount : "",
      row.latestOverrideDate ? helpers.formatPlannerDate(row.latestOverrideDate) : "",
      row.latestOverrideNote || "",
      row.hasLeaveOverride ? (row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review") : "",
      row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
      row.reviewedByName || "",
      row.reviewNote || "",
      row.leaveSummary,
      row.nextLeaveDate ? helpers.formatPlannerDate(row.nextLeaveDate) : "",
      row.lastLeaveDate ? helpers.formatPlannerDate(row.lastLeaveDate) : "",
      helpers.formatLeaveDays(row.leaveYearUsedDays),
      row.leaveAvailableDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveAvailableDays),
      row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
      row.sharedHolidayDays,
    ]),
  ];
  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  detailSheet["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 48 },
    { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 42 },
    { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 28 }, { wch: 16 },
    { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];

  const overrideRows: (string | number)[][] = [
    ["Leave Override Watch"],
    [],
    ["Month", monthLabel],
    ["People With Overrides", timesheetTeamLeaveSummary.peopleWithOverrideCount],
    ["Override Leave Days", helpers.formatLeaveDays(timesheetTeamLeaveSummary.overrideLeaveDays)],
    ["Override Leave Blocks", timesheetTeamLeaveSummary.overrideLeaveBlockCount],
    ["Pending Override Review", timesheetLeaveOverrideRegisterSummary.pendingReviewCount],
    ["Reviewed Overrides", timesheetLeaveOverrideRegisterSummary.reviewedCount],
    [],
    [
      "User", "Department", "Email", "Workflow Status", "Override Leave Days",
      "Override Blocks", "Latest Override Date", "Latest Override Note", "Review Status",
      "Reviewed At", "Reviewed By", "Review Note", "Availability", "Leave Balance Remaining",
    ],
    ...(timesheetTeamLeaveOverrideRows.length > 0
      ? timesheetTeamLeaveOverrideRows.map((row) => [
          row.userName,
          row.department?.trim() || "No Department",
          row.userEmail || "",
          getTimesheetWorkflowStatusLabel(row.workflowStatus),
          helpers.formatLeaveDays(row.overrideLeaveDays),
          row.overrideLeaveBlockCount,
          row.latestOverrideDate ? helpers.formatPlannerDate(row.latestOverrideDate) : "",
          row.latestOverrideNote || "",
          row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review",
          row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
          row.reviewedByName || "",
          row.reviewNote || "",
          row.availabilityLabel,
          row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
        ])
      : [["No override leave rows in the visible month."]]),
  ];
  const overrideSheet = XLSX.utils.aoa_to_sheet(overrideRows);
  overrideSheet["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 14 },
    { wch: 16 }, { wch: 48 }, { wch: 16 }, { wch: 20 }, { wch: 22 }, { wch: 42 },
    { wch: 18 }, { wch: 18 },
  ];

  const overrideRegisterRows: (string | number)[][] = [
    ["Leave Override Register"],
    [],
    ["Month", monthLabel],
    ["Override Entries", timesheetLeaveOverrideRegisterSummary.overrideEntryCount],
    ["Half-Day Overrides", timesheetLeaveOverrideRegisterSummary.halfDayOverrideCount],
    ["Overdue Override Reviews", timesheetLeaveOverrideRegisterSummary.overduePendingReviewCount],
    ["Holiday Overlap Overrides", timesheetLeaveOverrideRegisterSummary.holidayOverlapCount],
    [],
    [
      "Date", "Logged", "User", "Department", "Email", "Workflow Status", "Leave Types",
      "Leave Portion", "Override Note", "Review Status", "Reviewed At", "Reviewed By",
      "Review Note", "Shared Holiday Overlap", "Remaining Balance",
    ],
    ...(timesheetLeaveOverrideRegisterRows.length > 0
      ? timesheetLeaveOverrideRegisterRows.map((row) => [
          helpers.formatPlannerDate(row.date),
          row.loggedAt ? helpers.formatPlannerDateTime(row.loggedAt) : "",
          row.userName,
          row.department?.trim() || "No Department",
          row.userEmail || "",
          getTimesheetWorkflowStatusLabel(row.workflowStatus),
          row.leaveSummary,
          Number(row.leavePortionPercent) === 50 ? "Half Day" : `${helpers.formatLeaveDays(row.leavePortionDays)} day(s)`,
          row.overrideNote,
          row.reviewStatus === "reviewed" ? "Reviewed" : "Pending Review",
          row.reviewedAt ? helpers.formatPlannerDateTime(row.reviewedAt) : "",
          row.reviewedByName || "",
          row.reviewNote || "",
          row.sharedHolidayLabels.join(", "),
          row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
        ])
      : [["No override leave rows in the visible month."]]),
  ];
  const overrideRegisterSheet = XLSX.utils.aoa_to_sheet(overrideRegisterRows);
  overrideRegisterSheet["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 28 }, { wch: 18 },
    { wch: 24 }, { wch: 16 }, { wch: 48 }, { wch: 16 }, { wch: 20 }, { wch: 22 },
    { wch: 42 }, { wch: 32 }, { wch: 18 },
  ];

  const overrideQueueRows: (string | number)[][] = [
    ["Override Review Queue"],
    [],
    ["Month", monthLabel],
    ["Pending Override Review", timesheetLeaveOverrideRegisterSummary.pendingReviewCount],
    ["Overdue Override Reviews", timesheetLeaveOverrideRegisterSummary.overduePendingReviewCount],
    [],
    [
      "User", "Department", "Leave Date", "Logged", "Waiting Days", "Priority",
      "Leave Types", "Leave Portion", "Override Note", "Shared Holiday Overlap", "Remaining Balance",
    ],
    ...(timesheetPendingLeaveOverrideQueueRows.length > 0
      ? timesheetPendingLeaveOverrideQueueRows.map((row) => [
          row.userName,
          row.department?.trim() || "No Department",
          helpers.formatPlannerDate(row.date),
          row.loggedAt ? helpers.formatPlannerDateTime(row.loggedAt) : "",
          row.waitingDays,
          row.statusLabel,
          row.leaveSummary,
          Number(row.leavePortionPercent) === 50 ? "Half Day" : `${helpers.formatLeaveDays(row.leavePortionDays)} day(s)`,
          row.overrideNote,
          row.sharedHolidayLabels.join(", "),
          row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
        ])
      : [["No pending override reviews in the visible month."]]),
  ];
  const overrideQueueSheet = XLSX.utils.aoa_to_sheet(overrideQueueRows);
  overrideQueueSheet["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 16 },
    { wch: 24 }, { wch: 14 }, { wch: 42 }, { wch: 24 }, { wch: 18 },
  ];

  const overrideBlockRows: (string | number)[][] = [
    ["Override Review Blocks"],
    [],
    ["Month", monthLabel],
    ["Override Blocks", timesheetLeaveOverrideBlockSummary.blockCount],
    ["Pending Override Blocks", timesheetLeaveOverrideBlockSummary.pendingBlockCount],
    ["Overdue Override Blocks", timesheetLeaveOverrideBlockSummary.overduePendingBlockCount],
    ["Partly Reviewed Blocks", timesheetLeaveOverrideBlockSummary.mixedBlockCount],
    ["Reviewed Override Blocks", timesheetLeaveOverrideBlockSummary.reviewedBlockCount],
    [],
    [
      "User", "Department", "Start", "End", "Span Days", "Override Days", "Pending Days",
      "Reviewed Days", "Oldest Pending Logged", "Status", "Leave Types", "Override Note",
      "Shared Holiday Gap Days", "Latest Review Note", "Remaining Balance",
    ],
    ...(timesheetLeaveOverrideBlockRows.length > 0
      ? timesheetLeaveOverrideBlockRows.map((row) => [
          row.userName,
          row.department?.trim() || "No Department",
          helpers.formatPlannerDate(row.startDate),
          helpers.formatPlannerDate(row.endDate),
          row.spanDays,
          helpers.formatLeaveDays(row.usedDays),
          row.pendingReviewCount,
          row.reviewedCount,
          row.oldestPendingLoggedAt ? helpers.formatPlannerDateTime(row.oldestPendingLoggedAt) : "",
          row.reviewStatus === "reviewed" ? "Reviewed" : row.reviewStatus === "mixed" ? "Partly Reviewed" : "Pending Review",
          row.leaveSummary,
          row.overrideNote,
          row.sharedHolidayGapDays,
          row.latestReviewNote || "",
          row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
        ])
      : [["No override leave blocks in the visible month."]]),
  ];
  const overrideBlockSheet = XLSX.utils.aoa_to_sheet(overrideBlockRows);
  overrideBlockSheet["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 42 },
    { wch: 16 }, { wch: 42 }, { wch: 18 },
  ];

  const reviewedOverrideBlockRows: (string | number)[][] = [
    ["Reviewed Override Block Archive"],
    [],
    ["Month", monthLabel],
    ["Reviewed Override Blocks", timesheetLeaveOverrideBlockSummary.reviewedBlockCount],
    [],
    ["User", "Department", "Start", "End", "Span Days", "Override Days", "Reviewed At", "Reviewed By", "Review Note", "Override Note", "Remaining Balance"],
    ...(timesheetReviewedLeaveOverrideBlockRows.length > 0
      ? timesheetReviewedLeaveOverrideBlockRows.map((row) => [
          row.userName,
          row.department?.trim() || "No Department",
          helpers.formatPlannerDate(row.startDate),
          helpers.formatPlannerDate(row.endDate),
          row.spanDays,
          helpers.formatLeaveDays(row.usedDays),
          row.latestReviewedAt ? helpers.formatPlannerDateTime(row.latestReviewedAt) : "",
          row.latestReviewedByName || "",
          row.latestReviewNote || "",
          row.overrideNote,
          row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
        ])
      : [["No reviewed override blocks in the visible month."]]),
  ];
  const reviewedOverrideBlockSheet = XLSX.utils.aoa_to_sheet(reviewedOverrideBlockRows);
  reviewedOverrideBlockSheet["!cols"] = [
    { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
    { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 42 }, { wch: 18 },
  ];

  const departmentRows: (string | number)[][] = [
    ["Department Leave Overview"],
    [],
    ["Department", "Headcount", "On Leave Today", "Upcoming Leave", "People With Leave", "Leave Days", "Leave Blocks", "Coverage %", "Average Remaining", "Next Leave", "Leave Types", "Lead Person"],
    ...timesheetDepartmentLeaveRows.map((row) => [
      row.departmentLabel,
      row.headcount,
      row.peopleOnLeaveCount,
      row.upcomingLeaveCount,
      row.peopleWithLeaveCount,
      helpers.formatLeaveDays(row.totalLeaveDays),
      row.leaveBlockCount,
      row.coveragePercent,
      row.averageRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.averageRemainingDays),
      row.nextLeaveDate ? helpers.formatPlannerDate(row.nextLeaveDate) : "",
      row.leaveTypes.join(", "),
      row.primaryUserName || "",
    ]),
  ];
  const departmentSheet = XLSX.utils.aoa_to_sheet(departmentRows);
  departmentSheet["!cols"] = [
    { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 30 }, { wch: 22 },
  ];

  const departmentCoverageRowsExport: (string | number)[][] = [
    ["Department Coverage Alerts"],
    [],
    ["High Risk Dept Days", timesheetDepartmentCoverageSummary.highRiskDepartmentDays],
    ["Dept Coverage Watch Days", timesheetDepartmentCoverageSummary.mediumRiskDepartmentDays],
    ["Impacted Departments", timesheetDepartmentCoverageSummary.impactedDepartments],
    ["Peak Dept Coverage %", `${timesheetDepartmentCoverageSummary.peakDepartmentCoveragePercent}%`],
    ["Configured Rules", timesheetDepartmentCoverageSummary.configuredRuleCount],
    ["Alerting Depts Using Defaults", timesheetDepartmentCoverageSummary.unconfiguredAlertDepartments],
    [],
    ["Date", "Department", "Risk", "Coverage %", "People Off", "Headcount", "Available", "Rule", "Trigger", "Who's Off", "Leave Types", "Shared Holiday Overlap", "Detail"],
    ...timesheetDepartmentCoverageRows.map((row) => [
      helpers.formatPlannerDate(row.date),
      row.departmentLabel,
      row.severityLabel,
      row.coveragePercent,
      row.peopleOnLeaveCount,
      row.headcount,
      row.availableCount,
      row.ruleLabel,
      row.triggerLabel,
      row.usersOnLeave.map((userRow: AnyPlannerRow) => userRow.userName).join(", "),
      row.leaveTypes.join(", "),
      row.sharedHolidayLabels.join(", "),
      row.detail,
    ]),
  ];
  const departmentCoverageSheet = XLSX.utils.aoa_to_sheet(departmentCoverageRowsExport);
  departmentCoverageSheet["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 32 }, { wch: 44 }, { wch: 38 }, { wch: 28 }, { wch: 28 }, { wch: 42 },
  ];

  const departmentRuleRows: (string | number)[][] = [
    ["Department Coverage Rules"],
    [],
    ["Department", "Min Available", "Max Off", "Watch %", "High %", "Notes"],
    ...typedTimesheetDepartmentCoverageSettings.map((row) => [
      row.department,
      row.minimumAvailableCount ?? "",
      row.maximumPeopleOff ?? "",
      row.mediumRiskPercent,
      row.highRiskPercent,
      row.notes?.trim() || "",
    ]),
  ];
  const departmentRuleSheet = XLSX.utils.aoa_to_sheet(departmentRuleRows);
  departmentRuleSheet["!cols"] = [
    { wch: 24 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 48 },
  ];

  const calendarRows: (string | number)[][] = [
    ["Team Leave Calendar"],
    [],
    ["Date", "People On Leave", "Total Leave Days", "Who's Off", "Leave Types", "Shared Holidays"],
    ...timesheetTeamLeaveCalendarRows.map((row) => [
      helpers.formatPlannerDate(row.date),
      row.peopleOnLeaveCount,
      helpers.formatLeaveDays(row.totalLeaveDays),
      row.usersOnLeave.map((userRow: AnyPlannerRow) => userRow.userName).join(", "),
      row.leaveTypes.join(", "),
      row.sharedHolidayLabels.join(", "),
    ]),
  ];
  const calendarSheet = XLSX.utils.aoa_to_sheet(calendarRows);
  calendarSheet["!cols"] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 32 }, { wch: 32 }];

  const coverageRows: (string | number)[][] = [
    ["Leave Coverage Alerts"],
    [],
    ["Date", "Risk", "Coverage %", "People On Leave", "Total Leave Days", "Affected Team", "Shared Holiday Overlap", "Detail"],
    ...timesheetTeamLeaveCoverageRows.map((row) => [
      helpers.formatPlannerDate(row.date),
      row.severityLabel,
      row.coveragePercent,
      row.peopleOnLeaveCount,
      helpers.formatLeaveDays(row.totalLeaveDays),
      row.usersOnLeave.map((userRow: AnyPlannerRow) => userRow.userName).join(", "),
      row.sharedHolidayLabels.join(", "),
      row.detail,
    ]),
  ];
  const coverageSheet = XLSX.utils.aoa_to_sheet(coverageRows);
  coverageSheet["!cols"] = [
    { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 32 }, { wch: 48 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Leave Summary");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Team Leave");
  XLSX.utils.book_append_sheet(workbook, overrideSheet, "Leave Overrides");
  XLSX.utils.book_append_sheet(workbook, overrideRegisterSheet, "Override Register");
  XLSX.utils.book_append_sheet(workbook, overrideBlockSheet, "Override Blocks");
  XLSX.utils.book_append_sheet(workbook, reviewedOverrideBlockSheet, "Reviewed Override Blocks");
  XLSX.utils.book_append_sheet(workbook, overrideQueueSheet, "Override Review Queue");
  XLSX.utils.book_append_sheet(workbook, departmentSheet, "Dept Leave");
  XLSX.utils.book_append_sheet(workbook, departmentRuleSheet, "Dept Rules");
  XLSX.utils.book_append_sheet(workbook, departmentCoverageSheet, "Dept Coverage");
  XLSX.utils.book_append_sheet(workbook, calendarSheet, "Leave Calendar");
  XLSX.utils.book_append_sheet(workbook, coverageSheet, "Coverage Alerts");
  const stamp = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `textpoint-team-leave-${stamp}.xlsx`);
}

export async function exportTimesheetMonth({
  currentDate,
  user,
  helpers,
  typedTimesheetProfile,
  activeTimesheetOptions,
  timesheetMonthRows,
  timesheetSummary,
  typedTimesheetOptions,
  typedTimesheetHolidays,
  getTimesheetHolidayTypeLabel,
  timesheetWeekRows,
  timesheetAttentionRows,
  leaveYearRange,
  getMonthLabel,
  timesheetPersonalLeaveAllowanceDays,
  timesheetPersonalLeaveCarryOverDays,
  timesheetPersonalLeaveAvailableDays,
  timesheetPersonalLeaveYearUsedDays,
  timesheetPersonalLeaveUsedDays,
  timesheetPersonalLeaveRemainingDays,
  timesheetPersonalLeaveOverrideSummary,
  timesheetPersonalLeaveRows,
  timesheetPersonalLeaveBreakdownRows,
  timesheetPersonalLeaveBlocks,
  typedTimesheetUserLeaveOverrideBlockRows,
  timesheetAttentionByDateKey,
  getTimesheetAvailabilityLabel,
  holidayByDateKey,
  timesheetMonthStatusLabel,
  currentMonthTimesheetHolidays,
  timesheetSubmissionBlockers,
  timesheetSubmissionWarnings,
  timesheetCompletionSummary,
  typedTimesheetMonthStatus,
  typedTimesheetHistory,
  timesheetOwnerName,
  plannerTimesheetDeclarationText,
  plannerTimesheetReviewerDeclarationText,
  timesheetMonthComparison,
  timesheetDayComparisonSummary,
  previousTimesheetSummary,
  previousTimesheetEntriesByDayNumber,
  getNetWorkedMinutes,
}: PersonalTimesheetExportArgs) {
  const XLSX = await loadXlsxModule();
  const monthLabel = currentDate.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
  const nameLabel = user?.name?.trim() || user?.email || "Planner User";
  const departmentLabel = typedTimesheetProfile?.department?.trim() || "";
  const signatureLabel = typedTimesheetProfile?.signatureName?.trim() || "";
  const optionHeaders = activeTimesheetOptions.map((option) => option.label);
  const rows = timesheetMonthRows.map((row) => {
    const checkedIds = new Set(row.checkedOptionIds);
    return [
      row.date.getDate(),
      row.startTime,
      row.endTime,
      `${row.lunchBreakMinutes} min`,
      `${row.teaBreakMinutes} min`,
      row.leavePortionDays > 0 ? helpers.formatLeaveDays(row.leavePortionDays) : "",
      row.workedMinutes === null ? "" : helpers.formatMinutesAsDuration(row.workedMinutes),
      helpers.formatMinutesAsDuration(row.expectedMinutes),
      row.varianceMinutes === null ? "" : helpers.formatVarianceMinutes(row.varianceMinutes),
      ...activeTimesheetOptions.map((option) => (checkedIds.has(option.id) ? "x" : "")),
      row.checkedCount,
      row.remarks,
    ];
  });

  const sheetRows: (string | number)[][] = [
    ["TIMESHEET", "TextPoint"],
    [],
    ["Name", nameLabel, "", "", "Department", departmentLabel],
    ["Month", monthLabel, "", "", "Signed", signatureLabel],
    ["Logged Hours", helpers.formatMinutesAsDuration(timesheetSummary.workedMinutes), "", "", "Variance", helpers.formatVarianceMinutes(timesheetSummary.varianceMinutes)],
    [],
    ["Date", "Start Time", "End Time", "Lunch Break", "Tea Break", "Leave Days", "Net Worked Hours", "Expected Hours", "Variance", ...optionHeaders, "Total", "Remarks"],
    ...rows,
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!cols"] = [
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 12 },
    ...activeTimesheetOptions.map((option) => ({ wch: Math.max(12, Math.min(28, option.label.length + 4)) })),
    { wch: 8 }, { wch: 40 },
  ];

  const guidelinesRows: (string | number)[][] = [
    ["Timesheet Guidelines"],
    [],
    ["Activity", "Description"],
    ...typedTimesheetOptions.map((option) => [option.label, option.description ?? ""]),
  ];
  const guidelinesSheet = XLSX.utils.aoa_to_sheet(guidelinesRows);
  guidelinesSheet["!cols"] = [{ wch: 28 }, { wch: 90 }];

  const holidayRows: (string | number)[][] = [
    ["Holiday Calendar"],
    [],
    ["Date", "Type", "Holiday", "Notes"],
    ...typedTimesheetHolidays.map((holiday) => [
      helpers.formatPlannerDate(holiday.holidayDate),
      getTimesheetHolidayTypeLabel(holiday.holidayType),
      holiday.label,
      holiday.notes?.trim() || "",
    ]),
  ];
  const holidaysSheet = XLSX.utils.aoa_to_sheet(holidayRows);
  holidaysSheet["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 60 }];

  const weeklySummaryRows: (string | number)[][] = [
    ["Weekly Summary"],
    [],
    ["Week", "Range", "Readiness", "Progress", "Next Action", "Blockers", "Warnings", "Logged Days", "Worked Hours", "Target Hours", "Overtime", "Short", "Variance"],
    ...timesheetWeekRows.map((row) => [
      row.weekLabel,
      row.rangeLabel,
      row.readinessStatus === "ready" ? "Ready" : row.readinessStatus === "warnings" ? "Warnings" : row.readinessStatus === "needs_work" ? "Needs Work" : row.readinessStatus === "in_progress" ? "In Progress" : "Upcoming",
      row.dueWorkingDays > 0 ? `${row.completionPercent}% (${row.completedWorkingDays}/${row.dueWorkingDays})` : "Not due yet",
      row.nextActionDetail,
      row.blockerCount,
      row.warningCount,
      row.loggedDays,
      helpers.formatMinutesAsDuration(row.workedMinutes),
      helpers.formatMinutesAsDuration(row.expectedMinutes),
      row.overtimeMinutes > 0 ? helpers.formatMinutesAsDuration(row.overtimeMinutes) : "",
      row.shortMinutes > 0 ? helpers.formatMinutesAsDuration(row.shortMinutes) : "",
      helpers.formatVarianceMinutes(row.varianceMinutes),
    ]),
  ];
  const weeklySummarySheet = XLSX.utils.aoa_to_sheet(weeklySummaryRows);
  weeklySummarySheet["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 42 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

  const attentionRows: (string | number)[][] = [["Timesheet Attention Queue"], [], ["Date", "Issue", "Detail"], ...timesheetAttentionRows.map((row) => [row.dateKey, row.issueLabel, row.detail])];
  const attentionSheet = XLSX.utils.aoa_to_sheet(attentionRows);
  attentionSheet["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 70 }];

  const personalLeaveRows: (string | number)[][] = [
    ["Personal Leave Register"], [], ["Leave Balance"], ["Leave Year", leaveYearRange.label], ["Leave Year Start Month", getMonthLabel(leaveYearRange.startMonth)],
    ["Allowance Days", timesheetPersonalLeaveAllowanceDays === null ? "Not set" : helpers.formatLeaveDays(timesheetPersonalLeaveAllowanceDays)],
    ["Carry-Over Days", helpers.formatLeaveDays(timesheetPersonalLeaveCarryOverDays)],
    ["Available Days", timesheetPersonalLeaveAvailableDays === null ? "Not set" : helpers.formatLeaveDays(timesheetPersonalLeaveAvailableDays)],
    ["Year-To-Date Leave Days Used", helpers.formatLeaveDays(timesheetPersonalLeaveYearUsedDays)],
    ["Visible Month Leave Days Used", helpers.formatLeaveDays(timesheetPersonalLeaveUsedDays)],
    ["Remaining Days", timesheetPersonalLeaveRemainingDays === null ? "Not set" : helpers.formatLeaveDays(timesheetPersonalLeaveRemainingDays)],
    ["Override Leave Days", helpers.formatLeaveDays(timesheetPersonalLeaveOverrideSummary.overrideLeaveDays)],
    ["Pending Override Reviews", timesheetPersonalLeaveOverrideSummary.pendingDayCount],
    ["Reviewed Override Days", timesheetPersonalLeaveOverrideSummary.reviewedDayCount],
    [],
    ["Date", "Day", "Leave / Non-Working", "Leave Portion", "Leave Days", "Remarks", "Override Review", "Override Note", "Review Note", "Vs Prev"],
    ...timesheetPersonalLeaveRows.map((row) => [
      row.dateKey, row.dayLabel, row.leaveSummary, row.leavePortionPercent === 50 ? "Half Day" : "Full Day", helpers.formatLeaveDays(row.leavePortionDays), row.remarks,
      row.hasLeaveOverride ? row.overrideReviewStatus === "reviewed" ? "Reviewed" : "Pending Review" : "Within Rules",
      row.overrideNote || "", row.overrideReviewNote || "",
      row.comparisonStatus === "same" ? "Same" : row.comparisonStatus === "changed" ? "Changed" : row.comparisonStatus === "new" ? "New" : row.comparisonStatus === "missing" ? "Missing" : "No History",
    ]),
    [],
    ["Leave Breakdown"],
    ["Activity", "Days Used"],
    ...(timesheetPersonalLeaveBreakdownRows.length > 0 ? timesheetPersonalLeaveBreakdownRows.map((row) => [row.label, helpers.formatLeaveDays(row.usedDays)]) : [["No personal leave / non-working days saved", ""]]),
    [],
    ["Leave Blocks"],
    ["From", "To", "Leave Portion", "Leave Days", "Span Days", "Working Leave Days", "Weekend Leave Days", "Shared Holiday Gap Days", "Leave / Non-Working", "Override Review", "Override Note", "Latest Review Note", "Remarks"],
    ...(timesheetPersonalLeaveBlocks.length > 0 ? timesheetPersonalLeaveBlocks.map((row) => [
      helpers.formatPlannerDate(row.startDate), helpers.formatPlannerDate(row.endDate), row.leavePortionPercent === 50 ? "Half Day" : "Full Day", helpers.formatLeaveDays(row.usedDays), row.spanDays,
      helpers.formatLeaveDays(row.workingLeaveDays), helpers.formatLeaveDays(row.weekendLeaveDays), row.sharedHolidayGapDays, row.leaveSummary,
      row.hasLeaveOverride ? row.overrideReviewStatus === "reviewed" ? "Reviewed" : row.overrideReviewStatus === "mixed" ? "Partly Reviewed" : "Pending Review" : "Within Rules",
      row.latestOverrideNote || "", row.latestOverrideReviewNote || "", row.remarks,
    ]) : [["No grouped leave periods in this month", "", "", "", "", "", "", "", "", "", "", "", ""]]),
  ];
  const personalLeaveSheet = XLSX.utils.aoa_to_sheet(personalLeaveRows);
  personalLeaveSheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 34 }, { wch: 14 }, { wch: 48 }, { wch: 18 }, { wch: 36 }, { wch: 36 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 36 }];

  const leaveOverrideHistoryRows: (string | number)[][] = [
    ["Leave Override Review History"], [], ["Summary"], ["Override Leave Days", helpers.formatLeaveDays(timesheetPersonalLeaveOverrideSummary.overrideLeaveDays)],
    ["Pending Override Blocks", timesheetPersonalLeaveOverrideSummary.pendingBlockCount], ["Reviewed Override Blocks", timesheetPersonalLeaveOverrideSummary.reviewedBlockCount], [],
    ["From", "To", "Leave / Non-Working", "Override Note", "Review Status", "Reviewed At", "Reviewed By", "Review Note", "Remaining Balance"],
    ...(typedTimesheetUserLeaveOverrideBlockRows.length > 0 ? typedTimesheetUserLeaveOverrideBlockRows.map((row) => [
      helpers.formatPlannerDate(row.startDate), helpers.formatPlannerDate(row.endDate), row.leaveSummary, row.overrideNote || "",
      row.reviewStatus === "reviewed" ? "Reviewed" : row.reviewStatus === "mixed" ? "Partly Reviewed" : "Pending Review",
      row.latestReviewedAt ? helpers.formatPlannerDateTime(row.latestReviewedAt) : "", row.latestReviewedByName || "", row.latestReviewNote || "",
      row.leaveRemainingDays === null ? "Allowance not set" : helpers.formatLeaveDays(row.leaveRemainingDays),
    ]) : [["No leave override reviews were recorded in the visible month.", "", "", "", "", "", "", "", ""]]),
  ];
  const leaveOverrideHistorySheet = XLSX.utils.aoa_to_sheet(leaveOverrideHistoryRows);
  leaveOverrideHistorySheet["!cols"] = [{ wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 42 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 42 }, { wch: 18 }];

  const availabilityRows: (string | number)[][] = [
    ["Availability Calendar"], [], ["Date", "Day", "Status", "Detail", "Attention"],
    ...timesheetMonthRows.map((row) => {
      const attentionItems = timesheetAttentionByDateKey.get(row.dateKey) ?? [];
      return [
        row.dateKey,
        row.dayLabel,
        getTimesheetAvailabilityLabel(row, attentionItems.length > 0),
        row.isHoliday
          ? [getTimesheetHolidayTypeLabel(holidayByDateKey.get(row.dateKey)?.holidayType), row.holidayLabel].filter(Boolean).join(": ")
          : row.hasLeavePortion
            ? row.checkedOptions.filter((option: AnyPlannerRow) => option.hoursCategory === "non_working").map((option: AnyPlannerRow) => option.label).join(", ") + ` (${helpers.formatLeaveDays(row.leavePortionDays)} day)`
            : row.hasSavedEntry
              ? `${row.checkedCount} activity tick(s)`
              : "",
        attentionItems.map((item) => item.issueLabel).join(", "),
      ];
    }),
  ];
  const availabilitySheet = XLSX.utils.aoa_to_sheet(availabilityRows);
  availabilitySheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 42 }, { wch: 28 }];

  const monthStatusRows: (string | number)[][] = [
    ["Month Status"], [], ["Month", monthLabel], ["Status", timesheetMonthStatusLabel], ["Personal Leave Days", helpers.formatLeaveDays(timesheetSummary.personalLeaveDays)],
    ["Holiday / Shutdown Dates", currentMonthTimesheetHolidays.length],
    ["Submission Readiness", timesheetSubmissionBlockers.length > 0 ? "Blocked" : timesheetSubmissionWarnings.length > 0 ? "Warnings Only" : "Ready"],
    ["Completion Progress", timesheetCompletionSummary.dueWorkingDays > 0 ? `${timesheetCompletionSummary.completionPercent}% (${timesheetCompletionSummary.completedWorkingDays}/${timesheetCompletionSummary.dueWorkingDays} due working days)` : "No due working days yet"],
    ["Blocking Items", timesheetSubmissionBlockers.length], ["Warnings", timesheetSubmissionWarnings.length],
    ["Locked At", typedTimesheetMonthStatus?.lockedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.lockedAt) : ""],
    ["Submitted At", typedTimesheetMonthStatus?.submittedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.submittedAt) : ""],
    ["Submitted By", typedTimesheetMonthStatus?.submittedByName?.trim() || ""],
    ["Employee Declaration", typedTimesheetMonthStatus?.employeeDeclarationAccepted ? "Confirmed" : "Not confirmed"],
    ["Declaration Accepted At", typedTimesheetMonthStatus?.employeeDeclarationAcceptedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.employeeDeclarationAcceptedAt) : ""],
    ["Submission Note", typedTimesheetMonthStatus?.submissionNote?.trim() || ""],
    ["Reviewed At", typedTimesheetMonthStatus?.reviewedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.reviewedAt) : ""],
    ["Reviewed By", typedTimesheetMonthStatus?.reviewedByName?.trim() || ""],
    ["Reviewer Declaration", typedTimesheetMonthStatus?.reviewerDeclarationAccepted ? "Confirmed" : "Not confirmed"],
    ["Reviewer Declaration Accepted At", typedTimesheetMonthStatus?.reviewerDeclarationAcceptedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt) : ""],
    ["Review Note", typedTimesheetMonthStatus?.reviewNote?.trim() || ""],
    ["Handed Off At", typedTimesheetMonthStatus?.handedOffAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.handedOffAt) : ""],
    ["Handed Off By", typedTimesheetMonthStatus?.handedOffByName?.trim() || ""],
    ["Handoff Note", typedTimesheetMonthStatus?.handoffNote?.trim() || ""],
    ["Reopened At", typedTimesheetMonthStatus?.reopenedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.reopenedAt) : ""],
    ["Note", typedTimesheetMonthStatus?.statusNote?.trim() || ""],
  ];
  const monthStatusSheet = XLSX.utils.aoa_to_sheet(monthStatusRows);
  monthStatusSheet["!cols"] = [{ wch: 18 }, { wch: 42 }];

  const monthHistoryRows: (string | number)[][] = [["Month History"], [], ["When", "Action", "By", "Resulting Status", "Note"], ...typedTimesheetHistory.map((entry) => [helpers.formatPlannerDateTime(entry.createdAt), entry.actionLabel, entry.actorName?.trim() || "", entry.resultingStatus, entry.note?.trim() || ""])];
  const monthHistorySheet = XLSX.utils.aoa_to_sheet(monthHistoryRows);
  monthHistorySheet["!cols"] = [{ wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 60 }];

  const approvalCertificateRows: (string | number)[][] = [
    ["Timesheet Approval Certificate"], [], ["Month", monthLabel], ["Owner", timesheetOwnerName], ["Department", typedTimesheetProfile?.department?.trim() || ""], ["Submitted By", typedTimesheetMonthStatus?.submittedByName?.trim() || ""],
    ["Submitted At", typedTimesheetMonthStatus?.submittedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.submittedAt) : ""],
    ["Employee Declaration", typedTimesheetMonthStatus?.employeeDeclarationAccepted ? "Confirmed" : "Pending"],
    ["Employee Declaration Accepted At", typedTimesheetMonthStatus?.employeeDeclarationAcceptedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.employeeDeclarationAcceptedAt) : ""],
    ["Reviewed By", typedTimesheetMonthStatus?.reviewedByName?.trim() || ""],
    ["Reviewed At", typedTimesheetMonthStatus?.reviewedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.reviewedAt) : ""],
    ["Reviewer Declaration", typedTimesheetMonthStatus?.reviewerDeclarationAccepted ? "Confirmed" : "Pending"],
    ["Reviewer Declaration Accepted At", typedTimesheetMonthStatus?.reviewerDeclarationAcceptedAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt) : ""],
    ["Handed Off By", typedTimesheetMonthStatus?.handedOffByName?.trim() || ""],
    ["Handed Off At", typedTimesheetMonthStatus?.handedOffAt ? helpers.formatPlannerDateTime(typedTimesheetMonthStatus.handedOffAt) : ""],
    ["Workflow Status", timesheetMonthStatusLabel], ["Submission Note", typedTimesheetMonthStatus?.submissionNote?.trim() || ""], ["Review Note", typedTimesheetMonthStatus?.reviewNote?.trim() || ""], ["Handoff Note", typedTimesheetMonthStatus?.handoffNote?.trim() || ""], [], ["Employee Declaration Text"], [plannerTimesheetDeclarationText], [], ["Reviewer Declaration Text"], [plannerTimesheetReviewerDeclarationText],
  ];
  const approvalCertificateSheet = XLSX.utils.aoa_to_sheet(approvalCertificateRows);
  approvalCertificateSheet["!cols"] = [{ wch: 28 }, { wch: 80 }];

  const comparisonRows: (string | number)[][] = [
    ["Month Comparison"], [], ["Current Month", monthLabel], ["Previous Month", timesheetMonthComparison.previousMonthLabel], ["Previous Data Found", timesheetMonthComparison.hasPreviousData ? "Yes" : "No"], ["Matched Days", timesheetDayComparisonSummary.same], ["Changed Days", timesheetDayComparisonSummary.changed], ["New Days", timesheetDayComparisonSummary.newDays], ["Missing Days", timesheetDayComparisonSummary.missing], [],
    ["Metric", "Current", "Previous", "Change"],
    ["Logged Hours", helpers.formatMinutesAsDuration(timesheetSummary.workedMinutes), helpers.formatMinutesAsDuration(previousTimesheetSummary.workedMinutes), helpers.formatVarianceMinutes(timesheetMonthComparison.workedMinutesDelta)],
    ["Tracked Days", timesheetSummary.activeDays, previousTimesheetSummary.activeDays, timesheetMonthComparison.trackedDaysDelta],
    ["Personal Leave Days", helpers.formatLeaveDays(timesheetSummary.personalLeaveDays), helpers.formatLeaveDays(previousTimesheetSummary.personalLeaveDays), timesheetMonthComparison.personalLeaveDaysDelta > 0 ? `+${helpers.formatLeaveDays(timesheetMonthComparison.personalLeaveDaysDelta)}` : helpers.formatLeaveDays(timesheetMonthComparison.personalLeaveDaysDelta)],
    ["Total Ticks", timesheetSummary.totalTicks, previousTimesheetSummary.totalTicks, timesheetMonthComparison.totalTicksDelta],
    ["Variance", helpers.formatVarianceMinutes(timesheetSummary.varianceMinutes), helpers.formatVarianceMinutes(previousTimesheetSummary.varianceMinutes), helpers.formatVarianceMinutes(timesheetMonthComparison.varianceDelta)], [], ["Top Activity Shifts"], ["Activity", "Current", "Previous", "Change"],
    ...(timesheetMonthComparison.topActivityShifts.length > 0 ? timesheetMonthComparison.topActivityShifts.map((row: AnyPlannerRow) => [row.label, row.currentCount, row.previousCount, row.delta > 0 ? `+${row.delta}` : String(row.delta)]) : [["No activity changes found", "", "", ""]]),
  ];
  const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonRows);
  comparisonSheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];

  const dayComparisonRows: (string | number)[][] = [
    ["Day Comparison"], [], ["Date", "Status", "Detail", "Current Net Hours", "Previous Net Hours", "Current Ticks", "Previous Ticks"],
    ...timesheetMonthRows.map((row) => {
      const previousEntry = previousTimesheetEntriesByDayNumber.get(row.date.getDate()) ?? null;
      const previousWorkedMinutes = previousEntry ? getNetWorkedMinutes(previousEntry.startTime, previousEntry.endTime, previousEntry.lunchBreakMinutes, previousEntry.teaBreakMinutes) : null;
      const previousTickCount = Array.isArray(previousEntry?.selectedOptionIds) ? previousEntry.selectedOptionIds.length : 0;
      return [row.dateKey, row.comparisonStatus === "same" ? "Same" : row.comparisonStatus === "changed" ? "Changed" : row.comparisonStatus === "new" ? "New" : row.comparisonStatus === "missing" ? "Missing" : "None", row.comparisonDetail, row.workedMinutes === null ? "" : helpers.formatMinutesAsDuration(row.workedMinutes), previousWorkedMinutes === null ? "" : helpers.formatMinutesAsDuration(previousWorkedMinutes), row.checkedCount, previousTickCount];
    }),
  ];
  const dayComparisonSheet = XLSX.utils.aoa_to_sheet(dayComparisonRows);
  dayComparisonSheet["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 40 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, currentDate.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" }));
  XLSX.utils.book_append_sheet(workbook, monthStatusSheet, "Month Status");
  XLSX.utils.book_append_sheet(workbook, monthHistorySheet, "Month History");
  XLSX.utils.book_append_sheet(workbook, approvalCertificateSheet, "Approval Certificate");
  XLSX.utils.book_append_sheet(workbook, comparisonSheet, "Month Comparison");
  XLSX.utils.book_append_sheet(workbook, dayComparisonSheet, "Day Comparison");
  XLSX.utils.book_append_sheet(workbook, weeklySummarySheet, "Weekly Summary");
  XLSX.utils.book_append_sheet(workbook, attentionSheet, "Attention");
  XLSX.utils.book_append_sheet(workbook, personalLeaveSheet, "Personal Leave");
  XLSX.utils.book_append_sheet(workbook, leaveOverrideHistorySheet, "Leave Override Review");
  XLSX.utils.book_append_sheet(workbook, availabilitySheet, "Availability");
  XLSX.utils.book_append_sheet(workbook, holidaysSheet, "Holiday Calendar");
  XLSX.utils.book_append_sheet(workbook, guidelinesSheet, "Guidelines");
  const stamp = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `textpoint-timesheet-${stamp}.xlsx`);
}
