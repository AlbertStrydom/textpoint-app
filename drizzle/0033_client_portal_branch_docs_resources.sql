ALTER TABLE `portalClientDocuments`
  ADD COLUMN IF NOT EXISTS `clientBranchId` INT NULL;

ALTER TABLE `portalClientResources`
  ADD COLUMN IF NOT EXISTS `clientBranchId` INT NULL;

CREATE INDEX `portalClientDocuments_clientBranchId_idx`
  ON `portalClientDocuments` (`clientBranchId`);

CREATE INDEX `portalClientResources_clientBranchId_idx`
  ON `portalClientResources` (`clientBranchId`);
