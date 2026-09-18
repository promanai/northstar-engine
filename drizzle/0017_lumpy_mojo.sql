CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`mutation_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_support_tickets_customer_created` ON `support_tickets` (`customer_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_support_tickets_created` ON `support_tickets` (`created_at`,`id`);--> statement-breakpoint
CREATE TABLE `ticket_events` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`author` text NOT NULL,
	`action` text NOT NULL,
	`body` text,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`fingerprint` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ticket_events_ticket_revision` ON `ticket_events` (`ticket_id`,`revision`);