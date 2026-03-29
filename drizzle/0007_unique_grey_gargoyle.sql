ALTER TABLE `users` ADD `githubToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `githubUsername` varchar(39);--> statement-breakpoint
ALTER TABLE `users` ADD `githubAuthorizedAt` timestamp;