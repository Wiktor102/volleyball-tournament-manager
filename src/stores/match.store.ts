import { create } from 'zustand'
import type { ScoringSettings } from './tournament.store'

export type SetScore = {
  t1: number
  t2: number
  startedAt?: number | null
  endedAt?: number | null
}

export type MatchScore = {
  matchId: string
  team1Sets: number
  team2Sets: number
  team1CurrentPoints: number
  team2CurrentPoints: number
  currentSet: number
  setsToWin: number
  setScores: SetScore[]
  currentSetStartedAt?: number | null
  scoringMode?: ScoringSettings
  matchTimeSeconds?: number
}

type State = {
  matchId: string | null
  team1Id: string | null
  team2Id: string | null
  score: MatchScore | null
  setMatchId: (id: string | null) => void
  setMatchTeams: (team1Id: string | null, team2Id: string | null) => void
  setScore: (s: MatchScore | null) => void
}

export const useMatchStore = create<State>((set) => ({
  matchId: null,
  team1Id: null,
  team2Id: null,
  score: null,
  setMatchId: (matchId) => set({ matchId }),
  setMatchTeams: (team1Id, team2Id) => set({ team1Id, team2Id }),
  setScore: (score) => set({ score }),
}))
