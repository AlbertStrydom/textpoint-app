import { describe, expect, it } from "vitest";
import { buildAuditTrailExportRows, summarizeAuditChanges, type AuditTrailItem } from "./audit";

describe("audit trail helpers", () => {
  it("summarises JSON audit changes for display", () => {
    expect(
      summarizeAuditChanges(
        JSON.stringify({
          role: "super_admin",
          name: "Admin",
          passwordUpdated: false,
        })
      )
    ).toBe("role: super_admin; name: Admin; passwordUpdated: false");
  });

  it("exports actor and change details in flat rows", () => {
    const rows = buildAuditTrailExportRows([
      {
        id: 1,
        userId: 7,
        actorName: "Admin",
        actorEmail: "admin@example.com",
        action: "UPDATE",
        entityType: "user",
        entityId: 3,
        changes: { role: "admin" },
        changesSummary: "role: admin",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        status: "Success",
        errorMessage: null,
        createdAt: new Date("2026-04-30T10:00:00.000Z"),
      } satisfies AuditTrailItem,
    ]);

    expect(rows[0]).toMatchObject({
      actor: "Admin",
      actorEmail: "admin@example.com",
      action: "UPDATE",
      entityType: "user",
      entityId: 3,
      status: "Success",
      changes: "role: admin",
      ipAddress: "127.0.0.1",
    });
  });
});
