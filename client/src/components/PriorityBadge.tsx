import { AlertCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";

export type PriorityLevel = "normal" | "warning" | "urgent" | "critical" | "resolved";

interface PriorityBadgeProps {
  level: PriorityLevel;
  daysOverdue?: number;
  showIcon?: boolean;
}

const priorityConfig: Record<PriorityLevel, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  normal: {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon: <Clock className="w-4 h-4" />,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-950",
    text: "text-yellow-700 dark:text-yellow-300",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  urgent: {
    bg: "bg-orange-50 dark:bg-orange-950",
    text: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  critical: {
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    icon: <AlertCircle className="w-4 h-4" />,
  },
  resolved: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    icon: <CheckCircle className="w-4 h-4" />,
  },
};

export function PriorityBadge({ level, daysOverdue, showIcon = true }: PriorityBadgeProps) {
  const config = priorityConfig[level];
  const label =
    level === "critical"
      ? "CRITICAL"
      : level === "urgent"
        ? "URGENT"
        : level === "warning"
          ? "WARNING"
          : level === "resolved"
            ? "RESOLVED"
            : "NORMAL";

  const displayText = daysOverdue !== undefined ? `${label} (${daysOverdue}d)` : label;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${config.bg} ${config.text} ${config.border} text-sm font-medium`}>
      {showIcon && config.icon}
      <span>{displayText}</span>
    </div>
  );
}
