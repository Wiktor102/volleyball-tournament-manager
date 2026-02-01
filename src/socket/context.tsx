import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { io as createClient, type Socket } from 'socket.io-client'

type SocketCtx = {
  socket: Socket | null
  connected: boolean
}

const Ctx = createContext<SocketCtx>({ socket: null, connected: false })

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false)

  const url = import.meta.env.VITE_SOCKET_URL as string | undefined

  const client = useMemo(() => {
    return createClient(url ?? 'http://localhost:5174', {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
  }, [url])

  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    client.on('connect', onConnect)
    client.on('disconnect', onDisconnect)

    return () => {
      client.off('connect', onConnect)
      client.off('disconnect', onDisconnect)
      client.close()
    }
  }, [client])

  return <Ctx.Provider value={{ socket: client, connected }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  return useContext(Ctx)
}
