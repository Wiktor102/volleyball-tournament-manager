import type { Server, Socket } from 'socket.io'
import { CreateTeamSchema, DeleteTeamSchema, ImportTeamsSchema, UpdateTeamSchema } from '../../utils/validation'
import { getTournamentState } from '../../services/state.service'
import { createTeam, deleteTeam, updateTeam } from '../../services/team.service'
import { createPlayer } from '../../services/player.service'

type ImportedTeam = { name: string; players: string[] }

function parseImportCsv(csv: string): ImportedTeam[] {
  const result: ImportedTeam[] = []
  let current: ImportedTeam | null = null

  for (const rawLine of csv.split('\n')) {
    const cols = rawLine.split(';').map(c => c.trim())

    // Empty line — end of current team block
    if (cols.every(c => c === '')) {
      current = null
      continue
    }

    const first = cols[0]
    const second = cols[1] ?? ''
    const third = cols[2] ?? ''

    // Team header: first col non-empty, second/third empty (or only trailing semicolons)
    if (first && !second && !third) {
      current = { name: first, players: [] }
      result.push(current)
      continue
    }

    // Player row: first col is role (Kapitan / Zawodnik N), second is first name, third is last name
    if (current && first && second) {
      const playerName = third ? `${second} ${third}` : second
      current.players.push(playerName)
    }
  }

  return result
}

export function registerTeamHandlers(io: Server, socket: Socket) {
  socket.on('admin:team:create', async (payload, ack) => {
    const parsed = CreateTeamSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const team = await createTeam(parsed.data.tournamentId, {
      name: parsed.data.name,
      color: parsed.data.color,
    })

    io.to(`tournament:${team.tournamentId}`).emit('team:updated', team)

    const state = await getTournamentState(team.tournamentId)
    if (state) io.to(`tournament:${team.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: team })
  })

  socket.on('admin:team:update', async (payload, ack) => {
    const parsed = UpdateTeamSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const updated = await updateTeam(parsed.data.teamId, parsed.data.patch)
    if (!updated) return ack?.({ ok: false, error: 'Nie znaleziono drużyny' })

    io.to(`tournament:${updated.tournamentId}`).emit('team:updated', updated)

    const state = await getTournamentState(updated.tournamentId)
    if (state) io.to(`tournament:${updated.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: updated })
  })

  socket.on('admin:team:delete', async (payload, ack) => {
    const parsed = DeleteTeamSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const removed = await deleteTeam(parsed.data.teamId)
    if (!removed) return ack?.({ ok: false, error: 'Nie znaleziono drużyny' })

    io.to(`tournament:${removed.tournamentId}`).emit('team:deleted', { teamId: removed.id })

    const state = await getTournamentState(removed.tournamentId)
    if (state) io.to(`tournament:${removed.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: { teamId: removed.id } })
  })

  socket.on('admin:teams:import', async (payload, ack) => {
    const parsed = ImportTeamsSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const { tournamentId, csv } = parsed.data
    const imported = parseImportCsv(csv)

    if (imported.length === 0) return ack?.({ ok: false, error: 'Nie znaleziono drużyn w pliku' })

    const createdTeams = []
    for (const entry of imported) {
      const team = await createTeam(tournamentId, { name: entry.name })
      for (const playerName of entry.players) {
        await createPlayer({ teamId: team.id, name: playerName })
      }
      createdTeams.push(team)
    }

    const state = await getTournamentState(tournamentId)
    if (state) io.to(`tournament:${tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: { count: createdTeams.length } })
  })
}
