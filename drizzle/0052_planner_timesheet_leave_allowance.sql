ALTER TABLE `plannerTimesheetProfiles`
  ADD COLUMN `personalLeaveAllowanceDays` INT NULL,
  ADD COLUMN `personalLeaveCarryOverDays` INT NOT NULL DEFAULT 0;
