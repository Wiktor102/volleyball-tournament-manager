import { useCallback, useEffect, useRef } from "react";
import { useSocket } from "../../socket/context";
import { useMatchStore, type MatchScore } from "../../stores/match.store";
import { useTournamentStore, type Tournament, type TournamentState } from "../../stores/tournament.store";
import "../../styles/admin.css";

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string };

export function StreamOverlay() {
	const { socket, connected, onReconnect } = useSocket();
	const { teams, setTournament, setTeams } = useTournamentStore();
	const { matchId, team1Id, team2Id, score, setMatchId, setMatchTeams, setScore } = useMatchStore();

	const team1ScoreElRef = useRef<HTMLDivElement | null>(null);
	const team2ScoreElRef = useRef<HTMLDivElement | null>(null);
	const prevScoreRef = useRef<{ t1: number; t2: number } | null>(null);

	const pulse = (el: HTMLElement | null) => {
		if (!el) return;
		el.classList.remove("score-changed");
		void el.offsetWidth;
		el.classList.add("score-changed");
		window.setTimeout(() => el.classList.remove("score-changed"), 400);
	};

	// Track score changes for animations
	useEffect(() => {
		if (!score) return;

		const prev = prevScoreRef.current;
		if (prev) {
			if (score.team1CurrentPoints !== prev.t1) {
				pulse(team1ScoreElRef.current);
			}
			if (score.team2CurrentPoints !== prev.t2) {
				pulse(team2ScoreElRef.current);
			}
		}
		prevScoreRef.current = { t1: score.team1CurrentPoints, t2: score.team2CurrentPoints };
	}, [score]);

	// Function to refresh all state from server
	const refreshState = useCallback(() => {
		if (!socket) return;
		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
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

		const onMatchStatus = (m: { id?: string; team1Id?: string | null; team2Id?: string | null }) => {
			if (m?.id) {
				setMatchId(m.id);
				setMatchTeams(m.team1Id ?? null, m.team2Id ?? null);
			}
		};
		const onMatchScore = (s: MatchScore) => setScore(s);
		const onState = (state: TournamentState) => {
			setTournament(state.tournament);
			setTeams(state.teams);
			if (state.currentMatch?.id) {
				setMatchId(state.currentMatch.id);
				setMatchTeams(state.currentMatch.team1Id ?? null, state.currentMatch.team2Id ?? null);
			}
			if (state.score) setScore(state.score as MatchScore);
		};

		socket.on("match:status", onMatchStatus);
		socket.on("match:score", onMatchScore);
		socket.on("tournament:state", onState);

		return () => {
			socket.off("match:status", onMatchStatus);
			socket.off("match:score", onMatchScore);
			socket.off("tournament:state", onState);
		};
	}, [socket, setTournament, setTeams, setMatchId, setMatchTeams, setScore]);

	useEffect(() => {
		if (!socket || !matchId) return;
		socket.emit("match:score", { matchId }, (ack: Ack<MatchScore>) => {
			if (!ack.ok) return;
			setScore(ack.data);
		});
	}, [socket, matchId, setScore]);

	const params = new URLSearchParams(window.location.search);
	const transparent = params.get("transparent") !== "false";

	const team1 = teams.find(t => t.id === team1Id);
	const team2 = teams.find(t => t.id === team2Id);

	const hasActiveMatch = !!matchId && !!team1Id && !!team2Id;

	return (
		<div className={`overlay-page ${!transparent ? "with-bg" : ""}`}>
			{/* Debug indicator (only in non-transparent mode) */}
			{!transparent && (
				<div style={{ position: "absolute", top: 24, left: 24, opacity: 0.4, fontSize: 12 }}>
					Overlay ({connected ? "online" : "offline"})
				</div>
			)}

			{/* Score Bar */}
			{hasActiveMatch && (
				<div className="overlay-scorebar">
					<div className="overlay-team" style={{ color: team1?.color || "#ffffff" }}>
						{team1?.name ?? "DRUŻYNA 1"}
					</div>
					<div className="overlay-scores">
						{/* Sets display */}
						{(score?.setsToWin ?? 3) > 1 && (
							<div className="overlay-sets">
								<span style={{ color: team1?.color || "#ffffff" }}>{score?.team1Sets ?? 0}</span>
								<span className="overlay-sets-label">SETY</span>
								<span style={{ color: team2?.color || "#ffffff" }}>{score?.team2Sets ?? 0}</span>
							</div>
						)}
						<div ref={team1ScoreElRef} className="overlay-score">
							{score?.team1CurrentPoints ?? 0}
						</div>
						<div className="overlay-separator">:</div>
						<div ref={team2ScoreElRef} className="overlay-score">
							{score?.team2CurrentPoints ?? 0}
						</div>
					</div>
					<div className="overlay-team" style={{ color: team2?.color || "#ffffff", textAlign: "right" }}>
						{team2?.name ?? "DRUŻYNA 2"}
					</div>
				</div>
			)}
		</div>
	);
}
