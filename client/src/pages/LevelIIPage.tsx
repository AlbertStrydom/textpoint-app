import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  exportEditableHtmlDocument,
  exportTableToCSV,
  exportTableToPDF,
} from "@/lib/exportUtils";
import { toast } from "sonner";

type CourseLevel = "Level 1" | "Level 2" | "Level 3";
type ScheduleStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";
type EnrollmentStatus = "Active" | "Completed" | "Withdrawn" | "Suspended";
type AssessmentResult = "Pass" | "Fail" | "Incomplete";
type CertificateStatus = "Active" | "Expired" | "Revoked";

type CourseRecord = {
  id: number;
  code: string | null;
  name: string;
  level: CourseLevel;
  duration: number | null;
  branchId: number | null;
  active: boolean;
};

type BranchRecord = {
  id: number;
  name: string;
  companyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

type ScheduleRecord = {
  id: number;
  courseId: number;
  branchId: number | null;
  startDate: string | Date;
  endDate: string | Date;
  maxCapacity: number | null;
  enrolledCount?: number | null;
  status: ScheduleStatus;
};

type EnrollmentRecord = {
  id: number;
  studentId: number;
  courseScheduleId: number;
  enrollmentDate: string | Date;
  status: EnrollmentStatus;
};

type StudentRecord = {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string | null;
};

type AssessmentRecord = {
  id: number;
  enrollmentId: number;
  assessmentType: "Theory" | "Practical";
  result: AssessmentResult;
  assessmentDate: string | Date;
  score: string | number | null;
  maxScore: string | number | null;
};

type CertificateRecord = {
  id: number;
  enrollmentId: number;
  certificateNumber: string;
  issuedDate: string | Date;
  expiryDate: string | Date | null;
  status: CertificateStatus;
};

type ScheduleRow = {
  id: number;
  courseLabel: string;
  branchName: string;
  deliveryWindow: string;
  status: ScheduleStatus;
  seats: string;
  participantCount: number;
  activeCount: number;
  completedCount: number;
  assessmentPassRate: string;
  certificateCount: number;
};

type ParticipantReadiness =
  | "Certified"
  | "Ready to Issue"
  | "Assessment Outstanding"
  | "Re-assessment Needed"
  | "Withdrawn"
  | "Suspended"
  | "In Progress";

type ParticipantRow = {
  id: number;
  scheduleId: number;
  studentName: string;
  studentNumber: string;
  courseLabel: string;
  branchName: string;
  deliveryWindow: string;
  enrollmentStatus: EnrollmentStatus;
  assessmentStatus: string;
  certificateStatus: string;
  readiness: ParticipantReadiness;
};

type AssessmentRow = {
  id: number;
  scheduleId: number;
  studentName: string;
  courseLabel: string;
  branchName: string;
  assessmentType: "Theory" | "Practical";
  result: AssessmentResult;
  assessmentDate: string | Date;
  score: string;
  certificateStatus: string;
};

type CertificateRow = {
  id: number;
  scheduleId: number;
  studentName: string;
  courseLabel: string;
  branchName: string;
  certificateNumber: string;
  issuedDate: string | Date;
  expiryDate: string | Date | null;
  status: CertificateStatus;
};

function parseDateValue(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: string | Date | null | undefined) {
  const parsed = parseDateValue(value);
  return parsed
    ? parsed.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
}

function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (start === "-" && end === "-") return "Dates not set";
  return `${start} to ${end}`;
}

function isDateWithinNextDays(
  value: string | Date | null | undefined,
  days: number,
  today: Date
) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;

  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const target = new Date(parsed);
  target.setHours(0, 0, 0, 0);
  const limit = new Date(todayStart);
  limit.setDate(limit.getDate() + days);

  return target.getTime() >= todayStart.getTime() && target.getTime() <= limit.getTime();
}

function buildCourseLabel(course: CourseRecord | null | undefined) {
  if (!course) return "Unknown Level II course";
  return course.code ? `${course.code} - ${course.name}` : course.name;
}

function formatScore(score: string | number | null, maxScore: string | number | null) {
  if (score === null || score === undefined || score === "") return "-";
  if (maxScore === null || maxScore === undefined || maxScore === "") return String(score);
  return `${score}/${maxScore}`;
}

function formatPercentage(numerator: number, denominator: number) {
  if (!denominator) return "-";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getStatusBadgeClass(status: ScheduleStatus | EnrollmentStatus | CertificateStatus) {
  switch (status) {
    case "Active":
    case "In Progress":
      return "bg-emerald-100 text-emerald-800";
    case "Completed":
      return "bg-slate-200 text-slate-800";
    case "Scheduled":
      return "bg-blue-100 text-blue-800";
    case "Cancelled":
    case "Withdrawn":
    case "Revoked":
      return "bg-red-100 text-red-800";
    case "Suspended":
    case "Expired":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function getAssessmentBadgeClass(result: AssessmentResult) {
  switch (result) {
    case "Pass":
      return "bg-emerald-100 text-emerald-800";
    case "Fail":
      return "bg-red-100 text-red-800";
    case "Incomplete":
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function getReadinessBadgeClass(readiness: ParticipantReadiness) {
  switch (readiness) {
    case "Certified":
      return "bg-emerald-100 text-emerald-800";
    case "Ready to Issue":
      return "bg-blue-100 text-blue-800";
    case "Assessment Outstanding":
      return "bg-amber-100 text-amber-800";
    case "Re-assessment Needed":
      return "bg-red-100 text-red-800";
    case "Withdrawn":
    case "Suspended":
      return "bg-slate-200 text-slate-800";
    case "In Progress":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getSeatLabel(schedule: ScheduleRecord) {
  const max = schedule.maxCapacity ?? 0;
  const used = schedule.enrolledCount ?? 0;
  if (!max) return "Open capacity";
  const remaining = Math.max(max - used, 0);
  if (remaining === 0) return `Full (${used}/${max})`;
  return `${remaining} left (${used}/${max})`;
}

function pickLatestByDate<T extends { id: number }>(
  rows: T[],
  getDate: (row: T) => string | Date | null | undefined
) {
  return rows.reduce<T | null>((latest, row) => {
    if (!latest) return row;

    const latestTime = parseDateValue(getDate(latest))?.getTime() ?? 0;
    const currentTime = parseDateValue(getDate(row))?.getTime() ?? 0;
    if (currentTime > latestTime) return row;
    if (currentTime === latestTime && row.id > latest.id) return row;
    return latest;
  }, null);
}

function buildSummaryHtml(options: {
  generatedAt: string;
  branchScope: string;
  courseScope: string;
  scheduleScope: string;
  highlights: Array<{ label: string; value: number | string }>;
  sections: Array<{ title: string; rows: Array<{ label: string; value: number | string }> }>;
}) {
  const highlights = options.highlights
    .map((item) => `<tr><th>${item.label}</th><td>${String(item.value)}</td></tr>`)
    .join("");
  const sections = options.sections
    .map(
      (section) => `
        <section>
          <h2>${section.title}</h2>
          <table>
            <tbody>
              ${section.rows
                .map((row) => `<tr><th>${row.label}</th><td>${String(row.value)}</td></tr>`)
                .join("")}
            </tbody>
          </table>
        </section>
      `
    )
    .join("");

  return `
    <section>
      <h2>Scope</h2>
      <p><strong>Generated:</strong> ${options.generatedAt}</p>
      <p><strong>Branch:</strong> ${options.branchScope}</p>
      <p><strong>Course:</strong> ${options.courseScope}</p>
      <p><strong>Schedule Status:</strong> ${options.scheduleScope}</p>
    </section>
    <section>
      <h2>Highlights</h2>
      <table>
        <tbody>${highlights}</tbody>
      </table>
    </section>
    ${sections}
  `;
}

export default function LevelIIPage() {
  const today = useMemo(() => new Date(), []);
  const [activeTab, setActiveTab] = useState("overview");
  const [branchFilter, setBranchFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState("all");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);

  const { data: courses = [], isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: branches = [], isLoading: branchesLoading } = trpc.branches.list.useQuery();
  const { data: schedules = [], isLoading: schedulesLoading } = trpc.courseSchedules.list.useQuery();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = trpc.enrollments.list.useQuery();
  const { data: assessments = [], isLoading: assessmentsLoading } = trpc.assessments.list.useQuery();
  const { data: certificates = [], isLoading: certificatesLoading } = trpc.certificates.list.useQuery();
  const { data: students = [], isLoading: studentsLoading } = trpc.students.list.useQuery();

  const typedCourses = courses as CourseRecord[];
  const typedBranches = branches as BranchRecord[];
  const typedSchedules = schedules as ScheduleRecord[];
  const typedEnrollments = enrollments as EnrollmentRecord[];
  const typedAssessments = assessments as AssessmentRecord[];
  const typedCertificates = certificates as CertificateRecord[];
  const typedStudents = students as StudentRecord[];

  const isLoading =
    coursesLoading ||
    branchesLoading ||
    schedulesLoading ||
    enrollmentsLoading ||
    assessmentsLoading ||
    certificatesLoading ||
    studentsLoading;

  const levelIICourses = useMemo(
    () => typedCourses.filter((course) => course.level === "Level 2"),
    [typedCourses]
  );

  const levelIICourseIds = useMemo(
    () => new Set(levelIICourses.map((course) => course.id)),
    [levelIICourses]
  );

  const branchOptions = useMemo(
    () => [
      { value: "all", label: "All branches" },
      ...typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [typedBranches]
  );

  const courseOptions = useMemo(
    () => [
      { value: "all", label: "All Level II courses" },
      ...levelIICourses.map((course) => ({
        value: String(course.id),
        label: buildCourseLabel(course),
      })),
    ],
    [levelIICourses]
  );

  const filteredSchedules = useMemo(() => {
    return typedSchedules.filter((schedule) => {
      if (!levelIICourseIds.has(schedule.courseId)) return false;
      if (branchFilter !== "all" && String(schedule.branchId ?? "") !== branchFilter) {
        return false;
      }
      if (courseFilter !== "all" && String(schedule.courseId) !== courseFilter) {
        return false;
      }
      if (scheduleStatusFilter !== "all" && schedule.status !== scheduleStatusFilter) {
        return false;
      }
      return true;
    });
  }, [branchFilter, courseFilter, levelIICourseIds, scheduleStatusFilter, typedSchedules]);

  const filteredScheduleIds = useMemo(
    () => new Set(filteredSchedules.map((schedule) => schedule.id)),
    [filteredSchedules]
  );

  const filteredEnrollments = useMemo(
    () =>
      typedEnrollments.filter((enrollment) =>
        filteredScheduleIds.has(enrollment.courseScheduleId)
      ),
    [filteredScheduleIds, typedEnrollments]
  );

  const filteredEnrollmentIds = useMemo(
    () => new Set(filteredEnrollments.map((enrollment) => enrollment.id)),
    [filteredEnrollments]
  );

  const filteredAssessments = useMemo(
    () =>
      typedAssessments.filter((assessment) =>
        filteredEnrollmentIds.has(assessment.enrollmentId)
      ),
    [filteredEnrollmentIds, typedAssessments]
  );

  const filteredCertificates = useMemo(
    () =>
      typedCertificates.filter((certificate) =>
        filteredEnrollmentIds.has(certificate.enrollmentId)
      ),
    [filteredEnrollmentIds, typedCertificates]
  );

  const latestAssessmentByEnrollment = useMemo(() => {
    const grouped = new Map<number, AssessmentRecord[]>();
    for (const assessment of filteredAssessments) {
      const current = grouped.get(assessment.enrollmentId) ?? [];
      current.push(assessment);
      grouped.set(assessment.enrollmentId, current);
    }

    return new Map(
      Array.from(grouped.entries()).map(([enrollmentId, rows]) => [
        enrollmentId,
        pickLatestByDate(rows, (row) => row.assessmentDate),
      ])
    );
  }, [filteredAssessments]);

  const latestCertificateByEnrollment = useMemo(() => {
    const grouped = new Map<number, CertificateRecord[]>();
    for (const certificate of filteredCertificates) {
      const current = grouped.get(certificate.enrollmentId) ?? [];
      current.push(certificate);
      grouped.set(certificate.enrollmentId, current);
    }

    return new Map(
      Array.from(grouped.entries()).map(([enrollmentId, rows]) => [
        enrollmentId,
        pickLatestByDate(rows, (row) => row.issuedDate),
      ])
    );
  }, [filteredCertificates]);

  const participantRows = useMemo<ParticipantRow[]>(() => {
    return filteredEnrollments.map((enrollment) => {
      const student = typedStudents.find((item) => item.id === enrollment.studentId);
      const schedule = filteredSchedules.find((item) => item.id === enrollment.courseScheduleId);
      const course = typedCourses.find((item) => item.id === schedule?.courseId);
      const branch = typedBranches.find((item) => item.id === schedule?.branchId);
      const latestAssessment = latestAssessmentByEnrollment.get(enrollment.id) ?? null;
      const latestCertificate = latestCertificateByEnrollment.get(enrollment.id) ?? null;

      let readiness: ParticipantReadiness = "In Progress";
      if (enrollment.status === "Withdrawn") {
        readiness = "Withdrawn";
      } else if (enrollment.status === "Suspended") {
        readiness = "Suspended";
      } else if (latestCertificate?.status === "Active") {
        readiness = "Certified";
      } else if (latestAssessment?.result === "Fail") {
        readiness = "Re-assessment Needed";
      } else if (enrollment.status === "Completed" && latestAssessment?.result === "Pass") {
        readiness = "Ready to Issue";
      } else if (!latestAssessment || latestAssessment.result === "Incomplete") {
        readiness = "Assessment Outstanding";
      }

      return {
        id: enrollment.id,
        scheduleId: enrollment.courseScheduleId,
        studentName: student ? `${student.firstName} ${student.lastName}` : `Student ${enrollment.studentId}`,
        studentNumber: student?.studentNumber || "-",
        courseLabel: buildCourseLabel(course),
        branchName: branch?.name || "Unassigned",
        deliveryWindow: formatDateRange(schedule?.startDate, schedule?.endDate),
        enrollmentStatus: enrollment.status,
        assessmentStatus: latestAssessment
          ? `${latestAssessment.assessmentType} - ${latestAssessment.result}`
          : "Not recorded",
        certificateStatus: latestCertificate ? latestCertificate.status : "Not issued",
        readiness,
      };
    });
  }, [
    filteredEnrollments,
    filteredSchedules,
    latestAssessmentByEnrollment,
    latestCertificateByEnrollment,
    typedBranches,
    typedCourses,
    typedStudents,
  ]);

  const assessmentRows = useMemo<AssessmentRow[]>(() => {
    return filteredAssessments.map((assessment) => {
      const enrollment = filteredEnrollments.find((item) => item.id === assessment.enrollmentId);
      const schedule = filteredSchedules.find((item) => item.id === enrollment?.courseScheduleId);
      const student = typedStudents.find((item) => item.id === enrollment?.studentId);
      const course = typedCourses.find((item) => item.id === schedule?.courseId);
      const branch = typedBranches.find((item) => item.id === schedule?.branchId);
      const latestCertificate = latestCertificateByEnrollment.get(assessment.enrollmentId) ?? null;

      return {
        id: assessment.id,
        scheduleId: schedule?.id ?? 0,
        studentName: student ? `${student.firstName} ${student.lastName}` : `Student ${enrollment?.studentId ?? "-"}`,
        courseLabel: buildCourseLabel(course),
        branchName: branch?.name || "Unassigned",
        assessmentType: assessment.assessmentType,
        result: assessment.result,
        assessmentDate: assessment.assessmentDate,
        score: formatScore(assessment.score, assessment.maxScore),
        certificateStatus: latestCertificate ? latestCertificate.status : "Not issued",
      };
    });
  }, [
    filteredAssessments,
    filteredEnrollments,
    filteredSchedules,
    latestCertificateByEnrollment,
    typedBranches,
    typedCourses,
    typedStudents,
  ]);

  const certificateRows = useMemo<CertificateRow[]>(() => {
    return filteredCertificates.map((certificate) => {
      const enrollment = filteredEnrollments.find((item) => item.id === certificate.enrollmentId);
      const schedule = filteredSchedules.find((item) => item.id === enrollment?.courseScheduleId);
      const student = typedStudents.find((item) => item.id === enrollment?.studentId);
      const course = typedCourses.find((item) => item.id === schedule?.courseId);
      const branch = typedBranches.find((item) => item.id === schedule?.branchId);

      return {
        id: certificate.id,
        scheduleId: schedule?.id ?? 0,
        studentName: student ? `${student.firstName} ${student.lastName}` : `Student ${enrollment?.studentId ?? "-"}`,
        courseLabel: buildCourseLabel(course),
        branchName: branch?.name || "Unassigned",
        certificateNumber: certificate.certificateNumber,
        issuedDate: certificate.issuedDate,
        expiryDate: certificate.expiryDate,
        status: certificate.status,
      };
    });
  }, [filteredCertificates, filteredEnrollments, filteredSchedules, typedBranches, typedCourses, typedStudents]);

  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    return filteredSchedules.map((schedule) => {
      const course = typedCourses.find((item) => item.id === schedule.courseId);
      const branch = typedBranches.find((item) => item.id === schedule.branchId);
      const scheduleEnrollments = filteredEnrollments.filter(
        (enrollment) => enrollment.courseScheduleId === schedule.id
      );
      const latestAssessments = scheduleEnrollments
        .map((enrollment) => latestAssessmentByEnrollment.get(enrollment.id) ?? null)
        .filter((row): row is AssessmentRecord => Boolean(row));
      const passCount = latestAssessments.filter((assessment) => assessment.result === "Pass").length;
      const completedAssessments = latestAssessments.filter(
        (assessment) => assessment.result !== "Incomplete"
      ).length;
      const certificateCount = scheduleEnrollments.filter((enrollment) =>
        Boolean(latestCertificateByEnrollment.get(enrollment.id))
      ).length;

      return {
        id: schedule.id,
        courseLabel: buildCourseLabel(course),
        branchName: branch?.name || "Unassigned",
        deliveryWindow: formatDateRange(schedule.startDate, schedule.endDate),
        status: schedule.status,
        seats: getSeatLabel(schedule),
        participantCount: scheduleEnrollments.length,
        activeCount: scheduleEnrollments.filter((enrollment) => enrollment.status === "Active").length,
        completedCount: scheduleEnrollments.filter((enrollment) => enrollment.status === "Completed").length,
        assessmentPassRate: formatPercentage(passCount, completedAssessments),
        certificateCount,
      };
    });
  }, [
    filteredEnrollments,
    filteredSchedules,
    latestAssessmentByEnrollment,
    latestCertificateByEnrollment,
    typedBranches,
    typedCourses,
  ]);

  useEffect(() => {
    if (!scheduleRows.length) {
      setSelectedScheduleId(null);
      return;
    }

    if (!scheduleRows.some((row) => row.id === selectedScheduleId)) {
      setSelectedScheduleId(scheduleRows[0].id);
    }
  }, [scheduleRows, selectedScheduleId]);

  const selectedSchedule = scheduleRows.find((row) => row.id === selectedScheduleId) ?? null;
  const selectedScheduleParticipants = participantRows.filter(
    (participant) => participant.scheduleId === selectedScheduleId
  );
  const selectedScheduleAssessments = assessmentRows.filter(
    (assessment) => assessment.scheduleId === selectedScheduleId
  );
  const selectedScheduleCertificates = certificateRows.filter(
    (certificate) => certificate.scheduleId === selectedScheduleId
  );

  const readyToIssueRows = participantRows.filter(
    (participant) => participant.readiness === "Ready to Issue"
  );
  const assessmentOutstandingRows = participantRows.filter(
    (participant) => participant.readiness === "Assessment Outstanding"
  );
  const expiringCertificates = certificateRows.filter(
    (certificate) =>
      certificate.status === "Active" &&
      isDateWithinNextDays(certificate.expiryDate, 90, today)
  );

  const summary = useMemo(() => {
    const liveSchedules = scheduleRows.filter(
      (schedule) => schedule.status === "Scheduled" || schedule.status === "In Progress"
    ).length;
    const activeParticipants = participantRows.filter(
      (participant) => participant.enrollmentStatus === "Active"
    ).length;
    const completedParticipants = participantRows.filter(
      (participant) => participant.enrollmentStatus === "Completed"
    ).length;
    const completedAssessments = assessmentRows.filter(
      (assessment) => assessment.result !== "Incomplete"
    );
    const passedAssessments = completedAssessments.filter(
      (assessment) => assessment.result === "Pass"
    ).length;

    return {
      levelIICourses: levelIICourses.length,
      liveSchedules,
      activeParticipants,
      completedParticipants,
      pendingAssessmentReviews: assessmentOutstandingRows.length,
      certificatesIssued: certificateRows.length,
      passRate: formatPercentage(passedAssessments, completedAssessments.length),
    };
  }, [assessmentOutstandingRows.length, assessmentRows, certificateRows.length, levelIICourses.length, participantRows, scheduleRows]);

  const participantColumns: Column<ParticipantRow>[] = [
    { key: "studentName", label: "Student", sortable: true, filterable: true },
    { key: "studentNumber", label: "Student No.", sortable: true },
    { key: "courseLabel", label: "Course", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true, filterable: true },
    { key: "deliveryWindow", label: "Schedule", sortable: true },
    {
      key: "enrollmentStatus",
      label: "Enrolment",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getStatusBadgeClass(value as EnrollmentStatus)}>
          {String(value)}
        </Badge>
      ),
    },
    { key: "assessmentStatus", label: "Latest Assessment", sortable: true },
    { key: "certificateStatus", label: "Certificate", sortable: true },
    {
      key: "readiness",
      label: "Readiness",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getReadinessBadgeClass(value as ParticipantReadiness)}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const scheduleColumns: Column<ScheduleRow>[] = [
    { key: "courseLabel", label: "Course", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true, filterable: true },
    { key: "deliveryWindow", label: "Delivery Window", sortable: true },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getStatusBadgeClass(value as ScheduleStatus)}>
          {String(value)}
        </Badge>
      ),
    },
    { key: "seats", label: "Seats", sortable: true },
    { key: "participantCount", label: "Participants", sortable: true },
    { key: "assessmentPassRate", label: "Pass Rate", sortable: true },
    { key: "certificateCount", label: "Certificates", sortable: true },
  ];

  const assessmentColumns: Column<AssessmentRow>[] = [
    { key: "studentName", label: "Student", sortable: true, filterable: true },
    { key: "courseLabel", label: "Course", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true },
    { key: "assessmentType", label: "Type", sortable: true },
    {
      key: "result",
      label: "Result",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getAssessmentBadgeClass(value as AssessmentResult)}>
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
    { key: "score", label: "Score", sortable: true },
    { key: "certificateStatus", label: "Certificate", sortable: true },
  ];

  const certificateColumns: Column<CertificateRow>[] = [
    { key: "studentName", label: "Student", sortable: true, filterable: true },
    { key: "courseLabel", label: "Course", sortable: true, filterable: true },
    { key: "branchName", label: "Branch", sortable: true },
    { key: "certificateNumber", label: "Certificate No.", sortable: true },
    {
      key: "issuedDate",
      label: "Issued",
      sortable: true,
      render: (value) => formatDate(value as string | Date),
    },
    {
      key: "expiryDate",
      label: "Expiry",
      sortable: true,
      render: (value) => formatDate(value as string | Date | null),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <Badge variant="secondary" className={getStatusBadgeClass(value as CertificateStatus)}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const selectedBranch =
    branchFilter === "all"
      ? null
      : typedBranches.find((branch) => String(branch.id) === branchFilter) ?? null;
  const selectedCourse =
    courseFilter === "all"
      ? null
      : levelIICourses.find((course) => String(course.id) === courseFilter) ?? null;

  const exportParticipantsCsv = () => {
    exportTableToCSV(participantColumns, participantRows, "level-ii-participants");
    toast.success("Level II participants exported to CSV");
  };

  const exportParticipantsPdf = () => {
    exportTableToPDF(participantColumns, participantRows, "level-ii-participants", "Level II Participants");
    toast.success("Level II participants exported to PDF");
  };

  const exportSummaryHtml = () => {
    exportEditableHtmlDocument({
      filename: "level-ii-operational-summary",
      title: "Level II Operational Summary",
      subtitle: `${selectedBranch?.name || "All branches"} | ${selectedCourse ? buildCourseLabel(selectedCourse) : "All Level II courses"}`,
      content: buildSummaryHtml({
        generatedAt: new Date().toLocaleString("en-ZA"),
        branchScope: selectedBranch?.name || "All branches",
        courseScope: selectedCourse ? buildCourseLabel(selectedCourse) : "All Level II courses",
        scheduleScope: scheduleStatusFilter === "all" ? "All statuses" : scheduleStatusFilter,
        highlights: [
          { label: "Level II Courses", value: summary.levelIICourses },
          { label: "Live Schedules", value: summary.liveSchedules },
          { label: "Active Participants", value: summary.activeParticipants },
          { label: "Pending Assessments", value: summary.pendingAssessmentReviews },
          { label: "Certificates Issued", value: summary.certificatesIssued },
          { label: "Pass Rate", value: summary.passRate },
        ],
        sections: [
          {
            title: "Participant Readiness",
            rows: [
              { label: "Ready to Issue", value: readyToIssueRows.length },
              { label: "Assessment Outstanding", value: assessmentOutstandingRows.length },
              { label: "Certified", value: participantRows.filter((row) => row.readiness === "Certified").length },
              { label: "Re-assessment Needed", value: participantRows.filter((row) => row.readiness === "Re-assessment Needed").length },
            ],
          },
          {
            title: "Schedule Delivery",
            rows: [
              { label: "Filtered Schedules", value: scheduleRows.length },
              { label: "Completed Participants", value: summary.completedParticipants },
              { label: "Assessments Recorded", value: assessmentRows.length },
              { label: "Certificates Expiring In 90 Days", value: expiringCertificates.length },
            ],
          },
        ],
      }),
      design: {
        accentColor: selectedBranch?.primaryColor || "#0f766e",
        companyName: selectedBranch?.companyName || selectedBranch?.name || "TextPoint",
        logoUrl: selectedBranch?.logoUrl || "",
      },
    });
    toast.success("Level II operational summary exported");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Level II</h1>
            <p className="text-muted-foreground">
              Run Level II delivery from your live course, schedule, enrolment, assessment, and certificate data.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportParticipantsCsv}>
              <Download className="mr-2 h-4 w-4" />
              Participants CSV
            </Button>
            <Button variant="outline" onClick={exportParticipantsPdf}>
              <FileText className="mr-2 h-4 w-4" />
              Participants PDF
            </Button>
            <Button onClick={exportSummaryHtml}>
              <Award className="mr-2 h-4 w-4" />
              Export Summary
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Operational Filters</CardTitle>
            <CardDescription>
              Narrow the Level II view by branch, course, or delivery status. Everything below updates from the same live data scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Branch</label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch.value} value={branch.value}>
                        {branch.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Course</label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Level II courses" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseOptions.map((course) => (
                      <SelectItem key={course.value} value={course.value}>
                        {course.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Schedule Status</label>
                <Select value={scheduleStatusFilter} onValueChange={setScheduleStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium">Live Schedules</p>
                <p className="mt-2 text-3xl font-bold">{summary.liveSchedules}</p>
                <p className="mt-1 text-xs text-muted-foreground">Scheduled and in-progress Level II delivery</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">Active Participants</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{summary.activeParticipants}</p>
                <p className="mt-1 text-xs text-blue-700">Current enrolments within this Level II scope</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Pending Assessments</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{summary.pendingAssessmentReviews}</p>
                <p className="mt-1 text-xs text-amber-700">Participants still missing a usable assessment outcome</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Pass Rate</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{summary.passRate}</p>
                <p className="mt-1 text-xs text-emerald-700">Across completed Level II assessments in scope</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Level II Schedules
                </CardTitle>
                <CardDescription>
                  Select a schedule to inspect participant readiness, assessment progress, and certificate coverage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={scheduleColumns}
                  data={scheduleRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search Level II schedules..."
                  onRowClick={(row) => setSelectedScheduleId(row.id)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedSchedule
                    ? `${selectedSchedule.courseLabel} | ${selectedSchedule.deliveryWindow}`
                    : "Schedule Detail"}
                </CardTitle>
                <CardDescription>
                  {selectedSchedule
                    ? `${selectedSchedule.branchName} | ${selectedSchedule.status}`
                    : "Select a Level II schedule from the table above."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedSchedule ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No Level II schedule selected yet.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Participants</p>
                        <p className="mt-2 text-3xl font-bold">{selectedSchedule.participantCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedSchedule.activeCount} active | {selectedSchedule.completedCount} completed
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Seats</p>
                        <p className="mt-2 font-semibold">{selectedSchedule.seats}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Capacity status from the live schedule</p>
                      </div>
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Assessment Pass Rate</p>
                        <p className="mt-2 text-3xl font-bold">{selectedSchedule.assessmentPassRate}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Latest completed outcomes for this schedule</p>
                      </div>
                      <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm text-muted-foreground">Certificates</p>
                        <p className="mt-2 text-3xl font-bold">{selectedSchedule.certificateCount}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Issued against this Level II schedule</p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border bg-background p-4">
                        <h3 className="font-semibold">Readiness Queue</h3>
                        <div className="mt-3 space-y-2">
                          {selectedScheduleParticipants.filter((row) => row.readiness !== "Certified").slice(0, 6).map((row) => (
                            <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                              <div>
                                <p className="font-medium">{row.studentName}</p>
                                <p className="text-muted-foreground">{row.assessmentStatus}</p>
                              </div>
                              <Badge variant="secondary" className={getReadinessBadgeClass(row.readiness)}>
                                {row.readiness}
                              </Badge>
                            </div>
                          ))}
                          {selectedScheduleParticipants.filter((row) => row.readiness !== "Certified").length === 0 ? (
                            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                              No open readiness items for this schedule.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-xl border bg-background p-4">
                        <h3 className="font-semibold">Issued Certificates</h3>
                        <div className="mt-3 space-y-2">
                          {selectedScheduleCertificates.slice(0, 6).map((certificate) => (
                            <div key={certificate.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                              <div>
                                <p className="font-medium">{certificate.studentName}</p>
                                <p className="text-muted-foreground">{certificate.certificateNumber}</p>
                              </div>
                              <Badge variant="secondary" className={getStatusBadgeClass(certificate.status)}>
                                {certificate.status}
                              </Badge>
                            </div>
                          ))}
                          {selectedScheduleCertificates.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                              No certificates issued for this schedule yet.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Level II Participants</CardTitle>
                  <CardDescription>
                    Participants are pulled directly from Level II course enrolments, with the latest assessment and certificate status shown beside each learner.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportParticipantsCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button variant="outline" onClick={exportParticipantsPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={participantColumns}
                  data={participantRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search Level II participants..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Pass</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">
                  {assessmentRows.filter((row) => row.result === "Pass").length}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-900">Fail</p>
                <p className="mt-2 text-3xl font-bold text-red-900">
                  {assessmentRows.filter((row) => row.result === "Fail").length}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Incomplete</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {assessmentRows.filter((row) => row.result === "Incomplete").length}
                </p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Assessment Tracking</CardTitle>
                <CardDescription>
                  Monitor Level II assessment outcomes and see whether the participant has already moved through to certificate stage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={assessmentColumns}
                  data={assessmentRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search Level II assessments..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">Ready To Issue</p>
                <p className="mt-2 text-3xl font-bold text-blue-900">{readyToIssueRows.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Issued</p>
                <p className="mt-2 text-3xl font-bold text-emerald-900">{certificateRows.length}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900">Expiring In 90 Days</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{expiringCertificates.length}</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Certificate Register</CardTitle>
                <CardDescription>
                  Existing Level II certificates together with the live queue of participants who are ready for issue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border bg-background p-4">
                  <h3 className="font-semibold">Ready To Issue</h3>
                  <div className="mt-3 space-y-2">
                    {readyToIssueRows.slice(0, 8).map((row) => (
                      <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium">{row.studentName}</p>
                          <p className="text-muted-foreground">{row.courseLabel}</p>
                        </div>
                        <Badge variant="secondary" className={getReadinessBadgeClass(row.readiness)}>
                          {row.readiness}
                        </Badge>
                      </div>
                    ))}
                    {readyToIssueRows.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        No participants are currently waiting for certificate issue.
                      </div>
                    ) : null}
                  </div>
                </div>

                <DataTable
                  columns={certificateColumns}
                  data={certificateRows}
                  isLoading={isLoading}
                  searchPlaceholder="Search Level II certificates..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Operational Reporting</CardTitle>
                <CardDescription>
                  Export the current filtered Level II snapshot or use the live watchlists below to focus follow-up work.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      Active Participants
                    </div>
                    <p className="mt-2 text-3xl font-bold">{summary.activeParticipants}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldAlert className="h-4 w-4" />
                      Assessment Queue
                    </div>
                    <p className="mt-2 text-3xl font-bold">{assessmentOutstandingRows.length}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      Ready To Issue
                    </div>
                    <p className="mt-2 text-3xl font-bold">{readyToIssueRows.length}</p>
                  </div>
                  <div className="rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Certificates Expiring
                    </div>
                    <p className="mt-2 text-3xl font-bold">{expiringCertificates.length}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={exportSummaryHtml}>
                    <Award className="mr-2 h-4 w-4" />
                    Export Level II Summary
                  </Button>
                  <Button variant="outline" onClick={exportParticipantsCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Participants CSV
                  </Button>
                  <Button variant="outline" onClick={exportParticipantsPdf}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export Participants PDF
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="font-semibold">Assessment Watchlist</h3>
                    <div className="mt-3 space-y-2">
                      {assessmentOutstandingRows.slice(0, 8).map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{row.studentName}</p>
                            <p className="text-muted-foreground">{row.courseLabel}</p>
                          </div>
                          <Badge variant="secondary" className={getReadinessBadgeClass(row.readiness)}>
                            {row.readiness}
                          </Badge>
                        </div>
                      ))}
                      {assessmentOutstandingRows.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          No assessment watchlist items in the current Level II scope.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="font-semibold">Certificate Expiry Watchlist</h3>
                    <div className="mt-3 space-y-2">
                      {expiringCertificates.slice(0, 8).map((row) => (
                        <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{row.studentName}</p>
                            <p className="text-muted-foreground">
                              {row.certificateNumber} | Expires {formatDate(row.expiryDate)}
                            </p>
                          </div>
                          <Badge variant="secondary" className={getStatusBadgeClass(row.status)}>
                            {row.status}
                          </Badge>
                        </div>
                      ))}
                      {expiringCertificates.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                          No Level II certificates are expiring in the next 90 days.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
