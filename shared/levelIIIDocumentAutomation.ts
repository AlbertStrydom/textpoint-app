export type LevelIIIMethodQualification = {
  method: string;
  level: string;
};

export type LevelIIIDocumentAutomationRule = {
  label: string;
  displayLabel: string;
  suggestedFileName: string;
  storagePath: string;
  category: "core" | "method";
  matchedMethod: string | null;
};

type BuildLevelIIIDocumentAutomationRulesInput = {
  technicianName?: string | null;
  techniques?: string[] | null;
  methodQualifications?: LevelIIIMethodQualification[] | null;
  requestedDocuments?: string[] | null;
};

const CORE_UPLOAD_LABELS = [
  { label: "ID", displayLabel: "Technician ID copy" },
  { label: "CV", displayLabel: "Curriculum vitae" },
  { label: "LOG HOURS", displayLabel: "Log hours / logbook" },
  { label: "EYE TEST", displayLabel: "Eye test" },
  { label: "CODE OF ETHICS", displayLabel: "Code of ethics" },
] as const;

const TECHNIQUE_ALIASES: Record<string, string> = {
  mt: "MT",
  mpt: "MT",
  pt: "PT",
  dp: "PT",
  ut: "UT",
  rt: "RT",
  vt: "VT",
  et: "ET",
  lt: "LT",
  mpi: "MT",
  dpi: "PT",
};

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function slugifySegment(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

function normaliseTechnique(value: unknown) {
  const cleaned = cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleaned) return "";
  return TECHNIQUE_ALIASES[cleaned] ?? cleaned.toUpperCase();
}

function extractLevelDigits(level: string) {
  const match = level.match(/([123])/);
  return match?.[1] ?? "";
}

function buildMethodCertificateLabel(method: string, level: string) {
  const methodCode = normaliseTechnique(method);
  const levelDigits = extractLevelDigits(cleanText(level));
  return `${methodCode}${levelDigits ? levelDigits : ""} CERT`.trim();
}

function buildStoragePath(technicianName: string, label: string) {
  return [
    "technicians",
    slugifySegment(technicianName, "technician"),
    slugifySegment(label, "document"),
  ].join("/");
}

export function isLikelyLevelIIIAssessmentRequest(input: {
  title?: string | null;
  requestType?: string | null;
  techniques?: string[] | null;
}) {
  const haystack = [input.title, input.requestType]
    .map((value) => cleanText(value).toLowerCase())
    .filter(Boolean)
    .join(" ");
  return (
    haystack.includes("assessment") ||
    haystack.includes("booking") ||
    (input.techniques ?? []).some((technique) => cleanText(technique))
  );
}

export function buildLevelIIIDocumentAutomationRules(
  input: BuildLevelIIIDocumentAutomationRulesInput
): LevelIIIDocumentAutomationRule[] {
  const technicianName = cleanText(input.technicianName) || "Technician Name";
  const requestedDocuments = Array.isArray(input.requestedDocuments)
    ? input.requestedDocuments.map((entry) => cleanText(entry)).filter(Boolean)
    : [];
  const techniques = Array.from(
    new Set((input.techniques ?? []).map((entry) => normaliseTechnique(entry)).filter(Boolean))
  );
  const qualifications = Array.isArray(input.methodQualifications)
    ? input.methodQualifications
        .map((entry) => ({
          method: normaliseTechnique(entry.method),
          level: cleanText(entry.level),
        }))
        .filter((entry) => entry.method)
    : [];
  const qualificationByMethod = new Map(
    qualifications.map((entry) => [entry.method.toLowerCase(), entry.level])
  );

  const labels: Array<{
    label: string;
    displayLabel: string;
    category: "core" | "method";
    matchedMethod: string | null;
  }> = [];
  const seen = new Set<string>();
  const pushRule = (rule: {
    label: string;
    displayLabel: string;
    category: "core" | "method";
    matchedMethod: string | null;
  }) => {
    const key = rule.label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    labels.push(rule);
  };

  for (const core of CORE_UPLOAD_LABELS) {
    pushRule({
      label: core.label,
      displayLabel: core.displayLabel,
      category: "core",
      matchedMethod: null,
    });
  }

  for (const technique of techniques) {
    const level = qualificationByMethod.get(technique.toLowerCase()) ?? "";
    pushRule({
      label: buildMethodCertificateLabel(technique, level),
      displayLabel: `${technique} qualification certificate${level ? ` (${level})` : ""}`,
      category: "method",
      matchedMethod: technique,
    });
  }

  for (const label of requestedDocuments) {
    pushRule({
      label,
      displayLabel: label,
      category: "core",
      matchedMethod: null,
    });
  }

  return labels.map((rule) => ({
    ...rule,
    suggestedFileName: `${technicianName} - ${rule.label}`,
    storagePath: buildStoragePath(technicianName, rule.label),
  }));
}

export function findLevelIIIDocumentAutomationRuleByLabel(
  rules: LevelIIIDocumentAutomationRule[],
  label: string | null | undefined
) {
  const labelKey = cleanText(label).toLowerCase();
  if (!labelKey) return null;
  return rules.find((rule) => rule.label.trim().toLowerCase() === labelKey) ?? null;
}
