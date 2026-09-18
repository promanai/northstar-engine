CREATE TABLE `booking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`revision` integer NOT NULL,
	`slot_id` text,
	`starts_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_booking_events_booking_revision` ON `booking_events` (`booking_id`,`revision`);--> statement-breakpoint
CREATE TABLE `booking_resources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`time_zone` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`product_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`available` integer DEFAULT 1 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`resource_id`) REFERENCES `booking_resources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_slots_resource_start` ON `booking_slots` (`resource_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_slots_product_start` ON `booking_slots` (`product_id`,`starts_at`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `slot_id` text REFERENCES booking_slots(id);--> statement-breakpoint
ALTER TABLE `bookings` ADD `product_id` text REFERENCES products(id);--> statement-breakpoint
ALTER TABLE `bookings` ADD `ends_at` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `time_zone` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `resource_name` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `price` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `currency` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `customer_note` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `request_hash` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `mutation_id` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_request` ON `bookings` (`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_active_slot` ON `bookings` (`slot_id`) WHERE "bookings"."status" = 'confirmed';--> statement-breakpoint
CREATE INDEX `idx_bookings_customer_start` ON `bookings` (`customer_id`,`starts_at`);