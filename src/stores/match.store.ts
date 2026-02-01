import { create } from 'zustand'

export type MatchScore = {
  matchId: string
  team1Sets: number
  team2Sets: number
  team1CurrentPoints: number
  team2CurrentPoints: number
  currentSet: number
  setsToWin: number
  setScores: Array<{ t1: number; t2: number }>
  scoringMode?: Record<string, unknown>
}

type State = {
  matchId: string | null
  score: MatchScore | null
  setMatchId: (id: string | null) => void
  setScore: (s: MatchScore | null) => void
}

export const useMatchStore = create<State>((set) => ({
  matchId: null,
  score: null,
  setMatchId: (matchId) => set({ matchId }),
  setScore: (score) => set({ score }),
}))
