export type PlaceholderDefinition = {
  key: string;
  description: string;
  category: string;
};

export type TemplateValidationIssue = {
  type: "unknown" | "missing_required" | "missing_recommended";
  severity: "error" | "warning";
  key: string;
  message: string;
};

export type TemplateValidationResult = {
  foundKeys: string[];
  knownKeys: string[];
  unknownKeys: string[];
  requiredKeys: string[];
  recommendedKeys: string[];
  missingRequiredKeys: string[];
  missingRecommendedKeys: string[];
  tokenUsage: Record<string, number>;
  issues: TemplateValidationIssue[];
  canSubmitForReview: boolean;
  status: "Ready" | "Needs Attention" | "Warnings";
};

export const DOCUMENT_PLACEHOLDERS: PlaceholderDefinition[] = [
  { key: "{{studentName}}", description: "Learner full name", category: "Learner" },
  { key: "{{studentFirstName}}", description: "Learner first name", category: "Learner" },
  { key: "{{studentLastName}}", description: "Learner surname", category: "Learner" },
  { key: "{{studentNumber}}", description: "Learner number", category: "Learner" },
  { key: "{{studentIdNumber}}", description: "Learner ID number", category: "Learner" },
  { key: "{{studentPassportNumber}}", description: "Learner passport number", category: "Learner" },
  { key: "{{enrollmentStatus}}", description: "Learner enrolment status", category: "Learner" },
  { key: "{{enrollmentDate}}", description: "Student enrolment date", category: "Learner" },
  { key: "{{courseName}}", description: "Course title", category: "Course" },
  { key: "{{courseCode}}", description: "Course code", category: "Course" },
  { key: "{{courseLabel}}", description: "Course code and title", category: "Course" },
  { key: "{{courseDescription}}", description: "Course description", category: "Course" },
  { key: "{{courseLevel}}", description: "Course level", category: "Course" },
  { key: "{{courseDurationDays}}", description: "Course duration in days", category: "Course" },
  { key: "{{scheduleId}}", description: "Schedule number", category: "Schedule" },
  { key: "{{scheduleStartDate}}", description: "Schedule start date", category: "Schedule" },
  { key: "{{scheduleEndDate}}", description: "Schedule end date", category: "Schedule" },
  { key: "{{scheduleStatus}}", description: "Current schedule status", category: "Schedule" },
  { key: "{{endOfCourseExamDate}}", description: "End-of-course exam date or range", category: "Schedule" },
  { key: "{{endOfCourseExamStartDate}}", description: "End-of-course exam start date", category: "Schedule" },
  { key: "{{endOfCourseExamEndDate}}", description: "End-of-course exam end date", category: "Schedule" },
  { key: "{{maxCapacity}}", description: "Schedule capacity", category: "Schedule" },
  { key: "{{enrolledCount}}", description: "Number of enrolled learners", category: "Schedule" },
  { key: "{{availableSeats}}", description: "Seats still available", category: "Schedule" },
  { key: "{{studentCount}}", description: "Number of learners linked to the schedule", category: "Schedule" },
  { key: "{{scheduleLocation}}", description: "Configured course delivery location", category: "Schedule" },
  { key: "{{industrySector}}", description: "Configured industry sector for the course", category: "Schedule" },
  { key: "{{sectorScope}}", description: "Sector-specific scope or notes", category: "Schedule" },
  { key: "{{productOrEquipmentScope}}", description: "Products or equipment relevant to the course", category: "Schedule" },
  { key: "{{techniqueScope}}", description: "Technique coverage for the course", category: "Schedule" },
  { key: "{{courseStartEquipmentList}}", description: "Selected equipment as plain text", category: "Schedule" },
  { key: "{{courseStartSpecimenList}}", description: "Selected specimens as plain text", category: "Schedule" },
  { key: "{{courseStartEquipmentListHtml}}", description: "Selected equipment as an HTML bullet list", category: "Schedule" },
  { key: "{{courseStartSpecimenListHtml}}", description: "Selected specimens as an HTML bullet list", category: "Schedule" },
  { key: "{{studentSafetyAcknowledgementRows}}", description: "HTML table rows for all learners on the schedule", category: "Schedule" },
  { key: "{{safetyDeclaration}}", description: "Editable safety acknowledgement declaration text", category: "Schedule" },
  { key: "{{lecturerPackNotes}}", description: "Lecturer notes configured for the course-start pack", category: "Schedule" },
  { key: "{{lecturerName}}", description: "Lecturer full name", category: "Lecturer" },
  { key: "{{lecturerFirstName}}", description: "Lecturer first name", category: "Lecturer" },
  { key: "{{lecturerLastName}}", description: "Lecturer surname", category: "Lecturer" },
  { key: "{{technicianName}}", description: "Technician full name", category: "Technician" },
  { key: "{{technicianFirstName}}", description: "Technician first name", category: "Technician" },
  { key: "{{technicianLastName}}", description: "Technician surname", category: "Technician" },
  { key: "{{technicianIdNumber}}", description: "Technician ID or passport number", category: "Technician" },
  { key: "{{technicianCertificateNumber}}", description: "Technician certificate number", category: "Technician" },
  { key: "{{branchName}}", description: "Branch name", category: "Branch" },
  { key: "{{companyName}}", description: "Branch company name", category: "Branch" },
  { key: "{{latestAssessmentType}}", description: "Latest assessment type", category: "Assessment" },
  { key: "{{latestAssessmentResult}}", description: "Latest assessment result", category: "Assessment" },
  { key: "{{latestAssessmentDate}}", description: "Latest assessment date", category: "Assessment" },
  { key: "{{latestAssessmentScore}}", description: "Latest assessment score", category: "Assessment" },
  { key: "{{assessmentDate}}", description: "Assessment date", category: "Assessment" },
  { key: "{{assessmentMethod}}", description: "Assessment method", category: "Assessment" },
  { key: "{{assessmentLevel}}", description: "Assessment level", category: "Assessment" },
  { key: "{{assessmentType}}", description: "Assessment type or attempt", category: "Assessment" },
  { key: "{{assessmentVenue}}", description: "Assessment venue", category: "Assessment" },
  { key: "{{assessmentReference}}", description: "Assessment reference number", category: "Assessment" },
  { key: "{{assessmentSupportDocumentListHtml}}", description: "HTML list of required support documents", category: "Assessment" },
  { key: "{{assessmentSupportDocumentSummary}}", description: "Plain-text list of required support documents", category: "Assessment" },
  { key: "{{assessmentResultNotice}}", description: "Assessment result notice or decision", category: "Assessment" },
  { key: "{{eyeTestValidUntil}}", description: "Technician eye test valid-until date", category: "Assessment" },
  { key: "{{examinerName}}", description: "Examiner full name", category: "Assessment" },
  { key: "{{certifyingAuthorityName}}", description: "Certifying authority name", category: "Assessment" },
  { key: "{{certificationScopeHtml}}", description: "HTML rows or list for authorised method scope", category: "Assessment" },
  { key: "{{certificateNumber}}", description: "Latest certificate number", category: "Certificate" },
  { key: "{{certificateStatus}}", description: "Latest certificate status", category: "Certificate" },
  { key: "{{certificateIssuedDate}}", description: "Latest certificate issue date", category: "Certificate" },
  { key: "{{certificateExpiryDate}}", description: "Latest certificate expiry date", category: "Certificate" },
  { key: "{{todayDate}}", description: "Current date", category: "System" },
];

const PLACEHOLDER_BY_KEY = new Map(
  DOCUMENT_PLACEHOLDERS.map((placeholder) => [normalizePlaceholderKey(placeholder.key), placeholder])
);

const TEMPLATE_CATEGORY_REQUIREMENTS: Record<
  string,
  { required: string[]; recommended: string[] }
> = {
  "Student Pack": {
    required: ["studentName", "courseLabel"],
    recommended: ["studentNumber", "branchName", "scheduleStartDate", "scheduleEndDate"],
  },
  "Course Control": {
    required: ["studentName", "courseLabel"],
    recommended: ["scheduleStartDate", "scheduleEndDate", "branchName"],
  },
  "Results & Certificates": {
    required: ["studentName", "courseLabel"],
    recommended: ["latestAssessmentResult", "latestAssessmentDate", "certificateNumber"],
  },
  "Lecturer Pack": {
    required: ["courseLabel", "scheduleStartDate", "scheduleEndDate"],
    recommended: ["lecturerName", "branchName", "scheduleStatus"],
  },
  "Level III Assessment Pack": {
    required: ["technicianName", "assessmentMethod", "assessmentLevel"],
    recommended: [
      "companyName",
      "branchName",
      "assessmentDate",
      "assessmentVenue",
      "assessmentSupportDocumentSummary",
    ],
  },
  General: {
    required: [],
    recommended: [],
  },
};

const DOCUMENT_TYPE_REQUIREMENTS: Record<
  string,
  { required: string[]; recommended: string[] }
> = {
  "Course Enrolment Confirmation": {
    required: ["studentName", "courseLabel", "scheduleStartDate", "scheduleEndDate"],
    recommended: ["studentNumber", "branchName", "enrollmentDate", "scheduleStatus"],
  },
  "Course Feedback Form": {
    required: ["studentName", "courseLabel"],
    recommended: ["scheduleStartDate", "scheduleEndDate"],
  },
  "Training Process Control Sheet": {
    required: ["studentName", "courseLabel"],
    recommended: ["studentNumber", "courseLevel", "branchName", "latestAssessmentResult"],
  },
  "Counselling Register": {
    required: ["studentName", "courseLabel"],
    recommended: ["todayDate"],
  },
  "Course Completion Checklist": {
    required: ["studentName", "courseLabel"],
    recommended: ["certificateNumber", "latestAssessmentResult"],
  },
  "Certificate of Attendance": {
    required: ["studentName", "courseLabel", "scheduleStartDate", "scheduleEndDate"],
    recommended: ["studentNumber", "branchName", "certificateNumber", "certificateIssuedDate"],
  },
  "End of Course Result Notice": {
    required: ["studentName", "courseLabel", "latestAssessmentResult"],
    recommended: ["studentNumber", "latestAssessmentDate", "latestAssessmentScore"],
  },
  "Exam Rewrite Application": {
    required: ["studentName", "courseLabel", "latestAssessmentResult"],
    recommended: ["studentNumber", "latestAssessmentScore"],
  },
  "Lecturer Course Information": {
    required: ["courseLabel", "scheduleStartDate", "scheduleEndDate"],
    recommended: ["branchName", "lecturerName", "endOfCourseExamDate", "scheduleStatus"],
  },
  "Course Start Readiness Sheet": {
    required: ["courseLabel", "courseDescription", "scheduleLocation", "lecturerName"],
    recommended: [
      "industrySector",
      "productOrEquipmentScope",
      "techniqueScope",
      "courseStartEquipmentListHtml",
      "courseStartSpecimenListHtml",
      "lecturerPackNotes",
    ],
  },
  "Student Safety Acknowledgement": {
    required: ["courseLabel", "scheduleLocation", "scheduleStartDate", "scheduleEndDate", "studentSafetyAcknowledgementRows"],
    recommended: ["lecturerName", "courseDescription", "safetyDeclaration", "studentCount"],
  },
  "Assessment Booking and Checklist": {
    required: ["technicianName", "assessmentMethod", "assessmentLevel", "assessmentDate"],
    recommended: [
      "companyName",
      "branchName",
      "technicianIdNumber",
      "assessmentVenue",
      "assessmentSupportDocumentListHtml",
      "eyeTestValidUntil",
    ],
  },
  "Practical Marking Sheet": {
    required: ["technicianName", "assessmentMethod", "assessmentDate"],
    recommended: [
      "assessmentLevel",
      "assessmentType",
      "assessmentVenue",
      "assessmentReference",
      "examinerName",
    ],
  },
  "Technician Authorisation Scope": {
    required: ["technicianName", "assessmentMethod", "assessmentLevel"],
    recommended: [
      "companyName",
      "branchName",
      "certificateNumber",
      "certifyingAuthorityName",
      "certificationScopeHtml",
    ],
  },
  "Assessment Result Notice": {
    required: ["technicianName", "assessmentMethod", "latestAssessmentResult"],
    recommended: [
      "assessmentDate",
      "assessmentLevel",
      "latestAssessmentScore",
      "assessmentResultNotice",
      "examinerName",
    ],
  },
};

export function normalizePlaceholderKey(value: string) {
  return value.replace(/{{\s*|\s*}}/g, "").trim();
}

export function toPlaceholderToken(value: string) {
  const key = normalizePlaceholderKey(value);
  return `{{${key}}}`;
}

export function extractDocumentPlaceholders(content: string) {
  return Array.from(
    new Set(
      Array.from(content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)).map((match) => match[1])
    )
  );
}

export function getPlaceholderDefinition(value: string) {
  return PLACEHOLDER_BY_KEY.get(normalizePlaceholderKey(value));
}

export function getDocumentPlaceholderCategories() {
  const grouped = new Map<string, PlaceholderDefinition[]>();
  for (const placeholder of DOCUMENT_PLACEHOLDERS) {
    const items = grouped.get(placeholder.category) || [];
    items.push(placeholder);
    grouped.set(placeholder.category, items);
  }

  return Array.from(grouped.entries());
}

export function getTemplatePlaceholderProfile(
  documentType?: string | null,
  templateCategory?: string | null
) {
  const categoryProfile =
    (templateCategory && TEMPLATE_CATEGORY_REQUIREMENTS[templateCategory]) ||
    TEMPLATE_CATEGORY_REQUIREMENTS.General;
  const documentTypeProfile =
    (documentType && DOCUMENT_TYPE_REQUIREMENTS[documentType]) || {
      required: [],
      recommended: [],
    };

  const required = Array.from(
    new Set([...categoryProfile.required, ...documentTypeProfile.required])
  );
  const recommended = Array.from(
    new Set([...categoryProfile.recommended, ...documentTypeProfile.recommended])
  ).filter((key) => !required.includes(key));

  return { required, recommended };
}

export function validateTemplatePlaceholders(input: {
  content: string;
  documentType?: string | null;
  templateCategory?: string | null;
}): TemplateValidationResult {
  const foundKeys = extractDocumentPlaceholders(input.content);
  const tokenUsage: Record<string, number> = {};

  for (const match of Array.from(input.content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g))) {
    const key = normalizePlaceholderKey(match[1] || "");
    tokenUsage[key] = (tokenUsage[key] || 0) + 1;
  }

  const knownKeys = foundKeys.filter((key) => PLACEHOLDER_BY_KEY.has(key));
  const unknownKeys = foundKeys.filter((key) => !PLACEHOLDER_BY_KEY.has(key));
  const profile = getTemplatePlaceholderProfile(input.documentType, input.templateCategory);
  const missingRequiredKeys = profile.required.filter((key) => !foundKeys.includes(key));
  const missingRecommendedKeys = profile.recommended.filter((key) => !foundKeys.includes(key));

  const issues: TemplateValidationIssue[] = [
    ...unknownKeys.map((key) => ({
      type: "unknown" as const,
      severity: "error" as const,
      key,
      message: `${toPlaceholderToken(key)} is not a recognised system placeholder.`,
    })),
    ...missingRequiredKeys.map((key) => ({
      type: "missing_required" as const,
      severity: "error" as const,
      key,
      message: `${toPlaceholderToken(key)} is required for this template type or category.`,
    })),
    ...missingRecommendedKeys.map((key) => ({
      type: "missing_recommended" as const,
      severity: "warning" as const,
      key,
      message: `${toPlaceholderToken(key)} is recommended for stronger document context.`,
    })),
  ];

  return {
    foundKeys,
    knownKeys,
    unknownKeys,
    requiredKeys: profile.required,
    recommendedKeys: profile.recommended,
    missingRequiredKeys,
    missingRecommendedKeys,
    tokenUsage,
    issues,
    canSubmitForReview: unknownKeys.length === 0 && missingRequiredKeys.length === 0,
    status:
      unknownKeys.length > 0 || missingRequiredKeys.length > 0
        ? "Needs Attention"
        : missingRecommendedKeys.length > 0
        ? "Warnings"
        : "Ready",
  };
}

export function replacePlaceholderToken(
  content: string,
  sourceKey: string,
  targetKey: string
) {
  const sourceToken = normalizePlaceholderKey(sourceKey);
  const targetToken = toPlaceholderToken(targetKey);
  const pattern = new RegExp(`{{\\s*${sourceToken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*}}`, "g");
  return content.replace(pattern, targetToken);
}
