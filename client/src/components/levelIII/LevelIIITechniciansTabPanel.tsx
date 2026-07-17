import { Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Plus, Upload } from "lucide-react";
const LevelIIITechnicianDirectoryWorkspace = lazy(() =>
  import("@/components/levelIII/LevelIIITechnicianDirectoryWorkspace").then((module) => ({
    default: module.LevelIIITechnicianDirectoryWorkspace,
  }))
);
const LevelIIITechnicianOperationsPanel = lazy(() =>
  import("@/components/levelIII/LevelIIITechnicianOperationsPanel").then((module) => ({
    default: module.LevelIIITechnicianOperationsPanel,
  }))
);

type LevelIIITechniciansTabPanelProps = {
  clients: any[];
  technicians: any[];
  filteredTechnicians: any[];
  filteredTechnicianCertificates: any[];
  setIsTechnicianImportOpen: (open: boolean) => void;
  downloadTechnicianImportTemplate: () => void;
  exportTechniciansCsv: () => void;
  exportTechnicianCertificatesCsv: () => void;
  openNewTechnicianCertificateForm: (technician?: any | null) => void;
  setIsTechnicianFormOpen: (open: boolean) => void;
  levelIIIRolloutReadinessSummary: any;
  technicianIntakeQueueSummary: any;
  setSelectedComplianceTechnicianId: (id: number) => void;
  setEditingTechnician: (technician: any) => void;
  recentHandledCrossTechnicianBulkQueueEntries: any[];
  filteredCrossTechnicianBulkQueueItems: any[];
  exportCrossTechnicianQueueCsv: () => void;
  setHandledTechnicianDocumentQueueEntries: (entries: any[]) => void;
  technicianQueueFilterOptions: any[];
  selectedTechnicianQueueFilter: string;
  setSelectedTechnicianQueueFilter: (value: any) => void;
  crossTechnicianQueueSessionScopeLabel: string;
  selectedCrossTechnicianQueueSignatures: string[];
  crossTechnicianQueueSessionCompletedCount: number;
  selectedCrossTechnicianQueueItems: any[];
  hiddenCrossTechnicianQueueSelectionCount: number;
  crossTechnicianQueueSessionUpdatedAt: string | Date | null;
  crossTechnicianQueueLastStartedItem: any;
  autoHandleCrossTechnicianQueueSessionItems: boolean;
  setAutoHandleCrossTechnicianQueueSessionItems: (value: boolean) => void;
  allVisibleCrossTechnicianQueueSelected: boolean;
  clearVisibleCrossTechnicianQueueItems: () => void;
  selectVisibleCrossTechnicianQueueItems: () => void;
  visibleCrossTechnicianQueueSignatures: string[];
  addVisibleCrossTechnicianQueueItemsToSession: () => void;
  replaceCrossTechnicianQueueSessionWithVisible: () => void;
  restoreLastStartedCrossTechnicianQueueItem: () => void;
  clearCrossTechnicianQueueSession: () => void;
  runNextSelectedCrossTechnicianQueueAction: (action: "record" | "upload") => void;
  markSelectedCrossTechnicianQueueItemsHandled: (items: any[]) => void;
  exportSelectedCrossTechnicianQueueCsv: (items: any[], fileName?: string) => void;
  crossTechnicianQueueSessionCompletionPercent: number;
  crossTechnicianQueueSessionPeakCount: number;
  crossTechnicianQueueSessionVisibleSummary: {
    missingEvidence: number;
    pendingReview: number;
    expired: number;
    currentWithoutEvidence: number;
  };
  crossTechnicianQueueSessionFocusOptions: any[];
  nextCrossTechnicianQueueSessionItem: any;
  startCrossTechnicianQueueSessionItem: (item: any, action: any) => void;
  openTechnicianComplianceWorkspace: (id: number) => void;
  nextCrossTechnicianQueueSessionTechnician: any;
  openNextTechnicianComplianceQueueItem: (technicianId: number, action: "record" | "upload") => void;
  nextCrossTechnicianQueueSessionClient: any;
  openNextClientComplianceQueueItem: (clientId: number, action: "record" | "upload") => void;
  openClientComplianceBacklog: (clientId: number) => void;
  clientComplianceBacklogSummary: any[];
  exportClientComplianceBacklogCsv: () => void;
  technicianComplianceBacklogSummary: any[];
  exportTechnicianComplianceBacklogCsv: () => void;
  crossTechnicianQueueSearch: string;
  setCrossTechnicianQueueSearch: (value: string) => void;
  showSavedSessionQueueOnly: boolean;
  setShowSavedSessionQueueOnly: (value: boolean) => void;
  searchedCrossTechnicianBulkQueueItems: any[];
  crossTechnicianQueuePage: number;
  crossTechnicianQueueTotalPages: number;
  pagedCrossTechnicianBulkQueueItems: any[];
  buildTechnicianDocumentQueueItemSignature: (item: any) => string;
  toggleCrossTechnicianQueueItemSelection: (item: any) => void;
  getRequirementStatusBadge: (status: any) => React.ReactNode;
  markTechnicianDocumentQueueItemHandled: (item: any) => void;
  crossTechnicianQueuePageSize: number;
  setCrossTechnicianQueuePage: (page: number) => void;
  restoreHandledTechnicianDocumentQueueEntry: (entry: any) => void;
  levelIIIDocumentGenerationSummary: any;
  openDocumentsPage: () => void;
  levelIIIDocumentGenerationFilterOptions: any[];
  selectedDocumentGenerationFilter: string;
  setSelectedDocumentGenerationFilter: (value: any) => void;
  filteredLevelIIIDocumentGenerationItems: any[];
  levelIIICertificateReleaseQueueItems: any[];
  levelIIICertificateReleaseQueueSummary: any;
  primaryFilteredDocumentGenerationItem: any;
  batchDocumentGenerationActionLabel: string | null;
  batchDocumentGenerationCandidates: any[];
  documentGenerationBatchAction: any;
  runDocumentGenerationBatchAction: () => void;
  runCertificateReleaseBatchAction: () => Promise<void>;
  openCertificateSignOffDialog: (certificate: any, action: any) => void;
  createControlledLevelIIICertificateDocument: (record: any) => Promise<void>;
  submitControlledLevelIIICertificateDocumentForReview: (document: any) => Promise<void>;
  selectedTechnicianDocumentGenerationItem: any;
  setSelectedCertificateHistory: (record: any) => void;
  markDocumentGenerationItemHandled: (item: any) => void;
  recentHandledDocumentGenerationEntries: any[];
  clearHandledDocumentGenerationHistory: () => void;
  restoreHandledDocumentGenerationEntry: (entry: any) => void;
  getCertificateApprovalBadge: (status: any) => React.ReactNode;
  getCertificateStatusBadge: (status: any) => React.ReactNode;
  handlePreviewLevelIIICertificate: (certificate: any) => void;
  openControlledLevelIIICertificateDecision: (document: any, action: any) => void;
  exportEditableCertificateHtml: (certificate: any) => Promise<void>;
  exportCertificatePdf: (certificate: any) => Promise<void>;
  openCertificateStorageLinker: (item: any) => void;
  openLevelIIIDocumentRecordPreview: (documentId: number) => void;
  openLevelIIIDocumentRecord: (documentId: number) => void;
  technicianSearch: string;
  setTechnicianSearch: (value: string) => void;
  selectedClientFilter: string;
  handleTechnicianClientFilterChange: (value: string) => void;
  activeLevelIIIDocumentSetupClient: any;
  activeLevelIIIDocumentSetupClientId: number | null;
  setEditingTechnicianRequirementDefinition: (value: any) => void;
  setIsTechnicianRequirementDefinitionFormOpen: (open: boolean) => void;
  selectedComplianceTechnician: any;
  levelIIIDocumentTypeSummary: any;
  levelIIIRequirementDefinitions: any[];
  technicianRequirementDefinitionColumns: any[];
  getQualificationTypeLabel: (technician: any) => string;
  formatMethods: (methods: string[]) => string;
  getTechnicianMethods: (technician: any) => string[];
  technicianComplianceSectionRef: React.RefObject<HTMLDivElement | null>;
  visibleTechnicianClients: any[];
  technicianDirectorySummary: any;
  technicianDirectoryView: "grouped" | "table";
  setTechnicianDirectoryView: (value: "grouped" | "table") => void;
  latestTechnicianCertificateByTechnicianId: Map<number, any>;
  formatCertificateValidityRule: (certificate: any) => string;
  getDueBadge: (date: any) => React.ReactNode;
  getQualificationReviewDate: (technician: any) => any;
  getQualificationReviewLabel: (technician: any) => string;
  formatTechnicianLevels: (technician: any) => string;
  summariseTechnicianLevels: (items: any[]) => string;
  getTechnicianMethodQualifications: (technician: any) => any[];
  techniciansLoading: boolean;
  technicianColumns: any[];
  deleteTechnician: (row: any) => Promise<void>;
  lastCertificateWorkflowNotice: any;
  setSelectedCertificateQueueFilter: (value: any) => void;
  selectedCertificateQueueFilter: any;
  certificateQueueSummary: any;
  certificateLifecycleSummary: any;
  getLevelIIITechnicianName: (id: number) => string;
  formatExportDate: (value: any) => string;
  technicianCertificateColumns: any[];
  technicianCertificatesLoading: boolean;
  openCertificateEditor: (certificate: any) => void;
  deleteCertificate: (certificate: any) => Promise<void>;
  clearHandledTechnicianDocumentQueueHistory: () => void;
  complianceMatrixLoading: boolean;
  filteredSelectedTechnicianBulkQueueItems: any[];
  formatLevelIIICategoryLabel: (value: any) => string;
  nextCertificateLinkedRequirement: any;
  nextExpiredRequirement: any;
  nextMissingEvidenceRequirement: any;
  nextPendingReviewRequirement: any;
  openEvidenceReview: (value: any) => void;
  openTechnicianComplianceRecord: (value: any) => void;
  openTechnicianDirectUploadDialog: () => void;
  openTechnicianRequirementUploadFromRow: (value: any) => void;
  recentHandledSelectedTechnicianBulkQueueEntries: any[];
  availableTechnicianDirectUploadRules: any[];
  selectedTechnicianDocumentControlSummary: any;
  selectedTechnicianDocumentPackGuide: any[];
  selectedTechnicianPendingReviewRows: any[];
  selectedTechnicianRequirementSummary: any;
  selectedTechnicianRequirementTableRows: any[];
  setEditingTechnicianRequirement: (value: any) => void;
  setIsTechnicianRequirementFormOpen: (open: boolean) => void;
  technicianRequirementColumns: any[];
  toast: { success: (message: string) => void };
};

export function LevelIIITechniciansTabPanel(props: LevelIIITechniciansTabPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Technicians</CardTitle>
          <CardDescription>
            Link technicians to a specific client and track method, level, eye tests, and renewals.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => props.setIsTechnicianImportOpen(true)}
            disabled={props.clients.length === 0}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={props.downloadTechnicianImportTemplate}
            disabled={props.clients.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Import Template
          </Button>
          <Button
            variant="outline"
            onClick={props.exportTechniciansCsv}
            disabled={props.filteredTechnicians.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={props.exportTechnicianCertificatesCsv}
            disabled={props.filteredTechnicianCertificates.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Certificates
          </Button>
          <Button
            variant="outline"
            onClick={() => props.openNewTechnicianCertificateForm()}
            disabled={props.technicians.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Issue Certificate
          </Button>
          <Button
            onClick={() => props.setIsTechnicianFormOpen(true)}
            disabled={props.clients.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Technician
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={null}>
          <LevelIIITechnicianOperationsPanel props={props} />
        </Suspense>

        <Suspense fallback={null}>
          <LevelIIITechnicianDirectoryWorkspace props={props} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
