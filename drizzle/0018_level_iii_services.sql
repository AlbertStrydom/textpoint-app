CREATE TABLE IF NOT EXISTS `levelIIIClients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `companyName` varchar(255) NOT NULL,
  `primaryContact` varchar(255) NOT NULL,
  `secondaryContact` varchar(255) DEFAULT NULL,
  `email` varchar(320) NOT NULL,
  `secondaryEmail` varchar(320) DEFAULT NULL,
  `phone` varchar(50) NOT NULL,
  `secondaryPhone` varchar(50) DEFAULT NULL,
  `physicalAddress` text NOT NULL,
  `visitCadence` enum('Weekly','Monthly','Six Monthly') NOT NULL DEFAULT 'Monthly',
  `lastVisit` date DEFAULT NULL,
  `nextVisit` date DEFAULT NULL,
  `procedureUpdatedAt` date DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIClients_company_idx` (`companyName`),
  KEY `levelIIIClients_nextVisit_idx` (`nextVisit`)
);

CREATE TABLE IF NOT EXISTS `levelIIITechnicians` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(320) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `method` varchar(255) NOT NULL,
  `level` varchar(100) NOT NULL,
  `certificateNumber` varchar(120) DEFAULT NULL,
  `procedureStatus` varchar(255) DEFAULT NULL,
  `pcnRenewalDate` date DEFAULT NULL,
  `eyeTestValidUntil` date DEFAULT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIITechnicians_client_idx` (`clientId`),
  KEY `levelIIITechnicians_name_idx` (`name`)
);

CREATE TABLE IF NOT EXISTS `levelIIIAssessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `technicianId` int NOT NULL,
  `assessmentDate` date NOT NULL,
  `method` varchar(255) NOT NULL,
  `level` varchar(100) NOT NULL,
  `assessor` varchar(255) NOT NULL,
  `result` enum('Pass','Fail','Observation','Pending Review') NOT NULL DEFAULT 'Pending Review',
  `nextReviewDate` date DEFAULT NULL,
  `evidenceUrl` text,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIAssessments_technician_idx` (`technicianId`),
  KEY `levelIIIAssessments_date_idx` (`assessmentDate`),
  KEY `levelIIIAssessments_review_idx` (`nextReviewDate`)
);

CREATE TABLE IF NOT EXISTS `levelIIIEquipment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `serialNumber` varchar(100) NOT NULL,
  `status` enum('Available','In Service','Calibration Due','Out of Service') NOT NULL DEFAULT 'Available',
  `sharedWithMainEquipment` boolean NOT NULL DEFAULT false,
  `owner` varchar(255) NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIEquipment_serial_idx` (`serialNumber`)
);

CREATE TABLE IF NOT EXISTS `levelIIISpecimens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `specimenNumber` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `specimenType` varchar(255) NOT NULL,
  `status` enum('Available','In Use','Shared','Retired') NOT NULL DEFAULT 'Available',
  `sharedWithMainSpecimens` boolean NOT NULL DEFAULT false,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIISpecimens_number_idx` (`specimenNumber`),
  KEY `levelIIISpecimens_type_idx` (`specimenType`)
);
