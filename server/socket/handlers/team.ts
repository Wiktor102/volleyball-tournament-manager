import type { Server, Socket } from 'socket.io'
import { CreateTeamSchema, DeleteTeamSchema, UpdateTeamSchema } from '../../utils/validation'
import { getTournamentState } from '../../services/state.service'
import { createTeam, deleteTeam, updateTeam } from '../../services/team.service'

export function registerTeamHandlers(io: Server, socket: Socket) {
  socket.on('admin:team:create', async (payload, ack) => {
    const parsed = CreateTeamSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const team = await createTeam(parsed.data.tournamentId, {
      name: parsed.data.name,
      shortName: parsed.data.shortName,
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
}
