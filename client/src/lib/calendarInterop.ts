export type CalendarRecurrence = "Daily" | "Weekly" | "Monthly" | null;

export type CalendarImportEntry = {
  title: string;
  entryDate: Date;
  notes: string | null;
  reminderAt: Date | null;
  recurrence: CalendarRecurrence;
  recurrenceUntil: Date | null;
};

type ParsedCalendarEvent = {
  title: string;
  description: string | null;
  start: Date;
  recurrence: CalendarRecurrence;
  recurrenceUntil: Date | null;
};

function unfoldIcsLines(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter(Boolean);
}

function unescapeIcsText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{8}$/.test(trimmed)) {
    const year = Number.parseInt(trimmed.slice(0, 4), 10);
    const month = Number.parseInt(trimmed.slice(4, 6), 10);
    const day = Number.parseInt(trimmed.slice(6, 8), 10);
    return new Date(year, month - 1, day);
  }

  const normalized = trimmed.endsWith("Z") ? trimmed.slice(0, -1) : trimmed;
  const match = normalized.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/
  );

  if (!match) return null;

  const [, year, month, day, hours, minutes, seconds] = match;
  return new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hours, 10),
    Number.parseInt(minutes, 10),
    Number.parseInt(seconds, 10)
  );
}

function parseRRule(value: string) {
  const parts = value.split(";");
  const map = new Map<string, string>();
  for (const part of parts) {
    const [key, rawValue] = part.split("=");
    if (!key || !rawValue) continue;
    map.set(key.toUpperCase(), rawValue);
  }

  const freq = map.get("FREQ")?.toUpperCase();
  const until = map.get("UNTIL");

  const recurrence: CalendarRecurrence =
    freq === "DAILY"
      ? "Daily"
      : freq === "WEEKLY"
        ? "Weekly"
        : freq === "MONTHLY"
          ? "Monthly"
          : null;

  return {
    recurrence,
    recurrenceUntil: until ? parseIcsDateValue(until) : null,
  };
}

function parseCalendarEvents(input: string) {
  const lines = unfoldIcsLines(input);
  const events: ParsedCalendarEvent[] = [];
  let current: {
    title?: string;
    description?: string | null;
    start?: Date | null;
    recurrence?: CalendarRecurrence;
    recurrenceUntil?: Date | null;
  } | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {
        description: null,
        recurrence: null,
        recurrenceUntil: null,
      };
      continue;
    }

    if (line === "END:VEVENT") {
      if (current?.title && current.start) {
        events.push({
          title: current.title,
          description: current.description ?? null,
          start: current.start,
          recurrence: current.recurrence ?? null,
          recurrenceUntil: current.recurrenceUntil ?? null,
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const rawKey = line.slice(0, separatorIndex);
    const rawValue = line.slice(separatorIndex + 1);
    const key = rawKey.split(";")[0]?.toUpperCase();

    if (key === "SUMMARY") {
      current.title = unescapeIcsText(rawValue.trim());
      continue;
    }

    if (key === "DESCRIPTION") {
      current.description = unescapeIcsText(rawValue.trim());
      continue;
    }

    if (key === "DTSTART") {
      current.start = parseIcsDateValue(rawValue);
      continue;
    }

    if (key === "RRULE") {
      const parsed = parseRRule(rawValue);
      current.recurrence = parsed.recurrence;
      current.recurrenceUntil = parsed.recurrenceUntil;
    }
  }

  return events;
}

export function parseCalendarImportText(input: string) {
  return parseCalendarEvents(input).map((event) => {
    const hasTime =
      event.start.getHours() !== 0 ||
      event.start.getMinutes() !== 0 ||
      event.start.getSeconds() !== 0;

    return {
      title: event.title,
      entryDate: new Date(
        event.start.getFullYear(),
        event.start.getMonth(),
        event.start.getDate()
      ),
      notes: event.description,
      reminderAt: hasTime ? event.start : null,
      recurrence: event.recurrence,
      recurrenceUntil: event.recurrenceUntil
        ? new Date(
            event.recurrenceUntil.getFullYear(),
            event.recurrenceUntil.getMonth(),
            event.recurrenceUntil.getDate()
          )
        : null,
    } satisfies CalendarImportEntry;
  });
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

export function buildPlannerIcs(entries: Array<{
  id: number;
  title: string;
  entryDate: string | Date;
  notes: string | null;
  reminderAt: string | Date | null;
  recurrence: string | null;
  recurrenceUntil: string | Date | null;
  isComplete: boolean;
}>) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TextPoint//Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const entry of entries) {
    const entryDate = entry.entryDate instanceof Date ? entry.entryDate : new Date(entry.entryDate);
    const reminderAt = entry.reminderAt
      ? entry.reminderAt instanceof Date
        ? entry.reminderAt
        : new Date(entry.reminderAt)
      : null;
    const recurrenceUntil = entry.recurrenceUntil
      ? entry.recurrenceUntil instanceof Date
        ? entry.recurrenceUntil
        : new Date(entry.recurrenceUntil)
      : null;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:planner-${entry.id}@textpoint`);
    lines.push(`SUMMARY:${escapeIcsText(entry.title)}`);

    if (reminderAt && !Number.isNaN(reminderAt.getTime())) {
      lines.push(`DTSTART:${formatIcsDateTime(reminderAt)}`);
    } else if (!Number.isNaN(entryDate.getTime())) {
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(entryDate)}`);
    }

    if (entry.notes?.trim()) {
      lines.push(`DESCRIPTION:${escapeIcsText(entry.notes.trim())}`);
    }

    if (entry.recurrence && entry.recurrence !== "none") {
      const freq =
        entry.recurrence === "Daily"
          ? "DAILY"
          : entry.recurrence === "Weekly"
            ? "WEEKLY"
            : entry.recurrence === "Monthly"
              ? "MONTHLY"
              : null;
      if (freq) {
        const untilPart =
          recurrenceUntil && !Number.isNaN(recurrenceUntil.getTime())
            ? `;UNTIL=${formatIcsDate(recurrenceUntil)}`
            : "";
        lines.push(`RRULE:FREQ=${freq}${untilPart}`);
      }
    }

    if (entry.isComplete) {
      lines.push("STATUS:COMPLETED");
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadIcsFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
