import { useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type NotificationCheckFns = {
  checkEscalations: () => Promise<unknown>;
  checkDocumentSignatures: () => Promise<unknown>;
  checkQualityReminders: () => Promise<unknown>;
  checkClientPortalReminders: () => Promise<unknown>;
  checkPlannerTimesheetReminders: () => Promise<unknown>;
  invalidateNotifications: () => Promise<unknown>;
};

type UseNotificationsOptions = {
  enabled?: boolean;
  allowAdminChecks?: boolean;
};

/**
 * Hook for real-time notification polling and alerts
 */
export function useNotifications({
  enabled = true,
  allowAdminChecks = false,
}: UseNotificationsOptions = {}) {
  const utils = trpc.useUtils();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const checkFnsRef = useRef<NotificationCheckFns | null>(null);

  const checkEscalationMutation = trpc.notifications.checkEscalation.useMutation();
  const checkDocumentSignaturesMutation =
    trpc.notifications.checkDocumentSignatures.useMutation();
  const checkQualityRemindersMutation =
    trpc.notifications.checkQualityReminders.useMutation();
  const checkClientPortalRemindersMutation =
    trpc.notifications.checkClientPortalReminders.useMutation();
  const checkPlannerTimesheetRemindersMutation =
    trpc.notifications.checkPlannerTimesheetReminders.useMutation();

  checkFnsRef.current = {
    checkEscalations: () => checkEscalationMutation.mutateAsync(),
    checkDocumentSignatures: () => checkDocumentSignaturesMutation.mutateAsync(),
    checkQualityReminders: () => checkQualityRemindersMutation.mutateAsync(),
    checkClientPortalReminders: () => checkClientPortalRemindersMutation.mutateAsync(),
    checkPlannerTimesheetReminders: () =>
      checkPlannerTimesheetRemindersMutation.mutateAsync(),
    invalidateNotifications: () => utils.notifications.list.invalidate(),
  };

  const runChecks = useCallback(async (showToast = false) => {
    if (isCheckingRef.current) return;
    const checkFns = checkFnsRef.current;
    if (!checkFns) return;

    isCheckingRef.current = true;
    try {
      if (allowAdminChecks) {
        await Promise.all([
          checkFns.checkEscalations(),
          checkFns.checkDocumentSignatures(),
          checkFns.checkQualityReminders(),
          checkFns.checkClientPortalReminders(),
          checkFns.checkPlannerTimesheetReminders(),
        ]);
      }
      await checkFns.invalidateNotifications().catch(() => undefined);
      if (showToast) {
        toast.success(
          allowAdminChecks ? "Notifications and reminders checked" : "Notifications refreshed"
        );
      }
    } catch (error) {
      if (showToast) {
        toast.error("Failed to check notifications");
      } else {
        console.error("Error running notification checks:", error);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void runChecks();

    // Set up interval to check every 5 minutes (300000 ms)
    intervalRef.current = setInterval(runChecks, 300000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, runChecks]);

  // Manual trigger for immediate check
  const triggerCheck = () => runChecks(true);

  return { triggerCheck };
}

/**
 * Hook to manually trigger escalation checks
 */
export function useEscalationCheck() {
  const checkEscalationMutation = trpc.notifications.checkEscalation.useMutation();
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const triggerEscalationCheck = async () => {
    const role = meQuery.data?.role;
    if (role !== "admin" && role !== "super_admin") {
      toast.error("Only admins can run escalation checks");
      return 0;
    }

    try {
      const result = await checkEscalationMutation.mutateAsync();
      utils.notifications.list.invalidate();
      if (result > 0) {
        toast.warning(`${result} equipment item(s) escalated to urgent`);
      }
      return result;
    } catch (error) {
      toast.error("Failed to check escalations");
      return 0;
    }
  };

  return { triggerEscalationCheck, isLoading: checkEscalationMutation.isPending };
}
