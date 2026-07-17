import { type Column } from "@/components/DataTable";
import { type FormField } from "@/components/FormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  LevelIIIActivity,
  LevelIIIAssessment,
  LevelIIIClient,
  LevelIIIClientBranch,
  LevelIIIControlledDocumentRecord,
  LevelIIIEquipment,
  LevelIIIEvidenceReviewState,
  LevelIIISpecimen,
  LevelIIITechnician,
  LevelIIITechnicianCertificate,
  LevelIIITechnicianCertificateApprovalStatus,
  LevelIIITechnicianCertificateStatus,
  LevelIIIEvidenceReviewSource,
  PortalComment,
  PortalCommentRequestType,
  PortalCommentStatus,
  PortalRequirementDefinition,
  PortalRequirementStatus,
  PortalServiceRequest,
  PortalServiceRequestStatus,
  RequirementTableRow,
} from "./LevelIIIPage.types";
import {
  formatAssessmentLevels,
  formatAssessmentMethods,
  formatLevelIIICategoryLabel,
  formatLevelIIIStatusLabel,
  formatMethods,
  formatTechnicianLevels,
  getAssessmentBookingReadinessBadge,
  getAssessmentBookingReadinessSnapshot,
  getCertificateApprovalBadge,
  getCertificateMethodLevels,
  getCertificateStatusBadge,
  getDueBadge,
  getPortalCommentStatusBadge,
  getPortalCommentTypeLabel,
  getPortalServiceRequestStatusBadge,
  getQualificationReviewDate,
  getQualificationTypeLabel,
  getRequirementCustomFieldSummary,
  getRequirementStatusBadge,
  getTechnicianMethods,
  isCertificateExpiringSoon,
  normalisePortalServiceRequestMetadata,
} from "./LevelIIIPage.utils";

export const clientColumns: Column<LevelIIIClient>[] = [
  {
    key: "companyName",
    label: "Company",
    sortable: true,
    filterable: true,
    render: (value, row) => (
      <div className="space-y-1">
        <div className="font-medium">{String(value)}</div>
        {row.linkedBranchInfo ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Linked Branch Record</Badge>
            <span className="text-xs text-muted-foreground">
              Hidden under {row.linkedBranchInfo.headOfficeName} / {row.linkedBranchInfo.branchName}
            </span>
          </div>
        ) : null}
      </div>
    ),
  },
  { key: "primaryContact", label: "Primary Contact", sortable: true },
  { key: "secondaryContact", label: "Secondary Contact", sortable: true, render: (value) => value || "-" },
  { key: "email", label: "Email", sortable: true },
  { key: "phone", label: "Phone", sortable: true },
  { key: "visitCadence", label: "Visit Cadence", sortable: true },
  {
    key: "nextVisit",
    label: "Next Visit",
    sortable: true,
    render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
  },
  {
    key: "procedureUpdatedAt",
    label: "Procedure Review",
    sortable: true,
    render: (value) => getDueBadge(value ? String(value) : null),
  },
];

export function createActivityColumns(clients: LevelIIIClient[]): Column<LevelIIIActivity>[] {
  return [
    {
      key: "clientId",
      label: "Company",
      sortable: true,
      render: (value) => clients.find((client) => client.id === value)?.companyName || "-",
    },
    { key: "activityType", label: "Type", sortable: true },
    { key: "subject", label: "Subject", sortable: true, filterable: true },
    {
      key: "activityDate",
      label: "Activity Date",
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge
          variant={
            value === "Completed"
              ? "default"
              : value === "Cancelled"
                ? "destructive"
                : "secondary"
          }
        >
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "nextActionDate",
      label: "Next Action",
      sortable: true,
      render: (value) => getDueBadge(value ? String(value) : null),
    },
  ];
}

export interface TechnicianColumnDeps {
  clients: LevelIIIClient[];
  clientBranchesById: Map<number, LevelIIIClientBranch>;
  primaryTechnicianCertificateByTechnicianId: Map<number, LevelIIITechnicianCertificate>;
  controlledDocumentsByCertificateId: Map<number, LevelIIIControlledDocumentRecord[]>;
  approvedControlledDocumentByCertificateId: Map<number, LevelIIIControlledDocumentRecord>;
}

export function createTechnicianColumns(deps: TechnicianColumnDeps): Column<LevelIIITechnician>[] {
  const { clients, clientBranchesById, primaryTechnicianCertificateByTechnicianId, controlledDocumentsByCertificateId, approvedControlledDocumentByCertificateId } = deps;

  return [
    {
      key: "clientId",
      label: "Company",
      sortable: true,
      render: (value) => clients.find((client) => client.id === value)?.companyName || "-",
    },
    {
      key: "clientBranchId",
      label: "Branch",
      sortable: true,
      render: (value) =>
        typeof value === "number" ? clientBranchesById.get(value)?.name || "-" : "Unassigned",
    },
    { key: "name", label: "Technician", sortable: true, filterable: true },
    {
      key: "methods",
      label: "Methods",
      sortable: false,
      render: (_value, row) => formatMethods(getTechnicianMethods(row)),
    },
    {
      key: "level",
      label: "Level",
      sortable: true,
      render: (_value, row) => formatTechnicianLevels(row),
    },
    {
      key: "hasPcnQualification",
      label: "Qualification",
      sortable: true,
      render: (_value, row) => (
        <Badge variant={row.hasPcnQualification ? "default" : "secondary"}>
          {getQualificationTypeLabel(row)}
        </Badge>
      ),
    },
    { key: "procedureStatus", label: "Procedure / Assessment", sortable: true, render: (value) => value || "-" },
    {
      key: "internalAssessmentDate",
      label: "Next Review",
      sortable: true,
      render: (_value, row) => getDueBadge(getQualificationReviewDate(row)),
    },
    {
      key: "eyeTestValidUntil",
      label: "Eye Test",
      sortable: true,
      render: (value) => getDueBadge(value ? String(value) : null),
    },
    {
      key: "certificateNumber",
      label: "Certificate Readiness",
      sortable: false,
      render: (_value, row) => {
        const certificate = primaryTechnicianCertificateByTechnicianId.get(row.id) ?? null;
        const controlledDocumentsForCertificate = certificate
          ? controlledDocumentsByCertificateId.get(certificate.id) ?? []
          : [];
        const approvedControlledDocument = certificate
          ? approvedControlledDocumentByCertificateId.get(certificate.id) ?? null
          : null;
        const latestControlledDocument = [...controlledDocumentsForCertificate].sort(
          (left, right) =>
            (new Date(right.createdAt).getTime() || 0) - (new Date(left.createdAt).getTime() || 0)
        )[0];

        if (!certificate) {
          return (
            <div className="space-y-1">
              <p className="text-sm font-medium">No certificate</p>
              <Badge variant="outline">Issue Required</Badge>
            </div>
          );
        }

        const releaseBadge = approvedControlledDocument ? (
          <Badge className="bg-emerald-100 text-emerald-900">Released Controlled</Badge>
        ) : certificate.fileUrl ? (
          <Badge className="bg-blue-100 text-blue-900">Released File</Badge>
        ) : certificate.approvalStatus === "approved" ? (
          <Badge className="bg-amber-100 text-amber-900">Approved, Not Released</Badge>
        ) : latestControlledDocument ? (
          <Badge variant="outline">
            Controlled {String(latestControlledDocument.tags?.approvalStatus || "Draft")}
          </Badge>
        ) : (
          <Badge variant="secondary">No Controlled Doc</Badge>
        );

        return (
          <div className="space-y-1">
            <p className="text-sm font-medium">{certificate.certificateNumber || "Unnumbered"}</p>
            <div className="flex flex-wrap gap-1">
              {getCertificateStatusBadge(certificate.status)}
              {getCertificateApprovalBadge(certificate.approvalStatus)}
              {releaseBadge}
            </div>
          </div>
        );
      },
    },
  ];
}

export interface TechnicianCertificateColumnDeps {
  technicians: LevelIIITechnician[];
  clients: LevelIIIClient[];
  getLevelIIITechnicianName: (technicianId: number) => string;
  openEvidenceReview: (review: LevelIIIEvidenceReviewState) => void;
}

export function createTechnicianCertificateColumns(deps: TechnicianCertificateColumnDeps): Column<LevelIIITechnicianCertificate>[] {
  const { technicians, clients, getLevelIIITechnicianName, openEvidenceReview } = deps;

  return [
    {
      key: "certificateNumber",
      label: "Certificate",
      sortable: true,
      filterable: true,
    },
    {
      key: "technicianId",
      label: "Technician",
      sortable: true,
      render: (value) => technicians.find((technician) => technician.id === value)?.name || "-",
    },
    {
      key: "clientId",
      label: "Company",
      sortable: true,
      render: (value) => clients.find((client) => client.id === value)?.companyName || "-",
    },
    {
      key: "method",
      label: "Methods",
      sortable: true,
      render: (_value, row) =>
        formatMethods(getCertificateMethodLevels(row).map((entry) => entry.method)),
    },
    {
      key: "level",
      label: "Levels",
      sortable: true,
      render: (_value, row) =>
        getCertificateMethodLevels(row)
          .map((entry) => `${entry.method}: ${entry.level}`)
          .join(" | ") || row.level,
    },
    {
      key: "validUntil",
      label: "Valid Until",
      sortable: true,
      render: (_value, row) => getDueBadge(row.validUntil ? String(row.validUntil) : null),
    },
    {
      key: "updatedAt",
      label: "Urgency",
      sortable: false,
      render: (_value, row) => {
        if (row.approvalStatus === "in_review") {
          return <Badge className="bg-amber-100 text-amber-900">Review Now</Badge>;
        }
        if (row.status === "Active" && isCertificateExpiringSoon(row)) {
          return <Badge className="bg-orange-100 text-orange-900">Expiring Soon</Badge>;
        }
        if (row.approvalStatus === "draft" || row.approvalStatus === "rejected") {
          return <Badge variant="secondary">Needs Submission</Badge>;
        }
        if (row.status === "Superseded") {
          return <Badge variant="outline">Historical</Badge>;
        }
        return <Badge className="bg-emerald-100 text-emerald-900">Stable</Badge>;
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => getCertificateStatusBadge(value as LevelIIITechnicianCertificateStatus),
    },
    {
      key: "approvalStatus",
      label: "Sign-Off",
      sortable: true,
      render: (value) =>
        getCertificateApprovalBadge(value as LevelIIITechnicianCertificateApprovalStatus),
    },
    {
      key: "fileName",
      label: "File",
      sortable: true,
      render: (_value, row) =>
        row.fileUrl ? (
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={(event) => {
              event.stopPropagation();
              openEvidenceReview({
                source: "certificate",
                title: row.fileName || row.sourceFileName || row.certificateNumber,
                description: `${row.certificateNumber} | ${getLevelIIITechnicianName(row.technicianId)}`,
                fileName: row.fileName || row.sourceFileName || null,
                fileUrl: row.fileUrl ?? "",
                contentType: row.contentType ?? null,
                sourceReference: row.sourcePath ?? null,
                certificate: row,
                badges: [
                  {
                    key: "status",
                    label: formatLevelIIIStatusLabel(row.status),
                    variant: row.status === "Expired" ? "destructive" : "secondary",
                  },
                  {
                    key: "approval",
                    label: formatLevelIIIStatusLabel(row.approvalStatus),
                    variant: "outline",
                  },
                ],
              });
            }}
          >
            {row.fileName || "Open file"}
          </Button>
        ) : (
          row.fileName || row.sourceFileName || "-"
        ),
    },
    {
      key: "sourcePath",
      label: "Import Source",
      sortable: false,
      render: (_value, row) =>
        row.sourcePath ? (
          <span className="text-xs text-muted-foreground">{row.sourceFileName || row.sourcePath}</span>
        ) : (
          "-"
        ),
    },
  ];
}

export interface TechnicianRequirementColumnDeps {
  getLevelIIITechnicianName: (technicianId: number) => string;
  openEvidenceReview: (review: LevelIIIEvidenceReviewState) => void;
}

export function createTechnicianRequirementColumns(deps: TechnicianRequirementColumnDeps): Column<RequirementTableRow>[] {
  const { getLevelIIITechnicianName, openEvidenceReview } = deps;

  return [
    { key: "definitionName", label: "Requirement", sortable: true, filterable: true },
    { key: "definitionCategory", label: "Category", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => getRequirementStatusBadge(value as PortalRequirementStatus),
    },
    {
      key: "validUntil",
      label: "Valid Until",
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
    },
    {
      key: "documentCount",
      label: "Evidence",
      sortable: true,
      render: (_value, row) =>
        row.latestDocumentUrl ? (
          <Button
            variant="link"
            className="h-auto p-0"
            onClick={(event) => {
              event.stopPropagation();
              openEvidenceReview({
                source: "requirement",
                title: row.latestDocumentName || row.definitionName,
                description: `${row.definitionName} | ${getLevelIIITechnicianName(row.technicianId)}`,
                fileName: row.latestDocumentName,
                fileUrl: row.latestDocumentUrl ?? "",
                sourceReference: row.latestSourceReferencePath ?? null,
                requirement: row,
                badges: [
                  {
                    key: "status",
                    label: formatLevelIIIStatusLabel(row.status),
                    variant:
                      row.status === "expired"
                        ? "destructive"
                        : row.status === "pending_review"
                          ? "outline"
                          : "secondary",
                  },
                  {
                    key: "category",
                    label: formatLevelIIICategoryLabel(row.definitionCategory),
                    variant: "outline",
                  },
                ],
              });
            }}
          >
            {row.latestDocumentName || `${row.documentCount} file(s)`}
          </Button>
        ) : (
          row.sourceReferenceCount && row.sourceReferenceCount > 0
            ? `${row.documentCount} uploaded / ${row.sourceReferenceCount} imported ref`
            : `${row.documentCount} file(s)`
        ),
    },
    {
      key: "customFieldValues",
      label: "Requirement Details",
      sortable: false,
      render: (_value, row) => (
        <span className="text-xs text-muted-foreground">
          {getRequirementCustomFieldSummary(row)}
        </span>
      ),
    },
  ];
}

export const technicianRequirementDefinitionColumns: Column<PortalRequirementDefinition>[] = [
  { key: "name", label: "Document Type", sortable: true, filterable: true },
  { key: "category", label: "Category", sortable: true },
  {
    key: "validityDays",
    label: "Expiry Rule",
    sortable: true,
    render: (value) =>
      Number(value) > 0 ? `${Number(value).toLocaleString()} day validity` : "N/A",
  },
  {
    key: "reminderDays",
    label: "Reminder",
    sortable: true,
    render: (value) => `${Number(value ?? 30)} day${Number(value ?? 30) === 1 ? "" : "s"}`,
  },
  {
    key: "active",
    label: "Status",
    sortable: true,
    render: (value) =>
      value ? <Badge className="bg-emerald-100 text-emerald-900">Active</Badge> : <Badge variant="outline">Inactive</Badge>,
  },
];

export function createAssessmentColumns(technicians: LevelIIITechnician[], clients: LevelIIIClient[]): Column<LevelIIIAssessment>[] {
  return [
    {
      key: "technicianId",
      label: "Company",
      sortable: true,
      render: (value) => {
        const technician = technicians.find((item) => item.id === value);
        return technician
          ? clients.find((client) => client.id === technician.clientId)?.companyName || "-"
          : "-";
      },
    },
    {
      key: "technicianId",
      label: "Technician",
      sortable: true,
      render: (value) => technicians.find((technician) => technician.id === value)?.name || "-",
    },
    {
      key: "method",
      label: "Method",
      sortable: true,
      render: (_value, row) => formatAssessmentMethods(row),
    },
    {
      key: "level",
      label: "Level",
      sortable: true,
      render: (_value, row) => formatAssessmentLevels(row),
    },
    {
      key: "assessmentDate",
      label: "Assessment Date",
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
    },
    { key: "assessor", label: "Assessor", sortable: true },
    {
      key: "result",
      label: "Result",
      sortable: true,
      render: (value) => <Badge variant={value === "Fail" ? "destructive" : "outline"}>{String(value)}</Badge>,
    },
    {
      key: "nextReviewDate",
      label: "Next Review",
      sortable: true,
      render: (value) => getDueBadge(value ? String(value) : null),
    },
  ];
}

export const portalServiceRequestColumns: Column<PortalServiceRequest>[] = [
  { key: "title", label: "Request", sortable: true, filterable: true },
  {
    key: "requestType",
    label: "Type",
    sortable: true,
    render: (_value, row) => row.serviceDefinitionTitle ?? row.requestType,
  },
  {
    key: "branchName",
    label: "Branch",
    sortable: true,
    render: (value) => String(value ?? "Client-wide"),
  },
  {
    key: "technicianName",
    label: "Technician",
    sortable: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "preferredDate",
    label: "Preferred Date",
    sortable: true,
    render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
  },
  {
    key: "metadata",
    label: "Confirmed",
    render: (value) => {
      const metadata = normalisePortalServiceRequestMetadata(value);
      return metadata.confirmedDate
        ? new Date(String(metadata.confirmedDate)).toLocaleDateString()
        : "-";
    },
  },
  {
    key: "linkedActivity",
    label: "Linked Activity",
    render: (_value, row) =>
      row.linkedActivity ? (
        <span className="text-sm">{row.linkedActivity.subject}</span>
      ) : (
        <span className="text-muted-foreground">Not linked</span>
      ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => getPortalServiceRequestStatusBadge(value as PortalServiceRequestStatus),
  },
  {
    key: "requestedByName",
    label: "Requested By",
    sortable: true,
    render: (_value, row) => row.requestedByName || row.requestedByEmail || "-",
  },
];

export const portalAssessmentBookingColumns: Column<PortalServiceRequest>[] = [
  { key: "title", label: "Booking Request", sortable: true, filterable: true },
  {
    key: "technicianName",
    label: "Technician",
    sortable: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "metadata",
    label: "Readiness",
    render: (_value, row) =>
      getAssessmentBookingReadinessBadge(getAssessmentBookingReadinessSnapshot(row)),
  },
  {
    key: "metadata",
    label: "Uploads",
    render: (_value, row) => {
      const readiness = getAssessmentBookingReadinessSnapshot(row);
      return readiness.requiredUploadCount > 0
        ? `${readiness.uploadedCount}/${readiness.requiredUploadCount}`
        : "-";
    },
  },
  {
    key: "metadata",
    label: "Guide Coverage",
    render: (_value, row) => {
      const readiness = getAssessmentBookingReadinessSnapshot(row);
      if (readiness.uncoveredTechniques.length > 0) {
        return `Missing ${readiness.uncoveredTechniques.length}`;
      }
      return readiness.matchedGuideTitles.length > 0
        ? `${readiness.matchedGuideTitles.length} guide${readiness.matchedGuideTitles.length === 1 ? "" : "s"}`
        : "-";
    },
  },
  {
    key: "preferredDate",
    label: "Preferred Date",
    sortable: true,
    render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => getPortalServiceRequestStatusBadge(value as PortalServiceRequestStatus),
  },
];

export const portalCommentColumns: Column<PortalComment>[] = [
  { key: "subject", label: "Request", sortable: true, filterable: true },
  {
    key: "requestType",
    label: "Type",
    sortable: true,
    render: (value) => getPortalCommentTypeLabel(value as PortalCommentRequestType),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value) => getPortalCommentStatusBadge(value as PortalCommentStatus),
  },
  {
    key: "createdByName",
    label: "Requested By",
    sortable: true,
    render: (_value, row) => row.createdByName || row.createdByEmail || "-",
  },
  {
    key: "createdAt",
    label: "Submitted",
    sortable: true,
    render: (value) => (value ? new Date(String(value)).toLocaleDateString() : "-"),
  },
];

export const equipmentColumns: Column<LevelIIIEquipment>[] = [
  { key: "name", label: "Equipment", sortable: true, filterable: true },
  { key: "serialNumber", label: "Serial Number", sortable: true },
  { key: "owner", label: "Owner", sortable: true },
  {
    key: "nextDueDate",
    label: "Calibration Status",
    sortable: true,
    render: (value) => getDueBadge(value ? String(value) : null),
  },
  {
    key: "sharedWithMainEquipment",
    label: "Shared",
    sortable: true,
    render: (value) => <Badge variant={value ? "secondary" : "outline"}>{value ? "Shared" : "Level III Only"}</Badge>,
  },
  { key: "status", label: "Status", sortable: true },
];

export const specimenColumns: Column<LevelIIISpecimen>[] = [
  { key: "specimenNumber", label: "Specimen Number", sortable: true, filterable: true },
  { key: "name", label: "Specimen", sortable: true, filterable: true },
  { key: "specimenType", label: "Type", sortable: true },
  {
    key: "masteringStatus",
    label: "Mastering",
    sortable: true,
    render: (value) => (
      <Badge variant={value === "Mastered" ? "default" : "secondary"}>
        {String(value)}
      </Badge>
    ),
  },
  {
    key: "sharedWithMainSpecimens",
    label: "Shared",
    sortable: true,
    render: (value) => <Badge variant={value ? "secondary" : "outline"}>{value ? "Shared" : "Level III Only"}</Badge>,
  },
  { key: "status", label: "Status", sortable: true },
];

export const portalRequestManagementFields: FormField[] = [
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "submitted", label: "Submitted" },
      { value: "in_review", label: "In Review" },
      { value: "planned", label: "Planned" },
      { value: "scheduled", label: "Scheduled" },
      { value: "completed", label: "Completed" },
      { value: "closed", label: "Closed" },
    ],
  },
  { name: "confirmedDate", label: "Confirmed Date", type: "date" },
  { name: "internalOwner", label: "Internal Owner", type: "text" },
  { name: "plannedAction", label: "Planned Action", type: "text" },
  {
    name: "clientVisibleUpdate",
    label: "Client Update",
    type: "textarea",
    helpText: "This is visible to the client in their portal request view.",
  },
  {
    name: "internalNotes",
    label: "Internal Notes",
    type: "textarea",
    helpText: "This stays on the internal Level III side for your team.",
  },
];

export const clientFields: FormField[] = [
  { name: "companyName", label: "Company Name", type: "text", required: true },
  { name: "primaryContact", label: "Primary Contact", type: "text", required: true },
  { name: "secondaryContact", label: "Secondary Contact", type: "text" },
  { name: "email", label: "Primary Email", type: "email", required: true },
  { name: "secondaryEmail", label: "Secondary Email", type: "email" },
  { name: "phone", label: "Phone", type: "text", required: true },
  { name: "secondaryPhone", label: "Secondary Phone", type: "text" },
  { name: "physicalAddress", label: "Physical Address", type: "textarea", required: true },
  {
    name: "visitCadence",
    label: "Visit / Contact Cadence",
    type: "select",
    required: true,
    options: [
      { value: "Weekly", label: "Weekly" },
      { value: "Monthly", label: "Monthly" },
      { value: "Six Monthly", label: "Six Monthly" },
    ],
  },
  { name: "lastVisit", label: "Last Visit", type: "date" },
  { name: "nextVisit", label: "Next Visit", type: "date" },
  { name: "procedureUpdatedAt", label: "Procedure Review / Update Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

export function createActivityFields(clientOptions: Array<{ value: string; label: string }>): FormField[] {
  return [
    {
      name: "clientId",
      label: "Client",
      type: "select",
      required: true,
      options: clientOptions,
      placeholder: "Select company",
    },
    {
      name: "activityType",
      label: "Activity Type",
      type: "select",
      required: true,
      options: [
        { value: "Visit", label: "Visit" },
        { value: "Call", label: "Call" },
        { value: "Email", label: "Email" },
        { value: "Assessment", label: "Assessment" },
        { value: "Procedure Review", label: "Procedure Review" },
        { value: "General", label: "General" },
      ],
    },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "activityDate", label: "Activity Date", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Planned", label: "Planned" },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
    { name: "nextActionDate", label: "Next Action Date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export const equipmentFields: FormField[] = [
  { name: "name", label: "Equipment Name", type: "text", required: true },
  { name: "serialNumber", label: "Serial Number", type: "text", required: true },
  { name: "owner", label: "Owner", type: "text", required: true, placeholder: "Level III Services / Shared Pool" },
  { name: "calibrationType", label: "Calibration Type", type: "text", placeholder: "Internal, External..." },
  { name: "lastServiceDate", label: "Calibration Date", type: "date" },
  { name: "nextDueDate", label: "Next Due Date", type: "date" },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: true,
    options: [
      { value: "Available", label: "Available" },
      { value: "In Service", label: "In Service" },
      { value: "Calibration Due", label: "Calibration Due" },
      { value: "Out of Service", label: "Out of Service" },
    ],
  },
  {
    name: "sharedWithMainEquipment",
    label: "Shared With Main Equipment",
    type: "select",
    required: true,
    options: [
      { value: "false", label: "Level III Only" },
      { value: "true", label: "Shared / Borrowed" },
    ],
  },
  { name: "notes", label: "Notes", type: "textarea" },
];

export function createSpecimenFields(specimenTypeOptions: Array<{ value: string; label: string }>): FormField[] {
  return [
    { name: "specimenNumber", label: "Specimen Number", type: "text", required: true },
    { name: "name", label: "Specimen Name", type: "text", required: true },
    {
      name: "specimenType",
      label: "Specimen Type",
      type: "select",
      required: true,
      options: specimenTypeOptions.length > 0 ? specimenTypeOptions : [{ value: "General", label: "General" }],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Available", label: "Available" },
        { value: "In Use", label: "In Use" },
        { value: "Shared", label: "Shared" },
        { value: "Retired", label: "Retired" },
      ],
    },
    {
      name: "sharedWithMainSpecimens",
      label: "Shared With Main Specimens",
      type: "select",
      required: true,
      options: [
        { value: "false", label: "Level III Only" },
        { value: "true", label: "Shared / Borrowed" },
      ],
    },
    {
      name: "masteringStatus",
      label: "Mastering Status",
      type: "select",
      required: true,
      options: [
        { value: "Pending", label: "Pending" },
        { value: "Mastered", label: "Mastered" },
        { value: "Re-master Required", label: "Re-master Required" },
      ],
    },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}
