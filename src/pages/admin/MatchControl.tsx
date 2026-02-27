import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../../socket/context";
import {
	useTournamentStore,
	type Team,
	type Tournament,
	type TournamentState,
	type ScoringSettings
} from "../../stores/tournament.store";
import type { MatchScore } from "../../stores/match.store";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string };

type BracketMatch = {
	id: string;
	tournamentId: string;
	roundNumber: number;
	matchNumber: number;
	positionInRound: number;
	team1Id: string | null;
	team2Id: string | null;
	winnerId: string | null;
	status: "pending" | "live" | "completed";
	isThirdPlaceMatch: boolean;
	nextMatchId: string | null;
};

export function MatchControl() {
	const { matchId: matchIdParam } = useParams();
	const matchId = matchIdParam ?? "";

	const { socket, connected } = useSocket();
	const { tournament, teams, setTournament, setTeams } = useTournamentStore();
	const { addToast } = useToast();
	const confirm = useConfirm();
	const navigate = useNavigate();

	const [match, setMatch] = useState<BracketMatch | null>(null);
	const [score, setScore] = useState<MatchScore | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Manual score editing state
	const [editingScore, setEditingScore] = useState(false);
	const [manualT1, setManualT1] = useState(0);
	const [manualT2, setManualT2] = useState(0);

	// Set score editing state
	const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
	const [editSetT1, setEditSetT1] = useState(0);
	const [editSetT2, setEditSetT2] = useState(0);

	// Timer state for timed mode
	const [timerRunning, setTimerRunning] = useState(false);
	const [localTime, setLocalTime] = useState(0);
	const timerRef = useRef<number | null>(null);

	const scoringMode = (score?.scoringMode as ScoringSettings | undefined)?.mode;
	const isTimedMode = scoringMode === "timed";
	const matchDuration = (score?.scoringMode as ScoringSettings | undefined)?.matchDurationMinutes ?? 10;
	const matchDurationSeconds = matchDuration * 60;

	// Timer effect
	useEffect(() => {
		if (timerRunning && isTimedMode) {
			timerRef.current = window.setInterval(() => {
				setLocalTime(prev => prev + 1);
			}, 1000);
		}
		return () => {
			if (timerRef.current) {
				window.clearInterval(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [timerRunning, isTimedMode]);

	// Sync local time from server score
	useEffect(() => {
		if (score?.matchTimeSeconds !== undefined) {
			setLocalTime(score.matchTimeSeconds);
		}
	}, [score?.matchTimeSeconds]);

	// Sync timer to server periodically
	const syncTimer = useCallback(() => {
		if (!socket || !matchId || !timerRunning) return;
		socket.emit("admin:timer:update", { matchId, timeSeconds: localTime });
	}, [socket, matchId, localTime, timerRunning]);

	useEffect(() => {
		if (!timerRunning) return;
		const interval = setInterval(syncTimer, 5000);
		return () => clearInterval(interval);
	}, [timerRunning, syncTimer]);

	const toggleTimer = () => {
		if (timerRunning) {
			syncTimer();
		}
		setTimerRunning(!timerRunning);
	};

	const resetTimer = () => {
		setTimerRunning(false);
		setLocalTime(0);
		if (socket && matchId) {
			socket.emit("admin:timer:update", { matchId, timeSeconds: 0 });
		}
	};

	const formatTime = (seconds: number) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	const formatSetDuration = (startedAt?: number | null, endedAt?: number | null) => {
		if (!startedAt || !endedAt) return null;
		const durationMs = endedAt - startedAt;
		if (durationMs < 0) return null;
		const mins = Math.floor(durationMs / 60000);
		const secs = Math.floor((durationMs % 60000) / 1000);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	const timeRemaining = Math.max(0, matchDurationSeconds - localTime);
	const isOvertime = localTime > matchDurationSeconds;

	useEffect(() => {
		if (!socket) return;

		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok) return;
			if (!ack.data) {
				navigate("/admin", { replace: true });
				return;
			}
			setTournament(ack.data);
		});

		const onState = (state: TournamentState) => {
			setTournament(state.tournament);
			setTeams(state.teams);
		};

		const onMatchStatus = (m: Partial<BracketMatch> & { id?: string }) => {
			if (!m?.id || m.id !== matchId) return;
			setMatch(prev => (prev ? ({ ...prev, ...m } as BracketMatch) : (m as BracketMatch)));
		};

		socket.on("tournament:state", onState);
		socket.on("match:status", onMatchStatus);

		return () => {
			socket.off("tournament:state", onState);
			socket.off("match:status", onMatchStatus);
		};
	}, [socket, setTournament, setTeams, matchId, navigate]);

	const teamLabel = (t: Team | undefined) => {
		if (!t) return "—";
		return t.name;
	};

	const loadMatch = () => {
		if (!socket || !tournament || !matchId) return;
		socket.emit("bracket:list", { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
			if (!ack.ok || !ack.data) return;
			const found = ack.data.find(m => m.id === matchId) ?? null;
			setMatch(found);
		});
	};

	const refreshScore = () => {
		if (!socket || !matchId) return;
		socket.emit("match:score", { matchId }, (ack: Ack<MatchScore>) => {
			if (!ack.ok) return;
			setScore(ack.data);
		});
	};

	useEffect(() => {
		if (!tournament || !matchId) return;
		loadMatch();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tournament?.id, matchId]);

	useEffect(() => {
		if (!socket || !matchId) return;

		socket.emit("match:score", { matchId }, (ack: Ack<MatchScore>) => {
			if (!ack.ok) return;
			setScore(ack.data);
		});

		const onScore = (s: MatchScore) => {
			if (s.matchId !== matchId) return;
			setScore(s);
		};

		socket.on("match:score", onScore);

		return () => {
			socket.off("match:score", onScore);
		};
	}, [socket, matchId]);

	const inc = (team: "team1" | "team2") => {
		if (!socket || !matchId) return;
		socket.emit("admin:score:increment", { matchId, team });
	};

	const dec = (team: "team1" | "team2") => {
		if (!socket || !matchId) return;
		socket.emit("admin:score:decrement", { matchId, team });
	};

	const start = () => {
		if (!socket || !tournament || !matchId) return;
		setError(null);
		socket.emit("admin:match:start", { tournamentId: tournament.id, matchId }, (ack: Ack<BracketMatch>) => {
			if (!ack.ok) {
				setError(ack.error);
				addToast(ack.error, "error");
			} else {
				setMatch(ack.data);
				refreshScore();
				addToast("Mecz rozpoczęty", "success");
			}
		});
	};

	const end = (winnerId: string) => {
		if (!socket || !tournament || !matchId) return;
		setError(null);
		socket.emit("admin:match:end", { tournamentId: tournament.id, matchId, winnerId }, (ack: Ack<BracketMatch>) => {
			if (!ack.ok) {
				setError(ack.error);
				addToast(ack.error, "error");
			} else {
				setMatch(ack.data);
				refreshScore();
				addToast("Mecz zakończony", "success");
			}
		});
	};

	const reset = () => {
		if (!socket || !tournament || !matchId) return;
		setError(null);
		socket.emit("admin:match:reset", { tournamentId: tournament.id, matchId }, (ack: Ack<BracketMatch>) => {
			if (!ack.ok) {
				setError(ack.error);
				addToast(ack.error, "error");
			} else {
				setMatch(ack.data);
				refreshScore();
				addToast("Mecz zresetowany", "info");
			}
		});
	};

	const awardSetToTeam = (team: "team1" | "team2") => {
		if (!socket || !matchId) return;
		socket.emit("admin:set:award", { matchId, team });
		addToast("Set przyznany", "success");
	};

	const undoLastSet = () => {
		if (!socket || !matchId) return;
		socket.emit("admin:set:undo", { matchId });
		addToast("Cofnięto ostatni set", "info");
	};

	// Manual score input
	const startEditingScore = () => {
		setManualT1(score?.team1CurrentPoints ?? 0);
		setManualT2(score?.team2CurrentPoints ?? 0);
		setEditingScore(true);
	};

	const saveManualScore = () => {
		if (!socket || !matchId) return;
		socket.emit("admin:score:setDirect", { matchId, team1Points: manualT1, team2Points: manualT2 });
		setEditingScore(false);
		addToast("Wynik ustawiony ręcznie", "success");
	};

	const cancelEditingScore = () => {
		setEditingScore(false);
	};

	// Set score editing
	const startEditingSet = (index: number) => {
		if (!score?.setScores?.[index]) return;
		setEditSetT1(score.setScores[index].t1);
		setEditSetT2(score.setScores[index].t2);
		setEditingSetIndex(index);
	};

	const saveSetEdit = () => {
		if (!socket || !matchId || editingSetIndex === null) return;
		socket.emit("admin:set:edit", { matchId, setIndex: editingSetIndex, t1: editSetT1, t2: editSetT2 });
		setEditingSetIndex(null);
		addToast("Wynik seta zaktualizowany", "success");
	};

	const cancelSetEdit = () => {
		setEditingSetIndex(null);
	};

	// Force winner with confirmation
	const forceWinner = async (winnerId: string, winnerName: string) => {
		if (!socket || !tournament || !matchId) return;
		const confirmed = await confirm({
			title: "Wymuś zwycięzcę",
			message: `Czy na pewno chcesz ręcznie ustawić ${winnerName} jako zwycięzcę tego meczu? Mecz zostanie zakończony z aktualnym wynikiem.`,
			confirmText: "Tak, zakończ mecz",
			danger: true,
		});
		if (!confirmed) return;
		syncTimer();
		end(winnerId);
	};

	// Current set elapsed time (live counter)
	const [currentSetElapsed, setCurrentSetElapsed] = useState("");

	const t1 = teams.find(t => t.id === match?.team1Id);
	const t2 = teams.find(t => t.id === match?.team2Id);

	const canStart = match?.status === "pending" && !!match.team1Id && !!match.team2Id;
	const canScore = match?.status === "live";

	useEffect(() => {
		const startedAt = score?.currentSetStartedAt;
		if (!startedAt || !canScore) {
			setCurrentSetElapsed("");
			return;
		}
		const tick = () => {
			const elapsed = Math.floor((Date.now() - startedAt) / 1000);
			const mins = Math.floor(elapsed / 60);
			const secs = elapsed % 60;
			setCurrentSetElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
		};
		tick();
		const interval = setInterval(tick, 1000);
		return () => clearInterval(interval);
	}, [score?.currentSetStartedAt, canScore]);

	useEffect(() => {
		if (!canScore) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
			if (e.key === "a" || e.key === "A") inc("team1");
			if (e.key === "l" || e.key === "L") inc("team2");
			if (e.key === "q" || e.key === "Q") dec("team1");
			if (e.key === "p" || e.key === "P") dec("team2");
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canScore, socket, matchId]);

	if (!matchId) {
		return (
			<div className="admin-page">
				<div className="admin-container">
					<div className="card">
						<h2>Kontrola meczu</h2>
						<p className="text-muted">Brak ID meczu w URL.</p>
						<Link to="/admin/bracket" className="btn btn-secondary">
							← Wróć do drabinki
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="admin-page">
			<div className="admin-container">
				<header className="admin-header">
					<div className="flex items-center gap-2">
						<h1>Kontrola meczu</h1>
						<span className={`status-badge ${connected ? "connected" : "disconnected"}`}>
							{connected ? "Połączono" : "Rozłączono"}
						</span>
					</div>
					<nav className="admin-nav">
						<Link to="/admin/bracket">← Drabinka</Link>
						<Link to="/admin">Panel główny</Link>
						<Link to="/display/fan">Widok fanów</Link>
						<Link to="/overlay">Overlay</Link>
					</nav>
				</header>

				{!match ? (
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-icon">🏐</div>
							<div className="empty-state-text">Nie znaleziono meczu w drabince.</div>
							<button className="btn btn-secondary" onClick={loadMatch} disabled={!tournament}>
								Odśwież
							</button>
						</div>
					</div>
				) : (
					<>
						{/* Match Info Bar */}
						<div
							className="card"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								flexWrap: "wrap",
								gap: 16
							}}
						>
							<div className="flex items-center gap-2">
								<span className="text-muted">Mecz #{match.matchNumber}</span>
								<span className="text-dim">•</span>
								<span className="text-muted">Runda {match.roundNumber}</span>
								<span className="text-dim">•</span>
								<span className={`status-badge ${match.status}`}>
									{match.status === "pending"
										? "Oczekuje"
										: match.status === "live"
											? "Na żywo"
											: "Zakończony"}
								</span>
								{scoringMode && (
									<>
										<span className="text-dim">•</span>
										<span className="text-muted">
											{scoringMode === "sets"
												? "Sety"
												: scoringMode === "points"
													? "Punkty"
													: "Na czas"}
										</span>
									</>
								)}
							</div>
							<div className="text-dim" style={{ fontSize: 12 }}>
								{scoringMode !== "timed" && `Set: ${score?.currentSet ?? 1}`}
							</div>
						</div>

						{/* Timer Display for Timed Mode */}
						{isTimedMode && (
							<div className="card">
								<div className="timer-display" style={{ textAlign: "center", padding: "1rem 0" }}>
									<div
										style={{
											fontSize: "4rem",
											fontFamily: "monospace",
											fontWeight: "bold",
											color: isOvertime
												? "var(--danger-color)"
												: timeRemaining < 60
													? "var(--warning-color)"
													: "inherit"
										}}
									>
										{isOvertime
											? `+${formatTime(localTime - matchDurationSeconds)}`
											: formatTime(timeRemaining)}
									</div>
									<div className="text-muted" style={{ marginBottom: "1rem" }}>
										{isOvertime ? "DOGRYWKA" : `z ${matchDuration} minut`}
									</div>
									<div className="btn-group" style={{ justifyContent: "center" }}>
										<button
											className={`btn ${timerRunning ? "btn-warning" : "btn-success"} btn-lg`}
											onClick={toggleTimer}
											disabled={!canScore}
										>
											{timerRunning ? "⏸ Pauza" : "▶ Start"}
										</button>
										<button className="btn btn-secondary" onClick={resetTimer} disabled={timerRunning}>
											↺ Reset czasu
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Score Display */}
						<div className="card">
							{/* Sets Display */}
							{scoringMode === "sets" && (score?.setsToWin ?? 3) > 1 && (
								<div className="sets-display">
									<div className="sets-score">
										<span style={{ color: t1?.color || undefined }}>{score?.team1Sets ?? 0}</span>
										<span className="sets-separator">:</span>
										<span style={{ color: t2?.color || undefined }}>{score?.team2Sets ?? 0}</span>
									</div>
									<div className="sets-label">Sety (do {score?.setsToWin ?? 3})</div>
									{score?.setScores && score.setScores.length > 0 && (
										<div className="set-history">
											{score.setScores.map((s, i) => (
												editingSetIndex === i ? (
													<div key={i} className="set-result set-result--editing">
														<span className="text-muted" style={{ fontSize: 12 }}>Set {i + 1}:</span>
														<input
															type="number"
															className="form-input form-input-sm set-edit-input"
															value={editSetT1}
															onChange={e => setEditSetT1(Math.max(0, Number(e.target.value)))}
															min={0}
															style={{ width: 52 }}
															autoFocus
														/>
														<span>-</span>
														<input
															type="number"
															className="form-input form-input-sm set-edit-input"
															value={editSetT2}
															onChange={e => setEditSetT2(Math.max(0, Number(e.target.value)))}
															min={0}
															style={{ width: 52 }}
														/>
														<button className="btn btn-success btn-xs" onClick={saveSetEdit}>OK</button>
														<button className="btn btn-secondary btn-xs" onClick={cancelSetEdit}>Anuluj</button>
													</div>
												) : (
													<span
														key={i}
														className={`set-result set-result--clickable`}
														onClick={() => canScore && startEditingSet(i)}
														title={canScore ? "Kliknij, aby edytować wynik seta" : undefined}
													>
														Set {i + 1}: {s.t1}-{s.t2}
														{formatSetDuration(s.startedAt, s.endedAt) && (
															<span className="text-dim" style={{ marginLeft: 6, fontSize: 11 }}>
																({formatSetDuration(s.startedAt, s.endedAt)})
															</span>
														)}
													</span>
												)
											))}
										</div>
									)}
									{/* Current set indicator */}
									{canScore && (
										<div className="current-set-indicator">
											Aktualny set: <strong>{score?.currentSet ?? 1}</strong>
											{currentSetElapsed && (
												<span className="text-dim" style={{ marginLeft: 8 }}>
													(czas: {currentSetElapsed})
												</span>
											)}
										</div>
									)}
								</div>
							)}

							{editingScore ? (
								<div className="score-display">
									<div className="score-team left">
										<div className="score-team-name" style={{ color: t1?.color || undefined }}>
											{teamLabel(t1)}
										</div>
										<input
											type="number"
											className="form-input score-manual-input"
											value={manualT1}
											onChange={e => setManualT1(Math.max(0, Number(e.target.value)))}
											min={0}
											autoFocus
										/>
									</div>

									<div className="score-vs">vs</div>

									<div className="score-team right">
										<div className="score-team-name" style={{ color: t2?.color || undefined }}>
											{teamLabel(t2)}
										</div>
										<input
											type="number"
											className="form-input score-manual-input"
											value={manualT2}
											onChange={e => setManualT2(Math.max(0, Number(e.target.value)))}
											min={0}
										/>
									</div>
								</div>
							) : (
								<div className="score-display">
									<div className="score-team left">
										<div className="score-team-name" style={{ color: t1?.color || undefined }}>
											{teamLabel(t1)}
										</div>
										<div className="score-value">{score?.team1CurrentPoints ?? 0}</div>
										<div className="score-controls">
											<button
												className="btn btn-secondary btn-lg"
												disabled={!canScore}
												onClick={() => dec("team1")}
											>
												−
											</button>
											<button
												className="btn btn-primary btn-lg"
												disabled={!canScore}
												onClick={() => inc("team1")}
											>
												+
											</button>
										</div>
										<div className="keyboard-hint mt-2">A (+) / Q (-)</div>
									</div>

									<div className="score-vs">vs</div>

									<div className="score-team right">
										<div className="score-team-name" style={{ color: t2?.color || undefined }}>
											{teamLabel(t2)}
										</div>
										<div className="score-value">{score?.team2CurrentPoints ?? 0}</div>
										<div className="score-controls">
											<button
												className="btn btn-secondary btn-lg"
												disabled={!canScore}
												onClick={() => dec("team2")}
											>
												−
											</button>
											<button
												className="btn btn-primary btn-lg"
												disabled={!canScore}
												onClick={() => inc("team2")}
											>
												+
											</button>
										</div>
										<div className="keyboard-hint mt-2">L (+) / P (-)</div>
									</div>
								</div>
							)}

							{/* Manual score edit toggle */}
							{canScore && (
								<div style={{ textAlign: "center", marginTop: 12 }}>
									{editingScore ? (
										<div className="btn-group" style={{ justifyContent: "center" }}>
											<button className="btn btn-success btn-sm" onClick={saveManualScore}>
												Zapisz wynik
											</button>
											<button className="btn btn-secondary btn-sm" onClick={cancelEditingScore}>
												Anuluj
											</button>
										</div>
									) : (
										<button className="btn btn-secondary btn-sm" onClick={startEditingScore}>
											Ustaw wynik ręcznie
										</button>
									)}
								</div>
							)}

							{/* Set Controls - only for sets mode */}
							{canScore && scoringMode === "sets" && (
								<div className="set-controls">
									<button className="btn btn-secondary" onClick={() => awardSetToTeam("team1")}>
										Przyznaj set: {t1?.name || "D1"}
									</button>
									<button
										className="btn btn-secondary"
										onClick={undoLastSet}
										disabled={!score?.setScores?.length}
									>
										↶ Cofnij ostatni set
									</button>
									<button className="btn btn-secondary" onClick={() => awardSetToTeam("team2")}>
										Przyznaj set: {t2?.name || "D2"}
									</button>
								</div>
							)}
						</div>

						{/* Match Controls */}
						<div className="card">
							<div className="card-header">
								<h2>Kontrola meczu</h2>
							</div>
							<div className="btn-group">
								<button
									className="btn btn-success btn-lg"
									disabled={!canStart}
									onClick={() => {
										start();
										if (isTimedMode) setTimerRunning(false);
									}}
								>
									▶ Rozpocznij mecz
								</button>

								<button
									className="btn btn-primary btn-lg"
									disabled={match.status !== "live" || !match.team1Id}
									onClick={() => forceWinner(match.team1Id!, t1?.name || "Drużyna 1")}
								>
									Wygrywa {t1?.name || "Drużyna 1"}
								</button>
								<button
									className="btn btn-primary btn-lg"
									disabled={match.status !== "live" || !match.team2Id}
									onClick={() => forceWinner(match.team2Id!, t2?.name || "Drużyna 2")}
								>
									Wygrywa {t2?.name || "Drużyna 2"}
								</button>

								<button
									className="btn btn-danger btn-lg"
									onClick={() => {
										setTimerRunning(false);
										reset();
									}}
								>
									↺ Resetuj mecz
								</button>
							</div>

							{match.winnerId && (
								<div className="info-message mt-2">
									<strong>Zwycięzca:</strong> {teamLabel(teams.find(t => t.id === match.winnerId))}
								</div>
							)}

							{error && <div className="error-message">{error}</div>}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
