import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io as createClient, type Socket } from "socket.io-client";

type SocketCtx = {
	socket: Socket | null;
	connected: boolean;
	reconnecting: boolean;
	reconnectCount: number;
	onReconnect: (callback: () => void) => () => void;
};

const Ctx = createContext<SocketCtx>({
	socket: null,
	connected: false,
	reconnecting: false,
	reconnectCount: 0,
	onReconnect: () => () => {}
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
	const [connected, setConnected] = useState(false);
	const [reconnecting, setReconnecting] = useState(false);
	const [reconnectCount, setReconnectCount] = useState(0);
	const reconnectCallbacks = useRef<Set<() => void>>(new Set());

	const url = import.meta.env.VITE_SOCKET_URL as string | undefined;

	const client = useMemo(() => {
		return createClient(url, {
			path: "/socket.io",
			autoConnect: true,
			transports: ["websocket", "polling"],
			reconnection: true,
			reconnectionAttempts: Infinity,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000
		});
	}, [url]);

	const onReconnect = useCallback((callback: () => void) => {
		reconnectCallbacks.current.add(callback);
		return () => {
			reconnectCallbacks.current.delete(callback);
		};
	}, []);

	useEffect(() => {
		const onConnect = () => {
			const wasReconnecting = reconnecting;
			setConnected(true);
			setReconnecting(false);

			// If this was a reconnection, notify all listeners
			if (wasReconnecting || reconnectCount > 0) {
				setReconnectCount(c => c + 1);
				reconnectCallbacks.current.forEach(cb => cb());
			}
		};

		const onDisconnect = () => {
			setConnected(false);
		};

		const onReconnectAttempt = () => {
			setReconnecting(true);
		};

		const onReconnectError = () => {
			setReconnecting(true);
		};

		client.on("connect", onConnect);
		client.on("disconnect", onDisconnect);
		client.io.on("reconnect_attempt", onReconnectAttempt);
		client.io.on("reconnect_error", onReconnectError);

		return () => {
			client.off("connect", onConnect);
			client.off("disconnect", onDisconnect);
			client.io.off("reconnect_attempt", onReconnectAttempt);
			client.io.off("reconnect_error", onReconnectError);
			client.close();
		};
	}, [client, reconnecting, reconnectCount]);

	return (
		<Ctx.Provider value={{ socket: client, connected, reconnecting, reconnectCount, onReconnect }}>
			{children}
		</Ctx.Provider>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
	return useContext(Ctx);
}
