import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useMatchStore, type MatchScore } from "../../stores/match.store";
import { useTournamentStore, type Tournament, type TournamentState } from "../../stores/tournament.store";
import { useToast } from "../../components/Toast";
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

export function Dashboard() {
	const { socket, onReconnect } = useSocket();
	const { tournament, teams, setTournament, setTeams } = useTournamentStore();
	const { setMatchId, setMatchTeams, setScore } = useMatchStore();
	const { addToast } = useToast();
	const [tournamentName, setTournamentName] = useState("");
	const [bracket, setBracket] = useState<BracketMatch[]>([]);
	const [saving, setSaving] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [kebabOpen, setKebabOpen] = useState(false);
	const kebabRef = useRef<HTMLDivElement>(null);

	// Function to refresh all state from server
	const refreshState = useCallback(() => {
		if (!socket) return;
		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			setLoaded(true);
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
			setTournamentName(ack.data.name);

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
			addToast("Połączono ponownie - odświeżam stan", "info");
		});
	}, [onReconnect, refreshState, addToast]);

	useEffect(() => {
		if (!socket) return;
		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			setLoaded(true);
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
			setTournamentName(ack.data.name);
		});

		const onTournamentUpdated = (t: Tournament) => {
			setTournament(t);
			setTournamentName(t.name);
		};
		const onMatchScore = (s: MatchScore) => setScore(s);
		const onState = (state: TournamentState) => {
			setTournament(state.tournament);
			setTournamentName(state.tournament.name);
			setTeams(state.teams);
			if (state.currentMatch?.id) {
				setMatchId(state.currentMatch.id);
				setMatchTeams(state.currentMatch.team1Id ?? null, state.currentMatch.team2Id ?? null);
			}
			if (state.score) setScore(state.score as MatchScore);
		};
		const onBracket = (items: BracketMatch[]) => setBracket(items);
		const onStatusChanged = (data: { tournamentId: string; oldStatus: string; newStatus: string }) => {
			const labels: Record<string, string> = { draft: "Szkic", live: "W trakcie", completed: "Zakończony" };
			addToast(`Turniej zmienił status na: ${labels[data.newStatus] ?? data.newStatus}`, "info");
		};

		socket.on("tournament:updated", onTournamentUpdated);
		socket.on("match:score", onMatchScore);
		socket.on("tournament:state", onState);
		socket.on("bracket:updated", onBracket);
		socket.on("tournament:status:changed", onStatusChanged);

		return () => {
			socket.off("tournament:updated", onTournamentUpdated);
			socket.off("match:score", onMatchScore);
			socket.off("tournament:state", onState);
			socket.off("bracket:updated", onBracket);
			socket.off("tournament:status:changed", onStatusChanged);
		};
	}, [socket, setTournament, setTeams, setScore, setMatchId, setMatchTeams]);

	useEffect(() => {
		if (!socket || !tournament) return;
		socket.emit("bracket:list", { tournamentId: tournament.id }, (ack: Ack<BracketMatch[]>) => {
			if (ack.ok && ack.data) setBracket(ack.data);
		});
	}, [socket, tournament, tournament?.id]);

	const saveTournamentName = () => {
		if (!socket || !tournament || !tournamentName.trim()) return;
		setSaving(true);
		socket.emit("admin:tournament:update", { tournamentId: tournament.id, patch: { name: tournamentName.trim() } }, () =>
			setSaving(false)
		);
	};

	const liveMatch = bracket.find(m => m.status === "live");
	const hasTeams = teams.length >= 2;
	const hasBracket = bracket.length > 0;
	const pendingMatches = bracket.filter(m => m.status === "pending" && m.team1Id && m.team2Id);

	const getWorkflowStep = () => {
		if (!hasTeams) return 1;
		if (!hasBracket) return 2;
		if (liveMatch) return 4;
		if (pendingMatches.length > 0) return 3;
		return 3;
	};
	const currentStep = getWorkflowStep();

	const team1 = liveMatch ? teams.find(t => t.id === liveMatch.team1Id) : null;
	const team2 = liveMatch ? teams.find(t => t.id === liveMatch.team2Id) : null;

	// Close kebab on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) {
				setKebabOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// Show a brief loading / empty-state while the socket responds
	if (!tournament) {
		return (
			<>
				<div className="page-header">
					<h1>Dashboard</h1>
				</div>
				<div className="card">
					<div className="empty-state">
						<div className="empty-state-icon">🏆</div>
						<div className="empty-state-text">
							{loaded ? "Brak turnieju. Utwórz aby rozpocząć." : "Ładowanie..."}
						</div>
						{loaded && (
							<Link to="/admin/tournament/new" className="btn btn-primary" style={{ marginTop: 16 }}>
								+ Utwórz turniej
							</Link>
						)}
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			{/* Workflow Steps */}
			<div className="workflow">
				<div className={`workflow-step ${currentStep > 1 ? "completed" : currentStep === 1 ? "active" : ""}`}>
					<span className="workflow-step-number">{currentStep > 1 ? "✓" : "1"}</span>
					<span>Dodaj drużyny</span>
				</div>
				<span className="workflow-arrow">→</span>
				<div className={`workflow-step ${currentStep > 2 ? "completed" : currentStep === 2 ? "active" : ""}`}>
					<span className="workflow-step-number">{currentStep > 2 ? "✓" : "2"}</span>
					<span>Wygeneruj drabinkę</span>
				</div>
				<span className="workflow-arrow">→</span>
				<div className={`workflow-step ${currentStep > 3 ? "completed" : currentStep === 3 ? "active" : ""}`}>
					<span className="workflow-step-number">{currentStep > 3 ? "✓" : "3"}</span>
					<span>Rozgrywaj mecze</span>
				</div>
			</div>

			{/* Tournament Settings */}
			<div className="card">
				<div className="card-header">
					<div className="flex items-center gap-1">
						<h2>Turniej</h2>
						{tournament && (
							<span className={`status-badge ${tournament.status}`}>
								{tournament.status === "draft"
									? "Szkic"
									: tournament.status === "live"
										? "W trakcie"
										: "Zakończony"}
							</span>
						)}
						{tournament?.settings?.scoring && (
							<span className="status-badge draft">
								{tournament.settings.scoring.mode === "sets"
									? `Sety (do ${tournament.settings.scoring.setsToWin})`
									: tournament.settings.scoring.mode === "timed"
										? "Na czas"
										: "Punkty"}
							</span>
						)}
					</div>
					{/* Kebab menu for tournament management */}
					<div className="admin-dropdown" ref={kebabRef}>
						<button
							type="button"
							className="kebab-btn"
							onClick={() => setKebabOpen(!kebabOpen)}
							aria-label="Więcej opcji"
							title="Więcej opcji"
						>
							⋮
						</button>
						{kebabOpen && (
							<div className="admin-dropdown__menu admin-dropdown__menu--right">
								<Link
									to={`/admin/tournament/${tournament.id}`}
									className="admin-dropdown__item"
									onClick={() => setKebabOpen(false)}
								>
									<span>⚙️</span> Ustawienia punktacji
								</Link>
								<Link
									to="/admin/tournaments"
									className="admin-dropdown__item"
									onClick={() => setKebabOpen(false)}
								>
									<span>⇄</span> Zmień turniej
								</Link>
								<div className="admin-dropdown__divider" />
								<Link
									to="/admin/tournament/new"
									className="admin-dropdown__item"
									onClick={() => setKebabOpen(false)}
								>
									<span>➕</span> Nowy turniej
								</Link>
							</div>
						)}
					</div>
				</div>
				{tournament ? (
					<div className="form-row">
						<div className="form-group mb-0" style={{ flex: 2 }}>
							<label className="form-label">Nazwa turnieju</label>
							<input
								className="form-input"
								value={tournamentName}
								onChange={e => setTournamentName(e.target.value)}
								placeholder="Nazwa turnieju"
							/>
						</div>
						<div className="form-group mb-0" style={{ flex: 0 }}>
							<label className="form-label">&nbsp;</label>
							<button
								className="btn btn-primary"
								onClick={saveTournamentName}
								disabled={saving || tournamentName === tournament.name}
							>
								{saving ? "Zapisywanie..." : "Zapisz"}
							</button>
						</div>
					</div>
				) : (
					<div className="text-muted">Ładowanie...</div>
				)}
			</div>

			{/* Quick Stats */}
			<div className="grid grid-3">
				<div className="card">
					<div className="card-header">
						<h3>Drużyny</h3>
					</div>
					<div style={{ fontSize: 48, fontWeight: 700, marginBottom: 12 }}>{teams.length}</div>
					{currentStep === 1 && (
						<div className="text-muted mb-1" style={{ fontSize: 13 }}>
							Dodaj co najmniej 2 drużyny, aby wygenerować drabinkę.
						</div>
					)}
					<Link to="/admin/teams" className="btn btn-secondary btn-sm">
						{teams.length === 0 ? "Dodaj drużyny" : "Zarządzaj drużynami"}
					</Link>
				</div>

				<div className="card">
					<div className="card-header">
						<h3>Drabinka</h3>
					</div>
					<div style={{ fontSize: 48, fontWeight: 700, marginBottom: 12 }}>
						{bracket.length > 0
							? `${bracket.filter(m => m.status === "completed").length}/${bracket.length}`
							: "—"}
					</div>
					{currentStep === 2 && (
						<div className="text-muted mb-1" style={{ fontSize: 13 }}>
							Masz {teams.length} drużyn — wygeneruj drabinkę.
						</div>
					)}
					<Link to="/admin/bracket" className="btn btn-secondary btn-sm">
						{bracket.length === 0 ? "Wygeneruj drabinkę" : "Edytuj drabinkę"}
					</Link>
				</div>

				<div className="card">
					<div className="card-header">
						<h3>Aktualny mecz</h3>
					</div>
					{liveMatch ? (
						<>
							<div className="live-indicator mb-2">
								<span className="live-dot"></span>
								<span>NA ŻYWO</span>
							</div>
							<div style={{ fontSize: 14, marginBottom: 12 }}>
								<span style={{ color: team1?.color || undefined }}>{team1?.name || "—"}</span>
								<span className="text-dim"> vs </span>
								<span style={{ color: team2?.color || undefined }}>{team2?.name || "—"}</span>
							</div>
							<Link to={`/admin/match/${liveMatch.id}`} className="btn btn-primary btn-sm">
								Kontroluj mecz
							</Link>
						</>
					) : (
						<>
							<div className="text-muted mb-2">Brak aktywnego meczu</div>
							{pendingMatches.length > 0 && (
								<Link to="/admin/bracket" className="btn btn-secondary btn-sm">
									Rozpocznij mecz
								</Link>
							)}
						</>
					)}
				</div>
			</div>

			{/* Guidance for ready-to-play state */}
			{currentStep === 3 && pendingMatches.length > 0 && !liveMatch && (
				<div className="info-message">
					<strong>Gotowe do gry:</strong> Masz {pendingMatches.length} oczekujących meczów.{" "}
					<Link to="/admin/bracket">Przejdź do drabinki →</Link>
				</div>
			)}
		</>
	);
}
