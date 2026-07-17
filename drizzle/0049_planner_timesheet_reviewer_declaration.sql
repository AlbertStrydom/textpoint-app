ALTER TABLE `plannerTimesheetMonthStatuses`
  ADD COLUMN `reviewerDeclarationAccepted` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `reviewerDeclarationAcceptedAt` TIMESTAMP NULL;
