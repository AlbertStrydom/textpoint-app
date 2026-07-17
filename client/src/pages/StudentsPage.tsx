import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog, type FormField } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildEditableHtmlDocument, exportEditableHtmlDocument } from "@/lib/exportUtils";
import {
  Award,
  Ban,
  CheckCircle,
  ClipboardList,
  Download,
  Edit2,
  FileText,
  Layers3,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface StudentRow {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  studentNumber?: string | null;
  idNumber?: string | null;
  passportNumber?: string | null;
  interestType?: string | null;
  isCurrentPcnHolder?: boolean;
  bindtProductCompleted?: boolean;
  pcnNumber?: string | null;
  active?: boolean;
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
}

interface EnrolmentRecord {
  id: number;
  studentId: number;
  courseScheduleId: number;
  enrollmentDate: string | Date;
  status: "Active" | "Completed" | "Withdrawn" | "Suspended";
}

interface ScheduleRecord {
  id: number;
  courseId: number;
  branchId: number | null;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
}

interface CourseRecord {
  id: number;
  name: string;
  code?: string | null;
}

interface BranchRecord {
  id: number;
  name: string;
  companyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

interface TrainingRecord {
  id: number;
  enrollmentId: number;
  assessorId: number | null;
  assessmentType: "Theory" | "Practical";
  attemptNumber: number;
  score: string | number | null;
  maxScore: string | number | null;
  result: "Pass" | "Fail" | "Incomplete";
  assessmentDate: string | Date;
  notes: string | null;
}

interface CertificateRecord {
  id: number;
  enrollmentId: number;
  certificateNumber: string;
  issuedDate: string | Date;
  expiryDate: string | Date | null;
  status: "Active" | "Expired" | "Revoked";
  content: string | null;
  notes: string | null;
  issuedBy: number | null;
}

interface LecturerRecord {
  id: number;
  firstName: string;
  lastName: string;
}

type DocumentKind = "library" | "template" | "generated";
type GeneratedStatus = "Draft" | "Issued" | "Corrected" | "Superseded";

type DocumentMetadata = {
  kind?: DocumentKind;
  accentColor?: string;
  companyName?: string;
  logoUrl?: string;
  templateCategory?: string;
  templateStatus?: string;
  generatedStatus?: GeneratedStatus;
  generatedFromTemplateTitle?: string;
  sourceType?: string;
  studentId?: number;
  enrollmentId?: number;
  branchId?: number;
  branchName?: string;
  version?: number;
};

const STUDENT_PACK_TEMPLATE_CATEGORY_OPTIONS = [
  { value: "Student Pack", label: "Student Pack" },
  { value: "Course Control", label: "Course Control" },
  { value: "Results & Certificates", label: "Results & Certificates" },
] as const;

interface DocumentRecord {
  id: number;
  title: string;
  description: string | null;
  documentType: string | null;
  content: string | null;
  url: string;
  branchId: number | null;
  tags: DocumentMetadata | null;
  createdAt: string | Date;
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseOptionalNumber(value: unknown) {
  const cleaned = cleanOptionalString(value);
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDisplayFirstName(student: StudentRow): string {
  if (student.firstName) return student.firstName;
  if (student.name) return student.name.split(" ")[0] || "";
  return "";
}

function getDisplayLastName(student: StudentRow): string {
  if (student.lastName) return student.lastName;
  if (student.name) {
    const parts = student.name.split(" ");
    return parts.length > 1 ? parts.slice(1).join(" ") : "";
  }
  return "";
}

function getStudentFullName(student: StudentRow) {
  return `${getDisplayFirstName(student)} ${getDisplayLastName(student)}`.trim();
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function getDateInputValue(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatScore(score: string | number | null, maxScore: string | number | null) {
  if (score === null || score === undefined || score === "") return "-";
  if (maxScore === null || maxScore === undefined || maxScore === "") return String(score);
  return `${score}/${maxScore}`;
}

function getTrainingResultClass(result: TrainingRecord["result"]) {
  switch (result) {
    case "Pass":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "Fail":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
  }
}

function getCertificateStatusClass(status: CertificateRecord["status"]) {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "Expired":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    case "Revoked":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100";
  }
}

function isStudentOnPcnPath(student: StudentRow | null | undefined) {
  if (!student) return false;
  return (
    student.interestType === "PCN After Course" ||
    Boolean(student.isCurrentPcnHolder) ||
    Boolean(student.pcnNumber)
  );
}

function getDocumentMetadata(tags: DocumentRecord["tags"]) {
  return tags && typeof tags === "object" ? tags : {};
}

function getGeneratedDocumentStatusClass(status: GeneratedStatus) {
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildDefaultCertificateContent(options: {
  studentName: string;
  courseLabel: string;
  branchName: string;
  certificateNumber: string;
  issuedDate: string;
  isBindtApprovedCourse: boolean;
  pcnNumber?: string | null;
  notes?: string | null;
}) {
  return `
    <p>This certificate confirms that <strong>${escapeHtml(
      options.studentName
    )}</strong> successfully completed the listed training programme.</p>
    <table>
      <tbody>
        <tr><th>Certificate Number</th><td>${escapeHtml(options.certificateNumber)}</td></tr>
        <tr><th>Course / Schedule</th><td>${escapeHtml(options.courseLabel)}</td></tr>
        <tr><th>Branch</th><td>${escapeHtml(options.branchName)}</td></tr>
        <tr><th>Issued Date</th><td>${escapeHtml(options.issuedDate)}</td></tr>
        <tr><th>Certificate Basis</th><td>SNT-TC-1A</td></tr>
      </tbody>
    </table>
    <p>The holder has completed the applicable training and practical record requirements captured by TextPoint.</p>
    <p>This certificate is issued in accordance with SNT-TC-1A and does not carry an expiry date.</p>
    ${
      options.isBindtApprovedCourse
        ? `<p>This training was presented as a <strong>BINDT approved course</strong> for the PCN route.${options.pcnNumber ? ` Current PCN number: <strong>${escapeHtml(options.pcnNumber)}</strong>.` : ""}</p>`
        : ""
    }
    ${
      options.notes
        ? `<p><strong>Notes:</strong> ${escapeHtml(options.notes)}</p>`
        : ""
    }
    <p><strong>Issued for:</strong> ${escapeHtml(options.studentName)}</p>
  `;
}

function buildDocumentExportOptions(
  record: DocumentRecord,
  branches: BranchRecord[]
) {
  const metadata = getDocumentMetadata(record.tags);
  const branch = branches.find(
    (item) => item.id === record.branchId || item.id === metadata.branchId
  );

  return {
    filename:
      record.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `document-${record.id}`,
    title: record.title,
    subtitle: record.description || undefined,
    content: record.content || "<p>No content available.</p>",
    design: {
      accentColor: metadata.accentColor || branch?.primaryColor || "#0f766e",
      companyName:
        metadata.companyName || branch?.companyName || branch?.name || "TextPoint",
      logoUrl: metadata.logoUrl || branch?.logoUrl || "",
    },
  };
}

function openDocumentPreview(record: DocumentRecord, branches: BranchRecord[]) {
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) return;

  const content = record.content || "<p>No content available.</p>";
  if (/<html[\s>]/i.test(content) || /<!doctype/i.test(content)) {
    previewWindow.document.write(content);
  } else {
    previewWindow.document.write(
      buildEditableHtmlDocument(buildDocumentExportOptions(record, branches))
    );
  }
  previewWindow.document.close();
}

function buildScheduleLabel(
  schedule: ScheduleRecord | undefined,
  courses: CourseRecord[],
  branches: BranchRecord[]
) {
  if (!schedule) return "Unknown schedule";

  const course = courses.find((item) => item.id === schedule.courseId);
  const branch = branches.find((item) => item.id === schedule.branchId);
  const courseLabel = course
    ? `${course.code ? `${course.code} - ` : ""}${course.name}`
    : `Course ${schedule.courseId}`;

  return `${courseLabel} | ${branch?.name || "No branch"} | ${formatDate(
    schedule.startDate
  )}`;
}

export default function StudentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveIdNumber, setLiveIdNumber] = useState("");
  const [livePassportNumber, setLivePassportNumber] = useState("");
  const [isTrainingRecordFormOpen, setIsTrainingRecordFormOpen] = useState(false);
  const [editingTrainingRecord, setEditingTrainingRecord] = useState<TrainingRecord | null>(
    null
  );
  const [isTrainingRecordSubmitting, setIsTrainingRecordSubmitting] =
    useState(false);
  const [isCertificateFormOpen, setIsCertificateFormOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<CertificateRecord | null>(
    null
  );
  const [isCertificateSubmitting, setIsCertificateSubmitting] = useState(false);
  const [isGenerateDocumentFormOpen, setIsGenerateDocumentFormOpen] = useState(false);
  const [isGeneratePackFormOpen, setIsGeneratePackFormOpen] = useState(false);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);

  const { data: students = [], isLoading, refetch } = trpc.students.list.useQuery();
  const { data: enrolments = [] } = trpc.enrollments.list.useQuery();
  const { data: schedules = [] } = trpc.courseSchedules.list.useQuery();
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const { data: documents = [], refetch: refetchDocuments } = trpc.documents.list.useQuery();
  const {
    data: trainingRecords = [],
    refetch: refetchTrainingRecords,
  } = trpc.assessments.list.useQuery();
  const { data: lecturers = [] } = trpc.lecturers.list.useQuery();
  const {
    data: certificates = [],
    refetch: refetchCertificates,
  } = trpc.certificates.list.useQuery(
    selectedStudent ? { studentId: selectedStudent.id } : undefined,
    { enabled: Boolean(selectedStudent) }
  );

  const duplicateQuery = trpc.students.checkDuplicate.useQuery(
    {
      idNumber: liveIdNumber || undefined,
      passportNumber: livePassportNumber || undefined,
      excludeStudentId: editingStudent?.id,
    },
    {
      enabled: isFormOpen && (!!liveIdNumber || !!livePassportNumber),
      refetchOnWindowFocus: false,
    }
  );

  const createMutation = trpc.students.create.useMutation();
  const updateMutation = trpc.students.update.useMutation();
  const deleteMutation = trpc.students.delete.useMutation();
  const toggleBlacklistMutation = trpc.students.toggleBlacklist.useMutation();
  const createTrainingRecordMutation = trpc.assessments.create.useMutation();
  const updateTrainingRecordMutation = trpc.assessments.update.useMutation();
  const deleteTrainingRecordMutation = trpc.assessments.delete.useMutation();
  const createCertificateMutation = trpc.certificates.create.useMutation();
  const updateCertificateMutation = trpc.certificates.update.useMutation();
  const deleteCertificateMutation = trpc.certificates.delete.useMutation();
  const generateDocumentMutation = trpc.documents.generateFromTemplate.useMutation();
  const generateStudentPackMutation = trpc.documents.generateStudentPack.useMutation();

  const typedStudents = students as StudentRow[];
  const typedEnrolments = enrolments as EnrolmentRecord[];
  const typedSchedules = schedules as ScheduleRecord[];
  const typedCourses = courses as CourseRecord[];
  const typedBranches = branches as BranchRecord[];
  const typedDocuments = documents as DocumentRecord[];
  const typedTrainingRecords = trainingRecords as TrainingRecord[];
  const typedLecturers = lecturers as LecturerRecord[];
  const typedCertificates = certificates as CertificateRecord[];

  const handleSubmit = async (values: Record<string, unknown>) => {
    setIsSubmitting(true);
    setError(null);

    const payload = {
      firstName: String(values.firstName || "").trim(),
      lastName: String(values.lastName || "").trim(),
      email: cleanOptionalString(values.email),
      phone: cleanOptionalString(values.phone),
      idNumber: cleanOptionalString(values.idNumber),
      passportNumber: cleanOptionalString(values.passportNumber),
      interestType: cleanOptionalString(values.interestType) as
        | "SNT Only"
        | "PCN After Course"
        | undefined,
      isCurrentPcnHolder: String(values.isCurrentPcnHolder || "false") === "true",
      bindtProductCompleted:
        String(values.bindtProductCompleted || "false") === "true",
      pcnNumber: cleanOptionalString(values.pcnNumber),
      active: String(values.active ?? "true") === "true",
    };

    if (payload.idNumber && payload.passportNumber) {
      const message =
        "Please capture either an ID number or a passport number, not both.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (payload.idNumber && !/^\d{13}$/.test(payload.idNumber)) {
      const message = "SA ID number must be exactly 13 numeric digits.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    if (duplicateQuery.data?.duplicate) {
      const match = duplicateQuery.data.studentMatch;
      const message = match
        ? `Duplicate found: ${match.firstName} ${match.lastName} already exists with this ID or passport number.`
        : "A student with this ID or passport number already exists.";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingStudent) {
        await updateMutation.mutateAsync({
          id: editingStudent.id,
          data: payload,
        });
        if (selectedStudent?.id === editingStudent.id) {
          setSelectedStudent({
            ...selectedStudent,
            ...payload,
          });
        }
        toast.success("Student updated successfully.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Student created successfully.");
      }

      await refetch();
      setIsFormOpen(false);
      setEditingStudent(null);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save student.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (student: StudentRow) => {
    if (deleteMutation.isPending) return;

    if (!confirm(`Are you sure you want to delete ${getStudentFullName(student)}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: student.id });
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }
      toast.success("Student deleted successfully.");
      await refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete student.";
      toast.error(message);
    }
  };

  const handleToggleBlacklist = async (student: StudentRow) => {
    if (toggleBlacklistMutation.isPending) return;

    let blacklistReason: string | null = null;

    if (!student.isBlacklisted) {
      const reason = window.prompt(
        `Enter a reason for blacklisting ${getStudentFullName(student)}:`
      );
      if (reason === null) return;
      blacklistReason = reason.trim() || "No reason provided";
    }

    try {
      await toggleBlacklistMutation.mutateAsync({
        id: student.id,
        isBlacklisted: !student.isBlacklisted,
        blacklistReason,
      });
      if (selectedStudent?.id === student.id) {
        setSelectedStudent({
          ...selectedStudent,
          isBlacklisted: !student.isBlacklisted,
          blacklistReason:
            student.isBlacklisted ? null : blacklistReason ?? "No reason provided",
        });
      }
      toast.success(
        student.isBlacklisted
          ? "Student removed from blacklist."
          : "Student added to blacklist."
      );
      await refetch();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to update blacklist status.";
      toast.error(message);
    }
  };

  const selectedStudentEnrolments = useMemo(
    () =>
      selectedStudent
        ? typedEnrolments.filter((enrolment) => enrolment.studentId === selectedStudent.id)
        : [],
    [selectedStudent, typedEnrolments]
  );

  const selectedStudentEnrolmentIds = useMemo(
    () => new Set(selectedStudentEnrolments.map((enrolment) => enrolment.id)),
    [selectedStudentEnrolments]
  );

  const selectedStudentTrainingRecords = useMemo(
    () =>
      typedTrainingRecords.filter((record) =>
        selectedStudentEnrolmentIds.has(record.enrollmentId)
      ),
    [selectedStudentEnrolmentIds, typedTrainingRecords]
  );

  const studentEnrolmentOptions = useMemo(
    () =>
      selectedStudentEnrolments.map((enrolment) => {
        const schedule = typedSchedules.find(
          (item) => item.id === enrolment.courseScheduleId
        );
        return {
          value: String(enrolment.id),
          label: buildScheduleLabel(schedule, typedCourses, typedBranches),
        };
      }),
    [selectedStudentEnrolments, typedBranches, typedCourses, typedSchedules]
  );

  const studentDocumentTemplateOptions = useMemo(
    () =>
      typedDocuments
        .filter((record) => {
          const metadata = getDocumentMetadata(record.tags);
          return (
            metadata.kind === "template" &&
            metadata.templateStatus !== "Archived" &&
            metadata.templateCategory !== "Lecturer Pack"
          );
        })
        .map((record) => {
          const metadata = getDocumentMetadata(record.tags);
          return {
            value: String(record.id),
            label: `${record.title} | ${metadata.templateCategory || "General"}`,
          };
        }),
    [typedDocuments]
  );
  const studentPackTemplateCount = useMemo(
    () =>
      typedDocuments.filter((record) => {
        const metadata = getDocumentMetadata(record.tags);
        return (
          metadata.kind === "template" &&
          metadata.templateStatus === "Active" &&
          STUDENT_PACK_TEMPLATE_CATEGORY_OPTIONS.some(
            (option) => option.value === metadata.templateCategory
          )
        );
      }).length,
    [typedDocuments]
  );

  const assessorOptions = useMemo(
    () =>
      typedLecturers.map((lecturer) => ({
        value: String(lecturer.id),
        label: `${lecturer.firstName} ${lecturer.lastName}`,
      })),
    [typedLecturers]
  );

  const completedTrainingRecords = selectedStudentTrainingRecords.filter(
    (record) => record.result !== "Incomplete"
  );
  const passedTrainingRecords = selectedStudentTrainingRecords.filter(
    (record) => record.result === "Pass"
  );
  const selectedStudentCertificates = useMemo(
    () =>
      typedCertificates.filter((record) =>
        selectedStudentEnrolmentIds.has(record.enrollmentId)
      ),
    [selectedStudentEnrolmentIds, typedCertificates]
  );
  const selectedStudentGeneratedDocuments = useMemo(
    () =>
      typedDocuments
        .filter((record) => {
          const metadata = getDocumentMetadata(record.tags);
          return (
            metadata.kind === "generated" &&
            metadata.studentId === selectedStudent?.id &&
            metadata.sourceType === "student_enrollment"
          );
        })
        .sort((left, right) => {
          const leftTime = new Date(left.createdAt).getTime();
          const rightTime = new Date(right.createdAt).getTime();
          return rightTime - leftTime;
        }),
    [selectedStudent?.id, typedDocuments]
  );
  const activeCertificates = selectedStudentCertificates.filter(
    (record) => record.status === "Active"
  );
  const issuedGeneratedDocuments = selectedStudentGeneratedDocuments.filter((record) => {
    const metadata = getDocumentMetadata(record.tags);
    return metadata.generatedStatus === "Issued";
  });

  const getCertificateContext = (enrollmentId: number) => {
    const enrollment = typedEnrolments.find((item) => item.id === enrollmentId);
    const schedule = enrollment
      ? typedSchedules.find((item) => item.id === enrollment.courseScheduleId)
      : undefined;
    const branch = schedule
      ? typedBranches.find((item) => item.id === schedule.branchId)
      : undefined;
    const course = schedule
      ? typedCourses.find((item) => item.id === schedule.courseId)
      : undefined;

    return {
      schedule,
      branch,
      course,
      scheduleLabel: buildScheduleLabel(schedule, typedCourses, typedBranches),
      branchLabel: branch?.name || "No branch",
      courseLabel: course
        ? `${course.code ? `${course.code} - ` : ""}${course.name}`
        : "Training Course",
    };
  };

  const getCertificateDocumentOptions = (record: CertificateRecord) => {
    const context = getCertificateContext(record.enrollmentId);
    const studentName = selectedStudent
      ? getStudentFullName(selectedStudent)
      : "Student";
    const content =
      cleanOptionalString(record.content) ||
      buildDefaultCertificateContent({
        studentName,
        courseLabel: context.scheduleLabel,
        branchName: context.branchLabel,
        certificateNumber: record.certificateNumber,
        issuedDate: formatDate(record.issuedDate),
        isBindtApprovedCourse: isStudentOnPcnPath(selectedStudent),
        pcnNumber: selectedStudent?.pcnNumber ?? null,
        notes: record.notes,
      });

    return {
      filename:
        record.certificateNumber
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || `certificate-${record.id}`,
      title: "Training Certificate",
      subtitle: `${studentName} | ${context.courseLabel}`,
      content,
      design: {
        accentColor: context.branch?.primaryColor || "#0f766e",
        companyName: context.branch?.companyName || context.branch?.name || "TextPoint",
        logoUrl: context.branch?.logoUrl || "",
      },
    };
  };

  const handleTrainingRecordSubmit = async (values: Record<string, unknown>) => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }

    setIsTrainingRecordSubmitting(true);

    try {
      const enrollmentId = Number(values.enrollmentId);
      const attemptNumber = Number(values.attemptNumber || 1);
      const score = parseOptionalNumber(values.score);
      const maxScore = parseOptionalNumber(values.maxScore);

      if (!Number.isFinite(enrollmentId)) {
        throw new Error("Please select the student's enrolment.");
      }

      if (!selectedStudentEnrolmentIds.has(enrollmentId)) {
        throw new Error("This training record must belong to the selected student.");
      }

      if (score !== null && maxScore !== null && score > maxScore) {
        throw new Error("Score cannot be greater than max score.");
      }

      const payload = {
        enrollmentId,
        assessorId: values.assessorId ? Number(values.assessorId) : null,
        assessmentType: String(values.assessmentType || "Practical") as
          | "Theory"
          | "Practical",
        attemptNumber,
        score,
        maxScore,
        result: String(values.result || "Incomplete") as
          | "Pass"
          | "Fail"
          | "Incomplete",
        assessmentDate: parseDateInput(String(values.assessmentDate)),
        notes: cleanOptionalString(values.notes) ?? null,
      };

      if (editingTrainingRecord) {
        await updateTrainingRecordMutation.mutateAsync({
          id: editingTrainingRecord.id,
          data: {
            assessorId: payload.assessorId,
            assessmentType: payload.assessmentType,
            attemptNumber: payload.attemptNumber,
            score: payload.score,
            maxScore: payload.maxScore,
            result: payload.result,
            assessmentDate: payload.assessmentDate,
            notes: payload.notes,
          },
        });
        toast.success("Training record updated.");
      } else {
        await createTrainingRecordMutation.mutateAsync(payload);
        toast.success("Training record added.");
      }

      await refetchTrainingRecords();
      setIsTrainingRecordFormOpen(false);
      setEditingTrainingRecord(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save training record."
      );
    } finally {
      setIsTrainingRecordSubmitting(false);
    }
  };

  const handleDeleteTrainingRecord = async (record: TrainingRecord) => {
    if (!confirm("Delete this training record?")) return;

    try {
      await deleteTrainingRecordMutation.mutateAsync({ id: record.id });
      toast.success("Training record deleted.");
      await refetchTrainingRecords();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete training record."
      );
    }
  };

  const handleCertificateSubmit = async (values: Record<string, unknown>) => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }

    setIsCertificateSubmitting(true);

    try {
      const enrollmentId = Number(values.enrollmentId);
      if (!Number.isFinite(enrollmentId)) {
        throw new Error("Please select the student's enrolment.");
      }

      if (!selectedStudentEnrolmentIds.has(enrollmentId)) {
        throw new Error("This certificate must belong to the selected student.");
      }

      const context = getCertificateContext(enrollmentId);
      const issuedDate = parseDateInput(String(values.issuedDate));
      const certificateNumber =
        cleanOptionalString(values.certificateNumber) ?? "";
      const notes = cleanOptionalString(values.notes) ?? null;
      const content =
        cleanOptionalString(values.content) ??
        buildDefaultCertificateContent({
          studentName: getStudentFullName(selectedStudent),
          courseLabel: context.scheduleLabel,
          branchName: context.branchLabel,
          certificateNumber: certificateNumber || "{{CERTIFICATE_NUMBER}}",
          issuedDate: formatDate(issuedDate),
          isBindtApprovedCourse: isStudentOnPcnPath(selectedStudent),
          pcnNumber: selectedStudent.pcnNumber ?? null,
          notes,
        });

      const payload = {
        enrollmentId,
        certificateNumber: certificateNumber || null,
        issuedDate,
        expiryDate: null,
        status: String(values.status || "Active") as
          | "Active"
          | "Revoked",
        content,
        notes,
      };

      if (editingCertificate) {
        await updateCertificateMutation.mutateAsync({
          id: editingCertificate.id,
          data: payload,
        });
        toast.success("Certificate updated.");
      } else {
        await createCertificateMutation.mutateAsync(payload);
        toast.success("Certificate issued.");
      }

      await refetchCertificates();
      setIsCertificateFormOpen(false);
      setEditingCertificate(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save certificate."
      );
    } finally {
      setIsCertificateSubmitting(false);
    }
  };

  const handleDeleteCertificate = async (record: CertificateRecord) => {
    if (!confirm("Delete this certificate?")) return;

    try {
      await deleteCertificateMutation.mutateAsync({ id: record.id });
      toast.success("Certificate deleted.");
      await refetchCertificates();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete certificate."
      );
    }
  };

  const handlePreviewCertificate = (record: CertificateRecord) => {
    const previewWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!previewWindow) {
      toast.error("Unable to open certificate preview.");
      return;
    }

    previewWindow.document.write(
      buildEditableHtmlDocument(getCertificateDocumentOptions(record))
    );
    previewWindow.document.close();
  };

  const handleGenerateStudentDocument = async (values: Record<string, unknown>) => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }

    setIsGeneratingDocument(true);

    try {
      const templateId = Number(values.templateId);
      const enrollmentId = Number(values.enrollmentId);

      if (!Number.isFinite(templateId) || !Number.isFinite(enrollmentId)) {
        throw new Error("Template and enrolment are required.");
      }

      if (!selectedStudentEnrolmentIds.has(enrollmentId)) {
        throw new Error("The selected enrolment does not belong to this student.");
      }

      await generateDocumentMutation.mutateAsync({
        templateId,
        studentId: selectedStudent.id,
        enrollmentId,
        titleOverride: cleanOptionalString(values.titleOverride) ?? null,
        descriptionOverride: cleanOptionalString(values.descriptionOverride) ?? null,
        generatedStatus: String(values.generatedStatus || "Draft") as GeneratedStatus,
      });

      toast.success("Training document generated.");
      setIsGenerateDocumentFormOpen(false);
      await refetchDocuments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate document."
      );
    } finally {
      setIsGeneratingDocument(false);
    }
  };

  const handleGenerateStudentPack = async (values: Record<string, unknown>) => {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }

    setIsGeneratingPack(true);

    try {
      const enrollmentId = Number(values.enrollmentId);
      const templateCategories = Array.isArray(values.templateCategories)
        ? values.templateCategories
            .map((value) => String(value))
            .filter((value) =>
              STUDENT_PACK_TEMPLATE_CATEGORY_OPTIONS.some(
                (option) => option.value === value
              )
            )
        : [];

      if (!Number.isFinite(enrollmentId)) {
        throw new Error("Please select the student's enrolment.");
      }

      if (!selectedStudentEnrolmentIds.has(enrollmentId)) {
        throw new Error("The selected enrolment does not belong to this student.");
      }

      if (templateCategories.length === 0) {
        throw new Error("Select at least one learner-pack category.");
      }

      const result = await generateStudentPackMutation.mutateAsync({
        studentId: selectedStudent.id,
        enrollmentId,
        templateCategories: templateCategories as Array<
          | "Student Pack"
          | "Course Control"
          | "Results & Certificates"
        >,
        generatedStatus: String(values.generatedStatus || "Draft") as GeneratedStatus,
      });

      toast.success(`${result.count} learner-pack documents generated.`);
      setIsGeneratePackFormOpen(false);
      await refetchDocuments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate learner pack."
      );
    } finally {
      setIsGeneratingPack(false);
    }
  };

  const columns: Column<StudentRow>[] = [
    {
      key: "studentNumber",
      label: "Student Number",
      render: (value) => value || "-",
    },
    {
      key: "firstName",
      label: "First Name",
      sortable: true,
      render: (_value, row) => getDisplayFirstName(row),
    },
    {
      key: "lastName",
      label: "Last Name",
      sortable: true,
      render: (_value, row) => getDisplayLastName(row),
    },
    {
      key: "email",
      label: "Email",
      render: (value) => value || "-",
    },
    {
      key: "phone",
      label: "Phone",
      render: (value) => value || "-",
    },
    {
      key: "idNumber",
      label: "ID Number",
      render: (value) => value || "-",
    },
    {
      key: "passportNumber",
      label: "Passport Number",
      render: (value) => value || "-",
    },
    {
      key: "isBlacklisted",
      label: "Status",
      render: (value) => (
        <span
          className={
            value
              ? "inline-block rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700"
              : "inline-block rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700"
          }
        >
          {value ? "Blacklisted" : "Active"}
        </span>
      ),
    },
  ];

  const trainingColumns: Column<TrainingRecord>[] = [
    {
      key: "enrollmentId",
      label: "Course / Schedule",
      render: (value) => {
        const enrolment = typedEnrolments.find((item) => item.id === value);
        const schedule = enrolment
          ? typedSchedules.find((item) => item.id === enrolment.courseScheduleId)
          : undefined;
        return buildScheduleLabel(schedule, typedCourses, typedBranches);
      },
    },
    { key: "assessmentType", label: "Type", sortable: true },
    { key: "attemptNumber", label: "Attempt", sortable: true },
    {
      key: "score",
      label: "Score",
      render: (_value, row) => formatScore(row.score, row.maxScore),
    },
    {
      key: "result",
      label: "Result",
      sortable: true,
      render: (value) => (
        <Badge className={getTrainingResultClass(value as TrainingRecord["result"])}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "assessmentDate",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value as string | Date),
    },
  ];

  const certificateColumns: Column<CertificateRecord>[] = [
    {
      key: "certificateNumber",
      label: "Certificate Number",
      sortable: true,
    },
    {
      key: "enrollmentId",
      label: "Course / Schedule",
      render: (value) => getCertificateContext(value as number).scheduleLabel,
    },
    {
      key: "issuedDate",
      label: "Issued",
      sortable: true,
      render: (value) => formatDate(value as string | Date),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge className={getCertificateStatusClass(value as CertificateRecord["status"])}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const formFields: FormField[] = [
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      required: true,
      section: "Personal Information",
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      required: true,
      section: "Personal Information",
    },
    {
      name: "email",
      label: "Email",
      type: "email",
      section: "Contact Information",
    },
    {
      name: "phone",
      label: "Phone",
      type: "text",
      section: "Contact Information",
    },
    {
      name: "idNumber",
      label: "ID Number",
      type: "text",
      placeholder: "13-digit SA ID number",
      section: "Identity Information",
    },
    {
      name: "passportNumber",
      label: "Passport Number",
      type: "text",
      section: "Identity Information",
    },
    {
      name: "active",
      label: "Active",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
      placeholder: "Select status",
      section: "Student Status",
    },
    {
      name: "interestType",
      label: "Training Route",
      type: "select",
      options: [
        { value: "SNT Only", label: "SNT Only" },
        { value: "PCN After Course", label: "PCN After Course" },
      ],
      placeholder: "Select route",
      section: "PCN / BINDT",
    },
    {
      name: "isCurrentPcnHolder",
      label: "Current PCN Holder",
      type: "select",
      options: [
        { value: "false", label: "No" },
        { value: "true", label: "Yes" },
      ],
      placeholder: "Select an option",
      section: "PCN / BINDT",
    },
    {
      name: "pcnNumber",
      label: "PCN Number",
      type: "text",
      placeholder: "Capture the PCN number if available",
      section: "PCN / BINDT",
    },
    {
      name: "bindtProductCompleted",
      label: "BINDT Product Completed",
      type: "select",
      options: [
        { value: "false", label: "No" },
        { value: "true", label: "Yes" },
      ],
      placeholder: "Select an option",
      section: "PCN / BINDT",
    },
  ];

  const trainingRecordFields: FormField[] = [
    {
      name: "enrollmentId",
      label: "Enrolment",
      type: "select",
      required: true,
      options: studentEnrolmentOptions,
      placeholder: "Select enrolment",
      disabled: Boolean(editingTrainingRecord),
    },
    {
      name: "assessmentType",
      label: "Record Type",
      type: "select",
      required: true,
      options: [
        { value: "Practical", label: "Practical" },
        { value: "Theory", label: "Theory" },
      ],
    },
    {
      name: "attemptNumber",
      label: "Attempt Number",
      type: "number",
      required: true,
    },
    {
      name: "assessorId",
      label: "Assessor",
      type: "select",
      options: assessorOptions,
      placeholder: "Select assessor",
    },
    {
      name: "assessmentDate",
      label: "Training Date",
      type: "date",
      required: true,
    },
    {
      name: "score",
      label: "Score",
      type: "number",
    },
    {
      name: "maxScore",
      label: "Max Score",
      type: "number",
    },
    {
      name: "result",
      label: "Result",
      type: "select",
      required: true,
      options: [
        { value: "Incomplete", label: "Incomplete" },
        { value: "Pass", label: "Pass" },
        { value: "Fail", label: "Fail" },
      ],
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
    },
  ];

  const certificateFields: FormField[] = [
    {
      name: "enrollmentId",
      label: "Enrolment",
      type: "select",
      required: true,
      options: studentEnrolmentOptions,
      placeholder: "Select enrolment",
    },
    {
      name: "certificateNumber",
      label: "Certificate Number",
      type: "text",
      placeholder: "Leave blank to auto-generate",
    },
    {
      name: "issuedDate",
      label: "Issued Date",
      type: "date",
      required: true,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "Active", label: "Active" },
        { value: "Revoked", label: "Revoked" },
      ],
    },
    {
      name: "notes",
      label: "Notes",
      type: "textarea",
    },
    {
      name: "content",
      label: "Editable HTML Content",
      type: "textarea",
      placeholder:
        "Leave blank to auto-generate a styled certificate body, or paste your own HTML content.",
    },
  ];

  const initialValues = useMemo(
    () =>
      editingStudent
        ? {
            firstName: getDisplayFirstName(editingStudent),
            lastName: getDisplayLastName(editingStudent),
            email: editingStudent.email ?? "",
            phone: editingStudent.phone ?? "",
            idNumber: editingStudent.idNumber ?? "",
            passportNumber: editingStudent.passportNumber ?? "",
            active: String(editingStudent.active ?? true),
            interestType: editingStudent.interestType ?? "SNT Only",
            isCurrentPcnHolder: String(Boolean(editingStudent.isCurrentPcnHolder)),
            pcnNumber: editingStudent.pcnNumber ?? "",
            bindtProductCompleted: String(Boolean(editingStudent.bindtProductCompleted)),
          }
        : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            idNumber: "",
            passportNumber: "",
            active: "true",
            interestType: "SNT Only",
            isCurrentPcnHolder: "false",
            pcnNumber: "",
            bindtProductCompleted: "false",
          },
    [editingStudent]
  );

  const trainingRecordInitialValues = editingTrainingRecord
    ? {
        enrollmentId: String(editingTrainingRecord.enrollmentId),
        assessmentType: editingTrainingRecord.assessmentType,
        attemptNumber: String(editingTrainingRecord.attemptNumber ?? 1),
        assessorId: editingTrainingRecord.assessorId
          ? String(editingTrainingRecord.assessorId)
          : "",
        assessmentDate: getDateInputValue(editingTrainingRecord.assessmentDate),
        score: editingTrainingRecord.score ?? "",
        maxScore: editingTrainingRecord.maxScore ?? "",
        result: editingTrainingRecord.result,
        notes: editingTrainingRecord.notes ?? "",
      }
    : {
        enrollmentId:
          studentEnrolmentOptions.length === 1 ? studentEnrolmentOptions[0].value : "",
        assessmentType: "Practical",
        attemptNumber: "1",
        assessmentDate: getDateInputValue(new Date()),
        maxScore: "100",
        result: "Incomplete",
      };

  const certificateInitialValues = useMemo(() => {
    if (editingCertificate) {
      return {
        enrollmentId: String(editingCertificate.enrollmentId),
        certificateNumber: editingCertificate.certificateNumber,
        issuedDate: getDateInputValue(editingCertificate.issuedDate),
        status: editingCertificate.status === "Expired" ? "Active" : editingCertificate.status,
        notes: editingCertificate.notes ?? "",
        content: editingCertificate.content ?? "",
      };
    }

    return {
      enrollmentId:
        studentEnrolmentOptions.length === 1 ? studentEnrolmentOptions[0].value : "",
      certificateNumber: "",
      issuedDate: getDateInputValue(new Date()),
      status: "Active",
      notes: "",
      content: "",
    };
  }, [editingCertificate, studentEnrolmentOptions]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Students</h1>
          <Button
            onClick={() => {
              setEditingStudent(null);
              setLiveIdNumber("");
              setLivePassportNumber("");
              setError(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        {error && !isFormOpen ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isFormOpen && duplicateQuery.data?.duplicate ? (
          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>Duplicate detected.</strong>{" "}
            {duplicateQuery.data.studentMatch ? (
              <>
                {duplicateQuery.data.studentMatch.firstName}{" "}
                {duplicateQuery.data.studentMatch.lastName} already exists with this ID
                or passport number. Save will be blocked.
              </>
            ) : (
              <>A student with this ID or passport number already exists.</>
            )}
          </div>
        ) : null}

        <DataTable
          data={typedStudents}
          columns={columns}
          isLoading={isLoading}
          onRowClick={(student) => setSelectedStudent(student)}
          actions={(student: StudentRow) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingStudent(student);
                  setLiveIdNumber(student.idNumber ?? "");
                  setLivePassportNumber(student.passportNumber ?? "");
                  setError(null);
                  setIsFormOpen(true);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                variant={student.isBlacklisted ? "outline" : "secondary"}
                disabled={toggleBlacklistMutation.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggleBlacklist(student);
                }}
              >
                {student.isBlacklisted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete(student);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Training & Practical Record
              </CardTitle>
              <CardDescription>
                Keep student-linked training outcomes here. Level III service technician
                assessments stay under Level III Services.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingTrainingRecord(null);
                setIsTrainingRecordFormOpen(true);
              }}
              disabled={!selectedStudent || studentEnrolmentOptions.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Training Record
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedStudent ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Select a student from the table above to view their enrolments and
                training records.
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Student</p>
                    <p className="mt-1 font-semibold">{getStudentFullName(selectedStudent)}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedStudent.studentNumber || `Student ID ${selectedStudent.id}`}
                    </p>
                  </div>
                  <div className="rounded-md border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Enrolments</p>
                    <p className="mt-1 text-2xl font-bold">
                      {selectedStudentEnrolments.length}
                    </p>
                  </div>
                  <div className="rounded-md border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Training Records</p>
                    <p className="mt-1 text-2xl font-bold">
                      {selectedStudentTrainingRecords.length}
                    </p>
                  </div>
                  <div className="rounded-md border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Pass Rate</p>
                    <p className="mt-1 text-2xl font-bold">
                      {completedTrainingRecords.length === 0
                        ? "0%"
                        : `${Math.round(
                            (passedTrainingRecords.length / completedTrainingRecords.length) *
                              100
                          )}%`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Student Enrolments</h3>
                    <div className="mt-3 space-y-3">
                      {selectedStudentEnrolments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No enrolments linked to this student yet.
                        </p>
                      ) : (
                        selectedStudentEnrolments.map((enrolment) => {
                          const schedule = typedSchedules.find(
                            (item) => item.id === enrolment.courseScheduleId
                          );

                          return (
                            <div key={enrolment.id} className="rounded-md border p-3">
                              <p className="font-medium">
                                {buildScheduleLabel(schedule, typedCourses, typedBranches)}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <Badge variant="outline">{enrolment.status}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Enrolled {formatDate(enrolment.enrollmentDate)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 font-semibold">
                            <FileText className="h-4 w-4" />
                            Training Documents
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Generate editable learner paperwork directly from the
                            selected student and enrolment.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsGeneratePackFormOpen(true)}
                            disabled={
                              studentEnrolmentOptions.length === 0 ||
                              studentPackTemplateCount === 0
                            }
                          >
                            <Layers3 className="mr-2 h-4 w-4" />
                            Generate Pack
                          </Button>
                          <Button
                            onClick={() => setIsGenerateDocumentFormOpen(true)}
                            disabled={
                              studentEnrolmentOptions.length === 0 ||
                              studentDocumentTemplateOptions.length === 0
                            }
                          >
                            <Wand2 className="mr-2 h-4 w-4" />
                            Generate Document
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm text-muted-foreground">Generated</p>
                          <p className="mt-1 text-2xl font-bold">
                            {selectedStudentGeneratedDocuments.length}
                          </p>
                        </div>
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm text-muted-foreground">Issued</p>
                          <p className="mt-1 text-2xl font-bold">
                            {issuedGeneratedDocuments.length}
                          </p>
                        </div>
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm text-muted-foreground">Templates Ready</p>
                          <p className="mt-1 text-2xl font-bold">
                            {studentPackTemplateCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedStudentGeneratedDocuments.length === 0 ? (
                          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                            No generated training documents yet for this student.
                          </div>
                        ) : (
                          selectedStudentGeneratedDocuments.slice(0, 3).map((record) => {
                            const metadata = getDocumentMetadata(record.tags);
                            return (
                              <div
                                key={record.id}
                                className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium">{record.title}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge
                                      className={getGeneratedDocumentStatusClass(
                                        (metadata.generatedStatus as GeneratedStatus) || "Draft"
                                      )}
                                    >
                                      {metadata.generatedStatus || "Draft"}
                                    </Badge>
                                    <span>{metadata.generatedFromTemplateTitle || "Template"}</span>
                                    <span>Version {metadata.version || 1}</span>
                                    <span>{formatDate(record.createdAt)}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      openDocumentPreview(record, typedBranches)
                                    }
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      exportEditableHtmlDocument(
                                        buildDocumentExportOptions(record, typedBranches)
                                      )
                                    }
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <DataTable
                      columns={trainingColumns}
                      data={selectedStudentTrainingRecords}
                      isLoading={false}
                      searchPlaceholder="Search training records..."
                      actions={(record) => (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingTrainingRecord(record);
                              setIsTrainingRecordFormOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteTrainingRecord(record);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    />

                    <div className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="flex items-center gap-2 font-semibold">
                            <Award className="h-4 w-4" />
                            Certificates
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Issue, edit, preview, and export editable SNT-TC-1A training certificates without expiry dates.
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setEditingCertificate(null);
                            setIsCertificateFormOpen(true);
                          }}
                          disabled={studentEnrolmentOptions.length === 0}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Issue Certificate
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm text-muted-foreground">Certificates</p>
                          <p className="mt-1 text-2xl font-bold">
                            {selectedStudentCertificates.length}
                          </p>
                        </div>
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm text-muted-foreground">Active</p>
                          <p className="mt-1 text-2xl font-bold">
                            {activeCertificates.length}
                          </p>
                        </div>
                        <div className="rounded-md border bg-card p-4">
                          <p className="text-sm text-muted-foreground">Training Route</p>
                          <p className="mt-1 text-2xl font-bold">
                            {isStudentOnPcnPath(selectedStudent) ? "PCN" : "SNT"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <DataTable
                          columns={certificateColumns}
                          data={selectedStudentCertificates}
                          isLoading={false}
                          searchPlaceholder="Search certificates..."
                          actions={(record) => (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handlePreviewCertificate(record);
                                }}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  exportEditableHtmlDocument(
                                    getCertificateDocumentOptions(record)
                                  );
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingCertificate(record);
                                  setIsCertificateFormOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDeleteCertificate(record);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <FormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) {
              setEditingStudent(null);
              setLiveIdNumber("");
              setLivePassportNumber("");
              setError(null);
            }
          }}
          title={editingStudent ? "Edit Student" : "Add Student"}
          description={
            editingStudent ? "Update student information" : "Create a new student"
          }
          fields={formFields}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
          error={error}
          submitLabel={editingStudent ? "Update" : "Create"}
          onValuesChange={(values) => {
            setLiveIdNumber(String(values.idNumber || ""));
            setLivePassportNumber(String(values.passportNumber || ""));
          }}
        />

        <FormDialog
          open={isGeneratePackFormOpen}
          onOpenChange={setIsGeneratePackFormOpen}
          title="Generate Learner Pack"
          description={
            selectedStudent
              ? `Create the selected learner-pack documents for ${getStudentFullName(selectedStudent)} from one enrolment.`
              : "Create the selected learner-pack documents."
          }
          fields={[
            {
              name: "enrollmentId",
              label: "Enrolment",
              type: "select",
              options: studentEnrolmentOptions,
              required: true,
              placeholder:
                studentEnrolmentOptions.length === 0
                  ? "No enrolments available"
                  : "Select enrolment",
            },
            {
              name: "templateCategories",
              label: "Include Categories",
              type: "checkbox-group",
              required: true,
              options: STUDENT_PACK_TEMPLATE_CATEGORY_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              })),
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
          ]}
          initialValues={{
            templateCategories: STUDENT_PACK_TEMPLATE_CATEGORY_OPTIONS.map(
              (option) => option.value
            ),
            generatedStatus: "Draft",
          }}
          onSubmit={handleGenerateStudentPack}
          isLoading={isGeneratingPack}
          submitLabel="Generate Pack"
        />

        <FormDialog
          open={isGenerateDocumentFormOpen}
          onOpenChange={setIsGenerateDocumentFormOpen}
          title="Generate Training Document"
          description={
            selectedStudent
              ? `Create editable paperwork for ${getStudentFullName(selectedStudent)} from the selected enrolment.`
              : "Create editable paperwork for the selected student."
          }
          fields={[
            {
              name: "templateId",
              label: "Template",
              type: "select",
              options: studentDocumentTemplateOptions,
              required: true,
              placeholder:
                studentDocumentTemplateOptions.length === 0
                  ? "Load templates in Documents first"
                  : "Select template",
            },
            {
              name: "enrollmentId",
              label: "Enrolment",
              type: "select",
              options: studentEnrolmentOptions,
              required: true,
              placeholder:
                studentEnrolmentOptions.length === 0
                  ? "No enrolments available"
                  : "Select enrolment",
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
          onSubmit={handleGenerateStudentDocument}
          isLoading={isGeneratingDocument}
          submitLabel="Generate"
        />

        <FormDialog
          open={isTrainingRecordFormOpen}
          onOpenChange={(open) => {
            setIsTrainingRecordFormOpen(open);
            if (!open) {
              setEditingTrainingRecord(null);
            }
          }}
          title={editingTrainingRecord ? "Edit Training Record" : "Add Training Record"}
          description={
            selectedStudent
              ? `Training outcome for ${getStudentFullName(selectedStudent)}.`
              : "Training outcome for selected student."
          }
          fields={trainingRecordFields}
          initialValues={trainingRecordInitialValues}
          onSubmit={handleTrainingRecordSubmit}
          isLoading={isTrainingRecordSubmitting}
          submitLabel={editingTrainingRecord ? "Update" : "Save"}
        />

        <FormDialog
          open={isCertificateFormOpen}
          onOpenChange={(open) => {
            setIsCertificateFormOpen(open);
            if (!open) {
              setEditingCertificate(null);
            }
          }}
          title={editingCertificate ? "Edit Certificate" : "Issue Certificate"}
          description={
            selectedStudent
              ? `Certificate for ${getStudentFullName(selectedStudent)}. Leave the content blank to auto-generate an editable certificate body.`
              : "Certificate for selected student."
          }
          fields={certificateFields}
          initialValues={certificateInitialValues}
          onSubmit={handleCertificateSubmit}
          isLoading={isCertificateSubmitting}
          submitLabel={editingCertificate ? "Update" : "Issue"}
        />
      </div>
    </DashboardLayout>
  );
}
