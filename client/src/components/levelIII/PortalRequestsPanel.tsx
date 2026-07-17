import type { ReactNode } from "react";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PortalActionQueuePriority } from "@/pages/LevelIIIPage.types";

type PortalRequestsPanelProps = {
  assessmentBookingRequestSummary: any;
  assessmentBookingRequests: any[];
  clients: any[];
  convertPortalCommentToActivity: (comment: any) => Promise<void>;
  convertPortalServiceRequestToActivity: (request: any) => Promise<void>;
  createActivityPending: boolean;
  filteredPortalComments: any[];
  filteredPortalServiceRequests: any[];
  getPortalActionQueuePriorityBadge: (priority: PortalActionQueuePriority) => ReactNode;
  getPortalCommentStatusBadge: (status: any) => ReactNode;
  getPortalServiceRequestStatusBadge: (status: any) => ReactNode;
  openPortalRequestManagement: (request: any) => void;
  portalActionQueue: any[];
  portalActionQueueSummary: any;
  portalAssessmentBookingColumns: any[];
  portalCommentColumns: any[];
  portalCommentsLoading: boolean;
  portalRequestSummary: any;
  portalRequestSearch: string;
  portalServiceRequestColumns: any[];
  portalServiceRequestsLoading: boolean;
  renderPortalRequestActions: (row: any) => ReactNode;
  selectedPortalBranchFilter: string;
  selectedPortalBranchOptions: any[];
  selectedPortalClientFilter: string;
  setPortalRequestSearch: (value: string) => void;
  setSelectedPortalBranchFilter: (value: string) => void;
  setSelectedPortalClientFilter: (value: string) => void;
  toast: { success: (message: string) => void; error: (message: string) => void };
  advancePortalComment: (comment: any) => Promise<void>;
  advancePortalServiceRequest: (request: any) => Promise<void>;
  updatePortalCommentStatusPending: boolean;
  updatePortalServiceRequestStatusPending: boolean;
};

export function PortalRequestsPanel({
  assessmentBookingRequestSummary,
  assessmentBookingRequests,
  clients,
  convertPortalCommentToActivity,
  convertPortalServiceRequestToActivity,
  createActivityPending,
  filteredPortalComments,
  filteredPortalServiceRequests,
  getPortalActionQueuePriorityBadge,
  getPortalCommentStatusBadge,
  getPortalServiceRequestStatusBadge,
  openPortalRequestManagement,
  portalActionQueue,
  portalActionQueueSummary,
  portalAssessmentBookingColumns,
  portalCommentColumns,
  portalCommentsLoading,
  portalRequestSummary,
  portalRequestSearch,
  portalServiceRequestColumns,
  portalServiceRequestsLoading,
  renderPortalRequestActions,
  selectedPortalBranchFilter,
  selectedPortalBranchOptions,
  selectedPortalClientFilter,
  setPortalRequestSearch,
  setSelectedPortalBranchFilter,
  setSelectedPortalClientFilter,
  toast,
  advancePortalComment,
  advancePortalServiceRequest,
  updatePortalCommentStatusPending,
  updatePortalServiceRequestStatusPending,
}: PortalRequestsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal Requests</CardTitle>
        <CardDescription>
          Review what Level III clients asked for in the portal, progress the request, and
          convert it into an internal Level III activity when your team needs to act.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="portalRequestClientFilter">Client</Label>
            <select
              id="portalRequestClientFilter"
              value={selectedPortalClientFilter}
              onChange={(event) => setSelectedPortalClientFilter(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Choose Client</option>
              {clients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {client.companyName}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="portalRequestBranchFilter">Branch</Label>
            <select
              id="portalRequestBranchFilter"
              value={selectedPortalBranchFilter}
              onChange={(event) => setSelectedPortalBranchFilter(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              disabled={selectedPortalClientFilter === "all"}
            >
              <option value="all">All Branches</option>
              {selectedPortalBranchOptions.map((branch) => (
                <option key={branch.id} value={String(branch.id)}>
                  {branch.name}
                  {branch.code ? ` (${branch.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="portalRequestSearch">Search</Label>
            <Input
              id="portalRequestSearch"
              value={portalRequestSearch}
              onChange={(event) => setPortalRequestSearch(event.target.value)}
              placeholder="Search requests, technicians, requester, or status..."
              disabled={selectedPortalClientFilter === "all"}
            />
          </div>
        </div>

        {selectedPortalClientFilter === "all" ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Choose a Level III client first to load that client&apos;s portal requests and comments.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Service Requests</p><p className="mt-1 text-2xl font-semibold">{portalRequestSummary.requestOpen}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Scheduled Requests</p><p className="mt-1 text-2xl font-semibold">{portalRequestSummary.requestScheduled}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open Client Comments</p><p className="mt-1 text-2xl font-semibold">{portalRequestSummary.commentOpen}</p></CardContent></Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Portal Action Queue</CardTitle>
                <CardDescription>
                  Prioritised internal worklist for Level III portal follow-up, based on real
                  blockers, missing activity links, and open client comments.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Queue Items</p><p className="mt-1 text-2xl font-semibold">{portalActionQueueSummary.total}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Critical</p><p className="mt-1 text-2xl font-semibold">{portalActionQueueSummary.critical}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">High</p><p className="mt-1 text-2xl font-semibold">{portalActionQueueSummary.high}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Normal</p><p className="mt-1 text-2xl font-semibold">{portalActionQueueSummary.normal}</p></CardContent></Card>
                </div>

                {portalActionQueue.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No open portal work is waiting in the queue for this client filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {portalActionQueue.slice(0, 8).map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-start lg:justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {getPortalActionQueuePriorityBadge(item.priority)}
                            {item.kind === "service_request" && item.request
                              ? getPortalServiceRequestStatusBadge(item.status)
                              : getPortalCommentStatusBadge(item.status)}
                            <Badge variant="outline">
                              {item.kind === "service_request" ? "Service Request" : "Client Comment"}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.detail}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Submitted {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {item.kind === "service_request" && item.request ? (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openPortalRequestManagement(item.request)}>
                                Manage
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void advancePortalServiceRequest(item.request)}
                                disabled={
                                  updatePortalServiceRequestStatusPending || item.request.status === "closed"
                                }
                              >
                                Advance
                              </Button>
                              {!item.request.linkedActivity ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await convertPortalServiceRequestToActivity(item.request);
                                      toast.success("Level III activity created from request");
                                    } catch (error) {
                                      toast.error(
                                        error instanceof Error
                                          ? error.message
                                          : "Could not create a Level III activity."
                                      );
                                    }
                                  }}
                                  disabled={createActivityPending}
                                >
                                  Create Activity
                                </Button>
                              ) : null}
                            </>
                          ) : item.comment ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void advancePortalComment(item.comment)}
                                disabled={updatePortalCommentStatusPending || item.comment.status === "closed"}
                              >
                                Advance
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await convertPortalCommentToActivity(item.comment);
                                    toast.success("Level III activity created from client comment");
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : "Could not create a Level III activity."
                                    );
                                  }
                                }}
                                disabled={createActivityPending}
                              >
                                Create Activity
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assessment Booking Queue</CardTitle>
                <CardDescription>
                  Internal readiness view for assessment booking requests, including guide
                  coverage and outstanding client uploads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Booking Requests</p><p className="mt-1 text-2xl font-semibold">{assessmentBookingRequestSummary.total}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ready Packs</p><p className="mt-1 text-2xl font-semibold">{assessmentBookingRequestSummary.ready}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Need Uploads</p><p className="mt-1 text-2xl font-semibold">{assessmentBookingRequestSummary.uploadGaps}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Guide Gaps</p><p className="mt-1 text-2xl font-semibold">{assessmentBookingRequestSummary.guideGaps}</p></CardContent></Card>
                </div>

                <DataTable
                  columns={portalAssessmentBookingColumns}
                  data={assessmentBookingRequests}
                  isLoading={portalServiceRequestsLoading}
                  searchPlaceholder="Search assessment bookings..."
                  actions={renderPortalRequestActions}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Requests</CardTitle>
                <CardDescription>
                  Procedure changes, assessment bookings, and other structured client requests
                  submitted through the portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={portalServiceRequestColumns}
                  data={filteredPortalServiceRequests}
                  isLoading={portalServiceRequestsLoading}
                  searchPlaceholder="Search service requests..."
                  actions={renderPortalRequestActions}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Client Comments</CardTitle>
                <CardDescription>
                  Contact requests, suggestions, and general comments that still need an internal response.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={portalCommentColumns}
                  data={filteredPortalComments}
                  isLoading={portalCommentsLoading}
                  searchPlaceholder="Search client comments..."
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void advancePortalComment(row)}
                        disabled={updatePortalCommentStatusPending || row.status === "closed"}
                      >
                        Advance
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await convertPortalCommentToActivity(row);
                            toast.success("Level III activity created from client comment");
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "Could not create a Level III activity."
                            );
                          }
                        }}
                        disabled={createActivityPending}
                      >
                        Create Activity
                      </Button>
                    </div>
                  )}
                />
              </CardContent>
            </Card>
          </>
        )}
      </CardContent>
    </Card>
  );
}
