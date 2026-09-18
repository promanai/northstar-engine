CREATE TABLE `chat_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`conversation_id` text NOT NULL,
	`state` text NOT NULL,
	`lease_until` integer NOT NULL,
	`response` text,
	`http_status` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chat_requests_pending_conversation` ON `chat_requests` (`conversation_id`) WHERE "chat_requests"."state" = 'pending';