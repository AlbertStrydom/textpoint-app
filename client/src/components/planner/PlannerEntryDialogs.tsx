import { FormDialog } from "@/components/FormDialog";
import type { Dispatch, SetStateAction } from "react";

type PlannerRecurrenceLite = "Daily" | "Weekly" | "Monthly" | null;

type PlannerEntryLite = {
  createdAt: string | Date;
  entryDate: string | Date;
  id: number;
  isComplete: boolean;
  notes: string | null;
  recurrence: PlannerRecurrenceLite | string;
  recurrenceUntil: string | Date | null;
  reminderAt: string | Date | null;
  title: string;
  updatedAt: string | Date;
  userId: number;
};

type SharedEventTypeLite =
  | "Meeting"
  | "Training"
  | "Deadline"
  | "Reminder"
  | "Visit"
  | "General";

type SharedPlannerEventLite = {
  branchId: number | null;
  createdAt: string | Date;
  createdByUserId: number;
  endAt: string | Date | null;
  eventType: SharedEventTypeLite;
  id: number;
  isAllDay: boolean;
  location: string | null;
  notes: string | null;
  recurrence: PlannerRecurrenceLite | string;
  recurrenceUntil: string | Date | null;
  startAt: string | Date;
  title: string;
  updatedAt: string | Date;
};

type BranchLite = {
  id: number;
  name: string;
};

type MutationWithAsync<TInput> = {
  mutateAsync: (input: TInput) => Promise<unknown>;
};

type RefetchFn = () => Promise<unknown>;

type PlannerEntryDialogsProps = {
  ALL_SHARED_BRANCHS_VALUE: string;
  createMutation: MutationWithAsync<{
    entryDate: Date;
    isComplete: boolean;
    notes: string | null;
    recurrence: Exclude<PlannerRecurrenceLite, null> | null;
    recurrenceUntil: Date | null;
    reminderAt: Date | null;
    title: string;
  }>;
  createSharedMutation: MutationWithAsync<{
    branchId: number | null;
    endAt: Date | null;
    eventType: SharedEventTypeLite;
    isAllDay: boolean;
    location: string | null;
    notes: string | null;
    recurrence: Exclude<PlannerRecurrenceLite, null> | null;
    recurrenceUntil: Date | null;
    startAt: Date;
    title: string;
  }>;
  editingEntry: PlannerEntryLite | null;
  editingSharedEvent: SharedPlannerEventLite | null;
  getDateInputValue: (value: string | Date | null | undefined) => string;
  getDateTimeInputValue: (value: string | Date | null | undefined) => string;
  isFormOpen: boolean;
  isSharedFormOpen: boolean;
  parseDateInputValue: (value: string) => Date | null;
  parseDateTimeInputValue: (value: string) => Date | null;
  refetch: RefetchFn;
  refetchSharedEvents: RefetchFn;
  selectedDate: Date;
  selectedSharedDate: Date;
  setEditingEntry: Dispatch<SetStateAction<PlannerEntryLite | null>>;
  setEditingSharedEvent: Dispatch<SetStateAction<SharedPlannerEventLite | null>>;
  setIsFormOpen: Dispatch<SetStateAction<boolean>>;
  setIsSharedFormOpen: Dispatch<SetStateAction<boolean>>;
  startOfDay: (date: Date) => Date;
  toast: {
    error: (message: string) => void;
    success: (message: string) => void;
  };
  typedBranches: BranchLite[];
  updateMutation: MutationWithAsync<{
    data: {
      entryDate: Date;
      isComplete: boolean;
      notes: string | null;
      recurrence: Exclude<PlannerRecurrenceLite, null> | null;
      recurrenceUntil: Date | null;
      reminderAt: Date | null;
      title: string;
    };
    id: number;
  }>;
  updateSharedMutation: MutationWithAsync<{
    data: {
      branchId: number | null;
      endAt: Date | null;
      eventType: SharedEventTypeLite;
      isAllDay: boolean;
      location: string | null;
      notes: string | null;
      recurrence: Exclude<PlannerRecurrenceLite, null> | null;
      recurrenceUntil: Date | null;
      startAt: Date;
      title: string;
    };
    id: number;
  }>;
};

export function PlannerEntryDialogs({
  ALL_SHARED_BRANCHS_VALUE,
  createMutation,
  createSharedMutation,
  editingEntry,
  editingSharedEvent,
  getDateInputValue,
  getDateTimeInputValue,
  isFormOpen,
  isSharedFormOpen,
  parseDateInputValue,
  parseDateTimeInputValue,
  refetch,
  refetchSharedEvents,
  selectedDate,
  selectedSharedDate,
  setEditingEntry,
  setEditingSharedEvent,
  setIsFormOpen,
  setIsSharedFormOpen,
  startOfDay,
  toast,
  typedBranches,
  updateMutation,
  updateSharedMutation,
}: PlannerEntryDialogsProps) {

  return (
    <>
        <FormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingEntry(null);
          }}
          title={editingEntry ? "Edit Planner Entry" : "Add Planner Entry"}
          description="Keep personal activities, recurring meetings, reminders, and diary notes here."
          onSubmit={async (values) => {
            const title = String(values.title || "").trim();
            if (!title) {
              throw new Error("Title is required.");
            }

            const entryDate = parseDateInputValue(String(values.entryDate || ""));
            if (!entryDate) {
              throw new Error("Entry date is invalid.");
            }

            const recurrenceRaw = String(values.recurrence || "none");
            const recurrence =
              recurrenceRaw === "none"
                ? null
                : (recurrenceRaw as Exclude<PlannerRecurrenceLite, null>);

            const recurrenceUntil = recurrence
              ? parseDateInputValue(String(values.recurrenceUntil || ""))
              : null;

            if (recurrence && String(values.recurrenceUntil || "").trim() && !recurrenceUntil) {
              throw new Error("Repeat until date is invalid.");
            }

            if (recurrence && recurrenceUntil && recurrenceUntil < startOfDay(entryDate)) {
              throw new Error("Repeat until cannot be before the entry date.");
            }

            const reminderAtRaw = String(values.reminderAt || "").trim();
            const reminderAt = reminderAtRaw
              ? parseDateTimeInputValue(reminderAtRaw)
              : null;

            if (reminderAtRaw && !reminderAt) {
              throw new Error("Reminder date and time are invalid.");
            }

            const payload = {
              title,
              entryDate,
              notes: String(values.notes || "").trim() || null,
              reminderAt,
              isComplete: String(values.isComplete || "false") === "true",
              recurrence,
              recurrenceUntil,
            };

            try {
              if (editingEntry) {
                await updateMutation.mutateAsync({
                  id: editingEntry.id,
                  data: payload,
                });
                toast.success("Planner entry updated");
              } else {
                await createMutation.mutateAsync(payload);
                toast.success("Planner entry created");
              }

              setIsFormOpen(false);
              setEditingEntry(null);
              await refetch();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to save planner entry");
            }
          }}
          initialValues={
            editingEntry
              ? {
                  title: editingEntry.title,
                  entryDate: getDateInputValue(editingEntry.entryDate),
                  reminderAt: getDateTimeInputValue(editingEntry.reminderAt),
                  recurrence: editingEntry.recurrence || "none",
                  recurrenceUntil: getDateInputValue(editingEntry.recurrenceUntil),
                  isComplete: editingEntry.isComplete ? "true" : "false",
                  notes: editingEntry.notes || "",
                }
              : {
                  title: "",
                  entryDate: getDateInputValue(selectedDate),
                  reminderAt: "",
                  recurrence: "none",
                  recurrenceUntil: "",
                  isComplete: "false",
                  notes: "",
                }
          }
          fields={[
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
              placeholder: "Daily task, meeting, or diary heading",
            },
            { name: "entryDate", label: "Date", type: "date", required: true },
            {
              name: "reminderAt",
              label: "Reminder",
              type: "datetime-local",
              placeholder: "Choose reminder date and time",
            },
            {
              name: "recurrence",
              label: "Recurring Event",
              type: "select",
              options: [
                { value: "none", label: "Once-off" },
                { value: "Daily", label: "Daily" },
                { value: "Weekly", label: "Weekly" },
                { value: "Monthly", label: "Monthly" },
              ],
            },
            {
              name: "recurrenceUntil",
              label: "Repeat Until",
              type: "date",
            },
            {
              name: "isComplete",
              label: "Status",
              type: "select",
              required: true,
              options: [
                { value: "false", label: "Open" },
                { value: "true", label: "Done" },
              ],
            },
            {
              name: "notes",
              label: "Notes / Diary",
              type: "textarea",
              placeholder: "Write your private notes, diary details, or follow-up context here...",
            },
          ]}
        />

        <FormDialog
          open={isSharedFormOpen}
          onOpenChange={(open) => {
            setIsSharedFormOpen(open);
            if (!open) setEditingSharedEvent(null);
          }}
          title={editingSharedEvent ? "Edit Shared Event" : "Add Shared Event"}
          description="Create a collaborative calendar item that other users can see in the shared planner layer."
          onSubmit={async (values) => {
            const title = String(values.title || "").trim();
            if (!title) {
              throw new Error("Title is required.");
            }

            const startAtRaw = String(values.startAt || "").trim();
            const startAt = parseDateTimeInputValue(startAtRaw);
            if (!startAt) {
              throw new Error("Start date and time are invalid.");
            }

            const endAtRaw = String(values.endAt || "").trim();
            const endAt = endAtRaw ? parseDateTimeInputValue(endAtRaw) : null;
            if (endAtRaw && !endAt) {
              throw new Error("End date and time are invalid.");
            }

            if (endAt && endAt < startAt) {
              throw new Error("End time cannot be before the start time.");
            }

            const recurrenceRaw = String(values.recurrence || "none");
            const recurrence =
              recurrenceRaw === "none"
                ? null
                : (recurrenceRaw as Exclude<PlannerRecurrenceLite, null>);
            const recurrenceUntil = recurrence
              ? parseDateInputValue(String(values.recurrenceUntil || ""))
              : null;

            if (recurrence && String(values.recurrenceUntil || "").trim() && !recurrenceUntil) {
              throw new Error("Repeat until date is invalid.");
            }

            const branchValue = String(values.branchId || ALL_SHARED_BRANCHS_VALUE);
            const payload = {
              title,
              eventType: String(values.eventType || "General") as SharedEventTypeLite,
              branchId:
                branchValue === ALL_SHARED_BRANCHS_VALUE ? null : Number(branchValue),
              startAt,
              endAt,
              isAllDay: Boolean(values.isAllDay),
              location: String(values.location || "").trim() || null,
              notes: String(values.notes || "").trim() || null,
              recurrence,
              recurrenceUntil,
            };

            try {
              if (editingSharedEvent) {
                await updateSharedMutation.mutateAsync({
                  id: editingSharedEvent.id,
                  data: payload,
                });
                toast.success("Shared calendar event updated");
              } else {
                await createSharedMutation.mutateAsync(payload);
                toast.success("Shared calendar event created");
              }

              setIsSharedFormOpen(false);
              setEditingSharedEvent(null);
              await refetchSharedEvents();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to save shared calendar event"
              );
            }
          }}
          initialValues={
            editingSharedEvent
              ? {
                  title: editingSharedEvent.title,
                  eventType: editingSharedEvent.eventType,
                  branchId:
                    editingSharedEvent.branchId === null
                      ? ALL_SHARED_BRANCHS_VALUE
                      : String(editingSharedEvent.branchId),
                  startAt: getDateTimeInputValue(editingSharedEvent.startAt),
                  endAt: getDateTimeInputValue(editingSharedEvent.endAt),
                  isAllDay: editingSharedEvent.isAllDay,
                  location: editingSharedEvent.location || "",
                  recurrence: editingSharedEvent.recurrence || "none",
                  recurrenceUntil: getDateInputValue(editingSharedEvent.recurrenceUntil),
                  notes: editingSharedEvent.notes || "",
                }
              : {
                  title: "",
                  eventType: "General",
                  branchId: ALL_SHARED_BRANCHS_VALUE,
                  startAt: `${getDateInputValue(selectedSharedDate)}T08:00`,
                  endAt: "",
                  isAllDay: false,
                  location: "",
                  recurrence: "none",
                  recurrenceUntil: "",
                  notes: "",
                }
          }
          fields={[
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
              placeholder: "Team meeting, branch visit, or deadline",
            },
            {
              name: "eventType",
              label: "Event Type",
              type: "select",
              required: true,
              options: [
                { value: "Meeting", label: "Meeting" },
                { value: "Training", label: "Training" },
                { value: "Deadline", label: "Deadline" },
                { value: "Reminder", label: "Reminder" },
                { value: "Visit", label: "Visit" },
                { value: "General", label: "General" },
              ],
            },
            {
              name: "branchId",
              label: "Branch",
              type: "select",
              options: [
                { value: ALL_SHARED_BRANCHS_VALUE, label: "System-wide / all branches" },
                ...typedBranches.map((branch) => ({
                  value: String(branch.id),
                  label: branch.name,
                })),
              ],
            },
            {
              name: "startAt",
              label: "Start",
              type: "datetime-local",
              required: true,
            },
            {
              name: "endAt",
              label: "End",
              type: "datetime-local",
            },
            {
              name: "isAllDay",
              label: "All Day",
              type: "checkbox",
              placeholder: "Treat this as an all-day event",
            },
            {
              name: "location",
              label: "Location",
              type: "text",
              placeholder: "Meeting room, client site, or online link note",
            },
            {
              name: "recurrence",
              label: "Recurring Event",
              type: "select",
              options: [
                { value: "none", label: "Once-off" },
                { value: "Daily", label: "Daily" },
                { value: "Weekly", label: "Weekly" },
                { value: "Monthly", label: "Monthly" },
              ],
            },
            {
              name: "recurrenceUntil",
              label: "Repeat Until",
              type: "date",
            },
            {
              name: "notes",
              label: "Notes",
              type: "textarea",
              placeholder: "Add any extra collaboration notes or context here...",
            },
          ]}
        />
    </>
  );
}
