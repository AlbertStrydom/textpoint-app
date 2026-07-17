type RolloutTaskLike = {
  ownerLabel: string;
  typeLabel: string;
  label: string;
};

type GoLiveGateLike = {
  isReady: boolean;
  setupReady: boolean;
  pilotReady: boolean;
  blockers: string[];
  nextSetupItem?: { label?: string | null } | null;
  nextPilotStep?: { fallbackLabel?: string | null } | null;
  blockedByAdminOnly?: { fallbackLabel?: string | null } | null;
};

type LaunchSignoffSummaryLike = {
  isReady: boolean;
  signedOffCount: number;
  totalCount: number;
};

type PlannerReadinessSummaryLike = {
  readyCount: number;
  totalCount: number;
};

type PilotWalkthroughSummaryLike = {
  completedSteps: number;
  totalSteps: number;
};

type RolloutOwnerGateLike = {
  snapshotText: string;
};

type RolloutSnapshotSection = string | null | undefined;

export function getPlannerRolloutQueueFilterLabel(
  filter: "all" | "employee" | "admin" | "setup" | "pilot"
) {
  switch (filter) {
    case "employee":
      return "Employee";
    case "admin":
      return "Admin";
    case "setup":
      return "Setup";
    case "pilot":
      return "Pilot";
    default:
      return "All";
  }
}

export function buildPlannerRolloutSnapshotText(
  label: string,
  tasks: RolloutTaskLike[]
) {
  const employeeCount = tasks.filter((task) => task.ownerLabel === "Employee").length;
  const adminCount = tasks.filter((task) => task.ownerLabel === "Admin").length;
  const setupCount = tasks.filter((task) => task.typeLabel === "Setup").length;
  const pilotCount = tasks.filter((task) => task.typeLabel === "Pilot").length;
  const lines = [
    `Planner Remaining Actions (${label})`,
    `Open actions: ${tasks.length}`,
    `Employee actions: ${employeeCount}`,
    `Admin actions: ${adminCount}`,
    `Setup actions: ${setupCount}`,
    `Pilot actions: ${pilotCount}`,
  ];
  if (tasks.length === 0) {
    lines.push("No matching rollout actions.");
  } else {
    tasks.forEach((task, index) => {
      lines.push(`${index + 1}. [${task.ownerLabel} / ${task.typeLabel}] ${task.label}`);
    });
  }
  return lines.join("\n");
}

export function buildPlannerGoLiveSnapshotText(args: {
  plannerGoLiveGate: GoLiveGateLike;
  plannerLaunchSignoffSummary: LaunchSignoffSummaryLike;
  plannerPilotWalkthroughSummary: PilotWalkthroughSummaryLike;
  plannerReadinessSummary: PlannerReadinessSummaryLike;
}) {
  const {
    plannerGoLiveGate,
    plannerLaunchSignoffSummary,
    plannerPilotWalkthroughSummary,
    plannerReadinessSummary,
  } = args;
  const lines = [
    "Planner Rollout Snapshot",
    `Overall: ${plannerGoLiveGate.isReady ? "Pilot-ready" : "Not ready yet"}`,
    `Launch sign-off: ${plannerLaunchSignoffSummary.isReady ? "Ready for Go-Live" : "Open"}`,
    `Setup: ${plannerGoLiveGate.setupReady ? "Ready" : "Open"}`,
    `Pilot: ${plannerGoLiveGate.pilotReady ? "Covered" : "Open"}`,
    `Setup readiness: ${plannerReadinessSummary.readyCount}/${plannerReadinessSummary.totalCount}`,
    `Pilot walkthrough: ${plannerPilotWalkthroughSummary.completedSteps}/${plannerPilotWalkthroughSummary.totalSteps}`,
    `Signed off: ${plannerLaunchSignoffSummary.signedOffCount}/${plannerLaunchSignoffSummary.totalCount}`,
  ];
  if (plannerGoLiveGate.blockers.length > 0) {
    lines.push("Blockers:");
    plannerGoLiveGate.blockers.forEach((blocker) => lines.push(`- ${blocker}`));
  } else {
    lines.push("Blockers: none");
  }
  lines.push(`Primary setup action: ${plannerGoLiveGate.nextSetupItem?.label || "None"}`);
  lines.push(
    `Primary pilot action: ${
      plannerGoLiveGate.nextPilotStep?.fallbackLabel ||
      plannerGoLiveGate.blockedByAdminOnly?.fallbackLabel ||
      "None"
    }`
  );
  return lines.join("\n");
}

export function buildPlannerRolloutHandoffPackText(args: {
  plannerGoLiveSnapshotText: string;
  plannerRolloutPhasesSnapshotText: string;
  plannerCurrentRolloutPhaseSnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseGateSnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseTransitionSnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseReadinessSummarySnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseActionListSnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseHandoffPackSnapshotText?: RolloutSnapshotSection;
  plannerRolloutPhaseNotesScoreboardSnapshotText: string;
  plannerRolloutPhaseNotesLanesSnapshotText: string;
  plannerRolloutPhaseNotesLaneReadinessSummarySnapshotText: string;
  plannerRolloutPhaseNotesLaneControlSummarySnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionActionSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisControlSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisQueueSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisGateSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisHandoffPackSnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummarySnapshotText: string;
  plannerRolloutPhaseNotesLaneDecisionBasisTransitionSnapshotText: string;
  plannerRolloutPhaseNotesLaneActionListSnapshotText: string;
  plannerRolloutPhaseNotesLaneEntryCriteriaSnapshotText: string;
  plannerRolloutPhaseNotesLaneExitCriteriaSnapshotText: string;
  plannerRolloutPhaseNotesLaneGateSnapshotText: string;
  plannerRolloutPhaseNotesLaneTransitionSnapshotText: string;
  plannerRolloutPhaseNotesLaneHandoffPackSnapshotText: string;
  plannerRolloutPhaseNotesLaneQueueSnapshotText: string;
  plannerRolloutPhaseNotesGateSnapshotText: string;
  filteredPlannerRolloutPhaseNotesQueueSnapshotText: string;
  filteredPlannerRolloutPhaseNotesRegisterSnapshotText: string;
  plannerSelectedRolloutPhaseNoteSnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseEntryCriteriaSnapshotText?: RolloutSnapshotSection;
  plannerSelectedRolloutPhaseExitCriteriaSnapshotText?: RolloutSnapshotSection;
  plannerRolloutCoordinationGateSnapshotText: string;
  plannerRolloutOwnerGates: RolloutOwnerGateLike[];
  plannerRemainingActionsSnapshotText: string;
}) {
  const lines = [
    "Planner Rollout Handoff Pack",
    "",
    args.plannerGoLiveSnapshotText,
    "",
    args.plannerRolloutPhasesSnapshotText,
    "",
    args.plannerCurrentRolloutPhaseSnapshotText || "Current Planner Rollout Phase: none",
    "",
    args.plannerSelectedRolloutPhaseGateSnapshotText || "Planner Rollout Phase Gate: none",
    "",
    args.plannerSelectedRolloutPhaseTransitionSnapshotText ||
      "Planner Rollout Phase Transition: none",
    "",
    args.plannerSelectedRolloutPhaseReadinessSummarySnapshotText ||
      "Planner Rollout Phase Readiness Summary: none",
    "",
    args.plannerSelectedRolloutPhaseActionListSnapshotText ||
      "Planner Rollout Phase Action List: none",
    "",
    args.plannerSelectedRolloutPhaseHandoffPackSnapshotText ||
      "Planner Rollout Phase Handoff Pack: none",
    "",
    args.plannerRolloutPhaseNotesScoreboardSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLanesSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneReadinessSummarySnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneControlSummarySnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionActionSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisControlSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisQueueSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisGateSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisHandoffPackSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisReadinessSummarySnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneDecisionBasisTransitionSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneActionListSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneEntryCriteriaSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneExitCriteriaSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneGateSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneTransitionSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneHandoffPackSnapshotText,
    "",
    args.plannerRolloutPhaseNotesLaneQueueSnapshotText,
    "",
    args.plannerRolloutPhaseNotesGateSnapshotText,
    "",
    args.filteredPlannerRolloutPhaseNotesQueueSnapshotText,
    "",
    args.filteredPlannerRolloutPhaseNotesRegisterSnapshotText,
    "",
    args.plannerSelectedRolloutPhaseNoteSnapshotText || "Planner Rollout Phase Note: none",
    "",
    args.plannerSelectedRolloutPhaseEntryCriteriaSnapshotText ||
      "Planner Rollout Phase Entry Criteria: none",
    "",
    args.plannerSelectedRolloutPhaseExitCriteriaSnapshotText ||
      "Planner Rollout Phase Exit Criteria: none",
    "",
    args.plannerRolloutCoordinationGateSnapshotText,
    "",
    ...args.plannerRolloutOwnerGates.flatMap((lane, index) => [
      lane.snapshotText,
      ...(index < args.plannerRolloutOwnerGates.length - 1 ? [""] : []),
    ]),
    "",
    args.plannerRemainingActionsSnapshotText,
  ];
  return lines.join("\n");
}
