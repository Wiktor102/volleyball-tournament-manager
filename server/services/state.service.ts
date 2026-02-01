import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { bracketMatches } from '../db/schema'
import { getTournament, type Tournament } from './tournament.service'
import { listTeams, type Team } from './team.service'
import { getMatchScore, type MatchScore } from './match.service'

export type TournamentState = {
  tournament: Tournament
  teams: Team[]
  currentMatch: { id: string; team1Id: string | null; team2Id: string | null } | null
  score: MatchScore | null
}

export async function getTournamentState(tournamentId: string): Promise<TournamentState | null> {
  const tournament = await getTournament(tournamentId)
  if (!tournament) return null

  const teams = await listTeams(tournamentId)

  const matchRows = await db
    .select({ id: bracketMatches.id, team1Id: bracketMatches.team1Id, team2Id: bracketMatches.team2Id })
    .from(bracketMatches)
    .where(and(eq(bracketMatches.tournamentId, tournamentId), eq(bracketMatches.status, 'live')))
    .orderBy(desc(bracketMatches.updatedAt))
    .limit(1)

  const currentMatch = matchRows[0]
    ? { id: matchRows[0].id, team1Id: matchRows[0].team1Id ?? null, team2Id: matchRows[0].team2Id ?? null }
    : null

  const score = currentMatch ? await getMatchScore(currentMatch.id) : null

  return { tournament, teams, currentMatch, score }
}
