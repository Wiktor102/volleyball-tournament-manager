import { eq, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { bracketMatches, matchScores } from '../db/schema'
import { id } from '../utils/id'

type MatchRow = InferSelectModel<typeof bracketMatches>
type ScoreRow = InferSelectModel<typeof matchScores>

export type MatchStatus = 'pending' | 'live' | 'completed'

export type Match = {
  id: string
  tournamentId: string
  roundNumber: number
  matchNumber: number
  positionInRound: number
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  status: MatchStatus
  isThirdPlaceMatch: boolean
  nextMatchId: string | null
}

export type MatchScore = {
  matchId: string
  team1Sets: number
  team2Sets: number
  team1CurrentPoints: number
  team2CurrentPoints: number
  currentSet: number
  setsToWin: number
  setScores: Array<{ t1: number; t2: number }>
  scoringMode: Record<string, unknown>
}

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
    nextMatchId: row.nextMatchId ?? null,
  }
}

function rowToScore(row: ScoreRow): MatchScore {
  return {
    matchId: row.matchId,
    team1Sets: row.team1Sets,
    team2Sets: row.team2Sets,
    team1CurrentPoints: row.team1CurrentPoints,
    team2CurrentPoints: row.team2CurrentPoints,
    currentSet: row.currentSet,
    setsToWin: row.setsToWin,
    setScores: JSON.parse(row.setScoresJson ?? '[]'),
    scoringMode: JSON.parse(row.scoringModeJson ?? '{}'),
  }
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const rows = await db.select().from(bracketMatches).where(eq(bracketMatches.id, matchId))
  return rows[0] ? rowToMatch(rows[0]) : null
}

export async function getMatchScore(matchId: string): Promise<MatchScore | null> {
  const rows = await db.select().from(matchScores).where(eq(matchScores.matchId, matchId))
  return rows[0] ? rowToScore(rows[0]) : null
}

export async function ensureMatchScore(matchId: string) {
  const existing = await getMatchScore(matchId)
  if (existing) return existing
  await db.insert(matchScores).values({
    id: id('ms'),
    matchId,
    scoringModeJson: JSON.stringify({ mode: 'points', pointsToWin: 25, mustWinByTwo: true }),
    updatedAt: Date.now(),
  })
  const created = await getMatchScore(matchId)
  if (!created) throw new Error('Failed to create match score')
  return created
}

export async function incrementPoint(matchId: string, team: 'team1' | 'team2') {
  const score = await ensureMatchScore(matchId)
  const next = {
    team1CurrentPoints: score.team1CurrentPoints + (team === 'team1' ? 1 : 0),
    team2CurrentPoints: score.team2CurrentPoints + (team === 'team2' ? 1 : 0),
  }
  await db
    .update(matchScores)
    .set({ ...next, updatedAt: Date.now() })
    .where(eq(matchScores.matchId, matchId))
  return await getMatchScore(matchId)
}

export async function decrementPoint(matchId: string, team: 'team1' | 'team2') {
  const score = await ensureMatchScore(matchId)
  const next = {
    team1CurrentPoints: Math.max(0, score.team1CurrentPoints - (team === 'team1' ? 1 : 0)),
    team2CurrentPoints: Math.max(0, score.team2CurrentPoints - (team === 'team2' ? 1 : 0)),
  }
  await db
    .update(matchScores)
    .set({ ...next, updatedAt: Date.now() })
    .where(eq(matchScores.matchId, matchId))
  return await getMatchScore(matchId)
}

export async function createDemoMatch(tournamentId: string) {
  const now = Date.now()
  const matchId = id('m')
  await db.insert(bracketMatches).values({
    id: matchId,
    tournamentId,
    roundNumber: 1,
    matchNumber: 1,
    positionInRound: 1,
    status: 'live',
    isThirdPlaceMatch: false,
    createdAt: now,
    updatedAt: now,
  })
  await ensureMatchScore(matchId)
  return await getMatch(matchId)
}
