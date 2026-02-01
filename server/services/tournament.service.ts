import { eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { tournaments, teams, bracketMatches, matchScores } from '../db/schema'
import { id } from '../utils/id'

export type ScoringSettings = {
  mode: 'sets' | 'points' | 'timed'
  setsToWin: number
  pointsToWinSet: number
  pointsToWinTieBreak: number
  mustWinByTwo: boolean
}

export type TournamentSettings = {
  scoring: ScoringSettings
}

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  mode: 'sets',
  setsToWin: 2,
  pointsToWinSet: 25,
  pointsToWinTieBreak: 15,
  mustWinByTwo: true,
}

export type Tournament = {
  id: string
  name: string
  status: 'draft' | 'live' | 'completed'
  settings: TournamentSettings
  createdAt: number
  updatedAt: number
}

type TournamentRow = InferSelectModel<typeof tournaments>

function rowToTournament(row: TournamentRow): Tournament {
  const rawSettings = JSON.parse(row.settingsJson ?? '{}')
  // Ensure scoring settings have proper defaults
  const settings: TournamentSettings = {
    scoring: {
      ...DEFAULT_SCORING_SETTINGS,
      ...(rawSettings.scoring ?? {}),
    },
  }
  return {
    id: row.id,
    name: row.name,
    status: row.status as Tournament['status'],
    settings,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId))
  return rows[0] ? rowToTournament(rows[0]) : null
}

export async function createTournament(input: { name: string; settings?: Partial<TournamentSettings> }) {
  const now = Date.now()
  const tournamentId = id('t')
  const settings: TournamentSettings = {
    scoring: {
      ...DEFAULT_SCORING_SETTINGS,
      ...(input.settings?.scoring ?? {}),
    },
  }
  await db.insert(tournaments).values({
    id: tournamentId,
    name: input.name,
    status: 'draft',
    settingsJson: JSON.stringify(settings),
    createdAt: now,
    updatedAt: now,
  })
  const t = await getTournament(tournamentId)
  if (!t) throw new Error('Failed to create tournament')
  return t
}

export async function updateTournament(
  tournamentId: string,
  patch: Partial<Pick<Tournament, 'name' | 'status'>> & { settings?: Partial<TournamentSettings> },
) {
  const now = Date.now()
  const existing = await getTournament(tournamentId)
  if (!existing) return null

  // Deep merge settings
  const mergedSettings: TournamentSettings = {
    scoring: {
      ...existing.settings.scoring,
      ...(patch.settings?.scoring ?? {}),
    },
  }

  await db
    .update(tournaments)
    .set({
      name: patch.name ?? existing.name,
      status: patch.status ?? existing.status,
      settingsJson: JSON.stringify(mergedSettings),
      updatedAt: now,
    })
    .where(eq(tournaments.id, tournamentId))
  return await getTournament(tournamentId)
}

export async function listTournaments(): Promise<Tournament[]> {
  const rows = await db.select().from(tournaments).orderBy(tournaments.createdAt)
  return rows.map(rowToTournament)
}

export async function deleteTournament(tournamentId: string): Promise<boolean> {
  const existing = await getTournament(tournamentId)
  if (!existing) return false

  // Delete in order: matchScores -> bracketMatches -> teams -> tournament
  const matchRows = await db.select({ id: bracketMatches.id }).from(bracketMatches).where(eq(bracketMatches.tournamentId, tournamentId))
  for (const m of matchRows) {
    await db.delete(matchScores).where(eq(matchScores.matchId, m.id))
  }
  await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, tournamentId))
  await db.delete(teams).where(eq(teams.tournamentId, tournamentId))
  await db.delete(tournaments).where(eq(tournaments.id, tournamentId))

  return true
}

export async function getOrCreateDefaultTournament() {
  const rows = await db.select().from(tournaments).limit(1)
  if (rows[0]) return rowToTournament(rows[0])
  return await createTournament({ name: 'Turniej siatkówki' })
}
