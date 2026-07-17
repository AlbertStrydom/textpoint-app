ALTER TABLE `plannerTimesheetEntries`
  ADD COLUMN `leavePortionPercent` INT NULL AFTER `teaBreakMinutes`;

ALTER TABLE `plannerTimesheetTemplates`
  ADD COLUMN `leavePortionPercent` INT NULL AFTER `teaBreakMinutes`;
