import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore } from "../../stores/tournament.store";
import { useEventStore, type PlayerStats } from "../../stores/event.store";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string };

type Player = {
	id: string;
	teamId: string;
	name: string;
	jerseyNumber?: number | null;
	position?: string | null;
};

const EVENT_LABELS: { key: string; label: string }[] = [
	{ key: "ace", label: "Asy" },
	{ key: "ball-out", label: "Auty" },
	{ key: "block", label: "Bloki" },
	{ key: "net-touch", label: "Siatki" },
	{ key: "challenge", label: "Challenge" },
	{ key: "timeout", label: "Czas" },
];

const POSITION_LABELS: Record<string, string> = {
	setter: "Rozgrywający",
	libero: "Libero",
	outside: "Atakujący z lewej",
	middle: "Środkowy",
	opposite: "Atakujący z prawej",
	universal: "Uniwersalny",
};

export function PlayerStatsPage() {
	const { id: playerId } = useParams<{ id: string }>();
	const { socket } = useSocket();
	const { tournament, teams } = useTournamentStore();
	const { playerStats, setPlayerStats } = useEventStore();

	const [player, setPlayer] = useState<Player | null>(null);
	const [loading, setLoading] = useState(false);

	const tournamentId = tournament?.id ?? "";
	const statsEnabled = tournament?.settings?.playerStatsEnabled === true;

	// Fetch all player stats for this tournament
	useEffect(() => {
		if (!socket || !tournamentId || !playerId) return;
		setLoading(true);
		socket.emit(
			"stats:player:get",
			{ tournamentId, playerId },
			(ack: Ack<PlayerStats[]>) => {
				setLoading(false);
				if (ack.ok) setPlayerStats(tournamentId, ack.data ?? []);
			}
		);
	}, [socket, tournamentId, playerId, setPlayerStats]);

	// Find player info from all teams
	useEffect(() => {
		if (!socket || !playerId || teams.length === 0) return;

		for (const team of teams) {
			socket.emit("player:list", { teamId: team.id }, (ack: Ack<Player[]>) => {
				if (ack.ok && ack.data) {
					const found = ack.data.find(p => p.id === playerId);
					if (found) setPlayer(found);
				}
			});
		}
	}, [socket, playerId, teams]);

	const allStats = playerStats[tournamentId] ?? [];
	const ps = allStats.find(s => s.playerId === playerId);
	const team = teams.find(t => t.id === player?.teamId);

	if (!playerId) {
		return (
			<div className="display-page">
				<div className="display-container">
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-text">Nie znaleziono zawodnika.</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="display-page">
			<div className="display-container">
				<div className="display-header">
					<h1>
						{player?.name ?? "Zawodnik"} — Statystyki
					</h1>
					<div className="flex items-center gap-2">
						{team && (
							<Link to={`/display/stats/team/${team.id}`} className="btn btn-secondary btn-sm">
								{team.name}
							</Link>
						)}
						<Link to="/display/stats" className="btn btn-secondary btn-sm">
							Powrót
						</Link>
					</div>
				</div>

				{!statsEnabled ? (
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-icon">📊</div>
							<div className="empty-state-text">Statystyki graczy są wyłączone.</div>
						</div>
					</div>
				) : loading ? (
					<div className="card">
						<div className="text-muted" style={{ padding: 16 }}>Ładowanie...</div>
					</div>
				) : (
					<>
						{/* Player info card */}
						<div className="card">
							<div className="card-header">
								<h2>Profil zawodnika</h2>
							</div>
							<div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
								<div className="stats-player-card">
									{player?.jerseyNumber != null && (
										<div className="stats-player-card__number">
											#{player.jerseyNumber}
										</div>
									)}
									<div className="stats-player-card__name">{player?.name ?? "—"}</div>
									{player?.position && (
										<div className="stats-player-card__position">
											{POSITION_LABELS[player.position] ?? player.position}
										</div>
									)}
									{team && (
										<div className="stats-player-card__team" style={{ color: team.color || undefined }}>
											{team.name}
										</div>
									)}
								</div>

								{/* Event stats grid */}
								<div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, minWidth: 280 }}>
									{EVENT_LABELS.map(({ key, label }) => (
										<div key={key} className="stats-event-card">
											<div className="stats-event-card__label">{label}</div>
											<div className="stats-event-card__value">{ps?.stats[key as keyof typeof ps.stats] ?? 0}</div>
										</div>
									))}
									<div className="stats-event-card stats-event-card--total">
										<div className="stats-event-card__label">Razem</div>
										<div className="stats-event-card__value">{ps?.totalEvents ?? 0}</div>
									</div>
								</div>
							</div>
						</div>

						{!ps && (
							<div className="card">
								<div className="empty-state">
									<div className="empty-state-icon">📊</div>
									<div className="empty-state-text">
										Brak zarejestrowanych zdarzeń dla tego zawodnika.
									</div>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
