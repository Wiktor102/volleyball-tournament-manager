import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'

export function createIo(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  })

  return io
}
