import { and, asc, count, desc, eq, isNotNull, or } from "drizzle-orm";
import { db } from "../db";
import { bracketMatches, matchScores } from "../db/schema";
import { getTournament, type Tournament } from "./tournament.service";
import { getTournamentRuntimeState } from "./runtime-state.service";
import { listTeams, type Team } from "./team.service";
import { getMatchScore, type MatchScore } from "./match.service";

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
	score: MatchScore | null;
	upcomingMatches: MatchSummary[];
	recentMatches: MatchSummary[];
	nextMatch: MatchSummary | null;
	totalMatches: number;
	completedMatches: number;
};

export async function getTournamentState(tournamentId: string): Promise<TournamentState | null> {
	const tournament = await getTournament(tournamentId);
	if (!tournament) return null;

	const runtimeState = await getTournamentRuntimeState(tournamentId);
	const teams = await listTeams(tournamentId);

	const matchRows = await db
		.select({ id: bracketMatches.id, team1Id: bracketMatches.team1Id, team2Id: bracketMatches.team2Id })
		.from(bracketMatches)
		.where(and(eq(bracketMatches.tournamentId, tournamentId), eq(bracketMatches.status, "live")))
		.orderBy(desc(bracketMatches.updatedAt))
		.limit(1);

	const currentMatch = matchRows[0]
		? { id: matchRows[0].id, team1Id: matchRows[0].team1Id ?? null, team2Id: matchRows[0].team2Id ?? null }
		: null;

	const score = currentMatch ? await getMatchScore(currentMatch.id) : null;

	// Upcoming: pending matches that have at least one team assigned
	const upcomingRows = await db
		.select({
			id: bracketMatches.id,
			roundNumber: bracketMatches.roundNumber,
			matchNumber: bracketMatches.matchNumber,
			positionInRound: bracketMatches.positionInRound,
			isThirdPlaceMatch: bracketMatches.isThirdPlaceMatch,
			status: bracketMatches.status,
			team1Id: bracketMatches.team1Id,
			team2Id: bracketMatches.team2Id,
			winnerId: bracketMatches.winnerId,
			scheduledTime: bracketMatches.scheduledTime
		})
		.from(bracketMatches)
		.where(
			and(
				eq(bracketMatches.tournamentId, tournamentId),
				eq(bracketMatches.status, "pending"),
				or(isNotNull(bracketMatches.team1Id), isNotNull(bracketMatches.team2Id))
			)
		)
		.orderBy(asc(bracketMatches.roundNumber), asc(bracketMatches.positionInRound))
		.limit(5);

	const upcomingMatches: MatchSummary[] = upcomingRows.map(r => ({
		id: r.id,
		roundNumber: r.roundNumber,
		matchNumber: r.matchNumber,
		positionInRound: r.positionInRound,
		isThirdPlaceMatch: !!r.isThirdPlaceMatch,
		status: r.status as "pending" | "live" | "completed",
		team1Id: r.team1Id ?? null,
		team2Id: r.team2Id ?? null,
		winnerId: r.winnerId ?? null,
		scheduledTime: r.scheduledTime ?? null
	}));

	// Next match: first pending with BOTH teams assigned
	const nextMatchRow = upcomingRows.find(r => r.team1Id != null && r.team2Id != null);
	const nextMatch: MatchSummary | null = nextMatchRow
		? {
				id: nextMatchRow.id,
				roundNumber: nextMatchRow.roundNumber,
				matchNumber: nextMatchRow.matchNumber,
				positionInRound: nextMatchRow.positionInRound,
				isThirdPlaceMatch: !!nextMatchRow.isThirdPlaceMatch,
				status: nextMatchRow.status as "pending" | "live" | "completed",
				team1Id: nextMatchRow.team1Id ?? null,
				team2Id: nextMatchRow.team2Id ?? null,
				winnerId: nextMatchRow.winnerId ?? null,
				scheduledTime: nextMatchRow.scheduledTime ?? null
			}
		: null;

	// Recent: completed matches ordered by updatedAt DESC, with score data
	const recentRows = await db
		.select({
			id: bracketMatches.id,
			roundNumber: bracketMatches.roundNumber,
			matchNumber: bracketMatches.matchNumber,
			positionInRound: bracketMatches.positionInRound,
			isThirdPlaceMatch: bracketMatches.isThirdPlaceMatch,
			status: bracketMatches.status,
			team1Id: bracketMatches.team1Id,
			team2Id: bracketMatches.team2Id,
			winnerId: bracketMatches.winnerId,
			scheduledTime: bracketMatches.scheduledTime,
			// Score fields (nullable join)
			team1Sets: matchScores.team1Sets,
			team2Sets: matchScores.team2Sets,
			team1CurrentPoints: matchScores.team1CurrentPoints,
			team2CurrentPoints: matchScores.team2CurrentPoints,
			currentSet: matchScores.currentSet,
			setsToWin: matchScores.setsToWin
		})
		.from(bracketMatches)
		.leftJoin(matchScores, eq(matchScores.matchId, bracketMatches.id))
		.where(and(eq(bracketMatches.tournamentId, tournamentId), eq(bracketMatches.status, "completed")))
		.orderBy(desc(bracketMatches.updatedAt))
		.limit(5);

	const recentMatches: MatchSummary[] = recentRows.map(r => ({
		id: r.id,
		roundNumber: r.roundNumber,
		matchNumber: r.matchNumber,
		positionInRound: r.positionInRound,
		isThirdPlaceMatch: !!r.isThirdPlaceMatch,
		status: r.status as "pending" | "live" | "completed",
		team1Id: r.team1Id ?? null,
		team2Id: r.team2Id ?? null,
		winnerId: r.winnerId ?? null,
		scheduledTime: r.scheduledTime ?? null,
		score:
			r.team1Sets != null
				? {
						team1Sets: r.team1Sets,
						team2Sets: r.team2Sets ?? 0,
						team1CurrentPoints: r.team1CurrentPoints ?? 0,
						team2CurrentPoints: r.team2CurrentPoints ?? 0,
						currentSet: r.currentSet ?? 1,
						setsToWin: r.setsToWin ?? 2
					}
				: null
	}));

	// Counts
	const totalResult = await db
		.select({ value: count() })
		.from(bracketMatches)
		.where(eq(bracketMatches.tournamentId, tournamentId));
	const totalMatches = totalResult[0]?.value ?? 0;

	const completedResult = await db
		.select({ value: count() })
		.from(bracketMatches)
		.where(and(eq(bracketMatches.tournamentId, tournamentId), eq(bracketMatches.status, "completed")));
	const completedMatches = completedResult[0]?.value ?? 0;

	return {
		tournament,
		teams,
		ballsOnBalcony: runtimeState.ballsOnBalcony,
		currentMatch,
		score,
		upcomingMatches,
		recentMatches,
		nextMatch,
		totalMatches,
		completedMatches
	};
}
