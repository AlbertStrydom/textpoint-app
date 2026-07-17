import { strFromU8, unzipSync } from "fflate";

type ImportWarningSet = Set<string>;

type DocxImportResult = {
  title: string;
  content: string;
  warnings: string[];
};

type RelationshipsMap = Map<
  string,
  {
    target: string;
    type: string;
  }
>;

type NumberingLevelMap = Map<string, Map<string, string>>;
type StyleMap = Map<string, string>;

type SharedDocxData = {
  entries: Record<string, Uint8Array>;
  warnings: ImportWarningSet;
  numbering: NumberingLevelMap;
  styles: StyleMap;
};

type PartConversionContext = SharedDocxData & {
  partPath: string;
  relationships: RelationshipsMap;
};

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugifyFilename(value: string) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getXmlDocument(xmlText: string) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");
  if (xml.getElementsByTagName("parsererror").length > 0) {
    throw new Error("The Word document contains invalid XML.");
  }
  return xml;
}

function getAttributeByLocalName(element: Element, localName: string) {
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.localName === localName) {
      return attribute.value;
    }
  }
  return "";
}

function getChildrenByLocalName(element: Element, localName: string) {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function firstChildByLocalName(element: Element | null | undefined, localName: string) {
  if (!element) return null;
  return (
    Array.from(element.children).find((child) => child.localName === localName) ?? null
  );
}

function getDescendantsByLocalName(element: Element, localName: string) {
  return Array.from(element.getElementsByTagName("*")).filter(
    (child) => child.localName === localName
  );
}

function readZipEntry(entries: Record<string, Uint8Array>, path: string) {
  const direct = entries[path];
  if (direct) {
    return strFromU8(direct);
  }
  return "";
}

function normaliseZipPath(path: string) {
  const segments = path.replace(/\\/g, "/").split("/");
  const resolved: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join("/");
}

function resolveRelationshipTarget(basePartPath: string, target: string) {
  if (!target) return "";
  if (target.startsWith("/")) {
    return normaliseZipPath(target.slice(1));
  }

  const baseSegments = basePartPath.split("/");
  baseSegments.pop();
  return normaliseZipPath([...baseSegments, target].join("/"));
}

function getRelationshipsPath(partPath: string) {
  const segments = partPath.split("/");
  const fileName = segments.pop();
  if (!fileName) return "";
  return normaliseZipPath([...segments, "_rels", `${fileName}.rels`].join("/"));
}

function parseRelationships(entries: Record<string, Uint8Array>, partPath: string) {
  const relationships = new Map<string, { target: string; type: string }>();
  const relsPath = getRelationshipsPath(partPath);
  const relsXml = relsPath ? readZipEntry(entries, relsPath) : "";
  if (!relsXml) return relationships;

  const relsDocument = getXmlDocument(relsXml);
  for (const relationship of Array.from(relsDocument.getElementsByTagName("*"))) {
    if (relationship.localName !== "Relationship") continue;
    const id = getAttributeByLocalName(relationship, "Id");
    const target = getAttributeByLocalName(relationship, "Target");
    if (!id || !target) continue;
    relationships.set(id, {
      target: resolveRelationshipTarget(partPath, target),
      type: getAttributeByLocalName(relationship, "Type"),
    });
  }

  return relationships;
}

function parseStyles(xmlText: string) {
  const styles = new Map<string, string>();
  if (!xmlText) return styles;

  const xml = getXmlDocument(xmlText);
  for (const style of Array.from(xml.getElementsByTagName("*"))) {
    if (style.localName !== "style") continue;
    const styleId = getAttributeByLocalName(style, "styleId");
    const nameNode = firstChildByLocalName(style, "name");
    const styleName = getAttributeByLocalName(nameNode ?? style, "val");
    if (styleId) {
      styles.set(styleId, styleName || styleId);
    }
  }

  return styles;
}

function parseNumbering(xmlText: string) {
  const numbering = new Map<string, Map<string, string>>();
  if (!xmlText) return numbering;

  const xml = getXmlDocument(xmlText);
  const abstractNums = new Map<string, Map<string, string>>();

  for (const abstractNum of Array.from(xml.getElementsByTagName("*"))) {
    if (abstractNum.localName !== "abstractNum") continue;
    const abstractNumId = getAttributeByLocalName(abstractNum, "abstractNumId");
    if (!abstractNumId) continue;

    const levelMap = new Map<string, string>();
    for (const level of getChildrenByLocalName(abstractNum, "lvl")) {
      const ilvl = getAttributeByLocalName(level, "ilvl") || "0";
      const numFmt = getAttributeByLocalName(
        firstChildByLocalName(level, "numFmt") ?? level,
        "val"
      );
      if (numFmt) {
        levelMap.set(ilvl, numFmt);
      }
    }

    abstractNums.set(abstractNumId, levelMap);
  }

  for (const num of Array.from(xml.getElementsByTagName("*"))) {
    if (num.localName !== "num") continue;
    const numId = getAttributeByLocalName(num, "numId");
    const abstractNumId = getAttributeByLocalName(
      firstChildByLocalName(num, "abstractNumId") ?? num,
      "val"
    );
    if (numId && abstractNumId && abstractNums.has(abstractNumId)) {
      numbering.set(numId, abstractNums.get(abstractNumId) ?? new Map());
    }
  }

  return numbering;
}

function bytesToDataUrl(bytes: Uint8Array, extension: string) {
  const mimeTypeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  const mimeType = mimeTypeMap[extension.toLowerCase()] || "application/octet-stream";
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function preserveWordWhitespace(value: string) {
  return escapeHtml(value)
    .replace(/\t/g, "&emsp;")
    .replace(/ {2}/g, " &nbsp;")
    .replace(/\n/g, "<br />");
}

function mapParagraphTag(styleId: string, styles: StyleMap) {
  const styleLabel = (styles.get(styleId) || styleId || "").toLowerCase().replace(/\s+/g, "");
  if (styleLabel === "title") return "h1";
  if (styleLabel === "subtitle") return "p";
  const headingMatch = styleLabel.match(/heading([1-6])/);
  if (headingMatch) {
    return `h${headingMatch[1]}`;
  }
  return "p";
}

function getParagraphAlignment(paragraph: Element) {
  const pPr = firstChildByLocalName(paragraph, "pPr");
  const alignment = getAttributeByLocalName(firstChildByLocalName(pPr, "jc") ?? paragraph, "val");
  return alignment || "";
}

function getParagraphStyleId(paragraph: Element) {
  const pPr = firstChildByLocalName(paragraph, "pPr");
  return getAttributeByLocalName(firstChildByLocalName(pPr, "pStyle") ?? paragraph, "val");
}

function getParagraphListType(paragraph: Element, numbering: NumberingLevelMap) {
  const pPr = firstChildByLocalName(paragraph, "pPr");
  const numPr = firstChildByLocalName(pPr, "numPr");
  if (!numPr) return null;

  const numId = getAttributeByLocalName(firstChildByLocalName(numPr, "numId") ?? numPr, "val");
  const ilvl = getAttributeByLocalName(firstChildByLocalName(numPr, "ilvl") ?? numPr, "val") || "0";
  if (!numId) return null;

  const numLevels = numbering.get(numId);
  const format = numLevels?.get(ilvl) || numLevels?.get("0") || "";
  return (format === "bullet" ? "ul" : "ol") as "ul" | "ol";
}

function buildRunStyle(run: Element) {
  const rPr = firstChildByLocalName(run, "rPr");
  if (!rPr) return { wrappers: [] as string[], styles: [] as string[] };

  const wrappers: string[] = [];
  const styles: string[] = [];

  if (firstChildByLocalName(rPr, "b")) wrappers.push("strong");
  if (firstChildByLocalName(rPr, "i")) wrappers.push("em");
  if (firstChildByLocalName(rPr, "u")) wrappers.push("u");
  if (firstChildByLocalName(rPr, "strike")) wrappers.push("s");

  const color = getAttributeByLocalName(firstChildByLocalName(rPr, "color") ?? rPr, "val");
  if (color && color !== "auto") styles.push(`color:#${color}`);

  const highlight = getAttributeByLocalName(
    firstChildByLocalName(rPr, "highlight") ?? rPr,
    "val"
  );
  if (highlight && highlight !== "none") {
    styles.push(`background-color:${highlight}`);
  }

  const verticalAlign = getAttributeByLocalName(
    firstChildByLocalName(rPr, "vertAlign") ?? rPr,
    "val"
  );
  if (verticalAlign === "superscript") wrappers.push("sup");
  if (verticalAlign === "subscript") wrappers.push("sub");

  return { wrappers, styles };
}

function wrapInlineHtml(
  html: string,
  wrappers: string[],
  styles: string[]
) {
  let wrapped = html || "";
  if (!wrapped) return wrapped;

  if (styles.length > 0) {
    wrapped = `<span style="${styles.join(";")}">${wrapped}</span>`;
  }

  for (const wrapper of wrappers) {
    wrapped = `<${wrapper}>${wrapped}</${wrapper}>`;
  }

  return wrapped;
}

function resolveImageHtml(run: Element, context: PartConversionContext) {
  const imageRelationshipId =
    getAttributeByLocalName(
      getDescendantsByLocalName(run, "blip")[0] ?? run,
      "embed"
    ) ||
    getAttributeByLocalName(
      getDescendantsByLocalName(run, "imagedata")[0] ?? run,
      "id"
    );

  if (!imageRelationshipId) return "";

  const relationship = context.relationships.get(imageRelationshipId);
  if (!relationship?.target) {
    context.warnings.add("One or more embedded images could not be resolved.");
    return "";
  }

  const imageBytes = context.entries[relationship.target];
  if (!imageBytes) {
    context.warnings.add("One or more embedded images could not be extracted.");
    return "";
  }

  const extension = relationship.target.split(".").pop() || "png";
  const dataUrl = bytesToDataUrl(imageBytes, extension);
  return `<img src="${dataUrl}" alt="Imported document image" style="max-width:100%;height:auto;" />`;
}

function convertRunToHtml(run: Element, context: PartConversionContext): string {
  const { wrappers, styles } = buildRunStyle(run);
  let fragments = "";

  for (const child of Array.from(run.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const element = child as Element;

    switch (element.localName) {
      case "t":
        fragments += preserveWordWhitespace(element.textContent || "");
        break;
      case "tab":
        fragments += "&emsp;";
        break;
      case "br": {
        const breakType = getAttributeByLocalName(element, "type");
        fragments += breakType === "page" ? `<hr class="page-break" />` : "<br />";
        break;
      }
      case "drawing":
      case "pict":
        fragments += resolveImageHtml(element, context);
        break;
      default:
        break;
    }
  }

  return wrapInlineHtml(fragments, wrappers, styles);
}

function convertHyperlinkToHtml(link: Element, context: PartConversionContext) {
  const relationshipId = getAttributeByLocalName(link, "id");
  const relationship = relationshipId ? context.relationships.get(relationshipId) : null;
  const content = Array.from(link.childNodes)
    .filter((child) => child.nodeType === Node.ELEMENT_NODE && (child as Element).localName === "r")
    .map((child) => convertRunToHtml(child as Element, context))
    .join("");

  if (relationship?.target) {
    return `<a href="${escapeHtml(relationship.target)}" target="_blank" rel="noreferrer">${content}</a>`;
  }

  return content;
}

function convertParagraphBody(paragraph: Element, context: PartConversionContext) {
  let innerHtml = "";

  for (const child of Array.from(paragraph.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const element = child as Element;

    if (element.localName === "r") {
      innerHtml += convertRunToHtml(element, context);
    } else if (element.localName === "hyperlink") {
      innerHtml += convertHyperlinkToHtml(element, context);
    }
  }

  return innerHtml.trim();
}

function convertParagraphToBlock(paragraph: Element, context: PartConversionContext) {
  const innerHtml = convertParagraphBody(paragraph, context);
  const alignment = getParagraphAlignment(paragraph);
  const styleId = getParagraphStyleId(paragraph);
  const listType = getParagraphListType(paragraph, context.numbering);
  const tagName = mapParagraphTag(styleId, context.styles);
  const styleAttr = alignment ? ` style="text-align:${alignment};"` : "";

  return {
    listType,
    blockHtml: `<${tagName}${styleAttr}>${innerHtml || "&nbsp;"}</${tagName}>`,
    itemHtml: innerHtml || "&nbsp;",
  };
}

function convertTableToHtml(table: Element, context: PartConversionContext) {
  const rows = getChildrenByLocalName(table, "tr")
    .map((row) => {
      const cells = getChildrenByLocalName(row, "tc")
        .map((cell) => {
          const cellBlocks = convertContainerChildrenToHtml(cell, context);
          return `<td>${cellBlocks || "&nbsp;"}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table><tbody>${rows}</tbody></table>`;
}

function convertContainerChildrenToHtml(container: Element, context: PartConversionContext) {
  const output: string[] = [];
  let currentListType: "ul" | "ol" | null = null;
  let currentListItems: string[] = [];

  const flushList = () => {
    if (!currentListType || currentListItems.length === 0) return;
    output.push(`<${currentListType}>${currentListItems.join("")}</${currentListType}>`);
    currentListType = null;
    currentListItems = [];
  };

  for (const child of Array.from(container.children)) {
    switch (child.localName) {
      case "p": {
        const paragraph = convertParagraphToBlock(child, context);
        if (paragraph.listType) {
          if (currentListType !== paragraph.listType) {
            flushList();
            currentListType = paragraph.listType;
          }
          currentListItems.push(`<li>${paragraph.itemHtml}</li>`);
        } else {
          flushList();
          output.push(paragraph.blockHtml);
        }
        break;
      }
      case "tbl":
        flushList();
        output.push(convertTableToHtml(child, context));
        break;
      default:
        break;
    }
  }

  flushList();
  return output.join("\n");
}

function convertPartToHtml(partPath: string, xmlText: string, shared: SharedDocxData) {
  if (!xmlText) return "";
  const xml = getXmlDocument(xmlText);
  const relationships = parseRelationships(shared.entries, partPath);
  const context: PartConversionContext = {
    ...shared,
    partPath,
    relationships,
  };

  const body =
    xml.getElementsByTagNameNS(WORD_NS, "body")[0] ??
    firstChildByLocalName(xml.documentElement, "body") ??
    xml.documentElement;

  return convertContainerChildrenToHtml(body, context);
}

function inferTemplateDocumentType(fileName: string) {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("certificate")) return "Certificate of Attendance";
  if (normalized.includes("feedback")) return "Course Feedback Form";
  if (normalized.includes("enrolment") || normalized.includes("enrollment")) {
    return "Course Enrolment Confirmation";
  }
  if (normalized.includes("result")) return "End of Course Result Notice";
  if (normalized.includes("rewrite")) return "Exam Rewrite Application";
  if (normalized.includes("checklist")) return "Course Completion Checklist";
  return "Other";
}

export async function importDocxTemplateFile(file: File): Promise<
  DocxImportResult & {
    documentType: string;
  }
> {
  const zipEntries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const documentXml = readZipEntry(zipEntries, "word/document.xml");
  if (!documentXml) {
    throw new Error("This file does not look like a valid DOCX Word document.");
  }

  const warnings: ImportWarningSet = new Set();
  const shared: SharedDocxData = {
    entries: zipEntries,
    warnings,
    styles: parseStyles(readZipEntry(zipEntries, "word/styles.xml")),
    numbering: parseNumbering(readZipEntry(zipEntries, "word/numbering.xml")),
  };

  const documentRelationships = parseRelationships(zipEntries, "word/document.xml");
  const headerHtmlParts: string[] = [];
  const footerHtmlParts: string[] = [];

  for (const relationship of Array.from(documentRelationships.values())) {
    const relationshipType = relationship.type.toLowerCase();
    if (relationshipType.includes("/header")) {
      const headerXml = readZipEntry(zipEntries, relationship.target);
      if (headerXml) {
        headerHtmlParts.push(convertPartToHtml(relationship.target, headerXml, shared));
      }
    }
    if (relationshipType.includes("/footer")) {
      const footerXml = readZipEntry(zipEntries, relationship.target);
      if (footerXml) {
        footerHtmlParts.push(convertPartToHtml(relationship.target, footerXml, shared));
      }
    }
  }

  const bodyHtml = convertPartToHtml("word/document.xml", documentXml, shared);
  const finalHtml = [
    headerHtmlParts.filter(Boolean).length > 0
      ? `<div class="docx-imported-header">${headerHtmlParts.filter(Boolean).join("\n")}</div>`
      : "",
    bodyHtml,
    footerHtmlParts.filter(Boolean).length > 0
      ? `<div class="docx-imported-footer">${footerHtmlParts.filter(Boolean).join("\n")}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!finalHtml.trim()) {
    throw new Error("The DOCX file was read, but no usable document content was found.");
  }

  return {
    title: slugifyFilename(file.name) || "Imported Word Template",
    content: finalHtml,
    warnings: Array.from(warnings),
    documentType: inferTemplateDocumentType(file.name),
  };
}
