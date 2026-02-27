import type { Server, Socket } from 'socket.io'
import {
  LogEventSchema,
  DeleteEventSchema,
  ClearMatchEventsSchema,
  GetMatchEventsSchema,
  GetTeamStatsSchema,
  GetPlayerStatsSchema,
} from '../../utils/validation'
import {
  logEvent,
  deleteEvent,
  clearMatchEvents,
  getMatchEvents,
  getMatchStats,
  getTeamStats,
  getPlayerStats,
} from '../../services/event.service'

export function registerEventHandlers(io: Server, socket: Socket) {
  socket.on('admin:event:log', async (payload, ack) => {
    const parsed = LogEventSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const event = await logEvent(parsed.data)
    io.to(`match:${event.matchId}`).emit('match:event', event)
    io.to(`tournament:${event.tournamentId}`).emit('match:event', event)
    return ack?.({ ok: true, data: event })
  })

  socket.on('admin:event:delete', async (payload, ack) => {
    const parsed = DeleteEventSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const found = await deleteEvent(parsed.data.eventId)
    if (!found) return ack?.({ ok: false, error: 'Event not found' })

    // We only have eventId here, broadcast to room requires matchId — emit on all sockets
    // The client must track which match the event belonged to, or re-query after deletion
    io.emit('match:event:deleted', { eventId: parsed.data.eventId })
    return ack?.({ ok: true })
  })

  socket.on('admin:event:clear', async (payload, ack) => {
    const parsed = ClearMatchEventsSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const count = await clearMatchEvents(parsed.data.matchId)
    io.to(`match:${parsed.data.matchId}`).emit('match:events:cleared', { matchId: parsed.data.matchId, count })
    return ack?.({ ok: true, count })
  })

  socket.on('stats:match:get', async (payload, ack) => {
    const parsed = GetMatchEventsSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const [events, stats] = await Promise.all([
      getMatchEvents(parsed.data.matchId),
      getMatchStats(parsed.data.matchId),
    ])
    return ack?.({ ok: true, data: { events, stats } })
  })

  socket.on('stats:team:get', async (payload, ack) => {
    const parsed = GetTeamStatsSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const stats = await getTeamStats(parsed.data.tournamentId, parsed.data.teamId)
    return ack?.({ ok: true, data: stats })
  })

  socket.on('stats:player:get', async (payload, ack) => {
    const parsed = GetPlayerStatsSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const playerStats = await getPlayerStats(parsed.data.tournamentId, parsed.data.playerId)
    return ack?.({ ok: true, data: playerStats })
  })
}
