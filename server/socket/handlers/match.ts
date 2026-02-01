import type { Server, Socket } from 'socket.io'
import { MatchEndSchema, MatchResetSchema, MatchStartSchema, ScoreDecrementSchema, ScoreIncrementSchema } from '../../utils/validation'
import { getTournamentState } from '../../services/state.service'
import { createDemoMatch, decrementPoint, endMatch, ensureMatchScore, getMatchScore, incrementPoint, resetMatch, startMatch } from '../../services/match.service'
import { listBracketMatches } from '../../services/bracket.service'

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

  socket.on('admin:match:start', async (payload, ack) => {
    const parsed = MatchStartSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const res = await startMatch(parsed.data.tournamentId, parsed.data.matchId)
    if (!res.ok) return ack?.({ ok: false, error: res.error })

    socket.join(`match:${parsed.data.matchId}`)
    io.to(`tournament:${parsed.data.tournamentId}`).emit('match:status', res.match)

    const state = await getTournamentState(parsed.data.tournamentId)
    if (state) io.to(`tournament:${parsed.data.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: res.match })
  })

  socket.on('admin:match:end', async (payload, ack) => {
    const parsed = MatchEndSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const res = await endMatch(parsed.data.tournamentId, parsed.data.matchId, parsed.data.winnerId)
    if (!res.ok) return ack?.({ ok: false, error: res.error })

    io.to(`tournament:${parsed.data.tournamentId}`).emit('match:status', res.match)

    const bracket = await listBracketMatches(parsed.data.tournamentId)
    io.to(`tournament:${parsed.data.tournamentId}`).emit('bracket:updated', bracket)

    const state = await getTournamentState(parsed.data.tournamentId)
    if (state) io.to(`tournament:${parsed.data.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: res.match })
  })

  socket.on('admin:match:reset', async (payload, ack) => {
    const parsed = MatchResetSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const res = await resetMatch(parsed.data.tournamentId, parsed.data.matchId)
    if (!res.ok) return ack?.({ ok: false, error: res.error })

    io.to(`tournament:${parsed.data.tournamentId}`).emit('match:status', res.match)

    const bracket = await listBracketMatches(parsed.data.tournamentId)
    io.to(`tournament:${parsed.data.tournamentId}`).emit('bracket:updated', bracket)

    const state = await getTournamentState(parsed.data.tournamentId)
    if (state) io.to(`tournament:${parsed.data.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: res.match })
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
