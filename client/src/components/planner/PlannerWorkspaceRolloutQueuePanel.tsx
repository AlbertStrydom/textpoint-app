import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PlannerWorkspaceRolloutQueuePanelProps = any;

export function PlannerWorkspaceRolloutQueuePanel({
  copyPlannerAllRemainingActionsSnapshot,
  copyPlannerOwnerGateSnapshot,
  copyPlannerOwnerLaneSnapshot,
  copyPlannerRemainingActionsSnapshot,
  copyPlannerRolloutCoordinationGate,
  copyPlannerRolloutHandoffPack,
  copyPlannerSelectedRolloutPhase,
  filteredPlannerRolloutQueue,
  plannerRolloutCoordinationGate,
  plannerRolloutOwnerGate,
  plannerRolloutOwnerLanes,
  plannerRolloutPhaseFilter,
  plannerRolloutQueueFilter,
  plannerRolloutQueueSummary,
  plannerRolloutScoreboard,
  plannerSelectedRolloutPhaseDetail,
  setPlannerRolloutPhaseFilter,
  setPlannerRolloutQueueFilter,
}: PlannerWorkspaceRolloutQueuePanelProps) {
  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="text-sm font-medium text-slate-900">Planner Rollout Phase Queue</div>
          <div className="text-xs text-muted-foreground">
            Focus a single rollout phase without mixing the other phases into the main queue.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "current", label: "Current" },
            { id: "setup", label: "Setup" },
            { id: "pilot", label: "Pilot" },
            { id: "employee", label: "Employee" },
            { id: "admin", label: "Admin" },
            { id: "go-live", label: "Go-Live" },
          ].map((filter) => (
            <Button
              key={`phase-filter-${filter.id}`}
              type="button"
              size="sm"
              variant={plannerRolloutPhaseFilter === filter.id ? "default" : "outline"}
              onClick={() =>
                setPlannerRolloutPhaseFilter(
                  filter.id as "current" | "setup" | "pilot" | "employee" | "admin" | "go-live"
                )
              }
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={plannerSelectedRolloutPhaseDetail.phase.ready ? "secondary" : "outline"}>
          {plannerSelectedRolloutPhaseDetail.phase.label}
        </Badge>
        <Badge variant="outline">{plannerSelectedRolloutPhaseDetail.phase.progressLabel}</Badge>
        <Badge variant="outline">{plannerSelectedRolloutPhaseDetail.tasks.length} open</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={copyPlannerSelectedRolloutPhase}>
          Copy Phase Queue
        </Button>
        {plannerSelectedRolloutPhaseDetail.tasks[0]?.onClick ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={plannerSelectedRolloutPhaseDetail.tasks[0].onClick}
            disabled={Boolean(plannerSelectedRolloutPhaseDetail.tasks[0].disabled)}
          >
            {plannerSelectedRolloutPhaseDetail.tasks[0].actionLabel}
          </Button>
        ) : null}
      </div>
      <div className="mt-3 rounded-lg border border-dashed bg-slate-50 p-3 text-xs text-muted-foreground">
        {plannerSelectedRolloutPhaseDetail.phase.blockerLabel}
      </div>
      {plannerSelectedRolloutPhaseDetail.tasks.length === 0 ? (
        <div className="mt-3 text-sm text-emerald-700">No open tasks remain in this phase.</div>
      ) : (
        <div className="mt-3 grid gap-2">
          {plannerSelectedRolloutPhaseDetail.tasks.map((task: any, index: number) => (
            <div
              key={task.id}
              className="flex items-start justify-between gap-3 rounded-lg border bg-slate-50 p-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{index + 1}</Badge>
                  {index === 0 ? <Badge variant="secondary">Next</Badge> : null}
                </div>
                <div className="text-sm font-medium text-slate-900">{task.label}</div>
                <div className="text-xs text-muted-foreground">{task.detail}</div>
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
      <div className="grid gap-3 lg:grid-cols-5">
        {[
          plannerRolloutScoreboard.overall,
          plannerRolloutScoreboard.employee,
          plannerRolloutScoreboard.admin,
          plannerRolloutScoreboard.setup,
          plannerRolloutScoreboard.pilot,
        ].map((item: any) => (
          <div key={`planner-rollout-score-${item.label}`} className="rounded-lg border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium text-slate-900">{item.label}</div>
              <Badge variant={item.open === 0 ? "secondary" : "outline"}>{item.percent}%</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {item.complete}/{item.total} complete
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.open === 0 ? "No open actions." : `${item.open} open action${item.open === 1 ? "" : "s"}.`}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${item.percent}%` }} />
            </div>
            {item.nextItem ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 w-full"
                onClick={item.nextItem.onClick}
                disabled={item.nextItem.disabled}
              >
                {item.nextItem.actionLabel}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-white p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">Planner Rollout Coordination Gate</div>
            <div className="text-xs text-muted-foreground">
              This is the owner-level rollout state above the employee and admin lanes.
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={plannerRolloutCoordinationGate.isReady ? "secondary" : "outline"}>
                {plannerRolloutCoordinationGate.isReady ? "Coordinated" : "Open"}
              </Badge>
              <Badge variant="outline">{plannerRolloutCoordinationGate.stateLabel}</Badge>
              {plannerRolloutCoordinationGate.nextLane ? (
                <Badge variant="secondary">
                  Next owner: {plannerRolloutCoordinationGate.nextLane.ownerLabel}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {plannerRolloutCoordinationGate.nextLane ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPlannerRolloutQueueFilter(
                    plannerRolloutCoordinationGate.nextLane?.id as "employee" | "admin"
                  )
                }
              >
                Open Next Owner
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={copyPlannerRolloutHandoffPack}>
              Copy Handoff Pack
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyPlannerRolloutCoordinationGate}
            >
              Copy Coordination Gate
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {plannerRolloutOwnerGate.map((lane: any) => (
            <div
              key={`planner-rollout-coordination-${lane.id}`}
              className="rounded-lg border border-dashed bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-900">{lane.label}</div>
                <Badge variant={lane.isReady ? "secondary" : "outline"}>
                  {lane.isReady ? "Ready" : "Open"}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lane.nextTask?.label || "No open actions remain."}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {plannerRolloutOwnerGate.map((lane: any) => (
          <div key={`planner-rollout-gate-${lane.id}`} className="rounded-lg border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-900">{lane.label} Gate</div>
                <div className="text-xs text-muted-foreground">
                  Rollout state for the {lane.ownerLabel.toLowerCase()} side.
                </div>
              </div>
              <Badge variant={lane.isReady ? "secondary" : "outline"}>
                {lane.isReady ? "Ready" : "Open"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">Open {lane.tasks.length}</Badge>
              <Badge variant="outline">Setup {lane.setupCount}</Badge>
              <Badge variant="outline">Pilot {lane.pilotCount}</Badge>
            </div>
            <div className="mt-3 grid gap-3">
              <div className="rounded-lg border border-dashed bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Primary Setup Action
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {lane.primarySetupTask?.label || "No open setup action"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {lane.primarySetupTask?.detail || `${lane.label} setup side is clear.`}
                </div>
              </div>
              <div className="rounded-lg border border-dashed bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Primary Pilot Action
                </div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {lane.primaryPilotTask?.label || "No open pilot action"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {lane.primaryPilotTask?.detail || `${lane.label} pilot side is clear.`}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {lane.blockerText.length === 0 ? (
                <div className="text-xs text-emerald-700">No rollout blockers remain.</div>
              ) : (
                lane.blockerText.map((blocker: string) => (
                  <div key={blocker} className="text-xs text-muted-foreground">
                    - {blocker}
                  </div>
                ))
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lane.primarySetupTask ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={lane.primarySetupTask.onClick}
                  disabled={lane.primarySetupTask.disabled}
                >
                  {lane.primarySetupTask.actionLabel}
                </Button>
              ) : null}
              {!lane.primarySetupTask && lane.primaryPilotTask ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={lane.primaryPilotTask.onClick}
                  disabled={lane.primaryPilotTask.disabled}
                >
                  {lane.primaryPilotTask.actionLabel}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copyPlannerOwnerGateSnapshot(lane.id as "employee" | "admin")}
              >
                Copy Gate
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {plannerRolloutOwnerLanes.map((lane: any) => (
          <div key={lane.id} className="rounded-lg border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-900">{lane.label}</div>
                <div className="text-xs text-muted-foreground">
                  Focused rollout handoff for {lane.ownerLabel.toLowerCase()} actions.
                </div>
              </div>
              <Badge variant={lane.tasks.length === 0 ? "secondary" : "outline"}>
                {lane.tasks.length} open
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">Setup {lane.setupCount}</Badge>
              <Badge variant="outline">Pilot {lane.pilotCount}</Badge>
              {lane.nextTask ? (
                <Badge variant="secondary">Next: {lane.nextTask.typeLabel}</Badge>
              ) : (
                <Badge variant="secondary">Clear</Badge>
              )}
            </div>
            <div className="mt-3 rounded-lg border border-dashed bg-slate-50 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Next Action
              </div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {lane.nextTask?.label || "No open actions"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {lane.nextTask?.detail || `${lane.label} is complete.`}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lane.nextTask ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={lane.nextTask.onClick}
                  disabled={lane.nextTask.disabled}
                >
                  {lane.nextTask.actionLabel}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPlannerRolloutQueueFilter(lane.id as "employee" | "admin")}
              >
                Show Lane
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copyPlannerOwnerLaneSnapshot(lane.id as "employee" | "admin")}
              >
                Copy Lane
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-900">Planner Rollout Queue</div>
        <div className="text-xs text-muted-foreground">
          This is the ordered list of remaining planner rollout actions.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Employee {plannerRolloutQueueSummary.employeeCount}</Badge>
        <Badge variant="outline">Admin {plannerRolloutQueueSummary.adminCount}</Badge>
        <Badge variant="outline">Setup {plannerRolloutQueueSummary.setupCount}</Badge>
        <Badge variant="outline">Pilot {plannerRolloutQueueSummary.pilotCount}</Badge>
        {plannerRolloutQueueSummary.nextOwner ? (
          <Badge variant="secondary">Next owner: {plannerRolloutQueueSummary.nextOwner}</Badge>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "employee", label: "Employee" },
          { id: "admin", label: "Admin" },
          { id: "setup", label: "Setup" },
          { id: "pilot", label: "Pilot" },
        ].map((filter) => (
          <Button
            key={`planner-rollout-filter-${filter.id}`}
            type="button"
            size="sm"
            variant={plannerRolloutQueueFilter === filter.id ? "default" : "outline"}
            onClick={() =>
              setPlannerRolloutQueueFilter(
                filter.id as "all" | "employee" | "admin" | "setup" | "pilot"
              )
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copyPlannerRemainingActionsSnapshot}
        >
          Copy Filtered Actions
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={copyPlannerAllRemainingActionsSnapshot}
        >
          Copy All Actions
        </Button>
      </div>
      {filteredPlannerRolloutQueue.length === 0 ? (
        <div className="rounded-lg border bg-white p-3 text-sm text-emerald-700">
          No rollout actions match the current filter.
        </div>
      ) : (
        <div className="grid gap-2">
          {filteredPlannerRolloutQueue.map((task: any, index: number) => (
            <div
              key={task.id}
              className="flex items-start justify-between gap-3 rounded-lg border bg-white p-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={task.priority === "primary" ? "secondary" : "outline"}>
                    {index + 1}
                  </Badge>
                  <Badge variant="outline">{task.typeLabel}</Badge>
                  <Badge variant="outline">{task.ownerLabel}</Badge>
                  {task.priority === "primary" ? <Badge variant="secondary">Next</Badge> : null}
                </div>
                <div className="text-sm font-medium text-slate-900">{task.label}</div>
                <div className="text-xs text-muted-foreground">{task.detail}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={task.onClick}
                disabled={task.disabled}
              >
                {task.actionLabel}
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
