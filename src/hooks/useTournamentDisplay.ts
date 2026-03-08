import { useCallback, useEffect } from "react";
import { useSocket } from "../socket/context";
import { useMatchStore, type MatchScore, type ChallengeState } from "../stores/match.store";
import { useTournamentStore, type MatchSummary, type Tournament, type TournamentState } from "../stores/tournament.store";

type Ack<T> = { ok: true; data: T | null } | { ok: false; error: string };

/**
 * Centralised hook for public display pages (FanView, BracketDisplay, etc.).
 *
 * - Emits `tournament:default` on mount and on every reconnect to obtain the
 *   initial tournament object.
 * - Listens for `tournament:state`, `tournament:updated`, `match:status` and
 *   `match:score` socket events and keeps the Zustand stores up to date.
 * - Returns the full display state including the new schedule fields.
 */
export function useTournamentDisplay() {
	const { socket, connected, reconnecting, onReconnect } = useSocket();

	const {
		tournament,
		teams,
		upcomingMatches,
		recentMatches,
		nextMatch,
		totalMatches,
		completedMatches,
		setTournament,
		setTeams,
		setUpcomingMatches,
		setRecentMatches,
		setNextMatch,
		setTotalMatches,
		setCompletedMatches
	} = useTournamentStore();

	const {
		matchId,
		team1Id,
		team2Id,
		score,
		matchStatus,
		challenge,
		setMatchId,
		setMatchTeams,
		setScore,
		setMatchStatus,
		setChallenge
	} = useMatchStore();

	const refreshState = useCallback(() => {
		if (!socket) return;
		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
		});
	}, [socket, setTournament]);

	// Re-fetch default tournament on reconnect
	useEffect(() => {
		return onReconnect(() => {
			refreshState();
		});
	}, [onReconnect, refreshState]);

	useEffect(() => {
		if (!socket) return;

		// Fetch initial state
		socket.emit("tournament:default", null, (ack: Ack<Tournament>) => {
			if (!ack.ok || !ack.data) return;
			setTournament(ack.data);
		});

		const onState = (state: TournamentState) => {
			setTournament(state.tournament);
			setTeams(state.teams);
			if (state.currentMatch?.id) {
				setMatchId(state.currentMatch.id);
				setMatchTeams(state.currentMatch.team1Id ?? null, state.currentMatch.team2Id ?? null);
				setMatchStatus((state.currentMatch as { status?: string }).status ?? null);
			} else {
				setMatchId(null);
				setMatchTeams(null, null);
				setMatchStatus(null);
				setScore(null);
				setChallenge(null);
			}
			if (state.score) setScore(state.score as MatchScore);
			else if (state.currentMatch?.id) setScore(null);
			setUpcomingMatches(state.upcomingMatches ?? []);
			setRecentMatches(state.recentMatches ?? []);
			setNextMatch(state.nextMatch ?? null);
			setTotalMatches(state.totalMatches ?? 0);
			setCompletedMatches(state.completedMatches ?? 0);
		};

		const onTournamentUpdated = (t: Tournament) => setTournament(t);

		const onMatchStatus = (m: { id?: string; team1Id?: string | null; team2Id?: string | null; status?: string }) => {
			if (m?.id) {
				setMatchId(m.id);
				setMatchTeams(m.team1Id ?? null, m.team2Id ?? null);
			}
			if (m?.status) {
				setMatchStatus(m.status);
			}
		};

		const onMatchScore = (s: MatchScore) => setScore(s);

		const onChallenge = (c: ChallengeState) => {
			if (!c) {
				if (!matchId) {
					setChallenge(null);
					return;
				}
				socket.emit("match:challenge:get", { matchId }, (ack: Ack<ChallengeState>) => {
					if (!ack.ok) {
						setChallenge(null);
						return;
					}
					setChallenge(ack.data);
				});
				return;
			}

			if (c.matchId !== matchId) return;
			setChallenge(c);
		};

		socket.on("tournament:state", onState);
		socket.on("tournament:updated", onTournamentUpdated);
		socket.on("match:status", onMatchStatus);
		socket.on("match:score", onMatchScore);
		socket.on("match:challenge", onChallenge);

		return () => {
			socket.off("tournament:state", onState);
			socket.off("tournament:updated", onTournamentUpdated);
			socket.off("match:status", onMatchStatus);
			socket.off("match:score", onMatchScore);
			socket.off("match:challenge", onChallenge);
		};
	}, [
		socket,
		setTournament,
		setTeams,
		setMatchId,
		setMatchTeams,
		setScore,
		setMatchStatus,
		setUpcomingMatches,
		setRecentMatches,
		setNextMatch,
		setTotalMatches,
		setCompletedMatches,
		setChallenge,
		matchId
	]);

	// Fetch current score whenever the active match changes
	useEffect(() => {
		if (!socket || !matchId) return;
		socket.emit("match:score", { matchId }, (ack: Ack<MatchScore>) => {
			if (!ack.ok) return;
			setScore(ack.data);
		});
		socket.emit("match:challenge:get", { matchId }, (ack: Ack<ChallengeState>) => {
			if (ack.ok) setChallenge(ack.data);
		});
	}, [socket, matchId, setScore, setChallenge]);

	return {
		tournament,
		teams,
		currentMatch: matchId ? { id: matchId, team1Id, team2Id } : null,
		matchStatus,
		score,
		challenge,
		upcomingMatches,
		recentMatches,
		nextMatch: nextMatch as MatchSummary | null,
		totalMatches,
		completedMatches,
		isConnected: connected,
		isReconnecting: reconnecting
	};
}
