import { FormDialog, type FormField } from "@/components/FormDialog";

type LevelIIIClientActivityDialogsProps = {
  editingClient: Record<string, any> | null;
  isClientFormOpen: boolean;
  setIsClientFormOpen: (open: boolean) => void;
  setEditingClient: (value: any) => void;
  clientFields: FormField[];
  getDateInputValue: (value: string | Date | null | undefined) => string;
  clientPending: boolean;
  onSubmitClient: (values: Record<string, unknown>) => Promise<void>;
  editingActivity: Record<string, any> | null;
  isActivityFormOpen: boolean;
  setIsActivityFormOpen: (open: boolean) => void;
  setEditingActivity: (value: any) => void;
  activityFields: FormField[];
  activityPending: boolean;
  onSubmitActivity: (values: Record<string, unknown>) => Promise<void>;
};

export function LevelIIIClientActivityDialogs(
  props: LevelIIIClientActivityDialogsProps
) {
  return (
    <>
      <FormDialog
        key={`leveliii-client-${props.editingClient?.id ?? "new"}`}
        open={props.isClientFormOpen}
        onOpenChange={(open) => {
          props.setIsClientFormOpen(open);
          if (!open) props.setEditingClient(null);
        }}
        title={props.editingClient ? "Edit Level III Client" : "Add Level III Client"}
        description="Capture company, contact, visit, and procedure review details."
        fields={props.clientFields}
        initialValues={
          props.editingClient
            ? {
                ...props.editingClient,
                lastVisit: props.getDateInputValue(props.editingClient.lastVisit),
                nextVisit: props.getDateInputValue(props.editingClient.nextVisit),
                procedureUpdatedAt: props.getDateInputValue(
                  props.editingClient.procedureUpdatedAt
                ),
              }
            : { visitCadence: "Monthly" }
        }
        isLoading={props.clientPending}
        onSubmit={props.onSubmitClient}
      />

      <FormDialog
        key={`leveliii-activity-${props.editingActivity?.id ?? "new"}`}
        open={props.isActivityFormOpen}
        onOpenChange={(open) => {
          props.setIsActivityFormOpen(open);
          if (!open) props.setEditingActivity(null);
        }}
        title={props.editingActivity ? "Edit Activity" : "Log Activity"}
        description="Capture client visits, calls, emails, and planned follow-up actions."
        fields={props.activityFields}
        initialValues={
          props.editingActivity
            ? {
                ...props.editingActivity,
                clientId: String(props.editingActivity.clientId),
                activityDate: props.getDateInputValue(
                  props.editingActivity.activityDate
                ),
                nextActionDate: props.getDateInputValue(
                  props.editingActivity.nextActionDate
                ),
              }
            : {
                activityType: "Visit",
                status: "Completed",
                activityDate: props.getDateInputValue(new Date()),
              }
        }
        isLoading={props.activityPending}
        onSubmit={props.onSubmitActivity}
      />
    </>
  );
}
