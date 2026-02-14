PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_picks` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`prop_id` text NOT NULL,
	`selected_option_index` integer NOT NULL,
	`points_earned` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prop_id`) REFERENCES `props`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_picks`("id", "player_id", "prop_id", "selected_option_index", "points_earned", "created_at", "updated_at") SELECT "id", "player_id", "prop_id", "selected_option_index", "points_earned", "created_at", "updated_at" FROM `picks`;--> statement-breakpoint
DROP TABLE `picks`;--> statement-breakpoint
ALTER TABLE `__new_picks` RENAME TO `picks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_picks_player_prop` ON `picks` (`player_id`,`prop_id`);--> statement-breakpoint
CREATE INDEX `idx_picks_player` ON `picks` (`player_id`);--> statement-breakpoint
CREATE INDEX `idx_picks_prop` ON `picks` (`prop_id`);--> statement-breakpoint
CREATE TABLE `__new_players` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`name` text NOT NULL,
	`secret` text NOT NULL,
	`total_points` integer DEFAULT 0 NOT NULL,
	`paid` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`joined_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_players`("id", "pool_id", "name", "secret", "total_points", "paid", "status", "joined_at", "updated_at") SELECT "id", "pool_id", "name", "secret", "total_points", "paid", "status", "joined_at", "updated_at" FROM `players`;--> statement-breakpoint
DROP TABLE `players`;--> statement-breakpoint
ALTER TABLE `__new_players` RENAME TO `players`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_players_pool_name` ON `players` (`pool_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_players_pool` ON `players` (`pool_id`);--> statement-breakpoint
CREATE INDEX `idx_players_pool_secret` ON `players` (`pool_id`,`secret`);--> statement-breakpoint
CREATE TABLE `__new_props` (
	`id` text PRIMARY KEY NOT NULL,
	`pool_id` text NOT NULL,
	`question_text` text NOT NULL,
	`options` text NOT NULL,
	`point_value` integer NOT NULL,
	`correct_option_index` integer,
	`category` text,
	`status` text DEFAULT 'active' NOT NULL,
	`order` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_props`("id", "pool_id", "question_text", "options", "point_value", "correct_option_index", "category", "status", "order", "created_at", "updated_at") SELECT "id", "pool_id", "question_text", "options", "point_value", "correct_option_index", "category", "status", "order", "created_at", "updated_at" FROM `props`;--> statement-breakpoint
DROP TABLE `props`;--> statement-breakpoint
ALTER TABLE `__new_props` RENAME TO `props`;--> statement-breakpoint
CREATE INDEX `idx_props_pool` ON `props` (`pool_id`);--> statement-breakpoint
CREATE INDEX `idx_props_pool_order` ON `props` (`pool_id`,`order`);--> statement-breakpoint
CREATE TABLE `__new_recovery_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`player_id` text NOT NULL,
	`pool_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pool_id`) REFERENCES `pools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_recovery_tokens`("id", "token", "player_id", "pool_id", "expires_at", "used_at", "created_at") SELECT "id", "token", "player_id", "pool_id", "expires_at", "used_at", "created_at" FROM `recovery_tokens`;--> statement-breakpoint
DROP TABLE `recovery_tokens`;--> statement-breakpoint
ALTER TABLE `__new_recovery_tokens` RENAME TO `recovery_tokens`;--> statement-breakpoint
CREATE UNIQUE INDEX `recovery_tokens_token_unique` ON `recovery_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_recovery_tokens_token` ON `recovery_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `idx_recovery_tokens_pool` ON `recovery_tokens` (`pool_id`);--> statement-breakpoint
CREATE INDEX `idx_recovery_tokens_player` ON `recovery_tokens` (`player_id`);--> statement-breakpoint
CREATE INDEX `idx_recovery_tokens_expires` ON `recovery_tokens` (`expires_at`);