import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore } from "../../stores/tournament.store";
import { useEventStore, type MatchStats, type PlayerStats } from "../../stores/event.store";
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

export function TeamStatsPage() {
	const { id: teamId } = useParams<{ id: string }>();
	const { socket } = useSocket();
	const { tournament, teams } = useTournamentStore();
	const { teamStats, playerStats, setTeamStats, setPlayerStats } = useEventStore();

	const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
	const [loading, setLoading] = useState(false);

	const tournamentId = tournament?.id ?? "";
	const team = teams.find(t => t.id === teamId);
	const statsEnabled = tournament?.settings?.playerStatsEnabled === true;

	// Fetch team stats
	useEffect(() => {
		if (!socket || !tournamentId || !teamId) return;
		setLoading(true);
		socket.emit(
			"stats:team:get",
			{ tournamentId, teamId },
			(ack: Ack<MatchStats>) => {
				setLoading(false);
				if (ack.ok && ack.data) setTeamStats(tournamentId, teamId, ack.data);
			}
		);
	}, [socket, tournamentId, teamId, setTeamStats]);

	// Fetch player stats
	useEffect(() => {
		if (!socket || !tournamentId) return;
		socket.emit("stats:player:get", { tournamentId }, (ack: Ack<PlayerStats[]>) => {
			if (ack.ok) setPlayerStats(tournamentId, ack.data ?? []);
		});
	}, [socket, tournamentId, setPlayerStats]);

	// Fetch team players
	useEffect(() => {
		if (!socket || !teamId) return;
		socket.emit("player:list", { teamId }, (ack: Ack<Player[]>) => {
			if (ack.ok && ack.data) setTeamPlayers(ack.data);
		});
	}, [socket, teamId]);

	const ts = teamStats[`${tournamentId}:${teamId}`];
	const allPlayerStats = playerStats[tournamentId] ?? [];

	const getPlayerStats = (playerId: string) =>
		allPlayerStats.find(ps => ps.playerId === playerId);

	// Sum both team slots for team totals
	const getTotal = (type: string) =>
		ts
			? (ts.team1[type as keyof typeof ts.team1] ?? 0) +
			  (ts.team2[type as keyof typeof ts.team2] ?? 0)
			: 0;

	if (!team) {
		return (
			<div className="display-page">
				<div className="display-container">
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-text">Nie znaleziono drużyny.</div>
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
					<h1 style={{ color: team.color || undefined }}>
						{team.name} — Statystyki
					</h1>
					<Link to="/display/stats" className="btn btn-secondary btn-sm">
						Powrót
					</Link>
				</div>

				{!statsEnabled && (
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-icon">📊</div>
							<div className="empty-state-text">Statystyki graczy są wyłączone.</div>
						</div>
					</div>
				)}

				{statsEnabled && (
					<>
						{/* Team event breakdown */}
						<div className="card">
							<div className="card-header">
								<h2>Statystyki drużyny</h2>
							</div>
							{loading ? (
								<div className="text-muted" style={{ padding: 16 }}>Ładowanie...</div>
							) : (
								<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
									{EVENT_LABELS.map(({ key, label }) => (
										<div key={key} className="stats-event-card">
											<div className="stats-event-card__label">{label}</div>
											<div className="stats-event-card__value">{getTotal(key)}</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Player roster with stats */}
						<div className="card">
							<div className="card-header">
								<h2>Zawodnicy ({teamPlayers.length})</h2>
							</div>
							{teamPlayers.length === 0 ? (
								<div className="empty-state">
									<div className="empty-state-text">Brak zawodników w drużynie.</div>
								</div>
							) : (
								<div style={{ overflowX: "auto" }}>
									<table className="stats-table">
										<thead>
											<tr>
												<th className="stats-table__th">#</th>
												<th className="stats-table__th">Zawodnik</th>
												<th className="stats-table__th">Pozycja</th>
												<th className="stats-table__th">Asy</th>
												<th className="stats-table__th">Auty</th>
												<th className="stats-table__th">Bloki</th>
												<th className="stats-table__th">Siatki</th>
												<th className="stats-table__th">Challenge</th>
												<th className="stats-table__th">Czas</th>
												<th className="stats-table__th">Razem</th>
											</tr>
										</thead>
										<tbody>
											{teamPlayers.map(player => {
												const ps = getPlayerStats(player.id);
												return (
													<tr key={player.id} className="stats-table__row">
														<td className="stats-table__td stats-table__td--num">
															{player.jerseyNumber ?? "—"}
														</td>
														<td className="stats-table__td stats-table__td--name">
															<Link to={`/display/stats/player/${player.id}`} className="stats-link">
																{player.name}
															</Link>
														</td>
														<td className="stats-table__td">
															{player.position ? POSITION_LABELS[player.position] ?? player.position : "—"}
														</td>
														<td className="stats-table__td stats-table__td--num">{ps?.stats["ace"] ?? 0}</td>
														<td className="stats-table__td stats-table__td--num">{ps?.stats["ball-out"] ?? 0}</td>
														<td className="stats-table__td stats-table__td--num">{ps?.stats["block"] ?? 0}</td>
														<td className="stats-table__td stats-table__td--num">{ps?.stats["net-touch"] ?? 0}</td>
														<td className="stats-table__td stats-table__td--num">{ps?.stats["challenge"] ?? 0}</td>
														<td className="stats-table__td stats-table__td--num">{ps?.stats["timeout"] ?? 0}</td>
														<td className="stats-table__td stats-table__td--num stats-table__td--total">{ps?.totalEvents ?? 0}</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
