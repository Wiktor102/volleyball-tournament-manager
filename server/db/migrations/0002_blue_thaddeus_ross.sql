CREATE TABLE `match_events` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`tournament_id` text NOT NULL,
	`event_type` text NOT NULL,
	`team` text NOT NULL,
	`player_id` text,
	`set_number` integer NOT NULL,
	`score_snapshot` text,
	`metadata` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `players` ADD `jersey_number` integer;--> statement-breakpoint
ALTER TABLE `players` ADD `position` text;