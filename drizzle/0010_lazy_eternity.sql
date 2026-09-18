CREATE TABLE `page_revisions` (
	`page_id` text NOT NULL,
	`revision` integer NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`token_id` text,
	`source` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_page_revisions_page_revision` ON `page_revisions` (`page_id`,`revision`);--> statement-breakpoint
ALTER TABLE `pages` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `pages` ADD `mutation_id` text;