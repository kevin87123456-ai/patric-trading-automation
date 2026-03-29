CREATE TABLE `market_scan_key_levels` (
	`id` varchar(255) NOT NULL,
	`scanId` varchar(255) NOT NULL,
	`price` decimal(20,8) NOT NULL,
	`label` varchar(100) NOT NULL,
	`note` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_scan_key_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_scans` (
	`id` varchar(255) NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`timeframe` varchar(10) NOT NULL,
	`direction` enum('long','short','neutral') NOT NULL,
	`confidence` enum('high','medium','low') NOT NULL,
	`corgiBoxHigh` decimal(20,8) NOT NULL,
	`corgiBoxLow` decimal(20,8) NOT NULL,
	`corgiBoxMiddle` decimal(20,8) NOT NULL,
	`currentPrice` decimal(20,8) NOT NULL,
	`analysis` text NOT NULL,
	`viewpoint` text NOT NULL,
	`bottomText` text,
	`published` boolean NOT NULL DEFAULT false,
	`publishedAt` bigint,
	`imageUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `market_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scan_job_logs` (
	`id` varchar(255) NOT NULL,
	`jobType` varchar(50) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL,
	`symbols` json NOT NULL,
	`timeframe` varchar(10) NOT NULL,
	`scansCreated` int NOT NULL DEFAULT 0,
	`scansPublished` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`scheduledAt` bigint NOT NULL,
	`startedAt` bigint,
	`completedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scan_job_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_scan_id` ON `market_scan_key_levels` (`scanId`);--> statement-breakpoint
CREATE INDEX `idx_symbol_timeframe` ON `market_scans` (`symbol`,`timeframe`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `market_scans` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_published` ON `market_scans` (`published`);