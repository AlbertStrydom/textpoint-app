ALTER TABLE `branches` ADD `companyName` varchar(255);--> statement-breakpoint
ALTER TABLE `branches` ADD `companyDescription` text;--> statement-breakpoint
ALTER TABLE `branches` ADD `logoUrl` text;--> statement-breakpoint
ALTER TABLE `branches` ADD `primaryColor` varchar(7);--> statement-breakpoint
ALTER TABLE `branches` ADD `secondaryColor` varchar(7);--> statement-breakpoint
ALTER TABLE `courseSchedules` ADD `lecturerId` int;--> statement-breakpoint
ALTER TABLE `documents` ADD `content` text;--> statement-breakpoint
ALTER TABLE `students` ADD `studentNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `courseSchedules` DROP COLUMN `instructorId`;