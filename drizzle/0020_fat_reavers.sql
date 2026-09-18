CREATE TABLE `booking_notifications` (
	`event_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`lease_id` text,
	`lease_until` integer,
	`sent_at` integer,
	`message_id` integer,
	`last_error` text,
	FOREIGN KEY (`event_id`) REFERENCES `booking_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_booking_notifications_due` ON `booking_notifications` (`status`,`next_attempt_at`);
--> statement-breakpoint
-- Queue only new events in the booking transaction; do not backfill history.
CREATE TRIGGER booking_events_notification AFTER INSERT ON booking_events
BEGIN
  INSERT INTO booking_notifications (event_id, next_attempt_at) VALUES (NEW.id, NEW.created_at);
END;
