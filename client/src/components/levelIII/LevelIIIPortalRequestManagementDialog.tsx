import type { ReactNode } from "react";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download } from "lucide-react";

type LevelIIIPortalRequestManagementDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  managingPortalRequest: any;
  setManagingPortalRequest: (value: any) => void;
  portalRequestManagementFields: FormField[];
  getDateInputValue: (value: string | Date | null | undefined) => string;
  normalisePortalServiceRequestMetadata: (value: unknown) => any;
  isLoading: boolean;
  updatePortalServiceRequestStatusPending: boolean;
  createActivityPending: boolean;
  generatePortalRequestPackPending: boolean;
  selectedPortalClientNumber: number;
  selectedPortalBranchNumber: number | null;
  convertPortalServiceRequestToActivity: (request: any) => Promise<void>;
  closePortalRequestManagement: () => void;
  handleGenerateDraftPack: (request: any) => Promise<void>;
  managingPortalRequestAutomationRules: any[];
  getAssessmentBookingReadinessSnapshot: (request: any) => any;
  getAssessmentBookingReadinessBadge: (readiness: any) => ReactNode;
  getAssessmentBookingBlockingSummary: (readiness: any) => string;
  openEvidenceReview: (review: any) => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
};

export function LevelIIIPortalRequestManagementDialog(
  props: LevelIIIPortalRequestManagementDialogProps
) {
  return (
    <FormDialog
      key={`leveliii-portal-request-${props.managingPortalRequest?.id ?? "none"}`}
      open={props.open}
      onOpenChange={(open) => {
        props.setOpen(open);
        if (!open) {
          props.setManagingPortalRequest(null);
        }
      }}
      title={
        props.managingPortalRequest
          ? `Manage Request: ${props.managingPortalRequest.title}`
          : "Manage Portal Request"
      }
      description="Capture the internal action plan, confirm dates, and save a client-facing progress update for this Level III portal request."
      fields={props.portalRequestManagementFields}
      initialValues={
        props.managingPortalRequest
          ? {
              status: props.managingPortalRequest.status,
              confirmedDate: props.getDateInputValue(
                props.normalisePortalServiceRequestMetadata(
                  props.managingPortalRequest.metadata
                ).confirmedDate
              ),
              internalOwner:
                props.normalisePortalServiceRequestMetadata(
                  props.managingPortalRequest.metadata
                ).internalOwner ?? "",
              plannedAction:
                props.normalisePortalServiceRequestMetadata(
                  props.managingPortalRequest.metadata
                ).plannedAction ?? "",
              clientVisibleUpdate:
                props.normalisePortalServiceRequestMetadata(
                  props.managingPortalRequest.metadata
                ).clientVisibleUpdate ?? "",
              internalNotes: props.managingPortalRequest.internalNotes ?? "",
            }
          : {
              status: "submitted",
              confirmedDate: "",
              internalOwner: "",
              plannedAction: "",
              clientVisibleUpdate: "",
              internalNotes: "",
            }
      }
      isLoading={props.isLoading}
      submitLabel="Save Request Plan"
      renderExtraContent={() =>
        props.managingPortalRequest ? (
          <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
            <div className="rounded-md border bg-background p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium">Linked Level III Activity</p>
                  <p className="text-sm text-muted-foreground">
                    Keep this request connected to the internal Level III follow-up
                    activity.
                  </p>
                </div>
                {props.managingPortalRequest.linkedActivity ? (
                  <Badge>{props.managingPortalRequest.linkedActivity.status}</Badge>
                ) : (
                  <Badge variant="outline">Not linked yet</Badge>
                )}
              </div>

              {props.managingPortalRequest.linkedActivity ? (
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Subject
                    </p>
                    <p className="mt-1 font-medium">
                      {props.managingPortalRequest.linkedActivity.subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Type
                    </p>
                    <p className="mt-1 font-medium">
                      {props.managingPortalRequest.linkedActivity.activityType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Action Date
                    </p>
                    <p className="mt-1 font-medium">
                      {new Date(
                        String(
                          props.managingPortalRequest.linkedActivity.nextActionDate ??
                            props.managingPortalRequest.linkedActivity.activityDate
                        )
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      props.generatePortalRequestPackPending ||
                      props.createActivityPending ||
                      props.updatePortalServiceRequestStatusPending ||
                      !props.managingPortalRequest.technicianId
                    }
                    onClick={() =>
                      void props.handleGenerateDraftPack(props.managingPortalRequest)
                    }
                  >
                    Generate Draft Pack
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      props.generatePortalRequestPackPending ||
                      props.createActivityPending ||
                      props.updatePortalServiceRequestStatusPending
                    }
                    onClick={async () => {
                      try {
                        await props.convertPortalServiceRequestToActivity(
                          props.managingPortalRequest
                        );
                        props.closePortalRequestManagement();
                      } catch {
                        // page-level handler already raises the user-facing toast
                      }
                    }}
                  >
                    Create Linked Activity
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Type
                </p>
                <p className="mt-1 font-medium">
                  {props.managingPortalRequest.serviceDefinitionTitle ??
                    props.managingPortalRequest.requestType}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Branch
                </p>
                <p className="mt-1 font-medium">
                  {props.managingPortalRequest.branchName ?? "Client-wide"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Requested By
                </p>
                <p className="mt-1 font-medium">
                  {props.managingPortalRequest.requestedByName ??
                    props.managingPortalRequest.requestedByEmail ??
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Preferred Date
                </p>
                <p className="mt-1 font-medium">
                  {props.managingPortalRequest.preferredDate
                    ? new Date(
                        String(props.managingPortalRequest.preferredDate)
                      ).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            </div>

            {props.managingPortalRequest.details ? (
              <div className="rounded-md border bg-background p-3">
                <p className="text-sm font-medium">Client Request Details</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {props.managingPortalRequest.details}
                </p>
              </div>
            ) : null}

            {props.managingPortalRequest.techniques.length > 0 ? (
              <div className="rounded-md border bg-background p-3">
                <p className="text-sm font-medium">Techniques</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {props.managingPortalRequest.techniques.map((technique: string) => (
                    <Badge key={technique} variant="outline">
                      {technique}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {(() => {
              const readiness = props.getAssessmentBookingReadinessSnapshot(
                props.managingPortalRequest
              );
              if (
                readiness.selectedTechniques.length === 0 &&
                readiness.bringItems.length === 0 &&
                readiness.companyItems.length === 0 &&
                readiness.matchedGuideTitles.length === 0 &&
                readiness.uncoveredTechniques.length === 0 &&
                !readiness.plannerNotes
              ) {
                return null;
              }

              return (
                <div className="rounded-md border bg-background p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Assessment Readiness Plan
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Booking scope, matched guidance, and preparation items
                        captured from the client portal planner.
                      </p>
                    </div>
                    {props.getAssessmentBookingReadinessBadge(readiness)}
                  </div>

                  <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Techniques
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {readiness.selectedTechniques.length > 0 ? (
                          readiness.selectedTechniques.map((technique: string) => (
                            <Badge
                              key={`request-technique-${technique}`}
                              variant="outline"
                            >
                              {technique}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Uploads
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {readiness.requiredUploadCount > 0
                          ? `${readiness.uploadedCount}/${readiness.requiredUploadCount} received`
                          : "No upload checklist"}
                      </p>
                      {readiness.outstandingUploadLabels.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Outstanding:{" "}
                          {readiness.outstandingUploadLabels.join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Matched guides
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {readiness.matchedGuideTitles.length} guide
                        {readiness.matchedGuideTitles.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Guide gaps
                      </p>
                      <p className="mt-2 text-sm font-medium">
                        {readiness.uncoveredTechniques.length > 0
                          ? readiness.uncoveredTechniques.join(", ")
                          : "None"}
                      </p>
                    </div>
                  </div>

                  {readiness.state !== "ready" ? (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      This request is not ready to move to{" "}
                      <span className="font-medium">Scheduled</span> yet.{" "}
                      {props.getAssessmentBookingBlockingSummary(readiness)}.
                    </div>
                  ) : (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      This request has the guidance and client pack needed to move
                      to
                      <span className="font-medium"> Scheduled</span>.
                    </div>
                  )}

                  {readiness.plannerNotes ? (
                    <div className="mt-3 rounded-md border p-3">
                      <p className="text-sm font-medium">Planner Notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                        {readiness.plannerNotes}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium">Technician must bring</p>
                      <div className="mt-2 space-y-2">
                        {readiness.bringItems.length > 0 ? (
                          readiness.bringItems.map((item: string) => (
                            <div
                              key={`readiness-bring-${item}`}
                              className="rounded-md border px-3 py-2 text-sm"
                            >
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
                            No technician-side checklist items were captured for
                            this booking.
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Company must send / upload
                      </p>
                      <div className="mt-2 space-y-2">
                        {readiness.companyItems.length > 0 ? (
                          readiness.companyItems.map((item: string) => (
                            <div
                              key={`readiness-company-${item}`}
                              className="rounded-md border px-3 py-2 text-sm"
                            >
                              {item}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
                            No company-side checklist items were captured for this
                            booking.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {readiness.matchedGuideTitles.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm font-medium">
                        Matched Preparation Guides
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {readiness.matchedGuideTitles.map((title: string) => (
                          <Badge key={`matched-guide-${title}`} variant="secondary">
                            {title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {(() => {
              const uploadedDocuments =
                props.managingPortalRequest.supportingDocuments.filter(
                  (document: any) => Boolean(document.fileUrl)
                );
              const matchedRuleRows =
                props.managingPortalRequestAutomationRules.map((rule) => {
                  const supportingDocument =
                    props.managingPortalRequest.supportingDocuments.find(
                      (document: any) =>
                        document.label.trim().toLowerCase() ===
                        rule.label.trim().toLowerCase()
                    ) ?? null;
                  return { rule, supportingDocument };
                });
              const matchedUploadCount = matchedRuleRows.filter((entry) =>
                Boolean(entry.supportingDocument?.fileUrl)
              ).length;
              const routedComplianceRows = matchedRuleRows.filter((entry) =>
                Boolean(entry.supportingDocument?.linkedRequirementDefinitionName)
              );
              const unresolvedChecklistLabels =
                props.managingPortalRequest.requestedDocuments.filter(
                  (label: string) => {
                    const supportingDocument =
                      props.managingPortalRequest.supportingDocuments.find(
                        (document: any) =>
                          document.label.trim().toLowerCase() ===
                          label.trim().toLowerCase()
                      );
                    return !supportingDocument?.fileUrl;
                  }
                );

              return (
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Request Processing Guide</CardTitle>
                      <CardDescription>
                        Work the request pack from upload intake through storage
                        routing and technician compliance linkage.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">
                            Uploads Received
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {uploadedDocuments.length}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">
                            Rule Matches
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {matchedUploadCount}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">
                            Routed To Compliance
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {routedComplianceRows.length}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3">
                          <p className="text-xs uppercase text-muted-foreground">
                            Checklist Outstanding
                          </p>
                          <p className="mt-1 text-2xl font-semibold">
                            {unresolvedChecklistLabels.length}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-xs uppercase text-muted-foreground">
                          Processing Sequence
                        </p>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                          <p>
                            1. Confirm which client files have already been
                            uploaded.
                          </p>
                          <p>
                            2. Verify that each upload matched a document rule and
                            storage target.
                          </p>
                          <p>
                            3. Check that routed uploads landed against the right
                            technician compliance row.
                          </p>
                          <p>
                            4. Resolve missing or unmatched items before generating
                            the draft pack or scheduling.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Routing Watchlists</CardTitle>
                      <CardDescription>
                        Open the remaining request-pack items that still need
                        upload, routing, or compliance follow-through.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">
                          Checklist Outstanding
                        </p>
                        {unresolvedChecklistLabels.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            All configured checklist items have uploaded files.
                          </div>
                        ) : (
                          unresolvedChecklistLabels
                            .slice(0, 5)
                            .map((label: string) => (
                              <div
                                key={`outstanding-${label}`}
                                className="rounded-lg border p-3"
                              >
                                <p className="font-medium">{label}</p>
                                <p className="text-sm text-muted-foreground">
                                  No uploaded file is stored yet for this request
                                  item.
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">
                          Uploaded But Unrouted
                        </p>
                        {uploadedDocuments.filter(
                          (document: any) => !document.linkedRequirementDefinitionName
                        ).length === 0 ? (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            Every uploaded file is already linked to a compliance
                            target or intentionally standalone.
                          </div>
                        ) : (
                          uploadedDocuments
                            .filter(
                              (document: any) =>
                                !document.linkedRequirementDefinitionName
                            )
                            .slice(0, 5)
                            .map((document: any) => (
                              <button
                                key={`unrouted-${document.label}-${document.fileName}`}
                                type="button"
                                className="w-full rounded-lg border p-3 text-left hover:bg-muted/20"
                                onClick={() =>
                                  props.openEvidenceReview({
                                    source: "request_pack",
                                    title: document.fileName || document.label,
                                    description: `${document.label} | ${props.managingPortalRequest.title}`,
                                    fileName: document.fileName,
                                    fileUrl: document.fileUrl ?? "",
                                    contentType: document.contentType ?? null,
                                    storagePath: document.storagePath ?? null,
                                    portalRequest: props.managingPortalRequest,
                                    badges: [
                                      {
                                        key: "request",
                                        label: "Client upload",
                                        variant: "secondary",
                                      },
                                    ],
                                  })
                                }
                              >
                                <p className="font-medium">{document.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded but not yet linked to a compliance
                                  record.
                                </p>
                              </button>
                            ))
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">
                          Automation Targets
                        </p>
                        {matchedRuleRows.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            No automation rules matched this request type yet.
                          </div>
                        ) : (
                          matchedRuleRows
                            .slice(0, 5)
                            .map(({ rule, supportingDocument }: any) => (
                              <div
                                key={`rule-target-${rule.label}`}
                                className="rounded-lg border p-3"
                              >
                                <p className="font-medium">{rule.displayLabel}</p>
                                <p className="text-sm text-muted-foreground">
                                  {rule.storagePath}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {supportingDocument?.fileUrl
                                    ? `Uploaded as ${supportingDocument.fileName ?? "stored file"}`
                                    : "Waiting for upload"}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">
                          Compliance Routing
                        </p>
                        {routedComplianceRows.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                            No uploaded files have routed to technician
                            compliance yet.
                          </div>
                        ) : (
                          routedComplianceRows
                            .slice(0, 5)
                            .map(({ rule, supportingDocument }: any) => (
                              <div
                                key={`routed-${rule.label}`}
                                className="rounded-lg border p-3"
                              >
                                <p className="font-medium">
                                  {supportingDocument?.linkedRequirementDefinitionName ||
                                    rule.displayLabel}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {supportingDocument?.fileName ||
                                    rule.suggestedFileName}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {props.managingPortalRequestAutomationRules.length > 0 ? (
              <div className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Automated Upload Rules</p>
                    <p className="text-sm text-muted-foreground">
                      Standard document names and storage paths for this assessment
                      request.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {
                      props.managingPortalRequestAutomationRules.filter((rule) =>
                        props.managingPortalRequest.supportingDocuments.some(
                          (document: any) =>
                            Boolean(document.fileUrl) &&
                            document.label.trim().toLowerCase() ===
                              rule.label.trim().toLowerCase()
                        )
                      ).length
                    }
                    /{props.managingPortalRequestAutomationRules.length} matched
                  </Badge>
                </div>

                <div className="mt-3 space-y-3">
                  {props.managingPortalRequestAutomationRules.map((rule) => {
                    const matchingUpload =
                      props.managingPortalRequest.supportingDocuments.find(
                        (document: any) =>
                          document.label.trim().toLowerCase() ===
                          rule.label.trim().toLowerCase()
                      ) ?? null;
                    return (
                      <div
                        key={`automation-rule-${rule.label}`}
                        className="rounded-md border p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{rule.displayLabel}</p>
                              <Badge variant="secondary">{rule.label}</Badge>
                              <Badge variant="outline">
                                {rule.category === "method"
                                  ? "Method document"
                                  : "Core document"}
                              </Badge>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Save as:{" "}
                              <span className="font-medium text-foreground">
                                {rule.suggestedFileName}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Folder:{" "}
                              <span className="font-medium text-foreground">
                                {rule.storagePath}
                              </span>
                            </p>
                            {matchingUpload?.fileName ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Uploaded file: {matchingUpload.fileName}
                              </p>
                            ) : null}
                            {matchingUpload?.linkedRequirementDefinitionName ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Routed to compliance:{" "}
                                <span className="font-medium text-foreground">
                                  {matchingUpload.linkedRequirementDefinitionName}
                                </span>
                              </p>
                            ) : null}
                          </div>
                          {matchingUpload?.fileUrl ? (
                            <Badge className="bg-emerald-100 text-emerald-900">
                              Received
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending upload</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Supporting Request Pack</p>
                  <p className="text-sm text-muted-foreground">
                    Files and notes the client attached when submitting this
                    request.
                  </p>
                </div>
                <Badge variant="outline">
                  {
                    props.managingPortalRequest.supportingDocuments.filter(
                      (document: any) => Boolean(document.fileUrl)
                    ).length
                  }
                  /
                  {props.managingPortalRequest.requestedDocuments.length ||
                    props.managingPortalRequest.supportingDocuments.length}{" "}
                  uploaded
                </Badge>
              </div>

              {props.managingPortalRequest.requestedDocuments.length === 0 ? (
                <div className="mt-3 rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  No request checklist was configured for this service type.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {props.managingPortalRequest.requestedDocuments.map(
                    (label: string) => {
                      const supportingDocument =
                        props.managingPortalRequest.supportingDocuments.find(
                          (document: any) =>
                            document.label.toLowerCase() === label.toLowerCase()
                        ) ?? null;
                      return (
                        <div key={label} className="rounded-md border p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-medium">{label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {supportingDocument?.fileUrl
                                  ? `Attached as ${supportingDocument.fileName ?? "uploaded file"}`
                                  : "No file attached yet"}
                              </p>
                              {supportingDocument?.note ? (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                                  {supportingDocument.note}
                                </p>
                              ) : null}
                            </div>
                            {supportingDocument?.fileUrl ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  props.openEvidenceReview({
                                    source: "request_pack",
                                    title: supportingDocument.fileName || label,
                                    description: `${label} | ${props.managingPortalRequest.title}`,
                                    fileName: supportingDocument.fileName,
                                    fileUrl: supportingDocument.fileUrl ?? "",
                                    contentType: supportingDocument.contentType ?? null,
                                    storagePath: supportingDocument.storagePath ?? null,
                                    portalRequest: props.managingPortalRequest,
                                    badges: [
                                      {
                                        key: "request",
                                        label: "Client upload",
                                        variant: "secondary",
                                      },
                                    ],
                                  })
                                }
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Open File
                              </Button>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null
      }
      onSubmit={props.onSubmit}
    />
  );
}
