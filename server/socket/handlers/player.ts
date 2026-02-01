import type { Server, Socket } from 'socket.io'
import { CreatePlayerSchema, UpdatePlayerSchema, DeletePlayerSchema, ListPlayersSchema } from '../../utils/validation'
import { createPlayer, deletePlayer, listPlayersByTeam, updatePlayer } from '../../services/player.service'
import { getTeam } from '../../services/team.service'

export function registerPlayerHandlers(io: Server, socket: Socket) {
  socket.on('player:list', async (payload, ack) => {
    const parsed = ListPlayersSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const players = await listPlayersByTeam(parsed.data.teamId)
    return ack?.({ ok: true, data: players })
  })

  socket.on('admin:player:create', async (payload, ack) => {
    const parsed = CreatePlayerSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    // Verify team exists
    const team = await getTeam(parsed.data.teamId)
    if (!team) return ack?.({ ok: false, error: 'Nie znaleziono drużyny' })

    const player = await createPlayer(parsed.data)
    io.to(`tournament:${team.tournamentId}`).emit('player:created', player)
    return ack?.({ ok: true, data: player })
  })

  socket.on('admin:player:update', async (payload, ack) => {
    const parsed = UpdatePlayerSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const updated = await updatePlayer(parsed.data.playerId, parsed.data.patch)
    if (!updated) return ack?.({ ok: false, error: 'Nie znaleziono zawodnika' })

    // Get team to find tournament for broadcast
    const team = await getTeam(updated.teamId)
    if (team) {
      io.to(`tournament:${team.tournamentId}`).emit('player:updated', updated)
    }
    return ack?.({ ok: true, data: updated })
  })

  socket.on('admin:player:delete', async (payload, ack) => {
    const parsed = DeletePlayerSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    // Get player info before deleting for broadcast
    const { playerId, teamId } = parsed.data
    const team = teamId ? await getTeam(teamId) : null

    const deleted = await deletePlayer(playerId)
    if (!deleted) return ack?.({ ok: false, error: 'Nie znaleziono zawodnika' })

    if (team) {
      io.to(`tournament:${team.tournamentId}`).emit('player:deleted', { playerId, teamId })
    }
    return ack?.({ ok: true })
  })
}
