CREATE TABLE IF NOT EXISTS `levelIIIActivities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clientId` int NOT NULL,
  `activityType` enum('Visit','Call','Email','Assessment','Procedure Review','General') NOT NULL DEFAULT 'General',
  `subject` varchar(255) NOT NULL,
  `activityDate` date NOT NULL,
  `nextActionDate` date DEFAULT NULL,
  `status` enum('Planned','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `levelIIIActivities_client_idx` (`clientId`),
  KEY `levelIIIActivities_date_idx` (`activityDate`),
  KEY `levelIIIActivities_nextAction_idx` (`nextActionDate`)
);
