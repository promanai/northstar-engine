CREATE TABLE `order_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`actor_id` text,
	`status` text NOT NULL,
	`note` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_order_events_order_created` ON `order_events` (`order_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `orders` ADD `product_title` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `unit_price` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `request_hash` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `mutation_id` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_key_unique` ON `orders` (`request_key`);--> statement-breakpoint
CREATE INDEX `idx_orders_customer_created` ON `orders` (`customer_id`,`created_at`);