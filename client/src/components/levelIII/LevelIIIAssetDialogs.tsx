import { FormDialog, type FormField } from "@/components/FormDialog";

type LevelIIIAssetDialogsProps = {
  editingEquipment: Record<string, any> | null;
  isEquipmentFormOpen: boolean;
  setIsEquipmentFormOpen: (open: boolean) => void;
  setEditingEquipment: (value: any) => void;
  equipmentFields: FormField[];
  getDateInputValue: (value: string | Date | null | undefined) => string;
  equipmentPending: boolean;
  onSubmitEquipment: (values: Record<string, unknown>) => Promise<void>;
  editingSpecimen: Record<string, any> | null;
  isSpecimenFormOpen: boolean;
  setIsSpecimenFormOpen: (open: boolean) => void;
  setEditingSpecimen: (value: any) => void;
  specimenFields: FormField[];
  specimenPending: boolean;
  onSubmitSpecimen: (values: Record<string, unknown>) => Promise<void>;
};

export function LevelIIIAssetDialogs(props: LevelIIIAssetDialogsProps) {
  return (
    <>
      <FormDialog
        key={`leveliii-equipment-${props.editingEquipment?.id ?? "new"}`}
        open={props.isEquipmentFormOpen}
        onOpenChange={(open) => {
          props.setIsEquipmentFormOpen(open);
          if (!open) props.setEditingEquipment(null);
        }}
        title={
          props.editingEquipment
            ? "Edit Level III Equipment"
            : "Add Level III Equipment"
        }
        description="Create dedicated or shared Level III equipment records."
        fields={props.equipmentFields}
        initialValues={
          props.editingEquipment
            ? {
                ...props.editingEquipment,
                sharedWithMainEquipment: String(
                  props.editingEquipment.sharedWithMainEquipment
                ),
                lastServiceDate: props.getDateInputValue(
                  props.editingEquipment.lastServiceDate
                ),
                nextDueDate: props.getDateInputValue(
                  props.editingEquipment.nextDueDate
                ),
              }
            : { status: "Available", sharedWithMainEquipment: "false" }
        }
        isLoading={props.equipmentPending}
        onSubmit={props.onSubmitEquipment}
      />

      <FormDialog
        key={`leveliii-specimen-${props.editingSpecimen?.id ?? "new"}`}
        open={props.isSpecimenFormOpen}
        onOpenChange={(open) => {
          props.setIsSpecimenFormOpen(open);
          if (!open) props.setEditingSpecimen(null);
        }}
        title={
          props.editingSpecimen
            ? "Edit Level III Specimen"
            : "Add Level III Specimen"
        }
        description="Create Level III-only or shared specimen records."
        fields={props.specimenFields}
        initialValues={
          props.editingSpecimen
            ? {
                ...props.editingSpecimen,
                sharedWithMainSpecimens: String(
                  props.editingSpecimen.sharedWithMainSpecimens
                ),
              }
            : {
                status: "Available",
                sharedWithMainSpecimens: "false",
                masteringStatus: "Pending",
              }
        }
        isLoading={props.specimenPending}
        onSubmit={props.onSubmitSpecimen}
      />
    </>
  );
}
