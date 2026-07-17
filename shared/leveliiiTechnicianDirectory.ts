export type TechnicianQuickFilter =
  | "all"
  | "certified"
  | "uncertified"
  | "eye-overdue"
  | "review-overdue";

export type TechnicianRailSort =
  | "compliance-priority"
  | "name"
  | "client"
  | "recent-review"
  | "recent-eye-test";

export type OperatorView =
  | "triage"
  | "missing-evidence"
  | "pending-review"
  | "expired";

export type TechnicianBacklogSummary = {
  technicianId: number;
  technicianName: string;
  clientName: string;
  openItems: number;
  missingEvidence: number;
  pendingReview: number;
  expired: number;
  currentWithoutEvidence: number;
};

export type TechnicianRailSortItem<TTechnician> = {
  technician: TTechnician;
  clientName: string;
  reviewDate: Date | null;
  eyeTestDate: Date | null;
  backlog: TechnicianBacklogSummary | null;
  pressureScore: number;
};

export function computeTechnicianPressureScore(
  backlog: TechnicianBacklogSummary | null | undefined
): number {
  if (!backlog) {
    return 0;
  }

  return (
    backlog.missingEvidence * 400 +
    backlog.pendingReview * 300 +
    backlog.expired * 200 +
    backlog.currentWithoutEvidence * 100 +
    backlog.openItems
  );
}

export function sortTechnicianRailItems<TTechnician extends { name: string }>(
  items: TechnicianRailSortItem<TTechnician>[],
  sort: TechnicianRailSort
): TechnicianRailSortItem<TTechnician>[] {
  return [...items].sort((left, right) => {
    switch (sort) {
      case "compliance-priority":
        return (
          right.pressureScore - left.pressureScore ||
          (right.backlog?.openItems ?? 0) - (left.backlog?.openItems ?? 0) ||
          left.technician.name.localeCompare(right.technician.name)
        );
      case "client":
        return (
          left.clientName.localeCompare(right.clientName) ||
          left.technician.name.localeCompare(right.technician.name)
        );
      case "recent-review":
        return (
          (left.reviewDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (right.reviewDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
          left.technician.name.localeCompare(right.technician.name)
        );
      case "recent-eye-test":
        return (
          (left.eyeTestDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (right.eyeTestDate?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
          left.technician.name.localeCompare(right.technician.name)
        );
      default:
        return left.technician.name.localeCompare(right.technician.name);
    }
  });
}

export function buildOperatorViewConfig(view: OperatorView): {
  queueFilter: "all" | "missing_evidence" | "pending_review" | "expired";
  quickFilter: TechnicianQuickFilter;
  railSort: TechnicianRailSort;
} {
  switch (view) {
    case "missing-evidence":
      return {
        queueFilter: "missing_evidence",
        quickFilter: "all",
        railSort: "compliance-priority",
      };
    case "pending-review":
      return {
        queueFilter: "pending_review",
        quickFilter: "review-overdue",
        railSort: "compliance-priority",
      };
    case "expired":
      return {
        queueFilter: "expired",
        quickFilter: "eye-overdue",
        railSort: "compliance-priority",
      };
    default:
      return {
        queueFilter: "all",
        quickFilter: "all",
        railSort: "compliance-priority",
      };
  }
}
