import { describe, expect, it } from "vitest";
import {
  calculateEndDateFromDuration,
  formatDateInputValue,
  parseDateInputValue,
} from "../shared/scheduling";

describe("scheduling helpers", () => {
  it("keeps a one-day course on the start date", () => {
    const startDate = parseDateInputValue("2026-04-22");

    expect(formatDateInputValue(calculateEndDateFromDuration(startDate, 1))).toBe("2026-04-22");
  });

  it("skips weekends when calculating the end date", () => {
    const startDate = parseDateInputValue("2026-04-24");

    expect(formatDateInputValue(calculateEndDateFromDuration(startDate, 3))).toBe("2026-04-28");
  });
});
