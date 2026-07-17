import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  datetime,
  date,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------------------------
// Better Auth tables
// These are managed by Better Auth. Do not rename columns — the library
// expects this exact shape. Your app-specific user data lives in `users`.
// ---------------------------------------------------------------------------

export const authUsers = mysqlTable("auth_users", {
  id:            varchar("id", { length: 36 }).primaryKey(),       // UUID
  name:          varchar("name", { length: 255 }).notNull(),
  email:         varchar("email", { length: 320 }).notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image:         text("image"),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const authSessions = mysqlTable("auth_sessions", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  userId:    varchar("userId", { length: 36 }).notNull(),
  token:     varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const authAccounts = mysqlTable("auth_accounts", {
  id:                   varchar("id", { length: 36 }).primaryKey(),
  userId:               varchar("userId", { length: 36 }).notNull(),
  accountId:            varchar("accountId", { length: 255 }).notNull(),
  providerId:           varchar("providerId", { length: 255 }).notNull(),
  accessToken:          text("accessToken"),
  refreshToken:         text("refreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  password:             text("password"),                           // hashed
  passwordHistory:      json("passwordHistory"),
  createdAt:            timestamp("createdAt").defaultNow().notNull(),
  updatedAt:            timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const authVerifications = mysqlTable("auth_verifications", {
  id:         varchar("id", { length: 36 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value:      varchar("value", { length: 255 }).notNull(),
  expiresAt:  timestamp("expiresAt").notNull(),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
});

export type AuthUser         = typeof authUsers.$inferSelect;
export type AuthSession      = typeof authSessions.$inferSelect;
export type AuthAccount      = typeof authAccounts.$inferSelect;
export type AuthVerification = typeof authVerifications.$inferSelect;

// ---------------------------------------------------------------------------
// App user table
// Linked to Better Auth by email. Holds all app-specific fields
// (role, branch, lastSignedIn, etc.) that Better Auth doesn't manage.
// ---------------------------------------------------------------------------

export const users = mysqlTable("users", {
  id:           int("id").autoincrement().primaryKey(),
  authId:       varchar("authId", { length: 36 }).unique(),         // FK → auth_users.id
  name:         text("name"),
  email:        varchar("email", { length: 320 }).unique(),
  avatarUrl:    text("avatarUrl"),
  calendarFeedToken: varchar("calendarFeedToken", { length: 64 }).unique(),
  loginEnabled: boolean("loginEnabled").default(true).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  role:         mysqlEnum("role", ["user", "admin", "super_admin"]).default("user").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User       = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const moduleAccess = mysqlTable("module_access", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").notNull(),
  module:    varchar("module", { length: 100 }).notNull(),
  canView:   boolean("canView").default(false).notNull(),
  canCreate: boolean("canCreate").default(false).notNull(),
  canEdit:   boolean("canEdit").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ModuleAccess = typeof moduleAccess.$inferSelect;
export type InsertModuleAccess = typeof moduleAccess.$inferInsert;

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export const branches = mysqlTable("branches", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull().unique(),
  code:        varchar("code", { length: 50 }),
  description: text("description"),
  companyName: varchar("companyName", { length: 255 }),
  companyDescription: text("companyDescription"),
  logoUrl:     text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }),
  secondaryColor: varchar("secondaryColor", { length: 7 }),
  active:      boolean("active").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Branch       = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export const students = mysqlTable("students", {
  id:               int("id").autoincrement().primaryKey(),
  firstName:        varchar("firstName", { length: 255 }).notNull(),
  lastName:         varchar("lastName", { length: 255 }).notNull(),
  email:            varchar("email", { length: 320 }),
  phone:            varchar("phone", { length: 20 }),
  idNumber:         varchar("idNumber", { length: 50 }),
  passportNumber:   varchar("passportNumber", { length: 50 }),
  studentNumber:    varchar("studentNumber", { length: 50 }),
  dateOfBirth:      date("dateOfBirth"),
  branchId:         int("branchId"),
  interestType:     varchar("interestType", { length: 30 }),
  isCurrentPcnHolder: boolean("isCurrentPcnHolder").default(false).notNull(),
  bindtProductCompleted: boolean("bindtProductCompleted").default(false).notNull(),
  pcnNumber:        varchar("pcnNumber", { length: 100 }),
  active:           boolean("active").default(true).notNull(),
  blacklisted:      boolean("blacklisted").default(false).notNull(),
  blacklistReason:  text("blacklistReason"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Student       = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  companyId: int("company_id"),
  contactId: int("contact_id"),
  companyName: varchar("company_name", { length: 255 }),
  idNumber: varchar("id_number", { length: 50 }),
  passportNumber: varchar("passport_number", { length: 50 }),
  preferredContactMethod: varchar("preferred_contact_method", { length: 30 }),
  methodInterested: varchar("method_interested", { length: 120 }),
  interestedCourseId: int("interested_course_id"),
  interestType: varchar("interest_type", { length: 30 }),
  isCurrentPcnHolder: boolean("is_current_pcn_holder").default(false).notNull(),
  bindtProductCompleted: boolean("bindt_product_completed").default(false).notNull(),
  pcnNumber: varchar("pcn_number", { length: 100 }),
  followUpDate: datetime("follow_up_date"),
  autoFollowUp: boolean("auto_follow_up").default(false).notNull(),
  status: varchar("status", { length: 30 }).default("New").notNull(),
  statusFlag: varchar("status_flag", { length: 20 }).default("Green").notNull(),
  source: varchar("source", { length: 120 }),
  notes: text("notes"),
  isBlacklisted: boolean("is_blacklisted").default(false).notNull(),
  blacklistReason: text("blacklist_reason"),
  duplicateWarning: boolean("duplicate_warning").default(false).notNull(),
  duplicateNotes: text("duplicate_notes"),
  branchId: int("branch_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ---------------------------------------------------------------------------
// CRM Companies, Contacts, and Lead Activity
// ---------------------------------------------------------------------------

export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  registrationNumber: varchar("registrationNumber", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 255 }),
  physicalAddress: text("physicalAddress"),
  primaryContactName: varchar("primaryContactName", { length: 255 }),
  primaryContactEmail: varchar("primaryContactEmail", { length: 320 }),
  primaryContactPhone: varchar("primaryContactPhone", { length: 50 }),
  status: varchar("status", { length: 30 }).default("Active").notNull(),
  branchId: int("branchId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId"),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  position: varchar("position", { length: 120 }),
  contactType: varchar("contactType", { length: 50 }).default("Client").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

export const leadActivities = mysqlTable("leadActivities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  userId: int("userId"),
  activityType: varchar("activityType", { length: 50 }).default("Note").notNull(),
  subject: varchar("subject", { length: 255 }),
  notes: text("notes"),
  dueDate: datetime("dueDate"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: datetime("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courses = mysqlTable("courses", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  code:        varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  duration:    int("duration"),
  level:       mysqlEnum("level", ["Level 1", "Level 2", "Level 3"]).default("Level 1").notNull(),
  branchId:    int("branchId"),
  active:      boolean("active").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course       = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// ---------------------------------------------------------------------------
// Course Schedules
// ---------------------------------------------------------------------------

export const courseSchedules = mysqlTable("courseSchedules", {
  id:           int("id").autoincrement().primaryKey(),
  courseId:     int("courseId").notNull(),
  startDate:    datetime("startDate").notNull(),
  endDate:      datetime("endDate").notNull(),
  endOfCourseExamStartDate: datetime("endOfCourseExamStartDate"),
  endOfCourseExamEndDate: datetime("endOfCourseExamEndDate"),
  lecturerId: int("lecturerId"),
  maxCapacity:  int("maxCapacity"),
  branchId:     int("branchId"),
  courseStartPackConfig: json("courseStartPackConfig").$type<{
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
  }>(),
  status:       mysqlEnum("status", ["Scheduled", "In Progress", "Completed", "Cancelled"]).default("Scheduled").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CourseSchedule       = typeof courseSchedules.$inferSelect;
export type InsertCourseSchedule = typeof courseSchedules.$inferInsert;

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export const enrollments = mysqlTable("enrollments", {
  id:               int("id").autoincrement().primaryKey(),
  studentId:        int("studentId").notNull(),
  courseScheduleId: int("courseScheduleId").notNull(),
  enrollmentDate:   timestamp("enrollmentDate").defaultNow().notNull(),
  status:           mysqlEnum("status", ["Active", "Completed", "Withdrawn", "Suspended"]).default("Active").notNull(),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Enrollment       = typeof enrollments.$inferSelect;
export type InsertEnrollment = typeof enrollments.$inferInsert;

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const attendance = mysqlTable("attendance", {
  id:               int("id").autoincrement().primaryKey(),
  enrollmentId:     int("enrollmentId").notNull(),
  courseScheduleId: int("courseScheduleId").notNull(),
  attendanceDate:   date("attendanceDate").notNull(),
  status:           mysqlEnum("status", ["Present", "Absent", "Late", "Excused"]).default("Present").notNull(),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Attendance       = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export const assessments = mysqlTable("assessments", {
  id:             int("id").autoincrement().primaryKey(),
  enrollmentId:   int("enrollmentId").notNull(),
  assessorId:     int("assessorId"),
  assessmentType: mysqlEnum("assessmentType", ["Theory", "Practical"]).default("Theory").notNull(),
  attemptNumber:  int("attemptNumber").default(1).notNull(),
  score:          decimal("score", { precision: 6, scale: 2 }),
  maxScore:       decimal("maxScore", { precision: 6, scale: 2 }),
  result:         mysqlEnum("result", ["Pass", "Fail", "Incomplete"]).default("Incomplete").notNull(),
  assessmentDate: date("assessmentDate").notNull(),
  notes:          text("notes"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Assessment       = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export const certificates = mysqlTable("certificates", {
  id:                int("id").autoincrement().primaryKey(),
  enrollmentId:      int("enrollmentId").notNull(),
  certificateNumber: varchar("certificateNumber", { length: 120 }).notNull().unique(),
  issuedDate:        date("issuedDate").notNull(),
  expiryDate:        date("expiryDate"),
  status:            mysqlEnum("status", ["Active", "Expired", "Revoked"]).default("Active").notNull(),
  content:           text("content"),
  notes:             text("notes"),
  issuedBy:          int("issuedBy"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

// ---------------------------------------------------------------------------
// Level III Services
// ---------------------------------------------------------------------------

export const levelIIIClients = mysqlTable("levelIIIClients", {
  id:                int("id").autoincrement().primaryKey(),
  companyName:       varchar("companyName", { length: 255 }).notNull(),
  primaryContact:    varchar("primaryContact", { length: 255 }).notNull(),
  secondaryContact:  varchar("secondaryContact", { length: 255 }),
  email:             varchar("email", { length: 320 }).notNull(),
  secondaryEmail:    varchar("secondaryEmail", { length: 320 }),
  phone:             varchar("phone", { length: 50 }).notNull(),
  secondaryPhone:    varchar("secondaryPhone", { length: 50 }),
  physicalAddress:   text("physicalAddress").notNull(),
  visitCadence:      mysqlEnum("visitCadence", ["Weekly", "Monthly", "Six Monthly"]).default("Monthly").notNull(),
  lastVisit:         date("lastVisit"),
  nextVisit:         date("nextVisit"),
  procedureUpdatedAt: date("procedureUpdatedAt"),
  notes:             text("notes"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIIClient = typeof levelIIIClients.$inferSelect;
export type InsertLevelIIIClient = typeof levelIIIClients.$inferInsert;

export const levelIIIActivities = mysqlTable("levelIIIActivities", {
  id:             int("id").autoincrement().primaryKey(),
  clientId:       int("clientId").notNull(),
  activityType:   mysqlEnum("activityType", ["Visit", "Call", "Email", "Assessment", "Procedure Review", "General"]).default("General").notNull(),
  subject:        varchar("subject", { length: 255 }).notNull(),
  activityDate:   date("activityDate").notNull(),
  nextActionDate: date("nextActionDate"),
  status:         mysqlEnum("status", ["Planned", "Completed", "Cancelled"]).default("Planned").notNull(),
  notes:          text("notes"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIIActivity = typeof levelIIIActivities.$inferSelect;
export type InsertLevelIIIActivity = typeof levelIIIActivities.$inferInsert;

export const levelIIITechnicians = mysqlTable("levelIIITechnicians", {
  id:               int("id").autoincrement().primaryKey(),
  clientId:         int("clientId").notNull(),
  clientBranchId:   int("clientBranchId"),
  name:             varchar("name", { length: 255 }).notNull(),
  email:            varchar("email", { length: 320 }).notNull(),
  phone:            varchar("phone", { length: 50 }),
  method:           varchar("method", { length: 255 }).notNull(),
  methods:          json("methods").$type<string[]>(),
  level:            varchar("level", { length: 100 }).notNull(),
  methodQualifications: json("methodQualifications").$type<Array<{ method: string; level: string }>>(),
  hasPcnQualification: boolean("hasPcnQualification").default(false).notNull(),
  certificateNumber: varchar("certificateNumber", { length: 120 }),
  procedureStatus:  varchar("procedureStatus", { length: 255 }),
  pcnRenewalDate:   date("pcnRenewalDate"),
  internalAssessmentDate: date("internalAssessmentDate"),
  eyeTestValidUntil: date("eyeTestValidUntil"),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIITechnician = typeof levelIIITechnicians.$inferSelect;
export type InsertLevelIIITechnician = typeof levelIIITechnicians.$inferInsert;

export const levelIIITechnicianCertificates = mysqlTable("levelIIITechnicianCertificates", {
  id:               int("id").autoincrement().primaryKey(),
  technicianId:     int("technicianId").notNull(),
  assessmentId:     int("assessmentId"),
  clientId:         int("clientId").notNull(),
  clientBranchId:   int("clientBranchId"),
  certificateNumber: varchar("certificateNumber", { length: 120 }).notNull().unique(),
  method:           varchar("method", { length: 255 }).notNull(),
  level:            varchar("level", { length: 100 }).notNull(),
  methodLevels:     json("methodLevels").$type<Array<{ method: string; level: string }>>(),
  issuedDate:       date("issuedDate").notNull(),
  validUntil:       date("validUntil"),
  validityValue:    int("validityValue"),
  validityUnit:     mysqlEnum("validityUnit", ["days", "months", "years", "custom"]),
  status:           mysqlEnum("status", ["Active", "Expired", "Revoked", "Superseded"]).default("Active").notNull(),
  fileName:         varchar("fileName", { length: 255 }),
  fileUrl:          text("fileUrl"),
  fileKey:          varchar("fileKey", { length: 500 }),
  contentType:      varchar("contentType", { length: 255 }),
  sourceFileName:   varchar("sourceFileName", { length: 255 }),
  sourcePath:       text("sourcePath"),
  approvalStatus:   mysqlEnum("approvalStatus", ["draft", "in_review", "approved", "rejected"]).default("draft").notNull(),
  approvalRequestedAt: timestamp("approvalRequestedAt"),
  approvalRequestedBy: int("approvalRequestedBy"),
  approvedAt:       timestamp("approvedAt"),
  approvedBy:       int("approvedBy"),
  approvalNote:     text("approvalNote"),
  notes:            text("notes"),
  issuedBy:         int("issuedBy"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIITechnicianCertificate = typeof levelIIITechnicianCertificates.$inferSelect;
export type InsertLevelIIITechnicianCertificate = typeof levelIIITechnicianCertificates.$inferInsert;

export const levelIIITechnicianCertificateExports = mysqlTable(
  "levelIIITechnicianCertificateExports",
  {
    id: int("id").autoincrement().primaryKey(),
    certificateId: int("certificateId").notNull(),
    technicianId: int("technicianId").notNull(),
    clientId: int("clientId").notNull(),
    exportFormat: mysqlEnum("exportFormat", ["html", "pdf"]).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }),
    subtitle: text("subtitle"),
    artifactSummary: json("artifactSummary").$type<Record<string, string | null> | null>(),
    artifactPayload: json("artifactPayload").$type<Record<string, unknown> | null>(),
    exportedByUserId: int("exportedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type LevelIIITechnicianCertificateExport =
  typeof levelIIITechnicianCertificateExports.$inferSelect;
export type InsertLevelIIITechnicianCertificateExport =
  typeof levelIIITechnicianCertificateExports.$inferInsert;

export const portalClientUsers = mysqlTable("portalClientUsers", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  userId:       int("userId").notNull(),
  accessLevel:  mysqlEnum("accessLevel", ["viewer", "editor", "manager"]).default("viewer").notNull(),
  receiveReminders: boolean("receiveReminders").default(true).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientUser = typeof portalClientUsers.$inferSelect;
export type InsertPortalClientUser = typeof portalClientUsers.$inferInsert;

export const portalClientReminderSettings = mysqlTable("portalClientReminderSettings", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  complianceEnabled: boolean("complianceEnabled").default(true).notNull(),
  documentEnabled: boolean("documentEnabled").default(true).notNull(),
  includeMissingRequired: boolean("includeMissingRequired").default(true).notNull(),
  includePendingReview: boolean("includePendingReview").default(true).notNull(),
  documentLeadDays: int("documentLeadDays").default(14).notNull(),
  complianceEscalationDays: int("complianceEscalationDays").default(14).notNull(),
  documentEscalationDays: int("documentEscalationDays").default(7).notNull(),
  sendToAssignedUsers: boolean("sendToAssignedUsers").default(true).notNull(),
  sendToInternalAdmins: boolean("sendToInternalAdmins").default(true).notNull(),
  escalationManagersOnly: boolean("escalationManagersOnly").default(true).notNull(),
  allowedClientDocumentLabels: json("allowedClientDocumentLabels"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientReminderSetting = typeof portalClientReminderSettings.$inferSelect;
export type InsertPortalClientReminderSetting = typeof portalClientReminderSettings.$inferInsert;

export const portalRequirementDefinitions = mysqlTable("portalRequirementDefinitions", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  name:         varchar("name", { length: 255 }).notNull(),
  category:     varchar("category", { length: 100 }).default("General").notNull(),
  description:  text("description"),
  validityDays: int("validityDays"),
  reminderDays: int("reminderDays").default(30).notNull(),
  isRequired:   boolean("isRequired").default(true).notNull(),
  active:       boolean("active").default(true).notNull(),
  sortOrder:    int("sortOrder").default(0).notNull(),
  customFields: json("customFields"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalRequirementDefinition = typeof portalRequirementDefinitions.$inferSelect;
export type InsertPortalRequirementDefinition = typeof portalRequirementDefinitions.$inferInsert;

export const portalTechnicianRequirements = mysqlTable("portalTechnicianRequirements", {
  id:           int("id").autoincrement().primaryKey(),
  technicianId: int("technicianId").notNull(),
  definitionId: int("definitionId").notNull(),
  status:       mysqlEnum("status", ["missing", "current", "no_expiry", "expiring", "expired", "pending_review"]).default("missing").notNull(),
  issuedAt:     date("issuedAt"),
  validUntil:   date("validUntil"),
  notes:        text("notes"),
  customFieldValues: json("customFieldValues"),
  uploadedByUserId: int("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalTechnicianRequirement = typeof portalTechnicianRequirements.$inferSelect;
export type InsertPortalTechnicianRequirement = typeof portalTechnicianRequirements.$inferInsert;

export const portalRequirementDocuments = mysqlTable("portalRequirementDocuments", {
  id:           int("id").autoincrement().primaryKey(),
  technicianRequirementId: int("technicianRequirementId").notNull(),
  fileName:     varchar("fileName", { length: 255 }).notNull(),
  fileUrl:      text("fileUrl").notNull(),
  fileKey:      varchar("fileKey", { length: 500 }).notNull(),
  contentType:  varchar("contentType", { length: 255 }),
  uploadedByUserId: int("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type PortalRequirementDocument = typeof portalRequirementDocuments.$inferSelect;
export type InsertPortalRequirementDocument = typeof portalRequirementDocuments.$inferInsert;

export const portalRequirementSourceReferences = mysqlTable("portalRequirementSourceReferences", {
  id:           int("id").autoincrement().primaryKey(),
  technicianRequirementId: int("technicianRequirementId").notNull(),
  sourceFileName: varchar("sourceFileName", { length: 255 }).notNull(),
  sourcePath:   text("sourcePath").notNull(),
  importedByUserId: int("importedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type PortalRequirementSourceReference =
  typeof portalRequirementSourceReferences.$inferSelect;
export type InsertPortalRequirementSourceReference =
  typeof portalRequirementSourceReferences.$inferInsert;

export const portalClientDocuments = mysqlTable("portalClientDocuments", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  clientBranchId: int("clientBranchId"),
  title:        varchar("title", { length: 255 }).notNull(),
  category:     varchar("category", { length: 120 }).default("General").notNull(),
  description:  text("description"),
  fileName:     varchar("fileName", { length: 255 }).notNull(),
  fileUrl:      text("fileUrl").notNull(),
  fileKey:      varchar("fileKey", { length: 500 }).notNull(),
  contentType:  varchar("contentType", { length: 255 }),
  sourceFileName: varchar("sourceFileName", { length: 255 }),
  sourcePath:   text("sourcePath"),
  reviewDate:   date("reviewDate"),
  validUntil:   date("validUntil"),
  status:       mysqlEnum("status", ["active", "archived", "superseded"]).default("active").notNull(),
  uploadedByUserId: int("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientDocument = typeof portalClientDocuments.$inferSelect;
export type InsertPortalClientDocument = typeof portalClientDocuments.$inferInsert;

export const portalClientComments = mysqlTable("portalClientComments", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  userId:       int("userId").notNull(),
  requestType:  mysqlEnum("requestType", ["general_comment", "contact_request", "suggestion"]).default("general_comment").notNull(),
  subject:      varchar("subject", { length: 255 }).notNull(),
  message:      text("message").notNull(),
  status:       mysqlEnum("status", ["open", "acknowledged", "closed"]).default("open").notNull(),
  internalNotes: text("internalNotes"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientComment = typeof portalClientComments.$inferSelect;
export type InsertPortalClientComment = typeof portalClientComments.$inferInsert;

export const portalClientResources = mysqlTable("portalClientResources", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  clientBranchId: int("clientBranchId"),
  title:        varchar("title", { length: 255 }).notNull(),
  category:     varchar("category", { length: 120 }).default("General").notNull(),
  description:  text("description"),
  resourceType: mysqlEnum("resourceType", ["file", "link"]).default("file").notNull(),
  linkUrl:      text("linkUrl"),
  fileName:     varchar("fileName", { length: 255 }),
  fileUrl:      text("fileUrl"),
  fileKey:      varchar("fileKey", { length: 500 }),
  contentType:  varchar("contentType", { length: 255 }),
  sortOrder:    int("sortOrder").default(0).notNull(),
  active:       boolean("active").default(true).notNull(),
  uploadedByUserId: int("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientResource = typeof portalClientResources.$inferSelect;
export type InsertPortalClientResource = typeof portalClientResources.$inferInsert;

export const portalApprovalRequests = mysqlTable("portalApprovalRequests", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  entityType:   mysqlEnum("entityType", ["technician", "requirement_record", "client_document", "resource"]).notNull(),
  action:       mysqlEnum("action", ["create", "update", "delete", "upsert"]).notNull(),
  entityId:     int("entityId"),
  summary:      varchar("summary", { length: 255 }).notNull(),
  payload:      json("payload"),
  status:       mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  submittedByUserId: int("submittedByUserId").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  reviewNotes:  text("reviewNotes"),
  reviewedAt:   timestamp("reviewedAt"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalApprovalRequest = typeof portalApprovalRequests.$inferSelect;
export type InsertPortalApprovalRequest = typeof portalApprovalRequests.$inferInsert;

export const portalClientBranches = mysqlTable("portalClientBranches", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  sourceClientId: int("sourceClientId"),
  name:         varchar("name", { length: 255 }).notNull(),
  code:         varchar("code", { length: 80 }),
  description:  text("description"),
  active:       boolean("active").default(true).notNull(),
  sortOrder:    int("sortOrder").default(0).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientBranch = typeof portalClientBranches.$inferSelect;
export type InsertPortalClientBranch = typeof portalClientBranches.$inferInsert;

export const portalClientUserBranches = mysqlTable("portalClientUserBranches", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  userId:       int("userId").notNull(),
  branchId:     int("branchId").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalClientUserBranch = typeof portalClientUserBranches.$inferSelect;
export type InsertPortalClientUserBranch = typeof portalClientUserBranches.$inferInsert;

export const portalServiceDefinitions = mysqlTable("portalServiceDefinitions", {
  id:           int("id").autoincrement().primaryKey(),
  clientId:     int("clientId").notNull(),
  title:        varchar("title", { length: 255 }).notNull(),
  category:     varchar("category", { length: 120 }).default("General").notNull(),
  description:  text("description"),
  instructions: text("instructions"),
  active:       boolean("active").default(true).notNull(),
  sortOrder:    int("sortOrder").default(0).notNull(),
  config:       json("config"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalServiceDefinition = typeof portalServiceDefinitions.$inferSelect;
export type InsertPortalServiceDefinition = typeof portalServiceDefinitions.$inferInsert;

export const portalServiceRequests = mysqlTable("portalServiceRequests", {
  id:             int("id").autoincrement().primaryKey(),
  clientId:       int("clientId").notNull(),
  clientBranchId: int("clientBranchId"),
  serviceDefinitionId: int("serviceDefinitionId"),
  userId:         int("userId").notNull(),
  technicianId:   int("technicianId"),
  title:          varchar("title", { length: 255 }).notNull(),
  requestType:    varchar("requestType", { length: 120 }).notNull(),
  status:         varchar("status", { length: 80 }).default("submitted").notNull(),
  preferredDate:  date("preferredDate"),
  techniques:     json("techniques"),
  details:        text("details"),
  requestedDocuments: json("requestedDocuments"),
  internalNotes:  text("internalNotes"),
  metadata:       json("metadata"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalServiceRequest = typeof portalServiceRequests.$inferSelect;
export type InsertPortalServiceRequest = typeof portalServiceRequests.$inferInsert;

export const portalAssessmentGuides = mysqlTable("portalAssessmentGuides", {
  id:             int("id").autoincrement().primaryKey(),
  clientId:       int("clientId").notNull(),
  clientBranchId: int("clientBranchId"),
  title:          varchar("title", { length: 255 }).notNull(),
  techniqueName:  varchar("techniqueName", { length: 255 }).notNull(),
  description:    text("description"),
  bringItems:     json("bringItems"),
  companyItems:   json("companyItems"),
  active:         boolean("active").default(true).notNull(),
  sortOrder:      int("sortOrder").default(0).notNull(),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalAssessmentGuide = typeof portalAssessmentGuides.$inferSelect;
export type InsertPortalAssessmentGuide = typeof portalAssessmentGuides.$inferInsert;

export const levelIIIAssessments = mysqlTable("levelIIIAssessments", {
  id:             int("id").autoincrement().primaryKey(),
  technicianId:   int("technicianId").notNull(),
  assessmentDate: date("assessmentDate").notNull(),
  method:         varchar("method", { length: 255 }).notNull(),
  level:          varchar("level", { length: 100 }).notNull(),
  methodLevels:   json("methodLevels").$type<Array<{ method: string; level: string }>>(),
  assessor:       varchar("assessor", { length: 255 }).notNull(),
  result:         mysqlEnum("result", ["Pass", "Fail", "Observation", "Pending Review"]).default("Pending Review").notNull(),
  nextReviewDate: date("nextReviewDate"),
  evidenceUrl:    text("evidenceUrl"),
  notes:          text("notes"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIIAssessment = typeof levelIIIAssessments.$inferSelect;
export type InsertLevelIIIAssessment = typeof levelIIIAssessments.$inferInsert;

export const levelIIIEquipment = mysqlTable("levelIIIEquipment", {
  id:                      int("id").autoincrement().primaryKey(),
  name:                    varchar("name", { length: 255 }).notNull(),
  serialNumber:            varchar("serialNumber", { length: 100 }).notNull(),
  status:                  mysqlEnum("status", ["Available", "In Service", "Calibration Due", "Out of Service"]).default("Available").notNull(),
  sharedWithMainEquipment: boolean("sharedWithMainEquipment").default(false).notNull(),
  owner:                   varchar("owner", { length: 255 }).notNull(),
  calibrationType:         varchar("calibrationType", { length: 100 }),
  lastServiceDate:         date("lastServiceDate"),
  nextDueDate:             date("nextDueDate"),
  notes:                   text("notes"),
  createdAt:               timestamp("createdAt").defaultNow().notNull(),
  updatedAt:               timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIIEquipment = typeof levelIIIEquipment.$inferSelect;
export type InsertLevelIIIEquipment = typeof levelIIIEquipment.$inferInsert;

export const levelIIISpecimens = mysqlTable("levelIIISpecimens", {
  id:                      int("id").autoincrement().primaryKey(),
  specimenNumber:          varchar("specimenNumber", { length: 100 }).notNull(),
  name:                    varchar("name", { length: 255 }).notNull(),
  specimenType:            varchar("specimenType", { length: 255 }).notNull(),
  status:                  mysqlEnum("status", ["Available", "In Use", "Shared", "Retired"]).default("Available").notNull(),
  sharedWithMainSpecimens: boolean("sharedWithMainSpecimens").default(false).notNull(),
  masteringStatus:         mysqlEnum("masteringStatus", ["Mastered", "Re-master Required", "Pending"]).default("Pending").notNull(),
  notes:                   text("notes"),
  createdAt:               timestamp("createdAt").defaultNow().notNull(),
  updatedAt:               timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LevelIIISpecimen = typeof levelIIISpecimens.$inferSelect;
export type InsertLevelIIISpecimen = typeof levelIIISpecimens.$inferInsert;

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export const equipment = mysqlTable("equipment", {
  id:                 int("id").autoincrement().primaryKey(),
  name:               varchar("name", { length: 255 }).notNull(),
  serialNumber:       varchar("serialNumber", { length: 100 }),
  make:               varchar("make", { length: 255 }),
  model:              varchar("model", { length: 255 }),
  description:        text("description"),
  domain:             varchar("domain", { length: 100 }),
  calibrationType:    varchar("calibrationType", { length: 100 }),
  intervalMonths:     int("intervalMonths"),
  lastServiceDate:    date("lastServiceDate"),
  nextDueDate:        date("nextDueDate"),
  status:             mysqlEnum("status", ["Active", "Inactive", "Maintenance", "Retired"]).default("Active").notNull(),
  escalationLevel:    int("escalationLevel").default(0).notNull(),
  lastEscalationDate: timestamp("lastEscalationDate"),
  branchId:           int("branchId"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Equipment       = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ---------------------------------------------------------------------------
// Equipment Documents
// ---------------------------------------------------------------------------

export const equipmentDocuments = mysqlTable("equipmentDocuments", {
  id:           int("id").autoincrement().primaryKey(),
  equipmentId:  int("equipmentId").notNull(),
  label:        varchar("label", { length: 255 }).notNull(),
  documentType: mysqlEnum("documentType", ["Manual", "Certificate", "Specification", "Maintenance Log", "Other"]).default("Other").notNull(),
  url:          text("url").notNull(),
  uploadedAt:   timestamp("uploadedAt").defaultNow().notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EquipmentDocument       = typeof equipmentDocuments.$inferSelect;
export type InsertEquipmentDocument = typeof equipmentDocuments.$inferInsert;

export const equipmentLoans = mysqlTable("equipmentLoans", {
  id:                 int("id").autoincrement().primaryKey(),
  equipmentId:        int("equipmentId").notNull(),
  fromBranchId:       int("fromBranchId").notNull(),
  toBranchId:         int("toBranchId").notNull(),
  loanDate:           date("loanDate").notNull(),
  expectedReturnDate: date("expectedReturnDate"),
  returnedAt:         datetime("returnedAt"),
  notes:              text("notes"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EquipmentLoan = typeof equipmentLoans.$inferSelect;
export type InsertEquipmentLoan = typeof equipmentLoans.$inferInsert;

// ---------------------------------------------------------------------------
// Specimen Types
// ---------------------------------------------------------------------------

export const specimenTypes = mysqlTable("specimenTypes", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull().unique(),
  material:    varchar("material", { length: 255 }),
  size:        varchar("size", { length: 255 }),
  weight:      varchar("weight", { length: 255 }),
  description: text("description"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpecimenType       = typeof specimenTypes.$inferSelect;
export type InsertSpecimenType = typeof specimenTypes.$inferInsert;

// ---------------------------------------------------------------------------
// Specimens
// ---------------------------------------------------------------------------

export const specimens = mysqlTable("specimens", {
  id:              int("id").autoincrement().primaryKey(),
  name:            varchar("name", { length: 255 }).notNull(),
  specimenTypeId:  int("specimenTypeId").notNull(),
  serialNumber:    varchar("serialNumber", { length: 100 }),
  description:     text("description"),
  status:          mysqlEnum("status", ["Available", "In Use", "Loaned Out", "Quarantine", "Retired"]).default("Available").notNull(),
  masteringStatus: mysqlEnum("masteringStatus", ["Mastered", "Re-master Required", "Pending"]).default("Pending").notNull(),
  branchId:        int("branchId"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Specimen       = typeof specimens.$inferSelect;
export type InsertSpecimen = typeof specimens.$inferInsert;

// ---------------------------------------------------------------------------
// Specimen Documents
// ---------------------------------------------------------------------------

export const specimenDocuments = mysqlTable("specimenDocuments", {
  id:          int("id").autoincrement().primaryKey(),
  specimenId:  int("specimenId").notNull(),
  label:       varchar("label", { length: 255 }).notNull(),
  url:         text("url").notNull(),
  uploadedAt:  timestamp("uploadedAt").defaultNow().notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpecimenDocument       = typeof specimenDocuments.$inferSelect;
export type InsertSpecimenDocument = typeof specimenDocuments.$inferInsert;

export const specimenLoans = mysqlTable("specimenLoans", {
  id:                 int("id").autoincrement().primaryKey(),
  specimenId:         int("specimenId").notNull(),
  fromBranchId:       int("fromBranchId").notNull(),
  toBranchId:         int("toBranchId").notNull(),
  loanDate:           date("loanDate").notNull(),
  expectedReturnDate: date("expectedReturnDate"),
  returnedAt:         datetime("returnedAt"),
  notes:              text("notes"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SpecimenLoan = typeof specimenLoans.$inferSelect;
export type InsertSpecimenLoan = typeof specimenLoans.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Templates
// ---------------------------------------------------------------------------

export const kpiTemplates = mysqlTable("kpiTemplates", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  branchId:    int("branchId"),
  active:      boolean("active").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KPITemplate       = typeof kpiTemplates.$inferSelect;
export type InsertKPITemplate = typeof kpiTemplates.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Questions
// ---------------------------------------------------------------------------

export const kpiQuestions = mysqlTable("kpiQuestions", {
  id:            int("id").autoincrement().primaryKey(),
  kpiTemplateId: int("kpiTemplateId").notNull(),
  questionText:  text("questionText").notNull(),
  questionType:  mysqlEnum("questionType", ["Text", "MultipleChoice", "Rating", "YesNo"]).default("Text").notNull(),
  options:       json("options"),
  isRequired:    boolean("isRequired").default(true).notNull(),
  displayOrder:  int("displayOrder").default(0).notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KPIQuestion       = typeof kpiQuestions.$inferSelect;
export type InsertKPIQuestion = typeof kpiQuestions.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Records
// ---------------------------------------------------------------------------

export const kpiRecords = mysqlTable("kpiRecords", {
  id:               int("id").autoincrement().primaryKey(),
  kpiTemplateId:    int("kpiTemplateId").notNull(),
  lecturerId:       int("lecturerId"),
  courseScheduleId: int("courseScheduleId"),
  evaluationDate:   date("evaluationDate").notNull(),
  status:           mysqlEnum("status", ["Draft", "Submitted", "Approved", "Rejected"]).default("Draft").notNull(),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KPIRecord       = typeof kpiRecords.$inferSelect;
export type InsertKPIRecord = typeof kpiRecords.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Answers
// ---------------------------------------------------------------------------

export const kpiAnswers = mysqlTable("kpiAnswers", {
  id:             int("id").autoincrement().primaryKey(),
  kpiRecordId:    int("kpiRecordId").notNull(),
  kpiQuestionId:  int("kpiQuestionId").notNull(),
  answerText:     text("answerText"),
  answerValue:    varchar("answerValue", { length: 500 }),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KPIAnswer       = typeof kpiAnswers.$inferSelect;
export type InsertKPIAnswer = typeof kpiAnswers.$inferInsert;

// ---------------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------------

export const lecturers = mysqlTable("lecturers", {
  id:             int("id").autoincrement().primaryKey(),
  firstName:      varchar("firstName", { length: 255 }).notNull(),
  lastName:       varchar("lastName", { length: 255 }).notNull(),
  email:          varchar("email", { length: 320 }),
  phone:          varchar("phone", { length: 20 }),
  specialization: varchar("specialization", { length: 255 }),
  branchId:       int("branchId"),
  active:         boolean("active").default(true).notNull(),
  externalLinks:  json("externalLinks"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lecturer       = typeof lecturers.$inferSelect;
export type InsertLecturer = typeof lecturers.$inferInsert;

export const methods = mysqlTable("methods", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull().unique(),
  color:       varchar("color", { length: 20 }),
  description: text("description"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Method = typeof methods.$inferSelect;
export type InsertMethod = typeof methods.$inferInsert;

// ---------------------------------------------------------------------------
// Training Offerings
// ---------------------------------------------------------------------------

export const trainingOfferings = mysqlTable("trainingOfferings", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  courseId:    int("courseId"),
  startDate:   date("startDate"),
  endDate:     date("endDate"),
  status:      mysqlEnum("status", ["Planned", "Active", "Completed", "Cancelled"]).default("Planned").notNull(),
  branchId:    int("branchId"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingOffering       = typeof trainingOfferings.$inferSelect;
export type InsertTrainingOffering = typeof trainingOfferings.$inferInsert;

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documents = mysqlTable("documents", {
  id:           int("id").autoincrement().primaryKey(),
  title:        varchar("title", { length: 255 }).notNull(),
  description:  text("description"),
  documentType: varchar("documentType", { length: 100 }),
  content:      text("content"),
  url:          text("url").notNull(),
  uploadedBy:   int("uploadedBy"),
  branchId:     int("branchId"),
  tags:         json("tags"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document       = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const plannerEntries = mysqlTable("plannerEntries", {
  id:         int("id").autoincrement().primaryKey(),
  userId:     int("userId").notNull(),
  title:      varchar("title", { length: 255 }).notNull(),
  entryDate:  date("entryDate").notNull(),
  notes:      text("notes"),
  reminderAt: datetime("reminderAt"),
  isComplete: boolean("isComplete").default(false).notNull(),
  recurrence: varchar("recurrence", { length: 30 }),
  recurrenceUntil: date("recurrenceUntil"),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
  updatedAt:  timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerEntry = typeof plannerEntries.$inferSelect;
export type InsertPlannerEntry = typeof plannerEntries.$inferInsert;

export const sharedPlannerEvents = mysqlTable("sharedPlannerEvents", {
  id:               int("id").autoincrement().primaryKey(),
  title:            varchar("title", { length: 255 }).notNull(),
  eventType:        mysqlEnum("eventType", [
    "Meeting",
    "Training",
    "Deadline",
    "Reminder",
    "Visit",
    "General",
  ]).default("General").notNull(),
  branchId:         int("branchId"),
  createdByUserId:  int("createdByUserId").notNull(),
  startAt:          datetime("startAt").notNull(),
  endAt:            datetime("endAt"),
  isAllDay:         boolean("isAllDay").default(false).notNull(),
  location:         varchar("location", { length: 255 }),
  notes:            text("notes"),
  recurrence:       varchar("recurrence", { length: 30 }),
  recurrenceUntil:  date("recurrenceUntil"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SharedPlannerEvent = typeof sharedPlannerEvents.$inferSelect;
export type InsertSharedPlannerEvent = typeof sharedPlannerEvents.$inferInsert;

export const plannerTimesheetProfiles = mysqlTable("plannerTimesheetProfiles", {
  id:            int("id").autoincrement().primaryKey(),
  userId:        int("userId").notNull().unique(),
  department:    varchar("department", { length: 255 }),
  signatureName: varchar("signatureName", { length: 255 }),
  personalLeaveAllowanceDays: int("personalLeaveAllowanceDays"),
  personalLeaveCarryOverDays: int("personalLeaveCarryOverDays").default(0).notNull(),
  leaveYearStartMonth: int("leaveYearStartMonth").default(1).notNull(),
  monThuStartTime: varchar("monThuStartTime", { length: 10 }),
  monThuEndTime: varchar("monThuEndTime", { length: 10 }),
  fridayStartTime: varchar("fridayStartTime", { length: 10 }),
  fridayEndTime: varchar("fridayEndTime", { length: 10 }),
  weekendStartTime: varchar("weekendStartTime", { length: 10 }),
  weekendEndTime: varchar("weekendEndTime", { length: 10 }),
  monThuTemplateId: int("monThuTemplateId"),
  fridayTemplateId: int("fridayTemplateId"),
  weekendTemplateId: int("weekendTemplateId"),
  lunchBreakMinutes: int("lunchBreakMinutes").default(60).notNull(),
  teaBreakMinutes: int("teaBreakMinutes").default(30).notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerTimesheetProfile = typeof plannerTimesheetProfiles.$inferSelect;
export type InsertPlannerTimesheetProfile = typeof plannerTimesheetProfiles.$inferInsert;

export const plannerTimesheetDepartmentCoverageSettings = mysqlTable(
  "plannerTimesheetDepartmentCoverageSettings",
  {
    id: int("id").autoincrement().primaryKey(),
    department: varchar("department", { length: 255 }).notNull().unique(),
    minimumAvailableCount: int("minimumAvailableCount"),
    maximumPeopleOff: int("maximumPeopleOff"),
    mediumRiskPercent: int("mediumRiskPercent").default(25).notNull(),
    highRiskPercent: int("highRiskPercent").default(50).notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId"),
    updatedByUserId: int("updatedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type PlannerTimesheetDepartmentCoverageSetting =
  typeof plannerTimesheetDepartmentCoverageSettings.$inferSelect;
export type InsertPlannerTimesheetDepartmentCoverageSetting =
  typeof plannerTimesheetDepartmentCoverageSettings.$inferInsert;

export const plannerTimesheetOptions = mysqlTable("plannerTimesheetOptions", {
  id:          int("id").autoincrement().primaryKey(),
  userId:      int("userId").notNull(),
  label:       varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder:   int("sortOrder").default(0).notNull(),
  hoursCategory: varchar("hoursCategory", { length: 30 }).default("working").notNull(),
  isActive:    boolean("isActive").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerTimesheetOption = typeof plannerTimesheetOptions.$inferSelect;
export type InsertPlannerTimesheetOption = typeof plannerTimesheetOptions.$inferInsert;

export const plannerTimesheetEntries = mysqlTable("plannerTimesheetEntries", {
    id:                int("id").autoincrement().primaryKey(),
    userId:            int("userId").notNull(),
    entryDate:         date("entryDate").notNull(),
    startTime:         varchar("startTime", { length: 10 }),
    endTime:           varchar("endTime", { length: 10 }),
    lunchBreakMinutes: int("lunchBreakMinutes"),
    teaBreakMinutes:   int("teaBreakMinutes"),
    leavePortionPercent: int("leavePortionPercent"),
    selectedOptionIds: json("selectedOptionIds").$type<number[]>().notNull(),
    remarks:           text("remarks"),
    createdAt:         timestamp("createdAt").defaultNow().notNull(),
    updatedAt:         timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  });

export type PlannerTimesheetEntry = typeof plannerTimesheetEntries.$inferSelect;
export type InsertPlannerTimesheetEntry = typeof plannerTimesheetEntries.$inferInsert;

export const plannerTimesheetTemplates = mysqlTable("plannerTimesheetTemplates", {
  id:                int("id").autoincrement().primaryKey(),
  userId:            int("userId").notNull(),
  label:             varchar("label", { length: 255 }).notNull(),
  description:       text("description"),
  startTime:         varchar("startTime", { length: 10 }),
  endTime:           varchar("endTime", { length: 10 }),
  lunchBreakMinutes: int("lunchBreakMinutes"),
  teaBreakMinutes:   int("teaBreakMinutes"),
  leavePortionPercent: int("leavePortionPercent"),
  selectedOptionIds: json("selectedOptionIds").$type<number[]>().notNull(),
  remarks:           text("remarks"),
  isActive:          boolean("isActive").default(true).notNull(),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerTimesheetTemplate = typeof plannerTimesheetTemplates.$inferSelect;
export type InsertPlannerTimesheetTemplate = typeof plannerTimesheetTemplates.$inferInsert;

export const plannerTimesheetHolidays = mysqlTable("plannerTimesheetHolidays", {
  id:         int("id").autoincrement().primaryKey(),
  userId:     int("userId").notNull(),
  holidayDate: date("holidayDate").notNull(),
  label:      varchar("label", { length: 255 }).notNull(),
  holidayType: varchar("holidayType", { length: 40 }).notNull().default("public_holiday"),
  notes:      text("notes"),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
  updatedAt:  timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerTimesheetHoliday = typeof plannerTimesheetHolidays.$inferSelect;
export type InsertPlannerTimesheetHoliday = typeof plannerTimesheetHolidays.$inferInsert;

export const plannerTimesheetMonthStatuses = mysqlTable("plannerTimesheetMonthStatuses", {
  id:           int("id").autoincrement().primaryKey(),
  userId:       int("userId").notNull(),
  monthDate:    date("monthDate").notNull(),
  status:       varchar("status", { length: 20 }).notNull().default("open"),
  statusNote:   text("statusNote"),
  lockedAt:     timestamp("lockedAt"),
  submittedAt:  timestamp("submittedAt"),
  submittedByName: varchar("submittedByName", { length: 255 }),
  employeeDeclarationAccepted: boolean("employeeDeclarationAccepted").notNull().default(false),
  employeeDeclarationAcceptedAt: timestamp("employeeDeclarationAcceptedAt"),
  submissionNote:  text("submissionNote"),
  reviewedAt:   timestamp("reviewedAt"),
  reviewedByUserId: int("reviewedByUserId"),
  reviewedByName:   varchar("reviewedByName", { length: 255 }),
  reviewerDeclarationAccepted: boolean("reviewerDeclarationAccepted").notNull().default(false),
  reviewerDeclarationAcceptedAt: timestamp("reviewerDeclarationAcceptedAt"),
  reviewNote:       text("reviewNote"),
  handedOffAt:      timestamp("handedOffAt"),
  handedOffByUserId: int("handedOffByUserId"),
  handedOffByName:   varchar("handedOffByName", { length: 255 }),
  handoffNote:       text("handoffNote"),
  historyJson:      json("historyJson").$type<
    {
      id: string;
      action: string;
      actionLabel: string;
      actorUserId: number | null;
      actorName: string | null;
      note: string | null;
      createdAt: string;
      resultingStatus: string;
    }[]
  >(),
  reopenedAt:   timestamp("reopenedAt"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlannerTimesheetMonthStatus = typeof plannerTimesheetMonthStatuses.$inferSelect;
export type InsertPlannerTimesheetMonthStatus = typeof plannerTimesheetMonthStatuses.$inferInsert;

export const plannerTimesheetLeaveOverrideReviews = mysqlTable(
  "plannerTimesheetLeaveOverrideReviews",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    entryDate: date("entryDate").notNull(),
    reviewedAt: timestamp("reviewedAt"),
    reviewedByUserId: int("reviewedByUserId"),
    reviewedByName: varchar("reviewedByName", { length: 255 }),
    reviewNote: text("reviewNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  }
);

export type PlannerTimesheetLeaveOverrideReview =
  typeof plannerTimesheetLeaveOverrideReviews.$inferSelect;
export type InsertPlannerTimesheetLeaveOverrideReview =
  typeof plannerTimesheetLeaveOverrideReviews.$inferInsert;

// ---------------------------------------------------------------------------
// Import Logs
// ---------------------------------------------------------------------------

export const importLogs = mysqlTable("importLogs", {
  id:                int("id").autoincrement().primaryKey(),
  entityType:        varchar("entityType", { length: 100 }).notNull(),
  fileName:          varchar("fileName", { length: 255 }).notNull(),
  totalRecords:      int("totalRecords").notNull(),
  successfulRecords: int("successfulRecords").notNull(),
  failedRecords:     int("failedRecords").notNull(),
  columnMapping:     json("columnMapping").notNull(),
  status:            mysqlEnum("status", ["Pending", "Processing", "Completed", "Failed"]).default("Pending").notNull(),
  errorLog:          text("errorLog"),
  uploadedBy:        int("uploadedBy"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
});

export type ImportLog       = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export const auditLogs = mysqlTable("auditLogs", {
  id:           int("id").autoincrement().primaryKey(),
  userId:       int("userId").notNull(),
  action:       varchar("action", { length: 100 }).notNull(),
  entityType:   varchar("entityType", { length: 100 }).notNull(),
  entityId:     int("entityId").notNull(),
  changes:      json("changes"),
  ipAddress:    varchar("ipAddress", { length: 45 }),
  userAgent:    text("userAgent"),
  status:       mysqlEnum("status", ["Success", "Failed"]).default("Success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog       = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const reports = mysqlTable("reports", {
  id:          int("id").autoincrement().primaryKey(),
  title:       varchar("title", { length: 255 }).notNull(),
  reportType:  varchar("reportType", { length: 100 }).notNull(),
  generatedBy: int("generatedBy"),
  branchId:    int("branchId"),
  filters:     json("filters"),
  data:        json("data"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Report       = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ---------------------------------------------------------------------------
// Quality Actions
// ---------------------------------------------------------------------------

export const qualityActions = mysqlTable("qualityActions", {
  id:                 int("id").autoincrement().primaryKey(),
  referenceNumber:    varchar("referenceNumber", { length: 60 }).notNull().unique(),
  title:              varchar("title", { length: 255 }).notNull(),
  category:           mysqlEnum("category", [
    "Nonconformance",
    "Corrective Action",
    "Observation",
    "Improvement",
  ]).default("Nonconformance").notNull(),
  source:             mysqlEnum("source", [
    "Customer Complaint",
    "Internal Audit",
    "Supplier",
    "Training",
    "Examination",
    "Level III",
    "Equipment",
    "Document Control",
    "Management Review",
    "Other",
  ]).default("Other").notNull(),
  severity:           mysqlEnum("severity", ["Minor", "Major", "Critical"]).default("Minor").notNull(),
  status:             mysqlEnum("status", ["Open", "In Progress", "Awaiting Verification", "Closed"]).default("Open").notNull(),
  branchId:           int("branchId"),
  ownerName:          varchar("ownerName", { length: 255 }),
  reportedByUserId:   int("reportedByUserId"),
  reportedDate:       date("reportedDate").notNull(),
  dueDate:            date("dueDate"),
  closedAt:           datetime("closedAt"),
  description:        text("description").notNull(),
  immediateCorrection:text("immediateCorrection"),
  rootCause:          text("rootCause"),
  correctiveAction:   text("correctiveAction"),
  verificationNotes:  text("verificationNotes"),
  verifiedByName:     varchar("verifiedByName", { length: 255 }),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QualityAction = typeof qualityActions.$inferSelect;
export type InsertQualityAction = typeof qualityActions.$inferInsert;

export const qualityAudits = mysqlTable("qualityAudits", {
  id:               int("id").autoincrement().primaryKey(),
  referenceNumber:  varchar("referenceNumber", { length: 60 }).notNull().unique(),
  title:            varchar("title", { length: 255 }).notNull(),
  auditType:        mysqlEnum("auditType", [
    "Internal Audit",
    "Process Audit",
    "Training Audit",
    "Equipment Audit",
    "Document Audit",
    "Branch Audit",
  ]).default("Internal Audit").notNull(),
  status:           mysqlEnum("status", ["Planned", "In Progress", "Completed", "Cancelled"]).default("Planned").notNull(),
  branchId:         int("branchId"),
  leadAuditor:      varchar("leadAuditor", { length: 255 }),
  auditee:          varchar("auditee", { length: 255 }),
  plannedDate:      date("plannedDate").notNull(),
  completedDate:    date("completedDate"),
  nextAuditDate:    date("nextAuditDate"),
  scope:            text("scope").notNull(),
  criteria:         text("criteria"),
  summary:          text("summary"),
  findingsSummary:  text("findingsSummary"),
  followUpSummary:  text("followUpSummary"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QualityAudit = typeof qualityAudits.$inferSelect;
export type InsertQualityAudit = typeof qualityAudits.$inferInsert;

export const managementReviews = mysqlTable("managementReviews", {
  id:                int("id").autoincrement().primaryKey(),
  referenceNumber:   varchar("referenceNumber", { length: 60 }).notNull().unique(),
  title:             varchar("title", { length: 255 }).notNull(),
  status:            mysqlEnum("status", ["Planned", "Held", "Closed", "Cancelled"]).default("Planned").notNull(),
  branchId:          int("branchId"),
  meetingDate:       date("meetingDate").notNull(),
  nextReviewDate:    date("nextReviewDate"),
  chairperson:       varchar("chairperson", { length: 255 }),
  attendees:         text("attendees"),
  agenda:            text("agenda"),
  inputsSummary:     text("inputsSummary"),
  decisionsSummary:  text("decisionsSummary"),
  actionSummary:     text("actionSummary"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManagementReview = typeof managementReviews.$inferSelect;
export type InsertManagementReview = typeof managementReviews.$inferInsert;

export const externalProviders = mysqlTable("externalProviders", {
  id:                  int("id").autoincrement().primaryKey(),
  referenceNumber:     varchar("referenceNumber", { length: 60 }).notNull().unique(),
  companyName:         varchar("companyName", { length: 255 }).notNull(),
  providerType:        mysqlEnum("providerType", [
    "Lecturer",
    "Assessor",
    "Calibration",
    "Consumables",
    "Venue",
    "Equipment",
    "Level III Consultant",
    "Document / Printing",
    "Other",
  ]).default("Other").notNull(),
  status:              mysqlEnum("status", [
    "Approved",
    "Conditional",
    "Under Review",
    "Suspended",
    "Inactive",
  ]).default("Approved").notNull(),
  rating:              mysqlEnum("rating", ["Preferred", "Acceptable", "Probationary"]).default("Acceptable").notNull(),
  branchId:            int("branchId"),
  primaryContact:      varchar("primaryContact", { length: 255 }),
  email:               varchar("email", { length: 320 }),
  phone:               varchar("phone", { length: 50 }),
  serviceScope:        text("serviceScope").notNull(),
  approvalDate:        date("approvalDate"),
  lastEvaluationDate:  date("lastEvaluationDate"),
  nextEvaluationDate:  date("nextEvaluationDate"),
  notes:               text("notes"),
  correctiveActionNotes: text("correctiveActionNotes"),
  createdAt:           timestamp("createdAt").defaultNow().notNull(),
  updatedAt:           timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExternalProvider = typeof externalProviders.$inferSelect;
export type InsertExternalProvider = typeof externalProviders.$inferInsert;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications = mysqlTable("notifications", {
  id:            int("id").autoincrement().primaryKey(),
  userId:        int("userId").notNull(),
  type:          mysqlEnum("type", [
    "student_added", "lead_status_changed", "attendance_marked",
    "equipment_maintenance", "specimen_mastered", "kpi_completed",
    "course_started", "enrollment_confirmed", "system_alert",
  ]).notNull(),
  title:         varchar("title", { length: 255 }).notNull(),
  message:       text("message").notNull(),
  entityType:    varchar("entityType", { length: 100 }),
  entityId:      int("entityId"),
  relatedUserId: int("relatedUserId"),
  isRead:        boolean("isRead").default(false).notNull(),
  actionUrl:     text("actionUrl"),
  metadata:      json("metadata"),
  priority:      mysqlEnum("priority", ["low", "normal", "high", "critical"]).default("normal").notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  readAt:        timestamp("readAt"),
});

export type Notification       = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ---------------------------------------------------------------------------
// Notification Preferences
// ---------------------------------------------------------------------------

export const notificationPreferences = mysqlTable("notificationPreferences", {
  id:                   int("id").autoincrement().primaryKey(),
  userId:               int("userId").notNull().unique(),
  emailNotifications:   boolean("emailNotifications").default(true).notNull(),
  pushNotifications:    boolean("pushNotifications").default(true).notNull(),
  soundAlerts:          boolean("soundAlerts").default(true).notNull(),
  studentAddedNotif:    boolean("studentAddedNotif").default(true).notNull(),
  leadStatusChangeNotif:boolean("leadStatusChangeNotif").default(true).notNull(),
  attendanceNotif:      boolean("attendanceNotif").default(true).notNull(),
  equipmentNotif:       boolean("equipmentNotif").default(true).notNull(),
  specimenNotif:        boolean("specimenNotif").default(true).notNull(),
  kpiNotif:             boolean("kpiNotif").default(true).notNull(),
  courseNotif:          boolean("courseNotif").default(true).notNull(),
  enrollmentNotif:      boolean("enrollmentNotif").default(true).notNull(),
  systemAlertNotif:     boolean("systemAlertNotif").default(true).notNull(),
  createdAt:            timestamp("createdAt").defaultNow().notNull(),
  updatedAt:            timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference       = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ---------------------------------------------------------------------------
// Notification Subscriptions
// ---------------------------------------------------------------------------

export const notificationSubscriptions = mysqlTable("notificationSubscriptions", {
  id:         int("id").autoincrement().primaryKey(),
  userId:     int("userId").notNull(),
  deviceId:   varchar("deviceId", { length: 255 }).notNull(),
  endpoint:   text("endpoint"),
  auth:       text("auth"),
  p256dh:     text("p256dh"),
  isActive:   boolean("isActive").default(true).notNull(),
  lastActive: timestamp("lastActive").defaultNow().notNull(),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationSubscription       = typeof notificationSubscriptions.$inferSelect;
export type InsertNotificationSubscription = typeof notificationSubscriptions.$inferInsert;
