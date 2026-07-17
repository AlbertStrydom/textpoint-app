CREATE TABLE `notificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailNotifications` boolean NOT NULL DEFAULT true,
	`pushNotifications` boolean NOT NULL DEFAULT true,
	`soundAlerts` boolean NOT NULL DEFAULT true,
	`studentAddedNotif` boolean NOT NULL DEFAULT true,
	`leadStatusChangeNotif` boolean NOT NULL DEFAULT true,
	`attendanceNotif` boolean NOT NULL DEFAULT true,
	`equipmentNotif` boolean NOT NULL DEFAULT true,
	`specimenNotif` boolean NOT NULL DEFAULT true,
	`kpiNotif` boolean NOT NULL DEFAULT true,
	`courseNotif` boolean NOT NULL DEFAULT true,
	`enrollmentNotif` boolean NOT NULL DEFAULT true,
	`systemAlertNotif` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `notificationSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`deviceId` varchar(255) NOT NULL,
	`endpoint` text,
	`auth` text,
	`p256dh` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastActive` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificationSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('student_added','lead_status_changed','attendance_marked','equipment_maintenance','specimen_mastered','kpi_completed','course_started','enrollment_confirmed','system_alert') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`relatedUserId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`actionUrl` text,
	`metadata` json,
	`priority` enum('low','normal','high','critical') NOT NULL DEFAULT 'normal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
