CREATE TABLE IF NOT EXISTS `portalClientUsers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `userId` INT NOT NULL,
  `accessLevel` ENUM('viewer','editor','manager') NOT NULL DEFAULT 'viewer',
  `receiveReminders` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `portalClientUsers_client_user_unique` (`clientId`, `userId`),
  KEY `portalClientUsers_user_idx` (`userId`),
  KEY `portalClientUsers_client_idx` (`clientId`)
);

CREATE TABLE IF NOT EXISTS `portalClientReminderSettings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `complianceEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  `documentEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  `includeMissingRequired` TINYINT(1) NOT NULL DEFAULT 1,
  `includePendingReview` TINYINT(1) NOT NULL DEFAULT 1,
  `documentLeadDays` INT NOT NULL DEFAULT 14,
  `complianceEscalationDays` INT NOT NULL DEFAULT 14,
  `documentEscalationDays` INT NOT NULL DEFAULT 7,
  `sendToAssignedUsers` TINYINT(1) NOT NULL DEFAULT 1,
  `sendToInternalAdmins` TINYINT(1) NOT NULL DEFAULT 1,
  `escalationManagersOnly` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `portalClientReminderSettings_client_unique` (`clientId`),
  KEY `portalClientReminderSettings_client_idx` (`clientId`)
);

CREATE TABLE IF NOT EXISTS `portalRequirementDefinitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'General',
  `description` TEXT NULL,
  `validityDays` INT NULL,
  `reminderDays` INT NOT NULL DEFAULT 30,
  `isRequired` TINYINT(1) NOT NULL DEFAULT 1,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `customFields` JSON NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalRequirementDefinitions_client_idx` (`clientId`)
);

CREATE TABLE IF NOT EXISTS `portalTechnicianRequirements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `technicianId` INT NOT NULL,
  `definitionId` INT NOT NULL,
  `status` ENUM('missing','current','no_expiry','expiring','expired','pending_review') NOT NULL DEFAULT 'missing',
  `issuedAt` DATE NULL,
  `validUntil` DATE NULL,
  `notes` TEXT NULL,
  `customFieldValues` JSON NULL,
  `uploadedByUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `portalTechnicianRequirements_unique` (`technicianId`, `definitionId`),
  KEY `portalTechnicianRequirements_definition_idx` (`definitionId`)
);

CREATE TABLE IF NOT EXISTS `portalRequirementDocuments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `technicianRequirementId` INT NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `fileUrl` TEXT NOT NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `contentType` VARCHAR(255) NULL,
  `uploadedByUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `portalRequirementDocuments_requirement_idx` (`technicianRequirementId`)
);

CREATE TABLE IF NOT EXISTS `portalClientDocuments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(120) NOT NULL DEFAULT 'General',
  `description` TEXT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `fileUrl` TEXT NOT NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `contentType` VARCHAR(255) NULL,
  `reviewDate` DATE NULL,
  `validUntil` DATE NULL,
  `status` ENUM('active','archived','superseded') NOT NULL DEFAULT 'active',
  `uploadedByUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalClientDocuments_client_idx` (`clientId`)
);

CREATE TABLE IF NOT EXISTS `portalClientComments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `userId` INT NOT NULL,
  `requestType` ENUM('general_comment','contact_request','suggestion') NOT NULL DEFAULT 'general_comment',
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` ENUM('open','acknowledged','closed') NOT NULL DEFAULT 'open',
  `internalNotes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalClientComments_client_idx` (`clientId`),
  KEY `portalClientComments_user_idx` (`userId`)
);

CREATE TABLE IF NOT EXISTS `portalClientResources` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(120) NOT NULL DEFAULT 'General',
  `description` TEXT NULL,
  `resourceType` ENUM('file','link') NOT NULL DEFAULT 'file',
  `linkUrl` TEXT NULL,
  `fileName` VARCHAR(255) NULL,
  `fileUrl` TEXT NULL,
  `fileKey` VARCHAR(500) NULL,
  `contentType` VARCHAR(255) NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `uploadedByUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalClientResources_client_idx` (`clientId`)
);
