import "dotenv/config";
import mysql from "mysql2/promise";

type CourseLevel = "Level 1" | "Level 2" | "Level 3";
type RawScheduleTuple = readonly [
  branchName: string,
  title: string,
  scheduleCode: string,
  startDate: string,
  endDate: string,
];
type ScheduleExamWindow = readonly [examStartDate: string, examEndDate?: string];

type CourseDefinition = {
  code: string;
  level: CourseLevel;
};

type BranchRow = {
  id: number;
  name: string;
};

type CourseRow = {
  id: number;
  code: string;
  name: string;
};

const DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://root:admin123@localhost:3306/textpoint";

const COURSE_DEFINITIONS: Record<string, CourseDefinition> = {
  "ACFM Level 1": { code: "ACFM 1", level: "Level 1" },
  "ACFM Level 2": { code: "ACFM 2", level: "Level 2" },
  "Basic Level 3": { code: "BASIC 3", level: "Level 3" },
  "CR/DR": { code: "CR/DR", level: "Level 2" },
  "ET Level 1": { code: "ET 1", level: "Level 1" },
  "ET Level 2": { code: "ET 2", level: "Level 2" },
  "ET Level Tubes": { code: "ET TUBES", level: "Level 2" },
  HT: { code: "HT", level: "Level 1" },
  "Intro to NDT for ENG": { code: "INDTE", level: "Level 1" },
  MT: { code: "MT", level: "Level 2" },
  "MT Level 1 and 2": { code: "MT 1&2", level: "Level 2" },
  "MT Level 3": { code: "MT 3", level: "Level 3" },
  "PAUT Level 1 and 2": { code: "PAUT 1&2", level: "Level 2" },
  "PCN BRS": { code: "PCN BRS", level: "Level 1" },
  PT: { code: "PT", level: "Level 2" },
  "PT Level 1 and 2": { code: "PT 1&2", level: "Level 2" },
  "PT Level 3": { code: "PT 3", level: "Level 3" },
  RT: { code: "RT", level: "Level 2" },
  RTFI: { code: "RTFI", level: "Level 2" },
  RTS: { code: "RTS", level: "Level 1" },
  "TOFD Level 1 and 2": { code: "TOFD 1&2", level: "Level 2" },
  UT: { code: "UT", level: "Level 2" },
  "UT Level 3": { code: "UT 3", level: "Level 3" },
  VT: { code: "VT", level: "Level 2" },
  "VT Level 1 and 2": { code: "VT 1&2", level: "Level 2" },
  "VT Level 3": { code: "VT 3", level: "Level 3" },
  WT: { code: "WT", level: "Level 2" },
};

const RAW_SCHEDULES: RawScheduleTuple[] = [
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 01", "12-Jan-26", "20-Jan-26"],
  ["TextPoint Constantia", "Intro to NDT for ENG", "INDTE", "19-Jan-26", "23-Jan-26"],
  ["TextPoint Constantia", "PAUT Level 1 and 2", "PAUT 01", "19-Jan-26", "06-Feb-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 01", "26-Jan-26", "03-Feb-26"],
  ["TextPoint Constantia", "PCN BRS", "PBRS 01", "26-Jan-26", "29-Jan-26"],
  ["TextPoint Constantia", "RTFI", "RTFI 01", "02-Feb-26", "12-Feb-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 02", "16-Feb-26", "24-Feb-26"],
  ["TextPoint Constantia", "Basic Level 3", "BASIC 01", "09-Feb-26", "20-Feb-26"],
  ["TextPoint Constantia", "MT Level 3", "MT3 01", "23-Feb-26", "27-Feb-26"],
  ["TextPoint Constantia", "PT Level 3", "PT3 01", "02-Mar-26", "05-Mar-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 02", "02-Mar-26", "10-Mar-26"],
  ["TextPoint Constantia", "ET Level 1", "ET 01", "09-Mar-26", "16-Mar-26"],
  ["TextPoint Constantia", "VT Level 3", "VT3 01", "09-Mar-26", "12-Mar-26"],
  ["TextPoint Constantia", "UT", "UT01", "16-Mar-26", "10-Apr-26"],
  ["TextPoint Constantia", "VT Level 1 and 2", "VT 01", "07-Apr-26", "13-Apr-26"],
  ["TextPoint Constantia", "ACFM Level 1", "ACFM 01", "13-Apr-26", "17-Apr-26"],
  ["TextPoint Constantia", "RTFI", "RTFI 02", "13-Apr-26", "23-Apr-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 03", "20-Apr-26", "29-Apr-25"],
  ["TextPoint Constantia", "PCN BRS", "PBRS 02", "20-Apr-26", "23-Apr-26"],
  ["TextPoint Constantia", "MT Level1 and 2", "MT 03", "04-May-26", "12-May-26"],
  ["TextPoint Constantia", "UT", "UT 02", "11-May-26", "05 June 26"],
  ["TextPoint Constantia", "ET Level 2", "ET 02", "18-May-26", "26-May-26"],
  ["TextPoint Constantia", "PAUT Level 1 and 2", "PAUT 02", "25-May-26", "12-Jun-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 04", "01-Jun-26", "09-Jun-26"],
  ["TextPoint Constantia", "UT Level 3", "UT3 01", "01-Jun-26", "05-Jun-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 04", "15-Jun-26", "24-Jun-26"],
  ["TextPoint Constantia", "ET Level Tubes", "ET 03", "22-Jun-26", "29-Jun-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 05", "06-Jul-26", "14-Jul-26"],
  ["TextPoint Constantia", "ACFM Level 2", "ACFM 02", "06-Jul-26", "10-Jul-26"],
  ["TextPoint Constantia", "UT", "UT 03", "06-Jul-26", "29-Jul-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 05", "20-Jul-26", "28-Jul-26"],
  ["TextPoint Constantia", "PCN BRS", "PBRS 03", "20-Jul-26", "24-Jul-26"],
  ["TextPoint Constantia", "VT Level 1 and 2", "VT 02", "20-Jul-26", "24-Jul-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 06", "03-Aug-26", "12-Aug-26"],
  ["TextPoint Constantia", "PAUT Level 1 and 2", "PAUT 03", "11-Aug-26", "28-Aug-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 06", "17-Aug-26", "25-Aug-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 07", "31-Aug-26", "08-Sep-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 07", "14-Sep-26", "22-Sep-26"],
  ["TextPoint Constantia", "UT", "UT 04", "28-Sep-26", "21-Oct-26"],
  ["TextPoint Constantia", "RTFI", "RTFI 03", "21-Sep-26", "02-Oct-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 08", "05-Oct-26", "13-Oct-26"],
  ["TextPoint Constantia", "VT Level 1 and 2", "VT 03", "26-Oct-26", "30-Oct-26"],
  ["TextPoint Constantia", "PAUT Level 1 and 2", "PAUT 04", "19-Oct-26", "06-Nov-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 08", "16-Nov-26", "24-Nov-26"],
  ["TextPoint Constantia", "PCN BRS", "PBRS 04", "16-Nov-26", "19-Nov-26"],
  ["TextPoint Constantia", "TOFD Level 1 and 2", "TOFD 01", "23-Nov-26", "04-Dec-26"],
  ["TextPoint Constantia", "MT Level 1 and 2", "MT 09", "30-Nov-26", "08-Dec-26"],
  ["TextPoint Constantia", "PT Level 1 and 2", "PT 09", "07-Dec-26", "15-Dec-26"],
  ["TextPoint Vaal", "PT", "PT 01", "12-Jan-26", "19-Jan-26"],
  ["TextPoint Vaal", "WT", "WT 01", "12-Jan-26", "15-Jan-26"],
  ["TextPoint Vaal", "VT", "VT 01", "19-Jan-26", "22-Jan-26"],
  ["TextPoint Vaal", "MT", "MT 01", "26-Jan-26", "02-Feb-26"],
  ["TextPoint Vaal", "RT", "RT 01", "19-Jan-26", "04-Feb-26"],
  ["TextPoint Vaal", "PT", "PT 02", "02-Feb-26", "09-Feb-26"],
  ["TextPoint Vaal", "RTS", "RTS 01", "09-Feb-26", "12-Feb-26"],
  ["TextPoint Vaal", "PCN BRS", "BRS 01", "16-Feb-26", "18-Feb-26"],
  ["TextPoint Vaal", "UT", "UT 01", "09-Feb-26", "04-Mar-26"],
  ["TextPoint Vaal", "MT", "MT 02", "23-Feb-26", "02-Mar-26"],
  ["TextPoint Vaal", "VT", "VT 02", "23-Feb-26", "26-Feb-26"],
  ["TextPoint Vaal", "PT", "PT 03", "02-Mar-26", "09-Mar-26"],
  ["TextPoint Vaal", "WT", "WT 02", "09-Mar-26", "12-Mar-26"],
  ["TextPoint Vaal", "MT", "MT 03", "16-Mar-26", "23-Mar-26"],
  ["TextPoint Vaal", "RT", "RT 02", "16-Mar-26", "01-Apr-26"],
  ["TextPoint Vaal", "HT", "HT 01", "23-Mar-26", "24-Mar-26"],
  ["TextPoint Vaal", "RTS", "RTS 02", "07-Apr-26", "10-Apr-26"],
  ["TextPoint Vaal", "PCN BRS", "BRS 02", "14-April-26", "16-April-26"],
  ["TextPoint Vaal", "PT", "PT 04", "07-Apr-26", "14-Apr-26"],
  ["TextPoint Vaal", "UT", "UT 02", "07-Apr-26", "30-Apr-26"],
  ["TextPoint Vaal", "VT", "VT 03", "20-Apr-26", "23-Apr-26"],
  ["TextPoint Vaal", "MT", "MT 04", "20-Apr-26", "28-Apr-26"],
  ["TextPoint Vaal", "PT", "PT 05", "04-May-26", "11-May-26"],
  ["TextPoint Vaal", "MT", "MT 05", "18-May-26", "25-May-26"],
  ["TextPoint Vaal", "WT", "WT 03", "11-May-26", "14-May-26"],
  ["TextPoint Vaal", "RT", "RT 03", "18-MAY-26", "03-Jun-26"],
  ["TextPoint Vaal", "VT", "VT 04", "25-May-26", "28-May-26"],
  ["TextPoint Vaal", "PT", "PT 06", "1-Jun-26", "08-Jun-26"],
  ["TextPoint Vaal", "RTS", "RTS 03", "8-Jun-26", "11-Jun-26"],
  ["TextPoint Vaal", "PCN BRS", "BRS 03", "15-Jun-26", "18-Jun-26"],
  ["TextPoint Vaal", "UT", "UT 03", "8-Jun-26", "02-Jul-26"],
  ["TextPoint Vaal", "MT", "MT 06", "15-Jun-26", "23-Jun-26"],
  ["TextPoint Vaal", "CR/DR", "CR/DR 01", "22-Jun-26", "25-Jun-26"],
  ["TextPoint Vaal", "PT", "PT 07", "06-Jul-26", "13-Jul-26"],
  ["TextPoint Vaal", "RT", "RT 04", "13-Jul-26", "29-Jul-26"],
  ["TextPoint Vaal", "MT", "MT 07", "20-Jul-26", "27-Jul-26"],
  ["TextPoint Vaal", "WT", "WT 04", "27-Jul-26", "30-Jul-26"],
  ["TextPoint Vaal", "RTS", "RTS 04", "03-Aug-26", "06-Aug-26"],
  ["TextPoint Vaal", "PCN BRS", "BRS 04", "11-Aug-26", "13-Aug-26"],
  ["TextPoint Vaal", "PT", "PT 08", "03-Aug-26", "12-Aug-26"],
  ["TextPoint Vaal", "MT", "MT 08", "17-Aug-26", "24-Aug-26"],
  ["TextPoint Vaal", "WT", "WT 05", "24-Aug-26", "27-Aug-26"],
  ["TextPoint Vaal", "HT", "HT 02", "24-Aug-26", "25-Aug-26"],
  ["TextPoint Vaal", "PT", "PT 09", "31-Aug-26", "07-Sep-26"],
  ["TextPoint Vaal", "UT", "UT 04", "31-Aug-26", "23-Sept-26"],
  ["TextPoint Vaal", "MT", "MT 09", "14-Sep-26", "21-Sep-26"],
  ["TextPoint Vaal", "VT", "VT 05", "28-Sep-26", "01-Oct-26"],
  ["TextPoint Vaal", "PT", "PT 10", "05-Oct-26", "12-Oct-26"],
  ["TextPoint Vaal", "RT", "RT 05", "05-Oct-26", "21-Oct-26"],
  ["TextPoint Vaal", "MT", "MT 10", "19-Oct-26", "26-Oct-26"],
  ["TextPoint Vaal", "RTS", "RTS 05", "26-Oct-26", "29-Oct-26"],
  ["TextPoint Vaal", "WT", "WT 06", "26-Oct-26", "29-Oct-26"],
  ["TextPoint Vaal", "PCN BRS", "BRS 05", "02-Nov-26", "04-Nov-26"],
  ["TextPoint Vaal", "PT", "PT 11", "02-Nov-26", "09-Nov-26"],
  ["TextPoint Vaal", "UT", "UT 05", "02-Nov-26", "25-Nov-26"],
  ["TextPoint Vaal", "MT", "MT 11", "16-Nov-26", "23-Nov-26"],
  ["TextPoint Vaal", "PT", "PT 12", "30-Nov-26", "07-Dec-26"],
  ["TextPoint Vaal", "MT", "MT 12", "07-Dec-26", "14-Dec-26"],
];

function buildScheduleImportKey(branchName: string, scheduleCode: string, startDate: string) {
  return `${branchName}|${scheduleCode}|${toIsoDate(startDate)}`;
}

const EXAM_DATE_WINDOWS = new Map<string, ScheduleExamWindow>([
  [buildScheduleImportKey("TextPoint Vaal", "PT 01", "12-Jan-26"), ["20-Jan-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "WT 01", "12-Jan-26"), ["16-Jan-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "VT 01", "19-Jan-26"), ["23-Jan-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 01", "26-Jan-26"), ["03-Feb-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RT 01", "19-Jan-26"), ["05-Feb-26", "06-Feb-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 02", "02-Feb-26"), ["10-Feb-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RTS 01", "09-Feb-26"), ["13-Feb-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "BRS 01", "16-Feb-26"), ["19-Feb-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "UT 01", "09-Feb-26"), ["05-Mar-26", "06-Mar-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 02", "23-Feb-26"), ["03-Mar-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "VT 02", "23-Feb-26"), ["27-Feb-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 03", "02-Mar-26"), ["10-Mar-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "WT 02", "09-Mar-26"), ["13-Mar-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 03", "16-Mar-26"), ["24-Mar-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RT 02", "16-Mar-26"), ["02-Apr-26", "03-Apr-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "HT 01", "23-Mar-26"), ["24-Mar-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RTS 02", "07-Apr-26"), ["13-Apr-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "BRS 02", "14-April-26"), ["17-April-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 04", "07-Apr-26"), ["15-Apr-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "UT 02", "07-Apr-26"), ["04-May-26", "05-May-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "VT 03", "20-Apr-26"), ["24-Apr-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 04", "20-Apr-26"), ["29-Apr-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 05", "04-May-26"), ["12-May-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 05", "18-May-26"), ["26-May-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "WT 03", "11-May-26"), ["15-May-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RT 03", "18-MAY-26"), ["04-Jun-26", "05-Jun-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "VT 04", "25-May-26"), ["29-May-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 06", "1-Jun-26"), ["09-Jun-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RTS 03", "8-Jun-26"), ["12-Jun-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "BRS 03", "15-Jun-26"), ["19-Jun-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "UT 03", "8-Jun-26"), ["02-Jul-26", "03-Jul-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 06", "15-Jun-26"), ["24-Jun-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "CR/DR 01", "22-Jun-26"), ["26-Jun-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 07", "06-Jul-26"), ["14-Jul-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RT 04", "13-Jul-26"), ["30-Jul-26", "31-Jul-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 07", "20-Jul-26"), ["28-Jul-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "WT 04", "27-Jul-26"), ["31-Jul-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RTS 04", "03-Aug-26"), ["07-Aug-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "BRS 04", "11-Aug-26"), ["14-Aug-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 08", "03-Aug-26"), ["12-Aug-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 08", "17-Aug-26"), ["25-Aug-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "WT 05", "24-Aug-26"), ["28-Aug-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "HT 02", "24-Aug-26"), ["25-Aug-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 09", "31-Aug-26"), ["08-Sep-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "UT 04", "31-Aug-26"), ["25-Sep-26", "28-Sep-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 09", "14-Sep-26"), ["22-Sep-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "VT 05", "28-Sep-26"), ["02-Oct-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 10", "05-Oct-26"), ["13-Oct-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RT 05", "05-Oct-26"), ["22-Oct-26", "23-Oct-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 10", "19-Oct-26"), ["27-Oct-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "RTS 05", "26-Oct-26"), ["30-Oct-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "WT 06", "26-Oct-26"), ["30-Oct-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "BRS 05", "02-Nov-26"), ["05-Nov-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 11", "02-Nov-26"), ["10-Nov-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "UT 05", "02-Nov-26"), ["26-Nov-26", "27-Nov-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 11", "16-Nov-26"), ["24-Nov-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "PT 12", "30-Nov-26"), ["08-Dec-26"]],
  [buildScheduleImportKey("TextPoint Vaal", "MT 12", "07-Dec-26"), ["15-Dec-26"]],
]);

function normaliseTitle(input: string) {
  return input.replace(/Level1/gi, "Level 1").replace(/\s+/g, " ").trim();
}

function normaliseDateToken(input: string) {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .replace(/Sept/gi, "Sep")
    .replace(/MAY/g, "May");
}

function fixKnownDateIssues(
  branchName: string,
  title: string,
  scheduleCode: string,
  rawValue: string
) {
  if (
    branchName === "TextPoint Constantia" &&
    title === "PT Level 1 and 2" &&
    scheduleCode === "PT 03" &&
    rawValue === "29-Apr-25"
  ) {
    return "29-Apr-26";
  }

  return rawValue;
}

function toIsoDate(rawValue: string) {
  const value = normaliseDateToken(rawValue);
  const match = value.match(/^(\d{1,2})[- ]([A-Za-z]+)[- ](\d{2})$/);
  if (!match) {
    throw new Error(`Unsupported date format: ${rawValue}`);
  }

  const [, dayValue, monthValue, yearValue] = match;
  const monthMap: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  };

  const monthNumber = monthMap[monthValue.toLowerCase()];
  if (!monthNumber) {
    throw new Error(`Unknown month token: ${monthValue}`);
  }

  const year = 2000 + Number(yearValue);
  const day = Number(dayValue);

  return `${String(year)}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function resolveExamWindow(branchName: string, scheduleCode: string, rawStartDate: string) {
  const examWindow = EXAM_DATE_WINDOWS.get(
    buildScheduleImportKey(branchName, scheduleCode, rawStartDate)
  );

  if (!examWindow) {
    return {
      examStartDate: null as string | null,
      examEndDate: null as string | null,
    };
  }

  return {
    examStartDate: `${toIsoDate(examWindow[0])} 00:00:00`,
    examEndDate: `${toIsoDate(examWindow[1] || examWindow[0])} 00:00:00`,
  };
}

function formatExistingDateValue(value: Date | null | undefined) {
  if (!value) return null;

  return `${String(value.getFullYear())}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    const [branchRows] = await connection.query<BranchRow[]>(
      "select id, name from branches order by id"
    );
    const branchMap = new Map(branchRows.map((branch) => [branch.name, branch]));

    const missingBranches = Array.from(
      new Set(RAW_SCHEDULES.map(([branchName]) => branchName))
    ).filter((branchName) => !branchMap.has(branchName));
    if (missingBranches.length > 0) {
      throw new Error(
        `Missing branch records for: ${missingBranches.join(", ")}. Please create the branches first.`
      );
    }

    const [existingCourseRows] = await connection.query<CourseRow[]>(
      "select id, code, name from courses order by id"
    );
    const coursesByCode = new Map(existingCourseRows.map((course) => [course.code, course]));

    const createdCourseCodes: string[] = [];
    let reusedCourses = 0;

    for (const importedTitle of new Set(RAW_SCHEDULES.map(([, title]) => normaliseTitle(title)))) {
      const definition = COURSE_DEFINITIONS[importedTitle];
      if (!definition) {
        throw new Error(`Missing course definition for imported title: ${importedTitle}`);
      }

      if (coursesByCode.has(definition.code)) {
        reusedCourses += 1;
        continue;
      }

      await connection.query(
        `
          insert into courses (name, code, level, description, branchId, active)
          values (?, ?, ?, ?, null, true)
        `,
        [
          importedTitle,
          definition.code,
          definition.level,
          "Imported from the 2026 TextPoint branch training schedule PDFs.",
        ]
      );

      const [courseRows] = await connection.query<CourseRow[]>(
        "select id, code, name from courses where code = ? limit 1",
        [definition.code]
      );
      const course = courseRows[0];
      if (!course) {
        throw new Error(`Failed to create course for code ${definition.code}.`);
      }

      coursesByCode.set(course.code, course);
      createdCourseCodes.push(course.code);
    }

    let createdSchedules = 0;
    let skippedSchedules = 0;
    let updatedExamDates = 0;

    for (const [branchName, rawTitle, scheduleCode, rawStart, rawEnd] of RAW_SCHEDULES) {
      const title = normaliseTitle(rawTitle);
      const definition = COURSE_DEFINITIONS[title];
      if (!definition) {
        throw new Error(`Missing course definition for imported title: ${title}`);
      }

      const branch = branchMap.get(branchName);
      const course = coursesByCode.get(definition.code);
      if (!branch || !course) {
        throw new Error(`Could not resolve branch/course for ${branchName} | ${title}`);
      }

      const startDate = `${toIsoDate(fixKnownDateIssues(branchName, title, scheduleCode, rawStart))} 00:00:00`;
      const importedTrainingEndDate = `${toIsoDate(
        fixKnownDateIssues(branchName, title, scheduleCode, rawEnd)
      )} 00:00:00`;
      const { examStartDate, examEndDate } = resolveExamWindow(branchName, scheduleCode, rawStart);
      const effectiveEndDate = examEndDate || examStartDate || importedTrainingEndDate;

      const [existingSchedules] = await connection.query<
        Array<{
          id: number;
          endDate: Date | null;
          endOfCourseExamStartDate: Date | null;
          endOfCourseExamEndDate: Date | null;
        }>
      >(
        `
          select id, endDate, endOfCourseExamStartDate, endOfCourseExamEndDate
          from courseSchedules
          where courseId = ?
            and branchId = ?
            and date(startDate) = ?
          limit 1
        `,
        [course.id, branch.id, startDate.slice(0, 10)]
      );

      if (existingSchedules.length > 0) {
        const existingSchedule = existingSchedules[0];
        const currentEndDate = formatExistingDateValue(existingSchedule.endDate);
        const currentExamStart = formatExistingDateValue(
          existingSchedule.endOfCourseExamStartDate
        );
        const currentExamEnd = formatExistingDateValue(existingSchedule.endOfCourseExamEndDate);
        const targetEndDate = effectiveEndDate ? effectiveEndDate.slice(0, 10) : null;
        const targetExamStart = examStartDate ? examStartDate.slice(0, 10) : null;
        const targetExamEnd = examEndDate ? examEndDate.slice(0, 10) : null;

        if (
          currentEndDate !== targetEndDate ||
          currentExamStart !== targetExamStart ||
          currentExamEnd !== targetExamEnd
        ) {
          await connection.query(
            `
              update courseSchedules
              set endDate = ?, endOfCourseExamStartDate = ?, endOfCourseExamEndDate = ?
              where id = ?
            `,
            [effectiveEndDate, examStartDate, examEndDate, existingSchedule.id]
          );
          updatedExamDates += 1;
        }

        skippedSchedules += 1;
        continue;
      }

      await connection.query(
        `
          insert into courseSchedules (
            courseId,
            startDate,
            endDate,
            endOfCourseExamStartDate,
            endOfCourseExamEndDate,
            lecturerId,
            maxCapacity,
            branchId,
            status
          )
          values (?, ?, ?, ?, ?, null, null, ?, 'Scheduled')
        `,
        [course.id, startDate, effectiveEndDate, examStartDate, examEndDate, branch.id]
      );

      createdSchedules += 1;
    }

    console.log("Training schedule import complete.");
    console.log(`Courses created: ${createdCourseCodes.length}`);
    console.log(`Courses reused: ${reusedCourses}`);
    console.log(`Schedules created: ${createdSchedules}`);
    console.log(`Schedules skipped (already existed): ${skippedSchedules}`);
    console.log(`Schedules updated with exam dates: ${updatedExamDates}`);

    if (createdCourseCodes.length > 0) {
      console.log(`Created course codes: ${createdCourseCodes.join(", ")}`);
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Schedule import failed:", error);
  process.exitCode = 1;
});
