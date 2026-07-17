CREATE TABLE IF NOT EXISTS `plannerTimesheetLeaveOverrideReviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `entryDate` DATE NOT NULL,
  `reviewedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewedByUserId` INT NULL,
  `reviewedByName` VARCHAR(255) NULL,
  `reviewNote` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plannerTimesheetLeaveOverrideReviews_user_date_unique` (`userId`, `entryDate`),
  KEY `plannerTimesheetLeaveOverrideReviews_user_idx` (`userId`),
  KEY `plannerTimesheetLeaveOverrideReviews_date_idx` (`entryDate`)
);
