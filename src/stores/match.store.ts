import { create } from "zustand";
import type { ScoringSettings } from "./tournament.store";

export type SetScore = {
	t1: number;
	t2: number;
	startedAt?: number | null;
	endedAt?: number | null;
};

export type ChallengeState = {
	matchId: string;
	team: "team1" | "team2";
	reason?: string;
	status: "pending" | "successful" | "failed";
	timestamp: number;
} | null;

export type MatchScore = {
	matchId: string;
	team1Sets: number;
	team2Sets: number;
	team1CurrentPoints: number;
	team2CurrentPoints: number;
	currentSet: number;
	setsToWin: number;
	setScores: SetScore[];
	currentSetStartedAt?: number | null;
	scoringMode?: ScoringSettings;
	matchTimeSeconds?: number;
};

type State = {
	matchId: string | null;
	team1Id: string | null;
	team2Id: string | null;
	score: MatchScore | null;
	matchStatus: string | null;
	challenge: ChallengeState;
	setMatchId: (id: string | null) => void;
	setMatchTeams: (team1Id: string | null, team2Id: string | null) => void;
	setScore: (s: MatchScore | null) => void;
	setMatchStatus: (status: string | null) => void;
	setChallenge: (c: ChallengeState) => void;
};

export const useMatchStore = create<State>(set => ({
	matchId: null,
	team1Id: null,
	team2Id: null,
	score: null,
	matchStatus: null,
	challenge: null,
	setMatchId: matchId => set({ matchId }),
	setMatchTeams: (team1Id, team2Id) => set({ team1Id, team2Id }),
	setScore: score => set({ score }),
	setMatchStatus: matchStatus => set({ matchStatus }),
	setChallenge: challenge => set({ challenge })
}));
