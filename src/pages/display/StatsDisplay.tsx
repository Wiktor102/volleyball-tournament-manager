import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "../../socket/context";
import { useTournamentStore, type Team } from "../../stores/tournament.store";
import { useMatchStore } from "../../stores/match.store";
import { ChallengeBanner } from "../../components/display/ChallengeBanner";
import { useEventStore, type PlayerStats, type MatchStats } from "../../stores/event.store";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string };

type Player = {
	id: string;
	teamId: string;
	name: string;
	jerseyNumber?: number | null;
	position?: string | null;
};

function useAllPlayers(teams: Team[]) {
	const { socket } = useSocket();
	const [players, setPlayers] = useState<Player[]>([]);

	useEffect(() => {
		if (!socket || teams.length === 0) return;
		const fetched: Player[] = [];
		let pending = teams.length;

		for (const team of teams) {
			socket.emit("player:list", { teamId: team.id }, (ack: Ack<Player[]>) => {
				if (ack.ok && ack.data) fetched.push(...ack.data);
				pending--;
				if (pending === 0) setPlayers([...fetched]);
			});
		}
	}, [socket, teams]);

	return players;
}

export function StatsDisplay() {
	const { socket } = useSocket();
	const { tournament, teams } = useTournamentStore();
	const challenge = useMatchStore(s => s.challenge);
	const { playerStats, teamStats, setPlayerStats, setTeamStats } = useEventStore();

	const [loadedTournamentId, setLoadedTournamentId] = useState("");
	const allPlayers = useAllPlayers(teams);

	const statsEnabled = tournament?.settings?.playerStatsEnabled === true;
	const tournamentId = tournament?.id ?? "";
	const loading = Boolean(tournamentId) && loadedTournamentId !== tournamentId;

	// Fetch player stats
	useEffect(() => {
		if (!socket || !tournamentId) return;
		const key = tournamentId;
		socket.emit("stats:player:get", { tournamentId }, (ack: Ack<PlayerStats[]>) => {
			setLoadedTournamentId(key);
			if (ack.ok) setPlayerStats(tournamentId, ack.data ?? []);
		});
	}, [socket, tournamentId, setPlayerStats]);

	// Fetch team stats for all teams
	useEffect(() => {
		if (!socket || !tournamentId || teams.length === 0) return;
		for (const team of teams) {
			socket.emit("stats:team:get", { tournamentId, teamId: team.id }, (ack: Ack<MatchStats>) => {
				if (ack.ok && ack.data) setTeamStats(tournamentId, team.id, ack.data);
			});
		}
	}, [socket, tournamentId, teams, setTeamStats]);

	// Re-fetch on match events
	useEffect(() => {
		if (!socket || !tournamentId) return;
		const refetch = () => {
			socket.emit("stats:player:get", { tournamentId }, (ack: Ack<PlayerStats[]>) => {
				if (ack.ok) setPlayerStats(tournamentId, ack.data ?? []);
			});
			for (const team of teams) {
				socket.emit("stats:team:get", { tournamentId, teamId: team.id }, (ack: Ack<MatchStats>) => {
					if (ack.ok && ack.data) setTeamStats(tournamentId, team.id, ack.data);
				});
			}
		};
		socket.on("match:event", refetch);
		return () => {
			socket.off("match:event", refetch);
		};
	}, [socket, tournamentId, teams, setPlayerStats, setTeamStats]);

	const stats = useMemo(() => playerStats[tournamentId] ?? [], [playerStats, tournamentId]);

	// Top aces players
	const topAces = useMemo(() => {
		return [...stats]
			.sort((a, b) => (b.stats["ace"] ?? 0) - (a.stats["ace"] ?? 0))
			.slice(0, 5)
			.filter(ps => (ps.stats["ace"] ?? 0) > 0);
	}, [stats]);

	// Top blocks players
	const topBlocks = useMemo(() => {
		return [...stats]
			.sort((a, b) => (b.stats["block"] ?? 0) - (a.stats["block"] ?? 0))
			.slice(0, 5)
			.filter(ps => (ps.stats["block"] ?? 0) > 0);
	}, [stats]);

	const getPlayerName = (playerId: string) => allPlayers.find(p => p.id === playerId)?.name ?? playerId;

	const getTeamName = (playerId: string) => {
		const teamId = allPlayers.find(p => p.id === playerId)?.teamId;
		return teams.find(t => t.id === teamId)?.name ?? "—";
	};

	return (
		<div className="display-page">
			<div className="display-container">
				<div className="display-header">
					<h1>📊 Statystyki</h1>
					<div className="flex items-center gap-2">
						<Link to="/display/fan" className="btn btn-secondary btn-sm">
							Powrót
						</Link>
					</div>
				</div>

				{/* Challenge banner */}
				{challenge && <ChallengeBanner challenge={challenge} team1Name="Drużyna 1" team2Name="Drużyna 2" />}

				{!statsEnabled ? (
					<div className="card">
						<div className="empty-state">
							<div className="empty-state-icon">📊</div>
							<div className="empty-state-text">Statystyki graczy są wyłączone.</div>
						</div>
					</div>
				) : loading ? (
					<div className="card">
						<div className="text-muted" style={{ padding: 16 }}>
							Ładowanie statystyk...
						</div>
					</div>
				) : (
					<>
						{/* Top players */}
						<div className="card">
							<div className="card-header">
								<h2>Najlepsi zawodnicy</h2>
							</div>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
								<div>
									<h3 style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 12 }}>
										Najlepsze asy
									</h3>
									{topAces.length === 0 ? (
										<p className="text-muted" style={{ fontSize: 13 }}>
											Brak danych
										</p>
									) : (
										<ol className="stats-leaderboard">
											{topAces.map((ps, i) => (
												<li key={ps.playerId} className="stats-leaderboard__item">
													<span className="stats-leaderboard__rank">{i + 1}</span>
													<div className="stats-leaderboard__info">
														<Link
															to={`/display/stats/player/${ps.playerId}`}
															className="stats-leaderboard__name"
														>
															{getPlayerName(ps.playerId)}
														</Link>
														<span className="stats-leaderboard__team">
															{getTeamName(ps.playerId)}
														</span>
													</div>
													<span className="stats-leaderboard__value">{ps.stats["ace"]}</span>
												</li>
											))}
										</ol>
									)}
								</div>
								<div>
									<h3 style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 12 }}>
										Najlepsze bloki
									</h3>
									{topBlocks.length === 0 ? (
										<p className="text-muted" style={{ fontSize: 13 }}>
											Brak danych
										</p>
									) : (
										<ol className="stats-leaderboard">
											{topBlocks.map((ps, i) => (
												<li key={ps.playerId} className="stats-leaderboard__item">
													<span className="stats-leaderboard__rank">{i + 1}</span>
													<div className="stats-leaderboard__info">
														<Link
															to={`/display/stats/player/${ps.playerId}`}
															className="stats-leaderboard__name"
														>
															{getPlayerName(ps.playerId)}
														</Link>
														<span className="stats-leaderboard__team">
															{getTeamName(ps.playerId)}
														</span>
													</div>
													<span className="stats-leaderboard__value">{ps.stats["block"]}</span>
												</li>
											))}
										</ol>
									)}
								</div>
							</div>
						</div>

						{/* Team stats comparison */}
						<div className="card">
							<div className="card-header">
								<h2>Statystyki drużyn</h2>
							</div>
							{teams.length === 0 ? (
								<p className="text-muted" style={{ fontSize: 13 }}>
									Brak drużyn
								</p>
							) : (
								<div style={{ overflowX: "auto" }}>
									<table className="stats-table">
										<thead>
											<tr>
												<th className="stats-table__th">Drużyna</th>
												<th className="stats-table__th">Asy</th>
												<th className="stats-table__th">Auty</th>
												<th className="stats-table__th">Bloki</th>
												<th className="stats-table__th">Siatki</th>
												<th className="stats-table__th">Challenge</th>
												<th className="stats-table__th">Czas</th>
												<th className="stats-table__th">Razem</th>
												<th className="stats-table__th">Szczegóły</th>
											</tr>
										</thead>
										<tbody>
											{teams.map(team => {
												const ts = teamStats[`${tournamentId}:${team.id}`];
												// Sum both slots for display purposes
												const total = ts
													? Object.values(ts.team1).reduce((s, n) => s + n, 0) +
														Object.values(ts.team2).reduce((s, n) => s + n, 0)
													: 0;
												const get = (type: string) =>
													ts
														? (ts.team1[type as keyof typeof ts.team1] ?? 0) +
															(ts.team2[type as keyof typeof ts.team2] ?? 0)
														: 0;

												return (
													<tr key={team.id} className="stats-table__row">
														<td
															className="stats-table__td stats-table__td--name"
															style={{ color: team.color || undefined }}
														>
															{team.name}
														</td>
														<td className="stats-table__td stats-table__td--num">
															{get("ace")}
														</td>
														<td className="stats-table__td stats-table__td--num">
															{get("ball-out")}
														</td>
														<td className="stats-table__td stats-table__td--num">
															{get("block")}
														</td>
														<td className="stats-table__td stats-table__td--num">
															{get("net-touch")}
														</td>
														<td className="stats-table__td stats-table__td--num">
															{get("challenge")}
														</td>
														<td className="stats-table__td stats-table__td--num">
															{get("timeout")}
														</td>
														<td className="stats-table__td stats-table__td--num stats-table__td--total">
															{total}
														</td>
														<td className="stats-table__td">
															<Link
																to={`/display/stats/team/${team.id}`}
																className="btn btn-secondary btn-xs"
															>
																Szczegóły
															</Link>
														</td>
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
