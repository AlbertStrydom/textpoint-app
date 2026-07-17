import { Button } from "@/components/ui/button";
import type { RefObject } from "react";
import { Calendar, Clock3, Download, Plus, Repeat, Upload } from "lucide-react";

type PlannerPageHeaderSummary = {
  openEntries: number;
  dueToday: number;
  overdueReminders: number;
  nextSevenDays: number;
};

type PlannerPageHeaderPanelProps = {
  calendarImportInputRef: RefObject<HTMLInputElement | null>;
  handleCalendarExport: () => void;
  handleCalendarImport: (file: File) => Promise<unknown>;
  isImportingCalendar: boolean;
  openCreateFormForDate: (date: Date) => void;
  selectedDate: Date;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date) => void;
  summary: PlannerPageHeaderSummary;
  today: Date;
  typedEntries: readonly unknown[];
};

export function PlannerPageHeaderPanel({
  calendarImportInputRef,
  handleCalendarExport,
  handleCalendarImport,
  isImportingCalendar,
  openCreateFormForDate,
  selectedDate,
  setCurrentDate,
  setSelectedDate,
  summary,
  today,
  typedEntries,
}: PlannerPageHeaderPanelProps) {
  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planner</h1>
          <p className="text-muted-foreground">
            Your private planner plus a separate shared calendar layer for collaborative branch and
            team events.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCurrentDate(today);
              setSelectedDate(today);
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => calendarImportInputRef.current?.click()}
            disabled={isImportingCalendar}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isImportingCalendar ? "Importing..." : "Import ICS"}
          </Button>
          <Button
            variant="outline"
            onClick={handleCalendarExport}
            disabled={typedEntries.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export ICS
          </Button>
          <Button onClick={() => openCreateFormForDate(selectedDate)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      <input
        ref={calendarImportInputRef}
        type="file"
        accept=".ics,text/calendar"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void handleCalendarImport(file);
        }}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setCurrentDate(today);
            setSelectedDate(today);
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Open Entries</p>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-3xl font-bold">{summary.openEntries}</p>
          <p className="mt-1 text-xs text-muted-foreground">Private items still in progress</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentDate(today);
            setSelectedDate(today);
          }}
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-900">Due Today</p>
            <Clock3 className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-900">{summary.dueToday}</p>
          <p className="mt-1 text-xs text-amber-700">Today&apos;s tasks and reminders</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentDate(today);
            setSelectedDate(today);
          }}
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-left transition hover:border-red-300 hover:bg-red-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-red-900">Overdue Reminders</p>
            <Clock3 className="h-4 w-4 text-red-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-red-900">{summary.overdueReminders}</p>
          <p className="mt-1 text-xs text-red-700">Needs attention first</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setCurrentDate(today);
            setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
          }}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900">Next 7 Days</p>
            <Repeat className="h-4 w-4 text-blue-700" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-900">{summary.nextSevenDays}</p>
          <p className="mt-1 text-xs text-blue-700">Upcoming scheduled work</p>
        </button>
      </div>
    </>
  );
}
