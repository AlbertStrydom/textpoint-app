import { ImportDialog, type ImportDialogResult } from "@/components/ImportDialog";

type LevelIIIImportDialogsProps = {
  isClientImportOpen: boolean;
  setIsClientImportOpen: (open: boolean) => void;
  handleClientImport: (rows: Record<string, unknown>[]) => Promise<ImportDialogResult>;
  isTechnicianImportOpen: boolean;
  setIsTechnicianImportOpen: (open: boolean) => void;
  handleTechnicianImport: (
    rows: Record<string, unknown>[]
  ) => Promise<ImportDialogResult>;
  isEquipmentImportOpen: boolean;
  setIsEquipmentImportOpen: (open: boolean) => void;
  handleEquipmentImport: (
    rows: Record<string, unknown>[]
  ) => Promise<ImportDialogResult>;
  isSpecimenImportOpen: boolean;
  setIsSpecimenImportOpen: (open: boolean) => void;
  handleSpecimenImport: (
    rows: Record<string, unknown>[]
  ) => Promise<ImportDialogResult>;
};

export function LevelIIIImportDialogs(props: LevelIIIImportDialogsProps) {
  return (
    <>
      <ImportDialog
        open={props.isClientImportOpen}
        onOpenChange={props.setIsClientImportOpen}
        title="Import Level III Clients"
        description="Upload a CSV or Excel file and map the headings. Column order does not matter, and headings can be matched manually if they differ from your normal format."
        targetFields={[
          {
            key: "companyName",
            label: "Company Name",
            required: true,
            aliases: ["company", "client", "client name"],
          },
          {
            key: "primaryContact",
            label: "Primary Contact",
            required: true,
            aliases: ["contact", "main contact"],
          },
          {
            key: "secondaryContact",
            label: "Secondary Contact",
            required: false,
            aliases: ["alternate contact", "backup contact"],
          },
          {
            key: "email",
            label: "Primary Email",
            required: true,
            aliases: ["email", "main email"],
          },
          {
            key: "secondaryEmail",
            label: "Secondary Email",
            required: false,
            aliases: ["alternate email", "backup email"],
          },
          {
            key: "phone",
            label: "Phone",
            required: true,
            aliases: ["telephone", "mobile", "main phone"],
          },
          {
            key: "secondaryPhone",
            label: "Secondary Phone",
            required: false,
            aliases: ["alternate phone", "backup phone"],
          },
          {
            key: "physicalAddress",
            label: "Physical Address",
            required: true,
            aliases: ["address", "site address"],
          },
          {
            key: "visitCadence",
            label: "Visit Cadence",
            required: false,
            aliases: ["cadence", "visit frequency", "contact cadence"],
          },
          {
            key: "lastVisit",
            label: "Last Visit",
            required: false,
            aliases: ["last contact", "last visit date"],
          },
          {
            key: "nextVisit",
            label: "Next Visit",
            required: false,
            aliases: ["next contact", "next visit date"],
          },
          {
            key: "procedureUpdatedAt",
            label: "Procedure Review Date",
            required: false,
            aliases: ["procedure review", "procedure updated", "procedure date"],
          },
          {
            key: "notes",
            label: "Notes",
            required: false,
            aliases: ["comment", "comments"],
          },
        ]}
        onImport={props.handleClientImport}
      />

      <ImportDialog
        open={props.isTechnicianImportOpen}
        onOpenChange={props.setIsTechnicianImportOpen}
        title="Import Level III Technicians"
        description="Upload a CSV or Excel file and map the technician headings. Link each row to a client by company name, client ID, or another mapped client reference column."
        targetFields={[
          {
            key: "clientReference",
            label: "Client / Company Reference",
            required: true,
            aliases: ["client", "client id", "client name", "company", "company name"],
          },
          {
            key: "clientBranchName",
            label: "Client Branch Name",
            required: false,
            aliases: ["branch", "branch name", "client branch", "folder group"],
          },
          {
            key: "clientBranchCode",
            label: "Client Branch Code",
            required: false,
            aliases: ["branch code", "client branch code"],
          },
          {
            key: "clientBranchId",
            label: "Client Branch ID",
            required: false,
            aliases: ["branch id", "client branch id"],
          },
          {
            key: "name",
            label: "Technician Name",
            required: true,
            aliases: ["technician", "full name", "name"],
          },
          {
            key: "email",
            label: "Email",
            required: false,
            aliases: ["email address"],
          },
          {
            key: "phone",
            label: "Phone",
            required: false,
            aliases: ["telephone", "mobile"],
          },
          {
            key: "methods",
            label: "Methods",
            required: false,
            aliases: ["method", "techniques", "technique", "detected methods"],
          },
          {
            key: "level",
            label: "Level Summary",
            required: false,
            aliases: ["level", "qualification level", "level summary"],
          },
          {
            key: "methodQualifications",
            label: "Method Qualifications",
            required: false,
            aliases: [
              "methods and levels",
              "method levels",
              "method qualifications",
              "detected method qualifications",
            ],
          },
          {
            key: "hasPcnQualification",
            label: "Has PCN Qualification",
            required: false,
            aliases: ["pcn", "pcn qualified"],
          },
          {
            key: "certificateNumber",
            label: "Certificate Number",
            required: false,
            aliases: ["certificate no", "cert number"],
          },
          {
            key: "procedureStatus",
            label: "Procedure Status",
            required: false,
            aliases: ["assessment status", "procedure", "procedure / assessment"],
          },
          {
            key: "pcnRenewalDate",
            label: "PCN Renewal Date",
            required: false,
            aliases: ["pcn expiry", "pcn re-certification"],
          },
          {
            key: "internalAssessmentDate",
            label: "Internal Assessment Date",
            required: false,
            aliases: ["assessment date", "internal review date", "source assessment date"],
          },
          {
            key: "eyeTestValidUntil",
            label: "Eye Test Valid Until",
            required: false,
            aliases: ["eye test", "eye test expiry", "source eye test valid until"],
          },
          {
            key: "documentSummary",
            label: "Document Summary",
            required: false,
            aliases: ["summary", "document notes"],
          },
          {
            key: "sourceFolder",
            label: "Source Folder",
            required: false,
            aliases: ["folder", "technician folder"],
          },
          {
            key: "folderGroup",
            label: "Folder Group",
            required: false,
            aliases: ["group", "branch folder"],
          },
          {
            key: "fileCount",
            label: "File Count",
            required: false,
            aliases: ["document count", "files"],
          },
          {
            key: "missingCoreDocuments",
            label: "Missing Core Documents",
            required: false,
            aliases: ["missing documents", "missing compliance documents"],
          },
          {
            key: "detectedDocuments",
            label: "Detected Documents",
            required: false,
            aliases: ["detected files", "documents", "file list"],
          },
          {
            key: "notes",
            label: "Notes",
            required: false,
            aliases: ["comment", "comments", "document summary", "source folder"],
          },
        ]}
        onImport={props.handleTechnicianImport}
      />

      <ImportDialog
        open={props.isEquipmentImportOpen}
        onOpenChange={props.setIsEquipmentImportOpen}
        title="Import Level III Equipment"
        description="Upload a CSV or Excel file and map the headings. Shared, calibration, and due-date fields can be mapped from whichever column names your source file already uses."
        targetFields={[
          { key: "name", label: "Equipment Name", required: true, aliases: ["equipment", "name"] },
          {
            key: "serialNumber",
            label: "Serial Number",
            required: true,
            aliases: ["serial", "serial no"],
          },
          {
            key: "status",
            label: "Status",
            required: false,
            aliases: ["equipment status"],
          },
          {
            key: "sharedWithMainEquipment",
            label: "Shared With Main Equipment",
            required: false,
            aliases: ["shared", "shared equipment"],
          },
          {
            key: "owner",
            label: "Owner",
            required: false,
            aliases: ["department", "owned by"],
          },
          {
            key: "calibrationType",
            label: "Calibration Type",
            required: false,
            aliases: ["calibration", "service type"],
          },
          {
            key: "lastServiceDate",
            label: "Last Service Date",
            required: false,
            aliases: ["last calibration", "calibration date"],
          },
          {
            key: "nextDueDate",
            label: "Next Due Date",
            required: false,
            aliases: ["next calibration", "due date", "next service date"],
          },
          {
            key: "notes",
            label: "Notes",
            required: false,
            aliases: ["comment", "comments"],
          },
        ]}
        onImport={props.handleEquipmentImport}
      />

      <ImportDialog
        open={props.isSpecimenImportOpen}
        onOpenChange={props.setIsSpecimenImportOpen}
        title="Import Level III Specimens"
        description="Upload a CSV or Excel file and map the headings. Specimen type, mastering, and shared-status columns can be matched to your source file headings manually if needed."
        targetFields={[
          {
            key: "specimenNumber",
            label: "Specimen Number",
            required: true,
            aliases: ["specimen no", "serial number", "reference number"],
          },
          {
            key: "name",
            label: "Specimen Name",
            required: true,
            aliases: ["specimen", "name"],
          },
          {
            key: "specimenType",
            label: "Specimen Type",
            required: true,
            aliases: ["type", "specimen category"],
          },
          {
            key: "status",
            label: "Status",
            required: false,
            aliases: ["specimen status"],
          },
          {
            key: "sharedWithMainSpecimens",
            label: "Shared With Main Specimens",
            required: false,
            aliases: ["shared", "shared specimen"],
          },
          {
            key: "masteringStatus",
            label: "Mastering Status",
            required: false,
            aliases: ["mastering", "master status"],
          },
          {
            key: "notes",
            label: "Notes",
            required: false,
            aliases: ["comment", "comments"],
          },
        ]}
        onImport={props.handleSpecimenImport}
      />
    </>
  );
}
