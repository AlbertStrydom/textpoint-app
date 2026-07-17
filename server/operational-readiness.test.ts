import { describe, expect, it } from "vitest";
import {
  buildOperationalReadinessSummary,
  type OperationalReadinessIssue,
} from "./operationalReadiness";

function issue(
  severity: OperationalReadinessIssue["severity"],
  area: OperationalReadinessIssue["area"]
): OperationalReadinessIssue {
  return {
    id: `${area}-${severity}`,
    fingerprint: `${area}-${severity}`,
    area,
    severity,
    title: "Test issue",
    detail: "Test detail",
    action: "Test action",
    recordType: "test",
    recordId: 1,
    branchId: null,
    branchName: null,
    path: "/admin",
    qualityAction: null,
  };
}

describe("operational readiness helpers", () => {
  it("marks a clean snapshot as healthy with a full score", () => {
    const result = buildOperationalReadinessSummary([]);

    expect(result.status).toBe("healthy");
    expect(result.summary.readyScore).toBe(100);
    expect(result.summary.totalIssues).toBe(0);
  });

  it("escalates critical issues to error status", () => {
    const result = buildOperationalReadinessSummary([
      issue("critical", "training"),
      issue("warning", "equipment"),
      issue("info", "branches"),
    ]);

    expect(result.status).toBe("error");
    expect(result.summary).toMatchObject({
      critical: 1,
      warning: 1,
      info: 1,
      affectedAreas: 3,
      readyScore: 88,
    });
  });

  it("uses attention status when only warnings are present", () => {
    const result = buildOperationalReadinessSummary([
      issue("warning", "crm"),
      issue("warning", "quality"),
    ]);

    expect(result.status).toBe("attention");
    expect(result.summary.readyScore).toBe(94);
  });
});
