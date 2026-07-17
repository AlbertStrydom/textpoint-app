CREATE TABLE IF NOT EXISTS `assessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollmentId` int NOT NULL,
  `assessorId` int DEFAULT NULL,
  `assessmentType` enum('Theory','Practical') NOT NULL DEFAULT 'Theory',
  `attemptNumber` int NOT NULL DEFAULT 1,
  `score` decimal(6,2) DEFAULT NULL,
  `maxScore` decimal(6,2) DEFAULT NULL,
  `result` enum('Pass','Fail','Incomplete') NOT NULL DEFAULT 'Incomplete',
  `assessmentDate` date NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assessments_enrollment_idx` (`enrollmentId`),
  KEY `assessments_assessor_idx` (`assessorId`),
  KEY `assessments_date_idx` (`assessmentDate`)
);
