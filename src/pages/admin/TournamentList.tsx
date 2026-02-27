import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore, type Tournament } from "../../stores/tournament.store";
import { useToast } from "../../components/Toast";
import { useConfirm } from "../../components/ConfirmModal";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };

export function TournamentList() {
	const { socket, connected, reconnecting } = useSocket();
	const { tournament: activeTournament, setTournament } = useTournamentStore();
	const { addToast } = useToast();
	const confirm = useConfirm();
	const navigate = useNavigate();

	const [tournaments, setTournaments] = useState<Tournament[]>([]);
	const [loading, setLoading] = useState(true);
	const [switching, setSwitching] = useState<string | null>(null);
	const [deleting, setDeleting] = useState<string | null>(null);

	useEffect(() => {
		if (!socket) return;

		let cancelled = false;
		socket.emit("tournament:list", null, (ack: Ack<Tournament[]>) => {
			if (cancelled) return;
			setLoading(false);
			if (ack.ok) setTournaments(ack.data);
		});

		const onListUpdated = () => {
			setLoading(true);
			socket.emit("tournament:list", null, (ack: Ack<Tournament[]>) => {
				if (cancelled) return;
				setLoading(false);
				if (ack.ok) setTournaments(ack.data);
			});
		};
		socket.on("tournament:list:updated", onListUpdated);
		return () => {
			cancelled = true;
			socket.off("tournament:list:updated", onListUpdated);
		};
	}, [socket]);

	const handleSwitch = useCallback(
		(t: Tournament) => {
			if (!socket) return;
			if (t.id === activeTournament?.id) {
				navigate("/admin");
				return;
			}
			setSwitching(t.id);
			socket.emit("tournament:join", { tournamentId: t.id }, (ack: Ack<Tournament>) => {
				setSwitching(null);
				if (!ack.ok) {
					addToast("Nie udało się przełączyć turnieju", "error");
					return;
				}
				setTournament(ack.data);
				addToast(`Przełączono na: ${ack.data.name}`, "success");
				navigate("/admin");
			});
		},
		[socket, activeTournament, setTournament, addToast, navigate]
	);

	const handleDelete = useCallback(
		async (t: Tournament) => {
			if (!socket) return;
			const confirmed = await confirm({
				title: "Usuń turniej",
				message: `Czy na pewno chcesz usunąć turniej "${t.name}"? Ta operacja jest nieodwracalna i usunie wszystkie drużyny, zawodników i mecze.`,
				confirmText: "Usuń turniej",
				danger: true,
				requireTypedConfirmation: "USUŃ"
			});
			if (!confirmed) return;

			setDeleting(t.id);
			socket.emit("admin:tournament:delete", { tournamentId: t.id }, (ack: { ok: boolean; error?: string }) => {
				setDeleting(null);
				if (!ack.ok) {
					addToast(ack.error ?? "Błąd usuwania", "error");
					return;
				}
				addToast("Turniej usunięty", "success");
				// If we just deleted the active tournament, clear it
				if (activeTournament?.id === t.id) {
					// will auto-refresh via tournament:list:updated
				}
			});
		},
		[socket, activeTournament, confirm, addToast]
	);

	const statusLabel = (s: Tournament["status"]) => {
		if (s === "draft") return "Szkic";
		if (s === "live") return "W trakcie";
		return "Zakończony";
	};

	return (
		<div className="admin-page">
			<div className="admin-container">
				<header className="admin-header">
					<div className="flex items-center gap-2">
						<Link to="/admin" className="btn btn-secondary btn-sm">
							← Powrót
						</Link>
						<h1>Turnieje</h1>
						<span
							className={`status-badge ${connected ? "connected" : reconnecting ? "reconnecting" : "disconnected"}`}
						>
							{connected ? "Połączono" : reconnecting ? "Łączenie..." : "Rozłączono"}
						</span>
					</div>
					<Link to="/admin/tournament/new" className="btn btn-primary">
						+ Nowy turniej
					</Link>
				</header>

				<div className="card">
					<div className="card-header">
						<h2>Wszystkie turnieje</h2>
						<span className="text-muted text-sm">
							Kliknij &quot;Przełącz&quot;, aby zarządzać innym turniejem
						</span>
					</div>

					{loading ? (
						<div className="text-muted">Ładowanie...</div>
					) : tournaments.length === 0 ? (
						<div style={{ textAlign: "center", padding: "40px 0" }}>
							<div className="text-muted" style={{ marginBottom: 16 }}>
								Brak turniejów. Utwórz pierwszy turniej, aby zacząć.
							</div>
							<Link to="/admin/tournament/new" className="btn btn-primary">
								+ Utwórz turniej
							</Link>
						</div>
					) : (
						<div className="tournament-list">
							{tournaments.map(t => {
								const isActive = t.id === activeTournament?.id;
								const isSwitching = switching === t.id;
								const isDeleting = deleting === t.id;
								return (
									<div
										key={t.id}
										className={`tournament-list-item${isActive ? " tournament-list-item--active" : ""}`}
									>
										<div className="tournament-list-item__info">
											<div className="tournament-list-item__name">
												{t.name}
												{isActive && (
													<span className="tournament-list-item__active-tag">aktywny</span>
												)}
											</div>
											<div className="tournament-list-item__meta">
												<span className={`status-badge ${t.status}`}>{statusLabel(t.status)}</span>
												{t.settings?.scoring && (
													<span className="text-muted text-sm">
														{t.settings.scoring.mode === "sets"
															? `Do ${t.settings.scoring.setsToWin} setów`
															: t.settings.scoring.mode === "timed"
																? `Na czas (${t.settings.scoring.matchDurationMinutes ?? 10} min)`
																: "Tylko punkty"}
													</span>
												)}
											</div>
										</div>
										<div className="tournament-list-item__actions">
											<button
												className={`btn btn-sm ${isActive ? "btn-secondary" : "btn-primary"}`}
												onClick={() => handleSwitch(t)}
												disabled={isSwitching || isDeleting}
											>
												{isSwitching ? "Przełączanie..." : isActive ? "Zarządzaj" : "Przełącz"}
											</button>
											<Link to={`/admin/tournament/${t.id}`} className="btn btn-secondary btn-sm">
												Ustawienia
											</Link>
											<button
												className="btn btn-danger btn-sm"
												onClick={() => handleDelete(t)}
												disabled={isSwitching || isDeleting}
											>
												{isDeleting ? "Usuwanie..." : "Usuń"}
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
