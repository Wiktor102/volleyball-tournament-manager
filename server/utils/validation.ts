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
  shortName: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
})

export const UpdateTeamSchema = z.object({
  teamId: z.string().min(1),
  patch: z
    .object({
      name: z.string().min(1).optional(),
      shortName: z.string().min(1).optional().nullable(),
      color: z.string().min(1).optional().nullable(),
    })
    .strict(),
})

export const DeleteTeamSchema = z.object({
  teamId: z.string().min(1),
})

export const ScoreIncrementSchema = z.object({
  matchId: z.string().min(1),
  team: z.enum(['team1', 'team2']),
})

export const ScoreDecrementSchema = ScoreIncrementSchema
