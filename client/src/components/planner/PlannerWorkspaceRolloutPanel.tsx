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
import { Suspense, lazy, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

const PlannerWorkspaceRolloutReadinessPanel = lazy(() =>
  import("@/components/planner/PlannerWorkspaceRolloutReadinessPanel").then((module) => ({
    default: module.PlannerWorkspaceRolloutReadinessPanel,
  }))
);

const PlannerWorkspaceRolloutQueuePanel = lazy(() =>
  import("@/components/planner/PlannerWorkspaceRolloutQueuePanel").then((module) => ({
    default: module.PlannerWorkspaceRolloutQueuePanel,
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
type PlannerWorkspaceRolloutPanelProps = {
  PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY: string;
  PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY: string;
  plannerWorkspaceRolloutResetVersion: number;
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

export function PlannerWorkspaceRolloutPanel({
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
}: any) {
  const [plannerLaunchSignoff, setPlannerLaunchSignoff] = useState<PlannerLaunchSignoffState>({
    "setup-reviewed": false,
    "employee-flow-reviewed": false,
    "admin-flow-reviewed": false,
    "export-checked": false,
    "leave-checked": false,
  });
  const [plannerRolloutQueueFilter, setPlannerRolloutQueueFilter] = useState<
    "all" | "employee" | "admin" | "setup" | "pilot"
  >("all");
  const [plannerRolloutPhaseFilter, setPlannerRolloutPhaseFilter] = useState<
    "current" | "setup" | "pilot" | "employee" | "admin" | "go-live"
  >("current");
  const [plannerRolloutPhaseNotes, setPlannerRolloutPhaseNotes] =
    useState<PlannerRolloutPhaseNotesState>({});
  const [plannerRolloutPhaseNotesFilter, setPlannerRolloutPhaseNotesFilter] = useState<
    "all" | "missing" | "stale" | "noted" | "current"
  >("all");
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
    setPlannerRolloutPhaseNotes({});
    resetPlannerLaunchSignoff();
  }, [plannerWorkspaceRolloutResetVersion]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const rolloutPhaseNotesRaw = window.localStorage.getItem(
        PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY
      );
      if (rolloutPhaseNotesRaw) {
        const parsedRolloutPhaseNotes = JSON.parse(
          rolloutPhaseNotesRaw
        ) as PlannerRolloutPhaseNotesState;
        if (parsedRolloutPhaseNotes && typeof parsedRolloutPhaseNotes === "object") {
          setPlannerRolloutPhaseNotes(
            Object.fromEntries(
              Object.entries(parsedRolloutPhaseNotes).filter(
                ([phaseId, value]) =>
                  (phaseId === "setup" ||
                    phaseId === "pilot" ||
                    phaseId === "employee" ||
                    phaseId === "admin" ||
                    phaseId === "go-live") &&
                  value &&
                  typeof value === "object" &&
                  typeof value.text === "string" &&
                  typeof value.updatedAt === "string"
              )
            ) as PlannerRolloutPhaseNotesState
          );
        }
      }
      const launchSignoffRaw = window.localStorage.getItem(PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY);
      if (launchSignoffRaw) {
        const parsedLaunchSignoff = JSON.parse(launchSignoffRaw) as Partial<
          PlannerLaunchSignoffState
        >;
        if (parsedLaunchSignoff && typeof parsedLaunchSignoff === "object") {
          setPlannerLaunchSignoff({
            "setup-reviewed": Boolean(parsedLaunchSignoff["setup-reviewed"]),
            "employee-flow-reviewed": Boolean(parsedLaunchSignoff["employee-flow-reviewed"]),
            "admin-flow-reviewed": Boolean(parsedLaunchSignoff["admin-flow-reviewed"]),
            "export-checked": Boolean(parsedLaunchSignoff["export-checked"]),
            "leave-checked": Boolean(parsedLaunchSignoff["leave-checked"]),
          });
        }
      }
    } catch {
      // Ignore invalid persisted rollout state.
    }
  }, [PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY, PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY,
        JSON.stringify(plannerRolloutPhaseNotes)
      );
      window.localStorage.setItem(
        PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY,
        JSON.stringify(plannerLaunchSignoff)
      );
    } catch {
      // Ignore local storage write failures.
    }
  }, [
    PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY,
    PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY,
    plannerLaunchSignoff,
    plannerRolloutPhaseNotes,
  ]);
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
  const copyOptionalPlannerText = async (
    text: string | null | undefined,
    missingMessage: string,
    successMessage: string,
    failureMessage: string
  ) => {
    if (!text) {
      toast.error(missingMessage);
      return;
    }
    await copyPlannerText(text, successMessage, failureMessage);
  };
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
  const copyPlannerAllRemainingActionsSnapshot = async () =>
    copyPlannerText(
      plannerRemainingActionsSnapshotText,
      "Full planner remaining actions copied.",
      "Could not copy the full planner remaining actions."
    );
  const copyPlannerRemainingActionsSnapshot = async () =>
    copyPlannerText(
      filteredPlannerRemainingActionsSnapshotText,
      "Planner remaining actions copied.",
      "Could not copy the planner remaining actions."
    );
  const copyPlannerOwnerLaneSnapshot = async (laneId: "employee" | "admin") => {
    const lane = plannerRolloutOwnerLanes.find((item: any) => item.id === laneId);
    if (!lane) {
      toast.error("Could not find that planner rollout lane.");
      return;
    }
    await copyPlannerText(
      lane.snapshotText,
      `${lane.label} copied.`,
      `Could not copy the ${lane.label.toLowerCase()}.`
    );
  };
  const copyPlannerOwnerGateSnapshot = async (laneId: "employee" | "admin") => {
    const lane = plannerRolloutOwnerGate.find((item: any) => item.id === laneId);
    if (!lane) {
      toast.error("Could not find that planner rollout gate.");
      return;
    }
    await copyPlannerText(
      lane.snapshotText,
      `${lane.label} gate copied.`,
      `Could not copy the ${lane.label.toLowerCase()} gate.`
    );
  };
  const copyPlannerRolloutCoordinationGate = async () =>
    copyPlannerText(
      plannerRolloutCoordinationGate.snapshotText,
      "Planner rollout coordination gate copied.",
      "Could not copy the planner rollout coordination gate."
    );
  const copyPlannerRolloutPhases = async () =>
    copyPlannerText(
      plannerRolloutPhases.snapshotText,
      "Planner rollout phases copied.",
      "Could not copy the planner rollout phases."
    );
  const copyPlannerCurrentRolloutPhase = async () =>
    copyOptionalPlannerText(
      plannerCurrentRolloutPhaseDetail?.snapshotText,
      "Could not find the current planner rollout phase.",
      "Current planner rollout phase copied.",
      "Could not copy the current planner rollout phase."
    );
  const copyPlannerSelectedRolloutPhase = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseDetail?.snapshotText,
      "Could not find that planner rollout phase queue.",
      "Planner rollout phase queue copied.",
      "Could not copy the planner rollout phase queue."
    );
  const copyPlannerSelectedRolloutPhaseGate = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseGate?.snapshotText,
      "Could not find that planner rollout phase gate.",
      "Planner rollout phase gate copied.",
      "Could not copy the planner rollout phase gate."
    );
  const copyPlannerSelectedRolloutPhaseTransition = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseTransition?.snapshotText,
      "Could not find that planner rollout phase transition.",
      "Planner rollout phase transition copied.",
      "Could not copy the planner rollout phase transition."
    );
  const copyPlannerSelectedRolloutPhaseEntryCriteria = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseEntryCriteria?.snapshotText,
      "Could not find that planner rollout phase entry criteria.",
      "Planner rollout phase entry criteria copied.",
      "Could not copy the planner rollout phase entry criteria."
    );
  const copyPlannerSelectedRolloutPhaseReadinessSummary = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseReadinessSummary?.snapshotText,
      "Could not find that planner rollout phase readiness summary.",
      "Planner rollout phase readiness summary copied.",
      "Could not copy the planner rollout phase readiness summary."
    );
  const copyPlannerSelectedRolloutPhaseActionList = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseActionList?.snapshotText,
      "Could not find that planner rollout phase action list.",
      "Planner rollout phase action list copied.",
      "Could not copy the planner rollout phase action list."
    );
  const copyPlannerSelectedRolloutPhaseHandoffPack = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseHandoffPack?.snapshotText,
      "Could not find that planner rollout phase handoff pack.",
      "Planner rollout phase handoff pack copied.",
      "Could not copy the planner rollout phase handoff pack."
    );
  const copyPlannerSelectedRolloutPhaseExitCriteria = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseExitCriteria?.snapshotText,
      "Could not find that planner rollout phase exit criteria.",
      "Planner rollout phase exit criteria copied.",
      "Could not copy the planner rollout phase exit criteria."
    );
  const copyPlannerSelectedRolloutPhaseNote = async () =>
    copyOptionalPlannerText(
      plannerSelectedRolloutPhaseNote?.snapshotText,
      "Could not find that planner rollout phase note.",
      "Planner rollout phase note copied.",
      "Could not copy the planner rollout phase note."
    );
  const copyPlannerRolloutPhaseNotesGate = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesGate.snapshotText,
      "Planner rollout phase notes gate copied.",
      "Could not copy the planner rollout phase notes gate."
    );
  const copyPlannerRolloutPhaseNotesQueue = async () =>
    copyPlannerText(
      filteredPlannerRolloutPhaseNotesQueue.snapshotText,
      "Planner rollout phase notes queue copied.",
      "Could not copy the planner rollout phase notes queue."
    );
  const copyPlannerRolloutPhaseNotesRegister = async () =>
    copyPlannerText(
      filteredPlannerRolloutPhaseNotesRegister.snapshotText,
      "Planner rollout phase notes register copied.",
      "Could not copy the planner rollout phase notes register."
    );
  const copyPlannerRolloutPhaseNotesScoreboard = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesScoreboard.snapshotText,
      "Planner rollout phase notes scoreboard copied.",
      "Could not copy the planner rollout phase notes scoreboard."
    );
  const copyPlannerRolloutPhaseNotesLanes = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLanes.snapshotText,
      "Planner rollout phase notes lanes copied.",
      "Could not copy the planner rollout phase notes lanes."
    );
  const copyPlannerRolloutPhaseNotesLane = async (lane: any) =>
    copyPlannerText(
      lane.snapshotText,
      `${lane.label} copied.`,
      `Could not copy the ${lane.label.toLowerCase()}.`
    );
  const copyPlannerRolloutPhaseNotesLaneQueue = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneQueue.snapshotText,
      "Planner rollout phase notes lane queue copied.",
      "Could not copy the planner rollout phase notes lane queue."
    );
  const copyPlannerRolloutPhaseNotesLaneGate = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneGate.snapshotText,
      "Planner rollout phase notes lane gate copied.",
      "Could not copy the planner rollout phase notes lane gate."
    );
  const copyPlannerRolloutPhaseNotesLaneHandoffPack = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneHandoffPack.snapshotText,
      "Planner rollout phase notes lane handoff pack copied.",
      "Could not copy the planner rollout phase notes lane handoff pack."
    );
  const copyPlannerRolloutPhaseNotesLaneTransition = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneTransition.snapshotText,
      "Planner rollout phase notes lane transition copied.",
      "Could not copy the planner rollout phase notes lane transition."
    );
  const copyPlannerRolloutPhaseNotesLaneReadinessSummary = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneReadinessSummary.snapshotText,
      "Planner rollout phase notes lane readiness summary copied.",
      "Could not copy the planner rollout phase notes lane readiness summary."
    );
  const copyPlannerRolloutPhaseNotesLaneControlSummary = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneControlSummary.snapshotText,
      "Planner rollout phase notes lane control summary copied.",
      "Could not copy the planner rollout phase notes lane control summary."
    );
  const copyPlannerRolloutPhaseNotesLaneDecision = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecision.snapshotText,
      "Planner rollout phase notes lane decision copied.",
      "Could not copy the planner rollout phase notes lane decision."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionAction = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionAction.snapshotText,
      "Planner rollout phase notes lane decision action copied.",
      "Could not copy the planner rollout phase notes lane decision action."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasis = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasis.snapshotText,
      "Planner rollout phase notes lane decision basis copied.",
      "Could not copy the planner rollout phase notes lane decision basis."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasisControl = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasisControl.snapshotText,
      "Planner rollout phase notes lane decision basis control copied.",
      "Could not copy the planner rollout phase notes lane decision basis control."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasisQueue = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasisQueue.snapshotText,
      "Planner rollout phase notes lane decision basis queue copied.",
      "Could not copy the planner rollout phase notes lane decision basis queue."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasisGate = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasisGate.snapshotText,
      "Planner rollout phase notes lane decision basis gate copied.",
      "Could not copy the planner rollout phase notes lane decision basis gate."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasisHandoffPack = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.snapshotText,
      "Planner rollout phase notes lane decision basis handoff pack copied.",
      "Could not copy the planner rollout phase notes lane decision basis handoff pack."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.snapshotText,
      "Planner rollout phase notes lane decision basis readiness summary copied.",
      "Could not copy the planner rollout phase notes lane decision basis readiness summary."
    );
  const copyPlannerRolloutPhaseNotesLaneDecisionBasisTransition = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneDecisionBasisTransition.snapshotText,
      "Planner rollout phase notes lane decision basis transition copied.",
      "Could not copy the planner rollout phase notes lane decision basis transition."
    );
  const copyPlannerRolloutPhaseNotesLaneActionList = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneActionList.snapshotText,
      "Planner rollout phase notes lane action list copied.",
      "Could not copy the planner rollout phase notes lane action list."
    );
  const copyPlannerRolloutPhaseNotesLaneEntryCriteria = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneEntryCriteria.snapshotText,
      "Planner rollout phase notes lane entry criteria copied.",
      "Could not copy the planner rollout phase notes lane entry criteria."
    );
  const copyPlannerRolloutPhaseNotesLaneExitCriteria = async () =>
    copyPlannerText(
      plannerRolloutPhaseNotesLaneExitCriteria.snapshotText,
      "Planner rollout phase notes lane exit criteria copied.",
      "Could not copy the planner rollout phase notes lane exit criteria."
    );
  const copyPlannerRolloutHandoffPack = async () =>
    copyPlannerText(
      plannerRolloutHandoffPackText,
      "Planner rollout handoff pack copied.",
      "Could not copy the planner rollout handoff pack."
    );
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
  const plannerRolloutPhaseNotesRegister = useMemo(() => {
    const employeeLaneGate =
      plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee") ?? null;
    const adminLaneGate = plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin") ?? null;
    const currentPhaseId: PlannerRolloutPhaseId = !plannerReadinessSummary.isReady
      ? "setup"
      : !plannerPilotWalkthroughSummary.isReady
        ? "pilot"
        : !(employeeLaneGate?.isReady ?? true)
          ? "employee"
          : !(adminLaneGate?.isReady ?? true)
            ? "admin"
            : "go-live";
    const rows = [
      {
        id: "setup" as PlannerRolloutPhaseId,
        label: "1. Setup Foundation",
        ready: plannerReadinessSummary.isReady,
      },
      {
        id: "pilot" as PlannerRolloutPhaseId,
        label: "2. Pilot Walkthrough",
        ready: plannerPilotWalkthroughSummary.isReady,
      },
      {
        id: "employee" as PlannerRolloutPhaseId,
        label: "3. Employee Lane Clearance",
        ready: employeeLaneGate?.isReady ?? true,
      },
      {
        id: "admin" as PlannerRolloutPhaseId,
        label: "4. Admin Lane Clearance",
        ready: adminLaneGate?.isReady ?? true,
      },
      {
        id: "go-live" as PlannerRolloutPhaseId,
        label: "5. Go-Live Decision",
        ready: plannerGoLiveGate.isReady && plannerRolloutCoordinationGate.isReady,
      },
    ].map((phase) => {
      const note = plannerRolloutPhaseNotes[phase.id as PlannerRolloutPhaseId];
      const trimmedText = note?.text?.trim() || "";
      const updatedAtDate = note?.updatedAt ? parsePlannerPanelDate(note.updatedAt) : null;
      const ageDays = updatedAtDate
        ? Math.max(
            0,
            Math.floor(
              (startOfPlannerPanelDay(new Date()).getTime() -
                startOfPlannerPanelDay(updatedAtDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : null;
      const blockerCount =
        phase.id === "setup"
          ? plannerReadinessSummary.missingItems.length
          : phase.id === "pilot"
            ? plannerPilotWalkthroughSteps.filter((step: any) => !step.ready).length
            : phase.id === "employee"
              ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee")?.tasks.length ?? 0)
              : phase.id === "admin"
                ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin")?.tasks.length ?? 0)
                : plannerGoLiveGate.blockers.length;
      const noteStatusLabel = trimmedText
        ? ageDays !== null && ageDays >= 7
          ? "Stale Note"
          : "Noted"
        : blockerCount > 0
          ? "Missing Note"
          : "Optional";
      return {
        phaseId: phase.id as PlannerRolloutPhaseId,
        phaseLabel: phase.label,
        noteText: trimmedText,
        updatedAt: note?.updatedAt || null,
        ageDays,
        blockerCount,
        noteStatusLabel,
        hasNote: Boolean(trimmedText),
        isCurrent: phase.id === currentPhaseId,
        isReady: phase.ready,
      };
    });
    const notedCount = rows.filter((row: any) => row.hasNote).length;
    const missingCount = rows.filter((row: any) => !row.hasNote && row.blockerCount > 0).length;
    const staleCount = rows.filter((row: any) => row.hasNote && (row.ageDays ?? 0) >= 7).length;
    const snapshotLines = [
      "Planner Rollout Phase Notes Register",
      `Noted phases: ${notedCount}/${rows.length}`,
      `Missing phase notes: ${missingCount}`,
      `Stale phase notes: ${staleCount}`,
      ...rows.map(
        (row: any, index: number) =>
          `${index + 1}. ${row.phaseLabel} - ${row.noteStatusLabel} - ${
            row.updatedAt ? formatPlannerDateTime(row.updatedAt) : "No saved note"
          } - Blockers: ${row.blockerCount}`
      ),
    ];
    return {
      rows,
      notedCount,
      missingCount,
      staleCount,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    formatPlannerDateTime,
    plannerGoLiveGate.blockers.length,
    plannerGoLiveGate.isReady,
    plannerPilotWalkthroughSteps,
    plannerPilotWalkthroughSummary.isReady,
    plannerReadinessSummary.missingItems.length,
    plannerReadinessSummary.isReady,
    plannerRolloutCoordinationGate.isReady,
    plannerRolloutOwnerGate,
    plannerRolloutPhaseNotes,
  ]);
  const plannerRolloutPhaseNotesGate = useMemo(() => {
    const missingRows = plannerRolloutPhaseNotesRegister.rows.filter(
      (row: any) => !row.hasNote && row.blockerCount > 0
    );
    const staleRows = plannerRolloutPhaseNotesRegister.rows.filter(
      (row: any) => row.hasNote && (row.ageDays ?? 0) >= 7
    );
    const nextRow = missingRows[0] || staleRows[0] || null;
    const isReady = missingRows.length === 0 && staleRows.length === 0;
    const stateLabel = isReady ? "Ready" : missingRows.length > 0 ? "Missing Notes" : "Stale Notes";
    const blockerLabel = nextRow
      ? `${nextRow.phaseLabel}: ${nextRow.noteStatusLabel}`
      : "All rollout phase notes are current enough for handoff.";
    const snapshotLines = [
      "Planner Rollout Phase Notes Gate",
      `State: ${stateLabel}`,
      `Missing notes: ${missingRows.length}`,
      `Stale notes: ${staleRows.length}`,
      `Next note action: ${nextRow?.phaseLabel || "None"}`,
      `Blocker: ${blockerLabel}`,
    ];
    return {
      isReady,
      stateLabel,
      missingRows,
      staleRows,
      nextRow,
      blockerLabel,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesRegister]);
  const plannerRolloutPhaseNotesQueue = useMemo(() => {
    const tasks = plannerRolloutPhaseNotesRegister.rows
      .filter((row: any) => !row.hasNote || row.noteStatusLabel === "Stale Note")
      .sort((left: any, right: any) => {
        const leftPriority = left.noteStatusLabel === "Missing Note" ? 0 : 1;
        const rightPriority = right.noteStatusLabel === "Missing Note" ? 0 : 1;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        if ((right.blockerCount || 0) !== (left.blockerCount || 0)) {
          return (right.blockerCount || 0) - (left.blockerCount || 0);
        }
        return left.phaseLabel.localeCompare(right.phaseLabel);
      })
      .map((row: any, index: number) => ({
        id: `rollout-phase-note-${row.phaseId}`,
        phaseId: row.phaseId,
        phaseLabel: row.phaseLabel,
        statusLabel: row.noteStatusLabel,
        blockerCount: row.blockerCount,
        ageDays: row.ageDays,
        detail:
          row.noteStatusLabel === "Missing Note"
            ? `${row.blockerCount} blocker(s) active and no saved phase note.`
            : `Saved note is ${row.ageDays ?? 0} day(s) old and should be refreshed.`,
        isNext: index === 0,
      }));
    const snapshotLines = [
      "Planner Rollout Phase Notes Queue",
      `Open note actions: ${tasks.length}`,
      ...(tasks.length === 0
        ? ["No missing or stale rollout notes remain."]
        : tasks.map(
            (task: any, index: number) =>
              `${index + 1}. ${task.phaseLabel} - ${task.statusLabel} - ${task.detail}`
          )),
    ];
    return {
      tasks,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesRegister]);
  const plannerRolloutPhaseNotesScoreboard = useMemo(() => {
    const total = plannerRolloutPhaseNotesRegister.rows.length;
    const noted = plannerRolloutPhaseNotesRegister.notedCount;
    const missing = plannerRolloutPhaseNotesGate.missingRows.length;
    const stale = plannerRolloutPhaseNotesGate.staleRows.length;
    const ready = total - missing - stale;
    const currentPhaseRow =
      plannerRolloutPhaseNotesRegister.rows.find((row: any) => row.isCurrent) || null;
    const cards = [
      {
        id: "overall",
        label: "Overall",
        value: `${ready}/${total}`,
        detail: total > 0 ? `${Math.round((ready / total) * 100)}% usable` : "No phases",
      },
      {
        id: "noted",
        label: "Noted",
        value: String(noted),
        detail: `${total - noted} phase(s) without saved notes`,
      },
      {
        id: "missing",
        label: "Missing",
        value: String(missing),
        detail:
          plannerRolloutPhaseNotesGate.nextRow?.noteStatusLabel === "Missing Note"
            ? plannerRolloutPhaseNotesGate.nextRow.phaseLabel
            : "No missing note blockers",
      },
      {
        id: "stale",
        label: "Stale",
        value: String(stale),
        detail:
          plannerRolloutPhaseNotesGate.nextRow?.noteStatusLabel === "Stale Note"
            ? plannerRolloutPhaseNotesGate.nextRow.phaseLabel
            : "No stale notes",
      },
      {
        id: "current",
        label: "Current Phase",
        value: currentPhaseRow?.phaseLabel || "None",
        detail: currentPhaseRow?.noteStatusLabel || "No current phase",
      },
    ];
    const snapshotLines = [
      "Planner Rollout Phase Notes Scoreboard",
      ...cards.map((card) => `${card.label}: ${card.value} - ${card.detail}`),
    ];
    return {
      cards,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesGate, plannerRolloutPhaseNotesRegister]);
  const plannerRolloutPhaseNotesLanes = useMemo(() => {
    const laneDefinitions: Array<{
      id: "foundation" | "clearance" | "decision";
      label: string;
      detail: string;
      phaseIds: PlannerRolloutPhaseId[];
    }> = [
      {
        id: "foundation",
        label: "Foundation Lane",
        detail: "Setup and pilot note coverage before owner clearance begins.",
        phaseIds: ["setup", "pilot"],
      },
      {
        id: "clearance",
        label: "Clearance Lane",
        detail: "Employee and admin note coverage for owner handoff work.",
        phaseIds: ["employee", "admin"],
      },
      {
        id: "decision",
        label: "Decision Lane",
        detail: "Go-live note coverage for final rollout sign-off.",
        phaseIds: ["go-live"],
      },
    ];
    const lanes = laneDefinitions.map((lane) => {
      const rows = plannerRolloutPhaseNotesRegister.rows.filter((row: any) =>
        lane.phaseIds.includes(row.phaseId)
      );
      const notedCount = rows.filter((row: any) => row.hasNote).length;
      const missingCount = rows.filter((row: any) => row.noteStatusLabel === "Missing Note").length;
      const staleCount = rows.filter((row: any) => row.noteStatusLabel === "Stale Note").length;
      const blockerCount = rows.reduce((sum: number, row: any) => sum + row.blockerCount, 0);
      const nextRow =
        rows.find((row: any) => row.noteStatusLabel === "Missing Note") ||
        rows.find((row: any) => row.noteStatusLabel === "Stale Note") ||
        null;
      const isCurrentLane = rows.some((row: any) => row.isCurrent);
      const stateLabel =
        missingCount > 0 ? "Missing Notes" : staleCount > 0 ? "Stale Notes" : "Ready";
      const snapshotLines = [
        `Planner Rollout Phase Notes Lane: ${lane.label}`,
        `State: ${stateLabel}`,
        `Noted: ${notedCount}/${rows.length}`,
        `Missing: ${missingCount}`,
        `Stale: ${staleCount}`,
        `Blockers: ${blockerCount}`,
        `Next note action: ${nextRow?.phaseLabel || "None"}`,
        ...rows.map(
          (row: any, index: number) =>
            `${index + 1}. ${row.phaseLabel} - ${row.noteStatusLabel} - ${
              row.updatedAt ? formatPlannerDateTime(row.updatedAt) : "No saved note"
            } - Blockers: ${row.blockerCount}`
        ),
      ];
      return {
        ...lane,
        rows,
        notedCount,
        missingCount,
        staleCount,
        blockerCount,
        nextRow,
        isCurrentLane,
        stateLabel,
        snapshotText: snapshotLines.join("\n"),
      };
    });
    const snapshotLines = [
      "Planner Rollout Phase Notes Lanes",
      ...lanes.map(
        (lane, index) =>
          `${index + 1}. ${lane.label} - ${lane.stateLabel} - Noted ${lane.notedCount}/${lane.rows.length} - Missing ${lane.missingCount} - Stale ${lane.staleCount} - Blockers ${lane.blockerCount} - Next ${lane.nextRow?.phaseLabel || "None"}`
      ),
    ];
    return {
      lanes,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [formatPlannerDateTime, plannerRolloutPhaseNotesRegister]);
  const plannerRolloutPhaseNotesLaneQueue = useMemo(() => {
    const tasks = plannerRolloutPhaseNotesLanes.lanes
      .filter((lane: any) => lane.missingCount > 0 || lane.staleCount > 0)
      .sort((left: any, right: any) => {
        const leftPriority = left.missingCount > 0 ? 0 : 1;
        const rightPriority = right.missingCount > 0 ? 0 : 1;
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority;
        }
        if (right.blockerCount !== left.blockerCount) {
          return right.blockerCount - left.blockerCount;
        }
        if (right.missingCount !== left.missingCount) {
          return right.missingCount - left.missingCount;
        }
        if (right.staleCount !== left.staleCount) {
          return right.staleCount - left.staleCount;
        }
        return left.label.localeCompare(right.label);
      })
      .map((lane: any, index: number) => ({
        id: `rollout-phase-note-lane-${lane.id}`,
        laneId: lane.id,
        laneLabel: lane.label,
        stateLabel: lane.stateLabel,
        blockerCount: lane.blockerCount,
        missingCount: lane.missingCount,
        staleCount: lane.staleCount,
        nextPhaseId: lane.nextRow?.phaseId || lane.rows[0]?.phaseId || null,
        nextPhaseLabel: lane.nextRow?.phaseLabel || lane.rows[0]?.phaseLabel || "None",
        detail:
          lane.stateLabel === "Missing Notes"
            ? `${lane.missingCount} phase note(s) missing across ${lane.label.toLowerCase()}.`
            : `${lane.staleCount} phase note(s) should be refreshed in ${lane.label.toLowerCase()}.`,
        isNext: index === 0,
      }));
    const snapshotLines = [
      "Planner Rollout Phase Notes Lane Queue",
      `Open lane actions: ${tasks.length}`,
      ...(tasks.length === 0
        ? ["No rollout note lanes need attention."]
        : tasks.map(
            (task: any, index: number) =>
              `${index + 1}. ${task.laneLabel} - ${task.stateLabel} - Missing ${task.missingCount} - Stale ${task.staleCount} - Blockers ${task.blockerCount} - Next ${task.nextPhaseLabel}`
          )),
    ];
    return {
      tasks,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesLanes]);
  const plannerRolloutPhaseNotesLaneGate = useMemo(() => {
    const nextTask = plannerRolloutPhaseNotesLaneQueue.tasks[0] || null;
    const missingLaneCount = plannerRolloutPhaseNotesLanes.lanes.filter(
      (lane: any) => lane.missingCount > 0
    ).length;
    const staleLaneCount = plannerRolloutPhaseNotesLanes.lanes.filter(
      (lane: any) => lane.staleCount > 0 && lane.missingCount === 0
    ).length;
    const isReady = plannerRolloutPhaseNotesLaneQueue.tasks.length === 0;
    const stateLabel = isReady
      ? "Ready"
      : missingLaneCount > 0
        ? "Missing Lane Notes"
        : "Stale Lane Notes";
    const blockerLabel = nextTask
      ? `${nextTask.laneLabel}: ${nextTask.stateLabel}`
      : "All rollout note lanes are current enough for handoff.";
    const snapshotLines = [
      "Planner Rollout Phase Notes Lane Gate",
      `State: ${stateLabel}`,
      `Missing lanes: ${missingLaneCount}`,
      `Stale lanes: ${staleLaneCount}`,
      `Next lane: ${nextTask?.laneLabel || "None"}`,
      `Blocker: ${blockerLabel}`,
    ];
    return {
      isReady,
      stateLabel,
      missingLaneCount,
      staleLaneCount,
      nextTask,
      blockerLabel,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesLaneQueue.tasks, plannerRolloutPhaseNotesLanes.lanes]);
  const plannerRolloutPhaseNotesLaneHandoffPack = useMemo(() => {
    const nextTask = plannerRolloutPhaseNotesLaneGate.nextTask;
    const readyLaneCount = plannerRolloutPhaseNotesLanes.lanes.filter(
      (lane: any) => lane.stateLabel === "Ready"
    ).length;
    const totalLaneCount = plannerRolloutPhaseNotesLanes.lanes.length;
    const snapshotLines = [
      "Planner Rollout Phase Notes Lane Handoff Pack",
      `Gate: ${plannerRolloutPhaseNotesLaneGate.stateLabel}`,
      `Ready lanes: ${readyLaneCount}/${totalLaneCount}`,
      `Open lane actions: ${plannerRolloutPhaseNotesLaneQueue.tasks.length}`,
      `Next lane: ${nextTask?.laneLabel || "None"}`,
      `Next phase: ${nextTask?.nextPhaseLabel || "None"}`,
      `Blocker: ${plannerRolloutPhaseNotesLaneGate.blockerLabel}`,
      "",
      plannerRolloutPhaseNotesLaneQueue.snapshotText,
    ];
    return {
      isReadyToHandoff: plannerRolloutPhaseNotesLaneGate.isReady,
      readyLaneCount,
      totalLaneCount,
      nextTask,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneGate.blockerLabel,
    plannerRolloutPhaseNotesLaneGate.isReady,
    plannerRolloutPhaseNotesLaneGate.nextTask,
    plannerRolloutPhaseNotesLaneGate.stateLabel,
    plannerRolloutPhaseNotesLaneQueue.snapshotText,
    plannerRolloutPhaseNotesLaneQueue.tasks.length,
    plannerRolloutPhaseNotesLanes.lanes,
  ]);
  const plannerRolloutPhaseNotesLaneTransition = useMemo(() => {
    const lanes = plannerRolloutPhaseNotesLanes.lanes;
    const currentIndex = lanes.findIndex((lane: any) => !lane.rows.every((row: any) => row.isReady));
    const currentLane =
      currentIndex >= 0 ? lanes[currentIndex] : lanes[lanes.length - 1] || null;
    const nextLane =
      currentIndex >= 0 && currentIndex < lanes.length - 1 ? lanes[currentIndex + 1] : null;
    const currentOpenCount =
      currentLane?.missingCount || currentLane?.staleCount
        ? (currentLane?.missingCount || 0) + (currentLane?.staleCount || 0)
        : 0;
    const nextOpenCount =
      nextLane?.missingCount || nextLane?.staleCount
        ? (nextLane?.missingCount || 0) + (nextLane?.staleCount || 0)
        : 0;
    const canAdvance =
      Boolean(currentLane) &&
      currentOpenCount === 0 &&
      (nextLane ? nextOpenCount >= 0 : true);
    const stateLabel = canAdvance ? "Advance Ready" : "Advance Blocked";
    const snapshotLines = [
      "Planner Rollout Phase Notes Lane Transition",
      `State: ${stateLabel}`,
      `Current lane: ${currentLane?.label || "None"}`,
      `Next lane: ${nextLane?.label || "None"}`,
      `Current open: ${currentOpenCount}`,
      `Next open: ${nextOpenCount}`,
    ];
    return {
      canAdvance,
      stateLabel,
      currentLane,
      nextLane,
      currentOpenCount,
      nextOpenCount,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesLanes.lanes]);
  const plannerRolloutPhaseNotesLaneReadinessSummary = useMemo(() => {
    const blockers: string[] = [];
    if (plannerRolloutPhaseNotesLaneGate.missingLaneCount > 0) {
      blockers.push(`${plannerRolloutPhaseNotesLaneGate.missingLaneCount} lane(s) still have missing notes`);
    }
    if (plannerRolloutPhaseNotesLaneGate.staleLaneCount > 0) {
      blockers.push(`${plannerRolloutPhaseNotesLaneGate.staleLaneCount} lane(s) still have stale notes`);
    }
    if (!plannerRolloutPhaseNotesLaneTransition.canAdvance) {
      blockers.push(
        `Current lane is not ready to advance: ${plannerRolloutPhaseNotesLaneTransition.currentLane?.label || "None"}`
      );
    }
    const snapshotLines = [
      "Planner Rollout Phase Notes Lane Readiness Summary",
      `Gate: ${plannerRolloutPhaseNotesLaneGate.stateLabel}`,
      `Transition: ${plannerRolloutPhaseNotesLaneTransition.stateLabel}`,
      `Ready lanes: ${plannerRolloutPhaseNotesLaneHandoffPack.readyLaneCount}/${plannerRolloutPhaseNotesLaneHandoffPack.totalLaneCount}`,
      `Open lane actions: ${plannerRolloutPhaseNotesLaneQueue.tasks.length}`,
      `Next lane: ${plannerRolloutPhaseNotesLaneGate.nextTask?.laneLabel || "None"}`,
      ...(blockers.length === 0 ? ["Blockers: none"] : blockers.map((blocker) => `Blocker: ${blocker}`)),
    ];
    return {
      gateState: plannerRolloutPhaseNotesLaneGate.stateLabel,
      transitionState: plannerRolloutPhaseNotesLaneTransition.stateLabel,
      isReady:
        plannerRolloutPhaseNotesLaneGate.isReady &&
        plannerRolloutPhaseNotesLaneTransition.canAdvance,
      blockers,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneGate.isReady,
    plannerRolloutPhaseNotesLaneGate.missingLaneCount,
    plannerRolloutPhaseNotesLaneGate.nextTask?.laneLabel,
    plannerRolloutPhaseNotesLaneGate.staleLaneCount,
    plannerRolloutPhaseNotesLaneGate.stateLabel,
    plannerRolloutPhaseNotesLaneHandoffPack.readyLaneCount,
    plannerRolloutPhaseNotesLaneHandoffPack.totalLaneCount,
    plannerRolloutPhaseNotesLaneQueue.tasks.length,
    plannerRolloutPhaseNotesLaneTransition.canAdvance,
    plannerRolloutPhaseNotesLaneTransition.currentLane?.label,
    plannerRolloutPhaseNotesLaneTransition.stateLabel,
  ]);
  const plannerRolloutPhaseNotesLaneActionList = useMemo(() => {
    const actions: PlannerRolloutActionLite[] = [];
    const nextLaneTask = plannerRolloutPhaseNotesLaneGate.nextTask;
    if (nextLaneTask) {
      actions.push({
        id: nextLaneTask.id,
        label: nextLaneTask.laneLabel,
        detail: nextLaneTask.detail,
        actionLabel: "Open Lane",
        nextPhaseId: nextLaneTask.nextPhaseId,
      });
    }
    if (
      plannerRolloutPhaseNotesLaneTransition.canAdvance &&
      plannerRolloutPhaseNotesLaneTransition.nextLane
    ) {
      actions.push({
        id: `advance-${plannerRolloutPhaseNotesLaneTransition.nextLane.label}`,
        label: `Move into ${plannerRolloutPhaseNotesLaneTransition.nextLane.label}`,
        detail: `${plannerRolloutPhaseNotesLaneTransition.nextOpenCount} note task(s) are waiting in the next lane.`,
        actionLabel: "Open Next Lane",
        nextPhaseId:
          plannerRolloutPhaseNotesLaneTransition.nextLane.nextRow?.phaseId ||
          plannerRolloutPhaseNotesLaneTransition.nextLane.rows[0]?.phaseId ||
          "current",
      });
    }
    const snapshotLines = [
      "Planner Rollout Phase Notes Lane Action List",
      `Actions: ${actions.length}`,
      ...(actions.length === 0
        ? ["No lane actions remain."]
        : actions.map(
            (action, index) =>
              `${index + 1}. ${action.label} -> ${action.actionLabel}: ${action.detail}`
          )),
    ];
    return {
      actions,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [plannerRolloutPhaseNotesLaneGate.nextTask, plannerRolloutPhaseNotesLaneTransition]);
  const plannerRolloutPhaseNotesLaneExitCriteria = useMemo(() => {
    const criteria = [
      {
        label: "Lane gate ready",
        met: plannerRolloutPhaseNotesLaneGate.isReady,
        detail: plannerRolloutPhaseNotesLaneGate.isReady
          ? "No lane note blockers remain."
          : plannerRolloutPhaseNotesLaneGate.blockerLabel,
      },
      {
        label: "No lane actions remain",
        met: plannerRolloutPhaseNotesLaneActionList.actions.length === 0,
        detail:
          plannerRolloutPhaseNotesLaneActionList.actions.length === 0
            ? "No lane action items remain open."
            : `${plannerRolloutPhaseNotesLaneActionList.actions.length} lane action(s) still open.`,
      },
      {
        label: "Lane transition ready",
        met: plannerRolloutPhaseNotesLaneTransition.canAdvance,
        detail: plannerRolloutPhaseNotesLaneTransition.canAdvance
          ? "Lane transition is clear."
          : `Current lane still blocked: ${plannerRolloutPhaseNotesLaneTransition.currentLane?.label || "None"}`,
      },
    ];
    const readyCount = criteria.filter((item) => item.met).length;
    return {
      criteria,
      readyCount,
      totalCount: criteria.length,
      isReady: readyCount === criteria.length,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Exit Criteria",
        `Ready: ${readyCount}/${criteria.length}`,
        ...criteria.map((item) => `- ${item.met ? "[Met]" : "[Open]"} ${item.label}: ${item.detail}`),
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneActionList.actions.length,
    plannerRolloutPhaseNotesLaneGate.blockerLabel,
    plannerRolloutPhaseNotesLaneGate.isReady,
    plannerRolloutPhaseNotesLaneTransition.canAdvance,
    plannerRolloutPhaseNotesLaneTransition.currentLane?.label,
  ]);
  const plannerRolloutPhaseNotesLaneEntryCriteria = useMemo(() => {
    const lanes = plannerRolloutPhaseNotesLanes.lanes;
    const targetLane =
      plannerRolloutPhaseNotesLaneTransition.nextLane ||
      plannerRolloutPhaseNotesLaneTransition.currentLane ||
      lanes[0] ||
      null;
    const criteria = [
      {
        label: "Target lane selected",
        met: Boolean(targetLane),
        detail: targetLane?.label || "No target lane is available.",
      },
      {
        label: "Target lane has rows",
        met: Boolean(targetLane?.rows.length),
        detail: targetLane?.rows.length
          ? `${targetLane.rows.length} phase note row(s) are available.`
          : "Target lane does not contain any phase rows.",
      },
      {
        label: "Previous lanes are stable",
        met: lanes
          .slice(0, Math.max(0, lanes.findIndex((lane: any) => lane.id === targetLane?.id)))
          .every((lane: any) => lane.missingCount === 0 && lane.staleCount === 0),
        detail: "Earlier lanes are clear enough to continue.",
      },
    ];
    const readyCount = criteria.filter((item) => item.met).length;
    return {
      targetLane,
      criteria,
      readyCount,
      totalCount: criteria.length,
      isReady: readyCount === criteria.length,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Entry Criteria",
        `Target lane: ${targetLane?.label || "None"}`,
        `Ready: ${readyCount}/${criteria.length}`,
        ...criteria.map((item) => `- ${item.met ? "[Met]" : "[Open]"} ${item.label}: ${item.detail}`),
      ].join("\n"),
    };
  }, [plannerRolloutPhaseNotesLanes.lanes, plannerRolloutPhaseNotesLaneTransition]);
  const plannerRolloutPhaseNotesLaneControlSummary = useMemo(() => {
    const blockers = [
      ...plannerRolloutPhaseNotesLaneReadinessSummary.blockers,
      ...plannerRolloutPhaseNotesLaneEntryCriteria.criteria
        .filter((item: any) => !item.met)
        .map((item: any) => item.detail),
      ...plannerRolloutPhaseNotesLaneExitCriteria.criteria
        .filter((item: any) => !item.met)
        .map((item: any) => item.detail),
    ];
    return {
      blockers,
      isReady:
        plannerRolloutPhaseNotesLaneEntryCriteria.isReady &&
        plannerRolloutPhaseNotesLaneExitCriteria.isReady &&
        plannerRolloutPhaseNotesLaneGate.isReady &&
        plannerRolloutPhaseNotesLaneTransition.canAdvance,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Control Summary",
        `Target lane: ${plannerRolloutPhaseNotesLaneEntryCriteria.targetLane?.label || "None"}`,
        `Entry: ${plannerRolloutPhaseNotesLaneEntryCriteria.readyCount}/${plannerRolloutPhaseNotesLaneEntryCriteria.totalCount}`,
        `Exit: ${plannerRolloutPhaseNotesLaneExitCriteria.readyCount}/${plannerRolloutPhaseNotesLaneExitCriteria.totalCount}`,
        `Gate: ${plannerRolloutPhaseNotesLaneGate.stateLabel}`,
        `Transition: ${plannerRolloutPhaseNotesLaneTransition.stateLabel}`,
        `Open lane actions: ${plannerRolloutPhaseNotesLaneActionList.actions.length}`,
        ...(blockers.length === 0 ? ["Blockers: none"] : blockers.map((blocker, index) => `Blocker ${index + 1}: ${blocker}`)),
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneActionList.actions.length,
    plannerRolloutPhaseNotesLaneEntryCriteria,
    plannerRolloutPhaseNotesLaneExitCriteria,
    plannerRolloutPhaseNotesLaneGate.isReady,
    plannerRolloutPhaseNotesLaneGate.stateLabel,
    plannerRolloutPhaseNotesLaneReadinessSummary.blockers,
    plannerRolloutPhaseNotesLaneTransition.canAdvance,
    plannerRolloutPhaseNotesLaneTransition.stateLabel,
  ]);
  const plannerRolloutPhaseNotesLaneDecision = useMemo(() => {
    const targetLane = plannerRolloutPhaseNotesLaneEntryCriteria.targetLane;
    const nextAction = plannerRolloutPhaseNotesLaneActionList.actions[0] || null;
    const stateLabel = !plannerRolloutPhaseNotesLaneEntryCriteria.isReady
      ? "Hold Start"
      : plannerRolloutPhaseNotesLaneExitCriteria.isReady &&
          plannerRolloutPhaseNotesLaneTransition.canAdvance &&
          plannerRolloutPhaseNotesLaneTransition.nextLane
        ? "Advance Lane"
        : plannerRolloutPhaseNotesLaneActionList.actions.length > 0
          ? "Clear Lane Work"
          : plannerRolloutPhaseNotesLaneControlSummary.isReady
            ? "Lane Stack Clear"
            : "Hold Current Lane";
    const detail = !plannerRolloutPhaseNotesLaneEntryCriteria.isReady
      ? plannerRolloutPhaseNotesLaneEntryCriteria.criteria.find((item: any) => !item.met)?.detail ||
        "Entry conditions are still open."
      : stateLabel === "Advance Lane"
        ? `Move into ${plannerRolloutPhaseNotesLaneTransition.nextLane?.label || "the next lane"}.`
        : stateLabel === "Clear Lane Work"
          ? nextAction?.detail || "Continue clearing lane work."
          : stateLabel === "Lane Stack Clear"
            ? "Lane stack is clear."
            : plannerRolloutPhaseNotesLaneControlSummary.blockers[0] || "Continue clearing current lane work.";
    return {
      stateLabel,
      targetLane,
      nextAction,
      detail,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision",
        `State: ${stateLabel}`,
        `Target lane: ${targetLane?.label || "None"}`,
        `Next action: ${nextAction?.label || "None"}`,
        `Detail: ${detail}`,
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneActionList.actions,
    plannerRolloutPhaseNotesLaneControlSummary.blockers,
    plannerRolloutPhaseNotesLaneControlSummary.isReady,
    plannerRolloutPhaseNotesLaneEntryCriteria,
    plannerRolloutPhaseNotesLaneExitCriteria.isReady,
    plannerRolloutPhaseNotesLaneTransition.canAdvance,
    plannerRolloutPhaseNotesLaneTransition.nextLane,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionAction = useMemo(() => {
    const nextAction = plannerRolloutPhaseNotesLaneDecision.nextAction;
    const actionLabel =
      plannerRolloutPhaseNotesLaneDecision.stateLabel === "Hold Start"
        ? "Open Entry Criteria"
        : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Advance Lane"
          ? "Open Next Lane"
          : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Clear Lane Work"
            ? nextAction?.actionLabel || "Open Current Lane"
            : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Lane Stack Clear"
              ? "Open Current Lane"
              : "Open Current Lane";
    const targetPhaseId =
      plannerRolloutPhaseNotesLaneDecision.stateLabel === "Hold Start"
        ? (plannerRolloutPhaseNotesLaneDecision.targetLane?.rows[0]?.phaseId || "current")
        : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Advance Lane"
          ? (plannerRolloutPhaseNotesLaneTransition.nextLane?.nextRow?.phaseId ||
              plannerRolloutPhaseNotesLaneTransition.nextLane?.rows[0]?.phaseId ||
              "current")
          : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Clear Lane Work"
            ? (nextAction?.nextPhaseId || "current")
            : (plannerRolloutPhaseNotesLaneDecision.targetLane?.rows[0]?.phaseId || "current");
    return {
      actionLabel,
      targetPhaseId: targetPhaseId as
        | "setup"
        | "pilot"
        | "employee"
        | "admin"
        | "go-live"
        | "current",
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Action",
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `Action: ${actionLabel}`,
        `Target phase: ${targetPhaseId}`,
        `Detail: ${plannerRolloutPhaseNotesLaneDecision.detail}`,
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.detail,
    plannerRolloutPhaseNotesLaneDecision.nextAction,
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecision.targetLane,
    plannerRolloutPhaseNotesLaneTransition.nextLane,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasis = useMemo(() => {
    const criteria =
      plannerRolloutPhaseNotesLaneDecision.stateLabel === "Hold Start"
        ? [
            {
              label: "Target lane identified",
              met: Boolean(plannerRolloutPhaseNotesLaneDecision.targetLane),
              detail:
                plannerRolloutPhaseNotesLaneDecision.targetLane?.label ||
                "No target lane is currently available.",
            },
            {
              label: "Entry criteria met",
              met: plannerRolloutPhaseNotesLaneEntryCriteria.isReady,
              detail: plannerRolloutPhaseNotesLaneEntryCriteria.isReady
                ? "Entry conditions are clear."
                : plannerRolloutPhaseNotesLaneEntryCriteria.criteria.find((item: any) => !item.met)
                    ?.detail || "Entry conditions are still open.",
            },
          ]
        : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Advance Lane"
          ? [
              {
                label: "Current lane clear",
                met: plannerRolloutPhaseNotesLaneExitCriteria.isReady,
                detail: plannerRolloutPhaseNotesLaneExitCriteria.isReady
                  ? "Exit criteria are clear."
                  : plannerRolloutPhaseNotesLaneExitCriteria.criteria.find((item: any) => !item.met)
                      ?.detail || "Current lane still has open exit work.",
              },
              {
                label: "Next lane available",
                met: Boolean(plannerRolloutPhaseNotesLaneTransition.nextLane),
                detail:
                  plannerRolloutPhaseNotesLaneTransition.nextLane?.label ||
                  "No next lane is available.",
              },
              {
                label: "Transition ready",
                met: plannerRolloutPhaseNotesLaneTransition.canAdvance,
                detail: plannerRolloutPhaseNotesLaneTransition.canAdvance
                  ? "Lane transition is ready."
                  : "Lane transition is still blocked.",
              },
            ]
          : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Clear Lane Work"
            ? [
                {
                  label: "Next lane action identified",
                  met: Boolean(plannerRolloutPhaseNotesLaneDecision.nextAction),
                  detail:
                    plannerRolloutPhaseNotesLaneDecision.nextAction?.label ||
                    "No next lane action is currently available.",
                },
                {
                  label: "Open lane actions remain",
                  met: plannerRolloutPhaseNotesLaneActionList.actions.length > 0,
                  detail:
                    plannerRolloutPhaseNotesLaneActionList.actions.length > 0
                      ? `${plannerRolloutPhaseNotesLaneActionList.actions.length} lane action(s) remain open.`
                      : "No lane actions remain open.",
                },
              ]
            : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Lane Stack Clear"
              ? [
                  {
                    label: "Lane control is ready",
                    met: plannerRolloutPhaseNotesLaneControlSummary.isReady,
                    detail: plannerRolloutPhaseNotesLaneControlSummary.isReady
                      ? "Lane control is clear."
                      : "Lane control is still open.",
                  },
                  {
                    label: "No lane actions remain",
                    met: plannerRolloutPhaseNotesLaneActionList.actions.length === 0,
                    detail:
                      plannerRolloutPhaseNotesLaneActionList.actions.length === 0
                        ? "No lane actions remain."
                        : `${plannerRolloutPhaseNotesLaneActionList.actions.length} lane action(s) remain open.`,
                  },
                ]
              : [
                  {
                    label: "Lane control still open",
                    met: !plannerRolloutPhaseNotesLaneControlSummary.isReady,
                    detail:
                      plannerRolloutPhaseNotesLaneControlSummary.blockers[0] ||
                      "Continue clearing current lane work.",
                  },
                  {
                    label: "No immediate lane action selected",
                    met: plannerRolloutPhaseNotesLaneActionList.actions.length === 0,
                    detail:
                      plannerRolloutPhaseNotesLaneActionList.actions.length === 0
                        ? "No immediate lane action is selected."
                        : `${plannerRolloutPhaseNotesLaneActionList.actions.length} lane action(s) remain open.`,
                  },
                ];
    const metCount = criteria.filter((item) => item.met).length;
    return {
      criteria,
      metCount,
      totalCount: criteria.length,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis",
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `Met: ${metCount}/${criteria.length}`,
        ...criteria.map(
          (item) => `- ${item.met ? "[Met]" : "[Open]"} ${item.label}: ${item.detail}`
        ),
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneActionList.actions.length,
    plannerRolloutPhaseNotesLaneControlSummary.blockers,
    plannerRolloutPhaseNotesLaneControlSummary.isReady,
    plannerRolloutPhaseNotesLaneDecision.nextAction,
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecision.targetLane,
    plannerRolloutPhaseNotesLaneEntryCriteria.criteria,
    plannerRolloutPhaseNotesLaneEntryCriteria.isReady,
    plannerRolloutPhaseNotesLaneExitCriteria.criteria,
    plannerRolloutPhaseNotesLaneExitCriteria.isReady,
    plannerRolloutPhaseNotesLaneTransition.canAdvance,
    plannerRolloutPhaseNotesLaneTransition.nextLane,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasisControl = useMemo(() => {
    const nextOpenCriterion =
      plannerRolloutPhaseNotesLaneDecisionBasis.criteria.find((item: any) => !item.met) || null;
    const isReady =
      plannerRolloutPhaseNotesLaneDecisionBasis.metCount ===
      plannerRolloutPhaseNotesLaneDecisionBasis.totalCount;
    return {
      isReady,
      nextOpenCriterion,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis Control",
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `State: ${isReady ? "Basis Ready" : "Basis Open"}`,
        `Met: ${plannerRolloutPhaseNotesLaneDecisionBasis.metCount}/${plannerRolloutPhaseNotesLaneDecisionBasis.totalCount}`,
        `Next open basis: ${nextOpenCriterion?.label || "None"}`,
        `Detail: ${nextOpenCriterion?.detail || "All basis criteria are met."}`,
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionBasis.criteria,
    plannerRolloutPhaseNotesLaneDecisionBasis.metCount,
    plannerRolloutPhaseNotesLaneDecisionBasis.totalCount,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasisQueue = useMemo(() => {
    const items = plannerRolloutPhaseNotesLaneDecisionBasis.criteria
      .filter((criterion: any) => !criterion.met)
      .map((criterion: any, index: number) => {
        const actionLabel =
          plannerRolloutPhaseNotesLaneDecision.stateLabel === "Hold Start"
            ? "Open Entry Criteria"
            : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Advance Lane"
              ? criterion.label === "Current lane clear"
                ? "Open Current Lane"
                : "Open Next Lane"
              : plannerRolloutPhaseNotesLaneDecision.stateLabel === "Clear Lane Work"
                ? plannerRolloutPhaseNotesLaneDecisionAction.actionLabel
                : "Open Current Lane";
        const targetPhaseId =
          plannerRolloutPhaseNotesLaneDecision.stateLabel === "Advance Lane" &&
          criterion.label !== "Current lane clear"
            ? plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId
            : "current";
        return {
          id: `${criterion.label}-${index}`,
          label: criterion.label,
          detail: criterion.detail,
          actionLabel,
          targetPhaseId: targetPhaseId as
            | "setup"
            | "pilot"
            | "employee"
            | "admin"
            | "go-live"
            | "current",
        };
      });
    return {
      items,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis Queue",
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `Open basis items: ${items.length}`,
        ...(items.length === 0
          ? ["- None"]
          : items.map(
              (item: any, index: number) =>
                `${index + 1}. ${item.label} -> ${item.actionLabel}: ${item.detail}`
            )),
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionAction.actionLabel,
    plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId,
    plannerRolloutPhaseNotesLaneDecisionBasis.criteria,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasisGate = useMemo(() => {
    const openCount = plannerRolloutPhaseNotesLaneDecisionBasisQueue.items.length;
    const nextOpenItem = plannerRolloutPhaseNotesLaneDecisionBasisQueue.items[0] || null;
    const stateLabel =
      openCount === 0 ? "Ready" : openCount === 1 ? "One Open Basis Item" : "Multiple Open Basis Items";
    return {
      isReady: openCount === 0,
      stateLabel,
      openCount,
      nextOpenItem,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis Gate",
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `State: ${stateLabel}`,
        `Open basis items: ${openCount}`,
        `Next basis item: ${nextOpenItem?.label || "None"}`,
        `Next action: ${nextOpenItem?.actionLabel || "None"}`,
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionBasisQueue.items,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack = useMemo(() => {
    const nextOpenItem = plannerRolloutPhaseNotesLaneDecisionBasisGate.nextOpenItem;
    const isReady = plannerRolloutPhaseNotesLaneDecisionBasisGate.isReady;
    const actionLabel = isReady
      ? plannerRolloutPhaseNotesLaneDecisionAction.actionLabel
      : nextOpenItem?.actionLabel || "Open Current Lane";
    const targetPhaseId = isReady
      ? plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId
      : nextOpenItem?.targetPhaseId || "current";
    return {
      isReady,
      actionLabel,
      targetPhaseId: targetPhaseId as
        | "setup"
        | "pilot"
        | "employee"
        | "admin"
        | "go-live"
        | "current",
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis Handoff Pack",
        `State: ${isReady ? "Basis Ready To Handoff" : "Basis Handoff Open"}`,
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `Open basis items: ${plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount}`,
        `Next basis item: ${nextOpenItem?.label || "None"}`,
        `Next action: ${actionLabel}`,
        `Target phase: ${targetPhaseId}`,
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionAction.actionLabel,
    plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.isReady,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.nextOpenItem,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasisTransition = useMemo(() => {
    const canAdvance = plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.isReady;
    const targetPhaseId = plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.targetPhaseId;
    const targetPhaseLabel =
      targetPhaseId === "current"
        ? "Current lane"
        : targetPhaseId === "setup"
          ? "Setup Foundation"
          : targetPhaseId === "pilot"
            ? "Pilot Walkthrough"
            : targetPhaseId === "employee"
              ? "Employee Lane Clearance"
              : targetPhaseId === "admin"
                ? "Admin Lane Clearance"
                : targetPhaseId === "go-live"
                  ? "Go-Live Decision"
                  : targetPhaseId;
    return {
      canAdvance,
      targetPhaseId,
      targetPhaseLabel,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis Transition",
        `State: ${canAdvance ? "Advance Ready" : "Advance Blocked"}`,
        `Current decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `Target phase: ${targetPhaseLabel}`,
        `Open basis items: ${plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount}`,
        `Next action: ${plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.actionLabel}`,
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount,
    plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.actionLabel,
    plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.isReady,
    plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.targetPhaseId,
  ]);
  const plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary = useMemo(() => {
    const blockerLines = [
      !plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady
        ? plannerRolloutPhaseNotesLaneDecisionBasisControl.nextOpenCriterion?.label ||
          "Open basis criteria"
        : null,
      !plannerRolloutPhaseNotesLaneDecisionBasisGate.isReady
        ? `${plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount} open basis item(s)`
        : null,
      !plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance
        ? `Target phase still blocked: ${plannerRolloutPhaseNotesLaneDecisionBasisTransition.targetPhaseLabel}`
        : null,
    ].filter((value): value is string => Boolean(value));
    return {
      isReady:
        plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady &&
        plannerRolloutPhaseNotesLaneDecisionBasisGate.isReady &&
        plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance,
      blockerLines,
      snapshotText: [
        "Planner Rollout Phase Notes Lane Decision Basis Readiness Summary",
        `Decision: ${plannerRolloutPhaseNotesLaneDecision.stateLabel}`,
        `Control: ${plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady ? "Ready" : "Open"}`,
        `Gate: ${plannerRolloutPhaseNotesLaneDecisionBasisGate.stateLabel}`,
        `Transition: ${plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance ? "Advance Ready" : "Advance Blocked"}`,
        `Open basis items: ${plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount}`,
        `Next action: ${plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.actionLabel}`,
        ...(blockerLines.length === 0
          ? ["Blockers: none"]
          : blockerLines.map((blocker, index) => `Blocker ${index + 1}: ${blocker}`)),
      ].join("\n"),
    };
  }, [
    plannerRolloutPhaseNotesLaneDecision.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady,
    plannerRolloutPhaseNotesLaneDecisionBasisControl.nextOpenCriterion,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.isReady,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount,
    plannerRolloutPhaseNotesLaneDecisionBasisGate.stateLabel,
    plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.actionLabel,
    plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance,
    plannerRolloutPhaseNotesLaneDecisionBasisTransition.targetPhaseLabel,
  ]);
  const plannerRolloutPhases = useMemo(() => {
    const employeeLaneGate =
      plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee") ?? null;
    const adminLaneGate = plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin") ?? null;
    const phases = [
      {
        id: "setup",
        label: "1. Setup Foundation",
        detail: "Complete the base planner configuration before pilot work starts.",
        ready: plannerReadinessSummary.isReady,
        progressLabel: `${plannerReadinessSummary.readyCount}/${plannerReadinessSummary.totalCount} ready`,
        nextTask: plannerGoLiveGate.nextSetupItem,
        blockerLabel:
          plannerReadinessSummary.missingItems[0]?.label ||
          "All setup items are complete.",
      },
      {
        id: "pilot",
        label: "2. Pilot Walkthrough",
        detail: "Run the employee and admin planner workflow end to end at least once.",
        ready: plannerPilotWalkthroughSummary.isReady,
        progressLabel: `${plannerPilotWalkthroughSummary.completedSteps}/${plannerPilotWalkthroughSummary.totalSteps} steps covered`,
        nextTask:
          plannerPilotWalkthroughSummary.nextOpenStep ??
          plannerPilotWalkthroughSummary.nextAdminStep ??
          null,
        blockerLabel:
          plannerPilotWalkthroughSummary.nextOpenStep?.fallbackLabel ||
          plannerPilotWalkthroughSummary.nextAdminStep?.fallbackLabel ||
          "Pilot walkthrough is covered.",
      },
      {
        id: "employee",
        label: "3. Employee Lane Clearance",
        detail: "Clear the remaining employee-owned rollout actions.",
        ready: employeeLaneGate?.isReady ?? true,
        progressLabel: employeeLaneGate
          ? `${employeeLaneGate.tasks.length} open`
          : "No employee lane",
        nextTask: employeeLaneGate?.nextTask ?? null,
        blockerLabel:
          employeeLaneGate?.nextTask?.label || "Employee lane is clear.",
      },
      {
        id: "admin",
        label: "4. Admin Lane Clearance",
        detail: "Clear the remaining admin-owned rollout actions.",
        ready: adminLaneGate?.isReady ?? true,
        progressLabel: adminLaneGate ? `${adminLaneGate.tasks.length} open` : "No admin lane",
        nextTask: adminLaneGate?.nextTask ?? null,
        blockerLabel: adminLaneGate?.nextTask?.label || "Admin lane is clear.",
      },
      {
        id: "go-live",
        label: "5. Go-Live Decision",
        detail: "Confirm the owner lanes and the overall go-live gate are both clear.",
        ready: plannerGoLiveGate.isReady && plannerRolloutCoordinationGate.isReady,
        progressLabel:
          plannerGoLiveGate.isReady && plannerRolloutCoordinationGate.isReady
            ? "Ready"
            : "Open",
        nextTask:
          plannerGoLiveGate.nextSetupItem ??
          plannerGoLiveGate.nextPilotStep ??
          plannerRolloutCoordinationGate.nextLane?.nextTask ??
          null,
        blockerLabel:
          plannerGoLiveGate.blockers[0] ||
          plannerRolloutCoordinationGate.stateLabel ||
          "Planner rollout is ready.",
      },
    ];
    const currentPhaseIndex = phases.findIndex((phase) => !phase.ready);
    const snapshotLines = ["Planner Rollout Phases"];
    phases.forEach((phase, index) => {
      snapshotLines.push(
        `${phase.label}: ${phase.ready ? "Ready" : "Open"} (${phase.progressLabel})`
      );
      snapshotLines.push(`- ${phase.blockerLabel}`);
      if (index === (currentPhaseIndex === -1 ? phases.length - 1 : currentPhaseIndex)) {
        snapshotLines.push("- Current phase");
      }
    });
    return {
      phases: phases.map((phase, index) => ({
        ...phase,
        isCurrent:
          index === (currentPhaseIndex === -1 ? phases.length - 1 : currentPhaseIndex),
      })),
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    plannerGoLiveGate,
    plannerPilotWalkthroughSummary,
    plannerReadinessSummary,
    plannerRolloutCoordinationGate,
    plannerRolloutOwnerGate,
  ]);
  const plannerCurrentRolloutPhaseDetail = useMemo(() => {
    const currentPhase =
      plannerRolloutPhases.phases.find((phase: any) => phase.isCurrent) ??
      plannerRolloutPhases.phases[plannerRolloutPhases.phases.length - 1] ??
      null;
    if (!currentPhase) {
      return null;
    }
    const tasks =
      currentPhase.id === "setup"
        ? plannerReadinessSummary.missingItems.map((item: any) => ({
            id: `phase-setup-${item.id}`,
            label: item.label,
            detail: item.detail,
            actionLabel: item.actionLabel,
            onClick: item.onClick,
            disabled: item.id === "department-rules" && !isTimesheetReviewAdmin,
          }))
        : currentPhase.id === "pilot"
          ? plannerPilotWalkthroughSteps
              .filter((step: any) => !step.ready)
              .map((step: any) => ({
                id: `phase-pilot-${step.id}`,
                label: `Step ${step.stepNumber}: ${step.fallbackLabel}`,
                detail: `${step.ownerLabel} - ${step.workspaceLabel} / ${step.sectionLabel}`,
                actionLabel: step.actionLabel,
                onClick: step.onClick,
                disabled: step.isAdminOnly && !isTimesheetReviewAdmin,
              }))
          : currentPhase.id === "employee"
            ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee")?.tasks ?? []).map(
                (task: any) => ({
                  id: `phase-employee-${task.id}`,
                  label: task.label,
                  detail: `${task.typeLabel} - ${task.ownerLabel}`,
                  actionLabel: task.actionLabel,
                  onClick: task.onClick,
                  disabled: task.disabled,
                })
              )
            : currentPhase.id === "admin"
              ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin")?.tasks ?? []).map(
                  (task: any) => ({
                    id: `phase-admin-${task.id}`,
                    label: task.label,
                    detail: `${task.typeLabel} - ${task.ownerLabel}`,
                    actionLabel: task.actionLabel,
                    onClick: task.onClick,
                    disabled: task.disabled,
                  })
                )
              : plannerGoLiveGate.isReady && plannerRolloutCoordinationGate.isReady
                ? []
                : [
                    {
                      id: "phase-go-live-gate",
                      label:
                        plannerGoLiveGate.nextSetupItem?.label ||
                        plannerGoLiveGate.nextPilotStep?.fallbackLabel ||
                        plannerRolloutCoordinationGate.nextLane?.nextTask?.label ||
                        "Review planner go-live state",
                      detail:
                        plannerGoLiveGate.blockers[0] ||
                        plannerRolloutCoordinationGate.stateLabel,
                      actionLabel:
                        plannerGoLiveGate.nextSetupItem?.actionLabel ||
                        plannerGoLiveGate.nextPilotStep?.actionLabel ||
                        plannerRolloutCoordinationGate.nextLane?.nextTask?.actionLabel ||
                        "Review",
                      onClick:
                        plannerGoLiveGate.nextSetupItem?.onClick ||
                        plannerGoLiveGate.nextPilotStep?.onClick ||
                        plannerRolloutCoordinationGate.nextLane?.nextTask?.onClick,
                      disabled:
                        plannerGoLiveGate.nextSetupItem?.id === "department-rules" &&
                        !isTimesheetReviewAdmin,
                    },
                  ];
    const snapshotLines = [
      `Current Planner Rollout Phase: ${currentPhase.label}`,
      `State: ${currentPhase.ready ? "Ready" : "Open"}`,
      `Progress: ${currentPhase.progressLabel}`,
      `Blocker: ${currentPhase.blockerLabel}`,
    ];
    if (tasks.length === 0) {
      snapshotLines.push("Tasks: none");
    } else {
      snapshotLines.push("Tasks:");
      tasks.forEach((task: any, index: number) =>
        snapshotLines.push(`${index + 1}. ${task.label} - ${task.detail}`)
      );
    }
    return {
      phase: currentPhase,
      tasks,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    isTimesheetReviewAdmin,
    plannerGoLiveGate,
    plannerPilotWalkthroughSteps,
    plannerReadinessSummary.missingItems,
    plannerRolloutCoordinationGate,
    plannerRolloutOwnerGate,
    plannerRolloutPhases.phases,
  ]);
  const plannerRolloutScoreboard = useMemo(() => {
    const setupItems = plannerReadinessChecks.map((item: any) => ({
      ownerLabel: item.id === "department-rules" ? "Admin" : "Employee",
      ready: item.ready,
      label: item.label,
      detail: item.detail,
      actionLabel: item.actionLabel,
      onClick: item.onClick,
      disabled: item.id === "department-rules" && !isTimesheetReviewAdmin,
    }));
    const pilotItems = plannerPilotWalkthroughSteps.map((step: any) => ({
      ownerLabel: step.ownerLabel,
      ready: step.ready,
      label: `Step ${step.stepNumber}: ${step.fallbackLabel}`,
      detail: step.detail,
      actionLabel: step.actionLabel,
      onClick: step.onClick,
      disabled: step.isAdminOnly && !isTimesheetReviewAdmin,
    }));
    const buildProgress = (
      label: string,
      items: Array<{
        ready: boolean;
        label: string;
        detail: string;
        actionLabel: string;
        onClick?: () => void;
        disabled?: boolean;
      }>
    ) => {
      const total = items.length;
      const complete = items.filter((item) => item.ready).length;
      const open = total - complete;
      const percent = total === 0 ? 100 : Math.round((complete / total) * 100);
      const nextItem = items.find((item) => !item.ready) ?? null;
      return { label, total, complete, open, percent, nextItem };
    };
    const allItems = [...setupItems, ...pilotItems];
    return {
      overall: buildProgress("Overall", allItems),
      employee: buildProgress(
        "Employee",
        allItems.filter((item) => item.ownerLabel === "Employee")
      ),
      admin: buildProgress(
        "Admin",
        allItems.filter((item) => item.ownerLabel === "Admin")
      ),
      setup: buildProgress("Setup", setupItems),
      pilot: buildProgress("Pilot", pilotItems),
    };
  }, [isTimesheetReviewAdmin, plannerPilotWalkthroughSteps, plannerReadinessChecks]);
  const plannerRolloutQueueSummary = useMemo(() => {
    const employeeCount = plannerRolloutQueue.filter((task: any) => task.ownerLabel === "Employee").length;
    const adminCount = plannerRolloutQueue.filter((task: any) => task.ownerLabel === "Admin").length;
    const setupCount = plannerRolloutQueue.filter((task: any) => task.typeLabel === "Setup").length;
    const pilotCount = plannerRolloutQueue.filter((task: any) => task.typeLabel === "Pilot").length;
    const nextOwner = plannerRolloutQueue[0]?.ownerLabel ?? null;
    return {
      employeeCount,
      adminCount,
      setupCount,
      pilotCount,
      nextOwner,
    };
  }, [plannerRolloutQueue]);
  const filteredPlannerRolloutQueue = useMemo(() => {
    switch (plannerRolloutQueueFilter) {
      case "employee":
        return plannerRolloutQueue.filter((task: any) => task.ownerLabel === "Employee");
      case "admin":
        return plannerRolloutQueue.filter((task: any) => task.ownerLabel === "Admin");
      case "setup":
        return plannerRolloutQueue.filter((task: any) => task.typeLabel === "Setup");
      case "pilot":
        return plannerRolloutQueue.filter((task: any) => task.typeLabel === "Pilot");
      default:
        return plannerRolloutQueue;
    }
  }, [plannerRolloutQueue, plannerRolloutQueueFilter]);
  const plannerRemainingActionsSnapshotText = useMemo(() => {
    return buildPlannerRolloutSnapshotText("All", plannerRolloutQueue);
  }, [plannerRolloutQueue]);
  const filteredPlannerRemainingActionsSnapshotText = useMemo(() => {
    const filterLabel = getPlannerRolloutQueueFilterLabel(
      plannerRolloutQueueFilter as "all" | "setup" | "pilot" | "employee" | "admin"
    );
    return buildPlannerRolloutSnapshotText(filterLabel, filteredPlannerRolloutQueue);
  }, [filteredPlannerRolloutQueue, plannerRolloutQueueFilter]);
  const filteredPlannerRolloutPhaseNotesRegister = useMemo(() => {
    const filterLabel =
      plannerRolloutPhaseNotesFilter === "missing"
        ? "Missing"
        : plannerRolloutPhaseNotesFilter === "stale"
          ? "Stale"
          : plannerRolloutPhaseNotesFilter === "noted"
            ? "Noted"
            : plannerRolloutPhaseNotesFilter === "current"
              ? "Current"
              : "All";
    const rows = plannerRolloutPhaseNotesRegister.rows.filter((row: any) => {
      if (plannerRolloutPhaseNotesFilter === "missing") {
        return row.noteStatusLabel === "Missing Note";
      }
      if (plannerRolloutPhaseNotesFilter === "stale") {
        return row.noteStatusLabel === "Stale Note";
      }
      if (plannerRolloutPhaseNotesFilter === "noted") {
        return row.hasNote;
      }
      if (plannerRolloutPhaseNotesFilter === "current") {
        return row.isCurrent;
      }
      return true;
    });
    const snapshotLines = [
      `Planner Rollout Phase Notes Register (${filterLabel})`,
      `Rows: ${rows.length}`,
      ...(rows.length === 0
        ? ["No rollout phase notes match this filter."]
        : rows.map(
            (row: any, index: number) =>
              `${index + 1}. ${row.phaseLabel} - ${row.noteStatusLabel} - ${
                row.updatedAt ? formatPlannerDateTime(row.updatedAt) : "No saved note"
              } - Blockers: ${row.blockerCount}`
          )),
    ];
    return {
      filterLabel,
      rows,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [formatPlannerDateTime, plannerRolloutPhaseNotesFilter, plannerRolloutPhaseNotesRegister]);
  const filteredPlannerRolloutPhaseNotesQueue = useMemo(() => {
    const tasks = plannerRolloutPhaseNotesQueue.tasks.filter((task: any) => {
      if (plannerRolloutPhaseNotesFilter === "missing") {
        return task.statusLabel === "Missing Note";
      }
      if (plannerRolloutPhaseNotesFilter === "stale") {
        return task.statusLabel === "Stale Note";
      }
      if (plannerRolloutPhaseNotesFilter === "current") {
        return plannerRolloutPhaseNotesRegister.rows.find((row: any) => row.phaseId === task.phaseId)?.isCurrent;
      }
      if (plannerRolloutPhaseNotesFilter === "noted") {
        return false;
      }
      return true;
    });
    const snapshotLines = [
      `Planner Rollout Phase Notes Queue (${filteredPlannerRolloutPhaseNotesRegister.filterLabel})`,
      `Open note actions: ${tasks.length}`,
      ...(tasks.length === 0
        ? ["No rollout note actions match this filter."]
        : tasks.map(
            (task: any, index: number) =>
              `${index + 1}. ${task.phaseLabel} - ${task.statusLabel} - ${task.detail}`
          )),
    ];
    return {
      tasks,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    filteredPlannerRolloutPhaseNotesRegister.filterLabel,
    plannerRolloutPhaseNotesFilter,
    plannerRolloutPhaseNotesQueue.tasks,
    plannerRolloutPhaseNotesRegister.rows,
  ]);
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
  const plannerSelectedRolloutPhaseDetail = useMemo(() => {
    if (!plannerCurrentRolloutPhaseDetail) {
      return null;
    }
    if (plannerRolloutPhaseFilter === "current") {
      return plannerCurrentRolloutPhaseDetail;
    }
    const selectedPhase =
      plannerRolloutPhases.phases.find((phase: any) => phase.id === plannerRolloutPhaseFilter) ?? null;
    if (!selectedPhase) {
      return plannerCurrentRolloutPhaseDetail;
    }
    if (selectedPhase.id === plannerCurrentRolloutPhaseDetail.phase.id) {
      return plannerCurrentRolloutPhaseDetail;
    }
    const tasks =
      selectedPhase.id === "setup"
        ? plannerReadinessSummary.missingItems.map((item: any) => ({
            id: `selected-phase-setup-${item.id}`,
            label: item.label,
            detail: item.detail,
            actionLabel: item.actionLabel,
            onClick: item.onClick,
            disabled: item.id === "department-rules" && !isTimesheetReviewAdmin,
          }))
        : selectedPhase.id === "pilot"
          ? plannerPilotWalkthroughSteps
              .filter((step: any) => !step.ready)
              .map((step: any) => ({
                id: `selected-phase-pilot-${step.id}`,
                label: `Step ${step.stepNumber}: ${step.fallbackLabel}`,
                detail: `${step.ownerLabel} · ${step.workspaceLabel} / ${step.sectionLabel}`,
                actionLabel: step.actionLabel,
                onClick: step.onClick,
                disabled: step.isAdminOnly && !isTimesheetReviewAdmin,
              }))
          : selectedPhase.id === "employee"
            ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee")?.tasks ?? []).map(
                (task: any) => ({
                  id: `selected-phase-employee-${task.id}`,
                  label: task.label,
                  detail: `${task.typeLabel} · ${task.ownerLabel}`,
                  actionLabel: task.actionLabel,
                  onClick: task.onClick,
                  disabled: task.disabled,
                })
              )
            : selectedPhase.id === "admin"
              ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin")?.tasks ?? []).map(
                  (task: any) => ({
                    id: `selected-phase-admin-${task.id}`,
                    label: task.label,
                    detail: `${task.typeLabel} · ${task.ownerLabel}`,
                    actionLabel: task.actionLabel,
                    onClick: task.onClick,
                    disabled: task.disabled,
                  })
                )
              : plannerGoLiveGate.isReady && plannerRolloutCoordinationGate.isReady
                ? []
                : [
                    {
                      id: "selected-phase-go-live-gate",
                      label:
                        plannerGoLiveGate.nextSetupItem?.label ||
                        plannerGoLiveGate.nextPilotStep?.fallbackLabel ||
                        plannerRolloutCoordinationGate.nextLane?.nextTask?.label ||
                        "Review planner go-live state",
                      detail:
                        plannerGoLiveGate.blockers[0] || plannerRolloutCoordinationGate.stateLabel,
                      actionLabel:
                        plannerGoLiveGate.nextSetupItem?.actionLabel ||
                        plannerGoLiveGate.nextPilotStep?.actionLabel ||
                        plannerRolloutCoordinationGate.nextLane?.nextTask?.actionLabel ||
                        "Review",
                      onClick:
                        plannerGoLiveGate.nextSetupItem?.onClick ||
                        plannerGoLiveGate.nextPilotStep?.onClick ||
                        plannerRolloutCoordinationGate.nextLane?.nextTask?.onClick,
                      disabled:
                        plannerGoLiveGate.nextSetupItem?.id === "department-rules" &&
                        !isTimesheetReviewAdmin,
                    },
                  ];
    const snapshotLines = [
      `Planner Rollout Phase Queue: ${selectedPhase.label}`,
      `State: ${selectedPhase.ready ? "Ready" : "Open"}`,
      `Progress: ${selectedPhase.progressLabel}`,
      `Blocker: ${selectedPhase.blockerLabel}`,
    ];
    if (tasks.length === 0) {
      snapshotLines.push("Tasks: none");
    } else {
      snapshotLines.push("Tasks:");
      tasks.forEach((task: any, index: number) =>
        snapshotLines.push(`${index + 1}. ${task.label} - ${task.detail}`)
      );
    }
    return {
      phase: selectedPhase,
      tasks,
      snapshotText: snapshotLines.join("\n"),
    };
  }, [
    isTimesheetReviewAdmin,
    plannerCurrentRolloutPhaseDetail,
    plannerGoLiveGate,
    plannerPilotWalkthroughSteps,
    plannerReadinessSummary.missingItems,
    plannerRolloutCoordinationGate,
    plannerRolloutOwnerGate,
    plannerRolloutPhaseFilter,
    plannerRolloutPhases.phases,
  ]);
  const plannerSelectedRolloutPhaseGate = useMemo(() => {
    if (!plannerSelectedRolloutPhaseDetail) {
      return null;
    }
    const phaseList = plannerRolloutPhases.phases;
    const selectedIndex = phaseList.findIndex(
      (phase: any) => phase.id === plannerSelectedRolloutPhaseDetail.phase.id
    );
    const currentIndex = phaseList.findIndex((phase: any) => phase.isCurrent);
    const previousPhase = selectedIndex > 0 ? phaseList[selectedIndex - 1] : null;
    const nextPhase =
      selectedIndex >= 0 && selectedIndex < phaseList.length - 1 ? phaseList[selectedIndex + 1] : null;
    const stateLabel = plannerSelectedRolloutPhaseDetail.phase.ready
      ? "Ready"
      : selectedIndex < currentIndex
        ? "Reopened"
        : selectedIndex === currentIndex
          ? "Active"
          : "Waiting on earlier phase";
    const blockerLabel =
      selectedIndex > currentIndex && currentIndex >= 0
        ? `Waiting on ${phaseList[currentIndex]?.label || "an earlier phase"}`
        : plannerSelectedRolloutPhaseDetail.phase.blockerLabel;
    return {
      phase: plannerSelectedRolloutPhaseDetail.phase,
      stateLabel,
      blockerLabel,
      previousPhase,
      nextPhase,
      snapshotText: [
        `Planner Rollout Phase Gate: ${plannerSelectedRolloutPhaseDetail.phase.label}`,
        `State: ${stateLabel}`,
        `Progress: ${plannerSelectedRolloutPhaseDetail.phase.progressLabel}`,
        `Previous phase: ${previousPhase?.label || "None"}`,
        `Next phase: ${nextPhase?.label || "None"}`,
        `Blocker: ${blockerLabel}`,
      ].join("\n"),
    };
  }, [plannerRolloutPhases.phases, plannerSelectedRolloutPhaseDetail]);
  const plannerSelectedRolloutPhaseTransition = useMemo(() => {
    if (!plannerSelectedRolloutPhaseGate || !plannerSelectedRolloutPhaseDetail) {
      return null;
    }
    const currentPhase = plannerSelectedRolloutPhaseGate.phase;
    const nextPhase = plannerSelectedRolloutPhaseGate.nextPhase;
    const canAdvance = plannerSelectedRolloutPhaseGate.stateLabel === "Ready" && nextPhase !== null;
    const nextPhaseQueueCount =
      nextPhase?.id === "setup"
        ? plannerReadinessSummary.missingItems.length
        : nextPhase?.id === "pilot"
          ? plannerPilotWalkthroughSteps.filter((step: any) => !step.ready).length
          : nextPhase?.id === "employee"
            ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee")?.tasks.length ?? 0)
            : nextPhase?.id === "admin"
              ? (plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin")?.tasks.length ?? 0)
              : plannerRolloutQueue.length;
    const transitionLabel = canAdvance
      ? `Ready to move into ${nextPhase?.label}`
      : nextPhase
        ? `Finish ${currentPhase.label} before moving into ${nextPhase.label}`
        : currentPhase.ready
          ? "This is the final rollout phase."
          : `Finish ${currentPhase.label} before rollout can close.`;
    return {
      currentPhase,
      nextPhase,
      canAdvance,
      nextPhaseQueueCount,
      transitionLabel,
      snapshotText: [
        `Planner Rollout Phase Transition: ${currentPhase.label}`,
        `Transition state: ${transitionLabel}`,
        `Current phase state: ${plannerSelectedRolloutPhaseGate.stateLabel}`,
        `Current open tasks: ${plannerSelectedRolloutPhaseDetail.tasks.length}`,
        `Next phase: ${nextPhase?.label || "None"}`,
        `Next phase open tasks: ${nextPhase ? nextPhaseQueueCount : 0}`,
      ].join("\n"),
    };
  }, [
    plannerPilotWalkthroughSteps,
    plannerReadinessSummary.missingItems.length,
    plannerRolloutOwnerGate,
    plannerRolloutQueue.length,
    plannerSelectedRolloutPhaseDetail,
    plannerSelectedRolloutPhaseGate,
  ]);
  const plannerSelectedRolloutPhaseEntryCriteria = useMemo(() => {
    if (!plannerSelectedRolloutPhaseDetail || !plannerSelectedRolloutPhaseGate) {
      return null;
    }
    const phase = plannerSelectedRolloutPhaseDetail.phase;
    const previousPhase = plannerSelectedRolloutPhaseGate.previousPhase;
    const employeeLane = plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee");
    const adminLane = plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin");
    const criteria =
      phase.id === "setup"
        ? [{ id: "setup-entry", label: "Planner rollout can start from setup", met: true, detail: "Setup is the first rollout phase." }]
        : phase.id === "pilot"
          ? [
              {
                id: "pilot-prev-phase",
                label: "Setup Foundation phase is ready",
                met: previousPhase?.ready ?? false,
                detail: previousPhase?.ready ? "Setup Foundation is marked ready." : "Setup Foundation is still open.",
              },
              {
                id: "pilot-setup-clear",
                label: "No setup items remain open",
                met: plannerReadinessSummary.missingItems.length === 0,
                detail:
                  plannerReadinessSummary.missingItems.length === 0
                    ? "The setup queue is clear."
                    : `${plannerReadinessSummary.missingItems.length} setup item(s) still open.`,
              },
            ]
          : phase.id === "employee"
            ? [
                {
                  id: "employee-prev-phase",
                  label: "Pilot Walkthrough phase is ready",
                  met: previousPhase?.ready ?? false,
                  detail: previousPhase?.ready ? "Pilot Walkthrough is marked ready." : "Pilot Walkthrough is still open.",
                },
                {
                  id: "employee-pilot-clear",
                  label: "Pilot walkthrough steps are complete",
                  met: plannerPilotWalkthroughSummary.isReady,
                  detail: plannerPilotWalkthroughSummary.isReady
                    ? "All pilot walkthrough steps are covered."
                    : `${plannerPilotWalkthroughSummary.totalSteps - plannerPilotWalkthroughSummary.completedSteps} pilot step(s) still open.`,
                },
              ]
            : phase.id === "admin"
              ? [
                  {
                    id: "admin-prev-phase",
                    label: "Employee Lane Clearance phase is ready",
                    met: previousPhase?.ready ?? false,
                    detail: previousPhase?.ready ? "Employee Lane Clearance is marked ready." : "Employee Lane Clearance is still open.",
                  },
                  {
                    id: "admin-employee-lane",
                    label: "Employee rollout lane is clear",
                    met: employeeLane?.isReady ?? true,
                    detail:
                      employeeLane?.isReady ?? true
                        ? "The employee lane is clear."
                        : `${employeeLane?.tasks.length ?? 0} employee action(s) still open.`,
                  },
                ]
              : [
                  {
                    id: "go-live-prev-phase",
                    label: "Admin Lane Clearance phase is ready",
                    met: previousPhase?.ready ?? false,
                    detail: previousPhase?.ready ? "Admin Lane Clearance is marked ready." : "Admin Lane Clearance is still open.",
                  },
                  {
                    id: "go-live-admin-lane",
                    label: "Admin rollout lane is clear",
                    met: adminLane?.isReady ?? true,
                    detail:
                      adminLane?.isReady ?? true
                        ? "The admin lane is clear."
                        : `${adminLane?.tasks.length ?? 0} admin action(s) still open.`,
                  },
                ];
    const readyCount = criteria.filter((item: any) => item.met).length;
    return {
      phase,
      criteria,
      readyCount,
      totalCount: criteria.length,
      isReady: criteria.every((item: any) => item.met),
      snapshotText: [
        `Planner Rollout Phase Entry Criteria: ${phase.label}`,
        `Ready: ${readyCount}/${criteria.length}`,
        ...criteria.map(
          (item: any, index: number) =>
            `${index + 1}. ${item.met ? "[Met]" : "[Open]"} ${item.label} - ${item.detail}`
        ),
      ].join("\n"),
    };
  }, [
    plannerPilotWalkthroughSummary,
    plannerReadinessSummary.missingItems.length,
    plannerRolloutOwnerGate,
    plannerSelectedRolloutPhaseDetail,
    plannerSelectedRolloutPhaseGate,
  ]);
  const plannerSelectedRolloutPhaseExitCriteria = useMemo(() => {
    if (!plannerSelectedRolloutPhaseDetail || !plannerSelectedRolloutPhaseGate) {
      return null;
    }
    const phase = plannerSelectedRolloutPhaseDetail.phase;
    const employeeLane = plannerRolloutOwnerGate.find((lane: any) => lane.id === "employee");
    const adminLane = plannerRolloutOwnerGate.find((lane: any) => lane.id === "admin");
    const criteria =
      phase.id === "setup"
        ? [
            {
              id: "setup-ready",
              label: "Planner setup readiness is complete",
              met: plannerReadinessSummary.isReady,
              detail: plannerReadinessSummary.isReady
                ? "All required setup items are ready."
                : `${plannerReadinessSummary.missingItems.length} setup item(s) still missing.`,
            },
            {
              id: "setup-queue",
              label: "No setup actions remain open",
              met: plannerReadinessSummary.missingItems.length === 0,
              detail:
                plannerReadinessSummary.missingItems.length === 0
                  ? "The setup queue is clear."
                  : `${plannerReadinessSummary.missingItems.length} setup task(s) still open.`,
            },
          ]
        : phase.id === "pilot"
          ? [
              {
                id: "pilot-ready",
                label: "Pilot walkthrough coverage is complete",
                met: plannerPilotWalkthroughSummary.isReady,
                detail: plannerPilotWalkthroughSummary.isReady
                  ? "The employee and admin pilot workflow has been covered."
                  : `${plannerPilotWalkthroughSummary.totalSteps - plannerPilotWalkthroughSummary.completedSteps} pilot step(s) still open.`,
              },
              {
                id: "pilot-queue",
                label: "No pilot tasks remain open",
                met: plannerSelectedRolloutPhaseDetail.tasks.length === 0,
                detail:
                  plannerSelectedRolloutPhaseDetail.tasks.length === 0
                    ? "The pilot phase queue is clear."
                    : `${plannerSelectedRolloutPhaseDetail.tasks.length} pilot task(s) still open.`,
              },
            ]
          : phase.id === "employee"
            ? [
                {
                  id: "employee-gate",
                  label: "Employee lane gate is ready",
                  met: employeeLane?.isReady ?? true,
                  detail:
                    employeeLane?.isReady ?? true
                      ? "The employee rollout lane is clear."
                      : `${employeeLane?.tasks.length ?? 0} employee action(s) still open.`,
                },
                {
                  id: "employee-queue",
                  label: "No employee rollout tasks remain",
                  met: plannerSelectedRolloutPhaseDetail.tasks.length === 0,
                  detail:
                    plannerSelectedRolloutPhaseDetail.tasks.length === 0
                      ? "The employee phase queue is clear."
                      : `${plannerSelectedRolloutPhaseDetail.tasks.length} employee task(s) still open.`,
                },
              ]
            : phase.id === "admin"
              ? [
                  {
                    id: "admin-gate",
                    label: "Admin lane gate is ready",
                    met: adminLane?.isReady ?? true,
                    detail:
                      adminLane?.isReady ?? true
                        ? "The admin rollout lane is clear."
                        : `${adminLane?.tasks.length ?? 0} admin action(s) still open.`,
                  },
                  {
                    id: "admin-queue",
                    label: "No admin rollout tasks remain",
                    met: plannerSelectedRolloutPhaseDetail.tasks.length === 0,
                    detail:
                      plannerSelectedRolloutPhaseDetail.tasks.length === 0
                        ? "The admin phase queue is clear."
                        : `${plannerSelectedRolloutPhaseDetail.tasks.length} admin task(s) still open.`,
                  },
                ]
              : [
                  {
                    id: "go-live-gate",
                    label: "Planner go-live gate is ready",
                    met: plannerGoLiveGate.isReady,
                    detail: plannerGoLiveGate.isReady
                      ? "The go-live gate is clear."
                      : plannerGoLiveGate.blockers[0] || "Go-live gate is still open.",
                  },
                  {
                    id: "go-live-coordination",
                    label: "Rollout coordination gate is ready",
                    met: plannerRolloutCoordinationGate.isReady,
                    detail: plannerRolloutCoordinationGate.isReady
                      ? "Employee and admin rollout lanes are coordinated."
                      : plannerRolloutCoordinationGate.stateLabel,
                  },
                ];
    const readyCount = criteria.filter((item: any) => item.met).length;
    return {
      phase,
      criteria,
      readyCount,
      totalCount: criteria.length,
      isReady: criteria.every((item: any) => item.met),
      snapshotText: [
        `Planner Rollout Phase Exit Criteria: ${phase.label}`,
        `Ready: ${readyCount}/${criteria.length}`,
        ...criteria.map(
          (item: any, index: number) =>
            `${index + 1}. ${item.met ? "[Met]" : "[Open]"} ${item.label} - ${item.detail}`
        ),
      ].join("\n"),
    };
  }, [
    plannerGoLiveGate,
    plannerPilotWalkthroughSummary,
    plannerReadinessSummary,
    plannerRolloutCoordinationGate,
    plannerRolloutOwnerGate,
    plannerSelectedRolloutPhaseDetail,
    plannerSelectedRolloutPhaseGate,
  ]);
  const plannerSelectedRolloutPhaseReadinessSummary = useMemo(() => {
    if (
      !plannerSelectedRolloutPhaseDetail ||
      !plannerSelectedRolloutPhaseGate ||
      !plannerSelectedRolloutPhaseTransition ||
      !plannerSelectedRolloutPhaseEntryCriteria ||
      !plannerSelectedRolloutPhaseExitCriteria
    ) {
      return null;
    }
    const blockers = [
      ...plannerSelectedRolloutPhaseEntryCriteria.criteria
        .filter((item: any) => !item.met)
        .map((item: any) => `Entry: ${item.label}`),
      ...plannerSelectedRolloutPhaseExitCriteria.criteria
        .filter((item: any) => !item.met)
        .map((item: any) => `Exit: ${item.label}`),
    ];
    return {
      phase: plannerSelectedRolloutPhaseDetail.phase,
      gateState: plannerSelectedRolloutPhaseGate.stateLabel,
      entryReady: plannerSelectedRolloutPhaseEntryCriteria.isReady,
      exitReady: plannerSelectedRolloutPhaseExitCriteria.isReady,
      transitionReady: plannerSelectedRolloutPhaseTransition.canAdvance,
      blockers,
      snapshotText: [
        `Planner Rollout Phase Readiness Summary: ${plannerSelectedRolloutPhaseDetail.phase.label}`,
        `Gate: ${plannerSelectedRolloutPhaseGate.stateLabel}`,
        `Entry: ${plannerSelectedRolloutPhaseEntryCriteria.readyCount}/${plannerSelectedRolloutPhaseEntryCriteria.totalCount}`,
        `Exit: ${plannerSelectedRolloutPhaseExitCriteria.readyCount}/${plannerSelectedRolloutPhaseExitCriteria.totalCount}`,
        `Transition: ${plannerSelectedRolloutPhaseTransition.canAdvance ? "Advance Ready" : "Advance Blocked"}`,
        `Open tasks: ${plannerSelectedRolloutPhaseDetail.tasks.length}`,
        `Blockers: ${blockers.length === 0 ? "None" : blockers.join("; ")}`,
      ].join("\n"),
    };
  }, [
    plannerSelectedRolloutPhaseDetail,
    plannerSelectedRolloutPhaseEntryCriteria,
    plannerSelectedRolloutPhaseExitCriteria,
    plannerSelectedRolloutPhaseGate,
    plannerSelectedRolloutPhaseTransition,
  ]);
  const plannerSelectedRolloutPhaseActionList = useMemo(() => {
    if (
      !plannerSelectedRolloutPhaseDetail ||
      !plannerSelectedRolloutPhaseGate ||
      !plannerSelectedRolloutPhaseEntryCriteria ||
      !plannerSelectedRolloutPhaseExitCriteria ||
      !plannerSelectedRolloutPhaseTransition
    ) {
      return null;
    }
    const actions: any[] = [];
    if (!plannerSelectedRolloutPhaseEntryCriteria.isReady) {
      actions.push({
        id: "phase-action-entry",
        label: "Clear entry dependencies",
        detail:
          plannerSelectedRolloutPhaseReadinessSummary?.blockers.find((item: string) =>
            item.startsWith("Entry:")
          ) || "One or more entry criteria are still open.",
        actionLabel: plannerSelectedRolloutPhaseGate.previousPhase ? "Open Previous Phase" : "Open Current Phase",
        onClick: plannerSelectedRolloutPhaseGate.previousPhase
          ? () => setPlannerRolloutPhaseFilter(plannerSelectedRolloutPhaseGate.previousPhase?.id as any)
          : () => setPlannerRolloutPhaseFilter("current"),
      });
    }
    if (plannerSelectedRolloutPhaseDetail.tasks[0]) {
      actions.push({
        id: `phase-action-task-${plannerSelectedRolloutPhaseDetail.tasks[0].id}`,
        label: plannerSelectedRolloutPhaseDetail.tasks[0].label,
        detail: plannerSelectedRolloutPhaseDetail.tasks[0].detail,
        actionLabel: plannerSelectedRolloutPhaseDetail.tasks[0].actionLabel,
        onClick: plannerSelectedRolloutPhaseDetail.tasks[0].onClick,
        disabled: plannerSelectedRolloutPhaseDetail.tasks[0].disabled,
      });
    }
    if (!plannerSelectedRolloutPhaseExitCriteria.isReady && plannerSelectedRolloutPhaseDetail.tasks.length === 0) {
      actions.push({
        id: "phase-action-exit",
        label: "Review exit readiness",
        detail:
          plannerSelectedRolloutPhaseReadinessSummary?.blockers.find((item: string) =>
            item.startsWith("Exit:")
          ) || "One or more exit criteria are still open.",
        actionLabel: "Open Current Phase",
        onClick: () => setPlannerRolloutPhaseFilter("current"),
      });
    }
    if (plannerSelectedRolloutPhaseTransition.canAdvance && plannerSelectedRolloutPhaseTransition.nextPhase) {
      actions.push({
        id: "phase-action-next",
        label: `Move into ${plannerSelectedRolloutPhaseTransition.nextPhase.label}`,
        detail: `${plannerSelectedRolloutPhaseTransition.nextPhaseQueueCount} next-phase task(s) are waiting.`,
        actionLabel: "Open Next Phase Queue",
        onClick: () => setPlannerRolloutPhaseFilter(plannerSelectedRolloutPhaseTransition.nextPhase?.id as any),
      });
    }
    return {
      phase: plannerSelectedRolloutPhaseDetail.phase,
      actions,
      snapshotText: [
        `Planner Rollout Phase Action List: ${plannerSelectedRolloutPhaseDetail.phase.label}`,
        ...(actions.length === 0
          ? ["No immediate phase actions remain."]
          : actions.map(
              (item: any, index: number) =>
                `${index + 1}. ${item.label} - ${item.detail}${item.actionLabel ? ` (${item.actionLabel})` : ""}`
            )),
      ].join("\n"),
    };
  }, [
    plannerSelectedRolloutPhaseDetail,
    plannerSelectedRolloutPhaseEntryCriteria,
    plannerSelectedRolloutPhaseExitCriteria,
    plannerSelectedRolloutPhaseGate,
    plannerSelectedRolloutPhaseReadinessSummary,
    plannerSelectedRolloutPhaseTransition,
    setPlannerRolloutPhaseFilter,
  ]);
  const plannerSelectedRolloutPhaseHandoffPack = useMemo(() => {
    if (
      !plannerSelectedRolloutPhaseDetail ||
      !plannerSelectedRolloutPhaseGate ||
      !plannerSelectedRolloutPhaseTransition ||
      !plannerSelectedRolloutPhaseReadinessSummary ||
      !plannerSelectedRolloutPhaseActionList
    ) {
      return null;
    }
    const isReadyToHandoff =
      plannerSelectedRolloutPhaseReadinessSummary.entryReady &&
      plannerSelectedRolloutPhaseReadinessSummary.exitReady &&
      plannerSelectedRolloutPhaseTransition.canAdvance;
    return {
      phase: plannerSelectedRolloutPhaseDetail.phase,
      isReadyToHandoff,
      nextPhase: plannerSelectedRolloutPhaseTransition.nextPhase,
      nextPhaseQueueCount: plannerSelectedRolloutPhaseTransition.nextPhaseQueueCount,
      snapshotText: [
        `Planner Rollout Phase Handoff Pack: ${plannerSelectedRolloutPhaseDetail.phase.label}`,
        `Gate: ${plannerSelectedRolloutPhaseGate.stateLabel}`,
        `Ready to handoff: ${isReadyToHandoff ? "Yes" : "No"}`,
        `Next phase: ${plannerSelectedRolloutPhaseTransition.nextPhase?.label || "None"}`,
        `Next phase open tasks: ${plannerSelectedRolloutPhaseTransition.nextPhaseQueueCount}`,
        `Open current tasks: ${plannerSelectedRolloutPhaseDetail.tasks.length}`,
        `Blockers: ${
          plannerSelectedRolloutPhaseReadinessSummary.blockers.length === 0
            ? "None"
            : plannerSelectedRolloutPhaseReadinessSummary.blockers.join("; ")
        }`,
        "",
        plannerSelectedRolloutPhaseActionList.snapshotText,
      ].join("\n"),
    };
  }, [
    plannerSelectedRolloutPhaseActionList,
    plannerSelectedRolloutPhaseDetail,
    plannerSelectedRolloutPhaseGate,
    plannerSelectedRolloutPhaseReadinessSummary,
    plannerSelectedRolloutPhaseTransition,
  ]);
  const plannerSelectedRolloutPhaseNote = useMemo(() => {
    const phaseId = plannerSelectedRolloutPhaseDetail?.phase.id as PlannerRolloutPhaseId | undefined;
    if (!phaseId) {
      return null;
    }
    const savedNote = plannerRolloutPhaseNotes[phaseId];
    const noteText = savedNote?.text?.trim() || "";
    return {
      phaseId,
      phaseLabel: plannerSelectedRolloutPhaseDetail?.phase.label || phaseId,
      text: savedNote?.text || "",
      trimmedText: noteText,
      updatedAt: savedNote?.updatedAt || null,
      snapshotText: [
        `Planner Rollout Phase Note: ${plannerSelectedRolloutPhaseDetail?.phase.label || phaseId}`,
        `Updated: ${savedNote?.updatedAt ? formatPlannerDateTime(savedNote.updatedAt) : "Not saved"}`,
        `Note: ${noteText || "None"}`,
      ].join("\n"),
    };
  }, [formatPlannerDateTime, plannerRolloutPhaseNotes, plannerSelectedRolloutPhaseDetail]);
  const updatePlannerSelectedRolloutPhaseNote = (text: string) => {
    const phaseId = plannerSelectedRolloutPhaseNote?.phaseId;
    if (!phaseId) {
      return;
    }
    setPlannerRolloutPhaseNotes((current: Record<string, { text?: string; updatedAt?: string }>) => ({
      ...current,
      [phaseId]: {
        text,
        updatedAt: new Date().toISOString(),
      },
    }));
  };
  const clearPlannerSelectedRolloutPhaseNote = () => {
    const phaseId = plannerSelectedRolloutPhaseNote?.phaseId;
    if (!phaseId) {
      return;
    }
    setPlannerRolloutPhaseNotes((current: Record<string, { text?: string; updatedAt?: string }>) => {
      const next = { ...current };
      delete next[phaseId];
      return next;
    });
  };
  const plannerRolloutHandoffPackText = useMemo(
    () =>
      buildPlannerRolloutHandoffPackText({
        plannerGoLiveSnapshotText,
        plannerRolloutPhasesSnapshotText: plannerRolloutPhases.snapshotText,
        plannerCurrentRolloutPhaseSnapshotText: plannerCurrentRolloutPhaseDetail?.snapshotText,
        plannerSelectedRolloutPhaseGateSnapshotText: plannerSelectedRolloutPhaseGate?.snapshotText,
        plannerSelectedRolloutPhaseTransitionSnapshotText:
          plannerSelectedRolloutPhaseTransition?.snapshotText,
        plannerSelectedRolloutPhaseReadinessSummarySnapshotText:
          plannerSelectedRolloutPhaseReadinessSummary?.snapshotText,
        plannerSelectedRolloutPhaseActionListSnapshotText:
          plannerSelectedRolloutPhaseActionList?.snapshotText,
        plannerSelectedRolloutPhaseHandoffPackSnapshotText:
          plannerSelectedRolloutPhaseHandoffPack?.snapshotText,
        plannerRolloutPhaseNotesScoreboardSnapshotText:
          plannerRolloutPhaseNotesScoreboard.snapshotText,
        plannerRolloutPhaseNotesLanesSnapshotText: plannerRolloutPhaseNotesLanes.snapshotText,
        plannerRolloutPhaseNotesLaneReadinessSummarySnapshotText:
          plannerRolloutPhaseNotesLaneReadinessSummary.snapshotText,
        plannerRolloutPhaseNotesLaneControlSummarySnapshotText:
          plannerRolloutPhaseNotesLaneControlSummary.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionSnapshotText:
          plannerRolloutPhaseNotesLaneDecision.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionActionSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionAction.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasis.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisControlSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasisControl.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisQueueSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasisQueue.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisGateSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasisGate.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisHandoffPackSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummarySnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.snapshotText,
        plannerRolloutPhaseNotesLaneDecisionBasisTransitionSnapshotText:
          plannerRolloutPhaseNotesLaneDecisionBasisTransition.snapshotText,
        plannerRolloutPhaseNotesLaneActionListSnapshotText:
          plannerRolloutPhaseNotesLaneActionList.snapshotText,
        plannerRolloutPhaseNotesLaneEntryCriteriaSnapshotText:
          plannerRolloutPhaseNotesLaneEntryCriteria.snapshotText,
        plannerRolloutPhaseNotesLaneExitCriteriaSnapshotText:
          plannerRolloutPhaseNotesLaneExitCriteria.snapshotText,
        plannerRolloutPhaseNotesLaneGateSnapshotText:
          plannerRolloutPhaseNotesLaneGate.snapshotText,
        plannerRolloutPhaseNotesLaneTransitionSnapshotText:
          plannerRolloutPhaseNotesLaneTransition.snapshotText,
        plannerRolloutPhaseNotesLaneHandoffPackSnapshotText:
          plannerRolloutPhaseNotesLaneHandoffPack.snapshotText,
        plannerRolloutPhaseNotesLaneQueueSnapshotText:
          plannerRolloutPhaseNotesLaneQueue.snapshotText,
        plannerRolloutPhaseNotesGateSnapshotText: plannerRolloutPhaseNotesGate.snapshotText,
        filteredPlannerRolloutPhaseNotesQueueSnapshotText:
          filteredPlannerRolloutPhaseNotesQueue.snapshotText,
        filteredPlannerRolloutPhaseNotesRegisterSnapshotText:
          filteredPlannerRolloutPhaseNotesRegister.snapshotText,
        plannerSelectedRolloutPhaseNoteSnapshotText: plannerSelectedRolloutPhaseNote?.snapshotText,
        plannerSelectedRolloutPhaseEntryCriteriaSnapshotText:
          plannerSelectedRolloutPhaseEntryCriteria?.snapshotText,
        plannerSelectedRolloutPhaseExitCriteriaSnapshotText:
          plannerSelectedRolloutPhaseExitCriteria?.snapshotText,
        plannerRolloutCoordinationGateSnapshotText: plannerRolloutCoordinationGate.snapshotText,
        plannerRolloutOwnerGates: plannerRolloutOwnerGate,
        plannerRemainingActionsSnapshotText,
      }),
    [
      filteredPlannerRolloutPhaseNotesQueue.snapshotText,
      filteredPlannerRolloutPhaseNotesRegister.snapshotText,
      plannerCurrentRolloutPhaseDetail?.snapshotText,
      plannerGoLiveSnapshotText,
      plannerRemainingActionsSnapshotText,
      plannerRolloutCoordinationGate.snapshotText,
      plannerRolloutOwnerGate,
      plannerRolloutPhaseNotesGate.snapshotText,
      plannerRolloutPhaseNotesLaneActionList.snapshotText,
      plannerRolloutPhaseNotesLaneControlSummary.snapshotText,
      plannerRolloutPhaseNotesLaneDecision.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionAction.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasis.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasisControl.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasisGate.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasisQueue.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.snapshotText,
      plannerRolloutPhaseNotesLaneDecisionBasisTransition.snapshotText,
      plannerRolloutPhaseNotesLaneEntryCriteria.snapshotText,
      plannerRolloutPhaseNotesLaneExitCriteria.snapshotText,
      plannerRolloutPhaseNotesLaneGate.snapshotText,
      plannerRolloutPhaseNotesLaneHandoffPack.snapshotText,
      plannerRolloutPhaseNotesLaneQueue.snapshotText,
      plannerRolloutPhaseNotesLaneReadinessSummary.snapshotText,
      plannerRolloutPhaseNotesLaneTransition.snapshotText,
      plannerRolloutPhaseNotesLanes.snapshotText,
      plannerRolloutPhaseNotesScoreboard.snapshotText,
      plannerRolloutPhases.snapshotText,
      plannerSelectedRolloutPhaseActionList?.snapshotText,
      plannerSelectedRolloutPhaseEntryCriteria?.snapshotText,
      plannerSelectedRolloutPhaseExitCriteria?.snapshotText,
      plannerSelectedRolloutPhaseGate?.snapshotText,
      plannerSelectedRolloutPhaseHandoffPack?.snapshotText,
      plannerSelectedRolloutPhaseNote?.snapshotText,
      plannerSelectedRolloutPhaseReadinessSummary?.snapshotText,
      plannerSelectedRolloutPhaseTransition?.snapshotText,
    ]
  );
  const insertPlannerSelectedRolloutPhaseBlockers = () => {
    if (!plannerSelectedRolloutPhaseDetail || !plannerSelectedRolloutPhaseReadinessSummary) {
      return;
    }
    const blockerText =
      plannerSelectedRolloutPhaseReadinessSummary.blockers.length === 0
        ? "No current blockers."
        : plannerSelectedRolloutPhaseReadinessSummary.blockers.join("\n");
    updatePlannerSelectedRolloutPhaseNote(blockerText);
    toast.success("Current rollout blockers inserted into the phase note.");
  };
  const insertPlannerSelectedRolloutPhaseHandoffSummary = () => {
    if (!plannerSelectedRolloutPhaseHandoffPack) {
      return;
    }
    updatePlannerSelectedRolloutPhaseNote(plannerSelectedRolloutPhaseHandoffPack.snapshotText);
    toast.success("Phase handoff summary inserted into the phase note.");
  };

  return (
    <>
                <div className="rounded-xl border border-dashed bg-slate-50 p-4">
                  <div className="flex flex-col gap-4">
                    <div className="rounded-lg border bg-white p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-slate-900">
                            Planner Rollout Phases
                          </div>
                          <div className="text-xs text-muted-foreground">
                            This shows the rollout sequence in order, so you can see the current
                            phase instead of only a mixed queue of open actions.
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={copyPlannerRolloutPhases}
                          >
                            Copy Phase Plan
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-5">
                        {plannerRolloutPhases.phases.map((phase: any) => (
                          <div
                            key={phase.id}
                            className={`rounded-lg border p-3 ${
                              phase.isCurrent ? "border-blue-300 bg-blue-50/60" : "bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-sm font-medium text-slate-900">{phase.label}</div>
                              <Badge variant={phase.ready ? "secondary" : "outline"}>
                                {phase.ready ? "Ready" : phase.isCurrent ? "Current" : "Open"}
                              </Badge>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {phase.progressLabel}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{phase.detail}</div>
                            <div className="mt-3 rounded-lg border border-dashed bg-slate-50 p-2 text-xs text-muted-foreground">
                              {phase.blockerLabel}
                            </div>
                            {phase.nextTask ? (
                              <div className="mt-3 grid gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={phase.nextTask.onClick}
                                  disabled={Boolean(
                                    (phase.nextTask as { disabled?: boolean }).disabled
                                  )}
                                >
                                  {phase.nextTask.actionLabel}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="w-full"
                                  onClick={() =>
                                    setPlannerRolloutPhaseFilter(
                                      phase.id as
                                        | "setup"
                                        | "pilot"
                                        | "employee"
                                        | "admin"
                                        | "go-live"
                                    )
                                  }
                                >
                                  Show Phase Queue
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      {plannerCurrentRolloutPhaseDetail ? (
                        <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900">
                                Current Phase Task List
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {plannerCurrentRolloutPhaseDetail.phase.label} ·{" "}
                                {plannerCurrentRolloutPhaseDetail.phase.progressLabel}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={copyPlannerCurrentRolloutPhase}
                              >
                                Copy Current Phase
                              </Button>
                              {plannerCurrentRolloutPhaseDetail.tasks[0]?.onClick ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={plannerCurrentRolloutPhaseDetail.tasks[0].onClick}
                                  disabled={Boolean(
                                    plannerCurrentRolloutPhaseDetail.tasks[0].disabled
                                  )}
                                >
                                  {plannerCurrentRolloutPhaseDetail.tasks[0].actionLabel}
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 rounded-lg border border-dashed bg-white p-3 text-xs text-muted-foreground">
                            {plannerCurrentRolloutPhaseDetail.phase.blockerLabel}
                          </div>
                          {plannerCurrentRolloutPhaseDetail.tasks.length === 0 ? (
                            <div className="mt-3 text-sm text-emerald-700">
                              No open tasks remain in the current phase.
                            </div>
                          ) : (
                            <div className="mt-3 grid gap-2">
                              {plannerCurrentRolloutPhaseDetail.tasks.map((task: any, index: number) => (
                                <div
                                  key={task.id}
                                  className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">{index + 1}</Badge>
                                      {index === 0 ? (
                                        <Badge variant="secondary">Next</Badge>
                                      ) : null}
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                      {task.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {task.detail}
                                    </div>
                                  </div>
                                  {task.onClick ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={task.onClick}
                                      disabled={Boolean(task.disabled)}
                                    >
                                      {task.actionLabel}
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                      {plannerSelectedRolloutPhaseDetail ? (
                        <div className="mt-3 rounded-lg border bg-white p-3">
                          {plannerSelectedRolloutPhaseGate ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Gate
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseGate.phase.label} ·{" "}
                                    {plannerSelectedRolloutPhaseGate.stateLabel}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerSelectedRolloutPhaseGate.stateLabel === "Ready"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerSelectedRolloutPhaseGate.stateLabel}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseGate}
                                  >
                                    Copy Phase Gate
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Previous:{" "}
                                  {plannerSelectedRolloutPhaseGate.previousPhase?.label || "None"}
                                </Badge>
                                <Badge variant="outline">
                                  Next: {plannerSelectedRolloutPhaseGate.nextPhase?.label || "None"}
                                </Badge>
                              </div>
                              <div className="mt-3 rounded-lg border bg-white p-3 text-xs text-muted-foreground">
                                {plannerSelectedRolloutPhaseGate.blockerLabel}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {plannerSelectedRolloutPhaseGate.previousPhase ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setPlannerRolloutPhaseFilter(
                                        plannerSelectedRolloutPhaseGate.previousPhase?.id as
                                          | "setup"
                                          | "pilot"
                                          | "employee"
                                          | "admin"
                                          | "go-live"
                                      )
                                    }
                                  >
                                    Open Previous Phase
                                  </Button>
                                ) : null}
                                {plannerSelectedRolloutPhaseGate.nextPhase ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setPlannerRolloutPhaseFilter(
                                        plannerSelectedRolloutPhaseGate.nextPhase?.id as
                                          | "setup"
                                          | "pilot"
                                          | "employee"
                                          | "admin"
                                          | "go-live"
                                      )
                                    }
                                  >
                                    Open Next Phase
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setPlannerRolloutPhaseFilter("current")}
                                >
                                  Open Current Phase
                                </Button>
                              </div>
                            </div>
                          ) : null}
                          {plannerSelectedRolloutPhaseTransition ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Transition
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseTransition.transitionLabel}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerSelectedRolloutPhaseTransition.canAdvance
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerSelectedRolloutPhaseTransition.canAdvance
                                      ? "Advance Ready"
                                      : "Advance Blocked"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseTransition}
                                  >
                                    Copy Transition
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Current open: {plannerSelectedRolloutPhaseDetail.tasks.length}
                                </Badge>
                                <Badge variant="outline">
                                  Next open: {plannerSelectedRolloutPhaseTransition.nextPhaseQueueCount}
                                </Badge>
                              </div>
                              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                <div className="rounded-lg border bg-white p-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Current Phase
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-slate-900">
                                    {plannerSelectedRolloutPhaseTransition.currentPhase.label}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseGate?.stateLabel}
                                  </div>
                                </div>
                                <div className="rounded-lg border bg-white p-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Next Phase
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-slate-900">
                                    {plannerSelectedRolloutPhaseTransition.nextPhase?.label || "None"}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseTransition.nextPhase
                                      ? `${plannerSelectedRolloutPhaseTransition.nextPhaseQueueCount} open task(s)`
                                      : "No later rollout phase remains."}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {plannerSelectedRolloutPhaseTransition.nextPhase ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setPlannerRolloutPhaseFilter(
                                        plannerSelectedRolloutPhaseTransition.nextPhase?.id as
                                          | "setup"
                                          | "pilot"
                                          | "employee"
                                          | "admin"
                                          | "go-live"
                                      )
                                    }
                                  >
                                    Open Next Phase Queue
                                  </Button>
                                ) : null}
                                {plannerSelectedRolloutPhaseDetail.tasks[0]?.onClick ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={plannerSelectedRolloutPhaseDetail.tasks[0].onClick}
                                    disabled={Boolean(
                                      plannerSelectedRolloutPhaseDetail.tasks[0].disabled
                                    )}
                                  >
                                    Finish Current Blocker
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                          {plannerSelectedRolloutPhaseReadinessSummary ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Readiness Summary
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseReadinessSummary.phase.label} ·{" "}
                                    {plannerSelectedRolloutPhaseReadinessSummary.gateState}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerSelectedRolloutPhaseReadinessSummary.transitionReady
                                      && plannerSelectedRolloutPhaseReadinessSummary.entryReady
                                      && plannerSelectedRolloutPhaseReadinessSummary.exitReady
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerSelectedRolloutPhaseReadinessSummary.transitionReady
                                      && plannerSelectedRolloutPhaseReadinessSummary.entryReady
                                      && plannerSelectedRolloutPhaseReadinessSummary.exitReady
                                      ? "Phase Ready"
                                      : "Phase Open"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseReadinessSummary}
                                  >
                                    Copy Readiness Summary
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Entry: {plannerSelectedRolloutPhaseReadinessSummary.entryReady ? "Ready" : "Open"}
                                </Badge>
                                <Badge variant="outline">
                                  Exit: {plannerSelectedRolloutPhaseReadinessSummary.exitReady ? "Ready" : "Open"}
                                </Badge>
                                <Badge variant="outline">
                                  Transition: {plannerSelectedRolloutPhaseReadinessSummary.transitionReady ? "Ready" : "Blocked"}
                                </Badge>
                              </div>
                              <div className="mt-3 rounded-lg border bg-white p-3">
                                {plannerSelectedRolloutPhaseReadinessSummary.blockers.length === 0 ? (
                                  <div className="text-xs text-emerald-700">
                                    No readiness blockers remain for this phase.
                                  </div>
                                ) : (
                                  <div className="grid gap-2">
                                    {plannerSelectedRolloutPhaseReadinessSummary.blockers.map((blocker: string) => (
                                      <div
                                        key={blocker}
                                        className="rounded-lg border border-dashed bg-slate-50 p-2 text-xs text-muted-foreground"
                                      >
                                        {blocker}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : null}
                          {plannerSelectedRolloutPhaseActionList ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Action List
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseActionList.phase.label} ·{" "}
                                    {plannerSelectedRolloutPhaseActionList.actions.length} action(s)
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseActionList}
                                  >
                                    Copy Action List
                                  </Button>
                                </div>
                              </div>
                              {plannerSelectedRolloutPhaseActionList.actions.length === 0 ? (
                                <div className="mt-3 rounded-lg border bg-white p-3 text-xs text-emerald-700">
                                  No immediate action remains for this selected phase.
                                </div>
                              ) : (
                                <div className="mt-3 grid gap-2">
                                  {plannerSelectedRolloutPhaseActionList.actions.map((item: any, index: number) => (
                                    <div
                                      key={item.id}
                                      className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <Badge variant="outline">{index + 1}</Badge>
                                          {index === 0 ? (
                                            <Badge variant="secondary">Next</Badge>
                                          ) : null}
                                        </div>
                                        <div className="text-sm font-medium text-slate-900">
                                          {item.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {item.detail}
                                        </div>
                                      </div>
                                      {item.onClick ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={item.onClick}
                                          disabled={Boolean(item.disabled)}
                                        >
                                          {item.actionLabel || "Open"}
                                        </Button>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null}
                          {plannerSelectedRolloutPhaseHandoffPack ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Handoff Pack
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseHandoffPack.phase.label} ·{" "}
                                    {plannerSelectedRolloutPhaseHandoffPack.nextPhase?.label || "No next phase"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerSelectedRolloutPhaseHandoffPack.isReadyToHandoff
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerSelectedRolloutPhaseHandoffPack.isReadyToHandoff
                                      ? "Ready To Handoff"
                                      : "Handoff Open"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseHandoffPack}
                                  >
                                    Copy Phase Pack
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Next open: {plannerSelectedRolloutPhaseHandoffPack.nextPhaseQueueCount}
                                </Badge>
                                <Badge variant="outline">
                                  Current open: {plannerSelectedRolloutPhaseDetail.tasks.length}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {plannerSelectedRolloutPhaseHandoffPack.nextPhase ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setPlannerRolloutPhaseFilter(
                                        plannerSelectedRolloutPhaseHandoffPack.nextPhase?.id as
                                          | "setup"
                                          | "pilot"
                                          | "employee"
                                          | "admin"
                                          | "go-live"
                                      )
                                    }
                                  >
                                    Open Next Phase Queue
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutHandoffPack}
                                >
                                  Copy Full Rollout Pack
                                </Button>
                              </div>
                            </div>
                          ) : null}
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Scoreboard
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Compact note readiness view across the rollout phases.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesScoreboard}
                                >
                                  Copy Notes Scoreboard
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[
                                { id: "all", label: "All" },
                                { id: "missing", label: "Missing" },
                                { id: "stale", label: "Stale" },
                                { id: "noted", label: "Noted" },
                                { id: "current", label: "Current" },
                              ].map((filter) => (
                                <Button
                                  key={filter.id}
                                  type="button"
                                  size="sm"
                                  variant={
                                    plannerRolloutPhaseNotesFilter === filter.id
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    setPlannerRolloutPhaseNotesFilter(
                                      filter.id as
                                        | "all"
                                        | "missing"
                                        | "stale"
                                        | "noted"
                                        | "current"
                                    )
                                  }
                                >
                                  {filter.label}
                                </Button>
                              ))}
                            </div>
                            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                              {plannerRolloutPhaseNotesScoreboard.cards.map((card: any) => (
                                <div key={card.id} className="rounded-lg border bg-white p-3">
                                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {card.label}
                                  </div>
                                  <div className="mt-2 text-lg font-semibold text-slate-900">
                                    {card.value}
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {card.detail}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lanes
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Review rollout note coverage by phase family instead of one flat
                                  note list.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLanes}
                                >
                                  Copy Notes Lanes
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2 xl:grid-cols-3">
                              {plannerRolloutPhaseNotesLanes.lanes.map((lane: any) => (
                                <div key={lane.id} className="rounded-lg border bg-white p-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-medium text-slate-900">
                                      {lane.label}
                                    </div>
                                    {lane.isCurrentLane ? (
                                      <Badge variant="secondary">Current Lane</Badge>
                                    ) : null}
                                    <Badge
                                      variant={
                                        lane.stateLabel === "Ready" ? "secondary" : "outline"
                                      }
                                    >
                                      {lane.stateLabel}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {lane.detail}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Badge variant="outline">
                                      Noted: {lane.notedCount}/{lane.rows.length}
                                    </Badge>
                                    <Badge variant="outline">Missing: {lane.missingCount}</Badge>
                                    <Badge variant="outline">Stale: {lane.staleCount}</Badge>
                                    <Badge variant="outline">Blockers: {lane.blockerCount}</Badge>
                                  </div>
                                  <div className="mt-3 text-xs text-muted-foreground">
                                    Next note: {lane.nextRow?.phaseLabel || "None"}
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setPlannerRolloutPhaseFilter(
                                          (lane.nextRow?.phaseId || lane.rows[0]?.phaseId || "current") as
                                            | "setup"
                                            | "pilot"
                                            | "employee"
                                            | "admin"
                                            | "go-live"
                                            | "current"
                                        )
                                      }
                                    >
                                      Open Lane
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => copyPlannerRolloutPhaseNotesLane(lane)}
                                    >
                                      Copy Lane
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Queue
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Clear rollout note issues lane by lane, not only phase by phase.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Open lane actions: {plannerRolloutPhaseNotesLaneQueue.tasks.length}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneQueue}
                                >
                                  Copy Lane Queue
                                </Button>
                              </div>
                            </div>
                            {plannerRolloutPhaseNotesLaneQueue.tasks.length === 0 ? (
                              <div className="mt-3 rounded-lg border bg-white p-3 text-xs text-muted-foreground">
                                No rollout note lanes need attention.
                              </div>
                            ) : (
                              <div className="mt-3 grid gap-2">
                                {plannerRolloutPhaseNotesLaneQueue.tasks.map((task: any, index: number) => (
                                  <div
                                    key={task.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{index + 1}</Badge>
                                        {task.isNext ? <Badge variant="secondary">Next</Badge> : null}
                                        <Badge
                                          variant={
                                            task.stateLabel === "Missing Notes"
                                              ? "destructive"
                                              : "outline"
                                          }
                                        >
                                          {task.stateLabel}
                                        </Badge>
                                        <Badge variant="outline">
                                          Missing: {task.missingCount}
                                        </Badge>
                                        <Badge variant="outline">Stale: {task.staleCount}</Badge>
                                        <Badge variant="outline">
                                          Blockers: {task.blockerCount}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-medium text-slate-900">
                                        {task.laneLabel}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {task.detail}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Next phase: {task.nextPhaseLabel}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setPlannerRolloutPhaseFilter(
                                          (task.nextPhaseId || "current") as
                                            | "setup"
                                            | "pilot"
                                            | "employee"
                                            | "admin"
                                            | "go-live"
                                            | "current"
                                        )
                                      }
                                    >
                                      Open Lane
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Readiness Summary
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  One compact operational state for the grouped rollout note lanes.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneReadinessSummary.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneReadinessSummary.isReady
                                    ? "Lane Ready"
                                    : "Lane Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneReadinessSummary}
                                >
                                  Copy Lane Summary
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Gate: {plannerRolloutPhaseNotesLaneReadinessSummary.gateState}
                              </Badge>
                              <Badge variant="outline">
                                Transition: {plannerRolloutPhaseNotesLaneReadinessSummary.transitionState}
                              </Badge>
                              <Badge variant="outline">
                                Open lane actions: {plannerRolloutPhaseNotesLaneQueue.tasks.length}
                              </Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneReadinessSummary.blockers.length === 0
                                ? "No lane blockers remain."
                                : plannerRolloutPhaseNotesLaneReadinessSummary.blockers.join("; ")}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Control Summary
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  One compact lane-control state combining entry, exit, gate, and
                                  transition readiness.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneControlSummary.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneControlSummary.isReady
                                    ? "Control Ready"
                                    : "Control Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneControlSummary}
                                >
                                  Copy Lane Control
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Entry: {plannerRolloutPhaseNotesLaneEntryCriteria.readyCount}/
                                {plannerRolloutPhaseNotesLaneEntryCriteria.totalCount}
                              </Badge>
                              <Badge variant="outline">
                                Exit: {plannerRolloutPhaseNotesLaneExitCriteria.readyCount}/
                                {plannerRolloutPhaseNotesLaneExitCriteria.totalCount}
                              </Badge>
                              <Badge variant="outline">
                                Open actions: {plannerRolloutPhaseNotesLaneActionList.actions.length}
                              </Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneControlSummary.blockers.length === 0
                                ? "No lane control blockers remain."
                                : plannerRolloutPhaseNotesLaneControlSummary.blockers.join("; ")}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  One operational decision for the note-lane rollout: hold, clear,
                                  work, advance, or finish.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {plannerRolloutPhaseNotesLaneDecision.stateLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecision}
                                >
                                  Copy Lane Decision
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Target lane: {plannerRolloutPhaseNotesLaneDecision.targetLane?.label || "None"}
                              </Badge>
                              <Badge variant="outline">
                                Next action: {plannerRolloutPhaseNotesLaneDecision.nextAction?.label || "None"}
                              </Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneDecision.detail}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision Action
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  One direct next action derived from the current lane decision.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {plannerRolloutPhaseNotesLaneDecisionAction.actionLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionAction}
                                >
                                  Copy Decision Action
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Decision: {plannerRolloutPhaseNotesLaneDecision.stateLabel}
                              </Badge>
                              <Badge variant="outline">
                                Target phase: {plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (
                                    plannerRolloutPhaseNotesLaneDecision.stateLabel ===
                                    "Lane Stack Clear"
                                  ) {
                                    void copyPlannerRolloutHandoffPack();
                                    return;
                                  }
                                  setPlannerRolloutPhaseFilter(
                                    plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId as
                                      | "setup"
                                      | "pilot"
                                      | "employee"
                                      | "admin"
                                      | "go-live"
                                      | "current",
                                  );
                                }}
                              >
                                {plannerRolloutPhaseNotesLaneDecisionAction.actionLabel}
                              </Button>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneDecision.detail}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision Basis
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Exact basis for why the current lane decision was chosen.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Met: {plannerRolloutPhaseNotesLaneDecisionBasis.metCount}/
                                  {plannerRolloutPhaseNotesLaneDecisionBasis.totalCount}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasis}
                                >
                                  Copy Decision Basis
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              {plannerRolloutPhaseNotesLaneDecisionBasis.criteria.map((criterion: any) => (
                                <div
                                  key={criterion.label}
                                  className="rounded-lg border bg-white p-3 shadow-sm"
                                >
                                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-slate-900">
                                        {criterion.label}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {criterion.detail}
                                      </div>
                                    </div>
                                    <Badge variant={criterion.met ? "secondary" : "outline"}>
                                      {criterion.met ? "Met" : "Open"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision Basis Control
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Compact basis-control state with the first unmet reason still holding the decision open.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady
                                    ? "Basis Ready"
                                    : "Basis Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasisControl}
                                >
                                  Copy Basis Control
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Met: {plannerRolloutPhaseNotesLaneDecisionBasis.metCount}/
                                {plannerRolloutPhaseNotesLaneDecisionBasis.totalCount}
                              </Badge>
                              <Badge variant="outline">
                                Next open basis:{" "}
                                {plannerRolloutPhaseNotesLaneDecisionBasisControl.nextOpenCriterion?.label ||
                                  "None"}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPlannerRolloutPhaseFilter(
                                    plannerRolloutPhaseNotesLaneDecisionAction.targetPhaseId,
                                  )
                                }
                              >
                                {plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady
                                  ? "Open Decision Action"
                                  : "Open Target Phase"}
                              </Button>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneDecisionBasisControl.nextOpenCriterion?.detail ||
                                "All basis criteria are met."}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision Basis Queue
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Ordered open basis items with their direct next action.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Open basis items:{" "}
                                  {plannerRolloutPhaseNotesLaneDecisionBasisQueue.items.length}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasisQueue}
                                >
                                  Copy Basis Queue
                                </Button>
                              </div>
                            </div>
                            {plannerRolloutPhaseNotesLaneDecisionBasisQueue.items.length === 0 ? (
                              <div className="mt-3 text-xs text-muted-foreground">
                                No open basis items remain.
                              </div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {plannerRolloutPhaseNotesLaneDecisionBasisQueue.items.map(
                                  (item: any, index: number) => (
                                    <div
                                      key={item.id}
                                      className="rounded-lg border bg-white p-3 shadow-sm"
                                    >
                                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-1">
                                          <div className="text-sm font-medium text-slate-900">
                                            {index + 1}. {item.label}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {item.detail}
                                          </div>
                                        </div>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            setPlannerRolloutPhaseFilter(item.targetPhaseId)
                                          }
                                        >
                                          {item.actionLabel}
                                        </Button>
                                      </div>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision Basis Gate
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Single gate state for whether the current lane decision basis is actually clear.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneDecisionBasisGate.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneDecisionBasisGate.stateLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasisGate}
                                >
                                  Copy Basis Gate
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Open basis items: {plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount}
                              </Badge>
                              <Badge variant="outline">
                                Next basis item:{" "}
                                {plannerRolloutPhaseNotesLaneDecisionBasisGate.nextOpenItem?.label || "None"}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPlannerRolloutPhaseFilter(
                                    plannerRolloutPhaseNotesLaneDecisionBasisGate.nextOpenItem
                                      ?.targetPhaseId || "current",
                                  )
                                }
                              >
                                {plannerRolloutPhaseNotesLaneDecisionBasisGate.nextOpenItem?.actionLabel ||
                                  "Open Current Lane"}
                              </Button>
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Decision Basis Handoff Pack
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Compact basis handoff snapshot combining the gate, next basis action, and target phase.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.isReady
                                    ? "Basis Ready To Handoff"
                                    : "Basis Handoff Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasisHandoffPack}
                                >
                                  Copy Basis Pack
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Open basis items: {plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount}
                              </Badge>
                              <Badge variant="outline">
                                Target phase: {plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.targetPhaseId}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPlannerRolloutPhaseFilter(
                                    plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.targetPhaseId,
                                  )
                                }
                              >
                                {plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.actionLabel}
                              </Button>
                            </div>
                          </div>
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Notes Lane Decision Basis Readiness Summary
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    One compact basis-level view combining control, gate, transition, and blocker state.
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.isReady
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.isReady
                                      ? "Basis Ready"
                                      : "Basis Open"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary}
                                  >
                                    Copy Basis Summary
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Control: {plannerRolloutPhaseNotesLaneDecisionBasisControl.isReady ? "Ready" : "Open"}
                                </Badge>
                                <Badge variant="outline">
                                  Gate: {plannerRolloutPhaseNotesLaneDecisionBasisGate.stateLabel}
                                </Badge>
                                <Badge variant="outline">
                                  Transition: {plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance ? "Advance Ready" : "Advance Blocked"}
                                </Badge>
                              </div>
                              {plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.blockerLines.length === 0 ? (
                                <div className="mt-3 text-xs text-muted-foreground">
                                  No basis blockers remain.
                                </div>
                              ) : (
                                <div className="mt-3 space-y-2">
                                  {plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummary.blockerLines.map(
                                    (blocker: string, index: number) => (
                                      <div
                                        key={`${blocker}-${index}`}
                                        className="rounded-md border bg-white px-3 py-2 text-xs text-muted-foreground"
                                      >
                                        Blocker {index + 1}: {blocker}
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Notes Lane Decision Basis Transition
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Whether the basis stack is actually ready to move into its target phase.
                                  </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneDecisionBasisTransition.canAdvance
                                    ? "Advance Ready"
                                    : "Advance Blocked"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneDecisionBasisTransition}
                                >
                                  Copy Basis Transition
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Current decision: {plannerRolloutPhaseNotesLaneDecision.stateLabel}
                              </Badge>
                              <Badge variant="outline">
                                Target phase: {plannerRolloutPhaseNotesLaneDecisionBasisTransition.targetPhaseLabel}
                              </Badge>
                              <Badge variant="outline">
                                Open basis items: {plannerRolloutPhaseNotesLaneDecisionBasisGate.openCount}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPlannerRolloutPhaseFilter(
                                    plannerRolloutPhaseNotesLaneDecisionBasisTransition.targetPhaseId,
                                  )
                                }
                              >
                                {plannerRolloutPhaseNotesLaneDecisionBasisHandoffPack.actionLabel}
                              </Button>
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Action List
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Ordered next actions for clearing and advancing the grouped rollout
                                  note lanes.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  Actions: {plannerRolloutPhaseNotesLaneActionList.actions.length}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneActionList}
                                >
                                  Copy Lane Actions
                                </Button>
                              </div>
                            </div>
                            {plannerRolloutPhaseNotesLaneActionList.actions.length === 0 ? (
                              <div className="mt-3 text-xs text-muted-foreground">
                                No immediate lane actions remain.
                              </div>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {plannerRolloutPhaseNotesLaneActionList.actions.map((action: any, index: number) => (
                                  <div
                                    key={action.id}
                                    className="rounded-lg border bg-white p-3 shadow-sm"
                                  >
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                      <div className="space-y-1">
                                        <div className="text-sm font-medium text-slate-900">
                                          {index + 1}. {action.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {action.detail}
                                        </div>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPlannerRolloutPhaseFilter(action.nextPhaseId)}
                                      >
                                        {action.actionLabel}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Entry Criteria
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Exact conditions that should already be true before the next note
                                  lane starts.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneEntryCriteria.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneEntryCriteria.isReady
                                    ? "Entry Ready"
                                    : "Entry Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneEntryCriteria}
                                >
                                  Copy Lane Entry Criteria
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              Target lane:{" "}
                              {plannerRolloutPhaseNotesLaneEntryCriteria.targetLane?.label || "None"} ·{" "}
                              {plannerRolloutPhaseNotesLaneEntryCriteria.readyCount}/
                              {plannerRolloutPhaseNotesLaneEntryCriteria.totalCount} criteria met
                            </div>
                            <div className="mt-3 space-y-2">
                              {plannerRolloutPhaseNotesLaneEntryCriteria.criteria.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="rounded-lg border bg-white p-3 shadow-sm"
                                >
                                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-slate-900">
                                        {item.label}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {item.detail}
                                      </div>
                                    </div>
                                    <Badge variant={item.met ? "secondary" : "outline"}>
                                      {item.met ? "Met" : "Open"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Exit Criteria
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Exact conditions that must be met before the grouped rollout note
                                  lanes can be considered clear.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneExitCriteria.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneExitCriteria.isReady
                                    ? "Exit Ready"
                                    : "Exit Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneExitCriteria}
                                >
                                  Copy Lane Exit Criteria
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneExitCriteria.readyCount}/
                              {plannerRolloutPhaseNotesLaneExitCriteria.totalCount} criteria met
                            </div>
                            <div className="mt-3 space-y-2">
                              {plannerRolloutPhaseNotesLaneExitCriteria.criteria.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="rounded-lg border bg-white p-3 shadow-sm"
                                >
                                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-slate-900">
                                        {item.label}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {item.detail}
                                      </div>
                                    </div>
                                    <Badge variant={item.met ? "secondary" : "outline"}>
                                      {item.met ? "Met" : "Open"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Gate
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Decide whether the grouped rollout note lanes are clear enough
                                  for handoff.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneGate.isReady
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneGate.stateLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneGate}
                                >
                                  Copy Lane Gate
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Missing lanes: {plannerRolloutPhaseNotesLaneGate.missingLaneCount}
                              </Badge>
                              <Badge variant="outline">
                                Stale lanes: {plannerRolloutPhaseNotesLaneGate.staleLaneCount}
                              </Badge>
                              <Badge variant="outline">
                                Next lane: {plannerRolloutPhaseNotesLaneGate.nextTask?.laneLabel || "None"}
                              </Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesLaneGate.blockerLabel}
                            </div>
                            {plannerRolloutPhaseNotesLaneGate.nextTask ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPlannerRolloutPhaseFilter(
                                      (plannerRolloutPhaseNotesLaneGate.nextTask?.nextPhaseId ||
                                        "current") as
                                        | "setup"
                                        | "pilot"
                                        | "employee"
                                        | "admin"
                                        | "go-live"
                                        | "current"
                                    )
                                  }
                                >
                                  Open Next Lane
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Handoff Pack
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  One compact handoff summary for the grouped rollout note lanes.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneHandoffPack.isReadyToHandoff
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneHandoffPack.isReadyToHandoff
                                    ? "Ready To Handoff"
                                    : "Handoff Open"}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneHandoffPack}
                                >
                                  Copy Lane Pack
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Ready lanes: {plannerRolloutPhaseNotesLaneHandoffPack.readyLaneCount}/
                                {plannerRolloutPhaseNotesLaneHandoffPack.totalLaneCount}
                              </Badge>
                              <Badge variant="outline">
                                Open lane actions: {plannerRolloutPhaseNotesLaneQueue.tasks.length}
                              </Badge>
                              <Badge variant="outline">
                                Next lane: {plannerRolloutPhaseNotesLaneHandoffPack.nextTask?.laneLabel || "None"}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {plannerRolloutPhaseNotesLaneHandoffPack.nextTask ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPlannerRolloutPhaseFilter(
                                      (plannerRolloutPhaseNotesLaneHandoffPack.nextTask?.nextPhaseId ||
                                        "current") as
                                        | "setup"
                                        | "pilot"
                                        | "employee"
                                        | "admin"
                                        | "go-live"
                                        | "current"
                                    )
                                  }
                                >
                                  Open Next Lane
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={copyPlannerRolloutHandoffPack}
                              >
                                Copy Full Rollout Pack
                              </Button>
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Lane Transition
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Check whether the grouped note rollout is ready to move into the
                                  next lane.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    plannerRolloutPhaseNotesLaneTransition.canAdvance
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {plannerRolloutPhaseNotesLaneTransition.stateLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesLaneTransition}
                                >
                                  Copy Lane Transition
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Current lane: {plannerRolloutPhaseNotesLaneTransition.currentLane?.label || "None"}
                              </Badge>
                              <Badge variant="outline">
                                Next lane: {plannerRolloutPhaseNotesLaneTransition.nextLane?.label || "None"}
                              </Badge>
                              <Badge variant="outline">
                                Current open: {plannerRolloutPhaseNotesLaneTransition.currentOpenCount}
                              </Badge>
                              <Badge variant="outline">
                                Next open: {plannerRolloutPhaseNotesLaneTransition.nextOpenCount}
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {plannerRolloutPhaseNotesLaneTransition.nextLane ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPlannerRolloutPhaseFilter(
                                      (plannerRolloutPhaseNotesLaneTransition.nextLane?.nextRow?.phaseId ||
                                        plannerRolloutPhaseNotesLaneTransition.nextLane?.rows[0]?.phaseId ||
                                        "current") as
                                        | "setup"
                                        | "pilot"
                                        | "employee"
                                        | "admin"
                                        | "go-live"
                                        | "current"
                                    )
                                  }
                                >
                                  Open Next Lane
                                </Button>
                              ) : null}
                            </div>
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Gate
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Check whether rollout notes are complete enough for handoff and
                                  phase coordination.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={plannerRolloutPhaseNotesGate.isReady ? "secondary" : "outline"}
                                >
                                  {plannerRolloutPhaseNotesGate.stateLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesGate}
                                >
                                  Copy Notes Gate
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Missing: {plannerRolloutPhaseNotesGate.missingRows.length}
                              </Badge>
                              <Badge variant="outline">
                                Stale: {plannerRolloutPhaseNotesGate.staleRows.length}
                              </Badge>
                              <Badge variant="outline">
                                Next: {plannerRolloutPhaseNotesGate.nextRow?.phaseLabel || "None"}
                              </Badge>
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              {plannerRolloutPhaseNotesGate.blockerLabel}
                            </div>
                            {plannerRolloutPhaseNotesGate.nextRow ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPlannerRolloutPhaseFilter(plannerRolloutPhaseNotesGate.nextRow!.phaseId)
                                  }
                                >
                                  Open Next Note
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Queue
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Work the rollout notes in one ordered queue.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">
                                  {filteredPlannerRolloutPhaseNotesRegister.filterLabel}
                                </Badge>
                                <Badge variant="outline">
                                  Open note actions: {filteredPlannerRolloutPhaseNotesQueue.tasks.length}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesQueue}
                                >
                                  Copy Notes Queue
                                </Button>
                              </div>
                            </div>
                            {filteredPlannerRolloutPhaseNotesQueue.tasks.length === 0 ? (
                              <div className="mt-3 rounded-lg border bg-white p-3 text-xs text-muted-foreground">
                                No rollout note actions match this filter.
                              </div>
                            ) : (
                              <div className="mt-3 grid gap-2">
                                {filteredPlannerRolloutPhaseNotesQueue.tasks.map((task: any, index: number) => (
                                  <div
                                    key={task.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">{index + 1}</Badge>
                                        {task.isNext ? <Badge variant="secondary">Next</Badge> : null}
                                        <Badge
                                          variant={
                                            task.statusLabel === "Missing Note"
                                              ? "destructive"
                                              : "outline"
                                          }
                                        >
                                          {task.statusLabel}
                                        </Badge>
                                        <Badge variant="outline">
                                          Blockers: {task.blockerCount}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-medium text-slate-900">
                                        {task.phaseLabel}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {task.detail}
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setPlannerRolloutPhaseFilter(task.phaseId)}
                                    >
                                      Open Note
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Planner Rollout Phase Notes Register
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Track rollout note coverage by the selected filter.
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                  Noted: {plannerRolloutPhaseNotesRegister.notedCount}/
                                  {plannerRolloutPhaseNotesRegister.rows.length}
                                </Badge>
                                <Badge variant="outline">
                                  Missing: {plannerRolloutPhaseNotesRegister.missingCount}
                                </Badge>
                                <Badge variant="outline">
                                  Stale: {plannerRolloutPhaseNotesRegister.staleCount}
                                </Badge>
                                <Badge variant="outline">
                                  View: {filteredPlannerRolloutPhaseNotesRegister.filterLabel}
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={copyPlannerRolloutPhaseNotesRegister}
                                >
                                  Copy Notes Register
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 grid gap-2">
                              {filteredPlannerRolloutPhaseNotesRegister.rows.length === 0 ? (
                                <div className="rounded-lg border bg-white p-3 text-xs text-muted-foreground">
                                  No rollout phase notes match this filter.
                                </div>
                              ) : (
                                filteredPlannerRolloutPhaseNotesRegister.rows.map((row: any) => (
                                <div
                                  key={row.phaseId}
                                  className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="text-sm font-medium text-slate-900">
                                        {row.phaseLabel}
                                      </div>
                                      {row.isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                                      <Badge
                                        variant={
                                          row.noteStatusLabel === "Missing Note"
                                            ? "destructive"
                                            : row.noteStatusLabel === "Stale Note"
                                              ? "outline"
                                              : "secondary"
                                        }
                                      >
                                        {row.noteStatusLabel}
                                      </Badge>
                                      <Badge variant="outline">Blockers: {row.blockerCount}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {row.updatedAt
                                        ? `Updated ${formatPlannerDateTime(row.updatedAt)}${
                                            row.ageDays !== null ? ` · ${row.ageDays} day(s) ago` : ""
                                          }`
                                        : "No saved note yet"}
                                    </div>
                                    <div className="text-xs text-slate-700">
                                      {row.noteText || "No rollout note has been captured for this phase."}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPlannerRolloutPhaseFilter(row.phaseId)}
                                  >
                                    Open Phase
                                  </Button>
                                </div>
                                ))
                              )}
                            </div>
                          </div>
                          {plannerSelectedRolloutPhaseNote ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Notes
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseNote.phaseLabel}
                                    {plannerSelectedRolloutPhaseNote.updatedAt
                                      ? ` · Updated ${formatPlannerDateTime(
                                          plannerSelectedRolloutPhaseNote.updatedAt
                                        )}`
                                      : " · No saved note yet"}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseNote}
                                  >
                                    Copy Note
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={clearPlannerSelectedRolloutPhaseNote}
                                    disabled={!plannerSelectedRolloutPhaseNote.trimmedText}
                                  >
                                    Clear Note
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-3">
                                <Textarea
                                  value={plannerSelectedRolloutPhaseNote.text}
                                  onChange={(event) =>
                                    updatePlannerSelectedRolloutPhaseNote(event.target.value)
                                  }
                                  placeholder="Capture rollout decisions, risks, owner handoff notes, or unresolved assumptions for this phase."
                                  rows={5}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={insertPlannerSelectedRolloutPhaseBlockers}
                                  >
                                    Insert Current Blockers
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={insertPlannerSelectedRolloutPhaseHandoffSummary}
                                  >
                                    Insert Handoff Summary
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {plannerSelectedRolloutPhaseEntryCriteria ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Entry Criteria
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseEntryCriteria.phase.label} ·{" "}
                                    {plannerSelectedRolloutPhaseEntryCriteria.readyCount}/
                                    {plannerSelectedRolloutPhaseEntryCriteria.totalCount} met
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerSelectedRolloutPhaseEntryCriteria.isReady
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerSelectedRolloutPhaseEntryCriteria.isReady
                                      ? "Entry Ready"
                                      : "Entry Open"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseEntryCriteria}
                                  >
                                    Copy Entry Criteria
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2">
                                {plannerSelectedRolloutPhaseEntryCriteria.criteria.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={item.met ? "secondary" : "outline"}>
                                          {item.met ? "Met" : "Open"}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-medium text-slate-900">
                                        {item.label}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {item.detail}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {plannerSelectedRolloutPhaseExitCriteria ? (
                            <div className="mb-3 rounded-lg border border-dashed bg-slate-50 p-3">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                  <div className="text-sm font-medium text-slate-900">
                                    Planner Rollout Phase Exit Criteria
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {plannerSelectedRolloutPhaseExitCriteria.phase.label} ·{" "}
                                    {plannerSelectedRolloutPhaseExitCriteria.readyCount}/
                                    {plannerSelectedRolloutPhaseExitCriteria.totalCount} met
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={
                                      plannerSelectedRolloutPhaseExitCriteria.isReady
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {plannerSelectedRolloutPhaseExitCriteria.isReady
                                      ? "Exit Ready"
                                      : "Exit Open"}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={copyPlannerSelectedRolloutPhaseExitCriteria}
                                  >
                                    Copy Exit Criteria
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 grid gap-2">
                                {plannerSelectedRolloutPhaseExitCriteria.criteria.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={item.met ? "secondary" : "outline"}>
                                          {item.met ? "Met" : "Open"}
                                        </Badge>
                                      </div>
                                      <div className="text-sm font-medium text-slate-900">
                                        {item.label}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {item.detail}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <Suspense fallback={null}>
                            <PlannerWorkspaceRolloutQueuePanel
                              copyPlannerAllRemainingActionsSnapshot={
                                copyPlannerAllRemainingActionsSnapshot
                              }
                              copyPlannerOwnerGateSnapshot={copyPlannerOwnerGateSnapshot}
                              copyPlannerOwnerLaneSnapshot={copyPlannerOwnerLaneSnapshot}
                              copyPlannerRemainingActionsSnapshot={
                                copyPlannerRemainingActionsSnapshot
                              }
                              copyPlannerRolloutCoordinationGate={
                                copyPlannerRolloutCoordinationGate
                              }
                              copyPlannerRolloutHandoffPack={copyPlannerRolloutHandoffPack}
                              copyPlannerSelectedRolloutPhase={copyPlannerSelectedRolloutPhase}
                              filteredPlannerRolloutQueue={filteredPlannerRolloutQueue}
                              plannerRolloutCoordinationGate={plannerRolloutCoordinationGate}
                              plannerRolloutOwnerGate={plannerRolloutOwnerGate}
                              plannerRolloutOwnerLanes={plannerRolloutOwnerLanes}
                              plannerRolloutPhaseFilter={plannerRolloutPhaseFilter}
                              plannerRolloutQueueFilter={plannerRolloutQueueFilter}
                              plannerRolloutQueueSummary={plannerRolloutQueueSummary}
                              plannerRolloutScoreboard={plannerRolloutScoreboard}
                              plannerSelectedRolloutPhaseDetail={
                                plannerSelectedRolloutPhaseDetail
                              }
                              setPlannerRolloutPhaseFilter={setPlannerRolloutPhaseFilter}
                              setPlannerRolloutQueueFilter={setPlannerRolloutQueueFilter}
                            />
                          </Suspense>
                        </div>
                      ) : null}
                <Suspense fallback={null}>
                  <PlannerWorkspaceRolloutReadinessPanel
                    PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY={PLANNER_LAUNCH_SIGNOFF_STORAGE_KEY}
                    PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY={PLANNER_ROLLOUT_PHASE_NOTES_STORAGE_KEY}
                    plannerWorkspaceRolloutResetVersion={plannerWorkspaceRolloutResetVersion}
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
                    timesheetPendingLeaveOverrideBlockQueueRowsCount={
                      timesheetPendingLeaveOverrideBlockQueueRowsCount
                    }
                    timesheetPendingLeaveOverrideQueueRowsCount={
                      timesheetPendingLeaveOverrideQueueRowsCount
                    }
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
                    typedTimesheetMonthStatusEmployeeDeclarationAccepted={
                      typedTimesheetMonthStatusEmployeeDeclarationAccepted
                    }
                    typedTimesheetUserLeaveOverrideBlockRowsCount={
                      typedTimesheetUserLeaveOverrideBlockRowsCount
                    }
                  />
                </Suspense>
              </div>
              </div>
              </div>
    </>
  );
}
