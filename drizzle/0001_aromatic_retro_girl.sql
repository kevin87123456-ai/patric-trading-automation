CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`coin` varchar(20) NOT NULL,
	`timeframe` varchar(10) NOT NULL,
	`imageUrl` text NOT NULL,
	`analysisResult` text,
	`keyLevels` text,
	`status` enum('pending','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`userId` int NOT NULL,
	`coverTitle` varchar(30) NOT NULL,
	`youtubeTitle` varchar(200) NOT NULL,
	`igPost` text,
	`igStory` text,
	`isSelected` int NOT NULL DEFAULT 0,
	`syncedToSheets` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_materials_id` PRIMARY KEY(`id`)
);
