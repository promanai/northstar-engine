CREATE TABLE `ai_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`config` text NOT NULL
);
