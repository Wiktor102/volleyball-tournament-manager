import { eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { tournaments } from '../db/schema'
import { id } from '../utils/id'

export type Tournament = {
  id: string
  name: string
  status: 'draft' | 'live' | 'completed'
  settings: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

type TournamentRow = InferSelectModel<typeof tournaments>

function rowToTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    name: row.name,
    status: row.status as Tournament['status'],
    settings: JSON.parse(row.settingsJson ?? '{}'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  const rows = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId))
  return rows[0] ? rowToTournament(rows[0]) : null
}

export async function createTournament(input: { name: string; settings?: Record<string, unknown> }) {
  const now = Date.now()
  const tournamentId = id('t')
  await db.insert(tournaments).values({
    id: tournamentId,
    name: input.name,
    status: 'draft',
    settingsJson: JSON.stringify(input.settings ?? {}),
    createdAt: now,
    updatedAt: now,
  })
  const t = await getTournament(tournamentId)
  if (!t) throw new Error('Failed to create tournament')
  return t
}

export async function updateTournament(
  tournamentId: string,
  patch: Partial<Pick<Tournament, 'name' | 'status' | 'settings'>>,
) {
  const now = Date.now()
  const existing = await getTournament(tournamentId)
  if (!existing) return null
  const next = {
    name: patch.name ?? existing.name,
    status: patch.status ?? existing.status,
    settingsJson: JSON.stringify(patch.settings ?? existing.settings),
  }
  await db
    .update(tournaments)
    .set({
      name: next.name,
      status: next.status,
      settingsJson: next.settingsJson,
      updatedAt: now,
    })
    .where(eq(tournaments.id, tournamentId))
  return await getTournament(tournamentId)
}

export async function getOrCreateDefaultTournament() {
  const rows = await db.select().from(tournaments).limit(1)
  if (rows[0]) return rowToTournament(rows[0])
  return await createTournament({ name: 'Turniej siatkówki' })
}
