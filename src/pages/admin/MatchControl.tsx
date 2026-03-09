import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../../socket/context";
import {
	useTournamentStore,
	type Team,
	type Tournament,
	type TournamentState,
	type ScoringSettings
} from "../../stores/tournament.store";
import { useMatchStore, type MatchScore, type ChallengeState } from "../../stores/match.store";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import { EventPanel } from "../../components/match/EventPanel";
import "../../styles/admin.css";

type Player = { id: string; teamId: string; name: string };

type TeamSlot = "team1" | "team2";

type DisplaySide = {
	displaySlot: TeamSlot;
	actualSlot: TeamSlot;
	teamId: string | null;
	team: Team | undefined;
	name: string;
	color: string | undefined;
	points: number;
	sets: number;
};

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

const flipTeamSlot = (slot: TeamSlot): TeamSlot => (slot === "team1" ? "team2" : "team1");

const displaySideLabel = (slot: TeamSlot) => (slot === "team1" ? "Lewa strona" : "Prawa strona");

export function MatchControl() {
	const { matchId: matchIdParam } = useParams();
	const matchId = matchIdParam ?? "";

	const { socket } = useSocket();
	const { tournament, teams, setTournament, setTeams } = useTournamentStore();
	const challenge = useMatchStore(state => state.challenge);
	const setChallenge = useMatchStore(state => state.setChallenge);
	const { addToast } = useToast();
	const confirm = useConfirm();
	const navigate = useNavigate();

	const [match, setMatch] = useState<BracketMatch | null>(null);
	const [score, setScore] = useState<MatchScore | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [players, setPlayers] = useState<Player[]>([]);

	// Manual score editing state
	const [editingScore, setEditingScore] = useState(false);
	const [manualT1, setManualT1] = useState(0);
	const [manualT2, setManualT2] = useState(0);

	// Swap sides in admin view only
	const [swapped, setSwapped] = useState(false);

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

	// Tiebreak-by-total-points detection
	const scoringConfig = score?.scoringMode as ScoringSettings | undefined;
	const tiebreakByTotalPoints = scoringConfig?.tiebreakByTotalPoints ?? false;
	const _setsToWin = score?.setsToWin ?? 2;
	const _completedTotals = score?.setScores?.reduce((acc, s) => ({ t1: acc.t1 + s.t1, t2: acc.t2 + s.t2 }), {
		t1: 0,
		t2: 0
	});
	const isTotalPointsDecision =
		tiebreakByTotalPoints &&
		Math.abs((score?.team1Sets ?? 0) - (score?.team2Sets ?? 0)) === 1 &&
		Math.max(score?.team1Sets ?? 0, score?.team2Sets ?? 0) === _setsToWin - 1 &&
		(score?.setScores?.length ?? 0) >= (_setsToWin - 1) * 2 &&
		(_completedTotals?.t1 ?? 0) === (_completedTotals?.t2 ?? 0);
	const totalT1 = score?.setScores?.reduce((sum, s) => sum + s.t1, 0) ?? 0;
	const totalT2 = score?.setScores?.reduce((sum, s) => sum + s.t2, 0) ?? 0;

	// Suggested winner: team that has already met win criteria according to scoring rules.
	// Used to distinguish a "legitimate" win confirmation from a forced/override one.
	const suggestedWinnerId = useMemo((): string | null => {
		if (!match || match.status !== "live" || !score || !scoringMode) return null;
		if (scoringMode === "sets") {
			const setsToWin = score.setsToWin ?? 2;
			if ((score.team1Sets ?? 0) >= setsToWin && match.team1Id) return match.team1Id;
			if ((score.team2Sets ?? 0) >= setsToWin && match.team2Id) return match.team2Id;
		}
		// 'points' and 'timed' modes: no automatic win criteria in the UI
		return null;
	}, [match, score, scoringMode]);

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

	const resolveActualSlot = useCallback(
		(displaySlot: TeamSlot): TeamSlot => {
			return swapped ? flipTeamSlot(displaySlot) : displaySlot;
		},
		[swapped]
	);

	const getDisplayCurrentPoints = useCallback(
		(displaySlot: TeamSlot) => {
			const actualSlot = resolveActualSlot(displaySlot);
			return actualSlot === "team1" ? (score?.team1CurrentPoints ?? 0) : (score?.team2CurrentPoints ?? 0);
		},
		[resolveActualSlot, score?.team1CurrentPoints, score?.team2CurrentPoints]
	);

	const getDisplaySetPoints = useCallback(
		(displaySlot: TeamSlot, setIndex: number) => {
			const setScore = score?.setScores?.[setIndex];
			if (!setScore) return 0;
			const actualSlot = resolveActualSlot(displaySlot);
			return actualSlot === "team1" ? setScore.t1 : setScore.t2;
		},
		[resolveActualSlot, score?.setScores]
	);

	const displaySides = useMemo<DisplaySide[]>(() => {
		return (["team1", "team2"] as TeamSlot[]).map(displaySlot => {
			const actualSlot = resolveActualSlot(displaySlot);
			const teamId = actualSlot === "team1" ? (match?.team1Id ?? null) : (match?.team2Id ?? null);
			const team = teams.find(candidate => candidate.id === teamId);

			return {
				displaySlot,
				actualSlot,
				teamId,
				team,
				name: team?.name ?? (displaySlot === "team1" ? "Drużyna po lewej" : "Drużyna po prawej"),
				color: team?.color ?? undefined,
				points: actualSlot === "team1" ? (score?.team1CurrentPoints ?? 0) : (score?.team2CurrentPoints ?? 0),
				sets: actualSlot === "team1" ? (score?.team1Sets ?? 0) : (score?.team2Sets ?? 0)
			};
		});
	}, [
		match?.team1Id,
		match?.team2Id,
		resolveActualSlot,
		score?.team1CurrentPoints,
		score?.team1Sets,
		score?.team2CurrentPoints,
		score?.team2Sets,
		teams
	]);

	const [leftSide, rightSide] = displaySides;
	const challengeSide = challenge ? displaySides.find(side => side.actualSlot === challenge.team) : undefined;
	const suggestedWinnerSide = suggestedWinnerId ? displaySides.find(side => side.teamId === suggestedWinnerId) : undefined;

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

	// Load players for both teams once the match teams are known
	useEffect(() => {
		if (!socket || !match?.team1Id || !match?.team2Id) return;
		type PlayerAck = { ok: true; data: Player[] | null } | { ok: false; error: string };
		socket.emit("player:list", { teamIds: [match.team1Id, match.team2Id] }, (ack: PlayerAck) => {
			if (ack.ok && ack.data) setPlayers(ack.data);
		});
	}, [socket, match?.team1Id, match?.team2Id]);

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

	useEffect(() => {
		if (!socket || !matchId) {
			setChallenge(null);
			return;
		}

		const syncChallenge = () => {
			socket.emit("match:challenge:get", { matchId }, (ack: Ack<ChallengeState>) => {
				if (!ack.ok) {
					setChallenge(null);
					return;
				}
				setChallenge(ack.data);
			});
		};

		syncChallenge();

		const onChallenge = (nextChallenge: ChallengeState) => {
			if (!nextChallenge) {
				syncChallenge();
				return;
			}
			if (nextChallenge.matchId !== matchId) return;
			setChallenge(nextChallenge);
		};

		socket.on("match:challenge", onChallenge);

		return () => {
			socket.off("match:challenge", onChallenge);
		};
	}, [socket, matchId, setChallenge]);

	const inc = (team: "team1" | "team2") => {
		if (!socket || !matchId) return;
		const actualTeam = resolveActualSlot(team);
		socket.emit("admin:score:increment", { matchId, team: actualTeam });
	};

	const dec = (team: "team1" | "team2") => {
		if (!socket || !matchId) return;
		const actualTeam = resolveActualSlot(team);
		socket.emit("admin:score:decrement", { matchId, team: actualTeam });
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
		const actualTeam = resolveActualSlot(team);
		socket.emit("admin:set:award", { matchId, team: actualTeam });
		addToast("Set przyznany", "success");
	};

	const undoLastSet = () => {
		if (!socket || !matchId) return;
		socket.emit("admin:set:undo", { matchId });
		addToast("Cofnięto ostatni set", "info");
	};

	// Manual score input
	const startEditingScore = () => {
		setManualT1(getDisplayCurrentPoints("team1"));
		setManualT2(getDisplayCurrentPoints("team2"));
		setEditingScore(true);
	};

	const saveManualScore = () => {
		if (!socket || !matchId) return;
		const team1Points = resolveActualSlot("team1") === "team1" ? manualT1 : manualT2;
		const team2Points = resolveActualSlot("team2") === "team2" ? manualT2 : manualT1;
		socket.emit("admin:score:setDirect", { matchId, team1Points, team2Points });
		setEditingScore(false);
		addToast("Wynik ustawiony ręcznie", "success");
	};

	const cancelEditingScore = () => {
		setEditingScore(false);
	};

	// Set score editing
	const startEditingSet = (index: number) => {
		if (!score?.setScores?.[index]) return;
		setEditSetT1(getDisplaySetPoints("team1", index));
		setEditSetT2(getDisplaySetPoints("team2", index));
		setEditingSetIndex(index);
	};

	const saveSetEdit = () => {
		if (!socket || !matchId || editingSetIndex === null) return;
		const t1Points = resolveActualSlot("team1") === "team1" ? editSetT1 : editSetT2;
		const t2Points = resolveActualSlot("team2") === "team2" ? editSetT2 : editSetT1;
		socket.emit("admin:set:edit", { matchId, setIndex: editingSetIndex, t1: t1Points, t2: t2Points });
		setEditingSetIndex(null);
		addToast("Wynik seta zaktualizowany", "success");
	};

	const cancelSetEdit = () => {
		setEditingSetIndex(null);
	};

	// Force winner with confirmation.
	// If the team already meets the win criteria (suggestedWinnerId), show a simple
	// confirmation. Otherwise warn the admin that criteria aren't met.
	const forceWinner = async (winnerId: string, winnerName: string) => {
		if (!socket || !tournament || !matchId) return;

		const isMeetingCriteria = suggestedWinnerId === winnerId;

		let confirmed: boolean;
		if (isMeetingCriteria) {
			confirmed = await confirm({
				title: "Zatwierdź zwycięzcę",
				message: `Czy chcesz zakończyć mecz i ogłosić ${winnerName} zwycięzcą?`,
				confirmText: "Zakończ mecz",
				danger: false
			});
		} else {
			const winnerSets = winnerId === match?.team1Id ? (score?.team1Sets ?? 0) : (score?.team2Sets ?? 0);
			const setsNeeded = score?.setsToWin ?? 2;
			const criteriaNote = scoringMode === "sets" ? ` (ma ${winnerSets} z wymaganych ${setsNeeded} setów)` : "";
			confirmed = await confirm({
				title: "Wymuś zwycięzcę",
				message: `${winnerName} nie spełnia jeszcze kryteriów zwycięstwa${criteriaNote}. Czy mimo to chcesz zakończyć mecz i ogłosić ${winnerName} zwycięzcą?`,
				confirmText: "Tak, wymuś",
				danger: true
			});
		}

		if (!confirmed) return;
		syncTimer();
		end(winnerId);
	};

	// Current set elapsed time (live counter)
	const [currentSetElapsed, setCurrentSetElapsed] = useState("");

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
			if (e.key === "s" || e.key === "S") setSwapped(prev => !prev);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [canScore, socket, matchId, swapped]);

	if (!matchId) {
		return (
			<>
				<div className="card">
					<h2>Kontrola meczu</h2>
					<p className="text-muted">Brak ID meczu w URL.</p>
					<Link to="/admin/bracket" className="btn btn-secondary">
						← Wróć do drabinki
					</Link>
				</div>
			</>
		);
	}

	return (
		<div className="match-control-layout">
			{/* ── Row 1: Info bar ── */}
			<div className="mc-card mc-info">
				<Link to="/admin/bracket" className="btn btn-secondary btn-sm mc-info__back">
					←
				</Link>
				{match ? (
					<div className="mc-info__meta">
						<span className="text-muted">Mecz #{match.matchNumber}</span>
						<span className="text-dim">•</span>
						<span className="text-muted">Runda {match.roundNumber}</span>
						<span className="text-dim">•</span>
						<span className={`status-badge ${match.status}`}>
							{match.status === "pending" ? "Oczekuje" : match.status === "live" ? "Na żywo" : "Zakończony"}
						</span>
						{scoringMode && (
							<>
								<span className="text-dim">•</span>
								<span className="text-muted">
									{scoringMode === "sets" ? "Sety" : scoringMode === "points" ? "Punkty" : "Na czas"}
								</span>
							</>
						)}
					</div>
				) : (
					<span className="text-muted">Kontrola meczu</span>
				)}
				<div className="mc-info__right">
					{match && scoringMode !== "timed" && <span>Set: {score?.currentSet ?? 1}</span>}
					{match && (
						<span className={`mc-swap-state${swapped ? " mc-swap-state--active" : ""}`}>
							{swapped ? "Widok odwrócony" : "Standardowy układ"}
						</span>
					)}
					<div className="mc-btn-container" style={{ marginLeft: "0.5rem" }}>
						<button
							className={`btn btn-sm ${swapped ? "btn-primary" : "btn-secondary"}`}
							style={{ padding: "0 10px" }}
							onClick={() => setSwapped(!swapped)}
							title="Zmień strony (tylko widok admina)"
						>
							⇄ {swapped ? "Przywróć strony" : "Zamień strony"}
						</button>
						{canScore && <span className="mc-btn-shortcut">S</span>}
					</div>
				</div>
			</div>

			{/* ── Row 2: Sets display OR Timer ── */}
			{match && (
				<div className="mc-card">
					{isTimedMode ? (
						/* Timer display */
						<div className="mc-timer">
							<div
								className="mc-timer__value"
								style={{
									color: isOvertime
										? "var(--color-danger)"
										: timeRemaining < 60
											? "var(--color-warning)"
											: undefined
								}}
							>
								{isOvertime ? `+${formatTime(localTime - matchDurationSeconds)}` : formatTime(timeRemaining)}
							</div>
							<span className="text-muted" style={{ fontSize: 12 }}>
								{isOvertime ? "DOGRYWKA" : `z ${matchDuration} min`}
							</span>
							<div className="mc-timer__controls">
								<button
									className={`btn ${timerRunning ? "btn-warning" : "btn-success"} btn-sm`}
									onClick={toggleTimer}
									disabled={!canScore}
								>
									{timerRunning ? "⏸ Pauza" : "▶ Start"}
								</button>
								<button className="btn btn-secondary btn-sm" onClick={resetTimer} disabled={timerRunning}>
									↺ Reset
								</button>
							</div>
						</div>
					) : scoringMode === "sets" && (score?.setsToWin ?? 3) > 1 ? (
						/* Sets score display */
						<div className="mc-sets">
							<div className="mc-sets__summary">
								<div className="mc-sets__score">
									<span style={{ color: leftSide.color }}>{leftSide.sets}</span>
									<span className="mc-sets__separator">:</span>
									<span style={{ color: rightSide.color }}>{rightSide.sets}</span>
								</div>
								<div className="mc-sets__label">Sety (do {score?.setsToWin ?? 3})</div>
							</div>

							<div className="mc-sets__legend">
								{displaySides.map(side => (
									<div key={side.displaySlot} className="mc-side-pill" title={side.name}>
										<span className="mc-side-pill__label">{displaySideLabel(side.displaySlot)}</span>
										<strong className="mc-side-pill__name" style={{ color: side.color }}>
											{side.name}
										</strong>
									</div>
								))}
							</div>

							{/* Set history rows — side labels stay attached to each score */}
							{score?.setScores && score.setScores.length > 0 && (
								<div className="mc-set-list">
									{score.setScores.map((s, i) => {
										const leftSetPoints = getDisplaySetPoints("team1", i);
										const rightSetPoints = getDisplaySetPoints("team2", i);
										const leftWon = leftSetPoints > rightSetPoints;
										const rightWon = rightSetPoints > leftSetPoints;

										return editingSetIndex === i ? (
											<div key={i} className="mc-set-row mc-set-row--editing">
												<span className="mc-set-row__index">Set {i + 1}</span>
												<label className="mc-set-row__editor">
													<span
														className="mc-set-row__team-label"
														style={{ color: leftSide.color }}
														title={leftSide.name}
													>
														{leftSide.name}
													</span>
													<input
														type="number"
														className="form-input form-input-sm set-edit-input"
														value={editSetT1}
														onChange={e => setEditSetT1(Math.max(0, Number(e.target.value)))}
														min={0}
														autoFocus
													/>
												</label>
												<span className="mc-set-row__separator">:</span>
												<label className="mc-set-row__editor mc-set-row__editor--right">
													<span
														className="mc-set-row__team-label"
														style={{ color: rightSide.color }}
														title={rightSide.name}
													>
														{rightSide.name}
													</span>
													<input
														type="number"
														className="form-input form-input-sm set-edit-input"
														value={editSetT2}
														onChange={e => setEditSetT2(Math.max(0, Number(e.target.value)))}
														min={0}
													/>
												</label>
												<div className="mc-set-row__actions">
													<button className="btn btn-success btn-xs" onClick={saveSetEdit}>
														OK
													</button>
													<button className="btn btn-secondary btn-xs" onClick={cancelSetEdit}>
														✕
													</button>
												</div>
											</div>
										) : (
											<button
												type="button"
												key={i}
												className={`mc-set-row${canScore ? " mc-set-row--clickable" : ""}`}
												onClick={() => canScore && startEditingSet(i)}
												title={canScore ? "Kliknij, aby edytować wynik seta" : undefined}
											>
												<span className="mc-set-row__index">Set {i + 1}</span>
												<span className={`mc-set-row__scorebox${leftWon ? " is-winner" : ""}`}>
													<span
														className="mc-set-row__team-label"
														style={{ color: leftSide.color }}
														title={leftSide.name}
													>
														{leftSide.name}
													</span>
													<strong className="mc-set-row__points">{leftSetPoints}</strong>
												</span>
												<span className="mc-set-row__separator">:</span>
												<span className={`mc-set-row__scorebox${rightWon ? " is-winner" : ""}`}>
													<span
														className="mc-set-row__team-label"
														style={{ color: rightSide.color }}
														title={rightSide.name}
													>
														{rightSide.name}
													</span>
													<strong className="mc-set-row__points">{rightSetPoints}</strong>
												</span>
												<span className="mc-set-row__meta">
													{formatSetDuration(s.startedAt, s.endedAt) ?? ""}
												</span>
											</button>
										);
									})}
								</div>
							)}

							{canScore && (
								<div className="mc-sets__current">
									Aktualny set: <strong>{score?.currentSet ?? 1}</strong>
									{currentSetElapsed && (
										<span className="text-dim" style={{ marginLeft: 6 }}>
											({currentSetElapsed})
										</span>
									)}
								</div>
							)}

							{/* Total-points tiebreak decision banner */}
							{isTotalPointsDecision && match?.status !== "completed" && (
								<div
									className={`info-message ${totalT1 === totalT2 ? "" : "info-message--success"}`}
									style={{ marginTop: "0.75rem", textAlign: "center" }}
								>
									{Math.max(totalT1, totalT2) > Math.min(totalT1, totalT2) ? (
										<>
											<strong>
												🏆{" "}
												{totalT1 > totalT2
													? (teams.find(t => t.id === match.team1Id)?.name ?? "Drużyna 1")
													: (teams.find(t => t.id === match.team2Id)?.name ?? "Drużyna 2")}{" "}
												wygrywa
											</strong>{" "}
											na podstawie łącznych punktów ({totalT1} : {totalT2}). Zatwierdź zwycięzcę.
										</>
									) : (
										<>
											<strong>⚡ Remis punktowy</strong> ({totalT1} : {totalT2}) – gramy na przewagę do
											wyłonienia zwycięzcy!
										</>
									)}
								</div>
							)}
						</div>
					) : (
						/* Points mode: minimal current-set elapsed */
						<div className="mc-sets" style={{ justifyContent: "flex-start", gap: 8 }}>
							{canScore && currentSetElapsed && (
								<span className="mc-sets__current">
									Czas: <strong>{currentSetElapsed}</strong>
								</span>
							)}
						</div>
					)}
				</div>
			)}

			{/* ── Row 3: Score area ── */}
			<div className="mc-card mc-score">
				{!match ? (
					/* Match not found */
					<div className="empty-state" style={{ margin: "auto" }}>
						<div className="empty-state-icon">🏐</div>
						<div className="empty-state-text">Nie znaleziono meczu w drabince.</div>
						<button className="btn btn-secondary" onClick={loadMatch} disabled={!tournament}>
							Odśwież
						</button>
					</div>
				) : editingScore ? (
					/* Manual score editing mode */
					<>
						<div className="mc-score__team">
							<div className="mc-score__team-side">{displaySideLabel(leftSide.displaySlot)}</div>
							<div
								className="mc-score__team-name"
								style={{ color: leftSide.color }}
								title={teamLabel(leftSide.team)}
							>
								{leftSide.name}
							</div>
							<input
								type="number"
								className="form-input mc-score__manual-input"
								value={manualT1}
								onChange={e => setManualT1(Math.max(0, Number(e.target.value)))}
								min={0}
								autoFocus
							/>
						</div>
						<div className="mc-score__vs">vs</div>
						<div className="mc-score__team">
							<div className="mc-score__team-side">{displaySideLabel(rightSide.displaySlot)}</div>
							<div
								className="mc-score__team-name"
								style={{ color: rightSide.color }}
								title={teamLabel(rightSide.team)}
							>
								{rightSide.name}
							</div>
							<input
								type="number"
								className="form-input mc-score__manual-input"
								value={manualT2}
								onChange={e => setManualT2(Math.max(0, Number(e.target.value)))}
								min={0}
							/>
						</div>
					</>
				) : (
					/* Normal score display */
					<>
						<div className="mc-score__team">
							<div className="mc-score__team-side">{displaySideLabel(leftSide.displaySlot)}</div>
							<div
								className="mc-score__team-name"
								style={{ color: leftSide.color }}
								title={teamLabel(leftSide.team)}
							>
								{leftSide.name}
							</div>
							<div className="mc-score__value">{leftSide.points}</div>
							<div className="mc-score__controls">
								<div className="mc-btn-container">
									<button
										className="btn btn-secondary mc-btn-score"
										disabled={!canScore}
										onClick={() => dec("team1")}
									>
										−
									</button>
									{canScore && <span className="mc-btn-shortcut">Q</span>}
								</div>
								<div className="mc-btn-container">
									<button
										className="btn btn-primary mc-btn-score"
										disabled={!canScore}
										onClick={() => inc("team1")}
									>
										+
									</button>
									{canScore && <span className="mc-btn-shortcut">A</span>}
								</div>
							</div>
						</div>

						<div className="mc-score__vs">vs</div>

						<div className="mc-score__team">
							<div className="mc-score__team-side">{displaySideLabel(rightSide.displaySlot)}</div>
							<div
								className="mc-score__team-name"
								style={{ color: rightSide.color }}
								title={teamLabel(rightSide.team)}
							>
								{rightSide.name}
							</div>
							<div className="mc-score__value">{rightSide.points}</div>
							<div className="mc-score__controls">
								<div className="mc-btn-container">
									<button
										className="btn btn-secondary mc-btn-score"
										disabled={!canScore}
										onClick={() => dec("team2")}
									>
										−
									</button>
									{canScore && <span className="mc-btn-shortcut">P</span>}
								</div>
								<div className="mc-btn-container">
									<button
										className="btn btn-primary mc-btn-score"
										disabled={!canScore}
										onClick={() => inc("team2")}
									>
										+
									</button>
									{canScore && <span className="mc-btn-shortcut">L</span>}
								</div>
							</div>
						</div>
					</>
				)}
			</div>

			{/* ── Event Panel (collapsible, between score and footer) ── */}
			{match && tournament && (
				<EventPanel
					matchId={matchId}
					tournamentId={tournament.id}
					team1={
						leftSide.team
							? { id: leftSide.team.id, name: leftSide.team.name, color: leftSide.team.color }
							: undefined
					}
					team2={
						rightSide.team
							? { id: rightSide.team.id, name: rightSide.team.name, color: rightSide.team.color }
							: undefined
					}
					currentSet={score?.currentSet ?? 1}
					scoreSnapshot={{
						team1Points: leftSide.points,
						team2Points: rightSide.points,
						team1Sets: leftSide.sets,
						team2Sets: rightSide.sets
					}}
					matchEventsEnabled={true}
					playerStatsEnabled={false}
					canScore={!!canScore}
					players={players}
				/>
			)}

			{/* ── Row 4: Footer (set controls + match lifecycle) ── */}
			{match && (
				<div className="mc-card mc-footer">
					{challenge?.status === "pending" && (
						<div className="event-panel__challenge-pending" style={{ marginBottom: "0.75rem" }}>
							<div className="event-panel__challenge-info">
								<span className="event-panel__challenge-icon">⚡</span>
								<span className="event-panel__challenge-label">
									CHALLENGE —{" "}
									<span
										style={{
											color: challengeSide?.color
										}}
									>
										{challengeSide?.name ?? "Nieznana drużyna"}
									</span>
								</span>
								{challenge.reason && (
									<span className="event-panel__challenge-reason">{challenge.reason}</span>
								)}
							</div>
							<p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
								Ustaw wynik challenge, aby zaktualizować overlay OBS.
							</p>
						</div>
					)}

					{/* Manual score save/cancel bar */}
					{editingScore && (
						<div className="mc-score__manual-actions">
							<button className="btn btn-success btn-sm" onClick={saveManualScore}>
								Zapisz wynik
							</button>
							<button className="btn btn-secondary btn-sm" onClick={cancelEditingScore}>
								Anuluj
							</button>
						</div>
					)}

					{/* Set controls (sets mode, live, not in manual edit) */}
					{canScore && scoringMode === "sets" && !editingScore && (
						<div className="mc-footer__set-controls">
							<button className="btn btn-secondary btn-sm" onClick={() => awardSetToTeam("team1")}>
								Set dla {leftSide.name}
							</button>
							<button
								className="btn btn-secondary btn-sm"
								onClick={undoLastSet}
								disabled={!score?.setScores?.length}
							>
								↶ Cofnij set
							</button>
							<button className="btn btn-secondary btn-sm" onClick={() => awardSetToTeam("team2")}>
								Set dla {rightSide.name}
							</button>
						</div>
					)}

					{/* Match lifecycle controls */}
					<div className="mc-footer__match-controls">
						{match.status === "pending" && (
							<button
								className="btn btn-success btn-lg mc-win-btn"
								disabled={!canStart}
								onClick={() => {
									start();
									if (isTimedMode) setTimerRunning(false);
								}}
							>
								▶ Rozpocznij mecz
							</button>
						)}

						{match.status === "live" && (
							<>
								{/* Suggested winner banner */}
								{suggestedWinnerId && (
									<div
										className="info-message info-message--success"
										style={{ marginBottom: "0.5rem", textAlign: "center" }}
									>
										🏆 <strong>{suggestedWinnerSide?.name ?? "Ta drużyna"}</strong> osiągnął wymaganą
										liczbę setów – zatwierdź zwycięstwo.
									</div>
								)}
								<button
									className={`btn btn-sm mc-win-btn ${leftSide.teamId === suggestedWinnerId ? "btn-success" : "btn-secondary"}`}
									disabled={!leftSide.teamId}
									onClick={() => leftSide.teamId && forceWinner(leftSide.teamId, leftSide.name)}
								>
									🏆 Wygrywa {leftSide.name}
								</button>
								<button
									className={`btn btn-sm mc-win-btn ${rightSide.teamId === suggestedWinnerId ? "btn-success" : "btn-secondary"}`}
									disabled={!rightSide.teamId}
									onClick={() => rightSide.teamId && forceWinner(rightSide.teamId, rightSide.name)}
								>
									🏆 Wygrywa {rightSide.name}
								</button>
								{!editingScore && (
									<button className="btn btn-secondary btn-sm" onClick={startEditingScore}>
										✎ Wynik
									</button>
								)}
								<button
									className="btn btn-secondary btn-sm mc-footer__reset"
									onClick={() => {
										setTimerRunning(false);
										reset();
									}}
								>
									↺ Reset
								</button>
							</>
						)}

						{match.status === "completed" && (
							<>
								{match.winnerId && (
									<span className="text-muted" style={{ fontSize: 13 }}>
										Zwycięzca: <strong>{teamLabel(teams.find(t => t.id === match.winnerId))}</strong>
									</span>
								)}
								<button
									className="btn btn-secondary btn-sm mc-footer__reset"
									onClick={() => {
										setTimerRunning(false);
										reset();
									}}
								>
									↺ Resetuj mecz
								</button>
							</>
						)}
					</div>

					{error && (
						<div className="error-message" style={{ margin: 0 }}>
							{error}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
