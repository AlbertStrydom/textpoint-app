import type { Dispatch, ReactNode, SetStateAction } from "react";
import { FormDialog, type FormField } from "@/components/FormDialog";

type RequirementDefinitionItem = {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  validityDays?: number | null;
  reminderDays?: number | null;
  sortOrder?: number | null;
  isRequired?: boolean | null;
  active?: boolean | null;
  customFields?: unknown[];
};

type RequirementItem = {
  status: string;
  definitionName: string;
  latestDocumentUrl?: string | null;
  latestDocumentName?: string | null;
  latestSourceReferencePath?: string | null;
  latestSourceReferenceFileName?: string | null;
  technicianId: number;
};

type TechnicianOption = {
  id: number;
  name: string;
};

type RequirementDefinitionOption = {
  id: number;
  name: string;
};

type SelectedComplianceTechnician = {
  name: string;
};

type LevelIIITechnicianComplianceDialogsProps = {
  isTechnicianRequirementDefinitionFormOpen: boolean;
  setIsTechnicianRequirementDefinitionFormOpen: Dispatch<SetStateAction<boolean>>;
  editingTechnicianRequirementDefinition: RequirementDefinitionItem | null;
  setEditingTechnicianRequirementDefinition: Dispatch<SetStateAction<any>>;
  technicianRequirementDefinitionFields: FormField[];
  createEmptyLevelIIIDocumentDefinitionForm: () => Record<string, unknown>;
  technicianRequirementDefinitionFormValues: Record<string, unknown>;
  setTechnicianRequirementDefinitionFormValues: Dispatch<
    SetStateAction<Record<string, unknown>>
  >;
  technicianRequirementDefinitionPending: boolean;
  onSubmitDefinition: (values: Record<string, unknown>) => Promise<void>;
  isTechnicianRequirementFormOpen: boolean;
  setIsTechnicianRequirementFormOpen: Dispatch<SetStateAction<boolean>>;
  editingTechnicianRequirement: RequirementItem | null;
  setEditingTechnicianRequirement: Dispatch<SetStateAction<any>>;
  createEmptyTechnicianRequirementForm: () => Record<string, unknown>;
  technicianRequirementFormValues: Record<string, unknown>;
  setTechnicianRequirementFormValues: Dispatch<SetStateAction<Record<string, unknown>>>;
  technicianRequirementPending: boolean;
  technicians: TechnicianOption[];
  levelIIIRequirementDefinitions: RequirementDefinitionOption[];
  buildRequirementCustomRecordFields: (definition: any) => FormField[];
  activeTechnicianRequirementDefinition: any;
  getRequirementStatusBadge: (status: string) => ReactNode;
  openEditingRequirementEvidence: () => void;
  getRequirementCustomFieldSummary: (requirement: RequirementItem) => string;
  selectedComplianceTechnician: SelectedComplianceTechnician | null;
  onSubmitRequirement: (values: Record<string, unknown>) => Promise<void>;
};

export function LevelIIITechnicianComplianceDialogs(
  props: LevelIIITechnicianComplianceDialogsProps
) {
  const requirementStatus = String(props.technicianRequirementFormValues.status ?? "").trim();
  const datesDisabled = requirementStatus === "no_expiry";

  return (
    <>
      <FormDialog
        open={props.isTechnicianRequirementDefinitionFormOpen}
        onOpenChange={(open) => {
          props.setIsTechnicianRequirementDefinitionFormOpen(open);
          if (!open) {
            props.setEditingTechnicianRequirementDefinition(null);
          }
        }}
        title={
          props.editingTechnicianRequirementDefinition
            ? "Edit Document Type"
            : "Add Document Type"
        }
        description="Manage the allowed technician document list here, including names, categories, and whether a document expires."
        fields={props.technicianRequirementDefinitionFields}
        initialValues={{
          ...props.createEmptyLevelIIIDocumentDefinitionForm(),
          name: props.editingTechnicianRequirementDefinition?.name ?? "",
          category:
            props.editingTechnicianRequirementDefinition?.category ?? "Core Document",
          description: props.editingTechnicianRequirementDefinition?.description ?? "",
          validityMode:
            props.editingTechnicianRequirementDefinition?.validityDays !== null &&
            props.editingTechnicianRequirementDefinition?.validityDays !== undefined &&
            props.editingTechnicianRequirementDefinition.validityDays > 0
              ? "days"
              : "na",
          validityDays:
            props.editingTechnicianRequirementDefinition?.validityDays !== null &&
            props.editingTechnicianRequirementDefinition?.validityDays !== undefined
              ? String(props.editingTechnicianRequirementDefinition.validityDays)
              : "",
          reminderDays: String(
            props.editingTechnicianRequirementDefinition?.reminderDays ?? 30
          ),
          sortOrder: String(
            props.editingTechnicianRequirementDefinition?.sortOrder ?? 0
          ),
          isRequired:
            props.editingTechnicianRequirementDefinition?.isRequired ?? true,
          active: props.editingTechnicianRequirementDefinition?.active ?? true,
        }}
        onValuesChange={props.setTechnicianRequirementDefinitionFormValues}
        normalizeValues={(data, change) => {
          if (change.name === "validityMode" && change.value !== "days") {
            return {
              ...data,
              validityMode: "na",
              validityDays: "",
            };
          }
          return data;
        }}
        isLoading={props.technicianRequirementDefinitionPending}
        onSubmit={props.onSubmitDefinition}
      />

      <FormDialog
        open={props.isTechnicianRequirementFormOpen}
        onOpenChange={(open) => {
          props.setIsTechnicianRequirementFormOpen(open);
          if (!open) {
            props.setEditingTechnicianRequirement(null);
            props.setTechnicianRequirementFormValues(
              props.createEmptyTechnicianRequirementForm()
            );
          }
        }}
        title={
          props.editingTechnicianRequirement
            ? "Update Technician Compliance Record"
            : "Add Technician Compliance Record"
        }
        description="Track document validity, notes, and evidence for the selected technician requirement."
        fields={[
          {
            name: "technicianId",
            label: "Technician",
            type: "select",
            required: true,
            options: props.technicians.map((technician) => ({
              value: String(technician.id),
              label: technician.name,
            })),
          },
          {
            name: "definitionId",
            label: "Requirement",
            type: "select",
            required: true,
            options: props.levelIIIRequirementDefinitions.map((definition) => ({
              value: String(definition.id),
              label: definition.name,
            })),
          },
          {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
              { value: "current", label: "Current" },
              { value: "no_expiry", label: "N/A / Does Not Expire" },
              { value: "expiring", label: "Expiring" },
              { value: "expired", label: "Expired" },
              { value: "pending_review", label: "Pending Review" },
              { value: "missing", label: "Missing" },
            ],
          },
          {
            name: "issuedAt",
            label: "Issued",
            type: "date",
            disabled: datesDisabled,
            helpText: datesDisabled
              ? "Dates are not required when this document does not expire."
              : undefined,
          },
          {
            name: "validUntil",
            label: "Valid Until",
            type: "date",
            disabled: datesDisabled,
            helpText: datesDisabled
              ? "Dates are not required when this document does not expire."
              : undefined,
          },
          { name: "notes", label: "Notes", type: "textarea" },
          ...props.buildRequirementCustomRecordFields(
            props.activeTechnicianRequirementDefinition
          ),
          {
            name: "attachmentFile",
            label: "Attachment File",
            type: "file",
            accept: ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx",
            helpText:
              "Upload the latest supporting evidence. The evidence file is stored against this technician requirement record.",
          },
        ]}
        initialValues={props.technicianRequirementFormValues}
        onValuesChange={props.setTechnicianRequirementFormValues}
        normalizeValues={(data, change) => {
          if (change.name !== "status" || change.value !== "no_expiry") {
            return data;
          }

          return {
            ...data,
            issuedAt: "",
            validUntil: "",
          };
        }}
        isLoading={props.technicianRequirementPending}
        renderExtraContent={() =>
          props.editingTechnicianRequirement ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {props.getRequirementStatusBadge(
                  props.editingTechnicianRequirement.status
                )}
                <span className="font-medium">
                  {props.editingTechnicianRequirement.definitionName}
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Latest evidence:{" "}
                {props.editingTechnicianRequirement.latestDocumentUrl ? (
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    onClick={props.openEditingRequirementEvidence}
                  >
                    {props.editingTechnicianRequirement.latestDocumentName ||
                      "Open file"}
                  </button>
                ) : (
                  "No evidence uploaded yet."
                )}
              </p>
              {props.editingTechnicianRequirement.latestSourceReferencePath ? (
                <p className="mt-1 text-muted-foreground">
                  Imported source:{" "}
                  <span className="font-medium text-foreground">
                    {props.editingTechnicianRequirement
                      .latestSourceReferenceFileName ||
                      props.editingTechnicianRequirement.latestSourceReferencePath}
                  </span>
                </p>
              ) : null}
              <p className="mt-1 text-muted-foreground">
                Existing custom details:{" "}
                {props.getRequirementCustomFieldSummary(
                  props.editingTechnicianRequirement
                )}
              </p>
            </div>
          ) : props.selectedComplianceTechnician ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Adding a new compliance record for{" "}
              <span className="font-medium text-foreground">
                {props.selectedComplianceTechnician.name}
              </span>
              .
            </div>
          ) : null
        }
        onSubmit={props.onSubmitRequirement}
      />
    </>
  );
}
