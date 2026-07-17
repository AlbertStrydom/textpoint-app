ALTER TABLE `plannerTimesheetMonthStatuses`
  ADD COLUMN `employeeDeclarationAccepted` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `employeeDeclarationAcceptedAt` TIMESTAMP NULL;
