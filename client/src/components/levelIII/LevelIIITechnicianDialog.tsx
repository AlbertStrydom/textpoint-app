import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TechnicianMethodQualification = {
  method: string;
  level: string;
};

type TechnicianFormState = {
  clientId: string;
  clientBranchId: string;
  name: string;
  email: string;
  phone: string;
  methodQualifications: TechnicianMethodQualification[];
  hasPcnQualification: boolean;
  certificateNumber: string;
  procedureStatus: string;
  pcnRenewalDate: string;
  internalAssessmentDate: string;
  eyeTestValidUntil: string;
  notes: string;
};

type ClientOption = {
  value: string;
  label: string;
};

type BranchOption = {
  id: number;
  name: string;
  code?: string | null;
};

type MethodOption = {
  value: string;
  label: string;
};

type AuditEntry = {
  id: number;
  action: string;
  actorName?: string | null;
  actorEmail?: string | null;
  createdAt: string | Date;
  changesSummary?: string | null;
};

type EditingTechnician = {
  id: number;
};

type LevelIIITechnicianDialogProps = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  editingTechnician: EditingTechnician | null;
  setEditingTechnician: Dispatch<SetStateAction<any>>;
  technicianForm: TechnicianFormState;
  setTechnicianForm: Dispatch<SetStateAction<TechnicianFormState>>;
  createEmptyTechnicianForm: () => TechnicianFormState;
  clientOptions: ClientOption[];
  selectedClientBranchOptions: BranchOption[];
  technicianMethodOptions: MethodOption[];
  technicianHistoryLoading: boolean;
  technicianHistory: AuditEntry[];
  pending: boolean;
  onSubmit: () => Promise<void>;
};

export function LevelIIITechnicianDialog(props: LevelIIITechnicianDialogProps) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        props.setOpen(open);
        if (!open) {
          props.setEditingTechnician(null);
          props.setTechnicianForm(props.createEmptyTechnicianForm());
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b px-6 pb-4 pt-6">
            <DialogTitle>
              {props.editingTechnician ? "Edit Technician" : "Add Technician"}
            </DialogTitle>
            <DialogDescription>
              Link a technician to a client and capture a separate level for each approved method.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <div className="rounded-lg border border-dashed bg-muted/30 p-3">
                  <p className="text-sm font-medium">Company and branch assignment</p>
                  <p className="text-sm text-muted-foreground">
                    You can transfer a technician to another company or another client branch here.
                    If the company changes, the branch will reset unless it belongs to the newly
                    selected company.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-client">Client</Label>
                <select
                  id="technician-client"
                  value={props.technicianForm.clientId}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      clientId: event.target.value,
                      clientBranchId: "unassigned",
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={props.pending}
                >
                  <option value="">Select company</option>
                  {props.clientOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-branch">Client Branch</Label>
                <select
                  id="technician-branch"
                  value={props.technicianForm.clientBranchId}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      clientBranchId: event.target.value,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={!props.technicianForm.clientId || props.pending}
                >
                  <option value="unassigned">All / Unassigned</option>
                  {props.selectedClientBranchOptions.map((branch) => (
                    <option key={branch.id} value={String(branch.id)}>
                      {branch.name}
                      {branch.code ? ` (${branch.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-name">Technician Name</Label>
                <Input
                  id="technician-name"
                  value={props.technicianForm.name}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  disabled={props.pending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-email">Email</Label>
                <Input
                  id="technician-email"
                  type="email"
                  value={props.technicianForm.email}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  disabled={props.pending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-phone">Phone</Label>
                <Input
                  id="technician-phone"
                  value={props.technicianForm.phone}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  disabled={props.pending}
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <div className="space-y-1">
                  <Label>Methods And Levels</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose one or more methods for this technician, then set the correct level for
                    each one.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {props.technicianMethodOptions.map((option) => {
                      const selectedEntry = props.technicianForm.methodQualifications.find(
                        (entry) => entry.method === option.value
                      );

                      return (
                        <div key={option.value} className="rounded-md border border-dashed p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={Boolean(selectedEntry)}
                              onCheckedChange={(checked) => {
                                props.setTechnicianForm((current) => {
                                  const remaining = current.methodQualifications.filter(
                                    (entry) => entry.method !== option.value
                                  );
                                  if (!checked) {
                                    return {
                                      ...current,
                                      methodQualifications: remaining,
                                    };
                                  }
                                  return {
                                    ...current,
                                    methodQualifications: [
                                      ...remaining,
                                      {
                                        method: option.value,
                                        level: "",
                                      },
                                    ],
                                  };
                                });
                              }}
                              disabled={props.pending}
                            />
                            <Label className="cursor-pointer">{option.label}</Label>
                          </div>

                          {selectedEntry ? (
                            <div className="mt-3 space-y-2">
                              <Label htmlFor={`technician-level-${option.value}`}>
                                Level for {option.label}
                              </Label>
                              <Input
                                id={`technician-level-${option.value}`}
                                value={selectedEntry.level}
                                onChange={(event) =>
                                  props.setTechnicianForm((current) => ({
                                    ...current,
                                    methodQualifications: current.methodQualifications.map((entry) =>
                                      entry.method === option.value
                                        ? { ...entry, level: event.target.value }
                                        : entry
                                    ),
                                  }))
                                }
                                placeholder="Level I, II, III"
                                disabled={props.pending}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={props.technicianForm.hasPcnQualification}
                    onCheckedChange={(checked) =>
                      props.setTechnicianForm((current) => ({
                        ...current,
                        hasPcnQualification: Boolean(checked),
                        pcnRenewalDate: checked ? current.pcnRenewalDate : "",
                        internalAssessmentDate: checked ? "" : current.internalAssessmentDate,
                      }))
                    }
                    disabled={props.pending}
                  />
                  <Label className="cursor-pointer">
                    This technician holds a PCN qualification
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-certificate">Certificate Number</Label>
                <Input
                  id="technician-certificate"
                  value={props.technicianForm.certificateNumber}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      certificateNumber: event.target.value,
                    }))
                  }
                  disabled={props.pending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-eye-test">Eye Test Valid Until</Label>
                <Input
                  id="technician-eye-test"
                  type="date"
                  value={props.technicianForm.eyeTestValidUntil}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      eyeTestValidUntil: event.target.value,
                    }))
                  }
                  disabled={props.pending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-pcn-renewal">PCN Re-certification Date</Label>
                <Input
                  id="technician-pcn-renewal"
                  type="date"
                  value={props.technicianForm.pcnRenewalDate}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      pcnRenewalDate: event.target.value,
                    }))
                  }
                  disabled={!props.technicianForm.hasPcnQualification || props.pending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="technician-assessment-date">
                  Internal Assessment / Re-certification Date
                </Label>
                <Input
                  id="technician-assessment-date"
                  type="date"
                  value={props.technicianForm.internalAssessmentDate}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      internalAssessmentDate: event.target.value,
                    }))
                  }
                  disabled={props.technicianForm.hasPcnQualification || props.pending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="technician-procedure-status">
                  Procedure / Assessment Status
                </Label>
                <Input
                  id="technician-procedure-status"
                  value={props.technicianForm.procedureStatus}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      procedureStatus: event.target.value,
                    }))
                  }
                  placeholder="Last assessed, procedure revision, etc."
                  disabled={props.pending}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="technician-notes">Notes</Label>
                <Textarea
                  id="technician-notes"
                  value={props.technicianForm.notes}
                  onChange={(event) =>
                    props.setTechnicianForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  disabled={props.pending}
                />
              </div>

              {props.editingTechnician ? (
                <div className="space-y-3 md:col-span-2">
                  <div className="space-y-1">
                    <Label>Technician History</Label>
                    <p className="text-sm text-muted-foreground">
                      Review transfers and important technician changes before saving another
                      update.
                    </p>
                  </div>
                  <div className="rounded-lg border">
                    {props.technicianHistoryLoading ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        Loading technician history...
                      </div>
                    ) : props.technicianHistory.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        No technician history recorded yet.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {props.technicianHistory.map((entry) => (
                          <div key={entry.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{entry.action}</Badge>
                                <span className="text-sm font-medium">
                                  {entry.actorName || entry.actorEmail || "Unknown user"}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {entry.changesSummary || "No summary available."}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                props.setOpen(false);
                props.setEditingTechnician(null);
                props.setTechnicianForm(props.createEmptyTechnicianForm());
              }}
              disabled={props.pending}
            >
              Cancel
            </Button>
            <Button type="button" disabled={props.pending} onClick={() => void props.onSubmit()}>
              {props.pending ? "Saving..." : "Save Technician"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
