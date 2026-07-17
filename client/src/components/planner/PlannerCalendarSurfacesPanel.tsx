import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { Calendar, CheckCircle2, Edit2, Plus, RotateCcw, Trash2, Users } from "lucide-react";

type PlannerEntry = {
  id: number;
  title: string;
  notes: string | null;
  reminderAt: string | Date | null;
  isComplete: boolean;
  recurrence: string | null;
  [key: string]: unknown;
};

type PlannerOccurrence = {
  key: string;
  source: PlannerEntry;
  occurrenceDate: Date;
  reminderAt: Date | null;
  isRecurringInstance: boolean;
};

type SharedEventSource = {
  id: number;
  branchId: number | null;
  title: string;
  eventType: string;
  recurrence: string | null;
  location: string | null;
  notes: string | null;
  [key: string]: unknown;
};

type SharedEventOccurrence = {
  key: string;
  source: SharedEventSource;
  isRecurringInstance: boolean;
};

type PlannerCalendarSurfacesPanelProps = {
  branchMap: Map<number, string>;
  calendarCells: Array<number | null>;
  canManageSharedEvent: (event: any) => boolean;
  columns: Column<any>[];
  currentDate: Date;
  entriesByDate: Map<number, any[]>;
  formatPlannerDate: (date: Date) => string;
  formatPlannerDateTime: (date: Date) => string;
  formatSharedEventTiming: (event: any) => string;
  getPlannerStatusClass: (entry: any) => string;
  getRecurrenceLabel: (entry: any) => string;
  getSharedEventTypeClass: (eventType: any) => string;
  handleDelete: (entry: any) => void | Promise<void>;
  handleSharedDelete: (event: any) => void | Promise<void>;
  handleToggleComplete: (entry: any) => void | Promise<void>;
  isLoading: boolean;
  onOpenCreateFormForDate: (date: Date) => void;
  onOpenEditForm: (entry: any) => void;
  onOpenSharedCreateFormForDate: (date: Date) => void;
  onOpenSharedEditForm: (event: any) => void;
  onSetCurrentDate: (date: Date) => void;
  onSetSelectedDate: (date: Date) => void;
  onSetSelectedSharedDate: (date: Date) => void;
  selectedDate: Date;
  selectedDateLabel: string;
  selectedDayEntries: any[];
  selectedSharedDate: Date;
  selectedSharedDateLabel: string;
  selectedSharedDayEvents: any[];
  sharedColumns: Column<any>[];
  sharedEventsByDate: Map<number, any[]>;
  sharedEventsLoading: boolean;
  sharedRows: any[];
  today: Date;
  typedEntries: any[];
  updateMutationPending: boolean;
};

export function PlannerCalendarSurfacesPanel(props: PlannerCalendarSurfacesPanelProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shared Monthly View
          </CardTitle>
          <CardDescription>
            This is the collaborative calendar. Personal planner items are not shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  props.onSetCurrentDate(
                    new Date(props.currentDate.getFullYear(), props.currentDate.getMonth() - 1, 1)
                  )
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  props.onSetCurrentDate(
                    new Date(props.currentDate.getFullYear(), props.currentDate.getMonth() + 1, 1)
                  )
                }
              >
                Next
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {props.currentDate.toLocaleString("en-ZA", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button
              variant="outline"
              onClick={() => props.onOpenSharedCreateFormForDate(props.selectedSharedDate)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add For Selected Day
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={`shared-${day}`} className="p-2 text-center text-sm font-semibold">
                {day}
              </div>
            ))}

            {props.calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`shared-blank-${index}`}
                    className="min-h-28 rounded border bg-slate-50 dark:bg-slate-900"
                  />
                );
              }

              const cellDate = new Date(
                props.currentDate.getFullYear(),
                props.currentDate.getMonth(),
                day
              );
              const dayEvents = props.sharedEventsByDate.get(day) ?? [];
              const selected = isSameDay(cellDate, props.selectedSharedDate);
              const isToday = isSameDay(cellDate, props.today);

              return (
                <button
                  key={`shared-${getDateKey(cellDate)}`}
                  type="button"
                  onClick={() => props.onSetSelectedSharedDate(cellDate)}
                  className={`min-h-28 rounded border p-2 text-left transition ${
                    selected
                      ? "border-violet-500 bg-violet-50 ring-2 ring-violet-200"
                      : "bg-background hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{day}</span>
                    <div className="flex items-center gap-1">
                      {isToday ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Today
                        </span>
                      ) : null}
                      {dayEvents.length > 0 ? (
                        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">
                          {dayEvents.length}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEvents.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No shared events</div>
                    ) : (
                      dayEvents.slice(0, 3).map((occurrence) => (
                        <div
                          key={occurrence.key}
                          className={`rounded px-2 py-1 text-xs ${props.getSharedEventTypeClass(
                            occurrence.source.eventType
                          )}`}
                        >
                          {occurrence.source.title}
                        </div>
                      ))
                    )}

                    {dayEvents.length > 3 ? (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{props.selectedSharedDateLabel}</CardTitle>
            <CardDescription>
              Shared events for the selected day. These are intended for branch and team
              collaboration.
            </CardDescription>
          </div>
          <Button onClick={() => props.onOpenSharedCreateFormForDate(props.selectedSharedDate)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Shared Event
          </Button>
        </CardHeader>
        <CardContent>
          {props.selectedSharedDayEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No shared events for this day yet.
            </div>
          ) : (
            <div className="space-y-3">
              {props.selectedSharedDayEvents.map((occurrence) => {
                const branchName = occurrence.source.branchId
                  ? props.branchMap.get(occurrence.source.branchId) || "Unknown Branch"
                  : "System-wide";
                return (
                  <div key={occurrence.key} className="rounded-xl border bg-background p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${props.getSharedEventTypeClass(
                              occurrence.source.eventType
                            )}`}
                          >
                            {occurrence.source.eventType}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {branchName}
                          </span>
                          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {occurrence.source.recurrence
                              ? `${occurrence.source.recurrence}${
                                  occurrence.isRecurringInstance ? " (recurring)" : ""
                                }`
                              : "Once-off"}
                          </span>
                        </div>

                        <div>
                          <p className="font-medium">{occurrence.source.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {props.formatSharedEventTiming(occurrence.source)}
                            {occurrence.source.location
                              ? ` | ${occurrence.source.location}`
                              : ""}
                          </p>
                        </div>

                        {occurrence.source.notes ? (
                          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                            {occurrence.source.notes}
                          </p>
                        ) : null}
                      </div>

                      {props.canManageSharedEvent(occurrence.source) ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => props.onOpenSharedEditForm(occurrence.source)}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => props.handleSharedDelete(occurrence.source)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline">View only</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared Event Register</CardTitle>
          <CardDescription>
            Shared events visible to all users with planner access. Search and maintain the
            collaboration calendar here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={props.sharedColumns}
            data={props.sharedRows}
            isLoading={props.sharedEventsLoading}
            searchPlaceholder="Search shared calendar events..."
            onRowClick={(row) => props.onOpenSharedEditForm(row)}
            actions={(row) => (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!props.canManageSharedEvent(row)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!props.canManageSharedEvent(row)) return;
                    props.onOpenSharedEditForm(row);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!props.canManageSharedEvent(row)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!props.canManageSharedEvent(row)) return;
                    props.handleSharedDelete(row);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly View
          </CardTitle>
          <CardDescription>
            Only your own planner data is shown here, including recurring entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  props.onSetCurrentDate(
                    new Date(props.currentDate.getFullYear(), props.currentDate.getMonth() - 1, 1)
                  )
                }
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  props.onSetCurrentDate(
                    new Date(props.currentDate.getFullYear(), props.currentDate.getMonth() + 1, 1)
                  )
                }
              >
                Next
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {props.currentDate.toLocaleString("en-ZA", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <Button variant="outline" onClick={() => props.onOpenCreateFormForDate(props.selectedDate)}>
              <Plus className="mr-2 h-4 w-4" />
              Add For Selected Day
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-semibold">
                {day}
              </div>
            ))}

            {props.calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-28 rounded border bg-slate-50 dark:bg-slate-900"
                  />
                );
              }

              const cellDate = new Date(
                props.currentDate.getFullYear(),
                props.currentDate.getMonth(),
                day
              );
              const dayEntries = props.entriesByDate.get(day) ?? [];
              const selected = isSameDay(cellDate, props.selectedDate);
              const isToday = isSameDay(cellDate, props.today);

              return (
                <button
                  key={getDateKey(cellDate)}
                  type="button"
                  onClick={() => props.onSetSelectedDate(cellDate)}
                  className={`min-h-28 rounded border p-2 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "bg-background hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{day}</span>
                    <div className="flex items-center gap-1">
                      {isToday ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Today
                        </span>
                      ) : null}
                      {dayEntries.length > 0 ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                          {dayEntries.length}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayEntries.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No entries</div>
                    ) : (
                      dayEntries.slice(0, 3).map((occurrence) => (
                        <div
                          key={occurrence.key}
                          className={`rounded px-2 py-1 text-xs ${
                            occurrence.source.isComplete
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {occurrence.source.title}
                        </div>
                      ))
                    )}

                    {dayEntries.length > 3 ? (
                      <div className="text-xs text-muted-foreground">
                        +{dayEntries.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{props.selectedDateLabel}</CardTitle>
            <CardDescription>
              Daily agenda for the selected day. Editing a recurring item updates the full series.
            </CardDescription>
          </div>
          <Button onClick={() => props.onOpenCreateFormForDate(props.selectedDate)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry For This Day
          </Button>
        </CardHeader>
        <CardContent>
          {props.selectedDayEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No planner items for this day yet.
            </div>
          ) : (
            <div className="space-y-3">
              {props.selectedDayEntries.map((occurrence) => (
                <div key={occurrence.key} className="rounded-xl border bg-background p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${props.getPlannerStatusClass(
                            occurrence.source
                          )}`}
                        >
                          {occurrence.source.isComplete ? "Done" : "Open"}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {props.getRecurrenceLabel(occurrence.source)}
                        </span>
                        {occurrence.reminderAt ? (
                          <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                            Reminder {props.formatPlannerDateTime(occurrence.reminderAt)}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <p className="font-medium">{occurrence.source.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Planned for {props.formatPlannerDate(occurrence.occurrenceDate)}
                          {occurrence.isRecurringInstance ? " (recurring instance)" : ""}
                        </p>
                      </div>

                      {occurrence.source.notes ? (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {occurrence.source.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => props.handleToggleComplete(occurrence.source)}
                        disabled={props.updateMutationPending}
                      >
                        {occurrence.source.isComplete ? (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reopen
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Complete
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => props.onOpenEditForm(occurrence.source)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => props.handleDelete(occurrence.source)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
          <CardTitle>Your Entries</CardTitle>
          <CardDescription>
            Private tasks, reminders, diary items, and recurring activities attached to your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={props.columns}
            data={props.typedEntries}
            isLoading={props.isLoading}
            searchPlaceholder="Search planner entries..."
            onRowClick={(row) => props.onOpenEditForm(row)}
            actions={(row) => (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.handleToggleComplete(row);
                  }}
                >
                  {row.isComplete ? "Reopen" : "Complete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onOpenEditForm(row);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.handleDelete(row);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </>
  );
}

function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
