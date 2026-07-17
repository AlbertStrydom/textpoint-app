ALTER TABLE `auth_accounts`
ADD COLUMN `passwordHistory` JSON NULL;

ALTER TABLE `portalClientReminderSettings`
ADD COLUMN `allowedClientDocumentLabels` JSON NULL;
