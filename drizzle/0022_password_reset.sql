CREATE TABLE `password_reset_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pwd_reset_user` ON `password_reset_tokens` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pwd_reset_hash` ON `password_reset_tokens` (`token_hash`);
