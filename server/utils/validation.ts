import { z } from 'zod'

export const TournamentSettingsSchema = z.record(z.string(), z.unknown())

export const CreateTournamentSchema = z.object({
  name: z.string().min(1),
  settings: TournamentSettingsSchema.optional(),
})

export const JoinTournamentSchema = z.object({
  tournamentId: z.string().min(1),
})

export const CreateTeamSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1).optional(),
})

export const UpdateTeamSchema = z.object({
  teamId: z.string().min(1),
  patch: z
    .object({
      name: z.string().min(1).optional(),
      color: z.string().min(1).optional().nullable(),
    })
    .strict(),
})

export const DeleteTeamSchema = z.object({
  teamId: z.string().min(1),
})

export const ImportTeamsSchema = z.object({
  tournamentId: z.string().min(1),
  csv: z.string().min(1),
})

// Player schemas
export const ListPlayersSchema = z.object({
  teamId: z.string().min(1),
})

export const CreatePlayerSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
})

export const UpdatePlayerSchema = z.object({
  playerId: z.string().min(1),
  patch: z.object({
    name: z.string().min(1).optional(),
  }).strict(),
})

export const DeletePlayerSchema = z.object({
  playerId: z.string().min(1),
  teamId: z.string().min(1).optional(), // For broadcast
})

export const ScoreIncrementSchema = z.object({
  matchId: z.string().min(1),
  team: z.enum(['team1', 'team2']),
})

export const ScoreDecrementSchema = ScoreIncrementSchema

export const SetAwardSchema = z.object({
  matchId: z.string().min(1),
  team: z.enum(['team1', 'team2']),
})

export const SetUndoSchema = z.object({
  matchId: z.string().min(1),
})

export const TimerUpdateSchema = z.object({
  matchId: z.string().min(1),
  timeSeconds: z.number().min(0),
})

export const MatchStartSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
})

export const MatchEndSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
})

export const MatchResetSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
})

export const ScoreSetDirectSchema = z.object({
  matchId: z.string().min(1),
  team1Points: z.number().min(0),
  team2Points: z.number().min(0),
})

export const SetScoreEditSchema = z.object({
  matchId: z.string().min(1),
  setIndex: z.number().min(0),
  t1: z.number().min(0),
  t2: z.number().min(0),
})
