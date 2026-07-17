import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, type Column } from "@/components/DataTable";
import { FormDialog } from "@/components/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportEditableHtmlDocument } from "@/lib/exportUtils";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

type Branch = {
  id: number;
  name: string;
  logoUrl?: string | null;
  companyName?: string | null;
  primaryColor?: string | null;
};

type ReportHighlight = {
  label: string;
  value: number | string;
};

type ReportSection = {
  title: string;
  rows: Array<{
    label: string;
    value: number | string;
  }>;
};

type ReportData = {
  generatedAt: string;
  scope: {
    branchId: number | null;
    branchName: string;
  };
  highlights: ReportHighlight[];
  sections: ReportSection[];
  notes: string[];
};

type ReportRecord = {
  id: number;
  title: string;
  reportType: string;
  generatedBy: number | null;
  branchId: number | null;
  filters: Record<string, unknown> | null;
  data: ReportData | null;
  createdAt: string | Date;
};

const REPORT_TYPES = [
  { value: "Operations Summary", label: "Operations Summary" },
  { value: "Training Summary", label: "Training Summary" },
  { value: "CRM Summary", label: "CRM Summary" },
  { value: "Equipment Summary", label: "Equipment Summary" },
  { value: "Level III Summary", label: "Level III Summary" },
];

function parseReportDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatReportDate(value: string | Date | null | undefined) {
  const date = parseReportDate(value);
  return date
    ? date.toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";
}

function getReportData(report: ReportRecord | null) {
  if (!report?.data) {
    return {
      generatedAt: "",
      scope: { branchId: null, branchName: "All Branches" },
      highlights: [],
      sections: [],
      notes: [],
    } satisfies ReportData;
  }

  return report.data;
}

function buildReportContent(report: ReportRecord) {
  const reportData = getReportData(report);
  const highlightsTable = reportData.highlights
    .map(
      (item) =>
        `<tr><th>${item.label}</th><td>${String(item.value)}</td></tr>`
    )
    .join("");

  const sectionsHtml = reportData.sections
    .map((section) => {
      const rows = section.rows
        .map(
          (row) => `<tr><th>${row.label}</th><td>${String(row.value)}</td></tr>`
        )
        .join("");

      return `
        <section>
          <h2>${section.title}</h2>
          <table>
            <tbody>${rows}</tbody>
          </table>
        </section>
      `;
    })
    .join("");

  const notesHtml = reportData.notes.length
    ? `<section><h2>Notes</h2><ul>${reportData.notes
        .map((note) => `<li>${note}</li>`)
        .join("")}</ul></section>`
    : "";

  return `
    <section>
      <h2>Report Scope</h2>
      <p><strong>Type:</strong> ${report.reportType}</p>
      <p><strong>Branch:</strong> ${reportData.scope.branchName}</p>
      <p><strong>Generated:</strong> ${formatReportDate(
        reportData.generatedAt || report.createdAt
      )}</p>
    </section>
    <section>
      <h2>Highlights</h2>
      <table>
        <tbody>${highlightsTable}</tbody>
      </table>
    </section>
    ${sectionsHtml}
    ${notesHtml}
  `;
}

function openReportPreview(report: ReportRecord, branch: Branch | null) {
  const previewWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!previewWindow) return;

  const reportData = getReportData(report);
  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${report.title}</title>
    <style>
      body {
        font-family: "Segoe UI", "Helvetica Neue", sans-serif;
        background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
        color: #0f172a;
        margin: 0;
        padding: 32px;
      }
      .sheet {
        max-width: 1040px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 24px;
        padding: 40px;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
      }
      .hero {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 24px;
        border-bottom: 3px solid ${branch?.primaryColor || "#0f766e"};
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      h1, h2 {
        margin: 0 0 12px;
      }
      h2 {
        color: ${branch?.primaryColor || "#0f766e"};
        margin-top: 28px;
      }
      p, li {
        line-height: 1.6;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0 24px;
      }
      th, td {
        border: 1px solid #dbe4f0;
        padding: 10px 12px;
        text-align: left;
      }
      th {
        width: 40%;
        background: rgba(15, 118, 110, 0.08);
      }
      .meta {
        color: #475569;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="hero">
        <div>
          <p class="meta">${branch?.companyName || reportData.scope.branchName || "TextPoint"}</p>
          <h1>${report.title}</h1>
          <p class="meta">${report.reportType} | ${reportData.scope.branchName}</p>
        </div>
        <div class="meta">${formatReportDate(reportData.generatedAt || report.createdAt)}</div>
      </div>
      ${buildReportContent(report)}
    </div>
  </body>
  </html>`;

  previewWindow.document.write(html);
  previewWindow.document.close();
}

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const { data: reports = [], isLoading, refetch } = trpc.reports.list.useQuery();
  const { data: branches = [] } = trpc.branches.list.useQuery();
  const generateMutation = trpc.reports.generate.useMutation();
  const deleteMutation = trpc.reports.delete.useMutation();

  const typedReports = useMemo(
    () =>
      (reports as ReportRecord[]).slice().sort((left, right) => {
        const leftDate = parseReportDate(left.createdAt)?.getTime() ?? 0;
        const rightDate = parseReportDate(right.createdAt)?.getTime() ?? 0;
        return rightDate - leftDate;
      }),
    [reports]
  );

  const filteredReports = useMemo(() => {
    return typedReports.filter((report) =>
      `${report.title} ${report.reportType}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, typedReports]);

  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedReportId(null);
      return;
    }

    if (!filteredReports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(filteredReports[0].id);
    }
  }, [filteredReports, selectedReportId]);

  const selectedReport =
    filteredReports.find((report) => report.id === selectedReportId) ??
    typedReports.find((report) => report.id === selectedReportId) ??
    null;

  const selectedBranch =
    (branches as Branch[]).find((branch) => branch.id === selectedReport?.branchId) ??
    null;
  const branchOptions = useMemo(
    () => [
      { value: "all", label: "All Branches" },
      ...(branches as Branch[]).map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    ],
    [branches]
  );

  const summary = useMemo(() => {
    const todayKey = new Date().toDateString();
    return {
      total: typedReports.length,
      generatedToday: typedReports.filter((report) => {
        const reportDate = parseReportDate(report.createdAt);
        return reportDate ? reportDate.toDateString() === todayKey : false;
      }).length,
      trainingReports: typedReports.filter(
        (report) => report.reportType === "Training Summary"
      ).length,
      crmReports: typedReports.filter(
        (report) => report.reportType === "CRM Summary"
      ).length,
    };
  }, [typedReports]);

  const columns: Column<ReportRecord>[] = [
    { key: "title", label: "Title", sortable: true, filterable: true },
    { key: "reportType", label: "Type", sortable: true },
    {
      key: "branchId",
      label: "Branch",
      render: (value) =>
        (branches as Branch[]).find((branch) => branch.id === value)?.name || "All Branches",
    },
    {
      key: "createdAt",
      label: "Generated",
      sortable: true,
      render: (value) => formatReportDate(value as string | Date),
    },
  ];

  const handleExport = (report: ReportRecord) => {
    const reportBranch =
      (branches as Branch[]).find((branch) => branch.id === report.branchId) ?? null;
    const reportData = getReportData(report);

    exportEditableHtmlDocument({
      filename: report.title.replace(/\s+/g, "-").toLowerCase(),
      title: report.title,
      subtitle: `${report.reportType} | ${reportData.scope.branchName} | ${formatReportDate(
        reportData.generatedAt || report.createdAt
      )}`,
      content: buildReportContent(report),
      design: {
        accentColor: reportBranch?.primaryColor || "#0f766e",
        companyName:
          reportBranch?.companyName || reportData.scope.branchName || "TextPoint",
        logoUrl: reportBranch?.logoUrl || "",
      },
    });
  };

  const handleDelete = async (report: ReportRecord) => {
    if (!confirm(`Delete "${report.title}"?`)) return;

    try {
      await deleteMutation.mutateAsync({ id: report.id });
      toast.success("Report deleted");
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete report");
    }
  };

  const reportData = getReportData(selectedReport);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BarChart3 className="h-8 w-8" />
              Reports
            </h1>
            <p className="mt-1 text-muted-foreground">
              Generate, review, and export operational snapshots from live system data.
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium">Saved Reports</p>
            <p className="mt-2 text-3xl font-bold">{summary.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">All saved snapshots</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Generated Today</p>
            <p className="mt-2 text-3xl font-bold text-blue-900">
              {summary.generatedToday}
            </p>
            <p className="mt-1 text-xs text-blue-700">Fresh reporting activity</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-900">Training Reports</p>
            <p className="mt-2 text-3xl font-bold text-emerald-900">
              {summary.trainingReports}
            </p>
            <p className="mt-1 text-xs text-emerald-700">Saved training snapshots</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">CRM Reports</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{summary.crmReports}</p>
            <p className="mt-1 text-xs text-amber-700">Sales and follow-up visibility</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saved Reports</CardTitle>
            <CardDescription>
              Every generated report stores a snapshot of the system at that time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <DataTable
              columns={columns}
              data={filteredReports}
              isLoading={isLoading}
              searchPlaceholder="Search saved reports..."
              onRowClick={(report) => setSelectedReportId(report.id)}
              actions={(report) => (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedReportId(report.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openReportPreview(
                        report,
                        (branches as Branch[]).find((branch) => branch.id === report.branchId) ??
                          null
                      );
                    }}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleExport(report);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(report);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>
                {selectedReport ? selectedReport.title : "Report Preview"}
              </CardTitle>
              <CardDescription>
                {selectedReport
                  ? `${selectedReport.reportType} | ${reportData.scope.branchName} | ${formatReportDate(
                      reportData.generatedAt || selectedReport.createdAt
                    )}`
                  : "Select a saved report to inspect the snapshot details."}
              </CardDescription>
            </div>
            {selectedReport ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => openReportPreview(selectedReport, selectedBranch)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button onClick={() => handleExport(selectedReport)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Editable HTML
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!selectedReport ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No report selected yet.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {reportData.highlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className="rounded-xl border bg-background p-4"
                    >
                      <p className="text-sm text-muted-foreground">{highlight.label}</p>
                      <p className="mt-2 text-3xl font-bold">{highlight.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {reportData.sections.map((section) => (
                    <div key={section.title} className="rounded-xl border bg-background p-4">
                      <h3 className="font-semibold">{section.title}</h3>
                      <div className="mt-4 space-y-2">
                        {section.rows.map((row) => (
                          <div
                            key={`${section.title}-${row.label}`}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium">{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {reportData.notes.length > 0 ? (
                  <div className="rounded-xl border bg-background p-4">
                    <h3 className="font-semibold">Notes</h3>
                    <div className="mt-3 space-y-2">
                      {reportData.notes.map((note, index) => (
                        <div
                          key={`${selectedReport.id}-note-${index}`}
                          className="rounded-lg border px-3 py-2 text-sm text-muted-foreground"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <FormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title="Generate Report"
          description="Create and save a snapshot report from the current live data."
          onSubmit={async (values) => {
            try {
              await generateMutation.mutateAsync({
                title: String(values.title || "").trim(),
                reportType: String(values.reportType || "Operations Summary"),
                branchId:
                  String(values.branchId || "all") === "all"
                    ? null
                    : Number(values.branchId),
              });
              toast.success("Report generated");
              setIsFormOpen(false);
              await refetch();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to generate report");
            }
          }}
          fields={[
            {
              name: "title",
              label: "Title",
              type: "text",
              required: true,
              placeholder: "Monthly operational review",
            },
            {
              name: "reportType",
              label: "Type",
              type: "select",
              required: true,
              options: REPORT_TYPES,
            },
            {
              name: "branchId",
              label: "Branch",
              type: "select",
              options: branchOptions,
            },
          ]}
          initialValues={{ reportType: "Operations Summary", branchId: "all" }}
          isLoading={generateMutation.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
