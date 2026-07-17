import { describe, expect, it } from "vitest";
import {
  canExportLevelIIITechnicianCertificate,
  buildLevelIIITechnicianCertificateContent,
  buildLevelIIITechnicianCertificatePdfContent,
  buildSuggestedLevelIIITechnicianCertificateFileName,
  describeLevelIIITechnicianCertificateValidity,
  hasLevelIIITechnicianCertificateMaterialChanges,
  hasOverlappingLevelIIITechnicianCertificateScope,
  resolveLevelIIITechnicianCertificateValidUntil,
  shouldResetLevelIIITechnicianCertificateApprovalOnChange,
  summarizeLevelIIITechnicianCertificateMethodLevels,
} from "../shared/levelIIICertificateWorkflow";

function formatLocalDate(value: Date | null | undefined) {
  if (!value) return null;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("Level III certificate workflow helpers", () => {
  it("calculates a derived valid-until date from issued date and years", () => {
    const result = resolveLevelIIITechnicianCertificateValidUntil({
      issuedDate: "2026-06-18",
      validityValue: 5,
      validityUnit: "years",
    });

    expect(formatLocalDate(result)).toBe("2031-06-18");
  });

  it("prefers an explicit custom valid-until date", () => {
    const result = resolveLevelIIITechnicianCertificateValidUntil({
      issuedDate: "2026-06-18",
      validUntil: "2026-12-01",
      validityValue: 5,
      validityUnit: "years",
    });

    expect(formatLocalDate(result)).toBe("2026-12-01");
  });

  it("describes validity rules for operator review", () => {
    expect(
      describeLevelIIITechnicianCertificateValidity({
        validityValue: 1,
        validityUnit: "years",
      })
    ).toBe("1 year");
  });

  it("summarises certificate methods and levels", () => {
    expect(
      summarizeLevelIIITechnicianCertificateMethodLevels([
        { method: "MT", level: "2" },
        { method: "UT", level: "1" },
      ])
    ).toBe("MT 2 | UT 1");
  });

  it("builds a suggested certificate file name", () => {
    expect(
      buildSuggestedLevelIIITechnicianCertificateFileName("Aziz Kell", [
        { method: "MT", level: "2" },
      ])
    ).toBe("Aziz Kell - MT2 - CERTIFICATE.pdf");
  });

  it("detects material certificate changes that must invalidate prior approval", () => {
    expect(
      hasLevelIIITechnicianCertificateMaterialChanges(
        {
          technicianId: 10,
          assessmentId: 20,
          certificateNumber: "L3C-2026-0007",
          method: "MT",
          level: "2",
          methodLevels: [{ method: "MT", level: "2" }],
          issuedDate: "2026-06-18",
          validUntil: "2031-06-18",
          validityValue: 5,
          validityUnit: "years",
          status: "Active",
          fileName: "Aziz Kell - MT2 - CERTIFICATE.pdf",
          fileUrl: "https://example.com/certificate.pdf",
          fileKey: "certificates/7.pdf",
          contentType: "application/pdf",
          notes: "Initial issue",
        },
        {
          technicianId: 10,
          assessmentId: 20,
          certificateNumber: "L3C-2026-0007",
          method: "MT",
          level: "2",
          methodLevels: [{ method: "MT", level: "2" }],
          issuedDate: "2026-06-18",
          validUntil: "2031-06-19",
          validityValue: 5,
          validityUnit: "years",
          status: "Active",
          fileName: "Aziz Kell - MT2 - CERTIFICATE.pdf",
          fileUrl: "https://example.com/certificate.pdf",
          fileKey: "certificates/7.pdf",
          contentType: "application/pdf",
          notes: "Initial issue",
        }
      )
    ).toBe(true);
  });

  it("resets approval when approved content changes", () => {
    expect(
      shouldResetLevelIIITechnicianCertificateApprovalOnChange({
        currentApprovalStatus: "approved",
        existing: {
          certificateNumber: "L3C-2026-0007",
          methodLevels: [{ method: "MT", level: "2" }],
          issuedDate: "2026-06-18",
          validUntil: "2031-06-18",
        },
        next: {
          certificateNumber: "L3C-2026-0007",
          methodLevels: [{ method: "MT", level: "3" }],
          issuedDate: "2026-06-18",
          validUntil: "2031-06-18",
        },
      })
    ).toBe(true);
  });

  it("allows export only after approval", () => {
    expect(canExportLevelIIITechnicianCertificate("approved")).toBe(true);
    expect(canExportLevelIIITechnicianCertificate("draft")).toBe(false);
    expect(canExportLevelIIITechnicianCertificate("in_review")).toBe(false);
  });

  it("detects overlapping technician certificate scope by method and level", () => {
    expect(
      hasOverlappingLevelIIITechnicianCertificateScope(
        [
          { method: "MT", level: "2" },
          { method: "UT", level: "1" },
        ],
        [
          { method: "PT", level: "2" },
          { method: "UT", level: "1" },
        ]
      )
    ).toBe(true);
    expect(
      hasOverlappingLevelIIITechnicianCertificateScope(
        [{ method: "MT", level: "2" }],
        [{ method: "MT", level: "3" }]
      )
    ).toBe(false);
  });

  it("builds controlled certificate body content from the issued record", () => {
    const content = buildLevelIIITechnicianCertificateContent({
      technicianName: "Aziz Kell",
      companyName: "National NDT",
      branchName: "Secunda",
      certificateNumber: "L3C-2026-0007",
      issuedDate: "18 Jun 2026",
      validUntil: "18 Jun 2031",
      qualificationBasis: "PCN",
      methodLevels: [{ method: "MT", level: "2" }],
      assessor: "A. Strydom",
      notes: "Client witnessed assessment.",
    });

    expect(content).toContain("L3C-2026-0007");
    expect(content).toContain("National NDT");
    expect(content).toContain("MT 2");
    expect(content).toContain("Client witnessed assessment.");
  });

  it("builds structured PDF content from the issued record", () => {
    const pdfContent = buildLevelIIITechnicianCertificatePdfContent({
      technicianName: "Aziz Kell",
      companyName: "National NDT",
      branchName: "Secunda",
      certificateNumber: "L3C-2026-0007",
      issuedDate: "18 Jun 2026",
      validUntil: "18 Jun 2031",
      qualificationBasis: "PCN",
      methodLevels: [{ method: "MT", level: "2" }],
      assessor: "A. Strydom",
      notes: "Client witnessed assessment.",
    });

    expect(pdfContent.fields).toEqual(
      expect.arrayContaining([
        { label: "Certificate Number", value: "L3C-2026-0007" },
        { label: "Methods And Levels", value: "MT 2" },
      ])
    );
    expect(pdfContent.paragraphs.join(" ")).toContain("Client witnessed assessment.");
  });
});
