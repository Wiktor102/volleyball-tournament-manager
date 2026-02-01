import { and, eq, ne, type InferSelectModel } from 'drizzle-orm'
import { db } from '../db'
import { bracketMatches, matchScores } from '../db/schema'
import { id } from '../utils/id'
import { getOrCreateDemoTeams } from './team.service'

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

export async function resetMatchScore(matchId: string, opts?: { startedAt?: number | null; endedAt?: number | null }) {
  const now = Date.now()
  await ensureMatchScore(matchId)

  await db
    .update(matchScores)
    .set({
      team1Sets: 0,
      team2Sets: 0,
      currentSet: 1,
      setsToWin: 2,
      setScoresJson: '[]',
      team1CurrentPoints: 0,
      team2CurrentPoints: 0,
      matchTimeSeconds: 0,
      startedAt: opts?.startedAt ?? null,
      endedAt: opts?.endedAt ?? null,
      updatedAt: now,
    })
    .where(eq(matchScores.matchId, matchId))

  return await getMatchScore(matchId)
}

export async function startMatch(tournamentId: string, matchId: string) {
  const now = Date.now()

  const m = await getMatch(matchId)
  if (!m || m.tournamentId !== tournamentId) return { ok: false as const, error: 'Nie znaleziono meczu' }
  if (m.status !== 'pending') return { ok: false as const, error: 'Mecz nie jest w stanie "pending"' }
  if (!m.team1Id || !m.team2Id) return { ok: false as const, error: 'Najpierw przypisz dwie drużyny' }

  const otherLive = await db
    .select({ id: bracketMatches.id })
    .from(bracketMatches)
    .where(and(eq(bracketMatches.tournamentId, tournamentId), eq(bracketMatches.status, 'live'), ne(bracketMatches.id, matchId)))
    .limit(1)
  if (otherLive.length > 0) return { ok: false as const, error: 'Jest już aktywny mecz (live)' }

  await db.update(bracketMatches).set({ status: 'live', updatedAt: now }).where(eq(bracketMatches.id, matchId))
  await resetMatchScore(matchId, { startedAt: now, endedAt: null })

  const updated = await getMatch(matchId)
  if (!updated) return { ok: false as const, error: 'Nie udało się uruchomić meczu' }
  return { ok: true as const, match: updated }
}

export async function endMatch(tournamentId: string, matchId: string, winnerId: string) {
  const now = Date.now()

  const m = await getMatch(matchId)
  if (!m || m.tournamentId !== tournamentId) return { ok: false as const, error: 'Nie znaleziono meczu' }
  if (m.status !== 'live') return { ok: false as const, error: 'Mecz nie jest aktywny (live)' }
  if (winnerId !== m.team1Id && winnerId !== m.team2Id) return { ok: false as const, error: 'Nieprawidłowy zwycięzca' }

  await db
    .update(bracketMatches)
    .set({ winnerId, status: 'completed', updatedAt: now })
    .where(eq(bracketMatches.id, matchId))

  await db.update(matchScores).set({ endedAt: now, updatedAt: now }).where(eq(matchScores.matchId, matchId))

  if (m.nextMatchId) {
    const position = m.positionInRound % 2 === 1 ? 'team1Id' : 'team2Id'
    const patch = position === 'team1Id' ? { team1Id: winnerId } : { team2Id: winnerId }
    await db.update(bracketMatches).set({ ...patch, updatedAt: now }).where(eq(bracketMatches.id, m.nextMatchId))
  }

  const updated = await getMatch(matchId)
  if (!updated) return { ok: false as const, error: 'Nie udało się zakończyć meczu' }
  return { ok: true as const, match: updated }
}

export async function resetMatch(tournamentId: string, matchId: string) {
  const now = Date.now()

  const m = await getMatch(matchId)
  if (!m || m.tournamentId !== tournamentId) return { ok: false as const, error: 'Nie znaleziono meczu' }
  if (m.status === 'pending') return { ok: true as const, match: m }

  if (m.nextMatchId) {
    const next = await getMatch(m.nextMatchId)
    if (next && next.status !== 'pending') return { ok: false as const, error: 'Nie można resetować po rozpoczęciu kolejnego meczu' }

    // Remove propagated winner only if it matches what this match had set.
    if (m.winnerId) {
      const isOdd = m.positionInRound % 2 === 1
      const patch = isOdd ? { team1Id: null } : { team2Id: null }
      const guard = isOdd ? eq(bracketMatches.team1Id, m.winnerId) : eq(bracketMatches.team2Id, m.winnerId)
      await db
        .update(bracketMatches)
        .set({ ...patch, updatedAt: now })
        .where(and(eq(bracketMatches.id, m.nextMatchId), guard))
    }
  }

  await db.update(bracketMatches).set({ status: 'pending', winnerId: null, updatedAt: now }).where(eq(bracketMatches.id, matchId))
  await resetMatchScore(matchId, { startedAt: null, endedAt: null })

  const updated = await getMatch(matchId)
  if (!updated) return { ok: false as const, error: 'Nie udało się zresetować meczu' }
  return { ok: true as const, match: updated }
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

  const [a, b] = await getOrCreateDemoTeams(tournamentId)

  await db.insert(bracketMatches).values({
    id: matchId,
    tournamentId,
    roundNumber: 0,
    matchNumber: 0,
    positionInRound: 0,
    team1Id: a?.id ?? null,
    team2Id: b?.id ?? null,
    status: 'live',
    isThirdPlaceMatch: false,
    createdAt: now,
    updatedAt: now,
  })
  await ensureMatchScore(matchId)
  return await getMatch(matchId)
}
