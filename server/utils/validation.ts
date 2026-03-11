import { z } from "zod";

export const TournamentSettingsSchema = z.record(z.string(), z.unknown());

export const CreateTournamentSchema = z.object({
	name: z.string().min(1),
	settings: TournamentSettingsSchema.optional()
});

export const JoinTournamentSchema = z.object({
	tournamentId: z.string().min(1)
});

export const SetBallsOnBalconySchema = z.object({
	tournamentId: z.string().min(1),
	value: z.number().int().min(0)
});

export const CreateTeamSchema = z.object({
	tournamentId: z.string().min(1),
	name: z.string().min(1),
	color: z.string().min(1).optional()
});

export const UpdateTeamSchema = z.object({
	teamId: z.string().min(1),
	patch: z
		.object({
			name: z.string().min(1).optional(),
			color: z.string().min(1).optional().nullable()
		})
		.strict()
});

export const DeleteTeamSchema = z.object({
	teamId: z.string().min(1)
});

export const ImportTeamsSchema = z.object({
	tournamentId: z.string().min(1),
	csv: z.string().min(1)
});

// Player schemas
export const ListPlayersSchema = z.object({
	teamId: z.string().min(1)
});

export const CreatePlayerSchema = z.object({
	teamId: z.string().min(1),
	name: z.string().min(1)
});

export const UpdatePlayerSchema = z.object({
	playerId: z.string().min(1),
	patch: z
		.object({
			name: z.string().min(1).optional(),
			jerseyNumber: z.number().int().min(0).max(99).nullable().optional(),
			position: z.enum(["setter", "libero", "outside", "middle", "opposite", "universal"]).nullable().optional()
		})
		.strict()
});

export const DeletePlayerSchema = z.object({
	playerId: z.string().min(1),
	teamId: z.string().min(1).optional() // For broadcast
});

export const ScoreIncrementSchema = z.object({
	matchId: z.string().min(1),
	team: z.enum(["team1", "team2"])
});

export const ScoreDecrementSchema = ScoreIncrementSchema;

export const SetAwardSchema = z.object({
	matchId: z.string().min(1),
	team: z.enum(["team1", "team2"])
});

export const SetUndoSchema = z.object({
	matchId: z.string().min(1)
});

export const TimerUpdateSchema = z.object({
	matchId: z.string().min(1),
	timeSeconds: z.number().min(0)
});

export const MatchStartSchema = z.object({
	tournamentId: z.string().min(1),
	matchId: z.string().min(1)
});

export const MatchEndSchema = z.object({
	tournamentId: z.string().min(1),
	matchId: z.string().min(1),
	winnerId: z.string().min(1)
});

export const MatchResetSchema = z.object({
	tournamentId: z.string().min(1),
	matchId: z.string().min(1)
});

export const ScoreSetDirectSchema = z.object({
	matchId: z.string().min(1),
	team1Points: z.number().min(0),
	team2Points: z.number().min(0)
});

export const SetScoreEditSchema = z.object({
	matchId: z.string().min(1),
	setIndex: z.number().min(0),
	t1: z.number().min(0),
	t2: z.number().min(0)
});

// Event schemas
export const LogEventSchema = z.object({
	matchId: z.string(),
	tournamentId: z.string(),
	eventType: z.enum(["ace", "ball-out", "challenge", "net-touch", "block", "timeout"]),
	team: z.enum(["team1", "team2"]),
	// Client may send `null` when no player is selected.
	playerId: z.string().nullable().optional(),
	setNumber: z.number().int().min(1),
	scoreSnapshot: z
		.object({
			team1Points: z.number().int(),
			team2Points: z.number().int(),
			team1Sets: z.number().int(),
			team2Sets: z.number().int()
		})
		.optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
});

export const DeleteEventSchema = z.object({
	eventId: z.string()
});

export const ClearMatchEventsSchema = z.object({
	matchId: z.string()
});

export const GetMatchEventsSchema = z.object({
	matchId: z.string()
});

export const GetTeamStatsSchema = z.object({
	tournamentId: z.string(),
	teamId: z.string()
});

export const GetPlayerStatsSchema = z.object({
	tournamentId: z.string(),
	playerId: z.string().optional()
});

// Challenge schemas
export const ChallengeStartSchema = z.object({
	matchId: z.string().min(1),
	team: z.enum(["team1", "team2"]),
	reason: z.string().optional()
});

export const ChallengeResolveSchema = z.object({
	matchId: z.string().min(1),
	result: z.enum(["successful", "failed"])
});
