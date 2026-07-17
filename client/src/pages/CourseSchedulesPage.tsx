import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/DataTable";
import { FormDialog, FormField } from "@/components/FormDialog";
import { ImportDialog, type ImportDialogMeta, type ImportDialogResult } from "@/components/ImportDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus,
  Edit2,
  CalendarDays,
  ClipboardList,
  Layers3,
  List,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  calculateEndDateFromDuration,
  formatDateInputValue,
  parseDateInputValue,
} from "@shared/scheduling";
import { getMethodColorFromCourse, METHOD_FAMILY_COLOURS } from "@shared/methodColors";
import { Calendar, momentLocalizer, type View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/MaintenanceCalendar.css";

interface CourseSchedule {
  id: number;
  courseId: number;
  startDate: Date;
  endDate: Date;
  endOfCourseExamStartDate: Date | null;
  endOfCourseExamEndDate: Date | null;
  lecturerId: number | null;
  maxCapacity: number | null;
  enrolledCount?: number | null;
  branchId: number | null;
  courseStartPackConfig?: CourseStartPackConfig | null;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

interface CourseStartPackConfig {
  location?: string | null;
  industrySector?: string | null;
  sectorScope?: string | null;
  productOrEquipmentScope?: string | null;
  techniqueScope?: string | null;
  selectedEquipmentIds?: number[];
  selectedSpecimenIds?: number[];
  additionalEquipment?: string | null;
  additionalSpecimens?: string | null;
  safetyDeclaration?: string | null;
  lecturerNotes?: string | null;
}

interface CourseRecord {
  id: number;
  name: string;
  code?: string | null;
  duration: number | null;
}

interface LecturerRecord {
  id: number;
  firstName: string;
  lastName: string;
  branchId: number | null;
  active?: boolean;
}

interface BranchRecord {
  id: number;
  name: string;
}

interface EquipmentRecord {
  id: number;
  name: string;
  serialNumber: string | null;
  branchId: number | null;
}

interface SpecimenRecord {
  id: number;
  name: string;
  serialNumber: string | null;
  branchId: number | null;
}

interface MethodRecord {
  id: number;
  name: string;
  color: string | null;
}

type GeneratedStatus = "Draft" | "Issued" | "Corrected" | "Superseded";

type DocumentMetadata = {
  kind?: "library" | "template" | "generated";
  templateCategory?: string;
  templateStatus?: string;
  generatedStatus?: GeneratedStatus;
  generatedFromTemplateTitle?: string;
  sourceType?: string;
  scheduleId?: number;
  version?: number;
};

interface DocumentRecord {
  id: number;
  title: string;
  tags: DocumentMetadata | null;
  createdAt: string | Date;
}

type ScheduleViewMode = "list" | "calendar";

type ScheduleCalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: {
    schedule: CourseSchedule;
    branchName: string;
    courseLabel: string;
    courseFamily: string;
    methodColor: string;
    lecturerName: string;
    examLabel: string;
  };
};

const calendarLocalizer = momentLocalizer(moment);

function addCalendarDay(dateValue: Date | string) {
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + 1);
  return nextDate;
}

function getScheduleStatusClass(status: CourseSchedule["status"]) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100";
    case "In Progress":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "Cancelled":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100";
    case "Scheduled":
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
  }
}

function getScheduleCalendarEventStyles(
  methodColor: string,
  status: CourseSchedule["status"]
) {
  const opacity =
    status === "Cancelled" ? 0.45 : status === "Completed" ? 0.72 : 0.96;
  const darkTextColors = new Set([
    METHOD_FAMILY_COLOURS.RT.toLowerCase(),
    METHOD_FAMILY_COLOURS.WT.toLowerCase(),
  ]);
  const normalizedColor = methodColor.toLowerCase();

  return {
    backgroundColor: methodColor,
    borderColor: status === "In Progress" ? "#111827" : methodColor,
    color: darkTextColors.has(normalizedColor) ? "#111827" : "#ffffff",
    opacity,
    textDecoration: status === "Cancelled" ? "line-through" : "none",
  };
}

function formatOptionalDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
) {
  if (!startDate && !endDate) return "-";

  const startLabel = startDate ? new Date(startDate).toLocaleDateString() : "";
  const endLabel = endDate ? new Date(endDate).toLocaleDateString() : "";

  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} to ${endLabel}`;
  }

  return startLabel || endLabel || "-";
}

function buildScheduleInitialValues(schedule?: CourseSchedule | null) {
  if (!schedule) {
    return { status: "Scheduled" };
  }

  return {
    ...schedule,
    courseId: String(schedule.courseId),
    branchId: schedule.branchId ? String(schedule.branchId) : "",
    lecturerId: schedule.lecturerId ? String(schedule.lecturerId) : "",
    startDate: schedule.startDate ? formatDateInputValue(schedule.startDate) : "",
    endDate: schedule.endDate ? formatDateInputValue(schedule.endDate) : "",
    endOfCourseExamStartDate: schedule.endOfCourseExamStartDate
      ? formatDateInputValue(schedule.endOfCourseExamStartDate)
      : "",
    endOfCourseExamEndDate: schedule.endOfCourseExamEndDate
      ? formatDateInputValue(schedule.endOfCourseExamEndDate)
      : "",
    maxCapacity: schedule.maxCapacity ? String(schedule.maxCapacity) : "",
  };
}

function buildCourseStartPackInitialValues(schedule?: CourseSchedule | null) {
  const config = schedule?.courseStartPackConfig || null;
  return {
    location: config?.location || "",
    industrySector: config?.industrySector || "",
    sectorScope: config?.sectorScope || "",
    productOrEquipmentScope: config?.productOrEquipmentScope || "",
    techniqueScope: config?.techniqueScope || "",
    selectedEquipmentIds: Array.isArray(config?.selectedEquipmentIds)
      ? config?.selectedEquipmentIds.map(String)
      : [],
    selectedSpecimenIds: Array.isArray(config?.selectedSpecimenIds)
      ? config?.selectedSpecimenIds.map(String)
      : [],
    additionalEquipment: config?.additionalEquipment || "",
    additionalSpecimens: config?.additionalSpecimens || "",
    safetyDeclaration: config?.safetyDeclaration || "",
    lecturerNotes: config?.lecturerNotes || "",
  };
}

function getDocumentMetadata(tags: DocumentRecord["tags"]) {
  return tags && typeof tags === "object" ? tags : {};
}

function getGeneratedStatusClass(status: GeneratedStatus) {
  switch (status) {
    case "Issued":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "Corrected":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "Superseded":
      return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100";
    case "Draft":
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
  }
}

export default function CourseSchedulesPage() {
  const [branchFilter, setBranchFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("list");
  const [calendarView, setCalendarView] = useState<View>("month");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);
  const [selectedScheduleForDocument, setSelectedScheduleForDocument] =
    useState<CourseSchedule | null>(null);
  const [selectedScheduleForPackSetup, setSelectedScheduleForPackSetup] =
    useState<CourseSchedule | null>(null);
  const [isGenerateDocumentOpen, setIsGenerateDocumentOpen] = useState(false);
  const [isGeneratePackOpen, setIsGeneratePackOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [isCourseStartPackOpen, setIsCourseStartPackOpen] = useState(false);
  const [isSavingCourseStartPack, setIsSavingCourseStartPack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});

  const scheduleQueryInput =
    branchFilter === "all" ? undefined : { branchId: Number(branchFilter) };
  const { data: schedules = [], isLoading, refetch } =
    trpc.courseSchedules.list.useQuery(scheduleQueryInput);
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: lecturers = [] } = trpc.lecturers.list.useQuery();
  const { data: methods = [] } = trpc.lecturers.methods.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: equipment = [] } = trpc.equipment.list.useQuery();
  const { data: specimens = [] } = trpc.specimens.list.useQuery();
  const { data: documents = [], refetch: refetchDocuments } = trpc.documents.list.useQuery();

  const createMutation = trpc.courseSchedules.create.useMutation();
  const importMutation = trpc.courseSchedules.import.useMutation();
  const updateMutation = trpc.courseSchedules.update.useMutation();
  const deleteMutation = trpc.courseSchedules.delete.useMutation();
  const generateScheduleDocumentMutation =
    trpc.documents.generateFromScheduleTemplate.useMutation();
  const generateSchedulePackMutation = trpc.documents.generateSchedulePack.useMutation();

  const courseList = courses as CourseRecord[];
  const lecturerList = lecturers as LecturerRecord[];
  const methodList = methods as MethodRecord[];
  const branchList = branches as BranchRecord[];
  const equipmentList = equipment as EquipmentRecord[];
  const specimenList = specimens as SpecimenRecord[];
  const scheduleList = schedules as CourseSchedule[];
  const documentList = documents as DocumentRecord[];

  const selectedBranchId = formValues.branchId ? Number(formValues.branchId) : null;
  const selectedCourseId = formValues.courseId ? Number(formValues.courseId) : null;
  const selectedCourse = courseList.find((course) => course.id === selectedCourseId) ?? null;
  const shouldAutoCalculateEndDate =
    Boolean(formValues.startDate) && Boolean(selectedCourse?.duration && selectedCourse.duration > 0);
  const selectedPackBranchId = selectedScheduleForPackSetup?.branchId ?? null;
  const packEquipmentOptions = useMemo(
    () =>
      equipmentList
        .filter((item) => !selectedPackBranchId || item.branchId === selectedPackBranchId)
        .map((item) => ({
          value: String(item.id),
          label: item.serialNumber ? `${item.name} | ${item.serialNumber}` : item.name,
        })),
    [equipmentList, selectedPackBranchId]
  );
  const packSpecimenOptions = useMemo(
    () =>
      specimenList
        .filter((item) => !selectedPackBranchId || item.branchId === selectedPackBranchId)
        .map((item) => ({
          value: String(item.id),
          label: item.serialNumber ? `${item.name} | ${item.serialNumber}` : item.name,
        })),
    [selectedPackBranchId, specimenList]
  );
  const configuredCourseStartPackCount = useMemo(
    () =>
      scheduleList.filter((schedule) => {
        const config = schedule.courseStartPackConfig;
        return Boolean(
          config &&
            (config.location ||
              config.industrySector ||
              config.sectorScope ||
              config.productOrEquipmentScope ||
              config.techniqueScope ||
              config.additionalEquipment ||
              config.additionalSpecimens ||
              config.safetyDeclaration ||
              config.lecturerNotes ||
              (Array.isArray(config.selectedEquipmentIds) && config.selectedEquipmentIds.length > 0) ||
              (Array.isArray(config.selectedSpecimenIds) && config.selectedSpecimenIds.length > 0))
        );
      }).length,
    [scheduleList]
  );

  const courseOptions = courseList.map((course) => ({
    value: String(course.id),
    label: course.duration ? `${course.name} (${course.duration} work days)` : course.name,
  }));
  const formBranchOptions = branchList.map((branch) => ({
    value: String(branch.id),
    label: branch.name,
  }));
  const branchFilterOptions = [
    { value: "all", label: "All branches" },
    ...branchList.map((branch) => ({
      value: String(branch.id),
      label: branch.name,
    })),
  ];
  const selectedBranchFilterLabel =
    branchFilterOptions.find((option) => option.value === branchFilter)?.label || "All branches";

  const eligibleLecturers = useMemo(
    () =>
      lecturerList.filter((lecturer) => {
        if (!selectedBranchId) return false;
        if (lecturer.active === false) return false;
        return lecturer.branchId === selectedBranchId;
      }),
    [lecturerList, selectedBranchId]
  );

  const lecturerOptions = eligibleLecturers.map((lecturer) => ({
    value: String(lecturer.id),
    label: `${lecturer.firstName} ${lecturer.lastName}`,
  }));

  const activeTemplateRecords = useMemo(
    () =>
      documentList.filter((record) => {
        const metadata = getDocumentMetadata(record.tags);
        return metadata.kind === "template" && metadata.templateStatus !== "Archived";
      }),
    [documentList]
  );

  const lecturerTemplateRecords = useMemo(
    () =>
      activeTemplateRecords.filter((record) => {
        const metadata = getDocumentMetadata(record.tags);
        return metadata.templateCategory === "Lecturer Pack";
      }),
    [activeTemplateRecords]
  );

  const scheduleDocumentTemplateOptions = useMemo(
    () =>
      (lecturerTemplateRecords.length > 0 ? lecturerTemplateRecords : activeTemplateRecords).map(
        (record) => {
          const metadata = getDocumentMetadata(record.tags);
          return {
            value: String(record.id),
            label: `${record.title} | ${metadata.templateCategory || "General"}`,
          };
        }
      ),
    [activeTemplateRecords, lecturerTemplateRecords]
  );

  const generatedScheduleDocuments = useMemo(
    () =>
      documentList.filter((record) => {
        const metadata = getDocumentMetadata(record.tags);
        return metadata.kind === "generated" && metadata.sourceType === "schedule";
      }),
    [documentList]
  );

  const scheduleCalendarEvents = useMemo<ScheduleCalendarEvent[]>(
    () =>
      scheduleList.map((schedule) => {
        const course = courseList.find((item) => item.id === schedule.courseId);
        const branch = branchList.find((item) => item.id === schedule.branchId);
        const lecturer = lecturerList.find((item) => item.id === schedule.lecturerId);
        const courseLabel = course?.code ? `${course.code} - ${course.name}` : course?.name || "Course";
        const methodColor = getMethodColorFromCourse(course?.code, course?.name, methodList);
        const lecturerName = lecturer
          ? `${lecturer.firstName} ${lecturer.lastName}`
          : "No lecturer assigned";
        const examLabel = formatOptionalDateRange(
          schedule.endOfCourseExamStartDate,
          schedule.endOfCourseExamEndDate
        );

        return {
          title: courseLabel,
          start: new Date(schedule.startDate),
          end: addCalendarDay(schedule.endDate),
          allDay: true,
          resource: {
            schedule,
            branchName: branch?.name || "-",
            courseLabel,
            courseFamily: methodColor.family,
            methodColor: methodColor.color,
            lecturerName,
            examLabel,
          },
        };
      }),
    [branchList, courseList, lecturerList, methodList, scheduleList]
  );

  const calendarLegend = useMemo(() => {
    const entries = new Map<string, { label: string; color: string }>();
    for (const event of scheduleCalendarEvents) {
      if (!entries.has(event.resource.courseFamily)) {
        entries.set(event.resource.courseFamily, {
          label: event.resource.courseFamily,
          color: event.resource.methodColor,
        });
      }
    }
    return Array.from(entries.values());
  }, [scheduleCalendarEvents]);

  const formFields: FormField[] = [
    {
      name: "courseId",
      label: "Course",
      type: "select",
      required: true,
      options: courseOptions,
      placeholder: "Select Course",
    },
    {
      name: "branchId",
      label: "Branch",
      type: "select",
      required: true,
      options: formBranchOptions,
      placeholder: "Select Branch",
    },
    {
      name: "lecturerId",
      label: "Lecturer",
      type: "select",
      options: lecturerOptions,
      placeholder: selectedBranchId ? "Select Lecturer" : "Select Branch First",
      disabled: !selectedBranchId,
    },
    { name: "startDate", label: "Start Date", type: "date", required: true },
    {
      name: "endDate",
      label: shouldAutoCalculateEndDate
        ? "End Date / Final Exam Day (Auto-calculated)"
        : "End Date / Final Exam Day",
      type: "date",
      required: true,
      disabled: shouldAutoCalculateEndDate,
    },
    {
      name: "endOfCourseExamStartDate",
      label: "End-of-Course Exam Start",
      type: "date",
      section: "Assessment & Close-out",
    },
    {
      name: "endOfCourseExamEndDate",
      label: "End-of-Course Exam End",
      type: "date",
    },
    { name: "maxCapacity", label: "Max Capacity", type: "number", placeholder: "e.g. 20" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Scheduled", label: "Scheduled" },
        { value: "In Progress", label: "In Progress" },
        { value: "Completed", label: "Completed" },
        { value: "Cancelled", label: "Cancelled" },
      ],
    },
  ];

  const handleCreateNew = () => {
    setEditingSchedule(null);
    setError(null);
    setFormValues({ status: "Scheduled" });
    setIsFormOpen(true);
  };

  const handleEdit = (schedule: CourseSchedule) => {
    setEditingSchedule(schedule);
    setError(null);
    setFormValues(buildScheduleInitialValues(schedule));
    setIsFormOpen(true);
  };

  const handleOpenGenerateDocument = (schedule: CourseSchedule) => {
    setSelectedScheduleForDocument(schedule);
    setIsGenerateDocumentOpen(true);
  };

  const handleOpenGeneratePack = (schedule: CourseSchedule) => {
    setSelectedScheduleForDocument(schedule);
    setIsGeneratePackOpen(true);
  };

  const handleOpenCourseStartPackSetup = (schedule: CourseSchedule) => {
    setSelectedScheduleForPackSetup(schedule);
    setIsCourseStartPackOpen(true);
  };

  const handleDelete = async (schedule: CourseSchedule) => {
    if (!confirm("Are you sure you want to delete this schedule?")) return;
    try {
      await deleteMutation.mutateAsync({ id: String(schedule.id) });
      toast.success("Schedule deleted");
      refetch();
    } catch {
      toast.error("Failed to delete schedule");
    }
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const branchId = data.branchId ? parseInt(String(data.branchId), 10) : null;
      const startDate = parseDateInputValue(String(data.startDate));
      const endDate = parseDateInputValue(String(data.endDate));
      const payload = {
        courseId: parseInt(String(data.courseId), 10),
        lecturerId: data.lecturerId ? parseInt(String(data.lecturerId), 10) : null,
        branchId,
        startDate,
        endDate,
        endOfCourseExamStartDate: data.endOfCourseExamStartDate
          ? parseDateInputValue(String(data.endOfCourseExamStartDate))
          : data.endOfCourseExamEndDate
          ? parseDateInputValue(String(data.endOfCourseExamEndDate))
          : null,
        endOfCourseExamEndDate: data.endOfCourseExamEndDate
          ? parseDateInputValue(String(data.endOfCourseExamEndDate))
          : data.endOfCourseExamStartDate
          ? parseDateInputValue(String(data.endOfCourseExamStartDate))
          : null,
        maxCapacity: data.maxCapacity ? parseInt(String(data.maxCapacity), 10) : undefined,
        status: data.status as CourseSchedule["status"],
      };

      if (!payload.branchId) {
        const msg = "Branch is required for schedules.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (payload.maxCapacity !== undefined && payload.maxCapacity < 1) {
        const msg = "Max Capacity must be at least 1.";
        setError(msg);
        toast.error(msg);
        return;
      }

      if (editingSchedule) {
        await updateMutation.mutateAsync({ id: editingSchedule.id, data: payload });
        toast.success("Schedule updated");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Schedule created");
      }

      refetch();
      setIsFormOpen(false);
      setEditingSchedule(null);
      setFormValues({});
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save schedule";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateScheduleDocument = async (data: Record<string, unknown>) => {
    if (!selectedScheduleForDocument) {
      toast.error("Please select a schedule first.");
      return;
    }

    setIsGeneratingDocument(true);

    try {
      const templateId = Number(data.templateId);
      if (!Number.isFinite(templateId)) {
        throw new Error("Please select a template.");
      }

      await generateScheduleDocumentMutation.mutateAsync({
        templateId,
        scheduleId: selectedScheduleForDocument.id,
        titleOverride:
          typeof data.titleOverride === "string" && data.titleOverride.trim()
            ? data.titleOverride.trim()
            : null,
        descriptionOverride:
          typeof data.descriptionOverride === "string" && data.descriptionOverride.trim()
            ? data.descriptionOverride.trim()
            : null,
        generatedStatus: String(data.generatedStatus || "Draft") as GeneratedStatus,
      });

      toast.success("Schedule document generated.");
      setIsGenerateDocumentOpen(false);
      setSelectedScheduleForDocument(null);
      await refetchDocuments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate document";
      toast.error(msg);
    } finally {
      setIsGeneratingDocument(false);
    }
  };

  const handleGenerateSchedulePack = async (data: Record<string, unknown>) => {
    if (!selectedScheduleForDocument) {
      toast.error("Please select a schedule first.");
      return;
    }

    setIsGeneratingPack(true);

    try {
      const result = await generateSchedulePackMutation.mutateAsync({
        scheduleId: selectedScheduleForDocument.id,
        generatedStatus: String(data.generatedStatus || "Draft") as GeneratedStatus,
      });

      toast.success(`${result.count} lecturer-pack documents generated.`);
      setIsGeneratePackOpen(false);
      setSelectedScheduleForDocument(null);
      await refetchDocuments();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate lecturer pack";
      toast.error(msg);
    } finally {
      setIsGeneratingPack(false);
    }
  };

  const handleSaveCourseStartPack = async (data: Record<string, unknown>) => {
    if (!selectedScheduleForPackSetup) {
      toast.error("Please select a schedule first.");
      return;
    }

    setIsSavingCourseStartPack(true);

    try {
      await updateMutation.mutateAsync({
        id: selectedScheduleForPackSetup.id,
        data: {
          courseStartPackConfig: {
            location: String(data.location ?? "").trim() || null,
            industrySector: String(data.industrySector ?? "").trim() || null,
            sectorScope: String(data.sectorScope ?? "").trim() || null,
            productOrEquipmentScope: String(data.productOrEquipmentScope ?? "").trim() || null,
            techniqueScope: String(data.techniqueScope ?? "").trim() || null,
            selectedEquipmentIds: Array.isArray(data.selectedEquipmentIds)
              ? data.selectedEquipmentIds
                  .map((value) => Number(value))
                  .filter((value) => Number.isInteger(value) && value > 0)
              : [],
            selectedSpecimenIds: Array.isArray(data.selectedSpecimenIds)
              ? data.selectedSpecimenIds
                  .map((value) => Number(value))
                  .filter((value) => Number.isInteger(value) && value > 0)
              : [],
            additionalEquipment: String(data.additionalEquipment ?? "").trim() || null,
            additionalSpecimens: String(data.additionalSpecimens ?? "").trim() || null,
            safetyDeclaration: String(data.safetyDeclaration ?? "").trim() || null,
            lecturerNotes: String(data.lecturerNotes ?? "").trim() || null,
          },
        },
      });
      toast.success("Course-start pack settings saved.");
      setIsCourseStartPackOpen(false);
      setSelectedScheduleForPackSetup(null);
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save course-start pack settings";
      toast.error(msg);
    } finally {
      setIsSavingCourseStartPack(false);
    }
  };

  const handleImportSchedules = async (
    rows: Record<string, unknown>[],
    meta: ImportDialogMeta
  ): Promise<ImportDialogResult> => {
    const importResult = await importMutation.mutateAsync({
      records: rows,
      defaults: {
        branchId: branchFilter === "all" ? null : Number(branchFilter),
        status: "Scheduled",
      },
      importMeta: {
        fileName: meta.fileName,
        columnMapping: meta.columnMapping,
      },
    });

    await refetch();

    if (importResult.successCount === 0 && importResult.failureCount > 0) {
      throw new Error(importResult.errors[0] || "No schedules were imported.");
    }

    if (importResult.failureCount > 0 && importResult.errors.length > 0) {
      toast.error(importResult.errors[0]);
    }

    const messageParts = [
      `${importResult.successCount} schedule(s) processed`,
      importResult.createdCount > 0 ? `${importResult.createdCount} created` : null,
      importResult.updatedCount > 0 ? `${importResult.updatedCount} updated` : null,
      importResult.skippedCount > 0 ? `${importResult.skippedCount} unchanged` : null,
      importResult.failureCount > 0 ? `${importResult.failureCount} needing attention` : null,
    ].filter(Boolean);

    return {
      successCount: importResult.successCount,
      failureCount: importResult.failureCount,
      message: messageParts.join(" | "),
    };
  };

  const columns: Column<CourseSchedule>[] = [
    {
      key: "courseId",
      label: "Course",
      render: (value) => courseList.find((course) => course.id === value)?.name || String(value),
    },
    {
      key: "branchId",
      label: "Branch",
      render: (value) => branchList.find((branch) => branch.id === value)?.name || "-",
    },
    {
      key: "lecturerId",
      label: "Lecturer",
      render: (value) => {
        const lecturer = lecturerList.find((item) => item.id === value);
        return lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : "-";
      },
    },
    {
      key: "startDate",
      label: "Start",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "endDate",
      label: "End / Final",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant="secondary" className={getScheduleStatusClass(value as CourseSchedule["status"])}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "endOfCourseExamStartDate",
      label: "Exam",
      render: (_value, row) =>
        formatOptionalDateRange(row.endOfCourseExamStartDate, row.endOfCourseExamEndDate),
    },
    {
      key: "enrolledCount",
      label: "Seats",
      render: (_value, row) => {
        const max = row.maxCapacity ?? 0;
        const used = row.enrolledCount ?? 0;
        const available = max - used;

        if (max === 0) return <span>-</span>;
        if (available <= 0) return <span className="text-red-600 font-semibold">Full</span>;
        if (available <= 3) return <span className="text-amber-600">{available} left</span>;
        return <span className="text-green-600">{available} available</span>;
      },
    },
    {
      key: "courseStartPackConfig",
      label: "Start Pack",
      render: (_value, row) => {
        const config = row.courseStartPackConfig;
        const configured = Boolean(
          config &&
            (config.location ||
              config.industrySector ||
              config.sectorScope ||
              config.productOrEquipmentScope ||
              config.techniqueScope ||
              config.additionalEquipment ||
              config.additionalSpecimens ||
              config.safetyDeclaration ||
              config.lecturerNotes ||
              (Array.isArray(config.selectedEquipmentIds) && config.selectedEquipmentIds.length > 0) ||
              (Array.isArray(config.selectedSpecimenIds) && config.selectedSpecimenIds.length > 0))
        );

        return configured ? (
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
            Configured
          </Badge>
        ) : (
          <Badge variant="outline">Pending</Badge>
        );
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Course Schedules</h1>
            <p className="text-muted-foreground mt-1">
              Manage course schedules, dates, and lecturer-pack document generation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import Schedules
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-[220px]">
                <p className="mb-2 text-sm font-medium">Branch Filter</p>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchFilterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-2 sm:pt-7">
                <Badge variant="outline">{selectedBranchFilterLabel}</Badge>
                <Badge variant="secondary">{scheduleList.length} schedules</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                onClick={() => setViewMode("list")}
              >
                <List className="mr-2 h-4 w-4" />
                List View
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Calendar View
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Lecturer Templates</CardTitle>
              <CardDescription>Templates ready for schedule-side generation.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{scheduleDocumentTemplateOptions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Generated Schedule Docs</CardTitle>
              <CardDescription>Documents already generated from schedules.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{generatedScheduleDocuments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Workflow</CardTitle>
              <CardDescription>
                Configure the course-start pack first, then use the wand for one document or the stack for the full lecturer pack.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Lecturer-pack templates are preferred automatically when available.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Course-Start Packs</CardTitle>
              <CardDescription>Schedules prepared with location, sector, equipment, and safety details.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{configuredCourseStartPackCount}</p>
            </CardContent>
          </Card>
        </div>

        {viewMode === "list" ? (
          <DataTable
            columns={columns}
            data={scheduleList}
            isLoading={isLoading}
            onRowClick={handleEdit}
            searchPlaceholder="Search schedules..."
            actions={(schedule) => (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCourseStartPackSetup(schedule);
                  }}
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={lecturerTemplateRecords.length === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGeneratePack(schedule);
                  }}
                >
                  <Layers3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenGenerateDocument(schedule);
                  }}
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(schedule);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(schedule);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Schedule Calendar</CardTitle>
              <CardDescription>
                View branch schedules by month, week, day, or agenda. Click any schedule to edit it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-background p-2">
                <Calendar
                  localizer={calendarLocalizer}
                  events={scheduleCalendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  titleAccessor="title"
                  style={{ height: 720 }}
                  view={calendarView}
                  onView={setCalendarView}
                  date={calendarDate}
                  onNavigate={setCalendarDate}
                  views={["month", "week", "day", "agenda"]}
                  popup
                  onSelectEvent={(event) => handleEdit((event as ScheduleCalendarEvent).resource.schedule)}
                  eventPropGetter={(event) => {
                    const scheduleEvent = event as ScheduleCalendarEvent;
                    const colors = getScheduleCalendarEventStyles(
                      scheduleEvent.resource.methodColor,
                      scheduleEvent.resource.schedule.status
                    );
                    return {
                      style: {
                        backgroundColor: colors.backgroundColor,
                        border: `2px solid ${colors.borderColor}`,
                        borderRadius: "6px",
                        color: colors.color,
                        opacity: colors.opacity,
                        textDecoration: colors.textDecoration,
                      },
                    };
                  }}
                  tooltipAccessor={(event) => {
                    const scheduleEvent = event as ScheduleCalendarEvent;
                    return [
                      scheduleEvent.resource.courseLabel,
                      scheduleEvent.resource.branchName,
                      scheduleEvent.resource.lecturerName,
                      `Status: ${scheduleEvent.resource.schedule.status}`,
                      `Exam: ${scheduleEvent.resource.examLabel}`,
                    ].join("\n");
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {calendarLegend.map((entry) => (
                  <Badge
                    key={entry.label}
                    variant="outline"
                    style={{
                      backgroundColor: entry.color,
                      color:
                        entry.color.toLowerCase() === METHOD_FAMILY_COLOURS.RT.toLowerCase() ||
                        entry.color.toLowerCase() === METHOD_FAMILY_COLOURS.WT.toLowerCase()
                          ? "#111827"
                          : "#ffffff",
                    }}
                  >
                    {entry.label}
                  </Badge>
                ))}
                <Badge variant="secondary" className={getScheduleStatusClass("Scheduled")}>
                  Scheduled
                </Badge>
                <Badge variant="secondary" className={getScheduleStatusClass("In Progress")}>
                  In Progress
                </Badge>
                <Badge variant="secondary" className={getScheduleStatusClass("Completed")}>
                  Completed
                </Badge>
                <Badge variant="secondary" className={getScheduleStatusClass("Cancelled")}>
                  Cancelled
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <FormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingSchedule(null);
              setError(null);
              setFormValues({});
            }
          }}
          title={editingSchedule ? "Edit Schedule" : "Add Schedule"}
          fields={formFields}
          initialValues={buildScheduleInitialValues(editingSchedule)}
          onSubmit={handleFormSubmit}
          onValuesChange={setFormValues}
          normalizeValues={(nextValues) => {
            const normalizedValues = { ...nextValues };
            const nextBranchId = normalizedValues.branchId ? Number(normalizedValues.branchId) : null;
            const nextCourse = courseList.find(
              (course) => course.id === Number(normalizedValues.courseId)
            );
            const nextLecturerId = normalizedValues.lecturerId
              ? Number(normalizedValues.lecturerId)
              : null;

            if (
              nextLecturerId &&
              (!nextBranchId ||
                !lecturerList.some(
                  (lecturer) =>
                    lecturer.id === nextLecturerId && lecturer.branchId === nextBranchId
                ))
            ) {
              normalizedValues.lecturerId = "";
            }

            if (normalizedValues.startDate && nextCourse?.duration && nextCourse.duration > 0) {
              normalizedValues.endDate = formatDateInputValue(
                calculateEndDateFromDuration(
                  parseDateInputValue(String(normalizedValues.startDate)),
                  nextCourse.duration
                )
              );
            }

            const effectiveExamEndDate =
              normalizedValues.endOfCourseExamEndDate || normalizedValues.endOfCourseExamStartDate;

            if (effectiveExamEndDate) {
              normalizedValues.endDate = String(effectiveExamEndDate);
            }

            return normalizedValues;
          }}
          isLoading={isSubmitting}
          error={error}
        />

        <FormDialog
          open={isGeneratePackOpen}
          onOpenChange={(open) => {
            setIsGeneratePackOpen(open);
            if (!open) {
              setSelectedScheduleForDocument(null);
            }
          }}
          title="Generate Lecturer Pack"
          description={
            selectedScheduleForDocument
              ? `Create the full lecturer pack for schedule ${selectedScheduleForDocument.id} using all active lecturer-pack templates.`
              : "Create the full lecturer pack."
          }
          fields={[
            {
              name: "generatedStatus",
              label: "Initial Status",
              type: "select",
              options: [
                { value: "Draft", label: "Draft" },
                { value: "Issued", label: "Issued" },
                { value: "Corrected", label: "Corrected" },
                { value: "Superseded", label: "Superseded" },
              ],
              required: true,
            },
          ]}
          initialValues={{
            generatedStatus: "Draft",
          }}
          onSubmit={handleGenerateSchedulePack}
          isLoading={isGeneratingPack}
          submitLabel="Generate Pack"
        />

        <FormDialog
          open={isCourseStartPackOpen}
          onOpenChange={(open) => {
            setIsCourseStartPackOpen(open);
            if (!open) {
              setSelectedScheduleForPackSetup(null);
            }
          }}
          title="Course-Start Pack Setup"
          description={
            selectedScheduleForPackSetup
              ? `Capture lecturer-pack setup details for schedule ${selectedScheduleForPackSetup.id}. These fields feed editable course-start documents like QF-TRG-1586 and QF-TRG-1411.`
              : "Capture course-start pack details."
          }
          fields={[
            {
              name: "location",
              label: "Location",
              type: "text",
              placeholder: "Training venue or site location",
            },
            {
              name: "industrySector",
              label: "Industry Sector",
              type: "select",
              options: [
                { value: "General Industry", label: "General Industry" },
                { value: "Aerospace", label: "Aerospace" },
                { value: "General Industry & Aerospace", label: "General Industry & Aerospace" },
                { value: "Other", label: "Other" },
              ],
              placeholder: "Select sector",
            },
            {
              name: "sectorScope",
              label: "Sector Scope",
              type: "textarea",
              placeholder: "Product sector, customer environment, or other sector-specific notes.",
            },
            {
              name: "productOrEquipmentScope",
              label: "Product / Equipment Scope",
              type: "textarea",
              placeholder: "List products, equipment groups, or relevant systems for the course.",
            },
            {
              name: "techniqueScope",
              label: "Technique Scope",
              type: "textarea",
              placeholder: "List the techniques or method coverage for this class.",
            },
            {
              name: "selectedEquipmentIds",
              label: "Equipment",
              type: "checkbox-group",
              options: packEquipmentOptions,
              helpText:
                selectedPackBranchId && packEquipmentOptions.length === 0
                  ? "No equipment is currently recorded for this branch."
                  : "Select equipment already captured in the equipment register.",
            },
            {
              name: "additionalEquipment",
              label: "Additional Equipment",
              type: "textarea",
              placeholder: "Enter one item per line for equipment not yet in the register.",
            },
            {
              name: "selectedSpecimenIds",
              label: "Specimens",
              type: "checkbox-group",
              options: packSpecimenOptions,
              helpText:
                selectedPackBranchId && packSpecimenOptions.length === 0
                  ? "No specimens are currently recorded for this branch."
                  : "Select specimens already captured in the specimen register.",
            },
            {
              name: "additionalSpecimens",
              label: "Additional Specimens",
              type: "textarea",
              placeholder: "Enter one item per line for specimens not yet in the register.",
            },
            {
              name: "safetyDeclaration",
              label: "Safety Declaration",
              type: "textarea",
              placeholder: "Editable declaration text for the student safety acknowledgement.",
            },
            {
              name: "lecturerNotes",
              label: "Lecturer Notes",
              type: "textarea",
              placeholder: "Travel notes, reminders, logistics, or special preparation comments.",
            },
          ]}
          initialValues={buildCourseStartPackInitialValues(selectedScheduleForPackSetup)}
          onSubmit={handleSaveCourseStartPack}
          isLoading={isSavingCourseStartPack}
          submitLabel="Save Setup"
        />

        <FormDialog
          open={isGenerateDocumentOpen}
          onOpenChange={(open) => {
            setIsGenerateDocumentOpen(open);
            if (!open) {
              setSelectedScheduleForDocument(null);
            }
          }}
          title="Generate Schedule Document"
          description={
            selectedScheduleForDocument
              ? `Create editable schedule paperwork for schedule ${selectedScheduleForDocument.id}.`
              : "Create editable schedule paperwork."
          }
          fields={[
            {
              name: "templateId",
              label: "Template",
              type: "select",
              options: scheduleDocumentTemplateOptions,
              required: true,
              placeholder:
                scheduleDocumentTemplateOptions.length === 0
                  ? "Load templates in Documents first"
                  : "Select template",
            },
            {
              name: "generatedStatus",
              label: "Initial Status",
              type: "select",
              options: [
                { value: "Draft", label: "Draft" },
                { value: "Issued", label: "Issued" },
                { value: "Corrected", label: "Corrected" },
                { value: "Superseded", label: "Superseded" },
              ],
              required: true,
            },
            {
              name: "titleOverride",
              label: "Title Override",
              type: "text",
              placeholder: "Leave blank to use the template title",
            },
            {
              name: "descriptionOverride",
              label: "Subtitle Override",
              type: "text",
              placeholder: "Leave blank to use the template subtitle",
            },
          ]}
          initialValues={{
            generatedStatus: "Draft",
          }}
          onSubmit={handleGenerateScheduleDocument}
          isLoading={isGeneratingDocument}
          submitLabel="Generate"
        />

        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title="Import Schedules"
          description={
            branchFilter === "all"
              ? "Upload a CSV or Excel file and map the headings. Include branch ID, branch code, or branch name in the file. Courses can be resolved by ID, code, or name, and new course masters can be created when both course code and course name are supplied."
              : `Upload a CSV or Excel file and map the headings. The current branch filter (${selectedBranchFilterLabel}) will be used as the default branch when no branch column is mapped.`
          }
          targetFields={[
            { key: "branchId", label: "Branch ID", required: false, aliases: ["branch", "branch number"] },
            { key: "branchCode", label: "Branch Code", required: false, aliases: ["branch short code", "site code"] },
            { key: "branchName", label: "Branch Name", required: false, aliases: ["site", "site name"] },
            { key: "courseId", label: "Course ID", required: false, aliases: ["course number"] },
            { key: "courseCode", label: "Course Code", required: false, aliases: ["code"] },
            { key: "courseName", label: "Course Name", required: false, aliases: ["course", "course title"] },
            {
              key: "courseDuration",
              label: "Course Duration (Work Days)",
              required: false,
              aliases: ["duration", "duration days", "work days"],
            },
            { key: "courseLevel", label: "Course Level", required: false, aliases: ["level"] },
            { key: "courseDescription", label: "Course Description", required: false, aliases: ["course details", "description"] },
            { key: "lecturerId", label: "Lecturer ID", required: false, aliases: ["instructor id"] },
            { key: "lecturerEmail", label: "Lecturer Email", required: false, aliases: ["instructor email"] },
            { key: "lecturerName", label: "Lecturer Full Name", required: false, aliases: ["lecturer", "instructor", "trainer"] },
            { key: "lecturerFirstName", label: "Lecturer First Name", required: false, aliases: ["instructor first name"] },
            { key: "lecturerLastName", label: "Lecturer Last Name", required: false, aliases: ["instructor last name"] },
            { key: "startDate", label: "Start Date", required: true, aliases: ["course start date", "start"] },
            { key: "endDate", label: "End Date / Final Exam Day", required: false, aliases: ["end date", "final exam day"] },
            {
              key: "endOfCourseExamStartDate",
              label: "End-of-Course Exam Start Date",
              required: false,
              aliases: ["exam start date", "end course exam start date"],
            },
            {
              key: "endOfCourseExamEndDate",
              label: "End-of-Course Exam End Date",
              required: false,
              aliases: ["exam end date", "end course exam end date"],
            },
            { key: "maxCapacity", label: "Max Capacity", required: false, aliases: ["capacity", "seats"] },
            { key: "status", label: "Status", required: false, aliases: ["schedule status"] },
          ]}
          onImport={handleImportSchedules}
        />
      </div>
    </DashboardLayout>
  );
}
