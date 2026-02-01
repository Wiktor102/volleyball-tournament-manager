CREATE TABLE `bracket_matches` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`round_number` integer NOT NULL,
	`match_number` integer NOT NULL,
	`position_in_round` integer NOT NULL,
	`team1_id` text,
	`team2_id` text,
	`winner_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`is_third_place_match` integer DEFAULT false NOT NULL,
	`next_match_id` text,
	`scheduled_time` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `match_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`match_id` text NOT NULL,
	`scoring_mode_json` text NOT NULL,
	`team1_sets` integer DEFAULT 0 NOT NULL,
	`team2_sets` integer DEFAULT 0 NOT NULL,
	`current_set` integer DEFAULT 1 NOT NULL,
	`sets_to_win` integer DEFAULT 2 NOT NULL,
	`set_scores_json` text DEFAULT '[]' NOT NULL,
	`team1_current_points` integer DEFAULT 0 NOT NULL,
	`team2_current_points` integer DEFAULT 0 NOT NULL,
	`match_time_seconds` integer DEFAULT 0 NOT NULL,
	`started_at` integer,
	`ended_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_scores_match_id_unique` ON `match_scores` (`match_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`tournament_id` text NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`color` text,
	`seed` integer,
	`eliminated` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`settings_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
