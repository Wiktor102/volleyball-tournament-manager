import { z } from 'zod'

export const TournamentSettingsSchema = z.record(z.string(), z.unknown())

export const CreateTournamentSchema = z.object({
  name: z.string().min(1),
  settings: TournamentSettingsSchema.optional(),
})

export const JoinTournamentSchema = z.object({
  tournamentId: z.string().min(1),
})

export const ScoreIncrementSchema = z.object({
  matchId: z.string().min(1),
  team: z.enum(['team1', 'team2']),
})

export const ScoreDecrementSchema = ScoreIncrementSchema
