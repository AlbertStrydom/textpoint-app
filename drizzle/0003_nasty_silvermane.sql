ALTER TABLE `equipment` ADD `escalationLevel` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment` ADD `lastEscalationDate` timestamp;