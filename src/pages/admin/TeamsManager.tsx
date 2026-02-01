import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore, type Team, type Tournament, type TournamentState } from "../../stores/tournament.store";
import { useToast } from "../../components/Toast";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

type TeamDraft = { name: string; shortName: string; color: string };
type Drafts = Record<string, TeamDraft>;

type Player = {
	id: string;
	teamId: string;
	name: string;
};

const randomColor = () => {
	const c = Math.floor(Math.random() * 0xffffff).toString(16);
	return `#${c.padStart(6, "0")}`;
};

export function TeamsManager() {
	const { socket, connected } = useSocket();
	const { tournament, teams, setTournament, setTeams } = useTournamentStore();
	const { addToast } = useToast();

	const [name, setName] = useState("");
	const [shortName, setShortName] = useState("");
	const [color, setColor] = useState(() => randomColor());

	const [drafts, setDrafts] = useState<Drafts>({});
	const [editingId, setEditingId] = useState<string | null>(null);

	// Player management state
	const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
	const [players, setPlayers] = useState<Record<string, Player[]>>({});
	const [newPlayerName, setNewPlayerName] = useState("");
	const [loadingPlayers, setLoadingPlayers] = useState<string | null>(null);

	useEffect(() => {
		if (!socket) return;

		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok) return;
			setTournament(ack.data);
		});

		const onState = (state: TournamentState) => {
			setTournament(state.tournament);
			setTeams(state.teams);
			setDrafts(prev => {
				const next = { ...prev };
				for (const t of state.teams) {
					if (!next[t.id])
						next[t.id] = { name: t.name, shortName: t.shortName ?? "", color: t.color ?? randomColor() };
				}
				return next;
			});
		};

		socket.on("tournament:state", onState);

		// Player events
		const onPlayerCreated = (p: Player) => {
			setPlayers(prev => ({
				...prev,
				[p.teamId]: [...(prev[p.teamId] ?? []), p]
			}));
		};
		const onPlayerUpdated = (p: Player) => {
			setPlayers(prev => ({
				...prev,
				[p.teamId]: (prev[p.teamId] ?? []).map(x => x.id === p.id ? p : x)
			}));
		};
		const onPlayerDeleted = ({ playerId, teamId }: { playerId: string; teamId: string }) => {
			setPlayers(prev => ({
				...prev,
				[teamId]: (prev[teamId] ?? []).filter(x => x.id !== playerId)
			}));
		};

		socket.on("player:created", onPlayerCreated);
		socket.on("player:updated", onPlayerUpdated);
		socket.on("player:deleted", onPlayerDeleted);

		return () => {
			socket.off("tournament:state", onState);
			socket.off("player:created", onPlayerCreated);
			socket.off("player:updated", onPlayerUpdated);
			socket.off("player:deleted", onPlayerDeleted);
		};
	}, [socket, setTournament, setTeams]);

	const canCreate = useMemo(() => !!socket && !!tournament && name.trim().length > 0, [socket, tournament, name]);

	const create = () => {
		if (!socket || !tournament) return;
		socket.emit(
			"admin:team:create",
			{
				tournamentId: tournament.id,
				name: name.trim(),
				shortName: shortName.trim() || undefined,
				color: color.trim() || undefined
			},
			(ack: Ack<Team>) => {
				if (!ack.ok) {
					addToast(ack.error, "error");
					return;
				}
				setName("");
				setShortName("");
				setColor(randomColor());
				addToast(`Drużyna "${ack.data.name}" dodana`, "success");
			}
		);
	};

	const save = (teamId: string) => {
		if (!socket) return;
		const d = drafts[teamId];
		if (!d) return;
		socket.emit("admin:team:update", {
			teamId,
			patch: { name: d.name.trim(), shortName: d.shortName.trim() || null, color: d.color.trim() || null }
		});
		setEditingId(null);
		addToast("Drużyna zaktualizowana", "success");
	};

	const remove = (teamId: string) => {
		if (!socket) return;
		if (!confirm("Czy na pewno chcesz usunąć tę drużynę?")) return;
		socket.emit("admin:team:delete", { teamId });
		addToast("Drużyna usunięta", "info");
	};

	const cancelEdit = (teamId: string, team: Team) => {
		setDrafts(prev => ({
			...prev,
			[teamId]: { name: team.name, shortName: team.shortName ?? "", color: team.color ?? randomColor() }
		}));
		setEditingId(null);
	};

	// Player management functions
	const togglePlayers = (teamId: string) => {
		if (expandedTeamId === teamId) {
			setExpandedTeamId(null);
			return;
		}
		setExpandedTeamId(teamId);
		
		// Load players if not already loaded
		if (!players[teamId] && socket) {
			setLoadingPlayers(teamId);
			socket.emit("player:list", { teamId }, (ack: Ack<Player[]>) => {
				setLoadingPlayers(null);
				if (ack.ok) {
					setPlayers(prev => ({ ...prev, [teamId]: ack.data }));
				}
			});
		}
	};

	const addPlayer = (teamId: string) => {
		if (!socket || !newPlayerName.trim()) return;
		socket.emit("admin:player:create", { teamId, name: newPlayerName.trim() }, (ack: Ack<Player>) => {
			if (!ack.ok) {
				addToast(ack.error, "error");
				return;
			}
			setNewPlayerName("");
			addToast(`Zawodnik "${ack.data.name}" dodany`, "success");
		});
	};

	const removePlayer = (playerId: string, teamId: string) => {
		if (!socket) return;
		socket.emit("admin:player:delete", { playerId, teamId });
		addToast("Zawodnik usunięty", "info");
	};

	return (
		<div className="admin-page">
			<div className="admin-container">
				<header className="admin-header">
					<div className="flex items-center gap-2">
						<h1>Drużyny</h1>
						<span className={`status-badge ${connected ? "connected" : "disconnected"}`}>
							{connected ? "Połączono" : "Rozłączono"}
						</span>
					</div>
					<nav className="admin-nav">
						<Link to="/admin">← Panel główny</Link>
						<Link to="/admin/bracket">Drabinka</Link>
					</nav>
				</header>

				{/* Add Team Form */}
				<div className="card">
					<div className="card-header">
						<h2>Dodaj nową drużynę</h2>
					</div>
					{!tournament ? (
						<div className="text-muted">Ładowanie...</div>
					) : (
						<div className="form-row">
							<div className="form-group" style={{ flex: 2 }}>
								<label className="form-label">Nazwa drużyny *</label>
								<input
									className="form-input"
									placeholder="np. Siatkarze Wrocław"
									value={name}
									onChange={e => setName(e.target.value)}
								/>
							</div>
							<div className="form-group" style={{ flex: 1 }}>
								<label className="form-label">Skrót</label>
								<input
									className="form-input"
									placeholder="np. SWR"
									value={shortName}
									onChange={e => setShortName(e.target.value)}
									maxLength={5}
								/>
							</div>
							<div className="form-group" style={{ flex: 1 }}>
								<label className="form-label">Kolor</label>
								<div className="color-input-wrapper">
									<div className="color-preview" style={{ background: color }}></div>
									<input
										className="form-input"
										value={color}
										onChange={e => setColor(e.target.value)}
										placeholder="#f97316"
									/>
								</div>
							</div>
							<div className="form-group" style={{ flex: 0 }}>
								<label className="form-label">&nbsp;</label>
								<button className="btn btn-primary" onClick={create} disabled={!canCreate}>
									Dodaj drużynę
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Teams List */}
				<div className="card">
					<div className="card-header">
						<h2>Lista drużyn ({teams.length})</h2>
					</div>
					{teams.length === 0 ? (
						<div className="empty-state">
							<div className="empty-state-icon">🏐</div>
							<div className="empty-state-text">Brak drużyn. Dodaj pierwszą drużynę powyżej.</div>
						</div>
					) : (
						<div className="list">
							{teams.map(t => {
								const d = drafts[t.id] ?? {
									name: t.name,
									shortName: t.shortName ?? "",
									color: t.color ?? randomColor()
								};
								const isEditing = editingId === t.id;

								return (
									<div key={t.id} className="list-item">
										{isEditing ? (
											<>
												<div className="form-row mb-2">
													<div className="form-group mb-0" style={{ flex: 2 }}>
														<input
															className="form-input"
															value={d.name}
															onChange={e =>
																setDrafts(prev => ({
																	...prev,
																	[t.id]: { ...d, name: e.target.value }
																}))
															}
															placeholder="Nazwa drużyny"
														/>
													</div>
													<div className="form-group mb-0" style={{ flex: 1 }}>
														<input
															className="form-input"
															value={d.shortName}
															onChange={e =>
																setDrafts(prev => ({
																	...prev,
																	[t.id]: { ...d, shortName: e.target.value }
																}))
															}
															placeholder="Skrót"
															maxLength={5}
														/>
													</div>
													<div className="form-group mb-0" style={{ flex: 1 }}>
														<div className="color-input-wrapper">
															<div
																className="color-preview"
																style={{ background: d.color }}
															></div>
															<input
																className="form-input"
																value={d.color}
																onChange={e =>
																	setDrafts(prev => ({
																		...prev,
																		[t.id]: { ...d, color: e.target.value }
																	}))
																}
																placeholder="#f97316"
															/>
														</div>
													</div>
												</div>
												<div className="btn-group">
													<button className="btn btn-success btn-sm" onClick={() => save(t.id)}>
														Zapisz
													</button>
													<button
														className="btn btn-secondary btn-sm"
														onClick={() => cancelEdit(t.id, t)}
													>
														Anuluj
													</button>
												</div>
											</>
										) : (
											<div className="flex items-center justify-between">
												<div className="flex items-center gap-2">
													<div
														className="color-preview"
														style={{
															background: t.color || d.color || randomColor(),
															width: 24,
															height: 24
														}}
													></div>
													<div>
														<div
															className="list-item-title"
															style={{ color: t.color || d.color || undefined }}
														>
															{t.name}
															{t.shortName && (
																<span className="text-dim"> ({t.shortName})</span>
															)}
														</div>
													</div>
												</div>
												<div className="btn-group">
													<button
														className="btn btn-secondary btn-sm"
														onClick={() => togglePlayers(t.id)}
													>
														{expandedTeamId === t.id ? "Zwiń" : "Zawodnicy"}
													</button>
													<button
														className="btn btn-secondary btn-sm"
														onClick={() => setEditingId(t.id)}
													>
														Edytuj
													</button>
													<button className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>
														Usuń
													</button>
												</div>
											</div>
										)}

										{/* Players section */}
										{expandedTeamId === t.id && !isEditing && (
											<div className="players-section" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
												<div className="flex items-center justify-between mb-2">
													<strong style={{ fontSize: 14 }}>Zawodnicy</strong>
												</div>
												
												{loadingPlayers === t.id ? (
													<div className="text-muted">Ładowanie...</div>
												) : (
													<>
														{(players[t.id] ?? []).length === 0 ? (
															<div className="text-muted mb-2" style={{ fontSize: 13 }}>Brak zawodników w drużynie</div>
														) : (
															<ul className="player-list">
																{(players[t.id] ?? []).map(p => (
																	<li key={p.id} className="player-item">
																		<span>{p.name}</span>
																		<button
																			className="btn btn-danger btn-xs"
																			onClick={() => removePlayer(p.id, t.id)}
																		>
																			×
																		</button>
																	</li>
																))}
															</ul>
														)}
														
														<div className="form-row" style={{ marginTop: 8 }}>
															<input
																className="form-input form-input-sm"
																placeholder="Imię zawodnika"
																value={expandedTeamId === t.id ? newPlayerName : ""}
																onChange={e => setNewPlayerName(e.target.value)}
																onKeyDown={e => e.key === "Enter" && addPlayer(t.id)}
																style={{ flex: 1 }}
															/>
															<button
																className="btn btn-primary btn-sm"
																onClick={() => addPlayer(t.id)}
																disabled={!newPlayerName.trim()}
															>
																Dodaj
															</button>
														</div>
													</>
												)}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Helper Info */}
				{teams.length > 0 && teams.length < 2 && (
					<div className="info-message">Dodaj co najmniej 2 drużyny, aby móc wygenerować drabinkę turniejową.</div>
				)}
				{teams.length >= 2 && (
					<div className="info-message">
						Masz {teams.length} drużyn. Możesz teraz <Link to="/admin/bracket">wygenerować drabinkę →</Link>
					</div>
				)}
			</div>
		</div>
	);
}
