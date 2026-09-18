CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`path` text NOT NULL,
	`target` text NOT NULL,
	`referrer` text NOT NULL,
	`device` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`conversation_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_analytics_created` ON `analytics_events` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_visitor_created` ON `analytics_events` (`visitor_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_messages_role_created` ON `messages` (`role`,`created_at`,`id`);