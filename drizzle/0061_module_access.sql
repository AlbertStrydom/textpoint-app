CREATE TABLE IF NOT EXISTS `module_access` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `userId` int NOT NULL,
  `module` varchar(100) NOT NULL,
  `canView` boolean NOT NULL DEFAULT false,
  `canCreate` boolean NOT NULL DEFAULT false,
  `canEdit` boolean NOT NULL DEFAULT false,
  `canDelete` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
