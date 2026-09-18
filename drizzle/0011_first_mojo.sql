CREATE TABLE `site_document_revisions` (
	`document_key` text NOT NULL,
	`revision` integer NOT NULL,
	`value` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`token_id` text,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	`restored_from` integer,
	FOREIGN KEY (`document_key`) REFERENCES `site_documents`(`key`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_document_revisions_key_revision` ON `site_document_revisions` (`document_key`,`revision`);--> statement-breakpoint
CREATE TABLE `site_documents` (
	`key` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`value` text NOT NULL,
	`mutation_id` text
);
