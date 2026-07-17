function cleanRequiredRuleText(value: string, label: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }
  return trimmed;
}

export function cleanRuleStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function resolveAllowedClientDocumentLabel(
  documentTitle: string,
  allowedLabels: readonly string[]
) {
  const configuredLabels = cleanRuleStringArray([...allowedLabels]);
  if (configuredLabels.length === 0) {
    return cleanRequiredRuleText(documentTitle, "Document title");
  }

  const requestedTitle = cleanRequiredRuleText(documentTitle, "Document title");
  const match = configuredLabels.find(
    (label) => label.localeCompare(requestedTitle, undefined, { sensitivity: "accent" }) === 0
  );

  if (!match) {
    throw new Error("This document type is not allowed. Ask an admin to add it to the allowed document list.");
  }

  return match;
}

export function normalisePortalSourcePathForMatch(sourcePath: string) {
  return cleanRequiredRuleText(sourcePath, "Source path").toLowerCase();
}

export function findDuplicatePortalSourceReferenceByPath<
  T extends {
    sourcePath: string | null | undefined;
  },
>(existing: readonly T[], sourcePath: string) {
  const targetPath = normalisePortalSourcePathForMatch(sourcePath);
  return (
    existing.find((reference) => {
      if (!reference.sourcePath) return false;
      return normalisePortalSourcePathForMatch(reference.sourcePath) === targetPath;
    }) ?? null
  );
}
