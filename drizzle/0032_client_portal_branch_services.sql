ALTER TABLE `levelIIITechnicians`
  ADD COLUMN IF NOT EXISTS `clientBranchId` INT NULL;

CREATE TABLE IF NOT EXISTS `portalClientBranches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(80) NULL,
  `description` TEXT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalClientBranches_client_idx` (`clientId`)
);

CREATE TABLE IF NOT EXISTS `portalClientUserBranches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `userId` INT NOT NULL,
  `branchId` INT NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `portalClientUserBranches_unique` (`clientId`, `userId`, `branchId`),
  KEY `portalClientUserBranches_branch_idx` (`branchId`)
);

CREATE TABLE IF NOT EXISTS `portalServiceDefinitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(120) NOT NULL DEFAULT 'General',
  `description` TEXT NULL,
  `instructions` TEXT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `config` JSON NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalServiceDefinitions_client_idx` (`clientId`)
);

CREATE TABLE IF NOT EXISTS `portalServiceRequests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `clientBranchId` INT NULL,
  `serviceDefinitionId` INT NULL,
  `userId` INT NOT NULL,
  `technicianId` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `requestType` VARCHAR(120) NOT NULL,
  `status` VARCHAR(80) NOT NULL DEFAULT 'submitted',
  `preferredDate` DATE NULL,
  `techniques` JSON NULL,
  `details` TEXT NULL,
  `requestedDocuments` JSON NULL,
  `internalNotes` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalServiceRequests_client_idx` (`clientId`),
  KEY `portalServiceRequests_branch_idx` (`clientBranchId`),
  KEY `portalServiceRequests_status_idx` (`status`)
);

CREATE TABLE IF NOT EXISTS `portalAssessmentGuides` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `clientBranchId` INT NULL,
  `title` VARCHAR(255) NOT NULL,
  `techniqueName` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `bringItems` JSON NULL,
  `companyItems` JSON NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalAssessmentGuides_client_idx` (`clientId`)
);
