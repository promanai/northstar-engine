ALTER TABLE `messages` ADD `file_id` text REFERENCES files(id);--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversation_id`,`created_at`,`id`);