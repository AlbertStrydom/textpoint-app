ALTER TABLE `levelIIITechnicians`
  ADD COLUMN `methods` json NULL,
  ADD COLUMN `hasPcnQualification` boolean NOT NULL DEFAULT false,
  ADD COLUMN `internalAssessmentDate` date DEFAULT NULL;

UPDATE `levelIIITechnicians`
SET
  `methods` = JSON_ARRAY(`method`),
  `hasPcnQualification` = CASE
    WHEN `pcnRenewalDate` IS NOT NULL OR (`certificateNumber` IS NOT NULL AND `certificateNumber` <> '') THEN true
    ELSE false
  END
WHERE `methods` IS NULL AND `method` IS NOT NULL AND `method` <> '';

ALTER TABLE `levelIIIEquipment`
  ADD COLUMN `calibrationType` varchar(100) DEFAULT NULL,
  ADD COLUMN `lastServiceDate` date DEFAULT NULL,
  ADD COLUMN `nextDueDate` date DEFAULT NULL;

ALTER TABLE `levelIIISpecimens`
  ADD COLUMN `masteringStatus` enum('Mastered','Re-master Required','Pending') NOT NULL DEFAULT 'Pending';
