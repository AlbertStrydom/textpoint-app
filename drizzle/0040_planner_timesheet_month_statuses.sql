CREATE TABLE IF NOT EXISTS `plannerTimesheetMonthStatuses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `monthDate` DATE NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'open',
  `statusNote` TEXT NULL,
  `lockedAt` TIMESTAMP NULL,
  `reopenedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plannerTimesheetMonthStatuses_user_month_unique` (`userId`, `monthDate`),
  KEY `plannerTimesheetMonthStatuses_user_idx` (`userId`)
);
