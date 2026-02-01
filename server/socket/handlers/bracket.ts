import type { Server, Socket } from 'socket.io'
import { z } from 'zod'
import { getTournamentState } from '../../services/state.service'
import { assignTeamToSlot, clearBracket, generateBracket, listBracketMatches } from '../../services/bracket.service'

const GenerateSchema = z.object({ tournamentId: z.string().min(1) })
const AssignSchema = z.object({
  tournamentId: z.string().min(1),
  matchId: z.string().min(1),
  slot: z.enum(['team1', 'team2']),
  teamId: z.string().min(1).nullable(),
})
const ClearSchema = z.object({ tournamentId: z.string().min(1) })

export function registerBracketHandlers(io: Server, socket: Socket) {
  socket.on('bracket:list', async (payload, ack) => {
    const tournamentId = (payload ?? {}).tournamentId as string | undefined
    if (!tournamentId) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })
    const items = await listBracketMatches(tournamentId)
    return ack?.({ ok: true, data: items })
  })

  socket.on('admin:bracket:generate', async (payload, ack) => {
    const parsed = GenerateSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    const res = await generateBracket(parsed.data.tournamentId)
    if (!res.ok) return ack?.({ ok: false, error: res.error })

    const items = await listBracketMatches(parsed.data.tournamentId)
    io.to(`tournament:${parsed.data.tournamentId}`).emit('bracket:updated', items)

    const state = await getTournamentState(parsed.data.tournamentId)
    if (state) io.to(`tournament:${parsed.data.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: items })
  })

  socket.on('admin:bracket:assign', async (payload, ack) => {
    const parsed = AssignSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    await assignTeamToSlot(parsed.data.matchId, parsed.data.slot, parsed.data.teamId)

    const items = await listBracketMatches(parsed.data.tournamentId)
    io.to(`tournament:${parsed.data.tournamentId}`).emit('bracket:updated', items)

    const state = await getTournamentState(parsed.data.tournamentId)
    if (state) io.to(`tournament:${parsed.data.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: items })
  })

  socket.on('admin:bracket:clear', async (payload, ack) => {
    const parsed = ClearSchema.safeParse(payload)
    if (!parsed.success) return ack?.({ ok: false, error: 'Nieprawidłowe dane' })

    await clearBracket(parsed.data.tournamentId)

    const items = await listBracketMatches(parsed.data.tournamentId)
    io.to(`tournament:${parsed.data.tournamentId}`).emit('bracket:updated', items)

    const state = await getTournamentState(parsed.data.tournamentId)
    if (state) io.to(`tournament:${parsed.data.tournamentId}`).emit('tournament:state', state)

    return ack?.({ ok: true, data: items })
  })
}
