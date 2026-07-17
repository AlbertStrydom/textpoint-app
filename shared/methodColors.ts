export const METHOD_FAMILY_COLOURS = {
  PT: "#dc2626",
  MT: "#2563eb",
  RT: "#facc15",
  UT: "#16a34a",
  WT: "#84cc16",
  BRS: "#f97316",
  RTS: "#f97316",
  VT: "#6b7280",
  ET: "#9333ea",
  PA: "#166534",
  OTHER: "#0f766e",
} as const;

type MethodFamily = keyof typeof METHOD_FAMILY_COLOURS;

const METHOD_FAMILY_RULES: Array<{
  family: MethodFamily;
  tokens: string[];
}> = [
  { family: "PA", tokens: ["paut", "phased array", "paut level", "phased-array"] },
  { family: "BRS", tokens: ["brs", "pcn brs", "bindt radiation safety"] },
  { family: "RTS", tokens: ["rts", "radiation safety"] },
  { family: "WT", tokens: ["wt", "wall thickness"] },
  { family: "UT", tokens: ["ut", "ultrasonic"] },
  { family: "MT", tokens: ["mt", "magnetic particle"] },
  { family: "PT", tokens: ["pt", "penetrant"] },
  { family: "VT", tokens: ["vt", "visual"] },
  { family: "ET", tokens: ["et", "eddy current"] },
  { family: "RT", tokens: ["rtfi", "cr/dr", "rt", "radiographic"] },
];

const SUGGESTION_ORDER: MethodFamily[] = [
  "PT",
  "MT",
  "RT",
  "UT",
  "WT",
  "BRS",
  "RTS",
  "VT",
  "ET",
  "PA",
  "OTHER",
];

function normaliseMethodText(input: string | null | undefined) {
  return (input ?? "").trim().toLowerCase();
}

export function getMethodFamilyFromText(input: string | null | undefined): MethodFamily {
  const normalised = normaliseMethodText(input);
  for (const rule of METHOD_FAMILY_RULES) {
    if (rule.tokens.some((token) => normalised.includes(token))) {
      return rule.family;
    }
  }
  return "OTHER";
}

export function getDefaultMethodColor(methodName: string | null | undefined) {
  return METHOD_FAMILY_COLOURS[getMethodFamilyFromText(methodName)];
}

export function suggestMethodColor(
  methodName: string | null | undefined,
  usedColors: Array<string | null | undefined> = []
) {
  const preferred = getDefaultMethodColor(methodName);
  const normalisedUsedColors = new Set(
    usedColors
      .map((value) => normaliseMethodText(value))
      .filter(Boolean)
  );

  if (!normalisedUsedColors.has(normaliseMethodText(preferred))) {
    return preferred;
  }

  for (const family of SUGGESTION_ORDER) {
    const candidate = METHOD_FAMILY_COLOURS[family];
    if (!normalisedUsedColors.has(normaliseMethodText(candidate))) {
      return candidate;
    }
  }

  return preferred;
}

export function getMethodColorFromCourse(
  courseCode: string | null | undefined,
  courseName: string | null | undefined,
  methods: Array<{ name: string; color?: string | null }>
) {
  const family = getMethodFamilyFromText(`${courseCode ?? ""} ${courseName ?? ""}`);
  const matchedMethod = methods.find(
    (method) => getMethodFamilyFromText(method.name) === family
  );

  return {
    family,
    color:
      matchedMethod?.color?.trim() ||
      METHOD_FAMILY_COLOURS[family] ||
      METHOD_FAMILY_COLOURS.OTHER,
  };
}
