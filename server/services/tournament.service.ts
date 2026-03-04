import { eq, type InferSelectModel } from "drizzle-orm";
import { db } from "../db";
import { tournaments, teams, bracketMatches, matchScores } from "../db/schema";
import { id } from "../utils/id";

export type ScoringSettings = {
	mode: "sets" | "points" | "timed";
	setsToWin: number;
	pointsToWinSet: number;
	pointsToWinTieBreak: number;
	mustWinByTwo: boolean;
	/**
	 * When true and sets are tied (both teams have setsToWin-1 sets), instead of
	 * playing a standard tiebreak set the winner is determined by total points
	 * accumulated across all previous sets.  If total points are also equal,
	 * an "advantage" set is played (first to score with mustWinByTwo lead).
	 */
	tiebreakByTotalPoints?: boolean;
	// Timed mode settings
	matchDurationMinutes?: number;
	overtimeMinutes?: number;
	goldenGoal?: boolean;
};

// Round-specific scoring override (partial - inherits from default)
export type RoundScoringOverride = {
	round: number | "final" | "semifinal" | "thirdPlace";
	settings: Partial<ScoringSettings>;
};

export type TournamentSettings = {
	scoring: ScoringSettings;
	roundOverrides?: RoundScoringOverride[];
	matchEventsEnabled?: boolean; // default true
	playerStatsEnabled?: boolean; // default false
};

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
	mode: "sets",
	setsToWin: 2,
	pointsToWinSet: 25,
	pointsToWinTieBreak: 15,
	mustWinByTwo: true,
	tiebreakByTotalPoints: false,
	matchDurationMinutes: 10,
	overtimeMinutes: 2,
	goldenGoal: true
};

export type Tournament = {
	id: string;
	name: string;
	status: "draft" | "live" | "completed";
	settings: TournamentSettings;
	createdAt: number;
	updatedAt: number;
};

type TournamentRow = InferSelectModel<typeof tournaments>;

function rowToTournament(row: TournamentRow): Tournament {
	const rawSettings = JSON.parse(row.settingsJson ?? "{}");
	// Ensure scoring settings have proper defaults
	const settings: TournamentSettings = {
		scoring: {
			...DEFAULT_SCORING_SETTINGS,
			...(rawSettings.scoring ?? {})
		},
		roundOverrides: rawSettings.roundOverrides ?? [],
		matchEventsEnabled: rawSettings.matchEventsEnabled ?? true,
		playerStatsEnabled: rawSettings.playerStatsEnabled ?? false
	};
	return {
		id: row.id,
		name: row.name,
		status: row.status as Tournament["status"],
		settings,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
	const rows = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
	return rows[0] ? rowToTournament(rows[0]) : null;
}

/**
 * Get scoring settings for a specific round.
 * Round numbers: positive = actual round (1, 2, 3...), -1 = final, -2 = semifinal, 0 = 3rd place match
 * Falls back to tournament default if no override exists.
 */
export function getScoringForRound(
	settings: TournamentSettings,
	roundNumber: number,
	totalRounds: number,
	isThirdPlaceMatch: boolean
): ScoringSettings {
	const base = settings.scoring;

	// Determine which override key to look for
	let lookupKey: number | "final" | "semifinal" | "thirdPlace";
	if (isThirdPlaceMatch) {
		lookupKey = "thirdPlace";
	} else if (roundNumber === totalRounds) {
		lookupKey = "final";
	} else if (roundNumber === totalRounds - 1 && totalRounds > 1) {
		lookupKey = "semifinal";
	} else {
		lookupKey = roundNumber;
	}

	// Find override
	const override = settings.roundOverrides?.find(o => o.round === lookupKey);
	if (!override) return base;

	// Merge override with base
	return {
		...base,
		...override.settings
	};
}

export async function createTournament(input: { name: string; settings?: Partial<TournamentSettings> }) {
	const now = Date.now();
	const tournamentId = id("t");
	const settings: TournamentSettings = {
		scoring: {
			...DEFAULT_SCORING_SETTINGS,
			...(input.settings?.scoring ?? {})
		},
		roundOverrides: input.settings?.roundOverrides,
		matchEventsEnabled: input.settings?.matchEventsEnabled ?? true,
		playerStatsEnabled: input.settings?.playerStatsEnabled ?? false
	};
	await db.insert(tournaments).values({
		id: tournamentId,
		name: input.name,
		status: "draft",
		settingsJson: JSON.stringify(settings),
		createdAt: now,
		updatedAt: now
	});
	const t = await getTournament(tournamentId);
	if (!t) throw new Error("Failed to create tournament");
	return t;
}

export async function updateTournament(
	tournamentId: string,
	patch: Partial<Pick<Tournament, "name" | "status">> & { settings?: Partial<TournamentSettings> }
) {
	const now = Date.now();
	const existing = await getTournament(tournamentId);
	if (!existing) return null;

	// Deep merge settings
	const mergedSettings: TournamentSettings = {
		scoring: {
			...existing.settings.scoring,
			...(patch.settings?.scoring ?? {})
		},
		roundOverrides: patch.settings?.roundOverrides ?? existing.settings.roundOverrides,
		matchEventsEnabled: patch.settings?.matchEventsEnabled ?? existing.settings.matchEventsEnabled ?? true,
		playerStatsEnabled: patch.settings?.playerStatsEnabled ?? existing.settings.playerStatsEnabled ?? false
	};

	await db
		.update(tournaments)
		.set({
			name: patch.name ?? existing.name,
			status: patch.status ?? existing.status,
			settingsJson: JSON.stringify(mergedSettings),
			updatedAt: now
		})
		.where(eq(tournaments.id, tournamentId));
	return await getTournament(tournamentId);
}

export async function listTournaments(): Promise<Tournament[]> {
	const rows = await db.select().from(tournaments).orderBy(tournaments.createdAt);
	return rows.map(rowToTournament);
}

export async function deleteTournament(tournamentId: string): Promise<boolean> {
	const existing = await getTournament(tournamentId);
	if (!existing) return false;

	// Delete in order: matchScores -> bracketMatches -> teams -> tournament
	const matchRows = await db
		.select({ id: bracketMatches.id })
		.from(bracketMatches)
		.where(eq(bracketMatches.tournamentId, tournamentId));
	for (const m of matchRows) {
		await db.delete(matchScores).where(eq(matchScores.matchId, m.id));
	}
	await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, tournamentId));
	await db.delete(teams).where(eq(teams.tournamentId, tournamentId));
	await db.delete(tournaments).where(eq(tournaments.id, tournamentId));

	return true;
}

export async function getOrCreateDefaultTournament() {
	const rows = await db.select().from(tournaments).limit(1);
	if (rows[0]) return rowToTournament(rows[0]);
	return await createTournament({ name: "Turniej siatkówki" });
}
