import type { Server, Socket } from 'socket.io'
import { CreateTournamentSchema, JoinTournamentSchema } from '../../utils/validation'
import { getTournamentState } from '../../services/state.service'
import { createTournament, getOrCreateDefaultTournament, getTournament, updateTournament } from '../../services/tournament.service'

export function registerTournamentHandlers(io: Server, socket: Socket) {
  socket.on('tournament:join', async (payload, ack) => {
    const parsed = JoinTournamentSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const t = await getTournament(parsed.data.tournamentId)
    if (!t) return ack?.({ ok: false, error: 'Nie znaleziono turnieju' })

    socket.join(`tournament:${t.id}`)
    return ack?.({ ok: true, data: t })
  })

  socket.on('admin:tournament:create', async (payload, ack) => {
    const parsed = CreateTournamentSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const t = await createTournament({ name: parsed.data.name, settings: parsed.data.settings })
    io.to(`tournament:${t.id}`).emit('tournament:updated', t)
    return ack?.({ ok: true, data: t })
  })

  socket.on('admin:tournament:update', async (payload, ack) => {
    const { tournamentId, patch } = (payload ?? {}) as {
      tournamentId?: string
      patch?: { name?: string; status?: 'draft' | 'live' | 'completed'; settings?: Record<string, unknown> }
    }
    if (!tournamentId || !patch) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const updated = await updateTournament(tournamentId, patch)
    if (!updated) return ack?.({ ok: false, error: 'Nie znaleziono turnieju' })

    io.to(`tournament:${updated.id}`).emit('tournament:updated', updated)
    return ack?.({ ok: true, data: updated })
  })

  socket.on('tournament:default', async (_payload, ack) => {
    const t = await getOrCreateDefaultTournament()
    socket.join(`tournament:${t.id}`)

    const state = await getTournamentState(t.id)
    if (state) {
      socket.emit('tournament:state', state)
      if (state.currentMatch) socket.join(`match:${state.currentMatch.id}`)
    }

    return ack?.({ ok: true, data: t })
  })
}
