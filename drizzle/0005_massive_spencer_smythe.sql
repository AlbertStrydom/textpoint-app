ALTER TABLE `leads` MODIFY COLUMN `email` varchar(255);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `phone` varchar(50);--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `status` varchar(30) NOT NULL DEFAULT 'New';--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `source` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `first_name` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `last_name` varchar(120) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `company_name` varchar(255);--> statement-breakpoint
ALTER TABLE `leads` ADD `id_number` varchar(50);--> statement-breakpoint
ALTER TABLE `leads` ADD `passport_number` varchar(50);--> statement-breakpoint
ALTER TABLE `leads` ADD `preferred_contact_method` varchar(30);--> statement-breakpoint
ALTER TABLE `leads` ADD `method_interested` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `interest_type` varchar(30);--> statement-breakpoint
ALTER TABLE `leads` ADD `is_current_pcn_holder` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `bindt_product_completed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `follow_up_date` datetime;--> statement-breakpoint
ALTER TABLE `leads` ADD `auto_follow_up` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `status_flag` varchar(20) DEFAULT 'Green' NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `is_blacklisted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `blacklist_reason` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `duplicate_warning` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `duplicate_notes` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `branch_id` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `firstName`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `lastName`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `companyName`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `branchId`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `leads` DROP COLUMN `updatedAt`;