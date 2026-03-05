import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore, type Team, type Tournament, type TournamentState } from "../../stores/tournament.store";
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
	score: {
		team1Sets: number;
		team2Sets: number;
		team1CurrentPoints: number;
		team2CurrentPoints: number;
	} | null;
};

type BracketViewMode = "modern" | "classic";

const ADMIN_BRACKET_VIEW_KEY = "bracket_editor_view_mode";
const ADMIN_BRACKET_EXPANDED_KEY = "bracket_editor_expanded_rounds";

function readAdminBracketView(): BracketViewMode {
	try {
		return localStorage.getItem(ADMIN_BRACKET_VIEW_KEY) === "classic" ? "classic" : "modern";
	} catch {
		return "modern";
	}
}

function readExpandedRounds(): number[] {
	try {
		const raw = localStorage.getItem(ADMIN_BRACKET_EXPANDED_KEY);
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

export function BracketEditor() {
	const { socket } = useSocket();
	const { tournament, teams, setTournament, setTeams } = useTournamentStore();
	const [bracket, setBracket] = useState<BracketMatch[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<BracketViewMode>(readAdminBracketView);
	const [expandedRounds, setExpandedRounds] = useState<number[]>([]);
	const { addToast } = useToast();
	const confirm = useConfirm();
	const navigate = useNavigate();
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

		const onBracket = (items: BracketMatch[]) => setBracket(items);

		socket.on("tournament:state", onState);
		socket.on("bracket:updated", onBracket);

		return () => {
			socket.off("tournament:state", onState);
			socket.off("bracket:updated", onBracket);
		};
	}, [socket, setTournament, setTeams, navigate]);

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
		for (const m of regularMatches) {
			map.set(m.roundNumber, [...(map.get(m.roundNumber) ?? []), m]);
		}
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
		try {
			localStorage.setItem(ADMIN_BRACKET_VIEW_KEY, viewMode);
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
			localStorage.setItem(ADMIN_BRACKET_EXPANDED_KEY, JSON.stringify(expandedRounds));
		} catch {
			// Ignore storage write errors.
		}
	}, [expandedRounds]);

	// Compute which teams are already assigned in round 1 (for duplicate prevention)
	const assignedTeamIds = useMemo(() => {
		const round1 = rounds.find(r => r.round === 1);
		if (!round1) return new Set<string>();
		const ids = new Set<string>();
		for (const m of round1.matches) {
			if (m.team1Id) ids.add(m.team1Id);
			if (m.team2Id) ids.add(m.team2Id);
		}
		return ids;
	}, [rounds]);

	// Get available teams for a given dropdown slot (exclude already-assigned, but include the current value)
	const getAvailableTeams = (currentTeamId: string | null) => {
		return teams.filter(t => t.id === currentTeamId || !assignedTeamIds.has(t.id));
	};

	// Count how many round-1 slots are still unassigned
	const unassignedSlotCount = useMemo(() => {
		const round1 = rounds.find(r => r.round === 1);
		if (!round1) return 0;
		let count = 0;
		for (const m of round1.matches) {
			if (!m.team1Id) count++;
			if (!m.team2Id) count++;
		}
		return count;
	}, [rounds]);

	const teamLabel = (t: Team | undefined) => {
		if (!t) return "—";
		return t.name;
	};

	const gen = async (mode: "auto" | "manual") => {
		if (!socket || !tournament) return;
		setError(null);

		// Check if bracket already exists - confirm before overwriting
		if (bracket.length > 0) {
			const hasLiveOrCompleted = bracket.some(m => m.status === "live" || m.status === "completed");
			const message = hasLiveOrCompleted
				? "Istnieje już drabinka z meczami w toku lub zakończonymi. Wygenerowanie nowej drabinki usunie wszystkie dotychczasowe wyniki. Czy na pewno chcesz kontynuować?"
				: "Istnieje już drabinka. Wygenerowanie nowej zastąpi obecną. Czy na pewno chcesz kontynuować?";
			const confirmed = await confirm({
				title: "Nadpisz drabinkę",
				message,
				confirmText: "Generuj nową",
				danger: hasLiveOrCompleted
			});
			if (!confirmed) return;

			// Clear existing bracket first, then generate new one
			await new Promise<void>((resolve, reject) => {
				socket.emit("admin:bracket:clear", { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
					if (!ack.ok) {
						setError(ack.error);
						addToast(ack.error, "error");
						reject(new Error(ack.error));
					} else {
						resolve();
					}
				});
			});
		}

		socket.emit("admin:bracket:generate", { tournamentId: tournament.id, mode }, (ack: Ack<BracketMatch[]>) => {
			if (!ack.ok) {
				setError(ack.error);
				addToast(ack.error, "error");
				return;
			}
			if (ack.data) setBracket(ack.data);
			addToast(
				mode === "auto" ? "Drabinka wygenerowana automatycznie" : "Drabinka wygenerowana — przypisz drużyny ręcznie",
				"success"
			);
		});
	};

	const clear = async () => {
		if (!socket || !tournament) return;
		const confirmed = await confirm({
			title: "Wyczyść drabinkę",
			message:
				"Czy na pewno chcesz wyczyścić całą drabinkę? Ta operacja jest nieodwracalna i usunie wszystkie mecze i wyniki.",
			confirmText: "Wyczyść",
			danger: true,
			skippable: false
		});
		if (!confirmed) return;
		setError(null);
		socket.emit("admin:bracket:clear", { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
			if (!ack.ok) {
				setError(ack.error);
				addToast(ack.error, "error");
				return;
			}
			if (ack.data) setBracket(ack.data);
			addToast("Drabinka wyczyszczona", "info");
		});
	};

	const assign = (matchId: string, slot: "team1" | "team2", teamId: string | null) => {
		if (!socket || !tournament) return;
		setError(null);
		socket.emit(
			"admin:bracket:assign",
			{ tournamentId: tournament.id, matchId, slot, teamId },
			(ack: Ack<BracketMatch[]>) => {
				if (!ack.ok) {
					setError(ack.error);
					addToast(ack.error, "error");
					return;
				}
				if (ack.data) setBracket(ack.data);
			}
		);
	};

	const allExpanded = rounds.length > 0 && rounds.every(r => expandedRounds.includes(r.round));

	const toggleRoundExpanded = (round: number) => {
		setExpandedRounds(prev =>
			prev.includes(round) ? prev.filter(item => item !== round) : [...prev, round].sort((a, b) => a - b)
		);
	};

	const toggleExpandAll = () => {
		if (allExpanded) {
			setExpandedRounds(earliestUnfinishedRound ? [earliestUnfinishedRound] : []);
			return;
		}
		setExpandedRounds(rounds.map(r => r.round));
	};

	const getWaitingHint = (match: BracketMatch, slot: "team1" | "team2") => {
		if (match.roundNumber === 1) return "Nie przypisano drużyny";
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

	const renderMatchCard = (match: BracketMatch, round: number, isThirdPlace = false) => {
		const team1 = teams.find(t => t.id === match.team1Id);
		const team2 = teams.find(t => t.id === match.team2Id);

		const renderSlot = (slot: "team1" | "team2") => {
			const isTeam1 = slot === "team1";
			const team = isTeam1 ? team1 : team2;
			const teamId = isTeam1 ? match.team1Id : match.team2Id;
			const teamColor = team?.color || undefined;
			const isWinner = match.winnerId != null && match.winnerId === teamId;
			const editable = round === 1 && match.status === "pending";

			return (
				<div key={slot} className={`bracket-slim-row ${isWinner ? "bracket-slim-row--winner" : ""}`}>
					<div className="bracket-slim-row__left">
						{editable ? (
							<select
								className="form-select bracket-slim-select"
								value={teamId ?? ""}
								onChange={e => assign(match.id, slot, e.target.value ? e.target.value : null)}
							>
								<option value="">— Wybierz drużynę —</option>
								{getAvailableTeams(teamId).map(item => (
									<option key={item.id} value={item.id}>
										{teamLabel(item)}
									</option>
								))}
							</select>
						) : team ? (
							<span className="bracket-slim-row__team" style={{ color: teamColor }}>
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
				<div className="bracket-slim-card__footer">
					<Link to={`/admin/match/${match.id}`} className="btn btn-secondary btn-sm">
						Kontrola meczu
					</Link>
				</div>
			</div>
		);
	};

	return (
		<>
			{/* Actions */}
			<div className="card">
				<div className="card-header card-header--tight">
					<h2>Drabinka turniejowa</h2>
					<div className="page-header__actions">
						<button
							className="btn btn-primary btn-sm"
							onClick={() => gen("auto")}
							disabled={!tournament || teams.length < 2}
						>
							Generuj auto
						</button>
						<button
							className="btn btn-secondary btn-sm"
							onClick={() => gen("manual")}
							disabled={!tournament || teams.length < 2}
						>
							Generuj ręcznie
						</button>
						{bracket.length > 0 && (
							<button className="btn btn-danger btn-sm" onClick={clear}>
								Wyczyść
							</button>
						)}
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
					</div>
				</div>
				{error && <div className="error-message">{error}</div>}
				{teams.length < 2 && (
					<div className="info-message">
						Potrzebujesz co najmniej 2 drużyn, aby wygenerować drabinkę.{" "}
						<Link to="/admin/teams">Dodaj drużyny →</Link>
					</div>
				)}
			</div>

			{/* Manual assignment info */}
			{bracket.length > 0 && unassignedSlotCount > 0 && (
				<div className="card">
					<div className="info-message">
						Przypisz drużyny do {unassignedSlotCount} wolnych miejsc w 1. rundzie. Każda drużyna może wystąpić
						tylko raz. Pozostałe rundy wypełnią się automatycznie na podstawie zwycięzców.
					</div>
				</div>
			)}

			{/* Bracket */}
			{rounds.length === 0 ? (
				<div className="card">
					<div className="empty-state">
						<div className="empty-state-icon">🏆</div>
						<div className="empty-state-text">
							Brak drabinki. Dodaj drużyny i wygeneruj drabinkę, aby rozpocząć turniej.
						</div>
					</div>
				</div>
			) : (
				<div className="bracket-shell bracket-shell--admin">
					{viewMode === "modern" && rounds.length > 1 && (
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
									<div className="list">{matches.map(match => renderMatchCard(match, round))}</div>
								</div>
							))}
						</div>
					) : (
						<div className="bracket-accordion-columns">
							{rounds.map(({ round, matches }) => {
								const meta = roundCompletion.find(item => item.round === round);
								const isExpanded = expandedRounds.includes(round);
								const completion = `${meta?.completed ?? 0}/${meta?.total ?? matches.length} ukończono`;

								return (
									<section
										key={round}
										className={`bracket-accordion-round ${isExpanded ? "bracket-accordion-round--expanded" : "bracket-accordion-round--collapsed"} ${meta?.allCompleted ? "bracket-accordion-round--completed" : ""} ${meta?.allPending ? "bracket-accordion-round--future" : ""}`}
									>
										<button
											type="button"
											className="bracket-accordion-round__header"
											aria-expanded={isExpanded}
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
											<div className="list bracket-accordion-round__matches">
												{matches.map(match => renderMatchCard(match, round))}
											</div>
										)}
									</section>
								);
							})}
						</div>
					)}

					{thirdPlaceMatch && (
						<section className="bracket-third-place-section">
							<h3>🥉 Mecz o 3. miejsce</h3>
							{renderMatchCard(thirdPlaceMatch, thirdPlaceMatch.roundNumber, true)}
						</section>
					)}
				</div>
			)}
		</>
	);
}
