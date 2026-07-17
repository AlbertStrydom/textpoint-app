export type AnyPlannerSummaryRow = Record<string, any>;

export function buildPlannerTimesheetTeamLeaveSummary(
  timesheetTeamLeaveRows: AnyPlannerSummaryRow[]
) {
  const teamLeaveDays = timesheetTeamLeaveRows.reduce(
    (sum, row) => sum + Number(row.personalLeaveDays || 0),
    0
  );
  const overrideLeaveDays = timesheetTeamLeaveRows.reduce(
    (sum, row) => sum + Number(row.overrideLeaveDays || 0),
    0
  );
  const overrideLeaveBlockCount = timesheetTeamLeaveRows.reduce(
    (sum, row) => sum + Number(row.overrideLeaveBlockCount || 0),
    0
  );
  const peopleOnLeaveCount = timesheetTeamLeaveRows.filter((row) => row.activeLeaveToday).length;
  const upcomingLeaveCount = timesheetTeamLeaveRows.filter(
    (row) => !row.activeLeaveToday && row.upcomingLeave
  ).length;
  const peopleWithLeaveCount = timesheetTeamLeaveRows.filter(
    (row) => Number(row.personalLeaveDays || 0) > 0
  ).length;
  const peopleWithOverrideCount = timesheetTeamLeaveRows.filter((row) => row.hasLeaveOverride).length;
  const sharedHolidayDays = timesheetTeamLeaveRows.reduce(
    (sum, row) => sum + Number(row.sharedHolidayDays || 0),
    0
  );

  return {
    teamLeaveDays,
    overrideLeaveDays,
    overrideLeaveBlockCount,
    peopleOnLeaveCount,
    upcomingLeaveCount,
    peopleWithLeaveCount,
    peopleWithOverrideCount,
    sharedHolidayDays,
  };
}

export function buildPlannerTimesheetLeaveOverrideRegisterSummary(
  timesheetLeaveOverrideRegisterRows: AnyPlannerSummaryRow[],
  timesheetPendingLeaveOverrideQueueRows: AnyPlannerSummaryRow[]
) {
  const overrideEntryCount = timesheetLeaveOverrideRegisterRows.length;
  const halfDayOverrideCount = timesheetLeaveOverrideRegisterRows.filter(
    (row) => Number(row.leavePortionPercent) === 50
  ).length;
  const holidayOverlapCount = timesheetLeaveOverrideRegisterRows.filter(
    (row) => row.sharedHolidayLabels.length > 0
  ).length;
  const reviewedCount = timesheetLeaveOverrideRegisterRows.filter(
    (row) => row.reviewStatus === "reviewed"
  ).length;
  const pendingReviewCount = timesheetLeaveOverrideRegisterRows.filter(
    (row) => row.reviewStatus !== "reviewed"
  ).length;
  const overduePendingReviewCount = timesheetPendingLeaveOverrideQueueRows.filter(
    (row) => row.waitingDays >= 2
  ).length;

  return {
    overrideEntryCount,
    halfDayOverrideCount,
    holidayOverlapCount,
    reviewedCount,
    pendingReviewCount,
    overduePendingReviewCount,
  };
}

export function buildPlannerTimesheetLeaveOverrideBlockSummary(
  timesheetLeaveOverrideBlockRows: AnyPlannerSummaryRow[],
  timesheetPendingLeaveOverrideBlockQueueRows: AnyPlannerSummaryRow[]
) {
  const pendingBlockCount = timesheetPendingLeaveOverrideBlockQueueRows.length;
  const overduePendingBlockCount = timesheetPendingLeaveOverrideBlockQueueRows.filter(
    (row) => row.waitingDays >= 2
  ).length;
  const reviewedBlockCount = timesheetLeaveOverrideBlockRows.filter(
    (row) => row.reviewStatus === "reviewed"
  ).length;
  const mixedBlockCount = timesheetLeaveOverrideBlockRows.filter(
    (row) => row.reviewStatus === "mixed"
  ).length;

  return {
    blockCount: timesheetLeaveOverrideBlockRows.length,
    pendingBlockCount,
    overduePendingBlockCount,
    reviewedBlockCount,
    mixedBlockCount,
  };
}

export function buildPlannerTimesheetDepartmentLeaveSummary(
  timesheetDepartmentLeaveRows: AnyPlannerSummaryRow[]
) {
  const departmentsWithLeave = timesheetDepartmentLeaveRows.filter(
    (row) => row.peopleWithLeaveCount > 0 || row.peopleOnLeaveCount > 0
  ).length;
  const departmentsOnLeaveToday = timesheetDepartmentLeaveRows.filter(
    (row) => row.peopleOnLeaveCount > 0
  ).length;
  const peakCoverageRow =
    timesheetDepartmentLeaveRows.reduce<AnyPlannerSummaryRow | null>((highest, row) => {
      if (!highest || row.coveragePercent > highest.coveragePercent) {
        return row;
      }
      if (
        highest &&
        row.coveragePercent === highest.coveragePercent &&
        row.totalLeaveDays > highest.totalLeaveDays
      ) {
        return row;
      }
      return highest;
    }, null) ?? null;

  return {
    departmentsWithLeave,
    departmentsOnLeaveToday,
    peakCoveragePercent: peakCoverageRow?.coveragePercent ?? 0,
    peakCoverageDepartment: peakCoverageRow?.departmentLabel ?? "None",
  };
}

export function buildPlannerTimesheetTeamLeaveCalendarSummary(
  timesheetTeamLeaveCalendarRows: AnyPlannerSummaryRow[]
) {
  const multiPersonLeaveDays = timesheetTeamLeaveCalendarRows.filter(
    (row) => row.peopleOnLeaveCount >= 2
  ).length;
  const sharedHolidayCalendarDays = timesheetTeamLeaveCalendarRows.filter(
    (row) => row.sharedHolidayCount > 0
  ).length;
  const peakLeaveLoad = timesheetTeamLeaveCalendarRows.reduce(
    (highest, row) => Math.max(highest, row.peopleOnLeaveCount),
    0
  );
  const todayLeaveLoad =
    timesheetTeamLeaveCalendarRows.find((row) => row.isToday)?.peopleOnLeaveCount ?? 0;

  return {
    multiPersonLeaveDays,
    sharedHolidayCalendarDays,
    peakLeaveLoad,
    todayLeaveLoad,
  };
}

export function buildPlannerTimesheetTeamLeaveCoverageSummary(
  timesheetTeamLeaveCoverageRows: AnyPlannerSummaryRow[]
) {
  const highRiskDays = timesheetTeamLeaveCoverageRows.filter((row) => row.severity === "high").length;
  const mediumRiskDays = timesheetTeamLeaveCoverageRows.filter(
    (row) => row.severity === "medium"
  ).length;
  const sharedHolidayOverlapDays = timesheetTeamLeaveCoverageRows.filter(
    (row) => row.sharedHolidayLabels.length > 0
  ).length;
  const peakCoveragePercent = timesheetTeamLeaveCoverageRows.reduce(
    (highest, row) => Math.max(highest, row.coveragePercent),
    0
  );

  return {
    highRiskDays,
    mediumRiskDays,
    sharedHolidayOverlapDays,
    peakCoveragePercent,
  };
}

export function buildPlannerTimesheetDepartmentCoverageSummary(
  timesheetDepartmentCoverageRows: AnyPlannerSummaryRow[],
  typedTimesheetDepartmentCoverageSettings: AnyPlannerSummaryRow[]
) {
  const highRiskDepartmentDays = timesheetDepartmentCoverageRows.filter(
    (row) => row.severity === "high"
  ).length;
  const mediumRiskDepartmentDays = timesheetDepartmentCoverageRows.filter(
    (row) => row.severity === "medium"
  ).length;
  const impactedDepartments = new Set(
    timesheetDepartmentCoverageRows.map((row) => row.departmentLabel)
  ).size;
  const peakDepartmentCoveragePercent = timesheetDepartmentCoverageRows.reduce(
    (highest, row) => Math.max(highest, row.coveragePercent),
    0
  );
  const configuredRuleCount = typedTimesheetDepartmentCoverageSettings.length;
  const unconfiguredAlertDepartments = new Set(
    timesheetDepartmentCoverageRows
      .filter((row) => row.ruleLabel === "Default thresholds")
      .map((row) => row.departmentLabel)
  ).size;

  return {
    highRiskDepartmentDays,
    mediumRiskDepartmentDays,
    impactedDepartments,
    peakDepartmentCoveragePercent,
    configuredRuleCount,
    unconfiguredAlertDepartments,
  };
}
