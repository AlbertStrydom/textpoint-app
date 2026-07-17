CREATE TABLE IF NOT EXISTS `portalApprovalRequests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clientId` INT NOT NULL,
  `entityType` ENUM('technician','requirement_record','client_document','resource') NOT NULL,
  `action` ENUM('create','update','delete','upsert') NOT NULL,
  `entityId` INT NULL,
  `summary` VARCHAR(255) NOT NULL,
  `payload` JSON NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `submittedByUserId` INT NOT NULL,
  `reviewedByUserId` INT NULL,
  `reviewNotes` TEXT NULL,
  `reviewedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `portalApprovalRequests_client_idx` (`clientId`),
  KEY `portalApprovalRequests_status_idx` (`status`),
  KEY `portalApprovalRequests_submitter_idx` (`submittedByUserId`)
);
