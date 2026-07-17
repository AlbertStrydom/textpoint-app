import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, Column } from "@/components/DataTable";
import { FormDialog, FormField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  ListChecks,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyId: number | null;
  contactId: number | null;
  companyName: string | null;
  idNumber: string | null;
  passportNumber: string | null;
  preferredContactMethod: string | null;
  methodInterested: string | null;
  interestedCourseId?: number | null;
  interestType: string | null;
  isCurrentPcnHolder: boolean;
  bindtProductCompleted: boolean;
  pcnNumber: string | null;
  followUpDate: string | Date | null;
  autoFollowUp: boolean;
  status: "New" | "Contacted" | "Qualified" | "Converted" | "Closed Lost";
  statusFlag: "Green" | "Amber" | "Red" | "Blacklisted";
  source: string | null;
  notes: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  duplicateWarning: boolean;
  duplicateNotes: string | null;
}

interface LeadActivity {
  id: number;
  leadId: number;
  userId: number | null;
  activityType: "Note" | "Call" | "Email" | "Meeting" | "Reminder" | "Task";
  subject: string | null;
  notes: string | null;
  dueDate: string | Date | null;
  completed: boolean;
  completedAt: string | Date | null;
  createdAt: string | Date;
}

interface LeadReminder {
  id: string;
  type: "followUp" | "activity";
  leadId: number;
  activityId?: number;
  activityType?: string;
  title: string;
  detail: string | null;
  leadName: string;
  companyName: string | null;
  dueDate: string | Date;
  priority: "overdue" | "today" | "upcoming";
}

interface Company {
  id: number;
  name: string;
  status: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
}

interface CompanyContact {
  id: number;
  companyId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  contactType: string;
}

type LeadContactChoice = {
  value: string;
  label: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyId: number | null;
  contactId?: number;
};

type LeadFollowUpFilter = "All" | "Overdue" | "Today" | "Next 7 Days" | "No Follow-Up";
type LeadView = "pipeline" | "calendar";

const UNLINKED_COMPANY_VALUE = "__unlinked_company__";
const UNLINKED_CONTACT_VALUE = "__unlinked_contact__";
const PRIMARY_CONTACT_PREFIX = "primary-company-contact:";

// FIX #8: Moved outside component to avoid recreation on every render
function getFlagColor(flag: Lead["statusFlag"]) {
  switch (flag) {
    case "Green":
      return "bg-green-100 text-green-800";
    case "Amber":
      return "bg-yellow-100 text-yellow-800";
    case "Red":
      return "bg-red-100 text-red-800";
    case "Blacklisted":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return false;
}

function normaliseIdLike(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function parseSelectId(value: unknown) {
  const raw = String(value ?? "");
  if (!/^\d+$/.test(raw)) return undefined;
  return Number(raw);
}

function splitContactName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function isOpenLead(lead: Lead) {
  return (
    lead.status !== "Converted" &&
    lead.status !== "Closed Lost" &&
    !lead.isBlacklisted
  );
}

function parseLeadDate(value: Lead["followUpDate"]) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatLeadDate(value: Lead["followUpDate"]) {
  const date = parseLeadDate(value);
  if (!date) return "-";

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatLeadDateForInput(value: Lead["followUpDate"]) {
  const date = parseLeadDate(value);
  if (!date) return "";

  return getLocalDateKey(date);
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysUntilFollowUp(lead: Lead, today: Date) {
  const followUpDate = parseLeadDate(lead.followUpDate);
  if (!followUpDate) return null;

  const followUpDay = startOfDay(followUpDate);
  return Math.round(
    (followUpDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getFollowUpLabel(lead: Lead, today: Date) {
  const daysUntil = getDaysUntilFollowUp(lead, today);
  if (daysUntil === null) return "No follow-up";
  if (daysUntil < 0) return `${Math.abs(daysUntil)} day(s) overdue`;
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil} days`;
}

function getFollowUpBadgeClass(lead: Lead, today: Date) {
  const daysUntil = getDaysUntilFollowUp(lead, today);
  if (daysUntil === null) return "bg-slate-100 text-slate-700";
  if (daysUntil < 0) return "bg-red-100 text-red-800";
  if (daysUntil === 0) return "bg-amber-100 text-amber-800";
  if (daysUntil <= 7) return "bg-blue-100 text-blue-800";
  return "bg-green-100 text-green-800";
}

function getActivityBadgeClass(activityType: LeadActivity["activityType"]) {
  switch (activityType) {
    case "Call":
      return "bg-emerald-100 text-emerald-800";
    case "Email":
      return "bg-blue-100 text-blue-800";
    case "Meeting":
      return "bg-purple-100 text-purple-800";
    case "Reminder":
      return "bg-amber-100 text-amber-800";
    case "Task":
      return "bg-cyan-100 text-cyan-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getReminderBadgeClass(priority: LeadReminder["priority"]) {
  switch (priority) {
    case "overdue":
      return "bg-red-100 text-red-800";
    case "today":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function getReminderLabel(priority: LeadReminder["priority"]) {
  switch (priority) {
    case "overdue":
      return "Overdue";
    case "today":
      return "Due today";
    default:
      return "Upcoming";
  }
}

function getReminderCardClass(priority: LeadReminder["priority"]) {
  switch (priority) {
    case "overdue":
      return "border-red-200 bg-red-50";
    case "today":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-blue-200 bg-blue-50";
  }
}

function getReminderTypeLabel(reminder: LeadReminder) {
  return reminder.type === "followUp"
    ? "Lead follow-up"
    : reminder.activityType || "Activity";
}

export default function LeadsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<LeadView>("pipeline");
  const [calendarRangeDays, setCalendarRangeDays] = useState<14 | 30>(14);
  const [statusFilter, setStatusFilter] = useState<Lead["status"] | "All">("All");
  const [followUpFilter, setFollowUpFilter] =
    useState<LeadFollowUpFilter>("All");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isActivityFormOpen, setIsActivityFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<LeadActivity | null>(null);
  const [isActivitySubmitting, setIsActivitySubmitting] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [liveIdNumber, setLiveIdNumber] = useState("");
  const [livePassportNumber, setLivePassportNumber] = useState("");
  const [debouncedIdNumber, setDebouncedIdNumber] = useState("");
  const [debouncedPassportNumber, setDebouncedPassportNumber] = useState("");
  const [liveInterestType, setLiveInterestType] = useState("");
  const [liveCurrentPcnHolder, setLiveCurrentPcnHolder] = useState("false");
  const [liveAutoFollowUp, setLiveAutoFollowUp] = useState("false");
  const [liveIsBlacklisted, setLiveIsBlacklisted] = useState("false");
  const [liveCompanyId, setLiveCompanyId] = useState("");
  const selectedCompanyId = parseSelectId(liveCompanyId);

  const { data: leads = [], isLoading, refetch } = trpc.leads.list.useQuery();
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: companies = [] } = trpc.companies.list.useQuery();
  const {
    data: reminders = [],
    isLoading: remindersLoading,
    refetch: refetchReminders,
  } = trpc.leads.reminders.useQuery(
    { daysAhead: 14 },
    { refetchOnWindowFocus: false }
  );
  const { data: companyContacts = [] } = trpc.companies.contacts.useQuery(
    { companyId: selectedCompanyId ?? 0 },
    {
      enabled: isFormOpen && Boolean(selectedCompanyId),
      refetchOnWindowFocus: false,
    }
  );
  const {
    data: calendarReminders = [],
    isLoading: calendarLoading,
    refetch: refetchCalendarReminders,
  } = trpc.leads.reminders.useQuery(
    { daysAhead: calendarRangeDays },
    { refetchOnWindowFocus: false }
  );

  const createMutation = trpc.leads.create.useMutation();
  const updateMutation = trpc.leads.update.useMutation();
  const deleteMutation = trpc.leads.delete.useMutation();
  const convertMutation = trpc.leads.convert.useMutation();
  const createActivityMutation = trpc.leads.createActivity.useMutation();
  const updateActivityMutation = trpc.leads.updateActivity.useMutation();
  const deleteActivityMutation = trpc.leads.deleteActivity.useMutation();
  const {
    data: selectedLeadActivities = [],
    isLoading: isActivitiesLoading,
    refetch: refetchActivities,
  } = trpc.leads.activities.useQuery(
    { leadId: selectedLead?.id ?? 0 },
    {
      enabled: Boolean(selectedLead),
      refetchOnWindowFocus: false,
    }
  );
  const today = useMemo(() => startOfDay(new Date()), []);
  const typedLeads = leads as Lead[];
  const typedReminders = reminders as LeadReminder[];
  const typedCalendarReminders = calendarReminders as LeadReminder[];
  const typedCompanies = companies as Company[];
  const typedCompanyContacts = companyContacts as CompanyContact[];
  const selectedCompanyForForm =
    typedCompanies.find((company) => company.id === selectedCompanyId) ?? null;

  const leadMetrics = useMemo(() => {
    const openLeads = typedLeads.filter(isOpenLead);
    const overdueLeads = openLeads.filter((lead) => {
      const daysUntil = getDaysUntilFollowUp(lead, today);
      return daysUntil !== null && daysUntil < 0;
    });
    const todayLeads = openLeads.filter(
      (lead) => getDaysUntilFollowUp(lead, today) === 0
    );
    const upcomingLeads = openLeads.filter((lead) => {
      const daysUntil = getDaysUntilFollowUp(lead, today);
      return daysUntil !== null && daysUntil > 0 && daysUntil <= 7;
    });
    const noFollowUpLeads = openLeads.filter(
      (lead) => getDaysUntilFollowUp(lead, today) === null
    );

    return {
      openLeads,
      overdueLeads,
      todayLeads,
      upcomingLeads,
      noFollowUpLeads,
      convertedLeads: typedLeads.filter((lead) => lead.status === "Converted"),
    };
  }, [typedLeads, today]);

  const filteredLeads = useMemo(() => {
    return typedLeads.filter((lead) => {
      if (statusFilter !== "All" && lead.status !== statusFilter) return false;
      if (followUpFilter !== "All" && !isOpenLead(lead)) return false;

      const daysUntil = getDaysUntilFollowUp(lead, today);
      if (followUpFilter === "Overdue") return daysUntil !== null && daysUntil < 0;
      if (followUpFilter === "Today") return daysUntil === 0;
      if (followUpFilter === "Next 7 Days") {
        return daysUntil !== null && daysUntil > 0 && daysUntil <= 7;
      }
      if (followUpFilter === "No Follow-Up") return daysUntil === null;

      return true;
    });
  }, [followUpFilter, statusFilter, today, typedLeads]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: calendarRangeDays }, (_, index) => {
      const date = addDays(today, index);
      const dateKey = getLocalDateKey(date);
      const entries = typedCalendarReminders
        .filter((reminder) => {
          if (reminder.priority === "overdue") return false;
          const dueDate = parseLeadDate(reminder.dueDate);
          return dueDate ? getLocalDateKey(dueDate) === dateKey : false;
        })
        .sort((a, b) => {
          const aTime = parseLeadDate(a.dueDate)?.getTime() ?? 0;
          const bTime = parseLeadDate(b.dueDate)?.getTime() ?? 0;
          return aTime - bTime;
        });

      return { date, dateKey, entries };
    });
  }, [calendarRangeDays, today, typedCalendarReminders]);

  const overdueCalendarReminders = useMemo(
    () =>
      typedCalendarReminders
        .filter((reminder) => reminder.priority === "overdue")
        .sort(
          (a, b) =>
            (parseLeadDate(a.dueDate)?.getTime() ?? 0) -
            (parseLeadDate(b.dueDate)?.getTime() ?? 0)
        ),
    [typedCalendarReminders]
  );

  // FIX #4: Guard against double-clicks using convertMutation.isPending
  const handleConvert = async (lead: Lead) => {
    if (convertMutation.isPending) return;
    if (!confirm(`Convert ${lead.firstName} ${lead.lastName} to a student?`)) {
      return;
    }

    try {
      await convertMutation.mutateAsync({ id: lead.id });
      toast.success("Lead converted to student");
      refetch();
      refetchCalendarReminders();
    } catch (err: unknown) {
      // FIX #6: Changed err: any to err: unknown
      const message = err instanceof Error ? err.message : "Conversion failed";
      toast.error(message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIdNumber(liveIdNumber.trim());
      setDebouncedPassportNumber(livePassportNumber.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [liveIdNumber, livePassportNumber]);

  const duplicateCheck = trpc.leads.checkDuplicate.useQuery(
    {
      idNumber: debouncedIdNumber || undefined,
      passportNumber: debouncedPassportNumber || undefined,
      excludeLeadId: editingLead?.id,
    },
    {
      enabled: isFormOpen && (!!debouncedIdNumber || !!debouncedPassportNumber),
      refetchOnWindowFocus: false,
    }
  );

  // FIX #7: Removed redundant `|| []` since courses already defaults to []
  const courseOptions = useMemo(
    () =>
      courses.map((course: any) => ({
        value: String(course.id),
        label: `${course.code ? `${course.code} - ` : ""}${course.name}`,
      })),
    [courses]
  );

  const companyOptions = useMemo(
    () => [
      { value: UNLINKED_COMPANY_VALUE, label: "No linked company" },
      ...typedCompanies.map((company) => ({
        value: String(company.id),
        label: company.name,
      })),
    ],
    [typedCompanies]
  );

  const leadContactChoices = useMemo<LeadContactChoice[]>(() => {
    const choices: LeadContactChoice[] = [];

    if (selectedCompanyForForm?.primaryContactName?.trim()) {
      const { firstName, lastName } = splitContactName(
        selectedCompanyForForm.primaryContactName
      );

      choices.push({
        value: `${PRIMARY_CONTACT_PREFIX}${selectedCompanyForForm.id}`,
        label: `${selectedCompanyForForm.primaryContactName} - Primary contact`,
        firstName,
        lastName,
        email: selectedCompanyForForm.primaryContactEmail,
        phone: selectedCompanyForForm.primaryContactPhone,
        companyId: selectedCompanyForForm.id,
      });
    }

    for (const contact of typedCompanyContacts) {
      choices.push({
        value: String(contact.id),
        label: `${contact.firstName} ${contact.lastName}${
          contact.position ? ` - ${contact.position}` : ""
        }`,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        companyId: contact.companyId,
        contactId: contact.id,
      });
    }

    return choices;
  }, [selectedCompanyForForm, typedCompanyContacts]);

  const contactOptions = useMemo(
    () => [
      { value: UNLINKED_CONTACT_VALUE, label: "No linked contact" },
      ...leadContactChoices.map((contact) => ({
        value: contact.value,
        label: contact.label,
      })),
    ],
    [leadContactChoices]
  );

  const baseFields: FormField[] = [
    { name: "firstName", label: "First Name", type: "text", required: true },
    { name: "lastName", label: "Last Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    {
      name: "companyId",
      label: "Existing Company",
      type: "select",
      options: companyOptions,
      placeholder: "Choose from Company Directory",
    },
    {
      name: "contactId",
      label: "Existing Contact",
      type: "select",
      options: contactOptions,
      placeholder: selectedCompanyId ? "Choose company contact" : "Select company first",
      disabled: !selectedCompanyId,
    },
    {
      name: "companyName",
      label: "Company Name",
      type: "text",
      placeholder: "Free text if not in Company Directory",
    },
    { name: "idNumber", label: "ID Number", type: "text" },
    { name: "passportNumber", label: "Passport Number", type: "text" },
    {
      name: "preferredContactMethod",
      label: "Preferred Contact Method",
      type: "select",
      options: [
        { value: "Phone", label: "Phone" },
        { value: "Email", label: "Email" },
        { value: "WhatsApp", label: "WhatsApp" },
      ],
      placeholder: "Select contact method",
    },
    {
      name: "interestedCourseId",
      label: "Course Interested In",
      type: "select",
      options: courseOptions,
      placeholder: "Select a course",
    },
    {
      name: "interestType",
      label: "Interest Type",
      type: "select",
      options: [
        { value: "SNT Only", label: "SNT Only" },
        { value: "PCN After Course", label: "PCN After Course" },
      ],
      placeholder: "Select interest type",
    },
  ];

  const pcnFields: FormField[] =
    liveInterestType === "PCN After Course"
      ? [
          {
            name: "isCurrentPcnHolder",
            label: "Current PCN Holder",
            type: "select",
            options: [
              { value: "false", label: "No" },
              { value: "true", label: "Yes" },
            ],
            placeholder: "Select an option",
          },
          {
            name: "pcnNumber",
            label: "PCN Number",
            type: "text",
            placeholder: "Capture the PCN number if available",
          },
          ...(liveCurrentPcnHolder === "true"
            ? []
            : [
                {
                  name: "bindtProductCompleted",
                  label: "BINDT Online Product Completed",
                  type: "select" as const,
                  options: [
                    { value: "false", label: "No" },
                    { value: "true", label: "Yes" },
                  ],
                  placeholder: "Select an option",
                },
              ]),
        ]
      : [];

  const tailFields: FormField[] = [
    { name: "followUpDate", label: "Follow-Up Date", type: "date" },
    {
      name: "autoFollowUp",
      label: "Auto Follow-Up",
      type: "select",
      options: [
        { value: "false", label: "No" },
        { value: "true", label: "Yes" },
      ],
      placeholder: "Select an option",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "New", label: "New" },
        { value: "Contacted", label: "Contacted" },
        { value: "Qualified", label: "Qualified" },
        { value: "Converted", label: "Converted" },
        { value: "Closed Lost", label: "Closed Lost" },
      ],
      placeholder: "Select status",
    },
    {
      name: "statusFlag",
      label: "Status Flag",
      type: "select",
      options: [
        { value: "Green", label: "Green" },
        { value: "Amber", label: "Amber" },
        { value: "Red", label: "Red" },
        { value: "Blacklisted", label: "Blacklisted" },
      ],
      placeholder: "Select flag",
    },
    { name: "source", label: "Source", type: "text" },
    { name: "notes", label: "Notes", type: "textarea" },
    {
      name: "isBlacklisted",
      label: "Blacklisted",
      type: "select",
      options: [
        { value: "false", label: "No" },
        { value: "true", label: "Yes" },
      ],
      placeholder: "Select an option",
    },
    ...(liveIsBlacklisted === "true"
      ? [
          {
            name: "blacklistReason",
            label: "Blacklist Reason",
            type: "textarea" as const,
            required: true,
          },
        ]
      : []),
  ];

  const formFields: FormField[] = [...baseFields, ...pcnFields, ...tailFields];

  const initialValues = useMemo(
    () =>
      editingLead
        ? {
            firstName: editingLead.firstName ?? "",
            lastName: editingLead.lastName ?? "",
            email: editingLead.email ?? "",
            phone: editingLead.phone ?? "",
            companyId: editingLead.companyId ? String(editingLead.companyId) : "",
            contactId: editingLead.contactId ? String(editingLead.contactId) : "",
            companyName: editingLead.companyName ?? "",
            idNumber: editingLead.idNumber ?? "",
            passportNumber: editingLead.passportNumber ?? "",
            preferredContactMethod: editingLead.preferredContactMethod ?? "",
            interestedCourseId: editingLead.interestedCourseId
              ? String(editingLead.interestedCourseId)
              : "",
            interestType: editingLead.interestType ?? "",
            isCurrentPcnHolder: String(Boolean(editingLead.isCurrentPcnHolder)),
            bindtProductCompleted: String(Boolean(editingLead.bindtProductCompleted)),
            pcnNumber: editingLead.pcnNumber ?? "",
            followUpDate: editingLead.followUpDate
              ? formatLeadDateForInput(editingLead.followUpDate)
              : "",
            autoFollowUp: String(Boolean(editingLead.autoFollowUp)),
            status: editingLead.status ?? "New",
            statusFlag: editingLead.statusFlag ?? "Green",
            source: editingLead.source ?? "",
            notes: editingLead.notes ?? "",
            isBlacklisted: String(Boolean(editingLead.isBlacklisted)),
            blacklistReason: editingLead.blacklistReason ?? "",
          }
        : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            companyId: "",
            contactId: "",
            companyName: "",
            idNumber: "",
            passportNumber: "",
            preferredContactMethod: "",
            interestedCourseId: "",
            interestType: "",
            isCurrentPcnHolder: "false",
            bindtProductCompleted: "false",
            pcnNumber: "",
            followUpDate: "",
            autoFollowUp: "false",
            status: "New",
            statusFlag: "Green",
            source: "",
            notes: "",
            isBlacklisted: "false",
            blacklistReason: "",
          },
    [editingLead]
  );

  // FIX #1: Use editingLead?.id instead of initialValues to avoid stale effect
  // when the form is already open and a different lead is selected for editing.
  useEffect(() => {
    if (isFormOpen) {
      setLiveIdNumber(initialValues.idNumber ?? "");
      setLivePassportNumber(initialValues.passportNumber ?? "");
      setLiveInterestType(initialValues.interestType ?? "");
      setLiveCurrentPcnHolder(initialValues.isCurrentPcnHolder ?? "false");
      setLiveAutoFollowUp(initialValues.autoFollowUp ?? "false");
      setLiveIsBlacklisted(initialValues.isBlacklisted ?? "false");
      setLiveCompanyId(initialValues.companyId ?? "");
    } else {
      setLiveIdNumber("");
      setLivePassportNumber("");
      setDebouncedIdNumber("");
      setDebouncedPassportNumber("");
      setLiveInterestType("");
      setLiveCurrentPcnHolder("false");
      setLiveAutoFollowUp("false");
      setLiveIsBlacklisted("false");
      setLiveCompanyId("");
    }
  }, [isFormOpen, editingLead?.id]); // ✅ tracks the specific lead being edited, not the whole initialValues object

  const activityFields: FormField[] = [
    {
      name: "activityType",
      label: "Activity Type",
      type: "select",
      required: true,
      options: [
        { value: "Note", label: "Note" },
        { value: "Call", label: "Call" },
        { value: "Email", label: "Email" },
        { value: "Meeting", label: "Meeting" },
        { value: "Reminder", label: "Reminder" },
        { value: "Task", label: "Task" },
      ],
    },
    { name: "subject", label: "Subject", type: "text", required: true },
    { name: "dueDate", label: "Reminder / Due Date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];

  const handleActivitySubmit = async (values: Record<string, unknown>) => {
    if (!selectedLead) return;

    setIsActivitySubmitting(true);
    setActivityError(null);

    try {
      const subject = cleanOptionalString(values.subject);
      if (!subject) {
        throw new Error("Subject is required.");
      }

      const payload = {
        activityType:
          (values.activityType as LeadActivity["activityType"]) || "Note",
        subject,
        notes: cleanOptionalString(values.notes) ?? null,
        dueDate: cleanOptionalString(values.dueDate) ?? null,
      };

      if (editingActivity) {
        await updateActivityMutation.mutateAsync({
          id: editingActivity.id,
          data: payload,
        });
        toast.success("Lead activity updated.");
      } else {
        await createActivityMutation.mutateAsync({
          leadId: selectedLead.id,
          ...payload,
        });
        toast.success("Lead activity added.");
      }

      await refetchActivities();
      await refetchReminders();
      await refetchCalendarReminders();
      setIsActivityFormOpen(false);
      setEditingActivity(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save lead activity.";
      setActivityError(message);
      toast.error(message);
    } finally {
      setIsActivitySubmitting(false);
    }
  };

  const handleToggleActivityComplete = async (activity: LeadActivity) => {
    try {
      await updateActivityMutation.mutateAsync({
        id: activity.id,
        data: { completed: !activity.completed },
      });
      await refetchActivities();
      await refetchReminders();
      await refetchCalendarReminders();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update activity.";
      toast.error(message);
    }
  };

  const handleCompleteReminder = async (reminder: LeadReminder) => {
    try {
      if (reminder.type === "activity" && reminder.activityId) {
        await updateActivityMutation.mutateAsync({
          id: reminder.activityId,
          data: { completed: true },
        });
        toast.success("Activity reminder completed.");
      } else {
        await updateMutation.mutateAsync({
          id: reminder.leadId,
          data: {
            autoFollowUp: false,
            followUpDate: null,
            status: "Contacted",
          },
        });
        toast.success("Lead follow-up completed.");
      }

      await refetch();
      await refetchActivities();
      await refetchReminders();
      await refetchCalendarReminders();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete reminder.";
      toast.error(message);
    }
  };

  const handleOpenReminderLead = (reminder: LeadReminder) => {
    const lead = typedLeads.find((item) => item.id === reminder.leadId);
    if (lead) {
      setSelectedLead(lead);
      setActiveView("pipeline");
    }
  };

  const handleEditActivity = (activity: LeadActivity) => {
    setEditingActivity(activity);
    setActivityError(null);
    setIsActivityFormOpen(true);
  };

  const handleDeleteActivity = async (activity: LeadActivity) => {
    if (!confirm(`Delete "${activity.subject || activity.activityType}" from this lead timeline?`)) {
      return;
    }

    try {
      await deleteActivityMutation.mutateAsync({ id: activity.id });
      toast.success("Lead activity deleted.");
      await refetchActivities();
      await refetchReminders();
      await refetchCalendarReminders();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete activity.";
      toast.error(message);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    const rawIdNumber = normaliseIdLike(values.idNumber);
    const rawPassportNumber = normaliseIdLike(values.passportNumber);

    if (rawIdNumber && rawPassportNumber) {
      const message = "Please capture either an ID number or a passport number, not both.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (duplicateCheck.data?.duplicate) {
      const message =
        "Duplicate blocked. A lead or student already exists with this ID number or passport number.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    // FIX #5: Guard against submitting before courses have loaded
    if (values.interestedCourseId && !courses.length) {
      const message = "Course list is still loading. Please wait a moment and try again.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    const selectedCourse =
      courses.find(
        (course: any) => String(course.id) === String(values.interestedCourseId || "")
      ) || null;

    const interestType = cleanOptionalString(values.interestType) as
      | "SNT Only"
      | "PCN After Course"
      | undefined;
    const selectedCompany =
      typedCompanies.find(
        (company) => String(company.id) === String(values.companyId || "")
      ) ?? null;
    const selectedContact =
      leadContactChoices.find(
        (contact) => contact.value === String(values.contactId || "")
      ) ?? null;
    const companyId = parseSelectId(values.companyId);
    const contactId = selectedContact?.contactId ?? parseSelectId(values.contactId);
    const isCurrentPcnHolder = parseBool(values.isCurrentPcnHolder);
    const isBlacklisted = parseBool(values.isBlacklisted);
    const autoFollowUp = parseBool(values.autoFollowUp);

    if (isBlacklisted && !cleanOptionalString(values.blacklistReason)) {
      const message = "Blacklist reason is required when the lead is blacklisted.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (autoFollowUp && !cleanOptionalString(values.followUpDate)) {
      const message = "Please select a follow-up date when Auto Follow-Up is set to Yes.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    const payload = {
      firstName: String(values.firstName || "").trim(),
      lastName: String(values.lastName || "").trim(),
      email: cleanOptionalString(values.email),
      phone: cleanOptionalString(values.phone),
      companyId: companyId ?? (editingLead ? null : undefined),
      contactId: contactId ?? (editingLead ? null : undefined),
      companyName: selectedCompany?.name ?? cleanOptionalString(values.companyName),
      idNumber: cleanOptionalString(values.idNumber),
      passportNumber: cleanOptionalString(values.passportNumber),
      preferredContactMethod: cleanOptionalString(values.preferredContactMethod) as
        | "Phone"
        | "Email"
        | "WhatsApp"
        | undefined,
      interestedCourseId: values.interestedCourseId
        ? Number(values.interestedCourseId)
        : undefined,
      methodInterested: selectedCourse?.name || undefined,
      interestType,
      isCurrentPcnHolder: interestType === "PCN After Course" ? isCurrentPcnHolder : false,
      bindtProductCompleted:
        interestType === "PCN After Course" && !isCurrentPcnHolder
          ? parseBool(values.bindtProductCompleted)
          : false,
      pcnNumber: cleanOptionalString(values.pcnNumber),
      followUpDate: autoFollowUp
        ? cleanOptionalString(values.followUpDate) || undefined
        : undefined,
      autoFollowUp,
      status: (values.status as Lead["status"]) || "New",
      statusFlag: isBlacklisted
        ? ("Blacklisted" as Lead["statusFlag"])
        : ((values.statusFlag as Lead["statusFlag"]) || "Green"),
      source: cleanOptionalString(values.source),
      notes: cleanOptionalString(values.notes),
      isBlacklisted,
      blacklistReason: isBlacklisted
        ? cleanOptionalString(values.blacklistReason)
        : undefined,
    };

    if (selectedContact) {
      payload.firstName = selectedContact.firstName;
      payload.lastName = selectedContact.lastName;
      payload.email = selectedContact.email ?? payload.email;
      payload.phone = selectedContact.phone ?? payload.phone;
    }

    try {
      if (editingLead) {
        await updateMutation.mutateAsync({ id: editingLead.id, data: payload });
        toast.success("Lead updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Lead created successfully.");
      }

      await refetch();
      await refetchReminders();
      await refetchCalendarReminders();
      setIsFormOpen(false);
      setEditingLead(null);
      setError(null);
    } catch (err: unknown) {
      let message =
        err instanceof Error ? err.message : "An unexpected error occurred.";

      if (typeof message === "string" && message.includes("Duplicate detected")) {
        message =
          "Duplicate blocked. A lead or student already exists with this ID number or passport number.";
      }

      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Are you sure you want to delete ${lead.firstName} ${lead.lastName}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: lead.id });
      toast.success("Lead deleted successfully.");
      await refetch();
      await refetchReminders();
      await refetchCalendarReminders();
      if (selectedLead?.id === lead.id) {
        setSelectedLead(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete lead.";
      toast.error(message);
    }
  };

  const columns: Column<Lead>[] = [
    { key: "firstName", label: "First Name", sortable: true },
    { key: "lastName", label: "Last Name", sortable: true },
    {
      key: "email",
      label: "Email",
      render: (value) => value || "—",
    },
    {
      key: "phone",
      label: "Phone",
      render: (value) => value || "—",
    },
    {
      key: "companyName",
      label: "Company",
      render: (value) => value || "—",
    },
    {
      key: "methodInterested",
      label: "Course Interested",
      render: (value) => value || "—",
    },
    {
      key: "status",
      label: "Status",
    },
    {
      key: "followUpDate",
      label: "Follow-Up",
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div>{formatLeadDate(row.followUpDate)}</div>
          <span
            className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getFollowUpBadgeClass(row, today)}`}
          >
            {getFollowUpLabel(row, today)}
          </span>
        </div>
      ),
    },
    {
      key: "statusFlag",
      label: "Flag",
      render: (value) => (
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getFlagColor(value)}`}
        >
          {value}
        </span>
      ),
    },
    {
      key: "duplicateWarning",
      label: "Duplicate Check",
      render: (value, row) =>
        value ? (
          <span
            className="inline-block px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800"
            title={row.duplicateNotes || "Possible duplicate detected"}
          >
            Warning
          </span>
        ) : (
          <span className="text-muted-foreground">Clear</span>
        ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leads CRM</h1>
            <p className="text-sm text-muted-foreground">
              Track prospects, follow-ups, reminders, status, and conversion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeView === "pipeline" ? "default" : "outline"}
              onClick={() => setActiveView("pipeline")}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Pipeline
            </Button>
            <Button
              variant={activeView === "calendar" ? "default" : "outline"}
              onClick={() => setActiveView("calendar")}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Calendar
            </Button>
            <Button
              onClick={() => {
                setEditingLead(null);
                setError(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setFollowUpFilter("Overdue")}
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-left transition hover:border-red-300 hover:bg-red-100"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-red-900">Overdue</p>
              <AlertTriangle className="h-4 w-4 text-red-700" />
            </div>
            <p className="mt-2 text-3xl font-bold text-red-900">
              {leadMetrics.overdueLeads.length}
            </p>
            <p className="mt-1 text-xs text-red-700">Needs immediate contact</p>
          </button>
          <button
            type="button"
            onClick={() => setFollowUpFilter("Today")}
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-300 hover:bg-amber-100"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-900">Due Today</p>
              <Clock className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-2 text-3xl font-bold text-amber-900">
              {leadMetrics.todayLeads.length}
            </p>
            <p className="mt-1 text-xs text-amber-700">Today's call list</p>
          </button>
          <button
            type="button"
            onClick={() => setFollowUpFilter("Next 7 Days")}
            className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-100"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">Next 7 Days</p>
              <CalendarDays className="h-4 w-4 text-blue-700" />
            </div>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              {leadMetrics.upcomingLeads.length}
            </p>
            <p className="mt-1 text-xs text-blue-700">Upcoming follow-ups</p>
          </button>
          <button
            type="button"
            onClick={() => setFollowUpFilter("No Follow-Up")}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">No Follow-Up</p>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">
              {leadMetrics.noFollowUpLeads.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open leads without a date
            </p>
          </button>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold">CRM Filters</h2>
              <p className="text-sm text-muted-foreground">
                Narrow the working list by status and follow-up timing.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as Lead["status"] | "All")
                  }
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="All">All statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Follow-Up</span>
                <select
                  value={followUpFilter}
                  onChange={(event) =>
                    setFollowUpFilter(event.target.value as LeadFollowUpFilter)
                  }
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="All">All follow-ups</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Today">Today</option>
                  <option value="Next 7 Days">Next 7 days</option>
                  <option value="No Follow-Up">No follow-up</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Flame className="h-4 w-4 text-red-600" />
                CRM Reminder Queue
              </h2>
              <p className="text-sm text-muted-foreground">
                Follow-ups and activity reminders due within the next 14 days.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetchReminders()}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {remindersLoading ? (
              <p className="text-sm text-muted-foreground">Loading reminders...</p>
            ) : typedReminders.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No CRM reminders are due in the next 14 days.
              </div>
            ) : (
              typedReminders.slice(0, 8).map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${getReminderBadgeClass(reminder.priority)}`}
                        >
                          {getReminderLabel(reminder.priority)}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {getReminderTypeLabel(reminder)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatLeadDate(reminder.dueDate)}
                        </span>
                      </div>
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {reminder.leadName}
                        {reminder.companyName ? ` - ${reminder.companyName}` : ""}
                      </p>
                      {reminder.detail ? (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {reminder.detail}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReminderLead(reminder)}
                      >
                        Open Lead
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleCompleteReminder(reminder)}
                        disabled={updateMutation.isPending || updateActivityMutation.isPending}
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {typedReminders.length > 8 ? (
              <p className="text-xs text-muted-foreground">
                Showing 8 of {typedReminders.length} reminders. Use the filters or calendar for the rest.
              </p>
            ) : null}
          </div>
        </div>

        {/* FIX #2: Error banner only shown outside the form dialog (i.e. after a failed
            delete or other page-level action). The FormDialog itself receives the error
            prop for submit-time errors, so we suppress this banner while the form is open
            to avoid showing the same message twice. */}
        {error && !isFormOpen ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isFormOpen ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Lead capture flow:</strong> capture identity and contact details first,
              then select the course and interest type, then complete follow-up and status.
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <strong>Identity rule:</strong> use either an ID number or a passport number.
              Do not fill in both.
            </div>

            {duplicateCheck.data?.duplicate ? (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 md:col-span-2">
                <strong>Duplicate detected.</strong>{" "}
                {duplicateCheck.data.leadMatch ? (
                  <>
                    Matching lead: {duplicateCheck.data.leadMatch.firstName}{" "}
                    {duplicateCheck.data.leadMatch.lastName} (Lead ID{" "}
                    {duplicateCheck.data.leadMatch.id})
                  </>
                ) : duplicateCheck.data.studentMatch ? (
                  <>
                    Matching student: {duplicateCheck.data.studentMatch.firstName}{" "}
                    {duplicateCheck.data.studentMatch.lastName} (Student ID{" "}
                    {duplicateCheck.data.studentMatch.id})
                  </>
                ) : (
                  <>A matching record already exists.</>
                )}{" "}
                Save will be blocked until the duplicate is removed.
              </div>
            ) : null}

            {liveInterestType === "PCN After Course" ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <strong>PCN path selected.</strong>{" "}
                {liveCurrentPcnHolder === "true"
                  ? "Current PCN holder selected, so BINDT online product completion is hidden."
                  : "This lead is not yet a current PCN holder, so BINDT online product completion must still be captured."}
              </div>
            ) : null}

            {liveAutoFollowUp === "true" ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <strong>Follow-up active.</strong> Make sure a follow-up date is selected
                before saving.
              </div>
            ) : null}

            {liveIsBlacklisted === "true" ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>Blacklisted lead.</strong> A blacklist reason is required and the
                status flag will be saved as <strong>Blacklisted</strong>.
              </div>
            ) : null}
          </div>
        ) : null}

        {editingLead?.duplicateWarning ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>Possible soft duplicate warning:</strong>{" "}
            {editingLead.duplicateNotes ||
              "This lead may match another lead by name, email, or phone."}
          </div>
        ) : null}

        {activeView === "calendar" ? (
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Follow-Up Calendar</h2>
                <p className="text-sm text-muted-foreground">
                  Quick view of follow-ups and CRM activities due over the next
                  {calendarRangeDays === 14 ? " two weeks." : " 30 days."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={calendarRangeDays === 14 ? "default" : "outline"}
                  onClick={() => setCalendarRangeDays(14)}
                >
                  14 Days
                </Button>
                <Button
                  size="sm"
                  variant={calendarRangeDays === 30 ? "default" : "outline"}
                  onClick={() => setCalendarRangeDays(30)}
                >
                  30 Days
                </Button>
                <Button variant="outline" onClick={() => refetchCalendarReminders()}>
                  Refresh
                </Button>
              </div>
            </div>

            {overdueCalendarReminders.length > 0 ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-red-900">Overdue CRM Actions</h3>
                    <p className="text-sm text-red-700">
                      These follow-ups are already overdue and need attention first.
                    </p>
                  </div>
                  <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                    {overdueCalendarReminders.length} overdue
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {overdueCalendarReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="rounded-lg border border-red-200 bg-white p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-1 text-xs font-semibold ${getReminderBadgeClass(reminder.priority)}`}
                        >
                          {getReminderLabel(reminder.priority)}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {getReminderTypeLabel(reminder)}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{reminder.leadName}</p>
                      <p className="text-xs text-muted-foreground">
                        {reminder.companyName || "No company"}
                      </p>
                      <p className="mt-2 text-sm">{reminder.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatLeadDate(reminder.dueDate)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleOpenReminderLead(reminder)}
                        >
                          Open
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleCompleteReminder(reminder)}
                          disabled={
                            updateMutation.isPending || updateActivityMutation.isPending
                          }
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
              {calendarLoading ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-7">
                  Loading calendar items...
                </div>
              ) : null}
              {calendarDays.map((day) => (
                <div
                  key={day.dateKey}
                  className="min-h-48 rounded-lg border bg-background p-3"
                >
                  <div className="mb-3">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {day.date.toLocaleDateString("en-ZA", { weekday: "short" })}
                    </p>
                    <p className="font-semibold">
                      {day.date.toLocaleDateString("en-ZA", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.entries.length} action{day.entries.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {day.entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No actions due</p>
                    ) : (
                      day.entries.map((reminder) => (
                        <div
                          key={reminder.id}
                          className={`rounded-md border p-2 text-left text-xs ${getReminderCardClass(
                            reminder.priority
                          )}`}
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 font-semibold ${getReminderBadgeClass(
                                reminder.priority
                              )}`}
                            >
                              {getReminderLabel(reminder.priority)}
                            </span>
                            <span className="rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-slate-700">
                              {getReminderTypeLabel(reminder)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenReminderLead(reminder)}
                            className="mt-2 text-left font-semibold underline-offset-2 hover:underline"
                          >
                            {reminder.leadName}
                          </button>
                          <div className="text-muted-foreground">
                            {reminder.companyName || "No company"}
                          </div>
                          <div className="mt-1 line-clamp-2">{reminder.title}</div>
                          <div className="mt-2 flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => handleOpenReminderLead(reminder)}
                            >
                              Open
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => handleCompleteReminder(reminder)}
                              disabled={
                                updateMutation.isPending || updateActivityMutation.isPending
                              }
                            >
                              Done
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredLeads}
            isLoading={isLoading}
            onRowClick={(lead) => setSelectedLead(lead)}
            actions={(lead: Lead) => (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLead(lead);
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                {lead.status !== "Converted" && (
                  <Button
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    // FIX #4: Disabled while a conversion is already in flight
                    disabled={convertMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvert(lead);
                    }}
                  >
                    Convert
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingLead(lead);
                    setError(null);
                    setIsFormOpen(true);
                  }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(lead);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          />
        )}

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">Lead Activity</h2>
              <p className="text-sm text-muted-foreground">
                {selectedLead
                  ? `Timeline for ${selectedLead.firstName} ${selectedLead.lastName}`
                  : "Select a lead from the pipeline to view or add CRM activity."}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={!selectedLead}
              onClick={() => {
                setEditingActivity(null);
                setActivityError(null);
                setIsActivityFormOpen(true);
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Activity
            </Button>
          </div>

          {selectedLead ? (
            <div className="mt-4 space-y-3">
              {isActivitiesLoading ? (
                <p className="text-sm text-muted-foreground">Loading activity...</p>
              ) : selectedLeadActivities.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No activity recorded yet. Add a note, call, email, meeting, reminder, or task.
                </div>
              ) : (
                (selectedLeadActivities as LeadActivity[]).map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-lg border bg-background p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${getActivityBadgeClass(activity.activityType)}`}
                          >
                            {activity.activityType}
                          </span>
                          {activity.completed ? (
                            <span className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Completed
                            </span>
                          ) : null}
                          {activity.dueDate ? (
                            <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                              Due {formatLeadDate(activity.dueDate)}
                            </span>
                          ) : null}
                        </div>
                        <p className="font-medium">
                          {activity.subject || "Untitled activity"}
                        </p>
                        {activity.notes ? (
                          <p className="text-sm text-muted-foreground">
                            {activity.notes}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          Logged {formatLeadDate(activity.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditActivity(activity)}
                          disabled={
                            isActivitySubmitting ||
                            updateActivityMutation.isPending ||
                            deleteActivityMutation.isPending
                          }
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteActivity(activity)}
                          disabled={
                            isActivitySubmitting ||
                            updateActivityMutation.isPending ||
                            deleteActivityMutation.isPending
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant={activity.completed ? "outline" : "default"}
                          onClick={() => handleToggleActivityComplete(activity)}
                          disabled={
                            updateActivityMutation.isPending ||
                            deleteActivityMutation.isPending
                          }
                        >
                          {activity.completed ? "Reopen" : "Complete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        <FormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingLead(null);
              setError(null);
            }
          }}
          title={editingLead ? "Edit Lead" : "Add New Lead"}
          description={
            editingLead ? "Update lead information" : "Create a new sales lead"
          }
          fields={formFields}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          normalizeValues={(values, change) => {
            if (change.name === "companyId") {
              if (change.value === UNLINKED_COMPANY_VALUE) {
                return {
                  ...values,
                  companyId: "",
                  contactId: "",
                };
              }

              const selectedCompany = typedCompanies.find(
                (company) => String(company.id) === String(change.value)
              );

              return selectedCompany
                ? {
                    ...values,
                    contactId: "",
                    companyName: selectedCompany.name,
                  }
                : { ...values, contactId: "" };
            }

            if (change.name === "contactId") {
              if (change.value === UNLINKED_CONTACT_VALUE) {
                return {
                  ...values,
                  contactId: "",
                };
              }

              const selectedContact = leadContactChoices.find(
                (contact) => contact.value === String(change.value)
              );

              return selectedContact
                ? {
                    ...values,
                    firstName: selectedContact.firstName,
                    lastName: selectedContact.lastName,
                    email: selectedContact.email ?? values.email ?? "",
                    phone: selectedContact.phone ?? values.phone ?? "",
                  }
                : values;
            }

            return values;
          }}
          isLoading={isSubmitting}
          error={error}
          submitLabel={editingLead ? "Update" : "Create"}
          onValuesChange={(values) => {
            setLiveIdNumber(String(values.idNumber || ""));
            setLivePassportNumber(String(values.passportNumber || ""));
            setLiveInterestType(String(values.interestType || ""));
            setLiveCurrentPcnHolder(String(values.isCurrentPcnHolder || "false"));
            setLiveAutoFollowUp(String(values.autoFollowUp || "false"));
            setLiveIsBlacklisted(String(values.isBlacklisted || "false"));
            setLiveCompanyId(String(values.companyId || ""));
          }}
        />

        <FormDialog
          open={isActivityFormOpen}
          onOpenChange={(open) => {
            setIsActivityFormOpen(open);
            if (!open) {
              setActivityError(null);
              setEditingActivity(null);
            }
          }}
          title={editingActivity ? "Edit Lead Activity" : "Add Lead Activity"}
          description={
            selectedLead
              ? editingActivity
                ? `Update the CRM activity for ${selectedLead.firstName} ${selectedLead.lastName}.`
                : `Record a CRM activity for ${selectedLead.firstName} ${selectedLead.lastName}.`
              : "Record a CRM activity."
          }
          fields={activityFields}
          initialValues={
            editingActivity
              ? {
                  activityType: editingActivity.activityType,
                  subject: editingActivity.subject ?? "",
                  dueDate: editingActivity.dueDate
                    ? formatLeadDateForInput(editingActivity.dueDate)
                    : "",
                  notes: editingActivity.notes ?? "",
                }
              : {
                  activityType: "Note",
                  subject: "",
                  dueDate: "",
                  notes: "",
                }
          }
          onSubmit={handleActivitySubmit}
          isLoading={isActivitySubmitting}
          error={activityError}
          submitLabel={editingActivity ? "Update Activity" : "Save Activity"}
        />
      </div>
    </DashboardLayout>
  );
}
