import { create } from 'zustand'

export type EventType = 'ace' | 'ball-out' | 'challenge' | 'net-touch' | 'block' | 'timeout'

export type MatchStats = {
  team1: Record<EventType, number>
  team2: Record<EventType, number>
}

export type PlayerStats = {
  playerId: string
  stats: Record<EventType, number>
  totalEvents: number
}

type State = {
  matchStats: Record<string, MatchStats>           // keyed by matchId
  teamStats: Record<string, MatchStats>            // keyed by `${tournamentId}:${teamId}`
  playerStats: Record<string, PlayerStats[]>       // keyed by tournamentId
  setMatchStats: (matchId: string, stats: MatchStats) => void
  setTeamStats: (tournamentId: string, teamId: string, stats: MatchStats) => void
  setPlayerStats: (tournamentId: string, stats: PlayerStats[]) => void
}

export const useEventStore = create<State>((set) => ({
  matchStats: {},
  teamStats: {},
  playerStats: {},
  setMatchStats: (matchId, stats) =>
    set((s) => ({ matchStats: { ...s.matchStats, [matchId]: stats } })),
  setTeamStats: (tournamentId, teamId, stats) =>
    set((s) => ({
      teamStats: { ...s.teamStats, [`${tournamentId}:${teamId}`]: stats },
    })),
  setPlayerStats: (tournamentId, stats) =>
    set((s) => ({ playerStats: { ...s.playerStats, [tournamentId]: stats } })),
}))
