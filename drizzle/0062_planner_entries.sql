CREATE TABLE IF NOT EXISTS `plannerEntries` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `userId` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `entryDate` date NOT NULL,
  `notes` text,
  `reminderAt` datetime,
  `isComplete` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
