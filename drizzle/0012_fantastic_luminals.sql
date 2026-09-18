ALTER TABLE `files` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `files` ADD `content_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `files_user_request_unique` ON `files` (`user_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `files_user_status_idx` ON `files` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `files_status_idx` ON `files` (`status`);