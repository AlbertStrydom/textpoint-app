export type LevelIIITechnicianCertificateValidityUnit =
  | "days"
  | "months"
  | "years"
  | "custom";

export type LevelIIICertificateMethodLevel = {
  method: string;
  level: string;
};

export type LevelIIITechnicianCertificateApprovalStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected";

function escapeCertificateHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseCertificateDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function normaliseCertificateText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function normaliseCertificateDateKey(value: Date | string | null | undefined) {
  const parsed = parseCertificateDate(value);
  return parsed ? parsed.toISOString().slice(0, 10) : "";
}

function normaliseCertificateMethodLevels(
  methodLevels: readonly LevelIIICertificateMethodLevel[] | null | undefined
) {
  return (methodLevels ?? [])
    .map((entry) => ({
      method: normaliseCertificateText(entry.method),
      level: normaliseCertificateText(entry.level),
    }))
    .filter((entry) => entry.method && entry.level)
    .sort((left, right) =>
      `${left.method}|${left.level}`.localeCompare(`${right.method}|${right.level}`)
    );
}

function buildCertificateMethodLevelKeys(
  methodLevels: readonly LevelIIICertificateMethodLevel[] | null | undefined
) {
  return new Set(
    normaliseCertificateMethodLevels(methodLevels).map(
      (entry) => `${entry.method.toUpperCase()}::${entry.level.toUpperCase()}`
    )
  );
}

function addCertificateDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addCertificateMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addCertificateYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function resolveLevelIIITechnicianCertificateValidUntil(input: {
  issuedDate: Date | string | null | undefined;
  validUntil?: Date | string | null;
  validityValue?: number | null;
  validityUnit?: LevelIIITechnicianCertificateValidityUnit | null;
}) {
  const explicitValidUntil = parseCertificateDate(input.validUntil);
  if (explicitValidUntil) {
    return explicitValidUntil;
  }

  const issuedDate = parseCertificateDate(input.issuedDate);
  if (!issuedDate || !input.validityValue || input.validityValue <= 0) {
    return null;
  }

  switch (input.validityUnit) {
    case "days":
      return addCertificateDays(issuedDate, input.validityValue);
    case "months":
      return addCertificateMonths(issuedDate, input.validityValue);
    case "years":
      return addCertificateYears(issuedDate, input.validityValue);
    case "custom":
    default:
      return null;
  }
}

export function describeLevelIIITechnicianCertificateValidity(input: {
  validUntil?: Date | string | null;
  validityValue?: number | null;
  validityUnit?: LevelIIITechnicianCertificateValidityUnit | null;
}) {
  if (input.validityUnit === "custom") {
    return input.validUntil ? "Custom valid-until date" : "Custom valid-until date required";
  }

  if (!input.validityValue || !input.validityUnit) {
    return "No validity rule";
  }

  const unit =
    input.validityValue === 1 ? input.validityUnit.slice(0, -1) : input.validityUnit;
  return `${input.validityValue} ${unit}`;
}

export function summarizeLevelIIITechnicianCertificateMethodLevels(
  methodLevels: readonly LevelIIICertificateMethodLevel[]
) {
  const cleaned = methodLevels
    .map((entry) => ({
      method: String(entry.method ?? "").trim(),
      level: String(entry.level ?? "").trim(),
    }))
    .filter((entry) => entry.method && entry.level);

  return cleaned.length > 0
    ? cleaned.map((entry) => `${entry.method} ${entry.level}`).join(" | ")
    : "No methods selected";
}

export function buildSuggestedLevelIIITechnicianCertificateFileName(
  technicianName: string | null | undefined,
  methodLevels: readonly LevelIIICertificateMethodLevel[]
) {
  const cleanedName = String(technicianName ?? "").trim();
  const methodSummary = methodLevels
    .map((entry) => `${String(entry.method ?? "").trim()}${String(entry.level ?? "").trim()}`)
    .filter(Boolean)
    .join(" ");

  const base = [cleanedName || "Technician", methodSummary || "Certificate", "CERTIFICATE"]
    .join(" - ")
    .replace(/\s+/g, " ")
    .trim();

  return `${base}.pdf`;
}

export function canExportLevelIIITechnicianCertificate(
  approvalStatus: LevelIIITechnicianCertificateApprovalStatus | string | null | undefined
) {
  return String(approvalStatus ?? "").trim().toLowerCase() === "approved";
}

export function hasLevelIIITechnicianCertificateMaterialChanges(
  existing: {
    technicianId?: number | null;
    assessmentId?: number | null;
    certificateNumber?: string | null;
    method?: string | null;
    level?: string | null;
    methodLevels?: readonly LevelIIICertificateMethodLevel[] | null;
    issuedDate?: Date | string | null;
    validUntil?: Date | string | null;
    validityValue?: number | null;
    validityUnit?: LevelIIITechnicianCertificateValidityUnit | null;
    status?: string | null;
    fileName?: string | null;
    fileUrl?: string | null;
    fileKey?: string | null;
    contentType?: string | null;
    notes?: string | null;
  },
  next: {
    technicianId?: number | null;
    assessmentId?: number | null;
    certificateNumber?: string | null;
    method?: string | null;
    level?: string | null;
    methodLevels?: readonly LevelIIICertificateMethodLevel[] | null;
    issuedDate?: Date | string | null;
    validUntil?: Date | string | null;
    validityValue?: number | null;
    validityUnit?: LevelIIITechnicianCertificateValidityUnit | null;
    status?: string | null;
    fileName?: string | null;
    fileUrl?: string | null;
    fileKey?: string | null;
    contentType?: string | null;
    notes?: string | null;
  }
) {
  if ((existing.technicianId ?? null) !== (next.technicianId ?? null)) return true;
  if ((existing.assessmentId ?? null) !== (next.assessmentId ?? null)) return true;
  if (
    normaliseCertificateText(existing.certificateNumber) !==
    normaliseCertificateText(next.certificateNumber)
  ) {
    return true;
  }
  if (normaliseCertificateText(existing.method) !== normaliseCertificateText(next.method)) {
    return true;
  }
  if (normaliseCertificateText(existing.level) !== normaliseCertificateText(next.level)) {
    return true;
  }
  if (
    JSON.stringify(normaliseCertificateMethodLevels(existing.methodLevels)) !==
    JSON.stringify(normaliseCertificateMethodLevels(next.methodLevels))
  ) {
    return true;
  }
  if (
    normaliseCertificateDateKey(existing.issuedDate) !==
    normaliseCertificateDateKey(next.issuedDate)
  ) {
    return true;
  }
  if (
    normaliseCertificateDateKey(existing.validUntil) !==
    normaliseCertificateDateKey(next.validUntil)
  ) {
    return true;
  }
  if ((existing.validityValue ?? null) !== (next.validityValue ?? null)) return true;
  if ((existing.validityUnit ?? null) !== (next.validityUnit ?? null)) return true;
  if (normaliseCertificateText(existing.status) !== normaliseCertificateText(next.status)) {
    return true;
  }
  if (normaliseCertificateText(existing.fileName) !== normaliseCertificateText(next.fileName)) {
    return true;
  }
  if (normaliseCertificateText(existing.fileUrl) !== normaliseCertificateText(next.fileUrl)) {
    return true;
  }
  if (normaliseCertificateText(existing.fileKey) !== normaliseCertificateText(next.fileKey)) {
    return true;
  }
  if (
    normaliseCertificateText(existing.contentType) !== normaliseCertificateText(next.contentType)
  ) {
    return true;
  }
  if (normaliseCertificateText(existing.notes) !== normaliseCertificateText(next.notes)) {
    return true;
  }
  return false;
}

export function hasOverlappingLevelIIITechnicianCertificateScope(
  left: readonly LevelIIICertificateMethodLevel[] | null | undefined,
  right: readonly LevelIIICertificateMethodLevel[] | null | undefined
) {
  const leftKeys = buildCertificateMethodLevelKeys(left);
  const rightKeys = buildCertificateMethodLevelKeys(right);
  if (leftKeys.size === 0 || rightKeys.size === 0) {
    return false;
  }
  return Array.from(leftKeys).some((key) => rightKeys.has(key));
}

export function shouldResetLevelIIITechnicianCertificateApprovalOnChange(input: {
  currentApprovalStatus: LevelIIITechnicianCertificateApprovalStatus | string | null | undefined;
  existing: Parameters<typeof hasLevelIIITechnicianCertificateMaterialChanges>[0];
  next: Parameters<typeof hasLevelIIITechnicianCertificateMaterialChanges>[1];
}) {
  const approvalStatus = String(input.currentApprovalStatus ?? "").trim().toLowerCase();
  if (approvalStatus !== "approved" && approvalStatus !== "in_review") {
    return false;
  }
  return hasLevelIIITechnicianCertificateMaterialChanges(input.existing, input.next);
}

export function buildLevelIIITechnicianCertificateContent(options: {
  technicianName: string;
  companyName: string;
  branchName?: string | null;
  certificateNumber: string;
  issuedDate: string;
  validUntil?: string | null;
  qualificationBasis: string;
  methodLevels: readonly LevelIIICertificateMethodLevel[];
  assessor?: string | null;
  notes?: string | null;
}) {
  const methodSummary = summarizeLevelIIITechnicianCertificateMethodLevels(options.methodLevels);

  return `
    <p>This certificate confirms that <strong>${escapeCertificateHtml(
      options.technicianName
    )}</strong> holds the listed Level III technician qualification scope for the named client.</p>
    <table>
      <tbody>
        <tr><th>Certificate Number</th><td>${escapeCertificateHtml(options.certificateNumber)}</td></tr>
        <tr><th>Technician</th><td>${escapeCertificateHtml(options.technicianName)}</td></tr>
        <tr><th>Company</th><td>${escapeCertificateHtml(options.companyName)}</td></tr>
        ${
          options.branchName
            ? `<tr><th>Branch</th><td>${escapeCertificateHtml(options.branchName)}</td></tr>`
            : ""
        }
        <tr><th>Methods And Levels</th><td>${escapeCertificateHtml(methodSummary)}</td></tr>
        <tr><th>Issued Date</th><td>${escapeCertificateHtml(options.issuedDate)}</td></tr>
        <tr><th>Valid Until</th><td>${escapeCertificateHtml(options.validUntil || "No expiry recorded")}</td></tr>
        <tr><th>Qualification Basis</th><td>${escapeCertificateHtml(options.qualificationBasis)}</td></tr>
        ${
          options.assessor
            ? `<tr><th>Assessor</th><td>${escapeCertificateHtml(options.assessor)}</td></tr>`
            : ""
        }
      </tbody>
    </table>
    <p>The holder is authorised only for the techniques and levels shown above, subject to the employer written practice and the supporting assessment record.</p>
    <p>This certificate must be read together with the technician compliance file, supporting evidence, and any client-specific scope restrictions held by TextPoint.</p>
    ${
      options.notes
        ? `<p><strong>Notes:</strong> ${escapeCertificateHtml(options.notes)}</p>`
        : ""
    }
    <p><strong>Issued for:</strong> ${escapeCertificateHtml(options.technicianName)}</p>
  `;
}

export function buildLevelIIITechnicianCertificatePdfContent(options: {
  technicianName: string;
  companyName: string;
  branchName?: string | null;
  certificateNumber: string;
  issuedDate: string;
  validUntil?: string | null;
  qualificationBasis: string;
  methodLevels: readonly LevelIIICertificateMethodLevel[];
  assessor?: string | null;
  notes?: string | null;
}) {
  const methodSummary = summarizeLevelIIITechnicianCertificateMethodLevels(options.methodLevels);

  return {
    fields: [
      { label: "Certificate Number", value: options.certificateNumber },
      { label: "Technician", value: options.technicianName },
      { label: "Company", value: options.companyName },
      ...(options.branchName ? [{ label: "Branch", value: options.branchName }] : []),
      { label: "Methods And Levels", value: methodSummary },
      { label: "Issued Date", value: options.issuedDate },
      { label: "Valid Until", value: options.validUntil || "No expiry recorded" },
      { label: "Qualification Basis", value: options.qualificationBasis },
      ...(options.assessor ? [{ label: "Assessor", value: options.assessor }] : []),
    ],
    paragraphs: [
      `This certificate confirms that ${options.technicianName} holds the listed Level III technician qualification scope for the named client.`,
      "The holder is authorised only for the techniques and levels shown above, subject to the employer written practice and the supporting assessment record.",
      "This certificate must be read together with the technician compliance file, supporting evidence, and any client-specific scope restrictions held by TextPoint.",
      ...(options.notes ? [`Notes: ${options.notes}`] : []),
      `Issued for: ${options.technicianName}`,
    ],
  };
}
