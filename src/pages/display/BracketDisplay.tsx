import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore, type Team, type Tournament, type TournamentState } from "../../stores/tournament.store";
import { useMatchStore } from "../../stores/match.store";
import { ChallengeBanner } from "../../components/display/ChallengeBanner";
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
	score: {
		team1Sets: number;
		team2Sets: number;
		team1CurrentPoints: number;
		team2CurrentPoints: number;
	} | null;
};

type BracketViewMode = "modern" | "classic";

const PUBLIC_BRACKET_VIEW_KEY = "bracket_display_view_mode";
const PUBLIC_BRACKET_EXPANDED_KEY = "bracket_display_expanded_rounds";

function readPublicBracketView(): BracketViewMode {
	try {
		return localStorage.getItem(PUBLIC_BRACKET_VIEW_KEY) === "classic" ? "classic" : "modern";
	} catch {
		return "modern";
	}
}

function readExpandedRounds(): number[] {
	try {
		const raw = localStorage.getItem(PUBLIC_BRACKET_EXPANDED_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.map(v => Number(v)).filter(v => Number.isInteger(v) && v > 0);
	} catch {
		return [];
	}
}

function getRoundName(round: number, totalRounds: number) {
	if (round === totalRounds) return "Finał";
	if (round === totalRounds - 1) return "Półfinały";
	if (round === totalRounds - 2) return "Ćwierćfinały";
	return `Runda ${round}`;
}

function getStatusLabel(status: BracketMatch["status"]) {
	if (status === "live") return "W TRAKCIE";
	if (status === "completed") return "ZAKOŃCZONY";
	return "OCZEKUJE";
}

export function BracketDisplay() {
	const { socket, connected, reconnecting, onReconnect } = useSocket();
	const { tournament, teams, setTournament, setTeams } = useTournamentStore();
	const challenge = useMatchStore(s => s.challenge);
	const [bracket, setBracket] = useState<BracketMatch[]>([]);
	const [viewMode, setViewMode] = useState<BracketViewMode>(readPublicBracketView);
	const [expandedRounds, setExpandedRounds] = useState<number[]>([]);
	const [currentRound, setCurrentRound] = useState<number | null>(null);
	const [viewportWidth, setViewportWidth] = useState<number>(() =>
		typeof window === "undefined" ? 1200 : window.innerWidth
	);
	const touchStartX = useRef<number | null>(null);
	const touchStartY = useRef<number | null>(null);

	// Function to refresh all state from server
	const refreshState = useCallback(() => {
		if (!socket) return;
		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
			// Load bracket
			socket.emit("bracket:list", { tournamentId: ack.data.id }, (bracketAck: Ack<BracketMatch[]>) => {
				if (bracketAck.ok && bracketAck.data) setBracket(bracketAck.data);
			});
		});
	}, [socket, setTournament]);

	// Subscribe to reconnect events
	useEffect(() => {
		return onReconnect(() => {
			refreshState();
		});
	}, [onReconnect, refreshState]);

	useEffect(() => {
		if (!socket) return;

		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
		});

		const onState = (state: TournamentState) => {
			setTournament(state.tournament);
			setTeams(state.teams);
		};

		const onBracket = (items: BracketMatch[]) => setBracket(items);

		socket.on("tournament:state", onState);
		socket.on("bracket:updated", onBracket);

		return () => {
			socket.off("tournament:state", onState);
			socket.off("bracket:updated", onBracket);
		};
	}, [socket, setTournament, setTeams]);

	const load = () => {
		if (!socket || !tournament) return;
		socket.emit("bracket:list", { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
			if (!ack.ok || !ack.data) return;
			setBracket(ack.data);
		});
	};

	useEffect(() => {
		if (!tournament) return;
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tournament?.id]);

	const { rounds, thirdPlaceMatch } = useMemo(() => {
		const regularMatches = bracket.filter(m => !m.isThirdPlaceMatch);
		const thirdPlace = bracket.find(m => m.isThirdPlaceMatch) ?? null;

		const map = new Map<number, BracketMatch[]>();
		for (const m of regularMatches) map.set(m.roundNumber, [...(map.get(m.roundNumber) ?? []), m]);
		const roundsList = Array.from(map.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([round, matches]) => ({ round, matches: matches.sort((a, b) => a.positionInRound - b.positionInRound) }));

		return { rounds: roundsList, thirdPlaceMatch: thirdPlace };
	}, [bracket]);

	const totalRounds = Math.max(...rounds.map(r => r.round), 0);

	const roundCompletion = useMemo(
		() =>
			rounds.map(({ round, matches }) => {
				const completed = matches.filter(m => m.status === "completed").length;
				const allCompleted = matches.length > 0 && completed === matches.length;
				const allPending = matches.length > 0 && matches.every(m => m.status === "pending");
				return { round, completed, total: matches.length, allCompleted, allPending };
			}),
		[rounds]
	);

	const earliestUnfinishedRound = useMemo(() => {
		for (const { round, matches } of rounds) {
			if (matches.some(m => m.status !== "completed")) return round;
		}
		return rounds[0]?.round ?? null;
	}, [rounds]);

	useEffect(() => {
		const onResize = () => setViewportWidth(window.innerWidth);
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(PUBLIC_BRACKET_VIEW_KEY, viewMode);
		} catch {
			// Ignore storage write errors.
		}
	}, [viewMode]);

	useEffect(() => {
		const available = new Set(rounds.map(r => r.round));
		if (available.size === 0) {
			setExpandedRounds([]);
			return;
		}

		setExpandedRounds(prev => {
			const validPrev = prev.filter(round => available.has(round));
			if (validPrev.length > 0) return validPrev;

			const stored = readExpandedRounds().filter(round => available.has(round));
			const fallback = earliestUnfinishedRound ?? rounds[0]?.round ?? null;
			const merged = Array.from(new Set([...(fallback ? [fallback] : []), ...stored]));
			return merged;
		});
	}, [earliestUnfinishedRound, rounds]);

	useEffect(() => {
		try {
			localStorage.setItem(PUBLIC_BRACKET_EXPANDED_KEY, JSON.stringify(expandedRounds));
		} catch {
			// Ignore storage write errors.
		}
	}, [expandedRounds]);

	useEffect(() => {
		const available = new Set(rounds.map(r => r.round));
		if (available.size === 0) {
			setCurrentRound(null);
			return;
		}

		setCurrentRound(prev => {
			if (prev && available.has(prev)) return prev;
			return earliestUnfinishedRound ?? rounds[0]?.round ?? null;
		});
	}, [earliestUnfinishedRound, rounds]);

	const teamLabel = (t: Team | undefined) => {
		if (!t) return "—";
		return t.name;
	};

	const allExpanded = rounds.length > 0 && rounds.every(r => expandedRounds.includes(r.round));
	const useTreeLayout = viewMode === "modern" && viewportWidth >= 1440;

	const toggleRoundExpanded = (round: number) => {
		setExpandedRounds(prev =>
			prev.includes(round) ? prev.filter(item => item !== round) : [...prev, round].sort((a, b) => a - b)
		);
		setCurrentRound(round);
	};

	const toggleExpandAll = () => {
		if (allExpanded) {
			const fallback = earliestUnfinishedRound ?? rounds[0]?.round ?? null;
			setExpandedRounds(fallback ? [fallback] : []);
			setCurrentRound(fallback);
			return;
		}
		setExpandedRounds(rounds.map(r => r.round));
	};

	const moveRound = useCallback(
		(delta: -1 | 1) => {
			if (rounds.length === 0) return;
			const roundNumbers = rounds.map(r => r.round);
			const active = currentRound ?? earliestUnfinishedRound ?? roundNumbers[0];
			const currentIndex = roundNumbers.indexOf(active);
			if (currentIndex < 0) return;
			const nextIndex = Math.min(roundNumbers.length - 1, Math.max(0, currentIndex + delta));
			const nextRound = roundNumbers[nextIndex];
			setExpandedRounds([nextRound]);
			setCurrentRound(nextRound);
		},
		[currentRound, earliestUnfinishedRound, rounds]
	);

	const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
		if (useTreeLayout) return;
		const touch = event.touches[0];
		touchStartX.current = touch.clientX;
		touchStartY.current = touch.clientY;
	};

	const onTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
		if (useTreeLayout) return;
		if (touchStartX.current == null || touchStartY.current == null) return;

		const touch = event.changedTouches[0];
		const deltaX = touch.clientX - touchStartX.current;
		const deltaY = touch.clientY - touchStartY.current;

		if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 35) {
			if (deltaX < 0) moveRound(1);
			if (deltaX > 0) moveRound(-1);
		}

		touchStartX.current = null;
		touchStartY.current = null;
	};

	const getWaitingHint = (match: BracketMatch, slot: "team1" | "team2") => {
		if (match.roundNumber === 1) return "Oczekuje na drużynę";
		if (match.isThirdPlaceMatch) {
			const semifinalRound = Math.max(1, totalRounds - 1);
			const semifinalIndex = slot === "team1" ? 1 : 2;
			return `Przegrany R${semifinalRound} #${semifinalIndex}`;
		}
		const sourcePosition = slot === "team1" ? match.positionInRound * 2 - 1 : match.positionInRound * 2;
		return `Zwycięzca R${match.roundNumber - 1} #${sourcePosition}`;
	};

	const getTeamScore = (match: BracketMatch, slot: "team1" | "team2") => {
		if (!match.score) return "—";
		const value =
			match.status === "live"
				? slot === "team1"
					? match.score.team1CurrentPoints
					: match.score.team2CurrentPoints
				: slot === "team1"
					? match.score.team1Sets
					: match.score.team2Sets;

		if (match.status === "pending" && value === 0) return "—";
		return String(value);
	};

	const renderMatchCard = (match: BracketMatch, isThirdPlace = false) => {
		const team1 = teams.find(t => t.id === match.team1Id);
		const team2 = teams.find(t => t.id === match.team2Id);

		const renderSlot = (slot: "team1" | "team2") => {
			const isTeam1 = slot === "team1";
			const team = isTeam1 ? team1 : team2;
			const teamId = isTeam1 ? match.team1Id : match.team2Id;
			const isWinner = match.winnerId != null && match.winnerId === teamId;

			return (
				<div key={slot} className={`bracket-slim-row ${isWinner ? "bracket-slim-row--winner" : ""}`}>
					<div className="bracket-slim-row__left">
						{team ? (
							<span className="bracket-slim-row__team" style={{ color: team.color || undefined }}>
								{teamLabel(team)}
							</span>
						) : (
							<span className="bracket-slim-row__hint">{getWaitingHint(match, slot)}</span>
						)}
					</div>
					<span className="bracket-slim-row__score">{getTeamScore(match, slot)}</span>
				</div>
			);
		};

		return (
			<div key={match.id} className={`bracket-slim-card bracket-slim-card--${match.status}`}>
				<div className="bracket-slim-card__head">
					<span className="match-number">{isThirdPlace ? "Mecz o 3. miejsce" : `Mecz #${match.matchNumber}`}</span>
					<span className={`bracket-status-pill bracket-status-pill--${match.status}`}>
						<span className="bracket-status-pill__dot" />
						{getStatusLabel(match.status)}
					</span>
				</div>
				<div className="bracket-slim-card__body">
					{renderSlot("team1")}
					{renderSlot("team2")}
				</div>
			</div>
		);
	};

	const currentRoundLabel = currentRound ? getRoundName(currentRound, totalRounds) : "—";

	return (
		<div className="display-page">
			<div className="display-container display-container--bracket">
				<div className="display-header">
					<h1>🏆 {tournament?.name ?? "Turniej"} – Drabinka</h1>
					<div className="display-header__actions">
						<div className="bracket-view-pill" role="tablist" aria-label="Tryb widoku drabinki">
							<button
								type="button"
								className={`bracket-view-pill__btn ${viewMode === "modern" ? "is-active" : ""}`}
								onClick={() => setViewMode("modern")}
							>
								Bracket View
							</button>
							<button
								type="button"
								className={`bracket-view-pill__btn ${viewMode === "classic" ? "is-active" : ""}`}
								onClick={() => setViewMode("classic")}
							>
								Classic View
							</button>
						</div>
						<span
							className={`status-badge ${connected ? "connected" : reconnecting ? "reconnecting" : "disconnected"}`}
						>
							{connected ? "Online" : reconnecting ? "Łączenie..." : "Offline"}
						</span>
						<Link to="/display/fan" className="btn btn-secondary btn-sm">
							Wynik na żywo
						</Link>
					</div>
				</div>

				{/* Challenge banner */}
				{challenge && (
					<ChallengeBanner
						challenge={challenge}
						team1Name={teams[0]?.name ?? "D1"}
						team2Name={teams[1]?.name ?? "D2"}
						team1Color={teams[0]?.color}
						team2Color={teams[1]?.color}
					/>
				)}

				{rounds.length === 0 ? (
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-icon">🏆</div>
							<div className="empty-state-text">Drabinka nie została jeszcze wygenerowana.</div>
						</div>
					</div>
				) : (
					<div className="bracket-shell bracket-shell--public">
						<div className="bracket-sticky-bar">
							<div className="bracket-sticky-bar__title">{tournament?.name ?? "Turniej"}</div>
							<div className="bracket-sticky-bar__round">{currentRoundLabel}</div>
						</div>

						{viewMode === "modern" && !useTreeLayout && rounds.length > 1 && (
							<div className="bracket-shell__toolbar">
								<button type="button" className="bracket-expand-link" onClick={toggleExpandAll}>
									{allExpanded ? "Zwiń wszystkie" : "Rozwiń wszystkie"}
								</button>
							</div>
						)}

						{viewMode === "classic" ? (
							<div className="bracket-rounds">
								{rounds.map(({ round, matches }) => (
									<div key={round} className="bracket-round">
										<h3>{getRoundName(round, totalRounds)}</h3>
										<div className="list">{matches.map(match => renderMatchCard(match))}</div>
									</div>
								))}
							</div>
						) : useTreeLayout ? (
							<div className="public-bracket-tree">
								{rounds.map(({ round, matches }, index) => (
									<section key={round} className="public-bracket-tree__round">
										<div className="public-bracket-tree__head">
											<h3>{getRoundName(round, totalRounds)}</h3>
											<span>{matches.length} mecz(e)</span>
										</div>
										<div className="public-bracket-tree__matches">
											{matches.map(match => (
												<div
													key={match.id}
													className={`public-bracket-tree__node ${index < rounds.length - 1 ? "public-bracket-tree__node--connector" : ""}`}
												>
													{renderMatchCard(match)}
												</div>
											))}
										</div>
									</section>
								))}
							</div>
						) : (
							<div className="bracket-accordion-columns" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
								{rounds.map(({ round, matches }) => {
									const meta = roundCompletion.find(item => item.round === round);
									const isExpanded = expandedRounds.includes(round);
									const completion = `${meta?.completed ?? 0}/${meta?.total ?? matches.length} ukończono`;

									return (
										<section
											key={round}
											className={`bracket-accordion-round ${meta?.allCompleted ? "bracket-accordion-round--completed" : ""} ${meta?.allPending ? "bracket-accordion-round--future" : ""}`}
										>
											<button
												type="button"
												className="bracket-accordion-round__header"
												onClick={() => toggleRoundExpanded(round)}
											>
												<div className="bracket-accordion-round__title">
													<span className="bracket-accordion-round__icon">
														{meta?.allCompleted ? "✓" : meta?.allPending ? "◷" : "•"}
													</span>
													<span>{getRoundName(round, totalRounds)}</span>
												</div>
												<div className="bracket-accordion-round__meta">{matches.length} mecz(e)</div>
												<div className="bracket-accordion-round__summary">{completion}</div>
											</button>
											{isExpanded && (
												<div className="list">{matches.map(match => renderMatchCard(match))}</div>
											)}
										</section>
									);
								})}
							</div>
						)}

						{thirdPlaceMatch && (
							<section className="bracket-third-place-section">
								<h3>🥉 Mecz o 3. miejsce</h3>
								{renderMatchCard(thirdPlaceMatch, true)}
							</section>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
