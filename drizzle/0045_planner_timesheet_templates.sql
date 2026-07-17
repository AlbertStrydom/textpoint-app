CREATE TABLE IF NOT EXISTS `plannerTimesheetTemplates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `startTime` VARCHAR(10) NULL,
  `endTime` VARCHAR(10) NULL,
  `lunchBreakMinutes` INT NULL,
  `teaBreakMinutes` INT NULL,
  `selectedOptionIds` JSON NOT NULL,
  `remarks` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plannerTimesheetTemplates_user_idx` (`userId`)
);
