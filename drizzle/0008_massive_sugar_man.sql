CREATE TABLE `booking_payment_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_url` text,
	`provider_payment_id` text,
	`event_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_payment_intents_booking_id_unique` ON `booking_payment_intents` (`booking_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `booking_payment_intents_event_id_unique` ON `booking_payment_intents` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_booking_payment_status_expiry` ON `booking_payment_intents` (`status`,`expires_at`);--> statement-breakpoint
DROP INDEX `idx_bookings_active_slot`;--> statement-breakpoint
ALTER TABLE `bookings` ADD `payment_status` text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `hold_expires_at` integer;--> statement-breakpoint
CREATE INDEX `idx_bookings_payment_hold` ON `bookings` (`status`,`hold_expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_active_slot` ON `bookings` (`slot_id`) WHERE "bookings"."status" IN ('confirmed', 'pending_payment');