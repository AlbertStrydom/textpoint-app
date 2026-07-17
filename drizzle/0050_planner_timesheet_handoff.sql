ALTER TABLE `plannerTimesheetMonthStatuses`
  ADD COLUMN `handedOffAt` timestamp NULL,
  ADD COLUMN `handedOffByUserId` int NULL,
  ADD COLUMN `handedOffByName` varchar(255) NULL,
  ADD COLUMN `handoffNote` text NULL;
