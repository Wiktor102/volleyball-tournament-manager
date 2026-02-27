import { useEffect, useState, useMemo } from "react";
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

type SortKey = "name" | "team" | "ace" | "ball-out" | "block" | "net-touch" | "challenge" | "timeout" | "total";

const COL_HEADERS: { key: SortKey; label: string }[] = [
	{ key: "name", label: "Zawodnik" },
	{ key: "team", label: "Drużyna" },
	{ key: "ace", label: "Asy" },
	{ key: "ball-out", label: "Auty" },
	{ key: "block", label: "Bloki" },
	{ key: "net-touch", label: "Siatki" },
	{ key: "challenge", label: "Challenge" },
	{ key: "timeout", label: "Czas" },
	{ key: "total", label: "Razem" },
];

export function PlayerStats() {
	const { socket } = useSocket();
	const { tournament, teams } = useTournamentStore();
	const { playerStats, setPlayerStats } = useEventStore();

	const [allPlayers, setAllPlayers] = useState<Player[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [sortKey, setSortKey] = useState<SortKey>("total");
	const [sortAsc, setSortAsc] = useState(false);
	const [filterTeamId, setFilterTeamId] = useState<string>("");

	const statsEnabled = tournament?.settings?.playerStatsEnabled === true;
	const tournamentId = tournament?.id ?? "";

	// Fetch stats
	useEffect(() => {
		if (!socket || !tournamentId || !statsEnabled) return;

		setLoading(true);
		setError(null);

		socket.emit("stats:player:get", { tournamentId }, (ack: Ack<PlayerStats[]>) => {
			setLoading(false);
			if (!ack.ok) {
				setError(ack.error);
				return;
			}
			setPlayerStats(tournamentId, ack.data ?? []);
		});
	}, [socket, tournamentId, statsEnabled, setPlayerStats]);

	// Fetch all players for all teams
	useEffect(() => {
		if (!socket || teams.length === 0) return;

		const fetched: Player[] = [];
		let pending = teams.length;

		for (const team of teams) {
			socket.emit("player:list", { teamId: team.id }, (ack: Ack<Player[]>) => {
				if (ack.ok && ack.data) {
					fetched.push(...ack.data);
				}
				pending--;
				if (pending === 0) {
					setAllPlayers([...fetched]);
				}
			});
		}
	}, [socket, teams]);

	// Re-fetch stats on match events
	useEffect(() => {
		if (!socket || !tournamentId || !statsEnabled) return;

		const refetch = () => {
			socket.emit("stats:player:get", { tournamentId }, (ack: Ack<PlayerStats[]>) => {
				if (ack.ok) setPlayerStats(tournamentId, ack.data ?? []);
			});
		};

		socket.on("match:event", refetch);
		return () => { socket.off("match:event", refetch); };
	}, [socket, tournamentId, statsEnabled, setPlayerStats]);

	const stats = playerStats[tournamentId] ?? [];

	type Row = {
		playerId: string;
		name: string;
		teamId: string;
		teamName: string;
		ace: number;
		"ball-out": number;
		block: number;
		"net-touch": number;
		challenge: number;
		timeout: number;
		total: number;
	};

	const rows: Row[] = useMemo(() => {
		return stats.map(ps => {
			const player = allPlayers.find(p => p.id === ps.playerId);
			const team = teams.find(t => t.id === player?.teamId);
			return {
				playerId: ps.playerId,
				name: player?.name ?? ps.playerId,
				teamId: player?.teamId ?? "",
				teamName: team?.name ?? "—",
				ace: ps.stats["ace"] ?? 0,
				"ball-out": ps.stats["ball-out"] ?? 0,
				block: ps.stats["block"] ?? 0,
				"net-touch": ps.stats["net-touch"] ?? 0,
				challenge: ps.stats["challenge"] ?? 0,
				timeout: ps.stats["timeout"] ?? 0,
				total: ps.totalEvents,
			};
		});
	}, [stats, allPlayers, teams]);

	const filtered = useMemo(() => {
		if (!filterTeamId) return rows;
		return rows.filter(r => r.teamId === filterTeamId);
	}, [rows, filterTeamId]);

	const sorted = useMemo(() => {
		return [...filtered].sort((a, b) => {
			let cmp = 0;
			if (sortKey === "name" || sortKey === "team") {
				const aVal = sortKey === "name" ? a.name : a.teamName;
				const bVal = sortKey === "name" ? b.name : b.teamName;
				cmp = aVal.localeCompare(bVal, "pl");
			} else {
				cmp = (a[sortKey] as number) - (b[sortKey] as number);
			}
			return sortAsc ? cmp : -cmp;
		});
	}, [filtered, sortKey, sortAsc]);

	const handleSort = (key: SortKey) => {
		if (key === sortKey) {
			setSortAsc(a => !a);
		} else {
			setSortKey(key);
			setSortAsc(false);
		}
	};

	if (!statsEnabled) {
		return (
			<>
				<div className="page-header">
					<h1>Statystyki zawodników</h1>
				</div>
				<div className="card">
					<div className="empty-state">
						<div className="empty-state-icon">📊</div>
						<div className="empty-state-text">
							Statystyki zawodników są wyłączone. Włącz je w ustawieniach turnieju.
						</div>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="page-header">
				<h1>Statystyki zawodników</h1>
			</div>

			<div className="card">
				<div className="card-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
					<h2 style={{ margin: 0 }}>Tabela statystyk</h2>
					<div style={{ marginLeft: "auto" }}>
						<select
							className="form-input form-input-sm"
							value={filterTeamId}
							onChange={e => setFilterTeamId(e.target.value)}
							style={{ minWidth: 160 }}
						>
							<option value="">Wszystkie drużyny</option>
							{teams.map(t => (
								<option key={t.id} value={t.id}>{t.name}</option>
							))}
						</select>
					</div>
				</div>

				{loading && <div className="text-muted" style={{ padding: 16 }}>Ładowanie statystyk...</div>}
				{error && <div className="text-muted" style={{ padding: 16, color: "var(--color-danger)" }}>Błąd: {error}</div>}

				{!loading && !error && (
					<div style={{ overflowX: "auto" }}>
						<table className="stats-table">
							<thead>
								<tr>
									{COL_HEADERS.map(col => (
										<th
											key={col.key}
											className={`stats-table__th${sortKey === col.key ? " stats-table__th--active" : ""}`}
											onClick={() => handleSort(col.key)}
											style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
										>
											{col.label}
											<span className="stats-sort-indicator">
												{sortKey === col.key ? (sortAsc ? " ▲" : " ▼") : " ⇅"}
											</span>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{sorted.length === 0 ? (
									<tr>
										<td colSpan={COL_HEADERS.length} style={{ textAlign: "center", padding: 24, color: "var(--color-text-muted)" }}>
											Brak danych statystycznych
										</td>
									</tr>
								) : (
									sorted.map(row => (
										<tr key={row.playerId} className="stats-table__row">
											<td className="stats-table__td stats-table__td--name">{row.name}</td>
											<td className="stats-table__td">{row.teamName}</td>
											<td className="stats-table__td stats-table__td--num">{row.ace}</td>
											<td className="stats-table__td stats-table__td--num">{row["ball-out"]}</td>
											<td className="stats-table__td stats-table__td--num">{row.block}</td>
											<td className="stats-table__td stats-table__td--num">{row["net-touch"]}</td>
											<td className="stats-table__td stats-table__td--num">{row.challenge}</td>
											<td className="stats-table__td stats-table__td--num">{row.timeout}</td>
											<td className="stats-table__td stats-table__td--num stats-table__td--total">{row.total}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</>
	);
}
