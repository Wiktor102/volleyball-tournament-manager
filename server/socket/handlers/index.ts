import type { Server, Socket } from 'socket.io'
import { registerTournamentHandlers } from './tournament'
import { registerMatchHandlers } from './match'
import { registerTeamHandlers } from './team'

export function registerHandlers(io: Server, socket: Socket) {
  registerTournamentHandlers(io, socket)
  registerMatchHandlers(io, socket)
  registerTeamHandlers(io, socket)
}
