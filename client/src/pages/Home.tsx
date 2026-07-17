import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BellRing,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Hammer,
  Shield,
  TrendingUp,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLocation } from "wouter";

type LeadStatus = "New" | "Contacted" | "Qualified" | "Converted" | "Closed Lost";
type PlannerRecurrence = "Daily" | "Weekly" | "Monthly" | null;
type DashboardPriority = "critical" | "high" | "normal";

type Lead = {
  id: number;
  status: LeadStatus;
  isBlacklisted: boolean;
};

type LeadReminder = {
  id: string;
  title: string;
  detail: string | null;
  leadName: string;
  companyName: string | null;
  dueDate: string | Date;
  priority: "overdue" | "today" | "upcoming";
};

type Course = {
  id: number;
  name: string;
  code: string | null;
};

type Branch = {
  id: number;
  name: string;
};

type CourseSchedule = {
  id: number;
  courseId: number;
  branchId: number | null;
  startDate: string | Date;
  endDate: string | Date;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled" | string;
};

type EquipmentRecord = {
  id: number;
  name: string;
  serialNumber: string | null;
  nextDueDate: string | Date | null;
  status: string;
};

type SpecimenRecord = {
  id: number;
  status: string;
};

type PlannerEntry = {
  id: number;
  title: string;
  entryDate: string | Date;
  notes: string | null;
  reminderAt: string | Date | null;
  isComplete: boolean;
  recurrence: PlannerRecurrence | string;
  recurrenceUntil: string | Date | null;
};

type PlannerOccurrence = {
  key: string;
  source: PlannerEntry;
  occurrenceDate: Date;
  reminderAt: Date | null;
};

type KPIRecord = {
  id: number;
  status: "Draft" | "Submitted" | "Approved" | "Rejected";
  evaluationDate: string | Date;
  createdAt: string | Date;
};

type LevelIIIClient = {
  id: number;
  companyName: string;
  nextVisit: string | Date | null;
};

type LevelIIITechnician = {
  id: number;
  clientId: number;
  name: string;
  hasPcnQualification: boolean;
  pcnRenewalDate: string | Date | null;
  internalAssessmentDate: string | Date | null;
  eyeTestValidUntil: string | Date | null;
};

type LevelIIIEquipment = {
  id: number;
  name: string;
  serialNumber: string;
  nextDueDate: string | Date | null;
};

type CertificateRecord = {
  id: number;
  certificateNumber: string;
  expiryDate: string | Date | null;
  status: "Active" | "Expired" | "Revoked";
};

type DashboardAction = {
  id: string;
  title: string;
  detail: string;
  dueDate: Date | null;
  priority: DashboardPriority;
  path: string;
  label: string;
};

function parseDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatDate(value: string | Date | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | Date | null | undefined) {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return parsed.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(date: Date, from = new Date()) {
  return Math.round(
    (startOfDay(date).getTime() - startOfDay(from).getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

function getPriorityClasses(priority: DashboardPriority) {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-100";
    case "high":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100";
    default:
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-100";
  }
}

function getPriorityLabel(priority: DashboardPriority) {
  switch (priority) {
    case "critical":
      return "Urgent";
    case "high":
      return "Attention";
    default:
      return "Upcoming";
  }
}

function getPlannerReminderAt(entry: PlannerEntry, occurrenceDate: Date) {
  const reminderAt = parseDate(entry.reminderAt);
  if (!reminderAt) return null;

  const reminder = new Date(occurrenceDate);
  reminder.setHours(
    reminderAt.getHours(),
    reminderAt.getMinutes(),
    reminderAt.getSeconds(),
    reminderAt.getMilliseconds()
  );
  return reminder;
}

function buildPlannerOccurrences(
  entries: PlannerEntry[],
  rangeStart: Date,
  rangeEnd: Date
) {
  const occurrences: PlannerOccurrence[] = [];

  for (const entry of entries) {
    const baseDate = parseDate(entry.entryDate);
    if (!baseDate) continue;

    const recurrence = entry.recurrence || null;
    const recurrenceUntil = parseDate(entry.recurrenceUntil) ?? rangeEnd;

    if (!recurrence || recurrence === "None") {
      if (baseDate >= rangeStart && baseDate <= rangeEnd) {
        occurrences.push({
          key: `planner-${entry.id}-${baseDate.toISOString()}`,
          source: entry,
          occurrenceDate: baseDate,
          reminderAt: getPlannerReminderAt(entry, baseDate),
        });
      }
      continue;
    }

    let cursor = new Date(baseDate);
    let guard = 0;

    while (cursor <= rangeEnd && cursor <= recurrenceUntil && guard < 500) {
      if (cursor >= rangeStart) {
        occurrences.push({
          key: `planner-${entry.id}-${cursor.toISOString()}`,
          source: entry,
          occurrenceDate: new Date(cursor),
          reminderAt: getPlannerReminderAt(entry, cursor),
        });
      }

      if (recurrence === "Daily") {
        cursor = addDays(cursor, 1);
      } else if (recurrence === "Weekly") {
        cursor = addDays(cursor, 7);
      } else if (recurrence === "Monthly") {
        cursor = addMonths(cursor, 1);
      } else {
        break;
      }

      guard += 1;
    }
  }

  return occurrences.sort((left, right) => {
    const leftReminder = left.reminderAt?.getTime() ?? left.occurrenceDate.getTime();
    const rightReminder = right.reminderAt?.getTime() ?? right.occurrenceDate.getTime();
    return leftReminder - rightReminder;
  });
}

function buildScheduleLabel(
  schedule: CourseSchedule,
  courses: Course[],
  branches: Branch[]
) {
  const course = courses.find((item) => item.id === schedule.courseId);
  const branch = branches.find((item) => item.id === schedule.branchId);
  const courseLabel = course
    ? `${course.code ? `${course.code} - ` : ""}${course.name}`
    : `Course ${schedule.courseId}`;

  return `${courseLabel} | ${branch?.name || "No branch"} | ${formatDate(schedule.startDate)}`;
}

function getLeadReminderPriority(priority: LeadReminder["priority"]): DashboardPriority {
  switch (priority) {
    case "overdue":
      return "critical";
    case "today":
      return "high";
    default:
      return "normal";
  }
}

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const queryOptions = {
    enabled: !!user,
    retry: false as const,
    refetchOnWindowFocus: false,
  };

  const { data: students = [], isLoading: studentsLoading } =
    trpc.students.list.useQuery(undefined, queryOptions);
  const { data: leads = [], isLoading: leadsLoading } =
    trpc.leads.list.useQuery(undefined, queryOptions);
  const { data: leadReminders = [], isLoading: leadRemindersLoading } =
    trpc.leads.reminders.useQuery({ daysAhead: 14 }, queryOptions);
  const { data: courses = [], isLoading: coursesLoading } =
    trpc.courses.list.useQuery(undefined, queryOptions);
  const { data: schedules = [], isLoading: schedulesLoading } =
    trpc.courseSchedules.list.useQuery(undefined, queryOptions);
  const { data: branches = [], isLoading: branchesLoading } =
    trpc.branches.list.useQuery(undefined, queryOptions);
  const { data: equipment = [], isLoading: equipmentLoading } =
    trpc.equipment.list.useQuery(undefined, queryOptions);
  const { data: specimens = [], isLoading: specimensLoading } =
    trpc.specimens.list.useQuery(undefined, queryOptions);
  const { data: plannerEntries = [], isLoading: plannerLoading } =
    trpc.planner.list.useQuery(undefined, queryOptions);
  const { data: kpiRecords = [], isLoading: kpiLoading } =
    trpc.kpi.records.useQuery(undefined, queryOptions);
  const { data: levelIIIClients = [], isLoading: levelIIIClientsLoading } =
    trpc.levelIII.clients.list.useQuery(undefined, queryOptions);
  const { data: levelIIITechnicians = [], isLoading: levelIIITechniciansLoading } =
    trpc.levelIII.technicians.list.useQuery(undefined, queryOptions);
  const { data: levelIIIEquipment = [], isLoading: levelIIIEquipmentLoading } =
    trpc.levelIII.equipment.list.useQuery(undefined, queryOptions);
  const { data: certificates = [], isLoading: certificatesLoading } =
    trpc.certificates.list.useQuery(undefined, queryOptions);

  const isLoading =
    loading ||
    studentsLoading ||
    leadsLoading ||
    leadRemindersLoading ||
    coursesLoading ||
    schedulesLoading ||
    branchesLoading ||
    equipmentLoading ||
    specimensLoading ||
    plannerLoading ||
    kpiLoading ||
    levelIIIClientsLoading ||
    levelIIITechniciansLoading ||
    levelIIIEquipmentLoading ||
    certificatesLoading;

  const typedLeads = leads as Lead[];
  const typedLeadReminders = leadReminders as LeadReminder[];
  const typedCourses = courses as Course[];
  const typedSchedules = schedules as CourseSchedule[];
  const typedBranches = branches as Branch[];
  const typedEquipment = equipment as EquipmentRecord[];
  const typedSpecimens = specimens as SpecimenRecord[];
  const typedPlannerEntries = plannerEntries as PlannerEntry[];
  const typedKpiRecords = kpiRecords as KPIRecord[];
  const typedLevelIIIClients = levelIIIClients as LevelIIIClient[];
  const typedLevelIIITechnicians = levelIIITechnicians as LevelIIITechnician[];
  const typedLevelIIIEquipment = levelIIIEquipment as LevelIIIEquipment[];
  const typedCertificates = certificates as CertificateRecord[];

  const dashboardData = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const nextSevenDays = addDays(todayStart, 7);
    const nextFourteenDays = addDays(todayStart, 14);
    const nextThirtyDays = addDays(todayStart, 30);

    const openLeads = typedLeads.filter(
      (lead) => lead.status !== "Converted" && lead.status !== "Closed Lost" && !lead.isBlacklisted
    );

    const plannerOccurrences = buildPlannerOccurrences(
      typedPlannerEntries,
      todayStart,
      nextSevenDays
    );

    const plannerToday = plannerOccurrences.filter(
      (occurrence) =>
        !occurrence.source.isComplete && isSameDay(occurrence.occurrenceDate, todayStart)
    );

    const plannerUpcoming = plannerOccurrences.filter(
      (occurrence) =>
        !occurrence.source.isComplete &&
        (occurrence.reminderAt
          ? occurrence.reminderAt >= todayStart && occurrence.reminderAt <= nextSevenDays
          : occurrence.occurrenceDate >= todayStart && occurrence.occurrenceDate <= nextSevenDays)
    );

    const upcomingSchedules = typedSchedules
      .filter((schedule) => {
        const startDate = parseDate(schedule.startDate);
        return (
          startDate &&
          startDate >= todayStart &&
          startDate <= nextFourteenDays &&
          schedule.status !== "Cancelled"
        );
      })
      .sort(
        (left, right) =>
          (parseDate(left.startDate)?.getTime() ?? 0) -
          (parseDate(right.startDate)?.getTime() ?? 0)
      );

    const dueEquipment = typedEquipment
      .filter((item) => {
        const dueDate = parseDate(item.nextDueDate);
        return dueDate && dueDate <= nextFourteenDays && item.status === "Active";
      })
      .sort(
        (left, right) =>
          (parseDate(left.nextDueDate)?.getTime() ?? 0) -
          (parseDate(right.nextDueDate)?.getTime() ?? 0)
      );

    const submittedKpis = typedKpiRecords.filter((record) => record.status === "Submitted");

    const levelIIIVisitWatchlist = typedLevelIIIClients
      .filter((client) => {
        const nextVisit = parseDate(client.nextVisit);
        return nextVisit && nextVisit <= nextFourteenDays;
      })
      .sort(
        (left, right) =>
          (parseDate(left.nextVisit)?.getTime() ?? 0) -
          (parseDate(right.nextVisit)?.getTime() ?? 0)
      );

    const levelIIITechnicianWatchlist = typedLevelIIITechnicians
      .map((technician) => {
        const primaryDate = technician.hasPcnQualification
          ? parseDate(technician.pcnRenewalDate)
          : parseDate(technician.internalAssessmentDate);
        const eyeTestDate = parseDate(technician.eyeTestValidUntil);
        const client = typedLevelIIIClients.find((item) => item.id === technician.clientId);

        return {
          technician,
          clientName: client?.companyName || "Level III client",
          primaryDate,
          eyeTestDate,
        };
      })
      .filter(
        (item) =>
          (item.primaryDate && item.primaryDate <= nextThirtyDays) ||
          (item.eyeTestDate && item.eyeTestDate <= nextThirtyDays)
      )
      .sort((left, right) => {
        const leftDate =
          left.primaryDate?.getTime() ?? left.eyeTestDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDate =
          right.primaryDate?.getTime() ?? right.eyeTestDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      });

    const levelIIIEquipmentWatchlist = typedLevelIIIEquipment
      .filter((item) => {
        const nextDueDate = parseDate(item.nextDueDate);
        return nextDueDate && nextDueDate <= nextFourteenDays;
      })
      .sort(
        (left, right) =>
          (parseDate(left.nextDueDate)?.getTime() ?? 0) -
          (parseDate(right.nextDueDate)?.getTime() ?? 0)
      );

    const certificateWatchlist = typedCertificates
      .filter((certificate) => {
        const expiryDate = parseDate(certificate.expiryDate);
        return (
          certificate.status !== "Revoked" &&
          expiryDate &&
          expiryDate <= nextThirtyDays
        );
      })
      .sort(
        (left, right) =>
          (parseDate(left.expiryDate)?.getTime() ?? 0) -
          (parseDate(right.expiryDate)?.getTime() ?? 0)
      );

    const actionItems: DashboardAction[] = [];

    for (const reminder of typedLeadReminders) {
      actionItems.push({
        id: reminder.id,
        title: reminder.title,
        detail: `${reminder.leadName}${reminder.companyName ? ` - ${reminder.companyName}` : ""}`,
        dueDate: parseDate(reminder.dueDate),
        priority: getLeadReminderPriority(reminder.priority),
        path: "/leads",
        label: "CRM",
      });
    }

    for (const item of dueEquipment) {
      const dueDate = parseDate(item.nextDueDate);
      if (!dueDate) continue;

      actionItems.push({
        id: `equipment-${item.id}`,
        title: `Equipment calibration due: ${item.name}`,
        detail: item.serialNumber ? `Serial ${item.serialNumber}` : "Equipment register",
        dueDate,
        priority: dueDate < todayStart ? "critical" : dueDate <= nextSevenDays ? "high" : "normal",
        path: "/equipment",
        label: "Equipment",
      });
    }

    for (const occurrence of plannerUpcoming) {
      const dueDate = occurrence.reminderAt ?? occurrence.occurrenceDate;
      actionItems.push({
        id: occurrence.key,
        title: occurrence.source.title,
        detail: occurrence.source.notes || "Planner activity",
        dueDate,
        priority: dueDate < todayStart ? "critical" : isSameDay(dueDate, todayStart) ? "high" : "normal",
        path: "/planner",
        label: "Planner",
      });
    }

    if (submittedKpis.length > 0) {
      actionItems.push({
        id: "kpi-submitted",
        title: `${submittedKpis.length} KPI evaluation${submittedKpis.length === 1 ? "" : "s"} awaiting approval`,
        detail: "Review submitted lecturer evaluations and approve or reject them.",
        dueDate: parseDate(submittedKpis[0]?.evaluationDate ?? submittedKpis[0]?.createdAt),
        priority: submittedKpis.length >= 3 ? "critical" : "high",
        path: "/kpi",
        label: "KPI",
      });
    }

    for (const client of levelIIIVisitWatchlist) {
      const dueDate = parseDate(client.nextVisit);
      if (!dueDate) continue;

      actionItems.push({
        id: `leveliii-visit-${client.id}`,
        title: `Level III visit due: ${client.companyName}`,
        detail: "Client follow-up or visit is coming up.",
        dueDate,
        priority: dueDate < todayStart ? "critical" : dueDate <= nextSevenDays ? "high" : "normal",
        path: "/level-iii",
        label: "Level III",
      });
    }

    for (const item of levelIIITechnicianWatchlist.slice(0, 8)) {
      const dueDate = item.primaryDate ?? item.eyeTestDate;
      if (!dueDate) continue;

      actionItems.push({
        id: `leveliii-tech-${item.technician.id}`,
        title: `${item.technician.name} review due`,
        detail: `${item.clientName} | ${item.technician.hasPcnQualification ? "PCN renewal / certificate" : "Internal assessment"}${item.eyeTestDate ? " | Eye test tracked" : ""}`,
        dueDate,
        priority: dueDate < todayStart ? "critical" : dueDate <= nextSevenDays ? "high" : "normal",
        path: "/level-iii",
        label: "Technician",
      });
    }

    for (const certificate of certificateWatchlist) {
      const dueDate = parseDate(certificate.expiryDate);
      if (!dueDate) continue;

      actionItems.push({
        id: `certificate-${certificate.id}`,
        title: `Certificate expiry: ${certificate.certificateNumber}`,
        detail: "Training certificate is due to expire soon.",
        dueDate,
        priority: dueDate < todayStart ? "critical" : dueDate <= nextSevenDays ? "high" : "normal",
        path: "/students",
        label: "Certificate",
      });
    }

    const sortedActions = actionItems.sort((left, right) => {
      const priorityWeight = { critical: 0, high: 1, normal: 2 };
      const priorityDifference =
        priorityWeight[left.priority] - priorityWeight[right.priority];
      if (priorityDifference !== 0) return priorityDifference;

      return (
        (left.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (right.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER)
      );
    });

    return {
      today,
      openLeads,
      plannerToday,
      upcomingSchedules,
      dueEquipment,
      submittedKpis,
      levelIIIVisitWatchlist,
      levelIIITechnicianWatchlist,
      levelIIIEquipmentWatchlist,
      certificateWatchlist,
      actionItems: sortedActions,
      stats: {
        totalStudents: students.length,
        openLeads: openLeads.length,
        upcomingSchedules: upcomingSchedules.length,
        dueActions: sortedActions.length,
        activeCertificates: typedCertificates.filter((item) => item.status === "Active").length,
        equipmentDue: dueEquipment.length,
        availableSpecimens: typedSpecimens.filter((item) => item.status === "Available").length,
      },
    };
  }, [
    students.length,
    typedLeads,
    typedLeadReminders,
    typedCourses,
    typedSchedules,
    typedBranches,
    typedEquipment,
    typedSpecimens,
    typedPlannerEntries,
    typedKpiRecords,
    typedLevelIIIClients,
    typedLevelIIITechnicians,
    typedLevelIIIEquipment,
    typedCertificates,
  ]);

  const StatCard = ({
    icon: Icon,
    label,
    value,
    caption,
    color,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    caption: string;
    color: string;
  }) => (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
          <div className={cn("rounded-lg p-2", color)}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8 p-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Sign in with your email address and password to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              If you have not set a password yet, use the forgot password option on the sign-in page.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                const loginUrl = getLoginUrl();
                window.location.href = loginUrl;
              }}
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 text-white shadow-xl">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Badge className="bg-white/10 text-white hover:bg-white/10">
                {dashboardData.today.toLocaleDateString("en-ZA", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </Badge>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back, {user.name || "team"}.
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-200">
                  Your training centre snapshot is now focused on what needs attention first:
                  reminders, schedules, approvals, certificates, and Level III follow-ups.
                </p>
              </div>
              <p className="text-xs text-slate-300">TextPoint designed by A.Strydom</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                variant="secondary"
                className="justify-between"
                onClick={() => setLocation("/planner")}
              >
                Planner
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                className="justify-between"
                onClick={() => setLocation("/leads")}
              >
                Leads
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                className="justify-between"
                onClick={() => setLocation("/schedules")}
              >
                Schedules
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <StatCard
            icon={Users2}
            label="Students"
            value={dashboardData.stats.totalStudents}
            caption="Registered student records"
            color="bg-blue-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Open Leads"
            value={dashboardData.stats.openLeads}
            caption="CRM opportunities still active"
            color="bg-emerald-500"
          />
          <StatCard
            icon={CalendarClock}
            label="Upcoming Schedules"
            value={dashboardData.stats.upcomingSchedules}
            caption="Starting within the next 14 days"
            color="bg-indigo-500"
          />
          <StatCard
            icon={BellRing}
            label="Action Centre"
            value={dashboardData.stats.dueActions}
            caption="Overdue and upcoming work items"
            color="bg-amber-500"
          />
          <StatCard
            icon={Award}
            label="Active Certificates"
            value={dashboardData.stats.activeCertificates}
            caption="Current training certificates"
            color="bg-cyan-500"
          />
          <StatCard
            icon={Hammer}
            label="Equipment Due"
            value={dashboardData.stats.equipmentDue}
            caption="Calibration attention needed"
            color="bg-rose-500"
          />
          <StatCard
            icon={BookOpen}
            label="Specimens Available"
            value={dashboardData.stats.availableSpecimens}
            caption="Main training centre specimens"
            color="bg-teal-500"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Action Centre</CardTitle>
              <CardDescription>
                Priority work from CRM follow-ups, planner reminders, equipment calibration, KPI approvals, Level III reviews, and certificate expiry.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.actionItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No urgent actions are due right now.
                </div>
              ) : (
                dashboardData.actionItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getPriorityClasses(item.priority)}>
                          {getPriorityLabel(item.priority)}
                        </Badge>
                        <Badge variant="outline">{item.label}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.dueDate ? formatDateTime(item.dueDate) : "No due date"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setLocation(item.path)}>
                      Open
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Today At A Glance</CardTitle>
                <CardDescription>Quick read on the day’s workload.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Planner items today</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData.plannerToday.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">KPI approvals waiting</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData.submittedKpis.length}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Level III visits due</p>
                  <p className="mt-1 text-2xl font-bold">{dashboardData.levelIIIVisitWatchlist.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
                <CardDescription>Jump straight into the busy modules.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Students", path: "/students" },
                  { label: "Leads", path: "/leads" },
                  { label: "Planner", path: "/planner" },
                  { label: "KPI", path: "/kpi" },
                  { label: "Equipment", path: "/equipment" },
                  { label: "Level III", path: "/level-iii" },
                ].map((item) => (
                  <Button
                    key={item.path}
                    variant="outline"
                    className="justify-between"
                    onClick={() => setLocation(item.path)}
                  >
                    {item.label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Training Schedule</CardTitle>
              <CardDescription>Schedules starting within the next 14 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.upcomingSchedules.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No upcoming schedules in the next 14 days.
                </div>
              ) : (
                dashboardData.upcomingSchedules.slice(0, 8).map((schedule) => {
                  const startDate = parseDate(schedule.startDate);
                  return (
                    <div key={schedule.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{schedule.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {startDate ? `${daysUntil(startDate)} day${daysUntil(startDate) === 1 ? "" : "s"} to start` : "Date pending"}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">
                        {buildScheduleLabel(schedule, typedCourses, typedBranches)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Ends {formatDate(schedule.endDate)}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CRM Follow-Ups</CardTitle>
              <CardDescription>Lead activity and follow-up reminders due soon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {typedLeadReminders.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No CRM follow-ups are due in the next 14 days.
                </div>
              ) : (
                typedLeadReminders.slice(0, 8).map((reminder) => (
                  <div key={reminder.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getPriorityClasses(getLeadReminderPriority(reminder.priority))}>
                        {reminder.priority === "overdue"
                          ? "Overdue"
                          : reminder.priority === "today"
                            ? "Today"
                            : "Upcoming"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(reminder.dueDate)}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{reminder.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {reminder.leadName}
                      {reminder.companyName ? ` - ${reminder.companyName}` : ""}
                    </p>
                    {reminder.detail ? (
                      <p className="mt-1 text-sm text-muted-foreground">{reminder.detail}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Planner Focus</CardTitle>
              <CardDescription>Your private tasks, diary notes, and reminders for the next 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.plannerToday.length === 0 && dashboardData.actionItems.filter((item) => item.label === "Planner").length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No planner entries are due soon.
                </div>
              ) : (
                dashboardData.actionItems
                  .filter((item) => item.label === "Planner")
                  .slice(0, 8)
                  .map((item) => (
                    <div key={item.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getPriorityClasses(item.priority)}>
                          {getPriorityLabel(item.priority)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {item.dueDate ? formatDateTime(item.dueDate) : "No reminder"}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Level III & Certificates Watchlist</CardTitle>
              <CardDescription>
                Visits, technician reviews, Level III equipment, and training certificates that are due soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.levelIIIVisitWatchlist.length === 0 &&
              dashboardData.levelIIITechnicianWatchlist.length === 0 &&
              dashboardData.levelIIIEquipmentWatchlist.length === 0 &&
              dashboardData.certificateWatchlist.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  No Level III or certificate reminders are due soon.
                </div>
              ) : (
                <>
                  {dashboardData.levelIIIVisitWatchlist.slice(0, 3).map((client) => (
                    <div key={`visit-${client.id}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          <Shield className="mr-1 h-3 w-3" />
                          Visit
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(client.nextVisit)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{client.companyName}</p>
                      <p className="text-sm text-muted-foreground">Next Level III visit due.</p>
                    </div>
                  ))}

                  {dashboardData.levelIIITechnicianWatchlist.slice(0, 3).map((item) => (
                    <div key={`tech-${item.technician.id}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          <ClipboardCheck className="mr-1 h-3 w-3" />
                          Technician
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.primaryDate ?? item.eyeTestDate)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{item.technician.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.clientName} | {item.technician.hasPcnQualification ? "PCN" : "SNT-TC-1A / internal"}
                      </p>
                    </div>
                  ))}

                  {dashboardData.levelIIIEquipmentWatchlist.slice(0, 2).map((item) => (
                    <div key={`leveliii-equipment-${item.id}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          <Hammer className="mr-1 h-3 w-3" />
                          Level III Equipment
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.nextDueDate)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Serial {item.serialNumber}
                      </p>
                    </div>
                  ))}

                  {dashboardData.certificateWatchlist.slice(0, 3).map((certificate) => (
                    <div key={`certificate-${certificate.id}`} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getPriorityClasses(certificate.status === "Expired" ? "critical" : "high")}>
                          {certificate.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(certificate.expiryDate)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{certificate.certificateNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Training certificate expiry watchlist.
                      </p>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>
              Dashboard refreshes from live students, leads, planner, KPI, equipment, Level III, and certificate data.
            </span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/reports")}>
              Open Reports
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
