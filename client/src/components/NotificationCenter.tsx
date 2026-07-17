import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  ExternalLink,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string | Date;
};

type NotificationPreferences = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  soundAlerts: boolean;
  studentAddedNotif: boolean;
  leadStatusChangeNotif: boolean;
  attendanceNotif: boolean;
  equipmentNotif: boolean;
  specimenNotif: boolean;
  kpiNotif: boolean;
  courseNotif: boolean;
  enrollmentNotif: boolean;
  systemAlertNotif: boolean;
};

function getPriorityBadgeClass(priority: NotificationItem["priority"]) {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100";
    case "high":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100";
    case "low":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-100";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100";
  }
}

function getPriorityLabel(priority: NotificationItem["priority"]) {
  switch (priority) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "low":
      return "Low";
    default:
      return "Normal";
  }
}

export function NotificationCenter() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const { data: notifications = [] } = trpc.notifications.list.useQuery();
  const { data: preferencesData } = trpc.notifications.getPreferences.useQuery();

  const typedNotifications = notifications as NotificationItem[];
  const unreadCount = typedNotifications.filter((item) => !item.isRead).length;

  const preferences: NotificationPreferences = {
    emailNotifications: preferencesData?.emailNotifications ?? true,
    pushNotifications: preferencesData?.pushNotifications ?? true,
    soundAlerts: preferencesData?.soundAlerts ?? true,
    studentAddedNotif: preferencesData?.studentAddedNotif ?? true,
    leadStatusChangeNotif: preferencesData?.leadStatusChangeNotif ?? true,
    attendanceNotif: preferencesData?.attendanceNotif ?? true,
    equipmentNotif: preferencesData?.equipmentNotif ?? true,
    specimenNotif: preferencesData?.specimenNotif ?? true,
    kpiNotif: preferencesData?.kpiNotif ?? true,
    courseNotif: preferencesData?.courseNotif ?? true,
    enrollmentNotif: preferencesData?.enrollmentNotif ?? true,
    systemAlertNotif: preferencesData?.systemAlertNotif ?? true,
  };

  const preferenceItems = useMemo(
    () => [
      { key: "emailNotifications", label: "Email notifications" },
      { key: "pushNotifications", label: "In-app notifications" },
      { key: "soundAlerts", label: "Sound alerts" },
      { key: "equipmentNotif", label: "Equipment alerts" },
      { key: "kpiNotif", label: "KPI approvals" },
      { key: "leadStatusChangeNotif", label: "Lead status updates" },
      { key: "attendanceNotif", label: "Attendance updates" },
      { key: "enrollmentNotif", label: "Enrolment confirmations" },
      { key: "courseNotif", label: "Course notifications" },
      { key: "systemAlertNotif", label: "System and portal alerts" },
    ] as const,
    []
  );

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();
  const deleteMutation = trpc.notifications.delete.useMutation();
  const updatePrefMutation = trpc.notifications.updatePreferences.useMutation();

  const refreshNotifications = async () => {
    await Promise.all([
      utils.notifications.list.invalidate(),
      utils.notifications.getPreferences.invalidate(),
    ]);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsReadMutation.mutateAsync({ id });
      await refreshNotifications();
      toast.success("Notification marked as read");
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      await refreshNotifications();
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
      await refreshNotifications();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleUpdatePreference = async (
    key: keyof NotificationPreferences,
    checked: boolean
  ) => {
    try {
      await updatePrefMutation.mutateAsync({ [key]: checked });
      await refreshNotifications();
      toast.success("Preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    }
  };

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen((open) => !open)}
          className="relative"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-0 top-0 inline-flex min-h-5 min-w-5 -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>

        {isOpen ? (
          <div className="absolute right-0 z-50 mt-2 w-[26rem] rounded-xl border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-xs text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                    : "All caught up"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreferences(true)}
                  aria-label="Notification preferences"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-xs text-muted-foreground">
                Latest activity across the system
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Mark all read
              </Button>
            </div>

            <ScrollArea className="max-h-[28rem]">
              <div className="divide-y">
                {typedNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <Bell className="mb-3 h-8 w-8 text-muted-foreground/60" />
                    <p className="font-medium">No notifications yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Alerts will appear here as activity happens in the system.
                    </p>
                  </div>
                ) : (
                  typedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-4 transition-colors ${
                        notification.isRead
                          ? "bg-background"
                          : "bg-primary/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getPriorityBadgeClass(notification.priority)}>
                              {getPriorityLabel(notification.priority)}
                            </Badge>
                            {!notification.isRead ? (
                              <Badge variant="outline">Unread</Badge>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              {new Date(notification.createdAt).toLocaleString("en-ZA")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.isRead ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMarkAsRead(notification.id)}
                              aria-label="Mark notification as read"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(notification.id)}
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {notification.actionUrl ? (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenNotification(notification)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </div>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {preferenceItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3">
                <Label htmlFor={item.key} className="text-sm font-normal">
                  {item.label}
                </Label>
                <Checkbox
                  id={item.key}
                  checked={preferences[item.key]}
                  onCheckedChange={(checked) =>
                    handleUpdatePreference(item.key, Boolean(checked))
                  }
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
