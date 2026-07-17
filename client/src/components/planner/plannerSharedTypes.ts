import type { Column } from "@/components/DataTable";

export type PlannerUserLite = {
  name?: string | null;
};

export type PlannerTimesheetProfileLite = {
  createdAt: string | Date;
  department: string | null;
  fridayEndTime: string | null;
  fridayTemplateId: number | null;
  fridayStartTime: string | null;
  id: number;
  leaveYearStartMonth: number;
  lunchBreakMinutes: number;
  monThuEndTime: string | null;
  monThuTemplateId: number | null;
  monThuStartTime: string | null;
  personalLeaveAllowanceDays: number | null;
  personalLeaveCarryOverDays: number;
  signatureName: string | null;
  teaBreakMinutes: number;
  updatedAt: string | Date;
  userId: number;
  weekendEndTime: string | null;
  weekendStartTime: string | null;
  weekendTemplateId: number | null;
};

export type PlannerTimesheetOptionLite = {
  createdAt: string | Date;
  description: string | null;
  hoursCategory: string;
  id: number;
  isActive: boolean;
  label: string;
  sortOrder: number;
  updatedAt: string | Date;
  userId: number;
};

export type PlannerTimesheetEntryLite = {
  createdAt: string | Date;
  endTime: string | null;
  entryDate: string | Date;
  id: number;
  leavePortionPercent: number | null;
  lunchBreakMinutes: number | null;
  remarks: string | null;
  selectedOptionIds: number[];
  startTime: string | null;
  teaBreakMinutes: number | null;
  updatedAt: string | Date;
  userId: number;
};

export type PlannerTimesheetTemplateLite = {
  createdAt: string | Date;
  description: string | null;
  endTime: string | null;
  id: number;
  isActive: boolean;
  label: string;
  leavePortionPercent: number | null;
  lunchBreakMinutes: number | null;
  remarks: string | null;
  selectedOptionIds: number[];
  startTime: string | null;
  teaBreakMinutes: number | null;
  updatedAt: string | Date;
  userId: number;
};

export type PlannerTimesheetHolidayLite = {
  createdAt: string | Date;
  holidayDate: string | Date;
  holidayType: string;
  id: number;
  label: string;
  notes: string | null;
  updatedAt: string | Date;
  userId: number;
};

export type PlannerTimesheetHistoryEventLite = {
  actionLabel: string;
  actorName: string | null;
  createdAt: string | Date;
  id: string;
  note: string | null;
  resultingStatus: string;
};

export type PlannerTimesheetMonthStatusLite = {
  employeeDeclarationAccepted: boolean;
  employeeDeclarationAcceptedAt: string | Date | null;
  handedOffAt: string | Date | null;
  handedOffByName: string | null;
  handoffNote: string | null;
  lockedAt: string | Date | null;
  reviewNote: string | null;
  reviewedAt: string | Date | null;
  reviewedByName: string | null;
  reviewerDeclarationAccepted: boolean;
  reviewerDeclarationAcceptedAt: string | Date | null;
  submissionNote: string | null;
  submittedAt: string | Date | null;
  submittedByName: string | null;
} | null;

export type PlannerTimesheetSummaryLite = {
  activeDays: number;
  expectedMinutes: number;
  personalLeaveDays: number;
  totalTicks: number;
  varianceMinutes: number;
  workedMinutes: number;
};

export type PlannerPreviousTimesheetSummaryLite = PlannerTimesheetSummaryLite & {
  monthLabel: string;
};

export type PlannerTimesheetDayComparisonSummaryLite = {
  changed: number;
  missing: number;
  newDays: number;
  same: number;
};

export type PlannerTimesheetMonthComparisonLite = {
  hasPreviousData: boolean;
  personalLeaveDaysDelta: number;
  previousMonthLabel: string;
  topActivityShifts: Array<{
    currentCount: number;
    delta: number;
    label: string;
    optionId: number;
    previousCount: number;
  }>;
  totalTicksDelta: number;
  trackedDaysDelta: number;
  varianceDelta: number;
  workedMinutesDelta: number;
};

export type PlannerTimesheetCompletionSummaryLite = {
  completedWorkingDays: number;
  completionPercent: number;
  dueWorkingDays: number;
};

export type PlannerTimesheetAttentionRowLite = {
  category: "missing" | "hours" | "short" | "overtime" | "activity";
  date: Date;
  dateKey: string;
  dayLabel: string;
  detail: string;
  id: string;
  issueLabel: string;
};

export type PlannerTimesheetAvailabilityFilterLite =
  | "all"
  | "worked"
  | "leave"
  | "holiday"
  | "review"
  | "empty";

export type PlannerTimesheetTeamAttentionRowLite = {
  category: "review" | "returned" | "blocked" | "warning" | "handoff" | "override_review";
  detail: string;
  entryDate?: string | Date | null;
  id: string;
  monthDate: string | Date;
  priority: "high" | "medium" | "low";
  statusLabel: string;
  submittedAt: string | Date | null;
  userEmail: string | null;
  userId: number;
  userName: string;
  waitingDays: number | null;
};

export type PlannerTimesheetRowLite = {
  checkedCount: number;
  checkedOptionIds: number[];
  checkedOptions: Array<{
    createdAt: string | Date;
    description: string | null;
    hoursCategory: string;
    id: number;
    isActive: boolean;
    label: string;
    sortOrder: number;
    updatedAt: string | Date;
    userId: number;
  }>;
  comparisonDetail: string;
  comparisonStatus: "same" | "changed" | "new" | "missing" | "none";
  date: Date;
  dateKey: string;
  dayLabel: string;
  endTime: string;
  expectedMinutes: number;
  grossWorkedMinutes: number | null;
  hasLeavePortion: boolean;
  hasNonWorkingActivity: boolean;
  hasSavedEntry: boolean;
  hasWorkingActivity: boolean;
  id: string;
  isHoliday: boolean;
  isNonWorkingDay: boolean;
  isPartialLeaveDay: boolean;
  holidayLabel: string | null;
  leavePortionDays: number;
  leavePortionPercent: number | null;
  lunchBreakMinutes: number;
  remarks: string;
  startTime: string;
  teaBreakMinutes: number;
  varianceMinutes: number | null;
  workedMinutes: number | null;
};

export type PlannerTimesheetOptionSummaryLite = {
  description: string;
  id: string;
  label: string;
  optionId: number;
  usedDays: number;
};

export type PlannerTimesheetLeaveRowLite = {
  comparisonStatus: "same" | "changed" | "new" | "missing" | "none";
  date: Date;
  dateKey: string;
  dayLabel: string;
  hasLeaveOverride: boolean;
  id: string;
  leaveLabels: string[];
  leavePortionDays: number;
  leavePortionPercent: number | null;
  leaveSummary: string;
  overrideNote: string | null;
  overrideReviewedAt: string | Date | null;
  overrideReviewedByName: string | null;
  overrideReviewNote: string | null;
  overrideReviewStatus: "pending" | "reviewed" | null;
  remarks: string;
};

export type PlannerTimesheetLeaveBreakdownRowLite = {
  id: string;
  label: string;
  usedDays: number;
};

export type PlannerTimesheetLeaveBlockRowLite = {
  endDate: Date;
  endDateKey: string;
  endDayLabel: string;
  entryDateKeys: string[];
  hasLeaveOverride: boolean;
  id: string;
  latestOverrideNote: string | null;
  latestOverrideReviewNote: string | null;
  latestOverrideReviewedAt: string | Date | null;
  latestOverrideReviewedByName: string | null;
  leaveLabels: string[];
  leavePortionDays: number;
  leavePortionPercent: number | null;
  leaveSummary: string;
  overrideLeaveDays: number;
  overrideReviewStatus: "none" | "pending" | "mixed" | "reviewed";
  pendingOverrideReviewCount: number;
  remarks: string;
  reviewedOverrideCount: number;
  sharedHolidayGapDays: number;
  spanDays: number;
  startDate: Date;
  startDateKey: string;
  startDayLabel: string;
  usedDays: number;
  weekendLeaveDays: number;
  workingLeaveDays: number;
};

export type PlannerTimesheetWeekRowLite = {
  blockerCount: number;
  completedWorkingDays: number;
  completionPercent: number;
  dueWorkingDays: number;
  endDate: Date;
  expectedMinutes: number;
  id: string;
  loggedDays: number;
  nextActionDate: Date | null;
  nextActionDetail: string;
  nextActionLabel: string;
  overtimeMinutes: number;
  rangeLabel: string;
  readinessStatus: "upcoming" | "needs_work" | "warnings" | "ready" | "in_progress";
  shortMinutes: number;
  startDate: Date;
  varianceMinutes: number;
  warningCount: number;
  weekLabel: string;
  workedMinutes: number;
};

export type PlannerTimesheetLeaveOverrideBlockRowLite = {
  department: string | null;
  endDate: string | Date;
  endDateKey: string;
  entryDateKeys: string[];
  entryDates: Array<string | Date>;
  id: string;
  latestLoggedAt: string | Date | null;
  latestReviewNote: string | null;
  latestReviewedAt: string | Date | null;
  latestReviewedByName: string | null;
  leavePortionDays: number;
  leavePortionPercent: number;
  leaveRemainingDays: number | null;
  leaveSummary: string;
  leaveTypes: string[];
  monthDate: string | Date;
  oldestPendingLoggedAt: string | Date | null;
  overrideNote: string;
  pendingReviewCount: number;
  reviewStatus: "pending" | "mixed" | "reviewed";
  reviewedCount: number;
  role: string;
  sharedHolidayGapDays: number;
  sharedHolidayLabels: string[];
  spanDays: number;
  startDate: string | Date;
  startDateKey: string;
  usedDays: number;
  userEmail: string | null;
  userId: number;
  userName: string;
  weekendLeaveDays: number;
  workingLeaveDays: number;
  workflowStatus: string;
};

export type PlannerTimesheetDepartmentCoveragePreviewRowLite = {
  alreadyOnLeave: boolean;
  coveragePercent: number;
  currentlyOffCount: number;
  date: string | Date;
  dateKey: string;
  hasSharedHoliday: boolean;
  isWeekend: boolean;
  projectedAvailableCount: number;
  projectedPeopleOffCount: number;
  severity: "high" | "medium" | null;
  severityLabel: string | null;
  sharedHolidayLabels: string[];
  skipReason: string | null;
  triggerLabel: string;
  weekdayLabel: string;
  willApply: boolean;
};

export type PlannerTimesheetDepartmentCoveragePreviewLite = {
  departmentLabel: string | null;
  headcount: number;
  previewRows: PlannerTimesheetDepartmentCoveragePreviewRowLite[];
  rule: {
    department: string;
    highRiskPercent: number;
    maximumPeopleOff: number | null;
    mediumRiskPercent: number;
    minimumAvailableCount: number | null;
    notes: string | null;
  } | null;
  summary: {
    alreadyOnLeaveDays: number;
    appliedDays: number;
    highRiskDays: number;
    mediumRiskDays: number;
    sharedHolidaySkippedDays: number;
    weekendSkippedDays: number;
  };
};

export type PlannerTimesheetLeaveBalancePreviewYearSummaryLite = {
  appliedCalendarDays: number;
  appliedWorkingLeaveDays: number;
  availableDays: number | null;
  currentRemainingDays: number | null;
  currentYearUsedDays: number;
  exceedsAllowanceByDays: number;
  leaveYearEndDate: string | Date;
  leaveYearStartDate: string | Date;
  leaveYearStartMonth: number;
  netLeaveDaysChange: number;
  projectedRemainingDays: number | null;
  projectedYearUsedDays: number;
  replacedLeaveDays: number;
};

export type PlannerTimesheetLeaveBalancePreviewLite = {
  allowanceDays: number | null;
  carryOverDays: number;
  leavePortionPercent: number;
  skippedExisting: number;
  skippedSharedHolidays: number;
  skippedWeekends: number;
  yearSummaries: PlannerTimesheetLeaveBalancePreviewYearSummaryLite[];
};

export type PlannerDefaultTimesheetHoursLite = {
  fridayEndTime: string;
  fridayStartTime: string;
  lunchBreakMinutes: number;
  monThuEndTime: string;
  monThuStartTime: string;
  teaBreakMinutes: number;
};

export type PlannerTimesheetProfileHoursLite = {
  endTime: string;
  lunchBreakMinutes: number;
  startTime: string;
  teaBreakMinutes: number;
};

export type PlannerDefaultTimesheetProfileHoursLite = {
  fridayEndTime: string;
  fridayStartTime: string;
  lunchBreakMinutes: number;
  monThuEndTime: string;
  monThuStartTime: string;
  teaBreakMinutes: number;
  weekendEndTime: string;
  weekendStartTime: string;
};

export type PlannerTimesheetReviewTargetLite = {
  entryDate?: string | Date | null;
  monthDate: string | Date;
  userEmail: string | null;
  userId: number;
  userName: string;
};

export type PlannerTimesheetReviewQueueDashboardRowLite = {
  blockerCount: number;
  employeeDeclarationAccepted: boolean;
  employeeDeclarationAcceptedAt: string | Date | null;
  id: number;
  lockedAt: string | Date | null;
  monthDate: string | Date;
  reviewNote: string | null;
  reviewedAt: string | Date | null;
  reviewedByName: string | null;
  reviewerDeclarationAccepted: boolean;
  reviewerDeclarationAcceptedAt: string | Date | null;
  status: string;
  statusNote: string | null;
  submissionNote: string | null;
  submittedAt: string | Date | null;
  submittedByName: string | null;
  userEmail: string | null;
  userId: number;
  userName: string;
  waitingDays: number | null;
  warningCount: number;
};

export type PlannerTimesheetTeamSummaryLite = {
  approvedCount: number;
  blockedCount: number;
  handedOffCount: number;
  overdueReviewCount: number;
  returnedCount: number;
  submittedCount: number;
  warningsOnlyCount: number;
};

export type PlannerTimesheetTeamLeaveSummaryLite = {
  overrideLeaveBlockCount: number;
  overrideLeaveDays: number;
  peopleOnLeaveCount: number;
  peopleWithLeaveCount: number;
  peopleWithOverrideCount: number;
  sharedHolidayDays: number;
  teamLeaveDays: number;
  upcomingLeaveCount: number;
};

export type PlannerTimesheetLeaveOverrideRegisterSummaryLite = {
  halfDayOverrideCount: number;
  holidayOverlapCount: number;
  overduePendingReviewCount: number;
  overrideEntryCount: number;
  pendingReviewCount: number;
  reviewedCount: number;
};

export type PlannerTimesheetLeaveOverrideBlockSummaryLite = {
  blockCount: number;
  mixedBlockCount: number;
  overduePendingBlockCount: number;
  pendingBlockCount: number;
  reviewedBlockCount: number;
};

export type PlannerTimesheetDepartmentLeaveSummaryLite = {
  departmentsOnLeaveToday: number;
  departmentsWithLeave: number;
  peakCoverageDepartment: string;
  peakCoveragePercent: number;
};

export type PlannerTimesheetTeamLeaveCalendarSummaryLite = {
  multiPersonLeaveDays: number;
  peakLeaveLoad: number;
  sharedHolidayCalendarDays: number;
  todayLeaveLoad: number;
};

export type PlannerTimesheetTeamLeaveCoverageSummaryLite = {
  highRiskDays: number;
  mediumRiskDays: number;
  peakCoveragePercent: number;
  sharedHolidayOverlapDays: number;
};

export type PlannerTimesheetDepartmentCoverageSummaryLite = {
  configuredRuleCount: number;
  highRiskDepartmentDays: number;
  impactedDepartments: number;
  mediumRiskDepartmentDays: number;
  peakDepartmentCoveragePercent: number;
  unconfiguredAlertDepartments: number;
};

export type PlannerTimesheetAvailabilitySummaryLite = {
  all: number;
  empty: number;
  holiday: number;
  leave: number;
  review: number;
  worked: number;
};

export type PlannerTimesheetPersonalLeaveOverrideSummaryLite = {
  overrideDayCount: number;
  overrideLeaveDays: number;
  pendingBlockCount: number;
  pendingDayCount: number;
  reviewedBlockCount: number;
  reviewedDayCount: number;
};

export type PlannerTimesheetLeaveRangePreviewInputLite = {
  fromDate: string | Date;
  impactAcknowledged?: boolean;
  impactOverrideReason?: string;
  includeWeekends: boolean;
  leaveOptionId?: number;
  leavePortionPercent: number;
  overwriteExisting: boolean;
  remarks?: string;
  skipSharedHolidays: boolean;
  toDate: string | Date;
  userId?: number;
};

export type PlannerColumn<T extends { id: string | number }> = Column<T>;
