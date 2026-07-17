ALTER TABLE `plannerTimesheetMonthStatuses`
ADD COLUMN `historyJson` JSON NULL AFTER `reviewNote`;
