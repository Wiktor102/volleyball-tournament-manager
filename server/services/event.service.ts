import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "../db";
import { matchEvents, bracketMatches } from "../db/schema";
import { id } from "../utils/id";

// Types
export type EventType = "ace" | "ball-out" | "challenge" | "net-touch" | "block" | "timeout";
export type EventTeam = "team1" | "team2";

export type ScoreSnapshot = {
	team1Points: number;
	team2Points: number;
	team1Sets: number;
	team2Sets: number;
};

export type MatchEvent = {
	id: string;
	matchId: string;
	tournamentId: string;
	eventType: EventType;
	team: EventTeam;
	playerId: string | null;
	setNumber: number;
	scoreSnapshot: ScoreSnapshot | null;
	metadata: Record<string, unknown> | null;
	createdAt: number;
};

export type MatchStats = {
	team1: Record<EventType, number>;
	team2: Record<EventType, number>;
};

export type PlayerStats = {
	playerId: string;
	stats: Record<EventType, number>;
	totalEvents: number;
};

const ALL_EVENT_TYPES: EventType[] = ["ace", "ball-out", "challenge", "net-touch", "block", "timeout"];

function emptyTeamStats(): Record<EventType, number> {
	return Object.fromEntries(ALL_EVENT_TYPES.map(t => [t, 0])) as Record<EventType, number>;
}

function emptyMatchStats(): MatchStats {
	return { team1: emptyTeamStats(), team2: emptyTeamStats() };
}

function rowToMatchEvent(row: typeof matchEvents.$inferSelect): MatchEvent {
	return {
		id: row.id,
		matchId: row.matchId,
		tournamentId: row.tournamentId,
		eventType: row.eventType as EventType,
		team: row.team as EventTeam,
		playerId: row.playerId ?? null,
		setNumber: row.setNumber,
		scoreSnapshot: row.scoreSnapshot ? (JSON.parse(row.scoreSnapshot) as ScoreSnapshot) : null,
		metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null,
		createdAt: row.createdAt
	};
}

export async function logEvent(input: {
	matchId: string;
	tournamentId: string;
	eventType: EventType;
	team: EventTeam;
	playerId?: string | null;
	setNumber: number;
	scoreSnapshot?: ScoreSnapshot;
	metadata?: Record<string, unknown>;
}): Promise<MatchEvent> {
	const newId = id("evt");
	const now = Date.now();

	await db.insert(matchEvents).values({
		id: newId,
		matchId: input.matchId,
		tournamentId: input.tournamentId,
		eventType: input.eventType,
		team: input.team,
		playerId: input.playerId ?? null,
		setNumber: input.setNumber,
		scoreSnapshot: input.scoreSnapshot ? JSON.stringify(input.scoreSnapshot) : null,
		metadata: input.metadata ? JSON.stringify(input.metadata) : null,
		createdAt: now
	});

	const [row] = await db.select().from(matchEvents).where(eq(matchEvents.id, newId));

	return rowToMatchEvent(row);
}

export async function deleteEvent(eventId: string): Promise<MatchEvent | null> {
	const rows = await db.select().from(matchEvents).where(eq(matchEvents.id, eventId));

	const row = rows[0];
	if (!row) return null;

	await db.delete(matchEvents).where(eq(matchEvents.id, eventId));
	return rowToMatchEvent(row);
}

export async function clearMatchEvents(matchId: string): Promise<number> {
	const existing = await db.select({ id: matchEvents.id }).from(matchEvents).where(eq(matchEvents.matchId, matchId));

	const count = existing.length;
	if (count > 0) {
		await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
	}
	return count;
}

export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
	const rows = await db
		.select()
		.from(matchEvents)
		.where(eq(matchEvents.matchId, matchId))
		.orderBy(asc(matchEvents.createdAt));

	return rows.map(rowToMatchEvent);
}

export async function getMatchStats(matchId: string): Promise<MatchStats> {
	const events = await getMatchEvents(matchId);
	const stats = emptyMatchStats();

	for (const event of events) {
		const team = event.team as EventTeam;
		const type = event.eventType as EventType;
		if (team === "team1" || team === "team2") {
			stats[team][type] = (stats[team][type] ?? 0) + 1;
		}
	}

	return stats;
}

export async function getTeamStats(tournamentId: string, teamId: string): Promise<MatchStats> {
	// Find all matches in this tournament where this team participated
	const matches = await db
		.select()
		.from(bracketMatches)
		.where(
			and(
				eq(bracketMatches.tournamentId, tournamentId),
				sql`(${bracketMatches.team1Id} = ${teamId} OR ${bracketMatches.team2Id} = ${teamId})`
			)
		);

	const stats = emptyMatchStats();

	for (const match of matches) {
		// Determine which slot this team occupies in this match
		const slot: EventTeam | null = match.team1Id === teamId ? "team1" : match.team2Id === teamId ? "team2" : null;

		if (!slot) continue;

		const events = await db
			.select()
			.from(matchEvents)
			.where(and(eq(matchEvents.matchId, match.id), eq(matchEvents.team, slot)));

		for (const event of events) {
			const type = event.eventType as EventType;
			stats[slot][type] = (stats[slot][type] ?? 0) + 1;
		}
	}

	return stats;
}

export async function getPlayerStats(tournamentId: string, playerId?: string): Promise<PlayerStats[]> {
	const conditions = playerId
		? and(eq(matchEvents.tournamentId, tournamentId), eq(matchEvents.playerId, playerId))
		: eq(matchEvents.tournamentId, tournamentId);

	const rows = await db.select().from(matchEvents).where(conditions);

	// Group by playerId
	const map = new Map<string, Record<EventType, number>>();

	for (const row of rows) {
		if (!row.playerId) continue;
		if (!map.has(row.playerId)) {
			map.set(row.playerId, emptyTeamStats());
		}
		const playerStats = map.get(row.playerId)!;
		const type = row.eventType as EventType;
		playerStats[type] = (playerStats[type] ?? 0) + 1;
	}

	return Array.from(map.entries()).map(([pid, stats]) => ({
		playerId: pid,
		stats,
		totalEvents: Object.values(stats).reduce((sum, n) => sum + n, 0)
	}));
}
