CREATE TABLE IF NOT EXISTS `plannerTimesheetHolidays` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `userId` INT NOT NULL,
  `holidayDate` DATE NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `plannerTimesheetHolidays_id` PRIMARY KEY(`id`),
  KEY `plannerTimesheetHolidays_user_idx` (`userId`),
  KEY `plannerTimesheetHolidays_date_idx` (`holidayDate`)
);
