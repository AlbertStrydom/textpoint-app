ALTER TABLE `plannerTimesheetMonthStatuses`
  ADD COLUMN `submittedByName` varchar(255) NULL,
  ADD COLUMN `submissionNote` text NULL,
  ADD COLUMN `reviewNote` text NULL;
