import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../socket/context";

const FULLSCREEN_OVERLAY_MAX_MS = 30_000;

type MatchEvent = {
	id: string;
	matchId: string;
	tournamentId: string;
	eventType: "ace" | "ball-out" | "challenge" | "net-touch" | "block" | "timeout";
	team: "team1" | "team2";
	playerId: string | null;
	setNumber: number;
	scoreSnapshot: {
		team1Points: number;
		team2Points: number;
		team1Sets: number;
		team2Sets: number;
	} | null;
	metadata: Record<string, unknown> | null;
	createdAt: number;
};

interface EventBlastProps {
	matchId: string;
	team1: { name: string; color?: string | null } | undefined;
	team2: { name: string; color?: string | null } | undefined;
}

const EVENT_CONFIG: Record<MatchEvent["eventType"], { label: string; icon: string; color: string }> = {
	ace: { label: "AS!", icon: "🏐", color: "#FFD23F" },
	"ball-out": { label: "AUT!", icon: "↗", color: "#ef4444" },
	challenge: { label: "CHALLENGE!", icon: "⚡", color: "#a855f7" },
	"net-touch": { label: "SIATKA!", icon: "≋", color: "#06b6d4" },
	block: { label: "BLOK!", icon: "✋", color: "#22c55e" },
	timeout: { label: "CZAS!", icon: "⏱", color: "#94a3b8" }
};

const DEFAULT_DURATION = 3000;

function getBannerDurationMs(): number {
	try {
		const sec = parseInt(localStorage.getItem("bannerDurationSec") ?? "", 10);
		if (!isNaN(sec) && sec >= 1 && sec <= 10) return Math.min(sec * 1000, FULLSCREEN_OVERLAY_MAX_MS);
	} catch {
		/* ignore */
	}
	return DEFAULT_DURATION;
}

function isBannersEnabled(): boolean {
	try {
		const val = localStorage.getItem("eventBannersEnabled");
		return val === null ? true : val !== "false";
	} catch {
		return true;
	}
}

type DisplayState = {
	event: MatchEvent;
	phase: "enter" | "visible" | "exit";
};

export function EventBlast({ matchId, team1, team2 }: EventBlastProps) {
	const { socket } = useSocket();
	const [display, setDisplay] = useState<DisplayState | null>(null);
	const queueRef = useRef<MatchEvent[]>([]);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const currentIdRef = useRef<string | null>(null);

	const clearTimer = () => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		if (safetyTimerRef.current !== null) {
			clearTimeout(safetyTimerRef.current);
			safetyTimerRef.current = null;
		}
	};

	const showNext = useCallback(function showNextInner() {
		const next = queueRef.current.shift();
		if (!next) {
			currentIdRef.current = null;
			setDisplay(null);
			return;
		}
		currentIdRef.current = next.id;
		setDisplay({ event: next, phase: "enter" });

		// After enter animation, move to visible
		timerRef.current = setTimeout(() => {
			setDisplay(prev => (prev ? { ...prev, phase: "visible" } : null));

			// After visible duration, start exit
			const duration = getBannerDurationMs();
			timerRef.current = setTimeout(() => {
				setDisplay(prev => (prev ? { ...prev, phase: "exit" } : null));

				// After exit animation, show next
				timerRef.current = setTimeout(() => {
					currentIdRef.current = null;
					setDisplay(null);
					// Process next in queue
					const n = queueRef.current.shift();
					if (n) {
						currentIdRef.current = n.id;
						setDisplay({ event: n, phase: "enter" });
						// Re-trigger the lifecycle
						timerRef.current = setTimeout(() => {
							setDisplay(prev => (prev ? { ...prev, phase: "visible" } : null));
							timerRef.current = setTimeout(() => {
								setDisplay(prev => (prev ? { ...prev, phase: "exit" } : null));
								timerRef.current = setTimeout(() => {
									currentIdRef.current = null;
									setDisplay(null);
									showNextInner();
								}, 500);
							}, getBannerDurationMs());
						}, 600);
					}
				}, 500); // exit animation duration
			}, duration);
		}, 600); // enter animation duration
	}, []);

	const enqueue = useCallback(
		(event: MatchEvent) => {
			if (!isBannersEnabled()) return;
			if (event.matchId !== matchId) return;

			// Timeout events use a different visual - still goes through blast
			if (currentIdRef.current) {
				queueRef.current.push(event);
			} else {
				currentIdRef.current = event.id;
				setDisplay({ event, phase: "enter" });

				timerRef.current = setTimeout(() => {
					setDisplay(prev => (prev ? { ...prev, phase: "visible" } : null));

					const duration = getBannerDurationMs();
					timerRef.current = setTimeout(() => {
						setDisplay(prev => (prev ? { ...prev, phase: "exit" } : null));

						timerRef.current = setTimeout(() => {
							currentIdRef.current = null;
							setDisplay(null);
							showNext();
						}, 500);
					}, duration);
				}, 600);
			}
		},
		[matchId, showNext]
	);

	useEffect(() => {
		if (!socket) return;

		const onEvent = (event: MatchEvent) => enqueue(event);

		const onEventDeleted = (data: { id?: string; eventId?: string; matchId?: string }) => {
			const deletedId = data.id ?? data.eventId;
			if (!deletedId) return;
			if (data.matchId && data.matchId !== matchId) return;
			if (deletedId === currentIdRef.current) {
				clearTimer();
				setDisplay(prev => (prev ? { ...prev, phase: "exit" } : null));
				setTimeout(() => {
					currentIdRef.current = null;
					setDisplay(null);
					showNext();
				}, 300);
			} else {
				queueRef.current = queueRef.current.filter(e => e.id !== deletedId);
			}
		};

		const onEventsCleared = () => {
			clearTimer();
			queueRef.current = [];
			currentIdRef.current = null;
			setDisplay(null);
		};

		socket.on("match:event", onEvent);
		socket.on("match:event:deleted", onEventDeleted);
		socket.on("match:events:cleared", onEventsCleared);

		return () => {
			socket.off("match:event", onEvent);
			socket.off("match:event:deleted", onEventDeleted);
			socket.off("match:events:cleared", onEventsCleared);
			clearTimer();
		};
	}, [socket, matchId, enqueue, showNext]);

	useEffect(() => {
		if (!display) {
			if (safetyTimerRef.current !== null) {
				clearTimeout(safetyTimerRef.current);
				safetyTimerRef.current = null;
			}
			return;
		}

		if (safetyTimerRef.current !== null) {
			clearTimeout(safetyTimerRef.current);
			safetyTimerRef.current = null;
		}

		safetyTimerRef.current = setTimeout(() => {
			setDisplay(prev => (prev ? { ...prev, phase: "exit" } : null));
			timerRef.current = setTimeout(() => {
				currentIdRef.current = null;
				setDisplay(null);
				showNext();
			}, 500);
		}, FULLSCREEN_OVERLAY_MAX_MS);

		return () => {
			if (safetyTimerRef.current !== null) {
				clearTimeout(safetyTimerRef.current);
				safetyTimerRef.current = null;
			}
		};
	}, [display, showNext]);

	if (!display) return null;

	const { event, phase } = display;
	const cfg = EVENT_CONFIG[event.eventType];
	const teamName = event.team === "team1" ? (team1?.name ?? "Druzyna 1") : (team2?.name ?? "Druzyna 2");
	const teamColor = event.team === "team1" ? (team1?.color ?? "#fff") : (team2?.color ?? "#fff");
	const side = event.team === "team1" ? "left" : "right";

	// Timeout gets a special overlay instead of a blast
	if (event.eventType === "timeout") {
		return (
			<div className={`ov-timeout ${phase === "exit" ? "ov-timeout--exit" : ""}`}>
				<div className="ov-timeout__content">
					<div className="ov-timeout__icon">{cfg.icon}</div>
					<div className="ov-timeout__label">{cfg.label}</div>
					<div className="ov-timeout__team" style={{ color: teamColor }}>
						{teamName}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className="ov-event-blast"
			style={{ "--ov-event-color": cfg.color, "--ov-wipe-origin": side } as React.CSSProperties}
		>
			{/* Background flash */}
			{phase === "enter" && (
				<div
					className="ov-event-blast__bg"
					style={{
						background: `radial-gradient(circle at ${side === "left" ? "20%" : "80%"} 50%, ${cfg.color}22 0%, transparent 70%)`
					}}
				/>
			)}

			{/* Directional wipe */}
			{phase === "enter" && (
				<div
					className={`ov-event-blast__wipe ov-event-blast__wipe--${side}`}
					style={{ "--ov-event-color": cfg.color } as React.CSSProperties}
				/>
			)}

			{/* Diagonal lines */}
			{phase === "enter" && (
				<div
					className="ov-event-blast__lines"
					style={{
						background: `repeating-linear-gradient(-45deg, transparent, transparent 40px, ${cfg.color} 40px, ${cfg.color} 42px)`
					}}
				/>
			)}

			{/* Center content */}
			<div className={`ov-event-blast__center ${phase === "exit" ? "ov-event-blast__center--exit" : ""}`}>
				<div className="ov-event-blast__icon">{cfg.icon}</div>
				<div
					className="ov-event-blast__rule"
					style={{ background: cfg.color, boxShadow: `0 0 20px ${cfg.color}` }}
				/>
				<div className="ov-event-blast__label">{cfg.label}</div>
				<div className="ov-event-blast__team" style={{ color: teamColor }}>
					{teamName}
				</div>
			</div>
		</div>
	);
}
