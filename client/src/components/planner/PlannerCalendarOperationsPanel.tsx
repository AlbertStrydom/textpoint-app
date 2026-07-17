import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Calendar,
  Clock3,
  Copy,
  Download,
  Layers3,
  Link2,
  Plus,
  RotateCcw,
  Users,
} from "lucide-react";

type SelectOption = {
  value: string;
  label: string;
};

type FeedUrlRow = {
  key: string;
  label: string;
  description: string;
  url: string;
};

type UnifiedCalendarSource = {
  sourceType: string;
  sourceLabel: string;
  branchName: string | null;
  statusLabel: string | null;
  title: string;
  description: string | null;
  location: string | null;
};

type SharedEventSource = {
  id: number;
  branchId: number | null;
  title: string;
  eventType: string;
  recurrence: string | null;
  location: string | null;
  notes: string | null;
};

type SharedEventOccurrence = {
  key: string;
  source: SharedEventSource;
  isRecurringInstance: boolean;
};

type SharedSummary = {
  totalEvents: number;
  thisMonth: number;
  upcomingSevenDays: number;
  branchSpecific: number;
};

type UnifiedSummary = {
  totalEvents: number;
  dueToday: number;
  nextSevenDays: number;
  operationalEvents: number;
};

type PlannerCalendarOperationsPanelProps = {
  allSharedBranchesValue: string;
  filteredSharedEventsCount: number;
  formatPlannerDate: (date: Date) => string;
  formatUnifiedOccurrenceTiming: (occurrence: any) => string;
  getUnifiedSourceClass: (sourceType: any) => string;
  handleCopyFeedUrl: (url: string, label: string) => Promise<void>;
  handleRotateFeedToken: () => Promise<void>;
  handleSharedCalendarExport: () => void;
  onOpenSharedCreateFormForDate: (date: Date) => void;
  onSetSelectedSharedDate: (date: Date) => void;
  onSharedBranchFilterChange: (value: string) => void;
  onUnifiedBranchFilterChange: (value: string) => void;
  onUnifiedScopeChange: (value: "all" | "private" | "shared" | "operations") => void;
  refetchUnifiedOccurrences: () => Promise<unknown>;
  rotateFeedTokenPending: boolean;
  selectedSharedDate: Date;
  sharedBranchFilter: string;
  sharedBranchOptions: SelectOption[];
  sharedSummary: SharedSummary;
  today: Date;
  unifiedBranchFilter: string;
  unifiedBranchOptions: SelectOption[];
  unifiedColumns: Column<any>[];
  unifiedEventsLoading: boolean;
  unifiedFeedUrls: FeedUrlRow[];
  unifiedRangeEnd: Date;
  unifiedRangeStart: Date;
  unifiedRows: any[];
  unifiedScope: "all" | "private" | "shared" | "operations";
  unifiedSummary: UnifiedSummary;
  upcomingUnifiedOccurrences: any[];
};

export function PlannerCalendarOperationsPanel(props: PlannerCalendarOperationsPanelProps) {
  return (
    <>
      <Card className="border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Google & Outlook Calendar Bridge
          </CardTitle>
          <CardDescription>
            Import exported calendar files from Google Calendar or Outlook, and export your planner back out as an ICS calendar feed file.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium">Import external events</div>
            <p className="mt-2">Google Calendar and Outlook both support `.ics` export. Import those files here to bring meetings and events into your planner.</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium">Export your planner</div>
            <p className="mt-2">Export planner items to an `.ics` file so they can be opened or subscribed to in external calendar tools.</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium">Live sync later</div>
            <p className="mt-2">True two-way live Google/Microsoft sync is possible, but it needs OAuth app setup. This ICS bridge is the clean first step.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-sky-100 bg-gradient-to-r from-sky-50/80 via-white to-white">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-sky-600" />
              Live Calendar Subscription
            </CardTitle>
            <CardDescription>
              Subscribe from Google Calendar or Outlook using these live feed URLs. They stay up to date as planner, shared, and operational events change.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => void props.handleRotateFeedToken()}
            disabled={props.rotateFeedTokenPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {props.rotateFeedTokenPending ? "Rotating..." : "Rotate Feed Token"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-white p-4 text-sm text-slate-700">
            <div className="font-medium text-sky-900">Subscription note</div>
            <p className="mt-2">
              Use the relevant feed URL inside Google Calendar or Outlook&apos;s
              {" "}
              subscribe-from-web option. Rotating the token immediately disables
              any old subscriptions for security.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {props.unifiedFeedUrls.map((feed) => (
              <div key={feed.key} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{feed.label}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feed.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void props.handleCopyFeedUrl(feed.url, feed.label)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </Button>
                </div>
                <div className="mt-3 rounded-lg border bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                  <div className="truncate">{feed.url}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-white">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-emerald-600" />
              Unified Operations Calendar
            </CardTitle>
            <CardDescription>
              One operational view across private planner items, shared calendar
              events, schedules, CRM follow-ups, Level III activity dates, and
              quality due dates.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={props.unifiedScope} onValueChange={props.onUnifiedScopeChange}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Choose scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything</SelectItem>
                <SelectItem value="private">Private planner only</SelectItem>
                <SelectItem value="shared">Shared calendar only</SelectItem>
                <SelectItem value="operations">Operational items only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={props.unifiedBranchFilter} onValueChange={props.onUnifiedBranchFilterChange}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Filter by branch" />
              </SelectTrigger>
              <SelectContent>
                {props.unifiedBranchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => void props.refetchUnifiedOccurrences()}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-emerald-900">Window Events</p>
                <Layers3 className="h-4 w-4 text-emerald-700" />
              </div>
              <p className="mt-2 text-3xl font-bold text-emerald-900">
                {props.unifiedSummary.totalEvents}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                From {props.formatPlannerDate(props.unifiedRangeStart)} to {props.formatPlannerDate(props.unifiedRangeEnd)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-amber-900">Due Today</p>
                <Clock3 className="h-4 w-4 text-amber-700" />
              </div>
              <p className="mt-2 text-3xl font-bold text-amber-900">
                {props.unifiedSummary.dueToday}
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Based on the current scope and branch filter
              </p>
            </div>

            <div className="rounded-xl border border-sky-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-sky-900">Next 7 Days</p>
                <Calendar className="h-4 w-4 text-sky-700" />
              </div>
              <p className="mt-2 text-3xl font-bold text-sky-900">
                {props.unifiedSummary.nextSevenDays}
              </p>
              <p className="mt-1 text-xs text-sky-700">
                Upcoming work that should stay visible externally
              </p>
            </div>

            <div className="rounded-xl border border-violet-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-violet-900">Operational</p>
                <Building2 className="h-4 w-4 text-violet-700" />
              </div>
              <p className="mt-2 text-3xl font-bold text-violet-900">
                {props.unifiedSummary.operationalEvents}
              </p>
              <p className="mt-1 text-xs text-violet-700">
                Items coming from training, CRM, Level III, and quality
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Operational Agenda</CardTitle>
              <CardDescription>
                Branch filters only apply to branch-linked records. Personal and
                no-branch items remain visible when relevant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {props.upcomingUnifiedOccurrences.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No calendar items were found in the selected window.
                </div>
              ) : (
                <div className="space-y-3">
                  {props.upcomingUnifiedOccurrences.map((occurrence) => (
                    <div key={occurrence.key} className="rounded-xl border bg-background p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded px-2 py-1 text-xs font-semibold ${props.getUnifiedSourceClass(
                                occurrence.source.sourceType
                              )}`}
                            >
                              {occurrence.source.sourceLabel}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {occurrence.source.branchName || "General / Personal"}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              {occurrence.source.statusLabel || "Planned"}
                            </span>
                          </div>

                          <div>
                            <p className="font-medium">{occurrence.source.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {props.formatUnifiedOccurrenceTiming(occurrence)}
                              {occurrence.isRecurringInstance ? " (recurring instance)" : ""}
                              {occurrence.source.location
                                ? ` | ${occurrence.source.location}`
                                : ""}
                            </p>
                          </div>

                          {occurrence.source.description ? (
                            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                              {occurrence.source.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Unified Calendar Register</CardTitle>
              <CardDescription>
                Search the upcoming calendar window across private, shared, and
                operational items from one place.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={props.unifiedColumns}
                data={props.unifiedRows}
                isLoading={props.unifiedEventsLoading}
                searchPlaceholder="Search the unified calendar..."
              />
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="border-violet-100 bg-gradient-to-r from-violet-50/80 via-white to-white">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-600" />
              Shared Calendar Layer
            </CardTitle>
            <CardDescription>
              Collaborative branch and team events live here, separate from your private planner and diary items.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={props.sharedBranchFilter} onValueChange={props.onSharedBranchFilterChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter shared calendar" />
              </SelectTrigger>
              <SelectContent>
                {props.sharedBranchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={props.handleSharedCalendarExport} disabled={props.filteredSharedEventsCount === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export Shared ICS
            </Button>
            <Button onClick={() => props.onOpenSharedCreateFormForDate(props.selectedSharedDate)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Shared Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium">Visible to the team</div>
            <p className="mt-2">Use this for meetings, training blocks, deadlines, visits, and other collaborative calendar items.</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium">Branch-aware</div>
            <p className="mt-2">Events can be system-wide or linked to a specific branch, and everyone can filter the view accordingly.</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium">Safe editing</div>
            <p className="mt-2">Only the event creator, an admin, or a Super Admin can change or delete a shared event.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => props.onSetSelectedSharedDate(props.today)}
          className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-left transition hover:border-violet-300 hover:bg-violet-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-violet-900">Shared Events</p>
            <Users className="h-4 w-4 text-violet-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-violet-900">{props.sharedSummary.totalEvents}</p>
          <p className="mt-1 text-xs text-violet-700">Current filtered collaboration items</p>
        </button>

        <button
          type="button"
          onClick={() => props.onSetSelectedSharedDate(props.today)}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-emerald-900">This Month</p>
            <Calendar className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{props.sharedSummary.thisMonth}</p>
          <p className="mt-1 text-xs text-emerald-700">Shared items landing in the visible month</p>
        </button>

        <button
          type="button"
          onClick={() => props.onSetSelectedSharedDate(props.today)}
          className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-sky-900">Next 7 Days</p>
            <Clock3 className="h-4 w-4 text-sky-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-sky-900">{props.sharedSummary.upcomingSevenDays}</p>
          <p className="mt-1 text-xs text-sky-700">Upcoming collaborative events</p>
        </button>

        <button
          type="button"
          onClick={() => props.onSharedBranchFilterChange(props.allSharedBranchesValue)}
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-900">Branch-specific</p>
            <Building2 className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-900">{props.sharedSummary.branchSpecific}</p>
          <p className="mt-1 text-xs text-amber-700">Events linked to a branch</p>
        </button>
      </div>

    </>
  );
}
