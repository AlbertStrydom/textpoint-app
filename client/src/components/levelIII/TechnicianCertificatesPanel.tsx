import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { Download, Edit2, Trash2, TriangleAlert } from "lucide-react";

type CertificateQueueFilter =
  | "all"
  | "approved"
  | "in_review"
  | "draft"
  | "active"
  | "superseded"
  | "expiring_soon";

type CertificateRecord = {
  id: number;
  technicianId: number;
  certificateNumber: string;
  approvalStatus: string;
  status: string;
  validUntil: string | Date | null;
  updatedAt: string | Date;
};

type WorkflowNotice = {
  kind: "blocked" | "info";
  title: string;
  description: string;
} | null;

type LifecycleSummary = {
  issuedRecent: CertificateRecord[];
  approvedRecent: CertificateRecord[];
  autoSupersededRecent: CertificateRecord[];
  expiringSoon: CertificateRecord[];
};

type QueueSummary = {
  approved: number;
  inReview: number;
  active: number;
  superseded: number;
  expiringSoon: number;
};

type TechnicianCertificatesPanelProps = {
  filteredTechnicianCertificates: CertificateRecord[];
  lastCertificateWorkflowNotice: WorkflowNotice;
  setSelectedCertificateQueueFilter: (value: CertificateQueueFilter) => void;
  selectedCertificateQueueFilter: CertificateQueueFilter;
  certificateQueueSummary: QueueSummary;
  certificateLifecycleSummary: LifecycleSummary;
  setSelectedCertificateHistory: (certificate: CertificateRecord) => void;
  getLevelIIITechnicianName: (technicianId: number) => string;
  formatExportDate: (value: string | Date | null | undefined) => string;
  technicianCertificateColumns: Column<CertificateRecord>[];
  technicianCertificatesLoading: boolean;
  openCertificateEditor: (certificate: CertificateRecord) => void;
  handlePreviewLevelIIICertificate: (certificate: CertificateRecord) => void;
  exportCertificateHtml: (certificate: CertificateRecord) => Promise<void> | void;
  exportCertificatePdf: (certificate: CertificateRecord) => Promise<void> | void;
  openCertificateSignOffDialog: (
    certificate: CertificateRecord,
    action: "submit" | "approve" | "reject" | "reopen"
  ) => void;
  deleteCertificate: (certificate: CertificateRecord) => Promise<void> | void;
};

export function TechnicianCertificatesPanel(props: TechnicianCertificatesPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Technician Certificates</CardTitle>
          <CardDescription>
            Issue unique certificate numbers, control validity periods, and keep a file link against each technician certificate.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{props.filteredTechnicianCertificates.length} record(s)</span>
          <span>
            {props.filteredTechnicianCertificates.filter((certificate) => certificate.status === "Active").length} active
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 space-y-4">
          {props.lastCertificateWorkflowNotice ? (
            <Alert variant={props.lastCertificateWorkflowNotice.kind === "blocked" ? "destructive" : "default"}>
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>{props.lastCertificateWorkflowNotice.title}</AlertTitle>
              <AlertDescription>{props.lastCertificateWorkflowNotice.description}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-3 md:grid-cols-5">
            <MetricButton
              title="Approved"
              value={props.certificateQueueSummary.approved}
              onClick={() => props.setSelectedCertificateQueueFilter("approved")}
            />
            <MetricButton
              title="In Review"
              value={props.certificateQueueSummary.inReview}
              onClick={() => props.setSelectedCertificateQueueFilter("in_review")}
            />
            <MetricButton
              title="Active"
              value={props.certificateQueueSummary.active}
              onClick={() => props.setSelectedCertificateQueueFilter("active")}
            />
            <MetricButton
              title="Superseded"
              value={props.certificateQueueSummary.superseded}
              onClick={() => props.setSelectedCertificateQueueFilter("superseded")}
            />
            <MetricButton
              title="Expiring Soon"
              value={props.certificateQueueSummary.expiringSoon}
              onClick={() => props.setSelectedCertificateQueueFilter("expiring_soon")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["approved", "Approved"],
              ["in_review", "In Review"],
              ["draft", "Draft / Rejected"],
              ["active", "Active"],
              ["superseded", "Superseded"],
              ["expiring_soon", "Expiring Soon"],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                variant={props.selectedCertificateQueueFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => props.setSelectedCertificateQueueFilter(value as CertificateQueueFilter)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Lifecycle Dashboard</CardTitle>
                <CardDescription>
                  Review recent issuance, approval, supersede, and expiry activity without opening each record.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric title="Issued Recent" value={props.certificateLifecycleSummary.issuedRecent.length} />
                  <Metric title="Approved Ready" value={props.certificateLifecycleSummary.approvedRecent.length} />
                  <Metric
                    title="Auto-Superseded"
                    value={props.certificateLifecycleSummary.autoSupersededRecent.length}
                  />
                  <Metric title="Expiring Soon" value={props.certificateLifecycleSummary.expiringSoon.length} />
                </div>
                {props.lastCertificateWorkflowNotice ? (
                  <Alert variant={props.lastCertificateWorkflowNotice.kind === "blocked" ? "destructive" : "default"}>
                    <TriangleAlert className="h-4 w-4" />
                    <AlertTitle>{props.lastCertificateWorkflowNotice.title}</AlertTitle>
                    <AlertDescription>{props.lastCertificateWorkflowNotice.description}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No recent blocked or auto-supersede workflow notices in this session.
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Watchlists</CardTitle>
                <CardDescription>
                  Focus the next rollout checks on the certificates that most need operator review.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <WatchlistSection
                  title="Recently Issued"
                  empty="No recently issued certificates."
                  items={props.certificateLifecycleSummary.issuedRecent}
                  renderDescription={(certificate) =>
                    `${props.getLevelIIITechnicianName(certificate.technicianId)} | ${new Date(certificate.updatedAt).toLocaleDateString()}`
                  }
                  onOpen={props.setSelectedCertificateHistory}
                />
                <WatchlistSection
                  title="Expiring Soon"
                  empty="No active certificates are expiring soon."
                  items={props.certificateLifecycleSummary.expiringSoon}
                  renderDescription={(certificate) =>
                    `${props.getLevelIIITechnicianName(certificate.technicianId)} | valid until ${props.formatExportDate(certificate.validUntil)}`
                  }
                  onOpen={props.setSelectedCertificateHistory}
                />
                <WatchlistSection
                  title="Approved"
                  empty="No approved certificates in the current set."
                  items={props.certificateLifecycleSummary.approvedRecent}
                  renderDescription={(certificate) =>
                    `${props.getLevelIIITechnicianName(certificate.technicianId)} | approved`
                  }
                  onOpen={props.setSelectedCertificateHistory}
                />
                <WatchlistSection
                  title="Auto-Superseded"
                  empty="No recent auto-superseded certificates."
                  items={props.certificateLifecycleSummary.autoSupersededRecent}
                  renderDescription={(certificate) =>
                    `${props.getLevelIIITechnicianName(certificate.technicianId)} | superseded`
                  }
                  onOpen={props.setSelectedCertificateHistory}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        <DataTable
          columns={props.technicianCertificateColumns}
          data={props.filteredTechnicianCertificates}
          isLoading={props.technicianCertificatesLoading}
          onRowClick={(row) => props.openCertificateEditor(row)}
          searchPlaceholder="Search certificate number, technician, method, or status..."
          actions={(row) => (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  props.handlePreviewLevelIIICertificate(row);
                }}
              >
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={row.approvalStatus !== "approved"}
                onClick={async (event) => {
                  event.stopPropagation();
                  await props.exportCertificateHtml(row);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={row.approvalStatus !== "approved"}
                onClick={async (event) => {
                  event.stopPropagation();
                  await props.exportCertificatePdf(row);
                }}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  props.setSelectedCertificateHistory(row);
                }}
              >
                History
              </Button>
              {row.approvalStatus === "draft" || row.approvalStatus === "rejected" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.openCertificateSignOffDialog(row, "submit");
                  }}
                >
                  Open Sign-Off
                </Button>
              ) : null}
              {row.approvalStatus === "in_review" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.openCertificateSignOffDialog(row, "approve");
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.openCertificateSignOffDialog(row, "reject");
                    }}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {row.approvalStatus === "approved" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    props.openCertificateSignOffDialog(row, "reopen");
                  }}
                >
                  Reopen
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  props.openCertificateEditor(row);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async (event) => {
                  event.stopPropagation();
                  await props.deleteCertificate(row);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MetricButton({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border bg-muted/20 p-3 text-left">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </button>
  );
}

function WatchlistSection({
  title,
  empty,
  items,
  renderDescription,
  onOpen,
}: {
  title: string;
  empty: string;
  items: CertificateRecord[];
  renderDescription: (certificate: CertificateRecord) => string;
  onOpen: (certificate: CertificateRecord) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">{empty}</div>
      ) : (
        items.map((certificate) => (
          <button
            key={`${title}-${certificate.id}`}
            type="button"
            className="w-full rounded-lg border p-3 text-left hover:bg-muted/20"
            onClick={() => onOpen(certificate)}
          >
            <p className="font-medium">{certificate.certificateNumber}</p>
            <p className="text-sm text-muted-foreground">{renderDescription(certificate)}</p>
          </button>
        ))
      )}
    </div>
  );
}
