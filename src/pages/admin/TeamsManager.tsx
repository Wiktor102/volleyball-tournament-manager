import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore, type Team, type Tournament, type TournamentState } from "../../stores/tournament.store";
import { useToast } from "../../components/Toast";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

type TeamDraft = { name: string; shortName: string; color: string };

type Drafts = Record<string, TeamDraft>;

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

		return () => {
			socket.off("tournament:state", onState);
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
