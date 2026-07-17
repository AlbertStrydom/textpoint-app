export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function parseDateInputValue(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function formatDateInputValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateEndDateFromDuration(
  startDate: Date,
  durationWorkDays: number
): Date {
  const safeDuration = Math.max(1, Math.floor(durationWorkDays));
  const endDate = new Date(startDate);
  let remainingDays = safeDuration - 1;

  while (remainingDays > 0) {
    endDate.setDate(endDate.getDate() + 1);
    if (!isWeekend(endDate)) {
      remainingDays -= 1;
    }
  }

  return endDate;
}
