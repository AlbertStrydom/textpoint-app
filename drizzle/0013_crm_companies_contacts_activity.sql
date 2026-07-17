CREATE TABLE IF NOT EXISTS `companies` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `registrationNumber` varchar(100),
  `phone` varchar(50),
  `email` varchar(320),
  `website` varchar(255),
  `physicalAddress` text,
  `primaryContactName` varchar(255),
  `primaryContactEmail` varchar(320),
  `primaryContactPhone` varchar(50),
  `status` varchar(30) NOT NULL DEFAULT 'Active',
  `branchId` int,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `companies_id` PRIMARY KEY(`id`),
  KEY `companies_name_idx` (`name`),
  KEY `companies_branch_idx` (`branchId`)
);

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `companyId` int,
  `firstName` varchar(120) NOT NULL,
  `lastName` varchar(120) NOT NULL,
  `email` varchar(320),
  `phone` varchar(50),
  `position` varchar(120),
  `contactType` varchar(50) NOT NULL DEFAULT 'Client',
  `notes` text,
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `contacts_id` PRIMARY KEY(`id`),
  KEY `contacts_company_idx` (`companyId`),
  KEY `contacts_email_idx` (`email`)
);

CREATE TABLE IF NOT EXISTS `leadActivities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `leadId` int NOT NULL,
  `userId` int,
  `activityType` varchar(50) NOT NULL DEFAULT 'Note',
  `subject` varchar(255),
  `notes` text,
  `dueDate` datetime,
  `completed` boolean NOT NULL DEFAULT false,
  `completedAt` datetime,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `leadActivities_id` PRIMARY KEY(`id`),
  KEY `leadActivities_lead_idx` (`leadId`),
  KEY `leadActivities_due_idx` (`dueDate`),
  KEY `leadActivities_completed_idx` (`completed`)
);
