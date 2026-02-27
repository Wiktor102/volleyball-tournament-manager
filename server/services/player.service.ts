import { eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { players } from '../db/schema'
import { id } from '../utils/id'

export type Player = {
  id: string
  teamId: string
  name: string
  jerseyNumber: number | null
  position: string | null
  createdAt: number
}

type PlayerRow = InferSelectModel<typeof players>

function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    jerseyNumber: row.jerseyNumber ?? null,
    position: row.position ?? null,
    createdAt: row.createdAt,
  }
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const rows = await db.select().from(players).where(eq(players.id, playerId))
  return rows[0] ? rowToPlayer(rows[0]) : null
}

export async function listPlayersByTeam(teamId: string): Promise<Player[]> {
  const rows = await db.select().from(players).where(eq(players.teamId, teamId))
  return rows.map(rowToPlayer)
}

export async function createPlayer(input: {
  teamId: string
  name: string
  jerseyNumber?: number | null
  position?: string | null
}): Promise<Player> {
  const now = Date.now()
  const playerId = id('p')
  await db.insert(players).values({
    id: playerId,
    teamId: input.teamId,
    name: input.name,
    jerseyNumber: input.jerseyNumber ?? null,
    position: input.position ?? null,
    createdAt: now,
  })
  const p = await getPlayer(playerId)
  if (!p) throw new Error('Failed to create player')
  return p
}

export async function updatePlayer(
  playerId: string,
  patch: { name?: string; jerseyNumber?: number | null; position?: string | null },
): Promise<Player | null> {
  const existing = await getPlayer(playerId)
  if (!existing) return null

  const updates: Partial<{ name: string; jerseyNumber: number | null; position: string | null }> = {}
  if (patch.name !== undefined) updates.name = patch.name
  if (patch.jerseyNumber !== undefined) updates.jerseyNumber = patch.jerseyNumber
  if (patch.position !== undefined) updates.position = patch.position

  if (Object.keys(updates).length > 0) {
    await db.update(players).set(updates).where(eq(players.id, playerId))
  }

  return await getPlayer(playerId)
}

export async function deletePlayer(playerId: string): Promise<boolean> {
  const existing = await getPlayer(playerId)
  if (!existing) return false

  await db.delete(players).where(eq(players.id, playerId))
  return true
}

export async function deletePlayersByTeam(teamId: string): Promise<void> {
  await db.delete(players).where(eq(players.teamId, teamId))
}
