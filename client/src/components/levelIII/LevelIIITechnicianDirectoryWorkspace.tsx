import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Edit2, Trash2 } from "lucide-react";
import { TechnicianCertificatesPanel } from "@/components/levelIII/TechnicianCertificatesPanel";
import { TechnicianComplianceWorkspacePanel } from "@/components/levelIII/TechnicianComplianceWorkspacePanel";
import {
  buildOperatorViewConfig,
  computeTechnicianPressureScore,
  sortTechnicianRailItems,
  type OperatorView,
  type TechnicianQuickFilter,
  type TechnicianRailSort,
} from "@shared/leveliiiTechnicianDirectory";

const RECENT_TECHNICIAN_STORAGE_KEY = "textpoint.leveliii.recent-technicians";
const RECENT_TECHNICIAN_LIMIT = 6;
const GROUPED_CLIENT_PAGE_SIZE = 9;
const TECHNICIAN_RAIL_PAGE_SIZE = 8;
const URGENT_TECHNICIAN_LIMIT = 5;
const CLIENT_PRESSURE_CARD_LIMIT = 6;
const WORKSPACE_SHORTLIST_LIMIT = 6;

type LevelIIITechnicianDirectoryWorkspaceProps = {
  props: any;
};

export function LevelIIITechnicianDirectoryWorkspace({
  props,
}: LevelIIITechnicianDirectoryWorkspaceProps) {
  const finderRef = useRef<HTMLDivElement | null>(null);
  const [recentTechnicianIds, setRecentTechnicianIds] = useState<number[]>([]);
  const [clientNavigatorSearch, setClientNavigatorSearch] = useState("");
  const [showOnlyClientsWithTechnicians, setShowOnlyClientsWithTechnicians] = useState(true);
  const [groupedClientPage, setGroupedClientPage] = useState(1);
  const [technicianQuickFilter, setTechnicianQuickFilter] =
    useState<TechnicianQuickFilter>("all");
  const [technicianRailSort, setTechnicianRailSort] =
    useState<TechnicianRailSort>("compliance-priority");
  const [technicianRailPage, setTechnicianRailPage] = useState(1);
  const visibleTechnicianClients = Array.isArray(props.visibleTechnicianClients)
    ? props.visibleTechnicianClients
    : [];
  const filteredTechnicians = Array.isArray(props.filteredTechnicians)
    ? props.filteredTechnicians
    : [];
  const today = useMemo(() => new Date(), []);
  const workspaceFilteredTechnicians = useMemo(
    () =>
      filteredTechnicians.filter((technician: any) => {
        const hasCertificate = props.latestTechnicianCertificateByTechnicianId.has(technician.id);
        const eyeTestDate = technician.eyeTestValidUntil
          ? new Date(technician.eyeTestValidUntil)
          : null;
        const qualificationReviewRaw = props.getQualificationReviewDate(technician);
        const qualificationReviewDate = qualificationReviewRaw
          ? new Date(qualificationReviewRaw)
          : null;
        const eyeOverdue =
          eyeTestDate instanceof Date &&
          !Number.isNaN(eyeTestDate.getTime()) &&
          eyeTestDate.getTime() < today.getTime();
        const reviewOverdue =
          qualificationReviewDate instanceof Date &&
          !Number.isNaN(qualificationReviewDate.getTime()) &&
          qualificationReviewDate.getTime() < today.getTime();

        switch (technicianQuickFilter) {
          case "certified":
            return hasCertificate;
          case "uncertified":
            return !hasCertificate;
          case "eye-overdue":
            return eyeOverdue;
          case "review-overdue":
            return reviewOverdue;
          default:
            return true;
        }
      }),
    [filteredTechnicians, props, technicianQuickFilter, today]
  );
  const selectedTechnicianContext = props.selectedComplianceTechnician
    ? {
        clientName:
          props.clients?.find(
            (client: any) => client.id === props.selectedComplianceTechnician.clientId
          )?.companyName ?? "Unassigned client",
        methods: props.formatMethods(
          props.getTechnicianMethods(props.selectedComplianceTechnician)
        ),
        levels: props.formatTechnicianLevels(props.selectedComplianceTechnician),
        hasCertificate: props.latestTechnicianCertificateByTechnicianId.has(
          props.selectedComplianceTechnician.id
        ),
      }
    : null;
  const technicianDirectorySummary = useMemo(
    () => ({
      totalTechnicians: workspaceFilteredTechnicians.length,
      visibleClients: visibleTechnicianClients.filter((client: any) =>
        workspaceFilteredTechnicians.some(
          (technician: any) => technician.clientId === client.id
        )
      ).length,
      withCertificates: workspaceFilteredTechnicians.filter((technician: any) =>
        props.latestTechnicianCertificateByTechnicianId.has(technician.id)
      ).length,
      selectedClientLabel:
        props.selectedClientFilter === "all"
          ? "All clients"
          : props.clients?.find(
              (client: any) =>
                client.id === Number.parseInt(props.selectedClientFilter, 10)
            )?.companyName ?? "Filtered client",
    }),
    [props, visibleTechnicianClients, workspaceFilteredTechnicians]
  );
  const technicianJumpOptions = workspaceFilteredTechnicians
    .map((technician: any) => ({
      id: technician.id,
      name: technician.name,
      clientName:
        props.clients?.find((client: any) => client.id === technician.clientId)?.companyName ??
        "Unassigned client",
      methods: props.formatMethods(props.getTechnicianMethods(technician)),
      levels: props.formatTechnicianLevels(technician),
      hasCertificate: props.latestTechnicianCertificateByTechnicianId.has(technician.id),
    }))
    .sort((left: any, right: any) => left.name.localeCompare(right.name));
  const recentTechnicianOptions = useMemo(
    () =>
      recentTechnicianIds
        .map((technicianId) => technicianJumpOptions.find((option: any) => option.id === technicianId) ?? null)
        .filter(Boolean),
    [recentTechnicianIds, technicianJumpOptions]
  );
  const clientDirectoryItems = useMemo(
    () =>
      visibleTechnicianClients
        .map((client: any) => {
          const clientTechnicians = workspaceFilteredTechnicians.filter(
            (technician: any) => technician.clientId === client.id
          );
          const methodSet = new Set<string>();
          let certifiedCount = 0;

          clientTechnicians.forEach((technician: any) => {
            props.getTechnicianMethods(technician).forEach((method: string) => {
              if (method) {
                methodSet.add(method);
              }
            });
            if (props.latestTechnicianCertificateByTechnicianId.has(technician.id)) {
              certifiedCount += 1;
            }
          });

          return {
            id: client.id,
            companyName: client.companyName,
            technicians: clientTechnicians,
            technicianCount: clientTechnicians.length,
            certifiedCount,
            methodCount: methodSet.size,
          };
        })
        .sort((left: any, right: any) => left.companyName.localeCompare(right.companyName)),
    [props, visibleTechnicianClients, workspaceFilteredTechnicians]
  );
  const filteredClientDirectoryItems = useMemo(() => {
    const searchTerm = clientNavigatorSearch.trim().toLowerCase();
    return clientDirectoryItems.filter((item: any) => {
      if (showOnlyClientsWithTechnicians && item.technicianCount === 0) {
        return false;
      }
      if (!searchTerm) {
        return true;
      }
      return (
        item.companyName.toLowerCase().includes(searchTerm) ||
        item.technicians.some((technician: any) =>
          technician.name.toLowerCase().includes(searchTerm)
        )
      );
    });
  }, [clientDirectoryItems, clientNavigatorSearch, showOnlyClientsWithTechnicians]);
  const pagedGroupedClientItems = useMemo(
    () => filteredClientDirectoryItems.slice(0, groupedClientPage * GROUPED_CLIENT_PAGE_SIZE),
    [filteredClientDirectoryItems, groupedClientPage]
  );
  const hasMoreGroupedClients =
    pagedGroupedClientItems.length < filteredClientDirectoryItems.length;
  const quickFilterOptions = [
    { id: "all", label: "All", count: filteredTechnicians.length },
    {
      id: "certified",
      label: "Certified",
      count: filteredTechnicians.filter((technician: any) =>
        props.latestTechnicianCertificateByTechnicianId.has(technician.id)
      ).length,
    },
    {
      id: "uncertified",
      label: "No Certificate",
      count: filteredTechnicians.filter(
        (technician: any) => !props.latestTechnicianCertificateByTechnicianId.has(technician.id)
      ).length,
    },
    {
      id: "eye-overdue",
      label: "Eye Test Overdue",
      count: filteredTechnicians.filter((technician: any) => {
        if (!technician.eyeTestValidUntil) {
          return false;
        }
        const date = new Date(technician.eyeTestValidUntil);
        return !Number.isNaN(date.getTime()) && date.getTime() < today.getTime();
      }).length,
    },
    {
      id: "review-overdue",
      label: "Review Overdue",
      count: filteredTechnicians.filter((technician: any) => {
        const raw = props.getQualificationReviewDate(technician);
        if (!raw) {
          return false;
        }
        const date = new Date(raw);
        return !Number.isNaN(date.getTime()) && date.getTime() < today.getTime();
      }).length,
    },
  ] as const;
  const sortedTechnicianRailItems = useMemo(() => {
    const backlogByTechnicianId = new Map<number, any>(
      (Array.isArray(props.technicianComplianceBacklogSummary)
        ? props.technicianComplianceBacklogSummary
        : []
      ).map((item: any) => [item.technicianId, item])
    );
    const items = workspaceFilteredTechnicians
      .map((technician: any) => {
        const clientName =
          props.clients?.find((client: any) => client.id === technician.clientId)
            ?.companyName ?? "Unassigned client";
        const reviewDate = props.getQualificationReviewDate(technician);
        const backlog = backlogByTechnicianId.get(technician.id) ?? null;
        const pressureScore = computeTechnicianPressureScore(backlog);
        return {
          technician,
          clientName,
          reviewDate: reviewDate ? new Date(reviewDate) : null,
          eyeTestDate: technician.eyeTestValidUntil
            ? new Date(technician.eyeTestValidUntil)
            : null,
          backlog,
          pressureScore,
        };
      })
    return sortTechnicianRailItems(items, technicianRailSort);
  }, [props, technicianRailSort, workspaceFilteredTechnicians]);
  const technicianRailTotalPages = Math.max(
    1,
    Math.ceil(sortedTechnicianRailItems.length / TECHNICIAN_RAIL_PAGE_SIZE)
  );
  const pagedTechnicianRailItems = useMemo(() => {
    const start = (technicianRailPage - 1) * TECHNICIAN_RAIL_PAGE_SIZE;
    return sortedTechnicianRailItems.slice(start, start + TECHNICIAN_RAIL_PAGE_SIZE);
  }, [sortedTechnicianRailItems, technicianRailPage]);
  const urgentTechnicianItems = useMemo(
    () =>
      sortedTechnicianRailItems
        .filter((item: any) => (item.backlog?.openItems ?? 0) > 0)
        .slice(0, URGENT_TECHNICIAN_LIMIT),
    [sortedTechnicianRailItems]
  );
  const clientPressureItems = useMemo(
    () =>
      (Array.isArray(props.clientComplianceBacklogSummary)
        ? props.clientComplianceBacklogSummary
        : []
      ).slice(0, CLIENT_PRESSURE_CARD_LIMIT),
    [props.clientComplianceBacklogSummary]
  );
  const workspaceShortlistItems = useMemo(() => {
    const searchTerm = String(props.technicianSearch ?? "").trim().toLowerCase();
    return [...sortedTechnicianRailItems]
      .sort((left: any, right: any) => {
        const leftName = String(left.technician.name ?? "").toLowerCase();
        const rightName = String(right.technician.name ?? "").toLowerCase();
        const leftClient = String(left.clientName ?? "").toLowerCase();
        const rightClient = String(right.clientName ?? "").toLowerCase();
        const leftSelected = props.selectedComplianceTechnician?.id === left.technician.id ? 1 : 0;
        const rightSelected = props.selectedComplianceTechnician?.id === right.technician.id ? 1 : 0;
        if (rightSelected !== leftSelected) {
          return rightSelected - leftSelected;
        }
        if (searchTerm) {
          const leftPrefix =
            leftName.startsWith(searchTerm) || leftClient.startsWith(searchTerm) ? 1 : 0;
          const rightPrefix =
            rightName.startsWith(searchTerm) || rightClient.startsWith(searchTerm) ? 1 : 0;
          if (rightPrefix !== leftPrefix) {
            return rightPrefix - leftPrefix;
          }
          const leftContains =
            leftName.includes(searchTerm) || leftClient.includes(searchTerm) ? 1 : 0;
          const rightContains =
            rightName.includes(searchTerm) || rightClient.includes(searchTerm) ? 1 : 0;
          if (rightContains !== leftContains) {
            return rightContains - leftContains;
          }
        }
        return right.pressureScore - left.pressureScore;
      })
      .slice(0, WORKSPACE_SHORTLIST_LIMIT);
  }, [
    props.selectedComplianceTechnician?.id,
    props.technicianSearch,
    sortedTechnicianRailItems,
  ]);
  const workspaceLaneLabel = useMemo(() => {
    const activeClient =
      props.selectedClientFilter === "all"
        ? null
        : props.clients?.find(
            (client: any) => client.id === Number.parseInt(props.selectedClientFilter, 10)
          ) ?? null;
    if (activeClient?.companyName) {
      return `${activeClient.companyName} workspace`;
    }
    if (String(props.technicianSearch ?? "").trim()) {
      return `Search: ${String(props.technicianSearch).trim()}`;
    }
    return "Current Level III scope";
  }, [props.clients, props.selectedClientFilter, props.technicianSearch]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(RECENT_TECHNICIAN_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentTechnicianIds(
          parsed
            .map((value) => Number.parseInt(String(value), 10))
            .filter((value) => Number.isFinite(value))
            .slice(0, RECENT_TECHNICIAN_LIMIT)
        );
      }
    } catch {
      setRecentTechnicianIds([]);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !isTypingTarget)) {
        event.preventDefault();
        const input = finderRef.current?.querySelector("input");
        if (input instanceof HTMLInputElement) {
          input.focus();
          input.select();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setGroupedClientPage(1);
  }, [clientNavigatorSearch, props.selectedClientFilter, props.technicianSearch, showOnlyClientsWithTechnicians]);

  useEffect(() => {
    setTechnicianRailPage(1);
  }, [clientNavigatorSearch, props.selectedClientFilter, props.technicianSearch, technicianQuickFilter, technicianRailSort]);

  const openTechnicianWorkspace = (technicianId: number) => {
    if (!Number.isFinite(technicianId)) {
      return;
    }
    setRecentTechnicianIds((current) => {
      const next = [technicianId, ...current.filter((value) => value !== technicianId)].slice(
        0,
        RECENT_TECHNICIAN_LIMIT
      );
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENT_TECHNICIAN_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
    props.openTechnicianComplianceWorkspace(technicianId);
  };
  const applyOperatorView = (view: OperatorView) => {
    const config = buildOperatorViewConfig(view);
    setTechnicianRailSort(config.railSort);
    props.setSelectedTechnicianQueueFilter(config.queueFilter);
    setTechnicianQuickFilter(config.quickFilter);
  };

  return (
    <>
      {workspaceFilteredTechnicians.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No technicians or clients match the current search and filter.
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-3">
              {[ 
                ["Visible Technicians", technicianDirectorySummary.totalTechnicians],
                ["Visible Clients", technicianDirectorySummary.visibleClients],
                ["With Certificates", technicianDirectorySummary.withCertificates],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value as number}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <p className="text-sm text-muted-foreground">
                Scope: {technicianDirectorySummary.selectedClientLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={
                    props.technicianDirectoryView === "grouped"
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => props.setTechnicianDirectoryView("grouped")}
                >
                  Grouped Cards
                </Button>
                <Button
                  type="button"
                  variant={
                    props.technicianDirectoryView === "table"
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => props.setTechnicianDirectoryView("table")}
                >
                  Dense Table
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border bg-muted/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium">Technician quick filters</p>
                <p className="text-xs text-muted-foreground">
                  Narrow the directory by certificate and renewal status before opening a record.
                </p>
              </div>
              <Badge variant="outline">
                {workspaceFilteredTechnicians.length} visible technician
                {workspaceFilteredTechnicians.length === 1 ? "" : "s"}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickFilterOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={
                    technicianQuickFilter === option.id ? "secondary" : "outline"
                  }
                  onClick={() =>
                    setTechnicianQuickFilter(option.id as TechnicianQuickFilter)
                  }
                >
                  {option.label} ({option.count})
                </Button>
              ))}
            </div>
          </div>
          {selectedTechnicianContext ? (
            <div className="mt-4 rounded-xl border bg-primary/5 p-4">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase text-muted-foreground">
                    Pinned Technician Workspace
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">
                      {props.selectedComplianceTechnician.name}
                    </p>
                    <Badge variant="outline">{selectedTechnicianContext.clientName}</Badge>
                    <Badge
                      variant={
                        selectedTechnicianContext.hasCertificate ? "secondary" : "outline"
                      }
                    >
                      {selectedTechnicianContext.hasCertificate
                        ? "Has certificate"
                        : "No certificate"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedTechnicianContext.methods || "No methods captured"} |{" "}
                    {selectedTechnicianContext.levels || "No levels captured"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      openTechnicianWorkspace(props.selectedComplianceTechnician.id)
                    }
                  >
                    Reopen Workspace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      props.openNewTechnicianCertificateForm(
                        props.selectedComplianceTechnician
                      )
                    }
                  >
                    Issue Certificate
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="rounded-xl border bg-muted/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Urgent technicians</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Highest-pressure technician document queues across the current Level III scope.
                  </p>
                </div>
                <Badge variant="outline">
                  {urgentTechnicianItems.length} urgent
                </Badge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                {urgentTechnicianItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No technician compliance pressure is active for the current scope.
                  </div>
                ) : (
                  urgentTechnicianItems.map((item: any) => (
                    <div
                      key={`urgent-tech-${item.technician.id}`}
                      className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{item.technician.name}</p>
                          <p className="text-xs text-muted-foreground">{item.clientName}</p>
                        </div>
                        <Badge variant="destructive">
                          {item.backlog.openItems} open
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        {item.backlog.missingEvidence > 0 ? (
                          <Badge variant="outline">
                            Missing {item.backlog.missingEvidence}
                          </Badge>
                        ) : null}
                        {item.backlog.pendingReview > 0 ? (
                          <Badge variant="outline">
                            Pending {item.backlog.pendingReview}
                          </Badge>
                        ) : null}
                        {item.backlog.expired > 0 ? (
                          <Badge variant="outline">
                            Expired {item.backlog.expired}
                          </Badge>
                        ) : null}
                        {item.backlog.currentWithoutEvidence > 0 ? (
                          <Badge variant="outline">
                            Current/no file {item.backlog.currentWithoutEvidence}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            props.openNextTechnicianComplianceQueueItem(
                              item.technician.id,
                              "upload"
                            )
                          }
                        >
                          Upload Next
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            props.openNextTechnicianComplianceQueueItem(
                              item.technician.id,
                              "record"
                            )
                          }
                        >
                          Open Next
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openTechnicianWorkspace(item.technician.id)}
                        >
                          Open Workspace
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border bg-muted/10 p-4">
                <p className="text-sm font-medium">Saved operator views</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Switch the directory into common Level III working modes.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      props.selectedTechnicianQueueFilter === "all" &&
                      technicianRailSort === "compliance-priority"
                        ? "secondary"
                        : "outline"
                    }
                    onClick={() => applyOperatorView("triage")}
                  >
                    Triage
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      props.selectedTechnicianQueueFilter === "missing_evidence"
                        ? "secondary"
                        : "outline"
                    }
                    onClick={() => applyOperatorView("missing-evidence")}
                  >
                    Missing Evidence
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      props.selectedTechnicianQueueFilter === "pending_review"
                        ? "secondary"
                        : "outline"
                    }
                    onClick={() => applyOperatorView("pending-review")}
                  >
                    Pending Review
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      props.selectedTechnicianQueueFilter === "expired"
                        ? "secondary"
                        : "outline"
                    }
                    onClick={() => applyOperatorView("expired")}
                  >
                    Expired
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border bg-muted/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Client pressure cards</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Highest-pressure clients based on open technician document queue items.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {clientPressureItems.length} client
                    {clientPressureItems.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {clientPressureItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      No client-level document pressure is active right now.
                    </div>
                  ) : (
                    clientPressureItems.map((item: any) => (
                      <div
                        key={`client-pressure-${item.clientId}`}
                        className="rounded-lg border bg-background p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.openItems} open technician queue item
                              {item.openItems === 1 ? "" : "s"}
                            </p>
                          </div>
                          <Badge variant="destructive">{item.openItems}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          {item.missingEvidence > 0 ? (
                            <Badge variant="outline">
                              Missing {item.missingEvidence}
                            </Badge>
                          ) : null}
                          {item.pendingReview > 0 ? (
                            <Badge variant="outline">
                              Pending {item.pendingReview}
                            </Badge>
                          ) : null}
                          {item.expired > 0 ? (
                            <Badge variant="outline">
                              Expired {item.expired}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              props.openNextClientComplianceQueueItem(
                                item.clientId,
                                "upload"
                              )
                            }
                          >
                            Upload Next
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              props.openNextClientComplianceQueueItem(
                                item.clientId,
                                "record"
                              )
                            }
                          >
                            Open Next
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              props.handleTechnicianClientFilterChange(
                                String(item.clientId)
                              )
                            }
                          >
                            Filter Client
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          {recentTechnicianOptions.length > 0 ? (
            <div className="mt-4 rounded-xl border bg-muted/10 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium">Recent technicians</p>
                  <p className="text-xs text-muted-foreground">
                    Reopen the last workspaces you touched without searching again.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRecentTechnicianIds([]);
                    if (typeof window !== "undefined") {
                      window.localStorage.removeItem(RECENT_TECHNICIAN_STORAGE_KEY);
                    }
                  }}
                >
                  Clear recent
                </Button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {recentTechnicianOptions.map((option: any) => (
                  <button
                    key={`recent-card-${option.id}`}
                    type="button"
                    onClick={() => openTechnicianWorkspace(option.id)}
                    className="rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{option.name}</p>
                      <Badge variant="outline">Recent</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.clientName}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {option.methods || "No methods captured"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.levels || "No levels captured"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 border-t pt-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.05fr)_minmax(260px,0.9fr)]">
            <div className="rounded-xl border bg-muted/10">
              <div className="border-b px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Technician Finder</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded border px-2 py-0.5">Ctrl/Cmd + K</span>
                    <span className="rounded border px-2 py-0.5">/</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Search by technician, client, method, or level and open the workspace directly.
                </p>
              </div>
              <Command ref={finderRef} className="bg-transparent">
                <CommandInput placeholder="Find technician workspace..." />
                <CommandList className="max-h-[280px]">
                  <CommandEmpty>No technician matches the current filter.</CommandEmpty>
                  {recentTechnicianOptions.length > 0 ? (
                    <CommandGroup heading={`Recent technicians (${recentTechnicianOptions.length})`}>
                      {recentTechnicianOptions.map((option: any) => (
                        <CommandItem
                          key={`recent-${option.id}`}
                          value={`recent ${option.name} ${option.clientName} ${option.methods} ${option.levels}`}
                          onSelect={() => openTechnicianWorkspace(option.id)}
                          className="items-start py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{option.name}</span>
                              <Badge variant="outline">Recent</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {option.clientName} | {option.methods || "No methods captured"} |{" "}
                              {option.levels || "No levels captured"}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                  <CommandGroup heading={`Available technicians (${technicianJumpOptions.length})`}>
                    {technicianJumpOptions.map((option: any) => (
                      <CommandItem
                        key={option.id}
                        value={`${option.name} ${option.clientName} ${option.methods} ${option.levels}`}
                        onSelect={() => openTechnicianWorkspace(option.id)}
                        className="items-start py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{option.name}</span>
                            <Badge variant={option.hasCertificate ? "secondary" : "outline"}>
                              {option.hasCertificate ? "Has certificate" : "No certificate"}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {option.clientName} | {option.methods || "No methods captured"} |{" "}
                            {option.levels || "No levels captured"}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <div className="rounded-xl border bg-muted/10 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Workspace shortlist</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    The fastest technicians to reopen inside the current client and search scope.
                  </p>
                </div>
                <Badge variant="outline">
                  {workspaceShortlistItems.length} visible
                </Badge>
              </div>
              <div className="mt-3 rounded-lg border bg-background px-3 py-2">
                <p className="text-xs uppercase text-muted-foreground">Scope lane</p>
                <p className="mt-1 text-sm font-medium">{workspaceLaneLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {workspaceFilteredTechnicians.length} technician
                  {workspaceFilteredTechnicians.length === 1 ? "" : "s"} after current filters
                </p>
              </div>
              <div className="mt-3 space-y-2">
                {workspaceShortlistItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No technicians are available in the current scope.
                  </div>
                ) : (
                  workspaceShortlistItems.map((item: any, index: number) => (
                    <div
                      key={`workspace-shortlist-${item.technician.id}`}
                      className={`rounded-lg border p-3 ${
                        props.selectedComplianceTechnician?.id === item.technician.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "bg-background"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.technician.name}</p>
                            <Badge variant="outline">#{index + 1}</Badge>
                            {props.selectedComplianceTechnician?.id === item.technician.id ? (
                              <Badge variant="secondary">Open</Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {item.clientName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {props.formatMethods(props.getTechnicianMethods(item.technician)) ||
                              "No methods captured"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            (item.backlog?.openItems ?? 0) > 0 ? "destructive" : "outline"
                          }
                        >
                          {(item.backlog?.openItems ?? 0) > 0
                            ? `${item.backlog.openItems} open`
                            : "Clear"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => openTechnicianWorkspace(item.technician.id)}
                        >
                          Open Workspace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            props.openNextTechnicianComplianceQueueItem(
                              item.technician.id,
                              "record"
                            )
                          }
                        >
                          Open Next
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            props.openNextTechnicianComplianceQueueItem(
                              item.technician.id,
                              "upload"
                            )
                          }
                        >
                          Upload Next
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="rounded-xl border bg-muted/10 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Technician results rail</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Open technicians directly from a compact list without scanning full client cards.
                  </p>
                </div>
                <Badge variant="outline">
                  {sortedTechnicianRailItems.length} result
                  {sortedTechnicianRailItems.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    technicianRailSort === "compliance-priority"
                      ? "secondary"
                      : "outline"
                  }
                  onClick={() => setTechnicianRailSort("compliance-priority")}
                >
                  Compliance Priority
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={technicianRailSort === "name" ? "secondary" : "outline"}
                  onClick={() => setTechnicianRailSort("name")}
                >
                  Name
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={technicianRailSort === "client" ? "secondary" : "outline"}
                  onClick={() => setTechnicianRailSort("client")}
                >
                  Client
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    technicianRailSort === "recent-review" ? "secondary" : "outline"
                  }
                  onClick={() => setTechnicianRailSort("recent-review")}
                >
                  Review Date
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    technicianRailSort === "recent-eye-test" ? "secondary" : "outline"
                  }
                  onClick={() => setTechnicianRailSort("recent-eye-test")}
                >
                  Eye Test
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {pagedTechnicianRailItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                    No technicians match the current result filters.
                  </div>
                ) : (
                  pagedTechnicianRailItems.map((item: any) => (
                    <div
                      key={`rail-${item.technician.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openTechnicianWorkspace(item.technician.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openTechnicianWorkspace(item.technician.id);
                        }
                      }}
                      className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                        props.selectedComplianceTechnician?.id === item.technician.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "bg-background hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{item.technician.name}</p>
                        <Badge
                          variant={
                            props.latestTechnicianCertificateByTechnicianId.has(
                              item.technician.id
                            )
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {props.latestTechnicianCertificateByTechnicianId.has(
                            item.technician.id
                          )
                            ? "Certified"
                            : "No cert"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.clientName}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {props.formatMethods(props.getTechnicianMethods(item.technician)) ||
                          "No methods captured"}
                      </p>
                      {item.backlog ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <Badge variant="destructive">
                            Open {item.backlog.openItems}
                          </Badge>
                          {item.backlog.missingEvidence > 0 ? (
                            <Badge variant="outline">
                              Missing {item.backlog.missingEvidence}
                            </Badge>
                          ) : null}
                          {item.backlog.pendingReview > 0 ? (
                            <Badge variant="outline">
                              Pending {item.backlog.pendingReview}
                            </Badge>
                          ) : null}
                          {item.backlog.expired > 0 ? (
                            <Badge variant="outline">
                              Expired {item.backlog.expired}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {props.getDueBadge(props.getQualificationReviewDate(item.technician))}
                        {props.getDueBadge(item.technician.eyeTestValidUntil)}
                      </div>
                      {item.backlog ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              props.openNextTechnicianComplianceQueueItem(
                                item.technician.id,
                                "upload"
                              );
                            }}
                          >
                            Upload Next
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              props.openNextTechnicianComplianceQueueItem(
                                item.technician.id,
                                "record"
                              );
                            }}
                          >
                            Open Next
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              {technicianRailTotalPages > 1 ? (
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    Page {technicianRailPage} of {technicianRailTotalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={technicianRailPage === 1}
                      onClick={() =>
                        setTechnicianRailPage((current) => Math.max(1, current - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={technicianRailPage === technicianRailTotalPages}
                      onClick={() =>
                        setTechnicianRailPage((current) =>
                          Math.min(technicianRailTotalPages, current + 1)
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.4fr)]">
            <div className="rounded-xl border bg-muted/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Client navigator</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Narrow the Level III client list before opening technicians.
                  </p>
                </div>
                <Badge variant="outline">
                  {filteredClientDirectoryItems.length} client
                  {filteredClientDirectoryItems.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-3 space-y-3">
                <Input
                  value={clientNavigatorSearch}
                  onChange={(event) => setClientNavigatorSearch(event.target.value)}
                  placeholder="Search client or technician..."
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={props.selectedClientFilter === "all" ? "secondary" : "outline"}
                    onClick={() => props.handleTechnicianClientFilterChange("all")}
                  >
                    All clients
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={showOnlyClientsWithTechnicians ? "secondary" : "outline"}
                    onClick={() =>
                      setShowOnlyClientsWithTechnicians((current) => !current)
                    }
                  >
                    {showOnlyClientsWithTechnicians ? "Hide empty clients" : "Show empty clients"}
                  </Button>
                </div>
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {filteredClientDirectoryItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      No clients match the current navigator filters.
                    </div>
                  ) : (
                    filteredClientDirectoryItems.map((item: any) => {
                      const isActive = props.selectedClientFilter === String(item.id);
                      return (
                        <button
                          key={`client-nav-${item.id}`}
                          type="button"
                          onClick={() =>
                            props.handleTechnicianClientFilterChange(String(item.id))
                          }
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            isActive
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "bg-background hover:border-primary hover:bg-primary/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.companyName}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.technicianCount} technician
                                {item.technicianCount === 1 ? "" : "s"} |{" "}
                                {item.certifiedCount} certified | {item.methodCount} method
                                {item.methodCount === 1 ? "" : "s"}
                              </p>
                            </div>
                            {isActive ? <Badge variant="secondary">Active</Badge> : null}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Results strategy</p>
              <p className="mt-2">
                Use the client navigator to narrow the workspace, then use the results rail to open
                the technician you need without scrolling through the full grouped board.
              </p>
              <p className="mt-2">
                The grouped client cards remain below for broader context, but the rail is now the
                faster path once a client has many technicians.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {props.technicianDirectoryView === "grouped" ? (
        <div className="grid gap-4 md:grid-cols-3">
          {pagedGroupedClientItems.map((clientItem: any) => {
            const client = {
              id: clientItem.id,
              companyName: clientItem.companyName,
            };
            const clientTechnicians = clientItem.technicians;
            return (
              <Card key={client.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{client.companyName}</CardTitle>
                      <CardDescription>
                        {clientTechnicians.length} technician(s)
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        props.handleTechnicianClientFilterChange(String(client.id))
                      }
                    >
                      Document Types
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {clientTechnicians.length === 0 ? (
                    <p className="text-muted-foreground">No technicians linked.</p>
                  ) : (
                    clientTechnicians.map((technician: any) => (
                      <div
                        key={technician.id}
                        className={`rounded-md border p-3 transition-colors ${
                          props.selectedComplianceTechnician?.id === technician.id
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="w-full cursor-pointer text-left"
                          onClick={() => openTechnicianWorkspace(technician.id)}
                        >
                          <p className="font-medium">{technician.name}</p>
                          <p className="text-muted-foreground">
                            {props.formatMethods(
                              props.getTechnicianMethods(technician)
                            )}{" "}
                            | {props.formatTechnicianLevels(technician)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge
                              variant={
                                technician.hasPcnQualification
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {props.getQualificationTypeLabel(technician)}
                            </Badge>
                            <Badge variant="outline">
                              {props.getQualificationReviewLabel(technician)}
                            </Badge>
                          </div>
                          <div className="mt-2 flex gap-2">
                            {props.getDueBadge(
                              props.getQualificationReviewDate(technician)
                            )}
                            {props.getDueBadge(technician.eyeTestValidUntil)}
                          </div>
                          {props.latestTechnicianCertificateByTechnicianId.get(
                            technician.id
                          ) ? (
                            <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-2 text-xs">
                              <div className="flex flex-wrap items-center gap-2">
                                {props.getCertificateStatusBadge(
                                  props.latestTechnicianCertificateByTechnicianId.get(
                                    technician.id
                                  )!.status
                                )}
                                {props.getCertificateApprovalBadge(
                                  props.latestTechnicianCertificateByTechnicianId.get(
                                    technician.id
                                  )!.approvalStatus
                                )}
                                <span className="font-medium">
                                  {
                                    props.latestTechnicianCertificateByTechnicianId.get(
                                      technician.id
                                    )!.certificateNumber
                                  }
                                </span>
                              </div>
                              <p className="mt-1 text-muted-foreground">
                                Validity:{" "}
                                {props.formatCertificateValidityRule(
                                  props.latestTechnicianCertificateByTechnicianId.get(
                                    technician.id
                                  )!
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-md border border-dashed bg-muted/20 p-2 text-xs text-muted-foreground">
                              No certificate issued yet.
                            </div>
                          )}
                        </button>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openTechnicianWorkspace(technician.id)}
                          >
                            Documents
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              props.openNewTechnicianCertificateForm(technician)
                            }
                          >
                            Issue Certificate
                          </Button>
                          {props.latestTechnicianCertificateByTechnicianId.get(
                            technician.id
                          ) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                props.openCertificateEditor(
                                  props.latestTechnicianCertificateByTechnicianId.get(
                                    technician.id
                                  ) ?? null
                                )
                              }
                            >
                              Edit Latest
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {props.technicianDirectoryView === "grouped" &&
      filteredClientDirectoryItems.length > GROUPED_CLIENT_PAGE_SIZE ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <p>
            Showing {pagedGroupedClientItems.length} of {filteredClientDirectoryItems.length} client
            groups.
          </p>
          <div className="flex flex-wrap gap-2">
            {hasMoreGroupedClients ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGroupedClientPage((current) => current + 1)}
              >
                Load more clients
              </Button>
            ) : null}
            {groupedClientPage > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGroupedClientPage(1)}
              >
                Collapse list
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {props.technicianDirectoryView === "table" ? (
        <DataTable
          columns={props.technicianColumns}
          data={workspaceFilteredTechnicians}
          isLoading={props.techniciansLoading}
          pageSize={12}
          onRowClick={(row) => {
            openTechnicianWorkspace(Number(row.id));
          }}
          searchPlaceholder="Search technicians..."
          actions={(row) => (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="px-2"
                onClick={() => openTechnicianWorkspace(Number(row.id))}
              >
                Docs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => props.openTechnicianForm(row)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void props.deleteTechnician(row)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      ) : null}

      <TechnicianCertificatesPanel
        filteredTechnicianCertificates={props.filteredTechnicianCertificates}
        lastCertificateWorkflowNotice={props.lastCertificateWorkflowNotice}
        setSelectedCertificateQueueFilter={props.setSelectedCertificateQueueFilter}
        selectedCertificateQueueFilter={props.selectedCertificateQueueFilter}
        certificateQueueSummary={props.certificateQueueSummary}
        certificateLifecycleSummary={props.certificateLifecycleSummary}
        setSelectedCertificateHistory={props.setSelectedCertificateHistory}
        getLevelIIITechnicianName={props.getLevelIIITechnicianName}
        formatExportDate={props.formatExportDate}
        technicianCertificateColumns={props.technicianCertificateColumns}
        technicianCertificatesLoading={props.technicianCertificatesLoading}
        openCertificateEditor={props.openCertificateEditor}
        handlePreviewLevelIIICertificate={props.handlePreviewLevelIIICertificate}
        exportCertificateHtml={props.exportEditableCertificateHtml}
        exportCertificatePdf={props.exportCertificatePdf}
        openCertificateSignOffDialog={props.openCertificateSignOffDialog}
        deleteCertificate={props.deleteCertificate}
      />

      <div ref={props.technicianComplianceSectionRef}>
        <TechnicianComplianceWorkspacePanel
          createControlledLevelIIICertificateDocument={
            props.createControlledLevelIIICertificateDocument
          }
          clearHandledTechnicianDocumentQueueHistory={
            props.clearHandledTechnicianDocumentQueueHistory
          }
          complianceMatrixLoading={props.complianceMatrixLoading}
          exportCertificateHtml={props.exportEditableCertificateHtml}
          exportCertificatePdf={props.exportCertificatePdf}
          filteredSelectedTechnicianBulkQueueItems={
            props.filteredSelectedTechnicianBulkQueueItems
          }
          formatExportDate={props.formatExportDate}
          formatCertificateValidityRule={props.formatCertificateValidityRule}
          formatLevelIIICategoryLabel={props.formatLevelIIICategoryLabel}
          getCertificateApprovalBadge={props.getCertificateApprovalBadge}
          getCertificateStatusBadge={props.getCertificateStatusBadge}
          handlePreviewLevelIIICertificate={props.handlePreviewLevelIIICertificate}
          getLevelIIITechnicianName={props.getLevelIIITechnicianName}
          getRequirementStatusBadge={props.getRequirementStatusBadge}
          latestTechnicianCertificateByTechnicianId={
            props.latestTechnicianCertificateByTechnicianId
          }
          levelIIIRequirementDefinitions={props.levelIIIRequirementDefinitions}
          markTechnicianDocumentQueueItemHandled={
            props.markTechnicianDocumentQueueItemHandled
          }
          nextCertificateLinkedRequirement={props.nextCertificateLinkedRequirement}
          nextExpiredRequirement={props.nextExpiredRequirement}
          nextMissingEvidenceRequirement={props.nextMissingEvidenceRequirement}
          nextPendingReviewRequirement={props.nextPendingReviewRequirement}
          openEvidenceReview={props.openEvidenceReview}
          openCertificateEditor={props.openCertificateEditor}
          openCertificateSignOffDialog={props.openCertificateSignOffDialog}
          openTechnicianComplianceRecord={props.openTechnicianComplianceRecord}
          openTechnicianDirectUploadDialog={props.openTechnicianDirectUploadDialog}
          openTechnicianRequirementUploadFromRow={
            props.openTechnicianRequirementUploadFromRow
          }
          recentHandledSelectedTechnicianBulkQueueEntries={
            props.recentHandledSelectedTechnicianBulkQueueEntries
          }
          restoreHandledTechnicianDocumentQueueEntry={
            props.restoreHandledTechnicianDocumentQueueEntry
          }
          selectedComplianceTechnician={props.selectedComplianceTechnician}
          selectedTechnicianDocumentGenerationItem={
            props.selectedTechnicianDocumentGenerationItem
          }
          setSelectedCertificateHistory={props.setSelectedCertificateHistory}
          submitControlledLevelIIICertificateDocumentForReview={
            props.submitControlledLevelIIICertificateDocumentForReview
          }
          availableTechnicianDirectUploadRules={props.availableTechnicianDirectUploadRules}
          selectedTechnicianDocumentControlSummary={
            props.selectedTechnicianDocumentControlSummary
          }
          selectedTechnicianDocumentPackGuide={
            props.selectedTechnicianDocumentPackGuide
          }
          selectedTechnicianPendingReviewRows={
            props.selectedTechnicianPendingReviewRows
          }
          selectedTechnicianRequirementSummary={
            props.selectedTechnicianRequirementSummary
          }
          selectedTechnicianRequirementTableRows={
            props.selectedTechnicianRequirementTableRows
          }
          setEditingTechnicianRequirement={props.setEditingTechnicianRequirement}
          setEditingTechnicianRequirementDefinition={
            props.setEditingTechnicianRequirementDefinition
          }
          setIsTechnicianRequirementDefinitionFormOpen={
            props.setIsTechnicianRequirementDefinitionFormOpen
          }
          setIsTechnicianRequirementFormOpen={props.setIsTechnicianRequirementFormOpen}
          technicianRequirementColumns={props.technicianRequirementColumns}
          technicianRequirementDefinitionColumns={
            props.technicianRequirementDefinitionColumns
          }
        />
      </div>
    </>
  );
}
