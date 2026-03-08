import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "../../socket/context";
import { useToast } from "../Toast";
import { useMatchStore, type ChallengeState } from "../../stores/match.store";

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string };

// ── Types ────────────────────────────────────────────────────────────────────

export type EventType = "ace" | "ball-out" | "challenge" | "net-touch" | "block" | "timeout";

export type MatchEvent = {
	id: string;
	matchId: string;
	tournamentId: string;
	eventType: EventType;
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

export interface EventPanelProps {
	matchId: string;
	tournamentId: string;
	team1: { id: string; name: string; color?: string | null } | undefined;
	team2: { id: string; name: string; color?: string | null } | undefined;
	currentSet: number;
	scoreSnapshot: {
		team1Points: number;
		team2Points: number;
		team1Sets: number;
		team2Sets: number;
	};
	matchEventsEnabled: boolean;
	playerStatsEnabled: boolean;
	canScore: boolean;
	players: { id: string; teamId: string; name: string }[];
}

// ── Config ───────────────────────────────────────────────────────────────────

const EVENT_CONFIG: {
	type: EventType;
	icon: string;
	label: string;
}[] = [
	{ type: "ace", icon: "🏐", label: "As" },
	{ type: "ball-out", icon: "↗", label: "Aut" },
	{ type: "net-touch", icon: "≈", label: "Siatka" },
	{ type: "block", icon: "✋", label: "Blok" },
	{ type: "timeout", icon: "⏱", label: "Czas" }
];

// ── Component ────────────────────────────────────────────────────────────────

export function EventPanel({
	matchId,
	tournamentId,
	team1,
	team2,
	currentSet,
	scoreSnapshot,
	matchEventsEnabled,
	playerStatsEnabled,
	canScore,
	players
}: EventPanelProps) {
	const { socket } = useSocket();
	const { addToast } = useToast();

	const [isExpanded, setIsExpanded] = useState(false);
	const [recentEvents, setRecentEvents] = useState<MatchEvent[]>([]);

	// Player picker state
	const [pickerState, setPickerState] = useState<{
		team: "team1" | "team2";
		eventType: EventType;
	} | null>(null);

	// Challenge state
	const challenge = useMatchStore(s => s.challenge);
	const setChallenge = useMatchStore(s => s.setChallenge);
	const [challengeStartTeam, setChallengeStartTeam] = useState<"team1" | "team2" | null>(null);
	const [challengeReason, setChallengeReason] = useState("");

	// Stable ref for scoreSnapshot to avoid stale closure in logEvent
	const scoreSnapshotRef = useRef(scoreSnapshot);
	useEffect(() => {
		scoreSnapshotRef.current = scoreSnapshot;
	}, [scoreSnapshot]);

	const currentSetRef = useRef(currentSet);
	useEffect(() => {
		currentSetRef.current = currentSet;
	}, [currentSet]);

	// ── Socket: load recent events on mount / matchId change ─────────────────

	useEffect(() => {
		if (!socket || !matchId) return;

		type StatsAck = { ok: true; data: { events?: MatchEvent[] } | null } | { ok: false; error: string };

		socket.emit("stats:match:get", { matchId }, (ack: StatsAck) => {
			if (!ack.ok || !ack.data) return;
			const events = ack.data.events ?? [];
			// Keep the most recent 5
			setRecentEvents(events.slice(-5));
		});
	}, [socket, matchId]);

	// ── Socket: live event listeners ─────────────────────────────────────────

	useEffect(() => {
		if (!socket) return;

		const onEvent = (event: MatchEvent) => {
			if (event.matchId !== matchId) return;
			setRecentEvents(prev => {
				const next = [...prev, event];
				return next.slice(-5);
			});
		};

		const onDeleted = (payload: { id?: string; eventId?: string; matchId?: string }) => {
			const deletedId = payload.id ?? payload.eventId;
			if (!deletedId) return;
			if (payload.matchId && payload.matchId !== matchId) return;
			setRecentEvents(prev => prev.filter(e => e.id !== deletedId));
		};

		const onCleared = (payload: { matchId: string }) => {
			if (payload.matchId !== matchId) return;
			setRecentEvents([]);
		};

		socket.on("match:event", onEvent);
		socket.on("match:event:deleted", onDeleted);
		socket.on("match:events:cleared", onCleared);

		return () => {
			socket.off("match:event", onEvent);
			socket.off("match:event:deleted", onDeleted);
			socket.off("match:events:cleared", onCleared);
		};
	}, [socket, matchId]);

	// ── Actions ───────────────────────────────────────────────────────────────

	const logEvent = useCallback(
		(team: "team1" | "team2", eventType: EventType, playerId?: string) => {
			if (!socket || !canScore) return;
			const payload: Record<string, unknown> = {
				matchId,
				tournamentId,
				team,
				eventType,
				setNumber: currentSetRef.current,
				scoreSnapshot: scoreSnapshotRef.current
			};
			if (playerId) payload.playerId = playerId;
			socket.emit("admin:event:log", payload);
			const cfg = EVENT_CONFIG.find(c => c.type === eventType);
			const teamName = team === "team1" ? (team1?.name ?? "D1") : (team2?.name ?? "D2");
			addToast(`${cfg?.icon ?? ""} ${cfg?.label ?? eventType} — ${teamName}`, "info");
		},
		[socket, canScore, matchId, tournamentId, team1, team2, addToast]
	);

	const undoLastEvent = useCallback(() => {
		if (!socket || recentEvents.length === 0) return;
		const last = recentEvents[recentEvents.length - 1];
		socket.emit("admin:event:delete", { matchId, eventId: last.id });
		addToast("Cofnięto ostatnie zdarzenie", "info");
	}, [socket, recentEvents, matchId, addToast]);

	// ── Challenge actions ─────────────────────────────────────────────────────

	const startChallenge = useCallback(
		(team: "team1" | "team2", reason?: string) => {
			if (!socket || !canScore) return;
			socket.emit(
				"admin:challenge:start",
				{ matchId, team, reason: reason || undefined },
				(ack: Ack<Exclude<ChallengeState, null>>) => {
					if (!ack.ok) {
						addToast(ack.error, "error");
						return;
					}
					setChallenge(ack.data);
					setChallengeStartTeam(null);
					setChallengeReason("");
					const teamName = team === "team1" ? (team1?.name ?? "D1") : (team2?.name ?? "D2");
					addToast(`⚡ Challenge — ${teamName}`, "info");
				}
			);
		},
		[socket, canScore, matchId, team1, team2, addToast, setChallenge]
	);

	const resolveChallenge = useCallback(
		(result: "successful" | "failed") => {
			if (!socket) return;
			socket.emit("admin:challenge:resolve", { matchId, result }, (ack: Ack<Exclude<ChallengeState, null>>) => {
				if (!ack.ok) {
					addToast(ack.error, "error");
					return;
				}
				setChallenge(ack.data);
				addToast(result === "successful" ? "Challenge udany" : "Challenge nieudany", "info");
			});
		},
		[socket, matchId, addToast, setChallenge]
	);

	// ── Player picker flow ────────────────────────────────────────────────────

	const handleEventButtonClick = (team: "team1" | "team2", eventType: EventType) => {
		if (!canScore) return;
		if (playerStatsEnabled) {
			setPickerState({ team, eventType });
		} else {
			logEvent(team, eventType);
		}
	};

	const handlePlayerPick = (playerId: string | null) => {
		if (!pickerState) return;
		logEvent(pickerState.team, pickerState.eventType, playerId ?? undefined);
		setPickerState(null);
	};

	// ── Derived ───────────────────────────────────────────────────────────────

	if (!matchEventsEnabled) return null;

	const expanded = isExpanded || challenge?.status === "pending";
	const lastEvent = recentEvents[recentEvents.length - 1];

	const teamNameForEvent = (ev: MatchEvent) => {
		if (ev.team === "team1") return team1?.name ?? "D1";
		return team2?.name ?? "D2";
	};

	const eventLabel = (ev: MatchEvent) => {
		const cfg = EVENT_CONFIG.find(c => c.type === ev.eventType);
		return cfg ? `${cfg.icon} ${cfg.label}` : ev.eventType;
	};

	const pickerTeamPlayers = pickerState
		? players.filter(p => {
				const teamId = pickerState.team === "team1" ? team1?.id : team2?.id;
				return p.teamId === teamId;
			})
		: [];

	const pickerTeamName = pickerState ? (pickerState.team === "team1" ? (team1?.name ?? "D1") : (team2?.name ?? "D2")) : "";

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="event-panel mc-card">
			{/* Toggle header */}
			<button
				className="event-panel__toggle"
				onClick={() => setIsExpanded(v => !(v || challenge?.status === "pending"))}
				type="button"
				aria-expanded={expanded}
			>
				<span className="event-panel__toggle-label">
					<span className="event-panel__toggle-icon">{expanded ? "▾" : "▸"}</span>
					Zdarzenia
				</span>
				{lastEvent && !expanded && (
					<span className="event-panel__last-preview">
						{eventLabel(lastEvent)} · {teamNameForEvent(lastEvent)}
					</span>
				)}
			</button>

			{/* Collapsible content */}
			{expanded && (
				<div className="event-panel__content">
					{/* Challenge pending banner */}
					{challenge?.status === "pending" && (
						<div className="event-panel__challenge-pending">
							<div className="event-panel__challenge-info">
								<span className="event-panel__challenge-icon">⚡</span>
								<span className="event-panel__challenge-label">
									CHALLENGE —{" "}
									<span
										style={{
											color:
												challenge.team === "team1"
													? (team1?.color ?? undefined)
													: (team2?.color ?? undefined)
										}}
									>
										{challenge.team === "team1" ? (team1?.name ?? "D1") : (team2?.name ?? "D2")}
									</span>
								</span>
								{challenge.reason && (
									<span className="event-panel__challenge-reason">{challenge.reason}</span>
								)}
							</div>
							<div className="event-panel__challenge-actions">
								<button
									className="event-panel__challenge-btn event-panel__challenge-btn--success"
									onClick={() => resolveChallenge("successful")}
									type="button"
								>
									Udany
								</button>
								<button
									className="event-panel__challenge-btn event-panel__challenge-btn--fail"
									onClick={() => resolveChallenge("failed")}
									type="button"
								>
									Nieudany
								</button>
							</div>
						</div>
					)}

					{/* Challenge resolved banner (brief display) */}
					{challenge && challenge.status !== "pending" && (
						<div
							className={`event-panel__challenge-resolved event-panel__challenge-resolved--${challenge.status}`}
						>
							<span>{challenge.status === "successful" ? "✅" : "❌"}</span>
							<span>
								Challenge {challenge.status === "successful" ? "udany" : "nieudany"} —{" "}
								{challenge.team === "team1" ? (team1?.name ?? "D1") : (team2?.name ?? "D2")}
							</span>
						</div>
					)}

					{/* Two-column team layout */}
					<div className="event-panel__teams">
						{/* Team 1 */}
						<div className="event-panel__team">
							<div className="event-panel__team-header" style={{ color: team1?.color ?? undefined }}>
								{team1?.name ?? "Drużyna 1"}
							</div>
							<div className="event-panel__buttons">
								{EVENT_CONFIG.map(cfg => (
									<button
										key={cfg.type}
										className="event-btn"
										disabled={!canScore || challenge?.status === "pending"}
										onClick={() => handleEventButtonClick("team1", cfg.type)}
										type="button"
										title={cfg.label}
									>
										<span className="event-btn__icon">{cfg.icon}</span>
										<span className="event-btn__label">{cfg.label}</span>
									</button>
								))}
								<button
									className="event-btn event-btn--challenge"
									disabled={!canScore || !!challenge}
									onClick={() => setChallengeStartTeam("team1")}
									type="button"
									title="Challenge"
								>
									<span className="event-btn__icon">⚡</span>
									<span className="event-btn__label">Challenge</span>
								</button>
							</div>
						</div>

						{/* Team 2 */}
						<div className="event-panel__team">
							<div className="event-panel__team-header" style={{ color: team2?.color ?? undefined }}>
								{team2?.name ?? "Drużyna 2"}
							</div>
							<div className="event-panel__buttons">
								{EVENT_CONFIG.map(cfg => (
									<button
										key={cfg.type}
										className="event-btn"
										disabled={!canScore || challenge?.status === "pending"}
										onClick={() => handleEventButtonClick("team2", cfg.type)}
										type="button"
										title={cfg.label}
									>
										<span className="event-btn__icon">{cfg.icon}</span>
										<span className="event-btn__label">{cfg.label}</span>
									</button>
								))}
								<button
									className="event-btn event-btn--challenge"
									disabled={!canScore || !!challenge}
									onClick={() => setChallengeStartTeam("team2")}
									type="button"
									title="Challenge"
								>
									<span className="event-btn__icon">⚡</span>
									<span className="event-btn__label">Challenge</span>
								</button>
							</div>
						</div>
					</div>

					{/* Recent event row */}
					{lastEvent && (
						<div className="event-panel__recent">
							<span className="event-panel__recent-label">Ostatnie:</span>
							<span className="event-panel__recent-event">
								{eventLabel(lastEvent)}
								<span className="event-panel__recent-team"> · {teamNameForEvent(lastEvent)}</span>
								{lastEvent.playerId && (
									<span className="event-panel__recent-player">
										{" "}
										· {players.find(p => p.id === lastEvent.playerId)?.name ?? "?"}
									</span>
								)}
							</span>
							<button
								className="event-panel__undo-btn"
								onClick={undoLastEvent}
								type="button"
								title="Cofnij ostatnie zdarzenie"
								disabled={!canScore}
							>
								↶ Cofnij
							</button>
						</div>
					)}
				</div>
			)}

			{/* Player picker overlay */}
			{pickerState && (
				<div className="event-player-picker" role="dialog" aria-modal="true">
					<div className="event-player-picker__box">
						<div className="event-player-picker__header">
							<span>
								{EVENT_CONFIG.find(c => c.type === pickerState.eventType)?.icon}{" "}
								{EVENT_CONFIG.find(c => c.type === pickerState.eventType)?.label}
								{" — "}
								<span
									style={{
										color:
											pickerState.team === "team1"
												? (team1?.color ?? undefined)
												: (team2?.color ?? undefined)
									}}
								>
									{pickerTeamName}
								</span>
							</span>
							<button
								className="event-player-picker__close"
								onClick={() => setPickerState(null)}
								type="button"
								aria-label="Zamknij"
							>
								✕
							</button>
						</div>
						<p className="event-player-picker__hint">Wybierz zawodnika lub pomiń</p>
						<div className="event-player-picker__list">
							{pickerTeamPlayers.length === 0 ? (
								<p className="event-player-picker__empty">Brak zawodników</p>
							) : (
								pickerTeamPlayers.map(p => (
									<button
										key={p.id}
										className="event-player-picker__item"
										onClick={() => handlePlayerPick(p.id)}
										type="button"
									>
										{p.name}
									</button>
								))
							)}
						</div>
						<button className="event-player-picker__skip" onClick={() => handlePlayerPick(null)} type="button">
							Pomiń (bez zawodnika)
						</button>
					</div>
				</div>
			)}
			{/* Challenge start dialog */}
			{challengeStartTeam && !challenge && (
				<div className="event-player-picker" role="dialog" aria-modal="true">
					<div className="event-player-picker__box">
						<div className="event-player-picker__header">
							<span>
								⚡ Challenge{" — "}
								<span
									style={{
										color:
											challengeStartTeam === "team1"
												? (team1?.color ?? undefined)
												: (team2?.color ?? undefined)
									}}
								>
									{challengeStartTeam === "team1" ? (team1?.name ?? "D1") : (team2?.name ?? "D2")}
								</span>
							</span>
							<button
								className="event-player-picker__close"
								onClick={() => {
									setChallengeStartTeam(null);
									setChallengeReason("");
								}}
								type="button"
								aria-label="Zamknij"
							>
								✕
							</button>
						</div>
						<p className="event-player-picker__hint">Powód challenge (opcjonalnie)</p>
						<input
							type="text"
							className="event-panel__challenge-input"
							value={challengeReason}
							onChange={e => setChallengeReason(e.target.value)}
							placeholder="np. Piłka w polu, dotknięcie siatki..."
							autoFocus
						/>
						<button
							className="event-panel__challenge-start-btn"
							onClick={() => startChallenge(challengeStartTeam, challengeReason)}
							type="button"
						>
							Rozpocznij Challenge
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
