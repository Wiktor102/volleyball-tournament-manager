import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'),
  settingsJson: text('settings_json').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  color: text('color'),
  seed: integer('seed'),
  eliminated: integer('eliminated', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
})

export const bracketMatches = sqliteTable('bracket_matches', {
  id: text('id').primaryKey(),
  tournamentId: text('tournament_id').notNull(),
  roundNumber: integer('round_number').notNull(),
  matchNumber: integer('match_number').notNull(),
  positionInRound: integer('position_in_round').notNull(),
  team1Id: text('team1_id'),
  team2Id: text('team2_id'),
  winnerId: text('winner_id'),
  status: text('status').notNull().default('pending'),
  isThirdPlaceMatch: integer('is_third_place_match', { mode: 'boolean' }).notNull().default(false),
  nextMatchId: text('next_match_id'),
  scheduledTime: integer('scheduled_time'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const matchScores = sqliteTable('match_scores', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().unique(),
  scoringModeJson: text('scoring_mode_json').notNull(),
  team1Sets: integer('team1_sets').notNull().default(0),
  team2Sets: integer('team2_sets').notNull().default(0),
  currentSet: integer('current_set').notNull().default(1),
  setsToWin: integer('sets_to_win').notNull().default(2),
  setScoresJson: text('set_scores_json').notNull().default('[]'),
  team1CurrentPoints: integer('team1_current_points').notNull().default(0),
  team2CurrentPoints: integer('team2_current_points').notNull().default(0),
  matchTimeSeconds: integer('match_time_seconds').notNull().default(0),
  startedAt: integer('started_at'),
  endedAt: integer('ended_at'),
  updatedAt: integer('updated_at').notNull(),
})
