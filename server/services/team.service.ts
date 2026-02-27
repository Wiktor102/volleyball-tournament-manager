import { eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { teams } from '../db/schema'
import { id } from '../utils/id'

export type Team = {
  id: string
  tournamentId: string
  name: string
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
    color: row.color ?? null,
    seed: row.seed ?? null,
    eliminated: !!row.eliminated,
  }
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const rows = await db.select().from(teams).where(eq(teams.id, teamId))
  return rows[0] ? rowToTeam(rows[0]) : null
}

export async function listTeams(tournamentId: string): Promise<Team[]> {
  const rows = await db.select().from(teams).where(eq(teams.tournamentId, tournamentId))
  return rows.map(rowToTeam)
}

export async function createTeam(tournamentId: string, input: { name: string; color?: string }) {
  const now = Date.now()
  const teamId = id('team')
  await db.insert(teams).values({
    id: teamId,
    tournamentId,
    name: input.name,
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

export async function updateTeam(
  teamId: string,
  patch: Partial<Pick<Team, 'name' | 'color'>>,
): Promise<Team | null> {
  const now = Date.now()
  const existing = await getTeam(teamId)
  if (!existing) return null

  await db
    .update(teams)
    .set({
      name: patch.name ?? existing.name,
      color: patch.color ?? existing.color,
      updatedAt: now,
    })
    .where(eq(teams.id, teamId))

  return await getTeam(teamId)
}

export async function deleteTeam(teamId: string): Promise<Team | null> {
  const existing = await getTeam(teamId)
  if (!existing) return null
  await db.delete(teams).where(eq(teams.id, teamId))
  return existing
}
