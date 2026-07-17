CREATE TABLE IF NOT EXISTS `certificates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollmentId` int NOT NULL,
  `certificateNumber` varchar(120) NOT NULL,
  `issuedDate` date NOT NULL,
  `expiryDate` date DEFAULT NULL,
  `status` enum('Active','Expired','Revoked') NOT NULL DEFAULT 'Active',
  `content` text,
  `notes` text,
  `issuedBy` int DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `certificates_number_unique` (`certificateNumber`),
  KEY `certificates_enrollment_idx` (`enrollmentId`),
  KEY `certificates_issued_idx` (`issuedDate`),
  KEY `certificates_expiry_idx` (`expiryDate`),
  KEY `certificates_status_idx` (`status`)
);
