import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Calendar,
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Edit2,
  Link2,
  Layers3,
  Lock,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
  Unlock,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  buildPlannerIcs,
  downloadIcsFile,
  parseCalendarImportText,
} from "@/lib/calendarInterop";
import {
  buildPlannerGoLiveSnapshotText,
  buildPlannerRolloutSnapshotText,
} from "@/lib/plannerRolloutSnapshotUtils";

const loadXlsxModule = () => import("xlsx");
const PlannerCalendarOperationsPanel = lazy(() =>
  import("@/components/planner/PlannerCalendarOperationsPanel").then((module) => ({
    default: module.PlannerCalendarOperationsPanel,
  }))
);
const PlannerCalendarSurfacesPanel = lazy(() =>
  import("@/components/planner/PlannerCalendarSurfacesPanel").then((module) => ({
    default: module.PlannerCalendarSurfacesPanel,
  }))
);
const PlannerTimesheetTemplateDialogs = lazy(() =>
  import("@/components/planner/PlannerTimesheetTemplateDialogs").then((module) => ({
    default: module.PlannerTimesheetTemplateDialogs,
  }))
);
const PlannerTimesheetAdminQueuesPanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetAdminQueuesPanel").then((module) => ({
    default: module.PlannerTimesheetAdminQueuesPanel,
  }))
);
const PlannerTimesheetTeamOverviewPanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetTeamOverviewPanel").then((module) => ({
    default: module.PlannerTimesheetTeamOverviewPanel,
  }))
);
const PlannerWorkspaceHubPanel = lazy(() =>
  import("@/components/planner/PlannerWorkspaceHubPanel").then((module) => ({
    default: module.PlannerWorkspaceHubPanel,
  }))
);
const PlannerTimesheetSetupDialogs = lazy(() =>
  import("@/components/planner/PlannerTimesheetSetupDialogs").then((module) => ({
    default: module.PlannerTimesheetSetupDialogs,
  }))
);
const PlannerEntryDialogs = lazy(() =>
  import("@/components/planner/PlannerEntryDialogs").then((module) => ({
    default: module.PlannerEntryDialogs,
  }))
);
const PlannerTimesheetOperationalDialogs = lazy(() =>
  import("@/components/planner/PlannerTimesheetOperationalDialogs").then((module) => ({
    default: module.PlannerTimesheetOperationalDialogs,
  }))
);
const PlannerTimesheetMonthReviewPanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetMonthReviewPanel").then((module) => ({
    default: module.PlannerTimesheetMonthReviewPanel,
  }))
);
const PlannerTimesheetMonthWorkspacePanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetMonthWorkspacePanel").then((module) => ({
    default: module.PlannerTimesheetMonthWorkspacePanel,
  }))
);
const PlannerTimesheetAdminSummaryPanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetAdminSummaryPanel").then((module) => ({
    default: module.PlannerTimesheetAdminSummaryPanel,
  }))
);
const PlannerTimesheetInsightsPanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetInsightsPanel").then((module) => ({
    default: module.PlannerTimesheetInsightsPanel,
  }))
);
const PlannerPageHeaderPanel = lazy(() =>
  import("@/components/planner/PlannerPageHeaderPanel").then((module) => ({
    default: module.PlannerPageHeaderPanel,
  }))
);
const PlannerTimesheetShellPanel = lazy(() =>
  import("@/components/planner/PlannerTimesheetShellPanel").then((module) => ({
    default: module.PlannerTimesheetShellPanel,
  }))
);

type PlannerRecurrence = "Daily" | "Weekly" | "Monthly" | null;
type PlannerTimesheetWorkspace = "all" | "month" | "leave" | "review";
type PlannerWorkspaceStartMode = "remember" | "preferred";
type PlannerWorkspaceResumeState = Partial<
  Record<
    PlannerTimesheetWorkspace,
    {
      sectionId: string | null;
      dateKey: string | null;
    }
  >
>;
type PlannerWorkspaceShortcut = {
  id: string;
  label: string;
  workspace: PlannerTimesheetWorkspace;
  sectionId: string;
  dateKey: string | null;
  createdAt: string;
  pinned?: boolean;
};
type PlannerWorkspaceRecentView = {
  id: string;
  label: string;
  workspace: PlannerTimesheetWorkspace;
  sectionId: string;
  dateKey: string | null;
  viewedAt: string;
};
type PlannerRolloutPhaseId = "setup" | "pilot" | "employee" | "admin" | "go-live";
type PlannerRolloutPhaseNote = {
  text: string;
  updatedAt: string;
};
type PlannerRolloutPhaseNotesState = Partial<Record<PlannerRolloutPhaseId, PlannerRolloutPhaseNote>>;
type PlannerWorkspaceLinkTarget = Pick<
  PlannerWorkspaceShortcut,
  "workspace" | "sectionId" | "dateKey"
>;

type PlannerEntry = {
  id: number;
  userId: number;
  title: string;
  entryDate: string | Date;
  notes: string | null;
  reminderAt: string | Date | null;
  isComplete: boolean;
  recurrence: PlannerRecurrence | string;
  recurrenceUntil: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerOccurrence = {
  key: string;
  source: PlannerEntry;
  occurrenceDate: Date;
  reminderAt: Date | null;
  isRecurringInstance: boolean;
};

type PlannerTimesheetProfile = {
  id: number;
  userId: number;
  department: string | null;
  signatureName: string | null;
  personalLeaveAllowanceDays: number | null;
  personalLeaveCarryOverDays: number;
  leaveYearStartMonth: number;
  monThuStartTime: string | null;
  monThuEndTime: string | null;
  fridayStartTime: string | null;
  fridayEndTime: string | null;
  weekendStartTime: string | null;
  weekendEndTime: string | null;
  monThuTemplateId: number | null;
  fridayTemplateId: number | null;
  weekendTemplateId: number | null;
  lunchBreakMinutes: number;
  teaBreakMinutes: number;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetOption = {
  id: number;
  userId: number;
  label: string;
  description: string | null;
  sortOrder: number;
  hoursCategory: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetEntry = {
  id: number;
  userId: number;
  entryDate: string | Date;
  startTime: string | null;
  endTime: string | null;
  lunchBreakMinutes: number | null;
  teaBreakMinutes: number | null;
  leavePortionPercent: number | null;
  selectedOptionIds: number[];
  remarks: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetTemplate = {
  id: number;
  userId: number;
  label: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  lunchBreakMinutes: number | null;
  teaBreakMinutes: number | null;
  leavePortionPercent: number | null;
  selectedOptionIds: number[];
  remarks: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetHoliday = {
  id: number;
  userId: number;
  holidayDate: string | Date;
  label: string;
  holidayType: string;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetRow = {
  id: string;
  date: Date;
  dateKey: string;
  dayLabel: string;
  hasSavedEntry: boolean;
  checkedOptionIds: number[];
  checkedOptions: PlannerTimesheetOption[];
  checkedCount: number;
  hasWorkingActivity: boolean;
  hasNonWorkingActivity: boolean;
  hasLeavePortion: boolean;
  isPartialLeaveDay: boolean;
  isNonWorkingDay: boolean;
  isHoliday: boolean;
  holidayLabel: string | null;
  leavePortionPercent: number | null;
  leavePortionDays: number;
  startTime: string;
  endTime: string;
  lunchBreakMinutes: number;
  teaBreakMinutes: number;
  grossWorkedMinutes: number | null;
  workedMinutes: number | null;
  expectedMinutes: number;
  varianceMinutes: number | null;
  remarks: string;
  comparisonStatus: "same" | "changed" | "new" | "missing" | "none";
  comparisonDetail: string;
};

type PlannerTimesheetOptionSummary = {
  id: string;
  optionId: number;
  label: string;
  description: string;
  usedDays: number;
};

type PlannerTimesheetLeaveRow = {
  id: string;
  date: Date;
  dateKey: string;
  dayLabel: string;
  leaveLabels: string[];
  leaveSummary: string;
  leavePortionPercent: number | null;
  leavePortionDays: number;
  remarks: string;
  hasLeaveOverride: boolean;
  overrideNote: string | null;
  overrideReviewStatus: "pending" | "reviewed" | null;
  overrideReviewedAt: string | Date | null;
  overrideReviewedByName: string | null;
  overrideReviewNote: string | null;
  comparisonStatus: "same" | "changed" | "new" | "missing" | "none";
};

type PlannerTimesheetLeaveBreakdownRow = {
  id: string;
  label: string;
  usedDays: number;
};

type PlannerTimesheetLeaveBlockRow = {
  id: string;
  startDate: Date;
  endDate: Date;
  startDateKey: string;
  endDateKey: string;
  entryDateKeys: string[];
  startDayLabel: string;
  endDayLabel: string;
  leaveLabels: string[];
  leaveSummary: string;
  leavePortionPercent: number | null;
  leavePortionDays: number;
  remarks: string;
  usedDays: number;
  spanDays: number;
  workingLeaveDays: number;
  weekendLeaveDays: number;
  sharedHolidayGapDays: number;
  hasLeaveOverride: boolean;
  overrideLeaveDays: number;
  pendingOverrideReviewCount: number;
  reviewedOverrideCount: number;
  overrideReviewStatus: "none" | "pending" | "mixed" | "reviewed";
  latestOverrideNote: string | null;
  latestOverrideReviewedAt: string | Date | null;
  latestOverrideReviewedByName: string | null;
  latestOverrideReviewNote: string | null;
};

type PlannerTimesheetAvailabilityFilter =
  | "all"
  | "worked"
  | "leave"
  | "holiday"
  | "review"
  | "empty";

type PlannerTimesheetWeekRow = {
  id: string;
  weekLabel: string;
  rangeLabel: string;
  startDate: Date;
  endDate: Date;
  loggedDays: number;
  dueWorkingDays: number;
  completedWorkingDays: number;
  blockerCount: number;
  warningCount: number;
  completionPercent: number;
  readinessStatus: "upcoming" | "needs_work" | "warnings" | "ready" | "in_progress";
  nextActionDate: Date | null;
  nextActionLabel: string;
  nextActionDetail: string;
  workedMinutes: number;
  expectedMinutes: number;
  varianceMinutes: number;
  overtimeMinutes: number;
  shortMinutes: number;
};

type PlannerTimesheetAttentionRow = {
  id: string;
  date: Date;
  dateKey: string;
  dayLabel: string;
  category: "missing" | "hours" | "short" | "overtime" | "activity";
  issueLabel: string;
  detail: string;
};

type PlannerTimesheetHistoryEvent = {
  id: string;
  action: string;
  actionLabel: string;
  actorUserId: number | null;
  actorName: string | null;
  note: string | null;
  createdAt: string | Date;
  resultingStatus: string;
};

type PlannerTimesheetMonthStatus = {
  id: number;
  userId: number;
  monthDate: string | Date;
  status: string;
  statusNote: string | null;
  lockedAt: string | Date | null;
  submittedAt: string | Date | null;
  submittedByName: string | null;
  employeeDeclarationAccepted: boolean;
  employeeDeclarationAcceptedAt: string | Date | null;
  submissionNote: string | null;
  reviewedAt: string | Date | null;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  reviewerDeclarationAccepted: boolean;
  reviewerDeclarationAcceptedAt: string | Date | null;
  reviewNote: string | null;
  handedOffAt: string | Date | null;
  handedOffByUserId: number | null;
  handedOffByName: string | null;
  handoffNote: string | null;
  historyJson: PlannerTimesheetHistoryEvent[] | null;
  reopenedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetReviewQueueRow = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string | null;
  monthDate: string | Date;
  status: string;
  statusNote: string | null;
  submittedByName: string | null;
  employeeDeclarationAccepted: boolean;
  employeeDeclarationAcceptedAt: string | Date | null;
  submissionNote: string | null;
  lockedAt: string | Date | null;
  submittedAt: string | Date | null;
  reviewedAt: string | Date | null;
  reviewedByName: string | null;
  reviewerDeclarationAccepted: boolean;
  reviewerDeclarationAcceptedAt: string | Date | null;
  reviewNote: string | null;
};

type PlannerTimesheetOverviewRow = {
  id: string;
  userId: number;
  userName: string;
  userEmail: string | null;
  role: string;
  monthDate: string | Date;
  workflowStatus: string;
  dueWorkingDays: number;
  completedWorkingDays: number;
  completionPercent: number;
  blockerCount: number;
  warningCount: number;
  trackedDays: number;
  workedMinutes: number;
  expectedMinutes: number;
  submittedAt: string | Date | null;
  reviewedAt: string | Date | null;
  handedOffAt: string | Date | null;
  handedOffByName: string | null;
  handoffNote: string | null;
  lastEntryAt: string | Date | null;
};

type PlannerTimesheetOverviewDashboardRow = PlannerTimesheetOverviewRow & {
  attentionLabel: string;
  attentionDetail: string;
  submittedAgeDays: number | null;
};

type PlannerTimesheetReviewQueueDashboardRow = PlannerTimesheetReviewQueueRow & {
  waitingDays: number | null;
  blockerCount: number;
  warningCount: number;
};

type PlannerTimesheetApprovedQueueRow = PlannerTimesheetOverviewDashboardRow & {
  approvedAgeDays: number | null;
  handoffAgeDays: number | null;
};

type PlannerTimesheetTeamLeaveOverviewRow = {
  id: string;
  userId: number;
  userName: string;
  userEmail: string | null;
  role: string;
  department: string | null;
  monthDate: string | Date;
  workflowStatus: string;
  personalLeaveDays: number;
  leaveBlockCount: number;
  overrideLeaveDays: number;
  overrideLeaveBlockCount: number;
  hasLeaveOverride: boolean;
  latestOverrideDate: string | Date | null;
  latestOverrideNote: string | null;
  reviewStatus: "pending" | "reviewed";
  reviewedAt: string | Date | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  sharedHolidayDays: number;
  leaveTypes: string[];
  leaveSummary: string;
  activeLeaveToday: boolean;
  upcomingLeave: boolean;
  nextLeaveDate: string | Date | null;
  lastLeaveDate: string | Date | null;
  leaveYearUsedDays: number;
  leaveAvailableDays: number | null;
  leaveRemainingDays: number | null;
  leaveYearStartMonth: number;
  availabilityLabel: string;
  availabilityDetail: string;
};

type PlannerTimesheetLeaveOverrideRow = {
  id: string;
  userId: number;
  userName: string;
  userEmail: string | null;
  role: string;
  department: string | null;
  monthDate: string | Date;
  workflowStatus: string;
  date: string | Date;
  dateKey: string;
  leaveSummary: string;
  leaveTypes: string[];
  leavePortionPercent: number;
  leavePortionDays: number;
  loggedAt: string | Date | null;
  overrideNote: string;
  sharedHolidayLabels: string[];
  leaveRemainingDays: number | null;
  reviewStatus: "pending" | "reviewed";
  reviewedAt: string | Date | null;
  reviewedByName: string | null;
  reviewNote: string | null;
};

type PlannerTimesheetLeaveOverrideQueueRow = PlannerTimesheetLeaveOverrideRow & {
  waitingDays: number;
  priority: "high" | "medium";
  statusLabel: string;
};

type PlannerTimesheetLeaveOverrideBlockRow = {
  id: string;
  userId: number;
  userName: string;
  userEmail: string | null;
  role: string;
  department: string | null;
  monthDate: string | Date;
  workflowStatus: string;
  startDate: string | Date;
  endDate: string | Date;
  startDateKey: string;
  endDateKey: string;
  entryDates: Array<string | Date>;
  entryDateKeys: string[];
  leaveSummary: string;
  leaveTypes: string[];
  leavePortionPercent: number;
  leavePortionDays: number;
  overrideNote: string;
  usedDays: number;
  spanDays: number;
  workingLeaveDays: number;
  weekendLeaveDays: number;
  sharedHolidayGapDays: number;
  sharedHolidayLabels: string[];
  leaveRemainingDays: number | null;
  pendingReviewCount: number;
  reviewedCount: number;
  reviewStatus: "pending" | "mixed" | "reviewed";
  oldestPendingLoggedAt: string | Date | null;
  latestLoggedAt: string | Date | null;
  latestReviewedAt: string | Date | null;
  latestReviewedByName: string | null;
  latestReviewNote: string | null;
};

type PlannerTimesheetLeaveOverrideBlockQueueRow = PlannerTimesheetLeaveOverrideBlockRow & {
  waitingDays: number;
  priority: "high" | "medium";
  statusLabel: string;
};

type PlannerTimesheetTeamLeaveCalendarRow = {
  id: string;
  date: string | Date;
  dateKey: string;
  peopleOnLeaveCount: number;
  totalLeaveDays: number;
  usersOnLeave: Array<{
    userId: number;
    userName: string;
    userEmail: string | null;
  }>;
  leaveTypes: string[];
  sharedHolidayCount: number;
  sharedHolidayLabels: string[];
  isToday: boolean;
  isWeekend: boolean;
  primaryUserId: number | null;
  primaryUserName: string | null;
  primaryUserEmail: string | null;
};

type PlannerTimesheetTeamLeaveCoverageRow = {
  id: string;
  date: string | Date;
  dateKey: string;
  severity: "high" | "medium";
  severityLabel: string;
  coveragePercent: number;
  peopleOnLeaveCount: number;
  totalLeaveDays: number;
  detail: string;
  usersOnLeave: Array<{
    userId: number;
    userName: string;
    userEmail: string | null;
  }>;
  leaveTypes: string[];
  sharedHolidayLabels: string[];
  primaryUserId: number | null;
  primaryUserName: string | null;
  primaryUserEmail: string | null;
};

type PlannerTimesheetDepartmentLeaveRow = {
  id: string;
  departmentLabel: string;
  headcount: number;
  peopleOnLeaveCount: number;
  upcomingLeaveCount: number;
  peopleWithLeaveCount: number;
  totalLeaveDays: number;
  leaveBlockCount: number;
  averageRemainingDays: number | null;
  coveragePercent: number;
  nextLeaveDate: string | Date | null;
  leaveTypes: string[];
  availabilityLabel: string;
  availabilityDetail: string;
  primaryUserId: number | null;
  primaryUserName: string | null;
  primaryUserEmail: string | null;
};

type PlannerTimesheetDepartmentCoverageRow = {
  id: string;
  date: string | Date;
  dateKey: string;
  departmentLabel: string;
  departmentKey: string;
  severity: "high" | "medium";
  severityLabel: string;
  coveragePercent: number;
  peopleOnLeaveCount: number;
  headcount: number;
  availableCount: number;
  totalLeaveDays: number;
  detail: string;
  ruleLabel: string;
  triggerLabel: string;
  minimumAvailableCount: number | null;
  maximumPeopleOff: number | null;
  mediumRiskPercent: number;
  highRiskPercent: number;
  usersOnLeave: Array<{
    userId: number;
    userName: string;
    userEmail: string | null;
  }>;
  leaveTypes: string[];
  sharedHolidayLabels: string[];
  primaryUserId: number | null;
  primaryUserName: string | null;
  primaryUserEmail: string | null;
};

type PlannerTimesheetDepartmentCoverageSetting = {
  id: number;
  department: string;
  minimumAvailableCount: number | null;
  maximumPeopleOff: number | null;
  mediumRiskPercent: number;
  highRiskPercent: number;
  notes: string | null;
  createdByUserId: number | null;
  updatedByUserId: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type PlannerTimesheetDepartmentCoveragePreviewRow = {
  date: string | Date;
  dateKey: string;
  weekdayLabel: string;
  willApply: boolean;
  skipReason: string | null;
  isWeekend: boolean;
  hasSharedHoliday: boolean;
  sharedHolidayLabels: string[];
  currentlyOffCount: number;
  projectedPeopleOffCount: number;
  projectedAvailableCount: number;
  coveragePercent: number;
  severity: "high" | "medium" | null;
  severityLabel: string | null;
  triggerLabel: string;
  alreadyOnLeave: boolean;
};

type PlannerTimesheetDepartmentCoveragePreview = {
  departmentLabel: string | null;
  headcount: number;
  rule: {
    department: string;
    minimumAvailableCount: number | null;
    maximumPeopleOff: number | null;
    mediumRiskPercent: number;
    highRiskPercent: number;
    notes: string | null;
  } | null;
  previewRows: PlannerTimesheetDepartmentCoveragePreviewRow[];
  summary: {
    appliedDays: number;
    highRiskDays: number;
    mediumRiskDays: number;
    weekendSkippedDays: number;
    sharedHolidaySkippedDays: number;
    alreadyOnLeaveDays: number;
  };
};

type PlannerTimesheetLeaveBalancePreviewYearSummary = {
  leaveYearStartDate: string | Date;
  leaveYearEndDate: string | Date;
  leaveYearStartMonth: number;
  availableDays: number | null;
  currentYearUsedDays: number;
  projectedYearUsedDays: number;
  currentRemainingDays: number | null;
  projectedRemainingDays: number | null;
  appliedCalendarDays: number;
  appliedWorkingLeaveDays: number;
  netLeaveDaysChange: number;
  replacedLeaveDays: number;
  exceedsAllowanceByDays: number;
};

type PlannerTimesheetLeaveBalancePreview = {
  allowanceDays: number | null;
  carryOverDays: number;
  leavePortionPercent: number;
  skippedWeekends: number;
  skippedSharedHolidays: number;
  skippedExisting: number;
  yearSummaries: PlannerTimesheetLeaveBalancePreviewYearSummary[];
};

type PlannerTimesheetTeamAttentionRow = {
  id: string;
  userId: number;
  userName: string;
  userEmail: string | null;
  monthDate: string | Date;
  entryDate?: string | Date | null;
  category: "review" | "returned" | "blocked" | "warning" | "handoff" | "override_review";
  priority: "high" | "medium" | "low";
  statusLabel: string;
  detail: string;
  submittedAt: string | Date | null;
  waitingDays: number | null;
};

type PlannerTimesheetReviewTarget = {
  userId: number;
  userName: string;
  userEmail: string | null;
};

type SharedEventType =
  | "Meeting"
  | "Training"
  | "Deadline"
  | "Reminder"
  | "Visit"
  | "General";

type SharedPlannerEvent = {
  id: number;
  title: string;
  eventType: SharedEventType;
  branchId: number | null;
  createdByUserId: number;
  startAt: string | Date;
  endAt: string | Date | null;
  isAllDay: boolean;
  location: string | null;
  notes: string | null;
  recurrence: PlannerRecurrence | string;
  recurrenceUntil: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type SharedPlannerOccurrence = {
  key: string;
  source: SharedPlannerEvent;
  occurrenceDate: Date;
  endAt: Date | null;
  isRecurringInstance: boolean;
};

type UnifiedCalendarScope = "all" | "private" | "shared" | "operations";
type UnifiedCalendarSourceType =
  | "private_planner"
  | "shared_planner"
  | "schedule"
  | "lead_follow_up"
  | "lead_activity"
  | "level_iii"
  | "quality";

type UnifiedCalendarEvent = {
  uid: string;
  title: string;
  description: string | null;
  location?: string | null;
  startAt: string | Date;
  endAt: string | Date | null;
  allDay: boolean;
  recurrence: PlannerRecurrence | string;
  recurrenceUntil: string | Date | null;
  sourceType: UnifiedCalendarSourceType;
  sourceLabel: string;
  branchId: number | null;
  branchName: string | null;
  statusLabel: string | null;
};

type UnifiedCalendarOccurrence = {
  key: string;
  source: UnifiedCalendarEvent;
  occurrenceDate: string | Date;
  endAt: string | Date | null;
  isRecurringInstance: boolean;
};

type UnifiedCalendarRow = UnifiedCalendarOccurrence & {
  id: string;
  whenLabel: string;
  title: string;
  sourceLabel: string;
  branchName: string;
  statusLabel: string;
};

type Branch = {
  id: number;
  name: string;
};

function parsePlannerDate(value: string | Date | null | undefined) {
  if (!value) return null;

  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalisePlannerDepartmentLabel(value: string | null | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const weekday = copy.getDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  copy.setDate(copy.getDate() - daysFromMonday);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPlannerDateRange(
  startValue: string | Date | null | undefined,
  endValue: string | Date | null | undefined
) {
  const startDate = parsePlannerDate(startValue);
  const endDate = parsePlannerDate(endValue);
  if (!startDate && !endDate) return "-";
  if (!startDate) return endDate ? formatPlannerDate(endDate) : "-";
  if (!endDate) return formatPlannerDate(startDate);
  return getDateKey(startDate) === getDateKey(endDate)
    ? formatPlannerDate(startDate)
    : `${formatPlannerDate(startDate)} to ${formatPlannerDate(endDate)}`;
}

function getDateInputValue(value: string | Date | null | undefined) {
  const date = parsePlannerDate(value);
  return date ? getDateKey(date) : "";
}

function getDateTimeInputValue(value: string | Date | null | undefined) {
  const date = parsePlannerDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDateInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const [year, month, day] = trimmed.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractPlannerQueryString(location: string) {
  const queryIndex = location.indexOf("?");
  return queryIndex >= 0 ? location.slice(queryIndex + 1) : "";
}

function parsePlannerMonthParam(value: string | null) {
  if (!value?.trim()) return null;
  return parseDateInputValue(value.trim());
}

function parseDateTimeInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const DEFAULT_TIMESHEET_PROFILE_HOURS = {
  monThuStartTime: "07:00",
  monThuEndTime: "16:00",
  fridayStartTime: "07:00",
  fridayEndTime: "14:00",
  weekendStartTime: "",
  weekendEndTime: "",
  lunchBreakMinutes: 60,
  teaBreakMinutes: 30,
} as const;

function getDefaultTimesheetHours(date: Date) {
  const weekday = date.getDay();
  if (weekday >= 1 && weekday <= 4) {
    return {
      startTime: DEFAULT_TIMESHEET_PROFILE_HOURS.monThuStartTime,
      endTime: DEFAULT_TIMESHEET_PROFILE_HOURS.monThuEndTime,
    };
  }
  if (weekday === 5) {
    return {
      startTime: DEFAULT_TIMESHEET_PROFILE_HOURS.fridayStartTime,
      endTime: DEFAULT_TIMESHEET_PROFILE_HOURS.fridayEndTime,
    };
  }
  return {
    startTime: DEFAULT_TIMESHEET_PROFILE_HOURS.weekendStartTime,
    endTime: DEFAULT_TIMESHEET_PROFILE_HOURS.weekendEndTime,
  };
}

function parseTimeValue(value: string | null | undefined) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;

  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getWorkedMinutes(startTime: string | null | undefined, endTime: string | null | undefined) {
  const startMinutes = parseTimeValue(startTime);
  const endMinutes = parseTimeValue(endTime);
  if (startMinutes === null || endMinutes === null) return null;
  if (endMinutes < startMinutes) return null;
  return endMinutes - startMinutes;
}

function getExpectedTimesheetMinutes(date: Date) {
  const defaults = getDefaultTimesheetHours(date);
  return getWorkedMinutes(defaults.startTime, defaults.endTime) ?? 0;
}

function normaliseBreakMinutes(value: number | null | undefined, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

function getNetWorkedMinutes(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  lunchBreakMinutes: number | null | undefined,
  teaBreakMinutes: number | null | undefined
) {
  const grossMinutes = getWorkedMinutes(startTime, endTime);
  if (grossMinutes === null) return null;
  const deductedMinutes =
    normaliseBreakMinutes(lunchBreakMinutes) + normaliseBreakMinutes(teaBreakMinutes);
  return Math.max(grossMinutes - deductedMinutes, 0);
}

function normaliseTimesheetSelectedOptionIds(value: number[] | null | undefined) {
  return Array.isArray(value)
    ? value.map((entry) => Number(entry)).filter(Number.isFinite).sort((left, right) => left - right)
    : [];
}

function areTimesheetOptionSelectionsEqual(
  left: number[] | null | undefined,
  right: number[] | null | undefined
) {
  const normalisedLeft = normaliseTimesheetSelectedOptionIds(left);
  const normalisedRight = normaliseTimesheetSelectedOptionIds(right);
  if (normalisedLeft.length !== normalisedRight.length) {
    return false;
  }
  return normalisedLeft.every((value, index) => value === normalisedRight[index]);
}

function formatMinutesAsDuration(totalMinutes: number | null | undefined) {
  if (totalMinutes === null || totalMinutes === undefined) return "-";
  const absoluteMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatVarianceMinutes(totalMinutes: number | null | undefined) {
  if (totalMinutes === null || totalMinutes === undefined) return "-";
  if (totalMinutes === 0) return "0h 00m";
  const prefix = totalMinutes > 0 ? "+" : "-";
  return `${prefix}${formatMinutesAsDuration(totalMinutes)}`;
}

function getTimesheetAttentionBadgeVariant(
  category: PlannerTimesheetAttentionRow["category"]
): "secondary" | "outline" {
  return category === "overtime" ? "secondary" : "outline";
}

function getTimesheetWorkflowStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "handed_off") return "secondary";
  if (status === "approved") return "secondary";
  if (status === "submitted") return "default";
  if (status === "finalised" || status === "locked") return "outline";
  return "outline";
}

function getTimesheetWorkflowStatusLabel(status: string) {
  if (status === "handed_off") return "Handed Off";
  if (status === "approved") return "Approved";
  if (status === "submitted") return "Submitted";
  if (status === "finalised" || status === "locked") return "Finalised";
  return "Open";
}

function getTimesheetHoursCategoryLabel(value: string | null | undefined) {
  return value === "non_working" ? "Non-working day" : "Working activity";
}

function getTimesheetLeaveAvailabilityBadgeVariant(
  value: string
): "default" | "secondary" | "destructive" | "outline" {
  if (value === "On Leave") return "destructive";
  if (value === "Upcoming Leave") return "default";
  if (value === "Leave Logged") return "secondary";
  return "outline";
}

function getTimesheetLeaveCoverageBadgeVariant(
  value: PlannerTimesheetTeamLeaveCoverageRow["severity"]
): "destructive" | "outline" {
  return value === "high" ? "destructive" : "outline";
}

function formatLeaveDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normaliseTimesheetLeavePortionPercent(
  value: number | null | undefined
): 50 | 100 {
  return value === 50 ? 50 : value === 100 ? 100 : 100;
}

function getTimesheetLeavePortionDays(value: number | null | undefined) {
  const percent = value === 50 ? 50 : value === 100 ? 100 : 0;
  return percent / 100;
}

function getAdjustedExpectedMinutes(
  defaultExpectedMinutes: number,
  leavePortionDays: number,
  isHoliday: boolean
) {
  if (isHoliday) {
    return 0;
  }
  const safeLeavePortion = Math.max(0, Math.min(leavePortionDays, 1));
  return Math.max(Math.round(defaultExpectedMinutes * (1 - safeLeavePortion)), 0);
}

function getMonthLabel(monthNumber: number) {
  return new Date(2000, Math.min(11, Math.max(0, monthNumber - 1)), 1).toLocaleDateString(
    "en-ZA",
    { month: "long" }
  );
}

function getLeaveYearRange(currentDate: Date, startMonth: number) {
  const safeStartMonth = Math.min(12, Math.max(1, startMonth || 1));
  const currentMonthNumber = currentDate.getMonth() + 1;
  const startYear =
    currentMonthNumber >= safeStartMonth
      ? currentDate.getFullYear()
      : currentDate.getFullYear() - 1;
  const startDate = new Date(startYear, safeStartMonth - 1, 1);
  const endDate = new Date(startYear + 1, safeStartMonth - 1, 0);
  return {
    startMonth: safeStartMonth,
    startDate,
    endDate,
    label: `${getMonthLabel(safeStartMonth)} ${startDate.getFullYear()} to ${getMonthLabel(
      ((safeStartMonth + 10) % 12) + 1
    )} ${endDate.getFullYear()}`,
  };
}

function getTimesheetHolidayTypeLabel(value: string | null | undefined) {
  return value === "company_shutdown" ? "Company Shutdown" : "Public Holiday";
}

function getTimesheetAvailabilityLabel(row: PlannerTimesheetRow, hasAttention: boolean) {
  if (row.isHoliday) {
    return "Holiday";
  }
  if (row.hasLeavePortion) {
    return row.isPartialLeaveDay ? "Partial Leave" : "Leave";
  }
  if (row.isNonWorkingDay) {
    return "Leave";
  }
  if (row.hasSavedEntry && hasAttention) {
    return "Needs Review";
  }
  if (row.hasSavedEntry) {
    return "Worked";
  }
  return "No Entry";
}

function getTimesheetAvailabilityClasses(row: PlannerTimesheetRow, hasAttention: boolean) {
  if (row.isHoliday) {
    return "border-indigo-200 bg-indigo-50 text-indigo-950";
  }
  if (row.hasLeavePortion) {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950";
  }
  if (row.hasSavedEntry && hasAttention) {
    return "border-amber-200 bg-amber-50 text-amber-950";
  }
  if (row.hasSavedEntry) {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }
  return "border-slate-200 bg-white text-slate-900";
}

function matchesTimesheetAvailabilityFilter(
  row: PlannerTimesheetRow,
  hasAttention: boolean,
  filter: PlannerTimesheetAvailabilityFilter
) {
  if (filter === "all") return true;
  if (filter === "holiday") return row.isHoliday;
  if (filter === "leave") return row.hasLeavePortion && !row.isHoliday;
  if (filter === "review") return hasAttention;
  if (filter === "worked") return row.hasSavedEntry && !row.isHoliday && !row.hasLeavePortion;
  if (filter === "empty") return !row.hasSavedEntry && !row.isHoliday;
  return true;
}

function isSameDay(left: Date, right: Date) {
  return getDateKey(left) === getDateKey(right);
}

function isSameMonth(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth()
  );
}

function formatDateRangeLabel(startDate: Date, endDate: Date) {
  const sameMonth = startDate.getMonth() === endDate.getMonth();
  const startDay = String(startDate.getDate()).padStart(2, "0");
  const endDay = String(endDate.getDate()).padStart(2, "0");
  const startMonth = startDate.toLocaleDateString("en-ZA", { month: "short" });
  const endMonth = endDate.toLocaleDateString("en-ZA", { month: "short" });

  if (sameMonth) {
    return `${startDay}-${endDay} ${endMonth}`;
  }

  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function getTimesheetProfileHours(
  profile: PlannerTimesheetProfile | null | undefined,
  date: Date
) {
  const weekday = date.getDay();
  if (weekday >= 1 && weekday <= 4) {
    return {
      startTime:
        profile?.monThuStartTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.monThuStartTime,
      endTime:
        profile?.monThuEndTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.monThuEndTime,
      lunchBreakMinutes:
        profile?.lunchBreakMinutes ?? DEFAULT_TIMESHEET_PROFILE_HOURS.lunchBreakMinutes,
      teaBreakMinutes:
        profile?.teaBreakMinutes ?? DEFAULT_TIMESHEET_PROFILE_HOURS.teaBreakMinutes,
    };
  }
  if (weekday === 5) {
    return {
      startTime:
        profile?.fridayStartTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.fridayStartTime,
      endTime:
        profile?.fridayEndTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.fridayEndTime,
      lunchBreakMinutes:
        profile?.lunchBreakMinutes ?? DEFAULT_TIMESHEET_PROFILE_HOURS.lunchBreakMinutes,
      teaBreakMinutes:
        profile?.teaBreakMinutes ?? DEFAULT_TIMESHEET_PROFILE_HOURS.teaBreakMinutes,
    };
  }
  return {
    startTime: profile?.weekendStartTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.weekendStartTime,
    endTime: profile?.weekendEndTime?.trim() || DEFAULT_TIMESHEET_PROFILE_HOURS.weekendEndTime,
    lunchBreakMinutes:
      profile?.lunchBreakMinutes ?? DEFAULT_TIMESHEET_PROFILE_HOURS.lunchBreakMinutes,
    teaBreakMinutes:
      profile?.teaBreakMinutes ?? DEFAULT_TIMESHEET_PROFILE_HOURS.teaBreakMinutes,
  };
}

function formatPlannerDate(value: string | Date | null | undefined) {
  const date = parsePlannerDate(value);
  return date
    ? date.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function formatPlannerDateTime(value: string | Date | null | undefined) {
  const date = parsePlannerDate(value);
  return date
    ? date.toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

function getPlannerAgeInDays(value: string | Date | null | undefined, today: Date) {
  const date = parsePlannerDate(value);
  if (!date) return null;
  const diffMs = startOfDay(today).getTime() - startOfDay(date).getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getRecurrenceLabel(entry: PlannerEntry) {
  if (!entry.recurrence) return "Once-off";

  const until = entry.recurrenceUntil
    ? ` until ${formatPlannerDate(entry.recurrenceUntil)}`
    : "";
  return `${entry.recurrence}${until}`;
}

function getOccurrenceReminderAt(entry: PlannerEntry, occurrenceDate: Date) {
  const reminderAt = parsePlannerDate(entry.reminderAt);
  if (!reminderAt) return null;

  const reminder = new Date(occurrenceDate);
  reminder.setHours(
    reminderAt.getHours(),
    reminderAt.getMinutes(),
    reminderAt.getSeconds(),
    reminderAt.getMilliseconds()
  );
  return reminder;
}

function expandPlannerEntries(
  entries: PlannerEntry[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);
  const occurrences: PlannerOccurrence[] = [];

  for (const entry of entries) {
    const entryDate = parsePlannerDate(entry.entryDate);
    if (!entryDate) continue;

    const recurrence = entry.recurrence || null;
    const recurrenceUntil = parsePlannerDate(entry.recurrenceUntil);

    if (!recurrence) {
      if (entryDate >= start && entryDate <= end) {
        occurrences.push({
          key: `${entry.id}-${getDateKey(entryDate)}`,
          source: entry,
          occurrenceDate: entryDate,
          reminderAt: getOccurrenceReminderAt(entry, entryDate),
          isRecurringInstance: false,
        });
      }
      continue;
    }

    const seriesEnd = recurrenceUntil ? endOfDay(recurrenceUntil) : end;
    const cursor = startOfDay(entryDate);

    while (cursor <= seriesEnd && cursor <= end) {
      if (cursor >= start) {
        const occurrenceDate = new Date(cursor);
        occurrences.push({
          key: `${entry.id}-${getDateKey(occurrenceDate)}`,
          source: entry,
          occurrenceDate,
          reminderAt: getOccurrenceReminderAt(entry, occurrenceDate),
          isRecurringInstance: true,
        });
      }

      if (recurrence === "Daily") {
        cursor.setDate(cursor.getDate() + 1);
      } else if (recurrence === "Weekly") {
        cursor.setDate(cursor.getDate() + 7);
      } else if (recurrence === "Monthly") {
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        break;
      }
    }
  }

  return occurrences.sort((left, right) => {
    const dateDiff = left.occurrenceDate.getTime() - right.occurrenceDate.getTime();
    if (dateDiff !== 0) return dateDiff;

    const leftReminder = left.reminderAt?.getTime() ?? 0;
    const rightReminder = right.reminderAt?.getTime() ?? 0;
    if (leftReminder !== rightReminder) return leftReminder - rightReminder;

    return left.source.title.localeCompare(right.source.title);
  });
}

function expandSharedPlannerEvents(
  events: SharedPlannerEvent[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);
  const occurrences: SharedPlannerOccurrence[] = [];

  for (const event of events) {
    const eventStart = parsePlannerDate(event.startAt);
    const eventEnd = parsePlannerDate(event.endAt);
    if (!eventStart) continue;

    const recurrence = event.recurrence || null;
    const recurrenceUntil = parsePlannerDate(event.recurrenceUntil);

    if (!recurrence) {
      if (eventStart >= start && eventStart <= end) {
        occurrences.push({
          key: `${event.id}-${getDateKey(eventStart)}`,
          source: event,
          occurrenceDate: eventStart,
          endAt: eventEnd,
          isRecurringInstance: false,
        });
      }
      continue;
    }

    const seriesEnd = recurrenceUntil ? endOfDay(recurrenceUntil) : end;
    const cursor = new Date(eventStart);

    while (cursor <= seriesEnd && cursor <= end) {
      if (cursor >= start) {
        const occurrenceDate = new Date(cursor);
        let occurrenceEnd = eventEnd ? new Date(eventEnd) : null;

        if (occurrenceEnd) {
          const durationMs = occurrenceEnd.getTime() - eventStart.getTime();
          occurrenceEnd = new Date(occurrenceDate.getTime() + Math.max(durationMs, 0));
        }

        occurrences.push({
          key: `${event.id}-${getDateKey(occurrenceDate)}`,
          source: event,
          occurrenceDate,
          endAt: occurrenceEnd,
          isRecurringInstance: true,
        });
      }

      if (recurrence === "Daily") {
        cursor.setDate(cursor.getDate() + 1);
      } else if (recurrence === "Weekly") {
        cursor.setDate(cursor.getDate() + 7);
      } else if (recurrence === "Monthly") {
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        break;
      }
    }
  }

  return occurrences.sort((left, right) => {
    const dateDiff = left.occurrenceDate.getTime() - right.occurrenceDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return left.source.title.localeCompare(right.source.title);
  });
}

function getPlannerStatusClass(entry: PlannerEntry) {
  return entry.isComplete
    ? "bg-emerald-100 text-emerald-800"
    : "bg-slate-100 text-slate-700";
}

function getSharedEventTypeClass(eventType: SharedEventType) {
  switch (eventType) {
    case "Meeting":
      return "bg-sky-100 text-sky-800";
    case "Training":
      return "bg-emerald-100 text-emerald-800";
    case "Deadline":
      return "bg-red-100 text-red-800";
    case "Reminder":
      return "bg-amber-100 text-amber-800";
    case "Visit":
      return "bg-violet-100 text-violet-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getUnifiedSourceClass(sourceType: UnifiedCalendarSourceType) {
  switch (sourceType) {
    case "private_planner":
      return "bg-slate-100 text-slate-700";
    case "shared_planner":
      return "bg-violet-100 text-violet-800";
    case "schedule":
      return "bg-emerald-100 text-emerald-800";
    case "lead_follow_up":
      return "bg-amber-100 text-amber-800";
    case "lead_activity":
      return "bg-orange-100 text-orange-800";
    case "level_iii":
      return "bg-sky-100 text-sky-800";
    case "quality":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatUnifiedOccurrenceTiming(occurrence: UnifiedCalendarOccurrence) {
  const startAt = parsePlannerDate(occurrence.occurrenceDate);
  const endAt = parsePlannerDate(occurrence.endAt);
  if (!startAt) return "-";

  if (occurrence.source.allDay) {
    if (!endAt || isSameDay(startAt, endAt)) {
      return `All day on ${formatPlannerDate(startAt)}`;
    }

    return `${formatPlannerDate(startAt)} to ${formatPlannerDate(endAt)}`;
  }

  const startLabel = formatPlannerDateTime(startAt);
  const endLabel = endAt ? formatPlannerDateTime(endAt) : null;
  return endLabel ? `${startLabel} to ${endLabel}` : startLabel;
}

function formatSharedEventTiming(event: Pick<SharedPlannerEvent, "startAt" | "endAt" | "isAllDay">) {
  const startAt = parsePlannerDate(event.startAt);
  const endAt = parsePlannerDate(event.endAt);

  if (!startAt) return "-";

  if (event.isAllDay) {
    return endAt && getDateKey(endAt) !== getDateKey(startAt)
      ? `${formatPlannerDate(startAt)} to ${formatPlannerDate(endAt)}`
      : `All day on ${formatPlannerDate(startAt)}`;
  }

  const startLabel = formatPlannerDateTime(startAt);
  const endLabel = endAt ? formatPlannerDateTime(endAt) : null;
  return endLabel ? `${startLabel} to ${endLabel}` : startLabel;
}

function formatPlannerSectionLabelFromId(sectionId: string | null) {
  if (!sectionId?.trim()) {
    return "Planner View";
  }
  return sectionId
    .replace(/^timesheet-/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type PlannerSummary = {
  openEntries: number;
  dueToday: number;
  overdueReminders: number;
  nextSevenDays: number;
};

type SharedSummary = {
  totalEvents: number;
  thisMonth: number;
  upcomingSevenDays: number;
  branchSpecific: number;
};

type PlannerLaunchSignoffItemId =
  | "setup-reviewed"
  | "employee-flow-reviewed"
  | "admin-flow-reviewed"
  | "export-checked"
  | "leave-checked";

type PlannerLaunchSignoffState = Record<PlannerLaunchSignoffItemId, boolean>;

const ALL_SHARED_BRANCHS_VALUE = "__all_shared_branches__";
const SYSTEM_WIDE_SHARED_VALUE = "__system_wide_shared__";
const ALL_UNIFIED_BRANCHES_VALUE = "__all_unified_branches__";
const PLANNER_WORKSPACE_RESUME_STORAGE_KEY = "textpoint.planner.workspaceResumeState";
const PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY = "textpoint.planner.lastActiveWorkspace";
const PLANNER_WORKSPACE_START_MODE_STORAGE_KEY = "textpoint.planner.startMode";
const PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY = "textpoint.planner.preferredWorkspace";
const PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY = "textpoint.planner.workspaceShortcuts";
const PLANNER_WORKSPACE_RECENTS_STORAGE_KEY = "textpoint.planner.workspaceRecentViews";
const PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY = "textpoint.planner.rolloutPhaseNotes";
const PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY = "textpoint.planner.launchSignoff";
const PLANNER_TIMESHEET_DECLARATION_TEXT =
  "I confirm that this timesheet is complete and accurate to the best of my knowledge, and that the recorded hours and activities reflect the work actually performed for this month.";
const PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT =
  "I confirm that I have reviewed this submitted timesheet, checked the employee declaration, considered any remaining warnings, and approve it as ready for payroll or internal sign-off.";

export default function PlannerPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSharedDate, setSelectedSharedDate] = useState(today);
  const [sharedBranchFilter, setSharedBranchFilter] = useState(ALL_SHARED_BRANCHS_VALUE);
  const [unifiedScope, setUnifiedScope] = useState<UnifiedCalendarScope>("all");
  const [unifiedBranchFilter, setUnifiedBranchFilter] = useState(
    ALL_UNIFIED_BRANCHES_VALUE
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PlannerEntry | null>(null);
  const [isSharedFormOpen, setIsSharedFormOpen] = useState(false);
  const [editingSharedEvent, setEditingSharedEvent] = useState<SharedPlannerEvent | null>(null);
  const [isTimesheetProfileDialogOpen, setIsTimesheetProfileDialogOpen] = useState(false);
  const [isTimesheetOptionDialogOpen, setIsTimesheetOptionDialogOpen] = useState(false);
  const [isTimesheetBulkDialogOpen, setIsTimesheetBulkDialogOpen] = useState(false);
  const [isTimesheetTemplateDialogOpen, setIsTimesheetTemplateDialogOpen] = useState(false);
  const [isTimesheetTemplateApplyDialogOpen, setIsTimesheetTemplateApplyDialogOpen] =
    useState(false);
  const [isTimesheetTemplateFillDialogOpen, setIsTimesheetTemplateFillDialogOpen] =
    useState(false);
  const [isTimesheetPreviousMonthCopyDialogOpen, setIsTimesheetPreviousMonthCopyDialogOpen] =
    useState(false);
  const [isTimesheetLeaveRangeDialogOpen, setIsTimesheetLeaveRangeDialogOpen] = useState(false);
  const [isTimesheetHolidayDialogOpen, setIsTimesheetHolidayDialogOpen] = useState(false);
  const [isTimesheetHolidayApplyDialogOpen, setIsTimesheetHolidayApplyDialogOpen] =
    useState(false);
  const [isTimesheetDepartmentCoverageRuleDialogOpen, setIsTimesheetDepartmentCoverageRuleDialogOpen] =
    useState(false);
  const [editingTimesheetOption, setEditingTimesheetOption] =
    useState<PlannerTimesheetOption | null>(null);
  const [editingTimesheetTemplate, setEditingTimesheetTemplate] =
    useState<PlannerTimesheetTemplate | null>(null);
  const [editingTimesheetHoliday, setEditingTimesheetHoliday] =
    useState<PlannerTimesheetHoliday | null>(null);
  const [editingTimesheetDepartmentCoverageRule, setEditingTimesheetDepartmentCoverageRule] =
    useState<PlannerTimesheetDepartmentCoverageSetting | null>(null);
  const [editingTimesheetLeaveBlock, setEditingTimesheetLeaveBlock] =
    useState<PlannerTimesheetLeaveBlockRow | null>(null);
  const [timesheetLeaveRangePreviewValues, setTimesheetLeaveRangePreviewValues] = useState<
    Record<string, unknown>
  >({});
  const [timesheetReviewTarget, setTimesheetReviewTarget] =
    useState<PlannerTimesheetReviewTarget | null>(null);
  const [timesheetDraftStartTime, setTimesheetDraftStartTime] = useState("");
  const [timesheetDraftEndTime, setTimesheetDraftEndTime] = useState("");
  const [timesheetDraftLunchBreakMinutes, setTimesheetDraftLunchBreakMinutes] = useState(60);
  const [timesheetDraftTeaBreakMinutes, setTimesheetDraftTeaBreakMinutes] = useState(30);
  const [timesheetDraftLeavePortionPercent, setTimesheetDraftLeavePortionPercent] =
    useState<50 | 100>(100);
  const [timesheetDraftOptionIds, setTimesheetDraftOptionIds] = useState<number[]>([]);
  const [timesheetDraftRemarks, setTimesheetDraftRemarks] = useState("");
  const [timesheetAvailabilityFilter, setTimesheetAvailabilityFilter] =
    useState<PlannerTimesheetAvailabilityFilter>("all");
  const [timesheetSubmissionDeclarationAccepted, setTimesheetSubmissionDeclarationAccepted] =
    useState(false);
  const [timesheetReviewDeclarationAccepted, setTimesheetReviewDeclarationAccepted] =
    useState(false);
  const [activePlannerSectionId, setActivePlannerSectionId] = useState<string | null>(null);
  const [activePlannerWorkspace, setActivePlannerWorkspace] =
    useState<PlannerTimesheetWorkspace>("all");
  const [plannerWorkspaceResumeState, setPlannerWorkspaceResumeState] =
    useState<PlannerWorkspaceResumeState>({});
  const [plannerLastActiveWorkspace, setPlannerLastActiveWorkspace] =
    useState<PlannerTimesheetWorkspace>("all");
  const [plannerWorkspaceStartMode, setPlannerWorkspaceStartMode] =
    useState<PlannerWorkspaceStartMode>("remember");
  const [plannerPreferredWorkspace, setPlannerPreferredWorkspace] =
    useState<PlannerTimesheetWorkspace>("all");
  const [plannerWorkspaceStartupLoaded, setPlannerWorkspaceStartupLoaded] =
    useState(false);
  const [plannerWorkspaceStartupApplied, setPlannerWorkspaceStartupApplied] =
    useState(false);
  const [plannerWorkspaceShortcuts, setPlannerWorkspaceShortcuts] = useState<
    PlannerWorkspaceShortcut[]
  >([]);
  const [plannerWorkspaceRecentViews, setPlannerWorkspaceRecentViews] = useState<
    PlannerWorkspaceRecentView[]
  >([]);
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const calendarImportInputRef = useRef<HTMLInputElement | null>(null);
  const unifiedRangeStart = useMemo(() => addDays(today, -7), [today]);
  const unifiedRangeEnd = useMemo(() => addDays(today, 60), [today]);

  const { data: entries = [], isLoading, refetch } = trpc.planner.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: feedInfo, refetch: refetchFeedInfo } = trpc.planner.feedInfo.useQuery();
  const {
    data: sharedEvents = [],
    isLoading: sharedEventsLoading,
    refetch: refetchSharedEvents,
  } = trpc.planner.shared.list.useQuery();
  const {
    data: unifiedOccurrences = [],
    isLoading: unifiedEventsLoading,
    refetch: refetchUnifiedOccurrences,
  } = trpc.planner.unified.list.useQuery({
    scope: unifiedScope,
    branchId:
      unifiedBranchFilter === ALL_UNIFIED_BRANCHES_VALUE
        ? undefined
        : Number(unifiedBranchFilter),
    fromDate: unifiedRangeStart,
    toDate: unifiedRangeEnd,
  });
  const createMutation = trpc.planner.create.useMutation();
  const updateMutation = trpc.planner.update.useMutation();
  const deleteMutation = trpc.planner.delete.useMutation();
  const rotateFeedTokenMutation = trpc.planner.rotateFeedToken.useMutation();
  const createSharedMutation = trpc.planner.shared.create.useMutation();
  const updateSharedMutation = trpc.planner.shared.update.useMutation();
  const deleteSharedMutation = trpc.planner.shared.delete.useMutation();
  const timesheetTargetUserId = timesheetReviewTarget?.userId ?? user?.id ?? null;
  const isViewingAnotherTimesheet =
    Boolean(timesheetTargetUserId) && Boolean(user?.id) && timesheetTargetUserId !== user?.id;
  const { data: timesheetProfile, refetch: refetchTimesheetProfile } =
    trpc.planner.timesheets.profile.useQuery(
    {
      userId: timesheetTargetUserId ?? undefined,
    },
    {
      enabled: Boolean(timesheetTargetUserId),
    }
    );
  const { data: timesheetOptions = [], refetch: refetchTimesheetOptions } =
    trpc.planner.timesheets.options.list.useQuery(
      {
        userId: timesheetTargetUserId ?? undefined,
      },
      {
        enabled: Boolean(timesheetTargetUserId),
      }
    );
  const { data: timesheetTemplates = [], refetch: refetchTimesheetTemplates } =
    trpc.planner.timesheets.templates.list.useQuery(undefined, {
      enabled: Boolean(user?.id),
    });
  const holidayRangeStart = useMemo(
    () => new Date(currentDate.getFullYear(), 0, 1),
    [currentDate]
  );
  const holidayRangeEnd = useMemo(
    () => new Date(currentDate.getFullYear(), 11, 31),
    [currentDate]
  );
  const { data: timesheetHolidays = [], refetch: refetchTimesheetHolidays } =
    trpc.planner.timesheets.holidays.list.useQuery(
      {
        userId: timesheetTargetUserId ?? undefined,
        fromDate: holidayRangeStart,
        toDate: holidayRangeEnd,
      },
      {
        enabled: Boolean(timesheetTargetUserId),
      }
    );
  const saveTimesheetProfileMutation = trpc.planner.timesheets.saveProfile.useMutation();
  const createTimesheetHolidayMutation = trpc.planner.timesheets.holidays.create.useMutation();
  const updateTimesheetHolidayMutation = trpc.planner.timesheets.holidays.update.useMutation();
  const deleteTimesheetHolidayMutation = trpc.planner.timesheets.holidays.delete.useMutation();
  const applyTimesheetHolidaysMutation = trpc.planner.timesheets.holidays.applyMonth.useMutation();
  const fillTimesheetMonthFromTemplatesMutation =
    trpc.planner.timesheets.fillMonthFromTemplates.useMutation();
  const lockTimesheetMonthMutation = trpc.planner.timesheets.lockMonth.useMutation();
  const reopenTimesheetMonthMutation = trpc.planner.timesheets.reopenMonth.useMutation();
  const submitTimesheetMonthMutation = trpc.planner.timesheets.submitMonth.useMutation();
  const approveTimesheetMonthMutation = trpc.planner.timesheets.approveMonth.useMutation();
  const markTimesheetMonthHandedOffMutation =
    trpc.planner.timesheets.markMonthHandedOff.useMutation();
  const returnTimesheetMonthMutation = trpc.planner.timesheets.returnMonthForChanges.useMutation();
  const reviewTimesheetLeaveOverrideMutation =
    trpc.planner.timesheets.reviewLeaveOverride.useMutation();
  const reviewTimesheetLeaveOverrideBlockMutation =
    trpc.planner.timesheets.reviewLeaveOverrideBlock.useMutation();
  const createTimesheetTemplateMutation = trpc.planner.timesheets.templates.create.useMutation();
  const updateTimesheetTemplateMutation = trpc.planner.timesheets.templates.update.useMutation();
  const deleteTimesheetTemplateMutation = trpc.planner.timesheets.templates.delete.useMutation();
  const createTimesheetOptionMutation = trpc.planner.timesheets.options.create.useMutation();
  const updateTimesheetOptionMutation = trpc.planner.timesheets.options.update.useMutation();
  const deleteTimesheetOptionMutation = trpc.planner.timesheets.options.delete.useMutation();
  const upsertTimesheetEntryMutation = trpc.planner.timesheets.entries.upsert.useMutation();
  const bulkUpsertTimesheetEntriesMutation =
    trpc.planner.timesheets.entries.bulkUpsert.useMutation();

  const typedEntries = useMemo(
    () =>
      (entries as PlannerEntry[]).slice().sort((left, right) => {
        const leftDate = parsePlannerDate(left.entryDate)?.getTime() ?? 0;
        const rightDate = parsePlannerDate(right.entryDate)?.getTime() ?? 0;
        if (left.isComplete !== right.isComplete) {
          return Number(left.isComplete) - Number(right.isComplete);
        }
        return leftDate - rightDate;
      }),
    [entries]
  );
  const typedBranches = branches as Branch[];
  const typedSharedEvents = useMemo(
    () =>
      (sharedEvents as SharedPlannerEvent[]).slice().sort((left, right) => {
        const leftDate = parsePlannerDate(left.startAt)?.getTime() ?? 0;
        const rightDate = parsePlannerDate(right.startAt)?.getTime() ?? 0;
        return leftDate - rightDate;
      }),
    [sharedEvents]
  );
  const branchMap = useMemo(
    () => new Map(typedBranches.map((branch) => [branch.id, branch.name])),
    [typedBranches]
  );
  const sharedBranchOptions = useMemo(
    () => [
      { value: ALL_SHARED_BRANCHS_VALUE, label: "All branches" },
      { value: SYSTEM_WIDE_SHARED_VALUE, label: "System-wide only" },
      ...typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [typedBranches]
  );
  const unifiedBranchOptions = useMemo(
    () => [
      { value: ALL_UNIFIED_BRANCHES_VALUE, label: "All branches" },
      ...typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [typedBranches]
  );
  const calendarOrigin =
    typeof window === "undefined" ? "" : window.location.origin;
  const unifiedFeedUrls = useMemo(() => {
    if (!calendarOrigin || !feedInfo?.token) {
      return [];
    }

    return [
      {
        key: "all",
        label: "Unified Feed",
        description: "Private planner, shared calendar, and operational events in one subscription.",
        url: `${calendarOrigin}/calendar/feed/${feedInfo.token}.ics?scope=all`,
      },
      {
        key: "private",
        label: "Private Planner Feed",
        description: "Only your own private planner entries and reminders.",
        url: `${calendarOrigin}/calendar/feed/${feedInfo.token}.ics?scope=private`,
      },
      {
        key: "shared",
        label: "Shared Calendar Feed",
        description: "Branch and team events from the shared planner layer.",
        url: `${calendarOrigin}/calendar/feed/${feedInfo.token}.ics?scope=shared`,
      },
      {
        key: "operations",
        label: "Operational Feed",
        description: "Schedules, lead follow-ups, Level III activities, and quality due dates.",
        url: `${calendarOrigin}/calendar/feed/${feedInfo.token}.ics?scope=operations`,
      },
    ];
  }, [calendarOrigin, feedInfo?.token]);
  const plannerLinkedSectionId = useMemo(() => {
    const queryString = extractPlannerQueryString(location);
    if (!queryString) {
      return null;
    }
    const params = new URLSearchParams(queryString);
    const sectionId = params.get("timesheetSection")?.trim();
    return sectionId || null;
  }, [location]);
  const plannerLinkedWorkspace = useMemo<PlannerTimesheetWorkspace | null>(() => {
    const queryString = extractPlannerQueryString(location);
    if (!queryString) {
      return null;
    }
    const params = new URLSearchParams(queryString);
    const workspace = params.get("timesheetWorkspace")?.trim();
    if (
      workspace === "all" ||
      workspace === "month" ||
      workspace === "leave" ||
      workspace === "review"
    ) {
      return workspace;
    }
    return null;
  }, [location]);
  const plannerHasExplicitTimesheetNavigation = useMemo(() => {
    const queryString = extractPlannerQueryString(location);
    if (!queryString) {
      return false;
    }
    const params = new URLSearchParams(queryString);
    return (
      params.has("timesheetMonth") ||
      params.has("timesheetUserId") ||
      params.has("timesheetReview") ||
      params.has("timesheetDate") ||
      params.has("timesheetSection") ||
      params.has("timesheetWorkspace")
    );
  }, [location]);

  const getEntrySignature = (
    value: Pick<
      PlannerEntry,
      "title" | "entryDate" | "reminderAt" | "recurrence" | "notes"
    >
  ) => {
    const entryDate = getDateInputValue(value.entryDate);
    const reminderAt = getDateTimeInputValue(value.reminderAt);
    const recurrence = value.recurrence || "none";
    const notes = (value.notes || "").trim().toLowerCase();
    return [
      value.title.trim().toLowerCase(),
      entryDate,
      reminderAt,
      recurrence,
      notes,
    ].join("|");
  };

  useEffect(() => {
    if (!isSameMonth(selectedDate, currentDate)) {
      setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }
  }, [currentDate, selectedDate]);

  useEffect(() => {
    if (!isSameMonth(selectedSharedDate, currentDate)) {
      setSelectedSharedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    }
  }, [currentDate, selectedSharedDate]);

  const monthStart = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    [currentDate]
  );
  const monthEnd = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
    [currentDate]
  );
  const previousMonthStart = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    [currentDate]
  );
  const previousMonthEnd = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 0),
    [currentDate]
  );
  const leaveYearStartMonth =
    (timesheetProfile as PlannerTimesheetProfile | null | undefined)?.leaveYearStartMonth ?? 1;
  const leaveYearRange = useMemo(
    () => getLeaveYearRange(currentDate, leaveYearStartMonth),
    [currentDate, leaveYearStartMonth]
  );
  const {
    data: timesheetEntries = [],
    refetch: refetchTimesheetEntries,
    isLoading: timesheetEntriesLoading,
  } = trpc.planner.timesheets.entries.list.useQuery({
    userId: timesheetTargetUserId ?? undefined,
    monthStart,
    monthEnd,
  });
  const {
    data: previousTimesheetEntries = [],
    isLoading: previousTimesheetEntriesLoading,
  } = trpc.planner.timesheets.entries.list.useQuery(
    {
      userId: timesheetTargetUserId ?? undefined,
      monthStart: previousMonthStart,
      monthEnd: previousMonthEnd,
    },
    {
      enabled: Boolean(timesheetTargetUserId),
    }
  );
  const {
    data: yearTimesheetEntries = [],
    refetch: refetchYearTimesheetEntries,
  } = trpc.planner.timesheets.entries.list.useQuery(
    {
      userId: timesheetTargetUserId ?? undefined,
      monthStart: leaveYearRange.startDate,
      monthEnd: leaveYearRange.endDate,
    },
    {
      enabled: Boolean(timesheetTargetUserId),
    }
  );
  const { data: timesheetMonthStatus, refetch: refetchTimesheetMonthStatus } =
    trpc.planner.timesheets.monthStatus.useQuery({
      monthStart,
      userId: timesheetTargetUserId ?? undefined,
    });
  const isTimesheetReviewAdmin = user?.role === "admin" || user?.role === "super_admin";
  const { data: timesheetOverview = [], refetch: refetchTimesheetOverview } =
    trpc.planner.timesheets.overview.useQuery(
      { monthStart },
      {
        enabled: isTimesheetReviewAdmin,
      }
    );
  const {
    data: timesheetTeamLeaveOverview = [],
    refetch: refetchTimesheetTeamLeaveOverview,
  } = trpc.planner.timesheets.teamLeaveOverview.useQuery(
    { monthStart },
    {
      enabled: isTimesheetReviewAdmin,
    }
  );
  const {
    data: timesheetLeaveOverrideRegister = [],
    refetch: refetchTimesheetLeaveOverrideRegister,
  } =
    trpc.planner.timesheets.teamLeaveOverrides.useQuery(
    { monthStart },
    {
      enabled: isTimesheetReviewAdmin,
    }
  );
  const {
    data: timesheetLeaveOverrideBlocks = [],
    refetch: refetchTimesheetLeaveOverrideBlocks,
  } = trpc.planner.timesheets.teamLeaveOverrideBlocks.useQuery(
    { monthStart },
    {
      enabled: isTimesheetReviewAdmin,
    }
  );
  const {
    data: timesheetUserLeaveOverrides = [],
    refetch: refetchTimesheetUserLeaveOverrides,
  } = trpc.planner.timesheets.leaveOverrides.useQuery(
    {
      monthStart,
      userId: timesheetTargetUserId ?? undefined,
    },
    {
      enabled: Boolean(timesheetTargetUserId),
    }
  );
  const {
    data: timesheetUserLeaveOverrideBlocks = [],
    refetch: refetchTimesheetUserLeaveOverrideBlocks,
  } = trpc.planner.timesheets.leaveOverrideBlocks.useQuery(
    {
      monthStart,
      userId: timesheetTargetUserId ?? undefined,
    },
    {
      enabled: Boolean(timesheetTargetUserId),
    }
  );
  const {
    data: timesheetTeamLeaveCalendar = [],
    refetch: refetchTimesheetTeamLeaveCalendar,
  } = trpc.planner.timesheets.teamLeaveCalendar.useQuery(
    { monthStart },
    {
      enabled: isTimesheetReviewAdmin,
    }
  );
  const {
    data: timesheetDepartmentCoverageSettings = [],
    refetch: refetchTimesheetDepartmentCoverageSettings,
  } = trpc.planner.timesheets.departmentCoverageSettings.list.useQuery(undefined, {
    enabled: isTimesheetReviewAdmin,
  });
  const timesheetLeaveRangePreviewFromDate = useMemo(
    () => parseDateInputValue(String(timesheetLeaveRangePreviewValues.fromDate || "")),
    [timesheetLeaveRangePreviewValues]
  );
  const timesheetLeaveRangePreviewToDate = useMemo(
    () => parseDateInputValue(String(timesheetLeaveRangePreviewValues.toDate || "")),
    [timesheetLeaveRangePreviewValues]
  );
  const timesheetLeaveRangePreviewInput = useMemo(() => {
    if (
      !timesheetTargetUserId ||
      !timesheetLeaveRangePreviewFromDate ||
      !timesheetLeaveRangePreviewToDate ||
      timesheetLeaveRangePreviewFromDate > timesheetLeaveRangePreviewToDate
    ) {
      return null;
    }

    return {
      userId: timesheetTargetUserId,
      fromDate: timesheetLeaveRangePreviewFromDate,
      toDate: timesheetLeaveRangePreviewToDate,
      includeWeekends: Boolean(timesheetLeaveRangePreviewValues.includeWeekends),
      overwriteExisting:
        timesheetLeaveRangePreviewValues.overwriteExisting === undefined
          ? true
          : Boolean(timesheetLeaveRangePreviewValues.overwriteExisting),
      skipSharedHolidays:
        timesheetLeaveRangePreviewValues.skipSharedHolidays === undefined
          ? true
          : Boolean(timesheetLeaveRangePreviewValues.skipSharedHolidays),
      leavePortionPercent:
        Number(timesheetLeaveRangePreviewValues.leavePortionPercent || 100) === 50 ? 50 : 100,
    };
  }, [
    timesheetLeaveRangePreviewFromDate,
    timesheetLeaveRangePreviewToDate,
    timesheetLeaveRangePreviewValues,
    timesheetTargetUserId,
  ]);
  const { data: timesheetDepartmentCoveragePreview, isLoading: timesheetDepartmentCoveragePreviewLoading } =
    trpc.planner.timesheets.departmentCoveragePreview.useQuery(timesheetLeaveRangePreviewInput!, {
      enabled: isTimesheetLeaveRangeDialogOpen && Boolean(timesheetLeaveRangePreviewInput),
    });
  const { data: timesheetLeaveBalancePreview, isLoading: timesheetLeaveBalancePreviewLoading } =
    trpc.planner.timesheets.leaveBalancePreview.useQuery(timesheetLeaveRangePreviewInput!, {
      enabled: isTimesheetLeaveRangeDialogOpen && Boolean(timesheetLeaveRangePreviewInput),
    });
  const { data: timesheetReviewQueue = [], refetch: refetchTimesheetReviewQueue } =
    trpc.planner.timesheets.reviewQueue.useQuery(undefined, {
      enabled: isTimesheetReviewAdmin,
    });
  const saveTimesheetDepartmentCoverageRuleMutation =
    trpc.planner.timesheets.departmentCoverageSettings.save.useMutation();
  const deleteTimesheetDepartmentCoverageRuleMutation =
    trpc.planner.timesheets.departmentCoverageSettings.delete.useMutation();

  useEffect(() => {
    const queryString = extractPlannerQueryString(location);
    if (!queryString) {
      return;
    }

    const params = new URLSearchParams(queryString);
    const hasTimesheetLink =
      params.has("timesheetMonth") ||
      params.has("timesheetUserId") ||
      params.has("timesheetReview") ||
      params.has("timesheetDate");

    if (!hasTimesheetLink) {
      return;
    }

    const linkedMonth = parsePlannerMonthParam(params.get("timesheetMonth"));
    if (linkedMonth) {
      const monthView = new Date(linkedMonth.getFullYear(), linkedMonth.getMonth(), 1);
      if (getDateKey(currentDate) !== getDateKey(monthView)) {
        setCurrentDate(monthView);
      }
      if (selectedDate.getFullYear() !== monthView.getFullYear() || selectedDate.getMonth() !== monthView.getMonth()) {
        setSelectedDate(monthView);
      }
    }

    const linkedDate = parsePlannerDate(params.get("timesheetDate"));
    if (linkedDate) {
      const linkedDay = startOfDay(linkedDate);
      if (getDateKey(currentDate) !== getDateKey(new Date(linkedDay.getFullYear(), linkedDay.getMonth(), 1))) {
        setCurrentDate(new Date(linkedDay.getFullYear(), linkedDay.getMonth(), 1));
      }
      if (getDateKey(selectedDate) !== getDateKey(linkedDay)) {
        setSelectedDate(linkedDay);
      }
    }

    const requestedUserId = Number(params.get("timesheetUserId") || 0);
    const reviewRequested = params.get("timesheetReview") === "1";

    if (
      reviewRequested &&
      requestedUserId > 0 &&
      requestedUserId !== user?.id &&
      isTimesheetReviewAdmin
    ) {
      const monthKey = linkedMonth ? getDateKey(new Date(linkedMonth.getFullYear(), linkedMonth.getMonth(), 1)) : null;
      const matchingReviewRow = (timesheetReviewQueue as PlannerTimesheetReviewQueueRow[]).find(
        (row) =>
          row.userId === requestedUserId &&
          (!monthKey ||
            getDateKey(
              new Date(
                (parsePlannerDate(row.monthDate) ?? new Date()).getFullYear(),
                (parsePlannerDate(row.monthDate) ?? new Date()).getMonth(),
                1
              )
            ) === monthKey)
      );
      const matchingOverviewRow = (timesheetOverview as PlannerTimesheetOverviewRow[]).find(
        (row) => row.userId === requestedUserId
      );
      const nextTarget: PlannerTimesheetReviewTarget = {
        userId: requestedUserId,
        userName:
          params.get("timesheetUserName")?.trim() ||
          matchingReviewRow?.userName ||
          matchingOverviewRow?.userName ||
          `User ${requestedUserId}`,
        userEmail:
          params.get("timesheetUserEmail")?.trim() ||
          matchingReviewRow?.userEmail ||
          matchingOverviewRow?.userEmail ||
          null,
      };
      if (
        timesheetReviewTarget?.userId !== nextTarget.userId ||
        timesheetReviewTarget?.userName !== nextTarget.userName ||
        timesheetReviewTarget?.userEmail !== nextTarget.userEmail
      ) {
        setTimesheetReviewTarget(nextTarget);
      }
      return;
    }

    if (timesheetReviewTarget !== null) {
      setTimesheetReviewTarget(null);
    }
  }, [
    currentDate,
    isTimesheetReviewAdmin,
    location,
    selectedDate,
    timesheetOverview,
    timesheetReviewQueue,
    timesheetReviewTarget,
    user?.id,
  ]);
  useEffect(() => {
    if (!plannerLinkedWorkspace) {
      return;
    }
    if (plannerLinkedWorkspace === "review" && !isTimesheetReviewAdmin) {
      setActivePlannerWorkspace("all");
      return;
    }
    if (activePlannerWorkspace !== plannerLinkedWorkspace) {
      setActivePlannerWorkspace(plannerLinkedWorkspace);
    }
  }, [activePlannerWorkspace, isTimesheetReviewAdmin, plannerLinkedWorkspace]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(PLANNER_WORKSPACE_RESUME_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as PlannerWorkspaceResumeState;
      if (parsed && typeof parsed === "object") {
        setPlannerWorkspaceResumeState(parsed);
      }
    } catch {
      // Ignore invalid persisted planner workspace state.
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const lastWorkspaceRaw = window.localStorage.getItem(
        PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY
      );
      if (
        lastWorkspaceRaw === "all" ||
        lastWorkspaceRaw === "month" ||
        lastWorkspaceRaw === "leave" ||
        lastWorkspaceRaw === "review"
      ) {
        setPlannerLastActiveWorkspace(lastWorkspaceRaw);
      }
      const startModeRaw = window.localStorage.getItem(
        PLANNER_WORKSPACE_START_MODE_STORAGE_KEY
      );
      if (startModeRaw === "remember" || startModeRaw === "preferred") {
        setPlannerWorkspaceStartMode(startModeRaw);
      }
      const preferredWorkspaceRaw = window.localStorage.getItem(
        PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY
      );
      if (
        preferredWorkspaceRaw === "all" ||
        preferredWorkspaceRaw === "month" ||
        preferredWorkspaceRaw === "leave" ||
        preferredWorkspaceRaw === "review"
      ) {
        setPlannerPreferredWorkspace(preferredWorkspaceRaw);
      }
      const shortcutRaw = window.localStorage.getItem(
        PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY
      );
      if (shortcutRaw) {
        const parsedShortcuts = JSON.parse(shortcutRaw) as PlannerWorkspaceShortcut[];
        if (Array.isArray(parsedShortcuts)) {
          setPlannerWorkspaceShortcuts(
            parsedShortcuts.filter(
              (shortcut) =>
                shortcut &&
                typeof shortcut.id === "string" &&
                typeof shortcut.label === "string" &&
                (shortcut.workspace === "all" ||
                  shortcut.workspace === "month" ||
                  shortcut.workspace === "leave" ||
                  shortcut.workspace === "review") &&
                typeof shortcut.sectionId === "string"
            )
          );
        }
      }
      const recentViewsRaw = window.localStorage.getItem(
        PLANNER_WORKSPACE_RECENTS_STORAGE_KEY
      );
      if (recentViewsRaw) {
        const parsedRecentViews = JSON.parse(recentViewsRaw) as PlannerWorkspaceRecentView[];
        if (Array.isArray(parsedRecentViews)) {
          setPlannerWorkspaceRecentViews(
            parsedRecentViews.filter(
              (view) =>
                view &&
                typeof view.id === "string" &&
                typeof view.label === "string" &&
                (view.workspace === "all" ||
                  view.workspace === "month" ||
                  view.workspace === "leave" ||
                  view.workspace === "review") &&
                typeof view.sectionId === "string"
            )
          );
        }
      }
    } catch {
      // Ignore invalid persisted planner startup state.
    } finally {
      setPlannerWorkspaceStartupLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        PLANNER_WORKSPACE_RESUME_STORAGE_KEY,
        JSON.stringify(plannerWorkspaceResumeState)
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [plannerWorkspaceResumeState]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY,
        activePlannerWorkspace
      );
      window.localStorage.setItem(
        PLANNER_WORKSPACE_START_MODE_STORAGE_KEY,
        plannerWorkspaceStartMode
      );
      window.localStorage.setItem(
        PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY,
        plannerPreferredWorkspace
      );
      window.localStorage.setItem(
        PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY,
        JSON.stringify(plannerWorkspaceShortcuts)
      );
      window.localStorage.setItem(
        PLANNER_WORKSPACE_RECENTS_STORAGE_KEY,
        JSON.stringify(plannerWorkspaceRecentViews)
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [
    activePlannerWorkspace,
    plannerPreferredWorkspace,
    plannerWorkspaceRecentViews,
    plannerWorkspaceShortcuts,
    plannerWorkspaceStartMode,
  ]);
  useEffect(() => {
    const nextDateKey = getDateKey(selectedDate);
    setPlannerWorkspaceResumeState((current) => {
      const existing = current[activePlannerWorkspace];
      if (
        existing?.sectionId === activePlannerSectionId &&
        existing?.dateKey === nextDateKey
      ) {
        return current;
      }
      return {
        ...current,
        [activePlannerWorkspace]: {
          sectionId: activePlannerSectionId,
          dateKey: nextDateKey,
        },
      };
    });
  }, [activePlannerSectionId, activePlannerWorkspace, selectedDate]);
  useEffect(() => {
    if (!plannerWorkspaceStartupLoaded || !activePlannerSectionId) {
      return;
    }
    const workspaceLabel =
      activePlannerWorkspace === "month"
        ? "My Month"
        : activePlannerWorkspace === "leave"
          ? "Leave"
          : activePlannerWorkspace === "review"
            ? "Team Review"
            : "Full Planner";
    const nextView: PlannerWorkspaceRecentView = {
      id: `${activePlannerWorkspace}:${activePlannerSectionId}:${getDateKey(selectedDate)}`,
      label: `${workspaceLabel}: ${formatPlannerSectionLabelFromId(activePlannerSectionId)}`,
      workspace: activePlannerWorkspace,
      sectionId: activePlannerSectionId,
      dateKey: getDateKey(selectedDate),
      viewedAt: new Date().toISOString(),
    };
    setPlannerWorkspaceRecentViews((current) => [
      nextView,
      ...current.filter((view) => view.id !== nextView.id),
    ].slice(0, 6));
  }, [
    activePlannerSectionId,
    activePlannerWorkspace,
    plannerWorkspaceStartupLoaded,
    selectedDate,
  ]);
  useEffect(() => {
    if (!plannerLinkedSectionId || typeof window === "undefined") {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      scrollPlannerSectionIntoView(plannerLinkedSectionId, {
        persistQuery: false,
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isTimesheetReviewAdmin, plannerLinkedSectionId]);

  const monthOccurrences = useMemo(
    () => expandPlannerEntries(typedEntries, monthStart, monthEnd),
    [monthEnd, monthStart, typedEntries]
  );

  const planningWindowOccurrences = useMemo(
    () => expandPlannerEntries(typedEntries, addDays(today, -30), addDays(today, 30)),
    [today, typedEntries]
  );

  const entriesByDate = useMemo(() => {
    const map = new Map<number, PlannerOccurrence[]>();
    for (const occurrence of monthOccurrences) {
      const day = occurrence.occurrenceDate.getDate();
      const current = map.get(day) ?? [];
      current.push(occurrence);
      map.set(day, current);
    }
    return map;
  }, [monthOccurrences]);

  const selectedDayEntries = useMemo(
    () =>
      monthOccurrences.filter((occurrence) =>
        isSameDay(occurrence.occurrenceDate, selectedDate)
      ),
    [monthOccurrences, selectedDate]
  );

  const summary = useMemo<PlannerSummary>(() => {
    const now = new Date();
    const nextWeek = addDays(today, 7);

    return {
      openEntries: typedEntries.filter((entry) => !entry.isComplete).length,
      dueToday: planningWindowOccurrences.filter(
        (occurrence) =>
          !occurrence.source.isComplete &&
          (isSameDay(occurrence.occurrenceDate, today) ||
            (occurrence.reminderAt ? isSameDay(occurrence.reminderAt, today) : false))
      ).length,
      overdueReminders: planningWindowOccurrences.filter(
        (occurrence) =>
          !occurrence.source.isComplete &&
          Boolean(occurrence.reminderAt) &&
          (occurrence.reminderAt?.getTime() ?? 0) < now.getTime()
      ).length,
      nextSevenDays: planningWindowOccurrences.filter((occurrence) => {
        if (occurrence.source.isComplete) return false;
        const occurrenceDay = startOfDay(occurrence.occurrenceDate);
        return occurrenceDay > today && occurrenceDay <= nextWeek;
      }).length,
    };
  }, [planningWindowOccurrences, today, typedEntries]);

  const filteredSharedEvents = useMemo(() => {
    return typedSharedEvents.filter((event) => {
      if (sharedBranchFilter === ALL_SHARED_BRANCHS_VALUE) {
        return true;
      }

      if (sharedBranchFilter === SYSTEM_WIDE_SHARED_VALUE) {
        return event.branchId === null;
      }

      return String(event.branchId ?? "") === sharedBranchFilter;
    });
  }, [sharedBranchFilter, typedSharedEvents]);

  const sharedRows = useMemo(
    () =>
      filteredSharedEvents.map((event) => ({
        ...event,
        branchName: event.branchId
          ? branchMap.get(event.branchId) || "Unknown Branch"
          : "System-wide",
      })),
    [branchMap, filteredSharedEvents]
  );

  const sharedMonthOccurrences = useMemo(
    () => expandSharedPlannerEvents(filteredSharedEvents, monthStart, monthEnd),
    [filteredSharedEvents, monthEnd, monthStart]
  );

  const sharedWindowOccurrences = useMemo(
    () => expandSharedPlannerEvents(filteredSharedEvents, addDays(today, -30), addDays(today, 30)),
    [filteredSharedEvents, today]
  );

  const sharedEventsByDate = useMemo(() => {
    const map = new Map<number, SharedPlannerOccurrence[]>();
    for (const occurrence of sharedMonthOccurrences) {
      const day = occurrence.occurrenceDate.getDate();
      const current = map.get(day) ?? [];
      current.push(occurrence);
      map.set(day, current);
    }
    return map;
  }, [sharedMonthOccurrences]);

  const selectedSharedDayEvents = useMemo(
    () =>
      sharedMonthOccurrences.filter((occurrence) =>
        isSameDay(occurrence.occurrenceDate, selectedSharedDate)
      ),
    [selectedSharedDate, sharedMonthOccurrences]
  );

  const sharedSummary = useMemo<SharedSummary>(() => {
    const nextWeek = addDays(today, 7);
    return {
      totalEvents: filteredSharedEvents.length,
      thisMonth: filteredSharedEvents.filter((event) =>
        isSameMonth(parsePlannerDate(event.startAt) ?? new Date(0), currentDate)
      ).length,
      upcomingSevenDays: sharedWindowOccurrences.filter((occurrence) => {
        const occurrenceDay = startOfDay(occurrence.occurrenceDate);
        return occurrenceDay >= today && occurrenceDay <= nextWeek;
      }).length,
      branchSpecific: filteredSharedEvents.filter((event) => event.branchId !== null).length,
    };
  }, [currentDate, filteredSharedEvents, sharedWindowOccurrences, today]);

  const typedUnifiedOccurrences = useMemo(
    () =>
      (unifiedOccurrences as UnifiedCalendarOccurrence[])
        .slice()
        .sort((left, right) => {
          const leftDate = parsePlannerDate(left.occurrenceDate)?.getTime() ?? 0;
          const rightDate = parsePlannerDate(right.occurrenceDate)?.getTime() ?? 0;
          if (leftDate !== rightDate) {
            return leftDate - rightDate;
          }
          return left.source.title.localeCompare(right.source.title);
        }),
    [unifiedOccurrences]
  );

  const unifiedSummary = useMemo(() => {
    const nextWeek = addDays(today, 7);
    return {
      totalEvents: typedUnifiedOccurrences.length,
      dueToday: typedUnifiedOccurrences.filter((occurrence) =>
        isSameDay(parsePlannerDate(occurrence.occurrenceDate) ?? new Date(0), today)
      ).length,
      nextSevenDays: typedUnifiedOccurrences.filter((occurrence) => {
        const occurrenceDay = startOfDay(
          parsePlannerDate(occurrence.occurrenceDate) ?? new Date(0)
        );
        return occurrenceDay >= today && occurrenceDay <= nextWeek;
      }).length,
      operationalEvents: typedUnifiedOccurrences.filter(
        (occurrence) =>
          occurrence.source.sourceType !== "private_planner" &&
          occurrence.source.sourceType !== "shared_planner"
      ).length,
    };
  }, [today, typedUnifiedOccurrences]);

  const upcomingUnifiedOccurrences = useMemo(
    () =>
      typedUnifiedOccurrences
        .filter((occurrence) => {
          const occurrenceDay = startOfDay(
            parsePlannerDate(occurrence.occurrenceDate) ?? new Date(0)
          );
          return occurrenceDay >= today;
        })
        .slice(0, 12),
    [today, typedUnifiedOccurrences]
  );

  const unifiedRows = useMemo(
    () =>
      typedUnifiedOccurrences.map((occurrence) => ({
        id: occurrence.key,
        ...occurrence,
        whenLabel: formatUnifiedOccurrenceTiming(occurrence),
        title: occurrence.source.title,
        sourceLabel: occurrence.source.sourceLabel,
        branchName: occurrence.source.branchName || "General / Personal",
        statusLabel: occurrence.source.statusLabel || "-",
      })),
    [typedUnifiedOccurrences]
  );

  const daysInMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
    [currentDate]
  );

  const firstDayOffset = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(),
    [currentDate]
  );

  const calendarCells = useMemo(() => {
    const cells: Array<number | null> = [];

    for (let index = 0; index < firstDayOffset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    return cells;
  }, [daysInMonth, firstDayOffset]);

  const columns: Column<PlannerEntry>[] = [
    { key: "title", label: "Activity", sortable: true, filterable: true },
    {
      key: "entryDate",
      label: "Planned For",
      sortable: true,
      render: (value) => formatPlannerDate(value as string | Date),
    },
    {
      key: "reminderAt",
      label: "Reminder",
      render: (value) => formatPlannerDateTime(value as string | Date | null),
    },
    {
      key: "recurrence",
      label: "Recurring",
      render: (_value, row) => getRecurrenceLabel(row),
    },
    {
      key: "isComplete",
      label: "Status",
      render: (value) => (
        <Badge className={value ? "bg-emerald-100 text-emerald-800" : ""} variant={value ? "secondary" : "outline"}>
          {value ? "Done" : "Open"}
        </Badge>
      ),
    },
  ];
  const sharedColumns: Column<SharedPlannerEvent & { branchName: string }>[] = [
    { key: "title", label: "Event", sortable: true, filterable: true },
    {
      key: "eventType",
      label: "Type",
      sortable: true,
      render: (value) => (
        <Badge className={getSharedEventTypeClass(value as SharedEventType)} variant="secondary">
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "startAt",
      label: "Timing",
      sortable: true,
      render: (_value, row) => formatSharedEventTiming(row),
    },
    {
      key: "branchName",
      label: "Branch",
      sortable: true,
      render: (value) => String(value || "System-wide"),
    },
    {
      key: "location",
      label: "Location",
      render: (value) => String(value || "-"),
    },
  ];
  const unifiedColumns: Column<UnifiedCalendarRow>[] = [
    {
      key: "whenLabel",
      label: "When",
      sortable: true,
      render: (value) => String(value),
    },
    {
      key: "sourceLabel",
      label: "Source",
      render: (_value, row) => (
        <Badge className={getUnifiedSourceClass(row.source.sourceType)} variant="secondary">
          {row.source.sourceLabel}
        </Badge>
      ),
    },
    {
      key: "title",
      label: "Event",
      filterable: true,
      render: (_value, row) => row.source.title,
    },
    {
      key: "branchName",
      label: "Branch",
      render: (_value, row) => row.source.branchName || "General / Personal",
    },
    {
      key: "statusLabel",
      label: "Status",
      render: (_value, row) => row.source.statusLabel || "-",
    },
  ];

  const openCreateFormForDate = (date: Date) => {
    setSelectedDate(startOfDay(date));
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const openEditForm = (entry: PlannerEntry) => {
    const entryDate = parsePlannerDate(entry.entryDate);
    if (entryDate) {
      setSelectedDate(startOfDay(entryDate));
      setCurrentDate(new Date(entryDate.getFullYear(), entryDate.getMonth(), 1));
    }

    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleToggleComplete = async (entry: PlannerEntry) => {
    try {
      await updateMutation.mutateAsync({
        id: entry.id,
        data: { isComplete: !entry.isComplete },
      });
      toast.success(entry.isComplete ? "Planner entry reopened" : "Planner entry completed");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update planner entry");
    }
  };

  const handleDelete = async (entry: PlannerEntry) => {
    if (!confirm(`Delete "${entry.title}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: entry.id });
      toast.success("Planner entry deleted");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete planner entry");
    }
  };

  const handleCalendarImport = async (file: File) => {
    setIsImportingCalendar(true);

    try {
      const content = await file.text();
      const importedEntries = parseCalendarImportText(content);

      if (importedEntries.length === 0) {
        throw new Error("No calendar events could be read from that ICS file.");
      }

      const existingSignatures = new Set(
        typedEntries.map((entry) => getEntrySignature(entry))
      );

      const uniqueEntries = importedEntries.filter((entry) => {
        const signature = getEntrySignature({
          title: entry.title,
          entryDate: entry.entryDate,
          reminderAt: entry.reminderAt,
          recurrence: entry.recurrence,
          notes: entry.notes,
        });
        if (existingSignatures.has(signature)) {
          return false;
        }
        existingSignatures.add(signature);
        return true;
      });

      if (uniqueEntries.length === 0) {
        toast.message("All calendar events from that file are already in your planner.");
        return;
      }

      for (const entry of uniqueEntries) {
        await createMutation.mutateAsync({
          title: entry.title,
          entryDate: entry.entryDate,
          notes: entry.notes,
          reminderAt: entry.reminderAt,
          recurrence: entry.recurrence,
          recurrenceUntil: entry.recurrenceUntil,
          isComplete: false,
        });
      }

      await refetch();
      const skippedCount = importedEntries.length - uniqueEntries.length;
      toast.success(
        skippedCount > 0
          ? `Imported ${uniqueEntries.length} calendar event(s). Skipped ${skippedCount} duplicate item(s).`
          : `Imported ${uniqueEntries.length} calendar event(s) into Planner.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to import the calendar file."
      );
    } finally {
      setIsImportingCalendar(false);
      if (calendarImportInputRef.current) {
        calendarImportInputRef.current.value = "";
      }
    }
  };

  const handleCalendarExport = () => {
    const content = buildPlannerIcs(typedEntries);
    const todayStamp = getDateKey(new Date());
    downloadIcsFile(`textpoint-planner-${todayStamp}.ics`, content);
    toast.success("Planner calendar exported.");
  };

  const handleCopyFeedUrl = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Failed to copy the calendar URL.");
    }
  };

  const handleRotateFeedToken = async () => {
    if (
      !confirm(
        "Rotate the calendar feed token? Existing Google/Outlook subscriptions will stop working until you update them."
      )
    ) {
      return;
    }

    try {
      await rotateFeedTokenMutation.mutateAsync();
      await refetchFeedInfo();
      await refetchUnifiedOccurrences();
      toast.success("Calendar feed token rotated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to rotate the calendar feed token."
      );
    }
  };

  const canManageSharedEvent = (event: SharedPlannerEvent) => {
    if (!user) return false;
    return (
      user.role === "admin" ||
      user.role === "super_admin" ||
      user.id === event.createdByUserId
    );
  };

  const openSharedCreateFormForDate = (date: Date) => {
    setSelectedSharedDate(startOfDay(date));
    setEditingSharedEvent(null);
    setIsSharedFormOpen(true);
  };

  const openSharedEditForm = (event: SharedPlannerEvent) => {
    const startAt = parsePlannerDate(event.startAt);
    if (startAt) {
      setSelectedSharedDate(startOfDay(startAt));
      setCurrentDate(new Date(startAt.getFullYear(), startAt.getMonth(), 1));
    }

    setEditingSharedEvent(event);
    setIsSharedFormOpen(true);
  };

  const handleSharedDelete = async (event: SharedPlannerEvent) => {
    if (!confirm(`Delete shared event "${event.title}"?`)) return;

    try {
      await deleteSharedMutation.mutateAsync({ id: event.id });
      toast.success("Shared calendar event deleted");
      await refetchSharedEvents();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete shared calendar event"
      );
    }
  };

  const handleSharedCalendarExport = () => {
    const content = buildPlannerIcs(
      filteredSharedEvents.map((event) => ({
        id: event.id,
        title: event.title,
        entryDate: event.startAt,
        notes: [
          event.notes?.trim() || null,
          event.location ? `Location: ${event.location}` : null,
          event.branchId ? `Branch: ${branchMap.get(event.branchId) || "Unknown Branch"}` : "Branch: System-wide",
          `Type: ${event.eventType}`,
        ]
          .filter(Boolean)
          .join("\n"),
        reminderAt: event.isAllDay ? null : event.startAt,
        recurrence: event.recurrence || null,
        recurrenceUntil: event.recurrenceUntil,
        isComplete: false,
      }))
    );
    const todayStamp = getDateKey(new Date());
    downloadIcsFile(`textpoint-shared-calendar-${todayStamp}.ics`, content);
    toast.success("Shared calendar exported.");
  };

  const selectedDateLabel = selectedDate.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const selectedSharedDateLabel = selectedSharedDate.toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const typedTimesheetProfile =
    (timesheetProfile as PlannerTimesheetProfile | null | undefined) ?? null;
  const typedTimesheetMonthStatus =
    (timesheetMonthStatus as PlannerTimesheetMonthStatus | null | undefined) ?? null;
  const timesheetMonthWorkflowStatus = typedTimesheetMonthStatus?.status ?? "open";
  const isTimesheetMonthLocked = timesheetMonthWorkflowStatus === "locked";
  const isTimesheetMonthSubmitted = timesheetMonthWorkflowStatus === "submitted";
  const isTimesheetMonthApproved = timesheetMonthWorkflowStatus === "approved";
  const isTimesheetMonthHandedOff = timesheetMonthWorkflowStatus === "handed_off";
  const isTimesheetMonthReadOnly =
    isTimesheetMonthLocked ||
    isTimesheetMonthSubmitted ||
    isTimesheetMonthApproved ||
    isTimesheetMonthHandedOff;
  const isTimesheetEditorReadOnly = isTimesheetMonthReadOnly || isViewingAnotherTimesheet;
  const timesheetMonthStatusLabel = isTimesheetMonthHandedOff
    ? "Handed Off"
    : isTimesheetMonthApproved
      ? "Approved"
    : isTimesheetMonthSubmitted
      ? "Submitted"
      : isTimesheetMonthLocked
        ? "Finalised"
        : "Open";
  const timesheetOwnerName =
    timesheetReviewTarget?.userName?.trim() ||
    typedTimesheetProfile?.signatureName?.trim() ||
    user?.name?.trim() ||
    "Current User";
  const typedTimesheetHistory = useMemo(
    () =>
      Array.isArray(typedTimesheetMonthStatus?.historyJson)
        ? typedTimesheetMonthStatus.historyJson
            .slice()
            .sort((left, right) => {
              const leftTime = parsePlannerDate(left.createdAt)?.getTime() ?? 0;
              const rightTime = parsePlannerDate(right.createdAt)?.getTime() ?? 0;
              return rightTime - leftTime;
            })
        : [],
    [typedTimesheetMonthStatus]
  );
  const timesheetDeclarationResetKey = `${timesheetTargetUserId ?? user?.id ?? 0}:${monthStart.toISOString()}:${typedTimesheetMonthStatus?.status ?? "open"}:${typedTimesheetMonthStatus?.employeeDeclarationAcceptedAt ? String(typedTimesheetMonthStatus.employeeDeclarationAcceptedAt) : ""}`;
  useEffect(() => {
    setTimesheetSubmissionDeclarationAccepted(
      Boolean(typedTimesheetMonthStatus?.employeeDeclarationAccepted)
    );
  }, [timesheetDeclarationResetKey, typedTimesheetMonthStatus?.employeeDeclarationAccepted]);
  const timesheetReviewDeclarationResetKey = `${timesheetTargetUserId ?? user?.id ?? 0}:${monthStart.toISOString()}:${typedTimesheetMonthStatus?.status ?? "open"}:${typedTimesheetMonthStatus?.reviewerDeclarationAcceptedAt ? String(typedTimesheetMonthStatus.reviewerDeclarationAcceptedAt) : ""}`;
  useEffect(() => {
    setTimesheetReviewDeclarationAccepted(
      Boolean(typedTimesheetMonthStatus?.reviewerDeclarationAccepted)
    );
  }, [timesheetReviewDeclarationResetKey, typedTimesheetMonthStatus?.reviewerDeclarationAccepted]);
  const typedTimesheetOptions = useMemo(
    () =>
      (timesheetOptions as PlannerTimesheetOption[])
        .slice()
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
          }
          return left.label.localeCompare(right.label);
        }),
    [timesheetOptions]
  );
  const typedTimesheetTemplates = useMemo(
    () =>
      (timesheetTemplates as PlannerTimesheetTemplate[])
        .map((template) => ({
          ...template,
          leavePortionPercent:
            template.leavePortionPercent === 50 || template.leavePortionPercent === 100
              ? template.leavePortionPercent
              : null,
          selectedOptionIds: Array.isArray(template.selectedOptionIds)
            ? template.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
            : [],
        }))
        .sort((left, right) => {
          if (left.isActive !== right.isActive) {
            return left.isActive ? -1 : 1;
          }
          return left.label.localeCompare(right.label);
        }),
    [timesheetTemplates]
  );
  const typedTimesheetHolidays = useMemo(
    () =>
      (timesheetHolidays as PlannerTimesheetHoliday[])
        .slice()
        .sort((left, right) =>
          getDateKey(parsePlannerDate(left.holidayDate) ?? new Date(0)).localeCompare(
            getDateKey(parsePlannerDate(right.holidayDate) ?? new Date(0))
          )
        ),
    [timesheetHolidays]
  );
  const holidayByDateKey = useMemo(() => {
    const map = new Map<string, PlannerTimesheetHoliday>();
    typedTimesheetHolidays.forEach((holiday) => {
      const key = getDateKey(parsePlannerDate(holiday.holidayDate) ?? new Date(0));
      if (key) {
        map.set(key, holiday);
      }
    });
    return map;
  }, [typedTimesheetHolidays]);
  const currentMonthTimesheetHolidays = useMemo(
    () =>
      typedTimesheetHolidays.filter((holiday) => {
        const holidayDate = parsePlannerDate(holiday.holidayDate);
        return (
          holidayDate !== null &&
          holidayDate.getFullYear() === currentDate.getFullYear() &&
          holidayDate.getMonth() === currentDate.getMonth()
        );
      }),
    [currentDate, typedTimesheetHolidays]
  );
  const activeTimesheetOptions = useMemo(
    () => typedTimesheetOptions.filter((option) => option.isActive),
    [typedTimesheetOptions]
  );
  const activeNonWorkingTimesheetOptions = useMemo(
    () => activeTimesheetOptions.filter((option) => option.hoursCategory === "non_working"),
    [activeTimesheetOptions]
  );
  const activeTimesheetTemplates = useMemo(
    () => typedTimesheetTemplates.filter((template) => template.isActive),
    [typedTimesheetTemplates]
  );
  const defaultTimesheetLeaveOptionId = useMemo(() => {
    const preferredOption =
      activeNonWorkingTimesheetOptions.find((option) =>
        option.label.toLowerCase().includes("leave")
      ) ?? activeNonWorkingTimesheetOptions[0];
    return preferredOption?.id ? String(preferredOption.id) : "";
  }, [activeNonWorkingTimesheetOptions]);
  const timesheetOptionById = useMemo(
    () => new Map(typedTimesheetOptions.map((option) => [option.id, option])),
    [typedTimesheetOptions]
  );
  const timesheetTemplateById = useMemo(
    () => new Map(typedTimesheetTemplates.map((template) => [template.id, template])),
    [typedTimesheetTemplates]
  );
  const monThuDefaultTemplateLabel =
    typedTimesheetProfile?.monThuTemplateId
      ? timesheetTemplateById.get(typedTimesheetProfile.monThuTemplateId)?.label ?? "Not set"
      : "Not set";
  const fridayDefaultTemplateLabel =
    typedTimesheetProfile?.fridayTemplateId
      ? timesheetTemplateById.get(typedTimesheetProfile.fridayTemplateId)?.label ?? "Not set"
      : typedTimesheetProfile?.monThuTemplateId
        ? `${monThuDefaultTemplateLabel} (fallback)`
        : "Not set";
  const weekendDefaultTemplateLabel =
    typedTimesheetProfile?.weekendTemplateId
      ? timesheetTemplateById.get(typedTimesheetProfile.weekendTemplateId)?.label ?? "Not set"
      : "Not set";
  const typedTimesheetEntries = useMemo(
    () =>
      (timesheetEntries as PlannerTimesheetEntry[])
        .map((entry) => ({
          ...entry,
          leavePortionPercent:
            entry.leavePortionPercent === 50 || entry.leavePortionPercent === 100
              ? entry.leavePortionPercent
              : null,
        }))
        .sort((left, right) =>
          getDateKey(parsePlannerDate(left.entryDate) ?? new Date(0)).localeCompare(
            getDateKey(parsePlannerDate(right.entryDate) ?? new Date(0))
          )
        ),
    [timesheetEntries]
  );
  const typedPreviousTimesheetEntries = useMemo(
    () =>
      (previousTimesheetEntries as PlannerTimesheetEntry[])
        .map((entry) => ({
          ...entry,
          leavePortionPercent:
            entry.leavePortionPercent === 50 || entry.leavePortionPercent === 100
              ? entry.leavePortionPercent
              : null,
        }))
        .sort((left, right) =>
          getDateKey(parsePlannerDate(left.entryDate) ?? new Date(0)).localeCompare(
            getDateKey(parsePlannerDate(right.entryDate) ?? new Date(0))
          )
        ),
    [previousTimesheetEntries]
  );
  const typedYearTimesheetEntries = useMemo(
    () =>
      (yearTimesheetEntries as PlannerTimesheetEntry[])
        .map((entry) => ({
          ...entry,
          leavePortionPercent:
            entry.leavePortionPercent === 50 || entry.leavePortionPercent === 100
              ? entry.leavePortionPercent
              : null,
        }))
        .sort((left, right) =>
          getDateKey(parsePlannerDate(left.entryDate) ?? new Date(0)).localeCompare(
            getDateKey(parsePlannerDate(right.entryDate) ?? new Date(0))
          )
        ),
    [yearTimesheetEntries]
  );
  const timesheetEntriesByDate = useMemo(() => {
    const map = new Map<string, PlannerTimesheetEntry>();
    typedTimesheetEntries.forEach((entry) => {
      const key = getDateKey(parsePlannerDate(entry.entryDate) ?? new Date(0));
      if (key) {
        map.set(key, entry);
      }
    });
    return map;
  }, [typedTimesheetEntries]);
  const previousTimesheetEntriesByDayNumber = useMemo(() => {
    const map = new Map<number, PlannerTimesheetEntry>();
    typedPreviousTimesheetEntries.forEach((entry) => {
      const parsedDate = parsePlannerDate(entry.entryDate);
      if (!parsedDate) {
        return;
      }
      map.set(parsedDate.getDate(), entry);
    });
    return map;
  }, [typedPreviousTimesheetEntries]);
  const selectedTimesheetEntry = useMemo(
    () => timesheetEntriesByDate.get(getDateKey(selectedDate)) ?? null,
    [selectedDate, timesheetEntriesByDate]
  );
  const selectedPreviousTimesheetEntry = useMemo(
    () => previousTimesheetEntriesByDayNumber.get(selectedDate.getDate()) ?? null,
    [previousTimesheetEntriesByDayNumber, selectedDate]
  );
  const previousTimesheetMonthLabel = previousMonthStart.toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
  });
  useEffect(() => {
    const defaults = getTimesheetProfileHours(typedTimesheetProfile, selectedDate);
    setTimesheetDraftStartTime(selectedTimesheetEntry?.startTime ?? defaults.startTime);
    setTimesheetDraftEndTime(selectedTimesheetEntry?.endTime ?? defaults.endTime);
    setTimesheetDraftLunchBreakMinutes(
      selectedTimesheetEntry?.lunchBreakMinutes ?? defaults.lunchBreakMinutes
    );
    setTimesheetDraftTeaBreakMinutes(
      selectedTimesheetEntry?.teaBreakMinutes ?? defaults.teaBreakMinutes
    );
    setTimesheetDraftLeavePortionPercent(
      normaliseTimesheetLeavePortionPercent(selectedTimesheetEntry?.leavePortionPercent)
    );
    setTimesheetDraftOptionIds(
      Array.isArray(selectedTimesheetEntry?.selectedOptionIds)
        ? selectedTimesheetEntry?.selectedOptionIds
        : []
    );
    setTimesheetDraftRemarks(selectedTimesheetEntry?.remarks ?? "");
  }, [selectedTimesheetEntry, selectedDate, typedTimesheetProfile]);
  const selectedTimesheetOptions = useMemo(
    () =>
      activeTimesheetOptions.filter((option) =>
        timesheetDraftOptionIds.includes(option.id)
      ),
    [activeTimesheetOptions, timesheetDraftOptionIds]
  );
  const timesheetMonthRows = useMemo<PlannerTimesheetRow[]>(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), index + 1);
      const dateKey = getDateKey(date);
      const entry = timesheetEntriesByDate.get(dateKey);
      const previousEntry = previousTimesheetEntriesByDayNumber.get(date.getDate()) ?? null;
      const checkedOptionIds = Array.isArray(entry?.selectedOptionIds)
        ? entry?.selectedOptionIds
        : [];
      const checkedOptions = typedTimesheetOptions.filter((option) =>
        checkedOptionIds.includes(option.id)
      );
      const holiday = holidayByDateKey.get(dateKey) ?? null;
      const hasWorkingActivity = checkedOptions.some(
        (option) => option.hoursCategory !== "non_working"
      );
      const hasNonWorkingActivity = checkedOptions.some(
        (option) => option.hoursCategory === "non_working"
      );
      const leavePortionPercent = hasNonWorkingActivity
        ? normaliseTimesheetLeavePortionPercent(entry?.leavePortionPercent)
        : null;
      const leavePortionDays = hasNonWorkingActivity
        ? getTimesheetLeavePortionDays(leavePortionPercent)
        : 0;
      const hasLeavePortion = leavePortionDays > 0;
      const shouldCountAsNonWorkingDay =
        hasLeavePortion && leavePortionDays >= 1 && !hasWorkingActivity;
      const defaultHours = getTimesheetProfileHours(typedTimesheetProfile, date);
      const defaultExpectedMinutes =
        getNetWorkedMinutes(
          defaultHours.startTime,
          defaultHours.endTime,
          defaultHours.lunchBreakMinutes,
          defaultHours.teaBreakMinutes
        ) ?? 0;
      const startTime = entry?.startTime ?? defaultHours.startTime;
      const endTime = entry?.endTime ?? defaultHours.endTime;
      const lunchBreakMinutes =
        entry?.lunchBreakMinutes ?? defaultHours.lunchBreakMinutes ?? 0;
      const teaBreakMinutes = entry?.teaBreakMinutes ?? defaultHours.teaBreakMinutes ?? 0;
      const expectedMinutes = getAdjustedExpectedMinutes(
        defaultExpectedMinutes,
        leavePortionDays,
        Boolean(holiday)
      );
      const grossWorkedMinutes = entry ? getWorkedMinutes(startTime, endTime) : null;
      const workedMinutes = entry
        ? getNetWorkedMinutes(startTime, endTime, lunchBreakMinutes, teaBreakMinutes)
        : null;
      const comparisonStatus: PlannerTimesheetRow["comparisonStatus"] = !entry && !previousEntry
        ? "none"
        : entry && !previousEntry
          ? "new"
          : !entry && previousEntry
            ? "missing"
            : String(entry?.startTime || "").trim() === String(previousEntry?.startTime || "").trim() &&
                String(entry?.endTime || "").trim() === String(previousEntry?.endTime || "").trim() &&
                (entry?.lunchBreakMinutes ?? 0) === (previousEntry?.lunchBreakMinutes ?? 0) &&
                (entry?.teaBreakMinutes ?? 0) === (previousEntry?.teaBreakMinutes ?? 0) &&
                String(entry?.remarks || "").trim() === String(previousEntry?.remarks || "").trim() &&
                (entry?.leavePortionPercent ?? null) === (previousEntry?.leavePortionPercent ?? null) &&
                areTimesheetOptionSelectionsEqual(
                  entry?.selectedOptionIds,
                  previousEntry?.selectedOptionIds
                )
              ? "same"
              : "changed";
      const comparisonDetail =
        comparisonStatus === "none"
          ? `No saved day in ${previousTimesheetMonthLabel}`
          : comparisonStatus === "new"
            ? `New day compared with ${previousTimesheetMonthLabel}`
            : comparisonStatus === "missing"
              ? `Saved in ${previousTimesheetMonthLabel} only`
              : comparisonStatus === "same"
                ? `Matches ${previousTimesheetMonthLabel}`
                : `Changed from ${previousTimesheetMonthLabel}`;
      return {
        id: dateKey,
        date,
        dateKey,
        dayLabel: date.toLocaleDateString("en-ZA", { weekday: "short", day: "2-digit" }),
        hasSavedEntry: Boolean(entry),
        checkedOptionIds,
        checkedOptions,
        checkedCount: checkedOptions.length,
        hasWorkingActivity,
        hasNonWorkingActivity,
        hasLeavePortion,
        isPartialLeaveDay: hasLeavePortion && leavePortionDays < 1,
        isNonWorkingDay: shouldCountAsNonWorkingDay,
        isHoliday: Boolean(holiday),
        holidayLabel: holiday?.label ?? null,
        leavePortionPercent,
        leavePortionDays,
        startTime,
        endTime,
        lunchBreakMinutes,
        teaBreakMinutes,
        grossWorkedMinutes,
        workedMinutes,
        expectedMinutes,
        varianceMinutes:
          workedMinutes === null ? null : workedMinutes - expectedMinutes,
        remarks: entry?.remarks ?? "",
        comparisonStatus,
        comparisonDetail,
      };
    });
  }, [
    currentDate,
    daysInMonth,
    holidayByDateKey,
    previousTimesheetEntriesByDayNumber,
    previousTimesheetMonthLabel,
    timesheetEntriesByDate,
    typedTimesheetOptions,
    typedTimesheetProfile,
  ]);
  const timesheetSummary = useMemo(() => {
    const activeDays = timesheetMonthRows.filter(
      (row) =>
        row.hasSavedEntry || row.checkedOptionIds.length > 0 || row.remarks.trim()
    ).length;
    const totalTicks = timesheetMonthRows.reduce(
      (sum, row) => sum + row.checkedOptionIds.length,
      0
    );
    const workedMinutes = timesheetMonthRows.reduce(
      (sum, row) => sum + (row.workedMinutes ?? 0),
      0
    );
    const expectedMinutes = timesheetMonthRows.reduce(
      (sum, row) => sum + (row.hasSavedEntry ? row.expectedMinutes : 0),
      0
    );
    const personalLeaveDays = timesheetMonthRows.filter(
      (row) => row.hasSavedEntry && row.hasLeavePortion && !row.isHoliday
    ).reduce((sum, row) => sum + row.leavePortionDays, 0);
    return {
      activeDays,
      totalTicks,
      workedMinutes,
      expectedMinutes,
      personalLeaveDays,
      varianceMinutes: workedMinutes - expectedMinutes,
      activeOptionCount: activeTimesheetOptions.length,
    };
  }, [activeTimesheetOptions.length, timesheetMonthRows]);
  const currentTimesheetActivityUsageById = useMemo(() => {
    const map = new Map<number, number>();
    timesheetMonthRows.forEach((row) => {
      row.checkedOptionIds.forEach((optionId) => {
        map.set(optionId, (map.get(optionId) ?? 0) + 1);
      });
    });
    return map;
  }, [timesheetMonthRows]);
  const previousTimesheetSummary = useMemo(() => {
    let activeDays = 0;
    let totalTicks = 0;
    let workedMinutes = 0;
    let expectedMinutes = 0;
    let nonWorkingDays = 0;
    let personalLeaveDays = 0;
    const activityUsageById = new Map<number, number>();

    typedPreviousTimesheetEntries.forEach((entry) => {
      const entryDate = parsePlannerDate(entry.entryDate);
      if (!entryDate) {
        return;
      }

      const selectedOptionIds = Array.isArray(entry.selectedOptionIds)
        ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
        : [];
      const selectedOptions = selectedOptionIds
        .map((optionId) => timesheetOptionById.get(optionId))
        .filter((option): option is PlannerTimesheetOption => Boolean(option));
      const hasWorkingActivity = selectedOptions.some(
        (option) => option.hoursCategory !== "non_working"
      );
      const hasNonWorkingActivity = selectedOptions.some(
        (option) => option.hoursCategory === "non_working"
      );
      const leavePortionPercent = hasNonWorkingActivity
        ? normaliseTimesheetLeavePortionPercent(entry.leavePortionPercent)
        : null;
      const leavePortionDays = hasNonWorkingActivity
        ? getTimesheetLeavePortionDays(leavePortionPercent)
        : 0;
      const isNonWorkingDay = leavePortionDays >= 1 && !hasWorkingActivity;
      const holiday = holidayByDateKey.get(getDateKey(entryDate)) ?? null;
      const defaultHours = getTimesheetProfileHours(typedTimesheetProfile, entryDate);
      const defaultExpectedMinutes =
        getNetWorkedMinutes(
          defaultHours.startTime,
          defaultHours.endTime,
          defaultHours.lunchBreakMinutes,
          defaultHours.teaBreakMinutes
        ) ?? 0;
      const entryWorkedMinutes = getNetWorkedMinutes(
        entry.startTime,
        entry.endTime,
        entry.lunchBreakMinutes,
        entry.teaBreakMinutes
      );

      if (
        selectedOptionIds.length > 0 ||
        String(entry.remarks || "").trim() ||
        String(entry.startTime || "").trim() ||
        String(entry.endTime || "").trim()
      ) {
        activeDays += 1;
      }

      totalTicks += selectedOptionIds.length;
      workedMinutes += entryWorkedMinutes ?? 0;
      expectedMinutes += getAdjustedExpectedMinutes(
        defaultExpectedMinutes,
        leavePortionDays,
        Boolean(holiday)
      );

      if (isNonWorkingDay || Boolean(holiday)) {
        nonWorkingDays += 1;
      }
      if (leavePortionDays > 0 && !holiday) {
        personalLeaveDays += leavePortionDays;
      }

      selectedOptionIds.forEach((optionId) => {
        activityUsageById.set(optionId, (activityUsageById.get(optionId) ?? 0) + 1);
      });
    });

    return {
      monthLabel: previousTimesheetMonthLabel,
      activeDays,
      totalTicks,
      workedMinutes,
      expectedMinutes,
      varianceMinutes: workedMinutes - expectedMinutes,
      nonWorkingDays,
      personalLeaveDays,
      activityUsageById,
    };
  }, [
    holidayByDateKey,
    previousTimesheetMonthLabel,
    timesheetOptionById,
    typedPreviousTimesheetEntries,
    typedTimesheetProfile,
  ]);
  const timesheetMonthComparison = useMemo(() => {
    const activityShifts = activeTimesheetOptions
      .map((option) => {
        const currentCount = currentTimesheetActivityUsageById.get(option.id) ?? 0;
        const previousCount = previousTimesheetSummary.activityUsageById.get(option.id) ?? 0;
        return {
          optionId: option.id,
          label: option.label,
          currentCount,
          previousCount,
          delta: currentCount - previousCount,
        };
      })
      .filter((row) => row.currentCount > 0 || row.previousCount > 0)
      .sort((left, right) => {
        const deltaDifference = Math.abs(right.delta) - Math.abs(left.delta);
        if (deltaDifference !== 0) {
          return deltaDifference;
        }
        return left.label.localeCompare(right.label);
      });

    return {
      previousMonthLabel: previousTimesheetMonthLabel,
      hasPreviousData: typedPreviousTimesheetEntries.length > 0,
      workedMinutesDelta: timesheetSummary.workedMinutes - previousTimesheetSummary.workedMinutes,
      trackedDaysDelta: timesheetSummary.activeDays - previousTimesheetSummary.activeDays,
      totalTicksDelta: timesheetSummary.totalTicks - previousTimesheetSummary.totalTicks,
      personalLeaveDaysDelta:
        timesheetSummary.personalLeaveDays - previousTimesheetSummary.personalLeaveDays,
      varianceDelta: timesheetSummary.varianceMinutes - previousTimesheetSummary.varianceMinutes,
      topActivityShifts: activityShifts.slice(0, 5),
    };
  }, [
    activeTimesheetOptions,
    currentTimesheetActivityUsageById,
    previousTimesheetMonthLabel,
    previousTimesheetSummary,
    timesheetSummary,
    typedPreviousTimesheetEntries.length,
  ]);
  const timesheetDayComparisonSummary = useMemo(() => {
    return timesheetMonthRows.reduce(
      (summary, row) => {
        if (row.comparisonStatus === "same") summary.same += 1;
        if (row.comparisonStatus === "changed") summary.changed += 1;
        if (row.comparisonStatus === "new") summary.newDays += 1;
        if (row.comparisonStatus === "missing") summary.missing += 1;
        return summary;
      },
      {
        same: 0,
        changed: 0,
        newDays: 0,
        missing: 0,
      }
    );
  }, [timesheetMonthRows]);
  const typedTimesheetUserLeaveOverrideRows = useMemo<PlannerTimesheetLeaveOverrideRow[]>(
    () => timesheetUserLeaveOverrides as PlannerTimesheetLeaveOverrideRow[],
    [timesheetUserLeaveOverrides]
  );
  const typedTimesheetUserLeaveOverrideBlockRows =
    useMemo<PlannerTimesheetLeaveOverrideBlockRow[]>(
      () => timesheetUserLeaveOverrideBlocks as PlannerTimesheetLeaveOverrideBlockRow[],
      [timesheetUserLeaveOverrideBlocks]
    );
  const timesheetUserLeaveOverrideByDateKey = useMemo(() => {
    const map = new Map<string, PlannerTimesheetLeaveOverrideRow>();
    typedTimesheetUserLeaveOverrideRows.forEach((row) => {
      map.set(row.dateKey, row);
    });
    return map;
  }, [typedTimesheetUserLeaveOverrideRows]);
  const timesheetPersonalLeaveRows = useMemo<PlannerTimesheetLeaveRow[]>(
    () =>
      timesheetMonthRows
        .filter((row) => row.hasSavedEntry && row.hasLeavePortion && !row.isHoliday)
        .map((row) => {
          const leaveOptions = row.checkedOptions.filter(
            (option) => option.hoursCategory === "non_working"
          );
          const overrideRow = timesheetUserLeaveOverrideByDateKey.get(row.dateKey) ?? null;
          return {
            id: `leave-${row.dateKey}`,
            date: row.date,
            dateKey: row.dateKey,
            dayLabel: row.dayLabel,
            leaveLabels: leaveOptions.map((option) => option.label),
            leaveSummary:
              leaveOptions.length > 0
                ? leaveOptions.map((option) => option.label).join(", ")
                : "Non-working day",
            leavePortionPercent: row.leavePortionPercent,
            leavePortionDays: row.leavePortionDays,
            remarks: row.remarks.trim(),
            hasLeaveOverride: Boolean(overrideRow),
            overrideNote: overrideRow?.overrideNote ?? null,
            overrideReviewStatus: overrideRow?.reviewStatus ?? null,
            overrideReviewedAt: overrideRow?.reviewedAt ?? null,
            overrideReviewedByName: overrideRow?.reviewedByName ?? null,
            overrideReviewNote: overrideRow?.reviewNote ?? null,
            comparisonStatus: row.comparisonStatus,
          };
        }),
    [timesheetMonthRows, timesheetUserLeaveOverrideByDateKey]
  );
  const timesheetPersonalLeaveBreakdownRows = useMemo<PlannerTimesheetLeaveBreakdownRow[]>(() => {
    const usageByLabel = new Map<string, number>();
    timesheetPersonalLeaveRows.forEach((row) => {
      row.leaveLabels.forEach((label) => {
        usageByLabel.set(label, (usageByLabel.get(label) ?? 0) + row.leavePortionDays);
      });
    });
    return Array.from(usageByLabel.entries())
      .map(([label, usedDays]) => ({
        id: `leave-breakdown-${label}`,
        label,
        usedDays,
      }))
      .sort((left, right) => {
        if (right.usedDays !== left.usedDays) {
          return right.usedDays - left.usedDays;
        }
        return left.label.localeCompare(right.label);
      });
  }, [timesheetPersonalLeaveRows]);
  const timesheetPersonalLeaveBlocks = useMemo<PlannerTimesheetLeaveBlockRow[]>(() => {
    if (timesheetPersonalLeaveRows.length === 0) {
      return [];
    }

    const leaveDateKeySet = new Set(timesheetPersonalLeaveRows.map((row) => row.dateKey));
    const blocks: PlannerTimesheetLeaveBlockRow[] = [];
    let currentBlock: PlannerTimesheetLeaveBlockRow | null = null;

    for (const row of timesheetPersonalLeaveRows) {
      if (!currentBlock) {
        currentBlock = {
          id: `leave-block-${row.dateKey}`,
          startDate: row.date,
          endDate: row.date,
          startDateKey: row.dateKey,
          endDateKey: row.dateKey,
          entryDateKeys: [row.dateKey],
          startDayLabel: row.dayLabel,
          endDayLabel: row.dayLabel,
          leaveLabels: row.leaveLabels,
          leaveSummary: row.leaveSummary,
          leavePortionPercent: row.leavePortionPercent,
          leavePortionDays: row.leavePortionDays,
          remarks: row.remarks,
          usedDays: row.leavePortionDays,
          spanDays: 1,
          workingLeaveDays:
            row.date.getDay() === 0 || row.date.getDay() === 6 ? 0 : row.leavePortionDays,
          weekendLeaveDays:
            row.date.getDay() === 0 || row.date.getDay() === 6 ? row.leavePortionDays : 0,
          sharedHolidayGapDays: 0,
          hasLeaveOverride: row.hasLeaveOverride,
          overrideLeaveDays: row.hasLeaveOverride ? row.leavePortionDays : 0,
          pendingOverrideReviewCount:
            row.overrideReviewStatus === "pending" ? 1 : 0,
          reviewedOverrideCount:
            row.overrideReviewStatus === "reviewed" ? 1 : 0,
          overrideReviewStatus: row.hasLeaveOverride
            ? row.overrideReviewStatus === "reviewed"
              ? "reviewed"
              : "pending"
            : "none",
          latestOverrideNote: row.overrideNote,
          latestOverrideReviewedAt: row.overrideReviewedAt,
          latestOverrideReviewedByName: row.overrideReviewedByName,
          latestOverrideReviewNote: row.overrideReviewNote,
        };
        continue;
      }

      const previousDate = currentBlock.endDate;
      const sameLeaveSummary = currentBlock.leaveSummary === row.leaveSummary;
      const sameRemarks = currentBlock.remarks === row.remarks;
      const sameLeavePortion = currentBlock.leavePortionDays === row.leavePortionDays;
      let canBridgeGap = true;
      let sharedHolidayGapDays = 0;
      for (
        let cursor = addDays(previousDate, 1);
        cursor < row.date;
        cursor = addDays(cursor, 1)
      ) {
        const cursorKey = getDateKey(cursor);
        const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
        const isSharedHoliday = holidayByDateKey.has(cursorKey);
        if (isSharedHoliday) {
          sharedHolidayGapDays += 1;
        }
        if (!isWeekend && !isSharedHoliday && !leaveDateKeySet.has(cursorKey)) {
          canBridgeGap = false;
          break;
        }
      }

      if (canBridgeGap && sameLeaveSummary && sameRemarks && sameLeavePortion) {
        const isWeekendLeaveDay = row.date.getDay() === 0 || row.date.getDay() === 6;
        const nextPendingOverrideReviewCount: number =
          currentBlock.pendingOverrideReviewCount +
          (row.overrideReviewStatus === "pending" ? 1 : 0);
        const nextReviewedOverrideCount: number =
          currentBlock.reviewedOverrideCount +
          (row.overrideReviewStatus === "reviewed" ? 1 : 0);
        const currentReviewedAt: Date | null = currentBlock.latestOverrideReviewedAt
          ? new Date(currentBlock.latestOverrideReviewedAt)
          : null;
        const rowReviewedAt: Date | null = row.overrideReviewedAt
          ? new Date(row.overrideReviewedAt)
          : null;
        const shouldUseRowReview: boolean =
          rowReviewedAt !== null &&
          (currentReviewedAt === null || rowReviewedAt.getTime() >= currentReviewedAt.getTime());
        currentBlock = {
          ...currentBlock,
          endDate: row.date,
          endDateKey: row.dateKey,
          entryDateKeys: [...currentBlock.entryDateKeys, row.dateKey],
          endDayLabel: row.dayLabel,
          usedDays: currentBlock.usedDays + row.leavePortionDays,
          spanDays:
            Math.round(
              (startOfDay(row.date).getTime() - startOfDay(currentBlock.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1,
          workingLeaveDays:
            currentBlock.workingLeaveDays + (isWeekendLeaveDay ? 0 : row.leavePortionDays),
          weekendLeaveDays:
            currentBlock.weekendLeaveDays + (isWeekendLeaveDay ? row.leavePortionDays : 0),
          sharedHolidayGapDays: currentBlock.sharedHolidayGapDays + sharedHolidayGapDays,
          hasLeaveOverride: currentBlock.hasLeaveOverride || row.hasLeaveOverride,
          overrideLeaveDays:
            currentBlock.overrideLeaveDays + (row.hasLeaveOverride ? row.leavePortionDays : 0),
          pendingOverrideReviewCount: nextPendingOverrideReviewCount,
          reviewedOverrideCount: nextReviewedOverrideCount,
          overrideReviewStatus:
            nextPendingOverrideReviewCount === 0
              ? nextReviewedOverrideCount > 0
                ? "reviewed"
                : "none"
              : nextReviewedOverrideCount > 0
                ? "mixed"
                : "pending",
          latestOverrideNote: row.hasLeaveOverride
            ? row.overrideNote ?? currentBlock.latestOverrideNote
            : currentBlock.latestOverrideNote,
          latestOverrideReviewedAt: shouldUseRowReview
            ? row.overrideReviewedAt
            : currentBlock.latestOverrideReviewedAt,
          latestOverrideReviewedByName: shouldUseRowReview
            ? row.overrideReviewedByName
            : currentBlock.latestOverrideReviewedByName,
          latestOverrideReviewNote: shouldUseRowReview
            ? row.overrideReviewNote
            : currentBlock.latestOverrideReviewNote,
        };
        continue;
      }

      blocks.push(currentBlock);
      currentBlock = {
        id: `leave-block-${row.dateKey}`,
        startDate: row.date,
        endDate: row.date,
        startDateKey: row.dateKey,
        endDateKey: row.dateKey,
        entryDateKeys: [row.dateKey],
        startDayLabel: row.dayLabel,
        endDayLabel: row.dayLabel,
        leaveLabels: row.leaveLabels,
        leaveSummary: row.leaveSummary,
        leavePortionPercent: row.leavePortionPercent,
        leavePortionDays: row.leavePortionDays,
        remarks: row.remarks,
        usedDays: row.leavePortionDays,
        spanDays: 1,
        workingLeaveDays:
          row.date.getDay() === 0 || row.date.getDay() === 6 ? 0 : row.leavePortionDays,
        weekendLeaveDays:
          row.date.getDay() === 0 || row.date.getDay() === 6 ? row.leavePortionDays : 0,
        sharedHolidayGapDays: 0,
        hasLeaveOverride: row.hasLeaveOverride,
        overrideLeaveDays: row.hasLeaveOverride ? row.leavePortionDays : 0,
        pendingOverrideReviewCount:
          row.overrideReviewStatus === "pending" ? 1 : 0,
        reviewedOverrideCount:
          row.overrideReviewStatus === "reviewed" ? 1 : 0,
        overrideReviewStatus: row.hasLeaveOverride
          ? row.overrideReviewStatus === "reviewed"
            ? "reviewed"
            : "pending"
          : "none",
        latestOverrideNote: row.overrideNote,
        latestOverrideReviewedAt: row.overrideReviewedAt,
        latestOverrideReviewedByName: row.overrideReviewedByName,
        latestOverrideReviewNote: row.overrideReviewNote,
      };
    }

    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }, [holidayByDateKey, timesheetPersonalLeaveRows]);
  const timesheetPersonalLeaveOverrideSummary = useMemo(() => {
    const pendingDayCount = typedTimesheetUserLeaveOverrideRows.filter(
      (row) => row.reviewStatus !== "reviewed"
    ).length;
    const reviewedDayCount = typedTimesheetUserLeaveOverrideRows.filter(
      (row) => row.reviewStatus === "reviewed"
    ).length;
    const pendingBlockCount = typedTimesheetUserLeaveOverrideBlockRows.filter(
      (row) => row.reviewStatus !== "reviewed"
    ).length;
    const reviewedBlockCount = typedTimesheetUserLeaveOverrideBlockRows.filter(
      (row) => row.reviewStatus === "reviewed"
    ).length;
    const overrideLeaveDays = typedTimesheetUserLeaveOverrideRows.reduce(
      (sum, row) => sum + row.leavePortionDays,
      0
    );
    return {
      overrideLeaveDays,
      overrideDayCount: typedTimesheetUserLeaveOverrideRows.length,
      pendingDayCount,
      reviewedDayCount,
      pendingBlockCount,
      reviewedBlockCount,
    };
  }, [typedTimesheetUserLeaveOverrideBlockRows, typedTimesheetUserLeaveOverrideRows]);
  const timesheetPersonalLeaveUsedDays = useMemo(
    () =>
      timesheetPersonalLeaveBlocks.reduce(
        (total, row) => total + Math.max(0, row.workingLeaveDays),
        0
      ),
    [timesheetPersonalLeaveBlocks]
  );
  const timesheetPersonalLeaveYearUsedDays = useMemo(() => {
    return typedYearTimesheetEntries.reduce((total, entry) => {
      const entryDate = parsePlannerDate(entry.entryDate);
      if (!entryDate) {
        return total;
      }
      const dateKey = getDateKey(entryDate);
      if (holidayByDateKey.has(dateKey)) {
        return total;
      }
      const matchedOptions = (entry.selectedOptionIds ?? [])
        .map((optionId) => timesheetOptionById.get(optionId))
        .filter((option): option is PlannerTimesheetOption => Boolean(option));
      const hasNonWorking = matchedOptions.some((option) => option.hoursCategory === "non_working");
      if (!hasNonWorking) {
        return total;
      }
      const leavePortionDays = getTimesheetLeavePortionDays(entry.leavePortionPercent);
      return total + (entryDate.getDay() === 0 || entryDate.getDay() === 6 ? 0 : leavePortionDays);
    }, 0);
  }, [holidayByDateKey, timesheetOptionById, typedYearTimesheetEntries]);
  const timesheetPersonalLeaveCarryOverDays =
    typedTimesheetProfile?.personalLeaveCarryOverDays ?? 0;
  const timesheetPersonalLeaveAllowanceDays =
    typedTimesheetProfile?.personalLeaveAllowanceDays ?? null;
  const timesheetPersonalLeaveAvailableDays =
    timesheetPersonalLeaveAllowanceDays === null
      ? null
      : timesheetPersonalLeaveAllowanceDays + timesheetPersonalLeaveCarryOverDays;
  const timesheetPersonalLeaveRemainingDays =
    timesheetPersonalLeaveAvailableDays === null
      ? null
      : timesheetPersonalLeaveAvailableDays - timesheetPersonalLeaveYearUsedDays;
  const timesheetAvailabilityCalendarWeeks = useMemo(() => {
    const leadingEmptyDays = (new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() + 6) % 7;
    const cells: Array<PlannerTimesheetRow | null> = [
      ...Array.from({ length: leadingEmptyDays }, () => null),
      ...timesheetMonthRows,
    ];
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) =>
      cells.slice(index * 7, index * 7 + 7)
    );
  }, [currentDate, timesheetMonthRows]);
  const selectedDayComparisonStatus: PlannerTimesheetRow["comparisonStatus"] = !selectedTimesheetEntry &&
    !selectedPreviousTimesheetEntry
    ? "none"
    : !selectedTimesheetEntry && selectedPreviousTimesheetEntry
      ? "missing"
      : selectedTimesheetEntry && !selectedPreviousTimesheetEntry
        ? "new"
        : String(selectedTimesheetEntry?.startTime || "").trim() ===
              String(selectedPreviousTimesheetEntry?.startTime || "").trim() &&
            String(selectedTimesheetEntry?.endTime || "").trim() ===
              String(selectedPreviousTimesheetEntry?.endTime || "").trim() &&
            (selectedTimesheetEntry?.lunchBreakMinutes ?? 0) ===
              (selectedPreviousTimesheetEntry?.lunchBreakMinutes ?? 0) &&
            (selectedTimesheetEntry?.teaBreakMinutes ?? 0) ===
              (selectedPreviousTimesheetEntry?.teaBreakMinutes ?? 0) &&
            String(selectedTimesheetEntry?.remarks || "").trim() ===
              String(selectedPreviousTimesheetEntry?.remarks || "").trim() &&
            areTimesheetOptionSelectionsEqual(
              selectedTimesheetEntry?.selectedOptionIds,
              selectedPreviousTimesheetEntry?.selectedOptionIds
            )
          ? "same"
          : "changed";
  const selectedPreviousTimesheetOptions = useMemo(
    () =>
      Array.isArray(selectedPreviousTimesheetEntry?.selectedOptionIds)
        ? typedTimesheetOptions.filter((option) =>
            selectedPreviousTimesheetEntry.selectedOptionIds.includes(option.id)
          )
        : [],
    [selectedPreviousTimesheetEntry, typedTimesheetOptions]
  );
  const selectedDayWorkedMinutes = useMemo(
    () =>
      getNetWorkedMinutes(
        timesheetDraftStartTime,
        timesheetDraftEndTime,
        timesheetDraftLunchBreakMinutes,
        timesheetDraftTeaBreakMinutes
      ),
    [
      timesheetDraftEndTime,
      timesheetDraftLunchBreakMinutes,
      timesheetDraftStartTime,
      timesheetDraftTeaBreakMinutes,
    ]
  );
  const selectedDayHasWorkingActivity = useMemo(
    () =>
      selectedTimesheetOptions.some((option) => option.hoursCategory !== "non_working"),
    [selectedTimesheetOptions]
  );
  const selectedDayHasNonWorkingActivity = useMemo(
    () =>
      selectedTimesheetOptions.some((option) => option.hoursCategory === "non_working"),
    [selectedTimesheetOptions]
  );
  const selectedDayLeavePortionPercent = selectedDayHasNonWorkingActivity
    ? normaliseTimesheetLeavePortionPercent(timesheetDraftLeavePortionPercent)
    : null;
  const selectedDayLeavePortionDays = selectedDayHasNonWorkingActivity
    ? getTimesheetLeavePortionDays(selectedDayLeavePortionPercent)
    : 0;
  const selectedDayHasLeavePortion = selectedDayLeavePortionDays > 0;
  const selectedDayIsNonWorking =
    selectedDayHasLeavePortion && selectedDayLeavePortionDays >= 1 && !selectedDayHasWorkingActivity;
  const selectedDayIsPartialLeave =
    selectedDayHasLeavePortion && selectedDayLeavePortionDays > 0 && selectedDayLeavePortionDays < 1;
  const selectedDayHoliday = holidayByDateKey.get(getDateKey(selectedDate)) ?? null;
  const selectedDayExpectedMinutes = useMemo(
    () => {
      const defaultHours = getTimesheetProfileHours(typedTimesheetProfile, selectedDate);
      const defaultExpectedMinutes =
        getNetWorkedMinutes(
          defaultHours.startTime,
          defaultHours.endTime,
          defaultHours.lunchBreakMinutes,
          defaultHours.teaBreakMinutes
        ) ?? 0;
      return getAdjustedExpectedMinutes(
        defaultExpectedMinutes,
        selectedDayLeavePortionDays,
        Boolean(selectedDayHoliday)
      );
    },
    [selectedDate, selectedDayHoliday, selectedDayLeavePortionDays, typedTimesheetProfile]
  );
  const selectedDayVarianceMinutes =
    selectedDayWorkedMinutes === null
      ? null
      : selectedDayWorkedMinutes - selectedDayExpectedMinutes;
  const timesheetOptionSummaryRows = useMemo<PlannerTimesheetOptionSummary[]>(
    () =>
      activeTimesheetOptions
        .map((option) => ({
          id: `timesheet-option-summary-${option.id}`,
          optionId: option.id,
          label: option.label,
          description: option.description ?? "",
          usedDays: timesheetMonthRows.filter((row) =>
            row.checkedOptionIds.includes(option.id)
          ).length,
        }))
        .sort((left, right) => {
          if (right.usedDays !== left.usedDays) {
            return right.usedDays - left.usedDays;
          }
          return left.label.localeCompare(right.label);
        }),
    [activeTimesheetOptions, timesheetMonthRows]
  );
  const timesheetWeekRows = useMemo<PlannerTimesheetWeekRow[]>(() => {
    const weeks = new Map<
      string,
      {
        startDate: Date;
        endDate: Date;
        loggedDays: number;
        dueWorkingDays: number;
        completedWorkingDays: number;
        blockerCount: number;
        warningCount: number;
        workedMinutes: number;
        expectedMinutes: number;
      }
    >();
    const todayKey = getDateKey(today);

    for (const row of timesheetMonthRows) {
      const weekStart = startOfWeek(row.date);
      const weekKey = getDateKey(weekStart);
      const existing = weeks.get(weekKey);
      const isDueWorkingDay = row.expectedMinutes > 0 && row.dateKey <= todayKey;
      const hasTimes = row.startTime.trim() && row.endTime.trim();
      const hasActivity = row.checkedOptionIds.length > 0;
      const isCompletedWorkingDay =
        isDueWorkingDay &&
        row.hasSavedEntry &&
        Boolean(hasTimes) &&
        hasActivity;
      const hasBlocker =
        isDueWorkingDay &&
        (!row.hasSavedEntry || !hasActivity || !hasTimes);
      const hasWarning =
        row.expectedMinutes > 0 &&
        row.hasSavedEntry &&
        row.varianceMinutes !== null &&
        (row.varianceMinutes < 0 || row.varianceMinutes > 0);

      if (existing) {
        existing.endDate = row.date;
        if (row.hasSavedEntry) {
          existing.loggedDays += 1;
          existing.workedMinutes += row.workedMinutes ?? 0;
          existing.expectedMinutes += row.expectedMinutes;
        }
        if (isDueWorkingDay) {
          existing.dueWorkingDays += 1;
        }
        if (isCompletedWorkingDay) {
          existing.completedWorkingDays += 1;
        }
        if (hasBlocker) {
          existing.blockerCount += 1;
        }
        if (hasWarning) {
          existing.warningCount += 1;
        }
      } else {
        weeks.set(weekKey, {
          startDate: weekStart,
          endDate: row.date,
          loggedDays: row.hasSavedEntry ? 1 : 0,
          dueWorkingDays: isDueWorkingDay ? 1 : 0,
          completedWorkingDays: isCompletedWorkingDay ? 1 : 0,
          blockerCount: hasBlocker ? 1 : 0,
          warningCount: hasWarning ? 1 : 0,
          workedMinutes: row.hasSavedEntry ? (row.workedMinutes ?? 0) : 0,
          expectedMinutes: row.hasSavedEntry ? row.expectedMinutes : 0,
        });
      }
    }

    return Array.from(weeks.entries())
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([weekKey, week], index) => {
        const weekRows = timesheetMonthRows.filter(
          (row) => getDateKey(startOfWeek(row.date)) === weekKey
        );
        const firstBlockerRow =
          weekRows.find((row) => {
            const isDueWorkingDay = row.expectedMinutes > 0 && row.dateKey <= todayKey;
            if (!isDueWorkingDay) {
              return false;
            }
            const hasTimes = row.startTime.trim() && row.endTime.trim();
            const hasActivity = row.checkedOptionIds.length > 0;
            return !row.hasSavedEntry || !hasActivity || !hasTimes;
          }) ?? null;
        const firstWarningRow =
          weekRows.find(
            (row) =>
              row.expectedMinutes > 0 &&
              row.hasSavedEntry &&
              row.varianceMinutes !== null &&
              (row.varianceMinutes < 0 || row.varianceMinutes > 0)
          ) ?? null;
        const firstTrackedRow =
          weekRows.find((row) => row.hasSavedEntry || row.checkedOptionIds.length > 0) ??
          weekRows[0] ??
          null;
        const varianceMinutes = week.workedMinutes - week.expectedMinutes;
        const completionPercent =
          week.dueWorkingDays > 0
            ? Math.round((week.completedWorkingDays / week.dueWorkingDays) * 100)
            : 0;
        const readinessStatus =
          week.dueWorkingDays === 0
            ? "upcoming"
            : week.blockerCount > 0
              ? "needs_work"
              : week.warningCount > 0
                ? "warnings"
                : week.completedWorkingDays >= week.dueWorkingDays
                  ? "ready"
                  : "in_progress";
        const nextActionRow = firstBlockerRow ?? firstWarningRow ?? firstTrackedRow;
        const nextActionLabel = firstBlockerRow
          ? "Open first blocker day"
          : firstWarningRow
            ? "Open first warning day"
            : "Open week";
        const nextActionDetail = firstBlockerRow
          ? `Start on ${firstBlockerRow.dayLabel} to fix the first incomplete working day.`
          : firstWarningRow
            ? `Start on ${firstWarningRow.dayLabel} to review the first short or overtime day.`
            : week.dueWorkingDays > 0
              ? "Review the week from the start date."
              : "Future week with no due days yet.";
        return {
          id: `timesheet-week-${weekKey}`,
          weekLabel: `Week ${index + 1}`,
          rangeLabel: formatDateRangeLabel(week.startDate, week.endDate),
          startDate: week.startDate,
          endDate: week.endDate,
          loggedDays: week.loggedDays,
          dueWorkingDays: week.dueWorkingDays,
          completedWorkingDays: week.completedWorkingDays,
          blockerCount: week.blockerCount,
          warningCount: week.warningCount,
          completionPercent,
          readinessStatus,
          nextActionDate: nextActionRow?.date ?? week.startDate,
          nextActionLabel,
          nextActionDetail,
          workedMinutes: week.workedMinutes,
          expectedMinutes: week.expectedMinutes,
          varianceMinutes,
          overtimeMinutes: varianceMinutes > 0 ? varianceMinutes : 0,
          shortMinutes: varianceMinutes < 0 ? Math.abs(varianceMinutes) : 0,
        };
      });
  }, [timesheetMonthRows, today]);
  const timesheetAttentionRows = useMemo<PlannerTimesheetAttentionRow[]>(() => {
    const rows: PlannerTimesheetAttentionRow[] = [];
    const todayKey = getDateKey(today);

    for (const row of timesheetMonthRows) {
      if (row.dateKey > todayKey) {
        continue;
      }

      const isWorkingDay = row.expectedMinutes > 0;
      const hasTimes = row.startTime.trim() && row.endTime.trim();
      const detailDate = row.date.toLocaleDateString("en-ZA", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      });

      if (isWorkingDay && !row.hasSavedEntry) {
        rows.push({
          id: `timesheet-attention-missing-${row.dateKey}`,
          date: row.date,
          dateKey: row.dateKey,
          dayLabel: detailDate,
          category: "missing",
          issueLabel: "Missing entry",
          detail: "No timesheet entry has been saved for this planned working day.",
        });
        continue;
      }

      if (!row.hasSavedEntry) {
        continue;
      }

      if (isWorkingDay && !hasTimes) {
        rows.push({
          id: `timesheet-attention-hours-${row.dateKey}`,
          date: row.date,
          dateKey: row.dateKey,
          dayLabel: detailDate,
          category: "hours",
          issueLabel: "Missing hours",
          detail: "Start time or end time is still missing for this day.",
        });
      }

      if (row.checkedOptionIds.length === 0) {
        rows.push({
          id: `timesheet-attention-activity-${row.dateKey}`,
          date: row.date,
          dateKey: row.dateKey,
          dayLabel: detailDate,
          category: "activity",
          issueLabel: "No activity ticked",
          detail: "The day has been saved without any selected activity options.",
        });
      }

      if (
        isWorkingDay &&
        row.varianceMinutes !== null &&
        row.varianceMinutes < 0
      ) {
        rows.push({
          id: `timesheet-attention-short-${row.dateKey}`,
          date: row.date,
          dateKey: row.dateKey,
          dayLabel: detailDate,
          category: "short",
          issueLabel: "Short day",
          detail: `${formatMinutesAsDuration(Math.abs(row.varianceMinutes))} below the planned working day.`,
        });
      }

      if (
        row.expectedMinutes > 0 &&
        row.varianceMinutes !== null &&
        row.varianceMinutes > 0
      ) {
        rows.push({
          id: `timesheet-attention-overtime-${row.dateKey}`,
          date: row.date,
          dateKey: row.dateKey,
          dayLabel: detailDate,
          category: "overtime",
          issueLabel: "Overtime logged",
          detail: `${formatMinutesAsDuration(row.varianceMinutes)} above the planned working day.`,
        });
      }
    }

    return rows.sort((left, right) => {
      if (left.dateKey !== right.dateKey) {
        return left.dateKey.localeCompare(right.dateKey);
      }
      return left.issueLabel.localeCompare(right.issueLabel);
    });
  }, [timesheetMonthRows, today]);
  const timesheetAttentionByDateKey = useMemo(() => {
    const map = new Map<string, PlannerTimesheetAttentionRow[]>();
    timesheetAttentionRows.forEach((row) => {
      const current = map.get(row.dateKey) ?? [];
      current.push(row);
      map.set(row.dateKey, current);
    });
    return map;
  }, [timesheetAttentionRows]);
  const timesheetAvailabilitySummary = useMemo(() => {
    const summary = {
      all: timesheetMonthRows.length,
      worked: 0,
      leave: 0,
      holiday: 0,
      review: 0,
      empty: 0,
    };
    timesheetMonthRows.forEach((row) => {
      const attentionCount = (timesheetAttentionByDateKey.get(row.dateKey) ?? []).length;
      if (row.isHoliday) {
        summary.holiday += 1;
      } else if (row.hasLeavePortion) {
        summary.leave += 1;
      } else if (row.hasSavedEntry) {
        summary.worked += 1;
      } else {
        summary.empty += 1;
      }
      if (attentionCount > 0) {
        summary.review += 1;
      }
    });
    return summary;
  }, [timesheetAttentionByDateKey, timesheetMonthRows]);
  const firstMissingTimesheetRow = useMemo(
    () =>
      timesheetMonthRows.find((row) => {
        const attentionItems = timesheetAttentionByDateKey.get(row.dateKey) ?? [];
        return attentionItems.some((item) => item.category === "missing");
      }) ?? null,
    [timesheetAttentionByDateKey, timesheetMonthRows]
  );
  const firstReviewTimesheetRow = useMemo(
    () =>
      timesheetMonthRows.find((row) => {
        const attentionItems = timesheetAttentionByDateKey.get(row.dateKey) ?? [];
        return attentionItems.length > 0;
      }) ?? null,
    [timesheetAttentionByDateKey, timesheetMonthRows]
  );
  const timesheetSubmissionBlockers = useMemo(
    () =>
      timesheetAttentionRows.filter((row) =>
        ["missing", "hours", "activity"].includes(row.category)
      ),
    [timesheetAttentionRows]
  );
  const timesheetSubmissionWarnings = useMemo(
    () => timesheetAttentionRows.filter((row) => ["short", "overtime"].includes(row.category)),
    [timesheetAttentionRows]
  );
  const timesheetCompletionSummary = useMemo(() => {
    const dueWorkingRows = timesheetMonthRows.filter(
      (row) => row.expectedMinutes > 0 && row.dateKey <= getDateKey(today)
    );
    const completedWorkingDays = dueWorkingRows.filter((row) => {
      const hasTimes = row.startTime.trim() && row.endTime.trim();
      return (
        row.hasSavedEntry &&
        row.checkedOptionIds.length > 0 &&
        Boolean(hasTimes)
      );
    }).length;
    const dueWorkingDays = dueWorkingRows.length;
    const completionPercent =
      dueWorkingDays > 0 ? Math.round((completedWorkingDays / dueWorkingDays) * 100) : 0;

    return {
      dueWorkingDays,
      completedWorkingDays,
      blockerCount: timesheetSubmissionBlockers.length,
      warningCount: timesheetSubmissionWarnings.length,
      completionPercent,
    };
  }, [timesheetMonthRows, timesheetSubmissionBlockers.length, timesheetSubmissionWarnings.length, today]);
  const timesheetOverviewRows = useMemo<PlannerTimesheetOverviewDashboardRow[]>(
    () =>
      (timesheetOverview as PlannerTimesheetOverviewRow[]).map((row) => {
        const submittedAgeDays = getPlannerAgeInDays(row.submittedAt, today);
        let attentionLabel = "In Progress";
        let attentionDetail = "Month still needs more entries before it is ready.";

        if (row.workflowStatus === "handed_off") {
          attentionLabel = "Handed Off";
          attentionDetail = "Month was approved and already handed off for payroll or admin processing.";
        } else if (row.workflowStatus === "approved") {
          attentionLabel = "Approved";
          attentionDetail = "Month has already been fully reviewed and is waiting for final handoff.";
        } else if (row.workflowStatus === "submitted") {
          attentionLabel =
            submittedAgeDays !== null && submittedAgeDays >= 2
              ? `Overdue Review (${submittedAgeDays}d)`
              : "Awaiting Review";
          attentionDetail =
            submittedAgeDays !== null
              ? `Submitted ${submittedAgeDays} day${submittedAgeDays === 1 ? "" : "s"} ago and waiting for internal review.`
              : "Month is waiting for internal review.";
        } else if (row.workflowStatus === "open" && row.reviewedAt) {
          attentionLabel = "Returned";
          attentionDetail = "Month was returned for changes and still needs resubmission.";
        } else if (row.blockerCount > 0) {
          attentionLabel = "Blocked";
          attentionDetail = `${row.blockerCount} blocking issue${row.blockerCount === 1 ? "" : "s"} still need attention.`;
        } else if (row.warningCount > 0) {
          attentionLabel = "Warnings";
          attentionDetail = `${row.warningCount} warning${row.warningCount === 1 ? "" : "s"} should be reviewed before submission.`;
        } else if (row.completionPercent >= 100 && row.dueWorkingDays > 0) {
          attentionLabel = "Ready";
          attentionDetail = "Month is complete and looks ready for internal review.";
        } else if (row.trackedDays === 0) {
          attentionLabel = "Not Started";
          attentionDetail = "No saved timesheet entries yet for this month.";
        }

        return {
          ...row,
          attentionLabel,
          attentionDetail,
          submittedAgeDays,
        };
      }),
    [timesheetOverview, today]
  );
  const timesheetReviewQueueRows = useMemo<PlannerTimesheetReviewQueueDashboardRow[]>(
    () => {
      const overviewByUserMonth = new Map(
        timesheetOverviewRows.map((row) => [
          `${row.userId}:${getDateKey(parsePlannerDate(row.monthDate) ?? new Date(0))}`,
          row,
        ])
      );

      return (timesheetReviewQueue as PlannerTimesheetReviewQueueRow[]).map((row) => {
        const overviewRow =
          overviewByUserMonth.get(
            `${row.userId}:${getDateKey(parsePlannerDate(row.monthDate) ?? new Date(0))}`
          ) ?? null;

        return {
          ...row,
          waitingDays: getPlannerAgeInDays(row.submittedAt ?? row.lockedAt, today),
          blockerCount: overviewRow?.blockerCount ?? 0,
          warningCount: overviewRow?.warningCount ?? 0,
        };
      });
    },
    [timesheetOverviewRows, timesheetReviewQueue, today]
  );
  const activeTimesheetReviewQueueRow = useMemo(() => {
    if (!timesheetReviewTarget) {
      return null;
    }

    const currentMonthKey = getDateKey(monthStart);
    return (
      timesheetReviewQueueRows.find((row) => {
        const rowMonthKey = getDateKey(parsePlannerDate(row.monthDate) ?? new Date(0));
        return row.userId === timesheetReviewTarget.userId && rowMonthKey === currentMonthKey;
      }) ?? null
    );
  }, [monthStart, timesheetReviewQueueRows, timesheetReviewTarget]);
  const timesheetApprovedRows = useMemo<PlannerTimesheetApprovedQueueRow[]>(
    () =>
      timesheetOverviewRows
        .filter((row) => row.workflowStatus === "approved" || row.workflowStatus === "handed_off")
        .map((row) => ({
          ...row,
          approvedAgeDays: getPlannerAgeInDays(row.reviewedAt, today),
          handoffAgeDays: getPlannerAgeInDays(row.handedOffAt, today),
        }))
        .sort((left, right) => {
          const leftTime = left.handedOffAt
            ? new Date(left.handedOffAt).getTime()
            : left.reviewedAt
              ? new Date(left.reviewedAt).getTime()
              : 0;
          const rightTime = right.handedOffAt
            ? new Date(right.handedOffAt).getTime()
            : right.reviewedAt
              ? new Date(right.reviewedAt).getTime()
              : 0;
          return rightTime - leftTime;
        }),
    [timesheetOverviewRows, today]
  );
  const timesheetPendingHandoffRows = useMemo(
    () => timesheetApprovedRows.filter((row) => row.workflowStatus === "approved"),
    [timesheetApprovedRows]
  );
  const timesheetHandedOffRows = useMemo(
    () => timesheetApprovedRows.filter((row) => row.workflowStatus === "handed_off"),
    [timesheetApprovedRows]
  );
  const timesheetTeamSummary = useMemo(() => {
    const overdueReviewCount = timesheetReviewQueueRows.filter(
      (row) => (row.waitingDays ?? 0) >= 2
    ).length;
    const blockedCount = timesheetOverviewRows.filter((row) => row.blockerCount > 0).length;
    const warningsOnlyCount = timesheetOverviewRows.filter(
      (row) => row.blockerCount === 0 && row.warningCount > 0
    ).length;
    const returnedCount = timesheetOverviewRows.filter(
      (row) => row.workflowStatus === "open" && Boolean(row.reviewedAt)
    ).length;
    const handedOffCount = timesheetHandedOffRows.length;
    return {
      submittedCount: timesheetReviewQueueRows.length,
      overdueReviewCount,
      blockedCount,
      warningsOnlyCount,
      returnedCount,
      approvedCount: timesheetPendingHandoffRows.length,
      handedOffCount,
    };
  }, [
    timesheetHandedOffRows.length,
    timesheetOverviewRows,
    timesheetPendingHandoffRows.length,
    timesheetReviewQueueRows,
  ]);
  const typedTimesheetDepartmentCoverageSettings =
    useMemo<PlannerTimesheetDepartmentCoverageSetting[]>(
      () =>
        (timesheetDepartmentCoverageSettings as PlannerTimesheetDepartmentCoverageSetting[])
          .slice()
          .sort((left, right) => left.department.localeCompare(right.department)),
      [timesheetDepartmentCoverageSettings]
    );
  const timesheetTeamLeaveRows = useMemo<PlannerTimesheetTeamLeaveOverviewRow[]>(
    () => timesheetTeamLeaveOverview as PlannerTimesheetTeamLeaveOverviewRow[],
    [timesheetTeamLeaveOverview]
  );
  const timesheetTeamLeaveOverrideRows = useMemo(
    () => timesheetTeamLeaveRows.filter((row) => row.hasLeaveOverride),
    [timesheetTeamLeaveRows]
  );
  const timesheetLeaveOverrideRegisterRows = useMemo<PlannerTimesheetLeaveOverrideRow[]>(
    () => timesheetLeaveOverrideRegister as PlannerTimesheetLeaveOverrideRow[],
    [timesheetLeaveOverrideRegister]
  );
  const timesheetLeaveOverrideBlockRows = useMemo<PlannerTimesheetLeaveOverrideBlockRow[]>(
    () => timesheetLeaveOverrideBlocks as PlannerTimesheetLeaveOverrideBlockRow[],
    [timesheetLeaveOverrideBlocks]
  );
  const timesheetPendingLeaveOverrideQueueRows = useMemo<PlannerTimesheetLeaveOverrideQueueRow[]>(() => {
    return timesheetLeaveOverrideRegisterRows
      .filter((row) => row.reviewStatus !== "reviewed")
      .map((row) => {
        const waitingDays = Math.max(0, getPlannerAgeInDays(row.loggedAt ?? row.date, today) ?? 0);
        const priority: PlannerTimesheetLeaveOverrideQueueRow["priority"] =
          waitingDays >= 2 ? "high" : "medium";
        return {
          ...row,
          waitingDays,
          priority,
          statusLabel: waitingDays >= 2 ? "Overdue Review" : "Pending Review",
        };
      })
      .sort((left, right) => {
        if (left.waitingDays !== right.waitingDays) {
          return right.waitingDays - left.waitingDays;
        }
        const leftLoggedAt = parsePlannerDate(left.loggedAt ?? left.date)?.getTime() ?? 0;
        const rightLoggedAt = parsePlannerDate(right.loggedAt ?? right.date)?.getTime() ?? 0;
        if (leftLoggedAt !== rightLoggedAt) {
          return leftLoggedAt - rightLoggedAt;
        }
        const leftDate = parsePlannerDate(left.date)?.getTime() ?? 0;
        const rightDate = parsePlannerDate(right.date)?.getTime() ?? 0;
        if (leftDate !== rightDate) {
          return rightDate - leftDate;
        }
        return left.userName.localeCompare(right.userName);
      });
  }, [timesheetLeaveOverrideRegisterRows, today]);
  const timesheetPendingLeaveOverrideBlockQueueRows = useMemo<
    PlannerTimesheetLeaveOverrideBlockQueueRow[]
  >(() => {
    return timesheetLeaveOverrideBlockRows
      .filter((row) => row.pendingReviewCount > 0)
      .map((row) => {
        const waitingDays = Math.max(
          0,
          getPlannerAgeInDays(row.oldestPendingLoggedAt ?? row.startDate, today) ?? 0
        );
        const priority: PlannerTimesheetLeaveOverrideBlockQueueRow["priority"] =
          waitingDays >= 2 ? "high" : "medium";
        const statusLabel =
          row.reviewedCount > 0
            ? waitingDays >= 2
              ? "Partly Reviewed / Overdue"
              : "Partly Reviewed"
            : waitingDays >= 2
              ? "Overdue Review"
              : "Pending Review";
        return {
          ...row,
          waitingDays,
          priority,
          statusLabel,
        };
      })
      .sort((left, right) => {
        if (left.waitingDays !== right.waitingDays) {
          return right.waitingDays - left.waitingDays;
        }
        const leftStartDate = parsePlannerDate(left.startDate)?.getTime() ?? 0;
        const rightStartDate = parsePlannerDate(right.startDate)?.getTime() ?? 0;
        if (leftStartDate !== rightStartDate) {
          return rightStartDate - leftStartDate;
        }
        return left.userName.localeCompare(right.userName);
      });
  }, [timesheetLeaveOverrideBlockRows, today]);
  const timesheetReviewedLeaveOverrideBlockRows = useMemo<PlannerTimesheetLeaveOverrideBlockRow[]>(
    () =>
      [...timesheetLeaveOverrideBlockRows]
        .filter((row) => row.reviewStatus === "reviewed")
        .sort((left, right) => {
          const leftReviewedAt = parsePlannerDate(left.latestReviewedAt)?.getTime() ?? 0;
          const rightReviewedAt = parsePlannerDate(right.latestReviewedAt)?.getTime() ?? 0;
          if (leftReviewedAt !== rightReviewedAt) {
            return rightReviewedAt - leftReviewedAt;
          }
          const leftStartDate = parsePlannerDate(left.startDate)?.getTime() ?? 0;
          const rightStartDate = parsePlannerDate(right.startDate)?.getTime() ?? 0;
          if (leftStartDate !== rightStartDate) {
            return rightStartDate - leftStartDate;
          }
          return left.userName.localeCompare(right.userName);
        }),
    [timesheetLeaveOverrideBlockRows]
  );
  const timesheetDepartmentLeaveRows = useMemo<PlannerTimesheetDepartmentLeaveRow[]>(() => {
    const groups = new Map<string, PlannerTimesheetTeamLeaveOverviewRow[]>();
    for (const row of timesheetTeamLeaveRows) {
      const departmentLabel = row.department?.trim() || "No Department";
      const groupRows = groups.get(departmentLabel) ?? [];
      groupRows.push(row);
      groups.set(departmentLabel, groupRows);
    }

    return Array.from(groups.entries())
      .map(([departmentLabel, rows]) => {
        const headcount = rows.length;
        const peopleOnLeaveCount = rows.filter((row) => row.activeLeaveToday).length;
        const upcomingLeaveCount = rows.filter((row) => row.upcomingLeave).length;
        const peopleWithLeaveCount = rows.filter((row) => Number(row.personalLeaveDays || 0) > 0).length;
        const totalLeaveDays = rows.reduce((sum, row) => sum + Number(row.personalLeaveDays || 0), 0);
        const leaveBlockCount = rows.reduce((sum, row) => sum + Number(row.leaveBlockCount || 0), 0);
        const remainingLeaveValues = rows
          .map((row) => row.leaveRemainingDays)
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
        const averageRemainingDays =
          remainingLeaveValues.length > 0
            ? remainingLeaveValues.reduce((sum, value) => sum + value, 0) / remainingLeaveValues.length
            : null;
        const coveragePercent =
          headcount > 0 ? Math.round((peopleOnLeaveCount / headcount) * 100) : 0;
        const leaveTypes = Array.from(
          new Set(rows.flatMap((row) => row.leaveTypes).filter(Boolean))
        ).sort((left, right) => left.localeCompare(right));
        const nextLeaveDates = rows
          .map((row) => parsePlannerDate(row.nextLeaveDate))
          .filter((value): value is Date => Boolean(value))
          .sort((left, right) => left.getTime() - right.getTime());
        const nextLeaveDate = nextLeaveDates[0] ?? null;
        const primaryUser =
          rows.find((row) => row.activeLeaveToday) ??
          rows.find((row) => row.upcomingLeave) ??
          rows
            .slice()
            .sort((left, right) => {
              if (Number(left.personalLeaveDays || 0) !== Number(right.personalLeaveDays || 0)) {
                return Number(right.personalLeaveDays || 0) - Number(left.personalLeaveDays || 0);
              }
              return left.userName.localeCompare(right.userName);
            })[0] ??
          null;

        let availabilityLabel = "No Leave";
        let availabilityDetail = "No one in this department has leave recorded this month.";
        if (peopleOnLeaveCount > 0) {
          availabilityLabel = "On Leave Today";
          availabilityDetail = `${peopleOnLeaveCount} of ${headcount} people are off today.`;
        } else if (upcomingLeaveCount > 0) {
          availabilityLabel = "Upcoming Leave";
          availabilityDetail = `${upcomingLeaveCount} people still have leave coming later this month.`;
        } else if (peopleWithLeaveCount > 0) {
          availabilityLabel = "Leave Logged";
          availabilityDetail = `${peopleWithLeaveCount} people have leave recorded in this month.`;
        }

        return {
          id: `department-leave-${departmentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "none"}`,
          departmentLabel,
          headcount,
          peopleOnLeaveCount,
          upcomingLeaveCount,
          peopleWithLeaveCount,
          totalLeaveDays,
          leaveBlockCount,
          averageRemainingDays,
          coveragePercent,
          nextLeaveDate,
          leaveTypes,
          availabilityLabel,
          availabilityDetail,
          primaryUserId: primaryUser?.userId ?? null,
          primaryUserName: primaryUser?.userName ?? null,
          primaryUserEmail: primaryUser?.userEmail ?? null,
        };
      })
      .sort((left, right) => {
        if (left.peopleOnLeaveCount !== right.peopleOnLeaveCount) {
          return right.peopleOnLeaveCount - left.peopleOnLeaveCount;
        }
        if (left.upcomingLeaveCount !== right.upcomingLeaveCount) {
          return right.upcomingLeaveCount - left.upcomingLeaveCount;
        }
        if (left.totalLeaveDays !== right.totalLeaveDays) {
          return right.totalLeaveDays - left.totalLeaveDays;
        }
        return left.departmentLabel.localeCompare(right.departmentLabel);
      });
  }, [timesheetTeamLeaveRows]);
  const timesheetTeamLeaveCalendarRows = useMemo<PlannerTimesheetTeamLeaveCalendarRow[]>(
    () => timesheetTeamLeaveCalendar as PlannerTimesheetTeamLeaveCalendarRow[],
    [timesheetTeamLeaveCalendar]
  );
  const timesheetTeamLeaveCoverageRows = useMemo<PlannerTimesheetTeamLeaveCoverageRow[]>(() => {
    const teamSize = Math.max(timesheetTeamLeaveRows.length, 1);
    return timesheetTeamLeaveCalendarRows
      .map((row) => {
        const coveragePercent = Math.round((row.peopleOnLeaveCount / teamSize) * 100);
        const hasSharedHolidayOverlap =
          row.sharedHolidayLabels.length > 0 && row.peopleOnLeaveCount > 0;
        const isHigh = row.peopleOnLeaveCount >= 3 || coveragePercent >= 30;
        const isMedium =
          !isHigh &&
          (row.peopleOnLeaveCount >= 2 || coveragePercent >= 20 || hasSharedHolidayOverlap);
        if (!isHigh && !isMedium) {
          return null;
        }
        const severity: "high" | "medium" = isHigh ? "high" : "medium";
        const severityLabel = isHigh ? "High Coverage Risk" : "Coverage Watch";
        const detailParts = [
          `${row.peopleOnLeaveCount} person${row.peopleOnLeaveCount === 1 ? "" : "s"} off`,
          `${coveragePercent}% of visible team`,
          hasSharedHolidayOverlap
            ? `${row.sharedHolidayLabels.length} shared holiday overlap`
            : null,
        ].filter(Boolean);
        return {
          id: `coverage-${row.dateKey}`,
          date: row.date,
          dateKey: row.dateKey,
          severity,
          severityLabel,
          coveragePercent,
          peopleOnLeaveCount: row.peopleOnLeaveCount,
          totalLeaveDays: row.totalLeaveDays,
          detail: detailParts.join(", "),
          usersOnLeave: row.usersOnLeave,
          leaveTypes: row.leaveTypes,
          sharedHolidayLabels: row.sharedHolidayLabels,
          primaryUserId: row.primaryUserId,
          primaryUserName: row.primaryUserName,
          primaryUserEmail: row.primaryUserEmail,
        };
      })
      .filter((row): row is PlannerTimesheetTeamLeaveCoverageRow => Boolean(row))
      .sort((left, right) => {
        const leftPriority = left.severity === "high" ? 0 : 1;
        const rightPriority = right.severity === "high" ? 0 : 1;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        if (left.coveragePercent !== right.coveragePercent) {
          return right.coveragePercent - left.coveragePercent;
        }
        return (parsePlannerDate(left.date)?.getTime() ?? 0) - (parsePlannerDate(right.date)?.getTime() ?? 0);
      });
  }, [timesheetTeamLeaveCalendarRows, timesheetTeamLeaveRows.length]);
  const timesheetDepartmentCoverageRows = useMemo<PlannerTimesheetDepartmentCoverageRow[]>(() => {
    const departmentByUserId = new Map<number, string>();
    const headcountByDepartment = new Map<string, number>();
    const settingsByDepartment = new Map<string, PlannerTimesheetDepartmentCoverageSetting>();
    for (const setting of typedTimesheetDepartmentCoverageSettings) {
      settingsByDepartment.set(normalisePlannerDepartmentLabel(setting.department), setting);
    }
    for (const row of timesheetTeamLeaveRows) {
      const departmentLabel = row.department?.trim() || "No Department";
      departmentByUserId.set(row.userId, departmentLabel);
      headcountByDepartment.set(
        departmentLabel,
        (headcountByDepartment.get(departmentLabel) ?? 0) + 1
      );
    }

    const rows: PlannerTimesheetDepartmentCoverageRow[] = [];
    for (const calendarRow of timesheetTeamLeaveCalendarRows) {
      const usersByDepartment = new Map<
        string,
        Array<{ userId: number; userName: string; userEmail: string | null }>
      >();
      for (const userRow of calendarRow.usersOnLeave) {
        const departmentLabel = departmentByUserId.get(userRow.userId) ?? "No Department";
        const groupUsers = usersByDepartment.get(departmentLabel) ?? [];
        groupUsers.push(userRow);
        usersByDepartment.set(departmentLabel, groupUsers);
      }

      for (const [departmentLabel, usersOnLeave] of Array.from(usersByDepartment.entries())) {
        const departmentKey = normalisePlannerDepartmentLabel(departmentLabel);
        const headcount = Math.max(headcountByDepartment.get(departmentLabel) ?? 0, 1);
        const peopleOnLeaveCount = usersOnLeave.length;
        const availableCount = Math.max(headcount - peopleOnLeaveCount, 0);
        const coveragePercent = Math.round((peopleOnLeaveCount / headcount) * 100);
        const hasSharedHolidayOverlap =
          calendarRow.sharedHolidayLabels.length > 0 && peopleOnLeaveCount > 0;
        const departmentRule = settingsByDepartment.get(departmentKey) ?? null;
        const minimumAvailableCount = departmentRule?.minimumAvailableCount ?? null;
        const maximumPeopleOff = departmentRule?.maximumPeopleOff ?? null;
        const mediumRiskPercent = departmentRule?.mediumRiskPercent ?? 25;
        const highRiskPercent = departmentRule?.highRiskPercent ?? 50;
        const highReasons: string[] = [];
        const watchReasons: string[] = [];

        if (minimumAvailableCount !== null) {
          if (availableCount < minimumAvailableCount) {
            highReasons.push(`available ${availableCount} below minimum ${minimumAvailableCount}`);
          } else if (availableCount === minimumAvailableCount) {
            watchReasons.push(`available staff sitting on minimum ${minimumAvailableCount}`);
          }
        }
        if (maximumPeopleOff !== null) {
          if (peopleOnLeaveCount > maximumPeopleOff) {
            highReasons.push(`people off ${peopleOnLeaveCount} above max ${maximumPeopleOff}`);
          } else if (peopleOnLeaveCount === maximumPeopleOff) {
            watchReasons.push(`people off at max ${maximumPeopleOff}`);
          }
        }
        if (coveragePercent >= highRiskPercent) {
          highReasons.push(`coverage ${coveragePercent}% at or above ${highRiskPercent}%`);
        } else if (coveragePercent >= mediumRiskPercent) {
          watchReasons.push(`coverage ${coveragePercent}% at or above ${mediumRiskPercent}%`);
        }

        if (!departmentRule) {
          if (coveragePercent >= 50 || (peopleOnLeaveCount >= 2 && headcount <= 4)) {
            highReasons.push("default department risk threshold reached");
          } else if (coveragePercent >= 25 || peopleOnLeaveCount >= 2) {
            watchReasons.push("default department watch threshold reached");
          }
        }

        if (hasSharedHolidayOverlap) {
          watchReasons.push(
            `${calendarRow.sharedHolidayLabels.length} shared holiday overlap${
              calendarRow.sharedHolidayLabels.length === 1 ? "" : "s"
            }`
          );
        }

        const isHigh = highReasons.length > 0;
        const isMedium = !isHigh && watchReasons.length > 0;
        if (!isHigh && !isMedium) {
          continue;
        }

        const severity: "high" | "medium" = isHigh ? "high" : "medium";
        const severityLabel = isHigh ? "High Dept Risk" : "Dept Watch";
        const totalLeaveDays = usersOnLeave.reduce(
          (sum: number, _userRow: { userId: number; userName: string; userEmail: string | null }) =>
            sum + 1,
          0
        );
        const detailParts = [
          `${peopleOnLeaveCount} of ${headcount} off`,
          `${coveragePercent}% coverage impact`,
          hasSharedHolidayOverlap
            ? `${calendarRow.sharedHolidayLabels.length} holiday overlap`
            : null,
        ].filter(Boolean);
        const primaryUser =
          usersOnLeave
            .slice()
            .sort(
              (
                left: { userId: number; userName: string; userEmail: string | null },
                right: { userId: number; userName: string; userEmail: string | null }
              ) => left.userName.localeCompare(right.userName)
            )[0] ?? null;

        rows.push({
          id: `department-coverage-${
            departmentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "none"
          }-${calendarRow.dateKey}`,
          date: calendarRow.date,
          dateKey: calendarRow.dateKey,
          departmentLabel,
          departmentKey,
          severity,
          severityLabel,
          coveragePercent,
          peopleOnLeaveCount,
          headcount,
          availableCount,
          totalLeaveDays,
          detail: detailParts.join(", "),
          ruleLabel: departmentRule
            ? [
                minimumAvailableCount !== null ? `Min available ${minimumAvailableCount}` : null,
                maximumPeopleOff !== null ? `Max off ${maximumPeopleOff}` : null,
                `Watch ${mediumRiskPercent}%`,
                `High ${highRiskPercent}%`,
              ]
                .filter(Boolean)
                .join(", ")
            : "Default thresholds",
          triggerLabel: (isHigh ? highReasons : watchReasons).join("; "),
          minimumAvailableCount,
          maximumPeopleOff,
          mediumRiskPercent,
          highRiskPercent,
          usersOnLeave,
          leaveTypes: calendarRow.leaveTypes,
          sharedHolidayLabels: calendarRow.sharedHolidayLabels,
          primaryUserId: primaryUser?.userId ?? null,
          primaryUserName: primaryUser?.userName ?? null,
          primaryUserEmail: primaryUser?.userEmail ?? null,
        });
      }
    }

    return rows.sort((left, right) => {
      const leftPriority = left.severity === "high" ? 0 : 1;
      const rightPriority = right.severity === "high" ? 0 : 1;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      if (left.coveragePercent !== right.coveragePercent) {
        return right.coveragePercent - left.coveragePercent;
      }
      const leftDate = parsePlannerDate(left.date)?.getTime() ?? 0;
      const rightDate = parsePlannerDate(right.date)?.getTime() ?? 0;
      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }
      return left.departmentLabel.localeCompare(right.departmentLabel);
    });
  }, [
    timesheetTeamLeaveCalendarRows,
    timesheetTeamLeaveRows,
    typedTimesheetDepartmentCoverageSettings,
  ]);
  const timesheetKnownDepartments = useMemo(
    () =>
      Array.from(
        new Set(
          timesheetTeamLeaveRows
            .map((row) => row.department?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [timesheetTeamLeaveRows]
  );
  const timesheetTeamAttentionRows = useMemo<PlannerTimesheetTeamAttentionRow[]>(() => {
    const rows: PlannerTimesheetTeamAttentionRow[] = [];

    for (const row of timesheetPendingLeaveOverrideQueueRows) {
      rows.push({
        id: `override-review-${row.userId}-${row.dateKey}`,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        monthDate: row.monthDate,
        entryDate: row.date,
        category: "override_review",
        priority: row.priority,
        statusLabel: row.statusLabel,
        detail: `${formatPlannerDate(row.date)}: ${row.leaveSummary || "Override leave"} still needs an admin review note.`,
        submittedAt: row.loggedAt ?? row.date,
        waitingDays: row.waitingDays,
      });
    }

    for (const row of timesheetReviewQueueRows) {
      const waitingDays = row.waitingDays ?? 0;
      rows.push({
        id: `review-${row.userId}-${getDateKey(parsePlannerDate(row.monthDate) ?? currentDate)}`,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        monthDate: row.monthDate,
        category: "review",
        priority: waitingDays >= 2 ? "high" : "medium",
        statusLabel: waitingDays >= 2 ? "Overdue Review" : "Awaiting Review",
        detail:
          waitingDays >= 2
            ? `Submitted ${waitingDays} days ago and still waiting for internal review.`
            : "Submitted month is waiting for internal review.",
        submittedAt: row.submittedAt ?? row.lockedAt,
        waitingDays: row.waitingDays,
      });
    }

    for (const row of timesheetOverviewRows) {
      if (row.workflowStatus === "submitted" || row.workflowStatus === "approved" || row.workflowStatus === "handed_off") {
        if (row.workflowStatus === "approved") {
          const approvedAgeDays = getPlannerAgeInDays(row.reviewedAt, today) ?? 0;
          rows.push({
            id: `handoff-${row.userId}-${getDateKey(parsePlannerDate(row.monthDate) ?? currentDate)}`,
            userId: row.userId,
            userName: row.userName,
            userEmail: row.userEmail,
            monthDate: row.monthDate,
            category: "handoff",
            priority: approvedAgeDays >= 2 ? "high" : "medium",
            statusLabel: approvedAgeDays >= 2 ? "Overdue Handoff" : "Pending Handoff",
            detail:
              approvedAgeDays >= 2
                ? `Approved ${approvedAgeDays} days ago and still waiting for payroll or admin handoff.`
                : "Approved month is still waiting for payroll or admin handoff.",
            submittedAt: row.reviewedAt,
            waitingDays: getPlannerAgeInDays(row.reviewedAt, today),
          });
        }
        continue;
      }

      if (row.workflowStatus === "open" && row.reviewedAt) {
        rows.push({
          id: `returned-${row.userId}-${getDateKey(parsePlannerDate(row.monthDate) ?? currentDate)}`,
          userId: row.userId,
          userName: row.userName,
          userEmail: row.userEmail,
          monthDate: row.monthDate,
          category: "returned",
          priority: "high",
          statusLabel: "Returned For Changes",
          detail: "Month was returned for changes and still needs resubmission.",
          submittedAt: row.reviewedAt,
          waitingDays: getPlannerAgeInDays(row.reviewedAt, today),
        });
        continue;
      }

      if (row.blockerCount > 0) {
        rows.push({
          id: `blocked-${row.userId}-${getDateKey(parsePlannerDate(row.monthDate) ?? currentDate)}`,
          userId: row.userId,
          userName: row.userName,
          userEmail: row.userEmail,
          monthDate: row.monthDate,
          category: "blocked",
          priority: "medium",
          statusLabel: "Blocked",
          detail: `${row.blockerCount} blocking issue${row.blockerCount === 1 ? "" : "s"} still need attention before submission.`,
          submittedAt: row.lastEntryAt,
          waitingDays: null,
        });
        continue;
      }

      if (row.warningCount > 0) {
        rows.push({
          id: `warning-${row.userId}-${getDateKey(parsePlannerDate(row.monthDate) ?? currentDate)}`,
          userId: row.userId,
          userName: row.userName,
          userEmail: row.userEmail,
          monthDate: row.monthDate,
          category: "warning",
          priority: "low",
          statusLabel: "Warnings Only",
          detail: `${row.warningCount} warning${row.warningCount === 1 ? "" : "s"} should be reviewed before submission.`,
          submittedAt: row.lastEntryAt,
          waitingDays: null,
        });
      }
    }

    const priorityRank: Record<PlannerTimesheetTeamAttentionRow["priority"], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return rows.sort((left, right) => {
      const leftRank = priorityRank[left.priority];
      const rightRank = priorityRank[right.priority];
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      const leftDate = parsePlannerDate(left.monthDate)?.getTime() ?? 0;
      const rightDate = parsePlannerDate(right.monthDate)?.getTime() ?? 0;
      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }
      return left.userName.localeCompare(right.userName);
    });
  }, [
    currentDate,
    timesheetOverviewRows,
    timesheetPendingLeaveOverrideQueueRows,
    timesheetReviewQueueRows,
    today,
  ]);
  const canSubmitTimesheetMonth =
    !isViewingAnotherTimesheet &&
    isTimesheetMonthLocked &&
    !submitTimesheetMonthMutation.isPending &&
    !isTimesheetMonthSubmitted &&
    !isTimesheetMonthApproved &&
    !isTimesheetMonthHandedOff &&
    timesheetSubmissionBlockers.length === 0 &&
    timesheetSubmissionDeclarationAccepted;
  const timesheetSubmitDisabledReason = isViewingAnotherTimesheet
    ? "You are reviewing another user's month, so submission is not available here."
    : !isTimesheetMonthLocked
      ? "Finalise Month first before you can submit it for review."
      : isTimesheetMonthSubmitted
        ? "This month has already been submitted for review."
        : isTimesheetMonthHandedOff
          ? "This month has already been handed off for payroll or admin processing."
        : isTimesheetMonthApproved
          ? "This month has already been approved."
          : timesheetSubmissionBlockers.length > 0
            ? `${timesheetSubmissionBlockers.length} blocking item${timesheetSubmissionBlockers.length === 1 ? "" : "s"} must be fixed before submission.`
            : !timesheetSubmissionDeclarationAccepted
              ? "Confirm the employee declaration before submitting this month for review."
            : "";
  const openTimesheetReviewTarget = (row: {
    userId: number;
    userName: string;
    userEmail: string | null;
    monthDate: string | Date;
    entryDate?: string | Date | null;
  }) => {
    const parsedMonth = parsePlannerDate(row.monthDate);
    if (parsedMonth) {
      const monthView = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1);
      setCurrentDate(monthView);
      const parsedEntryDate = parsePlannerDate(row.entryDate);
      if (
        parsedEntryDate &&
        parsedEntryDate.getFullYear() === monthView.getFullYear() &&
        parsedEntryDate.getMonth() === monthView.getMonth()
      ) {
        setSelectedDate(startOfDay(parsedEntryDate));
      } else {
        setSelectedDate(monthView);
      }
    }

    setTimesheetReviewTarget({
      userId: row.userId,
      userName: row.userName,
      userEmail: row.userEmail,
    });
  };
  const openTimesheetLeaveCalendarTarget = (row: {
    date: string | Date;
    primaryUserId: number | null;
    primaryUserName: string | null;
    primaryUserEmail: string | null;
  }) => {
    setSelectedDate(startOfDay(parsePlannerDate(row.date) ?? currentDate));
    if (!row.primaryUserId || !row.primaryUserName) {
      return;
    }
    openTimesheetReviewTarget({
      userId: row.primaryUserId,
      userName: row.primaryUserName,
      userEmail: row.primaryUserEmail,
      monthDate: monthStart,
    });
  };
  const openTimesheetDepartmentLeaveTarget = (row: PlannerTimesheetDepartmentLeaveRow) => {
    if (!row.primaryUserId || !row.primaryUserName) {
      return;
    }
    openTimesheetReviewTarget({
      userId: row.primaryUserId,
      userName: row.primaryUserName,
      userEmail: row.primaryUserEmail,
      monthDate: monthStart,
    });
  };
  const plannerAdminOnlySectionIds = useMemo(
    () =>
      new Set([
        "timesheet-team-overview",
        "timesheet-team-leave",
        "timesheet-review-queue",
        "timesheet-team-attention",
        "timesheet-department-leave-overview",
        "timesheet-leave-override-watch",
        "timesheet-override-review-blocks",
        "timesheet-override-review-queue",
        "timesheet-reviewed-override-block-archive",
      ]),
    []
  );
  const plannerWorkspaceSectionIds = useMemo<
    Record<PlannerTimesheetWorkspace, string[]>
  >(
    () => ({
      all: [
        "timesheet-summary",
        "timesheet-month-comparison",
        "timesheet-month-history",
        "timesheet-day-editor",
        "timesheet-activity-setup",
        "timesheet-saved-templates",
        "timesheet-holidays",
        "timesheet-personal-leave",
        "timesheet-override-history",
        "timesheet-availability",
        "timesheet-weekly-summary",
        "timesheet-attention",
        "timesheet-team-attention",
        "timesheet-team-overview",
        "timesheet-team-leave",
        "timesheet-department-leave-overview",
        "timesheet-leave-override-watch",
        "timesheet-override-review-blocks",
        "timesheet-override-review-queue",
        "timesheet-reviewed-override-block-archive",
        "timesheet-review-queue",
        "timesheet-admin-review-notice",
        "timesheet-monthly-activity-totals",
        "timesheet-register",
      ],
      month: [
        "timesheet-summary",
        "timesheet-month-comparison",
        "timesheet-month-history",
        "timesheet-day-editor",
        "timesheet-activity-setup",
        "timesheet-saved-templates",
        "timesheet-weekly-summary",
        "timesheet-attention",
        "timesheet-monthly-activity-totals",
        "timesheet-register",
      ],
      leave: [
        "timesheet-summary",
        "timesheet-holidays",
        "timesheet-personal-leave",
        "timesheet-override-history",
        "timesheet-availability",
        "timesheet-team-leave",
        "timesheet-department-leave-overview",
        "timesheet-leave-override-watch",
        "timesheet-override-review-blocks",
        "timesheet-override-review-queue",
        "timesheet-reviewed-override-block-archive",
        "timesheet-admin-review-notice",
      ],
      review: [
        "timesheet-summary",
        "timesheet-team-attention",
        "timesheet-team-overview",
        "timesheet-team-leave",
        "timesheet-department-leave-overview",
        "timesheet-leave-override-watch",
        "timesheet-override-review-blocks",
        "timesheet-override-review-queue",
        "timesheet-reviewed-override-block-archive",
        "timesheet-review-queue",
      ],
    }),
    []
  );
  const visiblePlannerSectionIds = useMemo(() => {
    const workspaceId =
      activePlannerWorkspace === "review" && !isTimesheetReviewAdmin
        ? "all"
        : activePlannerWorkspace;
    return new Set(plannerWorkspaceSectionIds[workspaceId]);
  }, [activePlannerWorkspace, isTimesheetReviewAdmin, plannerWorkspaceSectionIds]);
  const shouldShowPlannerSection = (sectionId: string) =>
    visiblePlannerSectionIds.has(sectionId);
  const getPlannerWorkspaceResumeTarget = (workspace: PlannerTimesheetWorkspace) => {
    const workspaceId =
      workspace === "review" && !isTimesheetReviewAdmin ? "all" : workspace;
    const saved = plannerWorkspaceResumeState[workspaceId];
    const visibleSectionIds = plannerWorkspaceSectionIds[workspaceId];
    const fallbackSectionId = visibleSectionIds[0] ?? "timesheet-summary";
    const sectionId =
      saved?.sectionId && visibleSectionIds.includes(resolvePlannerSectionTargetId(saved.sectionId))
        ? saved.sectionId
        : fallbackSectionId;
    const savedDate = saved?.dateKey ? parsePlannerDate(saved.dateKey) : null;
    return {
      workspaceId,
      sectionId,
      date: savedDate ? startOfDay(savedDate) : null,
    };
  };
  const activePlannerWorkspaceResumeTarget = useMemo(
    () => getPlannerWorkspaceResumeTarget(activePlannerWorkspace),
    [activePlannerWorkspace, isTimesheetReviewAdmin, plannerWorkspaceResumeState, plannerWorkspaceSectionIds]
  );
  const resolvePlannerSectionTargetId = (sectionId: string) => {
    if (!sectionId.trim()) {
      return "timesheet-summary";
    }
    if (!isTimesheetReviewAdmin && plannerAdminOnlySectionIds.has(sectionId)) {
      return "timesheet-admin-review-notice";
    }
    return sectionId;
  };
  const setPlannerSectionQueryParam = (sectionId: string | null) => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    if (sectionId?.trim()) {
      url.searchParams.set("timesheetSection", sectionId.trim());
    } else {
      url.searchParams.delete("timesheetSection");
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const setPlannerWorkspaceQueryParam = (workspace: PlannerTimesheetWorkspace | null) => {
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    if (workspace) {
      url.searchParams.set("timesheetWorkspace", workspace);
    } else {
      url.searchParams.delete("timesheetWorkspace");
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const buildPlannerSectionLink = (sectionId: string) => {
    if (typeof window === "undefined") {
      return "";
    }
    const url = new URL(window.location.href);
    url.searchParams.set("timesheetSection", sectionId);
    url.searchParams.set("timesheetWorkspace", activePlannerWorkspace);
    return url.toString();
  };
  const handleCopyPlannerSectionLink = async (sectionId: string) => {
    const link = buildPlannerSectionLink(sectionId);
    if (!link) {
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Planner section link copied.");
    } catch {
      toast.error("Could not copy the planner section link.");
    }
  };
  const scrollPlannerSectionIntoView = (
    sectionId: string,
    options?: { persistQuery?: boolean; behavior?: ScrollBehavior }
  ) => {
    if (typeof document === "undefined") {
      return;
    }
    const targetId = resolvePlannerSectionTargetId(sectionId);
    const element = document.getElementById(targetId);
    if (!element) {
      return;
    }
    setActivePlannerSectionId(targetId);
    if (options?.persistQuery !== false) {
      setPlannerSectionQueryParam(sectionId);
    }
    element.scrollIntoView({ behavior: options?.behavior ?? "smooth", block: "start" });
  };
  const handleSetPlannerWorkspace = (workspace: PlannerTimesheetWorkspace) => {
    const resumeTarget = getPlannerWorkspaceResumeTarget(workspace);
    setActivePlannerWorkspace(resumeTarget.workspaceId);
    setPlannerWorkspaceQueryParam(resumeTarget.workspaceId);
    setActivePlannerSectionId(null);
    if (resumeTarget.date) {
      setCurrentDate(
        new Date(
          resumeTarget.date.getFullYear(),
          resumeTarget.date.getMonth(),
          1
        )
      );
      setSelectedDate(resumeTarget.date);
    }
    scrollPlannerSectionIntoView(resumeTarget.sectionId, {
      persistQuery: true,
      behavior: "smooth",
    });
  };
  const openPlannerSectionInWorkspace = (
    workspace: PlannerTimesheetWorkspace,
    sectionId: string
  ) => {
    const nextWorkspace =
      workspace === "review" && !isTimesheetReviewAdmin ? "all" : workspace;
    setActivePlannerWorkspace(nextWorkspace);
    setPlannerWorkspaceQueryParam(nextWorkspace);
    setActivePlannerSectionId(null);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        scrollPlannerSectionIntoView(sectionId, {
          persistQuery: true,
          behavior: "smooth",
        });
      }, 0);
    }
  };
  const openPlannerDateSectionInWorkspace = (
    workspace: PlannerTimesheetWorkspace,
    sectionId: string,
    date: Date
  ) => {
    const targetDate = startOfDay(date);
    setCurrentDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
    setSelectedDate(targetDate);
    openPlannerSectionInWorkspace(workspace, sectionId);
  };
  const openPlannerWorkspaceShortcut = (target: PlannerWorkspaceLinkTarget) => {
    const shortcutDate = target.dateKey ? parsePlannerDate(target.dateKey) : null;
    if (shortcutDate) {
      openPlannerDateSectionInWorkspace(
        target.workspace,
        target.sectionId,
        shortcutDate
      );
      return;
    }
    openPlannerSectionInWorkspace(target.workspace, target.sectionId);
  };
  const renamePlannerWorkspaceShortcut = (shortcutId: string) => {
    if (typeof window === "undefined") {
      return;
    }
    const existingShortcut = plannerWorkspaceShortcuts.find((shortcut) => shortcut.id === shortcutId);
    if (!existingShortcut) {
      return;
    }
    const nextLabel = window.prompt("Rename planner shortcut", existingShortcut.label)?.trim();
    if (!nextLabel) {
      return;
    }
    setPlannerWorkspaceShortcuts((current) =>
      current.map((shortcut) =>
        shortcut.id === shortcutId ? { ...shortcut, label: nextLabel } : shortcut
      )
    );
    toast.success("Planner shortcut renamed.");
  };
  const togglePlannerWorkspaceShortcutPinned = (shortcutId: string) => {
    setPlannerWorkspaceShortcuts((current) => {
      const updated = current.map((shortcut) =>
        shortcut.id === shortcutId ? { ...shortcut, pinned: !shortcut.pinned } : shortcut
      );
      return [
        ...updated.filter((shortcut) => shortcut.pinned),
        ...updated.filter((shortcut) => !shortcut.pinned),
      ];
    });
  };
  const movePlannerWorkspaceShortcut = (shortcutId: string, direction: "up" | "down") => {
    setPlannerWorkspaceShortcuts((current) => {
      const index = current.findIndex((shortcut) => shortcut.id === shortcutId);
      if (index < 0) {
        return current;
      }
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };
  const plannerPinnedWorkspaceShortcuts = useMemo(
    () => plannerWorkspaceShortcuts.filter((shortcut) => shortcut.pinned).slice(0, 4),
    [plannerWorkspaceShortcuts]
  );
  useEffect(() => {
    if (!plannerWorkspaceStartupLoaded || plannerWorkspaceStartupApplied) {
      return;
    }
    if (plannerHasExplicitTimesheetNavigation) {
      setPlannerWorkspaceStartupApplied(true);
      return;
    }
    const startupWorkspace =
      plannerWorkspaceStartMode === "preferred"
        ? plannerPreferredWorkspace
        : plannerLastActiveWorkspace;
    const nextWorkspace =
      startupWorkspace === "review" && !isTimesheetReviewAdmin
        ? "all"
        : startupWorkspace;
    setPlannerWorkspaceStartupApplied(true);
    if (nextWorkspace !== activePlannerWorkspace) {
      handleSetPlannerWorkspace(nextWorkspace);
    }
  }, [
    activePlannerWorkspace,
    isTimesheetReviewAdmin,
    plannerHasExplicitTimesheetNavigation,
    plannerLastActiveWorkspace,
    plannerPreferredWorkspace,
    plannerWorkspaceStartMode,
    plannerWorkspaceStartupApplied,
    plannerWorkspaceStartupLoaded,
  ]);
  const plannerSectionLabels: Record<string, string> = {
    "timesheet-summary": "Month Status",
    "timesheet-day-editor": "Day Editor",
    "timesheet-personal-leave": "Personal Leave",
    "timesheet-override-history": "Override Review History",
    "timesheet-availability": "Availability Calendar",
    "timesheet-weekly-summary": "Weekly Summary",
    "timesheet-attention": "Attention Queue",
    "timesheet-register": "Monthly Register",
    "timesheet-team-overview": "Team Overview",
    "timesheet-team-leave": "Team Leave",
    "timesheet-review-queue": "Review Queue",
  };
  const activePlannerSectionLabel =
    plannerSectionLabels[resolvePlannerSectionTargetId(activePlannerSectionId || "timesheet-summary")] ||
    "Month Status";

  const handleSaveSelectedTimesheetDay = async () => {
    if (isTimesheetEditorReadOnly) {
      toast.error(
        isViewingAnotherTimesheet
          ? "You are reviewing another user's submitted timesheet, so this view is read-only."
          : isTimesheetMonthApproved
          ? "This month has already been approved. Ask an internal admin to return it for changes."
          : isTimesheetMonthSubmitted
            ? "This month has already been submitted for review. Ask an internal admin to return it for changes."
            : "This month has been finalised. Reopen it before editing timesheet days."
      );
      return;
    }

    try {
      await upsertTimesheetEntryMutation.mutateAsync({
        entryDate: selectedDate,
        startTime: timesheetDraftStartTime.trim() || null,
        endTime: timesheetDraftEndTime.trim() || null,
        lunchBreakMinutes: timesheetDraftLunchBreakMinutes,
        teaBreakMinutes: timesheetDraftTeaBreakMinutes,
        leavePortionPercent: selectedDayHasNonWorkingActivity
          ? timesheetDraftLeavePortionPercent
          : null,
        selectedOptionIds: timesheetDraftOptionIds,
        remarks: timesheetDraftRemarks.trim() || null,
      });
      toast.success("Timesheet saved");
      await Promise.all([
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save the timesheet");
    }
  };

  const handleLockTimesheetMonth = async () => {
    if (
      !confirm(
        "Finalise this month? Daily saves and bulk fills for this month will be locked until you reopen it."
      )
    ) {
      return;
    }

    try {
      await lockTimesheetMonthMutation.mutateAsync({
        monthStart,
        note: null,
      });
      toast.success("Timesheet month finalised");
      await Promise.all([
        refetchTimesheetMonthStatus(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to finalise the month");
    }
  };

  const handleReopenTimesheetMonth = async () => {
    if (!confirm("Reopen this month and allow timesheet edits again?")) {
      return;
    }

    try {
      await reopenTimesheetMonthMutation.mutateAsync({
        monthStart,
        note: null,
      });
      toast.success("Timesheet month reopened");
      await Promise.all([
        refetchTimesheetMonthStatus(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reopen the month");
    }
  };

  const handleSubmitTimesheetMonth = async () => {
    if (timesheetSubmissionBlockers.length > 0) {
      toast.error(
        `This month still has ${timesheetSubmissionBlockers.length} blocking item${timesheetSubmissionBlockers.length === 1 ? "" : "s"} to fix before submission.`
      );
      return;
    }

    if (!timesheetSubmissionDeclarationAccepted) {
      toast.error("Confirm the employee declaration before submitting this month for review.");
      return;
    }

    if (
      !confirm(
        "Submit this finalised month for internal review? You will not be able to edit it again unless it is returned for changes."
      )
    ) {
      return;
    }

    const note = window.prompt(
      "Optional note for the reviewer:",
      typedTimesheetMonthStatus?.statusNote?.trim() || ""
    );
    if (note === null) {
      return;
    }

    try {
      await submitTimesheetMonthMutation.mutateAsync({
        monthStart,
        note: note.trim() || null,
        declarationAccepted: timesheetSubmissionDeclarationAccepted,
      });
      toast.success(
        timesheetSubmissionWarnings.length > 0
          ? `Timesheet month submitted with ${timesheetSubmissionWarnings.length} review warning${timesheetSubmissionWarnings.length === 1 ? "" : "s"}.`
          : "Timesheet month submitted for review"
      );
      await Promise.all([
        refetchTimesheetMonthStatus(),
        refetchTimesheetReviewQueue(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit the month");
    }
  };

  const handleApproveTimesheetMonth = async (row: PlannerTimesheetReviewQueueDashboardRow) => {
    if (!row.employeeDeclarationAccepted) {
      toast.error("This month cannot be approved until the employee declaration has been confirmed.");
      return;
    }

    if (row.blockerCount > 0) {
      toast.error(
        `This month still has ${row.blockerCount} blocking item${row.blockerCount === 1 ? "" : "s"} and cannot be approved yet.`
      );
      return;
    }

    if (
      row.warningCount > 0 &&
      !confirm(
        `This month still has ${row.warningCount} warning${row.warningCount === 1 ? "" : "s"} recorded. Continue and approve anyway?`
      )
    ) {
      return;
    }

    const isActiveReviewTarget = Boolean(
      isViewingAnotherTimesheet &&
        activeTimesheetReviewQueueRow &&
        activeTimesheetReviewQueueRow.id === row.id
    );
    const reviewerDeclarationAccepted = isActiveReviewTarget
      ? timesheetReviewDeclarationAccepted
      : confirm(`${PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT}\n\nContinue and approve this month?`);

    if (!reviewerDeclarationAccepted) {
      toast.error("Confirm the reviewer declaration before approving this month.");
      return;
    }

    const parsedQueueMonth = parsePlannerDate(row.monthDate) ?? currentDate;
    const queueMonth = new Date(parsedQueueMonth.getFullYear(), parsedQueueMonth.getMonth(), 1);
    const note = window.prompt(
      `Approve ${row.userName}'s ${queueMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })} timesheet? Add an optional review note:`,
      ""
    );
    if (note === null) {
      return;
    }

    try {
      await approveTimesheetMonthMutation.mutateAsync({
        userId: row.userId,
        monthStart: queueMonth,
        note: note.trim() || null,
        reviewerDeclarationAccepted,
      });
      toast.success("Timesheet approved");
      await Promise.all([
        refetchTimesheetMonthStatus(),
        refetchTimesheetReviewQueue(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve the month");
    }
  };

  const handleReturnTimesheetMonthForChanges = async (
    row: PlannerTimesheetReviewQueueRow
  ) => {
    const parsedQueueMonth = parsePlannerDate(row.monthDate) ?? currentDate;
    const queueMonth = new Date(parsedQueueMonth.getFullYear(), parsedQueueMonth.getMonth(), 1);
    const note = window.prompt(
      `What should ${row.userName} change before resubmitting this month?`,
      row.statusNote?.trim() || ""
    );
    if (note === null) {
      return;
    }

    try {
      await returnTimesheetMonthMutation.mutateAsync({
        userId: row.userId,
        monthStart: queueMonth,
        note: note.trim() || null,
      });
      toast.success("Timesheet returned for changes");
      await Promise.all([
        refetchTimesheetMonthStatus(),
        refetchTimesheetReviewQueue(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return the month");
    }
  };

  const handleMarkTimesheetMonthHandedOff = async (row: PlannerTimesheetApprovedQueueRow) => {
    const parsedQueueMonth = parsePlannerDate(row.monthDate) ?? currentDate;
    const queueMonth = new Date(parsedQueueMonth.getFullYear(), parsedQueueMonth.getMonth(), 1);
    const isAlreadyHandedOff = row.workflowStatus === "handed_off";
    const note = window.prompt(
      isAlreadyHandedOff
        ? `Update the handoff note for ${row.userName}'s ${queueMonth.toLocaleDateString("en-ZA", {
            month: "long",
            year: "numeric",
          })} timesheet:`
        : `Mark ${row.userName}'s ${queueMonth.toLocaleDateString("en-ZA", {
            month: "long",
            year: "numeric",
          })} timesheet as handed off. Add an optional payroll or admin note:`,
      row.handoffNote?.trim() || ""
    );
    if (note === null) {
      return;
    }

    try {
      await markTimesheetMonthHandedOffMutation.mutateAsync({
        userId: row.userId,
        monthStart: queueMonth,
        note: note.trim() || null,
      });
      toast.success(
        isAlreadyHandedOff ? "Timesheet handoff updated" : "Timesheet marked as handed off"
      );
      await Promise.all([
        refetchTimesheetMonthStatus(),
        refetchTimesheetReviewQueue(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update handoff status");
    }
  };

  const handleReviewTimesheetLeaveOverride = async (row: PlannerTimesheetLeaveOverrideRow) => {
    const entryDate = parsePlannerDate(row.date);
    if (!entryDate) {
      toast.error("The leave override date could not be read.");
      return;
    }
    const note = window.prompt(
      row.reviewStatus === "reviewed"
        ? `Update the review note for ${row.userName}'s leave override on ${formatPlannerDate(
            row.date
          )}:`
        : `Review ${row.userName}'s leave override on ${formatPlannerDate(
            row.date
          )}. Add an optional admin follow-up note:`,
      row.reviewNote?.trim() || row.overrideNote
    );
    if (note === null) {
      return;
    }

    try {
      await reviewTimesheetLeaveOverrideMutation.mutateAsync({
        userId: row.userId,
        entryDate,
        note: note.trim() || null,
      });
      toast.success(
        row.reviewStatus === "reviewed"
          ? "Leave override review updated"
          : "Leave override marked as reviewed"
      );
      await Promise.all([
        refetchTimesheetLeaveOverrideRegister(),
        refetchTimesheetLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to review this leave override");
    }
  };

  const handleReviewTimesheetLeaveOverrideBlock = async (
    row: PlannerTimesheetLeaveOverrideBlockRow
  ) => {
    const entryDates = row.entryDates
      .map((value) => parsePlannerDate(value))
      .filter((value): value is Date => Boolean(value))
      .map((value) => startOfDay(value))
      .sort((left, right) => left.getTime() - right.getTime());

    if (entryDates.length === 0) {
      toast.error("The leave override block could not be read.");
      return;
    }

    const blockLabel = formatPlannerDateRange(row.startDate, row.endDate);
    const note = window.prompt(
      row.reviewStatus === "reviewed"
        ? `Update the review note for ${row.userName}'s leave block (${blockLabel}):`
        : row.reviewStatus === "mixed"
        ? `Review the remaining ${row.pendingReviewCount} override day${
            row.pendingReviewCount === 1 ? "" : "s"
          } in ${row.userName}'s leave block (${blockLabel}). Add or update the admin follow-up note:`
        : `Review ${row.userName}'s leave block (${blockLabel}). Add an optional admin follow-up note:`,
      row.latestReviewNote?.trim() || row.overrideNote
    );
    if (note === null) {
      return;
    }

    try {
      await reviewTimesheetLeaveOverrideBlockMutation.mutateAsync({
        userId: row.userId,
        entryDates,
        note: note.trim() || null,
      });
      toast.success(
        row.reviewStatus === "reviewed" || row.reviewStatus === "mixed"
          ? "Leave override block review updated"
          : "Leave override block reviewed"
      );
      await Promise.all([
        refetchTimesheetLeaveOverrideRegister(),
        refetchTimesheetLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to review this leave override block"
      );
    }
  };

  const focusTimesheetWeekRow = (row: PlannerTimesheetWeekRow) => {
    setSelectedDate(startOfDay(row.nextActionDate ?? row.startDate));
    toast.success(row.nextActionDetail);
  };

  const applyTimesheetTemplateToDraft = (template: PlannerTimesheetTemplate) => {
    setTimesheetDraftStartTime(template.startTime?.trim() || "");
    setTimesheetDraftEndTime(template.endTime?.trim() || "");
    setTimesheetDraftLunchBreakMinutes(template.lunchBreakMinutes ?? 0);
    setTimesheetDraftTeaBreakMinutes(template.teaBreakMinutes ?? 0);
    setTimesheetDraftLeavePortionPercent(
      normaliseTimesheetLeavePortionPercent(template.leavePortionPercent)
    );
    setTimesheetDraftOptionIds(
      Array.isArray(template.selectedOptionIds)
        ? template.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
        : []
    );
    setTimesheetDraftRemarks(template.remarks?.trim() || "");
  };

  const handleDeleteTimesheetOption = async (option: PlannerTimesheetOption) => {
    if (!confirm(`Remove "${option.label}" from your timesheet options?`)) return;
    try {
      await deleteTimesheetOptionMutation.mutateAsync({ id: option.id });
      toast.success("Timesheet option removed");
      await Promise.all([
        refetchTimesheetOptions(),
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetTemplates(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove this timesheet option");
    }
  };

  const handleDeleteTimesheetTemplate = async (template: PlannerTimesheetTemplate) => {
    if (!confirm(`Remove "${template.label}" from your saved timesheet templates?`)) return;
    try {
      await deleteTimesheetTemplateMutation.mutateAsync({ id: template.id });
      toast.success("Timesheet template removed");
      await refetchTimesheetTemplates();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove this timesheet template"
      );
    }
  };

  const handleDeleteTimesheetHoliday = async (holiday: PlannerTimesheetHoliday) => {
    if (!confirm(`Remove "${holiday.label}" from your timesheet holiday calendar?`)) return;
    try {
      await deleteTimesheetHolidayMutation.mutateAsync({ id: holiday.id });
      toast.success("Timesheet holiday removed");
      await Promise.all([
        refetchTimesheetHolidays(),
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove this timesheet holiday"
      );
    }
  };

  const handleDeleteTimesheetDepartmentCoverageRule = async (
    rule: PlannerTimesheetDepartmentCoverageSetting
  ) => {
    if (!confirm(`Remove the coverage rule for ${rule.department}?`)) return;
    try {
      await deleteTimesheetDepartmentCoverageRuleMutation.mutateAsync({ id: rule.id });
      toast.success("Department coverage rule removed");
      await Promise.all([
        refetchTimesheetDepartmentCoverageSettings(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove the department coverage rule"
      );
    }
  };

  const handleApplyTimesheetHolidaysToMonth = async (values: {
    overwriteExisting?: boolean;
  }) => {
    try {
      const result = await applyTimesheetHolidaysMutation.mutateAsync({
        monthStart,
        overwriteExisting: Boolean(values.overwriteExisting),
      });
      toast.success(
        `Applied ${result.affectedEntries} holiday day(s) into the visible month.`
      );
      setIsTimesheetHolidayApplyDialogOpen(false);
      await Promise.all([
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetHolidays(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply holiday dates to this month"
      );
    }
  };

  const handleApplyTimesheetLeaveRange = async (values: {
    fromDate?: string;
    toDate?: string;
    leaveOptionId?: string;
    leavePortionPercent?: string;
    remarks?: string;
    includeWeekends?: boolean;
    overwriteExisting?: boolean;
    skipSharedHolidays?: boolean;
    impactAcknowledged?: boolean;
    impactOverrideReason?: string;
  }) => {
    const fromDate = parseDateInputValue(String(values.fromDate || ""));
    const toDate = parseDateInputValue(String(values.toDate || ""));
    if (!fromDate || !toDate) {
      throw new Error("Choose a valid leave date range.");
    }
    if (fromDate > toDate) {
      throw new Error("The leave start date must be before the end date.");
    }

    const leaveOptionId = Number(values.leaveOptionId || 0);
    const leaveOption = activeNonWorkingTimesheetOptions.find((option) => option.id === leaveOptionId);
    if (!leaveOption) {
      throw new Error("Choose a non-working leave activity to apply.");
    }

    const includeWeekends = Boolean(values.includeWeekends);
    const overwriteExisting = Boolean(values.overwriteExisting);
    const skipSharedHolidays = Boolean(values.skipSharedHolidays);
    const leavePortionPercent: 50 | 100 =
      Number(values.leavePortionPercent || 100) === 50 ? 50 : 100;
    const baseRemarks = String(values.remarks || "").trim();
    const impactOverrideReason = String(values.impactOverrideReason || "").trim();
    const leaveBalancePreview = timesheetLeaveBalancePreview as
      | PlannerTimesheetLeaveBalancePreview
      | undefined;
    const coveragePreview = timesheetDepartmentCoveragePreview as
      | PlannerTimesheetDepartmentCoveragePreview
      | undefined;
    const hasLeaveBalanceOverAllocation = Boolean(
      leaveBalancePreview?.yearSummaries.some((summary) => summary.exceedsAllowanceByDays > 0)
    );
    const hasHighCoverageRisk = Boolean(
      coveragePreview?.previewRows.some((row) => row.willApply && row.severity === "high")
    );
    const requiresImpactAcknowledgement = hasLeaveBalanceOverAllocation || hasHighCoverageRisk;
    if (requiresImpactAcknowledgement && !Boolean(values.impactAcknowledged)) {
      throw new Error(
        "This leave needs an acknowledgement before it can be applied because it exceeds allowance or creates a high-risk coverage day."
      );
    }
    if (requiresImpactAcknowledgement && !impactOverrideReason) {
      throw new Error(
        "Add an impact override note before applying leave that exceeds allowance or creates a high-risk coverage day."
      );
    }
    const remarks = [baseRemarks, impactOverrideReason ? `Planner impact note: ${impactOverrideReason}` : null]
      .filter(Boolean)
      .join("\n\n")
      .trim() || null;

    let appliedDays = 0;
    let skippedWeekends = 0;
    let skippedExisting = 0;
    let skippedSharedHolidays = 0;

    try {
      for (
        let day = startOfDay(fromDate);
        day <= toDate;
        day = startOfDay(addDays(day, 1))
      ) {
        if (!includeWeekends && [0, 6].includes(day.getDay())) {
          skippedWeekends += 1;
          continue;
        }

        const dayKey = getDateKey(day);
        if (skipSharedHolidays && holidayByDateKey.has(dayKey)) {
          skippedSharedHolidays += 1;
          continue;
        }

        if (!overwriteExisting && timesheetEntriesByDate.has(dayKey)) {
          skippedExisting += 1;
          continue;
        }

        await upsertTimesheetEntryMutation.mutateAsync({
          entryDate: day,
          startTime: null,
          endTime: null,
          lunchBreakMinutes: 0,
          teaBreakMinutes: 0,
          leavePortionPercent,
          selectedOptionIds: [leaveOption.id],
          remarks,
        });
        appliedDays += 1;
      }

      if (appliedDays === 0) {
        throw new Error(
          "No leave days were applied. Try allowing weekends, replacing existing entries, or including shared holidays."
        );
      }

      const detailParts = [
        skippedWeekends > 0 ? `${skippedWeekends} weekend day(s) skipped` : null,
        skippedSharedHolidays > 0 ? `${skippedSharedHolidays} shared holiday day(s) kept` : null,
        skippedExisting > 0 ? `${skippedExisting} existing day(s) kept` : null,
      ].filter(Boolean);

      toast.success(
        detailParts.length > 0
          ? `Applied ${appliedDays} leave day(s). ${detailParts.join(", ")}.`
          : `Applied ${appliedDays} leave day(s).`
      );
      setIsTimesheetLeaveRangeDialogOpen(false);
      await Promise.all([
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply the leave range");
    }
  };

  const handleDeleteTimesheetLeaveBlock = async (block: PlannerTimesheetLeaveBlockRow) => {
    if (
      !confirm(
        `Remove this leave block from ${formatPlannerDate(block.startDate)} to ${formatPlannerDate(block.endDate)}?`
      )
    ) {
      return;
    }

    let clearedDays = 0;
    try {
      for (
        let day = startOfDay(block.startDate);
        day <= block.endDate;
        day = startOfDay(addDays(day, 1))
      ) {
        await upsertTimesheetEntryMutation.mutateAsync({
          entryDate: day,
          startTime: null,
          endTime: null,
          lunchBreakMinutes: null,
          teaBreakMinutes: null,
          selectedOptionIds: [],
          remarks: null,
        });
        clearedDays += 1;
      }

      toast.success(
        clearedDays === 1
          ? "Leave day removed."
          : `Removed ${clearedDays} leave day(s) from this block.`
      );
      if (
        editingTimesheetLeaveBlock &&
        editingTimesheetLeaveBlock.startDateKey === block.startDateKey &&
        editingTimesheetLeaveBlock.endDateKey === block.endDateKey
      ) {
        setEditingTimesheetLeaveBlock(null);
      }
      await Promise.all([
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove this leave block");
    }
  };

  const handleFillTimesheetMonthFromTemplates = async (values: {
    includeWeekends?: boolean;
    overwriteExisting?: boolean;
  }) => {
    try {
      const result = await fillTimesheetMonthFromTemplatesMutation.mutateAsync({
        monthStart,
        includeWeekends: Boolean(values.includeWeekends),
        overwriteExisting: Boolean(values.overwriteExisting),
      });
      toast.success(
        `Filled ${result.affectedEntries} day(s) from your saved weekday templates.`
      );
      setIsTimesheetTemplateFillDialogOpen(false);
      await Promise.all([
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fill the month from templates"
      );
    }
  };

  const handleCopyPreviousTimesheetMonth = async (values: {
    includeWeekends?: boolean;
    overwriteExisting?: boolean;
    copyRemarks?: boolean;
  }) => {
    const includeWeekends = Boolean(values.includeWeekends);
    const overwriteExisting = Boolean(values.overwriteExisting);
    const copyRemarks = Boolean(values.copyRemarks);

    if (typedPreviousTimesheetEntries.length === 0) {
      throw new Error(`No saved timesheet days were found in ${previousTimesheetMonthLabel}.`);
    }

    let copiedDays = 0;
    let skippedExisting = 0;
    let skippedWeekends = 0;
    let skippedOverflow = 0;

    try {
      for (const entry of typedPreviousTimesheetEntries) {
        const previousEntryDate = parsePlannerDate(entry.entryDate);
        if (!previousEntryDate) {
          continue;
        }

        const targetDayNumber = previousEntryDate.getDate();
        if (targetDayNumber > daysInMonth) {
          skippedOverflow += 1;
          continue;
        }

        const targetDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          targetDayNumber
        );

        if (!includeWeekends && [0, 6].includes(targetDate.getDay())) {
          skippedWeekends += 1;
          continue;
        }

        const targetDateKey = getDateKey(targetDate);
        if (!overwriteExisting && timesheetEntriesByDate.has(targetDateKey)) {
          skippedExisting += 1;
          continue;
        }

        await upsertTimesheetEntryMutation.mutateAsync({
          entryDate: targetDate,
          startTime: entry.startTime?.trim() || null,
          endTime: entry.endTime?.trim() || null,
          lunchBreakMinutes: entry.lunchBreakMinutes ?? null,
          teaBreakMinutes: entry.teaBreakMinutes ?? null,
          leavePortionPercent:
            entry.leavePortionPercent === null
              ? null
              : normaliseTimesheetLeavePortionPercent(entry.leavePortionPercent),
          selectedOptionIds: Array.isArray(entry.selectedOptionIds)
            ? entry.selectedOptionIds.map((value) => Number(value)).filter(Number.isFinite)
            : [],
          remarks: copyRemarks ? entry.remarks?.trim() || null : null,
        });
        copiedDays += 1;
      }

      if (copiedDays === 0) {
        throw new Error(
          `No days were copied from ${previousTimesheetMonthLabel}. Try allowing weekends or replacing existing entries.`
        );
      }

      const detailParts = [
        skippedExisting > 0 ? `${skippedExisting} existing day(s) kept` : null,
        skippedWeekends > 0 ? `${skippedWeekends} weekend day(s) skipped` : null,
        skippedOverflow > 0 ? `${skippedOverflow} overflow day(s) skipped` : null,
      ].filter(Boolean);

      toast.success(
        detailParts.length > 0
          ? `Copied ${copiedDays} day(s) from ${previousTimesheetMonthLabel}. ${detailParts.join(", ")}.`
          : `Copied ${copiedDays} day(s) from ${previousTimesheetMonthLabel}.`
      );
      setIsTimesheetPreviousMonthCopyDialogOpen(false);
      await Promise.all([
        refetchTimesheetEntries(),
        refetchYearTimesheetEntries(),
        refetchTimesheetOverview(),
        refetchTimesheetTeamLeaveOverview(),
        refetchTimesheetUserLeaveOverrides(),
        refetchTimesheetUserLeaveOverrideBlocks(),
        refetchTimesheetTeamLeaveCalendar(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to copy the previous month's timesheet"
      );
    }
  };

  const handleExportTimesheetMonth = async () => {
    const { exportTimesheetMonth } = await import("@/lib/plannerTimesheetPackExports");
    await exportTimesheetMonth({
      currentDate,
      user,
      helpers: {
        formatMinutesAsDuration,
        formatLeaveDays,
        formatPlannerDate,
        formatPlannerDateTime,
        formatVarianceMinutes,
      },
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
      getTimesheetAvailabilityLabel: (row, hasAttention) =>
        getTimesheetAvailabilityLabel(row as PlannerTimesheetRow, hasAttention),
      holidayByDateKey,
      timesheetMonthStatusLabel,
      currentMonthTimesheetHolidays,
      timesheetSubmissionBlockers,
      timesheetSubmissionWarnings,
      timesheetCompletionSummary,
      typedTimesheetMonthStatus,
      typedTimesheetHistory,
      timesheetOwnerName,
      plannerTimesheetDeclarationText: PLANNER_TIMESHEET_DECLARATION_TEXT,
      plannerTimesheetReviewerDeclarationText: PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT,
      timesheetMonthComparison,
      timesheetDayComparisonSummary,
      previousTimesheetSummary,
      previousTimesheetEntriesByDayNumber,
      getNetWorkedMinutes,
    });
    toast.success("Timesheet month exported");
  };

  const handleExportTeamTimesheetMonth = async () => {
    if (!isTimesheetReviewAdmin) {
      toast.error("Only internal admins can export the full team timesheet month.");
      return;
    }

    const { exportTeamTimesheetMonth } = await import("@/lib/plannerTimesheetPackExports");
    await exportTeamTimesheetMonth({
      currentDate,
      user,
      helpers: {
        formatMinutesAsDuration,
        formatLeaveDays,
        formatPlannerDate,
        formatPlannerDateTime,
        formatVarianceMinutes,
      },
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
    });
    toast.success("Team timesheet month exported");
  };

  const handleExportTeamLeaveOverview = async () => {
    if (!isTimesheetReviewAdmin) {
      toast.error("Only internal admins can export the team leave overview.");
      return;
    }

    if (timesheetTeamLeaveRows.length === 0) {
      toast.error("No team leave data is available for this month yet.");
      return;
    }

    const { exportTeamLeaveOverview } = await import("@/lib/plannerTimesheetPackExports");
    await exportTeamLeaveOverview({
      currentDate,
      user,
      helpers: {
        formatMinutesAsDuration,
        formatLeaveDays,
        formatPlannerDate,
        formatPlannerDateTime,
        formatVarianceMinutes,
      },
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
    });
    toast.success("Team leave overview exported");
  };

  const handleExportApprovedTimesheetPack = async () => {
    if (!isTimesheetReviewAdmin) {
      toast.error("Only internal admins can export approved timesheet months.");
      return;
    }

    if (timesheetApprovedRows.length === 0) {
      toast.error("No approved timesheet months are available for this month yet.");
      return;
    }

    const { exportApprovedTimesheetPack } = await import("@/lib/plannerTimesheetPackExports");
    await exportApprovedTimesheetPack({
      currentDate,
      pendingHandoffRows: timesheetPendingHandoffRows,
      approvedRows: timesheetApprovedRows,
      helpers: {
        formatMinutesAsDuration,
        formatLeaveDays,
        formatPlannerDate,
        formatPlannerDateTime,
        formatVarianceMinutes,
      },
      user,
    });
    toast.success("Approved timesheet pack exported");
  };

  const handleExportHandedOffTimesheetPack = async () => {
    if (!isTimesheetReviewAdmin) {
      toast.error("Only internal admins can export handed-off timesheet months.");
      return;
    }

    if (timesheetHandedOffRows.length === 0) {
      toast.error("No handed-off timesheet months are available for this month yet.");
      return;
    }

    const { exportHandedOffTimesheetPack } = await import("@/lib/plannerTimesheetPackExports");
    await exportHandedOffTimesheetPack({
      currentDate,
      handedOffRows: timesheetHandedOffRows,
      helpers: {
        formatMinutesAsDuration,
        formatLeaveDays,
        formatPlannerDate,
        formatPlannerDateTime,
        formatVarianceMinutes,
      },
      user,
    });
    toast.success("Handed-off timesheet pack exported");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Suspense fallback={null}>
          <PlannerPageHeaderPanel
            calendarImportInputRef={calendarImportInputRef}
            handleCalendarExport={handleCalendarExport}
            handleCalendarImport={handleCalendarImport}
            isImportingCalendar={isImportingCalendar}
            openCreateFormForDate={openCreateFormForDate}
            selectedDate={selectedDate}
            setCurrentDate={setCurrentDate}
            setSelectedDate={setSelectedDate}
            summary={summary}
            today={today}
            typedEntries={typedEntries}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PlannerTimesheetShellPanel
            PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT={
              PLANNER_TIMESHEET_REVIEWER_DECLARATION_TEXT
            }
            activeTimesheetOptions={activeTimesheetOptions}
            activeTimesheetReviewQueueRow={activeTimesheetReviewQueueRow}
            activeTimesheetTemplates={activeTimesheetTemplates}
            approveTimesheetMonthMutation={approveTimesheetMonthMutation}
            canSubmitTimesheetMonth={canSubmitTimesheetMonth}
            formatPlannerDateTime={formatPlannerDateTime}
            handleApproveTimesheetMonth={handleApproveTimesheetMonth}
            handleExportTimesheetMonth={handleExportTimesheetMonth}
            handleLockTimesheetMonth={handleLockTimesheetMonth}
            handleReopenTimesheetMonth={handleReopenTimesheetMonth}
            handleReturnTimesheetMonthForChanges={handleReturnTimesheetMonthForChanges}
            handleSubmitTimesheetMonth={handleSubmitTimesheetMonth}
            isTimesheetMonthApproved={isTimesheetMonthApproved}
            isTimesheetMonthHandedOff={isTimesheetMonthHandedOff}
            isTimesheetMonthLocked={isTimesheetMonthLocked}
            isTimesheetMonthSubmitted={isTimesheetMonthSubmitted}
            isTimesheetReviewAdmin={isTimesheetReviewAdmin}
            isViewingAnotherTimesheet={isViewingAnotherTimesheet}
            lockTimesheetMonthMutation={lockTimesheetMonthMutation}
            previousTimesheetEntriesLoading={previousTimesheetEntriesLoading}
            reopenTimesheetMonthMutation={reopenTimesheetMonthMutation}
            returnTimesheetMonthMutation={returnTimesheetMonthMutation}
            setEditingTimesheetHoliday={setEditingTimesheetHoliday}
            setEditingTimesheetOption={setEditingTimesheetOption}
            setEditingTimesheetTemplate={setEditingTimesheetTemplate}
            setIsTimesheetHolidayApplyDialogOpen={setIsTimesheetHolidayApplyDialogOpen}
            setIsTimesheetHolidayDialogOpen={setIsTimesheetHolidayDialogOpen}
            setIsTimesheetOptionDialogOpen={setIsTimesheetOptionDialogOpen}
            setIsTimesheetPreviousMonthCopyDialogOpen={setIsTimesheetPreviousMonthCopyDialogOpen}
            setIsTimesheetProfileDialogOpen={setIsTimesheetProfileDialogOpen}
            setIsTimesheetTemplateApplyDialogOpen={setIsTimesheetTemplateApplyDialogOpen}
            setIsTimesheetTemplateDialogOpen={setIsTimesheetTemplateDialogOpen}
            setIsTimesheetTemplateFillDialogOpen={setIsTimesheetTemplateFillDialogOpen}
            setTimesheetReviewDeclarationAccepted={setTimesheetReviewDeclarationAccepted}
            setTimesheetReviewTarget={setTimesheetReviewTarget}
            submitTimesheetMonthMutation={submitTimesheetMonthMutation}
            timesheetOwnerName={timesheetOwnerName}
            timesheetReviewDeclarationAccepted={timesheetReviewDeclarationAccepted}
            timesheetReviewTarget={timesheetReviewTarget}
            timesheetSubmitDisabledReason={timesheetSubmitDisabledReason}
            typedTimesheetHolidays={typedTimesheetHolidays}
            typedTimesheetMonthStatus={typedTimesheetMonthStatus}
            workspaceHubPanel={
              <>
                <Suspense fallback={null}>
                <PlannerWorkspaceHubPanel
                PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY={PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY}
                PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY={PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY}
                PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY={PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY}
                PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY={PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY}
                PLANNER_WORKSPACE_RECENTS_STORAGE_KEY={PLANNER_WORKSPACE_RECENTS_STORAGE_KEY}
                PLANNER_WORKSPACE_RESUME_STORAGE_KEY={PLANNER_WORKSPACE_RESUME_STORAGE_KEY}
                PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY={PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY}
                PLANNER_WORKSPACE_START_MODE_STORAGE_KEY={PLANNER_WORKSPACE_START_MODE_STORAGE_KEY}
                activePlannerSectionId={activePlannerSectionId}
                activePlannerSectionLabel={activePlannerSectionLabel}
                activePlannerWorkspace={activePlannerWorkspace}
                activePlannerWorkspaceResumeTarget={activePlannerWorkspaceResumeTarget}
                formatPlannerDateTime={formatPlannerDateTime}
                formatLeaveDays={formatLeaveDays}
                firstMissingTimesheetRow={firstMissingTimesheetRow}
                getDateKey={getDateKey}
                handleCopyPlannerSectionLink={handleCopyPlannerSectionLink}
                handleSetPlannerWorkspace={handleSetPlannerWorkspace}
                isTimesheetMonthApproved={isTimesheetMonthApproved}
                isTimesheetMonthHandedOff={isTimesheetMonthHandedOff}
                isTimesheetMonthSubmitted={isTimesheetMonthSubmitted}
                isTimesheetReviewAdmin={isTimesheetReviewAdmin}
                movePlannerWorkspaceShortcut={movePlannerWorkspaceShortcut}
                openPlannerDateSectionInWorkspace={openPlannerDateSectionInWorkspace}
                openPlannerSectionInWorkspace={openPlannerSectionInWorkspace}
                openTimesheetReviewTarget={openTimesheetReviewTarget}
                openPlannerWorkspaceShortcut={openPlannerWorkspaceShortcut}
                plannerLastActiveWorkspace={plannerLastActiveWorkspace}
                plannerActiveNonWorkingOptionCount={activeNonWorkingTimesheetOptions.length}
                plannerActiveTemplateCount={activeTimesheetTemplates.length}
                plannerActiveWorkingOptionCount={activeTimesheetOptions.length}
                plannerApprovedMonthCount={timesheetApprovedRows.length}
                plannerDefaultWeekdayTemplateLabel={monThuDefaultTemplateLabel}
                plannerDepartmentCoverageRuleCount={typedTimesheetDepartmentCoverageSettings.length}
                plannerHolidayCount={typedTimesheetHolidays.length}
                plannerPinnedWorkspaceShortcuts={plannerPinnedWorkspaceShortcuts}
                plannerMonthLockedAt={Boolean(typedTimesheetMonthStatus?.lockedAt)}
                plannerMonthReviewedAt={Boolean(typedTimesheetMonthStatus?.reviewedAt)}
                plannerMonthSubmittedAt={Boolean(typedTimesheetMonthStatus?.submittedAt)}
                plannerProfileDepartment={typedTimesheetProfile?.department?.trim() ?? ""}
                plannerProfileHasDefaultWeekdayTemplate={Boolean(typedTimesheetProfile?.monThuTemplateId)}
                plannerProfilePersonalLeaveAllowanceDays={
                  typedTimesheetProfile?.personalLeaveAllowanceDays ?? null
                }
                plannerProfileSignatureName={typedTimesheetProfile?.signatureName?.trim() ?? ""}
                plannerPreferredWorkspace={plannerPreferredWorkspace}
                plannerVisibleMonthEntryCount={typedTimesheetEntries.length}
                plannerWorkspaceRecentViews={plannerWorkspaceRecentViews}
                plannerWorkspaceShortcuts={plannerWorkspaceShortcuts}
                plannerWorkspaceStartMode={plannerWorkspaceStartMode}
                renamePlannerWorkspaceShortcut={renamePlannerWorkspaceShortcut}
                resolvePlannerSectionTargetId={resolvePlannerSectionTargetId}
                scrollPlannerSectionIntoView={scrollPlannerSectionIntoView}
                selectedDate={selectedDate}
                setActivePlannerSectionId={setActivePlannerSectionId}
                setCurrentDate={setCurrentDate}
                setPlannerLastActiveWorkspace={setPlannerLastActiveWorkspace}
                setPlannerPreferredWorkspace={setPlannerPreferredWorkspace}
                setPlannerSectionQueryParam={setPlannerSectionQueryParam}
                setPlannerWorkspaceRecentViews={setPlannerWorkspaceRecentViews}
                setPlannerWorkspaceResumeState={setPlannerWorkspaceResumeState}
                setPlannerWorkspaceShortcuts={setPlannerWorkspaceShortcuts}
                setPlannerWorkspaceStartMode={setPlannerWorkspaceStartMode}
                setPlannerWorkspaceStartupApplied={setPlannerWorkspaceStartupApplied}
                setSelectedDate={setSelectedDate}
                toast={toast}
                timesheetAttentionRowsCount={timesheetAttentionRows.length}
                timesheetAvailabilitySummaryAll={timesheetAvailabilitySummary.all}
                timesheetCompletionSummary={timesheetCompletionSummary}
                timesheetMonthRowsCount={timesheetMonthRows.length}
                timesheetMonthStatusLabel={timesheetMonthStatusLabel}
                timesheetOverviewRowsCount={timesheetOverviewRows.length}
                timesheetPendingLeaveOverrideBlockQueueRowsCount={
                  timesheetPendingLeaveOverrideBlockQueueRows.length
                }
                timesheetPendingLeaveOverrideQueueRowsCount={
                  timesheetPendingLeaveOverrideQueueRows.length
                }
                timesheetPersonalLeaveAvailableDays={timesheetPersonalLeaveAvailableDays}
                timesheetPersonalLeaveBlocks={timesheetPersonalLeaveBlocks}
                timesheetPersonalLeaveOverrideSummary={timesheetPersonalLeaveOverrideSummary}
                timesheetPersonalLeaveRemainingDays={timesheetPersonalLeaveRemainingDays}
                timesheetPersonalLeaveRowsCount={timesheetPersonalLeaveRows.length}
                timesheetPersonalLeaveUsedDays={timesheetPersonalLeaveUsedDays}
                timesheetPersonalLeaveYearUsedDays={timesheetPersonalLeaveYearUsedDays}
                timesheetReviewQueueRows={timesheetReviewQueueRows}
                timesheetSummaryPersonalLeaveDays={timesheetSummary.personalLeaveDays}
                timesheetTeamAttentionRowsCount={timesheetTeamAttentionRows.length}
                timesheetTeamLeaveRowsCount={timesheetTeamLeaveRows.length}
                timesheetTeamSummary={timesheetTeamSummary}
                timesheetWeekRowsCount={timesheetWeekRows.length}
                typedTimesheetMonthStatusEmployeeDeclarationAccepted={
                  typedTimesheetMonthStatus?.employeeDeclarationAccepted === true
                }
                typedTimesheetUserLeaveOverrideBlockRowsCount={
                  typedTimesheetUserLeaveOverrideBlockRows.length
                }
                togglePlannerWorkspaceShortcutPinned={togglePlannerWorkspaceShortcutPinned}
                visiblePlannerSectionIds={visiblePlannerSectionIds}
                />
              </Suspense>
              <Suspense fallback={null}>
                <PlannerTimesheetInsightsPanel
                DEFAULT_TIMESHEET_PROFILE_HOURS={DEFAULT_TIMESHEET_PROFILE_HOURS}
                PLANNER_TIMESHEET_DECLARATION_TEXT={PLANNER_TIMESHEET_DECLARATION_TEXT}
                currentMonthTimesheetHolidays={currentMonthTimesheetHolidays}
                formatLeaveDays={formatLeaveDays}
                formatMinutesAsDuration={formatMinutesAsDuration}
                formatPlannerDateTime={formatPlannerDateTime}
                formatVarianceMinutes={formatVarianceMinutes}
                fridayDefaultTemplateLabel={fridayDefaultTemplateLabel}
                getMonthLabel={getMonthLabel}
                getTimesheetWorkflowStatusLabel={getTimesheetWorkflowStatusLabel}
                isTimesheetMonthApproved={isTimesheetMonthApproved}
                isTimesheetMonthHandedOff={isTimesheetMonthHandedOff}
                isTimesheetMonthLocked={isTimesheetMonthLocked}
                isTimesheetMonthReadOnly={isTimesheetMonthReadOnly}
                isTimesheetMonthSubmitted={isTimesheetMonthSubmitted}
                isViewingAnotherTimesheet={isViewingAnotherTimesheet}
                leaveYearRange={leaveYearRange}
                monThuDefaultTemplateLabel={monThuDefaultTemplateLabel}
                previousTimesheetSummary={previousTimesheetSummary}
                selectedDate={selectedDate}
                setTimesheetSubmissionDeclarationAccepted={setTimesheetSubmissionDeclarationAccepted}
                shouldShowPlannerSection={shouldShowPlannerSection}
                timesheetAttentionRows={timesheetAttentionRows}
                timesheetCompletionSummary={timesheetCompletionSummary}
                timesheetDayComparisonSummary={timesheetDayComparisonSummary}
                timesheetMonthComparison={timesheetMonthComparison}
                timesheetMonthStatusLabel={timesheetMonthStatusLabel}
                timesheetPersonalLeaveAvailableDays={timesheetPersonalLeaveAvailableDays}
                timesheetPersonalLeaveRemainingDays={timesheetPersonalLeaveRemainingDays}
                timesheetPersonalLeaveYearUsedDays={timesheetPersonalLeaveYearUsedDays}
                timesheetSubmissionBlockers={timesheetSubmissionBlockers}
                timesheetSubmissionDeclarationAccepted={timesheetSubmissionDeclarationAccepted}
                timesheetSubmissionWarnings={timesheetSubmissionWarnings}
                timesheetSummary={timesheetSummary}
                typedTimesheetHistory={typedTimesheetHistory}
                typedTimesheetMonthStatus={typedTimesheetMonthStatus}
                typedTimesheetProfile={typedTimesheetProfile}
                user={user}
                  weekendDefaultTemplateLabel={weekendDefaultTemplateLabel}
                />
              </Suspense>
              </>
            }
            monthWorkspacePanel={
              <Suspense fallback={null}>
                <PlannerTimesheetMonthWorkspacePanel
                activeNonWorkingTimesheetOptions={activeNonWorkingTimesheetOptions}
                activeTimesheetOptions={activeTimesheetOptions}
                activeTimesheetTemplates={activeTimesheetTemplates}
                applyTimesheetTemplateToDraft={applyTimesheetTemplateToDraft}
                firstMissingTimesheetRow={firstMissingTimesheetRow}
                firstReviewTimesheetRow={firstReviewTimesheetRow}
                focusTimesheetWeekRow={focusTimesheetWeekRow}
                formatLeaveDays={formatLeaveDays}
                formatMinutesAsDuration={formatMinutesAsDuration}
                formatPlannerDate={formatPlannerDate}
                formatPlannerDateTime={formatPlannerDateTime}
                formatVarianceMinutes={formatVarianceMinutes}
                getMonthLabel={getMonthLabel}
                getTimesheetAvailabilityClasses={getTimesheetAvailabilityClasses}
                getTimesheetAvailabilityLabel={getTimesheetAvailabilityLabel}
                getTimesheetAttentionBadgeVariant={getTimesheetAttentionBadgeVariant}
                getTimesheetHolidayTypeLabel={getTimesheetHolidayTypeLabel}
                getTimesheetHoursCategoryLabel={getTimesheetHoursCategoryLabel}
                getTimesheetProfileHours={getTimesheetProfileHours}
                handleDeleteTimesheetHoliday={handleDeleteTimesheetHoliday}
                handleDeleteTimesheetLeaveBlock={handleDeleteTimesheetLeaveBlock}
                handleDeleteTimesheetOption={handleDeleteTimesheetOption}
                handleDeleteTimesheetTemplate={handleDeleteTimesheetTemplate}
                handleSaveSelectedTimesheetDay={handleSaveSelectedTimesheetDay}
                holidayByDateKey={holidayByDateKey}
                isTimesheetEditorReadOnly={isTimesheetEditorReadOnly}
                isTimesheetMonthApproved={isTimesheetMonthApproved}
                isTimesheetMonthHandedOff={isTimesheetMonthHandedOff}
                isTimesheetMonthSubmitted={isTimesheetMonthSubmitted}
                isViewingAnotherTimesheet={isViewingAnotherTimesheet}
                leaveYearRange={leaveYearRange}
                matchesTimesheetAvailabilityFilter={matchesTimesheetAvailabilityFilter}
                normaliseTimesheetLeavePortionPercent={normaliseTimesheetLeavePortionPercent}
                selectedDate={selectedDate}
                selectedDateLabel={selectedDateLabel}
                selectedDayComparisonStatus={selectedDayComparisonStatus}
                selectedDayExpectedMinutes={selectedDayExpectedMinutes}
                selectedDayHasNonWorkingActivity={selectedDayHasNonWorkingActivity}
                selectedDayHoliday={selectedDayHoliday}
                selectedDayIsNonWorking={selectedDayIsNonWorking}
                selectedDayIsPartialLeave={selectedDayIsPartialLeave}
                selectedDayLeavePortionDays={selectedDayLeavePortionDays}
                selectedDayVarianceMinutes={selectedDayVarianceMinutes}
                selectedDayWorkedMinutes={selectedDayWorkedMinutes}
                selectedPreviousTimesheetEntry={selectedPreviousTimesheetEntry}
                selectedPreviousTimesheetOptions={selectedPreviousTimesheetOptions}
                selectedTimesheetEntry={selectedTimesheetEntry}
                selectedTimesheetOptions={selectedTimesheetOptions}
                setEditingTimesheetHoliday={setEditingTimesheetHoliday}
                setEditingTimesheetLeaveBlock={setEditingTimesheetLeaveBlock}
                setEditingTimesheetOption={setEditingTimesheetOption}
                setEditingTimesheetTemplate={setEditingTimesheetTemplate}
                setIsTimesheetBulkDialogOpen={setIsTimesheetBulkDialogOpen}
                setIsTimesheetHolidayApplyDialogOpen={setIsTimesheetHolidayApplyDialogOpen}
                setIsTimesheetHolidayDialogOpen={setIsTimesheetHolidayDialogOpen}
                setIsTimesheetLeaveRangeDialogOpen={setIsTimesheetLeaveRangeDialogOpen}
                setIsTimesheetOptionDialogOpen={setIsTimesheetOptionDialogOpen}
                setIsTimesheetTemplateApplyDialogOpen={setIsTimesheetTemplateApplyDialogOpen}
                setIsTimesheetTemplateDialogOpen={setIsTimesheetTemplateDialogOpen}
                setSelectedDate={setSelectedDate}
                setTimesheetAvailabilityFilter={setTimesheetAvailabilityFilter}
                setTimesheetDraftEndTime={setTimesheetDraftEndTime}
                setTimesheetDraftLeavePortionPercent={setTimesheetDraftLeavePortionPercent}
                setTimesheetDraftLunchBreakMinutes={setTimesheetDraftLunchBreakMinutes}
                setTimesheetDraftOptionIds={setTimesheetDraftOptionIds}
                setTimesheetDraftRemarks={setTimesheetDraftRemarks}
                setTimesheetDraftStartTime={setTimesheetDraftStartTime}
                setTimesheetDraftTeaBreakMinutes={setTimesheetDraftTeaBreakMinutes}
                shouldShowPlannerSection={shouldShowPlannerSection}
                startOfDay={startOfDay}
                timesheetAttentionByDateKey={timesheetAttentionByDateKey}
                timesheetAttentionRows={timesheetAttentionRows}
                timesheetAvailabilityCalendarWeeks={timesheetAvailabilityCalendarWeeks}
                timesheetAvailabilityFilter={timesheetAvailabilityFilter}
                timesheetAvailabilitySummary={timesheetAvailabilitySummary}
                timesheetDraftEndTime={timesheetDraftEndTime}
                timesheetDraftLeavePortionPercent={timesheetDraftLeavePortionPercent}
                timesheetDraftLunchBreakMinutes={timesheetDraftLunchBreakMinutes}
                timesheetDraftOptionIds={timesheetDraftOptionIds}
                timesheetDraftRemarks={timesheetDraftRemarks}
                timesheetDraftStartTime={timesheetDraftStartTime}
                timesheetDraftTeaBreakMinutes={timesheetDraftTeaBreakMinutes}
                timesheetMonthComparison={timesheetMonthComparison}
                timesheetPersonalLeaveAvailableDays={timesheetPersonalLeaveAvailableDays}
                timesheetPersonalLeaveBlocks={timesheetPersonalLeaveBlocks}
                timesheetPersonalLeaveBreakdownRows={timesheetPersonalLeaveBreakdownRows}
                timesheetPersonalLeaveCarryOverDays={timesheetPersonalLeaveCarryOverDays}
                timesheetPersonalLeaveOverrideSummary={timesheetPersonalLeaveOverrideSummary}
                timesheetPersonalLeaveRemainingDays={timesheetPersonalLeaveRemainingDays}
                timesheetPersonalLeaveRows={timesheetPersonalLeaveRows}
                timesheetPersonalLeaveUsedDays={timesheetPersonalLeaveUsedDays}
                timesheetPersonalLeaveYearUsedDays={timesheetPersonalLeaveYearUsedDays}
                timesheetWeekRows={timesheetWeekRows}
                toast={toast}
                typedTimesheetHolidays={typedTimesheetHolidays}
                typedTimesheetOptions={typedTimesheetOptions}
                typedTimesheetProfile={typedTimesheetProfile}
                typedTimesheetTemplates={typedTimesheetTemplates}
                typedTimesheetUserLeaveOverrideBlockRows={typedTimesheetUserLeaveOverrideBlockRows}
                upsertTimesheetEntryMutation={upsertTimesheetEntryMutation}
                user={user}
                />
              </Suspense>
            }
            adminReviewPanel={
              isTimesheetReviewAdmin &&
              (shouldShowPlannerSection("timesheet-team-overview") ||
                shouldShowPlannerSection("timesheet-team-leave") ||
                shouldShowPlannerSection("timesheet-review-queue") ||
                shouldShowPlannerSection("timesheet-admin-review-notice")) ? (
                <div className="space-y-6">
                  <Suspense fallback={null}>
                    <PlannerTimesheetAdminSummaryPanel
                    formatLeaveDays={formatLeaveDays}
                    timesheetDepartmentCoverageRows={timesheetDepartmentCoverageRows}
                    timesheetDepartmentLeaveRows={timesheetDepartmentLeaveRows}
                    timesheetLeaveOverrideBlockRows={timesheetLeaveOverrideBlockRows}
                    timesheetLeaveOverrideRegisterRows={timesheetLeaveOverrideRegisterRows}
                    timesheetPendingLeaveOverrideBlockQueueRows={
                      timesheetPendingLeaveOverrideBlockQueueRows
                    }
                    timesheetPendingLeaveOverrideQueueRows={timesheetPendingLeaveOverrideQueueRows}
                    timesheetTeamLeaveCalendarRows={timesheetTeamLeaveCalendarRows}
                    timesheetTeamLeaveCoverageRows={timesheetTeamLeaveCoverageRows}
                    timesheetTeamLeaveRows={timesheetTeamLeaveRows}
                    timesheetTeamSummary={timesheetTeamSummary}
                    typedTimesheetDepartmentCoverageSettings={
                      typedTimesheetDepartmentCoverageSettings
                    }
                    />
                  </Suspense>

                  <Suspense fallback={null}>
                    <PlannerTimesheetMonthReviewPanel
                    adminQueuesPanel={
                      <Suspense fallback={null}>
                        <PlannerTimesheetAdminQueuesPanel
                          approveTimesheetMonthMutation={approveTimesheetMonthMutation}
                          formatMinutesAsDuration={formatMinutesAsDuration}
                          formatPlannerDateTime={formatPlannerDateTime}
                          handleApproveTimesheetMonth={handleApproveTimesheetMonth}
                          handleExportApprovedTimesheetPack={handleExportApprovedTimesheetPack}
                          handleExportHandedOffTimesheetPack={handleExportHandedOffTimesheetPack}
                          handleMarkTimesheetMonthHandedOff={handleMarkTimesheetMonthHandedOff}
                          handleReturnTimesheetMonthForChanges={
                            handleReturnTimesheetMonthForChanges
                          }
                          isTimesheetReviewAdmin={isTimesheetReviewAdmin}
                          markTimesheetMonthHandedOffMutation={
                            markTimesheetMonthHandedOffMutation
                          }
                          openTimesheetReviewTarget={openTimesheetReviewTarget}
                          returnTimesheetMonthMutation={returnTimesheetMonthMutation}
                          shouldShowPlannerSection={shouldShowPlannerSection}
                          timesheetApprovedRows={timesheetApprovedRows}
                          timesheetHandedOffRows={timesheetHandedOffRows}
                          timesheetReviewQueueRows={timesheetReviewQueueRows}
                        />
                      </Suspense>
                    }
                    formatMinutesAsDuration={formatMinutesAsDuration}
                    formatPlannerDateTime={formatPlannerDateTime}
                    formatVarianceMinutes={formatVarianceMinutes}
                    openTimesheetReviewTarget={openTimesheetReviewTarget}
                    setSelectedDate={setSelectedDate}
                    shouldShowPlannerSection={shouldShowPlannerSection}
                    startOfDay={startOfDay}
                    teamOverviewPanel={
                      <Suspense fallback={null}>
                        <PlannerTimesheetTeamOverviewPanel
                          formatLeaveDays={formatLeaveDays}
                          formatMinutesAsDuration={formatMinutesAsDuration}
                          formatPlannerDate={formatPlannerDate}
                          formatPlannerDateRange={formatPlannerDateRange}
                          formatPlannerDateTime={formatPlannerDateTime}
                          getTimesheetLeaveAvailabilityBadgeVariant={
                            getTimesheetLeaveAvailabilityBadgeVariant
                          }
                          getTimesheetLeaveCoverageBadgeVariant={
                            getTimesheetLeaveCoverageBadgeVariant
                          }
                          getTimesheetWorkflowStatusLabel={getTimesheetWorkflowStatusLabel}
                          handleDeleteTimesheetDepartmentCoverageRule={
                            handleDeleteTimesheetDepartmentCoverageRule
                          }
                          handleExportTeamLeaveOverview={handleExportTeamLeaveOverview}
                          handleExportTeamTimesheetMonth={handleExportTeamTimesheetMonth}
                          handleReviewTimesheetLeaveOverride={handleReviewTimesheetLeaveOverride}
                          handleReviewTimesheetLeaveOverrideBlock={
                            handleReviewTimesheetLeaveOverrideBlock
                          }
                          openTimesheetDepartmentLeaveTarget={openTimesheetDepartmentLeaveTarget}
                          openTimesheetLeaveCalendarTarget={openTimesheetLeaveCalendarTarget}
                          openTimesheetReviewTarget={openTimesheetReviewTarget}
                          reviewTimesheetLeaveOverrideBlockMutation={
                            reviewTimesheetLeaveOverrideBlockMutation
                          }
                          reviewTimesheetLeaveOverrideMutation={
                            reviewTimesheetLeaveOverrideMutation
                          }
                          setEditingTimesheetDepartmentCoverageRule={
                            setEditingTimesheetDepartmentCoverageRule
                          }
                          setIsTimesheetDepartmentCoverageRuleDialogOpen={
                            setIsTimesheetDepartmentCoverageRuleDialogOpen
                          }
                          timesheetDepartmentCoverageRows={timesheetDepartmentCoverageRows}
                          timesheetDepartmentLeaveRows={timesheetDepartmentLeaveRows}
                          timesheetLeaveOverrideRegisterRows={
                            timesheetLeaveOverrideRegisterRows
                          }
                          timesheetOverviewRows={timesheetOverviewRows}
                          timesheetPendingLeaveOverrideBlockQueueRows={
                            timesheetPendingLeaveOverrideBlockQueueRows
                          }
                          timesheetPendingLeaveOverrideQueueRows={
                            timesheetPendingLeaveOverrideQueueRows
                          }
                          timesheetReviewedLeaveOverrideBlockRows={
                            timesheetReviewedLeaveOverrideBlockRows
                          }
                          timesheetTeamLeaveCalendarRows={timesheetTeamLeaveCalendarRows}
                          timesheetTeamLeaveCoverageRows={timesheetTeamLeaveCoverageRows}
                          timesheetTeamLeaveOverrideRows={timesheetTeamLeaveOverrideRows}
                          timesheetTeamLeaveRows={timesheetTeamLeaveRows}
                          typedTimesheetDepartmentCoverageSettings={
                            typedTimesheetDepartmentCoverageSettings
                          }
                        />
                      </Suspense>
                    }
                    timesheetEntriesLoading={timesheetEntriesLoading}
                    timesheetMonthRows={timesheetMonthRows}
                    timesheetOptionSummaryRows={timesheetOptionSummaryRows}
                    timesheetTeamAttentionRows={timesheetTeamAttentionRows}
                    typedTimesheetProfile={typedTimesheetProfile}
                    user={user}
                    />
                  </Suspense>
                </div>
              ) : null
            }
          />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardContent className="py-10 text-sm text-muted-foreground">
                Loading calendar workspace...
              </CardContent>
            </Card>
          }
        >
          <PlannerCalendarOperationsPanel
            allSharedBranchesValue={ALL_SHARED_BRANCHS_VALUE}
            filteredSharedEventsCount={filteredSharedEvents.length}
            formatPlannerDate={formatPlannerDate}
            formatUnifiedOccurrenceTiming={formatUnifiedOccurrenceTiming}
            getUnifiedSourceClass={getUnifiedSourceClass}
            handleCopyFeedUrl={handleCopyFeedUrl}
            handleRotateFeedToken={handleRotateFeedToken}
            handleSharedCalendarExport={handleSharedCalendarExport}
            onOpenSharedCreateFormForDate={openSharedCreateFormForDate}
            onSetSelectedSharedDate={setSelectedSharedDate}
            onSharedBranchFilterChange={setSharedBranchFilter}
            onUnifiedBranchFilterChange={setUnifiedBranchFilter}
            onUnifiedScopeChange={(value) => setUnifiedScope(value as UnifiedCalendarScope)}
            refetchUnifiedOccurrences={refetchUnifiedOccurrences}
            rotateFeedTokenPending={rotateFeedTokenMutation.isPending}
            selectedSharedDate={selectedSharedDate}
            sharedBranchFilter={sharedBranchFilter}
            sharedBranchOptions={sharedBranchOptions}
            sharedSummary={sharedSummary}
            today={today}
            unifiedBranchFilter={unifiedBranchFilter}
            unifiedBranchOptions={unifiedBranchOptions}
            unifiedColumns={unifiedColumns}
            unifiedEventsLoading={unifiedEventsLoading}
            unifiedFeedUrls={unifiedFeedUrls}
            unifiedRangeEnd={unifiedRangeEnd}
            unifiedRangeStart={unifiedRangeStart}
            unifiedRows={unifiedRows}
            unifiedScope={unifiedScope}
            unifiedSummary={unifiedSummary}
            upcomingUnifiedOccurrences={upcomingUnifiedOccurrences}
          />
        </Suspense>

        <Suspense
          fallback={
            <Card>
              <CardContent className="py-10 text-sm text-muted-foreground">
                Loading planner calendars...
              </CardContent>
            </Card>
          }
        >
          <PlannerCalendarSurfacesPanel
            branchMap={branchMap}
            calendarCells={calendarCells}
            canManageSharedEvent={canManageSharedEvent}
            columns={columns}
            currentDate={currentDate}
            entriesByDate={entriesByDate}
            formatPlannerDate={formatPlannerDate}
            formatPlannerDateTime={formatPlannerDateTime}
            formatSharedEventTiming={formatSharedEventTiming}
            getPlannerStatusClass={getPlannerStatusClass}
            getRecurrenceLabel={getRecurrenceLabel}
            getSharedEventTypeClass={getSharedEventTypeClass}
            handleDelete={handleDelete}
            handleSharedDelete={handleSharedDelete}
            handleToggleComplete={handleToggleComplete}
            isLoading={isLoading}
            onOpenCreateFormForDate={openCreateFormForDate}
            onOpenEditForm={openEditForm}
            onOpenSharedCreateFormForDate={openSharedCreateFormForDate}
            onOpenSharedEditForm={openSharedEditForm}
            onSetCurrentDate={setCurrentDate}
            onSetSelectedDate={setSelectedDate}
            onSetSelectedSharedDate={setSelectedSharedDate}
            selectedDate={selectedDate}
            selectedDateLabel={selectedDateLabel}
            selectedDayEntries={selectedDayEntries}
            selectedSharedDate={selectedSharedDate}
            selectedSharedDateLabel={selectedSharedDateLabel}
            selectedSharedDayEvents={selectedSharedDayEvents}
            sharedColumns={sharedColumns}
            sharedEventsByDate={sharedEventsByDate}
            sharedEventsLoading={sharedEventsLoading}
            sharedRows={sharedRows}
            today={today}
            typedEntries={typedEntries}
            updateMutationPending={updateMutation.isPending}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PlannerTimesheetOperationalDialogs
            activeTimesheetOptions={activeTimesheetOptions}
            bulkUpsertTimesheetEntriesMutation={bulkUpsertTimesheetEntriesMutation}
            createTimesheetHolidayMutation={createTimesheetHolidayMutation}
            editingTimesheetDepartmentCoverageRule={editingTimesheetDepartmentCoverageRule}
            editingTimesheetHoliday={editingTimesheetHoliday}
            getDateInputValue={getDateInputValue}
            getDefaultTimesheetHours={getDefaultTimesheetHours}
            isTimesheetBulkDialogOpen={isTimesheetBulkDialogOpen}
            isTimesheetDepartmentCoverageRuleDialogOpen={
              isTimesheetDepartmentCoverageRuleDialogOpen
            }
            isTimesheetHolidayDialogOpen={isTimesheetHolidayDialogOpen}
            monthEnd={monthEnd}
            parseDateInputValue={parseDateInputValue}
            refetchTimesheetDepartmentCoverageSettings={
              refetchTimesheetDepartmentCoverageSettings
            }
            refetchTimesheetEntries={refetchTimesheetEntries}
            refetchTimesheetHolidays={refetchTimesheetHolidays}
            refetchTimesheetOverview={refetchTimesheetOverview}
            refetchTimesheetTeamLeaveCalendar={refetchTimesheetTeamLeaveCalendar}
            refetchTimesheetTeamLeaveOverview={refetchTimesheetTeamLeaveOverview}
            refetchYearTimesheetEntries={refetchYearTimesheetEntries}
            saveTimesheetDepartmentCoverageRuleMutation={
              saveTimesheetDepartmentCoverageRuleMutation
            }
            selectedDate={selectedDate}
            setEditingTimesheetDepartmentCoverageRule={
              setEditingTimesheetDepartmentCoverageRule
            }
            setEditingTimesheetHoliday={setEditingTimesheetHoliday}
            setIsTimesheetBulkDialogOpen={setIsTimesheetBulkDialogOpen}
            setIsTimesheetDepartmentCoverageRuleDialogOpen={
              setIsTimesheetDepartmentCoverageRuleDialogOpen
            }
            setIsTimesheetHolidayDialogOpen={setIsTimesheetHolidayDialogOpen}
            timesheetDraftEndTime={timesheetDraftEndTime}
            timesheetDraftLeavePortionPercent={timesheetDraftLeavePortionPercent}
            timesheetDraftLunchBreakMinutes={timesheetDraftLunchBreakMinutes}
            timesheetDraftOptionIds={timesheetDraftOptionIds}
            timesheetDraftRemarks={timesheetDraftRemarks}
            timesheetDraftStartTime={timesheetDraftStartTime}
            timesheetDraftTeaBreakMinutes={timesheetDraftTeaBreakMinutes}
            timesheetKnownDepartments={timesheetKnownDepartments}
            toast={toast}
            updateTimesheetHolidayMutation={updateTimesheetHolidayMutation}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PlannerTimesheetSetupDialogs
            DEFAULT_TIMESHEET_PROFILE_HOURS={DEFAULT_TIMESHEET_PROFILE_HOURS}
            activeNonWorkingTimesheetOptions={activeNonWorkingTimesheetOptions}
            activeTimesheetTemplates={activeTimesheetTemplates}
            createTimesheetOptionMutation={createTimesheetOptionMutation}
            defaultTimesheetLeaveOptionId={defaultTimesheetLeaveOptionId}
            editingTimesheetLeaveBlock={editingTimesheetLeaveBlock}
            editingTimesheetOption={editingTimesheetOption}
            formatLeaveDays={formatLeaveDays}
            formatPlannerDate={formatPlannerDate}
            getDateInputValue={getDateInputValue}
            getMonthLabel={getMonthLabel}
            getTimesheetLeaveCoverageBadgeVariant={getTimesheetLeaveCoverageBadgeVariant}
            handleApplyTimesheetLeaveRange={handleApplyTimesheetLeaveRange}
            isTimesheetLeaveRangeDialogOpen={isTimesheetLeaveRangeDialogOpen}
            isTimesheetOptionDialogOpen={isTimesheetOptionDialogOpen}
            isTimesheetProfileDialogOpen={isTimesheetProfileDialogOpen}
            refetchTimesheetEntries={refetchTimesheetEntries}
            refetchTimesheetOptions={refetchTimesheetOptions}
            refetchTimesheetOverview={refetchTimesheetOverview}
            refetchTimesheetProfile={refetchTimesheetProfile}
            refetchTimesheetTeamLeaveCalendar={refetchTimesheetTeamLeaveCalendar}
            refetchTimesheetTeamLeaveOverview={refetchTimesheetTeamLeaveOverview}
            refetchTimesheetTemplates={refetchTimesheetTemplates}
            refetchYearTimesheetEntries={refetchYearTimesheetEntries}
            saveTimesheetProfileMutation={saveTimesheetProfileMutation}
            selectedDate={selectedDate}
            setEditingTimesheetLeaveBlock={setEditingTimesheetLeaveBlock}
            setEditingTimesheetOption={setEditingTimesheetOption}
            setIsTimesheetLeaveRangeDialogOpen={setIsTimesheetLeaveRangeDialogOpen}
            setIsTimesheetOptionDialogOpen={setIsTimesheetOptionDialogOpen}
            setIsTimesheetProfileDialogOpen={setIsTimesheetProfileDialogOpen}
            setTimesheetLeaveRangePreviewValues={setTimesheetLeaveRangePreviewValues}
            timesheetDepartmentCoveragePreview={timesheetDepartmentCoveragePreview}
            timesheetDepartmentCoveragePreviewLoading={timesheetDepartmentCoveragePreviewLoading}
            timesheetLeaveBalancePreview={timesheetLeaveBalancePreview}
            timesheetLeaveBalancePreviewLoading={timesheetLeaveBalancePreviewLoading}
            timesheetLeaveRangePreviewInput={timesheetLeaveRangePreviewInput}
            toast={toast}
            typedTimesheetOptions={typedTimesheetOptions}
            typedTimesheetProfile={typedTimesheetProfile}
            updateTimesheetOptionMutation={updateTimesheetOptionMutation}
            user={user}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PlannerTimesheetTemplateDialogs
            activeTimesheetOptions={activeTimesheetOptions}
            activeTimesheetTemplates={activeTimesheetTemplates}
            applyTimesheetTemplateToDraft={applyTimesheetTemplateToDraft}
            bulkUpsertTimesheetEntriesMutation={bulkUpsertTimesheetEntriesMutation}
            createTimesheetTemplateMutation={createTimesheetTemplateMutation}
            editingTimesheetTemplate={editingTimesheetTemplate}
            formatPlannerDate={formatPlannerDate}
            getDateInputValue={getDateInputValue}
            handleApplyTimesheetHolidaysToMonth={handleApplyTimesheetHolidaysToMonth}
            handleCopyPreviousTimesheetMonth={handleCopyPreviousTimesheetMonth}
            handleFillTimesheetMonthFromTemplates={handleFillTimesheetMonthFromTemplates}
            isTimesheetHolidayApplyDialogOpen={isTimesheetHolidayApplyDialogOpen}
            isTimesheetPreviousMonthCopyDialogOpen={isTimesheetPreviousMonthCopyDialogOpen}
            isTimesheetTemplateApplyDialogOpen={isTimesheetTemplateApplyDialogOpen}
            isTimesheetTemplateDialogOpen={isTimesheetTemplateDialogOpen}
            isTimesheetTemplateFillDialogOpen={isTimesheetTemplateFillDialogOpen}
            normaliseTimesheetLeavePortionPercent={normaliseTimesheetLeavePortionPercent}
            parseDateInputValue={parseDateInputValue}
            previousTimesheetMonthLabel={previousTimesheetMonthLabel}
            refetchTimesheetEntries={refetchTimesheetEntries}
            refetchTimesheetOverview={refetchTimesheetOverview}
            refetchTimesheetTeamLeaveCalendar={refetchTimesheetTeamLeaveCalendar}
            refetchTimesheetTeamLeaveOverview={refetchTimesheetTeamLeaveOverview}
            refetchTimesheetTemplates={refetchTimesheetTemplates}
            refetchYearTimesheetEntries={refetchYearTimesheetEntries}
            selectedDate={selectedDate}
            setEditingTimesheetTemplate={setEditingTimesheetTemplate}
            setIsTimesheetHolidayApplyDialogOpen={setIsTimesheetHolidayApplyDialogOpen}
            setIsTimesheetPreviousMonthCopyDialogOpen={setIsTimesheetPreviousMonthCopyDialogOpen}
            setIsTimesheetTemplateApplyDialogOpen={setIsTimesheetTemplateApplyDialogOpen}
            setIsTimesheetTemplateDialogOpen={setIsTimesheetTemplateDialogOpen}
            setIsTimesheetTemplateFillDialogOpen={setIsTimesheetTemplateFillDialogOpen}
            timesheetDraftEndTime={timesheetDraftEndTime}
            timesheetDraftLeavePortionPercent={timesheetDraftLeavePortionPercent}
            timesheetDraftLunchBreakMinutes={timesheetDraftLunchBreakMinutes}
            timesheetDraftOptionIds={timesheetDraftOptionIds}
            timesheetDraftRemarks={timesheetDraftRemarks}
            timesheetDraftStartTime={timesheetDraftStartTime}
            timesheetDraftTeaBreakMinutes={timesheetDraftTeaBreakMinutes}
            toast={toast}
            typedTimesheetTemplates={typedTimesheetTemplates}
            updateTimesheetTemplateMutation={updateTimesheetTemplateMutation}
            upsertTimesheetEntryMutation={upsertTimesheetEntryMutation}
          />
        </Suspense>

        <Suspense fallback={null}>
          <PlannerEntryDialogs
            ALL_SHARED_BRANCHS_VALUE={ALL_SHARED_BRANCHS_VALUE}
            createMutation={createMutation}
            createSharedMutation={createSharedMutation}
            editingEntry={editingEntry}
            editingSharedEvent={editingSharedEvent}
            getDateInputValue={getDateInputValue}
            getDateTimeInputValue={getDateTimeInputValue}
            isFormOpen={isFormOpen}
            isSharedFormOpen={isSharedFormOpen}
            parseDateInputValue={parseDateInputValue}
            parseDateTimeInputValue={parseDateTimeInputValue}
            refetch={refetch}
            refetchSharedEvents={refetchSharedEvents}
            selectedDate={selectedDate}
            selectedSharedDate={selectedSharedDate}
            setEditingEntry={setEditingEntry}
            setEditingSharedEvent={setEditingSharedEvent}
            setIsFormOpen={setIsFormOpen}
            setIsSharedFormOpen={setIsSharedFormOpen}
            startOfDay={startOfDay}
            toast={toast}
            typedBranches={typedBranches}
            updateMutation={updateMutation}
            updateSharedMutation={updateSharedMutation}
          />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

