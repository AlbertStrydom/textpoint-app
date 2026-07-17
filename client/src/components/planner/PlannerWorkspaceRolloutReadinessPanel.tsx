import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  buildPlannerGoLiveSnapshotText,
  buildPlannerRolloutHandoffPackText,
  buildPlannerRolloutSnapshotText,
  getPlannerRolloutQueueFilterLabel,
} from "@/lib/plannerRolloutSnapshotUtils";
import { Copy, Edit2, Link2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

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
type PlannerWorkspaceRolloutReadinessPanelProps = any;

export function PlannerWorkspaceRolloutReadinessPanel({
  PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY,
  PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY,
  plannerWorkspaceRolloutResetVersion,
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
}: PlannerWorkspaceRolloutReadinessPanelProps) {
  const [plannerLaunchSignoff, setPlannerLaunchSignoff] = useState<PlannerLaunchSignoffState>({
    "setup-reviewed": false,
    "employee-flow-reviewed": false,
    "admin-flow-reviewed": false,
    "export-checked": false,
    "leave-checked": false,
  });
  const setPlannerLaunchSignoffItem = (id: PlannerLaunchSignoffItemId, checked: boolean) => {
    setPlannerLaunchSignoff((current) => ({
      ...current,
      [id]: checked,
    }));
  };
  const resetPlannerLaunchSignoff = () => {
    setPlannerLaunchSignoff({
      "setup-reviewed": false,
      "employee-flow-reviewed": false,
      "admin-flow-reviewed": false,
      "export-checked": false,
      "leave-checked": false,
    });
  };
  useEffect(() => {
    resetPlannerLaunchSignoff();
  }, [plannerWorkspaceRolloutResetVersion]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const launchSignoffRaw = window.localStorage.getItem(PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY);
      if (!launchSignoffRaw) {
        return;
      }
      const parsedLaunchSignoff = JSON.parse(launchSignoffRaw) as Partial<PlannerLaunchSignoffState>;
      if (parsedLaunchSignoff && typeof parsedLaunchSignoff === "object") {
        setPlannerLaunchSignoff({
          "setup-reviewed": Boolean(parsedLaunchSignoff["setup-reviewed"]),
          "employee-flow-reviewed": Boolean(parsedLaunchSignoff["employee-flow-reviewed"]),
          "admin-flow-reviewed": Boolean(parsedLaunchSignoff["admin-flow-reviewed"]),
          "export-checked": Boolean(parsedLaunchSignoff["export-checked"]),
          "leave-checked": Boolean(parsedLaunchSignoff["leave-checked"]),
        });
      }
    } catch {
      // Ignore invalid persisted launch sign-off state.
    }
  }, [PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY,
        JSON.stringify(plannerLaunchSignoff)
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY, plannerLaunchSignoff]);
  const copyPlannerText = async (
    text: string,
    successMessage: string,
    failureMessage: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error(failureMessage);
    }
  };
  const plannerReadinessChecks = useMemo(
    () => [
      {
        id: "profile-department",
        label: "Timesheet profile department",
        ready: Boolean(plannerProfileDepartment.trim()),
        detail: plannerProfileDepartment.trim()
          ? plannerProfileDepartment.trim()
          : "Set the employee department in Timesheet Profile.",
        actionLabel: "Open Profile",
        onClick: () => {
          handleSetPlannerWorkspace("month");
          scrollPlannerSectionIntoView("timesheet-profile", { persistQuery: true });
        },
      },
      {
        id: "profile-signature",
        label: "Timesheet sign-off name",
        ready: Boolean(plannerProfileSignatureName.trim()),
        detail: plannerProfileSignatureName.trim()
          ? plannerProfileSignatureName.trim()
          : "Set the employee sign-off name in Timesheet Profile.",
        actionLabel: "Open Profile",
        onClick: () => {
          handleSetPlannerWorkspace("month");
          scrollPlannerSectionIntoView("timesheet-profile", { persistQuery: true });
        },
      },
      {
        id: "leave-allowance",
        label: "Personal leave allowance",
        ready: plannerProfilePersonalLeaveAllowanceDays !== null,
        detail:
          plannerProfilePersonalLeaveAllowanceDays !== null
            ? `${plannerProfilePersonalLeaveAllowanceDays ?? 0} day allowance configured`
            : "Set a leave allowance before relying on leave balance checks.",
        actionLabel: "Open Profile",
        onClick: () => {
          handleSetPlannerWorkspace("month");
          scrollPlannerSectionIntoView("timesheet-profile", { persistQuery: true });
        },
      },
      {
        id: "working-options",
        label: "Working activity options",
        ready: plannerActiveWorkingOptionCount > 0,
        detail:
          plannerActiveWorkingOptionCount > 0
            ? `${plannerActiveWorkingOptionCount} active activity option(s)`
            : "Add at least one active working activity option.",
        actionLabel: "Open Activity Setup",
        onClick: () => openPlannerSectionInWorkspace("month", "timesheet-activity-setup"),
      },
      {
        id: "leave-options",
        label: "Non-working leave activity",
        ready: plannerActiveNonWorkingOptionCount > 0,
        detail:
          plannerActiveNonWorkingOptionCount > 0
            ? `${plannerActiveNonWorkingOptionCount} non-working option(s)`
            : "Add at least one non-working or leave activity option.",
        actionLabel: "Open Activity Setup",
        onClick: () => openPlannerSectionInWorkspace("leave", "timesheet-activity-setup"),
      },
      {
        id: "templates",
        label: "Reusable day templates",
        ready: plannerActiveTemplateCount > 0,
        detail:
          plannerActiveTemplateCount > 0
            ? `${plannerActiveTemplateCount} active template(s)`
            : "Create at least one reusable day template.",
        actionLabel: "Open Templates",
        onClick: () => openPlannerSectionInWorkspace("month", "timesheet-templates"),
      },
      {
        id: "default-template",
        label: "Default weekday template",
        ready: plannerProfileHasDefaultWeekdayTemplate,
        detail: plannerProfileHasDefaultWeekdayTemplate
          ? plannerDefaultWeekdayTemplateLabel
          : "Set a Mon-Thu default template in Timesheet Profile.",
        actionLabel: "Open Profile",
        onClick: () => {
          handleSetPlannerWorkspace("month");
          scrollPlannerSectionIntoView("timesheet-profile", { persistQuery: true });
        },
      },
      {
        id: "holiday-calendar",
        label: "Holiday calendar",
        ready: plannerHolidayCount > 0,
        detail:
          plannerHolidayCount > 0
            ? `${plannerHolidayCount} holiday/shutdown date(s) loaded`
            : "Add public holidays or shutdown dates to Timesheet Holidays.",
        actionLabel: "Open Holidays",
        onClick: () => openPlannerSectionInWorkspace("leave", "timesheet-holidays"),
      },
      {
        id: "department-rules",
        label: "Department coverage rules",
        ready: !isTimesheetReviewAdmin || plannerDepartmentCoverageRuleCount > 0,
        detail: !isTimesheetReviewAdmin
          ? "Admin-only setup"
          : plannerDepartmentCoverageRuleCount > 0
            ? `${plannerDepartmentCoverageRuleCount} department rule(s) configured`
            : "Add department coverage rules for leave impact checks.",
        actionLabel: isTimesheetReviewAdmin ? "Open Dept Rules" : "Admin Only",
        onClick: () => openPlannerSectionInWorkspace("review", "timesheet-department-rules"),
      },
    ],
    [
      handleSetPlannerWorkspace,
      isTimesheetReviewAdmin,
      openPlannerSectionInWorkspace,
      plannerActiveNonWorkingOptionCount,
      plannerActiveTemplateCount,
      plannerActiveWorkingOptionCount,
      plannerDefaultWeekdayTemplateLabel,
      plannerDepartmentCoverageRuleCount,
      plannerHolidayCount,
      plannerProfileDepartment,
      plannerProfileHasDefaultWeekdayTemplate,
      plannerProfilePersonalLeaveAllowanceDays,
      plannerProfileSignatureName,
      scrollPlannerSectionIntoView,
    ]
  );
  const plannerReadinessSummary = useMemo(() => {
    const readyCount = plannerReadinessChecks.filter((item: any) => item.ready).length;
    const totalCount = plannerReadinessChecks.length;
    const missingItems = plannerReadinessChecks.filter((item: any) => !item.ready);
    return {
      readyCount,
      totalCount,
      missingItems,
      isReady: missingItems.length === 0,
    };
  }, [plannerReadinessChecks]);
  const plannerPilotReadinessChecks = useMemo(
    () => [
      {
        id: "pilot-entries",
        label: "Sample month entries",
        ready: plannerVisibleMonthEntryCount > 0,
        detail:
          plannerVisibleMonthEntryCount > 0
            ? `${plannerVisibleMonthEntryCount} saved day entr${plannerVisibleMonthEntryCount === 1 ? "y" : "ies"} in the visible month`
            : "Save at least one real day entry in the visible month.",
        actionLabel: "Open Day Editor",
        onClick: () => openPlannerSectionInWorkspace("month", "timesheet-day-editor"),
      },
      {
        id: "pilot-register",
        label: "Monthly register exercised",
        ready: plannerVisibleMonthEntryCount > 0,
        detail:
          plannerVisibleMonthEntryCount > 0
            ? `${timesheetMonthRowsCount} register row(s) available for review`
            : "Use the day editor so the monthly register has real data to review.",
        actionLabel: "Open Register",
        onClick: () => openPlannerSectionInWorkspace("month", "timesheet-register"),
      },
      {
        id: "pilot-leave",
        label: "Leave workflow exercised",
        ready: timesheetPersonalLeaveBlocks.length > 0,
        detail:
          timesheetPersonalLeaveBlocks.length > 0
            ? `${timesheetPersonalLeaveBlocks.length} leave block(s) recorded`
            : "Record at least one personal leave block to validate leave handling.",
        actionLabel: "Open Leave Register",
        onClick: () => openPlannerSectionInWorkspace("leave", "timesheet-personal-leave"),
      },
      {
        id: "pilot-submit",
        label: "Submission workflow exercised",
        ready: Boolean(plannerMonthSubmittedAt || plannerMonthReviewedAt || plannerMonthLockedAt),
        detail:
          plannerMonthSubmittedAt || plannerMonthReviewedAt
            ? "Visible month has already moved through submit/review state"
            : plannerMonthLockedAt
              ? "Visible month has been finalised and is ready for submission testing."
              : "Finalise and submit a month to validate the employee workflow.",
        actionLabel: "Open Month Status",
        onClick: () => openPlannerSectionInWorkspace("month", "timesheet-summary"),
      },
      {
        id: "pilot-admin-review",
        label: "Admin review workflow exercised",
        ready:
          !isTimesheetReviewAdmin ||
          timesheetReviewQueueRows.length > 0 ||
          plannerApprovedMonthCount > 0,
        detail: !isTimesheetReviewAdmin
          ? "Admin-only workflow"
          : timesheetReviewQueueRows.length > 0 || plannerApprovedMonthCount > 0
            ? `${timesheetReviewQueueRows.length} submitted and ${plannerApprovedMonthCount} approved/handed-off month(s) available`
            : "Submit at least one month and approve or return it as an admin.",
        actionLabel: isTimesheetReviewAdmin ? "Open Review Queue" : "Admin Only",
        onClick: () => openPlannerSectionInWorkspace("review", "timesheet-review-queue"),
      },
      {
        id: "pilot-team-leave",
        label: "Team leave visibility exercised",
        ready: !isTimesheetReviewAdmin || timesheetTeamLeaveRowsCount > 0,
        detail: !isTimesheetReviewAdmin
          ? "Admin-only workflow"
          : timesheetTeamLeaveRowsCount > 0
            ? `${timesheetTeamLeaveRowsCount} team leave row(s) available`
            : "Load or capture leave data so the admin leave views can be checked.",
        actionLabel: isTimesheetReviewAdmin ? "Open Team Leave" : "Admin Only",
        onClick: () => openPlannerSectionInWorkspace("review", "timesheet-team-leave"),
      },
    ],
    [
      isTimesheetReviewAdmin,
      openPlannerSectionInWorkspace,
      plannerApprovedMonthCount,
      plannerMonthLockedAt,
      plannerMonthReviewedAt,
      plannerMonthSubmittedAt,
      plannerVisibleMonthEntryCount,
      timesheetMonthRowsCount,
      timesheetPersonalLeaveBlocks.length,
      timesheetReviewQueueRows.length,
      timesheetTeamLeaveRowsCount,
    ]
  );
  const plannerPilotReadinessSummary = useMemo(() => {
    const readyCount = plannerPilotReadinessChecks.filter((item: any) => item.ready).length;
    const totalCount = plannerPilotReadinessChecks.length;
    const missingItems = plannerPilotReadinessChecks.filter((item: any) => !item.ready);
    return {
      readyCount,
      totalCount,
      missingItems,
      isReady: missingItems.length === 0,
    };
  }, [plannerPilotReadinessChecks]);
  const plannerPilotWalkthroughSteps = useMemo(() => {
    const lookup = new Map(
      plannerPilotReadinessChecks.map((item: any) => [item.id, item])
    );
    return [
      {
        id: "walkthrough-log-day",
        stepNumber: 1,
        ownerLabel: "Employee",
        workspaceLabel: "My Month",
        sectionLabel: "Day Editor",
        readinessId: "pilot-entries",
        fallbackLabel: "Log a real working day",
        actionLabel: "Open Day Editor",
      },
      {
        id: "walkthrough-review-register",
        stepNumber: 2,
        ownerLabel: "Employee",
        workspaceLabel: "My Month",
        sectionLabel: "Monthly Register",
        readinessId: "pilot-register",
        fallbackLabel: "Review the monthly register",
        actionLabel: "Open Register",
      },
      {
        id: "walkthrough-record-leave",
        stepNumber: 3,
        ownerLabel: "Employee",
        workspaceLabel: "Leave",
        sectionLabel: "Personal Leave Register",
        readinessId: "pilot-leave",
        fallbackLabel: "Record a leave block",
        actionLabel: "Open Leave Register",
      },
      {
        id: "walkthrough-submit-month",
        stepNumber: 4,
        ownerLabel: "Employee",
        workspaceLabel: "My Month",
        sectionLabel: "Month Status",
        readinessId: "pilot-submit",
        fallbackLabel: "Finalise and submit a month",
        actionLabel: "Open Month Status",
      },
      {
        id: "walkthrough-admin-review",
        stepNumber: 5,
        ownerLabel: "Admin",
        workspaceLabel: "Team Review",
        sectionLabel: "Review Queue",
        readinessId: "pilot-admin-review",
        fallbackLabel: "Approve or return a submitted month",
        actionLabel: isTimesheetReviewAdmin ? "Open Review Queue" : "Admin Only",
      },
      {
        id: "walkthrough-admin-leave",
        stepNumber: 6,
        ownerLabel: "Admin",
        workspaceLabel: "Team Review",
        sectionLabel: "Team Leave",
        readinessId: "pilot-team-leave",
        fallbackLabel: "Check the team leave views",
        actionLabel: isTimesheetReviewAdmin ? "Open Team Leave" : "Admin Only",
      },
    ].map((step) => {
      const readinessItem = lookup.get(step.readinessId);
      return {
        ...step,
        ready: readinessItem?.ready ?? false,
        detail: readinessItem?.detail ?? step.fallbackLabel,
        onClick: readinessItem?.onClick,
        isAdminOnly: step.ownerLabel === "Admin",
      };
    });
  }, [isTimesheetReviewAdmin, plannerPilotReadinessChecks]);
  const plannerPilotWalkthroughSummary = useMemo(() => {
    const completedSteps = plannerPilotWalkthroughSteps.filter((step: any) => step.ready).length;
    const totalSteps = plannerPilotWalkthroughSteps.length;
    const nextOpenStep =
      plannerPilotWalkthroughSteps.find(
        (step: any) => !step.ready && (!step.isAdminOnly || isTimesheetReviewAdmin)
      ) ?? null;
    const nextAdminStep =
      plannerPilotWalkthroughSteps.find((step: any) => !step.ready && step.isAdminOnly) ?? null;
    return {
      completedSteps,
      totalSteps,
      nextOpenStep,
      nextAdminStep,
      isReady: completedSteps === totalSteps,
    };
  }, [isTimesheetReviewAdmin, plannerPilotWalkthroughSteps]);
  const plannerRolloutQueue = useMemo(() => {
    const setupTasks = plannerReadinessSummary.missingItems.map((item: any, index: number) => ({
      id: `setup-${item.id}`,
      typeLabel: "Setup",
      ownerLabel: item.id === "department-rules" ? "Admin" : "Employee",
      priority: index === 0 ? "primary" : "normal",
      label: item.label,
      detail: item.detail,
      actionLabel: item.actionLabel,
      onClick: item.onClick,
      disabled: item.id === "department-rules" && !isTimesheetReviewAdmin,
    }));
    const pilotTasks = plannerPilotWalkthroughSteps
      .filter((step: any) => !step.ready)
      .map((step: any, index: number) => ({
        id: `pilot-${step.id}`,
        typeLabel: "Pilot",
        ownerLabel: step.ownerLabel,
        priority: setupTasks.length === 0 && index === 0 ? "primary" : "normal",
        label: `Step ${step.stepNumber}: ${step.fallbackLabel}`,
        detail: step.detail,
        actionLabel: step.actionLabel,
        onClick: step.onClick,
        disabled: step.isAdminOnly && !isTimesheetReviewAdmin,
      }));
    return [...setupTasks, ...pilotTasks];
  }, [
    isTimesheetReviewAdmin,
    plannerPilotWalkthroughSteps,
    plannerReadinessSummary.missingItems,
  ]);
  const plannerRolloutOwnerLanes = useMemo(() => {
    return [
      {
        id: "employee",
        label: "Employee Lane",
        ownerLabel: "Employee",
        tasks: plannerRolloutQueue.filter((task: any) => task.ownerLabel === "Employee"),
      },
      {
        id: "admin",
        label: "Admin Lane",
        ownerLabel: "Admin",
        tasks: plannerRolloutQueue.filter((task: any) => task.ownerLabel === "Admin"),
      },
    ].map((lane) => {
      const setupCount = lane.tasks.filter((task: any) => task.typeLabel === "Setup").length;
      const pilotCount = lane.tasks.filter((task: any) => task.typeLabel === "Pilot").length;
      const nextTask = lane.tasks[0] ?? null;
      return {
        ...lane,
        setupCount,
        pilotCount,
        nextTask,
        snapshotText: buildPlannerRolloutSnapshotText(lane.label, lane.tasks),
      };
    });
  }, [buildPlannerRolloutSnapshotText, plannerRolloutQueue]);
  const plannerRolloutOwnerGate = useMemo(() => {
    return plannerRolloutOwnerLanes.map((lane: any) => {
      const isReady = lane.tasks.length === 0;
      const primarySetupTask = lane.tasks.find((task: any) => task.typeLabel === "Setup") ?? null;
      const primaryPilotTask = lane.tasks.find((task: any) => task.typeLabel === "Pilot") ?? null;
      const blockerText = lane.tasks.slice(0, 3).map((task: any) => task.label);
      const snapshotLines = [
        `${lane.label} Rollout Gate`,
        `State: ${isReady ? "Ready" : "Open"}`,
        `Open actions: ${lane.tasks.length}`,
        `Setup actions: ${lane.setupCount}`,
        `Pilot actions: ${lane.pilotCount}`,
        `Primary setup action: ${primarySetupTask?.label || "None"}`,
        `Primary pilot action: ${primaryPilotTask?.label || "None"}`,
      ];
      if (blockerText.length > 0) {
        snapshotLines.push("Current blockers:");
        blockerText.forEach((item: string) => snapshotLines.push(`- ${item}`));
      } else {
        snapshotLines.push("Current blockers: none");
      }
      return {
        ...lane,
        isReady,
        primarySetupTask,
        primaryPilotTask,
        blockerText,
        snapshotText: snapshotLines.join("\n"),
      };
    });
  }, [plannerRolloutOwnerLanes]);
  const plannerRolloutCoordinationGate = useMemo(() => {
    const openLanes = plannerRolloutOwnerGate.filter((lane: any) => !lane.isReady);
    const nextLane = openLanes[0] ?? null;
    const stateLabel =
      openLanes.length === 0
        ? "All owner lanes ready"
        : openLanes.length === 1
          ? `Waiting on ${openLanes[0]?.ownerLabel}`
          : "Waiting on employee and admin";
    const snapshotLines = [
      "Planner Rollout Coordination Gate",
      `State: ${stateLabel}`,
      `Employee lane: ${plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee")?.isReady ? "Ready" : "Open"}`,
      `Admin lane: ${plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin")?.isReady ? "Ready" : "Open"}`,
      `Next owner: ${nextLane?.ownerLabel || "None"}`,
    ];
    if (openLanes.length > 0) {
      snapshotLines.push("Open owner gates:");
      openLanes.forEach((lane: any) =>
        snapshotLines.push(`- ${lane.label}: ${lane.nextTask?.label || "Open actions remain"}`)
      );
    } else {
      snapshotLines.push("Open owner gates: none");
    }
    return {
      isReady: openLanes.length === 0,
      openLanes,
      nextLane,
      stateLabel,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutOwnerGate]);
  const plannerGoLiveGate = useMemo(() => {
    const setupReady = plannerReadinessSummary.isReady;
    const pilotReady = plannerPilotWalkthroughSummary.isReady;
    const nextSetupItem = plannerReadinessSummary.missingItems[0] ?? null;
    const nextPilotStep = plannerPilotWalkthroughSummary.nextOpenStep;
    const blockedByAdminOnly =
      !isTimesheetReviewAdmin && !plannerPilotWalkthroughSummary.isReady
        ? plannerPilotWalkthroughSummary.nextAdminStep
        : null;
    const blockers: string[] = [];
    if (!setupReady) {
      blockers.push(
        `${plannerReadinessSummary.missingItems.length} setup item${plannerReadinessSummary.missingItems.length === 1 ? "" : "s"} still missing`
      );
    }
    if (!pilotReady) {
      if (nextPilotStep) {
        blockers.push(`Pilot walkthrough is still open from step ${nextPilotStep.stepNumber}`);
      } else if (blockedByAdminOnly) {
        blockers.push(
          `Waiting on admin step ${blockedByAdminOnly.stepNumber} to complete pilot coverage`
        );
      }
    }
    return {
      isReady: setupReady && pilotReady,
      setupReady,
      pilotReady,
      nextSetupItem,
      nextPilotStep,
      blockedByAdminOnly,
      blockers,
    };
  }, [
    isTimesheetReviewAdmin,
    plannerPilotWalkthroughSummary,
    plannerReadinessSummary,
  ]);
  const plannerLaunchSignoffItems = useMemo(() => {
    const employeeSteps = plannerPilotWalkthroughSteps.filter(
      (step: any) => step.ownerLabel === "Employee"
    );
    const adminSteps = plannerPilotWalkthroughSteps.filter((step: any) => step.ownerLabel === "Admin");
    const employeePilotReady = employeeSteps.length > 0 && employeeSteps.every((step: any) => step.ready);
    const adminPilotReady = adminSteps.length > 0 && adminSteps.every((step: any) => step.ready);
    const nextEmployeeStep = employeeSteps.find((step: any) => !step.ready) ?? null;
    const nextAdminStep = adminSteps.find((step: any) => !step.ready) ?? null;
    return [
      {
        id: "setup-reviewed" as const,
        label: "Setup reviewed against the live planner configuration",
        detail: plannerReadinessSummary.isReady
          ? "Configuration, templates, holidays, and core planner setup have been checked."
          : `${plannerReadinessSummary.missingItems.length} setup item(s) still need to be completed first.`,
        checked: plannerLaunchSignoff["setup-reviewed"],
        prerequisiteMet: plannerReadinessSummary.isReady,
        actionLabel: plannerGoLiveGate.nextSetupItem?.actionLabel || "Open Setup",
        onClick:
          plannerGoLiveGate.nextSetupItem?.onClick ||
          (() => {
            handleSetPlannerWorkspace("all");
          }),
        disabled: plannerGoLiveGate.nextSetupItem?.id === "department-rules" && !isTimesheetReviewAdmin,
      },
      {
        id: "employee-flow-reviewed" as const,
        label: "Employee month flow verified end to end",
        detail: employeePilotReady
          ? "A real employee path has been exercised from daily logging through submission."
          : `${employeeSteps.filter((step: any) => !step.ready).length} employee pilot step(s) still need coverage.`,
        checked: plannerLaunchSignoff["employee-flow-reviewed"],
        prerequisiteMet: employeePilotReady,
        actionLabel: nextEmployeeStep?.actionLabel || "Open My Month",
        onClick:
          nextEmployeeStep?.onClick ||
          (() => {
            handleSetPlannerWorkspace("month");
          }),
        disabled: false,
      },
      {
        id: "admin-flow-reviewed" as const,
        label: "Admin review flow verified end to end",
        detail: adminPilotReady
          ? "Admin review, approval, and team review views have been checked."
          : `${adminSteps.filter((step: any) => !step.ready).length} admin pilot step(s) still need coverage.`,
        checked: plannerLaunchSignoff["admin-flow-reviewed"],
        prerequisiteMet: adminPilotReady,
        actionLabel: nextAdminStep?.actionLabel || "Open Team Review",
        onClick:
          nextAdminStep?.onClick ||
          (() => {
            handleSetPlannerWorkspace("review");
          }),
        disabled: nextAdminStep?.isAdminOnly === true && !isTimesheetReviewAdmin,
      },
      {
        id: "export-checked" as const,
        label: "Export output checked against the real monthly process",
        detail: plannerGoLiveGate.isReady
          ? "Confirm the exported workbook matches the real admin or payroll handoff."
          : "Complete the setup and pilot gate first, then validate the exported output.",
        checked: plannerLaunchSignoff["export-checked"],
        prerequisiteMet: plannerGoLiveGate.isReady,
        actionLabel: "Open My Month",
        onClick: () => {
          handleSetPlannerWorkspace("month");
        },
        disabled: false,
      },
      {
        id: "leave-checked" as const,
        label: "Leave and coverage views checked for real use",
        detail: plannerGoLiveGate.isReady
          ? "Confirm personal leave, team leave, and coverage views are acceptable for rollout."
          : "Complete the setup and pilot gate first, then check leave and coverage behaviour.",
        checked: plannerLaunchSignoff["leave-checked"],
        prerequisiteMet: plannerGoLiveGate.isReady,
        actionLabel: isTimesheetReviewAdmin ? "Open Team Leave" : "Open Leave",
        onClick: () => {
          handleSetPlannerWorkspace(isTimesheetReviewAdmin ? "review" : "leave");
        },
        disabled: false,
      },
    ].map((item) => ({
      ...item,
      stateLabel: item.checked ? "Signed off" : item.prerequisiteMet ? "Open" : "Blocked",
    }));
  }, [
    handleSetPlannerWorkspace,
    isTimesheetReviewAdmin,
    plannerGoLiveGate,
    plannerLaunchSignoff,
    plannerPilotWalkthroughSteps,
    plannerReadinessSummary,
  ]);
  const plannerLaunchSignoffSummary = useMemo(() => {
    const signedOffCount = plannerLaunchSignoffItems.filter((item: any) => item.checked).length;
    const openItems = plannerLaunchSignoffItems.filter((item: any) => !item.checked);
    const blockers = [
      ...(!plannerGoLiveGate.isReady ? plannerGoLiveGate.blockers : []),
      ...openItems.map((item: any) =>
        item.prerequisiteMet ? `Sign-off still open: ${item.label}` : `Sign-off blocked: ${item.label}`
      ),
    ];
    const lines = [
      "Planner Launch Sign-Off",
      `Verdict: ${plannerGoLiveGate.isReady && openItems.length === 0 ? "Ready for Go-Live" : "Go-Live Blocked"}`,
      `Signed off: ${signedOffCount}/${plannerLaunchSignoffItems.length}`,
      `Gate: ${plannerGoLiveGate.isReady ? "Ready" : "Open"}`,
      ...(blockers.length === 0
        ? ["Blockers: none"]
        : ["Blockers:", ...blockers.map((blocker) => `- ${blocker}`)]),
    ];
    return {
      isReady: plannerGoLiveGate.isReady && openItems.length === 0,
      signedOffCount,
      totalCount: plannerLaunchSignoffItems.length,
      nextOpenItem: openItems[0] ?? null,
      blockers,
      snapshotText: lines.join("\n"),
    };
  }, [plannerGoLiveGate, plannerLaunchSignoffItems]);
  const plannerGoLiveSnapshotText = useMemo(() => {
    return buildPlannerGoLiveSnapshotText({
      plannerGoLiveGate,
      plannerLaunchSignoffSummary,
      plannerPilotWalkthroughSummary,
      plannerReadinessSummary,
    });
  }, [
    plannerGoLiveGate,
    plannerLaunchSignoffSummary.isReady,
    plannerLaunchSignoffSummary.signedOffCount,
    plannerLaunchSignoffSummary.totalCount,
    plannerPilotWalkthroughSummary.completedSteps,
    plannerPilotWalkthroughSummary.totalSteps,
    plannerReadinessSummary.readyCount,
    plannerReadinessSummary.totalCount,
  ]);
  const copyPlannerGoLiveSnapshot = async () =>
    copyPlannerText(
      plannerGoLiveSnapshotText,
      "Planner rollout snapshot copied.",
      "Could not copy the planner rollout snapshot."
    );
  const copyPlannerLaunchSignoffSnapshot = async () =>
    copyPlannerText(
      plannerLaunchSignoffSummary.snapshotText,
      "Planner launch sign-off copied.",
      "Could not copy the planner launch sign-off."
    );
  return (
    <>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">
                        Planner Pilot Readiness
                      </div>
                      <div className="text-xs text-muted-foreground">
                        This checks whether the planner workflow has actually been used, not just configured.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={plannerPilotReadinessSummary.isReady ? "secondary" : "outline"}
                        >
                          {plannerPilotReadinessSummary.readyCount}/{plannerPilotReadinessSummary.totalCount} complete
                        </Badge>
                        {plannerPilotReadinessSummary.isReady ? (
                          <Badge variant="secondary">Pilot flow covered</Badge>
                        ) : (
                          <Badge variant="outline">
                            {plannerPilotReadinessSummary.missingItems.length} pilot step(s) still open
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 lg:min-w-[460px]">
                      {plannerPilotReadinessChecks.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.detail}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={item.ready ? "secondary" : "outline"}>
                              {item.ready ? "Done" : "Open"}
                            </Badge>
                            {!item.ready ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={item.onClick}
                                disabled={
                                  (item.id === "pilot-admin-review" ||
                                    item.id === "pilot-team-leave") &&
                                  !isTimesheetReviewAdmin
                                }
                              >
                                {item.actionLabel}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-slate-900">
                          Planner Pilot Walkthrough
                        </div>
                        <div className="text-xs text-muted-foreground">
                          This is the actual pilot sequence to run through before rollout.
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              plannerPilotWalkthroughSummary.isReady ? "secondary" : "outline"
                            }
                          >
                            {plannerPilotWalkthroughSummary.completedSteps}/
                            {plannerPilotWalkthroughSummary.totalSteps} steps covered
                          </Badge>
                          {plannerPilotWalkthroughSummary.nextOpenStep ? (
                            <Badge variant="outline">
                              Next: Step {plannerPilotWalkthroughSummary.nextOpenStep.stepNumber}
                            </Badge>
                          ) : plannerPilotWalkthroughSummary.nextAdminStep &&
                            !isTimesheetReviewAdmin ? (
                            <Badge variant="outline">
                              Waiting on admin step {plannerPilotWalkthroughSummary.nextAdminStep.stepNumber}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pilot path complete</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {plannerPilotWalkthroughSummary.nextOpenStep ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={plannerPilotWalkthroughSummary.nextOpenStep.onClick}
                          >
                            {plannerPilotWalkthroughSummary.nextOpenStep.actionLabel}
                          </Button>
                        ) : plannerPilotWalkthroughSummary.nextAdminStep &&
                          !isTimesheetReviewAdmin ? (
                          <Button type="button" size="sm" variant="outline" disabled>
                            Admin Step Pending
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {plannerPilotWalkthroughSteps.map((step) => (
                        <div
                          key={step.id}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={step.ready ? "secondary" : "outline"}>
                                Step {step.stepNumber}
                              </Badge>
                              <Badge variant="outline">{step.ownerLabel}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {step.workspaceLabel} / {step.sectionLabel}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-slate-900">
                              {step.fallbackLabel}
                            </div>
                            <div className="text-xs text-muted-foreground">{step.detail}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={step.ready ? "secondary" : "outline"}>
                              {step.ready ? "Done" : "Open"}
                            </Badge>
                            {!step.ready ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={step.onClick}
                                disabled={step.isAdminOnly && !isTimesheetReviewAdmin}
                              >
                                {step.actionLabel}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Planner Go-Live Gate</div>
                      <div className="text-xs text-muted-foreground">
                        This is the single planner rollout decision: setup complete and pilot path covered.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={plannerGoLiveGate.isReady ? "secondary" : "outline"}>
                          {plannerGoLiveGate.isReady ? "Pilot-ready" : "Not ready yet"}
                        </Badge>
                        <Badge
                          variant={plannerGoLiveGate.setupReady ? "secondary" : "outline"}
                        >
                          Setup {plannerGoLiveGate.setupReady ? "ready" : "open"}
                        </Badge>
                        <Badge
                          variant={plannerGoLiveGate.pilotReady ? "secondary" : "outline"}
                        >
                          Pilot {plannerGoLiveGate.pilotReady ? "covered" : "open"}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {plannerGoLiveGate.blockers.length === 0 ? (
                          <div className="text-xs text-emerald-700">
                            No planner rollout blockers remain in this gate.
                          </div>
                        ) : (
                          plannerGoLiveGate.blockers.map((blocker: string) => (
                            <div key={blocker} className="text-xs text-muted-foreground">
                              - {blocker}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 lg:min-w-[420px]">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={copyPlannerGoLiveSnapshot}
                        >
                          Copy Rollout Snapshot
                        </Button>
                        {plannerGoLiveGate.nextSetupItem ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={plannerGoLiveGate.nextSetupItem.onClick}
                            disabled={
                              plannerGoLiveGate.nextSetupItem.id === "department-rules" &&
                              !isTimesheetReviewAdmin
                            }
                          >
                            Open Setup Blocker
                          </Button>
                        ) : null}
                        {plannerGoLiveGate.nextPilotStep ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={plannerGoLiveGate.nextPilotStep.onClick}
                          >
                            Open Pilot Blocker
                          </Button>
                        ) : null}
                      </div>
                      <div className="rounded-lg border bg-white p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Primary Setup Action
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {plannerGoLiveGate.nextSetupItem?.label || "No open setup action"}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {plannerGoLiveGate.nextSetupItem?.detail ||
                            "The planner setup checklist is complete."}
                        </div>
                        {plannerGoLiveGate.nextSetupItem ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={plannerGoLiveGate.nextSetupItem.onClick}
                            disabled={
                              plannerGoLiveGate.nextSetupItem.id === "department-rules" &&
                              !isTimesheetReviewAdmin
                            }
                          >
                            {plannerGoLiveGate.nextSetupItem.actionLabel}
                          </Button>
                        ) : null}
                      </div>
                      <div className="rounded-lg border bg-white p-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Primary Pilot Action
                        </div>
                        <div className="mt-1 text-sm font-medium text-slate-900">
                          {plannerGoLiveGate.nextPilotStep?.fallbackLabel ||
                            (plannerGoLiveGate.blockedByAdminOnly
                              ? plannerGoLiveGate.blockedByAdminOnly.fallbackLabel
                              : "No open pilot action")}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {plannerGoLiveGate.nextPilotStep?.detail ||
                            (plannerGoLiveGate.blockedByAdminOnly
                              ? "This remaining pilot step needs an admin account."
                              : "The pilot walkthrough is fully covered.")}
                        </div>
                        {plannerGoLiveGate.nextPilotStep ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={plannerGoLiveGate.nextPilotStep.onClick}
                          >
                            {plannerGoLiveGate.nextPilotStep.actionLabel}
                          </Button>
                        ) : plannerGoLiveGate.blockedByAdminOnly ? (
                          <Button type="button" size="sm" variant="outline" className="mt-3" disabled>
                            Admin Step Pending
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-slate-900">
                          Planner Launch Sign-Off
                        </div>
                        <div className="text-xs text-muted-foreground">
                          This is the final planner release check: the gate must be ready and the manual rollout sign-offs must be completed.
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={plannerLaunchSignoffSummary.isReady ? "secondary" : "outline"}
                          >
                            {plannerLaunchSignoffSummary.isReady
                              ? "Ready for Go-Live"
                              : "Go-Live Blocked"}
                          </Badge>
                          <Badge variant="outline">
                            Signed off {plannerLaunchSignoffSummary.signedOffCount}/
                            {plannerLaunchSignoffSummary.totalCount}
                          </Badge>
                          <Badge variant={plannerGoLiveGate.isReady ? "secondary" : "outline"}>
                            Gate {plannerGoLiveGate.isReady ? "ready" : "open"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={copyPlannerLaunchSignoffSnapshot}
                        >
                          Copy Launch Verdict
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={resetPlannerLaunchSignoff}
                        >
                          Reset Sign-Off
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-white p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Current Blockers
                      </div>
                      <div className="mt-2 space-y-1">
                        {plannerLaunchSignoffSummary.blockers.length === 0 ? (
                          <div className="text-xs text-emerald-700">
                            No planner launch blockers remain.
                          </div>
                        ) : (
                          plannerLaunchSignoffSummary.blockers.map((blocker: string) => (
                            <div key={blocker} className="text-xs text-muted-foreground">
                              - {blocker}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {plannerLaunchSignoffItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-slate-900">{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.detail}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              variant={
                                item.checked
                                  ? "secondary"
                                  : item.prerequisiteMet
                                    ? "outline"
                                    : "destructive"
                              }
                            >
                              {item.stateLabel}
                            </Badge>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={item.onClick}
                                disabled={item.disabled}
                              >
                                {item.actionLabel}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={item.checked ? "outline" : "default"}
                                onClick={() => setPlannerLaunchSignoffItem(item.id, !item.checked)}
                                disabled={!item.checked && (!item.prerequisiteMet || item.disabled)}
                              >
                                {item.checked ? "Undo" : "Sign Off"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">
                        Planner Readiness Check
                      </div>
                      <div className="text-xs text-muted-foreground">
                        This is the practical setup checklist for using the planner reliably in
                        production.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={plannerReadinessSummary.isReady ? "secondary" : "outline"}
                        >
                          {plannerReadinessSummary.readyCount}/{plannerReadinessSummary.totalCount} ready
                        </Badge>
                        {plannerReadinessSummary.isReady ? (
                          <Badge variant="secondary">Planner setup complete</Badge>
                        ) : (
                          <Badge variant="outline">
                            {plannerReadinessSummary.missingItems.length} setup item(s) still missing
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 lg:min-w-[460px]">
                      {plannerReadinessChecks.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.label}</div>
                            <div className="text-xs text-muted-foreground">{item.detail}</div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={item.ready ? "secondary" : "outline"}>
                              {item.ready ? "Ready" : "Missing"}
                            </Badge>
                            {!item.ready ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={item.onClick}
                                disabled={
                                  item.id === "department-rules" && !isTimesheetReviewAdmin
                                }
                              >
                                {item.actionLabel}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
    </>
  );
}
