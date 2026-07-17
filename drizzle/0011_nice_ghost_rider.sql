CREATE TABLE `equipmentLoans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`equipmentId` int NOT NULL,
	`fromBranchId` int NOT NULL,
	`toBranchId` int NOT NULL,
	`loanDate` date NOT NULL,
	`expectedReturnDate` date,
	`returnedAt` datetime,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `equipmentLoans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `methods_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `specimenLoans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`specimenId` int NOT NULL,
	`fromBranchId` int NOT NULL,
	`toBranchId` int NOT NULL,
	`loanDate` date NOT NULL,
	`expectedReturnDate` date,
	`returnedAt` datetime,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `specimenLoans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `specimenTypes` ADD `material` varchar(255);--> statement-breakpoint
ALTER TABLE `specimenTypes` ADD `size` varchar(255);--> statement-breakpoint
ALTER TABLE `specimenTypes` ADD `weight` varchar(255);