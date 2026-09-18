CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `guest_token_hash` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `guest_expires_at` integer;