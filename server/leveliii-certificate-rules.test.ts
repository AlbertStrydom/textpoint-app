import { describe, expect, it } from "vitest";
import {
  buildNextLevelIIITechnicianCertificateNumber,
  formatLevelIIITechnicianCertificateNumber,
  getNextLevelIIITechnicianCertificateSequence,
  isLevelIIITechnicianCertificateNumberFormat,
  normaliseLevelIIITechnicianCertificateNumber,
  parseLevelIIITechnicianCertificateSequence,
} from "./levelIIICertificateRules";

describe("Level III certificate numbering rules", () => {
  it("formats certificate numbers with a fixed prefix, year, and padded sequence", () => {
    expect(formatLevelIIITechnicianCertificateNumber(2026, 7)).toBe("L3C-2026-0007");
  });

  it("builds the next certificate number from the highest existing sequence for the current year", () => {
    expect(
      buildNextLevelIIITechnicianCertificateNumber(
        ["L3C-2025-0041", "L3C-2026-0007", "L3C-2026-0024"],
        new Date("2026-06-18T10:00:00.000Z")
      )
    ).toBe("L3C-2026-0025");
  });

  it("rejects invalid sequence values", () => {
    expect(() => formatLevelIIITechnicianCertificateNumber(2026, 0)).toThrow(
      "Certificate sequence must be a positive integer."
    );
  });

  it("ignores malformed or cross-year certificate numbers when deriving the next sequence", () => {
    expect(
      getNextLevelIIITechnicianCertificateSequence(
        ["", "L3C-2025-0099", "BAD-REF", "L3C-2026-0011"],
        new Date("2026-06-18T10:00:00.000Z")
      )
    ).toBe(12);
  });

  it("parses the sequence only when the certificate matches the expected year", () => {
    expect(parseLevelIIITechnicianCertificateSequence("L3C-2026-0042", 2026)).toBe(42);
    expect(parseLevelIIITechnicianCertificateSequence("L3C-2025-0042", 2026)).toBeNull();
  });

  it("normalises manual certificate number input before validation", () => {
    expect(normaliseLevelIIITechnicianCertificateNumber("  l3c-2026-0042 ")).toBe("L3C-2026-0042");
  });

  it("validates the expected Level III certificate number format", () => {
    expect(isLevelIIITechnicianCertificateNumberFormat("L3C-2026-0042")).toBe(true);
    expect(isLevelIIITechnicianCertificateNumberFormat("custom-2026-42")).toBe(false);
  });
});
