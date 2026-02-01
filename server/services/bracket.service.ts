import { and, eq, ne } from 'drizzle-orm'
import { db } from '../db'
import { bracketMatches } from '../db/schema'
import { id } from '../utils/id'
import { listTeams } from './team.service'

export type BracketMatch = {
  id: string
  tournamentId: string
  roundNumber: number
  matchNumber: number
  positionInRound: number
  team1Id: string | null
  team2Id: string | null
  winnerId: string | null
  status: 'pending' | 'live' | 'completed'
  isThirdPlaceMatch: boolean
  nextMatchId: string | null
}

export async function listBracketMatches(tournamentId: string): Promise<BracketMatch[]> {
  const rows = await db
    .select()
    .from(bracketMatches)
    .where(and(eq(bracketMatches.tournamentId, tournamentId), ne(bracketMatches.roundNumber, 0)))
  return rows.map((r) => ({
    id: r.id,
    tournamentId: r.tournamentId,
    roundNumber: r.roundNumber,
    matchNumber: r.matchNumber,
    positionInRound: r.positionInRound,
    team1Id: r.team1Id ?? null,
    team2Id: r.team2Id ?? null,
    winnerId: r.winnerId ?? null,
    status: r.status as BracketMatch['status'],
    isThirdPlaceMatch: !!r.isThirdPlaceMatch,
    nextMatchId: r.nextMatchId ?? null,
  }))
}

function nextPowerOfTwo(n: number) {
  let p = 1
  while (p < n) p *= 2
  return p
}

export async function generateBracket(tournamentId: string) {
  const existing = await listBracketMatches(tournamentId)
  if (existing.length > 0) return { ok: false as const, error: 'Drabinka już istnieje' }

  const teams = await listTeams(tournamentId)
  if (teams.length < 2) return { ok: false as const, error: 'Dodaj przynajmniej 2 drużyny' }

  const now = Date.now()
  const size = nextPowerOfTwo(teams.length)
  const rounds = Math.log2(size)

  // Ensure deterministic order: use existing DB order (or seed later)
  const ids = teams.map((t) => t.id)

  // Pre-generate IDs per round/position so we can wire nextMatchId.
  const roundIds: string[][] = []
  for (let r = 1; r <= rounds; r++) {
    const matchesInRound = size / Math.pow(2, r)
    roundIds[r] = []
    for (let p = 1; p <= matchesInRound; p++) roundIds[r][p] = id('m')
  }

  const values: Array<typeof bracketMatches.$inferInsert> = []

  for (let r = 1; r <= rounds; r++) {
    const matchesInRound = size / Math.pow(2, r)
    for (let p = 1; p <= matchesInRound; p++) {
      const matchId = roundIds[r][p]
      const nextMatchId = r < rounds ? roundIds[r + 1][Math.ceil(p / 2)] : null

      let team1Id: string | null = null
      let team2Id: string | null = null

      if (r === 1) {
        const slot1 = (p - 1) * 2
        const slot2 = slot1 + 1
        team1Id = ids[slot1] ?? null
        team2Id = ids[slot2] ?? null
      }

      values.push({
        id: matchId,
        tournamentId,
        roundNumber: r,
        matchNumber: p,
        positionInRound: p,
        team1Id,
        team2Id,
        winnerId: null,
        status: 'pending',
        isThirdPlaceMatch: false,
        nextMatchId,
        scheduledTime: null,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  await db.insert(bracketMatches).values(values)

  // Auto-advance byes: if exactly one team in a match, set it as winner and propagate.
  // Keep it simple: loop until no changes.
  let changed = true
  while (changed) {
    changed = false
    const matches = await listBracketMatches(tournamentId)

    for (const m of matches) {
      if (m.status !== 'pending') continue
      if (m.roundNumber !== 1) continue
      if (m.winnerId) continue

      const has1 = !!m.team1Id
      const has2 = !!m.team2Id
      if (has1 === has2) continue

      const winnerId = m.team1Id ?? m.team2Id
      if (!winnerId) continue

      await db
        .update(bracketMatches)
        .set({ winnerId, status: 'completed', updatedAt: Date.now() })
        .where(eq(bracketMatches.id, m.id))

      if (m.nextMatchId) {
        const position = m.positionInRound % 2 === 1 ? 'team1Id' : 'team2Id'
        const patch = position === 'team1Id' ? { team1Id: winnerId } : { team2Id: winnerId }
        await db
          .update(bracketMatches)
          .set({ ...patch, updatedAt: Date.now() })
          .where(eq(bracketMatches.id, m.nextMatchId))
      }

      changed = true
    }
  }

  return { ok: true as const }
}

export async function assignTeamToSlot(matchId: string, slot: 'team1' | 'team2', teamId: string | null) {
  const now = Date.now()
  const patch = slot === 'team1' ? { team1Id: teamId } : { team2Id: teamId }
  await db
    .update(bracketMatches)
    .set({ ...patch, updatedAt: now })
    .where(eq(bracketMatches.id, matchId))
}

export async function recomputeBracket(tournamentId: string) {
  const now = Date.now()

  // Reset computed state so manual edits don't leave stale winners/propagation.
  await db
    .update(bracketMatches)
    .set({ winnerId: null, status: 'pending', updatedAt: now })
    .where(and(eq(bracketMatches.tournamentId, tournamentId), eq(bracketMatches.roundNumber, 1)))

  await db
    .update(bracketMatches)
    .set({ team1Id: null, team2Id: null, winnerId: null, status: 'pending', updatedAt: now })
    .where(and(eq(bracketMatches.tournamentId, tournamentId), ne(bracketMatches.roundNumber, 1)))

  // Auto-advance ONLY round-1 byes.
  let changed = true
  while (changed) {
    changed = false
    const matches = await listBracketMatches(tournamentId)

    for (const m of matches) {
      if (m.roundNumber !== 1) continue
      if (m.status !== 'pending') continue
      if (m.winnerId) continue

      const has1 = !!m.team1Id
      const has2 = !!m.team2Id
      if (has1 === has2) continue

      const winnerId = m.team1Id ?? m.team2Id
      if (!winnerId) continue

      await db
        .update(bracketMatches)
        .set({ winnerId, status: 'completed', updatedAt: Date.now() })
        .where(eq(bracketMatches.id, m.id))

      if (m.nextMatchId) {
        const position = m.positionInRound % 2 === 1 ? 'team1Id' : 'team2Id'
        const patch = position === 'team1Id' ? { team1Id: winnerId } : { team2Id: winnerId }
        await db
          .update(bracketMatches)
          .set({ ...patch, updatedAt: Date.now() })
          .where(eq(bracketMatches.id, m.nextMatchId))
      }

      changed = true
    }
  }
}

export async function clearBracket(tournamentId: string) {
  await db.delete(bracketMatches).where(eq(bracketMatches.tournamentId, tournamentId))
}

export async function getMatchForTournament(matchId: string, tournamentId: string) {
  const rows = await db
    .select()
    .from(bracketMatches)
    .where(and(eq(bracketMatches.id, matchId), eq(bracketMatches.tournamentId, tournamentId)))
  return rows[0] ?? null
}
