import { eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { teams } from '../db/schema'
import { id } from '../utils/id'

export type Team = {
  id: string
  tournamentId: string
  name: string
  shortName: string | null
  color: string | null
  seed: number | null
  eliminated: boolean
}

type TeamRow = InferSelectModel<typeof teams>

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    tournamentId: row.tournamentId,
    name: row.name,
    shortName: row.shortName ?? null,
    color: row.color ?? null,
    seed: row.seed ?? null,
    eliminated: !!row.eliminated,
  }
}

export async function listTeams(tournamentId: string): Promise<Team[]> {
  const rows = await db.select().from(teams).where(eq(teams.tournamentId, tournamentId))
  return rows.map(rowToTeam)
}

export async function createTeam(tournamentId: string, input: { name: string; shortName?: string; color?: string }) {
  const now = Date.now()
  const teamId = id('team')
  await db.insert(teams).values({
    id: teamId,
    tournamentId,
    name: input.name,
    shortName: input.shortName ?? null,
    color: input.color ?? null,
    seed: null,
    eliminated: false,
    createdAt: now,
    updatedAt: now,
  })
  const rows = await db.select().from(teams).where(eq(teams.id, teamId))
  if (!rows[0]) throw new Error('Failed to create team')
  return rowToTeam(rows[0])
}

export async function getOrCreateDemoTeams(tournamentId: string) {
  const existing = await listTeams(tournamentId)
  if (existing.length >= 2) return existing.slice(0, 2)

  const a = await createTeam(tournamentId, { name: 'Drużyna 1', shortName: 'D1', color: '#FF6B35' })
  const b = await createTeam(tournamentId, { name: 'Drużyna 2', shortName: 'D2', color: '#1E3A5F' })
  return [a, b]
}
