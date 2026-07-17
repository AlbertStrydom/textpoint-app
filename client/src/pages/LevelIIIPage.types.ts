import type { FormField } from "@/components/FormDialog";

export type VisitCadence = "Weekly" | "Monthly" | "Six Monthly";
export type LevelIIIEquipmentStatus = "Available" | "In Service" | "Calibration Due" | "Out of Service";
export type LevelIIISpecimenStatus = "Available" | "In Use" | "Shared" | "Retired";

export type LevelIIIClient = {
  id: number;
  companyName: string;
  primaryContact: string;
  secondaryContact: string | null;
  email: string;
  secondaryEmail: string | null;
  phone: string;
  secondaryPhone: string | null;
  physicalAddress: string;
  visitCadence: VisitCadence;
  lastVisit: string | Date | null;
  nextVisit: string | Date | null;
  procedureUpdatedAt: string | Date | null;
  notes: string | null;
  linkedBranchInfo?: {
    headOfficeClientId: number;
    headOfficeName: string;
    branchId: number;
    branchName: string;
  } | null;
};

export type LevelIIIClientBranch = {
  id: number;
  clientId: number;
  sourceClientId?: number | null;
  sourceClientName?: string | null;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  sortOrder: number;
};

export type LevelIIITechnician = {
  id: number;
  clientId: number;
  clientBranchId?: number | null;
  name: string;
  email: string;
  phone: string | null;
  method: string;
  methods: string[];
  level: string;
  methodQualifications?: LevelIIITechnicianMethodQualification[];
  hasPcnQualification: boolean;
  certificateNumber: string | null;
  procedureStatus: string | null;
  pcnRenewalDate: string | Date | null;
  internalAssessmentDate: string | Date | null;
  eyeTestValidUntil: string | Date | null;
  notes: string | null;
};

export type LevelIIIEquipment = {
  id: number;
  name: string;
  serialNumber: string;
  status: LevelIIIEquipmentStatus;
  sharedWithMainEquipment: boolean;
  owner: string;
  calibrationType: string | null;
  lastServiceDate: string | Date | null;
  nextDueDate: string | Date | null;
  notes: string | null;
};

export type LevelIIISpecimen = {
  id: number;
  specimenNumber: string;
  name: string;
  specimenType: string;
  status: LevelIIISpecimenStatus;
  sharedWithMainSpecimens: boolean;
  masteringStatus: "Mastered" | "Re-master Required" | "Pending";
  notes: string | null;
};

export type LevelIIIAssessmentResult = "Pass" | "Fail" | "Observation" | "Pending Review";
export type LevelIIIAssessmentMethodLevel = {
  method: string;
  level: string;
};

export type LevelIIIAssessment = {
  id: number;
  technicianId: number;
  assessmentDate: string | Date;
  method: string;
  level: string;
  methodLevels?: LevelIIIAssessmentMethodLevel[];
  assessor: string;
  result: LevelIIIAssessmentResult;
  nextReviewDate: string | Date | null;
  evidenceUrl: string | null;
  notes: string | null;
};

export type LevelIIITechnicianCertificateStatus =
  | "Active"
  | "Expired"
  | "Revoked"
  | "Superseded";
export type LevelIIITechnicianCertificateApprovalStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected";
export type LevelIIITechnicianCertificateValidityUnit =
  | "days"
  | "months"
  | "years"
  | "custom";
export type LevelIIITechnicianCertificate = {
  id: number;
  technicianId: number;
  assessmentId: number | null;
  clientId: number;
  clientBranchId: number | null;
  certificateNumber: string;
  method: string;
  level: string;
  methodLevels?: LevelIIIAssessmentMethodLevel[] | null;
  issuedDate: string | Date;
  validUntil: string | Date | null;
  validityValue: number | null;
  validityUnit: LevelIIITechnicianCertificateValidityUnit | null;
  status: LevelIIITechnicianCertificateStatus;
  fileName: string | null;
  fileUrl: string | null;
  fileKey?: string | null;
  contentType?: string | null;
  sourceFileName?: string | null;
  sourcePath?: string | null;
  approvalStatus: LevelIIITechnicianCertificateApprovalStatus;
  approvalRequestedAt?: string | Date | null;
  approvalRequestedBy?: number | null;
  approvedAt?: string | Date | null;
  approvedBy?: number | null;
  approvalNote?: string | null;
  notes: string | null;
  issuedBy: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  autoSupersededCertificates?: Array<{
    id: number;
    technicianId: number;
    certificateNumber: string | null;
    status: string | null;
    notes?: string | null;
  }> | null;
};
export type LevelIIITechnicianCertificateExportHistoryItem = {
  id: number;
  certificateId: number;
  technicianId: number;
  clientId: number;
  exportFormat: "html" | "pdf";
  fileName: string;
  title: string | null;
  subtitle: string | null;
  artifactSummary: Record<string, string | null> | null;
  artifactPayload: Record<string, unknown> | null;
  exportedByUserId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  createdAt: string | Date | null;
};
export type AuditTrailEntry = {
  id: number;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  changesSummary: string;
  createdAt: string | Date;
};
export type CertificateIssuanceImpactPreview = {
  canSave: boolean;
  willSupersedeCertificateIds: number[];
  willSupersedeCertificateNumbers: string[];
  blockingCertificateId: number | null;
  blockingCertificateNumber: string | null;
};
export type LevelIIICertificateWorkflowNotice = {
  kind: "blocked" | "auto_superseded" | "approval_reset";
  title: string;
  description: string;
};
export type LevelIIICertificateLifecycleSummary = {
  issuedRecent: LevelIIITechnicianCertificate[];
  approvedRecent: LevelIIITechnicianCertificate[];
  expiringSoon: LevelIIITechnicianCertificate[];
  autoSupersededRecent: LevelIIITechnicianCertificate[];
};
export type TechnicianDocumentControlSummary = {
  missingEvidenceRows: PortalRequirementRow[];
  expiredRows: PortalRequirementRow[];
  pendingReviewRows: PortalRequirementRow[];
  currentWithoutEvidenceRows: PortalRequirementRow[];
  certificateLinkedRows: PortalRequirementRow[];
};
export type TechnicianIntakeQueueItem = {
  technician: LevelIIITechnician;
  importedFromDrive: boolean;
  hasAssessment: boolean;
  hasActiveCertificate: boolean;
  missingEvidenceCount: number;
  pendingReviewCount: number;
  currentWithoutEvidenceCount: number;
  reasons: string[];
};
export type TechnicianIntakeQueueSummary = {
  importedFromDrive: number;
  noAssessment: number;
  noActiveCertificate: number;
  missingEvidence: number;
  pendingReview: number;
  readyForCertificate: number;
  items: TechnicianIntakeQueueItem[];
};
export type LevelIIIDocumentGenerationQueueItem = {
  certificate: LevelIIITechnicianCertificate;
  technician: LevelIIITechnician | null;
  recommendedFileName: string;
  priorityLabel: string;
  priorityRank: number;
  hasStoredFile: boolean;
  hasReleaseExport: boolean;
  hasApprovedControlledDocument: boolean;
  sourceBackedImport: boolean;
  latestReleaseExport: LevelIIITechnicianCertificateExportHistoryItem | null;
  missingEvidenceCount: number;
  pendingReviewCount: number;
  controlledDocumentCount: number;
  controlledDraftCount: number;
  controlledIssuedCount: number;
  controlledInReviewCount: number;
  controlledRejectedCount: number;
  latestControlledDocument: LevelIIIControlledDocumentRecord | null;
  storageTargets: Array<{ label: string; path: string }>;
  reasons: string[];
};
export type TechnicianCertificateFileLinkSuggestion = {
  recommendedFileName: string;
  storageTargets: Array<{ label: string; path: string }>;
};
export type LevelIIIDocumentGenerationSummary = {
  readyForFinalExport: number;
  blockedByApproval: number;
  missingStoredFiles: number;
  sourceBackedImports: number;
  techniciansWithAutomationTargets: number;
  releasedByControlledDocs: number;
  missingControlledDocs: number;
  controlledDrafts: number;
  controlledInReview: number;
  controlledRejected: number;
  controlledIssued: number;
  items: LevelIIIDocumentGenerationQueueItem[];
};
export type LevelIIIDocumentGenerationFilter =
  | "all"
  | "approval_blocked"
  | "rejected_controlled"
  | "ready_to_release"
  | "missing_controlled"
  | "draft_progress"
  | "evidence_follow_up"
  | "imported_follow_up";
export type LevelIIITechnicianQueueFilter =
  | "all"
  | "missing_evidence"
  | "pending_review"
  | "expired"
  | "current_without_evidence";
export type LevelIIIDocumentWatchlistHandledEntry = {
  certificateId: number;
  certificateNumber: string;
  technicianName: string;
  priorityLabel: string;
  signature: string;
  handledAt: string;
};
export type LevelIIITechnicianDocumentQueueHandledEntry = {
  technicianId: number;
  definitionId: number;
  technicianName: string;
  definitionName: string;
  queueLabel: string;
  signature: string;
  handledAt: string;
};
export type LevelIIITechnicianDocumentQueueItem = {
  row: PortalRequirementRow;
  queueLabel: string;
  queueRank: number;
  reason: string;
  supportsUpload: boolean;
};
export type LevelIIICrossTechnicianQueueLastStartedItem = {
  signature: string;
  technicianId: number;
  technicianName: string;
  definitionId: number;
  definitionName: string;
  queueLabel: string;
  action: "record" | "upload";
  startedAt: string;
};

export type LevelIIICrossTechnicianQueueSessionState = {
  signatures: string[];
  updatedAt: string | null;
  autoHandle: boolean;
  peakCount: number;
  lastStartedItem: LevelIIICrossTechnicianQueueLastStartedItem | null;
};
export type LevelIIIRolloutReadinessSummary = {
  activeCertificates: number;
  pendingCertificateApprovals: number;
  expiringCertificates: number;
  complianceMissingEvidence: number;
  compliancePendingReview: number;
  requestUploadsOutstanding: number;
  requestGuideGaps: number;
  checklistItems: string[];
};
export type CertificateQueueFilter =
  | "all"
  | "approved"
  | "in_review"
  | "draft"
  | "active"
  | "superseded"
  | "expiring_soon";

export type LevelIIITabValue =
  | "clients"
  | "activities"
  | "technicians"
  | "assessments"
  | "portalRequests"
  | "equipment"
  | "specimens"
  | "reminders";
export type CertificateSignOffAction = "submit" | "approve" | "reject" | "reopen";
export type PortalRequirementStatus =
  | "missing"
  | "current"
  | "no_expiry"
  | "expiring"
  | "expired"
  | "pending_review";
export type PortalCustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox";
export type PortalRequirementCustomField = {
  key: string;
  label: string;
  type: PortalCustomFieldType;
  required: boolean;
  placeholder: string | null;
  helpText: string | null;
  options: string[];
  sortOrder: number;
};
export type PortalRequirementDefinition = {
  id: number;
  clientId: number;
  name: string;
  category: string;
  description: string | null;
  validityDays: number | null;
  reminderDays: number;
  isRequired: boolean;
  active: boolean;
  sortOrder: number;
  customFields: PortalRequirementCustomField[];
};

export type PortalRequirementRow = {
  recordId: number | null;
  technicianId: number;
  technicianName: string;
  technicianEmail: string;
  technicianMethods: string[];
  technicianLevel: string;
  definitionId: number;
  definitionName: string;
  definitionCategory: string;
  definitionDescription: string | null;
  validityDays: number | null;
  reminderDays: number;
  isRequired: boolean;
  definitionCustomFields: PortalRequirementCustomField[];
  status: PortalRequirementStatus;
  issuedAt: string | Date | null;
  validUntil: string | Date | null;
  notes: string | null;
  customFieldValues: Record<string, string | number | boolean | null>;
  documentCount: number;
  latestDocumentName: string | null;
  latestDocumentUrl: string | null;
  sourceReferenceCount?: number;
  latestSourceReferenceFileName?: string | null;
  latestSourceReferencePath?: string | null;
};
export type RequirementTableRow = PortalRequirementRow & { id: string | number };

export type LevelIIIActivityType =
  | "Visit"
  | "Call"
  | "Email"
  | "Assessment"
  | "Procedure Review"
  | "General";

export type LevelIIIActivityStatus = "Planned" | "Completed" | "Cancelled";

export type LevelIIIActivity = {
  id: number;
  clientId: number;
  activityType: LevelIIIActivityType;
  subject: string;
  activityDate: string | Date;
  nextActionDate: string | Date | null;
  status: LevelIIIActivityStatus;
  notes: string | null;
};

export type PortalServiceRequestStatus =
  | "submitted"
  | "in_review"
  | "planned"
  | "scheduled"
  | "completed"
  | "closed";

export type PortalCommentRequestType = "general_comment" | "contact_request" | "suggestion";
export type PortalCommentStatus = "open" | "acknowledged" | "closed";
export type PortalServiceRequestSupportingDocument = {
  label: string;
  note: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileKey?: string | null;
  contentType?: string | null;
  classifiedLabel?: string | null;
  storagePath?: string | null;
  suggestedFileName?: string | null;
  linkedRequirementDefinitionId?: number | null;
  linkedRequirementDefinitionName?: string | null;
};
export type PortalServiceRequestMetadata = {
  supportingDocuments: PortalServiceRequestSupportingDocument[];
  clientVisibleUpdate: string | null;
  internalOwner: string | null;
  plannedAction: string | null;
  confirmedDate: string | Date | null;
  linkedActivityId: number | null;
  selectedTechniques: string[];
  matchedGuideTitles: string[];
  readinessBringItems: string[];
  readinessCompanyItems: string[];
  uncoveredTechniques: string[];
  plannerNotes: string | null;
  [key: string]: unknown;
};
export type PortalLinkedLevelIIIActivity = {
  id: number;
  activityType: LevelIIIActivityType;
  subject: string;
  activityDate: string | Date;
  nextActionDate: string | Date | null;
  status: LevelIIIActivityStatus;
  notes: string | null;
};

export type PortalServiceRequest = {
  id: number;
  clientId: number;
  clientBranchId: number | null;
  branchName: string | null;
  serviceDefinitionId: number | null;
  serviceDefinitionTitle: string | null;
  userId: number;
  requestedByName: string | null;
  requestedByEmail: string | null;
  technicianId: number | null;
  technicianName: string | null;
  title: string;
  requestType: string;
  status: PortalServiceRequestStatus;
  preferredDate: string | Date | null;
  techniques: string[];
  details: string | null;
  requestedDocuments: string[];
  internalNotes: string | null;
  metadata: PortalServiceRequestMetadata | null;
  supportingDocuments: PortalServiceRequestSupportingDocument[];
  linkedActivity?: PortalLinkedLevelIIIActivity | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type PortalComment = {
  id: number;
  clientId: number;
  userId: number;
  requestType: PortalCommentRequestType;
  subject: string;
  message: string;
  status: PortalCommentStatus;
  internalNotes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdByName: string | null;
  createdByEmail: string | null;
};

export type PortalActionQueuePriority = "critical" | "high" | "normal";
export type PortalActionQueueItem = {
  id: string;
  kind: "service_request" | "comment";
  priority: PortalActionQueuePriority;
  priorityRank: number;
  title: string;
  detail: string;
  status: PortalServiceRequestStatus | PortalCommentStatus;
  createdAt: string | Date;
  request?: PortalServiceRequest;
  comment?: PortalComment;
};

export type ReminderItem = {
  id: string;
  type: string;
  subject: string;
  detail: string;
  dueDate: string | Date;
};

export type LevelIIITechnicianMethodQualification = {
  method: string;
  level: string;
};
export type LevelIIIControlledDocumentMetadata = {
  kind?: "library" | "template" | "generated";
  generatedStatus?: "Draft" | "Issued" | "Corrected" | "Superseded";
  approvalStatus?: "Draft" | "In Review" | "Approved" | "Rejected";
  sourceType?: string;
  certificateId?: number;
  technicianId?: number;
  clientId?: number;
  documentCode?: string;
  issueNumber?: string;
  effectiveDate?: string;
  generatedAt?: string;
};
export type LevelIIIControlledDocumentRecord = {
  id: number;
  title: string;
  description: string | null;
  documentType: string | null;
  content: string | null;
  url: string;
  branchId: number | null;
  tags: LevelIIIControlledDocumentMetadata | null;
  createdAt: string | Date;
};

export type AssessmentFormState = {
  technicianId: string;
  assessmentDate: string;
  assessor: string;
  result: LevelIIIAssessmentResult;
  nextReviewDate: string;
  evidenceUrl: string;
  notes: string;
  methodLevels: LevelIIIAssessmentMethodLevel[];
};

export type TechnicianFormState = {
  clientId: string;
  clientBranchId: string;
  name: string;
  email: string;
  phone: string;
  hasPcnQualification: boolean;
  certificateNumber: string;
  pcnRenewalDate: string;
  internalAssessmentDate: string;
  eyeTestValidUntil: string;
  procedureStatus: string;
  notes: string;
  methodQualifications: LevelIIITechnicianMethodQualification[];
};
export type TechnicianCertificateFormState = {
  technicianId: string;
  assessmentId: string;
  certificateNumber: string;
  issuedDate: string;
  validUntil: string;
  validityValue: string;
  validityUnit: LevelIIITechnicianCertificateValidityUnit;
  status: LevelIIITechnicianCertificateStatus;
  approvalStatus: LevelIIITechnicianCertificateApprovalStatus;
  notes: string;
  fileName: string;
  fileUrl: string;
  attachmentFileDataUrl: string;
  attachmentFileName: string;
  methodLevels: LevelIIIAssessmentMethodLevel[];
};
export type TechnicianRequirementFormState = {
  technicianId: string;
  definitionId: string;
  status: PortalRequirementStatus;
  issuedAt: string;
  validUntil: string;
  notes: string;
  attachmentFile: string;
  [key: `customField__${string}`]: unknown;
};
export type PortalServiceRequestManagementFormState = {
  status: PortalServiceRequestStatus;
  confirmedDate: string;
  internalOwner: string;
  plannedAction: string;
  clientVisibleUpdate: string;
  internalNotes: string;
};
export type LevelIIIEvidenceReviewSource =
  | "certificate"
  | "requirement"
  | "portal_request"
  | "request_pack";
export type LevelIIIEvidenceReviewState = {
  source: LevelIIIEvidenceReviewSource;
  title: string;
  description: string;
  fileName: string | null;
  fileUrl: string;
  contentType?: string | null;
  storagePath?: string | null;
  sourceReference?: string | null;
  certificate?: LevelIIITechnicianCertificate | null;
  requirement?: PortalRequirementRow | null;
  portalRequest?: PortalServiceRequest | null;
  badges?: Array<{
    key: string;
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }>;
};
export type LevelIIIDocumentDefinitionFormState = {
  name: string;
  category: string;
  description: string;
  validityMode: "days" | "na";
  validityDays: string;
  reminderDays: string;
  sortOrder: string;
  isRequired: boolean;
  active: boolean;
};
export type TechnicianDirectUploadFormState = {
  documentLabel: string;
  fileName: string;
  issuedAt: string;
  notes: string;
  attachmentFile: string;
  attachmentFileName: string;
};

export type AssessmentBookingReadinessState = "ready" | "uploads_needed" | "guide_setup_needed";

export type AssessmentBookingReadinessSnapshot = {
  state: AssessmentBookingReadinessState;
  selectedTechniques: string[];
  matchedGuideTitles: string[];
  bringItems: string[];
  companyItems: string[];
  uncoveredTechniques: string[];
  uploadedCount: number;
  requiredUploadCount: number;
  outstandingUploadLabels: string[];
  plannerNotes: string | null;
};
