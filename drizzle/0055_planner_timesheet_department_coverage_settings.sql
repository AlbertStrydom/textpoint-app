CREATE TABLE IF NOT EXISTS `plannerTimesheetDepartmentCoverageSettings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `department` VARCHAR(255) NOT NULL,
  `minimumAvailableCount` INT NULL,
  `maximumPeopleOff` INT NULL,
  `mediumRiskPercent` INT NOT NULL DEFAULT 25,
  `highRiskPercent` INT NOT NULL DEFAULT 50,
  `notes` TEXT NULL,
  `createdByUserId` INT NULL,
  `updatedByUserId` INT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plannerTimesheetDepartmentCoverageSettings_department_unique` (`department`)
);
