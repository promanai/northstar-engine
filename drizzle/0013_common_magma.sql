CREATE TABLE `customer_revisions` (
	`customer_id` text NOT NULL,
	`revision` integer NOT NULL,
	`snapshot` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`token_id` text,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_customer_revisions` ON `customer_revisions` (`customer_id`,`revision`);--> statement-breakpoint
ALTER TABLE `users` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mutation_id` text;