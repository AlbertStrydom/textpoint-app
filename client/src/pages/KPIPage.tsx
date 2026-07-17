import React, { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDialog } from "@/components/FormDialog";
import { toast } from "sonner";

type KPIStatus = "Draft" | "Submitted" | "Approved" | "Rejected";
type KPIQuestionType = "Text" | "MultipleChoice" | "Rating" | "YesNo";

type Branch = {
  id: number;
  name: string;
};

type Course = {
  id: number;
  name: string;
  code: string | null;
};

type CourseSchedule = {
  id: number;
  courseId: number;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
};

type Lecturer = {
  id: number;
  firstName: string;
  lastName: string;
};

type KPITemplate = {
  id: number;
  name: string;
  description: string | null;
  branchId: number | null;
  active: boolean;
};

type KPIQuestion = {
  id: number;
  kpiTemplateId: number;
  questionText: string;
  questionType: KPIQuestionType;
  options: { options?: string[] } | string[] | null;
  isRequired: boolean;
  displayOrder: number;
};

type KPIRecord = {
  id: number;
  kpiTemplateId: number;
  lecturerId: number | null;
  courseScheduleId: number | null;
  evaluationDate: string | Date;
  status: KPIStatus;
  notes: string | null;
  createdAt: string | Date;
};

type KPIAnswer = {
  id: number;
  kpiRecordId: number;
  kpiQuestionId: number;
  answerText: string | null;
  answerValue: string | null;
};

type KPIRecordDetail = KPIRecord & {
  questions: KPIQuestion[];
  answers: KPIAnswer[];
};

const ALL_BRANCH_VALUE = "all-branches";
const NONE_LECTURER_VALUE = "no-lecturer";
const NONE_SCHEDULE_VALUE = "no-schedule";

function getStatusClasses(status: KPIStatus) {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-800";
    case "Submitted":
      return "bg-blue-100 text-blue-800";
    case "Rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseQuestionOptions(value: KPIQuestion["options"]) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "object" && Array.isArray(value.options)) {
    return value.options.map((item) => String(item)).filter(Boolean);
  }
  return [];
}

function parseOptionsText(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getScheduleLabel(schedule: CourseSchedule, courses: Course[]) {
  const course = courses.find((item) => item.id === schedule.courseId);
  const courseLabel = course
    ? `${course.code ? `${course.code} - ` : ""}${course.name}`
    : `Schedule ${schedule.id}`;
  return `${courseLabel} | ${formatDate(schedule.startDate)} to ${formatDate(
    schedule.endDate
  )}`;
}

export default function KPIPage() {
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const [recordSearchTerm, setRecordSearchTerm] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<KPITemplate | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<KPIQuestion | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isQuestionFormOpen, setIsQuestionFormOpen] = useState(false);
  const [isEvaluationFormOpen, setIsEvaluationFormOpen] = useState(false);
  const [evaluationAnswers, setEvaluationAnswers] = useState<Record<number, string>>({});
  const [evaluationNotes, setEvaluationNotes] = useState("");

  const {
    data: kpiTemplates = [],
    isLoading: templatesLoading,
    refetch: refetchTemplates,
  } = trpc.kpi.templates.useQuery();
  const {
    data: kpiRecords = [],
    isLoading: recordsLoading,
    refetch: refetchRecords,
  } = trpc.kpi.records.useQuery();
  const { data: lecturers = [] } = trpc.lecturers.list.useQuery();
  const { data: schedules = [] } = trpc.courseSchedules.list.useQuery();
  const { data: courses = [] } = trpc.courses.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const {
    data: selectedTemplateQuestions = [],
    refetch: refetchTemplateQuestions,
  } = trpc.kpi.questions.useQuery(selectedTemplateId ?? 0, {
    enabled: Boolean(selectedTemplateId),
  });
  const {
    data: selectedRecord,
    refetch: refetchSelectedRecord,
  } = trpc.kpi.getRecord.useQuery(selectedRecordId ?? 0, {
    enabled: Boolean(selectedRecordId),
  });

  const createTemplateMutation = trpc.kpi.createTemplate.useMutation();
  const updateTemplateMutation = trpc.kpi.updateTemplate.useMutation();
  const addQuestionMutation = trpc.kpi.addQuestion.useMutation();
  const updateQuestionMutation = trpc.kpi.updateQuestion.useMutation();
  const deleteQuestionMutation = trpc.kpi.deleteQuestion.useMutation();
  const createRecordMutation = trpc.kpi.createRecord.useMutation();
  const addAnswerMutation = trpc.kpi.addAnswer.useMutation();
  const updateRecordMutation = trpc.kpi.updateRecord.useMutation();
  const deleteRecordMutation = trpc.kpi.deleteRecord.useMutation();

  const typedTemplates = kpiTemplates as KPITemplate[];
  const typedRecords = kpiRecords as KPIRecord[];
  const typedLecturers = lecturers as Lecturer[];
  const typedSchedules = schedules as CourseSchedule[];
  const typedCourses = courses as Course[];
  const typedBranches = branches as Branch[];
  const typedSelectedTemplateQuestions = selectedTemplateQuestions as KPIQuestion[];
  const typedSelectedRecord = (selectedRecord ?? null) as KPIRecordDetail | null;

  useEffect(() => {
    if (!typedSelectedRecord) {
      setEvaluationAnswers({});
      setEvaluationNotes("");
      return;
    }

    const nextAnswers: Record<number, string> = {};
    for (const answer of typedSelectedRecord.answers || []) {
      nextAnswers[answer.kpiQuestionId] = answer.answerValue || answer.answerText || "";
    }

    setEvaluationAnswers(nextAnswers);
    setEvaluationNotes(typedSelectedRecord.notes || "");
  }, [typedSelectedRecord]);

  const branchOptions = useMemo(
    () => [
      { value: ALL_BRANCH_VALUE, label: "All Branches" },
      ...typedBranches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [typedBranches]
  );

  const templateOptions = useMemo(
    () =>
      typedTemplates
        .filter((template) => template.active)
        .map((template) => ({
          value: String(template.id),
          label: template.name,
        })),
    [typedTemplates]
  );

  const lecturerOptions = useMemo(
    () => [
      { value: NONE_LECTURER_VALUE, label: "No Lecturer Linked" },
      ...typedLecturers.map((lecturer) => ({
        value: String(lecturer.id),
        label: `${lecturer.firstName} ${lecturer.lastName}`,
      })),
    ],
    [typedLecturers]
  );

  const scheduleOptions = useMemo(
    () => [
      { value: NONE_SCHEDULE_VALUE, label: "No Schedule Linked" },
      ...typedSchedules.map((schedule) => ({
        value: String(schedule.id),
        label: getScheduleLabel(schedule, typedCourses),
      })),
    ],
    [typedCourses, typedSchedules]
  );

  const filteredTemplates = useMemo(() => {
    return typedTemplates.filter((template) => {
      const branchName =
        typedBranches.find((branch) => branch.id === template.branchId)?.name || "";
      return `${template.name} ${template.description || ""} ${branchName}`
        .toLowerCase()
        .includes(templateSearchTerm.toLowerCase());
    });
  }, [templateSearchTerm, typedBranches, typedTemplates]);

  const filteredRecords = useMemo(() => {
    return typedRecords.filter((record) => {
      const templateName =
        typedTemplates.find((template) => template.id === record.kpiTemplateId)?.name || "";
      const lecturerName =
        typedLecturers.find((lecturer) => lecturer.id === record.lecturerId)
          ? `${typedLecturers.find((lecturer) => lecturer.id === record.lecturerId)?.firstName} ${
              typedLecturers.find((lecturer) => lecturer.id === record.lecturerId)?.lastName
            }`
          : "";
      const scheduleLabel = record.courseScheduleId
        ? getScheduleLabel(
            typedSchedules.find((schedule) => schedule.id === record.courseScheduleId)!,
            typedCourses
          )
        : "";

      return `${record.id} ${record.status} ${templateName} ${lecturerName} ${
        record.notes || ""
      } ${scheduleLabel}`
        .toLowerCase()
        .includes(recordSearchTerm.toLowerCase());
    });
  }, [recordSearchTerm, typedCourses, typedLecturers, typedRecords, typedSchedules, typedTemplates]);

  const summary = useMemo(
    () => ({
      templates: typedTemplates.length,
      activeTemplates: typedTemplates.filter((template) => template.active).length,
      draftRecords: typedRecords.filter((record) => record.status === "Draft").length,
      submittedRecords: typedRecords.filter((record) => record.status === "Submitted").length,
      approvedRecords: typedRecords.filter((record) => record.status === "Approved").length,
    }),
    [typedRecords, typedTemplates]
  );

  const isLoading = templatesLoading || recordsLoading;
  const selectedTemplate = typedTemplates.find((template) => template.id === selectedTemplateId) || null;
  const selectedTemplateBranchName =
    typedBranches.find((branch) => branch.id === selectedTemplate?.branchId)?.name ||
    "All Branches";

  const templateInitialValues = editingTemplate
    ? {
        name: editingTemplate.name,
        description: editingTemplate.description || "",
        branchId: editingTemplate.branchId ? String(editingTemplate.branchId) : ALL_BRANCH_VALUE,
        active: editingTemplate.active ? "true" : "false",
      }
    : {
        name: "",
        description: "",
        branchId: ALL_BRANCH_VALUE,
        active: "true",
      };

  const questionInitialValues = editingQuestion
    ? {
        questionText: editingQuestion.questionText,
        questionType: editingQuestion.questionType,
        optionsText: parseQuestionOptions(editingQuestion.options).join("\n"),
        isRequired: editingQuestion.isRequired ? "true" : "false",
        displayOrder: String(editingQuestion.displayOrder ?? 0),
      }
    : {
        questionText: "",
        questionType: "Text",
        optionsText: "",
        isRequired: "true",
        displayOrder: String(typedSelectedTemplateQuestions.length + 1),
      };

  const evaluationInitialValues = {
    kpiTemplateId: templateOptions[0]?.value || "",
    lecturerId: NONE_LECTURER_VALUE,
    courseScheduleId: NONE_SCHEDULE_VALUE,
    evaluationDate: new Date().toISOString().slice(0, 10),
    notes: "",
  };

  const persistEvaluation = async (
    nextStatus: KPIStatus,
    requireRequiredAnswers: boolean
  ) => {
    if (!typedSelectedRecord) return;

    for (const question of typedSelectedRecord.questions || []) {
      const answer = (evaluationAnswers[question.id] || "").trim();
      if (requireRequiredAnswers && question.isRequired && !answer) {
        toast.error(`Please answer the required question: "${question.questionText}"`);
        return;
      }
    }

    try {
      for (const question of typedSelectedRecord.questions || []) {
        const answer = (evaluationAnswers[question.id] || "").trim();
        await addAnswerMutation.mutateAsync({
          kpiRecordId: typedSelectedRecord.id,
          kpiQuestionId: question.id,
          answerText: answer || null,
          answerValue: answer || null,
        });
      }

      await updateRecordMutation.mutateAsync({
        id: typedSelectedRecord.id,
        data: {
          status: nextStatus,
          notes: evaluationNotes,
        },
      });

      toast.success(
        nextStatus === "Submitted"
          ? "Evaluation submitted"
          : nextStatus === "Approved"
            ? "Evaluation approved"
            : nextStatus === "Rejected"
              ? "Evaluation rejected"
              : "Evaluation draft saved"
      );

      await refetchSelectedRecord();
      await refetchRecords();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save evaluation");
    }
  };

  const renderQuestionInput = (question: KPIQuestion) => {
    const value = evaluationAnswers[question.id] || "";
    const disabled =
      updateRecordMutation.isPending ||
      addAnswerMutation.isPending ||
      typedSelectedRecord?.status === "Approved";

    if (question.questionType === "Text") {
      return (
        <Textarea
          value={value}
          onChange={(event) =>
            setEvaluationAnswers((current) => ({
              ...current,
              [question.id]: event.target.value,
            }))
          }
          disabled={disabled}
          placeholder="Write your answer here..."
        />
      );
    }

    const options =
      question.questionType === "MultipleChoice"
        ? parseQuestionOptions(question.options)
        : question.questionType === "YesNo"
          ? ["Yes", "No"]
          : ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"];

    return (
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          setEvaluationAnswers((current) => ({
            ...current,
            [question.id]: event.target.value,
          }))
        }
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
      >
        <option value="">Select an answer</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">KPI Management</h1>
            <p className="mt-2 text-muted-foreground">
              Create KPI templates, manage questions, and complete lecturer evaluations properly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setIsEvaluationFormOpen(true)}
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              New Evaluation
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setIsTemplateFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New KPI Template
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Templates</p>
            <p className="mt-2 text-3xl font-bold">{summary.templates}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total KPI templates</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-900">Active Templates</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">
              {summary.activeTemplates}
            </p>
            <p className="mt-1 text-xs text-emerald-700">Ready for evaluations</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Draft Evaluations</p>
            <p className="mt-2 text-3xl font-bold">{summary.draftRecords}</p>
            <p className="mt-1 text-xs text-muted-foreground">Still in progress</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Submitted</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              {summary.submittedRecords}
            </p>
            <p className="mt-1 text-xs text-blue-700">Awaiting review</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Approved</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">
              {summary.approvedRecords}
            </p>
            <p className="mt-1 text-xs text-amber-700">Completed evaluations</p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="records">Evaluations</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>KPI Templates</CardTitle>
                <CardDescription>
                  Create templates, attach ordered questions, and keep them branch-aware where needed.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    className="pl-9"
                    value={templateSearchTerm}
                    onChange={(event) => setTemplateSearchTerm(event.target.value)}
                  />
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, index) => (
                      <Skeleton key={index} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No KPI templates found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map((template) => (
                      <div key={template.id} className="rounded-lg border p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-medium">{template.name}</h3>
                              <Badge className={template.active ? "bg-emerald-100 text-emerald-800" : ""} variant="secondary">
                                {template.active ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                {typedBranches.find((branch) => branch.id === template.branchId)?.name ||
                                  "All Branches"}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {template.description || "No description available"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSelectedTemplateId((current) =>
                                  current === template.id ? null : template.id
                                )
                              }
                            >
                              {selectedTemplateId === template.id ? "Hide Questions" : "View Questions"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingTemplate(template);
                                setIsTemplateFormOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTemplateId(template.id);
                                setEditingQuestion(null);
                                setIsQuestionFormOpen(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Question
                            </Button>
                          </div>
                        </div>

                        {selectedTemplateId === template.id ? (
                          <div className="mt-4 space-y-3 rounded-lg bg-muted/30 p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Questions</p>
                                <p className="text-xs text-muted-foreground">
                                  {selectedTemplateBranchName} | ordered evaluation questions
                                </p>
                              </div>
                            </div>

                            {typedSelectedTemplateQuestions.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No questions configured yet.
                              </p>
                            ) : (
                              typedSelectedTemplateQuestions.map((question, index) => (
                                <div key={question.id} className="rounded border bg-background p-3">
                                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {index + 1}. {question.questionText}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <Badge variant="outline">{question.questionType}</Badge>
                                        <Badge variant="secondary">
                                          Order {question.displayOrder}
                                        </Badge>
                                        {question.isRequired ? (
                                          <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                                            Required
                                          </Badge>
                                        ) : null}
                                      </div>
                                      {question.questionType === "MultipleChoice" ? (
                                        <p className="mt-2 text-xs text-muted-foreground">
                                          Options: {parseQuestionOptions(question.options).join(", ")}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedTemplateId(template.id);
                                          setEditingQuestion(question);
                                          setIsQuestionFormOpen(true);
                                        }}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={async () => {
                                          if (!confirm(`Delete "${question.questionText}"?`)) return;
                                          try {
                                            await deleteQuestionMutation.mutateAsync(question.id);
                                            toast.success("Question deleted");
                                            await refetchTemplateQuestions();
                                          } catch (error) {
                                            toast.error(
                                              error instanceof Error
                                                ? error.message
                                                : "Failed to delete question"
                                            );
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>KPI Evaluations</CardTitle>
                <CardDescription>
                  Create evaluations from templates, save draft answers, and submit them cleanly.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search evaluations..."
                      className="pl-9"
                      value={recordSearchTerm}
                      onChange={(event) => setRecordSearchTerm(event.target.value)}
                    />
                  </div>

                  <Button size="sm" type="button" onClick={() => setIsEvaluationFormOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Evaluation
                  </Button>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, index) => (
                      <Skeleton key={index} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No evaluations found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecords.map((record) => {
                      const template = typedTemplates.find(
                        (templateItem) => templateItem.id === record.kpiTemplateId
                      );
                      const lecturer = typedLecturers.find(
                        (lecturerItem) => lecturerItem.id === record.lecturerId
                      );
                      const schedule = typedSchedules.find(
                        (scheduleItem) => scheduleItem.id === record.courseScheduleId
                      );

                      return (
                        <div key={record.id} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-medium">Evaluation #{record.id}</h3>
                                <Badge className={getStatusClasses(record.status)} variant="secondary">
                                  {record.status}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {template?.name || `Template ${record.kpiTemplateId}`}
                              </p>
                              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                                <div>
                                  <strong className="text-foreground">Lecturer:</strong>{" "}
                                  {lecturer
                                    ? `${lecturer.firstName} ${lecturer.lastName}`
                                    : "Not linked"}
                                </div>
                                <div>
                                  <strong className="text-foreground">Schedule:</strong>{" "}
                                  {schedule ? getScheduleLabel(schedule, typedCourses) : "Not linked"}
                                </div>
                                <div>
                                  <strong className="text-foreground">Date:</strong>{" "}
                                  {formatDate(record.evaluationDate)}
                                </div>
                              </div>
                              {record.notes ? (
                                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                                  {record.notes}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                type="button"
                                onClick={() => setSelectedRecordId(record.id)}
                              >
                                Open
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                type="button"
                                onClick={async () => {
                                  if (!confirm(`Delete evaluation #${record.id}?`)) return;
                                  try {
                                    await deleteRecordMutation.mutateAsync(record.id);
                                    toast.success("Evaluation deleted");
                                    if (selectedRecordId === record.id) {
                                      setSelectedRecordId(null);
                                    }
                                    await refetchRecords();
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : "Failed to delete evaluation"
                                    );
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FormDialog
          open={isTemplateFormOpen}
          onOpenChange={(open) => {
            setIsTemplateFormOpen(open);
            if (!open) setEditingTemplate(null);
          }}
          title={editingTemplate ? "Edit KPI Template" : "Create KPI Template"}
          description="Create reusable evaluation templates and optionally scope them to a branch."
          onSubmit={async (values) => {
            try {
              const payload = {
                name: String(values.name || "").trim(),
                description: String(values.description || "").trim() || undefined,
                branchId:
                  String(values.branchId || ALL_BRANCH_VALUE) === ALL_BRANCH_VALUE
                    ? null
                    : Number(values.branchId),
                active: String(values.active || "true") === "true",
              };

              if (editingTemplate) {
                await updateTemplateMutation.mutateAsync({
                  id: editingTemplate.id,
                  data: payload,
                });
                toast.success("KPI template updated");
              } else {
                await createTemplateMutation.mutateAsync(payload);
                toast.success("KPI template created");
              }

              setIsTemplateFormOpen(false);
              setEditingTemplate(null);
              await refetchTemplates();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to save KPI template");
            }
          }}
          fields={[
            { name: "name", label: "Template Name", type: "text", required: true },
            { name: "description", label: "Description", type: "textarea" },
            {
              name: "branchId",
              label: "Branch",
              type: "select",
              options: branchOptions,
              required: true,
            },
            {
              name: "active",
              label: "Active",
              type: "select",
              required: true,
              options: [
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ],
            },
          ]}
          initialValues={templateInitialValues}
          isLoading={createTemplateMutation.isPending || updateTemplateMutation.isPending}
        />

        <FormDialog
          open={isQuestionFormOpen}
          onOpenChange={(open) => {
            setIsQuestionFormOpen(open);
            if (!open) setEditingQuestion(null);
          }}
          title={editingQuestion ? "Edit KPI Question" : "Add KPI Question"}
          description={
            selectedTemplate
              ? `Attach an ordered question to "${selectedTemplate.name}".`
              : "Attach a question to the selected KPI template."
          }
          onSubmit={async (values) => {
            if (!selectedTemplateId) {
              toast.error("Select a template first");
              return;
            }

            const questionType = values.questionType as KPIQuestionType;
            const options = parseOptionsText(String(values.optionsText || ""));
            if (questionType === "MultipleChoice" && options.length === 0) {
              toast.error("Add at least one option for a multiple-choice question.");
              return;
            }

            try {
              const payload = {
                questionText: String(values.questionText || "").trim(),
                questionType,
                options,
                isRequired: String(values.isRequired || "true") === "true",
                displayOrder: Number(values.displayOrder || 0),
              };

              if (editingQuestion) {
                await updateQuestionMutation.mutateAsync({
                  id: editingQuestion.id,
                  data: payload,
                });
                toast.success("Question updated");
              } else {
                await addQuestionMutation.mutateAsync({
                  kpiTemplateId: selectedTemplateId,
                  ...payload,
                });
                toast.success("Question added");
              }

              setIsQuestionFormOpen(false);
              setEditingQuestion(null);
              await refetchTemplateQuestions();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to save question");
            }
          }}
          fields={[
            { name: "questionText", label: "Question", type: "textarea", required: true },
            {
              name: "questionType",
              label: "Question Type",
              type: "select",
              required: true,
              options: [
                { value: "Text", label: "Text" },
                { value: "Rating", label: "Rating" },
                { value: "YesNo", label: "Yes / No" },
                { value: "MultipleChoice", label: "Multiple Choice" },
              ],
            },
            {
              name: "optionsText",
              label: "Options",
              type: "textarea",
              placeholder: "Only needed for multiple-choice questions. Add one option per line.",
            },
            { name: "displayOrder", label: "Display Order", type: "number" },
            {
              name: "isRequired",
              label: "Required",
              type: "select",
              required: true,
              options: [
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ],
            },
          ]}
          initialValues={questionInitialValues}
          isLoading={addQuestionMutation.isPending || updateQuestionMutation.isPending}
        />

        <FormDialog
          open={isEvaluationFormOpen}
          onOpenChange={setIsEvaluationFormOpen}
          title="Create Evaluation"
          description="Create a draft evaluation from a KPI template."
          onSubmit={async (values) => {
            try {
              await createRecordMutation.mutateAsync({
                kpiTemplateId: Number(values.kpiTemplateId),
                lecturerId:
                  String(values.lecturerId || NONE_LECTURER_VALUE) === NONE_LECTURER_VALUE
                    ? undefined
                    : Number(values.lecturerId),
                courseScheduleId:
                  String(values.courseScheduleId || NONE_SCHEDULE_VALUE) === NONE_SCHEDULE_VALUE
                    ? undefined
                    : Number(values.courseScheduleId),
                evaluationDate: new Date(String(values.evaluationDate)),
                notes: String(values.notes || "").trim() || undefined,
                status: "Draft",
              });
              toast.success("Evaluation created");
              setIsEvaluationFormOpen(false);
              await refetchRecords();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to create evaluation");
            }
          }}
          fields={[
            {
              name: "kpiTemplateId",
              label: "Template",
              type: "select",
              required: true,
              options: templateOptions,
            },
            {
              name: "lecturerId",
              label: "Lecturer",
              type: "select",
              options: lecturerOptions,
              required: true,
            },
            {
              name: "courseScheduleId",
              label: "Course Schedule",
              type: "select",
              options: scheduleOptions,
              required: true,
            },
            { name: "evaluationDate", label: "Evaluation Date", type: "date", required: true },
            { name: "notes", label: "Notes", type: "textarea" },
          ]}
          initialValues={evaluationInitialValues}
          isLoading={createRecordMutation.isPending}
        />

        {selectedRecordId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-background p-6 shadow-xl">
              {!typedSelectedRecord ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">KPI Evaluation #{typedSelectedRecord.id}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {
                          typedTemplates.find(
                            (template) => template.id === typedSelectedRecord.kpiTemplateId
                          )?.name
                        }{" "}
                        | {formatDate(typedSelectedRecord.evaluationDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusClasses(typedSelectedRecord.status)} variant="secondary">
                        {typedSelectedRecord.status}
                      </Badge>
                      <Button variant="outline" onClick={() => setSelectedRecordId(null)}>
                        Close
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Lecturer</p>
                      <p className="font-medium">
                        {typedLecturers.find(
                          (lecturer) => lecturer.id === typedSelectedRecord.lecturerId
                        )
                          ? `${
                              typedLecturers.find(
                                (lecturer) => lecturer.id === typedSelectedRecord.lecturerId
                              )?.firstName
                            } ${
                              typedLecturers.find(
                                (lecturer) => lecturer.id === typedSelectedRecord.lecturerId
                              )?.lastName
                            }`
                          : "Not linked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Course Schedule</p>
                      <p className="font-medium">
                        {typedSelectedRecord.courseScheduleId &&
                        typedSchedules.find(
                          (schedule) => schedule.id === typedSelectedRecord.courseScheduleId
                        )
                          ? getScheduleLabel(
                              typedSchedules.find(
                                (schedule) => schedule.id === typedSelectedRecord.courseScheduleId
                              )!,
                              typedCourses
                            )
                          : "Not linked"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">Questions</p>
                      <p className="font-medium">
                        {(typedSelectedRecord.questions || []).length} configured
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-6">
                    {typedSelectedRecord.questions?.length ? (
                      typedSelectedRecord.questions.map((question, index) => (
                        <div key={question.id} className="space-y-3 rounded-lg border p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="font-medium">
                              {index + 1}. {question.questionText}
                            </label>
                            <Badge variant="outline">{question.questionType}</Badge>
                            {question.isRequired ? (
                              <Badge className="bg-amber-100 text-amber-800" variant="secondary">
                                Required
                              </Badge>
                            ) : null}
                          </div>
                          {question.questionType === "MultipleChoice" ? (
                            <p className="text-xs text-muted-foreground">
                              Options: {parseQuestionOptions(question.options).join(", ")}
                            </p>
                          ) : null}
                          {renderQuestionInput(question)}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No questions are attached to this template yet.
                      </p>
                    )}

                    <div className="space-y-2">
                      <label className="font-medium">Evaluation Notes</label>
                      <Textarea
                        value={evaluationNotes}
                        disabled={typedSelectedRecord.status === "Approved"}
                        onChange={(event) => setEvaluationNotes(event.target.value)}
                        placeholder="Overall evaluation notes, observations, and actions..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {typedSelectedRecord.status !== "Approved" ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => persistEvaluation("Draft", false)}
                            disabled={updateRecordMutation.isPending || addAnswerMutation.isPending}
                          >
                            Save Draft
                          </Button>
                          <Button
                            onClick={() => persistEvaluation("Submitted", true)}
                            disabled={updateRecordMutation.isPending || addAnswerMutation.isPending}
                          >
                            Submit Evaluation
                          </Button>
                        </>
                      ) : null}

                      {typedSelectedRecord.status === "Submitted" ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => persistEvaluation("Approved", false)}
                            disabled={updateRecordMutation.isPending || addAnswerMutation.isPending}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => persistEvaluation("Rejected", false)}
                            disabled={updateRecordMutation.isPending || addAnswerMutation.isPending}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
