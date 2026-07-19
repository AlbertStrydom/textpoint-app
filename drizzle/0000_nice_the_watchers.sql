CREATE TYPE "public"."assessments_assessment_type_enum" AS ENUM('Theory', 'Practical');--> statement-breakpoint
CREATE TYPE "public"."assessments_result_enum" AS ENUM('Pass', 'Fail', 'Incomplete');--> statement-breakpoint
CREATE TYPE "public"."attendance_status_enum" AS ENUM('Present', 'Absent', 'Late', 'Excused');--> statement-breakpoint
CREATE TYPE "public"."audit_logs_status_enum" AS ENUM('Success', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."certificates_status_enum" AS ENUM('Active', 'Expired', 'Revoked');--> statement-breakpoint
CREATE TYPE "public"."course_schedules_status_enum" AS ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."courses_level_enum" AS ENUM('Level 1', 'Level 2', 'Level 3');--> statement-breakpoint
CREATE TYPE "public"."enrollments_status_enum" AS ENUM('Active', 'Completed', 'Withdrawn', 'Suspended');--> statement-breakpoint
CREATE TYPE "public"."equipment_documents_document_type_enum" AS ENUM('Manual', 'Certificate', 'Specification', 'Maintenance Log', 'Other');--> statement-breakpoint
CREATE TYPE "public"."equipment_status_enum" AS ENUM('Active', 'Inactive', 'Maintenance', 'Retired');--> statement-breakpoint
CREATE TYPE "public"."external_providers_provider_type_enum" AS ENUM('Lecturer', 'Assessor', 'Calibration', 'Consumables', 'Venue', 'Equipment', 'Level III Consultant', 'Document / Printing', 'Other');--> statement-breakpoint
CREATE TYPE "public"."external_providers_rating_enum" AS ENUM('Preferred', 'Acceptable', 'Probationary');--> statement-breakpoint
CREATE TYPE "public"."external_providers_status_enum" AS ENUM('Approved', 'Conditional', 'Under Review', 'Suspended', 'Inactive');--> statement-breakpoint
CREATE TYPE "public"."import_logs_status_enum" AS ENUM('Pending', 'Processing', 'Completed', 'Failed');--> statement-breakpoint
CREATE TYPE "public"."kpi_questions_question_type_enum" AS ENUM('Text', 'MultipleChoice', 'Rating', 'YesNo');--> statement-breakpoint
CREATE TYPE "public"."kpi_records_status_enum" AS ENUM('Draft', 'Submitted', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TYPE "public"."level_iiiactivities_activity_type_enum" AS ENUM('Visit', 'Call', 'Email', 'Assessment', 'Procedure Review', 'General');--> statement-breakpoint
CREATE TYPE "public"."level_iiiactivities_status_enum" AS ENUM('Planned', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."level_iiiassessments_result_enum" AS ENUM('Pass', 'Fail', 'Observation', 'Pending Review');--> statement-breakpoint
CREATE TYPE "public"."level_iiiclients_visit_cadence_enum" AS ENUM('Weekly', 'Monthly', 'Six Monthly');--> statement-breakpoint
CREATE TYPE "public"."level_iiiequipment_status_enum" AS ENUM('Available', 'In Service', 'Calibration Due', 'Out of Service');--> statement-breakpoint
CREATE TYPE "public"."level_iiispecimens_mastering_status_enum" AS ENUM('Mastered', 'Re-master Required', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."level_iiispecimens_status_enum" AS ENUM('Available', 'In Use', 'Shared', 'Retired');--> statement-breakpoint
CREATE TYPE "public"."level_iiitechnician_certificate_exports_export_format_enum" AS ENUM('html', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."level_iiitechnician_certificates_approval_status_enum" AS ENUM('draft', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."level_iiitechnician_certificates_status_enum" AS ENUM('Active', 'Expired', 'Revoked', 'Superseded');--> statement-breakpoint
CREATE TYPE "public"."level_iiitechnician_certificates_validity_unit_enum" AS ENUM('days', 'months', 'years', 'custom');--> statement-breakpoint
CREATE TYPE "public"."management_reviews_status_enum" AS ENUM('Planned', 'Held', 'Closed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."notifications_priority_enum" AS ENUM('low', 'normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."notifications_type_enum" AS ENUM('student_added', 'lead_status_changed', 'attendance_marked', 'equipment_maintenance', 'specimen_mastered', 'kpi_completed', 'course_started', 'enrollment_confirmed', 'system_alert');--> statement-breakpoint
CREATE TYPE "public"."portal_approval_requests_action_enum" AS ENUM('create', 'update', 'delete', 'upsert');--> statement-breakpoint
CREATE TYPE "public"."portal_approval_requests_entity_type_enum" AS ENUM('technician', 'requirement_record', 'client_document', 'resource');--> statement-breakpoint
CREATE TYPE "public"."portal_approval_requests_status_enum" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."portal_client_comments_request_type_enum" AS ENUM('general_comment', 'contact_request', 'suggestion');--> statement-breakpoint
CREATE TYPE "public"."portal_client_comments_status_enum" AS ENUM('open', 'acknowledged', 'closed');--> statement-breakpoint
CREATE TYPE "public"."portal_client_documents_status_enum" AS ENUM('active', 'archived', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."portal_client_resources_resource_type_enum" AS ENUM('file', 'link');--> statement-breakpoint
CREATE TYPE "public"."portal_client_users_access_level_enum" AS ENUM('viewer', 'editor', 'manager');--> statement-breakpoint
CREATE TYPE "public"."portal_technician_requirements_status_enum" AS ENUM('missing', 'current', 'no_expiry', 'expiring', 'expired', 'pending_review');--> statement-breakpoint
CREATE TYPE "public"."quality_actions_category_enum" AS ENUM('Nonconformance', 'Corrective Action', 'Observation', 'Improvement');--> statement-breakpoint
CREATE TYPE "public"."quality_actions_severity_enum" AS ENUM('Minor', 'Major', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."quality_actions_source_enum" AS ENUM('Customer Complaint', 'Internal Audit', 'Supplier', 'Training', 'Examination', 'Level III', 'Equipment', 'Document Control', 'Management Review', 'Other');--> statement-breakpoint
CREATE TYPE "public"."quality_actions_status_enum" AS ENUM('Open', 'In Progress', 'Awaiting Verification', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."quality_audits_audit_type_enum" AS ENUM('Internal Audit', 'Process Audit', 'Training Audit', 'Equipment Audit', 'Document Audit', 'Branch Audit');--> statement-breakpoint
CREATE TYPE "public"."quality_audits_status_enum" AS ENUM('Planned', 'In Progress', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."shared_planner_events_event_type_enum" AS ENUM('Meeting', 'Training', 'Deadline', 'Reminder', 'Visit', 'General');--> statement-breakpoint
CREATE TYPE "public"."specimens_mastering_status_enum" AS ENUM('Mastered', 'Re-master Required', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."specimens_status_enum" AS ENUM('Available', 'In Use', 'Loaned Out', 'Quarantine', 'Retired');--> statement-breakpoint
CREATE TYPE "public"."training_offerings_status_enum" AS ENUM('Planned', 'Active', 'Completed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin', 'super_admin');--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollmentId" integer NOT NULL,
	"assessorId" integer,
	"assessmentType" "assessments_assessment_type_enum" DEFAULT 'Theory' NOT NULL,
	"attemptNumber" integer DEFAULT 1 NOT NULL,
	"score" numeric(6, 2),
	"maxScore" numeric(6, 2),
	"result" "assessments_result_enum" DEFAULT 'Incomplete' NOT NULL,
	"assessmentDate" date NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollmentId" integer NOT NULL,
	"courseScheduleId" integer NOT NULL,
	"attendanceDate" date NOT NULL,
	"status" "attendance_status_enum" DEFAULT 'Present' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"entityId" integer NOT NULL,
	"changes" jsonb,
	"ipAddress" varchar(45),
	"userAgent" text,
	"status" "audit_logs_status_enum" DEFAULT 'Success' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(36) NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"providerId" varchar(255) NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"accessTokenExpiresAt" timestamp,
	"password" text,
	"passwordHistory" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" varchar(36) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"description" text,
	"companyName" varchar(255),
	"companyDescription" text,
	"logoUrl" text,
	"primaryColor" varchar(7),
	"secondaryColor" varchar(7),
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "branches_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollmentId" integer NOT NULL,
	"certificateNumber" varchar(120) NOT NULL,
	"issuedDate" date NOT NULL,
	"expiryDate" date,
	"status" "certificates_status_enum" DEFAULT 'Active' NOT NULL,
	"content" text,
	"notes" text,
	"issuedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_certificateNumber_unique" UNIQUE("certificateNumber")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"registrationNumber" varchar(100),
	"phone" varchar(50),
	"email" varchar(320),
	"website" varchar(255),
	"physicalAddress" text,
	"primaryContactName" varchar(255),
	"primaryContactEmail" varchar(320),
	"primaryContactPhone" varchar(50),
	"status" varchar(30) DEFAULT 'Active' NOT NULL,
	"branchId" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyId" integer,
	"firstName" varchar(120) NOT NULL,
	"lastName" varchar(120) NOT NULL,
	"email" varchar(320),
	"phone" varchar(50),
	"position" varchar(120),
	"contactType" varchar(50) DEFAULT 'Client' NOT NULL,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courseSchedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" integer NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"endOfCourseExamStartDate" timestamp,
	"endOfCourseExamEndDate" timestamp,
	"lecturerId" integer,
	"maxCapacity" integer,
	"branchId" integer,
	"courseStartPackConfig" jsonb,
	"status" "course_schedules_status_enum" DEFAULT 'Scheduled' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"duration" integer,
	"level" "courses_level_enum" DEFAULT 'Level 1' NOT NULL,
	"branchId" integer,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"documentType" varchar(100),
	"content" text,
	"url" text NOT NULL,
	"uploadedBy" integer,
	"branchId" integer,
	"tags" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentId" integer NOT NULL,
	"courseScheduleId" integer NOT NULL,
	"enrollmentDate" timestamp DEFAULT now() NOT NULL,
	"status" "enrollments_status_enum" DEFAULT 'Active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"serialNumber" varchar(100),
	"make" varchar(255),
	"model" varchar(255),
	"description" text,
	"domain" varchar(100),
	"calibrationType" varchar(100),
	"intervalMonths" integer,
	"lastServiceDate" date,
	"nextDueDate" date,
	"status" "equipment_status_enum" DEFAULT 'Active' NOT NULL,
	"escalationLevel" integer DEFAULT 0 NOT NULL,
	"lastEscalationDate" timestamp,
	"branchId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipmentDocuments" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipmentId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"documentType" "equipment_documents_document_type_enum" DEFAULT 'Other' NOT NULL,
	"url" text NOT NULL,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipmentLoans" (
	"id" serial PRIMARY KEY NOT NULL,
	"equipmentId" integer NOT NULL,
	"fromBranchId" integer NOT NULL,
	"toBranchId" integer NOT NULL,
	"loanDate" date NOT NULL,
	"expectedReturnDate" date,
	"returnedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "externalProviders" (
	"id" serial PRIMARY KEY NOT NULL,
	"referenceNumber" varchar(60) NOT NULL,
	"companyName" varchar(255) NOT NULL,
	"providerType" "external_providers_provider_type_enum" DEFAULT 'Other' NOT NULL,
	"status" "external_providers_status_enum" DEFAULT 'Approved' NOT NULL,
	"rating" "external_providers_rating_enum" DEFAULT 'Acceptable' NOT NULL,
	"branchId" integer,
	"primaryContact" varchar(255),
	"email" varchar(320),
	"phone" varchar(50),
	"serviceScope" text NOT NULL,
	"approvalDate" date,
	"lastEvaluationDate" date,
	"nextEvaluationDate" date,
	"notes" text,
	"correctiveActionNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "externalProviders_referenceNumber_unique" UNIQUE("referenceNumber")
);
--> statement-breakpoint
CREATE TABLE "importLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"entityType" varchar(100) NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"totalRecords" integer NOT NULL,
	"successfulRecords" integer NOT NULL,
	"failedRecords" integer NOT NULL,
	"columnMapping" jsonb NOT NULL,
	"status" "import_logs_status_enum" DEFAULT 'Pending' NOT NULL,
	"errorLog" text,
	"uploadedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpiAnswers" (
	"id" serial PRIMARY KEY NOT NULL,
	"kpiRecordId" integer NOT NULL,
	"kpiQuestionId" integer NOT NULL,
	"answerText" text,
	"answerValue" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpiQuestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kpiTemplateId" integer NOT NULL,
	"questionText" text NOT NULL,
	"questionType" "kpi_questions_question_type_enum" DEFAULT 'Text' NOT NULL,
	"options" jsonb,
	"isRequired" boolean DEFAULT true NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpiRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"kpiTemplateId" integer NOT NULL,
	"lecturerId" integer,
	"courseScheduleId" integer,
	"evaluationDate" date NOT NULL,
	"status" "kpi_records_status_enum" DEFAULT 'Draft' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kpiTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"branchId" integer,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leadActivities" (
	"id" serial PRIMARY KEY NOT NULL,
	"leadId" integer NOT NULL,
	"userId" integer,
	"activityType" varchar(50) DEFAULT 'Note' NOT NULL,
	"subject" varchar(255),
	"notes" text,
	"dueDate" timestamp,
	"completed" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(120) NOT NULL,
	"last_name" varchar(120) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"company_id" integer,
	"contact_id" integer,
	"company_name" varchar(255),
	"id_number" varchar(50),
	"passport_number" varchar(50),
	"preferred_contact_method" varchar(30),
	"method_interested" varchar(120),
	"interested_course_id" integer,
	"interest_type" varchar(30),
	"is_current_pcn_holder" boolean DEFAULT false NOT NULL,
	"bindt_product_completed" boolean DEFAULT false NOT NULL,
	"pcn_number" varchar(100),
	"follow_up_date" timestamp,
	"auto_follow_up" boolean DEFAULT false NOT NULL,
	"status" varchar(30) DEFAULT 'New' NOT NULL,
	"status_flag" varchar(20) DEFAULT 'Green' NOT NULL,
	"source" varchar(120),
	"notes" text,
	"is_blacklisted" boolean DEFAULT false NOT NULL,
	"blacklist_reason" text,
	"duplicate_warning" boolean DEFAULT false NOT NULL,
	"duplicate_notes" text,
	"branch_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lecturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"specialization" varchar(255),
	"branchId" integer,
	"active" boolean DEFAULT true NOT NULL,
	"externalLinks" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIIActivities" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"activityType" "level_iiiactivities_activity_type_enum" DEFAULT 'General' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"activityDate" date NOT NULL,
	"nextActionDate" date,
	"status" "level_iiiactivities_status_enum" DEFAULT 'Planned' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIIAssessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"technicianId" integer NOT NULL,
	"assessmentDate" date NOT NULL,
	"method" varchar(255) NOT NULL,
	"level" varchar(100) NOT NULL,
	"methodLevels" jsonb,
	"assessor" varchar(255) NOT NULL,
	"result" "level_iiiassessments_result_enum" DEFAULT 'Pending Review' NOT NULL,
	"nextReviewDate" date,
	"evidenceUrl" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIIClients" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyName" varchar(255) NOT NULL,
	"primaryContact" varchar(255) NOT NULL,
	"secondaryContact" varchar(255),
	"email" varchar(320) NOT NULL,
	"secondaryEmail" varchar(320),
	"phone" varchar(50) NOT NULL,
	"secondaryPhone" varchar(50),
	"physicalAddress" text NOT NULL,
	"visitCadence" "level_iiiclients_visit_cadence_enum" DEFAULT 'Monthly' NOT NULL,
	"lastVisit" date,
	"nextVisit" date,
	"procedureUpdatedAt" date,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIIEquipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"serialNumber" varchar(100) NOT NULL,
	"status" "level_iiiequipment_status_enum" DEFAULT 'Available' NOT NULL,
	"sharedWithMainEquipment" boolean DEFAULT false NOT NULL,
	"owner" varchar(255) NOT NULL,
	"calibrationType" varchar(100),
	"lastServiceDate" date,
	"nextDueDate" date,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIISpecimens" (
	"id" serial PRIMARY KEY NOT NULL,
	"specimenNumber" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"specimenType" varchar(255) NOT NULL,
	"status" "level_iiispecimens_status_enum" DEFAULT 'Available' NOT NULL,
	"sharedWithMainSpecimens" boolean DEFAULT false NOT NULL,
	"masteringStatus" "level_iiispecimens_mastering_status_enum" DEFAULT 'Pending' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIITechnicianCertificateExports" (
	"id" serial PRIMARY KEY NOT NULL,
	"certificateId" integer NOT NULL,
	"technicianId" integer NOT NULL,
	"clientId" integer NOT NULL,
	"exportFormat" "level_iiitechnician_certificate_exports_export_format_enum" NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"title" varchar(255),
	"subtitle" text,
	"artifactSummary" jsonb,
	"artifactPayload" jsonb,
	"exportedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levelIIITechnicianCertificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"technicianId" integer NOT NULL,
	"assessmentId" integer,
	"clientId" integer NOT NULL,
	"clientBranchId" integer,
	"certificateNumber" varchar(120) NOT NULL,
	"method" varchar(255) NOT NULL,
	"level" varchar(100) NOT NULL,
	"methodLevels" jsonb,
	"issuedDate" date NOT NULL,
	"validUntil" date,
	"validityValue" integer,
	"validityUnit" "level_iiitechnician_certificates_validity_unit_enum",
	"status" "level_iiitechnician_certificates_status_enum" DEFAULT 'Active' NOT NULL,
	"fileName" varchar(255),
	"fileUrl" text,
	"fileKey" varchar(500),
	"contentType" varchar(255),
	"sourceFileName" varchar(255),
	"sourcePath" text,
	"approvalStatus" "level_iiitechnician_certificates_approval_status_enum" DEFAULT 'draft' NOT NULL,
	"approvalRequestedAt" timestamp,
	"approvalRequestedBy" integer,
	"approvedAt" timestamp,
	"approvedBy" integer,
	"approvalNote" text,
	"notes" text,
	"issuedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "levelIIITechnicianCertificates_certificateNumber_unique" UNIQUE("certificateNumber")
);
--> statement-breakpoint
CREATE TABLE "levelIIITechnicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"clientBranchId" integer,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(50),
	"method" varchar(255) NOT NULL,
	"methods" jsonb,
	"level" varchar(100) NOT NULL,
	"methodQualifications" jsonb,
	"hasPcnQualification" boolean DEFAULT false NOT NULL,
	"certificateNumber" varchar(120),
	"procedureStatus" varchar(255),
	"pcnRenewalDate" date,
	"internalAssessmentDate" date,
	"eyeTestValidUntil" date,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "managementReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"referenceNumber" varchar(60) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" "management_reviews_status_enum" DEFAULT 'Planned' NOT NULL,
	"branchId" integer,
	"meetingDate" date NOT NULL,
	"nextReviewDate" date,
	"chairperson" varchar(255),
	"attendees" text,
	"agenda" text,
	"inputsSummary" text,
	"decisionsSummary" text,
	"actionSummary" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "managementReviews_referenceNumber_unique" UNIQUE("referenceNumber")
);
--> statement-breakpoint
CREATE TABLE "methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(20),
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "module_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"module" varchar(100) NOT NULL,
	"canView" boolean DEFAULT false NOT NULL,
	"canCreate" boolean DEFAULT false NOT NULL,
	"canEdit" boolean DEFAULT false NOT NULL,
	"canDelete" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificationPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailNotifications" boolean DEFAULT true NOT NULL,
	"pushNotifications" boolean DEFAULT true NOT NULL,
	"soundAlerts" boolean DEFAULT true NOT NULL,
	"studentAddedNotif" boolean DEFAULT true NOT NULL,
	"leadStatusChangeNotif" boolean DEFAULT true NOT NULL,
	"attendanceNotif" boolean DEFAULT true NOT NULL,
	"equipmentNotif" boolean DEFAULT true NOT NULL,
	"specimenNotif" boolean DEFAULT true NOT NULL,
	"kpiNotif" boolean DEFAULT true NOT NULL,
	"courseNotif" boolean DEFAULT true NOT NULL,
	"enrollmentNotif" boolean DEFAULT true NOT NULL,
	"systemAlertNotif" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notificationPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "notificationSubscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"deviceId" varchar(255) NOT NULL,
	"endpoint" text,
	"auth" text,
	"p256dh" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastActive" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "notifications_type_enum" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"entityType" varchar(100),
	"entityId" integer,
	"relatedUserId" integer,
	"isRead" boolean DEFAULT false NOT NULL,
	"actionUrl" text,
	"metadata" jsonb,
	"priority" "notifications_priority_enum" DEFAULT 'normal' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"readAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "plannerEntries" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"entryDate" date NOT NULL,
	"notes" text,
	"reminderAt" timestamp,
	"isComplete" boolean DEFAULT false NOT NULL,
	"recurrence" varchar(30),
	"recurrenceUntil" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetDepartmentCoverageSettings" (
	"id" serial PRIMARY KEY NOT NULL,
	"department" varchar(255) NOT NULL,
	"minimumAvailableCount" integer,
	"maximumPeopleOff" integer,
	"mediumRiskPercent" integer DEFAULT 25 NOT NULL,
	"highRiskPercent" integer DEFAULT 50 NOT NULL,
	"notes" text,
	"createdByUserId" integer,
	"updatedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plannerTimesheetDepartmentCoverageSettings_department_unique" UNIQUE("department")
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetEntries" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entryDate" date NOT NULL,
	"startTime" varchar(10),
	"endTime" varchar(10),
	"lunchBreakMinutes" integer,
	"teaBreakMinutes" integer,
	"leavePortionPercent" integer,
	"selectedOptionIds" jsonb NOT NULL,
	"remarks" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetHolidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"holidayDate" date NOT NULL,
	"label" varchar(255) NOT NULL,
	"holidayType" varchar(40) DEFAULT 'public_holiday' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetLeaveOverrideReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"entryDate" date NOT NULL,
	"reviewedAt" timestamp,
	"reviewedByUserId" integer,
	"reviewedByName" varchar(255),
	"reviewNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetMonthStatuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"monthDate" date NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"statusNote" text,
	"lockedAt" timestamp,
	"submittedAt" timestamp,
	"submittedByName" varchar(255),
	"employeeDeclarationAccepted" boolean DEFAULT false NOT NULL,
	"employeeDeclarationAcceptedAt" timestamp,
	"submissionNote" text,
	"reviewedAt" timestamp,
	"reviewedByUserId" integer,
	"reviewedByName" varchar(255),
	"reviewerDeclarationAccepted" boolean DEFAULT false NOT NULL,
	"reviewerDeclarationAcceptedAt" timestamp,
	"reviewNote" text,
	"handedOffAt" timestamp,
	"handedOffByUserId" integer,
	"handedOffByName" varchar(255),
	"handoffNote" text,
	"historyJson" jsonb,
	"reopenedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetOptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"hoursCategory" varchar(30) DEFAULT 'working' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"department" varchar(255),
	"signatureName" varchar(255),
	"personalLeaveAllowanceDays" integer,
	"personalLeaveCarryOverDays" integer DEFAULT 0 NOT NULL,
	"leaveYearStartMonth" integer DEFAULT 1 NOT NULL,
	"monThuStartTime" varchar(10),
	"monThuEndTime" varchar(10),
	"fridayStartTime" varchar(10),
	"fridayEndTime" varchar(10),
	"weekendStartTime" varchar(10),
	"weekendEndTime" varchar(10),
	"monThuTemplateId" integer,
	"fridayTemplateId" integer,
	"weekendTemplateId" integer,
	"lunchBreakMinutes" integer DEFAULT 60 NOT NULL,
	"teaBreakMinutes" integer DEFAULT 30 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plannerTimesheetProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "plannerTimesheetTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"description" text,
	"startTime" varchar(10),
	"endTime" varchar(10),
	"lunchBreakMinutes" integer,
	"teaBreakMinutes" integer,
	"leavePortionPercent" integer,
	"selectedOptionIds" jsonb NOT NULL,
	"remarks" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalApprovalRequests" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"entityType" "portal_approval_requests_entity_type_enum" NOT NULL,
	"action" "portal_approval_requests_action_enum" NOT NULL,
	"entityId" integer,
	"summary" varchar(255) NOT NULL,
	"payload" jsonb,
	"status" "portal_approval_requests_status_enum" DEFAULT 'pending' NOT NULL,
	"submittedByUserId" integer NOT NULL,
	"reviewedByUserId" integer,
	"reviewNotes" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalAssessmentGuides" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"clientBranchId" integer,
	"title" varchar(255) NOT NULL,
	"techniqueName" varchar(255) NOT NULL,
	"description" text,
	"bringItems" jsonb,
	"companyItems" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientBranches" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"sourceClientId" integer,
	"name" varchar(255) NOT NULL,
	"code" varchar(80),
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientComments" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"userId" integer NOT NULL,
	"requestType" "portal_client_comments_request_type_enum" DEFAULT 'general_comment' NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"status" "portal_client_comments_status_enum" DEFAULT 'open' NOT NULL,
	"internalNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientDocuments" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"clientBranchId" integer,
	"title" varchar(255) NOT NULL,
	"category" varchar(120) DEFAULT 'General' NOT NULL,
	"description" text,
	"fileName" varchar(255) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"contentType" varchar(255),
	"sourceFileName" varchar(255),
	"sourcePath" text,
	"reviewDate" date,
	"validUntil" date,
	"status" "portal_client_documents_status_enum" DEFAULT 'active' NOT NULL,
	"uploadedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientReminderSettings" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"complianceEnabled" boolean DEFAULT true NOT NULL,
	"documentEnabled" boolean DEFAULT true NOT NULL,
	"includeMissingRequired" boolean DEFAULT true NOT NULL,
	"includePendingReview" boolean DEFAULT true NOT NULL,
	"documentLeadDays" integer DEFAULT 14 NOT NULL,
	"complianceEscalationDays" integer DEFAULT 14 NOT NULL,
	"documentEscalationDays" integer DEFAULT 7 NOT NULL,
	"sendToAssignedUsers" boolean DEFAULT true NOT NULL,
	"sendToInternalAdmins" boolean DEFAULT true NOT NULL,
	"escalationManagersOnly" boolean DEFAULT true NOT NULL,
	"allowedClientDocumentLabels" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientResources" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"clientBranchId" integer,
	"title" varchar(255) NOT NULL,
	"category" varchar(120) DEFAULT 'General' NOT NULL,
	"description" text,
	"resourceType" "portal_client_resources_resource_type_enum" DEFAULT 'file' NOT NULL,
	"linkUrl" text,
	"fileName" varchar(255),
	"fileUrl" text,
	"fileKey" varchar(500),
	"contentType" varchar(255),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"uploadedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientUserBranches" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"userId" integer NOT NULL,
	"branchId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalClientUsers" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"userId" integer NOT NULL,
	"accessLevel" "portal_client_users_access_level_enum" DEFAULT 'viewer' NOT NULL,
	"receiveReminders" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalRequirementDefinitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(100) DEFAULT 'General' NOT NULL,
	"description" text,
	"validityDays" integer,
	"reminderDays" integer DEFAULT 30 NOT NULL,
	"isRequired" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"customFields" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalRequirementDocuments" (
	"id" serial PRIMARY KEY NOT NULL,
	"technicianRequirementId" integer NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"contentType" varchar(255),
	"uploadedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalRequirementSourceReferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"technicianRequirementId" integer NOT NULL,
	"sourceFileName" varchar(255) NOT NULL,
	"sourcePath" text NOT NULL,
	"importedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalServiceDefinitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(120) DEFAULT 'General' NOT NULL,
	"description" text,
	"instructions" text,
	"active" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalServiceRequests" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"clientBranchId" integer,
	"serviceDefinitionId" integer,
	"userId" integer NOT NULL,
	"technicianId" integer,
	"title" varchar(255) NOT NULL,
	"requestType" varchar(120) NOT NULL,
	"status" varchar(80) DEFAULT 'submitted' NOT NULL,
	"preferredDate" date,
	"techniques" jsonb,
	"details" text,
	"requestedDocuments" jsonb,
	"internalNotes" text,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portalTechnicianRequirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"technicianId" integer NOT NULL,
	"definitionId" integer NOT NULL,
	"status" "portal_technician_requirements_status_enum" DEFAULT 'missing' NOT NULL,
	"issuedAt" date,
	"validUntil" date,
	"notes" text,
	"customFieldValues" jsonb,
	"uploadedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualityActions" (
	"id" serial PRIMARY KEY NOT NULL,
	"referenceNumber" varchar(60) NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" "quality_actions_category_enum" DEFAULT 'Nonconformance' NOT NULL,
	"source" "quality_actions_source_enum" DEFAULT 'Other' NOT NULL,
	"severity" "quality_actions_severity_enum" DEFAULT 'Minor' NOT NULL,
	"status" "quality_actions_status_enum" DEFAULT 'Open' NOT NULL,
	"branchId" integer,
	"ownerName" varchar(255),
	"reportedByUserId" integer,
	"reportedDate" date NOT NULL,
	"dueDate" date,
	"closedAt" timestamp,
	"description" text NOT NULL,
	"immediateCorrection" text,
	"rootCause" text,
	"correctiveAction" text,
	"verificationNotes" text,
	"verifiedByName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qualityActions_referenceNumber_unique" UNIQUE("referenceNumber")
);
--> statement-breakpoint
CREATE TABLE "qualityAudits" (
	"id" serial PRIMARY KEY NOT NULL,
	"referenceNumber" varchar(60) NOT NULL,
	"title" varchar(255) NOT NULL,
	"auditType" "quality_audits_audit_type_enum" DEFAULT 'Internal Audit' NOT NULL,
	"status" "quality_audits_status_enum" DEFAULT 'Planned' NOT NULL,
	"branchId" integer,
	"leadAuditor" varchar(255),
	"auditee" varchar(255),
	"plannedDate" date NOT NULL,
	"completedDate" date,
	"nextAuditDate" date,
	"scope" text NOT NULL,
	"criteria" text,
	"summary" text,
	"findingsSummary" text,
	"followUpSummary" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "qualityAudits_referenceNumber_unique" UNIQUE("referenceNumber")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"reportType" varchar(100) NOT NULL,
	"generatedBy" integer,
	"branchId" integer,
	"filters" jsonb,
	"data" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sharedPlannerEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"eventType" "shared_planner_events_event_type_enum" DEFAULT 'General' NOT NULL,
	"branchId" integer,
	"createdByUserId" integer NOT NULL,
	"startAt" timestamp NOT NULL,
	"endAt" timestamp,
	"isAllDay" boolean DEFAULT false NOT NULL,
	"location" varchar(255),
	"notes" text,
	"recurrence" varchar(30),
	"recurrenceUntil" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specimenDocuments" (
	"id" serial PRIMARY KEY NOT NULL,
	"specimenId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"uploadedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specimenLoans" (
	"id" serial PRIMARY KEY NOT NULL,
	"specimenId" integer NOT NULL,
	"fromBranchId" integer NOT NULL,
	"toBranchId" integer NOT NULL,
	"loanDate" date NOT NULL,
	"expectedReturnDate" date,
	"returnedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "specimenTypes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"material" varchar(255),
	"size" varchar(255),
	"weight" varchar(255),
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "specimenTypes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "specimens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"specimenTypeId" integer NOT NULL,
	"serialNumber" varchar(100),
	"description" text,
	"status" "specimens_status_enum" DEFAULT 'Available' NOT NULL,
	"masteringStatus" "specimens_mastering_status_enum" DEFAULT 'Pending' NOT NULL,
	"branchId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255) NOT NULL,
	"email" varchar(320),
	"phone" varchar(20),
	"idNumber" varchar(50),
	"passportNumber" varchar(50),
	"studentNumber" varchar(50),
	"dateOfBirth" date,
	"branchId" integer,
	"interestType" varchar(30),
	"isCurrentPcnHolder" boolean DEFAULT false NOT NULL,
	"bindtProductCompleted" boolean DEFAULT false NOT NULL,
	"pcnNumber" varchar(100),
	"active" boolean DEFAULT true NOT NULL,
	"blacklisted" boolean DEFAULT false NOT NULL,
	"blacklistReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainingOfferings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"courseId" integer,
	"startDate" date,
	"endDate" date,
	"status" "training_offerings_status_enum" DEFAULT 'Planned' NOT NULL,
	"branchId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"authId" varchar(36),
	"name" text,
	"email" varchar(320),
	"avatarUrl" text,
	"calendarFeedToken" varchar(64),
	"loginEnabled" boolean DEFAULT true NOT NULL,
	"mustChangePassword" boolean DEFAULT false NOT NULL,
	"role" "users_role_enum" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp,
	CONSTRAINT "users_authId_unique" UNIQUE("authId"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_calendarFeedToken_unique" UNIQUE("calendarFeedToken")
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"companyName" varchar(255) NOT NULL,
	"companyLogo" text,
	"companyLogoUrl" varchar(500),
	"companyDescription" text,
	"primaryColor" varchar(7),
	"secondaryColor" varchar(7),
	"timezone" varchar(50),
	"dateFormat" varchar(20),
	"currency" varchar(3),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"roleId" integer NOT NULL,
	"permissionId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) DEFAULT 'custom' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"permissionId" integer NOT NULL,
	"grantedAt" timestamp DEFAULT now() NOT NULL,
	"grantedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"roleId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
