import { Suspense, lazy, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Edit2, Link2, Plus, RotateCcw, Trash2 } from "lucide-react";

const PlannerWorkspaceRolloutPanel = lazy(() =>
  import("@/components/planner/PlannerWorkspaceRolloutPanel").then((module) => ({
    default: module.PlannerWorkspaceRolloutPanel,
  }))
);

type PlannerTimesheetWorkspace = "all" | "month" | "leave" | "review";
type PlannerWorkspaceStartMode = "remember" | "preferred";
type PlannerRolloutPhaseId = "setup" | "pilot" | "employee" | "admin" | "go-live";
type PlannerLaunchSignoffState = {
  "admin-flow-reviewed": boolean;
  "employee-flow-reviewed": boolean;
  "export-checked": boolean;
  "leave-checked": boolean;
  "setup-reviewed": boolean;
};
type PlannerLaunchSignoffItemId = keyof PlannerLaunchSignoffState;
type PlannerRolloutPhaseNotesState = Partial<
  Record<
    PlannerRolloutPhaseId,
    {
      text: string;
      updatedAt: string;
    }
  >
>;

type PlannerWorkspaceShortcut = {
  createdAt: string;
  dateKey: string | null;
  id: string;
  label: string;
  pinned?: boolean;
  sectionId: string;
  workspace: PlannerTimesheetWorkspace;
};

type PlannerWorkspaceRecentView = {
  dateKey: string | null;
  id: string;
  label: string;
  sectionId: string;
  viewedAt: string;
  workspace: PlannerTimesheetWorkspace;
};

type PlannerWorkspaceItem = {
  detail: string;
  disabled?: boolean;
  id: PlannerTimesheetWorkspace;
  label: string;
};

type PlannerWorkspaceFocusCard = {
  buttonLabel: string;
  detail: string;
  id: string;
  onClick: () => void;
  title: string;
  tone: "default" | "warning" | "success";
  value: number | string;
};

type PlannerTimesheetSectionItem = {
  detail: string;
  disabled?: boolean;
  id: string;
  label: string;
  status: string;
};

type PlannerWorkspaceResumeTarget = {
  date: Date | null;
  sectionId: string;
};

type PlannerRolloutActionLite = {
  actionLabel?: string;
  detail?: string;
  disabled?: boolean;
  id: string;
  label?: string;
  laneLabel?: string;
  nextPhaseId?: string | null;
  onClick?: () => void;
  targetPhaseId?: string | null;
};

type PlannerRolloutPhaseLite = {
  blockerLabel: string;
  detail: string;
  id: string;
  isCurrent: boolean;
  label: string;
  nextTask?: PlannerRolloutActionLite | null;
  progressLabel: string;
  ready: boolean;
};

type PlannerRolloutPhaseDetailLite = {
  phase: PlannerRolloutPhaseLite;
  snapshotText?: string;
  tasks: PlannerRolloutActionLite[];
};

type PlannerRolloutPhaseGateLite = {
  blockerLabel: string;
  nextPhase?: PlannerRolloutPhaseLite | null;
  phase: PlannerRolloutPhaseLite;
  previousPhase?: PlannerRolloutPhaseLite | null;
  stateLabel: string;
};

type PlannerRolloutTransitionLite = {
  canAdvance: boolean;
  currentOpenCount?: number;
  currentPhase: PlannerRolloutPhaseLite;
  currentLane?: { label: string; nextRow?: { phaseId?: string | null }; rows?: Array<{ phaseId?: string | null }> } | null;
  nextLane?: { label: string; nextRow?: { phaseId?: string | null }; rows?: Array<{ phaseId?: string | null }> } | null;
  nextOpenCount?: number;
  nextPhase?: PlannerRolloutPhaseLite | null;
  nextPhaseQueueCount: number;
  stateLabel?: string;
  targetPhaseId?: string | null;
  targetPhaseLabel?: string;
  transitionLabel: string;
};

type PlannerNoteLite = {
  phaseLabel: string;
  snapshotText: string;
  text: string;
  trimmedText: string;
  updatedAt: string | Date | null;
};

function parsePlannerPanelDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function startOfPlannerPanelDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

type PlannerWorkspaceHubPanelProps = {
  PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY: string;
  PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY: string;
  PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY: string;
  PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY: string;
  PLANNER_WORKSPACE_RECENTS_STORAGE_KEY: string;
  PLANNER_WORKSPACE_RESUME_STORAGE_KEY: string;
  PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY: string;
  PLANNER_WORKSPACE_START_MODE_STORAGE_KEY: string;
  activePlannerSectionId: string | null;
  activePlannerSectionLabel: string;
  activePlannerWorkspace: PlannerTimesheetWorkspace;
  activePlannerWorkspaceResumeTarget: PlannerWorkspaceResumeTarget;
  formatPlannerDateTime: (value: string | Date | null | undefined) => string;
  formatLeaveDays: (value: number) => string;
  getDateKey: (date: Date) => string;
  handleCopyPlannerSectionLink: (sectionId: string) => void | Promise<void>;
  handleSetPlannerWorkspace: (workspace: PlannerTimesheetWorkspace) => void;
  isTimesheetReviewAdmin: boolean;
  isTimesheetMonthApproved: boolean;
  isTimesheetMonthHandedOff: boolean;
  isTimesheetMonthSubmitted: boolean;
  movePlannerWorkspaceShortcut: (id: string, direction: "up" | "down") => void;
  openPlannerDateSectionInWorkspace: (
    workspace: PlannerTimesheetWorkspace,
    sectionId: string,
    date: Date
  ) => void;
  openPlannerSectionInWorkspace: (
    workspace: PlannerTimesheetWorkspace,
    sectionId: string
  ) => void;
  openTimesheetReviewTarget: (row: any) => void;
  openPlannerWorkspaceShortcut: (
    shortcut: PlannerWorkspaceShortcut | PlannerWorkspaceRecentView
  ) => void;
  plannerLastActiveWorkspace: PlannerTimesheetWorkspace;
  plannerActiveNonWorkingOptionCount: number;
  plannerActiveTemplateCount: number;
  plannerActiveWorkingOptionCount: number;
  plannerApprovedMonthCount: number;
  plannerDefaultWeekdayTemplateLabel: string;
  plannerDepartmentCoverageRuleCount: number;
  plannerHolidayCount: number;
  plannerMonthLockedAt: boolean;
  plannerMonthReviewedAt: boolean;
  plannerMonthSubmittedAt: boolean;
  plannerProfileDepartment: string;
  plannerProfileHasDefaultWeekdayTemplate: boolean;
  plannerProfilePersonalLeaveAllowanceDays: number | null;
  plannerProfileSignatureName: string;
  plannerPinnedWorkspaceShortcuts: PlannerWorkspaceShortcut[];
  plannerPreferredWorkspace: PlannerTimesheetWorkspace;
  plannerVisibleMonthEntryCount: number;
  plannerWorkspaceRecentViews: PlannerWorkspaceRecentView[];
  plannerWorkspaceShortcuts: PlannerWorkspaceShortcut[];
  plannerWorkspaceStartMode: PlannerWorkspaceStartMode;
  renamePlannerWorkspaceShortcut: (id: string) => void;
  resolvePlannerSectionTargetId: (sectionId: string) => string;
  scrollPlannerSectionIntoView: (
    sectionId: string,
    options?: { behavior?: ScrollBehavior; persistQuery?: boolean }
  ) => void;
  selectedDate: Date;
  setActivePlannerSectionId: Dispatch<SetStateAction<string | null>>;
  setCurrentDate: Dispatch<SetStateAction<Date>>;
  setPlannerLastActiveWorkspace: Dispatch<SetStateAction<PlannerTimesheetWorkspace>>;
  setPlannerPreferredWorkspace: Dispatch<SetStateAction<PlannerTimesheetWorkspace>>;
  setPlannerSectionQueryParam: (value: string | null) => void;
  setPlannerWorkspaceRecentViews: Dispatch<SetStateAction<PlannerWorkspaceRecentView[]>>;
  setPlannerWorkspaceResumeState: Dispatch<SetStateAction<Record<string, unknown>>>;
  setPlannerWorkspaceShortcuts: Dispatch<SetStateAction<PlannerWorkspaceShortcut[]>>;
  setPlannerWorkspaceStartMode: Dispatch<SetStateAction<PlannerWorkspaceStartMode>>;
  setPlannerWorkspaceStartupApplied: Dispatch<SetStateAction<boolean>>;
  setSelectedDate: Dispatch<SetStateAction<Date>>;
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
  };
  timesheetAttentionRowsCount: number;
  timesheetAvailabilitySummaryAll: number;
  timesheetCompletionSummary: any;
  timesheetMonthRowsCount: number;
  timesheetMonthStatusLabel: string;
  timesheetOverviewRowsCount: number;
  timesheetPendingLeaveOverrideBlockQueueRowsCount: number;
  timesheetPendingLeaveOverrideQueueRowsCount: number;
  timesheetPersonalLeaveAvailableDays: number | null | undefined;
  timesheetPersonalLeaveBlocks: Array<{ startDate: Date | string }>;
  timesheetPersonalLeaveOverrideSummary: any;
  timesheetPersonalLeaveRemainingDays: number | null | undefined;
  timesheetPersonalLeaveRowsCount: number;
  timesheetPersonalLeaveUsedDays: number;
  timesheetPersonalLeaveYearUsedDays: number | null | undefined;
  timesheetReviewQueueRows: any[];
  timesheetSummaryPersonalLeaveDays: number;
  timesheetTeamAttentionRowsCount: number;
  timesheetTeamLeaveRowsCount: number;
  timesheetTeamSummary: any;
  timesheetWeekRowsCount: number;
  typedTimesheetMonthStatusEmployeeDeclarationAccepted: boolean;
  typedTimesheetUserLeaveOverrideBlockRowsCount: number;
  togglePlannerWorkspaceShortcutPinned: (id: string) => void;
  visiblePlannerSectionIds: Set<string>;
  firstMissingTimesheetRow: { date: Date | string } | null;
};

export function PlannerWorkspaceHubPanel({
  PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY,
  PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY,
  PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY,
  PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY,
  PLANNER_WORKSPACE_RECENTS_STORAGE_KEY,
  PLANNER_WORKSPACE_RESUME_STORAGE_KEY,
  PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY,
  PLANNER_WORKSPACE_START_MODE_STORAGE_KEY,
  activePlannerSectionId,
  activePlannerSectionLabel,
  activePlannerWorkspace,
  activePlannerWorkspaceResumeTarget,
  formatPlannerDateTime,
  formatLeaveDays,
  getDateKey,
  handleCopyPlannerSectionLink,
  handleSetPlannerWorkspace,
  isTimesheetReviewAdmin,
  isTimesheetMonthApproved,
  isTimesheetMonthHandedOff,
  isTimesheetMonthSubmitted,
  movePlannerWorkspaceShortcut,
  openPlannerDateSectionInWorkspace,
  openPlannerSectionInWorkspace,
  openTimesheetReviewTarget,
  openPlannerWorkspaceShortcut,
  plannerLastActiveWorkspace,
  plannerActiveNonWorkingOptionCount,
  plannerActiveTemplateCount,
  plannerActiveWorkingOptionCount,
  plannerApprovedMonthCount,
  plannerDefaultWeekdayTemplateLabel,
  plannerDepartmentCoverageRuleCount,
  plannerHolidayCount,
  plannerMonthLockedAt,
  plannerMonthReviewedAt,
  plannerMonthSubmittedAt,
  plannerProfileDepartment,
  plannerProfileHasDefaultWeekdayTemplate,
  plannerProfilePersonalLeaveAllowanceDays,
  plannerProfileSignatureName,
  plannerPinnedWorkspaceShortcuts,
  plannerPreferredWorkspace,
  plannerVisibleMonthEntryCount,
  plannerWorkspaceRecentViews,
  plannerWorkspaceShortcuts,
  plannerWorkspaceStartMode,
  renamePlannerWorkspaceShortcut,
  resolvePlannerSectionTargetId,
  scrollPlannerSectionIntoView,
  selectedDate,
  setActivePlannerSectionId,
  setCurrentDate,
  setPlannerLastActiveWorkspace,
  setPlannerPreferredWorkspace,
  setPlannerSectionQueryParam,
  setPlannerWorkspaceRecentViews,
  setPlannerWorkspaceResumeState,
  setPlannerWorkspaceShortcuts,
  setPlannerWorkspaceStartMode,
  setPlannerWorkspaceStartupApplied,
  setSelectedDate,
  toast,
  timesheetAttentionRowsCount,
  timesheetAvailabilitySummaryAll,
  timesheetCompletionSummary,
  timesheetMonthRowsCount,
  timesheetMonthStatusLabel,
  timesheetOverviewRowsCount,
  timesheetPendingLeaveOverrideBlockQueueRowsCount,
  timesheetPendingLeaveOverrideQueueRowsCount,
  timesheetPersonalLeaveAvailableDays,
  timesheetPersonalLeaveBlocks,
  timesheetPersonalLeaveOverrideSummary,
  timesheetPersonalLeaveRemainingDays,
  timesheetPersonalLeaveRowsCount,
  timesheetPersonalLeaveUsedDays,
  timesheetPersonalLeaveYearUsedDays,
  timesheetReviewQueueRows,
  timesheetSummaryPersonalLeaveDays,
  timesheetTeamAttentionRowsCount,
  timesheetTeamLeaveRowsCount,
  timesheetTeamSummary,
  timesheetWeekRowsCount,
  typedTimesheetMonthStatusEmployeeDeclarationAccepted,
  typedTimesheetUserLeaveOverrideBlockRowsCount,
  togglePlannerWorkspaceShortcutPinned,
  visiblePlannerSectionIds,
  firstMissingTimesheetRow,
}: PlannerWorkspaceHubPanelProps) {
  const [plannerWorkspaceRolloutResetVersion, setPlannerWorkspaceRolloutResetVersion] = useState(0);
  const plannerWorkspaceItems = useMemo<PlannerWorkspaceItem[]>(
    () => [
      {
        id: "all",
        label: "Full Planner",
        detail: "Show the complete planner page.",
      },
      {
        id: "month",
        label: "My Month",
        detail: "Focus on daily logging, hours, totals, and submission.",
      },
      {
        id: "leave",
        label: "Leave",
        detail: "Focus on leave, holidays, availability, and override history.",
      },
      {
        id: "review",
        label: "Team Review",
        detail: isTimesheetReviewAdmin
          ? "Focus on team queues, leave coverage, and review work."
          : "Admin only",
        disabled: !isTimesheetReviewAdmin,
      },
    ],
    [isTimesheetReviewAdmin]
  );
  const plannerTimesheetSectionItems = useMemo<PlannerTimesheetSectionItem[]>(
    () => [
      {
        id: "timesheet-summary",
        label: "Month Status",
        detail: timesheetMonthStatusLabel,
        status: "Visible",
        disabled: false,
      },
      {
        id: "timesheet-day-editor",
        label: "Day Editor",
        detail: activePlannerSectionLabel,
        status: "Visible",
        disabled: false,
      },
      {
        id: "timesheet-personal-leave",
        label: "Personal Leave",
        detail:
          timesheetPersonalLeaveRowsCount > 0
            ? `${formatLeaveDays(timesheetPersonalLeaveUsedDays)} day(s) in the visible month`
            : "No leave saved yet",
        status: timesheetPersonalLeaveRowsCount > 0 ? "Visible" : "Empty",
        disabled: false,
      },
      {
        id: "timesheet-override-history",
        label: "Override Review History",
        detail:
          typedTimesheetUserLeaveOverrideBlockRowsCount > 0
            ? `${typedTimesheetUserLeaveOverrideBlockRowsCount} override block(s)`
            : "No override history yet",
        status: typedTimesheetUserLeaveOverrideBlockRowsCount > 0 ? "Visible" : "Empty",
        disabled: false,
      },
      {
        id: "timesheet-availability",
        label: "Availability Calendar",
        detail: `${timesheetAvailabilitySummaryAll} calendar day(s) in view`,
        status: "Visible",
        disabled: false,
      },
      {
        id: "timesheet-weekly-summary",
        label: "Weekly Summary",
        detail: `${timesheetWeekRowsCount} week row(s)`,
        status: "Visible",
        disabled: false,
      },
      {
        id: "timesheet-attention",
        label: "Attention Queue",
        detail:
          timesheetAttentionRowsCount > 0
            ? `${timesheetAttentionRowsCount} issue(s) need review`
            : "No issues in the visible month",
        status: timesheetAttentionRowsCount > 0 ? "Visible" : "Empty",
        disabled: false,
      },
      {
        id: "timesheet-register",
        label: "Monthly Register",
        detail: `${timesheetMonthRowsCount} day row(s)`,
        status: "Visible",
        disabled: false,
      },
      {
        id: "timesheet-team-overview",
        label: "Team Overview",
        detail: isTimesheetReviewAdmin ? `${timesheetOverviewRowsCount} team month row(s)` : "Admin only",
        status: isTimesheetReviewAdmin ? "Visible" : "Admin Only",
        disabled: !isTimesheetReviewAdmin,
      },
      {
        id: "timesheet-team-leave",
        label: "Team Leave",
        detail: isTimesheetReviewAdmin ? `${timesheetTeamLeaveRowsCount} team leave row(s)` : "Admin only",
        status: isTimesheetReviewAdmin ? "Visible" : "Admin Only",
        disabled: !isTimesheetReviewAdmin,
      },
      {
        id: "timesheet-review-queue",
        label: "Review Queue",
        detail: isTimesheetReviewAdmin ? `${timesheetReviewQueueRows.length} submitted month(s)` : "Admin only",
        status: isTimesheetReviewAdmin ? "Visible" : "Admin Only",
        disabled: !isTimesheetReviewAdmin,
      },
    ],
    [
      activePlannerSectionLabel,
      formatLeaveDays,
      isTimesheetReviewAdmin,
      timesheetAttentionRowsCount,
      timesheetAvailabilitySummaryAll,
      timesheetMonthRowsCount,
      timesheetMonthStatusLabel,
      timesheetOverviewRowsCount,
      timesheetPersonalLeaveRowsCount,
      timesheetPersonalLeaveUsedDays,
      timesheetReviewQueueRows.length,
      timesheetTeamLeaveRowsCount,
      timesheetWeekRowsCount,
      typedTimesheetUserLeaveOverrideBlockRowsCount,
    ]
  );
  const plannerWorkspaceFocusCards = useMemo<PlannerWorkspaceFocusCard[]>(() => {
    const firstLeaveBlock = timesheetPersonalLeaveBlocks[0] ?? null;
    const firstReviewQueueRow = timesheetReviewQueueRows[0] ?? null;
    const pendingOverrideItems =
      timesheetPendingLeaveOverrideBlockQueueRowsCount + timesheetPendingLeaveOverrideQueueRowsCount;
    const declarationLabel = typedTimesheetMonthStatusEmployeeDeclarationAccepted
      ? "Employee declaration is confirmed."
      : "Employee declaration is still pending.";

    if (activePlannerWorkspace === "month") {
      const readinessValue =
        timesheetCompletionSummary.blockerCount > 0
          ? `${timesheetCompletionSummary.blockerCount} blockers`
          : timesheetCompletionSummary.warningCount > 0
            ? `${timesheetCompletionSummary.warningCount} warnings`
            : timesheetCompletionSummary.completionPercent >= 100 &&
                timesheetCompletionSummary.dueWorkingDays > 0
              ? "Ready"
              : "In Progress";

      return [
        {
          id: "month-completion",
          title: "Completion",
          value: `${timesheetCompletionSummary.completedWorkingDays}/${timesheetCompletionSummary.dueWorkingDays || 0}`,
          detail: `${timesheetCompletionSummary.completionPercent}% of due working days are complete.`,
          buttonLabel: firstMissingTimesheetRow ? "Open First Blocker" : "Open Day Editor",
          onClick: () =>
            openPlannerDateSectionInWorkspace(
              "month",
              "timesheet-day-editor",
              firstMissingTimesheetRow?.date instanceof Date
                ? firstMissingTimesheetRow.date
                : selectedDate
            ),
          tone:
            timesheetCompletionSummary.completionPercent >= 100 &&
            timesheetCompletionSummary.blockerCount === 0
              ? "success"
              : "default",
        },
        {
          id: "month-readiness",
          title: "Submission Readiness",
          value: readinessValue,
          detail:
            timesheetCompletionSummary.blockerCount > 0
              ? "Fix the blocking issues before finalising or submitting this month."
              : timesheetCompletionSummary.warningCount > 0
                ? "Warnings do not block submission, but they should be reviewed."
                : "This month is structurally ready based on current checks.",
          buttonLabel:
            timesheetCompletionSummary.blockerCount > 0 ||
            timesheetCompletionSummary.warningCount > 0
              ? "Open Attention"
              : "Open Month Status",
          onClick: () =>
            openPlannerSectionInWorkspace(
              "month",
              timesheetCompletionSummary.blockerCount > 0 ||
                timesheetCompletionSummary.warningCount > 0
                ? "timesheet-attention"
                : "timesheet-summary"
            ),
          tone:
            timesheetCompletionSummary.blockerCount > 0
              ? "warning"
              : timesheetCompletionSummary.completionPercent >= 100 &&
                  timesheetCompletionSummary.warningCount === 0
                ? "success"
                : "default",
        },
        {
          id: "month-workflow",
          title: "Month Workflow",
          value: timesheetMonthStatusLabel,
          detail: declarationLabel,
          buttonLabel: "Open Month Status",
          onClick: () => openPlannerSectionInWorkspace("month", "timesheet-summary"),
          tone:
            isTimesheetMonthApproved || isTimesheetMonthHandedOff
              ? "success"
              : isTimesheetMonthSubmitted
                ? "default"
                : "default",
        },
      ];
    }

    if (activePlannerWorkspace === "leave") {
      return [
        {
          id: "leave-balance",
          title: "Leave Balance",
          value: formatLeaveDays(timesheetPersonalLeaveRemainingDays ?? 0),
          detail: `${formatLeaveDays(timesheetPersonalLeaveYearUsedDays ?? 0)} used in the leave year from ${formatLeaveDays(timesheetPersonalLeaveAvailableDays ?? 0)} available day(s).`,
          buttonLabel: "Open Leave Register",
          onClick: () => openPlannerSectionInWorkspace("leave", "timesheet-personal-leave"),
          tone: (timesheetPersonalLeaveRemainingDays ?? 0) <= 2 ? "warning" : "default",
        },
        {
          id: "leave-blocks",
          title: "Leave Blocks",
          value: `${timesheetPersonalLeaveBlocks.length}`,
          detail: `${formatLeaveDays(timesheetSummaryPersonalLeaveDays)} leave day(s) are logged in the visible month.`,
          buttonLabel: firstLeaveBlock ? "Open First Block" : "Open Leave Register",
          onClick: () =>
            firstLeaveBlock
                  ? openPlannerDateSectionInWorkspace(
                      "leave",
                      "timesheet-personal-leave",
                      firstLeaveBlock.startDate instanceof Date
                        ? firstLeaveBlock.startDate
                        : new Date(firstLeaveBlock.startDate)
                    )
              : openPlannerSectionInWorkspace("leave", "timesheet-personal-leave"),
          tone: timesheetPersonalLeaveBlocks.length > 0 ? "success" : "default",
        },
        {
          id: "leave-override",
          title: "Override Reviews",
          value:
            timesheetPersonalLeaveOverrideSummary.pendingDayCount > 0
              ? `${timesheetPersonalLeaveOverrideSummary.pendingDayCount} pending`
              : timesheetPersonalLeaveOverrideSummary.reviewedDayCount > 0
                ? `${timesheetPersonalLeaveOverrideSummary.reviewedDayCount} reviewed`
                : "None",
          detail:
            timesheetPersonalLeaveOverrideSummary.pendingBlockCount > 0
              ? `${timesheetPersonalLeaveOverrideSummary.pendingBlockCount} block(s) still need admin review.`
              : "No pending personal leave override reviews in the visible month.",
          buttonLabel:
            timesheetPersonalLeaveOverrideSummary.pendingDayCount > 0
              ? "Open Override History"
              : "Open Availability",
          onClick: () =>
            openPlannerSectionInWorkspace(
              "leave",
              timesheetPersonalLeaveOverrideSummary.pendingDayCount > 0
                ? "timesheet-override-history"
                : "timesheet-availability"
            ),
          tone:
            timesheetPersonalLeaveOverrideSummary.pendingDayCount > 0
              ? "warning"
              : timesheetPersonalLeaveOverrideSummary.reviewedDayCount > 0
                ? "success"
                : "default",
        },
      ];
    }

    if (activePlannerWorkspace === "review" && isTimesheetReviewAdmin) {
      return [
        {
          id: "review-submitted",
          title: "Submitted Months",
          value: `${timesheetTeamSummary.submittedCount}`,
          detail:
            timesheetTeamSummary.overdueReviewCount > 0
              ? `${timesheetTeamSummary.overdueReviewCount} month(s) are overdue for review.`
              : "No overdue review pressure in the current month.",
          buttonLabel: firstReviewQueueRow ? "Open First Review" : "Open Review Queue",
          onClick: () => {
            if (firstReviewQueueRow) {
              openTimesheetReviewTarget(firstReviewQueueRow);
            }
            openPlannerSectionInWorkspace("review", "timesheet-review-queue");
          },
          tone: timesheetTeamSummary.overdueReviewCount > 0 ? "warning" : "default",
        },
        {
          id: "review-attention",
          title: "Team Attention",
          value: `${timesheetTeamAttentionRowsCount}`,
          detail:
            timesheetTeamAttentionRowsCount > 0
              ? "Combined timesheet, leave, and override issues are waiting."
              : "No team attention items are currently open for this month.",
          buttonLabel: "Open Attention Queue",
          onClick: () => openPlannerSectionInWorkspace("review", "timesheet-team-attention"),
          tone: timesheetTeamAttentionRowsCount > 0 ? "warning" : "success",
        },
        {
          id: "review-override",
          title: "Override Reviews",
          value: `${pendingOverrideItems}`,
          detail:
            pendingOverrideItems > 0
              ? `${timesheetPendingLeaveOverrideBlockQueueRowsCount} block item(s) and ${timesheetPendingLeaveOverrideQueueRowsCount} day item(s) are pending.`
              : "No leave override review items are waiting right now.",
          buttonLabel:
            timesheetPendingLeaveOverrideBlockQueueRowsCount > 0
              ? "Open Block Queue"
              : "Open Override Queue",
          onClick: () =>
            openPlannerSectionInWorkspace(
              "review",
              timesheetPendingLeaveOverrideBlockQueueRowsCount > 0
                ? "timesheet-override-review-blocks"
                : "timesheet-override-review-queue"
            ),
          tone: pendingOverrideItems > 0 ? "warning" : "success",
        },
      ];
    }

    return [
      {
        id: "all-month",
        title: "My Month",
        value:
          timesheetCompletionSummary.blockerCount > 0
            ? `${timesheetCompletionSummary.blockerCount} blockers`
            : `${timesheetCompletionSummary.completionPercent}% complete`,
        detail: "Jump into the personal month workspace for daily logging and submission.",
        buttonLabel: "Open My Month",
        onClick: () => handleSetPlannerWorkspace("month"),
        tone:
          timesheetCompletionSummary.blockerCount > 0
            ? "warning"
            : timesheetCompletionSummary.completionPercent >= 100
              ? "success"
              : "default",
      },
      {
        id: "all-leave",
        title: "Leave",
        value: `${timesheetPersonalLeaveBlocks.length} blocks`,
        detail: "Jump into leave, holidays, availability, and override review history.",
        buttonLabel: "Open Leave",
        onClick: () => handleSetPlannerWorkspace("leave"),
        tone: timesheetPersonalLeaveBlocks.length > 0 ? "success" : "default",
      },
      {
        id: "all-review",
        title: "Team Review",
        value: isTimesheetReviewAdmin ? `${timesheetTeamSummary.submittedCount} submitted` : "Admin only",
        detail: isTimesheetReviewAdmin
          ? "Jump into submitted months, override review queues, and team attention."
          : "This workspace is available only to admin and super_admin users.",
        buttonLabel: isTimesheetReviewAdmin ? "Open Team Review" : "Open Full Planner",
        onClick: () =>
          isTimesheetReviewAdmin ? handleSetPlannerWorkspace("review") : handleSetPlannerWorkspace("all"),
        tone:
          isTimesheetReviewAdmin && timesheetTeamSummary.submittedCount > 0 ? "warning" : "default",
      },
    ];
  }, [
    activePlannerSectionLabel,
    activePlannerWorkspace,
    firstMissingTimesheetRow,
    formatLeaveDays,
    handleSetPlannerWorkspace,
    isTimesheetMonthApproved,
    isTimesheetMonthHandedOff,
    isTimesheetMonthSubmitted,
    isTimesheetReviewAdmin,
    openPlannerDateSectionInWorkspace,
    openPlannerSectionInWorkspace,
    openTimesheetReviewTarget,
    selectedDate,
    timesheetCompletionSummary,
    timesheetMonthStatusLabel,
    timesheetPendingLeaveOverrideBlockQueueRowsCount,
    timesheetPendingLeaveOverrideQueueRowsCount,
    timesheetPersonalLeaveAvailableDays,
    timesheetPersonalLeaveBlocks,
    timesheetPersonalLeaveOverrideSummary,
    timesheetPersonalLeaveRemainingDays,
    timesheetPersonalLeaveYearUsedDays,
    timesheetReviewQueueRows,
    timesheetSummaryPersonalLeaveDays,
    timesheetTeamAttentionRowsCount,
    timesheetTeamSummary,
    typedTimesheetMonthStatusEmployeeDeclarationAccepted,
  ]);
  return (
    <>
            <Card id="timesheet-section-map">
              <CardHeader>
                <CardTitle>Planner Section Map</CardTitle>
                <CardDescription>
                  Jump to the relevant planner area and see whether a section is populated, empty, or restricted by role.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {plannerWorkspaceItems.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      disabled={workspace.disabled}
                      onClick={() => handleSetPlannerWorkspace(workspace.id)}
                      className={`rounded-xl border bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
                        activePlannerWorkspace === workspace.id
                          ? "border-blue-300 ring-2 ring-blue-100"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-slate-900">{workspace.label}</div>
                        {activePlannerWorkspace === workspace.id ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : workspace.disabled ? (
                          <Badge variant="outline">Admin Only</Badge>
                        ) : null}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{workspace.detail}</div>
                    </button>
                  ))}
                </div>
                {plannerPinnedWorkspaceShortcuts.length > 0 ? (
                  <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">
                        Pinned Planner Shortcuts
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Quick-launch the planner views you return to most often.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plannerPinnedWorkspaceShortcuts.map((shortcut) => (
                          <Button
                            key={`pinned-shortcut-${shortcut.id}`}
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openPlannerWorkspaceShortcut(shortcut)}
                          >
                            <Link2 className="mr-2 h-4 w-4" />
                            {shortcut.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Recent Planner Views</div>
                      <div className="text-xs text-muted-foreground">
                        The planner now remembers the last views you actually opened, even when
                        you did not save them as shortcuts.
                      </div>
                    </div>
                    <div className="space-y-2 lg:min-w-[420px]">
                      <div className="text-sm font-medium text-slate-900">Recent History</div>
                      {plannerWorkspaceRecentViews.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                          No planner history recorded yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {plannerWorkspaceRecentViews.map((view) => (
                            <div
                              key={view.id}
                              className="flex flex-col gap-2 rounded-lg border bg-white p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {view.label}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {view.dateKey ? `Opened on ${view.dateKey}` : "No day selected"}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPlannerWorkspaceShortcut(view)}
                                >
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Reopen
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setPlannerWorkspaceRecentViews((current) =>
                                      current.filter((item) => item.id !== view.id)
                                    )
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              <Suspense fallback={null}>
                <PlannerWorkspaceRolloutPanel
                  plannerWorkspaceRolloutResetVersion={plannerWorkspaceRolloutResetVersion}
                  PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY={PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY}
                  PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY={PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY}
                  activePlannerWorkspace={activePlannerWorkspace}
                  firstMissingTimesheetRow={firstMissingTimesheetRow}
                  formatPlannerDateTime={formatPlannerDateTime}
                  formatLeaveDays={formatLeaveDays}
                  handleSetPlannerWorkspace={handleSetPlannerWorkspace}
                  isTimesheetMonthApproved={isTimesheetMonthApproved}
                  isTimesheetMonthHandedOff={isTimesheetMonthHandedOff}
                  isTimesheetMonthSubmitted={isTimesheetMonthSubmitted}
                  isTimesheetReviewAdmin={isTimesheetReviewAdmin}
                  openPlannerDateSectionInWorkspace={openPlannerDateSectionInWorkspace}
                  openPlannerSectionInWorkspace={openPlannerSectionInWorkspace}
                  openTimesheetReviewTarget={openTimesheetReviewTarget}
                  plannerActiveNonWorkingOptionCount={plannerActiveNonWorkingOptionCount}
                  plannerActiveTemplateCount={plannerActiveTemplateCount}
                  plannerActiveWorkingOptionCount={plannerActiveWorkingOptionCount}
                  plannerApprovedMonthCount={plannerApprovedMonthCount}
                  plannerDefaultWeekdayTemplateLabel={plannerDefaultWeekdayTemplateLabel}
                  plannerDepartmentCoverageRuleCount={plannerDepartmentCoverageRuleCount}
                  plannerHolidayCount={plannerHolidayCount}
                  plannerMonthLockedAt={plannerMonthLockedAt}
                  plannerMonthReviewedAt={plannerMonthReviewedAt}
                  plannerMonthSubmittedAt={plannerMonthSubmittedAt}
                  plannerProfileDepartment={plannerProfileDepartment}
                  plannerProfileHasDefaultWeekdayTemplate={plannerProfileHasDefaultWeekdayTemplate}
                  plannerProfilePersonalLeaveAllowanceDays={plannerProfilePersonalLeaveAllowanceDays}
                  plannerProfileSignatureName={plannerProfileSignatureName}
                  selectedDate={selectedDate}
                  setCurrentDate={setCurrentDate}
                  setSelectedDate={setSelectedDate}
                  timesheetAttentionRowsCount={timesheetAttentionRowsCount}
                  timesheetAvailabilitySummaryAll={timesheetAvailabilitySummaryAll}
                  timesheetCompletionSummary={timesheetCompletionSummary}
                  timesheetMonthRowsCount={timesheetMonthRowsCount}
                  timesheetMonthStatusLabel={timesheetMonthStatusLabel}
                  timesheetOverviewRowsCount={timesheetOverviewRowsCount}
                  timesheetPendingLeaveOverrideBlockQueueRowsCount={timesheetPendingLeaveOverrideBlockQueueRowsCount}
                  timesheetPendingLeaveOverrideQueueRowsCount={timesheetPendingLeaveOverrideQueueRowsCount}
                  timesheetPersonalLeaveAvailableDays={timesheetPersonalLeaveAvailableDays}
                  timesheetPersonalLeaveBlocks={timesheetPersonalLeaveBlocks}
                  timesheetPersonalLeaveOverrideSummary={timesheetPersonalLeaveOverrideSummary}
                  timesheetPersonalLeaveRemainingDays={timesheetPersonalLeaveRemainingDays}
                  timesheetPersonalLeaveRowsCount={timesheetPersonalLeaveRowsCount}
                  timesheetPersonalLeaveUsedDays={timesheetPersonalLeaveUsedDays}
                  timesheetPersonalLeaveYearUsedDays={timesheetPersonalLeaveYearUsedDays}
                  timesheetReviewQueueRows={timesheetReviewQueueRows}
                  timesheetSummaryPersonalLeaveDays={timesheetSummaryPersonalLeaveDays}
                  timesheetTeamAttentionRowsCount={timesheetTeamAttentionRowsCount}
                  timesheetTeamLeaveRowsCount={timesheetTeamLeaveRowsCount}
                  timesheetTeamSummary={timesheetTeamSummary}
                  timesheetWeekRowsCount={timesheetWeekRowsCount}
                  toast={toast}
                  typedTimesheetMonthStatusEmployeeDeclarationAccepted={typedTimesheetMonthStatusEmployeeDeclarationAccepted}
                  typedTimesheetUserLeaveOverrideBlockRowsCount={typedTimesheetUserLeaveOverrideBlockRowsCount}
                />
              </Suspense>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Planner Startup View</div>
                      <div className="text-xs text-muted-foreground">
                        Choose whether the planner should reopen on the last workspace you used or
                        always start on a pinned workspace when there is no explicit planner link.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            plannerWorkspaceStartMode === "remember" ? "default" : "outline"
                          }
                          onClick={() => setPlannerWorkspaceStartMode("remember")}
                        >
                          Remember Last Workspace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            plannerWorkspaceStartMode === "preferred" ? "default" : "outline"
                          }
                          onClick={() => setPlannerWorkspaceStartMode("preferred")}
                        >
                          Use Preferred Workspace
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 lg:min-w-[320px]">
                      <div className="text-sm font-medium text-slate-900">Preferred Workspace</div>
                      <div className="flex flex-wrap gap-2">
                        {plannerWorkspaceItems.map((workspace) => (
                          <Button
                            key={`preferred-${workspace.id}`}
                            type="button"
                            size="sm"
                            variant={
                              plannerPreferredWorkspace === workspace.id ? "default" : "outline"
                            }
                            disabled={workspace.disabled}
                            onClick={() => setPlannerPreferredWorkspace(workspace.id)}
                          >
                            {workspace.label}
                          </Button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current startup rule:{" "}
                        {plannerWorkspaceStartMode === "preferred"
                          ? `open ${plannerWorkspaceItems.find((item) => item.id === plannerPreferredWorkspace)?.label || "Full Planner"}`
                          : `resume ${plannerWorkspaceItems.find((item) => item.id === plannerLastActiveWorkspace)?.label || "Full Planner"}`}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Planner Shortcuts</div>
                      <div className="text-xs text-muted-foreground">
                        Save the current workspace, section, and day as a reusable shortcut.
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const shortcutId =
                            typeof crypto !== "undefined" && "randomUUID" in crypto
                              ? crypto.randomUUID()
                              : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                          const shortcutLabel = `${plannerWorkspaceItems.find((item) => item.id === activePlannerWorkspace)?.label || "Planner"}: ${activePlannerSectionLabel}`;
                          const nextShortcut: PlannerWorkspaceShortcut = {
                            id: shortcutId,
                            label: shortcutLabel,
                            workspace: activePlannerWorkspace,
                            sectionId: activePlannerSectionId || "timesheet-summary",
                            dateKey: getDateKey(selectedDate),
                            createdAt: new Date().toISOString(),
                            pinned: false,
                          };
                          setPlannerWorkspaceShortcuts((current) => [
                            nextShortcut,
                            ...current,
                          ].slice(0, 8));
                          toast.success("Planner shortcut saved.");
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Save Current View
                      </Button>
                    </div>
                    <div className="space-y-2 lg:min-w-[420px]">
                      <div className="text-sm font-medium text-slate-900">Saved Shortcuts</div>
                      {plannerWorkspaceShortcuts.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                          No planner shortcuts saved yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {plannerWorkspaceShortcuts.map((shortcut) => (
                            <div
                              key={shortcut.id}
                              className="flex flex-col gap-2 rounded-lg border bg-white p-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-sm font-medium text-slate-900">
                                    {shortcut.label}
                                  </div>
                                  {shortcut.pinned ? (
                                    <Badge variant="secondary">Pinned</Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {plannerWorkspaceItems.find((item) => item.id === shortcut.workspace)
                                    ?.label || "Planner"}
                                  {shortcut.dateKey ? ` on ${shortcut.dateKey}` : ""}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    togglePlannerWorkspaceShortcutPinned(shortcut.id)
                                  }
                                >
                                  {shortcut.pinned ? "Unpin" : "Pin"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    movePlannerWorkspaceShortcut(shortcut.id, "up")
                                  }
                                >
                                  Up
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    movePlannerWorkspaceShortcut(shortcut.id, "down")
                                  }
                                >
                                  Down
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => renamePlannerWorkspaceShortcut(shortcut.id)}
                                >
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  Rename
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPlannerWorkspaceShortcut(shortcut)}
                                >
                                  <Link2 className="mr-2 h-4 w-4" />
                                  Open
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setPlannerWorkspaceShortcuts((current) =>
                                      current.filter((item) => item.id !== shortcut.id)
                                    )
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {plannerWorkspaceFocusCards.map((card) => (
                    <div
                      key={card.id}
                      className={`rounded-xl border p-4 ${
                        card.tone === "warning"
                          ? "border-amber-200 bg-amber-50"
                          : card.tone === "success"
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{card.title}</div>
                          <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {card.value}
                          </div>
                        </div>
                        <Badge
                          variant={
                            card.tone === "warning"
                              ? "outline"
                              : card.tone === "success"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {activePlannerWorkspace === "all"
                            ? "Workspace"
                            : activePlannerWorkspace === "month"
                              ? "My Month"
                              : activePlannerWorkspace === "leave"
                                ? "Leave"
                                : "Team Review"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{card.detail}</div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={card.onClick}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        {card.buttonLabel}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPlannerWorkspaceResumeState({});
                      setPlannerLastActiveWorkspace("all");
                      setPlannerWorkspaceStartMode("remember");
                      setPlannerPreferredWorkspace("all");
                      setPlannerWorkspaceShortcuts([]);
                      setPlannerWorkspaceRecentViews([]);
                      setPlannerWorkspaceRolloutResetVersion((current) => current + 1);
                      setPlannerWorkspaceStartupApplied(false);
                      if (typeof window !== "undefined") {
                        try {
                          window.localStorage.removeItem(
                            PLANNER_WORKSPACE_RESUME_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_WORKSPACE_LAST_ACTIVE_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_WORKSPACE_START_MODE_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_WORKSPACE_PREFERRED_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_WORKSPACE_SHORTCUTS_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_WORKSPACE_RECENTS_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY
                          );
                          window.localStorage.removeItem(
                            PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY
                          );
                        } catch {
                          // Ignore local storage clear failures.
                        }
                      }
                      toast.success("Planner workspace memory reset.");
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reset Workspace Memory
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activePlannerWorkspaceResumeTarget.date) {
                        setCurrentDate(
                          new Date(
                            activePlannerWorkspaceResumeTarget.date.getFullYear(),
                            activePlannerWorkspaceResumeTarget.date.getMonth(),
                            1
                          )
                        );
                        setSelectedDate(activePlannerWorkspaceResumeTarget.date);
                      }
                      scrollPlannerSectionIntoView(
                        activePlannerWorkspaceResumeTarget.sectionId,
                        {
                          persistQuery: true,
                          behavior: "smooth",
                        }
                      );
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Resume Workspace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      activePlannerSectionId
                        ? void handleCopyPlannerSectionLink(activePlannerSectionId)
                        : void handleCopyPlannerSectionLink("timesheet-summary")
                    }
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Section Link
                  </Button>
                  {activePlannerSectionId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActivePlannerSectionId(null);
                        setPlannerSectionQueryParam(null);
                      }}
                    >
                      Clear Section Link
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  Resume target:{" "}
                  {plannerTimesheetSectionItems.find(
                    (section) =>
                      resolvePlannerSectionTargetId(section.id) ===
                      resolvePlannerSectionTargetId(
                        activePlannerWorkspaceResumeTarget.sectionId
                      )
                  )?.label || "Month Status"}
                  {activePlannerWorkspaceResumeTarget.date
                    ? ` on ${activePlannerWorkspaceResumeTarget.date.toLocaleDateString("en-ZA", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}`
                    : ""}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {plannerTimesheetSectionItems.map((section) => (
                    (() => {
                      const resolvedSectionId = resolvePlannerSectionTargetId(section.id);
                      const isVisibleInWorkspace = visiblePlannerSectionIds.has(resolvedSectionId);
                      return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollPlannerSectionIntoView(section.id)}
                      disabled={section.disabled}
                      className={`rounded-xl border bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${
                        activePlannerSectionId === resolvedSectionId
                          ? "border-blue-300 ring-2 ring-blue-100"
                          : ""
                      } ${!isVisibleInWorkspace ? "opacity-70" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{section.label}</div>
                        <div className="flex items-center gap-2">
                          {activePlannerSectionId === resolvedSectionId ? (
                            <Badge variant="secondary">Current</Badge>
                          ) : null}
                          {!isVisibleInWorkspace ? (
                            <Badge variant="outline">Hidden In View</Badge>
                          ) : null}
                          <Badge
                            variant={
                              section.status === "Visible"
                                ? "secondary"
                                : section.status === "Admin Only"
                                  ? "outline"
                                  : "outline"
                            }
                          >
                            {section.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{section.detail}</div>
                    </button>
                      );
                    })()
                  ))}
                </div>
                {!isTimesheetReviewAdmin ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    Team overview, team leave, and submitted-month review sections are available only
                    to `admin` and `super_admin`.
                  </div>
                ) : null}
              </CardContent>
            </Card>
    </>
  );
}
