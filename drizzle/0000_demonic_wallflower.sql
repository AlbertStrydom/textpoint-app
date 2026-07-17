CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`enrollmentId` int NOT NULL,
	`courseScheduleId` int NOT NULL,
	`attendanceDate` date NOT NULL,
	`status` enum('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50),
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `courseSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`courseId` int NOT NULL,
	`startDate` datetime NOT NULL,
	`endDate` datetime NOT NULL,
	`instructorId` int,
	`maxCapacity` int,
	`branchId` int,
	`status` enum('Scheduled','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courseSchedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` text,
	`duration` int,
	`level` enum('Level 1','Level 2','Level 3') NOT NULL DEFAULT 'Level 1',
	`branchId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `courses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`documentType` varchar(100),
	`url` text NOT NULL,
	`uploadedBy` int,
	`branchId` int,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`courseScheduleId` int NOT NULL,
	`enrollmentDate` timestamp NOT NULL DEFAULT (now()),
	`status` enum('Active','Completed','Withdrawn','Suspended') NOT NULL DEFAULT 'Active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`serialNumber` varchar(100),
	`make` varchar(255),
	`model` varchar(255),
	`description` text,
	`domain` varchar(100),
	`calibrationType` varchar(100),
	`intervalMonths` int,
	`lastServiceDate` date,
	`nextDueDate` date,
	`status` enum('Active','Inactive','Maintenance','Retired') NOT NULL DEFAULT 'Active',
	`branchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `equipmentDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`documentType` enum('Manual','Certificate','Specification','Maintenance Log','Other') NOT NULL DEFAULT 'Other',
	`url` text NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipmentDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`totalRecords` int NOT NULL,
	`successfulRecords` int NOT NULL,
	`failedRecords` int NOT NULL,
	`columnMapping` json NOT NULL,
	`status` enum('Pending','Processing','Completed','Failed') NOT NULL DEFAULT 'Pending',
	`errorLog` text,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpiAnswers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiRecordId` int NOT NULL,
	`kpiQuestionId` int NOT NULL,
	`answerText` text,
	`answerValue` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpiAnswers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpiQuestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiTemplateId` int NOT NULL,
	`questionText` text NOT NULL,
	`questionType` enum('Text','MultipleChoice','Rating','YesNo') NOT NULL DEFAULT 'Text',
	`options` json,
	`isRequired` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpiQuestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpiRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kpiTemplateId` int NOT NULL,
	`lecturerId` int,
	`courseScheduleId` int,
	`evaluationDate` date NOT NULL,
	`status` enum('Draft','Submitted','Approved','Rejected') NOT NULL DEFAULT 'Draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpiRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kpiTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`branchId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kpiTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`companyName` varchar(255),
	`status` enum('New','Contacted','Qualified','Converted','Closed Lost') NOT NULL DEFAULT 'New',
	`source` varchar(100),
	`notes` text,
	`branchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lecturers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`specialization` varchar(255),
	`branchId` int,
	`active` boolean NOT NULL DEFAULT true,
	`externalLinks` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lecturers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`reportType` varchar(100) NOT NULL,
	`generatedBy` int,
	`branchId` int,
	`filters` json,
	`data` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specimenDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`specimenId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`url` text NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `specimenDocuments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specimenTypes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `specimenTypes_id` PRIMARY KEY(`id`),
	CONSTRAINT `specimenTypes_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `specimens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`specimenTypeId` int NOT NULL,
	`serialNumber` varchar(100),
	`description` text,
	`status` enum('Available','In Use','Loaned Out','Quarantine','Retired') NOT NULL DEFAULT 'Available',
	`masteringStatus` enum('Mastered','Re-master Required','Pending') NOT NULL DEFAULT 'Pending',
	`branchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `specimens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(255) NOT NULL,
	`lastName` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`idNumber` varchar(50),
	`passportNumber` varchar(50),
	`dateOfBirth` date,
	`branchId` int,
	`active` boolean NOT NULL DEFAULT true,
	`blacklisted` boolean NOT NULL DEFAULT false,
	`blacklistReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trainingOfferings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`courseId` int,
	`startDate` date,
	`endDate` date,
	`status` enum('Planned','Active','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
	`branchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainingOfferings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
