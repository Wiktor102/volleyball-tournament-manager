import { and, eq, ne, type InferSelectModel } from "drizzle-orm";
import { db } from "../db";
import { bracketMatches, matchScores } from "../db/schema";
import { id } from "../utils/id";
import { listBracketMatches } from "./bracket.service";
import {
	getTournament,
	getScoringForRound,
	DEFAULT_SCORING_SETTINGS,
	updateTournament,
	type ScoringSettings
} from "./tournament.service";

type MatchRow = InferSelectModel<typeof bracketMatches>;
type ScoreRow = InferSelectModel<typeof matchScores>;

export type MatchStatus = "pending" | "live" | "completed";

export type Match = {
	id: string;
	tournamentId: string;
	roundNumber: number;
	matchNumber: number;
	positionInRound: number;
	team1Id: string | null;
	team2Id: string | null;
	winnerId: string | null;
	status: MatchStatus;
	isThirdPlaceMatch: boolean;
	nextMatchId: string | null;
};

export type SetScore = {
	t1: number;
	t2: number;
	startedAt?: number | null;
	endedAt?: number | null;
};

export type MatchScore = {
	matchId: string;
	team1Sets: number;
	team2Sets: number;
	team1CurrentPoints: number;
	team2CurrentPoints: number;
	currentSet: number;
	setsToWin: number;
	setScores: SetScore[];
	currentSetStartedAt: number | null;
	scoringMode: ScoringSettings | null;
	matchTimeSeconds: number;
};

function rowToMatch(row: MatchRow): Match {
	return {
		id: row.id,
		tournamentId: row.tournamentId,
		roundNumber: row.roundNumber,
		matchNumber: row.matchNumber,
		positionInRound: row.positionInRound,
		team1Id: row.team1Id ?? null,
		team2Id: row.team2Id ?? null,
		winnerId: row.winnerId ?? null,
		status: row.status as MatchStatus,
		isThirdPlaceMatch: !!row.isThirdPlaceMatch,
		nextMatchId: row.nextMatchId ?? null
	};
}

function parseSetScoresJson(json: string | null): { sets: SetScore[]; currentSetStartedAt: number | null } {
	if (!json) return { sets: [], currentSetStartedAt: null };
	try {
		const parsed = JSON.parse(json);
		// New format: { sets: [...], currentSetStartedAt: number | null }
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "sets" in parsed) {
			return { sets: parsed.sets ?? [], currentSetStartedAt: parsed.currentSetStartedAt ?? null };
		}
		// Legacy format: [{t1, t2}, ...]
		if (Array.isArray(parsed)) {
			return { sets: parsed, currentSetStartedAt: null };
		}
		return { sets: [], currentSetStartedAt: null };
	} catch {
		return { sets: [], currentSetStartedAt: null };
	}
}

function serializeSetScoresJson(sets: SetScore[], currentSetStartedAt: number | null): string {
	return JSON.stringify({ sets, currentSetStartedAt });
}

function rowToScore(row: ScoreRow): MatchScore {
	const { sets, currentSetStartedAt } = parseSetScoresJson(row.setScoresJson);
	return {
		matchId: row.matchId,
		team1Sets: row.team1Sets,
		team2Sets: row.team2Sets,
		team1CurrentPoints: row.team1CurrentPoints,
		team2CurrentPoints: row.team2CurrentPoints,
		currentSet: row.currentSet,
		setsToWin: row.setsToWin,
		setScores: sets,
		currentSetStartedAt,
		scoringMode: JSON.parse(row.scoringModeJson ?? "{}"),
		matchTimeSeconds: row.matchTimeSeconds ?? 0
	};
}

export async function getMatch(matchId: string): Promise<Match | null> {
	const rows = await db.select().from(bracketMatches).where(eq(bracketMatches.id, matchId));
	return rows[0] ? rowToMatch(rows[0]) : null;
}

export async function getMatchScore(matchId: string): Promise<MatchScore | null> {
	const rows = await db.select().from(matchScores).where(eq(matchScores.matchId, matchId));
	return rows[0] ? rowToScore(rows[0]) : null;
}

export async function ensureMatchScore(matchId: string, tournamentId?: string) {
	const existing = await getMatchScore(matchId);
	if (existing) return existing;

	// Get the match to know its round
	const match = await getMatch(matchId);

	// Get scoring settings - check for round override
	let scoringSettings: ScoringSettings = DEFAULT_SCORING_SETTINGS;
	if (tournamentId) {
		const tournament = await getTournament(tournamentId);
		if (tournament?.settings) {
			// Calculate total rounds from bracket
			const allMatches = await listBracketMatches(tournamentId);
			const totalRounds = Math.max(...allMatches.filter(m => !m.isThirdPlaceMatch).map(m => m.roundNumber), 1);

			// Get round-specific scoring
			scoringSettings = getScoringForRound(
				tournament.settings,
				match?.roundNumber ?? 1,
				totalRounds,
				match?.isThirdPlaceMatch ?? false
			);
		}
	}

	await db.insert(matchScores).values({
		id: id("ms"),
		matchId,
		setsToWin: scoringSettings.setsToWin,
		scoringModeJson: JSON.stringify(scoringSettings),
		updatedAt: Date.now()
	});
	const created = await getMatchScore(matchId);
	if (!created) throw new Error("Failed to create match score");
	return created;
}

export async function resetMatchScore(
	matchId: string,
	opts?: { startedAt?: number | null; endedAt?: number | null; tournamentId?: string }
) {
	const now = Date.now();
	await ensureMatchScore(matchId, opts?.tournamentId);

	// When a tournamentId is provided (e.g. called from startMatch), always re-derive
	// the authoritative scoring settings from the tournament. This corrects cases where
	// the score record was previously created by a client subscription (match:score event)
	// without a tournamentId, causing DEFAULT_SCORING_SETTINGS (25 pts) to be stored
	// instead of the tournament's actual settings (e.g. 11 pts for fixed2x11_totalpoints).
	let scoringSettings: ScoringSettings | null = null;
	if (opts?.tournamentId) {
		const tournament = await getTournament(opts.tournamentId);
		if (tournament?.settings) {
			const match = await getMatch(matchId);
			const allMatches = await listBracketMatches(opts.tournamentId);
			const totalRounds = Math.max(...allMatches.filter(m => !m.isThirdPlaceMatch).map(m => m.roundNumber), 1);
			scoringSettings = getScoringForRound(
				tournament.settings,
				match?.roundNumber ?? 1,
				totalRounds,
				match?.isThirdPlaceMatch ?? false
			);
		}
	}

	const setsToWin = scoringSettings?.setsToWin ?? (await getMatchScore(matchId))?.setsToWin ?? 2;

	await db
		.update(matchScores)
		.set({
			team1Sets: 0,
			team2Sets: 0,
			currentSet: 1,
			setsToWin,
			...(scoringSettings ? { scoringModeJson: JSON.stringify(scoringSettings) } : {}),
			setScoresJson: serializeSetScoresJson([], opts?.startedAt ?? null),
			team1CurrentPoints: 0,
			team2CurrentPoints: 0,
			matchTimeSeconds: 0,
			startedAt: opts?.startedAt ?? null,
			endedAt: opts?.endedAt ?? null,
			updatedAt: now
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}

export async function startMatch(tournamentId: string, matchId: string) {
	const now = Date.now();

	const m = await getMatch(matchId);
	if (!m || m.tournamentId !== tournamentId) return { ok: false as const, error: "Nie znaleziono meczu" };
	if (m.status !== "pending") return { ok: false as const, error: 'Mecz nie jest w stanie "pending"' };
	if (!m.team1Id || !m.team2Id) return { ok: false as const, error: "Najpierw przypisz dwie drużyny" };

	const otherLive = await db
		.select({ id: bracketMatches.id })
		.from(bracketMatches)
		.where(
			and(
				eq(bracketMatches.tournamentId, tournamentId),
				eq(bracketMatches.status, "live"),
				ne(bracketMatches.id, matchId)
			)
		)
		.limit(1);
	if (otherLive.length > 0) return { ok: false as const, error: "Jest już aktywny mecz (live)" };

	await db.update(bracketMatches).set({ status: "live", updatedAt: now }).where(eq(bracketMatches.id, matchId));
	await resetMatchScore(matchId, { startedAt: now, endedAt: null, tournamentId });

	const updated = await getMatch(matchId);
	if (!updated) return { ok: false as const, error: "Nie udało się uruchomić meczu" };

	// Ensure tournament status is set to 'live' when the first match starts.
	try {
		const t = await getTournament(tournamentId);
		if (t && t.status !== "live" && t.status !== "completed") {
			await updateTournament(tournamentId, { status: "live" });
		}
	} catch {
		// Don't block starting the match if tournament status update fails.
	}

	return { ok: true as const, match: updated };
}

export async function endMatch(tournamentId: string, matchId: string, winnerId: string) {
	const now = Date.now();

	const m = await getMatch(matchId);
	if (!m || m.tournamentId !== tournamentId) return { ok: false as const, error: "Nie znaleziono meczu" };
	if (m.status !== "live") return { ok: false as const, error: "Mecz nie jest aktywny (live)" };
	if (winnerId !== m.team1Id && winnerId !== m.team2Id) return { ok: false as const, error: "Nieprawidłowy zwycięzca" };

	const loserId = winnerId === m.team1Id ? m.team2Id : m.team1Id;

	await db
		.update(bracketMatches)
		.set({ winnerId, status: "completed", updatedAt: now })
		.where(eq(bracketMatches.id, matchId));

	await db.update(matchScores).set({ endedAt: now, updatedAt: now }).where(eq(matchScores.matchId, matchId));

	if (m.nextMatchId) {
		const position = m.positionInRound % 2 === 1 ? "team1Id" : "team2Id";
		const patch = position === "team1Id" ? { team1Id: winnerId } : { team2Id: winnerId };
		await db
			.update(bracketMatches)
			.set({ ...patch, updatedAt: now })
			.where(eq(bracketMatches.id, m.nextMatchId));
	}

	// If this was a semifinal, feed its loser into the dedicated 3rd-place match.
	await maybeUpsertThirdPlaceMatch(tournamentId, m, loserId);

	const updated = await getMatch(matchId);
	if (!updated) return { ok: false as const, error: "Nie udało się zakończyć meczu" };
	return { ok: true as const, match: updated };
}

function getSemifinalSlot(match: Match, regularMatches: Match[]): "team1Id" | "team2Id" | null {
	if (regularMatches.length === 0) return null;

	const maxRound = Math.max(...regularMatches.map(m => m.roundNumber));
	const semifinalRound = maxRound - 1;
	if (semifinalRound < 1 || match.roundNumber !== semifinalRound) return null;

	const semifinals = regularMatches
		.filter(m => m.roundNumber === semifinalRound)
		.sort((a, b) => a.positionInRound - b.positionInRound);
	if (semifinals.length !== 2) return null;

	const semifinalIndex = semifinals.findIndex(m => m.id === match.id);
	if (semifinalIndex === -1) return null;

	return semifinalIndex === 0 ? "team1Id" : "team2Id";
}

async function maybeUpsertThirdPlaceMatch(tournamentId: string, completedMatch: Match, loserId: string | null) {
	if (!loserId) return;

	const allMatches = await listBracketMatches(tournamentId);
	const regularMatches = allMatches.filter(m => !m.isThirdPlaceMatch);
	const slot = getSemifinalSlot(completedMatch, regularMatches);
	if (!slot) return;

	const maxRound = Math.max(...regularMatches.map(m => m.roundNumber));
	const semifinalRound = maxRound - 1;
	const semifinals = regularMatches
		.filter(m => m.roundNumber === semifinalRound)
		.sort((a, b) => a.positionInRound - b.positionInRound);
	if (semifinals.length !== 2) return;

	// If a semifinal is effectively a bye (missing one side), there is no valid
	// pair of semifinal losers to play a 3rd-place match.
	if (semifinals.some(s => !s.team1Id || !s.team2Id)) return;

	const semifinalLoser = (m: Match): string | null => {
		if (!m.winnerId) return null;
		return m.winnerId === m.team1Id ? m.team2Id : m.team1Id;
	};

	const team1LoserId = semifinalLoser(semifinals[0]);
	const team2LoserId = semifinalLoser(semifinals[1]);

	let thirdPlace = allMatches.find(m => m.isThirdPlaceMatch) ?? null;

	// Backward compatibility for brackets generated before a dedicated
	// third-place node was created during bracket generation.
	if (!thirdPlace) {
		const now = Date.now();
		const thirdPlaceId = id("m");

		await db.insert(bracketMatches).values({
			id: thirdPlaceId,
			tournamentId,
			roundNumber: maxRound,
			matchNumber: 0,
			positionInRound: 0,
			team1Id: null,
			team2Id: null,
			winnerId: null,
			status: "pending",
			isThirdPlaceMatch: true,
			nextMatchId: null,
			scheduledTime: null,
			createdAt: now,
			updatedAt: now
		});

		thirdPlace = {
			id: thirdPlaceId,
			tournamentId,
			roundNumber: maxRound,
			matchNumber: 0,
			positionInRound: 0,
			team1Id: null,
			team2Id: null,
			winnerId: null,
			status: "pending",
			isThirdPlaceMatch: true,
			nextMatchId: null
		};
	}

	if (thirdPlace.status !== "pending") return;

	await db
		.update(bracketMatches)
		.set({ team1Id: team1LoserId, team2Id: team2LoserId, updatedAt: Date.now() })
		.where(eq(bracketMatches.id, thirdPlace.id));
}

export async function resetMatch(tournamentId: string, matchId: string) {
	const now = Date.now();

	const m = await getMatch(matchId);
	if (!m || m.tournamentId !== tournamentId) return { ok: false as const, error: "Nie znaleziono meczu" };
	if (m.status === "pending") return { ok: true as const, match: m };

	const allMatches = await listBracketMatches(tournamentId);
	const regularMatches = allMatches.filter(match => !match.isThirdPlaceMatch);
	const semifinalSlot = getSemifinalSlot(m, regularMatches);
	const thirdPlace = allMatches.find(match => match.isThirdPlaceMatch) ?? null;

	if (semifinalSlot && thirdPlace && thirdPlace.status !== "pending") {
		return { ok: false as const, error: "Nie można resetować po rozpoczęciu meczu o 3. miejsce" };
	}

	if (m.nextMatchId) {
		const next = await getMatch(m.nextMatchId);
		if (next && next.status !== "pending")
			return { ok: false as const, error: "Nie można resetować po rozpoczęciu kolejnego meczu" };

		// Remove propagated winner only if it matches what this match had set.
		if (m.winnerId) {
			const isOdd = m.positionInRound % 2 === 1;
			const patch = isOdd ? { team1Id: null } : { team2Id: null };
			const guard = isOdd ? eq(bracketMatches.team1Id, m.winnerId) : eq(bracketMatches.team2Id, m.winnerId);
			await db
				.update(bracketMatches)
				.set({ ...patch, updatedAt: now })
				.where(and(eq(bracketMatches.id, m.nextMatchId), guard));
		}
	}

	if (semifinalSlot && thirdPlace) {
		const loserId = m.winnerId ? (m.winnerId === m.team1Id ? m.team2Id : m.team1Id) : null;
		if (loserId) {
			const guard =
				semifinalSlot === "team1Id" ? eq(bracketMatches.team1Id, loserId) : eq(bracketMatches.team2Id, loserId);
			const patch = semifinalSlot === "team1Id" ? { team1Id: null } : { team2Id: null };
			await db
				.update(bracketMatches)
				.set({ ...patch, updatedAt: now })
				.where(and(eq(bracketMatches.id, thirdPlace.id), guard));
		}
	}

	await db
		.update(bracketMatches)
		.set({ status: "pending", winnerId: null, updatedAt: now })
		.where(eq(bracketMatches.id, matchId));
	await resetMatchScore(matchId, { startedAt: null, endedAt: null });

	const updated = await getMatch(matchId);
	if (!updated) return { ok: false as const, error: "Nie udało się zresetować meczu" };
	return { ok: true as const, match: updated };
}

export async function incrementPoint(matchId: string, team: "team1" | "team2") {
	const score = await ensureMatchScore(matchId);

	// Get scoring config (structured as ScoringSettings)
	const config = score.scoringMode as ScoringSettings | null;
	const mode = config?.mode ?? "sets"; // Default to sets scoring

	if (mode === "points" || mode === "timed") {
		// Simple points mode or timed mode - just increment (timer handled separately)
		const next = {
			team1CurrentPoints: score.team1CurrentPoints + (team === "team1" ? 1 : 0),
			team2CurrentPoints: score.team2CurrentPoints + (team === "team2" ? 1 : 0)
		};
		await db
			.update(matchScores)
			.set({ ...next, updatedAt: Date.now() })
			.where(eq(matchScores.matchId, matchId));
		return await getMatchScore(matchId);
	}

	// Volleyball sets mode
	const setsToWin = config?.setsToWin ?? score.setsToWin ?? 2;
	const tiebreakByTotalPoints = config?.tiebreakByTotalPoints ?? false;

	// "Tiebreak set" index (e.g. set 3 for setsToWin=2).
	// With tiebreakByTotalPoints this set becomes an "advantage set" only if total
	// points were equal after the regular sets; otherwise the match is resolved
	// before ever reaching it.
	const tiebreakSetNumber = setsToWin * 2 - 1;
	const regularSetCount = tiebreakSetNumber - 1;

	// Sum points from completed sets.
	const completedTotals = score.setScores.reduce(
		(acc, s) => {
			acc.t1 += s.t1;
			acc.t2 += s.t2;
			return acc;
		},
		{ t1: 0, t2: 0 }
	);

	// New behavior: when total points are tied after regular sets, continue with an
	// attached advantage phase that still belongs to the last regular set (no visual
	// "set 3" jump for the 2x11 total-points preset).
	// After entering the advantage phase the set that triggered the tie is "un-awarded"
	// (see the else branch below), so one team ends up at setsToWin-1 sets and the
	// other at setsToWin-2.  We detect this combination together with tied completedTotals.
	const isAttachedAdvantagePhase =
		tiebreakByTotalPoints &&
		score.currentSet === regularSetCount &&
		score.setScores.length >= regularSetCount &&
		Math.abs(score.team1Sets - score.team2Sets) === 1 &&
		Math.max(score.team1Sets, score.team2Sets) === setsToWin - 1 &&
		completedTotals.t1 === completedTotals.t2;

	// Detect whether we are currently in the advantage set (only possible when
	// tiebreakByTotalPoints is active and total points happened to be tied).
	// Keep legacy detection for already-running matches that may already be in set 3.
	const isAdvantageSet = isAttachedAdvantagePhase || (tiebreakByTotalPoints && score.currentSet === tiebreakSetNumber);

	// Standard tiebreak set (only when tiebreakByTotalPoints is disabled)
	const isStandardTieBreak = !tiebreakByTotalPoints && score.currentSet === tiebreakSetNumber;

	// Points required to win the current set
	const pointsToWin = isAdvantageSet
		? 1 // advantage set: any single point wins (subject to mustWinByTwo below)
		: isStandardTieBreak
			? (config?.pointsToWinTieBreak ?? 15)
			: (config?.pointsToWinSet ?? 25);

	const minAdvantage = config?.mustWinByTwo ? 2 : 1;

	let t1Points = score.team1CurrentPoints + (team === "team1" ? 1 : 0);
	let t2Points = score.team2CurrentPoints + (team === "team2" ? 1 : 0);
	let t1Sets = score.team1Sets;
	let t2Sets = score.team2Sets;
	let currentSet = score.currentSet;
	const setScores = [...score.setScores];
	let currentSetStartedAt = score.currentSetStartedAt;

	// Check if this point wins the set
	const scoringTeamPoints = team === "team1" ? t1Points : t2Points;
	const otherTeamPoints = team === "team1" ? t2Points : t1Points;
	const isSetWon = scoringTeamPoints >= pointsToWin && scoringTeamPoints - otherTeamPoints >= minAdvantage;

	if (isSetWon) {
		const now = Date.now();
		if (isAttachedAdvantagePhase) {
			// Resolve attached advantage phase by updating the last regular set's
			// final score to whatever the running point totals are.  Since t1Points/t2Points
			// are maintained continuously (they're **not** zeroed when the phase begins),
			// they represent the cumulative score of that set including all advantage
			// points.  Simply overwrite the stored set record instead of adding it again.
			if (setScores.length > 0) {
				const lastIndex = setScores.length - 1;
				setScores[lastIndex] = {
					...setScores[lastIndex],
					t1: t1Points,
					t2: t2Points,
					endedAt: now
				};
			}

			// Jump the winning team's set count directly to setsToWin.
			// During the advantage phase the set that triggered the tie was un-awarded
			// (one team is at setsToWin-2), so a simple +1 would not reach setsToWin.
			if (team === "team1") t1Sets = setsToWin;
			else t2Sets = setsToWin;

			// Do NOT reset points – they continue climbing through the advantage phase
		} else {
			// Record set score with duration timestamps
			setScores.push({
				t1: t1Points,
				t2: t2Points,
				startedAt: currentSetStartedAt,
				endedAt: now
			});

			// Award set
			if (team === "team1") t1Sets++;
			else t2Sets++;

			// ── tiebreakByTotalPoints resolution ─────────────────────────────────────
			// After both teams have played (setsToWin - 1) sets each and now they are
			// still tied in sets (e.g. 1-1 with setsToWin=2), resolve by total points.
			if (tiebreakByTotalPoints && t1Sets === t2Sets && t1Sets === setsToWin - 1) {
				const totalT1 = setScores.reduce((sum, s) => sum + s.t1, 0);
				const totalT2 = setScores.reduce((sum, s) => sum + s.t2, 0);

				if (totalT1 > totalT2) {
					// team1 wins by total points – award deciding set without extra play
					t1Sets++;
					t1Points = 0;
					t2Points = 0;
					currentSetStartedAt = now;
				} else if (totalT2 > totalT1) {
					// team2 wins by total points – award deciding set without extra play
					t2Sets++;
					t1Points = 0;
					t2Points = 0;
					currentSetStartedAt = now;
				} else {
					// Totals tied: begin an attached advantage phase.
					// Un-award the set that was just granted to the scoring team so the
					// scoreboard shows the correct set lead (e.g. 1:0 instead of 1:1).
					// The advantage phase is detected next time via the asymmetric set
					// counts + equal completedTotals condition.
					if (team === "team1") t1Sets--;
					else t2Sets--;
					// Do **not** zero out running points; keep them exactly at the last
					// set's final score so the scoreboard continues from there.
					// currentSetStartedAt stays unchanged (continuous set duration).
				}
			} else {
				// Standard progression to next set.
				t1Points = 0;
				t2Points = 0;

				// Do not advance set counter once the match is already decided.
				if (t1Sets < setsToWin && t2Sets < setsToWin) {
					currentSet++;
				}
				currentSetStartedAt = now;
			}
			// ─────────────────────────────────────────────────────────────────────────
		}
	}

	// In total-points tiebreak mode the UI should never progress beyond the last
	// regular set index (e.g. stay on set 2 for fixed 2x11 mode).
	if (tiebreakByTotalPoints) {
		currentSet = Math.min(currentSet, regularSetCount);
	}

	await db
		.update(matchScores)
		.set({
			team1CurrentPoints: t1Points,
			team2CurrentPoints: t2Points,
			team1Sets: t1Sets,
			team2Sets: t2Sets,
			currentSet,
			setScoresJson: serializeSetScoresJson(setScores, currentSetStartedAt),
			updatedAt: Date.now()
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}

export async function decrementPoint(matchId: string, team: "team1" | "team2") {
	const score = await ensureMatchScore(matchId);

	// Simple decrement - just reduce current points, don't undo sets
	const next = {
		team1CurrentPoints: Math.max(0, score.team1CurrentPoints - (team === "team1" ? 1 : 0)),
		team2CurrentPoints: Math.max(0, score.team2CurrentPoints - (team === "team2" ? 1 : 0))
	};
	await db
		.update(matchScores)
		.set({ ...next, updatedAt: Date.now() })
		.where(eq(matchScores.matchId, matchId));
	return await getMatchScore(matchId);
}

// Manually award a set (for corrections or simple scoring)
export async function awardSet(matchId: string, team: "team1" | "team2") {
	const score = await ensureMatchScore(matchId);
	const now = Date.now();

	const t1Points = score.team1CurrentPoints;
	const t2Points = score.team2CurrentPoints;
	const setScores = [
		...score.setScores,
		{
			t1: t1Points,
			t2: t2Points,
			startedAt: score.currentSetStartedAt,
			endedAt: now
		}
	];

	await db
		.update(matchScores)
		.set({
			team1Sets: score.team1Sets + (team === "team1" ? 1 : 0),
			team2Sets: score.team2Sets + (team === "team2" ? 1 : 0),
			team1CurrentPoints: 0,
			team2CurrentPoints: 0,
			currentSet: score.currentSet + 1,
			setScoresJson: serializeSetScoresJson(setScores, now),
			updatedAt: now
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}

// Undo last set (for corrections)
export async function undoSet(matchId: string) {
	const score = await ensureMatchScore(matchId);

	if (score.setScores.length === 0) return score;

	const setScores = [...score.setScores];
	const lastSet = setScores.pop()!;

	// Determine which team won the last set
	const t1WonLast = lastSet.t1 > lastSet.t2;

	// Restore currentSetStartedAt to the undone set's startedAt
	const restoredStartedAt = lastSet.startedAt ?? null;

	await db
		.update(matchScores)
		.set({
			team1Sets: Math.max(0, score.team1Sets - (t1WonLast ? 1 : 0)),
			team2Sets: Math.max(0, score.team2Sets - (t1WonLast ? 0 : 1)),
			team1CurrentPoints: lastSet.t1,
			team2CurrentPoints: lastSet.t2,
			currentSet: Math.max(1, score.currentSet - 1),
			setScoresJson: serializeSetScoresJson(setScores, restoredStartedAt),
			updatedAt: Date.now()
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}

// Set current points directly (for manual corrections)
export async function setPointsDirect(matchId: string, team1Points: number, team2Points: number) {
	await ensureMatchScore(matchId);

	await db
		.update(matchScores)
		.set({
			team1CurrentPoints: team1Points,
			team2CurrentPoints: team2Points,
			updatedAt: Date.now()
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}

// Edit a specific completed set score (for corrections)
export async function editSetScore(matchId: string, setIndex: number, t1: number, t2: number) {
	const score = await ensureMatchScore(matchId);

	if (setIndex < 0 || setIndex >= score.setScores.length) {
		return score; // Invalid index, no change
	}

	const setScores = [...score.setScores];
	// Preserve existing timestamps when editing score
	setScores[setIndex] = { ...setScores[setIndex], t1, t2 };

	// Recalculate set counts based on all set scores
	let team1Sets = 0;
	let team2Sets = 0;
	for (const s of setScores) {
		if (s.t1 > s.t2) team1Sets++;
		else if (s.t2 > s.t1) team2Sets++;
	}

	await db
		.update(matchScores)
		.set({
			team1Sets,
			team2Sets,
			setScoresJson: serializeSetScoresJson(setScores, score.currentSetStartedAt),
			updatedAt: Date.now()
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}

// Update match timer (for timed mode)
export async function updateMatchTime(matchId: string, timeSeconds: number) {
	await db
		.update(matchScores)
		.set({
			matchTimeSeconds: timeSeconds,
			updatedAt: Date.now()
		})
		.where(eq(matchScores.matchId, matchId));

	return await getMatchScore(matchId);
}
