import { create } from "zustand";

export type ScoringSettings = {
	mode: "sets" | "points" | "timed";
	setsToWin: number;
	pointsToWinSet: number;
	pointsToWinTieBreak: number;
	mustWinByTwo: boolean;
	/**
	 * When true and sets are tied (both teams have setsToWin-1 sets), instead of
	 * playing a standard tiebreak set the winner is determined by total points
	 * accumulated across all previous sets. Regular sets still end exactly on the
	 * configured point target. If total points are also equal, the last regular
	 * set continues into an attached advantage phase.
	 */
	tiebreakByTotalPoints?: boolean;
	// Timed mode settings
	matchDurationMinutes?: number;
	overtimeMinutes?: number;
	goldenGoal?: boolean;
};

export type RoundScoringOverride = {
	round: number | "final" | "semifinal" | "thirdPlace";
	settings: Partial<ScoringSettings>;
};

export type TournamentSettings = {
	scoring: ScoringSettings;
	roundOverrides?: RoundScoringOverride[];
	playerStatsEnabled?: boolean;
};

export type Tournament = {
	id: string;
	name: string;
	status: "draft" | "live" | "completed";
	settings: TournamentSettings;
};

export type Team = {
	id: string;
	tournamentId: string;
	name: string;
	color: string | null;
	seed: number | null;
	eliminated: boolean;
};

export type MatchSummary = {
	id: string;
	roundNumber: number;
	matchNumber: number;
	positionInRound: number;
	isThirdPlaceMatch: boolean;
	status: "pending" | "live" | "completed";
	team1Id: string | null;
	team2Id: string | null;
	winnerId: string | null;
	scheduledTime: number | null;
	score?: {
		team1Sets: number;
		team2Sets: number;
		team1CurrentPoints: number;
		team2CurrentPoints: number;
		currentSet: number;
		setsToWin: number;
	} | null;
};

export type TournamentState = {
	tournament: Tournament;
	teams: Team[];
	ballsOnBalcony: number;
	currentMatch: { id: string; team1Id: string | null; team2Id: string | null } | null;
	score: unknown | null;
	upcomingMatches?: MatchSummary[];
	recentMatches?: MatchSummary[];
	nextMatch?: MatchSummary | null;
	totalMatches?: number;
	completedMatches?: number;
};

type State = {
	tournament: Tournament | null;
	teams: Team[];
	ballsOnBalcony: number;
	upcomingMatches: MatchSummary[];
	recentMatches: MatchSummary[];
	nextMatch: MatchSummary | null;
	totalMatches: number;
	completedMatches: number;
	setTournament: (t: Tournament) => void;
	setTeams: (t: Team[]) => void;
	setBallsOnBalcony: (value: number) => void;
	setUpcomingMatches: (matches: MatchSummary[]) => void;
	setRecentMatches: (matches: MatchSummary[]) => void;
	setNextMatch: (match: MatchSummary | null) => void;
	setTotalMatches: (n: number) => void;
	setCompletedMatches: (n: number) => void;
};

export const useTournamentStore = create<State>(set => ({
	tournament: null,
	teams: [],
	ballsOnBalcony: 0,
	upcomingMatches: [],
	recentMatches: [],
	nextMatch: null,
	totalMatches: 0,
	completedMatches: 0,
	setTournament: t => set({ tournament: t }),
	setTeams: teams => set({ teams }),
	setBallsOnBalcony: ballsOnBalcony => set({ ballsOnBalcony }),
	setUpcomingMatches: upcomingMatches => set({ upcomingMatches }),
	setRecentMatches: recentMatches => set({ recentMatches }),
	setNextMatch: nextMatch => set({ nextMatch }),
	setTotalMatches: totalMatches => set({ totalMatches }),
	setCompletedMatches: completedMatches => set({ completedMatches })
}));
