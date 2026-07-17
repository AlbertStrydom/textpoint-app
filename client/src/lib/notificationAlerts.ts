import { toast } from "sonner";

/**
 * Play notification sound
 */
export function playNotificationSound(type: "default" | "alert" | "success" | "error" = "default") {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set sound parameters based on type
    switch (type) {
      case "alert":
        // High-pitched alert
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;

      case "success":
        // Pleasant success tone
        oscillator.frequency.value = 600;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;

      case "error":
        // Low-pitched error
        oscillator.frequency.value = 300;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;

      default:
        // Default notification sound
        oscillator.frequency.value = 500;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (error) {
    console.error("[NotificationAlerts] Failed to play sound:", error);
  }
}

/**
 * Show toast notification with optional sound
 */
export function showNotificationToast(
  title: string,
  message: string,
  options?: {
    type?: "default" | "success" | "error" | "info" | "warning";
    duration?: number;
    sound?: boolean;
    soundType?: "default" | "alert" | "success" | "error";
    action?: {
      label: string;
      onClick: () => void;
    };
  }
) {
  const { type = "default", duration = 4000, sound = true, soundType = "default", action } = options || {};

  // Play sound if enabled
  if (sound) {
    playNotificationSound(soundType);
  }

  // Show toast
  const toastOptions = {
    duration,
    ...(action && { action: { label: action.label, onClick: action.onClick } }),
  };

  switch (type) {
    case "success":
      toast.success(title, { ...toastOptions, description: message });
      break;
    case "error":
      toast.error(title, { ...toastOptions, description: message });
      break;
    case "warning":
      toast.warning(title, { ...toastOptions, description: message });
      break;
    case "info":
      toast.info(title, { ...toastOptions, description: message });
      break;
    default:
      toast(title, { ...toastOptions, description: message });
  }
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("[NotificationAlerts] Browser does not support notifications");
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Show browser notification (requires permission)
 */
export function showBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
    actions?: Array<{ action: string; title: string }>;
  }
) {
  if (!("Notification" in window)) {
    console.warn("[NotificationAlerts] Browser does not support notifications");
    return;
  }

  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      icon: "/favicon.ico",
      ...options,
    });

    // Close notification after 5 seconds if not requiring interaction
    if (!options?.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  }
}

/**
 * Show desktop notification with fallback to toast
 */
export function showDesktopNotification(
  title: string,
  message: string,
  options?: {
    type?: "default" | "success" | "error" | "info" | "warning";
    duration?: number;
    sound?: boolean;
    soundType?: "default" | "alert" | "success" | "error";
    icon?: string;
    requireInteraction?: boolean;
  }
) {
  const { type = "default", sound = true, soundType = "default", icon, requireInteraction = false } = options || {};

  // Try to show browser notification first
  if (Notification.permission === "granted") {
    showBrowserNotification(title, {
      body: message,
      icon,
      requireInteraction,
    });
  } else {
    // Fallback to toast
    showNotificationToast(title, message, {
      type,
      sound,
      soundType,
    });
  }
}

/**
 * Configure notification preferences
 */
export function setNotificationPreferences(preferences: {
  soundEnabled?: boolean;
  toastEnabled?: boolean;
  desktopNotificationsEnabled?: boolean;
  soundVolume?: number; // 0-1
}) {
  localStorage.setItem("notificationPreferences", JSON.stringify(preferences));
}

/**
 * Get notification preferences
 */
export function getNotificationPreferences() {
  const stored = localStorage.getItem("notificationPreferences");
  return stored
    ? JSON.parse(stored)
    : {
        soundEnabled: true,
        toastEnabled: true,
        desktopNotificationsEnabled: false,
        soundVolume: 0.5,
      };
}
