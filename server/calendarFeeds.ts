export type CalendarFeedScope = "all" | "private" | "shared" | "operations";
export type CalendarRecurrence = "Daily" | "Weekly" | "Monthly" | null;

export type CalendarFeedEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: Date | string;
  endAt?: Date | string | null;
  allDay: boolean;
  recurrence?: CalendarRecurrence | string | null;
  recurrenceUntil?: Date | string | null;
  status?: string | null;
  categories?: string[];
};

export type CalendarFeedOccurrence<TEvent extends CalendarFeedEvent = CalendarFeedEvent> = {
  key: string;
  source: TEvent;
  occurrenceDate: Date;
  endAt: Date | null;
  isRecurringInstance: boolean;
};

function parseCalendarDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIcsDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatIcsDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function normalizeRecurrence(value: string | null | undefined): CalendarRecurrence {
  return value === "Daily" || value === "Weekly" || value === "Monthly"
    ? value
    : null;
}

function hasExplicitTime(date: Date) {
  return (
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0
  );
}

export function expandCalendarEvents<TEvent extends CalendarFeedEvent>(
  events: TEvent[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const start = startOfDay(rangeStart);
  const end = endOfDay(rangeEnd);
  const occurrences: CalendarFeedOccurrence<TEvent>[] = [];

  for (const event of events) {
    const eventStart = parseCalendarDate(event.startAt);
    const eventEnd = parseCalendarDate(event.endAt);
    if (!eventStart) continue;

    const recurrence = normalizeRecurrence(event.recurrence ?? null);
    const recurrenceUntil = parseCalendarDate(event.recurrenceUntil);

    if (!recurrence) {
      if (eventStart >= start && eventStart <= end) {
        occurrences.push({
          key: `${event.uid}-${getDateKey(eventStart)}`,
          source: event,
          occurrenceDate: eventStart,
          endAt: eventEnd,
          isRecurringInstance: false,
        });
      }
      continue;
    }

    const seriesEnd = recurrenceUntil ? endOfDay(recurrenceUntil) : end;
    const cursor = new Date(eventStart);

    while (cursor <= seriesEnd && cursor <= end) {
      if (cursor >= start) {
        const occurrenceDate = new Date(cursor);
        let occurrenceEnd = eventEnd ? new Date(eventEnd) : null;

        if (occurrenceEnd) {
          const durationMs = occurrenceEnd.getTime() - eventStart.getTime();
          occurrenceEnd = new Date(occurrenceDate.getTime() + Math.max(durationMs, 0));
        }

        occurrences.push({
          key: `${event.uid}-${getDateKey(occurrenceDate)}`,
          source: event,
          occurrenceDate,
          endAt: occurrenceEnd,
          isRecurringInstance: true,
        });
      }

      if (recurrence === "Daily") {
        cursor.setDate(cursor.getDate() + 1);
      } else if (recurrence === "Weekly") {
        cursor.setDate(cursor.getDate() + 7);
      } else if (recurrence === "Monthly") {
        cursor.setMonth(cursor.getMonth() + 1);
      } else {
        break;
      }
    }
  }

  return occurrences.sort((left, right) => {
    const dateDiff = left.occurrenceDate.getTime() - right.occurrenceDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return left.source.title.localeCompare(right.source.title);
  });
}

export function buildCalendarIcs(
  events: CalendarFeedEvent[],
  options?: {
    prodId?: string;
    calendarName?: string;
    calendarDescription?: string;
  }
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${options?.prodId ?? "-//TextPoint//Calendar Feed//EN"}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  if (options?.calendarName?.trim()) {
    lines.push(`X-WR-CALNAME:${escapeIcsText(options.calendarName.trim())}`);
  }

  if (options?.calendarDescription?.trim()) {
    lines.push(
      `X-WR-CALDESC:${escapeIcsText(options.calendarDescription.trim())}`
    );
  }

  for (const event of events) {
    const startAt = parseCalendarDate(event.startAt);
    if (!startAt) continue;

    const endAt = parseCalendarDate(event.endAt);
    const recurrenceUntil = parseCalendarDate(event.recurrenceUntil);
    const recurrence = normalizeRecurrence(event.recurrence ?? null);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeIcsText(event.uid)}`);
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(startAt)}`);
      if (endAt && startOfDay(endAt).getTime() > startOfDay(startAt).getTime()) {
        lines.push(
          `DTEND;VALUE=DATE:${formatIcsDate(addDays(startOfDay(endAt), 1))}`
        );
      }
    } else {
      lines.push(`DTSTART:${formatIcsDateTime(startAt)}`);
      if (endAt) {
        lines.push(`DTEND:${formatIcsDateTime(endAt)}`);
      }
    }

    const description = event.description?.trim();
    if (description) {
      lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    }

    const location = event.location?.trim();
    if (location) {
      lines.push(`LOCATION:${escapeIcsText(location)}`);
    }

    if (event.categories?.length) {
      lines.push(
        `CATEGORIES:${event.categories
          .filter(Boolean)
          .map((value) => escapeIcsText(value))
          .join(",")}`
      );
    }

    if (event.status?.trim()) {
      lines.push(`STATUS:${event.status.trim().toUpperCase().replace(/\s+/g, "-")}`);
    }

    if (recurrence) {
      const freq =
        recurrence === "Daily"
          ? "DAILY"
          : recurrence === "Weekly"
            ? "WEEKLY"
            : "MONTHLY";
      const untilPart =
        recurrenceUntil && !Number.isNaN(recurrenceUntil.getTime())
          ? `;UNTIL=${
              event.allDay || !hasExplicitTime(startAt)
                ? formatIcsDate(recurrenceUntil)
                : formatIcsDateTime(recurrenceUntil)
            }`
          : "";
      lines.push(`RRULE:FREQ=${freq}${untilPart}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
