ALTER TABLE `plannerTimesheetMonthStatuses`
  ADD COLUMN `submittedAt` timestamp NULL,
  ADD COLUMN `reviewedAt` timestamp NULL,
  ADD COLUMN `reviewedByUserId` int NULL,
  ADD COLUMN `reviewedByName` varchar(255) NULL;
