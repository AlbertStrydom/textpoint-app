import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// PostgreSQL enums
// PostgreSQL requires enum types to be declared independently of tables.
// ---------------------------------------------------------------------------

export const usersRoleEnum = pgEnum("users_role_enum", ["user", "admin", "super_admin"]);
export const coursesLevelEnum = pgEnum("courses_level_enum", ["Level 1", "Level 2", "Level 3"]);
export const courseSchedulesStatusEnum = pgEnum("course_schedules_status_enum", ["Scheduled", "In Progress", "Completed", "Cancelled"]);
export const enrollmentsStatusEnum = pgEnum("enrollments_status_enum", ["Active", "Completed", "Withdrawn", "Suspended"]);
export const attendanceStatusEnum = pgEnum("attendance_status_enum", ["Present", "Absent", "Late", "Excused"]);
export const assessmentsAssessmentTypeEnum = pgEnum("assessments_assessment_type_enum", ["Theory", "Practical"]);
export const assessmentsResultEnum = pgEnum("assessments_result_enum", ["Pass", "Fail", "Incomplete"]);
export const certificatesStatusEnum = pgEnum("certificates_status_enum", ["Active", "Expired", "Revoked"]);
export const levelIIIClientsVisitCadenceEnum = pgEnum("level_iiiclients_visit_cadence_enum", ["Weekly", "Monthly", "Six Monthly"]);
export const levelIIIActivitiesActivityTypeEnum = pgEnum("level_iiiactivities_activity_type_enum", ["Visit", "Call", "Email", "Assessment", "Procedure Review", "General"]);
export const levelIIIActivitiesStatusEnum = pgEnum("level_iiiactivities_status_enum", ["Planned", "Completed", "Cancelled"]);
export const levelIIITechnicianCertificatesValidityUnitEnum = pgEnum("level_iiitechnician_certificates_validity_unit_enum", ["days", "months", "years", "custom"]);
export const levelIIITechnicianCertificatesStatusEnum = pgEnum("level_iiitechnician_certificates_status_enum", ["Active", "Expired", "Revoked", "Superseded"]);
export const levelIIITechnicianCertificatesApprovalStatusEnum = pgEnum("level_iiitechnician_certificates_approval_status_enum", ["draft", "in_review", "approved", "rejected"]);
export const levelIIITechnicianCertificateExportsExportFormatEnum = pgEnum("level_iiitechnician_certificate_exports_export_format_enum", ["html", "pdf"]);
export const portalClientUsersAccessLevelEnum = pgEnum("portal_client_users_access_level_enum", ["viewer", "editor", "manager"]);
export const portalTechnicianRequirementsStatusEnum = pgEnum("portal_technician_requirements_status_enum", ["missing", "current", "no_expiry", "expiring", "expired", "pending_review"]);
export const portalClientDocumentsStatusEnum = pgEnum("portal_client_documents_status_enum", ["active", "archived", "superseded"]);
export const portalClientCommentsRequestTypeEnum = pgEnum("portal_client_comments_request_type_enum", ["general_comment", "contact_request", "suggestion"]);
export const portalClientCommentsStatusEnum = pgEnum("portal_client_comments_status_enum", ["open", "acknowledged", "closed"]);
export const portalClientResourcesResourceTypeEnum = pgEnum("portal_client_resources_resource_type_enum", ["file", "link"]);
export const portalApprovalRequestsEntityTypeEnum = pgEnum("portal_approval_requests_entity_type_enum", ["technician", "requirement_record", "client_document", "resource"]);
export const portalApprovalRequestsActionEnum = pgEnum("portal_approval_requests_action_enum", ["create", "update", "delete", "upsert"]);
export const portalApprovalRequestsStatusEnum = pgEnum("portal_approval_requests_status_enum", ["pending", "approved", "rejected"]);
export const levelIIIAssessmentsResultEnum = pgEnum("level_iiiassessments_result_enum", ["Pass", "Fail", "Observation", "Pending Review"]);
export const levelIIIEquipmentStatusEnum = pgEnum("level_iiiequipment_status_enum", ["Available", "In Service", "Calibration Due", "Out of Service"]);
export const levelIIISpecimensStatusEnum = pgEnum("level_iiispecimens_status_enum", ["Available", "In Use", "Shared", "Retired"]);
export const levelIIISpecimensMasteringStatusEnum = pgEnum("level_iiispecimens_mastering_status_enum", ["Mastered", "Re-master Required", "Pending"]);
export const equipmentStatusEnum = pgEnum("equipment_status_enum", ["Active", "Inactive", "Maintenance", "Retired"]);
export const equipmentDocumentsDocumentTypeEnum = pgEnum("equipment_documents_document_type_enum", ["Manual", "Certificate", "Specification", "Maintenance Log", "Other"]);
export const specimensStatusEnum = pgEnum("specimens_status_enum", ["Available", "In Use", "Loaned Out", "Quarantine", "Retired"]);
export const specimensMasteringStatusEnum = pgEnum("specimens_mastering_status_enum", ["Mastered", "Re-master Required", "Pending"]);
export const kpiQuestionsQuestionTypeEnum = pgEnum("kpi_questions_question_type_enum", ["Text", "MultipleChoice", "Rating", "YesNo"]);
export const kpiRecordsStatusEnum = pgEnum("kpi_records_status_enum", ["Draft", "Submitted", "Approved", "Rejected"]);
export const trainingOfferingsStatusEnum = pgEnum("training_offerings_status_enum", ["Planned", "Active", "Completed", "Cancelled"]);
export const sharedPlannerEventsEventTypeEnum = pgEnum("shared_planner_events_event_type_enum", [
    "Meeting",
    "Training",
    "Deadline",
    "Reminder",
    "Visit",
    "General",
  ]);
export const importLogsStatusEnum = pgEnum("import_logs_status_enum", ["Pending", "Processing", "Completed", "Failed"]);
export const auditLogsStatusEnum = pgEnum("audit_logs_status_enum", ["Success", "Failed"]);
export const qualityActionsCategoryEnum = pgEnum("quality_actions_category_enum", [
    "Nonconformance",
    "Corrective Action",
    "Observation",
    "Improvement",
  ]);
export const qualityActionsSourceEnum = pgEnum("quality_actions_source_enum", [
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
  ]);
export const qualityActionsSeverityEnum = pgEnum("quality_actions_severity_enum", ["Minor", "Major", "Critical"]);
export const qualityActionsStatusEnum = pgEnum("quality_actions_status_enum", ["Open", "In Progress", "Awaiting Verification", "Closed"]);
export const qualityAuditsAuditTypeEnum = pgEnum("quality_audits_audit_type_enum", [
    "Internal Audit",
    "Process Audit",
    "Training Audit",
    "Equipment Audit",
    "Document Audit",
    "Branch Audit",
  ]);
export const qualityAuditsStatusEnum = pgEnum("quality_audits_status_enum", ["Planned", "In Progress", "Completed", "Cancelled"]);
export const managementReviewsStatusEnum = pgEnum("management_reviews_status_enum", ["Planned", "Held", "Closed", "Cancelled"]);
export const externalProvidersProviderTypeEnum = pgEnum("external_providers_provider_type_enum", [
    "Lecturer",
    "Assessor",
    "Calibration",
    "Consumables",
    "Venue",
    "Equipment",
    "Level III Consultant",
    "Document / Printing",
    "Other",
  ]);
export const externalProvidersStatusEnum = pgEnum("external_providers_status_enum", [
    "Approved",
    "Conditional",
    "Under Review",
    "Suspended",
    "Inactive",
  ]);
export const externalProvidersRatingEnum = pgEnum("external_providers_rating_enum", ["Preferred", "Acceptable", "Probationary"]);
export const notificationsTypeEnum = pgEnum("notifications_type_enum", [
    "student_added", "lead_status_changed", "attendance_marked",
    "equipment_maintenance", "specimen_mastered", "kpi_completed",
    "course_started", "enrollment_confirmed", "system_alert",
  ]);
export const notificationsPriorityEnum = pgEnum("notifications_priority_enum", ["low", "normal", "high", "critical"]);

// ---------------------------------------------------------------------------
// Better Auth tables
// These are managed by Better Auth. Do not rename columns — the library
// expects this exact shape. Your app-specific user data lives in `users`.
// ---------------------------------------------------------------------------

export const authUsers = pgTable("auth_users", {
  id:            varchar("id", { length: 36 }).primaryKey(),       // UUID
  name:          varchar("name", { length: 255 }).notNull(),
  email:         varchar("email", { length: 320 }).notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image:         text("image"),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const authSessions = pgTable("auth_sessions", {
  id:        varchar("id", { length: 36 }).primaryKey(),
  userId:    varchar("userId", { length: 36 }).notNull(),
  token:     varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const authAccounts = pgTable("auth_accounts", {
  id:                   varchar("id", { length: 36 }).primaryKey(),
  userId:               varchar("userId", { length: 36 }).notNull(),
  accountId:            varchar("accountId", { length: 255 }).notNull(),
  providerId:           varchar("providerId", { length: 255 }).notNull(),
  accessToken:          text("accessToken"),
  refreshToken:         text("refreshToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  password:             text("password"),                           // hashed
  passwordHistory:      jsonb("passwordHistory"),
  createdAt:            timestamp("createdAt").defaultNow().notNull(),
  updatedAt:            timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const authVerifications = pgTable("auth_verifications", {
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

export const users = pgTable("users", {
  id:           serial("id").primaryKey(),
  authId:       varchar("authId", { length: 36 }).unique(),         // FK → auth_users.id
  name:         text("name"),
  email:        varchar("email", { length: 320 }).unique(),
  avatarUrl:    text("avatarUrl"),
  calendarFeedToken: varchar("calendarFeedToken", { length: 64 }).unique(),
  loginEnabled: boolean("loginEnabled").default(true).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  role:         usersRoleEnum("role").default("user").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User       = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const moduleAccess = pgTable("module_access", {
  id:        serial("id").primaryKey(),
  userId:    integer("userId").notNull(),
  module:    varchar("module", { length: 100 }).notNull(),
  canView:   boolean("canView").default(false).notNull(),
  canCreate: boolean("canCreate").default(false).notNull(),
  canEdit:   boolean("canEdit").default(false).notNull(),
  canDelete: boolean("canDelete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type ModuleAccess = typeof moduleAccess.$inferSelect;
export type InsertModuleAccess = typeof moduleAccess.$inferInsert;

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export const branches = pgTable("branches", {
  id:          serial("id").primaryKey(),
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
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Branch       = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export const students = pgTable("students", {
  id:               serial("id").primaryKey(),
  firstName:        varchar("firstName", { length: 255 }).notNull(),
  lastName:         varchar("lastName", { length: 255 }).notNull(),
  email:            varchar("email", { length: 320 }),
  phone:            varchar("phone", { length: 20 }),
  idNumber:         varchar("idNumber", { length: 50 }),
  passportNumber:   varchar("passportNumber", { length: 50 }),
  studentNumber:    varchar("studentNumber", { length: 50 }),
  dateOfBirth:      date("dateOfBirth"),
  branchId:         integer("branchId"),
  interestType:     varchar("interestType", { length: 30 }),
  isCurrentPcnHolder: boolean("isCurrentPcnHolder").default(false).notNull(),
  bindtProductCompleted: boolean("bindtProductCompleted").default(false).notNull(),
  pcnNumber:        varchar("pcnNumber", { length: 100 }),
  active:           boolean("active").default(true).notNull(),
  blacklisted:      boolean("blacklisted").default(false).notNull(),
  blacklistReason:  text("blacklistReason"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Student       = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  companyId: integer("company_id"),
  contactId: integer("contact_id"),
  companyName: varchar("company_name", { length: 255 }),
  idNumber: varchar("id_number", { length: 50 }),
  passportNumber: varchar("passport_number", { length: 50 }),
  preferredContactMethod: varchar("preferred_contact_method", { length: 30 }),
  methodInterested: varchar("method_interested", { length: 120 }),
  interestedCourseId: integer("interested_course_id"),
  interestType: varchar("interest_type", { length: 30 }),
  isCurrentPcnHolder: boolean("is_current_pcn_holder").default(false).notNull(),
  bindtProductCompleted: boolean("bindt_product_completed").default(false).notNull(),
  pcnNumber: varchar("pcn_number", { length: 100 }),
  followUpDate: timestamp("follow_up_date"),
  autoFollowUp: boolean("auto_follow_up").default(false).notNull(),
  status: varchar("status", { length: 30 }).default("New").notNull(),
  statusFlag: varchar("status_flag", { length: 20 }).default("Green").notNull(),
  source: varchar("source", { length: 120 }),
  notes: text("notes"),
  isBlacklisted: boolean("is_blacklisted").default(false).notNull(),
  blacklistReason: text("blacklist_reason"),
  duplicateWarning: boolean("duplicate_warning").default(false).notNull(),
  duplicateNotes: text("duplicate_notes"),
  branchId: integer("branch_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ---------------------------------------------------------------------------
// CRM Companies, Contacts, and Lead Activity
// ---------------------------------------------------------------------------

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
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
  branchId: integer("branchId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("companyId"),
  firstName: varchar("firstName", { length: 120 }).notNull(),
  lastName: varchar("lastName", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  position: varchar("position", { length: 120 }),
  contactType: varchar("contactType", { length: 50 }).default("Client").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

export const leadActivities = pgTable("leadActivities", {
  id: serial("id").primaryKey(),
  leadId: integer("leadId").notNull(),
  userId: integer("userId"),
  activityType: varchar("activityType", { length: 50 }).default("Note").notNull(),
  subject: varchar("subject", { length: 255 }),
  notes: text("notes"),
  dueDate: timestamp("dueDate"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courses = pgTable("courses", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  code:        varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  duration:    integer("duration"),
  level:       coursesLevelEnum("level").default("Level 1").notNull(),
  branchId:    integer("branchId"),
  active:      boolean("active").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Course       = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

// ---------------------------------------------------------------------------
// Course Schedules
// ---------------------------------------------------------------------------

export const courseSchedules = pgTable("courseSchedules", {
  id:           serial("id").primaryKey(),
  courseId:     integer("courseId").notNull(),
  startDate:    timestamp("startDate").notNull(),
  endDate:      timestamp("endDate").notNull(),
  endOfCourseExamStartDate: timestamp("endOfCourseExamStartDate"),
  endOfCourseExamEndDate: timestamp("endOfCourseExamEndDate"),
  lecturerId: integer("lecturerId"),
  maxCapacity:  integer("maxCapacity"),
  branchId:     integer("branchId"),
  courseStartPackConfig: jsonb("courseStartPackConfig").$type<{
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
  status:       courseSchedulesStatusEnum("status").default("Scheduled").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type CourseSchedule       = typeof courseSchedules.$inferSelect;
export type InsertCourseSchedule = typeof courseSchedules.$inferInsert;

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export const enrollments = pgTable("enrollments", {
  id:               serial("id").primaryKey(),
  studentId:        integer("studentId").notNull(),
  courseScheduleId: integer("courseScheduleId").notNull(),
  enrollmentDate:   timestamp("enrollmentDate").defaultNow().notNull(),
  status:           enrollmentsStatusEnum("status").default("Active").notNull(),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Enrollment       = typeof enrollments.$inferSelect;
export type InsertEnrollment = typeof enrollments.$inferInsert;

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export const attendance = pgTable("attendance", {
  id:               serial("id").primaryKey(),
  enrollmentId:     integer("enrollmentId").notNull(),
  courseScheduleId: integer("courseScheduleId").notNull(),
  attendanceDate:   date("attendanceDate").notNull(),
  status:           attendanceStatusEnum("status").default("Present").notNull(),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Attendance       = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export const assessments = pgTable("assessments", {
  id:             serial("id").primaryKey(),
  enrollmentId:   integer("enrollmentId").notNull(),
  assessorId:     integer("assessorId"),
  assessmentType: assessmentsAssessmentTypeEnum("assessmentType").default("Theory").notNull(),
  attemptNumber:  integer("attemptNumber").default(1).notNull(),
  score:          numeric("score", { precision: 6, scale: 2 }),
  maxScore:       numeric("maxScore", { precision: 6, scale: 2 }),
  result:         assessmentsResultEnum("result").default("Incomplete").notNull(),
  assessmentDate: date("assessmentDate").notNull(),
  notes:          text("notes"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Assessment       = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export const certificates = pgTable("certificates", {
  id:                serial("id").primaryKey(),
  enrollmentId:      integer("enrollmentId").notNull(),
  certificateNumber: varchar("certificateNumber", { length: 120 }).notNull().unique(),
  issuedDate:        date("issuedDate").notNull(),
  expiryDate:        date("expiryDate"),
  status:            certificatesStatusEnum("status").default("Active").notNull(),
  content:           text("content"),
  notes:             text("notes"),
  issuedBy:          integer("issuedBy"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

// ---------------------------------------------------------------------------
// Level III Services
// ---------------------------------------------------------------------------

export const levelIIIClients = pgTable("levelIIIClients", {
  id:                serial("id").primaryKey(),
  companyName:       varchar("companyName", { length: 255 }).notNull(),
  primaryContact:    varchar("primaryContact", { length: 255 }).notNull(),
  secondaryContact:  varchar("secondaryContact", { length: 255 }),
  email:             varchar("email", { length: 320 }).notNull(),
  secondaryEmail:    varchar("secondaryEmail", { length: 320 }),
  phone:             varchar("phone", { length: 50 }).notNull(),
  secondaryPhone:    varchar("secondaryPhone", { length: 50 }),
  physicalAddress:   text("physicalAddress").notNull(),
  visitCadence:      levelIIIClientsVisitCadenceEnum("visitCadence").default("Monthly").notNull(),
  lastVisit:         date("lastVisit"),
  nextVisit:         date("nextVisit"),
  procedureUpdatedAt: date("procedureUpdatedAt"),
  notes:             text("notes"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIIClient = typeof levelIIIClients.$inferSelect;
export type InsertLevelIIIClient = typeof levelIIIClients.$inferInsert;

export const levelIIIActivities = pgTable("levelIIIActivities", {
  id:             serial("id").primaryKey(),
  clientId:       integer("clientId").notNull(),
  activityType:   levelIIIActivitiesActivityTypeEnum("activityType").default("General").notNull(),
  subject:        varchar("subject", { length: 255 }).notNull(),
  activityDate:   date("activityDate").notNull(),
  nextActionDate: date("nextActionDate"),
  status:         levelIIIActivitiesStatusEnum("status").default("Planned").notNull(),
  notes:          text("notes"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIIActivity = typeof levelIIIActivities.$inferSelect;
export type InsertLevelIIIActivity = typeof levelIIIActivities.$inferInsert;

export const levelIIITechnicians = pgTable("levelIIITechnicians", {
  id:               serial("id").primaryKey(),
  clientId:         integer("clientId").notNull(),
  clientBranchId:   integer("clientBranchId"),
  name:             varchar("name", { length: 255 }).notNull(),
  email:            varchar("email", { length: 320 }).notNull(),
  phone:            varchar("phone", { length: 50 }),
  method:           varchar("method", { length: 255 }).notNull(),
  methods:          jsonb("methods").$type<string[]>(),
  level:            varchar("level", { length: 100 }).notNull(),
  methodQualifications: jsonb("methodQualifications").$type<Array<{ method: string; level: string }>>(),
  hasPcnQualification: boolean("hasPcnQualification").default(false).notNull(),
  certificateNumber: varchar("certificateNumber", { length: 120 }),
  procedureStatus:  varchar("procedureStatus", { length: 255 }),
  pcnRenewalDate:   date("pcnRenewalDate"),
  internalAssessmentDate: date("internalAssessmentDate"),
  eyeTestValidUntil: date("eyeTestValidUntil"),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIITechnician = typeof levelIIITechnicians.$inferSelect;
export type InsertLevelIIITechnician = typeof levelIIITechnicians.$inferInsert;

export const levelIIITechnicianCertificates = pgTable("levelIIITechnicianCertificates", {
  id:               serial("id").primaryKey(),
  technicianId:     integer("technicianId").notNull(),
  assessmentId:     integer("assessmentId"),
  clientId:         integer("clientId").notNull(),
  clientBranchId:   integer("clientBranchId"),
  certificateNumber: varchar("certificateNumber", { length: 120 }).notNull().unique(),
  method:           varchar("method", { length: 255 }).notNull(),
  level:            varchar("level", { length: 100 }).notNull(),
  methodLevels:     jsonb("methodLevels").$type<Array<{ method: string; level: string }>>(),
  issuedDate:       date("issuedDate").notNull(),
  validUntil:       date("validUntil"),
  validityValue:    integer("validityValue"),
  validityUnit:     levelIIITechnicianCertificatesValidityUnitEnum("validityUnit"),
  status:           levelIIITechnicianCertificatesStatusEnum("status").default("Active").notNull(),
  fileName:         varchar("fileName", { length: 255 }),
  fileUrl:          text("fileUrl"),
  fileKey:          varchar("fileKey", { length: 500 }),
  contentType:      varchar("contentType", { length: 255 }),
  sourceFileName:   varchar("sourceFileName", { length: 255 }),
  sourcePath:       text("sourcePath"),
  approvalStatus:   levelIIITechnicianCertificatesApprovalStatusEnum("approvalStatus").default("draft").notNull(),
  approvalRequestedAt: timestamp("approvalRequestedAt"),
  approvalRequestedBy: integer("approvalRequestedBy"),
  approvedAt:       timestamp("approvedAt"),
  approvedBy:       integer("approvedBy"),
  approvalNote:     text("approvalNote"),
  notes:            text("notes"),
  issuedBy:         integer("issuedBy"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIITechnicianCertificate = typeof levelIIITechnicianCertificates.$inferSelect;
export type InsertLevelIIITechnicianCertificate = typeof levelIIITechnicianCertificates.$inferInsert;

export const levelIIITechnicianCertificateExports = pgTable(
  "levelIIITechnicianCertificateExports",
  {
    id: serial("id").primaryKey(),
    certificateId: integer("certificateId").notNull(),
    technicianId: integer("technicianId").notNull(),
    clientId: integer("clientId").notNull(),
    exportFormat: levelIIITechnicianCertificateExportsExportFormatEnum("exportFormat").notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }),
    subtitle: text("subtitle"),
    artifactSummary: jsonb("artifactSummary").$type<Record<string, string | null> | null>(),
    artifactPayload: jsonb("artifactPayload").$type<Record<string, unknown> | null>(),
    exportedByUserId: integer("exportedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type LevelIIITechnicianCertificateExport =
  typeof levelIIITechnicianCertificateExports.$inferSelect;
export type InsertLevelIIITechnicianCertificateExport =
  typeof levelIIITechnicianCertificateExports.$inferInsert;

export const portalClientUsers = pgTable("portalClientUsers", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  userId:       integer("userId").notNull(),
  accessLevel:  portalClientUsersAccessLevelEnum("accessLevel").default("viewer").notNull(),
  receiveReminders: boolean("receiveReminders").default(true).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientUser = typeof portalClientUsers.$inferSelect;
export type InsertPortalClientUser = typeof portalClientUsers.$inferInsert;

export const portalClientReminderSettings = pgTable("portalClientReminderSettings", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  complianceEnabled: boolean("complianceEnabled").default(true).notNull(),
  documentEnabled: boolean("documentEnabled").default(true).notNull(),
  includeMissingRequired: boolean("includeMissingRequired").default(true).notNull(),
  includePendingReview: boolean("includePendingReview").default(true).notNull(),
  documentLeadDays: integer("documentLeadDays").default(14).notNull(),
  complianceEscalationDays: integer("complianceEscalationDays").default(14).notNull(),
  documentEscalationDays: integer("documentEscalationDays").default(7).notNull(),
  sendToAssignedUsers: boolean("sendToAssignedUsers").default(true).notNull(),
  sendToInternalAdmins: boolean("sendToInternalAdmins").default(true).notNull(),
  escalationManagersOnly: boolean("escalationManagersOnly").default(true).notNull(),
  allowedClientDocumentLabels: jsonb("allowedClientDocumentLabels"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientReminderSetting = typeof portalClientReminderSettings.$inferSelect;
export type InsertPortalClientReminderSetting = typeof portalClientReminderSettings.$inferInsert;

export const portalRequirementDefinitions = pgTable("portalRequirementDefinitions", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  name:         varchar("name", { length: 255 }).notNull(),
  category:     varchar("category", { length: 100 }).default("General").notNull(),
  description:  text("description"),
  validityDays: integer("validityDays"),
  reminderDays: integer("reminderDays").default(30).notNull(),
  isRequired:   boolean("isRequired").default(true).notNull(),
  active:       boolean("active").default(true).notNull(),
  sortOrder:    integer("sortOrder").default(0).notNull(),
  customFields: jsonb("customFields"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalRequirementDefinition = typeof portalRequirementDefinitions.$inferSelect;
export type InsertPortalRequirementDefinition = typeof portalRequirementDefinitions.$inferInsert;

export const portalTechnicianRequirements = pgTable("portalTechnicianRequirements", {
  id:           serial("id").primaryKey(),
  technicianId: integer("technicianId").notNull(),
  definitionId: integer("definitionId").notNull(),
  status:       portalTechnicianRequirementsStatusEnum("status").default("missing").notNull(),
  issuedAt:     date("issuedAt"),
  validUntil:   date("validUntil"),
  notes:        text("notes"),
  customFieldValues: jsonb("customFieldValues"),
  uploadedByUserId: integer("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalTechnicianRequirement = typeof portalTechnicianRequirements.$inferSelect;
export type InsertPortalTechnicianRequirement = typeof portalTechnicianRequirements.$inferInsert;

export const portalRequirementDocuments = pgTable("portalRequirementDocuments", {
  id:           serial("id").primaryKey(),
  technicianRequirementId: integer("technicianRequirementId").notNull(),
  fileName:     varchar("fileName", { length: 255 }).notNull(),
  fileUrl:      text("fileUrl").notNull(),
  fileKey:      varchar("fileKey", { length: 500 }).notNull(),
  contentType:  varchar("contentType", { length: 255 }),
  uploadedByUserId: integer("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type PortalRequirementDocument = typeof portalRequirementDocuments.$inferSelect;
export type InsertPortalRequirementDocument = typeof portalRequirementDocuments.$inferInsert;

export const portalRequirementSourceReferences = pgTable("portalRequirementSourceReferences", {
  id:           serial("id").primaryKey(),
  technicianRequirementId: integer("technicianRequirementId").notNull(),
  sourceFileName: varchar("sourceFileName", { length: 255 }).notNull(),
  sourcePath:   text("sourcePath").notNull(),
  importedByUserId: integer("importedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type PortalRequirementSourceReference =
  typeof portalRequirementSourceReferences.$inferSelect;
export type InsertPortalRequirementSourceReference =
  typeof portalRequirementSourceReferences.$inferInsert;

export const portalClientDocuments = pgTable("portalClientDocuments", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  clientBranchId: integer("clientBranchId"),
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
  status:       portalClientDocumentsStatusEnum("status").default("active").notNull(),
  uploadedByUserId: integer("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientDocument = typeof portalClientDocuments.$inferSelect;
export type InsertPortalClientDocument = typeof portalClientDocuments.$inferInsert;

export const portalClientComments = pgTable("portalClientComments", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  userId:       integer("userId").notNull(),
  requestType:  portalClientCommentsRequestTypeEnum("requestType").default("general_comment").notNull(),
  subject:      varchar("subject", { length: 255 }).notNull(),
  message:      text("message").notNull(),
  status:       portalClientCommentsStatusEnum("status").default("open").notNull(),
  internalNotes: text("internalNotes"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientComment = typeof portalClientComments.$inferSelect;
export type InsertPortalClientComment = typeof portalClientComments.$inferInsert;

export const portalClientResources = pgTable("portalClientResources", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  clientBranchId: integer("clientBranchId"),
  title:        varchar("title", { length: 255 }).notNull(),
  category:     varchar("category", { length: 120 }).default("General").notNull(),
  description:  text("description"),
  resourceType: portalClientResourcesResourceTypeEnum("resourceType").default("file").notNull(),
  linkUrl:      text("linkUrl"),
  fileName:     varchar("fileName", { length: 255 }),
  fileUrl:      text("fileUrl"),
  fileKey:      varchar("fileKey", { length: 500 }),
  contentType:  varchar("contentType", { length: 255 }),
  sortOrder:    integer("sortOrder").default(0).notNull(),
  active:       boolean("active").default(true).notNull(),
  uploadedByUserId: integer("uploadedByUserId"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientResource = typeof portalClientResources.$inferSelect;
export type InsertPortalClientResource = typeof portalClientResources.$inferInsert;

export const portalApprovalRequests = pgTable("portalApprovalRequests", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  entityType:   portalApprovalRequestsEntityTypeEnum("entityType").notNull(),
  action:       portalApprovalRequestsActionEnum("action").notNull(),
  entityId:     integer("entityId"),
  summary:      varchar("summary", { length: 255 }).notNull(),
  payload:      jsonb("payload"),
  status:       portalApprovalRequestsStatusEnum("status").default("pending").notNull(),
  submittedByUserId: integer("submittedByUserId").notNull(),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewNotes:  text("reviewNotes"),
  reviewedAt:   timestamp("reviewedAt"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalApprovalRequest = typeof portalApprovalRequests.$inferSelect;
export type InsertPortalApprovalRequest = typeof portalApprovalRequests.$inferInsert;

export const portalClientBranches = pgTable("portalClientBranches", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  sourceClientId: integer("sourceClientId"),
  name:         varchar("name", { length: 255 }).notNull(),
  code:         varchar("code", { length: 80 }),
  description:  text("description"),
  active:       boolean("active").default(true).notNull(),
  sortOrder:    integer("sortOrder").default(0).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientBranch = typeof portalClientBranches.$inferSelect;
export type InsertPortalClientBranch = typeof portalClientBranches.$inferInsert;

export const portalClientUserBranches = pgTable("portalClientUserBranches", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  userId:       integer("userId").notNull(),
  branchId:     integer("branchId").notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalClientUserBranch = typeof portalClientUserBranches.$inferSelect;
export type InsertPortalClientUserBranch = typeof portalClientUserBranches.$inferInsert;

export const portalServiceDefinitions = pgTable("portalServiceDefinitions", {
  id:           serial("id").primaryKey(),
  clientId:     integer("clientId").notNull(),
  title:        varchar("title", { length: 255 }).notNull(),
  category:     varchar("category", { length: 120 }).default("General").notNull(),
  description:  text("description"),
  instructions: text("instructions"),
  active:       boolean("active").default(true).notNull(),
  sortOrder:    integer("sortOrder").default(0).notNull(),
  config:       jsonb("config"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalServiceDefinition = typeof portalServiceDefinitions.$inferSelect;
export type InsertPortalServiceDefinition = typeof portalServiceDefinitions.$inferInsert;

export const portalServiceRequests = pgTable("portalServiceRequests", {
  id:             serial("id").primaryKey(),
  clientId:       integer("clientId").notNull(),
  clientBranchId: integer("clientBranchId"),
  serviceDefinitionId: integer("serviceDefinitionId"),
  userId:         integer("userId").notNull(),
  technicianId:   integer("technicianId"),
  title:          varchar("title", { length: 255 }).notNull(),
  requestType:    varchar("requestType", { length: 120 }).notNull(),
  status:         varchar("status", { length: 80 }).default("submitted").notNull(),
  preferredDate:  date("preferredDate"),
  techniques:     jsonb("techniques"),
  details:        text("details"),
  requestedDocuments: jsonb("requestedDocuments"),
  internalNotes:  text("internalNotes"),
  metadata:       jsonb("metadata"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalServiceRequest = typeof portalServiceRequests.$inferSelect;
export type InsertPortalServiceRequest = typeof portalServiceRequests.$inferInsert;

export const portalAssessmentGuides = pgTable("portalAssessmentGuides", {
  id:             serial("id").primaryKey(),
  clientId:       integer("clientId").notNull(),
  clientBranchId: integer("clientBranchId"),
  title:          varchar("title", { length: 255 }).notNull(),
  techniqueName:  varchar("techniqueName", { length: 255 }).notNull(),
  description:    text("description"),
  bringItems:     jsonb("bringItems"),
  companyItems:   jsonb("companyItems"),
  active:         boolean("active").default(true).notNull(),
  sortOrder:      integer("sortOrder").default(0).notNull(),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PortalAssessmentGuide = typeof portalAssessmentGuides.$inferSelect;
export type InsertPortalAssessmentGuide = typeof portalAssessmentGuides.$inferInsert;

export const levelIIIAssessments = pgTable("levelIIIAssessments", {
  id:             serial("id").primaryKey(),
  technicianId:   integer("technicianId").notNull(),
  assessmentDate: date("assessmentDate").notNull(),
  method:         varchar("method", { length: 255 }).notNull(),
  level:          varchar("level", { length: 100 }).notNull(),
  methodLevels:   jsonb("methodLevels").$type<Array<{ method: string; level: string }>>(),
  assessor:       varchar("assessor", { length: 255 }).notNull(),
  result:         levelIIIAssessmentsResultEnum("result").default("Pending Review").notNull(),
  nextReviewDate: date("nextReviewDate"),
  evidenceUrl:    text("evidenceUrl"),
  notes:          text("notes"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIIAssessment = typeof levelIIIAssessments.$inferSelect;
export type InsertLevelIIIAssessment = typeof levelIIIAssessments.$inferInsert;

export const levelIIIEquipment = pgTable("levelIIIEquipment", {
  id:                      serial("id").primaryKey(),
  name:                    varchar("name", { length: 255 }).notNull(),
  serialNumber:            varchar("serialNumber", { length: 100 }).notNull(),
  status:                  levelIIIEquipmentStatusEnum("status").default("Available").notNull(),
  sharedWithMainEquipment: boolean("sharedWithMainEquipment").default(false).notNull(),
  owner:                   varchar("owner", { length: 255 }).notNull(),
  calibrationType:         varchar("calibrationType", { length: 100 }),
  lastServiceDate:         date("lastServiceDate"),
  nextDueDate:             date("nextDueDate"),
  notes:                   text("notes"),
  createdAt:               timestamp("createdAt").defaultNow().notNull(),
  updatedAt:               timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIIEquipment = typeof levelIIIEquipment.$inferSelect;
export type InsertLevelIIIEquipment = typeof levelIIIEquipment.$inferInsert;

export const levelIIISpecimens = pgTable("levelIIISpecimens", {
  id:                      serial("id").primaryKey(),
  specimenNumber:          varchar("specimenNumber", { length: 100 }).notNull(),
  name:                    varchar("name", { length: 255 }).notNull(),
  specimenType:            varchar("specimenType", { length: 255 }).notNull(),
  status:                  levelIIISpecimensStatusEnum("status").default("Available").notNull(),
  sharedWithMainSpecimens: boolean("sharedWithMainSpecimens").default(false).notNull(),
  masteringStatus:         levelIIISpecimensMasteringStatusEnum("masteringStatus").default("Pending").notNull(),
  notes:                   text("notes"),
  createdAt:               timestamp("createdAt").defaultNow().notNull(),
  updatedAt:               timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type LevelIIISpecimen = typeof levelIIISpecimens.$inferSelect;
export type InsertLevelIIISpecimen = typeof levelIIISpecimens.$inferInsert;

// ---------------------------------------------------------------------------
// Equipment
// ---------------------------------------------------------------------------

export const equipment = pgTable("equipment", {
  id:                 serial("id").primaryKey(),
  name:               varchar("name", { length: 255 }).notNull(),
  serialNumber:       varchar("serialNumber", { length: 100 }),
  make:               varchar("make", { length: 255 }),
  model:              varchar("model", { length: 255 }),
  description:        text("description"),
  domain:             varchar("domain", { length: 100 }),
  calibrationType:    varchar("calibrationType", { length: 100 }),
  intervalMonths:     integer("intervalMonths"),
  lastServiceDate:    date("lastServiceDate"),
  nextDueDate:        date("nextDueDate"),
  status:             equipmentStatusEnum("status").default("Active").notNull(),
  escalationLevel:    integer("escalationLevel").default(0).notNull(),
  lastEscalationDate: timestamp("lastEscalationDate"),
  branchId:           integer("branchId"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Equipment       = typeof equipment.$inferSelect;
export type InsertEquipment = typeof equipment.$inferInsert;

// ---------------------------------------------------------------------------
// Equipment Documents
// ---------------------------------------------------------------------------

export const equipmentDocuments = pgTable("equipmentDocuments", {
  id:           serial("id").primaryKey(),
  equipmentId:  integer("equipmentId").notNull(),
  label:        varchar("label", { length: 255 }).notNull(),
  documentType: equipmentDocumentsDocumentTypeEnum("documentType").default("Other").notNull(),
  url:          text("url").notNull(),
  uploadedAt:   timestamp("uploadedAt").defaultNow().notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type EquipmentDocument       = typeof equipmentDocuments.$inferSelect;
export type InsertEquipmentDocument = typeof equipmentDocuments.$inferInsert;

export const equipmentLoans = pgTable("equipmentLoans", {
  id:                 serial("id").primaryKey(),
  equipmentId:        integer("equipmentId").notNull(),
  fromBranchId:       integer("fromBranchId").notNull(),
  toBranchId:         integer("toBranchId").notNull(),
  loanDate:           date("loanDate").notNull(),
  expectedReturnDate: date("expectedReturnDate"),
  returnedAt:         timestamp("returnedAt"),
  notes:              text("notes"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type EquipmentLoan = typeof equipmentLoans.$inferSelect;
export type InsertEquipmentLoan = typeof equipmentLoans.$inferInsert;

// ---------------------------------------------------------------------------
// Specimen Types
// ---------------------------------------------------------------------------

export const specimenTypes = pgTable("specimenTypes", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 255 }).notNull().unique(),
  material:    varchar("material", { length: 255 }),
  size:        varchar("size", { length: 255 }),
  weight:      varchar("weight", { length: 255 }),
  description: text("description"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SpecimenType       = typeof specimenTypes.$inferSelect;
export type InsertSpecimenType = typeof specimenTypes.$inferInsert;

// ---------------------------------------------------------------------------
// Specimens
// ---------------------------------------------------------------------------

export const specimens = pgTable("specimens", {
  id:              serial("id").primaryKey(),
  name:            varchar("name", { length: 255 }).notNull(),
  specimenTypeId:  integer("specimenTypeId").notNull(),
  serialNumber:    varchar("serialNumber", { length: 100 }),
  description:     text("description"),
  status:          specimensStatusEnum("status").default("Available").notNull(),
  masteringStatus: specimensMasteringStatusEnum("masteringStatus").default("Pending").notNull(),
  branchId:        integer("branchId"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Specimen       = typeof specimens.$inferSelect;
export type InsertSpecimen = typeof specimens.$inferInsert;

// ---------------------------------------------------------------------------
// Specimen Documents
// ---------------------------------------------------------------------------

export const specimenDocuments = pgTable("specimenDocuments", {
  id:          serial("id").primaryKey(),
  specimenId:  integer("specimenId").notNull(),
  label:       varchar("label", { length: 255 }).notNull(),
  url:         text("url").notNull(),
  uploadedAt:  timestamp("uploadedAt").defaultNow().notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SpecimenDocument       = typeof specimenDocuments.$inferSelect;
export type InsertSpecimenDocument = typeof specimenDocuments.$inferInsert;

export const specimenLoans = pgTable("specimenLoans", {
  id:                 serial("id").primaryKey(),
  specimenId:         integer("specimenId").notNull(),
  fromBranchId:       integer("fromBranchId").notNull(),
  toBranchId:         integer("toBranchId").notNull(),
  loanDate:           date("loanDate").notNull(),
  expectedReturnDate: date("expectedReturnDate"),
  returnedAt:         timestamp("returnedAt"),
  notes:              text("notes"),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SpecimenLoan = typeof specimenLoans.$inferSelect;
export type InsertSpecimenLoan = typeof specimenLoans.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Templates
// ---------------------------------------------------------------------------

export const kpiTemplates = pgTable("kpiTemplates", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  branchId:    integer("branchId"),
  active:      boolean("active").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type KPITemplate       = typeof kpiTemplates.$inferSelect;
export type InsertKPITemplate = typeof kpiTemplates.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Questions
// ---------------------------------------------------------------------------

export const kpiQuestions = pgTable("kpiQuestions", {
  id:            serial("id").primaryKey(),
  kpiTemplateId: integer("kpiTemplateId").notNull(),
  questionText:  text("questionText").notNull(),
  questionType:  kpiQuestionsQuestionTypeEnum("questionType").default("Text").notNull(),
  options:       jsonb("options"),
  isRequired:    boolean("isRequired").default(true).notNull(),
  displayOrder:  integer("displayOrder").default(0).notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type KPIQuestion       = typeof kpiQuestions.$inferSelect;
export type InsertKPIQuestion = typeof kpiQuestions.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Records
// ---------------------------------------------------------------------------

export const kpiRecords = pgTable("kpiRecords", {
  id:               serial("id").primaryKey(),
  kpiTemplateId:    integer("kpiTemplateId").notNull(),
  lecturerId:       integer("lecturerId"),
  courseScheduleId: integer("courseScheduleId"),
  evaluationDate:   date("evaluationDate").notNull(),
  status:           kpiRecordsStatusEnum("status").default("Draft").notNull(),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type KPIRecord       = typeof kpiRecords.$inferSelect;
export type InsertKPIRecord = typeof kpiRecords.$inferInsert;

// ---------------------------------------------------------------------------
// KPI Answers
// ---------------------------------------------------------------------------

export const kpiAnswers = pgTable("kpiAnswers", {
  id:             serial("id").primaryKey(),
  kpiRecordId:    integer("kpiRecordId").notNull(),
  kpiQuestionId:  integer("kpiQuestionId").notNull(),
  answerText:     text("answerText"),
  answerValue:    varchar("answerValue", { length: 500 }),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type KPIAnswer       = typeof kpiAnswers.$inferSelect;
export type InsertKPIAnswer = typeof kpiAnswers.$inferInsert;

// ---------------------------------------------------------------------------
// Lecturers
// ---------------------------------------------------------------------------

export const lecturers = pgTable("lecturers", {
  id:             serial("id").primaryKey(),
  firstName:      varchar("firstName", { length: 255 }).notNull(),
  lastName:       varchar("lastName", { length: 255 }).notNull(),
  email:          varchar("email", { length: 320 }),
  phone:          varchar("phone", { length: 20 }),
  specialization: varchar("specialization", { length: 255 }),
  branchId:       integer("branchId"),
  active:         boolean("active").default(true).notNull(),
  externalLinks:  jsonb("externalLinks"),
  createdAt:      timestamp("createdAt").defaultNow().notNull(),
  updatedAt:      timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Lecturer       = typeof lecturers.$inferSelect;
export type InsertLecturer = typeof lecturers.$inferInsert;

export const methods = pgTable("methods", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 255 }).notNull().unique(),
  color:       varchar("color", { length: 20 }),
  description: text("description"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Method = typeof methods.$inferSelect;
export type InsertMethod = typeof methods.$inferInsert;

// ---------------------------------------------------------------------------
// Training Offerings
// ---------------------------------------------------------------------------

export const trainingOfferings = pgTable("trainingOfferings", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  courseId:    integer("courseId"),
  startDate:   date("startDate"),
  endDate:     date("endDate"),
  status:      trainingOfferingsStatusEnum("status").default("Planned").notNull(),
  branchId:    integer("branchId"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type TrainingOffering       = typeof trainingOfferings.$inferSelect;
export type InsertTrainingOffering = typeof trainingOfferings.$inferInsert;

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documents = pgTable("documents", {
  id:           serial("id").primaryKey(),
  title:        varchar("title", { length: 255 }).notNull(),
  description:  text("description"),
  documentType: varchar("documentType", { length: 100 }),
  content:      text("content"),
  url:          text("url").notNull(),
  uploadedBy:   integer("uploadedBy"),
  branchId:     integer("branchId"),
  tags:         jsonb("tags"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Document       = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

export const plannerEntries = pgTable("plannerEntries", {
  id:         serial("id").primaryKey(),
  userId:     integer("userId").notNull(),
  title:      varchar("title", { length: 255 }).notNull(),
  entryDate:  date("entryDate").notNull(),
  notes:      text("notes"),
  reminderAt: timestamp("reminderAt"),
  isComplete: boolean("isComplete").default(false).notNull(),
  recurrence: varchar("recurrence", { length: 30 }),
  recurrenceUntil: date("recurrenceUntil"),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
  updatedAt:  timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PlannerEntry = typeof plannerEntries.$inferSelect;
export type InsertPlannerEntry = typeof plannerEntries.$inferInsert;

export const sharedPlannerEvents = pgTable("sharedPlannerEvents", {
  id:               serial("id").primaryKey(),
  title:            varchar("title", { length: 255 }).notNull(),
  eventType:        sharedPlannerEventsEventTypeEnum("eventType").default("General").notNull(),
  branchId:         integer("branchId"),
  createdByUserId:  integer("createdByUserId").notNull(),
  startAt:          timestamp("startAt").notNull(),
  endAt:            timestamp("endAt"),
  isAllDay:         boolean("isAllDay").default(false).notNull(),
  location:         varchar("location", { length: 255 }),
  notes:            text("notes"),
  recurrence:       varchar("recurrence", { length: 30 }),
  recurrenceUntil:  date("recurrenceUntil"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SharedPlannerEvent = typeof sharedPlannerEvents.$inferSelect;
export type InsertSharedPlannerEvent = typeof sharedPlannerEvents.$inferInsert;

export const plannerTimesheetProfiles = pgTable("plannerTimesheetProfiles", {
  id:            serial("id").primaryKey(),
  userId:        integer("userId").notNull().unique(),
  department:    varchar("department", { length: 255 }),
  signatureName: varchar("signatureName", { length: 255 }),
  personalLeaveAllowanceDays: integer("personalLeaveAllowanceDays"),
  personalLeaveCarryOverDays: integer("personalLeaveCarryOverDays").default(0).notNull(),
  leaveYearStartMonth: integer("leaveYearStartMonth").default(1).notNull(),
  monThuStartTime: varchar("monThuStartTime", { length: 10 }),
  monThuEndTime: varchar("monThuEndTime", { length: 10 }),
  fridayStartTime: varchar("fridayStartTime", { length: 10 }),
  fridayEndTime: varchar("fridayEndTime", { length: 10 }),
  weekendStartTime: varchar("weekendStartTime", { length: 10 }),
  weekendEndTime: varchar("weekendEndTime", { length: 10 }),
  monThuTemplateId: integer("monThuTemplateId"),
  fridayTemplateId: integer("fridayTemplateId"),
  weekendTemplateId: integer("weekendTemplateId"),
  lunchBreakMinutes: integer("lunchBreakMinutes").default(60).notNull(),
  teaBreakMinutes: integer("teaBreakMinutes").default(30).notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PlannerTimesheetProfile = typeof plannerTimesheetProfiles.$inferSelect;
export type InsertPlannerTimesheetProfile = typeof plannerTimesheetProfiles.$inferInsert;

export const plannerTimesheetDepartmentCoverageSettings = pgTable(
  "plannerTimesheetDepartmentCoverageSettings",
  {
    id: serial("id").primaryKey(),
    department: varchar("department", { length: 255 }).notNull().unique(),
    minimumAvailableCount: integer("minimumAvailableCount"),
    maximumPeopleOff: integer("maximumPeopleOff"),
    mediumRiskPercent: integer("mediumRiskPercent").default(25).notNull(),
    highRiskPercent: integer("highRiskPercent").default(50).notNull(),
    notes: text("notes"),
    createdByUserId: integer("createdByUserId"),
    updatedByUserId: integer("updatedByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  }
);

export type PlannerTimesheetDepartmentCoverageSetting =
  typeof plannerTimesheetDepartmentCoverageSettings.$inferSelect;
export type InsertPlannerTimesheetDepartmentCoverageSetting =
  typeof plannerTimesheetDepartmentCoverageSettings.$inferInsert;

export const plannerTimesheetOptions = pgTable("plannerTimesheetOptions", {
  id:          serial("id").primaryKey(),
  userId:      integer("userId").notNull(),
  label:       varchar("label", { length: 255 }).notNull(),
  description: text("description"),
  sortOrder:   integer("sortOrder").default(0).notNull(),
  hoursCategory: varchar("hoursCategory", { length: 30 }).default("working").notNull(),
  isActive:    boolean("isActive").default(true).notNull(),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PlannerTimesheetOption = typeof plannerTimesheetOptions.$inferSelect;
export type InsertPlannerTimesheetOption = typeof plannerTimesheetOptions.$inferInsert;

export const plannerTimesheetEntries = pgTable("plannerTimesheetEntries", {
    id:                serial("id").primaryKey(),
    userId:            integer("userId").notNull(),
    entryDate:         date("entryDate").notNull(),
    startTime:         varchar("startTime", { length: 10 }),
    endTime:           varchar("endTime", { length: 10 }),
    lunchBreakMinutes: integer("lunchBreakMinutes"),
    teaBreakMinutes:   integer("teaBreakMinutes"),
    leavePortionPercent: integer("leavePortionPercent"),
    selectedOptionIds: jsonb("selectedOptionIds").$type<number[]>().notNull(),
    remarks:           text("remarks"),
    createdAt:         timestamp("createdAt").defaultNow().notNull(),
    updatedAt:         timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  });

export type PlannerTimesheetEntry = typeof plannerTimesheetEntries.$inferSelect;
export type InsertPlannerTimesheetEntry = typeof plannerTimesheetEntries.$inferInsert;

export const plannerTimesheetTemplates = pgTable("plannerTimesheetTemplates", {
  id:                serial("id").primaryKey(),
  userId:            integer("userId").notNull(),
  label:             varchar("label", { length: 255 }).notNull(),
  description:       text("description"),
  startTime:         varchar("startTime", { length: 10 }),
  endTime:           varchar("endTime", { length: 10 }),
  lunchBreakMinutes: integer("lunchBreakMinutes"),
  teaBreakMinutes:   integer("teaBreakMinutes"),
  leavePortionPercent: integer("leavePortionPercent"),
  selectedOptionIds: jsonb("selectedOptionIds").$type<number[]>().notNull(),
  remarks:           text("remarks"),
  isActive:          boolean("isActive").default(true).notNull(),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PlannerTimesheetTemplate = typeof plannerTimesheetTemplates.$inferSelect;
export type InsertPlannerTimesheetTemplate = typeof plannerTimesheetTemplates.$inferInsert;

export const plannerTimesheetHolidays = pgTable("plannerTimesheetHolidays", {
  id:         serial("id").primaryKey(),
  userId:     integer("userId").notNull(),
  holidayDate: date("holidayDate").notNull(),
  label:      varchar("label", { length: 255 }).notNull(),
  holidayType: varchar("holidayType", { length: 40 }).notNull().default("public_holiday"),
  notes:      text("notes"),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
  updatedAt:  timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PlannerTimesheetHoliday = typeof plannerTimesheetHolidays.$inferSelect;
export type InsertPlannerTimesheetHoliday = typeof plannerTimesheetHolidays.$inferInsert;

export const plannerTimesheetMonthStatuses = pgTable("plannerTimesheetMonthStatuses", {
  id:           serial("id").primaryKey(),
  userId:       integer("userId").notNull(),
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
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedByName:   varchar("reviewedByName", { length: 255 }),
  reviewerDeclarationAccepted: boolean("reviewerDeclarationAccepted").notNull().default(false),
  reviewerDeclarationAcceptedAt: timestamp("reviewerDeclarationAcceptedAt"),
  reviewNote:       text("reviewNote"),
  handedOffAt:      timestamp("handedOffAt"),
  handedOffByUserId: integer("handedOffByUserId"),
  handedOffByName:   varchar("handedOffByName", { length: 255 }),
  handoffNote:       text("handoffNote"),
  historyJson:      jsonb("historyJson").$type<
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
  updatedAt:    timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type PlannerTimesheetMonthStatus = typeof plannerTimesheetMonthStatuses.$inferSelect;
export type InsertPlannerTimesheetMonthStatus = typeof plannerTimesheetMonthStatuses.$inferInsert;

export const plannerTimesheetLeaveOverrideReviews = pgTable(
  "plannerTimesheetLeaveOverrideReviews",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    entryDate: date("entryDate").notNull(),
    reviewedAt: timestamp("reviewedAt"),
    reviewedByUserId: integer("reviewedByUserId"),
    reviewedByName: varchar("reviewedByName", { length: 255 }),
    reviewNote: text("reviewNote"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
  }
);

export type PlannerTimesheetLeaveOverrideReview =
  typeof plannerTimesheetLeaveOverrideReviews.$inferSelect;
export type InsertPlannerTimesheetLeaveOverrideReview =
  typeof plannerTimesheetLeaveOverrideReviews.$inferInsert;

// ---------------------------------------------------------------------------
// Import Logs
// ---------------------------------------------------------------------------

export const importLogs = pgTable("importLogs", {
  id:                serial("id").primaryKey(),
  entityType:        varchar("entityType", { length: 100 }).notNull(),
  fileName:          varchar("fileName", { length: 255 }).notNull(),
  totalRecords:      integer("totalRecords").notNull(),
  successfulRecords: integer("successfulRecords").notNull(),
  failedRecords:     integer("failedRecords").notNull(),
  columnMapping:     jsonb("columnMapping").notNull(),
  status:            importLogsStatusEnum("status").default("Pending").notNull(),
  errorLog:          text("errorLog"),
  uploadedBy:        integer("uploadedBy"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
});

export type ImportLog       = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export const auditLogs = pgTable("auditLogs", {
  id:           serial("id").primaryKey(),
  userId:       integer("userId").notNull(),
  action:       varchar("action", { length: 100 }).notNull(),
  entityType:   varchar("entityType", { length: 100 }).notNull(),
  entityId:     integer("entityId").notNull(),
  changes:      jsonb("changes"),
  ipAddress:    varchar("ipAddress", { length: 45 }),
  userAgent:    text("userAgent"),
  status:       auditLogsStatusEnum("status").default("Success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog       = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const reports = pgTable("reports", {
  id:          serial("id").primaryKey(),
  title:       varchar("title", { length: 255 }).notNull(),
  reportType:  varchar("reportType", { length: 100 }).notNull(),
  generatedBy: integer("generatedBy"),
  branchId:    integer("branchId"),
  filters:     jsonb("filters"),
  data:        jsonb("data"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type Report       = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ---------------------------------------------------------------------------
// Quality Actions
// ---------------------------------------------------------------------------

export const qualityActions = pgTable("qualityActions", {
  id:                 serial("id").primaryKey(),
  referenceNumber:    varchar("referenceNumber", { length: 60 }).notNull().unique(),
  title:              varchar("title", { length: 255 }).notNull(),
  category:           qualityActionsCategoryEnum("category").default("Nonconformance").notNull(),
  source:             qualityActionsSourceEnum("source").default("Other").notNull(),
  severity:           qualityActionsSeverityEnum("severity").default("Minor").notNull(),
  status:             qualityActionsStatusEnum("status").default("Open").notNull(),
  branchId:           integer("branchId"),
  ownerName:          varchar("ownerName", { length: 255 }),
  reportedByUserId:   integer("reportedByUserId"),
  reportedDate:       date("reportedDate").notNull(),
  dueDate:            date("dueDate"),
  closedAt:           timestamp("closedAt"),
  description:        text("description").notNull(),
  immediateCorrection:text("immediateCorrection"),
  rootCause:          text("rootCause"),
  correctiveAction:   text("correctiveAction"),
  verificationNotes:  text("verificationNotes"),
  verifiedByName:     varchar("verifiedByName", { length: 255 }),
  createdAt:          timestamp("createdAt").defaultNow().notNull(),
  updatedAt:          timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type QualityAction = typeof qualityActions.$inferSelect;
export type InsertQualityAction = typeof qualityActions.$inferInsert;

export const qualityAudits = pgTable("qualityAudits", {
  id:               serial("id").primaryKey(),
  referenceNumber:  varchar("referenceNumber", { length: 60 }).notNull().unique(),
  title:            varchar("title", { length: 255 }).notNull(),
  auditType:        qualityAuditsAuditTypeEnum("auditType").default("Internal Audit").notNull(),
  status:           qualityAuditsStatusEnum("status").default("Planned").notNull(),
  branchId:         integer("branchId"),
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
  updatedAt:        timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type QualityAudit = typeof qualityAudits.$inferSelect;
export type InsertQualityAudit = typeof qualityAudits.$inferInsert;

export const managementReviews = pgTable("managementReviews", {
  id:                serial("id").primaryKey(),
  referenceNumber:   varchar("referenceNumber", { length: 60 }).notNull().unique(),
  title:             varchar("title", { length: 255 }).notNull(),
  status:            managementReviewsStatusEnum("status").default("Planned").notNull(),
  branchId:          integer("branchId"),
  meetingDate:       date("meetingDate").notNull(),
  nextReviewDate:    date("nextReviewDate"),
  chairperson:       varchar("chairperson", { length: 255 }),
  attendees:         text("attendees"),
  agenda:            text("agenda"),
  inputsSummary:     text("inputsSummary"),
  decisionsSummary:  text("decisionsSummary"),
  actionSummary:     text("actionSummary"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
  updatedAt:         timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type ManagementReview = typeof managementReviews.$inferSelect;
export type InsertManagementReview = typeof managementReviews.$inferInsert;

export const externalProviders = pgTable("externalProviders", {
  id:                  serial("id").primaryKey(),
  referenceNumber:     varchar("referenceNumber", { length: 60 }).notNull().unique(),
  companyName:         varchar("companyName", { length: 255 }).notNull(),
  providerType:        externalProvidersProviderTypeEnum("providerType").default("Other").notNull(),
  status:              externalProvidersStatusEnum("status").default("Approved").notNull(),
  rating:              externalProvidersRatingEnum("rating").default("Acceptable").notNull(),
  branchId:            integer("branchId"),
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
  updatedAt:           timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type ExternalProvider = typeof externalProviders.$inferSelect;
export type InsertExternalProvider = typeof externalProviders.$inferInsert;

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  id:            serial("id").primaryKey(),
  userId:        integer("userId").notNull(),
  type:          notificationsTypeEnum("type").notNull(),
  title:         varchar("title", { length: 255 }).notNull(),
  message:       text("message").notNull(),
  entityType:    varchar("entityType", { length: 100 }),
  entityId:      integer("entityId"),
  relatedUserId: integer("relatedUserId"),
  isRead:        boolean("isRead").default(false).notNull(),
  actionUrl:     text("actionUrl"),
  metadata:      jsonb("metadata"),
  priority:      notificationsPriorityEnum("priority").default("normal").notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  readAt:        timestamp("readAt"),
});

export type Notification       = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ---------------------------------------------------------------------------
// Notification Preferences
// ---------------------------------------------------------------------------

export const notificationPreferences = pgTable("notificationPreferences", {
  id:                   serial("id").primaryKey(),
  userId:               integer("userId").notNull().unique(),
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
  updatedAt:            timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type NotificationPreference       = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;

// ---------------------------------------------------------------------------
// Notification Subscriptions
// ---------------------------------------------------------------------------

export const notificationSubscriptions = pgTable("notificationSubscriptions", {
  id:         serial("id").primaryKey(),
  userId:     integer("userId").notNull(),
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
