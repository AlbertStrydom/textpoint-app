import { describe, expect, it } from "vitest";
import {
  cleanRuleStringArray,
  findDuplicatePortalSourceReferenceByPath,
  normalisePortalSourcePathForMatch,
  resolveAllowedClientDocumentLabel,
} from "./clientPortalRules";

describe("client portal document rules", () => {
  it("returns the configured label casing for allowed document types", () => {
    expect(
      resolveAllowedClientDocumentLabel(" technician id ", [
        "Technician ID",
        "Appointment Letter",
      ])
    ).toBe("Technician ID");
  });

  it("accepts free-form document titles when no allow-list exists", () => {
    expect(resolveAllowedClientDocumentLabel("  Custom File  ", [])).toBe("Custom File");
  });

  it("rejects document titles outside the configured allow-list", () => {
    expect(() =>
      resolveAllowedClientDocumentLabel("Unknown Type", ["Technician ID", "Appointment Letter"])
    ).toThrow("This document type is not allowed.");
  });

  it("normalises source-reference paths for case-insensitive duplicate checks", () => {
    expect(normalisePortalSourcePathForMatch("  E:\\Docs\\File.pdf  ")).toBe("e:\\docs\\file.pdf");
  });

  it("finds duplicate imported source references by path", () => {
    const duplicate = findDuplicatePortalSourceReferenceByPath(
      [
        { sourcePath: "E:\\Docs\\Technician A\\ID.pdf" },
        { sourcePath: "E:\\Docs\\Technician A\\CV.pdf" },
      ],
      "  e:\\docs\\technician a\\id.pdf "
    );

    expect(duplicate).toEqual({ sourcePath: "E:\\Docs\\Technician A\\ID.pdf" });
  });

  it("de-duplicates and trims configured labels", () => {
    expect(cleanRuleStringArray([" Technician ID ", "Technician ID", "", null])).toEqual([
      "Technician ID",
    ]);
  });
});
