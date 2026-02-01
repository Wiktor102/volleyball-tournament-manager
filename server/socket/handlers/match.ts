import type { Server, Socket } from 'socket.io'
import { ScoreDecrementSchema, ScoreIncrementSchema } from '../../utils/validation'
import { getTournamentState } from '../../services/state.service'
import { createDemoMatch, decrementPoint, ensureMatchScore, getMatchScore, incrementPoint } from '../../services/match.service'

export function registerMatchHandlers(io: Server, socket: Socket) {
  socket.on('match:score', async (payload, ack) => {
    const { matchId } = (payload ?? {}) as { matchId?: string }
    if (!matchId) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const score = await ensureMatchScore(matchId)
    socket.join(`match:${matchId}`)
    return ack?.({ ok: true, data: score })
  })

  socket.on('admin:score:increment', async (payload, ack) => {
    const parsed = ScoreIncrementSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const score = await incrementPoint(parsed.data.matchId, parsed.data.team)
    io.to(`match:${parsed.data.matchId}`).emit('match:score', score)
    return ack?.({ ok: true, data: score })
  })

  socket.on('admin:score:decrement', async (payload, ack) => {
    const parsed = ScoreDecrementSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const score = await decrementPoint(parsed.data.matchId, parsed.data.team)
    io.to(`match:${parsed.data.matchId}`).emit('match:score', score)
    return ack?.({ ok: true, data: score })
  })

  // Temporary helper to make the app usable quickly
  socket.on('admin:match:demo', async (payload, ack) => {
    const { tournamentId } = (payload ?? {}) as { tournamentId?: string }
    if (!tournamentId) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const m = await createDemoMatch(tournamentId)
    if (!m) return ack?.({ ok: false, error: 'Nie udało się utworzyć meczu' })

    const score = await getMatchScore(m.id)
    socket.join(`match:${m.id}`)
    io.to(`tournament:${tournamentId}`).emit('match:status', m)
    if (score) io.to(`match:${m.id}`).emit('match:score', score)

    const state = await getTournamentState(tournamentId)
    if (state) io.to(`tournament:${tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: { match: m, score } })
  })
}
