export type DocumentDesign = {
  accentColor?: string;
  companyName?: string;
  logoUrl?: string;
};

export type DocumentLayout = {
  headerStyle?: "standard" | "minimal" | "none";
  titleAlign?: "left" | "center";
  footerText?: string;
  footerNote?: string;
  showSignatureBlock?: boolean;
  signatureLayout?: "single" | "dual";
  primarySignatureLabel?: string;
  secondarySignatureLabel?: string;
  sectionStyle?: "standard" | "boxed" | "ruled";
  spacing?: "compact" | "standard" | "spacious";
  showControlTable?: boolean;
};

type EditablePackManifestItem = {
  label: string;
  value: string;
};

type EditablePackSection = {
  title: string;
  subtitle?: string;
  content: string;
  details?: string[];
};

export type StructuredPdfField = {
  label: string;
  value: string;
};

export type StructuredPdfDocumentOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  fields?: StructuredPdfField[];
  paragraphs?: string[];
};

export type EditableHtmlDocumentOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  content: string;
  design?: DocumentDesign;
  layout?: DocumentLayout;
};

const DEFAULT_DOCUMENT_LAYOUT: Required<DocumentLayout> = {
  headerStyle: "standard",
  titleAlign: "left",
  footerText: "",
  footerNote: "",
  showSignatureBlock: false,
  signatureLayout: "dual",
  primarySignatureLabel: "Prepared By",
  secondarySignatureLabel: "Approved By",
  sectionStyle: "standard",
  spacing: "standard",
  showControlTable: true,
};

let csvModulePromise: Promise<typeof import("papaparse")> | null = null;
let pdfModulePromise:
  | Promise<{
      jsPDF: typeof import("jspdf").default;
      autoTable: typeof import("jspdf-autotable").default;
    }>
  | null = null;

function loadCsvModule() {
  if (!csvModulePromise) {
    csvModulePromise = import("papaparse");
  }
  return csvModulePromise;
}

function loadPdfModules() {
  if (!pdfModulePromise) {
    pdfModulePromise = Promise.all([import("jspdf"), import("jspdf-autotable")]).then(
      ([jspdfModule, autoTableModule]) => ({
        jsPDF: jspdfModule.default,
        autoTable: autoTableModule.default,
      })
    );
  }
  return pdfModulePromise;
}

export function getDefaultDocumentLayout(): Required<DocumentLayout> {
  return { ...DEFAULT_DOCUMENT_LAYOUT };
}

function normalizeDocumentLayout(layout?: DocumentLayout): Required<DocumentLayout> {
  return {
    ...DEFAULT_DOCUMENT_LAYOUT,
    ...(layout || {}),
  };
}

function renderSignatureBlock(layout: Required<DocumentLayout>) {
  if (!layout.showSignatureBlock) return "";

  const secondaryCell =
    layout.signatureLayout === "dual"
      ? `<div class="signature-line">
      <span class="signature-label" contenteditable="true">${layout.secondarySignatureLabel}</span>
      <div class="signature-rule"></div>
      <span class="signature-caption">Name, signature, and date</span>
    </div>`
      : "";

  return `<div class="signature-block signature-layout-${layout.signatureLayout}">
    <div class="signature-line">
      <span class="signature-label" contenteditable="true">${layout.primarySignatureLabel}</span>
      <div class="signature-rule"></div>
      <span class="signature-caption">Name, signature, and date</span>
    </div>
    ${secondaryCell}
  </div>`;
}

function renderFooterBlock(layout: Required<DocumentLayout>) {
  if (!layout.footerText && !layout.footerNote) return "";

  return `<footer class="document-footer">
    ${
      layout.footerText
        ? `<p class="footer-text" contenteditable="true">${layout.footerText}</p>`
        : ""
    }
    ${
      layout.footerNote
        ? `<p class="footer-note" contenteditable="true">${layout.footerNote}</p>`
        : ""
    }
  </footer>`;
}

function downloadTextFile(contents: string, filename: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function exportToCSV(data: any[], filename: string) {
  void loadCsvModule().then((Papa) => {
    const csv = Papa.unparse(data);
    downloadTextFile(csv, `${filename}.csv`, "text/csv");
  });
}

export function exportToExcel(data: any[], filename: string) {
  // For Excel, we can use CSV format which Excel opens natively
  exportToCSV(data, filename);
}

export function exportToPDF(
  data: any[],
  columns: string[],
  filename: string,
  title?: string
) {
  void loadPdfModules().then(({ autoTable, jsPDF }) => {
    const doc = new jsPDF();

    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 15);
    }

    const tableData = data.map((row) =>
      columns.map((col) => {
        const value = row[col];
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value || "");
      })
    );

    autoTable(doc, {
      head: [columns],
      body: tableData,
      startY: title ? 25 : 10,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 133, 244], textColor: 255 },
    });

    doc.save(`${filename}.pdf`);
  });
}

export function exportTableToCSV(columns: any[], data: any[], filename: string) {
  void loadCsvModule().then((Papa) => {
    const headers = columns.map((c) => c.label);
    const rows = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value || "");
      })
    );

    const csv = Papa.unparse([headers, ...rows]);
    downloadTextFile(csv, `${filename}.csv`, "text/csv");
  });
}

export function exportTableToPDF(
  columns: any[],
  data: any[],
  filename: string,
  title?: string
) {
  void loadPdfModules().then(({ autoTable, jsPDF }) => {
    const doc = new jsPDF();

    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 15);
    }

    const headers = columns.map((c) => c.label);
    const tableData = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value || "");
      })
    );

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: title ? 25 : 10,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 133, 244], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 30 },
      },
    });

    doc.save(`${filename}.pdf`);
  });
}

export function exportStructuredPdfDocument(options: StructuredPdfDocumentOptions) {
  void loadPdfModules().then(({ autoTable, jsPDF }) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const usableWidth = pageWidth - 28;

    doc.setFontSize(18);
    doc.text(options.title, 14, 18);

    let currentY = 26;
    if (options.subtitle) {
      doc.setFontSize(11);
      doc.setTextColor(90, 90, 90);
      const subtitleLines = doc.splitTextToSize(options.subtitle, usableWidth);
      doc.text(subtitleLines, 14, currentY);
      currentY += subtitleLines.length * 6 + 4;
      doc.setTextColor(20, 20, 20);
    }

    const fields = options.fields ?? [];
    if (fields.length > 0) {
      autoTable(doc, {
        head: [["Field", "Value"]],
        body: fields.map((field) => [field.label, field.value]),
        startY: currentY,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 44, fontStyle: "bold" },
          1: { cellWidth: usableWidth - 44 },
        },
      });
      currentY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : currentY + 10;
    }

    const paragraphs = options.paragraphs ?? [];
    if (paragraphs.length > 0) {
      doc.setFontSize(11);
      for (const paragraph of paragraphs) {
        const lines = doc.splitTextToSize(paragraph, usableWidth);
        if (currentY + lines.length * 6 > doc.internal.pageSize.getHeight() - 16) {
          doc.addPage();
          currentY = 18;
        }
        doc.text(lines, 14, currentY);
        currentY += lines.length * 6 + 4;
      }
    }

    doc.save(`${options.filename}.pdf`);
  });
}

export function exportEditableHtmlDocument(options: EditableHtmlDocumentOptions) {
  const html = buildEditableHtmlDocument(options);
  downloadTextFile(html, `${options.filename}.html`, "text/html");
}

export function exportEditableHtmlPackDocument(options: {
  filename: string;
  title: string;
  subtitle?: string;
  introduction?: string;
  design?: DocumentDesign;
  manifest?: EditablePackManifestItem[];
  sections: EditablePackSection[];
}) {
  const html = buildEditableHtmlPackDocument(options);
  downloadTextFile(html, `${options.filename}.html`, "text/html");
}

export function buildEditableHtmlDocument(
  options: Omit<EditableHtmlDocumentOptions, "filename">
) {
  const accentColor = options.design?.accentColor || "#0f766e";
  const layout = normalizeDocumentLayout(options.layout);
  const headerClass =
    layout.headerStyle === "minimal"
      ? "hero hero-minimal"
      : layout.headerStyle === "none"
      ? "hero hero-hidden"
      : "hero";
  const contentClass = `content section-style-${layout.sectionStyle} spacing-${layout.spacing} title-align-${layout.titleAlign}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title}</title>
  <style>
    :root {
      --accent: ${accentColor};
      --ink: #0f172a;
      --muted: #475569;
      --panel: #ffffff;
      --paper: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: var(--paper);
      color: var(--ink);
      padding: 32px;
    }
    .sheet {
      max-width: 960px;
      margin: 0 auto;
      background: var(--panel);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
    }
    .hero {
      border-bottom: 3px solid var(--accent);
      padding-bottom: 20px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: center;
    }
    .hero-hidden {
      display: none;
    }
    .hero-minimal {
      display: block;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .hero-minimal .brand {
      gap: 12px;
    }
    .hero-minimal .brand img {
      max-height: 52px;
      max-width: 96px;
    }
    .brand img {
      max-height: 64px;
      max-width: 120px;
      object-fit: contain;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2rem;
      line-height: 1.1;
    }
    .subtitle, .company {
      margin: 0;
      color: var(--muted);
    }
    .content {
      line-height: 1.7;
      font-size: 1rem;
    }
    .title-align-center {
      text-align: center;
    }
    .spacing-compact {
      line-height: 1.45;
      font-size: 0.95rem;
    }
    .spacing-compact > * {
      margin-top: 0.45rem;
      margin-bottom: 0.45rem;
    }
    .spacing-standard > * {
      margin-top: 0.7rem;
      margin-bottom: 0.7rem;
    }
    .spacing-spacious {
      line-height: 1.9;
      font-size: 1.03rem;
    }
    .spacing-spacious > * {
      margin-top: 0.95rem;
      margin-bottom: 0.95rem;
    }
    .content h2, .content h3 { color: var(--accent); }
    .content.section-style-boxed h2,
    .content.section-style-boxed h3 {
      background: rgba(15, 118, 110, 0.08);
      border: 1px solid rgba(15, 118, 110, 0.18);
      border-radius: 12px;
      padding: 10px 14px;
    }
    .content.section-style-ruled h2,
    .content.section-style-ruled h3 {
      border-bottom: 2px solid rgba(15, 118, 110, 0.22);
      padding-bottom: 8px;
    }
    .content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 12px 0;
    }
    .content ul, .content ol {
      padding-left: 24px;
    }
    .content .docx-imported-header,
    .content .docx-imported-footer {
      margin: 0 0 24px;
    }
    .content .page-break {
      border: 0;
      border-top: 2px dashed #cbd5e1;
      margin: 24px 0;
    }
    .content table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .content th, .content td {
      border: 1px solid #dbe4f0;
      padding: 10px 12px;
      text-align: left;
    }
    .content th {
      background: rgba(15, 118, 110, 0.08);
    }
    .signature-block {
      display: grid;
      gap: 20px;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #dbe4f0;
    }
    .signature-layout-dual {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .signature-line {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .signature-label {
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .signature-rule {
      border-bottom: 1px solid #0f172a;
      min-height: 26px;
    }
    .signature-caption {
      color: var(--muted);
      font-size: 0.78rem;
    }
    .document-footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      text-align: center;
    }
    .footer-text,
    .footer-note {
      margin: 0;
      color: var(--muted);
    }
    .footer-note {
      margin-top: 6px;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="${headerClass}">
      <div class="brand">
        ${options.design?.logoUrl ? `<img src="${options.design.logoUrl}" alt="Company logo" />` : ""}
        <div>
          <p class="company">${options.design?.companyName || "TextPoint"}</p>
          <h1 contenteditable="true">${options.title}</h1>
          ${options.subtitle ? `<p class="subtitle" contenteditable="true">${options.subtitle}</p>` : ""}
        </div>
      </div>
    </div>
    <div class="${contentClass}" contenteditable="true">${options.content}</div>
    ${renderSignatureBlock(layout)}
    ${renderFooterBlock(layout)}
  </div>
</body>
</html>`;
}

export function buildEditableHtmlPackDocument(options: {
  title: string;
  subtitle?: string;
  introduction?: string;
  design?: DocumentDesign;
  manifest?: EditablePackManifestItem[];
  sections: EditablePackSection[];
}) {
  const accentColor = options.design?.accentColor || "#0f766e";
  const manifest = options.manifest || [];
  const sections = options.sections || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title}</title>
  <style>
    :root {
      --accent: ${accentColor};
      --ink: #0f172a;
      --muted: #475569;
      --panel: #ffffff;
      --paper: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      --line: #dbe4f0;
      --soft: rgba(15, 118, 110, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", sans-serif;
      background: var(--paper);
      color: var(--ink);
      padding: 32px;
    }
    .sheet {
      max-width: 1080px;
      margin: 0 auto;
      background: var(--panel);
      border-radius: 24px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
    }
    .hero {
      border-bottom: 3px solid var(--accent);
      padding-bottom: 20px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: center;
    }
    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .brand img {
      max-height: 64px;
      max-width: 120px;
      object-fit: contain;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 2rem;
      line-height: 1.1;
    }
    h2 {
      margin: 0 0 12px;
      color: var(--accent);
      font-size: 1.35rem;
    }
    h3 {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 1.1rem;
    }
    .subtitle, .company, .meta-copy {
      margin: 0;
      color: var(--muted);
    }
    .lead {
      border: 1px solid var(--line);
      border-left: 4px solid var(--accent);
      border-radius: 16px;
      padding: 16px 18px;
      margin-bottom: 24px;
      background: rgba(255, 255, 255, 0.8);
      line-height: 1.7;
    }
    .grid {
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
    }
    .grid.two {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      background: #fff;
    }
    .manifest {
      display: grid;
      gap: 12px;
    }
    .manifest-item {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px 14px;
      background: #fff;
    }
    .manifest-item strong {
      display: block;
      margin-bottom: 4px;
      color: var(--accent);
      font-size: 0.95rem;
    }
    .toc {
      margin: 0;
      padding-left: 20px;
      line-height: 1.8;
    }
    .doc-section {
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 24px;
      margin-top: 24px;
      background: #fff;
    }
    .doc-section:first-of-type {
      margin-top: 0;
    }
    .doc-meta {
      margin: 10px 0 0;
      padding-left: 18px;
      color: var(--muted);
      line-height: 1.7;
    }
    .section-content {
      margin-top: 18px;
      line-height: 1.7;
      font-size: 1rem;
    }
    .section-content h2, .section-content h3 { color: var(--accent); }
    .section-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 12px 0;
    }
    .section-content ul, .section-content ol {
      padding-left: 24px;
    }
    .section-content .docx-imported-header,
    .section-content .docx-imported-footer {
      margin: 0 0 24px;
    }
    .section-content .page-break {
      border: 0;
      border-top: 2px dashed #cbd5e1;
      margin: 24px 0;
    }
    .section-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .section-content th, .section-content td {
      border: 1px solid var(--line);
      padding: 10px 12px;
      text-align: left;
    }
    .section-content th {
      background: var(--soft);
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hero">
      <div class="brand">
        ${options.design?.logoUrl ? `<img src="${options.design.logoUrl}" alt="Company logo" />` : ""}
        <div>
          <p class="company">${options.design?.companyName || "TextPoint"}</p>
          <h1 contenteditable="true">${options.title}</h1>
          ${options.subtitle ? `<p class="subtitle" contenteditable="true">${options.subtitle}</p>` : ""}
        </div>
      </div>
    </div>
    ${
      options.introduction
        ? `<div class="lead" contenteditable="true">${options.introduction}</div>`
        : ""
    }
    <div class="grid two">
      ${
        manifest.length > 0
          ? `<div class="panel">
        <h2>Pack Register</h2>
        <div class="manifest">
          ${manifest
            .map(
              (item) => `<div class="manifest-item">
            <strong>${item.label}</strong>
            <div contenteditable="true">${item.value}</div>
          </div>`
            )
            .join("")}
        </div>
      </div>`
          : ""
      }
      <div class="panel">
        <h2>Contents</h2>
        <ol class="toc">
          ${sections
            .map(
              (section, index) =>
                `<li><span contenteditable="true">${index + 1}. ${section.title}</span></li>`
            )
            .join("")}
        </ol>
      </div>
    </div>
    ${sections
      .map(
        (section, index) => `<section class="doc-section">
      <h2 contenteditable="true">${index + 1}. ${section.title}</h2>
      ${section.subtitle ? `<p class="meta-copy" contenteditable="true">${section.subtitle}</p>` : ""}
      ${
        section.details && section.details.length > 0
          ? `<ul class="doc-meta">${section.details
              .map((detail) => `<li contenteditable="true">${detail}</li>`)
              .join("")}</ul>`
          : ""
      }
      <div class="section-content" contenteditable="true">${section.content}</div>
    </section>`
      )
      .join("")}
  </div>
</body>
</html>`;
}
