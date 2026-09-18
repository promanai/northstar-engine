CREATE TABLE `booking_payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`intent_id` text NOT NULL,
	`status` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`intent_id`) REFERENCES `booking_payment_intents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_booking_payment_events_intent` ON `booking_payment_events` (`intent_id`,`created_at`);