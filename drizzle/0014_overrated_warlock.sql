CREATE TABLE `ai_request_budget` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL,
	`month` text NOT NULL,
	`day_requests` integer NOT NULL,
	`month_requests` integer NOT NULL
);
