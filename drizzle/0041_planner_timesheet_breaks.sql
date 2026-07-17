ALTER TABLE `plannerTimesheetProfiles`
  ADD COLUMN `lunchBreakMinutes` INT NOT NULL DEFAULT 60,
  ADD COLUMN `teaBreakMinutes` INT NOT NULL DEFAULT 30;

ALTER TABLE `plannerTimesheetEntries`
  ADD COLUMN `lunchBreakMinutes` INT NULL,
  ADD COLUMN `teaBreakMinutes` INT NULL;
